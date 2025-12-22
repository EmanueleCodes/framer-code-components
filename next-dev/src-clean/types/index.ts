/**
 * FAME Animation System - Unified Types
 *
 * @fileOverview Single comprehensive types file for property controls implementation
 * @version 2.0.0-clean
 * @status ACTIVE - Consolidated types for property controls migration
 *
 * @description
 * This file consolidates all types needed for the property controls implementation.
 * Starting with a single file makes it easier to understand dependencies and
 * relationships. Can be split into separate files later if needed.
 *
 * Key naming fixes:
 * - TriggerElement (element that receives events like clicks)
 * - AnimatedElement (element that gets visually animated)
 * - Clear, unambiguous terminology throughout
 *
 * @reference
 * fame-final-repo/src-refactored/config/propertyControls/AnimationSlots.ts
 * fame-final-repo/src-refactored/types/common.ts
 * fame-final-repo/src-refactored/types/animations.ts
 */

// ✅ PHASE 1 - STEP 1: Import SpringConfig for enhanced easing support
import { SpringConfig } from "../utils/easings/EasingFunctions.ts"

// ✅ PHASE 0 - STEP 2: Import enhanced staggering types
import type {
    StaggerConfig as EnhancedStaggerConfig,
    StaggerStrategy,
    StaggerTiming,
    StaggerResult,
    GridOrigin,
} from "../utils/staggering/index.ts"

//=======================================
//          ELEMENT SELECTION TYPES
//=======================================

/**
 * NEW ARCHITECTURE: Multi-Criteria Element Selection
 * Revolutionary upgrade: scope + criteria pattern for unlimited combinations
 *
 * @description
 * This new system separates "where to search" (scope) from "how to filter" (criteria).
 * Users can now combine any number of criteria with AND logic:
 * - scope: CHILDREN + criteria: [{type: FRAMER_NAME, value: "hello"}, {type: HTML_TAG, value: "button"}]
 * - This finds children elements that have framer name "hello" AND are button tags
 *
 * @benefits
 * - Unlimited combinations of filters
 * - Intuitive UX (clear separation of concerns)
 * - Future-proof (easy to add new criteria types)
 * - Clean logic (no more awkward type + cssSelector combinations)
 */
export interface ElementSelection {
    scope: ElementScope // Where to search for elements
    criteria?: SelectionCriteria[] // Array of filters to apply (AND logic)

    // 🚀 NEW: Depth system for CHILDREN and SIBLINGS scopes
    depth?: ScopeDepth // Only applies to CHILDREN and SIBLINGS scopes (default: DIRECT)
}

/**
 * Individual selection criteria for filtering elements
 * Multiple criteria are combined with AND logic
 */
export interface SelectionCriteria {
    type: CriteriaType // What type of filter to apply
    value: string // The value to match against
}

/**
 * Element scope - defines WHERE to search for elements
 * Clear separation from HOW to filter them
 */
export enum ElementScope {
    SELF = "self", // The component itself
    PARENT = "parent", // Parent element
    CHILDREN = "children", // Child elements
    SIBLINGS = "siblings", // Sibling elements
    DOCUMENT = "document", // Entire document
}

/**
 * 🚀 NEW: Scope depth for CHILDREN and SIBLINGS scopes
 * Solves the nested text element targeting issue
 */
export enum ScopeDepth {
    /**
     * Only immediate children/siblings (current behavior)
     * Uses element.children or element.parentElement.children
     */
    DIRECT = "direct",

    /**
     * Include all descendants within scope (solves text targeting)
     * Uses querySelectorAll to find nested elements like <p> in text components
     */
    DEEP = "deep",
}

/**
 * Criteria type - defines HOW to filter found elements
 * Can be combined in any number with AND logic
 */
export enum CriteriaType {
    FRAMER_NAME = "framerName", // data-framer-name="value"
    HTML_TAG = "htmlTag", // tagName === "value"
    CSS_SELECTOR = "cssSelector", // matches("value")
    ELEMENT_ID = "elementId", // id === "value"
}

/**
 * Element that receives events and triggers animations
 * Uses new multi-criteria selection system
 */
export interface TriggerElement {
    selection: ElementSelection // NEW: Scope + criteria selection
    event: EventType // What event triggers this (click, scroll, etc.)
    behavior: AnimationBehavior // How the animation behaves (play once, toggle, etc.)
    overrideState?: boolean // If true, jump to opposite state before playing when at target (default: false)
    reverseMode?: ReverseMode // How reverse animations should behave (default: EASING_PRESERVATION)
    scrollThresholds?: {
        elementStart: number // Element trigger point (0-100%)
        viewportThreshold: number // Viewport threshold (0-100%)
        thresholdCrossedBackward: string // Reverse behavior ('none', 'reverse', 'reset', 'complete')
    }
    loopConfig?: LoopConfig
    pingPongConfig?: PingPongConfig
    delayedTriggerConfig?: DelayedTriggerConfig
}

/**
 * Element that gets visually animated
 * Uses new multi-criteria selection system with individual trigger support via scope
 */
export interface AnimatedElement {
    selection: ElementSelection // NEW: Scope + criteria selection

    // 🎨 FEATURE 2B: Text Processing Mode (Phase 1) - Per Element
    textProcessing?: TextProcessingConfig // Text splitting configuration for this specific element

    // TODO: Add animation-specific settings like stagger origin, etc.
}

export enum SelectionMode {
    FIRST = "first", // Select first matching element
    LAST = "last", // Select last matching element
    ALL = "all", // Select all matching elements
    RANDOM = "random", // Select random matching element
}

// DEPRECATED: Legacy selection criteria - replaced by CriteriaType
export enum SelectionCriteria_Legacy {
    ID = "id",
    DATA_FRAMER_NAME = "data-framer-name",
    CSS_SELECTOR = "cssSelector",
    TAG = "tag",
}

//=======================================
//          EVENT TYPES
//=======================================

export enum EventType {
    SCROLL = "scroll",
    CLICK = "click",
    MOUSE_OVER = "mouseover",
    MOUSE_OUT = "mouseout",
    MOUSE_ENTER = "mouseenter",
    MOUSE_LEAVE = "mouseleave",
    POINTER_DOWN = "pointerdown",
    POINTER_UP = "pointerup",
    LOAD = "load",
    // 🚀 NEW: Enhanced JavaScript Events (Phase 1)
    FOCUS = "focus",
    BLUR = "blur",
    KEYDOWN = "keydown",
    KEYUP = "keyup",
    MOUSEDOWN = "mousedown",
    MOUSEUP = "mouseup",
    TOUCHSTART = "touchstart",
    TOUCHEND = "touchend",
    SUBMIT = "submit",
    SCROLL_DIRECTION_CHANGE = "scrollDirectionChange",
}

//=======================================
//        SCROLL CONFIGURATION TYPES
//=======================================

/**
 * Enhanced scroll configuration with dual-mode architecture
 * Temporary definition to avoid circular dependency - will be expanded in property controls phase
 */
export type ScrollConfig =
    | {
          mode: "timed"
          timedConfig: {
              triggerElement: ElementSelection
              elementStart: { value: string }
              viewportThreshold: { value: string }
              thresholdCrossedBackward:
                  | "reverse"
                  | "reset"
                  | "complete"
                  | "none"
          }
      }
    | {
          mode: "scrubbed"
          scrubbedConfig: {
              triggerElement: ElementSelection
              boundaries: {
                  start: {
                      element: { value: string }
                      viewport: { value: string }
                  }
                  end: {
                      element: { value: string }
                      viewport: { value: string }
                  }
              }
              stagger: {
                  mode: "scrubbed" | "threshold"
                  scrubWindow?: number
              }
          }
      }

//=======================================
//        REVERSE MODE OPTIONS
//=======================================

/**
 * NEW: Reverse Mode Options for Phase 5
 * Defines how reverse animations should behave
 */
export enum ReverseMode {
    /**
     * NEW DEFAULT: Preserve easing direction, swap values
     * Modern UI standard - consistent easing behavior in both directions
     * Example: Forward: 0px --spring.out--> 100px, Reverse: 100px --spring.out--> 0px
     */
    EASING_PRESERVATION = "easingPreservation",

    /**
     * LEGACY: Time reversal with easing transformation
     * Play timeline backwards in time with natural motion
     * Example: Forward: 0px --spring.out--> 100px, Reverse: 100px <--spring.in-- 0px
     */
    TIME_REVERSAL = "timeReversal",
}

//=======================================
//        ANIMATION SLOT TYPES
//=======================================

/**
 * Main animation configuration in INTERNAL format
 * This is the clean, optimized format used by AnimationOrchestrator
 *
 * IMPORTANT: This is NOT the property controls format!
 * Property controls are converted to this format via AnimationSlotAdapter
 */
export interface AnimationSlot {
    id: string

    // Trigger elements (each with their own event and behavior)
    triggers: TriggerElement[] // Array of trigger elements

    // 🚀 NEW: Animated elements configuration (converted to array for consistency)
    animatedElements: AnimatedElement[] // Array of elements that get animated

    // Animation configuration
    animationMode: AnimationMode

    // Properties to animate
    properties: AnimationProperty[] // Clean array of animation properties

    // Timing and staggering
    timing?: TimingConfig // Global timing (can be overridden per property)
    staggering?: StaggerConfig

    // Scroll-specific configuration
    scrollConfig?: ScrollConfig

    // 🔧 Timeline coordination for reversals (STEP 2)
    totalTimelineDuration?: number // Maximum end time across all properties (for timeline coordination)

    // 🎬 NEW: Timeline-First Architecture support
    masterTimeline?: any // Master timeline for Timeline-First Architecture (import type later to avoid circular deps)

    // 🚨 NEW: Interrupt behavior configuration
    interruptBehavior?: InterruptBehavior // How to handle new triggers while animating (default: IMMEDIATE)
}

export enum AnimationMode {
    TIMED = "timed", // Time-based animation
    SCRUBBED = "scrubbed", // Scroll-scrubbed animation
}

export enum AnimationBehavior {
    // 🎯 PHASE 1 - BASIC BEHAVIORS (IMPLEMENTED)
    PLAY_FORWARD = "playForward", // Always 0→1, ignore current state
    PLAY_BACKWARD = "playBackward", // Always 1→0, ignore current state
    TOGGLE = "toggle", // Smart: 0→1 or 1→0 based on current state

    // 🚀 PHASE 2 - RESET BEHAVIORS (PLANNED)
    PLAY_FORWARD_AND_RESET = "playForwardAndReset", // 0→1, then instant reset to 0
    PLAY_BACKWARD_AND_RESET = "playBackwardAndReset", // 1→0, then instant reset to 1

    // 🔄 PHASE 3 - PING PONG BEHAVIORS (PLANNED)
    PLAY_FORWARD_AND_REVERSE = "playForwardAndReverse", // 0→1→0 (one-shot ping pong)
    PLAY_BACKWARD_AND_REVERSE = "playBackwardAndReverse", // 1→0→1 (one-shot ping pong reverse)
    START_PING_PONG = "startPingPong", // Begin continuous 0→1→0→1→0...
    STOP_PING_PONG = "stopPingPong", // Stop ping pong, stay at current position

    // 🔄 PHASE 4 - LOOP BEHAVIORS (NEW)
    START_LOOP = "startLoop", // Begin continuous looping (repeat same direction)
    STOP_LOOP = "stopLoop", // Stop looping, stay at current position

    // 🎯 PHASE 5 - CONDITIONAL BEHAVIORS (NEW)
    DELAYED_TRIGGER = "delayedTrigger", // Do nothing for N times, then execute behavior

    // 📜 LEGACY COMPATIBILITY (DEPRECATED - mapped to new behaviors)
    PLAY_ONCE = "playOnce", // Maps to PLAY_FORWARD
    REPEAT = "repeat", // Maps to PLAY_FORWARD_AND_RESET
    LOOP = "loop", // Maps to START_PING_PONG
}

//=======================================
//        🔄 LOOP & PING-PONG CONFIGURATION TYPES
//=======================================

/**
 * Configuration for loop behaviors
 */
export interface LoopConfig {
    /** Number of iterations (Infinity for infinite loop) */
    iterations: number;
    /** Behavior to execute in each loop iteration */
    behavior: AnimationBehavior.PLAY_FORWARD | AnimationBehavior.PLAY_BACKWARD | AnimationBehavior.TOGGLE;
    /** Delay between loop iterations in milliseconds (default: 0) */
    delay?: number;
}

/**
 * Configuration for ping-pong behaviors
 */
export interface PingPongConfig {
    /** Number of ping-pong cycles (Infinity for infinite) */
    cycles: number;
    /** Reverse mode for backward motion */
    reverseMode: ReverseMode;
    /** Delay between ping-pong cycles in milliseconds (default: 0) */
    delay?: number;
}

/**
 * Configuration for delayed trigger behaviors
 * 
 * @description
 * Supports two modes:
 * 1. Simple Skip Count: Skip N triggers, execute on (N+1)th
 * 2. Advanced Pattern: Custom pattern like "0,0,1,0,1" where 0=ignore, 1=execute
 */
export interface DelayedTriggerConfig {
    /** Mode: 'simple' for skip count, 'pattern' for advanced patterns */
    mode?: 'simple' | 'pattern';
    
    /** SIMPLE MODE: Number of triggers to ignore before executing */
    skipCount?: number;
    
    /** ADVANCED MODE: Pattern string like "0,0,1,0,1" (0=ignore, 1=execute, repeats) */
    pattern?: string;
    
    /** Behavior to execute when trigger should fire (default: PLAY_FORWARD) */
    behavior?: AnimationBehavior;
}

//=======================================
//        📊 DISTRIBUTED PROPERTIES TYPES (FEATURE 3A)
//=======================================

/**
 * Configuration for distributed property patterns
 *
 * @description
 * Defines how property values should be distributed across multiple elements.
 * Supports various pattern types with type-safe configuration options.
 *
 * @design_principle
 * Uses discriminated unions for type safety - pattern-specific fields
 * are only available when the corresponding pattern type is selected.
 *
 * @usage_examples
 * ```typescript
 * // Comma-separated pattern
 * const config: DistributedPropertyConfig = {
 *   enabled: true,
 *   pattern: {
 *     type: 'comma-separated',
 *     values: '10px, 20vh, 30rem'  // Only available for comma-separated
 *   }
 * };
 *
 * // Linear range pattern
 * const config: DistributedPropertyConfig = {
 *   enabled: true,
 *   pattern: {
 *     type: 'linear-range',
 *     linearRange: {  // Only available for linear-range
 *       minValue: '0px',
 *       maxValue: '300px',
 *       progression: 'bell-curve'
 *     }
 *   }
 * };
 * ```
 *
 * @validation_notes
 * - `enabled: false` ignores all pattern configuration
 * - Pattern type determines which fields are required/optional
 * - Values should include CSS units (px, %, vh, etc.)
 * - Invalid patterns should fail gracefully with helpful error messages
 *
 * @future_extensions
 * - Random patterns with seed configuration
 * - Grid-aware patterns with 2D positioning
 * - Custom curve patterns with easing functions
 */
export interface DistributedPropertyConfig {
    /** Whether distributed property values are enabled */
    enabled: boolean
    /** Pattern configuration for value distribution */
    pattern: DistributedPropertyPattern
}

/**
 * Pattern types for distributed property value generation
 *
 * @description
 * Different algorithms for generating element-specific values from user configuration.
 * Each pattern type has its own specific configuration options.
 */
export type DistributedPropertyPattern =
    | CommaSeparatedPattern
    | LinearRangePattern
    | RandomPattern
    | GridAwarePattern

/**
 * Comma-separated values pattern
 * Values cycle through the provided list
 *
 * @example "10px,20vh,30rem" → ['10px', '20vh', '30rem', '10px', ...]
 */
export interface CommaSeparatedPattern {
    type: "comma-separated"
    /** Comma-separated values that cycle through elements */
    values: string
}

/**
 * Linear range pattern
 * Values distributed evenly between min and max with optional progression curves
 *
 * @example minValue: '0px', maxValue: '100px', progression: 'ascending' → ['0px', '25px', '50px', '75px', '100px']
 */
export interface LinearRangePattern {
    type: "linear-range"
    /** Linear range configuration */
    linearRange: {
        /** Minimum value in the range */
        minValue: string
        /** Maximum value in the range */
        maxValue: string
        /** How values progress across elements */
        progression: LinearProgression
    }
}

/**
 * Random pattern (Phase 4 - Future Enhancement)
 * Values generated randomly within specified constraints
 */
export interface RandomPattern {
    type: "random"
    /** Random pattern configuration */
    randomConfig: {
        /** Seed for reproducible randomness */
        seed?: number
        /** Minimum random value */
        minValue: string
        /** Maximum random value */
        maxValue: string
        /** Distribution type */
        distribution: "uniform" | "gaussian"
    }
}

/**
 * Grid-aware pattern (Phase 4 - Future Enhancement)
 * Values based on element position in detected grid layout
 */
export interface GridAwarePattern {
    type: "grid-aware"
    /** Grid-aware pattern configuration */
    gridConfig: {
        /** Direction of value progression */
        direction: "row-wise" | "column-wise" | "diagonal"
        /** Starting corner for progression */
        startCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
    }
}

/**
 * Linear progression types for range patterns
 *
 * @description
 * Different mathematical curves for distributing values across elements.
 * Each creates a different visual effect in the final animation.
 */
export type LinearProgression =
    | "linear" // Linear progression from min to max
    | "linear-reverse" // Linear progression from max to min
    | "bell-curve" // Smooth bell curve - peak in center, smooth falloff at edges
    | "roof" // Triangular peak - sharp rise to center, sharp fall to edges
    | "reverse-roof" // Triangular valley - sharp fall to center, sharp rise to edges
    | "ramp-up" // Slow start, fast end (exponential-like)
    | "ramp-down" // Fast start, slow end (inverse exponential-like)
    | "ease-in-out" // Smooth S-curve transition
    | "steps" // Stepped/discrete progression
    | "random" // Random distribution between min and max values
    | "cubic-in-out" // Pronounced S-curve with stronger acceleration/deceleration
    | "bounce" // Bouncing effect with oscillations
    | "elastic" // Elastic overshoot with wave-like patterns
    | "exponential" // Strong exponential curve for dramatic effects

//=======================================
//        ANIMATION PROPERTY TYPES
//=======================================

export interface AnimationProperty {
    property: string // CSS property name (e.g., 'translateX', 'opacity')
    from: PropertyValue // Starting value
    to: PropertyValue // Ending value
    unit?: string // Unit (px, %, deg, etc.)

    // Per-property timing overrides
    duration?: number
    delay?: number
    easing?: string
    springConfig?: SpringConfig // Configuration for spring-based easings

    // 🚀 PHASE 4.1: Multi-property instance support
    instanceId?: string // For multiple instances: 'translateX', 'translateX_1', 'translateX_2'
    controlIdSuffix?: string // Internal tracking: '', '_1', '_2'

    // 📊 FEATURE 3A: Distributed Properties (Phase 1)
    /** Configuration for distributing "from" values across multiple elements */
    distributeFrom?: DistributedPropertyConfig
    /** Configuration for distributing "to" values across multiple elements */
    distributeTo?: DistributedPropertyConfig
    /** @internal Element ID for tracking when property is expanded per-element (used during execution) */
    elementId?: string

    // 📊 FEATURE 3A: Fixed Distributed Properties - Element-specific values storage
    /** @internal Array of "from" values, one per element (used when distributed properties are expanded) */
    distributedFromValues?: PropertyValue[]
    /** @internal Array of "to" values, one per element (used when distributed properties are expanded) */
    distributedToValues?: PropertyValue[]

    // ❌ REMOVED: Legacy coordination properties - Timeline-First Architecture handles coordination
    // ❌ REMOVED: isEarliestInstance - Timeline gets initial values from time=0 automatically
    // ❌ REMOVED: originalIndex - Timeline keyframes preserve order naturally
    // ❌ REMOVED: totalEndTime - Timeline has totalDuration instead
}

export type PropertyValue = string | number | boolean

//=======================================
//        🚀 PHASE 4.1: MULTI-PROPERTY SUPPORT
//=======================================

/**
 * Global timeline configuration for slot-level timing control
 * When enabled, provides default values for all properties
 */
export interface GlobalTimelineConfig {
    enabled: boolean // Whether to use global timeline settings
    duration?: number // Global duration in milliseconds (default for all properties)
    delay?: number // Global delay in milliseconds (added to all property delays)
    easing?: string // Global easing function (default for all properties)
    springConfig?: SpringConfig // Global spring configuration
}

/**
 * Multi-property instance tracking for property controls
 * Based on reference implementation activeProperties pattern
 */
export interface MultiPropertyConfig {
    activeProperties: string[] // Array like: ["translateX", "translateX", "opacity"]
    maxInstancesPerProperty: number // Default: 5 (support up to 5 instances per property type)
}

/**
 * Extended animation slot with multi-property and global timeline support
 * Maintains backward compatibility with existing AnimationSlot
 */
export interface MultiPropertyAnimationSlot extends AnimationSlot {
    // 🚀 Multi-property configuration
    multiProperty?: MultiPropertyConfig // Configuration for multiple property instances

    // 🌐 Global timeline configuration
    globalTimeline?: GlobalTimelineConfig // Slot-level timing defaults

    // Enhanced property resolution metadata
    propertyInstanceMap?: Map<string, AnimationProperty[]> // Group properties by type for smart initial value application
}

//=======================================
//        TIMING CONFIGURATION
//=======================================

export interface TimingConfig {
    duration: number // Animation duration in milliseconds
    delay: number // Animation delay in milliseconds
    easing: string // Easing function name
    springConfig?: SpringConfig // Configuration for spring-based easings
}

//=======================================
//        STAGGER CONFIGURATION
//=======================================

/**
 * ✅ PHASE 0 - STEP 2: Enhanced Stagger Configuration
 * Re-export enhanced staggering types from the dedicated staggering module
 *
 * @description
 * The core types now use the enhanced stagger configuration that supports:
 * - Progressive disclosure (basic → advanced options)
 * - Multiple strategies (linear, grid, random)
 * - Future scroll stagger support
 * - Comprehensive type safety
 */

// Re-export enhanced stagger configuration as the main StaggerConfig
export type StaggerConfig = EnhancedStaggerConfig

// Re-export supporting types for convenience
export type { StaggerStrategy, StaggerTiming, StaggerResult, GridOrigin }

// Legacy support: Keep existing enums for backward compatibility but mark as deprecated
/**
 * @deprecated Use StaggerStrategy type instead
 * Legacy enum maintained for backward compatibility
 */
export enum StaggerMode {
    TIMED = "timed", // Time-based staggering
    SCRUBBED = "scrubbed", // Scroll-based staggering
}

/**
 * @deprecated Use StaggerDirection type instead
 * Legacy enum maintained for backward compatibility.
 * Note: Values differ from new type - migration will be needed
 */
export enum StaggerDirection {
    NORMAL = "normal", // First to last
    REVERSE = "reverse", // Last to first
    CENTER_OUT = "centerOut", // Center to edges
    EDGES_IN = "edgesIn", // Edges to center
    RANDOM = "random", // Random order
}

/**
 * @deprecated Legacy grid configuration - replaced by enhanced StaggerConfig.advanced.grid
 * Maintained for backward compatibility during migration
 */
export interface GridStaggerConfig {
    rows: number
    columns: number
    direction: GridDirection
}

/**
 * @deprecated Legacy grid direction - replaced by enhanced grid strategy
 * Maintained for backward compatibility during migration
 */
export enum GridDirection {
    ROW_FIRST = "rowFirst",
    COLUMN_FIRST = "columnFirst",
    DIAGONAL = "diagonal",
}

//=======================================
//        ANIMATION STATE TYPES
//=======================================

/**
 * Runtime state of an animation
 * Used by AnimationStateManager for single source of truth
 * Updated for target-based state architecture
 */
export interface AnimationState {
    // Core state
    progress: number // 0.0 to 1.0 - current position (can overshoot for springs)
    targetProgress: number // 0.0 to 1.0 - intended destination (NEW! Target-based behavior)
    status: AnimationStatus
    direction: AnimationDirection
    elementId: string
    slotId: string
    lastUpdated: number
}

export enum AnimationStatus {
    IDLE = "idle",
    RUNNING = "running",
    PAUSED = "paused",
    COMPLETED = "completed",
}

export enum AnimationDirection {
    FORWARD = "forward",
    BACKWARD = "backward",
}

//=======================================
//        PROPERTY REGISTRY TYPES
//=======================================

/**
 * Property definition in the registry
 * Used by PropertyRegistry.ts
 */
export interface PropertyDefinition {
    key: string
    label: string
    type: PropertyType
    defaultValue: PropertyValue
    unit?: string
    min?: number
    max?: number
    step?: number
    options?: string[]
    category: PropertyCategory
}

export enum PropertyType {
    NUMBER = "number",
    STRING = "string",
    BOOLEAN = "boolean",
    COLOR = "color",
    ENUM = "enum",
}

export enum PropertyCategory {
    TRANSFORM = "transform",
    LAYOUT = "layout",
    APPEARANCE = "appearance",
    EFFECTS = "effects",
    TYPOGRAPHY = "typography",
}

//=======================================
//        FRAMER PROPERTY CONTROLS
//=======================================

/**
 * Main props interface for FAME component
 * What Framer passes to our component
 */

export interface FAMEProps {
    // Animation slots from property controls (in property controls format)
    // These will be converted to internal AnimationSlot[] via AnimationSlotAdapter
    animationSlots: any[] // Raw property controls format - converted by adapter
    hideFromCanvas:boolean,
    // Style slots from property controls (in property controls format)
    // These will be converted to internal StyleSlot[] and applied via InitialValueCoordinator
    styleSlots?: any[] // Raw property controls format - converted by adapter

    showFameElement?:boolean;
    // Global settings
    debug?: boolean
    disabled?: boolean

    // Canvas mode initial values setting
    showInitialValuesInCanvas?: boolean // Whether to show initial "from" values in Canvas mode (default: false)

    // 🚀 NEW: Canvas mode style slots setting
    showStyleSlotsInCanvas?: boolean // Whether to show style slots in Canvas mode (default: false)

    // NEW: Sophisticated debug configuration
    debugConfig?: DebugConfig

    // Children (for React component)
    children?: React.ReactNode
}

//=======================================
//        ADVANCED DEBUG SYSTEM
//=======================================

/**
 * Comprehensive debug configuration for targeted debugging
 * Replaces the single debug boolean with granular control
 */
export interface DebugConfig {
    // Master debug switch
    enabled: boolean

    // Information flow debugging
    dataFlow?: DataFlowDebug

    // Animation execution debugging
    animation?: AnimationDebug

    // State management debugging
    state?: StateDebug

    // DOM manipulation debugging
    dom?: DOMDebug

    // Performance debugging
    performance?: PerformanceDebug

    // Visual debugging aids
    visual?: VisualDebug
}

export interface DataFlowDebug {
    enabled: boolean
    logLevel: DebugLogLevel

    // Track data transformations
    propertyControls?: boolean // Property controls → AnimationSlot
    slotProcessing?: boolean // AnimationSlot → Animator input
    stateChanges?: boolean // State transitions
    eventFlow?: boolean // Event → Animation trigger
}

export interface AnimationDebug {
    enabled: boolean
    logLevel: DebugLogLevel

    // Animation execution details
    timing?: boolean // Timing calculations, frame rates
    easing?: boolean // Easing function applications
    staggering?: boolean // Stagger calculations
    properties?: boolean // Property value interpolations
    lifecycle?: boolean // Animation start/stop/complete
}

export interface StateDebug {
    enabled: boolean
    logLevel: DebugLogLevel

    // State management details
    progressTracking?: boolean // Animation progress (0-1)
    statusChanges?: boolean // Status transitions (idle/running/completed)
    stateValidation?: boolean // State validation errors
    synchronization?: boolean // Multi-element state sync
}

export interface DOMDebug {
    enabled: boolean
    logLevel: DebugLogLevel

    // DOM operations
    elementFinding?: boolean // Element selector resolution
    styleApplication?: boolean // CSS style changes
    transforms?: boolean // Transform matrix calculations
    eventHandling?: boolean // Event listener setup/teardown
}

export interface PerformanceDebug {
    enabled: boolean
    logLevel: DebugLogLevel

    // Performance monitoring
    frameRate?: boolean // Animation frame rates
    memoryUsage?: boolean // Memory consumption
    executionTime?: boolean // Function execution times
    batchOperations?: boolean // Style batching optimizations
}

export interface VisualDebug {
    enabled: boolean

    // Visual debugging aids (rendered in DOM)
    showTriggerElements?: boolean // Highlight trigger elements
    showAnimatedElements?: boolean // Highlight animated elements
    showBoundaries?: boolean // Show scroll trigger boundaries
    showStaggerOrder?: boolean // Show stagger sequence numbers
    showProgress?: boolean // Show animation progress bars
}

export enum DebugLogLevel {
    MINIMAL = "minimal", // Only critical debug info
    NORMAL = "normal", // Standard debug info
    VERBOSE = "verbose", // All debug info
    EXTREME = "extreme", // Everything including internal details
}

//=======================================
//        DEBUG UTILITIES
//=======================================

/**
 * Debug context for tracking information flow
 */
export interface DebugContext {
    operation: string // What operation is being debugged
    phase: DebugPhase // What phase of execution
    elementId?: string // Which element (if applicable)
    slotId?: string // Which animation slot (if applicable)
    componentId?: string // Which FAME component instance
    timestamp: number // When this debug event occurred
    metadata?: Record<string, any> // Additional context data
}

export enum DebugPhase {
    INITIALIZATION = "initialization",
    PROPERTY_PROCESSING = "property_processing",
    ELEMENT_FINDING = "element_finding",
    ANIMATION_SETUP = "animation_setup",
    ANIMATION_EXECUTION = "animation_execution",
    STATE_UPDATE = "state_update",
    CLEANUP = "cleanup",
}

/**
 * Debug performance measurement
 */
export interface DebugPerformanceMeasurement {
    operation: string
    startTime: number
    endTime: number
    duration: number
    memoryBefore?: number
    memoryAfter?: number
    metadata?: Record<string, any>
}

//=======================================
//        UTILITY TYPES
//=======================================

export type ElementReference = HTMLElement | null
export type ElementReferences = HTMLElement[]

export interface FAMEError {
    code: string
    message: string
    context?: Record<string, any>
}

export interface ValidationResult {
    isValid: boolean
    errors: FAMEError[]
    warnings?: string[]
}

// Note: This single file approach makes it easy to see all type dependencies
// and relationships. Can be split into separate files later if it becomes
// too large or complex.

//=======================================
//        INTERRUPT BEHAVIOR TYPES
//=======================================

/**
 * Interrupt behavior options for animation triggers
 * Controls how new animation triggers are handled when an animation is already running
 */
export enum InterruptBehavior {
    /** Cancel current animation and start new one immediately (current behavior) */
    IMMEDIATE = "immediate",

    /** Ignore new triggers while animation is playing */
    BLOCK = "block",

    /** Queue only the most recent trigger, execute when current completes */
    QUEUE_LATEST = "queueLatest",
}

/**
 * Queued animation intent for QUEUE_LATEST behavior
 */
export interface QueuedIntent {
    trigger: TriggerElement
    slot: AnimationSlot
    animatedElements: HTMLElement[]
    timestamp: number
}

//=======================================
//        STYLE SLOT TYPES
//=======================================

/**
 * StyleSlot configuration - For static CSS application (no animation)
 *
 * IMPORTANT: StyleSlots are completely separate from AnimationSlots
 * - Applied immediately on component mount (no timing/easing/interpolation)
 * - Uses InitialValueCoordinator for CSS application
 * - Reuses element targeting system but with different purpose
 * - Supports CSS validation and error reporting
 */
export interface StyleSlot {
    id: string
    name: string

    // Element targeting (reuses existing system)
    targetElements: AnimatedElement[] // Elements to apply styles to

    // Static CSS properties (no animation)
    styleProperties: StyleProperty[] // Array of CSS property-value pairs

    // Validation and error handling
    validationErrors?: StyleValidationError[]
}

/**
 * Individual CSS property-value pair for StyleSlots
 */
export interface StyleProperty {
    property: string // CSS property name (e.g., 'padding', 'font-size', 'border-radius')
    value: string // CSS value (e.g., '10px', 'calc(50% - 20px)', '#ff0000')
    unit?: string // Unit if applicable (px, %, em, etc.)

    // Validation tracking
    isValid?: boolean
    validationError?: string
}

/**
 * Style validation error tracking
 */
export interface StyleValidationError {
    property: string
    value: string
    error: string
    timestamp: number
}

/**
 * Property controls format for StyleSlots (from Framer UI)
 * This gets converted to internal StyleSlot format
 */
export interface StyleSlotInput {
    name: string
    targetElements: AnimatedElement[]
    activeProperties: string[] // Selected property names

    // Dynamic CSS property values (populated by property controls)
    [propertyName: string]: any // Each active property will have its value here
}

//=======================================
//        🎨 FEATURE 2B: TEXT EFFECTS SYSTEM
//=======================================

/**
 * Text processing configuration for advanced text animation effects
 *
 * @description
 * Simplified text processing with line-first architecture. The system automatically
 * creates the optimal split structure based on animateBy preference and maskLines setting.
 * No complex compound types - clean separation between user controls and internal logic.
 *
 * @architecture Line-First Simplified Approach
 * - animateBy: User-friendly control for animation targets (characters/words/lines)
 * - maskLines: Optional line masking for reveal effects
 * - Line foundation: Automatically created when masking is enabled
 * - Clean separation: User controls (animateBy/maskLines) vs internal logic (splitType)
 *
 * @version 2.3.0: Simplified Architecture
 * - Removed complex compound types (CHARS_LINES, WORDS_LINES)
 * - Focus on animateBy + maskLines as primary controls
 * - Automatic line foundation when needed
 * - Clean, predictable behavior
 */
export interface TextProcessingConfig {
    /** Enable text processing mode */
    enabled: boolean

    /** How to split text for animation - user-friendly control */
    animateBy: "characters" | "words" | "lines"

    /** Add line masking containers for reveal effects */
    maskLines: boolean

    /** Canvas mode compatibility settings */
    canvasMode?: TextCanvasConfig

    /** Text effects to apply (Phase 3) */
    textEffects?: TextEffect[]

    // 🔧 INTERNAL: Derived properties (not exposed in property controls)
    /** @internal Type of text splitting to perform - derived from animateBy */
    splitType?: TextSplitType

    /** @internal Preserve whitespace between words/characters - auto-managed */
    preserveWhitespace?: boolean

    /** @internal Wrap split elements in span tags for styling - auto-managed */
    wrapInSpans?: boolean

    /** @internal 🚨 CRITICAL: Flag to prevent infinite loops during re-splits */
    _isReSplit?: boolean

    /** @internal 🔥 CRITICAL: Flag to force fresh line detection during breakpoint changes */
    _forceLineRecalculation?: boolean
}

/**
 * Text splitting strategies
 *
 * @description Simplified splitting strategies aligned with animateBy controls.
 * The system always creates a line-based foundation when needed, then applies
 * additional character or word splitting based on the animateBy preference.
 *
 * @version 2.3.0 - Simplified Architecture
 * @phase Phase 1: characters, words, lines
 */
export enum TextSplitType {
    /** Split into individual characters */
    CHARACTERS = "characters",

    /** Split into individual words */
    WORDS = "words",

    /** Split into lines */
    LINES = "lines",
}

/**
 * Canvas mode specific text processing configuration
 *
 * @description
 * Canvas mode has different DOM structure and limitations.
 * These settings provide fallback behaviors and safety measures.
 */
export interface TextCanvasConfig {
    /** Enable text processing in Canvas mode (may have limitations) */
    enableInCanvas: boolean

    /** Fallback behavior when Canvas mode limits are hit */
    fallbackBehavior: TextCanvasFallback

    /** Maximum text length for Canvas mode processing */
    maxTextLength: number
}

/**
 * Canvas mode fallback strategies
 */
export enum TextCanvasFallback {
    /** Disable text processing, animate container element */
    ANIMATE_CONTAINER = "animateContainer",

    /** Show warning and skip animation */
    SKIP_WITH_WARNING = "skipWithWarning",

    /** Use simplified splitting (less DOM manipulation) */
    SIMPLIFIED_SPLIT = "simplifiedSplit",
}

/**
 * Text effect configuration (Phase 3)
 *
 * @description
 * Text-specific animation effects beyond standard CSS properties.
 * These are specialized animations designed for text content.
 */
export interface TextEffect {
    /** Type of text effect */
    type: TextEffectType

    /** Effect-specific configuration */
    config: Record<string, any>

    /** Enable this effect */
    enabled: boolean

    /** Effect timing (can override global timing) */
    timing?: EffectTimingConfig
}

/**
 * Available text effect types (Phase 3)
 */
export enum TextEffectType {
    /** Scramble text before revealing final text */
    TEXT_SCRAMBLE = "textScramble",

    /** Typewriter effect (reveal characters progressively) */
    TYPEWRITER = "typewriter",

    /** Reveal text with mask/clip animations */
    REVEAL = "reveal",

    /** Glitch effect with random character changes */
    GLITCH = "glitch",
}

/**
 * Text effect timing configuration
 */
export interface EffectTimingConfig {
    /** Duration for this effect in milliseconds */
    duration: number

    /** Delay before this effect starts */
    delay: number

    /** Easing function for this effect */
    easing: string
}

/**
 * Text splitting result metadata
 *
 * @description
 * Information about the text splitting process for debugging
 * and coordination with animation system.
 */
export interface TextSplitResult {
    /** Original text content */
    originalText: string

    /** Split elements created */
    splitElements: HTMLElement[]

    /** Split type used */
    splitType: TextSplitType

    /** Whether splitting was successful */
    success: boolean

    /** Error message if splitting failed */
    error?: string

    /** Metadata about the splitting process */
    metadata: {
        /** Total number of elements created */
        elementCount: number

        /** Original element that was split */
        originalElement: HTMLElement

        /** Container element for split elements */
        containerElement: HTMLElement

        /** Timestamp of splitting */
        timestamp: number
    }
}
