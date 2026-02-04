import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

// Use local browser when USE_LOCAL_BROWSER=1 (e.g. demo runs, no Browserbase loaded)
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === "1" || process.env.USE_LOCAL_BROWSER === "true";

const createSession = async () => {
  try {
    if (useLocalBrowser) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      return {
        session: { id: "local" },
        page,
        browser,
      };
    }

    const { default: Browserbase } = await import("@browserbasehq/sdk");
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY
    });
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID
    });

    //Connect to the session
    const browser = await chromium.connectOverCDP(session.connectUrl);

    // Getting the default context to ensure the sessions are recorded.
    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];

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