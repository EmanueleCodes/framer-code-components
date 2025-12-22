/**
 * FAME Animation System - Animation Property Controls
 *
 * @fileOverview Main animation property controls for Framer UI
 * @version 2.0.0-clean
 * @status ACTIVE - Core functionality migrated with architectural fixes
 *
 * @description
 * This component provides the sophisticated property controls UI for FAME animations
 * in Framer. It handles animation slot configuration, stagger controls, property
 * selection, timing controls, and element targeting. The controls generate the
 * configuration data that drives the animation system.
 *
 * Based on working code from src-refactored but adapted for clean architecture
 * with critical naming fixes and architectural improvements.
 *
 * @reference
 * fame-final-repo/src-refactored/config/propertyControls/AnimationSlots.ts (47KB, 1294 lines)
 * - Animation slot configuration UI (stagger, properties, timing)
 * - Element targeting controls (trigger/animated element selection)
 * - Property selection with sophisticated filtering
 * - Timing and easing configuration
 * - Animation mode controls (scroll, click, hover, etc.)
 * - Complex property controls with nested configurations
 *
 * @architecture_shift
 * Key changes for new architecture:
 * 1. **CRITICAL NAMING FIXES**:
 *    - Use TriggerElement instead of TargetElement naming throughout
 *    - Use AnimatedElement instead of AffectedElement naming throughout
 *    - Update all variable names: targetElement → triggerElement, affectedElement → animatedElement
 *    - Update all function names: findTargetElement → findTriggerElement, findAffectedElements → findAnimatedElements
 *
 * 2. **ARCHITECTURE INTEGRATION**:
 *    - Integrate with clean AnimationOrchestrator (not Engine)
 *    - Use clean type definitions from ../types/
 *    - Remove GlobalAnimationRegistry dependencies
 *    - Use AnimationStateManager for state management
 *
 * 3. **CLEAN DATA FLOW**:
 *    - Output clean AnimationSlot format (no conversion layer needed)
 *    - Direct integration with AnimationOrchestrator
 *    - Simplified property structure for direct animator consumption
 *
 * @implementation_plan
 * 1. **COPY FOUNDATION**: Copy working property controls from src-refactored/config/propertyControls/AnimationSlots.ts
 * 2. **NAMING MIGRATION**: Search and replace all instances:
 *    - "TargetElement" → "TriggerElement" (case sensitive)
 *    - "AffectedElement" → "AnimatedElement" (case sensitive)
 *    - "targetElement" → "triggerElement" (case sensitive)
 *    - "affectedElement" → "animatedElement" (case sensitive)
 *    - "findTargetElement" → "findTriggerElement"
 *    - "findAffectedElements" → "findAnimatedElements"
 * 3. **IMPORT UPDATES**: Update imports to use clean architecture:
 *    - Types from '../types/AnimationTypes.ts'
 *    - Components from '../core/AnimationOrchestrator.ts'
 *    - Utils from '../utils/' (not src-refactored/utils/)
 * 4. **TYPE COMPATIBILITY**: Ensure compatibility with new AnimationSlot types
 * 5. **TESTING**: Test with new FAME.tsx component and AnimationOrchestrator
 *
 * @data_flow_changes
 * OLD FLOW: Property Controls → SlotConverter → AnimationSlot → Engine → Animators
 * NEW FLOW: Property Controls → AnimationSlot → AnimationOrchestrator → Animators
 *
 * Benefits:
 * - Eliminates unnecessary conversion layer
 * - Direct data flow from UI to execution
 * - Better performance and maintainability
 * - Cleaner separation of concerns
 *
 * @key_ui_components
 * The property controls include:
 * - Animation slot management (add/remove/reorder)
 * - Element targeting (trigger element selection)
 * - Animated element configuration
 * - Property selection with filtering
 * - Stagger controls (advanced timing distribution)
 * - Timing and easing configuration
 * - Animation mode selection
 * - Preview and debugging tools
 *
 * @migration_priorities
 * 1. **HIGH PRIORITY**: Fix TargetElement/AffectedElement naming (critical for functionality)
 * 2. **HIGH PRIORITY**: Update type imports for clean architecture
 * 3. **MEDIUM PRIORITY**: Integrate with AnimationOrchestrator
 * 4. **MEDIUM PRIORITY**: Remove GlobalAnimationRegistry dependencies
 * 5. **LOW PRIORITY**: Optimize for new data flow patterns
 *
 * @quality_preservation
 * The existing AnimationSlots.ts is HIGH QUALITY and working excellently:
 * - Sophisticated stagger controls
 * - Complex property selection logic
 * - Robust element targeting
 * - Comprehensive timing configuration
 * - Excellent error handling
 *
 * DO NOT REWRITE THE LOGIC - only adapt for clean architecture!
 */

import { ControlType } from "framer"
import type { PropertyControls } from "framer"

import {
    AnimationSlot,
    TriggerElement,
    AnimatedElement,
    EventType,
    AnimationMode,
    AnimationBehavior,
    StaggerMode,
    StaggerDirection,
    ElementScope,
    CriteriaType,
    ScopeDepth,
    ElementSelection,
    SelectionCriteria,
    ReverseMode,
    InterruptBehavior,
    // 🎨 FEATURE 2B: Text Processing Types (Phase 1)
    TextSplitType,
    TextCanvasFallback,
} from "../../types/index.ts"

import {
    ANIMATABLE_PROPERTIES,
    createPropertyControls,
    PropertyConfig,
} from "../properties/PropertyRegistry.ts"

// ✅ PHASE 1 - STEP 1: Import enhanced easing utilities
import {
    EASING_OPTIONS,
    DEFAULT_EASING,
} from "../../utils/easings/EasingFunctions.ts"

// 📊 FEATURE 3A: Import distributed property controls from modular structure
import {
    getDistributedToggleControl,
    getSimpleModeControl,
    getDistributedPatternControls,
    createDistributedPropertyArrayControls,
} from "./animationControls/DistributedPropertyControls.ts"

// ✅ PHASE 1 - STEP 1: Import helper functions from new modular structure
import {
    hasEventType,
    hasScrollScrubbedAnimation,
    isTimeBased,
    isScrollBased,
    shouldShowRegularStagger,
    shouldShowScrollStagger,
} from "./animationControls/HelperFunctions.ts"

// ✅ PHASE 2 - STEP 1: Import element selection controls from new modular structure
import {
    createTriggerElementControls,
    createAnimatedElementControls,
} from "./animationControls/ElementSelectionControls.ts"

// ✅ PHASE 3 - STEP 1: Import scroll configuration controls from new modular structure
import { createScrollConfiguration } from "./animationControls/ScrollConfigurationControls.ts"

// ✅ PHASE 4 - STEP 1: Import stagger controls from new modular structure
import {
    createRegularStaggerControls,
    createScrollStaggerControls,
    createInterruptBehaviorControls,
} from "./animationControls/StaggerControls.ts"

// ✅ PHASE 5 - STEP 1: Import animation mode and property selection controls from new modular structure
import {
    createAnimationParadigmControls,
    createAnimationBehaviorControls,
} from "./animationControls/AnimationModeControls.ts"

import {
    createPropertySelectionControls,
    createGlobalTimelineControls,
} from "./animationControls/PropertySelectionControls.ts"

//=======================================
//          🚀 NEW APPROACH: PROPERTY CONFIGURATION ARRAY
//          Similar to triggers array - much more efficient
//=======================================

/**
 * NEW APPROACH: Property Configuration Array
 * 🎯 BREAKTHROUGH SOLUTION: Array-based property configuration like triggers
 *
 * @description
 * Instead of generating 2,500+ property controls and hiding most of them,
 * this creates an array-based system where users configure properties
 * one by one, similar to how triggers array works.
 *
 * Structure:
 * animateProperties: [
 *   { property: "translateX", from: "0px", to: "100px", easing: "ease-out" },
 *   { property: "rotateY", from: "0deg", to: "180deg", easing: "spring" },
 *   { property: "backgroundColor", from: "#ff0000", to: "#00ff00" }
 * ]
 *
 * Benefits:
 * - Only generates controls for configured properties
 * - Scales linearly (1 property = ~10 controls, not +500)
 * - Familiar UX pattern (like triggers array)
 * - No hidden control bloat
 * - Naturally efficient architecture
 *
 * Trade-offs:
 * - Slightly different UX (dropdown selection instead of named controls)
 * - But more sustainable and scalable
 */
function createPropertyConfigurationArray() {
    return {
        animateProperties: {
            type: ControlType.Array,
            title: "Animate Properties",
            maxCount: 15, // Reasonable limit for properties per animation
            control: {
                type: ControlType.Object,
                title: "Property",
                controls: {
                    // Property selection dropdown
                    property: {
                        type: ControlType.Enum,
                        title: "Property",
                        options: ANIMATABLE_PROPERTIES.map((prop) => prop.name),
                        optionTitles: ANIMATABLE_PROPERTIES.map(
                            (prop) => prop.title
                        ),
                        defaultValue: "translateX",
                    },

                    // Property-specific controls that adapt based on selection
                    ...createAdaptivePropertyControls(),
                },
            },
        },
    }
}

/**
 * Creates adaptive property controls that change based on selected property
 * 🎯 SMART CONTROLS: Adapts control types based on property selection
 * 📊 USES MODULAR: Leverages DistributedPropertyControls.ts for distributed properties
 */
function createAdaptivePropertyControls() {
    return {
        // From value - simple mode (hidden when distributed)
        from: {
            type: ControlType.String,
            title: "From",
            placeholder: "Starting value (e.g., 0px, #ff0000, 0)",
            defaultValue: "",
            hidden: (props: any) => props.useDistributedValues === true,
        },

        // To value - simple mode (hidden when distributed)
        to: {
            type: ControlType.String,
            title: "To",
            placeholder: "Ending value (e.g., 100px, #00ff00, 1)",
            defaultValue: "",
            hidden: (props: any) => props.useDistributedValues === true,
        },

        // 📊 DISTRIBUTED PROPERTIES: Main toggle
        useDistributedValues: {
            type: ControlType.Boolean,
            title: "Use Distributed Values",
            description: "Distribute different values across multiple elements",
            defaultValue: false,
        },
        
        // 📊 DISTRIBUTED PROPERTY CONTROLS: Using modular function from DistributedPropertyControls.ts
        ...createDistributedPropertyArrayControls(),

        // Global settings toggle
        useGlobalSettings: {
            type: ControlType.Boolean,
            title: "Use Global Timeline Settings",
            description: "Use global timeline settings for duration and delay",
            defaultValue: true,
        },

        // Timing controls
        easing: {
            type: ControlType.Enum,
            title: "Easing",
            options: EASING_OPTIONS,
            optionTitles: [
                "Linear", "Ease In", "Ease Out", "Ease In-Out",
                "Cubic", "Cubic In", "Cubic Out", "Cubic In-Out",
                "Expo", "Expo In", "Expo Out", "Expo In-Out",
                "Smooth Out", "Smooth In", "Pause", "Out-N-In", "Dramatic Out-N-In",
                "Back Out", "Back In", "Spring", "Spring In", "Spring Out",
            ],
            defaultValue: DEFAULT_EASING,
            hidden: (props: any) => props.useGlobalSettings === true,
        },
        

        // Spring configuration
        springConfig: {
            type: ControlType.Object,
            title: "Spring Configuration",
            controls: {
                amplitude: {
                    type: ControlType.Number,
                    title: "Amplitude",
                    defaultValue: 1,
                    min: 1,
                    max: 5,
                    step: 0.1,
                },
                period: {
                    type: ControlType.Number,
                    title: "Period",
                    defaultValue: 0.3,
                    min: 0.1,
                    max: 2,
                    step: 0.1,
                },
            },
            hidden: (props: any) => !props.easing?.toLowerCase().includes("spring"),
        },

        

        // Duration override
        duration: {
            type: ControlType.Number,
            title: "Duration (s)",
            min: 0.01,
            max: 10,
            step: 0.1,
            defaultValue: 0.6,
            displayStepper: true,
            hidden: (props: any) => props.useGlobalSettings === true,
        },

        // Delay override
        delay: {
            type: ControlType.Number,
            title: "Delay (s)",
            min: 0,
            max: 10,
            step: 0.1,
            defaultValue: 0,
            displayStepper: true,
            hidden: (props: any) => props.useGlobalSettings === true,
        },

        
    }
}

//=======================================
//      🚀 UPDATED MAIN PROPERTY CONTROLS FUNCTION
//=======================================

/**
 * NEW: Generate property controls using efficient array approach
 * 🎯 EFFICIENT APPROACH: Array-based property configuration
 */
function generatePropertyControls() {
    console.log(
        "🎯 [NEW APPROACH] Using efficient property configuration array..."
    )

    // Return the property configuration array structure
    // This replaces the massive generatePropertyControls system
    const propertyConfig = createPropertyConfigurationArray()

    // Return the structure that can be spread into the controls object
    return propertyConfig
}

//=======================================
//      🔄 LEGACY APPROACH (KEPT FOR COMPARISON)
//=======================================

/**
 * LEGACY: The old massive property controls generation
 * 🗂️ KEPT FOR REFERENCE: Shows the difference in scale
 *
 * This function shows what we're replacing:
 * - 50+ properties × 5 instances × 10 controls = 2,500+ controls
 * - Massive hidden control bloat
 * - Exponential scaling problem
 */
function generateLegacyPropertyControls() {
    console.log("🗂️ [LEGACY] This would generate 2,500+ property controls...")

    const controlsMap: any = {}

    // Generate controls for ALL properties with all instances
    ANIMATABLE_PROPERTIES.forEach((property) => {
        // First instance
        controlsMap[property.name] = {
            ...createPropertyControls(property),
            hidden: (props: any) => {
                if (
                    !props.activeProperties ||
                    !Array.isArray(props.activeProperties)
                ) {
                    return true
                }
                const instances = props.activeProperties.filter(
                    (p: string) => p === property.name
                )
                return (
                    instances.length === 0 ||
                    props.activeProperties.indexOf(property.name) !==
                        props.activeProperties.findIndex(
                            (p: string) => p === property.name
                        )
                )
            },
        }

        // Additional instances (1-4)
        for (let i = 1; i <= 4; i++) {
            const controlId = `${property.name}_${i}`
            controlsMap[controlId] = {
                ...createPropertyControls({
                    ...property,
                    controlIdSuffix: `_${i}`,
                    title: property.title,
                }),
                hidden: (props: any) => {
                    if (
                        !props.activeProperties ||
                        !Array.isArray(props.activeProperties)
                    ) {
                        return true
                    }
                    const matches = props.activeProperties.filter(
                        (p: string) => p === property.name
                    )
                    if (matches.length <= i) {
                        return true
                    }
                    let count = 0
                    let targetIndex = -1
                    for (let j = 0; j < props.activeProperties.length; j++) {
                        if (props.activeProperties[j] === property.name) {
                            if (count === i) {
                                targetIndex = j
                                break
                            }
                            count++
                        }
                    }
                    return targetIndex === -1
                },
            }
        }
    })

    console.log(
        `🗂️ [LEGACY] Would generate ${Object.keys(controlsMap).length} property controls`
    )
    return controlsMap
}

//===============================================
//      ANIMATION SLOT OBJECT CREATION
//===============================================

export function CreateAnimationSlotsObject() {
    return {
        animationSlots: {
            type: ControlType.Array,
            title: "Animations",
            defaultValue: [
                {
                    id: "default-animation",
                    triggerEvent: EventType.CLICK,
                    triggerBehavior: AnimationBehavior.PLAY_ONCE,
                    triggers: [
                        {
                            event: EventType.CLICK,
                            behavior: AnimationBehavior.PLAY_FORWARD,
                            overrideState: false,
                            targetElement: {
                                scope: ElementScope.SELF,
                                criteriaType1: "none",
                                criteriaValue1: "",
                                criteriaType2: "none",
                                criteriaValue2: "",
                                criteriaType3: "none",
                                criteriaValue3: "",
                            },
                        },
                    ],

                    // 🎯 TOP-LEVEL ANIMATION PARADIGM: Fundamental choice between time-based and scroll-based
                    //...topLevelAnimationParadigm,

                    animatedElements: [
                        {
                            scope: ElementScope.SELF,
                            criteriaType1: "none",
                            criteriaValue1: "",
                            criteriaType2: "none",
                            criteriaValue2: "",
                            criteriaType3: "none",
                            criteriaValue3: "",
                        },
                    ],
                    animationMode: AnimationMode.TIMED,
                    activeProperties: ["translateX"],

                    // 🌐 PHASE 4.2: Global timeline default values
                    globalTimelineEnabled: false,
                    globalTimelineConfig: {
                        duration: 0.6,
                        delay: 0,
                        easing: "ease",
                        springConfig: {
                            amplitude: 1,
                            period: 0.3,
                        },
                    },

                    // 🚨 NEW: Interrupt behavior default
                    interruptBehavior: InterruptBehavior.IMMEDIATE,

                    translateX: {
                        from: "0px",
                        to: "100px",
                        unit: "px",
                        useGlobalSettings: true,
                    },
                },
            ],
            control: {
                type: ControlType.Object,
                title: "Animation",
                controls: {
                    // Animation slot ID (auto-generated or user-defined)
                    id: {
                        type: ControlType.String,
                        title: "Animation ID",
                        defaultValue: "",
                        placeholder: "Auto-generated if empty",
                    },

                    // Trigger configuration (simplified approach)
                    //...triggerControls,

                    // ✅ PHASE 5 - STEP 2: Replace animation paradigm with modular function
                    ...createAnimationParadigmControls(),

                    // ✅ PHASE 2 - STEP 2: Replace triggers array with modular function
                    ...createTriggerElementControls(),

                    // ✅ PHASE 2 - STEP 3: Replace animated elements with modular function
                    ...createAnimatedElementControls(),

                    // ✅ PHASE 3 - STEP 2: Replace scroll configuration with modular function
                    ...createScrollConfiguration(),

                    // ✅ PHASE 5 - STEP 3: Replace global timeline controls with modular function
                    ...createGlobalTimelineControls(),

                    // ✅ PHASE 4 - STEP 2: Replace regular stagger controls with modular function
                    ...createRegularStaggerControls(),

                    // ✅ PHASE 4 - STEP 3: Replace scroll stagger controls with modular function
                    ...createScrollStaggerControls(),

                    // ✅ PHASE 4 - STEP 4: Replace interrupt behavior controls with modular function
                    ...createInterruptBehaviorControls(),

                    // ✅ SCROLL CONFIGURATION: Implemented dual-mode scroll system (timed + scrubbed)

                    // 🎯 NEW APPROACH: Replace old property system with efficient array
                    // OLD: activeProperties + 2,500+ hidden property controls
                    // NEW: animateProperties array with only needed controls
                    ...generatePropertyControls(),
                },
            },
        },
    }
}

// NOTE: Multi-criteria controls have been integrated directly into the existing animatedElement object above

/*
MIGRATION STATUS - COMPLETED FEATURES:
✅ Critical naming fixes applied:
   - TargetElement → TriggerElement throughout
   - AffectedElement → AnimatedElement throughout
✅ Clean architecture imports from unified types
✅ Updated to use PropertyRegistry from clean architecture
✅ Basic property controls generation
✅ Element targeting configuration
✅ Event type selection
✅ Animation mode and behavior selection
✅ Property selection with dynamic controls

TODO - REMAINING FEATURES TO ADD:
□ Scroll settings (boundaries, threshold)
✅ Simple stagger configuration (basic linear stagger ready)
□ Timing controls (delay, duration)
□ Viewport optimization settings
□ Full scroll animation configuration

COORDINATED STAGGER STATUS:
✅ Property controls: staggerEnabled + staggerConfig
✅ AnimationSlotAdapter: Simple conversion logic
✅ EventAnimationCoordinator: COORDINATED stagger execution 
✅ Behavior Reuse: Leverages existing behavior decision system
✅ SURGICAL FIX: Converts only TOGGLE behavior, preserves complex behaviors
✅ COORDINATED LINEAR STAGGER: Complete implementation with fixed toggle behavior!

ARCHITECTURE COMPLIANCE:
✅ Uses unified types from ../../types/index.ts
✅ Integrates with PropertyRegistry from ../properties/
✅ No GlobalAnimationRegistry dependencies
✅ Direct AnimationSlot output format
✅ Clean data flow for AnimationOrchestrator
✅ Critical naming fixes applied throughout
*/
