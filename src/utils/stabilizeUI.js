export async function stabilizeUI(page) {
  // disable animations / transitions / scroll
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `
  });

  // wait for fonts to laod
  await page.evaluate(() => document.fonts.ready);

  // settle JS driven animations
  await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    const maxFrames = 3;
    function nextFrame() {
      requestAnimationFrame(() => {
        frames++;
        if (frames >= maxFrames) resolve();
        else nextFrame();
      });
    }
    nextFrame();
  }));

}