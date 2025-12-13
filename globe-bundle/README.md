# Globe Bundle for Framer

This bundle contains React Three Fiber and the necessary Three.js classes for creating 3D globe components in Framer.

## What's Included

- **React Three Fiber**: `Canvas`, `useFrame`, `useThree`
- **Three.js Classes**: `Color`, `EdgesGeometry`, `LineBasicMaterial`, `MeshBasicMaterial`, `SphereGeometry`, `WireframeGeometry`

## Installation

```bash
npm install
npm run build
```

## Usage in Framer

After building and hosting on GitHub, import in your Framer component:

```javascript
import {
  Canvas,
  useFrame,
  useThree,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  SphereGeometry,
  WireframeGeometry,
} from "https://raw.githubusercontent.com/your-username/globe-bundle/main/dist/bundle.js";
```

## Dependencies

- `@react-three/fiber`: ^9.3.0
- `three`: ^0.179.1
- `react`: ^18.2.0
- `react-dom`: ^18.2.0

