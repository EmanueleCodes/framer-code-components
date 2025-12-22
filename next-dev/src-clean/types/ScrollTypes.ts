/**
 * @file ScrollTypes.ts
 * @description Enhanced scroll trigger types for FAME dual-mode scroll system
 * 
 * @version 2.0.0
 * @since 2.0.0
 * 
 * @description
 * Comprehensive type system for FAME's sophisticated scroll trigger functionality.
 * Implements the dual-mode architecture from NEXT_STEPS.md with discriminated unions
 * for type safety and clear separation between timed and scrubbed scroll modes.
 * 
 * **Dual-Mode Architecture**:
 * - **Timed Mode**: Enhanced scroll triggers that work with existing TimedAnimator
 * - **Scrubbed Mode**: Revolutionary scroll-tied animations with overlapping stagger
 * 
 * **Key Features**:
 * - Flexible position system supporting vh, px, %, rem units
 * - Element and viewport boundary positioning
 * - Preset configurations for common scroll patterns
 * - Type-safe discriminated unions preventing mode confusion
 * - Future-ready for advanced scroll behaviors
 * 
 * @architecture_compliance
 * This file handles ONLY type definitions for scroll functionality.
 * It does NOT handle:
 * - Property control generation (handled by ScrollPropertyControls)
 * - Animation execution (handled by ScrollAnimator)
 * - Element targeting (handled by ElementFinder)
 * - Timeline coordination (handled by MasterTimeline)
 * 
 * @god_class_prevention
 * Single responsibility: Define types for scroll trigger system.
 * Implementation logic, UI generation, and execution are handled by separate files.
 * 
 * @usage
 * ```typescript
 * // Timed mode configuration
 * const timedConfig: ScrollConfig = {
 *   mode: 'timed',
 *   timedConfig: {
 *     triggerElement: { scope: ElementScope.SELF },
 *     elementStart: { value: '0px' },
 *     viewportThreshold: { value: '80vh' },
 *     thresholdCrossedBackward: 'reverse'
 *   }
 * };
 * 
 * // Scrubbed mode configuration
 * const scrubbedConfig: ScrollConfig = {
 *   mode: 'scrubbed',
 *   scrubbedConfig: {
 *     triggerElement: { scope: ElementScope.SELF },
 *     boundaries: {
 *       start: { element: { value: '0px' }, viewport: { value: '100vh' } },
 *       end: { element: { value: '100%' }, viewport: { value: '0vh' } }
 *     },
 *     stagger: { mode: 'scrubbed', scrubWindow: 50 }
 *   }
 * };
 * ```
 * 
 * @performance
 * All types are compile-time only - zero runtime performance impact.
 * Discriminated unions enable efficient type checking and prevent runtime errors.
 */

// Import required types from main type system
import type { ElementSelection, AnimatedElement } from './index.ts';
import { ElementScope } from './index.ts';

// Import stagger types for hybrid support
import type { 
    GridOrigin,
    StaggerOrder,
    GridStaggerMode,
    GridDistanceMetric,
    GridReverseMode 
} from '../utils/staggering/types/StaggerTypes.ts';

//=======================================
//          SCROLL POSITION SYSTEM
//=======================================

/**
 * Flexible scroll position value supporting multiple CSS units
 * 
 * @description
 * Accepts position values in various CSS units for maximum flexibility:
 * - Viewport units: "20vh", "50vw" 
 * - Percentage: "43.12%", "100%"
 * - Pixels: "100px", "250px"
 * - Relative units: "2rem", "1.5em"
 * - Calc expressions: "calc(100vh - 50px)"
 * 
 * @validation
 * Values should be validated by the property controls system to ensure:
 * - Valid CSS unit syntax
 * - Reasonable numeric ranges
 * - Proper calc() expression syntax when used
 * 
 * @examples
 * ```typescript
 * const positions: ScrollPosition[] = [
 *   { value: "20vh" },    // 20% of viewport height
 *   { value: "100px" },   // 100 pixels
 *   { value: "43.12%" },  // 43.12% of parent
 *   { value: "2rem" },    // 2 root em units
 *   { value: "calc(100vh - 50px)" } // Calculated value
 * ];
 * ```
 */
export interface ScrollPosition {
    /** Position value with CSS unit (e.g., "20vh", "100px", "43.12%", "2rem") */
    value: string;
}

/**
 * Scroll boundary definition for start/end trigger points
 * 
 * @description
 * Defines both element-relative and viewport-relative positions for precise
 * scroll trigger control. This dual-positioning system allows for complex
 * scroll behaviors that respond to both element position and viewport state.
 * 
 * **Element Position**: Distance from the top of the trigger element
 * **Viewport Position**: Distance from the top of the viewport
 * 
 * @examples
 * ```typescript
 * // Trigger when element top is 20vh from viewport top
 * const boundary: ScrollBoundary = {
 *   element: { value: "0px" },     // Top of element
 *   viewport: { value: "20vh" }    // 20% down from viewport top
 * };
 * 
 * // Trigger when bottom of element reaches center of viewport
 * const boundary: ScrollBoundary = {
 *   element: { value: "100%" },    // Bottom of element
 *   viewport: { value: "50vh" }    // Center of viewport
 * };
 * ```
 */
export interface ScrollBoundary {
    /** Distance from element top (e.g., "0px" = element top, "100%" = element bottom) */
    element: ScrollPosition;
    
    /** Distance from viewport top (e.g., "50vh" = viewport center, "0vh" = viewport top) */
    viewport: ScrollPosition;
}



//=======================================
//          TIMED SCROLL CONFIGURATION
//=======================================

/**
 * Configuration for timed scroll mode
 * 
 * @description
 * Timed scroll mode uses Intersection Observer for performance and triggers
 * existing TimedAnimator when scroll thresholds are crossed. This mode
 * enhances the existing animation system without replacing it.
 * 
 * **Integration Strategy**:
 * - Reuses existing TimedAnimator for animation execution
 * - Reuses existing behavior system (play once, toggle, etc.)
 * - Reuses existing stagger system with scroll-aware timing
 * - Uses Intersection Observer for battery-friendly performance
 * 
 * **Backward Compatibility**:
 * This extends the existing trigger system and is fully compatible with
 * existing animation configurations.
 * 
 * @architecture_integration
 * - Integrated into triggers array as enhanced scroll trigger
 * - Uses existing ElementSelection system for trigger element
 * - Compatible with existing AnimationBehavior system
 * - Supports existing thresholdCrossedBackward behaviors
 * 
 * @performance
 * - Uses Intersection Observer (battery-friendly)
 * - No RAF loops or continuous scroll listening
 * - Minimal performance impact vs existing system
 * 
 * @examples
 * ```typescript
 * const timedConfig: TimedScrollConfig = {
 *   triggerElement: { scope: ElementScope.CHILDREN, criteria: [{ type: CriteriaType.HTML_TAG, value: "h1" }] },
 *   elementStart: { value: "0px" },           // Top of element
 *   viewportThreshold: { value: "80vh" },     // 80% down viewport
 *   thresholdCrossedBackward: 'reverse'       // Reverse when scrolling back up
 * };
 * ```
 */
export interface TimedScrollConfig {
    /** Element to observe for scroll triggers */
    triggerElement: ElementSelection;
    
    /** Position on the trigger element (e.g., "0px" = top, "100%" = bottom) */
    elementStart: ScrollPosition;
    
    /** Viewport position that triggers animation (e.g., "80vh" = 80% down viewport) */
    viewportThreshold: ScrollPosition;
    
    /** Behavior when scrolling backward past threshold */
    thresholdCrossedBackward: 'reverse' | 'reset' | 'complete' | 'none';
}

//=======================================
//          INDIVIDUAL ELEMENT TRIGGERS  
//=======================================

/**
 * Element trigger mapping for individual vs shared trigger modes
 * 
 * @description
 * Maps each animated element to its corresponding trigger element and boundaries.
 * Supports both shared triggers (all elements use same trigger) and individual 
 * triggers (each element uses itself as trigger via individual trigger mode).
 * 
 * @since 3.0.0 - Added for individual element trigger support
 * @version 3.1.0 - Updated to use scope-based individual trigger detection
 * 
 * @examples
 * ```typescript
 * // Individual trigger mode - each element is its own trigger
 * const individualMapping: ElementTriggerMapping = {
 *   animatedElement: { selection: { scope: ElementScope.SELF } },
 *   triggerElement: { scope: ElementScope.SELF }, // Same as animated element
 *   isIndividual: true,
 *   boundaries: {
 *     start: { element: { value: "0px" }, viewport: { value: "100vh" } },
 *     end: { element: { value: "100%" }, viewport: { value: "0vh" } }
 *   }
 * };
 * 
 * // Shared trigger mode - all elements use same trigger
 * const sharedMapping: ElementTriggerMapping = {
 *   animatedElement: { selection: { scope: ElementScope.CHILDREN } },
 *   triggerElement: { scope: ElementScope.PARENT }, // Different from animated element
 *   isIndividual: false,
 *   boundaries: undefined // Uses shared boundaries from config
 * };
 * ```
 */
export interface ElementTriggerMapping {
    /** The animated element configuration */
    animatedElement: AnimatedElement;
    
    /** The element that acts as scroll trigger */
    triggerElement: ElementSelection;
    
    /** Whether this is individual (true) or shared (false) trigger mode */
    isIndividual: boolean;
    
    /** Individual scroll boundaries (only when isIndividual = true) */
    boundaries?: {
        start: ScrollBoundary;
        end: ScrollBoundary;
    };
}

//=======================================
//          HYBRID STAGGER SYSTEM
//=======================================

/**
 * Base stagger configuration shared across paradigms
 * 
 * @description
 * Core stagger concepts that work for both time-based and scroll-based animations:
 * - Linear and grid strategies
 * - Element ordering (first-to-last, center-out, etc.)
 * - Grid configurations with origins and distance metrics
 * - Consistency features (random seed, auto-detection)
 * 
 * This provides a unified foundation while allowing paradigm-specific extensions.
 * 
 * @since 3.0.0 - Added for hybrid stagger architecture
 * 
 * @examples
 * ```typescript
 * // Linear strategy configuration
 * const linearConfig: BaseStaggerConfig = {
 *   strategy: 'linear',
 *   order: 'center-out',
 *   randomSeed: 12345
 * };
 * 
 * // Grid strategy configuration
 * const gridConfig: BaseStaggerConfig = {
 *   strategy: 'grid',
 *   order: 'first-to-last',
 *   gridMode: 'point-based',
 *   gridOrigin: 'center',
 *   gridDistanceMetric: 'euclidean',
 *   gridAutoDetect: true
 * };
 * ```
 */
export interface BaseStaggerConfig {
    /** Stagger calculation strategy */
    strategy: 'linear' | 'grid';
    
    /** Element ordering pattern (shared across paradigms) */
    order: StaggerOrder;
    
    /** Grid stagger mode (only when strategy = 'grid') */
    gridMode?: GridStaggerMode;
    
    /** Grid origin point (only when gridMode = 'point-based') */
    gridOrigin?: GridOrigin;
    
    /** Distance calculation metric for grid strategy */
    gridDistanceMetric?: GridDistanceMetric;
    
    /** Grid reverse behavior for backward animations */
    gridReverseMode?: GridReverseMode;
    
    /** Auto-detect grid layout from element positions */
    gridAutoDetect?: boolean;
    
    /** Manual grid dimensions (when gridAutoDetect = false) */
    gridRows?: number;
    gridColumns?: number;
    
    /** Seed for consistent random ordering */
    randomSeed?: number;
}

/**
 * Time-based stagger configuration (extends base with timing features)
 * 
 * @description
 * Extends base stagger with time-specific features:
 * - Delay timing in seconds
 * - Directional modes (forward/backward can have different orders)
 * - Order mode selection (simple vs directional)
 * 
 * These features don't apply to scroll-based stagger since scroll 
 * position determines timing and direction is inherent to scroll.
 * 
 * @since 3.0.0 - Added for hybrid stagger architecture
 * 
 * @examples
 * ```typescript
 * // Simple mode - same order for both directions
 * const simpleTimeStagger: TimeStaggerConfig = {
 *   ...baseConfig,
 *   delay: 0.1,
 *   orderMode: 'simple',
 *   // Uses 'order' from base config for both directions
 * };
 * 
 * // Directional mode - different orders per direction
 * const directionalTimeStagger: TimeStaggerConfig = {
 *   ...baseConfig,
 *   delay: 0.15,
 *   orderMode: 'directional',
 *   forwardOrder: 'center-out',
 *   backwardOrder: 'edges-in'
 * };
 * ```
 */
export interface TimeStaggerConfig extends BaseStaggerConfig {
    /** Base delay between elements in seconds */
    delay: number;
    
    /** Order configuration mode */
    orderMode?: 'simple' | 'directional';
    
    /** Element order for forward animations (0 → 1) */
    forwardOrder?: StaggerOrder;
    
    /** Element order for backward animations (1 → 0) */
    backwardOrder?: StaggerOrder;
}

/**
 * Scroll-based stagger configuration (extends base with position features)
 * 
 * @description
 * Extends base stagger with scroll-specific features:
 * - Stagger mode (scrubbed vs threshold)
 * - Scrub window for overlapping animations
 * - No directional orders (scroll direction is inherent)
 * - No delay timing (position determines timing)
 * 
 * @since 3.0.0 - Added for hybrid stagger architecture
 * 
 * @examples
 * ```typescript
 * // Scrubbed mode with overlapping windows
 * const scrubbedStagger: ScrollStaggerConfig = {
 *   ...baseConfig,
 *   mode: 'scrubbed',
 *   scrubWindow: 60 // Each element animates for 60% of scroll
 * };
 * 
 * // Threshold mode with distributed triggers
 * const thresholdStagger: ScrollStaggerConfig = {
 *   ...baseConfig,
 *   mode: 'threshold'
 *   // No scrubWindow needed - auto-calculated thresholds
 * };
 * ```
 */
export interface ScrollStaggerConfig extends BaseStaggerConfig {
    /** Scroll stagger mode */
    mode: 'scrubbed' | 'threshold';
    
    /** Animation duration as percentage of total scroll (0-100) */
    scrubWindow?: number;
}

/**
 * Type-safe stagger configuration with paradigm discrimination
 * 
 * @description
 * Discriminated union ensuring type safety between time-based and scroll-based
 * stagger configurations. Prevents mixing incompatible features and enables
 * proper TypeScript autocompletion and validation.
 * 
 * @since 3.0.0 - Added for hybrid stagger architecture
 * 
 * @examples
 * ```typescript
 * // Time-based stagger configuration
 * const timeStagger: HybridStaggerConfig = {
 *   paradigm: 'time',
 *   enabled: true,
 *   config: {
 *     strategy: 'linear',
 *     order: 'center-out',
 *     delay: 0.1,
 *     orderMode: 'simple'
 *   }
 * };
 * 
 * // Scroll-based stagger configuration
 * const scrollStagger: HybridStaggerConfig = {
 *   paradigm: 'scroll',
 *   enabled: true,
 *   config: {
 *     strategy: 'grid',
 *     order: 'first-to-last',
 *     gridMode: 'point-based',
 *     gridOrigin: 'center',
 *     mode: 'scrubbed',
 *     scrubWindow: 50
 *   }
 * };
 * ```
 */
export type HybridStaggerConfig = 
    | {
        /** Animation paradigm */
        paradigm: 'time';
        /** Enable/disable staggering */
        enabled: boolean;
        /** Time-specific stagger configuration */
        config: TimeStaggerConfig;
      }
    | {
        /** Animation paradigm */
        paradigm: 'scroll';
        /** Enable/disable staggering */
        enabled: boolean;
        /** Scroll-specific stagger configuration */
        config: ScrollStaggerConfig;
      };

//=======================================
//          SCRUBBED SCROLL CONFIGURATION
//=======================================

/**
 * Stagger mode for scrubbed scroll animations
 * 
 * @description
 * **Scrubbed Mode**: Revolutionary overlapping animation windows
 * - Each element animates for X% of total scroll distance
 * - Elements' animations overlap creating smooth cascade effect
 * - Example with 50% window and 4 elements:
 *   - Element 1: 0% → 50% scroll
 *   - Element 2: 16.67% → 66.67% scroll  
 *   - Element 3: 33.33% → 83.33% scroll
 *   - Element 4: 50% → 100% scroll
 * 
 * **Threshold Mode**: Distributed timed triggers
 * - Elements trigger timed animations at evenly distributed scroll points
 * - System auto-calculates trigger points based on element count
 * - Each element plays its full timed animation when threshold reached
 * - Example with 4 elements: triggers at 0%, 33%, 66%, 100% scroll
 */
export type ScrubStaggerMode = 'scrubbed' | 'threshold';

/**
 * Stagger configuration for scrubbed scroll mode
 * 
 * @description
 * Controls how multiple elements are staggered during scrubbed scroll animations.
 * The revolutionary overlapping system creates smooth cascading effects never
 * before possible with traditional scroll libraries.
 * 
 * **Scrubbed Mode Benefits**:
 * - Smooth overlapping animations
 * - Customizable animation duration per element
 * - Natural cascade effects
 * - Perfect scroll synchronization
 * 
 * **Threshold Mode Benefits**:
 * - Compatible with existing timed animations
 * - Auto-distributed trigger points
 * - No complex overlap calculations
 * - Familiar behavior patterns
 * 
 * @algorithm
 * For scrubbed mode with overlapping windows:
 * ```typescript
 * staggerStep = (100 - animationDuration) / (elementCount - 1)
 * elements.forEach((element, index) => {
 *   element.scrollStart = index * staggerStep
 *   element.scrollEnd = element.scrollStart + animationDuration
 * })
 * ```
 * 
 * @examples
 * ```typescript
 * // Overlapping scrubbed animations
 * const scrubbedStagger: ScrubStaggerConfig = {
 *   mode: 'scrubbed',
 *   scrubWindow: 60  // Each element animates for 60% of total scroll
 * };
 * 
 * // Threshold-based triggers
 * const thresholdStagger: ScrubStaggerConfig = {
 *   mode: 'threshold'
 *   // No additional config - system auto-calculates thresholds
 * };
 * ```
 */
export interface ScrubStaggerConfig {
    /** Stagger strategy for multiple elements */
    mode: ScrubStaggerMode;
    
    /** 
     * Animation duration as percentage of total scroll (0-100)
     * Only used when mode is 'scrubbed'
     * 
     * @description
     * Defines how much of the total scroll distance each element animates for.
     * Higher values create more overlap, lower values create less overlap.
     * 
     * @examples
     * - 50% = Elements animate for half the scroll distance (moderate overlap)
     * - 100% = Elements animate for entire scroll distance (maximum overlap)
     * - 25% = Elements animate for quarter scroll distance (minimal overlap)
     * 
     * @validation
     * Should be between 1 and 100. Values < 25% may create choppy animations.
     * Values > 100% are clamped to 100%.
     */
    scrubWindow?: number;
}

/**
 * Configuration for scrubbed scroll mode
 * 
 * @description
 * Scrubbed scroll mode creates scroll-tied animations where animation progress
 * is directly synchronized with scroll progress. This creates incredibly smooth
 * scroll experiences with precise control over when animations occur.
 * 
 * **Revolutionary Features**:
 * - Direct scroll-to-animation synchronization
 * - Overlapping stagger system for cascade effects
 * - Precise boundary control with presets
 * - Element and viewport relative positioning
 * - 60fps smooth animation performance
 * 
 * **Performance Strategy**:
 * - RAF-throttled scroll listener for smooth 60fps updates
 * - Smart boundary caching to prevent recalculations
 * - GPU acceleration hints for optimal performance
 * - Optimized interpolation algorithms
 * 
 * **Timeline Integration**:
 * Animation properties are mapped from time-based to scroll-based:
 * ```typescript
 * // Time-based: Property animates from 1s to 3s (2s duration)
 * // Scroll-based: Property animates from 25% to 75% scroll (50% of scroll)
 * globalDuration = 4s // Total timeline
 * scrollStart = (1s / 4s) * 100 = 25%
 * scrollEnd = (3s / 4s) * 100 = 75%
 * ```
 * 
 * @examples
 * ```typescript
 * const scrubbedConfig: ScrubbedScrollConfig = {
 *   triggerElement: { scope: ElementScope.SELF },
 *   boundaries: {
 *     start: {
 *       element: { value: "0px" },      // Top of element
 *       viewport: { value: "100vh" }    // When element top enters from bottom
 *     },
 *     end: {
 *       element: { value: "100%" },     // Bottom of element  
 *       viewport: { value: "0vh" }      // When element bottom exits at top
 *     },
 *     presets: {
 *       start: "top-bottom",            // Override start with preset
 *       end: "custom"                   // Use explicit end boundary
 *     }
 *   },
 *   stagger: {
 *     mode: 'scrubbed',
 *     scrubWindow: 50                   // 50% overlap for smooth cascade
 *   }
 * };
 * ```
 */
export interface ScrubbedScrollConfig {
    /** Element to observe for scroll progress calculation */
    triggerElement: ElementSelection;
    
    /** Start and end boundaries for scroll animation */
    boundaries: {
        /** Animation start trigger point */
        start: ScrollBoundary;
        
        /** Animation end trigger point */
        end: ScrollBoundary;
    };
    
    /** Stagger configuration for multiple elements */
    stagger: ScrubStaggerConfig;
}

//=======================================
//          UNIFIED SCROLL CONFIGURATION
//=======================================

/**
 * Main scroll configuration with discriminated union for type safety
 * 
 * @description
 * Uses discriminated unions to ensure type safety and prevent configuration
 * conflicts between timed and scrubbed modes. The TypeScript compiler will
 * enforce that only the correct configuration object is provided for each mode.
 * 
 * **Type Safety Benefits**:
 * - Compiler prevents mixing timed and scrubbed config objects
 * - Autocomplete only shows relevant properties for each mode
 * - Runtime type guards ensure correct configuration access
 * - Clear separation prevents complex conditional logic
 * 
 * **Mode Selection Strategy**:
 * The mode is selected at the top level of property controls with a toggle:
 * - "Time Based" → Uses existing trigger system with enhanced scroll triggers
 * - "Scroll Based" → Replaces trigger system with scrubbed configuration
 * 
 * @type_guards
 * ```typescript
 * function isTimedMode(config: ScrollConfig): config is ScrollConfig & { mode: 'timed' } {
 *   return config.mode === 'timed';
 * }
 * 
 * function isScrubbedMode(config: ScrollConfig): config is ScrollConfig & { mode: 'scrubbed' } {
 *   return config.mode === 'scrubbed';
 * }
 * ```
 * 
 * @examples
 * ```typescript
 * // Timed mode - works with existing TimedAnimator
 * const timedScroll: ScrollConfig = {
 *   mode: 'timed',
 *   timedConfig: {
 *     triggerElement: { scope: ElementScope.SELF },
 *     elementStart: { value: "0px" },
 *     viewportThreshold: { value: "80vh" },
 *     thresholdCrossedBackward: 'reverse'
 *   }
 *   // scrubbedConfig is not available - TypeScript error
 * };
 * 
 * // Scrubbed mode - new scroll-tied animations
 * const scrubbedScroll: ScrollConfig = {
 *   mode: 'scrubbed',
 *   scrubbedConfig: {
 *     triggerElement: { scope: ElementScope.SELF },
 *     boundaries: {
 *       start: { element: { value: "0px" }, viewport: { value: "100vh" } },
 *       end: { element: { value: "100%" }, viewport: { value: "0vh" } }
 *     },
 *     stagger: { mode: 'scrubbed', scrubWindow: 50 }
 *   }
 *   // timedConfig is not available - TypeScript error
 * };
 * ```
 */
export type ScrollConfig = 
    | {
        /** Scroll animation mode */
        mode: 'timed';
        /** Configuration for timed scroll triggers */
        timedConfig: TimedScrollConfig;
      }
    | {
        /** Scroll animation mode */
        mode: 'scrubbed';
        /** Configuration for scrubbed scroll animations */
        scrubbedConfig: ScrubbedScrollConfig;
      };

//=======================================
//          TYPE GUARDS AND UTILITIES
//=======================================

/**
 * Type guard to check if scroll config is in timed mode
 * 
 * @param config - Scroll configuration to check
 * @returns True if config is for timed mode
 * 
 * @example
 * ```typescript
 * if (isTimedScrollConfig(scrollConfig)) {
 *   // TypeScript knows scrollConfig.timedConfig is available
 *   const threshold = scrollConfig.timedConfig.viewportThreshold;
 * }
 * ```
 */
export function isTimedScrollConfig(config: ScrollConfig): config is ScrollConfig & { mode: 'timed' } {
    return config.mode === 'timed';
}

/**
 * Type guard to check if scroll config is in scrubbed mode
 * 
 * @param config - Scroll configuration to check
 * @returns True if config is for scrubbed mode
 * 
 * @example
 * ```typescript
 * if (isScrubbedScrollConfig(scrollConfig)) {
 *   // TypeScript knows scrollConfig.scrubbedConfig is available
 *   const boundaries = scrollConfig.scrubbedConfig.boundaries;
 * }
 * ```
 */
export function isScrubbedScrollConfig(config: ScrollConfig): config is ScrollConfig & { mode: 'scrubbed' } {
    return config.mode === 'scrubbed';
}

//=======================================
//          HYBRID STAGGER TYPE GUARDS
//=======================================

/**
 * Type guard to check if stagger config is for time-based paradigm
 * 
 * @param config - Hybrid stagger configuration to check
 * @returns True if config is for time-based stagger
 * 
 * @example
 * ```typescript
 * if (isTimeStaggerConfig(staggerConfig)) {
 *   // TypeScript knows staggerConfig.config has delay property
 *   const delay = staggerConfig.config.delay;
 *   const orderMode = staggerConfig.config.orderMode;
 * }
 * ```
 */
export function isTimeStaggerConfig(config: HybridStaggerConfig): config is HybridStaggerConfig & { paradigm: 'time' } {
    return config.paradigm === 'time';
}

/**
 * Type guard to check if stagger config is for scroll-based paradigm
 * 
 * @param config - Hybrid stagger configuration to check
 * @returns True if config is for scroll-based stagger
 * 
 * @example
 * ```typescript
 * if (isScrollStaggerConfig(staggerConfig)) {
 *   // TypeScript knows staggerConfig.config has mode and scrubWindow properties
 *   const mode = staggerConfig.config.mode;
 *   const scrubWindow = staggerConfig.config.scrubWindow;
 * }
 * ```
 */
export function isScrollStaggerConfig(config: HybridStaggerConfig): config is HybridStaggerConfig & { paradigm: 'scroll' } {
    return config.paradigm === 'scroll';
}

/**
 * Type guard to check if stagger config uses linear strategy
 * 
 * @param config - Base stagger configuration to check
 * @returns True if config uses linear strategy
 * 
 * @example
 * ```typescript
 * if (isLinearStaggerStrategy(staggerConfig.config)) {
 *   // Safe to access linear-specific properties
 *   const order = staggerConfig.config.order;
 * }
 * ```
 */
export function isLinearStaggerStrategy(config: BaseStaggerConfig): boolean {
    return config.strategy === 'linear';
}

/**
 * Type guard to check if stagger config uses grid strategy
 * 
 * @param config - Base stagger configuration to check
 * @returns True if config uses grid strategy
 * 
 * @example
 * ```typescript
 * if (isGridStaggerStrategy(staggerConfig.config)) {
 *   // Safe to access grid-specific properties
 *   const gridMode = staggerConfig.config.gridMode;
 *   const gridOrigin = staggerConfig.config.gridOrigin;
 * }
 * ```
 */
export function isGridStaggerStrategy(config: BaseStaggerConfig): boolean {
    return config.strategy === 'grid';
}

/**
 * Type guard to check if element trigger mapping is individual mode
 * 
 * @param mapping - Element trigger mapping to check
 * @returns True if mapping is for individual trigger mode
 * 
 * @example
 * ```typescript
 * if (isIndividualTriggerMapping(mapping)) {
 *   // TypeScript knows mapping.boundaries is available
 *   const boundaries = mapping.boundaries;
 * }
 * ```
 */
export function isIndividualTriggerMapping(mapping: ElementTriggerMapping): mapping is ElementTriggerMapping & { isIndividual: true; boundaries: NonNullable<ElementTriggerMapping['boundaries']> } {
    return mapping.isIndividual === true && mapping.boundaries !== undefined;
}

/**
 * Type guard to check if element trigger mapping is shared mode
 * 
 * @param mapping - Element trigger mapping to check
 * @returns True if mapping is for shared trigger mode
 * 
 * @example
 * ```typescript
 * if (isSharedTriggerMapping(mapping)) {
 *   // TypeScript knows this uses shared boundaries from config
 *   console.log('Uses shared trigger configuration');
 * }
 * ```
 */
export function isSharedTriggerMapping(mapping: ElementTriggerMapping): mapping is ElementTriggerMapping & { isIndividual: false } {
    return mapping.isIndividual === false;
}





/**
 * Validate scroll position value format
 * 
 * @param position - Position to validate
 * @returns True if position has valid CSS unit syntax
 * 
 * @description
 * Validates that position values follow proper CSS unit syntax.
 * Supports: px, %, vh, vw, rem, em, and calc() expressions.
 * 
 * @example
 * ```typescript
 * isValidScrollPosition({ value: "20vh" });     // true
 * isValidScrollPosition({ value: "100px" });    // true  
 * isValidScrollPosition({ value: "invalid" });  // false
 * ```
 */
export function isValidScrollPosition(position: ScrollPosition): boolean {
    const validUnits = /^-?\d*\.?\d+(px|%|vh|vw|rem|em|ch|ex|vmin|vmax)$|^calc\(.+\)$/;
    return validUnits.test(position.value.trim());
}

 