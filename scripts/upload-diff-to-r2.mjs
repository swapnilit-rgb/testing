#!/usr/bin/env node
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Load .dev.vars
try {
  const content = fs.readFileSync(path.join(root, ".dev.vars"), "utf8");
  content.split("\n").forEach((line) => {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
} catch (e) {
  console.warn("Could not load .dev.vars:", e.message);
}

const { uploadDiffImagesToR2 } = await import("../src/utils/r2Upload.mjs");
const result = await uploadDiffImagesToR2();
console.log("Done:", result);
