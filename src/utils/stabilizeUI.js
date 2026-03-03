export async function stabilizeUI(page) {
  // Disable CSS animations / transitions / scroll
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `
  });

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);

  // Brief pause for any in-flight rendering to settle
  await page.waitForTimeout(300);
}
