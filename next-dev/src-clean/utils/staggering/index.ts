/**
 * @file index.ts
 * @description FAME Animation System - Staggering Module Exports
 * 
 * @version 3.0.0 - Simplified Architecture
 * @since 1.0.0
 * 
 * @description
 * Simplified stagger system using LinearStagger as the universal solution.
 * Clean, reliable, and extensible architecture for all stagger needs.
 */

// =============================================================================
// CORE TYPES AND INTERFACES  
// =============================================================================

// Essential stagger configuration types
export * from './types/StaggerTypes.ts';

// =============================================================================
// STAGGER STRATEGIES
// =============================================================================

// Core stagger implementation - universal solution for all stagger types
export { LinearStagger } from './strategies/LinearStagger.ts';

// Future stagger extensions (ready for implementation)
export { GridStagger } from './strategies/GridStagger.ts';
export { RandomStagger } from './strategies/RandomStagger.ts';

// =============================================================================
// UTILITIES
// =============================================================================

// Grid utilities for advanced stagger patterns
export { GridDetector } from './grid/GridDetector.ts';
export { DistanceCalculator } from './grid/DistanceCalculator.ts';
export { OriginResolver } from './grid/OriginResolver.ts';

// =============================================================================
// SCROLL STAGGER UTILITIES (Future Implementation)
// =============================================================================

// Scroll-based staggering utilities
export { ThresholdStagger } from './scroll/ThresholdStagger.ts';

// =============================================================================
// TESTING AND DEMOS (Development Only)
// =============================================================================

// Testing utilities
// Note: StaggerOrderTest and DualProgressDemo removed with StaggerOrchestrator cleanup 