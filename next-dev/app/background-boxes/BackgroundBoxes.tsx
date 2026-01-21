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
    colors?: {
        paletteCount?: number
        color1?: string
        color2?: string
        color3?: string
        color4?: string
        color5?: string
        color6?: string
        color7?: string
        color8?: string
        color9?: string
        color10?: string
    }
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
    colors: colorsProp = {
        paletteCount: 9,
        color1: "rgb(125 211 252)",
        color2: "rgb(249 168 212)",
        color3: "rgb(134 239 172)",
        color4: "rgb(253 224 71)",
        color5: "rgb(252 165 165)",
        color6: "rgb(216 180 254)",
        color7: "rgb(147 197 253)",
        color8: "rgb(165 180 252)",
        color9: "rgb(196 181 253)",
    },
    inDuration = 0,
    outDuration = 2,
    style,
}: BackgroundBoxesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const [rows, setRows] = useState(35)
    const [cols, setCols] = useState(35)
    
    // Build colors array from props
    const colors = useMemo(() => {
        const entries: string[] = []
        if (colorsProp) {
            const paletteCount = colorsProp.paletteCount || 9
            for (let i = 1; i <= paletteCount; i++) {
                const key = `color${i}` as keyof typeof colorsProp
                const value = colorsProp[key]
                if (typeof value === "string" && value.trim().length > 0) {
                    entries.push(value.trim())
                }
            }
        }

        // Fallback to default colors if no colors provided
        if (entries.length === 0) {
            return DEFAULT_COLORS
        }

        return entries
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
        type: ControlType.Object,
        title: "Colors",
        description: "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            paletteCount: {
                type: ControlType.Number,
                title: "Palette Size",
                min: 1,
                max: 10,
                step: 1,
                defaultValue: 9,
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "rgb(125 211 252)",
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "rgb(249 168 212)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "rgb(134 239 172)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "rgb(253 224 71)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "rgb(252 165 165)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "rgb(216 180 254)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "rgb(147 197 253)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "rgb(165 180 252)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 8,
            },
            color9: {
                type: ControlType.Color,
                title: "Color 9",
                defaultValue: "rgb(196 181 253)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 9,
            },
            color10: {
                type: ControlType.Color,
                title: "Color 10",
                defaultValue: "rgb(125 211 252)",
                hidden: (props: any) => (props?.paletteCount ?? 9) < 10,
            },
        },
    },
})

BackgroundBoxes.displayName = "Background Boxes"
