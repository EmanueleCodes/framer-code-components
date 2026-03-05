/**
 * Depth Globe full bundle – three + postprocessing + fiber + drei.
 * Use this as the single script dependency for the Depth Globe Framer component.
 */

// Three.js core (everything DepthGlobe uses)
export {
  ACESFilmicToneMapping,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  HalfFloatType,
  Mesh,
  MeshStandardMaterial,
  Points,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

// Postprocessing
export { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
export { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
export { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// React Three Fiber
export { Canvas, useFrame, useThree } from "@react-three/fiber";

// Drei
export { OrbitControls } from "@react-three/drei";
