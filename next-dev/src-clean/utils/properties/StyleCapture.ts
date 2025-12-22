/**
 * FAME Animation System - Style Capture Utilities
 * 
 * @fileOverview CSS style value capture and computation utilities
 * @version 2.0.0-clean
 * @status TODO - Extract from TimedAnimator.ts
 * 
 * @description
 * Centralized utilities for capturing and computing CSS property values.
 * Extracted from TimedAnimator to enable reuse across all animators.
 * 
 * @extraction_source
 * src-clean/execution/TimedAnimator.ts
 * - captureInitialStyles() method (~13 lines)
 * - getPropertyValue() method (~31 lines)  
 * - extractTransformValue() method (~21 lines)
 * Total: ~65 lines to extract
 * 
 * @reference
 * src-refactored/animations/properties/
 * - Property value extraction patterns
 * - Computed style optimization techniques
 * - Transform matrix parsing logic
 * 
 * @architecture
 * - Pure functions for style computation
 * - Optimized computed style access
 * - Comprehensive property type support
 * - Transform-aware value extraction
 * - Reusable across all animators
 * 
 * @api_design
 * ```typescript
 * // Main interfaces
 * export function captureElementStyles(element: HTMLElement, properties: string[]): StyleMap;
 * export function getCurrentPropertyValue(element: HTMLElement, property: string): PropertyValue;
 * ```
 */

import { PropertyValue, AnimationProperty } from '../../types/index.ts';
import { getCachedComputedStyles } from '../performance/PrecomputedStyleCache.ts';

// ============================================================================
// 🚨 TODO [PHASE 2 - STEP 2]: IMPLEMENT STYLE CAPTURE UTILITIES
// ============================================================================

/**
 * Style map for storing captured property values
 */
export type StyleMap = Map<string, PropertyValue>;

/**
 * Capture current styles for multiple animation properties
 * 
 * @param element - Target HTML element
 * @param properties - Array of CSS property names to capture
 * @returns Map of property names to current values
 * 
 * @example
 * ```typescript
 * const styles = captureElementStyles(element, ['opacity', 'translateX', 'scale']);
 * console.log(styles.get('opacity')); // 1
 * console.log(styles.get('translateX')); // 0
 * ```
 */
export function captureElementStyles(element: HTMLElement, properties: string[]): StyleMap {
    // ✅ ENHANCED implementation based on TimedAnimator extraction
    const styles = new Map<string, PropertyValue>();
    
    // Validate inputs
    if (!element || !properties || properties.length === 0) {
        console.warn('🚨 [StyleCapture] Invalid element or properties provided');
        return styles;
    }
    
    // Optimize: Single getComputedStyle call
    const computedStyle = getComputedStyle(element);
    
    properties.forEach(property => {
        try {
            const currentValue = getCurrentPropertyValue(element, property, computedStyle);
            styles.set(property, currentValue);
            
            console.log(`🎨 [StyleCapture] Captured ${property}:`, currentValue);
        } catch (error) {
            console.warn(`🚨 [StyleCapture] Failed to capture property '${property}':`, error);
            styles.set(property, 0); // Fallback value
        }
    });
    
    return styles;
}

/**
 * Get current value of a specific CSS property
 * 
 * @param element - Target HTML element
 * @param property - CSS property name
 * @param computedStyle - Optional pre-computed style (for optimization)
 * @returns Current property value
 * 
 * @example
 * ```typescript
 * const opacity = getCurrentPropertyValue(element, 'opacity'); // 1
 * const translateX = getCurrentPropertyValue(element, 'translateX'); // 0
 * ```
 */
export function getCurrentPropertyValue(element: HTMLElement, property: string, computedStyle?: CSSStyleDeclaration): PropertyValue {
    // 🚀 PERFORMANCE: Try cached styles first, fallback to computed styles
    const startTime = performance.now();
    
    try {
        // Use cached styles for better performance
        const cachedStyles = getCachedComputedStyles(element, [property]);
        const cachedValue = cachedStyles.get(property);
        
        if (cachedValue !== undefined) {
            const lookupTime = performance.now() - startTime;
            if (lookupTime > 0.1) {
                console.log(`🚀 [StyleCapture] ✅ Used cached style in ${lookupTime.toFixed(3)}ms`);
            }
            
            // Handle different property types with cached value
            switch (property) {
                case 'opacity':
                    return parseFloat(String(cachedValue)) || 1;
                    
                case 'translateX':
                case 'translateY':
                case 'translateZ':
                    // Extract from transform matrix
                    return extractTransformValue(String(cachedValue), property);
                    
                case 'scale':
                case 'scaleX':
                case 'scaleY':
                    return extractTransformValue(String(cachedValue), property);
                    
                case 'rotate':
                case 'rotateX':
                case 'rotateY':
                case 'rotateZ':
                    return extractTransformValue(String(cachedValue), property);
                    
                default:
                    // Try to parse as number, fallback to string or 0
                    const numValue = parseFloat(String(cachedValue));
                    return isNaN(numValue) ? (cachedValue || 0) : numValue;
            }
        }
    } catch (error) {
        console.warn('🚀 [StyleCapture] Error getting cached style, falling back to computed style:', error);
    }
    
    // Fallback to traditional computed style (should be rare after cache warming)
    console.warn(`🚀 [StyleCapture] ⚠️ Cache miss for property '${property}' - using blocking getComputedStyle`);
    
    computedStyle = computedStyle || getComputedStyle(element);
    
    // Handle different property types
    switch (property) {
        case 'opacity':
            return parseFloat(computedStyle.opacity) || 1;
            
        case 'translateX':
        case 'translateY':
        case 'translateZ':
            // Extract from transform matrix
            return extractTransformValue(computedStyle.transform, property);
            
        case 'scale':
        case 'scaleX':
        case 'scaleY':
            return extractTransformValue(computedStyle.transform, property);
            
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
            return extractTransformValue(computedStyle.transform, property);
            
        default:
            // For other properties, try to get the computed value
            const value = computedStyle.getPropertyValue(property);
            // Try to parse as number, fallback to string or 0
            const numValue = parseFloat(value);
            return isNaN(numValue) ? (value || 0) : numValue;
    }
}

/**
 * Helper function for transform value extraction
 * NOTE: This is a simplified implementation. Will be enhanced when TransformUtils.ts is implemented.
 * 
 * @param transform - CSS transform string
 * @param property - Transform property to extract
 * @returns Numeric value for the transform property
 */
function extractTransformValue(transform: string, property: string): number {
    // 🚨 TEMPORARY IMPLEMENTATION - Will be replaced when TransformUtils.ts is implemented
    // For now, return default values - transform parsing is complex
    switch (property) {
        case 'translateX':
        case 'translateY':
        case 'translateZ':
            return 0;
        case 'scale':
        case 'scaleX':
        case 'scaleY':
            return 1;
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
            return 0;
        default:
            return 0;
    }
}

/**
 * Enhanced version for batch operations with animation properties
 * 
 * @param element - Target HTML element
 * @param properties - Array of animation property configurations
 * @returns Map of property names to current values
 */
export function captureInitialStyles(element: HTMLElement, properties: AnimationProperty[]): StyleMap {
    // 🚀 PERFORMANCE: Enhanced with cached styles for better performance
    const styles = new Map<string, PropertyValue>();
    const startTime = performance.now();
    
    // Validate inputs
    if (!element || !properties || properties.length === 0) {
        console.warn('🚨 [StyleCapture] Invalid element or properties provided');
        return styles;
    }
    
    try {
        // Extract property names for batch cached lookup
        const propertyNames = properties.map(prop => prop.property);
        
        // 🚀 PERFORMANCE: Try cached styles first for all properties
        const cachedStyles = getCachedComputedStyles(element, propertyNames);
        let cacheHits = 0;
        let cacheMisses = 0;
        
        properties.forEach(prop => {
            try {
                const cachedValue = cachedStyles.get(prop.property);
                
                if (cachedValue !== undefined) {
                    // Cache hit - use cached value
                    const processedValue = processPropertyValue(cachedValue, prop.property);
                    styles.set(prop.property, processedValue);
                    cacheHits++;
                    
                    console.log(`🎨 [StyleCapture] ✅ Cached ${prop.property}:`, processedValue);
                } else {
                    // Cache miss - fallback to individual lookup
                    const currentValue = getCurrentPropertyValue(element, prop.property);
                    styles.set(prop.property, currentValue);
                    cacheMisses++;
                    
                    console.log(`🎨 [StyleCapture] ⚠️ Computed ${prop.property}:`, currentValue);
                }
            } catch (error) {
                console.warn(`🚨 [StyleCapture] Failed to capture property '${prop.property}':`, error);
                styles.set(prop.property, 0); // Fallback value
                cacheMisses++;
            }
        });
        
        const totalTime = performance.now() - startTime;
        const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
        
        console.log(`🚀 [StyleCapture] ✅ Captured ${properties.length} properties in ${totalTime.toFixed(2)}ms (${hitRate.toFixed(1)}% cache hit rate)`);
        
    } catch (error) {
        console.error('🚨 [StyleCapture] Error in batch style capture:', error);
        
        // Ultimate fallback - single getComputedStyle call
        const computedStyle = getComputedStyle(element);
        
        properties.forEach(prop => {
            try {
                const currentValue = getCurrentPropertyValue(element, prop.property, computedStyle);
                styles.set(prop.property, currentValue);
            } catch (error) {
                styles.set(prop.property, 0);
            }
        });
    }
    
    return styles;
}

/**
 * Process a property value based on its type
 */
function processPropertyValue(value: PropertyValue, property: string): PropertyValue {
    switch (property) {
        case 'opacity':
            return parseFloat(String(value)) || 1;
            
        case 'translateX':
        case 'translateY':
        case 'translateZ':
        case 'scale':
        case 'scaleX':
        case 'scaleY':
        case 'rotate':
        case 'rotateX':
        case 'rotateY':
        case 'rotateZ':
            return extractTransformValue(String(value), property);
            
        default:
            // Try to parse as number, fallback to string or 0
            const numValue = parseFloat(String(value));
            return isNaN(numValue) ? (value || 0) : numValue;
    }
}

// ============================================================================
// 🎯 EXTRACTION PLAN
// ============================================================================

/*
STEP 1: Extract current implementations from TimedAnimator.ts
-----------------------------------------------------------
✅ Methods to extract:
- captureInitialStyles(element, properties): Map<string, PropertyValue> (~13 lines)
- getPropertyValue(element, property, computedStyle?): PropertyValue (~31 lines)
- extractTransformValue(transform, property): number (~21 lines) → Move to TransformUtils

📊 Current size: ~65 lines total
🎯 Target size: ~120-150 lines (with enhancements)

STEP 2: Enhance with better property support
------------------------------------------
✅ Add support for:
- More CSS property types (colors, gradients, etc.)
- Better unit handling and parsing
- Improved computed style optimization
- Better error handling and validation
- Support for CSS custom properties (--variables)

STEP 3: Integration testing
--------------------------
✅ Verify TimedAnimator works with extracted functions
✅ Test all property types work correctly  
✅ Performance testing (optimize computed style access)
✅ ScrollAnimator can use same functions

BENEFITS AFTER EXTRACTION:
- ✅ Centralized style capture logic
- ✅ Reusable by all animators (Timed, Scroll, etc.)
- ✅ Better computed style optimization
- ✅ Improved transform value extraction
- ✅ Better error handling and validation
- ✅ Foundation for advanced property support
*/

// ============================================================================
// 🔧 FUTURE ENHANCEMENTS
// ============================================================================

/*
TODO: Enhanced property support:

🎯 CURRENT SUPPORT (from TimedAnimator)
- opacity (numeric)
- transform properties (translateX/Y/Z, scale, rotate)
- basic CSS properties (via getPropertyValue)

🎯 ENHANCED SUPPORT (future)
- Colors (hex, rgb, rgba, hsl, hsla)
- Gradients (linear, radial)
- Box shadows and text shadows
- Filters (blur, brightness, etc.)
- CSS custom properties (--variables)
- Complex transform matrices
- CSS Grid and Flexbox properties

🎯 PERFORMANCE OPTIMIZATIONS
- Single getComputedStyle() call per element
- Cached style computation results
- Batch property access
- GPU-accelerated property detection
*/

// ============================================================================
// 📏 SUCCESS METRICS
// ============================================================================

/*
✅ EXTRACTION SUCCESS CRITERIA:
- TimedAnimator.ts reduced by ~65 lines
- All existing style capture continues working
- Same performance (or better with optimizations)
- Clean, reusable interface
- Ready for ScrollAnimator integration

🎯 ENHANCEMENT SUCCESS CRITERIA:
- Comprehensive property type support
- Better performance with style caching
- Foundation for advanced CSS property animations
- Easier to debug and maintain style logic
*/ 