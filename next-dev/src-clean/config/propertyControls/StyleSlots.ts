/**
 * FAME Animation System - Style Property Controls
 * 
 * @fileOverview Style property controls for Framer UI
 * @version 2.0.0-clean
 * @status ACTIVE - Style slots for static CSS application
 * 
 * @description
 * This component provides the style-focused property controls UI for FAME
 * in Framer. It handles style slot configuration for CSS properties that
 * are applied immediately on component mount (no animation).
 * 
 * Uses InitialValueCoordinator for CSS application - no duplication of functionality.
 * 
 * @key_features
 * - Static CSS property application (no timing/easing)
 * - Smart property controls (color picker for colors, string input for others)
 * - Element targeting using existing AnimatedElement system
 * - CSS validation with error reporting
 * - Reuses ANIMATABLE_PROPERTIES for consistency
 * 
 * @architecture
 * - Reuses element targeting from AnimatedElement
 * - Uses InitialValueCoordinator for CSS application 
 * - Validates CSS using validateCSSProperty from PropertyRegistry
 * - Separate from AnimationSlots (different use case)
 * - Uses the same ANIMATABLE_PROPERTIES as AnimationSlots
 */

import { ControlType } from "framer"
import type { PropertyControls } from "framer"
import {
    ANIMATABLE_PROPERTIES,
    validateCSSProperty,
} from "../properties/PropertyRegistry.ts"
import {
    ElementScope,
    CriteriaType,
    ScopeDepth,
} from "../../types/index.ts"

/**
 * Creates style property controls for a specific property
 * Focus on static CSS values with full CSS flexibility via text inputs
 */
export function createStylePropertyControl(property: any) {
    // For StyleSlots, we want full CSS flexibility, so use text inputs for everything
    // with smart placeholders that guide users on expected syntax
    
    let placeholder = "Enter CSS value...";
    let defaultValue = "";
    
    // Provide helpful placeholders based on property type
    switch (property.name) {
        case "translateX":
        case "translateY":
            placeholder = "e.g. 50px, 10%, calc(100vw - 20px), clamp(10px, 5vw, 100px)";
            defaultValue = "0px";
            break;
        case "rotate":
            placeholder = "e.g. 45deg, 0.5turn, calc(90deg * 2), clamp(0deg, 5deg, 90deg)";
            defaultValue = "0deg";
            break;
        case "scale":
            placeholder = "e.g. 1.2, 0.8, clamp(0.5, 1vw, 2), calc(1 + 0.2)";
            defaultValue = "1";
            break;
        case "skewX":
        case "skewY":
            placeholder = "e.g. 15deg, -10deg, calc(45deg / 2), clamp(0deg, 2deg, 30deg)";
            defaultValue = "0deg";
            break;
        case "opacity":
            placeholder = "e.g. 0.8, calc(0.5 + 0.3), clamp(0.1, 0.5, 1), var(--opacity)";
            defaultValue = "1";
            break;
        case "backgroundColor":
            placeholder = "e.g. #ff0000, rgb(255, 0, 0), hsl(0, 100%, 50%), var(--bg-color)";
            defaultValue = "#ffffff";
            break;
        case "borderRadius":
            placeholder = "e.g. 8px, 50%, clamp(5px, 2vw, 20px), 10px 5px";
            defaultValue = "0px";
            break;
        case "width":
        case "height":
            placeholder = "e.g. 200px, 50%, 100vw, calc(100% - 40px), clamp(200px, 50vw, 800px)";
            defaultValue = "auto";
            break;
        case "fontSize":
            placeholder = "e.g. 16px, 1.2em, 1.5rem, clamp(14px, 4vw, 24px), calc(1rem + 2px)";
            defaultValue = "16px";
            break;
        default:
            placeholder = "e.g. 10px, 50%, calc(100% - 20px), clamp(5px, 2vw, 50px)";
            defaultValue = property.defaultFrom || "";
            break;
    }

    return {
        type: ControlType.Object,
        title: property.title,
        controls: {
            value: {
                type: ControlType.String,
                title: "CSS Value",
                placeholder: placeholder,
                defaultValue: defaultValue,
                description: "Full CSS syntax supported including calc(), clamp(), var(), etc.",
            },
        },
        hidden: (props: any) =>
            !props.activeProperties?.includes(property.name),
    }
}

export function CreateStyleSlotsObject(): { styleSlots: PropertyControls[string] } {
    const stylePropertyControlsMap: Record<string, any> = {}
    ANIMATABLE_PROPERTIES.forEach((property) => {
        stylePropertyControlsMap[property.name] =
            createStylePropertyControl(property)
    })

    return {
        styleSlots: {
            type: ControlType.Array,
            title: "Style Slots",
            description: "Apply CSS styles immediately (no animation)",
            defaultValue: [],
            control: {
                type: ControlType.Object,
                title: "Style Slot",
                controls: {
                    name: {
                        type: ControlType.String,
                        title: "Name",
                        defaultValue: "New Style",
                    },

                    // Target elements configuration (reuse AnimatedElement targeting)
                    targetElements: {
                        type: ControlType.Array,
                        title: "Target Elements",
                        description: "Elements to apply styles to",
                        
                        control: {
                            type: ControlType.Object,
                            title: "Style Target",
                            controls: {
                                // Scope selection
                                scope: {
                                    type: ControlType.Enum,
                                    title: "Search In",
                                    description: "Where to search for elements to style",
                                    options: [
                                        ElementScope.SELF,
                                        ElementScope.PARENT,
                                        ElementScope.CHILDREN,
                                        ElementScope.SIBLINGS,
                                        ElementScope.DOCUMENT,
                                    ],
                                    optionTitles: [
                                        "Self (Component)",
                                        "Parent Element",
                                        "Child Elements",
                                        "Sibling Elements",
                                        "Entire Document",
                                    ],
                                    defaultValue: ElementScope.SELF,
                                },

                                // 🚀 NEW: Depth selection for CHILDREN and SIBLINGS
                                depth: {
                                    type: ControlType.Enum,
                                    title: "Search Depth",
                                    description: "How deep to search within the scope",
                                    options: [
                                        ScopeDepth.DIRECT,
                                        ScopeDepth.DEEP,
                                    ],
                                    optionTitles: [
                                        "Direct Only (Immediate)",
                                        "Deep (All Nested)",
                                    ],
                                    defaultValue: ScopeDepth.DIRECT,
                                    hidden: (props: any) =>
                                        props.scope !== ElementScope.CHILDREN &&
                                        props.scope !== ElementScope.SIBLINGS,
                                },

                                // Filter criteria (same as AnimatedElement)
                                criteriaType1: {
                                    type: ControlType.Enum,
                                    title: "Filter 1 Type",
                                    options: [
                                        "none",
                                        CriteriaType.FRAMER_NAME,
                                        CriteriaType.HTML_TAG,
                                        CriteriaType.CSS_SELECTOR,
                                        CriteriaType.ELEMENT_ID,
                                    ],
                                    optionTitles: [
                                        "No Filter",
                                        "Framer Name",
                                        "HTML Tag",
                                        "CSS Selector",
                                        "Element ID",
                                    ],
                                    defaultValue: "none",
                                    hidden: (props: any) =>
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },

                                criteriaValue1: {
                                    type: ControlType.String,
                                    title: "Filter 1 Value",
                                    placeholder: "Enter filter value...",
                                    defaultValue: "",
                                    hidden: (props: any) =>
                                        props.criteriaType1 === "none" ||
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },

                                // 🚀 NEW: Filter 2 - Match AnimationSlots pattern exactly
                                criteriaType2: {
                                    type: ControlType.Enum,
                                    title: "Filter 2 Type",
                                    options: [
                                        "none",
                                        CriteriaType.FRAMER_NAME,
                                        CriteriaType.HTML_TAG,
                                        CriteriaType.CSS_SELECTOR,
                                        CriteriaType.ELEMENT_ID,
                                    ],
                                    optionTitles: [
                                        "No Filter",
                                        "Framer Name",
                                        "HTML Tag",
                                        "CSS Selector",
                                        "Element ID",
                                    ],
                                    defaultValue: "none",
                                    hidden: (props: any) =>
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },

                                criteriaValue2: {
                                    type: ControlType.String,
                                    title: "Filter 2 Value",
                                    placeholder: "Enter filter value...",
                                    defaultValue: "",
                                    hidden: (props: any) =>
                                        props.criteriaType2 === "none" ||
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },

                                // 🚀 NEW: Filter 3 - Match AnimationSlots pattern exactly
                                criteriaType3: {
                                    type: ControlType.Enum,
                                    title: "Filter 3 Type",
                                    options: [
                                        "none",
                                        CriteriaType.FRAMER_NAME,
                                        CriteriaType.HTML_TAG,
                                        CriteriaType.CSS_SELECTOR,
                                        CriteriaType.ELEMENT_ID,
                                    ],
                                    optionTitles: [
                                        "No Filter",
                                        "Framer Name",
                                        "HTML Tag",
                                        "CSS Selector",
                                        "Element ID",
                                    ],
                                    defaultValue: "none",
                                    hidden: (props: any) =>
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },

                                criteriaValue3: {
                                    type: ControlType.String,
                                    title: "Filter 3 Value",
                                    placeholder: "Enter filter value...",
                                    defaultValue: "",
                                    hidden: (props: any) =>
                                        props.criteriaType3 === "none" ||
                                        props.scope === ElementScope.SELF ||
                                        props.scope === ElementScope.PARENT,
                                },
                            },
                        },
                    },

                    // Property selection using multi-select
                    activeProperties: {
                        type: ControlType.Array,
                        title: "CSS Properties",
                        description: "Select CSS properties to style",
                        control: {
                            type: ControlType.Enum,
                            options: ANIMATABLE_PROPERTIES.map((p) => p.name),
                            optionTitles: ANIMATABLE_PROPERTIES.map(
                                (p) => p.title
                            ),
                        },
                        defaultValue: [],
                    },

                    // Dynamic property controls based on selected properties
                    ...stylePropertyControlsMap,
                },
            },
        },
    }
} 