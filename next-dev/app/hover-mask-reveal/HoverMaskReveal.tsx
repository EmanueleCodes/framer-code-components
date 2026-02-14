import React, { useRef, useEffect, useState, useCallback } from "react"
import { useMotionValue, useSpring, animate } from "framer-motion"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    LinearFilter,
    SRGBColorSpace,
    Clock,
    TextureLoader,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/liquid-mask.js"
import {
    WebGLRenderTarget,
    OrthographicCamera,
    HalfFloatType,
    RGBAFormat,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface ResponsiveImageValue {
    src: string
    srcSet?: string
    alt?: string
    positionX?: string
    positionY?: string
}

interface Props {
    imageBase?: ResponsiveImageValue
    imageHover?: ResponsiveImageValue
    borderRadius?: number
    radius?: number
    blur?: number
    circleBoost?: number
    texture?: number
    timeSpeed?: number
    splatRadius?: number
    velocityDissipation?: number
    shrinkTimeSeconds?: number
    curl?: number
    pressureIterations?: number
    hover?: {
        enabled?: boolean
        scale?: number
        transition?: any
    }
    preview?: boolean
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function LiquidMask(props: Props) {
    const {
        imageBase,
        imageHover,
        borderRadius = 10,
        radius = 100,
        blur = 0.5,
        circleBoost = 0.5,
        texture = 0.5,
        timeSpeed = 5,
        splatRadius = 0.08,
        velocityDissipation = 0.99,
        shrinkTimeSeconds = 2.3,
        curl = 30,
        pressureIterations = 25,
        hover,
        preview = false,
    } = props

    // Check if base image is missing
    const hasBaseImage = imageBase && imageBase.src

    // Show ComponentMessage if no base image is provided
    if (!hasBaseImage) {
        return (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    position: "relative",
                    borderRadius: borderRadius,
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: "100%",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
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
                        title="Liquid Mask Effect"
                        description="Add a base image to create stunning liquid mask effects with gooey animations"
                    />
                </div>
            </div>
        )
    }

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const uniformsRef = useRef<any>(null)

    // Detect mobile: disable effect and show base image only
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkMobile = () => {
            const coarse =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(pointer: coarse)").matches
                    : false
            const small =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(max-width: 768px)").matches
                    : false
            setIsMobile(coarse || small)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Motion/value state for hover scaling
    const scaleMV = useMotionValue(1)
    const [springOptions, setSpringOptions] = useState<any>(() => ({
        stiffness: 170,
        damping: 26,
        mass: 1,
    }))
    const springScaleMV = useSpring(1, springOptions)
    const tweenAnimRef = useRef<any>(null)
    const hoverScaleRef = useRef<number>(hover?.scale ?? 1.2)
    useEffect(() => {
        hoverScaleRef.current = Math.max(1, Math.min(3, hover?.scale ?? 1.2))
    }, [hover?.scale])

    useEffect(() => {
        const tr = hover?.transition || {}
        if (tr && tr.type === "spring") {
            if (
                typeof tr.stiffness === "number" ||
                typeof tr.damping === "number" ||
                typeof tr.mass === "number"
            ) {
                setSpringOptions({
                    stiffness:
                        typeof tr.stiffness === "number" ? tr.stiffness : 170,
                    damping: typeof tr.damping === "number" ? tr.damping : 26,
                    mass: typeof tr.mass === "number" ? tr.mass : 1,
                    restDelta:
                        typeof tr.restDelta === "number"
                            ? tr.restDelta
                            : undefined,
                    restSpeed:
                        typeof tr.restSpeed === "number"
                            ? tr.restSpeed
                            : undefined,
                })
            } else {
                const bounce = Math.max(0, Math.min(1, tr.bounce ?? 0))
                const duration = Math.max(0.05, tr.duration ?? 0.5)
                const mass = 1
                const dampingRatio = 1 - 0.85 * bounce
                const stiffness = Math.max(50, Math.min(700, 200 / duration))
                const damping = 2 * Math.sqrt(stiffness * mass) * dampingRatio
                setSpringOptions({ stiffness, damping, mass })
            }
        }
    }, [hover?.transition])

    // Apply base image and hover image scale whenever motion values change
    useEffect(() => {
        const applyScale = (v: number) => {
            const clamped = Math.max(1, Math.min(3, v))
            const img = imgRef.current
            if (img) {
                img.style.transform = `scale(${clamped})`
                img.style.transformOrigin = "50% 50%"
                img.style.willChange = "transform"
            }
            if (uniformsRef.current && uniformsRef.current.u_hoverScale) {
                uniformsRef.current.u_hoverScale.value = clamped
            }
        }
        const unsubA = scaleMV.on("change", applyScale)
        const unsubB = springScaleMV.on("change", applyScale)
        applyScale(1)
        return () => {
            unsubA?.()
            unsubB?.()
        }
    }, [scaleMV, springScaleMV])

    const animateToScale = useCallback(
        (target: number) => {
            const clamped = Math.max(1, Math.min(3, target))
            const tr: any = hover?.transition || {}
            if (
                tweenAnimRef.current &&
                typeof tweenAnimRef.current.stop === "function"
            ) {
                tweenAnimRef.current.stop()
                tweenAnimRef.current = null
            }
            if (tr && tr.type === "spring") {
                springScaleMV.set(clamped)
            } else if (tr && tr.type === "tween") {
                tweenAnimRef.current = animate(scaleMV, clamped, {
                    duration:
                        typeof tr.duration === "number" ? tr.duration : 0.5,
                    delay: typeof tr.delay === "number" ? tr.delay : 0,
                    ease: tr.ease,
                })
            } else {
                tweenAnimRef.current = animate(scaleMV, clamped, {
                    duration: 0.25,
                    ease: [0.44, 0, 0.56, 1],
                })
            }
        },
        [hover?.transition, scaleMV, springScaleMV]
    )

    // State for hover effect
    // (no local hover state needed; Motion values drive scale)

    // Debounced prop values to prevent excessive re-renders
    const [debouncedProps, setDebouncedProps] = useState({
        radius,
        blur,
        circleBoost,
        texture,
        timeSpeed,
        splatRadius,
        velocityDissipation,
        shrinkTimeSeconds,
        curl,
        pressureIterations,
        preview,
    })

    // Debounce prop changes to improve performance
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedProps({
                radius,
                blur,
                circleBoost,
                texture,
                timeSpeed,
                splatRadius,
                velocityDissipation,
                shrinkTimeSeconds,
                curl,
                pressureIterations,
                preview,
            })
        }, 100) // 100ms debounce

        return () => clearTimeout(timeoutId)
    }, [radius, blur, circleBoost, texture, timeSpeed, splatRadius, velocityDissipation, shrinkTimeSeconds, curl, pressureIterations, preview])

    // Value mapping functions to convert normalized property values to internal shader values
    const mapRadius = useCallback((normalizedRadius: number) => {
        // Map 10-1000px to 10-200px (current internal range)
        return 10 + (normalizedRadius - 10) * (190 / 990)
    }, [])

    const mapBlur = useCallback((normalizedBlur: number) => {
        // Map 0-1 to 0.2-3.0 (current internal range)
        return 0.2 + normalizedBlur * 2.8
    }, [])

    const mapCircleBoost = useCallback((normalizedCircleBoost: number) => {
        // Map 0-1 to 0.5-4.0 (current internal range)
        return 0.5 + normalizedCircleBoost * 3.5
    }, [])

    const mapTimeSpeed = useCallback((normalizedTimeSpeed: number) => {
        // Map 0-10 to 0.0-1.0 for true linear mapping from static to fast
        return normalizedTimeSpeed * 0.1
    }, [])

    // Single texture mapping that controls the overall graininess/texture of the effect
    const mapTexture = useCallback((normalizedTexture: number) => {
        // Map 0-1 texture control to appropriate noise parameters
        // 0 = smooth/minimal texture, 1 = very textured/grainy

        const freq = 2.0 + normalizedTexture * 12.0 // frequency range 2-14 (more dramatic)
        const strength = normalizedTexture * 3.0 // strength range 0-3 (stronger effect)
        const size = 1.0 - normalizedTexture * 0.7 // size range 1.0-0.3 (smaller = finer grain at high texture)

        return { freq, strength, size }
    }, [])

    useEffect(() => {
        if (isMobile) return
        const canvas = canvasRef.current
        const imgEl = imgRef.current
        const container = containerRef.current
        if (!canvas || !imgEl || !container) return

        // Animation state variable
        let isAnimating = false

        // Scene setup
        const scene = new Scene()
        const perspective = 800
        const renderer = new WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Use clientWidth/clientHeight for more reliable initial sizing
        const initialWidth = Math.max(container.clientWidth, 300) // Fallback minimum
        const initialHeight = Math.max(container.clientHeight, 200) // Fallback minimum
        renderer.setSize(initialWidth, initialHeight)

        const computeFov = () => {
            // Use clientHeight for consistent field of view calculation
            return (
                (180 *
                    (2 * Math.atan(container.clientHeight / 2 / perspective))) /
                Math.PI
            )
        }

        const camera = new PerspectiveCamera(
            computeFov(),
            initialWidth / initialHeight,
            1,
            5000
        )
        camera.position.set(0, 0, perspective)

        // Load hover image texture for direct rendering
        const loader = new TextureLoader()
        const hoverSrc =
            imageHover?.src || "/random-assets/blue-profile-image.png"
        const hoverTexture = loader.load(hoverSrc, () => {
            // Update aspect ratio when texture loads
            if (hoverTexture.image) {
                const imageAspect =
                    hoverTexture.image.width / hoverTexture.image.height
                uniforms.u_hoverImageAspect.value = imageAspect

                // Force a re-render to update the effect with new aspect ratio
                if (isAnimating) {
                    renderer.render(scene, camera)
                }
            }
        })
        // Color space for modern three versions
        // @ts-ignore - guard older versions
        if (SRGBColorSpace) {
            // @ts-ignore
            hoverTexture.colorSpace = SRGBColorSpace
        }
        hoverTexture.minFilter = LinearFilter

        const textureParams = mapTexture(debouncedProps.texture)

        // --- Fluid simulation: half-resolution for performance ---
        const simScale = 0.5
        let simWidth = Math.max(1, Math.floor(initialWidth * simScale))
        let simHeight = Math.max(1, Math.floor(initialHeight * simScale))

        const fboOptions = {
            type: HalfFloatType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat,
            generateMipmaps: false,
            depthBuffer: false,
            stencilBuffer: false,
        }

        const createFluidFBO = (w: number, h: number) =>
            new WebGLRenderTarget(w, h, fboOptions)

        let velFBO0 = createFluidFBO(simWidth, simHeight)
        let velFBO1 = createFluidFBO(simWidth, simHeight)
        let divFBO = createFluidFBO(simWidth, simHeight)
        let pressureFBO0 = createFluidFBO(simWidth, simHeight)
        let pressureFBO1 = createFluidFBO(simWidth, simHeight)
        let densityFBO0 = createFluidFBO(simWidth, simHeight)
        let densityFBO1 = createFluidFBO(simWidth, simHeight)

        const disposeFluidFBOs = () => {
            velFBO0.dispose()
            velFBO1.dispose()
            divFBO.dispose()
            pressureFBO0.dispose()
            pressureFBO1.dispose()
            densityFBO0.dispose()
            densityFBO1.dispose()
        }

        const resizeFluidFBOs = (w: number, h: number) => {
            const newSimW = Math.max(1, Math.floor(w * simScale))
            const newSimH = Math.max(1, Math.floor(h * simScale))
            if (newSimW === simWidth && newSimH === simHeight) return
            simWidth = newSimW
            simHeight = newSimH
            disposeFluidFBOs()
            velFBO0 = createFluidFBO(simWidth, simHeight)
            velFBO1 = createFluidFBO(simWidth, simHeight)
            divFBO = createFluidFBO(simWidth, simHeight)
            pressureFBO0 = createFluidFBO(simWidth, simHeight)
            pressureFBO1 = createFluidFBO(simWidth, simHeight)
            densityFBO0 = createFluidFBO(simWidth, simHeight)
            densityFBO1 = createFluidFBO(simWidth, simHeight)
        }

        // Orthographic camera for full-screen quad passes (-1 to 1 NDC)
        const orthoCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const quadGeometry = new PlaneGeometry(2, 2, 1, 1)

        // Mouse velocity for splat (UV per frame)
        let lastMouseUV = { x: 0.5, y: 0.5 }
        const mouseVelocity = { x: 0, y: 0 }

        const uniforms: { [key: string]: any } = {
            u_time: { value: 0 },
            u_mouse: { value: new Vector2(0.5, 0.5) },
            u_progress: { value: 0 },
            u_planeRes: { value: new Vector2(1, 1) },
            u_radius: { value: mapRadius(debouncedProps.radius) },
            u_blur: { value: mapBlur(debouncedProps.blur) },
            u_circleBoost: {
                value: mapCircleBoost(debouncedProps.circleBoost),
            },
            u_noiseFreq: { value: textureParams.freq },
            u_noiseStrength: { value: textureParams.strength },
            u_noiseSize: { value: textureParams.size },
            u_timeSpeed: { value: mapTimeSpeed(debouncedProps.timeSpeed) },
            u_hoverScale: { value: 1.0 },
            u_hoverImage: { value: hoverTexture },
            u_hoverImageAspect: { value: 1.0 },
            u_containerAspect: { value: 1.0 },
            u_windowSize: {
                value: new Vector2(window.innerWidth, window.innerHeight),
            },
            u_containerOffset: { value: new Vector2(0, 0) },
            u_simResolution: { value: new Vector2(simWidth, simHeight) },
            u_densityTex: { value: densityFBO0.texture },
        }
        uniformsRef.current = uniforms

        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `
        const vertexShaderQuad = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `

        // --- Fluid pass: Splat (add velocity and density at cursor)
        const splatFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 u_point;
      uniform vec2 u_splatColor;
      uniform float u_radius;
      uniform sampler2D u_target;
      void main() {
        vec2 p = vUv - u_point;
        float splat = exp(-dot(p, p) / (u_radius * u_radius));
        vec4 base = texture2D(u_target, vUv);
        base.xy += splat * u_splatColor;
        gl_FragColor = base;
      }
    `
        const splatDensityFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 u_point;
      uniform float u_radius;
      uniform float u_densityAmount;
      uniform sampler2D u_target;
      void main() {
        vec2 p = vUv - u_point;
        float splat = exp(-dot(p, p) / (u_radius * u_radius));
        float base = texture2D(u_target, vUv).r;
        gl_FragColor = vec4(base + splat * u_densityAmount, 0.0, 0.0, 1.0);
      }
    `

        // --- Advection (semi-Lagrangian). u_dissipationMultiply fades density each frame (1.0 for velocity).
        const advectFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_velocity;
      uniform sampler2D u_source;
      uniform vec2 u_texelSize;
      uniform float u_dt;
      uniform float u_dissipationMultiply;
      void main() {
        vec2 vel = texture2D(u_velocity, vUv).xy;
        vec2 pos = vUv - vel * u_texelSize * u_dt;
        gl_FragColor = texture2D(u_source, pos) * u_dissipationMultiply;
      }
    `

        // --- Divergence
        const divergenceFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_velocity;
      uniform vec2 u_texelSize;
      void main() {
        float L = texture2D(u_velocity, vUv - vec2(u_texelSize.x, 0.0)).x;
        float R = texture2D(u_velocity, vUv + vec2(u_texelSize.x, 0.0)).x;
        float T = texture2D(u_velocity, vUv + vec2(0.0, u_texelSize.y)).y;
        float B = texture2D(u_velocity, vUv - vec2(0.0, u_texelSize.y)).y;
        float div = 0.5 * ((R - L) + (T - B));
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `

        // --- Pressure (Jacobi)
        const pressureFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_pressure;
      uniform sampler2D u_divergence;
      uniform vec2 u_texelSize;
      void main() {
        float L = texture2D(u_pressure, vUv - vec2(u_texelSize.x, 0.0)).r;
        float R = texture2D(u_pressure, vUv + vec2(u_texelSize.x, 0.0)).r;
        float T = texture2D(u_pressure, vUv + vec2(0.0, u_texelSize.y)).r;
        float B = texture2D(u_pressure, vUv - vec2(0.0, u_texelSize.y)).r;
        float C = texture2D(u_divergence, vUv).r;
        float p = (L + R + T + B - C) * 0.25;
        gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
      }
    `

        // --- Curl (vorticity confinement) for swirl
        const curlFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_velocity;
      uniform vec2 u_texelSize;
      uniform float u_curl;
      void main() {
        float vL = texture2D(u_velocity, vUv - vec2(u_texelSize.x, 0.0)).y;
        float vR = texture2D(u_velocity, vUv + vec2(u_texelSize.x, 0.0)).y;
        float vT = texture2D(u_velocity, vUv + vec2(0.0, u_texelSize.y)).x;
        float vB = texture2D(u_velocity, vUv - vec2(0.0, u_texelSize.y)).x;
        float curl = (vR - vL) - (vT - vB);
        vec2 vel = texture2D(u_velocity, vUv).xy;
        float strength = u_curl * 0.00015;
        vel.x += strength * (vT - vB);
        vel.y += strength * (vL - vR);
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `
        // --- Subtract pressure gradient from velocity
        const gradientFrag = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_velocity;
      uniform sampler2D u_pressure;
      uniform vec2 u_texelSize;
      void main() {
        float L = texture2D(u_pressure, vUv - vec2(u_texelSize.x, 0.0)).r;
        float R = texture2D(u_pressure, vUv + vec2(u_texelSize.x, 0.0)).r;
        float T = texture2D(u_pressure, vUv + vec2(0.0, u_texelSize.y)).r;
        float B = texture2D(u_pressure, vUv - vec2(0.0, u_texelSize.y)).r;
        vec2 vel = texture2D(u_velocity, vUv).xy;
        vel.x -= 0.5 * (R - L);
        vel.y -= 0.5 * (T - B);
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `

        // Shader that renders the hover image masked by the fluid density
        const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_progress;
      uniform vec2 u_planeRes;
      uniform float u_radius;
      uniform float u_blur;
      uniform float u_circleBoost;
      uniform float u_noiseFreq;
      uniform float u_noiseStrength;
      uniform float u_noiseSize;
      uniform float u_timeSpeed;
      uniform sampler2D u_hoverImage;
      uniform float u_hoverScale;
      uniform float u_hoverImageAspect;
      uniform float u_containerAspect;
      uniform vec2 u_windowSize;
      uniform vec2 u_containerOffset;

              // Simplex noise 3D from https://github.com/ashima/webgl-noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        // First corner
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0 * C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        // Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      uniform sampler2D u_densityTex;

      void main() {
        vec2 uv = vUv;

        // Fluid density from simulation (persistent, spreads and fades)
        float density = texture2D(u_densityTex, uv).r * u_circleBoost * u_progress;

        // Window-relative noise for organic mask edges
        vec2 windowCoord = (uv * u_planeRes + u_containerOffset) / u_windowSize;
        float offx = windowCoord.x + (u_time * u_timeSpeed * 0.1) + sin(windowCoord.y + u_time * u_timeSpeed * 0.1);
        float offy = windowCoord.y - cos(u_time * u_timeSpeed * 0.001) * 0.01;
        float effectiveNoiseFreq = u_noiseFreq / u_noiseSize;
        float n1 = snoise(vec3(offx * effectiveNoiseFreq, offy * effectiveNoiseFreq, u_time * u_timeSpeed)) - 1.0;
        float n2 = snoise(vec3(offx * effectiveNoiseFreq * 0.5, offy * effectiveNoiseFreq * 0.5, u_time * u_timeSpeed * 0.7)) - 1.0;
        float n = (n1 + n2 * 0.5) * 0.7;

        float finalMask = smoothstep(0.35, 0.55, (n * u_noiseStrength) + pow(density, 1.5));

        // Responsive UV mapping for hover image (maintains aspect ratio like object-fit: cover)
        vec2 responsiveUV = uv;
        
        // Ensure we're not getting NaN or invalid values
        if (u_hoverImageAspect > 0.0 && u_containerAspect > 0.0) {
            if (u_hoverImageAspect > u_containerAspect) {
              // Image is wider than container - scale to fit height
              float scale = u_containerAspect / u_hoverImageAspect;
              responsiveUV.x = (uv.x - 0.5) * scale + 0.5;
            } else {
              // Image is taller than container - scale to fit width
              float scale = u_hoverImageAspect / u_containerAspect;
              responsiveUV.y = (uv.y - 0.5) * scale + 0.5;
            }
        } else {
            // Fallback to original UV if aspect ratios are invalid
            responsiveUV = uv;
        }

        // Sample the hover image with responsive UV mapping and apply the mask
        responsiveUV = (responsiveUV - vec2(0.5)) / max(u_hoverScale, 1.0) + vec2(0.5);
        vec4 hoverColor = texture2D(u_hoverImage, responsiveUV);
        
        // Output the hover image with mask applied as alpha
        gl_FragColor = vec4(hoverColor.rgb, hoverColor.a * finalMask);
      }
    `

        const geometry = new PlaneGeometry(1, 1, 1, 1)
        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
        })
        const mesh = new Mesh(geometry, material)
        scene.add(mesh)

        // --- Fluid simulation scene (full-screen quad, ortho camera) ---
        const fluidScene = new Scene()

        const texelSize = new Vector2(1 / simWidth, 1 / simHeight)
        const splatVelMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: splatFrag,
            uniforms: {
                u_point: { value: new Vector2(0.5, 0.5) },
                u_splatColor: { value: new Vector2(0, 0) },
                u_radius: { value: 0.02 },
                u_target: { value: velFBO0.texture },
            },
            depthWrite: false,
        })
        const quadMesh = new Mesh(quadGeometry, splatVelMaterial)
        fluidScene.add(quadMesh)
        const splatDensityMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: splatDensityFrag,
            uniforms: {
                u_point: { value: new Vector2(0.5, 0.5) },
                u_radius: { value: 0.02 },
                u_densityAmount: { value: 1.0 },
                u_target: { value: densityFBO0.texture },
            },
            depthWrite: false,
        })
        const advectMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: advectFrag,
            uniforms: {
                u_velocity: { value: velFBO0.texture },
                u_source: { value: velFBO0.texture },
                u_texelSize: { value: texelSize.clone() },
                u_dt: { value: 1 },
                u_dissipationMultiply: { value: 0.99 },
            },
            depthWrite: false,
        })
        const divergenceMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: divergenceFrag,
            uniforms: {
                u_velocity: { value: velFBO0.texture },
                u_texelSize: { value: texelSize.clone() },
            },
            depthWrite: false,
        })
        const pressureMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: pressureFrag,
            uniforms: {
                u_pressure: { value: pressureFBO0.texture },
                u_divergence: { value: divFBO.texture },
                u_texelSize: { value: texelSize.clone() },
            },
            depthWrite: false,
        })
        const gradientMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: gradientFrag,
            uniforms: {
                u_velocity: { value: velFBO0.texture },
                u_pressure: { value: pressureFBO0.texture },
                u_texelSize: { value: texelSize.clone() },
            },
            depthWrite: false,
        })
        const curlMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: curlFrag,
            uniforms: {
                u_velocity: { value: velFBO0.texture },
                u_texelSize: { value: texelSize.clone() },
                u_curl: { value: 30 },
            },
            depthWrite: false,
        })
        const advectDensityMaterial = new ShaderMaterial({
            vertexShader: vertexShaderQuad,
            fragmentShader: advectFrag,
            uniforms: {
                u_velocity: { value: velFBO0.texture },
                u_source: { value: densityFBO0.texture },
                u_texelSize: { value: texelSize.clone() },
                u_dt: { value: 1 },
                u_dissipationMultiply: { value: 0.93 },
            },
            depthWrite: false,
        })

        const sizes = new Vector2()
        const offset = new Vector2()

        const updateFromDOM = () => {
            // Use clientWidth/clientHeight for more reliable sizing
            const actualWidth = Math.max(container.clientWidth, 2)
            const actualHeight = Math.max(container.clientHeight, 2)

            // Make the mesh fill the entire container (not just the image)
            sizes.set(actualWidth, actualHeight)
            offset.set(0, 0) // Center in container
            mesh.position.set(0, 0, 0)
            mesh.scale.set(actualWidth, actualHeight, 1)

            // Update renderer size to match container exactly
            renderer.setSize(actualWidth, actualHeight, false)

            // Update camera to match new dimensions
            camera.aspect = actualWidth / actualHeight
            camera.updateProjectionMatrix()

            // Ensure camera is positioned correctly for the new dimensions
            camera.position.z = perspective
            camera.lookAt(0, 0, 0)

            uniforms.u_planeRes.value.set(actualWidth, actualHeight)

            // Update window size and container offset for consistent noise scaling
            uniforms.u_windowSize.value.set(
                window.innerWidth,
                window.innerHeight
            )

            // Get container position for offset calculations
            const containerRect = container.getBoundingClientRect()
            uniforms.u_containerOffset.value.set(
                containerRect.left,
                containerRect.top
            )

            // Update aspect ratio uniforms for responsive hover image
            const containerAspect = actualWidth / actualHeight
            uniforms.u_containerAspect.value = containerAspect

            // Calculate hover image aspect ratio when texture is loaded
            if (hoverTexture.image) {
                const imageAspect =
                    hoverTexture.image.width / hoverTexture.image.height
                uniforms.u_hoverImageAspect.value = imageAspect
            }

            // Resize fluid simulation buffers when container size changes
            resizeFluidFBOs(actualWidth, actualHeight)
            texelSize.set(1 / simWidth, 1 / simHeight)
            uniforms.u_simResolution.value.set(simWidth, simHeight)

            // Force a re-render to update the effect
            if (isAnimating) {
                renderer.render(scene, camera)
            }
        }

        // Initial setup
        updateFromDOM()

        let targetProgress = 0
        let rafId = 0
        const clock = new Clock()

        // Function to determine if we should animate
        const shouldAnimate = () => {
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            const isInView =
                container.getBoundingClientRect().top < window.innerHeight &&
                container.getBoundingClientRect().bottom > 0

            // Only animate if:
            // 1. We're in Canvas mode AND preview is enabled, OR
            // 2. We're not in Canvas mode (live website) AND component is in view
            return (
                (isCanvasMode && debouncedProps.preview) ||
                (!isCanvasMode && isInView)
            )
        }

        const render = () => {
            if (!shouldAnimate()) {
                isAnimating = false
                return
            }

            isAnimating = true
            rafId = requestAnimationFrame(render)

            const dt = clock.getDelta()
            uniforms.u_time.value += dt

            const mouseTarget = uniforms.u_mouse.value
            mouseVelocity.x = mouseTarget.x - lastMouseUV.x
            mouseVelocity.y = mouseTarget.y - lastMouseUV.y
            lastMouseUV.x = mouseTarget.x
            lastMouseUV.y = mouseTarget.y

            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            const simMouseX = isCanvasMode && debouncedProps.preview ? 0.5 : mouseTarget.x
            const simMouseY = isCanvasMode && debouncedProps.preview ? 0.5 : mouseTarget.y
            const splatRad = Math.max(0.005, debouncedProps.splatRadius)
            const velDiss = Math.max(0.9, Math.min(1, debouncedProps.velocityDissipation))
            // Return time in seconds → per-frame dissipation so density ~1% after that time at 60fps
            const T = Math.max(0.5, Math.min(10, debouncedProps.shrinkTimeSeconds))
            const denDiss = Math.pow(0.01, 1 / (60 * T))
            const pressureIters = Math.max(10, Math.min(50, Math.round(debouncedProps.pressureIterations)))

            texelSize.set(1 / simWidth, 1 / simHeight)
            advectMaterial.uniforms.u_texelSize.value.copy(texelSize)
            divergenceMaterial.uniforms.u_texelSize.value.copy(texelSize)
            pressureMaterial.uniforms.u_texelSize.value.copy(texelSize)
            gradientMaterial.uniforms.u_texelSize.value.copy(texelSize)
            advectDensityMaterial.uniforms.u_texelSize.value.copy(texelSize)

            const gl = renderer.getContext()
            gl.disable(gl.BLEND)

            // 1) Splat velocity
            splatVelMaterial.uniforms.u_point.value.set(simMouseX, simMouseY)
            splatVelMaterial.uniforms.u_splatColor.value.set(mouseVelocity.x * 30, mouseVelocity.y * 30)
            splatVelMaterial.uniforms.u_radius.value = splatRad
            splatVelMaterial.uniforms.u_target.value = velFBO0.texture
            quadMesh.material = splatVelMaterial
            renderer.setRenderTarget(velFBO1)
            renderer.render(fluidScene, orthoCamera)

            // 2) Splat density
            splatDensityMaterial.uniforms.u_point.value.set(simMouseX, simMouseY)
            splatDensityMaterial.uniforms.u_radius.value = splatRad
            splatDensityMaterial.uniforms.u_densityAmount.value = (isCanvasMode && debouncedProps.preview) ? 0.15 : 1
            splatDensityMaterial.uniforms.u_target.value = densityFBO0.texture
            quadMesh.material = splatDensityMaterial
            renderer.setRenderTarget(densityFBO1)
            renderer.render(fluidScene, orthoCamera)

            // 3) Advect velocity
            advectMaterial.uniforms.u_velocity.value = velFBO1.texture
            advectMaterial.uniforms.u_source.value = velFBO1.texture
            advectMaterial.uniforms.u_dt.value = 1
            advectMaterial.uniforms.u_dissipationMultiply.value = velDiss
            quadMesh.material = advectMaterial
            renderer.setRenderTarget(velFBO0)
            renderer.render(fluidScene, orthoCamera)

            // 3b) Curl (vorticity) for fluid swirl
            if (debouncedProps.curl > 0) {
                curlMaterial.uniforms.u_velocity.value = velFBO0.texture
                curlMaterial.uniforms.u_curl.value = debouncedProps.curl
                quadMesh.material = curlMaterial
                renderer.setRenderTarget(velFBO1)
                renderer.render(fluidScene, orthoCamera)
            }

            // 4) Divergence (use velFBO1 if curl ran, else velFBO0)
            const velForDiv = debouncedProps.curl > 0 ? velFBO1.texture : velFBO0.texture
            divergenceMaterial.uniforms.u_velocity.value = velForDiv
            quadMesh.material = divergenceMaterial
            renderer.setRenderTarget(divFBO)
            renderer.render(fluidScene, orthoCamera)

            // 5) Pressure (Jacobi)
            pressureMaterial.uniforms.u_divergence.value = divFBO.texture
            let pressureRead = pressureFBO0
            let pressureWrite = pressureFBO1
            for (let i = 0; i < pressureIters; i++) {
                pressureMaterial.uniforms.u_pressure.value = pressureRead.texture
                quadMesh.material = pressureMaterial
                renderer.setRenderTarget(pressureWrite)
                renderer.render(fluidScene, orthoCamera)
                const tmp = pressureRead
                pressureRead = pressureWrite
                pressureWrite = tmp
            }

            // 6) Subtract pressure gradient from velocity
            const velForGradientRead = debouncedProps.curl > 0 ? velFBO1 : velFBO0
            const velForGradientWrite = debouncedProps.curl > 0 ? velFBO0 : velFBO1
            gradientMaterial.uniforms.u_velocity.value = velForGradientRead.texture
            gradientMaterial.uniforms.u_pressure.value = pressureRead.texture
            quadMesh.material = gradientMaterial
            renderer.setRenderTarget(velForGradientWrite)
            renderer.render(fluidScene, orthoCamera)

            // 7) Advect density (use velocity after gradient)
            advectDensityMaterial.uniforms.u_velocity.value = velForGradientWrite.texture
            advectDensityMaterial.uniforms.u_source.value = densityFBO1.texture
            advectDensityMaterial.uniforms.u_dt.value = 1
            advectDensityMaterial.uniforms.u_dissipationMultiply.value = denDiss
            quadMesh.material = advectDensityMaterial
            renderer.setRenderTarget(densityFBO0)
            renderer.render(fluidScene, orthoCamera)

            // Ping-pong swap: gradient output must be in velFBO0 for next frame's splat
            if (debouncedProps.curl <= 0) {
                const tmp = velFBO0
                velFBO0 = velFBO1
                velFBO1 = tmp
            }

            renderer.setRenderTarget(null)
            gl.enable(gl.BLEND)

            uniforms.u_densityTex.value = densityFBO0.texture
            uniforms.u_blur.value = mapBlur(debouncedProps.blur)
            uniforms.u_circleBoost.value = mapCircleBoost(debouncedProps.circleBoost)
            const currentTextureParams = mapTexture(debouncedProps.texture)
            uniforms.u_noiseFreq.value = currentTextureParams.freq
            uniforms.u_noiseStrength.value = currentTextureParams.strength
            uniforms.u_noiseSize.value = currentTextureParams.size
            uniforms.u_timeSpeed.value = mapTimeSpeed(debouncedProps.timeSpeed)
            uniforms.u_radius.value = mapRadius(debouncedProps.radius)
            if (isCanvasMode && debouncedProps.preview) {
                targetProgress = 1
                uniforms.u_mouse.value.set(0.5, 0.5)
                uniforms.u_noiseFreq.value = currentTextureParams.freq * 1.25
            } else {
                uniforms.u_noiseStrength.value = currentTextureParams.strength
            }

            uniforms.u_progress.value += (targetProgress - uniforms.u_progress.value) * 0.08
            renderer.render(scene, camera)
        }

        // Start animation if needed
        if (shouldAnimate()) {
            render()
        }

        // Throttled resize handler
        let resizeTimeout: NodeJS.Timeout | null = null
        const throttledResize = () => {
            if (resizeTimeout) return

            resizeTimeout = setTimeout(() => {
                // Update DOM and force re-render
                updateFromDOM()

                // Ensure the effect is properly updated
                if (isAnimating) {
                    renderer.render(scene, camera)
                }

                resizeTimeout = null
            }, 100) // 100ms throttle
        }

        // Use ResizeObserver for container changes
        const resizeObserver = new ResizeObserver((entries) => {
            // Immediate update for critical dimension changes
            entries.forEach((entry) => {
                const { width, height } = entry.contentRect

                // Update if dimensions have changed
                if (width !== sizes.x || height !== sizes.y) {
                    updateFromDOM()
                }
            })
            // Also use throttled resize for performance
            throttledResize()
        })
        resizeObserver.observe(container)

        // Also listen to window resize for global changes
        window.addEventListener("resize", throttledResize)

        // Intersection Observer to pause rendering when out of view
        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        !isAnimating &&
                        shouldAnimate()
                    ) {
                        // Component came into view and should animate
                        render()
                    }
                })
            },
            {
                root: null,
                rootMargin: "50px", // Start animating 50px before component comes into view
                threshold: 0.01,
            }
        )
        intersectionObserver.observe(container)

        const onMove = (e: MouseEvent) => {
            // Only handle mouse events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && debouncedProps.preview) return

            // Start animation if not already running
            if (!isAnimating && shouldAnimate()) {
                render()
            }

            const containerRect = container.getBoundingClientRect()
            const x = (e.clientX - containerRect.left) / containerRect.width
            const y = 1 - (e.clientY - containerRect.top) / containerRect.height
            uniforms.u_mouse.value.set(
                Math.max(0.0, Math.min(1.0, x)),
                Math.max(0.0, Math.min(1.0, y))
            )
        }
        const onEnter = () => {
            // Only handle hover events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && debouncedProps.preview) return

            targetProgress = 1
            if (hover && hover.enabled) {
                animateToScale(hoverScaleRef.current)
            }

            // Start animation if not already running
            if (!isAnimating && shouldAnimate()) {
                render()
            }
        }
        const onLeave = () => {
            // Only handle hover events if not in Canvas preview mode
            const isCanvasMode = RenderTarget.current() === RenderTarget.canvas
            if (isCanvasMode && debouncedProps.preview) return

            targetProgress = 0
            if (hover && hover.enabled) {
                animateToScale(1)
            }
        }

        container.addEventListener("mousemove", onMove)
        container.addEventListener("mouseenter", onEnter)
        container.addEventListener("mouseleave", onLeave)

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
            resizeObserver.disconnect()
            intersectionObserver.disconnect()
            window.removeEventListener("resize", throttledResize)
            if (resizeTimeout) {
                clearTimeout(resizeTimeout)
            }
            container.removeEventListener("mousemove", onMove)
            container.removeEventListener("mouseenter", onEnter)
            container.removeEventListener("mouseleave", onLeave)
            disposeFluidFBOs()
            quadGeometry.dispose()
            splatVelMaterial.dispose()
            splatDensityMaterial.dispose()
            advectMaterial.dispose()
            divergenceMaterial.dispose()
            pressureMaterial.dispose()
            gradientMaterial.dispose()
            curlMaterial.dispose()
            advectDensityMaterial.dispose()
            geometry.dispose()
            material.dispose()
            renderer.dispose()
        }
    }, [
        debouncedProps.radius,
        debouncedProps.blur,
        debouncedProps.circleBoost,
        debouncedProps.texture,
        debouncedProps.timeSpeed,
        debouncedProps.splatRadius,
        debouncedProps.velocityDissipation,
        debouncedProps.shrinkTimeSeconds,
        debouncedProps.curl,
        debouncedProps.pressureIterations,
        debouncedProps.preview,
        imageBase?.positionX,
        imageBase?.positionY,
        imageHover?.positionX,
        imageHover?.positionY,
        mapRadius,
        mapBlur,
        mapCircleBoost,
        mapTexture,
        mapTimeSpeed,
        isMobile,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: borderRadius,
                overflow: "clip",
                ...props.style,
            }}
        >
            {/* Base image - always visible */}
            <figure
                style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    flex: "0 0 auto",
                    margin: 0,
                    padding: 0,
                    position: "absolute",
                    zIndex: 1,
                }}
            >
                <img
                    ref={imgRef}
                    src={imageBase?.src}
                    srcSet={imageBase?.srcSet}
                    alt={imageBase?.alt || "Base image"}
                    draggable={false}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: `${imageBase?.positionX || "50%"} ${imageBase?.positionY || "50%"}`,
                        margin: 0,
                        padding: 0,
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                />
            </figure>

            {/* Hover image rendered by canvas - no DOM element needed */}

            {/* Three.js canvas - renders hover effect (hidden on mobile) */}
            {!isMobile && (
                <canvas
                    ref={canvasRef}
                    id="stage"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 3,
                        pointerEvents: "none",
                        opacity: 1,
                        minWidth: "100%",
                        minHeight: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                    }}
                />
            )}
        </div>
    )
}

addPropertyControls(LiquidMask, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    imageBase: {
        type: ControlType.ResponsiveImage,
        title: "Base",
    },
    imageHover: {
        type: ControlType.ResponsiveImage,
        title: "Hover",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Corner radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 10,
        unit: "px",
    },
    splatRadius: {
        type: ControlType.Number,
        title: "Size",
        min: 0.02,
        max: 0.2,
        step: 0.01,
        defaultValue: 0.08,
        unit: "",
    },
    circleBoost: {
        type: ControlType.Number,
        title: "Strength",
        min: 0.2,
        max: 1,
        step: 0.05,
        defaultValue: 0.6,
        unit: "",
    },
    shrinkTimeSeconds: {
        type: ControlType.Number,
        title: "Return time",
        min: 0.5,
        max: 10,
        step: 0.1,
        defaultValue: 2.3,
        unit: "s",
    },
    texture: {
        type: ControlType.Number,
        title: "Edge grain",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        unit: "",
    },
    curl: {
        type: ControlType.Number,
        title: "Swirl",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 30,
        unit: "",
    },
    hover: {
        type: ControlType.Object,
        title: "Zoom",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: false,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 1,
                max: 3,
                step: 0.1,
                defaultValue: 1.2,
                unit: "x",
                hidden: (props) => !props.enabled,
            },
            transition: {
                type: ControlType.Transition,
                title: "Transition",
                defaultValue: {
                    type: "tween",
                    duration: 0.5,
                    ease: [0.44, 0, 0.56, 1],
                    delay: 0,
                },
                hidden: (props) => !props.enabled,
            },
        },
    },
})

LiquidMask.displayName = "Liquid Mask"
