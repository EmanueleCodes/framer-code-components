import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { StrictMode, Suspense } from "react";
import {
    ACESFilmicToneMapping,
    SRGBColorSpace,
    WebGPURenderer
} from "three/webgpu";
import Controls from "./components/Controls";
import Loading from "./components/Loading";
import Logo from "./components/Logo";
import PostProcessing from "./components/PostProcessing";
import Scene from "./components/Scene";
import { keyboardControls } from "./state/KeyboardControls";

export default function App() {
    return (
        <StrictMode>
            <KeyboardControls map={keyboardControls}>
                <Logo />
                <Controls />
                <Canvas
                    camera={{ position: [0, 1, 5.1], fov: 30 }}
                    eventPrefix="client"
                    eventSource={document.body}
                    frameloop="demand"
                    gl={async (props) => {
                        const renderer = new WebGPURenderer(props as never);
                        renderer.toneMapping = ACESFilmicToneMapping;
                        renderer.outputColorSpace = SRGBColorSpace;
                        await renderer.init();
                        return renderer;
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        position: "fixed",
                        touchAction: "none",
                        userSelect: "none",
                        WebkitTapHighlightColor: "transparent",
                        WebkitTouchCallout: "none",
                        WebkitUserSelect: "none"
                    }}
                >
                    <Suspense fallback={<Loading />}>
                        <PostProcessing>
                            <Scene />
                        </PostProcessing>
                    </Suspense>
                </Canvas>
            </KeyboardControls>
        </StrictMode>
    );
}
