/**
 * @file DistanceCalculator.ts
 * @description Distance calculation utilities for grid-based staggering
 * 
 * @version 1.0.0 - Production Implementation
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { DistanceCalculator } from './DistanceCalculator.ts';
 * 
 * const calculator = new DistanceCalculator();
 * const gridResult = calculator.calculateGridDistances(gridResult, originPoint, 'euclidean');
 * 
 * console.log(`Max distance: ${gridResult.maxDistance}`);
 * gridResult.elements.forEach(el => console.log(`Element distance: ${el.distance}`));
 * ```
 */

import type { 
    GridDetectionResult, 
    GridElement, 
    Point, 
    GridDistanceMetric,
    GridStaggerResult 
} from '../types/StaggerTypes.ts';

// Module name for logging
const MODULE_NAME = "DistanceCalculator";

/**
 * Distance calculation utilities for grid staggering
 * 
 * @description
 * Sophisticated distance calculations for grid-based stagger delays.
 * Supports multiple distance metrics with proper normalization and scaling.
 * 
 * **Key Features:**
 * - Multiple distance calculation metrics (euclidean, manhattan, chebyshev, min)
 * - Proper distance normalization for delay calculations
 * - Edge-aware calculations for better edge origin handling
 * - Pixel-accurate distance calculations
 * - Performance optimized for large grids
 * 
 * **Distance Metrics:**
 * - **Euclidean**: Standard straight-line distance (most natural)
 * - **Manhattan**: City-block distance (grid-aligned effects)
 * - **Chebyshev**: Maximum dimension distance (square wave effects)
 * - **Min**: Minimum dimension distance (edge-aware)
 */
export class DistanceCalculator {
    /**
     * Calculate distances from origin to all elements
     * 
     * @description
     * Main entry point for distance calculations. Computes distances from a specified
     * origin point to all grid elements using the selected metric, with proper
     * normalization for stagger delay calculations.
     * 
     * **Algorithm Steps:**
     * 1. Calculate grid bounds in pixel coordinates
     * 2. Resolve origin point to pixel coordinates
     * 3. Calculate distance for each element using selected metric
     * 4. Normalize distances to 0-1 range for delay calculations
     * 5. Return updated grid result with distance information
     * 
     * @param gridResult - Grid detection result to calculate distances for
     * @param originPoint - Origin point in grid coordinates (0-based)
     * @param metric - Distance calculation metric to use
     * @returns Updated grid result with calculated distances
     */
    calculateGridDistances(
        gridResult: GridDetectionResult,
        originPoint: Point,
        metric: GridDistanceMetric = 'euclidean'
    ): GridDetectionResult {
        const { elements } = gridResult;
        
        if (elements.length === 0) {
            console.warn(`🔍 [${MODULE_NAME}] No elements to calculate distances for`);
            return gridResult;
        }
        
        console.log(`🔍 [${MODULE_NAME}] Calculating distances for ${elements.length} elements using ${metric} metric`);
        
        // Calculate grid bounds in pixel coordinates
        const gridBounds = this.calculateGridBounds(elements);
        console.log(`🔍 [${MODULE_NAME}] Grid bounds: left=${gridBounds.left}, right=${gridBounds.right}, top=${gridBounds.top}, bottom=${gridBounds.bottom}`);
        console.log(`🔍 [${MODULE_NAME}] Grid dimensions: ${gridBounds.width}px x ${gridBounds.height}px`);
        
        // Convert grid origin point to pixel coordinates
        const originPixel = this.resolveOriginPixelCoordinates(originPoint, gridResult, gridBounds);
        console.log(`🔍 [${MODULE_NAME}] Origin grid (${originPoint.x}, ${originPoint.y}) mapped to pixel (${originPixel.x.toFixed(1)}, ${originPixel.y.toFixed(1)})`);
        
        // Check if this is an edge origin for special handling
        const isEdgeOrigin = this.isEdgeOrigin(originPoint, gridResult);
        
        // Calculate distances for each element
        let maxDistance = 0;
        
        elements.forEach(element => {
            const elementCenter = this.getElementCenter(element.element);
            const distance = this.calculateDistance(originPixel, elementCenter, metric, isEdgeOrigin, originPoint, gridBounds);
            
            element.distance = distance;
            maxDistance = Math.max(maxDistance, distance);
            
            console.log(`🔍 [${MODULE_NAME}] Element at grid (${element.position.x}, ${element.position.y}), ` +
                       `pixel (${elementCenter.x.toFixed(1)}, ${elementCenter.y.toFixed(1)}), ` +
                       `distance: ${distance.toFixed(1)}`);
        });
        
        // Normalize distances to 0-1 range
        elements.forEach(element => {
            element.normalizedDistance = maxDistance > 0 ? element.distance / maxDistance : 0;
            
            console.log(`🔍 [${MODULE_NAME}] Element at (${element.position.x}, ${element.position.y}), ` +
                       `normalized distance: ${element.normalizedDistance.toFixed(3)}`);
        });
        
        // Return updated grid result
        return {
            ...gridResult,
            elements,
            maxDistance
        };
    }
    
    /**
     * Calculate distance between two points using specified metric
     * 
     * @description
     * Core distance calculation function supporting multiple metrics.
     * Includes special handling for edge origins and proper metric implementations.
     * 
     * @param p1 - First point (origin)
     * @param p2 - Second point (element center)
     * @param metric - Distance metric to use
     * @param isEdgeOrigin - Whether origin is at grid edge
     * @param gridOrigin - Original grid coordinates (for edge detection)
     * @param gridBounds - Grid bounds (for edge calculations)
     * @returns Calculated distance
     */
    private calculateDistance(
        p1: Point, 
        p2: Point, 
        metric: GridDistanceMetric = 'euclidean',
        isEdgeOrigin: boolean = false,
        gridOrigin?: Point,
        gridBounds?: { left: number; right: number; top: number; bottom: number; width: number; height: number }
    ): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        switch (metric) {
            case 'euclidean':
                return Math.sqrt(dx * dx + dy * dy);
                
            case 'manhattan':
                return Math.abs(dx) + Math.abs(dy);
                
            case 'chebyshev':
            case 'max':
                return Math.max(Math.abs(dx), Math.abs(dy));
                
            case 'min':
                // Special handling for edge origins
                if (isEdgeOrigin && gridOrigin && gridBounds) {
                    return this.calculateEdgeAwareMinDistance(p1, p2, gridOrigin, gridBounds);
                }
                return Math.min(Math.abs(dx), Math.abs(dy));
                
            default:
                console.warn(`🔍 [${MODULE_NAME}] Unknown distance metric: ${metric}, falling back to euclidean`);
                return Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    /**
     * Calculate edge-aware minimum distance for better edge origin handling
     * 
     * @description
     * Special distance calculation for minimum metric when origin is at an edge.
     * Uses the primary dimension distance for more intuitive stagger patterns.
     * 
     * @param originPixel - Origin point in pixels
     * @param elementPixel - Element center in pixels
     * @param gridOrigin - Grid coordinates of origin
     * @param gridBounds - Grid boundary information
     * @returns Edge-aware distance
     */
    private calculateEdgeAwareMinDistance(
        originPixel: Point,
        elementPixel: Point,
        gridOrigin: Point,
        gridBounds: { left: number; right: number; top: number; bottom: number }
    ): number {
        // Check which edge the origin is at
        const isAtLeftEdge = gridOrigin.x === 0;
        const isAtRightEdge = Math.abs(originPixel.x - gridBounds.right) < 5; // tolerance for right edge
        const isAtTopEdge = gridOrigin.y === 0;
        const isAtBottomEdge = Math.abs(originPixel.y - gridBounds.bottom) < 5; // tolerance for bottom edge
        const isVerticalCenter = Math.abs(gridOrigin.y * 2 - (gridBounds.bottom - gridBounds.top)) < 5;
        const isHorizontalCenter = Math.abs(gridOrigin.x * 2 - (gridBounds.right - gridBounds.left)) < 5;
        
        // For edge origins, use the distance along the primary dimension
        if ((isAtLeftEdge || isAtRightEdge) && isVerticalCenter) {
            // Left or right center: use horizontal distance
            return Math.abs(elementPixel.x - originPixel.x);
        } else if ((isAtTopEdge || isAtBottomEdge) && isHorizontalCenter) {
            // Top or bottom center: use vertical distance
            return Math.abs(elementPixel.y - originPixel.y);
        }
        
        // Default min behavior for other cases
        const dx = Math.abs(elementPixel.x - originPixel.x);
        const dy = Math.abs(elementPixel.y - originPixel.y);
        return Math.min(dx, dy);
    }
    
    /**
     * Check if origin point is at a grid edge
     * 
     * @description
     * Determines whether the origin point is positioned at any edge of the grid
     * for special distance calculation handling.
     * 
     * @param originPoint - Origin point in grid coordinates
     * @param gridResult - Grid detection result
     * @returns True if origin is at any edge
     */
    private isEdgeOrigin(originPoint: Point, gridResult: GridDetectionResult): boolean {
        const isAtLeftEdge = originPoint.x === 0;
        const isAtRightEdge = originPoint.x === gridResult.columns - 1;
        const isAtTopEdge = originPoint.y === 0;
        const isAtBottomEdge = originPoint.y === gridResult.rows - 1;
        
        return isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge;
    }
    
    /**
     * Calculate element center coordinates
     * 
     * @description
     * Gets the center point of an element for accurate distance calculations.
     * Uses the element's bounding rectangle to find the geometric center.
     * 
     * @param element - Element to get center for
     * @returns Center coordinates in pixels
     */
    private getElementCenter(element: HTMLElement): Point {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    
    /**
     * Calculate grid bounds from elements
     * 
     * @description
     * Determines the bounding rectangle that encompasses all grid elements
     * for accurate origin coordinate resolution.
     * 
     * @param elements - Grid elements to analyze
     * @returns Grid boundary rectangle with dimensions
     */
    private calculateGridBounds(elements: GridElement[]): {
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
    } {
        if (elements.length === 0) {
            return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
        }
        
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        
        elements.forEach(element => {
            const rect = element.pixelPosition;
            minX = Math.min(minX, rect.left);
            maxX = Math.max(maxX, rect.left + rect.width);
            minY = Math.min(minY, rect.top);
            maxY = Math.max(maxY, rect.top + rect.height);
        });
        
        return {
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Resolve origin point to pixel coordinates
     * 
     * @description
     * Converts grid-based origin coordinates to precise pixel coordinates
     * for accurate distance calculations. Handles edge cases and interpolation.
     * 
     * @param originPoint - Origin point in grid coordinates
     * @param gridResult - Grid detection result
     * @param gridBounds - Grid boundary information
     * @returns Origin point in pixel coordinates
     */
    private resolveOriginPixelCoordinates(
        originPoint: Point,
        gridResult: GridDetectionResult,
        gridBounds: { left: number; right: number; top: number; bottom: number; width: number; height: number }
    ): Point {
        const { columns, rows } = gridResult;
        
        // Handle edge positions precisely
        let originPixelX: number;
        let originPixelY: number;
        
        // X coordinate resolution
        if (originPoint.x === 0) {
            // Left edge
            originPixelX = gridBounds.left;
        } else if (originPoint.x === columns - 1) {
            // Right edge
            originPixelX = gridBounds.right;
        } else if (originPoint.x === (columns - 1) / 2) {
            // Horizontal center
            originPixelX = gridBounds.left + (gridBounds.width / 2);
        } else {
            // Interpolate proportionally
            const normalizedX = originPoint.x / Math.max(1, columns - 1);
            originPixelX = gridBounds.left + (normalizedX * gridBounds.width);
        }
        
        // Y coordinate resolution
        if (originPoint.y === 0) {
            // Top edge
            originPixelY = gridBounds.top;
        } else if (originPoint.y === rows - 1) {
            // Bottom edge
            originPixelY = gridBounds.bottom;
        } else if (originPoint.y === (rows - 1) / 2) {
            // Vertical center
            originPixelY = gridBounds.top + (gridBounds.height / 2);
        } else {
            // Interpolate proportionally
            const normalizedY = originPoint.y / Math.max(1, rows - 1);
            originPixelY = gridBounds.top + (normalizedY * gridBounds.height);
        }
        
        return { x: originPixelX, y: originPixelY };
    }
    
    /**
     * Normalize distances to 0-1 range
     * 
     * @description
     * Scales distance array to normalized 0-1 range for delay calculations.
     * Handles edge cases like identical distances or single elements.
     * 
     * @param distances - Raw distance array
     * @returns Normalized distances (0-1)
     */
    private normalizeDistances(distances: number[]): number[] {
        if (distances.length === 0) return [];
        
        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        const range = maxDistance - minDistance;
        
        if (range === 0) {
            // All distances are the same
            return distances.map(() => 0);
        }
        
        return distances.map(distance => (distance - minDistance) / range);
    }
    
    /**
     * Group elements by similar distances
     * 
     * @description
     * Groups elements with similar distances for simultaneous animation.
     * Uses tolerance to handle floating point precision issues.
     * 
     * @param elements - Elements with calculated distances
     * @param distances - Corresponding distance array
     * @param tolerance - Grouping tolerance for floating point issues
     * @returns Map of distance groups
     */
    groupByDistance(
        elements: HTMLElement[], 
        distances: number[], 
        tolerance: number = 0.01
    ): Map<number, HTMLElement[]> {
        const groups = new Map<number, HTMLElement[]>();
        
        elements.forEach((element, index) => {
            const distance = distances[index];
            const roundedDistance = Math.round(distance * 1000) / 1000; // Round to 3 decimal places
            
            if (!groups.has(roundedDistance)) {
                groups.set(roundedDistance, []);
            }
            groups.get(roundedDistance)!.push(element);
        });
        
        return groups;
    }
    
    /**
     * Calculate stagger delays for timed animations
     * 
     * @description
     * 🚨 FIXED: Implements progressive delay accumulation instead of total time spreading.
     * Each delay group is separated by 'amount' seconds for proper stagger timing.
     * 
     * 🚀 PHASE 1A: Enhanced with proper 2D grid stagger reversal support.
     * For reverse animations, "latest" elements (farthest from origin) start first.
     * 
     * **Algorithm**:
     * 1. Group elements by distance (elements at same distance animate together)
     * 2. Sort distance groups by their distance value
     * 3. 🚀 NEW: For reverse mode, flip the timing so latest elements start first
     * 4. Apply incremental delay: each group starts 'amount' seconds after previous
     * 5. Apply distribution easing to group positions
     * 
     * **Forward Mode**: delay = groupIndex * amount (closest → farthest)
     * **Reverse Mode**: delay = (maxGroupIndex - groupIndex) * amount (farthest → closest)
     * 
     * @param gridResult - Grid result with calculated distances
     * @param amount - Delay increment between consecutive animation groups (in seconds)
     * @param distribution - Easing function for delay distribution
     * @param isReverseAnimation - 🚀 NEW: Whether this is a reverse animation (default: false)
     * @returns Grid stagger result with corrected timing information
     */
    calculateTimedStaggerDelays(
        gridResult: GridDetectionResult,
        amount: number,
        distribution: string = 'linear',
        isReverseAnimation: boolean = false
    ): GridStaggerResult {
        const { elements } = gridResult;
        
        if (elements.length === 0) {
            console.warn(`🔍 [${MODULE_NAME}] No elements to calculate delays for`);
            return { elements: [], delays: [], boundaries: [] };
        }
        
        console.log(`🔍 [${MODULE_NAME}] 🚨 ENHANCED: Calculating progressive stagger delays for ${elements.length} elements with ${amount}s incremental delay, reverse=${isReverseAnimation}`);
        
        // 🚨 FIX: Group elements by their normalized distance (with tolerance for floating point issues)
        const tolerance = 0.001;
        const distanceGroups = new Map<number, GridElement[]>();
        
        elements.forEach(element => {
            // Round to 3 decimal places to handle floating point precision
            const roundedDistance = Math.round(element.normalizedDistance * 1000) / 1000;
            
            if (!distanceGroups.has(roundedDistance)) {
                distanceGroups.set(roundedDistance, []);
            }
            distanceGroups.get(roundedDistance)!.push(element);
        });
        
        // Sort the unique distances to determine animation order
        const uniqueDistances = Array.from(distanceGroups.keys()).sort((a, b) => a - b);
        
        console.log(`🔍 [${MODULE_NAME}] 🚨 ENHANCED: Found ${uniqueDistances.length} unique distance groups from ${elements.length} elements`);
        
        // 🚀 PHASE 1A: Calculate progressive delays with reverse mode support
        const maxGroupIndex = uniqueDistances.length - 1;
        
        const delays = elements.map(element => {
            // Round the normalized distance to match grouping
            const roundedDistance = Math.round(element.normalizedDistance * 1000) / 1000;
            
            // Find which group this element belongs to
            const groupIndex = uniqueDistances.indexOf(roundedDistance);
            
            // 🚀 CRITICAL ENHANCEMENT: Handle reverse animation timing
            let finalDelay: number;
            
            if (distribution === 'linear' || distribution === '') {
                if (isReverseAnimation) {
                    // 🚀 REVERSE MODE: Latest elements (farthest from origin) start first
                    // Flip the timing: maxGroupIndex becomes 0, 0 becomes maxGroupIndex
                    finalDelay = amount * (maxGroupIndex - groupIndex);
                    
                    console.log(`🔄 [${MODULE_NAME}] 🚀 REVERSE: Element at (${element.position.x}, ${element.position.y}), ` +
                               `distance group: ${groupIndex + 1}/${uniqueDistances.length}, ` +
                               `FLIPPED to position: ${maxGroupIndex - groupIndex + 1}/${uniqueDistances.length}, ` +
                               `reverse delay: ${finalDelay.toFixed(3)}s`);
                } else {
                    // FORWARD MODE: Progressive delay from closest to farthest
                    finalDelay = amount * groupIndex;
                    
                    console.log(`🔍 [${MODULE_NAME}] 🚨 FORWARD: Element at (${element.position.x}, ${element.position.y}), ` +
                               `distance group: ${groupIndex + 1}/${uniqueDistances.length}, ` +
                               `progressive delay: ${finalDelay.toFixed(3)}s`);
                }
            } else {
                // Future: Apply easing function to group position
                // Get normalized position in the sequence (0-1)
                const normalizedPosition = groupIndex / Math.max(1, uniqueDistances.length - 1);
                
                if (isReverseAnimation) {
                    // 🚀 REVERSE MODE: For easing, flip the normalized position
                    const flippedPosition = 1 - normalizedPosition;
                    finalDelay = amount * (maxGroupIndex - groupIndex);
                    
                    console.log(`🔄 [${MODULE_NAME}] 🚀 REVERSE: Element at (${element.position.x}, ${element.position.y}), ` +
                               `normalized position: ${normalizedPosition.toFixed(3)} → flipped: ${flippedPosition.toFixed(3)}, ` +
                               `reverse delay: ${finalDelay.toFixed(3)}s (${distribution} distribution)`);
                } else {
                    // FORWARD MODE: For now, fall back to linear for easing
                    finalDelay = amount * groupIndex;
                    
                    console.log(`🔍 [${MODULE_NAME}] 🚨 FORWARD: Element at (${element.position.x}, ${element.position.y}), ` +
                               `normalized position: ${normalizedPosition.toFixed(3)}, ` +
                               `progressive delay: ${finalDelay.toFixed(3)}s (${distribution} distribution)`);
                }
            }
            
            return finalDelay;
        });
        
        // 🚀 PHASE 1A: Log animation order for debugging (enhanced with reverse mode info)
        const elementsSortedByDelay = [...elements]
            .map((el, idx) => ({ ...el, delay: delays[idx] }))
            .sort((a, b) => a.delay - b.delay);
            
        const modeLabel = isReverseAnimation ? '🔄 REVERSE' : '▶️ FORWARD';
        console.log(`🔍 [${MODULE_NAME}] 🚀 ENHANCED: ${modeLabel} animation order:`);
        elementsSortedByDelay.forEach((el, idx) => {
            console.log(`${idx + 1}. Element at grid (${el.position.x}, ${el.position.y}), ` +
                       `delay: ${el.delay.toFixed(3)}s, distance: ${el.normalizedDistance.toFixed(3)}`);
        });
        
        // 🚀 PHASE 1A: Enhanced simultaneous animation group logging
        const delayGroups = new Map<number, number[]>();
        elementsSortedByDelay.forEach(el => {
            const roundedDelay = Math.round(el.delay * 1000) / 1000;
            if (!delayGroups.has(roundedDelay)) {
                delayGroups.set(roundedDelay, []);
            }
            delayGroups.get(roundedDelay)!.push(el.index);
        });
        
        console.log(`🔍 [${MODULE_NAME}] 🚀 ENHANCED: ${modeLabel} simultaneous animation groups:`);
        Array.from(delayGroups.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([delay, indices]) => {
                console.log(`Delay ${delay.toFixed(3)}s: Elements [${indices.join(', ')}]`);
            });
            
        // 🚀 PHASE 1A: Log reverse mode specifics for debugging
        if (isReverseAnimation) {
            console.log(`🔄 [${MODULE_NAME}] 🚀 REVERSE MODE: Latest elements (farthest from origin) start first!`);
            const firstElements = elementsSortedByDelay.slice(0, Math.min(3, elementsSortedByDelay.length));
            console.log(`🔄 [${MODULE_NAME}] First to animate (latest elements):`, 
                       firstElements.map(el => `(${el.position.x},${el.position.y})`).join(', '));
        }
        
        return {
            elements,
            delays,
            boundaries: [] // Not needed for timed animations
        };
    }
} 