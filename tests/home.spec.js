import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('Home page', async () => {
  const { session, page, browser } = await createSession();

  await test.step('Home page', () =>
    runStepWithReporting(page, {
      title: 'Home page',
      section: 'Home',
      screenshotPath: 'errors/home-page.png',
      testName: 'Home page',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'Close popup' }).click();
      await visualCheckpoint(page, 'home-page');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
