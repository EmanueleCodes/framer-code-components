/**
 * FAME Animation System - Utilities Index
 * 
 * @fileOverview Central export point for all utility modules
 * @version 2.0.0-clean
 * @status PLACEHOLDER - Will export all utility modules
 * 
 * @description
 * Central export point for all FAME utility modules.
 * Provides clean, organized access to all utility functions.
 */

// Export utility modules
// export * from './math/index.ts';
// export * from './color/index.ts';
export * from './units/index.ts';
// export * from './staggering/index.ts';
// export * from './performance/index.ts';
// export * from './environment/index.ts';
// export * from './properties/index.ts';
// export * from './debug/index.ts';

// 🎨 FEATURE 2B: Text Processing Utilities (Phase 1)
export * from './text/index.ts';

// TODO: Re-export commonly used utilities for convenience
// export { parseColor, interpolateColor } from './color/index.ts';
// export { parseUnit, interpolateUnits } from './units/index.ts';
// export { Logger, isFramerEnvironment } from './environment/index.ts';

/*
UTILITY MODULES OVERVIEW:

📐 Math Utilities (math/)
- Easing functions (EXCELLENT - copy from src-refactored)
- Interpolation utilities
- Spring physics calculations

🎨 Color Utilities (color/)
- Color parsing and conversion
- Color interpolation for animations
- Support for all CSS color formats

📏 Units Utilities (units/)
- CSS unit parsing and conversion
- Unit interpolation for animations
- Support for px, %, em, rem, vh, vw, etc.

🎭 Staggering Utilities (staggering/)
- Grid-based staggering (EXCELLENT - copy from src-refactored)
- Linear and random staggering patterns
- Distance calculations and distributions

⚡ Performance Utilities (performance/)
- GPU acceleration detection
- Viewport optimization
- Animation performance monitoring

🌍 Environment Utilities (environment/)
- Browser capability detection (EXCELLENT - copy from src-refactored)
- Framer context detection (EXCELLENT - copy from src-refactored)
- Logging system (EXCELLENT - copy from src-refactored)

🎛️ Properties Utilities (properties/)
- Animation property validation
- Property value parsing
- Property interpolation helpers

MIGRATION PRIORITY:
1. HIGH: Copy excellent utilities (math/Easing, environment/*, staggering/*)
2. MEDIUM: Implement core utilities (color, units)
3. LOW: Add advanced utilities (performance monitoring)
*/ 