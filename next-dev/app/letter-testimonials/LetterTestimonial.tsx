import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"
import { animate } from "framer-motion"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Group,
    PlaneGeometry,
    MeshStandardMaterial,
    Mesh,
    Bone,
    Skeleton,
    SkinnedMesh,
    Float32BufferAttribute,
    Uint16BufferAttribute,
    CanvasTexture,
    FrontSide,
    BackSide,
    SRGBColorSpace,
    DirectionalLight,
    AmbientLight,
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

const DEFAULT_BODY = `Framer has completely changed how we design and ship. The combination of visual design and code is exactly what our team needed — we ship faster and the quality is incredible.

Everything feels intentional: the layout engine, the way components connect, and how it all deploys. It's rare that a tool actually makes you better at your job.`

const DEFAULT_GREETING = "Hey Nandi,"
const DEFAULT_CLOSING = "Warm regards,"
const DEFAULT_SIGNATURE = "Prianca"

const DEFAULT_BG_COLOR = "#ffffff"
const DEFAULT_TEXT_COLOR = "#333333"
const DEFAULT_SIGNATURE_COLOR = "#1a1a1a"

// Hardcoded lighting/material
const EMISSIVE_INTENSITY = 0.15
const ROUGHNESS = 1
const LIGHT_POSITION_X = -1.3
const LIGHT_POSITION_Y = 1.3
const LIGHT_POSITION_Z = 4

// Paper self-shadow: one control 0–1 drives ambient + directional intensity (more shadow = less ambient, more directional)
const AMBIENT_FLAT = 1.4
const AMBIENT_SHADOW = 0.55
const DIRECTIONAL_FLAT = 0.8
const DIRECTIONAL_SHADOW = 2.5
function paperShadowToIntensities(paperShadow: number): {
    ambient: number
    directional: number
} {
    const t = Math.max(0, Math.min(1, paperShadow))
    return {
        ambient: AMBIENT_FLAT + t * (AMBIENT_SHADOW - AMBIENT_FLAT),
        directional:
            DIRECTIONAL_FLAT + t * (DIRECTIONAL_SHADOW - DIRECTIONAL_FLAT),
    }
}

// Parse fontSize from Framer font - can be number or string like "47px"
function parseFontSize(
    fontSize: string | number | undefined
): number | undefined {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") {
        const parsed = parseFloat(fontSize)
        return isNaN(parsed) ? undefined : parsed
    }
    return undefined
}

/** Parse letterSpacing from Framer font (e.g. "0em", "0.02em", "1px") to pixels. */
function parseLetterSpacing(
    letterSpacing: string | number | undefined,
    fontSizePx: number
): number {
    if (letterSpacing === undefined || letterSpacing === null) return 0
    if (typeof letterSpacing === "number") return letterSpacing
    const s = String(letterSpacing).trim()
    if (!s) return 0
    if (s.endsWith("em")) {
        const val = parseFloat(s)
        return isNaN(val) ? 0 : val * fontSizePx
    }
    if (s.endsWith("px")) {
        const val = parseFloat(s)
        return isNaN(val) ? 0 : val
    }
    const val = parseFloat(s)
    return isNaN(val) ? 0 : val
}

// Build a font descriptor for document.fonts.load() so the canvas uses the correct font
function fontToLoadDescriptor(
    font: React.CSSProperties | undefined,
    sizePx: number
): string {
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

/** Convert resolved CSS color string to Three.js hex number (e.g. "#ffffff" → 0xffffff). */
function resolvedColorToHex(resolved: string): number {
    const hexMatch = resolved.match(/^#?([0-9A-Fa-f]{6})/)
    if (hexMatch) return parseInt(hexMatch[1], 16)
    return 0xffffff
}

/** Convert CSS box-shadow string to filter: drop-shadow() for use on canvas (no spread). */
function boxShadowToDropShadow(boxShadow: string | undefined): string {
    if (!boxShadow || !boxShadow.trim()) return "none"
    const s = boxShadow.trim()
    const colorMatch = s.match(
        /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b(?=\s*$))/i
    )
    const color = colorMatch ? colorMatch[0] : "rgba(0,0,0,0.35)"
    const numbers = s.match(/-?\d+(\.\d+)?(px)?/g)
    if (!numbers || numbers.length < 3) return "none"
    const vals = numbers.map((n) => parseFloat(n))
    const x = vals[0] ?? 0
    const y = vals[1] ?? 4
    const blur = vals[2] ?? 24
    return `drop-shadow(${x}px ${y}px ${blur}px ${color})`
}

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180
}

/** Whether the front mesh (FrontSide) is currently facing the camera, based only on flip angle. */
function isFrontMeshFacingCamera(flipAngle: number): boolean {
    const twoPi = 2 * Math.PI
    const mod = ((flipAngle % twoPi) + twoPi) % twoPi
    return mod < 0.01 || mod > twoPi - 0.01
}

/** Build Framer Motion transition config from ControlType.Transition value */
function buildTransitionConfig(
    transitionValue: TransitionConfig | undefined
): Record<string, unknown> {
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
            if (transitionValue.bounce !== undefined)
                config.bounce = transitionValue.bounce
        } else {
            // Physics-based spring
            if (transitionValue.stiffness !== undefined)
                config.stiffness = transitionValue.stiffness
            if (transitionValue.damping !== undefined)
                config.damping = transitionValue.damping
            if (transitionValue.mass !== undefined)
                config.mass = transitionValue.mass
            if (transitionValue.bounce !== undefined)
                config.bounce = transitionValue.bounce
        }
        if (transitionValue.restDelta !== undefined)
            config.restDelta = transitionValue.restDelta
        if (transitionValue.restSpeed !== undefined)
            config.restSpeed = transitionValue.restSpeed
    } else {
        config.type = transitionValue.type || "tween"
        if (transitionValue.duration !== undefined)
            config.duration = transitionValue.duration
        if (transitionValue.ease !== undefined)
            config.ease = transitionValue.ease
    }
    return config
}

// Clone font object so we don't share Framer's reference (font picker mutates in place and affects all sections)
function cloneFont(
    font: React.CSSProperties | undefined
): React.CSSProperties | undefined {
    if (!font || typeof font !== "object") return font
    return {
        fontFamily: font.fontFamily,
        fontWeight: font.fontWeight,
        fontStyle: font.fontStyle,
        fontSize: font.fontSize,
        lineHeight: font.lineHeight,
        textAlign: font.textAlign,
        letterSpacing: font.letterSpacing,
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
}

interface BodySection {
    text?: string
    closing?: string
}

interface SignatureSection {
    text?: string
}

/** Single letter entry (one "side" of the card) */
interface LetterEntry {
    greeting?: GreetingSection
    body?: BodySection
    signature?: SignatureSection
}

interface LetterTestimonialProps {
    /** 1-based index of the entry to show (like MorphIcons) */
    currentEntry?: number
    /** Array of letter content; each entry is one side */
    entries?: LetterEntry[]
    /** Direction of the 180° flip */
    flipDirection?: "front" | "back"
    /** 0.25–2: scale of the letter within the frame. 1 = fit container */
    letterSize?: number
    /** Fold/flip animation transition (duration, easing, spring, delay) */
    transition?: TransitionConfig
    /** Box shadow (drop-shadow on canvas) and paper self-shadow (depth). */
    shadows?: { boxShadow?: string; paperShadow?: number }
    /** Letter paper color (overrides per-entry bgColor when set). */
    letterPaperColor?: string
    /** Global body font (greeting + body text). */
    bodyFont?: React.CSSProperties
    /** Global body text color. */
    bodyColor?: string
    /** Global signature font. */
    signatureFont?: React.CSSProperties
    /** Global signature color. */
    signatureColor?: string
    style?: React.CSSProperties
}

// Paper dimensions (A4-ish aspect ratio)
const PAPER_WIDTH = 2.4
const PAPER_HEIGHT = 3.2
const SEGMENT_HEIGHT = PAPER_HEIGHT / 3 // Each of the 3 panels

// Fold angles for top/middle panels
const ANGLE_OPEN_DEG = 10
const ANGLE_CLOSED_DEG = 60

// Fold angle for bottom panel (smaller so it doesn't stick out)
const ANGLE_OPEN_DEG_BOTTOM = 5
const ANGLE_CLOSED_DEG_BOTTOM = 30

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
function createLetterGeometry(
    width: number,
    height: number,
    forBackFace?: boolean
) {
    // Use 6 height segments = 7 rows of vertices, ensuring fold lines have vertices on both sides
    const geometry = new PlaneGeometry(width, height, 1, 6)
    const pos = geometry.attributes.position
    const uv = geometry.attributes.uv
    const skinIndices: number[] = []
    const skinWeights: number[] = []

    const halfH = height / 2
    const segH = height / 3
    // Fold line Y positions (with small epsilon for floating point)
    const secondEdgeY = halfH - segH + 0.001 // between top and middle
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
    const {
        bgColor,
        greetingColor,
        bodyColor,
        signatureColor,
        greetingFont,
        bodyFont,
        signatureFont,
    } = options

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const scale = 2
    canvas.width = 512 * scale
    canvas.height = 682 * scale

    ctx.fillStyle = resolveColor(bgColor)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Greeting font (fallback to body font)
    const greetingFontRes = greetingFont ?? bodyFont
    const greetingFontFamily =
        (greetingFontRes?.fontFamily as string) ||
        "Inter, system-ui, sans-serif"
    const greetingFontWeight =
        greetingFontRes?.fontWeight != null
            ? String(greetingFontRes.fontWeight)
            : "400"
    const greetingFontStyle = (greetingFontRes?.fontStyle as string) || "normal"
    const greetingFontSizeRaw = parseFontSize(
        greetingFontRes?.fontSize as string | number | undefined
    )
    const greetingFontSize = (greetingFontSizeRaw ?? 18) * scale

    // Extract font properties from Framer font controls
    const bodyFontFamily =
        (bodyFont?.fontFamily as string) || "Inter, system-ui, sans-serif"
    const bodyFontWeight =
        bodyFont?.fontWeight != null ? String(bodyFont.fontWeight) : "400"
    const bodyFontStyle = (bodyFont?.fontStyle as string) || "normal"

    // Parse fontSize - Framer can return number or string like "14px"
    const bodyFontSizeRaw = parseFontSize(
        bodyFont?.fontSize as string | number | undefined
    )
    const bodyFontSize = bodyFontSizeRaw ?? 14

    const padding = 48 * scale
    // Use lineHeight from font if available, otherwise calculate from fontSize
    const lineHeightRaw = bodyFont?.lineHeight
    let lineHeight: number
    if (typeof lineHeightRaw === "number") {
        lineHeight = lineHeightRaw * scale
    } else if (
        typeof lineHeightRaw === "string" &&
        lineHeightRaw.endsWith("%")
    ) {
        lineHeight = (parseFloat(lineHeightRaw) / 100) * bodyFontSize * scale
    } else if (
        typeof lineHeightRaw === "string" &&
        lineHeightRaw.endsWith("em")
    ) {
        const emVal = parseFloat(lineHeightRaw)
        lineHeight = (isNaN(emVal) ? 1.6 : emVal) * bodyFontSize * scale
    } else {
        lineHeight = bodyFontSize * 1.6 * scale
    }

    // Text align and letter spacing from Framer font (body applies to greeting, body, closing)
    const textAlign = (bodyFont?.textAlign as CanvasTextAlign) || "left"
    const letterSpacingPx =
        parseLetterSpacing(bodyFont?.letterSpacing, bodyFontSize) * scale

    const bodySize = bodyFontSize * scale
    const maxWidth = canvas.width - padding * 2

    /** Draw a single line with textAlign and optional letterSpacing. */
    const drawLine = (
        line: string,
        y: number,
        fontSizePx: number,
        align: CanvasTextAlign,
        spacingPx: number
    ) => {
        if (!line.trim()) return
        ctx.font = `${bodyFontStyle} ${bodyFontWeight} ${fontSizePx}px ${bodyFontFamily}`
        if (spacingPx === 0) {
            ctx.textAlign = align
            const x =
                align === "center"
                    ? padding + maxWidth / 2
                    : align === "right"
                      ? padding + maxWidth
                      : padding
            ctx.fillText(line, x, y)
            return
        }
        const totalWidth =
            ctx.measureText(line).width + spacingPx * Math.max(0, line.length - 1)
        let x: number
        if (align === "left" || align === "start") {
            x = padding
        } else if (align === "center") {
            x = padding + (maxWidth - totalWidth) / 2
        } else {
            x = padding + maxWidth - totalWidth
        }
        ctx.textAlign = "left"
        for (let i = 0; i < line.length; i++) {
            const c = line[i]
            ctx.fillText(c, x, y)
            x += ctx.measureText(c).width + spacingPx
        }
    }

    let y = padding + 32 * scale

    // Greeting (uses greeting font or body font)
    ctx.fillStyle = resolveColor(greetingColor)
    ctx.font = `${greetingFontStyle} ${greetingFontWeight} ${greetingFontSize}px ${greetingFontFamily}`
    if (letterSpacingPx === 0) {
        ctx.textAlign = textAlign
        const greetingX =
            textAlign === "center"
                ? padding + maxWidth / 2
                : textAlign === "right"
                  ? padding + maxWidth
                  : padding
        ctx.fillText(greeting, greetingX, y)
    } else {
        const totalGreetingWidth =
            ctx.measureText(greeting).width +
            letterSpacingPx * Math.max(0, greeting.length - 1)
        let greetingX: number
        if (textAlign === "left" || textAlign === "start") {
            greetingX = padding
        } else if (textAlign === "center") {
            greetingX = padding + (maxWidth - totalGreetingWidth) / 2
        } else {
            greetingX = padding + maxWidth - totalGreetingWidth
        }
        ctx.textAlign = "left"
        for (let i = 0; i < greeting.length; i++) {
            const c = greeting[i]
            ctx.fillText(c, greetingX, y)
            greetingX += ctx.measureText(c).width + letterSpacingPx
        }
    }
    y += lineHeight * 1.8

    // Body text
    ctx.fillStyle = resolveColor(bodyColor)
    const words = body.split(" ")
    let line = ""

    for (const word of words) {
        const testLine = line + word + " "
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line !== "") {
            drawLine(line.trim(), y, bodySize, textAlign, letterSpacingPx)
            line = word + " "
            y += lineHeight
        } else {
            line = testLine
        }
    }
    if (line.trim()) {
        drawLine(line.trim(), y, bodySize, textAlign, letterSpacingPx)
        y += lineHeight
    }

    // Closing
    y += lineHeight * 0.8
    ctx.fillStyle = resolveColor(bodyColor)
    drawLine(closing, y, bodySize, textAlign, letterSpacingPx)

    // Signature (uses signature font; align and letterSpacing from signature font or body)
    y += lineHeight * 2.2
    ctx.fillStyle = resolveColor(signatureColor)
    const sigFontFamily =
        (signatureFont?.fontFamily as string) || "Caveat, cursive"
    const sigFontWeight =
        signatureFont?.fontWeight != null
            ? String(signatureFont.fontWeight)
            : "500"
    const sigFontStyle = (signatureFont?.fontStyle as string) || "italic"
    const sigFontSizeRaw = parseFontSize(
        signatureFont?.fontSize as string | number | undefined
    )
    const sigFontSize = (sigFontSizeRaw ?? 26) * scale
    const sigTextAlign =
        (signatureFont?.textAlign as CanvasTextAlign) ?? textAlign
    const sigLetterSpacingPx =
        parseLetterSpacing(signatureFont?.letterSpacing, sigFontSizeRaw ?? 26) *
        scale
    ctx.font = `${sigFontStyle} ${sigFontWeight} ${sigFontSize}px ${sigFontFamily}`
    if (sigLetterSpacingPx === 0) {
        ctx.textAlign = sigTextAlign
        const sigX =
            sigTextAlign === "center"
                ? padding + maxWidth / 2
                : sigTextAlign === "right"
                  ? padding + maxWidth
                  : padding
        ctx.fillText(signature, sigX, y)
    } else {
        const totalSigWidth =
            ctx.measureText(signature).width +
            sigLetterSpacingPx * Math.max(0, signature.length - 1)
        let sigX: number
        if (sigTextAlign === "left" || sigTextAlign === "start") {
            sigX = padding
        } else if (sigTextAlign === "center") {
            sigX = padding + (maxWidth - totalSigWidth) / 2
        } else {
            sigX = padding + maxWidth - totalSigWidth
        }
        ctx.textAlign = "left"
        for (let i = 0; i < signature.length; i++) {
            const c = signature[i]
            ctx.fillText(c, sigX, y)
            sigX += ctx.measureText(c).width + sigLetterSpacingPx
        }
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
}

/** Resolve a LetterEntry to flat values and TextureOptions for createTextTexture */
function entryToTextureInputs(
    entry: LetterEntry | undefined,
    letterPaperColorOverride: string | undefined,
    bodyFont: React.CSSProperties | undefined,
    bodyColor: string,
    signatureFont: React.CSSProperties | undefined,
    signatureColor: string
): {
    greeting: string
    body: string
    closing: string
    signature: string
    options: TextureOptions
} {
    const g = entry?.greeting
    const b = entry?.body
    const s = entry?.signature
    const bgColor = letterPaperColorOverride ?? DEFAULT_BG_COLOR
    const greeting = g?.text ?? DEFAULT_GREETING
    const bodyText = b?.text ?? DEFAULT_BODY
    const closing = b?.closing ?? DEFAULT_CLOSING
    const signature = s?.text ?? DEFAULT_SIGNATURE
    const greetingFont = cloneFont(bodyFont)
    const greetingColor = bodyColor
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
            bodyFont: cloneFont(bodyFont),
            signatureFont: cloneFont(signatureFont),
        },
    }
}

/** Create a canvas texture for a given letter entry. */
function createTextureForEntry(
    entry: LetterEntry | undefined,
    letterPaperColorOverride: string | undefined,
    bodyFont: React.CSSProperties | undefined,
    bodyColor: string,
    signatureFont: React.CSSProperties | undefined,
    signatureColor: string
): InstanceType<typeof CanvasTexture> {
    const { greeting, body, closing, signature, options } =
        entryToTextureInputs(
            entry,
            letterPaperColorOverride,
            bodyFont,
            bodyColor,
            signatureFont,
            signatureColor
        )
    return createTextTexture(greeting, body, closing, signature, options)
}

/** Create a blank texture (e.g. for the back of the card during flip so we don't show flipped content). */
function createEmptyTexture(
    bgColor: string = DEFAULT_BG_COLOR
): InstanceType<typeof CanvasTexture> {
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
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 533
 * @framerDisableUnlink
 */
export default function LetterTestimonial(props: LetterTestimonialProps) {
    const {
        currentEntry: currentEntryProp = 1,
        entries: entriesProp = [],
        flipDirection = "front",
        letterSize = 1,
        transition: transitionProp = {
            type: "tween",
            duration: 0.8,
            ease: "easeOut",
        },
        shadows = {},
        letterPaperColor = DEFAULT_BG_COLOR,
        bodyFont = {
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: "400",
            fontSize: 17,
        } as React.CSSProperties,
        bodyColor = DEFAULT_TEXT_COLOR,
        signatureFont = {
            fontFamily: "Caveat, cursive",
            fontStyle: "italic",
            fontWeight: "500",
            fontSize: 32,
        } as React.CSSProperties,
        signatureColor = DEFAULT_SIGNATURE_COLOR,
        style,
    } = props

    const shadow = shadows?.boxShadow ?? "0px 4px 24px 0px rgba(0, 0, 0, 0.35)"
    const paperShadow = shadows?.paperShadow ?? 0.6

    const letterSizeRef = useRef(letterSize)
    letterSizeRef.current = letterSize
    const foldAnimationRef = useRef<ReturnType<typeof animate> | null>(null)

    // Normalize entries: ensure at least one, default three entries (same template)
    const entries: LetterEntry[] =
        entriesProp?.length > 0
            ? entriesProp
            : [
                  {
                      greeting: { text: DEFAULT_GREETING },
                      body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                      signature: { text: DEFAULT_SIGNATURE },
                  },
                  {
                      greeting: { text: DEFAULT_GREETING },
                      body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                      signature: { text: DEFAULT_SIGNATURE },
                  },
                  {
                      greeting: { text: DEFAULT_GREETING },
                      body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                      signature: { text: DEFAULT_SIGNATURE },
                  },
              ]
    const entriesLength = entries.length
    const currentEntry = Math.max(1, Math.min(currentEntryProp, entriesLength))
    const currentIndex = currentEntry - 1
    const nextIndex = currentEntry % entriesLength

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<InstanceType<typeof Scene> | null>(null)
    const cameraRef = useRef<InstanceType<typeof PerspectiveCamera> | null>(
        null
    )
    const rendererRef = useRef<InstanceType<typeof WebGLRenderer> | null>(null)
    const frontMeshRef = useRef<InstanceType<typeof SkinnedMesh> | null>(null)
    const backMeshRef = useRef<InstanceType<typeof SkinnedMesh> | null>(null)
    const frontMaterialRef = useRef<InstanceType<
        typeof MeshStandardMaterial
    > | null>(null)
    const backMaterialRef = useRef<InstanceType<
        typeof MeshStandardMaterial
    > | null>(null)
    const directionalLightRef = useRef<InstanceType<
        typeof DirectionalLight
    > | null>(null)
    const ambientLightRef = useRef<InstanceType<typeof AmbientLight> | null>(
        null
    )
    const frontBonesRef = useRef<InstanceType<typeof Bone>[]>([])
    const backBonesRef = useRef<InstanceType<typeof Bone>[]>([])
    const thetaRef = useRef(degToRad(ANGLE_OPEN_DEG))
    const theta2Ref = useRef(degToRad(ANGLE_OPEN_DEG_BOTTOM))
    const flipAngleRef = useRef(0)
    const startFlipAngleRef = useRef(0)
    const frameRef = useRef<number>(0)
    const prevEntryRef = useRef(currentEntry)
    const phaseRef = useRef<AnimationPhase>("idle")
    const targetEntryRef = useRef(currentEntry)

    // Which entry is currently shown (updates when flip animation completes)
    const [displayedEntry, setDisplayedEntry] = useState(currentEntry)
    // Which mesh faces the user (kept in sync for display; front/back decided by rotation in logic)
    const [visibleSide, setVisibleSide] = useState<"front" | "back">("front")
    const [isAnimating, setIsAnimating] = useState(false)

    // Track which entry index is assigned to each mesh (front mesh and back mesh).
    // These only change when we explicitly update them (not derived from displayedEntry).
    const [frontMeshEntry, setFrontMeshEntry] = useState(currentEntry - 1)
    const [backMeshEntry, setBackMeshEntry] = useState(currentEntry - 1)

    const [textures, setTextures] = useState<{
        front: InstanceType<typeof CanvasTexture> | null
        back: InstanceType<typeof CanvasTexture> | null
    }>({ front: null, back: null })

    // Use the tracked mesh entries directly
    const frontEntryIndex = frontMeshEntry
    const backEntryIndex = backMeshEntry

    const frontInputs = entryToTextureInputs(
        entries[frontEntryIndex],
        letterPaperColor,
        bodyFont,
        bodyColor,
        signatureFont,
        signatureColor
    )
    const backInputs = entryToTextureInputs(
        entries[backEntryIndex],
        letterPaperColor,
        bodyFont,
        bodyColor,
        signatureFont,
        signatureColor
    )

    const fontKeys = [
        bodyFont,
        bodyFont,
        signatureFont,
        bodyFont,
        bodyFont,
        signatureFont,
    ]
        .filter(Boolean)
        .map((f) => {
            const p = f as React.CSSProperties
            return p
                ? `${p.fontFamily ?? ""}-${p.fontWeight ?? ""}-${p.fontSize ?? ""}-${p.lineHeight ?? ""}-${p.textAlign ?? ""}-${p.letterSpacing ?? ""}`
                : ""
        })
        .join("|")

    useEffect(() => {
        const descriptors: string[] = []
        const addDesc = (opts: TextureOptions, size: number) => {
            const d = fontToLoadDescriptor(
                opts.greetingFont ?? opts.bodyFont,
                size
            )
            if (d) descriptors.push(d)
            const d2 = fontToLoadDescriptor(opts.bodyFont, 17)
            if (d2) descriptors.push(d2)
            const d3 = fontToLoadDescriptor(opts.signatureFont, 32)
            if (d3) descriptors.push(d3)
        }
        addDesc(frontInputs.options, 22)
        addDesc(backInputs.options, 22)

        const createBoth = () => {
            const front = createTextureForEntry(
                entries[frontEntryIndex],
                letterPaperColor,
                bodyFont,
                bodyColor,
                signatureFont,
                signatureColor
            )
            const back = createTextureForEntry(
                entries[backEntryIndex],
                letterPaperColor,
                bodyFont,
                bodyColor,
                signatureFont,
                signatureColor
            )
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
    }, [
        frontEntryIndex,
        backEntryIndex,
        entriesLength,
        fontKeys,
        displayedEntry,
        letterPaperColor,
        bodyFont,
        bodyColor,
        signatureFont,
        signatureColor,
    ])

    const texturesReady = !!(textures.front && textures.back)
    const angleOpenRad = degToRad(ANGLE_OPEN_DEG)
    const angleClosedRad = degToRad(ANGLE_CLOSED_DEG)
    const angleOpenRad2 = degToRad(ANGLE_OPEN_DEG_BOTTOM)
    const angleClosedRad2 = degToRad(ANGLE_CLOSED_DEG_BOTTOM)
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
                foldAnimationRef.current = animate(
                    thetaRef.current,
                    angleOpenRad,
                    {
                        ...config,
                        delay: transitionProp?.delay ?? 0,
                        onUpdate: (v) => {
                            thetaRef.current = v
                            // Keep theta2 in sync proportionally
                            const ratio =
                                (v - angleOpenRad) /
                                (angleClosedRad - angleOpenRad || 1)
                            theta2Ref.current =
                                angleOpenRad2 +
                                ratio * (angleClosedRad2 - angleOpenRad2)
                        },
                    }
                )
                return () => {
                    foldAnimationRef.current?.stop()
                }
            }
            // When folding, prev/displayedEntry may be stale; don't return — fall through to mid-animation
        }

        // Already showing this entry: no flip, just keep in sync (allows 2 consecutive same entries)
        // When folding, displayedEntry is stale — only skip if we're already animating to this entry
        if (currentEntry === displayedEntry) {
            if (phaseRef.current === "idle") {
                prevEntryRef.current = currentEntry
                return
            }
            if (currentEntry === targetEntryRef.current) {
                return
            }
            // Folding to a different entry; fall through to mid-animation (snap and start flip to currentEntry)
        }

        // Click mid-animation: treat current flip as finished, then start flip to new entry
        if (phaseRef.current !== "idle") {
            foldAnimationRef.current?.stop()
            const target = targetEntryRef.current
            const targetIdx = target - 1
            prevEntryRef.current = target
            phaseRef.current = "idle"
            setIsAnimating(false)
            const newFlipAngle = startFlipAngleRef.current + Math.PI
            flipAngleRef.current = newFlipAngle
            thetaRef.current = angleOpenRad
            theta2Ref.current = angleOpenRad2
            setDisplayedEntry(target)
            const twoPi = 2 * Math.PI
            const mod = newFlipAngle % twoPi
            const newVisibleSide =
                mod < 0.01 || mod > twoPi - 0.01 ? "front" : "back"
            setVisibleSide(newVisibleSide)
            // Sync both meshes to show target
            setFrontMeshEntry(targetIdx)
            setBackMeshEntry(targetIdx)
            // Fall through to start flip to currentEntry
        }

        phaseRef.current = "folding"
        targetEntryRef.current = currentEntry
        setIsAnimating(true)
        const config = buildTransitionConfig(transitionProp)

        // Update only the mesh that is currently NOT facing the camera (the "back").
        // Derive which side is front from current rotation, not from entry index or state.
        const targetIdx = currentEntry - 1
        const frontFacesCamera = isFrontMeshFacingCamera(flipAngleRef.current)
        if (frontFacesCamera) {
            setBackMeshEntry(targetIdx)
        } else {
            setFrontMeshEntry(targetIdx)
        }

        startFlipAngleRef.current = flipAngleRef.current
        foldAnimationRef.current?.stop()
        foldAnimationRef.current = animate(0, 1, {
            ...config,
            delay: transitionProp?.delay ?? 0,
            onUpdate: (p) => {
                // Flip continuously: add π to current angle (0→π, π→2π, ...)
                // For spring, allow progress to overshoot so the flip can bounce; for tween keep clamped.
                const isSpring = transitionProp?.type === "spring"
                const clampedProgress = Math.max(0, Math.min(1, p))
                const progressForFlip = isSpring ? p : clampedProgress
                const flipAngle =
                    startFlipAngleRef.current + Math.PI * progressForFlip

                let theta: number
                let theta2: number
                let foldPct: number
                let unfoldPct: number
                if (clampedProgress <= 0.5) {
                    const foldT = clampedProgress / 0.5
                    theta =
                        angleOpenRad + (angleClosedRad - angleOpenRad) * foldT
                    theta2 =
                        angleOpenRad2 +
                        (angleClosedRad2 - angleOpenRad2) * foldT
                    foldPct = Math.round(foldT * 100)
                    unfoldPct = 0
                } else {
                    const unfoldT = (clampedProgress - 0.5) / 0.5
                    theta =
                        angleClosedRad +
                        (angleOpenRad - angleClosedRad) * unfoldT
                    theta2 =
                        angleClosedRad2 +
                        (angleOpenRad2 - angleClosedRad2) * unfoldT
                    foldPct = 100
                    unfoldPct = Math.round(unfoldT * 100)
                }

                thetaRef.current = theta
                theta2Ref.current = theta2
                flipAngleRef.current = flipAngle
            },
            onComplete: () => {
                phaseRef.current = "idle"
                const target = targetEntryRef.current
                const targetIdx = target - 1
                prevEntryRef.current = target
                const newFlipAngle = startFlipAngleRef.current + Math.PI
                flipAngleRef.current = newFlipAngle
                thetaRef.current = angleOpenRad
                theta2Ref.current = angleOpenRad2
                setDisplayedEntry(target)
                setIsAnimating(false)
                // After flip, the side facing the user is back at π, 3π, … and front at 0, 2π, …
                const twoPi = 2 * Math.PI
                const mod = newFlipAngle % twoPi
                const newVisibleSide =
                    mod < 0.01 || mod > twoPi - 0.01 ? "front" : "back"
                setVisibleSide(newVisibleSide)
                // Sync both meshes to show target (so the hidden one is ready for next flip)
                setFrontMeshEntry(targetIdx)
                setBackMeshEntry(targetIdx)
            },
        })
        return () => {
            if (phaseRef.current === "idle") foldAnimationRef.current?.stop()
        }
    }, [
        currentEntry,
        angleOpenRad,
        angleClosedRad,
        angleOpenRad2,
        angleClosedRad2,
        transitionKey,
    ])

    // When textures change (e.g. post-flip), update materials in place (no animation – flip angle accumulates)
    useEffect(() => {
        if (
            !textures.front ||
            !textures.back ||
            !frontMaterialRef.current ||
            !backMaterialRef.current
        )
            return
        frontMaterialRef.current.map = textures.front
        frontMaterialRef.current.emissiveMap = textures.front
        backMaterialRef.current.map = textures.back
        backMaterialRef.current.emissiveMap = textures.back
    }, [textures.front, textures.back])

    useEffect(() => {
        const container = containerRef.current
        const textureFront = textures.front
        const textureBack = textures.back
        if (!container || !texturesReady || !textureFront || !textureBack)
            return

        const scene = new Scene()
        sceneRef.current = scene

        const camera = new PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.set(0, 0, 5)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        const renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        renderer.domElement.style.backgroundColor = "transparent"
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const halfH = PAPER_HEIGHT / 2
        const segH = SEGMENT_HEIGHT

        // Create front-facing geometry and bones
        const frontGeometry = createLetterGeometry(
            PAPER_WIDTH,
            PAPER_HEIGHT,
            false
        )

        const fb0 = new Bone()
        fb0.position.set(0, halfH, 0)
        const fb1 = new Bone()
        fb1.position.set(0, halfH - segH, 0)
        const fb2 = new Bone()
        fb2.position.set(0, halfH - 2 * segH, 0)
        const frontBones = [fb0, fb1, fb2]
        frontBonesRef.current = frontBones

        const frontSkeleton = new Skeleton(frontBones)
        const frontMaterial = new MeshStandardMaterial({
            color: 0xffffff,
            map: textureFront,
            emissive: 0xffffff,
            emissiveMap: textureFront,
            emissiveIntensity: EMISSIVE_INTENSITY,
            side: FrontSide,
            roughness: ROUGHNESS,
            metalness: 0,
        })
        frontMaterialRef.current = frontMaterial
        const frontMesh = new SkinnedMesh(frontGeometry, frontMaterial)
        frontMesh.frustumCulled = false
        frontMesh.add(fb0)
        frontMesh.add(fb1)
        frontMesh.add(fb2)
        frontMesh.bind(frontSkeleton)
        frontMeshRef.current = frontMesh

        // Create back-facing geometry and bones (with flipped UVs)
        const backGeometry = createLetterGeometry(
            PAPER_WIDTH,
            PAPER_HEIGHT,
            true
        )

        const bb0 = new Bone()
        bb0.position.set(0, halfH, 0)
        const bb1 = new Bone()
        bb1.position.set(0, halfH - segH, 0)
        const bb2 = new Bone()
        bb2.position.set(0, halfH - 2 * segH, 0)
        const backBones = [bb0, bb1, bb2]
        backBonesRef.current = backBones

        const backSkeleton = new Skeleton(backBones)
        const backMaterial = new MeshStandardMaterial({
            color: 0xffffff,
            map: textureBack,
            emissive: 0xffffff,
            emissiveMap: textureBack,
            emissiveIntensity: EMISSIVE_INTENSITY,
            side: BackSide,
            roughness: ROUGHNESS,
            metalness: 0,
        })
        backMaterialRef.current = backMaterial
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

        // Light for letter illumination only (shadow is CSS drop-shadow). Light color hardcoded to white.
        const { ambient: ambientIntensity, directional: directionalIntensity } =
            paperShadowToIntensities(paperShadow)
        const ambientLight = new AmbientLight(0xffffff, ambientIntensity)
        scene.add(ambientLight)
        ambientLightRef.current = ambientLight
        const directionalLight = new DirectionalLight(
            0xffffff,
            directionalIntensity
        )
        directionalLight.position.set(
            LIGHT_POSITION_X,
            LIGHT_POSITION_Y,
            LIGHT_POSITION_Z
        )
        directionalLight.target.position.set(0, 0, 0)
        scene.add(directionalLight.target)
        scene.add(directionalLight)
        directionalLightRef.current = directionalLight

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
        const visibleHeightAtOrigin =
            2 * cameraDistance * Math.tan((45 / 2) * (Math.PI / 180))

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
            const theta2 = theta2Ref.current

            // Update front bones
            // fb0: top panel - rotates by -theta (tilts forward)
            fb0.rotation.x = -theta
            fb0.position.set(0, b0BindY, 0)

            // Second edge position (hinge between top and middle)
            const secondEdgeY = b0BindY - segH * Math.cos(theta)
            const secondEdgeZ = segH * Math.sin(theta)

            // fb1: middle panel - rotates by theta (same angle magnitude at Second edge)
            fb1.rotation.x = theta
            fb1.position.set(0, secondEdgeY, secondEdgeZ)

            // Third edge position (hinge between middle and bottom)
            // Use theta for the middle panel's contribution to keep Second/Third edge angles equal
            const thirdEdgeY = secondEdgeY - segH * Math.cos(theta)
            const thirdEdgeZ = secondEdgeZ - segH * Math.sin(theta)

            // fb2: bottom panel - rotates by -theta2 (smaller angle so it doesn't stick out)
            fb2.rotation.x = -theta2
            fb2.position.set(0, thirdEdgeY, thirdEdgeZ)

            // Update back bones identically
            bb0.rotation.x = -theta
            bb0.position.set(0, b0BindY, 0)
            bb1.rotation.x = theta
            bb1.position.set(0, secondEdgeY, secondEdgeZ)
            bb2.rotation.x = -theta2
            bb2.position.set(0, thirdEdgeY, thirdEdgeZ)

            if (frontMeshRef.current?.skeleton)
                frontMeshRef.current.skeleton.update()
            if (backMeshRef.current?.skeleton)
                backMeshRef.current.skeleton.update()

            // Flip around the true hinge center on the middle panel:
            // midpoint between the second and third fold edges.
            const centerY = (fb1.position.y + fb2.position.y) / 2
            const centerZ = (fb1.position.z + fb2.position.z) / 2
            letterGroup.position.set(0, -centerY, -centerZ)

            const flipAngle = flipAngleRef.current % (2 * Math.PI)
            const flipSign = flipDirection === "back" ? -1 : 1
            flipGroup.rotation.x = flipAngle * flipSign
            flipGroup.rotation.y = 0

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
            frontMaterialRef.current = null
            backMaterialRef.current = null
            frontBonesRef.current = []
            backBonesRef.current = []
            directionalLightRef.current = null
            ambientLightRef.current = null
        }
    }, [texturesReady, flipDirection])

    // Update paper self-shadow intensity without recreating the scene
    useEffect(() => {
        const { ambient, directional } = paperShadowToIntensities(paperShadow)
        if (ambientLightRef.current) {
            ambientLightRef.current.intensity = ambient
        }
        if (directionalLightRef.current) {
            directionalLightRef.current.intensity = directional
        }
    }, [paperShadow])

    // Apply ControlType.BoxShadow as CSS drop-shadow on the canvas (like StickerDrag)
    useEffect(() => {
        const canvas = rendererRef.current?.domElement
        if (canvas) canvas.style.filter = boxShadowToDropShadow(shadow)
    }, [shadow, texturesReady])

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
        </>
    )
}

addPropertyControls(LetterTestimonial, {
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
                    },
                },
            },
        },
        defaultValue: [
            {
                greeting: { text: DEFAULT_GREETING },
                body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                signature: { text: DEFAULT_SIGNATURE },
            },
            {
                greeting: { text: DEFAULT_GREETING },
                body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                signature: { text: DEFAULT_SIGNATURE },
            },
            {
                greeting: { text: DEFAULT_GREETING },
                body: { text: DEFAULT_BODY, closing: DEFAULT_CLOSING },
                signature: { text: DEFAULT_SIGNATURE },
            },
        ],
    },
    currentEntry: {
        type: ControlType.Number,
        title: "Entry",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 1,
        displayStepper: true,
    },
    flipDirection: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["front", "back"],
        optionTitles: ["Front Flip", "Back Flip"],
        defaultValue: "back",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    letterSize: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 0.75,
        min: 0.25,
        max: 1,
        step: 0.05,
        displayStepper: true,
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: {
            type: "tween",
            duration: 0.8,
            ease: "easeOut",
        },
    },
    shadows: {
        type: ControlType.Object,
        title: "Shadows",
        controls: {
            boxShadow: {
                // @ts-ignore — Framer BoxShadow control
                type: ControlType.BoxShadow,
                title: "Box shadow",
                defaultValue: "0px 4px 24px 0px rgba(0, 0, 0, 0.35)",
            },
            paperShadow: {
                type: ControlType.Number,
                title: "Paper",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.6,
                displayStepper: true,
            },
        },
    },
    letterPaperColor: {
        type: ControlType.Color,
        title: "Paper",
        defaultValue: DEFAULT_BG_COLOR,
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 17,
            // @ts-ignore — Framer font control accepts fontFamily at runtime
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: "400",
        },
    },
    bodyColor: {
        type: ControlType.Color,
        title: "ㅤ",
        defaultValue: DEFAULT_TEXT_COLOR,
    },
    signatureFont: {
        type: ControlType.Font,
        title: "Signature",
        controls: "extended",
        // @ts-ignore — Framer accepts cursive at runtime
        defaultFontType: "cursive",
        defaultValue: {
            fontSize: 32,
            // @ts-ignore — Framer font control accepts fontFamily at runtime
            fontFamily: "Caveat, cursive",
            fontStyle: "italic",
            fontWeight: "500",
        },
    },
    signatureColor: {
        type: ControlType.Color,
        title: "ㅤ",
        defaultValue: DEFAULT_SIGNATURE_COLOR,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

LetterTestimonial.displayName = "Letter Testimonial"
