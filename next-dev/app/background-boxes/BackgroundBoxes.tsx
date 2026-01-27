import React, { memo, useMemo, useRef, useState, useLayoutEffect, useCallback } from "react"
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
    "rgb(253 224 71)",  // yellow-300
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

export default function BackgroundBoxes({
    backgroundColor,
    boxSize = 16,
    borderWidth,
    borderColor,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    safetyMargin = 1.2,
    colors: colorsProp = DEFAULT_COLORS,
    inDuration = 0,
    outDuration = 2,
    style,
}: BackgroundBoxesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const [rows, setRows] = useState(35)
    const [cols, setCols] = useState(35)
    
    // Use colors array directly, filtering out empty values
    const colors = useMemo(() => {
        if (!colorsProp || colorsProp.length === 0) {
            return DEFAULT_COLORS
        }
        
        // Filter out empty or invalid color values
        const validColors = colorsProp
            .filter((color): color is string => 
                typeof color === "string" && color.trim().length > 0
            )
            .map(color => color.trim())
        
        // Fallback to default colors if no valid colors provided
        return validColors.length > 0 ? validColors : DEFAULT_COLORS
    }, [colorsProp])

    const getRandomColor = () => {
        if (colors.length === 0) return DEFAULT_COLORS[0] || "rgb(125 211 252)"
        return colors[Math.floor(Math.random() * colors.length)]
    }

    // Calculate grid dimensions based on container size and rotation
    const calculateGrid = useCallback(() => {
        const container = containerRef.current
        if (!container) return

        const w = container.clientWidth || container.offsetWidth || 1
        const h = container.clientHeight || container.offsetHeight || 1

        // Convert rotation angles to radians
        const radX = Math.abs(rotateX) * (Math.PI / 180)
        const radY = Math.abs(rotateY) * (Math.PI / 180)
        const radZ = Math.abs(rotateZ) * (Math.PI / 180)
        
        // Calculate the diagonal of the viewport - this is the worst-case dimension
        const diagonal = Math.sqrt(w * w + h * h)
        
        // For 3D rotations, we need to account for:
        // 1. RotateZ (2D rotation): expands bounding box
        // 2. RotateX/Y (3D tilt): foreshortens the plane
        
        // Calculate Z rotation expansion
        const cosZ = Math.abs(Math.cos(radZ))
        const sinZ = Math.abs(Math.sin(radZ))
        const zRotatedWidth = w * cosZ + h * sinZ
        const zRotatedHeight = w * sinZ + h * cosZ
        
        // Calculate 3D tilt compensation factors
        // When tilted, the plane appears smaller, so we need more coverage
        // Use conservative minimums to ensure we always have enough
        const cosX = Math.max(Math.abs(Math.cos(radX)), 0.2)
        const cosY = Math.max(Math.abs(Math.cos(radY)), 0.2)
        
        // Compensation factors: inverse of cosine (how much larger we need)
        const compensateX = 1 / cosX
        const compensateY = 1 / cosY
        
        // Apply all compensations
        // X rotation affects vertical dimension (height)
        // Y rotation affects horizontal dimension (width)
        let requiredWidth = zRotatedWidth * compensateY
        let requiredHeight = zRotatedHeight * compensateX
        
        // For extreme rotations, ensure we cover at least the diagonal
        // This handles cases where combined rotations create very large projections
        requiredWidth = Math.max(requiredWidth, diagonal)
        requiredHeight = Math.max(requiredHeight, diagonal)
        
        // Additional safety margin for edge cases (40% margin)
        // This ensures corners and edges are always covered

        const calculatedCols = Math.ceil((requiredWidth * safetyMargin) / boxSize)
        const calculatedRows = Math.ceil((requiredHeight * safetyMargin) / boxSize)

        setRows(Math.max(10, calculatedRows))
        setCols(Math.max(10, calculatedCols))
    }, [boxSize, rotateX, rotateY, rotateZ, safetyMargin])

    // Handle resize with zoom probe method for canvas mode
    useLayoutEffect(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        
        if (isCanvas) {
            // Canvas mode: use zoom probe polling method
            let rafId = 0
            const TICK_MS = 100
            let lastCalc = 0
            
            const tick = (now?: number) => {
                const timeOk = !lastCalc || (now || performance.now()) - lastCalc >= TICK_MS
                
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
            // Preview mode: use window resize events
            calculateGrid() // Initial calculation
            
            window.addEventListener("resize", calculateGrid)
            return () => {
                window.removeEventListener("resize", calculateGrid)
            }
        }
    }, [calculateGrid])

    // Initial calculation and recalculation when rotation changes
    useLayoutEffect(() => {
        calculateGrid()
    }, [calculateGrid, rotateX, rotateY, rotateZ])

    // Calculate actual grid dimensions
    const gridWidth = cols * boxSize
    const gridHeight = rows * boxSize

    // Boxes component
    const BoxesCore = () => {
        const rowsArray = new Array(rows).fill(1)
        const colsArray = new Array(cols).fill(1)

        return (
            <div
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
                    <motion.div
                        key={`row-${i}`}
                        style={{
                            display: "flex",
                            borderLeft: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined,
                            position: "relative",
                            transformStyle:"preserve-3d"
                        }}
                    >
                        {colsArray.map((_, j) => (
                            <motion.div
                                key={`col-${j}`}
                                whileHover={{
                                    backgroundColor: getRandomColor(),
                                    transition: { duration: inDuration },
                                }}
                                transition={{
                                    duration: outDuration,
                                }}
                                style={{
                                    width: `${boxSize}px`,
                                    height: `${boxSize}px`,
                                    flexShrink: 0,
                                    borderRight: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined,
                                    borderTop: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined,
                                    position: "relative",
                                    transformStyle:"preserve-3d"
                                }}
                            />
                        ))}
                    </motion.div>
                ))}
            </div>
        )
    }

    const MemoizedBoxes = memo(BoxesCore)

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
                transformStyle:"preserve-3d"
            }}
        >
            {/* Hidden zoom probe for canvas mode */}
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
            {/* Background boxes */}
            <MemoizedBoxes />
        </div>
    )
}

addPropertyControls(BackgroundBoxes, {

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
    inDuration: {
        type: ControlType.Number,
        title: "Time In",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0,
    },
    outDuration: {
        type: ControlType.Number,
        title: "Time Out",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0.5,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "rgba(255,255,255,0.2)",
        optional:true
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
        description: "Add as many colors as you want. More components at [Framer University](https://frameruni.link/cc).",
    },
})

BackgroundBoxes.displayName = "Background Boxes"
