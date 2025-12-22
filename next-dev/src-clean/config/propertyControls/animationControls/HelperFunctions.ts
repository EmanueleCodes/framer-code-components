/**
 * FAME Animation System - Animation Property Controls Helper Functions
 * 
 * @fileOverview Reusable helper functions for animation property controls
 * @version 2.0.0-clean
 * @status ACTIVE - Extracted from AnimationSlots.ts during modular refactoring
 * 
 * @description
 * Contains all helper functions used for visibility logic and mode checking
 * in animation property controls. These functions determine when specific
 * UI sections should be shown or hidden based on current animation configuration.
 * 
 * @architecture_role
 * Single responsibility: Provide pure functions for UI state logic.
 * No side effects, no DOM manipulation, no complex business logic.
 * Just clean input → output functions for property control visibility.
 * 
 * @refactoring_context
 * Extracted during Phase 1 of AnimationSlots.ts modular refactoring.
 * These functions were scattered throughout the 1600+ line god file
 * and are now centralized for reuse across all animation control modules.
 * 
 * @usage
 * ```typescript
 * import { isScrollBased, hasEventType } from './HelperFunctions.ts';
 * 
 * const scrollConfig = {
 *   hidden: (props: any) => !isScrollBased(props)
 * };
 * ```
 * 
 * @dependencies
 * - EventType enum from types
 * - No external dependencies (pure functions)
 * - No circular dependencies
 */

import type { EventType } from "../../../types/index.ts";

//=======================================
//          EVENT TYPE CHECKING
//=======================================

/**
 * Helper function to check if any trigger in the triggers array has a specific event type
 * 
 * @param props - Property controls props object
 * @param eventType - Event type to check for
 * @returns True if any trigger has the specified event type
 * 
 * @description
 * Checks both the new triggers array format and falls back to legacy
 * simple trigger event for backward compatibility.
 * 
 * @example
 * ```typescript
 * // Check if any trigger uses scroll event
 * const hasScroll = hasEventType(props, EventType.SCROLL);
 * 
 * // Use in property control visibility
 * const scrollSettings = {
 *   hidden: (props: any) => !hasEventType(props, EventType.SCROLL)
 * };
 * ```
 */
export function hasEventType(props: any, eventType: EventType): boolean {
    // Check triggers array for the specified event type
    if (props.triggers && Array.isArray(props.triggers)) {
        return props.triggers.some(
            (trigger: any) => trigger.event === eventType
        )
    }
    // Fallback to simple trigger event (backward compatibility)
    return props.triggerEvent === eventType
}

//=======================================
//          ANIMATION PARADIGM CHECKING
//=======================================

/**
 * Helper function to check if in scroll-based paradigm (always scrubbed)
 * 
 * @param props - Property controls props object
 * @returns True if in scroll-based animation paradigm
 * 
 * @description
 * Simplified after removing the redundant scrollBasedAnimationMode.
 * When animationParadigm is "scroll-based", animations are always scrubbed.
 * 
 * @example
 * ```typescript
 * // Show scroll configuration only in scroll-based mode
 * const scrollConfig = {
 *   hidden: (props: any) => !hasScrollScrubbedAnimation(props)
 * };
 * ```
 */
export function hasScrollScrubbedAnimation(props: any): boolean {
    return props.animationParadigm === "scroll-based"
}

/**
 * Helper function to check if in time-based paradigm (shows trigger system)
 * 
 * @param props - Property controls props object
 * @returns True if in time-based animation paradigm
 * 
 * @description
 * Time-based paradigm uses the regular trigger system and can include
 * scroll events alongside click, hover, etc. All existing animation
 * features work in time-based mode.
 * 
 * @example
 * ```typescript
 * // Show trigger controls only in time-based mode
 * const triggerControls = {
 *   hidden: (props: any) => !isTimeBased(props)
 * };
 * ```
 */
export function isTimeBased(props: any): boolean {
    return props.animationParadigm !== "scroll-based"
}

/**
 * Helper function to check if in scroll-based paradigm (shows scroll configuration)
 * 
 * @param props - Property controls props object
 * @returns True if in scroll-based animation paradigm
 * 
 * @description
 * Scroll-based paradigm replaces the trigger system entirely with
 * scroll configuration. Shows boundary settings, scroll stagger, etc.
 * 
 * @example
 * ```typescript
 * // Hide interrupt behavior in scroll-based mode
 * const interruptBehavior = {
 *   hidden: (props: any) => isScrollBased(props)
 * };
 * ```
 */
export function isScrollBased(props: any): boolean {
    return props.animationParadigm === "scroll-based"
}

//=======================================
//          STAGGER MODE CHECKING
//=======================================

/**
 * Helper function to check if regular stagger should be shown
 * 
 * @param props - Property controls props object
 * @returns True if regular stagger controls should be visible
 * 
 * @description
 * Regular stagger is shown when:
 * - Stagger is enabled AND
 * - In time-based paradigm (not scroll-based)
 * 
 * @example
 * ```typescript
 * const regularStagger = {
 *   hidden: (props: any) => !shouldShowRegularStagger(props)
 * };
 * ```
 */
export function shouldShowRegularStagger(props: any): boolean {
    return props.staggerEnabled && isTimeBased(props)
}

/**
 * Helper function to check if scroll stagger should be shown
 * 
 * @param props - Property controls props object
 * @returns True if scroll stagger controls should be visible
 * 
 * @description
 * Scroll stagger is shown when:
 * - Stagger is enabled AND
 * - In scroll-based paradigm
 * 
 * @example
 * ```typescript
 * const scrollStagger = {
 *   hidden: (props: any) => !shouldShowScrollStagger(props)
 * };
 * ```
 */
export function shouldShowScrollStagger(props: any): boolean {
    return props.staggerEnabled && isScrollBased(props)
} 