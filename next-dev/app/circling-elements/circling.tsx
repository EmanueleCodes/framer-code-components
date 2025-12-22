import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface CirclingElementsProps {
    mode: "images" | "components"
    itemCount: number
    content: ControlType.ComponentInstance[]
    image1?: any
    image2?: any
    image3?: any
    image4?: any
    image5?: any
    image6?: any
    image7?: any
    image8?: any
    image9?: any
    image10?: any
    radius: number
    speed: number
    orientation: "rotate" | "pin"
    rotationAlignment: "fixed" | "radial" | "tangent"
    fixedAngle: number
    direction: "normal" | "reverse"
    pauseOnHover: boolean
    itemWidth: number
    itemHeight: number
    sizing: "fixed" | "fit-content"
    preview: boolean
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function CirclingElements({
    mode = "images",
    itemCount = 4,
    content = [],
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    image7,
    image8,
    image9,
    image10,
    radius = 120,
    speed = 0.5,
    orientation = "rotate",
    rotationAlignment = "fixed",
    fixedAngle = 0,
    direction = "normal",
    pauseOnHover = false,
    itemWidth = 80,
    itemHeight = 80,
    sizing = "fixed",
    preview = true,
    style,
}: CirclingElementsProps) {
    const [isHovered, setIsHovered] = useState(false)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Linear mapping of speed (0.1 to 1) to rotations per second
    // This ensures equal speed increments = equal rotation speed increments
    const minSpeed = 0.1
    const maxSpeed = 1.0
    const minRotationsPerSec = 1 / 300 // slowest: 1 rotation per 5 minutes
    const maxRotationsPerSec = 1 / 3 // fastest: 1 rotation per 3 seconds
    const normalizedSpeed = (speed - minSpeed) / (maxSpeed - minSpeed)
    const rotationsPerSec =
        minRotationsPerSec +
        normalizedSpeed * (maxRotationsPerSec - minRotationsPerSec)
    const duration = 1 / rotationsPerSec

    // Measure intrinsic sizes of child components when sizing = "fit-content"
    const contentMeasureRefs = useRef<(HTMLDivElement | null)[]>([])
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const [maxContentSize, setMaxContentSize] = useState<{
        width: number
        height: number
    }>({ width: 0, height: 0 })

    // measurement useEffect is declared after actualCount to avoid TS "used before declaration" warning

    // Get images array
    const images = [
        image1,
        image2,
        image3,
        image4,
        image5,
        image6,
        image7,
        image8,
        image9,
        image10,
    ]

    // Determine actual count based on mode
    const actualCount =
        mode === "components"
            ? content.length > 0
                ? content.length
                : 4
            : itemCount

    // Force re-render when count changes to recalculate positions
    useEffect(() => {
        // This effect will trigger a re-render when actualCount changes
    }, [actualCount])

    // Measure intrinsic sizes of child components when sizing = "fit-content"
    useEffect(() => {
        if (!(mode === "components" && sizing === "fit-content")) return
        const t = setTimeout(() => {
            const probe = zoomProbeRef.current
            const editorZoom = probe
                ? probe.getBoundingClientRect().width / 20
                : 1
            const safeZoom = Math.max(editorZoom, 0.0001)
            let maxW = 0
            let maxH = 0
            for (const el of contentMeasureRefs.current) {
                if (!el) continue
                const child = el.firstElementChild as HTMLElement | null
                const rect = (child ?? el).getBoundingClientRect()
                const adjustedW = rect.width / safeZoom
                const adjustedH = rect.height / safeZoom
                if (adjustedW > maxW) maxW = adjustedW
                if (adjustedH > maxH) maxH = adjustedH
            }
            setMaxContentSize({ width: maxW, height: maxH })
        }, 0)
        return () => clearTimeout(t)
    }, [mode, sizing, content, actualCount, itemWidth, itemHeight])

    // Removed forced remount key to prevent animation restarts

    return (
        <div
            style={{
                ...style,
                position: "relative",
                zIndex: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            onMouseEnter={() => pauseOnHover && setIsHovered(true)}
            onMouseLeave={() => pauseOnHover && setIsHovered(false)}
        >
            {/* Inline keyframes for orbiting rotation */}
            <style>{`
        @keyframes rotate360 {
          from { transform: translate3d(-50%, -50%, 0) rotate(0deg); }
          to { transform: translate3d(-50%, -50%, 0) rotate(360deg); }
        }
        @keyframes counterRotate360 {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>

            {Array.from({ length: actualCount }).map((_, index) => {
                const offsetDegrees =
                    (index * 360) / (actualCount === 0 ? 1 : actualCount)
                const animationDelaySeconds = -(
                    (offsetDegrees / 360) *
                    duration
                )

                const rotatingWrapperStyle: React.CSSProperties = {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate3d(-50%, -50%, 0)",
                    transformOrigin: "center",
                    willChange: "transform",
                    animationName: "rotate360",
                    animationDuration: `${duration}s`,
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationDirection: direction,
                    animationDelay: `${animationDelaySeconds}s`,
                    animationPlayState:
                        (isCanvas && !preview) || (pauseOnHover && isHovered)
                            ? "paused"
                            : "running",
                }

                const radiusWrapperStyle: React.CSSProperties = {
                    transform: `translateX(${radius}px)`,
                    willChange: "transform",
                }

                // Calculate item rotation based on orientation mode
                let itemRotation = 0
                if (orientation === "rotate") {
                    if (rotationAlignment === "tangent") {
                        // tangent: Items are tangent to the path
                        itemRotation = 0
                    } else if (rotationAlignment === "radial") {
                        // Radial: fixed angle + 90deg
                        itemRotation = 90
                    } else {
                        // Fixed angle
                        itemRotation = fixedAngle
                    }
                } else {
                    // pin mode keeps items upright, rotation is handled via counter animation below
                    itemRotation = 0
                }

                const itemImage = images[index]
                const itemComponent = content[index]

                return (
                    <div
                        key={`${actualCount}-${index}`}
                        style={rotatingWrapperStyle}
                    >
                        <div style={radiusWrapperStyle}>
                            <div
                                style={{
                                    ...(mode === "components" &&
                                    sizing === "fit-content"
                                        ? { display: "inline-block" }
                                        : {
                                              width: itemWidth,
                                              height: itemHeight,
                                          }),
                                    position: "relative",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    animationName:
                                        orientation === "pin"
                                            ? "counterRotate360"
                                            : "none",
                                    animationDuration: `${duration}s`,
                                    animationTimingFunction: "linear",
                                    animationIterationCount: "infinite",
                                    animationDirection: direction,
                                    animationDelay: `${animationDelaySeconds}s`,
                                    animationPlayState:
                                        (isCanvas && !preview) ||
                                        (pauseOnHover && isHovered)
                                            ? "paused"
                                            : "running",
                                    transform:
                                        orientation === "rotate"
                                            ? `rotate(${itemRotation}deg)`
                                            : "none",
                                    backgroundColor:
                                        mode === "images" && !itemImage
                                            ? "rgba(243, 239, 255, 0.8)"
                                            : "transparent",
                                    backdropFilter:
                                        mode === "images" && !itemImage
                                            ? "blur(10px)"
                                            : "none",
                                    border:
                                        (mode === "images" && !itemImage) ||
                                        (mode === "components" &&
                                            !itemComponent)
                                            ? "1.5px solid #9967FF"
                                            : "none",
                                }}
                            >
                                {mode === "images" ? (
                                    itemImage ? (
                                        <img
                                            src={itemImage.src}
                                            alt={`Item ${index + 1}`}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <ComponentMessage
                                            title={`Item ${index + 1}`}
                                            subtitle="Add an image"
                                        />
                                    )
                                ) : itemComponent ? (
                                    <div
                                        ref={(el) => {
                                            contentMeasureRefs.current[index] =
                                                el
                                        }}
                                        style={{
                                            position: "relative",
                                            ...(sizing === "fixed"
                                                ? {
                                                      width: "100%",
                                                      height: "100%",
                                                  }
                                                : {}),
                                        }}
                                    >
                                        {React.cloneElement(
                                            itemComponent as any,
                                            {
                                                style: {
                                                    ...(sizing === "fixed"
                                                        ? {
                                                              width: "100%",
                                                              height: "100%",
                                                              position:
                                                                  "absolute",
                                                              top: 0,
                                                              left: 0,
                                                          }
                                                        : {}),
                                                    ...(itemComponent as any)
                                                        .props?.style,
                                                },
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <ComponentMessage
                                        title={`Item ${index + 1}`}
                                        subtitle="Add a component"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
            {/* Hidden 20x20 probe to detect editor zoom in canvas */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            {/* Invisible sizing element to prevent collapse: diameter + half max item size */}
            {(() => {
                const effectiveItemW =
                    mode === "components" && sizing === "fit-content"
                        ? Math.max(maxContentSize.width, 0)
                        : itemWidth
                const effectiveItemH =
                    mode === "components" && sizing === "fit-content"
                        ? Math.max(maxContentSize.height, 0)
                        : itemHeight
                const w = 2 * radius + effectiveItemW
                const h = 2 * radius + effectiveItemH
                return (
                    <div
                        style={{
                            position: "relative",
                            width: w,
                            height: h,
                            opacity: 0,
                            pointerEvents: "none",
                            zIndex: -1,
                        }}
                    />
                )
            })()}
        </div>
    )
}

addPropertyControls(CirclingElements, {
	preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["images", "components"],
        optionTitles: ["Images", "Components"],
        defaultValue: "images",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    content: {
        type: ControlType.Array,
        title: "Content",
        control: {
            type: ControlType.ComponentInstance,
        },
        hidden: (props) => props.mode === "images",
    },
    itemCount: {
        type: ControlType.Number,
        title: "Count",
        min: 2,
        max: 10,
        step: 1,
        defaultValue: 4,
        hidden: (props) => props.mode === "components",
    },
    sizing: {
        type: ControlType.Enum,
        title: "Sizing",
        options: ["fixed", "fit-content"],
        optionTitles: ["Fixed", "Fit content"],
        defaultValue: "fixed",
        hidden: (props) => props.mode !== "components",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    itemWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 20,
        max: 1000,
        step: 10,
        defaultValue: 200,
        unit: "px",
        hidden: (props) =>
            props.mode === "components" && props.sizing === "fit-content",
    },
    itemHeight: {
        type: ControlType.Number,
        title: "Height",
        min: 20,
        max: 1000,
        step: 10,
        defaultValue: 200,
        unit: "px",
        hidden: (props) =>
            props.mode === "components" && props.sizing === "fit-content",
    },
    image1: {
        type: ControlType.ResponsiveImage,
        title: "Image 1",
        hidden: (props) => props.mode !== "images",
    },
    image2: {
        type: ControlType.ResponsiveImage,
        title: "Image 2",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 2,
    },
    image3: {
        type: ControlType.ResponsiveImage,
        title: "Image 3",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 3,
    },
    image4: {
        type: ControlType.ResponsiveImage,
        title: "Image 4",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 4,
    },
    image5: {
        type: ControlType.ResponsiveImage,
        title: "Image 5",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 5,
    },
    image6: {
        type: ControlType.ResponsiveImage,
        title: "Image 6",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 6,
    },
    image7: {
        type: ControlType.ResponsiveImage,
        title: "Image 7",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 7,
    },
    image8: {
        type: ControlType.ResponsiveImage,
        title: "Image 8",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 8,
    },
    image9: {
        type: ControlType.ResponsiveImage,
        title: "Image 9",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 9,
    },
    image10: {
        type: ControlType.ResponsiveImage,
        title: "Image 10",
        hidden: (props) =>
            props.mode !== "images" || (props?.itemCount ?? 4) < 10,
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 500,
        step: 10,
        defaultValue: 100,
        unit: "px",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
    },
    orientation: {
        type: ControlType.Enum,
        title: "Orientation",
        options: ["rotate", "pin"],
        optionTitles: ["Fixed", "Pin"],
        defaultValue: "pin",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    rotationAlignment: {
        type: ControlType.Enum,
        title: "Rotation",
        options: ["fixed", "radial", "tangent"],
        optionTitles: ["Fixed angle", "Radial", "Tangent"],
        defaultValue: "fixed",
        hidden: (props) => props.orientation !== "rotate",
    },
    fixedAngle: {
        type: ControlType.Number,
        title: "Angle",
        min: -360,
        max: 360,
        step: 1,
        defaultValue: 0,
        unit: "deg",
        hidden: (props) =>
            props.orientation !== "rotate" ||
            props.rotationAlignment !== "fixed",
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["normal", "reverse"],
        optionTitles: ["Clockwise", "Counter-clockwise"],
        defaultValue: "normal",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    pauseOnHover: {
        type: ControlType.Boolean,
        title: "On Hover",
        defaultValue: false,
        enabledTitle: "Pause",
        disabledTitle: "None",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

CirclingElements.displayName = "Circle Animator"
