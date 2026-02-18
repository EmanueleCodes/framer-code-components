import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, DirectionalLight } from "three";
import Globe from "./Globe";
import PostProcessing from "./PostProcessing";
import { useSceneStore } from "../state/Scene";

export default function Scene({ dataUrl }) {
  const { camera, gl, scene, invalidate } = useThree();

  const animate = useSceneStore((s) => s.animate);
  const autoRotate = useSceneStore((s) => s.autoRotate);
  const backgroundColor = useSceneStore((s) => s.backgroundColor);
  const lightColor = useSceneStore((s) => s.lightColor);
  const lightIntensity = useSceneStore((s) => s.lightIntensity);
  const toneMappingExposure = useSceneStore((s) => s.toneMappingExposure);

  const controlsRef = useRef(null);
  const colorRef = useRef(new Color(backgroundColor));
  const lightRef = useRef(null);

  useEffect(() => {
    if (!lightRef.current) {
      const light = new DirectionalLight("#ffffff", 0.6);
      light.position.set(0, -6, -3);
      lightRef.current = light;
    }

    const light = lightRef.current;
    camera.add(light);
    scene.add(camera);

    return () => {
      camera.remove(light);
      scene.remove(camera);
    };
  }, [camera, scene]);

  useEffect(() => {
    colorRef.current.set(backgroundColor);
    scene.background = colorRef.current;
  }, [backgroundColor, scene]);

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.color.set(lightColor);
    }
  }, [lightColor]);

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.intensity = lightIntensity;
    }
  }, [lightIntensity]);

  useEffect(() => {
    gl.toneMappingExposure = toneMappingExposure;
  }, [gl, toneMappingExposure]);

  useFrame(() => {
    if (autoRotate && controlsRef.current) {
      controlsRef.current.update();
      invalidate();
    } else if (animate) {
      invalidate();
    }
  });

  return (
    <PostProcessing>
      <ambientLight intensity={lightIntensity / 2} color={lightColor} />
      <directionalLight
        position={[1.2, 0, 0.66]}
        color={lightColor}
        intensity={lightIntensity}
      />

      <Globe dataUrl={dataUrl} />

      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        dampingFactor={0.03}
        enableDamping
        enablePan={false}
        zoomSpeed={0.3}
      />
    </PostProcessing>
  );
}
