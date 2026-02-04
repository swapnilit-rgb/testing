# browserbase-playwright

End-to-end visual regression testing for [Binaytara Foundation](https://binaytara.org) using **Playwright** and **Browserbase** (cloud browsers), deployed on **Cloudflare Containers** with **Durable Objects**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Visual Regression](#visual-regression)
- [Slack Notifications](#slack-notifications)
- [Deployment (Cloudflare)](#deployment-cloudflare)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project:

- Runs Playwright tests against **Browserbase** (no local browsers).
- Performs **visual checkpoints**: compares current screenshots to baselines and fails if the diff exceeds a threshold.
- Can be triggered via **Cloudflare**: a request to `/tests/main` is routed to a container that runs the test suite and returns output.
- Optionally sends **Slack** notifications for each test section (pass/fail).

The site under test is **https://binaytara.org**. Tests cover:

- Home page
- About Us (Mission, Team, Financials, Awards)
- CME Conferences (Attend, Exhibit/Sponsor)
- Funding Opportunities
- Projects (multiple sub-pages)
- Get Involved (Careers, Volunteer, Support, etc.)
- News (Blog, In The News, The Cancer News)
- AI Search

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Workers + Durable Objects                            │
│  (src/index.ts)                                                  │
│  GET /tests/main → getRandom(MY_CONTAINER) → Container.fetch()   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Container (Dockerfile)                               │
│  - Node 20, Playwright + Chromium                                 │
│  - Hono server on port 8080 (src/server.ts)                      │
│  - GET /tests/main: sets env from headers, runs Playwright       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Playwright (tests/main.spec.js)                                 │
│  - Fixture: createSession() → Browserbase SDK → CDP to session   │
│  - One test: full site navigation + visual checkpoints           │
│  - afterEach: Slack notifications for each section               │
└─────────────────────────────────────────────────────────────────┘
```

- **No local browsers**: Browsers run in Browserbase; Playwright connects via CDP.
- **Single worker**: `workers: 1` in Playwright config to avoid session waste.
- **Artifacts**: Screenshots live in `artifacts/baseline/`, `artifacts/current/`, `artifacts/diff/`; failures can be stored in `errors/`.

---

## Project Structure

```
browserbase-playwright/
├── src/
│   ├── index.ts              # Cloudflare Worker + DO: routes, forwards /tests/main to container
│   ├── server.ts             # Hono server inside container: runs Playwright on GET /tests/main
│   ├── navigation/
│   │   └── headerMenu.js      # openHeaderMenu(), clickHeaderMenuItem() for nav
│   ├── screenshot/
│   │   └── captureScreenshot.js   # Full-page screenshot to path
│   ├── visual/
│   │   ├── visualCheckpoint.js    # stabilize → capture → compare or create baseline
│   │   └── compareScreenshot.js   # pixelmatch diff, optional threshold/maxDiffRatio
│   └── utils/
│       ├── slackNotifier.js       # POST to Slack webhook with test result
│       └── stabilizeUI.js        # reduce motion, disable animations, fonts ready
├── tests/
│   └── main.spec.js          # Single E2E test: navigation + visual checkpoints + Slack
├── fixtures/
│   └── browserbase.fixture.js    # createSession(): Browserbase SDK → chromium.connectOverCDP
├── artifacts/
│   ├── baseline/             # Approved reference screenshots
│   ├── current/              # Latest run screenshots
│   └── diff/                 # Diff images when comparison fails
├── errors/                   # Failure screenshots (e.g. home-page.png)
├── playwright.config.js     # Test dir, timeout, workers, viewport, no local browsers
├── wrangler.toml            # Cloudflare: containers, DO binding, migrations
├── Dockerfile               # Node 20, Playwright Chromium, Hono server
├── package.json
└── .dev.vars                # Local/CI secrets (not committed)
```

---

## Setup

### Prerequisites

- Node.js 20+
- npm
- [Browserbase](https://browserbase.com) account (API key + Project ID)
- (Optional) Slack incoming webhook for notifications

### Install

```bash
npm install
```

### Environment (`.dev.vars`)

Create `.dev.vars` in the project root (this file is gitignored). Example:

```ini
BROWSERBASE_API_KEY="your-api-key"
BROWSERBASE_PROJECT_ID="your-project-id"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

- **BROWSERBASE_API_KEY** – Required for tests; used by the fixture and by the Cloudflare Worker when forwarding to the container.
- **BROWSERBASE_PROJECT_ID** – Required for creating Browserbase sessions.
- **SLACK_WEBHOOK_URL** – Optional; if set, `notifySlack()` is called after each test section.

Playwright config loads `.dev.vars` manually so these vars are available when running tests locally.

---

## Configuration

### Playwright (`playwright.config.js`)

- **testDir**: `./tests`
- **timeout**: 300_000 ms
- **workers**: 1 (single worker to avoid session waste)
- **retries**: 1 in CI, 0 locally
- **use**: headless, viewport 1280×720, deviceScaleFactor 1, screenshot/video off, trace on first retry
- Browsers are **not** defined in config; the fixture connects to Browserbase via CDP.

### Visual comparison (`src/visual/visualCheckpoint.js` + `compareScreenshot.js`)

- **Baseline path**: `artifacts/baseline/<name>.png`
- **Current path**: `artifacts/current/<name>.png`
- **Diff path**: `artifacts/diff/<name>-diff.png`
- If no baseline exists, the current screenshot is copied to baseline (first-time accept).
- If baseline exists: pixelmatch with `threshold: 0.1`, `maxDiffRatio: 0.001` (0.1% pixel difference allowed). Test fails if diff ratio &gt; 0.001.

### Cloudflare (`wrangler.toml`)

- **Containers**: image built from `./Dockerfile`, class `MyContainer`, max 5 instances.
- **Durable Object**: `MyContainer` bound as `MY_CONTAINER`; Worker uses `getRandom(env.MY_CONTAINER, 10)` to forward `/tests/main` to a container.

---

## Running Tests

### Local (against Browserbase)

Ensure `.dev.vars` is present with `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`, then:

```bash
npx playwright test
```

Or run the main spec only:

```bash
npx playwright test tests/main.spec.js
```

Tests use the Browserbase fixture, so no local Chromium is required.

### Via Cloudflare (container)

1. Deploy with Wrangler (see [Deployment](#deployment-cloudflare)).
2. Call your Worker URL with path `/tests/main`. The Worker injects `X-Browserbase-Api-Key` and `X-Browserbase-Project-Id` from `env` and forwards the request to a container.
3. The container’s Hono server sets `process.env` from those headers and runs Playwright (see note below).
4. Response body is the test stdout/stderr.

The container runs `npx playwright test tests/main.spec.js`. To run a different spec, change this in `src/server.ts`.

### Local container (optional)

To run the same server locally (e.g. to simulate the container endpoint):

```bash
npx tsx src/server.ts
```

Then: `curl http://localhost:8080/tests/main` (with no auth; for real runs the Worker would set headers). For local runs you still need `.dev.vars` so the server can set `BROWSERBASE_*` before spawning Playwright.

---

## Visual Regression

1. **First run** (or new checkpoint): No baseline file → current screenshot is saved to `artifacts/baseline/<name>.png`. Test passes.
2. **Later runs**: Current screenshot is saved to `artifacts/current/<name>.png` and compared to baseline. If diff ratio ≤ 0.001, test passes; otherwise it fails and a diff image is written to `artifacts/diff/<name>-diff.png`.
3. **Stabilization**: Before each capture, `stabilizeUI()` runs: reduced motion, animations/transitions disabled, fonts ready, a few animation frames waited. This reduces flakiness from animations and loading.

To accept new UI intentionally: replace the baseline with the desired image (or delete it and re-run to copy current to baseline).

---

## Slack Notifications

- Implemented in `src/utils/slackNotifier.js`.
- `notifySlack({ status, title, section, error, screenshotPath, testName })` sends a JSON payload `{ result: "<markdown message>" }` to `SLACK_WEBHOOK_URL`.
- In `main.spec.js`, each major step pushes a result into `slackResults`; `afterEach` calls `notifySlack()` for each entry. So you get one Slack message per section (e.g. “Home page”, “About Us section”) with pass/fail and optional error/screenshot path.
- If `SLACK_WEBHOOK_URL` is not set, a warning is logged and no request is sent.

---

## Deployment (Cloudflare)

1. Install Wrangler and log in:

   ```bash
   npm i -g wrangler
   wrangler login
   ```

2. Set Cloudflare secrets for the Worker (so the Worker can inject them into the container request):

   ```bash
   wrangler secret put BROWSERBASE_API_KEY
   wrangler secret put BROWSERBASE_PROJECT_ID
   ```

3. Build and deploy:

   ```bash
   wrangler deploy
   ```

The Worker will serve `/` and `/container` with a simple text response, and `/tests/main` by forwarding to a random container instance with Browserbase headers set. The container image is built from the project’s Dockerfile (Node 20, Playwright Chromium, Hono server).

---

## API Reference

### Fixture

- **`createSession()`** (from `fixtures/browserbase.fixture.js`): Creates a Browserbase session, connects Playwright’s `chromium` over CDP, returns `{ session, page }`. Uses `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`.

### Navigation

- **`openHeaderMenu(page, menuLabel)`**: Hover the top-level menu link.
- **`clickHeaderMenuItem(page, menuLabel, itemLabel)`**: Open menu by label, then click the submenu item by label.

### Visual

- **`visualCheckpoint(page, name)`**: Stabilize UI, capture current screenshot to `artifacts/current/<name>.png`, then either compare to `artifacts/baseline/<name>.png` (fail if diff &gt; 0.1%) or create baseline. Async.
- **`compareScreenshots(baselinePath, currentPath, diffPath, options)`**: Sync. Options: `threshold`, `maxDiffRatio`. Returns `{ diffPixels, diffRatio, passed }`. Throws if dimensions differ.

### Screenshot

- **`captureScreenshot(page, filePath)`**: Creates parent dirs if needed, takes full-page screenshot to `filePath`.

### Utils

- **`stabilizeUI(page)`**: Reduced motion, disable animations/transitions, wait for fonts and a few animation frames.
- **`notifySlack({ status, title, section, error, screenshotPath, testName })`**: POST to Slack webhook; no-op if `SLACK_WEBHOOK_URL` is unset.

---

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| “Error loading .dev.vars” | Create `.dev.vars` with `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`. |
| Tests fail with “session” or “connect” errors | Check Browserbase dashboard and API key/project ID; ensure no IP/usage restrictions. |
| Visual diff fails on minor changes | Adjust `maxDiffRatio` or `threshold` in `visualCheckpoint.js` / `compareScreenshot.js`, or refresh baseline after intentional UI change. |
| Slack not receiving messages | Ensure `SLACK_WEBHOOK_URL` is in `.dev.vars` and the webhook accepts POST with JSON body. |
| Container runs wrong spec | In `src/server.ts`, update the path in the `execPromise('npx playwright test ...')` call. |
| “Screenshot dimensions do not match” | Baseline and current viewport must match (config uses 1280×720); avoid changing viewport mid-test. |

---

## License

ISC (see `package.json`).
