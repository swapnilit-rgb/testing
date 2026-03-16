import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('AI Search', async () => {
  const { session, page, browser } = await createSession();

  await test.step('AI Search', () =>
    runStepWithReporting(page, {
      title: 'AI Search',
      section: 'AI Search',
      screenshotPath: 'errors/ai-search.png',
      testName: 'AI Search',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'AI Search' }).click();
      await page.getByRole('textbox', { name: 'Ask anything about our' }).fill('test');
      await page.keyboard.press('Enter');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
