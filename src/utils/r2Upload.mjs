import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIFF_DIR = path.resolve(__dirname, "../../artifacts/diff");
const BUCKET_NAME = "diff-images";

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload a single image to R2.
 * @param {string} filePath - Absolute or relative path to the image
 * @returns {Promise<boolean>} - true if successful
 */
async function uploadImage(filePath) {
  const s3 = getS3Client();
  if (!s3) {
    console.warn("[R2] Skipping upload: R2 credentials not configured.");
    return false;
  }

  const fileName = path.basename(filePath);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `test-results/${fileName}`,
        Body: fileBuffer,
        ContentType: "image/png",
      })
    );
    console.log(`[R2] Uploaded ${fileName}`);
    return true;
  } catch (err) {
    console.error(`[R2] Upload failed for ${fileName}:`, err.message);
    return false;
  }
}

/**
 * Upload diff images to R2.
 * @param {string[]} [fileNames] - If provided, only upload these filenames (e.g. ["news-blog-diff.png"]).
 *   If omitted, uploads all PNGs in artifacts/diff (for manual runs).
 * @returns {Promise<{ uploaded: string[]; failed: string[] }>}
 */
export async function uploadDiffImagesToR2(fileNames = null) {
  const s3 = getS3Client();
  if (!s3) {
    console.warn("[R2] Skipping diff upload: R2 credentials not configured.");
    return { uploaded: [], failed: [] };
  }

  if (!fs.existsSync(DIFF_DIR)) {
    return { uploaded: [], failed: [] };
  }

  const files = fileNames
    ? fileNames.filter((f) => f.endsWith(".png") && fs.existsSync(path.join(DIFF_DIR, f)))
    : fs.readdirSync(DIFF_DIR).filter((f) => f.endsWith(".png"));

  const uploaded = [];
  const failed = [];

  for (const file of files) {
    const filePath = path.join(DIFF_DIR, file);
    const ok = await uploadImage(filePath);
    if (ok) uploaded.push(file);
    else failed.push(file);
  }

  if (uploaded.length > 0) {
    console.log(`[R2] ${uploaded.length} diff image(s) uploaded to bucket "${BUCKET_NAME}".`);
  }

  return { uploaded, failed };
}
