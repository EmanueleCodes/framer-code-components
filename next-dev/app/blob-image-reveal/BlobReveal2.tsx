import React, { useEffect, useRef, useState, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// External libraries for WebGL and animation - bundled for Framer compatibility
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    TextureLoader,
    Uniform,
    useGSAP,
    gsap,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/blob-reveal.js"

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveImageSource =
    | string
    | {
          src?: string
          srcSet?: string | Array<{ src?: string }>
          url?: string
          default?: string
          asset?: { url?: string }
          alt?: string
      }
    | null
    | undefined

interface BlobReveal2Props {
    // Preview control (always first)
    preview: boolean
    // Main content
    image?: ResponsiveImageSource
    // Animation settings
    blobCount: number
    // Style (always last)
    style?: React.CSSProperties
    borderRadius: number
    animation: {
        triggerMode: "appear" | "scroll"
        startAlign: "top" | "center" | "bottom"
        animationDuration: number
        animationDelay: number
        replay: boolean
    }
}

// Simple image source resolution - just use the src property
const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || undefined
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Camera field of view - controls perspective distortion
const CAMERA_FOV = 35
// Plane geometry segments - higher = smoother deformation
const PLANE_SEGMENTS = 128

// ============================================================================
// SHADERS
// ============================================================================

// Vertex shader - passes UV coordinates to fragment shader
const vertexShader = `
varying vec2 vUv;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;
    gl_Position = clipPosition;
    vUv = uv;
}
`

// Fragment shader - creates the organic blob reveal effect
const fragmentShader = `
varying vec2 vUv;
uniform float uProgress;      // Animation progress [0..1]
uniform vec2 uSize;           // Container size in pixels
uniform vec2 uImageSize;      // Image dimensions for aspect ratio
uniform sampler2D uTexture;   // The image texture
uniform int uBlobCount;
#define PI 3.1415926538
#define TWO_PI 6.28318530718

// Creates wavy noise based on angle - adds organic feel to blob edges
float noise(vec2 point) {
    float frequency = 1.0;
    float angle = atan(point.y, point.x) + uProgress * PI;
    
    // Combine multiple wave frequencies for complex pattern
    float w0 = (cos(angle * frequency) + 1.0) / 2.0;
    float w1 = (sin(2.0 * angle * frequency) + 1.0) / 2.0;
    float w2 = (cos(3.0 * angle * frequency) + 1.0) / 2.0;
    return (w0 + w1 + w2) / 3.0;
}

// Smooth maximum function for organic blending
float softMax(float a, float b, float k) {
    return log(exp(k * a) + exp(k * b)) / k;
}

// Smooth minimum function - blends shapes together smoothly
float softMin(float a, float b, float k) {
    return -softMax(-a, -b, k);
}

// Signed distance field for a circle with noise
float circleSDF(vec2 pos, float rad) {
    float a = sin(uProgress * 0.2) * 0.25;
    float amt = 0.5 + a;
    float circle = length(pos);
    circle += noise(pos) * rad * amt;
    return circle;
}

// Creates circles arranged radially around the center
float radialCircles(vec2 p, float offset, float count) {
    float angle = (2.0 * PI) / count;
    float s = round(atan(p.y, p.x) / angle);
    float an = angle * s;
    vec2 q = vec2(offset * cos(an), offset * sin(an));
    vec2 pos = p - q;
    return circleSDF(pos, 15.0);
}

void main() {
    vec4 bg = vec4(0.0, 0.0, 0.0, 0.0);
    
    // Calculate "cover" UV coordinates (like CSS background-size: cover)
    vec2 coverUV = vUv;
    if (uSize.x > 0.0 && uSize.y > 0.0 && uImageSize.x > 0.0 && uImageSize.y > 0.0) {
        float containerAspect = uSize.x / uSize.y;
        float imageAspect = uImageSize.x / uImageSize.y;
        
        vec2 scale = vec2(1.0);
        if (containerAspect > imageAspect) {
            // Container is wider than image: scale to fill width, crop top/bottom
            scale.y = imageAspect / containerAspect;
        } else {
            // Container is taller than image: scale to fill height, crop left/right
            scale.x = containerAspect / imageAspect;
        }
        
        coverUV = (vUv - 0.5) * scale + 0.5;
    }

    vec4 texture = texture2D(uTexture, coverUV);
    vec2 coords = vUv * uSize;
    vec2 center = vec2(0.5) * uSize;

    // Apply easing to progress for natural animation curve
    float t = pow(uProgress, 2.5);
    // Use diagonal to ensure full coverage - need at least half diagonal to cover rectangle
    // Add extra margin to account for noise distortion
    float maxDim = sqrt(uSize.x * uSize.x + uSize.y * uSize.y);
    float rad = t * maxDim * 1.0;
    
    // Create main center circle (always present)
    float c1 = circleSDF(coords - center, rad);
    float k = 50.0 / max(uSize.x, uSize.y);
    float circle = c1;
    
    // Add extra blobs only if blobCount > 1
    int extraBlobs = uBlobCount - 1;
    for (int i = 0; i < 10; i++) {
        if (i >= extraBlobs) break;
        
        float idx = float(i);
        float total = float(extraBlobs);
        
        // Distribute evenly around the center with pseudo-random offset
        float baseAngle = idx * TWO_PI / max(total, 1.0);
        float jitter = fract(sin(idx * 127.1 + 311.7) * 43758.5453) * 0.5 - 0.25;
        float angle = baseAngle + jitter;
        
        // Position at varying distances from center
        float distRatio = 0.25 + 0.2 * fract(sin(idx * 43.3) * 12345.6);
        vec2 offset = vec2(cos(angle), sin(angle)) * distRatio * min(uSize.x, uSize.y);
        
        // Each extra blob is a simple circle
        float blobDist = length(coords - center - offset);
        float blobNoise = noise(coords - center - offset) * rad * 0.4;
        float blob = blobDist + blobNoise;
        
        circle = softMin(circle, blob, k);
    }

    // Create sharp edge at the blob boundary
    circle = step(circle, rad);
    
    // Mix background (transparent) with texture based on blob mask
    gl_FragColor = mix(bg, texture, circle);
}
`

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates the camera distance needed to fit the plane at the given height
 * Uses trigonometry based on the camera's field of view
 */
function calculateCameraDistance(height: number, fov: number): number {
    const safeHeight = Math.max(height, 1)
    const radians = (fov * Math.PI) / 360
    return safeHeight / 2 / Math.tan(radians) || 1
}

/**
 * Configures camera properties to properly frame the content
 */
function configureCameraForSize(
    camera: any,
    width: number,
    height: number
): void {
    const safeWidth = Math.max(width, 1)
    const safeHeight = Math.max(height, 1)
    camera.aspect = safeWidth / safeHeight
    camera.fov = CAMERA_FOV
    camera.position.set(0, 0, calculateCameraDistance(safeHeight, camera.fov))
    camera.updateProjectionMatrix()
}

// ============================================================================
// FRAMER ANNOTATIONS
// ============================================================================

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function BlobReveal2({
    preview = false,
    image,
    animation = {
        triggerMode: "appear",
        startAlign: "top",
        animationDuration: 2.0,
        animationDelay: 0,
        replay: true,
    },
    blobCount = 3,
    style,
    borderRadius = 0,
}: BlobReveal2Props) {
    // Refs for Three.js objects
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)

    const { triggerMode, startAlign, animationDuration, animationDelay, replay } = animation

    // Refs for resize detection
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastSizeRef = useRef({ width: 0, height: 0, zoom: 0 })
    const animationFrameRef = useRef<number | null>(null)
    const triggerModeRef = useRef(triggerMode)
    const mountKeyRef = useRef(0)

    // State for animation triggering
    const [isInView, setIsInView] = useState(false)
    const [isOutOfView, setIsOutOfView] = useState(false)
    const [hasTriggered, setHasTriggered] = useState(false)
    const [textureLoaded, setTextureLoaded] = useState(false)

    // Detect if we're in Framer canvas (editor) vs preview/published
    const resolvedImageUrl = resolveImageSource(image)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hasContent = !!resolvedImageUrl

    // Keep triggerMode ref in sync
    useEffect(() => {
        triggerModeRef.current = triggerMode
    }, [triggerMode])

    // Reset state on mount (handles Framer preview reloads)
    useEffect(() => {
        mountKeyRef.current += 1
        setHasTriggered(false)
        setTextureLoaded(false)
    }, [])

    // ========================================================================
    // SCENE SETUP
    // ========================================================================

    /**
     * Initializes the Three.js scene, camera, renderer, and mesh
     */
    const setupScene = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return null

        const container = containerRef.current
        // Use clientWidth/clientHeight for reliable sizing (per canvasSizeFix.md)
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1

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

        // Create renderer with transparency
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        rendererRef.current = renderer

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
                uProgress: new Uniform(0.0),
                uSize: new Uniform(new Vector2(width, height)),
                uImageSize: new Uniform(new Vector2(1, 1)),
                uTexture: new Uniform(null),
                uBlobCount: new Uniform(3),
            },
            transparent: true,
        })

        // Create mesh and add to scene
        const mesh = new Mesh(geometry, material)
        meshRef.current = mesh
        scene.add(mesh)

        return { scene, camera, renderer, mesh }
    }, [])

    // ========================================================================
    // TEXTURE LOADING
    // ========================================================================

    /**
     * Loads the image as a Three.js texture and sets up image size uniform
     */
    const loadTexture = useCallback(() => {
        if (!resolvedImageUrl || !meshRef.current) {
            setTextureLoaded(false)
            return
        }

        // Reset texture loaded state when loading new texture
        setTextureLoaded(false)

        const textureLoader = new TextureLoader()
        textureLoader.load(
            resolvedImageUrl,
            (texture: any) => {
                if (!meshRef.current?.material) return

                const material = meshRef.current.material

                // Store image dimensions for aspect ratio calculations in shader
                if (texture.image) {
                    const imgWidth = texture.image.width || 1
                    const imgHeight = texture.image.height || 1
                    material.uniforms.uImageSize.value.set(imgWidth, imgHeight)
                }

                material.uniforms.uTexture.value = texture
                setTextureLoaded(true)

                // Render immediately after texture loads (especially important when preview is off)
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current)
                }
            },
            undefined,
            (error: any) => {
                // Handle texture loading errors
                console.error("Texture loading error:", error)
                setTextureLoaded(false)
            }
        )
    }, [resolvedImageUrl])

    // ========================================================================
    // RESIZE HANDLING
    // ========================================================================

    /**
     * Updates renderer, camera, and mesh geometry when container size changes
     */
    const updateSize = useCallback((width: number, height: number) => {
        if (!cameraRef.current || !rendererRef.current || !meshRef.current)
            return

        // Update camera
        configureCameraForSize(cameraRef.current, width, height)

        // Update renderer
        rendererRef.current.setSize(width, height)
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Update mesh geometry
        if (meshRef.current.geometry) {
            meshRef.current.geometry.dispose()
            meshRef.current.geometry = new PlaneGeometry(
                width,
                height,
                PLANE_SEGMENTS,
                PLANE_SEGMENTS
            )
        }

        // Update shader uniforms
        const material = meshRef.current.material
        if (material?.uniforms?.uSize) {
            material.uniforms.uSize.value.set(width, height)
        }
    }, [])

    const isAnimatingRef = useRef(false)

    const renderFrame = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return
        rendererRef.current.render(sceneRef.current, cameraRef.current)
    }, [])

    const animationLoop = useCallback(() => {
        renderFrame()
        if (isAnimatingRef.current) {
            animationFrameRef.current = requestAnimationFrame(animationLoop)
        } else {
            animationFrameRef.current = null
        }
    }, [renderFrame])

    const startRenderLoop = useCallback(() => {
        isAnimatingRef.current = true
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animationLoop)
        }
    }, [animationLoop])

    const stopRenderLoop = useCallback(() => {
        isAnimatingRef.current = false
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }
    }, [])

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Reset animation when image changes
    useEffect(() => {
        if (!hasContent) {
            setHasTriggered(false)
            setTextureLoaded(false)
            return
        }

        // Reset trigger state when image URL changes
        setHasTriggered(false)
        setTextureLoaded(false)

        // In canvas mode, show full image; otherwise start hidden
        if (meshRef.current?.material) {
            meshRef.current.material.uniforms.uProgress.value = isCanvas
                ? 1.0
                : 0.0
        }
    }, [hasContent, resolvedImageUrl, isCanvas])

    // Initialize Three.js scene
    useEffect(() => {
        if (!hasContent) {
            // Cleanup if no content
            stopRenderLoop()
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            if (meshRef.current) {
                meshRef.current = null
            }
            return
        }

        // Setup scene
        setupScene()
        // Initial render with empty texture
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            renderFrame()
        }
        
        // Load texture after scene is set up
        // Use a small delay to ensure scene is fully initialized
        const textureTimeout = setTimeout(() => {
            loadTexture()
        }, 0)

        // In canvas mode, show full image immediately after texture loads
        if (isCanvas && meshRef.current?.material) {
            meshRef.current.material.uniforms.uProgress.value = 1.0
        }

        // Cleanup on unmount
        return () => {
            clearTimeout(textureTimeout)
            stopRenderLoop()
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }

            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
        }
    }, [hasContent, isCanvas, setupScene, loadTexture, stopRenderLoop])

    // Continuous size monitoring (handles Framer canvas zoom and resize)
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleResize = () => {
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const last = lastSizeRef.current
            const sizeChanged =
                Math.abs(width - last.width) > 1 ||
                Math.abs(height - last.height) > 1
            if (sizeChanged) {
                last.width = width
                last.height = height
                updateSize(width, height)
                renderFrame()
            }
        }

        handleResize()

        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(container)

        const zoomMonitor = setInterval(() => {
            const probeWidth =
                zoomProbeRef.current?.getBoundingClientRect().width ?? 20
            const last = lastSizeRef.current
            if (Math.abs(probeWidth - last.zoom) > 0.5) {
                last.zoom = probeWidth
                handleResize()
            }
        }, 250)

        const cleanup = () => {
            resizeObserver.disconnect()
            clearInterval(zoomMonitor)
        }

        return cleanup
    }, [updateSize])

    useEffect(() => {
        if (!meshRef.current?.material) return
        const material = meshRef.current.material
        const normalizedCount = Math.min(10, Math.max(1, Math.round(blobCount)))
        material.uniforms.uBlobCount.value = normalizedCount
    }, [blobCount])

    // Update scroll alignment state for the on-scroll trigger
    useEffect(() => {
        if (triggerMode !== "scroll" || isCanvas) return

        let rafId: number | null = null

        const checkAlignment = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight || 0
            const viewportBottom = viewportHeight

            // Calculate which part of the element to check based on startAlign
            let elementPoint: number
            if (startAlign === "top") {
                // Top of element touches bottom of viewport
                elementPoint = rect.top
            } else if (startAlign === "center") {
                // Center of element touches bottom of viewport
                elementPoint = rect.top + rect.height / 2
            } else {
                // Bottom of element touches bottom of viewport
                elementPoint = rect.bottom
            }

            // Element is in view when the specified point has crossed the bottom of viewport
            const isAligned = elementPoint <= viewportBottom && rect.bottom >= 0
            setIsInView(isAligned)
            
            // Check if element is completely out of view below the viewport
            const completelyOutOfView = rect.top > viewportHeight
            setIsOutOfView(completelyOutOfView)
        }

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(checkAlignment)
        }

        const handleResize = () => checkAlignment()

        checkAlignment()
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", handleResize)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleResize)
        }
    }, [triggerMode, startAlign, isCanvas])

    // Handle trigger conditions for appear mode only
    useEffect(() => {
        if (!hasContent || isCanvas || !textureLoaded) return

        // In appear mode, trigger immediately when texture loads
        if (triggerMode === "appear" && !hasTriggered) {
            const triggerTimeout = setTimeout(() => {
                setHasTriggered(true)
            }, 10)
            return () => clearTimeout(triggerTimeout)
        }
    }, [triggerMode, hasTriggered, hasContent, isCanvas, textureLoaded])

    // GSAP animation for appear mode
    useGSAP(() => {
        if (
            isCanvas ||
            triggerMode !== "appear" ||
            !hasTriggered ||
            !textureLoaded ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.uTexture.value
        )
            return

        const material = meshRef.current.material
        startRenderLoop()
        const tween = gsap.to(material.uniforms.uProgress, {
            value: 1.0,
            duration: animationDuration,
            ease: "power2.out",
            delay: animationDelay,
            onUpdate: renderFrame,
            onComplete: () => {
                renderFrame()
                stopRenderLoop()
            },
        })

        return () => {
            tween.kill()
            stopRenderLoop()
        }
    }, [
        hasTriggered,
        textureLoaded,
        animationDuration,
        animationDelay,
        triggerMode,
        isCanvas,
        renderFrame,
        startRenderLoop,
        stopRenderLoop,
    ])

    // Ref to track current scroll animation tween
    const scrollTweenRef = useRef<any>(null)

    // GSAP animation for scroll mode - animates based on isInView
    useEffect(() => {
        if (
            isCanvas ||
            triggerMode !== "scroll" ||
            !textureLoaded ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.uTexture.value
        )
            return

        const material = meshRef.current.material
        const currentProgress = material.uniforms.uProgress.value

        // Kill any existing animation first
        if (scrollTweenRef.current) {
            scrollTweenRef.current.kill()
            scrollTweenRef.current = null
            stopRenderLoop()
        }

        // When completely out of view below viewport with replay enabled, instantly reset
        if (isOutOfView) {
            if (replay && currentProgress > 0.01) {
                material.uniforms.uProgress.value = 0.0
                renderFrame()
            }
            return
        }

        // When in view (crossed trigger point), animate to reveal (only if not already at 1.0)
        if (isInView && currentProgress < 0.99) {
            startRenderLoop()
            scrollTweenRef.current = gsap.to(material.uniforms.uProgress, {
                value: 1.0,
                duration: animationDuration,
                ease: "power2.out",
                onUpdate: renderFrame,
                onComplete: () => {
                    renderFrame()
                    stopRenderLoop()
                    scrollTweenRef.current = null
                },
            })
        }

        return () => {
            if (scrollTweenRef.current) {
                scrollTweenRef.current.kill()
                scrollTweenRef.current = null
            }
            stopRenderLoop()
        }
    }, [
        isInView,
        isOutOfView,
        replay,
        textureLoaded,
        animationDuration,
        triggerMode,
        isCanvas,
        renderFrame,
        startRenderLoop,
        stopRenderLoop,
    ])

    // Canvas mode preview toggle
    useEffect(() => {
        if (!isCanvas || !meshRef.current?.material) return
        const material = meshRef.current.material
        const uniforms = material.uniforms

        let previewTween: any = null

        if (preview) {
            uniforms.uProgress.value = 0.0
            startRenderLoop()
            previewTween = gsap.to(uniforms.uProgress, {
                value: 1.0,
                duration: animationDuration,
                ease: "power2.out",
                delay: isCanvas ? 0 : animationDelay,
                onUpdate: renderFrame,
                onComplete: () => {
                    renderFrame()
                    stopRenderLoop()
                },
            })
        } else {
            gsap.killTweensOf(uniforms.uProgress)
            stopRenderLoop()
            uniforms.uProgress.value = 1.0
            renderFrame()
        }

        return () => {
            previewTween?.kill()
            stopRenderLoop()
        }
    }, [
        preview,
        isCanvas,
        animationDuration,
        renderFrame,
        startRenderLoop,
        stopRenderLoop,
        animationDelay,
        animationDuration,
        blobCount,
        image,
    ])

    // ========================================================================
    // RENDER
    // ========================================================================

    // Empty state when no image is provided
    if (!hasContent) {
        return (
            <ComponentMessage
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                    borderRadius: `${borderRadius}px`,
                }}
                title="Blob Image Reveal"
                subtitle="Add an image to see the blob reveal effect"
            />
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
                overflow: "hidden",
                display: "block",
                margin: 0,
                padding: 0,
                borderRadius: `${borderRadius}px`,
            }}
        >
            {/* Zoom probe for detecting Framer canvas zoom level */}
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
            {/* WebGL canvas - uses inset:0 for proper sizing per canvasSizeFix.md */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(BlobReveal2, {
    // Preview control (always first)
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    // Main content
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    
    blobCount: {
        type: ControlType.Number,
        title: "Blob Count",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
    },
    borderRadius:{
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
        unit: "px",
    },
    animation:{
        type: ControlType.Object,
        title: "Animation",
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            // Animation settings
            triggerMode: {
                type: ControlType.Enum,
                title: "Trigger",
                options: ["appear", "scroll"],
                optionTitles: ["Appear", "Layer in View"],
                defaultValue: "appear",
                displaySegmentedControl: true,
                segmentedControlDirection: "vertical",
            },
            startAlign: {
                type: ControlType.Enum,
                title: "Start At",
                options: ["top", "center", "bottom"],
                optionTitles: ["Top", "Center", "Bottom"],
                defaultValue: "top",
                displaySegmentedControl: true,
                segmentedControlDirection: "horizontal",
                hidden: (props) => props.triggerMode !== "scroll",
            },
            animationDuration: {
                type: ControlType.Number,
                title: "Duration",
                min: 0.5,
                max: 10.0,
                step: 0.1,
                defaultValue: 2.0,
                unit: "s",
                
            },
            animationDelay: {
                type: ControlType.Number,
                title: "Delay",
                min: 0,
                max: 5,
                step: 0.1,
                defaultValue: 0,
                unit: "s",
                hidden: (props) => props.triggerMode !== "appear",
            },
            replay: {
                type: ControlType.Boolean,
                title: "Replay",
                defaultValue: true,
                hidden: (props) => props.triggerMode !== "scroll",
            },
        },
    }
    
   
    
})

// ============================================================================
// DISPLAY NAME
// ============================================================================

BlobReveal2.displayName = "Blob Image Reveal"
