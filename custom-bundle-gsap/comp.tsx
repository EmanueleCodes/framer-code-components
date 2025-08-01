import { useRef } from "react";
// import { gsap } from "gsap";
// import { useGSAP } from "@gsap/react";
// import {
//   gsap,
//   useGSAP,
// } from "https://cdn.jsdelivr.net/gh/bachoff-studio/bachoff-studio-public-assets@main/files/bundles/gasp-test/bundle.js";
import { gsap, useGSAP } from "./Bundle.tsx";

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 800
 * @framerDisableUnlink
 */
export default function BundlingTutorial() {
  const squareRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const square = squareRef.current;
    if (!square) return;

    // Create continuous loading animation
    const tl = gsap.timeline({ repeat: -1 });

    tl.to(square, {
      rotation: 360,
      scale: 1.2,
      duration: 2,
      ease: "power2.inOut",
    })
      .to(
        square,
        {
          scale: 0.8,
          duration: 1,
          ease: "power2.inOut",
        },
        "-=0.5"
      )
      .to(square, {
        scale: 1,
        duration: 1,
        ease: "power2.inOut",
      });
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <div
        ref={squareRef}
        style={{
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
          width: "120px",
          height: "120px",
          backgroundColor: "red",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "white",
              borderRadius: "50%",
              opacity: 0.8,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
