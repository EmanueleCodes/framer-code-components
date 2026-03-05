
import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"
import { animate } from "framer-motion"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Group,
    PlaneGeometry,
    MeshBasicMaterial,
    LineBasicMaterial,
    BufferGeometry,
    Line,
    Bone,
    Skeleton,
    SkinnedMesh,
    Float32BufferAttribute,
    Uint16BufferAttribute,
    CanvasTexture,
    FrontSide,
    BackSide,
    SRGBColorSpace,
    Vector3,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

/** Animation phase for entry transition */
type AnimationPhase = "idle" | "folding"

/** Transition config from Framer ControlType.Transition (tween + spring) */
interface TransitionConfig {
    type?: "tween" | "spring" | "keyframes" | "inertia"
    duration?: number
    ease?: string | number[]
    delay?: number
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
    restDelta?: number
    restSpeed?: number
}

const DEFAULT_BODY = `Thank you for this note — and for the work behind it. I've already spent some time with the new screensaver, and I genuinely find it enchanting.

It really stands out in the best possible way. In a web full of visual noise and disposable design, this feels calm, intentional, and remarkably refined. You can sense immediately that someone cared deeply about proportions, color, depth, and the things most people would never explicitly point out — but absolutely feel.`

const DEFAULT_GREETING = "Hey Atilla,"
const DEFAULT_CLOSING = "Warm regards,"
const DEFAULT_SIGNATURE = "Dominik"

const DEFAULT_BG_COLOR = "#ffffff"
const DEFAULT_TEXT_COLOR = "#333333"
const DEFAULT_SIGNATURE_COLOR = "#1a1a1a"

// Parse fontSize from Framer font - can be number or string like "47px"
function parseFontSize(fontSize: string | number | undefined): number | undefined {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") {
        const parsed = parseFloat(fontSize)
        return isNaN(parsed) ? undefined : parsed
    }
    return undefined
}

// Build a font descriptor for document.fonts.load() so the canvas uses the correct font
function fontToLoadDescriptor(font: React.CSSProperties | undefined, sizePx: number): string {
    if (!font?.fontFamily) return ""
    const style = (font.fontStyle as string) || "normal"
    const weight = font.fontWeight != null ? String(font.fontWeight) : "400"
    return `${style} ${weight} ${sizePx}px ${font.fontFamily}`
}

// Resolve Framer color tokens var(--x, fallback) to a usable color string for canvas
const cssVarFallbackRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/
function resolveColor(input: string | undefined): string {
    if (typeof input !== "string" || !input.trim()) return "#333333"
    const s = input.trim()
    if (s.startsWith("var(")) {
        const m = cssVarFallbackRegex.exec(s)
        const fallback = m?.[2]?.trim()
        return fallback && fallback !== s ? resolveColor(fallback) : "#333333"
    }
    // Framer often passes hex without # (e.g. "FFFFFF"); canvas needs "#" for hex
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`
    if (/^[0-9A-Fa-f]{8}$/.test(s)) return `#${s}`
    return s
}

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180
}

/** Build Framer Motion transition config from ControlType.Transition value */
function buildTransitionConfig(transitionValue: TransitionConfig | undefined): Record<string, unknown> {
    const config: Record<string, unknown> = {}
    if (!transitionValue) {
        config.type = "tween"
        config.duration = 0.4
        config.ease = "easeOut"
        return config
    }
    if (transitionValue.type === "spring") {
        config.type = "spring"
        // Springs support two modes:
        // 1. Time-based: duration + bounce (Framer calculates physics internally)
        // 2. Physics-based: stiffness + damping + mass
        // Time-based takes precedence if duration is provided
        if (transitionValue.duration !== undefined) {
            config.duration = transitionValue.duration
            if (transitionValue.bounce !== undefined) config.bounce = transitionValue.bounce
        } else {
            // Physics-based spring
            if (transitionValue.stiffness !== undefined) config.stiffness = transitionValue.stiffness
            if (transitionValue.damping !== undefined) config.damping = transitionValue.damping
            if (transitionValue.mass !== undefined) config.mass = transitionValue.mass
            if (transitionValue.bounce !== undefined) config.bounce = transitionValue.bounce
        }
        if (transitionValue.restDelta !== undefined) config.restDelta = transitionValue.restDelta
        if (transitionValue.restSpeed !== undefined) config.restSpeed = transitionValue.restSpeed
    } else {
        config.type = transitionValue.type || "tween"
        if (transitionValue.duration !== undefined) config.duration = transitionValue.duration
        if (transitionValue.ease !== undefined) config.ease = transitionValue.ease
    }
    return config
}

// Clone font object so we don't share Framer's reference (font picker mutates in place and affects all sections)
function cloneFont(font: React.CSSProperties | undefined): React.CSSProperties | undefined {
    if (!font || typeof font !== "object") return font
    return {
        fontFamily: font.fontFamily,
        fontWeight: font.fontWeight,
        fontStyle: font.fontStyle,
        fontSize: font.fontSize,
        lineHeight: font.lineHeight,
    }
}

interface TextureOptions {
    bgColor: string
    greetingColor: string
    bodyColor: string
    signatureColor: string
    greetingFont: React.CSSProperties | undefined
    bodyFont: React.CSSProperties | undefined
    signatureFont: React.CSSProperties | undefined
}

interface GreetingSection {
    text?: string
    font?: React.CSSProperties
    color?: string
}

interface BodySection {
    text?: string
    closing?: string
    font?: React.CSSProperties
    color?: string
}

interface SignatureSection {
    text?: string
    font?: React.CSSProperties
    color?: string
}

/** Single letter entry (one "side" of the card) */
interface LetterEntry {
    greeting?: GreetingSection
    body?: BodySection
    signature?: SignatureSection
    bgColor?: string
}

interface LetterTestimonialProps {
    /** 1-based index of the entry to show (like MorphIcons) */
    currentEntry?: number
    /** Array of letter content; each entry is one side */
    entries?: LetterEntry[]
    /** Axis for 180° flip when changing entry */
    flipAxis?: "horizontal" | "vertical"
    /** Direction of the 180° flip */
    flipDirection?: "front" | "back"
    /** 0.25–2: scale of the letter within the frame. 1 = fit container */
    letterSize?: number
    /** Fold/flip animation transition (duration, easing, spring, delay) */
    transition?: TransitionConfig
    style?: React.CSSProperties
}

// Paper dimensions (A4-ish aspect ratio)
const PAPER_WIDTH = 2.4
const PAPER_HEIGHT = 3.2
const SEGMENT_HEIGHT = PAPER_HEIGHT / 3  // Each of the 3 panels
const ANGLE_OPEN_DEG = 10
const ANGLE_CLOSED_DEG = 60

// Create plane geometry with skinning for 3 equal panels (Z-fold).
// Edges (from top to bottom of paper, viewing from front):
//   - 4th edge: top of paper (y = +halfH) - stays fixed
//   - Second edge: fold line at y = +halfH - segH (top/middle boundary)
//   - Third edge: fold line at y = +halfH - 2*segH (middle/bottom boundary)  
//   - First edge: bottom of paper (y = -halfH)
//
// Bones:
//   - b0: at 4th edge (top), controls top section - FIXED (no rotation)
//   - b1: at Second edge, controls middle section - rotates by θ
//   - b2: at Third edge, controls bottom section - rotates by -2θ (relative to b1)
function createLetterGeometry(width: number, height: number, forBackFace?: boolean) {
    // Use 6 height segments = 7 rows of vertices, ensuring fold lines have vertices on both sides
    const geometry = new PlaneGeometry(width, height, 1, 6)
    const pos = geometry.attributes.position
    const uv = geometry.attributes.uv
    const skinIndices: number[] = []
    const skinWeights: number[] = []
    
    const halfH = height / 2
    const segH = height / 3
    // Fold line Y positions (with small epsilon for floating point)
    const secondEdgeY = halfH - segH + 0.001   // between top and middle
    const thirdEdgeY = halfH - 2 * segH + 0.001 // between middle and bottom
    
    // For back face: flip V only to compensate for the 180° X-axis rotation during flip
    // BackSide rendering already handles the horizontal mirror from viewing behind the plane
    if (forBackFace) {
        for (let i = 0; i < uv.count; i++) {
            uv.setY(i, 1 - uv.getY(i))
        }
    }
    
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        // Assign each vertex to exactly one bone (no blending = sharp folds)
        // Vertices AT or ABOVE the fold line belong to the section above
        if (y > secondEdgeY) {
            // Top section (above Second edge): bone 0 - stays fixed
            skinIndices.push(0, 0, 0, 0)
            skinWeights.push(1, 0, 0, 0)
        } else if (y > thirdEdgeY) {
            // Middle section (between Second and Third edge): bone 1
            skinIndices.push(1, 0, 0, 0)
            skinWeights.push(1, 0, 0, 0)
        } else {
            // Bottom section (at or below Third edge): bone 2
            skinIndices.push(2, 0, 0, 0)
            skinWeights.push(1, 0, 0, 0)
        }
    }
    geometry.setAttribute(
        "skinIndex",
        new Uint16BufferAttribute(skinIndices, 4)
    )
    geometry.setAttribute(
        "skinWeight",
        new Float32BufferAttribute(skinWeights, 4)
    )
    geometry.computeVertexNormals()
    return geometry
}

// Create a canvas texture with text
function createTextTexture(
    greeting: string,
    body: string,
    closing: string,
    signature: string,
    options: TextureOptions
): InstanceType<typeof CanvasTexture> {
    const { bgColor, greetingColor, bodyColor, signatureColor, greetingFont, bodyFont, signatureFont } =
        options

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const scale = 2
    canvas.width = 512 * scale
    canvas.height = 682 * scale

    ctx.fillStyle = resolveColor(bgColor)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Greeting font (fallback to body font)
    const greetingFontRes = greetingFont ?? bodyFont
    const greetingFontFamily = (greetingFontRes?.fontFamily as string) || "Inter, system-ui, sans-serif"
    const greetingFontWeight = greetingFontRes?.fontWeight != null ? String(greetingFontRes.fontWeight) : "400"
    const greetingFontStyle = (greetingFontRes?.fontStyle as string) || "normal"
    const greetingFontSizeRaw = parseFontSize(greetingFontRes?.fontSize as string | number | undefined)
    const greetingFontSize = (greetingFontSizeRaw ?? 18) * scale

    // Extract font properties from Framer font controls
    const bodyFontFamily = (bodyFont?.fontFamily as string) || "Inter, system-ui, sans-serif"
    const bodyFontWeight = bodyFont?.fontWeight != null ? String(bodyFont.fontWeight) : "400"
    const bodyFontStyle = (bodyFont?.fontStyle as string) || "normal"
    
    // Parse fontSize - Framer can return number or string like "14px"
    const bodyFontSizeRaw = parseFontSize(bodyFont?.fontSize as string | number | undefined)
    const bodyFontSize = bodyFontSizeRaw ?? 14

    const padding = 48 * scale
    // Use lineHeight from font if available, otherwise calculate from fontSize
    const lineHeightRaw = bodyFont?.lineHeight
    let lineHeight: number
    if (typeof lineHeightRaw === "number") {
        lineHeight = lineHeightRaw * scale
    } else if (typeof lineHeightRaw === "string" && lineHeightRaw.endsWith("%")) {
        lineHeight = (parseFloat(lineHeightRaw) / 100) * bodyFontSize * scale
    } else {
        lineHeight = bodyFontSize * 1.6 * scale
    }
    
    let y = padding + 32 * scale

    // Greeting (uses greeting font or body font)
    ctx.fillStyle = resolveColor(greetingColor)
    ctx.font = `${greetingFontStyle} ${greetingFontWeight} ${greetingFontSize}px ${greetingFontFamily}`
    ctx.fillText(greeting, padding, y)
    y += lineHeight * 1.8

    // Body text
    const bodySize = bodyFontSize * scale
    ctx.fillStyle = resolveColor(bodyColor)
    ctx.font = `${bodyFontStyle} ${bodyFontWeight} ${bodySize}px ${bodyFontFamily}`
    const maxWidth = canvas.width - padding * 2
    const words = body.split(" ")
    let line = ""

    for (const word of words) {
        const testLine = line + word + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line !== "") {
            ctx.fillText(line.trim(), padding, y)
            line = word + " "
            y += lineHeight
        } else {
            line = testLine
        }
    }
    if (line.trim()) {
        ctx.fillText(line.trim(), padding, y)
        y += lineHeight
    }

    // Closing
    y += lineHeight * 0.8
    ctx.fillStyle = resolveColor(bodyColor)
    ctx.font = `${bodyFontStyle} ${bodyFontWeight} ${bodySize}px ${bodyFontFamily}`
    ctx.fillText(closing, padding, y)

    // Signature
    y += lineHeight * 2.2
    ctx.fillStyle = resolveColor(signatureColor)
    const sigFontFamily = (signatureFont?.fontFamily as string) || "Georgia, \"Times New Roman\", serif"
    const sigFontWeight = signatureFont?.fontWeight != null ? String(signatureFont.fontWeight) : "500"
    const sigFontStyle = (signatureFont?.fontStyle as string) || "italic"
    const sigFontSizeRaw = parseFontSize(signatureFont?.fontSize as string | number | undefined)
    const sigFontSize = (sigFontSizeRaw ?? 26) * scale
    ctx.font = `${sigFontStyle} ${sigFontWeight} ${sigFontSize}px ${sigFontFamily}`
    ctx.fillText(signature, padding, y)

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
}

/** Resolve a LetterEntry to flat values and TextureOptions for createTextTexture */
function entryToTextureInputs(entry: LetterEntry | undefined): {
    greeting: string
    body: string
    closing: string
    signature: string
    options: TextureOptions
} {
    const g = entry?.greeting
    const b = entry?.body
    const s = entry?.signature
    const bgColor = entry?.bgColor ?? DEFAULT_BG_COLOR
    const greeting = g?.text ?? DEFAULT_GREETING
    const bodyText = b?.text ?? DEFAULT_BODY
    const closing = b?.closing ?? DEFAULT_CLOSING
    const signature = s?.text ?? DEFAULT_SIGNATURE
    const greetingFont = cloneFont(g?.font ?? b?.font)
    const bodyFont = cloneFont(b?.font)
    const signatureFont = cloneFont(s?.font)
    const greetingColor = g?.color ?? DEFAULT_TEXT_COLOR
    const bodyColor = b?.color ?? DEFAULT_TEXT_COLOR
    const signatureColor = s?.color ?? DEFAULT_SIGNATURE_COLOR
    return {
        greeting,
        body: bodyText,
        closing,
        signature,
        options: {
            bgColor,
            greetingColor,
            bodyColor,
            signatureColor,
            greetingFont,
            bodyFont,
            signatureFont,
        },
    }
}

/** Create a canvas texture for a given letter entry. */
function createTextureForEntry(
    entry: LetterEntry | undefined
): InstanceType<typeof CanvasTexture> {
    const { greeting, body, closing, signature, options } = entryToTextureInputs(entry)
    return createTextTexture(greeting, body, closing, signature, options)
}

/** Create a blank texture (e.g. for the back of the card during flip so we don't show flipped content). */
function createEmptyTexture(bgColor: string = DEFAULT_BG_COLOR): InstanceType<typeof CanvasTexture> {
    const scale = 2
    const canvas = document.createElement("canvas")
    canvas.width = 512 * scale
    canvas.height = 682 * scale
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = resolveColor(bgColor)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
}

/**
 * 3D folding letter with text and signature. Uses Three.js (CDN) for realistic paper fold.
 * Supports multiple entries; changing entry animates fold/unfold while flipping 180° across full duration.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 533
 */
export default function LetterTestimonial(props: LetterTestimonialProps) {
    const {
        currentEntry: currentEntryProp = 1,
        entries: entriesProp = [],
        flipAxis = "horizontal",
        flipDirection = "front",
        letterSize = 1,
        transition: transitionProp = {
            type: "tween",
            duration: 0.8,
            ease: "easeOut",
        },
        style,
    } = props

    const letterSizeRef = useRef(letterSize)
    letterSizeRef.current = letterSize
    const foldAnimationRef = useRef<ReturnType<typeof animate> | null>(null)

    // Normalize entries: ensure at least one, default two for testing
    const entries: LetterEntry[] =
        entriesProp?.length > 0
            ? entriesProp
            : [
                  {
                      greeting: { text: DEFAULT_GREETING },
                      body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                      signature: { text: DEFAULT_SIGNATURE },
                      bgColor: DEFAULT_BG_COLOR,
                  },
                  {
                      greeting: { text: "Hi again," },
                      body: {
                          text: "This is the second side of the letter. You can add more entries in the Entries array.",
                          closing: "Cheers,",
                      },
                      signature: { text: "The Team" },
                      bgColor: DEFAULT_BG_COLOR,
                  },
              ]
    const entriesLength = entries.length
    const currentEntry = Math.max(1, Math.min(currentEntryProp, entriesLength))
    const currentIndex = currentEntry - 1
    const nextIndex = currentEntry % entriesLength

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<InstanceType<typeof Scene> | null>(null)
    const cameraRef = useRef<InstanceType<typeof PerspectiveCamera> | null>(null)
    const rendererRef = useRef<InstanceType<typeof WebGLRenderer> | null>(null)
    const frontMeshRef = useRef<InstanceType<typeof SkinnedMesh> | null>(null)
    const backMeshRef = useRef<InstanceType<typeof SkinnedMesh> | null>(null)
    const frontBonesRef = useRef<InstanceType<typeof Bone>[]>([])
    const backBonesRef = useRef<InstanceType<typeof Bone>[]>([])
    const thetaRef = useRef(0)
    const flipAngleRef = useRef(0)
    const frameRef = useRef<number>(0)
    const prevEntryRef = useRef(currentEntry)
    const phaseRef = useRef<AnimationPhase>("idle")

    // Debug: fold / unfold / flip progress 0–100 (for debug panel)
    const [debugProgress, setDebugProgress] = useState({
        fold: 0,
        unfold: 0,
        flip: 0,
        flipAngleDeg: 0,
    })

    // Which entry is currently shown (updates when flip animation completes)
    const [displayedEntry, setDisplayedEntry] = useState(currentEntry)

    const [textures, setTextures] = useState<{
        front: InstanceType<typeof CanvasTexture> | null
        back: InstanceType<typeof CanvasTexture> | null
    }>({ front: null, back: null })

    const currentInputs = entryToTextureInputs(entries[currentIndex])
    const nextInputs = entryToTextureInputs(entries[nextIndex])
    const displayedIndex = displayedEntry - 1
    const frontEntryIndex = displayedIndex
    const backEntryIndex =
        displayedEntry === currentEntry ? nextIndex : currentIndex

    const frontInputs = entryToTextureInputs(entries[frontEntryIndex])
    const backInputs = entryToTextureInputs(entries[backEntryIndex])

    const fontKeys = [
        frontInputs.options.greetingFont,
        frontInputs.options.bodyFont,
        frontInputs.options.signatureFont,
        backInputs.options.greetingFont,
        backInputs.options.bodyFont,
        backInputs.options.signatureFont,
    ]
        .filter(Boolean)
        .map((f) =>
            f
                ? `${(f as React.CSSProperties).fontFamily ?? ""}-${(f as React.CSSProperties).fontWeight ?? ""}-${(f as React.CSSProperties).fontSize ?? ""}`
                : ""
        )
        .join("|")

    useEffect(() => {
        const descriptors: string[] = []
        const addDesc = (opts: TextureOptions, size: number) => {
            const d = fontToLoadDescriptor(opts.greetingFont ?? opts.bodyFont, size)
            if (d) descriptors.push(d)
            const d2 = fontToLoadDescriptor(opts.bodyFont, 14)
            if (d2) descriptors.push(d2)
            const d3 = fontToLoadDescriptor(opts.signatureFont, 26)
            if (d3) descriptors.push(d3)
        }
        addDesc(frontInputs.options, 18)
        addDesc(backInputs.options, 18)

        const createBoth = () => {
            const front = createTextureForEntry(entries[frontEntryIndex])
            const back = createTextureForEntry(entries[backEntryIndex])
            setTextures((prev) => {
                if (prev.front) prev.front.dispose()
                if (prev.back) prev.back.dispose()
                return { front, back }
            })
        }

        const uniqueDescriptors = [...new Set(descriptors)]
        if (uniqueDescriptors.length === 0) {
            createBoth()
            return
        }
        Promise.all(uniqueDescriptors.map((d) => document.fonts.load(d)))
            .then(createBoth)
            .catch(createBoth)
    }, [frontEntryIndex, backEntryIndex, entriesLength, fontKeys, displayedEntry])

    const angleOpenRad = degToRad(ANGLE_OPEN_DEG)
    const angleClosedRad = degToRad(ANGLE_CLOSED_DEG)
    const transitionKey = transitionProp
        ? `${transitionProp.type ?? "tween"}-${transitionProp.duration ?? ""}-${transitionProp.ease ?? ""}-${transitionProp.delay ?? ""}-${transitionProp.stiffness ?? ""}-${transitionProp.damping ?? ""}`
        : ""

    // Single smooth animation: one progress 0→1 drives flip for full duration,
    // while fold and unfold each take half of the total duration.
    useEffect(() => {
        const prev = prevEntryRef.current

        if (prev === currentEntry) {
            if (phaseRef.current === "idle") {
                foldAnimationRef.current?.stop()
                const config = buildTransitionConfig(transitionProp)
                foldAnimationRef.current = animate(thetaRef.current, angleOpenRad, {
                    ...config,
                    delay: transitionProp?.delay ?? 0,
                    onUpdate: (v) => {
                        thetaRef.current = v
                    },
                })
            }
            return () => {
                foldAnimationRef.current?.stop()
            }
        }

        phaseRef.current = "folding"
        const config = buildTransitionConfig(transitionProp)

        foldAnimationRef.current?.stop()
        foldAnimationRef.current = animate(0, 1, {
            ...config,
            delay: transitionProp?.delay ?? 0,
            onUpdate: (p) => {
                // Flip continuously over full progress (0→π),
                // fold during first half, unfold during second half.
                const clampedProgress = Math.max(0, Math.min(1, p))
                const flipAngle = Math.PI * clampedProgress

                let theta: number
                let foldPct: number
                let unfoldPct: number
                if (clampedProgress <= 0.5) {
                    const foldT = clampedProgress / 0.5
                    theta = angleOpenRad + (angleClosedRad - angleOpenRad) * foldT
                    foldPct = Math.round(foldT * 100)
                    unfoldPct = 0
                } else {
                    const unfoldT = (clampedProgress - 0.5) / 0.5
                    theta = angleClosedRad + (angleOpenRad - angleClosedRad) * unfoldT
                    foldPct = 100
                    unfoldPct = Math.round(unfoldT * 100)
                }

                thetaRef.current = theta
                flipAngleRef.current = flipAngle
                setDebugProgress({
                    fold: foldPct,
                    unfold: unfoldPct,
                    flip: Math.round(clampedProgress * 100),
                    flipAngleDeg: Math.round((flipAngle * 180) / Math.PI),
                })
            },
            onComplete: () => {
                phaseRef.current = "idle"
                prevEntryRef.current = currentEntry
                flipAngleRef.current = 0
                thetaRef.current = angleOpenRad  // snap to exact open angle to avoid jump
                setDisplayedEntry(currentEntry)
                setDebugProgress({ fold: 0, unfold: 100, flip: 0, flipAngleDeg: 0 })
            },
        })
        return () => {
            foldAnimationRef.current?.stop()
        }
    }, [currentEntry, angleOpenRad, angleClosedRad, transitionKey])

    useEffect(() => {
        const container = containerRef.current
        const textureFront = textures.front
        const textureBack = textures.back
        if (!container || !textureFront || !textureBack) return

        const scene = new Scene()
        sceneRef.current = scene

        const camera = new PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0, 5)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        const renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const halfH = PAPER_HEIGHT / 2
        const segH = SEGMENT_HEIGHT
        
        // Create front-facing geometry and bones
        const frontGeometry = createLetterGeometry(PAPER_WIDTH, PAPER_HEIGHT, false)
        
        const fb0 = new Bone()
        fb0.position.set(0, halfH, 0)
        const fb1 = new Bone()
        fb1.position.set(0, halfH - segH, 0)
        const fb2 = new Bone()
        fb2.position.set(0, halfH - 2 * segH, 0)
        const frontBones = [fb0, fb1, fb2]
        frontBonesRef.current = frontBones

        const frontSkeleton = new Skeleton(frontBones)
        const frontMaterial = new MeshBasicMaterial({
            map: textureFront,
            side: FrontSide,
        })
        const frontMesh = new SkinnedMesh(frontGeometry, frontMaterial)
        frontMesh.frustumCulled = false
        frontMesh.add(fb0)
        frontMesh.add(fb1)
        frontMesh.add(fb2)
        frontMesh.bind(frontSkeleton)
        frontMeshRef.current = frontMesh

        // Create back-facing geometry and bones (with flipped UVs)
        const backGeometry = createLetterGeometry(PAPER_WIDTH, PAPER_HEIGHT, true)
        
        const bb0 = new Bone()
        bb0.position.set(0, halfH, 0)
        const bb1 = new Bone()
        bb1.position.set(0, halfH - segH, 0)
        const bb2 = new Bone()
        bb2.position.set(0, halfH - 2 * segH, 0)
        const backBones = [bb0, bb1, bb2]
        backBonesRef.current = backBones

        const backSkeleton = new Skeleton(backBones)
        const backMaterial = new MeshBasicMaterial({
            map: textureBack,
            side: BackSide,
        })
        const backMesh = new SkinnedMesh(backGeometry, backMaterial)
        backMesh.frustumCulled = false
        backMesh.add(bb0)
        backMesh.add(bb1)
        backMesh.add(bb2)
        backMesh.bind(backSkeleton)
        backMeshRef.current = backMesh

        // Nested groups so flip rotation happens around the recentered hinge/pivot.
        // - letterGroup: receives per-frame position offset from folding geometry.
        // - flipGroup: applies the 180deg entry-change rotation around that pivot.
        const flipGroup = new Group()
        const letterGroup = new Group()
        letterGroup.add(frontMesh)
        letterGroup.add(backMesh)
        flipGroup.add(letterGroup)
        scene.add(flipGroup)

        // DEBUG: Add colored lines at each edge to visualize fold structure
        const halfW = PAPER_WIDTH / 2
        const edgeLines: InstanceType<typeof Line>[] = []
        
        const createEdgeLine = (yLocal: number, color: number, bone: InstanceType<typeof Bone>) => {
            const lineGeom = new BufferGeometry().setFromPoints([
                new Vector3(-halfW, yLocal, 0.01),
                new Vector3(halfW, yLocal, 0.01),
            ])
            const lineMat = new LineBasicMaterial({ color, linewidth: 3 })
            const line = new Line(lineGeom, lineMat)
            bone.add(line)
            edgeLines.push(line)
            return line
        }
        
        createEdgeLine(0, 0xff0000, fb0)  // RED - 4th edge
        createEdgeLine(0, 0x00ff00, fb1)  // GREEN - Second edge
        createEdgeLine(0, 0x0000ff, fb2)  // BLUE - Third edge
        createEdgeLine(-segH, 0xffff00, fb2)  // YELLOW - First edge

        const resize = () => {
            if (!container || !camera || !renderer) return
            const w = container.clientWidth
            const h = container.clientHeight
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
        }

        resize()
        window.addEventListener("resize", resize)

        const cameraDistance = 5
        const visibleHeightAtOrigin = 2 * cameraDistance * Math.tan((45 / 2) * (Math.PI / 180))

        const b0BindY = halfH
        const b1BindY = halfH - segH
        const b2BindY = halfH - 2 * segH
        
        let lastTime = performance.now()
        let lastW = 0
        let lastH = 0
        const animateLoop = () => {
            frameRef.current = requestAnimationFrame(animateLoop)

            const w = container.clientWidth
            const h = container.clientHeight
            if (w !== lastW || h !== lastH) {
                lastW = w
                lastH = h
                if (w > 0 && h > 0 && camera) {
                    camera.aspect = w / h
                    camera.updateProjectionMatrix()
                }
                if (renderer) renderer.setSize(w, h)
            }

            const now = performance.now()
            lastTime = now

            const theta = thetaRef.current

            // Update front bones
            fb0.rotation.x = -theta
            fb0.position.set(0, b0BindY, 0)
            
            const secondEdgeY = b0BindY - segH * Math.cos(theta)
            const secondEdgeZ = segH * Math.sin(theta)
            
            fb1.rotation.x = theta
            fb1.position.set(0, secondEdgeY, secondEdgeZ)
            
            const thirdEdgeY = secondEdgeY - segH * Math.cos(theta)
            const thirdEdgeZ = secondEdgeZ - segH * Math.sin(theta)
            
            fb2.rotation.x = -theta
            fb2.position.set(0, thirdEdgeY, thirdEdgeZ)
            
            // Update back bones identically
            bb0.rotation.x = -theta
            bb0.position.set(0, b0BindY, 0)
            bb1.rotation.x = theta
            bb1.position.set(0, secondEdgeY, secondEdgeZ)
            bb2.rotation.x = -theta
            bb2.position.set(0, thirdEdgeY, thirdEdgeZ)
            
            if (frontMeshRef.current?.skeleton) frontMeshRef.current.skeleton.update()
            if (backMeshRef.current?.skeleton) backMeshRef.current.skeleton.update()

            // Flip around the true hinge center on the middle panel:
            // midpoint between the second and third fold edges.
            const centerY = (fb1.position.y + fb2.position.y) / 2
            const centerZ = (fb1.position.z + fb2.position.z) / 2
            letterGroup.position.set(0, -centerY, -centerZ)

            const flipAngle = flipAngleRef.current
            const flipSign = flipDirection === "back" ? -1 : 1
            flipGroup.rotation.x = flipAxis === "horizontal" ? flipAngle * flipSign : 0
            flipGroup.rotation.y = flipAxis === "vertical" ? flipAngle * flipSign : 0

            const aspect = w > 0 && h > 0 ? w / h : 1
            const visibleWidthAtOrigin = aspect * visibleHeightAtOrigin
            const scaleToFit = Math.min(
                visibleWidthAtOrigin / PAPER_WIDTH,
                visibleHeightAtOrigin / PAPER_HEIGHT
            )
            const scale = scaleToFit * letterSizeRef.current
            flipGroup.scale.setScalar(scale)

            renderer.render(scene, camera)
        }
        animateLoop()

        return () => {
            window.removeEventListener("resize", resize)
            cancelAnimationFrame(frameRef.current)
            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement)
            }
            renderer.dispose()
            frontGeometry.dispose()
            backGeometry.dispose()
            sceneRef.current = null
            cameraRef.current = null
            rendererRef.current = null
            frontMeshRef.current = null
            backMeshRef.current = null
            frontBonesRef.current = []
            backBonesRef.current = []
        }
    }, [textures.front, textures.back, flipAxis, flipDirection])

    return (
        <>
            <div
                ref={containerRef}
                style={{
                    ...style,
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                }}
            />
            <div
                style={{
                    position: "fixed",
                    top: 12,
                    left: 12,
                    zIndex: 9999,
                    padding: "10px 14px",
                    background: "rgba(0,0,0,0.85)",
                    color: "#e0e0e0",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    borderRadius: 8,
                    lineHeight: 1.5,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: 6, color: "#fff" }}>
                    Animation progress
                </div>
                <div>Fold progress: {debugProgress.fold}/100</div>
                <div>Unfold progress: {debugProgress.unfold}/100</div>
                <div>Flip progress: {debugProgress.flip}/100</div>
                <div>Flip angle: {debugProgress.flipAngleDeg}°</div>
            </div>
        </>
    )
}

LetterTestimonial.displayName = "Letter Testimonial"

addPropertyControls(LetterTestimonial, {
    currentEntry: {
        type: ControlType.Number,
        title: "Entry",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 1,
        displayStepper: true,
        description: "Which entry to show (1-based). Changing triggers fold-flip-unfold.",
    },
    flipAxis: {
        type: ControlType.Enum,
        title: "Flip axis",
        options: ["horizontal", "vertical"],
        optionTitles: ["Horizontal (up/down)", "Vertical (left/right)"],
        defaultValue: "horizontal",
    },
    flipDirection: {
        type: ControlType.Enum,
        title: "Flip direction",
        options: ["front", "back"],
        optionTitles: ["Front flip", "Back flip"],
        defaultValue: "front",
    },
    letterSize: {
        type: ControlType.Number,
        title: "Letter size",
        defaultValue: 1,
        min: 0.25,
        max: 2,
        step: 0.05,
        displayStepper: true,
        description: "Scale of the letter in the frame. 1 = fit container",
    },
    transition: {
        type: ControlType.Transition,
        title: "Fold transition",
        defaultValue: {
            type: "tween",
            duration: 0.8,
            ease: "easeOut",
        },
    },
    entries: {
        type: ControlType.Array,
        title: "Entries",
        control: {
            type: ControlType.Object,
            controls: {
                greeting: {
                    type: ControlType.Object,
                    title: "Greeting",
                    controls: {
                        text: {
                            type: ControlType.String,
                            title: "Text",
                            defaultValue: DEFAULT_GREETING,
                        },
                        font: {
                            type: ControlType.Font,
                            title: "Font",
                            controls: "extended",
                            defaultFontType: "sans-serif",
                            defaultValue: {
                                fontSize: 18,
                                // @ts-ignore — Framer font control accepts fontFamily at runtime
                                fontFamily: "Inter, system-ui, sans-serif",
                                fontWeight: "400",
                            },
                        },
                        color: {
                            type: ControlType.Color,
                            title: "Color",
                            defaultValue: DEFAULT_TEXT_COLOR,
                        },
                    },
                },
                body: {
                    type: ControlType.Object,
                    title: "Body",
                    controls: {
                        text: {
                            type: ControlType.String,
                            title: "Text",
                            defaultValue: DEFAULT_BODY,
                            displayTextArea: true,
                        },
                        closing: {
                            type: ControlType.String,
                            title: "Closing",
                            defaultValue: DEFAULT_CLOSING,
                        },
                        font: {
                            type: ControlType.Font,
                            title: "Font",
                            controls: "extended",
                            defaultFontType: "sans-serif",
                            defaultValue: {
                                fontSize: 14,
                                // @ts-ignore — Framer font control accepts fontFamily at runtime
                                fontFamily: "Inter, system-ui, sans-serif",
                                fontWeight: "400",
                            },
                        },
                        color: {
                            type: ControlType.Color,
                            title: "Color",
                            defaultValue: DEFAULT_TEXT_COLOR,
                        },
                    },
                },
                signature: {
                    type: ControlType.Object,
                    title: "Signature",
                    controls: {
                        text: {
                            type: ControlType.String,
                            title: "Text",
                            defaultValue: DEFAULT_SIGNATURE,
                        },
                        font: {
                            type: ControlType.Font,
                            title: "Font",
                            controls: "extended",
                            defaultFontType: "sans-serif",
                            defaultValue: {
                                fontSize: 26,
                                // @ts-ignore — Framer font control accepts fontFamily at runtime
                                fontFamily: "Georgia, \"Times New Roman\", serif",
                                fontStyle: "italic",
                                fontWeight: "500",
                            },
                        },
                        color: {
                            type: ControlType.Color,
                            title: "Color",
                            defaultValue: DEFAULT_SIGNATURE_COLOR,
                        },
                    },
                },
                bgColor: {
                    type: ControlType.Color,
                    title: "Bg color",
                    defaultValue: DEFAULT_BG_COLOR,
                },
            },
        },
        defaultValue: [
            {
                greeting: { text: DEFAULT_GREETING },
                body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                signature: { text: DEFAULT_SIGNATURE },
                bgColor: DEFAULT_BG_COLOR,
            },
            {
                greeting: { text: "Hi again," },
                body: {
                    text: "This is the second side of the letter.",
                    closing: "Cheers,",
                },
                signature: { text: "The Team" },
                bgColor: DEFAULT_BG_COLOR,
            },
        ],
    },
})
