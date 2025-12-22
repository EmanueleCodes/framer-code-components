import { ControlType, addPropertyControls, RenderTarget } from "framer"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import React, { useCallback, useEffect, useRef } from "react"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// import { ComponentMessage } from "../../utils/ComponentMessage"

// ------------------------------------------------------------ //
// INTERFACES
// ------------------------------------------------------------ //
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

interface AnimateAlongPathProps {
    content: React.ReactNode[]
    scale: number
    path: Path
    preset: Preset
    svg: string
    direction: "normal" | "reverse"
    showPath: boolean
    color: string
    animation: {
        loop: boolean
        loopType: "repeat" | "mirror"
        transition: any
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

const loopSvg = `<svg width="871" height="295" viewBox="0 0 871 295" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.08594 231.344C352.809 387.946 512.017 209.267 529.76 135.148C543.975 75.7694 504.152 0.618567 446.536 0.61853C388.986 0.618494 339.625 59.6711 355.081 135.148C372.658 220.984 539.76 378.328 869.94 231.344" stroke="white"/>
</svg>`

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

// ------------------------------------------------------------ //
// PROPERTY CONTROLS
// ------------------------------------------------------------ //
addPropertyControls(AnimateAlongPath, {
    content: {
        type: ControlType.ComponentInstance,
        title: "Content",
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
        unit: "x",
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
        hidden: (props) => props.path !== Path.Preset,
    },
    svg: {
        title: " ",
        type: ControlType.String,
        defaultValue: loopSvg,
        description: "Must be an SVG with a path element",
        hidden: (props) => props.path !== Path.Custom,
        displayTextArea: true,
    },
    showPath: {
        type: ControlType.Boolean,
        title: "Show Path",
        defaultValue: false,
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#999999",
        hidden: (props) => !props.showPath,
    },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        defaultValue: "normal",
        options: ["reverse", "normal"],
        optionTitles: ["Reverse", "Normal"],
        optionIcons: ["direction-left", "direction-right"],
        displaySegmentedControl: true,
    },
    animation: {
        type: ControlType.Object,
        title: "Animation",
        icon: "effect",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            loop: {
                type: ControlType.Boolean,
                title: "Loop",
                defaultValue: false,
                enabledTitle: "Yes",
                disabledTitle: "No",
            },
            loopType: {
                type: ControlType.Enum,
                title: "Type",
                options: ["repeat", "mirror"],
                optionTitles: ["Repeat", "Mirror"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                defaultValue: "mirror",
                hidden: (props) => !props.loop,
            },
            transition: {
                type: ControlType.Transition,
                title: "Transition",
                defaultValue: {
                    type: "tween",
                    ease: [0.44, 0, 0.56, 1],
                    duration: 2,
                    delay: 0,
                },
            },
        },
    },
})

// ------------------------------------------------------------ //
// DEFAULT PROPS
// ------------------------------------------------------------ //
AnimateAlongPath.defaultProps = {
    content: [],
    scale: 1,
    path: Path.Preset,
    preset: Preset.Spiral,
    svg: loopSvg,
    direction: "normal",
    showPath: true,
    color: "#999999",
    animation: {
        loop: true,
        loopType: "mirror",
        transition: {
            type: "tween",
            ease: [0.44, 0, 0.56, 1],
            duration: 3,
            delay: 0,
        },
    },
}

// ------------------------------------------------------------ //
// MAIN COMPONENT
// ------------------------------------------------------------ //
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 * @framerDisableUnlink
 */
export default function AnimateAlongPath(props: AnimateAlongPathProps) {
    const hasChildren =
        props.content.length > 0 && props.content[0] !== undefined
    const containerRef = useRef<HTMLDivElement>(null)
    const isOnFramerCanvas = RenderTarget.hasRestrictions()

    // Motion values for animation
    const baseOffset = useMotionValue(0)
    const pathOffset = useTransform(baseOffset, (v) => `${v}%`)

    // Get the appropriate SVG based on preset or custom
    const presetSvgLookup = {
        [Preset.Spiral]: spiralSvg,
        [Preset.Loop]: loopSvg,
        [Preset.Wave]: waveSvg,
        [Preset.Curly]: curlySvg,
        [Preset.Stripes]: stripesSvg,
    }
    const svgToRender =
        props.path === Path.Preset ? presetSvgLookup[props.preset] : props.svg

    // State to store the extracted path
    const [extractedPath, setExtractedPath] = React.useState<string>("")

    // Function to update path based on container size
    const updatePath = useCallback(() => {
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
    }, [props.path, props.preset, props.svg, props.content])

    // Animation effect - Separated from path updates
    useEffect(() => {
        // Only prevent animation on Framer Canvas, allow it in Preview
        if (isOnFramerCanvas) return

        const startAnimation = () => {
            // Set initial position based on direction
            baseOffset.set(props.direction === "reverse" ? 100 : 0)

            const transition = {
                ...props.animation.transition,
                repeat: props.animation.loop
                    ? props.animation.loopType === "mirror"
                        ? Infinity
                        : 0
                    : 0,
                repeatType:
                    props.animation.loopType === "mirror" ? "mirror" : "loop",
            }

            const from = props.direction === "reverse" ? 100 : 0
            const to = props.direction === "reverse" ? 0 : 100

            // Stop any existing animation
            baseOffset.stop()

            if (props.animation.loop) {
                if (props.animation.loopType === "mirror") {
                    animate(baseOffset, [from, to], {
                        ...transition,
                        repeat: Infinity,
                        repeatType: "mirror",
                    })
                } else if (props.animation.loopType === "repeat") {
                    animate(baseOffset, [from, to], {
                        ...transition,
                        repeat: Infinity,
                        repeatType: "loop",
                        onComplete: () => {
                            baseOffset.set(from)
                        },
                    })
                }
            } else {
                animate(baseOffset, to, transition)
            }
        }

        // Start animation immediately
        startAnimation()

        // Add window resize listener specifically for Framer Preview
        const handleResize = () => {
            if (RenderTarget.current() === RenderTarget.preview) {
                requestAnimationFrame(() => {
                    startAnimation()
                })
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            baseOffset.stop()
            window.removeEventListener("resize", handleResize)
        }
    }, [
        props.direction,
        props.animation.loop,
        props.animation.loopType,
        props.animation.transition,
        baseOffset,
    ])

    // Effect to handle SVG URL changes and container resizing
    useEffect(() => {
        updatePath()

        // Set up ResizeObserver with debounced update
        let resizeTimeout: NodeJS.Timeout
        const resizeObserver = new ResizeObserver(() => {
            // Debounce resize updates to prevent excessive recalculations
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
                updatePath()
                // For Framer Preview, ensure path is updated without stopping animation
                if (RenderTarget.current() === RenderTarget.preview) {
                    requestAnimationFrame(() => {
                        const currentOffset = baseOffset.get()
                        baseOffset.set(currentOffset)
                    })
                }
            }, 100) // 100ms debounce
        })

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Cleanup observer and timeout on unmount
        return () => {
            resizeObserver.disconnect()
            clearTimeout(resizeTimeout)
        }
    }, [updatePath])

    if (!hasChildren) {
        return (
            <ComponentMessage
                title="Animate Along Path"
                subtitle="Set up the component by connecting frame to the component or by adding content to the component properties."
            />
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
            }}
        >
            {props.showPath && extractedPath && (
                <svg
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        top: 0,
                        left: 0,
                        pointerEvents: "none",
                    }}
                >
                    <path
                        d={extractedPath}
                        stroke={props.color}
                        strokeWidth="1"
                        fill="none"
                    />
                </svg>
            )}
            <motion.div
                style={{
                    position: "absolute",
                    offsetPath: `path('${extractedPath}')`,
                    offsetDistance: pathOffset,
                    scale: props.scale,
                }}
            >
                {props.content}
            </motion.div>
        </div>
    )
}

// -------------------------------------------------------------- //
// UTILITY FUNCTIONS
// -------------------------------------------------------------- //

// Function to scale AND translate SVG path data
const scaleAndTranslateSvgPath = (
    pathString: string,
    scale: number,
    offsetX: number,
    offsetY: number
): string => {
    if (!pathString || scale <= 0) return ""

    const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0

    const transformedPath = pathString.replace(
        commandRegex,
        (_match, command, params) => {
            const numbers = params
                .trim()
                .split(/[\s,]+/)
                .filter((n: string) => n !== "")
                .map(Number)

            if (command.toUpperCase() === "Z") {
                currentX = startX
                currentY = startY
                return command
            }

            if (numbers.length === 0) return command

            const transformedParams: number[] = []

            const transformX = (x: number) => x * scale + offsetX
            const transformY = (y: number) => y * scale + offsetY
            const scaleValue = (val: number) => val * scale

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
                case "M":
                    transformedParams.push(
                        transformX(numbers[0]),
                        transformY(numbers[1])
                    )
                    updateCurrentPoint(numbers[0], numbers[1], false)
                    startX = currentX
                    startY = currentY
                    for (let i = 2; i < numbers.length; i += 2) {
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
                        updateCurrentPoint(numbers[i], currentY, false)
                    }
                    break
                case "V":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(transformY(numbers[i]))
                        updateCurrentPoint(currentX, numbers[i], false)
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
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            numbers[i + 2],
                            numbers[i + 3],
                            numbers[i + 4],
                            transformX(numbers[i + 5]),
                            transformY(numbers[i + 6])
                        )
                        updateCurrentPoint(
                            numbers[i + 5],
                            numbers[i + 6],
                            false
                        )
                    }
                    break
                case "m":
                    transformedParams.push(
                        scaleValue(numbers[0]),
                        scaleValue(numbers[1])
                    )
                    updateCurrentPoint(numbers[0], numbers[1], true)
                    startX = currentX
                    startY = currentY
                    for (let i = 2; i < numbers.length; i += 2) {
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
                        updateCurrentPoint(numbers[i], 0, true)
                    }
                    break
                case "v":
                    for (let i = 0; i < numbers.length; i++) {
                        transformedParams.push(scaleValue(numbers[i]))
                        updateCurrentPoint(0, numbers[i], true)
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
                        transformedParams.push(
                            scaleValue(numbers[i]),
                            scaleValue(numbers[i + 1]),
                            numbers[i + 2],
                            numbers[i + 3],
                            numbers[i + 4],
                            scaleValue(numbers[i + 5]),
                            scaleValue(numbers[i + 6])
                        )
                        updateCurrentPoint(numbers[i + 5], numbers[i + 6], true)
                    }
                    break
            }

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
            return ""
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

        const svgElement = svgDoc.querySelector("svg")
        const viewBox = svgElement
            ?.getAttribute("viewBox")
            ?.split(" ")
            .map(Number)
        const svgWidth = parseFloat(svgElement?.getAttribute("width") || "100")
        const svgHeight = parseFloat(
            svgElement?.getAttribute("height") || "100"
        )

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
            originalWidth = svgWidth
            originalHeight = svgHeight
        }

        if (originalWidth <= 0 || originalHeight <= 0) {
            console.error("Invalid original SVG dimensions.")
            throw new Error("Invalid SVG dimensions")
        }

        const scaleX = containerWidth / originalWidth
        const scaleY = containerHeight / originalHeight
        const scale = Math.min(scaleX, scaleY)

        const scaledWidth = originalWidth * scale
        const scaledHeight = originalHeight * scale

        const offsetX = (containerWidth - scaledWidth) / 2 - viewBoxMinX * scale
        const offsetY =
            (containerHeight - scaledHeight) / 2 - viewBoxMinY * scale

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

AnimateAlongPath.displayName = "Animate Along Path Dev"
