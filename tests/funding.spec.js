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
      await page.getByRole('link', { name: 'Funding Opportunities' }).click();
      await visualCheckpoint(page, 'funding-opportunities');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
