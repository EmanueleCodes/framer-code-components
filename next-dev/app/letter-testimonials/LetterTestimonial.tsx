
import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
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
    DoubleSide,
    SRGBColorSpace,
    Vector3,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

type LetterState = "open" | "closed"

const FOLD_DURATION = 0.8

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

interface TextureOptions {
    bgColor: string
    textColor: string
    signatureColor: string
    bodyFont: React.CSSProperties | undefined
    signatureFont: React.CSSProperties | undefined
}

interface LetterTestimonialProps {
    state: LetterState
    greeting?: string
    bodyText?: string
    closing?: string
    signature?: string
    bgColor?: string
    textColor?: string
    signatureColor?: string
    bodyFont?: React.CSSProperties
    signatureFont?: React.CSSProperties
    style?: React.CSSProperties
}

// Paper dimensions (A4-ish aspect ratio)
const PAPER_WIDTH = 2.4
const PAPER_HEIGHT = 3.2
const SEGMENT_HEIGHT = PAPER_HEIGHT / 3  // Each of the 3 panels

// For a complete accordion fold where all 3 panels stack:
// Each fold angle should be 60° (π/3) so panels form equilateral triangles when viewed from side
// At 60°, the panels will be at 60° to each other, creating tight accordion
const FOLD_THETA_MAX = Math.PI / 3  // 60° per fold for tight accordion

function lerpAngle(current: number, target: number, alpha: number): number {
    return current + (target - current) * alpha
}

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
function createLetterGeometry(width: number, height: number) {
    // Use 6 height segments = 7 rows of vertices, ensuring fold lines have vertices on both sides
    const geometry = new PlaneGeometry(width, height, 1, 6)
    const pos = geometry.attributes.position
    const skinIndices: number[] = []
    const skinWeights: number[] = []
    
    const halfH = height / 2
    const segH = height / 3
    // Fold line Y positions (with small epsilon for floating point)
    const secondEdgeY = halfH - segH + 0.001   // between top and middle
    const thirdEdgeY = halfH - 2 * segH + 0.001 // between middle and bottom
    
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
    const { bgColor, textColor, signatureColor, bodyFont, signatureFont } =
        options

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const scale = 2
    canvas.width = 512 * scale
    canvas.height = 682 * scale

    ctx.fillStyle = resolveColor(bgColor)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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

    // Greeting (slightly larger than body)
    const greetingSize = Math.round(bodyFontSize * 1.3) * scale
    ctx.fillStyle = resolveColor(textColor)
    ctx.font = `${bodyFontStyle} ${bodyFontWeight} ${greetingSize}px ${bodyFontFamily}`
    ctx.fillText(greeting, padding, y)
    y += lineHeight * 1.8

    // Body text
    const bodySize = bodyFontSize * scale
    ctx.fillStyle = resolveColor(textColor)
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
    ctx.fillStyle = resolveColor(textColor)
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

/**
 * 3D folding letter with text and signature. Uses Three.js (CDN) for realistic paper fold.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 500
 */
export default function LetterTestimonial(props: LetterTestimonialProps) {
    const {
        state = "open",
        greeting = DEFAULT_GREETING,
        bodyText = DEFAULT_BODY,
        closing = DEFAULT_CLOSING,
        signature = DEFAULT_SIGNATURE,
        bgColor = DEFAULT_BG_COLOR,
        textColor = DEFAULT_TEXT_COLOR,
        signatureColor = DEFAULT_SIGNATURE_COLOR,
        bodyFont,
        signatureFont,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<InstanceType<typeof Scene> | null>(null)
    const cameraRef = useRef<InstanceType<typeof PerspectiveCamera> | null>(null)
    const rendererRef = useRef<InstanceType<typeof WebGLRenderer> | null>(null)
    const meshRef = useRef<InstanceType<typeof SkinnedMesh> | null>(null)
    const bonesRef = useRef<InstanceType<typeof Bone>[]>([])
    // theta: the primary fold angle (at Second edge / b1)
    const thetaRef = useRef(0)
    const thetaTargetRef = useRef(0)
    const frameRef = useRef<number>(0)

    const isClosed = state === "closed"
    // When closed, fold by FOLD_THETA_MAX. When open, theta = 0
    thetaTargetRef.current = isClosed ? FOLD_THETA_MAX : 0

    // Serialize font so we react to actual font changes (Framer may pass same object reference)
    const bodyFontKey = bodyFont
        ? `${bodyFont.fontFamily ?? ""}-${bodyFont.fontWeight ?? ""}-${bodyFont.fontStyle ?? ""}-${bodyFont.fontSize ?? ""}-${bodyFont.lineHeight ?? ""}`
        : ""
    const signatureFontKey = signatureFont
        ? `${signatureFont.fontFamily ?? ""}-${signatureFont.fontWeight ?? ""}-${signatureFont.fontStyle ?? ""}-${signatureFont.fontSize ?? ""}`
        : ""
    
    // Debug: log font values in development
    useEffect(() => {
        if (typeof window !== "undefined") {
            console.log("[LetterTestimonial] bodyFont:", JSON.stringify(bodyFont, null, 2))
            console.log("[LetterTestimonial] signatureFont:", JSON.stringify(signatureFont, null, 2))
            console.log("[LetterTestimonial] bodyFontKey:", bodyFontKey)
            console.log("[LetterTestimonial] signatureFontKey:", signatureFontKey)
        }
    }, [bodyFont, signatureFont, bodyFontKey, signatureFontKey])

    const [texture, setTexture] = useState<InstanceType<typeof CanvasTexture> | null>(null)

    // Load web fonts then create/update the canvas texture when content or fonts change
    useEffect(() => {
        const descriptors: string[] = []
        // Parse actual font sizes from the font controls
        const bodyFontSizeVal = parseFontSize(bodyFont?.fontSize as string | number | undefined) ?? 14
        const sigFontSizeVal = parseFontSize(signatureFont?.fontSize as string | number | undefined) ?? 26
        
        const bodyDescGreeting = fontToLoadDescriptor(bodyFont, Math.round(bodyFontSizeVal * 1.3))
        const bodyDescBody = fontToLoadDescriptor(bodyFont, bodyFontSizeVal)
        const sigDesc = fontToLoadDescriptor(signatureFont, sigFontSizeVal)
        
        if (bodyDescGreeting) descriptors.push(bodyDescGreeting)
        if (bodyDescBody && bodyDescBody !== bodyDescGreeting) descriptors.push(bodyDescBody)
        if (sigDesc) descriptors.push(sigDesc)

        const loadAndCreate = () => {
            const tex = createTextTexture(greeting, bodyText, closing, signature, {
                bgColor,
                textColor,
                signatureColor,
                bodyFont,
                signatureFont,
            })
            setTexture((prev: InstanceType<typeof CanvasTexture> | null) => {
                if (prev) prev.dispose()
                return tex
            })
        }

        if (descriptors.length === 0) {
            loadAndCreate()
            return
        }

        Promise.all(descriptors.map((d) => document.fonts.load(d)))
            .then(loadAndCreate)
            .catch(loadAndCreate)

        return () => {}
    }, [
        greeting,
        bodyText,
        closing,
        signature,
        bgColor,
        textColor,
        signatureColor,
        bodyFontKey,
        signatureFontKey,
    ])

    useEffect(() => {
        const container = containerRef.current
        if (!container || !texture) return

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

        // 3 bones for Z-fold accordion:
        // b0: at 4th edge (top of paper) - FIXED, controls top section
        // b1: at Second edge (top/middle fold line) - rotates by +θ, controls middle section
        // b2: at Third edge (middle/bottom fold line) - rotates by -2θ relative to b1, controls bottom section
        //
        // This ensures: when middle tilts by θ, bottom counter-rotates so First edge stays parallel to 4th edge
        const geometry = createLetterGeometry(PAPER_WIDTH, PAPER_HEIGHT)
        
        const halfH = PAPER_HEIGHT / 2
        const segH = SEGMENT_HEIGHT
        
        // For proper skinning, bones must be positioned at the fold lines in WORLD space.
        // We use a flat hierarchy (no parent-child) so each bone is independent,
        // then manually compute cascade rotations in the animation loop.
        
        // b0: at top of paper (4th edge, y = halfH). Controls top section. Never rotates.
        const b0 = new Bone()
        b0.position.set(0, halfH, 0)
        
        // b1: at Second edge (y = halfH - segH). Controls middle section.
        const b1 = new Bone()
        b1.position.set(0, halfH - segH, 0)
        
        // b2: at Third edge (y = halfH - 2*segH). Controls bottom section.
        const b2 = new Bone()
        b2.position.set(0, halfH - 2 * segH, 0)
        
        const bones = [b0, b1, b2]
        bonesRef.current = bones

        const skeleton = new Skeleton(bones)
        const material = new MeshBasicMaterial({
            map: texture,
            side: DoubleSide,
        })
        const mesh = new SkinnedMesh(geometry, material)
        mesh.frustumCulled = false
        mesh.add(b0)
        mesh.add(b1)
        mesh.add(b2)
        mesh.bind(skeleton)
        meshRef.current = mesh
        scene.add(mesh)

        // DEBUG: Add colored lines at each edge to visualize fold structure
        // Colors:
        //   4th edge (top)    = RED
        //   Second edge       = GREEN  
        //   Third edge        = BLUE
        //   First edge (bot)  = YELLOW
        const halfW = PAPER_WIDTH / 2
        const edgeLines: InstanceType<typeof Line>[] = []
        
        // Helper to create a horizontal line at a given Y, attached to a bone
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
        
        // 4th edge: top of paper (y = 0 in b0's local space since b0 is at halfH)
        createEdgeLine(0, 0xff0000, b0)  // RED
        
        // Second edge: at b1 position (y = 0 in b1's local space)
        createEdgeLine(0, 0x00ff00, b1)  // GREEN
        
        // Third edge: at b2 position (y = 0 in b2's local space)
        createEdgeLine(0, 0x0000ff, b2)  // BLUE
        
        // First edge: bottom of paper (y = -segH in b2's local space)
        createEdgeLine(-segH, 0xffff00, b2)  // YELLOW

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

        // Bind pose positions
        const b0BindY = halfH              // 4th edge (top of paper)
        const b1BindY = halfH - segH       // Second edge (first fold line)
        const b2BindY = halfH - 2 * segH   // Third edge (second fold line)
        
        let lastTime = performance.now()
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate)
            const now = performance.now()
            const delta = (now - lastTime) / 1000
            lastTime = now

            const speed = 1 / FOLD_DURATION
            const alpha = Math.min(1, delta * speed * 3)
            
            // Animate theta toward target
            thetaRef.current = lerpAngle(thetaRef.current, thetaTargetRef.current, alpha)
            const theta = thetaRef.current

            // ACCORDION FOLD GEOMETRY (matching your diagram):
            // Looking at the paper from the side, we have 4 edges:
            //   4th edge (top) -------- Second edge -------- Third edge -------- First edge (bottom)
            //
            // For a symmetric accordion fold:
            //   - Top section (4th to Second): rotates BACKWARD by -θ (tilts up)
            //   - Middle section (Second to Third): rotates FORWARD by +2θ relative to top
            //   - Bottom section (Third to First): rotates BACKWARD by -2θ relative to middle
            //
            // This creates the zig-zag where all horizontal edges end up parallel.
            //
            // In absolute terms:
            //   - b0 (top section): rotation = -θ
            //   - b1 (middle section): rotation = -θ + 2θ = +θ
            //   - b2 (bottom section): rotation = +θ - 2θ = -θ
            //
            // So top and bottom are parallel (both at -θ), middle is at +θ.
            
            // b0: Top section tilts backward (negative rotation = up/back)
            b0.rotation.x = -theta
            b0.position.set(0, b0BindY, 0)
            
            // Second edge position after b0 rotates:
            // Second edge is segH below 4th edge. After rotating b0 by -θ:
            const secondEdgeY = b0BindY - segH * Math.cos(theta)
            const secondEdgeZ = segH * Math.sin(theta)  // positive Z = toward camera (backward tilt)
            
            // b1: Middle section at Second edge, rotates forward by +θ absolute
            b1.rotation.x = theta
            b1.position.set(0, secondEdgeY, secondEdgeZ)
            
            // Third edge position after b1 rotates:
            // Third edge is segH below Second edge. After rotating b1 by +θ:
            const thirdEdgeY = secondEdgeY - segH * Math.cos(theta)
            const thirdEdgeZ = secondEdgeZ - segH * Math.sin(theta)  // negative because forward tilt
            
            // b2: Bottom section at Third edge, rotates backward by -θ absolute (parallel to top)
            b2.rotation.x = -theta
            b2.position.set(0, thirdEdgeY, thirdEdgeZ)
            
            if (meshRef.current?.skeleton) meshRef.current.skeleton.update()

            renderer.render(scene, camera)
        }
        animate()

        return () => {
            window.removeEventListener("resize", resize)
            cancelAnimationFrame(frameRef.current)
            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement)
            }
            renderer.dispose()
            geometry.dispose()
            sceneRef.current = null
            cameraRef.current = null
            rendererRef.current = null
            meshRef.current = null
            bonesRef.current = []
        }
    }, [texture])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                width: "100%",
                height: "100%",
                background: "transparent",
            }}
        />
    )
}

LetterTestimonial.displayName = "Letter Testimonial"

addPropertyControls(LetterTestimonial, {
    state: {
        type: ControlType.Enum,
        title: "State",
        options: ["open", "closed"],
        optionTitles: ["Open", "Closed"],
        defaultValue: "open",
        displaySegmentedControl: true,
    },
    greeting: {
        type: ControlType.String,
        title: "Greeting",
        defaultValue: DEFAULT_GREETING,
    },
    bodyText: {
        type: ControlType.String,
        title: "Body",
        defaultValue: DEFAULT_BODY,
        displayTextArea: true,
    },
    closing: {
        type: ControlType.String,
        title: "Closing",
        defaultValue: DEFAULT_CLOSING,
    },
    signature: {
        type: ControlType.String,
        title: "Signature",
        defaultValue: DEFAULT_SIGNATURE,
    },
    bgColor: {
        type: ControlType.Color,
        title: "Bg color",
        defaultValue: DEFAULT_BG_COLOR,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text color",
        defaultValue: DEFAULT_TEXT_COLOR,
    },
    signatureColor: {
        type: ControlType.Color,
        title: "Signature color",
        defaultValue: DEFAULT_SIGNATURE_COLOR,
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 14,
            // @ts-ignore — Framer font control accepts fontFamily at runtime
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: "400",
        },
    },
    signatureFont: {
        type: ControlType.Font,
        title: "Signature Font",
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
})
