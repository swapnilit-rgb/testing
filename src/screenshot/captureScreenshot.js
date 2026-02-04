import fs from 'fs';
import path from 'path';

export async function captureScreenshot(page, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  await page.screenshot({
    path: filePath,
    fullPage: true
  });
}
