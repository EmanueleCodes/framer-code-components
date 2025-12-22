/**
 * FAME Animation System - Debug Utilities Index
 * 
 * @fileOverview Export point for all debug-related utilities
 * @version 2.0.0-clean
 * @status ACTIVE - Exports debug utilities
 * 
 * @description
 * Central export point for all FAME debug utilities.
 * Provides access to the sophisticated debug manager and related tools.
 */

// Export debug manager and utilities
export * from './DebugManager.ts';

// Re-export commonly used debug types for convenience
export type {
    DebugConfig,
    DebugContext,
    DebugPerformanceMeasurement,
    DataFlowDebug,
    AnimationDebug,
    StateDebug,
    DOMDebug,
    PerformanceDebug,
    VisualDebug
} from '../../types/index.ts';

export {
    DebugLogLevel,
    DebugPhase
} from '../../types/index.ts';

// Export debug manager instance for easy access
export { debugManager } from './DebugManager.ts';

/*
DEBUG UTILITIES OVERVIEW:

🔧 DebugManager.ts - Core debug system
- Granular debug control (data flow, animation, state, DOM, performance)
- Performance measurement tracking
- Visual debug aids (highlights, progress bars)
- Category-based logging with different levels

🎯 Usage Examples:
- debugManager.configure({ animation: { enabled: true, logLevel: 'verbose' } })
- debugManager.trackAnimation('Starting timed animation')
- debugManager.highlightTriggerElement(element)
- debugManager.showAnimationProgress(element, 0.5)
*/ 