/**
 * @file PropertySelectionControls.ts
 * @description Property selection and global timeline configuration controls for FAME animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @module PropertySelectionControls
 * 
 * @description
 * This module provides property controls for animation property selection and global timeline configuration.
 * It handles the multi-property selection system and global timing defaults that can be applied
 * across all properties in an animation slot.
 * 
 * @features
 * - Multi-property selection with support for duplicates
 * - Global timeline controls for default timing settings
 * - Spring configuration for global spring easing
 * - Integration with PropertyRegistry for available properties
 * 
 * @architecture
 * This is part of the modular refactoring of AnimationSlots.ts:
 * - Extracted from AnimationSlots.ts (Phase 5)
 * - Single responsibility: property selection and global timing
 * - Clean separation of concerns
 * - Reusable and maintainable
 * 
 * @usage
 * ```typescript
 * import { createPropertySelectionControls, createGlobalTimelineControls } from './PropertySelectionControls.ts'
 * 
 * const controls = {
 *   ...createPropertySelectionControls(),
 *   ...createGlobalTimelineControls(),
 *   // other controls...
 * }
 * ```
 * 
 * @integration
 * Used by AnimationSlots.ts main composition function to provide
 * property selection and global timeline configuration.
 */

import { ControlType } from "framer"

import {
    ANIMATABLE_PROPERTIES,
} from "../../properties/PropertyRegistry.ts"

import {
    EASING_OPTIONS,
    DEFAULT_EASING,
} from "../../../utils/easings/EasingFunctions.ts"

/**
 * Creates property selection controls
 * 
 * @description
 * 🔄 RESTORED + OPTIMIZED: Works with all properties but now optimized for dynamic generation
 * Generates the multi-property selection control that allows users to choose
 * which properties to animate. Now works with the truly dynamic property controls system
 * to only generate controls for selected properties.
 * 
 * The selection drives the dynamic generation of property-specific controls
 * and determines which properties will be included in the animation.
 * 
 * @returns Property controls object for property selection
 * 
 * @example
 * ```typescript
 * const propertyControls = createPropertySelectionControls()
 * // Returns controls for multi-property selection
 * ```
 * 
 * @architectural_note
 * 🚀 NEW APPROACH: This integrates with the truly dynamic property controls system.
 * Instead of generating all 50+ properties and hiding them, the selection here
 * drives which controls get generated dynamically.
 */
export function createPropertySelectionControls() {
    // 🔄 RESTORED: Use ALL available properties for maximum flexibility
    console.log(`🔄 [PROPERTY SELECTION] Using all ${ANIMATABLE_PROPERTIES.length} properties for dynamic generation`);
    
    return {
        activeProperties: {
            type: ControlType.Array,
            title: "Animate :",
            maxCount: 25, // 🔄 RESTORED: Support for many properties with instances
            control: {
                type: ControlType.Enum,
                title: "Property",
                options: ANIMATABLE_PROPERTIES.map((prop) => prop.name),
                optionTitles: ANIMATABLE_PROPERTIES.map((prop) => prop.title),
                defaultValue: "translateX",
            },
        }
    }
}

/**
 * Creates global timeline configuration controls
 * 
 * @description
 * Generates comprehensive global timeline controls including:
 * - Master toggle for global timeline behavior
 * - Default duration, delay, and easing settings
 * - Spring configuration for spring-based easing
 * 
 * When enabled, these settings provide defaults for all properties
 * in the animation slot. Individual properties can override these
 * global settings if needed.
 * 
 * @returns Property controls object for global timeline configuration
 * 
 * @example
 * ```typescript
 * const timelineControls = createGlobalTimelineControls()
 * // Returns controls for global timeline configuration
 * ```
 * 
 * @architectural_note
 * This function encapsulates the complex global timeline UI that includes
 * conditional visibility for spring settings and comprehensive timing controls
 * that serve as defaults for property-specific overrides.
 */
export function createGlobalTimelineControls() {
    return {
        // Master toggle for global timeline behavior
        globalTimelineEnabled: {
            type: ControlType.Boolean,
            title: "Global Timeline Behavior",
            defaultValue: false
        },

        // Global timeline configuration (only shown when enabled)
        globalTimelineConfig: {
            type: ControlType.Object,
            title: "Global Timeline Settings",
            hidden: (props: any) => !props.globalTimelineEnabled,
            controls: {
                duration: {
                    type: ControlType.Number,
                    title: "Default Duration (s)",
                    description: "Default duration for all properties",
                    min: 0.01,
                    max: 10,
                    step: 0.1,
                    defaultValue: 0.6,
                    displayStepper: true,
                },

                delay: {
                    type: ControlType.Number,
                    title: "Global Delay (s)", 
                    description: "Base delay added to all property delays",
                    min: 0,
                    max: 10,
                    step: 0.1,
                    defaultValue: 0,
                    displayStepper: true,
                },

                easing: {
                    type: ControlType.Enum,
                    title: "Default Easing",
                    description: "Default easing function for all properties",
                    options: EASING_OPTIONS,
                    optionTitles: [
                        "Linear", "Ease In", "Ease Out", "Ease In-Out",
                        "Cubic", "Cubic In", "Cubic Out", "Cubic In-Out", 
                        "Expo", "Expo In", "Expo Out", "Expo In-Out",
                        "Smooth Out", "Smooth In",
                        "Pause", "Out-N-In", "Dramatic Out-N-In",
                        "Back Out", "Back In",
                        "Spring", "Spring In", "Spring Out",
                    ],
                    defaultValue: DEFAULT_EASING,
                },

                // Spring configuration for global timeline (when spring easing is selected)
                springConfig: {
                    type: ControlType.Object,
                    title: "Global Spring Settings",
                    hidden: (props: any) => !props.easing?.toLowerCase().includes("spring"),
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
                },
            },
        }
    }
} 