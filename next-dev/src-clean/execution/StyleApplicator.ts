/**
 * FAME Animation System - Style Applicator
 *
 * @fileOverview DOM style application and manipulation utilities
 * @version 2.0.0-clean
 * @status ACTIVE - Core property application implemented
 *
 * @description
 * Clean DOM manipulation system that applies animation styles to elements.
 * Handles CSS transforms, properties, and performance optimizations.
 *
 * ✅ PHASE 2 - STEP 5: Extracted applyPropertyValue() from TimedAnimator (~15 lines)
 *
 * @extraction_source
 * src-clean/execution/TimedAnimator.ts
 * - applyPropertyValue() method with UNIT BUG FIX
 *
 * @reference
 * src-refactored/animations/applicators/
 * - TransformApplicator.ts - CSS transform application (working)
 * - StyleApplicator utilities - Property application patterns
 * - GPU acceleration patterns
 *
 * @architecture
 * - Clean separation from TimedAnimator
 * - Reusable across all animation systems
 * - Intelligent unit handling prevents duplication
 * - Integrates with extracted utilities (TransformUtils)
 * - Performance optimized property application
 *
 * @responsibilities
 * - Apply individual CSS properties to elements
 * - Handle CSS transforms through TransformUtils
 * - Prevent unit duplication with intelligent detection
 * - Optimize DOM manipulation performance
 * - Validate property values and handle edge cases
 */

import { PropertyValue } from "../types/index.ts"
import { applyTransform } from "../utils/properties/TransformUtils.ts"
import { interpolateToPixels } from "../utils/units/SimpleUnitConverter.ts"
import { interpolateCalc } from '../utils/units/CalcExpressionInterpolator.ts';
import { convertToPixels } from '../utils/units/SimpleUnitConverter.ts';
import { interpolateProperty } from '../utils/properties/PropertyInterpolator.ts'

// Import advanced interpolators for special property handling
import { 
    applyTextBackgroundImage, 
    findTextElement,
    interpolateGradient,
    interpolateClipPath
} from '../utils/properties/AdvancedInterpolators.ts'

/**
 * Convert camelCase property names to kebab-case for CSS
 * 
 * @param property - Property name in camelCase (e.g., 'borderRadius')
 * @returns Property name in kebab-case (e.g., 'border-radius')
 */
function camelToKebabCase(property: string): string {
    return property.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Apply a single property value to an element with intelligent unit handling
 */
export function applyProperty(
    element: HTMLElement,
    property: string,
    value: PropertyValue,
    unit?: string
): void {
    // Handle calc expressions and percentage values
    let valueStr = String(value);
    let finalValue = valueStr;
    
    // 🎨 SPECIAL PROPERTY HANDLING: Handle textBackgroundImage before regular processing
    if (property === 'textBackgroundImage') {
        // Find the actual text element within the target element
        const textElement = findTextElement(element);
        if (textElement) {
            // Apply text background image with proper clipping
            applyTextBackgroundImage(textElement, valueStr);
            console.log(`🎨 [StyleApplicator] Applied textBackgroundImage to text element: ${valueStr}`);
        } else {
            console.warn(`🎨 [StyleApplicator] No text element found for textBackgroundImage, applying to container as fallback`);
            // Fallback: apply to the container element
            element.style.backgroundImage = valueStr;
        }
        return; // Early return for special property
    }
    
    // 🎨 SPECIAL PROPERTY HANDLING: Handle other advanced properties  
    if (property === 'gradientBackground') {
        element.style.backgroundImage = valueStr;
        console.log(`🎨 [StyleApplicator] Applied gradientBackground: ${valueStr}`);
        return; // Early return for special property
    }
    
    if (property === 'clipPath') {
        element.style.clipPath = valueStr;
        console.log(`🎨 [StyleApplicator] Applied clipPath: ${valueStr}`);
        return; // Early return for special property
    }
    
    // Handle cross-unit interpolation markers
    if (valueStr.startsWith('__CROSS_UNIT_INTERPOLATION__:')) {
        console.log('[CALC_DEBUG] Detected cross-unit marker:', valueStr);
        console.log('[CALC_DEBUG] ⚠️  Processing cross-unit interpolation - this should NOT affect behavior decisions!');
        
        try {
            const parts = valueStr.split(':');
            if (parts.length === 4) {
                const [, fromValue, toValue, progress] = parts;
                const progressNum = parseFloat(progress);
                
                console.log('[CALC_DEBUG] Parsed marker:', {
                    fromValue,
                    toValue,
                    progress: progressNum,
                    property,
                    originalValue: value,
                    originalValueStr: valueStr
                });
                
                // IMPORTANT: Log the actual input values to see if they match UI
                console.log('[CALC_DEBUG] ❗ CHECKING VALUES - UI shows "0%" to "calc(-100% + 170px)" but we got:', {
                    fromValue,
                    toValue,
                    doesFromMatch: fromValue === '0%',
                    doesToMatch: toValue === 'calc(-100% + 170px)',
                    actualFrom: fromValue,
                    actualTo: toValue
                });
                
                // Check if this involves calc expressions or percentages for transforms
                const hasCalcExpressions = fromValue.includes('calc(') || toValue.includes('calc(');

                // FIXED: Only use calc interpolation for actual calc expressions
                console.log('[CALC_DEBUG] Decision factors:', {
                    hasCalcExpressions,
                    fromValue,
                    toValue,
                    willUseCalcInterpolation: hasCalcExpressions
                });

                if (hasCalcExpressions) {
                    // Use our calc interpolation system for calc expressions
                    console.log('[CALC_DEBUG] Using calc interpolation for calc expressions');
                    try {
                        const interpolatedValue = interpolateCalc(fromValue, toValue, progressNum, element, property);
                        console.log('[CALC_DEBUG] ✅ Calc interpolation result:', interpolatedValue);
                        finalValue = interpolatedValue;
                    } catch (calcError) {
                        console.error('[CALC_DEBUG] ❌ Calc interpolation failed:', calcError);
                        finalValue = valueStr; // Use original value as fallback
                    }
                } else {
                    // FIXED: Simple direct cross-unit interpolation (like same-unit but with conversion)
                    // This now handles ALL non-calc cases, including percentage transforms
                    console.log('[CALC_DEBUG] 🚀 Using SIMPLE direct cross-unit interpolation (like same-unit logic)');
                    console.log('[CALC_DEBUG] Direct interpolation inputs:', { fromValue, toValue, progressNum });
                    
                    try {
                        // Convert both values to pixels (similar to same-unit parsing)
                        console.log('[CALC_DEBUG] 🔍 About to convert values to pixels:', {
                            fromValue,
                            toValue,
                            element: {
                                tagName: element.tagName,
                                className: element.className,
                                isConnected: element.isConnected,
                                offsetWidth: element.offsetWidth,
                                offsetHeight: element.offsetHeight
                            },
                            property,
                            viewport: {
                                innerWidth: window.innerWidth,
                                innerHeight: window.innerHeight
                            }
                        });
                        
                        const fromPixels = convertToPixels(fromValue, element, property);
                        console.log('[CALC_DEBUG] 🔍 From value conversion result:', {
                            input: fromValue,
                            output: fromPixels,
                            isNaN: isNaN(fromPixels)
                        });
                        
                        const toPixels = convertToPixels(toValue, element, property);
                        console.log('[CALC_DEBUG] 🔍 To value conversion result:', {
                            input: toValue,
                            output: toPixels,
                            isNaN: isNaN(toPixels)
                        });
                        
                        if (!isNaN(fromPixels) && !isNaN(toPixels)) {
                            const interpolatedPixels = fromPixels + (toPixels - fromPixels) * progressNum;
                            console.log('[CALC_DEBUG] 🔍 Interpolation calculation:', {
                                fromPixels,
                                toPixels,
                                progressNum,
                                difference: toPixels - fromPixels,
                                result: interpolatedPixels
                            });
                            
                            // Round to avoid floating point precision issues
                            const rounded = Math.round(interpolatedPixels * 1000) / 1000;
                            finalValue = `${rounded}px`;
                            console.log('[CALC_DEBUG] ✅ Direct cross-unit result:', finalValue);
                        } else {
                            console.error('[CALC_DEBUG] ❌ Conversion to pixels failed - using fallback');
                            finalValue = valueStr;
                        }
                    } catch (directError) {
                        console.error('[CALC_DEBUG] ❌ Direct interpolation failed:', directError);
                        finalValue = valueStr;
                    }
                }
            } else {
                console.error('[CALC_DEBUG] ❌ Invalid cross-unit marker format');
                finalValue = valueStr;
            }
        } catch (error) {
            console.error('[CALC_DEBUG] Failed to resolve cross-unit interpolation:', error);
            console.error('[CALC_DEBUG] ❌ This error might be affecting animation behavior!');
            finalValue = valueStr;
        }
    }
    // Preserve calc expressions
    else if (valueStr.includes('calc(')) {
        finalValue = valueStr;
    }
    // Handle percentage values for transforms
    else if (valueStr.endsWith('%')) {
        if (isTransformProperty(property)) {
            finalValue = valueStr; // Keep percentage as is for transforms
        } else {
            finalValue = valueStr; // Keep percentage for regular properties too
        }
    }
    // Handle numeric values that need units
    else if (!isNaN(Number(valueStr)) && unit) {
        finalValue = `${valueStr}${unit}`;
    }
    
    // Use TransformUtils for transform properties
    if (isTransformProperty(property)) {
        applyTransform(element, property, finalValue);
        
        // Handle text elements
        if (element.classList.contains('fame-text-line') || 
            element.classList.contains('fame-text-word') || 
            element.classList.contains('fame-text-char')) {
            const currentTransform = element.style.transform;
            if (currentTransform) {
                element.style.setProperty('transform', currentTransform, 'important');
            }
        }
    } else {
        const cssPropertyName = camelToKebabCase(property);
        
        if (element.classList.contains('fame-text-line') || 
            element.classList.contains('fame-text-word') || 
            element.classList.contains('fame-text-char')) {
            element.style.setProperty(cssPropertyName, finalValue, 'important');
        } else {
            element.style.setProperty(cssPropertyName, finalValue);
        }
    }
}

/**
 * Check if a property is a transform property
 */
function isTransformProperty(property: string): boolean {
    return [
        'translateX', 'translateY', 'translateZ',
        'scale', 'scaleX', 'scaleY',
        'rotate', 'rotateX', 'rotateY', 'rotateZ',
        'skewX', 'skewY'
    ].includes(property);
}

/**
 * Apply multiple properties to an element in batch
 *
 * @param element - Target HTML element
 * @param properties - Array of property configurations
 *
 * @example
 * ```typescript
 * applyProperties(element, [
 *   { property: 'translateX', value: 50, unit: 'px' },
 *   { property: 'opacity', value: 0.8 },
 *   { property: 'scale', value: 1.2 }
 * ]);
 * ```
 */
export function applyProperties(
    element: HTMLElement,
    properties: Array<{ property: string; value: PropertyValue; unit?: string }>
): void {
    // Batch property application for better performance
    properties.forEach(({ property, value, unit }) => {
        applyProperty(element, property, value, unit)
    })
}

/**
 * Apply animation styles to an element based on progress
 * @param element - Element to apply styles to
 * @param properties - Animation properties to apply
 * @param progress - Animation progress (0-1)
 */
export function applyAnimationStyles(
    element: HTMLElement,
    properties: any[], // TODO: AnimationProperty[]
    progress: number
): void {
    if (!element || !properties || properties.length === 0) {
        return;
    }

    // ✅ PERFORMANCE OPTIMIZED: Removed logs that run on every frame
    // console.log(`🎨 [StyleApplicator] Applying animation styles to ${element.tagName} with progress ${progress.toFixed(3)}`, {
    //     elementClasses: element.className,
    //     elementTextContent: element.textContent?.slice(0, 30) + '...',
    //     propertiesCount: properties.length
    // });

    // Apply each property individually
    properties.forEach(property => {
        try {
            // Get interpolated value for current progress
            const value = interpolatePropertyValue(property, progress);

            // Apply the property using our existing applyProperty function
            applyProperty(element, property.property, value, property.unit);

            // ✅ PERFORMANCE OPTIMIZED: Removed logs that run on every frame
            // console.log(`✅ [StyleApplicator] Applied ${property.property}: ${value}${property.unit || ''}`);
        } catch (error) {
            console.warn(`❌ [StyleApplicator] Failed to apply ${property.property}:`, error);
        }
    });
}

/**
 * Apply CSS transform properties efficiently
 * @param element - Element to transform
 * @param transforms - Transform properties and values
 */
export function applyTransforms(
    element: HTMLElement,
    transforms: TransformProperties
): void {
    const transformParts: string[] = [];
    
    // Build transform string from individual properties
    if (transforms.translateX !== undefined) transformParts.push(`translateX(${transforms.translateX})`);
    if (transforms.translateY !== undefined) transformParts.push(`translateY(${transforms.translateY})`);
    if (transforms.translateZ !== undefined) transformParts.push(`translateZ(${transforms.translateZ})`);
    if (transforms.rotateX !== undefined) transformParts.push(`rotateX(${transforms.rotateX})`);
    if (transforms.rotateY !== undefined) transformParts.push(`rotateY(${transforms.rotateY})`);
    if (transforms.rotateZ !== undefined) transformParts.push(`rotateZ(${transforms.rotateZ})`);
    if (transforms.scaleX !== undefined) transformParts.push(`scaleX(${transforms.scaleX})`);
    if (transforms.scaleY !== undefined) transformParts.push(`scaleY(${transforms.scaleY})`);
    if (transforms.scaleZ !== undefined) transformParts.push(`scaleZ(${transforms.scaleZ})`);
    if (transforms.skewX !== undefined) transformParts.push(`skewX(${transforms.skewX})`);
    if (transforms.skewY !== undefined) transformParts.push(`skewY(${transforms.skewY})`);
    
    // Apply combined transform
    if (transformParts.length > 0) {
        const transformString = transformParts.join(' ');
        element.style.transform = transformString;
        
        // Add GPU acceleration hint
        if (!element.style.willChange.includes('transform')) {
            element.style.willChange = element.style.willChange ? 
                `${element.style.willChange}, transform` : 'transform';
        }
    }
}

/**
 * Interpolate a property value based on animation progress
 * @param property - Animation property configuration
 * @param progress - Animation progress (0-1)
 * @returns Interpolated value
 */
export function interpolatePropertyValue(
    property: any, // TODO: AnimationProperty
    progress: number
): string | number {
    if (!property || progress < 0 || progress > 1) {
        return property.from || 0;
    }

    // 🎨 ENHANCED: Use advanced property interpolation for complex properties
    const propertyName = property.property;
    const fromValue = property.from;
    const toValue = property.to;
    
    // Check if this is one of our new advanced properties
    if (propertyName === 'gradientBackground' || 
        propertyName === 'textBackgroundImage') {
        // Use gradient interpolation
        return interpolateGradient(String(fromValue), String(toValue), progress);
    }
    
    if (propertyName === 'clipPath') {
        // Use clip path interpolation
        return interpolateClipPath(String(fromValue), String(toValue), progress);
    }
    
    // For other properties, use the general property interpolation system
    if (typeof fromValue === 'string' || typeof toValue === 'string') {
        // Use the enhanced property interpolator for string-based properties
        const result = interpolateProperty(fromValue, toValue, progress, propertyName);
        // Ensure we return string or number as expected by the function signature
        return typeof result === 'boolean' ? (result ? 1 : 0) : result;
    }
    
    // Fallback to numeric interpolation for simple numeric properties
    const from = parseFloat(String(fromValue)) || 0;
    const to = parseFloat(String(toValue)) || 0;
    
    // Linear interpolation between from and to values
    const interpolated = from + (to - from) * progress;
    
    // Return interpolated value, rounded to avoid floating point precision issues
    return Math.round(interpolated * 1000) / 1000;
}

/**
 * Transform properties interface
 */
export interface TransformProperties {
    translateX?: number | string
    translateY?: number | string
    translateZ?: number | string
    rotateX?: number | string
    rotateY?: number | string
    rotateZ?: number | string
    scaleX?: number
    scaleY?: number
    scaleZ?: number
    skewX?: number | string
    skewY?: number | string
}

/**
 * Enable GPU acceleration for an element
 * @param element - Element to optimize
 */
export function enableGPUAcceleration(element: HTMLElement): void {
    // Add will-change property for GPU optimization
    element.style.willChange = 'transform, opacity';
    
    // Add transform3d hint to trigger GPU acceleration
    if (!element.style.transform || !element.style.transform.includes('translate3d')) {
        const currentTransform = element.style.transform || '';
        element.style.transform = currentTransform ? 
            `${currentTransform} translate3d(0, 0, 0)` : 'translate3d(0, 0, 0)';
    }
}

/**
 * Clean up applied styles and optimizations
 * @param element - Element to clean up
 */
export function cleanupStyles(element: HTMLElement): void {
    // Remove will-change optimization
    element.style.willChange = '';
    
    // Reset transform to empty (but preserve any existing transforms from other sources)
    element.style.transform = '';
    
    // Remove any FAME-specific inline styles
    const stylesToClean = ['opacity', 'translateX', 'translateY', 'scale', 'rotate'];
    stylesToClean.forEach(prop => {
        element.style.removeProperty(prop);
    });
}

/*
IMPLEMENTATION NOTES:
- Focus on performance - batch DOM updates
- Use GPU acceleration where appropriate
- Handle different property types correctly
- Reference working transform logic from src-refactored
- Integrate with clean utility functions for interpolation
*/
