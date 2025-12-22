import { forwardRef, type ComponentType } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Create stores for variant management
const useDesktopVariantStore = createStore({
    currentIndex: 0,
    variants: [
        "Desktop - Breakfast",
        "Desktop - Lunch",
        "Desktop - Snacks",
        "Desktop - Dinner",
    ],
})

const useTabletVariantStore = createStore({
    currentIndex: 0,
    variants: [
        "Tablet - Breakfast",
        "Tablet - Lunch",
        "Tablet - Snacks",
        "Tablet - Dinner",
    ],
})

const usePhoneVariantStore = createStore({
    currentIndex: 0,
    variants: [
        "Phone - Breakfast",
        "Phone - Lunch",
        "Phone - Snacks",
        "Phone - Dinner",
    ],
})

// === UNIVERSAL DRAG OVERRIDE ===
// This single function works across all breakpoints and variants
// It detects drag gestures and advances to the next variant in the current store

export function withVariantDrag(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        // Get all stores - the active one will be determined by which breakpoint we're on
        const desktopStore = useDesktopVariantStore()
        const tabletStore = useTabletVariantStore()
        const phoneStore = usePhoneVariantStore()

        const handleDragEnd = (event: any, info: any) => {
            // Simple drag detection: if dragged more than 50px horizontally
            if (Math.abs(info.offset.x) > 50) {
                // Determine which store is currently active by checking which one has been initialized
                let activeStore = null
                let storeName = ""

                if (desktopStore.currentIndex !== 0 || desktopStore.variants[0] === "Desktop - Breakfast") {
                    activeStore = desktopStore
                    storeName = "Desktop"
                } else if (tabletStore.currentIndex !== 0 || tabletStore.variants[0] === "Tablet - Breakfast") {
                    activeStore = tabletStore
                    storeName = "Tablet"
                } else if (phoneStore.currentIndex !== 0 || phoneStore.variants[0] === "Phone - Breakfast") {
                    activeStore = phoneStore
                    storeName = "Phone"
                }

                if (activeStore) {
                    let newIndex

                    if (info.offset.x < 0) {
                        // Dragged right - next variant
                        newIndex = (activeStore.currentIndex + 1) % activeStore.variants.length
                        console.log(
                            `🚀 ${storeName} - Dragged RIGHT - next variant:`,
                            activeStore.variants[newIndex]
                        )
                    } else {
                        // Dragged left - previous variant
                        newIndex =
                            activeStore.currentIndex === 0
                                ? activeStore.variants.length - 1
                                : activeStore.currentIndex - 1
                        console.log(
                            `🚀 ${storeName} - Dragged LEFT - previous variant:`,
                            activeStore.variants[newIndex]
                        )
                    }

                    activeStore.currentIndex = newIndex
                }
            }
        }

        return (
            <Component
                ref={ref}
                {...props}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                dragMomentum={false}
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

// === HELPER FUNCTION: Generate variant-specific listeners ===
function createVariantListener(
    storeHook: any,
    variantIndex: number,
    deviceName: string,
    mealName: string
) {
    return function(Component: ComponentType): ComponentType {
        return forwardRef((props: any, ref) => {
            const store = storeHook()

            // MANUAL INITIALIZATION: Set store to specific variant index
            if (store.currentIndex !== variantIndex) {
                store.currentIndex = variantIndex
            }

            const currentVariant = store.variants[store.currentIndex]
            console.log(`👂 ${deviceName} ${mealName} - applying variant:`, currentVariant)

            return <Component ref={ref} {...props} variant={currentVariant} />
        })
    }
}

// === DESKTOP VARIANT LISTENERS ===
export function withDesktopBreakfast(Component: ComponentType): ComponentType {
    return createVariantListener(useDesktopVariantStore, 0, "Desktop", "Breakfast")(Component)
}
export function withDesktopLunch(Component: ComponentType): ComponentType {
    return createVariantListener(useDesktopVariantStore, 1, "Desktop", "Lunch")(Component)
}
export function withDesktopSnacks(Component: ComponentType): ComponentType {
    return createVariantListener(useDesktopVariantStore, 2, "Desktop", "Snacks")(Component)
}
export function withDesktopDinner(Component: ComponentType): ComponentType {
    return createVariantListener(useDesktopVariantStore, 3, "Desktop", "Dinner")(Component)
}

// === TABLET VARIANT LISTENERS ===
export function withTabletBreakfast(Component: ComponentType): ComponentType {
    return createVariantListener(useTabletVariantStore, 0, "Tablet", "Breakfast")(Component)
}
export function withTabletLunch(Component: ComponentType): ComponentType {
    return createVariantListener(useTabletVariantStore, 1, "Tablet", "Lunch")(Component)
}
export function withTabletSnacks(Component: ComponentType): ComponentType {
    return createVariantListener(useTabletVariantStore, 2, "Tablet", "Snacks")(Component)
}
export function withTabletDinner(Component: ComponentType): ComponentType {
    return createVariantListener(useTabletVariantStore, 3, "Tablet", "Dinner")(Component)
}

// === PHONE VARIANT LISTENERS ===
export function withPhoneBreakfast(Component: ComponentType): ComponentType {
    return createVariantListener(usePhoneVariantStore, 0, "Phone", "Breakfast")(Component)
}
export function withPhoneLunch(Component: ComponentType): ComponentType {
    return createVariantListener(usePhoneVariantStore, 1, "Phone", "Lunch")(Component)
}
export function withPhoneSnacks(Component: ComponentType): ComponentType {
    return createVariantListener(usePhoneVariantStore, 2, "Phone", "Snacks")(Component)
}
export function withPhoneDinner(Component: ComponentType): ComponentType {
    return createVariantListener(usePhoneVariantStore, 3, "Phone", "Dinner")(Component)
}
