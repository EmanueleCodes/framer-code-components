import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, DirectionalLight } from "three";
import { OrbitControls as OrbitControlsType } from "three-stdlib";
import { useSceneStore } from "../state/Scene";
// import Globe from "./Globe";
// import Globe from "./Globe.glb";
import Globe from "./Globe.glb.animated";

export default function Scene() {
    const { camera, gl, invalidate, scene } = useThree();
    const animate = useSceneStore((state) => state.animate);
    const autoRotate = useSceneStore((state) => state.autoRotate);
    const backgroundColor = useSceneStore((state) => state.backgroundColor);
    const landColor = useSceneStore((state) => state.landColor);
    const waterColor = useSceneStore((state) => state.waterColor);
    const blendFactor = useSceneStore((state) => state.blendFactor);
    const scaleFactor = useSceneStore((state) => state.scaleFactor);
    const opacity = useSceneStore((state) => state.opacity);
    const bloomRadius = useSceneStore((state) => state.bloomRadius);
    const bloomStrength = useSceneStore((state) => state.bloomStrength);
    const bloomThreshold = useSceneStore((state) => state.bloomThreshold);
    const lightColor = useSceneStore((state) => state.lightColor);
    const lightIntensity = useSceneStore((state) => state.lightIntensity);
    const toneMappingExposure = useSceneStore(
        (state) => state.toneMappingExposure
    );

    const controlsRef = useRef<OrbitControlsType>(null);
    const colorRef = useRef(new Color(backgroundColor));
    const lightRef = useRef<DirectionalLight | null>(null);

    if (!lightRef.current) {
        const light = new DirectionalLight("#ffffff", 0.6);
        light.position.set(0, -6, -3);
        lightRef.current = light;
    }

    useEffect(() => {
        const light = lightRef.current!;
        camera.add(light);
        scene.add(camera);

        return () => {
            camera.remove(light);
            scene.remove(camera);
        };
    }, [camera]);

    useEffect(() => {
        colorRef.current.set(backgroundColor);
        scene.background = colorRef.current;
    }, [backgroundColor]);

    useEffect(() => {
        if (!lightRef.current) return;
        lightRef.current.color.set(lightColor);
    }, [lightColor]);

    useEffect(() => {
        if (!lightRef.current) return;
        lightRef.current.intensity = lightIntensity;
    }, [lightIntensity]);

    useEffect(() => {
        gl.toneMappingExposure = toneMappingExposure;
    }, [toneMappingExposure]);

    useEffect(() => {
        invalidate();
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
        toneMappingExposure
    ]);

    useFrame(() => {
        if (autoRotate && controlsRef.current) {
            controlsRef.current.update();
            invalidate();
        } else if (animate) {
            invalidate();
        }
    });

    return (
        <>
            <ambientLight intensity={lightIntensity / 2} />
            <directionalLight
                position={[1.2, 0, 0.66]}
                color={lightColor}
                intensity={lightIntensity}
            />

            <Globe />

            <OrbitControls
                autoRotate={autoRotate}
                autoRotateSpeed={0.3}
                dampingFactor={0.03}
                enablePan={false}
                ref={controlsRef}
                zoomSpeed={0.3}
            />
        </>
    );
}
