import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
// Single Three.js bundle so EffectComposer/bloom works (no "multiple instances" in Framer).
// Host dist/bundle.js on GitHub and replace with your raw URL if needed.
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    Points,
    Mesh,
    SphereGeometry,
    ShaderMaterial,
    DoubleSide,
    MeshStandardMaterial,
    BufferGeometry,
    Float32BufferAttribute,
    ACESFilmicToneMapping,
    SRGBColorSpace,
    Vector2,
    Vector3,
    AmbientLight,
    DirectionalLight,
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/depth-bundle.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const MAX_LOG_LINES = 40

interface DepthGlobeProps {
    preview: boolean
    dataUrl: string
    showLogs: boolean
    autoRotate: boolean
    autoRotateSpeed: number
    landColor: string
    waterColor: string
    blendFactor: number
    scaleFactor: number
    waterOpacity: number
    backgroundColor: string
    bloomRadius: number
    bloomStrength: number
    bloomThreshold: number
    lightColor: string
    lightIntensity: number
    toneMappingExposure: number
    animate: boolean
    style?: React.CSSProperties
}

// ---------------------------------------------------------------------------
// Color parsing (Framer tokens + hex/rgba)
// ---------------------------------------------------------------------------

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

function parseColorToRgb(input: string | undefined): { r: number; g: number; b: number } {
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

// ---------------------------------------------------------------------------
// Globe geometry (from source/globe-bundle)
// ---------------------------------------------------------------------------

const MAX_ELEVATION = 6000

function coordinatesToUnitDirection(lat: number, lon: number): [number, number, number] {
    const phi = ((90 - lat) * Math.PI) / 180
    const theta = ((90 - lon) * Math.PI) / 180
    return [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
    ]
}

function scaleElevation(elevation: number, scalingFactor: number, gamma: number): number {
    const t = Math.max(0, Math.min(1, elevation / MAX_ELEVATION))
    return Math.pow(t, gamma) * scalingFactor
}

type Point = [number, number, number, number] // [lat, lon, elevation, land]

function pointGeometry(samples: Point[]): InstanceType<typeof BufferGeometry> {
    const directions: number[] = []
    const elevations: number[] = []
    const landMask: number[] = []
    for (const [lat, lon, elevation, land] of samples) {
        const [dx, dy, dz] = coordinatesToUnitDirection(lat, lon)
        directions.push(dx, dy, dz)
        elevations.push(land ? scaleElevation(elevation, 1.0, 1) : 0)
        landMask.push(land)
    }
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

// ---------------------------------------------------------------------------
// Shaders (from globe-bundle)
// ---------------------------------------------------------------------------

const pointVertexShader = `
  attribute vec3 direction;
  attribute float elevation;
  attribute float land;
  uniform float uRadius;
  uniform float uScale;
  uniform float uTime;
  uniform float uAnimate;
  uniform float uPixelRatio;
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
    vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = max(0.65 * uPixelRatio, 1.2 * uPixelRatio * (4.0 / -mvPosition.z));
  }
`

const pointFragmentShader = `
  uniform vec3 uLandColor;
  uniform vec3 uWaterColor;
  uniform float uBlendFactor;
  uniform float uTime;
  uniform float uAnimate;
  varying float vElevation;
  varying float vLand;
  varying float vPhase;
  varying vec3 vNormal;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    if (length(center) > 0.5) discard;
    float fadeThreshold = 0.69;
    float rawFade = clamp((vPhase - fadeThreshold) / (1.0 - fadeThreshold), 0.0, 1.0);
    float smoothFade = rawFade * rawFade * (3.0 - rawFade * 2.0);
    float fadeMask = vElevation >= fadeThreshold ? 1.0 : 0.0;
    float fade = 1.0 - smoothFade * fadeMask * uAnimate;
    vec3 landLow = uLandColor * (1.0 - uBlendFactor) + uWaterColor * uBlendFactor;
    vec3 landElevated = landLow + (uLandColor - landLow) * vElevation;
    vec3 color = (vLand > 0.5 ? landElevated : uWaterColor) * fade;
    gl_FragColor = vec4(color, 1.0);
  }
`

const RADIUS = 1

// Minimal orbit controller (no Three.js examples/jsm dependency that requires "Controls" from "three")
function createOrbitController(
    camera: InstanceType<typeof PerspectiveCamera>,
    domElement: HTMLElement,
    options: { autoRotate: boolean; autoRotateSpeed: number; zoomSpeed: number }
) {
    const target = new Vector3(0, 0, 0)
    let theta = 0.35
    let phi = 1.2
    let radius = 5.1
    const minRadius = 2
    const maxRadius = 12
    let autoRotate = options.autoRotate
    let autoRotateSpeed = options.autoRotateSpeed
    const zoomSpeed = options.zoomSpeed
    let isDown = false
    let prevX = 0
    let prevY = 0

    function setPosition() {
        const x = radius * Math.sin(phi) * Math.cos(theta)
        const y = radius * Math.cos(phi)
        const z = radius * Math.sin(phi) * Math.sin(theta)
        camera.position.set(x, y, z)
        camera.lookAt(target)
    }

    function onPointerDown(e: PointerEvent) {
        isDown = true
        prevX = e.clientX
        prevY = e.clientY
    }

    function onPointerMove(e: PointerEvent) {
        if (!isDown) return
        theta += (e.clientX - prevX) * 0.005
        phi -= (e.clientY - prevY) * 0.005
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi))
        prevX = e.clientX
        prevY = e.clientY
        setPosition()
    }

    function onPointerUp() {
        isDown = false
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault()
        const scale = e.deltaY > 0 ? 1 + zoomSpeed * 0.01 : 1 - zoomSpeed * 0.01
        radius = Math.max(minRadius, Math.min(maxRadius, radius * scale))
        setPosition()
    }

    domElement.addEventListener("pointerdown", onPointerDown)
    domElement.addEventListener("pointermove", onPointerMove)
    domElement.addEventListener("pointerup", onPointerUp)
    domElement.addEventListener("pointerleave", onPointerUp)
    domElement.addEventListener("wheel", onWheel, { passive: false })

    setPosition()

    return {
        update(getProps: () => { autoRotate: boolean; autoRotateSpeed: number }) {
            const p = getProps()
            autoRotate = p.autoRotate
            autoRotateSpeed = p.autoRotateSpeed
            if (autoRotate) {
                theta -= (autoRotateSpeed * Math.PI) / 180 / 60
                setPosition()
            }
        },
        dispose() {
            domElement.removeEventListener("pointerdown", onPointerDown)
            domElement.removeEventListener("pointermove", onPointerMove)
            domElement.removeEventListener("pointerup", onPointerUp)
            domElement.removeEventListener("pointerleave", onPointerUp)
            domElement.removeEventListener("wheel", onWheel)
        },
    }
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function DepthGlobe({
    preview = false,
    dataUrl = "",
    showLogs = false,
    autoRotate = true,
    autoRotateSpeed = 0.3,
    landColor = "#fff0d1",
    waterColor = "#0d111a",
    blendFactor = 0.96,
    scaleFactor = 0.09,
    waterOpacity = 0.81,
    backgroundColor = "#0d0d0d",
    bloomRadius = 0.48,
    bloomStrength = 0.6,
    bloomThreshold = 0,
    lightColor = "#ffd0b8",
    lightIntensity = 0.9,
    toneMappingExposure = 1,
    animate = true,
    style,
}: DepthGlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const globeDataRef = useRef<{ points: Point[] } | null>(null)

    // Cache isCanvas ONCE at mount - RenderTarget doesn't change during component lifetime
    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current

    // Refs for preview and animation control (canvas mode)
    const previewRef = useRef(preview)
    const animationFrameRef = useRef<number | null>(null)
    const startAnimationRef = useRef<(() => void) | null>(null)

    // Update previewRef ONLY when in canvas mode
    const previewForRefUpdate = isCanvas ? preview : false
    useEffect(() => {
        if (isCanvas) {
            previewRef.current = preview
        }
    }, [previewForRefUpdate, isCanvas])

    // Logging (use ref for showLogs to avoid adding to effect dependencies)
    const showLogsRef = useRef(showLogs)
    showLogsRef.current = showLogs
    const logLinesRef = useRef<string[]>([])
    const [, setLogTick] = useState(0)
    const addLog = (msg: string) => {
        if (!showLogsRef.current) return
        const line = `[${new Date().toISOString().slice(11, 23)}] ${msg}`
        logLinesRef.current = [...logLinesRef.current.slice(-(MAX_LOG_LINES - 1)), line]
        setLogTick((n) => n + 1)
    }

    const propsRef = useRef({
        landColor,
        waterColor,
        blendFactor,
        scaleFactor,
        waterOpacity,
        backgroundColor,
        bloomRadius,
        bloomStrength,
        bloomThreshold,
        lightColor,
        lightIntensity,
        toneMappingExposure,
        autoRotate,
        autoRotateSpeed,
        animate,
    })
    propsRef.current = {
        landColor,
        waterColor,
        blendFactor,
        scaleFactor,
        waterOpacity,
        backgroundColor,
        bloomRadius,
        bloomStrength,
        bloomThreshold,
        lightColor,
        lightIntensity,
        toneMappingExposure,
        autoRotate,
        autoRotateSpeed,
        animate,
    }
    const [loading, setLoading] = useState(!!dataUrl)
    const [error, setError] = useState<string | null>(null)
    const [ready, setReady] = useState(false)

    // Data loading effect - depends only on dataUrl
    useEffect(() => {
        addLog(`renderTarget=${isCanvas ? "canvas" : "preview"}`)
        if (!dataUrl) {
            addLog("dataUrl empty, skipping load")
            setLoading(false)
            setReady(false)
            globeDataRef.current = null
            return
        }
        addLog(`dataUrl set (${dataUrl.slice(0, 50)}…)`)
        setLoading(true)
        setError(null)
        let cancelled = false
        addLog("fetch start")
        fetch(dataUrl)
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)
                return res.json()
            })
            .then((data: { points?: Point[] }) => {
                if (cancelled) {
                    addLog("fetch ok but effect already cancelled")
                    return
                }
                if (!data.points || !Array.isArray(data.points)) {
                    addLog("invalid data: no points array")
                    setError("Invalid data: expected { points: [...] }")
                    setLoading(false)
                    return
                }
                globeDataRef.current = { points: data.points }
                addLog(`fetch ok, points=${data.points.length}`)
                setError(null)
                setReady(true)
                setLoading(false)
            })
            .catch((err) => {
                addLog(`fetch error: ${err?.message ?? err}`)
                if (!cancelled) {
                    setError(err?.message ?? "Failed to load globe data")
                    setLoading(false)
                }
            })
        return () => {
            cancelled = true
            addLog("data effect cleanup")
        }
    }, [dataUrl, isCanvas])

    // Scene initialization effect - depends on dataUrl and ready, NOT on showLogs or preview
    useEffect(() => {
        if (!containerRef.current || !dataUrl || !ready) {
            addLog(`scene skip: container=${!!containerRef.current} dataUrl=${!!dataUrl} ready=${ready}`)
            return
        }

        const container = containerRef.current
        const w = Math.max(2, container.clientWidth || container.offsetWidth || 1)
        const h = Math.max(2, container.clientHeight || container.offsetHeight || 1)
        const globeData = globeDataRef.current
        const pointCount = globeData?.points?.length ?? 0
        addLog(`scene init size=${w}x${h} points=${pointCount}`)

        const scene = new Scene()
        const camera = new PerspectiveCamera(30, w / h, 0.1, 1000)
        camera.position.set(0, 1, 5.1)

        const renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.toneMapping = ACESFilmicToneMapping
        renderer.toneMappingExposure = toneMappingExposure
        renderer.outputColorSpace = SRGBColorSpace
        renderer.setClearColor(new Color(backgroundColor))
        container.appendChild(renderer.domElement)

        const orbit = createOrbitController(camera, renderer.domElement, {
            autoRotate,
            autoRotateSpeed,
            zoomSpeed: 0.3,
        })

        let pointsMesh: InstanceType<typeof Points> | null = null
        let waterMesh: InstanceType<typeof Mesh> | null = null
        let composer: InstanceType<typeof EffectComposer> | null = null

        const landRgb = parseColorToRgb(landColor)
        const waterRgb = parseColorToRgb(waterColor)

        const dpr = renderer.getPixelRatio()
        const pointsMaterial = new ShaderMaterial({
            transparent: true,
            vertexShader: pointVertexShader,
            fragmentShader: pointFragmentShader,
            uniforms: {
                uRadius: { value: RADIUS },
                uScale: { value: scaleFactor },
                uTime: { value: 0 },
                uAnimate: { value: 1 },
                uPixelRatio: { value: dpr },
                uLandColor: { value: [landRgb.r, landRgb.g, landRgb.b] },
                uWaterColor: { value: [waterRgb.r, waterRgb.g, waterRgb.b] },
                uBlendFactor: { value: blendFactor },
            },
        })

        const waterGeometry = new SphereGeometry(RADIUS * 0.999, 96, 96)
        const waterMaterial = new MeshStandardMaterial({
            color: new Color(waterColor),
            opacity: waterOpacity,
            transparent: true,
            side: DoubleSide,
        })

        const data = globeDataRef.current
        if (data?.points?.length) {
            const geometry = pointGeometry(data.points)
            const points = new Points(geometry, pointsMaterial)
            points.rotation.set(0, 3.45, 0)
            scene.add(points)
            pointsMesh = points
        }
        const water = new Mesh(waterGeometry, waterMaterial)
        scene.add(water)
        waterMesh = water

        scene.background = new Color(backgroundColor)
        const ambientLight = new AmbientLight(lightColor, lightIntensity / 2)
        scene.add(ambientLight)
        const dirLight = new DirectionalLight(lightColor, lightIntensity)
        dirLight.position.set(1.2, 0, 0.66)
        scene.add(dirLight)

        // Always create EffectComposer for bloom; if it fails (e.g. multiple Three.js
        // instances in Framer), we catch once and fall back to direct render permanently.
        composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        composer.addPass(
            new UnrealBloomPass(new Vector2(w, h), bloomStrength, bloomRadius, bloomThreshold)
        )
        composer.setSize(w, h)
        composer.setPixelRatio(renderer.getPixelRatio())

        let raf: number | null = null
        let composerFailed = false

        function tick(time: number) {
            // CANVAS MODE: Check preview prop to pause animation when preview is off
            if (isCanvas && !previewRef.current) {
                raf = null
                animationFrameRef.current = null
                return
            }

            raf = requestAnimationFrame(tick)
            animationFrameRef.current = raf

            const p = propsRef.current
            if (pointsMaterial && pointsMaterial.uniforms.uTime) {
                pointsMaterial.uniforms.uTime.value = time * 0.001
                pointsMaterial.uniforms.uScale.value = p.scaleFactor
                pointsMaterial.uniforms.uAnimate.value = p.animate ? 1 : 0
                const l = parseColorToRgb(p.landColor)
                const wc = parseColorToRgb(p.waterColor)
                pointsMaterial.uniforms.uLandColor.value = [l.r, l.g, l.b]
                pointsMaterial.uniforms.uWaterColor.value = [wc.r, wc.g, wc.b]
                pointsMaterial.uniforms.uBlendFactor.value = p.blendFactor
            }
            if (waterMaterial) {
                waterMaterial.color.set(p.waterColor)
                waterMaterial.opacity = p.waterOpacity
            }
            renderer.setClearColor(new Color(p.backgroundColor))
            scene.background = new Color(p.backgroundColor)
            renderer.toneMappingExposure = p.toneMappingExposure
            ambientLight.color.set(p.lightColor)
            ambientLight.intensity = p.lightIntensity / 2
            dirLight.color.set(p.lightColor)
            dirLight.intensity = p.lightIntensity
            orbit.update(() => ({
                autoRotate: p.autoRotate,
                autoRotateSpeed: p.autoRotateSpeed,
            }))

            // Update bloom params if composer is available and hasn't failed
            if (!composerFailed && composer && composer.passes[1]) {
                const bloom = composer.passes[1] as InstanceType<typeof UnrealBloomPass>
                bloom.strength = p.bloomStrength
                bloom.radius = p.bloomRadius
                bloom.threshold = p.bloomThreshold
            }

            // Render: try composer first; on failure, fall back permanently
            if (!composerFailed && composer) {
                try {
                    composer.render()
                } catch (err) {
                    composerFailed = true
                    addLog(`composer error: ${err instanceof Error ? err.message : String(err)}, fallback to direct render (permanent)`)
                    renderer.render(scene, camera)
                }
            } else {
                renderer.render(scene, camera)
            }
        }

        // Start animation function - store in ref for preview restart effect
        const startAnimation = () => {
            if (raf === null) {
                raf = requestAnimationFrame(tick)
                animationFrameRef.current = raf
            }
        }
        startAnimationRef.current = startAnimation

        // Initial start
        startAnimation()

        const onResize = () => {
            const c = containerRef.current
            if (!c) return
            const ww = c.clientWidth || c.offsetWidth || 1
            const hh = c.clientHeight || c.offsetHeight || 1
            camera.aspect = ww / hh
            camera.updateProjectionMatrix()
            renderer.setSize(ww, hh)
            if (!composerFailed && composer) {
                try {
                    composer.setSize(ww, hh)
                    if (composer.passes[1]) {
                        ;(composer.passes[1] as InstanceType<typeof UnrealBloomPass>).resolution.set(
                            ww,
                            hh
                        )
                    }
                } catch {
                    composerFailed = true
                }
            }
        }
        const ro = new ResizeObserver(onResize)
        ro.observe(container)

        return () => {
            addLog("scene cleanup (unmount)")
            if (raf !== null) cancelAnimationFrame(raf)
            animationFrameRef.current = null
            startAnimationRef.current = null
            ro.disconnect()
            orbit.dispose()
            pointsMesh?.geometry?.dispose()
            pointsMaterial.dispose()
            waterGeometry.dispose()
            waterMaterial.dispose()
            if (composer) {
                try {
                    composer.dispose()
                } catch (_) {
                    // Ignore dispose errors (e.g. multiple Three.js instances in Framer)
                }
                composer = null
            }
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement)
            }
        }
    }, [dataUrl, ready, isCanvas])

    // Handle preview changes - restart animation loop when preview toggles (CANVAS MODE ONLY)
    const previewForAnimation = isCanvas ? preview : false
    useEffect(() => {
        if (!isCanvas) return
        // If preview turned ON and animation is stopped, restart it
        if (preview && startAnimationRef.current && animationFrameRef.current === null) {
            startAnimationRef.current()
        }
    }, [previewForAnimation, isCanvas])

    const hasContent = !!dataUrl

    const logsPanel = showLogs && (
        <div
            style={{
                position: "fixed",
                left: 8,
                bottom: 8,
                zIndex: 99999,
                maxWidth: "min(420px, calc(100vw - 24px))",
                maxHeight: 220,
                overflow: "auto",
                background: "rgba(0,0,0,0.88)",
                color: "#c0c0c0",
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                padding: 8,
                borderRadius: 6,
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
            }}
        >
            <div style={{ marginBottom: 4, color: "#888" }}>Depth Globe logs</div>
            {(logLinesRef.current || []).map((line, i) => (
                <div key={i}>{line}</div>
            ))}
        </div>
    )

    if (!hasContent) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Depth Globe"
                    subtitle="Add a globe data URL (JSON with points array) to see the globe."
                />
                {logsPanel}
            </div>
        )
    }

    if (error) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                }}
            >
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Failed to load globe"
                    subtitle={error}
                />
                {logsPanel}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 200,
                overflow: "hidden",
            }}
        >
            {loading && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#0d0d0d",
                        color: "#fff",
                        fontSize: 14,
                    }}
                >
                    Loading globe…
                </div>
            )}
            {logsPanel}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Property controls
// ---------------------------------------------------------------------------

addPropertyControls(DepthGlobe, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    dataUrl: {
        type: ControlType.String,
        title: "Globe data URL",
        defaultValue: "",
        placeholder: "https://…/globe_samples.json",
    },
    showLogs: {
        type: ControlType.Boolean,
        title: "Show logs",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    scaleFactor: {
        type: ControlType.Number,
        title: "Topography",
        min: 0.01,
        max: 0.3,
        step: 0.01,
        defaultValue: 0.09,
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
        hidden: (props: DepthGlobeProps) => !props.autoRotate,
    },
    animate: {
        type: ControlType.Boolean,
        title: "Pixels",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#0d0d0d",
    },
    landColor: {
        type: ControlType.Color,
        title: "Land",
        defaultValue: "#ffffff",
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
        defaultValue: 0.93,
    },
    waterOpacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.90,
    },
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
        defaultValue: 0.60,
    },
    bloomThreshold: {
        type: ControlType.Number,
        title: "Threshold",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0,
    },
    lightColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
    },
    lightIntensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0.6,
    },
    toneMappingExposure: {
        type: ControlType.Number,
        title: "Exposure",
        min: 0.1,
        max: 2,
        step: 0.05,
        defaultValue: 1.0,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

DepthGlobe.displayName = "Depth Globe"
