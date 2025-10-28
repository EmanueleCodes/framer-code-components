# Three.js Rug Bundle

A custom bundle of Three.js classes and controls specifically for the 3D rug text effect component.

## What's Included

This bundle exports the following Three.js classes and controls:

### Core Three.js Classes
- `Scene` - Three.js scene container
- `Color` - Color utilities
- `OrthographicCamera` - Orthographic camera for isometric views
- `Raycaster` - Mouse interaction and collision detection
- `Vector2` - 2D vector for mouse coordinates
- `WebGLRenderer` - WebGL renderer
- `ShaderMaterial` - Custom shader material
- `TextureLoader` - Texture loading utility
- `Vector3` - 3D vector for positions and displacements
- `PlaneGeometry` - Plane geometry for the text surface
- `Mesh` - 3D mesh objects
- `MeshBasicMaterial` - Basic material for invisible hit planes
- `DoubleSide` - Material side constant

### Controls
- `OrbitControls` - Interactive camera controls

## Usage in Framer

Once hosted on GitHub, import this bundle in your Framer component:

```javascript
import {
    Scene,
    Color,
    OrthographicCamera,
    Raycaster,
    Vector2,
    WebGLRenderer,
    ShaderMaterial,
    TextureLoader,
    Vector3,
    PlaneGeometry,
    Mesh,
    MeshBasicMaterial,
    DoubleSide,
    OrbitControls
} from "https://raw.githubusercontent.com/your-username/threejs-rug-bundle/main/dist/bundle.js"
```

## Building

```bash
npm run build
```

This creates `dist/bundle.js` containing all the bundled Three.js classes.

## Dependencies

- React 18.2.0 (peer dependency for Framer compatibility)
- Three.js 0.180.0
- Rollup build tools

## File Structure

```
threejs-rug-bundle/
├── src/
│   └── index.js          # Entry point with imports/exports
├── dist/
│   └── bundle.js         # Built bundle (generated)
├── package.json          # Dependencies and scripts
├── rollup.config.js      # Rollup configuration
└── README.md            # This file
```
