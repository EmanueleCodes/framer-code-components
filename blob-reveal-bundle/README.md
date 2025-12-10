# Blob Reveal Bundle

A custom bundle containing Three.js and GSAP dependencies for the Framer Blob Image Reveal component.

## What's Included

This bundle includes:
- **Three.js**: WebGL 3D graphics library
  - Scene, PerspectiveCamera, WebGLRenderer
  - PlaneGeometry, Mesh, ShaderMaterial
  - Vector2, TextureLoader, Uniform
- **GSAP**: Animation library
  - useGSAP hook from @gsap/react
  - Core gsap functions

## Usage in Framer

```javascript
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    TextureLoader,
    Uniform,
    useGSAP,
    gsap,
} from "https://raw.githubusercontent.com/your-username/blob-reveal-bundle/main/dist/bundle.js"
```

## Building

```bash
npm install
npm run build
```

The built bundle will be available at `dist/bundle.js` (548KB minified).

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- Three.js 0.181.2
- GSAP 3.13.0
- @gsap/react 2.1.2

## Development

This bundle was created using Rollup with the following plugins:
- @rollup/plugin-node-resolve
- @rollup/plugin-commonjs
- @rollup/plugin-babel
- @rollup/plugin-terser

## License

MIT
