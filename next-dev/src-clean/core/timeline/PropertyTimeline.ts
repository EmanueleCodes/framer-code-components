/**
 * @file PropertyTimeline.ts
 * @description GSAP-inspired Property Timeline System for FAME Animation Engine
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Core component of the Timeline-First Architecture restructure.
 * Replaces complex multi-property instance coordination with elegant timeline-based approach.
 * 
 * Inspired by GSAP Timeline architecture:
 * - Each property type gets its own timeline with keyframes
 * - Property-specific interpolators handle complexity per property type
 * - Master timeline coordinates all property timelines
 * - Natural forward/backward/reset operations on timeline level
 * 
 * @example
 * ```typescript
 * // Transform multiple instances:
 * // translateX: { delay: 0s, duration: 2s, from: 0px, to: 300px }
 * // translateX_1: { delay: 2s, duration: 2s, from: 300px, to: 0px }
 * 
 * // Into single property timeline:
 * const timeline = {
 *   property: "translateX",
 *   keyframes: [
 *     { time: 0s, value: 0px },
 *     { time: 2s, value: 300px },
 *     { time: 4s, value: 0px }
 *   ],
 *   interpolator: numberWithUnitInterpolator,
 *   totalDuration: 4s
 * }
 * ```
 * 
 * @benefits
 * - Eliminates complex coordination with isEarliestInstance, synchronization, order preservation
 * - Natural behaviors: forward/backward/reset operate on master timeline
 * - Professional standard: matches CSS @keyframes, GSAP, After Effects patterns
 * - Manageable complexity: each property timeline handles its own interpolation logic
 * - Elegant composition: property timelines + master timeline coordination
 */

import { PropertyValue } from '../../types/index.ts';
import { applyEasing, SpringConfig } from '../../utils/easings/EasingFunctions.ts';
import { interpolateToPixels } from '../../utils/units/SimpleUnitConverter.ts';

// Import advanced interpolators for complex properties
import { 
    interpolateGradient, 
    interpolateClipPath, 
    applyTextBackgroundImage,
    findTextElement,
    interpolateBackgroundPosition,
    interpolateBackgroundSize,
    interpolateComplexCSSValue,
    isValidBackgroundPosition,
    isValidBackgroundSize
} from '../../utils/properties/AdvancedInterpolators.ts';

//=======================================
//        PROPERTY KEYFRAME SYSTEM
//=======================================

/**
 * A single keyframe in a property timeline
 * Represents a property value at a specific time point
 */
export interface PropertyKeyframe {
    /** Time position in seconds */
    time: number;
    
    /** Property value at this time */
    value: PropertyValue;
    
    /** Easing function to this keyframe (optional) */
    easing?: string;
    
    /** Optional metadata for debugging */
    metadata?: {
        sourceInstanceId?: string; // Which original instance created this keyframe
        // ❌ REMOVED: originalIndex - Timeline preserves order naturally through keyframe timing
    };
}

/**
 * A timeline for a single property type containing keyframes
 * Handles all instances of the same property as a unified timeline
 */
export interface PropertyTimeline {
    /** Property name (e.g., "translateX", "opacity") */
    property: string;
    
    /** Keyframes sorted by time */
    keyframes: PropertyKeyframe[];
    
    /** Total duration of this property timeline */
    totalDuration: number;
    
    /** Property-specific interpolator for value calculations */
    interpolator: PropertyInterpolator;
    
    /** Property unit (px, %, deg, etc.) */
    unit?: string;
    
    /** Spring configuration for spring-based easings */
    springConfig?: SpringConfig;
    
    /** Element-specific distributed "from" values (for distributed properties) */
    distributedFromValues?: any[];
    
    /** Element-specific distributed "to" values (for distributed properties) */
    distributedToValues?: any[];
    
    /** Timeline metadata */
    metadata?: {
        instanceCount: number;     // How many original instances created this timeline
        earliestTime: number;      // Time of first keyframe
        latestTime: number;        // Time of last keyframe
    };
}

//=======================================
//        PROPERTY INTERPOLATOR SYSTEM
//=======================================

/**
 * Property-specific interpolation interface
 * Each property type has its own interpolator that handles the complexity
 */
export interface PropertyInterpolator {
    /** Property type classification */
    propertyType: 'number' | 'numberWithUnit' | 'color' | 'transform' | 'string';
    
    /** 
     * Calculate property value at specific time
     * @param keyframes - Timeline keyframes (must be sorted by time)
     * @param time - Time position to get value for
     * @param springConfig - Spring configuration for spring-based easings
     * @returns Interpolated value at the given time
     */
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue;
    
    /** 
     * Optional: Validate keyframe values for this property type
     * @param keyframes - Keyframes to validate
     * @returns Validation result
     */
    validateKeyframes?(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] };
}

//=======================================
//        BUILT-IN INTERPOLATORS
//=======================================

/**
 * Interpolator for number properties (opacity, scale, etc.)
 * Simple linear interpolation between numeric values
 */
export const numberInterpolator: PropertyInterpolator = {
    propertyType: 'number',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return 0;
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Pass spring config to applyEasing for spring easings
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Interpolate between numeric values using eased progress
        const beforeValue = Number(before.value);
        const afterValue = Number(after.value);
        
        return beforeValue + (afterValue - beforeValue) * easedProgress;
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            if (typeof keyframe.value !== 'number' && isNaN(Number(keyframe.value))) {
                errors.push(`Invalid numeric value: ${keyframe.value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Interpolator for number-with-unit properties (translateX, width, etc.)
 * Handles px, rem, %, deg, and other CSS units
 */
export const numberWithUnitInterpolator: PropertyInterpolator = {
    propertyType: 'numberWithUnit',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "0px";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Parse values and units
        const beforeParsed = parseNumberWithUnit(String(before.value));
        const afterParsed = parseNumberWithUnit(String(after.value));
        
        // 🚀 FIXED: Enhanced cross-unit handling - includes calc() expressions
        const isFromCalc = String(before.value).includes('calc(');
        const isToCalc = String(after.value).includes('calc(');
        const isCrossUnit = beforeParsed.unit !== afterParsed.unit;
        
        // Route to cross-unit system if: different units OR calc() expressions present
        if (isCrossUnit || isFromCalc || isToCalc) {
            // For cross-unit scenarios or calc() expressions, return a special interpolation marker
            // that will be resolved at application time when we have real element context
            const timeProgress = (time - before.time) / (after.time - before.time);
            const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
            
            // Return a special format that StyleApplicator can detect and handle
            return `__CROSS_UNIT_INTERPOLATION__:${before.value}:${after.value}:${easedProgress}`;
        }
        
        // Pass spring config to applyEasing for spring easings
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Interpolate with unit preservation using eased progress
        const interpolatedValue = beforeParsed.value + (afterParsed.value - beforeParsed.value) * easedProgress;
        
        return `${interpolatedValue}${beforeParsed.unit}`;
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        for (const keyframe of keyframes) {
            const valueStr = String(keyframe.value);
            
            // Handle calc() expressions and complex values
            if (valueStr.includes('calc(') || valueStr.includes('var(')) {
                // Complex expressions are valid - cross-unit system will handle them
                continue;
            }
            
            const parsed = parseNumberWithUnit(valueStr);
            if (isNaN(parsed.value)) {
                errors.push(`Invalid number with unit: ${keyframe.value} at time ${keyframe.time}`);
                continue;
            }
        }
        
        // 🚀 NEW: Enhanced validation for cross-unit scenarios
        // Check for cross-unit scenarios (no longer an error, just log info)
        const units = keyframes.map(kf => parseNumberWithUnit(String(kf.value)).unit).filter(u => u);
        const uniqueUnits = Array.from(new Set(units));
        
        if (uniqueUnits.length > 1) {
            console.log(`🚀 [PropertyTimeline] Cross-unit animation detected: ${uniqueUnits.join(' → ')} - using advanced interpolation`);
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Interpolator for opacity (specialized number interpolator with 0-1 clamping)
 * Ensures opacity values stay within valid range
 */
export const opacityInterpolator: PropertyInterpolator = {
    propertyType: 'number',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        // Use number interpolator as base
        const rawValue = numberInterpolator.valueAtTime(keyframes, time, springConfig);
        
        // Clamp to valid opacity range
        const numericValue = Number(rawValue);
        return Math.max(0, Math.min(1, numericValue));
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = Number(keyframe.value);
            if (isNaN(value)) {
                errors.push(`Invalid opacity value: ${keyframe.value} at time ${keyframe.time}`);
            } else if (value < 0 || value > 1) {
                errors.push(`Opacity out of range [0,1]: ${keyframe.value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Basic color interpolator with RGB interpolation support
 * Handles hex colors, rgb() colors, and fallback to nearest-neighbor for other formats
 */
export const colorInterpolator: PropertyInterpolator = {
    propertyType: 'color',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "#000000";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Try to interpolate colors
        const fromColor = String(before.value);
        const toColor = String(after.value);
        
        // Parse colors to RGB
        const fromRGB = parseColor(fromColor);
        const toRGB = parseColor(toColor);
        
        // If both colors can be parsed, interpolate them
        if (fromRGB && toRGB) {
            const interpolatedR = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * easedProgress);
            const interpolatedG = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * easedProgress);
            const interpolatedB = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * easedProgress);
            
            // Handle alpha if present
            if (fromRGB.a !== undefined && toRGB.a !== undefined) {
                const interpolatedA = fromRGB.a + (toRGB.a - fromRGB.a) * easedProgress;
                return `rgba(${interpolatedR}, ${interpolatedG}, ${interpolatedB}, ${interpolatedA})`;
            }
            
            return `rgb(${interpolatedR}, ${interpolatedG}, ${interpolatedB})`;
        }
        
        // Fallback to nearest-neighbor for unsupported color formats
        return easedProgress < 0.5 ? before.value : after.value;
    }
};

/**
 * Parse a color string to RGB values
 * Supports hex (#ffffff, #fff), rgb(), and rgba() formats
 */
function parseColor(color: string): { r: number; g: number; b: number; a?: number } | null {
    const trimmed = color.trim();
    
    // Handle hex colors
    if (trimmed.startsWith('#')) {
        const hex = trimmed.substring(1);
        let r: number, g: number, b: number;
        
        if (hex.length === 3) {
            // Short hex format (#abc)
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            // Long hex format (#aabbcc)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            return null; // Invalid hex format
        }
        
        return { r, g, b };
    }
    
    // Handle rgb() and rgba() colors
    const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : undefined;
        
        return { r, g, b, a };
    }
    
    // Unsupported color format
    return null;
}

/**
 * Default fallback interpolator
 * Uses simple nearest-neighbor for unknown property types
 */
export const defaultInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        
        // Simple nearest-neighbor for non-numeric values
        const progress = (time - before.time) / (after.time - before.time);
        return progress < 0.5 ? before.value : after.value;
    }
};

/**
 * Gradient interpolator for background gradients and text background images
 * Handles linear, radial, and conic gradients with color stop interpolation
 */
export const gradientInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "linear-gradient(0deg, #000 0%, #fff 100%)";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use gradient interpolation
        return interpolateGradient(String(before.value), String(after.value), easedProgress);
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = String(keyframe.value);
            if (!value.includes('gradient(')) {
                errors.push(`Invalid gradient value: ${value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Clip path interpolator for masking and clipping animations
 * Handles inset, polygon, circle, and ellipse clip paths
 */
export const clipPathInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "inset(0% 0% 0% 0%)";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use clip path interpolation
        return interpolateClipPath(String(before.value), String(after.value), easedProgress);
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = String(keyframe.value);
            const validClipPaths = ['inset(', 'polygon(', 'circle(', 'ellipse('];
            const isValid = validClipPaths.some(type => value.includes(type));
            
            if (!isValid) {
                errors.push(`Invalid clip path value: ${value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Text background image interpolator with special text handling
 * Same as gradient interpolator but with text-specific application logic
 */
export const textBackgroundImageInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "linear-gradient(0deg, #000 0%, #fff 100%)";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use gradient interpolation (same as gradient interpolator)
        return interpolateGradient(String(before.value), String(after.value), easedProgress);
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = String(keyframe.value);
            // Accept gradients, urls, or other background-image values
            if (!value.includes('gradient(') && !value.includes('url(') && !value.startsWith('#')) {
                errors.push(`Invalid text background image value: ${value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Background position interpolator for smooth position animations
 * Handles values like "0% 0%" to "50% 50%" or "top left" to "center center"
 */
export const backgroundPositionInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "0% 0%";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use background position interpolation
        return interpolateBackgroundPosition(String(before.value), String(after.value), easedProgress);
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = String(keyframe.value);
            if (!isValidBackgroundPosition(value)) {
                errors.push(`Invalid background position value: ${value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Background size interpolator for smooth size animations
 * Handles numeric values like "100% 100%" to "200% 200%" and falls back to step for keywords
 */
export const backgroundSizeInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "auto";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use background size interpolation
        return interpolateBackgroundSize(String(before.value), String(after.value), easedProgress);
    },
    
    validateKeyframes(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const keyframe of keyframes) {
            const value = String(keyframe.value);
            if (!isValidBackgroundSize(value)) {
                errors.push(`Invalid background size value: ${value} at time ${keyframe.time}`);
            }
        }
        
        return { valid: errors.length === 0, errors };
    }
};

/**
 * Enhanced string interpolator for CSS properties with multiple space-separated values
 * Handles box shadows, text shadows, transforms, filters, etc.
 */
export const enhancedStringInterpolator: PropertyInterpolator = {
    propertyType: 'string',
    
    valueAtTime(keyframes: PropertyKeyframe[], time: number, springConfig?: SpringConfig): PropertyValue {
        if (keyframes.length === 0) return "none";
        if (keyframes.length === 1) return keyframes[0].value;
        
        // Find keyframes to interpolate between
        const { before, after } = findSurroundingKeyframes(keyframes, time);
        
        if (!before) return after!.value; // Before start
        if (!after) return before.value;  // After end
        if (before === after) return before.value; // Exact match
        
        // Calculate progress with easing
        const timeProgress = (time - before.time) / (after.time - before.time);
        const easedProgress = applyEasing(timeProgress, after.easing || 'linear', springConfig);
        
        // Use enhanced string interpolation that can handle some complex CSS values
        return interpolateComplexCSSValue(String(before.value), String(after.value), easedProgress);
    }
};

//=======================================
//        INTERPOLATOR REGISTRY
//=======================================

/**
 * Get appropriate interpolator for a property type
 * @param propertyName - CSS property name
 * @returns Appropriate interpolator for the property
 */
export function getInterpolatorForProperty(propertyName: string): PropertyInterpolator {
    // Properties with units (layout, spacing, transforms, typography)
    if (propertyName.includes('translate') || 
        propertyName.includes('width') || 
        propertyName.includes('height') ||
        propertyName.includes('margin') ||
        propertyName.includes('padding') ||
        propertyName.includes('Gap') || // gap, columnGap, rowGap
        propertyName === 'gap' ||
        propertyName === 'columnGap' ||
        propertyName === 'rowGap' ||
        propertyName.includes('border') && (propertyName.includes('width') || propertyName.includes('radius')) ||
        propertyName === 'borderRadius' ||
        propertyName === 'borderWidth' ||
        propertyName.includes('rotate') ||
        propertyName.includes('skew') ||
        propertyName === 'fontSize' ||
        propertyName === 'lineHeight' ||
        propertyName === 'letterSpacing' ||
        propertyName === 'perspective' ||
        propertyName === 'top' ||
        propertyName === 'left' ||
        propertyName === 'right' ||
        propertyName === 'bottom') {
        return numberWithUnitInterpolator;
    }
    
    // Opacity (special case of number with clamping)
    if (propertyName === 'opacity') {
        return opacityInterpolator;
    }
    
    // Numeric properties without units (scale, zIndex)
    if (propertyName.includes('scale') || 
        propertyName === 'zIndex' ||
        propertyName === 'order' ||
        propertyName === 'fontWeight') {
        return numberInterpolator;
    }
    
    // Color properties
    if (propertyName.includes('color') || 
        propertyName.includes('Color') ||
        propertyName === 'backgroundColor' ||
        propertyName === 'borderColor' ||
        propertyName === 'color') {
        return colorInterpolator;
    }
    
    // Gradient properties
    if (propertyName === 'gradientBackground' ||
        (propertyName === 'backgroundImage' && propertyName.includes('gradient'))) {
        return gradientInterpolator;
    }
    
    // Clip path properties
    if (propertyName === 'clipPath') {
        return clipPathInterpolator;
    }
    
    // Text background image properties
    if (propertyName === 'textBackgroundImage') {
        return textBackgroundImageInterpolator;
    }
    
    // ✅ FIXED: Background properties now have proper interpolation
    if (propertyName === 'backgroundPosition') {
        return backgroundPositionInterpolator;
    }
    
    if (propertyName === 'backgroundSize') {
        return backgroundSizeInterpolator;
    }
    
    // ✅ ENHANCED: Complex CSS properties with enhanced interpolation
    if (propertyName === 'boxShadow' ||
        propertyName === 'textShadow' ||
        propertyName === 'filter' ||
        propertyName === 'backdropFilter') {
        return enhancedStringInterpolator;
    }
    
    // Enum properties (discrete values, use nearest-neighbor interpolation)
    if (propertyName === 'pointerEvents' ||
        propertyName === 'transformStyle' ||
        propertyName === 'backfaceVisibility' ||
        propertyName === 'display' ||
        propertyName === 'flexDirection' ||
        propertyName === 'justifyContent' ||
        propertyName === 'alignItems' ||
        propertyName === 'textAlign' ||
        propertyName === 'position') {
        return defaultInterpolator;
    }
    
    // Remaining string-based properties that need step interpolation
    if (propertyName === 'perspectiveOrigin' ||
        propertyName === 'backgroundImage') {
        return defaultInterpolator;
    }
    
    // Default fallback
    return defaultInterpolator;
}

//=======================================
//        UTILITY FUNCTIONS
//=======================================

/**
 * Find keyframes that surround a given time
 * @param keyframes - Sorted keyframes array
 * @param time - Time to find surrounding keyframes for
 * @returns Object with before and after keyframes
 */
function findSurroundingKeyframes(
    keyframes: PropertyKeyframe[], 
    time: number
): { before: PropertyKeyframe | null; after: PropertyKeyframe | null } {
    if (keyframes.length === 0) {
        return { before: null, after: null };
    }
    
    if (keyframes.length === 1) {
        return { before: keyframes[0], after: keyframes[0] };
    }
    
    // Before first keyframe
    if (time <= keyframes[0].time) {
        return { before: null, after: keyframes[0] };
    }
    
    // After last keyframe
    if (time >= keyframes[keyframes.length - 1].time) {
        return { before: keyframes[keyframes.length - 1], after: null };
    }
    
    // Find surrounding keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
        const current = keyframes[i];
        const next = keyframes[i + 1];
        
        if (time >= current.time && time <= next.time) {
            return { before: current, after: next };
        }
    }
    
    // Fallback (should not reach here with sorted keyframes)
    return { before: keyframes[0], after: keyframes[keyframes.length - 1] };
}

/**
 * Parse a number with unit string
 * @param value - String like "100px", "50%", "1.5rem"
 * @returns Object with numeric value and unit
 */
function parseNumberWithUnit(value: string): { value: number; unit: string } {
    const match = value.toString().match(/^(-?\d*\.?\d+)(.*)$/);
    
    if (!match) {
        return { value: 0, unit: "" };
    }
    
    return {
        value: parseFloat(match[1]),
        unit: match[2] || ""
    };
}

/**
 * Validate that keyframes are properly sorted by time
 * @param keyframes - Keyframes to validate
 * @returns Validation result
 */
export function validateKeyframeTiming(keyframes: PropertyKeyframe[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (let i = 1; i < keyframes.length; i++) {
        if (keyframes[i].time < keyframes[i - 1].time) {
            errors.push(`Keyframes not sorted by time: keyframe at ${keyframes[i].time}s comes after ${keyframes[i - 1].time}s`);
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Sort keyframes by time (in place)
 * @param keyframes - Keyframes to sort
 */
export function sortKeyframesByTime(keyframes: PropertyKeyframe[]): void {
    keyframes.sort((a, b) => a.time - b.time);
}

/**
 * Remove duplicate keyframes at the same time (keeps last value)
 * @param keyframes - Keyframes to deduplicate
 * @returns Deduplicated keyframes
 */
export function deduplicateKeyframes(keyframes: PropertyKeyframe[]): PropertyKeyframe[] {
    if (keyframes.length <= 1) return keyframes;
    
    const result: PropertyKeyframe[] = [];
    let lastTime = -Infinity;
    
    for (const keyframe of keyframes) {
        if (keyframe.time !== lastTime) {
            result.push(keyframe);
            lastTime = keyframe.time;
        } else {
            // Same time - replace previous keyframe with this one (last value wins)
            result[result.length - 1] = keyframe;
        }
    }
    
    return result;
} 