import 'dotenv/config';
import { test , expect } from '@playwright/test';
import createSession from '../fixtures/browserbase.fixture.js';
import { visualCheckpoint } from '../src/visual/visualCheckpoint.js';
import { clickHeaderMenuItem } from '../src/navigation/headerMenu.js';
import { notifySlack, sendTestReport } from '../src/utils/slackNotifier.js';

let slackResults = [];

test.beforeEach(async ({}, testInfo) => {
  slackResults = []; // reset before each test
});

test.afterEach(async ({}, testInfo) => {
  // Send all notifications after test finishes
  for (const result of slackResults) {
    try {
      console.log('Sending Slack notification', result);
      await notifySlack(result);
      console.log('Slack notification sent successfully');
    } catch (slackErr) {
      console.error('Slack notification failed', slackErr);
    }
  }
});

test.afterAll(async () => {
  console.log('📊 Sending test report summary to Slack...');
  try {
    const result = await sendTestReport('test-results.json');
    
    if (result.success) {
      console.log('✓ Test report summary sent to Slack successfully');
    } else {
      console.warn('✗ Failed to send test report:', result.error);
    }
  } catch (err) {
    console.error('Error sending test report:', err);
  }
});

  test('Navigation and Links', async () => {
    const { session, page, browser } = await createSession();

   // home page
   await test.step('Home page', async () => {
    let error;
    let screenshotPath;
    try {
      await page.goto('https://binaytara.org/');
      await visualCheckpoint(page, 'home-page');
    } catch (e) {
      error = e;
      screenshotPath = 'errors/home-page.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error('Home page failed', e);
    } finally {
      slackResults.push({
        status: error ? 'failed' : 'passed',
        title: 'Home page',
        section: 'Home',
        error,
        screenshotPath,
        testName: 'Navigation and Links'
      });
      if (error) throw error;
    }
  });
    // about us
    await test.step('About Us section', async () => {
      try {
        await clickHeaderMenuItem(page, 'About Us', 'Mission and Values');
        await visualCheckpoint(page, 'about-mission');
    
        await clickHeaderMenuItem(page, 'About Us', 'Meet Our Team');
        await visualCheckpoint(page, 'about-team');
    
        await clickHeaderMenuItem(page, 'About Us', 'Financials and Transparency');
        await visualCheckpoint(page, 'about-financials');
    
        await clickHeaderMenuItem(page, 'About Us', 'Awards');
        await visualCheckpoint(page, 'about-awards');
      }  catch(e){
        console.error('About Us section failed', e);
      }
    });
    // cme conferences
    await test.step('CME Conferences section', async () => {
      try {
        await clickHeaderMenuItem(page, 'CME Conferences', 'Attend');
        await visualCheckpoint(page, 'cme-attend');

        await clickHeaderMenuItem(page, 'CME Conferences', 'Exhibit/Sponsor');
        await visualCheckpoint(page, 'cme-exhibit');

        await page.goto('https://binaytara.org/projects/conferences');
      } catch (e) {
        console.error('CME section failed', e);
      }
    });
    // funding opportunities
    await test.step('Funding Opportunities section', async () => {
      try {
        await clickHeaderMenuItem(page, 'Funding Opportunities', 'Apply for an Award');
        await visualCheckpoint(page, 'funding-apply');

        await clickHeaderMenuItem(page, 'Funding Opportunities', 'Sponsor Research Awards');
        await visualCheckpoint(page, 'funding-sponsor');
      } catch (e) {
        console.error('Funding section failed', e);
      }
    });
    // projects
    await test.step('Projects section', async () => {
      try {
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
      } catch (e) {
        console.error('Projects section failed', e);
      }
    });
    // get involved
    await test.step('Get Involved section', async () => {
      try {
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
      } catch (e) {
        console.error('Get Involved section failed', e);
      }
    });
    // news
    await test.step('News section', async () => {
      try {
        await clickHeaderMenuItem(page, 'News', 'Blog');
        await visualCheckpoint(page, 'news-blog');

        await clickHeaderMenuItem(page, 'News', 'Binaytara In The News');
        await visualCheckpoint(page, 'news-binaytara');

        await clickHeaderMenuItem(page, 'News', 'The Cancer News');
        await visualCheckpoint(page, 'news-thecancernews');

        await page.goto('https://binaytara.org/projects/conferences');
      } catch (e) {
        console.error('News section failed', e);
      }
    });
    // ai search
    await test.step('AI Search', async () => {
      try {
        await page.getByRole('button', { name: 'AI Search' }).click();
        await page.getByRole('textbox', { name: 'Ask anything about our' }).fill('test');
        await page.keyboard.press('Enter');
      } catch (e) {
        console.error('AI Search failed', e);
      }
    });

    await page.close();
    await browser.close();
    console.log(`Session completed! View replay at https://browserbase.com/sessions/${session.id}`);
  });