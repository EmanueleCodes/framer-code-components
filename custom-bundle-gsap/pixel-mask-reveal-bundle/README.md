# Pixel Mask Reveal bundle (Three.js + GSAP + ScrollTrigger)

Bundles **Three.js** (core only) and **GSAP + ScrollTrigger** for the Pixel Mask Reveal Framer code component.

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`.

## Used by

- `next-dev/app/pixel-mask-reveal/PixelMaskReveal.tsx`  
  Imports from the bundle URL (see that file for the current CDN path).

## Hosting for Framer

The component imports from jsDelivr using your GitHub repo. To make it work:

1. Push this folder (and the built `dist/bundle.js`) to your repo.
2. Either:
   - **Commit `dist/bundle.js`** so jsDelivr can serve it (remove `dist/` from `.gitignore` if you want to commit the build), or
   - Build in CI and upload `dist/bundle.js` to a release or another host, then set the component’s import URL to that file.
3. In `PixelMaskReveal.tsx`, the import URL must match your repo (user/org and branch). Update it if needed:
   ```text
   https://cdn.jsdelivr.net/gh/YOUR_USER/YOUR_REPO@main/custom-bundle-gsap/pixel-mask-reveal-bundle/dist/bundle.js
   ```

After pushing, run `npm run build` here whenever you change the bundle dependencies or exports.
