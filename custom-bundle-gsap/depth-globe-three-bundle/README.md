# Depth Globe – Three.js bundle

Single bundle of Three.js + EffectComposer + RenderPass + UnrealBloomPass so the Depth Globe component uses **one** Three.js instance. That fixes the "multiple instances" error in Framer and restores **real bloom (glow)**.

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`. Commit it and push so the raw GitHub URL works.

## Use in Framer

DepthGlobe imports from:

`https://raw.githubusercontent.com/EmanueleCodes/framer-code-components/main/custom-bundle-gsap/depth-globe-three-bundle/dist/bundle.js`

If your repo is under a different user/org, change that URL in `next-dev/app/3D-depth-globe/DepthGlobe.tsx` (top of file) to your repo’s raw URL for `dist/bundle.js`.
