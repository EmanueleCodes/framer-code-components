// Three.js – only what PixelMaskReveal needs
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Color,
  LinearFilter,
} from "three";

// GSAP + ScrollTrigger
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Color,
  LinearFilter,
  gsap,
  ScrollTrigger,
};
