# web-haptics-bundle

Bundled [web-haptics](https://github.com/lochie/web-haptics) for use in Framer Code Components. Provides haptic (vibration) feedback on mobile web (iOS and Android).

## Build

```bash
npm install
npm run build
```

Output: `dist/bundle.js`

## Hosting for Framer

Framer cannot import from npm directly. Host `dist/bundle.js` on a public URL, for example:

1. **GitHub**: Push this folder to a repo and use the raw file URL, e.g.  
   `https://raw.githubusercontent.com/your-username/your-repo/main/dist/bundle.js`
2. **jsDelivr**: If the bundle is in a GitHub repo, you can use  
   `https://cdn.jsdelivr.net/gh/your-username/your-repo@main/dist/bundle.js`

Then set that URL in the Haptics component (or update the default in `next-dev/app/haptics/Haptics.tsx`).

## Usage in Haptics component

The Haptics component imports:

```js
import { WebHaptics } from "<your-bundle-url>";
```

Then creates an instance and calls `trigger(preset)` or `trigger(customPattern)` on tap.
