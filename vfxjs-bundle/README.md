# VFX-JS Bundle for Framer

This is a bundled version of `@vfx-js/core@0.8.0` for use in Framer Code Components.

## Building

The bundle has already been built. To rebuild:

```bash
npm run build
```

This creates `dist/bundle.js`.

## Hosting on GitHub

To use this bundle in Framer, you need to host it on GitHub:

1. **Create a GitHub repository** for this bundle (or push to an existing one)

2. **Push this entire folder** to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/vfxjs-bundle.git
   git push -u origin main
   ```

3. **Update the import URL** in your Framer component:
   ```javascript
   import { VFX } from "https://raw.githubusercontent.com/your-username/vfxjs-bundle/main/dist/bundle.js"
   ```

## Alternative: Using jsDelivr CDN

You can also use jsDelivr for better performance:

```javascript
import { VFX } from "https://cdn.jsdelivr.net/gh/your-username/vfxjs-bundle@main/dist/bundle.js"
```

## Usage in Framer

Once hosted, import and use VFX in your Framer component:

```javascript
import { VFX } from "https://raw.githubusercontent.com/your-username/vfxjs-bundle/main/dist/bundle.js"

// Create VFX instance
const vfx = new VFX({
  scrollPadding: false,
})

// Apply to element
vfx.add(element, {
  shader: shaderCode,
})
```

## Files

- `src/index.js` - Entry point that imports and exports VFX
- `rollup.config.js` - Rollup bundler configuration
- `dist/bundle.js` - Built bundle (generated, do not edit directly)
- `package.json` - Dependencies and build scripts
