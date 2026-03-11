import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('Get Involved section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('Get Involved section', () =>
    runStepWithReporting(page, {
      title: 'Get Involved section',
      section: 'Get Involved',
      screenshotPath: 'errors/get-involved.png',
      testName: 'Get Involved section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'Close popup' }).click();
      await clickHeaderMenuItem(page, 'Get Involved', 'Careers');
      await visualCheckpoint(page, 'get-involved-careers');
      await clickHeaderMenuItem(page, 'Get Involved', 'Volunteer');
      await visualCheckpoint(page, 'get-involved-volunteer');
      await clickHeaderMenuItem(page, 'Get Involved', 'Other Ways to Support');
      await visualCheckpoint(page, 'get-involved-support');
      await clickHeaderMenuItem(page, 'Get Involved', 'Internships');
      await visualCheckpoint(page, 'get-involved-intern');
      await clickHeaderMenuItem(page, 'Get Involved', 'Peer to Peer Fundraising');
      await visualCheckpoint(page, 'get-involved-peertopeer');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
