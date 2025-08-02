# React Three Fiber Bundle

This bundle provides `@react-three/fiber` components and hooks for use in Framer.

## Usage in Framer

```javascript
import { useFrame, Canvas, useThree, extend } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/react-three-fiber-bundle/dist/bundle.js";
```

## Exports

- `useFrame` - Hook that runs every frame (60fps) for animations
- `Canvas` - React component that renders Three.js scenes
- `useThree` - Hook to access Three.js renderer, scene, and camera
- `extend` - Function to extend Three.js objects with React components

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- @react-three/fiber 8.15.16
- Three.js 0.174.0 