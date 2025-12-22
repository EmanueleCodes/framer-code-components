import type { ComponentType } from "react"
import { useEffect } from "react"
import { useVariantStore } from "./Overrides.tsx"

/**
 * Flow Step Overrides
 * 
 * These overrides control the flow behavior of the ROI Calculator.
 * Apply ONE of these to your MASTER WRAPPER COMPONENT (ROI Full Form).
 * 
 * For the individual breakpoint components (Desktop, Tablet, Phone),
 * use the withStepListener override from Overrides.tsx instead.
 */

interface OverrideProps {
    style?: React.CSSProperties
    text?: string
    value?: string
    variant?: string
    [key: string]: unknown
}

// ============================================
// FLOW CONTROL OVERRIDES
// ============================================

/**
 * withOneStepFlow (with3)
 * 
 * Immediately jumps to Step 3, bypassing all forms.
 * Use this when you want to show results directly without any user input.
 * 
 * Flow: → Step 3
 */
export function withOneStepFlow<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        useEffect(() => {
            console.log("🎯 withOneStepFlow: reset triggered", { 
                currentStep: variantStore.currentStep,
                currentFlowType: variantStore.flowType,
                resetCounter: variantStore.resetCounter
            })
            
            // Always set to Step 3 with "direct" flow type when Orchestrator resets
            setVariantStore({
                ...variantStore,
                currentStep: 3,
                flowType: "direct",
            })
        }, [variantStore.resetCounter]) // Watch resetCounter from Orchestrator

        return <Component {...props} />
    }
}

/**
 * withTwoStepFlow_1to3 (with13)
 * 
 * Two-step flow: Form input → Results (skip email gate)
 * User fills out the form at Step 1, then goes directly to Step 3 results.
 * 
 * Flow: Step 1 → Step 3
 */
export function withTwoStepFlow_1to3<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        useEffect(() => {
            console.log("🎯 withTwoStepFlow_1to3: reset triggered", { 
                currentStep: variantStore.currentStep,
                currentFlowType: variantStore.flowType,
                resetCounter: variantStore.resetCounter
            })
            
            // Set to Step 1 with "1to3" flow type when Orchestrator resets
            setVariantStore({
                ...variantStore,
                currentStep: 1,
                flowType: "1to3",
            })
        }, [variantStore.resetCounter]) // Watch resetCounter from Orchestrator

        return <Component {...props} />
    }
}

/**
 * withThreeStepFlow (with123)
 * 
 * Three-step flow: Form input → Email gate → Results
 * Full flow with email capture before showing results.
 * 
 * Flow: Step 1 → Step 2 → Step 3
 */
export function withThreeStepFlow<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        useEffect(() => {
            console.log("🎯 withThreeStepFlow: reset triggered", { 
                currentStep: variantStore.currentStep,
                currentFlowType: variantStore.flowType,
                resetCounter: variantStore.resetCounter
            })
            
            // Set to Step 1 with "1to2to3" flow type when Orchestrator resets
            setVariantStore({
                ...variantStore,
                currentStep: 1,
                flowType: "1to2to3",
            })
        }, [variantStore.resetCounter]) // Watch resetCounter from Orchestrator

        return <Component {...props} />
    }
}

/**
 * withTwoStepFlow_2to3 (with23)
 * 
 * Two-step flow: Email gate → Results (skip form input)
 * Starts at the email gate, then shows results.
 * Use this when you already have the user's data.
 * 
 * Flow: Step 2 → Step 3
 */
export function withTwoStepFlow_2to3<T extends OverrideProps>(
    Component: ComponentType<T>
): ComponentType<T> {
    return (props: T) => {
        const [variantStore, setVariantStore] = useVariantStore()

        useEffect(() => {
            console.log("🎯 withTwoStepFlow_2to3: reset triggered", { 
                currentStep: variantStore.currentStep,
                currentFlowType: variantStore.flowType,
                resetCounter: variantStore.resetCounter
            })
            
            // Set to Step 2 with "2to3" flow type when Orchestrator resets
            setVariantStore({
                ...variantStore,
                currentStep: 2,
                flowType: "2to3",
            })
        }, [variantStore.resetCounter]) // Watch resetCounter from Orchestrator

        return <Component {...props} />
    }
}

// Export display names for better debugging
withOneStepFlow.displayName = "withOneStepFlow"
withTwoStepFlow_1to3.displayName = "withTwoStepFlow_1to3"
withThreeStepFlow.displayName = "withThreeStepFlow"
withTwoStepFlow_2to3.displayName = "withTwoStepFlow_2to3"

