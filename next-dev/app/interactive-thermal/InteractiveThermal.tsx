import { useEffect, useRef } from "react"
import type { ComponentType } from "react"
import {
    ClampToEdgeWrapping,
    Color,
    DataTexture,
    LinearFilter,
    MathUtils,
    Mesh,
    OrthographicCamera,
    PlaneGeometry,
    RGBAFormat,
    SRGBColorSpace,
    Scene,
    ShaderMaterial,
    Texture,
    TextureLoader,
    Vector4,
    WebGLRenderer,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/thermal-interactive2.js"
import type {
    Color as ThreeColor,
    DataTexture as ThreeDataTexture,
    Mesh as ThreeMesh,
    OrthographicCamera as ThreeOrthographicCamera,
    PlaneGeometry as ThreePlaneGeometry,
    Scene as ThreeScene,
    ShaderMaterial as ThreeShaderMaterial,
    Texture as ThreeTexture,
    Vector4 as ThreeVector4,
    WebGLRenderer as ThreeWebGLRenderer,
} from "three"
import { RenderTarget, addPropertyControls, ControlType } from "framer"

type InteractiveThermalProps = {
    backgroundColor?: string
    speed?: number
    contour?: number
    angle?: number
    noise?: number
    innerGlow?: number
    outerGlow?: number
    scale?: number
    colorBack?: string
    colors?: string[]
    image?: string
    pointerIntensity?: number
    pointerSize?: number
    preview?: boolean
}

type ThermalUniforms = {
    uTime: { value: number }
    uSpeed: { value: number }
    uContour: { value: number }
    uAngle: { value: number }
    uNoise: { value: number }
    uInnerGlow: { value: number }
    uOuterGlow: { value: number }
    uScale: { value: number }
    uPointerStrength: { value: number }
    uHeatMap: { value: ThreeDataTexture | null }
    uMaskTexture: { value: ThreeTexture | null }
    uMaskEnabled: { value: number }
    uColorBack: { value: ThreeVector4 }
    uColorCount: { value: number }
    uColors: { value: ThreeColor[] }
}

const MAX_COLORS = 8
const HEAT_RESOLUTION = 256

const defaultPalette = [
    "#11206a",
    "#1f3ba2",
    "#2f63e7",
    "#6bd7ff",
    "#ffe679",
    "#ff991e",
    "#ff4c00",
]

const defaultImage =
    "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"

const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision mediump float;

#define MAX_COLORS ${MAX_COLORS}

uniform sampler2D uHeatMap;
uniform float uTime;
uniform sampler2D uMaskTexture;
uniform float uMaskEnabled;
uniform float uSpeed;
uniform float uContour;
uniform float uAngle;
uniform float uNoise;
uniform float uInnerGlow;
uniform float uOuterGlow;
uniform float uScale;
uniform float uPointerStrength;
uniform vec4 uColorBack;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];

varying vec2 vUv;

float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 rotate(vec2 uv, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    return m * uv;
}

vec3 samplePalette(float t) {
    if (uColorCount <= 0) return vec3(1.0);
    float clampedT = clamp(t, 0.0, 1.0);
    float scaled = clampedT * float(uColorCount - 1);
    int baseIndex = int(floor(scaled + 0.0001));
    int nextIndex = min(baseIndex + 1, uColorCount - 1);
    float f = fract(scaled);

    vec3 c0 = uColors[0];
    vec3 c1 = uColors[0];

    for (int i = 0; i < MAX_COLORS; i++) {
        if (i == baseIndex) {
            c0 = uColors[i];
        }
        if (i == nextIndex) {
            c1 = uColors[i];
        }
    }

    return mix(c0, c1, f);
}

void main() {
    vec2 centered = vUv - 0.5;
    centered *= uScale;
    centered = rotate(centered, uAngle);
    vec2 uv = centered + 0.5;

    float heat = texture2D(uHeatMap, vUv).r;
    float wave = 0.5 + 0.5 * sin(uTime * uSpeed + uv.y * 6.2831);
    float ripple = 0.5 + 0.5 * sin(uTime * uSpeed * 0.5 + uv.x * 12.566);
    float organic = mix(wave, ripple, 0.4);

    float energy = heat * uPointerStrength;
    energy = pow(clamp(energy + organic * uInnerGlow, 0.0, 1.0), mix(0.5, 3.0, clamp(uContour, 0.0, 1.0)));
    float noise = random(uv * 40.0 + uTime * 0.25);
    energy += (noise - 0.5) * uNoise;

    float maskInfluence = 1.0;
    if (uMaskEnabled > 0.5) {
        vec4 maskSample = texture2D(uMaskTexture, clamp(uv, 0.0, 1.0));
        float maskValue = max(max(maskSample.r, maskSample.g), maskSample.b);
        maskInfluence = clamp(1.0 - maskValue, 0.0, 1.0);
    }

    energy *= maskInfluence;

    energy = clamp(energy, 0.0, 1.0);

    vec3 paletteColor = samplePalette(energy);
    vec3 finalColor = mix(uColorBack.rgb, paletteColor, clamp(energy + uOuterGlow, 0.0, 1.0));
    float alpha = max(uColorBack.a, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
}
`

const cssVariableRegex =
    /var\\s*\\(\\s*(--[\\w-]+)(?:\\s*,\\s*((?:[^)(]+|\\((?:[^)(]+|\\([^)(]*\\))*\\))*))?\\s*\\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: string | undefined, fallback: string): string {
    const value = (input || fallback).trim()
    if (!value) return fallback
    if (!value.startsWith("var(")) return value
    return resolveTokenColor(extractDefaultValue(value), fallback)
}

function parseColorToRgba(input: string | undefined, fallback: string): [number, number, number, number] {
    const resolved = resolveTokenColor(input, fallback).trim().toLowerCase()
    if (!resolved) return parseColorToRgba(fallback, "#000000ff")

    const rgbaMatch = resolved.match(
        /rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*(?:,\\s*([\\d.]+)\\s*)?\\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return [r, g, b, a]
    }

    if (resolved.startsWith("#")) {
        let hex = resolved.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .split("")
                .map((digit) => digit + digit)
                .join("")
        }
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16) / 255
            const g = parseInt(hex.slice(2, 4), 16) / 255
            const b = parseInt(hex.slice(4, 6), 16) / 255
            const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            return [r, g, b, a]
        }
    }

    return parseColorToRgba(fallback, "#000000ff")
}

function buildPalette(input: string[] | undefined): [number, number, number][] {
    const source = Array.isArray(input) && input.length > 0 ? input : defaultPalette
    const palette: [number, number, number][] = []
    for (let i = 0; i < Math.min(source.length, MAX_COLORS); i++) {
        const value = source[i] || source[source.length - 1] || defaultPalette[i % defaultPalette.length]
        const [r, g, b] = parseColorToRgba(value, defaultPalette[i % defaultPalette.length])
        palette.push([r, g, b])
    }
    if (palette.length === 0) {
        palette.push(...buildPalette(defaultPalette))
    }
    return palette
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
const InteractiveThermalEffect: ComponentType<InteractiveThermalProps> = (props) => {
    const {
        backgroundColor = "#000000",
        speed = 1,
        contour = 0.6,
        angle = 0,
        noise = 0.08,
        innerGlow = 0.65,
        outerGlow = 0.35,
        scale = 1,
        colorBack = "#00000000",
        colors = defaultPalette,
        image,
        pointerIntensity = 0.75,
        pointerSize = 0.2,
        preview = true,
    } = props

    const imageSource =
        typeof image === "string" && image.trim().length > 0 ? image.trim() : defaultImage

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const uniformsRef = useRef<ThermalUniforms | null>(null)
    const rendererRef = useRef<ThreeWebGLRenderer | null>(null)
    const sceneRef = useRef<ThreeScene | null>(null)
    const cameraRef = useRef<ThreeOrthographicCamera | null>(null)
    const meshRef = useRef<ThreeMesh<ThreePlaneGeometry, ThreeShaderMaterial> | null>(null)
    const heatTextureRef = useRef<ThreeDataTexture | null>(null)
    const maskTextureRef = useRef<ThreeTexture | null>(null)
    const heatDataRef = useRef<Uint8Array | null>(null)
    const animationRef = useRef<number | null>(null)
    const previewRef = useRef<boolean>(preview)
    const renderLoopRef = useRef<(timestamp: number) => void>()
    const pointerSettingsRef = useRef({
        intensity: pointerIntensity,
        radius: pointerSize,
    })

    useEffect(() => {
        pointerSettingsRef.current = {
            intensity: clamp(pointerIntensity, 0, 1),
            radius: clamp(pointerSize, 0.05, 0.45),
        }
        if (uniformsRef.current) {
            uniformsRef.current.uPointerStrength.value = pointerSettingsRef.current.intensity
        }
    }, [pointerIntensity, pointerSize])

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const renderer = new WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        rendererRef.current = renderer

        const scene = new Scene()
        sceneRef.current = scene

        const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
        cameraRef.current = camera

        const geometry = new PlaneGeometry(2, 2)

        const heatData = new Uint8Array(HEAT_RESOLUTION * HEAT_RESOLUTION * 4)
        heatDataRef.current = heatData

        const heatTexture = new DataTexture(
            heatData,
            HEAT_RESOLUTION,
            HEAT_RESOLUTION,
            RGBAFormat
        )
        heatTexture.needsUpdate = true
        heatTexture.magFilter = LinearFilter
        heatTexture.minFilter = LinearFilter
        heatTextureRef.current = heatTexture

        const palette = buildPalette(colors)
        const colorArray = Array.from({ length: MAX_COLORS }, (_, index) => {
            const [r, g, b] = palette[Math.min(index, palette.length - 1)]
            return new Color(r, g, b)
        })

        const [backR, backG, backB, backA] = parseColorToRgba(colorBack, "#00000000")

        const uniforms: ThermalUniforms = {
            uTime: { value: 0 },
            uSpeed: { value: speed },
            uContour: { value: contour },
            uAngle: { value: MathUtils.degToRad(angle) },
            uNoise: { value: noise },
            uInnerGlow: { value: innerGlow },
            uOuterGlow: { value: outerGlow },
            uScale: { value: clamp(scale, 0.3, 2) },
            uPointerStrength: { value: pointerSettingsRef.current.intensity },
            uHeatMap: { value: heatTexture },
            uMaskTexture: { value: null },
            uMaskEnabled: { value: 0 },
            uColorBack: { value: new Vector4(backR, backG, backB, backA) },
            uColorCount: { value: palette.length },
            uColors: { value: colorArray },
        }
        uniformsRef.current = uniforms

        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
        })

        const mesh = new Mesh(geometry, material)
        meshRef.current = mesh
        scene.add(mesh)

        const resize = () => {
            const bounds = container.getBoundingClientRect()
            const width = Math.max(1, Math.floor(bounds.width))
            const height = Math.max(1, Math.floor(bounds.height))
            renderer.setSize(width, height, false)
        }

        const stampHeat = (nx: number, ny: number) => {
            const data = heatDataRef.current
            const texture = heatTextureRef.current
            if (!data || !texture) return

            const size = HEAT_RESOLUTION
            const centerX = clamp(Math.round(nx * (size - 1)), 0, size - 1)
            const centerY = clamp(Math.round(ny * (size - 1)), 0, size - 1)
            const radius = clamp(pointerSettingsRef.current.radius, 0.02, 0.5) * size
            const intensity = pointerSettingsRef.current.intensity
            const radiusSq = radius * radius

            const minX = Math.max(0, Math.floor(centerX - radius))
            const maxX = Math.min(size - 1, Math.ceil(centerX + radius))
            const minY = Math.max(0, Math.floor(centerY - radius))
            const maxY = Math.min(size - 1, Math.ceil(centerY + radius))

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const dx = x - centerX
                    const dy = y - centerY
                    const distanceSq = dx * dx + dy * dy
                    if (distanceSq > radiusSq) continue

                    const falloff = 1 - distanceSq / radiusSq
                    const boost = intensity * falloff * falloff
                    const idx = (y * size + x) * 4
                    const current = data[idx]
                    const next = Math.min(255, current + Math.round(boost * 255))
                    data[idx] = next
                    data[idx + 1] = next
                    data[idx + 2] = next
                    data[idx + 3] = 255
                }
            }

            texture.needsUpdate = true
        }

        const fadeHeat = () => {
            const data = heatDataRef.current
            const texture = heatTextureRef.current
            if (!data || !texture) return

            let changed = false
            for (let i = 0; i < data.length; i += 4) {
                const current = data[i]
                if (current <= 0) continue
                const cooled = current * 0.965 - 1
                const next = cooled <= 1 ? 0 : Math.min(255, Math.max(0, Math.floor(cooled)))
                if (next !== current) {
                    data[i] = next
                    data[i + 1] = next
                    data[i + 2] = next
                    changed = true
                }
            }

            if (changed) {
                texture.needsUpdate = true
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            const bounds = container.getBoundingClientRect()
            if (bounds.width === 0 || bounds.height === 0) return
            const nx = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
            const ny = clamp((event.clientY - bounds.top) / bounds.height, 0, 1)
            stampHeat(nx, 1 - ny)
            if (!previewRef.current && renderLoopRef.current) {
                renderLoopRef.current(performance.now())
            }
        }

        const handlePointerLeave = () => {
            if (!previewRef.current && renderLoopRef.current) {
                renderLoopRef.current(performance.now())
            }
        }

        const renderScene = (timestamp: number) => {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const shouldAnimate = previewRef.current || !isCanvas

            uniforms.uTime.value = shouldAnimate ? timestamp * 0.001 : uniforms.uTime.value

            if (shouldAnimate) {
                fadeHeat()
            }

            renderer.render(scene, camera)

            if (shouldAnimate) {
                animationRef.current = requestAnimationFrame(renderScene)
            } else {
                animationRef.current = null
            }
        }

        renderLoopRef.current = renderScene

        resize()
        window.addEventListener("resize", resize)
        container.addEventListener("pointermove", handlePointerMove, { passive: true })
        container.addEventListener("pointerdown", handlePointerMove, { passive: true })
        container.addEventListener("pointerleave", handlePointerLeave)

        animationRef.current = requestAnimationFrame(renderScene)

        return () => {
            window.removeEventListener("resize", resize)
            container.removeEventListener("pointermove", handlePointerMove)
            container.removeEventListener("pointerdown", handlePointerMove)
            container.removeEventListener("pointerleave", handlePointerLeave)

            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
            }

            if (mesh) {
                scene.remove(mesh)
                mesh.geometry.dispose()
                mesh.material.dispose()
            }

            renderer.dispose()
            heatTexture.dispose()
            if (maskTextureRef.current) {
                maskTextureRef.current.dispose()
                maskTextureRef.current = null
            }

            rendererRef.current = null
            sceneRef.current = null
            cameraRef.current = null
            meshRef.current = null
            uniformsRef.current = null
            heatTextureRef.current = null
            heatDataRef.current = null
            renderLoopRef.current = undefined
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        previewRef.current = preview
        if (preview && animationRef.current === null && renderLoopRef.current) {
            animationRef.current = requestAnimationFrame(renderLoopRef.current)
        }
    }, [preview])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        uniforms.uSpeed.value = speed
        uniforms.uContour.value = clamp(contour, 0, 1)
        uniforms.uAngle.value = MathUtils.degToRad(angle)
        uniforms.uNoise.value = clamp(noise, 0, 1)
        uniforms.uInnerGlow.value = clamp(innerGlow, 0, 1)
        uniforms.uOuterGlow.value = clamp(outerGlow, 0, 1)
        uniforms.uScale.value = clamp(scale, 0.3, 2)
    }, [speed, contour, angle, noise, innerGlow, outerGlow, scale])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        const palette = buildPalette(colors)
        uniforms.uColorCount.value = palette.length
        for (let i = 0; i < MAX_COLORS; i++) {
            const [r, g, b] = palette[Math.min(i, palette.length - 1)]
            uniforms.uColors.value[i].set(r, g, b)
        }
    }, [colors])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return
        const [r, g, b, a] = parseColorToRgba(colorBack, "#00000000")
        uniforms.uColorBack.value.set(r, g, b, a)
    }, [colorBack])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        const loader = new TextureLoader()
        let cancelled = false

        const cleanupTexture = () => {
            if (maskTextureRef.current) {
                maskTextureRef.current.dispose()
                maskTextureRef.current = null
            }
        }

        if (!imageSource) {
            cleanupTexture()
            uniforms.uMaskTexture.value = null
            uniforms.uMaskEnabled.value = 0
            return
        }

        loader.load(
            imageSource,
            (texture: ThreeTexture) => {
                if (cancelled) {
                    texture.dispose()
                    return
                }
                texture.colorSpace = SRGBColorSpace
                texture.wrapS = ClampToEdgeWrapping
                texture.wrapT = ClampToEdgeWrapping
                texture.needsUpdate = true

                cleanupTexture()
                maskTextureRef.current = texture
                uniforms.uMaskTexture.value = texture
                uniforms.uMaskEnabled.value = 1
            },
            undefined,
            () => {
                if (cancelled) return
                cleanupTexture()
                uniforms.uMaskTexture.value = null
                uniforms.uMaskEnabled.value = 0
            }
        )

        return () => {
            cancelled = true
        }
    }, [imageSource])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                backgroundColor,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    inset: 0,
                }}
            />
        </div>
    )
}

addPropertyControls(InteractiveThermalEffect, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 1,
    },
    contour: {
        type: ControlType.Number,
        title: "Contour",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.6,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        step: 5,
        defaultValue: 0,
        unit: "°",
    },
    noise: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.08,
    },
    innerGlow: {
        type: ControlType.Number,
        title: "Inner Glow",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.65,
    },
    outerGlow: {
        type: ControlType.Number,
        title: "Outer Glow",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.35,
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.5,
        max: 2,
        step: 0.05,
        defaultValue: 1,
    },
    colorBack: {
        type: ControlType.Color,
        title: "Base Color",
        defaultValue: "#00000000",
    },
    colors: {
        type: ControlType.Array,
        title: "Palette",
        maxCount: MAX_COLORS,
        defaultValue: defaultPalette,
        control: { type: ControlType.Color },
    },
    image: {
        type: ControlType.Image,
        title: "Image",
    },
    pointerIntensity: {
        type: ControlType.Number,
        title: "Pointer Power",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.75,
    },
    pointerSize: {
        type: ControlType.Number,
        title: "Pointer Size",
        min: 0.05,
        max: 0.45,
        step: 0.01,
        defaultValue: 0.2,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

InteractiveThermalEffect.displayName = "Interactive Thermal Effect"

export default InteractiveThermalEffect

