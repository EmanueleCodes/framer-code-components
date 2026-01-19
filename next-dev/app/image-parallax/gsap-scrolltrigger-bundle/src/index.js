// Import GSAP core and ScrollTrigger plugin
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Export everything needed for Framer
export { gsap, ScrollTrigger };

// Export a default object with all exports for convenience
export default {
  gsap,
  ScrollTrigger
};
