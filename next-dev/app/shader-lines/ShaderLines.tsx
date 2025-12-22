import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Color parsing utilities
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

declare global {
    interface Window {
        THREE: any
    }
}

type ShaderLinesProps = {
    speed?: number
    bandWidth?: number
    flow?: "in-out" | "out-in"
    preview?: boolean
    colorMode?: "single" | "spectrum"
    color?: string
    color1?: string
    color2?: string
    color3?: string
    backgroundColor?: string
    blendMode?: "alpha" | "additive"
}

// UI → Internal mapping helpers
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

// Speed: UI [0.1..1] → internal [0.1..5] (higher UI = much faster animation)
function mapSpeedUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 1.0, 10.0)
}

// Band Width: UI [0.1..1] → CSS pixels [20..100]
//  - 0.1 → 20px (narrow)
//  - 1.0 → 100px (wide)
function mapBandWidthUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 2.0, 60.0)
}

// Flow: +1 for forward (in-out), -1 for reverse (out-in)
function mapFlowToSign(flow?: "in-out" | "out-in"): number {
    return flow === "out-in" ? -1 : 1
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 700
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */
export default function ShaderLines(props: ShaderLinesProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const speedRef = useRef<number>(mapSpeedUiToInternal(props.speed ?? 0.5))
    const bandWidthRef = useRef<number>(
        mapBandWidthUiToInternal(props.bandWidth ?? 0.5)
    )
    const flowSignRef = useRef<number>(mapFlowToSign(props.flow))
    const previewRef = useRef<boolean>(props.preview ?? false)
    const colorModeRef = useRef<"single" | "spectrum">(
        props.colorMode ?? "single"
    )
    const blendModeRef = useRef<"alpha" | "additive">(
        props.blendMode ?? "additive"
    )

    // Parse colors to RGBA values with opacity support
    const resolvedBackgroundColor = resolveTokenColor(props.backgroundColor)
    const backgroundColorRgba = parseColorToRgba(
        resolvedBackgroundColor || "#000000"
    )

    const colorRgba = parseColorToRgba(props.color ?? "#ffffff")
    const color1Rgba = parseColorToRgba(props.color1 ?? "#0008FF")
    const color2Rgba = parseColorToRgba(props.color2 ?? "#000000")
    const color3Rgba = parseColorToRgba(props.color3 ?? "#70EAFF")

    const backgroundColorRef = useRef<[number, number, number, number]>([
        backgroundColorRgba.r,
        backgroundColorRgba.g,
        backgroundColorRgba.b,
        backgroundColorRgba.a,
    ])
    const colorRef = useRef<[number, number, number, number]>([
        colorRgba.r,
        colorRgba.g,
        colorRgba.b,
        colorRgba.a,
    ])
    const color1Ref = useRef<[number, number, number, number]>([
        color1Rgba.r,
        color1Rgba.g,
        color1Rgba.b,
        color1Rgba.a,
    ])
    const color2Ref = useRef<[number, number, number, number]>([
        color2Rgba.r,
        color2Rgba.g,
        color2Rgba.b,
        color2Rgba.a,
    ])
    const color3Ref = useRef<[number, number, number, number]>([
        color3Rgba.r,
        color3Rgba.g,
        color3Rgba.b,
        color3Rgba.a,
    ])
    const lastRef = useRef<{
        w: number
        h: number
        aspect: number
        ts: number
    }>({ w: 0, h: 0, aspect: 0, ts: 0 })
    const sceneRef = useRef<{
        camera: any
        scene: any
        renderer: any
        uniforms: any
        animationId: number | null
        onResize: (() => void) | null
    }>({
        camera: null,
        scene: null,
        renderer: null,
        uniforms: null,
        animationId: null,
        onResize: null,
    })

    // Reflect prop changes immediately inside the RAF loop (without re-initializing Three)
    useEffect(() => {
        speedRef.current = mapSpeedUiToInternal(props.speed ?? 0.5)
    }, [props.speed])

    useEffect(() => {
        bandWidthRef.current = mapBandWidthUiToInternal(props.bandWidth ?? 0.5)
    }, [props.bandWidth])

    useEffect(() => {
        flowSignRef.current = mapFlowToSign(props.flow)
    }, [props.flow])

    useEffect(() => {
        previewRef.current = props.preview ?? false
    }, [props.preview])

    useEffect(() => {
        colorModeRef.current = props.colorMode ?? "single"
    }, [props.colorMode])

    useEffect(() => {
        blendModeRef.current = props.blendMode ?? "additive"
    }, [props.blendMode])

    useEffect(() => {
        const resolvedBgColor = resolveTokenColor(props.backgroundColor)
        const bgRgba = parseColorToRgba(resolvedBgColor || "#000000")
        backgroundColorRef.current = [bgRgba.r, bgRgba.g, bgRgba.b, bgRgba.a]
    }, [props.backgroundColor])

    useEffect(() => {
        const colorRgba = parseColorToRgba(props.color ?? "#ffffff")
        colorRef.current = [colorRgba.r, colorRgba.g, colorRgba.b, colorRgba.a]
    }, [props.color])

    useEffect(() => {
        const color1Rgba = parseColorToRgba(props.color1 ?? "#0008FF")
        color1Ref.current = [
            color1Rgba.r,
            color1Rgba.g,
            color1Rgba.b,
            color1Rgba.a,
        ]
    }, [props.color1])

    useEffect(() => {
        const color2Rgba = parseColorToRgba(props.color2 ?? "#000000")
        color2Ref.current = [
            color2Rgba.r,
            color2Rgba.g,
            color2Rgba.b,
            color2Rgba.a,
        ]
    }, [props.color2])

    useEffect(() => {
        const color3Rgba = parseColorToRgba(props.color3 ?? "#70EAFF")
        color3Ref.current = [
            color3Rgba.r,
            color3Rgba.g,
            color3Rgba.b,
            color3Rgba.a,
        ]
    }, [props.color3])

    useEffect(() => {
        // Load Three.js dynamically
        const script = document.createElement("script")
        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
        script.onload = () => {
            if (containerRef.current && window.THREE) {
                initThreeJS()
            }
        }
        document.head.appendChild(script)

        return () => {
            // Cleanup
            if (sceneRef.current.animationId) {
                cancelAnimationFrame(sceneRef.current.animationId)
            }
            if (sceneRef.current.onResize) {
                sceneRef.current.onResize()
            }
            if (sceneRef.current.renderer) {
                sceneRef.current.renderer.dispose()
            }
            document.head.removeChild(script)
        }
    }, [])

    const initThreeJS = () => {
        if (!containerRef.current || !window.THREE) return

        const THREE = window.THREE
        const container = containerRef.current

        // Clear any existing content
        container.innerHTML = ""

        // Initialize camera
        const camera = new THREE.Camera()
        camera.position.z = 1

        // Initialize scene
        const scene = new THREE.Scene()

        // Create geometry
        const geometry = new THREE.PlaneBufferGeometry(2, 2)

        // Define uniforms
        const uniforms = {
            time: { type: "f", value: 1.0 },
            resolution: { type: "v2", value: new THREE.Vector2() },
            // Pass band width in DEVICE pixels for resolution-consistent sizing
            bandWidthPx: {
                type: "f",
                value: bandWidthRef.current * (window.devicePixelRatio || 1),
            },
            backgroundColor: {
                type: "v4",
                value: new THREE.Vector4(...backgroundColorRef.current),
            },
            color: {
                type: "v4",
                value: new THREE.Vector4(...colorRef.current),
            },
            color1: {
                type: "v4",
                value: new THREE.Vector4(...color1Ref.current),
            },
            color2: {
                type: "v4",
                value: new THREE.Vector4(...color2Ref.current),
            },
            color3: {
                type: "v4",
                value: new THREE.Vector4(...color3Ref.current),
            },
            colorMode: {
                type: "f",
                value: colorModeRef.current === "single" ? 0.0 : 1.0,
            },
            blendMode: {
                type: "f",
                value: blendModeRef.current === "alpha" ? 0.0 : 1.0,
            },
        }

        // Vertex shader
        const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

        // Fragment shader
        const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float bandWidthPx; // band width in DEVICE pixels
      uniform vec4 backgroundColor; // Background color with opacity
      uniform vec4 color; // Single color with opacity
      uniform vec4 color1; // Spectrum color 1 with opacity
      uniform vec4 color2; // Spectrum color 2 with opacity
      uniform vec4 color3; // Spectrum color 3 with opacity
      uniform float colorMode; // 0.0 = single, 1.0 = spectrum
      uniform float blendMode; // 0.0 = alpha, 1.0 = additive
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }
      
      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        // Quantize X in DEVICE pixels for consistent visual width across resolutions.
        // Compute the center of each band in pixel space, then convert back to uv.x.
        float bandCenterPx = floor(gl_FragCoord.x / bandWidthPx) * bandWidthPx + bandWidthPx * 0.5;
        uv.x = (bandCenterPx * 2.0 - resolution.x) / min(resolution.x, resolution.y);
          
        float t = time*0.06+random(uv.x)*0.4;
        float lineWidth = 0.0008;

        vec3 colorIntensity = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            colorIntensity[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
          }
        }

        vec3 finalColor;
        float finalAlpha;
        
        if (colorMode < 0.5) {
          // Single color mode: multiply intensity by single color
          finalColor = colorIntensity * color.rgb;
          finalAlpha = color.a;
        } else {
          // Spectrum mode: apply different colors to each channel
          finalColor = vec3(0.0);
          finalColor += colorIntensity.r * color1.rgb; // Red channel uses color1
          finalColor += colorIntensity.g * color2.rgb; // Green channel uses color2  
          finalColor += colorIntensity.b * color3.rgb; // Blue channel uses color3
          // Use average alpha of all colors for spectrum mode
          finalAlpha = (color1.a + color2.a + color3.a) / 3.0;
        }
        
        // Calculate ray intensity for alpha blending
        float rayIntensity = max(max(finalColor.r, finalColor.g), finalColor.b);
        
        // Ensure minimum visibility
        if (rayIntensity < 0.01) {
          finalColor = color.rgb * 0.1; // Show at least 10% of the color
          rayIntensity = 0.1;
        }

        // Handle background color with blend mode selection
        vec3 bgColor = backgroundColor.rgb;
        float bgAlpha = backgroundColor.a;
        
        vec3 blendedColor;
        float outputAlpha;
        
        if (blendMode < 0.5) {
          // Alpha blending: clean, proper transparency
          blendedColor = finalColor.rgb * rayIntensity + bgColor * bgAlpha * (1.0 - rayIntensity);
          outputAlpha = rayIntensity + bgAlpha * (1.0 - rayIntensity);
        } else {
          // Additive blending: rainbow/prismatic effect
          blendedColor = finalColor.rgb + bgColor * bgAlpha;
          outputAlpha = 1.0; // Always opaque for additive
        }

        gl_FragColor = vec4(blendedColor, outputAlpha);
      }
    `

        // Create material
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        })

        // Create mesh and add to scene
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // Initialize renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setClearColor(0x000000, 0) // Transparent background
        // Ensure canvas fills container reliably in Framer editor and live preview
        const canvasEl = renderer.domElement as HTMLCanvasElement
        canvasEl.style.position = "absolute"
        ;(canvasEl.style as any).inset = "0"
        canvasEl.style.width = "100%"
        canvasEl.style.height = "100%"
        canvasEl.style.display = "block"
        container.appendChild(canvasEl)

        // Store references
        sceneRef.current = {
            camera,
            scene,
            renderer,
            uniforms,
            animationId: null,
            onResize: null,
        }

        // Handle resize
        const onWindowResize = () => {
            const w = container.clientWidth || container.offsetWidth || 1
            const h = container.clientHeight || container.offsetHeight || 1
            renderer.setSize(w, h)
            uniforms.resolution.value.x = renderer.domElement.width
            uniforms.resolution.value.y = renderer.domElement.height
        }

        onWindowResize()
        sceneRef.current.onResize = onWindowResize
        window.addEventListener("resize", onWindowResize, false)

        // Canvas resize detection for Framer Canvas
        if (RenderTarget.current() === RenderTarget.canvas) {
            let rafId = 0
            const TICK_MS = 250
            const EPSPECT = 0.001
            const tick = (now?: number) => {
                const container = containerRef.current
                if (container) {
                    const cw =
                        container.clientWidth || container.offsetWidth || 1
                    const ch =
                        container.clientHeight || container.offsetHeight || 1
                    const aspect = cw / ch

                    const timeOk =
                        !lastRef.current.ts ||
                        (now || performance.now()) - lastRef.current.ts >=
                            TICK_MS
                    const aspectChanged =
                        Math.abs(aspect - lastRef.current.aspect) > EPSPECT
                    const sizeChanged =
                        Math.abs(cw - lastRef.current.w) > 1 ||
                        Math.abs(ch - lastRef.current.h) > 1

                    if (timeOk && (aspectChanged || sizeChanged)) {
                        lastRef.current = {
                            w: cw,
                            h: ch,
                            aspect,
                            ts: now || performance.now(),
                        }
                        // Call resize handler to update renderer and uniforms
                        onWindowResize()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)

            // Store cleanup function
            sceneRef.current.onResize = () => {
                cancelAnimationFrame(rafId)
                window.removeEventListener("resize", onWindowResize)
            }
        }

        // Animation loop with frame-rate independent timing
        let lastTime = 0
        const animate = (currentTime: number) => {
            sceneRef.current.animationId = requestAnimationFrame(animate)

            // Calculate delta time for frame-rate independent animation
            const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016 // Default to 60fps on first frame
            lastTime = currentTime

            // Update uniforms with current prop values
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const isPreviewOn = previewRef.current
            if (!(isCanvas && !isPreviewOn)) {
                uniforms.time.value +=
                    deltaTime * speedRef.current * flowSignRef.current
            }
            // Convert CSS px → DEVICE px using renderer pixel ratio
            const pixelRatio =
                (renderer.getPixelRatio
                    ? renderer.getPixelRatio()
                    : window.devicePixelRatio) || 1
            uniforms.bandWidthPx.value = bandWidthRef.current * pixelRatio

            // Update color uniforms
            uniforms.backgroundColor.value.set(...backgroundColorRef.current)
            uniforms.color.value.set(...colorRef.current)
            uniforms.color1.value.set(...color1Ref.current)
            uniforms.color2.value.set(...color2Ref.current)
            uniforms.color3.value.set(...color3Ref.current)
            uniforms.colorMode.value =
                colorModeRef.current === "single" ? 0.0 : 1.0
            uniforms.blendMode.value =
                blendModeRef.current === "alpha" ? 0.0 : 1.0

            renderer.render(scene, camera)
        }

        animate(0)
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "block",
                margin: 0,
                padding: 0,
            }}
        />
    )
}

// Property Controls (keep last control with Framer University link)
addPropertyControls(ShaderLines, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
    bandWidth: {
        type: ControlType.Number,
        title: "Band Width",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.2,
    },
    flow: {
        type: ControlType.Enum,
        title: "Flow",
        options: ["in-out", "out-in"],
        optionTitles: ["In → Out", "Out → In"],
        defaultValue: "in-out",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    colorMode: {
        type: ControlType.Enum,
        title: "Color Mode",
        options: ["single", "spectrum"],
        optionTitles: ["Single Color", "Spectrum"],
        defaultValue: "single",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
        hidden: (props) => props.colorMode === "spectrum",
    },
    color1: {
        type: ControlType.Color,
        title: "Color 1",
        defaultValue: "#0008FF",
        hidden: (props) => props.colorMode === "single",
    },
    color2: {
        type: ControlType.Color,
        title: "Color 2",
        defaultValue: "#000000",
        hidden: (props) => props.colorMode === "single",
    },
    color3: {
        type: ControlType.Color,
        title: "Color 3",
        defaultValue: "#70EAFF",
        hidden: (props) => props.colorMode === "single",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        description:
            "Opacity only works if Blend = Alpha",
    },
    blendMode: {
        type: ControlType.Enum,
        title: "Blend Mode",
        options: ["alpha", "additive"],
        optionTitles: ["Alpha", "Additive"],
        defaultValue: "additive",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ShaderLines.displayName = "Shader Lines"
