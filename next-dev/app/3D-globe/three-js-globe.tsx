import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    SphereGeometry,
    MeshBasicMaterial,
    Color,
    Mesh,
    Group,
    BufferGeometry,
    Float32BufferAttribute,
    LineBasicMaterial,
    Line,
    LineLoop,
    InstancedMesh,
    Matrix4,
    Raycaster,
    Vector2,
    EdgesGeometry,
    LineSegments,
    TubeGeometry,
    CatmullRomCurve3,
    Vector3,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"
import {
    geoEquirectangular,
    geoPath,
    geoGraticule,
} from "https://cdn.jsdelivr.net/npm/d3-geo@3/+esm"

// Type declaration for requestIdleCallback
declare function requestIdleCallback(
    callback: (deadline: {
        timeRemaining: () => number
        didTimeout: boolean
    }) => void,
    options?: { timeout?: number }
): number

// Type definitions
interface DotData {
    lng: number
    lat: number
    // Pre-computed 3D position on unit sphere
    x: number
    y: number
    z: number
}

interface Marker {
    lat: number
    lng: number
}

interface MarkerConfig {
    markers: Marker[]
    color: string
    size: number
}

interface GlobeProps {
    preview: boolean
    speed: number
    smoothing: number
    density: number
    dotSize: number
    scale: number
    stopOnHover: boolean
    markerConfig: MarkerConfig
    rotationDirection?: "clockwise" | "anticlockwise"
    initialLatitude?: number
    initialLongitude?: number
    oceanColor?: string
    outlineColor?: string
    dotColor?: string
    graticuleColor?: string
    outlineWidth?: number
    gridWidth?: number
    dragSpeed?: number
    detail?: number
    drag?: boolean
    style?: React.CSSProperties
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

// Color parsing function to extract RGB and alpha
// Returns transparent if input is empty/undefined
// Supports hex, rgba, and CSS variables (Framer color tokens)
function parseColorToRgba(input: string | undefined): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input || input.trim() === "") return { r: 0, g: 0, b: 0, a: 0 }
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

// Speed: UI [0..1] → internal [0..2] (rotation speed, 0 = no auto-rotation)
function mapSpeedUiToInternal(ui: number): number {
    if (ui === 0) return 0
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0, 1.0, 0, 0.9)
}

// Density: UI [0.1..1] → dot spacing [24..8] (higher UI = more dense = smaller spacing)
function mapDensityUiToSpacing(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 24, 8)
}

// Scale: UI [0..1] → zoom multiplier [0.5..3.0] (base radius multiplier)
function mapScaleUiToMultiplier(ui: number): number {
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0, 1.0, 0.2, 1.0)
}

// Dot Size: UI [0..1] → size multiplier [0.5..3.0] (relative to base dot size)
function mapDotSizeUiToMultiplier(ui: number): number {
    const clamped = Math.max(0, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 0.1, 0.5)
}

// Marker Size: UI [0..100] → size multiplier [0.1..2.5] (relative to base marker size)
function mapMarkerDotSizeUiToMultiplier(ui: number): number {
    const clamped = Math.max(0, Math.min(100, ui))
    return mapLinear(clamped, 0, 100, 0.1, 2.5)
}

// Detail: UI [0.1..1] → point sampling step [10..1] (higher detail = smaller step = more points)
function mapDetailToStepSize(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    // detail = 1 → step = 1 (use all points)
    // detail = 0.1 → step = 10 (use every 10th point)
    return mapLinear(clamped, 0.1, 1.0, 10, 1)
}

// Simplify coordinate ring by sampling points based on detail level
// Always keeps first and last point to maintain closed loops
function simplifyRing(ring: number[][], detail: number): number[][] {
    if (ring.length < 2) return ring
    if (detail >= 1) return ring // No simplification at max detail

    const stepSize = Math.max(1, Math.floor(mapDetailToStepSize(detail)))
    const simplified: number[][] = []

    // Always include first point
    simplified.push(ring[0])

    // Sample points at step intervals
    for (let i = stepSize; i < ring.length - 1; i += stepSize) {
        const idx = Math.min(i, ring.length - 1)
        simplified.push(ring[idx])
    }

    // Always include last point (if different from first)
    const lastPoint = ring[ring.length - 1]
    const firstPoint = ring[0]
    const isClosed =
        Math.abs(lastPoint[0] - firstPoint[0]) < 0.0001 &&
        Math.abs(lastPoint[1] - firstPoint[1]) < 0.0001

    if (!isClosed) {
        simplified.push(lastPoint)
    }

    // Ensure we have at least 2 points
    return simplified.length >= 2 ? simplified : ring
}

// Convert lat/lng to 3D position on unit sphere
// Standard geographic to 3D conversion:
// - lat: -90 (south pole) to +90 (north pole)
// - lng: -180 (west) to +180 (east)
// Three.js coordinate system: Y up, Z forward, X right
function latLngToPosition(
    lat: number,
    lng: number
): { x: number; y: number; z: number } {
    const latRad = lat * (Math.PI / 180)
    const lngRad = lng * (Math.PI / 180)

    // Standard spherical to Cartesian conversion
    // x: east-west (positive = east)
    // y: north-south (positive = north)
    // z: forward-back (positive = toward viewer at 0° longitude)
    const x = Math.cos(latRad) * Math.sin(lngRad) // East-west
    const y = Math.sin(latRad) // North-south
    const z = Math.cos(latRad) * Math.cos(lngRad) // Forward-back

    return { x, y, z }
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 * @framerDisableUnlink
 */
export default function Globe({
    preview = false,
    speed = 0.1,
    smoothing = 1,
    density = 0.8,
    dotSize = 0.4,
    scale = 0.9,
    stopOnHover = true,
    markerConfig = { markers: [], color: "#ffffff", size: 0.4 },
    rotationDirection = "clockwise",
    initialLatitude = 42,
    initialLongitude = -15,
    oceanColor = "#000000",
    outlineColor ,
    dotColor = "#ffffff",
    graticuleColor = "#616161",
    outlineWidth = 1,
    gridWidth = 1,
    dragSpeed = 0.5,
    detail = 1,
    drag = true,
    style,
}: GlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Check canvas mode ONCE at component mount and cache it
    // RenderTarget doesn't change during component lifetime, so we cache it for performance
    const isCanvasRef = useRef<boolean | null>(null)
    if (isCanvasRef.current === null) {
        isCanvasRef.current = RenderTarget.current() === RenderTarget.canvas
    }
    const isCanvas = isCanvasRef.current
    
    // Ref for preview - only matters in canvas mode
    // In preview/production mode, preview prop is completely ignored
    const previewRef = useRef(preview)
    
    // Ref to store animation frame ID for preview effect to restart animation
    const animationFrameRef = useRef<number | null>(null)
    const animateFnRef = useRef<(() => void) | null>(null)
    const startAnimationRef = useRef<(() => void) | null>(null)
    
    // Update previewRef ONLY when in canvas mode
    // Use a stable value when not in canvas to prevent React from tracking preview changes
    // This prevents React from re-running effects when preview changes in non-canvas mode
    const previewForRefUpdate = isCanvas ? preview : false
    useEffect(() => {
        if (isCanvas) {
            previewRef.current = preview
        }
    }, [previewForRefUpdate, isCanvas])

    // Map UI values to internal values - memoized to prevent unnecessary recalculations
    const rotationSpeed = React.useMemo(() => {
        const baseSpeed = mapSpeedUiToInternal(speed)
        return rotationDirection === "anticlockwise" ? -baseSpeed : baseSpeed
    }, [speed, rotationDirection])
    
    const dotSpacing = React.useMemo(() => mapDensityUiToSpacing(density), [density])
    const dotSizeMultiplier = React.useMemo(() => mapDotSizeUiToMultiplier(dotSize), [dotSize])
    const markerRadiusMultiplier = React.useMemo(
        () => mapMarkerDotSizeUiToMultiplier(markerConfig.size),
        [markerConfig.size]
    )
    const scaleMultiplier = React.useMemo(() => mapScaleUiToMultiplier(scale), [scale])

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const containerWidth =
            container.clientWidth || container.offsetWidth || 800
        const containerHeight =
            container.clientHeight || container.offsetHeight || 600

        // Scene setup
        const scene = new Scene()
        const camera = new PerspectiveCamera(
            50,
            containerWidth / containerHeight,
            0.1,
            1000
        )

        // Base radius for globe
        const baseRadius = 1
        const globeRadius = baseRadius * scaleMultiplier

        // Camera distance based on scale
        const cameraDistance = 2.5 / scaleMultiplier
        camera.position.set(0, 0, cameraDistance)
        camera.lookAt(0, 0, 0)

        // Renderer setup
        const renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(containerWidth, containerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        // Set output color space to sRGB for accurate color display
        renderer.outputColorSpace = "srgb"
        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        // Hide canvas until all data is loaded (only in preview mode, not in canvas)
        if (!isCanvas) {
            canvas.style.opacity = "0"
            canvas.style.visibility = "hidden"
        }
        container.appendChild(canvas)

        // Resolve color tokens (CSS variables) and parse colors for opacity
        const resolvedOceanColor = resolveTokenColor(oceanColor)
        const resolvedOutlineColor = resolveTokenColor(outlineColor)
        const resolvedDotColor = resolveTokenColor(dotColor)
        const resolvedMarkerColor = resolveTokenColor(markerConfig.color)
        const resolvedGraticuleColor = resolveTokenColor(graticuleColor)

        const oceanRgba = parseColorToRgba(resolvedOceanColor)
        const outlineRgba = parseColorToRgba(resolvedOutlineColor)
        const dotRgba = parseColorToRgba(resolvedDotColor)
        const markerRgba = parseColorToRgba(resolvedMarkerColor)
        const graticuleRgba = parseColorToRgba(resolvedGraticuleColor)

        // Create ocean sphere (globe background)
        // Use Color constructor with resolved color for proper sRGB handling
        const oceanGeometry = new SphereGeometry(globeRadius, 64, 64)
        const oceanColorObj = resolvedOceanColor
            ? new Color(resolvedOceanColor)
            : new Color(0, 0, 0)
        const oceanMaterial = new MeshBasicMaterial({
            color: oceanColorObj,
            transparent: oceanRgba.a < 1 || oceanRgba.a === 0,
            opacity: oceanRgba.a,
        })
        const oceanMesh = new Mesh(oceanGeometry, oceanMaterial)
        scene.add(oceanMesh)

        // Create globe outside outline - a simple circle around the sphere with tube geometry
        let globeOutlineMesh: any = null
        if (outlineColor && outlineRgba.a > 0) {
            const outlinePositions: number[] = []
            const segments = 128
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2
                const x = Math.cos(angle) * globeRadius
                const y = Math.sin(angle) * globeRadius
                const z = 0
                outlinePositions.push(x, y, z)
            }

            const outlinePoints: any[] = []
            for (let i = 0; i < outlinePositions.length; i += 3) {
                outlinePoints.push(
                    new Vector3(
                        outlinePositions[i],
                        outlinePositions[i + 1],
                        outlinePositions[i + 2]
                    )
                )
            }

            if (outlinePoints.length >= 2) {
                outlinePoints.push(outlinePoints[0].clone())

                const outlineColorObj = new Color(resolvedOutlineColor)
                const outlineMaterial = new MeshBasicMaterial({
                    color: outlineColorObj,
                    transparent: outlineRgba.a < 1,
                    opacity: outlineRgba.a,
                })

                const curve = new CatmullRomCurve3(outlinePoints)
                const radius = (outlineWidth / 10) * 0.01
                const tubeGeometry = new TubeGeometry(
                    curve,
                    outlinePoints.length * 2,
                    radius,
                    8,
                    false
                )
                globeOutlineMesh = new Mesh(tubeGeometry, outlineMaterial)
            }
        }

        // Continent outlines will be created from GeoJSON data in loadWorldData
        const continentOutlineGroup = new Group()

        // Create simple graticule - circles for parallels, lines for meridians, every 15 degrees
        const graticuleGroup = new Group()

        if (resolvedGraticuleColor && graticuleRgba.a > 0) {
            const graticuleColorObj = resolvedGraticuleColor
                ? new Color(resolvedGraticuleColor)
                : new Color(1, 1, 1)

            const graticuleMaterial = new MeshBasicMaterial({
                color: graticuleColorObj,
                transparent: graticuleRgba.a < 1 || graticuleRgba.a === 0,
                opacity: graticuleRgba.a,
            })

            const gridSpacing = 15 // 15 degrees spacing

            // Create parallels (latitude circles) - horizontal circles
            for (let lat = -90; lat <= 90; lat += gridSpacing) {
                const positions: number[] = []
                const segments = 64
                for (let i = 0; i <= segments; i++) {
                    const lng = (i / segments) * 360 - 180
                    const pos = latLngToPosition(lat, lng)
                    positions.push(
                        pos.x * globeRadius,
                        pos.y * globeRadius,
                        pos.z * globeRadius
                    )
                }

                if (positions && positions.length >= 6) {
                    const points: any[] = []
                    for (let i = 0; i < positions.length; i += 3) {
                        points.push(
                            new Vector3(
                                positions[i],
                                positions[i + 1],
                                positions[i + 2]
                            )
                        )
                    }

                    if (points.length >= 2) {
                        const curve = new CatmullRomCurve3(points)
                        const radius = (gridWidth / 10) * 0.01
                        const tubeGeometry = new TubeGeometry(
                            curve,
                            points.length * 2,
                            radius,
                            8,
                            false
                        )
                        const tubeMesh = new Mesh(
                            tubeGeometry,
                            graticuleMaterial
                        )
                        tubeMesh.renderOrder = 0
                        graticuleGroup.add(tubeMesh)
                    }
                }
            }

            // Create meridians (longitude lines) - vertical lines from pole to pole
            for (let lng = -180; lng < 180; lng += gridSpacing) {
                const positions: number[] = []
                const segments = 64
                for (let i = 0; i <= segments; i++) {
                    const lat = (i / segments) * 180 - 90
                    const pos = latLngToPosition(lat, lng)
                    positions.push(
                        pos.x * globeRadius,
                        pos.y * globeRadius,
                        pos.z * globeRadius
                    )
                }

                if (positions && positions.length >= 6) {
                    const points: any[] = []
                    for (let i = 0; i < positions.length; i += 3) {
                        points.push(
                            new Vector3(
                                positions[i],
                                positions[i + 1],
                                positions[i + 2]
                            )
                        )
                    }

                    if (points.length >= 2) {
                        const curve = new CatmullRomCurve3(points)
                        const radius = (gridWidth / 10) * 0.01
                        const tubeGeometry = new TubeGeometry(
                            curve,
                            points.length * 2,
                            radius,
                            8,
                            false
                        )
                        const tubeMesh = new Mesh(
                            tubeGeometry,
                            graticuleMaterial
                        )
                        tubeMesh.renderOrder = 0
                        graticuleGroup.add(tubeMesh)
                    }
                }
            }
        }

        // Note: graticuleGroup will be added to globeGroup later, not directly to scene

        // Dot generation using bitmap-based land detection (FAST)
        let dotInstances: any = null
        let markerMeshes: any[] = []

        const loadWorldData = async () => {
            try {
                setIsLoading(true)

                // Load higher-resolution GeoJSON (50m instead of 110m) for better accuracy
                const response = await fetch(
                    "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json"
                )
                if (!response.ok) throw new Error("Failed to load land data")

                const landFeatures = await response.json()

                // Create continent outlines from GeoJSON features
                // Clear existing outlines
                while (continentOutlineGroup.children.length > 0) {
                    continentOutlineGroup.remove(
                        continentOutlineGroup.children[0]
                    )
                }

                if (outlineColor && outlineRgba.a > 0) {
                    const outlineColorObj = new Color(resolvedOutlineColor)
                    const outlineMaterial = new MeshBasicMaterial({
                        color: outlineColorObj,
                        transparent: outlineRgba.a < 1,
                        opacity: outlineRgba.a,
                        depthTest: true,
                        depthWrite: true,
                    })

                    // Use d3's geoPath to extract only the actual boundaries (like the source file does)
                    // This ensures we only get the geography contours, not any grid data
                    const projection = geoEquirectangular()
                    const pathGenerator = geoPath().projection(projection)

                    // Process each land feature - only draw the actual boundaries
                    let processedCount = 0
                    let skippedCount = 0

                    landFeatures.features.forEach((feature: any) => {
                        // Skip any features that might be grid-related
                        const featureType =
                            feature.properties?.featurecla ||
                            feature.properties?.type ||
                            ""
                        const featureName = feature.properties?.name || ""

                        // More aggressive filtering - skip anything that might be a grid
                        if (
                            featureType.toLowerCase().includes("graticule") ||
                            featureType.toLowerCase().includes("grid") ||
                            featureType.toLowerCase().includes("line") ||
                            featureName.toLowerCase().includes("graticule") ||
                            featureName.toLowerCase().includes("grid") ||
                            featureName.toLowerCase().includes("line")
                        ) {
                            skippedCount++
                            return
                        }

                        processedCount++

                        // Use d3's path generator to get the path string, then extract coordinates
                        const pathString = pathGenerator(feature)
                        if (!pathString) return

                        // Parse the path string to extract coordinates
                        // d3 path format: "M x,y L x,y L x,y ... Z" or "M x,y L x,y ..."
                        const commands = pathString.match(/[ML][^MLZ]*/g) || []
                        if (commands.length === 0) return

                        // Extract all coordinate pairs from the path
                        const allCoords: [number, number][] = []
                        commands.forEach((cmd: string) => {
                            const coords = cmd.slice(1).trim().split(/\s+/)
                            for (let i = 0; i < coords.length; i += 2) {
                                if (i + 1 < coords.length) {
                                    const x = parseFloat(coords[i])
                                    const y = parseFloat(coords[i + 1])
                                    if (!isNaN(x) && !isNaN(y)) {
                                        // Convert from projected coordinates back to lat/lng
                                        // For equirectangular: x = (lng + 180) / 360 * width, y = (90 - lat) / 180 * height
                                        // Reverse: lng = (x / width) * 360 - 180, lat = 90 - (y / height) * 180
                                        // But we need the actual lat/lng from the feature geometry instead
                                        // Let's use the feature geometry directly instead
                                    }
                                }
                            }
                        })

                        // Actually, let's use the feature geometry directly - it's cleaner
                        const geometry = feature.geometry
                        if (!geometry || !geometry.coordinates) return

                        // Process only the outer ring of polygons (the actual boundaries)
                        const processRing = (ring: number[][]) => {
                            if (ring.length < 2) return

                            // Simplify ring based on detail level
                            const simplifiedRing = simplifyRing(ring, detail)

                            const positions: number[] = []
                            simplifiedRing.forEach((coord: number[]) => {
                                const [lng, lat] = coord
                                const pos = latLngToPosition(lat, lng)
                                positions.push(
                                    pos.x * globeRadius,
                                    pos.y * globeRadius,
                                    pos.z * globeRadius
                                )
                            })

                            if (positions && positions.length >= 6) {
                                const points: any[] = []
                                for (let i = 0; i < positions.length; i += 3) {
                                    points.push(
                                        new Vector3(
                                            positions[i],
                                            positions[i + 1],
                                            positions[i + 2]
                                        )
                                    )
                                }

                                if (
                                    points.length > 0 &&
                                    points[0].distanceTo(
                                        points[points.length - 1]
                                    ) > 0.001
                                ) {
                                    points.push(points[0].clone())
                                }

                                if (points.length >= 2) {
                                    const curve = new CatmullRomCurve3(points)
                                    const radius = (outlineWidth / 10) * 0.01
                                    const tubeGeometry = new TubeGeometry(
                                        curve,
                                        points.length * 2,
                                        radius,
                                        8,
                                        false
                                    )
                                    const tubeMesh = new Mesh(
                                        tubeGeometry,
                                        outlineMaterial
                                    )
                                    tubeMesh.renderOrder = 0
                                    continentOutlineGroup.add(tubeMesh)
                                }
                            }
                        }

                        // Handle Polygon - only outer ring (index 0)
                        if (
                            geometry.type === "Polygon" &&
                            geometry.coordinates.length > 0
                        ) {
                            processRing(geometry.coordinates[0])
                        }
                        // Handle MultiPolygon - only outer ring of each polygon
                        else if (geometry.type === "MultiPolygon") {
                            geometry.coordinates.forEach(
                                (polygon: number[][][]) => {
                                    if (polygon.length > 0) {
                                        processRing(polygon[0])
                                    }
                                }
                            )
                        }
                    })

                    // In canvas mode, render immediately so props update is visible
                    if (isCanvas) {
                        renderer.render(scene, camera)
                    }
                }

                // Create a high-resolution bitmap for accurate land detection
                const bitmapWidth = 2048 // High resolution for better accuracy
                const bitmapHeight = 1024
                const offscreenCanvas = document.createElement("canvas")
                offscreenCanvas.width = bitmapWidth
                offscreenCanvas.height = bitmapHeight
                const ctx = offscreenCanvas.getContext("2d", {
                    willReadFrequently: true,
                })
                if (!ctx) throw new Error("Canvas not supported")

                // Create d3 projection - use fitSize for accurate mapping
                const projection = geoEquirectangular().fitSize(
                    [bitmapWidth, bitmapHeight],
                    { type: "Sphere" }
                )

                const pathGenerator = geoPath()
                    .projection(projection)
                    .context(ctx)

                // Render land to canvas (black background, white land)
                ctx.fillStyle = "#000"
                ctx.fillRect(0, 0, bitmapWidth, bitmapHeight)
                ctx.fillStyle = "#fff"
                ctx.beginPath()
                landFeatures.features.forEach((feature: any) => {
                    pathGenerator(feature)
                })
                ctx.fill()

                // Get bitmap data for fast lookup
                const imageData = ctx.getImageData(
                    0,
                    0,
                    bitmapWidth,
                    bitmapHeight
                )
                const pixels = imageData.data

                // Fast land check using simple nearest-neighbor for precise coordinates
                const isOnLand = (lng: number, lat: number): boolean => {
                    // Convert lat/lng to bitmap coordinates (matching d3 fitSize projection)
                    const x =
                        Math.round(((lng + 180) / 360) * bitmapWidth) %
                        bitmapWidth
                    const y = Math.round(((90 - lat) / 180) * bitmapHeight)

                    // Clamp y to valid range
                    const clampedY = Math.max(0, Math.min(bitmapHeight - 1, y))

                    // Direct pixel lookup
                    const idx = (clampedY * bitmapWidth + x) * 4
                    return pixels[idx] > 128 // Red channel > 128 means land
                }

                // Generate dot coordinates using spacing from density prop
                const dotCoordinates: [number, number][] = []
                const baseStep = dotSpacing * 0.08

                // Generate dots across the globe (FAST with bitmap lookup)
                // Include poles: -90 to +90
                for (let lat = -90; lat <= 90; lat += baseStep) {
                    const latRad = (Math.abs(lat) * Math.PI) / 180
                    const cosLat = Math.cos(latRad)
                    // At poles (lat = ±90), cosLat = 0, so use a fixed step size
                    const lngStep =
                        cosLat > 0.01 ? baseStep / Math.max(0.3, cosLat) : 360

                    for (let lng = -180; lng < 180; lng += lngStep) {
                        if (isOnLand(lng, lat)) {
                            dotCoordinates.push([lng, lat])
                        }
                    }
                }

                // Create dots using instanced mesh (GPU-efficient)
                if (dotCoordinates.length > 0) {
                    // Use simpler geometry (4 segments) for better performance
                    const dotGeometry = new SphereGeometry(
                        0.01 * dotSizeMultiplier,
                        4,
                        4
                    )

                    const dotColorObj = resolvedDotColor
                        ? new Color(resolvedDotColor)
                        : new Color(0.6, 0.6, 0.6)
                    const dotMaterial = new MeshBasicMaterial({
                        color: dotColorObj,
                        transparent: dotRgba.a < 1 || dotRgba.a === 0,
                        opacity: dotRgba.a,
                    })

                    dotInstances = new InstancedMesh(
                        dotGeometry,
                        dotMaterial,
                        dotCoordinates.length
                    )

                    // Set all positions at once (fast)
                    const matrix = new Matrix4()
                    for (let i = 0; i < dotCoordinates.length; i++) {
                        const [lng, lat] = dotCoordinates[i]
                        const pos = latLngToPosition(lat, lng)
                        matrix.makeScale(1, 1, 1)
                        matrix.setPosition(
                            pos.x * globeRadius,
                            pos.y * globeRadius,
                            pos.z * globeRadius
                        )
                        dotInstances.setMatrixAt(i, matrix)
                    }

                    dotInstances.instanceMatrix.needsUpdate = true
                    globeGroup.add(dotInstances)

                    // In canvas mode, render immediately so props update is visible
                    if (isCanvas) {
                        renderer.render(scene, camera)
                    }
                }

                // Update markers before final render
                updateMarkers()

                // Final render
                renderer.render(scene, camera)

                // Show canvas only if we're not in canvas mode (in canvas, it's already visible)
                if (!isCanvas) {
                    canvas.style.opacity = "1"
                    canvas.style.visibility = "visible"
                }

                setIsLoading(false)
            } catch (err) {
                setError("Failed to load land map data")
                setIsLoading(false)
            }
        }

        // Create markers
        const updateMarkers = () => {
            // Remove existing markers
            markerMeshes.forEach((mesh) => globeGroup.remove(mesh))
            markerMeshes = []

            if (markerConfig.markers && markerConfig.markers.length > 0) {
                const markerSize = 0.01 * markerRadiusMultiplier
                const markerGeometry = new SphereGeometry(markerSize, 16, 16)
                const markerColorObj = resolvedMarkerColor
                    ? new Color(resolvedMarkerColor)
                    : new Color(1, 1, 1)
                const markerMaterial = new MeshBasicMaterial({
                    color: markerColorObj,
                })

                markerConfig.markers.forEach((marker) => {
                    if (
                        !marker ||
                        typeof marker.lat !== "number" ||
                        typeof marker.lng !== "number"
                    )
                        return

                    const pos = latLngToPosition(marker.lat, marker.lng)
                    const markerMesh = new Mesh(
                        markerGeometry,
                        markerMaterial.clone()
                    )
                    markerMesh.position.set(
                        pos.x * globeRadius,
                        pos.y * globeRadius,
                        pos.z * globeRadius
                    )
                    globeGroup.add(markerMesh)
                    markerMeshes.push(markerMesh)
                })
            }
        }

        // Rotation state - initialize with user-provided initial rotation
        // Convert degrees to radians: longitude maps to y-axis rotation, latitude to x-axis rotation
        const initialLongitudeRad = (initialLongitude * Math.PI) / 180
        const initialLatitudeRad = (initialLatitude * Math.PI) / 180
        const rotation = { x: initialLongitudeRad, y: initialLatitudeRad }
        const targetRotation = { x: initialLongitudeRad, y: initialLatitudeRad }
        const velocity = { x: 0, y: 0 }
        let isDragging = false
        let isHovering = false
        let lastMouseX = 0
        let lastMouseY = 0
        let lastDragTime = 0 // Timestamp for time-normalized velocity capture
        let animationFrameId: number | null = null
        
        // Delta time tracking for frame-rate independent animation
        // All time-based calculations use deltaTime to ensure consistent behavior
        // regardless of display refresh rate (60Hz, 120Hz, etc.)
        let lastFrameTime = performance.now()
        const targetDeltaTime = 1000 / 60 // Reference delta time (60 FPS = 16.67ms)

        // Lerp factor: smoothing 0 = instant (factor=1), smoothing 1 = very smooth (factor=0.03)
        const lerpFactor =
            smoothing === 0 ? 1 : mapLinear(smoothing, 0, 1, 0.4, 0.03)
        // Velocity decay for throw: higher smoothing = more momentum
        const velocityDecay = mapLinear(smoothing, 0, 1, 0.7, 0.96)

        // Apply rotation to globe group
        const globeGroup = new Group()
        // Apply initial rotation immediately
        globeGroup.rotation.y = initialLongitudeRad
        globeGroup.rotation.x = initialLatitudeRad
        scene.add(globeGroup)
        globeGroup.add(oceanMesh)
        // Add graticule grid (independent from country contours, uses graticuleColor)
        if (graticuleColor && graticuleRgba.a > 0) {
            globeGroup.add(graticuleGroup)
        }
        globeGroup.add(continentOutlineGroup)
        if (dotInstances) globeGroup.add(dotInstances)
        markerMeshes.forEach((mesh) => globeGroup.add(mesh))

        // Animation loop - uses cached isCanvas value for performance
        // RenderTarget doesn't change during component lifetime, so we use the cached value
        const animate = () => {
            // CANVAS MODE: Check preview prop to pause animation when preview is off
            // Use cached isCanvas value instead of checking RenderTarget every frame
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
            // deltaFactor = 1.0 at 60 FPS, 0.5 at 120 FPS, 2.0 at 30 FPS
            const deltaTime = now - lastFrameTime
            lastFrameTime = now
            const deltaFactor = deltaTime / targetDeltaTime
            
            let needsRender = false
            const threshold = 0.01

            // Auto-rotation: add to target when not dragging and not hovering
            // Multiply by deltaFactor for frame-rate independent speed
            if (
                !isDragging &&
                rotationSpeed !== 0 &&
                (!stopOnHover || !isHovering)
            ) {
                targetRotation.x += rotationSpeed * 0.01 * deltaFactor
            }

            // Apply throw velocity when not dragging
            // Velocity and decay are also time-scaled
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
                    // Time-based decay: use pow to make decay frame-rate independent
                    // decay^deltaFactor ensures same decay over same real time
                    const decayFactor = Math.pow(velocityDecay, deltaFactor)
                    velocity.x *= decayFactor
                    velocity.y *= decayFactor
                } else {
                    velocity.x = 0
                    velocity.y = 0
                }
            }

            // Lerp current rotation toward target
            // Time-based lerp: use 1 - (1 - factor)^deltaFactor for smooth interpolation
            const dx = targetRotation.x - rotation.x
            const dy = targetRotation.y - rotation.y

            if (
                Math.abs(dx) > threshold ||
                Math.abs(dy) > threshold ||
                rotationSpeed !== 0 ||
                isDragging
            ) {
                // Frame-rate independent lerp
                const timeLerpFactor = 1 - Math.pow(1 - lerpFactor, deltaFactor)
                rotation.x += dx * timeLerpFactor
                rotation.y += dy * timeLerpFactor
                rotation.y = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, rotation.y)
                )
                needsRender = true
            }

            // Render every frame - no frame limiting needed with delta time
            // The animation is now smooth at any refresh rate
            if (needsRender || rotationSpeed !== 0 || isDragging) {
                // Apply rotation: y-axis for horizontal rotation, x-axis for vertical rotation
                globeGroup.rotation.y = rotation.x
                globeGroup.rotation.x = rotation.y

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
                // Reset frame time to prevent huge delta after pause
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
            lastDragTime = performance.now() // Initialize drag timestamp
            startAnimation()

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const currentTime = performance.now()
                const timeSinceLastMove = currentTime - lastDragTime
                
                // Use proper spherical coordinate rotation
                // Horizontal drag rotates around Y-axis (longitude)
                // Vertical drag rotates around X-axis (latitude)
                const sensitivity = mapLinear(dragSpeed, 0, 1, 0.001, 0.02)
                const dx = moveEvent.clientX - lastMouseX
                const dy = moveEvent.clientY - lastMouseY

                // Update target rotation - match the original behavior
                // Horizontal movement rotates around vertical axis (Y)
                targetRotation.x += dx * sensitivity
                // Vertical movement rotates around horizontal axis (X)
                // Dragging up should pitch the globe up (bring top toward camera)
                targetRotation.y += dy * sensitivity
                // Clamp vertical rotation to prevent flipping
                targetRotation.y = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, targetRotation.y)
                )

                // Track velocity for throw - TIME NORMALIZED
                // Normalize velocity to "radians per reference frame (16.67ms)"
                // This ensures consistent throw behavior regardless of frame rate
                if (timeSinceLastMove > 0) {
                    // Scale velocity to what it would be at 60 FPS (16.67ms per frame)
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

        // Handle hover to stop auto-rotation (only when cursor is over the globe)
        const raycaster = new Raycaster()
        const mouse = new Vector2()

        const handleMouseMove = (event: MouseEvent) => {
            if (!stopOnHover) return

            // Get mouse position in normalized device coordinates (-1 to +1)
            const rect = canvas.getBoundingClientRect()
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            // Update raycaster with camera and mouse position
            raycaster.setFromCamera(mouse, camera)

            // Check if ray intersects with the globe (oceanMesh)
            const intersects = raycaster.intersectObject(oceanMesh)

            // Update hovering state based on intersection
            isHovering = intersects.length > 0
        }

        canvas.addEventListener("mousemove", handleMouseMove)

        // Handle container resize
        const resizeObserver = new ResizeObserver(() => {
            const newWidth =
                container.clientWidth || container.offsetWidth || 800
            const newHeight =
                container.clientHeight || container.offsetHeight || 600

            camera.aspect = newWidth / newHeight
            camera.updateProjectionMatrix()
            renderer.setSize(newWidth, newHeight)

            // Update camera distance based on scale
            const newCameraDistance = 2.5 / scaleMultiplier
            camera.position.set(0, 0, newCameraDistance)
            camera.lookAt(0, 0, 0)

            renderer.render(scene, camera)
        })

        resizeObserver.observe(container)

        // Load world data (which will call updateMarkers and show canvas when complete)
        loadWorldData()

        // Cleanup
        return () => {
            if (animationFrameId !== null)
                cancelAnimationFrame(animationFrameId)
            if (drag) {
            canvas.removeEventListener("mousedown", handleMouseDown)
            }
            canvas.removeEventListener("mousemove", handleMouseMove)
            resizeObserver.disconnect()
            renderer.dispose()
            container.removeChild(canvas)
        }
    }, [
        // Note: preview is intentionally NOT in dependencies to prevent re-initialization
        // Preview only affects behavior in canvas mode via the animate function
        // Derived values (rotationSpeed, dotSpacing, etc.) are memoized and included
        speed,
        smoothing,
        density,
        dotSize,
        scale,
        stopOnHover,
        markerConfig,
        rotationDirection,
        initialLatitude,
        initialLongitude,
        oceanColor,
        outlineColor,
        dotColor,
        graticuleColor,
        outlineWidth,
        gridWidth,
        dragSpeed,
        detail,
        drag,
        // Memoized derived values
        rotationSpeed,
        dotSpacing,
        dotSizeMultiplier,
        markerRadiusMultiplier,
        scaleMultiplier,
        isCanvas,
    ])

    // Handle preview changes - restart animation loop when preview toggles (CANVAS MODE ONLY)
    // Use a stable value when not in canvas to prevent React from tracking preview changes
    // This prevents React from re-running effects when preview changes in non-canvas mode
    const previewForAnimation = isCanvas ? preview : false
    useEffect(() => {
        if (!isCanvas) return

        // Canvas mode only: If preview turned ON and animation is stopped, restart it
        // Use startAnimationRef to properly reset frame time and prevent delta jump
        if (preview && startAnimationRef.current && animationFrameRef.current === null) {
            startAnimationRef.current()
        }
    }, [previewForAnimation, isCanvas])

    // Container styles (inline only)
    const containerStyle: React.CSSProperties = {
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    if (error) {
        return (
            <div style={containerStyle}>
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Error loading Earth visualization"
                    subtitle={error}
                />
            </div>
        )
    }

    return (
        <div style={containerStyle}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
    )
}

// Property Controls (single-word titles, last control with Framer University link)
addPropertyControls(Globe, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
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
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.1,
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
        hidden: (props: GlobeProps) => !props.drag,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag Speed",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.9,
    },
    stopOnHover: {
        type: ControlType.Boolean,
        title: "On Hover",
        defaultValue: true,
        enabledTitle: "Stop",
        disabledTitle: "Rotate",
    },
    initialLatitude: {
        type: ControlType.Number,
        title: "Latitude",
        min: -90,
        max: 90,
        step: 1,
        defaultValue: 42,
    },
    initialLongitude: {
        type: ControlType.Number,
        title: "Longitude",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: -15,
    },
    density: {
        type: ControlType.Number,
        title: "Density",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
    },
    detail: {
        type: ControlType.Number,
        title: "Detail",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
    },
    dotSize: {
        type: ControlType.Number,
        title: "Dot Size",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.4,
    },
    markerConfig: {
        type: ControlType.Object,
        title: "Markers",
        controls: {
            markers: {
                type: ControlType.Array,
                title: "Markers",
                defaultValue: [
                    {
                        lat: 41,
                        lng: 13,
                    },
                ],
                control: {
                    type: ControlType.Object,
                    controls: {
                        lat: {
                            type: ControlType.Number,
                            title: "Lat",
                            min: -90,
                            max: 90,
                            step: 0.1,
                            defaultValue: 25.2,
                        },
                        lng: {
                            type: ControlType.Number,
                            title: "Lng",
                            min: -180,
                            max: 180,
                            step: 0.1,
                            defaultValue: 55.5,
                        },
                    },
                },
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#00f7ff",
            },
            size: {
                type: ControlType.Number,
                title: "Size",
                min: 0,
                max: 100,
                step: 0.1,
                defaultValue: 40,
            },
        },
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dots",
        defaultValue: "#ffffff",
    },
    outlineColor: {
        type: ControlType.Color,
        title: "Outline",
        optional: true,
        defaultValue: "#ffffff",
    },
    outlineWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 1,
        hidden: (props: GlobeProps) => !props.outlineColor,
    },
    graticuleColor: {
        type: ControlType.Color,
        title: "Grid",
        optional: true,
        defaultValue: "#616161",
    },
    gridWidth: {
        type: ControlType.Number,
        title: "Width",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 1,
        hidden: (props: GlobeProps) => !props.graticuleColor,
    },
    oceanColor: {
        type: ControlType.Color,
        title: "Ocean",
        optional: true,
        defaultValue: "#000000",
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

Globe.displayName = "3D Globe"
