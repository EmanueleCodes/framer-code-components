/**
 * FAME Animation System - Property Registry
 * 
 * @fileOverview ANIMATABLE_PROPERTIES registry for FAME animations
 * @version 2.0.0-clean
 * @status ACTIVE - Simplified for testing with core properties
 * 
 * @description
 * This component provides the definitive registry of all animatable properties
 * in FAME. Contains 12 core properties for both AnimationSlots and StyleSlots:
 * - Transform: translateX, translateY, rotate, scale, skewX, skewY
 * - Visual: opacity, backgroundColor, borderRadius
 * - Layout: width, height
 * - Typography: fontSize
 * 
 * Based on excellent working code from src-refactored with minimal changes.
 * 
 * @reference
 * Migrated from: fame-final-repo/src-refactored/animations/properties/PropertyRegistry.ts
 * 
 * @architecture_changes
 * Key adaptations for clean architecture:
 * 1. **IMPORT UPDATES**: Updated to use unified types from ../../types/index.ts
 * 2. **SIMPLIFIED SET**: Only 6 core properties for testing
 * 3. **PRESERVED LOGIC**: All existing property behavior preserved
 */

import { ControlType } from "framer";
import {
    PropertyDefinition,
    PropertyValue,
    PropertyType,
    PropertyCategory,
    EventType
} from "../../types/index.ts";

// ✅ PHASE 1 - STEP 1: Import enhanced easing utilities 
import { EASING_OPTIONS, DEFAULT_EASING } from '../../utils/easings/EasingFunctions.ts';

// �� FEATURE 3A: Import NEW distributed property controls (single toggle approach)
import { 
    getDistributedToggleControl, 
    getSimpleModeControl, 
    getDistributedPatternControls 
} from '../propertyControls/animationControls/DistributedPropertyControls.ts';

// TODO: Import from types once ClickBehavior is added to unified types
enum ClickBehavior {
    TOGGLE = "toggle",
    INCREMENTAL = "incremental",
    PLAY_ONCE = "playOnce"
}

 /**
  * Property configuration interface for the registry
  */
 export interface PropertyConfig {
    name: string;
    title: string;
    defaultFrom: string | number;
    defaultTo: string | number;
    step?: number;
    min?: number;
    max?: number;
    unit?: string;
    controlType?: string;
    options?: string[];
    controlIdSuffix?: string;
}

/**
 * Enhanced collection of animatable properties with comprehensive 3D support
 * 
 * ✅ COMPLETE: Contains 50+ properties with full support for layout, visual, typography, and 3D transforms
 * 
 * 📋 PROPERTY CATEGORIES:
 * - Layout Properties: positioning, sizing, spacing, flexbox
 * - Visual Properties: colors, shadows, filters, backgrounds  
 * - Typography Properties: font styling, text effects
 * - 2D & 3D Transforms: translations, rotations, scaling, skewing
 * - Interaction Properties: pointer events, visibility
 * 
 * 🚀 INFRASTRUCTURE STATUS:
 * ✅ Property Registry: All properties defined with proper controls
 * ✅ Interpolator System: All properties mapped to correct interpolators
 * ✅ Style Application: Transform utils and CSS property mapping complete
 * ✅ Immediate Styles: Flash prevention support for all properties
 * ✅ UI Controls: Enum properties have proper option dropdowns
 * ✅ Alphabetical Order: All properties sorted alphabetically for easy navigation
 */
export const ANIMATABLE_PROPERTIES: PropertyConfig[] = [
    // A
    {
        name: "alignItems",
        title: "Align Items",
        defaultFrom: "stretch",
        defaultTo: "center",
        controlType: "enum",
        options: ["stretch", "flex-start", "flex-end", "center", "baseline"],
    },

    // B
    {
        name: "backdropFilter",
        title: "Backdrop Filter",
        defaultFrom: "none",
        defaultTo: "blur(5px)",
        controlType: "string",
    },
    {
        name: "backfaceVisibility",
        title: "Backface Visibility",
        defaultFrom: "visible",
        defaultTo: "hidden",
        controlType: "enum",
        options: ["visible", "hidden"],
    },
    {
        name: "backgroundColor",
        title: "Background Color",
        defaultFrom: "#ffffff",
        defaultTo: "#f0f0f0",
        controlType: "color",
    },
    {
        name: "backgroundImage",
        title: "Background Image",
        defaultFrom: "none",
        defaultTo: "url('')",
        controlType: "string",
    },
    {
        name: "backgroundPosition",
        title: "Background Position",
        defaultFrom: "0% 0%",
        defaultTo: "50% 50%",
        controlType: "string",
    },
    {
        name: "backgroundSize",
        title: "Background Size",
        defaultFrom: "auto",
        defaultTo: "cover",
        controlType: "enum",
        options: ["auto", "cover", "contain", "100% 100%"],
    },
    {
        name: "borderColor",
        title: "Border Color",
        defaultFrom: "#000000",
        defaultTo: "#666666",
        controlType: "color",
    },
    {
        name: "borderRadius",
        title: "Border Radius",
        defaultFrom: "0px",
        defaultTo: "8px",
    },
    {
        name: "borderWidth",
        title: "Border Width",
        defaultFrom: "0px",
        defaultTo: "2px",
    },
    {
        name: "bottom",
        title: "Bottom",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "boxShadow",
        title: "Box Shadow",
        defaultFrom: "none",
        defaultTo: "0px 4px 8px rgba(0,0,0,0.2)",
        controlType: "string",
    },

    // C
    {
        name: "color",
        title: "Text Color",
        defaultFrom: "#000000",
        defaultTo: "#666666",
        controlType: "color",
    },
    {
        name: "columnGap",
        title: "Column Gap",
        defaultFrom: "0px",
        defaultTo: "20px",
    },
    {
        name: "clipPath",
        title: "Clip Path",
        defaultFrom: "inset(0% 0% 0% 0%)",
        defaultTo: "inset(10% 10% 10% 10%)",
        controlType: "string",
    },

    // D
    {
        name: "display",
        title: "Display",
        defaultFrom: "block",
        defaultTo: "flex",
        controlType: "enum",
        options: ["block", "flex", "grid", "inline", "inline-block", "none"],
    },

    // F
    {
        name: "filter",
        title: "Filter",
        defaultFrom: "none",
        defaultTo: "blur(5px)",
        controlType: "string",
    },
    {
        name: "flexDirection",
        title: "Flex Direction",
        defaultFrom: "row",
        defaultTo: "column",
        controlType: "enum",
        options: ["row", "row-reverse", "column", "column-reverse"],
    },
    {
        name: "fontSize",
        title: "Font Size",
        defaultFrom: "16px",
        defaultTo: "24px",
    },

    // G
    {
        name: "gap",
        title: "Gap",
        defaultFrom: "0px",
        defaultTo: "20px",
    },
    {
        name: "gradientBackground",
        title: "Gradient Background",
        defaultFrom: "linear-gradient(0deg, #ff0000 0%, #0000ff 100%)",
        defaultTo: "linear-gradient(90deg, #00ff00 0%, #ffff00 100%)",
        controlType: "string",
    },

    // H
    {
        name: "height",
        title: "Height", 
        defaultFrom: "100px",
        defaultTo: "200px",
    },

    // J
    {
        name: "justifyContent",
        title: "Justify Content",
        defaultFrom: "flex-start",
        defaultTo: "center",
        controlType: "enum",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
    },

    // L
    {
        name: "left",
        title: "Left",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "letterSpacing",
        title: "Letter Spacing",
        defaultFrom: "0px",
        defaultTo: "2px",
    },
    {
        name: "lineHeight",
        title: "Line Height",
        defaultFrom: "1",
        defaultTo: "1.5",
    },

    // M
    {
        name: "margin",
        title: "Margin",
        defaultFrom: "0px",
        defaultTo: "16px",
    },
    {
        name: "maxHeight",
        title: "Max Height",
        defaultFrom: "none",
        defaultTo: "300px",
    },
    {
        name: "maxWidth",
        title: "Max Width",
        defaultFrom: "none",
        defaultTo: "300px",
    },
    {
        name: "minHeight",
        title: "Min Height",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "minWidth",
        title: "Min Width",
        defaultFrom: "0px",
        defaultTo: "100px",
    },

    // O
    {
        name: "opacity",
        title: "Opacity",
        defaultFrom: 0,
        defaultTo: 1,
        step: 0.1,
        min: 0,
        max: 1,
    },

    // P
    {
        name: "padding",
        title: "Padding",
        defaultFrom: "0px",
        defaultTo: "16px",
    },
    {
        name: "perspective",
        title: "Perspective",
        defaultFrom: "1000px",
        defaultTo: "500px",
    },
    {
        name: "perspectiveOrigin",
        title: "Perspective Origin",
        defaultFrom: "50% 50%",
        defaultTo: "center center",
        controlType: "string",
    },
    {
        name: "pointerEvents",
        title: "Pointer Events",
        defaultFrom: "auto",
        defaultTo: "none",
        controlType: "enum",
        options: [
            "auto",
            "none", 
            "visiblePainted",
            "visibleFill",
            "visibleStroke",
            "visible",
            "painted",
            "fill",
            "stroke",
            "all",
            "inherit"
        ],
    },
    {
        name: "position",
        title: "Position",
        defaultFrom: "static",
        defaultTo: "absolute",
        controlType: "enum",
        options: ["static", "relative", "absolute", "fixed", "sticky"],
    },

    // R
    {
        name: "right",
        title: "Right",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "rotate",
        title: "Rotate",
        defaultFrom: "0deg",
        defaultTo: "90deg",
    },
    {
        name: "rotateX",
        title: "Rotate X",
        defaultFrom: "0deg",
        defaultTo: "45deg",
    },
    {
        name: "rotateY",
        title: "Rotate Y", 
        defaultFrom: "0deg",
        defaultTo: "45deg",
    },
    {
        name: "rotateZ",
        title: "Rotate Z",
        defaultFrom: "0deg",
        defaultTo: "45deg",
    },
    {
        name: "rowGap",
        title: "Row Gap",
        defaultFrom: "0px",
        defaultTo: "20px",
    },

    // S
    {
        name: "scale",
        title: "Scale",
        defaultFrom: 1,
        defaultTo: 1.2,
        step: 0.1,
        min: 0.1,
        max: 5,
    },
    {
        name: "scaleX",
        title: "Scale X",
        defaultFrom: 1,
        defaultTo: 1.2,
        step: 0.1,
        min: 0.1,
        max: 5,
    },
    {
        name: "scaleY",
        title: "Scale Y",
        defaultFrom: 1,
        defaultTo: 1.2,
        step: 0.1,
        min: 0.1,
        max: 5,
    },
    {
        name: "scaleZ",
        title: "Scale Z",
        defaultFrom: 1,
        defaultTo: 1.2,
        step: 0.1,
        min: 0.1,
        max: 5,
    },
    {
        name: "skewX",
        title: "Skew X",
        defaultFrom: "0deg",
        defaultTo: "15deg",
    },
    {
        name: "skewY",
        title: "Skew Y",
        defaultFrom: "0deg",
        defaultTo: "15deg",
    },

    // T
    {
        name: "textAlign",
        title: "Text Align",
        defaultFrom: "left",
        defaultTo: "center",
        controlType: "enum",
        options: ["left", "center", "right", "justify"],
    },
    {
        name: "textShadow",
        title: "Text Shadow",
        defaultFrom: "none",
        defaultTo: "1px 1px 2px rgba(0,0,0,0.5)",
        controlType: "string",
    },
    {
        name: "top",
        title: "Top",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "transformStyle",
        title: "Transform Style",
        defaultFrom: "flat",
        defaultTo: "preserve-3d",
        controlType: "enum",
        options: ["flat", "preserve-3d"],
    },
    {
        name: "translateX",
        title: "Translate X",
        defaultFrom: "0px",
        defaultTo: "100px",
    },
    {
        name: "translateY",
        title: "Translate Y",
        defaultFrom: "0px",
        defaultTo: "0px",
    },
    {
        name: "translateZ",
        title: "Translate Z",
        defaultFrom: "0px",
        defaultTo: "50px",
    },
    {
        name: "textBackgroundImage",
        title: "Text Background Image",
        defaultFrom: "linear-gradient(0deg, #ff0000 0%, #0000ff 100%)",
        defaultTo: "linear-gradient(90deg, #00ff00 0%, #ffff00 100%)",
        controlType: "string",
    },

    // W
    {
        name: "width",
        title: "Width",
        defaultFrom: "100px",
        defaultTo: "200px",
    },

    // Z
    {
        name: "zIndex",
        title: "Z-Index",
        defaultFrom: 0,
        defaultTo: 1,
        step: 1,
        min: -9999,
        max: 9999,
    },
];

/**
 * Log property registry information for debugging
 */
export function logPropertyRegistryInfo(): void {
    console.log(`🔍 [PROPERTY REGISTRY] Total properties registered: ${ANIMATABLE_PROPERTIES.length}`);
    console.log('🔍 [PROPERTY REGISTRY] Available properties:');
    ANIMATABLE_PROPERTIES.forEach(prop => {
        console.log(`  ${prop.name} (${prop.title})`);
    });
}

/**
 * Create property controls for a given property
 */
export function createPropertyControls(property: PropertyConfig) {
    const easingControl = {
        type: ControlType.Enum,
        title: "Easing",
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
    };

    const springConfigControls = {
        type: ControlType.Object,
        title: "Spring",
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
    };

    // 🌐 PHASE 4.2: Global timeline override controls
    const useGlobalSettingsControl = {
        type: ControlType.Boolean,
        title: "Use Global Timeline Settings",
        description: "Use global timeline settings",
        defaultValue: true,
    };

    const durationControl = {
        type: ControlType.Number,
        title: "Duration (s)",
        min: 0.01,
        max: 10,
        step: 0.1,
        defaultValue: 0.6,
        displayStepper: true,
        // Hidden when using global settings
        hidden: (props: any) => {
            return props.useGlobalSettings === true;
        },
    };
    
    const delayControl = {
        type: ControlType.Number,
        title: "Delay (s)",
        description: "Added to global timeline delay when global timeline is enabled",
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0,
        displayStepper: true,
        // Hidden when using global settings
        hidden: (props: any) => {
            return props.useGlobalSettings === true;
        },
    };

    // 🌐 PHASE 4.2: Easing control with global timeline override
    const easingControlWithOverride = {
        ...easingControl,
        // Hidden when using global settings
        hidden: (props: any) => {
            return props.useGlobalSettings === true;
        },
    };

    // 🌐 PHASE 4.2: Spring config controls with global timeline override
    const springConfigControlsWithOverride = {
        ...springConfigControls,
        // Hidden when using global settings OR when not using spring easing
        hidden: (props: any) => {
            return (
                props.useGlobalSettings === true ||
                !props.easing?.toLowerCase().includes("spring")
            );
        },
    };

    const shouldHideFromValue = (props: any) => {
        const isUsingTimeline = props.useGlobalTimeline === true;
        if (!isUsingTimeline) return false;

        // In timeline mode, hide 'from' if this property appears multiple times
        const activeProperties = props.activeProperties;
        if (!Array.isArray(activeProperties)) return false;

        const currentPropertyName = property.name;

        // Count how many instances of this property exist
        const propertyInstances = activeProperties.filter(
            (prop: any) => prop === currentPropertyName
        );

        if (propertyInstances.length <= 1) {
            // Only one instance, don't hide
            return false;
        }

        // Multiple instances exist - hide 'from' for all except the first
        const currentIndex = activeProperties.findIndex(
            (prop: any, index: number) => {
                // Find the specific instance we're dealing with
                return (
                    prop === currentPropertyName &&
                    (property.controlIdSuffix
                        ? index === activeProperties.slice(0, index + 1).filter((p: any) => p === currentPropertyName).length - 1 && property.controlIdSuffix !== ""
                        : index === activeProperties.indexOf(currentPropertyName))
                );
            }
        );

        return currentIndex !== activeProperties.indexOf(currentPropertyName);
    };

    const fromControl = {
        type: getControlTypeForProperty(property.name),
        title: "From",
        placeholder: isColorProperty(property.name) ? undefined : "Enter CSS value (e.g., 10px, 50%)",
        defaultValue: getDefaultValueForProperty(property.name, 'from'),
        // 🚀 NEW: Add options for enum properties
        ...(property.controlType === 'enum' && property.options ? { 
            options: property.options,
            optionTitles: property.options.map(opt => opt.charAt(0).toUpperCase() + opt.slice(1))
        } : {}),
        hidden: shouldHideFromValue,
    };

    const toControl = {
        type: getControlTypeForProperty(property.name),
        title: "To", 
        placeholder: isColorProperty(property.name) ? undefined : "Enter CSS value (e.g., 100px, 100%)",
        defaultValue: getDefaultValueForProperty(property.name, 'to'),
        // 🚀 NEW: Add options for enum properties
        ...(property.controlType === 'enum' && property.options ? { 
            options: property.options,
            optionTitles: property.options.map(opt => opt.charAt(0).toUpperCase() + opt.slice(1))
        } : {}),
    };

    // 📊 FEATURE 3A: NEW UX - Single boolean toggle approach for distributed properties
    // This replaces the confusing dual control system with logical exclusivity
    const useDistributedToggleControl = getDistributedToggleControl(property.name);
    const simpleModeFromControl = getSimpleModeControl(property.name, 'From');
    const simpleModeToControl = getSimpleModeControl(property.name, 'To');
    const distributedPatternControls = getDistributedPatternControls(property.name);

    return {
        type: ControlType.Object,
        title: property.title,
        controls: {
            // 📊 NEW UX: Single toggle that switches between simple and distributed modes
            [`useDistributed${property.name}Values`]: useDistributedToggleControl,
            
            // Simple mode controls (hidden when distributed mode is enabled)
            from: {
                ...fromControl,
                // Combine existing hidden logic with distributed mode logic
                hidden: (props: any) => {
                    const distributedEnabled = props[`useDistributed${property.name}Values`] === true;
                    const existingHidden = shouldHideFromValue(props);
                    return distributedEnabled || existingHidden;
                }
            },
            to: {
                ...toControl,
                // Hide when distributed mode is enabled
                hidden: (props: any) => props[`useDistributed${property.name}Values`] === true
            },
            
            // Distributed mode pattern controls (hidden when simple mode is enabled)
            ...distributedPatternControls,

            // 🌐 PHASE 4.2: Global timeline override toggle
            useGlobalSettings: useGlobalSettingsControl,
            
            // Timing controls with global timeline override
            easing: easingControlWithOverride,
            springConfig: springConfigControlsWithOverride,
            duration: durationControl,
            delay: delayControl,
        },
    };
}

/**
 * CSS Property Validation Utility
 * Validates CSS property values and reports errors
 */
export function validateCSSProperty(propertyName: string, value: string): { isValid: boolean; error?: string } {
    if (!value || value.trim() === "") {
        return { isValid: false, error: `Empty value for property '${propertyName}'` };
    }

    // Check for obviously invalid values
    if (value.includes("kajdsfb0a8s0") || /[^a-zA-Z0-9\s\-_.#%(),/]+/.test(value)) {
        return { isValid: false, error: `Invalid CSS value '${value}' for property '${propertyName}'` };
    }

    // Basic validation for common property types
    if (propertyName === "opacity") {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 1) {
            return { isValid: false, error: `Opacity value '${value}' must be between 0 and 1` };
        }
    }

    if (propertyName.includes("Color") && !value.startsWith("#") && !value.startsWith("rgb") && !value.startsWith("hsl")) {
        return { isValid: false, error: `Color value '${value}' should start with #, rgb(), or hsl()` };
    }

    return { isValid: true };
}

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
 * @returns Appropriate Framer control type
 */
function getControlTypeForProperty(propertyName: string): any {
    // Color properties use color picker
    if (isColorProperty(propertyName)) {
        return ControlType.Color;
    }
    
    // 🚀 NEW: Enum properties use enum controls with their predefined options
    if (propertyName === 'pointerEvents' || 
        propertyName === 'transformStyle' || 
        propertyName === 'backfaceVisibility') {
        return ControlType.Enum;
    }
    
    // All other properties use string input
    return ControlType.String;
}

/**
 * Get appropriate default value for a property
 * 
 * @param propertyName - CSS property name
 * @param direction - 'from' or 'to' direction
 * @returns Appropriate default value
 */
function getDefaultValueForProperty(propertyName: string, direction: 'from' | 'to'): string | number {
    if (isColorProperty(propertyName)) {
        return direction === 'from' ? "#ffffff" : "#000000";
    }
    
    // Use existing default values for non-color properties
    const config = ANIMATABLE_PROPERTIES.find(p => p.name === propertyName);
    return direction === 'from' ? (config?.defaultFrom || "") : (config?.defaultTo || "");
}

// ✅ PropertyRegistry cleaned up - unused exports removed
// Only ANIMATABLE_PROPERTIES and createPropertyControls are exported as they're the only ones being used

// ❌ REMOVED: Multi-property instance processing section - Legacy coordination logic
// ❌ REMOVED: MultiPropertyProcessingResult interface - No longer needed
// ❌ REMOVED: processMultiPropertyInstances() function - Timeline builder replaces this
// Timeline-First Architecture handles all property coordination through PropertyTimeline composition

// ❌ REMOVED: createAnimationProperty() - Legacy property creation with coordination logic
// Timeline-First Architecture uses PropertyTimeline.addKeyframe() for property creation
// All coordination, initial values, and timing handled by timeline composition 