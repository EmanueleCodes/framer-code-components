/**
 * @file DistributedPropertyControls.ts
 * @description Property controls for distributed property configuration
 * 
 * @version 2.0.0 - REVISED UX
 * @since 1.0.0
 * 
 * @description
 * Provides Framer property controls for configuring distributed properties.
 * 
 * REVISED UX APPROACH:
 * - Single boolean toggle for logical exclusivity (either simple OR distributed)
 * - Progressive disclosure (advanced features replace basic ones)
 * - Clear mental model with no conflicting values
 * 
 * Key Features:
 * - Pattern-based value distribution across multiple animated elements
 * - Support for comma-separated and linear range patterns
 * - Future-ready for random and grid-aware patterns
 * - Clean integration with existing property control system
 * 
 * Data Flow:
 * - Input: Property controls configuration from Framer UI
 * - Processing: Pattern generation via DistributedPropertyPatternGenerator
 * - Output: Distributed property configuration data
 * 
 * @architecture_compliance
 * This file handles ONLY property control generation for the UI layer.
 * It does NOT handle:
 * - Animation execution (handled by EventAnimationCoordinator)
 * - Element targeting (handled by ElementFinder)
 * - Pattern generation (DistributedPropertyPatternGenerator handles this)
 * - Timeline coordination (handled by MasterTimelineBuilder)
 * 
 * @god_class_prevention
 * Single responsibility: Generate Framer property controls for distributed properties.
 * Pattern generation, execution, and animation logic are handled by separate classes.
 * 
 * @usage
 * ```typescript
 * // Extend existing property controls with distributed property support
 * const propertyControls = {
 *   // Standard property controls
 *   translateX: {
 *     type: ControlType.Object,
 *     controls: {
 *       // NEW: Single boolean toggle approach
 *       useDistributedValues: getDistributedToggleControl(),
 *       
 *       // Simple mode controls (hidden when distributed)
 *       from: getSimpleModeControl('translateX', 'From'),
 *       to: getSimpleModeControl('translateX', 'To'),
 *       
 *       // Distributed mode controls (hidden when simple)
 *       ...getDistributedPatternControls('translateX')
 *     }
 *   }
 * }
 * ```
 * 
 * @validation
 * User input validation is handled by validateDistributedPropertyConfig().
 * Pattern generation validation is handled by DistributedPropertyPatternGenerator.
 * 
 * @performance
 * Property controls are generated once during component initialization.
 * No runtime performance impact on animation execution.
 */

// ✅ IMPORTS
import { ControlType } from "framer"

// Import distributed property types
import type { 
    DistributedPropertyConfig,
    DistributedPropertyPattern,
    CommaSeparatedPattern,
    LinearRangePattern,
    LinearProgression
} from "../../../types/index.ts"

// =======================================
//           CONTROL OPTIONS
// =======================================

/**
 * Detect if a property name represents a color property
 * 
 * @param propertyName - CSS property name to check
 * @returns True if the property should use color controls
 */
function isColorProperty(propertyName: string): boolean {
    return propertyName.includes('color') || 
           propertyName.includes('Color') ||
           propertyName === 'backgroundColor' ||
           propertyName === 'borderColor' ||
           propertyName === 'fill' ||
           propertyName === 'stroke';
}

/**
 * Get appropriate control type for a property  
 * 
 * @param propertyName - CSS property name  
 * @returns ControlType.Color for color properties, ControlType.String for others
 */
function getControlTypeForProperty(propertyName: string): any {
    return isColorProperty(propertyName) ? ControlType.Color : ControlType.String;
}

/**
 * Get appropriate placeholder text for a property
 * 
 * @param propertyName - CSS property name
 * @param isColorProp - Whether this is a color property
 * @returns Appropriate placeholder text
 */
function getPlaceholderForProperty(propertyName: string, isColorProp: boolean): string {
    if (isColorProp) {
        return "Click to choose color";
    }
    
    // Return appropriate placeholder for non-color properties
    switch (propertyName) {
        case 'translateX':
        case 'translateY':
            return "0px, 50px, 100px";
        case 'opacity':
            return "0, 0.5, 1";
        case 'scale':
            return "0.5, 1, 1.5";
        case 'rotate':
            return "0deg, 45deg, 90deg";
        default:
            return "Enter values separated by commas";
    }
}

/**
 * Get appropriate default value for a property
 * 
 * @param propertyName - CSS property name
 * @param isColorProp - Whether this is a color property
 * @param direction - 'From' or 'To' direction
 * @returns Appropriate default value
 */
function getDefaultValueForProperty(propertyName: string, isColorProp: boolean, direction: 'From' | 'To'): string {
    if (isColorProp) {
        return direction === 'From' ? "#ffffff" : "#000000";
    }
    
    return direction === 'From' ? "0px" : "100px";
}

/**
 * Pattern type options for distributed properties
 * 
 * @description
 * Enum values for pattern type selection in property controls.
 * Only implemented patterns are included.
 * 
 * Future patterns will be added as they're implemented:
 * - "random" (Phase 4)
 * - "grid-aware" (Phase 5)
 */
const PATTERN_TYPE_OPTIONS = [
    "comma-separated",
    "linear-range"
] as const

const PATTERN_TYPE_TITLES = [
    "Comma-Separated Values",
    "Linear Range"
] as const

/**
 * Linear progression options for range patterns
 */
const LINEAR_PROGRESSION_OPTIONS: LinearProgression[] = [
    "linear",
    "linear-reverse",
    "bell-curve", 
    "roof",
    "reverse-roof",
    "ramp-up",
    "ramp-down",
    "ease-in-out",
    "steps",
    "random",
    "cubic-in-out",
    "bounce",
    "elastic",
    "exponential"
] as const

const LINEAR_PROGRESSION_TITLES = [
    "Linear (Min → Max)",
    "Linear Reverse (Max → Min)",
    "Bell Curve (Smooth Peak)",
    "Roof (Sharp Peak)",
    "Reverse Roof (Sharp Valley)",
    "Ramp Up (Slow → Fast)",
    "Ramp Down (Fast → Slow)",
    "Ease In-Out (S-Curve)",
    "Steps (Discrete)",
    "Random (Varied Distribution)",
    "Cubic In-Out (Strong S-Curve)",
    "Bounce (Oscillating)",
    "Elastic (Overshoot Wave)",
    "Exponential (Dramatic)"
] as const

// =======================================
//        NEW UX: SINGLE TOGGLE CONTROLS
// =======================================

/**
 * NEW UX: Generate main distributed values toggle control
 * 
 * @description
 * Single boolean control that switches between simple and distributed modes.
 * Provides logical exclusivity and progressive disclosure.
 * 
 * @param propertyName - Name of the CSS property
 * @returns Framer property control for the main toggle
 */
export function getDistributedToggleControl(propertyName: string): any {
    return {
        type: ControlType.Boolean,
        title: `🎯 Use Distributed ${propertyName} Values`,
        defaultValue: false,
        description: `Enable different ${propertyName} values for each element using patterns`
    }
}

/**
 * NEW UX: Generate simple mode from/to controls
 * 
 * @description
 * Regular from/to controls that are hidden when distributed mode is enabled.
 * Provides clean simple mode experience.
 * 
 * @param propertyName - Name of the CSS property
 * @param direction - 'From' or 'To' values
 * @returns Framer property control object
 */
export function getSimpleModeControl(
    propertyName: string,
    direction: 'From' | 'To'
): any {
    const isFrom = direction === 'From'
    const isColorProp = isColorProperty(propertyName)
    
    return {
        type: getControlTypeForProperty(propertyName),
        title: direction,
        placeholder: isColorProp ? undefined : getPlaceholderForProperty(propertyName, isColorProp),
        defaultValue: getDefaultValueForProperty(propertyName, isColorProp, direction),
        hidden: (props: any) => props[`useDistributed${propertyName}Values`] === true,
        description: `${direction} value for ${propertyName} animation`
    }
}

/**
 * NEW UX: Generate distributed pattern controls
 * 
 * @description
 * Advanced pattern configuration controls that are only shown when distributed mode is enabled.
 * Groups From and To controls into separate nested objects for cleaner UI organization.
 * 
 * @param propertyName - Name of the CSS property
 * @returns Object with grouped distributed pattern controls
 */
export function getDistributedPatternControls(propertyName: string): Record<string, any> {
    const distributedEnabled = (props: any) => props[`useDistributed${propertyName}Values`] === true
    const isColorProp = isColorProperty(propertyName)
    
    return {
        // From values configuration (grouped into object)
        [`distributed${propertyName}From`]: {
            type: ControlType.Object,
            title: "📥 From Values Configuration",
            hidden: (props: any) => !distributedEnabled(props),
            description: "Configure how starting values are distributed across elements",
            controls: {
                pattern: {
                    type: ControlType.Enum,
                    title: "Pattern Type",
                    options: [...PATTERN_TYPE_OPTIONS],
                    optionTitles: [...PATTERN_TYPE_TITLES],
                    defaultValue: "comma-separated",
                    description: "How to generate different starting values"
                },
                
                values: {
                    type: ControlType.String, // Keep as string for comma-separated values even for colors
                    title: isColorProp ? "Colors (Comma-Separated)" : "Values (Comma-Separated)",
                    placeholder: isColorProp ? "#ff0000, #00ff00, #0000ff" : getPlaceholderForProperty(propertyName, false),
                    defaultValue: "",
                    hidden: (props: any) => props.pattern !== "comma-separated",
                    description: isColorProp ? "Color values separated by commas (hex, rgb, or color names)" : "Starting values that cycle through elements",
                    displayTextArea: false
                },
                
                linearRange: {
                    type: ControlType.Object,
                    title: "Range Configuration",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Configure starting value range and progression",
                    controls: {
                        minValue: {
                            type: getControlTypeForProperty(propertyName),
                            title: "Min Value",
                            placeholder: isColorProp ? undefined : "0px",
                            defaultValue: isColorProp ? "#ffffff" : "0px",
                            description: "Starting value of the range"
                        },
                        maxValue: {
                            type: getControlTypeForProperty(propertyName),
                            title: "Max Value", 
                            placeholder: isColorProp ? undefined : "100px",
                            defaultValue: isColorProp ? "#000000" : "100px",
                            description: "Ending value of the range"
                        },
                        progression: {
                            type: ControlType.Enum,
                            title: "Progression",
                            options: [...LINEAR_PROGRESSION_OPTIONS],
                            optionTitles: [...LINEAR_PROGRESSION_TITLES],
                            defaultValue: "linear",
                            description: "How values progress across elements"
                        }
                    }
                }
            }
        },
        
        // To values configuration (grouped into object)
        [`distributed${propertyName}To`]: {
            type: ControlType.Object,
            title: "📤 To Values Configuration",
            hidden: (props: any) => !distributedEnabled(props),
            description: "Configure how ending values are distributed across elements",
            controls: {
                pattern: {
                    type: ControlType.Enum,
                    title: "Pattern Type",
                    options: [...PATTERN_TYPE_OPTIONS],
                    optionTitles: [...PATTERN_TYPE_TITLES],
                    defaultValue: "comma-separated",
                    description: "How to generate different ending values"
                },
                
                values: {
                    type: ControlType.String, // Keep as string for comma-separated values even for colors
                    title: isColorProp ? "Colors (Comma-Separated)" : "Values (Comma-Separated)",
                    placeholder: isColorProp ? "#00ff00, #ffff00, #ff00ff" : "100px, 120px, 140px, 160px",
                    defaultValue: "",
                    hidden: (props: any) => props.pattern !== "comma-separated",
                    description: isColorProp ? "Color values separated by commas (hex, rgb, or color names)" : "Ending values that cycle through elements",
                    displayTextArea: false
                },
                
                linearRange: {
                    type: ControlType.Object,
                    title: "Range Configuration",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Configure ending value range and progression",
                    controls: {
                        minValue: {
                            type: getControlTypeForProperty(propertyName),
                            title: "Min Value",
                            placeholder: isColorProp ? undefined : "100px",
                            defaultValue: isColorProp ? "#ffffff" : "100px",
                            description: "Starting value of the range"
                        },
                        maxValue: {
                            type: getControlTypeForProperty(propertyName),
                            title: "Max Value",
                            placeholder: isColorProp ? undefined : "200px",
                            defaultValue: isColorProp ? "#000000" : "200px",
                            description: "Ending value of the range"
                        },
                        progression: {
                            type: ControlType.Enum,
                            title: "Progression",
                            options: [...LINEAR_PROGRESSION_OPTIONS],
                            optionTitles: [...LINEAR_PROGRESSION_TITLES],
                            defaultValue: "linear",
                            description: "How values progress across elements"
                        }
                    }
                }
            }
        }
    }
}

// =======================================
//         LEGACY SUPPORT (DEPRECATED)
// =======================================

/**
 * LEGACY: Generate distributed property controls (OLD UX)
 * 
 * @deprecated Use getDistributedToggleControl() + getDistributedPatternControls() instead
 * @description
 * Legacy function that created the confusing dual control system.
 * Kept for backward compatibility during transition period.
 * Will be removed in next major version.
 */
export function getDistributedPropertyControls(
    propertyName: string,
    direction: 'From' | 'To'
): Record<string, any> {
    console.warn(`[DistributedPropertyControls] getDistributedPropertyControls() is deprecated. Use new single toggle approach instead.`)
    
    // Return empty object to disable legacy controls
    return {}
}

// =======================================
//           DATA EXTRACTION
// =======================================

/**
 * NEW UX: Extract distributed property configuration from property controls data
 * 
 * @description
 * Updated extraction function for the new nested object UX approach.
 * Handles logical exclusivity between simple and distributed modes.
 * Works with the new grouped control structure.
 * 
 * @param props - Property controls data object
 * @param propertyName - Name of the CSS property
 * @param direction - Whether to extract 'From' or 'To' configuration
 * 
 * @returns DistributedPropertyConfig object or null if not enabled
 */
export function extractDistributedPropertyConfig(
    props: any,
    propertyName: string,
    direction: 'From' | 'To'
): { enabled: boolean; pattern: any } | null {
    
    // Check if distributed mode is enabled for this property
    const isDistributedEnabled = props[`useDistributed${propertyName}Values`] === true
    
    if (!isDistributedEnabled) {
        return null
    }
    
    // Access the nested configuration object
    const configObject = props[`distributed${propertyName}${direction}`]
    
    if (!configObject) {
        console.warn(`[DistributedPropertyControls] No configuration found for distributed${propertyName}${direction}`)
        return null
    }
    
    const patternType = configObject.pattern || "comma-separated"
    
    let pattern: any
    
    switch (patternType) {
        case "comma-separated":
            pattern = {
                type: "comma-separated",
                values: configObject.values || ""
            }
            break
            
        case "linear-range":
            const linearRange = configObject.linearRange || {}
            pattern = {
                type: "linear-range",
                linearRange: {
                    minValue: linearRange.minValue || "0px",
                    maxValue: linearRange.maxValue || "100px",
                    progression: linearRange.progression || "linear"
                }
            }
            break
            
        default:
            console.warn(`[DistributedPropertyControls] Unknown pattern type: ${patternType}`)
            return null
    }
    
    return {
        enabled: true,
        pattern
    };
}

/**
 * Validation helper for distributed property configurations
 * 
 * @description
 * Validates user input for distributed property patterns.
 * Provides helpful error messages for invalid configurations.
 * 
 * @param config - Distributed property configuration to validate
 * @param propertyName - Name of the property being validated (for error messages)
 * 
 * @returns Validation result with success flag and error messages
 * 
 * @validation_rules
 * - Comma-separated: Must have at least one non-empty value
 * - Linear range: Min and max values must be parseable
 * - Pattern type: Must be a supported pattern type
 * 
 * @usage
 * ```typescript
 * const config = extractDistributedPropertyConfig(props, 'translateX', 'From');
 * if (config) {
 *   const validation = validateDistributedPropertyConfig(config, 'translateX');
 *   if (!validation.isValid) {
 *     console.warn('Invalid configuration:', validation.errors);
 *   }
 * }
 * ```
 */
export function validateDistributedPropertyConfig(
    config: { enabled: boolean; pattern: any },
    propertyName: string
): { isValid: boolean; errors: string[] } {
    
    const errors: string[] = [];
    
    if (!config.enabled) {
        return { isValid: true, errors: [] };
    }
    
    if (!config.pattern) {
        errors.push(`Missing pattern configuration for ${propertyName}`);
        return { isValid: false, errors };
    }
    
    switch (config.pattern.type) {
        case "comma-separated":
            if (!config.pattern.values || config.pattern.values.trim() === '') {
                errors.push(`Comma-separated pattern requires at least one value for ${propertyName}`);
            } else {
                const values = config.pattern.values.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '');
                if (values.length === 0) {
                    errors.push(`No valid values found in comma-separated pattern for ${propertyName}`);
                }
            }
            break;
            
        case "linear-range":
            if (!config.pattern.linearRange) {
                errors.push(`Linear range pattern requires range configuration for ${propertyName}`);
            } else {
                const { minValue, maxValue } = config.pattern.linearRange;
                if (!minValue || minValue.trim() === '') {
                    errors.push(`Linear range pattern requires min value for ${propertyName}`);
                }
                if (!maxValue || maxValue.trim() === '') {
                    errors.push(`Linear range pattern requires max value for ${propertyName}`);
                }
            }
            break;
            
        default:
            errors.push(`Unsupported pattern type: ${config.pattern.type} for ${propertyName}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * NEW: Generate distributed property controls for animateProperties array structure
 * 
 * @description
 * Creates distributed property controls with flat config objects (no nested objects inside distributedFromConfig/distributedToConfig).
 * 
 * @returns Object with distributedFromConfig and distributedToConfig (flat fields)
 */
export function createDistributedPropertyArrayControls(): Record<string, any> {
    return {
        distributedFromConfig: {
            type: ControlType.Object,
            title: "📥 From Distributed Config",
            hidden: (props: any) => !props.useDistributedValues,
            description: "Configure how starting values are distributed across elements",
            controls: {
                pattern: {
                    type: ControlType.Enum,
                    title: "Pattern Type",
                    options: [...PATTERN_TYPE_OPTIONS],
                    optionTitles: [...PATTERN_TYPE_TITLES],
                    defaultValue: "comma-separated",
                    description: "How to generate different starting values"
                },
                values: {
                    type: ControlType.String,
                    title: "Values (Comma-Separated)",
                    placeholder: (props: any) => {
                        const property = props.property || 'translateX'
                        switch (property) {
                            case 'translateX':
                            case 'translateY':
                                return "0px, 50px, 100px"
                            case 'opacity':
                                return "0, 0.5, 1"
                            case 'scale':
                                return "0.5, 1, 1.5"
                            case 'rotate':
                                return "0deg, 45deg, 90deg"
                            case 'backgroundColor':
                                return "#ff0000, #00ff00, #0000ff"
                            default:
                                return "Enter values separated by commas"
                        }
                    },
                    defaultValue: "",
                    hidden: (props: any) => props.pattern !== "comma-separated",
                    description: "Starting values that cycle through elements",
                    displayTextArea: false
                },
                minValue: {
                    type: ControlType.String,
                    title: "Min Value",
                    placeholder: "0px",
                    defaultValue: "0px",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Starting value of the range"
                },
                maxValue: {
                    type: ControlType.String,
                    title: "Max Value",
                    placeholder: "100px",
                    defaultValue: "100px",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Ending value of the range"
                },
                progression: {
                    type: ControlType.Enum,
                    title: "Progression",
                    options: [...LINEAR_PROGRESSION_OPTIONS],
                    optionTitles: [...LINEAR_PROGRESSION_TITLES],
                    defaultValue: "linear",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "How values progress across elements"
                }
            }
        },
        distributedToConfig: {
            type: ControlType.Object,
            title: "📤 To Distributed Config",
            hidden: (props: any) => !props.useDistributedValues,
            description: "Configure how ending values are distributed across elements",
            controls: {
                pattern: {
                    type: ControlType.Enum,
                    title: "Pattern Type",
                    options: [...PATTERN_TYPE_OPTIONS],
                    optionTitles: [...PATTERN_TYPE_TITLES],
                    defaultValue: "comma-separated",
                    description: "How to generate different ending values"
                },
                values: {
                    type: ControlType.String,
                    title: "Values (Comma-Separated)",
                    placeholder: (props: any) => {
                        const property = props.property || 'translateX'
                        switch (property) {
                            case 'translateX':
                            case 'translateY':
                                return "100px, 150px, 200px"
                            case 'opacity':
                                return "0.3, 0.7, 1"
                            case 'scale':
                                return "1, 1.2, 1.5"
                            case 'rotate':
                                return "90deg, 180deg, 270deg"
                            case 'backgroundColor':
                                return "#00ff00, #ffff00, #ff00ff"
                            default:
                                return "Enter values separated by commas"
                        }
                    },
                    defaultValue: "",
                    hidden: (props: any) => props.pattern !== "comma-separated",
                    description: "Ending values that cycle through elements",
                    displayTextArea: false
                },
                minValue: {
                    type: ControlType.String,
                    title: "Min Value",
                    placeholder: "100px",
                    defaultValue: "100px",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Starting value of the range"
                },
                maxValue: {
                    type: ControlType.String,
                    title: "Max Value",
                    placeholder: "500px",
                    defaultValue: "500px",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "Ending value of the range"
                },
                progression: {
                    type: ControlType.Enum,
                    title: "Progression",
                    options: [...LINEAR_PROGRESSION_OPTIONS],
                    optionTitles: [...LINEAR_PROGRESSION_TITLES],
                    defaultValue: "linear",
                    hidden: (props: any) => props.pattern !== "linear-range",
                    description: "How values progress across elements"
                }
            }
        }
    }
}

/**
 * Example usage with complete property controls integration
 * 
 * @description
 * Demonstrates how to integrate distributed property controls with existing
 * animation property controls for a complete user experience.
 * 
 * @example
 * ```typescript
 * // Complete property controls with distributed properties
 * export const translateXPropertyControls = {
 *   // Basic property configuration
 *   translateXFrom: {
 *     type: ControlType.String,
 *     title: "From",
 *     defaultValue: "0px",
 *     description: "Starting position"
 *   },
 *   
 *   translateXTo: {
 *     type: ControlType.String,
 *     title: "To",
 *     defaultValue: "100px",
 *     description: "Ending position"
 *   },
 *   
 *   // Distributed property controls (boolean toggle UI)
 *   ...getDistributedPropertyControls('translateX', 'From'),
 *   ...getDistributedPropertyControls('translateX', 'To'),
 *   
 *   // Other property controls (timing, easing, etc.)
 *   translateXDuration: {
 *     type: ControlType.Number,
 *     title: "Duration",
 *     defaultValue: 1000,
 *     min: 0,
 *     max: 5000,
 *     unit: "ms"
 *   }
 * };
 * 
 * // In the component property conversion:
 * const animationProperty = {
 *   property: 'translateX',
 *   from: props.translateXFrom,
 *   to: props.translateXTo,
 *   duration: props.translateXDuration,
 *   
 *   // Add distributed property configurations
 *   distributeFrom: extractDistributedPropertyConfig(props, 'translateX', 'From'),
 *   distributeTo: extractDistributedPropertyConfig(props, 'translateX', 'To')
 * };
 * ```
 */ 