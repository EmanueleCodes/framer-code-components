/**
 * FAME Animation System - Transform Utilities
 * 
 * @fileOverview CSS transform parsing, combination, and application utilities
 * @version 2.0.0-clean
 * @status TODO - Extract from TimedAnimator.ts
 * 
 * @description
 * Centralized utilities for handling CSS transform properties and matrix operations.
 * Extracted from TimedAnimator to enable proper transform combination and reuse.
 * 
 * @extraction_source
 * src-clean/execution/TimedAnimator.ts
 * - extractTransformValue() method (~21 lines)
 * - applyTransformProperty() method (~24 lines)
 * Total: ~45 lines to extract
 * 
 * @reference
 * src-refactored/animations/properties/transform/
 * - Transform matrix parsing algorithms
 * - Transform combination logic
 * - Performance optimization techniques
 * 
 * @architecture
 * - Pure functions for transform operations
 * - Matrix-based transform calculations
 * - Proper transform combination (not overwrite)
 * - Support for all CSS transform functions
 * - Performance optimized parsing and application
 * 
 * @api_design
 * ```typescript
 * // Main interfaces
 * export function parseTransformMatrix(transform: string): TransformData;
 * export function buildTransformString(transforms: TransformProperty[]): string;
 * export function extractTransformValue(transform: string, property: string): number;
 * export function combineTransforms(existingTransform: string, newProperty: string, value: string): string;
 * ```
 */

// ============================================================================
// 🚨 TODO [PHASE 2 - STEP 4]: IMPLEMENT TRANSFORM UTILITIES
// ============================================================================

/**
 * Transform property data structure
 */
export interface TransformProperty {
    type: 'translateX' | 'translateY' | 'translateZ' | 'scale' | 'scaleX' | 'scaleY' | 'rotate' | 'rotateX' | 'rotateY' | 'rotateZ' | 'skew' | 'skewX' | 'skewY';
    value: number;
    unit?: string;
}

/**
 * Parsed transform data structure
 */
export interface TransformData {
    translateX: number;
    translateY: number;
    translateZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    skewX: number;
    skewY: number;
}

/**
 * Extract transform values from transform matrix string
 * 
 * @param transform - CSS transform string (e.g., "matrix(1, 0, 0, 1, 50, 100)")
 * @param property - Specific transform property to extract
 * @returns Numeric value for the specified transform property
 * 
 * @example
 * ```typescript
 * extractTransformValue('translateX(50px) scale(1.5)', 'translateX') // 50
 * extractTransformValue('matrix(1.5, 0, 0, 1.5, 50, 100)', 'scaleX') // 1.5
 * ```
 */
export function extractTransformValue(transform: string, property: string): number {
    // ✅ EXTRACTED from TimedAnimator.extractTransformValue() method
    // 🚨 ENHANCED: Added basic transform parsing for common cases
    
    if (!transform || transform === 'none') {
        // Return default values for no transform
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
    
    // Try to extract specific transform function values
    const regex = new RegExp(`${property}\\(([^)]+)\\)`, 'i');
    const match = transform.match(regex);
    
    if (match) {
        const value = parseFloat(match[1]);
        return isNaN(value) ? 0 : value;
    }
    
    // Fallback to default values if not found
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
 * Parse CSS transform string into structured data
 * 
 * @param transform - CSS transform string
 * @returns Parsed transform data with all properties
 * 
 * @example
 * ```typescript
 * const data = parseTransformMatrix('translateX(50px) scale(1.5) rotate(45deg)');
 * console.log(data.translateX); // 50
 * console.log(data.scaleX); // 1.5
 * console.log(data.rotateZ); // 45
 * ```
 */
export function parseTransformMatrix(transform: string): TransformData {
    // TODO: Implement comprehensive transform parsing
    // TODO: Handle all transform functions and matrix values
    // TODO: Support for 3D transforms
    throw new Error('🚨 [TransformUtils] Transform parsing not yet implemented');
}

/**
 * Build CSS transform string from transform properties
 * 
 * @param transforms - Array of transform properties
 * @returns Combined CSS transform string
 * 
 * @example
 * ```typescript
 * const transformString = buildTransformString([
 *   { type: 'translateX', value: 50, unit: 'px' },
 *   { type: 'scale', value: 1.5 },
 *   { type: 'rotate', value: 45, unit: 'deg' }
 * ]);
 * // Returns: "translateX(50px) scale(1.5) rotate(45deg)"
 * ```
 */
export function buildTransformString(transforms: TransformProperty[]): string {
    // TODO: Implement transform string building
    // TODO: Handle proper unit application
    // TODO: Optimize for common transform combinations
    throw new Error('🚨 [TransformUtils] Transform building not yet implemented');
}

/**
 * Combine new transform with existing transform (instead of overwriting)
 * 
 * 🚨 CRITICAL BUG FIX: Previously in TimedAnimator, each transform overwrote the previous one!
 * ✅ FIXED: Now properly combines multiple transform properties!
 * 
 * 🚨 NEW FIX: Now handles matrix/matrix3d values from computed styles (Framer CSS classes)
 * 
 * @param existingTransform - Current transform string (could be matrix3d from computed styles)
 * @param newProperty - New transform property to apply
 * @param value - Value for the new property (with unit)
 * @returns Combined transform string
 * 
 * @example
 * ```typescript
 * // Fix the current overwrite problem
 * const existing = 'translateX(50px) scale(1.5)';
 * const combined = combineTransforms(existing, 'rotate', '45deg');
 * // Returns: "translateX(50px) scale(1.5) rotate(45deg)"
 * 
 * // Handle Framer's computed matrix values
 * const framerMatrix = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -0.0008333, 0, 0, 0, 1)';
 * const combined = combineTransforms(framerMatrix, 'rotateY', '80deg');
 * // Returns: "matrix3d(...) rotateY(80deg)" or proper decomposed combination
 * ```
 */
export function combineTransforms(existingTransform: string, newProperty: string, value: string): string {
    // ✅ EXTRACTED and ENHANCED from TimedAnimator.applyTransformProperty() method
    // 🚨 CRITICAL BUG FIX: Now properly combines transforms instead of overwriting!
    // 🚨 NEW FIX: Handle matrix/matrix3d values from computed styles
    
    const transforms = new Map<string, string>();
    
    // 🚨 CRITICAL FIX: Handle matrix/matrix3d values from getComputedStyle (Framer CSS classes)
    if (existingTransform && existingTransform !== 'none') {
        // Check if it's a matrix function (from computed styles)
        if (existingTransform.includes('matrix3d(') || existingTransform.includes('matrix(')) {
            console.log(`🔧 [TransformUtils] Detected matrix transform from computed styles: ${existingTransform}`);
            
            // For matrix values, we preserve them and add our new transform
            // This ensures Framer's perspective/3D transforms are maintained
            transforms.set('__matrix__', existingTransform);
        } else {
            // Parse individual transform functions (from previous FAME applications)
            const regex = /(\w+)\(([^)]+)\)/g;
            let match;
            
            while ((match = regex.exec(existingTransform)) !== null) {
                transforms.set(match[1], match[2]);
            }
        }
    }
    
    // Update the specific transform property
    transforms.set(newProperty, value);
    
    // Build the complete transform string in logical order
    const transformParts: string[] = [];
    
    // 🚨 CRITICAL FIX: If we have a matrix, preserve it first (maintains Framer's base transforms)
    if (transforms.has('__matrix__')) {
        const matrixValue = transforms.get('__matrix__');
        if (matrixValue) {
            transformParts.push(matrixValue);
        }
        transforms.delete('__matrix__'); // Remove so it's not added again
    }
    
    // Define logical transform order for individual properties
    const transformOrder = [
        'translateX', 'translateY', 'translateZ',
        'scaleX', 'scaleY', 'scaleZ', 'scale',
        'rotateX', 'rotateY', 'rotateZ', 'rotate',
        'skewX', 'skewY'
    ];
    
    // Add transforms in the correct order
    transformOrder.forEach(prop => {
        if (transforms.has(prop)) {
            const val = transforms.get(prop);
            if (val !== undefined) {
                transformParts.push(`${prop}(${val})`);
            }
        }
    });
    
    // Add any other transforms not in the standard order
    transforms.forEach((val, prop) => {
        if (!transformOrder.includes(prop) && prop !== '__matrix__') {
            transformParts.push(`${prop}(${val})`);
        }
    });
    
    const result = transformParts.join(' ');
    //console.log(`🔧 [TransformUtils] Combined transform result: ${result}`);
    
    return result;
}

/**
 * Apply a single transform property to element with proper combination
 * 
 * 🚨 CRITICAL BUG FIX: Previously in TimedAnimator, each transform overwrote the previous one!
 * ✅ FIXED: Now properly combines multiple transform properties!
 * 
 * 🚨 NEW FIX: Now reads computed styles to properly combine with Framer's perspective/transform CSS classes
 * 
 * @param element - Target HTML element
 * @param property - Transform property (translateX, scale, etc.)
 * @param value - Property value with unit (e.g., "50px", "1.5", "45deg")
 * 
 * @example
 * ```typescript
 * // Proper transform combination - multiple calls should combine, not overwrite
 * applyTransform(element, 'translateX', '50px'); // transform: translateX(50px)
 * applyTransform(element, 'scale', '1.5');       // transform: translateX(50px) scale(1.5)
 * applyTransform(element, 'rotate', '45deg');    // transform: translateX(50px) scale(1.5) rotate(45deg)
 * ```
 */
export function applyTransform(element: HTMLElement, property: string, value: string): void {
    // ✅ EXTRACTED from TimedAnimator.applyTransformProperty() method
    // 🚨 CRITICAL BUG FIX: Now properly combines transforms instead of overwriting!
    // 🚨 NEW FIX: Read computed styles to include Framer's CSS class transforms
    
    try {
        // 🚨 CRITICAL FIX: Read computed styles to include Framer's perspective/transform CSS classes
        const computedStyle = window.getComputedStyle(element);
        const computedTransform = computedStyle.transform || 'none';
        
        // Get existing inline transform (from previous FAME applications)
        const inlineTransform = element.style.transform || '';
        
        // Use inline transform if it exists (more recent), otherwise use computed transform
        const existingTransform = inlineTransform || (computedTransform !== 'none' ? computedTransform : '');
        
        // console.log(`🔧 [TransformUtils] Combining transforms for ${property}(${value}):`, {
        //     computedTransform,
        //     inlineTransform,
        //     existingTransform,
        //     willCombineWith: value
        // });
        
        // Combine with new property using our fixed combination logic
        const combinedTransform = combineTransforms(existingTransform, property, value);
        
        // console.log(`🔧 [TransformUtils] Combined result: ${combinedTransform}`);
        
        // 🚨 CRITICAL FIX: Apply with !important to override Framer's CSS class specificity
        element.style.setProperty('transform', combinedTransform, 'important');
        
        // console.log(`🔧 [TransformUtils] Applied combined transform with !important: ${combinedTransform}`);
        
    } catch (error) {
        console.error(`[TransformUtils] Error applying transform ${property}(${value}):`, error);
        
        // Fallback: apply the transform directly with !important
        try {
            element.style.setProperty('transform', `${property}(${value})`, 'important');
            console.warn(`[TransformUtils] Fallback: Applied ${property}(${value}) directly with !important`);
        } catch (fallbackError) {
            console.error(`[TransformUtils] Fallback also failed:`, fallbackError);
        }
    }
}

/**
 * Apply complete transform string to element
 * 
 * @param element - Target HTML element
 * @param transformString - Complete transform string to apply
 * 
 * @example
 * ```typescript
 * applyTransformString(element, 'translateX(50px) scale(1.5) rotate(45deg)');
 * ```
 */
export function applyTransformString(element: HTMLElement, transformString: string): void {
    try {
        element.style.transform = transformString;
        
        // if (typeof console !== 'undefined' && console.log) {
        //     console.log(`🔧 [TransformUtils] Applied complete transform: ${transformString}`);
        // }
    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`🔧 [TransformUtils] Error applying transform string:`, error);
        }
    }
}

// ============================================================================
// 🎯 EXTRACTION PLAN
// ============================================================================

/*
STEP 1: Extract current implementations from TimedAnimator.ts
-----------------------------------------------------------
✅ Methods to extract:
- extractTransformValue(transform, property): number (~21 lines)
- applyTransformProperty(element, property, value): void (~24 lines)

📊 Current size: ~45 lines total
🎯 Target size: ~200-250 lines (with comprehensive support)

STEP 2: Fix current problems and enhance
---------------------------------------
✅ CRITICAL FIX: Transform combination (currently overwrites)
Current problem: element.style.transform = `translateX(${value})` overwrites other transforms
Solution: Parse existing transforms, combine with new property, rebuild string

✅ Add comprehensive transform support:
- Proper matrix parsing for all transform functions
- 3D transform support (translateZ, rotateX/Y, perspective)
- Transform origin handling
- Performance optimizations

STEP 3: Integration testing
--------------------------
✅ Verify TimedAnimator works with extracted functions
✅ Test transform combination works correctly (no more overwrites)
✅ Performance testing (optimize parsing and combination)
✅ ScrollAnimator can use same functions

BENEFITS AFTER EXTRACTION:
- ✅ Proper transform combination (currently overwrites)
- ✅ Support for complex transform matrices
- ✅ Better performance with transform caching
- ✅ Comprehensive transform property support
- ✅ Reusable across all animation systems
- ✅ Foundation for 3D animations
*/

// ============================================================================
// 🔧 FUTURE TRANSFORM FEATURES
// ============================================================================

/*
TODO: Comprehensive transform support:

🎯 CURRENT SUPPORT (from TimedAnimator)
- Basic individual transforms (translateX, translateY, scale, rotate)
- ❌ PROBLEM: Overwrites other transforms

🎯 ENHANCED SUPPORT (future)
- Proper transform combination and preservation
- 3D transforms: translateZ, rotateX, rotateY, perspective
- Transform origin support
- Matrix decomposition and recomposition
- Transform interpolation for smooth animations
- GPU acceleration detection and optimization

🎯 PERFORMANCE OPTIMIZATIONS
- Cached transform parsing results
- Optimized matrix calculations
- Batch transform updates
- GPU-accelerated property detection
*/

// ============================================================================
// 🚨 CRITICAL PROBLEM TO FIX
// ============================================================================

/*
CURRENT PROBLEM IN TimedAnimator.applyTransformProperty():

❌ BAD (current):
switch (property) {
    case 'translateX':
        element.style.transform = `translateX(${value})`; // OVERWRITES other transforms!
        break;
    case 'scale':
        element.style.transform = `scale(${value})`; // OVERWRITES translateX!
        break;
}

✅ GOOD (after extraction):
const existingTransform = element.style.transform || '';
const combinedTransform = combineTransforms(existingTransform, property, value);
element.style.transform = combinedTransform;

EXAMPLE DIFFERENCE:
❌ Current: translateX(50px) → scale(1.5) → only scale(1.5) applied
✅ Fixed: translateX(50px) → scale(1.5) → "translateX(50px) scale(1.5)" applied
*/

// ============================================================================
// 📏 SUCCESS METRICS
// ============================================================================

/*
✅ EXTRACTION SUCCESS CRITERIA:
- TimedAnimator.ts reduced by ~45 lines
- All existing transform application continues working
- CRITICAL: Transform combination works (no more overwrites)
- Same performance (or better)
- Clean, reusable interface
- Ready for ScrollAnimator integration

🎯 ENHANCEMENT SUCCESS CRITERIA:
- Comprehensive transform parsing and combination
- 3D transform support
- Foundation for advanced transform animations
- Better performance with transform optimizations
- Easier to debug and maintain transform logic
*/ 