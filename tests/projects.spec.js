
import 'dotenv/config';
import { test } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { runStepWithReporting } from './helpers/testHelpers.js';

test('Projects section', async () => {
  const { session, page, browser } = await createSession();

  await test.step('Projects section', () =>
    runStepWithReporting(page, {
      title: 'Projects section',
      section: 'Projects',
      screenshotPath: 'errors/projects.png',
      testName: 'Projects section',
    }, async () => {
      await page.goto('https://binaytara.org/');
      await page.getByRole('button', { name: 'Close popup' }).click();
      await clickHeaderMenuItem(page, 'Projects', 'Global Oncology Programs');
      await visualCheckpoint(page, 'projects-global');
      await clickHeaderMenuItem(page, 'Projects', 'Global Oncology Mission in Nepal');
      await visualCheckpoint(page, 'projects-nepal');
      await clickHeaderMenuItem(page, 'Projects', 'Global Oncology Mission in Nigeria');
      await visualCheckpoint(page, 'projects-nigeria');
      await clickHeaderMenuItem(page, 'Projects', 'Center For Women\'s Cancer');
      await visualCheckpoint(page, 'projects-womens-cancer');
      await clickHeaderMenuItem(page, 'Projects', 'Advocacy and Policy Debates');
      await visualCheckpoint(page, 'projects-advocacy');
      await clickHeaderMenuItem(page, 'Projects', 'International Journal of Cance');
      await visualCheckpoint(page, 'projects-journal');
      await clickHeaderMenuItem(page, 'Projects', 'CME Conferences');
      await visualCheckpoint(page, 'projects-cme');
      await clickHeaderMenuItem(page, 'Projects', 'OncoBlast - Free CME/MOC ');
      await visualCheckpoint(page, 'projects-oncoblast');
      await clickHeaderMenuItem(page, 'Projects', 'The Cancer News');
      await visualCheckpoint(page, 'projects-thecancernews');
      await clickHeaderMenuItem(page, 'Projects', 'Internship Program');
      await visualCheckpoint(page, 'projects-internship');
    })
  );

  await page.close();
  await browser.close();
  console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
});
