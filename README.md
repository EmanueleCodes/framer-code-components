# Modular Three.js Bundles for Framer

This repository contains modular bundles for Three.js libraries that can be imported individually in Framer projects. This approach provides better flexibility and smaller bundle sizes compared to a single monolithic bundle.

## 🎯 **Bundle Overview**

### **1. Three.js Core Bundle** (`three-core-bundle`)
**Purpose:** Core Three.js functionality with WebGPU renderer
**URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/three-core-bundle/dist/bundle.js`

**Exports:**
```javascript
import { THREE, WebGPURenderer, MeshBasicNodeMaterial, PostProcessing } from "bundle-url";
```

### **2. React Three Fiber Bundle** (`react-three-fiber-bundle`)
**Purpose:** React Three Fiber components and hooks
**URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-fiber-bundle/dist/bundle.js`

**Exports:**
```javascript
import { useFrame, Canvas, useThree, extend } from "bundle-url";
```

### **3. React Three Drei Bundle** (`react-three-drei-bundle`)
**Purpose:** React Three Drei utilities and helpers
**URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-drei-bundle/dist/bundle.js`

**Exports:**
```javascript
import { useAspect, useTexture } from "bundle-url";
```

### **4. Three.js TSL Bundle** (`three-tsl-bundle`)
**Purpose:** Three.js Shader Language functions and bloom effects
**URL:** `https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/three-tsl-bundle/dist/bundle.js`

**Exports:**
```javascript
import { 
  bloom, pass, abs, blendScreen, float, Fn, max, mod,
  mx_cell_noise_float, oneMinus, select, ShaderNode, 
  smoothstep, sub, texture, uniform, uv, vec2, vec3 
} from "bundle-url";
```

## 🚀 **Usage in Framer**

### **Complete Example:**
```typescript
// Import from different bundles based on your needs
import { THREE, WebGPURenderer } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/three-core-bundle/dist/bundle.js";
import { useFrame, Canvas, useThree, extend } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-fiber-bundle/dist/bundle.js";
import { useAspect, useTexture } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-drei-bundle/dist/bundle.js";
import { bloom, pass, abs, blendScreen, float, Fn } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/three-tsl-bundle/dist/bundle.js";

// Use them in your Framer component
export default function MyComponent() {
  // Your component code here
}
```

### **Minimal Example:**
```typescript
// Only import what you need
import { THREE } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/three-core-bundle/dist/bundle.js";
import { Canvas } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-fiber-bundle/dist/bundle.js";
import { useTexture } from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles/main/react-three-drei-bundle/dist/bundle.js";
```

## 📦 **Bundle Details**

### **Three.js Core Bundle**
- **Size:** ~2.5MB (includes WebGPU renderer)
- **Dependencies:** `three@^0.174.0`
- **Use Case:** When you need WebGPU functionality or core Three.js classes

### **React Three Fiber Bundle**
- **Size:** ~1.8MB (includes React Three Fiber)
- **Dependencies:** `@react-three/fiber@^8.15.19`, `react@^18.2.0`, `react-dom@^18.2.0`
- **Use Case:** When you need Canvas, useFrame, useThree, or extend

### **React Three Drei Bundle**
- **Size:** ~3.2MB (includes all Drei utilities)
- **Dependencies:** `@react-three/drei@^9.102.6`, `react@^18.2.0`, `react-dom@^18.2.0`
- **Use Case:** When you need useAspect, useTexture, or other Drei helpers

### **Three.js TSL Bundle**
- **Size:** ~2.1MB (includes TSL functions)
- **Dependencies:** `three@^0.174.0`
- **Use Case:** When you need shader functions or bloom effects

## 🔧 **Development**

### **Building Bundles:**
```bash
# Build all bundles
cd three-core-bundle && npm run build
cd ../react-three-fiber-bundle && npm run build
cd ../react-three-drei-bundle && npm run build
cd ../three-tsl-bundle && npm run build
```

### **Adding New Bundles:**
1. Create a new directory: `mkdir my-new-bundle`
2. Initialize: `npm init -y`
3. Add `"type": "module"` to package.json
4. Create `src/index.js` with your exports
5. Create `rollup.config.js` with proper configuration
6. Add dependencies and build

## 🎨 **Benefits of Modular Approach**

1. **Smaller Bundle Sizes:** Only import what you need
2. **Better Caching:** Individual bundles can be cached separately
3. **Flexibility:** Mix and match based on requirements
4. **Maintenance:** Easier to update individual libraries
5. **Performance:** Faster loading for simple use cases

## 📋 **Migration from Monolithic Bundle**

If you were using the old monolithic bundle:

**Before:**
```typescript
import { THREE, useFrame, Canvas, useAspect, bloom } from "old-bundle-url";
```

**After:**
```typescript
import { THREE } from "three-core-bundle-url";
import { useFrame, Canvas } from "react-three-fiber-bundle-url";
import { useAspect } from "react-three-drei-bundle-url";
import { bloom } from "three-tsl-bundle-url";
```

## 🚨 **Important Notes**

- All bundles are compatible with React 18 and Framer
- WebGPU features require modern browsers
- Some bundles may have overlapping dependencies (handled by Rollup)
- Always test in your specific Framer environment

## 📞 **Support**

For issues or questions about these bundles, please check:
1. Browser compatibility for WebGPU features
2. Framer's import restrictions
3. Bundle size limitations in your project 