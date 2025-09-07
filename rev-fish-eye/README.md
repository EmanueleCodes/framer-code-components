# Rev Fish-Eye Bundle

A custom bundle containing Three.js and React Three Fiber components for Framer projects.

## What's Included

- **Canvas** - The main React Three Fiber Canvas component
- **useFrame, useThree** - React Three Fiber hooks
- **Mesh, ShaderMaterial, MeshBasicMaterial** - Three.js core classes
- **Vector2, Vector3** - Three.js math utilities
- **SRGBColorSpace, AdditiveBlending** - Three.js constants
- **Scene, PerspectiveCamera, WebGLRenderer** - Three.js scene management
- **PlaneGeometry, TextureLoader** - Three.js geometry and texture utilities

## Usage in Framer

Import the bundle in your Framer code component:

```tsx
import { Canvas, useFrame, useThree, Mesh, ShaderMaterial } from "https://raw.githubusercontent.com/your-username/rev-fish-eye/main/dist/bundle.js"
```

## Example Usage

```tsx
import { Canvas } from "https://raw.githubusercontent.com/your-username/rev-fish-eye/main/dist/bundle.js"

export default function MyComponent() {
  return (
    <Canvas>
      {/* Your Three.js scene here */}
    </Canvas>
  )
}
```

## Building

To rebuild the bundle:

```bash
npm run build
```

This will regenerate the `dist/bundle.js` file.

## Dependencies

- React 18.2.0
- Three.js 0.158.0
- @react-three/fiber 8.15.12
- @react-three/drei 9.88.13

## Notes

- The bundle is configured to work with Framer's React 18 setup
- All Three.js dependencies are properly deduplicated
- The bundle is minified and optimized for production use
