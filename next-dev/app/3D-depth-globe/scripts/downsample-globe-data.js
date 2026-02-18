#!/usr/bin/env node
/**
 * Downsamples globe_samples JSON to a smaller file for hosting (e.g. on GitHub).
 * Usage: node downsample-globe-data.js [everyN]
 *   everyN = keep every Nth point
 *   Examples: 4 → ~17MB,  8 → ~8MB,  16 → ~4MB
 *
 * Input:  source/src/data/globe_samples_50m_0.1.json
 * Output: next-dev/public/globe-data-medium.json (and optionally source copy)
 */

const fs = require("fs");
const path = require("path");

const EVERY_N = parseInt(process.argv[2] || "4", 10);
const SOURCE_FILE = path.join(
  __dirname,
  "../source/src/data/globe_samples_50m_0.1.json"
);
const OUT_DIR = path.join(__dirname, "../../public");
const OUT_FILE = path.join(OUT_DIR, "globe-data-medium.json");

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error("Source file not found:", SOURCE_FILE);
    console.error("Run from next-dev/app/3D-depth-globe/scripts/ or adjust paths.");
    process.exit(1);
  }

  console.log("Reading", SOURCE_FILE, "...");
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  const data = JSON.parse(raw);

  if (!data.points || !Array.isArray(data.points)) {
    console.error("Expected { meta, points } in source JSON.");
    process.exit(1);
  }

  const originalCount = data.points.length;
  const downsampled = data.points.filter((_, i) => i % EVERY_N === 0);
  const newCount = downsampled.length;

  const out = {
    meta: data.meta ? { ...data.meta } : {},
    points: downsampled,
  };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out), "utf8");

  const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(
    `Wrote ${OUT_FILE}\n  Points: ${originalCount} → ${newCount} (every ${EVERY_N}th)\n  Size: ~${sizeMB} MB`
  );
}

main();
