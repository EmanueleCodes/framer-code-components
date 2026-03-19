# COBE bundle for Framer

Bundles [cobe](https://cobe.vercel.app/) (WebGL globe) as ESM for Framer Code Components.

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`

## Publish

Copy `dist/bundle.js` to the Framer University `npm-bundles` repo as `cobe.js` (or merge this repo’s `npm-bundles/cobe.js`), then the component import URL works on jsDelivr.
