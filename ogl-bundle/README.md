# OGL Bundle for Framer

This bundle provides the OGL (OpenGL) library components needed for the Gradient Blinds component in Framer.

## What's Included

- `Renderer` - WebGL renderer
- `Program` - Shader program management
- `Mesh` - 3D mesh rendering
- `Triangle` - Basic triangle geometry

## Usage in Framer

Import the bundle in your Framer component:

```typescript
import { Renderer, Program, Mesh, Triangle } from "https://raw.githubusercontent.com/emanueleburratti/Framer-Code-Components/main/ogl-bundle/dist/bundle.js";
```

## Build Instructions

1. Install dependencies: `npm install`
2. Build bundle: `npm run build`
3. The bundle will be created in `dist/bundle.js`

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- OGL ^0.0.70

## Bundle Configuration

The bundle is configured with Rollup to:
- Output ES modules for browser compatibility
- Exclude React and Framer dependencies (provided by Framer)
- Minify and optimize the output
- Support all modern JavaScript features
