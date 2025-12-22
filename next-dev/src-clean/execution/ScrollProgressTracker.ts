/**
 * @file ScrollProgressTracker.ts
 * @description Converts scroll position to animation progress (0-1) for scrubbed scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * High-performance scroll position tracking that converts scroll position to normalized
 * animation progress (0-1) based on element and viewport boundaries. Uses RAF optimization
 * for smooth 60fps updates and efficient boundary calculations.
 * 
 * Each animation gets its own ScrollProgressTracker instance for complete isolation.
 * 
 * @architecture
 * - RAF-based smooth updates (60fps)
 * - Viewport/element intersection tracking
 * - Boundary normalization with caching
 * - Complete isolation per animation
 * 
 * @example
 * ```typescript
 * const tracker = new ScrollProgressTracker();
 * 
 * const cleanup = tracker.startTracking(
 *   triggerElement,
 *   {
 *     start: { element: { value: "0px" }, viewport: { value: "100vh" } },
 *     end: { element: { value: "100%" }, viewport: { value: "0vh" } }
 *   },
 *   (progress) => {
 *     console.log(`Animation progress: ${progress * 100}%`);
 *   }
 * );
 * 
 * // Later: cleanup();
 * ```
 */

import type { ScrollBoundary } from '../types/ScrollTypes.ts';
import { convertToPixels } from '../utils/units/SimpleUnitConverter.ts';
import { EnvironmentDetector } from '../utils/environment/EnvironmentDetector.ts';
import { unifiedScrollManager } from '../utils/performance/UnifiedScrollManager.ts';

/**
 * Scroll boundaries configuration for progress tracking
 */
export interface ScrollBoundaries {
    /** Animation start boundary */
    start: ScrollBoundary;
    /** Animation end boundary */
    end: ScrollBoundary;
}

/**
 * Boundary cache for performance optimization
 */
interface BoundaryCache {
    startPx: number;
    endPx: number;
    timestamp: number;
    viewportHeight: number;
    elementHeight: number;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * ScrollProgressTracker - High-performance scroll position to progress conversion
 * 
 * @description
 * Simple, isolated progress tracker for a single scroll animation.
 * Each animation gets its own instance for complete isolation and simplicity.
 */
export class ScrollProgressTracker {
    private rafId: number | null = null;
    private isTracking: boolean = false;
    private boundaryCache: BoundaryCache | null = null;
    private lastScrollY: number = 0;
    private lastProgress: number = 0;
    private isCanvasMode: boolean;
    
    // Element-specific tracking
    private scrollElement: HTMLElement | Window | null = null;
    private triggerElement: HTMLElement | null = null;
    private boundaries: ScrollBoundaries | null = null;
    private progressCallback: ProgressCallback | null = null;
    
    // Enhanced boundary caching
    private resizeObserver: ResizeObserver | null = null;
    private debounceTimeout: number | null = null;
    
    // Performance settings
    private static readonly CACHE_DURATION_MS = 2000; // 2 seconds (more aggressive caching)
    private static readonly PROGRESS_EPSILON = 0.0005; // Minimum progress change to trigger callback (used for fast scrolling)
    private static readonly RESIZE_DEBOUNCE_MS = 150; // Debounce resize events
    
    // Unified manager integration
    private unifiedManagerCleanup: (() => void) | null = null;
    private trackingId: string | null = null;
    
    constructor() {
        // Cache environment detection result to avoid repeated calls during scroll
        this.isCanvasMode = EnvironmentDetector.isCanvas();
        
        // console.log('🌊 [ScrollProgressTracker] Instance created');
        
        // if (this.isCanvasMode) {
        //     console.log('🎨 [ScrollProgressTracker] Canvas mode detected - tracking disabled');
        // }
    }
    
    /**
     * Find the scrollable container for the trigger element
     */
    private findScrollableContainer(element: HTMLElement): HTMLElement | Window {
        let current: HTMLElement | null = element;
        
        while (current && current !== document.body) {
            const computedStyle = window.getComputedStyle(current);
            const overflowY = computedStyle.overflowY;
            const overflowX = computedStyle.overflowX;
            
            // Check if element is scrollable
            if (overflowY === 'scroll' || overflowY === 'auto' || overflowX === 'scroll' || overflowX === 'auto') {
                // Check if element actually has scrollable content
                if (current.scrollHeight > current.clientHeight || current.scrollWidth > current.clientWidth) {
                    // console.log(`🎯 [ScrollProgressTracker] Found scrollable container:`, {
                    //     element: current.tagName,
                    //     id: current.id,
                    //     className: current.className,
                    //     scrollHeight: current.scrollHeight,
                    //     clientHeight: current.clientHeight,
                    //     overflowY: overflowY
                    // });
                    return current;
                }
            }
            
            current = current.parentElement;
        }
        
        // Fallback to window if no scrollable container found (most common case)
        //console.log(`🎯 [ScrollProgressTracker] No scrollable container found, using window`);
        return window;
    }
    
    /**
     * Get current scroll position from the correct scroll container
     */
    private getCurrentScrollY(): number {
        if (!this.scrollElement) {
            return 0;
        }
        
        if (this.scrollElement === window) {
            return window.scrollY || 0;
        } else {
            return (this.scrollElement as HTMLElement).scrollTop || 0;
        }
    }
    
    /**
     * Get the scroll container's dimensions and position
     */
    private getScrollContainerInfo(): { 
        scrollTop: number; 
        containerHeight: number; 
        containerTop: number; 
        isWindow: boolean;
    } {
        if (!this.scrollElement) {
            return { scrollTop: 0, containerHeight: window.innerHeight, containerTop: 0, isWindow: true };
        }
        
        if (this.scrollElement === window) {
            return { 
                scrollTop: window.scrollY || 0, 
                containerHeight: window.innerHeight, 
                containerTop: 0, 
                isWindow: true 
            };
        } else {
            const element = this.scrollElement as HTMLElement;
            const rect = element.getBoundingClientRect();
            return { 
                scrollTop: element.scrollTop || 0, 
                containerHeight: element.clientHeight, 
                containerTop: rect.top + (window.scrollY || 0), 
                isWindow: false 
            };
        }
    }
    
    /**
     * Start tracking scroll progress for a trigger element
     * 
     * @param triggerElement - Element to track scroll progress for
     * @param boundaries - Start and end boundaries for progress calculation
     * @param progressCallback - Callback fired when progress changes
     * @returns Cleanup function to stop tracking
     */
    startTracking(
        triggerElement: HTMLElement,
        boundaries: ScrollBoundaries,
        progressCallback: ProgressCallback
    ): () => void {
        // Skip in Canvas mode
        if (this.isCanvasMode) {
            //console.log(`🎨 [ScrollProgressTracker] Tracking disabled in Canvas mode`);
            return () => {};
        }
        
        // Stop any existing tracking
        this.stopTracking();
        
        // Store references
        this.triggerElement = triggerElement;
        this.boundaries = boundaries;
        this.progressCallback = progressCallback;
        this.isTracking = true;
        
        // Generate unique tracking ID
        // 🎯 ENHANCED ID GENERATION: Prevent conflicts between multiple scroll trackers
        const microTimestamp = performance.now().toString().replace('.', '_');
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        const elementId = triggerElement.id || triggerElement.getAttribute('data-fame-element-id') || 'unknown';
        this.trackingId = `scroll-progress-${Date.now()}-${microTimestamp}-${elementId}-${randomSuffix}`;
        
        //console.log(`🌊 [ScrollProgressTracker] Generated unique tracking ID: ${this.trackingId}`);
        
        // Find the correct scroll container for this trigger element
        this.scrollElement = this.findScrollableContainer(triggerElement);
        
        // Register with unified manager (medium priority for progress tracking)
        const scrollUpdateHandler = () => {
            if (this.isTracking && this.rafId === null) {
                this.rafId = requestAnimationFrame(() => {
                    this.rafId = null;
                    if (this.isTracking) {
                        this.updateProgress();
                    }
                });
            }
        };
        
        // Register with unified manager (medium priority for progress tracking)
        this.unifiedManagerCleanup = unifiedScrollManager.registerAnimation(
            this.trackingId,
            scrollUpdateHandler,
            'medium' // Medium priority for progress tracking
        );
        
        // Set up intelligent cache invalidation on resize
        this.setupResizeObserver();
        
        // Initial progress calculation
        this.updateProgress();
        
        // Log optimization info
        //console.log(`🚀 [ScrollProgressTracker] Registered with UnifiedScrollManager: ${this.trackingId}`);
        
        return () => this.stopTracking();
    }
    
    /**
     * Stop tracking scroll progress
     */
    stopTracking(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // Clean up from unified manager instead of individual listener
        if (this.unifiedManagerCleanup) {
            this.unifiedManagerCleanup();
            this.unifiedManagerCleanup = null;
        }
        
        this.isTracking = false;
        this.scrollElement = null;
        this.triggerElement = null;
        this.boundaries = null;
        this.progressCallback = null;
        this.boundaryCache = null;
        this.trackingId = null;
        
        // Clean up resize observer
        this.cleanupResizeObserver();
        
        //console.log(`🌊 [ScrollProgressTracker] Stopped tracking`);
    }
    
    /**
     * Update progress calculation
     */
    private updateProgress(): void {
        if (!this.triggerElement || !this.boundaries || !this.progressCallback) {
            return;
        }
        
        const currentScrollY = this.getCurrentScrollY();
        
        // Skip if scroll hasn't changed enough (reduced threshold for smoother large animations)
        if (Math.abs(currentScrollY - this.lastScrollY) < 0.1) {
            return;
        }
        
        this.lastScrollY = currentScrollY;
        
        // Calculate current progress
        const progress = this.calculateProgress();
        
        // Skip if progress hasn't changed enough
        if (Math.abs(progress - this.lastProgress) < ScrollProgressTracker.PROGRESS_EPSILON) {
            return;
        }
        
        this.lastProgress = progress;
        this.progressCallback(progress);
    }
    
    /**
     * Calculate progress (0-1) based on scroll position and boundaries
     */
    private calculateProgress(): number {
        if (!this.triggerElement || !this.boundaries) {
            return 0;
        }
        
        // Get or calculate boundary positions
        const { startPx, endPx } = this.getBoundaryPositions();
        
        // Current viewport scroll position
        const currentScrollY = this.getCurrentScrollY();
        
        // Calculate progress
        const totalDistance = endPx - startPx;
        
        if (totalDistance <= 0) {
            console.warn(`🌊 [ScrollProgressTracker] Invalid boundary distance: ${totalDistance}`);
            return 0;
        }
        
        const scrollDistance = currentScrollY - startPx;
        const progress = scrollDistance / totalDistance;
        
        // Clamp progress to 0-1 range
        return Math.max(0, Math.min(1, progress));
    }
    
    /**
     * Get boundary positions in pixels (with caching)
     */
    private getBoundaryPositions(): { startPx: number; endPx: number } {
        if (!this.triggerElement || !this.boundaries) {
            return { startPx: 0, endPx: 0 };
        }
        
        // Check cache validity
        if (this.isCacheValid()) {
            return {
                startPx: this.boundaryCache!.startPx,
                endPx: this.boundaryCache!.endPx
            };
        }
        
        // Calculate fresh boundary positions
        const startPx = this.calculateBoundaryPosition(this.boundaries.start);
        const endPx = this.calculateBoundaryPosition(this.boundaries.end);
        
        // Cache the results
        this.boundaryCache = {
            startPx,
            endPx,
            timestamp: Date.now(),
            viewportHeight: window.innerHeight,
            elementHeight: this.triggerElement.offsetHeight
        };
        
        return { startPx, endPx };
    }
    
    /**
     * Calculate absolute pixel position for a boundary
     */
    private calculateBoundaryPosition(boundary: ScrollBoundary): number {
        if (!this.triggerElement) {
            return 0;
        }
        
        // Get scroll container information
        const scrollContainerInfo = this.getScrollContainerInfo();
        
        // Get element position relative to the scroll container
        const elementRect = this.triggerElement.getBoundingClientRect();
        
        // Calculate element top relative to scroll container
        let elementTop: number;
        if (scrollContainerInfo.isWindow) {
            // For window scrolling, use standard calculation
            elementTop = elementRect.top + scrollContainerInfo.scrollTop;
        } else {
            // For element scrolling, calculate relative to the scroll container
            elementTop = elementRect.top + scrollContainerInfo.scrollTop - scrollContainerInfo.containerTop;
        }
        
        // Convert element position to pixels
        const elementOffsetPx = this.convertToPixels(
            boundary.element.value,
            this.triggerElement.offsetHeight
        );
        
        // Convert viewport position to pixels (relative to scroll container)
        const viewportOffsetPx = this.convertToPixels(
            boundary.viewport.value,
            scrollContainerInfo.containerHeight
        );
        
        // Calculate absolute position within the scroll container
        const absolutePosition = elementTop + elementOffsetPx - viewportOffsetPx;
        
        return absolutePosition;
    }
    
    /**
     * Helper method to interpret what a boundary configuration means
     */
    private interpretBoundaryMeaning(boundary: ScrollBoundary): string {
        const elementDesc = boundary.element.value === "0%" ? "top" : 
                          boundary.element.value === "50%" ? "center" : 
                          boundary.element.value === "100%" ? "bottom" : boundary.element.value;
        
        const viewportDesc = boundary.viewport.value === "0%" ? "top" : 
                           boundary.viewport.value === "50%" ? "center" : 
                           boundary.viewport.value === "100%" ? "bottom" : boundary.viewport.value;
        
        return `Element ${elementDesc} meets viewport ${viewportDesc}`;
    }
    
    /**
     * Convert CSS value to pixels
     */
    private convertToPixels(value: string, referenceSize: number): number {
        try {
            // Handle different unit types
            if (value.endsWith('px')) {
                return parseFloat(value);
            } else if (value.endsWith('%')) {
                const percentage = parseFloat(value) / 100;
                return percentage * referenceSize;
            } else if (value.endsWith('vh')) {
                const percentage = parseFloat(value) / 100;
                return percentage * window.innerHeight;
            } else if (value.endsWith('vw')) {
                const percentage = parseFloat(value) / 100;
                return percentage * window.innerWidth;
            } else {
                // Use convertToPixels for other units (rem, em, etc.)
                return convertToPixels(value, document.documentElement, 'width');
            }
        } catch (error) {
            console.warn(`🌊 [ScrollProgressTracker] Error converting value "${value}" to pixels:`, error);
            return 0;
        }
    }
    
    /**
     * Check if boundary cache is still valid
     */
    private isCacheValid(): boolean {
        if (!this.boundaryCache || !this.triggerElement) return false;
        
        const now = Date.now();
        const cacheAge = now - this.boundaryCache.timestamp;
        
        // Check cache expiration
        if (cacheAge > ScrollProgressTracker.CACHE_DURATION_MS) {
            return false;
        }
        
        // Check if viewport or element dimensions changed
        const currentViewportHeight = window.innerHeight;
        const currentElementHeight = this.triggerElement.offsetHeight;
        
        if (
            currentViewportHeight !== this.boundaryCache.viewportHeight ||
            currentElementHeight !== this.boundaryCache.elementHeight
        ) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get current progress without starting tracking (for debugging)
     */
    getCurrentProgress(
        triggerElement: HTMLElement,
        boundaries: ScrollBoundaries
    ): number {
        // Temporarily set up for calculation
        const originalTriggerElement = this.triggerElement;
        const originalBoundaries = this.boundaries;
        
        this.triggerElement = triggerElement;
        this.boundaries = boundaries;
        this.scrollElement = this.findScrollableContainer(triggerElement);
        
        const progress = this.calculateProgress();
        
        // Restore original state
        this.triggerElement = originalTriggerElement;
        this.boundaries = originalBoundaries;
        
        return progress;
    }
    
    /**
     * Check if currently tracking
     */
    isCurrentlyTracking(): boolean {
        return this.isTracking;
    }
    
    /**
     * Set up ResizeObserver for intelligent cache invalidation
     * 
     * @description
     * Uses ResizeObserver to efficiently detect when the trigger element
     * or viewport changes size, allowing us to invalidate the cache only
     * when necessary instead of using aggressive time-based expiration.
     */
    private setupResizeObserver(): void {
        if (!this.triggerElement || !('ResizeObserver' in window)) {
            //console.log(`🌊 [ScrollProgressTracker] ResizeObserver not available, using time-based cache invalidation`);
            return;
        }
        
        // Clean up existing observer
        this.cleanupResizeObserver();
        
        this.resizeObserver = new ResizeObserver((entries) => {
            // Debounce resize events to avoid excessive cache invalidation
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }
            
            this.debounceTimeout = window.setTimeout(() => {
               // console.log(`🌊 [ScrollProgressTracker] Element resize detected, invalidating boundary cache`);
                this.boundaryCache = null; // Invalidate cache
                this.debounceTimeout = null;
            }, ScrollProgressTracker.RESIZE_DEBOUNCE_MS);
        });
        
        // Observe the trigger element for size changes
        this.resizeObserver.observe(this.triggerElement);
        
        //console.log(`🌊 [ScrollProgressTracker] ResizeObserver set up for intelligent cache invalidation`);
    }
    
    /**
     * Clean up ResizeObserver and debounce timeout
     */
    private cleanupResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }
    }
}

/**
 * Shared instance for backward compatibility (but prefer individual instances)
 */
export const scrollProgressTracker = new ScrollProgressTracker(); 