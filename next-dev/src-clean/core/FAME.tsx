/**
 * FAME Animation System - Main Component
 *
 * @fileOverview Clean entry point component for FAME
 * @version 2.0.0-clean
 * @status ACTIVE - Property controls connected, ready for AnimationOrchestrator
 *
 * @description
 * Clean React component that serves as the interface between Framer and FAME.
 * Focuses ONLY on:
 * - Processing property controls input
 * - Validating configuration
 * - Initializing AnimationOrchestrator
 * - Providing React component interface
 *
 * @reference
 * src-refactored/core/FAME.tsx
 * - Working property controls integration
 * - Component lifecycle management
 * - Framer integration patterns
 *
 * @architecture
 * - Uses clean types from ../types/
 * - Integrates with AnimationOrchestrator (not Engine)
 * - No GlobalAnimationRegistry dependency
 * - Simple, focused responsibilities
 */

import React, { useRef, useEffect, useLayoutEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

// Clean architecture imports
import { FAMEProps, AnimationSlot, DebugConfig } from "../types/index.ts"

import { CreateAnimationSlotsObject } from "../config/propertyControls/AnimationSlots.ts"
import { CreateStyleSlotsObject } from "../config/propertyControls/StyleSlots.ts"
import {
    CreateDebugControls,
    CreateDebugConfigControls,
} from "../config/propertyControls/DebugPropertyControls.ts"

// Import our new data flow components
import { AnimationOrchestrator } from "./AnimationOrchestrator.ts"
import { convertSlotArray } from "../config/adapters/AnimationSlotAdapter.ts"
import { StyleCoordinator } from "./coordinators/StyleCoordinator.ts"
import { convertSlotArray as convertStyleSlotArray } from "../config/adapters/StyleSlotAdapter.ts"

// 🔥 NEW: Import text splitting React integration
import { useAnimatedTextElements } from "../hooks/useAnimatedTextElements.ts"

// 🔄 NEW: Import breakpoint persistence hook for state restoration
import {
    useFramerBreakpointPersistence,
    AnimationState as BreakpointAnimationState,
    isFramerEnvironment,
} from "../hooks/useFramerBreakpointPersistence.ts"

// Import state manager for state serialization
import { animationStateManager } from "./state/AnimationStateManager.ts"

// 🚀 PERFORMANCE CRITICAL: Import immediate style applicator to prevent flash
import {
    applyImmediateInitialStyles,
    clearStyleCache,
} from "../utils/performance/ImmediateStyleApplicator.ts"

// 🚀 PERFORMANCE: Import performance text splitter cache management
import { clearPerformanceCache } from "../utils/text/PerformanceTextSplitter.ts"

// 🚀 PERFORMANCE: Import precomputed style cache system
import {
    initializeStyleCache,
    precomputeMultipleElementStyles,
    cleanup as cleanupStyleCache,
    getCacheMetrics,
} from "../utils/performance/PrecomputedStyleCache.ts"

// REMOVED: ScrollCacheManager was causing performance issues in production

// 🚀 PERFORMANCE: Import global debug logging
import { setDebugLogging } from "../utils/environment/ConsoleDebugFilter.ts"

// 🚀 PERFORMANCE: Import unified scroll manager for performance monitoring
import { unifiedScrollManager } from "../utils/performance/UnifiedScrollManager.ts"

// 🔐 NEW: Import license verification system
import { 
    LicenseManager, 
    isFreeFramerDomain,
    shouldSkipLicenseVerification,
    type LicenseResult 
} from "../utils/environment/index.ts"

/**
 * FAME Animation Component
 *
 * Clean, focused entry point that coordinates with the new architecture
 * Enhanced with breakpoint state persistence to solve Framer variant reset issues
 *
 * 🚀 PERFORMANCE OPTIMIZED:
 * - Immediate style application to prevent flash of unstyled content
 * - Non-blocking async initialization
 * - GPU acceleration hints applied immediately
 */


/**
 * 
 * @framerDisableUnlink
 */
export default function FAME_Beta(props: FAMEProps) {
    const {
        animationSlots = [],
        styleSlots = [],
        debug = false,
        disabled = false,
        showInitialValuesInCanvas = false,
        showStyleSlotsInCanvas = false,
        showFameElement = false,
        hideFromCanvas = false,
        debugConfig,
        children,
    } = props

    // Refs for component state
    const elementRef = useRef<HTMLDivElement>(null)
    const componentIdRef = useRef<string>(
        `fame-component-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    )

    // Initialize coordinators
    const orchestratorRef = useRef<AnimationOrchestrator | null>(null)
    const styleCoordinatorRef = useRef<StyleCoordinator | null>(null)

    // Track if we're in an initialization cycle to prevent loops
    const isInitializingRef = useRef<boolean>(false)
    const lastInitPropsRef = useRef<string>("")

    // 🔥 NEW: React ref management for text elements (replaces broken textSplitVersion)
    const {
        elementRefs,
        updateElementRefs,
        getConnectedElements,
        registerForSplitCallbacks,
        retargetAnimations,
        addRetargetCallback,
        refsVersion,
    } = useAnimatedTextElements()

    // 🔄 NEW: Breakpoint persistence for state restoration
    const getCurrentAnimationState = (): BreakpointAnimationState => {
        // Use the new serialization methods from AnimationStateManager
        const serializedStates = animationStateManager.serializeAllStates()
        const currentStates = new Map()

        // Convert serialized object to Map for compatibility
        for (const [slotId, stateData] of Object.entries(serializedStates)) {
            currentStates.set(slotId, stateData)
        }

        return {
            currentStates,
            isAnimating: animationStateManager.hasRunningAnimations(),
            lastTriggerStates: new Map(), // TODO: Add trigger state tracking if needed
            breakpoint: "desktop", // Will be updated by the hook
        }
    }

    const handleVariantChange = (
        restoredState: BreakpointAnimationState | null
    ) => {
        if (debug) {
            console.log(
                "🔄 [FAME] Variant change detected, reinitializing animations",
                {
                    hasRestoredState: !!restoredState,
                    restoredState,
                }
            )
        }

        // Set flag to prevent initialization loops
        isInitializingRef.current = true

        // Force re-initialization with restored state
        setTimeout(() => {
            initializeWithState(restoredState)
            isInitializingRef.current = false
        }, 100) // Short delay to ensure DOM has settled
    }

    // Only use breakpoint persistence in Framer environment
    const breakpointPersistence = isFramerEnvironment()
        ? useFramerBreakpointPersistence(
              componentIdRef.current,
              handleVariantChange,
              getCurrentAnimationState
          )
        : null

    // Synchronise global console filtering with component debug prop
    useEffect(() => {
        setDebugLogging(debug)

        // ✅ SIMPLIFIED: Basic debug logging without expensive monitoring overhead
        if (debug) {
            unifiedScrollManager.setDebugLogging(true)
            console.log("📊 [FAME] Debug mode enabled - basic scroll logging active")
            
            // ❌ DISABLED: Expensive performance monitoring that adds overhead during scroll
            // Performance monitoring was running expensive operations during scroll animations
            // const stopMonitoring = unifiedScrollManager.startPerformanceMonitoring(10000)
            // setTimeout(() => { unifiedScrollManager.logPerformanceReport() }, 2000)
            // return stopMonitoring
        } else {
            unifiedScrollManager.setDebugLogging(false)
        }
    }, [debug])

    // 🔄 NEW: Enhanced initialization with state restoration support
    const initializeWithState = async (
        restoredState?: BreakpointAnimationState | null,
        skipImmediateStyles: boolean = false
    ) => {
        // Prevent loops during initialization
        if (isInitializingRef.current) {
            return
        }

        // Create a props signature to detect changes
        const propsSignature = JSON.stringify({
            animationSlots: animationSlots.map((slot) => ({
                id: slot.id,
                ...slot,
            })),
            styleSlots: styleSlots.map((slot) => ({ id: slot.id, ...slot })),
            disabled,
            showInitialValuesInCanvas,
            showStyleSlotsInCanvas,
        })

        // Skip if props haven't changed (prevents unnecessary re-init)
        if (propsSignature === lastInitPropsRef.current && !restoredState) {
            return
        }

        lastInitPropsRef.current = propsSignature

        if (debug) {
            console.log("🔄 [FAME] Initializing with state restoration", {
                hasRestoredState: !!restoredState,
                componentId: componentIdRef.current,
            })
        }

        // Early return if disabled
        if (disabled) {
            console.log("🎭 [FAME] Animation system disabled")
            return
        }

        // Get the component element
        const componentElement = elementRef.current
        if (!componentElement) {
            console.warn("🎭 [FAME] No component element found")
            return
        }

        try {
            // 🚀 PERFORMANCE CRITICAL: Apply immediate styles only when not explicitly skipped
            if (!skipImmediateStyles) {
                initializeStyleCache()

                // REMOVED: ScrollCacheManager was causing performance issues

                const immediateStyleSuccess = applyImmediateInitialStyles(
                    animationSlots,
                    componentElement,
                    showInitialValuesInCanvas
                )

                if (immediateStyleSuccess) {
                    console.log(
                        "🚀 [FAME] ✅ Immediate styles applied - no flash will occur"
                    )
                } else {
                    console.warn(
                        "🚀 [FAME] ⚠️ Immediate style application failed - may see flash"
                    )
                }
            }

            // 🔐 NEW: License verification (non-blocking, after initial styles)
            console.log("🔐 [FAME] Starting license verification...")
            
            // Check if we should skip license verification (Canvas/Preview mode)
            if (shouldSkipLicenseVerification()) {
                console.log("🔐 [FAME] ✅ Framer Canvas/Preview mode detected - full access granted (verification skipped)");
            } else {
                const licenseManager = LicenseManager.getInstance();
                
                // Instant check for free Framer domains  
                const isFreeFramer = isFreeFramerDomain();
                let licenseResult: LicenseResult | null = null;
                
                if (isFreeFramer) {
                    console.log("🔐 [FAME] ✅ Free Framer domain detected - full access granted");
                } else {
                    // Background license check for custom domains
                    try {
                        licenseResult = await licenseManager.checkLicense();
                        console.log(`🔐 [FAME] License check completed: ${licenseResult.authorized ? 'AUTHORIZED' : 'DENIED'}`, {
                            domain: window.location.hostname,
                            fromCache: licenseResult.fromCache,
                            duration: licenseResult.checkDurationMs,
                            reason: licenseResult.reason
                        });
                    } catch (error) {
                        console.warn("🔐 [FAME] License verification failed - allowing animations as fallback:", error);
                        licenseResult = {
                            authorized: true,
                            isFreeFramerDomain: false,
                            fromCache: false,
                            reason: 'Verification failed - graceful fallback',
                            checkDurationMs: 0
                        };
                    }
                }
                
                // Determine if animations should be enabled
                const shouldEnableAnimations = isFreeFramer || (licenseResult?.authorized ?? false);
                
                if (!shouldEnableAnimations) {
                    console.log("🔐 [FAME] ❌ License verification failed - animations disabled");
                    console.log("🔐 [FAME] Initial styles will remain applied, but no animations will run");
                    
                    // TODO: Add license verification todo for LemonSqueezy integration
                    console.log("🔐 [FAME] TODO: Implement LemonSqueezy license verification for custom domains");
                    
                    return; // Exit early - styles applied but no animations
                }
            }
            
            console.log("🔐 [FAME] ✅ License verified - proceeding with full animation system initialization");

            // ❌ DISABLED: Aggressive precomputation was causing blocking during initialization
            // The precomputation was running expensive DOM operations that blocked the main thread
            // Simple caching is sufficient without the overhead
            // setTimeout(() => {
            //     const fameElements = Array.from(
            //         componentElement.querySelectorAll(
            //             "[data-fame], .fame-text-line, .fame-text-word, .fame-text-char"
            //         )
            //     ) as HTMLElement[]
            //     if (fameElements.length > 0) {
            //         precomputeMultipleElementStyles(fameElements.slice(0, 5)) // Much smaller batch
            //     }
            // }, 100) // Delay to avoid blocking initial render

            // Clean up existing coordinators
            if (orchestratorRef.current) {
                orchestratorRef.current.cleanup()
            }
            if (styleCoordinatorRef.current) {
                styleCoordinatorRef.current.cleanup(componentElement)
            }

            // Initialize coordinators
            orchestratorRef.current = new AnimationOrchestrator(
                componentIdRef.current
            )
            styleCoordinatorRef.current = new StyleCoordinator()

            // Restore animation states if provided
            if (restoredState && restoredState.currentStates.size > 0) {
                console.log(
                    "🔄 [FAME] Restoring animation states from breakpoint transition"
                )

                // Convert Map back to object for the restoration method
                const stateObject: { [slotId: string]: any } = {}
                for (const [slotId, stateData] of restoredState.currentStates) {
                    stateObject[slotId] = stateData
                }

                // Use the new restoration method
                animationStateManager.restoreSerializedStates(stateObject)

                if (debug) {
                    console.log(
                        `🔄 [FAME] Restored ${Object.keys(stateObject).length} animation states`
                    )
                }
            }

            // 🎨 FEATURE 2B: Async function to handle text processing during initialization
            const initializeAnimations = async () => {
                // Process animation slots if any exist
                if (animationSlots.length > 0) {
                    console.log(
                        "🎭 [FAME] Processing animation slots through data flow pipeline..."
                    )

                    // Debug: Log the raw animation slots to understand the structure
                    if (debug) {
                        console.log(
                            "🎭 [FAME] Raw animation slots from property controls:",
                            animationSlots
                        )
                    }

                    // 🚨 CRITICAL DEBUG: Add detailed logging for scroll threshold debugging
                    console.log(
                        `🚨 [FAME] DETAILED SCROLL DEBUG - Raw Property Controls:`,
                        {
                            slotsCount: animationSlots.length,
                            animationSlots: animationSlots.map(
                                (slot, index) => ({
                                    slotIndex: index,
                                    slotId: slot.id,
                                    triggers: slot.triggers?.map(
                                        (trigger, triggerIndex) => ({
                                            triggerIndex,
                                            event: trigger.event,
                                            hasScrollThresholds:
                                                !!trigger.scrollThresholds,
                                            scrollThresholds:
                                                trigger.scrollThresholds,
                                            fullTrigger: JSON.stringify(
                                                trigger,
                                                null,
                                                2
                                            ),
                                        })
                                    ),
                                })
                            ),
                        }
                    )

                    // 🚨 CRITICAL DEBUG: Find and log any scroll triggers specifically
                    const scrollTriggers = animationSlots.flatMap(
                        (slot, slotIndex) =>
                            slot.triggers
                                ?.map((trigger, triggerIndex) => ({
                                    slotIndex,
                                    slotId: slot.id,
                                    triggerIndex,
                                    trigger,
                                }))
                                ?.filter((t) => t.trigger.event === "scroll") ||
                            []
                    )

                    if (scrollTriggers.length > 0) {
                        console.log(
                            `🚨 [FAME] Found ${scrollTriggers.length} scroll triggers in property controls:`,
                            scrollTriggers
                        )
                        scrollTriggers.forEach((scrollTrigger, index) => {
                            console.log(`🚨 [FAME] Scroll trigger ${index}:`, {
                                slotIndex: scrollTrigger.slotIndex,
                                slotId: scrollTrigger.slotId,
                                triggerIndex: scrollTrigger.triggerIndex,
                                event: scrollTrigger.trigger.event,
                                scrollThresholds:
                                    scrollTrigger.trigger.scrollThresholds,
                                scrollThresholdsType:
                                    typeof scrollTrigger.trigger
                                        .scrollThresholds,
                                scrollThresholdsKeys: scrollTrigger.trigger
                                    .scrollThresholds
                                    ? Object.keys(
                                          scrollTrigger.trigger.scrollThresholds
                                      )
                                    : "N/A",
                                fullTriggerStructure: JSON.stringify(
                                    scrollTrigger.trigger,
                                    null,
                                    2
                                ),
                            })
                        })
                    } else {
                        console.log(
                            `🚨 [FAME] No scroll triggers found in property controls`
                        )
                    }

                    // STEP 1: Convert property controls format to internal format using adapter
                    console.log(
                        "🎭 [FAME] Step 1: Converting property controls to internal format"
                    )

                    const internalSlots: AnimationSlot[] =
                        convertSlotArray(animationSlots)
                    console.log(
                        `🎭 [FAME] Successfully converted ${internalSlots.length} animation slots`
                    )

                    // STEP 2: Route each slot through the orchestrator
                    console.log(
                        "🎭 [FAME] Step 2: Routing slots through AnimationOrchestrator"
                    )

                    // 🚀 PERFORMANCE CRITICAL: Process slots without blocking main thread
                    // Replace blocking Promise.all with non-blocking sequential processing
                    // that yields control back to the browser between slots

                    console.log(
                        `🚀 [FAME] Starting non-blocking slot processing for ${internalSlots.length} slots`
                    )

                    // Process slots individually with yields to prevent blocking
                    for (let index = 0; index < internalSlots.length; index++) {
                        const slot = internalSlots[index]

                        try {
                            console.log(
                                `🎭 [FAME] Processing slot ${index + 1}/${internalSlots.length}:`,
                                {
                                    id: slot.id,
                                    mode: slot.animationMode,
                                    triggers: slot.triggers.length,
                                    properties: slot.properties.length,
                                    animatedElementsCount:
                                        slot.animatedElements.length,
                                    animatedElementsScopes:
                                        slot.animatedElements.map(
                                            (ae) => ae.selection.scope
                                        ),
                                }
                            )

                            // 🔄 SIMPLE: Check if this slot has text splitting enabled for debug logging
                            const hasTextSplitting = slot.animatedElements.some(
                                (ae) => ae.textProcessing?.enabled
                            )

                            if (hasTextSplitting) {
                                console.log(
                                    `🔄 [FAME] Text splitting enabled in slot ${slot.id || index} - using guard-based approach`
                                )
                            }

                            // Execute slot through orchestrator
                            const cleanup =
                                await orchestratorRef.current?.executeSlot(
                                    slot,
                                    componentElement,
                                    showInitialValuesInCanvas,
                                    {
                                        updateElementRefs,
                                        registerForSplitCallbacks,
                                        retargetAnimations,
                                        addRetargetCallback,
                                    }
                                )

                            // Store cleanup function (simplified for now)
                            if (cleanup) {
                                // TODO: Store cleanup functions properly
                            }

                            // 🚀 PERFORMANCE: Yield control to browser every 2 slots to prevent blocking
                            if (
                                (index + 1) % 2 === 0 &&
                                index < internalSlots.length - 1
                            ) {
                                await new Promise((resolve) =>
                                    setTimeout(resolve, 0)
                                )
                            }
                        } catch (slotError) {
                            console.error(
                                `🎭 [FAME] Error processing slot ${index}:`,
                                slotError
                            )
                            // Continue processing other slots even if one fails
                        }
                    }

                    console.log(
                        "🎭 [FAME] ✅ Animation data flow pipeline completed successfully!"
                    )
                    console.log(
                        "🎭 [FAME] Data flow: Property Controls → Adapter → Orchestrator → TimedAnimator"
                    )
                } else {
                    console.log("🎭 [FAME] No animation slots to process")
                }
            }

            // Initialize animations (async for text processing)
            await initializeAnimations()

            // Process style slots if any exist
            if (styleSlots.length > 0) {
                console.log(
                    "🎭 [FAME] Processing style slots through style pipeline..."
                )

                // Debug: Log the raw style slots to understand the structure
                if (debug) {
                    console.log(
                        "🎭 [FAME] Raw style slots from property controls:",
                        styleSlots
                    )
                }

                // STEP 1: Convert property controls format to internal format using adapter
                console.log(
                    "🎭 [FAME] Step 1: Converting style property controls to internal format"
                )

                const internalStyleSlots = convertStyleSlotArray(styleSlots)
                console.log(
                    `🎭 [FAME] Successfully converted ${internalStyleSlots.length} style slots`
                )

                // STEP 2: Apply styles immediately via StyleCoordinator
                console.log(
                    "🎭 [FAME] Step 2: Applying styles via StyleCoordinator"
                )

                if (styleCoordinatorRef.current) {
                    styleCoordinatorRef.current.applyStyleSlots(
                        internalStyleSlots,
                        componentElement,
                        showStyleSlotsInCanvas
                    )
                    console.log(
                        "🎭 [FAME] ✅ Style application pipeline completed successfully!"
                    )
                    console.log(
                        "🎭 [FAME] Style flow: Property Controls → Adapter → StyleCoordinator → CSS Applied"
                    )
                }
            } else {
                console.log("🎭 [FAME] No style slots to process")
            }

            // 🔄 NEW: Save current state after initialization
            if (breakpointPersistence) {
                breakpointPersistence.saveCurrentState()
            }

            // 🚀 PERFORMANCE: Log cache performance metrics
            if (debug) {
                const cacheMetrics = getCacheMetrics()
                console.log("🚀 [FAME] Style cache metrics:", cacheMetrics)
            }
        } catch (error) {
            console.error(
                "🎭 [FAME] Error in animation data flow pipeline:",
                error
            )

            // Fallback: Log raw data for debugging
            if (debug && animationSlots.length > 0) {
                console.log(
                    "🎭 [FAME] Raw animation slots for debugging:",
                    animationSlots
                )
            }
            if (debug && styleSlots.length > 0) {
                console.log(
                    "🎭 [FAME] Raw style slots for debugging:",
                    styleSlots
                )
            }
        }
    }

    // 🚀 PERFORMANCE: Fast, synchronous flash-prevention pass then defer heavy work
    useLayoutEffect(() => {
        if (disabled) return

        const componentElement = elementRef.current
        if (!componentElement) return

        // Ensure cache and initial styles are ready before first paint
        initializeStyleCache()
        applyImmediateInitialStyles(
            animationSlots,
            componentElement,
            showInitialValuesInCanvas
        )

        // Defer the heavy initialisation until the browser is idle / after paint
        const deferredInit = () => initializeWithState(undefined, true)

        if (typeof (window as any).requestIdleCallback === "function") {
            ;(window as any).requestIdleCallback(deferredInit)
        } else {
            setTimeout(deferredInit, 0)
        }
    }, [
        animationSlots,
        styleSlots,
        disabled,
        showInitialValuesInCanvas,
        showStyleSlotsInCanvas,
        refsVersion,
    ])

    // 🔄 NEW: Cleanup function enhanced with state persistence
    useEffect(() => {
        return () => {
            if (debug) {
                console.log("🎭 [FAME] Cleaning up animation system")
            }

            // 🔄 NEW: Save state before cleanup
            if (breakpointPersistence && !isInitializingRef.current) {
                breakpointPersistence.saveCurrentState()
            }

            // Cleanup coordinators
            if (orchestratorRef.current) {
                orchestratorRef.current.cleanup()
                orchestratorRef.current = null
            }
            if (styleCoordinatorRef.current) {
                // Clean up style coordinator and restore original styles
                const componentElement = elementRef.current
                if (componentElement) {
                    styleCoordinatorRef.current.cleanup(componentElement)
                }
                styleCoordinatorRef.current = null
            }

            // REMOVED: ScrollCacheManager was causing performance issues

            // 🚀 PERFORMANCE: Clean up style cache to prevent memory leaks
            clearStyleCache()

            // 🚀 PERFORMANCE: Clean up text processing cache to prevent memory leaks
            clearPerformanceCache()

            // 🚀 PERFORMANCE: Clean up style cache system to prevent memory leaks
            cleanupStyleCache()
        }
    }, [])

    // 🔥 SIMPLIFIED: Removed cache version dependency

    // 🎨 NEW: Handle hide from canvas functionality based on legacy implementation
    useEffect(() => {
        if (elementRef.current) {
            // Find the target element (2 levels up from FAME component)
            let targetElement: HTMLElement = elementRef.current;
            for (let i = 0; i < 2; i++) {
                if (!targetElement.parentElement) {
                    console.warn("🎭 [FAME] Could not find target element at level", i);
                    return;
                }
                targetElement = targetElement.parentElement;
            }

            // Store original display state if not already stored
            if (!targetElement.dataset.originalDisplay) {
                targetElement.dataset.originalDisplay = targetElement.style.display || "block";
            }

            // Toggle visibility based on hideFromCanvas property
            if (hideFromCanvas) {
                if (debug) {
                    console.log("🎭 [FAME] Hiding element on canvas mode");
                }
                targetElement.style.display = "none";
            } else {
                if (debug) {
                    console.log("🎭 [FAME] Showing element on canvas mode");
                }
                // Restore to original display value or default to "block"
                targetElement.style.display = targetElement.dataset.originalDisplay;
            }
        }
    }, [hideFromCanvas, debug]);

    return (
        <div
            ref={elementRef}
            style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                backgroundColor: showFameElement
                    ? "rgba(0, 102, 255, 0.3)"
                    : "transparent",
                border: showFameElement ? "1px dashed rgb(0, 102, 255, 1)" : "none",
                cursor: "pointer",
                borderRadius: 16,
                padding: 4,
            }}
            data-fame-animator="true"
            data-component-id={componentIdRef.current}
            data-fame-fresh-init="true"
            data-breakpoint={
                breakpointPersistence?.currentBreakpoint || "unknown"
            }
        >
            {debug && (
                <div
                    style={{
                        fontSize: "12px",
                        color: "rgba(0, 102, 255, 1)",
                        textAlign: "center",
                    }}
                >
                    Debug is on
                    <br />
                    {breakpointPersistence?.currentBreakpoint || "N/A"}
                </div>
            )}
        </div>
    )
}

// Default properties
FAME_Beta.defaultProps = {
    animationSlots: [],
    styleSlots: [],
    hideFromCanvas:false,
    debug: false,
    disabled: false,
    showInitialValuesInCanvas: false,
    showStyleSlotsInCanvas: false,
}

// Property controls - connecting our clean AnimationSlots
addPropertyControls(FAME_Beta, {
    // Debug controls
    debug: CreateDebugControls().debug,

    // Debug configuration controls (only shown when debug is enabled)
    // debugConfig: {
    //     type: ControlType.Object,
    //     title: "Debug Configuration",
    //     hidden: (props: any) => !props.debug,
    //     controls: CreateDebugConfigControls() as any,
    // },

    showFameElement: {
        type: ControlType.Boolean,
        title: "Show fame component in canvas",
        defaultValue: false,
    },

    // disabled: {
    //     type: ControlType.Boolean,
    //     title: "Disable Animations",
    //     defaultValue: false,
    // },

    // showInitialValuesInCanvas: {
    //     type: ControlType.Boolean,
    //     title: "Show Initial Values in Canvas",
    //     description:
    //         "Apply starting animation values in Framer Canvas (useful for visibility while designing)",
    //     defaultValue: false,
    // },

    hideFromCanvas:{
        type:ControlType.Boolean,
        title:"Hide from canvas",
        defaultValue:false,
    },

    // showStyleSlotsInCanvas: {
    //     type: ControlType.Boolean,
    //     title: "Show Style Slots in Canvas",
    //     description: "Toggle style slots preview in Framer Canvas",
    //     defaultValue: false,
    // },

    // Main animation slots - using our clean property controls
    animationSlots: CreateAnimationSlotsObject().animationSlots as any,

    // Style slots - using our clean style property controls
    //styleSlots: CreateStyleSlotsObject().styleSlots as any,
})
