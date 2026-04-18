# ASCII Media bundle

Bundles **three** and **@react-three/fiber** only (no `postprocessing` / `@react-three/postprocessing`). The Framer component renders media to a `WebGLRenderTarget`, then draws a fullscreen `ShaderMaterial` for the ASCII pass.

Build:

```bash
npm install
npm run build
```

Copy `dist/bundle.js` into the Framer University `npm-bundles` repo as **`ascii-media-12.js`** (the URL `AsciiMedia.tsx` imports). You can also keep duplicates as `ascii-media.js` / `ascii-media-webgl.js` if useful elsewhere.

Exports include **CanvasTexture** and **NormalBlending** for the glyph-atlas ASCII pass.

The Framer component imports (after `npm run build`, commit `npm-bundles/ascii-media-webgl.js` on `main`):

`https://cdn.jsdelivr.net/gh/EmanueleCodes/framer-code-components@main/npm-bundles/ascii-media-webgl.js`

To use the Framer University CDN instead, copy the built file into that repo’s `npm-bundles/` folder and change the import URL in `AsciiMedia.tsx`.
