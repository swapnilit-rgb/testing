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
    threshold = 0.1,
    maxDiffRatio = 0 // 0 = strict
  } = options;

  const imgA = PNG.sync.read(fs.readFileSync(imagePathA));
  const imgB = PNG.sync.read(fs.readFileSync(imagePathB));

  if (
    imgA.width !== imgB.width ||
    imgA.height !== imgB.height
  ) {
    throw new Error('Screenshot dimensions do not match');
  }

  const diff = new PNG({ width: imgA.width, height: imgA.height });

  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diff.data,
    imgA.width,
    imgA.height,
    { threshold }
  );

  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  const totalPixels = imgA.width * imgA.height;
  const diffRatio = diffPixels / totalPixels;

  return {
    diffPixels,
    diffRatio,
    passed: diffRatio <= maxDiffRatio
  };
}
