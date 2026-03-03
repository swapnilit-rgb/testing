export async function runStepWithReporting(page, { title, section, screenshotPath, testName }, fn) {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`${title} failed`, e);
  } finally {
    if (error) throw error;
  }
}
