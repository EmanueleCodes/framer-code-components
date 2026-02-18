import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, DoubleSide, Mesh, Points, Vector3 } from "three";
import { attribute, float, fract, smoothstep, uniform, vec3 } from "three/tsl";
import { PointsNodeMaterial, UniformNode } from "three/webgpu";
import { useSceneStore } from "../state/Scene";

type MaterialUniforms = {
    animate: UniformNode<number>;
    scale: UniformNode<number>;
    time: UniformNode<number>;
    landColor: UniformNode<Color>;
    waterColor: UniformNode<Color>;
    blendFactor: UniformNode<number>;
    cameraDelta: UniformNode<Vector3>;
};

function pointMaterial(radius: number): {
    material: PointsNodeMaterial;
    uniforms: MaterialUniforms;
} {
    /**
     * Attributes
     */
    const direction = attribute("_direction");
    const elevation = attribute("_elevation"); // [0..1]
    const land = attribute("_land"); // 0 or 1

    /**
     * Uniforms
     */
    const animate = uniform(float(1.0));
    const scale = uniform(float(1.0));
    const time = uniform(float(0.0));
    const cameraDelta = uniform(vec3(0, 0, 0));
    const landColor = uniform(new Color());
    const waterColor = uniform(new Color());
    const blendFactor = uniform(0.75);

    /**
     * Animated Position
     */
    const baseRadius = float(radius).add(elevation.mul(scale.mul(0.84)));
    const targetRadius = float(radius).add(elevation.mul(scale));
    const travelTime = float(3.6);
    const distance = targetRadius.sub(baseRadius);
    const directionHash = direction
        .dot(vec3(12.9898, 78.233, 37.719))
        .sin()
        .mul(float(43758.5453))
        .fract();
    const offset = directionHash.add(elevation.mul(0.36)).fract();
    const phase = fract(time.div(travelTime).add(offset));
    const easedT = phase.mul(phase).mul(float(3.0).sub(phase.mul(2.1)));
    const wobbleAmount = float(0.006);
    const elevationWobbleScale = float(1.0).add(elevation.mul(3));
    const wobbleAxis = direction
        .cross(vec3(0.3, 1.0, 0.3))
        .add(direction.cross(vec3(1.0, 0.3, 0.3)))
        .normalize();
    const wobbleSignal = time.mul(float(3)).add(directionHash.mul(6)).sin();
    const wobbleEnvelope = easedT.mul(float(1.0).sub(easedT));
    const wobble = wobbleAxis
        .mul(wobbleSignal)
        .mul(wobbleEnvelope)
        .mul(wobbleAmount)
        .mul(elevationWobbleScale)
        .mul(land);
    const wobbledPosition = baseRadius.add(distance.mul(easedT)).add(wobble);
    const animatedPosition = targetRadius.add(
        wobbledPosition.sub(targetRadius).mul(animate)
    );

    /**
     * Motion Delay
     */
    const worldPosition = animatedPosition.mul(direction);
    const cameraMotion = cameraDelta.negate();
    const viewDirection = worldPosition.normalize().add(wobble.mul(150));
    const lateralMotion = cameraMotion.sub(
        viewDirection.mul(cameraMotion.dot(viewDirection))
    );
    const blurElevation = float(0.03);
    const blurFade = float(0.3);
    const elevationMask = smoothstep(
        blurElevation,
        blurElevation.add(blurFade),
        elevation
    );
    const blurFactor = elevation
        .mul(scale)
        .mul(9)
        .add(wobble.mul(scale))
        .mul(elevationMask)
        .mul(animate);

    const position = worldPosition.add(
        lateralMotion.mul(blurFactor)
    );

    /**
     * Fade
     */
    const fadeThreshold = float(0.69); // high enough to exclude Antarctica
    const rawFade = phase
        .sub(fadeThreshold)
        .div(float(1.0).sub(fadeThreshold))
        .clamp(0.0, 1.0);
    const smoothFade = rawFade
        .mul(rawFade)
        .mul(float(3.0).sub(rawFade.mul(2.0)));
    const fadeMask = elevation.greaterThanEqual(fadeThreshold).toFloat();
    const fade = float(1.0).sub(smoothFade.mul(fadeMask).mul(animate));

    /**
     * Color
     */
    const landLow = landColor
        .mul(float(1.0).sub(blendFactor))
        .add(waterColor.mul(blendFactor));
    const landElevated = landLow.add(landColor.sub(landLow).mul(elevation));
    const color = land.equal(1.0).select(landElevated, waterColor).mul(fade);

    /**
     * Material
     */
    const material = new PointsNodeMaterial({
        transparent: true
    });
    material.positionNode = position;
    material.colorNode = color;

    return {
        material,
        uniforms: {
            animate,
            scale,
            time,
            cameraDelta,
            landColor,
            waterColor,
            blendFactor
        }
    };
}

export default function Globe() {
    const { nodes } = useGLTF(`${import.meta.env.BASE_URL}/globe.glb`);

    const pointsRef = useRef<Points | null>(null);
    const uniformsRef = useRef<MaterialUniforms | null>(null);
    const animate = useSceneStore((s) => s.animate);
    const landColor = useSceneStore((s) => s.landColor);
    const waterColor = useSceneStore((s) => s.waterColor);
    const blendFactor = useSceneStore((s) => s.blendFactor);
    const scaleFactor = useSceneStore((s) => s.scaleFactor);
    const opacity = useSceneStore((s) => s.opacity);
    const previousCameraPosition = useRef(new Vector3());
    const smoothedCameraDelta = useRef(new Vector3());
    const cameraDelta = new Vector3();

    useEffect(() => {
        const geometry = (nodes.GlobePoints as Points).geometry;

        const { material, uniforms } = pointMaterial(1.0);

        uniformsRef.current = uniforms;

        pointsRef.current!.geometry = geometry;
        pointsRef.current!.material = material;
    }, [nodes]);

    useEffect(() => {
        uniformsRef.current!.animate.value = Number(animate);
    }, [animate]);

    useEffect(() => {
        uniformsRef.current!.scale.value = scaleFactor;
    }, [scaleFactor]);

    useEffect(() => {
        uniformsRef.current!.landColor.value.set(landColor);
    }, [landColor]);

    useEffect(() => {
        uniformsRef.current!.waterColor.value.set(waterColor);
    }, [waterColor]);

    useEffect(() => {
        uniformsRef.current!.blendFactor.value = blendFactor;
    }, [blendFactor]);

    useFrame((state, delta) => {
        const cameraPosition = state.camera.position;

        if (!animate) {
            smoothedCameraDelta.current.set(0, 0, 0);
        }

        if (previousCameraPosition.current.lengthSq() > 0) {
            cameraDelta.subVectors(
                cameraPosition,
                previousCameraPosition.current
            );

            const maximumDelta = 0.24;
            const clampedDelta = Math.min(delta, maximumDelta);
            const response = 6.0;
            const alpha = 1 - Math.exp(-response * clampedDelta);

            smoothedCameraDelta.current.lerp(cameraDelta, alpha);
            smoothedCameraDelta.current.clampLength(0, maximumDelta);

            if (uniformsRef.current) {
                uniformsRef.current.cameraDelta.value.copy(
                    smoothedCameraDelta.current
                );
            }
        }

        previousCameraPosition.current.copy(cameraPosition);

        if (uniformsRef.current) {
            uniformsRef.current.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <>
            <points ref={pointsRef} rotation={[0, 3.45, 0]} />
            <mesh geometry={(nodes.GlobeSphere as Mesh).geometry}>
                <meshStandardMaterial
                    color={waterColor}
                    opacity={opacity}
                    side={DoubleSide}
                    transparent
                />
            </mesh>
        </>
    );
}
