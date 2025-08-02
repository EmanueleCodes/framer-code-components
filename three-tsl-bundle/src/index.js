// Import TSL shader functions
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
} from 'three/tsl';

// Import additional functions needed for the 3D scan effect
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';

// Export all TSL functions for use in Framer
export {
  abs,
  blendScreen,
  bloom,
  float,
  Fn,
  max,
  mod,
  mx_cell_noise_float,
  oneMinus,
  pass,
  select,
  ShaderNode,
  smoothstep,
  sub,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
}; 