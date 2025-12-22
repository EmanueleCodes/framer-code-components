/**
 * FAME Animation System - Property Value Cache
 * 
 * @fileOverview High-performance property value caching for scrubbed scroll animations
 * @version 1.1.0-enhanced-interpolation
 * @status ACTIVE - Advanced interpolation support
 * 
 * @description
 * Optimized caching system for property values during scroll animations.
 * Pre-computes and caches property values at multiple progress points
 * to enable smooth 60fps scroll performance with minimal interpolation overhead.
 * Now includes support for advanced properties like gradients and clip paths.
 */

import type { ScrollTimeline } from '../../execution/TimelineScrollMapper.ts';
import { timelineScrollMapper } from '../../execution/TimelineScrollMapper.ts';
import { 
    interpolateGradient, 
    interpolateClipPath 
} from '../properties/AdvancedInterpolators.ts';

/**
 * @file PropertyValueCache.ts
 * @description Pre-computation and caching system for property values in scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Eliminates expensive per-frame property interpolation by pre-computing values
 * at key progress points and using fast linear interpolation between cached values.
 * Critical for 60fps scroll animation performance.
 * 
 * @performance
 * - Pre-computes values at strategic progress points (0%, 25%, 50%, 75%, 100%)
 * - Fast linear interpolation between cached values
 * - Reduces per-frame computation from O(n) complex interpolation to O(1) lookup
 * - Memory-efficient with configurable cache granularity
 * 
 * @example
 * ```typescript
 * const cache = new PropertyValueCache();
 * 
 * // Pre-compute values once
 * cache.preComputeValues(scrollTimeline, elements);
 * 
 * // Fast cached lookup during scroll (60fps)
 * const values = cache.getValuesAtProgress(0.73, elementIndex);
 * ```
 */

/**
 * Cached property values for a specific progress point
 */
interface CachedPropertyValues {
    /** Progress point (0-1) */
    progress: number;
    /** Map of property names to computed values */
    values: Map<string, any>;
    /** Timestamp when computed */
    computedAt: number;
}

/**
 * Cache configuration for property value pre-computation
 */
interface PropertyCacheConfig {
    /** Number of progress points to pre-compute (higher = more accurate, more memory) */
    granularity: number;
    /** Cache TTL in milliseconds */
    ttlMs: number;
    /** Enable performance tracking */
    enableTracking: boolean;
    /** Maximum number of element caches to keep */
    maxElementCaches: number;
}

/**
 * Performance metrics for property cache operations
 */
interface PropertyCacheMetrics {
    hits: number;
    misses: number;
    computations: number;
    totalLookups: number;
    averageLookupTime: number;
    averageComputationTime: number;
}

/**
 * Element-specific property value cache
 */
class ElementPropertyCache {
    private cachedValues: CachedPropertyValues[] = [];
    private scrollTimeline: ScrollTimeline | null = null;
    private elementIndex: number;
    private lastComputedAt: number = 0;
    
    constructor(elementIndex: number) {
        this.elementIndex = elementIndex;
    }
    
    /**
     * Pre-compute property values at strategic progress points
     */
    preCompute(scrollTimeline: ScrollTimeline, granularity: number): void {
        this.scrollTimeline = scrollTimeline;
        this.cachedValues = [];
        this.lastComputedAt = Date.now();
        
        // Pre-compute at strategic progress points
        const progressPoints = this.generateProgressPoints(granularity);
        
        progressPoints.forEach(progress => {
            const values = timelineScrollMapper.getValuesUsingOriginalInterpolationForElement(
                scrollTimeline,
                progress,
                this.elementIndex
            );
            
            this.cachedValues.push({
                progress,
                values,
                computedAt: this.lastComputedAt
            });
        });
        
        console.log(`📋 [PropertyValueCache] Pre-computed ${this.cachedValues.length} value sets for element ${this.elementIndex}`);
    }
    
    /**
     * Generate strategic progress points for pre-computation
     */
    private generateProgressPoints(granularity: number): number[] {
        const points: number[] = [];
        
        // Always include key points: 0%, 100%
        points.push(0, 1);
        
        // Add evenly distributed points based on granularity
        for (let i = 1; i < granularity - 1; i++) {
            const progress = i / (granularity - 1);
            points.push(progress);
        }
        
        // Add extra detail points for common easing curves
        if (granularity >= 10) {
            points.push(0.1, 0.2, 0.8, 0.9); // Start/end curve regions
        }
        
        if (granularity >= 20) {
            points.push(0.05, 0.15, 0.3, 0.7, 0.85, 0.95); // Even more detail
        }
        
        // Sort and deduplicate
        return [...new Set(points)].sort((a, b) => a - b);
    }
    
    /**
     * Get cached property values at specific progress with interpolation
     */
    getValuesAtProgress(progress: number): Map<string, any> | null {
        if (this.cachedValues.length === 0) {
            return null;
        }
        
        // Clamp progress to valid range
        const clampedProgress = Math.max(0, Math.min(1, progress));
        
        // Find surrounding cached values
        const { before, after } = this.findSurroundingCachedValues(clampedProgress);
        
        if (!before) return after?.values || null;
        if (!after) return before.values;
        if (before === after) return before.values;
        
        // Fast linear interpolation between cached values
        return this.interpolateBetweenCachedValues(before, after, clampedProgress);
    }
    
    /**
     * Find cached values surrounding the target progress
     */
    private findSurroundingCachedValues(progress: number): {
        before: CachedPropertyValues | null;
        after: CachedPropertyValues | null;
    } {
        let before: CachedPropertyValues | null = null;
        let after: CachedPropertyValues | null = null;
        
        for (const cached of this.cachedValues) {
            if (cached.progress <= progress) {
                before = cached;
            } else if (!after) {
                after = cached;
                break;
            }
        }
        
        return { before, after };
    }
    
    /**
     * Fast linear interpolation between two cached value sets
     */
    private interpolateBetweenCachedValues(
        before: CachedPropertyValues,
        after: CachedPropertyValues,
        targetProgress: number
    ): Map<string, any> {
        const interpolatedValues = new Map<string, any>();
        const progressRange = after.progress - before.progress;
        const localProgress = (targetProgress - before.progress) / progressRange;
        
        // Interpolate each property value
        before.values.forEach((beforeValue, property) => {
            const afterValue = after.values.get(property);
            
            if (afterValue === undefined) {
                interpolatedValues.set(property, beforeValue);
                return;
            }
            
            // Fast linear interpolation based on value type
            const interpolatedValue = this.interpolateValue(beforeValue, afterValue, localProgress);
            interpolatedValues.set(property, interpolatedValue);
        });
        
        return interpolatedValues;
    }
    
    /**
     * Fast value interpolation for common property types
     */
    private interpolateValue(from: any, to: any, progress: number): any {
        // 🎨 ENHANCED: Check if this needs advanced interpolation
        // We don't have property name context here, so we detect by value patterns
        
        // Detect gradient values (contain 'gradient(')
        if (typeof from === 'string' && typeof to === 'string') {
            if (from.includes('gradient(') && to.includes('gradient(')) {
                // Use imported gradient interpolation function
                try {
                    return interpolateGradient(from, to, progress);
                } catch (error) {
                    console.warn('Failed to interpolate gradient, using fallback:', error);
                    return progress < 0.5 ? from : to;
                }
            }
            
            // Detect clip path values (contain clip path functions)
            if ((from.includes('inset(') || from.includes('polygon(') || from.includes('circle(') || from.includes('ellipse(')) &&
                (to.includes('inset(') || to.includes('polygon(') || to.includes('circle(') || to.includes('ellipse('))) {
                // Use imported clip path interpolation function
                try {
                    return interpolateClipPath(from, to, progress);
                } catch (error) {
                    console.warn('Failed to interpolate clip path, using fallback:', error);
                    return progress < 0.5 ? from : to;
                }
            }
        }
        
        // Handle numbers (most common case)
        if (typeof from === 'number' && typeof to === 'number') {
            return from + (to - from) * progress;
        }
        
        // Handle strings with numbers (e.g., "10px", "50%")
        if (typeof from === 'string' && typeof to === 'string') {
            const fromMatch = from.match(/^([-\d.]+)(.*)$/);
            const toMatch = to.match(/^([-\d.]+)(.*)$/);
            
            if (fromMatch && toMatch && fromMatch[2] === toMatch[2]) {
                const fromNum = parseFloat(fromMatch[1]);
                const toNum = parseFloat(toMatch[1]);
                const unit = fromMatch[2];
                const interpolated = fromNum + (toNum - fromNum) * progress;
                return `${interpolated}${unit}`;
            }
        }
        
        // Fallback: step interpolation at 50% threshold
        return progress < 0.5 ? from : to;
    }
    
    /**
     * Check if cache is still valid
     */
    isValid(ttlMs: number): boolean {
        if (this.cachedValues.length === 0) return false;
        const age = Date.now() - this.lastComputedAt;
        return age < ttlMs;
    }
    
    /**
     * Clear cached values
     */
    clear(): void {
        this.cachedValues = [];
        this.scrollTimeline = null;
        this.lastComputedAt = 0;
    }
}

/**
 * High-performance property value caching system
 * 
 * @description
 * Pre-computes property values at strategic progress points and provides
 * fast interpolation between cached values during scroll animations.
 */
export class PropertyValueCache {
    private elementCaches = new Map<string, ElementPropertyCache>();
    private config: PropertyCacheConfig;
    private metrics: PropertyCacheMetrics;
    
    constructor(config: Partial<PropertyCacheConfig> = {}) {
        this.config = {
            granularity: 20, // 20 pre-computed points for good balance
            ttlMs: 10 * 60 * 1000, // 10 minutes
            enableTracking: true,
            maxElementCaches: 200, // Reasonable limit
            ...config
        };
        
        this.metrics = {
            hits: 0,
            misses: 0,
            computations: 0,
            totalLookups: 0,
            averageLookupTime: 0,
            averageComputationTime: 0
        };
        
        console.log('📋 [PropertyValueCache] Initialized with config:', this.config);
    }
    
    /**
     * Pre-compute property values for all elements
     * 
     * @param scrollTimeline - Scroll timeline to compute values from
     * @param elementCount - Number of elements to cache for
     * @param slotId - Animation slot ID for cache isolation
     */
    preComputeForElements(scrollTimeline: ScrollTimeline, elementCount: number, slotId?: string): void {
        const startTime = performance.now();
        
        const cacheKeyBase = slotId ? `${slotId}-` : '';
        console.log(`📋 [PropertyValueCache] Pre-computing values for ${elementCount} elements (slot: ${slotId || 'global'})...`);
        
        for (let i = 0; i < elementCount; i++) {
            const elementCacheKey = `${cacheKeyBase}element-${i}`;
            let elementCache = this.elementCaches.get(elementCacheKey);
            
            if (!elementCache) {
                elementCache = new ElementPropertyCache(i);
                this.elementCaches.set(elementCacheKey, elementCache);
            }
            
            elementCache.preCompute(scrollTimeline, this.config.granularity);
            this.metrics.computations++;
        }
        
        // Clean up old caches if we exceed the limit
        this.evictOldCaches();
        
        const computationTime = performance.now() - startTime;
        this.updateAverageComputationTime(computationTime);
        
        console.log(`📋 [PropertyValueCache] Pre-computation complete in ${computationTime.toFixed(2)}ms`);
    }
    
    /**
     * Get cached property values for element at specific progress
     * 
     * @param progress - Animation progress (0-1)
     * @param elementIndex - Index of the element
     * @param slotId - Animation slot ID for cache isolation
     * @returns Cached property values or null if not cached
     */
    getValuesAtProgress(progress: number, elementIndex: number, slotId?: string): Map<string, any> | null {
        const startTime = performance.now();
        
        const cacheKeyBase = slotId ? `${slotId}-` : '';
        const elementCacheKey = `${cacheKeyBase}element-${elementIndex}`;
        const elementCache = this.elementCaches.get(elementCacheKey);
        if (!elementCache || !elementCache.isValid(this.config.ttlMs)) {
            this.metrics.misses++;
            this.metrics.totalLookups++;
            return null;
        }
        
        const values = elementCache.getValuesAtProgress(progress);
        
        if (values) {
            this.metrics.hits++;
        } else {
            this.metrics.misses++;
        }
        
        this.metrics.totalLookups++;
        
        const lookupTime = performance.now() - startTime;
        this.updateAverageLookupTime(lookupTime);
        
        return values;
    }
    
    /**
     * Evict old element caches to stay within memory limits
     */
    private evictOldCaches(): void {
        if (this.elementCaches.size <= this.config.maxElementCaches) {
            return;
        }
        
        // Remove oldest 25% of caches
        const cacheEntries = Array.from(this.elementCaches.entries());
        const toRemove = Math.floor(cacheEntries.length * 0.25);
        
        // Simple eviction: remove first N entries (could be improved with LRU)
        for (let i = 0; i < toRemove; i++) {
            const [elementCacheKey] = cacheEntries[i];
            this.elementCaches.delete(elementCacheKey);
        }
        
        console.log(`📋 [PropertyValueCache] Evicted ${toRemove} old element caches`);
    }
    
    /**
     * Update average lookup time metric
     */
    private updateAverageLookupTime(lookupTime: number): void {
        if (!this.config.enableTracking) return;
        
        const alpha = 0.1;
        this.metrics.averageLookupTime = this.metrics.averageLookupTime * (1 - alpha) + lookupTime * alpha;
    }
    
    /**
     * Update average computation time metric
     */
    private updateAverageComputationTime(computationTime: number): void {
        if (!this.config.enableTracking) return;
        
        const alpha = 0.1;
        this.metrics.averageComputationTime = this.metrics.averageComputationTime * (1 - alpha) + computationTime * alpha;
    }
    
    /**
     * Clear all cached values
     */
    clear(): void {
        this.elementCaches.forEach(cache => cache.clear());
        this.elementCaches.clear();
        console.log('📋 [PropertyValueCache] All caches cleared');
    }
    
    /**
     * Get cache performance metrics
     */
    getMetrics(): PropertyCacheMetrics & { cacheSize: number; hitRate: number } {
        const hitRate = this.metrics.totalLookups > 0 
            ? this.metrics.hits / this.metrics.totalLookups 
            : 0;
            
        return {
            ...this.metrics,
            cacheSize: this.elementCaches.size,
            hitRate: Math.round(hitRate * 100) / 100
        };
    }
    
    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics(): void {
        this.metrics = {
            hits: 0,
            misses: 0,
            computations: 0,
            totalLookups: 0,
            averageLookupTime: 0,
            averageComputationTime: 0
        };
    }
}

/**
 * Singleton instance for property value caching
 */
export const propertyValueCache = new PropertyValueCache(); 