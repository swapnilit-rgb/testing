import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('News section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('News section', () =>
    runStepWithReporting(page, {
      title: 'News section',
      section: 'News',
      screenshotPath: 'errors/news.png',
      testName: 'News section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await clickHeaderMenuItem(page, 'News', 'Blog');
      await visualCheckpoint(page, 'news-blog');
      await clickHeaderMenuItem(page, 'News', 'Binaytara In The News');
      await visualCheckpoint(page, 'news-binaytara');
      await clickHeaderMenuItem(page, 'News', 'The Cancer News');
      await visualCheckpoint(page, 'news-thecancernews');
      await page.goto('https://binaytara.org/projects/conferences');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
