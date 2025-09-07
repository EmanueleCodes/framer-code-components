// Import all required libraries for the 3D scan effect

// React Three Fiber

// React Three Drei

// Three.js core


// Three.js specific classes and constants
import { useAspect, useTexture } from '@react-three/drei';
import { useFrame, Canvas, useThree, extend } from '@react-three/fiber';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';
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

//import * as THREE from 'three/webgpu';

import { WebGPURenderer, PostProcessing as ThreePostProcessing, SRGBColorSpace, Vector2, MeshBasicNodeMaterial, Texture, CanvasTexture, AdditiveBlending, TextureLoader, MeshBasicMaterial } from 'three/webgpu';


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
  
  // Three.js specific classes and constants
  Texture,
  CanvasTexture,
  AdditiveBlending,
  TextureLoader,
  SRGBColorSpace,
  Vector2,
  MeshBasicMaterial,
  MeshBasicNodeMaterial,
  
  // Three.js WebGPU specific
  WebGPURenderer,
  ThreePostProcessing,
  
  
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