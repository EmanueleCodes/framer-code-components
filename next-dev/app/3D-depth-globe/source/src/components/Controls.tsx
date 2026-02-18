import { useKeyboardControls } from "@react-three/drei";
import { buttonGroup, folder, Leva, useControls } from "leva";
import { useEffect } from "react";
import { keyboardControls } from "../state/KeyboardControls";
import { useSceneStore } from "../state/Scene";
import "./Controls.css";

export default function Controls() {
    const breakpointWidth = 750;

    const backgroundColor = useSceneStore((state) => state.backgroundColor);
    const setBackgroundColor = useSceneStore(
        (state) => state.setBackgroundColor
    );
    const landColor = useSceneStore((state) => state.landColor);
    const setLandColor = useSceneStore((state) => state.setLandColor);
    const waterColor = useSceneStore((state) => state.waterColor);
    const setWaterColor = useSceneStore((state) => state.setWaterColor);

    const animate = useSceneStore((state) => state.animate);
    const setAnimate = useSceneStore((state) => state.setAnimate);
    const autoRotate = useSceneStore((state) => state.autoRotate);
    const setAutoRotate = useSceneStore((state) => state.setAutoRotate);
    const blendFactor = useSceneStore((state) => state.blendFactor);
    const setBlendFactor = useSceneStore((state) => state.setBlendFactor);
    const scaleFactor = useSceneStore((state) => state.scaleFactor);
    const setScaleFactor = useSceneStore((state) => state.setScaleFactor);

    const opacity = useSceneStore((state) => state.opacity);
    const setOpacity = useSceneStore((state) => state.setOpacity);
    const bloomRadius = useSceneStore((state) => state.bloomRadius);
    const setBloomRadius = useSceneStore((state) => state.setBloomRadius);
    const bloomStrength = useSceneStore((state) => state.bloomStrength);
    const setBloomStrength = useSceneStore((state) => state.setBloomStrength);
    const bloomThreshold = useSceneStore((state) => state.bloomThreshold);
    const setBloomThreshold = useSceneStore((state) => state.setBloomThreshold);
    const lightColor = useSceneStore((state) => state.lightColor);
    const setLightColor = useSceneStore((state) => state.setLightColor);
    const lightIntensity = useSceneStore((state) => state.lightIntensity);
    const setLightIntensity = useSceneStore((state) => state.setLightIntensity);
    const toneMappingExposure = useSceneStore(
        (state) => state.toneMappingExposure
    );
    const setToneMappingExposure = useSceneStore(
        (state) => state.setToneMappingExposure
    );

    const showInterface = useSceneStore((state) => state.showInterface);
    const toggleShowInterface = useSceneStore(
        (state) => state.toggleShowInterface
    );
    const showText = useSceneStore((state) => state.showText);
    const toggleShowText = useSceneStore((state) => state.toggleShowText);

    const [subscribe] = useKeyboardControls();

    useEffect(() => {
        return subscribe((state) => {
            if (state.toggleInterface) toggleShowInterface();
            if (state.toggleText) toggleShowText();
        });
    }, [subscribe, toggleShowInterface, toggleShowText]);

    useEffect(() => {
        const movementKeys = keyboardControls.reduce<string[]>(
            (all, control) => all.concat(control.keys),
            []
        );
        function handleKeyDown(e: KeyboardEvent) {
            const active = document.activeElement;
            if (
                active &&
                (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
            ) {
                if (movementKeys.includes(e.code)) {
                    e.stopPropagation();
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown, true);
        return () =>
            document.removeEventListener("keydown", handleKeyDown, true);
    });

    const [_, _set] = useControls(() => ({
        Controls: folder(
            {
                Presets: buttonGroup({
                    "B/W": blackWhitePreset,
                    Glow: glowPreset,
                    Blue: bluePreset,
                    Green: greenPreset
                }),
                Topography: {
                    value: scaleFactor,
                    min: 0.01,
                    max: 0.3,
                    step: 0.001,
                    onChange: setScaleFactor
                },
                Animate: folder(
                    {
                        Spin: {
                            value: autoRotate,
                            onChange: setAutoRotate
                        },
                        Pixels: {
                            value: animate,
                            onChange: setAnimate
                        }
                    },
                    { collapsed: window.innerWidth <= breakpointWidth }
                ),
                Globe: folder(
                    {
                        Background: {
                            value: backgroundColor,
                            onChange: setBackgroundColor
                        },
                        Land: {
                            value: landColor,
                            onChange: setLandColor
                        },
                        Water: {
                            value: waterColor,
                            onChange: setWaterColor
                        },
                        Blend: {
                            value: blendFactor,
                            min: 0.0,
                            max: 1.0,
                            step: 0.01,
                            onChange: setBlendFactor
                        },
                        Opacity: {
                            value: opacity,
                            min: 0.0,
                            max: 1.0,
                            step: 0.01,
                            onChange: setOpacity
                        }
                    },
                    { collapsed: window.innerWidth <= breakpointWidth }
                ),
                Glow: folder(
                    {
                        Radius: {
                            value: bloomRadius,
                            min: 0,
                            max: 1,
                            step: 0.01,
                            onChange: setBloomRadius
                        },
                        Strength: {
                            value: bloomStrength,
                            min: 0,
                            max: 1,
                            step: 0.01,
                            onChange: setBloomStrength
                        },
                        Threshold: {
                            value: bloomThreshold,
                            min: 0,
                            max: 1,
                            step: 0.01,
                            onChange: setBloomThreshold
                        }
                    },
                    { collapsed: window.innerWidth <= breakpointWidth }
                ),
                Light: folder(
                    {
                        Color: {
                            value: lightColor,
                            onChange: setLightColor
                        },
                        Intensity: {
                            value: lightIntensity,
                            min: 0,
                            max: 3,
                            step: 0.1,
                            onChange: setLightIntensity
                        },
                        Exposure: {
                            value: toneMappingExposure,
                            min: 0,
                            max: 3,
                            step: 0.1,
                            onChange: setToneMappingExposure
                        }
                    },
                    { collapsed: window.innerWidth <= breakpointWidth }
                )
            },
            { collapsed: window.innerWidth <= breakpointWidth }
        )
    }));

    // Workaround for incorrect TypeScript inference
    const set = _set as any;

    // Presets
    function blackWhitePreset() {
        set({
            Background: "#0d0d0d",
            Land: "#ffffff",
            Water: "#0d0d0d",
            Blend: 0.75,
            Opacity: 0.84,
            Radius: 0.24,
            Strength: 0.15,
            Threshold: 0.09,
            Color: "#ffffff",
            Intensity: 0.6,
            Exposure: 1
        });
    }

    function glowPreset() {
        set({
            Background: "#0d0d0d",
            Land: "#fff0d1",
            Water: "#0d111a",
            Blend: 0.96,
            Opacity: 0.81,
            Radius: 0.48,
            Strength: 0.6,
            Threshold: 0,
            Color: "#ffd0b8",
            Intensity: 0.9,
            Exposure: 1
        });
    }

    function bluePreset() {
        set({
            Background: "#00081A",
            Land: "#ffffff",
            Water: "#224B8F",
            Blend: 0.96,
            Opacity: 0.9,
            Radius: 0.24,
            Strength: 0.24,
            Threshold: 0,
            Color: "#83ccd2",
            Intensity: 1.5,
            Exposure: 1
        });
    }

    function greenPreset() {
        set({
            Background: "#10121a",
            Land: "#6b9362",
            Water: "#1a1212",
            Blend: 0.96,
            Opacity: 0.88,
            Radius: 1,
            Strength: 0.18,
            Threshold: 0,
            Color: "#a6deff",
            Intensity: 1.5,
            Exposure: 1.2
        });
    }

    const title = import.meta.env.VITE_PLAYTEST_TITLE;
    const description = import.meta.env.VITE_PLAYTEST_DESCRIPTION;
    const video = import.meta.env.VITE_YOUTUBE_VIDEO_URL;

    function stopPropagation(e: React.PointerEvent) {
        e.stopPropagation();
    }

    return showInterface ? (
        <div className="controls">
            {showText && (
                <header>
                    <h1>{title}</h1>
                    {video && (
                        <a className="video" href={video} target="_blank">
                            Video
                        </a>
                    )}
                    <p>{description}</p>
                </header>
            )}
            <div
                className="panel"
                onPointerDown={stopPropagation}
                onPointerMove={stopPropagation}
            >
                <Leva
                    fill={true}
                    hideCopyButton={true}
                    theme={{
                        colors: {
                            accent1: "#6f6f6f",
                            accent2: "#ffffff",
                            accent3: "#b0b0b0",
                            elevation1: "#2b2b2b",
                            elevation2: "#1f2020",
                            elevation3: "#3c3c3c",
                            highlight1: "#6f6f6f",
                            highlight2: "#6f6f6f",
                            highlight3: "#b0b0b0"
                        },
                        fonts: {
                            mono: `Public Sans, system-ui, sans-serif`,
                            sans: `Public Sans, system-ui, sans-serif`
                        },
                        fontSizes: {
                            root: "0.75rem"
                        },
                        fontWeights: {
                            button: "700",
                            folder: "700",
                            label: "600"
                        },
                        sizes: {
                            controlWidth: "165px"
                        }
                    }}
                    titleBar={false}
                    neverHide
                />
            </div>
        </div>
    ) : null;
}
