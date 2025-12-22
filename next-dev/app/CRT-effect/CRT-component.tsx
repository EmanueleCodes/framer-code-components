import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { VFX } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/crt-bundle.js"

type CRTComponentProps = {
    targetId?: string
    intensity?: number
    scanlineIntensity?: number
    chromaticAberration?: number
    vignetteStrength?: number
    distortionAmount?: number
    noiseAmount?: number
    grain?: number
    speed?: number
}

// UI → Internal mapping helpers
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

// Generate light shader for text elements (keeps text readable)
function generateTextShader(props: {
    chromaticAberration: number
    speed: number
}) {
    // Map chromatic aberration to glitch intensity
    const glitchIntensity = mapLinear(props.chromaticAberration, 0, 1, 0.0, 0.3)
    const speedMult = mapLinear(props.speed, 0, 1, 0.3, 1.7)

    return `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
uniform float id;
out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));
  return c;
}

float rand(vec2 p) {
  return fract(sin(dot(p, vec2(829., 483.))) * 394.);
}
float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

vec2 dist(vec2 uv, float f) {
  float t = time * ${speedMult.toFixed(2)} + id;
  uv += sin(uv.y * 12. + t * 1.7) * sin(uv.y * 17. + t * 2.3) * f;
  return uv;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;
  vec2 uvr = uv, uvg = uv, uvb = uv;

  float r = rand(vec2(floor(time * ${speedMult.toFixed(2)} * 43.), id));
  if (r > ${(0.95 - glitchIntensity * 0.15).toFixed(2)}) {
    float y = sin(floor(uv.y / 0.07)) + sin(floor(uv.y / 0.003 + time * ${speedMult.toFixed(2)}));
    float f = rand(vec2(y, floor(time * ${speedMult.toFixed(2)} * 5.0) + id)) * 2. - 1.;
    uvr.x += f * ${glitchIntensity.toFixed(3)};
    uvg.x += f * ${(glitchIntensity * 1.5).toFixed(3)};
    uvb.x += f * ${(glitchIntensity * 2.0).toFixed(3)};
  }
  
  float r2 = rand(vec2(floor(time * ${speedMult.toFixed(2)} * 37.), id + 10.));
  if (r2 > ${(0.95 - glitchIntensity * 0.05).toFixed(2)}) {
    uvr.x += sin(uv.y * 7. + time * ${speedMult.toFixed(2)} + id + 1.) * ${(glitchIntensity * 0.1).toFixed(3)};
    uvg.x += sin(uv.y * 5. + time * ${speedMult.toFixed(2)} + id + 2.) * ${(glitchIntensity * 0.1).toFixed(3)};
    uvb.x += sin(uv.y * 3. + time * ${speedMult.toFixed(2)} + id + 3.) * ${(glitchIntensity * 0.1).toFixed(3)};
  }
  
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);
}
`
}

// Generate shader with props-controlled values
function generateShader(props: {
    intensity: number
    scanlineIntensity: number
    chromaticAberration: number
    vignetteStrength: number
    distortionAmount: number
    noiseAmount: number
    grain: number
    speed: number
}) {
    // Map UI values (0-1) to shader ranges
    const distAmount = mapLinear(props.distortionAmount, 0, 1, 0.0, 0.6)
    const blurAmount = mapLinear(props.distortionAmount, 0, 1, 0.0, 0.6)
    const aberrationBase = mapLinear(props.chromaticAberration, 0, 1, 0.0, 0.1)
    const aberrationOffset = mapLinear(
        props.chromaticAberration,
        0,
        1,
        0.0,
        0.003
    )
    const scanline = mapLinear(props.scanlineIntensity, 0, 1, 0.0, 0.1)
    const gridBase = mapLinear(props.scanlineIntensity, 0, 1, 0.0, 0.2)
    const vignetteBase = mapLinear(props.vignetteStrength, 0, 1, 2.2, 1.4)
    const noise = mapLinear(props.noiseAmount, 0, 1, 0.0, 0.2)
    const grainControl = props.grain
    const speedMult = mapLinear(props.speed, 0, 1, 0.3, 1.7)
    const overallIntensity = mapLinear(props.intensity, 0, 1, 0.3, 1.0)

    return `
precision highp float;
uniform sampler2D src;
uniform vec2 offset;
uniform vec2 resolution;
uniform float time;
out vec4 outColor;

vec4 readTex(vec2 uv) {  
  vec4 c = texture(src, uv);  
  c.a *= smoothstep(.5, .499, abs(uv.x - .5)) * smoothstep(.5, .499, abs(uv.y - .5));
  return c;
}

vec2 zoom(vec2 uv, float t) {
  return (uv - .5) * t + .5;
}

float rand(vec3 p) {
  return fract(sin(dot(p, vec3(829., 4839., 432.))) * 39428.);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - offset) / resolution;       
  
  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;
  float l = length(p); 
   
  // distort
  float dist = pow(l, 2.) * ${distAmount.toFixed(3)};
  dist = smoothstep(0., 1., dist);
  uv = zoom(uv, 0.5 + dist);  
    
  // blur
  float blurFalloff = 1.0 - smoothstep(0.5, 0.9, l);
  float blurFalloffAggressive = blurFalloff * blurFalloff;
  float blurReduction = mix(blurFalloffAggressive, blurFalloff * 0.3 + 0.7, ${grainControl.toFixed(2)});
  vec2 du = (uv - .5);
  float a = atan(p.y, p.x);
  float rd = rand(vec3(a, time * ${speedMult.toFixed(2)}, 0));
  uv = (uv - .5) * (1.0 + rd * pow(l * 0.7, 3.) * ${blurAmount.toFixed(3)} * blurReduction) + .5;
    
  vec2 uvr = uv;
  vec2 uvg = uv;
  vec2 uvb = uv;
    
  // aberration
  float edgeFalloff = 1.0 - smoothstep(0.5, 0.9, l);
  float aberrationFalloffAggressive = edgeFalloff * edgeFalloff;
  float aberrationReduction = mix(aberrationFalloffAggressive, edgeFalloff * 0.3 + 0.7, ${grainControl.toFixed(2)});
  float d = (1. + sin(uv.y * 20. + time * 3. * ${speedMult.toFixed(2)}) * 0.1) * ${aberrationBase.toFixed(3)} * aberrationReduction;
  uvr.x += ${aberrationOffset.toFixed(4)} * aberrationReduction;
  uvb.x -= ${aberrationOffset.toFixed(4)} * aberrationReduction;
  uvr = zoom(uvr, 1. + d * l * 0.5);
  uvb = zoom(uvb, 1. - d * l * 0.5);    
    
  vec4 cr = readTex(uvr);
  vec4 cg = readTex(uvg);
  vec4 cb = readTex(uvb);  
  
  outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.);

  vec4 deco;

  // scanline
  float res = resolution.y;
  deco += (
    sin(uv.y * res * .7 + time * 100. * ${speedMult.toFixed(2)}) *
    sin(uv.y * res * .3 - time * 130. * ${speedMult.toFixed(2)})
  ) * ${scanline.toFixed(3)};

  // grid
  float gridOpacity = ${gridBase.toFixed(3)} * (0.3 + ${noise.toFixed(3)} * 3.5);
  deco += smoothstep(.01, .0, min(fract(uv.x * 20.), fract(uv.y * 20.))) * gridOpacity;

  float centerFalloff = 1.0 - smoothstep(0.9, 1.3, l) * 0.3;
  outColor += deco * centerFalloff;
  
  // vignette
  float vignette = clamp(${vignetteBase.toFixed(2)} - l * l * 0.8, 0.1, 2.0);
  outColor *= vignette;  

  // dither/noise
  float noiseFalloff = 1.0 - smoothstep(0.5, 1.0, l);
  float noiseFalloffAggressive = noiseFalloff * noiseFalloff;
  float noiseReduction = mix(noiseFalloffAggressive, noiseFalloff * 0.3 + 0.7, ${grainControl.toFixed(2)});
  outColor += rand(vec3(p, time * ${speedMult.toFixed(2)})) * ${noise.toFixed(3)} * noiseReduction;     
  
  // Apply overall intensity
  outColor.rgb *= ${overallIntensity.toFixed(2)};
}
`
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function CRTComponent(props: CRTComponentProps) {
    const {
        targetId = "",
        intensity = 0.3,
        scanlineIntensity = 0.3,
        chromaticAberration = 0.3,
        vignetteStrength = 0.4,
        distortionAmount = 0.2,
        noiseAmount = 0.3,
        grain = 0.0,
        speed = 0.5,
    } = props

    const vfxInstanceRef = useRef<{
        dispose?: () => void
        pause?: () => void
        resume?: () => void
    } | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const maskUpdateFrameRef = useRef<number | undefined>(undefined)
    const findCanvasTimeoutRef = useRef<number | null>(null)
    const isMountedRef = useRef(true)
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
    const isVisibleRef = useRef(true)
    const updateMaskRef = useRef<(() => void) | null>(null)

    // Create VFX and apply gradient mask based on viewport intersection
    useEffect(() => {
        if (!targetId) return

        const targetElement = document.getElementById(targetId)
        if (!targetElement) {
            console.warn(
                `CRT Effect: Target element with ID "${targetId}" not found`
            )
            return
        }

        // Generate shader with current prop values
        const shader = generateShader({
            intensity,
            scanlineIntensity,
            chromaticAberration,
            vignetteStrength,
            distortionAmount,
            noiseAmount,
            grain,
            speed,
        })

        // Generate light shader for text elements
        const textShader = generateTextShader({
            chromaticAberration,
            speed,
        })

        // Clean up previous instance
        if (vfxInstanceRef.current) {
            try {
                vfxInstanceRef.current.dispose?.()
            } catch (e) {
                // Ignore cleanup errors
            }
            vfxInstanceRef.current = null
        }

        // Cancel any pending timeouts
        if (findCanvasTimeoutRef.current) {
            clearTimeout(findCanvasTimeoutRef.current)
            findCanvasTimeoutRef.current = null
        }

        // Cancel any pending animation frames
        if (maskUpdateFrameRef.current) {
            cancelAnimationFrame(maskUpdateFrameRef.current)
            maskUpdateFrameRef.current = undefined
        }

        // Remove any existing VFX canvases from previous instances
        const existingCanvases = document.querySelectorAll(
            'canvas[data-engine="three.js r177"]'
        )
        existingCanvases.forEach((canvas) => {
            try {
                canvas.remove()
            } catch (e) {
                // Ignore removal errors
            }
        })

        canvasRef.current = null
        isMountedRef.current = true

        // Create VFX instance
        const vfx = new VFX({
            scrollPadding: false,
            postEffect: { shader },
        })

        // Add elements with light shader - simple approach
        const targetElements = 'div'
        const elementsToCapture = targetElement.querySelectorAll(targetElements)
        let elementIndex = 0
        elementsToCapture.forEach((element) => {
            vfx.add(element as HTMLElement, {
                shader: textShader,
                uniforms: { id: elementIndex++ },
            })
        })

        vfxInstanceRef.current = vfx

        // Set up Intersection Observer to pause animations when element is out of view
        if (typeof IntersectionObserver !== "undefined") {
            // Clean up previous observer
            if (intersectionObserverRef.current) {
                intersectionObserverRef.current.disconnect()
                intersectionObserverRef.current = null
            }

            intersectionObserverRef.current = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0]
                    const isVisible = entry.isIntersecting
                    isVisibleRef.current = isVisible

                    if (!isMountedRef.current || !vfxInstanceRef.current) return

                    // Pause/resume VFX animations
                    try {
                        if (isVisible) {
                            // Resume animations when in view
                            if (
                                typeof (
                                    vfxInstanceRef.current as {
                                        resume?: () => void
                                    }
                                ).resume === "function"
                            ) {
                                ;(
                                    vfxInstanceRef.current as {
                                        resume: () => void
                                    }
                                ).resume()
                            }
                            // Show canvas
                            if (canvasRef.current) {
                                canvasRef.current.style.display = ""
                                canvasRef.current.style.visibility = ""
                            }
                            // Restart mask animation if it was stopped
                            if (
                                !maskUpdateFrameRef.current &&
                                canvasRef.current &&
                                updateMaskRef.current
                            ) {
                                const animateMask = () => {
                                    if (
                                        !isMountedRef.current ||
                                        !vfxInstanceRef.current ||
                                        !isVisibleRef.current
                                    ) {
                                        maskUpdateFrameRef.current = undefined
                                        return
                                    }
                                    if (updateMaskRef.current) {
                                        updateMaskRef.current()
                                    }
                                    maskUpdateFrameRef.current =
                                        requestAnimationFrame(animateMask)
                                }
                                animateMask()
                            }
                        } else {
                            // Pause animations when out of view
                            if (
                                typeof (
                                    vfxInstanceRef.current as {
                                        pause?: () => void
                                    }
                                ).pause === "function"
                            ) {
                                ;(
                                    vfxInstanceRef.current as {
                                        pause: () => void
                                    }
                                ).pause()
                            }
                            // Hide canvas to stop rendering
                            if (canvasRef.current) {
                                canvasRef.current.style.display = "none"
                                canvasRef.current.style.visibility = "hidden"
                            }
                            // Cancel mask animation when out of view
                            if (maskUpdateFrameRef.current) {
                                cancelAnimationFrame(maskUpdateFrameRef.current)
                                maskUpdateFrameRef.current = undefined
                            }
                        }
                    } catch (e) {
                        // Fallback: hide/show canvas if pause/resume methods don't exist
                        if (canvasRef.current) {
                            canvasRef.current.style.display = isVisible
                                ? ""
                                : "none"
                            canvasRef.current.style.visibility = isVisible
                                ? ""
                                : "hidden"
                        }
                    }
                },
                {
                    threshold: 0,
                    rootMargin: "0px",
                }
            )

            intersectionObserverRef.current.observe(targetElement)
        }

        // Find VFX canvas after it's created
        const findAndSetupCanvas = () => {
            if (!isMountedRef.current || !vfxInstanceRef.current) {
                return
            }

            const canvas = document.querySelector(
                'canvas[data-engine="three.js r177"]'
            ) as HTMLCanvasElement
            if (canvas && canvasRef.current !== canvas) {
                canvasRef.current = canvas

                // Function to update mask gradient based on viewport intersection
                const updateMask = () => {
                    if (
                        !isMountedRef.current ||
                        !canvasRef.current ||
                        !targetElement ||
                        !vfxInstanceRef.current
                    ) {
                        if (maskUpdateFrameRef.current) {
                            cancelAnimationFrame(maskUpdateFrameRef.current)
                            maskUpdateFrameRef.current = undefined
                        }
                        return
                    }

                    const rect = targetElement.getBoundingClientRect()
                    const viewportHeight = window.innerHeight

                    const elementTop = rect.top
                    const elementBottom = rect.bottom

                    let stop1 = 0,
                        stop2 = 0,
                        stop3 = 100,
                        stop4 = 100

                    const topPercent = (elementTop / viewportHeight) * 100
                    const bottomPercent = (elementBottom / viewportHeight) * 100

                    const fadeSize = 5

                    if (elementBottom <= 0) {
                        stop1 = 0
                        stop2 = 0
                        stop3 = 0
                        stop4 = 0
                    } else if (elementTop >= viewportHeight) {
                        stop1 = 0
                        stop2 = 0
                        stop3 = 0
                        stop4 = 0
                    } else {
                        const opacityStart = Math.max(0, topPercent)
                        const opacityEnd = Math.min(100, bottomPercent)

                        stop1 = Math.max(0, opacityStart - fadeSize)
                        stop2 = opacityStart
                        stop3 = opacityEnd
                        stop4 = Math.min(100, opacityEnd + fadeSize)
                    }

                    const maskImage = `linear-gradient(to bottom, 
                        transparent ${stop1}%, 
                        black ${stop2}%, 
                        black ${stop3}%, 
                        transparent ${stop4}%
                    )`

                    canvasRef.current.style.maskImage = maskImage
                    canvasRef.current.style.webkitMaskImage = maskImage
                }

                updateMaskRef.current = updateMask

                // Update mask continuously (only when visible)
                const animateMask = () => {
                    if (!isMountedRef.current || !vfxInstanceRef.current) {
                        return
                    }
                    if (isVisibleRef.current) {
                        updateMask()
                        maskUpdateFrameRef.current =
                            requestAnimationFrame(animateMask)
                    } else {
                        maskUpdateFrameRef.current = undefined
                    }
                }

                if (isVisibleRef.current) {
                    animateMask()
                }
            } else if (
                !canvas &&
                isMountedRef.current &&
                vfxInstanceRef.current
            ) {
                // Retry if canvas not found yet
                const retryCount =
                    (findAndSetupCanvas as { retryCount?: number })
                        .retryCount || 0
                if (retryCount < 10) {
                    ;(
                        findAndSetupCanvas as { retryCount?: number }
                    ).retryCount = retryCount + 1
                    findCanvasTimeoutRef.current = window.setTimeout(
                        findAndSetupCanvas,
                        100
                    ) as unknown as number
                }
            }
        }

        // Wait for VFX to create canvas
        findCanvasTimeoutRef.current = window.setTimeout(
            findAndSetupCanvas,
            100
        ) as unknown as number

        return () => {
            isMountedRef.current = false

            // Disconnect Intersection Observer
            if (intersectionObserverRef.current) {
                intersectionObserverRef.current.disconnect()
                intersectionObserverRef.current = null
            }

            // Cancel any pending timeouts
            if (findCanvasTimeoutRef.current) {
                clearTimeout(findCanvasTimeoutRef.current)
                findCanvasTimeoutRef.current = null
            }

            // Cancel mask animation
            if (maskUpdateFrameRef.current) {
                cancelAnimationFrame(maskUpdateFrameRef.current)
                maskUpdateFrameRef.current = undefined
            }

            // Clean up VFX instance
            if (vfxInstanceRef.current) {
                try {
                    vfxInstanceRef.current.dispose?.()
                } catch (e) {
                    // Ignore cleanup errors
                }
                vfxInstanceRef.current = null
            }

            // Remove all VFX canvases
            const canvases = document.querySelectorAll(
                'canvas[data-engine="three.js r177"]'
            )
            canvases.forEach((canvas) => {
                try {
                    canvas.remove()
                } catch (e) {
                    // Ignore removal errors
                }
            })

            canvasRef.current = null
            updateMaskRef.current = null
        }
    }, [
        targetId,
        intensity,
        scanlineIntensity,
        chromaticAberration,
        vignetteStrength,
        distortionAmount,
        noiseAmount,
        grain,
        speed,
    ])

    // Return invisible placeholder
    return (
        <div
            style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
            }}
        />
    )
}

addPropertyControls(CRTComponent, {
    targetId: {
        type: ControlType.String,
        title: "Container",
        defaultValue: "",
        placeholder: "Scroll Section",
        description: "Scroll section to apply CRT effect to",
    },
    intensity: {
        type: ControlType.Number,
        title: "Brightness",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.8,
    },
    scanlineIntensity: {
        type: ControlType.Number,
        title: "Scanlines",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.2,
    },
    chromaticAberration: {
        type: ControlType.Number,
        title: "Aberration",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.3,
    },
    vignetteStrength: {
        type: ControlType.Number,
        title: "Vignette",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.8,
    },
    distortionAmount: {
        type: ControlType.Number,
        title: "Distortion",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
    },
    noiseAmount: {
        type: ControlType.Number,
        title: "Noise",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.2,
    },
    grain: {
        type: ControlType.Number,
        title: "Grain",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.6,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        description:
            "More componenets at [Framer University](https://frameruni.link/cc).",
    },
})

CRTComponent.displayName = "CRT Effect"
