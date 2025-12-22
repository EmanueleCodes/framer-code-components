# Build Instructions for GSAP Bundle

## Quick Start

1. **Navigate to the bundle folder:**
   ```bash
   cd next-dev/app/scroll-trigger/gsap-scrolltrigger-bundle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the bundle:**
   ```bash
   npm run build
   ```

4. **Verify the bundle was created:**
   ```bash
   ls dist/
   # Should show: bundle.js
   ```

## What Happens

- The build process creates `dist/bundle.js`
- This file contains GSAP, ScrollTrigger, and useGSAP
- It's minified and optimized for browser use
- ScrollTrigger plugin is automatically registered

## After Building

Once the bundle is built, the import in `component.tsx` will work:

```javascript
import { gsap, ScrollTrigger, useGSAP } from "./gsap-scrolltrigger-bundle/dist/bundle.js";
```

## For Production

After building, you should:
1. Push the bundle to GitHub
2. Update the import URL to use the GitHub raw URL
3. Test the component in Framer

## Troubleshooting

- **Build fails**: Check that all dependencies are installed
- **Import errors**: Ensure the bundle file exists at the expected path
- **Runtime errors**: Verify the bundle was built successfully
