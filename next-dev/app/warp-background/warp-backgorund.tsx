import { motion } from "framer-motion"
import React, { useMemo, ComponentType, useState, useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Props interface for the Warp Background component
interface WarpBackgroundProps {
    perspective?: number
    beamsPerSide?: number
    speed?: number // 0.1..1 (maps to duration 15s..1s)
    grid?: {
        size?: number // UI 0.1..1 → internal 20..2%
        color?: string
        thickness?: number // px (0.5..10)
    }
    colors?: {
        mode?: "random" | "pick"
        paletteCount?: number
        color1?: string
        color2?: string
        color3?: string
        color4?: string
        color5?: string
        color6?: string
        color7?: string
        color8?: string
    }
}


// Simple token resolver (supports var(--token, fallback))
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/
function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}
function resolveTokenColor(input?: string): string | undefined {
    if (!input || typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Mapping helpers (similar to wavePrism)
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}
function mapBeamSizeUiToPercent(ui: number): number {
    // UI 0.1..1 → percent 20..2 (inverse mapping)
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 20, 2)
}

/**
 * Beam component - represents a single animated light beam
 * Generates a random hue and aspect ratio for visual variety
 */
const Beam = ({
  width,
  x,
  duration,
    color,
    staticMode,
    staticY,
    onComplete,
    delay = 0,
    hue = 180,
    aspectRatio = 5,
}: {
    width: string | number
    x: string | number
    duration: number
    color?: string
    staticMode?: boolean
    staticY?: string | number
    onComplete?: () => void
    delay?: number
    hue?: number
    aspectRatio?: number
}) => {
    // Use provided hue and aspectRatio for consistent beam appearance
    const beamColor = color || `hsl(${hue} 80% 60%)`

  return (
    <motion.div
            style={{
                position: "absolute",
                left: `${x}`,
                top: 0,
                width: `${width}`,
                aspectRatio: `1/${aspectRatio}`,
                background: `linear-gradient(${beamColor}, transparent)`,
                // Ensure beam aligns perfectly with grid
                transform: "translateX(-50%)",
            }}
            initial={staticMode ? { y: staticY ?? "-40%", opacity: 1 } : { y: "100cqmax", opacity: 0 }}
            animate={
                staticMode
                    ? { y: staticY ?? "-40%", opacity: 1 }
                    : { y: "-100%", opacity: [0, 1, 1, 0] }
            }
      transition={
                staticMode
                    ? { duration: 0 }
                    : {
                          duration,
                          ease: "linear",
                          delay,
                          opacity: {
                              duration,
                              ease: "linear",
                              times: [0, 0.1, 0.85, 1],
                              delay,
                          },
                      }
            }
            onAnimationComplete={onComplete}
        />
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function WarpBackground(props: WarpBackgroundProps) {
    const {
  perspective = 100,
  beamsPerSide = 3,
        speed = 0.5,
        grid,
        colors,
    } = props

    // Clamp perspective to avoid extreme distortion at very low values
    const effectivePerspective = Math.min(perspective, perspective)

    // Map speed (0.1..1) to duration seconds (15..1)
    const clampedSpeed = Math.max(0.1, Math.min(1, speed))
    const normalized = (clampedSpeed - 0.1) / 0.9 // 0..1
    const beamDuration = 15 - 14 * normalized // 15 -> 1

    // Calculate initial delay between beams
    const initialDelay = beamDuration / beamsPerSide

    // Determine canvas mode - show static beams in canvas, animated in live
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Grid derived values
    const sizeUi = grid?.size ?? 0.5
    // Map UI to desired percent, then snap to an integer number of cells so the grid divides evenly
    const desiredPercent = mapBeamSizeUiToPercent(sizeUi) // ~20..2
    const cellsPerSide = Math.max(5, Math.min(50, Math.round(100 / desiredPercent)))
    const gridPercent = 100 / cellsPerSide
    let gridColor = grid?.color
        ? (resolveTokenColor(grid.color) || grid.color)
        : "transparent"
    if (typeof gridColor === "string" && gridColor.startsWith("var(")) {
        gridColor = "transparent"
    }
    const gridThickness = grid?.thickness ?? 1

    // Prepare palette (if provided)
    const palette: string[] = useMemo(() => {
        if (colors?.mode !== "pick") return []
        const list: string[] = []
        const count = Math.max(0, Math.min(8, colors?.paletteCount ?? 0))
        if (count > 0) {
            const candidates = [
                resolveTokenColor(colors?.color1),
                resolveTokenColor(colors?.color2),
                resolveTokenColor(colors?.color3),
                resolveTokenColor(colors?.color4),
                resolveTokenColor(colors?.color5),
                resolveTokenColor(colors?.color6),
                resolveTokenColor(colors?.color7),
                resolveTokenColor(colors?.color8),
            ].filter(Boolean) as string[]
            for (let i = 0; i < Math.min(count, candidates.length); i++) {
                list.push(candidates[i])
            }
        }
        return list
    }, [colors])

    // Track if component is in view to pause animations when out of view
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [isInView, setIsInView] = useState(true)
    
    // Intersection Observer to detect when component is out of view
    useEffect(() => {
        if (!containerRef.current) return
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsInView(entry.isIntersecting)
                })
            },
            { threshold: 0.01 } // Trigger when 1% of the component is visible
        )
        
        observer.observe(containerRef.current)
        
        return () => {
            observer.disconnect()
        }
    }, [])
    
    // Beam ID counter for unique keys
    const beamIdRef = React.useRef(0)
    
    // Function to create a new beam
    const createBeam = (delay: number = 0) => ({
        id: beamIdRef.current++,
        x: Math.floor(Math.random() * cellsPerSide),
        color: palette.length ? palette[Math.floor(Math.random() * palette.length)] : undefined,
        hue: Math.floor(Math.random() * 360),
        aspectRatio: Math.floor(Math.random() * 10) + 1,
        delay,
        startTime: Date.now() + delay * 1000, // Track when this beam will start animating
    })
    
    // State for active beams on all sides
    const [topBeams, setTopBeams] = useState<any[]>([])
    const [bottomBeams, setBottomBeams] = useState<any[]>([])
    const [leftBeams, setLeftBeams] = useState<any[]>([])
    const [rightBeams, setRightBeams] = useState<any[]>([])
    const [centerBeams, setCenterBeams] = useState<any[]>([])
    
    // Helper function to create beam completion handlers for each side
    const createBeamCompleteHandler = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        return (beamId: number) => {
            // Only spawn new beams if component is in view
            if (!isInView) return
            
            setter(prev => {
                // Find the finished beam to get its startTime
                const finishedBeam = prev.find(b => b.id === beamId)
                const newBeams = prev.filter(b => b.id !== beamId)
                
                // Calculate when the new beam should start (after beamDuration from when the finished one started)
                const finishedStartTime = finishedBeam?.startTime || Date.now()
                const newStartTime = finishedStartTime + beamDuration * 1000
                const now = Date.now()
                const newDelay = Math.max(0, (newStartTime - now) / 1000) // Convert to seconds
                
                // Add new beam with calculated delay
                newBeams.push(createBeam(newDelay))
                return newBeams
            })
        }
    }
    
    // Create handlers for each side
    const handleTopBeamComplete = createBeamCompleteHandler(setTopBeams)
    const handleBottomBeamComplete = createBeamCompleteHandler(setBottomBeams)
    const handleLeftBeamComplete = createBeamCompleteHandler(setLeftBeams)
    const handleRightBeamComplete = createBeamCompleteHandler(setRightBeams)
    const handleCenterBeamComplete = createBeamCompleteHandler(setCenterBeams)
    
    // Helper to initialize beams for a side
    const initSide = React.useCallback((setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const beams = []
        for (let i = 0; i < beamsPerSide; i++) {
            beams.push(createBeam(i * initialDelay))
        }
        setter(beams)
    }, [beamsPerSide, initialDelay, palette, cellsPerSide])
    
    // Initialize initial beams for all sides - all at once with different delays
    useEffect(() => {
        initSide(setTopBeams)
        initSide(setBottomBeams)
        initSide(setLeftBeams)
        initSide(setRightBeams)
        initSide(setCenterBeams)
    }, [initSide])
    
    // Reset beams when coming back into view to avoid timing issues
    useEffect(() => {
        if (isInView) {
            initSide(setTopBeams)
            initSide(setBottomBeams)
            initSide(setLeftBeams)
            initSide(setRightBeams)
            initSide(setCenterBeams)
        }
    }, [isInView, initSide])

    // Static preview beams (visible snapshot in canvas when Preview is Off)
    const generateStaticBeams = () => {
        const beams: { x: number; y: string; color?: string; hue: number; aspectRatio: number }[] = []
        const count = Math.max(1, Math.min(10, beamsPerSide))
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * cellsPerSide)
            // More random y positions - from -80% to -20% for good variation while staying visible
            const y = `${(50 + Math.random() * 100)}%` // place anywhere along the visible path
            const color = palette.length
                ? palette[Math.floor(Math.random() * palette.length)]
                : undefined
            const hue = Math.floor(Math.random() * 360)
            const aspectRatio = Math.floor(Math.random() * 10) + 1
            beams.push({ x, y, color, hue, aspectRatio })
        }
        return beams
    }

    // Static beams for canvas mode only
    const staticTopBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticRightBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticBottomBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticLeftBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )
    const staticCenterBeams = useMemo(
        () => generateStaticBeams(),
        [beamsPerSide, cellsPerSide, palette]
    )

    // Grid line thickness
    const linePx = Math.max(1, Math.min(10, gridThickness))
    
    // Calculate perspective correction for horizontal and vertical lines only
    // Linear interpolation: specify thickness at perspective=50 and perspective=1000
    const thicknessAt50 = 0.15  // Set this value (as a multiplier of grid.thickness)
    const thicknessAt1000 = 1.2 // Set this value (as a multiplier of grid.thickness)
    
    // Linear interpolation formula: y = y1 + (y2 - y1) * (x - x1) / (x2 - x1)
    const perspectiveCorrection = thicknessAt50 + (thicknessAt1000 - thicknessAt50) * 
        (effectivePerspective - 50) / (1000 - 50)
    
    // Generate grid lines using divs - more reliable than gradients
    const gridLines = useMemo(() => {
        const lines = []
        // Vertical lines - apply correction to maintain consistent appearance
        for (let i = 0; i <= cellsPerSide; i++) {
            const correctedWidth = linePx 
            lines.push(
                <div
                    key={`v-${i}`}
                    style={{
                        position: "absolute",
                        left: `${i * gridPercent}%`,
                        top: 0,
                        width: `${correctedWidth}px`,
                        height: "100%",
                        backgroundColor: gridColor,
                        transform: "translateX(-50%)",
                    }}
                />
            )
        }
        // Horizontal lines - apply correction to maintain consistent appearance
        for (let i = 0; i <= cellsPerSide; i++) {
            const correctedHeight = linePx * perspectiveCorrection
            lines.push(
                <div
                    key={`h-${i}`}
                    style={{
                        position: "absolute",
                        top: `${i * gridPercent}%`,
                        left: 0,
                        height: `${correctedHeight}px`,
                        width: "100%",
                        backgroundColor: gridColor,
                        transform: "translateY(-50%)",
                    }}
                />
            )
        }
        return lines
    }, [cellsPerSide, gridPercent, linePx, gridColor, perspectiveCorrection])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
            }}
        >
            {/* Perspective container for 3D effect */}
            <div
                style={{
                    pointerEvents: "none",
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    clipPath: "inset(0)",
                    containerType: "size",
                    perspective: `${effectivePerspective}px`,
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Top side - rotated to create floor/ceiling effect */}
                <div
                    style={{
                        position: "absolute",
                        transformStyle: "preserve-3d",
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        width: "100cqi",
                    }}
                >
                    {gridLines}
          {(isCanvas ? staticTopBeams : topBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `top-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas || !isInView ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas || !isInView}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={beam.delay ?? 0}
                            onComplete={!isCanvas && isInView ? () => {
                                handleTopBeamComplete(beam.id)
                            } : undefined}
            />
          ))}
        </div>

                {/* Bottom side */}
                <div
                    style={{
                        position: "absolute",
                        top: "100%",	
                        transformStyle: "preserve-3d",
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        width: "100cqi",
                    }}
                >
                    {gridLines}
          {(isCanvas ? staticBottomBeams : bottomBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `bottom-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas || !isInView ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas || !isInView}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={beam.delay ?? 0}
                            onComplete={!isCanvas && isInView ? () => {
                                handleBottomBeamComplete(beam.id)
                            } : undefined}
            />
          ))}
        </div>

                {/* Left side */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        transformStyle: "preserve-3d",
                        containerType: "inline-size",
                        height: "100cqmax",
                        transformOrigin: "0% 0%",
                        transform: "rotate(90deg) rotateX(-90deg)",
                        width: "100cqh",
                    }}
                >
                    {gridLines}
          {(isCanvas ? staticLeftBeams : leftBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `left-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas || !isInView ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas || !isInView}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={beam.delay ?? 0}
                            onComplete={!isCanvas && isInView ? () => {
                                handleLeftBeamComplete(beam.id)
                            } : undefined}
            />
          ))}
        </div>

                {/* Right side */}
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        transformStyle: "preserve-3d",
                        containerType: "inline-size",
                        height: "100cqmax",
                        width: "100cqh",
                        transformOrigin: "100% 0%",
                        transform: "rotate(-90deg) rotateX(-90deg)",
                    }}
                >
                    {gridLines}
          {(isCanvas ? staticRightBeams : rightBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `right-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas || !isInView ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas || !isInView}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={beam.delay ?? 0}
                            onComplete={!isCanvas && isInView ? () => {
                                handleRightBeamComplete(beam.id)
                            } : undefined}
            />
          ))}
        </div>

                {/* Center floor - beams appearing in the center area */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transformStyle: "preserve-3d",
                        containerType: "inline-size",
                        height: "100cqmax",
                        width: "100cqi",
                        transformOrigin: "50% 50%",
                        transform: "translate(-50%, -50%) rotateX(-90deg)",
                    }}
                >
                    {gridLines}
          {(isCanvas ? staticCenterBeams : centerBeams).map((beam: any, index: number) => (
            <Beam
              key={beam.id || `center-${beam.x}-${beam.y}`}
                            width={`${gridPercent}%`}
                            x={`${beam.x * gridPercent}%`}
              duration={isCanvas || !isInView ? 0 : beamDuration}
                            color={beam.color}
                            hue={beam.hue}
                            aspectRatio={beam.aspectRatio}
                            staticMode={isCanvas || !isInView}
                            staticY={isCanvas ? beam.y : undefined}
                            delay={beam.delay ?? 0}
                            onComplete={!isCanvas && isInView ? () => {
                                handleCenterBeamComplete(beam.id)
                            } : undefined}
            />
          ))}
        </div>
      </div>
    </div>
    )
}

// Display name for Framer UI
WarpBackground.displayName = "Warp Background"

// Property controls for Framer
addPropertyControls(WarpBackground, {
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 50,
        max: 1000,
        step: 10,
        defaultValue: 100,
    },
    beamsPerSide: {
        type: ControlType.Number,
        title: "Count",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 6,
    },
	speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.9,
    },
    grid: {
        type: ControlType.Object,
        title: "Grid",
        controls: {
            size: {
                type: ControlType.Number,
                title: "Count",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.8,
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "rgba(128, 128, 128, 0.2)",
				optional:true
            },
            thickness: {
                type: ControlType.Number,
                title: "Thickness",
                min: 0.5,
                max: 10,
                step: 0.5,
                defaultValue: 1,
            },
        },
    },
    colors: {
        type: ControlType.Object,
        title: "Beams",
        description:"More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            mode: {
                type: ControlType.Enum,
                title: "Colors",
                options: ["random", "pick"],
                optionTitles: ["Random", "Pick Colors"],
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                defaultValue: "random",
            },
            paletteCount: {
                type: ControlType.Number,
                title: "Palette",
                min: 1,
                max: 8,
                step: 1,
                defaultValue: 2,
                hidden: (p: any) => p?.mode !== "pick",
            },
            color1: {
                type: ControlType.Color,
                title: "Color 1",
                defaultValue: "#FF0000", // Red
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 1,
            },
            color2: {
                type: ControlType.Color,
                title: "Color 2",
                defaultValue: "#FFA500", // Orange
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 2,
            },
            color3: {
                type: ControlType.Color,
                title: "Color 3",
                defaultValue: "#FFFF00", // Yellow
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 3,
            },
            color4: {
                type: ControlType.Color,
                title: "Color 4",
                defaultValue: "#00FF00", // Green
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 4,
            },
            color5: {
                type: ControlType.Color,
                title: "Color 5",
                defaultValue: "#0000FF", // Blue
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 5,
            },
            color6: {
                type: ControlType.Color,
                title: "Color 6",
                defaultValue: "#4B0082", // Indigo
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 6,
            },
            color7: {
                type: ControlType.Color,
                title: "Color 7",
                defaultValue: "#8B00FF", // Violet
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 7,
            },
            color8: {
                type: ControlType.Color,
                title: "Color 8",
                defaultValue: "#FFFFFF", // Extra slot default (white)
                hidden: (p: any) => p?.mode !== "pick" || (p?.paletteCount ?? 0) < 8,
            },
        },
    },
})

WarpBackground.displayName="Warp Background"