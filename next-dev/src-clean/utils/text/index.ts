/**
 * @file index.ts
 * @description Text processing utilities for FAME text effects
 * 
 * @version Phase 1: Foundation
 * @since 1.0.0
 * 
 * @description
 * This module provides text processing utilities for advanced text animation effects.
 * It includes text splitting services, Canvas mode compatibility, and error handling.
 */

export { TextSplitter } from './TextSplitter.ts';
export { LineMaskingService } from './LineMaskingService.ts';

// Re-export types for convenience
export type {
    TextProcessingConfig,
    TextSplitType,
    TextSplitResult,
    TextCanvasConfig,
    TextCanvasFallback,
    TextEffect,
    TextEffectType,
    EffectTimingConfig
} from '../../types/index.ts';

// Re-export masking types
export type {
    LineMaskConfig,
    LineMaskResult
} from './LineMaskingService.ts'; 