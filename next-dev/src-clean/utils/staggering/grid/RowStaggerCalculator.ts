/**
 * @file RowStaggerCalculator.ts
 * @description Row-based wave stagger calculations for grid layouts
 * 
 * @version 1.0.0 - Initial implementation for Phase 2.5
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const calculator = new RowStaggerCalculator();
 * const result = calculator.calculateRowWaveDelays(gridResult, 'top-to-bottom', 0.1);
 * ```
 */

import type { 
    GridDetectionResult, 
    GridElement, 
    GridStaggerResult,
    GridRowDirection 
} from '../types/StaggerTypes.ts';

// Module name for logging
const MODULE_NAME = "RowStaggerCalculator";

/**
 * Row-based wave stagger calculator
 * 
 * @description
 * Calculates delays for row-based wave animations across grid layouts.
 * Creates horizontal wave effects where elements in the same row animate simultaneously,
 * with progressive delays between rows based on the selected direction.
 * 
 * **Wave Direction Support:**
 * - **top-to-bottom**: Row 0 first, then row 1, 2, 3... (classic cascade)
 * - **bottom-to-top**: Last row first, then row N-1, N-2... (reverse cascade)
 * - **center-out-rows**: Center row(s) first, expanding to top/bottom edges
 * - **edges-in-rows**: Top and bottom rows first, converging to center
 * 
 * **Key Features:**
 * - Simultaneous animation within each row
 * - Progressive delays between rows
 * - Support for odd/even row counts in center-based modes
 * - Clean wave propagation effects
 */
export class RowStaggerCalculator {
    
    /**
     * Calculate delays for row-based wave animations
     * 
     * @description
     * Main entry point for row wave calculations. Groups elements by row,
     * determines row order based on direction, and applies progressive delays.
     * 
     * **Algorithm Steps:**
     * 1. Group elements by row index
     * 2. Calculate row animation order based on direction
     * 3. Assign same delay to all elements in each row
     * 4. Apply progressive delays between rows
     * 
     * @param gridResult - Grid detection result
     * @param direction - Row wave direction
     * @param staggerAmount - Delay between rows (in seconds)
     * @returns Stagger result with row-based timing
     */
    calculateRowWaveDelays(
        gridResult: GridDetectionResult,
        direction: GridRowDirection,
        staggerAmount: number
    ): GridStaggerResult {
        console.log(`🌊 [${MODULE_NAME}] Calculating row wave delays: ${direction}, amount: ${staggerAmount}s`);
        
        const { elements, rows } = gridResult;
        
        if (elements.length === 0) {
            console.warn(`🚧 [${MODULE_NAME}] No elements to calculate delays for`);
            return { elements: [], delays: [], boundaries: [] };
        }
        
        if (rows === 0) {
            console.warn(`🚧 [${MODULE_NAME}] Invalid grid detected (0 rows)`);
            return { elements: [], delays: [], boundaries: [] };
        }
        
        // Step 1: Group elements by row index
        const rowGroups = this.groupElementsByRow(elements);
        console.log(`🌊 [${MODULE_NAME}] Grouped ${elements.length} elements into ${rowGroups.size} rows`);
        
        // Step 2: Calculate row order based on direction
        const rowOrder = this.calculateRowOrder(rows, direction);
        console.log(`🌊 [${MODULE_NAME}] Row order for ${direction}: [${rowOrder.join(', ')}]`);
        
        // Step 3: Apply row delays
        const result = this.applyRowDelays(rowGroups, rowOrder, staggerAmount);
        console.log(`🌊 [${MODULE_NAME}] Applied delays to ${result.elements.length} elements`);
        
        return result;
    }
    
    /**
     * Group elements by their row index
     * 
     * @description
     * Organizes grid elements into Map grouped by row index.
     * Each row contains all elements at that vertical position.
     * 
     * @param elements - Array of grid elements
     * @returns Map with row index as key, elements array as value
     */
    private groupElementsByRow(elements: GridElement[]): Map<number, GridElement[]> {
        const rowGroups = new Map<number, GridElement[]>();
        
        elements.forEach(element => {
            const rowIndex = element.position.y; // y-coordinate is row index
            
            if (!rowGroups.has(rowIndex)) {
                rowGroups.set(rowIndex, []);
            }
            
            rowGroups.get(rowIndex)!.push(element);
        });
        
        // Sort elements within each row by column for consistent ordering
        rowGroups.forEach(rowElements => {
            rowElements.sort((a, b) => a.position.x - b.position.x);
        });
        
        return rowGroups;
    }
    
    /**
     * Calculate row animation order based on direction
     * 
     * @description
     * Determines the sequence in which rows should animate based on the
     * specified wave direction. Handles special cases like center-out and edges-in.
     * 
     * @param rows - Total number of rows in grid
     * @param direction - Row wave direction
     * @returns Array of row indices in animation order
     */
    private calculateRowOrder(rows: number, direction: GridRowDirection): number[] {
        switch (direction) {
            case 'top-to-bottom':
                // Simple sequence: 0, 1, 2, 3...
                return Array.from({ length: rows }, (_, i) => i);
                
            case 'bottom-to-top':
                // Reverse sequence: N-1, N-2, N-3... 0
                return Array.from({ length: rows }, (_, i) => rows - 1 - i);
                
            case 'center-out-rows':
                return this.calculateCenterOutRowOrder(rows);
                
            case 'edges-in-rows':
                return this.calculateEdgesInRowOrder(rows);
                
            default:
                console.warn(`🚧 [${MODULE_NAME}] Unknown row direction: ${direction}, falling back to top-to-bottom`);
                return Array.from({ length: rows }, (_, i) => i);
        }
    }
    
    /**
     * Calculate center-out row order
     * 
     * @description
     * Creates a row order that starts from the center row(s) and expands
     * outward to the top and bottom edges. Handles both odd and even row counts.
     * 
     * **Algorithm:**
     * - Odd rows: Start with exact center, then alternate expanding out
     * - Even rows: Start with two center rows, then alternate expanding out
     * 
     * @param rows - Total number of rows
     * @returns Row indices in center-out order
     */
    private calculateCenterOutRowOrder(rows: number): number[] {
        const order: number[] = [];
        const centerRow = Math.floor((rows - 1) / 2);
        
        if (rows % 2 === 1) {
            // Odd number of rows: start with exact center
            order.push(centerRow);
            
            // Expand outward alternating up and down
            for (let offset = 1; offset <= centerRow; offset++) {
                if (centerRow + offset < rows) {
                    order.push(centerRow + offset); // Down
                }
                if (centerRow - offset >= 0) {
                    order.push(centerRow - offset); // Up
                }
            }
        } else {
            // Even number of rows: start with two center rows
            const lowerCenter = Math.floor(rows / 2) - 1;
            const upperCenter = Math.floor(rows / 2);
            
            order.push(lowerCenter, upperCenter);
            
            // Expand outward alternating
            for (let offset = 1; offset < rows / 2; offset++) {
                if (upperCenter + offset < rows) {
                    order.push(upperCenter + offset); // Down
                }
                if (lowerCenter - offset >= 0) {
                    order.push(lowerCenter - offset); // Up
                }
            }
        }
        
        return order;
    }
    
    /**
     * Calculate edges-in row order
     * 
     * @description
     * Creates a row order that starts from the top and bottom edges
     * and converges toward the center. Creates a "pincer" wave effect.
     * 
     * @param rows - Total number of rows
     * @returns Row indices in edges-in order
     */
    private calculateEdgesInRowOrder(rows: number): number[] {
        const order: number[] = [];
        
        // Start with edges
        let topIndex = 0;
        let bottomIndex = rows - 1;
        
        // Alternate between top and bottom, moving inward
        while (topIndex <= bottomIndex) {
            if (topIndex === bottomIndex) {
                // Center row (odd number of rows)
                order.push(topIndex);
                break;
            } else {
                // Add both top and bottom
                order.push(topIndex, bottomIndex);
            }
            
            topIndex++;
            bottomIndex--;
        }
        
        return order;
    }
    
    /**
     * Apply calculated delays to row groups
     * 
     * @description
     * Takes the row groups and order sequence, applies progressive delays
     * to create the final wave animation timing. For center-out and edges-in patterns,
     * elements at the same distance get simultaneous timing.
     * 
     * @param rowGroups - Elements grouped by row
     * @param rowOrder - Sequence of row indices
     * @param staggerAmount - Delay between distance groups (in seconds)
     * @returns Complete stagger result with timing
     */
    private applyRowDelays(
        rowGroups: Map<number, GridElement[]>,
        rowOrder: number[],
        staggerAmount: number
    ): GridStaggerResult {
        const elements: GridElement[] = [];
        const delays: number[] = [];
        
        // Group rows by their animation distance/wave (for simultaneous timing)
        const distanceGroups = this.groupRowsByDistance(rowOrder);
        
        distanceGroups.forEach((rowIndices, distanceIndex) => {
            const delay = distanceIndex * staggerAmount;
            
            // All elements in rows at the same distance get the same delay
            rowIndices.forEach(rowIndex => {
                const rowElements = rowGroups.get(rowIndex) || [];
                
                rowElements.forEach(element => {
                    elements.push(element);
                    delays.push(delay);
                });
                
                console.log(`🌊 [${MODULE_NAME}] Row ${rowIndex} (${rowElements.length} elements) → ${delay.toFixed(3)}s delay [distance group ${distanceIndex}]`);
            });
        });
        
        return {
            elements,
            delays,
            boundaries: [] // Not used for timed animations
        };
    }
    
    /**
     * Group rows by their animation distance for simultaneous timing
     * 
     * @description
     * For center-out and edges-in patterns, groups rows that should animate
     * simultaneously (at same distance from origin). For linear patterns,
     * each row gets its own group.
     * 
     * @param rowOrder - Sequence of row indices
     * @returns Map of distance groups containing row indices
     */
    private groupRowsByDistance(rowOrder: number[]): Map<number, number[]> {
        const distanceGroups = new Map<number, number[]>();
        
        if (this.isSymmetricPattern(rowOrder)) {
            // For symmetric patterns, group by actual distance from center/edge
            const distanceMap = this.calculateDistanceMap(rowOrder);
            
            // Group rows by their distance value
            distanceMap.forEach((distance, rowIndex) => {
                if (!distanceGroups.has(distance)) {
                    distanceGroups.set(distance, []);
                }
                distanceGroups.get(distance)!.push(rowIndex);
            });
            
            console.log(`🌊 [${MODULE_NAME}] Distance groups:`, Array.from(distanceGroups.entries()));
        } else {
            // Linear pattern - each row gets its own timing
            rowOrder.forEach((rowIndex, orderIndex) => {
                distanceGroups.set(orderIndex, [rowIndex]);
            });
        }
        
        return distanceGroups;
    }
    
    /**
     * Calculate distance map for rows based on pattern type
     * 
     * @description
     * Calculates the animation distance for each row based on whether
     * it's center-out or edges-in pattern.
     * 
     * @param rowOrder - Sequence of row indices
     * @returns Map of row index to distance value
     */
    private calculateDistanceMap(rowOrder: number[]): Map<number, number> {
        const distanceMap = new Map<number, number>();
        const totalRows = Math.max(...rowOrder) + 1;
        
        // Determine pattern type by analyzing the order
        const isCenterOut = this.isCenterOutPattern(rowOrder, totalRows);
        
        if (isCenterOut) {
            // Center-out: distance = Math.abs(row - center)
            const center = Math.floor((totalRows - 1) / 2);
            rowOrder.forEach(rowIndex => {
                const distance = Math.abs(rowIndex - center);
                distanceMap.set(rowIndex, distance);
            });
            console.log(`🌊 [${MODULE_NAME}] Center-out pattern, center=${center}`);
        } else {
            // Edges-in: distance = Math.min(row, totalRows - 1 - row)
            rowOrder.forEach(rowIndex => {
                const distance = Math.min(rowIndex, totalRows - 1 - rowIndex);
                distanceMap.set(rowIndex, distance);
            });
            console.log(`🌊 [${MODULE_NAME}] Edges-in pattern`);
        }
        
        return distanceMap;
    }
    
    /**
     * Check if the pattern is center-out (vs edges-in)
     * 
     * @param rowOrder - Row order sequence
     * @param totalRows - Total number of rows
     * @returns True if center-out pattern
     */
    private isCenterOutPattern(rowOrder: number[], totalRows: number): boolean {
        if (rowOrder.length === 0) return false;
        
        const center = Math.floor((totalRows - 1) / 2);
        const firstRow = rowOrder[0];
        
        // If first row is center (or close to center for even counts), it's center-out
        return Math.abs(firstRow - center) <= 0.5;
    }
    
    /**
     * Check if row order represents a symmetric pattern (center-out or edges-in)
     * 
     * @param rowOrder - Row order sequence
     * @returns True if pattern is symmetric
     */
    private isSymmetricPattern(rowOrder: number[]): boolean {
        if (rowOrder.length < 3) return false;
        
        // Check for center-out pattern (starts with center, then alternates)
        // Or edges-in pattern (starts with edges, converges to center)
        const totalRows = Math.max(...rowOrder) + 1;
        const center = Math.floor((totalRows - 1) / 2);
        const firstRow = rowOrder[0];
        
        // Center-out: starts with center row
        const isCenterOut = Math.abs(firstRow - center) <= 0.5;
        
        // Edges-in: starts with edge rows (0 or max)
        const isEdgesIn = firstRow === 0 || firstRow === totalRows - 1;
        
        return isCenterOut || isEdgesIn;
    }
} 