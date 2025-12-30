import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

interface BurnTransitionProps {
    color?: string
    noiseScale?: number
    noiseIntensity?: number
    scrollSensitivity?: number
    baseAnimationSpeed?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function BurnTransition({
    color = "#ff0000",
    noiseScale = 8.0,
    noiseIntensity = 0.15,
    scrollSensitivity = 0.0001,
    baseAnimationSpeed = 0.01,
    style,
}: BurnTransitionProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const bufferRef = useRef<WebGLBuffer | null>(null)
    const colorRef = useRef<string>(color)
    const noiseScaleRef = useRef<number>(noiseScale)
    const noiseIntensityRef = useRef<number>(noiseIntensity)
    const scrollSensitivityRef = useRef<number>(scrollSensitivity)
    const baseAnimationSpeedRef = useRef<number>(baseAnimationSpeed)
    const scrollOffsetRef = useRef<number>(0)
    const lastScrollYRef = useRef<number>(0)
    const lastScrollTimeRef = useRef<number>(0)
    const scrollVelocityRef = useRef<number>(0)
    const animationFrameRef = useRef<number | null>(null)
    const baseTimeRef = useRef<number>(0)
    const startTimeRef = useRef<number>(0)

    // Helper function to parse color to RGB
    const parseColor = (colorStr: string): [number, number, number] => {
        const hex = colorStr.replace("#", "")
        const r = parseInt(hex.substring(0, 2), 16) / 255
        const g = parseInt(hex.substring(2, 4), 16) / 255
        const b = parseInt(hex.substring(4, 6), 16) / 255
        return [r, g, b]
    }

    // Helper function to create shader
    const createShader = (
        gl: WebGLRenderingContext,
        type: number,
        source: string
    ): WebGLShader | null => {
        const shader = gl.createShader(type)
        if (!shader) return null

        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(
                "Shader compilation error:",
                gl.getShaderInfoLog(shader)
            )
            gl.deleteShader(shader)
            return null
        }

        return shader
    }

    // Helper function to create program
    const createProgram = (
        gl: WebGLRenderingContext,
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader
    ): WebGLProgram | null => {
        const program = gl.createProgram()
        if (!program) return null

        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program linking error:", gl.getProgramInfoLog(program))
            gl.deleteProgram(program)
            return null
        }

        return program
    }

    // Resize canvas to match container
    const resizeCanvas = () => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const rect = container.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        const gl = glRef.current
        if (gl) {
            gl.viewport(0, 0, canvas.width, canvas.height)
        }
    }

    // Render function
    const render = () => {
        const gl = glRef.current
        const program = programRef.current
        const buffer = bufferRef.current
        if (!gl || !program || !buffer) return

        // Use program
        gl.useProgram(program)

        // Bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

        // Set up position attribute
        const positionLocation = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        // Set color uniform
        const colorLocation = gl.getUniformLocation(program, "u_color")
        const [r, g, b] = parseColor(colorRef.current)
        gl.uniform3f(colorLocation, r, g, b)

        // Set noise uniforms
        const noiseScaleLocation = gl.getUniformLocation(program, "u_noise_scale")
        if (noiseScaleLocation) {
            gl.uniform1f(noiseScaleLocation, noiseScaleRef.current)
        }

        const noiseIntensityLocation = gl.getUniformLocation(
            program,
            "u_noise_intensity"
        )
        if (noiseIntensityLocation) {
            gl.uniform1f(noiseIntensityLocation, noiseIntensityRef.current)
        }

        // Update base time (slow continuous animation)
        const currentTime = performance.now()
        if (startTimeRef.current === 0) {
            startTimeRef.current = currentTime
        }
        // Base animation speed: controlled by user (units per second, converted to per millisecond)
        baseTimeRef.current =
            (currentTime - startTimeRef.current) *
            (baseAnimationSpeedRef.current / 1000)

        // Set scroll offset uniform for animation (base time + scroll offset)
        const scrollOffsetLocation = gl.getUniformLocation(
            program,
            "u_scroll_offset"
        )
        if (scrollOffsetLocation) {
            // Combine base slow animation with scroll-based animation
            gl.uniform1f(
                scrollOffsetLocation,
                baseTimeRef.current + scrollOffsetRef.current
            )
        }

        // Clear with transparent background
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // Enable blending for transparency
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    // Update refs when props change
    useEffect(() => {
        colorRef.current = color
        if (glRef.current && programRef.current) {
            render()
        }
    }, [color])

    useEffect(() => {
        noiseScaleRef.current = noiseScale
        if (glRef.current && programRef.current) {
            render()
        }
    }, [noiseScale])

    useEffect(() => {
        noiseIntensityRef.current = noiseIntensity
        if (glRef.current && programRef.current) {
            render()
        }
    }, [noiseIntensity])

    useEffect(() => {
        scrollSensitivityRef.current = scrollSensitivity
    }, [scrollSensitivity])

    useEffect(() => {
        baseAnimationSpeedRef.current = baseAnimationSpeed
    }, [baseAnimationSpeed])

    // Vertex shader - simple fullscreen quad
    const vertexShader = `
        attribute vec2 a_position;
        varying vec2 v_uv;

        void main() {
            v_uv = 0.5 * (a_position + 1.0);
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `

    // Fragment shader - transparent top half, colored bottom half with wavy noisy edge
    const fragmentShader = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec3 u_color;
        uniform float u_noise_scale;
        uniform float u_noise_intensity;
        uniform float u_scroll_offset;

        // Random function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // 2D Noise function
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // Fractal noise (multiple octaves)
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 0.0;
            
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise(st);
                st *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            // Create wavy edge using noise
            float baseLine = 0.5;
            // Add scroll offset to y-coordinate for animation
            vec2 noiseCoord = vec2(v_uv.x * u_noise_scale, u_scroll_offset);
            float noiseValue = fbm(noiseCoord);
            
            // Offset the threshold line based on noise
            float threshold = baseLine + (noiseValue - 0.5) * u_noise_intensity;
            
            // Top part (above threshold) is transparent
            // Bottom part (below threshold) is filled with color
            if (v_uv.y > threshold) {
                discard; // Make top part transparent
            } else {
                gl_FragColor = vec4(u_color, 1.0);
            }
        }
    `

    // Initialize WebGL
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Get WebGL context
        const gl = canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: false,
        })
        if (!gl) {
            console.error("WebGL not supported")
            return
        }

        glRef.current = gl

        // Create shaders
        const vertexShaderObj = createShader(gl, gl.VERTEX_SHADER, vertexShader)
        const fragmentShaderObj = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            fragmentShader
        )

        if (!vertexShaderObj || !fragmentShaderObj) return

        // Create program
        const program = createProgram(gl, vertexShaderObj, fragmentShaderObj)
        if (!program) return

        programRef.current = program

        // Create fullscreen quad
        const positions = new Float32Array([
            -1, -1, // bottom left
            1, -1, // bottom right
            -1, 1, // top left
            1, 1, // top right
        ])

        const buffer = gl.createBuffer()
        if (!buffer) return

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
        bufferRef.current = buffer

        // Initialize base animation time
        startTimeRef.current = performance.now()

        // Setup resize observer
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas()
        })
        resizeObserver.observe(container)

        // Initial render
        resizeCanvas()
        render()

        // Animation loop
        const animate = () => {
            if (glRef.current && programRef.current) {
                render()
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        }
        animationFrameRef.current = requestAnimationFrame(animate)

        // Track scroll for animation
        const scrollHandler = () => {
            const currentScrollY = window.scrollY || window.pageYOffset
            const currentTime = performance.now()

            if (lastScrollTimeRef.current > 0) {
                const deltaY = currentScrollY - lastScrollYRef.current
                const deltaTime = currentTime - lastScrollTimeRef.current
                
                if (deltaTime > 0 && Math.abs(deltaY) > 0) {
                    // Calculate scroll velocity (pixels per second) for tracking
                    scrollVelocityRef.current = (deltaY / deltaTime) * 1000
                    
                    // Use deltaY directly with sensitivity for more controlled animation
                    // This prevents velocity spikes from causing huge animations
                    scrollOffsetRef.current += deltaY * scrollSensitivityRef.current
                }
            }

            lastScrollYRef.current = currentScrollY
            lastScrollTimeRef.current = currentTime
        }

        // Initialize scroll tracking
        lastScrollYRef.current = window.scrollY || window.pageYOffset
        lastScrollTimeRef.current = performance.now()

        // Add scroll listener
        window.addEventListener("scroll", scrollHandler, { passive: true })

        // Decay scroll offset over time when not scrolling
        const decayInterval = setInterval(() => {
            if (Math.abs(scrollVelocityRef.current) < 0.1) {
                // Gradually decay the offset when not scrolling
                scrollOffsetRef.current *= 0.98
            }
            // Decay velocity over time
            scrollVelocityRef.current *= 0.95
        }, 16) // ~60fps

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener("scroll", scrollHandler)
            clearInterval(decayInterval)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (glRef.current) {
                const gl = glRef.current
                if (bufferRef.current) gl.deleteBuffer(bufferRef.current)
                if (programRef.current) gl.deleteProgram(programRef.current)
            }
        }
    }, [])

    const containerStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
    }

    const canvasStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <canvas ref={canvasRef} style={canvasStyle} />
        </div>
    )
}

// Property controls for Framer
addPropertyControls(BurnTransition, {
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#ff0000",
    },
    noiseScale: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 8.0,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        displayStepper: true,
    },
    noiseIntensity: {
        type: ControlType.Number,
        title: "Noise",
        defaultValue: 0.15,
        min: 0.0,
        max: 0.5,
        step: 0.01,
        displayStepper: true,
    },
    scrollSensitivity: {
        type: ControlType.Number,
        title: "Scroll Amount",
        defaultValue: 0.0001,
        min: 0.0,
        max: 0.01,
        step: 0.00001,
        displayStepper: true,
    },
    baseAnimationSpeed: {
        type: ControlType.Number,
        title: "Base Speed",
        defaultValue: 0.01,
        min: 0.0,
        max: 0.1,
        step: 0.001,
        displayStepper: true,
    },
})

