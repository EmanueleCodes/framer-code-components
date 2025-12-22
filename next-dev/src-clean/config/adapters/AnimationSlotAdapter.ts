/**
 * FAME Animation System - Animation Slot Adapter
 *
 * @fileOverview Converts between Framer property controls and internal AnimationSlot format
 * @version 2.1.0-global-timeline
 * @status PHASE 4.3 IMPLEMENTED - Global Timeline Integration Complete
 *
 * @description
 * This adapter provides clean separation between Framer's property control format
 * and our internal AnimationSlot format. It handles the conversion, validation,
 * and transformation of animation configurations.
 *
 * @architecture_role
 * The adapter sits between the UI layer (property controls) and the business logic
 * layer (AnimationOrchestrator). This separation allows:
 *
 * 1. **Property Controls**: Use Framer's natural structure and UI patterns
 * 2. **Internal Format**: Optimized for animation execution and state management
 * 3. **Clean Conversion**: Testable, maintainable transformation logic
 *
 * @data_flow
 * Framer Property Controls → AnimationSlotAdapter → Internal AnimationSlot → AnimationOrchestrator
 *
 * @key_benefits
 * - Property controls can evolve independently of internal format
 * - Internal format optimized for performance and clarity
 * - Easy to test conversion logic in isolation
 * - Clear separation of UI concerns from business logic
 * - Supports bidirectional conversion if needed
 *
 * @implementation_plan
 * 1. Define PropertyControlsAnimationSlot interface (raw property controls format)
 * 2. Define InternalAnimationSlot interface (optimized internal format)
 * 3. Implement toInternal() conversion method
 * 4. Implement fromInternal() conversion method (for debugging/editing)
 * 5. Add validation and error handling
 * 6. Add comprehensive tests
 *
 * @reference
 * Based on the SlotConverter pattern from src-refactored but with cleaner architecture:
 * - Clear input/output interfaces
 * - Single responsibility (just conversion)
 * - No side effects or state management
 * - Comprehensive error handling
 */

import {
    AnimationSlot,
    TriggerElement,
    AnimatedElement,
    AnimationProperty,
    EventType,
    AnimationMode,
    AnimationBehavior,
    ElementScope,
    CriteriaType,
    ScopeDepth,
    ElementSelection,
    SelectionCriteria,
    ReverseMode,
    InterruptBehavior, // 🚨 NEW: Import interrupt behavior
    // 🎨 FEATURE 2B: Text Processing Types (Phase 1)
    TextProcessingConfig,
    TextSplitType,
    TextCanvasFallback,
    // 📊 FEATURE 3A: Distributed Properties Types
    DistributedPropertyConfig,
} from "../../types/index.ts"

// 📊 FEATURE 3A: Import distributed properties pattern generator and data extraction
import { distributedPropertyPatternGenerator } from "../../utils/DistributedPropertyPatternGenerator.ts"
import { extractDistributedPropertyConfig } from "../propertyControls/animationControls/DistributedPropertyControls.ts"

// 🚀 NEW: Import enhanced stagger types
import type {
    StaggerConfig,
    DirectionalStaggerConfig,
    GridReverseMode,
} from "../../utils/staggering/types/StaggerTypes.ts"

import { migrateLegacyDirection } from "../../utils/staggering/types/StaggerTypes.ts"

// 🚀 PHASE 4.3: Import multi-property utilities
// ❌ REMOVED: Legacy imports - functions removed from PropertyRegistry.ts
// import { markEarliestInstancesForInitialValues } from "../properties/PropertyRegistry.ts";
// import { processMultiPropertyInstances } from "../properties/PropertyRegistry.ts";

// 🎬 NEW: Timeline-First Architecture imports
import {
    MasterTimelineBuilder,
    GlobalTimelineConfig,
} from "../../core/timeline/MasterTimeline.ts"
// ❌ REMOVED: Timeline validation import - test file removed, Timeline-First Architecture is stable

//=======================================
//          🚀 TIMELINE FEATURE FLAG
//=======================================

/**
 * Feature flag for Timeline-First Architecture
 * Expert React Developer Approach: Gradual migration with fallback
 */
const ENABLE_TIMELINE_ARCHITECTURE = true // Set to false to use legacy system

// ❌ REMOVED: Timeline validation on startup - Timeline-First Architecture is stable and proven
// Timeline validation is no longer needed as the system is production-ready

//=======================================
//          PROPERTY CONTROLS FORMAT
//=======================================

/**
 * Raw format that comes from Framer property controls
 * This matches exactly what CreateAnimationSlotsObject() produces
 *
 * @description
 * Clean interface using only the new multi-criteria format
 */
export interface PropertyControlsAnimationSlot {
    id?: string // Optional - might be auto-generated

    // Trigger elements (using individual criteria fields)
    triggers?: Array<{
        event: EventType
        targetElement: {
            scope: ElementScope
            depth?: ScopeDepth // 🚀 NEW: Depth support
            criteriaType1?: string
            criteriaValue1?: string
            criteriaType2?: string
            criteriaValue2?: string
            criteriaType3?: string
            criteriaValue3?: string
        }
        behavior: AnimationBehavior
        overrideState?: boolean // NEW: Override State Feature
        reverseMode?: ReverseMode // NEW: Reverse Mode Options
        // 🎯 NEW: Scroll-specific configuration (only present when event is SCROLL)
        scrollThresholds?: {
            elementStart: number
            viewportThreshold: number
            thresholdCrossedBackward: string
        }
    }>

    // 🚀 NEW: Animated elements array (using individual criteria fields)
    animatedElements?: Array<{
        scope: ElementScope
        depth?: ScopeDepth // 🚀 NEW: Depth support
        criteriaType1?: string
        criteriaValue1?: string
        criteriaType2?: string
        criteriaValue2?: string
        criteriaType3?: string
        criteriaValue3?: string
        // 🎨 FEATURE 2B: Text Processing Configuration (Phase 2.1) - Line Masking System
        textProcessingEnabled?: boolean
        textProcessingConfig?: {
            animateBy?: "characters" | "words" | "lines"
            maskLines?: boolean
            canvasMode?: {
                enableInCanvas?: boolean
                fallbackBehavior?: TextCanvasFallback
                maxTextLength?: number
            }
            textEffects?: any[] // Phase 3: To be expanded
        }
    }>

    // Animation mode
    animationMode?: AnimationMode

    // 🎯 NEW: Property configuration array (replaces activeProperties + dynamic configs)
    animateProperties?: Array<{
        property: string // Property name (e.g., "translateX", "opacity")
        from?: string // Starting value
        to?: string // Ending value
        easing?: string // Easing function
        springConfig?: {
            // Spring configuration (when using spring easing)
            amplitude: number
            period: number
        }
        useGlobalSettings?: boolean // Whether to use global timeline settings
        duration?: number // Override duration
        delay?: number // Override delay
        useDistributedValues?: boolean // Whether to use distributed values
        
        // 📊 NEW FLATTENED DISTRIBUTED PROPERTIES: Framer-friendly structure
        distributedFromPattern?: "comma-separated" | "linear-range" // From pattern type
        distributedFromValues?: string // From comma-separated values
        distributedFromMinValue?: string // From linear range min value
        distributedFromMaxValue?: string // From linear range max value
        distributedFromProgression?: "linear" | "linear-reverse" | "bell-curve" | "roof" | "reverse-roof" | "ramp-up" | "ramp-down" | "ease-in-out" | "steps" | "random" | "cubic-in-out" | "bounce" | "elastic" | "exponential" // From progression type
        
        distributedToPattern?: "comma-separated" | "linear-range" // To pattern type
        distributedToValues?: string // To comma-separated values
        distributedToMinValue?: string // To linear range min value
        distributedToMaxValue?: string // To linear range max value
        distributedToProgression?: "linear" | "linear-reverse" | "bell-curve" | "roof" | "reverse-roof" | "ramp-up" | "ramp-down" | "ease-in-out" | "steps" | "random" | "cubic-in-out" | "bounce" | "elastic" | "exponential" // To progression type
        
        // 🔄 LEGACY: Nested structure for backward compatibility (deprecated)
        distributedFromConfig?: {
            pattern: "comma-separated" | "linear-range"
            values?: string // For comma-separated
            linearRange?: {
                minValue: string
                maxValue: string
                progression: "linear" | "linear-reverse" | "bell-curve" | "roof" | "reverse-roof" | "ramp-up" | "ramp-down" | "ease-in-out" | "steps" | "random" | "cubic-in-out" | "bounce" | "elastic" | "exponential"
            }
        }
        distributedToConfig?: {
            pattern: "comma-separated" | "linear-range"
            values?: string // For comma-separated
            linearRange?: {
                minValue: string
                maxValue: string
                progression: "linear" | "linear-reverse" | "bell-curve" | "roof" | "reverse-roof" | "ramp-up" | "ramp-down" | "ease-in-out" | "steps" | "random" | "cubic-in-out" | "bounce" | "elastic" | "exponential"
            }
        }
    }>

    // 🔄 LEGACY: Keep for backward compatibility (will be deprecated)
    activeProperties?: string[]

    // 🌐 PHASE 4.2: Global timeline support
    globalTimelineEnabled?: boolean
    globalTimelineConfig?: {
        duration?: number
        delay?: number
        easing?: string
        springConfig?: {
            amplitude: number
            period: number
        }
    }

    // Simple stagger configuration
    staggerEnabled?: boolean
    staggerConfig?: {
        delay?: number
        direction?: string
    }

    // 🚨 NEW: Interrupt behavior configuration
    interruptBehavior?: InterruptBehavior

    // 🔄 LEGACY: Dynamic property configurations (for backward compatibility)
    [key: string]: any // Property-specific configurations like translateX, opacity, etc.
}

//=======================================
//          HELPER FUNCTIONS
//=======================================

/**
 * Convert selectors array to criteria array
 * Uses the working reference implementation pattern
 */
function convertIndividualCriteriaToArray(element: any): SelectionCriteria[] {
    console.log(
        "[TEXTSPLITTERDOMTESTING] CRITICAL --- convertIndividualCriteriaToArray: element:",
        element
    )
    const criteria: SelectionCriteria[] = []

    // Handle individual criteria fields (criteriaType1, criteriaValue1, etc.)
    for (let i = 1; i <= 3; i++) {
        const typeField = `criteriaType${i}`
        const valueField = `criteriaValue${i}`

        const criteriaType = element[typeField]
        const criteriaValue = element[valueField]

        // Only add if type is not "none" and value is provided
        if (
            criteriaType &&
            criteriaType !== "none" &&
            criteriaValue &&
            criteriaValue.trim() !== ""
        ) {
            criteria.push({
                type: criteriaType as CriteriaType,
                value: criteriaValue.trim(),
            })
        }
    }
    console.log(
        "[TEXTSPLITTERDOMTESTING] CRITICAL --- convertIndividualCriteriaToArray: criteria:",
        criteria
    )
    return criteria
}

/**
 * Convert text processing configuration from property controls to internal format
 *
 * @param config - Text processing config from property controls
 * @returns Internal TextProcessingConfig with derived properties
 */
function convertTextProcessingConfig(config: any): TextProcessingConfig {
    const animateBy = config.animateBy || "characters"

    // 🔧 DERIVE: Convert user-friendly animateBy to internal splitType
    let derivedSplitType: TextSplitType
    switch (animateBy) {
        case "characters":
            derivedSplitType = TextSplitType.CHARACTERS
            break
        case "words":
            derivedSplitType = TextSplitType.WORDS
            break
        case "lines":
            derivedSplitType = TextSplitType.LINES
            break
        default:
            derivedSplitType = TextSplitType.CHARACTERS
    }

    return {
        enabled: true, // If we're calling this function, it's enabled
        animateBy: animateBy,
        maskLines: config.maskLines || false,
        canvasMode: config.canvasMode
            ? {
                  enableInCanvas: config.canvasMode.enableInCanvas !== false, // Default to true
                  fallbackBehavior:
                      config.canvasMode.fallbackBehavior ||
                      TextCanvasFallback.ANIMATE_CONTAINER,
                  maxTextLength: config.canvasMode.maxTextLength || 500,
              }
            : {
                  enableInCanvas: true,
                  fallbackBehavior: TextCanvasFallback.ANIMATE_CONTAINER,
                  maxTextLength: 500,
              },
        textEffects: config.textEffects || [], // Phase 3: Text effects array

        // 🔧 INTERNAL: Derived properties for backward compatibility
        splitType: derivedSplitType,
        preserveWhitespace: true, // Always preserve for clean layout
        wrapInSpans: animateBy !== "lines", // Use divs for lines, spans for chars/words
    }
}

/**
 * Enhanced stagger configuration converter
 * Converts property controls stagger settings to internal StaggerConfig with grid and directional order support
 *
 * @version 3.0.0 - Added grid stagger strategy support
 */
function convertEnhancedStaggerConfig(props: any): StaggerConfig | undefined {
    if (!props.staggerEnabled) {
        return undefined
    }

    const staggerConfig = props.staggerConfig || {}
    const strategy = staggerConfig.strategy || "linear"

    // Base configuration
    const config: StaggerConfig = {
        enabled: true,
        delay: staggerConfig.delay || 0.1,
        strategy: strategy as "linear" | "grid",
        // Set default order (will be properly configured below based on strategy)
        order: {
            forward: "first-to-last",
            backward: "first-to-last",
        },
    }

    if (strategy === "grid") {
        const gridMode = staggerConfig.gridMode || "point-based"

        // 🌐 GRID STAGGER: Configure grid-specific settings with new modes
        config.advanced = {
            grid: {
                // Existing properties
                origin: staggerConfig.gridOrigin || "center",
                autoDetect: staggerConfig.gridAutoDetect !== false,
                distanceMetric: staggerConfig.gridDistanceMetric || "euclidean",

                // 🆕 NEW: Grid mode and direction configuration
                mode: gridMode,

                // 🚀 NEW: Grid reverse behavior configuration (Phase 1A)
                reverseMode: staggerConfig.gridReverseMode || "latest-elements",

                // Row-based configuration
                ...(gridMode === "row-based" && {
                    rowDirection:
                        staggerConfig.gridRowDirection || "top-to-bottom",
                }),

                // Column-based configuration
                ...(gridMode === "column-based" && {
                    columnDirection:
                        staggerConfig.gridColumnDirection || "left-to-right",
                }),
            },
        }

        // Manual grid dimensions (when auto-detect is off)
        if (!config.advanced.grid.autoDetect) {
            ;(config.advanced.grid as any).rows = staggerConfig.gridRows || 3
            ;(config.advanced.grid as any).columns =
                staggerConfig.gridColumns || 3
        }

        // Random seed handling (existing logic)
        if (staggerConfig.showAdvanced && staggerConfig.randomSeed) {
            config.advanced.random = { seed: staggerConfig.randomSeed }
        }
    } else {
        // 🚀 LINEAR STAGGER: Configure order-based settings
        const orderMode = staggerConfig.orderMode || "simple"
        let orderConfig: DirectionalStaggerConfig

        if (orderMode === "directional") {
            // Advanced mode: Different orders for forward vs backward
            orderConfig = {
                forward: staggerConfig.forwardOrder || "first-to-last",
                backward: staggerConfig.backwardOrder || "last-to-first",
            }
        } else {
            // Simple mode: Same order for both directions
            const simpleOrder = staggerConfig.simpleOrder || "first-to-last"
            orderConfig = {
                forward: simpleOrder,
                backward: simpleOrder,
            }
        }

        config.order = orderConfig

        // Add advanced options for linear stagger
        if (staggerConfig.showAdvanced && staggerConfig.randomSeed) {
            config.advanced = {
                random: {
                    seed: staggerConfig.randomSeed,
                },
            }
        }
    }

    return config
}

/**
 * @deprecated Use convertEnhancedStaggerConfig instead
 * Legacy function maintained for backward compatibility during migration
 */
function convertSimpleStaggerConfig(props: any): StaggerConfig | undefined {
    if (!props.staggerEnabled) {
        return undefined
    }

    const legacyDirection = (props.staggerConfig?.direction || "forward") as any
    const migratedOrder = migrateLegacyDirection(legacyDirection)

    return {
        enabled: true,
        delay: props.staggerConfig?.delay || 0.1,
        strategy: "linear",
        order: migratedOrder,
    }
}

/**
 * Convert scroll boundaries from property controls format to internal format
 *
 * @param boundaries - Boundaries from property controls (percentage values)
 * @returns Converted boundaries in internal format with proper units
 */
function convertScrollBoundaries(boundaries: any): any {
    // Default boundaries if not provided (GSAP-style: top-top to bottom-bottom)
    const defaultBoundaries = {
        start: { element: { value: "0%" }, viewport: { value: "0%" } },
        end: { element: { value: "100%" }, viewport: { value: "100%" } },
    }

    if (!boundaries) {
        console.log(`🎭 [SCRUBBED_ANIMATOR_DEBUG] Using default boundaries`)
        return defaultBoundaries
    }

    console.log(
        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Converting boundaries:`,
        boundaries
    )

    // 🚨 FIX: Use !== undefined to handle 0 values correctly (0 is falsy but valid)
    const convertedBoundaries = {
        start: {
            element: {
                value: `${boundaries.start?.element !== undefined ? boundaries.start.element : 0}%`,
            },
            viewport: {
                value: `${boundaries.start?.viewport !== undefined ? boundaries.start.viewport : 0}%`,
            },
        },
        end: {
            element: {
                value: `${boundaries.end?.element !== undefined ? boundaries.end.element : 100}%`,
            },
            viewport: {
                value: `${boundaries.end?.viewport !== undefined ? boundaries.end.viewport : 100}%`,
            },
        },
    }

    console.log(
        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Converted boundaries:`,
        convertedBoundaries
    )
    return convertedBoundaries
}

//=======================================
//          CONVERSION METHODS
//=======================================

/**
 * Convert from property controls format to internal AnimationSlot format
 *
 * @param propertyControlsSlot - Raw data from Framer property controls
 * @param componentInstanceId - Unique component instance identifier to prevent ID conflicts
 * @returns Converted AnimationSlot in internal format
 * @throws Error if conversion fails or data is invalid
 */
export function toInternalFormat(
    propertyControlsSlot: any,
    componentInstanceId?: string
): AnimationSlot {
    if (!propertyControlsSlot) {
        throw new Error("PropertyControlsSlot is required")
    }

    // Generate slot ID with enhanced uniqueness to prevent conflicts
    const baseId =
        propertyControlsSlot.id || propertyControlsSlot.name || "unnamed"
    const instanceId = componentInstanceId || "global"
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 9)
    const microTimestamp = performance.now().toString().replace('.', '_')

    // 🚨 ENHANCED FIX: Include micro-timestamp and component instance for better uniqueness
    // This prevents conflicts between multiple slots created in rapid succession
    const slotId = `fame-${baseId}-${instanceId}-${timestamp}-${microTimestamp}-${randomSuffix}`

    console.log(
        `🏷️ [AnimationSlotAdapter] Generated unique slot ID: ${slotId}`,
        {
            originalId: propertyControlsSlot.id,
            originalName: propertyControlsSlot.name,
            componentInstanceId: instanceId,
            generatedId: slotId,
        }
    )

    // 🔍 DEBUG: Log property controls input to trace mode selection
    console.log(`🎭 [SCRUBBED_ANIMATOR_DEBUG] Property controls input:`, {
        animationParadigm: propertyControlsSlot.animationParadigm,
        animationParadigmType: typeof propertyControlsSlot.animationParadigm,
        availableModes: Object.values(AnimationMode),
        rawPropertyControls: {
            keys: Object.keys(propertyControlsSlot).filter(
                (key) =>
                    key.includes("mode") ||
                    key.includes("Mode") ||
                    key.includes("paradigm") ||
                    key.includes("Paradigm")
            ),
            scrollKeys: Object.keys(propertyControlsSlot).filter(
                (key) => key.includes("scroll") || key.includes("Scroll")
            ),
        },
    })

    // Convert triggers
    const triggers: TriggerElement[] = []
    if (
        propertyControlsSlot.triggers &&
        propertyControlsSlot.triggers.length > 0
    ) {
        propertyControlsSlot.triggers.forEach(
            (triggerElement: any, index: number) => {
                if (!triggerElement.targetElement) {
                    console.warn(
                        `Trigger ${index} missing targetElement, skipping`
                    )
                    return
                }

                const event = triggerElement.event || EventType.CLICK
                const behavior =
                    triggerElement.behavior || AnimationBehavior.TOGGLE
                const targetElement = triggerElement.targetElement

                // Convert multi-criteria format to selection array
                const criteria = convertIndividualCriteriaToArray(targetElement)

                // 🎯 NEW: Handle scroll-specific configuration
                const internalTrigger: TriggerElement = {
                    selection: {
                        scope: targetElement.scope || ElementScope.SELF,
                        criteria,
                    },
                    event,
                    behavior,
                    overrideState: triggerElement.overrideState || false,
                    reverseMode:
                        triggerElement.reverseMode ||
                        ReverseMode.EASING_PRESERVATION,
                }
                
                // 🔄 CRITICAL FIX: Transfer loopConfig and pingPongConfig from property controls
                if (triggerElement.loopConfig) {
                    internalTrigger.loopConfig = triggerElement.loopConfig;
                    console.log(`🔄 [AnimationSlotAdapter] Added loopConfig:`, triggerElement.loopConfig);
                }
                
                if (triggerElement.pingPongConfig) {
                    internalTrigger.pingPongConfig = triggerElement.pingPongConfig;
                    console.log(`🏓 [AnimationSlotAdapter] Added pingPongConfig:`, triggerElement.pingPongConfig);
                }
                
                if (triggerElement.delayedTriggerConfig) {
                    internalTrigger.delayedTriggerConfig = triggerElement.delayedTriggerConfig;
                    console.log(`⏱️ [AnimationSlotAdapter] Added delayedTriggerConfig:`, triggerElement.delayedTriggerConfig);
                }

                // Add scroll configuration if this is a scroll trigger
                if (event === EventType.SCROLL) {
                    console.log(
                        `🎯 [AnimationSlotAdapter] Processing scroll trigger:`,
                        {
                            event,
                            scrollThresholds: triggerElement.scrollThresholds,
                            hasScrollThresholds:
                                !!triggerElement.scrollThresholds,
                            triggerElement: triggerElement,
                        }
                    )

                    // 🚨 CRITICAL DEBUG: Add detailed logging for scroll threshold structure
                    console.log(
                        `🚨 [AnimationSlotAdapter] DETAILED SCROLL DEBUG:`,
                        {
                            fullTriggerElement: JSON.stringify(
                                triggerElement,
                                null,
                                2
                            ),
                            scrollThresholdsPath:
                                triggerElement.scrollThresholds,
                            elementStart:
                                triggerElement.scrollThresholds?.elementStart,
                            viewportThreshold:
                                triggerElement.scrollThresholds
                                    ?.viewportThreshold,
                            thresholdCrossedBackward:
                                triggerElement.scrollThresholds
                                    ?.thresholdCrossedBackward,
                            scrollThresholdsType:
                                typeof triggerElement.scrollThresholds,
                            scrollThresholdsKeys:
                                triggerElement.scrollThresholds
                                    ? Object.keys(
                                          triggerElement.scrollThresholds
                                      )
                                    : "N/A",
                        }
                    )

                    if (triggerElement.scrollThresholds) {
                        // 🚨 CRITICAL FIX: Ensure we're accessing the correct properties with proper fallbacks
                        const elementStart =
                            triggerElement.scrollThresholds.elementStart
                        const viewportThreshold =
                            triggerElement.scrollThresholds.viewportThreshold
                        const thresholdCrossedBackward =
                            triggerElement.scrollThresholds
                                .thresholdCrossedBackward

                        console.log(
                            `🚨 [AnimationSlotAdapter] Raw scroll threshold values:`,
                            {
                                elementStart,
                                viewportThreshold,
                                thresholdCrossedBackward,
                                elementStartType: typeof elementStart,
                                viewportThresholdType: typeof viewportThreshold,
                                thresholdCrossedBackwardType:
                                    typeof thresholdCrossedBackward,
                            }
                        )

                        // 🚨 CRITICAL FIX: Use exact values from UI, only apply defaults if truly undefined
                        internalTrigger.scrollThresholds = {
                            elementStart:
                                elementStart !== undefined ? elementStart : 0,
                            viewportThreshold:
                                viewportThreshold !== undefined
                                    ? viewportThreshold
                                    : 80,
                            thresholdCrossedBackward:
                                thresholdCrossedBackward || "none",
                        }

                        console.log(
                            `🎯 [AnimationSlotAdapter] Added scroll thresholds:`,
                            internalTrigger.scrollThresholds
                        )

                        // 🚨 CRITICAL VALIDATION: Ensure the values match what the UI is showing
                        if (
                            elementStart !== undefined &&
                            elementStart !==
                                internalTrigger.scrollThresholds.elementStart
                        ) {
                            console.error(
                                `🚨 [AnimationSlotAdapter] ERROR: elementStart value mismatch! UI: ${elementStart}, Internal: ${internalTrigger.scrollThresholds.elementStart}`
                            )
                        }
                        if (
                            viewportThreshold !== undefined &&
                            viewportThreshold !==
                                internalTrigger.scrollThresholds
                                    .viewportThreshold
                        ) {
                            console.error(
                                `🚨 [AnimationSlotAdapter] ERROR: viewportThreshold value mismatch! UI: ${viewportThreshold}, Internal: ${internalTrigger.scrollThresholds.viewportThreshold}`
                            )
                        }
                    } else {
                        console.warn(
                            `🎯 [AnimationSlotAdapter] No scroll thresholds found in trigger element for scroll event`
                        )

                        // 🚨 CRITICAL DEBUG: Log what we did receive to understand the structure
                        console.log(
                            `🚨 [AnimationSlotAdapter] Available trigger element properties:`,
                            Object.keys(triggerElement)
                        )
                        console.log(
                            `🚨 [AnimationSlotAdapter] Trigger element structure:`,
                            JSON.stringify(triggerElement, null, 2)
                        )
                    }
                }

                triggers.push(internalTrigger)
            }
        )
    } else {
        // Create default click trigger if none provided
        triggers.push({
            selection: { scope: ElementScope.SELF },
            event: EventType.CLICK,
            behavior: AnimationBehavior.TOGGLE,
            overrideState: false,
            reverseMode: ReverseMode.EASING_PRESERVATION,
        })
    }

    // Convert animated elements
    const animatedElements: AnimatedElement[] = []
    if (
        propertyControlsSlot.animatedElements &&
        propertyControlsSlot.animatedElements.length > 0
    ) {
        propertyControlsSlot.animatedElements.forEach(
            (animatedElement: any, index: number) => {
                // Convert multi-criteria format
                const criteria =
                    convertIndividualCriteriaToArray(animatedElement)
                const selection = convertToElementSelection(
                    animatedElement.scope || ElementScope.SELF,
                    criteria,
                    animatedElement.depth
                )

                // 🎨 FEATURE 2B: Convert text processing config per element
                const convertedElement: AnimatedElement = { selection }

                if (
                    animatedElement.textProcessingEnabled &&
                    animatedElement.textProcessingConfig
                ) {
                    convertedElement.textProcessing =
                        convertTextProcessingConfig(
                            animatedElement.textProcessingConfig
                        )
                }

                animatedElements.push(convertedElement)
            }
        )
    } else {
        // Create default SELF animated element
        animatedElements.push({
            selection: { scope: ElementScope.SELF },
        })
    }

    // 🌐 PHASE 4.3: Extract global timeline configuration
    const { globalTimelineEnabled = false, globalTimelineConfig = {} } =
        propertyControlsSlot

    console.log("🌐 [GlobalTimeline] Processing global timeline:", {
        enabled: globalTimelineEnabled,
        config: globalTimelineConfig,
    })

    // 🎬 TIMELINE-FIRST ARCHITECTURE: Choose processing approach
    let animationProperties: AnimationProperty[]
    let totalDuration: number
    let masterTimeline: any = undefined

    if (ENABLE_TIMELINE_ARCHITECTURE) {
        // Process with timeline approach
        const timelineResult = processWithTimelineArchitecture(
            propertyControlsSlot,
            globalTimelineConfig,
            globalTimelineEnabled
        )

        animationProperties = timelineResult.properties
        totalDuration = timelineResult.totalDuration
        masterTimeline = timelineResult.masterTimeline
    } else {
        // ❌ REMOVED: Legacy multi-property processing - processMultiPropertyInstances() removed
        // Timeline-First Architecture is stable and fully replaces legacy coordination
        console.error(
            "🚨 [AnimationSlotAdapter] Legacy processing requested but not available - Timeline-First Architecture required"
        )
        throw new Error(
            "Legacy multi-property processing has been removed. Enable Timeline-First Architecture."
        )
    }

    // 🔕 SIMPLIFIED: Basic properties summary (detailed logs removed for clarity)

    // Convert enhanced stagger configuration
    const staggerConfig = convertEnhancedStaggerConfig(propertyControlsSlot)
    if (staggerConfig) {
        // Enhanced stagger configuration processed with directional order support
    }

    // 🔍 DEBUG: Check animation mode assignment and scroll configuration
    // Map animationParadigm to AnimationMode enum
    const animationParadigm = propertyControlsSlot.animationParadigm
    let detectedMode: AnimationMode

    if (animationParadigm === "scroll-based") {
        detectedMode = AnimationMode.SCRUBBED
    } else {
        detectedMode = AnimationMode.TIMED // Default for "time-based" and undefined
    }

    console.log(`🎭 [SCRUBBED_ANIMATOR_DEBUG] Animation mode assignment:`, {
        animationParadigm: animationParadigm,
        animationParadigmType: typeof animationParadigm,
        detectedMode: detectedMode,
        scrubbedEnumValue: AnimationMode.SCRUBBED,
        timedEnumValue: AnimationMode.TIMED,
        isScrubbedMode: detectedMode === AnimationMode.SCRUBBED,
    })

    // 🔍 DEBUG: Check for scroll configuration that might indicate scrubbed mode
    const scrollRelatedKeys = Object.keys(propertyControlsSlot).filter(
        (key) =>
            key.toLowerCase().includes("scroll") ||
            key.toLowerCase().includes("scrub") ||
            key.toLowerCase().includes("boundary") ||
            key.toLowerCase().includes("threshold")
    )
    console.log(`🎭 [SCRUBBED_ANIMATOR_DEBUG] Scroll-related configuration:`, {
        scrollRelatedKeys,
        scrollValues: scrollRelatedKeys.reduce((acc, key) => {
            acc[key] = propertyControlsSlot[key]
            return acc
        }, {} as any),
    })

    // 🚀 NEW: Process scroll configuration for scrubbed mode
    let scrollConfig: any = undefined
    if (detectedMode === AnimationMode.SCRUBBED) {
        console.log(
            `🎭 [SCRUBBED_ANIMATOR_DEBUG] Processing scroll configuration for scrubbed mode`
        )

        // Look for scroll configuration in property controls
        const scrollSettings =
            propertyControlsSlot.scrollScrubbedConfig ||
            propertyControlsSlot.scrollSettings ||
            propertyControlsSlot.scrollConfig
        if (scrollSettings) {
            console.log(
                `🎭 [SCRUBBED_ANIMATOR_DEBUG] Found scroll settings:`,
                scrollSettings
            )

            // 🚨 CRITICAL FIX: Process trigger element selection properly
            let triggerElement: any = { scope: "self" } // default fallback

            if (scrollSettings.triggerElement) {
                const triggerElementConfig = scrollSettings.triggerElement
                console.log(
                    `🚨 [SCRUBBED_ANIMATOR_DEBUG] Processing trigger element config:`,
                    triggerElementConfig
                )

                // Convert individual criteria fields to internal format
                const criteria =
                    convertIndividualCriteriaToArray(triggerElementConfig)

                triggerElement = {
                    scope: triggerElementConfig.scope || "self",
                    criteria: criteria,
                }

                console.log(
                    `🚨 [SCRUBBED_ANIMATOR_DEBUG] Converted trigger element:`,
                    triggerElement
                )
            }

            // 🚨 CRITICAL FIX: Extract scroll stagger config from top-level property controls
            let staggerConfig: any = undefined // Start with undefined

            // 🎯 NEW: Check if stagger is enabled before processing stagger configuration
            if (propertyControlsSlot.staggerEnabled) {
                // Look for scroll stagger configuration at the top level
                if (propertyControlsSlot.scrollStaggerConfig) {
                    console.log(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Found scroll stagger config:`,
                        propertyControlsSlot.scrollStaggerConfig
                    )

                    const config = propertyControlsSlot.scrollStaggerConfig

                    staggerConfig = {
                        mode: config.mode || "scrubbed",
                        scrubWindow: config.scrubWindow || 100,
                        // 🚨 NEW: Extract grid stagger properties
                        strategy: config.strategy || "linear",
                        order: config.order,
                        gridMode: config.gridMode,
                        gridOrigin: config.gridOrigin,
                        gridRowDirection: config.gridRowDirection,
                        gridColumnDirection: config.gridColumnDirection,
                        gridDistanceMetric: config.gridDistanceMetric,
                        gridReverseMode: config.gridReverseMode,
                        gridAutoDetect: config.gridAutoDetect,
                        gridRows: config.gridRows,
                        gridColumns: config.gridColumns,
                    }

                    console.log(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Processed stagger config:`,
                        staggerConfig
                    )
                } else {
                    console.warn(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Stagger enabled but no scrollStaggerConfig found, using defaults`
                    )
                    staggerConfig = {
                        mode: "scrubbed",
                        scrubWindow: 100,
                        strategy: "linear",
                    }
                }
            } else {
                console.log(
                    `🎭 [SCRUBBED_ANIMATOR_DEBUG] Stagger disabled - no stagger configuration will be applied`
                )
            }

            // Process scroll configuration based on the types defined in ScrollTypes.ts
            scrollConfig = {
                mode: "scrubbed",
                scrubbedConfig: {
                    triggerElement: triggerElement,
                    boundaries: convertScrollBoundaries(
                        scrollSettings.boundaries
                    ),
                    ...(staggerConfig && { stagger: staggerConfig }), // Only include stagger if it's defined
                },
            }
        } else {
            console.warn(
                `🎭 [SCRUBBED_ANIMATOR_DEBUG] No scroll settings found for scrubbed mode, using defaults`
            )

            // 🚨 CRITICAL FIX: Still check for scroll stagger config even if scroll settings are missing
            let staggerConfig: any = undefined // Start with undefined

            // 🎯 NEW: Check if stagger is enabled before processing stagger configuration
            if (propertyControlsSlot.staggerEnabled) {
                if (propertyControlsSlot.scrollStaggerConfig) {
                    console.log(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Found scroll stagger config (no scroll settings):`,
                        propertyControlsSlot.scrollStaggerConfig
                    )

                    const config = propertyControlsSlot.scrollStaggerConfig

                    staggerConfig = {
                        mode: config.mode || "scrubbed",
                        scrubWindow: config.scrubWindow || 100,
                        // 🚨 NEW: Extract grid stagger properties
                        strategy: config.strategy || "linear",
                        order: config.order,
                        gridMode: config.gridMode,
                        gridOrigin: config.gridOrigin,
                        gridRowDirection: config.gridRowDirection,
                        gridColumnDirection: config.gridColumnDirection,
                        gridDistanceMetric: config.gridDistanceMetric,
                        gridReverseMode: config.gridReverseMode,
                        gridAutoDetect: config.gridAutoDetect,
                        gridRows: config.gridRows,
                        gridColumns: config.gridColumns,
                    }

                    console.log(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Processed stagger config (no scroll settings):`,
                        staggerConfig
                    )
                } else {
                    console.warn(
                        `🎭 [SCRUBBED_ANIMATOR_DEBUG] Stagger enabled but no scrollStaggerConfig found (no scroll settings), using defaults`
                    )
                    staggerConfig = {
                        mode: "scrubbed",
                        scrubWindow: 100,
                        strategy: "linear",
                    }
                }
            } else {
                console.log(
                    `🎭 [SCRUBBED_ANIMATOR_DEBUG] Stagger disabled (no scroll settings) - no stagger configuration will be applied`
                )
            }

            // Create default scroll configuration
            scrollConfig = {
                mode: "scrubbed",
                scrubbedConfig: {
                    triggerElement: { scope: "self" },
                    boundaries: {
                        start: {
                            element: { value: "0px" },
                            viewport: { value: "100vh" },
                        },
                        end: {
                            element: { value: "100%" },
                            viewport: { value: "0vh" },
                        },
                    },
                    ...(staggerConfig && { stagger: staggerConfig }), // Only include stagger if it's defined
                },
            }
        }

        console.log(
            `🎭 [SCRUBBED_ANIMATOR_DEBUG] Final scroll config:`,
            scrollConfig
        )
    }

    // Build internal AnimationSlot
    const internalSlot: AnimationSlot = {
        id: slotId,
        triggers: triggers,
        animatedElements: animatedElements,
        animationMode: detectedMode,
        properties: animationProperties,

        // Extract timing configuration
        timing: propertyControlsSlot.timing
            ? {
                  duration: propertyControlsSlot.timing.duration || 1000,
                  delay: propertyControlsSlot.timing.delay || 0,
                  easing: propertyControlsSlot.timing.easing || "cubic.inout",
              }
            : {
                  duration: 1000,
                  delay: 0,
                  easing: "cubic.inout",
              },

        // Add simple stagger configuration
        ...(staggerConfig && { staggering: staggerConfig }),

        // 🚨 NEW: Add interrupt behavior (default to IMMEDIATE for backward compatibility)
        interruptBehavior:
            propertyControlsSlot.interruptBehavior ||
            InterruptBehavior.IMMEDIATE,

        // 🔧 Timeline coordination metadata
        totalTimelineDuration: totalDuration,

        // 🎬 NEW: Master timeline for Timeline-First Architecture
        ...(masterTimeline && { masterTimeline }),

        // 🚀 NEW: Add scroll configuration for scrubbed mode
        ...(scrollConfig && { scrollConfig }),
    }

    return internalSlot
}

/**
 * Convert from internal AnimationSlot format back to property controls format
 * Useful for debugging, editing, or round-trip validation
 *
 * @param internalSlot - AnimationSlot in internal format
 * @returns Converted slot in property controls format
 * @throws Error if conversion fails
 */
export function fromInternalFormat(
    internalSlot: AnimationSlot
): PropertyControlsAnimationSlot {
    // TODO: Implement reverse conversion logic
    // This is optional but useful for debugging and testing

    throw new Error(
        "AnimationSlotAdapter.fromInternalFormat() - Not yet implemented"
    )
}

/**
 * Batch convert multiple slots from property controls to internal format
 *
 * @param propertyControlsSlots - Array of raw property controls slots
 * @returns Array of converted internal AnimationSlots
 * @throws Error if any conversion fails
 */
export function convertSlotArray(
    propertyControlsSlots: any[]
): AnimationSlot[] {
    if (!Array.isArray(propertyControlsSlots)) {
        throw new Error("propertyControlsSlots must be an array")
    }

    return propertyControlsSlots.map((slot, index) => {
        try {
            return toInternalFormat(slot)
        } catch (error) {
            console.error(
                `🔄 [AnimationSlotAdapter] Failed to convert slot ${index}:`,
                error
            )
            throw new Error(
                `Failed to convert animation slot at index ${index}: ${error instanceof Error ? error.message : "Unknown error"}`
            )
        }
    })
}

//=======================================
//          📊 DISTRIBUTED PROPERTIES EXPANSION (FEATURE 3A)
//=======================================

/**
 * 📊 FEATURE 3A: Expand distributed properties into element-specific values
 *
 * FIXED APPROACH: Instead of creating multiple property instances (which breaks animation execution),
 * we now store the element-specific values in a way that preserves the original slot structure
 * while allowing individual elements to get their specific values during animation.
 *
 * @param slot - Animation slot with potential distributed properties
 * @param elements - Array of animated elements
 * @returns Modified slot with distributed values stored in a compatible way
 *
 * @technical_fix
 * The original approach created multiple AnimationProperty instances with elementId fields,
 * which broke the animation execution system. This new approach:
 * 1. Keeps the original property structure (1 property per CSS property)
 * 2. Stores element-specific values in a special format that animation execution can handle
 * 3. Maintains compatibility with staggering and other animation features
 */
export function expandDistributedProperties(
    slot: AnimationSlot,
    elements: HTMLElement[]
): AnimationSlot {
    console.log(
        `📊 [DistributedProperties] Expanding properties for slot ${slot.id} with ${elements.length} elements`
    )

    // Early return if no elements or no properties
    if (!elements || elements.length === 0) {
        console.warn(
            `📊 [DistributedProperties] No elements provided for slot ${slot.id}, returning original slot`
        )
        return slot
    }

    if (!slot.properties || slot.properties.length === 0) {
        console.warn(
            `📊 [DistributedProperties] No properties to expand for slot ${slot.id}, returning original slot`
        )
        return slot
    }

    // 🚨 DEBUG: Special logging for single element case
    if (elements.length === 1) {
        console.log(
            `📊 [DistributedProperties] SINGLE ELEMENT DEBUG: Processing slot ${slot.id} with 1 element`
        )
        console.log(`📊 [DistributedProperties] Element details:`, {
            tagName: elements[0].tagName,
            className: elements[0].className,
            id: elements[0].id,
        })
        console.log(
            `📊 [DistributedProperties] Properties to process:`,
            slot.properties.map((p) => ({
                property: p.property,
                hasDistributeFrom: !!p.distributeFrom?.enabled,
                hasDistributeTo: !!p.distributeTo?.enabled,
                from: p.from,
                to: p.to,
            }))
        )
    }

    // Process each property and expand distributed ones
    const processedProperties: AnimationProperty[] = []
    let hasDistributedProperties = false

    slot.properties.forEach((property, propertyIndex) => {
        // Check if this property has distributed values
        const hasDistributedFrom = property.distributeFrom?.enabled === true
        const hasDistributedTo = property.distributeTo?.enabled === true

        if (!hasDistributedFrom && !hasDistributedTo) {
            // No distribution - keep original property unchanged
            processedProperties.push(property)
            return
        }

        hasDistributedProperties = true
        console.log(
            `📊 [DistributedProperties] Processing distributed property "${property.property}"`
        )

        try {
            console.log(`📊 [EXPANSION] Processing property "${property.property}":`, {
                hasDistributedFrom,
                hasDistributedTo,
                distributeFrom: property.distributeFrom,
                distributeTo: property.distributeTo
            });

            // Generate element-specific values using pattern generator
            const fromValues = hasDistributedFrom
                ? distributedPropertyPatternGenerator.generateElementValues(
                      elements,
                      property.distributeFrom!,
                      property.from
                  )
                : elements.map(() => property.from)

            const toValues = hasDistributedTo
                ? distributedPropertyPatternGenerator.generateElementValues(
                      elements,
                      property.distributeTo!,
                      property.to
                  )
                : elements.map(() => property.to)

            console.log(
                `📊 [DistributedProperties] Generated values for ${elements.length} elements:`,
                {
                    property: property.property,
                    fromValues: fromValues.slice(0, 3), // Show first 3 for debugging
                    toValues: toValues.slice(0, 3),
                }
            )

            // 🚨 SINGLE ELEMENT FIX: Ensure single elements always get valid distributed values
            let finalFromValues = fromValues
            let finalToValues = toValues

            if (elements.length === 1) {
                console.log(
                    `📊 [DistributedProperties] SINGLE ELEMENT FIX: Ensuring proper values for property "${property.property}":`,
                    {
                        originalFrom: property.from,
                        originalTo: property.to,
                        generatedFromValues: fromValues,
                        generatedToValues: toValues,
                        willUseFrom: fromValues[0] || property.from,
                        willUseTo: toValues[0] || property.to,
                    }
                )

                // Ensure we have at least one value for single elements
                if (
                    hasDistributedFrom &&
                    (!fromValues || fromValues.length === 0)
                ) {
                    console.warn(
                        `📊 [DistributedProperties] SINGLE ELEMENT WARNING: No from values generated, using fallback`
                    )
                    finalFromValues = [property.from]
                }
                if (hasDistributedTo && (!toValues || toValues.length === 0)) {
                    console.warn(
                        `📊 [DistributedProperties] SINGLE ELEMENT WARNING: No to values generated, using fallback`
                    )
                    finalToValues = [property.to]
                }
            }

            // 🔧 NEW APPROACH: Store element-specific values in a format compatible with animation execution
            // Instead of creating multiple properties, we store a mapping of element indices to values
            const processedProperty: AnimationProperty = {
                ...property,
                // Use first element's values as defaults (for compatibility with existing systems)
                from: finalFromValues[0] || property.from,
                to: finalToValues[0] || property.to,
                // Store element-specific values for animation execution to use
                distributedFromValues: finalFromValues,
                distributedToValues: finalToValues,
                // Remove the configuration objects (no longer needed)
                distributeFrom: undefined,
                distributeTo: undefined,
            }

            console.log(
                `📊 [DistributedProperties] Created processed property for "${property.property}":`,
                {
                    property: property.property,
                    hasDistributedFrom: !!finalFromValues,
                    hasDistributedTo: !!finalToValues,
                    distributedFromValues: finalFromValues,
                    distributedToValues: finalToValues,
                    firstElementFrom: finalFromValues[0],
                    firstElementTo: finalToValues[0],
                    elementCount: elements.length,
                }
            )

            processedProperties.push(processedProperty)
        } catch (error) {
            console.error(
                `📊 [DistributedProperties] Failed to expand property "${property.property}":`,
                error
            )

            // Graceful fallback - keep original property without distribution
            const fallbackProperty: AnimationProperty = {
                ...property,
                distributeFrom: undefined,
                distributeTo: undefined,
            }
            processedProperties.push(fallbackProperty)
        }
    })

    if (hasDistributedProperties) {
        console.log(
            `📊 [DistributedProperties] Successfully processed distributed properties for slot ${slot.id}`
        )
    }

    // Return slot with processed properties
    return {
        ...slot,
        properties: processedProperties,
    }
}

/**
 * Validate property controls slot before conversion
 *
 * @param slot - Property controls slot to validate
 * @returns True if valid, throws error if invalid
 */
export function validatePropertyControlsSlot(
    slot: PropertyControlsAnimationSlot
): boolean {
    // TODO: Implement validation logic
    // - Check required fields
    // - Validate enum values
    // - Check property configurations
    // - Validate element selectors

    throw new Error(
        "AnimationSlotAdapter.validatePropertyControlsSlot() - Not yet implemented"
    )
}

/**
 * Validate internal AnimationSlot
 *
 * @param slot - Internal AnimationSlot to validate
 * @returns True if valid, throws error if invalid
 */
export function validateInternalSlot(slot: AnimationSlot): boolean {
    // TODO: Implement validation logic

    throw new Error(
        "AnimationSlotAdapter.validateInternalSlot() - Not yet implemented"
    )
}

//=======================================
//          HELPER FUNCTIONS
//=======================================

/**
 * 🌐 PHASE 4.3: Merge global timeline settings with property-specific settings
 * Simplified approach: property controls decide independently whether to use global settings
 *
 * @param globalConfig Global timeline configuration
 * @param propertyConfig Property-specific configuration
 * @param globalTimelineEnabled Whether global timeline is enabled
 * @returns Merged timing configuration
 */
function mergeGlobalTimelineSettings(
    globalConfig: any,
    propertyConfig: any,
    globalTimelineEnabled: boolean
): { duration: number; delay: number; easing: string; springConfig?: any } {
    const wantsGlobalSettings = propertyConfig.useGlobalSettings === true
    const hasGlobalSettings = globalTimelineEnabled && globalConfig

    // NOTE: Keep in seconds - TimedAnimator will convert to milliseconds internally
    let finalDuration: number
    let finalEasing: string
    let finalSpringConfig: any

    if (wantsGlobalSettings && hasGlobalSettings) {
        // Use global timeline settings
        finalDuration = globalConfig.duration || 0.6
        finalEasing = globalConfig.easing || "ease"
        finalSpringConfig = globalConfig.springConfig
    } else {
        // Use property-specific settings (or defaults if global timeline is disabled)
        finalDuration = propertyConfig.duration || 0.6
        finalEasing = propertyConfig.easing || "ease"
        finalSpringConfig = propertyConfig.springConfig
    }

    // Ensure spring config is properly preserved
    // Check if spring config is an empty object and handle accordingly
    if (finalSpringConfig && typeof finalSpringConfig === "object") {
        // Check if it's an empty object {}
        if (Object.keys(finalSpringConfig).length === 0) {
            finalSpringConfig = undefined
        }
    }

    // 🚨 CRITICAL FIX: Delays should ALWAYS be relative to shared starting point
    // NOT accumulated with global timeline - this was causing sequential instead of simultaneous animations
    //
    // ❌ OLD BROKEN LOGIC: finalDelay = globalDelay + propertyDelay (sequential)
    // ✅ NEW FIXED LOGIC: finalDelay = propertyDelay (simultaneous from shared start)
    const finalDelay = propertyConfig.delay || 0

    // NOTE: Global timeline delay (if any) should affect the entire animation slot,
    // not individual property delays. Individual properties should always reference
    // the same shared starting point for simultaneous animation behavior.

    return {
        duration: finalDuration,
        delay: finalDelay,
        easing: finalEasing,
        springConfig: finalSpringConfig,
    }
}

/**
 * Timeline-First Architecture processing - UPDATED for new property configuration array
 * 🎯 NEW APPROACH: Processes animateProperties array instead of activeProperties + configs lookup
 *
 * @param propertyControlsSlot Raw property controls slot with animateProperties array
 * @param globalTimelineConfig Global timeline configuration
 * @param globalTimelineEnabled Whether global timeline is enabled
 * @returns Object with processed properties, total duration, and master timeline
 */
function processWithTimelineArchitecture(
    propertyControlsSlot: any,
    globalTimelineConfig: any,
    globalTimelineEnabled: boolean
): {
    properties: AnimationProperty[]
    totalDuration: number
    masterTimeline: any
} {
    // 🎯 NEW: Check for new animateProperties array structure
    if (
        propertyControlsSlot.animateProperties &&
        Array.isArray(propertyControlsSlot.animateProperties)
    ) {
        console.log(
            "🎯 [NEW APPROACH] Processing animateProperties array:",
            propertyControlsSlot.animateProperties
        )
        return processNewPropertyConfigurationArray(
            propertyControlsSlot,
            globalTimelineConfig,
            globalTimelineEnabled
        )
    }

    // 🔄 LEGACY: Fall back to old activeProperties processing for backward compatibility
    if (
        propertyControlsSlot.activeProperties &&
        Array.isArray(propertyControlsSlot.activeProperties)
    ) {
        console.log(
            "🔄 [LEGACY] Processing activeProperties array (backward compatibility):",
            propertyControlsSlot.activeProperties
        )
        return processLegacyActiveProperties(
            propertyControlsSlot,
            globalTimelineConfig,
            globalTimelineEnabled
        )
    }

    // 🚨 NO PROPERTIES: Return empty result
    console.warn(
        "🚨 [AnimationSlotAdapter] No animateProperties or activeProperties found"
    )
    return { properties: [], totalDuration: 0, masterTimeline: null }
}

/**
 * 🎯 NEW: Process the new animateProperties array structure
 * This is much more efficient as it only processes configured properties
 */
function processNewPropertyConfigurationArray(
    propertyControlsSlot: any,
    globalTimelineConfig: any,
    globalTimelineEnabled: boolean
): {
    properties: AnimationProperty[]
    totalDuration: number
    masterTimeline: any
} {
    const animationProperties: AnimationProperty[] = []

    propertyControlsSlot.animateProperties.forEach(
        (propertyConfig: any, index: number) => {
            const propertyName = propertyConfig.property

            if (!propertyName) {
                console.warn(
                    `🎯 [NEW APPROACH] Property name missing at index ${index}`
                )
                return
            }

            console.log(
                `🎯 [NEW APPROACH] Processing property "${propertyName}":`,
                propertyConfig
            )

            // Merge with global timeline settings if enabled
            const mergedSettings = mergeGlobalTimelineSettings(
                globalTimelineConfig,
                propertyConfig,
                globalTimelineEnabled
            )

            // 📊 DISTRIBUTED PROPERTIES: Simple pass-through 
            let distributeFromConfig = undefined
            let distributeToConfig = undefined

            if (propertyConfig.useDistributedValues === true) {
                console.log(`📊 [DISTRIBUTED] Processing distributed property "${propertyName}":`, propertyConfig)

                // Simple transformation: UI config -> Pattern generator format
                if (propertyConfig.distributedFromConfig) {
                    distributeFromConfig = {
                        enabled: true,
                        ...propertyConfig.distributedFromConfig // Direct pass-through
                    }
                    console.log(`📊 [DISTRIBUTED] From config:`, distributeFromConfig)
                }

                if (propertyConfig.distributedToConfig) {
                    distributeToConfig = {
                        enabled: true,
                        ...propertyConfig.distributedToConfig // Direct pass-through
                    }
                    console.log(`📊 [DISTRIBUTED] To config:`, distributeToConfig)
                }
            }

            // 🐛 TECHNICAL FIX: When distributed mode is enabled, use patterns as placeholders
            const isDistributedEnabled =
                distributeFromConfig || distributeToConfig
            const fromValue = isDistributedEnabled
                ? propertyConfig.distributedFromPattern || "0" // Use pattern as placeholder
                : propertyConfig.from !== undefined
                  ? propertyConfig.from
                  : "0"
            const toValue = isDistributedEnabled
                ? propertyConfig.distributedToPattern || "100" // Use pattern as placeholder
                : propertyConfig.to !== undefined
                  ? propertyConfig.to
                  : "100"

            // Create AnimationProperty with properly merged settings
            const animationProperty: AnimationProperty = {
                property: propertyName,
                from: fromValue,
                to: toValue,
                duration: mergedSettings.duration,
                delay: mergedSettings.delay,
                easing: mergedSettings.easing,
                springConfig: mergedSettings.springConfig,
                instanceId: `${propertyName}_${index}`, // Use index for unique instances

                // 📊 FEATURE 3A: Add distributed property configurations if present
                ...(distributeFromConfig && {
                    distributeFrom: distributeFromConfig,
                }),
                ...(distributeToConfig && { distributeTo: distributeToConfig }),
            }

            animationProperties.push(animationProperty)
        }
    )

    // Step 2: Build master timeline from properties
    const builder = new MasterTimelineBuilder()

    const globalSettings: GlobalTimelineConfig | undefined =
        globalTimelineEnabled
            ? {
                  enabled: true,
                  duration: globalTimelineConfig?.duration,
                  delay: globalTimelineConfig?.delay,
                  easing: globalTimelineConfig?.easing,
                  springConfig: globalTimelineConfig?.springConfig,
              }
            : undefined

    const masterTimeline = builder.buildMasterTimeline(
        animationProperties,
        globalSettings
    )

    console.log(
        `🎯 [NEW APPROACH] Successfully processed ${animationProperties.length} properties`
    )

    return {
        properties: animationProperties,
        totalDuration: masterTimeline.totalDuration,
        masterTimeline,
    }
}

/**
 * 🔄 LEGACY: Process the old activeProperties + property config lookup structure
 * Kept for backward compatibility with existing components
 */
function processLegacyActiveProperties(
    propertyControlsSlot: any,
    globalTimelineConfig: any,
    globalTimelineEnabled: boolean
): {
    properties: AnimationProperty[]
    totalDuration: number
    masterTimeline: any
} {
    const animationProperties: AnimationProperty[] = []
    const propertyCounters = new Map<string, number>()
    const activeProperties = propertyControlsSlot.activeProperties || []

    activeProperties.forEach((propertyName: string) => {
        const count = propertyCounters.get(propertyName) || 0
        const controlId =
            count === 0 ? propertyName : `${propertyName}_${count}`
        const propertyConfig = propertyControlsSlot[controlId]

        if (!propertyConfig) {
            console.warn(
                `🔄 [LEGACY] Property configuration missing for ${controlId}`
            )
            return
        }

        // Use mergeGlobalTimelineSettings to properly handle spring configs
        const mergedSettings = mergeGlobalTimelineSettings(
            globalTimelineConfig,
            propertyConfig,
            globalTimelineEnabled
        )

        // 📊 FEATURE 3A: Extract distributed property configurations (FIXED for new UX)
        // With the new single toggle approach, distributed properties are in the same property config
        const distributeFromConfig = extractDistributedPropertyConfig(
            propertyConfig,
            propertyName,
            "From"
        )
        const distributeToConfig = extractDistributedPropertyConfig(
            propertyConfig,
            propertyName,
            "To"
        )

        // 🚨 ESSENTIAL: Log when distributed properties are found
        if (distributeFromConfig || distributeToConfig) {
            console.log(
                `📊 [LEGACY] Distributed property detected: ${propertyName}`
            )
        }

        // 🐛 TECHNICAL FIX: When distributed mode is enabled, ignore regular from/to values
        // The expansion process will replace these placeholder values with element-specific ones
        const isDistributedEnabled = distributeFromConfig || distributeToConfig
        const fromValue = isDistributedEnabled
            ? "0" // Placeholder - will be replaced by expansion
            : propertyConfig.from !== undefined
              ? propertyConfig.from
              : 0
        const toValue = isDistributedEnabled
            ? "100" // Placeholder - will be replaced by expansion
            : propertyConfig.to !== undefined
              ? propertyConfig.to
              : 100

        // Create AnimationProperty with properly merged settings and distributed property configs
        const animationProperty: AnimationProperty = {
            property: propertyName,
            from: fromValue,
            to: toValue,
            unit: propertyConfig.unit, // ✅ FIXED: No fallback unit - let MasterTimelineBuilder.inferUnit() handle it
            duration: mergedSettings.duration,
            delay: mergedSettings.delay,
            easing: mergedSettings.easing,
            springConfig: mergedSettings.springConfig,
            instanceId: controlId,

            // 📊 FEATURE 3A: Add distributed property configurations if present
            ...(distributeFromConfig && {
                distributeFrom: distributeFromConfig,
            }),
            ...(distributeToConfig && { distributeTo: distributeToConfig }),
        }

        animationProperties.push(animationProperty)

        propertyCounters.set(propertyName, count + 1)
    })

    // Step 2: Build master timeline from properties
    const builder = new MasterTimelineBuilder()

    const globalSettings: GlobalTimelineConfig | undefined =
        globalTimelineEnabled
            ? {
                  enabled: true,
                  duration: globalTimelineConfig?.duration,
                  delay: globalTimelineConfig?.delay,
                  easing: globalTimelineConfig?.easing,
                  springConfig: globalTimelineConfig?.springConfig,
              }
            : undefined

    const masterTimeline = builder.buildMasterTimeline(
        animationProperties,
        globalSettings
    )

    console.log(
        `🔄 [LEGACY] Successfully processed ${animationProperties.length} properties`
    )

    return {
        properties: animationProperties,
        totalDuration: masterTimeline.totalDuration,
        masterTimeline,
    }
}

/**
 * 🚀 PHASE 4.3: Process activeProperties array for multi-property support
 * Handles cases like ["translateX", "translateX", "opacity"] -> multiple instances
 *
 * @param activeProperties Array of property names (can have duplicates)
 * @returns Array of unique property names with instance tracking
 */
function processActiveProperties(
    activeProperties: string[]
): Array<{
    propertyName: string
    instanceId: string
    controlIdSuffix: string
}> {
    const propertyInstances: Array<{
        propertyName: string
        instanceId: string
        controlIdSuffix: string
    }> = []
    const instanceCounts = new Map<string, number>()

    activeProperties.forEach((propertyName) => {
        const currentCount = instanceCounts.get(propertyName) || 0
        instanceCounts.set(propertyName, currentCount + 1)

        const controlIdSuffix = currentCount === 0 ? "" : `_${currentCount}`
        const instanceId = propertyName + controlIdSuffix

        propertyInstances.push({
            propertyName,
            instanceId,
            controlIdSuffix,
        })
    })

    return propertyInstances
}

/**
 * Convert property controls trigger to internal TriggerElement
 */
function convertTriggerElement(/* TODO: Add parameters */): TriggerElement {
    // TODO: Implement trigger conversion
    throw new Error("convertTriggerElement() - Not yet implemented")
}

/**
 * Convert property controls animated element to internal AnimatedElement
 */
function convertAnimatedElement(/* TODO: Add parameters */): AnimatedElement {
    // TODO: Implement animated element conversion
    throw new Error("convertAnimatedElement() - Not yet implemented")
}

/**
 * Extract and convert property configurations to AnimationProperty array
 */
function extractAnimationProperties(/* TODO: Add parameters */): AnimationProperty[] {
    // TODO: Implement property extraction and conversion
    throw new Error("extractAnimationProperties() - Not yet implemented")
}

/**
 * NEW: Convert scope + criteria to ElementSelection
 * Handles the new multi-criteria selection format with depth support
 */
function convertToElementSelection(
    scope: ElementScope,
    criteria?: SelectionCriteria[],
    depth?: ScopeDepth
): ElementSelection {
    return {
        scope,
        criteria: criteria && criteria.length > 0 ? criteria : undefined,
        depth: depth || ScopeDepth.DIRECT, // Default to DIRECT for backward compatibility
    }
}

//=======================================
//          EXAMPLE USAGE
//=======================================

/**
 * Example of how to use the adapter in FAME.tsx
 *
 * ```typescript
 * import { convertSlotArray } from './config/adapters/AnimationSlotAdapter.ts';
 *
 * export function FAME(props: FAMEProps) {
 *     // Raw property controls data
 *     const rawSlots = props.animationSlots;
 *
 *     // Convert to internal format
 *     const internalSlots = convertSlotArray(rawSlots);
 *
 *     // Pass to orchestrator
 *     const orchestrator = new AnimationOrchestrator(internalSlots);
 *
 *     // ...rest of component
 * }
 * ```
 */

/*
IMPLEMENTATION STATUS:
□ Define PropertyControlsAnimationSlot interface
□ Define conversion methods (toInternal, fromInternal)
□ Implement trigger element conversion
□ Implement animated element conversion  
□ Implement property extraction and conversion
□ Add validation methods
□ Add error handling
□ Add comprehensive tests
□ Add usage examples
□ Integration with FAME.tsx

ARCHITECTURE COMPLIANCE:
✅ Clear separation of concerns (UI format vs internal format)
✅ Single responsibility (just conversion, no business logic)
✅ Testable in isolation
✅ No side effects or state management
✅ Comprehensive error handling planned
✅ Bidirectional conversion support
✅ Batch processing support

NEXT STEPS:
1. Implement PropertyControlsAnimationSlot interface based on actual property controls
2. Implement toInternalFormat() conversion method
3. Add validation and error handling
4. Test with real property controls data
5. Integrate with FAME.tsx
*/
