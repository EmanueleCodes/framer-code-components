import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useCallback,
} from "react"
import { addPropertyControls, ControlType } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

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
        Math.max(0, Math.min(100, placementZone?.radiusMax ?? 100)) / 100
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
    length: number
    depthRange: number
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
        duplication = 2,
        seed = 0,
        placementZone = { radiusMin: 0, radiusMax: 100 },
        startAlign = "top",
        length = 2000,
        depthRange = 3000,
        fadeStart = 800,
        fadeEnd = 100,
        smoothing = 1,
        backgroundColor = "transparent",
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

    useEffect(() => {
        if (!containerRef.current) return
        const computeStart = () => {
            if (!containerRef.current) return
            startPositionRef.current = getOriginalPosition(containerRef.current)
        }
        computeStart()

        const updateTargetFromScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop
            const lenPx = Math.max(1, typeof length === "number" ? length : 1)
            const vh = window.innerHeight || 0
            const linePx =
                startAlign === "center"
                    ? vh / 2
                    : startAlign === "bottom"
                      ? vh
                      : 0
            const startScrollY = startPositionRef.current - linePx
            const p = clamp01((scrollY - startScrollY) / lenPx)
            scrollTargetRef.current = p * depthRange
        }
        updateTargetFromScroll()

        const onScroll = () => requestAnimationFrame(updateTargetFromScroll)
        const onResize = () => {
            computeStart()
            updateTargetFromScroll()
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onResize)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onResize)
        }
    }, [length, startAlign, depthRange, getOriginalPosition])

    useEffect(() => {
        const internalSmoothing = 0.05 + (1 - smoothing) * 0.95
        const animate = () => {
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
                style={{ width: "100%", height: "100%", backgroundColor, ...style }}
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
                perspective: 800,
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
    duplication: 2,
    seed: 0,
    placementZone: { radiusMin: 0, radiusMax: 100 },
    startAlign: "top" as const,
    length: 2000,
    depthRange: 3000,
    fadeStart: 800,
    fadeEnd: 100,
    smoothing: 1,
    backgroundColor: "transparent",
}

addPropertyControls(InfiniteZoomCanvas, {
    content: {
        type: ControlType.Array,
        title: "Items",
        control: { type: ControlType.ComponentInstance },
        maxCount: 12,
    },
    duplication: {
        type: ControlType.Number,
        title: "Duplicates",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 2,
    },
    seed: {
        type: ControlType.Number,
        title: "Seed",
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 0,
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
                defaultValue: 0,
                description: "No images inside this radius",
            },
            radiusMax: {
                type: ControlType.Number,
                title: "Max",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 100,
                description: "No images outside this radius",
            },
        },
    },
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        defaultValue: "top",
    },
    length: {
        type: ControlType.Number,
        title: "Scroll For",
        min: 10,
        max: 30000,
        step: 100,
        defaultValue: 2000,
        unit: "px",
        displayStepper: false,
    },
    depthRange: {
        type: ControlType.Number,
        title: "Depth",
        min: 1000,
        max: 10000,
        step: 100,
        defaultValue: 3000,
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "transparent",
    },
    fadeStart: {
        type: ControlType.Number,
        title: "Fade Depth",
        min: 1000,
        max: 9000,
        step: 100,
        defaultValue: 800,
    },
    fadeEnd: {
        type: ControlType.Number,
        title: "Fade Range",
        min: 0,
        max: 5000,
        step: 100,
        defaultValue: 400,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

InfiniteZoomCanvas.displayName = "Infinite Zoom Canvas"
