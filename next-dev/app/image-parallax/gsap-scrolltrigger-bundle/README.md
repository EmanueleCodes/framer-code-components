# GSAP ScrollTrigger Bundle for ImageParallax

This bundle provides GSAP and ScrollTrigger for the ImageParallax component.

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

## Hosting on GitHub

1. Push this bundle folder to a public GitHub repository
2. Get the raw URL: `https://raw.githubusercontent.com/your-username/your-repo/main/next-dev/app/image-parallax/gsap-scrolltrigger-bundle/dist/bundle.js`
3. Update the import in `ImageParallax.tsx` to use this URL

## Using in Framer Component

After hosting on GitHub, import in `ImageParallax.tsx`:

```javascript
import { gsap, ScrollTrigger } from "https://raw.githubusercontent.com/your-username/your-repo/main/next-dev/app/image-parallax/gsap-scrolltrigger-bundle/dist/bundle.js";
```

## Bundle Contents

The bundle exports:
- `gsap` - Main GSAP object
- `ScrollTrigger` - ScrollTrigger plugin (already registered)

## Dependencies

- GSAP 3.12.5+
- React 18.2.0+ (peer dependency)
- React DOM 18.2.0+ (peer dependency)
