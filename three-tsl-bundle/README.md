# Three.js TSL Bundle

This bundle provides Three.js Shader Language (TSL) functions for use in Framer.

## Usage in Framer

```javascript
import {
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
} from "https://raw.githubusercontent.com/Emanuele-Webtales/npm-bundles-1/main/three-tsl-bundle/dist/bundle.js";
```

## Exports

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

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- Three.js 0.174.0 