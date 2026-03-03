import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const createSession = async () => {
  try {
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY
    });
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      keepAlive: true,
      // timeout: 3600,
    });

    //Connect to the session
    const browser = await chromium.connectOverCDP(session.connectUrl);

    // Getting the default context to ensure the sessions are recorded.
    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];

    await page.setViewportSize({ width: 2560, height: 1440 });

    return {
      session,
      page,
      browser,
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }

};

export default createSession;