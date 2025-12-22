// Import GSAP core and plugins
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Export everything needed for Framer
export { gsap, ScrollTrigger, useGSAP };

// Export a default object with all exports for convenience
export default {
  gsap,
  ScrollTrigger,
  useGSAP
};
