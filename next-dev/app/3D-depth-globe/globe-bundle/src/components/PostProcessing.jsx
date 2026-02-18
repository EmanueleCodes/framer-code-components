import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Vector2 } from "three";
import { useSceneStore } from "../state/Scene";

export default function PostProcessing({ children }) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);

  const bloomRadius = useSceneStore((s) => s.bloomRadius);
  const bloomStrength = useSceneStore((s) => s.bloomStrength);
  const bloomThreshold = useSceneStore((s) => s.bloomThreshold);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new Vector2(size.width, size.height),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);

    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    return () => {
      composer.dispose();
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height);
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.resolution.set(size.width, size.height);
    }
  }, [size]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = bloomStrength;
      bloomPassRef.current.radius = bloomRadius;
      bloomPassRef.current.threshold = bloomThreshold;
    }
  }, [bloomStrength, bloomRadius, bloomThreshold]);

  useFrame(() => {
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, 1);

  return <>{children}</>;
}
