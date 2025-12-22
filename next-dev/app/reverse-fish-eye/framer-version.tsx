import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Imports are to be considered correct
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    TextureLoader,
    Vector2,
    LinearFilter,
    SRGBColorSpace,
    ClampToEdgeWrapping,
    // @ts-ignore
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/bulge-effect.js"

type ResponsiveImage = {
    src: string
    srcSet?: string
    alt?: string
}

type Props = {
    image?: ResponsiveImage
    radius?: number
    strength?: number
    centerX?: number
    centerY?: number
    smoothing?: number
    cursorMode?: "Opposite" | "Follow"
    movement?: number
    fishEyeIntensity?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
export default function BulgeDistortion(props: Props) {
    const {
        image,
        radius = 0.6, // normalized (0..1) as in tutorial
        strength = 1.1,
        centerX = 0.5,
        centerY = 0.5,
        smoothing = 0.7,
        cursorMode = "Opposite",
        movement = 1.0,
        fishEyeIntensity = 1.0,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [textureLoaded, setTextureLoaded] = useState(false)

    // Detect mobile: disable interactive effects on mobile
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkMobile = () => {
            const coarse =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(pointer: coarse)").matches
                    : false
            const small =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(max-width: 768px)").matches
                    : false
            setIsMobile(coarse || small)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return

        const scene = new Scene()
        const renderer = new WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Sizing helpers
        const setSize = () => {
            // Use clientWidth/clientHeight for more reliable sizing
            const w = Math.max(container.clientWidth, 2)
            const h = Math.max(container.clientHeight, 2)
            renderer.setSize(w, h, false)
            camera.aspect = w / h
            // Update camera field of view based on new height
            const perspective = 800
            camera.fov = (180 * (2 * Math.atan(h / 2 / perspective))) / Math.PI
            camera.updateProjectionMatrix()
            uniforms.uResolution.value.set(w, h)
        }

        // Camera
        const perspective = 800
        const camera = new PerspectiveCamera(
            (180 * (2 * Math.atan(container.clientHeight / 2 / perspective))) /
                Math.PI,
            1,
            1,
            5000
        )
        camera.position.set(0, 0, perspective)

        // Load texture
        const loader = new TextureLoader()
        const src = image?.src || "/random-assets/image.png"
        const tex = loader.load(src, () => {
            setTextureLoaded(true)
            if ((tex as any).image) {
                uniforms.uTextureResolution.value.set(
                    (tex as any).image.width,
                    (tex as any).image.height
                )
            }
            renderer.render(scene, camera)
        })
        // sampling
        tex.minFilter = LinearFilter
        tex.wrapS = ClampToEdgeWrapping
        tex.wrapT = ClampToEdgeWrapping

        // Uniforms (aligned with introSphere shader naming)
        const uniforms: Record<string, any> = {
            uTexture: { value: tex },
            uResolution: { value: new Vector2(1, 1) },
            uTextureResolution: { value: new Vector2(1, 1) },
            uMousePosition: { value: new Vector2(centerX, centerY) },
            uUnwrapProgress: { value: 1.0 },
            uRotation: { value: 0.0 },
            uAutoRotationX: { value: 0.0 },
            uZoom: { value: 1.0 },
            uCursorInvert: { value: cursorMode === "Follow" ? 1.0 : -1.0 },
            uMovement: { value: movement },
            uFishEyeIntensity: { value: fishEyeIntensity },
        }

        // Mouse smoothing vectors
        const targetMouse = new Vector2(centerX, centerY)
        const currentMouse = new Vector2(centerX, centerY)
        uniforms.uMousePosition.value.copy(currentMouse)

        const vertexShader = `
            varying vec2 vUv;
            varying vec2 vScreenPosition;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                // Approximate NDC screen position from plane UV
                vScreenPosition = (uv * 2.0) - 1.0;
            }
        `

        // Adapted from introSphere shader for spherification/fisheye
        const fragmentShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vScreenPosition;
            uniform sampler2D uTexture;
            uniform vec2 uResolution;
            uniform vec2 uTextureResolution;
            uniform vec2 uMousePosition;
            uniform float uUnwrapProgress;
            uniform float uRotation;
            uniform float uAutoRotationX;
            uniform float uZoom;
            uniform float uCursorInvert;
            uniform float uMovement;
            uniform float uFishEyeIntensity;
            

            #define PI 3.1415926535897932384626433832795
            #define CAMERA_DIST 25.0

            vec3 getFishEye(vec2 uv, float level) {
                float len = max(length(uv), 1e-6);
                float a = len * level;
                return vec3(uv / len * sin(a), -cos(a));
            }

            vec3 getColor(vec2 p, sampler2D tex) {
                // Convert from NDC [-1,1] to UV [0,1]
                vec2 uv = (p + 1.0) * 0.5;
                
                // CSS object-fit: cover implementation
                float containerAspect = uResolution.x / uResolution.y;
                float imageAspect = uTextureResolution.x / uTextureResolution.y;
                
                vec2 scale = vec2(1.0);
                
                // Determine which dimension to scale to fill the container
                if (containerAspect > imageAspect) {
                    // Container is wider than image: scale image to fill container width
                    // This will crop top/bottom of the image
                    scale.y = imageAspect / containerAspect;
                } else {
                    // Container is taller than image: scale image to fill container height  
                    // This will crop left/right of the image
                    scale.x = containerAspect / imageAspect;
                }
                
                // Apply scaling
                vec2 scaledUV = (uv - 0.5) * scale + 0.5;
                
                return texture2D(tex, scaledUV).xyz;
            }

            void main(){
                vec2 p = vScreenPosition.xy;
                vec4 fragColor = vec4(0.0);

                // Use uFishEyeIntensity to control the fish eye effect
                float intensity = clamp(uFishEyeIntensity, 0.0, 1.0);
                
                float t = clamp(uUnwrapProgress, 0.0, 1.0);
                float zoom = pow(2.0 * t, 5.0) + 1.0;
                zoom *= uZoom;

                float aspect = uResolution.x / uResolution.y;
                vec3 dir;
                if (aspect >= 1.0) {
                    dir = normalize(vec3(p.x * aspect * PI, p.y * PI, -zoom * (CAMERA_DIST - 1.0)));
                } else {
                    dir = normalize(vec3(p.x * PI, p.y / aspect * PI, -zoom * (CAMERA_DIST - 1.0)));
                }

                float b = CAMERA_DIST * dir.z;
                float h = b*b - CAMERA_DIST*CAMERA_DIST + 1.0;

                if (h >= 0.0) {
                    vec3 q = vec3(0.0, 0.0, CAMERA_DIST) - dir * (b + sqrt(h));

                    float cosRot = cos(uRotation * PI * 2.0);
                    float sinRot = sin(uRotation * PI * 2.0);
                    mat3 rotationMatrix = mat3(
                        cosRot, 0.0, -sinRot,
                        0.0, 1.0, 0.0,
                        sinRot, 0.0, cosRot
                    );
                    q = rotationMatrix * q;

                    vec3 normal = normalize(q);
                    float u = atan(normal.x, normal.z) / (2.0 * PI);
                    float v = 1.0 - acos(normal.y) / PI;
                    vec2 sphereCoords = vec2(u, v);

                    // Apply mouse interaction always (not just at intensity = 1)
                    float mouseX = (uMousePosition.x - 0.5) * uCursorInvert;
                    float mouseY = (uMousePosition.y - 0.5) * uCursorInvert;
                    float mouseInfluenceX = 0.3 * clamp(uMovement, 0.0, 1.0);
                    float mouseInfluenceY = 0.2 * clamp(uMovement, 0.0, 1.0);
                    float mouseRotationX = mouseX * mouseInfluenceX * PI;
                    float mouseRotationY = mouseY * mouseInfluenceY * PI;
                    float autoRotation = uAutoRotationX;

                    // Scale the fish eye distortion by intensity, not the image
                    vec3 fisheyeDir = getFishEye(vScreenPosition.xy, 1.4 * intensity);
                    
                    // Apply mouse rotations to the fish eye direction
                    mat2 mouseRotationMatrixX = mat2(cos(mouseRotationX), -sin(mouseRotationX), sin(mouseRotationX), cos(mouseRotationX));
                    mat2 mouseRotationMatrixY = mat2(cos(mouseRotationY), -sin(mouseRotationY), sin(mouseRotationY), cos(mouseRotationY));
                    mat2 autoRotationMatrix = mat2(cos(autoRotation), -sin(autoRotation), sin(autoRotation), cos(autoRotation));
                    fisheyeDir.xz = mouseRotationMatrixX * fisheyeDir.xz;
                    fisheyeDir.yz = mouseRotationMatrixY * fisheyeDir.yz;
                    fisheyeDir.xz = autoRotationMatrix * fisheyeDir.xz;

                    // Blend between flat coordinates (p) and fish eye coordinates
                    vec2 flatCoords = p;
                    vec2 fisheyeCoords = fisheyeDir.xy;
                    vec2 finalCoords = mix(flatCoords, fisheyeCoords, intensity);
                    
                    vec3 color = getColor(finalCoords, uTexture);

                    // Apply fish eye highlighting effect based on intensity
                    float fish_eye = mix(1.0, smoothstep(2.0, 1.6, length(vScreenPosition.xy)) * 0.15 + 1.0, intensity);
                    fragColor = vec4(color * fish_eye, 1.0);
                }

                gl_FragColor = fragColor;
            }
        `

        const geometry = new PlaneGeometry(1, 1, 1, 1)
        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: false,
        })
        const mesh = new Mesh(geometry, material)
        scene.add(mesh)

        // Initial sizing and plane scale to fill container
        const updatePlane = () => {
            // Use clientWidth/clientHeight instead of getBoundingClientRect for more reliable sizing
            const width = container.clientWidth
            const height = container.clientHeight
            // Ensure the plane fills the entire container without padding
            mesh.scale.set(width, height, 1)
            // Center the mesh exactly in the container
            mesh.position.set(0, 0, 0)
        }

        const render = () => {
            // Update animation uniforms if needed
            renderer.render(scene, camera)
        }

        // Mouse move handling (normalized to component coordinates)
        const updateMouse = (clientX: number, clientY: number) => {
            // On mobile, keep mouse position fixed at center
            if (isMobile) {
                targetMouse.set(centerX, centerY)
                return
            }
            
            const rect = container.getBoundingClientRect()
            const x = (clientX - rect.left) / Math.max(rect.width, 1)
            const y = 1 - (clientY - rect.top) / Math.max(rect.height, 1)
            const clampedX = Math.max(0, Math.min(1, x))
            const clampedY = Math.max(0, Math.min(1, y))
            targetMouse.set(clampedX, clampedY)
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!isMobile) {
                updateMouse(e.clientX, e.clientY)
            }
        }
        const onTouchMove = (e: TouchEvent) => {
            // Disable touch interaction on mobile
            if (!isMobile && e.touches && e.touches.length > 0) {
                updateMouse(e.touches[0].clientX, e.touches[0].clientY)
            }
        }

        // Resize observers
        const onResize = () => {
            setSize()
            updatePlane()
            render()
        }
        setSize()
        updatePlane()
        render()

        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)
        window.addEventListener("resize", onResize)

        // In Canvas mode, force a couple of extra resizes to settle layout
        if (RenderTarget.current() === RenderTarget.canvas) {
            setTimeout(onResize, 50)
            setTimeout(onResize, 150)
        }

        let raf = 0
        let lastTime = performance.now()
        const loop = () => {
            const now = performance.now()
            const dt = Math.max(0, (now - lastTime) / 1000)
            lastTime = now
            // smoothing semantics:
            //  - s = 0 => disabled (instant follow)
            //  - s in (0,1] => exponential smoothing with bounded time constant
            const s = Math.max(0, Math.min(1, smoothing))
            if (s === 0) {
                currentMouse.copy(targetMouse)
            } else {
                // Map s to a time constant in a safe range to avoid glacial motion
                // Smaller tau => snappier; larger tau => smoother
                const tauMin = 0.04 // ~fast catch-up
                const tauMax = 0.25 // smooth but still responsive
                const tau = tauMin + (tauMax - tauMin) * s
                const alpha = 1 - Math.exp(-dt / Math.max(1e-6, tau))
                currentMouse.lerp(targetMouse, alpha)
            }
            uniforms.uMousePosition.value.set(currentMouse.x, currentMouse.y)
            raf = requestAnimationFrame(loop)
            render()
        }
        // Always run animation loop
        loop()

        // Initialize mouse at props center (always center on mobile)
        const initialX = isMobile ? 0.5 : centerX
        const initialY = isMobile ? 0.5 : centerY
        targetMouse.set(initialX, initialY)
        currentMouse.set(initialX, initialY)
        uniforms.uMousePosition.value.set(initialX, initialY)
        
        // Listeners (conditionally add based on mobile state)
        if (!isMobile) {
            container.addEventListener("mousemove", onMouseMove)
            container.addEventListener("touchmove", onTouchMove, { passive: true })
        }

        return () => {
            if (raf) cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            window.removeEventListener("resize", onResize)
            if (!isMobile) {
                container.removeEventListener("mousemove", onMouseMove)
                container.removeEventListener("touchmove", onTouchMove)
            }
            geometry.dispose()
            material.dispose()
            renderer.dispose()
        }
    }, [
        image?.src,
        radius,
        strength,
        centerX,
        centerY,
        smoothing,
        cursorMode,
        movement,
        fishEyeIntensity,
        isMobile,
    ])

    // If no image yet, show helpful message
    const hasImage = !!(image && image.src)

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "block",
                margin: 0,
                padding: 0,
                ...style,
            }}
        >
            {/* White background container */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",

                    margin: 0,
                    padding: 0,
                }}
            />

            {!hasImage ? (
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="3D Image Distortion"
                    description="Add an Image and to see a cool reverse fish eye effect"
                />
            ) : (
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        margin: 0,
                        padding: 0,
                        zIndex: 2,
                    }}
                />
            )}
        </div>
    )
}

addPropertyControls(BulgeDistortion, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    fishEyeIntensity: {
        type: ControlType.Number,
        title: "Scale",
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.025,
        displayStepper: false,
    },
    smoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        defaultValue: 0.7,
        min: 0,
        max: 1,
        step: 0.05,
        displayStepper: false,
    },
    cursorMode: {
        type: ControlType.Enum,
        title: "Cursor",
        options: ["Opposite", "Follow"],
        optionTitles: ["Opposite", "Follow"],
        defaultValue: "Opposite",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    movement: {
        type: ControlType.Number,
        title: "Movement",
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.1,
        displayStepper: false,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

BulgeDistortion.displayName = "3D Image Distortion DEV"
