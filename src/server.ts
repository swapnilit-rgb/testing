import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec);

const app = new Hono()

const TEST_SPECS = [
  'home',
  'about',
  'cme-conferences',
  'funding',
  'projects',
  'get-involved',
  'news',
  'ai-search',
];

function setEnvFromHeaders(c: any) {
  process.env.BROWSERBASE_API_KEY = c.req.header('X-Browserbase-Api-Key');
  process.env.BROWSERBASE_PROJECT_ID = c.req.header('X-Browserbase-Project-Id');

  const slackWebhookUrl: string | undefined = c.req.header('X-Slack-Webhook-Url');
  if (slackWebhookUrl) {
    process.env.SLACK_WEBHOOK_URL = slackWebhookUrl;
  }
}

// Runs test in background AFTER responding — container keeps going
function runPlaywrightInBackground(command: string) {
  try {
    console.log('[Playwright] Running command:');
    execPromise(command)
      .then(({ stdout, stderr }) => {
        console.log('[Playwright] Tests completed');
        if (stdout) console.log('[Playwright] stdout:', stdout);
        if (stderr && !stderr.includes('View replay at https://browserbase.com/sessions/')) {
          console.error('[Playwright] stderr:', stderr);
        }
      })
      .catch((error: any) => {
        console.error('[Playwright] Test run failed:', error.message);
        if (error.stdout) console.log('[Playwright] stdout:', error.stdout);
        if (error.stderr) console.error('[Playwright] stderr:', error.stderr);
      });
    console.log('[Playwright] Command completed');
  }


  catch (error) {
    console.error('[Playwright] Error running command:', error);
  }
}

app.get('/', (c) => c.text('Hello from container!'))

app.get('/health', (c) => c.text('ok'))

// Run all tests in parallel
app.get('/tests/main', (c) => {
  setEnvFromHeaders(c);

  // Respond immediately — well under Cloudflare's 30s limit
  const response = c.text('Tests started. Results will be sent to Slack when complete.');

  // Fire and forget — container keeps running after response
  runPlaywrightInBackground('npx playwright test');

  return response;
})

// Run a specific test suite
app.get('/tests/:name', async (c) => {
  const name = c.req.param('name');

  if (!TEST_SPECS.includes(name)) {
    return c.json({
      message: `Unknown test: "${name}"`,
      available: TEST_SPECS,
    }, 400);
  }

  setEnvFromHeaders(c);

  const response = c.text(`Test "${name}" started. Results will be sent to Slack when complete.`);

  runPlaywrightInBackground(`npx playwright test tests/${name}.spec.js`);

  return response;
})

const port = 8080
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})