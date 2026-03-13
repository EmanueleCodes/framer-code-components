# Scroll 3D Gallery Bundle

Three.js + CSS3DRenderer for the Infinite Zoom Canvas component (Codrops-style scroll-reactive 3D gallery).

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`

## Use in Framer

The Infinite Zoom Canvas component currently imports Three.js from esm.sh so it works without hosting this bundle. To use this bundle instead: build, host `dist/bundle.js` (e.g. on GitHub or a CDN), and replace the imports in `next-dev/app/infinite-zoom-canvas/InfiniteZoomCanvas.tsx` with your bundle URL.

Exports: `THREE`, `CSS3DRenderer`, `CSS3DObject`, `Scene`, `PerspectiveCamera`, `Vector3`, `MathUtils`.
