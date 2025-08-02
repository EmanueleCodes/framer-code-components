# Three.js Bundles for Framer

This repository contains custom bundles of Three.js and related libraries for use in Framer projects. Since Framer doesn't allow direct imports of external libraries, these bundles are hosted on GitHub and can be imported via raw URLs.

## Available Bundles

### 1. React Three Drei Bundle
**Path:** `react-three-drei-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/react-three-drei-bundle/dist/bundle.js`

**Exports:**
- `useAspect` - Hook to calculate aspect ratio scaling
- `useTexture` - Hook to load textures asynchronously

**Usage:**
```javascript
import { useAspect, useTexture } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/react-three-drei-bundle/dist/bundle.js";
```

### 2. React Three Fiber Bundle
**Path:** `react-three-fiber-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/react-three-fiber-bundle/dist/bundle.js`

**Exports:**
- `useFrame` - Hook that runs every frame (60fps) for animations
- `Canvas` - React component that renders Three.js scenes
- `useThree` - Hook to access Three.js renderer, scene, and camera
- `extend` - Function to extend Three.js objects with React components

**Usage:**
```javascript
import { useFrame, Canvas, useThree, extend } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/react-three-fiber-bundle/dist/bundle.js";
```

### 3. Three.js Core Bundle
**Path:** `three-core-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-core-bundle/dist/bundle.js`

**Exports:**
- `THREE` - The complete Three.js library with all classes and utilities

**Usage:**
```javascript
import { THREE } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-core-bundle/dist/bundle.js";
```

### 4. Three.js TSL Bundle
**Path:** `three-tsl-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-tsl-bundle/dist/bundle.js`

**Exports:**
- `abs`, `blendScreen`, `float`, `Fn`, `max`, `mod`, `mx_cell_noise_float`, `oneMinus`, `select`, `ShaderNode`, `smoothstep`, `sub`, `texture`, `uniform`, `uv`, `vec2`, `vec3`

**Usage:**
```javascript
import {
  abs, blendScreen, float, Fn, max, mod, mx_cell_noise_float,
  oneMinus, select, ShaderNode, smoothstep, sub, texture,
  uniform, uv, vec2, vec3
} from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-tsl-bundle/dist/bundle.js";
```

### 5. Three.js Examples Bundle
**Path:** `three-examples-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-examples-bundle/dist/bundle.js`

**Exports:**
- `bloom` - Bloom post-processing effect from Three.js examples
- `pass` - Pass function for post-processing

**Usage:**
```javascript
import { bloom, pass } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-examples-bundle/dist/bundle.js";
```

### 6. 3D Scan Complete Bundle
**Path:** `3d-scan-complete-bundle/`
**GitHub URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/3d-scan-complete-bundle/dist/bundle.js`

**Exports:** All of the above combined in a single bundle

**Usage:**
```javascript
import {
  // React Three Fiber
  useFrame, Canvas, useThree, extend,
  
  // React Three Drei
  useAspect, useTexture,
  
  // Three.js core
  THREE,
  
  // TSL shader functions
  abs, blendScreen, float, Fn, max, mod, mx_cell_noise_float,
  oneMinus, select, ShaderNode, smoothstep, sub, texture,
  uniform, uv, vec2, vec3,
  
  // Three.js examples
  bloom, pass,
} from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/3d-scan-complete-bundle/dist/bundle.js";
```

## Dependencies

All bundles use the following core dependencies:
- React 18.2.0
- React DOM 18.2.0
- Three.js 0.174.0
- @react-three/fiber 8.15.19
- @react-three/drei 9.102.6

## Building the Bundles

Each bundle can be built using:

```bash
cd [bundle-name]
npm install
npm run build
```

This creates a `dist/bundle.js` file that can be imported in Framer.

## Usage in Framer

To use these bundles in Framer:

1. Replace the local development imports in your code with the GitHub raw URLs
2. Import the specific functions you need from the appropriate bundle
3. The bundles are optimized and minified for production use

## Example: 3D Scan Effect

For the 3D scan effect specifically, you can use the complete bundle:

```javascript
// Replace all the individual imports with this single import
import {
  useFrame, Canvas, useThree, extend,
  useAspect, useTexture,
  THREE,
  abs, blendScreen, float, Fn, max, mod, mx_cell_noise_float,
  oneMinus, select, ShaderNode, smoothstep, sub, texture,
  uniform, uv, vec2, vec3,
  bloom, pass,
} from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/3d-scan-complete-bundle/dist/bundle.js";
```

This replaces all the individual imports in the original `page.tsx` file and makes the code compatible with Framer's import restrictions. 