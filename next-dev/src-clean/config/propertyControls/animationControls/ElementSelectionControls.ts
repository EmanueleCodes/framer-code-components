/**
 * FAME Animation System - Element Selection Controls
 * 
 * @fileOverview Element targeting controls for animation property UI
 * @version 2.0.0-clean
 * @status ACTIVE - Extracted from AnimationSlots.ts during modular refactoring
 * 
 * @description
 * Contains all UI controls for selecting trigger elements (that receive events)
 * and animated elements (that get visually animated). Provides sophisticated
 * element targeting with scope, depth, and criteria-based filtering.
 * 
 * @architecture_role
 * Single responsibility: Generate Framer property controls for element selection.
 * No animation logic, no execution code, just pure UI control generation.
 * 
 * @refactoring_context
 * Extracted during Phase 2 of AnimationSlots.ts modular refactoring.
 * These controls were embedded within the main property controls structure
 * and are now modularized for reuse and maintainability.
 * 
 * @key_features
 * - Trigger element selection (receives events like click, scroll, hover)
 * - Animated element selection (gets visually animated)
 * - Scope-based targeting (self, parent, children, siblings, document)
 * - Depth control (direct vs deep search)
 * - Multi-criteria filtering (Framer name, HTML tag, CSS selector, element ID)
 * - Text processing integration for character/word/line splitting
 * 
 * @usage
 * ```typescript
 * import { createTriggerElementControls, createAnimatedElementControls } from './ElementSelectionControls.ts';
 * 
 * const controls = {
 *   triggers: createTriggerElementControls(),
 *   animatedElements: createAnimatedElementControls()
 * };
 * ```
 * 
 * @dependencies
 * - Types from main types system
 * - Helper functions for visibility logic
 * - No circular dependencies
 */

import { ControlType } from "framer";
import {
    ElementScope,
    CriteriaType,
    ScopeDepth,
    EventType,
    AnimationBehavior,
    ReverseMode,
    TextCanvasFallback,
} from "../../../types/index.ts";

import { isTimeBased } from "./HelperFunctions.ts";

//=======================================
//          TRIGGER ELEMENT CONTROLS
//=======================================

/**
 * Create trigger element selection controls for the triggers array
 * 
 * @description
 * Generates the property controls for the triggers array that handles
 * event-based animation triggers. Each trigger specifies:
 * - Which element receives the event (trigger element)
 * - What event type triggers the animation
 * - How the animation behaves when triggered
 * - Advanced behavior options (override state, reverse mode)
 * 
 * @returns Framer property control object for triggers array
 */
export function createTriggerElementControls() {
    return {
        triggers: {
            type: ControlType.Array,
            title: "Triggers",
            hidden: (props: any) => !isTimeBased(props),
            control: {
                type: ControlType.Object,
                title: "Trigger",
                controls: {
                    event: {
                        type: ControlType.Enum,
                        title: "Event",
                        description: (props: any) => 
                            isLoadEvent(props) 
                                ? "Load events fire when the page finishes loading (no trigger element needed)"
                                : "Event that triggers the animation",
                        options: [
                            EventType.CLICK,
                            EventType.SCROLL,
                            EventType.MOUSE_OVER,
                            EventType.MOUSE_OUT,
                            EventType.MOUSE_ENTER,
                            EventType.MOUSE_LEAVE,
                            EventType.POINTER_DOWN,
                            EventType.POINTER_UP,
                            EventType.LOAD,
                            // 🚀 NEW: Enhanced JavaScript Events (Phase 1)
                            EventType.FOCUS,
                            EventType.BLUR,
                            EventType.KEYDOWN,
                            EventType.KEYUP,
                            EventType.MOUSEDOWN,
                            EventType.MOUSEUP,
                            EventType.TOUCHSTART,
                            EventType.TOUCHEND,
                            EventType.SUBMIT,
                            EventType.SCROLL_DIRECTION_CHANGE,
                        ],
                        optionTitles: [
                            "Click",
                            "Scroll",
                            "Mouse Over",
                            "Mouse Out",
                            "Mouse Enter",
                            "Mouse Leave",
                            "Pointer Down",
                            "Pointer Up",
                            "Load",
                            // 🚀 NEW: Enhanced JavaScript Events (Phase 1)
                            "Focus",
                            "Blur",
                            "Key Down",
                            "Key Up",
                            "Mouse Down",
                            "Mouse Up",
                            "Touch Start",
                            "Touch End",
                            "Submit",
                            "Scroll Direction Change",
                        ],
                        defaultValue: EventType.CLICK,
                    },
                    behavior: {
                        type: ControlType.Enum,
                        title: "Behavior",
                        options: [
                            // 🎯 PHASE 1 - BASIC BEHAVIORS (IMPLEMENTED)
                            AnimationBehavior.PLAY_FORWARD,
                            AnimationBehavior.PLAY_BACKWARD,
                            AnimationBehavior.TOGGLE,

                            // 🚀 PHASE 2 - RESET BEHAVIORS (PLANNED)
                            AnimationBehavior.PLAY_FORWARD_AND_RESET,
                            AnimationBehavior.PLAY_BACKWARD_AND_RESET,

                            // 🔄 PHASE 3 - REVERSE BEHAVIORS (NEW)
                            AnimationBehavior.PLAY_FORWARD_AND_REVERSE,
                            AnimationBehavior.PLAY_BACKWARD_AND_REVERSE,

                            // 🔄 PHASE 4 - LOOP BEHAVIORS (NEW)
                            AnimationBehavior.START_LOOP,
                            AnimationBehavior.STOP_LOOP,

                            // 🔄 PHASE 3 - PING PONG BEHAVIORS (PLANNED)
                            AnimationBehavior.START_PING_PONG,

                            // 🎯 PHASE 5 - CONDITIONAL BEHAVIORS (NEW)
                            AnimationBehavior.DELAYED_TRIGGER,
                        ],
                        optionTitles: [
                            // Phase 1
                            "Play Forward",
                            "Play Backward",
                            "Toggle",

                            // Phase 2
                            "Play Forward & Reset",
                            "Play Backward & Reset",

                            // Phase 3 - Reverse
                            "Play Forward & Reverse",
                            "Play Backward & Reverse",

                            // Phase 4 - Loop
                            "Start Loop",
                            "Stop Loop",

                            // Phase 3 - Ping Pong
                            "Start Ping Pong",

                            // Phase 5 - Conditional
                            "Delayed Trigger",
                        ],
                        defaultValue: AnimationBehavior.PLAY_FORWARD,
                    },

                    // 🎯 NEW: Override State Feature - Advanced behavior control
                    overrideState: {
                        type: ControlType.Boolean,
                        title: "Override State",
                        description:
                            "When at target, jump to opposite state before playing (e.g., Play Backward at 0% → jump to 100% → animate to 0%)",
                        defaultValue: false,
                        // Only show for directional behaviors (not Toggle, which handles this automatically)
                        hidden: (props: any) =>
                            props.behavior === AnimationBehavior.TOGGLE ||
                            props.behavior === AnimationBehavior.START_PING_PONG,
                    },

                    // 🎭 NEW: Reverse Mode Options - Animation direction behavior for reversals
                    reverseMode: {
                        type: ControlType.Enum,
                        title: "Reverse Mode",
                        description:
                            "How reverse animations should behave: Easing Preservation (modern UI) or Time Reversal (physics simulation)",
                        options: [
                            ReverseMode.EASING_PRESERVATION,
                            ReverseMode.TIME_REVERSAL,
                        ],
                        optionTitles: [
                            "Easing Preservation (Default)",
                            "Time Reversal (Legacy)",
                        ],
                        defaultValue: ReverseMode.EASING_PRESERVATION,
                        // Only show for reverse behaviors
                        hidden: (props: any) =>
                            props.behavior !== AnimationBehavior.PLAY_BACKWARD &&
                            props.behavior !== AnimationBehavior.PLAY_FORWARD_AND_REVERSE &&
                            props.behavior !== AnimationBehavior.PLAY_BACKWARD_AND_REVERSE &&
                            props.behavior !== AnimationBehavior.TOGGLE, // Toggle can become reverse
                    },

                    // 🔄 NEW: Loop configuration controls (only shown when behavior is START_LOOP)
                    loopConfig: {
                        type: ControlType.Object,
                        title: "🔄 Loop Configuration",
                        description: "Configure loop behavior settings",
                        hidden: (props: any) => props.behavior !== AnimationBehavior.START_LOOP,
                        controls: {
                            iterations: {
                                type: ControlType.Number,
                                title: "Loop Count",
                                description: "Number of times to repeat (999 for infinite)",
                                defaultValue: 3,
                                min: 1,
                                max: 999,
                                step: 1,
                                displayStepper: true,
                            },
                            behavior: {
                                type: ControlType.Enum,
                                title: "Loop Behavior",
                                description: "What behavior to repeat in each loop",
                                options: [
                                    AnimationBehavior.PLAY_FORWARD,
                                    AnimationBehavior.PLAY_BACKWARD,
                                    AnimationBehavior.TOGGLE,
                                ],
                                optionTitles: [
                                    "Play Forward",
                                    "Play Backward", 
                                    "Toggle",
                                ],
                                defaultValue: AnimationBehavior.PLAY_FORWARD,
                            },
                            delay: {
                                type: ControlType.Number,
                                title: "Loop Delay",
                                description: "Delay between loop iterations in seconds",
                                defaultValue: 0.5,
                                min: 0,
                                max: 10,
                                step: 0.1,
                                unit: "s",
                                displayStepper: true,
                            },
                        },
                    },

                    // 🔄 NEW: Ping-pong configuration controls (only shown when behavior is START_PING_PONG)
                    pingPongConfig: {
                        type: ControlType.Object,
                        title: "🏓 Ping Pong Configuration",
                        description: "Configure ping-pong behavior settings",
                        hidden: (props: any) => props.behavior !== AnimationBehavior.START_PING_PONG,
                        controls: {
                            cycles: {
                                type: ControlType.Number,
                                title: "Ping Pong Cycles",
                                description: "Number of ping-pong cycles (999 for infinite)",
                                defaultValue: 3,
                                min: 1,
                                max: 999,
                                step: 1,
                                displayStepper: true,
                            },
                            reverseMode: {
                                type: ControlType.Enum,
                                title: "Reverse Mode",
                                description: "How reverse motion should behave",
                                options: [
                                    ReverseMode.EASING_PRESERVATION,
                                    ReverseMode.TIME_REVERSAL,
                                ],
                                optionTitles: [
                                    "Easing Preservation",
                                    "Time Reversal",
                                ],
                                defaultValue: ReverseMode.EASING_PRESERVATION,
                            },
                            delay: {
                                type: ControlType.Number,
                                title: "Cycle Delay",
                                description: "Delay between ping-pong cycles in seconds",
                                defaultValue: 0.5,
                                min: 0,
                                max: 10,
                                step: 0.1,
                                unit: "s",
                                displayStepper: true,
                            },
                        },
                    },

                    // 🎯 NEW: Delayed trigger configuration controls (only shown when behavior is DELAYED_TRIGGER)
                    delayedTriggerConfig: {
                        type: ControlType.Object,
                        title: "⏱️ Delayed Trigger Configuration",
                        description: "Configure delayed trigger behavior with simple skip count or advanced patterns",
                        hidden: (props: any) => props.behavior !== AnimationBehavior.DELAYED_TRIGGER,
                        controls: {
                            mode: {
                                type: ControlType.Enum,
                                title: "Mode",
                                description: "Simple skip count or advanced pattern mode",
                                options: ["simple", "pattern"],
                                optionTitles: ["Simple Skip Count", "Advanced Pattern"],
                                defaultValue: "simple",
                            },
                            skipCount: {
                                type: ControlType.Number,
                                title: "Skip Count",
                                description: "Number of triggers to skip before executing (0 = execute on 1st, 3 = execute on 4th)",
                                defaultValue: 3,
                                min: 0,
                                max: 20,
                                step: 1,
                                displayStepper: true,
                                hidden: (props: any) => props.mode === "pattern",
                            },
                            pattern: {
                                type: ControlType.String,
                                title: "Pattern",
                                description: "Pattern like '0,0,1,0,1' where 0=ignore, 1=execute (repeats)",
                                placeholder: "e.g., 0,0,1,0,1",
                                defaultValue: "0,0,1",
                                hidden: (props: any) => props.mode !== "pattern",
                            },
                            behavior: {
                                type: ControlType.Enum,
                                title: "Target Behavior",
                                description: "Behavior to execute when trigger should fire",
                                options: [
                                    AnimationBehavior.PLAY_FORWARD,
                                    AnimationBehavior.PLAY_BACKWARD,
                                    AnimationBehavior.TOGGLE,
                                    AnimationBehavior.PLAY_FORWARD_AND_REVERSE,
                                    AnimationBehavior.PLAY_BACKWARD_AND_REVERSE,
                                ],
                                optionTitles: [
                                    "Play Forward",
                                    "Play Backward",
                                    "Toggle",
                                    "Play Forward & Reverse",
                                    "Play Backward & Reverse",
                                ],
                                defaultValue: AnimationBehavior.PLAY_FORWARD,
                            },
                        },
                    },

                    // 🎯 NEW: Scroll-specific threshold controls (only shown when event is scroll)
                    scrollThresholds: {
                        type: ControlType.Object,
                        title: "🌊 Scroll Trigger Settings",
                        description: "Configure one-shot scroll trigger thresholds",
                        hidden: (props: any) => props.event !== EventType.SCROLL,
                        controls: {
                            elementStart: {
                                type: ControlType.Number,
                                title: "Element Trigger Point",
                                description: "Point on element that triggers animation (0% = top, 100% = bottom)",
                                defaultValue: 0,
                                min: 0,
                                max: 100,
                                step: 5,
                                unit: "%",
                                displayStepper: true,
                            },
                            
                            viewportThreshold: {
                                type: ControlType.Number,
                                title: "Viewport Threshold",
                                description: "Viewport position when trigger fires (0% = top, 100% = bottom)",
                                defaultValue: 80,
                                min: 0,
                                max: 100,
                                step: 5,
                                unit: "%",
                                displayStepper: true,
                            },
                            
                            thresholdCrossedBackward: {
                                type: ControlType.Enum,
                                title: "Reverse Behavior",
                                description: "What happens when scrolling back above threshold",
                                options: [
                                    "none",
                                    "reverse", 
                                    "reset",
                                    "complete",
                                ],
                                optionTitles: [
                                    "Do Nothing (Remove Listener)",
                                    "Reverse Animation",
                                    "Reset to Start",
                                    "Jump to End",
                                ],
                                defaultValue: "none",
                            },
                        },
                    },

                    targetElement: {
                        ...createElementSelectionControls("Trigger Element"),
                        hidden: (props: any) => isLoadEvent(props),
                    },
                },
            },
        },
    };
}

/**
 * 🚨 NEW: Helper function to check if event type is LOAD
 * Used to conditionally hide trigger element selection for load events
 */
function isLoadEvent(props: any): boolean {
    return props.event === EventType.LOAD;
}

//=======================================
//          ANIMATED ELEMENT CONTROLS
//=======================================

/**
 * Create animated element selection controls for the animatedElements array
 * 
 * @description
 * Generates the property controls for the animatedElements array that specifies
 * which elements get visually animated. Includes text processing integration
 * for advanced text animations with character/word/line splitting.
 * 
 * @returns Framer property control object for animated elements array
 */
export function createAnimatedElementControls() {
    return {
        animatedElements: {
            type: ControlType.Array,
            title: "Targets",
            
            control: {
                type: ControlType.Object,
                title: "Animation Target",
                controls: {
                    // Base element selection (now includes individual trigger option)
                    ...createElementSelectionControls("Animation Target").controls,

                    // 🎨 FEATURE 2B: Text Processing Controls (Phase 2.1) - Line Masking System
                    textProcessingEnabled: {
                        type: ControlType.Boolean,
                        title: "Enable Text Processing",
                        description: "Split text into characters/words/lines for advanced text animations",
                        defaultValue: false,
                    },

                    textProcessingConfig: {
                        type: ControlType.Object,
                        title: "Text Processing Settings",
                        hidden: (props: any) => !props.textProcessingEnabled,
                        controls: {
                            animateBy: {
                                type: ControlType.Enum,
                                title: "Animate by",
                                description: "How to split the text for animation",
                                options: [
                                    "characters",
                                    "words",
                                    "lines"
                                ],
                                optionTitles: [
                                    "Characters",
                                    "Words",
                                    "Lines"
                                ],
                                defaultValue: "characters",
                            },

                            maskLines: {
                                type: ControlType.Boolean,
                                title: "Mask Lines",
                                description: "Wrap lines in overflow containers for reveal effects",
                                defaultValue: false,
                            },

                            // Canvas mode configuration (simplified)
                            canvasMode: {
                                type: ControlType.Object,
                                title: "Canvas Mode Settings",
                                controls: {
                                    enableInCanvas: {
                                        type: ControlType.Boolean,
                                        title: "Enable in Canvas",
                                        description: "Allow text processing in Framer Canvas mode",
                                        defaultValue: true,
                                    },

                                    fallbackBehavior: {
                                        type: ControlType.Enum,
                                        title: "Canvas Fallback",
                                        description: "What to do when Canvas mode limits are hit",
                                        options: [
                                            TextCanvasFallback.ANIMATE_CONTAINER,
                                            TextCanvasFallback.SKIP_WITH_WARNING,
                                            TextCanvasFallback.SIMPLIFIED_SPLIT,
                                        ],
                                        optionTitles: [
                                            "Animate Container Element",
                                            "Skip Animation (Show Warning)",
                                            "Use Simplified Splitting",
                                        ],
                                        defaultValue: TextCanvasFallback.ANIMATE_CONTAINER,
                                        hidden: (props: any) => !props.enableInCanvas,
                                    },

                                    maxTextLength: {
                                        type: ControlType.Number,
                                        title: "Max Text Length",
                                        description: "Maximum characters to process in Canvas mode",
                                        min: 50,
                                        max: 1000,
                                        step: 50,
                                        defaultValue: 500,
                                        displayStepper: true,
                                        hidden: (props: any) => !props.enableInCanvas,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

//=======================================
//          SHARED ELEMENT SELECTION CORE
//=======================================

/**
 * Create base element selection controls (shared by trigger and animated elements)
 * 
 * @param title - Display title for the element selection control
 * @description
 * Generates the core element selection UI that's shared between trigger
 * and animated element controls. Provides scope, depth, and criteria-based
 * element targeting with sophisticated filtering options.
 * 
 * @returns Framer property control object for element selection
 */
function createElementSelectionControls(title: string) {
    return {
        type: ControlType.Object,
        title: title,
        controls: {
            // NEW: Scope selection with improved UX labels including individual trigger support
            scope: {
                type: ControlType.Enum,
                title: "Search In",
                description: "Where to search for elements to animate",
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
        
    };
} 