# Liquid Mask Three Bundle

Minimal Three.js bundle exposing only the APIs used by the `liquid-mask` component so it can run as a Framer Code Component.

## Usage in Framer

```js
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  LinearFilter,
  SRGBColorSpace,
  Clock,
  TextureLoader
} from "https://raw.githubusercontent.com/your-username/your-repo/main/liquid-mask-three-bundle/dist/bundle.js";
```

## Build

```bash
cd liquid-mask-three-bundle
npm i
npm run build
```

This generates `dist/bundle.js`.
