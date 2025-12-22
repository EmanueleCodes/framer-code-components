/**
 * @file StaggerTypes.ts
 * @description Enhanced type definitions for the staggering system with order/direction separation
 * 
 * @version 2.0.0
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // New architecture: Separate element order from animation direction
 * const config: StaggerConfig = {
 *   enabled: true,
 *   strategy: 'linear',
 *   delay: 0.1,
 *   order: {
 *     forward: 'center-out',    // When animating 0 → 1
 *     backward: 'edges-in'      // When animating 1 → 0
 *   }
 * };
 * ```
 */

/**
 * Stagger strategy types
 * 
 * @description
 * Defines the different staggering calculation strategies:
 * - linear: Sequential delays based on element order
 * - grid: Distance-based delays for grid layouts
 * - random: Randomized delays with optional seed
 */
export type StaggerStrategy = 'linear' | 'grid' | 'random';

/**
 * Element sequencing order options
 * 
 * @description
 * Controls the order in which elements are sequenced for staggered animations.
 * This is separate from animation direction (forward/backward progression).
 * 
 * @since 2.0.0 - Renamed from StaggerDirection to clarify separation of concerns
 * 
 * Order types:
 * - first-to-last: Elements animate in DOM/array order
 * - last-to-first: Elements animate in reverse DOM/array order
 * - center-out: Center elements animate first, then outward
 * - edges-in: Edge elements animate first, then inward
 * - random: Elements animate in randomized order (with optional seed)
 * - custom: User-defined animation sequence (future feature)
 */
export type StaggerOrder = 'first-to-last' | 'last-to-first' | 'center-out' | 'edges-in' | 'random' | 'custom';

/**
 * Directional stagger configuration
 * 
 * @description
 * Allows different element orders for forward vs backward animations.
 * This enables powerful configurations like "forward goes center-out, backward goes edges-in".
 * 
 * @since 2.0.0 - New architecture separating order from direction
 * 
 * @example
 * ```typescript
 * // Different orders for different animation directions
 * const directionalOrder: DirectionalStaggerConfig = {
 *   forward: 'center-out',   // When progressing 0 → 1
 *   backward: 'edges-in'     // When progressing 1 → 0
 * };
 * ```
 */
export interface DirectionalStaggerConfig {
    /** Element order when animation progresses forward (0 → 1) */
    forward: StaggerOrder;
    
    /** Element order when animation progresses backward (1 → 0) */
    backward: StaggerOrder;
}

/**
 * 🆕 NEW: Grid stagger mode types
 * 
 * @description
 * Defines how stagger animation spreads across the grid:
 * - point-based: Distance-based from origin points (existing system)
 * - row-based: Horizontal wave animations across rows
 * - column-based: Vertical wave animations across columns
 */
export type GridStaggerMode = 'point-based' | 'row-based' | 'column-based';

/**
 * 🆕 NEW: Row wave direction types
 * 
 * @description
 * Direction options for row-based wave animations:
 * - top-to-bottom: Wave starts from top row, moves down
 * - bottom-to-top: Wave starts from bottom row, moves up
 * - center-out-rows: Wave starts from center row, spreads to edges
 * - edges-in-rows: Wave starts from top/bottom rows, converges to center
 */
export type GridRowDirection = 'top-to-bottom' | 'bottom-to-top' | 'center-out-rows' | 'edges-in-rows';

/**
 * 🆕 NEW: Column wave direction types
 * 
 * @description
 * Direction options for column-based wave animations:
 * - left-to-right: Wave starts from left column, moves right
 * - right-to-left: Wave starts from right column, moves left
 * - center-out-columns: Wave starts from center column, spreads to edges
 * - edges-in-columns: Wave starts from left/right columns, converges to center
 */
export type GridColumnDirection = 'left-to-right' | 'right-to-left' | 'center-out-columns' | 'edges-in-columns';

/**
 * Grid origin points for distance calculations
 * 
 * @description
 * Starting points for grid-based stagger calculations:
 * - center: From grid center outward
 * - top-left: From top-left corner
 * - top-center: From top edge center
 * - top-right: From top-right corner
 * - center-left: From left edge center
 * - center-right: From right edge center
 * - bottom-left: From bottom-left corner
 * - bottom-center: From bottom edge center
 * - bottom-right: From bottom-right corner
 * - first: From first element position
 * - last: From last element position
 * - random: From random element position
 */
export type GridOrigin = 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'first' | 'last' | 'random';

/**
 * Grid distance calculation metrics
 * 
 * @description
 * Different metrics for calculating distances between grid elements:
 * - euclidean: Standard straight-line distance
 * - manhattan: City-block distance (sum of horizontal and vertical)
 * - chebyshev: Maximum of horizontal and vertical distances
 * - min: Minimum of horizontal and vertical distances
 */
export type GridDistanceMetric = 'euclidean' | 'manhattan' | 'chebyshev' | 'max' | 'min';

/**
 * 🚀 NEW: Grid reverse behavior modes for Phase 1A
 * 
 * @description
 * Controls how reverse animations behave for grid staggering:
 * - same-origin: Reverse animation starts from the same origin point (traditional behavior)
 * - latest-elements: Reverse animation starts from the latest/farthest elements (Phase 1A behavior)
 * 
 * @example
 * ```typescript
 * // Traditional behavior - reverse starts from same origin
 * const sameOriginConfig = { reverseMode: 'same-origin' };
 * 
 * // Phase 1A behavior - reverse starts from farthest elements
 * const latestElementsConfig = { reverseMode: 'latest-elements' };
 * ```
 */
export type GridReverseMode = 'same-origin' | 'latest-elements';

/**
 * Point coordinates for grid calculations
 * 
 * @description
 * Simple 2D point with x,y coordinates used in grid stagger calculations.
 */
export interface Point {
    /** X coordinate */
    x: number;
    
    /** Y coordinate */
    y: number;
}

/**
 * Grid element with position and distance information
 * 
 * @description
 * Extended element information used in grid stagger calculations,
 * including grid position, pixel position, and calculated distances.
 */
export interface GridElement {
    /** HTML element reference */
    element: HTMLElement;
    
    /** Element's position in the grid (0-based) */
    position: Point;
    
    /** Element's pixel position and dimensions */
    pixelPosition: DOMRect;
    
    /** Calculated distance from origin */
    distance: number;
    
    /** Normalized distance (0-1) for delay calculations */
    normalizedDistance: number;
    
    /** Original index in element array */
    index: number;
}

/**
 * Grid detection result
 * 
 * @description
 * Complete result from grid auto-detection including dimensions,
 * positioned elements, and metadata for distance calculations.
 */
export interface GridDetectionResult {
    /** Number of rows detected */
    rows: number;
    
    /** Number of columns detected */
    columns: number;
    
    /** Array of positioned grid elements */
    elements: GridElement[];
    
    /** Default origin point for the grid */
    originPoint: Point;
    
    /** Maximum distance found (for normalization) */
    maxDistance: number;
}

/**
 * Grid stagger calculation result
 * 
 * @description
 * Result from grid-based stagger calculations with timing information
 * and grid metadata for debugging and validation.
 */
export interface GridStaggerResult {
    /** Array of grid elements with timing */
    elements: GridElement[];
    
    /** Array of calculated delays (in seconds) */
    delays: number[];
    
    /** Scroll boundaries (for scroll-based staggering) */
    boundaries: number[];
}

/**
 * Enhanced stagger configuration interface
 * 
 * @description
 * Progressive disclosure configuration for staggering animations.
 * Version 2.0 introduces directional order configuration for advanced control.
 * 
 * @version 2.0.0 - Added directional order configuration
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // Basic configuration
 * const basicConfig: StaggerConfig = {
 *   enabled: true,
 *   delay: 0.1,
 *   strategy: 'linear',
 *   order: {
 *     forward: 'first-to-last',
 *     backward: 'last-to-first'
 *   }
 * };
 * 
 * // Advanced configuration with different orders per direction
 * const advancedConfig: StaggerConfig = {
 *   enabled: true,
 *   delay: 0.1,
 *   strategy: 'linear',
 *   order: {
 *     forward: 'center-out',
 *     backward: 'edges-in'
 *   },
 *   advanced: {
 *     random: { seed: 42 }
 *   }
 * };
 * ```
 */
export interface StaggerConfig {
    /** Enable/disable staggering */
    enabled: boolean;
    
    /** Base delay between elements (in seconds) */
    delay: number;
    
    /** Stagger calculation strategy */
    strategy: StaggerStrategy;
    
    /** 🚀 NEW: Directional order configuration (replaces simple direction) */
    order: DirectionalStaggerConfig;
    
            /** Advanced options (hidden by default in property controls) */
        advanced?: {
            /** Apply easing to stagger timing distribution */
            distribution?: string; // TODO: Define proper easing type
            
            /** Grid-specific options */
            grid?: {
                /** Origin point for distance calculations (point-based mode) */
                origin: GridOrigin;
                
                /** Auto-detect grid layout */
                autoDetect: boolean;
                
                /** 🆕 NEW: Grid stagger mode */
                mode?: GridStaggerMode;
                
                /** 🆕 NEW: Row wave configuration (when mode = 'row-based') */
                rowDirection?: GridRowDirection;
                
                /** 🆕 NEW: Column wave configuration (when mode = 'column-based') */
                columnDirection?: GridColumnDirection;
                
                /** 🆕 NEW Phase 1B: Column tolerance for word-based alignment (pixels) */
                columnTolerance?: number;
                
                /** Distance metric (for point-based mode) */
                distanceMetric?: GridDistanceMetric;
                
                /** 🚀 NEW: Grid reverse behavior - how reverse animations should start */
                reverseMode?: GridReverseMode;
            };
        
        /** Random-specific options */
        random?: {
            /** Seed for stable randomization */
            seed?: number;
        };
    };
    
    /** TODO: Future scroll stagger configuration */
    scroll?: {
        /** Enable scroll-based staggering */
        enabled: boolean;
        
        /** Scroll trigger settings */
        trigger?: {
            /** Viewport offset for trigger */
            offset: number;
            
            /** Threshold mode settings */
            threshold?: number;
        };
    };
}

/**
 * Element position data for spatial order calculations
 * 
 * @description
 * Contains element positioning information used for center-out, edges-in,
 * and other spatial stagger order calculations.
 * 
 * @since 2.0.0 - New for spatial order calculations
 */
export interface ElementPosition {
    /** Element reference */
    element: HTMLElement;
    
    /** Element index in original array */
    index: number;
    
    /** Element bounding box */
    bounds: DOMRect;
    
    /** Center point coordinates */
    center: {
        x: number;
        y: number;
    };
    
    /** Distance from container center (for center-out/edges-in) */
    distanceFromCenter?: number;
    
    /** Distance from container edges (for edges-in calculations) */
    distanceFromEdges?: number;
}

/**
 * Calculated stagger timing for an element
 * 
 * @description
 * Results from stagger calculation, containing timing offset
 * and optional metadata for debugging and validation.
 * 
 * @version 2.0.0 - Enhanced with order metadata
 */
export interface StaggerTiming {
    /** Element reference */
    element: HTMLElement;
    
    /** Calculated delay offset (in seconds) */
    delay: number;
    
    /** Element index in original array */
    index: number;
    
    /** 🚀 NEW: Element index in calculated order sequence */
    orderIndex: number;
    
    /** Metadata for debugging */
    metadata?: {
        /** Order used for this calculation */
        order?: StaggerOrder;
        
        /** Animation direction when calculated */
        animationDirection?: 'forward' | 'backward';
        
        /** Distance from origin (for spatial orders) */
        distance?: number;
        
        /** Grid position (for grid strategy) */
        gridPosition?: { row: number; col: number };
        
        /** Random seed used (for random order) */
        randomSeed?: number;
        
        /** Element position data (for spatial orders) */
        position?: ElementPosition;
        
        /** 🚀 NEW: Group information for simultaneous animations */
        groupIndex?: number;
        
        /** Size of the group this element belongs to */
        groupSize?: number;
        
        /** Position within the group (for elements with same delay) */
        positionInGroup?: number;
    };
}

/**
 * Stagger calculation result
 * 
 * @description
 * Complete result from stagger calculation including
 * timing array and optional grid detection information.
 * 
 * @version 2.0.0 - Enhanced with order information
 */
export interface StaggerResult {
    /** Array of calculated timings for each element */
    timings: StaggerTiming[];
    
    /** Total stagger duration */
    totalDuration: number;
    
    /** 🚀 NEW: Order configuration used */
    orderUsed: StaggerOrder;
    
    /** 🚀 NEW: Animation direction for this calculation */
    animationDirection: 'forward' | 'backward';
    
    /** Grid information (if grid strategy used) */
    gridInfo?: {
        /** Detected grid dimensions */
        dimensions: { rows: number; cols: number };
        
        /** Grid origin coordinates */
        origin: { x: number; y: number };
        
        /** Auto-detection confidence (0-1) */
        confidence: number;
    };
    
    /** 🚀 NEW: Spatial information (for spatial orders) */
    spatialInfo?: {
        /** Container bounds used for calculations */
        containerBounds: DOMRect;
        
        /** Container center point */
        containerCenter: { x: number; y: number };
        
        /** Element positions used in calculation */
        elementPositions: ElementPosition[];
    };
}

// =============================================================================
// MIGRATION AND COMPATIBILITY
// =============================================================================

/**
 * @deprecated Use StaggerOrder instead
 * Legacy type maintained for backward compatibility during migration
 * 
 * @since 1.0.0
 * @deprecated 2.0.0 - Use StaggerOrder instead
 */
export type StaggerDirection = 'forward' | 'reverse' | 'center-out' | 'edges-in' | 'random';

/**
 * Legacy stagger configuration for backward compatibility
 * 
 * @deprecated Use StaggerConfig with DirectionalStaggerConfig instead
 * @since 1.0.0
 * @deprecated 2.0.0
 */
export interface LegacyStaggerConfig {
    enabled: boolean;
    delay: number;
    strategy: StaggerStrategy;
    /** @deprecated Use order.forward and order.backward instead */
    direction: StaggerDirection;
}

/**
 * Migration utility: Convert legacy direction to directional order config
 * 
 * @description
 * Converts old single-direction configuration to new directional configuration.
 * Maintains backward compatibility while enabling new features.
 * 
 * @param legacyDirection - Old direction value
 * @returns New directional order configuration
 * 
 * @example
 * ```typescript
 * // Migration example
 * const oldConfig = { direction: 'reverse' };
 * const newConfig = {
 *   order: migrateLegacyDirection(oldConfig.direction)
 * };
 * // Result: { forward: 'last-to-first', backward: 'first-to-last' }
 * ```
 */
export function migrateLegacyDirection(legacyDirection: StaggerDirection): DirectionalStaggerConfig {
    const migrationMap: Record<StaggerDirection, DirectionalStaggerConfig> = {
        'forward': {
            forward: 'first-to-last',
            backward: 'last-to-first'
        },
        'reverse': {
            forward: 'last-to-first', 
            backward: 'first-to-last'
        },
        'center-out': {
            forward: 'center-out',
            backward: 'center-out'
        },
        'edges-in': {
            forward: 'edges-in',
            backward: 'edges-in'
        },
        'random': {
            forward: 'random',
            backward: 'random'
        }
    };
    
    return migrationMap[legacyDirection];
}

/**
 * Migration utility: Convert legacy stagger config to new format
 * 
 * @param legacyConfig - Legacy configuration
 * @returns New configuration format
 */
export function migrateLegacyStaggerConfig(legacyConfig: LegacyStaggerConfig): StaggerConfig {
    return {
        enabled: legacyConfig.enabled,
        delay: legacyConfig.delay,
        strategy: legacyConfig.strategy,
        order: migrateLegacyDirection(legacyConfig.direction)
    };
} 