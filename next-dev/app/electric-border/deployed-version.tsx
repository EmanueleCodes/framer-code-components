import { useEffect, useId, useLayoutEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface ElectricBorderProps {
    children?: React.ReactNode
    borderColor?: string
    preview?: boolean
    showGlow?: boolean
    glowIntensity?: number
    speed?: number
    intensity?: number
    borderThickness?: number
    glowPadding?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ElectricBorder({
    borderColor = "#FFD9BF",
    preview = true,
    showGlow = true,
    glowIntensity = 0.5,
    speed = 5,
    intensity = 2.5,
    borderThickness = 2,
    style,
}: ElectricBorderProps) {
    const rawId = useId().replace(/[:]/g, "")
    const filterId = `turbulent-displace-${rawId}`
    const svgRef = useRef<SVGSVGElement>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const strokeRef = useRef<HTMLDivElement>(null)
    const filterCreatedRef = useRef(false)
    const isVisibleRef = useRef(true)

    const shouldAnimate =
        speed > 0 &&
        isVisibleRef.current &&
        (RenderTarget.current() === RenderTarget.preview ||
            (preview && RenderTarget.current() === RenderTarget.canvas))

    // Calculate intensity-based values for spikiness (same as fallback version)
    const baseFreq = 0.005 + intensity * 0.0095 // 0.005 to 0.1
    const octaves = Math.round(3 + intensity * 0.9) // 3 to 12
    const displacementScale = 10 + intensity * 5 // 10 to 60

    const updateAnim = () => {
        const svg = svgRef.current
        const host = rootRef.current
        if (!svg || !host) return

        if (strokeRef.current) {
            // Only apply filter once when it's ready
            if (!filterCreatedRef.current) {
                const filterEl = svg.querySelector(`#${CSS.escape(filterId)}`)
                if (filterEl) {
                    strokeRef.current.style.filter = `url(#${filterId})`
                    filterCreatedRef.current = true
                }
            }
        }

        const width = Math.max(
            1,
            Math.round(
                host.clientWidth || host.getBoundingClientRect().width || 0
            )
        )
        const height = Math.max(
            1,
            Math.round(
                host.clientHeight || host.getBoundingClientRect().height || 0
            )
        )

        const dyAnims = Array.from(
            svg.querySelectorAll('feOffset > animate[attributeName="dy"]')
        )
        const dxAnims = Array.from(
            svg.querySelectorAll('feOffset > animate[attributeName="dx"]')
        )

        if (dyAnims.length >= 2) {
            dyAnims[0].setAttribute("values", `${height}; 0`)
            dyAnims[1].setAttribute("values", `0; -${height}`)
        }

        if (dxAnims.length >= 2) {
            dxAnims[0].setAttribute("values", `${width}; 0`)
            dxAnims[1].setAttribute("values", `0; -${width}`)
        }

        const baseDur = 6
        const dur = Math.max(0.001, baseDur / (speed || 1))
        ;[...dyAnims, ...dxAnims].forEach((a) =>
            a.setAttribute("dur", `${dur}s`)
        )

        const disp = svg.querySelector("feDisplacementMap")
        if (disp) disp.setAttribute("scale", String(displacementScale))

        const filterEl = svg.querySelector(`#${CSS.escape(filterId)}`)
        
        if (filterEl) {
            filterEl.setAttribute("x", "-200%")
            filterEl.setAttribute("y", "-200%")
            filterEl.setAttribute("width", "500%")
            filterEl.setAttribute("height", "500%")
        }

        requestAnimationFrame(() => {
            ;[...dyAnims, ...dxAnims].forEach((a) => {
                const animateElement = a as SVGAnimateElement
                if (typeof animateElement.beginElement === "function") {
                    try {
                        animateElement.beginElement()
                    } catch {
                        console.warn(
                            "ElectricBorder: beginElement failed, this may be due to a browser limitation."
                        )
                    }
                }
            })
        })
    }

    useEffect(() => {
        if (shouldAnimate) {
            updateAnim()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speed, intensity, shouldAnimate, baseFreq, octaves, displacementScale])

    // Separate effect for filter application
    useEffect(() => {
        if (svgRef.current && strokeRef.current && !filterCreatedRef.current) {
            const checkFilter = () => {
                const filterEl = svgRef.current?.querySelector(`#${CSS.escape(filterId)}`)
                if (filterEl && strokeRef.current) {
                    strokeRef.current.style.filter = `url(#${filterId})`
                    filterCreatedRef.current = true
                } else {
                    setTimeout(checkFilter, 100)
                }
            }
            checkFilter()
        }
    }, [filterId])

    useLayoutEffect(() => {
        if (!rootRef.current) return
        
        const ro = new ResizeObserver(() => {
            if (shouldAnimate) {
                updateAnim()
            }
        })
        ro.observe(rootRef.current)
        
        // Intersection Observer for performance optimization
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const wasVisible = isVisibleRef.current
                    isVisibleRef.current = entry.isIntersecting
                    
                    // If visibility changed and we should animate, update animations
                    if (wasVisible !== isVisibleRef.current && speed > 0) {
                        if (isVisibleRef.current) {
                            updateAnim()
                        } else {
                        }
                    }
                })
            },
            {
                rootMargin: "50px", // 50px margin in all directions
                threshold: 0
            }
        )
        io.observe(rootRef.current)
        
        if (shouldAnimate) {
            updateAnim()
        }
        
        return () => {
            ro.disconnect()
            io.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldAnimate])

    const vars = {
        ["--electric-border-color"]: borderColor,
        ["--eb-border-width"]: `${borderThickness}px`,
    }

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
                boxSizing: "border-box",
                ...vars,
                ...style,
            }}
        >
            <svg
                ref={svgRef}
                style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                }}
                aria-hidden
                focusable="false"
            >
                <defs>
                    <filter
                        id={filterId}
                        colorInterpolationFilters="sRGB"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                    >
                        <feTurbulence
                            type="turbulence"
                            baseFrequency={baseFreq}
                            numOctaves={octaves}
                            result="noise1"
                            seed="1"
                        />
                        <feOffset
                            in="noise1"
                            dx="0"
                            dy="0"
                            result="offsetNoise1"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dy"
                                    values="700; 0"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency={baseFreq}
                            numOctaves={octaves}
                            result="noise2"
                            seed="1"
                        />
                        <feOffset
                            in="noise2"
                            dx="0"
                            dy="0"
                            result="offsetNoise2"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dy"
                                    values="0; -700"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency={baseFreq}
                            numOctaves={octaves}
                            result="noise1"
                            seed="2"
                        />
                        <feOffset
                            in="noise1"
                            dx="0"
                            dy="0"
                            result="offsetNoise3"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dx"
                                    values="490; 0"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feTurbulence
                            type="turbulence"
                            baseFrequency={baseFreq}
                            numOctaves={octaves}
                            result="noise2"
                            seed="2"
                        />
                        <feOffset
                            in="noise2"
                            dx="0"
                            dy="0"
                            result="offsetNoise4"
                        >
                            {shouldAnimate && (
                                <animate
                                    attributeName="dx"
                                    values="0; -490"
                                    dur="6s"
                                    repeatCount="indefinite"
                                    calcMode="linear"
                                />
                            )}
                        </feOffset>

                        <feComposite
                            in="offsetNoise1"
                            in2="offsetNoise2"
                            result="part1"
                        />
                        <feComposite
                            in="offsetNoise3"
                            in2="offsetNoise4"
                            result="part2"
                        />
                        <feBlend
                            in="part1"
                            in2="part2"
                            mode="color-dodge"
                            result="combinedNoise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="combinedNoise"
                            scale={displacementScale}
                            xChannelSelector="R"
                            yChannelSelector="B"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                style={{
                    position: "absolute",
                    top: `calc(-2px - ${borderThickness / 2}px)`,
                    left: `calc(-2px - ${borderThickness / 2}px)`,
                    bottom: 0,
                    right: 0,
                    width: `calc(100% + ${borderThickness / 2}px)`,
                    height: `calc(100% + ${borderThickness / 2}px)`,
                    //width: "100%",
                    //height: "100%",
                    pointerEvents: "none",
                }}
            >
                <div
                    ref={strokeRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "24px",
                        border: `var(--eb-border-width) solid var(--electric-border-color)`,
                        filter: `url(#${filterId})`,
                        zIndex: 10,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "24px",
                        border: `var(--eb-border-width) solid ${borderColor}${Math.floor(
                            glowIntensity * 255
                        )
                            .toString(16)
                            .padStart(2, "0")}`,
                        filter: "blur(1px)",
                        zIndex: 8,
                        opacity: showGlow ? 1 : 0,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "24px",
                        border: `var(--eb-border-width) solid ${borderColor}${Math.floor(
                            glowIntensity * 255
                        )
                            .toString(16)
                            .padStart(2, "0")}`,
                        filter: "blur(4px)",
                        zIndex: 7,
                        opacity: showGlow ? 1 : 0,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "24px",
                        background: `linear-gradient(-30deg, ${borderColor}, transparent, ${borderColor})`,
                        filter: "blur(32px)",
                        transform: "scale(1.1)",
                        opacity: showGlow ? glowIntensity * 0.3 : 0,
                        zIndex: 1,
                        pointerEvents: "none",
                    }}
                />
            </div>

            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    zIndex: 15,
                    pointerEvents: "auto",
                }}
            ></div>
        </div>
    )
}

// Property Controls
addPropertyControls(ElectricBorder, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
    },
    showGlow: {
        type: ControlType.Boolean,
        title: "Glow",
        defaultValue: true,
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "+ Glow -",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,

        hidden: (props) => !props.showGlow,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 3,
        step: 0.1,
        defaultValue: 1.5,
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 2.5,
    },
    borderThickness: {
        type: ControlType.Number,
        title: "Thickness",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
    },

    borderColor: {
        type: ControlType.Color,
        title: "Border Color",
        defaultValue: "#FFD9BF",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ElectricBorder.displayName = "Electric Border"

