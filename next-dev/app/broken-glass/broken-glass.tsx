import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Type definition for ResponsiveImage
type ResponsiveImage =
    | {
          src?: string
          url?: string
          srcSet?: string | Array<{ src: string }>
          default?: string
          asset?: { url?: string }
      }
    | null
    | undefined

interface BrokenGlassProps {
    preview: boolean
    image?: string | ResponsiveImage
    breakAgain?: boolean
    distance?: number
    edgeThickness?: number
    style?: React.CSSProperties
}

// Helper function to resolve image source from various formats
const resolveImageSource = (
    input?: string | ResponsiveImage
): string | null => {
    if (!input) return null
    if (typeof input === "string" && input.trim().length > 0)
        return input.trim()
    if (typeof input === "object") {
        const possibleSources: Array<unknown> = [
            input.src,
            input.url,
            input.default,
            input.asset?.url,
        ]
        if (typeof input.srcSet === "string") {
            possibleSources.push(
                input.srcSet
                    .split(",")
                    .map((entry) => entry.trim().split(" ")[0])
                    .filter(Boolean)[0]
            )
        } else if (Array.isArray(input.srcSet)) {
            possibleSources.push(
                input.srcSet.map((entry) => entry?.src).filter(Boolean)[0]
            )
        }
        const resolved = possibleSources.find(
            (value): value is string =>
                typeof value === "string" && value.trim().length > 0
        )
        if (resolved) return resolved.trim()
    }
    return null
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function BrokenGlass({
    preview = false,
    image,
    breakAgain = true,
    distance = 0.5,
    edgeThickness = 0.5,
    style,
}: BrokenGlassProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})
    const imageRef = useRef<HTMLImageElement | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const pointerRef = useRef({ x: 0.55, y: 0.5 })
    const clickRandomizerRef = useRef(0.332)
    const [imageReady, setImageReady] = useState(false)
    const imageReadyRef = useRef(false)
    const [isBroken, setIsBroken] = useState(false)
    const isBrokenRef = useRef(false)

    // Track canvas size changes to trigger resize
    const lastCanvasSizeRef = useRef<{
        w: number
        h: number
        aspect: number
        ts: number
    }>({
        w: 0,
        h: 0,
        aspect: 0,
        ts: 0,
    })

    // Detect if component is in Framer canvas mode
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const resolvedImageUrl = resolveImageSource(image)
    const hasImage = !!resolvedImageUrl

    // Refs for live property updates - allows property changes to update immediately
    // without reinitializing the entire WebGL context
    const distanceRef = useRef(distance)
    const edgeThicknessRef = useRef(edgeThickness)

    // Sync imageReady state with ref
    useEffect(() => {
        imageReadyRef.current = imageReady
    }, [imageReady])

    // Sync isBroken state with ref
    useEffect(() => {
        isBrokenRef.current = isBroken
    }, [isBroken])

    // Update refs when props change - this pattern ensures real-time updates in canvas mode

    useEffect(() => {
        // Map from UI range [0-1] to shader range [0-0.2]
        distanceRef.current = distance * 0.2
    }, [distance])

    useEffect(() => {
        // Map from UI range [0-1] to shader range [0-0.02]
        edgeThicknessRef.current = edgeThickness * 0.02
    }, [edgeThickness])

    // Canvas scale: how much larger the canvas is compared to the container
    const canvasScale = 1.3

    // Inner scale: image fills the container exactly when distance = 0
    const innerScale = 1.0

    // Vertex shader
    const vertexShader = `
        precision mediump float;
        varying vec2 vUv;
        attribute vec f2 a_position;

        void main() {
            vUv = .5 * (a_position + 1.);
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `

    // Fragment shader
    const fragmentShader = `
        precision highp float;
        precision highp sampler2D;

        varying vec2 vUv;
        uniform sampler2D u_image_texture;
        uniform float u_edge_thickness;
        uniform float u_ratio;
        uniform vec2 u_pointer_position;
        uniform float u_img_ratio;
        uniform float u_click_randomizer;
        uniform float u_effect;
        uniform float u_effect_active;
        uniform float u_inner_scale;
        uniform float u_canvas_scale;

        #define TWO_PI 6.28318530718
        #define PI 3.14159265358979323846

        float random(float x) {
            return fract(sin(x * 12.9898) * 43758.5453);
        }

        float random2(vec2 p) {
            return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 u = fract(p);
            u = u*u*(3.0-2.0*u);

            float res = mix(
                mix(random2(ip), random2(ip+vec2(1.0, 0.0)), u.x),
                mix(random2(ip+vec2(0.0, 1.0)), random2(ip+vec2(1.0, 1.0)), u.x), u.y);
            return res*res;
        }

        float get_sector_shape(float d, float a, float angle, float edges) {
            float angle1 = PI;
            float angle2 = angle1 + angle;

            float edge1 = smoothstep(angle1 - edges / d, angle1 + edges / d, a);
            float edge2 = smoothstep(angle2 - edges / d, angle2 + edges / d, a);

            return edge1 * (1. - edge2);
        }

        float get_img_frame_alpha(vec2 uv, float img_frame_width) {
            float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
            img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
            return img_frame_alpha;
        }

        float get_simple_cracks(float a, float d, float n) {
            a *= (1. + sin(2. * a + PI + 2. * u_click_randomizer));
            float simple_cracks_number = 10.;
            float simple_cracks_angle_step = TWO_PI / simple_cracks_number;
            float simple_crack_angle = mod(a + n + u_click_randomizer, simple_cracks_angle_step);
            float cracks_shape = 4. * abs(simple_crack_angle - .5 * simple_cracks_angle_step);
            cracks_shape = mix(cracks_shape, 1., smoothstep(.9, 1., d));
            cracks_shape *= pow(d + .4 * u_click_randomizer * max(0., cos(2. * a + u_click_randomizer) * sin(1. * a)), 12.);
            cracks_shape = (1. + n) * (1. + sin(4. * a)) * step(.9, cracks_shape);
            return cracks_shape;
        }

        vec2 get_img_uv() {
            // Start from canvas UV and center
            vec2 uv = vUv - 0.5;
            
            // First shrink to container size inside overscanned canvas
            uv *= u_canvas_scale;
            
            // Apply object-fit: cover mapping (EXACT copy from liquidHover)
            float containerAspect = u_ratio;
            float imageAspect = u_img_ratio;
            vec2 scale = vec2(1.0);
            if (containerAspect > imageAspect) {
                scale.y = imageAspect / containerAspect;
            } else {
                scale.x = containerAspect / imageAspect;
            }
            uv *= scale;
            
            // Map only the central inner rectangle to the image by expanding UVs
            uv /= u_inner_scale;
            
            return uv + 0.5;
        }

        vec2 get_frame_uv() {
            vec2 uv = vUv - 0.5;
            uv *= u_canvas_scale;
            uv /= u_inner_scale;
            return uv + 0.5;
        }

        vec2 get_disturbed_uv(vec2 uv, float section_constant, float edge, vec2 direction, float border) {
            float img_distortion = u_effect * (section_constant - .5);
            vec2 discurbed_uv = uv;
            discurbed_uv += 2. * img_distortion;
            discurbed_uv.x -= mix(.03 * edge * direction.x, -.1 * edge, border);
            discurbed_uv.y -= mix(.03 * edge * direction.y, -.1 * edge, border);
            vec2 center = vec2(0.5, 0.5);
            discurbed_uv = discurbed_uv - center;
            float cosA = cos(4. * img_distortion);
            float sinA = sin(4. * img_distortion);
            float perspective = 1. + img_distortion * discurbed_uv.y;
            discurbed_uv = vec2(
                perspective * (cosA * discurbed_uv.x - sinA * discurbed_uv.y),
                perspective * (sinA * discurbed_uv.x + cosA * discurbed_uv.y)
            );
            discurbed_uv += center;
            return discurbed_uv;
        }

        void main() {
            vec2 uv = vUv;
            uv.y = 1. - uv.y;
            uv.x *= u_ratio;

            vec2 pointer = u_pointer_position;
            vec2 pointer_direction = normalize(u_pointer_position - vec2(vUv.x, 1. - vUv.y));
            pointer.x *= u_ratio;
            pointer = pointer - uv;
            float pointer_angle = atan(pointer.y, pointer.x);
            float pointer_distance = length(pointer);
            float pointer_distance_normalized = (1. - clamp(pointer_distance, 0., 1.));

            vec3 color = vec3(0.);
            vec2 img_uv = get_img_uv();

            float sector_constant = 0.;
            float sector_start_angle = 0.;
            float is_sector_edge = 0.;
            float is_grid_edge = 0.;
            float is_central_edge = 0.;

            float angle_noise = .3 * noise(3. * img_uv);

            for (int i = 0; i < 12; i++) {
                float sector_seed = float(i) + u_click_randomizer + 2.;

                float angle_normalised = mod((pointer_angle - sector_start_angle) / TWO_PI, 1.);
                angle_normalised += .1 * angle_noise;

                float angle = angle_normalised * TWO_PI;
                float sector_size = (.01 + 2. * random2(vec2(float(i) + u_click_randomizer, u_pointer_position.x)));
                sector_size = min(sector_size, TWO_PI - sector_start_angle);

                float thickness = u_edge_thickness * (.2 + random(3. * sector_seed));
                thickness += angle_noise * .03 * pow(pointer_distance_normalized, 80.);

                float shape = get_sector_shape(pointer_distance, angle, sector_size, thickness);
                is_sector_edge = max(is_sector_edge, smoothstep(.6, 1., shape));
                sector_constant = mix(sector_constant, random(sector_seed), smoothstep(.2, .8, shape));

                vec2 grid_uv = 2. * (.8 + .5 * pointer_distance_normalized) * img_uv;
                float grid_noise = noise(grid_uv + sector_seed);
                float grid_thickness = (.4 + .4 * random(10. * sector_seed)) * u_edge_thickness;
                float grid_shape = shape * smoothstep(.27, .27 + grid_thickness, grid_noise);
                is_grid_edge += (smoothstep(.1, .5, grid_shape) * smoothstep(.9, .6, grid_shape));

                sector_constant = mix(sector_constant, random(sector_seed + 100.), smoothstep(.2, .8, grid_shape));

                vec2 central_grid_uv = img_uv * (3. + 3. * pow(pointer_distance_normalized, 10.));
                float central_grid_noise = noise(central_grid_uv + sector_seed);
                float central_grid_thickness = (1. + .5 * random(-2. + sector_seed)) * u_edge_thickness;
                float central_grid_shape = step(.7, shape) * smoothstep(.27, .27 + central_grid_thickness, central_grid_noise);
                is_central_edge += (smoothstep(.0, .5, central_grid_shape) * smoothstep(1., .5, central_grid_shape));
                is_central_edge *= (step(.8, pointer_distance_normalized));

                sector_constant = mix(sector_constant, random(sector_seed + 100.), smoothstep(.2, .8, central_grid_shape));

                sector_start_angle += sector_size;
            }

            vec2 frame_uv = get_frame_uv();
            float img_edge_alpha = get_img_frame_alpha(frame_uv, .004);
            is_sector_edge = 1. - is_sector_edge;

            float cracks_edge = max(is_grid_edge, is_sector_edge);
            cracks_edge = max(cracks_edge, is_central_edge);

            float central_cracks = get_simple_cracks(pointer_angle, pointer_distance_normalized, angle_noise);
            cracks_edge += central_cracks;

            if (u_effect_active > 0.) {
                float border = get_img_frame_alpha(frame_uv, .2);
                img_uv = get_disturbed_uv(img_uv, sector_constant, cracks_edge, pointer_direction, border);
                frame_uv = get_disturbed_uv(frame_uv, sector_constant, cracks_edge, pointer_direction, border);
            }

            vec4 img = texture2D(u_image_texture, vec2(img_uv.x, 1.0 - img_uv.y));
            color = img.rgb;
            color += .12 * u_effect_active * (sector_constant - .5);

            img_edge_alpha = get_img_frame_alpha(frame_uv, .004);
            float opacity = img_edge_alpha;
            opacity -= .3 * u_effect_active * pow(is_grid_edge, 4.);
            opacity -= .3 * u_effect_active * is_central_edge;
            opacity -= .03 * u_effect_active * pow(central_cracks, 4.);

            gl_FragColor = vec4(color, opacity);
        }
    `

    // Initialize WebGL shader - creates and compiles vertex and fragment shaders
    const initShader = (gl: WebGLRenderingContext): boolean => {
        // Helper function to create and compile individual shaders
        const createShader = (
            sourceCode: string,
            type: number
        ): WebGLShader | null => {
            const shader = gl.createShader(type)
            if (!shader) return null

            gl.shaderSource(shader, sourceCode)
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

        const vShader = createShader(vertexShader, gl.VERTEX_SHADER)
        const fShader = createShader(fragmentShader, gl.FRAGMENT_SHADER)

        if (!vShader || !fShader) return false

        const program = gl.createProgram()
        if (!program) return false

        gl.attachShader(program, vShader)
        gl.attachShader(program, fShader)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return false
        }

        gl.useProgram(program)

        // Get all uniform locations
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(program, i)
            if (uniformInfo) {
                uniformsRef.current[uniformInfo.name] = gl.getUniformLocation(
                    program,
                    uniformInfo.name
                )
            }
        }

        // Set up vertex buffer
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
        const vertexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        const positionLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(positionLoc)
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

        return true
    }

    // Update uniforms with current values
    const updateUniforms = () => {
        const gl = glRef.current
        const uniforms = uniformsRef.current
        if (!gl || !uniforms) return

        if (uniforms.u_click_randomizer) {
            gl.uniform1f(
                uniforms.u_click_randomizer,
                clickRandomizerRef.current
            )
        }
        if (uniforms.u_effect) {
            gl.uniform1f(uniforms.u_effect, distanceRef.current)
        }
        if (uniforms.u_effect_active) {
            // Effect is active only when glass is broken
            gl.uniform1f(uniforms.u_effect_active, isBrokenRef.current ? 1 : 0)
        }
        if (uniforms.u_edge_thickness) {
            gl.uniform1f(uniforms.u_edge_thickness, edgeThicknessRef.current)
        }
        if (uniforms.u_pointer_position) {
            gl.uniform2f(
                uniforms.u_pointer_position,
                pointerRef.current.x,
                pointerRef.current.y
            )
        }
        if (uniforms.u_inner_scale) {
            gl.uniform1f(uniforms.u_inner_scale, innerScale)
        }
        if (uniforms.u_canvas_scale) {
            // Map container area (center of oversized canvas) to full UV range
            // This shrinks the coordinate space so the image fits in the center 76.9%
            gl.uniform1f(uniforms.u_canvas_scale, canvasScale)
        }
    }

    // Resize canvas to match container
    const resizeCanvas = () => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const gl = glRef.current
        const img = imageRef.current
        const uniforms = uniformsRef.current

        if (!canvas || !container || !gl || !img || !uniforms) return

        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // Device-pixel backing store for crisp rendering with overscan
        canvas.width = Math.max(2, Math.round(width * canvasScale * dpr))
        canvas.height = Math.max(2, Math.round(height * canvasScale * dpr))

        // CSS pixels for layout/centering (same as liquidHover)
        const cssW = width * canvasScale
        const cssH = height * canvasScale
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`

        gl.viewport(0, 0, canvas.width, canvas.height)

        const canvasRatio = width / height
        const imgRatio = img.naturalWidth / img.naturalHeight

        if (uniforms.u_ratio) {
            gl.uniform1f(uniforms.u_ratio, canvasRatio)
        }
        if (uniforms.u_img_ratio) {
            gl.uniform1f(uniforms.u_img_ratio, imgRatio)
        }
    }

    // Main WebGL initialization
    useEffect(() => {
        if (!resolvedImageUrl) {
            setImageReady(false)
            setIsBroken(false) // Reset broken state when image changes
            return
        }

        // Reset broken state when image changes
        setIsBroken(false)

        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl")
        if (!gl) {
            console.error("WebGL not supported")
            return
        }

        glRef.current = gl

        // Initialize shader program
        if (!initShader(gl)) {
            console.error("Failed to initialize shader")
            return
        }

        // Load image
        const img = new Image()
        img.crossOrigin = "anonymous"
        imageRef.current = img

        img.onload = () => {
            const texture = gl.createTexture()
            textureRef.current = texture
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )

            if (uniformsRef.current.u_image_texture) {
                gl.uniform1i(uniformsRef.current.u_image_texture, 0)
            }

            resizeCanvas()
            updateUniforms()

            // Initial render (no continuous loop needed since effect is static)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

            setImageReady(true)
            imageReadyRef.current = true
        }

        img.onerror = () => {
            console.error("Failed to load image")
            setImageReady(false)
            imageReadyRef.current = false
        }

        img.src = resolvedImageUrl

        // Resize handling - only run polling when preview is ON in canvas mode
        const resizeCleanup =
            isCanvas && preview
                ? (() => {
                      // Canvas mode with preview ON: Use polling to detect resize
                      let rafId = 0
                      const TICK_MS = 100 // Check every 100ms for responsive resizing
                      const EPS_ASPECT = 0.001

                      const tick = (now?: number) => {
                          const container = containerRef.current
                          if (container) {
                              const cw =
                                  container.clientWidth ||
                                  container.offsetWidth ||
                                  1
                              const ch =
                                  container.clientHeight ||
                                  container.offsetHeight ||
                                  1
                              const aspect = cw / ch

                              const timeOk =
                                  !lastCanvasSizeRef.current.ts ||
                                  (now || performance.now()) -
                                      lastCanvasSizeRef.current.ts >=
                                      TICK_MS
                              const aspectChanged =
                                  Math.abs(
                                      aspect - lastCanvasSizeRef.current.aspect
                                  ) > EPS_ASPECT
                              const sizeChanged =
                                  Math.abs(cw - lastCanvasSizeRef.current.w) >
                                      1 ||
                                  Math.abs(ch - lastCanvasSizeRef.current.h) > 1

                              if (timeOk && (aspectChanged || sizeChanged)) {
                                  lastCanvasSizeRef.current = {
                                      w: cw,
                                      h: ch,
                                      aspect,
                                      ts: now || performance.now(),
                                  }
                                  resizeCanvas()
                                  // Force a render after resize
                                  if (gl && imageReadyRef.current) {
                                      updateUniforms()
                                      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                                  }
                              }
                          }
                          rafId = requestAnimationFrame(tick)
                      }
                      rafId = requestAnimationFrame(tick)
                      return () => cancelAnimationFrame(rafId)
                  })()
                : !isCanvas
                  ? (() => {
                        // Live preview: Use standard resize event
                        const handleResize = () => {
                            resizeCanvas()
                            // Force a render after resize
                            if (gl && imageReadyRef.current) {
                                updateUniforms()
                                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                            }
                        }
                        window.addEventListener("resize", handleResize)
                        return () =>
                            window.removeEventListener("resize", handleResize)
                    })()
                  : (() => {
                        // Canvas mode with preview OFF: No resize detection needed
                        return () => {}
                    })()

        return () => {
            resizeCleanup()
            if (gl && textureRef.current) {
                gl.deleteTexture(textureRef.current)
                textureRef.current = null
            }
            imageReadyRef.current = false
            isBrokenRef.current = false
        }
    }, [resolvedImageUrl, isCanvas, preview])

    // Handle canvas click to break/unbreak glass
    // Behavior controlled by breakAgain prop:
    // - breakAgain = true (Toggle mode): Click to break, click again to unbreak, and so on
    // - breakAgain = false (One-time mode): Can only break once, stays broken forever
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        const gl = glRef.current
        if (!canvas || !gl) return

        if (breakAgain) {
            // Toggle mode: click to break, click again to unbreak, etc.
            if (!isBroken) {
                // Breaking the glass
                const rect = canvas.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height

                pointerRef.current = { x, y }
                clickRandomizerRef.current = Math.random()

                // Update ref immediately for instant WebGL render (performance optimization)
                isBrokenRef.current = true
                updateUniforms()
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                // Update state for React consistency (happens after visual update)
                setIsBroken(true)
            } else {
                // Unbreaking the glass
                // Update ref immediately for instant WebGL render
                isBrokenRef.current = false
                updateUniforms()
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                // Update state for React consistency
                setIsBroken(false)
            }
        } else {
            // One-time mode: can only break once
            if (!isBroken) {
                const rect = canvas.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height

                pointerRef.current = { x, y }
                clickRandomizerRef.current = Math.random()

                // Update ref immediately for instant WebGL render (performance optimization)
                isBrokenRef.current = true
                updateUniforms()
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                // Update state for React consistency (happens after visual update)
                setIsBroken(true)
            }
            // If already broken, do nothing
        }
    }

    // Auto-break glass in canvas mode when preview turns ON
    useEffect(() => {
        if (isCanvas && preview && imageReady) {
            // Set glass as broken with center position when preview is enabled
            pointerRef.current = { x: 0.5, y: 0.5 }
            clickRandomizerRef.current = Math.random()
            isBrokenRef.current = true
            setIsBroken(true)

            // Force immediate render
            if (glRef.current) {
                updateUniforms()
                glRef.current.drawArrays(glRef.current.TRIANGLE_STRIP, 0, 4)
            }
        }
    }, [isCanvas, preview, imageReady])

    // Force render when properties change in canvas mode or broken state changes
    useEffect(() => {
        if (isCanvas && imageReady && glRef.current) {
            updateUniforms()
            glRef.current.drawArrays(glRef.current.TRIANGLE_STRIP, 0, 4)
        }
    }, [distance, edgeThickness, isBroken, isCanvas, imageReady])

    // Show empty state when no image
    if (!hasImage) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                }}
            >
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Broken Glass"
                    subtitle="Add an image to see the effect"
                />
            </div>
        )
    }

    // In canvas mode with preview off, just show the plain image (no WebGL)
    if (isCanvas && !preview) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${resolvedImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
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
                overflow: "visible",
            }}
        >
            <canvas
                ref={canvasRef}
                onClick={handleClick}
                style={{
                    position: "absolute",
                    top: "-15%",
                    left: "-15%",
                    display: "block",
                    opacity: imageReady ? 1 : 0,
                    // width and height set dynamically in resizeCanvas()
                }}
            />
        </div>
    )
}

addPropertyControls(BrokenGlass, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    breakAgain: {
        type: ControlType.Boolean,
        title: "Break",
        defaultValue: true,
        enabledTitle: "Toggle",
        disabledTitle: "Once",
    },
    distance: {
        type: ControlType.Number,
        title: "Distance",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.1,
    },
    edgeThickness: {
        type: ControlType.Number,
        title: "Edge",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.3,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BrokenGlass.displayName = "Broken Glass"
