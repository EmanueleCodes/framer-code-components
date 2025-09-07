# Fish-Eye Final Bundle

A custom bundle containing Three.js and React Three Fiber components for Framer projects, specifically designed for fish-eye effects.

## What's Included

- **Canvas** - The main React Three Fiber Canvas component
- **useFrame, useThree** - React Three Fiber hooks for animation and scene access
- **useTexture** - Hook for loading and managing textures
- **Mesh, ShaderMaterial** - Three.js core classes for 3D objects and materials
- **Vector2** - Three.js math utilities for 2D vectors
- **Scene, PerspectiveCamera, WebGLRenderer** - Three.js scene management
- **PlaneGeometry, TextureLoader** - Three.js geometry and texture utilities
- **LinearFilter, ClampToEdgeWrapping, SRGBColorSpace, AdditiveBlending** - Three.js constants

## Usage in Framer

Import the bundle in your Framer code component:

```tsx
import { Canvas, useFrame, useThree, useTexture, Mesh, ShaderMaterial } from "https://raw.githubusercontent.com/your-username/fish-eye-final-bundle/main/dist/bundle.js"
```

## Example Usage

```tsx
import React from "react"
import { Canvas, useFrame, useThree, useTexture, Mesh, ShaderMaterial } from "https://raw.githubusercontent.com/your-username/fish-eye-final-bundle/main/dist/bundle.js"

// Your scene component
const FishEyeScene = () => {
    const { viewport } = useThree()
    
    useFrame(() => {
        // Animation logic here
    })
    
    return (
        <mesh>
            <planeGeometry />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </mesh>
    )
}

// Main component
export const FishEyeEffect = () => {
    return (
        <Canvas
            flat
            gl={{
                antialias: true,
                powerPreference: "high-performance",
                precision: "mediump",
            }}
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
            }}
        >
            <FishEyeScene />
        </Canvas>
    )
}
```

## Bundle Details

- **Size**: ~960KB (optimized and minified)
- **Format**: ES Module
- **Dependencies**: Three.js 0.158.0, React Three Fiber 8.15.12, React Three Drei 9.88.13
- **React Version**: 18.2.0 (compatible with Framer)

## Building

To rebuild the bundle:

```bash
npm install
npm run build
```

## Notes

- This bundle is specifically optimized for fish-eye effects and similar 3D image manipulations
- All Three.js classes are properly deduplicated to prevent conflicts
- The bundle excludes React and Framer dependencies (provided by Framer)
- Use the Canvas component for optimal performance and automatic resize handling
