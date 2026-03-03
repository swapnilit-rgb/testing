import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('About Us section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('About Us section', () =>
    runStepWithReporting(page, {
      title: 'About us section',
      section: 'About Us',
      screenshotPath: 'errors/about-us.png',
      testName: 'About Us section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await clickHeaderMenuItem(page, 'About Us', 'Mission and Values');
      await visualCheckpoint(page, 'about-mission');
      await clickHeaderMenuItem(page, 'About Us', 'Meet Our Team');
      await visualCheckpoint(page, 'about-team');
      await clickHeaderMenuItem(page, 'About Us', 'Financials and Transparency');
      await visualCheckpoint(page, 'about-financials');
      await clickHeaderMenuItem(page, 'About Us', 'Awards');
      await visualCheckpoint(page, 'about-awards');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
