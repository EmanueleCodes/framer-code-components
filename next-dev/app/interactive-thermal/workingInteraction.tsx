import React, { useEffect, useMemo, useRef } from "react"
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
    Scene,
    ShaderMaterial,
    Texture,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/interactive-thermal.js"
import { RenderTarget, addPropertyControls, ControlType } from "framer"
import type {
    DataTexture as ThreeDataTexture,
    Mesh as ThreeMesh,
    OrthographicCamera as ThreeOrthographicCamera,
    PlaneGeometry as ThreePlaneGeometry,
    Scene as ThreeScene,
    ShaderMaterial as ThreeShaderMaterial,
    Texture as ThreeTexture,
    WebGLRenderer as ThreeWebGLRenderer,
} from "three"

type HeatmapUniforms = {
    u_image: { value: ThreeTexture | null }
    u_heatmap: { value: ThreeDataTexture | null }
    u_resolution: { value: Vector2 }
    u_time: { value: number }
    u_speed: { value: number }
    u_contour: { value: number }
    u_angle: { value: number }
    u_noise: { value: number }
    u_innerGlow: { value: number }
    u_outerGlow: { value: number }
    u_scale: { value: number }
    u_colorBack: { value: Vector3 }
    u_colors: { value: Vector3[] }
    u_colorsCount: { value: number }
}

type HeatmapProps = {
    colors?: string[]
    colorBack?: string
    speed?: number
    contour?: number
    angle?: number
    noise?: number
    glowIn?: number
    glowOut?: number
    scale?: number
    image?: string
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

uniform sampler2D u_image;
uniform sampler2D u_heatmap;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_contour;
uniform float u_angle;
uniform float u_noise;
uniform float u_innerGlow;
uniform float u_outerGlow;
uniform float u_scale;
uniform vec3 u_colorBack;
uniform int u_colorsCount;
uniform vec3 u_colors[MAX_COLORS];

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
    if (u_colorsCount <= 0) return vec3(1.0);
    float clampedT = clamp(t, 0.0, 1.0);
    float scaled = clampedT * float(u_colorsCount - 1);
    int baseIndex = int(floor(scaled + 0.0001));
    int nextIndex = min(baseIndex + 1, u_colorsCount - 1);
    float f = fract(scaled);

    vec3 c0 = u_colors[0];
    vec3 c1 = u_colors[0];

    for (int i = 0; i < MAX_COLORS; i++) {
        if (i == baseIndex) {
            c0 = u_colors[i];
        }
        if (i == nextIndex) {
            c1 = u_colors[i];
        }
    }

    return mix(c0, c1, f);
}

void main() {
    vec2 centered = vUv - 0.5;
    centered *= u_scale;
    centered = rotate(centered, u_angle);
    vec2 uv = centered + 0.5;

    vec4 mask = texture2D(u_image, clamp(uv, 0.0, 1.0));
    float maskValue = 1.0 - max(max(mask.r, mask.g), mask.b);

    float baseFlowA = 0.5 + 0.5 * sin(u_time * u_speed + uv.y * 8.0);
    float baseFlowB = 0.5 + 0.5 * sin(u_time * u_speed * 0.6 + uv.x * 10.0);
    float baseFlow = mix(baseFlowA, baseFlowB, 0.35);

    float baseEnergy = pow(maskValue, mix(0.55, 1.45, clamp(u_contour, 0.0, 1.0)));
    baseEnergy *= clamp(u_innerGlow * baseFlow + 0.25, 0.0, 1.0);

    vec2 texel = vec2(1.0 / u_resolution.x, 1.0 / u_resolution.y);
    float ring =
        texture2D(u_image, clamp(uv + vec2(texel.x, 0.0), 0.0, 1.0)).a +
        texture2D(u_image, clamp(uv - vec2(texel.x, 0.0), 0.0, 1.0)).a +
        texture2D(u_image, clamp(uv + vec2(0.0, texel.y), 0.0, 1.0)).a +
        texture2D(u_image, clamp(uv - vec2(0.0, texel.y), 0.0, 1.0)).a;
    ring *= 0.25;
    float rim = clamp(maskValue - (1.0 - ring), 0.0, 1.0);
    baseEnergy += rim * u_outerGlow;

    float heatValue = texture2D(u_heatmap, vUv).r;
    float heatEnergy =
        pow(heatValue, mix(0.7, 1.6, clamp(u_contour, 0.0, 1.0))) * maskValue;

    float energy = clamp(baseEnergy + heatEnergy, 0.0, 1.0);
    float grain = (random(uv * 40.0 + u_time * 0.25) - 0.5) * u_noise;
    energy = clamp(energy + grain, 0.0, 1.0);

    vec3 paletteColor = samplePalette(energy);
    vec3 finalColor = mix(u_colorBack, paletteColor, energy);

    gl_FragColor = vec4(finalColor, energy);
}
`

function parsePalette(colors?: string[]): { values: Vector3[]; count: number } {
    const palette = (Array.isArray(colors) && colors.length > 0 ? colors : defaultPalette).slice(0, MAX_COLORS)
    const vectorColors = palette.map((hex) => {
        const normalized = new Color(hex || "#000000")
        return new Vector3(normalized.r, normalized.g, normalized.b)
    })
    while (vectorColors.length < MAX_COLORS) {
        vectorColors.push(vectorColors[vectorColors.length - 1])
    }
    return { values: vectorColors, count: palette.length }
}

function parseColor(color: string | undefined, fallback: string): Vector3 {
    const parsed = new Color((color || fallback || "#000000").trim())
    return new Vector3(parsed.r, parsed.g, parsed.b)
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

type InternalHeatmapProps = HeatmapProps & {
    canvasRef: React.RefObject<HTMLCanvasElement>
    heatmapTexture: Texture | null
}

const HeatmapCanvas: React.FC<InternalHeatmapProps> = ({
    colors,
    colorBack = "#00000000",
    speed = 1,
    contour = 0.5,
    angle = 0,
    noise = 0.05,
    glowIn = 0.5,
    glowOut = 0.5,
    scale = 0.75,
    image,
    canvasRef,
    heatmapTexture,
}) => {
    const uniformsRef = useRef<HeatmapUniforms | null>(null)
    const rendererRef = useRef<ThreeWebGLRenderer | null>(null)
    const sceneRef = useRef<ThreeScene | null>(null)
    const cameraRef = useRef<ThreeOrthographicCamera | null>(null)
    const meshRef = useRef<ThreeMesh<ThreePlaneGeometry, ThreeShaderMaterial> | null>(null)
    const imageTextureRef = useRef<ThreeTexture | null>(null)
    const animationRef = useRef<number | null>(null)

    const paletteInfo = useMemo(() => parsePalette(colors), [colors])
    const backColor = useMemo(() => parseColor(colorBack, "#00000000"), [colorBack])
    const imageUrl = useMemo(
        () => (typeof image === "string" && image.trim().length > 0 ? image : defaultImage),
        [image]
    )

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

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

        const uniforms: HeatmapUniforms = {
            u_image: { value: null },
            u_heatmap: { value: heatmapTexture },
            u_resolution: { value: new Vector2(canvas.width, canvas.height) },
            u_time: { value: 0 },
            u_speed: { value: speed },
            u_contour: { value: contour },
            u_angle: { value: MathUtils.degToRad(angle) },
            u_noise: { value: noise },
            u_innerGlow: { value: glowIn },
            u_outerGlow: { value: glowOut },
            u_scale: { value: clamp(scale, 0.1, 3) },
            u_colorBack: { value: backColor },
            u_colors: { value: paletteInfo.values },
            u_colorsCount: { value: paletteInfo.count },
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
            const bounds = canvas.getBoundingClientRect()
            const width = Math.max(1, Math.floor(bounds.width))
            const height = Math.max(1, Math.floor(bounds.height))
            renderer.setSize(width, height, false)
            uniforms.u_resolution.value.set(width, height)
        }

        resize()
        window.addEventListener("resize", resize)

        const render = (timestamp: number) => {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const shouldAnimate = isCanvas ? RenderTarget.current() === RenderTarget.canvas : true

            uniforms.u_time.value = timestamp * 0.001

            renderer.render(scene, camera)

            animationRef.current = requestAnimationFrame(render)
            if (!shouldAnimate && animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
                animationRef.current = null
            }
        }

        animationRef.current = requestAnimationFrame(render)

        return () => {
            window.removeEventListener("resize", resize)
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
            }
            if (mesh) {
                scene.remove(mesh)
                mesh.geometry.dispose()
                mesh.material.dispose()
            }
            renderer.dispose()
            if (imageTextureRef.current) {
                imageTextureRef.current.dispose()
                imageTextureRef.current = null
            }
            rendererRef.current = null
            sceneRef.current = null
            cameraRef.current = null
            meshRef.current = null
            uniformsRef.current = null
        }
    }, [canvasRef, heatmapTexture, speed, contour, angle, noise, glowIn, glowOut, scale, paletteInfo, backColor])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        uniforms.u_speed.value = speed
        uniforms.u_contour.value = clamp(contour, 0, 1)
        uniforms.u_angle.value = MathUtils.degToRad(angle)
        uniforms.u_noise.value = clamp(noise, 0, 1)
        uniforms.u_innerGlow.value = clamp(glowIn, 0, 1)
        uniforms.u_outerGlow.value = clamp(glowOut, 0, 1)
        uniforms.u_scale.value = clamp(scale, 0.1, 3)
    }, [speed, contour, angle, noise, glowIn, glowOut, scale])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        uniforms.u_colorBack.value.copy(backColor)
    }, [backColor])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return
        const { values, count } = parsePalette(colors)
        for (let i = 0; i < MAX_COLORS; i++) {
            uniforms.u_colors.value[i].copy(values[i])
        }
        uniforms.u_colorsCount.value = count
    }, [colors])

    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        const loader = new TextureLoader()
        let cancelled = false

        const disposeTexture = () => {
            if (imageTextureRef.current) {
                imageTextureRef.current.dispose()
                imageTextureRef.current = null
            }
        }

        loader.load(
            imageUrl,
            (texture: ThreeTexture) => {
                if (cancelled) {
                    texture.dispose()
                    return
                }
                texture.wrapS = ClampToEdgeWrapping
                texture.wrapT = ClampToEdgeWrapping
                texture.needsUpdate = true

                disposeTexture()
                imageTextureRef.current = texture
                uniforms.u_image.value = texture
            },
            undefined,
            () => {
                if (cancelled) return
                disposeTexture()
                uniforms.u_image.value = null
            }
        )

        return () => {
            cancelled = true
        }
    }, [imageUrl])

    return null
}

const InteractiveHeatmap: ComponentType<HeatmapProps> = (props) => {
    const {
        colors,
        colorBack = "#00000000",
        speed = 1,
        contour = 0.5,
        angle = 0,
        noise = 0.05,
        glowIn = 0.5,
        glowOut = 0.5,
        scale = 0.75,
        image,
    } = props

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const heatmapTextureRef = useRef<Texture | null>(null)
    const heatmapDataRef = useRef<ThreeDataTexture | null>(null)
    const heatmapBufferRef = useRef<Uint8Array | null>(null)
    const rendererRef = useRef<ThreeWebGLRenderer | null>(null)
    const sceneRef = useRef<ThreeScene | null>(null)
    const cameraRef = useRef<ThreeOrthographicCamera | null>(null)
    const meshRef = useRef<ThreeMesh<ThreePlaneGeometry, ThreeShaderMaterial> | null>(null)
    const uniformsRef = useRef<{ u_heatmap: { value: DataTexture | null } } | null>(null)
    const animationRef = useRef<number | null>(null)
    const pointerSettingsRef = useRef({
        intensity: 0.75,
        radius: 0.2,
    })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

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

    const data = new Uint8Array(HEAT_RESOLUTION * HEAT_RESOLUTION * 4)
        heatmapBufferRef.current = data

        const dataTexture = new DataTexture(data, HEAT_RESOLUTION, HEAT_RESOLUTION, RGBAFormat)
        dataTexture.needsUpdate = true
        dataTexture.magFilter = LinearFilter
        dataTexture.minFilter = LinearFilter
        heatmapDataRef.current = dataTexture
        heatmapTextureRef.current = dataTexture

        const uniforms = {
            u_heatmap: { value: dataTexture },
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
            const bounds = canvas.getBoundingClientRect()
            renderer.setSize(Math.max(1, Math.floor(bounds.width)), Math.max(1, Math.floor(bounds.height)), false)
        }

        const stampHeat = (nx: number, ny: number) => {
            const buffer = heatmapBufferRef.current
            const texture = heatmapDataRef.current
            if (!buffer || !texture) return

            const size = HEAT_RESOLUTION
            const centerX = clamp(Math.round(nx * (size - 1)), 0, size - 1)
            const centerY = clamp(Math.round(ny * (size - 1)), 0, size - 1)
            const radius = clamp(pointerSettingsRef.current.radius, 0.02, 0.5) * size
            const radiusSq = radius * radius
            const intensity = pointerSettingsRef.current.intensity

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
                    const current = buffer[idx]
                    const next = Math.min(255, current + Math.round(boost * 255))
                    buffer[idx] = next
                    buffer[idx + 1] = next
                    buffer[idx + 2] = next
                    buffer[idx + 3] = 255
                }
            }

            texture.needsUpdate = true
        }

        const fadeHeat = () => {
            const buffer = heatmapBufferRef.current
            const texture = heatmapDataRef.current
            if (!buffer || !texture) return

            let changed = false
            for (let i = 0; i < buffer.length; i += 4) {
                const current = buffer[i]
                if (current <= 0) continue
                const cooled = current * 0.96 - 1
                const next = cooled <= 1 ? 0 : Math.min(255, Math.max(0, Math.floor(cooled)))
                if (next !== current) {
                    buffer[i] = next
                    buffer[i + 1] = next
                    buffer[i + 2] = next
                    changed = true
                }
            }
            if (changed) {
                texture.needsUpdate = true
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            const bounds = canvas.getBoundingClientRect()
            if (bounds.width === 0 || bounds.height === 0) return
            const nx = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
            const ny = clamp((event.clientY - bounds.top) / bounds.height, 0, 1)
            stampHeat(nx, 1 - ny)
        }

        const render = () => {
            fadeHeat()
            renderer.render(scene, camera)

            animationRef.current = requestAnimationFrame(render)
        }

        resize()
        window.addEventListener("resize", resize)
        window.addEventListener("pointermove", handlePointerMove, { passive: true })
        animationRef.current = requestAnimationFrame(render)

        return () => {
            window.removeEventListener("resize", resize)
            window.removeEventListener("pointermove", handlePointerMove)
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
            }
            if (mesh) {
                scene.remove(mesh)
                mesh.geometry.dispose()
                mesh.material.dispose()
            }
            renderer.dispose()
            if (heatmapDataRef.current) {
                heatmapDataRef.current.dispose()
                heatmapDataRef.current = null
            }
            rendererRef.current = null
            sceneRef.current = null
            cameraRef.current = null
            uniformsRef.current = null
        }
    }, [])

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: colorBack || "#000000",
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
            <HeatmapCanvas
                colors={colors}
                colorBack={colorBack}
                speed={speed}
                contour={contour}
                angle={angle}
                noise={noise}
                glowIn={glowIn}
                glowOut={glowOut}
                scale={scale}
                image={image}
                canvasRef={canvasRef}
                heatmapTexture={heatmapTextureRef.current}
            />
        </div>
    )
}

addPropertyControls(InteractiveHeatmap, {
    image: {
        type: ControlType.Image,
        title: "Image",
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
        defaultValue: 0.5,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        unit: "°",
        defaultValue: 0,
    },
    noise: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.05,
    },
    glowIn: {
        type: ControlType.Number,
        title: "Glow In",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
    glowOut: {
        type: ControlType.Number,
        title: "Glow Out",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.1,
        max: 2,
        step: 0.05,
        defaultValue: 0.75,
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
})

InteractiveHeatmap.displayName = "Interactive Thermal Heatmap"

export default InteractiveHeatmap

