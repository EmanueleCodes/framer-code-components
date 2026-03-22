import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useCallback,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

type ViewportLine = "top" | "center" | "bottom"

function viewportLineToY(line: ViewportLine, vh: number): number {
    if (line === "center") return vh / 2
    if (line === "bottom") return vh
    return 0
}

function findStickyAncestor(el: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = el.parentElement
    while (current && current !== document.body) {
        if (window.getComputedStyle(current).position === "sticky")
            return current
        current = current.parentElement
    }
    return null
}

/**
 * Progress 0 when the tracked box top hits startLine; 1 when its bottom hits endLine.
 * Nearest sticky ancestor (or `el` if it is sticky); if none, `el` is used as the box.
 *
 * Important: while `position: sticky` is active, the sticky node's getBoundingClientRect
 * barely moves, so progress would stay ~0. We measure the sticky element's parent instead
 * — the tall block that defines how long you scroll while the sticky layer is pinned.
 */
function scrollProgressFromStickyViewport(
    el: HTMLElement,
    startLine: ViewportLine,
    endLine: ViewportLine
): number {
    let sticky = findStickyAncestor(el)
    if (!sticky && window.getComputedStyle(el).position === "sticky") {
        sticky = el
    }
    if (!sticky) sticky = el

    const vh = window.innerHeight || 0
    const yStart = viewportLineToY(startLine, vh)
    const yEnd = viewportLineToY(endLine, vh)

    const isStickyNode =
        window.getComputedStyle(sticky).position === "sticky"
    const box =
        isStickyNode && sticky.parentElement ? sticky.parentElement : sticky

    const rect = box.getBoundingClientRect()
    const h = rect.height
    const topWhenStart = yStart
    const topWhenEnd = yEnd - h
    const denom = topWhenStart - topWhenEnd
    if (Math.abs(denom) < 1e-6) return 0
    return clamp01((topWhenStart - rect.top) / denom)
}

function createSeededRandom(seed: number) {
    let s = Math.max(0, seed)
    return function next(): number {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
    }
}

interface Card {
    contentIndex: number
    x: number
    y: number
    baseZ: number
}

const HALF_DIAGONAL = Math.SQRT2 / 2

function initCards(
    contentCount: number,
    duplication: number,
    depthRange: number,
    seed: number,
    placementZone: { radiusMin: number; radiusMax: number }
): Card[] {
    if (contentCount === 0) return []
    const total = contentCount * duplication
    const rnd = createSeededRandom(seed)
    const rMinPct =
        Math.max(0, Math.min(100, placementZone?.radiusMin ?? 0)) / 100
    const rMaxPct =
        Math.max(0, Math.min(500, placementZone?.radiusMax ?? 100)) / 100
    const rMin = rMinPct * HALF_DIAGONAL
    const rMax = Math.max(rMin, rMaxPct * HALF_DIAGONAL)

    return Array.from({ length: total }, (_, i) => {
        const angle = rnd() * Math.PI * 2
        const r = rMin + rnd() * (rMax - rMin)
        const xNorm = 0.5 + r * Math.cos(angle)
        const yNorm = 0.5 + r * Math.sin(angle)
        return {
            contentIndex: i % contentCount,
            x: xNorm * 100,
            y: yNorm * 100,
            baseZ: total === 1 ? 0 : (i / (total - 1)) * depthRange,
        }
    })
}

interface InfiniteZoomCanvasProps {
    content: React.ReactNode[]
    duplication: number
    seed: number
    placementZone: { radiusMin: number; radiusMax: number }
    startAlign: "top" | "center" | "bottom"
    scrollUnit: "px" | "relative"
    /** When scrollUnit is relative: start = when sticky top hits viewport line; end = when sticky bottom hits viewport line. */
    stickyRange: { start: ViewportLine; end: ViewportLine }
    length: number
    depthRange: number
    perspective: number
    fadeStart: number
    fadeEnd: number
    smoothing: number
    backgroundColor: string
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function InfiniteZoomCanvas(props: InfiniteZoomCanvasProps) {
    const {
        content = [],
        duplication = 13,
        seed = 5,
        placementZone = { radiusMin: 40, radiusMax: 320 },
        startAlign = "top",
        scrollUnit = "px",
        stickyRange = { start: "top", end: "bottom" },
        length = 4000,
        depthRange = 10000,
        perspective = 1450,
        fadeStart = 6100,
        fadeEnd = 4600,
        smoothing = 0.66,
        backgroundColor = "#EBF3F5",
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const startPositionRef = useRef<number>(0)
    const cardWrapperRefs = useRef<(HTMLDivElement | null)[]>([])
    const depthByCardRef = useRef<number[]>([])

    const contentCount = Array.isArray(content) ? content.length : 0
    const [cards, setCards] = useState<Card[]>(() =>
        initCards(
            Math.max(1, contentCount),
            Math.max(1, duplication),
            depthRange,
            seed,
            placementZone
        )
    )

    useEffect(() => {
        if (contentCount === 0) return
        setCards(
            initCards(
                Math.max(1, contentCount),
                Math.max(1, duplication),
                depthRange,
                seed,
                placementZone
            )
        )
    }, [
        contentCount,
        duplication,
        depthRange,
        seed,
        placementZone?.radiusMin,
        placementZone?.radiusMax,
    ])

    const scrollTargetRef = useRef(0)
    const scrollCurrentRef = useRef(0)
    const cameraZRef = useRef(0)
    const rafRef = useRef<number>(0)
    const [cameraZ, setCameraZ] = useState(0)

    const findStickyParent = useCallback(
        (el: HTMLElement): HTMLElement | null => {
            let current: HTMLElement | null = el
            while (current && current !== document.body) {
                if (window.getComputedStyle(current).position === "sticky")
                    return current
                current = current.parentElement
            }
            return null
        },
        []
    )

    const getOriginalPosition = useCallback(
        (el: HTMLElement): number => {
            const sticky = findStickyParent(el)
            const target = sticky || el
            const orig = target.style.position
            target.style.position = "static"
            const top =
                target.getBoundingClientRect().top +
                (window.pageYOffset || document.documentElement.scrollTop)
            target.style.position = orig
            return top
        },
        [findStickyParent]
    )

    // Ref + contentCount: without contentCount in deps, first paint with 0 items
    // skips listeners; when items appear the effect did not re-run and scroll stayed dead.
    // useLayoutEffect runs after the host div is committed so containerRef is set.
    useLayoutEffect(() => {
        if (contentCount === 0) return

        const computeStart = () => {
            const el = containerRef.current
            if (!el) return
            startPositionRef.current = getOriginalPosition(el)
        }
        if (
            scrollUnit === "px" &&
            RenderTarget.current() !== RenderTarget.canvas
        ) {
            computeStart()
        }

        const updateTargetFromScroll = () => {
            if (RenderTarget.current() === RenderTarget.canvas) {
                scrollTargetRef.current = 0
                scrollCurrentRef.current = 0
                return
            }
            let p = 0
            if (scrollUnit === "relative") {
                const el = containerRef.current
                if (!el) return
                const start = stickyRange?.start ?? "top"
                const end = stickyRange?.end ?? "bottom"
                p = scrollProgressFromStickyViewport(el, start, end)
            } else {
                const scrollY =
                    window.scrollY || document.documentElement.scrollTop
                const lenPx = Math.max(
                    1,
                    typeof length === "number" ? length : 1
                )
                const vh = window.innerHeight || 0
                const linePx =
                    startAlign === "center"
                        ? vh / 2
                        : startAlign === "bottom"
                          ? vh
                          : 0
                const startScrollY = startPositionRef.current - linePx
                p = clamp01((scrollY - startScrollY) / lenPx)
            }
            scrollTargetRef.current = p * depthRange
        }
        updateTargetFromScroll()

        if (RenderTarget.current() === RenderTarget.canvas) {
            return
        }

        const onScroll = () => requestAnimationFrame(updateTargetFromScroll)
        const onResize = () => {
            if (scrollUnit === "px") computeStart()
            updateTargetFromScroll()
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
        }
    }, [
        contentCount,
        length,
        startAlign,
        depthRange,
        scrollUnit,
        stickyRange?.start,
        stickyRange?.end,
        getOriginalPosition,
    ])

    useEffect(() => {
        const internalSmoothing = 0.05 + (1 - smoothing) * 0.95
        const animate = () => {
            if (RenderTarget.current() === RenderTarget.canvas) {
                scrollTargetRef.current = 0
                scrollCurrentRef.current = 0
                if (Math.abs(cameraZRef.current) > 0.01) {
                    cameraZRef.current = 0
                    setCameraZ(0)
                }
                rafRef.current = requestAnimationFrame(animate)
                return
            }
            scrollCurrentRef.current = lerp(
                scrollCurrentRef.current,
                scrollTargetRef.current,
                internalSmoothing
            )
            const newCameraZ = scrollCurrentRef.current
            if (Math.abs(newCameraZ - cameraZRef.current) > 0.01) {
                cameraZRef.current = newCameraZ
                setCameraZ(newCameraZ)
            }
            rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
    }, [smoothing])

    if (contentCount === 0) {
        return (
            <ComponentMessage
                title="Connect components"
                subtitle="Add components to fill this gallery. The component preserves each item's interactivity"
                style={{ width: "100%", height: "100%"}}
            />
        )
    }

    // Depth and opacity per card
    const cardState = cards.map((card) => {
        const depth = card.baseZ - cameraZ
        let opacity = 1
        if (depth > fadeStart + fadeEnd) opacity = 0
        else if (depth > fadeStart) opacity = 1 - (depth - fadeStart) / fadeEnd
        return { card, depth, opacity }
    })
    depthByCardRef.current = cardState.map((s) => s.depth)

    // Offset to keep all cards at Z >= 1 for hit-testing (browsers ignore Z <= 0)
    // We add this offset to depth, then subtract it via the container's translateZ
    const zOffset = Math.max(...cardState.map((s) => s.depth), 0) + 1

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                perspective: Math.max(1, perspective),
                perspectiveOrigin: "50% 50%",
                backgroundColor,
                ...style,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    transformStyle: "preserve-3d",
                    transform: `translateZ(${-zOffset}px)`,
                }}
            >
                {cardState.map(({ card, depth, opacity }, i) => {
                    const instance = content[card.contentIndex]
                    if (!instance) return null
                    // Card Z in container space: zOffset - depth (always >= 1)
                    // Container is moved back by -zOffset, so net visual Z = -depth (same as before)
                    const zPos = zOffset - depth
                    return (
                        <div
                            key={i}
                            ref={(el) => {
                                if (el) cardWrapperRefs.current[i] = el
                            }}
                            style={{
                                position: "absolute",
                                left: `${card.x}%`,
                                top: `${card.y}%`,
                                transform: `translate(-50%, -50%) translateZ(${zPos}px)`,
                                transformOrigin: "center center",
                                opacity,
                                pointerEvents: opacity > 0 ? "auto" : "none",
                                willChange: "transform, opacity",
                                backfaceVisibility: "hidden",
                            }}
                        >
                            {instance}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

InfiniteZoomCanvas.defaultProps = {
    content: [],
    duplication: 13,
    seed: 5,
    placementZone: { radiusMin: 40, radiusMax: 320 },
    startAlign: "top" as const,
    scrollUnit: "px" as const,
    stickyRange: { start: "top" as const, end: "bottom" as const },
    length: 4000,
    depthRange: 10000,
    perspective: 1450,
    fadeStart: 6100,
    fadeEnd: 4600,
    smoothing: 0.66,
    backgroundColor: "#EBF3F5",
}

addPropertyControls(InfiniteZoomCanvas, {
    content: {
        type: ControlType.Array,
        title: "Items",
        control: { type: ControlType.ComponentInstance },
        maxCount: 12,
    },
    scrollUnit: {
        type: ControlType.Enum,
        title: "Unit",
        options: ["px", "relative"],
        optionTitles: ["Px", "Relative"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "px",
    },
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "top",
        hidden: (props: InfiniteZoomCanvasProps) =>
            (props.scrollUnit ?? "px") !== "px",
    },
    length: {
        type: ControlType.Number,
        title: "Scroll For",
        min: 10,
        max: 30000,
        step: 100,
        defaultValue: 4000,
        unit: "px",
        displayStepper: false,
        hidden: (props: InfiniteZoomCanvasProps) =>
            (props.scrollUnit ?? "px") !== "px",
    },
    stickyRange: {
        type: ControlType.Object,
        title: "Sticky",
        description: "Controls the animation based on the sticky parent's scroll.",
        hidden: (props: InfiniteZoomCanvasProps) =>
            (props.scrollUnit ?? "px") !== "relative",
        controls: {
            start: {
                type: ControlType.Enum,
                title: "Start",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                defaultValue: "top",
                description: "When the sticky parent's top hits this line, the animation starts.",
            },
            end: {
                type: ControlType.Enum,
                title: "End",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                defaultValue: "bottom",
                description: "When the sticky parent's bottom hits this line, the animation ends.",
            },
        },
    },
    duplication: {
        type: ControlType.Number,
        title: "Duplicates",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 13,
    },
    seed: {
        type: ControlType.Number,
        title: "Seed",
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 5,
    },
    placementZone: {
        type: ControlType.Object,
        title: "Placement",
        controls: {
            radiusMin: {
                type: ControlType.Number,
                title: "Min",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 40,
                description: "No images inside this radius",
            },
            radiusMax: {
                type: ControlType.Number,
                title: "Max",
                min: 0,
                max: 500,
                step: 1,
                unit: "%",
                defaultValue: 320,
                description: "No images outside this radius",
            },
        },
    },
    
    depthRange: {
        type: ControlType.Number,
        title: "Depth",
        min: 1000,
        max: 10000,
        step: 100,
        defaultValue: 10000,
    },
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 200,
        max: 12000,
        step: 50,
        defaultValue: 1450,
        unit: "px",
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.66,
    },
    
    fadeStart: {
        type: ControlType.Number,
        title: "Fade Depth",
        min: 1000,
        max: 9000,
        step: 100,
        defaultValue: 6100,
    },
    fadeEnd: {
        type: ControlType.Number,
        title: "Fade Range",
        min: 0,
        max: 5000,
        step: 100,
        defaultValue: 4600,
        
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#EBF3F5",
        optional:true,
        description:"More components at [Framer University](https://frameruni.link/cc).",

    },
})

InfiniteZoomCanvas.displayName = "Infinite Zoom Canvas"
