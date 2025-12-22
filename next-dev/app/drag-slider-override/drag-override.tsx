import {
    forwardRef,
    type ComponentType,
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
} from "react"
import { RenderTarget } from "framer"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Create a centralized store for all drag-based animations
const useVariantStore = createStore({
    currentIndex: 0,
    contentVariants: ["Breakfast", "Lunch", "Snacks", "Dinner"],
    // === ROTATION SYSTEM ===
    // The rotation system tracks 2 types of rotation:
    // 1. PERSISTENT rotation from completed drag gestures (stored in `rotation`)
    // 2. TEMPORARY rotation during active dragging (stored in `gestureRotation`)

    rotation: 0, // PERSISTENT: Cumulative rotation from all completed drag gestures (±90° increments)
    // Always starts at 0° and accumulates: 0° → 90° → 180° → 270° → 360° etc.
    // Persists across variant changes (rotation doesn't reset when switching variants)

    gestureRotation: 0, // TEMPORARY: Subtle rotation during active drag gesture (0° to ±8°)
    // Used for visual feedback while dragging (tilt effect)
    // Reset to 0 when drag ends or snaps to full rotation
    // This creates the "preview" of rotation direction before committing

    isDragging: false, // Flag: true when user is actively dragging
    hasSnapped: false, // Flag: true when current drag gesture has already applied a ±90° rotation
    // Prevents multiple rotations per single drag gesture
    isInitialized: false, // Flag: true when store has been initialized (prevents multiple inits)
})

// --- Rotation System Helpers ---------------------------------------------------------------

// VARIANT_KEYS: Used to match URL fragments and data-framer-name attributes to variant indices
// Example: URL contains "lunch" → maps to index 1 → contentVariants[1] = "Lunch"
const VARIANT_KEYS = ["breakfast", "lunch", "snacks", "dinner"]

// NOTE: do not call useVariantStore.setState - it doesn't exist for Framer's store hoo

// === Initial Variant Setters (single per page) ===============================================
// These overrides synchronously set the initial content index and prevent rendering until ready
// to avoid race conditions and layout jumps. Use only one per page.

function createInitialIndexSetter(targetIndex: number) {
    return function withSetIndex(Component: ComponentType): ComponentType {
        return forwardRef((props: any, ref) => {
            // CANVAS MODE: Skip all logic, let Framer handle variants natively
            if (RenderTarget.current() === RenderTarget.canvas) {
                return <Component ref={ref} {...props} />
            }

            const [store, setStore] = useVariantStore()
            const hasInitialized = useRef(false)

            // CRITICAL: Set store EXACTLY ONCE, but do it in a passive effect
            // so we don't update during hydration and trip Suspense boundaries
            useEffect(() => {
                if (!hasInitialized.current && !store.isInitialized) {
                    hasInitialized.current = true
                    setStore({
                        currentIndex: targetIndex,
                        rotation: 0,
                        gestureRotation: 0,
                        isDragging: false,
                        hasSnapped: false,
                        isInitialized: true,
                    })
                }
            }, [store.isInitialized])

            // FRAMER PREVIEW RELOAD DETECTION: Reset on every component mount in preview
            // This handles Framer's navigation/reload behavior where components re-mount
            useEffect(() => {
                if (store.isInitialized && store.currentIndex !== targetIndex) {
                    // In Framer preview, always reset to target variant on mount
                    // This ensures store variants match native Framer variants after navigation
                    // console.log(
                    //     `🔄 Framer reload detected - resetting to variant ${targetIndex} (${store.contentVariants[targetIndex]})`
                    // )
                    setStore({
                        currentIndex: targetIndex,
                        rotation: 0, // Also reset rotation to ensure full sync
                    })
                }
            }, []) // Empty deps = runs only on mount

            return <Component ref={ref} {...props} />
        })
    }
}

export function withSetBreakfast(Component: ComponentType): ComponentType {
    return createInitialIndexSetter(0)(Component)
}
export function withSetLunch(Component: ComponentType): ComponentType {
    return createInitialIndexSetter(1)(Component)
}
export function withSetSnacks(Component: ComponentType): ComponentType {
    return createInitialIndexSetter(2)(Component)
}
export function withSetDinner(Component: ComponentType): ComponentType {
    return createInitialIndexSetter(3)(Component)
}

/**
 * Drag Override - Detects horizontal drags to switch variants
 * Drag right = next variant, drag left = previous variant
 */
export function withVariantDrag(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()
        const localRef = useRef<any>(null)

        // helper to forward ref + keep local one
        const setMergedRef = (node: any) => {
            localRef.current = node
            if (typeof ref === "function") ref(node)
            else if (ref && typeof (ref as any) === "object")
                (ref as any).current = node
        }

        const handleDragStart = () => {
            // === DRAG START: Initialize new gesture ===
            // Reset TEMPORARY rotation values but keep PERSISTENT rotation from previous gestures
            // - isDragging: true (enables gestureRotation in rotation listener)
            // - gestureRotation: 0 (reset temporary rotation for new gesture)
            // - hasSnapped: false (allow this gesture to apply rotation)
            // - rotation: UNCHANGED (keep accumulated rotation from previous drags)
            setStore({
                isDragging: true,
                gestureRotation: 0,
                hasSnapped: false,
            })
            //console.log('🔄 Central drag started - gestureRotation = 0 (rotation unchanged)')
            //console.log('🔄 RenderTarget:', RenderTarget.current())
        }

        // Removed DOM-based variant initialization/sync. Framer will manage active variants.

        const handleDrag = (event: any, info: any) => {
            //console.log('🔄 Drag event - offsetX:', info.offset.x, 'hasSnapped:', store.hasSnapped)

            // === DRAG PREVENTION: One rotation per gesture ===
            // If we already applied a ±90° rotation during this drag, ignore further updates
            // This prevents multiple snaps during a single long drag gesture
            if (store.hasSnapped) {
                //console.log('🔄 Ignoring drag - already snapped')
                return
            }

            // === THRESHOLD CALCULATION: Determine when to start rotating ===
            // rotationThreshold: Minimum distance to start any rotation (100px or 5% viewport width)
            // This prevents accidental rotations from small touches/movements
            const vwThreshold =
                typeof window !== "undefined" ? window.innerWidth * 0.05 : 0
            const rotationThreshold = Math.max(100, vwThreshold) // px or 5vw, whichever is larger

            //console.log('🔄 Threshold check - offsetX:', Math.abs(info.offset.x), 'threshold:', rotationThreshold)

            // === BELOW THRESHOLD: No rotation yet ===
            if (Math.abs(info.offset.x) < rotationThreshold) {
                // Movement too small - reset any temporary rotation and wait for more movement
                //console.log('🔄 Drag too small - below threshold')
                setStore({ gestureRotation: 0 })
                return
            }

            // === GESTURE ROTATION: Subtle tilt during drag ===
            // Creates visual feedback showing rotation direction without committing to full rotation
            // Maps drag progress to 0°-8° rotation for subtle tilt effect
            const maxRotation = 8 // Maximum tilt during gesture (degrees)
            const dragProgress =
                (Math.abs(info.offset.x) - rotationThreshold) /
                rotationThreshold
            const currentDragRotation = Math.min(
                dragProgress * maxRotation,
                maxRotation
            )

            // === ROTATION DIRECTION: Apply rotation based on drag direction ===
            // info.offset.x > 0: drag right → positive rotation (follows mouse)
            // info.offset.x < 0: drag left → negative rotation (follows mouse)
            const newRotation =
                info.offset.x > 0
                    ? currentDragRotation // positive (right drag = positive)
                    : -currentDragRotation // negative (left drag = negative)

            // Update TEMPORARY gestureRotation (will be added to persistent rotation in listener)
            setStore({ gestureRotation: newRotation })
            //console.log('🔄 Central drag - gestureRotation:', newRotation, 'offsetX:', info.offset.x)
        }

        const handleDragEnd = (event: any, info: any) => {
            //console.log("🔄 Drag end - offsetX:", info.offset.x)

            // === THRESHOLD CHECK: 100px minimum for variant change ===
            const threshold = 100 // Fixed 100px threshold

            if (Math.abs(info.offset.x) < threshold) {
                // Too small - just clear drag state, no variant change
                setStore({
                    isDragging: false,
                    gestureRotation: 0,
                    hasSnapped: false,
                })
                //console.log("🔄 Drag too small - no changes")
                return
            }

            // === DRAG > 100px: Switch variant AND update rotation to match ===
            let newIndex

            if (info.offset.x > 0) {
                // Dragged right - DECREASE index (clockwise rotation -90°)
                newIndex =
                    store.currentIndex === 0
                        ? store.contentVariants.length - 1
                        : store.currentIndex - 1
                //console.log("🚀 RIGHT: previous variant (clockwise rotation)")
            } else {
                // Dragged left - INCREASE index (counter-clockwise rotation +90°)
                newIndex =
                    (store.currentIndex + 1) % store.contentVariants.length
                //console.log(
                //    "🚀 LEFT: next variant (counter-clockwise rotation)"
                //)
            }

            // === INCREMENTAL ROTATION: Add/subtract 90° from current rotation ===
            // Each drag gesture increments/decrements the rotation by 90°
            // This creates a continuous spinning effect that can go beyond 360°
            const rotationDelta = info.offset.x > 0 ? 90 : -90 // +90° for right drag, -90° for left drag
            const newRotation = store.rotation + rotationDelta

            // console.log(
            //     "🔄 APPLYING: variant",
            //     store.contentVariants[newIndex],
            //     "index",
            //     newIndex,
            //     "rotation",
            //     newRotation
            // )

            // === ATOMIC: Variant + rotation change together ===
            setStore({
                currentIndex: newIndex,
                rotation: newRotation,
                gestureRotation: 0,
                hasSnapped: false,
                isDragging: false,
            })
        }

        return (
            <Component
                ref={setMergedRef}
                {...props}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                style={{
                    ...props.style,
                    cursor: "grab",
                }}
                whileDrag={{ cursor: "grabbing" }}
            />
        )
    })
}

/**
 * Variant Initialization Override - ONLY handles initial variant setup
 * Sets the initial variant based on data-framer-name or URL, then stops listening
 * Apply this to components that need initial variant but shouldn't change dynamically
 * The rotation of the parent container will create the visual effect of switching variants
 */
export function withVariantInitialization(
    Component: ComponentType
): ComponentType {
    return forwardRef((props: any, ref) => {
        // Pass-through: let Framer manage initial variant; no capture or gating needed
        return <Component ref={ref} {...props} />
    })
}

/**
 * Variant Listener Override - Listens to store changes and applies variants
 * Apply this to components that should change variants based on store updates
 */
export function withContentVariantListener(
    Component: ComponentType
): ComponentType {
    return forwardRef((props: any, ref) => {
        // CANVAS MODE: Skip all logic, let Framer handle variants natively
        if (RenderTarget.current() === RenderTarget.canvas) {
            return <Component ref={ref} {...props} />
        }

        const [store] = useVariantStore()
        const currentVariant = store.contentVariants[store.currentIndex]

        // Gate variant application until after mount and initialization
        // to avoid updates during hydration and the initial flash
        const [isMounted, setIsMounted] = useState(false)
        useEffect(() => {
            setIsMounted(true)
        }, [])

        // === INCREMENTAL ROTATION SYSTEM ===
        // With incremental rotations, rotation and variant index are independent
        // Rotation accumulates from user interactions, variant changes from store updates
        // No need to check for mismatches in this system

        //console.log("👂 Variant listener - applying variant:", currentVariant)
        return (
            <Component
                ref={ref}
                {...props}
                // Hide until mounted to prevent the flash of wrong variant
                style={{
                    ...props.style,
                    visibility: isMounted ? (props.style?.visibility ?? "visible") : "hidden",
                }}
                {...(isMounted ? { variant: currentVariant } : {})}
            />
        )
    })
}

/**
 * Rotation Listener Override - Listens to store and applies rotation transforms
 * Apply this to components that should rotate based on drag gestures
 */
export function withRotationListener(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        // CANVAS MODE: Skip all logic, let Framer handle variants natively
        if (RenderTarget.current() === RenderTarget.canvas) {
            return <Component ref={ref} {...props} />
        }

        const [store, setStore] = useVariantStore()

        // === ENSURE ROTATION STARTS AT 0° ON FIRST LOAD ===
        // Reset rotation to 0° on first mount to prevent stale rotation state
        useLayoutEffect(() => {
            if (store.rotation !== 0) {
                setStore({ rotation: 0 })
            }
        }, [])
        
        // === SIMPLIFIED ROTATION: Always start from 0°, accumulate ±90° increments ===
        // - store.rotation: Cumulative ±90° rotations from all completed drag gestures (starts at 0°)
        // - store.gestureRotation: 0°-8° tilt during active drag for visual feedback
        // Example states:
        // - At rest: currentRotation = 180° + 177° (shows tilt direction)
        // - During drag: currentRotation = 180° + (-3°) = 177° (shows tilt direction)
        // - After snap: currentRotation = 270° + 0° = 0° (new persistent rotation)
        const currentRotation =
            store.rotation + (store.isDragging ? store.gestureRotation : 0)
        
        //console.log('🔄 Rotation listener - applying rotation:', currentRotation)

        return (
            <Component
                ref={ref}
                {...props}
                style={{
                    ...props.style,
                    transform: `rotate(${currentRotation}deg)`,
                    transformOrigin: "center center",
                    // Force the transform to be applied
                    willChange: "transform",
                }}
                // Also try using animate prop for Framer Motion components
                animate={{
                    rotate: currentRotation,
                }}
            />
        )
    })
}

/**
 * Button Override: withNext
 * - Goes to the previous variant
 * - Applies +90deg rotation increment
 */
export function withNext(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()

        const handleClick = (event?: any) => {
            // === BUTTON ROTATION: Go to next variant with incremental rotation ===
            // Advances to next variant AND adds +90° to current rotation
            // This creates the same incremental effect as drag gestures
            const nextIndex =
                (store.currentIndex + 1) % store.contentVariants.length
            const newRotation = store.rotation - 90 // Add +90° to current rotation
            setStore({
                currentIndex: nextIndex, // Switch to next variant
                rotation: newRotation, // Increment rotation by +90°
                gestureRotation: 0, // Clear any temporary rotation
                hasSnapped: true, // Mark as "completed gesture" state
                isDragging: false, // Ensure drag state is clear
            })
            if (props.onClick) props.onClick(event)
            if (props.onTap) props.onTap(event)
        }

        return (
            <Component
                ref={ref}
                {...props}
                onClick={handleClick}
                onTap={handleClick}
            />
        )
    })
}

/**
 * Button Override: withPrevious
 * - Goes to next variant (wrap-around)
 * - Applies -90deg rotation increment
 */
export function withPrevious(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const [store, setStore] = useVariantStore()

        const handleClick = (event?: any) => {
            // === BUTTON ROTATION: Go to previous variant with incremental rotation ===
            // Goes to previous variant AND subtracts -90° from current rotation
            // This creates the same incremental effect as drag gestures
            const prevIndex =
                store.currentIndex === 0
                    ? store.contentVariants.length - 1
                    : store.currentIndex - 1
            const newRotation = store.rotation + 90 // Subtract -90° from current rotation
            setStore({
                currentIndex: prevIndex, // Switch to previous variant
                rotation: newRotation, // Decrement rotation by -90°
                gestureRotation: 0, // Clear any temporary rotation
                hasSnapped: true, // Mark as "completed gesture" state
                isDragging: false, // Ensure drag state is clear
            })
            if (props.onClick) props.onClick(event)
            if (props.onTap) props.onTap(event)
        }

        return (
            <Component
                ref={ref}
                {...props}
                onClick={handleClick}
                onTap={handleClick}
            />
        )
    })
}
