#!/usr/bin/env node
/**
 * Uploads globe .bin files to R2 bucket.
 * Run from depth-globe-data/: node upload.mjs
 * Requires: wrangler, GLOBE_BUCKET binding, bucket created.
 */

import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLOBE_DIR = join(__dirname, "../globe-data");

const files = readdirSync(GLOBE_DIR)
    .filter((f) => f.endsWith(".bin"))
    .map((f) => ({ name: f, path: join(GLOBE_DIR, f) }));

if (files.length === 0) {
    console.error("No .bin files in", GLOBE_DIR);
    process.exit(1);
}

console.log("Uploading to R2 bucket depth-globe-data...");
for (const { name, path } of files) {
    const size = (statSync(path).size / 1024 / 1024).toFixed(2);
    console.log(`  ${name} (${size} MB)`);
    execSync(`npx wrangler r2 object put "depth-globe-data/${name}" --file="${path}"`, {
        stdio: "inherit",
        cwd: __dirname,
    });
}
console.log("Done.");
