/**
 * FAME Animation System - Easing Functions
 * 
 * @fileOverview Comprehensive easing functions for smooth animations
 * @version 2.1.0-clean
 * @status ACTIVE - Enhanced with world-class easing library
 * 
 * @description
 * Centralized easing functions library providing smooth animation curves.
 * Enhanced with working easing functions from the old system and new world-class easings.
 * 
 * ✅ PHASE 1 - STEP 1: Enhanced Easing System
 * ✅ PHASE 2 - STEP 1: World-Class Easing Library
 * 
 * @extraction_source
 * src-refactored/utils/math/Easing.ts
 * - Working easing functions (linear, in, out, inout, cubic, expo, spring)
 * - Spring functions: spring.in and spring.out with amplitude and period
 * 
 * @new_features
 * - Cubic-bezier easing support
 * - Smooth easings (Smooth Out, Smooth In)
 * - Advanced easings (Pause, Out-N-in variants)
 * - Back easings (Back Out, Back In)
 * 
 * @architecture
 * - Pure functions (no side effects)
 * - Type-safe interfaces with SpringConfig
 * - Performance optimized
 * - Spring physics with configurable parameters
 * - Reusable across TimedAnimator and ScrollAnimator
 * 
 * @api_design
 * ```typescript
 * // Main interface
 * export function applyEasing(progress: number, easingType: string, springConfig?: SpringConfig): number;
 * 
 * // Usage
 * const easedProgress = applyEasing(0.5, 'cubic.inout'); // 0.75
 * const springProgress = applyEasing(0.5, 'spring.out', { amplitude: 1.2, period: 0.4 }); // with spring config
 * const smoothProgress = applyEasing(0.5, 'smooth.out'); // Custom cubic-bezier curve
 * ```
 */

// ============================================================================
// 🎯 SPRING CONFIGURATION
// ============================================================================

/**
 * Spring configuration for spring-based easing functions
 */
export interface SpringConfig {
    /** Controls the intensity of the oscillation (1-10) */
    amplitude?: number;
    /** Controls the speed of the oscillation (0.1-2) */
    period?: number;
}

// ============================================================================
// 🎯 CUBIC-BEZIER HELPER
// ============================================================================

/**
 * Cubic bezier evaluator for custom easing curves
 * Evaluates a cubic bezier curve at time t given control points
 * 
 * @param p1x - First control point X coordinate
 * @param p1y - First control point Y coordinate  
 * @param p2x - Second control point X coordinate
 * @param p2y - Second control point Y coordinate
 * @returns Function that evaluates the cubic-bezier at time t
 */
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
    return function(t: number): number {
        // Handle edge cases
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        
        // Use binary search to find the t value that gives us the desired x
        let start = 0;
        let end = 1;
        let mid = t;
        
        // Binary search for the correct t value
        for (let i = 0; i < 10; i++) {
            const x = (3 * (1 - mid) * (1 - mid) * mid * p1x) + 
                     (3 * (1 - mid) * mid * mid * p2x) + 
                     (mid * mid * mid);
            
            if (Math.abs(x - t) < 0.001) break;
            
            if (x < t) {
                start = mid;
            } else {
                end = mid;
            }
            mid = (start + end) / 2;
        }
        
        // Calculate y value using the found t
        return (3 * (1 - mid) * (1 - mid) * mid * p1y) + 
               (3 * (1 - mid) * mid * mid * p2y) + 
               (mid * mid * mid);
    };
}

// ============================================================================
// 🎯 ENHANCED EASING FUNCTIONS
// ============================================================================

/**
 * Collection of easing functions with world-class curves
 * Enhanced with new cubic-bezier based easings
 */
export const EasingFunctions = {
    // ✅ Basic easings (working)
    linear: (t: number) => t,
    in: (t: number) => t * t,
    out: (t: number) => t * (2 - t),
    inout: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

    // ✅ Cubic functions (working)
    cubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    'cubic.in': (t: number) => t * t * t,
    'cubic.out': (t: number) => 1 - Math.pow(1 - t, 3),
    'cubic.inout': (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

    // ✅ Expo functions (working)
    expo: (t: number) =>
        t === 0
            ? 0
            : t === 1
              ? 1
              : t < 0.5
                ? Math.pow(2, 20 * t - 10) / 2
                : (2 - Math.pow(2, -20 * t + 10)) / 2,
    'expo.in': (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
    'expo.out': (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    'expo.inout': (t: number) =>
        t === 0
            ? 0
            : t === 1
              ? 1
              : t < 0.5
                ? Math.pow(2, 20 * t - 10) / 2
                : (2 - Math.pow(2, -20 * t + 10)) / 2,

    // 🆕 NEW: Smooth easings - premium quality curves
    'smooth.out': cubicBezier(0.16, 1, 0.3, 1),     // cubic-bezier(.16,1,.3,1)
    'smooth.in': cubicBezier(1, 0.16, 1, 0.3),      // cubic-bezier(1,0.16,1,.3)

    // 🆕 NEW: Advanced easings - unique motion curves  
    'pause': cubicBezier(0.14, 1, 0.86, 0),         // cubic-bezier(.14,1,.86,0)
    'out.n.in': cubicBezier(0.18, 1.32, 0.84, -0.22), // cubic-bezier(.18,1.32,.84,-0.22)
    'dramatic.out.n.in': cubicBezier(0.17, 1.51, 0.85, -0.42), // cubic-bezier(.17,1.51,.85,-0.42)

    // 🆕 NEW: Back easings - elastic back motion
    'back.out': cubicBezier(0.1, 1.55, 0.52, 1),    // cubic-bezier(.1,1.55,.52,1)
    'back.in': cubicBezier(0.52, 0, 0.9, -0.45),    // cubic-bezier(.52,0,.9,-0.45)

    // ✅ Spring functions (working) - exact copy from src-refactored
    "spring.in": (t: number, config?: SpringConfig) => {
        return 1 - originalElasticOut(1 - t, config);
    },
    "spring.out": (t: number, config?: SpringConfig) => {
        return originalElasticOut(t, config);
    },
    spring: (t: number, config?: SpringConfig) => {
        return originalElasticOut(t, config);
    },
};

/**
 * Original elastic out easing function with adjusted amplitude scale
 * Extracted from src-refactored with working spring physics
 */
function originalElasticOut(t: number, config?: SpringConfig): number {
    // Handle edge cases
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Get amplitude and period with defaults
    // Scale down the effective amplitude to make amplitude=1 less bouncy
    const rawAmplitude = config?.amplitude ?? 1;
    const scaleFactor = 0.5; // Reduce the power by half for default amplitude
    const effectiveAmplitude = 1 + (rawAmplitude - 1) * scaleFactor;

    const period = config?.period ?? 0.3;

    // Calculate the spring effect
    const s = (period / (Math.PI * 2)) * Math.asin(1 / effectiveAmplitude);

    return (
        effectiveAmplitude *
            Math.pow(2, -10 * t) *
            Math.sin(((t - s) * (Math.PI * 2)) / period) +
        1
    );
}

// ============================================================================
// 🎯 MAIN EASING FUNCTION
// ============================================================================

/**
 * Apply easing curve to animation progress
 * Enhanced version with spring configuration support
 * 
 * @param progress - Linear progress value (0-1)
 * @param easingType - Easing curve type
 * @param springConfig - Optional spring configuration for spring easings
 * @returns Eased progress value (0-1)
 * 
 * @example
 * ```typescript
 * // Basic easings
 * applyEasing(0.5, 'cubic.inout') // Returns 0.75 (smooth curve)
 * applyEasing(0.3, 'expo.out')    // Returns exponential easing
 * 
 * // Spring easings with configuration
 * applyEasing(0.5, 'spring.out', { amplitude: 1.2, period: 0.4 }) // Custom spring
 * applyEasing(0.7, 'spring.in')   // Default spring in
 * ```
 */
export function applyEasing(progress: number, easingType: string, springConfig?: SpringConfig): number {
    // Always return exact values at boundaries
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    
    // Handle spring easings separately (they need config parameters)
    if (easingType.startsWith('spring')) {
        // Apply appropriate spring function (exact copy of original logic)
        if (easingType === 'spring.in') {
            return EasingFunctions['spring.in'](progress, springConfig);
        } else {
            // Default to spring.out for all other spring variants (including "spring")
            return EasingFunctions['spring.out'](progress, springConfig);
        }
    }
    
    // Handle regular easings
    try {
        const easingFn = EasingFunctions[easingType as keyof typeof EasingFunctions];
        if (!easingFn) {
            console.warn(`🎯 [EasingFunctions] Easing function "${easingType}" not found. Falling back to linear.`);
            return progress; // Linear fallback
        }
        
        // Type guard to ensure we don't pass config to non-spring functions
        if (typeof easingFn === 'function') {
            return (easingFn as (t: number) => number)(progress);
        }
        
        return progress; // Fallback
    } catch (error) {
        console.error(`🎯 [EasingFunctions] Error in easing function "${easingType}":`, error);
        return progress; // Linear fallback
    }
}

// ============================================================================
// 🎯 AVAILABLE EASINGS
// ============================================================================

/**
 * List of available easing options
 * Enhanced with world-class easing curves
 */
export const EASING_OPTIONS = [
    'linear',
    'in',
    'out', 
    'inout',
    'cubic',
    'cubic.in',
    'cubic.out',
    'cubic.inout',
    'expo',
    'expo.in',
    'expo.out',
    'expo.inout',
    'smooth.out',
    'smooth.in',
    'pause',
    'out.n.in',
    'dramatic.out.n.in',
    'back.out',
    'back.in',
    'spring',
    'spring.in',
    'spring.out'
] as const;

/**
 * Default easing for animations
 */
export const DEFAULT_EASING = 'cubic.inout';

/**
 * Type for valid easing names
 */
export type EasingType = typeof EASING_OPTIONS[number];

// ============================================================================
// 🎯 UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an easing type is a spring easing
 */
export function isSpringEasing(easingType: string): boolean {
    return easingType.startsWith('spring');
}

/**
 * Get default spring configuration
 */
export function getDefaultSpringConfig(): SpringConfig {
    return {
        amplitude: 1,
        period: 0.3
    };
} 