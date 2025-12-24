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
    curlRotation: number // Curl direction rotation in degrees (0-360)
    curlMode: "semicircle" | "spiral"
    backColor: string
    // Animation settings (start = initial state, end = hover state)
    animation: {
        show: "initial" | "final" // Which state to show in Canvas
        curlAmountStart: number
        curlAmountEnd: number
        curlRadiusStart: number
        curlRadiusEnd: number
        curlStartStart: number
        curlStartEnd: number
    }
    // Lighting and shadows (shadows always enabled with intensity = 1)
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

// Canvas scale - small padding for shadows while staying responsive
const CANVAS_SCALE = 1.2 // 20% extra space for shadows

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

    curlRotation = 0, // 0° = curl from left, 90° = from bottom, 180° = from right, 270° = from top
    curlMode = "spiral",
    animation = {
        show: "initial",
        curlAmountStart: 0.6,
        curlAmountEnd: 0.6,
        curlRadiusStart: 0.15,
        curlRadiusEnd: 1,
        curlStartStart: 0.5,
        curlStartEnd: 1,
    },
    backColor = "rgba(255, 255, 255, 1)",
    animationDuration = 0.6,
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
    const imageLoadAbortRef = useRef<boolean>(false) // Track if component is unmounting
    // Detect environment
    const resolvedImageUrl = resolveImageSource(image)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    
    // In Canvas mode, use the show prop to determine initial state
    // In preview/live mode, always start with initial values
    const shouldShowFinal = isCanvas && animation.show === "final"
    
    // Initialize animated refs with appropriate values based on show prop (Canvas) or start values (preview/live)
    const animatedCurlRef = useRef({ 
        amount: shouldShowFinal ? animation.curlAmountEnd : animation.curlAmountStart 
    }) // Animated curl value for GSAP
    const animatedCurlStartRef = useRef({ 
        start: shouldShowFinal ? animation.curlStartEnd : animation.curlStartStart 
    }) // Animated curlStart value for GSAP
    const animatedCurlRadiusRef = useRef({ 
        radius: shouldShowFinal ? animation.curlRadiusEnd : animation.curlRadiusStart 
    }) // Animated curlRadius value for GSAP
    const isHoveringRef = useRef(false) // Track if currently hovering over sticker
    const lightRef = useRef<any>(null)
    const ambientLightRef = useRef<any>(null)
    const backgroundPlaneRef = useRef<any>(null)
    const curlRotationRef = useRef(curlRotation) // Store curlRotation in ref so updateBones always reads current value
    const imageAspectRatioRef = useRef<number | null>(null) // Store image aspect ratio for contain behavior
    const debugLineRef = useRef<any>(null) // Debug line for curlStart
    const lastMeshDimensionsRef = useRef<{ width: number; height: number } | null>(null) // Track mesh dimensions to avoid unnecessary recreation

    // State
    const [textureLoaded, setTextureLoaded] = useState(false)
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
        if (!canvasRef.current || !containerRef.current) {
            return null
        }

        const container = containerRef.current
        const containerWidth =
            container.clientWidth || container.offsetWidth || 1
        const containerHeight =
            container.clientHeight || container.offsetHeight || 1
        
        // Ensure we have valid dimensions (at least 1px)
        if (containerWidth <= 0 || containerHeight <= 0) {
            return null
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // Calculate contained dimensions (maintains image aspect ratio)
        const contained = calculateContainedDimensions(
            containerWidth,
            containerHeight,
            imageAspectRatioRef.current
        )
        const width = contained.width
        const height = contained.height

        // Canvas with small padding for shadows
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

        // Dispose old renderer if it exists (prevent WebGL context accumulation)
        if (rendererRef.current) {
            try {
                rendererRef.current.dispose()
            } catch (error) {
                // Silently handle disposal errors
            }
            rendererRef.current = null
        }
        
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

        // Enable high-quality shadow maps (shadows always enabled)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = PCFSoftShadowMap // High quality soft shadows

        rendererRef.current = renderer

        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`

        // Create geometry with base dimensions (1:1 or image aspect ratio if known)
        // We'll scale the mesh uniformly to fit the container while maintaining aspect ratio
        const baseSize = Math.min(containerWidth, containerHeight)
        const geometry = createStickerGeometry(baseSize, baseSize, BONE_GRID_X, BONE_GRID_Y)

        // Create 2D bone grid
        // Bones are independent (not parented) - each bone controls a region of the sticker
        // Position bones relative to geometry size (baseSize), not contained dimensions
        // When mesh is scaled, bones will scale with it through the skeleton system
        const bones: any[] = []
        const boneSpacingX = baseSize / (BONE_GRID_X - 1)
        const boneSpacingY = baseSize / (BONE_GRID_Y - 1)

        for (let y = 0; y < BONE_GRID_Y; y++) {
            for (let x = 0; x < BONE_GRID_X; x++) {
                const bone = new Bone()
                // Position bones in a grid, centered at origin (relative to geometry size)
                bone.position.x = -baseSize / 2 + x * boneSpacingX
                bone.position.y = -baseSize / 2 + y * boneSpacingY
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

        // All faces use MeshStandardMaterial with smooth roughness (shadows always enabled)
        const frontMaterial = new MeshStandardMaterial({
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
        const backMaterial = new MeshStandardMaterial({
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
        const sideMaterial = new MeshStandardMaterial({
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
        mesh.frustumCulled = false
        
        // Add all bones to the mesh and initialize their matrices
        bones.forEach(bone => {
            mesh.add(bone)
            // Initialize bone matrix to ensure it's ready for skeleton
            bone.updateMatrixWorld(true)
        })
        
        // Bind skeleton AFTER bones are added and initialized
        mesh.bind(skeleton)
        
        // Update mesh and skeleton matrices
        mesh.updateMatrixWorld(true)
        
        // Update skeleton AFTER mesh matrix world is computed
        // This ensures all bone matrices are ready
        skeleton.update()

        // Enable shadows (always enabled)
        // According to Three.js forum: setting both castShadow and receiveShadow can cause acne
        // The sticker casts shadows onto the background plane, but doesn't need to receive them
        mesh.castShadow = true
        mesh.receiveShadow = false // Don't receive shadows to avoid acne

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
        
        // Initialize last mesh dimensions
        lastMeshDimensionsRef.current = { width: baseSize, height: baseSize }
        
        scene.add(group)
        
        // Ensure mesh is immediately visible (will show back color until texture loads)
        // This prevents the "white plane only" issue

        // No group rotation - curlRotation is handled by rotating the fold line axis in updateBones()

        // Add lighting (shadows always enabled with intensity = 1)
        // Calculate initial light intensities for shadowIntensity = 1
        // High shadowIntensity = strong directional, low ambient = dark shadows
        // At shadowIntensity = 1, make shadows very dramatic (strong directional, low ambient)
        const shadowIntensity = 1 // Hardcoded
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
        // Shadow camera bounds need to account for:
        // 1. Container size
        // 2. Light position offset (shadowPositionX/Y can be -500 to 500)
        // 3. Shadow projection area (shadows extend in the direction opposite to light)
        // 4. Canvas scale (CANVAS_SCALE = 1.2 for shadow padding)
        const shadowCameraSize = Math.max(containerWidth, containerHeight) * 3.5
        const shadowOffsetX = shadowPositionX * 0.3 // Account for light position
        const shadowOffsetY = shadowPositionY * 0.3
        directionalLight.shadow.camera.left = -shadowCameraSize / 2 + shadowOffsetX
        directionalLight.shadow.camera.right = shadowCameraSize / 2 + shadowOffsetX
        directionalLight.shadow.camera.top = shadowCameraSize / 2 + shadowOffsetY
        directionalLight.shadow.camera.bottom = -shadowCameraSize / 2 + shadowOffsetY
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

        // Create plane sized to cover shadow camera area (larger to prevent clipping)
        // Match shadow camera bounds to ensure all shadows are captured
        const planeSize = Math.max(containerWidth, containerHeight) * 3.5
        const planeGeometry = new PlaneGeometry(planeSize, planeSize)
        const backgroundPlane = new Mesh(planeGeometry, shadowMat)
        backgroundPlane.receiveShadow = true
        // Position very slightly behind sticker
        backgroundPlane.position.set(0, 0, -1)
        backgroundPlaneRef.current = backgroundPlane
        scene.add(backgroundPlane)

        // Initial render to show mesh immediately (even without texture)
        if (renderer && scene && camera) {
            renderer.render(scene, camera)
        }
        
        return { scene, camera, renderer, mesh, bones }
    }, [
        createStickerGeometry,
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
        
        // Check if WebGL context is lost
        const gl = rendererRef.current.getContext()
        if (!gl || gl.isContextLost()) {
            return
        }
        
        // Ensure world matrices and skeleton are updated before rendering
        // This prevents "Cannot read properties of undefined (reading 'matrixWorld')" errors
        if (meshRef.current && meshRef.current.skeleton) {
            try {
                meshRef.current.updateMatrixWorld(true)
                // Ensure all bones have valid matrices before skeleton update
                const bones = meshRef.current.skeleton.bones
                if (bones && bones.length > 0) {
                    // Update bone matrices individually to ensure they're ready
                    bones.forEach((bone: any) => {
                        if (bone && typeof bone.updateMatrixWorld === 'function') {
                            bone.updateMatrixWorld(true)
                        }
                    })
                }
                meshRef.current.skeleton.update()
            } catch (error) {
                // Silently handle errors during render to prevent console spam
                // This can happen during component unmount or context loss
                return
            }
        }
        
        try {
            rendererRef.current.render(sceneRef.current, cameraRef.current)
        } catch (error) {
            // Silently handle render errors (context loss, etc.)
        }
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
        []
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

            // Preserve textures before disposing materials
            let preservedTextures: { front?: any; back?: any; side?: any } = {}
            if (meshRef.current) {
                const oldMesh = meshRef.current
                const oldMaterials = oldMesh.material as any[]
                if (Array.isArray(oldMaterials)) {
                    // Preserve textures before disposal
                    if (oldMaterials[4]?.map) preservedTextures.front = oldMaterials[4].map
                    if (oldMaterials[5]?.map) preservedTextures.back = oldMaterials[5].map
                    if (oldMaterials[0]?.map) preservedTextures.side = oldMaterials[0].map
                }
                
                // Remove from scene and group first
                if (groupRef.current) {
                    groupRef.current.remove(oldMesh)
                }
                sceneRef.current.remove(oldMesh)
                
                // Dispose geometry
                if (oldMesh.geometry) {
                    oldMesh.geometry.dispose()
                }
                
                // Dispose materials and textures
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((mat: any) => {
                        // Don't dispose textures - they're preserved
                        if (mat.map && mat.map !== preservedTextures.front && 
                            mat.map !== preservedTextures.back && 
                            mat.map !== preservedTextures.side) {
                            mat.map.dispose()
                        }
                        mat.dispose()
                    })
                } else if (oldMesh.material) {
                    oldMesh.material.dispose()
                }
                
                // Clear old skeleton bones (they're children of the mesh)
                if (oldMesh.skeleton) {
                    oldMesh.skeleton.bones.forEach((bone: any) => {
                        if (bone.parent) {
                            bone.parent.remove(bone)
                        }
                    })
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

            // All materials use MeshStandardMaterial (shadows always enabled)
            const frontMaterial = new MeshStandardMaterial({
                color: 0xffffff,
                side: FrontSide,
                transparent: true,
                roughness: 0.2,
                metalness: 0.4,
                emissive: 0xffffff,
                emissiveIntensity: 0.8,
            })

            const backMaterial = new MeshStandardMaterial({
                color: 0xffffff,
                side: FrontSide,
                transparent: true,
                roughness: 0.3,
                metalness: 0.0,
                emissive: 0xffffff,
                emissiveIntensity: 0.3,
            })

            // Side material: will use front texture when loaded (blends with front image), back color as fallback
            const sideMaterial = new MeshStandardMaterial({
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
            mesh.frustumCulled = false
            
            // Add all bones to the mesh and initialize their matrices
            bones.forEach(bone => {
                mesh.add(bone)
                // Initialize bone matrix to ensure it's ready for skeleton
                bone.updateMatrixWorld(true)
            })
            
            // Bind skeleton AFTER bones are added and initialized
            mesh.bind(skeleton)
            
            // Update mesh and skeleton matrices
            mesh.updateMatrixWorld(true)
            
            // Update skeleton AFTER mesh matrix world is computed
            // This ensures all bone matrices are ready
            skeleton.update()

            // Shadows always enabled
            mesh.castShadow = true
            mesh.receiveShadow = false

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
            
            // Update last mesh dimensions
            lastMeshDimensionsRef.current = { width: contained.width, height: contained.height }

            // Apply textures if they're already loaded
            // Reuse preserved textures if available, otherwise create new ones
            if (loadedImageRef.current) {
                const img = loadedImageRef.current
                // Reuse preserved texture if available, otherwise create new one
                const texture = preservedTextures.front || new Texture(img)
                if (!preservedTextures.front) {
                    texture.needsUpdate = true
                    texture.minFilter = LinearFilter
                    texture.colorSpace = SRGBColorSpace
                    texture.format = RGBAFormat
                }

                // Create back texture: blend backColor with front image
                // If backColor is fully transparent (0% opacity), use front texture directly
                const resolvedBackColor = resolveTokenColor(backColor)
                const backColorRgba = parseColorToRgba(resolvedBackColor)
                // Reuse preserved back texture if available and backColor hasn't changed
                let rawBackTexture = preservedTextures.back
                if (!rawBackTexture) {
                    rawBackTexture =
                        backColorRgba.a <= 0
                            ? texture
                            : createBackTexture(img, backColor)
                }
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

                        meshMaterials[5].needsUpdate = true
                    }
                    // Side faces (border): use front face texture - blends with front image, not background
                    // Reuse preserved side texture if available
                    const sideTexture = preservedTextures.side || texture
                    for (let i = 0; i < 4; i++) {
                        if (meshMaterials[i] && sideTexture) {
                            // Use front face texture so border blends with front image
                            meshMaterials[i].map = sideTexture
                            meshMaterials[i].transparent = true
                            meshMaterials[i].alphaTest = 0.01
                            // Match front material properties if using MeshStandardMaterial
                            if (
                                meshMaterials[i].emissiveIntensity !==
                                    undefined &&
                                meshMaterials[4]?.emissiveIntensity !==
                                    undefined
                            ) {
                                meshMaterials[i].emissiveMap = sideTexture
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

            // Always render after mesh recreation to ensure it's visible
            renderFrame()
        },
        [
            createStickerGeometry,
            backColor,
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
        imageLoadAbortRef.current = false // Reset abort flag

        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            // Check if component was unmounted during load
            if (imageLoadAbortRef.current || !meshRef.current) return
            
            // Store reference for border color updates
            loadedImageRef.current = img

            // Detect and store image aspect ratio for contain behavior
            if (img.width && img.height) {
                const aspectRatio = img.width / img.height
                imageAspectRatioRef.current = aspectRatio

                // Recreate mesh with correct aspect ratio geometry
                recreateMeshWithAspectRatio(aspectRatio)

                // Wait for next frame to ensure mesh is fully initialized before updating bones
                // This prevents race conditions where skeleton isn't ready yet
                requestAnimationFrame(() => {
                    // Check if component unmounted during the frame delay
                    if (imageLoadAbortRef.current) return
                    
                    if (meshRef.current && groupRef.current && meshRef.current.skeleton) {
                        try {
                            // Ensure skeleton is fully initialized before updating bones
                            const bones = meshRef.current.skeleton.bones
                            if (bones && bones.length > 0 && bonesRef.current.length > 0) {
                                // Double-check bones are ready
                                meshRef.current.updateMatrixWorld(true)
                                meshRef.current.skeleton.update()
                                updateBones()
                            }
                        } catch (error) {
                            // Silently handle initialization errors
                        }
                    }
                })
            }
            
            // Check mesh is still valid after potential recreation
            if (!meshRef.current?.material) return

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
            // Always render after textures are applied (only if still mounted)
            if (!imageLoadAbortRef.current && meshRef.current) {
                renderFrame()
            }
        }
        img.onerror = () => {
            if (!imageLoadAbortRef.current) {
                console.error("Texture loading error")
            }
            setTextureLoaded(false)
            // Still render even if texture fails (will show back color) - only if still mounted
            if (!imageLoadAbortRef.current && meshRef.current) {
                renderFrame()
            }
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
        
        // Check if skeleton exists and has valid bones
        if (!meshRef.current.skeleton) return
        const skeletonBones = meshRef.current.skeleton.bones
        if (!skeletonBones || skeletonBones.length === 0) return
        
        try {
            // Force computation of world matrices BEFORE modifying bones
            // This prevents "Cannot read properties of undefined (reading 'matrixWorld')" errors
            // especially when curlRotation != 0 and bones have quaternion rotations
            meshRef.current.updateMatrixWorld(true)
            
            // Ensure all bones have valid matrices before skeleton update
            skeletonBones.forEach((bone: any) => {
                if (bone && typeof bone.updateMatrixWorld === 'function') {
                    bone.updateMatrixWorld(true)
                }
            })
            
            meshRef.current.skeleton.update()
        } catch (error) {
            // Silently handle errors during bone updates
            return
        }

        const bones = bonesRef.current
        const initialPositions = bonesInitialPositionsRef.current
        const curlFactor = Math.max(0.0001, animatedCurlRef.current.amount)
        // Use animated radius value instead of internalRadiusRef
        const r = mapInteralRadiusToUIValue(animatedCurlRadiusRef.current.radius)

        const mesh = meshRef.current
        const width = mesh.geometry.parameters.width * mesh.scale.x
        const height = mesh.geometry.parameters.height * mesh.scale.y
        
        // Use ref to always get current curlRotation value (avoids stale closure issues in Canvas mode)
        const curlRotationRad = (curlRotationRef.current * Math.PI) / 180
        const dirX = Math.cos(curlRotationRad)
        const dirY = Math.sin(curlRotationRad)
        const axisX = -dirY
        const axisY = dirX
        const rotationAxis = new Vector3(axisX, axisY, 0).normalize()

        // Calculate the actual maximum distance along the curl direction
        // For a rectangle, we need to find which corner is furthest along the direction vector
        // The rectangle extends from -halfWidth to +halfWidth in X and -halfHeight to +halfHeight in Y
        const halfWidth = width / 2
        const halfHeight = height / 2
        
        // Check all 4 corners to find the maximum distance along the curl direction
        // Corner coordinates: (w, h), (w, -h), (-w, h), (-w, -h)
        // Distance along direction (dirX, dirY) = x * dirX + y * dirY
        const corner1 = halfWidth * dirX + halfHeight * dirY  // (w, h)
        const corner2 = halfWidth * dirX - halfHeight * dirY  // (w, -h)
        const corner3 = -halfWidth * dirX + halfHeight * dirY // (-w, h)
        const corner4 = -halfWidth * dirX - halfHeight * dirY  // (-w, -h)
        
        // Maximum distance along curl direction (furthest corner in that direction)
        const maxDistAlongDir = Math.max(corner1, corner2, corner3, corner4)
        
        // Keep maxDistFromCenter for radius calculations (uses diagonal for smooth curves)
        const diagonalLength = Math.sqrt(width * width + height * height)
        const maxDistFromCenter = diagonalLength / 2

        // foldOffset: position of the fold line along the 'dir' axis
        // Use animated curlStart value for smooth animations
        // Use maxDistAlongDir to keep fold line within sticker bounds (0 = left/top edge, 1 = right/bottom edge)
        const animatedStart = animatedCurlStartRef.current.start
        const foldOffset = -maxDistAlongDir + animatedStart * 2 * maxDistAlongDir
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

        // Draw debug line along the fold line (commented out)
        // if (groupRef.current) {
        //     if (debugLineRef.current) {
        //         groupRef.current.remove(debugLineRef.current)
        //         debugLineRef.current.geometry.dispose()
        //         debugLineRef.current.material.dispose()
        //     }

        //     const centerX = foldOffset * dirX
        //     const centerY = foldOffset * dirY

        //     // Use maxDistAlongDir for debug line to match fold line bounds
        //     const lineHalfLen = maxDistAlongDir * 1.5
        //     const points = [
        //         new Vector3(centerX - axisX * lineHalfLen, centerY - axisY * lineHalfLen, 0.1),
        //         new Vector3(centerX + axisX * lineHalfLen, centerY + axisY * lineHalfLen, 0.1),
        //     ]
        //     const lineGeometry = new BufferGeometry().setFromPoints(points)
        //     const lineMaterial = new LineBasicMaterial({ color: 0x0000ff })
        //     const line = new Line(lineGeometry, lineMaterial)
        //     debugLineRef.current = line
        //     groupRef.current.add(line)
        // }

        renderFrame()
    }, [curlMode, renderFrame]) // curlRotation removed from deps - we use ref instead

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
                // Entering sticker: animate to end values from animation object
                isHoveringRef.current = true
                
                // Use a single timeline to animate all values to their end states
                const timeline = gsap.timeline({
                    onUpdate: () => {
                        updateBones()
                    },
                })
                
                // Animate curlAmount to end value
                timeline.to(animatedCurlRef.current, {
                    amount: animation.curlAmountEnd,
                    duration: animationDuration,
                    ease: "power2.inOut",
                })
                
                // Animate curlStart to end value
                timeline.to(animatedCurlStartRef.current, {
                    start: animation.curlStartEnd,
                    duration: animationDuration,
                    ease: "power2.inOut",
                }, 0) // Start at same time
                
                // Animate curlRadius to end value
                timeline.to(animatedCurlRadiusRef.current, {
                    radius: animation.curlRadiusEnd,
                    duration: animationDuration,
                    ease: "power2.inOut",
                }, 0) // Start at same time
            } else if (!isOverSticker && wasHovering) {
                // Leaving sticker: animate back to start values from animation object
                isHoveringRef.current = false
                
                // Use a single timeline to animate all values back to their start states
                const timeline = gsap.timeline({
                    onUpdate: () => {
                        updateBones()
                    },
                })
                
                // Animate curlAmount back to start value
                timeline.to(animatedCurlRef.current, {
                    amount: animation.curlAmountStart,
                    duration: animationDuration,
                    ease: "power2.inOut",
                })
                
                // Animate curlStart back to start value
                timeline.to(animatedCurlStartRef.current, {
                    start: animation.curlStartStart,
                    duration: animationDuration,
                    ease: "power2.inOut",
                }, 0) // Start at same time
                
                // Animate curlRadius back to start value
                timeline.to(animatedCurlRadiusRef.current, {
                    radius: animation.curlRadiusStart,
                    duration: animationDuration,
                    ease: "power2.inOut",
                }, 0) // Start at same time
            }
        },
        [checkMouseOverSticker, animation, animationDuration, updateBones]
    )

    // Mouse leave handler: always reset when leaving canvas
    const handleMouseLeave = useCallback(() => {
        if (isHoveringRef.current) {
            isHoveringRef.current = false
            
            // Use a single timeline to animate all values back to their start states
            const timeline = gsap.timeline({
                onUpdate: () => {
                    updateBones()
                },
            })
            
            // Animate curlAmount back to start value
            timeline.to(animatedCurlRef.current, {
                amount: animation.curlAmountStart,
                duration: animationDuration,
                ease: "power2.out",
            })
            
            // Animate curlStart back to start value
            timeline.to(animatedCurlStartRef.current, {
                start: animation.curlStartStart,
                duration: animationDuration,
                ease: "power2.out",
            }, 0) // Start at same time
            
            // Animate curlRadius back to start value
            timeline.to(animatedCurlRadiusRef.current, {
                radius: animation.curlRadiusStart,
                duration: animationDuration,
                ease: "power2.out",
            }, 0) // Start at same time
        }
    }, [animation, animationDuration, updateBones])

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
            // Canvas with small padding for shadows
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

            // Always scale the mesh to fit contained dimensions
            // Only recreate if aspect ratio changed significantly (to avoid unnecessary recreation)
            if (meshRef.current) {
                const geometry = meshRef.current.geometry
                const baseWidth = geometry.parameters.width
                const baseHeight = geometry.parameters.height
                
                // Check if aspect ratio changed significantly (needs recreation)
                const aspectRatioChanged = imageAspectRatioRef.current && 
                    lastMeshDimensionsRef.current &&
                    Math.abs((lastMeshDimensionsRef.current.width / lastMeshDimensionsRef.current.height) - (width / height)) > 0.01
                
                if (aspectRatioChanged && imageAspectRatioRef.current) {
                    // Recreate mesh with new aspect ratio
                    recreateMeshWithAspectRatio(imageAspectRatioRef.current)
                    lastMeshDimensionsRef.current = { width, height }
                    // Restore curl after mesh recreation
                    setTimeout(() => {
                        if (meshRef.current && bonesRef.current.length > 0) {
                            // Ensure skeleton is initialized before updating bones
                            if (meshRef.current.skeleton) {
                                meshRef.current.skeleton.update()
                            }
                            updateBones()
                            renderFrame()
                        }
                    }, 10)
                } else {
                    // Scale existing mesh to fit contained dimensions
                    // This preserves textures and is much faster
                    const scaleX = width / baseWidth
                    const scaleY = height / baseHeight
                    
                    meshRef.current.scale.set(scaleX, scaleY, 1)
                    // Mesh stays centered at origin (no position offset with 2D grid)
                    meshRef.current.position.set(0, 0, 0)
                    
                    // Update last dimensions
                    lastMeshDimensionsRef.current = { width, height }
                    
                    // Update bones to reflect new scale
                    updateBones()
                    renderFrame()
                }
            }

            // Update shadow camera (shadows always enabled)
            if (lightRef.current) {
                // Match shadow camera bounds from setupScene
                const shadowCameraSize = Math.max(containerWidth, containerHeight) * 3.5
                const shadowOffsetX = shadowPositionX * 0.3
                const shadowOffsetY = shadowPositionY * 0.3
                lightRef.current.shadow.camera.left = -shadowCameraSize / 2 + shadowOffsetX
                lightRef.current.shadow.camera.right = shadowCameraSize / 2 + shadowOffsetX
                lightRef.current.shadow.camera.top = shadowCameraSize / 2 + shadowOffsetY
                lightRef.current.shadow.camera.bottom = -shadowCameraSize / 2 + shadowOffsetY
                lightRef.current.shadow.camera.updateProjectionMatrix()
            }
        },
        [
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
            imageLoadAbortRef.current = true // Mark as aborting
            if (rendererRef.current) {
                try {
                    rendererRef.current.dispose()
                } catch (error) {
                    // Silently handle disposal errors
                }
                rendererRef.current = null
            }
            if (sceneRef.current) {
                try {
                    sceneRef.current.clear()
                } catch (error) {
                    // Silently handle cleanup errors
                }
                sceneRef.current = null
            }
            meshRef.current = null
            bonesRef.current = []
            bonesInitialPositionsRef.current = []
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
            imageAspectRatioRef.current = null
            loadedImageRef.current = null
            return
        }
        
        imageLoadAbortRef.current = false // Reset abort flag when content is available

        const sceneSetup = setupScene()
        
        if (!sceneSetup) {
            // If setupScene returns null (container not ready), try again after a short delay
            const retryTimeout = setTimeout(() => {
                const retrySetup = setupScene()
                if (retrySetup && meshRef.current) {
                    // Initialize skeleton and bones immediately
                    if (meshRef.current.skeleton) {
                        meshRef.current.skeleton.update()
                    }
                    updateBones()
                    // Render immediately to show mesh (even without texture)
                    renderFrame()
                    // Load texture asynchronously
                    loadTexture()
                }
            }, 100)
            return () => clearTimeout(retryTimeout)
        }

        // Initialize immediately - no setTimeout delays
        if (meshRef.current) {
            // Initialize skeleton and bones
            if (meshRef.current.skeleton) {
                meshRef.current.skeleton.update()
            }
            updateBones()
            // Render immediately to show mesh (even without texture - will show back color)
            renderFrame()
            // Load texture asynchronously - it will trigger another render when done
            loadTexture()
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            
            // Dispose mesh and all its resources
            if (meshRef.current) {
                const oldMesh = meshRef.current
                
                // Remove from scene and group
                if (groupRef.current) {
                    groupRef.current.remove(oldMesh)
                }
                if (sceneRef.current) {
                    sceneRef.current.remove(oldMesh)
                }
                
                // Dispose geometry
                if (oldMesh.geometry) {
                    oldMesh.geometry.dispose()
                }
                
                // Dispose materials and textures
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((mat: any) => {
                        if (mat.map) mat.map.dispose()
                        mat.dispose()
                    })
                } else if (oldMesh.material) {
                    if ((oldMesh.material as any).map) {
                        (oldMesh.material as any).map.dispose()
                    }
                    oldMesh.material.dispose()
                }
                
                // Clear skeleton bones
                if (oldMesh.skeleton) {
                    oldMesh.skeleton.bones.forEach((bone: any) => {
                        if (bone && bone.parent) {
                            bone.parent.remove(bone)
                        }
                    })
                }
                
                meshRef.current = null
            }
            
            // Clear bones refs
            bonesRef.current = []
            bonesInitialPositionsRef.current = []
            groupRef.current = null
            
            // Dispose renderer (this also disposes of its WebGL context)
            if (rendererRef.current) {
                try {
                    rendererRef.current.dispose()
                } catch (error) {
                    // Silently handle disposal errors
                }
                rendererRef.current = null
            }
            
            // Clear scene
            if (sceneRef.current) {
                try {
                    // Remove all remaining objects
                    while (sceneRef.current.children.length > 0) {
                        const child = sceneRef.current.children[0]
                        sceneRef.current.remove(child)
                        // Dispose if it has dispose method
                        if ((child as any).dispose && typeof (child as any).dispose === 'function') {
                            (child as any).dispose()
                        }
                    }
                    sceneRef.current.clear()
                } catch (error) {
                    // Silently handle cleanup errors
                }
                sceneRef.current = null
            }
            
            // Clear refs
            cameraRef.current = null
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
            loadedImageRef.current = null
            imageAspectRatioRef.current = null
            
            // Mark image loading as aborted to prevent callbacks from running after unmount
            imageLoadAbortRef.current = true
        }
    }, [hasContent, setupScene, loadTexture, updateBones, renderFrame])

    // Sync animated refs with animation prop changes (only when not hovering)
    useEffect(() => {
        // Only update if not currently animating (not hovering)
        if (!isHoveringRef.current) {
            // In Canvas mode, respect the show prop to determine which state to display
            // In preview/live mode, always use start values
            const shouldShowFinal = isCanvas && animation.show === "final"
            
            animatedCurlRef.current.amount = shouldShowFinal 
                ? animation.curlAmountEnd 
                : animation.curlAmountStart
            animatedCurlStartRef.current.start = shouldShowFinal 
                ? animation.curlStartEnd 
                : animation.curlStartStart
            animatedCurlRadiusRef.current.radius = shouldShowFinal 
                ? animation.curlRadiusEnd 
                : animation.curlRadiusStart
            updateBones()
        }
    }, [animation, isCanvas, updateBones])

    // Update bones when curlMode changes
    // Note: curlAmount and curlStart are handled by GSAP animations via animated refs
    useEffect(() => {
        updateBones()
    }, [curlMode, updateBones])

    // Update bones when curlRotation changes (fold line direction)
    useEffect(() => {
        // Update ref immediately so updateBones always uses current value
        curlRotationRef.current = curlRotation
        if (!meshRef.current || !bonesRef.current.length) return
        updateBones()
        // In Canvas mode, explicitly render to ensure the change is visible
        if (isCanvas && rendererRef.current && sceneRef.current && cameraRef.current) {
            renderFrame()
        }
    }, [curlRotation, updateBones, isCanvas, renderFrame])

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
    }, [backColor, createBackTexture, renderFrame])

    // Update shadow position when settings change
    useEffect(() => {
        if (!lightRef.current || !containerRef.current) return

        lightRef.current.position.set(shadowPositionX, shadowPositionY, 400)
        lightRef.current.shadow.mapSize.width = 4096
        lightRef.current.shadow.mapSize.height = 4096
        lightRef.current.shadow.bias = -0.00001
        lightRef.current.shadow.radius = 8
        
        // Update shadow camera bounds to account for new light position
        const container = containerRef.current
        const containerWidth = container.clientWidth || container.offsetWidth || 1
        const containerHeight = container.clientHeight || container.offsetHeight || 1
        const shadowCameraSize = Math.max(containerWidth, containerHeight) * 3.5
        const shadowOffsetX = shadowPositionX * 0.3
        const shadowOffsetY = shadowPositionY * 0.3
        lightRef.current.shadow.camera.left = -shadowCameraSize / 2 + shadowOffsetX
        lightRef.current.shadow.camera.right = shadowCameraSize / 2 + shadowOffsetX
        lightRef.current.shadow.camera.top = shadowCameraSize / 2 + shadowOffsetY
        lightRef.current.shadow.camera.bottom = -shadowCameraSize / 2 + shadowOffsetY
        lightRef.current.shadow.camera.updateProjectionMatrix()
        lightRef.current.shadow.needsUpdate = true

        renderFrame()
    }, [shadowPositionX, shadowPositionY, renderFrame])

    // Update shadow intensity (darkness) - hardcoded to 1
    useEffect(() => {
        if (!lightRef.current || !ambientLightRef.current) return

        // Shadow darkness is controlled by the ratio of directional to ambient light
        // shadowIntensity = 1 (hardcoded), make shadows very dramatic

        const shadowIntensity = 1 // Hardcoded
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
    }, [renderFrame])

    // Update cast shadow opacity when it changes
    useEffect(() => {
        if (!backgroundPlaneRef.current || !containerRef.current) return

        const material = backgroundPlaneRef.current.material as any
        // ShadowMaterial: adjust opacity based on castShadowOpacity
        material.opacity = castShadowOpacity
        material.needsUpdate = true

        // Update plane size to match shadow camera bounds
        const container = containerRef.current
        const containerWidth = container.clientWidth || container.offsetWidth || 1
        const containerHeight = container.clientHeight || container.offsetHeight || 1
        const planeSize = Math.max(containerWidth, containerHeight) * 3.5
        
        // Dispose old geometry and create new one with updated size
        const oldGeometry = backgroundPlaneRef.current.geometry
        const newGeometry = new PlaneGeometry(planeSize, planeSize)
        backgroundPlaneRef.current.geometry = newGeometry
        oldGeometry.dispose()

        renderFrame()
    }, [castShadowOpacity, renderFrame])

    // Size monitoring - optimized for Framer canvas
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleResize = () => {
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            
            // For preview/live mode, always update if dimensions are valid
            // For canvas mode, only update if scene is initialized
            if (width > 0 && height > 0) {
                const last = lastSizeRef.current
                const sizeChanged =
                    Math.abs(width - last.width) > 0.5 ||
                    Math.abs(height - last.height) > 0.5
                
                if (sizeChanged) {
                    // In preview/live mode, update immediately
                    // In canvas mode, only update if scene is ready
                    if (!isCanvas || (rendererRef.current && cameraRef.current && meshRef.current)) {
                        last.width = width
                        last.height = height
                        updateSize(width, height)
                        renderFrame()
                    }
                }
            }
        }

        // Initial resize - delay to ensure scene is set up
        // In preview mode, the scene might not be ready immediately
        // Use multiple attempts to catch when container gets dimensions
        let attemptCount = 0
        const maxAttempts = 10
        const attemptResize = () => {
            if (attemptCount < maxAttempts) {
                attemptCount++
                handleResize()
                // If scene isn't ready yet, try again
                if (!rendererRef.current || !sceneRef.current) {
                    setTimeout(attemptResize, isCanvas ? 50 : 100)
                }
            }
        }
        const initialResizeTimeout = setTimeout(attemptResize, isCanvas ? 0 : 50)

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
                          // Only update lastSizeRef if scene is ready (canvas mode requirement)
                          if (rendererRef.current && cameraRef.current && meshRef.current) {
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

        return () => {
            clearTimeout(initialResizeTimeout)
            resizeCleanup()
        }
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

    // Show canvas when scene is initialized (mesh will be visible even before texture loads)
    // The mesh will show with back color until texture loads
    const isReady = sceneRef.current !== null && meshRef.current !== null
    
    // Calculate offset to center the larger canvas within the container
    // This gives extra space for shadows while keeping the sticker centered
    const offsetPercent = ((CANVAS_SCALE - 1) / 2) * 100

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
                    // In canvas mode, use explicit dimensions for better responsiveness
                    // In preview/live mode, let JavaScript set dimensions
                    ...(isCanvas ? {
                        width: `${CANVAS_SCALE * 100}%`,
                        height: `${CANVAS_SCALE * 100}%`,
                    } : {}),
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
    curlMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["semicircle", "spiral"],
        optionTitles: ["Semicircle", "Spiral"],
        defaultValue: "spiral",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    animation:{
        type:ControlType.Object,
        title:"Animation",
        controls:{
            show:{
                type:ControlType.Enum,
                title:"Show",
                options:["initial","final"],
                optionTitles:["1 – Initial","2 – Final"],
                defaultValue:"final",
                displaySegmentedControl:true,
                segmentedControlDirection:"vertical",
                description:"The state to show in the canvas",
            },
            curlAmountStart:{
                type: ControlType.Number,
                title: "Curl 1",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.45,
            },
            curlRadiusStart:{
                type: ControlType.Number,
                title: "Radius 1",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.15,
            },
            curlStartStart:{
                type: ControlType.Number,
                title: "Start 1",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.8,
            },
            curlAmountEnd:{
                type: ControlType.Number,
                title: "Curl 2",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.45,
            },
            
            curlRadiusEnd:{
                type: ControlType.Number,
                title: "Radius 2",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.15,
            },
        
            curlStartEnd:{
                type: ControlType.Number,
                title: "Start 2",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.55,
            },
        }
    },
    curlRotation: {
        type: ControlType.Number,
        title: "Direction",
        min: 0,
        max: 360,
        step: 15,
        defaultValue: 315,
        unit: "°",
    },
    
    shadowPositionX: {
        type: ControlType.Number,
        title: "Light X",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: -400,
    },
    shadowPositionY: {
        type: ControlType.Number,
        title: "Light Y",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: 0,
    },
    castShadowOpacity: {
        type: ControlType.Number,
        title: "Shadow",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.3,
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
