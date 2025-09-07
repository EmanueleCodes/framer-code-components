/**
 * GSAP Carousel Bundle
 * 
 * This bundle contains all the GSAP functionality needed for the horizontal carousel component.
 * It includes the core GSAP library, Draggable plugin, and InertiaPlugin for momentum scrolling.
 * 
 * Usage in Framer:
 * import { gsap, Draggable, InertiaPlugin, useGSAP } from "https://raw.githubusercontent.com/your-username/gsap-carousel-bundle/main/dist/bundle.js";
 */

// Import GSAP core
import { gsap } from "gsap";

// Import GSAP plugins
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

// Import useGSAP hook for React integration
import { useGSAP } from "@gsap/react";

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * Export all GSAP functionality needed for the carousel
 * 
 * This includes:
 * - gsap: Core GSAP library
 * - Draggable: For drag-to-scroll functionality
 * - InertiaPlugin: For momentum scrolling
 * - useGSAP: React hook for GSAP integration
 */
export { 
  gsap, 
  Draggable, 
  InertiaPlugin, 
  useGSAP 
};

/**
 * Export GSAP utilities that might be useful
 * These are commonly used in the carousel component
 */
export const gsapUtils = {
  toArray: gsap.utils.toArray,
  wrap: gsap.utils.wrap,
  snap: gsap.utils.snap,
  getProperty: gsap.getProperty,
  set: gsap.set,
  killTweensOf: gsap.killTweensOf
};

/**
 * Export common GSAP easing functions
 * These are frequently used in carousel animations
 */
export const easing = {
  power1: gsap.parseEase("power1"),
  power2: gsap.parseEase("power2"),
  power3: gsap.parseEase("power3"),
  power4: gsap.parseEase("power4"),
  back: gsap.parseEase("back"),
  elastic: gsap.parseEase("elastic"),
  bounce: gsap.parseEase("bounce"),
  sine: gsap.parseEase("sine"),
  circ: gsap.parseEase("circ"),
  expo: gsap.parseEase("expo")
};

/**
 * Export common animation presets for carousel
 * These can be used as starting points for carousel animations
 */
export const animationPresets = {
  slideIn: {
    x: 0,
    duration: 0.5,
    ease: "power2.out"
  },
  slideOut: {
    x: -100,
    duration: 0.3,
    ease: "power2.in"
  },
  fadeIn: {
    opacity: 1,
    duration: 0.4,
    ease: "power2.out"
  },
  fadeOut: {
    opacity: 0,
    duration: 0.3,
    ease: "power2.in"
  },
  scaleUp: {
    scale: 1.1,
    duration: 0.3,
    ease: "back.out(1.7)"
  },
  scaleDown: {
    scale: 1,
    duration: 0.3,
    ease: "power2.out"
  }
};
