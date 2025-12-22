import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
//@ts-ignore
import {
    OrbitControls,
    Scene,
    Color,
    OrthographicCamera,
    Raycaster,
    Vector2,
    WebGLRenderer,
    ShaderMaterial,
    TextureLoader,
    Vector3,
    PlaneGeometry,
    Mesh,
    MeshBasicMaterial,
    DoubleSide,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-text-rug.js"

// CSS variable token and color parsing (hex/rgba/var())
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
function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}
function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()
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
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

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
        zoom = 1.5,
        rotXDeg = -90,
        rotYDeg = 0,
        rotZDeg = 90,
        displacementRadius = 3,
        displacementHeight = 1,
        backgroundColor = "transparent",
    } = props

    // Resolve background color from Framer tokens and parse to RGBA
    const resolvedBackgroundColor = resolveTokenColor(backgroundColor)
    const backgroundColorRgba = parseColorToRgba(resolvedBackgroundColor)

    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const cameraRef = useRef<typeof OrthographicCamera | null>(null)
    const rendererRef = useRef<typeof WebGLRenderer | null>(null)
    const controlsRef = useRef<typeof OrbitControls | null>(null)
    const mainPlaneRef = useRef<typeof Mesh | null>(null)
    const shadowPlaneRef = useRef<typeof Mesh | null>(null)
    const sceneRef = useRef<typeof Scene | null>(null)
    const lastSizeRef = useRef<{
        width: number
        height: number
        aspectRatio: number
    }>({ width: 0, height: 0, aspectRatio: 0 })
    const zoomProbeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Don't render Three.js scene if no images are provided
        const hasMainTexture = mainTexture?.src
        const hasShadowTexture = shadowTexture?.src
        if (!hasMainTexture || !hasShadowTexture) return

        const container = containerRef.current

        // Get container dimensions using clientWidth/clientHeight like working components
        const w = container.clientWidth || container.offsetWidth || 1
        const h = container.clientHeight || container.offsetHeight || 1

        // Scene setup
        const scene = new Scene()
        // Don't set scene background - let CSS handle it with proper alpha support
        sceneRef.current = scene

        // Orthographic camera - identical setup for canvas and live
        const baseFrustum = 20
        const frustum = baseFrustum / zoom
        const aspect = w / h
        const camera = new OrthographicCamera(
            (frustum * aspect) / -2,
            (frustum * aspect) / 2,
            frustum / 2,
            frustum / -2,
            0.1,
            1000
        )
        // Fixed camera position - use zoom to control scale
        camera.position.set(10, 10, 10)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Renderer with alpha support for transparent backgrounds
        const renderer = new WebGLRenderer({ 
            antialias: true,
            alpha: true,
            premultipliedAlpha: false
        })
        renderer.setSize(w, h, false)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Ensure canvas fills container completely - same in canvas and live
        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        // canvas.style.border = "2px solid green" // Debug border removed

        container.appendChild(canvas)
        rendererRef.current = renderer

        // Texture loader
        const textureLoader = new TextureLoader()

        // Load textures with error handling
        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        // Minimal fix: scale planes to the image aspect ratio to avoid stretching
        const applyAspectFromTexture = (texture: any) => {
            try {
                const img = texture?.image
                if (!img || !img.width || !img.height) return
                const aspect = img.width / img.height
                const scaleX = aspect >= 1 ? aspect : 1
                const scaleY = aspect >= 1 ? 1 : 1 / aspect

                if (mainPlaneRef.current && shadowPlaneRef.current) {
                    mainPlaneRef.current.scale.set(scaleX, scaleY, 1)
                    shadowPlaneRef.current.scale.set(scaleX, scaleY, 1)
                }

                const scene = sceneRef.current
                if (scene) {
                    const hitPlane = scene.children.find(
                        (child: any) => child.name === "hit"
                    )
                    if (hitPlane) hitPlane.scale.set(scaleX, scaleY, 1)
                }
            } catch (_) {
                // ignore
            }
        }

        const mainTex = textureLoader.load(
            mainTexture.src,
            (texture: any) => {
                console.log("Main texture loaded successfully")
                texture.needsUpdate = true
                applyAspectFromTexture(texture)
            },
            undefined,
            (error: any) => {
                console.error("Error loading main texture:", error)
            }
        )

        const shadowTex = textureLoader.load(
            shadowTexture.src,
            (texture: any) => {
                console.log("Shadow texture loaded successfully")
                texture.needsUpdate = true
            },
            undefined,
            (error: any) => {
                console.error("Error loading shadow texture:", error)
            }
        )

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
        shadowPlane.position.set(0, 0, -0.01) // Subtle shadow offset for realistic effect

        scene.add(mainPlane)
        scene.add(shadowPlane)

        // Save refs for UI updates
        mainPlaneRef.current = mainPlane
        shadowPlaneRef.current = shadowPlane

        // If texture already cached/available, apply aspect immediately
        if ((mainTex as any)?.image && (mainTex as any).image.width) {
            applyAspectFromTexture(mainTex)
        }

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
        const hitGeometry = new PlaneGeometry(15, 15)
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

        // Start animation immediately in Canvas mode, or after textures load in live mode
        if (isCanvas) {
            // In Canvas mode, start immediately with fallback textures
            animate()
        } else {
            // In live mode, wait for textures to load
            animate()
        }

        // Handle resize
        const handleResize = () => {
            const width = container.clientWidth
            const height = container.clientHeight
            const aspect = width / height

            camera.left = (frustum * aspect) / -2
            camera.right = (frustum * aspect) / 2
            camera.top = frustum / 2
            camera.bottom = frustum / -2
            camera.updateProjectionMatrix()

            renderer.setSize(width, height, false)
            renderer.setViewport(0, 0, width, height)
        }

        window.addEventListener("resize", handleResize)

        // Framer Canvas often needs extra passes to settle CSS layout
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(handleResize, 50)
        }

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
    }, [mainTexture?.src, shadowTexture?.src])

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
                const hitPlane = scene.children.find(
                    (child: any) => child.name === "hit"
                )
                if (hitPlane) {
                    hitPlane.rotation.x = rx
                    hitPlane.rotation.y = ry
                    hitPlane.rotation.z = rz
                }
            }
        }

        if (renderer && camera) {
            if (orbitEnabled && !controlsRef.current) {
                controlsRef.current = new OrbitControls(
                    camera,
                    renderer.domElement
                )
                controlsRef.current.enableDamping = true
            } else if (!orbitEnabled && controlsRef.current) {
                controlsRef.current.dispose()
                controlsRef.current = null
            }
        }
    }, [zoom, rotXDeg, rotYDeg, rotZDeg, orbitEnabled])

    // Background color is now handled by CSS on the container div
    // No need to update Three.js scene background since we removed it

    // Handle displacement properties changes in real-time
    useEffect(() => {
        const mainPlane = mainPlaneRef.current
        const shadowPlane = shadowPlaneRef.current
        
        if (mainPlane && mainPlane.material && 'uniforms' in mainPlane.material) {
            const shaderMaterial = mainPlane.material as any
            if (shaderMaterial.uniforms) {
                shaderMaterial.uniforms.uRadius.value = displacementRadius
                shaderMaterial.uniforms.uHeight.value = displacementHeight
            }
        }
        
        if (shadowPlane && shadowPlane.material && 'uniforms' in shadowPlane.material) {
            const shadowMaterial = shadowPlane.material as any
            if (shadowMaterial.uniforms) {
                shadowMaterial.uniforms.uRadius.value = displacementRadius
            }
        }
    }, [displacementRadius, displacementHeight])

    // Aspect ratio-aware resize handling - only updates Three.js content when aspect ratio changes
    useEffect(() => {
        const handleResize = () => {
            const renderer = rendererRef.current
            const container = containerRef.current
            if (renderer && container) {
                const w = container.clientWidth || container.offsetWidth || 1
                const h = container.clientHeight || container.offsetHeight || 1
                const aspectRatio = w / h

                // Only update if aspect ratio actually changed (not just zoom)
                const aspectRatioChanged =
                    Math.abs(lastSizeRef.current.aspectRatio - aspectRatio) >
                    0.001

                if (aspectRatioChanged) {
                    lastSizeRef.current = { width: w, height: h, aspectRatio }

                    renderer.setSize(w, h)

                    const camera = cameraRef.current
                    if (camera) {
                        const frustumSize = 20 / zoom
                        camera.left = (frustumSize * aspectRatio) / -2
                        camera.right = (frustumSize * aspectRatio) / 2
                        camera.top = frustumSize / 2
                        camera.bottom = frustumSize / -2
                        camera.updateProjectionMatrix()
                    }
                }
            }
        }

        // Different behavior for canvas (editor) vs preview/live
        if (RenderTarget.current() === RenderTarget.canvas) {
            // In canvas: monitor for aspect ratio changes using probe element
            let rafId = 0
            const last = { ts: 0, zoom: 0, w: 0, h: 0, aspectRatio: 0 }
            const TICK_MS = 250 // throttle to 4Hz
            const EPS_ZOOM = 0.001
            const EPS_ASPECT = 0.001

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                const container = containerRef.current
                if (probe && container) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const w =
                        container.clientWidth || container.offsetWidth || 1
                    const h =
                        container.clientHeight || container.offsetHeight || 1
                    const currentAspectRatio = w / h

                    // Only update if enough time passed and aspect ratio changed (not just zoom)
                    const timeOk =
                        !last.ts ||
                        (now || performance.now()) - last.ts >= TICK_MS
                    const aspectRatioChanged =
                        Math.abs(currentAspectRatio - last.aspectRatio) >
                        EPS_ASPECT
                    const zoomChanged =
                        Math.abs(currentZoom - last.zoom) > EPS_ZOOM

                    if (timeOk && aspectRatioChanged) {
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = w
                        last.h = h
                        last.aspectRatio = currentAspectRatio
                        handleResize()
                    } else if (timeOk && zoomChanged) {
                        // Only zoom changed: keep camera/frustum the same, just sync renderer buffer size
                        last.ts = now || performance.now()
                        last.zoom = currentZoom
                        last.w = w
                        last.h = h
                        const renderer = rendererRef.current
                        if (renderer) {
                            renderer.setSize(w, h, false)
                            renderer.setViewport(0, 0, w, h)
                        }
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(rafId)
        }

        // Preview/Live: only respond to real aspect ratio changes
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
        <div
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: resolvedBackgroundColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    display: "block",
                    margin: 0,
                    padding: 0,
                    background: resolvedBackgroundColor,
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
        title: "Rotate Y",
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
        defaultValue:"ffffff",
        optional: true,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ThreeDRugTextComponent.displayName = "3D Rug Text"
