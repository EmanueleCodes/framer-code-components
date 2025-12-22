import React, { useEffect, useRef, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// External libraries for WebGL and animation - bundled for Framer compatibility
// Update this URL after pushing scroll-text-distortion-three-bundle to your GitHub repo
// Example: https://cdn.jsdelivr.net/gh/your-username/your-repo/main/scroll-text-distortion-three-bundle/dist/bundle.js
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    CanvasTexture,
    Uniform,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/scroll-distortion.js"

// ============================================================================
// TYPES
// ============================================================================

interface ScrollTextDistortionProps {
    // Preview control
    preview: boolean
    // Text content
    text: string
    // Font control
    font?: React.CSSProperties
    // Sensitivity
    sensitivity: number
    // Effect preset
    preset: "liquid" | "wave" | "glitch" | "ripple" | "shake"
    // Text color
    color: string
    // Style
    style?: React.CSSProperties
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CAMERA_FOV = 75
const PLANE_SEGMENTS = 1

// ============================================================================
// SHADERS
// ============================================================================

// Vertex shader - simple pass-through
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Fragment shader with multiple distortion effects
const fragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uSize;
uniform float uTime;
uniform float uScrollSpeed;
uniform int uPreset;

varying vec2 vUv;

// Noise functions
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// 3D noise for liquid effect
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    vec2 uv = vUv;
    float speed = uScrollSpeed;
    
    // Preset 0: Liquid distort
    if (uPreset == 0) {
        float volatility = speed * 0.15;
        float z = uTime * 0.5;
        vec2 offset = vec2(
            snoise(vec3(uv * 3.0, z)),
            snoise(vec3(uv * 3.0 + 100.0, z))
        ) * volatility;
        uv += offset;
    }
    // Preset 1: Wave distort
    else if (uPreset == 1) {
        float amplitude = speed * 0.03;
        float frequency = 5.0;
        float offset = sin(uv.y * frequency * 3.14159 + uTime * 2.0) * amplitude;
        uv.x += offset;
    }
    // Preset 2: Glitch/Channel split
    else if (uPreset == 2) {
        float offset = speed * 0.06;
        vec4 r = texture2D(uTexture, uv + vec2(offset, 0.0));
        vec4 g = texture2D(uTexture, uv);
        vec4 b = texture2D(uTexture, uv - vec2(offset, 0.0));
        float a = max(max(r.a, g.a), b.a);
        gl_FragColor = vec4(r.r, g.g, b.b, a);
        return;
    }
    // Preset 3: Ripple
    else if (uPreset == 3) {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        float amplitude = speed * 0.1;
        float frequency = 10.0;
        float offset = sin(dist * frequency - uTime * 3.0) * amplitude * (1.0 - dist);
        vec2 dir = normalize(uv - center);
        uv += dir * offset;
    }
    // Preset 4: Shake
    else if (uPreset == 4) {
        float shakeX = noise(vec2(uTime * 50.0, 0.0)) * 2.0 - 1.0;
        float shakeY = noise(vec2(0.0, uTime * 50.0)) * 2.0 - 1.0;
        float intensity = speed * 0.09;
        uv += vec2(shakeX, shakeY) * intensity;
    }
    
    gl_FragColor = texture2D(uTexture, uv);
}
`

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Configures camera position based on container dimensions
 */
const configureCameraForSize = (camera: any, width: number, height: number) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    const safeHeight = Math.max(height, 1)
    const radians = (CAMERA_FOV * Math.PI) / 360
    const distance = safeHeight / 2 / Math.tan(radians) || 1
    camera.position.set(0, 0, distance)
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 240
 * @framerIntrinsicHeight 64
 * @framerDisableUnlink
 */
export default function ScrollTextDistortion({
    preview = true,
    text = "DISTORT",
    font = {},
    preset = "liquid",
    color = "#ffffff",
    style,
    sensitivity = 0.5,
}: ScrollTextDistortionProps): JSX.Element {
    // Refs for DOM elements
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const textCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // Refs for Three.js objects
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)

    // Animation refs
    const animationFrameRef = useRef<number | null>(null)
    const lastScrollRef = useRef(0)
    const scrollSpeedRef = useRef(0)
    const timeRef = useRef(0)

    // Detect canvas mode
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Convert preset string to number for shader
    const presetIndex = ["liquid", "wave", "glitch", "ripple", "shake"].indexOf(
        preset
    )

    // Extract font properties
    const fontFamily = font.fontFamily || "system-ui, -apple-system, sans-serif"
    const fontWeight = font.fontWeight || "400"

    useEffect(() => {
        console.log(font)
    }, [font])

    // ========================================================================
    // TEXT TEXTURE CREATION
    // ========================================================================

    /**
     * Renders text to a canvas and returns it as a texture
     */
    const createTextTexture = useCallback(
        (width: number, height: number) => {
            if (!textCanvasRef.current) {
                textCanvasRef.current = document.createElement("canvas")
            }

            const canvas = textCanvasRef.current
            canvas.width = width * 2 // Higher resolution for crisp text
            canvas.height = height * 2

            const ctx = canvas.getContext("2d")
            if (!ctx) return null

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Use font size from font prop, or calculate to fit width
            // Parse fontSize - Framer returns it as string like "47px"
            let fontSize: number | undefined
            if (typeof font.fontSize === "number") {
                fontSize = font.fontSize
            } else if (typeof font.fontSize === "string") {
                // Extract numeric value from string (e.g., "47px" -> 47)
                fontSize = parseFloat(font.fontSize) || undefined
            }

            if (fontSize !== undefined && fontSize > 0) {
                fontSize = fontSize * 2 // Scale for higher resolution canvas
            } else {
                // Calculate font size to fit width (approximately 80% of width)
                const targetWidth = width * 0.9
                fontSize = 100
                ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
                let textWidth = ctx.measureText(text).width

                // Scale font size to fit
                fontSize = (fontSize * targetWidth * 2) / textWidth
                fontSize = Math.min(fontSize, height * 1.5) // Don't exceed height
            }

            // Set text style
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
            ctx.fillStyle = color
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"

            // Calculate vertical center using actual text metrics
            const metrics = ctx.measureText(text)
            const ascent = metrics.actualBoundingBoxAscent
            const descent = metrics.actualBoundingBoxDescent
            const textHeight = ascent + descent
            // Position so visual center of text is at canvas center
            const y = canvas.height / 2 + textHeight / 2 - descent

            ctx.fillText(text, canvas.width / 2, y)

            return new CanvasTexture(canvas)
        },
        [text, font, color, fontFamily, fontWeight]
    )

    // ========================================================================
    // SCENE SETUP
    // ========================================================================

    const setupScene = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth || 1
        const height = container.clientHeight || 1

        // Create scene
        const scene = new Scene()
        sceneRef.current = scene

        // Create camera
        const camera = new PerspectiveCamera(
            CAMERA_FOV,
            width / height,
            0.1,
            2000
        )
        configureCameraForSize(camera, width, height)
        cameraRef.current = camera

        // Create renderer
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        rendererRef.current = renderer

        // Create text texture
        const texture = createTextTexture(width, height)

        // Create plane geometry and shader material
        const geometry = new PlaneGeometry(
            width,
            height,
            PLANE_SEGMENTS,
            PLANE_SEGMENTS
        )
        const material = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTexture: new Uniform(texture),
                uSize: new Uniform(new Vector2(width, height)),
                uTime: new Uniform(0.0),
                uScrollSpeed: new Uniform(0.0),
                uPreset: new Uniform(presetIndex),
            },
            transparent: true,
        })

        const mesh = new Mesh(geometry, material)
        scene.add(mesh)
        meshRef.current = mesh
    }, [createTextTexture, presetIndex])

    // ========================================================================
    // RESIZE HANDLING
    // ========================================================================

    const updateSize = useCallback(
        (width: number, height: number) => {
            if (!cameraRef.current || !rendererRef.current || !meshRef.current)
                return

            configureCameraForSize(cameraRef.current, width, height)
            rendererRef.current.setSize(width, height)
            rendererRef.current.setPixelRatio(
                Math.min(window.devicePixelRatio, 2)
            )

            // Update geometry
            if (meshRef.current.geometry) {
                meshRef.current.geometry.dispose()
                meshRef.current.geometry = new PlaneGeometry(
                    width,
                    height,
                    PLANE_SEGMENTS,
                    PLANE_SEGMENTS
                )
            }

            // Update uniforms
            const material = meshRef.current.material
            if (material?.uniforms?.uSize) {
                material.uniforms.uSize.value.set(width, height)
            }

            // Update text texture
            const texture = createTextTexture(width, height)
            if (texture && material?.uniforms?.uTexture) {
                material.uniforms.uTexture.value = texture
            }
        },
        [createTextTexture]
    )

    // ========================================================================
    // RENDER LOOP
    // ========================================================================

    // Linear interpolation utility (matching reference implementation)
    const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b

    // Linear equation utility (matching reference implementation)
    const lineEq = (
        y2: number,
        y1: number,
        x2: number,
        x1: number,
        currentVal: number
    ) => {
        const m = (y2 - y1) / (x2 - x1)
        const q = y1 - m * x1
        return m * currentVal + q
    }

    const renderLoop = useCallback(() => {
        if (
            !rendererRef.current ||
            !sceneRef.current ||
            !cameraRef.current ||
            !meshRef.current
        )
            return

        const material = meshRef.current.material
        if (!material?.uniforms) return

        // Update time (always, for noise animation)
        timeRef.current += 0.016 // ~60fps

        // Handle different modes
        if (isCanvas) {
            // Canvas mode
            if (preview) {
                // Preview ON: show continuous animation
                material.uniforms.uTime.value = timeRef.current
                material.uniforms.uScrollSpeed.value = 0.5
            } else {
                // Preview OFF: no distortion
                material.uniforms.uTime.value = timeRef.current
                material.uniforms.uScrollSpeed.value = 0.0
            }
        } else {
            // Live site: scroll-based animation
            const currentScroll = window.pageYOffset
            const scrolled = Math.abs(currentScroll - lastScrollRef.current)
            lastScrollRef.current = currentScroll

            // Map scroll delta to distortion intensity (0 to 1)
            // Map sensitivity (0.1-1) to maxScrollSpeed (60-10)
            // Lower sensitivity = higher maxScrollSpeed (less sensitive, needs more scroll)
            // Higher sensitivity = lower maxScrollSpeed (more sensitive, needs less scroll)
            const maxScrollSpeed = lineEq(10, 60, 1, 0.1, sensitivity)
            const targetIntensity = Math.min(
                lineEq(1.0, 0.0, maxScrollSpeed, 0, scrolled),
                1.0
            )

            // Smooth transition with lerp (easeFactor from reference: 0.05-0.35)
            const easeFactor = 0.1
            scrollSpeedRef.current = lerp(
                scrollSpeedRef.current,
                targetIntensity,
                easeFactor
            )

            material.uniforms.uTime.value = timeRef.current
            material.uniforms.uScrollSpeed.value = scrollSpeedRef.current
        }

        // Update preset
        material.uniforms.uPreset.value = presetIndex

        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current)

        animationFrameRef.current = requestAnimationFrame(renderLoop)
    }, [isCanvas, preview, presetIndex, sensitivity])

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Initialize scene
    useEffect(() => {
        setupScene()

        // Start render loop
        animationFrameRef.current = requestAnimationFrame(renderLoop)

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (meshRef.current?.geometry) {
                meshRef.current.geometry.dispose()
            }
            if (meshRef.current?.material) {
                meshRef.current.material.dispose()
            }
            if (rendererRef.current) {
                rendererRef.current.dispose()
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
            }
        }
    }, [setupScene, renderLoop])

    // Handle resize
    useEffect(() => {
        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    updateSize(width, height)
                }
            }
        })

        resizeObserver.observe(containerRef.current)
        return () => resizeObserver.disconnect()
    }, [updateSize])

    // Update texture when text/font/color changes
    useEffect(() => {
        if (!meshRef.current?.material || !containerRef.current) return

        const width = containerRef.current.clientWidth || 1
        const height = containerRef.current.clientHeight || 1
        const texture = createTextTexture(width, height)

        if (texture) {
            meshRef.current.material.uniforms.uTexture.value = texture
        }
    }, [text, font, color, createTextTexture])

    // ========================================================================
    // RENDER
    // ========================================================================

    // Empty state message
    if (!text) {
        return (
            <ComponentMessage
                message="Add text to display"
                style={{ width: "100%", height: "100%", ...style }}
            />
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Text element determines the intrinsic size */}
            <div
                style={{
                    fontSize: font.fontSize,
                    fontWeight: font.fontWeight,
                    fontFamily: font.fontFamily,
                    color:"transparent",
                    whiteSpace: "nowrap",
                    position: "relative",
                    zIndex: 2,
                }}
            >
                &nbsp;{text}&nbsp;
            </div>
            {/* Canvas covers full container including padding */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                }}
            />
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(ScrollTextDistortion, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    text: {
        type: ControlType.String,
        title: "Text",
        defaultValue: "DISTORT",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        fontSize: 48,
        defaultValue: {
            fontSize: 48,
            //@ts-ignore
            fontWeight: "600",
            fontFamily: "system-ui, -apple-system, sans-serif",
        },
    },
    sensitivity: {
        type: ControlType.Number,
        title: "Sensitivity",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.8,
    },
    preset: {
        type: ControlType.Enum,
        title: "Effect",
        options: ["liquid", "wave", "glitch", "ripple", "shake"],
        optionTitles: ["Liquid", "Wave", "Prism", "Ripple", "Shake"],
        defaultValue: "liquid",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#7d7d7d",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ScrollTextDistortion.displayName = "Scroll Text Distortion"
