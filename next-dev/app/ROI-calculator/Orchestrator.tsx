import { useEffect, useState } from "react"
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"
import { addPropertyControls, ControlType } from "framer"

// ============================================
// STORES - Single source of truth
// ============================================

// Shared store for form values and calculations
export const useFormStore = createStore({
    merchantGMV: 0,
    averageOrderValue: 0,
    lmnAttachRate: 0,
    transactionVolume: 0,
    isFormValid: false,
})

// Store for tracking step state and validation errors (breakpoint-independent)
export const useVariantStore = createStore({
    currentStep: 1, // 1, 2, or 3 (same for all components)
    flowType: "1to2to3", // "direct" (with3), "1to3" (with13), "1to2to3" (with123), "2to3" (with23)
    isInitialized: false, // Flag to prevent reinitializing when switching breakpoints
    resetCounter: 0, // Incremented on each Orchestrator mount to signal a reset to FlowSteps
    errors: {
        merchantGMV: false,
        averageOrderValue: false,
        lmnAttachRate: false,
    },
})

// ============================================
// ORCHESTRATOR COMPONENT
// ============================================

/**
 * Orchestrator Component
 * 
 * This component is INVISIBLE and NEVER CHANGES across breakpoints.
 * It acts as the single source of truth for:
 * - Form input values (merchantGMV, averageOrderValue, transactionVolume, lmnAttachRate)
 * - Initialization flag (isInitialized)
 * 
 * It initializes on EVERY page reload/mount:
 * - Sets all form values to 0
 * - Clears input fields in the DOM
 * - Marks isInitialized as true
 * 
 * IMPORTANT: The Orchestrator does NOT set currentStep or flowType.
 * These are controlled by the FlowSteps overrides (withThreeStepFlow, etc.)
 * 
 * The breakpoint-specific components (Desktop, Tablet, Phone) will read from these stores.
 * They should NEVER modify stores themselves - they are READ ONLY.
 */
export default function Orchestrator({ showDebugPanel }: { showDebugPanel: boolean }) {
    
    
    const [variantStore, setVariantStore] = useVariantStore()
    const [formStore, setFormStore] = useFormStore()
    
    // Debug state tracking
    const [mountCount, setMountCount] = useState(0)
    const [logs, setLogs] = useState<string[]>([])

    // Helper to add logs
    const addLog = (message: string) => {
        setLogs(prev => [...prev.slice(-4), message]) // Keep last 5 logs
    }

    // Track mount count
    useEffect(() => {
        setMountCount(prev => prev + 1)
        addLog("🎯 ORCHESTRATOR MOUNTED")
    }, [])

    // Log renders without causing re-renders (no state update)
    console.log("🔄 ORCHESTRATOR RENDERED", { variantStore, formStore })

    useEffect(() => {
        addLog("⚡ INITIALIZING - resetCounter: " + (variantStore.resetCounter + 1))
        
        // Increment resetCounter to signal FlowSteps overrides to reset
        // Also set isInitialized and clear errors
        setVariantStore({
            ...variantStore,
            isInitialized: true,
            resetCounter: variantStore.resetCounter + 1,
            errors: {
                merchantGMV: false,
                averageOrderValue: false,
                lmnAttachRate: false,
            },
        })

        setFormStore({
            merchantGMV: 0,
            averageOrderValue: 0,
            lmnAttachRate: 0,
            transactionVolume: 0,
            isFormValid: false,
        })

        const clearInputs = () => {
            const gmvInput = document.querySelector('input[name="MerchantGMV"]') as HTMLInputElement
            const aovInput = document.querySelector('input[name="AOV"]') as HTMLInputElement
            const lmnInput = document.querySelector('input[name="LMN"]') as HTMLInputElement
            const txnInput = document.querySelector('input[name="TransactionVolume"]') as HTMLInputElement

            addLog("🧹 CLEARING INPUTS")

            if (gmvInput) gmvInput.value = ""
            if (aovInput) aovInput.value = ""
            if (lmnInput) lmnInput.value = ""
            if (txnInput) txnInput.value = "0"
        }

        clearInputs()
        const timeout100 = setTimeout(clearInputs, 100)
        const timeout500 = setTimeout(clearInputs, 500)
        
        addLog("✅ INITIALIZATION COMPLETE")

        return () => {
            clearTimeout(timeout100)
            clearTimeout(timeout500)
        }
    }, [setVariantStore, setFormStore])

    return (
        <>
        {showDebugPanel && (<div
            style={{
                position: "fixed",
                top: 10,
                right: 10,
                background: "rgba(0, 0, 0, 0.9)",
                color: "#00ff00",
                padding: 20,
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 12,
                zIndex: 99999,
                maxWidth: 400,
                pointerEvents: "none",
                border: "2px solid #00ff00",
            }}
        >
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#00ff00" }}>
                🐛 ORCHESTRATOR DEBUG PANEL
            </div>
            
            {mountCount > 1 && (
                <div style={{ 
                    background: "#ff0000", 
                    color: "#fff", 
                    padding: 8, 
                    marginBottom: 10,
                    borderRadius: 4,
                    fontWeight: "bold"
                }}>
                    ⚠️ WARNING: Orchestrator mounted {mountCount} times!
                </div>
            )}
            
            <div style={{ marginBottom: 15 }}>
                <div style={{ color: "#ffff00", marginBottom: 5 }}>LIFECYCLE:</div>
                <div>Mount Count: {mountCount}</div>
            </div>

            <div style={{ marginBottom: 15 }}>
                <div style={{ color: "#ffff00", marginBottom: 5 }}>VARIANT STORE:</div>
                <div>Current Step: <span style={{ color: "#00ffff", fontWeight: "bold" }}>{variantStore.currentStep}</span></div>
                <div>Flow Type: <span style={{ color: "#00ffff", fontWeight: "bold" }}>{variantStore.flowType}</span></div>
                <div>Reset Counter: <span style={{ color: "#ff00ff", fontWeight: "bold" }}>{variantStore.resetCounter}</span></div>
                <div>Initialized: {variantStore.isInitialized ? "✅" : "❌"}</div>
                <div style={{ fontSize: 10 }}>Errors: {JSON.stringify(variantStore.errors)}</div>
            </div>

            <div style={{ marginBottom: 15 }}>
                <div style={{ color: "#ffff00", marginBottom: 5 }}>FORM STORE:</div>
                <div>GMV: {formStore.merchantGMV}</div>
                <div>AOV: {formStore.averageOrderValue}</div>
                <div>LMN: {formStore.lmnAttachRate}</div>
                <div>Txn Vol: {formStore.transactionVolume}</div>
                <div>Valid: {formStore.isFormValid ? "✅" : "❌"}</div>
            </div>

            <div>
                <div style={{ color: "#ffff00", marginBottom: 5 }}>RECENT LOGS:</div>
                {logs.map((log, i) => (
                    <div key={i} style={{ fontSize: 10, marginBottom: 2 }}>
                        {log}
                    </div>
                ))}
            </div>
        </div>
        )}
</>
)}


addPropertyControls(Orchestrator, {
    showDebugPanel: {
        title: "Show Debug Panel",
        type: ControlType.Boolean,
        defaultValue: true,
    },
})