const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Playwright globalSetup: clear previous test result files so Slack and reports
 * only contain data from the current run.
 */
module.exports = async function globalSetup() {
  const filesToClear = [
    path.resolve(PROJECT_ROOT, 'test-results.json'),
  ];

  for (const file of filesToClear) {
    try {
      fs.unlinkSync(file);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`[globalSetup] Could not remove ${file}:`, err.message);
      }
    }
  }
};
