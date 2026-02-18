import { useEffect, useRef } from "react";
import {
    BufferGeometry,
    Color,
    DoubleSide,
    Float32BufferAttribute
} from "three";
import { attribute, float, uniform } from "three/tsl";
import { PointsNodeMaterial, UniformNode } from "three/webgpu";
import globeData from "../data/globe_samples_10m_0.1.json";
// import saveGlb from "../saveGlb";
import { useSceneStore } from "../state/Scene";

export type GlobeData = {
    meta: {
        radius: number;
    };
    points: Point[];
};

type Point = [
    latitude: number,
    longitude: number,
    elevation: number,
    land: number
];

type MaterialUniforms = {
    scale: UniformNode<number>;
    landColor: UniformNode<Color>;
    waterColor: UniformNode<Color>;
    blendFactor: UniformNode<number>;
};

const DATA = globeData as unknown as GlobeData;
const MAX_ELEVATION = 6000;
const RADIUS = 1;

// function geographicToSphereCoordinates(
//     [latitude, longitude, elevation]: [number, number, number],
//     radius: number
// ): Vector3 {
//     const phi = ((90 - latitude) * Math.PI) / 180;
//     const theta = ((90 - longitude) * Math.PI) / 180;
//     const r = radius + elevation;

//     return new Vector3(
//         r * Math.sin(phi) * Math.cos(theta),
//         r * Math.cos(phi),
//         r * Math.sin(phi) * Math.sin(theta)
//     );
// }

function coordinatesToUnitDirection(
    latitude: number,
    longitude: number
): [number, number, number] {
    const phi = ((90 - latitude) * Math.PI) / 180;
    const theta = ((90 - longitude) * Math.PI) / 180;

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    return [x, y, z];
}

function scaleElevation(
    elevation: number,
    scalingFactor: number,
    gamma: number
): number {
    // Linear
    // return Math.min(elevation / MAX_ELEVATION, 1) * scalingFactor;

    // Compressed
    const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION));
    return Math.pow(t, gamma) * scalingFactor;
}

function pointGeometry(samples: Point[]): BufferGeometry {
    const directions: number[] = [];
    const elevations: number[] = [];
    const landMask: number[] = [];

    for (const [lat, lon, elevation, land] of samples) {
        const [dx, dy, dz] = coordinatesToUnitDirection(lat, lon);
        directions.push(dx, dy, dz);
        elevations.push(land ? scaleElevation(elevation, 1.0, 1) : 0);
        landMask.push(land);
    }

    const geometry = new BufferGeometry();

    geometry.setAttribute(
        "direction",
        new Float32BufferAttribute(directions, 3)
    );
    geometry.setAttribute(
        "elevation",
        new Float32BufferAttribute(elevations, 1)
    );
    geometry.setAttribute("land", new Float32BufferAttribute(landMask, 1));

    geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(directions.length), 3)
    );

    console.log(`Points: ${samples.length.toLocaleString()}`);
    return geometry;
}

function pointMaterial(radius: number): {
    material: PointsNodeMaterial;
    uniforms: MaterialUniforms;
} {
    const scale = uniform(float(1.0));

    const landColor = uniform(new Color());
    const waterColor = uniform(new Color());
    const blendFactor = uniform(0.75);

    const direction = attribute("direction");
    const elevation = attribute("elevation"); // [0..1]
    const land = attribute("land"); // 0 or 1

    const position = float(radius).add(elevation.mul(scale));

    // landLow = lerp(landColor, waterColor, blendFactor)
    const landLow = landColor
        .mul(float(1.0).sub(blendFactor))
        .add(waterColor.mul(blendFactor));

    // landLow + (landColor - landLow) * elevation
    const landElevated = landLow.add(landColor.sub(landLow).mul(elevation));

    // if (land == 1) -> landElevated
    // if (land == 0) -> waterColor
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
    if (!DATA) return null;
    const geometryRef = useRef<BufferGeometry | null>(null);
    const materialRef = useRef<PointsNodeMaterial | null>(null);
    const uniformsRef = useRef<MaterialUniforms | null>(null);
    const landColor = useSceneStore((s) => s.landColor);
    const waterColor = useSceneStore((s) => s.waterColor);
    const blendFactor = useSceneStore((s) => s.blendFactor);
    const scaleFactor = useSceneStore((s) => s.scaleFactor);
    const opacity = useSceneStore((s) => s.opacity);

    useEffect(() => {
        geometryRef.current = pointGeometry(DATA.points);

        const { material, uniforms } = pointMaterial(RADIUS);
        materialRef.current = material;
        uniformsRef.current = uniforms;
    }, []);

    useEffect(() => {
        if (!uniformsRef.current) return;
        uniformsRef.current.scale.value = scaleFactor;
    }, [scaleFactor]);

    useEffect(() => {
        if (!uniformsRef.current) return;
        uniformsRef.current.landColor.value.set(landColor);
    }, [landColor]);

    useEffect(() => {
        if (!uniformsRef.current) return;
        uniformsRef.current.waterColor.value.set(waterColor);
    }, [waterColor]);

    useEffect(() => {
        if (!uniformsRef.current) return;
        uniformsRef.current.blendFactor.value = blendFactor;
    }, [blendFactor]);

    // useEffect(() => {
    //     if (!geometryRef.current) return;

    //     saveGltf(geometryRef.current, RADIUS);
    // }, []);

    if (!geometryRef.current || !materialRef.current) return null;

    return (
        <>
            <points
                geometry={geometryRef.current}
                material={materialRef.current}
                rotation={[0, 3.45, 0]}
            />
            <mesh>
                <sphereGeometry args={[RADIUS * 0.999, 96, 96]} />
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
