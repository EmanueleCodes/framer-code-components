/**
 * FAME Animation System - Property Utilities Module
 * 
 * @fileOverview Export point for property utilities extracted from TimedAnimator
 * @version 2.0.0-clean
 * @status TODO - PHASE 2 EXTRACTION TARGET
 * 
 * @description
 * Central export point for property capture and interpolation utilities.
 * These utilities are being extracted from TimedAnimator as part of Phase 2 refactor.
 * 
 * @extraction_plan
 * ✅ StyleCapture.ts - Extract style capture logic from TimedAnimator (~44 lines)
 * ✅ PropertyInterpolator.ts - Extract interpolation logic from TimedAnimator (~12 lines)
 * ✅ TransformUtils.ts - Extract transform logic from TimedAnimator (~45 lines)
 * 
 * @benefits
 * - Reusable across TimedAnimator, ScrollAnimator, and other animators
 * - Single responsibility principle
 * - Better testing and maintenance
 * - Enhanced functionality (colors, units, transforms)
 */

// ============================================================================
// 🚨 TODO [PHASE 2]: EXPORT EXTRACTED UTILITIES
// ============================================================================

// ✅ [STEP 2]: Export style capture utilities
export * from './StyleCapture.ts';

// ✅ [STEP 3]: Export property interpolation utilities  
export * from './PropertyInterpolator.ts';

// ✅ [STEP 4]: Export transform utilities
export * from './TransformUtils.ts';

// ✅ Re-export commonly used functions for convenience
export { 
    captureElementStyles, 
    getCurrentPropertyValue,
    captureInitialStyles 
} from './StyleCapture.ts';
export { 
    interpolateProperty, 
    interpolateNumeric,
    interpolateColor,
    interpolateWithUnits 
} from './PropertyInterpolator.ts';

// ✅ [STEP 5]: Export initial value applicator
export * from './InitialValueApplicator.ts';

// 🎨 [NEW]: Export advanced interpolators for complex properties
export {
    parseGradient,
    interpolateGradient,
    parseClipPath,
    interpolateClipPath,
    applyTextBackgroundImage,
    findTextElement
} from './AdvancedInterpolators.ts';

// ============================================================================
// 📊 EXTRACTION IMPACT
// ============================================================================

/*
BEFORE EXTRACTION (TimedAnimator.ts):
- captureInitialStyles() - 13 lines
- getPropertyValue() - 31 lines  
- interpolateValue() - 12 lines
- extractTransformValue() - 21 lines
- applyTransformProperty() - 24 lines
Total: 101 lines of property logic mixed with animation timing

AFTER EXTRACTION:
- TimedAnimator.ts: -101 lines, focused on timing only
- StyleCapture.ts: ~120 lines with enhanced functionality
- PropertyInterpolator.ts: ~150 lines with color/unit support
- TransformUtils.ts: ~200 lines with proper transform combination
- Better separation of concerns
- Reusable across all animators
*/ 