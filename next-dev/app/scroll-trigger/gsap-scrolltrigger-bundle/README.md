# GSAP ScrollTrigger Bundle

This bundle provides GSAP, ScrollTrigger, and useGSAP for use in Framer code components.

## What's Included

- **GSAP Core** - The main GSAP animation library
- **ScrollTrigger** - GSAP's scroll-based animation plugin
- **useGSAP** - React hook for GSAP animations

## Building the Bundle

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the bundle:**
   ```bash
   npm run build
   ```

3. **The bundle will be created at:** `dist/bundle.js`

## Using in Framer

After building and hosting the bundle on GitHub, import it in your Framer component:

```javascript
import { gsap, ScrollTrigger, useGSAP } from "https://raw.githubusercontent.com/your-username/your-repo/main/gsap-scrolltrigger-bundle/dist/bundle.js";
```

## Bundle Contents

The bundle exports:
- `gsap` - Main GSAP object
- `ScrollTrigger` - ScrollTrigger plugin (already registered)
- `useGSAP` - React hook for GSAP

## Dependencies

- GSAP 3.12.0+
- @gsap/react 2.0.0+
- React 18.2.0+ (peer dependency)
- React DOM 18.2.0+ (peer dependency)

## Build Configuration

- **Format**: ES modules
- **Target**: Browser-compatible
- **Minified**: Yes (with terser)
- **External**: React and Framer dependencies excluded
