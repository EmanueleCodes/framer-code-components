# Depth Globe full bundle

Single ES module that includes:

- **three** – core + `EffectComposer`, `RenderPass`, `UnrealBloomPass`
- **@react-three/fiber** – `Canvas`, `useFrame`, `useThree`
- **@react-three/drei** – `OrbitControls`

React and react-dom are **external** (provided by the host, e.g. Framer).

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`

## Use in Framer

Point the Depth Globe component’s script/code dependency to this bundle (e.g. host `dist/bundle.js` and use its URL) so the component can import `Canvas`, `OrbitControls`, `three`, and postprocessing from a single script.
