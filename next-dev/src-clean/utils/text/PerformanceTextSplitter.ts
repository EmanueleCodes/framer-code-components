/**
 * @file PerformanceTextSplitter.ts
 * @description Performance-optimized text splitter with smart processing selection
 * 
 * @version 1.0.0
 * @since 1.0.0
 *
 * @description
 * Smart wrapper that automatically chooses between blocking and non-blocking
 * text processing based on text size and performance requirements. Provides
 * a drop-in replacement for TextSplitter.splitText() with better performance.
 * 
 * 🚀 PERFORMANCE STRATEGY:
 * - Small text blocks (<100 elements): Use fast synchronous processing
 * - Large text blocks (>=100 elements): Use non-blocking chunked processing
 * - Automatic fallback to existing TextSplitter for complex cases
 * - Smart caching to avoid re-processing identical text
 * 
 * @key_features
 * - Intelligent processing method selection
 * - Zero regression guarantee (fallback to original)
 * - Performance metrics and monitoring
 * - Automatic text size detection
 * - Progressive rendering for large text blocks
 * 
 * @performance_thresholds
 * - Small text: <100 elements (synchronous)
 * - Medium text: 100-500 elements (chunked, 16ms frames)
 * - Large text: >500 elements (chunked, 8ms frames)
 */

import { TextProcessingConfig, TextSplitResult, TextSplitType } from '../../types/index.ts';
import { TextSplitter } from './TextSplitter.ts';
import { processTextNonBlocking, ProgressCallback } from './NonBlockingTextProcessor.ts';

/**
 * Performance thresholds for processing method selection
 */
const PERFORMANCE_THRESHOLDS = {
    SMALL_TEXT_LIMIT: 100,      // Elements - use synchronous processing
    LARGE_TEXT_LIMIT: 500,      // Elements - use aggressive chunking
    MAX_SYNC_TIME: 5,           // ms - max time for synchronous processing
    CHUNKED_FRAME_TIME: 16,     // ms - frame time for medium text
    AGGRESSIVE_FRAME_TIME: 8    // ms - frame time for large text
};

/**
 * Performance metrics for monitoring
 */
interface PerformanceMetrics {
    textLength: number;
    elementCount: number;
    processingMethod: 'synchronous' | 'chunked' | 'fallback';
    totalTime: number;
    avgTimePerElement: number;
    blockedMainThread: boolean;
}

/**
 * Cache for processed text to avoid re-processing
 */
const textProcessingCache = new Map<string, TextSplitResult>();

/**
 * Performance-optimized text splitting with smart method selection
 * 
 * This function automatically chooses the best processing method based on
 * text size and performance requirements. It maintains full compatibility
 * with the existing TextSplitter while providing better performance.
 * 
 * @param element - Element containing text to split
 * @param config - Text processing configuration
 * @param progressCallback - Optional callback for tracking progress on large text
 * @returns Promise resolving to text split result
 * 
 * @example
 * ```typescript
 * // Automatically chooses optimal processing method
 * const result = await splitTextWithPerformanceOptimization(element, {
 *   enabled: true,
 *   animateBy: 'characters',
 *   maskLines: true
 * });
 * 
 * // Large text gets non-blocking processing automatically
 * // Small text gets fast synchronous processing
 * ```
 */
export async function splitTextWithPerformanceOptimization(
    element: HTMLElement,
    config: TextProcessingConfig,
    progressCallback?: ProgressCallback
): Promise<TextSplitResult> {
    const startTime = performance.now();
    
    try {
        // Validate inputs
        if (!element || !config.enabled) {
            return createEmptyResult('Invalid input or disabled');
        }
        
        const originalText = element.textContent || '';
        if (!originalText.trim()) {
            return createEmptyResult('No text content');
        }
        
        // Generate cache key for this processing request
        const cacheKey = generateCacheKey(element, config);
        
        // Check cache first
        const cachedResult = textProcessingCache.get(cacheKey);
        if (cachedResult && areElementsStillValid(cachedResult.splitElements)) {
            console.log('🚀 [PerformanceTextSplitter] ✅ Using cached result');
            return cachedResult;
        }
        
        // Estimate element count to choose processing method
        const estimatedElementCount = estimateElementCount(originalText, config.animateBy);
        const processingMethod = selectProcessingMethod(estimatedElementCount);
        
        console.log(`🚀 [PerformanceTextSplitter] Processing ${originalText.length} chars → ~${estimatedElementCount} elements using ${processingMethod} method`);
        
        let result: TextSplitResult;
        
        switch (processingMethod) {
            case 'synchronous':
                result = await processSynchronously(element, config);
                break;
                
            case 'chunked':
                result = await processWithChunking(element, config, estimatedElementCount, progressCallback);
                break;
                
            case 'fallback':
            default:
                result = await processFallback(element, config);
                break;
        }
        
        // Cache successful results
        if (result.success && result.splitElements.length > 0) {
            textProcessingCache.set(cacheKey, result);
            
            // Limit cache size
            if (textProcessingCache.size > 50) {
                const firstKey = textProcessingCache.keys().next().value;
                textProcessingCache.delete(firstKey);
            }
        }
        
        // Log performance metrics
        const totalTime = performance.now() - startTime;
        logPerformanceMetrics({
            textLength: originalText.length,
            elementCount: result.splitElements.length,
            processingMethod,
            totalTime,
            avgTimePerElement: result.splitElements.length > 0 ? totalTime / result.splitElements.length : 0,
            blockedMainThread: processingMethod === 'synchronous' && totalTime > PERFORMANCE_THRESHOLDS.MAX_SYNC_TIME
        });
        
        return result;
        
    } catch (error) {
        const totalTime = performance.now() - startTime;
        console.error(`🚀 [PerformanceTextSplitter] ❌ Failed after ${totalTime.toFixed(2)}ms:`, error);
        
        // Always fallback to original TextSplitter on error
        return processFallback(element, config);
    }
}

/**
 * Estimate element count based on text length and split type
 */
function estimateElementCount(text: string, animateBy: string): number {
    switch (animateBy) {
        case 'characters':
            return text.length;
        case 'words':
            return text.split(/\s+/).length;
        case 'lines':
            return text.split('\n').length;
        default:
            return text.length; // Conservative estimate
    }
}

/**
 * Select optimal processing method based on estimated element count
 */
function selectProcessingMethod(estimatedElements: number): 'synchronous' | 'chunked' | 'fallback' {
    if (estimatedElements <= PERFORMANCE_THRESHOLDS.SMALL_TEXT_LIMIT) {
        return 'synchronous';
    } else if (estimatedElements <= PERFORMANCE_THRESHOLDS.LARGE_TEXT_LIMIT * 2) {
        return 'chunked';
    } else {
        // For extremely large text, fallback to existing system
        return 'fallback';
    }
}

/**
 * Process text synchronously for small text blocks
 */
async function processSynchronously(element: HTMLElement, config: TextProcessingConfig): Promise<TextSplitResult> {
    console.log('🚀 [PerformanceTextSplitter] Using synchronous processing for small text');
    
    // Use existing TextSplitter for small text (it's already optimized for this)
    const textSplitter = TextSplitter.getInstance();
    return await textSplitter.splitText(element, config);
}

/**
 * Process text with chunking for medium to large text blocks
 */
async function processWithChunking(
    element: HTMLElement, 
    config: TextProcessingConfig,
    estimatedElements: number,
    progressCallback?: ProgressCallback
): Promise<TextSplitResult> {
    console.log(`🚀 [PerformanceTextSplitter] Using chunked processing for ${estimatedElements} elements`);
    
    // Configure chunking based on text size
    const isLargeText = estimatedElements > PERFORMANCE_THRESHOLDS.LARGE_TEXT_LIMIT;
    const chunkSize = isLargeText ? 25 : 50;
    const frameTime = isLargeText ? PERFORMANCE_THRESHOLDS.AGGRESSIVE_FRAME_TIME : PERFORMANCE_THRESHOLDS.CHUNKED_FRAME_TIME;
    
    return await processTextNonBlocking(element, config, {
        maxChunkSize: chunkSize,
        maxFrameTime: frameTime,
        useIdleCallback: true,
        progressCallback
    });
}

/**
 * Fallback to original TextSplitter for complex cases
 */
async function processFallback(element: HTMLElement, config: TextProcessingConfig): Promise<TextSplitResult> {
    console.log('🚀 [PerformanceTextSplitter] Using fallback to original TextSplitter');
    
    try {
        const textSplitter = TextSplitter.getInstance();
        return await textSplitter.splitText(element, config);
    } catch (error) {
        console.error('🚀 [PerformanceTextSplitter] Fallback failed:', error);
        return createEmptyResult(`Fallback failed: ${error}`);
    }
}

/**
 * Generate cache key for text processing request
 */
function generateCacheKey(element: HTMLElement, config: TextProcessingConfig): string {
    const text = element.textContent || '';
    const configKey = `${config.animateBy}-${config.maskLines}-${config.wrapInSpans}`;
    
    // Include element classes and styles that might affect processing
    const elementKey = `${element.className}-${element.tagName}`;
    
    // Create hash of text content (simplified)
    const textHash = text.length + text.substring(0, 100) + text.substring(text.length - 100);
    
    return `${elementKey}-${configKey}-${textHash}`;
}

/**
 * Check if cached elements are still valid (connected to DOM)
 */
function areElementsStillValid(elements: HTMLElement[]): boolean {
    if (!elements || elements.length === 0) return false;
    
    // Check first and last few elements
    const checkElements = [
        ...elements.slice(0, 3),
        ...elements.slice(-3)
    ];
    
    return checkElements.every(el => el.isConnected && document.contains(el));
}

/**
 * Log performance metrics for monitoring
 */
function logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const {
        textLength,
        elementCount,
        processingMethod,
        totalTime,
        avgTimePerElement,
        blockedMainThread
    } = metrics;
    
    console.log(`🚀 [PerformanceTextSplitter] ✅ Performance metrics:`, {
        textLength,
        elementCount,
        processingMethod,
        totalTime: totalTime.toFixed(2) + 'ms',
        avgTimePerElement: avgTimePerElement.toFixed(3) + 'ms',
        blockedMainThread,
        efficiency: elementCount > 0 ? (elementCount / totalTime).toFixed(1) + ' elements/ms' : '0 elements/ms'
    });
    
    // Warn about performance issues
    if (blockedMainThread) {
        console.warn(`🚀 [PerformanceTextSplitter] ⚠️ Main thread blocked for ${totalTime.toFixed(2)}ms - consider chunked processing`);
    }
    
    if (totalTime > 50) {
        console.warn(`🚀 [PerformanceTextSplitter] ⚠️ Slow text processing: ${totalTime.toFixed(2)}ms`);
    }
}

/**
 * Create empty result for error cases
 */
function createEmptyResult(error: string): TextSplitResult {
    return {
        success: false,
        originalText: '',
        splitElements: [],
        splitType: TextSplitType.LINES,
        error,
        metadata: {
            elementCount: 0,
            originalElement: document.createElement('div'),
            containerElement: document.createElement('div'),
            timestamp: Date.now()
        }
    };
}

/**
 * Clear performance cache (call on component unmount)
 */
export function clearPerformanceCache(): void {
    textProcessingCache.clear();
    console.log('🚀 [PerformanceTextSplitter] Cache cleared');
} 