import { BufferGeometry, Mesh, Points, Scene, SphereGeometry } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Compress the output before importing in Globe.glb.tsx
// npx @gltf-transform/cli meshopt globe.glb globe.meshopt.glb

export default function saveGlb(
    pointsGeometry: BufferGeometry,
    radius: number,
    filename = "globe.glb"
) {
    const scene = new Scene();

    // Points (our material cannot be exported)
    const points = new Points(pointsGeometry);
    points.name = "GlobePoints";
    scene.add(points);

    // Sphere
    const sphere = new Mesh(new SphereGeometry(radius * 0.999, 96, 96));
    sphere.name = "GlobeSphere";
    scene.add(sphere);

    const exporter = new GLTFExporter();
    exporter.parse(
        scene,
        (result) => {
            const blob = new Blob([result as ArrayBuffer], {
                type: "model/gltf-binary"
            });

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        },
        (error) => {
            console.log(error);
        },
        { binary: true }
    );
}
