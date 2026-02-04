import fs from 'fs';
import { expect } from '@playwright/test';
import { stabilizeUI } from '../utils/stabilizeUI.js';
import { captureScreenshot } from '../screenshot/captureScreenshot.js';
import { compareScreenshots } from './compareScreenshot.js';

export async function visualCheckpoint(page, name) {
  const baseline = `artifacts/baseline/${name}.png`;
  const current  = `artifacts/current/${name}.png`;
  const diff     = `artifacts/diff/${name}-diff.png`;

  await stabilizeUI(page);
  await captureScreenshot(page, current);

  if (fs.existsSync(baseline)) {
    const result = compareScreenshots(baseline, current, diff, { 
      threshold: 0.1,
      maxDiffRatio: 0.001 // Allow 0.1% of pixels to differ (tolerance for minor animation/sub-pixel differences)
    });
    expect(result.passed).toBe(true);
  } else {
    fs.copyFileSync(current, baseline);
  }
}
