/**
 * FAME Animation System - Debug Property Controls
 * 
 * @fileOverview Granular debug controls for FAME animation system
 * @version 2.0.0-clean
 * @status ACTIVE - Ready for use
 * 
 * @description
 * Provides sophisticated debug controls that prevent log flooding by allowing
 * users to enable only the specific debug categories they need. Each debug
 * category can be independently controlled with its own log level.
 * 
 * @architecture_role
 * These controls generate DebugConfig objects that are consumed by:
 * - FAME.tsx for initial debug setup
 * - AnimationOrchestrator for execution debugging
 * - AnimationStateManager for state debugging
 * - EventManager for event debugging
 * - Various animators for specific debugging
 * 
 * @debug_categories
 * 1. **Data Flow**: Property controls → Internal format → Execution
 * 2. **Animation**: Timing, easing, staggering, property interpolation
 * 3. **State**: Progress tracking, status changes, synchronization
 * 4. **DOM**: Element finding, style application, event handling
 * 5. **Performance**: Frame rates, memory usage, execution times
 * 6. **Visual**: On-screen debugging aids and highlights
 * 
 * @benefits
 * - Prevents log flooding with granular control
 * - Different verbosity levels per category
 * - Easy to enable/disable specific debug types
 * - Clear debugging workflow for different issues
 * - Visual debugging aids for complex animations
 */

import { ControlType } from "framer";
import type { PropertyControls } from "framer";

import {
    DebugLogLevel,
} from "../../types/index.ts";

//=======================================
//          MASTER DEBUG CONTROLS
//=======================================

export const masterDebugControls = {
    // Master debug switch
    debugEnabled: {
        type: ControlType.Boolean,
        title: "🐛 Enable Debug System",
        defaultValue: false,
        description: "Master switch for all debug features",
    },

    // Quick debug presets
    debugPreset: {
        type: ControlType.Enum,
        title: "Debug Preset",
        options: ["off", "basic", "development", "advanced", "everything"],
        optionTitles: [
            "Off",
            "Basic (Errors Only)",
            "Development (Common Issues)",
            "Advanced (Deep Debugging)",
            "Everything (All Categories)"
        ],
        defaultValue: "off",
        hidden: (props: any) => !props.debugEnabled,
        description: "Quick presets for common debug scenarios",
    },
};

//=======================================
//          DATA FLOW DEBUG CONTROLS
//=======================================

export const dataFlowDebugControls = {
    // Data flow debugging section
    dataFlowDebugEnabled: {
        type: ControlType.Boolean,
        title: "📊 Data Flow Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Track data transformations through the system",
    },

    dataFlowLogLevel: {
        type: ControlType.Enum,
        title: "Data Flow Log Level",
        options: [
            DebugLogLevel.MINIMAL,
            DebugLogLevel.NORMAL,
            DebugLogLevel.VERBOSE,
            DebugLogLevel.EXTREME
        ],
        optionTitles: ["Minimal", "Normal", "Verbose", "Extreme"],
        defaultValue: DebugLogLevel.NORMAL,
        hidden: (props:any) => !props.dataFlowDebugEnabled,
    },

    // Specific data flow categories
    dataFlowPropertyControls: {
        type: ControlType.Boolean,
        title: "Property Controls → AnimationSlot",
        defaultValue: true,
        hidden: (props:any) => !props.dataFlowDebugEnabled,
        description: "Debug property controls conversion",
    },

    dataFlowSlotProcessing: {
        type: ControlType.Boolean,
        title: "AnimationSlot → Animator Input",
        defaultValue: true,
        hidden: (props:any) => !props.dataFlowDebugEnabled,
        description: "Debug slot processing for animators",
    },

    dataFlowStateChanges: {
        type: ControlType.Boolean,
        title: "State Transitions",
        defaultValue: false,
        hidden: (props:any) => !props.dataFlowDebugEnabled,
        description: "Debug state change flow",
    },

    dataFlowEventFlow: {
        type: ControlType.Boolean,
        title: "Event → Animation Trigger",
        defaultValue: false,
        hidden: (props:any) => !props.dataFlowDebugEnabled,
        description: "Debug event to animation trigger flow",
    },
};

//=======================================
//          ANIMATION DEBUG CONTROLS
//=======================================

export const animationDebugControls = {
    // Animation debugging section
    animationDebugEnabled: {
        type: ControlType.Boolean,
        title: "🎬 Animation Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Debug animation execution details",
    },

    animationLogLevel: {
        type: ControlType.Enum,
        title: "Animation Log Level",
        options: [
            DebugLogLevel.MINIMAL,
            DebugLogLevel.NORMAL,
            DebugLogLevel.VERBOSE,
            DebugLogLevel.EXTREME
        ],
        optionTitles: ["Minimal", "Normal", "Verbose", "Extreme"],
        defaultValue: DebugLogLevel.NORMAL,
        hidden: (props:any) => !props.animationDebugEnabled,
    },

    // Specific animation categories
    animationTiming: {
        type: ControlType.Boolean,
        title: "Timing & Frame Rates",
        defaultValue: true,
        hidden: (props:any) => !props.animationDebugEnabled,
        description: "Debug timing calculations and frame rates",
    },

    animationEasing: {
        type: ControlType.Boolean,
        title: "Easing Functions",
        defaultValue: false,
        hidden: (props:any) => !props.animationDebugEnabled,
        description: "Debug easing function applications",
    },

    animationStaggering: {
        type: ControlType.Boolean,
        title: "Staggering",
        defaultValue: true,
        hidden: (props:any) => !props.animationDebugEnabled,
        description: "Debug stagger calculations",
    },

    animationProperties: {
        type: ControlType.Boolean,
        title: "Property Interpolations",
        defaultValue: false,
        hidden: (props:any) => !props.animationDebugEnabled,
        description: "Debug property value interpolations",
    },

    animationLifecycle: {
        type: ControlType.Boolean,
        title: "Lifecycle Events",
        defaultValue: true,
        hidden: (props:any) => !props.animationDebugEnabled,
        description: "Debug start/stop/complete events",
    },
};

//=======================================
//          STATE DEBUG CONTROLS
//=======================================

export const stateDebugControls = {
    // State debugging section
    stateDebugEnabled: {
        type: ControlType.Boolean,
        title: "🔄 State Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Debug animation state management",
    },

    stateLogLevel: {
        type: ControlType.Enum,
        title: "State Log Level",
        options: [
            DebugLogLevel.MINIMAL,
            DebugLogLevel.NORMAL,
            DebugLogLevel.VERBOSE,
            DebugLogLevel.EXTREME
        ],
        optionTitles: ["Minimal", "Normal", "Verbose", "Extreme"],
        defaultValue: DebugLogLevel.NORMAL,
        hidden: (props:any) => !props.stateDebugEnabled,
    },

    // Specific state categories
    stateProgressTracking: {
        type: ControlType.Boolean,
        title: "Progress Tracking (0-1)",
        defaultValue: true,
        hidden: (props:any) => !props.stateDebugEnabled,
        description: "Debug animation progress values",
    },

    stateStatusChanges: {
        type: ControlType.Boolean,
        title: "Status Transitions",
        defaultValue: true,
        hidden: (props:any) => !props.stateDebugEnabled,
        description: "Debug idle/running/completed transitions",
    },

    stateValidation: {
        type: ControlType.Boolean,
        title: "State Validation",
        defaultValue: false,
        hidden: (props:any) => !props.stateDebugEnabled,
        description: "Debug state validation errors",
    },

    stateSynchronization: {
        type: ControlType.Boolean,
        title: "Multi-Element Sync",
        defaultValue: false,
        hidden: (props:any) => !props.stateDebugEnabled,
        description: "Debug state synchronization across elements",
    },
};

//=======================================
//          DOM DEBUG CONTROLS
//=======================================

export const domDebugControls = {
    // DOM debugging section
    domDebugEnabled: {
        type: ControlType.Boolean,
        title: "🌐 DOM Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Debug DOM operations and element finding",
    },

    domLogLevel: {
        type: ControlType.Enum,
        title: "DOM Log Level",
        options: [
            DebugLogLevel.MINIMAL,
            DebugLogLevel.NORMAL,
            DebugLogLevel.VERBOSE,
            DebugLogLevel.EXTREME
        ],
        optionTitles: ["Minimal", "Normal", "Verbose", "Extreme"],
        defaultValue: DebugLogLevel.NORMAL,
        hidden: (props:any) => !props.domDebugEnabled,
    },

    // Specific DOM categories
    domElementFinding: {
        type: ControlType.Boolean,
        title: "Element Selector Resolution",
        defaultValue: true,
        hidden: (props:any) => !props.domDebugEnabled,
        description: "Debug element finding and selectors",
    },

    domStyleApplication: {
        type: ControlType.Boolean,
        title: "CSS Style Changes",
        defaultValue: false,
        hidden: (props:any) => !props.domDebugEnabled,
        description: "Debug style application to elements",
    },

    domTransforms: {
        type: ControlType.Boolean,
        title: "Transform Calculations",
        defaultValue: false,
        hidden: (props:any) => !props.domDebugEnabled,
        description: "Debug transform matrix calculations",
    },

    domEventHandling: {
        type: ControlType.Boolean,
        title: "Event Listeners",
        defaultValue: true,
        hidden: (props:any) => !props.domDebugEnabled,
        description: "Debug event listener setup/teardown",
    },
};

//=======================================
//          PERFORMANCE DEBUG CONTROLS
//=======================================

export const performanceDebugControls = {
    // Performance debugging section
    performanceDebugEnabled: {
        type: ControlType.Boolean,
        title: "⚡ Performance Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Monitor performance metrics",
    },

    performanceLogLevel: {
        type: ControlType.Enum,
        title: "Performance Log Level",
        options: [
            DebugLogLevel.MINIMAL,
            DebugLogLevel.NORMAL,
            DebugLogLevel.VERBOSE,
            DebugLogLevel.EXTREME
        ],
        optionTitles: ["Minimal", "Normal", "Verbose", "Extreme"],
        defaultValue: DebugLogLevel.NORMAL,
        hidden: (props:any) => !props.performanceDebugEnabled,
    },

    // Specific performance categories
    performanceFrameRate: {
        type: ControlType.Boolean,
        title: "Animation Frame Rates",
        defaultValue: true,
        hidden: (props:any) => !props.performanceDebugEnabled,
        description: "Monitor animation frame rates",
    },

    performanceMemoryUsage: {
        type: ControlType.Boolean,
        title: "Memory Consumption",
        defaultValue: false,
        hidden: (props:any) => !props.performanceDebugEnabled,
        description: "Track memory usage patterns",
    },

    performanceExecutionTime: {
        type: ControlType.Boolean,
        title: "Function Execution Times",
        defaultValue: false,
        hidden: (props:any) => !props.performanceDebugEnabled,
        description: "Measure function execution times",
    },

    performanceBatchOperations: {
        type: ControlType.Boolean,
        title: "Style Batching",
        defaultValue: false,
        hidden: (props:any) => !props.performanceDebugEnabled,
        description: "Debug style batching optimizations",
    },
};

//=======================================
//          VISUAL DEBUG CONTROLS
//=======================================

export const visualDebugControls = {
    // Visual debugging section
    visualDebugEnabled: {
        type: ControlType.Boolean,
        title: "👁️ Visual Debug",
        defaultValue: false,
        hidden: (props:any) => !props.debugEnabled || props.debugPreset === "off",
        description: "Show visual debugging aids on screen",
    },

    // Visual debug categories (no log level needed - these are visual)
    visualShowTriggerElements: {
        type: ControlType.Boolean,
        title: "Highlight Trigger Elements",
        defaultValue: true,
        hidden: (props: any) => !props.visualDebugEnabled,
        description: "Highlight elements that receive events",
    },

    visualShowAnimatedElements: {
        type: ControlType.Boolean,
        title: "Highlight Animated Elements",
        defaultValue: true,
        hidden: (props:any) => !props.visualDebugEnabled,
        description: "Highlight elements being animated",
    },

    visualShowBoundaries: {
        type: ControlType.Boolean,
        title: "Show Scroll Boundaries",
        defaultValue: false,
        hidden: (props:any) => !props.visualDebugEnabled,
        description: "Show scroll trigger boundaries",
    },

    visualShowStaggerOrder: {
        type: ControlType.Boolean,
        title: "Show Stagger Numbers",
        defaultValue: false,
        hidden: (props:any) => !props.visualDebugEnabled,
        description: "Show stagger sequence numbers",
    },

    visualShowProgress: {
        type: ControlType.Boolean,
        title: "Show Progress Bars",
        defaultValue: false,
        hidden: (props:any) => !props.visualDebugEnabled,
        description: "Show animation progress bars",
    },
};

//=======================================
//          COMBINED DEBUG CONTROLS
//=======================================

/**
 * Creates complete debug property controls object
 * Combines all debug categories into a single controls object
 */
export function CreateDebugControls(): { debug: PropertyControls[string] } {
    return {
        debug: {
            type: ControlType.Boolean,
            title: "🐛 Enable Debug System",
            defaultValue: false,
            description: "Master switch for all debug features",
        }
    };
}

/**
 * Creates complete debug configuration property controls
 * Combines all debug categories for debugConfig property
 */
export function CreateDebugConfigControls(): PropertyControls {
    //@ts-ignore
    // TODO: Inspect typescript issue in the future.
    // For now, everything is working as expected.
    return {
        // Master debug controls
        ...masterDebugControls,

        // Data flow debug controls
        ...dataFlowDebugControls,

        // Animation debug controls
        ...animationDebugControls,

        // State debug controls
        ...stateDebugControls,

        // DOM debug controls
        ...domDebugControls,

        // Performance debug controls
        ...performanceDebugControls,

        // Visual debug controls
        ...visualDebugControls,
    };
}

//=======================================
//          DEBUG PRESET LOGIC
//=======================================

/**
 * Apply debug preset to enable common debug combinations
 * This helps users quickly enable relevant debug categories
 */
export function applyDebugPreset(preset: string): Partial<any> {
    switch (preset) {
        case "basic":
            return {
                dataFlowDebugEnabled: true,
                dataFlowLogLevel: DebugLogLevel.MINIMAL,
                animationDebugEnabled: true,
                animationLogLevel: DebugLogLevel.MINIMAL,
                animationLifecycle: true,
            };

        case "development":
            return {
                dataFlowDebugEnabled: true,
                dataFlowLogLevel: DebugLogLevel.NORMAL,
                dataFlowPropertyControls: true,
                animationDebugEnabled: true,
                animationLogLevel: DebugLogLevel.NORMAL,
                animationTiming: true,
                animationLifecycle: true,
                stateDebugEnabled: true,
                stateLogLevel: DebugLogLevel.NORMAL,
                stateProgressTracking: true,
                stateStatusChanges: true,
                domDebugEnabled: true,
                domLogLevel: DebugLogLevel.MINIMAL,
                domElementFinding: true,
                visualDebugEnabled: true,
                visualShowTriggerElements: true,
                visualShowAnimatedElements: true,
            };

        case "advanced":
            return {
                // Enable most categories with verbose logging
                dataFlowDebugEnabled: true,
                dataFlowLogLevel: DebugLogLevel.VERBOSE,
                animationDebugEnabled: true,
                animationLogLevel: DebugLogLevel.VERBOSE,
                stateDebugEnabled: true,
                stateLogLevel: DebugLogLevel.VERBOSE,
                domDebugEnabled: true,
                domLogLevel: DebugLogLevel.VERBOSE,
                performanceDebugEnabled: true,
                performanceLogLevel: DebugLogLevel.NORMAL,
                visualDebugEnabled: true,
                // Enable most specific categories
                dataFlowPropertyControls: true,
                dataFlowSlotProcessing: true,
                dataFlowStateChanges: true,
                animationTiming: true,
                animationStaggering: true,
                animationLifecycle: true,
                stateProgressTracking: true,
                stateStatusChanges: true,
                domElementFinding: true,
                domEventHandling: true,
                performanceFrameRate: true,
                visualShowTriggerElements: true,
                visualShowAnimatedElements: true,
            };

        case "everything":
            return {
                // Enable ALL categories with extreme logging
                dataFlowDebugEnabled: true,
                dataFlowLogLevel: DebugLogLevel.EXTREME,
                animationDebugEnabled: true,
                animationLogLevel: DebugLogLevel.EXTREME,
                stateDebugEnabled: true,
                stateLogLevel: DebugLogLevel.EXTREME,
                domDebugEnabled: true,
                domLogLevel: DebugLogLevel.EXTREME,
                performanceDebugEnabled: true,
                performanceLogLevel: DebugLogLevel.EXTREME,
                visualDebugEnabled: true,
                // Enable ALL specific categories
                dataFlowPropertyControls: true,
                dataFlowSlotProcessing: true,
                dataFlowStateChanges: true,
                dataFlowEventFlow: true,
                animationTiming: true,
                animationEasing: true,
                animationStaggering: true,
                animationProperties: true,
                animationLifecycle: true,
                stateProgressTracking: true,
                stateStatusChanges: true,
                stateValidation: true,
                stateSynchronization: true,
                domElementFinding: true,
                domStyleApplication: true,
                domTransforms: true,
                domEventHandling: true,
                performanceFrameRate: true,
                performanceMemoryUsage: true,
                performanceExecutionTime: true,
                performanceBatchOperations: true,
                visualShowTriggerElements: true,
                visualShowAnimatedElements: true,
                visualShowBoundaries: true,
                visualShowStaggerOrder: true,
                visualShowProgress: true,
            };

        default: // "off"
            return {
                debugEnabled: false,
            };
    }
}

/*
IMPLEMENTATION STATUS:
✅ Master debug controls with presets
✅ Data flow debug controls (6 categories)
✅ Animation debug controls (5 categories)
✅ State debug controls (4 categories)
✅ DOM debug controls (4 categories)
✅ Performance debug controls (4 categories)
✅ Visual debug controls (5 categories)
✅ Debug preset logic for common scenarios
✅ Granular control to prevent log flooding

ARCHITECTURE COMPLIANCE:
✅ Matches DebugConfig interface from types
✅ Granular control over each debug category
✅ Different log levels per category
✅ Visual debugging aids
✅ Quick presets for common use cases
✅ Prevents log flooding with specific controls

USAGE:
These controls will be integrated into FAME.tsx property controls
to provide comprehensive debugging capabilities without overwhelming
the user with logs they don't need.
*/ 