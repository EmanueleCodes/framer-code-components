/**
 * Web Worker: parses binary globe data and computes geometry arrays.
 * Runs off main thread to keep UI responsive during load.
 */

const MAX_ELEVATION = 6000;

function coordinatesToUnitDirection(lat: number, lon: number): [number, number, number] {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((90 - lon) * Math.PI) / 180;
    return [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
    ];
}

function scaleElevation(elevation: number, scalingFactor: number, gamma: number): number {
    const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION));
    return Math.pow(t, gamma) * scalingFactor;
}

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
    const buffer = e.data;
    const view = new Float32Array(buffer);
    const n = view.length / 4;

    const directions = new Float32Array(n * 3);
    const elevations = new Float32Array(n);
    const landMask = new Float32Array(n);

    for (let i = 0; i < n; i++) {
        const lat = view[i * 4];
        const lon = view[i * 4 + 1];
        const elevation = view[i * 4 + 2];
        const land = view[i * 4 + 3];

        const [dx, dy, dz] = coordinatesToUnitDirection(lat, lon);
        directions[i * 3] = dx;
        directions[i * 3 + 1] = dy;
        directions[i * 3 + 2] = dz;
        elevations[i] = land ? scaleElevation(elevation, 1.0, 1) : 0;
        landMask[i] = land;
    }

    self.postMessage(
        { directions, elevations, landMask, count: n },
        [directions.buffer, elevations.buffer, landMask.buffer]
    );
};
