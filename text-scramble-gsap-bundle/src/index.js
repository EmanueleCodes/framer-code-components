// Import GSAP core and plugins
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

// Register the plugins with GSAP
gsap.registerPlugin(SplitText, ScrambleTextPlugin, useGSAP);

// Export everything needed for the text scramble effect
export { gsap, useGSAP, SplitText, ScrambleTextPlugin }; 