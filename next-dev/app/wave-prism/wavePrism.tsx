import { useEffect, useRef } from "react"
import { RenderTarget, addPropertyControls, ControlType } from "framer"

// CSS variable token and color parsing (hex/rgba/var())
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
function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}
function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 0 }
    const str = input.trim()
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

// UI → shader mapping helpers for better property control UX
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

// Speed: UI [0.1..1] → internal [0.1..5]
function mapSpeedUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.1, 5.0)
}

// Thickness: UI [0.1..1] → internal [0.01..0.2]
function mapThicknessUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.01, 0.2)
}

// Distortion: UI [0..1] → internal [0..0.2]
function mapDistortionUiToInternal(ui: number): number {
    return mapLinear(ui, 0, 1.0, 0, 0.2)
}

// Frequency: UI [0.1..1] → internal [0.1..3]
function mapFrequencyUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.1, 3.0)
}

// Amplitude: UI [0.1..1] → internal [0.1..2]
function mapAmplitudeUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.1, 2.0)
}
import {
    Scene,
    OrthographicCamera,
    Material,
    WebGLRenderer,
    Mesh,
    BufferAttribute,
    BufferGeometry,
    RawShaderMaterial,
    DoubleSide,
    Color,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/wave-prism-1.js"

type Props = {
    speed?: number
    beamThickness?: number
    distortion?: number
    xScale?: number
    yScale?: number
    glow?: number
    backgroundColor?: string
    preview?: boolean
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function WavePrism(props: Props) {
    const {
        speed = 0.2, // UI default 0.2 maps to internal 1.0
        beamThickness = 0.25, // UI default 0.25 maps to internal 0.05
        distortion = 0.25, // UI default 0.25 maps to internal 0.05
        xScale = 0.2, // UI default 0.2 maps to internal 0.1
        yScale = 0.25, // UI default 0.25 maps to internal 0.1
        glow = 1, // Multiplier [0..1] for additive glow intensity
        backgroundColor,
        preview = false,
    } = props

    // Resolve background color from Framer tokens and parse to RGBA
    const resolvedBackgroundColor =
        typeof backgroundColor === "string"
            ? resolveTokenColor(backgroundColor)
            : ""
    const backgroundColorRgba = parseColorToRgba(resolvedBackgroundColor)

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastRef = useRef<{
        w: number
        h: number
        aspect: number
        zoom: number
        ts: number
    }>({ w: 0, h: 0, aspect: 0, zoom: 0, ts: 0 })
    const speedRef = useRef<number>(mapSpeedUiToInternal(speed))
    const sceneRef = useRef<{
        scene: typeof Scene | null
        camera: typeof OrthographicCamera | null
        renderer: typeof WebGLRenderer | null
        mesh: typeof Mesh | null
        uniforms: any
        animationId: number | null
    }>({
        scene: null,
        camera: null,
        renderer: null,
        mesh: null,
        uniforms: null,
        animationId: null,
    })

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return

        const canvas = canvasRef.current
        const container = containerRef.current

        // Ensure canvas fills the component bounds
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        const { current: refs } = sceneRef

        const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

        const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float yOffset; // vertical offset to center the wave
      uniform float distortion;
      uniform float beamThickness;
      uniform float glow; // glow multiplier from controls

      void main() {
        // Use a 'cover' mapping that fills the canvas while preserving aspect
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = beamThickness / abs((p.y + yOffset) + sin((rx + time) * xScale) * yScale);
        float g = beamThickness / abs((p.y + yOffset) + sin((gx + time) * xScale) * yScale);
        float b = beamThickness / abs((p.y + yOffset) + sin((bx + time) * xScale) * yScale);
        // Split low-intensity tails (halo) from bright core; only scale the halo
        vec3 wave = vec3(r, g, b);
        float haloCap = 2.0; // intensities up to this are considered halo
        vec3 halo = min(wave, vec3(haloCap));
        vec3 core = wave - halo; // remains unchanged by Glow
        vec3 col = clamp(core + halo * glow, 0.0, 1.0);
        // Use a soft alpha derived from intensity so the CSS background shows through
        float outAlpha = clamp(max(max(col.r, col.g), col.b) / 2.5, 0.0, 1.0);
        gl_FragColor = vec4(col, outAlpha);
      }
    `

        const initScene = () => {
            refs.scene = new Scene()
            refs.renderer = new WebGLRenderer({
                canvas,
                preserveDrawingBuffer: true, // Prevent flashing during resize
                antialias: false, // Disable for better performance
                alpha: true, // allow transparent backgrounds
            })
            refs.renderer.setPixelRatio(window.devicePixelRatio)
            // Keep canvas fully transparent; let parent div provide background with alpha
            refs.renderer.setClearColor(new Color(0, 0, 0), 0)
            // Ensure no prior scissor state crops the output
            refs.renderer.setScissorTest(false)

            refs.camera = new OrthographicCamera(-1, 1, 1, -1, 0, -1)

            refs.uniforms = {
                resolution: { value: [1, 1] },
                time: { value: 0.0 },
                xScale: { value: mapFrequencyUiToInternal(xScale) },
                yScale: { value: mapAmplitudeUiToInternal(yScale) },
                distortion: { value: mapDistortionUiToInternal(distortion) },
                yOffset: { value: -1 },
                beamThickness: {
                    value: mapThicknessUiToInternal(beamThickness),
                },
                glow: { value: glow },
            }

            const position = [
                -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0,
                -1.0, 1.0, 0.0, 1.0, 1.0, 0.0,
            ]

            const positions = new BufferAttribute(new Float32Array(position), 3)
            const geometry = new BufferGeometry()
            geometry.setAttribute("position", positions)

            const material = new RawShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: refs.uniforms,
                side: DoubleSide,
            })

            refs.mesh = new Mesh(geometry, material)
            refs.scene.add(refs.mesh)

            handleResize()
        }

        const handleResize = () => {
            if (!refs.renderer || !refs.uniforms || !container) return
            const cw = container.clientWidth || container.offsetWidth || 1
            const ch = container.clientHeight || container.offsetHeight || 1

            // Update size without forcing buffer recreation (false = don't update style)
            refs.renderer.setSize(cw, ch, false)
            // Update shader resolution uniform - this is what actually affects rendering
            refs.uniforms.resolution.value = [cw, ch]
            // Use the yOffset prop value
            refs.uniforms.yOffset.value = -1

            // Force a render after resize to ensure the canvas is updated
            if (refs.scene && refs.camera) {
                refs.renderer.render(refs.scene, refs.camera)
            }
        }

        const renderSingleFrame = () => {
            // Render one frame without animation - used in canvas mode when props change
            if (refs.renderer && refs.scene && refs.camera) {
                refs.renderer.render(refs.scene, refs.camera)
            }
        }

        initScene()
        window.addEventListener("resize", handleResize)

        // In Framer Canvas: watch aspect ratio changes only; ignore pure zoom changes
        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const TICK_MS = 250
            const EPSPECT = 0.001
            const EPSZOOM = 0.001
            const tick = (now?: number) => {
                const container = containerRef.current
                const probe = zoomProbeRef.current
                if (container && probe) {
                    const cw =
                        container.clientWidth || container.offsetWidth || 1
                    const ch =
                        container.clientHeight || container.offsetHeight || 1
                    const aspect = cw / ch
                    const zoom = probe.getBoundingClientRect().width / 20

                    const timeOk =
                        !lastRef.current.ts ||
                        (now || performance.now()) - lastRef.current.ts >=
                            TICK_MS
                    const aspectChanged =
                        Math.abs(aspect - lastRef.current.aspect) > EPSPECT
                    const zoomChanged =
                        Math.abs(zoom - lastRef.current.zoom) > EPSZOOM
                    const sizeChanged =
                        Math.abs(cw - lastRef.current.w) > 1 ||
                        Math.abs(ch - lastRef.current.h) > 1

                    if (
                        timeOk &&
                        (aspectChanged || zoomChanged || sizeChanged)
                    ) {
                        lastRef.current = {
                            w: cw,
                            h: ch,
                            aspect,
                            zoom,
                            ts: now || performance.now(),
                        }
                        // Always call handleResize() for any size/aspect change to ensure proper rendering
                        handleResize()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        return () => {
            if (refs.animationId) {
                cancelAnimationFrame(refs.animationId)
            }
            window.removeEventListener("resize", handleResize)
            if (refs.mesh) {
                refs.scene?.remove(refs.mesh)
                refs.mesh.geometry.dispose()
                if (refs.mesh.material instanceof Material) {
                    refs.mesh.material.dispose()
                }
            }
            refs.renderer?.dispose()
        }
    }, [
        speed,
        beamThickness,
        distortion,
        xScale,
        yScale,
        backgroundColor,
        preview,
    ])

    // Update uniforms when props change - this works in both canvas and live mode
    useEffect(() => {
        const { current: refs } = sceneRef

        if (refs.uniforms) {
            refs.uniforms.xScale.value = mapFrequencyUiToInternal(xScale)
            refs.uniforms.yScale.value = mapAmplitudeUiToInternal(yScale)
            refs.uniforms.distortion.value =
                mapDistortionUiToInternal(distortion)
            refs.uniforms.yOffset.value = -1
            refs.uniforms.beamThickness.value =
                mapThicknessUiToInternal(beamThickness)
            refs.uniforms.glow.value = glow
        }

        // In canvas mode, render a single frame when props change
        if (
            RenderTarget.current() === RenderTarget.canvas &&
            refs.renderer &&
            refs.scene &&
            refs.camera
        ) {
            refs.renderer.render(refs.scene, refs.camera)
        }
    }, [speed, beamThickness, distortion, xScale, yScale, glow])

    // Update speed ref when speed prop changes (works in both canvas and live mode)
    useEffect(() => {
        speedRef.current = mapSpeedUiToInternal(speed)
    }, [speed])

    // Update canvas background color when backgroundColor prop changes
    useEffect(() => {
        const canvas = canvasRef.current
        const { current: refs } = sceneRef

        if (canvas && refs.renderer) {
            const resolvedBgColor = resolveTokenColor(backgroundColor)
            const bgColorRgba = parseColorToRgba(resolvedBgColor)

            // Keep WebGL clear fully transparent so CSS background opacity shows through
            refs.renderer.setClearColor(new Color(0, 0, 0), 0)

            // Force a render to show the new background immediately
            if (refs.scene && refs.camera) {
                refs.renderer.render(refs.scene, refs.camera)
            }
        }
    }, [backgroundColor])

    // Restart animation loop when preview prop changes
    useEffect(() => {
        const { current: refs } = sceneRef

        // Cancel existing animation
        if (refs.animationId) {
            cancelAnimationFrame(refs.animationId)
            refs.animationId = null
        }

        // Start new animation loop based on current preview setting
        const animate = () => {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas

            if (isCanvas && !preview) {
                // Canvas mode with preview disabled: NO animation loop for maximum performance
                return
            } else {
                // Live mode OR canvas mode with preview enabled: full animation
                if (refs.uniforms)
                    refs.uniforms.time.value += 0.01 * speedRef.current
                if (refs.renderer && refs.scene && refs.camera) {
                    refs.renderer.render(refs.scene, refs.camera)
                }
                refs.animationId = requestAnimationFrame(animate)
            }
        }

        // Start the animation loop
        animate()
    }, [preview])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "block",
                margin: 0,
                padding: 0,
                // Let CSS background with alpha show through WebGL canvas
                background: backgroundColor || "transparent",
            }}
        >
            {/* Hidden 20x20 probe to detect editor zoom level in canvas */}
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
            <canvas ref={canvasRef} />
        </div>
    )
}

WavePrism.displayName = "Wave Prism"

// Property Controls
addPropertyControls(WavePrism, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.2,
    },
    beamThickness: {
        type: ControlType.Number,
        title: "Thickness",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    distortion: {
        type: ControlType.Number,
        title: "Distortion",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.25,
    },
    xScale: {
        type: ControlType.Number,
        title: "Frequency",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    yScale: {
        type: ControlType.Number,
        title: "Amplitude",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.3,
    },
    glow: {
        type: ControlType.Number,
        title: "Glow",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 1,
    },

    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: undefined as any,
        optional: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

WavePrism.displayName = "Wave Prism"
