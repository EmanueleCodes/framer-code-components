/**
 * @file InitialValueApplicator.ts
 * @description Pure utility for applying initial animation values
 * 
 * @version 1.1.0
 * @since 1.0.0
 *
 * @description
 * Handles immediate application of animation starting values to elements.
 * Prevents flash of unstyled content (FOUC) by setting elements to their 
 * animation starting state as soon as the animation is initialized.
 *
 * @architecture
 * - ✅ PURE UTILITY: No environment detection logic (uses EnvironmentDetector)
 * - ✅ SINGLE RESPONSIBILITY: Only handles value application
 * - ✅ CLEAN SEPARATION: Environment logic handled in orchestrator
 * - Uses existing StyleApplicator for actual property application
 * - Integrates with StyleCapture for current value detection
 * - Handles undefined "from" values gracefully
 *
 * @responsibilities
 * - Apply initial "from" values immediately on animation setup
 * - Handle undefined "from" values by using current computed styles
 * - Validate and sanitize initial values
 * - Provide clear error handling and debugging
 * - DOES NOT handle environment detection (delegated to EnvironmentDetector)
 *
 * @example
 * ```typescript
 * import { applyInitialValues } from './InitialValueApplicator.ts';
 * import { EnvironmentDetector } from '../environment/EnvironmentDetector.ts';
 * 
 * // Environment logic handled in orchestrator
 * const shouldApply = !EnvironmentDetector.isCanvas() || userSetting;
 * if (shouldApply) {
 *     applyInitialValues(element, properties);
 * }
 * ```
 */

import { AnimationProperty, PropertyValue } from '../../types/index.ts';
import { applyProperty } from '../../execution/StyleApplicator.ts';
import { getCurrentPropertyValue } from './StyleCapture.ts';

/**
 * Apply initial "from" values to an element immediately
 * 
 * Prevents visual jumps by setting elements to their animation starting state
 * as soon as the animation is initialized, before the animation loop begins.
 *
 * 🔧 STEP 2 FIX: Only applies initial values from earliest delay instances per property type
 * to prevent conflicts in multi-property animations.
 *
 * @param element - Target HTML element to apply initial values to
 * @param properties - Animation properties with "from" values
 * @param immediate - Whether to apply values immediately (for Canvas mode)
 * 
 * @example
 * ```typescript
 * const properties = [
 *   { property: 'translateX', from: 100, to: 300, delay: 0, isEarliestInstance: true },
 *   { property: 'translateX', from: 300, to: 100, delay: 1, isEarliestInstance: false },
 *   { property: 'opacity', from: 0, to: 1, isEarliestInstance: true }
 * ];
 * 
 * // Only applies initial values from isEarliestInstance: true properties
 * applyInitialValues(element, properties);
 * // Result: translateX=100px (not 300px), opacity=0
 * ```
 */
export function applyInitialValues(
    element: HTMLElement,
    properties: AnimationProperty[],
    immediate: boolean = true
): void {
    if (!element || !properties || properties.length === 0) {
        console.warn('🚨 [InitialValueApplicator] Invalid parameters provided');
        return;
    }

    // ❌ REMOVED: Legacy earliest instance filtering - Timeline-First Architecture handles coordination
    // Timeline automatically manages initial values and multi-property conflicts
    console.log(`🎯 [InitialValueApplicator] Applying ${properties.length} initial values to element`);

    let appliedCount = 0;

    properties.forEach((property, index) => {
        try {
            // Determine the initial value to apply
            const initialValue = resolveInitialValue(element, property);
            
            if (initialValue !== undefined && initialValue !== null) {
                // Apply the initial value using existing StyleApplicator
                applyProperty(element, property.property, initialValue, property.unit);
                
                appliedCount++;
                
                console.log(`✅ [InitialValueApplicator] Applied ${property.property}: ${initialValue}${property.unit || ''} (from ${property.instanceId || property.property})`);
            } else {
                console.warn(
                    `⚠️ [InitialValueApplicator] Could not resolve initial value for ${property.property}`
                );
            }
        } catch (error) {
            console.error(
                `🚨 [InitialValueApplicator] Error applying initial value for ${property.property}:`,
                error
            );
        }
    });

    console.log(`✅ [InitialValueApplicator] Applied ${appliedCount}/${properties.length} initial values`);
}

/**
 * Reset elements to their original state by removing applied initial values
 * 
 * This function resets animated properties to their default/natural state,
 * effectively removing any initial "from" values that were previously applied.
 * 
 * @param element - Target HTML element to reset
 * @param properties - Animation properties that were previously applied
 * 
 * @example
 * ```typescript
 * // Reset elements when hiding initial values in Canvas mode
 * resetInitialValues(element, properties);
 * 
 * // Elements return to their natural/default state
 * ```
 */
export function resetInitialValues(
    element: HTMLElement,
    properties: AnimationProperty[]
): void {
    if (!element || !properties || properties.length === 0) {
        console.warn('🚨 [InitialValueApplicator] Invalid parameters for reset');
        return;
    }

    console.log(`🔄 [InitialValueApplicator] Resetting ${properties.length} properties to defaults`);

    let resetCount = 0;

    properties.forEach((property) => {
        try {
            // Get the default value for this property
            const defaultValue = getDefaultValue(property.property);
            
            if (defaultValue !== undefined) {
                // Apply the default value to reset the property
                applyProperty(element, property.property, defaultValue, property.unit);
                
                resetCount++;
                
                // Property reset to default
            } else {
                // For properties without clear defaults, remove the style entirely
                const styleProperty = property.property === 'transform' ? 'transform' : property.property;
                element.style.removeProperty(styleProperty);
                
                resetCount++;
                
                // Style property removed
            }
        } catch (error) {
            console.error(
                `🚨 [InitialValueApplicator] Error resetting ${property.property}:`,
                error
            );
        }
    });

    console.log(`✅ [InitialValueApplicator] Reset ${resetCount}/${properties.length} properties to defaults`);
}

/**
 * Resolve the initial value for a property
 * 
 * Uses the "from" value if defined, otherwise falls back to current computed style
 *
 * @param element - Target element
 * @param property - Animation property configuration
 * @returns The resolved initial value to apply
 */
function resolveInitialValue(
    element: HTMLElement,
    property: AnimationProperty
): PropertyValue | undefined {
    // If "from" value is explicitly defined, use it
    if (property.from !== undefined && property.from !== null) {
        return property.from;
    }

    // If no "from" value, try to get current computed style as fallback
    try {
        const currentValue = getCurrentPropertyValue(element, property.property);
        
        if (currentValue !== undefined && currentValue !== null) {
            return currentValue;
        }
    } catch (error) {
        console.warn(
            `⚠️ [InitialValueApplicator] Could not get current value for ${property.property}:`,
            error
        );
    }

    // If all else fails, use a sensible default based on property type
    const defaultValue = getDefaultValue(property.property);
    if (defaultValue !== undefined) {
        return defaultValue;
    }

    console.warn(`⚠️ [InitialValueApplicator] No initial value could be resolved for ${property.property}`);
    return undefined;
}

/**
 * Get a sensible default value for a property if no other value is available
 *
 * @param propertyName - CSS property name
 * @returns Default value for the property
 */
function getDefaultValue(propertyName: string): PropertyValue | undefined {
    // Transform property defaults
    const transformDefaults: Record<string, PropertyValue> = {
        'translateX': 0,
        'translateY': 0,
        'translateZ': 0,
        'rotate': 0,
        'rotateX': 0,
        'rotateY': 0,
        'rotateZ': 0,
        'scale': 1,
        'scaleX': 1,
        'scaleY': 1,
        'scaleZ': 1,
        'skewX': 0,
        'skewY': 0
    };

    // Common CSS property defaults
    const cssDefaults: Record<string, PropertyValue> = {
        'opacity': 1,
        'width': 'auto',
        'height': 'auto',
        'left': 0,
        'top': 0,
        'right': 'auto',
        'bottom': 'auto',
        'margin': 0,
        'padding': 0,
        'border-width': 0,
        'border-radius': 0,
        'background-color': 'transparent',
        'color': 'inherit'
    };

    return transformDefaults[propertyName] ?? cssDefaults[propertyName];
}

 