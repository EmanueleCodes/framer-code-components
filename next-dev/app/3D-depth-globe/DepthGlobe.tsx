import React from "react"
import { addPropertyControls, ControlType } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
import { GlobeScene } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe.js"

export interface DepthGlobeProps {
    dataUrl: string
    animate: boolean
    autoRotate: boolean
    backgroundColor: string
    landColor: string
    waterColor: string
    blendFactor: number
    scaleFactor: number
    opacity: number
    bloomRadius: number
    bloomStrength: number
    bloomThreshold: number
    lightColor: string
    lightIntensity: number
    toneMappingExposure: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function DepthGlobe({
    dataUrl = "",
    animate = true,
    autoRotate = true,
    backgroundColor = "#0d0d0d",
    landColor = "#fff0d1",
    waterColor = "#0d111a",
    blendFactor = 0.96,
    scaleFactor = 0.09,
    opacity = 0.81,
    bloomRadius = 0.48,
    bloomStrength = 0.6,
    bloomThreshold = 0,
    lightColor = "#ffd0b8",
    lightIntensity = 0.9,
    toneMappingExposure = 1,
    style,
}: DepthGlobeProps) {
    if (!dataUrl) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: backgroundColor,
                    ...style,
                }}
            >
                <ComponentMessage
                    style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}
                    title="3D Depth Globe"
                    subtitle='Set "Data URL" to your globe_samples JSON URL (same format as source: 3D-depth-globe/source/src/data/). Host the file publicly and paste the URL.'
                />
            </div>
        )
    }

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", ...style }}>
            <GlobeScene
                dataUrl={dataUrl}
                animate={animate}
                autoRotate={autoRotate}
                backgroundColor={backgroundColor}
                landColor={landColor}
                waterColor={waterColor}
                blendFactor={blendFactor}
                scaleFactor={scaleFactor}
                opacity={opacity}
                bloomRadius={bloomRadius}
                bloomStrength={bloomStrength}
                bloomThreshold={bloomThreshold}
                lightColor={lightColor}
                lightIntensity={lightIntensity}
                toneMappingExposure={toneMappingExposure}
            />
        </div>
    )
}

addPropertyControls(DepthGlobe, {
    dataUrl: {
        type: ControlType.String,
        title: "Data URL",
        defaultValue: "",
        description:
            "URL to globe_samples JSON (source format: ETOPO + Natural Earth). Host the file from source/src/data/.",
    },
    animate: {
        type: ControlType.Boolean,
        title: "Animate",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    autoRotate: {
        type: ControlType.Boolean,
        title: "Spin",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    landColor: {
        type: ControlType.Color,
        title: "Land",
        defaultValue: "#fff0d1",
    },
    waterColor: {
        type: ControlType.Color,
        title: "Water",
        defaultValue: "#0d111a",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#0d0d0d",
    },
    blendFactor: {
        type: ControlType.Number,
        title: "Blend",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.96,
    },
    scaleFactor: {
        type: ControlType.Number,
        title: "Topography",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.09,
    },
    opacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.81,
    },
    bloomRadius: {
        type: ControlType.Number,
        title: "Glow Radius",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.48,
    },
    bloomStrength: {
        type: ControlType.Number,
        title: "Glow Strength",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0.6,
    },
    bloomThreshold: {
        type: ControlType.Number,
        title: "Glow Threshold",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0,
    },
    lightColor: {
        type: ControlType.Color,
        title: "Light",
        defaultValue: "#ffd0b8",
    },
    lightIntensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0.9,
    },
    toneMappingExposure: {
        type: ControlType.Number,
        title: "Exposure",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 1,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

DepthGlobe.displayName = "3D Depth Globe"
