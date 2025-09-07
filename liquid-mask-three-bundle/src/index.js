// Re-export only the Three.js APIs used by liquid-mask/page.tsx
export {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  LinearFilter,
  SRGBColorSpace,
  Clock,
  TextureLoader
} from 'three';

// Also export IUniform type as a no-op runtime export for compatibility.
// In JS builds, types are erased, but Framer import sites can destructure it safely.
export const IUniform = undefined;
