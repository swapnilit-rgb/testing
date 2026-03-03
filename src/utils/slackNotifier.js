const fs = require('fs').promises;

/**
 * Send a consolidated Slack message after all tests finish.
 * Reads test-results.json (current run only), lists every test with its
 * status, duration, error (if any), and links to R2 bucket (for visual regressions).
 * @param {string} jsonPath - Path to test-results.json
 * @param {string|null} [bucketUrl] - R2 bucket dashboard URL
 * @param {string[]} [uploadedNames] - Diff image filenames uploaded (e.g. ["news-blog-diff.png"])
 */
async function sendConsolidatedTestReport(jsonPath, bucketUrl = null, uploadedNames = []) {
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    console.warn('[Slack] Webhook URL not configured');
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const reportData = await fs.readFile(jsonPath, 'utf-8');
    const report = JSON.parse(reportData);

    const testEntries = [];
    for (const suite of report.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const result = test.results && test.results[0];
          if (!result) continue;

          const status = result.status === 'passed' ? 'passed' : 'failed';
          const durationMs = typeof result.duration === 'number' ? result.duration : undefined;
          const errorMsg = (result.error && result.error.message) || null;

          testEntries.push({
            title: spec.title || test.title || 'Untitled test',
            status,
            durationMs,
            errorMsg,
          });
        }
      }
    }

    const testLines = testEntries.map((entry) => {
      const lines = [
        `• ${entry.title}`,
        `  Status: ${getStatusEmoji(entry.status)} ${entry.status.toUpperCase()}`,
      ];

      if (entry.durationMs != null) {
        lines.push(`  Duration: ${formatDuration(entry.durationMs)}`);
      }

      if (entry.status === 'failed' && entry.errorMsg) {
        lines.push(`  Error: ${simplifyErrorMessage(entry.errorMsg)}`);

        const isVisualRegression = /visual regression|pixels? differed/i.test(entry.errorMsg);
        if (isVisualRegression && bucketUrl && uploadedNames.length > 0) {
          const links = uploadedNames.map((f) => {
            const label = f.replace(/\.png$/, '');
            return `<${bucketUrl}|${label}>`;
          }).join(' · ');
          lines.push(`  Path to screenshot: ${links}`);
        }
      }

      return lines.join('\n');
    });

    const total = testEntries.length;
    const passed = testEntries.filter(e => e.status === 'passed').length;
    const failed = testEntries.filter(e => e.status === 'failed').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const totalDurationMs = (report.stats && report.stats.duration) || 0;

    const summaryLines = [
      '',
      '--- Summary ---',
      `Total: ${total}`,
      ...(passed > 0 ? [`Passed: ${getStatusEmoji('passed')} ${passed}`] : []),
      ...(failed > 0 ? [`Failed: ${getStatusEmoji('failed')} ${failed}`] : []),
      `Pass Rate: ${passRate}%`,
      `Total Duration: ${formatDuration(totalDurationMs)}`,
    ];

    if (failed === 0) {
      summaryLines.push('\nAll tests passed!');
    }

    const message = [
      'Playwright Test Report',
      '',
      testLines.length > 0 ? testLines.join('\n\n') : 'No tests found.',
      ...summaryLines,
    ].join('\n');

    // text = standard Slack webhook body; result = some integrations show under "Results:"
    const payload = { text: message, result: message };
    console.log('[Slack] Sending consolidated test report...');
    return await sendWithRetry(WEBHOOK_URL, payload);
  } catch (err) {
    console.error('[Slack] Error sending consolidated report:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendWithRetry(url, payload, attempt = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000 * Math.pow(2, attempt);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text();

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
    if (attempt < MAX_RETRIES) {
      console.warn(`[Slack] Network error, retrying in ${RETRY_DELAY}ms...`, err.message);
      await sleep(RETRY_DELAY);
      return sendWithRetry(url, payload, attempt + 1);
    }

    console.error('[Slack] Error sending notification:', err.message);
    return { success: false, error: err.message };
  }
}

function formatDuration(ms) {
  const n = Number(ms);
  if (Number.isNaN(n) || n < 0) return '—';
  if (n < 60000) {
    return `${(n / 1000).toFixed(1)} s`;
  }
  return `${(n / 60000).toFixed(2)} min`;
}

function simplifyErrorMessage(error) {
  const raw = (error && error.message) ? error.message : String(error);

  const stopMarkers = [/\n\s*\d+\)\s*</, /\nCall log:/i, /\n\n/, /\n\s+at\s/];
  let simplified = raw;
  for (const marker of stopMarkers) {
    const idx = simplified.search(marker);
    if (idx !== -1) simplified = simplified.slice(0, idx);
  }

  simplified = simplified.replace(/<[^>]*>/g, '');
  simplified = simplified.replace(/\s+/g, ' ').trim();

  const lower = simplified.toLowerCase();

  if (lower.includes('timeout') && lower.includes('waiting for')) {
    const match = simplified.match(/waiting for\s+(.+)/i);
    return match ? `Timeout waiting for ${match[1]}` : 'Element wait timeout';
  }
  if (lower.includes('timeout') && lower.includes('navigation')) {
    return 'Page navigation timeout';
  }
  if (lower.includes('timeout')) {
    return 'Timeout: ' + (simplified.length > 80 ? simplified.slice(0, 77) + '...' : simplified);
  }
  if (lower.includes('screenshot dimensions do not match')) {
    return 'Screenshot dimensions mismatch (viewport size changed)';
  }
  if (lower.includes('visual regression') || lower.includes('pixels differed')) {
    const pixelMatch = simplified.match(/(\d+)\s*pixels?\s*differed/i);
    return pixelMatch
      ? `Visual regression detected (${pixelMatch[1]} pixels differ)`
      : 'Visual regression detected';
  }
  if (lower.includes('not visible') || lower.includes('not attached')) {
    return 'Element not visible or not attached to DOM';
  }
  if (lower.includes('no element matches') || lower.includes('0 elements')) {
    return 'Element not found on page';
  }
  if (lower.includes('net::err_')) {
    const netMatch = simplified.match(/(net::\S+)/i);
    return netMatch ? `Network error: ${netMatch[1]}` : 'Network error';
  }
  if (lower.includes('econnrefused') || lower.includes('enotfound')) {
    return 'Connection refused or host not found';
  }

  if (simplified.length > 120) {
    return simplified.slice(0, 117) + '...';
  }
  return simplified || 'Unknown error';
}

function getStatusEmoji(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'passed' || value === 'pass' || value === 'ok' || value === 'success') return '✅';
  if (value === 'failed' || value === 'fail' || value === 'error') return '❌';
  return '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { sendConsolidatedTestReport };
