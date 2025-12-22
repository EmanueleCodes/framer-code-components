//@ts-ignore
import {
    useAspect,
    useTexture,
    useFrame,
    Canvas,
    useThree,
    Mesh,
    ShaderMaterial,
    MeshBasicMaterial,
    SRGBColorSpace,
    Vector2,
    Vector3,
    AdditiveBlending, //@ts-ignore the errors are to be
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-scan-bundle.js"

//--------------------------------
//--------------------------------

import {
    useContext,
    useMemo,
    useRef,
    useState,
    useEffect,
    useLayoutEffect,
    createContext,
    ReactNode,
} from "react"
import { animate } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Intrinsic size used to avoid width/height collapse in Canvas
const INTRINSIC_WIDTH = 600
const INTRINSIC_HEIGHT = 400

// Dynamic aspect ratio will be calculated from the actual images

// Mobile/touch detection hook
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            // Check for touch capability and screen size
            const hasTouch =
                "ontouchstart" in window || navigator.maxTouchPoints > 0
            const isSmallScreen = window.innerWidth <= 810
            setIsMobile(hasTouch || isSmallScreen)
        }

        checkIsMobile()
        window.addEventListener("resize", checkIsMobile)

        return () => window.removeEventListener("resize", checkIsMobile)
    }, [])

    return isMobile
}

// Hook to get image aspect ratio from a loaded Three.js texture (supports multiple sources)
const useImageAspectRatio = (texture: any) => {
    const [aspectRatio, setAspectRatio] = useState(16 / 9) // Default aspect ratio

    useEffect(() => {
        if (!texture) return

        // three@r150+ may store data on texture.source.data
        const source: any =
            (texture as any).image || (texture as any).source?.data
        if (!source) return

        const width =
            (source as any).videoWidth ||
            (source as any).naturalWidth ||
            (source as any).width
        const height =
            (source as any).videoHeight ||
            (source as any).naturalHeight ||
            (source as any).height

        if (width && height) {
            setAspectRatio(width / height)
        }
    }, [texture])

    return aspectRatio
}

// Property Controls for Framer
addPropertyControls(Home, {
    depthMap: {
        type: ControlType.ResponsiveImage,
        title: "Depth",
        description:
            "Use [this free tool](https://app.artificialstudio.ai/tools/image-depth-map-generator).",
    },
    backgroundMode: {
        type: ControlType.Boolean,
        title: "Background",
        defaultValue: false, // false = Color, true = Image,
        enabledTitle: "Image",
        disabledTitle: "Color",
    },
    textureMap: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        hidden: (props) => !props.backgroundMode,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "BG Color",
        defaultValue: "#000000",
        hidden: (props) => !!props.backgroundMode,
    },
    effectType: {
        type: ControlType.Enum,
        title: "Effect",
        options: ["gradient", "dots"],
        optionTitles: ["Gradient", "Dots"],
        defaultValue: "gradient",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },

    gradient: {
        type: ControlType.Object,
        title: "Gradient",
        hidden: (props) => props.effectType !== "gradient",
        controls: {
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 0.0,
                max: 5.0,
                step: 0.1,
                defaultValue: 3.5,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Bloom",
                min: 0.0,
                max: 1.0,
                step: 0.01,
                defaultValue: 0.3,
            },
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.1,
                max: 10,
                step: 0.1,
                defaultValue: 5,
            },
        },
    },

    dots: {
        type: ControlType.Object,
        title: "Dots",
        hidden: (props) => props.effectType !== "dots",
        controls: {
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 1,
                max: 100,
                step: 1,
                defaultValue: 50,
            },
            tiling: {
                type: ControlType.Number,
                title: "Amount",
                min: 1,
                max: 100,
                step: 1,
                defaultValue: 50,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Bloom",
                min: 0.0,
                max: 1.0,
                step: 0.01,
                defaultValue: 0.5,
            },
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0.1,
                max: 10,
                step: 0.1,
                defaultValue: 5,
            },
        },
    },

    dotColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
    },

    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        min: 0.1,
        max: 5.0,
        step: 0.1,
        defaultValue: 1,
    },

    animation: {
        type: ControlType.Object,
        title: "Animation",
        controls: {
            play: {
                type: ControlType.Enum,
                title: "Play",
                options: ["once", "loop"],
                optionTitles: ["Once", "Loop"],
                defaultValue: "once",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            mode: {
                type: ControlType.Enum,
                title: "Mode",
                options: ["repeat", "mirror"],
                optionTitles: ["Repeat", "Mirror"],
                defaultValue: "repeat",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
                hidden: (props) => props.play !== "loop",
            },
            transition: {
                type: ControlType.Transition,
                title: "Timing",
                defaultValue: {
                    type: "tween",
                    duration: 2.5,
                    ease: "easeInOut",
                },
            },
        },
    },

    hover: {
        type: ControlType.Object,
        title: "Hover",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: true,
            },
            direction: {
                type: ControlType.Enum,
                title: "Direction",
                options: [
                    "topToBottom",
                    "bottomToTop",
                    "leftToRight",
                    "rightToLeft",
                    "centerOutward",
                    "outwardToCenter",
                ],
                optionTitles: [
                    "Top Down",
                    "Bottom Up",
                    "Left Right",
                    "Right Left",
                    "Center Out",
                    "Out Center",
                ],
                defaultValue: "topToBottom",
                hidden: (props) => !props.enabled,
            },
        },
    },
})

// Global Context
interface GlobalContextType {
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export const GlobalContext = createContext<GlobalContextType>({
    isLoading: true,
    setIsLoading: () => {},
})

interface ContextProviderProps {
    children: ReactNode
}

export const ContextProvider: React.FC<ContextProviderProps> = ({
    children,
}) => {
    const [isLoading, setIsLoading] = useState(true)

    return (
        <GlobalContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </GlobalContext.Provider>
    )
}

// Minimal color resolver for Framer CSS variables like:
// var(--token-xxxx, #331616) → "#331616"
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    // If the fallback itself is another var(), resolve recursively
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

// Parse CSS color strings (hex, hexa, rgb, rgba) into 0..1 RGBA
function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 1, g: 1, b: 1, a: 1 }
    const str = input.trim()

    // rgba(R,G,B,A)
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

    // #RRGGBBAA or #RRGGBB
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b, a: 1 }
    }
    if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        const a = parseInt(hex[3] + hex[3], 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return { r, g, b, a: 1 }
    }
    // Fallback white
    return { r: 1, g: 1, b: 1, a: 1 }
}

// WebGPUCanvas Component
export const WebGPUCanvas = (props: any) => {
    return (
        <Canvas
            {...props}
            flat
            gl={{
                antialias: true,
                powerPreference: "high-performance",
                precision: "mediump",
                depth: true,
            }}
            // Absolutely fill the parent; avoids any layout-driven min-height behavior
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
            }}
            resize={{ offsetSize: true }}
            dpr={[1, 2]}
        >
            {props.children}
        </Canvas>
    )
}

// PostProcessing Component
export const PostProcessing = ({
    strength = 1,
    threshold = 1,
}: {
    strength?: number
    threshold?: number
}) => {
    const { gl, scene, camera } = useThree()

    // Simple post-processing setup that works with current Three.js version
    const render = useMemo(() => {
        // For now, just return the standard renderer
        return { gl, scene, camera }
    }, [gl, scene, camera])

    useFrame(() => {
        // Use standard rendering instead of renderAsync
        gl.setRenderTarget(null)
        gl.render(scene, camera)
    })

    return null
}

interface SceneProps {
    dotSize: number
    dotColor: string
    tilingScale: number
    effectType: "dots" | "gradient"
    gradientWidth: number
    intensity: number
    bloomStrength: number
    bloomRadius: number
    showTexture: boolean
    backgroundColor: string
    progress: number
    active?: boolean
}

const Scene = ({
    dotSize,
    dotColor,
    tilingScale,
    effectType,
    gradientWidth,
    intensity,
    bloomStrength,
    bloomRadius,
    showTexture,
    backgroundColor,
    progress,
    active,
    textureMap,
    depthMap,
    initialAspectRatio,
    onReady,
}: SceneProps & {
    textureMap?: any
    depthMap?: any
    initialAspectRatio?: number
    onReady?: () => void
}) => {
    const { setIsLoading } = useContext(GlobalContext)
    // Subscribe to viewport/size so we re-render on container resize
    const viewport = useThree((state: any) => state.viewport)
    const size = useThree((state: any) => state.size)
    const materialRef = useRef<typeof Mesh>(null)
    const readySignaledRef = useRef(false)

    // Log dotColor changes (not every frame!) - removed for performance

    // Determine whether a real texture image was provided
    const hasTextureMapProp = !!(
        textureMap &&
        (textureMap.src || typeof textureMap === "string")
    )

    // Convert Framer image objects to URLs. Use a 1x1 transparent data URI as safe fallback.
    const textureMapUrl = hasTextureMapProp
        ? textureMap?.src || textureMap
        : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
    const depthMapUrl =
        depthMap?.src ||
        depthMap ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2NjY2NiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlcHRoPC90ZXh0Pjwvc3ZnPg=="

    // Load the textures
    const [rawMap, depthMapTexture] = useTexture(
        [textureMapUrl, depthMapUrl],
        () => {
            // Textures are loaded, but we will only mark loading=false
            // after we can read actual dimensions to avoid a one-frame
            // aspect ratio distortion. Still apply colorSpace immediately.
            if (rawMap) {
                rawMap.colorSpace = SRGBColorSpace
            }
        }
    )

    // Determine which provided asset should drive aspect ratio. If the user did not
    // provide a texture map, ignore the placeholder texture and use the real depth map.
    // hasTextureMapProp already computed above
    const aspectSourceTexture = hasTextureMapProp ? rawMap : depthMapTexture
    const imageAspectRatio = useImageAspectRatio(aspectSourceTexture)

    // Consider textures/aspect "ready" only when we can read real dimensions
    const isAspectReady = useMemo(() => {
        const tex: any = aspectSourceTexture
        const source: any = tex && (tex.image || tex.source?.data)
        if (!source) return false
        const width = source.videoWidth || source.naturalWidth || source.width
        const height =
            source.videoHeight || source.naturalHeight || source.height
        return Boolean(width && height)
    }, [aspectSourceTexture])

    // Prefer preloaded ratio from HTML until Three textures expose dimensions
    const effectiveAspectRatio = useMemo(() => {
        if (isAspectReady) return imageAspectRatio
        if (typeof initialAspectRatio === "number" && initialAspectRatio > 0) {
            return initialAspectRatio
        }
        return imageAspectRatio
    }, [isAspectReady, imageAspectRatio, initialAspectRatio])

    // Reset loading whenever the texture inputs change
    useEffect(() => {
        setIsLoading(true)
    }, [textureMapUrl, depthMapUrl, setIsLoading])

    // Flip loading off only after aspect is measurable
    useEffect(() => {
        if (isAspectReady) {
            setIsLoading(false)
        }
    }, [isAspectReady, setIsLoading])

    // Memoized color conversion with alpha support
    const rgbaColor = useMemo(() => {
        return parseColorToRgba(dotColor || "#ffffff")
    }, [dotColor])

    // Notify parent when Three textures and aspect are fully ready to avoid visible resize
    useEffect(() => {
        if (readySignaledRef.current) return
        if (!onReady) return
        const baseReady = showTexture
            ? !!(
                  rawMap &&
                  ((rawMap as any).image || (rawMap as any).source?.data)
              )
            : true
        if (isAspectReady && depthMapTexture && baseReady) {
            readySignaledRef.current = true
            onReady()
        }
    }, [onReady, isAspectReady, depthMapTexture, rawMap, showTexture])

    // Create background material for when texture is hidden
    const backgroundMaterial = useMemo(() => {
        const rgba = parseColorToRgba(backgroundColor)
        const toHex = (v: number) =>
            Math.round(v * 255)
                .toString(16)
                .padStart(2, "0")
        const hex = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`
        return new MeshBasicMaterial({
            color: hex,
            transparent: rgba.a < 1,
            opacity: rgba.a,
        })
    }, [backgroundColor])

    // Use MeshBasicMaterial for bright base image
    const material = useMemo(() => {
        return new MeshBasicMaterial({
            map: rawMap,
            transparent: false,
        })
    }, [rawMap])

    // Create uniform refs that persist between renders
    const uniformsRef = useRef({
        uProgress: { value: 0 },
        uDepthMap: { value: null as any },
        uColor: { value: new Vector3(0, 1, 0) },
        uColorAlpha: { value: rgbaColor.a ?? 1 },
        uEffectType: { value: effectType === "dots" ? 0.0 : 1.0 },
        uDotSize: { value: dotSize },
        uTilingScale: { value: tilingScale },
        uGradientWidth: { value: gradientWidth },
        uIntensity: { value: intensity }, // Renamed from uGradientIntensity
        uBloomStrength: { value: bloomStrength },
        uBloomRadius: { value: bloomRadius },
        uAspectRatio: { value: effectiveAspectRatio }, // Dynamic aspect ratio (seeded to avoid initial flicker)
    })

    // Calculate responsive scaling for COVER behavior - image fills entire container
    const { width: scaleX, height: scaleY } = useMemo(() => {
        const viewportAspectRatio = viewport.width / viewport.height

        if (effectiveAspectRatio > viewportAspectRatio) {
            // Image is wider than viewport - scale to fill viewport height (image will be cropped on sides)
            return {
                width: viewport.height * effectiveAspectRatio,
                height: viewport.height,
            }
        } else {
            // Image is taller than viewport - scale to fill viewport width (image will be cropped on top/bottom)
            return {
                width: viewport.width,
                height: viewport.width / effectiveAspectRatio,
            }
        }
    }, [viewport.width, viewport.height, effectiveAspectRatio])

    // Store previous values to avoid unnecessary uniform updates
    const prevValuesRef = useRef({
        progress: -1,
        dotColor: "",
        effectType: "gradient" as "dots" | "gradient",
        dotSize: -1,
        tilingScale: -1,
        gradientWidth: -1,
        intensity: -1, // Renamed from gradientIntensity
        bloomStrength: -1,
        bloomRadius: -1,
    })

    // Initialize uniforms properly for both canvas and live environments
    // Use layout effect to ensure uniforms reflect final values before first paint
    useLayoutEffect(() => {
        const effectTypeValue = effectType === "dots" ? 0.0 : 1.0

        // Set initial uniforms - this ensures canvas environment shows correct values
        uniformsRef.current.uProgress.value = progress
        uniformsRef.current.uColor.value.set(
            rgbaColor.r,
            rgbaColor.g,
            rgbaColor.b
        )
        uniformsRef.current.uColorAlpha.value = rgbaColor.a ?? 1
        uniformsRef.current.uEffectType.value = effectTypeValue
        uniformsRef.current.uDotSize.value = dotSize
        uniformsRef.current.uTilingScale.value = tilingScale
        uniformsRef.current.uGradientWidth.value = gradientWidth
        uniformsRef.current.uIntensity.value = intensity
        uniformsRef.current.uBloomStrength.value = bloomStrength
        uniformsRef.current.uBloomRadius.value = bloomRadius

        if (depthMapTexture) {
            uniformsRef.current.uDepthMap.value = depthMapTexture
        }

        // Update aspect ratio uniform
        uniformsRef.current.uAspectRatio.value = effectiveAspectRatio
    }, [
        progress,
        rgbaColor,
        effectType,
        dotSize,
        tilingScale,
        gradientWidth,
        intensity,
        bloomStrength,
        bloomRadius,
        depthMapTexture,
        effectiveAspectRatio,
    ])

    // Update uniforms for the effects shader - optimized to only update when values change
    useFrame(() => {
        if (active === false) return
        // For canvas environment, we already handle updates via useEffect above
        // For live environment, we need frame-by-frame updates for smooth animations
        if (RenderTarget.current() === RenderTarget.canvas) {
            return
        }

        const prev = prevValuesRef.current
        const effectTypeValue = effectType === "dots" ? 0.0 : 1.0

        // Only update uniforms that have actually changed
        if (prev.progress !== progress) {
            uniformsRef.current.uProgress.value = progress
            prev.progress = progress
        }

        if (prev.dotColor !== dotColor) {
            uniformsRef.current.uColor.value.set(
                rgbaColor.r,
                rgbaColor.g,
                rgbaColor.b
            )
            uniformsRef.current.uColorAlpha.value = rgbaColor.a ?? 1
            prev.dotColor = dotColor
        }

        if (prev.effectType !== effectType) {
            uniformsRef.current.uEffectType.value = effectTypeValue
            prev.effectType = effectType
        }

        if (prev.dotSize !== dotSize) {
            uniformsRef.current.uDotSize.value = dotSize
            prev.dotSize = dotSize
        }

        if (prev.tilingScale !== tilingScale) {
            uniformsRef.current.uTilingScale.value = tilingScale
            prev.tilingScale = tilingScale
        }

        if (prev.gradientWidth !== gradientWidth) {
            uniformsRef.current.uGradientWidth.value = gradientWidth
            prev.gradientWidth = gradientWidth
        }

        if (prev.intensity !== intensity) {
            uniformsRef.current.uIntensity.value = intensity
            prev.intensity = intensity
        }

        if (prev.bloomStrength !== bloomStrength) {
            uniformsRef.current.uBloomStrength.value = bloomStrength
            prev.bloomStrength = bloomStrength
        }

        if (prev.bloomRadius !== bloomRadius) {
            uniformsRef.current.uBloomRadius.value = bloomRadius
            prev.bloomRadius = bloomRadius
        }

        // Update depth map when loaded (only once)
        if (
            depthMapTexture &&
            uniformsRef.current.uDepthMap.value !== depthMapTexture
        ) {
            uniformsRef.current.uDepthMap.value = depthMapTexture
        }
    })

    return (
        <>
            {/* Base layer - either texture image (only if provided) or background color */}
            {showTexture && hasTextureMapProp ? (
                <mesh scale={[scaleX, scaleY, 1]} material={material}>
                    <planeGeometry />
                </mesh>
            ) : (
                <mesh scale={[scaleX, scaleY, 1]} material={backgroundMaterial}>
                    <planeGeometry />
                </mesh>
            )}

            {/* Effects overlay mesh */}
            <mesh
                scale={[scaleX, scaleY, 1]}
                position={[0, 0, 0.01]}
                ref={materialRef}
            >
                <planeGeometry />
                <shaderMaterial
                    transparent={true}
                    blending={AdditiveBlending}
                    vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
                    fragmentShader={`
            uniform float uProgress;
            uniform sampler2D uDepthMap;
            uniform vec3 uColor;
            uniform float uColorAlpha;
            uniform float uEffectType;
            uniform float uDotSize;
            uniform float uTilingScale;
            uniform float uGradientWidth;
            uniform float uIntensity;
            uniform float uBloomStrength;
            uniform float uBloomRadius;
            uniform float uAspectRatio;
            varying vec2 vUv;
            
            // Noise functions removed for clean gradient lines
            
            void main() {
              vec2 uv = vUv;
              float depth = texture2D(uDepthMap, uv).r;
              
              // Use the exact working formula from reference-code.tsx
              // Shift the band backward by one full gradient width so that
              // pixels at exact progress start invisible and end not stuck at 1.0
              // Base band width from control
              float baseWidth = uGradientWidth * 0.1;
              // Account for perceived widening from intensity and bloom
              float intensityFactor = max(uIntensity - 1.0, 0.0) * 0.15; // 0 when <=1, grows slowly
              float bloomFactor = uBloomStrength * (1.0 + uBloomRadius * 50.0); // radius expands halo
              float bandWidth = baseWidth * (1.0 + intensityFactor + bloomFactor);
              // Stretch progress farther (pre/overshoot) while keeping the local falloff shaped by bandWidth
              float overshootWidth = bandWidth * 2.2; // push more than the visual width
              float stretchedProgress = uProgress * (1.0 + 2.0 * overshootWidth) - overshootWidth;
              float flow = 1.0 - smoothstep(0.0, bandWidth, abs(depth - stretchedProgress));

              // Global progress envelope: fade in first 5% and fade out last 5%
              float startFade = smoothstep(0.0, 0.05, uProgress);
              float endFade = 1.0 - smoothstep(0.95, 1.0, uProgress);
              float progressEnvelope = startFade * endFade;
              
              // For dots effect - only render if explicitly in dots mode
              if (uEffectType < 0.5) {
                // Create tiled UV for dots using dynamic aspect ratio
                vec2 aspect = vec2(uAspectRatio, 1.0);
                vec2 tUv = vec2(uv.x * aspect.x, uv.y);
                vec2 tiling = vec2(uTilingScale);
                vec2 tiledUv = mod(tUv * tiling, 2.0) - 1.0;
                
                // Create dots with proper size control
                float dist = length(tiledUv);
                // Map uDotSize (approx 0.01..2.0) to a radius within the cell (0.08..0.48)
                float dotSize01 = clamp(uDotSize / 2.0, 0.0, 1.0);
                float dotRadius = mix(0.08, 0.48, dotSize01);
                float feather = 0.02;
                // Filled circle mask with soft edge
                float circle = 1.0 - smoothstep(dotRadius, dotRadius + feather, dist);
                
                // Shifted flow like gradient so initial band starts at 0 and overshoots
                float baseWidth = uGradientWidth * 0.1;
                float intensityFactor = max(uIntensity - 1.0, 0.0) * 0.15;
                float bloomFactor = uBloomStrength * (1.0 + uBloomRadius * 50.0);
                float bandWidth = baseWidth * (1.0 + intensityFactor + bloomFactor);
                float overshootWidth = bandWidth * 2.0;
                float stretchedProgress = uProgress * (1.0 + 2.0 * overshootWidth) - overshootWidth;
                float dotFlow = 1.0 - smoothstep(0.0, bandWidth, abs(depth - stretchedProgress));
                
                // Base dot effect
                float dotEffect = circle * dotFlow;
                
                // Apply bloom effect to dots
                float bloomSize = uBloomRadius * 100.0;
                float dotBloom = 0.0;
                
                // Core bloom for dots - use the same dot radius
                float coreBloom = circle * flow * uBloomStrength;
                // Medium bloom - extends from dot edge
                float mediumBloom = smoothstep(dotRadius + bloomSize * 0.3, dotRadius, dist) * flow * uBloomStrength * 0.6;
                // Outer bloom - largest area
                float outerBloom = smoothstep(dotRadius + bloomSize, dotRadius, dist) * flow * uBloomStrength * 0.3;
                
                dotBloom = max(max(coreBloom, mediumBloom), outerBloom);
                
                // Combine dot effect with bloom and apply intensity
                float final = max(dotEffect, dotBloom) * uIntensity;
                // Apply global progress envelope so effect is invisible at start and end
                final *= progressEnvelope;
                gl_FragColor = vec4(uColor * final, final * uColorAlpha);
              } else {
                // For gradient line effect - use same stretched band so edges start/end at 0
                float exactProgress = abs(depth - stretchedProgress);
                // Opacity fades from 1.0 at band center to 0.0 at one width away
                float opacity = 1.0 - smoothstep(0.0, bandWidth, exactProgress);
                
                // Intensity-based bloom effect - brighter areas create more bloom like reference code
                float bloomStrength = uBloomStrength;
                float bloomSize = uBloomRadius * 100.0; // Scale up for better control
                
                // Create multiple layers of bloom at different sizes for realistic glow
                float bloom = 0.0;
                
                // Core bloom - closest to the line
                float coreBloom = exactProgress <= (bandWidth + bloomSize * 0.5) ? 
                    (1.0 - smoothstep(0.0, bandWidth + bloomSize * 0.5, exactProgress)) * bloomStrength : 0.0;
                
                // Medium bloom - extends further
                float mediumBloom = exactProgress <= (bandWidth + bloomSize) ? 
                    (1.0 - smoothstep(0.0, bandWidth + bloomSize, exactProgress)) * bloomStrength * 0.6 : 0.0;
                
                // Outer bloom - softest and widest
                float outerBloom = exactProgress <= (bandWidth + bloomSize * 2.0) ? 
                    (1.0 - smoothstep(0.0, bandWidth + bloomSize * 2.0, exactProgress)) * bloomStrength * 0.3 : 0.0;
                
                // Combine all bloom layers
                bloom = max(max(coreBloom, mediumBloom), outerBloom);
                
                // Intensity-based boost - stronger intensity creates more bloom
                float intensityBoost = uIntensity * 0.5;
                bloom *= (1.0 + intensityBoost);
                
                // Combine main line with bloom
                float finalOpacity = max(opacity, bloom);
                // Apply global progress envelope so effect is invisible at start and end
                finalOpacity *= progressEnvelope;
                
                // Apply color and intensity
                gl_FragColor = vec4(uColor * finalOpacity * uIntensity, finalOpacity * uColorAlpha);
              }
            }
          `}
                    uniforms={uniformsRef.current}
                />
            </mesh>
        </>
    )
}

const Html = ({
    textureMap,
    depthMap,
    dotColor,
    effectType: propEffectType,
    intensity: propIntensity,
    showTexture: deprecatedShowTexture,
    backgroundMode: propBackgroundMode,
    backgroundColor: propBackgroundColor,
    gradient: propGradient,
    dots: propDots,
    animation: propAnimation,
    hover: propHover,
}: {
    textureMap?: any
    depthMap?: any
    dotColor?: string
    effectType?: "dots" | "gradient"
    intensity?: number
    showTexture?: boolean // deprecated: kept for backwards compatibility
    backgroundMode?: boolean
    backgroundColor?: string
    gradient?: {
        width?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    dots?: {
        size?: number
        tiling?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    animation?: {
        play?: "once" | "loop"
        mode?: "repeat" | "mirror"
        transition?: any
    }
    hover?: {
        enabled?: boolean
        direction?:
            | "topToBottom"
            | "bottomToTop"
            | "leftToRight"
            | "rightToLeft"
            | "centerOutward"
            | "outwardToCenter"
    }
}) => {
    // Debug logs removed for performance

    const { isLoading } = useContext(GlobalContext)
    const isMobile = useIsMobile()

    // Debug logs removed for performance

    // Effect-related props with defaults
    const effectType = propEffectType ?? "gradient"
    const intensity = propIntensity ?? 1.0
    const backgroundMode = propBackgroundMode ?? !!deprecatedShowTexture // true = Image, false = Color
    const showTexture = backgroundMode
    const rawBackgroundColor = propBackgroundColor ?? "#000000"
    const rawDotColor = dotColor ?? "#ffffff"
    const resolvedDotColor = resolveTokenColor(rawDotColor)
    const resolvedBackgroundColor = resolveTokenColor(rawBackgroundColor)

    // Extract nested object props with defaults
    // Normalize user-facing controls to internal ranges
    const dotSize = ((propDots?.size ?? 5) as number) / 50 // 1..100 -> 0.02..2.0 (used in shader mapping)
    const tilingScale =
        Math.max(1, Math.min(100, (propDots?.tiling ?? 18) as number)) * 2 // 1..100 -> 2..200
    const dotsBloomStrength = propDots?.bloomStrength ?? 0.15 // already 0..1 good
    const dotsBloomRadius = ((propDots?.bloomRadius ?? 1) as number) / 1000 // reduce impact by 50 vs previous mapping

    const gradientWidth = propGradient?.width ?? 0.5
    const gradientBloomStrength = propGradient?.bloomStrength ?? 0.15
    const gradientBloomRadius =
        ((propGradient?.bloomRadius ?? 5.3) as number) / 1000 // reduce impact by 50 vs previous mapping

    const playMode = propAnimation?.play ?? "once"
    const loopType = propAnimation?.mode ?? "repeat"
    const loopTransition = propAnimation?.transition ?? {
        type: "tween",
        duration: 3,
        ease: "easeInOut",
    }

    const hoverEnabled = propHover?.enabled ?? !isMobile
    const progressDirection = propHover?.direction ?? "topToBottom"

    // Use appropriate bloom values based on effect type
    const bloomStrength =
        effectType === "dots" ? dotsBloomStrength : gradientBloomStrength
    const bloomRadius =
        effectType === "dots" ? dotsBloomRadius : gradientBloomRadius

    // UI state that remains as state (not exposed as property controls)
    const [isVisible, setIsVisible] = useState(true)

    // Mouse and progress state
    const [progress, setProgress] = useState(
        RenderTarget.current() === RenderTarget.canvas ? 0.5 : 0
    )
    const [isHovering, setIsHovering] = useState(false)
    const [loopProgress, setLoopProgress] = useState(
        RenderTarget.current() === RenderTarget.canvas ? 0.5 : 0
    )
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [transitionStartProgress, setTransitionStartProgress] = useState(0)
    const [transitionStartTime, setTransitionStartTime] = useState(0)
    const [inViewport, setInViewport] = useState(true)
    const [hasActivated, setHasActivated] = useState(
        RenderTarget.current() === RenderTarget.canvas
    )
    const [assetsReady, setAssetsReady] = useState(false)
    const [isFullyReady, setIsFullyReady] = useState(
        RenderTarget.current() === RenderTarget.canvas
    )
    const [threeReady, setThreeReady] = useState(false)
    const [localIsLoading, setLocalIsLoading] = useState(true)

    const containerRef = useRef<HTMLDivElement>(null)
    const animationControlsRef = useRef<any>(null)

    // Resolve asset URLs for preloading and fallback
    const hasTextureMapProp = !!(
        textureMap &&
        (textureMap.src || typeof textureMap === "string")
    )
    const hasDepthMapProp = !!(
        depthMap &&
        (depthMap.src || typeof depthMap === "string")
    )
    const textureMapUrl = hasTextureMapProp
        ? (textureMap as any)?.src || (textureMap as any)
        : undefined
    const depthMapUrl = hasDepthMapProp
        ? (depthMap as any)?.src || (depthMap as any)
        : undefined

    // Add direct texture loading and aspect ratio tracking
    const [texturesLoaded, setTexturesLoaded] = useState(false)
    const [aspectRatioReady, setAspectRatioReady] = useState(false)
    const [preloadedAspectRatio, setPreloadedAspectRatio] = useState<
        number | undefined
    >(undefined)
    const [layoutReady, setLayoutReady] = useState(false)
    const [displayReady, setDisplayReady] = useState(
        RenderTarget.current() === RenderTarget.canvas
    )

    useEffect(() => {
        let cancelled = false
        setLocalIsLoading(true)
        setTexturesLoaded(false)
        setAspectRatioReady(false)

        const safeTextureMapUrl = hasTextureMapProp
            ? textureMapUrl
            : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
        const safeDepthMapUrl = hasDepthMapProp
            ? depthMapUrl
            : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2NjY2NiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRlcHRoPC90ZXh0Pjwvc3ZnPg=="

        const loadImage = (url: string) => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = url
            })
        }

        Promise.all([
            loadImage(safeTextureMapUrl!),
            loadImage(safeDepthMapUrl!),
        ])
            .then(([textureImg, depthImg]) => {
                if (cancelled) return

                setTexturesLoaded(true)

                // Determine which image should drive aspect ratio
                const aspectSourceImg = hasTextureMapProp
                    ? textureImg
                    : depthImg
                const width =
                    aspectSourceImg.naturalWidth || aspectSourceImg.width
                const height =
                    aspectSourceImg.naturalHeight || aspectSourceImg.height

                if (width && height) {
                    setPreloadedAspectRatio(width / height)
                    setAspectRatioReady(true)
                    setLocalIsLoading(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLocalIsLoading(false)
                    setTexturesLoaded(true)
                    setAspectRatioReady(true)
                    // Fallback to a safe square ratio if we couldn't measure
                    setPreloadedAspectRatio((prev) => prev ?? 1)
                }
            })

        return () => {
            cancelled = true
        }
    }, [textureMapUrl, depthMapUrl, hasTextureMapProp, hasDepthMapProp])

    // Defer first Canvas mount to the next layout pass to avoid initial incorrect scaling
    useLayoutEffect(() => {
        setLayoutReady(true)
    }, [])

    // After fully ready and layout ready, delay showing the canvas a tick to avoid visible resize
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        if (isFullyReady && layoutReady) {
            const t = setTimeout(() => setDisplayReady(true), 100)
            return () => clearTimeout(t)
        }
        setDisplayReady(RenderTarget.current() === RenderTarget.canvas)
    }, [isFullyReady, layoutReady])

    // Animation function - plays once or loops
    const startLoop = (startFrom = 0, forceProgressUpdate = false) => {
        const scaleTransitionDuration = (transition: any, ratio: number) => {
            if (!transition) return transition
            const r = Math.max(0, Math.min(1, ratio))
            if (
                typeof transition.duration === "number" &&
                transition.duration > 0
            ) {
                return { ...transition, duration: transition.duration * r }
            }
            return transition
        }

        if (
            RenderTarget.current() === RenderTarget.canvas ||
            localIsLoading ||
            !inViewport
        ) {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
                animationControlsRef.current = null
            }
            // Keep progress at zero in canvas mode
            if (RenderTarget.current() === RenderTarget.canvas) {
                setProgress(0.5)
                setLoopProgress(0.5)
            }
            return
        }

        // Stop any existing animation
        if (animationControlsRef.current) {
            animationControlsRef.current.stop()
        }

        if ((propAnimation?.play ?? "once") === "once") {
            const remainingRatio = Math.max(0, 1 - startFrom)
            const adjusted = scaleTransitionDuration(
                loopTransition,
                remainingRatio
            )
            animationControlsRef.current = animate(startFrom, 1, {
                ...adjusted,
                onUpdate: (latest) => {
                    setLoopProgress(latest)
                    // Only set the main progress if not hovering and not transitioning, or if forcing update
                    if (
                        forceProgressUpdate ||
                        (!isHovering && !isTransitioning)
                    ) {
                        setProgress(latest)
                    }
                },
            })
        } else if (
            (propAnimation?.play ?? "once") === "loop" &&
            loopType === "repeat"
        ) {
            const animateForward = (currentValue = startFrom) => {
                const remainingRatio = Math.max(0, 1 - currentValue)
                const adjusted = scaleTransitionDuration(
                    loopTransition,
                    remainingRatio
                )
                animationControlsRef.current = animate(currentValue, 1, {
                    ...adjusted,
                    onUpdate: (latest) => {
                        setLoopProgress(latest)
                        // Only set the main progress if not hovering and not transitioning
                        if (
                            forceProgressUpdate ||
                            (!isHovering && !isTransitioning)
                        ) {
                            setProgress(latest)
                        }
                    },
                    onComplete: () => {
                        if (
                            (propAnimation?.play ?? "once") === "loop" &&
                            loopType === "repeat"
                        ) {
                            // Restart next cycles with the base duration (full length)
                            animationControlsRef.current = animate(0, 1, {
                                ...loopTransition,
                                onUpdate: (latest) => {
                                    setLoopProgress(latest)
                                    if (
                                        forceProgressUpdate ||
                                        (!isHovering && !isTransitioning)
                                    ) {
                                        setProgress(latest)
                                    }
                                },
                                onComplete: () => {
                                    if (
                                        (propAnimation?.play ?? "once") ===
                                            "loop" &&
                                        loopType === "repeat"
                                    ) {
                                        animateForward(0)
                                    }
                                },
                            })
                        }
                    },
                })
            }
            animateForward()
        } else if (
            (propAnimation?.play ?? "once") === "loop" &&
            loopType === "mirror"
        ) {
            let direction = startFrom < 0.5 ? 1 : -1 // Determine direction based on start position
            let currentValue = startFrom

            const animateMirror = () => {
                const target = direction === 1 ? 1 : 0
                const remainingRatio = Math.abs(target - currentValue)
                const adjusted = scaleTransitionDuration(
                    loopTransition,
                    remainingRatio
                )
                animationControlsRef.current = animate(currentValue, target, {
                    ...adjusted,
                    onUpdate: (latest) => {
                        currentValue = latest
                        setLoopProgress(latest)
                        // Only set the main progress if not hovering and not transitioning, or if forcing update
                        if (
                            forceProgressUpdate ||
                            (!isHovering && !isTransitioning)
                        ) {
                            setProgress(latest)
                        }
                    },
                    onComplete: () => {
                        if (
                            (propAnimation?.play ?? "once") === "loop" &&
                            loopType === "mirror"
                        ) {
                            direction *= -1 // Reverse direction
                            // Subsequent legs use the base transition duration
                            const nextTarget = direction === 1 ? 1 : 0
                            animationControlsRef.current = animate(
                                currentValue,
                                nextTarget,
                                {
                                    ...loopTransition,
                                    onUpdate: (latest) => {
                                        currentValue = latest
                                        setLoopProgress(latest)
                                        if (
                                            forceProgressUpdate ||
                                            (!isHovering && !isTransitioning)
                                        ) {
                                            setProgress(latest)
                                        }
                                    },
                                    onComplete: animateMirror,
                                }
                            )
                        }
                    },
                })
            }
            animateMirror()
        }
    }

    // Auto-start animation (skip in canvas to keep static mid-state)
    useEffect(() => {
        if (
            RenderTarget.current() !== RenderTarget.canvas &&
            !isHovering &&
            inViewport &&
            isFullyReady &&
            displayReady
        ) {
            startLoop(0, false)
        }

        return () => {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
                animationControlsRef.current = null
            }
        }
    }, [
        propAnimation?.play,
        loopType,
        loopTransition,
        isFullyReady,
        inViewport,
        displayReady,
    ])

    // Handle hover state changes
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas || !isFullyReady)
            return

        if (isHovering && hoverEnabled && !isMobile) {
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
            }
        }
    }, [isHovering, hoverEnabled, propAnimation?.play, isMobile, isFullyReady])

    // Handle mouse movement to control the scanning effect
    const handleMouseMove = (e: React.MouseEvent) => {
        if (
            !containerRef.current ||
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

        // Get the bounding rectangle of the container
        const rect = containerRef.current.getBoundingClientRect()

        // Calculate progress based on direction
        let relativeProgress: number

        switch (progressDirection) {
            case "topToBottom":
                relativeProgress = (e.clientY - rect.top) / rect.height
                break
            case "bottomToTop":
                relativeProgress = 1 - (e.clientY - rect.top) / rect.height
                break
            case "leftToRight":
                relativeProgress = (e.clientX - rect.left) / rect.width
                break
            case "rightToLeft":
                relativeProgress = 1 - (e.clientX - rect.left) / rect.width
                break
            case "centerOutward":
                const centerX = rect.width / 2
                const centerY = rect.height / 2
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top
                const distance = Math.sqrt(
                    Math.pow(mouseX - centerX, 2) +
                        Math.pow(mouseY - centerY, 2)
                )
                const maxDistance = Math.sqrt(
                    Math.pow(centerX, 2) + Math.pow(centerY, 2)
                )
                relativeProgress = Math.min(distance / maxDistance, 1)
                break
            case "outwardToCenter":
                const centerX2 = rect.width / 2
                const centerY2 = rect.height / 2
                const mouseX2 = e.clientX - rect.left
                const mouseY2 = e.clientY - rect.top
                const distance2 = Math.sqrt(
                    Math.pow(mouseX2 - centerX2, 2) +
                        Math.pow(mouseY2 - centerY2, 2)
                )
                const maxDistance2 = Math.sqrt(
                    Math.pow(centerX2, 2) + Math.pow(centerY2, 2)
                )
                relativeProgress = 1 - Math.min(distance2 / maxDistance2, 1)
                break
            default:
                relativeProgress = (e.clientY - rect.top) / rect.height
        }

        // Clamp the value between 0 and 1
        const clampedProgress = Math.max(0, Math.min(1, relativeProgress))

        // Handle smooth transition during hover
        if (isHovering) {
            if (isTransitioning) {
                // During transition from loop to hover, smoothly interpolate
                const elapsed = (Date.now() - transitionStartTime) / 1000
                const transitionProgress = Math.min(elapsed / 0.3, 1)

                // Apply ease-in-out easing
                const easedProgress =
                    transitionProgress < 0.5
                        ? 2 * transitionProgress * transitionProgress
                        : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2

                // Smooth interpolation from start to current target
                const interpolatedProgress =
                    transitionStartProgress +
                    (clampedProgress - transitionStartProgress) * easedProgress
                setProgress(interpolatedProgress)

                // Check if transition is complete
                if (transitionProgress >= 1) {
                    setIsTransitioning(false)
                }
            } else {
                // After transition or no loop - follow cursor directly
                setProgress(clampedProgress)
            }
        }
    }

    // Handle mouse entering the container
    const handleMouseEnter = () => {
        if (
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return
        setIsHovering(true)

        // When hovering, transition from current progress to cursor control
        if (true) {
            setIsTransitioning(true)
            setTransitionStartProgress(progress)
            setTransitionStartTime(Date.now())
            // Pause the loop animation
            if (animationControlsRef.current) {
                animationControlsRef.current.stop()
            }
        }
    }

    // Handle mouse leaving the container
    const handleMouseLeave = async () => {
        if (
            !hoverEnabled ||
            isMobile ||
            RenderTarget.current() === RenderTarget.canvas
        )
            return

        // Capture the current progress before changing state
        const currentProgress = progress

        setIsHovering(false)
        setIsTransitioning(false)

        // Resume animation to completion from current progress.
        // In Loop mode it continues looping; in Once it completes to 1 and stops.
        startLoop(currentProgress, true)
    }

    // Observe visibility to pause/resume animation and lazy-activate heavy subtree on first view
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                const visible = !!entry?.isIntersecting
                setInViewport(visible)
                if (!visible) {
                    if (animationControlsRef.current) {
                        animationControlsRef.current.stop()
                    }
                } else {
                    if (!hasActivated) {
                        setHasActivated(true)
                    }
                    if (
                        RenderTarget.current() !== RenderTarget.canvas &&
                        !isHovering &&
                        isFullyReady
                    ) {
                        // Resume from current progress
                        startLoop(progress, false)
                    }
                }
            },
            { root: null, threshold: 0.01, rootMargin: "600px 0px" }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [isHovering, isFullyReady, progress, hasActivated])

    // Preload images at low priority so the effect can show instantly on activation
    useEffect(() => {
        let cancelled = false
        const urls = [textureMapUrl, depthMapUrl].filter(Boolean) as string[]
        if (urls.length === 0) return
        const preload = (url: string) =>
            new Promise<void>((resolve) => {
                const img = new Image()
                ;(img as any).fetchPriority = "low"
                img.decoding = "async"
                img.onload = () => resolve()
                img.onerror = () => resolve()
                img.src = url
            })
        Promise.all(urls.map(preload)).then(() => {
            if (!cancelled) setAssetsReady(true)
        })
        return () => {
            cancelled = true
        }
    }, [textureMapUrl, depthMapUrl])

    // Set fully ready only when all conditions are met (avoid circular gating on Scene mount)
    useEffect(() => {
        if (
            hasActivated &&
            !localIsLoading &&
            texturesLoaded &&
            aspectRatioReady
        ) {
            setIsFullyReady(true)
        } else {
            setIsFullyReady(false)
        }
    }, [hasActivated, localIsLoading, texturesLoaded, aspectRatioReady])

    return (
        <div
            style={{
                height: "100%",
                width: "100%",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Intrinsic sizing spacer moved here so it doesn't affect outer layout */}
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
            {!isFullyReady && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            background: resolvedBackgroundColor as string,
                        }}
                    />
                </div>
            )}
            {isFullyReady && layoutReady && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        opacity: displayReady ? 1 : 0,
                    }}
                >
                    <WebGPUCanvas>
                        <PostProcessing></PostProcessing>
                        <Scene
                            active={inViewport}
                            dotSize={dotSize}
                            dotColor={resolvedDotColor || "#ffffff"}
                            tilingScale={tilingScale}
                            effectType={effectType}
                            gradientWidth={gradientWidth / 10}
                            intensity={intensity}
                            bloomStrength={bloomStrength}
                            bloomRadius={bloomRadius}
                            showTexture={showTexture}
                            backgroundColor={
                                resolvedBackgroundColor || "#000000"
                            }
                            progress={progress}
                            textureMap={textureMap}
                            depthMap={depthMap}
                            initialAspectRatio={preloadedAspectRatio}
                            onReady={() => setThreeReady(true)}
                        />
                    </WebGPUCanvas>
                </div>
            )}
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function Home(props: {
    textureMap?: any
    depthMap?: any
    dotColor?: string
    effectType?: "dots" | "gradient"
    intensity?: number
    showTexture?: boolean // deprecated: kept for backwards compatibility
    backgroundMode?: boolean
    backgroundColor?: string
    gradient?: {
        width?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    dots?: {
        size?: number
        tiling?: number
        bloomStrength?: number
        bloomRadius?: number
    }
    animation?: {
        play?: "once" | "loop"
        mode?: "repeat" | "mirror"
        transition?: any // Full Framer Motion transition object
    }
    hover?: {
        enabled?: boolean
        direction?:
            | "topToBottom"
            | "bottomToTop"
            | "leftToRight"
            | "rightToLeft"
            | "centerOutward"
            | "outwardToCenter"
    }
}) {
    // Check if both images are missing
    const hasTextureMap =
        props.textureMap &&
        (props.textureMap.src || typeof props.textureMap === "string")
    const hasDepthMap =
        props.depthMap &&
        (props.depthMap.src || typeof props.depthMap === "string")

    // Show ComponentMessage if both images are missing
    if (!hasTextureMap && !hasDepthMap) {
        return (
            <div
                style={{ height: "100%", width: "100%", position: "relative" }}
            >
                {/* Invisible sizing element - provides intrinsic dimensions for Fit sizing (prevents 40px/0px collapse) */}
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
                    {/* Intrinsic sizing spacer moved here so it doesn't affect outer layout */}
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
                    <ComponentMessage
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            minWidth: 0,
                            minHeight: 0,
                        }}
                        title="3D Scan Effect"
                        description="Add an Image and Depth map to create stunning 3D scanning effects"
                    />
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <ContextProvider>
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Html
                        textureMap={props.textureMap}
                        depthMap={props.depthMap}
                        dotColor={props.dotColor}
                        effectType={props.effectType}
                        intensity={props.intensity}
                        showTexture={props.showTexture}
                        backgroundMode={props.backgroundMode}
                        backgroundColor={props.backgroundColor}
                        gradient={props.gradient}
                        dots={props.dots}
                        animation={props.animation}
                        hover={props.hover}
                    ></Html>
                </div>
            </ContextProvider>
        </div>
    )
}

Home.displayName = "Image Scan DEV"
