import React, { RefObject, useCallback, useEffect, useRef } from "react"
import {
    motion,
    MotionValue,
    SpringOptions,
    useAnimationFrame,
    useMotionValue,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from "framer-motion"
import { ControlType, addPropertyControls, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// import { ComponentMessage } from "../../utils/ComponentMessage";
// -------------------------------------------------------------- //
// INTERFACES
// -------------------------------------------------------------- //
enum OnScroll {
    NoChange = "No change",
    SpeedUp = "Speed up",
}
enum Direction {
    Normal = "normal",
    Reverse = "reverse",
}
enum Path {
    Preset = "preset",
    Custom = "custom",
}
enum Preset {
    Spiral = "spiral",
    Loop = "loop",
    Wave = "wave",
    Curly = "curly",
    Stripes = "stripes",
}

interface TickerPathProps {
    content: React.ReactNode[]
    repeat: number
    scale: {
        scale: number
        hover: number
    }
    path: Path
    preset: Preset
    svg: string
    fade: boolean
    direction: Direction
    speed: {
        speed: number
        hover: number
        onScroll: OnScroll
    }
    drag: {
        draggable: boolean
        dragSensitivity: number
        grabCursor: boolean
    }
}

// -------------------------------------------------------------- //
// CONSTANTS
// -------------------------------------------------------------- //
const fuSvg = `
<svg
  width="550"
  height="550"
  viewBox="0 0 550 550"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <g clip-path="url(#clip0_967_124)">
    <path
      d="M553.75 2.5 L553.75 267.5 A10 10 0 0 1 546.971 274.314 L281.971 539.814 A10 10 0 0 1 275.157 542.593 L10 543 A10 10 0 0 1 0 533 L1.25 285 A10 10 0 0 1 4.036 277.5 L131.616 146.616 A10 10 0 0 1 141.616 146.616 L141.25 405 A10 10 0 0 1 131.25 415 L405 413.75 A10 10 0 0 1 413.75 403.75 L413.75 150 A10 10 0 0 1 416.536 142.5 L541.615 11.61612 A10 10 0 0 1 553.75 2.5"
      fill="white"
    />
  </g>
  <defs>
    <clipPath id="clip0_967_124">
      <rect width="24" height="24" fill="white" />
    </clipPath>
  </defs>
</svg>
`

const imgs = [
    <img
        src="https://cdn.cosmos.so/b9909337-7a53-48bc-9672-33fbd0f040a1?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/ecdc9dd7-2862-4c28-abb1-dcc0947390f3?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/79de41ec-baa4-4ac0-a9a4-c090005ca640?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/1a18b312-21cd-4484-bce5-9fb7ed1c5e01?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/d765f64f-7a66-462f-8b2d-3d7bc8d7db55?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/6b9f08ea-f0c5-471f-a620-71221ff1fb65?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/40a09525-4b00-4666-86f0-3c45f5d77605?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/14f05ab6-b4d0-4605-9007-8a2190a249d0?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/d05009a2-a2f8-4a4c-a0de-e1b0379dddb8?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/ba646e35-efc2-494a-961b-b40f597e6fc9?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/e899f9c3-ed48-4899-8c16-fbd5a60705da?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/24e83c11-c607-45cd-88fb-5059960b56a0?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
    <img
        src="https://cdn.cosmos.so/cd346bce-f415-4ea7-8060-99c5f7c1741a?format=jpeg"
        style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
        }}
    />,
]

// -------------------------------------------------------------- //
// FRAMER PROPERTY CONTROLS
// -------------------------------------------------------------- //

addPropertyControls(TickerPath, {
    content: {
        type: ControlType.Array,
        title: "Content",
        defaultValue: [],
        control: {
            type: ControlType.ComponentInstance,
        },
    },
    repeat: {
        type: ControlType.Number,
        title: "Amount",
        defaultValue: 2,
        min: 1,
        max: 100,
        step: 1,
        displayStepper: true,
    },
    scale: {
        type: ControlType.Object,
        controls: {
            scale: {
                type: ControlType.Number,
                title: "Scale",
                defaultValue: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                unit: "x",
            },
            hover: {
                type: ControlType.Number,
                title: "Hover",
                defaultValue: 1.5,
                min: 0.1,
                max: 5,
                step: 0.1,
                unit: "x",
            },
        },
    },
    path: {
        type: ControlType.Enum,
        title: "Path",
        defaultValue: Path.Preset,
        options: [Path.Preset, Path.Custom],
        optionTitles: ["Preset", "Custom"],
        displaySegmentedControl: true,
    },
    preset: {
        type: ControlType.Enum,
        title: " ",
        defaultValue: Preset.Spiral,
        options: [
            Preset.Spiral,
            Preset.Loop,
            Preset.Wave,
            Preset.Curly,
            Preset.Stripes,
        ],
        optionTitles: ["Spiral", "Loop", "Wave", "Curly", "Stripes"],
        // displaySegmentedControl: true,
        hidden: (props) => props.path !== Path.Preset,
    },
    svg: {
        title: " ",
        type: ControlType.String,
        defaultValue: fuSvg,
        description: "Must be an SVG with a path element",
        hidden: (props) => props.path !== Path.Custom,
    },
    fade: {
        type: ControlType.Boolean,
        title: "Fade",
        defaultValue: true,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        defaultValue: Direction.Normal,
        options: [Direction.Normal, Direction.Reverse],
        optionIcons: ["direction-left", "direction-right"],
        displaySegmentedControl: true,
    },
    speed: {
        title: "Speed",
        type: ControlType.Object,
        controls: {
            speed: {
                title: "Speed",
                type: ControlType.Number,
                defaultValue: 5,
                min: 0,
                max: 10,
                step: 0.1,
            },
            hover: {
                title: "Hover",
                type: ControlType.Number,
                defaultValue: 0.3,
                min: 0,
                max: 1,
                step: 0.1,
                unit: "x",
            },
            onScroll: {
                title: "On Scroll",
                type: ControlType.Enum,
                options: [OnScroll.NoChange, OnScroll.SpeedUp],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
        },
    },

    drag: {
        type: ControlType.Object,
        controls: {
            draggable: {
                type: ControlType.Boolean,
                title: "Draggable",
                defaultValue: false,
            },
            dragSensitivity: {
                type: ControlType.Number,
                title: "Sensitivity",
                defaultValue: 5,
                min: 1,
                max: 10,
                step: 0.5,
                hidden: (props) => !props.draggable,
            },
            grabCursor: {
                type: ControlType.Boolean,
                title: "Grab Cursor",
                defaultValue: false,
                hidden: (props) => !props.draggable,
            },
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// -------------------------------------------------------------- //
// DEFAULT PROPS
// -------------------------------------------------------------- //

TickerPath.defaultProps = {
    content: imgs,
    repeat: 2,
    scale: {
        scale: 1,
        hover: 1.5,
    },
    path: Path.Preset,
    preset: Preset.Spiral,
    svg: fuSvg,
    speed: {
        speed: 5,
        hover: 0.5,
        onScroll: OnScroll.NoChange,
    },
    fade: true,
    direction: "normal",
    drag: {
        draggable: false,
        dragSensitivity: 0.2,
        grabCursor: false,
    },
}

// -------------------------------------------------------------- //
// MAIN COMPONENT
// -------------------------------------------------------------- //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function TickerPath(props: TickerPathProps) {
    const childrenToRender = props.content.length > 0 ? props.content : imgs
    const slowdownOnHover = props.speed.hover < 1
    const slowDownFactor = props.speed.hover
    const containerRef = useRef<HTMLDivElement>(null)
    const transformedSensitivity = useTransform(
        useMotionValue(props.drag.dragSensitivity),
        [1, 10],
        [0.005, 0.1]
    )

    const presetSvgLookup = {
        [Preset.Spiral]: spiralSvg,
        [Preset.Loop]: loopSvg,
        [Preset.Wave]: waveSvg,
        [Preset.Curly]: curlySvg,
        [Preset.Stripes]: stripesSvg,
    }
    const svgToRender =
        props.path === Path.Preset ? presetSvgLookup[props.preset] : props.svg

    // Make all images within container non-draggable
    useEffect(() => {
        const container = document.getElementById("ticker-path-container")
        if (container) {
            const images = container.getElementsByTagName("img")
            Array.from(images).forEach((img) => {
                img.draggable = false
            })
        }
    }, [props.content]) // Re-run when content changes

    // Process children directly without transformation
    const processedChildren = React.useMemo(
        () => childrenToRender,
        [childrenToRender]
    )

    // State to store the extracted path
    const [extractedPath, setExtractedPath] = React.useState<string>("")

    // Function to update path based on container size
    const updatePath = React.useCallback(() => {
        if (svgToRender && containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth
            const containerHeight = containerRef.current.offsetHeight

            extractPathsFromSvgString(
                svgToRender,
                containerWidth,
                containerHeight
            )
                .then((path) => {
                    if (path) {
                        setExtractedPath(path)
                    }
                })
                .catch((error) => {
                    console.error("Failed to extract paths from SVG:", error)
                })
        }
    }, [props.path, props.preset, props.svg])

    // Effect to handle SVG URL changes and container resizing
    React.useEffect(() => {
        updatePath()

        // Set up ResizeObserver to watch for container size changes
        const resizeObserver = new ResizeObserver(() => {
            updatePath()
        })

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Cleanup observer on unmount
        return () => {
            resizeObserver.disconnect()
        }
    }, [updatePath, props.content])

    if (props.content.length === 0) {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <ComponentMessage
                    title="Ticker Path"
                    subtitle="Set up the component by connecting frames to the component or selecting the content from the component properties."
                />
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
            id="ticker-path-container"
        >
            <MarqueeAlongSvgPath
                path={extractedPath}
                baseVelocity={props.speed.speed}
                direction={props.direction}
                slowdownOnHover={slowdownOnHover}
                slowDownFactor={slowDownFactor}
                useScrollVelocity={props.speed.onScroll === OnScroll.SpeedUp}
                repeat={props.repeat}
                draggable={props.drag.draggable}
                dragSensitivity={transformedSensitivity.get()}
                grabCursor={props.drag.grabCursor}
                fade={props.fade}
            >
                {React.Children.map(processedChildren, (child, i) => (
                    <motion.div
                        key={i}
                        style={{
                            height: "100%",
                            width: "56px",
                            userSelect: "none",
                            scale: props.scale.scale,
                        }}
                        whileHover={{
                            scale: props.scale.scale * props.scale.hover,
                            transition: {
                                duration: 0.3,
                                ease: "easeInOut",
                            },
                        }}
                    >
                        {child}
                    </motion.div>
                ))}
            </MarqueeAlongSvgPath>
        </div>
    )
}

// -------------------------------------------------------------- //
// SUBCOMPONENT
// -------------------------------------------------------------- //

// Custom wrap function
const wrap = (min: number, max: number, value: number): number => {
    const range = max - min
    return ((((value - min) % range) + range) % range) + min
}

type PreserveAspectRatioAlign =
    | "none"
    | "xMinYMin"
    | "xMidYMin"
    | "xMaxYMin"
    | "xMinYMid"
    | "xMidYMid"
    | "xMaxYMid"
    | "xMinYMax"
    | "xMidYMax"
    | "xMaxYMax"

interface CSSVariableInterpolation {
    property: string
    from: number | string
    to: number | string
}

type PreserveAspectRatioMeetOrSlice = "meet" | "slice"

type PreserveAspectRatio =
    | PreserveAspectRatioAlign
    | `${Exclude<
          PreserveAspectRatioAlign,
          "none"
      >} ${PreserveAspectRatioMeetOrSlice}`

interface MarqueeAlongSvgPathProps {
    children: React.ReactNode
    style?: React.CSSProperties

    // Path properties
    path: string
    pathId?: string
    preserveAspectRatio?: PreserveAspectRatio
    showPath?: boolean

    // SVG properties
    width?: string | number
    height?: string | number
    viewBox?: string

    // Marquee properties
    baseVelocity?: number
    direction?: "normal" | "reverse"
    easing?: (value: number) => number
    slowdownOnHover?: boolean
    slowDownFactor?: number
    slowDownSpringConfig?: SpringOptions

    // Scroll properties
    useScrollVelocity?: boolean
    scrollAwareDirection?: boolean
    scrollSpringConfig?: SpringOptions

    // Item repetition
    repeat?: number

    // Drag properties
    draggable?: boolean
    dragSensitivity?: number
    dragVelocityDecay?: number
    dragAwareDirection?: boolean
    grabCursor?: boolean

    // Z-index properties
    enableRollingZIndex?: boolean
    zIndexBase?: number
    zIndexRange?: number

    cssVariableInterpolation?: CSSVariableInterpolation[]
    fade?: boolean
}

const MarqueeAlongSvgPath = ({
    children,
    style,
    // Path defaults
    path,
    // pathId,
    // preserveAspectRatio = "xMidYMid meet",
    // showPath = false,

    // // SVG defaults
    // width = "100%",
    // height = "100%",
    // viewBox = "0 0 100 100",

    // Marquee defaults
    baseVelocity = 5,
    direction = "normal",
    easing,
    slowdownOnHover = false,
    slowDownFactor = 0.3,
    slowDownSpringConfig = { damping: 50, stiffness: 400 },

    // Scroll defaults
    useScrollVelocity = false,
    scrollAwareDirection = true,
    scrollSpringConfig = { damping: 50, stiffness: 400 },

    // Items repetition
    repeat = 3,

    // Drag defaults
    draggable = false,
    dragSensitivity = 0.2,
    dragVelocityDecay = 0.7,
    dragAwareDirection = false,
    grabCursor = false,

    // Z-index defaults
    enableRollingZIndex = true,
    zIndexBase = 1, // Base z-index value
    zIndexRange = 10, // Range of z-index values to use

    cssVariableInterpolation = [],
    fade = true,
}: MarqueeAlongSvgPathProps) => {
    const container = useRef<HTMLDivElement>(null)
    const baseOffset = useMotionValue(0)

    // Create an array of items outside of the render function
    const items = React.useMemo(() => {
        const childrenArray = React.Children.toArray(children)

        return childrenArray.flatMap((child, childIndex) =>
            Array.from({ length: repeat }, (_, repeatIndex) => {
                const itemIndex =
                    repeatIndex * childrenArray.length + childIndex
                const key = `${childIndex}-${repeatIndex}`
                return {
                    child,
                    childIndex,
                    repeatIndex,
                    itemIndex,
                    key,
                }
            })
        )
    }, [children, repeat])

    // Function to calculate z-index based on offset distance
    const calculateZIndex = useCallback(
        (offsetDistance: number) => {
            if (!enableRollingZIndex) {
                return undefined
            }

            // Simple progress-based z-index
            const normalizedDistance = offsetDistance / 100
            return Math.floor(zIndexBase + normalizedDistance * zIndexRange)
        },
        [enableRollingZIndex, zIndexBase, zIndexRange]
    )

    // Scroll tracking
    const { scrollY } = useScroll({
        container: container.current as unknown as RefObject<HTMLDivElement>,
    })

    const scrollVelocity = useVelocity(scrollY)
    const smoothVelocity = useSpring(scrollVelocity, scrollSpringConfig)

    // Hover and drag state tracking
    const isHovered = useRef(false)
    const isDragging = useRef(false)
    const dragVelocity = useRef(0)

    // Direction factor for changing direction based on scroll or drag
    const directionFactor = useRef(direction === "normal" ? 1 : -1)

    // Motion values for animation
    const hoverFactorValue = useMotionValue(1)
    const defaultVelocity = useMotionValue(1)
    const smoothHoverFactor = useSpring(hoverFactorValue, slowDownSpringConfig)

    // Transform scroll velocity into a factor that affects marquee speed
    const velocityFactor = useTransform(
        useScrollVelocity ? smoothVelocity : defaultVelocity,
        [0, 1000],
        [0, 5],
        { clamp: false }
    )

    // Animation frame handler
    useAnimationFrame((_, delta) => {
        if (isDragging.current && draggable) {
            baseOffset.set(baseOffset.get() + dragVelocity.current)

            // Add decay to dragVelocity
            dragVelocity.current *= 0.9

            // Stop completely if velocity is very small
            if (Math.abs(dragVelocity.current) < 0.01) {
                dragVelocity.current = 0
            }

            return
        }

        // Update hover factor
        if (isHovered.current) {
            hoverFactorValue.set(slowdownOnHover ? slowDownFactor : 1)
        } else {
            hoverFactorValue.set(1)
        }

        // Calculate regular movement
        let moveBy =
            directionFactor.current *
            baseVelocity *
            (delta / 1000) *
            smoothHoverFactor.get()

        // Adjust movement based on scroll velocity if scrollAwareDirection is enabled
        if (scrollAwareDirection && !isDragging.current) {
            if (velocityFactor.get() < 0) {
                directionFactor.current = -1
            } else if (velocityFactor.get() > 0) {
                directionFactor.current = 1
            }
        }

        moveBy += directionFactor.current * moveBy * velocityFactor.get()

        if (draggable) {
            moveBy += dragVelocity.current

            // Update direction based on drag direction if dragAwareDirection is true
            if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
                directionFactor.current = Math.sign(dragVelocity.current)
            }

            // Gradually decay drag velocity back to zero
            if (!isDragging.current && Math.abs(dragVelocity.current) > 0.01) {
                dragVelocity.current *= dragVelocityDecay
            } else if (!isDragging.current) {
                dragVelocity.current = 0
            }
        }

        baseOffset.set(baseOffset.get() + moveBy)
    })

    // Pointer event handlers for dragging
    const lastPointerPosition = useRef({ x: 0, y: 0 })

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!draggable) return
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

        if (grabCursor) {
            ;(e.currentTarget as HTMLElement).style.cursor = "grabbing"
        }

        isDragging.current = true
        lastPointerPosition.current = { x: e.clientX, y: e.clientY }

        // Add global pointer event listeners
        window.addEventListener("pointerup", handleGlobalPointerUp)
        window.addEventListener("pointercancel", handleGlobalPointerUp)
        window.addEventListener("blur", handleGlobalPointerUp)

        // Pause automatic animation by setting velocity to 0
        dragVelocity.current = 0
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggable || !isDragging.current) return

        const currentPosition = { x: e.clientX, y: e.clientY }

        // Calculate movement delta - simplified for path movement
        const deltaX = currentPosition.x - lastPointerPosition.current.x
        const deltaY = currentPosition.y - lastPointerPosition.current.y

        // For path following, we use a simple magnitude of movement
        const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const projectedDelta = deltaX > 0 ? delta : -delta

        // Update drag velocity based on the projected movement
        dragVelocity.current = projectedDelta * dragSensitivity

        // Update last position
        lastPointerPosition.current = currentPosition
    }

    const handleGlobalPointerUp = useCallback(
        (e?: Event) => {
            if (!isDragging.current) return

            isDragging.current = false
            dragVelocity.current = 0

            // Remove global event listeners
            window.removeEventListener("pointerup", handleGlobalPointerUp)
            window.removeEventListener("pointercancel", handleGlobalPointerUp)
            window.removeEventListener("blur", handleGlobalPointerUp)

            // Update cursor if needed
            if (grabCursor && container.current) {
                container.current.style.cursor = "grab"
            }
        },
        [grabCursor]
    )

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!draggable) return
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        handleGlobalPointerUp()
    }

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener("pointerup", handleGlobalPointerUp)
            window.removeEventListener("pointercancel", handleGlobalPointerUp)
            window.removeEventListener("blur", handleGlobalPointerUp)
        }
    }, [handleGlobalPointerUp])

    // Handlers for individual item hover state, now passed down
    const handleItemMouseEnter = useCallback(() => {
        isHovered.current = true
    }, [])

    const handleItemMouseLeave = useCallback(() => {
        isHovered.current = false
    }, [])

    return (
        <div
            ref={container}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
                position: "relative",
                ...style,
            }}
        >
            {items.map(({ child, repeatIndex, itemIndex, key }) => (
                <MarqueeItem
                    key={key} // Use the original key for React's reconciliation
                    itemKey={key} // Pass the key explicitly if needed inside MarqueeItem (though usually not needed)
                    child={child}
                    itemIndex={itemIndex}
                    totalItems={items.length}
                    repeatIndex={repeatIndex}
                    baseOffset={baseOffset}
                    path={path}
                    easing={easing}
                    enableRollingZIndex={enableRollingZIndex}
                    calculateZIndex={calculateZIndex}
                    draggable={draggable}
                    grabCursor={grabCursor}
                    cssVariableInterpolation={cssVariableInterpolation}
                    onMouseEnter={handleItemMouseEnter}
                    onMouseLeave={handleItemMouseLeave}
                    fade={fade}
                />
            ))}
        </div>
    )
}

interface MarqueeItemProps {
    child: React.ReactNode
    itemIndex: number
    totalItems: number
    repeatIndex: number
    baseOffset: MotionValue<number>
    path: string
    easing?: (value: number) => number
    enableRollingZIndex: boolean
    calculateZIndex: (offsetDistance: number) => number | undefined
    draggable: boolean
    grabCursor: boolean
    cssVariableInterpolation: CSSVariableInterpolation[]
    itemKey: string
    onMouseEnter: () => void
    onMouseLeave: () => void
    fade: boolean
}

const MarqueeItem: React.FC<MarqueeItemProps> = ({
    child,
    itemIndex,
    totalItems,
    repeatIndex,
    baseOffset,
    path,
    easing,
    enableRollingZIndex,
    calculateZIndex,
    draggable,
    grabCursor,
    cssVariableInterpolation,
    itemKey,
    onMouseEnter,
    onMouseLeave,
    fade,
}) => {
    // Create a unique offset transform for this item
    const itemOffset = useTransform(baseOffset, (v) => {
        const position = (itemIndex * 100) / totalItems
        const wrappedValue = wrap(0, 100, v + position)
        return `${easing ? easing(wrappedValue / 100) * 100 : wrappedValue}%`
    })

    // Create a motion value for the current offset distance
    const currentOffsetDistance = useMotionValue(0)

    // Create opacity transform based on offset distance
    const opacity = useTransform(
        currentOffsetDistance,
        [0, 10, 90, 100], // Input range (percentage along path)
        [0, 1, 1, 0] // Output range (opacity values)
    )

    const isOnFramerCanvas = RenderTarget.hasRestrictions()
    const finalOpacity = fade ? opacity : 1

    // Update z-index when offset distance changes
    const zIndex = useTransform(currentOffsetDistance, (value) =>
        calculateZIndex(value)
    )

    // Update current offset distance value when animation runs
    useEffect(() => {
        const unsubscribe = itemOffset.on("change", (value: string) => {
            const match = value.match(/^([\d.]+)%$/)
            if (match && match[1]) {
                currentOffsetDistance.set(parseFloat(match[1]))
            }
        })
        return unsubscribe
    }, [itemOffset, currentOffsetDistance])

    // Calculate CSS variables based on the offset distance
    const cssVariables = Object.fromEntries(
        (cssVariableInterpolation || []).map(({ property, from, to }) => [
            property,
            useTransform(currentOffsetDistance, [0, 100], [from, to]),
        ])
    )

    return (
        <motion.div
            key={itemKey}
            style={{
                offsetPath: `path('${path}')`,
                offsetDistance: itemOffset,
                opacity: isOnFramerCanvas ? 1 : finalOpacity,
                zIndex: enableRollingZIndex ? zIndex : undefined,
                position: "absolute",
                top: "0",
                left: "0",
                cursor: draggable && grabCursor ? "grab" : "default",
                ...(cssVariables as React.CSSProperties),
            }}
            aria-hidden={repeatIndex > 0}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {child}
        </motion.div>
    )
}

// -------------------------------------------------------------- //
// UTILITY FUNCTIONS
// -------------------------------------------------------------- //

// New function to scale AND translate SVG path data
const scaleAndTranslateSvgPath = (
    pathString: string,
    scale: number,
    offsetX: number,
    offsetY: number
): string => {
    if (!pathString || scale <= 0) return "" // Added scale check

    const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
    let currentX = 0
    let currentY = 0
    let startX = 0 // Keep track of subpath start for Z
    let startY = 0

    const transformedPath = pathString.replace(
        commandRegex,
        (_match, command, params) => {
            const numbers = params
                .trim()
                .split(/[\s,]+/)
                .filter((n: string) => n !== "")
                .map(Number) // Added type :string
            // Handle Z command specifically as it has no parameters
            if (command.toUpperCase() === "Z") {
                // Move current point back to subpath start for internal tracking
                currentX = startX
                currentY = startY
                return command // Return 'Z' or 'z' as is
            }

            // If no numbers and not Z, it's likely an error or empty command, return original
            if (numbers.length === 0) return command

            const transformedParams: number[] = []

            const transformX = (x: number) => x * scale + offsetX
            const transformY = (y: number) => y * scale + offsetY
            const scaleValue = (val: number) => val * scale // Scale delta or radius

            // Helper to update current point based on original coordinates
            const updateCurrentPoint = (
                x: number,
                y: number,
                isRelative: boolean
            ) => {
                if (isRelative) {
                    currentX += x
                    currentY += y
                } else {
                    currentX = x
                    currentY = y
                }
            }

            switch (command) {
                // Absolute commands
                case "M":
                    transformedParams.push(
                        transformX(numbers[0]),
                        transformY(numbers[1])
                    )
                    updateCurrentPoint(numbers[0], numbers[1], false)
                    startX = currentX
                    startY = currentY // New subpath start
                    for (let i = 2; i < numbers.length; i += 2) {
                        // Implicit LineTos
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], false)
                    }
                    break
                case "L":
                    for (let i = 0; i < numbers.length; i += 2) {
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], false)
                    }
                    break
                case "H":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(transformX(numbers[i]))
                        updateCurrentPoint(numbers[i], currentY, false) // Y stays the same
                    }
                    break
                case "V":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(transformY(numbers[i]))
                        updateCurrentPoint(currentX, numbers[i], false) // X stays the same
                    }
                    break
                case "C":
                    for (let i = 0; i < numbers.length; i += 6) {
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1]),
                            transformX(numbers[i + 2]),
                            transformY(numbers[i + 3]),
                            transformX(numbers[i + 4]),
                            transformY(numbers[i + 5])
                        )
                        updateCurrentPoint(
                            numbers[i + 4],
                            numbers[i + 5],
                            false
                        )
                    }
                    break
                case "S":
                    for (let i = 0; i < numbers.length; i += 4) {
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1]),
                            transformX(numbers[i + 2]),
                            transformY(numbers[i + 3])
                        )
                        updateCurrentPoint(
                            numbers[i + 2],
                            numbers[i + 3],
                            false
                        )
                    }
                    break
                case "Q":
                    for (let i = 0; i < numbers.length; i += 4) {
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1]),
                            transformX(numbers[i + 2]),
                            transformY(numbers[i + 3])
                        )
                        updateCurrentPoint(
                            numbers[i + 2],
                            numbers[i + 3],
                            false
                        )
                    }
                    break
                case "T":
                    for (let i = 0; i < numbers.length; i += 2) {
                        transformedParams.push(
                            transformX(numbers[i]),
                            transformY(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], false)
                    }
                    break
                case "A":
                    for (let i = 0; i < numbers.length; i += 7) {
                        // Scale radii rx, ry
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            numbers[i + 2],
                            numbers[i + 3],
                            numbers[i + 4], // angle, flags
                            transformX(numbers[i + 5]),
                            transformY(numbers[i + 6])
                        ) // x, y
                        updateCurrentPoint(
                            numbers[i + 5],
                            numbers[i + 6],
                            false
                        )
                    }
                    break

                // Relative commands
                case "m":
                    transformedParams.push(
                        scaleValue(numbers[0]),
                        scaleValue(numbers[1])
                    )
                    updateCurrentPoint(numbers[0], numbers[1], true)
                    startX = currentX
                    startY = currentY // New subpath start based on relative move
                    for (let i = 2; i < numbers.length; i += 2) {
                        // Implicit linetos
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], true)
                    }
                    break
                case "l":
                    for (let i = 0; i < numbers.length; i += 2) {
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], true)
                    }
                    break
                case "h":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(scaleValue(numbers[i]))
                        updateCurrentPoint(numbers[i], 0, true) // dy = 0
                    }
                    break
                case "v":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(scaleValue(numbers[i]))
                        updateCurrentPoint(0, numbers[i], true) // dx = 0
                    }
                    break
                case "c":
                    for (let i = 0; i < numbers.length; i += 6) {
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            scaleValue(numbers[i + 2]),
                            scaleValue(numbers[i + 3]),
                            scaleValue(numbers[i + 4]),
                            scaleValue(numbers[i + 5])
                        )
                        updateCurrentPoint(numbers[i + 4], numbers[i + 5], true)
                    }
                    break
                case "s":
                    for (let i = 0; i < numbers.length; i += 4) {
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            scaleValue(numbers[i + 2]),
                            scaleValue(numbers[i + 3])
                        )
                        updateCurrentPoint(numbers[i + 2], numbers[i + 3], true)
                    }
                    break
                case "q":
                    for (let i = 0; i < numbers.length; i += 4) {
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            scaleValue(numbers[i + 2]),
                            scaleValue(numbers[i + 3])
                        )
                        updateCurrentPoint(numbers[i + 2], numbers[i + 3], true)
                    }
                    break
                case "t":
                    for (let i = 0; i < numbers.length; i += 2) {
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1])
                        )
                        updateCurrentPoint(numbers[i], numbers[i + 1], true)
                    }
                    break
                case "a":
                    for (let i = 0; i < numbers.length; i += 7) {
                        // Scale radii and final dx/dy
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            numbers[i + 2],
                            numbers[i + 3],
                            numbers[i + 4], // angle, flags
                            scaleValue(numbers[i + 5]),
                            scaleValue(numbers[i + 6])
                        ) // dx, dy
                        updateCurrentPoint(numbers[i + 5], numbers[i + 6], true)
                    }
                    break
                // Z/z handled above
            }

            // Join parameters for the current command
            // Use space as separator, handle potential extra spaces if params is empty (though unlikely now)
            return (
                command +
                (transformedParams.length > 0
                    ? " " + transformedParams.join(" ")
                    : "")
            )
        }
    )
    return transformedPath
}

const extractPathsFromSvgString = async (
    svgString: string,
    containerWidth: number,
    containerHeight: number
): Promise<string> => {
    try {
        if (!svgString) {
            console.warn("SVG string is empty.")
            return ""
        }
        if (containerWidth <= 0 || containerHeight <= 0) {
            console.warn("Container dimensions are invalid.")
            return "" // Cannot scale to zero or negative size
        }

        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgString, "image/svg+xml")

        const parserError = svgDoc.querySelector("parsererror")
        if (parserError) {
            console.error("SVG parsing error:", parserError)
            throw new Error("Invalid SVG format")
        }

        const pathElements = svgDoc.querySelectorAll("path")

        const paths = Array.from(pathElements)
            .map((path) => path.getAttribute("d"))
            .filter((d): d is string => d !== null)

        if (paths.length === 0) {
            throw new Error("No paths found in SVG")
        }

        // Get SVG dimensions
        const svgElement = svgDoc.querySelector("svg")
        const viewBox = svgElement
            ?.getAttribute("viewBox")
            ?.split(" ")
            .map(Number)
        const svgWidth = parseFloat(svgElement?.getAttribute("width") || "100")
        const svgHeight = parseFloat(
            svgElement?.getAttribute("height") || "100"
        )

        // Get original dimensions based on viewBox (preferred) or width/height
        let originalWidth: number
        let originalHeight: number
        let viewBoxMinX = 0
        let viewBoxMinY = 0

        if (viewBox && viewBox.length === 4) {
            viewBoxMinX = viewBox[0]
            viewBoxMinY = viewBox[1]
            originalWidth = viewBox[2]
            originalHeight = viewBox[3]
        } else {
            // Fallback to width/height, assuming viewBox starts at 0,0 if not specified
            originalWidth = svgWidth
            originalHeight = svgHeight
        }

        if (originalWidth <= 0 || originalHeight <= 0) {
            console.error(
                "Invalid original SVG dimensions (width/height or viewBox width/height must be positive)."
            )
            throw new Error("Invalid SVG dimensions")
        }

        // Calculate scaling factors to fit container while maintaining aspect ratio ('meet')
        const scaleX = containerWidth / originalWidth
        const scaleY = containerHeight / originalHeight
        const scale = Math.min(scaleX, scaleY) // Use the smaller scale factor to fit

        // Calculate the dimensions of the scaled SVG content
        const scaledWidth = originalWidth * scale
        const scaledHeight = originalHeight * scale

        // Calculate the translation offset needed to center the scaled content ('xMidYMid')
        // We also need to account for the viewBox minX/minY offset
        const offsetX = (containerWidth - scaledWidth) / 2 - viewBoxMinX * scale
        const offsetY =
            (containerHeight - scaledHeight) / 2 - viewBoxMinY * scale

        // Scale, translate, and join all paths
        const transformedPaths = paths.map((path) =>
            scaleAndTranslateSvgPath(path, scale, offsetX, offsetY)
        )
        const finalPath = transformedPaths.join(" ")

        return finalPath
    } catch (error) {
        console.error("Error extracting paths from SVG:", error)
        return ""
    }
}

// -------------------------------------------------------------- //
// SVG PRESETS
// -------------------------------------------------------------- //
const spiralSvg = `
<svg width="554" height="504" viewBox="0 0 554 504" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M552.252 227.051C548.029 306.06 512.971 378.902 455.545 430.344C400.585 479.577 327.738 506.39 252.252 502.051C181.842 498.004 114.56 466.734 66.6361 412.667C22.0061 362.315 -2.09651 295.787 2.25209 227.051C6.32059 162.744 35.3062 101.999 84.3141 59.1129C130.089 19.0564 190.301 -2.3067 252.252 2.0509C309.676 6.09001 364.17 32.2761 402.512 76.7909C437.912 117.89 456.63 171.763 452.252 227.051C448.208 278.129 424.467 326.176 384.835 359.634C348.269 390.502 300.695 406.437 252.252 402.051C207.796 398.026 166.087 376.909 137.347 341.956C111.016 309.933 97.8551 268.651 102.252 227.051C106.263 189.106 124.83 153.774 155.025 129.824C182.472 108.054 217.447 97.6339 252.252 102.051C283.787 106.053 312.708 122.137 331.802 147.501C349.184 170.594 356.655 199.315 352.252 227.051C348.202 252.565 334.364 274.9 314.124 288.923C295.634 301.733 273.22 306.492 252.252 302.051C233.275 298.032 217.287 286.766 208.058 271.245C199.787 257.335 197.75 241.215 202.252 227.051C206.273 214.401 215.087 204.843 225.735 200.534C235.225 196.695 245.107 197.508 252.252 202.051C258.669 206.132 261.767 212.558 261.091 218.212" stroke="white" stroke-width="1"/>
</svg>
`

const loopSvg = `
<svg width="871" height="295" viewBox="0 0 871 295" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.08594 231.344C352.809 387.946 512.017 209.267 529.76 135.148C543.975 75.7694 504.152 0.618567 446.536 0.61853C388.986 0.618494 339.625 59.6711 355.081 135.148C372.658 220.984 539.76 378.328 869.94 231.344" stroke="white"/>
</svg>
`

const waveSvg = `
<svg width="1255" height="233" viewBox="0 0 1255 233" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.20703 116.533C105.589 -36.9698 209.971 -36.9698 314.353 116.533C418.736 270.036 523.118 270.036 627.5 116.533C731.882 -36.9698 836.264 -36.9698 940.646 116.533C1045.03 270.036 1149.41 270.036 1253.79 116.533" stroke="white"/>
</svg>
`

const curlySvg = `
<svg width="864" height="839" viewBox="0 0 864 839" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.23828 418.527C862.941 -138.096 -429.613 -138.096 432.09 418.527C1293.79 975.151 1.23828 979.368 862.941 418.527" stroke="white"/>
</svg>
`

const stripesSvg = `
<svg width="1823" height="756" viewBox="0 0 1823 756" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M755.676 0.524414L1.20703 754.994M534.32 754.994L1288.79 0.524414M1821.9 0.52448L1067.43 754.994" stroke="white"/>
</svg>
`

TickerPath.displayName = "Ticker Path"
