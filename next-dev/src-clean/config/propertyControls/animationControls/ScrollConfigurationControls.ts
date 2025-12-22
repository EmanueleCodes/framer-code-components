/**
 * @file ScrollConfigurationControls.ts
 * @description Scroll configuration property controls for FAME animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @module ScrollConfigurationControls
 * 
 * @description
 * This module provides property controls for scroll-based animation configuration.
 * It handles both trigger element selection and scroll boundaries configuration
 * for scrub-based animations.
 * 
 * @features
 * - Trigger element selection with scope and depth controls
 * - Multiple filter criteria for element targeting
 * - Animation boundaries with start/end positions
 * - Element and viewport position controls
 * 
 * @architecture
 * This is part of the modular refactoring of AnimationSlots.ts:
 * - Extracted from AnimationSlots.ts (Phase 3)
 * - Single responsibility: scroll configuration UI
 * - Clean separation of concerns
 * - Reusable and maintainable
 * 
 * @usage
 * ```typescript
 * import { createScrollConfiguration } from './ScrollConfigurationControls.ts'
 * 
 * const controls = {
 *   ...createScrollConfiguration(),
 *   // other controls...
 * }
 * ```
 * 
 * @integration
 * Used by AnimationSlots.ts main composition function to provide
 * scroll configuration controls when animation paradigm is "scroll-based".
 */

import { ControlType } from "framer"

import {
    ElementScope,
    CriteriaType,
    ScopeDepth,
} from "../../../types/index.ts"

import {
    hasScrollScrubbedAnimation,
} from "./HelperFunctions.ts"

/**
 * Creates scroll configuration property controls
 * 
 * @description
 * Generates the complete scroll configuration UI including:
 * - Trigger element selection controls
 * - Animation boundaries configuration
 * - Element and viewport position controls
 * 
 * This configuration is only visible when the animation paradigm
 * is set to "scroll-based" mode.
 * 
 * @returns Property controls object for scroll configuration
 * 
 * @example
 * ```typescript
 * const scrollControls = createScrollConfiguration()
 * // Returns controls for trigger element selection and boundaries
 * ```
 * 
 * @architectural_note
 * This function encapsulates the complex scroll configuration UI
 * that was previously inline in AnimationSlots.ts. It provides:
 * - Clean separation of scroll-related controls
 * - Reusable configuration logic
 * - Maintainable modular structure
 */
export function createScrollConfiguration() {
    return {
        scrollScrubbedConfig: {
            type: ControlType.Object,
            title: "Scroll settings",
            hidden: (props: any) => !hasScrollScrubbedAnimation(props),
            controls: {
                // Scroll trigger element selection (reuses existing element selection system)
                triggerElement: {
                    type: ControlType.Object,
                    title: "Trigger",
                    controls: {
                        // NEW: Scope selection with improved UX labels
                        scope: {
                            type: ControlType.Enum,
                            title: "Search In",
                            description: "Where to search for the trigger element",
                            options: [
                                ElementScope.SELF,
                                ElementScope.PARENT,
                                ElementScope.CHILDREN,
                                ElementScope.SIBLINGS,
                                ElementScope.DOCUMENT,
                            ],
                            optionTitles: [
                                "Self (Element with FAME in it)",
                                "Parent (Direct parent of Self)",
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

                        // Individual criteria fields (Framer-friendly approach)
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

                // Animation boundaries configuration
                boundaries: {
                    type: ControlType.Object,
                    title: "Boundaries",
                    description: "Define when animation starts and ends",
                    controls: {
                        // Animation start boundary
                        start: {
                            type: ControlType.Object,
                            title: "Start",
                            description: "When animation begins (0% progress)",
                            controls: {
                                element: {
                                    type: ControlType.Number,
                                    title: "Element Position",
                                    description: "Position on trigger element (0% = top, 100% = bottom)",
                                    defaultValue: 0,
                                    min: 0,
                                    max: 100,
                                    step: 1,
                                    unit: "%",
                                    displayStepper: true,
                                },
                                viewport: {
                                    type: ControlType.Number,
                                    title: "Viewport Position", 
                                    description: "Position in viewport (0% = top, 100% = bottom)",
                                    defaultValue: 100,
                                    min: 0,
                                    max: 100,
                                    step: 1,
                                    unit: "%",
                                    displayStepper: true,
                                }
                            }
                        },

                        // Animation end boundary
                        end: {
                            type: ControlType.Object,
                            title: "End",
                            description: "When animation completes (100% progress)",
                            controls: {
                                element: {
                                    type: ControlType.Number,
                                    title: "Element Position",
                                    description: "Position on trigger element (0% = top, 100% = bottom)",
                                    defaultValue: 100,
                                    min: 0,
                                    max: 100,
                                    step: 1,
                                    unit: "%",
                                    displayStepper: true,
                                },
                                viewport: {
                                    type: ControlType.Number,
                                    title: "Viewport Position",
                                    description: "Position in viewport (0% = top, 100% = bottom)",
                                    defaultValue: 0,
                                    min: 0,
                                    max: 100,
                                    step: 1,
                                    unit: "%",
                                    displayStepper: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    }
} 