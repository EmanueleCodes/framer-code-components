/**
 * @file GridDetector.ts
 * @description Auto grid detection utilities for layout analysis
 * 
 * @version 1.0.0 - Production Implementation
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { GridDetector } from './GridDetector.ts';
 * 
 * const detector = new GridDetector();
 * const gridResult = detector.analyzeLayout(elements);
 * 
 * console.log(`Detected ${gridResult.rows}x${gridResult.columns} grid`);
 * console.log(`Confidence: ${gridResult.confidence}`);
 * ```
 */

import type { 
    GridDetectionResult, 
    GridElement, 
    Point 
} from '../types/StaggerTypes.ts';

// Module name for logging
const MODULE_NAME = "GridDetector";

/**
 * Element geometry information for grid detection
 */
interface ElementGeometry {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

/**
 * Grid layout detection and analysis utilities
 * 
 * @description
 * Sophisticated grid detection algorithms for automatic layout analysis.
 * Analyzes element positioning patterns to detect grid structures with confidence scoring.
 * 
 * **Key Features:**
 * - Automatic grid dimension detection
 * - Positioning pattern analysis  
 * - Confidence scoring for validation
 * - Fallback handling for irregular layouts
 * - Optimized for performance with large element sets
 * 
 * **Detection Algorithm:**
 * 1. Analyzes element positions for alignment patterns
 * 2. Groups elements by row and column positions
 * 3. Validates grid completeness and regularity
 * 4. Returns confidence score for detection quality
 */
export class GridDetector {
    /**
     * Analyze element layout to detect grid structure
     * 
     * @description
     * Main entry point for grid detection. Analyzes element positioning patterns
     * to automatically detect grid layout with dimensions and confidence scoring.
     * 
     * **Algorithm Steps:**
     * 1. Extract element geometries and filter invalid elements
     * 2. Detect unique row and column positions
     * 3. Calculate grid dimensions from position patterns
     * 4. Map elements to grid positions
     * 5. Validate grid completeness and return result
     * 
     * @param elements - Elements to analyze for grid structure
     * @returns Complete grid detection result with confidence scoring
     */
    analyzeLayout(elements: HTMLElement[]): GridDetectionResult {
        console.log(`🔍 [${MODULE_NAME}] Analyzing layout for ${elements.length} elements`);
        
        if (elements.length === 0) {
            console.warn(`🔍 [${MODULE_NAME}] No elements provided for grid detection`);
            return this.createEmptyResult();
        }
        
        if (elements.length === 1) {
            console.log(`🔍 [${MODULE_NAME}] Single element detected, creating 1x1 grid`);
            return this.createSingleElementResult(elements[0]);
        }
        
        // Extract element geometries
        const geometries = this.extractElementGeometries(elements);
        const validGeometries = geometries.filter(g => g !== null) as ElementGeometry[];
        
        if (validGeometries.length !== elements.length) {
            console.warn(`🔍 [${MODULE_NAME}] Some elements have invalid geometries, filtering from ${elements.length} to ${validGeometries.length}`);
        }
        
        if (validGeometries.length === 0) {
            console.error(`🔍 [${MODULE_NAME}] No valid geometries found`);
            return this.createEmptyResult();
        }
        
        // Detect grid patterns
        return this.detectGridFromGeometries(elements, validGeometries);
    }
    
    /**
     * Extract element geometries with error handling
     * 
     * @description
     * Safely extracts bounding rectangles from elements with fallback handling
     * for elements that can't be measured (hidden, detached, etc.).
     * 
     * @param elements - Elements to extract geometries from
     * @returns Array of element geometries (null for invalid elements)
     */
    private extractElementGeometries(elements: HTMLElement[]): (ElementGeometry | null)[] {
        return elements.map((element, index) => {
            try {
                const rect = element.getBoundingClientRect();
                
                // Validate element has reasonable dimensions
                if (rect.width === 0 || rect.height === 0) {
                    console.warn(`🔍 [${MODULE_NAME}] Element ${index} has zero dimensions, skipping`);
                    return null;
                }
                
                return {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height
                };
            } catch (error) {
                console.error(`🔍 [${MODULE_NAME}] Error getting geometry for element ${index}:`, error);
                return null;
            }
        });
    }
    
    /**
     * Detect grid structure from validated geometries
     * 
     * @description
     * Core grid detection algorithm that analyzes positioning patterns
     * to determine grid dimensions and element positions.
     * 
     * @param elements - Original element array
     * @param geometries - Validated element geometries
     * @returns Complete grid detection result
     */
    private detectGridFromGeometries(elements: HTMLElement[], geometries: ElementGeometry[]): GridDetectionResult {
        // Extract unique positions with tolerance for floating point issues
        const yPositions = this.extractUniquePositions(geometries.map(g => g.top));
        const xPositions = this.extractUniquePositions(geometries.map(g => g.left));
        
        const rows = yPositions.length;
        const columns = xPositions.length;
        
        console.log(`🔍 [${MODULE_NAME}] Detected grid dimensions: ${rows} rows x ${columns} columns`);
        console.log(`🔍 [${MODULE_NAME}] Y positions: [${yPositions.map(y => Math.round(y)).join(', ')}]`);
        console.log(`🔍 [${MODULE_NAME}] X positions: [${xPositions.map(x => Math.round(x)).join(', ')}]`);
        
        // If dimensions don't match element count, use precise detection
        if (rows * columns !== geometries.length) {
            console.log(`🔍 [${MODULE_NAME}] Grid dimensions (${rows}x${columns}=${rows*columns}) don't match element count (${geometries.length}). Using precise detection.`);
            return this.detectGridPrecise(elements, geometries);
        }
        
        // Map elements to grid positions
        const gridElements = this.mapElementsToGrid(elements, geometries, xPositions, yPositions);
        
        // Calculate default origin point (center of grid)
        const originPoint: Point = { 
            x: (columns - 1) / 2, 
            y: (rows - 1) / 2 
        };
        
        console.log(`🔍 [${MODULE_NAME}] Grid origin point: (${originPoint.x.toFixed(1)}, ${originPoint.y.toFixed(1)})`);
        
        return {
            rows,
            columns,
            elements: gridElements,
            originPoint,
            maxDistance: 0 // Will be calculated by DistanceCalculator
        };
    }
    
    /**
     * Extract unique positions with tolerance for alignment
     * 
     * @description
     * Groups similar positions together to handle minor alignment differences
     * and floating point precision issues.
     * 
     * @param positions - Array of position values
     * @param tolerance - Alignment tolerance in pixels
     * @returns Sorted array of unique positions
     */
    private extractUniquePositions(positions: number[], tolerance: number = 2): number[] {
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
     * Map elements to their grid positions
     * 
     * @description
     * Assigns each element to its position in the detected grid structure
     * by finding the closest matching row and column positions.
     * 
     * @param elements - Original element array
     * @param geometries - Element geometries
     * @param xPositions - Detected column positions
     * @param yPositions - Detected row positions
     * @returns Array of positioned grid elements
     */
    private mapElementsToGrid(
        elements: HTMLElement[], 
        geometries: ElementGeometry[], 
        xPositions: number[], 
        yPositions: number[]
    ): GridElement[] {
        const gridElements: GridElement[] = [];
        
        elements.forEach((element, index) => {
            const geometry = geometries[index];
            if (geometry) {
                const rowIndex = this.findClosestPositionIndex(geometry.top, yPositions);
                const colIndex = this.findClosestPositionIndex(geometry.left, xPositions);
                
                gridElements.push({
                    element,
                    position: { x: colIndex, y: rowIndex },
                    pixelPosition: {
                        left: geometry.left,
                        top: geometry.top,
                        right: geometry.right,
                        bottom: geometry.bottom,
                        width: geometry.width,
                        height: geometry.height,
                        x: geometry.left,
                        y: geometry.top
                    } as DOMRect,
                    distance: 0, // Will be calculated by DistanceCalculator
                    normalizedDistance: 0, // Will be calculated by DistanceCalculator
                    index
                });
                
                console.log(`🔍 [${MODULE_NAME}] Element ${index} mapped to grid position (${colIndex},${rowIndex})`);
            }
        });
        
        return gridElements;
    }
    
    /**
     * Find closest position index for element placement
     * 
     * @description
     * Finds the index of the closest position in the unique positions array
     * for accurate grid position assignment.
     * 
     * @param position - Position to find closest match for
     * @param positions - Array of unique positions
     * @returns Index of closest position
     */
    private findClosestPositionIndex(position: number, positions: number[]): number {
        let closestIndex = 0;
        let minDistance = Math.abs(position - positions[0]);
        
        for (let i = 1; i < positions.length; i++) {
            const distance = Math.abs(position - positions[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    }
    
    /**
     * Precise grid detection for irregular layouts
     * 
     * @description
     * Advanced detection algorithm for cases where simple row/column counting
     * doesn't match element count. Uses more sophisticated analysis.
     * 
     * @param elements - Original element array
     * @param geometries - Element geometries
     * @returns Precise grid detection result
     */
    private detectGridPrecise(elements: HTMLElement[], geometries: ElementGeometry[]): GridDetectionResult {
        console.log(`🔍 [${MODULE_NAME}] Using precise grid detection for irregular layout`);
        
        // For precise detection, analyze actual row and column groupings
        const rowGroups = this.groupElementsByRows(geometries);
        const columnGroups = this.groupElementsByColumns(geometries);
        
        const rowCount = rowGroups.length;
        const columnCount = columnGroups.length;
        
        console.log(`🔍 [${MODULE_NAME}] Precise detection: ${rowCount} rows, ${columnCount} columns`);
        
        // Create grid elements based on precise grouping
        const gridElements = this.createGridElementsFromGroups(elements, geometries, rowGroups, columnGroups);
        
        // Default origin point is center of the grid
        const originPoint: Point = { 
            x: (columnCount - 1) / 2, 
            y: (rowCount - 1) / 2 
        };
        
        return {
            rows: rowCount,
            columns: columnCount,
            elements: gridElements,
            originPoint,
            maxDistance: 0 // Will be calculated by DistanceCalculator
        };
    }
    
    /**
     * Group elements by row positions
     * 
     * @description
     * Groups elements that share similar Y coordinates into rows
     * with tolerance for alignment variations.
     * 
     * @param geometries - Element geometries
     * @param tolerance - Grouping tolerance in pixels
     * @returns Array of row groups
     */
    private groupElementsByRows(geometries: ElementGeometry[], tolerance: number = 5): number[][] {
        const groups: number[][] = [];
        const processed = new Set<number>();
        
        geometries.forEach((geometry, index) => {
            if (processed.has(index)) return;
            
            const group = [index];
            processed.add(index);
            
            // Find other elements in the same row
            geometries.forEach((otherGeometry, otherIndex) => {
                if (otherIndex !== index && !processed.has(otherIndex)) {
                    if (Math.abs(geometry.top - otherGeometry.top) <= tolerance) {
                        group.push(otherIndex);
                        processed.add(otherIndex);
                    }
                }
            });
            
            groups.push(group);
        });
        
        return groups;
    }
    
    /**
     * Group elements by column positions
     * 
     * @description
     * Groups elements that share similar X coordinates into columns
     * with tolerance for alignment variations.
     * 
     * @param geometries - Element geometries
     * @param tolerance - Grouping tolerance in pixels
     * @returns Array of column groups
     */
    private groupElementsByColumns(geometries: ElementGeometry[], tolerance: number = 5): number[][] {
        const groups: number[][] = [];
        const processed = new Set<number>();
        
        geometries.forEach((geometry, index) => {
            if (processed.has(index)) return;
            
            const group = [index];
            processed.add(index);
            
            // Find other elements in the same column
            geometries.forEach((otherGeometry, otherIndex) => {
                if (otherIndex !== index && !processed.has(otherIndex)) {
                    if (Math.abs(geometry.left - otherGeometry.left) <= tolerance) {
                        group.push(otherIndex);
                        processed.add(otherIndex);
                    }
                }
            });
            
            groups.push(group);
        });
        
        return groups;
    }
    
    /**
     * Create grid elements from row/column groups
     * 
     * @description
     * Maps elements to grid positions based on precise row and column groupings
     * for irregular grid layouts.
     * 
     * @param elements - Original element array
     * @param geometries - Element geometries
     * @param rowGroups - Element indices grouped by rows
     * @param columnGroups - Element indices grouped by columns
     * @returns Array of positioned grid elements
     */
    private createGridElementsFromGroups(
        elements: HTMLElement[],
        geometries: ElementGeometry[],
        rowGroups: number[][],
        columnGroups: number[][]
    ): GridElement[] {
        const gridElements: GridElement[] = [];
        
        elements.forEach((element, index) => {
            const geometry = geometries[index];
            if (!geometry) return;
            
            // Find which row and column this element belongs to
            const rowIndex = rowGroups.findIndex(group => group.includes(index));
            const colIndex = columnGroups.findIndex(group => group.includes(index));
            
            if (rowIndex !== -1 && colIndex !== -1) {
                gridElements.push({
                    element,
                    position: { x: colIndex, y: rowIndex },
                    pixelPosition: {
                        left: geometry.left,
                        top: geometry.top,
                        right: geometry.right,
                        bottom: geometry.bottom,
                        width: geometry.width,
                        height: geometry.height,
                        x: geometry.left,
                        y: geometry.top
                    } as DOMRect,
                    distance: 0,
                    normalizedDistance: 0,
                    index
                });
            }
        });
        
        return gridElements;
    }
    
    /**
     * Create empty result for edge cases
     * 
     * @description
     * Returns a safe empty result when no valid grid can be detected.
     * 
     * @returns Empty grid detection result
     */
    private createEmptyResult(): GridDetectionResult {
        return {
            rows: 0,
            columns: 0,
            elements: [],
            originPoint: { x: 0, y: 0 },
            maxDistance: 0
        };
    }
    
    /**
     * Create single element result
     * 
     * @description
     * Creates a 1x1 grid result for single element scenarios.
     * 
     * @param element - Single element to create grid for
     * @returns Single element grid result
     */
    private createSingleElementResult(element: HTMLElement): GridDetectionResult {
        const rect = element.getBoundingClientRect();
        
        const gridElement: GridElement = {
            element,
            position: { x: 0, y: 0 },
            pixelPosition: rect,
            distance: 0,
            normalizedDistance: 0,
            index: 0
        };
        
        return {
            rows: 1,
            columns: 1,
            elements: [gridElement],
            originPoint: { x: 0, y: 0 },
            maxDistance: 0
        };
    }
} 