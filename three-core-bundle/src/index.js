// Import Three.js WebGPU renderer and core functionality
import * as THREE from 'three/webgpu';

// Export Three.js as namespace for easy access
export { THREE };

// Also export commonly used Three.js classes for convenience
export const {
  WebGPURenderer,
  MeshBasicNodeMaterial,
  PostProcessing,
  Vector2,
  Vector3,
  SRGBColorSpace,
  // Add other commonly used classes as needed
} = THREE; 