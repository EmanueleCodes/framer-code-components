/**
 * @file ColumnStaggerCalculator.ts
 * @description Column-based wave stagger calculations for grid layouts
 * 
 * @version 1.0.0 - Initial implementation for Phase 2.5
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const calculator = new ColumnStaggerCalculator();
 * const result = calculator.calculateColumnWaveDelays(gridResult, 'left-to-right', 0.1);
 * ```
 */

import type { 
    GridDetectionResult, 
    GridElement, 
    GridStaggerResult,
    GridColumnDirection 
} from '../types/StaggerTypes.ts';

// Module name for logging
const MODULE_NAME = "ColumnStaggerCalculator";

/**
 * Column-based wave stagger calculator
 * 
 * @description
 * Calculates delays for column-based wave animations across grid layouts.
 * Creates vertical wave effects where elements in the same column animate simultaneously,
 * with progressive delays between columns based on the selected direction.
 * 
 * **Wave Direction Support:**
 * - **left-to-right**: Column 0 first, then column 1, 2, 3... (classic sweep)
 * - **right-to-left**: Last column first, then column N-1, N-2... (reverse sweep)
 * - **center-out-columns**: Center column(s) first, expanding to left/right edges
 * - **edges-in-columns**: Left and right columns first, converging to center
 * 
 * **Key Features:**
 * - Simultaneous animation within each column
 * - Progressive delays between columns
 * - Support for odd/even column counts in center-based modes
 * - Clean vertical wave propagation effects
 */
export class ColumnStaggerCalculator {
    
    /**
     * Calculate delays for column-based wave animations
     * 
     * @description
     * Main entry point for column wave calculations. Groups elements by column,
     * determines column order based on direction, and applies progressive delays.
     * 
     * **Algorithm Steps:**
     * 1. Group elements by column index or tolerance-based pixel position
     * 2. Calculate column animation order based on direction
     * 3. Assign same delay to all elements in each column
     * 4. Apply progressive delays between columns
     * 
     * **🆕 Enhanced for Phase 1B: Word-Based Grid Column Alignment**
     * - Uses tolerance-based grouping for text elements (words)
     * - Groups words by approximate x-position rather than exact alignment
     * - Fallback to exact column index grouping for perfect grids
     * 
     * @param gridResult - Grid detection result
     * @param direction - Column wave direction
     * @param staggerAmount - Delay between columns (in seconds)
     * @param tolerance - Pixel tolerance for grouping similar x-positions (default: 10px)
     * @returns Stagger result with column-based timing
     */
    calculateColumnWaveDelays(
        gridResult: GridDetectionResult,
        direction: GridColumnDirection,
        staggerAmount: number,
        tolerance: number = 10
    ): GridStaggerResult {
        console.log(`🌊 [${MODULE_NAME}] Calculating column wave delays: ${direction}, amount: ${staggerAmount}s, tolerance: ${tolerance}px`);
        
        const { elements, columns } = gridResult;
        
        if (elements.length === 0) {
            console.warn(`🚧 [${MODULE_NAME}] No elements to calculate delays for`);
            return { elements: [], delays: [], boundaries: [] };
        }
        
        if (columns === 0) {
            console.warn(`🚧 [${MODULE_NAME}] Invalid grid detected (0 columns)`);
            return { elements: [], delays: [], boundaries: [] };
        }
        
        // Step 1: Group elements by column with tolerance-based detection
        const columnGroups = this.groupElementsByColumnTolerance(elements, tolerance);
        console.log(`🌊 [${MODULE_NAME}] Grouped ${elements.length} elements into ${columnGroups.size} tolerance-based columns`);
        
        // Step 2: Calculate column order based on detected column count
        const detectedColumns = columnGroups.size;
        const columnOrder = this.calculateColumnOrder(detectedColumns, direction);
        console.log(`🌊 [${MODULE_NAME}] Column order for ${direction}: [${columnOrder.join(', ')}] (${detectedColumns} detected columns)`);
        
        // Step 3: Apply column delays
        const result = this.applyToleranceBasedColumnDelays(columnGroups, columnOrder, staggerAmount);
        console.log(`🌊 [${MODULE_NAME}] Applied delays to ${result.elements.length} elements with tolerance-based grouping`);
        
        return result;
    }
    
    /**
     * Group elements by their column index
     * 
     * @description
     * Organizes grid elements into Map grouped by column index.
     * Each column contains all elements at that horizontal position.
     * 
     * @param elements - Array of grid elements
     * @returns Map with column index as key, elements array as value
     * 
     * @deprecated Use groupElementsByColumnTolerance() for better text handling
     */
    private groupElementsByColumn(elements: GridElement[]): Map<number, GridElement[]> {
        const columnGroups = new Map<number, GridElement[]>();
        
        elements.forEach(element => {
            const columnIndex = element.position.x; // x-coordinate is column index
            
            if (!columnGroups.has(columnIndex)) {
                columnGroups.set(columnIndex, []);
            }
            
            columnGroups.get(columnIndex)!.push(element);
        });
        
        // Sort elements within each column by row for consistent ordering
        columnGroups.forEach(columnElements => {
            columnElements.sort((a, b) => a.position.y - b.position.y);
        });
        
        return columnGroups;
    }

    /**
     * 🆕 Group elements by approximate x-position with tolerance
     * 
     * @description
     * **Phase 1B Implementation: Word-Based Grid Column Alignment**
     * 
     * Groups grid elements by their actual pixel x-position with tolerance,
     * rather than exact grid column indices. This solves the issue where
     * text elements (words) don't align perfectly in columns.
     * 
     * **Algorithm:**
     * 1. Extract unique x-positions with tolerance grouping
     * 2. Assign each element to closest column group
     * 3. Sort elements within each column by y-position
     * 
     * **Use Cases:**
     * - Text animations where words have slight horizontal offset
     * - Irregular layouts that don't align perfectly
     * - Any layout where visual columns matter more than grid indices
     * 
     * @param elements - Array of grid elements
     * @param tolerance - Pixel tolerance for grouping (default: 10px)
     * @returns Map with column group index as key, elements array as value
     * 
     * @since Phase 1B - Word-Based Grid Column Alignment
     */
    private groupElementsByColumnTolerance(elements: GridElement[], tolerance: number = 10): Map<number, GridElement[]> {
        console.log(`🌊 [${MODULE_NAME}] Grouping ${elements.length} elements by x-position with ${tolerance}px tolerance`);
        
        if (elements.length === 0) {
            return new Map();
        }
        
        // Step 1: Extract all x-positions and find unique columns with tolerance
        const xPositions = elements.map(el => el.pixelPosition.left);
        const uniqueXPositions = this.extractUniqueXPositions(xPositions, tolerance);
        
        console.log(`🌊 [${MODULE_NAME}] Detected ${uniqueXPositions.length} unique column positions: [${uniqueXPositions.map(x => Math.round(x)).join(', ')}]`);
        
        // Step 2: Create column groups map
        const columnGroups = new Map<number, GridElement[]>();
        for (let i = 0; i < uniqueXPositions.length; i++) {
            columnGroups.set(i, []);
        }
        
        // Step 3: Assign each element to the closest column group
        elements.forEach(element => {
            const elementX = element.pixelPosition.left;
            const closestColumnIndex = this.findClosestColumnIndex(elementX, uniqueXPositions);
            
            columnGroups.get(closestColumnIndex)!.push(element);
        });
        
        // Step 4: Sort elements within each column by y-position for consistent ordering
        columnGroups.forEach(columnElements => {
            columnElements.sort((a, b) => a.pixelPosition.top - b.pixelPosition.top);
        });
        
        // Log column group statistics
        columnGroups.forEach((columnElements, columnIndex) => {
            const avgX = Math.round(columnElements.reduce((sum, el) => sum + el.pixelPosition.left, 0) / columnElements.length);
            console.log(`🌊 [${MODULE_NAME}] Column ${columnIndex}: ${columnElements.length} elements, avg x-position: ${avgX}px`);
        });
        
        return columnGroups;
    }

    /**
     * Extract unique x-positions with tolerance grouping
     * 
     * @description
     * Groups similar x-positions together to handle minor alignment differences.
     * Based on the same algorithm used in GridDetector.extractUniquePositions().
     * 
     * @param positions - Array of x-positions to group
     * @param tolerance - Pixel tolerance for grouping
     * @returns Array of unique x-positions (group representatives)
     */
    private extractUniqueXPositions(positions: number[], tolerance: number): number[] {
        if (positions.length === 0) return [];
        
        const sortedPositions = [...positions].sort((a, b) => a - b);
        const uniquePositions: number[] = [sortedPositions[0]];
        
        for (let i = 1; i < sortedPositions.length; i++) {
            const current = sortedPositions[i];
            const last = uniquePositions[uniquePositions.length - 1];
            
            // If position is different enough, add as new unique position
            if (Math.abs(current - last) > tolerance) {
                uniquePositions.push(current);
            }
        }
        
        return uniquePositions;
    }

    /**
     * Find closest column index for element assignment
     * 
     * @description
     * Finds the index of the closest unique x-position for accurate
     * column group assignment.
     * 
     * @param elementX - Element's x-position
     * @param uniqueXPositions - Array of unique column x-positions
     * @returns Index of closest column group
     */
    private findClosestColumnIndex(elementX: number, uniqueXPositions: number[]): number {
        let closestIndex = 0;
        let minDistance = Math.abs(elementX - uniqueXPositions[0]);
        
        for (let i = 1; i < uniqueXPositions.length; i++) {
            const distance = Math.abs(elementX - uniqueXPositions[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    }
    
    /**
     * Calculate column animation order based on direction
     * 
     * @description
     * Determines the sequence in which columns should animate based on the
     * specified wave direction. Handles special cases like center-out and edges-in.
     * 
     * @param columns - Total number of columns in grid
     * @param direction - Column wave direction
     * @returns Array of column indices in animation order
     */
    private calculateColumnOrder(columns: number, direction: GridColumnDirection): number[] {
        switch (direction) {
            case 'left-to-right':
                // Simple sequence: 0, 1, 2, 3...
                return Array.from({ length: columns }, (_, i) => i);
                
            case 'right-to-left':
                // Reverse sequence: N-1, N-2, N-3... 0
                return Array.from({ length: columns }, (_, i) => columns - 1 - i);
                
            case 'center-out-columns':
                return this.calculateCenterOutColumnOrder(columns);
                
            case 'edges-in-columns':
                return this.calculateEdgesInColumnOrder(columns);
                
            default:
                console.warn(`🚧 [${MODULE_NAME}] Unknown column direction: ${direction}, falling back to left-to-right`);
                return Array.from({ length: columns }, (_, i) => i);
        }
    }
    
    /**
     * Calculate center-out column order
     * 
     * @description
     * Creates a column order that starts from the center column(s) and expands
     * outward to the left and right edges. Handles both odd and even column counts.
     * 
     * **Algorithm:**
     * - Odd columns: Start with exact center, then alternate expanding out
     * - Even columns: Start with two center columns, then alternate expanding out
     * 
     * @param columns - Total number of columns
     * @returns Column indices in center-out order
     */
    private calculateCenterOutColumnOrder(columns: number): number[] {
        const order: number[] = [];
        const centerColumn = Math.floor((columns - 1) / 2);
        
        if (columns % 2 === 1) {
            // Odd number of columns: start with exact center
            order.push(centerColumn);
            
            // Expand outward alternating left and right
            for (let offset = 1; offset <= centerColumn; offset++) {
                if (centerColumn + offset < columns) {
                    order.push(centerColumn + offset); // Right
                }
                if (centerColumn - offset >= 0) {
                    order.push(centerColumn - offset); // Left
                }
            }
        } else {
            // Even number of columns: start with two center columns
            const leftCenter = Math.floor(columns / 2) - 1;
            const rightCenter = Math.floor(columns / 2);
            
            order.push(leftCenter, rightCenter);
            
            // Expand outward alternating
            for (let offset = 1; offset < columns / 2; offset++) {
                if (rightCenter + offset < columns) {
                    order.push(rightCenter + offset); // Right
                }
                if (leftCenter - offset >= 0) {
                    order.push(leftCenter - offset); // Left
                }
            }
        }
        
        return order;
    }
    
    /**
     * Calculate edges-in column order
     * 
     * @description
     * Creates a column order that starts from the left and right edges
     * and converges toward the center. Creates a "pincer" wave effect.
     * 
     * @param columns - Total number of columns
     * @returns Column indices in edges-in order
     */
    private calculateEdgesInColumnOrder(columns: number): number[] {
        const order: number[] = [];
        
        // Start with edges
        let leftIndex = 0;
        let rightIndex = columns - 1;
        
        // Alternate between left and right, moving inward
        while (leftIndex <= rightIndex) {
            if (leftIndex === rightIndex) {
                // Center column (odd number of columns)
                order.push(leftIndex);
                break;
            } else {
                // Add both left and right
                order.push(leftIndex, rightIndex);
            }
            
            leftIndex++;
            rightIndex--;
        }
        
        return order;
    }
    
    /**
     * Apply calculated delays to column groups
     * 
     * @description
     * Takes the column groups and order sequence, applies progressive delays
     * to create the final wave animation timing. For center-out and edges-in patterns,
     * elements at the same distance get simultaneous timing.
     * 
     * @param columnGroups - Elements grouped by column
     * @param columnOrder - Sequence of column indices
     * @param staggerAmount - Delay between distance groups (in seconds)
     * @returns Complete stagger result with timing
     */
    private applyColumnDelays(
        columnGroups: Map<number, GridElement[]>,
        columnOrder: number[],
        staggerAmount: number
    ): GridStaggerResult {
        const elements: GridElement[] = [];
        const delays: number[] = [];
        
        // Group columns by their animation distance/wave (for simultaneous timing)
        const distanceGroups = this.groupColumnsByDistance(columnOrder);
        
        distanceGroups.forEach((columnIndices, distanceIndex) => {
            const delay = distanceIndex * staggerAmount;
            
            // All elements in columns at the same distance get the same delay
            columnIndices.forEach(columnIndex => {
                const columnElements = columnGroups.get(columnIndex) || [];

                columnElements.forEach(element => {
                    elements.push(element);
                    delays.push(delay);
                });
            });
        });
        
        return {
            elements,
            delays,
            boundaries: [] // No scroll boundaries for column waves
        };
    }

    /**
     * 🆕 Apply calculated delays to tolerance-based column groups
     * 
     * @description
     * **Phase 1B Implementation: Word-Based Grid Column Alignment**
     * 
     * Takes the tolerance-based column groups and applies progressive delays
     * to create clean column wave animations. Works with dynamically detected
     * column count rather than fixed grid dimensions.
     * 
     * **Key Features:**
     * - Handles variable column counts from tolerance-based detection
     * - Maintains proper wave timing even with irregular layouts
     * - Preserves simultaneous timing for elements in same visual column
     * 
     * @param columnGroups - Elements grouped by tolerance-based columns
     * @param columnOrder - Sequence of column indices for animation
     * @param staggerAmount - Delay between distance groups (in seconds)
     * @returns Complete stagger result with timing
     * 
     * @since Phase 1B - Word-Based Grid Column Alignment
     */
    private applyToleranceBasedColumnDelays(
        columnGroups: Map<number, GridElement[]>,
        columnOrder: number[],
        staggerAmount: number
    ): GridStaggerResult {
        console.log(`🌊 [${MODULE_NAME}] Applying tolerance-based column delays to ${columnGroups.size} column groups`);
        
        const elements: GridElement[] = [];
        const delays: number[] = [];
        
        // Group columns by their animation distance/wave (for simultaneous timing)
        const distanceGroups = this.groupColumnsByDistance(columnOrder);
        
        console.log(`🌊 [${MODULE_NAME}] Created ${distanceGroups.size} distance groups for wave animation`);
        
        distanceGroups.forEach((columnIndices, distanceIndex) => {
            const delay = distanceIndex * staggerAmount;
            
            console.log(`🌊 [${MODULE_NAME}] Distance group ${distanceIndex}: columns [${columnIndices.join(', ')}] with ${delay}s delay`);
            
            // All elements in columns at the same distance get the same delay
            columnIndices.forEach(columnIndex => {
                const columnElements = columnGroups.get(columnIndex) || [];
                
                columnElements.forEach(element => {
                    elements.push(element);
                    delays.push(delay);
                });
                
                console.log(`🌊 [${MODULE_NAME}] Column ${columnIndex} (${columnElements.length} elements) → ${delay.toFixed(3)}s delay [distance group ${distanceIndex}]`);
            });
        });
        
        return {
            elements,
            delays,
            boundaries: [] // Not used for timed animations
        };
    }
    
    /**
     * Group columns by their animation distance for simultaneous timing
     * 
     * @description
     * For center-out and edges-in patterns, groups columns that should animate
     * simultaneously (at same distance from origin). For linear patterns,
     * each column gets its own group.
     * 
     * @param columnOrder - Sequence of column indices
     * @returns Map of distance groups containing column indices
     */
    private groupColumnsByDistance(columnOrder: number[]): Map<number, number[]> {
        const distanceGroups = new Map<number, number[]>();
        
        if (this.isSymmetricPattern(columnOrder)) {
            // For symmetric patterns, group by actual distance from center/edge
            const distanceMap = this.calculateDistanceMap(columnOrder);
            
            // Group columns by their distance value
            distanceMap.forEach((distance, columnIndex) => {
                if (!distanceGroups.has(distance)) {
                    distanceGroups.set(distance, []);
                }
                distanceGroups.get(distance)!.push(columnIndex);
            });
            
            console.log(`🌊 [${MODULE_NAME}] Distance groups:`, Array.from(distanceGroups.entries()));
        } else {
            // Linear pattern - each column gets its own timing
            columnOrder.forEach((columnIndex, orderIndex) => {
                distanceGroups.set(orderIndex, [columnIndex]);
            });
        }
        
        return distanceGroups;
    }
    
    /**
     * Calculate distance map for columns based on pattern type
     * 
     * @description
     * Calculates the animation distance for each column based on whether
     * it's center-out or edges-in pattern.
     * 
     * @param columnOrder - Sequence of column indices
     * @returns Map of column index to distance value
     */
    private calculateDistanceMap(columnOrder: number[]): Map<number, number> {
        const distanceMap = new Map<number, number>();
        const totalColumns = Math.max(...columnOrder) + 1;
        
        // Determine pattern type by analyzing the order
        const isCenterOut = this.isCenterOutPattern(columnOrder, totalColumns);
        
        if (isCenterOut) {
            // Center-out: distance = Math.abs(column - center)
            const center = Math.floor((totalColumns - 1) / 2);
            columnOrder.forEach(columnIndex => {
                const distance = Math.abs(columnIndex - center);
                distanceMap.set(columnIndex, distance);
            });
            console.log(`🌊 [${MODULE_NAME}] Center-out pattern, center=${center}`);
        } else {
            // Edges-in: distance = Math.min(column, totalColumns - 1 - column)
            columnOrder.forEach(columnIndex => {
                const distance = Math.min(columnIndex, totalColumns - 1 - columnIndex);
                distanceMap.set(columnIndex, distance);
            });
            console.log(`🌊 [${MODULE_NAME}] Edges-in pattern`);
        }
        
        return distanceMap;
    }
    
    /**
     * Check if the pattern is center-out (vs edges-in)
     * 
     * @param columnOrder - Column order sequence
     * @param totalColumns - Total number of columns
     * @returns True if center-out pattern
     */
    private isCenterOutPattern(columnOrder: number[], totalColumns: number): boolean {
        if (columnOrder.length === 0) return false;
        
        const center = Math.floor((totalColumns - 1) / 2);
        const firstColumn = columnOrder[0];
        
        // If first column is center (or close to center for even counts), it's center-out
        return Math.abs(firstColumn - center) <= 0.5;
    }
    
    /**
     * Check if column order represents a symmetric pattern (center-out or edges-in)
     * 
     * @param columnOrder - Column order sequence
     * @returns True if pattern is symmetric
     */
    private isSymmetricPattern(columnOrder: number[]): boolean {
        if (columnOrder.length < 3) return false;
        
        // Check for center-out pattern (starts with center, then alternates)
        // Or edges-in pattern (starts with edges, converges to center)
        const totalColumns = Math.max(...columnOrder) + 1;
        const center = Math.floor((totalColumns - 1) / 2);
        const firstColumn = columnOrder[0];
        
        // Center-out: starts with center column
        const isCenterOut = Math.abs(firstColumn - center) <= 0.5;
        
        // Edges-in: starts with edge columns (0 or max)
        const isEdgesIn = firstColumn === 0 || firstColumn === totalColumns - 1;
        
        return isCenterOut || isEdgesIn;
    }
} 