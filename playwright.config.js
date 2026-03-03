import 'dotenv/config';
import { readFileSync } from 'fs';
try {
  const envFile = readFileSync('.dev.vars', 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      const joinedValue = value.join('=').trim();
      const finalValue = joinedValue.startsWith('"') && joinedValue.endsWith('"') ? joinedValue.slice(1, -1) : joinedValue;
      process.env[key.trim()] = finalValue;
    }
  });
  console.log('Finished loading .dev.vars.');
} catch (e) {
  console.error('Error loading .dev.vars:', e);
}

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/utils/clearTestResults.js',

  timeout: 300_000,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  // Each worker creates a Browserbase session (plan supports 25 concurrent)
  workers: process.env.CI ? 4 : 8,

  reporter: [
    ['line'],
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['./src/utils/slackReporter.js'],
  ],

  use: {
    headless: true,
    viewport:{ width: 2560, height: 1440}, 
    deviceScaleFactor: 1,
    screenshot: 'off',
    video: 'off',    // Traces still work (stored by Playwright runner)
    trace: 'on-first-retry',
  },
});
