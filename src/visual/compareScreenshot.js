import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export function compareScreenshots(
  imagePathA,
  imagePathB,
  diffOutputPath,
  options = {}
) {
  const {
    threshold = 0.3,
    maxDiffRatio = 0.005, // Allow 0.5% pixel difference by default
    ignoreTopRightWidth = 400,
    ignoreTopRightHeight = 80
  } = options;

  const imgA = PNG.sync.read(fs.readFileSync(imagePathA));
  const imgB = PNG.sync.read(fs.readFileSync(imagePathB));

  if (
    imgA.width !== imgB.width ||
    imgA.height !== imgB.height
  ) {
    throw new Error('Screenshot dimensions do not match');
  }

  // Blank out the top-right corner in both images to ignore
  // the Browserbase viewport overlay (e.g. "2560 x 1440") and recording indicators
  blankTopRightCorner(imgA, ignoreTopRightWidth, ignoreTopRightHeight);
  blankTopRightCorner(imgB, ignoreTopRightWidth, ignoreTopRightHeight);

  const diff = new PNG({ width: imgA.width, height: imgA.height });

  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diff.data,
    imgA.width,
    imgA.height,
    { threshold }
  );

  const totalPixels = imgA.width * imgA.height;
  const diffRatio = diffPixels / totalPixels;
  const hasChange = diffPixels > 0;

  if (hasChange) {
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));
  } else if (fs.existsSync(diffOutputPath)) {
    fs.unlinkSync(diffOutputPath);
  }

  return {
    diffPixels,
    diffRatio,
    passed: diffRatio <= maxDiffRatio
  };
}

/**
 * Fill a rectangle in the top-right corner of a PNG with white pixels.
 * This neutralizes the Browserbase viewport overlay before comparison.
 */
function blankTopRightCorner(img, width, height) {
  const startX = Math.max(0, img.width - width);
  for (let y = 0; y < height && y < img.height; y++) {
    for (let x = startX; x < img.width; x++) {
      const idx = (img.width * y + x) << 2;
      img.data[idx]     = 255; // R
      img.data[idx + 1] = 255; // G
      img.data[idx + 2] = 255; // B
      img.data[idx + 3] = 255; // A
    }
  }
}
