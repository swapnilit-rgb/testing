/**
 * Playwright reporter that sends a consolidated test report to Slack.
 * Runs in the main process (after the JSON reporter writes test-results.json),
 * so process.env from the config (including .dev.vars) is available.
 * Must be CommonJS so Playwright's require() can load it.
 */
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function getDiffFileNamesFromFailures(jsonPath) {
  try {
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const names = new Set();
    for (const suite of report.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const result = test.results && test.results[0];
          if (!result || result.status !== 'failed') continue;
          const msg = (result.error && result.error.message) || '';
          if (!/visual regression|pixels? differed/i.test(msg)) continue;
          const matches = msg.matchAll(/differ for "([^"]+)"/g);
          for (const m of matches) names.add(`${m[1]}-diff.png`);
        }
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

function slackReporter() {
  return {
    async onEnd() {
      const jsonPath = path.resolve(PROJECT_ROOT, 'test-results.json');
      let bucketUrl = null;

      if (fs.existsSync(jsonPath)) {
        const diffFileNames = getDiffFileNamesFromFailures(jsonPath);
        let uploadedNames = [];
        if (diffFileNames.length > 0) {
          try {
            const { uploadDiffImagesToR2 } = await import('./r2Upload.mjs');
            const { uploaded } = await uploadDiffImagesToR2(diffFileNames);
            uploadedNames = uploaded;
            const accountId = process.env.R2_ACCOUNT_ID;
            if (uploaded.length > 0 && accountId) {
              bucketUrl = `https://dash.cloudflare.com/${accountId}/r2/default/buckets/diff-images`;
            }
          } catch (err) {
            console.error('[R2] Failed to upload diff images:', err.message);
          }
        }

        try {
          const { sendConsolidatedTestReport } = require('./slackNotifier.js');
          await sendConsolidatedTestReport(jsonPath, bucketUrl, uploadedNames);
        } catch (err) {
          console.error('[Slack Reporter]', err.message);
        }
      }
    },
  };
}

module.exports = slackReporter;
