// Import all required libraries for the 3D scan effect

// React Three Fiber
import { useFrame, Canvas, useThree, extend } from '@react-three/fiber';

// React Three Drei
import { useAspect, useTexture } from '@react-three/drei';

// Three.js core
import * as THREE from 'three';

// Three.js TSL shader functions
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

// Three.js examples
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';

// Export everything for use in Framer
export {
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
}; 