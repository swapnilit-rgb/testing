import fs from 'fs';
import { expect } from '@playwright/test';
import { stabilizeUI } from '../utils/stabilizeUI.js';
import { captureScreenshot } from '../screenshot/captureScreenshot.js';
import { compareScreenshots } from './compareScreenshot.js';

export async function visualCheckpoint(page, name) {
  const baseline = `artifacts/baseline/${name}.png`;
  const current  = `artifacts/current/${name}.png`;
  const diff     = `artifacts/diff/${name}-diff.png`;

  try {
    await stabilizeUI(page);
    await captureScreenshot(page, current);

    if (fs.existsSync(baseline)) {
      let result;
      try {
        result = compareScreenshots(baseline, current, diff, {
          threshold: 0.3,
          maxDiffRatio: 0.01 // Allow 1% pixel difference to tolerate minor animation/rendering variance
        });
      } catch (err) {
        const msg = err.message && err.message.includes('dimensions')
          ? `Screenshot dimensions do not match. Baseline and current image sizes differ for "${name}".`
          : `Screenshot comparison failed for "${name}". ${err.message || err}`;
        throw new Error(msg);
      }
      if (!result.passed) {
        const msg = `Visual regression: baseline and current images differ for "${name}". ${result.diffPixels} pixels differed.`;
        expect.soft(result.passed, msg).toBe(true);
      }
    } else {
      fs.copyFileSync(current, baseline);
    }
  } catch (err) {
    const msg = err?.message || '';
    if (err instanceof Error && (msg.startsWith('Screenshot ') || msg.startsWith('Visual regression:'))) {
      throw err;
    }
    const short = toShortMessage(err);
    throw new Error(`Visual checkpoint "${name}" failed: ${short}`);
  }
}

function toShortMessage(err) {
  const raw = err?.message || String(err);
  if (raw.includes('dimensions') || raw.includes('dimension')) return 'screenshot dimensions do not match.';
  if (raw.includes('ENOENT') || raw.includes('no such file')) return 'missing baseline or current image file.';
  if (raw.includes('timeout') || raw.includes('Timeout')) return 'timeout while capturing or loading page.';
  if (raw.includes('diff') || raw.includes('differ')) return 'images differ (visual regression).';
  if (raw.length > 80) return raw.slice(0, 77) + '...';
  return raw;
}
