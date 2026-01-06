import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    Points,
    BufferGeometry,
    Float32BufferAttribute,
    PointsMaterial,
    SphereGeometry,
    MeshBasicMaterial,
    InstancedMesh,
    Matrix4,
    Group,
    Raycaster,
    Vector2,
    AdditiveBlending,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

interface ParticleSphereRefactorProps {
    preview: boolean
    particlesCount: number
    speed: number
    smoothing: number
    scale: number
    stopOnHover: boolean
    rotationDirection?: "clockwise" | "anticlockwise"
    dragSpeed?: number
    drag?: boolean
    particles: {
        scale: number
        shape: "sphere" | "cube"
    }
    sphereColor: string
    style?: React.CSSProperties
}

// Value mapping functions
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

// Speed: UI [0.1..1] → internal [0.01..0.05] (rotation speed multiplier)
function mapSpeedUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.01, 0.05)
}

// Scale: UI [0..1] → scale multiplier [0.5..3.0] (overall sphere size multiplier)
function mapScaleUiToMultiplier(ui: number): number {
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0, 1.0, 0.5, 3.0)
}

// Particle Size: UI [0.1..1] → size [0.01..0.1] (individual particle size)
function mapParticleSizeUiToInternal(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 0.01, 0.1)
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function ParticleSphereRefactor({
    preview = false,
    particlesCount = 1000,
    speed = 0.5,
    smoothing = 1,
    scale = 0.5,
    stopOnHover = true,
    rotationDirection = "clockwise",
    dragSpeed = 0.5,
    drag = true,
    particles: particlesConfig = { scale: 0.5, shape: "sphere" },
    sphereColor = "#ffffff",
    style,
}: ParticleSphereRefactorProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const particlesRef = useRef<any>(null)
    const particlesGroupRef = useRef<any>(null)
    const animationFrameRef = useRef<number | null>(null)
    const animateFnRef = useRef<(() => void) | null>(null)
    const startAnimationRef = useRef<(() => void) | null>(null)
    const lastResizeRef = useRef({ ts: 0, zoom: 0, w: 0, h: 0, aspect: 0 })

    // Check canvas mode ONCE at component mount and cache it
    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current

    // Ref for preview - only matters in canvas mode
    const previewRef = useRef(preview)

    // Update previewRef ONLY when in canvas mode
    const previewForRefUpdate = isCanvas ? preview : false
    useEffect(() => {
        if (isCanvas) {
            previewRef.current = preview
        }
    }, [previewForRefUpdate, isCanvas])

    // Map UI speed to internal speed
    const rotationSpeed = React.useMemo(() => {
        const baseSpeed = mapSpeedUiToInternal(speed)
        return rotationDirection === "anticlockwise" ? -baseSpeed : baseSpeed
    }, [speed, rotationDirection])

    // Map UI scale to internal scale multiplier (overall sphere size)
    const scaleMultiplier = React.useMemo(
        () => mapScaleUiToMultiplier(scale),
        [scale]
    )

    // Map UI particle size to internal particle size
    const particleSize = React.useMemo(
        () => mapParticleSizeUiToInternal(particlesConfig.scale),
        [particlesConfig.scale]
    )

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const containerWidth =
            container.clientWidth || container.offsetWidth || 400
        const containerHeight =
            container.clientHeight || container.offsetHeight || 400

        // Scene setup
        const scene = new Scene()
        sceneRef.current = scene

        const camera = new PerspectiveCamera(
            50,
            containerWidth / containerHeight,
            0.1,
            1000
        )
        // Base camera distance - keep it relatively fixed so sphere appears bigger when scaled
        // The sphere radius is 1.0 * scaleMultiplier, so we need camera at least at that distance + margin
        const baseCameraDistance = 3.0
        const currentSphereRadius = 1.0 * scaleMultiplier
        // Ensure camera is always outside the sphere with a safe margin
        const cameraDistance = Math.max(baseCameraDistance, currentSphereRadius + 1.0)
        camera.position.z = cameraDistance
        cameraRef.current = camera

        // Renderer setup
        const renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(containerWidth, containerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.outputColorSpace = "srgb"
        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        container.appendChild(canvas)
        rendererRef.current = renderer

        // Parse color
        const colorObj = new Color(sphereColor)

        // Create particles evenly distributed on sphere surface
        const vertices = []

        // Fibonacci sphere distribution for even spacing on sphere surface
        // This creates evenly distributed points on a unit sphere
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // Golden angle in radians
        const baseSphereRadius = 1.0 // Base radius of the particle sphere
        const sphereRadius = baseSphereRadius * scaleMultiplier // Scale the sphere

        for (let i = 0; i < particlesCount; i++) {
            // Use golden angle spiral for even distribution
            const y = 1 - (i / (particlesCount - 1)) * 2 // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y) // Radius at y
            const theta = goldenAngle * i // Golden angle increment
            
            const x = Math.cos(theta) * radius
            const z = Math.sin(theta) * radius
            
            // Scale to sphere surface with scale multiplier
            vertices.push(x * sphereRadius, y * sphereRadius, z * sphereRadius)
        }

        // Create particles based on shape
        const particleShape = particlesConfig.shape || "sphere"
        let particles: any
        
        if (particleShape === "sphere") {
            // Round particles using actual sphere geometries with InstancedMesh
            // Convert screen-space particle size to world-space radius to match visual size
            // PointsMaterial size is in screen pixels, SphereGeometry radius is in world units
            // We need to scale down to match the visual appearance of Points
            // The conversion: sphere radius should be proportional to point size
            // Using a factor that makes spheres visually match cube particles
            const sphereRadius = particleSize * 0.15 // Adjust this factor to match visual size
            const sphereGeometry = new SphereGeometry(sphereRadius, 8, 8)
            const sphereMaterial = new MeshBasicMaterial({
                color: colorObj,
                blending: AdditiveBlending,
                transparent: true,
            })
            
            particles = new InstancedMesh(sphereGeometry, sphereMaterial, particlesCount)
            
            // Set positions for each instance
            const matrix = new Matrix4()
            for (let i = 0; i < particlesCount; i++) {
                const idx = i * 3
                matrix.setPosition(vertices[idx], vertices[idx + 1], vertices[idx + 2])
                particles.setMatrixAt(i, matrix)
            }
            particles.instanceMatrix.needsUpdate = true
        } else {
            // Square particles using Points
            const particlesGeometry = new BufferGeometry()
            particlesGeometry.setAttribute(
                "position",
                new Float32BufferAttribute(vertices, 3)
            )
            
            const particlesMaterial = new PointsMaterial({
                size: particleSize,
                color: colorObj,
                blending: AdditiveBlending,
                depthTest: false,
                transparent: true,
            })
            
            particles = new Points(particlesGeometry, particlesMaterial)
        }
        
        particlesRef.current = particles

        // Create group to hold particles for rotation
        const particlesGroup = new Group()
        particlesGroupRef.current = particlesGroup
        particlesGroup.add(particles)
        scene.add(particlesGroup)

        // Rotation state - initialize
        const rotation = { x: 0, y: 0 }
        const targetRotation = { x: 0, y: 0 }
        const velocity = { x: 0, y: 0 }
        let isDragging = false
        let isHovering = false
        let lastMouseX = 0
        let lastMouseY = 0
        let lastDragTime = 0
        let animationFrameId: number | null = null

        // Delta time tracking for frame-rate independent animation
        let lastFrameTime = performance.now()
        const targetDeltaTime = 1000 / 60 // Reference delta time (60 FPS = 16.67ms)

        // Lerp factor: smoothing 0 = instant (factor=1), smoothing 1 = very smooth (factor=0.03)
        const lerpFactor =
            smoothing === 0 ? 1 : mapLinear(smoothing, 0, 1, 0.4, 0.03)
        // Velocity decay for throw: higher smoothing = more momentum
        const velocityDecay = mapLinear(smoothing, 0, 1, 0.7, 0.96)

        // Animation loop - uses cached isCanvas value for performance
        const animate = () => {
            // CANVAS MODE: Check preview prop to pause animation when preview is off
            if (isCanvas && !previewRef.current) {
                animationFrameId = null
                animationFrameRef.current = null
                return
            }

            // Continue with animation (either not canvas mode, or preview is on)
            animateCore()
        }

        // Core animation logic - uses delta time for frame-rate independent animation
        const animateCore = () => {
            const now = performance.now()

            // Calculate delta time and normalize it relative to 60 FPS
            const deltaTime = now - lastFrameTime
            lastFrameTime = now
            const deltaFactor = deltaTime / targetDeltaTime

            let needsRender = false
            const threshold = 0.01

            // Auto-rotation: add to target when not dragging and not hovering
            if (
                !isDragging &&
                rotationSpeed !== 0 &&
                (!stopOnHover || !isHovering)
            ) {
                targetRotation.x += rotationSpeed * 0.1 * deltaFactor
            }

            // Apply throw velocity when not dragging
            if (!isDragging && smoothing > 0) {
                if (
                    Math.abs(velocity.x) > threshold ||
                    Math.abs(velocity.y) > threshold
                ) {
                    targetRotation.x += velocity.x * deltaFactor
                    targetRotation.y += velocity.y * deltaFactor
                    targetRotation.y = Math.max(
                        -Math.PI / 2,
                        Math.min(Math.PI / 2, targetRotation.y)
                    )
                    const decayFactor = Math.pow(velocityDecay, deltaFactor)
                    velocity.x *= decayFactor
                    velocity.y *= decayFactor
                } else {
                    velocity.x = 0
                    velocity.y = 0
                }
            }

            // Lerp current rotation toward target
            const dx = targetRotation.x - rotation.x
            const dy = targetRotation.y - rotation.y

            if (
                Math.abs(dx) > threshold ||
                Math.abs(dy) > threshold ||
                rotationSpeed !== 0 ||
                isDragging
            ) {
                const timeLerpFactor = 1 - Math.pow(1 - lerpFactor, deltaFactor)
                rotation.x += dx * timeLerpFactor
                rotation.y += dy * timeLerpFactor
                rotation.y = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, rotation.y)
                )
                needsRender = true
            }

            // Render every frame
            if (needsRender || rotationSpeed !== 0 || isDragging) {
                particlesGroup.rotation.y = rotation.x
                particlesGroup.rotation.x = rotation.y

                renderer.render(scene, camera)
            }

            // Continue loop if animation is needed
            const hasVelocity =
                Math.abs(velocity.x) > threshold ||
                Math.abs(velocity.y) > threshold
            const hasLerpDelta =
                Math.abs(dx) > threshold || Math.abs(dy) > threshold
            const needsContinue =
                isDragging || rotationSpeed !== 0 || hasVelocity || hasLerpDelta

            if (needsContinue) {
                animationFrameId = requestAnimationFrame(animate)
                animationFrameRef.current = animationFrameId
            } else {
                animationFrameId = null
                animationFrameRef.current = null
            }
        }

        // Store animate function in ref for preview effect to use
        animateFnRef.current = animate

        // Start animation loop - resets lastFrameTime to prevent delta jump
        const startAnimation = () => {
            if (animationFrameId === null) {
                lastFrameTime = performance.now()
                animationFrameId = requestAnimationFrame(animate)
                animationFrameRef.current = animationFrameId
            }
        }

        // Store startAnimation in ref for preview effect to use
        startAnimationRef.current = startAnimation

        // Initial start if auto-rotation is enabled
        if (rotationSpeed !== 0) {
            startAnimation()
        }

        // Mouse interaction handlers (only if drag is enabled)
        const handleMouseDown = (event: MouseEvent) => {
            if (!drag) return
            isDragging = true
            velocity.x = 0
            velocity.y = 0
            lastMouseX = event.clientX
            lastMouseY = event.clientY
            lastDragTime = performance.now()
            startAnimation()

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const currentTime = performance.now()
                const timeSinceLastMove = currentTime - lastDragTime

                const sensitivity = mapLinear(dragSpeed, 0, 1, 0.001, 0.02)
                const dx = moveEvent.clientX - lastMouseX
                const dy = moveEvent.clientY - lastMouseY

                targetRotation.x += dx * sensitivity
                targetRotation.y += dy * sensitivity
                targetRotation.y = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, targetRotation.y)
                )

                // Track velocity for throw - TIME NORMALIZED
                if (timeSinceLastMove > 0) {
                    const timeNormalization = targetDeltaTime / timeSinceLastMove
                    velocity.x = dx * sensitivity * 0.3 * timeNormalization
                    velocity.y = dy * sensitivity * 0.3 * timeNormalization
                }

                lastMouseX = moveEvent.clientX
                lastMouseY = moveEvent.clientY
                lastDragTime = currentTime
            }

            const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
                isDragging = false
            }

            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
        }

        if (drag) {
            canvas.addEventListener("mousedown", handleMouseDown)
        }

        // Handle hover to stop auto-rotation (only when cursor is over the sphere)
        const handleMouseMoveHover = (event: MouseEvent) => {
            if (!stopOnHover) return

            // Simple check: if mouse is over canvas, consider it hovering
            const rect = canvas.getBoundingClientRect()
            const mouseX = event.clientX - rect.left
            const mouseY = event.clientY - rect.top
            isHovering =
                mouseX >= 0 &&
                mouseX <= rect.width &&
                mouseY >= 0 &&
                mouseY <= rect.height
        }

        if (stopOnHover) {
            canvas.addEventListener("mousemove", handleMouseMoveHover)
        }

        // Resize handler
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current)
                return

            const newWidth =
                containerRef.current.clientWidth ||
                containerRef.current.offsetWidth ||
                400
            const newHeight =
                containerRef.current.clientHeight ||
                containerRef.current.offsetHeight ||
                400

            cameraRef.current.aspect = newWidth / newHeight
            cameraRef.current.updateProjectionMatrix()
            
            // Update camera distance based on scale - ensure it stays outside sphere
            const baseCameraDistance = 3.0
            const currentSphereRadius = 1.0 * scaleMultiplier
            const cameraDistance = Math.max(baseCameraDistance, currentSphereRadius + 1.0)
            cameraRef.current.position.z = cameraDistance
            
            rendererRef.current.setSize(newWidth, newHeight)
            rendererRef.current.render(sceneRef.current!, cameraRef.current)
        }

        // Canvas resize detection using zoom probe
        if (isCanvas && typeof window !== "undefined") {
            const TICK_MS = 250 // throttle to 4Hz
            const EPS_ZOOM = 0.001
            const EPS_SIZE = 0.5
            const EPS_ASPECT = 0.001

            let rafId = 0
            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                if (probe && containerRef.current) {
                    const currentZoom = probe.getBoundingClientRect().width / 20
                    const rect = containerRef.current.getBoundingClientRect()
                    const cw = rect.width
                    const ch = rect.height
                    const aspect = cw / ch

                    const timeOk =
                        !lastResizeRef.current.ts ||
                        (now || performance.now()) -
                            lastResizeRef.current.ts >=
                            TICK_MS
                    const zoomChanged =
                        Math.abs(currentZoom - lastResizeRef.current.zoom) >
                        EPS_ZOOM
                    const sizeChanged =
                        Math.abs(cw - lastResizeRef.current.w) > EPS_SIZE ||
                        Math.abs(ch - lastResizeRef.current.h) > EPS_SIZE
                    const aspectChanged =
                        Math.abs(aspect - lastResizeRef.current.aspect) >
                        EPS_ASPECT

                    if (timeOk && (zoomChanged || sizeChanged || aspectChanged)) {
                        lastResizeRef.current = {
                            ts: now || performance.now(),
                            zoom: currentZoom,
                            w: cw,
                            h: ch,
                            aspect,
                        }
                        handleResize()
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)

            // Cleanup for canvas mode
            return () => {
                cancelAnimationFrame(rafId)
                if (animationFrameId !== null) {
                    cancelAnimationFrame(animationFrameId)
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current)
                }
                if (drag) {
                    canvas.removeEventListener("mousedown", handleMouseDown)
                }
                if (stopOnHover) {
                    canvas.removeEventListener("mousemove", handleMouseMoveHover)
                }
                if (rendererRef.current) {
                    rendererRef.current.dispose()
                    if (containerRef.current && canvas.parentNode) {
                        containerRef.current.removeChild(canvas)
                    }
                }
                if (particlesRef.current) {
                    if (particlesRef.current.geometry) {
                        particlesRef.current.geometry.dispose()
                    }
                    if (particlesRef.current.material) {
                        if (Array.isArray(particlesRef.current.material)) {
                            particlesRef.current.material.forEach((mat: any) => mat.dispose())
                        } else {
                            particlesRef.current.material.dispose()
                        }
                    }
                }
            }
        }

        // Preview/Live: use ResizeObserver
        const resizeObserver = new ResizeObserver(() => handleResize())
        resizeObserver.observe(container)
        window.addEventListener("resize", handleResize)

        // Cleanup for preview/live mode
        return () => {
            resizeObserver.disconnect()
            window.removeEventListener("resize", handleResize)
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (drag) {
                canvas.removeEventListener("mousedown", handleMouseDown)
            }
            if (stopOnHover) {
                canvas.removeEventListener("mousemove", handleMouseMoveHover)
            }
            if (rendererRef.current) {
                rendererRef.current.dispose()
                if (containerRef.current && canvas.parentNode) {
                    containerRef.current.removeChild(canvas)
                }
            }
            if (particlesRef.current) {
                if (particlesRef.current.geometry) {
                    particlesRef.current.geometry.dispose()
                }
                if (particlesRef.current.material) {
                    if (Array.isArray(particlesRef.current.material)) {
                        particlesRef.current.material.forEach((mat: any) => mat.dispose())
                    } else {
                        particlesRef.current.material.dispose()
                    }
                }
            }
        }
    }, [
        particlesCount,
        speed,
        smoothing,
        scale,
        stopOnHover,
        rotationDirection,
        dragSpeed,
        drag,
        particlesConfig,
        sphereColor,
        rotationSpeed,
        scaleMultiplier,
        particleSize,
        isCanvas,
        // Note: preview is intentionally NOT in dependencies
        // Preview only affects behavior in canvas mode via previewRef
    ])

    // Handle preview changes - restart animation loop when preview toggles (CANVAS MODE ONLY)
    const previewForAnimation = isCanvas ? preview : false
    useEffect(() => {
        if (!isCanvas) return

        // Canvas mode only: If preview turned ON and animation is stopped, restart it
        // Use startAnimationRef to properly reset frame time and prevent delta jump
        if (preview && startAnimationRef.current && animationFrameRef.current === null) {
            startAnimationRef.current()
        }
    }, [previewForAnimation, isCanvas])

    // Container styles
    const containerStyle: React.CSSProperties = {
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    return (
        <div style={containerStyle}>
            {/* Zoom probe for canvas mode resize detection */}
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
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
    )
}

// Property Controls
addPropertyControls(ParticleSphereRefactor, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    particlesCount:{
        type: ControlType.Number,
        title: "Particles Count",
        min: 100,
        max: 10000,
        step: 10,
        defaultValue: 1000,
    },
    rotationDirection: {
        type: ControlType.Enum,
        title: "Rotation",
        options: ["anticlockwise", "clockwise"],
        optionIcons: ["direction-left", "direction-right"],
        optionTitles: ["Anticlockwise", "Clockwise"],
        defaultValue: "clockwise",
        displaySegmentedControl: true,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    drag: {
        type: ControlType.Boolean,
        title: "Drag",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 1,
        hidden: (props: ParticleSphereRefactorProps) => !props.drag,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        hidden: (props: ParticleSphereRefactorProps) => !props.drag,
    
    },
    stopOnHover: {
        type: ControlType.Boolean,
        title: "On Hover",
        defaultValue: true,
        enabledTitle: "Stop",
        disabledTitle: "Rotate",
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    particles: {
        title: "Particles",
        type: ControlType.Object,
        controls: {
            shape:{
                type:ControlType.Enum,
                title: "Shape",
                options: ["sphere", "cube"],
                optionTitles: ["Sphere", "Cube"],
                defaultValue: "sphere",
            },
            scale: {
                type: ControlType.Number,
                title: "Size",
                min: 0.1,
                max: 1,
                step: 0.1,
                defaultValue: 0.5,
            },
        },
    },
    sphereColor: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ffffff",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ParticleSphereRefactor.displayName = "Particle Sphere Refactor"

