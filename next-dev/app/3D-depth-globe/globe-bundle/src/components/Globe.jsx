import React, { useEffect, useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  ShaderMaterial,
  SphereGeometry,
  MeshStandardMaterial,
} from "three";
import { pointGeometry } from "../globe/geometry";
import { pointVertexShader, pointFragmentShader } from "../globe/shaders";
import { useSceneStore } from "../state/Scene";

const RADIUS = 1;

export default function Globe({ dataUrl }) {
  const geometryRef = useRef(null);
  const pointsRef = useRef(null);
  const waterRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const animate = useSceneStore((s) => s.animate);
  const landColor = useSceneStore((s) => s.landColor);
  const waterColor = useSceneStore((s) => s.waterColor);
  const blendFactor = useSceneStore((s) => s.blendFactor);
  const scaleFactor = useSceneStore((s) => s.scaleFactor);
  const opacity = useSceneStore((s) => s.opacity);

  const pointsMaterial = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      vertexShader: pointVertexShader,
      fragmentShader: pointFragmentShader,
      uniforms: {
        uRadius: { value: RADIUS },
        uScale: { value: scaleFactor },
        uTime: { value: 0 },
        uAnimate: { value: animate ? 1.0 : 0.0 },
        uLandColor: { value: new Color(landColor) },
        uWaterColor: { value: new Color(waterColor) },
        uBlendFactor: { value: blendFactor },
      },
    });
  }, []);

  const waterGeometry = useMemo(() => {
    return new SphereGeometry(RADIUS * 0.999, 96, 96);
  }, []);

  const waterMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color(waterColor),
      opacity: opacity,
      side: DoubleSide,
      transparent: true,
    });
  }, []);

  useEffect(() => {
    if (!dataUrl) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`);

        const data = await response.json();
        if (!data.points || !Array.isArray(data.points)) {
          throw new Error("Invalid data format - expected { points: [...] }");
        }

        geometryRef.current = pointGeometry(data.points);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Failed to load globe data");
        setLoading(false);
      }
    };

    loadData();
  }, [dataUrl]);

  useFrame((state) => {
    if (pointsMaterial) {
      pointsMaterial.uniforms.uTime.value = state.clock.elapsedTime;
      pointsMaterial.uniforms.uScale.value = scaleFactor;
      pointsMaterial.uniforms.uAnimate.value = animate ? 1.0 : 0.0;
      pointsMaterial.uniforms.uLandColor.value.set(landColor);
      pointsMaterial.uniforms.uWaterColor.value.set(waterColor);
      pointsMaterial.uniforms.uBlendFactor.value = blendFactor;
    }

    if (waterMaterial) {
      waterMaterial.color.set(waterColor);
      waterMaterial.opacity = opacity;
    }
  });

  if (loading || !geometryRef.current) {
    return null;
  }

  return (
    <>
      <points
        ref={pointsRef}
        geometry={geometryRef.current}
        material={pointsMaterial}
        rotation={[0, 3.45, 0]}
      />
      <mesh
        ref={waterRef}
        geometry={waterGeometry}
        material={waterMaterial}
      />
    </>
  );
}
