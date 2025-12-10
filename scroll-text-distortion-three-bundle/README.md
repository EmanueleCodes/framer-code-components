# Scroll Text Distortion Three.js Bundle

This bundle contains the Three.js classes needed for the Scroll Text Distortion Framer component.

## Exports

- `Scene`
- `PerspectiveCamera`
- `WebGLRenderer`
- `PlaneGeometry`
- `Mesh`
- `ShaderMaterial`
- `Vector2`
- `CanvasTexture`
- `Uniform`

## Usage in Framer

After pushing this bundle to GitHub, import it in your Framer component:

```javascript
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    CanvasTexture,
    Uniform,
} from "https://cdn.jsdelivr.net/gh/your-username/your-repo/main/scroll-text-distortion-three-bundle/dist/bundle.js";
```

Or using raw GitHub URL:

```javascript
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    CanvasTexture,
    Uniform,
} from "https://raw.githubusercontent.com/your-username/your-repo/main/scroll-text-distortion-three-bundle/dist/bundle.js";
```

## Building

```bash
npm install
npm run build
```

The built bundle will be in `dist/bundle.js`.

