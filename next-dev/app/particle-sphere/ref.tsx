// Particle shader that responds to cursor position with WebGL
import { useEffect, useRef, useState, startTransition } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

// Constants for physics and rendering
const PHYSICS = {
    FRICTION: 0.92,
    RETURN_FORCE: 0.02,
    CURSOR_FORCE_MULTIPLIER: 1.5,
    PERSPECTIVE: 600,
    DEPTH_OFFSET: 400,
    DEPTH_RANGE: 800,
    MIN_OPACITY: 0.3,
    OPACITY_RANGE: 0.7,
    TRAIL_MIN_SIZE: 0.3,
    TRAIL_SIZE_RANGE: 0.7,
} as const

const ANIMATION = {
    FADE_DURATION: 1.5,
    FRAME_TIME: 16, // Approximate ms per frame at 60fps
    ROTATION_SPEED_Y: 0.7,
} as const

interface ParticleShaderProps {
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
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 675
 * @framerIntrinsicHeight 675
 */
export default function ParticleSphere(props: ParticleShaderProps) {
    const {
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
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseRef = useRef({ x: 0, y: 0 })
    const clickActiveRef = useRef(false)
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
            color: string
            colorTimer: number
            trail: Array<{
                x: number
                y: number
                size: number
                opacity: number
            }>
        }>
    >([])
    const animationFrameRef = useRef<number>()
    const isStatic = useIsStaticRenderer()
    const fadeInRef = useRef(0)
    const lastParticleCountRef = useRef(particleCount)

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

    // Project 3D point to 2D screen space
    const projectTo2D = (
        x: number,
        y: number,
        z: number,
        centerX: number,
        centerY: number,
        canvasWidth: number,
        canvasHeight: number
    ) => {
        const scale = PHYSICS.PERSPECTIVE / (PHYSICS.PERSPECTIVE + z)
        // Canvas is now always square, so no aspect ratio compensation needed
        return {
            x: centerX + x * scale,
            y: centerY + y * scale,
            scale,
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect()
            // Enforce square aspect ratio by using the smaller dimension
            const size = Math.min(rect.width, rect.height)
            canvas.width = size * window.devicePixelRatio
            canvas.height = size * window.devicePixelRatio
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

            // Reinitialize particles on resize
            initParticles()
        }

        const initParticles = () => {
            const rect = canvas.getBoundingClientRect()

            // Only recreate particles if count changed, otherwise just reset positions
            const shouldRecreate = particlesRef.current.length !== particleCount

            if (shouldRecreate) {
                particlesRef.current = []
            }

            // Reset trail index on initialization
            trailIndexRef.current = 0

            const radius = Math.min(rect.width, rect.height) * 0.3
            const centerX = rect.width / 2
            const centerY = rect.height / 2
            const initialTime = Date.now() * 0.0005 * speed

            for (let i = 0; i < particleCount; i++) {
                // Fibonacci sphere distribution for even particle placement
                const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount)
                const theta = Math.PI * (1 + Math.sqrt(5)) * i

                const baseX = radius * Math.sin(phi) * Math.cos(theta)
                const baseY = radius * Math.sin(phi) * Math.sin(theta)
                const baseZ = radius * Math.cos(phi)

                // Calculate initial rotated position to prevent bounce
                const rotated = rotatePoint3D(baseX, baseY, baseZ, initialTime)
                const projected = projectTo2D(
                    rotated.x,
                    rotated.y,
                    rotated.z,
                    centerX,
                    centerY,
                    rect.width,
                    rect.height
                )

                if (shouldRecreate) {
                    // Pre-allocate trail array to avoid constant resizing
                    const trail = new Array(trailLength)
                    for (let j = 0; j < trailLength; j++) {
                        trail[j] = { x: 0, y: 0, size: 0, opacity: 0 }
                    }

                    particlesRef.current.push({
                        x: projected.x,
                        y: projected.y,
                        z: rotated.z,
                        vx: 0,
                        vy: 0,
                        vz: 0,
                        baseX: baseX,
                        baseY: baseY,
                        baseZ: baseZ,
                        color: particleColor,
                        colorTimer: 0,
                        trail: trail,
                    })
                } else {
                    // Just reset existing particle
                    const particle = particlesRef.current[i]
                    particle.x = projected.x
                    particle.y = projected.y
                    particle.z = rotated.z
                    particle.vx = 0
                    particle.vy = 0
                    particle.vz = 0
                    particle.baseX = baseX
                    particle.baseY = baseY
                    particle.baseZ = baseZ
                    particle.color = particleColor
                    particle.colorTimer = 0
                }
            }

            lastParticleCountRef.current = particleCount
        }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault()
            const rect = canvas.getBoundingClientRect()
            const touch = e.touches[0]
            if (touch) {
                mouseRef.current = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                }
            }
        }

        const handleClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const clickY = e.clientY - rect.top
            const cursorRadiusSquared = cursorRadius * cursorRadius

            particlesRef.current.forEach((particle) => {
                const dx = clickX - particle.x
                const dy = clickY - particle.y
                const distanceSquared = dx * dx + dy * dy

                if (distanceSquared < cursorRadiusSquared) {
                    if (clickEffect === "scatter" || clickEffect === "both") {
                        const distance = Math.sqrt(distanceSquared)
                        const angle = Math.atan2(dy, dx)
                        const force =
                            ((cursorRadius - distance) / cursorRadius) *
                            clickForce
                        particle.vx -= Math.cos(angle) * force
                        particle.vy -= Math.sin(angle) * force
                    }
                }
            })
        }

        const handleTouchStart = (e: TouchEvent) => {
            const rect = canvas.getBoundingClientRect()
            const touch = e.touches[0]
            if (!touch) return

            const touchX = touch.clientX - rect.left
            const touchY = touch.clientY - rect.top
            const cursorRadiusSquared = cursorRadius * cursorRadius

            particlesRef.current.forEach((particle) => {
                const dx = touchX - particle.x
                const dy = touchY - particle.y
                const distanceSquared = dx * dx + dy * dy

                if (distanceSquared < cursorRadiusSquared) {
                    if (clickEffect === "scatter" || clickEffect === "both") {
                        const distance = Math.sqrt(distanceSquared)
                        const angle = Math.atan2(dy, dx)
                        const force =
                            ((cursorRadius - distance) / cursorRadius) *
                            clickForce
                        particle.vx -= Math.cos(angle) * force
                        particle.vy -= Math.sin(angle) * force
                    }
                }
            })
        }

        const animate = () => {
            const rect = canvas.getBoundingClientRect()
            ctx.clearRect(0, 0, rect.width, rect.height)

            const mouse = mouseRef.current
            const centerX = rect.width / 2
            const centerY = rect.height / 2
            const time = Date.now() * 0.0005 * speed
            const cursorRadiusSquared = cursorRadius * cursorRadius

            // Simple fade-in effect
            if (fadeInRef.current < 1) {
                fadeInRef.current +=
                    ANIMATION.FRAME_TIME / 1000 / ANIMATION.FADE_DURATION
                if (fadeInRef.current > 1) fadeInRef.current = 1
            }

            particlesRef.current.forEach((particle, index) => {
                // Rotate particle in 3D space
                const rotated = rotatePoint3D(
                    particle.baseX,
                    particle.baseY,
                    particle.baseZ,
                    time
                )

                // Perspective projection
                const projected = projectTo2D(
                    rotated.x,
                    rotated.y,
                    rotated.z,
                    centerX,
                    centerY,
                    rect.width,
                    rect.height
                )

                const dx = mouse.x - particle.x
                const dy = mouse.y - particle.y
                const distanceSquared = dx * dx + dy * dy

                if (distanceSquared < cursorRadiusSquared) {
                    const distance = Math.sqrt(distanceSquared)
                    const force = (cursorRadius - distance) / cursorRadius
                    const angle = Math.atan2(dy, dx)
                    particle.vx -=
                        Math.cos(angle) *
                        force *
                        speed *
                        PHYSICS.CURSOR_FORCE_MULTIPLIER
                    particle.vy -=
                        Math.sin(angle) *
                        force *
                        speed *
                        PHYSICS.CURSOR_FORCE_MULTIPLIER

                    // Apply mouseover color effect
                    if (clickEffect === "color" || clickEffect === "both") {
                        particle.color = mouseoverColor
                        particle.colorTimer = colorDuration
                    }
                }

                // Return to base position (the current rotated position on the sphere)
                const returnForce = PHYSICS.RETURN_FORCE * speed
                particle.vx += (projected.x - particle.x) * returnForce
                particle.vy += (projected.y - particle.y) * returnForce

                // Apply friction
                particle.vx *= PHYSICS.FRICTION
                particle.vy *= PHYSICS.FRICTION

                particle.x += particle.vx
                particle.y += particle.vy

                // Handle color timer
                if (particle.colorTimer > 0) {
                    particle.colorTimer -= ANIMATION.FRAME_TIME
                    if (particle.colorTimer <= 0) {
                        particle.color = particleColor
                    }
                }

                // Draw particle with depth-based size and opacity
                const depthScale =
                    (rotated.z + PHYSICS.DEPTH_OFFSET) / PHYSICS.DEPTH_RANGE
                const size = particleSize * projected.scale * depthScale
                const opacity =
                    (PHYSICS.MIN_OPACITY + PHYSICS.OPACITY_RANGE * depthScale) *
                    fadeInRef.current

                // Update and draw trail
                if (enableTrails) {
                    // Update trail with current position using circular buffer
                    const currentTrailIndex =
                        trailIndexRef.current % trailLength
                    particle.trail[currentTrailIndex] = {
                        x: particle.x,
                        y: particle.y,
                        size: size,
                        opacity: opacity,
                    }

                    // Draw trail from oldest to newest
                    for (let i = 0; i < trailLength; i++) {
                        // Calculate the actual index in the circular buffer (oldest first)
                        const trailIdx =
                            (trailIndexRef.current + 1 + i) % trailLength
                        const point = particle.trail[trailIdx]

                        if (!point || point.opacity === 0) continue

                        // Progress from 0 (oldest) to 1 (newest)
                        const trailProgress = i / (trailLength - 1)
                        const trailSize =
                            point.size *
                            (PHYSICS.TRAIL_MIN_SIZE +
                                PHYSICS.TRAIL_SIZE_RANGE * trailProgress)
                        const trailAlpha =
                            point.opacity * trailOpacity * trailProgress

                        ctx.fillStyle = particle.color
                        ctx.globalAlpha = trailAlpha
                        ctx.beginPath()
                        ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2)
                        ctx.fill()
                    }
                    ctx.globalAlpha = 1
                }

                // Draw main particle
                ctx.fillStyle = particle.color
                ctx.globalAlpha = opacity
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
                ctx.fill()
                ctx.globalAlpha = 1
            })

            // Increment trail index after all particles are processed
            trailIndexRef.current++

            animationFrameRef.current = requestAnimationFrame(animate)
        }

        if (typeof window !== "undefined" && !isStatic) {
            resizeCanvas()
            window.addEventListener("resize", resizeCanvas)
            canvas.addEventListener("mousemove", handleMouseMove)
            canvas.addEventListener("click", handleClick)
            canvas.addEventListener("touchmove", handleTouchMove, {
                passive: false,
            })
            canvas.addEventListener("touchstart", handleTouchStart)
            animate()
        } else {
            // Static preview
            resizeCanvas()
            const rect = canvas.getBoundingClientRect()
            ctx.clearRect(0, 0, rect.width, rect.height)

            initParticles()
            particlesRef.current.forEach((particle) => {
                const centerX = rect.width / 2
                const centerY = rect.height / 2
                const projected = projectTo2D(
                    particle.baseX,
                    particle.baseY,
                    particle.z,
                    centerX,
                    centerY,
                    rect.width,
                    rect.height
                )
                const depthScale =
                    (particle.z + PHYSICS.DEPTH_OFFSET) / PHYSICS.DEPTH_RANGE
                const size = particleSize * projected.scale * depthScale
                const opacity =
                    PHYSICS.MIN_OPACITY + PHYSICS.OPACITY_RANGE * depthScale

                ctx.fillStyle = particle.color
                ctx.globalAlpha = opacity
                ctx.beginPath()
                ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2)
                ctx.fill()
                ctx.globalAlpha = 1
            })
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("resize", resizeCanvas)
                canvas.removeEventListener("mousemove", handleMouseMove)
                canvas.removeEventListener("click", handleClick)
                canvas.removeEventListener("touchmove", handleTouchMove)
                canvas.removeEventListener("touchstart", handleTouchStart)
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [
        particleCount,
        particleSize,
        particleColor,
        speed,
        cursorRadius,
        clickEffect,
        clickForce,
        mouseoverColor,
        colorDuration,
        isStatic,
        enableTrails,
        trailLength,
        trailOpacity,
    ])

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                aspectRatio: "1 / 1",
                objectFit: "contain",
            }}
        />
    )
}

addPropertyControls(ParticleSphere, {
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
    },
})
