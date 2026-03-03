// Three.js core – everything DepthGlobe needs (single instance for real bloom)
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Points,
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  AmbientLight,
  DirectionalLight,
} from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Points,
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  AmbientLight,
  DirectionalLight,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
};
