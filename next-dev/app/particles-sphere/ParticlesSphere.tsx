// Particle sphere that responds to cursor position with Three.js
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Three.js imports from CDN
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Points,
    BufferGeometry,
    BufferAttribute,
    Float32BufferAttribute,
    ShaderMaterial,
    Vector3,
    Color,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

// Constants for physics and rendering
const PHYSICS = {
    FRICTION: 0.92,
    RETURN_FORCE: 0.02,
    CURSOR_FORCE_MULTIPLIER: 1.5,
    MIN_OPACITY: 0.3,
    OPACITY_RANGE: 0.7,
    TRAIL_MIN_SIZE: 0.3,
    TRAIL_SIZE_RANGE: 0.7,
} as const

const ANIMATION = {
    ROTATION_SPEED_Y: 0.7,
} as const

// Canvas resize detection constants
const RESIZE_TICK_MS = 250
const RESIZE_EPSILON = 0.001

interface ParticleSphereProps {
    preview: boolean
    particleCount: number
    particleSize: number
    particleColor: string
    speed: number
    cursorRadius: number
    clickEffect: "scatter" | "color" | "both"
    clickForce: number
    mouseoverColor: string
    colorDuration: number
    enableTrails: boolean
    trailLength: number
    trailOpacity: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 675
 * @framerIntrinsicHeight 675
 * @framerDisableUnlink
 */
export default function ParticleSphere(props: ParticleSphereProps) {
    const {
        preview = false,
        particleCount = 2000,
        particleSize = 3,
        particleColor = "#757575",
        speed = 1,
        cursorRadius = 150,
        clickEffect = "scatter",
        clickForce = 10,
        mouseoverColor = "#FF5588",
        colorDuration = 1000,
        enableTrails = true,
        trailLength = 10,
        trailOpacity = 0.5,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const pointsRef = useRef<any>(null)
    const geometryRef = useRef<any>(null)
    const materialRef = useRef<any>(null)
    const mouseRef = useRef({ x: 0, y: 0 })
    const trailIndexRef = useRef(0)
    const particlesRef = useRef<
        Array<{
            x: number
            y: number
            z: number
            vx: number
            vy: number
            vz: number
            baseX: number
            baseY: number
            baseZ: number
            color: any
            colorTimer: number
            trail: Array<{
                x: number
                y: number
                z: number
                size: number
                opacity: number
            }>
        }>
    >([])
    const animationFrameRef = useRef<number>()
    const resizeRafRef = useRef<number>()
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const isStatic = typeof window === "undefined" || RenderTarget.current() === RenderTarget.thumbnail
    const lastTimeRef = useRef<number>(0)
    const lastResizeRef = useRef({ w: 0, h: 0, aspect: 0, ts: 0 })

    // Refs for live prop updates (don't trigger re-initialization)
    const speedRef = useRef(speed)
    const particleSizeRef = useRef(particleSize)
    const particleColorRef = useRef(particleColor)
    const cursorRadiusRef = useRef(cursorRadius)
    const clickForceRef = useRef(clickForce)
    const mouseoverColorRef = useRef(mouseoverColor)
    const colorDurationRef = useRef(colorDuration)
    const trailOpacityRef = useRef(trailOpacity)
    const clickEffectRef = useRef(clickEffect)
    const enableTrailsRef = useRef(enableTrails)

    // Update refs when props change (live updates without re-initialization)
    useEffect(() => {
        speedRef.current = speed
    }, [speed])

    useEffect(() => {
        particleSizeRef.current = particleSize
    }, [particleSize])

    useEffect(() => {
        particleColorRef.current = particleColor
    }, [particleColor])

    useEffect(() => {
        cursorRadiusRef.current = cursorRadius
    }, [cursorRadius])

    useEffect(() => {
        clickForceRef.current = clickForce
    }, [clickForce])

    useEffect(() => {
        mouseoverColorRef.current = mouseoverColor
    }, [mouseoverColor])

    useEffect(() => {
        colorDurationRef.current = colorDuration
    }, [colorDuration])

    useEffect(() => {
        trailOpacityRef.current = trailOpacity
    }, [trailOpacity])

    useEffect(() => {
        clickEffectRef.current = clickEffect
    }, [clickEffect])

    useEffect(() => {
        enableTrailsRef.current = enableTrails
    }, [enableTrails])

    // Pre-calculate rotation for a point in 3D space
    const rotatePoint3D = (
        baseX: number,
        baseY: number,
        baseZ: number,
        time: number
    ) => {
        // X-Z rotation
        const cosTimeX = Math.cos(time)
        const sinTimeX = Math.sin(time)
        const rotatedX = baseX * cosTimeX - baseZ * sinTimeX
        const rotatedZ = baseX * sinTimeX + baseZ * cosTimeX

        // Y rotation
        const timeY = time * ANIMATION.ROTATION_SPEED_Y
        const cosTimeY = Math.cos(timeY)
        const sinTimeY = Math.sin(timeY)
        const rotatedY = baseY * cosTimeY - rotatedZ * sinTimeY
        const finalZ = baseY * sinTimeY + rotatedZ * cosTimeY

        return { x: rotatedX, y: rotatedY, z: finalZ }
    }

    // Parse hex color to Three.js Color
    const parseColor = (hex: string): any => {
        const color = new Color(hex)
        return color
    }

    // Initialize Three.js scene
    const initScene = () => {
        if (!containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const size = Math.min(width, height)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // Create scene
        const scene = new Scene()
        sceneRef.current = scene

        // Create camera
        const camera = new PerspectiveCamera(75, size / size, 0.1, 2000)
        camera.position.z = 600
        cameraRef.current = camera

        // Create renderer
        const renderer = new WebGLRenderer({ alpha: true, antialias: true })
        renderer.setSize(size * dpr, size * dpr, false)
        renderer.setPixelRatio(1)
        renderer.domElement.style.width = `${size}px`
        renderer.domElement.style.height = `${size}px`
        renderer.domElement.style.display = "block"
        renderer.domElement.style.aspectRatio = "1 / 1"
        renderer.domElement.style.objectFit = "contain"
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Create particle system
            initParticles()
        }

    // Initialize particles
        const initParticles = () => {
        if (!sceneRef.current || !cameraRef.current) return

            const shouldRecreate = particlesRef.current.length !== particleCount

        // Always recreate particles array to ensure it matches particleCount
                particlesRef.current = []
            trailIndexRef.current = 0

        const radius = 200
        const initialTime = performance.now() * 0.0005 * speedRef.current

        // Create geometry - always create new geometry to match particle count
        const geometry = new BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)
        const opacities = new Float32Array(particleCount)

        const baseColor = parseColor(particleColorRef.current)

            for (let i = 0; i < particleCount; i++) {
            // Fibonacci sphere distribution
                const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount)
                const theta = Math.PI * (1 + Math.sqrt(5)) * i

                const baseX = radius * Math.sin(phi) * Math.cos(theta)
                const baseY = radius * Math.sin(phi) * Math.sin(theta)
                const baseZ = radius * Math.cos(phi)

            // Initialize at rotated position so all particles are moving from the start
                const rotated = rotatePoint3D(baseX, baseY, baseZ, initialTime)

            const idx = i * 3
            positions[idx] = rotated.x
            positions[idx + 1] = rotated.y
            positions[idx + 2] = rotated.z

            colors[idx] = baseColor.r
            colors[idx + 1] = baseColor.g
            colors[idx + 2] = baseColor.b

            // Depth-based size and opacity
            const depthScale = (rotated.z + 400) / 800
            sizes[i] = particleSizeRef.current * depthScale
            opacities[i] = PHYSICS.MIN_OPACITY + PHYSICS.OPACITY_RANGE * depthScale

            // Always create new particle
                    const trail = new Array(trailLength)
                    for (let j = 0; j < trailLength; j++) {
                trail[j] = { x: 0, y: 0, z: 0, size: 0, opacity: 0 }
                    }

                    particlesRef.current.push({
                x: rotated.x,
                y: rotated.y,
                        z: rotated.z,
                        vx: 0,
                        vy: 0,
                        vz: 0,
                        baseX: baseX,
                        baseY: baseY,
                        baseZ: baseZ,
                color: baseColor.clone(),
                        colorTimer: 0,
                        trail: trail,
                    })
        }

        geometry.setAttribute("position", new BufferAttribute(positions, 3))
        geometry.setAttribute("color", new BufferAttribute(colors, 3))
        geometry.setAttribute("size", new BufferAttribute(sizes, 1))
        geometry.setAttribute("opacity", new BufferAttribute(opacities, 1))

        // Shader material for particles
        const material = new ShaderMaterial({
            uniforms: {
                enableTrails: { value: enableTrailsRef.current ? 1.0 : 0.0 },
                trailOpacity: { value: trailOpacityRef.current },
            },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    vColor = color;
                    vOpacity = opacity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
                    gl_FragColor = vec4(vColor, alpha * vOpacity);
                }
            `,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
        })

        materialRef.current = material

        // Remove old points if exists and dispose properly
        if (pointsRef.current) {
            sceneRef.current.remove(pointsRef.current)
            if (geometryRef.current) {
                geometryRef.current.dispose()
            }
            if (materialRef.current) {
                materialRef.current.dispose()
            }
        }

        const points = new Points(geometry, material)
        pointsRef.current = points
        geometryRef.current = geometry
        sceneRef.current.add(points)
    }

    // Update particle positions and attributes
    const updateParticles = (deltaTime: number, currentTime: number) => {
        if (!geometryRef.current || !materialRef.current || !cameraRef.current) return
        if (particlesRef.current.length === 0) return

        const geometry = geometryRef.current
        const material = materialRef.current
        const positions = geometry.attributes.position as any
        const colors = geometry.attributes.color as any
        const sizes = geometry.attributes.size as any
        const opacities = geometry.attributes.opacity as any

        // Ensure geometry matches particle count
        if (positions.count !== particlesRef.current.length) {
            return // Geometry will be recreated on next init
        }

        const mouse = mouseRef.current
        const time = currentTime * 0.0005 * speedRef.current
        const cursorRadiusSquared = cursorRadiusRef.current * cursorRadiusRef.current

        // Update uniforms
        material.uniforms.enableTrails.value = enableTrailsRef.current ? 1.0 : 0.0
        material.uniforms.trailOpacity.value = trailOpacityRef.current

        // Convert mouse position to 3D space
        const container = containerRef.current
        if (!container) return
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const size = Math.min(width, height)
        const mouseX = ((mouse.x / size) * 2 - 1) * 300
        const mouseY = (-(mouse.y / size) * 2 + 1) * 300

        // Update ALL particles - ensure we iterate over all of them
        const particleCount = Math.min(particlesRef.current.length, positions.count)
        for (let i = 0; i < particleCount; i++) {
                    const particle = particlesRef.current[i]
            if (!particle) continue
            // Rotate particle in 3D space
            const rotated = rotatePoint3D(
                particle.baseX,
                particle.baseY,
                particle.baseZ,
                time
            )

            // Mouse interaction
            const dx = mouseX - particle.x
            const dy = mouseY - particle.y
            const distanceSquared = dx * dx + dy * dy

            if (distanceSquared < cursorRadiusSquared) {
                const distance = Math.sqrt(distanceSquared)
                const force = (cursorRadiusRef.current - distance) / cursorRadiusRef.current
                const angle = Math.atan2(dy, dx)
                particle.vx -=
                    Math.cos(angle) *
                    force *
                    speedRef.current *
                    PHYSICS.CURSOR_FORCE_MULTIPLIER
                particle.vy -=
                    Math.sin(angle) *
                    force *
                    speedRef.current *
                    PHYSICS.CURSOR_FORCE_MULTIPLIER

                // Apply mouseover color effect
                if (clickEffectRef.current === "color" || clickEffectRef.current === "both") {
                    particle.color = parseColor(mouseoverColorRef.current)
                    particle.colorTimer = colorDurationRef.current
                }
            }

            // Return to base position
            const returnForce = PHYSICS.RETURN_FORCE * speedRef.current
            particle.vx += (rotated.x - particle.x) * returnForce
            particle.vy += (rotated.y - particle.y) * returnForce
            particle.vz += (rotated.z - particle.z) * returnForce

            // Apply friction
            particle.vx *= PHYSICS.FRICTION
            particle.vy *= PHYSICS.FRICTION
            particle.vz *= PHYSICS.FRICTION

            particle.x += particle.vx
            particle.y += particle.vy
            particle.z += particle.vz

            // Handle color timer
            if (particle.colorTimer > 0) {
                particle.colorTimer -= deltaTime * 1000
                if (particle.colorTimer <= 0) {
                    particle.color = parseColor(particleColorRef.current)
                }
            }

            // Update attributes
            const idx = i * 3
            positions.setXYZ(idx, particle.x, particle.y, particle.z)
            colors.setXYZ(idx, particle.color.r, particle.color.g, particle.color.b)

            // Depth-based size and opacity
            const depthScale = (particle.z + 400) / 800
            sizes.setX(i, particleSizeRef.current * depthScale)
            opacities.setX(
                i,
                PHYSICS.MIN_OPACITY + PHYSICS.OPACITY_RANGE * depthScale
            )

            // Update trail
            if (enableTrailsRef.current) {
                const currentTrailIndex = trailIndexRef.current % trailLength
                particle.trail[currentTrailIndex] = {
                    x: particle.x,
                    y: particle.y,
                    z: particle.z,
                    size: particleSizeRef.current * depthScale,
                    opacity:
                        PHYSICS.MIN_OPACITY + PHYSICS.OPACITY_RANGE * depthScale,
                }
            }
        }

        positions.needsUpdate = true
        colors.needsUpdate = true
        sizes.needsUpdate = true
        opacities.needsUpdate = true

        trailIndexRef.current++
    }

    // Animation loop
    const animate = (currentTime: number) => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

        const deltaTime = lastTimeRef.current
            ? (currentTime - lastTimeRef.current) / 1000
            : 0.016
        lastTimeRef.current = currentTime

        updateParticles(deltaTime, currentTime)
        rendererRef.current.render(sceneRef.current, cameraRef.current)

        animationFrameRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault()
            const rect = container.getBoundingClientRect()
            const touch = e.touches[0]
            if (touch) {
                mouseRef.current = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                }
            }
        }

        const handleClick = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const clickY = e.clientY - rect.top
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const size = Math.min(width, height)
            const mouseX = ((clickX / size) * 2 - 1) * 300
            const mouseY = (-(clickY / size) * 2 + 1) * 300
            const cursorRadiusSquared = cursorRadiusRef.current * cursorRadiusRef.current

            particlesRef.current.forEach((particle) => {
                const dx = mouseX - particle.x
                const dy = mouseY - particle.y
                const distanceSquared = dx * dx + dy * dy

                if (distanceSquared < cursorRadiusSquared) {
                    if (clickEffectRef.current === "scatter" || clickEffectRef.current === "both") {
                        const distance = Math.sqrt(distanceSquared)
                        const angle = Math.atan2(dy, dx)
                        const force =
                            ((cursorRadiusRef.current - distance) / cursorRadiusRef.current) *
                            clickForceRef.current
                        particle.vx -= Math.cos(angle) * force
                        particle.vy -= Math.sin(angle) * force
                    }
                }
            })
        }

        const handleTouchStart = (e: TouchEvent) => {
            const rect = container.getBoundingClientRect()
            const touch = e.touches[0]
            if (!touch) return

            const touchX = touch.clientX - rect.left
            const touchY = touch.clientY - rect.top
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const size = Math.min(width, height)
            const mouseX = ((touchX / size) * 2 - 1) * 300
            const mouseY = (-(touchY / size) * 2 + 1) * 300
            const cursorRadiusSquared = cursorRadiusRef.current * cursorRadiusRef.current

            particlesRef.current.forEach((particle) => {
                const dx = mouseX - particle.x
                const dy = mouseY - particle.y
                const distanceSquared = dx * dx + dy * dy

                if (distanceSquared < cursorRadiusSquared) {
                    if (clickEffectRef.current === "scatter" || clickEffectRef.current === "both") {
                        const distance = Math.sqrt(distanceSquared)
                        const angle = Math.atan2(dy, dx)
                        const force =
                            ((cursorRadiusRef.current - distance) / cursorRadiusRef.current) *
                            clickForceRef.current
                        particle.vx -= Math.cos(angle) * force
                        particle.vy -= Math.sin(angle) * force
                    }
                }
            })
        }

        const resizeScene = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return

            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const size = Math.min(width, height)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)

            cameraRef.current.aspect = 1
            cameraRef.current.updateProjectionMatrix()

            rendererRef.current.setSize(size * dpr, size * dpr, false)
            rendererRef.current.domElement.style.width = `${size}px`
            rendererRef.current.domElement.style.height = `${size}px`
        }

        // Canvas resize detection
        if (isCanvas && typeof window !== "undefined") {
            const tick = (now?: number) => {
                if (!container) return
                const cw = container.clientWidth || container.offsetWidth || 1
                const ch = container.clientHeight || container.offsetHeight || 1
                const aspect = cw / ch

                const timeOk =
                    !lastResizeRef.current.ts ||
                    (now || performance.now()) - lastResizeRef.current.ts >= RESIZE_TICK_MS
                const aspectChanged =
                    Math.abs(aspect - lastResizeRef.current.aspect) > RESIZE_EPSILON
                const sizeChanged =
                    Math.abs(cw - lastResizeRef.current.w) > 1 ||
                    Math.abs(ch - lastResizeRef.current.h) > 1

                if (timeOk && (aspectChanged || sizeChanged)) {
                    lastResizeRef.current = {
                        w: cw,
                        h: ch,
                        aspect,
                        ts: now || performance.now(),
                    }
                    resizeScene()
                }
                resizeRafRef.current = requestAnimationFrame(tick)
            }
            resizeRafRef.current = requestAnimationFrame(tick)
        }

        if (typeof window !== "undefined" && !isStatic && (preview || !isCanvas)) {
            initScene()
            window.addEventListener("resize", resizeScene)
            container.addEventListener("mousemove", handleMouseMove)
            container.addEventListener("click", handleClick)
            container.addEventListener("touchmove", handleTouchMove, { passive: false })
            container.addEventListener("touchstart", handleTouchStart)
            lastTimeRef.current = performance.now()
            animate(performance.now())
        } else {
            // Static preview - still animate for visual consistency
            initScene()
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                lastTimeRef.current = performance.now()
                animate(performance.now())
            }
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("resize", resizeScene)
                container.removeEventListener("mousemove", handleMouseMove)
                container.removeEventListener("click", handleClick)
                container.removeEventListener("touchmove", handleTouchMove)
                container.removeEventListener("touchstart", handleTouchStart)
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (resizeRafRef.current) {
                cancelAnimationFrame(resizeRafRef.current)
            }
            if (rendererRef.current) {
                rendererRef.current.dispose()
                if (containerRef.current && rendererRef.current.domElement.parentNode) {
                    containerRef.current.removeChild(rendererRef.current.domElement)
                }
            }
            if (geometryRef.current) {
                geometryRef.current.dispose()
            }
            if (materialRef.current) {
                materialRef.current.dispose()
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
            }
        }
    }, [particleCount, trailLength, enableTrails, preview, isCanvas])

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                width: "100%",
                height: "100%",
                display: "block",
                aspectRatio: "1 / 1",
                position: "relative",
            }}
        />
    )
}

addPropertyControls(ParticleSphere, {
    // 1. Preview (always first)
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    // 2. Main content controls - Particles
    particleCount: {
        type: ControlType.Number,
        title: "Particle Count",
        defaultValue: 2000,
        min: 100,
        max: 3000,
        step: 100,
    },
    particleSize: {
        type: ControlType.Number,
        title: "Particle Size",
        defaultValue: 3,
        min: 1,
        max: 10,
        step: 0.5,
        unit: "px",
    },
    particleColor: {
        type: ControlType.Color,
        title: "Particle Color",
        defaultValue: "#757575",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    // 3. Configuration controls - Interaction
    cursorRadius: {
        type: ControlType.Number,
        title: "Cursor Radius",
        defaultValue: 150,
        min: 50,
        max: 500,
        step: 10,
        unit: "px",
    },
    clickEffect: {
        type: ControlType.Enum,
        title: "Click Effect",
        defaultValue: "scatter",
        options: ["scatter", "color", "both"],
        optionTitles: ["Scatter", "Color", "Both"],
        displaySegmentedControl: true,
    },
    clickForce: {
        type: ControlType.Number,
        title: "Click Force",
        defaultValue: 8,
        min: 1,
        max: 50,
        step: 1,
        hidden: ({ clickEffect }) => clickEffect === "color",
    },
    mouseoverColor: {
        type: ControlType.Color,
        title: "Mouseover Color",
        defaultValue: "#FF5588",
        hidden: ({ clickEffect }) => clickEffect === "scatter",
    },
    colorDuration: {
        type: ControlType.Number,
        title: "Color Duration",
        defaultValue: 1000,
        min: 100,
        max: 5000,
        step: 100,
        unit: "ms",
        hidden: ({ clickEffect }) => clickEffect === "scatter",
    },
    // 4. Configuration controls - Effects
    enableTrails: {
        type: ControlType.Boolean,
        title: "Enable Trails",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    trailLength: {
        type: ControlType.Number,
        title: "Trail Length",
        defaultValue: 10,
        min: 2,
        max: 30,
        step: 1,
        hidden: ({ enableTrails }) => !enableTrails,
    },
    trailOpacity: {
        type: ControlType.Number,
        title: "Trail Opacity",
        defaultValue: 0.5,
        min: 0.1,
        max: 1,
        step: 0.1,
        hidden: ({ enableTrails }) => !enableTrails,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ParticleSphere.displayName = "Particle Sphere"
