/**
 * Depth Globe – self-contained single file.
 * Sections below are inlined from: DepthGlobeSceneContext, depthGlobeShared,
 * GlobeWebGL, PostProcessingWebGL, SceneWebGL.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { Canvas } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import {
    useFrame,
    useThree,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import {
    ACESFilmicToneMapping,
    BufferGeometry,
    Color,
    DirectionalLight,
    DoubleSide,
    Float32BufferAttribute,
    Mesh,
    MeshStandardMaterial,
    Points,
    ShaderMaterial,
    SphereGeometry,
    SRGBColorSpace,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import { EffectComposer } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import { RenderPass } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"
import type { OrbitControls as OrbitControlsType } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-globe-final.js"

// =============================================================================
// SECTION: Scene context (from DepthGlobeSceneContext.tsx)
// =============================================================================

// Binary format: ~4x smaller, no JSON.parse. Served from Cloudflare Pages.
const GLOBE_DATA_BASE = "https://depth-globe-data.pages.dev"

const BINARY_URLS: Record<string, string> = {
    low: `${GLOBE_DATA_BASE}/globe_low.bin`,
    medium: `${GLOBE_DATA_BASE}/globe_medium.bin`,
    high: `${GLOBE_DATA_BASE}/globe_high.bin`,
}

// JSON fallback (GitHub raw) – slower parse, larger transfer
const JSON_FALLBACK_URLS: Record<string, string> = {
    low: "https://raw.githubusercontent.com/EmanueleCodes/framer-code-components/main/next-dev/app/3D-depth-globe/source/src/data/globe_samples_10m_0.1.json",
    medium: "https://raw.githubusercontent.com/EmanueleCodes/framer-code-components/main/next-dev/app/3D-depth-globe/source/src/data/globe_samples_10m_0.1.json",
    high: "https://raw.githubusercontent.com/EmanueleCodes/framer-code-components/main/next-dev/app/3D-depth-globe/source/src/data/globe_samples_10m_0.1.json",
}

export type GlobePoint = [number, number, number, number] // [lat, lon, elevation, land]

export type GeometryArrays = {
    directions: Float32Array
    elevations: Float32Array
    landMask: Float32Array
}

export interface DepthGlobeSceneState {
    animate: boolean
    autoRotate: boolean
    backgroundColor: string
    landColor: string
    waterColor: string
    blendFactor: number
    scaleFactor: number
    opacity: number
    bloomRadius: number
    bloomStrength: number
    bloomThreshold: number
    lightColor: string
    lightIntensity: number
    toneMappingExposure: number
    particleSize: number
    edgeSoftness: number
    smoothing: number
    quality: number
    points: GlobePoint[] | null
    geometryData: GeometryArrays | null
}

const defaultSceneState: DepthGlobeSceneState = {
    animate: true,
    autoRotate: true,
    backgroundColor: "#0d0d0d",
    landColor: "#fff0d1",
    waterColor: "#0d111a",
    blendFactor: 0.96,
    scaleFactor: 0.3,
    opacity: 0.81,
    bloomRadius: 0.48,
    bloomStrength: 0.6,
    bloomThreshold: 0,
    lightColor: "#ffd0b8",
    lightIntensity: 0.9,
    toneMappingExposure: 1,
    particleSize: 1,
    edgeSoftness: 0.5,
    smoothing: 0.6,
    quality: 1,
    points: null,
    geometryData: null,
}

const DepthGlobeSceneContext =
    createContext<DepthGlobeSceneState>(defaultSceneState)

function DepthGlobeSceneProvider({
    value,
    children,
}: {
    value: DepthGlobeSceneState
    children: ReactNode
}) {
    return (
        <DepthGlobeSceneContext.Provider value={value}>
            {children}
        </DepthGlobeSceneContext.Provider>
    )
}

function useDepthGlobeScene(): DepthGlobeSceneState {
    return useContext(DepthGlobeSceneContext)
}

// =============================================================================
// SECTION: Shared globe logic (from depthGlobeShared.ts)
// =============================================================================

const MAX_ELEVATION = 6000
const GLOBE_RADIUS = 1

function coordinatesToUnitDirection(
    lat: number,
    lon: number
): [number, number, number] {
    const phi = ((90 - lat) * Math.PI) / 180
    const theta = ((90 - lon) * Math.PI) / 180
    return [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
    ]
}

function scaleElevation(
    elevation: number,
    scalingFactor: number,
    gamma: number
): number {
    const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION))
    return Math.pow(t, gamma) * scalingFactor
}

function pointGeometryShared(samples: GlobePoint[]): BufferGeometry {
    const directions: number[] = []
    const elevations: number[] = []
    const landMask: number[] = []
    for (const [lat, lon, elevation, land] of samples) {
        const [dx, dy, dz] = coordinatesToUnitDirection(lat, lon)
        directions.push(dx, dy, dz)
        elevations.push(land ? scaleElevation(elevation, 1.0, 1) : 0)
        landMask.push(land)
    }
    return pointGeometryFromArrays({
        directions: new Float32Array(directions),
        elevations: new Float32Array(elevations),
        landMask: new Float32Array(landMask),
    })
}

function pointGeometryFromArrays(data: {
    directions: Float32Array
    elevations: Float32Array
    landMask: Float32Array
}): BufferGeometry {
    const { directions, elevations, landMask } = data
    const geometry = new BufferGeometry()
    geometry.setAttribute("direction", new Float32BufferAttribute(directions, 3))
    geometry.setAttribute("elevation", new Float32BufferAttribute(elevations, 1))
    geometry.setAttribute("land", new Float32BufferAttribute(landMask, 1))
    geometry.setAttribute(
        "position",
        new Float32BufferAttribute(new Float32Array(directions.length), 3)
    )
    return geometry
}

const pointVertexShader = `
  attribute vec3 direction;
  attribute float elevation;
  attribute float land;
  uniform float uRadius;
  uniform float uScale;
  uniform float uTime;
  uniform float uAnimate;
  uniform float uPixelRatio;
  uniform float uParticleSize;
  uniform vec3 uCameraDelta;
  varying float vElevation;
  varying float vLand;
  varying float vPhase;
  varying vec3 vNormal;
  void main() {
    vElevation = elevation;
    vLand = land;
    vNormal = normalize(direction);
    float baseRadius = uRadius + elevation * uScale * 0.84;
    float targetRadius = uRadius + elevation * uScale;
    float distance = targetRadius - baseRadius;
    float hash = fract(sin(dot(direction, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float offset = fract(hash + elevation * 0.36);
    float phase = fract(uTime / 3.6 + offset);
    vPhase = phase;
    float easedT = phase * phase * (3.0 - phase * 2.1);
    float wobbleAmount = 0.006;
    float elevationWobbleScale = 1.0 + elevation * 3.0;
    vec3 wobbleAxis = normalize(
      cross(direction, vec3(0.3, 1.0, 0.3)) +
      cross(direction, vec3(1.0, 0.3, 0.3))
    );
    float wobbleSignal = sin(uTime * 3.0 + hash * 6.0);
    float wobbleEnvelope = easedT * (1.0 - easedT);
    vec3 wobble = wobbleAxis * wobbleSignal * wobbleEnvelope * wobbleAmount * elevationWobbleScale * land;
    float wobbledRadius = baseRadius + distance * easedT;
    vec3 wobbledPosition = vec3(wobbledRadius) + wobble;
    vec3 targetRadiusVec = vec3(targetRadius);
    vec3 animatedPosition = targetRadiusVec + (wobbledPosition - targetRadiusVec) * uAnimate;
    vec3 worldPosition = animatedPosition * direction;
    vec3 cameraMotion = -uCameraDelta;
    vec3 viewDir = normalize(worldPosition) + wobble * 150.0;
    vec3 lateralMotion = cameraMotion - viewDir * dot(cameraMotion, viewDir);
    float blurElevation = 0.03;
    float blurFade = 0.3;
    float elevationMask = smoothstep(blurElevation, blurElevation + blurFade, elevation);
    float blurFactor = (elevation * uScale * 9.0 + length(wobble) * uScale) * elevationMask * uAnimate;
    worldPosition += lateralMotion * blurFactor;
    vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float baseSize = max(0.65 * uPixelRatio, 1.2 * uPixelRatio * (4.0 / -mvPosition.z));
    gl_PointSize = baseSize * uParticleSize;
  }
`

const pointFragmentShader = `
  uniform vec3 uLandColor;
  uniform vec3 uWaterColor;
  uniform float uBlendFactor;
  uniform float uTime;
  uniform float uAnimate;
  uniform float uEdgeSoftness;
  varying float vElevation;
  varying float vLand;
  varying float vPhase;
  varying vec3 vNormal;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float fadeThreshold = 0.69;
    float rawFade = clamp((vPhase - fadeThreshold) / (1.0 - fadeThreshold), 0.0, 1.0);
    float smoothFade = rawFade * rawFade * (3.0 - rawFade * 2.0);
    float fadeMask = vElevation >= fadeThreshold ? 1.0 : 0.0;
    float fade = 1.0 - smoothFade * fadeMask * uAnimate;
    vec3 landLow = uLandColor * (1.0 - uBlendFactor) + uWaterColor * uBlendFactor;
    vec3 landElevated = landLow + (uLandColor - landLow) * vElevation;
    vec3 color = (vLand > 0.5 ? landElevated : uWaterColor) * fade;
    float softWidth = mix(0.02, 0.2 * uEdgeSoftness, vElevation);
    float alpha = 1.0 - smoothstep(0.5 - softWidth, 0.5, dist);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

function parseColorToRgbShared(input: string | undefined): {
    r: number
    g: number
    b: number
} {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0 }
    const str = input.trim()
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        return {
            r: Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255,
            g: Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255,
            b: Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255,
        }
    }
    const hex = str.replace(/^#/, "")
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
        }
    }
    return { r: 0, g: 0, b: 0 }
}

// Source passes hex to Color and uses in shader as-is (sRGB); we match that so colors aren’t darker.
function createPointsMaterial(
    state: {
        landColor: string
        waterColor: string
        blendFactor: number
        scaleFactor: number
        particleSize: number
        edgeSoftness: number
        animate: boolean
    },
    pixelRatio: number
): ShaderMaterial {
    const landRgb = parseColorToRgbShared(state.landColor)
    const waterRgb = parseColorToRgbShared(state.waterColor)
    const landArr: [number, number, number] = [landRgb.r, landRgb.g, landRgb.b]
    const waterArr: [number, number, number] = [
        waterRgb.r,
        waterRgb.g,
        waterRgb.b,
    ]
    return new ShaderMaterial({
        transparent: true,
        depthWrite: true,
        vertexShader: pointVertexShader,
        fragmentShader: pointFragmentShader,
        uniforms: {
            uRadius: { value: GLOBE_RADIUS },
            uScale: { value: state.scaleFactor },
            uTime: { value: 0 },
            uAnimate: { value: state.animate ? 1 : 0 },
            uPixelRatio: { value: pixelRatio },
            uParticleSize: { value: state.particleSize },
            uEdgeSoftness: { value: state.edgeSoftness },
            uCameraDelta: { value: new Vector3(0, 0, 0) },
            uLandColor: { value: landArr },
            uWaterColor: { value: waterArr },
            uBlendFactor: { value: state.blendFactor },
        },
    })
}

function createWaterMaterial(state: {
    waterColor: string
    opacity: number
}): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color: new Color(state.waterColor),
        opacity: state.opacity,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
    })
}

function createWaterGeometry(): BufferGeometry {
    return new SphereGeometry(GLOBE_RADIUS * 0.999, 96, 96)
}

// =============================================================================
// SECTION: GlobeWebGL component (from GlobeWebGL.tsx)
// =============================================================================

const maximumDelta = 0.24
const smoothResponse = 6.0

function GlobeWebGL() {
    const state = useDepthGlobeScene()
    const { camera, gl } = useThree()
    const pointsRef = useRef<Points>(null)
    const waterRef = useRef<Mesh>(null)
    const pointsMaterialRef = useRef<ReturnType<
        typeof createPointsMaterial
    > | null>(null)
    const waterMaterialRef = useRef<ReturnType<
        typeof createWaterMaterial
    > | null>(null)
    const previousCameraPosition = useRef(new Vector3())
    const smoothedCameraDelta = useRef(new Vector3())
    const cameraDelta = useRef(new Vector3())

    const points = state.points
    const geometryData = state.geometryData
    const hasData = geometryData || (points && points.length > 0)

    const geometry = useMemo(() => {
        if (geometryData) return pointGeometryFromArrays(geometryData)
        if (points && points.length > 0) return pointGeometryShared(points)
        return null
    }, [geometryData, points])

    const dpr = gl.getPixelRatio()
    const pointsMaterial = useMemo(() => {
        const mat = createPointsMaterial(
            {
                landColor: state.landColor,
                waterColor: state.waterColor,
                blendFactor: state.blendFactor,
                scaleFactor: state.scaleFactor,
                particleSize: state.particleSize,
                edgeSoftness: state.edgeSoftness,
                animate: state.animate,
            },
            dpr
        )
        pointsMaterialRef.current = mat
        return mat
    }, [])

    const waterMaterial = useMemo(() => {
        const mat = createWaterMaterial({
            waterColor: state.waterColor,
            opacity: state.opacity,
        })
        waterMaterialRef.current = mat
        return mat
    }, [])

    const waterGeometry = useMemo(() => createWaterGeometry(), [])

    useEffect(() => {
        pointsMaterialRef.current = pointsMaterial
        waterMaterialRef.current = waterMaterial
    }, [pointsMaterial, waterMaterial])

    useFrame((_, delta) => {
        const pm = pointsMaterialRef.current
        const wm = waterMaterialRef.current
        if (!pm || !wm) return

        const time = performance.now() * 0.001
        pm.uniforms.uTime.value = time
        pm.uniforms.uScale.value = state.scaleFactor
        pm.uniforms.uAnimate.value = state.animate ? 1 : 0
        pm.uniforms.uBlendFactor.value = state.blendFactor
        pm.uniforms.uParticleSize.value = state.particleSize
        pm.uniforms.uEdgeSoftness.value = state.edgeSoftness
        const landRgb = parseColorToRgbShared(state.landColor)
        const waterRgb = parseColorToRgbShared(state.waterColor)
        pm.uniforms.uLandColor.value = [landRgb.r, landRgb.g, landRgb.b] as [
            number,
            number,
            number,
        ]
        pm.uniforms.uWaterColor.value = [
            waterRgb.r,
            waterRgb.g,
            waterRgb.b,
        ] as [number, number, number]

        if (!state.animate) {
            smoothedCameraDelta.current.set(0, 0, 0)
        } else if (previousCameraPosition.current.lengthSq() > 0) {
            cameraDelta.current.subVectors(
                camera.position,
                previousCameraPosition.current
            )
            const clampedDelta = Math.min(delta, maximumDelta)
            const alpha = 1 - Math.exp(-smoothResponse * clampedDelta)
            smoothedCameraDelta.current.lerp(cameraDelta.current, alpha)
            smoothedCameraDelta.current.clampLength(0, maximumDelta)
        }
        pm.uniforms.uCameraDelta.value.copy(smoothedCameraDelta.current)
        previousCameraPosition.current.copy(camera.position)

        wm.color.set(state.waterColor)
        wm.opacity = state.opacity
    })

    if (!geometry || !hasData) {
        return (
            <mesh geometry={waterGeometry} ref={waterRef}>
                <primitive object={waterMaterial} attach="material" />
            </mesh>
        )
    }

    return (
        <>
            <points ref={pointsRef} rotation={[0, 3.45, 0]} renderOrder={0}>
                <primitive object={geometry} attach="geometry" />
                <primitive object={pointsMaterial} attach="material" />
            </points>
            <mesh geometry={waterGeometry} ref={waterRef} renderOrder={1}>
                <primitive object={waterMaterial} attach="material" />
            </mesh>
        </>
    )
}

// =============================================================================
// SECTION: PostProcessingWebGL component (from PostProcessingWebGL.tsx)
// =============================================================================

function PostProcessingWebGL({ children }: { children: ReactNode }) {
    const { camera, gl, scene, size } = useThree()
    const state = useDepthGlobeScene()
    const composerRef = useRef<EffectComposer | null>(null)
    const bloomPassRef = useRef<UnrealBloomPass | null>(null)

    useEffect(() => {
        const composer = new EffectComposer(gl)
        const renderPass = new RenderPass(scene, camera)
        composer.addPass(renderPass)
        const bloom = new UnrealBloomPass(
            new Vector2(size.width, size.height),
            state.bloomStrength,
            state.bloomRadius,
            state.bloomThreshold
        )
        composer.addPass(bloom)
        composer.setSize(size.width, size.height)
        composer.setPixelRatio(gl.getPixelRatio())
        composerRef.current = composer
        bloomPassRef.current = bloom
        return () => {
            composer.dispose()
            composerRef.current = null
            bloomPassRef.current = null
        }
    }, [gl, scene, camera])

    useEffect(() => {
        const composer = composerRef.current
        const bloom = bloomPassRef.current
        if (!composer || !bloom) return
        composer.setSize(size.width, size.height)
        composer.setPixelRatio(gl.getPixelRatio())
        bloom.resolution.set(size.width, size.height)
    }, [gl, size.width, size.height])

    useFrame(() => {
        const composer = composerRef.current
        const bloom = bloomPassRef.current
        if (!composer || !bloom) return
        const dpr = Math.min(window.devicePixelRatio * state.quality, 8)
        gl.setPixelRatio(dpr)
        composer.setSize(size.width, size.height)
        composer.setPixelRatio(dpr)
        bloom.resolution.set(size.width, size.height)
        bloom.strength = state.bloomStrength
        bloom.radius = state.bloomRadius
        bloom.threshold = state.bloomThreshold
        composer.render()
    }, 1)

    return <>{children}</>
}

// =============================================================================
// SECTION: SceneWebGL component (from SceneWebGL.tsx)
// =============================================================================

function SceneWebGL() {
    const state = useDepthGlobeScene()
    const { camera, gl, invalidate, scene } = useThree()
    const controlsRef = useRef<OrbitControlsType>(null)
    const colorRef = useRef(new Color(state.backgroundColor))
    const lightRef = useRef<DirectionalLight | null>(null)

    if (!lightRef.current) {
        const light = new DirectionalLight("#ffffff", 0.6)
        light.position.set(0, -6, -3)
        lightRef.current = light
    }

    useEffect(() => {
        const light = lightRef.current!
        camera.add(light)
        scene.add(camera)
        return () => {
            camera.remove(light)
            scene.remove(camera)
        }
    }, [camera, scene])

    useEffect(() => {
        colorRef.current.set(state.backgroundColor)
        scene.background = colorRef.current
    }, [state.backgroundColor, scene])

    useEffect(() => {
        gl.toneMappingExposure = state.toneMappingExposure
    }, [state.toneMappingExposure, gl])

    useEffect(() => {
        invalidate()
    }, [
        state.animate,
        state.autoRotate,
        state.backgroundColor,
        state.landColor,
        state.waterColor,
        state.blendFactor,
        state.scaleFactor,
        state.opacity,
        state.bloomRadius,
        state.bloomStrength,
        state.bloomThreshold,
        state.lightColor,
        state.lightIntensity,
        state.toneMappingExposure,
        invalidate,
    ])

    useFrame(() => {
        if (state.autoRotate && controlsRef.current) {
            controlsRef.current.update()
            invalidate()
        } else if (state.animate) {
            invalidate()
        }
    })

    return (
        <>
            <ambientLight intensity={state.lightIntensity / 2} />
            <directionalLight
                position={[1.2, 0, 0.66]}
                color={state.lightColor}
                intensity={state.lightIntensity}
            />
            <GlobeWebGL />
            <OrbitControls
                autoRotate={state.autoRotate}
                autoRotateSpeed={0.3}
                dampingFactor={0.03}
                enablePan={false}
                enableZoom={false}
                ref={controlsRef}
            />
        </>
    )
}

// =============================================================================
// SECTION: Main DepthGlobe component – types, Framer props, data loading, Canvas
// =============================================================================

const INTRINSIC_WIDTH = 600
const INTRINSIC_HEIGHT = 400

interface GlobeGroup {
    scaleFactor?: number
    animate?: boolean
    autoRotate?: boolean
    autoRotateSpeed?: number
    particleSize?: number
    edgeSoftness?: number
    smoothing?: number
    quality?: number
}
interface ColorsGroup {
    backgroundColor?: string
    landColor?: string
    waterColor?: string
    blendFactor?: number
    waterOpacity?: number
}
interface GlowGroup {
    bloomRadius?: number
    bloomStrength?: number
    bloomThreshold?: number
}
interface LightGroup {
    lightColor?: string
    lightIntensity?: number
    toneMappingExposure?: number
}

interface DepthGlobeProps {
    pointsCount: "low" | "medium" | "high"
    preview: boolean
    globe?: GlobeGroup
    colors?: ColorsGroup
    glow?: GlowGroup
    light?: LightGroup
    style?: React.CSSProperties
}

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

function resolveTokenColor(input: string | undefined): string {
    if (typeof input !== "string") return input ?? "#000"
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgb(input: string | undefined): {
    r: number
    g: number
    b: number
} {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0 }
    const str = resolveTokenColor(input).trim()
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        return {
            r: Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255,
            g: Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255,
            b: Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255,
        }
    }
    const hex = str.replace(/^#/, "")
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
        }
    }
    return { r: 0, g: 0, b: 0 }
}

type Point = GlobePoint

const defaultGlobe: GlobeGroup = {
    scaleFactor: 0.3,
    animate: true,
    autoRotate: true,
    autoRotateSpeed: 0.3,
    particleSize: 1,
    edgeSoftness: 0.5,
    smoothing: 0.6,
    quality: 1,
}
const defaultColors: ColorsGroup = {
    backgroundColor: "#0d0d0d",
    landColor: "#fff0d1",
    waterColor: "#0d111a",
    blendFactor: 0.96,
    waterOpacity: 0.81,
}
const defaultGlow: GlowGroup = {
    bloomRadius: 0.48,
    bloomStrength: 0.6,
    bloomThreshold: 0,
}
const defaultLight: LightGroup = {
    lightColor: "#ffd0b8",
    lightIntensity: 0.9,
    toneMappingExposure: 1,
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function DepthGlobe({
    pointsCount,
    preview = false,
    globe: globeProp,
    colors: colorsProp,
    glow: glowProp,
    light: lightProp,
    style,
}: DepthGlobeProps) {
    const globe = { ...defaultGlobe, ...globeProp }
    const colors = { ...defaultColors, ...colorsProp }
    const glow = { ...defaultGlow, ...glowProp }
    const light = { ...defaultLight, ...lightProp }
    const scaleFactor = globe.scaleFactor ?? defaultGlobe.scaleFactor!
    const animate = globe.animate ?? defaultGlobe.animate!
    const autoRotate = globe.autoRotate ?? defaultGlobe.autoRotate!
    const autoRotateSpeed =
        globe.autoRotateSpeed ?? defaultGlobe.autoRotateSpeed!
    const particleSize = globe.particleSize ?? defaultGlobe.particleSize!
    const edgeSoftness = globe.edgeSoftness ?? defaultGlobe.edgeSoftness!
    const smoothing = globe.smoothing ?? defaultGlobe.smoothing!
    const quality = globe.quality ?? defaultGlobe.quality ?? 1
    const backgroundColor =
        colors.backgroundColor ?? defaultColors.backgroundColor!
    const landColor = colors.landColor ?? defaultColors.landColor!
    const waterColor = colors.waterColor ?? defaultColors.waterColor!
    const blendFactor = colors.blendFactor ?? defaultColors.blendFactor!
    const waterOpacity = colors.waterOpacity ?? defaultColors.waterOpacity!
    const bloomRadius = glow.bloomRadius ?? defaultGlow.bloomRadius!
    const bloomStrength = glow.bloomStrength ?? defaultGlow.bloomStrength!
    const bloomThreshold = glow.bloomThreshold ?? defaultGlow.bloomThreshold!
    const lightColor = light.lightColor ?? defaultLight.lightColor!
    const lightIntensity = light.lightIntensity ?? defaultLight.lightIntensity!
    const toneMappingExposure =
        light.toneMappingExposure ?? defaultLight.toneMappingExposure!
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const globeDataRef = useRef<
        | { points: Point[] }
        | { geometryData: GeometryArrays }
        | null
    >(null)

    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ready, setReady] = useState(false)
    // In canvas mode, delay Canvas mount so layout has time to settle (reverse-fish-eye pattern)
    const [canvasLayoutReady, setCanvasLayoutReady] = useState(!isCanvas)
    // Explicit pixel size for Canvas wrapper so R3F gets layout size (clientWidth/clientHeight), not scaled rect
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        setLoading(true)
        setError(null)
        globeDataRef.current = null
        let cancelled = false

        const binaryUrl = BINARY_URLS[pointsCount]
        const jsonUrl = JSON_FALLBACK_URLS[pointsCount]

        const workerCode = `
const MAX_ELEVATION = 6000;
function coordinatesToUnitDirection(lat, lon) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lon) * Math.PI) / 180;
  return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}
function scaleElevation(elevation, scalingFactor, gamma) {
  const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION));
  return Math.pow(t, gamma) * scalingFactor;
}
self.onmessage = (e) => {
  const view = new Float32Array(e.data);
  const n = view.length / 4;
  const directions = new Float32Array(n * 3);
  const elevations = new Float32Array(n);
  const landMask = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [dx, dy, dz] = coordinatesToUnitDirection(view[i*4], view[i*4+1]);
    directions[i*3]=dx; directions[i*3+1]=dy; directions[i*3+2]=dz;
    elevations[i] = view[i*4+3] ? scaleElevation(view[i*4+2], 1, 1) : 0;
    landMask[i] = view[i*4+3];
  }
  self.postMessage({ directions, elevations, landMask, count: n }, [directions.buffer, elevations.buffer, landMask.buffer]);
};
`

        const runBinary = (buffer: ArrayBuffer) => {
            if (cancelled) return
            const blob = new Blob([workerCode], { type: "application/javascript" })
            const worker = new Worker(URL.createObjectURL(blob))
            worker.onmessage = (e: MessageEvent<{ directions: Float32Array; elevations: Float32Array; landMask: Float32Array }>) => {
                if (cancelled) return
                const { directions, elevations, landMask } = e.data
                globeDataRef.current = { geometryData: { directions, elevations, landMask } }
                setError(null)
                setReady(true)
                setLoading(false)
            }
            worker.onerror = () => {
                if (!cancelled) {
                    setError("Worker failed")
                    setLoading(false)
                }
            }
            worker.postMessage(buffer, [buffer])
        }

        const runJsonFallback = () => {
            fetch(jsonUrl)
                .then((res) => {
                    if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)
                    return res.json()
                })
                .then((data: { points?: Point[] }) => {
                    if (cancelled) return
                    if (!data.points || !Array.isArray(data.points)) {
                        setError("Invalid data: expected { points: [...] }")
                        setLoading(false)
                        return
                    }
                    globeDataRef.current = { points: data.points }
                    setError(null)
                    setReady(true)
                    setLoading(false)
                })
                .catch((err) => {
                    if (!cancelled) {
                        setError(err?.message ?? "Failed to load globe data")
                        setLoading(false)
                    }
                })
        }

        fetch(binaryUrl)
            .then((res) => {
                if (cancelled) return
                if (res.ok) return res.arrayBuffer()
                return null
            })
            .then((buffer) => {
                if (cancelled) return
                if (buffer) runBinary(buffer)
                else runJsonFallback()
            })
            .catch(() => runJsonFallback())

        return () => {
            cancelled = true
        }
    }, [pointsCount, isCanvas])

    // Measure container; in canvas mode compensate for editor zoom via zoom probe (interactive-wave, electric-border pattern)
    const updateCanvasSize = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        const cw = el.clientWidth || el.offsetWidth || 0
        const ch = el.clientHeight || el.offsetHeight || 0
        if (cw <= 0 || ch <= 0) return
        let width: number
        let height: number
        if (isCanvas && zoomProbeRef.current) {
            const zoom = zoomProbeRef.current.getBoundingClientRect().width / 20
            const safeZoom = Math.max(zoom, 0.0001)
            width = cw / safeZoom
            height = ch / safeZoom
        } else {
            width = cw
            height = ch
        }
        setCanvasSize((prev) =>
            prev.width === width && prev.height === height
                ? prev
                : { width, height }
        )
    }, [isCanvas])

    // Canvas mode: zoom-probe RAF loop to size Canvas wrapper so R3F (getBoundingClientRect) sees correct visual size.
    // When we first get valid dimensions, set canvasLayoutReady so Canvas mounts immediately (no extra 50/150ms delay).
    useEffect(() => {
        const container = containerRef.current
        if (!container || !isCanvas) return

        const runOnce = () => {
            if (zoomProbeRef.current) updateCanvasSize()
        }
        const id = requestAnimationFrame(runOnce)

        let rafId = 0
        const TICK_MS = 150
        const last = { ts: 0, zoom: 0, w: 0, h: 0 }

        const tick = (now?: number) => {
            const probe = zoomProbeRef.current
            if (!container || !probe) {
                rafId = requestAnimationFrame(tick)
                return
            }
            const cw = container.clientWidth || container.offsetWidth || 0
            const ch = container.clientHeight || container.offsetHeight || 0
            const zoom = probe.getBoundingClientRect().width / 20
            const timeOk =
                !last.ts || (now ?? performance.now()) - last.ts >= TICK_MS
            const zoomChanged = Math.abs(zoom - last.zoom) > 0.001
            const sizeChanged =
                Math.abs(cw - last.w) > 2 || Math.abs(ch - last.h) > 2

            if (timeOk && (zoomChanged || sizeChanged) && cw >= 1 && ch >= 1) {
                last.ts = now ?? performance.now()
                last.zoom = zoom
                last.w = cw
                last.h = ch
                const safeZoom = Math.max(zoom, 0.0001)
                setCanvasSize({ width: cw / safeZoom, height: ch / safeZoom })
                setCanvasLayoutReady(true)
            }
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(id)
            cancelAnimationFrame(rafId)
        }
    }, [isCanvas, updateCanvasSize])

    // ResizeObserver: keep canvas size in sync when not in canvas mode (preview/production)
    useEffect(() => {
        if (isCanvas) return
        const el = containerRef.current
        if (!el) return
        updateCanvasSize()
        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(updateCanvasSize)
                : null
        if (ro) ro.observe(el)
        return () => ro?.disconnect()
    }, [isCanvas, updateCanvasSize])

    // In Framer canvas, layout may not be ready on first paint. Set canvasLayoutReady when we have valid size.
    // Use rAF so we mount Canvas on the next frame after ready (no 50/150ms delay); RAF loop above also sets canvasLayoutReady when size is set.
    useEffect(() => {
        if (!isCanvas) {
            setCanvasLayoutReady(true)
            return
        }
        if (!ready) return
        const rafId = requestAnimationFrame(() => {
            updateCanvasSize()
            setCanvasLayoutReady(true)
        })
        return () => cancelAnimationFrame(rafId)
    }, [isCanvas, ready, updateCanvasSize])

    if (error) {
        return (
            <div
                style={{
                    ...style,
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    margin: 0,
                    background: "#0d0d0d",
                    color: "#888",
                    fontSize: 14,
                }}
            >
                {error}
            </div>
        )
    }

    const data = globeDataRef.current
    const sceneState: DepthGlobeSceneState = {
        animate,
        autoRotate,
        backgroundColor: resolveTokenColor(backgroundColor),
        landColor: resolveTokenColor(landColor),
        waterColor: resolveTokenColor(waterColor),
        blendFactor,
        scaleFactor,
        opacity: waterOpacity,
        bloomRadius,
        bloomStrength,
        bloomThreshold,
        lightColor: resolveTokenColor(lightColor),
        lightIntensity,
        toneMappingExposure,
        particleSize,
        edgeSoftness,
        smoothing,
        quality,
        points: data && "points" in data ? data.points : null,
        geometryData: data && "geometryData" in data ? data.geometryData : null,
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 0,
                minWidth: 0,
                overflow: "hidden",
                boxSizing: "border-box",
                display: "block",
                margin: 0,
                padding: 0,
                background: resolveTokenColor(backgroundColor),
            }}
        >
            {/* Intrinsic sizing for Fit layouts (3D-scan, ASCII-background pattern) */}
            <div
                style={{
                    width: `${INTRINSIC_WIDTH}px`,
                    height: `${INTRINSIC_HEIGHT}px`,
                    minWidth: `${INTRINSIC_WIDTH}px`,
                    minHeight: `${INTRINSIC_HEIGHT}px`,
                    visibility: "hidden",
                    position: "absolute",
                    inset: 0,
                    zIndex: -1,
                    pointerEvents: "none",
                }}
                aria-hidden="true"
            />
            {/* Zoom probe for canvas: 20px logical size so zoom = getBoundingClientRect().width / 20 (StickerDrag, interactive-wave pattern) */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    top: 0,
                    left: 0,
                    opacity: 0,
                    pointerEvents: "none",
                }}
                aria-hidden="true"
            />
            {ready && canvasLayoutReady && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width:
                            canvasSize.width > 0
                                ? canvasSize.width
                                : INTRINSIC_WIDTH,
                        height:
                            canvasSize.height > 0
                                ? canvasSize.height
                                : INTRINSIC_HEIGHT,
                        display: "block",
                        minHeight: 0,
                        minWidth: 0,
                    }}
                >
                    <Canvas
                        camera={{ position: [0, 1, 5.1], fov: 30 }}
                        frameloop="always"
                        flat
                        gl={(canvas) => {
                            const renderer = new WebGLRenderer({
                                canvas,
                                antialias: true,
                                alpha: false,
                                powerPreference: "high-performance",
                            })
                            renderer.toneMapping = ACESFilmicToneMapping
                            renderer.toneMappingExposure = 1
                            renderer.outputColorSpace = SRGBColorSpace
                            const dpr = Math.min(
                                window.devicePixelRatio * quality,
                                8
                            )
                            renderer.setPixelRatio(dpr)
                            return renderer
                        }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            display: "block",
                        }}
                    >
                        <DepthGlobeSceneProvider value={sceneState}>
                            <PostProcessingWebGL>
                                <SceneWebGL />
                            </PostProcessingWebGL>
                        </DepthGlobeSceneProvider>
                    </Canvas>
                </div>
            )}
        </div>
    )
}

// =============================================================================
// SECTION: Property controls
// =============================================================================

addPropertyControls(DepthGlobe, {
    pointsCount: {
        type: ControlType.Enum,
        title: "Detail",
        options: ["low", "medium", "high"],
        optionTitles: ["Low (~300k)", "Medium (~600k)", "High (~1.2M)"],
        defaultValue: "medium",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
        description: "Lower = faster load, less detail.",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    globe: {
        type: ControlType.Object,
        title: "Globe",
        controls: {
            scaleFactor: {
                type: ControlType.Number,
                title: "Topography",
                min: 0.01,
                max: 0.5,
                step: 0.01,
                defaultValue: 0.3,
            },
            animate: {
                type: ControlType.Boolean,
                title: "Pixels",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            autoRotate: {
                type: ControlType.Boolean,
                title: "Spin",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            autoRotateSpeed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 2,
                step: 0.1,
                defaultValue: 0.3,
                hidden: (props: DepthGlobeProps) => !props.globe?.autoRotate,
            },
            particleSize: {
                type: ControlType.Number,
                title: "Particle size",
                min: 0.3,
                max: 2.5,
                step: 0.05,
                defaultValue: 1,
            },
            edgeSoftness: {
                type: ControlType.Number,
                title: "Edge softness",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.5,
            },
            smoothing: {
                type: ControlType.Number,
                title: "Smoothing",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.6,
            },
            quality: {
                type: ControlType.Number,
                title: "Quality",
                min: 0.5,
                max: 3,
                step: 0.25,
                defaultValue: 1,
                description:
                    "Render resolution multiplier (2 = sharper, heavier).",
            },
        },
    },
    colors: {
        type: ControlType.Object,
        title: "Colors",
        controls: {
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#0d0d0d",
            },
            landColor: {
                type: ControlType.Color,
                title: "Land",
                defaultValue: "#fff0d1",
            },
            waterColor: {
                type: ControlType.Color,
                title: "Water",
                defaultValue: "#0d111a",
            },
            blendFactor: {
                type: ControlType.Number,
                title: "Blend",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0.96,
            },
            waterOpacity: {
                type: ControlType.Number,
                title: "Opacity",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0.81,
            },
        },
    },
    glow: {
        type: ControlType.Object,
        title: "Glow",
        controls: {
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0.48,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Strength",
                min: 0,
                max: 2,
                step: 0.01,
                defaultValue: 0.6,
            },
            bloomThreshold: {
                type: ControlType.Number,
                title: "Threshold",
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0,
            },
        },
    },
    light: {
        type: ControlType.Object,
        title: "Light",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            lightColor: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#ffd0b8",
            },
            lightIntensity: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0,
                max: 2,
                step: 0.1,
                defaultValue: 0.9,
            },
            toneMappingExposure: {
                type: ControlType.Number,
                title: "Exposure",
                min: 0.1,
                max: 2,
                step: 0.05,
                defaultValue: 1.0,
            },
        },
    },
})

DepthGlobe.displayName = "Depth Globe"
