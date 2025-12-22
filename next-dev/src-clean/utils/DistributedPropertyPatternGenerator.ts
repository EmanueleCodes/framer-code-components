/**
 * @file DistributedPropertyPatternGenerator.ts
 * @description Pattern generation utilities for distributed property values
 * 
 * @version 1.0.0
 * @since 3.0.0
 * 
 * @overview
 * Handles conversion of user-defined patterns (comma-separated, linear ranges, etc.)
 * into element-specific property values. Designed with single responsibility principle:
 * ONLY generates value arrays - does NOT handle UI, validation, or execution.
 * 
 * @architecture_role
 * - Input: Pattern configuration + element array
 * - Output: Array of property values (one per element)
 * - Dependencies: None (pure utility functions)
 * - Used by: AnimationSlotAdapter.expandDistributedProperties()
 * 
 * @examples
 * ```typescript
 * // Comma-separated pattern
 * const generator = new DistributedPropertyPatternGenerator();
 * const values = generator.generateElementValues(
 *   elements, 
 *   { enabled: true, pattern: { type: 'comma-separated', values: '10px,20px,30px' } },
 *   '0px'
 * );
 * // Result: ['10px', '20px', '30px', '10px', ...] (cycles through elements)
 * 
 * // Linear range pattern
 * const values = generator.generateElementValues(
 *   elements,
 *   { enabled: true, pattern: { type: 'linear-range', linearRange: { 
 *     minValue: '0px', maxValue: '100px', progression: 'ascending' 
 *   }}},
 *   '0px'
 * );
 * // Result: ['0px', '25px', '50px', '75px', '100px'] (for 5 elements)
 * ```
 * 
 * @god_class_prevention
 * This class deliberately has ONLY pattern generation responsibility.
 * It does NOT handle:
 * - UI controls (handled by property controls)
 * - Data validation (handled by AnimationSlotAdapter)
 * - Timeline creation (handled by PropertyTimeline)
 * - Element finding (handled by ElementFinder)
 * 
 * @testing_strategy
 * - Unit tests for each pattern type
 * - Edge cases: empty arrays, single elements, invalid patterns
 * - Performance tests for large element arrays
 * 
 * @future_extensions
 * - Random patterns with seeded randomness
 * - Grid-aware patterns using existing stagger grid detection
 * - Custom curve patterns with easing functions
 */

import type {
    DistributedPropertyConfig,
    DistributedPropertyPattern,
    CommaSeparatedPattern,
    LinearRangePattern,
    LinearProgression,
    PropertyValue
} from "../types/index.ts";

/**
 * Distributed property pattern generator
 * 
 * @description
 * Converts user-defined patterns into element-specific property values.
 * Supports both numeric values (with units) and color gradients.
 * Follows single responsibility principle - ONLY handles pattern generation.
 * 
 * @responsibility
 * Generate arrays of property values from pattern configurations.
 * 
 * @does_not_handle
 * - UI rendering (property controls handle this)
 * - Data validation (AnimationSlotAdapter handles this)
 * - Element finding (ElementFinder handles this)
 * - Timeline creation (PropertyTimeline handles this)
 * 
 * @design_principles
 * - Pure functions where possible (no side effects)
 * - Immutable inputs (never modify element array or config)
 * - Predictable outputs (same inputs = same outputs)
 * - Clear error handling with descriptive messages
 * 
 * @performance_considerations
 * - O(n) complexity for pattern generation (n = number of elements)
 * - Minimal memory allocation (reuse parsed values)
 * - No DOM access (works with element count only)
 * 
 * @color_gradient_support
 * NEW: Supports smooth color gradients for distributed properties
 * - Automatic color detection (hex, rgb, rgba, named colors)
 * - Smooth RGB interpolation between colors
 * - Works with all progression curves (linear, bell-curve, etc.)
 * 
 * @examples
 * ```typescript
 * const generator = new DistributedPropertyPatternGenerator();
 * 
 * // Numeric values with units
 * const sizes = generator.generateElementValues(elements, {
 *   enabled: true,
 *   pattern: { type: 'linear-range', minValue: '10px', maxValue: '100px', progression: 'linear' }
 * }, '50px');
 * // Result: ['10px', '30px', '50px', '70px', '90px', '100px']
 * 
 * // Color gradients
 * const colors = generator.generateElementValues(elements, {
 *   enabled: true,
 *   pattern: { type: 'linear-range', minValue: 'white', maxValue: 'black', progression: 'linear' }
 * }, 'red');
 * // Result: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333', '#000000']
 * 
 * // Color gradients with hex values
 * const hexColors = generator.generateElementValues(elements, {
 *   enabled: true,
 *   pattern: { type: 'linear-range', minValue: '#ff0000', maxValue: '#0000ff', progression: 'linear' }
 * }, '#800000');
 * // Result: ['#ff0000', '#cc0033', '#990066', '#660099', '#3300cc', '#0000ff']
 * ```
 */
export class DistributedPropertyPatternGenerator {

    /**
     * Generate element-specific values from pattern configuration
     * 
     * @description
     * Main entry point for pattern generation. Delegates to specific pattern
     * handlers based on configuration type. Always returns an array with
     * exactly one value per element.
     * 
     * @param elements - Array of HTML elements (used for count only)
     * @param config - Distributed property configuration with pattern details
     * @param baseValue - Fallback value when distribution is disabled
     * 
     * @returns Array of property values, one per element
     * 
     * @throws {Error} When pattern type is unsupported
     * @throws {Error} When required pattern data is missing
     * 
     * @complexity O(n) where n = elements.length
     * 
     * @examples
     * ```typescript
     * // Disabled distribution - returns base value for all elements
     * generateElementValues(elements, { enabled: false }, '50px')
     * // → ['50px', '50px', '50px', ...]
     * 
     * // Comma-separated pattern
     * generateElementValues(elements, {
     *   enabled: true,
     *   pattern: { type: 'comma-separated', values: '10px,20px' }
     * }, '0px')
     * // → ['10px', '20px', '10px', '20px', ...] (cycles through pattern)
     * 
     * // Linear range pattern
     * generateElementValues(elements, {
     *   enabled: true,
     *   pattern: { 
     *     type: 'linear-range', 
     *     linearRange: { minValue: '0px', maxValue: '100px', progression: 'ascending' }
     *   }
     * }, '0px')
     * // → ['0px', '33px', '66px', '100px'] (for 4 elements)
     * ```
     * 
     * @god_class_prevention
     * This method ONLY generates values. It does NOT:
     * - Validate element selection (ElementFinder's job)
     * - Parse property control UI data (AnimationSlotAdapter's job)
     * - Create timeline keyframes (PropertyTimeline's job)
     * - Apply styles to DOM (StyleApplicator's job)
     * 
     * @testing_coverage
     * - All pattern types with various element counts
     * - Edge cases: 0 elements, 1 element, 1000+ elements
     * - Invalid configurations (missing data, wrong types)
     * - Performance with large element arrays
     */
    generateElementValues(
        elements: HTMLElement[],
        config: any, // Accepts both legacy and new flat config
        baseValue: PropertyValue
    ): PropertyValue[] {
        // Early return for disabled distribution - use base value for all elements
        if (!config || !config.enabled) {
            return elements.map(() => baseValue);
        }

        // Validate inputs
        if (!elements || elements.length === 0) {
            console.warn('[DistributedPropertyPatternGenerator] No elements provided, returning empty array');
            return [];
        }

        // Handle the flat config structure from AnimationSlotAdapter
        console.log('[DistributedPropertyPatternGenerator] Processing config:', config);
        
        // The config now has pattern type directly in config.pattern field
        const patternType = config.pattern;
        if (!patternType) {
            console.error('[DistributedPropertyPatternGenerator] No pattern type found in config.pattern:', config);
            return elements.map(() => baseValue);
        }
        
        console.log(`[DistributedPropertyPatternGenerator] Using pattern type: ${patternType}`);

        // Delegate to specific pattern generators based on type
        try {
            switch (patternType) {
                case 'comma-separated':
                    return this.generateCommaSeparatedPattern(elements, config);
                case 'linear-range':
                    return this.generateLinearRangePattern(elements, config);
                case 'random':
                    console.warn('[DistributedPropertyPatternGenerator] Random patterns not yet implemented - falling back to base value');
                    return elements.map(() => baseValue);
                case 'grid-aware':
                    console.warn('[DistributedPropertyPatternGenerator] Grid-aware patterns not yet implemented - falling back to base value');
                    return elements.map(() => baseValue);
                default:
                    console.error(`[DistributedPropertyPatternGenerator] Unknown pattern type: ${patternType}`);
                    return elements.map(() => baseValue);
            }
        } catch (error) {
            console.error('[DistributedPropertyPatternGenerator] Pattern generation failed:', error);
            // Graceful fallback - use base value for all elements
            return elements.map(() => baseValue);
        }
    }

    /**
     * Generate values using comma-separated pattern
     * 
     * @description
     * Splits comma-separated values and cycles through them for each element.
     * Values repeat when there are more elements than pattern values.
     * 
     * @param elements - Array of elements (used for count)
     * @param config - Flat config with values field
     * 
     * @returns Array of values cycling through the pattern
     * 
     * @complexity O(n) where n = elements.length
     * 
     * @examples
     * ```typescript
     * // Pattern: "10px,20px,30px" with 5 elements
     * // Result: ['10px', '20px', '30px', '10px', '20px']
     * 
     * // Pattern: "red,blue" with 3 elements  
     * // Result: ['red', 'blue', 'red']
     * ```
     * 
     * @error_handling
     * - Empty values string returns empty pattern
     * - Whitespace is automatically trimmed from each value
     * - Empty values after splitting are filtered out
     */
    private generateCommaSeparatedPattern(
        elements: HTMLElement[], 
        config: any
    ): PropertyValue[] {
        console.log('[DistributedPropertyPatternGenerator] Comma-separated config:', config);
        
        if (!config.values || config.values.trim() === '') {
            console.warn('[DistributedPropertyPatternGenerator] Empty comma-separated values provided');
            return elements.map(() => '');
        }

        // Split and clean values
        const patternValues = config.values
            .split(',')
            .map(value => value.trim())
            .filter(value => value !== ''); // Remove empty values

        console.log('[DistributedPropertyPatternGenerator] Pattern values:', patternValues);

        if (patternValues.length === 0) {
            console.warn('[DistributedPropertyPatternGenerator] No valid values after parsing comma-separated pattern');
            return elements.map(() => '');
        }

        // Cycle through pattern values for each element
        const result = elements.map((_, index) => patternValues[index % patternValues.length]);
        console.log('[DistributedPropertyPatternGenerator] Generated comma-separated values:', result);
        return result;
    }

    /**
     * Generate values using linear range pattern
     * 
     * @description
     * Distributes values evenly between min and max with optional progression curves.
     * Supports both numeric values (with units) and color gradients.
     * 
     * @param elements - Array of elements (used for count)
     * @param config - Flat config with minValue, maxValue, progression fields
     * 
     * @returns Array of values distributed across the range
     * 
     * @complexity O(n) where n = elements.length
     * 
     * @examples
     * ```typescript
     * // Numeric range: 0px → 100px, linear, 5 elements
     * // Result: ['0px', '25px', '50px', '75px', '100px']
     * 
     * // Color gradient: white → black, linear, 5 elements
     * // Result: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333', '#000000']
     * 
     * // TRUE RANDOM: 0% → -100%, random, 5 elements  
     * // Result: ['0%', '-23%', '-67%', '-41%', '-89%'] (truly random within range)
     * ```
     * 
     * @color_support
     * Supports color gradients with smooth RGB interpolation
     * - Hex colors: #ffffff → #000000
     * - RGB colors: rgb(255,0,0) → rgb(0,0,255)
     * - Mixed formats: white → #000000 (auto-detection)
     * 
     * @random_distribution
     * NEW: True random distribution instead of curved progression
     * - Each element gets a truly random value within the min-max range
     * - Uses deterministic seeding for consistent results across renders
     * - Perfect for scattered/varied effects in animations
     * 
     * @mathematical_progressions
     * - linear: Linear 0 → 1 progression
     * - linear-reverse: Linear 1 → 0 progression  
     * - bell-curve: Smooth Gaussian bell curve (peak in center)
     * - roof: Triangular peak (sharp rise to center)
     * - reverse-roof: Triangular valley (sharp fall to center)
     * - ramp-up: Slow start, fast end (quadratic acceleration)
     * - ramp-down: Fast start, slow end (quadratic deceleration)
     * - ease-in-out: Smooth S-curve transition
     * - steps: Discrete stepped progression
     * - random: TRUE RANDOM values within range (handled separately)
     * - cubic-in-out: Pronounced S-curve with stronger acceleration/deceleration
     * - bounce: Bouncing oscillations creating wave-like patterns
     * - elastic: Elastic overshoot with damped oscillations
     * - exponential: Strong exponential curve for dramatic effects
     */
    private generateLinearRangePattern(
        elements: HTMLElement[], 
        config: any
    ): PropertyValue[] {
        console.log('[DistributedPropertyPatternGenerator] Linear range config:', config);
        
        const elementCount = elements.length;

        // Handle single element case
        if (elementCount === 1) {
            return [config.minValue || '0px'];
        }
        
        console.log('🎨 [DistributedPropertyPatternGenerator] Generating linear range pattern:', config);                                      
        // 🎨 NEW: Try to parse as colors first
        const minColor = this.parseColor(config.minValue);
        const maxColor = this.parseColor(config.maxValue);
        
        if (minColor && maxColor) {
            // 🎨 COLOR GRADIENT: Both values are colors - use color interpolation
            console.log(`📊 [DistributedPropertyPatternGenerator] Generating color gradient: ${config.minValue} → ${config.maxValue} for ${elementCount} elements`);
            
            // 🎲 SPECIAL CASE: True random color distribution
            if (config.progression === 'random') {
                console.log(`🎨 [DistributedPropertyPatternGenerator] Generating truly random color values for ${elementCount} elements`);
                
                const randomColors = elements.map((_, index) => {
                    // Generate truly random progress for each element based on its index
                    const randomProgress = this.seededRandom(index);
                    
                    // Interpolate between colors using random progress
                    const interpolatedColor = this.interpolateColors(minColor, maxColor, randomProgress);
                    
                    return interpolatedColor;
                });
                
                // Debug: Log first few random colors to verify distribution
                console.log(`🎲 [Random Color Debug] First 5 colors:`, randomColors.slice(0, 5));
                console.log(`🎲 [Random Color Debug] Random progresses:`, elements.slice(0, 5).map((_, i) => this.seededRandom(i).toFixed(3)));
                
                return randomColors;
            }
            
            return elements.map((_, index) => {
                // Calculate base progress (0 to 1)
                let progress = elementCount === 1 ? 0 : index / (elementCount - 1);
                
                // Apply progression curve
                progress = this.applyProgressionCurve(progress, config.progression || 'linear');
                
                // Interpolate between colors
                const interpolatedColor = this.interpolateColors(minColor, maxColor, progress);
                
                return interpolatedColor;
            });
        }

        // 📏 NUMERIC RANGE: Fall back to numeric interpolation
        const minNum = this.parseNumericValue(config.minValue);
        const maxNum = this.parseNumericValue(config.maxValue);
        const unit = this.extractUnit(config.minValue) || this.extractUnit(config.maxValue) || '';

        if (minNum === null || maxNum === null) {
            console.warn('[DistributedPropertyPatternGenerator] Failed to parse values as colors or numbers, using min value for all elements');
            return elements.map(() => config.minValue || '0px');
        }

        // 🎲 SPECIAL CASE: True random distribution
        if (config.progression === 'random') {
            console.log(`📊 [DistributedPropertyPatternGenerator] Generating truly random values: ${config.minValue} → ${config.maxValue} for ${elementCount} elements`);
            
            const randomValues = elements.map((_, index) => {
                // Generate truly random progress for each element based on its index
                const randomProgress = this.seededRandom(index);
                
                // Interpolate between min and max using random progress
                const value = minNum + (maxNum - minNum) * randomProgress;
                
                return `${value}${unit}`;
            });
            
            // Debug: Log first few random values to verify distribution
            console.log(`🎲 [Random Debug] First 5 values:`, randomValues.slice(0, 5));
            console.log(`🎲 [Random Debug] Random progresses:`, elements.slice(0, 5).map((_, i) => this.seededRandom(i).toFixed(3)));
            
            return randomValues;
        }

        // Generate numeric values with progression curve (non-random)
        const result = elements.map((_, index) => {
            // Calculate base progress (0 to 1)
            let progress = elementCount === 1 ? 0 : index / (elementCount - 1);
            
            // Apply progression curve
            progress = this.applyProgressionCurve(progress, config.progression || 'linear');
            
            // Interpolate between min and max
            const value = minNum + (maxNum - minNum) * progress;
            
            // Return with unit
            return `${value}${unit}`;
        });
        
        console.log('[DistributedPropertyPatternGenerator] Generated linear range values:', result);
        return result;
    }

    /**
     * Generate deterministic seeded random value with better distribution
     * 
     * @description
     * Creates consistent "random" values based on a seed value.
     * Same seed will always produce the same random value.
     * Uses improved mixing algorithm for better randomness with consecutive indices.
     * 
     * @param seed - Seed value (typically element index)
     * @returns Pseudo-random value between 0 and 1
     * 
     * @algorithm
     * Uses multiple hash-like operations to better mix the seed value,
     * producing more scattered results for consecutive indices.
     */
    private seededRandom(seed: number): number {
        // Better seed mixing for consecutive indices
        // Start with the raw index
        let hash = seed;
        
        // Apply multiple mixing operations to break patterns
        hash = ((hash ^ 61) ^ (hash >>> 16)) >>> 0;
        hash = (hash + (hash << 3)) >>> 0;
        hash = (hash ^ (hash >>> 4)) >>> 0;
        hash = (hash * 0x27d4eb2d) >>> 0;
        hash = (hash ^ (hash >>> 15)) >>> 0;
        
        // Add another round of mixing with different constants
        hash = ((hash * 1597334677) >>> 0);
        hash = (hash ^ (hash >>> 16)) >>> 0;
        hash = ((hash * 3812015801) >>> 0);
        hash = (hash ^ (hash >>> 16)) >>> 0;
        
        // Convert to 0-1 range
        return (hash >>> 0) / 4294967296; // 2^32
    }

    /**
     * Apply mathematical progression curve to linear progress
     * 
     * @description
     * Transforms linear 0→1 progress into curved progressions for visual effects.
     * Each curve creates different distribution patterns across elements.
     * 
     * @param progress - Linear progress from 0 to 1
     * @param progression - Type of mathematical curve to apply
     * 
     * @returns Transformed progress value
     * 
     * @mathematical_functions
     * - linear: f(x) = x (identity function)
     * - linear-reverse: f(x) = 1 - x (inversion)
     * - bell-curve: f(x) = exp(-((x-0.5)^2) / 0.125) (smooth Gaussian bell)
     * - roof: f(x) = 1 - |2x - 1| (triangular peak)
     * - reverse-roof: f(x) = |2x - 1| (triangular valley)
     * - ramp-up: f(x) = x^2 (quadratic acceleration)
     * - ramp-down: f(x) = 1 - (1-x)^2 (quadratic deceleration)
     * - ease-in-out: f(x) = 3x^2 - 2x^3 (smoothstep function)
     * - steps: f(x) = floor(x * 5) / 4 (discrete steps)
     * - random: Handled separately - true random distribution (not a curve)
     * - cubic-in-out: f(x) = x < 0.5 ? 4x^3 : 1-4(1-x)^3 (cubic S-curve)
     * - bounce: f(x) = 1 - |sin(x * π * 3)| * (1-x) (bouncing oscillation)
     * - elastic: f(x) = sin(x * π * 6) * exp(-x * 3) * 0.5 + 0.5 (elastic wave)
     * - exponential: f(x) = (exp(x * 4) - 1) / (exp(4) - 1) (exponential curve)
     */
    private applyProgressionCurve(progress: number, progression: LinearProgression): number {
        switch (progression) {
            case 'linear':
                return progress; // Linear progression
                
            case 'linear-reverse':
                return 1 - progress; // Reverse linear progression
                
            case 'bell-curve':
                // Smooth Gaussian bell curve - peak in center, smooth falloff at edges
                // Using a Gaussian-like function with sigma = 0.25 for nice curve shape
                const centerOffset = progress - 0.5;
                return Math.exp(-(centerOffset * centerOffset) / 0.125);
                
            case 'roof':
                // Triangular peak - sharp rise to center, sharp fall to edges (old bell-curve)
                return 1 - Math.abs(2 * progress - 1);
                
            case 'reverse-roof':
                // Triangular valley - sharp fall to center, sharp rise to edges (old reverse-bell)
                return Math.abs(2 * progress - 1);
                
            case 'ramp-up':
                // Slow start, fast end - quadratic acceleration
                return progress * progress;
                
            case 'ramp-down':
                // Fast start, slow end - inverse quadratic (deceleration)
                return 1 - (1 - progress) * (1 - progress);
                
            case 'ease-in-out':
                // Smooth S-curve transition - smoothstep function
                return 3 * progress * progress - 2 * progress * progress * progress;
                
            case 'steps':
                // Stepped/discrete progression - 5 discrete steps
                return Math.floor(progress * 5) / 4;
                
            case 'random':
                // NOTE: Random distribution is handled separately in generateLinearRangePattern
                // This fallback should not be reached in normal operation
                console.warn('[DistributedPropertyPatternGenerator] Random progression should be handled separately, falling back to seeded random');
                return this.seededRandom(progress);
                
            case 'cubic-in-out':
                // Pronounced S-curve with stronger acceleration/deceleration than ease-in-out
                // More dramatic curve that starts slow, accelerates fast, then decelerates slow
                if (progress < 0.5) {
                    return 4 * progress * progress * progress;
                } else {
                    const adjusted = 1 - progress;
                    return 1 - 4 * adjusted * adjusted * adjusted;
                }
                
            case 'bounce':
                // Bouncing oscillation that creates wave-like patterns
                // Higher frequency oscillations that diminish towards the end
                return 1 - Math.abs(Math.sin(progress * Math.PI * 3)) * (1 - progress);
                
            case 'elastic':
                // Elastic overshoot with damped oscillations
                // Creates wave-like patterns that decay over time
                return Math.sin(progress * Math.PI * 6) * Math.exp(-progress * 3) * 0.5 + 0.5;
                
            case 'exponential':
                // Strong exponential curve for dramatic acceleration effects
                // Creates very slow start with dramatic acceleration at the end
                return (Math.exp(progress * 4) - 1) / (Math.exp(4) - 1);
                
            default:
                console.warn(`[DistributedPropertyPatternGenerator] Unknown progression type: ${progression}, using linear`);
                return progress;
        }
    }

    /**
     * Parse numeric value from CSS value string
     * 
     * @description
     * Extracts the numeric component from CSS values like "100px", "50%", "1.5em".
     * Handles integers, decimals, and negative numbers.
     * 
     * @param value - CSS value string to parse
     * 
     * @returns Parsed numeric value or null if parsing fails
     * 
     * @examples
     * ```typescript
     * parseNumericValue('100px')   // → 100
     * parseNumericValue('-50%')    // → -50  
     * parseNumericValue('1.5em')   // → 1.5
     * parseNumericValue('auto')    // → null
     * ```
     */
    private parseNumericValue(value: string): number | null {
        if (typeof value !== 'string') {
            return null;
        }

        // Match numeric part (including decimals and negative numbers)
        const match = value.match(/^(-?\d*\.?\d+)/);
        if (!match) {
            return null;
        }

        const numericValue = parseFloat(match[1]);
        return isNaN(numericValue) ? null : numericValue;
    }

    /**
     * Extract unit from CSS value string
     * 
     * @description
     * Extracts the unit component from CSS values like "100px", "50%", "1.5em".
     * Returns empty string for unitless values.
     * 
     * @param value - CSS value string to parse
     * 
     * @returns Unit string or empty string if no unit
     * 
     * @examples
     * ```typescript
     * extractUnit('100px')   // → 'px'
     * extractUnit('-50%')    // → '%'  
     * extractUnit('1.5')     // → ''
     * extractUnit('auto')    // → ''
     * ```
     */
    private extractUnit(value: string): string {
        if (typeof value !== 'string') {
            return '';
        }

        // Match unit part (letters after the number)
        const match = value.match(/^-?\d*\.?\d+([a-zA-Z%]+)/);
        return match ? match[1] : '';
    }

    /**
     * Parse a color string to RGB values
     * 
     * @description
     * Parses color strings in various formats (hex, rgb, rgba) into RGB components.
     * Used for color gradient generation in distributed properties.
     * 
     * @param color - Color string to parse
     * @returns RGB color object or null if parsing fails
     * 
     * @examples
     * ```typescript
     * parseColor('#ffffff')           // → { r: 255, g: 255, b: 255 }
     * parseColor('#fff')              // → { r: 255, g: 255, b: 255 }
     * parseColor('rgb(255, 0, 0)')    // → { r: 255, g: 0, b: 0 }
     * parseColor('rgba(0, 0, 255, 0.5)')  // → { r: 0, g: 0, b: 255, a: 0.5 }
     * parseColor('invalid')           // → null
     * ```
     */
    private parseColor(color: string): { r: number; g: number; b: number; a?: number } | null {
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
        
        // Handle common color names
        const colorNames: Record<string, { r: number; g: number; b: number }> = {
            'white': { r: 255, g: 255, b: 255 },
            'black': { r: 0, g: 0, b: 0 },
            'red': { r: 255, g: 0, b: 0 },
            'green': { r: 0, g: 128, b: 0 },
            'blue': { r: 0, g: 0, b: 255 },
            'yellow': { r: 255, g: 255, b: 0 },
            'cyan': { r: 0, g: 255, b: 255 },
            'magenta': { r: 255, g: 0, b: 255 },
            'transparent': { r: 0, g: 0, b: 0 }
        };
        
        const namedColor = colorNames[trimmed.toLowerCase()];
        if (namedColor) {
            return namedColor;
        }
        
        // Unsupported color format
        return null;
    }

    /**
     * Interpolate between two RGB colors
     * 
     * @description
     * Performs smooth RGB interpolation between two colors.
     * Used for generating color gradients in distributed properties.
     * 
     * @param fromColor - Starting color (RGB object)
     * @param toColor - Ending color (RGB object)
     * @param progress - Interpolation progress (0-1)
     * @returns Interpolated color as hex string
     * 
     * @examples
     * ```typescript
     * interpolateColors({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }, 0.5)
     * // → '#800080' (purple, halfway between red and blue)
     * 
     * interpolateColors({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }, 0.25)
     * // → '#bfbfbf' (light gray, 25% towards black)
     * ```
     */
    private interpolateColors(
        fromColor: { r: number; g: number; b: number; a?: number },
        toColor: { r: number; g: number; b: number; a?: number },
        progress: number
    ): string {
        // Clamp progress to 0-1 range
        progress = Math.max(0, Math.min(1, progress));
        
        // Interpolate RGB components
        const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * progress);
        const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * progress);
        const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * progress);
        
        // Handle alpha if both colors have alpha
        if (fromColor.a !== undefined && toColor.a !== undefined) {
            const a = fromColor.a + (toColor.a - fromColor.a) * progress;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        
        // Convert to hex format
        const toHex = (value: number) => {
            const hex = Math.max(0, Math.min(255, value)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

    /**
 * Singleton instance for convenient usage throughout the application
     * 
     * @description
 * Provides a pre-instantiated generator for use in adapters and other utilities.
 * Since the generator is stateless, a singleton is safe and efficient.
 * 
 * @usage
     * ```typescript
 * import { distributedPropertyPatternGenerator } from './DistributedPropertyPatternGenerator.ts';
 * const values = distributedPropertyPatternGenerator.generateElementValues(elements, config, baseValue);
     * ```
     */
export const distributedPropertyPatternGenerator = new DistributedPropertyPatternGenerator(); 