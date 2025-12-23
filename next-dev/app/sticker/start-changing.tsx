import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Three.js imports from CDN
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    BoxGeometry,
    SkinnedMesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Texture,
    Vector3,
    Quaternion,
    Bone,
    Skeleton,
    Float32BufferAttribute,
    Uint16BufferAttribute,
    DoubleSide,
    FrontSide,
    RepeatWrapping,
    LinearFilter,
    SRGBColorSpace,
    RGBAFormat,
    Color,
    DirectionalLight,
    AmbientLight,
    PlaneGeometry,
    Mesh,
    Group,
    ShadowMaterial,
    PCFSoftShadowMap,
    Line,
    LineBasicMaterial,
    BufferGeometry,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

// GSAP import from CDN
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"

// OrbitControls import from Three.js examples
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-text-rug.js"

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveImageSource =
    | string
    | {
          src?: string
          srcSet?: string | Array<{ src?: string }>
          url?: string
          default?: string
          asset?: { url?: string }
          alt?: string
      }
    | null
    | undefined

interface StickerProps {
    // Main content
    image?: ResponsiveImageSource
    // Sticker settings
    unrollMode: "change-curl" | "move-start" | "hybrid"
    curlAmount: number
    curlRadius: number
    curlStart: number
    curlRotation: number // Curl direction rotation in degrees (0-360)
    curlMode: "semicircle" | "spiral"
    backColor: string
    // Lighting and shadows
    enableShadows: boolean
    shadowIntensity: number
    animationDuration: number
    shadowPositionX: number
    shadowPositionY: number
    shadowBgColor: string
    castShadowOpacity: number
    // Style (always last)
    style?: React.CSSProperties
}

// Simple image source resolution
const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || undefined
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Camera settings
const CAMERA_DISTANCE = 1200
const CAMERA_NEAR = 100
const CAMERA_FAR = 2000

// Sticker geometry - same as Reference for smoothness
const STICKER_DEPTH = 0.003

// Canvas overscan - much larger for curl to extend beyond bounds
const CANVAS_SCALE = 2.5 // Large transparent space around sticker

// 2D Bone Grid settings
const BONE_GRID_X =60 // Performance-safe bone count for hardware skinning
const BONE_GRID_Y = 60

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateCameraFov(
    width: number,
    height: number,
    distance: number
): number {
    const aspect = width / height
    return 2 * Math.atan(width / aspect / (2 * distance)) * (180 / Math.PI)
}

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

function mapInteralRadiusToUIValue(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 0.05, 1 / Math.PI)
}

/**
 * Calculates contained dimensions (like CSS object-fit: contain)
 * Maintains image aspect ratio while fitting within container bounds
 */
function calculateContainedDimensions(
    containerWidth: number,
    containerHeight: number,
    imageAspectRatio: number | null
): { width: number; height: number } {
    // If no image aspect ratio yet, use container dimensions (will be updated when image loads)
    if (!imageAspectRatio) {
        return { width: containerWidth, height: containerHeight }
    }

    const containerAspect = containerWidth / containerHeight

    if (containerAspect > imageAspectRatio) {
        // Container is wider than image: fit to height
        return {
            width: containerHeight * imageAspectRatio,
            height: containerHeight,
        }
    } else {
        // Container is taller than image: fit to width
        return {
            width: containerWidth,
            height: containerWidth / imageAspectRatio,
        }
    }
}

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

    // Handle rgba() format
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

    // Handle hex formats
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
 * When you show the same image on the back of a thin surface, it must be mirrored
 * to look consistent to the viewer when the sticker flips/curls.
 *
 * Important: never mutate the front texture. If `tex` is the same as `frontTex`,
 * we clone before mirroring.
 */
function makeBackTextureViewConsistent(tex: any, frontTex?: any): any {
    if (!tex) return null
    const out: any =
        tex === frontTex && typeof tex.clone === "function" ? tex.clone() : tex
    out.wrapS = RepeatWrapping
    out.repeat.x = -1
    out.offset.x = 1
    out.needsUpdate = true
    return out
}

// ============================================================================
// FRAMER ANNOTATIONS
// ============================================================================

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function Sticker({
    image,
    curlAmount = 0.05,
    curlRadius = 1,
    curlStart = 0.45,
    curlRotation = 0, // 0° = curl from left, 90° = from bottom, 180° = from right, 270° = from top
    curlMode = "spiral",
    unrollMode = "change-curl",
    backColor = "rgba(255, 255, 255, 1)",
    enableShadows = true,
    animationDuration = 0.6,
    shadowIntensity = 1,
    shadowPositionX = -400,
    shadowPositionY = 0,
    shadowBgColor = "rgba(0, 0, 0, 0)",
    castShadowOpacity = 0.3,
    style,
}: StickerProps) {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)
    const groupRef = useRef<any>(null) // Group for rotation around center
    const bonesRef = useRef<any[]>([])
    const bonesInitialPositionsRef = useRef<any[]>([])
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastSizeRef = useRef({
        width: 0,
        height: 0,
        zoom: 0,
        aspect: 0,
        ts: 0,
    })
    const animationFrameRef = useRef<number | null>(null)
    const loadedImageRef = useRef<HTMLImageElement | null>(null)
    const animatedCurlRef = useRef({ amount: curlAmount }) // Animated curl value for GSAP
    const isHoveringRef = useRef(false) // Track if currently hovering over sticker
    const lightRef = useRef<any>(null)
    const ambientLightRef = useRef<any>(null)
    const backgroundPlaneRef = useRef<any>(null)
    const internalRadiusRef = useRef(mapInteralRadiusToUIValue(curlRadius))
    const imageAspectRatioRef = useRef<number | null>(null) // Store image aspect ratio for contain behavior
    const debugLineRef = useRef<any>(null) // Debug line for curlStart

    // State
    const [textureLoaded, setTextureLoaded] = useState(false)

    // Detect environment
    const resolvedImageUrl = resolveImageSource(image)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hasContent = !!resolvedImageUrl

    // ========================================================================
    // CREATE STICKER GEOMETRY WITH 2D BILINEAR SKINNING
    // ========================================================================

    const createStickerGeometry = useCallback(
        (width: number, height: number, gridX: number, gridY: number) => {
            // High resolution geometry for smooth curves, independent of bone count
            const xSegments = 150 
            const ySegments = 100

            const geometry = new BoxGeometry(
                width,
                height,
                STICKER_DEPTH,
                xSegments,
                ySegments,
                1
            )

            // Geometry is centered at origin (no translation needed for 2D grid approach)
            // This keeps the sticker centered and simplifies fold line calculations

            // Add 2D bilinear skinning attributes
            const position = geometry.attributes.position
            const vertex = new Vector3()
            const skinIndexes: number[] = []
            const skinWeights: number[] = []

            // Bone grid spacing
            const boneSpacingX = width / (gridX - 1)
            const boneSpacingY = height / (gridY - 1)

            for (let i = 0; i < position.count; i++) {
                vertex.fromBufferAttribute(position, i)

                // Convert vertex position to grid coordinates (0 to gridX-1, 0 to gridY-1)
                // Geometry is centered, so vertex.x ranges from -width/2 to width/2
                const normalizedX = (vertex.x + width / 2) / width // 0 to 1
                const normalizedY = (vertex.y + height / 2) / height // 0 to 1

                // Find the 4 nearest bones (bilinear interpolation)
                const gridXPos = normalizedX * (gridX - 1)
                const gridYPos = normalizedY * (gridY - 1)

                const x0 = Math.floor(gridXPos)
                const y0 = Math.floor(gridYPos)
                const x1 = Math.min(x0 + 1, gridX - 1)
                const y1 = Math.min(y0 + 1, gridY - 1)

                // Bilinear interpolation weights
                const tx = gridXPos - x0
                const ty = gridYPos - y0

                // Four bone indices in the grid (row-major order)
                const idx00 = y0 * gridX + x0 // bottom-left
                const idx10 = y0 * gridX + x1 // bottom-right
                const idx01 = y1 * gridX + x0 // top-left
                const idx11 = y1 * gridX + x1 // top-right

                // Bilinear weights
                const w00 = (1 - tx) * (1 - ty)
                const w10 = tx * (1 - ty)
                const w01 = (1 - tx) * ty
                const w11 = tx * ty

                skinIndexes.push(idx00, idx10, idx01, idx11)
                skinWeights.push(w00, w10, w01, w11)
            }

            geometry.setAttribute(
                "skinIndex",
                new Uint16BufferAttribute(skinIndexes, 4)
            )
            geometry.setAttribute(
                "skinWeight",
                new Float32BufferAttribute(skinWeights, 4)
            )

            // Compute smooth normals AFTER skinning attributes to eliminate striations
            geometry.computeVertexNormals()

            return geometry
        },
        []
    )

    // ========================================================================
    // SCENE SETUP
    // ========================================================================

    const setupScene = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return null

        const container = containerRef.current
        const containerWidth =
            container.clientWidth || container.offsetWidth || 1
        const containerHeight =
            container.clientHeight || container.offsetHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // Calculate contained dimensions (maintains image aspect ratio)
        const contained = calculateContainedDimensions(
            containerWidth,
            containerHeight,
            imageAspectRatioRef.current
        )
        const width = contained.width
        const height = contained.height

        const canvasWidth = containerWidth * CANVAS_SCALE
        const canvasHeight = containerHeight * CANVAS_SCALE

        // Create scene
        const scene = new Scene()
        sceneRef.current = scene

        // Create camera
        const camera = new PerspectiveCamera(
            calculateCameraFov(canvasWidth, canvasHeight, CAMERA_DISTANCE),
            canvasWidth / canvasHeight,
            CAMERA_NEAR,
            CAMERA_FAR
        )
        camera.position.set(0, 0, CAMERA_DISTANCE)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Create renderer
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(
            Math.round(canvasWidth * dpr),
            Math.round(canvasHeight * dpr),
            false
        )
        renderer.setPixelRatio(1)

        // Enable high-quality shadow maps if shadows are enabled
        if (enableShadows) {
            renderer.shadowMap.enabled = true
            renderer.shadowMap.type = PCFSoftShadowMap // High quality soft shadows
        }

        rendererRef.current = renderer

        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`

        // Create geometry with base dimensions (1:1 or image aspect ratio if known)
        // We'll scale the mesh uniformly to fit the container while maintaining aspect ratio
        const baseSize = Math.min(containerWidth, containerHeight)
        const geometry = createStickerGeometry(baseSize, baseSize, BONE_GRID_X, BONE_GRID_Y)

        // Create 2D bone grid
        // Bones are independent (not parented) - each bone controls a region of the sticker
        const bones: any[] = []
        const boneSpacingX = width / (BONE_GRID_X - 1)
        const boneSpacingY = height / (BONE_GRID_Y - 1)

        for (let y = 0; y < BONE_GRID_Y; y++) {
            for (let x = 0; x < BONE_GRID_X; x++) {
                const bone = new Bone()
                // Position bones in a grid, centered at origin
                bone.position.x = -width / 2 + x * boneSpacingX
                bone.position.y = -height / 2 + y * boneSpacingY
                bone.position.z = 0
                bones.push(bone)
            }
        }

        bonesRef.current = bones
        bonesInitialPositionsRef.current = bones.map(b => b.position.clone())
        const skeleton = new Skeleton(bones)

        // Create materials for front and back
        // Use MeshStandardMaterial with low roughness (0.1) like Reference.tsx for smoothness
        // This prevents striations while still casting shadows

        // Parse back color for side material (border) - use color but always 100% opaque
        const resolvedBackColor = resolveTokenColor(backColor)
        const backColorRgba = parseColorToRgba(resolvedBackColor)

        let frontMaterial: any
        let backMaterial: any
        let sideMaterial: any

        if (enableShadows) {
            // All faces use MeshStandardMaterial with smooth roughness (like Reference.tsx)
            frontMaterial = new MeshStandardMaterial({
                color: 0xffffff,
                side: FrontSide,
                transparent: true,
                roughness: 0.2, // Higher roughness = more diffuse, reduces contrast
                metalness: 0.4,
                // Add emissive to reduce lighting dependency and striations
                emissive: 0xffffff,
                emissiveIntensity: 0.8, // High emissive to reduce lighting contrast between segments
            })

            // Back face: transparent with image texture, but darker with shadow overlay
            backMaterial = new MeshStandardMaterial({
                color: 0xffffff, // White base to show image colors
                side: FrontSide,
                transparent: true,
                roughness: 0.3, // Slightly rougher for subtle shadow effect
                metalness: 0.0,
                // Lower emissive than front to allow shadow/lighting overlay
                emissive: 0xffffff,
                emissiveIntensity: 0.3, // Lower emissive = more affected by lighting/shadows
            })

            // Side material: will use front texture when loaded (blends with front image), back color as fallback
            sideMaterial = new MeshStandardMaterial({
                color: new Color(
                    backColorRgba.r,
                    backColorRgba.g,
                    backColorRgba.b
                ),
                transparent: true,
                opacity: 1, // Visible with back color until front texture loads
                roughness: 0.1,
                metalness: 0.0,
            })
        } else {
            // No shadows: use MeshBasicMaterial for all (simpler, no lighting needed)
            frontMaterial = new MeshBasicMaterial({
                color: 0xffffff,
                side: FrontSide,
                transparent: true,
            })

            // Back material: use backColor directly (will be set via texture or color in loadTexture)
            backMaterial = new MeshBasicMaterial({
                color: new Color(
                    backColorRgba.r,
                    backColorRgba.g,
                    backColorRgba.b
                ),
                side: FrontSide,
                transparent: true,
                opacity: backColorRgba.a,
            })

            // Side material: will use front texture when loaded (blends with front image), back color as fallback
            sideMaterial = new MeshBasicMaterial({
                color: new Color(
                    backColorRgba.r,
                    backColorRgba.g,
                    backColorRgba.b
                ),
                transparent: true,
                opacity: 1, // Visible with back color until front texture loads
            })
        }

        // Materials array for BoxGeometry faces
        // Order: +X, -X, +Y, -Y, +Z (front), -Z (back)
        const materials = [
            sideMaterial, // right
            sideMaterial, // left
            sideMaterial, // top
            sideMaterial, // bottom
            frontMaterial, // front (image side)
            backMaterial, // back (paper backing)
        ]

        // Create skinned mesh
        const mesh = new SkinnedMesh(geometry, materials)
        // Add all bones to the mesh (they are independent siblings)
        bones.forEach(bone => mesh.add(bone))
        mesh.bind(skeleton)
        mesh.frustumCulled = false

        // Enable shadows if configured
        // According to Three.js forum: setting both castShadow and receiveShadow can cause acne
        // The sticker casts shadows onto the background plane, but doesn't need to receive them
        if (enableShadows) {
            mesh.castShadow = true
            mesh.receiveShadow = false // Don't receive shadows to avoid acne
        }

        // Calculate initial scale to fit container with aspect ratio (if image aspect ratio is known)
        // Otherwise, use container dimensions
        let initialScaleX = 1
        let initialScaleY = 1
        if (imageAspectRatioRef.current) {
            const contained = calculateContainedDimensions(
                containerWidth,
                containerHeight,
                imageAspectRatioRef.current
            )
            initialScaleX = contained.width / baseSize
            initialScaleY = contained.height / baseSize
        } else {
            // No image yet - use container dimensions
            initialScaleX = containerWidth / baseSize
            initialScaleY = containerHeight / baseSize
        }
        mesh.scale.set(initialScaleX, initialScaleY, 1)

        // Create a group (no rotation - image stays upright, curl direction is handled by bone rotation axis)
        const group = new Group()
        groupRef.current = group

        // Mesh is centered at origin (no position offset needed with 2D grid approach)
        mesh.position.set(0, 0, 0)

        group.add(mesh)
        meshRef.current = mesh
        scene.add(group)

        // No group rotation - curlRotation is handled by rotating the fold line axis in updateBones()

        // Add lighting if shadows are enabled
        if (enableShadows) {
            // Calculate initial light intensities based on shadowIntensity
            // High shadowIntensity = strong directional, low ambient = dark shadows
            // At shadowIntensity = 1, make shadows very dramatic (strong directional, low ambient)
            const initialLightIntensity = 0.3 + shadowIntensity * 1.7 // 0.3 to 2.0 (more dramatic at max)
            const initialAmbientIntensity = Math.max(
                1.0 - shadowIntensity * 0.6,
                0.4
            ) // 1.0 to 0.4 (lower at max for drama)

            // Ambient light for overall scene illumination
            // Lower ambient allows shadows to be more visible
            const ambientLight = new AmbientLight(
                0xffffff,
                initialAmbientIntensity
            )
            ambientLightRef.current = ambientLight
            scene.add(ambientLight)

            // Directional light for shadows (reduced intensity to minimize band contrast)
            const directionalLight = new DirectionalLight(
                0xffffff,
                initialLightIntensity
            )
            directionalLight.position.set(shadowPositionX, shadowPositionY, 400)
            directionalLight.castShadow = true

            // Configure shadow map for high-quality, soft shadows
            directionalLight.shadow.mapSize.width = 4096
            directionalLight.shadow.mapSize.height = 4096
            directionalLight.shadow.camera.near = 1
            directionalLight.shadow.camera.far = 2000
            // Use container dimensions for shadow camera (not contained dimensions)
            directionalLight.shadow.camera.left = -containerWidth * 2
            directionalLight.shadow.camera.right = containerWidth * 2
            directionalLight.shadow.camera.top = containerHeight * 2
            directionalLight.shadow.camera.bottom = -containerHeight * 2
            // Very small bias to prevent acne while keeping shadow visible
            directionalLight.shadow.bias = -0.00001
            directionalLight.shadow.radius = 8 // Softer shadow edges

            lightRef.current = directionalLight
            scene.add(directionalLight)

            // Add background plane to receive shadows
            // Add shadow-only plane (transparent background with visible shadow)
            // ShadowMaterial shows ONLY shadows on transparent background
            const shadowMat = new ShadowMaterial({
                opacity: castShadowOpacity,
                color: 0x000000, // Black shadow
            })

            // Create plane sized to component (slightly larger for shadow overflow)
            const planeWidth = Math.max(containerWidth, width) * 1.5
            const planeHeight = Math.max(containerHeight, height) * 1.5
            const planeGeometry = new PlaneGeometry(planeWidth, planeHeight)
            const backgroundPlane = new Mesh(planeGeometry, shadowMat)
            backgroundPlane.receiveShadow = true
            // Position very slightly behind sticker
            backgroundPlane.position.set(0, 0, -1)
            backgroundPlaneRef.current = backgroundPlane
            scene.add(backgroundPlane)
        }

        return { scene, camera, renderer, mesh, bones }
    }, [
        createStickerGeometry,
        enableShadows,
        shadowIntensity,
        shadowPositionX,
        shadowPositionY,
        castShadowOpacity,
        backColor,
    ])

    // ========================================================================
    // RENDERING
    // ========================================================================

    const renderFrame = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return
        rendererRef.current.render(sceneRef.current, cameraRef.current)
    }, [])

    // ========================================================================
    // BACK TEXTURE CREATION
    // ========================================================================

    /**
     * Creates a back texture that blends backColor with the front image
     * If backColor is 100% opaque, shows just the color
     * If backColor has transparency, blends it with the front image
     */
    const createBackTexture = useCallback(
        (img: HTMLImageElement, backColorValue: string): any => {
            const backCanvas = document.createElement("canvas")
            backCanvas.width = img.width
            backCanvas.height = img.height
            const backCtx = backCanvas.getContext("2d")

            if (!backCtx) return null

            // Parse back color
            const resolvedBackColor = resolveTokenColor(backColorValue)
            const backColorRgba = parseColorToRgba(resolvedBackColor)

            // Draw the front image first (as base)
            backCtx.drawImage(img, 0, 0)
            const imageData = backCtx.getImageData(0, 0, img.width, img.height)

            // Blend backColor with the image based on opacity
            // If opacity is 1.0, replace image with color
            // If opacity < 1.0, blend color over image
            const backR = Math.round(backColorRgba.r * 255)
            const backG = Math.round(backColorRgba.g * 255)
            const backB = Math.round(backColorRgba.b * 255)
            const backA = backColorRgba.a

            for (let i = 0; i < imageData.data.length; i += 4) {
                const imgR = imageData.data[i]
                const imgG = imageData.data[i + 1]
                const imgB = imageData.data[i + 2]
                const imgA = imageData.data[i + 3] / 255 // Normalize alpha

                if (backA >= 1.0) {
                    // Fully opaque: replace with back color (but preserve image alpha shape)
                    imageData.data[i] = backR
                    imageData.data[i + 1] = backG
                    imageData.data[i + 2] = backB
                    // Keep original alpha to maintain image shape
                } else if (backA > 0) {
                    // Semi-transparent: blend back color over image
                    // Alpha blending: result = backColor * backA + image * (1 - backA)
                    imageData.data[i] = Math.round(
                        backR * backA + imgR * (1 - backA)
                    )
                    imageData.data[i + 1] = Math.round(
                        backG * backA + imgG * (1 - backA)
                    )
                    imageData.data[i + 2] = Math.round(
                        backB * backA + imgB * (1 - backA)
                    )
                    // Keep original alpha to maintain image shape
                }
                // If backA is 0, keep original image (fully transparent back color)
            }

            backCtx.putImageData(imageData, 0, 0)

            const backTexture = new Texture(backCanvas)
            backTexture.needsUpdate = true
            backTexture.minFilter = LinearFilter
            backTexture.colorSpace = SRGBColorSpace
            backTexture.format = RGBAFormat

            return backTexture
        },
        [enableShadows]
    )

    // ========================================================================
    // MESH RECREATION WITH ASPECT RATIO
    // ========================================================================

    // Function to recreate geometry and mesh with correct aspect ratio
    const recreateMeshWithAspectRatio = useCallback(
        (aspectRatio: number) => {
            if (
                !sceneRef.current ||
                !containerRef.current ||
                !rendererRef.current ||
                !cameraRef.current
            )
                return

            const container = containerRef.current
            const containerWidth =
                container.clientWidth || container.offsetWidth || 1
            const containerHeight =
                container.clientHeight || container.offsetHeight || 1

            // Calculate contained dimensions
            const contained = calculateContainedDimensions(
                containerWidth,
                containerHeight,
                aspectRatio
            )

            // Remove old mesh if it exists
            if (meshRef.current) {
                sceneRef.current.remove(meshRef.current)
                meshRef.current.geometry.dispose()
                if (Array.isArray(meshRef.current.material)) {
                    meshRef.current.material.forEach((mat: any) =>
                        mat.dispose()
                    )
                } else {
                    meshRef.current.material.dispose()
                }
            }

            // Create new geometry with correct aspect ratio using 2D bone grid
            const geometry = createStickerGeometry(
                contained.width,
                contained.height,
                BONE_GRID_X,
                BONE_GRID_Y
            )

            // Recreate 2D bone grid
            const bones: any[] = []
            const boneSpacingX = contained.width / (BONE_GRID_X - 1)
            const boneSpacingY = contained.height / (BONE_GRID_Y - 1)

            for (let y = 0; y < BONE_GRID_Y; y++) {
                for (let x = 0; x < BONE_GRID_X; x++) {
                    const bone = new Bone()
                    // Position bones in a grid, centered at origin
                    bone.position.x = -contained.width / 2 + x * boneSpacingX
                    bone.position.y = -contained.height / 2 + y * boneSpacingY
                    bone.position.z = 0
                    bones.push(bone)
                }
            }

            bonesRef.current = bones
            bonesInitialPositionsRef.current = bones.map(b => b.position.clone())
            const skeleton = new Skeleton(bones)

            // Recreate materials (reuse existing material setup logic from setupScene)
            // Parse back color for side material (border) - use color but always 100% opaque
            const resolvedBackColor = resolveTokenColor(backColor)
            const backColorRgba = parseColorToRgba(resolvedBackColor)

            let frontMaterial: any
            let backMaterial: any
            let sideMaterial: any

            if (enableShadows) {
                frontMaterial = new MeshStandardMaterial({
                    color: 0xffffff,
                    side: FrontSide,
                    transparent: true,
                    roughness: 0.2,
                    metalness: 0.4,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.8,
                })

                backMaterial = new MeshStandardMaterial({
                    color: 0xffffff,
                    side: FrontSide,
                    transparent: true,
                    roughness: 0.3,
                    metalness: 0.0,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.3,
                })

                // Side material: will use front texture when loaded (blends with front image), back color as fallback
                sideMaterial = new MeshStandardMaterial({
                    color: new Color(
                        backColorRgba.r,
                        backColorRgba.g,
                        backColorRgba.b
                    ),
                    transparent: true,
                    opacity: 1, // Visible with back color until front texture loads
                    roughness: 0.1,
                    metalness: 0.0,
                })
            } else {
                frontMaterial = new MeshBasicMaterial({
                    color: 0xffffff,
                    side: FrontSide,
                    transparent: true,
                })

                // Back material: use backColor directly (will be set via texture or color in loadTexture)
                backMaterial = new MeshBasicMaterial({
                    color: new Color(
                        backColorRgba.r,
                        backColorRgba.g,
                        backColorRgba.b
                    ),
                    side: FrontSide,
                    transparent: true,
                    opacity: backColorRgba.a,
                })

                // Side material: will use front texture when loaded (blends with front image), back color as fallback
                sideMaterial = new MeshBasicMaterial({
                    color: new Color(
                        backColorRgba.r,
                        backColorRgba.g,
                        backColorRgba.b
                    ),
                    transparent: true,
                    opacity: 1, // Visible with back color until front texture loads
                })
            }

            const materials = [
                sideMaterial,
                sideMaterial,
                sideMaterial,
                sideMaterial,
                frontMaterial,
                backMaterial,
            ]

            // Create new mesh
            const mesh = new SkinnedMesh(geometry, materials)
            // Add all bones to the mesh
            bones.forEach(bone => mesh.add(bone))
            mesh.bind(skeleton)
            mesh.frustumCulled = false

            if (enableShadows) {
                mesh.castShadow = true
                mesh.receiveShadow = false
            }

            // Mesh is centered at origin (no position offset needed with 2D grid approach)
            mesh.position.set(0, 0, 0)

            // Create or get group (no rotation - image stays upright)
            let group = groupRef.current
            if (!group) {
                group = new Group()
                groupRef.current = group
                sceneRef.current.add(group)
            } else {
                // Remove old mesh from group if it exists
                const oldMesh = group.children.find(
                    (child: any) => child === meshRef.current
                )
                if (oldMesh) {
                    group.remove(oldMesh)
                }
            }

            group.add(mesh)

            // No group rotation - curlRotation is handled by bone rotation axis in updateBones()

            meshRef.current = mesh

            // Apply textures if they're already loaded
            if (loadedImageRef.current) {
                const img = loadedImageRef.current
                const texture = new Texture(img)
                texture.needsUpdate = true
                texture.minFilter = LinearFilter
                texture.colorSpace = SRGBColorSpace
                texture.format = RGBAFormat

                // Create back texture: blend backColor with front image
                // If backColor is fully transparent (0% opacity), use front texture directly
                const resolvedBackColor = resolveTokenColor(backColor)
                const backColorRgba = parseColorToRgba(resolvedBackColor)
                const rawBackTexture =
                    backColorRgba.a <= 0
                        ? texture
                        : createBackTexture(img, backColor)
                const backTexture = makeBackTextureViewConsistent(
                    rawBackTexture,
                    texture
                )

                const meshMaterials = mesh.material as any[]
                if (Array.isArray(meshMaterials)) {
                    if (meshMaterials[4]) {
                        meshMaterials[4].map = texture
                        meshMaterials[4].transparent = true
                        meshMaterials[4].alphaTest = 0.01
                        if (meshMaterials[4].emissiveIntensity !== undefined) {
                            meshMaterials[4].emissiveMap = texture
                            meshMaterials[4].emissive = new Color(0xffffff)
                            meshMaterials[4].emissiveIntensity = 0.8
                        }
                        meshMaterials[4].needsUpdate = true
                    }
                    if (meshMaterials[5]) {
                        const resolvedBackColor = resolveTokenColor(backColor)
                        const backColorRgba =
                            parseColorToRgba(resolvedBackColor)

                        if (enableShadows) {
                            // With shadows: use texture (MeshStandardMaterial)
                            if (backTexture) {
                                meshMaterials[5].map = backTexture
                                meshMaterials[5].transparent = true
                                meshMaterials[5].alphaTest = 0.01

                                // When using front texture (0% opacity), match front material properties for identical appearance
                                if (
                                    backColorRgba.a <= 0 &&
                                    meshMaterials[5].emissiveIntensity !==
                                        undefined
                                ) {
                                    meshMaterials[5].emissiveMap = texture
                                    meshMaterials[5].emissive = new Color(
                                        0xffffff
                                    )
                                    meshMaterials[5].emissiveIntensity = 0.8 // Match front material
                                }
                            }
                        } else {
                            // No shadows: use texture if available, otherwise use flat color (MeshBasicMaterial)
                            if (backTexture && backColorRgba.a > 0) {
                                // Use texture for blended effect
                                meshMaterials[5].map = backTexture
                                meshMaterials[5].transparent = true
                                meshMaterials[5].alphaTest = 0.01
                            } else if (backColorRgba.a <= 0) {
                                // Fully transparent: use front texture
                                meshMaterials[5].map = texture
                                meshMaterials[5].transparent = true
                                meshMaterials[5].alphaTest = 0.01
                            } else {
                                // Fully opaque: use flat color (no texture needed)
                                meshMaterials[5].map = null
                                meshMaterials[5].color.setRGB(
                                    backColorRgba.r,
                                    backColorRgba.g,
                                    backColorRgba.b
                                )
                                meshMaterials[5].opacity = backColorRgba.a
                            }
                        }

                        meshMaterials[5].needsUpdate = true
                    }
                    // Side faces (border): use front face texture - blends with front image, not background
                    for (let i = 0; i < 4; i++) {
                        if (meshMaterials[i] && texture) {
                            // Use front face texture so border blends with front image
                            meshMaterials[i].map = texture
                            meshMaterials[i].transparent = true
                            meshMaterials[i].alphaTest = 0.01
                            // Match front material properties if using MeshStandardMaterial
                            if (
                                meshMaterials[i].emissiveIntensity !==
                                    undefined &&
                                meshMaterials[4]?.emissiveIntensity !==
                                    undefined
                            ) {
                                meshMaterials[i].emissiveMap = texture
                                meshMaterials[i].emissive =
                                    meshMaterials[4].emissive ||
                                    new Color(0xffffff)
                                meshMaterials[i].emissiveIntensity =
                                    meshMaterials[4].emissiveIntensity || 0.8
                            }
                            meshMaterials[i].needsUpdate = true
                        }
                    }
                }
            }

            renderFrame()
        },
        [
            createStickerGeometry,
            backColor,
            enableShadows,
            createBackTexture,
            renderFrame,
        ]
    )

    // ========================================================================
    // TEXTURE LOADING
    // ========================================================================

    const loadTexture = useCallback(() => {
        if (!resolvedImageUrl || !meshRef.current) {
            setTextureLoaded(false)
            return
        }

        setTextureLoaded(false)

        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            if (!meshRef.current?.material) return

            // Store reference for border color updates
            loadedImageRef.current = img

            // Detect and store image aspect ratio for contain behavior
            if (img.width && img.height) {
                const aspectRatio = img.width / img.height
                imageAspectRatioRef.current = aspectRatio

                // Recreate mesh with correct aspect ratio geometry
                recreateMeshWithAspectRatio(aspectRatio)

                // Update bones after mesh is recreated
                setTimeout(() => {
                    if (meshRef.current && groupRef.current) {
                        // No group rotation - curlRotation is handled by bone rotation axis
                        if (bonesRef.current.length > 0) {
                            updateBones()
                        }
                        renderFrame()
                    }
                }, 0)
            }

            // Create main texture for front face
            const texture = new Texture(img)
            texture.needsUpdate = true
            texture.minFilter = LinearFilter
            texture.colorSpace = SRGBColorSpace
            texture.format = RGBAFormat

            // Create back face texture: blend backColor with front image
            // If backColor is fully transparent (0% opacity), use front texture directly
            const resolvedBackColor = resolveTokenColor(backColor)
            const backColorRgba = parseColorToRgba(resolvedBackColor)
            const rawBackTexture =
                backColorRgba.a <= 0
                    ? texture
                    : createBackTexture(img, backColor)
            const backTexture = makeBackTextureViewConsistent(
                rawBackTexture,
                texture
            )

            // Apply textures to materials
            const materials = meshRef.current.material as any[]
            if (Array.isArray(materials)) {
                // Front face: image texture, use alphaTest for clean cutout
                // When using MeshStandardMaterial, also set emissiveMap so colors stay bright
                if (materials[4]) {
                    materials[4].map = texture
                    materials[4].transparent = true
                    materials[4].alphaTest = 0.01 // Discard nearly-transparent pixels
                    // If MeshStandardMaterial, use emissiveMap to keep image bright and reduce striations
                    if (materials[4].emissiveIntensity !== undefined) {
                        materials[4].emissiveMap = texture // Emit the image colors
                        materials[4].emissive = new Color(0xffffff) // Allow full emissive color
                        // Increase emissive intensity to reduce lighting dependency and striations
                        materials[4].emissiveIntensity = 0.8
                    }
                    materials[4].needsUpdate = true
                }
                // Back face: apply texture or color based on backColor
                if (materials[5]) {
                    const resolvedBackColor = resolveTokenColor(backColor)
                    const backColorRgba = parseColorToRgba(resolvedBackColor)

                    if (enableShadows) {
                        // With shadows: use texture (MeshStandardMaterial)
                        if (backTexture) {
                            materials[5].map = backTexture
                            materials[5].transparent = true
                            materials[5].alphaTest = 0.01

                            // When using front texture (0% opacity), match front material properties for identical appearance
                            if (
                                backColorRgba.a <= 0 &&
                                materials[5].emissiveIntensity !== undefined
                            ) {
                                materials[5].emissiveMap = texture
                                materials[5].emissive = new Color(0xffffff)
                                materials[5].emissiveIntensity = 0.8 // Match front material
                            }
                        }
                    } else {
                        // No shadows: use texture if available, otherwise use flat color (MeshBasicMaterial)
                        if (backTexture && backColorRgba.a > 0) {
                            // Use texture for blended effect
                            materials[5].map = backTexture
                            materials[5].transparent = true
                            materials[5].alphaTest = 0.01
                        } else if (backColorRgba.a <= 0) {
                            // Fully transparent: use front texture
                            materials[5].map = texture
                            materials[5].transparent = true
                            materials[5].alphaTest = 0.01
                        } else {
                            // Fully opaque: use flat color (no texture needed)
                            materials[5].map = null
                            materials[5].color.setRGB(
                                backColorRgba.r,
                                backColorRgba.g,
                                backColorRgba.b
                            )
                            materials[5].opacity = backColorRgba.a
                        }
                    }

                    materials[5].needsUpdate = true
                }
                // Side faces (border): use front face texture - blends with front image, not background
                for (let i = 0; i < 4; i++) {
                    if (materials[i] && texture) {
                        // Use front face texture so border blends with front image
                        materials[i].map = texture
                        materials[i].transparent = true
                        materials[i].alphaTest = 0.01
                        // Match front material properties if using MeshStandardMaterial
                        if (
                            materials[i].emissiveIntensity !== undefined &&
                            materials[4]?.emissiveIntensity !== undefined
                        ) {
                            materials[i].emissiveMap = texture
                            materials[i].emissive =
                                materials[4].emissive || new Color(0xffffff)
                            materials[i].emissiveIntensity =
                                materials[4].emissiveIntensity || 0.8
                        }
                        materials[i].needsUpdate = true
                    }
                }
            }

            setTextureLoaded(true)
            renderFrame()
        }
        img.onerror = () => {
            console.error("Texture loading error")
            setTextureLoaded(false)
        }
        img.src = resolvedImageUrl
    }, [
        resolvedImageUrl,
        backColor,
        createBackTexture,
        renderFrame,
        recreateMeshWithAspectRatio,
    ])
    
    // Note: updateBones is called in setTimeout inside loadTexture, so it doesn't need to be a dependency
    // It will be available at runtime when the setTimeout executes

    // ========================================================================
    // BONE ANIMATION (2D Bone Grid with Fold Line)
    // ========================================================================

    // ========================================================================
    // BONE ANIMATION (2D Bone Grid with Fold Line)
    // ========================================================================

    const updateBones = useCallback(() => {
        if (!bonesRef.current.length || !meshRef.current || !bonesInitialPositionsRef.current.length) return

        const bones = bonesRef.current
        const initialPositions = bonesInitialPositionsRef.current
        const curlFactor = Math.max(0.0001, animatedCurlRef.current.amount)
        const r = internalRadiusRef.current

        const mesh = meshRef.current
        const width = mesh.geometry.parameters.width * mesh.scale.x
        const height = mesh.geometry.parameters.height * mesh.scale.y
        const diagonalLength = Math.sqrt(width * width + height * height)
        const maxDistFromCenter = diagonalLength / 2

        const curlRotationRad = (curlRotation * Math.PI) / 180
        const dirX = Math.cos(curlRotationRad)
        const dirY = Math.sin(curlRotationRad)
        const axisX = -dirY
        const axisY = dirX
        const rotationAxis = new Vector3(axisX, axisY, 0).normalize()

        // foldOffset: position of the fold line along the 'dir' axis
        const foldOffset = -maxDistFromCenter + curlStart * 2 * maxDistFromCenter
        const radiusWorld = r * maxDistFromCenter
        
        // RPrime is the current bending radius. As f -> 0, RPrime -> infinity (flat)
        const RPrime = radiusWorld / curlFactor
        const arcLimit = Math.PI * radiusWorld

        for (let i = 0; i < bones.length; i++) {
            const bone = bones[i]
            const initialPos = initialPositions[i]
            const distOnDir = initialPos.x * dirX + initialPos.y * dirY
            const signedDist = distOnDir - foldOffset

            if (signedDist > 0) {
                let xRel, zRel, finalAngle
                
                if (curlMode === "semicircle") {
                    // Semicircle: follow arc of radius RPrime for arcLimit distance, then go straight
                    const angle_s = signedDist * curlFactor / radiusWorld
                    if (signedDist <= arcLimit) {
                        xRel = RPrime * Math.sin(angle_s)
                        zRel = RPrime * (1 - Math.cos(angle_s))
                        finalAngle = angle_s
                    } else {
                        const Phi = Math.PI * curlFactor
                        const xArcEnd = RPrime * Math.sin(Phi)
                        const zArcEnd = RPrime * (1 - Math.cos(Phi))
                        const extra = signedDist - arcLimit
                        // Part past the arc is straight along the tangent at Phi
                        xRel = xArcEnd + extra * Math.cos(Phi)
                        zRel = zArcEnd + extra * Math.sin(Phi)
                        finalAngle = Phi
                    }
                } else {
                    // Spiral mode: tighten the radius as we wrap
                    const angle_sp = signedDist * curlFactor / radiusWorld
                    const spiralDecay = 0.85
                    const effectiveR = radiusWorld * Math.pow(spiralDecay, angle_sp / Math.PI)
                    const effectiveRPrime = effectiveR / curlFactor
                    
                    xRel = effectiveRPrime * Math.sin(angle_sp)
                    zRel = effectiveRPrime * (1 - Math.cos(angle_sp))
                    finalAngle = angle_sp
                }

                const dx = xRel - signedDist
                bone.position.x = initialPos.x + dx * dirX
                bone.position.y = initialPos.y + dx * dirY
                bone.position.z = initialPos.z + zRel

                const quat = new Quaternion()
                quat.setFromAxisAngle(rotationAxis, -finalAngle)
                bone.quaternion.copy(quat)
            } else {
                bone.position.copy(initialPos)
                bone.quaternion.identity()
            }
        }

        if (meshRef.current.skeleton) {
            meshRef.current.skeleton.update()
        }

        // Draw debug line along the fold line
        if (groupRef.current) {
            if (debugLineRef.current) {
                groupRef.current.remove(debugLineRef.current)
                debugLineRef.current.geometry.dispose()
                debugLineRef.current.material.dispose()
            }

            const centerX = foldOffset * dirX
            const centerY = foldOffset * dirY

            const lineHalfLen = maxDistFromCenter * 1.5
            const points = [
                new Vector3(centerX - axisX * lineHalfLen, centerY - axisY * lineHalfLen, 0.1),
                new Vector3(centerX + axisX * lineHalfLen, centerY + axisY * lineHalfLen, 0.1),
            ]
            const lineGeometry = new BufferGeometry().setFromPoints(points)
            const lineMaterial = new LineBasicMaterial({ color: 0x0000ff })
            const line = new Line(lineGeometry, lineMaterial)
            debugLineRef.current = line
            groupRef.current.add(line)
        }

        renderFrame()
    }, [curlStart, curlMode, curlRotation, renderFrame, curlAmount])

    // ========================================================================
    // HOVER ANIMATION WITH GSAP
    // ========================================================================

    // Check if mouse is over non-transparent part of sticker
    const checkMouseOverSticker = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (
                !canvasRef.current ||
                !containerRef.current ||
                !loadedImageRef.current
            ) {
                return false
            }

            const canvas = canvasRef.current
            const container = containerRef.current
            const img = loadedImageRef.current
            const rect = canvas.getBoundingClientRect()

            // Get container dimensions
            const containerWidth =
                container.clientWidth || container.offsetWidth || 1
            const containerHeight =
                container.clientHeight || container.offsetHeight || 1

            // Calculate contained dimensions (actual sticker size)
            const contained = calculateContainedDimensions(
                containerWidth,
                containerHeight,
                imageAspectRatioRef.current
            )
            const stickerWidth = contained.width
            const stickerHeight = contained.height

            // Calculate mouse position relative to canvas
            const canvasX = event.clientX - rect.left
            const canvasY = event.clientY - rect.top

            // Account for canvas scale offset (canvas is larger than container)
            const canvasOffsetX = (rect.width - containerWidth) / 2
            const canvasOffsetY = (rect.height - containerHeight) / 2

            // Account for sticker centering within container (contained dimensions are smaller)
            const stickerOffsetX = (containerWidth - stickerWidth) / 2
            const stickerOffsetY = (containerHeight - stickerHeight) / 2

            // Convert to sticker-relative coordinates
            const stickerX = canvasX - canvasOffsetX - stickerOffsetX
            const stickerY = canvasY - canvasOffsetY - stickerOffsetY

            // Check if mouse is within sticker bounds
            if (
                stickerX < 0 ||
                stickerX > stickerWidth ||
                stickerY < 0 ||
                stickerY > stickerHeight
            ) {
                return false
            }

            // Map sticker coordinates to image coordinates
            const imageX = Math.floor((stickerX / stickerWidth) * img.width)
            const imageY = Math.floor((stickerY / stickerHeight) * img.height)

            // Clamp coordinates to image bounds
            const clampedX = Math.max(0, Math.min(img.width - 1, imageX))
            const clampedY = Math.max(0, Math.min(img.height - 1, imageY))

            // Create temporary canvas to read pixel data
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const ctx = tempCanvas.getContext("2d")
            if (!ctx) return false

            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(clampedX, clampedY, 1, 1)
            const alpha = imageData.data[3]

            // Return true if pixel is not transparent (alpha > threshold)
            return alpha > 10
        },
        []
    )

    // Mouse move handler: check if over sticker and trigger animations
    const handleMouseMove = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const isOverSticker = checkMouseOverSticker(event)
            const wasHovering = isHoveringRef.current

            if (isOverSticker && !wasHovering) {
                // Entering sticker: animate to flat
                isHoveringRef.current = true
                gsap.to(animatedCurlRef.current, {
                    amount: 0,
                    duration: animationDuration,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        updateBones()
                    },
                })
            } else if (!isOverSticker && wasHovering) {
                // Leaving sticker: animate back to original curl
                isHoveringRef.current = false
                gsap.to(animatedCurlRef.current, {
                    amount: curlAmount,
                    duration: animationDuration,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        updateBones()
                    },
                })
            }
        },
        [checkMouseOverSticker, curlAmount, updateBones]
    )

    // Mouse leave handler: always reset when leaving canvas
    const handleMouseLeave = useCallback(() => {
        if (isHoveringRef.current) {
            isHoveringRef.current = false
            gsap.to(animatedCurlRef.current, {
                amount: curlAmount,
                duration: animationDuration,
                ease: "power2.out",
                onUpdate: () => {
                    updateBones()
                },
            })
        }
    }, [curlAmount, updateBones])

    // ========================================================================
    // RESIZE HANDLING
    // ========================================================================

    const updateSize = useCallback(
        (containerWidth: number, containerHeight: number) => {
            if (
                !cameraRef.current ||
                !rendererRef.current ||
                !meshRef.current ||
                !canvasRef.current
            )
                return

            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const canvasWidth = containerWidth * CANVAS_SCALE
            const canvasHeight = containerHeight * CANVAS_SCALE

            // Calculate contained dimensions (maintains image aspect ratio)
            const contained = calculateContainedDimensions(
                containerWidth,
                containerHeight,
                imageAspectRatioRef.current
            )
            const width = contained.width
            const height = contained.height

            // Update camera
            cameraRef.current.aspect = canvasWidth / canvasHeight
            cameraRef.current.fov = calculateCameraFov(
                canvasWidth,
                canvasHeight,
                CAMERA_DISTANCE
            )
            cameraRef.current.updateProjectionMatrix()

            // Update renderer
            rendererRef.current.setSize(
                Math.round(canvasWidth * dpr),
                Math.round(canvasHeight * dpr),
                false
            )
            canvasRef.current.style.width = `${canvasWidth}px`
            canvasRef.current.style.height = `${canvasHeight}px`

            // If we have an image aspect ratio, recreate mesh with correct geometry
            // Otherwise, scale the existing mesh uniformly
            if (imageAspectRatioRef.current && meshRef.current) {
                // Recreate mesh with correct aspect ratio geometry
                recreateMeshWithAspectRatio(imageAspectRatioRef.current)
                // Restore curl after mesh recreation
                setTimeout(() => {
                    if (meshRef.current && bonesRef.current.length > 0) {
                        updateBones()
                        renderFrame()
                    }
                }, 0)
            } else if (meshRef.current) {
                // No image aspect ratio yet - scale uniformly based on container
                const baseSize = meshRef.current.geometry.parameters.width
                const uniformScale =
                    Math.min(containerWidth, containerHeight) / baseSize
                meshRef.current.scale.set(uniformScale, uniformScale, 1)
                // Mesh stays centered at origin (no position offset with 2D grid)
                meshRef.current.position.set(0, 0, 0)
            }

            // Update shadow camera if shadows are enabled
            if (enableShadows && lightRef.current) {
                lightRef.current.shadow.camera.left = -containerWidth * 2
                lightRef.current.shadow.camera.right = containerWidth * 2
                lightRef.current.shadow.camera.top = containerHeight * 2
                lightRef.current.shadow.camera.bottom = -containerHeight * 2
                lightRef.current.shadow.camera.updateProjectionMatrix()
            }
        },
        [
            enableShadows,
            recreateMeshWithAspectRatio,
            updateBones,
            renderFrame,
        ]
    )

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Reset aspect ratio when image changes
    useEffect(() => {
        imageAspectRatioRef.current = null
    }, [resolvedImageUrl])

    // Initialize scene
    useEffect(() => {
        if (!hasContent) {
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            meshRef.current = null
            bonesRef.current = []
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
            imageAspectRatioRef.current = null
            return
        }

        setupScene()

        setTimeout(() => {
            updateBones()
            loadTexture()
        }, 0)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
        }
    }, [hasContent, setupScene, loadTexture, recreateMeshWithAspectRatio])

    // Sync animated curl ref with prop changes
    useEffect(() => {
        animatedCurlRef.current.amount = curlAmount
    }, [curlAmount])

    // Update internalRadius when curlRadius prop changes
    useEffect(() => {
        internalRadiusRef.current = mapInteralRadiusToUIValue(curlRadius)
        updateBones()
    }, [curlRadius, updateBones])

    // Update bones when curlStart or curlMode changes
    // Note: curlAmount is handled by GSAP animations via animatedCurlRef
    useEffect(() => {
        updateBones()
    }, [curlStart, curlMode, updateBones])

    // Update bones when curlRotation changes (fold line direction)
    useEffect(() => {
        if (!meshRef.current || !bonesRef.current.length) return
        updateBones()
    }, [curlRotation, updateBones])

    // Update back color - recreate back texture when backColor changes
    useEffect(() => {
        if (!meshRef.current?.material || !loadedImageRef.current) return

        const img = loadedImageRef.current
        const materials = meshRef.current.material as any[]
        if (!Array.isArray(materials)) return

        // Check if backColor is fully transparent (0% opacity)
        const resolvedBackColor = resolveTokenColor(backColor)
        const backColorRgba = parseColorToRgba(resolvedBackColor)

        // Get front texture to reuse if backColor is fully transparent
        const frontTexture = materials[4]?.map

        // If backColor is fully transparent, use front texture directly
        // Otherwise, create blended back texture
        const rawBackTexture =
            backColorRgba.a <= 0 && frontTexture
                ? frontTexture
                : createBackTexture(img, backColor)
        const backTexture = makeBackTextureViewConsistent(
            rawBackTexture,
            frontTexture
        )

        if (materials[5]) {
            // Only dispose if it's a different texture (not the front texture)
            if (
                materials[5].map &&
                materials[5].map !== frontTexture &&
                materials[5].map !== backTexture
            ) {
                materials[5].map.dispose()
            }

            if (enableShadows) {
                // With shadows: use texture (MeshStandardMaterial)
                if (backTexture) {
                    materials[5].map = backTexture
                    materials[5].transparent = true
                    materials[5].alphaTest = 0.01

                    // When using front texture (0% opacity), match front material properties more closely
                    if (
                        backColorRgba.a <= 0 &&
                        materials[5].emissiveIntensity !== undefined
                    ) {
                        // Match front material emissive for identical appearance
                        materials[5].emissiveIntensity =
                            materials[4]?.emissiveIntensity ?? 0.8
                        materials[5].emissive =
                            materials[4]?.emissive ?? new Color(0xffffff)
                    }
                }
            } else {
                // No shadows: use texture if available, otherwise use flat color (MeshBasicMaterial)
                if (backTexture && backColorRgba.a > 0) {
                    // Use texture for blended effect
                    materials[5].map = backTexture
                    materials[5].transparent = true
                    materials[5].alphaTest = 0.01
                } else if (backColorRgba.a <= 0) {
                    // Fully transparent: use front texture
                    materials[5].map = frontTexture
                    materials[5].transparent = true
                    materials[5].alphaTest = 0.01
                } else {
                    // Fully opaque: use flat color (no texture needed)
                    materials[5].map = null
                    materials[5].color.setRGB(
                        backColorRgba.r,
                        backColorRgba.g,
                        backColorRgba.b
                    )
                    materials[5].opacity = backColorRgba.a
                }
            }

            materials[5].needsUpdate = true
        }

        // Update side faces (border) to use front face texture - blends with front image, not background
        for (let i = 0; i < 4; i++) {
            if (materials[i]) {
                // Use front face texture so border blends with front image
                if (frontTexture) {
                    materials[i].map = frontTexture
                    materials[i].transparent = true
                    materials[i].alphaTest = 0.01
                    // Match front material properties if using MeshStandardMaterial
                    if (
                        materials[i].emissiveIntensity !== undefined &&
                        materials[4]?.emissiveIntensity !== undefined
                    ) {
                        materials[i].emissiveMap = frontTexture
                        materials[i].emissive =
                            materials[4].emissive || new Color(0xffffff)
                        materials[i].emissiveIntensity =
                            materials[4].emissiveIntensity || 0.8
                    }
                } else {
                    // No texture yet - use back color as fallback
                    materials[i].map = null
                    materials[i].color.setRGB(
                        backColorRgba.r,
                        backColorRgba.g,
                        backColorRgba.b
                    )
                    materials[i].transparent = true
                    materials[i].opacity = 1
                }
                materials[i].needsUpdate = true
            }
        }

        renderFrame()
    }, [backColor, createBackTexture, enableShadows, renderFrame])

    // Update shadow position when settings change
    useEffect(() => {
        if (!enableShadows || !lightRef.current) return

        lightRef.current.position.set(shadowPositionX, shadowPositionY, 400)
        lightRef.current.shadow.mapSize.width = 4096
        lightRef.current.shadow.mapSize.height = 4096
        lightRef.current.shadow.bias = -0.00001
        lightRef.current.shadow.radius = 8
        lightRef.current.shadow.needsUpdate = true

        renderFrame()
    }, [enableShadows, shadowPositionX, shadowPositionY, renderFrame])

    // Update shadow intensity (darkness) when settings change
    useEffect(() => {
        if (!enableShadows || !lightRef.current || !ambientLightRef.current)
            return

        // Shadow darkness is controlled by the ratio of directional to ambient light
        // High shadowIntensity: strong directional light, low ambient = dark shadows
        // Low shadowIntensity: weaker directional, high ambient = soft/no shadows
        // At shadowIntensity = 1, make shadows very dramatic

        // Directional light: 0.3 to 2.0 (more dramatic at max)
        const adjustedLightIntensity = 0.3 + shadowIntensity * 1.7
        lightRef.current.intensity = adjustedLightIntensity

        // Ambient light: 1.0 to 0.4 (lower at max for dramatic shadows)
        const adjustedAmbientIntensity = 1.0 - shadowIntensity * 0.6
        ambientLightRef.current.intensity = Math.max(
            adjustedAmbientIntensity,
            0.4
        )

        renderFrame()
    }, [enableShadows, shadowIntensity, renderFrame])

    // Update cast shadow opacity when it changes
    useEffect(() => {
        if (!enableShadows || !backgroundPlaneRef.current) return

        const material = backgroundPlaneRef.current.material as any
        // ShadowMaterial: adjust opacity based on castShadowOpacity
        material.opacity = castShadowOpacity
        material.needsUpdate = true

        renderFrame()
    }, [enableShadows, castShadowOpacity, renderFrame])

    // Size monitoring - optimized for Framer canvas
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleResize = () => {
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const last = lastSizeRef.current
            const sizeChanged =
                Math.abs(width - last.width) > 1 ||
                Math.abs(height - last.height) > 1
            if (sizeChanged) {
                last.width = width
                last.height = height
                updateSize(width, height)
                renderFrame()
            }
        }

        // Initial resize
        handleResize()

        // Use requestAnimationFrame-based monitoring for canvas mode (like interactive-thermal3.tsx)
        const resizeCleanup = isCanvas
            ? (() => {
                  let rafId = 0
                  const TICK_MS = 250
                  const EPS_ASPECT = 0.001
                  const tick = (now?: number) => {
                      if (!container) return
                      const probe = zoomProbeRef.current
                      if (!probe) {
                          rafId = requestAnimationFrame(tick)
                          return
                      }

                      const cw =
                          container.clientWidth || container.offsetWidth || 1
                      const ch =
                          container.clientHeight || container.offsetHeight || 1
                      const aspect = cw / ch
                      const zoom = probe.getBoundingClientRect().width / 20

                      const timeOk =
                          !lastSizeRef.current.ts ||
                          (now || performance.now()) - lastSizeRef.current.ts >=
                              TICK_MS
                      const aspectChanged =
                          Math.abs(aspect - lastSizeRef.current.aspect) >
                          EPS_ASPECT
                      const sizeChanged =
                          Math.abs(cw - lastSizeRef.current.width) > 1 ||
                          Math.abs(ch - lastSizeRef.current.height) > 1

                      if (timeOk && (aspectChanged || sizeChanged)) {
                          lastSizeRef.current = {
                              width: cw,
                              height: ch,
                              aspect,
                              zoom,
                              ts: now || performance.now(),
                          }
                          updateSize(cw, ch)
                          renderFrame()
                      }

                      rafId = requestAnimationFrame(tick)
                  }
                  rafId = requestAnimationFrame(tick)
                  return () => cancelAnimationFrame(rafId)
              })()
            : (() => {
                  // For preview/published mode, use ResizeObserver + window resize
                  const resizeObserver = new ResizeObserver(handleResize)
                  resizeObserver.observe(container)
                  window.addEventListener("resize", handleResize)
                  return () => {
                      resizeObserver.disconnect()
                      window.removeEventListener("resize", handleResize)
                  }
              })()

        return resizeCleanup
    }, [updateSize, renderFrame, isCanvas])

    // ========================================================================
    // RENDER
    // ========================================================================

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
                title="3D Sticker"
                subtitle="Add an image to see the sticker effect"
            />
        )
    }

    const offsetPercent = ((CANVAS_SCALE - 1) / 2) * 100
    // Hide canvas until texture is loaded to avoid visual jump
    const isReady = textureLoaded && meshRef.current !== null

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
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
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: "absolute",
                    top: `-${offsetPercent}%`,
                    left: `-${offsetPercent}%`,
                    display: "block",
                    cursor: "pointer",
                    opacity: isReady ? 1 : 0,
                }}
            />
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(Sticker, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    unrollMode:{
        type:ControlType.Enum,
        title:"Unroll Mode",
        options:["change-curl","move-start","hybrid"],
        optionTitles:["Change Curl","Move Start","Hybrid"],
        defaultValue:"change-curl",
        displaySegmentedControl:true,
        segmentedControlDirection:"vertical",
    },
    curlAmount: {
        type: ControlType.Number,
        title: "Curl",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.05,
    },
    curlRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 1,
    },
    curlStart: {
        type: ControlType.Number,
        title: "Start",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.45,
    },
    curlRotation: {
        type: ControlType.Number,
        title: "Direction",
        min: 0,
        max: 360,
        step: 15,
        defaultValue: 0,
        unit: "°",
    },
    curlMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["semicircle", "spiral"],
        optionTitles: ["Semicircle", "Spiral"],
        defaultValue: "spiral",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    enableShadows: {
        type: ControlType.Boolean,
        title: "Ligthing",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    shadowIntensity: {
        type: ControlType.Number,
        title: "Light",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 1,
        hidden: (props) => !props.enableShadows,
    },
    shadowPositionX: {
        type: ControlType.Number,
        title: "Light X",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: -400,
        hidden: (props) => !props.enableShadows,
    },
    shadowPositionY: {
        type: ControlType.Number,
        title: "Light Y",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: 0,
        hidden: (props) => !props.enableShadows,
    },
    castShadowOpacity: {
        type: ControlType.Number,
        title: "Shadow",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.3,
        hidden: (props) => !props.enableShadows,
    },
    shadowBgColor: {
        type: ControlType.Color,
        title: "Shadow Bg",
        defaultValue: "rgba(0, 0, 0, 0)",
        hidden: () => true, // Hidden - ShadowMaterial handles transparency automatically
    },
    animationDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 0.6,
        unit: "s",
    },
    backColor: {
        type: ControlType.Color,
        title: "Back Color",
        defaultValue: "rgba(255, 255, 255, 1)",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ============================================================================
// DISPLAY NAME
// ============================================================================

Sticker.displayName = "3D Sticker"
