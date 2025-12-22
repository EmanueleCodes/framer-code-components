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


interface BlobRevealProps {
    image?: any // ResponsiveImage
    triggerMode: "appear" | "scroll"
    animationDuration: number
    style?: React.CSSProperties
}

// Value mapping functions for better UX
function mapDurationUiToInternal(ui: number): number {
    return ui // Duration in seconds, UI value maps directly
}

const DEFAULT_CAMERA_FOV = 35

const calculateCameraDistance = (height: number, fov: number) => {
    const safeHeight = Math.max(height, 1)
    const radians = (fov * Math.PI) / 360
    return (safeHeight / 2) / Math.tan(radians) || 1
}

const configureCameraForSize = (camera: any, width: number, height: number) => {
    const safeWidth = Math.max(width, 1)
    const safeHeight = Math.max(height, 1)
    camera.aspect = safeWidth / safeHeight
    camera.fov = DEFAULT_CAMERA_FOV
    const distance = calculateCameraDistance(safeHeight, camera.fov)
    camera.position.set(0, 0, distance)
    camera.updateProjectionMatrix()
}

// Shader source code embedded as strings
const vertexShader = `
varying vec2 vUv;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;

    gl_Position = clipPosition;

    // varrying
    vUv = uv;
}
`

const fragmentShader = `
varying vec2 vUv;
uniform float uProgress;
uniform vec2 uSize;
uniform vec2 uImageSize;
uniform sampler2D uTexture;
#define PI 3.1415926538


float noise(vec2 point) {
    float frequency = 1.0;
    float angle = atan(point.y,point.x) + uProgress * PI;

    float w0 = (cos(angle * frequency) + 1.0) / 2.0; // normalize [0 - 1]
    float w1 = (sin(2.*angle * frequency) + 1.0) / 2.0; // normalize [0 - 1]
    float w2 = (cos(3.*angle * frequency) + 1.0) / 2.0; // normalize [0 - 1]
    float wave = (w0 + w1 + w2) / 3.0; // normalize [0 - 1]
    return wave;
}

float softMax(float a, float b, float k) {
    return log(exp(k * a) + exp(k * b)) / k;
}

float softMin(float a, float b, float k) {
    return -softMax(-a, -b, k);
}

float circleSDF(vec2 pos, float rad) {
    float a = sin(uProgress * 0.2) * 0.25; // range -0.25 - 0.25
    float amt = 0.5 + a;
    float circle = length(pos);
    circle += noise(pos) * rad * amt;
    return circle;
}

float radialCircles(vec2 p, float o, float count) {
    vec2 offset = vec2(o, o);

    float angle = (2. * PI)/count;
    float s = round(atan(p.y, p.x)/angle);
    float an = angle * s;
    vec2 q = vec2(offset.x * cos(an), offset.y * sin(an));
    vec2 pos = p - q;
    float circle = circleSDF(pos, 15.0);
    return circle;
}

void main() {
    vec4 bg = vec4(vec3(0.0), 0.0);
    
    // Calculate cover UV coordinates (like CSS background-size: cover)
    float planeRatio = uSize.x / uSize.y;
    float imageRatio = uImageSize.x / uImageSize.y;
    vec2 scale = vec2(1.0);
    if (imageRatio > planeRatio) {
        // Image is wider than container: crop left/right
        scale.x = imageRatio / planeRatio;
    } else {
        // Image is taller than container: crop top/bottom
        scale.y = planeRatio / imageRatio;
    }
    vec2 coverUV = (vUv - 0.5) * scale + 0.5;
    
    vec4 texture = texture2D(uTexture, coverUV);
    vec2 coords = vUv * uSize;
    vec2 o1 = vec2(0.5) * uSize;

    float t = pow(uProgress, 2.5); // easing
    float radius = uSize.x / 2.0;
    float rad = t * radius;
    float c1 = circleSDF(coords - o1, rad);

    vec2 p = (vUv - 0.5) * uSize;
    float r1 = radialCircles(p, 0.2 * uSize.x, 3.0);
    float r2 = radialCircles(p, 0.25 * uSize.x, 3.0);
    float r3 = radialCircles(p, 0.45 * uSize.x, 5.0);

    float k = 50.0 / uSize.x;
    float circle = softMin(c1, r1, k);
    circle = softMin(circle, r2, k);
    circle = softMin(circle, r3, k);

    circle = step(circle, rad);
    vec4 color = mix(bg, texture, circle);
    gl_FragColor = color;
}
`

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function BlobReveal({
    image,
    triggerMode = "appear",
    animationDuration = 2.0,
    style,
}: BlobRevealProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
    const zoomProbeRef = useRef<HTMLDivElement | null>(null)
    const lastContainerSizeRef = useRef({ w: 0, h: 0, zoom: 0 })

    const [isInView, setIsInView] = useState(false)
    const [hasTriggered, setHasTriggered] = useState(false)

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hasContent = !!(image && image.src)

    useEffect(() => {
        if (!hasContent) return
        setHasTriggered(false)
        if (meshRef.current?.material) {
            meshRef.current.material.uniforms.uProgress.value = isCanvas ? 1.0 : 0.0
        }
    }, [hasContent, image?.src, isCanvas])

    const updateRendererSize = useCallback((width: number, height: number) => {
        if (!cameraRef.current || !rendererRef.current || !meshRef.current) return

        configureCameraForSize(cameraRef.current, width, height)
        rendererRef.current.setSize(width, height)
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        if (meshRef.current.geometry) {
            meshRef.current.geometry.dispose()
            meshRef.current.geometry = new PlaneGeometry(width, height, 128, 128)
        }

        if (meshRef.current.material instanceof ShaderMaterial) {
            meshRef.current.material.uniforms.uSize.value.set(width, height)
        }
    }, [])

    useEffect(() => {
        if (!hasContent) return
        setHasTriggered(false)
        if (meshRef.current?.material) {
            meshRef.current.material.uniforms.uProgress.value = isCanvas ? 1.0 : 0.0
        }
    }, [hasContent, image?.src, isCanvas])

    // Internal mapped values
    const internalDuration = mapDurationUiToInternal(animationDuration)

    // Setup Three.js scene
    const setupScene = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return

        const canvas = canvasRef.current
        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1

        // Scene
        const scene = new Scene()
        sceneRef.current = scene

        // Camera
        const camera = new PerspectiveCamera(35, width / height, 0.1, 2000)
        configureCameraForSize(camera, width, height)
        cameraRef.current = camera

        // Renderer
        const renderer = new WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        rendererRef.current = renderer

        // Create mesh with shader material
        const geometry = new PlaneGeometry(width, height, 128, 128)
        const material = new ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uProgress: new Uniform(0.0),
                uSize: new Uniform(new Vector2(width, height)),
                uImageSize: new Uniform(new Vector2(1, 1)),
                uTexture: new Uniform(null),
            },
        })

        const mesh = new Mesh(geometry, material)
        meshRef.current = mesh
        scene.add(mesh)

        return { scene, camera, renderer, mesh }
    }, [])

    // Load texture from image
    const loadTexture = useCallback(async () => {
        if (!image?.src || !meshRef.current) return

        const textureLoader = new TextureLoader()
        const texture = await new Promise<any>((resolve) => {
            textureLoader.load(image.src, (loadedTexture: any) => {
                if (loadedTexture.image) {
                    const imgWidth = loadedTexture.image.width || 1
                    const imgHeight = loadedTexture.image.height || 1
                    const imgSize = new Vector2(imgWidth, imgHeight)

                    if (meshRef.current?.material instanceof ShaderMaterial) {
                        meshRef.current.material.uniforms.uImageSize.value.copy(
                            imgSize
                        )
                    }
                }
                resolve(loadedTexture)
            })
        })

        if (meshRef.current.material) {
            meshRef.current.material.uniforms.uTexture.value = texture
        }
    }, [image])

    // Handle resize
    const handleResize = useCallback(() => {
        if (!containerRef.current) return
        const width = containerRef.current.clientWidth || containerRef.current.offsetWidth || 1
        const height = containerRef.current.clientHeight || containerRef.current.offsetHeight || 1
        updateRendererSize(width, height)
    }, [updateRendererSize])

    useEffect(() => {
        let rafId: number
        const tick = () => {
            if (!containerRef.current) {
                rafId = requestAnimationFrame(tick)
                return
            }
            const container = containerRef.current
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const zoom = zoomProbeRef.current?.getBoundingClientRect().width ?? 20
            const last = lastContainerSizeRef.current
            const sizeChanged = Math.abs(width - last.w) > 1 || Math.abs(height - last.h) > 1
            const zoomChanged = Math.abs(zoom - last.zoom) > 0.5
            if (sizeChanged || zoomChanged) {
                lastContainerSizeRef.current = { w: width, h: height, zoom }
                updateRendererSize(width, height)
            }
            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [updateRendererSize])

    // Animation tick
    const tick = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

        rendererRef.current.render(sceneRef.current, cameraRef.current)
        requestAnimationFrame(tick)
    }, [])

    // Intersection observer setup
    const setupIntersectionObserver = useCallback(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true)
                    }
                })
            },
            {
                threshold: 0.1, // Trigger when 10% of the component is visible
            }
        )

        observer.observe(containerRef.current)
        intersectionObserverRef.current = observer

        return () => {
            observer.disconnect()
        }
    }, [])

    // Trigger animation

    // Initialize component
    useEffect(() => {
        if (!hasContent) return

        setupScene()
        loadTexture()
        tick()

        // In canvas mode, set progress to 1.0 immediately to show full image
        if (isCanvas && meshRef.current?.material) {
            meshRef.current.material.uniforms.uProgress.value = 1.0
        }

        // Only setup intersection observer if not in canvas mode
        const cleanupIntersection = !isCanvas ? setupIntersectionObserver() : undefined

        const handleResizeEvent = () => handleResize()
        window.addEventListener('resize', handleResizeEvent)

        return () => {
            cleanupIntersection?.()
            window.removeEventListener('resize', handleResizeEvent)

            // Cleanup Three.js resources
            if (rendererRef.current) {
                rendererRef.current.dispose()
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
            }
        }
    }, [hasContent, isCanvas, setupScene, loadTexture, tick, setupIntersectionObserver, handleResize])

    // Handle trigger conditions and animation (only in preview mode, not canvas)
    useEffect(() => {
        if (!hasContent || isCanvas) return

        if (triggerMode === "appear" && !hasTriggered) {
            // Trigger immediately on mount
            setHasTriggered(true)
        } else if (triggerMode === "scroll" && isInView && !hasTriggered) {
            // Trigger when scrolled into view
            setHasTriggered(true)
        }
    }, [triggerMode, isInView, hasTriggered, hasContent, isCanvas])

    // GSAP animation (only in preview mode, not canvas)
    useGSAP(() => {
        if (isCanvas || !hasTriggered || !meshRef.current?.material) return

        gsap.to(
            meshRef.current.material.uniforms.uProgress,
            {
                duration: internalDuration,
                value: 1.0,
                ease: "power2.out",
            }
        )
    }, [hasTriggered, internalDuration, isCanvas])


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
            }}
        >
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

addPropertyControls(BlobReveal, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    triggerMode: {
        type: ControlType.Enum,
        title: "Trigger Mode",
        options: ["appear", "scroll"],
        optionTitles: ["On Appear", "On Scroll"],
        defaultValue: "appear",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
    },
    animationDuration: {
        type: ControlType.Number,
        title: "Animation Duration",
        min: 0.5,
        max: 5.0,
        step: 0.1,
        defaultValue: 2.0,
        unit: "s",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BlobReveal.displayName = "Blob Image Reveal"
