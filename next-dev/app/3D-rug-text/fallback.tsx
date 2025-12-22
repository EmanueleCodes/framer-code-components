import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
//@ts-ignore
import {OrbitControls,Scene, Color, OrthographicCamera, Raycaster, Vector2, WebGLRenderer, ShaderMaterial, TextureLoader, Vector3, PlaneGeometry, Mesh, MeshBasicMaterial, DoubleSide} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-text-rug.js"

/**
 * 3D Rug Text Component
 * 
 * Interactive 3D text displacement effect using js and custom shaders.
 * Based on: https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/
 */

type ResponsiveImageProp = {
    src?: string
    srcSet?: string
    alt?: string
    positionX?: string
    positionY?: string
}

type Props = {
    mainTexture?: ResponsiveImageProp
    shadowTexture?: ResponsiveImageProp
    orbitEnabled?: boolean
    zoom?: number
    rotXDeg?: number
    rotYDeg?: number
    rotZDeg?: number
    displacementRadius?: number
    displacementHeight?: number
    backgroundColor?: string
    preview?: boolean
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ThreeDRugTextComponent(props: Props) {
    const {
        mainTexture,
        shadowTexture,
        orbitEnabled = false,
        zoom = 1,
        rotXDeg = 0,
        rotYDeg = 0,
        rotZDeg = 0,
        displacementRadius = 3,
        displacementHeight = 1,
        backgroundColor = "#ffffff",
        preview = true
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const cameraRef = useRef<typeof OrthographicCamera | null>(null)
    const rendererRef = useRef<typeof WebGLRenderer | null>(null)
    const controlsRef = useRef<typeof OrbitControls | null>(null)
    const mainPlaneRef = useRef<typeof Mesh | null>(null)
    const shadowPlaneRef = useRef<typeof Mesh | null>(null)
    const sceneRef = useRef<typeof Scene | null>(null)
    const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })
    const zoomProbeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Scene setup
        const scene = new Scene()
        scene.background = new Color(backgroundColor)
        sceneRef.current = scene

        // Orthographic camera for diagonal view - properly centered
        const frustumSize = 20
        const aspect = container.clientWidth / container.clientHeight
        const camera = new OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        )
        // Fixed camera position - use zoom to control scale
        camera.position.set(10, 10, 10)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Renderer
        const renderer = new WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        
        // Ensure canvas is properly sized and positioned to prevent layout shifts
        const canvas = renderer.domElement
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        canvas.style.position = "absolute"
        canvas.style.top = "0"
        canvas.style.left = "0"
        
        container.appendChild(canvas)
        rendererRef.current = renderer

        // Texture loader
        const textureLoader = new TextureLoader()

        // Load textures with error handling
        const mainTex = mainTexture?.src ? textureLoader.load(
            mainTexture.src,
            (texture: any) => {
                console.log("Main texture loaded successfully")
                texture.needsUpdate = true
            },
            undefined,
            (error: any) => {
                console.error("Error loading main texture:", error)
            }
        ) : null

        const shadowTex = shadowTexture?.src ? textureLoader.load(
            shadowTexture.src,
            (texture: any) => {
                console.log("Shadow texture loaded successfully")
                texture.needsUpdate = true
            },
            undefined,
            (error: any) => {
                console.error("Error loading shadow texture:", error)
            }
        ) : null

        // Main displacement plane shader material
        const shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTexture: { value: mainTex },
                uDisplacement: { value: new Vector3(0, 0, 0) },
                uRadius: { value: displacementRadius },
                uHeight: { value: displacementHeight },
            },
            vertexShader: `
                varying vec2 vUv;
                uniform vec3 uDisplacement;
                uniform float uRadius;
                uniform float uHeight;
                
                // Easing function for smooth displacement
                float easeInOutCubic(float x) {
                    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
                }
                
                // Map function to remap values
                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }
                
                void main() {
                    vUv = uv;
                    vec3 newPosition = position;
                    
                    // Calculate world position
                    vec4 localPosition = vec4(position, 1.0);
                    vec4 worldPosition = modelMatrix * localPosition;
                    
                    // Calculate distance to displacement point
                    float dist = length(uDisplacement - worldPosition.xyz);
                    
                    // Apply displacement within radius
                    if (dist < uRadius) {
                        float distanceMapped = map(dist, 0.0, uRadius, 1.0, 0.0);
                        float val = easeInOutCubic(distanceMapped) * uHeight;
                        newPosition.z += val;
                    }
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uTexture;
                
                void main() {
                    vec4 color = texture2D(uTexture, vUv);
                    gl_FragColor = vec4(color);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
        })

        // Shadow plane shader material
        const shadowMaterial = new ShaderMaterial({
            uniforms: {
                uTexture: { value: shadowTex },
                uDisplacement: { value: new Vector3(0, 0, 0) },
                uRadius: { value: displacementRadius },
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vDist;
                uniform vec3 uDisplacement;
                
                void main() {
                    vUv = uv;
                    
                    vec4 localPosition = vec4(position, 1.0);
                    vec4 worldPosition = modelMatrix * localPosition;
                    vDist = length(uDisplacement - worldPosition.xyz);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vDist;
                uniform sampler2D uTexture;
                uniform float uRadius;
                
                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }
                
                void main() {
                    vec4 color = texture2D(uTexture, vUv);
                    
                    if (vDist < uRadius) {
                        float alpha = map(vDist, uRadius, 0.0, color.a, 0.0);
                        color.a = alpha;
                    }
                    
                    gl_FragColor = vec4(color);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
        })

        // Create planes with higher subdivision for smooth displacement
        const geometry = new PlaneGeometry(15, 15, 100, 100)
        const mainPlane = new Mesh(geometry, shaderMaterial)
        const shadowPlane = new Mesh(geometry, shadowMaterial)
        
        // Ensure planes are centered at origin
        mainPlane.position.set(0, 0, 0)
        shadowPlane.position.set(0, 0, -0.1) // Slightly behind main plane
        
        scene.add(mainPlane)
        scene.add(shadowPlane)

        // Save refs for UI updates
        mainPlaneRef.current = mainPlane
        shadowPlaneRef.current = shadowPlane

        // Apply initial plane rotation from UI (degrees to radians)
        const rx = (rotXDeg * Math.PI) / 180
        const ry = (rotYDeg * Math.PI) / 180
        const rz = (rotZDeg * Math.PI) / 180
        mainPlane.rotation.x = rx
        mainPlane.rotation.y = ry
        mainPlane.rotation.z = rz
        shadowPlane.rotation.x = rx
        shadowPlane.rotation.y = ry
        shadowPlane.rotation.z = rz

        // Invisible hit plane for raycasting - must match the visual plane rotation
        const hitGeometry = new PlaneGeometry(20, 20)
        const hitMaterial = new MeshBasicMaterial({
            visible: false,
        })
        const hitPlane = new Mesh(hitGeometry, hitMaterial)
        hitPlane.name = "hit"
        
        // Ensure hit plane is centered at origin
        hitPlane.position.set(0, 0, 0)
        
        // Apply the same rotation as the visual planes
        hitPlane.rotation.x = rx
        hitPlane.rotation.y = ry
        hitPlane.rotation.z = rz
        
        scene.add(hitPlane)

        // Raycaster setup
        const raycaster = new Raycaster()
        const pointer = new Vector2()

        // Mouse move handler
        const onPointerMove = (event: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycaster.setFromCamera(pointer, camera)
            const intersects = raycaster.intersectObject(hitPlane)

            if (intersects.length > 0) {
                const point = intersects[0].point
                shaderMaterial.uniforms.uDisplacement.value = point
                shadowMaterial.uniforms.uDisplacement.value = point
            }
        }

        container.addEventListener("mousemove", onPointerMove)

        // Animation loop
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate)
            if (controlsRef.current) controlsRef.current.update()
            renderer.render(scene, camera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
            const width = container.clientWidth
            const height = container.clientHeight
            const aspect = width / height

            camera.left = (frustumSize * aspect) / -2
            camera.right = (frustumSize * aspect) / 2
            camera.top = frustumSize / 2
            camera.bottom = frustumSize / -2
            camera.updateProjectionMatrix()

            renderer.setSize(width, height)
        }

        window.addEventListener("resize", handleResize)

        // Cleanup
        return () => {
            container.removeEventListener("mousemove", onPointerMove)
            window.removeEventListener("resize", handleResize)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (controlsRef.current) {
                controlsRef.current.dispose()
                controlsRef.current = null
            }
            container.removeChild(renderer.domElement)
            renderer.dispose()
            rendererRef.current = null
            cameraRef.current = null
            mainPlaneRef.current = null
            shadowPlaneRef.current = null
            sceneRef.current = null
        }
    }, [])

    // Apply UI changes (camera position, plane rotation, orbit controls)
    useEffect(() => {
        const camera = cameraRef.current
        const mainPlane = mainPlaneRef.current
        const shadowPlane = shadowPlaneRef.current
        const renderer = rendererRef.current

        if (camera) {
            // Apply zoom by adjusting the frustum size while maintaining centering
            const frustumSize = 20 / zoom
            const container = containerRef.current
            if (container) {
                const aspect = container.clientWidth / container.clientHeight
                camera.left = (frustumSize * aspect) / -2
                camera.right = (frustumSize * aspect) / 2
                camera.top = frustumSize / 2
                camera.bottom = frustumSize / -2
                camera.updateProjectionMatrix()
            }
        }

        if (mainPlane && shadowPlane) {
            const rx = (rotXDeg * Math.PI) / 180
            const ry = (rotYDeg * Math.PI) / 180
            const rz = (rotZDeg * Math.PI) / 180
            mainPlane.rotation.x = rx
            mainPlane.rotation.y = ry
            mainPlane.rotation.z = rz
            shadowPlane.rotation.x = rx
            shadowPlane.rotation.y = ry
            shadowPlane.rotation.z = rz
            
            // Also update the invisible hit plane to match
            const scene = sceneRef.current
            if (scene) {
                const hitPlane = scene.children.find((child: any) => child.name === "hit")
                if (hitPlane) {
                    hitPlane.rotation.x = rx
                    hitPlane.rotation.y = ry
                    hitPlane.rotation.z = rz
                }
            }
        }

        if (renderer && camera) {
            if (orbitEnabled && !controlsRef.current) {
                controlsRef.current = new OrbitControls(camera, renderer.domElement)
                controlsRef.current.enableDamping = true
            } else if (!orbitEnabled && controlsRef.current) {
                controlsRef.current.dispose()
                controlsRef.current = null
            }
        }
    }, [zoom, rotXDeg, rotYDeg, rotZDeg, orbitEnabled])

    // Zoom-aware resize handling - only updates Three.js content, no component re-render
    useEffect(() => {
        const handleResize = () => {
            const renderer = rendererRef.current
            const container = containerRef.current
            if (renderer && container) {
                const rect = container.getBoundingClientRect()
                const w = Math.max(1, Math.round(rect.width))
                const h = Math.max(1, Math.round(rect.height))

                // Only update if size actually changed
                if (lastSizeRef.current.width !== w || lastSizeRef.current.height !== h) {
                    lastSizeRef.current = { width: w, height: h }
                    
                    renderer.setSize(w, h)
                    
                    const camera = cameraRef.current
                    if (camera) {
                        const frustumSize = 20 / zoom
                        const aspect = w / h
                        camera.left = (frustumSize * aspect) / -2
                        camera.right = (frustumSize * aspect) / 2
                        camera.top = frustumSize / 2
                        camera.bottom = frustumSize / -2
                        camera.updateProjectionMatrix()
                    }
                }
            }
        }

        // Different behavior for canvas (editor) vs preview/live
        if (RenderTarget.current() === RenderTarget.canvas) {
            // In canvas: monitor for zoom changes using probe element
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }
            const TICK_MS = 250 // throttle to 4Hz
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const container = containerRef.current
                if (probe && container) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const rect = container.getBoundingClientRect()

                    // Only update if enough time passed and meaningful changes occurred
                    const timeOk = !last.ts || (now || performance.now()) - last.ts >= TICK_MS
                    const zoomChanged = Math.abs(currentZoom - last.zoom) > EPS_ZOOM
                    const sizeChanged = Math.abs(rect.width - last.w) > EPS_SIZE || Math.abs(rect.height - last.h) > EPS_SIZE

                    if (timeOk && (zoomChanged || sizeChanged)) {
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = rect.width
                        last.h = rect.height
                        handleResize()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        // Preview/Live: only respond to real size changes
        handleResize()
        const ro = new ResizeObserver(() => handleResize())
        if (containerRef.current) ro.observe(containerRef.current)
        window.addEventListener("resize", handleResize)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", handleResize)
        }
    }, [zoom])

    // Check if images are provided
    const hasImages = !!(mainTexture?.src && shadowTexture?.src)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    return (

        <div style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            background: backgroundColor,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: "2px solid red",
        }}>
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: backgroundColor,
                display: "block",
                border: "2px solid blue",
            }}
        >
            {/* Hidden 20x20 probe element to detect editor zoom level in canvas */}
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
            {!hasImages ? (
                isCanvas ? (
                    <ComponentMessage
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            minWidth: 0,
                            minHeight: 0,
                        }}
                        title="3D Rug Text Effect"
                        subtitle="Add main and shadow textures to see the interactive 3D text displacement effect"
                    />
                ) : (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                        }}
                    />
                )
            ) : null}
        </div>
        </div>

    )
}

addPropertyControls(ThreeDRugTextComponent, {
    mainTexture: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    shadowTexture: {
        type: ControlType.ResponsiveImage,
        title: "Shadow",
        description: "Low opacity blurred version of the main Image",
    },
    orbitEnabled: {
        type: ControlType.Boolean,
        title: "Orbit",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    zoom: {
        type: ControlType.Number,
        title: "Zoom",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1.5,
    },
    rotXDeg: {
        type: ControlType.Number,
        title: "Rotate X",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: -90,
        unit: "°",
    },
    rotYDeg: {
        type: ControlType.Number,
        title: "RotateY",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 0,
        unit: "°",
    },
    rotZDeg: {
        type: ControlType.Number,
        title: "Rotate Z",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 90,
        unit: "°",
    },
    displacementRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 3,
    },
    displacementHeight: {
        type: ControlType.Number,
        title: "Bump",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#ffffff",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ThreeDRugTextComponent.displayName = "3D Rug Text"
