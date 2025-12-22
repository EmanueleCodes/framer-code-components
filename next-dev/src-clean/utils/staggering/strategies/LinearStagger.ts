/**
 * @file LinearStagger.ts
 * @description Enhanced linear staggering with advanced order calculations
 * 
 * @version 2.0.0
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // Basic linear stagger
 * const stagger = new LinearStagger();
 * const result = stagger.calculateTimedDelays(elements, {
 *   enabled: true,
 *   delay: 0.1,
 *   strategy: 'linear',
 *   order: {
 *     forward: 'first-to-last',
 *     backward: 'last-to-first'
 *   }
 * }, 'forward');
 * 
 * // Advanced spatial stagger
 * const spatialResult = stagger.calculateTimedDelays(elements, {
 *   enabled: true,
 *   delay: 0.1,
 *   strategy: 'linear',
 *   order: {
 *     forward: 'center-out',
 *     backward: 'edges-in'
 *   }
 * }, 'backward');
 * ```
 */

import type { 
    StaggerConfig, 
    StaggerTiming, 
    StaggerResult, 
    StaggerOrder, 
    ElementPosition 
} from '../types/StaggerTypes.ts';

/**
 * Element group for simultaneous animation
 * 
 * @description
 * Groups elements that should animate at the same time (same delay).
 * Used for spatial orders where elements at the same distance animate together.
 */
interface ElementGroup {
    /** Indices of elements in this group */
    elements: number[];
    
    /** Distance value for this group (for spatial orders) */
    distance?: number;
    
    /** Order index for this group */
    groupOrderIndex: number;
}

/**
 * Enhanced linear staggering strategy implementation
 * 
 * @description
 * Calculates sequential delays for elements based on their order with support for:
 * - Basic orders: first-to-last, last-to-first
 * - Spatial orders: center-out, edges-in
 * - Random orders: randomized sequence with optional seed
 * - Directional configuration: different orders for forward vs backward animations
 * 
 * @version 2.0.0 - Enhanced with advanced order calculations
 * @since 1.0.0
 */
export class LinearStagger {
    /**
     * Calculate timed delays for linear staggering with advanced order support
     * 
     * @description
     * Main entry point for linear stagger calculations. Supports all order types
     * and directional configuration for different animation directions.
     * 
     * @param elements - Array of elements to stagger
     * @param config - Enhanced stagger configuration
     * @param animationDirection - Animation direction for order resolution
     * @returns Complete stagger result with timing and metadata
     */
    calculateTimedDelays(
        elements: HTMLElement[], 
        config: StaggerConfig, 
        animationDirection: 'forward' | 'backward' = 'forward'
    ): StaggerResult {
        // 🔍 STAGGER DEBUG: Log LinearStagger entry point
        console.log(`🔍 [LINEAR-STAGGER-DEBUG] calculateTimedDelays called:`, {
            elementCount: elements.length,
            configEnabled: config.enabled,
            animationDirection,
            configOrder: config.order,
            configDelay: config.delay
        });
        
        if (!config.enabled || elements.length === 0) {
            console.log(`🔍 [LINEAR-STAGGER-DEBUG] Early return - disabled or no elements`);
            return {
                timings: [],
                totalDuration: 0,
                orderUsed: 'first-to-last',
                animationDirection
            };
        }

        // Resolve order based on animation direction
        const orderToUse = animationDirection === 'forward' 
            ? config.order.forward 
            : config.order.backward;
        
        // 🔍 STAGGER DEBUG: Log order resolution
        console.log(`🔍 [LINEAR-STAGGER-DEBUG] Order resolved:`, {
            animationDirection,
            forwardOrder: config.order.forward,
            backwardOrder: config.order.backward,
            orderToUse
        });

        // Calculate element positions for spatial orders
        const elementPositions = this.needsPositioning(orderToUse) 
            ? this.calculateElementPositions(elements)
            : [];

        // Calculate element groups (for simultaneous animations)
        const elementGroups = this.calculateElementGroups(elements, orderToUse, elementPositions, config);

        // Generate timing data with grouped delays
        const timings: StaggerTiming[] = [];
        let currentOrderIndex = 0;

        elementGroups.forEach((group, groupIndex) => {
            const groupDelay = groupIndex * config.delay;
            
            group.elements.forEach((elementIndex, positionInGroup) => {
                const element = elements[elementIndex];
                const position = elementPositions.find(pos => pos.index === elementIndex);

                timings.push({
                    element,
                    delay: groupDelay, // Same delay for all elements in group
                    index: elementIndex,
                    orderIndex: currentOrderIndex,
                    metadata: {
                        order: orderToUse,
                        animationDirection,
                        position,
                        groupIndex,
                        groupSize: group.elements.length,
                        positionInGroup,
                        ...(group.distance !== undefined && { distance: group.distance }),
                        ...(orderToUse === 'random' && config.advanced?.random?.seed && {
                            randomSeed: config.advanced.random.seed
                        })
                    }
                });
                
                currentOrderIndex++;
            });
        });

        // Calculate total duration
        const totalDuration = Math.max(...timings.map(t => t.delay)) + config.delay;

        const result: StaggerResult = {
            timings,
            totalDuration,
            orderUsed: orderToUse,
            animationDirection
        };

        // Add spatial information for spatial orders
        if (elementPositions.length > 0) {
            const containerBounds = this.calculateContainerBounds(elements);
            result.spatialInfo = {
                containerBounds,
                containerCenter: {
                    x: containerBounds.left + containerBounds.width / 2,
                    y: containerBounds.top + containerBounds.height / 2
                },
                elementPositions
            };
        }

        return result;
    }

    /**
     * Calculate element groups for simultaneous animations
     * 
     * @description
     * Groups elements that should animate at the same time (same delay).
     * For spatial orders, groups elements by distance. For linear orders,
     * each element gets its own group.
     * 
     * @param elements - Original element array
     * @param order - Stagger order type
     * @param positions - Element positions (for spatial orders)
     * @param config - Stagger configuration
     * @returns Array of element groups with timing information
     */
    private calculateElementGroups(
        elements: HTMLElement[], 
        order: StaggerOrder, 
        positions: ElementPosition[],
        config: StaggerConfig
    ): ElementGroup[] {
        switch (order) {
            case 'first-to-last':
                return this.createLinearGroups(elements.length, false);

            case 'last-to-first':
                return this.createLinearGroups(elements.length, true);

            case 'center-out':
                return this.createSpatialGroups(elements, positions, 'center-out');

            case 'edges-in':
                return this.createSpatialGroups(elements, positions, 'edges-in');

            case 'random':
                return this.createRandomGroups(elements.length, config.advanced?.random?.seed);

            case 'custom':
                console.warn('Custom order not yet implemented, falling back to first-to-last');
                return this.createLinearGroups(elements.length, false);

            default:
                console.warn(`Unknown order type: ${order}, falling back to first-to-last`);
                return this.createLinearGroups(elements.length, false);
        }
    }

    /**
     * Create linear groups (one element per group)
     * 
     * @param elementCount - Number of elements
     * @param reverse - Whether to reverse the order
     * @returns Array of single-element groups
     */
    private createLinearGroups(elementCount: number, reverse: boolean): ElementGroup[] {
        const indices = Array.from({ length: elementCount }, (_, i) => i);
        if (reverse) indices.reverse();

        return indices.map((elementIndex, groupOrderIndex) => ({
            elements: [elementIndex],
            groupOrderIndex
        }));
    }

    /**
     * Create spatial groups based on distance calculations
     * 
     * @param elements - Element array
     * @param positions - Element positions with distance calculations
     * @param spatialOrder - Spatial order type
     * @returns Array of distance-based groups
     */
    private createSpatialGroups(
        elements: HTMLElement[], 
        positions: ElementPosition[], 
        spatialOrder: 'center-out' | 'edges-in'
    ): ElementGroup[] {
        // 🔍 STAGGER DEBUG: Log spatial group creation
        console.log(`🔍 [LINEAR-STAGGER-DEBUG] Creating spatial groups:`, {
            spatialOrder,
            elementCount: elements.length,
            positionsCount: positions.length,
            firstPositionDistance: positions[0]?.distanceFromCenter?.toFixed(3),
            lastPositionDistance: positions[positions.length - 1]?.distanceFromCenter?.toFixed(3)
        });
        
        if (positions.length === 0) {
            console.warn(`${spatialOrder} order requires element positions, falling back to linear`);
            console.log(`🔍 [LINEAR-STAGGER-DEBUG] Falling back to linear groups due to missing positions`);
            return this.createLinearGroups(elements.length, false);
        }

        // Group elements by distance (rounded to avoid floating point issues)
        const distanceGroups = new Map<number, number[]>();
        const tolerance = 1; // 1px tolerance for grouping

        positions.forEach(pos => {
            const distance = pos.distanceFromCenter || 0;
            const roundedDistance = Math.round(distance / tolerance) * tolerance;
            
            if (!distanceGroups.has(roundedDistance)) {
                distanceGroups.set(roundedDistance, []);
            }
            distanceGroups.get(roundedDistance)!.push(pos.index);
        });

        // Sort distances and create groups
        const sortedDistances = Array.from(distanceGroups.keys()).sort((a, b) => {
            return spatialOrder === 'center-out' ? a - b : b - a;
        });
        
        // 🔍 STAGGER DEBUG: Log spatial grouping results
        console.log(`🔍 [LINEAR-STAGGER-DEBUG] Spatial grouping result:`, {
            spatialOrder,
            totalDistances: sortedDistances.length,
            distanceGroups: sortedDistances.map(distance => ({
                distance: distance.toFixed(1),
                elementCount: distanceGroups.get(distance)!.length,
                elementIndices: distanceGroups.get(distance)!
            })),
            sortDirection: spatialOrder === 'center-out' ? 'ascending (center-out)' : 'descending (edges-in)'
        });

        return sortedDistances.map((distance, groupOrderIndex) => ({
            elements: distanceGroups.get(distance)!,
            distance,
            groupOrderIndex
        }));
    }

    /**
     * Create random groups (one element per group, random order)
     * 
     * @param elementCount - Number of elements
     * @param seed - Optional seed for stable randomization
     * @returns Array of single-element groups in random order
     */
    private createRandomGroups(elementCount: number, seed?: number): ElementGroup[] {
        const randomOrder = this.calculateRandomOrder(elementCount, seed);
        
        return randomOrder.map((elementIndex, groupOrderIndex) => ({
            elements: [elementIndex],
            groupOrderIndex
        }));
    }

    /**
     * @deprecated Use calculateElementGroups instead
     * Legacy method maintained for potential backward compatibility
     */
    private calculateElementOrder(
        elements: HTMLElement[], 
        order: StaggerOrder, 
        positions: ElementPosition[],
        config: StaggerConfig
    ): number[] {
        const groups = this.calculateElementGroups(elements, order, positions, config);
        return groups.flatMap(group => group.elements);
    }

    /**
     * Calculate center-out order: elements closest to center animate first
     * 
     * @param elements - Element array
     * @param positions - Element positions with distance calculations
     * @returns Ordered array of original indices
     */
    private calculateCenterOutOrder(elements: HTMLElement[], positions: ElementPosition[]): number[] {
        if (positions.length === 0) {
            console.warn('Center-out order requires element positions, falling back to first-to-last');
            return Array.from({ length: elements.length }, (_, i) => i);
        }

        // Sort by distance from center (closest first)
        return positions
            .sort((a, b) => (a.distanceFromCenter || 0) - (b.distanceFromCenter || 0))
            .map(pos => pos.index);
    }

    /**
     * Calculate edges-in order: elements farthest from center (at edges) animate first
     * 
     * @param elements - Element array
     * @param positions - Element positions with distance calculations
     * @returns Ordered array of original indices
     */
    private calculateEdgesInOrder(elements: HTMLElement[], positions: ElementPosition[]): number[] {
        if (positions.length === 0) {
            console.warn('Edges-in order requires element positions, falling back to first-to-last');
            return Array.from({ length: elements.length }, (_, i) => i);
        }

        // Sort by distance from center (farthest first)
        return positions
            .sort((a, b) => (b.distanceFromCenter || 0) - (a.distanceFromCenter || 0))
            .map(pos => pos.index);
    }

    /**
     * Generate stable random order with optional seed
     * 
     * @param elementCount - Number of elements
     * @param seed - Optional seed for stable randomization
     * @returns Random order indices
     */
    private calculateRandomOrder(elementCount: number, seed?: number): number[] {
        const indices = Array.from({ length: elementCount }, (_, i) => i);
        
        // Simple seeded random number generator (Linear Congruential Generator)
        let rng = seed ?? Math.floor(Math.random() * 1000000);
        const random = () => {
            rng = (rng * 1664525 + 1013904223) % Math.pow(2, 32);
            return rng / Math.pow(2, 32);
        };

        // Fisher-Yates shuffle with seeded random
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        return indices;
    }

    /**
     * Calculate element positions for spatial order calculations
     * 
     * @param elements - Elements to analyze
     * @returns Array of element positions with distance calculations
     */
    private calculateElementPositions(elements: HTMLElement[]): ElementPosition[] {
        if (elements.length === 0) return [];

        // Calculate container bounds
        const containerBounds = this.calculateContainerBounds(elements);
        const containerCenter = {
            x: containerBounds.left + containerBounds.width / 2,
            y: containerBounds.top + containerBounds.height / 2
        };

        return elements.map((element, index) => {
            const bounds = element.getBoundingClientRect();
            const center = {
                x: bounds.left + bounds.width / 2,
                y: bounds.top + bounds.height / 2
            };

            // Calculate distance from container center
            const distanceFromCenter = Math.sqrt(
                Math.pow(center.x - containerCenter.x, 2) + 
                Math.pow(center.y - containerCenter.y, 2)
            );

            // Calculate distance from container edges (minimum distance to any edge)
            const distanceFromEdges = Math.min(
                center.x - containerBounds.left,         // left edge
                containerBounds.right - center.x,        // right edge
                center.y - containerBounds.top,          // top edge
                containerBounds.bottom - center.y        // bottom edge
            );

            return {
                element,
                index,
                bounds,
                center,
                distanceFromCenter,
                distanceFromEdges
            };
        });
    }

    /**
     * Calculate the bounding box that contains all elements
     * 
     * @param elements - Elements to analyze
     * @returns Combined bounding rectangle
     */
    private calculateContainerBounds(elements: HTMLElement[]): DOMRect {
        if (elements.length === 0) {
            return new DOMRect(0, 0, 0, 0);
        }

        const rects = elements.map(el => el.getBoundingClientRect());
        
        const left = Math.min(...rects.map(rect => rect.left));
        const top = Math.min(...rects.map(rect => rect.top));
        const right = Math.max(...rects.map(rect => rect.right));
        const bottom = Math.max(...rects.map(rect => rect.bottom));

        return new DOMRect(left, top, right - left, bottom - top);
    }

    /**
     * Check if an order type requires element positioning calculations
     * 
     * @param order - Order type to check
     * @returns True if positioning is needed
     */
    private needsPositioning(order: StaggerOrder): boolean {
        return order === 'center-out' || order === 'edges-in';
    }

    /**
     * Apply distribution easing to delays (future enhancement)
     * 
     * @description
     * Future feature: Apply easing function to stagger timing distribution
     * Example: cubic.out easing makes later elements have less delay difference
     * 
     * @param delays - Linear delay array
     * @param easingFunction - Easing function to apply
     * @returns Eased delay distribution
     */
    private applyDistributionEasing(delays: number[], easingFunction: string): number[] {
        // TODO: Implement in future version
        console.warn('Distribution easing not yet implemented');
        return delays;
    }
} 