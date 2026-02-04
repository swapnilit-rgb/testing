import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config({ path: '.dev.vars' });

/**
 * Sends a test notification to Slack with markdown formatting
 * @param {Object} params
 * @param {string} params.status - 'passed', 'failed', 'warning', or 'info'
 * @param {string} params.title - Test title
 * @param {string} params.section - Section name
 * @param {Error|string} [params.error] - Error object or message
 * @param {string} [params.screenshotPath] - Path to screenshot
 * @param {string} params.testName - Test file or scenario name
 * @param {number} [params.duration] - Test duration in milliseconds
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function notifySlack({ 
  status, 
  title, 
  section, 
  error, 
  screenshotPath, 
  testName,
  duration 
}) {
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    console.warn('[Slack] Webhook URL not configured in .dev.vars');
    return { success: false, error: 'Webhook not configured' };
  }

  // Build markdown message
  let message = `Playwright Test Result\n\n`;
  message += `Status:${status.toUpperCase()}\n`;
  message += `Title: ${title}\n`;
  message += `Section: ${section}\n`;
  message += `Test Name: \`${testName}\`\n`;
  
  if (duration !== undefined) {
    message += `Duration: ${formatDuration(duration)}\n`;
  }
  
  if (error) {
    const errorText = error.message || String(error);
    message += `\nError:\n\`\`\`\n${errorText}\n\`\`\`\n`;
  }
  
  if (screenshotPath) {
    message += `\nScreenshot: \`${screenshotPath}\`\n`;
  }

  const payload = { result: message };

  // Send with retry logic
  return await sendWithRetry(WEBHOOK_URL, payload);
}

/**
 * Send Playwright JSON report summary to Slack
 * @param {string} [jsonPath='test-results.json'] - Path to test-results.json
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTestReport(jsonPath = 'test-results.json') {
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    console.warn('[Slack] Webhook URL not configured');
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    // Read the JSON report
    const reportData = await fs.readFile(jsonPath, 'utf-8');
    const report = JSON.parse(reportData);

    // Extract summary data
    const stats = report.stats || {};
    const total = (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0);
    const passed = stats.expected || 0;
    const failed = stats.unexpected || 0;
    const skipped = stats.skipped || 0;
    const duration = stats.duration || 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    // Build summary message in clean markdown
    let message = `Playwright Test \n\n`;
    message += `Total Tests: ${total}\n`;
    message += `Passed: ${passed}\n`;
    message += `Failed: ${failed}\n`;
    message += `Skipped: ${skipped}\n`;
    message += `Pass Rate: ${passRate}%\n`;
    message += `Total Duration: ${formatDuration(duration)}\n`;

    // Add failed tests details if any
    if (failed > 0) {
      message += `\nFailed Tests Details:\n\n`;
      
      // Extract failed tests from the report
      const failedTests = [];
      
      if (report.suites) {
        report.suites.forEach(suite => {
          if (suite.specs) {
            suite.specs.forEach(spec => {
              if (spec.tests) {
                spec.tests.forEach(test => {
                  if (test.status === 'unexpected' || test.status === 'failed') {
                    failedTests.push({
                      title: spec.title || test.title,
                      error: test.results?.[0]?.error?.message || 'No error message'
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Show up to 5 failed tests
      const displayTests = failedTests.slice(0, 5);
      displayTests.forEach((test, index) => {
        message += `${index + 1}. **${test.title}**\n`;
        const errorFirstLine = test.error.split('\n')[0];
        message += `   Error: \`${errorFirstLine}\`\n\n`;
      });

      if (failed > 5) {
        message += `... and ${failed - 5} more failed test(s)\n`;
      }
    } else {
      message += `\nAll tests passed!\n`;
    }

    const payload = { result: message };
    
    console.log('[Slack] Sending test report summary...');
    return await sendWithRetry(WEBHOOK_URL, payload);

  } catch (err) {
    console.error('[Slack] Error reading test report:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send request with automatic retry on failure
 * @param {string} url - Webhook URL
 * @param {Object} payload - Message payload
 * @param {number} attempt - Current attempt number
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendWithRetry(url, payload, attempt = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10000 // 10 second timeout
    });

    if (!res.ok) {
      const errorText = await res.text();
      
      // Retry on rate limit (429) or server errors (5xx)
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        console.warn(`[Slack] Request failed (${res.status}), retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return sendWithRetry(url, payload, attempt + 1);
      }
      
      console.error('[Slack] Failed to send notification:', errorText);
      return { success: false, error: `HTTP ${res.status}: ${errorText}` };
    }

    console.log('[Slack] Notification sent successfully');
    return { success: true };

  } catch (err) {
    // Retry on network errors
    if (attempt < MAX_RETRIES) {
      console.warn(`[Slack] Network error, retrying in ${RETRY_DELAY}ms...`, err.message);
      await sleep(RETRY_DELAY);
      return sendWithRetry(url, payload, attempt + 1);
    }
    
    console.error('[Slack] Error sending notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}