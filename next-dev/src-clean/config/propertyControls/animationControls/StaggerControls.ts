/**
 * @file StaggerControls.ts
 * @description Stagger configuration property controls for FAME animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @module StaggerControls
 * 
 * @description
 * This module provides property controls for both regular and scroll-based stagger configurations.
 * It handles linear stagger, grid stagger, and scroll-specific stagger modes with comprehensive
 * configuration options.
 * 
 * @features
 * - Regular stagger controls (linear and grid strategies)
 * - Advanced grid configurations with multiple modes
 * - Scroll stagger controls (scrubbed and threshold modes)
 * - Order configuration for directional animations
 * - Advanced options with visibility logic
 * 
 * @architecture
 * This is part of the modular refactoring of AnimationSlots.ts:
 * - Extracted from AnimationSlots.ts (Phase 4)
 * - Single responsibility: stagger configuration UI
 * - Clean separation of concerns
 * - Reusable and maintainable
 * 
 * @usage
 * ```typescript
 * import { createRegularStaggerControls, createScrollStaggerControls } from './StaggerControls.ts'
 * 
 * const controls = {
 *   ...createRegularStaggerControls(),
 *   ...createScrollStaggerControls(),
 *   // other controls...
 * }
 * ```
 * 
 * @integration
 * Used by AnimationSlots.ts main composition function to provide
 * stagger configuration controls for both time-based and scroll-based animations.
 */

import { ControlType } from "framer"

import {
    ElementScope,
    InterruptBehavior,
} from "../../../types/index.ts"

import {
    shouldShowRegularStagger,
    shouldShowScrollStagger,
    isScrollBased,
} from "./HelperFunctions.ts"

/**
 * Creates regular stagger configuration property controls
 * 
 * @description
 * Generates comprehensive stagger controls for time-based animations including:
 * - Basic stagger enable toggle
 * - Linear vs grid strategy selection
 * - Order configuration for directional animations
 * - Advanced grid configurations with multiple modes
 * - Random seed for consistent randomization
 * 
 * These controls are visible when animation paradigm is "time-based"
 * and stagger is enabled.
 * 
 * @returns Property controls object for regular stagger configuration
 * 
 * @example
 * ```typescript
 * const staggerControls = createRegularStaggerControls()
 * // Returns controls for comprehensive stagger configuration
 * ```
 * 
 * @architectural_note
 * This function encapsulates complex stagger UI logic including:
 * - Strategy-based conditional visibility
 * - Grid mode selections with origin points
 * - Advanced options with proper hiding logic
 * - Linear order configurations
 */
export function createRegularStaggerControls() {
    return {
        // 🎯 SIMPLE STAGGER: Basic toggle and configuration only
        staggerEnabled: {
            type: ControlType.Boolean,
            title: "Enable Stagger",
            defaultValue: false,
            // hidden: (props: any) => {
            //     // Hide when only self is targeted (no point in staggering single element)
            //     const hasMultipleTargets = props.animatedElements && 
            //         Array.isArray(props.animatedElements) && 
            //         props.animatedElements.some((el: any) => 
            //             el.scope !== ElementScope.SELF
            //         );
            //     return !hasMultipleTargets;
            // }
        },

        staggerConfig: {
            type: ControlType.Object,
            title: "Stagger Settings",
            controls: {
                delay: {
                    type: ControlType.Number,
                    title: "Delay",
                    defaultValue: 0.1,
                    min: 0,
                    max: 2,
                    step: 0.05,
                    unit: "s",
                    description: "Time between each element's animation start"
                },
                
                // 🎯 NEW: Stagger strategy selection (linear vs grid)
                strategy: {
                    type: ControlType.Enum,
                    title: "Stagger Strategy",
                    options: ["linear", "grid"],
                    optionTitles: ["Linear (1D)", "Grid (2D)"],
                    defaultValue: "linear",
                    description: "Choose between linear sequence or grid-based staggering"
                },
                
                // 🚀 LINEAR STAGGER: Enhanced order configuration
                orderMode: {
                    type: ControlType.Enum,
                    title: "Order Configuration",
                    options: ["simple", "directional"],
                    optionTitles: ["Same Order Both Ways", "Different Orders Per Direction"],
                    defaultValue: "simple",
                    description: "Choose how to configure element order",
                    hidden: (props: any) => props.strategy === "grid"
                },
                
                // Simple mode: Same order for both directions
                simpleOrder: {
                    type: ControlType.Enum,
                    title: "Element Order",
                    options: ["first-to-last", "last-to-first", "center-out", "edges-in", "random"],
                    optionTitles: ["First to Last", "Last to First", "Center Outward", "Edges Inward", "Random"],
                    defaultValue: "first-to-last",
                    description: "Order for sequencing element animations",
                    hidden: (props: any) => props.orderMode !== "simple" || props.strategy === "grid"
                },
                
                // Directional mode: Different orders for forward vs backward
                forwardOrder: {
                    type: ControlType.Enum,
                    title: "Forward Animation Order",
                    options: ["first-to-last", "last-to-first", "center-out", "edges-in", "random"],
                    optionTitles: ["First › Last", "Last › First", "Center › Out", "Edges › In", "Random"],
                    defaultValue: "first-to-last",
                    description: "Element order when animation progresses forward (0 → 1)",
                    hidden: (props: any) => props.orderMode !== "directional" || props.strategy === "grid"
                },
                
                backwardOrder: {
                    type: ControlType.Enum,
                    title: "Backward Animation Order",
                    options: ["first-to-last", "last-to-first", "center-out", "edges-in", "random"],
                    optionTitles: ["First › Last", "Last › First", "Center › Out", "Edges › In", "Random"],
                    defaultValue: "last-to-first",
                    description: "Element order when animation progresses backward (1 → 0)",
                    hidden: (props: any) => props.orderMode !== "directional" || props.strategy === "grid"
                },
                
                // 🌐 GRID STAGGER: Grid-specific configuration
                // 🆕 NEW: Grid Mode Selector (appears when strategy = "grid")
                gridMode: {
                    type: ControlType.Enum,
                    title: "Grid Mode",
                    options: ["point-based", "row-based", "column-based"],
                    optionTitles: ["From Point", "Row Waves", "Column Waves"],
                    defaultValue: "point-based",
                    description: "Choose how stagger animation spreads across the grid",
                    hidden: (props: any) => props.strategy !== "grid"
                },
                
                // ✅ EXISTING: gridOrigin - now conditional on point-based mode
                gridOrigin: {
                    type: ControlType.Enum,
                    title: "Grid Origin",
                    options: [
                        "center",
                        "top-left", "top-center", "top-right",
                        "center-left", "center-right",
                        "bottom-left", "bottom-center", "bottom-right",
                        "random"
                    ],
                    optionTitles: [
                        "Center",
                        "Top Left", "Top Center", "Top Right",
                        "Center Left", "Center Right", 
                        "Bottom Left", "Bottom Center", "Bottom Right",
                        "Random"
                    ],
                    defaultValue: "center",
                    description: "Starting point for grid stagger animation",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "point-based"
                },
                
                // 🆕 NEW: Row-based wave direction
                gridRowDirection: {
                    type: ControlType.Enum,
                    title: "Row Direction",
                    options: ["top-to-bottom", "bottom-to-top", "center-out-rows", "edges-in-rows"],
                    optionTitles: ["Top → Bottom", "Bottom → Top", "Center → Edges", "Edges → Center"],
                    defaultValue: "top-to-bottom",
                    description: "Direction for row-based wave animation",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "row-based"
                },
                
                // 🆕 NEW: Column-based wave direction
                gridColumnDirection: {
                    type: ControlType.Enum,
                    title: "Column Direction", 
                    options: ["left-to-right", "right-to-left", "center-out-columns", "edges-in-columns"],
                    optionTitles: ["Left → Right", "Right → Left", "Center → Edges", "Edges → Center"],
                    defaultValue: "left-to-right",
                    description: "Direction for column-based wave animation", 
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "column-based"
                },
                
                gridDistanceMetric: {
                    type: ControlType.Enum,
                    title: "Distance Calculation",
                    options: ["euclidean", "manhattan", "chebyshev"],
                    optionTitles: ["Direct (Euclidean)", "City Blocks (Manhattan)", "Chessboard (Chebyshev)"],
                    defaultValue: "euclidean",
                    description: "How to calculate distance from origin to elements",
                    hidden: (props: any) => props.strategy !== "grid"
                },
                
                // 🚀 NEW: Grid Reverse Mode - Choose reverse behavior for grid staggering
                gridReverseMode: {
                    type: ControlType.Enum,
                    title: "Grid Reverse Behavior", 
                    options: ["same-origin", "latest-elements"],
                    optionTitles: ["Same Origin", "Latest Elements"],
                    defaultValue: "latest-elements",
                    description: "For reverse animations: start from same origin point or from latest/farthest elements",
                    hidden: (props: any) => props.strategy !== "grid"
                },
                
                gridAutoDetect: {
                    type: ControlType.Boolean,
                    title: "Auto-Detect Grid",
                    defaultValue: true,
                    description: "Automatically detect grid layout from element positions",
                    hidden: (props: any) => props.strategy !== "grid"
                },
                
                gridRows: {
                    type: ControlType.Number,
                    title: "Grid Rows",
                    defaultValue: 3,
                    min: 1,
                    max: 20,
                    step: 1,
                    displayStepper: true,
                    description: "Number of rows in the grid (when auto-detect is off)",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridAutoDetect
                },
                
                gridColumns: {
                    type: ControlType.Number,
                    title: "Grid Columns", 
                    defaultValue: 3,
                    min: 1,
                    max: 20,
                    step: 1,
                    displayStepper: true,
                    description: "Number of columns in the grid (when auto-detect is off)",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridAutoDetect
                },
            },
            hidden: (props: any) => !shouldShowRegularStagger(props)
        }
    }
}

/**
 * Creates scroll stagger configuration property controls with hybrid strategy support
 * 
 * @description
 * Generates comprehensive scroll stagger controls including:
 * - Scroll-specific features: mode selection (scrubbed vs threshold), scrub window
 * - Shared strategy concepts: linear and grid strategies from regular stagger
 * - Element ordering: first-to-last, center-out, etc. (no forward/backward for scroll)
 * - Grid configurations: point-based, row-based, column-based modes
 * - Advanced options: distance metrics, reverse behavior, random seed
 * 
 * These controls are visible when animation paradigm is "scroll-based"
 * and stagger is enabled. The hybrid approach shares core strategy concepts
 * with time-based stagger while adding scroll-specific position features.
 * 
 * @returns Property controls object for comprehensive scroll stagger configuration
 * 
 * @since 3.0.0 - Enhanced with hybrid stagger architecture
 * 
 * @example
 * ```typescript
 * const scrollStaggerControls = createScrollStaggerControls()
 * // Returns controls for comprehensive scroll stagger with shared strategies
 * ```
 * 
 * @architectural_note
 * This function provides the revolutionary overlapping stagger system combined
 * with powerful strategy options previously only available in time-based stagger.
 * Users can now use grid strategies, complex ordering, and advanced configurations
 * with scroll-tied animations for unprecedented creative possibilities.
 */
export function createScrollStaggerControls() {
    return {
        // 🌊 SCROLL STAGGER: Enhanced hybrid stagger system for scroll-based animations
        scrollStaggerConfig: {
            type: ControlType.Object,
            title: "Stagger Settings",
            hidden: (props: any) => !shouldShowScrollStagger(props),
            controls: {
                // 🚀 SCROLL-SPECIFIC: Mode selection (scrubbed vs threshold)
                mode: {
                    type: ControlType.Enum,
                    title: "Stagger Mode",
                    description: "How multiple elements are staggered in scroll",
                    options: ['scrubbed', 'threshold'],
                    optionTitles: [
                        'Scrubbed stagger',
                        'Threshold Stagger'
                    ],
                    defaultValue: 'scrubbed',
                    displaySegmentedControl: true,
                    segmentedControlDirection: "vertical",
                },

                // 🚀 SCROLL-SPECIFIC: Scrub window for overlapping animations
                scrubWindow: {
                    type: ControlType.Number,
                    title: "Animation Duration %",
                    description: "What % of total scroll each element animates for",
                    min: 10,
                    max: 100,
                    step: 5,
                    defaultValue: 50,
                    unit: "%",
                    displayStepper: true,
                    hidden: (props: any) => props.mode !== 'scrubbed',
                },

                // 🔥 SHARED STRATEGY: Linear vs Grid selection
                strategy: {
                    type: ControlType.Enum,
                    title: "Stagger Strategy",
                    options: ["linear", "grid"],
                    optionTitles: ["Linear (1D)", "Grid (2D)"],
                    defaultValue: "linear",
                    description: "Choose between linear sequence or grid-based staggering"
                },

                // 🚀 SHARED LINEAR: Element order (no forward/backward for scroll)
                order: {
                    type: ControlType.Enum,
                    title: "Element Order",
                    options: ["first-to-last", "last-to-first", "center-out", "edges-in", "random"],
                    optionTitles: ["First to Last", "Last to First", "Center Outward", "Edges Inward", "Random"],
                    defaultValue: "first-to-last",
                    description: "Order for sequencing element animations",
                    hidden: (props: any) => props.strategy === "grid"
                },

                // 🌐 SHARED GRID: Grid mode selector
                gridMode: {
                    type: ControlType.Enum,
                    title: "Grid Mode",
                    options: ["point-based", "row-based", "column-based"],
                    optionTitles: ["From Point", "Row Waves", "Column Waves"],
                    defaultValue: "point-based",
                    description: "Choose how stagger animation spreads across the grid",
                    hidden: (props: any) => props.strategy !== "grid"
                },

                // 🌐 SHARED GRID: Grid origin (point-based mode)
                gridOrigin: {
                    type: ControlType.Enum,
                    title: "Grid Origin",
                    options: [
                        "center",
                        "top-left", "top-center", "top-right",
                        "center-left", "center-right",
                        "bottom-left", "bottom-center", "bottom-right",
                        "random"
                    ],
                    optionTitles: [
                        "Center",
                        "Top Left", "Top Center", "Top Right",
                        "Center Left", "Center Right", 
                        "Bottom Left", "Bottom Center", "Bottom Right",
                        "Random"
                    ],
                    defaultValue: "center",
                    description: "Starting point for grid stagger animation",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "point-based"
                },

                // 🌐 SHARED GRID: Row direction (row-based mode)
                gridRowDirection: {
                    type: ControlType.Enum,
                    title: "Row Direction",
                    options: ["top-to-bottom", "bottom-to-top", "center-out-rows", "edges-in-rows"],
                    optionTitles: ["Top → Bottom", "Bottom → Top", "Center → Edges", "Edges → Center"],
                    defaultValue: "top-to-bottom",
                    description: "Direction for row-based wave animation",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "row-based"
                },

                // 🌐 SHARED GRID: Column direction (column-based mode)
                gridColumnDirection: {
                    type: ControlType.Enum,
                    title: "Column Direction", 
                    options: ["left-to-right", "right-to-left", "center-out-columns", "edges-in-columns"],
                    optionTitles: ["Left → Right", "Right → Left", "Center → Edges", "Edges → Center"],
                    defaultValue: "left-to-right",
                    description: "Direction for column-based wave animation", 
                    hidden: (props: any) => props.strategy !== "grid" || props.gridMode !== "column-based"
                },

                // 🌐 SHARED GRID: Distance calculation metric
                gridDistanceMetric: {
                    type: ControlType.Enum,
                    title: "Distance Calculation",
                    options: ["euclidean", "manhattan", "chebyshev"],
                    optionTitles: ["Direct (Euclidean)", "City Blocks (Manhattan)", "Chessboard (Chebyshev)"],
                    defaultValue: "euclidean",
                    description: "How to calculate distance from origin to elements",
                    hidden: (props: any) => props.strategy !== "grid"
                },

                // 🌐 SHARED GRID: Reverse behavior
                gridReverseMode: {
                    type: ControlType.Enum,
                    title: "Grid Reverse Behavior", 
                    options: ["same-origin", "latest-elements"],
                    optionTitles: ["Same Origin", "Latest Elements"],
                    defaultValue: "latest-elements",
                    description: "For reverse scroll: start from same origin point or from latest/farthest elements",
                    hidden: (props: any) => props.strategy !== "grid"
                },

                // 🌐 SHARED GRID: Auto-detection toggle
                gridAutoDetect: {
                    type: ControlType.Boolean,
                    title: "Auto-Detect Grid",
                    defaultValue: true,
                    description: "Automatically detect grid layout from element positions",
                    hidden: (props: any) => props.strategy !== "grid"
                },

                // 🌐 SHARED GRID: Manual dimensions
                gridRows: {
                    type: ControlType.Number,
                    title: "Grid Rows",
                    defaultValue: 3,
                    min: 1,
                    max: 20,
                    step: 1,
                    displayStepper: true,
                    description: "Number of rows in the grid (when auto-detect is off)",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridAutoDetect
                },

                gridColumns: {
                    type: ControlType.Number,
                    title: "Grid Columns", 
                    defaultValue: 3,
                    min: 1,
                    max: 20,
                    step: 1,
                    displayStepper: true,
                    description: "Number of columns in the grid (when auto-detect is off)",
                    hidden: (props: any) => props.strategy !== "grid" || props.gridAutoDetect
                },
            }
        }
    }
}

/**
 * Creates interrupt behavior controls
 * 
 * @description
 * Generates controls for handling animation interruption behavior.
 * These controls determine how new animation triggers are handled
 * when an animation is already playing.
 * 
 * Hidden in scroll-based mode since scroll position determines animation state.
 * 
 * @returns Property controls object for interrupt behavior
 * 
 * @example
 * ```typescript
 * const interruptControls = createInterruptBehaviorControls()
 * // Returns controls for animation interrupt handling
 * ```
 */
export function createInterruptBehaviorControls() {
    return {
        // 🚨 NEW: Interrupt behavior controls
        interruptBehavior: {
            type: ControlType.Enum,
            title: "Interrupt Behavior",
            options: [
                InterruptBehavior.IMMEDIATE,
                InterruptBehavior.BLOCK,
                InterruptBehavior.QUEUE_LATEST
            ],
            optionTitles: [
                "Start Immediately", 
                "Wait Until Complete", 
                "Queue Latest Intent"
            ],
            defaultValue: InterruptBehavior.IMMEDIATE,
            hidden: (props: any) => isScrollBased(props), // Hide in scrub-based mode
        }
    }
} 