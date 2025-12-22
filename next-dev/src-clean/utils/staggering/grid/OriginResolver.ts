/**
 * @file OriginResolver.ts
 * @description Stagger origin point resolution utilities
 * 
 * @version 1.0.0 - Production Implementation
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { OriginResolver } from './OriginResolver.ts';
 * 
 * const resolver = new OriginResolver();
 * const originPoint = resolver.resolveOrigin(gridResult, 'center');
 * 
 * console.log(`Origin resolved to: (${originPoint.x}, ${originPoint.y})`);
 * ```
 */

import type { 
    GridDetectionResult, 
    GridElement, 
    Point, 
    GridOrigin 
} from '../types/StaggerTypes.ts';

// Module name for logging
const MODULE_NAME = "OriginResolver";

/**
 * Origin point resolution utilities for stagger calculations
 * 
 * @description
 * Calculates precise origin coordinates for grid-based staggering.
 * Supports multiple origin types with proper grid bounds handling.
 * 
 * **Key Features:**
 * - Multiple origin types: center, corners, edges
 * - Precise grid coordinate calculation
 * - Automatic grid bounds detection
 * - Edge case handling for irregular grids
 * - Mouse/pointer origin support (future)
 * 
 * **Supported Origin Types:**
 * - **center**: Grid center point (most common)
 * - **top-left**: Top-left corner
 * - **top-right**: Top-right corner  
 * - **bottom-left**: Bottom-left corner
 * - **bottom-right**: Bottom-right corner
 * - **first**: First element position
 * - **last**: Last element position
 * - **random**: Random element position
 */
export class OriginResolver {
    /**
     * Resolve origin coordinates for stagger calculations
     * 
     * @description
     * Main entry point for origin resolution. Converts origin type string
     * to precise grid coordinates for distance calculations.
     * 
     * **Algorithm Steps:**
     * 1. Validate input parameters and grid result
     * 2. Handle special cases (empty grid, single element)
     * 3. Calculate grid bounds and dimensions
     * 4. Resolve origin type to grid coordinates
     * 5. Validate and return final origin point
     * 
     * @param gridResult - Grid detection result with positioned elements
     * @param originType - Type of origin point to resolve
     * @returns Precise origin coordinates in grid space
     */
    resolveOrigin(gridResult: GridDetectionResult, originType: GridOrigin | string): Point {
        console.log(`🔍 [${MODULE_NAME}] Resolving origin "${originType}" for grid ${gridResult.rows}x${gridResult.columns}`);
        
        // Validate input
        if (!gridResult || gridResult.elements.length === 0) {
            console.warn(`🔍 [${MODULE_NAME}] Empty grid result, using default origin (0, 0)`);
            return { x: 0, y: 0 };
        }
        
        const { rows, columns, elements } = gridResult;
        
        // Handle single element case
        if (elements.length === 1) {
            console.log(`🔍 [${MODULE_NAME}] Single element grid, using element position`);
            return { x: 0, y: 0 };
        }
        
        // Normalize origin string
        const normalizedOrigin = this.normalizeOriginString(originType);
        console.log(`🔍 [${MODULE_NAME}] Normalized origin: "${normalizedOrigin}"`);
        
        // Resolve origin based on type
        let result: Point;
        
        switch (normalizedOrigin) {
            case 'center':
                result = this.calculateCenterOrigin(rows, columns);
                console.log(`🔍 [${MODULE_NAME}] CENTER origin resolved to (${result.x.toFixed(2)}, ${result.y.toFixed(2)})`);
                break;
                
            case 'top-left':
                result = { x: 0, y: 0 };
                console.log(`🔍 [${MODULE_NAME}] TOP_LEFT origin resolved to (${result.x}, ${result.y})`);
                break;
                
            case 'top-center':
                result = { x: (columns - 1) / 2, y: 0 };
                console.log(`🔍 [${MODULE_NAME}] TOP_CENTER origin resolved to (${result.x.toFixed(2)}, ${result.y})`);
                break;
                
            case 'top-right':
                result = { x: columns - 1, y: 0 };
                console.log(`🔍 [${MODULE_NAME}] TOP_RIGHT origin resolved to (${result.x}, ${result.y})`);
                break;
                
            case 'center-left':
                result = { x: 0, y: (rows - 1) / 2 };
                console.log(`🔍 [${MODULE_NAME}] CENTER_LEFT origin resolved to (${result.x}, ${result.y.toFixed(2)})`);
                break;
                
            case 'center-right':
                result = { x: columns - 1, y: (rows - 1) / 2 };
                console.log(`🔍 [${MODULE_NAME}] CENTER_RIGHT origin resolved to (${result.x}, ${result.y.toFixed(2)})`);
                break;
                
            case 'bottom-left':
                result = { x: 0, y: rows - 1 };
                console.log(`🔍 [${MODULE_NAME}] BOTTOM_LEFT origin resolved to (${result.x}, ${result.y})`);
                break;
                
            case 'bottom-center':
                result = { x: (columns - 1) / 2, y: rows - 1 };
                console.log(`🔍 [${MODULE_NAME}] BOTTOM_CENTER origin resolved to (${result.x.toFixed(2)}, ${result.y})`);
                break;
                
            case 'bottom-right':
                result = { x: columns - 1, y: rows - 1 };
                console.log(`🔍 [${MODULE_NAME}] BOTTOM_RIGHT origin resolved to (${result.x}, ${result.y})`);
                break;
                
            case 'first':
                result = this.calculateFirstElementOrigin(elements);
                console.log(`🔍 [${MODULE_NAME}] FIRST origin resolved to element at (${result.x}, ${result.y})`);
                break;
                
            case 'last':
                result = this.calculateLastElementOrigin(elements, rows, columns);
                console.log(`🔍 [${MODULE_NAME}] LAST origin resolved to element at (${result.x}, ${result.y})`);
                break;
                
            case 'random':
                result = this.calculateRandomOrigin(elements, rows, columns);
                console.log(`🔍 [${MODULE_NAME}] RANDOM origin resolved to (${result.x}, ${result.y})`);
                break;
                
            default:
                console.warn(`🔍 [${MODULE_NAME}] Unknown origin type: "${normalizedOrigin}", falling back to center`);
                result = this.calculateCenterOrigin(rows, columns);
                break;
        }
        
        // Validate and return result
        return this.validateOrigin(result, rows, columns);
    }
    
    /**
     * Normalize origin string to handle case variations
     * 
     * @description
     * Converts various origin string formats to standardized lowercase format
     * for consistent processing.
     * 
     * @param originType - Origin type string (any case)
     * @returns Normalized origin string
     */
    private normalizeOriginString(originType: GridOrigin | string): string {
        if (typeof originType !== 'string') {
            return 'center'; // Safe fallback
        }
        
        return originType.toLowerCase().trim();
    }
    
    /**
     * Calculate center origin point
     * 
     * @description
     * Calculates the geometric center of the grid for natural radial staggering.
     * Handles both even and odd grid dimensions properly.
     * 
     * @param rows - Number of grid rows
     * @param columns - Number of grid columns
     * @returns Center coordinates
     */
    private calculateCenterOrigin(rows: number, columns: number): Point {
        const centerX = (columns - 1) / 2;
        const centerY = (rows - 1) / 2;
        
        return { x: centerX, y: centerY };
    }
    
    /**
     * Calculate first element origin point
     * 
     * @description
     * Uses the position of the first element in the grid as origin.
     * Provides consistent starting point for element-based staggering.
     * 
     * @param elements - Grid elements array
     * @returns First element coordinates
     */
    private calculateFirstElementOrigin(elements: GridElement[]): Point {
        if (elements.length === 0) {
            return { x: 0, y: 0 };
        }
        
        const firstElement = elements[0];
        return { x: firstElement.position.x, y: firstElement.position.y };
    }
    
    /**
     * Calculate last element origin point
     * 
     * @description
     * Uses the position of the last element in the grid as origin.
     * Falls back to bottom-right corner if no elements available.
     * 
     * @param elements - Grid elements array
     * @param rows - Number of grid rows
     * @param columns - Number of grid columns
     * @returns Last element coordinates
     */
    private calculateLastElementOrigin(elements: GridElement[], rows: number, columns: number): Point {
        if (elements.length === 0) {
            return { x: columns - 1, y: rows - 1 };
        }
        
        const lastElement = elements[elements.length - 1];
        return { x: lastElement.position.x, y: lastElement.position.y };
    }
    
    /**
     * Calculate random element origin point
     * 
     * @description
     * Selects a random element position as origin for unpredictable stagger patterns.
     * Falls back to random coordinates if no elements available.
     * 
     * @param elements - Grid elements array
     * @param rows - Number of grid rows
     * @param columns - Number of grid columns
     * @returns Random element coordinates
     */
    private calculateRandomOrigin(elements: GridElement[], rows: number, columns: number): Point {
        if (elements.length === 0) {
            return { 
                x: Math.floor(Math.random() * columns), 
                y: Math.floor(Math.random() * rows) 
            };
        }
        
        const randomIndex = Math.floor(Math.random() * elements.length);
        const randomElement = elements[randomIndex];
        
        console.log(`🔍 [${MODULE_NAME}] Selected random element ${randomIndex} from ${elements.length} elements`);
        return { x: randomElement.position.x, y: randomElement.position.y };
    }
    
    /**
     * Calculate edge midpoint origins
     * 
     * @description
     * Calculates midpoint coordinates for grid edges, useful for
     * linear stagger effects from edge centers.
     * 
     * @param edge - Edge type (top, right, bottom, left)
     * @param rows - Number of grid rows
     * @param columns - Number of grid columns
     * @returns Edge midpoint coordinates
     */
    private calculateEdgeOrigin(edge: string, rows: number, columns: number): Point {
        switch (edge.toLowerCase()) {
            case 'top':
                return { x: (columns - 1) / 2, y: 0 };
            case 'right':
                return { x: columns - 1, y: (rows - 1) / 2 };
            case 'bottom':
                return { x: (columns - 1) / 2, y: rows - 1 };
            case 'left':
                return { x: 0, y: (rows - 1) / 2 };
            default:
                console.warn(`🔍 [${MODULE_NAME}] Unknown edge type: "${edge}", falling back to center`);
                return this.calculateCenterOrigin(rows, columns);
        }
    }
    
    /**
     * Validate origin coordinates
     * 
     * @description
     * Ensures origin coordinates are within valid grid bounds.
     * Clamps values to grid boundaries and provides fallback handling.
     * 
     * @param origin - Calculated origin coordinates
     * @param rows - Number of grid rows
     * @param columns - Number of grid columns
     * @returns Validated origin coordinates
     */
    private validateOrigin(origin: Point, rows: number, columns: number): Point {
        // Clamp coordinates to valid grid bounds
        const clampedX = Math.max(0, Math.min(columns - 1, origin.x));
        const clampedY = Math.max(0, Math.min(rows - 1, origin.y));
        
        // Check if clamping was necessary
        if (clampedX !== origin.x || clampedY !== origin.y) {
            console.warn(`🔍 [${MODULE_NAME}] Origin coordinates (${origin.x}, ${origin.y}) clamped to (${clampedX}, ${clampedY}) to fit grid bounds`);
        }
        
        return { x: clampedX, y: clampedY };
    }
    
    /**
     * Find closest grid element to target element
     * 
     * @description
     * Future feature: Finds the grid element closest to a target element
     * for pointer-based or element-relative origin calculations.
     * 
     * @param targetElement - Target element to find closest grid element to
     * @param gridResult - Grid detection result
     * @returns Position of closest grid element
     */
    private findClosestGridElementToTarget(
        targetElement: HTMLElement,
        gridResult: GridDetectionResult
    ): Point {
        const { elements, rows, columns } = gridResult;
        
        if (!elements || elements.length === 0) {
            console.warn(`🔍 [${MODULE_NAME}] No grid elements found, using default position`);
            return { x: 0, y: 0 };
        }
        
        if (!targetElement || !targetElement.getBoundingClientRect) {
            console.warn(`🔍 [${MODULE_NAME}] Invalid target element, using center position`);
            return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
        }
        
        try {
            const targetRect = targetElement.getBoundingClientRect();
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;
            
            // Find closest grid element by Euclidean distance
            let closestElement: GridElement | null = null;
            let closestDistance = Infinity;
            
            for (const element of elements) {
                const rect = element.pixelPosition;
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const dx = centerX - targetCenterX;
                const dy = centerY - targetCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestElement = element;
                }
            }
            
            if (closestElement) {
                console.log(`🔍 [${MODULE_NAME}] Found closest grid element at (${closestElement.position.x}, ${closestElement.position.y}), distance=${closestDistance.toFixed(1)}px`);
                return { x: closestElement.position.x, y: closestElement.position.y };
            }
            
        } catch (error) {
            console.error(`🔍 [${MODULE_NAME}] Error finding closest grid element: ${error}`);
        }
        
        // Fallback to center if no closest element found
        console.warn(`🔍 [${MODULE_NAME}] Could not find closest grid element, using center position`);
        return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
    }
    
    /**
     * Convert mouse position to grid coordinates
     * 
     * @description
     * Future feature: Converts mouse/pointer coordinates to grid space
     * for interactive origin selection.
     * 
     * @param mouseEvent - Mouse event with position data
     * @param gridResult - Grid detection result
     * @returns Grid coordinates from mouse position
     */
    private convertMousePositionToGridCoordinates(
        mouseEvent: MouseEvent | { clientX: number; clientY: number },
        gridResult: GridDetectionResult
    ): Point {
        const { elements, rows, columns } = gridResult;
        
        if (!elements || elements.length === 0 || !mouseEvent) {
            console.warn(`🔍 [${MODULE_NAME}] No grid elements or mouse event, using center position`);
            return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
        }
        
        try {
            const mouseX = mouseEvent.clientX;
            const mouseY = mouseEvent.clientY;
            
            if (mouseX === undefined || mouseY === undefined) {
                console.warn(`🔍 [${MODULE_NAME}] Invalid mouse position, using center position`);
                return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
            }
            
            console.log(`🔍 [${MODULE_NAME}] Mouse position: (${mouseX}, ${mouseY})`);
            
            // Calculate grid bounds in screen coordinates
            const gridBounds = this.calculateGridBounds(elements);
            
            // Map mouse position to grid coordinates
            const relativeX = (mouseX - gridBounds.left) / gridBounds.width;
            const relativeY = (mouseY - gridBounds.top) / gridBounds.height;
            
            const gridX = Math.max(0, Math.min(columns - 1, relativeX * (columns - 1)));
            const gridY = Math.max(0, Math.min(rows - 1, relativeY * (rows - 1)));
            
            console.log(`🔍 [${MODULE_NAME}] Mouse mapped to grid coordinates: (${gridX.toFixed(2)}, ${gridY.toFixed(2)})`);
            
            return { x: gridX, y: gridY };
            
        } catch (error) {
            console.error(`🔍 [${MODULE_NAME}] Error converting mouse position: ${error}`);
            return { x: (columns - 1) / 2, y: (rows - 1) / 2 };
        }
    }
    
    /**
     * Calculate grid bounds from elements
     * 
     * @description
     * Helper method to determine the bounding rectangle of all grid elements
     * for coordinate mapping calculations.
     * 
     * @param elements - Grid elements to analyze
     * @returns Grid boundary information
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
} 