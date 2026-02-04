import React, {
    memo,
    useMemo,
    useRef,
    useState,
    useLayoutEffect,
    useCallback,
    useEffect,
} from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface BackgroundBoxesProps {
    backgroundColor?: string
    boxSize?: number
    borderWidth?: number
    borderColor?: string
    rotateX?: number
    rotateY?: number
    rotateZ?: number
    safetyMargin?: number
    inDuration?: number
    outDuration?: number
    colors?: string[]
    style?: React.CSSProperties
}

const DEFAULT_COLORS = [
    "rgb(125 211 252)", // sky-300
    "rgb(249 168 212)", // pink-300
    "rgb(134 239 172)", // green-300
    "rgb(253 224 71)", // yellow-300
    "rgb(252 165 165)", // red-300
    "rgb(216 180 254)", // purple-300
    "rgb(147 197 253)", // blue-300
    "rgb(165 180 252)", // indigo-300
    "rgb(196 181 253)", // violet-300
]

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function BackgroundBoxesWEBGL({
    backgroundColor,
    boxSize = 16,
    borderWidth,
    borderColor,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    safetyMargin = 1.2,
    colors: colorsProp = DEFAULT_COLORS,
    outDuration = 2,
    style,
}: BackgroundBoxesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const [rows, setRows] = useState(35)
    const [cols, setCols] = useState(35)
    
    // Track which boxes are currently colored with their colors and fade timers
    const coloredBoxesRef = useRef<Map<string, { color: string; fadeStartTime: number | null }>>(new Map())
    const [, forceUpdate] = useState({})
    const lastHoveredRef = useRef<string | null>(null)
    const rafIdRef = useRef<number | null>(null)

    // Use colors array directly, filtering out empty values
    const colors = useMemo(() => {
        if (!colorsProp || colorsProp.length === 0) {
            return DEFAULT_COLORS
        }

        const validColors = colorsProp
            .filter(
                (color): color is string =>
                    typeof color === "string" && color.trim().length > 0
            )
            .map((color) => color.trim())

        return validColors.length > 0 ? validColors : DEFAULT_COLORS
    }, [colorsProp])

    const getRandomColor = useCallback(() => {
        if (colors.length === 0) return DEFAULT_COLORS[0] || "rgb(125 211 252)"
        return colors[Math.floor(Math.random() * colors.length)]
    }, [colors])

    // Calculate grid dimensions based on container size and rotation
    const calculateGrid = useCallback(() => {
        const container = containerRef.current
        if (!container) return

        const w = container.clientWidth || container.offsetWidth || 1
        const h = container.clientHeight || container.offsetHeight || 1

        const radX = Math.abs(rotateX) * (Math.PI / 180)
        const radY = Math.abs(rotateY) * (Math.PI / 180)
        const radZ = Math.abs(rotateZ) * (Math.PI / 180)

        const diagonal = Math.sqrt(w * w + h * h)

        const cosZ = Math.abs(Math.cos(radZ))
        const sinZ = Math.abs(Math.sin(radZ))
        const zRotatedWidth = w * cosZ + h * sinZ
        const zRotatedHeight = w * sinZ + h * cosZ

        const cosX = Math.max(Math.abs(Math.cos(radX)), 0.2)
        const cosY = Math.max(Math.abs(Math.cos(radY)), 0.2)

        const compensateX = 1 / cosX
        const compensateY = 1 / cosY

        let requiredWidth = zRotatedWidth * compensateY
        let requiredHeight = zRotatedHeight * compensateX

        requiredWidth = Math.max(requiredWidth, diagonal)
        requiredHeight = Math.max(requiredHeight, diagonal)

        const calculatedCols = Math.ceil(
            (requiredWidth * safetyMargin) / boxSize
        )
        const calculatedRows = Math.ceil(
            (requiredHeight * safetyMargin) / boxSize
        )

        setRows(Math.max(10, calculatedRows))
        setCols(Math.max(10, calculatedCols))
    }, [boxSize, rotateX, rotateY, rotateZ, safetyMargin])

    // Handle resize
    useLayoutEffect(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        if (isCanvas) {
            let rafId = 0
            const TICK_MS = 100
            let lastCalc = 0

            const tick = (now?: number) => {
                const timeOk =
                    !lastCalc ||
                    (now || performance.now()) - lastCalc >= TICK_MS

                if (timeOk) {
                    calculateGrid()
                    lastCalc = now || performance.now()
                }

                rafId = requestAnimationFrame(tick)
            }

            rafId = requestAnimationFrame(tick)

            return () => {
                if (rafId) cancelAnimationFrame(rafId)
            }
        } else {
            calculateGrid()
            window.addEventListener("resize", calculateGrid)
            return () => {
                window.removeEventListener("resize", calculateGrid)
            }
        }
    }, [calculateGrid])

    useLayoutEffect(() => {
        calculateGrid()
    }, [calculateGrid, rotateX, rotateY, rotateZ])

    const gridWidth = cols * boxSize
    const gridHeight = rows * boxSize

    // Throttled mouse move handler
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Throttle with requestAnimationFrame
        if (rafIdRef.current !== null) return
        
        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null
            
            // Get the element directly under the cursor - this handles all transforms correctly
            const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY)
            if (!elementUnderCursor) return

            // Check if it's a box element by looking for data attributes
            const boxElement = elementUnderCursor.closest('[data-box]')
            if (!boxElement) return

            const row = parseInt(boxElement.getAttribute('data-row') || '-1', 10)
            const col = parseInt(boxElement.getAttribute('data-col') || '-1', 10)

            if (row < 0 || col < 0 || row >= rows || col >= cols) return

            const key = `${row}-${col}`
            
            // If it's a new box or re-hovering a fading box
            if (lastHoveredRef.current !== key) {
                // If there was a previous box, start its fade
                if (lastHoveredRef.current !== null) {
                    const prevBoxData = coloredBoxesRef.current.get(lastHoveredRef.current)
                    if (prevBoxData && prevBoxData.fadeStartTime === null) {
                        prevBoxData.fadeStartTime = Date.now()
                    }
                }
                
                lastHoveredRef.current = key
                
                // Add or update color for this box (reset fade if it was fading)
                const newColor = getRandomColor()
                coloredBoxesRef.current.set(key, {
                    color: newColor,
                    fadeStartTime: null, // Reset fade - box is being hovered
                })
                forceUpdate({}) // Trigger re-render
            }
        })
    }, [cols, rows, getRandomColor])
    
    // Clean up boxes that have finished fading
    useEffect(() => {
        const checkFades = () => {
            const now = Date.now()
            let needsUpdate = false
            
            coloredBoxesRef.current.forEach((boxData, key) => {
                // Remove boxes that have finished fading
                if (boxData.fadeStartTime !== null) {
                    const elapsed = now - boxData.fadeStartTime
                    if (elapsed >= outDuration * 1000) {
                        coloredBoxesRef.current.delete(key)
                        needsUpdate = true
                    }
                }
            })
            
            if (needsUpdate) {
                forceUpdate({})
            }
        }
        
        const interval = setInterval(checkFades, 16) // Check every frame
        return () => clearInterval(interval)
    }, [outDuration])

    // Box component with animation
    const Box = memo(({ row, col }: { row: number; col: number }) => {
        const key = `${row}-${col}`
        const boxData = coloredBoxesRef.current.get(key)
        const color = boxData?.color
        const isFading = boxData?.fadeStartTime !== null
        
        // Calculate target color - if fading, go to background/transparent
        const targetColor = isFading 
            ? (backgroundColor || "transparent")
            : (color || "transparent")
        
        return (
            <motion.div
                data-box="true"
                data-row={row}
                data-col={col}
                style={{
                    width: `${boxSize}px`,
                    height: `${boxSize}px`,
                    flexShrink: 0,
                    borderRight: borderWidth
                        ? `${borderWidth}px solid ${borderColor}`
                        : undefined,
                    borderTop: borderWidth
                        ? `${borderWidth}px solid ${borderColor}`
                        : undefined,
                    position: "relative",
                    backgroundColor: color || "transparent",
                }}
                animate={{
                    backgroundColor: targetColor,
                }}
                transition={{
                    duration: isFading ? outDuration : 0,
                    ease: "easeOut",
                }}
            />
        )
    })
    Box.displayName = "Box"

    // Boxes grid component
    const BoxesCore = () => {
        const rowsArray = useMemo(() => new Array(rows).fill(1), [])
        const colsArray = useMemo(() => new Array(cols).fill(1), [])

        return (
            <div
                ref={gridRef}
                onMouseMove={handleMouseMove}
                style={{
                    transform: `translate(-50%, -50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                    transformStyle: "preserve-3d",
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    display: "flex",
                    flexDirection: "column",
                    transformOrigin: "center center",
                    width: `${gridWidth}px`,
                    height: `${gridHeight}px`,
                    zIndex: 0,
                }}
            >
                {rowsArray.map((_, i) => (
                    <div
                        key={`row-${i}`}
                        style={{
                            display: "flex",
                            borderLeft: borderWidth
                                ? `${borderWidth}px solid ${borderColor}`
                                : undefined,
                            position: "relative",
                        }}
                    >
                        {colsArray.map((_, j) => (
                            <Box key={`col-${j}`} row={i} col={j} />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor: backgroundColor,
                perspective: `10000px`,
                perspectiveOrigin: "center center",
                transformStyle: "preserve-3d",
            }}
        >
            <BoxesCore />
        </div>
    )
}

addPropertyControls(BackgroundBoxesWEBGL, {
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(0,0,0,1)",
        optional: true,
    },
    boxSize: {
        type: ControlType.Number,
        title: "Box Size",
        min: 4,
        max: 64,
        step: 2,
        defaultValue: 36,
        unit: "px",
    },
    borderWidth: {
        type: ControlType.Number,
        title: "Border",
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 1,
        unit: "px",
    },
    rotateX: {
        type: ControlType.Number,
        title: "Rotate X",
        min: -45,
        max: 45,
        step: 1,
        defaultValue: 45,
        unit: "°",
    },
    rotateY: {
        type: ControlType.Number,
        title: "Rotate Y",
        min: -45,
        max: 45,
        step: 1,
        defaultValue: -10,
        unit: "°",
    },
    rotateZ: {
        type: ControlType.Number,
        title: "Rotate Z",
        min: -45,
        max: 45,
        step: 1,
        defaultValue: 30,
        unit: "°",
    },
    outDuration: {
        type: ControlType.Number,
        title: "Fade Time",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0.5,
        unit: "s",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "rgba(255,255,255,0.2)",
        optional: true,
    },
    safetyMargin: {
        type: ControlType.Number,
        title: "Fill Grid",
        min: 1,
        max: 2,
        step: 0.1,
        defaultValue: 1.2,
        description: "Add rows and columns. Increase for high rotations.",
    },
    colors: {
        type: ControlType.Array,
        title: "Colors",
        defaultValue: DEFAULT_COLORS,
        control: {
            type: ControlType.Color,
            title: "Color",
        },
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BackgroundBoxesWEBGL.displayName = "Background Boxes WEBGL"
