// Three.js core
import * as THREE from "three";

// Post-processing
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

// Export everything needed for selective bloom post-processing
export {
  THREE,
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  OutputPass,
  ShaderPass,
};

