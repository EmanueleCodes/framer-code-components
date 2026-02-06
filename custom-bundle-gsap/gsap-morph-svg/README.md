# GSAP + MorphSVGPlugin bundle for Framer

Bundles GSAP and MorphSVGPlugin for use in Framer code components (CDN or local import).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **MorphSVGPlugin (Club plugin)**  
   MorphSVGPlugin is a [GreenSock Club](https://greensock.com/club/) plugin and is not on public npm. You must add it yourself:

   - Log in at [greensock.com/club](https://greensock.com/club/)
   - Download **MorphSVGPlugin** (single `.js` file)
   - **Replace** `src/MorphSVGPlugin.js` with that file, keeping the same export so the bundle still works:
     ```js
     // At the end of the official plugin file, ensure you have:
     export { MorphSVGPlugin };
     ```
     If the official file doesn’t use ES modules, wrap it and export:
     ```js
     // Paste the official plugin code here, then:
     export { MorphSVGPlugin };
     ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Use in Framer**
   - Host `dist/bundle.js` (e.g. push to a public GitHub repo).
   - In your Framer code component, import from the raw/CDN URL:
     ```js
     import { gsap, MorphSVGPlugin } from "https://cdn.jsdelivr.net/gh/YOUR_USER/YOUR_REPO/dist/bundle.js";
     ```
   - Or use a relative path if the component runs in an environment that resolves it (e.g. same repo):
     ```js
     import { gsap, MorphSVGPlugin } from "./path/to/gsap-morph-svg/dist/bundle.js";
     ```

## Local use (same repo)

If your Framer app lives in the same repo and can load local files, point the component at the built bundle:

```js
import { gsap, MorphSVGPlugin } from "../../../custom-bundle-gsap/gsap-morph-svg/dist/bundle.js";
```

Run `npm run build` in `gsap-morph-svg` whenever you change the bundle.
