import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import BloomNode, { bloom } from "three/addons/tsl/display/BloomNode.js";
import { pass } from "three/tsl";
import { PassNode, PostProcessing, WebGPURenderer } from "three/webgpu";
import { useSceneStore } from "../state/Scene";

export default function _PostProcessing({ children }: { children: ReactNode }) {
    const { camera, gl, scene } = useThree();
    const postProcessing = useRef<PostProcessing | null>(null);
    const scenePass = useRef<PassNode | null>(null);
    const bloomPass = useRef<BloomNode | null>(null);
    const bloomRadius = useSceneStore((s) => s.bloomRadius);
    const bloomStrength = useSceneStore((s) => s.bloomStrength);
    const bloomThreshold = useSceneStore((s) => s.bloomThreshold);

    useEffect(() => {
        if (!gl) return;

        const _postProcessing = new PostProcessing(
            gl as unknown as WebGPURenderer
        );

        const _scenePass = pass(scene, camera);
        const _sceneOutput = _scenePass.getTextureNode("output");
        const _bloomPass = bloom(_sceneOutput);

        _postProcessing.outputNode = _sceneOutput.add(_bloomPass);

        postProcessing.current = _postProcessing;
        scenePass.current = _scenePass;
        bloomPass.current = _bloomPass;

        return () => {
            _postProcessing.dispose?.();
        };
    }, [gl, scene, camera]);

    useEffect(() => {
        if (!bloomPass.current) return;
        bloomPass.current.radius.value = bloomRadius;
    }, [bloomRadius]);

    useEffect(() => {
        if (!bloomPass.current) return;
        bloomPass.current.strength.value = bloomStrength;
    }, [bloomStrength]);

    useEffect(() => {
        if (!bloomPass.current) return;
        bloomPass.current.threshold.value = bloomThreshold;
    }, [bloomThreshold]);

    useFrame(() => {
        if (postProcessing.current) {
            postProcessing.current.render();
        }
    }, 1);

    return children;
}
