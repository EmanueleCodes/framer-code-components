#!/usr/bin/env node
/**
 * Converts globe_samples JSON to binary format for faster loading.
 * Output: Float32Array packed as [lat, lon, elevation, land] per point.
 *
 * Usage: node json-to-binary.js [everyN]
 *   everyN = keep every Nth point (1=full, 2=~5M, 5=~2M, 10=~1M)
 *
 * Creates: globe_1m.bin, globe_2m.bin, globe_5m.bin, globe_10m.bin
 */

const fs = require("fs");
const path = require("path");

const SOURCE = path.join(
    __dirname,
    "../source/src/data/globe_samples_10m_0.1.json"
);
const OUT_DIR = path.join(__dirname, "../globe-data");

// ~1.2M points in source. Presets: Low=~300k, Medium=~600k, High=~1.2M
const PRESETS = [
    { name: "low", everyN: 4 },
    { name: "medium", everyN: 2 },
    { name: "high", everyN: 1 },
];

function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error("Source not found:", SOURCE);
        process.exit(1);
    }

    console.log("Reading JSON (this may take a moment)...");
    const raw = fs.readFileSync(SOURCE, "utf8");
    const data = JSON.parse(raw);

    if (!data.points || !Array.isArray(data.points)) {
        console.error("Expected { points: [...] }");
        process.exit(1);
    }

    const points = data.points;
    console.log(`Loaded ${points.length.toLocaleString()} points`);

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    for (const preset of PRESETS) {
        const { name, everyN } = preset;
        const sampled = points.filter((_, i) => i % everyN === 0);
        const n = sampled.length;

        const buffer = new ArrayBuffer(n * 4 * 4); // 4 floats per point
        const view = new Float32Array(buffer);

        for (let i = 0; i < n; i++) {
            const [lat, lon, elevation, land] = sampled[i];
            view[i * 4] = lat;
            view[i * 4 + 1] = lon;
            view[i * 4 + 2] = elevation;
            view[i * 4 + 3] = typeof land === "number" ? land : land ? 1 : 0;
        }

        const outPath = path.join(OUT_DIR, `globe_${name}.bin`);
        fs.writeFileSync(outPath, Buffer.from(buffer));
        const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
        console.log(`  globe_${name}.bin: ${n.toLocaleString()} points, ${sizeMB} MB`);
    }

    console.log(`\nOutput: ${OUT_DIR}`);
}

main();
