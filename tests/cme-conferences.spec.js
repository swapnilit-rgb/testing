import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('CME Conferences section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('CME Conferences section', () =>
    runStepWithReporting(page, {
      title: 'CME Conferences section',
      section: 'CME Conferences',
      screenshotPath: 'errors/cme-conferences.png',
      testName: 'CME Conferences section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'Close popup' }).click();
      await clickHeaderMenuItem(page, 'CME Conferences', 'Attend');
      await visualCheckpoint(page, 'cme-attend');
      await clickHeaderMenuItem(page, 'CME Conferences', 'Exhibit/Sponsor');
      await visualCheckpoint(page, 'cme-exhibit');
      await page.goto('https://binaytara.org/projects/conferences');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
