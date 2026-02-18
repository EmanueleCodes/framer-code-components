import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Color, DoubleSide, Mesh, Points } from "three";
import { attribute, float, uniform } from "three/tsl";
import { PointsNodeMaterial, UniformNode } from "three/webgpu";
import { useSceneStore } from "../state/Scene";

type MaterialUniforms = {
    scale: UniformNode<number>;
    landColor: UniformNode<Color>;
    waterColor: UniformNode<Color>;
    blendFactor: UniformNode<number>;
};

function pointMaterial(radius: number): {
    material: PointsNodeMaterial;
    uniforms: MaterialUniforms;
} {
    const direction = attribute("_direction");
    const elevation = attribute("_elevation"); // [0..1]
    const land = attribute("_land"); // 0 or 1

    // Position
    const scale = uniform(float(1.0));
    const position = float(radius).add(elevation.mul(scale));

    // Color
    const landColor = uniform(new Color());
    const waterColor = uniform(new Color());
    const blendFactor = uniform(0.75);
    // landLow = lerp(landColor, waterColor, blendFactor)
    const landLow = landColor
        .mul(float(1.0).sub(blendFactor))
        .add(waterColor.mul(blendFactor));
    // landLow + (landColor - landLow) * elevation
    const landElevated = landLow.add(landColor.sub(landLow).mul(elevation));
    // land == 1 -> landElevated; land == 0 -> waterColor
    const finalColor = land.equal(1.0).select(landElevated, waterColor);

    const material = new PointsNodeMaterial();
    material.positionNode = direction.mul(position);
    material.colorNode = finalColor;

    return {
        material,
        uniforms: {
            scale,
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

    const landColor = useSceneStore((s) => s.landColor);
    const waterColor = useSceneStore((s) => s.waterColor);
    const blendFactor = useSceneStore((s) => s.blendFactor);
    const scaleFactor = useSceneStore((s) => s.scaleFactor);
    const opacity = useSceneStore((s) => s.opacity);

    useEffect(() => {
        const geometry = (nodes.GlobePoints as Points).geometry;

        const { material, uniforms } = pointMaterial(1.0);
        uniformsRef.current = uniforms;

        pointsRef.current!.geometry = geometry;
        pointsRef.current!.material = material;
    }, [nodes]);

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
