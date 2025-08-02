# 3D Scan Complete Bundle

This bundle provides all the necessary libraries for the 3D scanning effect in Framer.

## Usage in Framer

```javascript
import {
  // React Three Fiber
  useFrame,
  Canvas,
  useThree,
  extend,
  
  // React Three Drei
  useAspect,
  useTexture,
  
  // Three.js core
  THREE,
  
  // TSL shader functions
  abs,
  blendScreen,
  float,
  Fn,
  max,
  mod,
  mx_cell_noise_float,
  oneMinus,
  select,
  ShaderNode,
  smoothstep,
  sub,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  
  // Three.js examples
  bloom,
  pass,
} from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/3d-scan-complete-bundle/dist/bundle.js";
```

## Exports

### React Three Fiber
- `useFrame` - Hook that runs every frame (60fps) for animations
- `Canvas` - React component that renders Three.js scenes
- `useThree` - Hook to access Three.js renderer, scene, and camera
- `extend` - Function to extend Three.js objects with React components

### React Three Drei
- `useAspect` - Hook to calculate aspect ratio scaling
- `useTexture` - Hook to load textures asynchronously

### Three.js Core
- `THREE` - The complete Three.js library with all classes and utilities

### TSL Shader Functions
- `abs` - Absolute value function
- `blendScreen` - Screen blend mode
- `float` - Float type constructor
- `Fn` - Function constructor for custom shader functions
- `max` - Maximum value function
- `mod` - Modulo function
- `mx_cell_noise_float` - Cell noise function
- `oneMinus` - One minus function
- `select` - Conditional selection function
- `ShaderNode` - Shader node base class
- `smoothstep` - Smooth step interpolation
- `sub` - Subtraction function
- `texture` - Texture sampling function
- `uniform` - Uniform value constructor
- `uv` - UV coordinates
- `vec2` - 2D vector constructor
- `vec3` - 3D vector constructor

### Three.js Examples
- `bloom` - Bloom post-processing effect
- `pass` - Pass function for post-processing

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- Three.js 0.174.0
- @react-three/fiber 8.15.19
- @react-three/drei 9.102.6 