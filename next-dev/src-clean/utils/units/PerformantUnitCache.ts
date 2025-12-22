/**
 * FAME Animation System - Simplified Unit Conversion Cache
 * 
 * @fileOverview Simplified caching for unit conversions without performance overhead
 * @version 2.0.0-simplified
 * @status ACTIVE - Simplified to remove performance bottlenecks
 * 
 * @description
 * Simple unit conversion cache that only does work when actually needed.
 * Removed expensive RAF loops, frame counters, and complex invalidation logic.
 * 
 * @performance
 * ✅ Caches getBoundingClientRect() results with simple time-based expiration
 * ✅ Caches viewport dimensions with simple time-based expiration
 * ✅ No continuous RAF loops or frame counters
 * ✅ Lazy cleanup only when cache is accessed
 * 
 * @example
 * ```typescript
 * // Simple cached conversions:
 * const cache = new PerformantUnitCache();
 * const pixels = cache.convertToPixels('100vw', element, 'translateX'); // Cached!
 * ```
 */

interface CachedElement {
    rect: DOMRect;
    parentRect: DOMRect;
    computedStyle: CSSStyleDeclaration;
    timestamp: number; // Changed from frameNumber to timestamp
}

interface ViewportCache {
    width: number;
    height: number;
    timestamp: number; // Changed from frameNumber to timestamp
}

interface ConversionCache {
    value: string;
    element: HTMLElement;
    property: string;
    result: number;
    timestamp: number; // Changed from frameNumber to timestamp
}

export class PerformantUnitCache {
    private elementCache = new Map<HTMLElement, CachedElement>();
    private viewportCache: ViewportCache | null = null;
    private conversionCache = new Map<string, ConversionCache>();
    private maxCacheAge = 2000; // 2 seconds instead of frames
    
    constructor() {
        // ✅ SIMPLIFIED: Only add resize listener, no continuous RAF loop
        if (typeof window !== 'undefined') {
            // Invalidate cache on resize (simple approach)
            window.addEventListener('resize', () => this.invalidateViewportCache(), { passive: true });
            console.log('[PerformantUnitCache] Simplified cache initialized');
        } else {
            // Fallback for non-browser environments (Framer Canvas)
            console.warn('[PerformantUnitCache] Browser environment not detected - caching disabled');
        }
    }
    
    /**
     * High-performance unit conversion with caching
     */
    convertToPixels(value: string | number, element: HTMLElement, property: string): number {
        // Early return for numbers
        if (typeof value === "number") return value;
        
        // Create cache key
        const cacheKey = `${value}|${element.tagName}|${property}`;
        const cached = this.conversionCache.get(cacheKey);
        
        // Return cached result if fresh
        if (cached && 
            cached.element === element && 
            Date.now() - cached.timestamp < this.maxCacheAge) {
            return cached.result;
        }
        
        // Calculate new result
        const result = this.calculatePixels(value, element, property);
        
        // Cache the result
        this.conversionCache.set(cacheKey, {
            value,
            element,
            property,
            result,
            timestamp: Date.now()
        });
        
        return result;
    }
    
    /**
     * Actual pixel calculation (optimized)
     */
    private calculatePixels(value: string, element: HTMLElement, property: string): number {
        // Handle calc() expressions
        if (value.includes('calc(')) {
            return this.evaluateCalcExpression(value, element, property);
        }
        
        // Parse value and unit
        const match = value.match(/^(-?\d*\.?\d+)(.*)$/);
        if (!match) return 0;
        
        const numericValue = parseFloat(match[1]);
        const unit = match[2];
        
        // Convert based on unit with caching
        switch (unit) {
            case "px":
            case "":
                return numericValue;
                
            case "%":
                return this.convertPercentage(numericValue, element, property);
                
            case "vw":
                return (numericValue / 100) * this.getViewportWidth();
                
            case "vh":
                return (numericValue / 100) * this.getViewportHeight();
                
            case "vmin":
                return (numericValue / 100) * Math.min(this.getViewportWidth(), this.getViewportHeight());
                
            case "vmax":
                return (numericValue / 100) * Math.max(this.getViewportWidth(), this.getViewportHeight());
                
            case "em":
                return numericValue * this.getFontSize(element);
                
            case "rem":
                return numericValue * this.getRootFontSize();
                
            default:
                console.warn(`[PerformantUnitCache] Unsupported unit: ${unit}`);
                return numericValue;
        }
    }
    
    /**
     * Convert percentage with cached element dimensions
     */
    private convertPercentage(percentage: number, element: HTMLElement, property: string): number {
        const cached = this.getCachedElement(element);
        
        // Transform properties use element's own dimensions
        if (property === "translateX" || property === "x") {
            return (percentage / 100) * cached!.rect.width;
        } else if (property === "translateY" || property === "y") {
            return (percentage / 100) * cached!.rect.height;
        }
        
        // Size properties use parent dimensions
        if (property === "width" || property.includes('width') || property.includes('left') || property.includes('right') || property.includes('X')) {
            return (percentage / 100) * cached!.parentRect.width;
        } else if (property === "height" || property.includes('height') || property.includes('top') || property.includes('bottom') || property.includes('Y')) {
            return (percentage / 100) * cached!.parentRect.height;
        }
        
        return percentage; // Fallback
    }
    
    /**
     * Get cached element dimensions
     */
    private getCachedElement(element: HTMLElement): CachedElement {
        const existing = this.elementCache.get(element);
        
        // Return cached if fresh
        if (existing && Date.now() - existing.timestamp < this.maxCacheAge) {
            return existing;
        }
        
        // Calculate new dimensions
        const rect = element.getBoundingClientRect();
        const parentRect = element.parentElement?.getBoundingClientRect() || 
            { width: this.getViewportWidth(), height: this.getViewportHeight() } as DOMRect;
        const computedStyle = window.getComputedStyle(element);
        
        const cached: CachedElement = {
            rect,
            parentRect,
            computedStyle,
            timestamp: Date.now()
        };
        
        this.elementCache.set(element, cached);
        return cached;
    }
    
    /**
     * Get cached viewport width
     */
    private getViewportWidth(): number {
        if (!this.viewportCache || Date.now() - this.viewportCache.timestamp >= this.maxCacheAge) {
            this.updateViewportCache();
        }
        return this.viewportCache!.width;
    }
    
    /**
     * Get cached viewport height
     */
    private getViewportHeight(): number {
        if (!this.viewportCache || Date.now() - this.viewportCache.timestamp >= this.maxCacheAge) {
            this.updateViewportCache();
        }
        return this.viewportCache!.height;
    }
    
    /**
     * Update viewport cache
     */
    private updateViewportCache(): void {
        // ✅ ENVIRONMENT FIX: Handle non-browser environments
        if (typeof window !== 'undefined') {
            this.viewportCache = {
                width: window.innerWidth,
                height: window.innerHeight,
                timestamp: Date.now()
            };
        } else {
            // Fallback dimensions for non-browser environments
            this.viewportCache = {
                width: 1920, // Default viewport width
                height: 1080, // Default viewport height
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * Get element font size with caching
     */
    private getFontSize(element: HTMLElement): number {
        const cached = this.getCachedElement(element);
        return parseFloat(cached.computedStyle.fontSize) || 16;
    }
    
    /**
     * Get root font size with caching
     */
    private getRootFontSize(): number {
        // ✅ ENVIRONMENT FIX: Handle non-browser environments
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        } else {
            return 16; // Default font size for non-browser environments
        }
    }
    
    /**
     * Evaluate calc() expressions with element context
     */
    private evaluateCalcExpression(expression: string, element: HTMLElement, property: string): number {
        try {
            // Create a temporary element for calc evaluation
            const tempElement = document.createElement('div');
            tempElement.style.position = 'absolute';
            tempElement.style.visibility = 'hidden';
            tempElement.style.pointerEvents = 'none';
            tempElement.style[property as any] = expression;
            
            // Append to same parent for context
            element.parentElement?.appendChild(tempElement);
            
            // Get computed value
            const computedValue = window.getComputedStyle(tempElement)[property as any] as string;
            const pixels = parseFloat(computedValue) || 0;
            
            // Cleanup
            tempElement.remove();
            
            return pixels;
        } catch (error) {
            console.warn(`[PerformantUnitCache] calc() evaluation failed:`, error);
            return 0;
        }
    }
    
    /**
     * Clean up old cache entries
     */
    private cleanupOldEntries(): void {
        // This method is no longer needed as cleanup is lazy
    }
    
    /**
     * Invalidate viewport cache on resize
     */
    private invalidateViewportCache(): void {
        this.viewportCache = null;
        // Also clear element cache since dimensions may have changed
        this.elementCache.clear();
        this.conversionCache.clear();
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            conversionCacheSize: this.conversionCache.size,
            elementCacheSize: this.elementCache.size,
            currentTime: Date.now(),
            viewportCacheAge: this.viewportCache ? Date.now() - this.viewportCache.timestamp : -1
        };
    }
}

// Export singleton instance
export const performantUnitCache = new PerformantUnitCache(); 