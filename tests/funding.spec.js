import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('Funding Opportunities section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('Funding Opportunities section', () =>
    runStepWithReporting(page, {
      title: 'Funding Opportunities section',
      section: 'Funding Opportunities',
      screenshotPath: 'errors/funding-opportunities.png',
      testName: 'Funding Opportunities section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'Close popup' }).click();
      await clickHeaderMenuItem(page, 'Funding Opportunities', 'Apply for an Award');
      await visualCheckpoint(page, 'funding-apply');
      await clickHeaderMenuItem(page, 'Funding Opportunities', 'Sponsor Research Awards');
      await visualCheckpoint(page, 'funding-sponsor');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
