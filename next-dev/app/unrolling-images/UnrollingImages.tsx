import React, { useEffect, useRef, useState, useCallback } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Three.js imports from CDN
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Texture,
    Vector4,
    DoubleSide,
    LinearFilter,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

// GSAP for animations
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"

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

interface UnrollingImagesProps {
    // Preview control (always first)
    preview: boolean
    // Main content
    image?: ResponsiveImageSource
    // Unroll settings
    angle: number
    rolls: number
    rollRadius: number
    // Animation settings
    animation: {
        triggerMode: "appear" | "scroll"
        startAlign: "top" | "center" | "bottom"
        animationDuration: number
        animationDelay: number
        replay: boolean
    }
    // Style (always last)
    style?: React.CSSProperties
}

// Simple image source resolution
const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || undefined
}

// ============================================================================
// VALUE MAPPING
// ============================================================================

/**
 * Maps roll radius from UI range [0.1..1] to internal range [0.01..0.13]
 */
function mapRollRadiusUiToInternal(ui: number): number {
    // Linear mapping: UI [0.1, 1] -> internal [0.01, 0.13]
    if (ui <= 0.1) return 0.01
    if (ui >= 1.0) return 0.13
    const t = (ui - 0.1) / (1.0 - 0.1) // Normalize to [0, 1]
    return 0.01 + t * (0.13 - 0.01)
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Camera settings
const CAMERA_DISTANCE = 400
const CAMERA_FOV = 70
const CAMERA_NEAR = 100
const CAMERA_FAR = 1000
// Plane geometry segments - higher = smoother deformation
const PLANE_SEGMENTS = 80

// Canvas overscan - render larger to show unrolling edges outside bounds
const CANVAS_SCALE = 1.6 // 60% larger canvas for more visible rolling edges
// Inner scale - image fills container when fully unrolled
const INNER_SCALE = 1.0 // Image matches container size, rolling edges extend beyond

// ============================================================================
// SHADERS
// ============================================================================

// Vertex shader - creates the unrolling/paper roll effect
const vertexShader = `
uniform float time;
uniform float angle;
uniform float progress;
uniform float rolls;
uniform float rollRadius;
uniform vec4 resolution;
varying vec2 vUv;
varying float vFrontShadow;

const float pi = 3.14159265359;

// Rotation matrix around an axis
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
    );
}

// Rotate a vector around an axis by angle
vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

void main() {
    vUv = uv;
    
    float finalAngle = angle;
    vec3 newposition = position;
    
    // Roll radius and count
    float rad = rollRadius;
    float rollCount = rolls;
    
    // Rotate to apply angle
    newposition = rotate(newposition - vec3(-0.5, 0.5, 0.0), vec3(0.0, 0.0, 1.0), -finalAngle) + vec3(-0.5, 0.5, 0.0);
    
    // Calculate offset based on position
    float offs = (newposition.x + 0.5) / (sin(finalAngle) + cos(finalAngle));
    float tProgress = clamp((progress - offs * 0.99) / 0.01, 0.0, 1.0);
    
    // Shadows for depth
    vFrontShadow = clamp((progress - offs * 0.95) / 0.05, 0.7, 1.0);
    
    // Create the roll shape
    newposition.z = rad + rad * (1.0 - offs / 2.0) * sin(-offs * rollCount * pi - 0.5 * pi);
    newposition.x = -0.5 + rad * (1.0 - offs / 2.0) * cos(-offs * rollCount * pi + 0.5 * pi);
    
    // Rotate back
    newposition = rotate(newposition - vec3(-0.5, 0.5, 0.0), vec3(0.0, 0.0, 1.0), finalAngle) + vec3(-0.5, 0.5, 0.0);
    
    // Unroll animation
    newposition = rotate(newposition - vec3(-0.5, 0.5, rad), vec3(sin(finalAngle), cos(finalAngle), 0.0), -pi * progress * rollCount);
    newposition += vec3(
        -0.5 + progress * cos(finalAngle) * (sin(finalAngle) + cos(finalAngle)), 
        0.5 - progress * sin(finalAngle) * (sin(finalAngle) + cos(finalAngle)),
        rad * (1.0 - progress / 2.0)
    );
    
    // Mix between rolled and unrolled based on progress
    vec3 finalposition = mix(newposition, position, tProgress);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalposition, 1.0);
}
`

// Fragment shader - applies texture with shadow and cover behavior
const fragmentShader = `
uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;

varying vec2 vUv;
varying float vFrontShadow;

// Get image UV with object-fit: cover behavior
vec2 get_img_uv() {
    // Start from mesh UV and center
    vec2 uv = vUv - 0.5;
    
    // Apply object-fit: cover mapping
    // resolution.z = a1, resolution.w = a2 (aspect corrections for cover)
    uv *= resolution.zw;
    
    return uv + 0.5;
}

void main() {
    vec2 img_uv = get_img_uv();
    
    vec4 color = texture2D(texture1, img_uv);
    
    // Apply shadow for 3D depth effect
    color.rgb *= vFrontShadow;
    
    // Alpha controlled by progress - no frame masking so unrolling edges are visible
    color.a = clamp(progress * 5.0, 0.0, 1.0);
    
    gl_FragColor = color;
}
`

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates the camera FOV to properly frame the content
 */
function calculateCameraFov(width: number, height: number, distance: number): number {
    const aspect = width / height
    return 2 * Math.atan(width / aspect / (2 * distance)) * (180 / Math.PI)
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

export default function UnrollingImages({
    preview = false,
    image,
    angle = 17,
    rolls = 8,
    rollRadius = 0.5,
    animation = {
        triggerMode: "appear",
        startAlign: "top",
        animationDuration: 1.7,
        animationDelay: 0,
        replay: true,
    },
    style,
}: UnrollingImagesProps) {
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
    const lastSizeRef = useRef({ width: 0, height: 0, zoom: 0, aspect: 0, ts: 0 })
    const animationFrameRef = useRef<number | null>(null)
    const triggerModeRef = useRef(triggerMode)

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

    // Reset state on mount
    useEffect(() => {
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
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // Overscan dimensions for rendering
        const canvasWidth = width * CANVAS_SCALE
        const canvasHeight = height * CANVAS_SCALE

        // Create scene
        const scene = new Scene()
        sceneRef.current = scene

        // Create camera with dynamic FOV based on overscan canvas
        const camera = new PerspectiveCamera(
            calculateCameraFov(canvasWidth, canvasHeight, CAMERA_DISTANCE),
            canvasWidth / canvasHeight,
            CAMERA_NEAR,
            CAMERA_FAR
        )
        camera.position.set(0, 0, CAMERA_DISTANCE)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Create renderer with transparency and overscan
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        // Device-pixel backing store for crisp rendering
        renderer.setSize(Math.round(canvasWidth * dpr), Math.round(canvasHeight * dpr), false)
        renderer.setPixelRatio(1) // We handle DPR manually
        renderer.sortObjects = false
        rendererRef.current = renderer

        // Set CSS size for the canvas (layout)
        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`

        // Create plane geometry
        const geometry = new PlaneGeometry(1, 1, PLANE_SEGMENTS, PLANE_SEGMENTS)

        // Inner dimensions - image is smaller than container to leave space for edges
        const innerWidth = width * INNER_SCALE
        const innerHeight = height * INNER_SCALE

        // Create shader material
        // Convert angle from degrees to radians for shader
        const angleRadians = (angle * Math.PI) / 180
        // Map roll radius from UI range to internal range
        const internalRollRadius = mapRollRadiusUiToInternal(rollRadius)
        const material = new ShaderMaterial({
            side: DoubleSide,
            uniforms: {
                time: { value: 0 },
                progress: { value: 0 },
                angle: { value: angleRadians },
                rolls: { value: rolls },
                rollRadius: { value: internalRollRadius },
                texture1: { value: null },
                resolution: { value: new Vector4(innerWidth, innerHeight, 1, 1) },
            },
            transparent: true,
            vertexShader,
            fragmentShader,
        })

        // Create mesh and scale to inner size (smaller than container)
        const mesh = new Mesh(geometry, material)
        mesh.scale.set(innerWidth, innerHeight, innerWidth / 2)
        // Position mesh at center of canvas (0, 0, 0 is already center)
        mesh.position.set(0, 0, 0)
        meshRef.current = mesh
        scene.add(mesh)

        return { scene, camera, renderer, mesh }
    }, [angle, rolls, rollRadius])

    // ========================================================================
    // TEXTURE LOADING
    // ========================================================================

    /**
     * Loads the image as a Three.js texture
     */
    const loadTexture = useCallback(() => {
        if (!resolvedImageUrl || !meshRef.current) {
            setTextureLoaded(false)
            return
        }

        setTextureLoaded(false)

        // Load image manually
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
                if (!meshRef.current?.material) return

            const texture = new Texture(img)
            texture.needsUpdate = true
            texture.minFilter = LinearFilter

                const material = meshRef.current.material
            const container = containerRef.current
            if (!container) return

            // Container dimensions
            const width = container.clientWidth || 1
            const height = container.clientHeight || 1
            // Inner dimensions - image is smaller than container to leave space for edges
            const innerWidth = width * INNER_SCALE
            const innerHeight = height * INNER_SCALE
            const innerAspect = innerWidth / innerHeight
            const imageAspect = img.width / img.height

            // Calculate aspect ratio for "cover" behavior (like CSS object-fit: cover)
            let a1, a2
            if (innerAspect > imageAspect) {
                // Inner area is wider than image: scale to fill width, crop top/bottom
                a1 = 1
                a2 = imageAspect / innerAspect
            } else {
                // Inner area is taller than image: scale to fill height, crop left/right
                a1 = innerAspect / imageAspect
                a2 = 1
            }

            material.uniforms.resolution.value.set(innerWidth, innerHeight, a1, a2)
            material.uniforms.texture1.value = texture
                setTextureLoaded(true)

            // Render immediately
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current)
                }
        }
        img.onerror = () => {
            console.error("Texture loading error")
                setTextureLoaded(false)
            }
        img.src = resolvedImageUrl
    }, [resolvedImageUrl])

    // ========================================================================
    // RESIZE HANDLING
    // ========================================================================

    /**
     * Updates renderer, camera, and mesh when container size changes
     */
    const updateSize = useCallback((width: number, height: number) => {
        if (!cameraRef.current || !rendererRef.current || !meshRef.current || !canvasRef.current) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const canvasWidth = width * CANVAS_SCALE
        const canvasHeight = height * CANVAS_SCALE

        // Inner dimensions - image is smaller than container
        const innerWidth = width * INNER_SCALE
        const innerHeight = height * INNER_SCALE

        // Update camera for overscan canvas
        cameraRef.current.aspect = canvasWidth / canvasHeight
        cameraRef.current.fov = calculateCameraFov(canvasWidth, canvasHeight, CAMERA_DISTANCE)
        cameraRef.current.updateProjectionMatrix()

        // Update renderer with device pixel ratio
        rendererRef.current.setSize(Math.round(canvasWidth * dpr), Math.round(canvasHeight * dpr), false)

        // Update canvas CSS size
        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`

        // Update mesh scale to inner size (matches container since INNER_SCALE = 1.0)
        meshRef.current.scale.set(innerWidth, innerHeight, innerWidth / 2)

        // Update shader uniforms with inner dimensions
        const material = meshRef.current.material
        if (material?.uniforms?.resolution) {
            const texture = material.uniforms.texture1?.value
            if (texture?.image) {
                // Texture is loaded - calculate cover aspect ratio
                const innerAspect = innerWidth / innerHeight
                const imageAspect = texture.image.width / texture.image.height
                let a1, a2
                // Calculate cover scaling (like CSS object-fit: cover)
                if (innerAspect > imageAspect) {
                    // Inner area is wider than image
                    a1 = 1
                    a2 = imageAspect / innerAspect
                } else {
                    // Inner area is taller than image
                    a1 = innerAspect / imageAspect
                    a2 = 1
                }
                material.uniforms.resolution.value.set(innerWidth, innerHeight, a1, a2)
            } else {
                // Texture not loaded yet - just update dimensions with default aspect
                material.uniforms.resolution.value.set(innerWidth, innerHeight, 1, 1)
            }
        }
    }, [])

    const isAnimatingRef = useRef(false)

    const renderFrame = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return
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

        setHasTriggered(false)
        setTextureLoaded(false)

        // In canvas mode, show full image; otherwise start hidden
        if (meshRef.current?.material) {
            meshRef.current.material.uniforms.progress.value = isCanvas ? 1.0 : 0.0
        }
    }, [hasContent, resolvedImageUrl, isCanvas])

    // Initialize Three.js scene
    useEffect(() => {
        if (!hasContent) {
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

        setupScene()
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            renderFrame()
        }
        
        const textureTimeout = setTimeout(() => {
            loadTexture()
        }, 0)

        if (isCanvas && meshRef.current?.material) {
            meshRef.current.material.uniforms.progress.value = 1.0
        }

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
    }, [hasContent, isCanvas, setupScene, loadTexture, stopRenderLoop, renderFrame])

    // Continuous size monitoring - optimized for Framer canvas
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleResize = () => {
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const last = lastSizeRef.current
            const sizeChanged =
                Math.abs(width - last.width) > 1 || Math.abs(height - last.height) > 1
            if (sizeChanged) {
                last.width = width
                last.height = height
                updateSize(width, height)
                renderFrame()
            }
        }

        // Initial resize
        handleResize()

        // Use requestAnimationFrame-based monitoring for canvas mode (like interactive-thermal3.tsx)
        const resizeCleanup = isCanvas
            ? (() => {
                  let rafId = 0
                  const TICK_MS = 250
                  const EPS_ASPECT = 0.001
                  const tick = (now?: number) => {
                      if (!container) return
                      const probe = zoomProbeRef.current
                      if (!probe) {
                          rafId = requestAnimationFrame(tick)
                          return
                      }

                      const cw = container.clientWidth || container.offsetWidth || 1
                      const ch = container.clientHeight || container.offsetHeight || 1
                      const aspect = cw / ch
                      const zoom = probe.getBoundingClientRect().width / 20

                      const timeOk =
                          !lastSizeRef.current.ts ||
                          (now || performance.now()) - lastSizeRef.current.ts >= TICK_MS
                      const aspectChanged =
                          Math.abs(aspect - lastSizeRef.current.aspect) > EPS_ASPECT
                      const sizeChanged =
                          Math.abs(cw - lastSizeRef.current.width) > 1 ||
                          Math.abs(ch - lastSizeRef.current.height) > 1

                      if (timeOk && (aspectChanged || sizeChanged)) {
                          lastSizeRef.current = {
                              width: cw,
                              height: ch,
                              aspect,
                              zoom,
                              ts: now || performance.now(),
                          }
                          updateSize(cw, ch)
                          renderFrame()
                      }

                      rafId = requestAnimationFrame(tick)
                  }
                  rafId = requestAnimationFrame(tick)
                  return () => cancelAnimationFrame(rafId)
              })()
            : (() => {
                  // For preview/published mode, use ResizeObserver + window resize
                  const resizeObserver = new ResizeObserver(handleResize)
                  resizeObserver.observe(container)
                  window.addEventListener("resize", handleResize)
                  return () => {
                      resizeObserver.disconnect()
                      window.removeEventListener("resize", handleResize)
                  }
              })()

        return resizeCleanup
    }, [updateSize, renderFrame, isCanvas])

    // Update angle, rolls, and rollRadius when props change
    useEffect(() => {
        if (!meshRef.current?.material) return
        // Convert angle from degrees to radians for shader
        const angleRadians = (angle * Math.PI) / 180
        // Map roll radius from UI range to internal range
        const internalRollRadius = mapRollRadiusUiToInternal(rollRadius)
        meshRef.current.material.uniforms.angle.value = angleRadians
        meshRef.current.material.uniforms.rolls.value = rolls
        meshRef.current.material.uniforms.rollRadius.value = internalRollRadius
        renderFrame()
    }, [angle, rolls, rollRadius, renderFrame])

    // Scroll trigger detection
    useEffect(() => {
        if (triggerMode !== "scroll" || isCanvas) return

        let rafId: number | null = null

        const checkAlignment = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight || 0
            const viewportBottom = viewportHeight

            let elementPoint: number
            if (startAlign === "top") {
                elementPoint = rect.top
            } else if (startAlign === "center") {
                elementPoint = rect.top + rect.height / 2
            } else {
                elementPoint = rect.bottom
            }

            const isAligned = elementPoint <= viewportBottom && rect.bottom >= 0
            setIsInView(isAligned)
            
            const completelyOutOfView = rect.top > viewportHeight
            setIsOutOfView(completelyOutOfView)
        }

        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(checkAlignment)
        }

        checkAlignment()
        window.addEventListener("scroll", handleScroll, { passive: true })
        window.addEventListener("resize", checkAlignment)

        return () => {
            if (rafId) cancelAnimationFrame(rafId)
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", checkAlignment)
        }
    }, [triggerMode, startAlign, isCanvas])

    // Handle trigger for appear mode
    useEffect(() => {
        if (!hasContent || isCanvas || !textureLoaded) return

        if (triggerMode === "appear" && !hasTriggered) {
            const triggerTimeout = setTimeout(() => {
                setHasTriggered(true)
            }, 10)
            return () => clearTimeout(triggerTimeout)
        }
    }, [triggerMode, hasTriggered, hasContent, isCanvas, textureLoaded])

    // GSAP animation for appear mode
    useEffect(() => {
        if (
            isCanvas ||
            triggerMode !== "appear" ||
            !hasTriggered ||
            !textureLoaded ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.texture1.value
        )
            return

        const material = meshRef.current.material
        startRenderLoop()
        const tween = gsap.to(material.uniforms.progress, {
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

    // GSAP animation for scroll mode
    useEffect(() => {
        if (
            isCanvas ||
            triggerMode !== "scroll" ||
            !textureLoaded ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.texture1.value
        )
            return

        const material = meshRef.current.material
        const currentProgress = material.uniforms.progress.value

        if (scrollTweenRef.current) {
            scrollTweenRef.current.kill()
            scrollTweenRef.current = null
            stopRenderLoop()
        }

        // Reset when out of view
        if (isOutOfView) {
            if (replay && currentProgress > 0.01) {
                material.uniforms.progress.value = 0.0
                renderFrame()
            }
            return
        }

        // Animate when in view
        if (isInView && currentProgress < 0.99) {
            startRenderLoop()
            scrollTweenRef.current = gsap.to(material.uniforms.progress, {
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
            uniforms.progress.value = 0.0
            startRenderLoop()
            previewTween = gsap.to(uniforms.progress, {
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
            gsap.killTweensOf(uniforms.progress)
            stopRenderLoop()
            uniforms.progress.value = 1.0
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
        animationDelay,
        renderFrame,
        startRenderLoop,
        stopRenderLoop,
        angle,
        rolls,
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
                }}
                title="Unrolling Image"
                subtitle="Add an image to see the unroll effect"
            />
        )
    }

    // Calculate offset for centering the overscan canvas
    const offsetPercent = ((CANVAS_SCALE - 1) / 2) * 100

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible", // Allow overscan to show outside bounds
                display: "block",
                margin: 0,
                padding: 0,
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
            {/* WebGL canvas - positioned with negative offset to center overscan */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: `-${offsetPercent}%`,
                    left: `-${offsetPercent}%`,
                    display: "block",
                    // width and height set dynamically in setupScene/updateSize
                }}
            />
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(UnrollingImages, {
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
    // Unroll settings
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 90,
        step: 1,
        defaultValue: 45,
        unit: "°",
    },
    rolls: {
        type: ControlType.Number,
        title: "Rolls",
        min: 1,
        max: 16,
        step: 1,
        defaultValue: 8,
    },
    rollRadius: {
        type: ControlType.Number,
        title: "Roll Radius",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    animation: {
        type: ControlType.Object,
        title: "Animation",
        description:
        "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
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
                max: 5.0,
                step: 0.1,
                defaultValue: 1.7,
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
    },
})

// ============================================================================
// DISPLAY NAME
// ============================================================================

UnrollingImages.displayName = "Unrolling Image"
