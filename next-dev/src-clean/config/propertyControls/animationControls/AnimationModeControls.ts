/**
 * @file AnimationModeControls.ts
 * @description Animation mode and paradigm configuration controls for FAME animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @module AnimationModeControls
 * 
 * @description
 * This module provides property controls for animation mode selection and paradigm configuration.
 * It handles the fundamental choice between time-based and scroll-based animation paradigms
 * and related animation behavior settings.
 * 
 * @features
 * - Animation paradigm selection (time-based vs scroll-based)
 * - Animation behavior controls (play once, toggle, repeat, loop)
 * - Clear UX with vertical segmented control
 * - Progressive disclosure based on mode selection
 * 
 * @architecture
 * This is part of the modular refactoring of AnimationSlots.ts:
 * - Extracted from AnimationSlots.ts (Phase 5)
 * - Single responsibility: animation mode/paradigm configuration
 * - Clean separation of concerns
 * - Reusable and maintainable
 * 
 * @usage
 * ```typescript
 * import { createAnimationParadigmControls, createAnimationBehaviorControls } from './AnimationModeControls.ts'
 * 
 * const controls = {
 *   ...createAnimationParadigmControls(),
 *   ...createAnimationBehaviorControls(),
 *   // other controls...
 * }
 * ```
 * 
 * @integration
 * Used by AnimationSlots.ts main composition function to provide
 * fundamental animation mode selection at the top level.
 */

import { ControlType } from "framer"

import {
    AnimationBehavior,
} from "../../../types/index.ts"

/**
 * Creates animation paradigm selection controls
 * 
 * @description
 * Generates the top-level animation paradigm selector that determines
 * the fundamental animation approach:
 * - Time Based: Traditional trigger-based animations with event handling
 * - Scroll Based: Revolutionary scroll-tied animations with direct progress mapping
 * 
 * This is a critical UX choice that determines the entire animation configuration
 * interface and behavior.
 * 
 * @returns Property controls object for animation paradigm selection
 * 
 * @example
 * ```typescript
 * const paradigmControls = createAnimationParadigmControls()
 * // Returns controls for paradigm selection with vertical segmented control
 * ```
 * 
 * @architectural_note
 * This paradigm choice drives the conditional visibility of all other
 * animation controls throughout the interface, making it a foundational
 * control that should always be visible at the top level.
 */
export function createAnimationParadigmControls() {
    return {
        animationParadigm: {
            type: ControlType.Enum,
            title: "Mode",
            options: ["time-based", "scroll-based"],
            optionTitles: ["Time Based", "Scroll (scrubbed)"],
            defaultValue: "time-based",
            displaySegmentedControl: true,
            segmentedControlDirection: "vertical",
        }
    }
}

/**
 * Creates animation behavior configuration controls
 * 
 * @description
 * Generates controls for animation behavior selection including:
 * - Play Once: Animation plays once when triggered
 * - Toggle: Animation toggles between forward/reverse on each trigger
 * - Repeat: Animation repeats when retriggered
 * - Loop: Animation loops continuously
 * 
 * These controls determine how animations respond to trigger events
 * and their playback behavior.
 * 
 * @returns Property controls object for animation behavior
 * 
 * @example
 * ```typescript
 * const behaviorControls = createAnimationBehaviorControls()
 * // Returns controls for animation behavior selection
 * ```
 * 
 * @architectural_note
 * This function provides the animation behavior controls that were
 * previously defined inline. The behavior selection affects how
 * the animation system handles trigger events and playback states.
 */
export function createAnimationBehaviorControls() {
    return {
        behavior: {
            type: ControlType.Enum,
            title: "Behavior",
            options: [
                AnimationBehavior.PLAY_ONCE,
                AnimationBehavior.TOGGLE,
                AnimationBehavior.REPEAT,
                AnimationBehavior.LOOP,
            ],
            optionTitles: ["Play Once", "Toggle", "Repeat", "Loop"],
            defaultValue: AnimationBehavior.PLAY_FORWARD,
            displaySegmentedControl: false,
        }
    }
} 