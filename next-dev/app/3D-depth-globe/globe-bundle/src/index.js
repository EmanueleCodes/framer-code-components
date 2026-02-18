import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import Scene from "./components/Scene";
import { useSceneStore } from "./state/Scene";

function SceneWrapper({
  dataUrl,
  animate,
  autoRotate,
  backgroundColor,
  landColor,
  waterColor,
  blendFactor,
  scaleFactor,
  opacity,
  bloomRadius,
  bloomStrength,
  bloomThreshold,
  lightColor,
  lightIntensity,
  toneMappingExposure,
}) {
  const setState = useSceneStore((s) => s.setState);

  useEffect(() => {
    setState({
      animate,
      autoRotate,
      backgroundColor,
      landColor,
      waterColor,
      blendFactor,
      scaleFactor,
      opacity,
      bloomRadius,
      bloomStrength,
      bloomThreshold,
      lightColor,
      lightIntensity,
      toneMappingExposure,
    });
  }, [
    animate,
    autoRotate,
    backgroundColor,
    landColor,
    waterColor,
    blendFactor,
    scaleFactor,
    opacity,
    bloomRadius,
    bloomStrength,
    bloomThreshold,
    lightColor,
    lightIntensity,
    toneMappingExposure,
    setState,
  ]);

  return <Scene dataUrl={dataUrl} />;
}

export function GlobeScene({
  dataUrl,
  animate = true,
  autoRotate = true,
  backgroundColor = "#0d0d0d",
  landColor = "#fff0d1",
  waterColor = "#0d111a",
  blendFactor = 0.96,
  scaleFactor = 0.09,
  opacity = 0.81,
  bloomRadius = 0.48,
  bloomStrength = 0.6,
  bloomThreshold = 0,
  lightColor = "#ffd0b8",
  lightIntensity = 0.9,
  toneMappingExposure = 1,
}) {
  return (
    <Canvas
      camera={{ position: [0, 1, 5.1], fov: 30, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <SceneWrapper
        dataUrl={dataUrl}
        animate={animate}
        autoRotate={autoRotate}
        backgroundColor={backgroundColor}
        landColor={landColor}
        waterColor={waterColor}
        blendFactor={blendFactor}
        scaleFactor={scaleFactor}
        opacity={opacity}
        bloomRadius={bloomRadius}
        bloomStrength={bloomStrength}
        bloomThreshold={bloomThreshold}
        lightColor={lightColor}
        lightIntensity={lightIntensity}
        toneMappingExposure={toneMappingExposure}
      />
    </Canvas>
  );
}

export { useSceneStore };
