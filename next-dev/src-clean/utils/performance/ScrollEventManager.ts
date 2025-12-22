/**
 * @file ScrollEventManager.ts
 * @description ❌ DEPRECATED: Use UnifiedScrollManager instead
 * 
 * @deprecated This class is deprecated in favor of UnifiedScrollManager
 * @version 1.0.0 - DEPRECATED
 * @since 1.0.0
 * 
 * @description
 * ❌ DEPRECATED: This scroll event manager has been superseded by UnifiedScrollManager
 * which provides better performance, coordination, and frame budgeting.
 * 
 * **Migration Guide:**
 * ```typescript
 * // OLD (deprecated):
 * const manager = ScrollEventManager.getInstance();
 * const unsubscribe = manager.subscribe((scrollY, deltaY) => {
 *   // Handle scroll event
 * });
 * 
 * // NEW (recommended):
 * import { unifiedScrollManager } from './UnifiedScrollManager.ts';
 * const cleanup = unifiedScrollManager.registerAnimation('my-scroll', () => {
 *   // Handle scroll event - more efficient
 * }, 'medium');
 * ```
 * 
 * @performance
 * - ❌ Creates competing scroll listeners with UnifiedScrollManager
 * - ❌ No coordination with other scroll animations
 * - ❌ Can cause performance degradation with multiple triggers
 * 
 * **This class is maintained only for performance monitoring tools.**
 * **All new code should use UnifiedScrollManager.**
 */

import { EnvironmentDetector } from '../environment/EnvironmentDetector.ts';

/**
 * Scroll event callback function type
 */
export type ScrollCallback = (scrollY: number, deltaY: number, timestamp: number) => void;

/**
 * Scroll event subscription
 */
interface ScrollSubscription {
    id: string;
    callback: ScrollCallback;
    priority: number;
    lastCalled: number;
    throttleMs?: number;
}

/**
 * Configuration for scroll event manager
 */
interface ScrollEventConfig {
    /** Enable RAF throttling for 60fps performance */
    enableRAFThrottling: boolean;
    /** Maximum callbacks processed per frame */
    maxCallbacksPerFrame: number;
    /** Enable performance tracking */
    enableTracking: boolean;
    /** Passive event listener flag */
    usePassiveListeners: boolean;
}

/**
 * Performance metrics for scroll event handling
 */
interface ScrollEventMetrics {
    totalEvents: number;
    totalCallbacks: number;
    averageCallbackTime: number;
    droppedFrames: number;
    activeSubscriptions: number;
}

/**
 * ❌ DEPRECATED: Unified scroll event manager
 * 
 * @deprecated Use UnifiedScrollManager instead for better performance and coordination
 * @description
 * This class creates competing scroll listeners and can cause performance issues.
 * Use UnifiedScrollManager.registerAnimation() for new code.
 */
export class ScrollEventManager {
    private static instance: ScrollEventManager | null = null;
    
    private subscriptions = new Map<string, ScrollSubscription>();
    private subscriptionCounter = 0;
    private config: ScrollEventConfig;
    private metrics: ScrollEventMetrics;
    
    // Scroll state tracking
    private isListening = false;
    private lastScrollY = 0;
    private rafId: number | null = null;
    private scrollListener: ((event: Event) => void) | null = null;
    private pendingCallbacks: ScrollSubscription[] = [];
    
    // Performance tracking
    private lastFrameTime = 0;
    private isCanvasMode: boolean;
    
    private constructor(config: Partial<ScrollEventConfig> = {}) {
        // Show deprecation warning
        console.warn('❌ [ScrollEventManager] DEPRECATED: Use UnifiedScrollManager instead for better performance');
        console.warn('Migration: unifiedScrollManager.registerAnimation() replaces scrollEventManager.subscribe()');
        
        this.config = {
            enableRAFThrottling: true,
            maxCallbacksPerFrame: 20, // Reasonable limit for 60fps
            enableTracking: true,
            usePassiveListeners: true,
            ...config
        };
        
        this.metrics = {
            totalEvents: 0,
            totalCallbacks: 0,
            averageCallbackTime: 0,
            droppedFrames: 0,
            activeSubscriptions: 0
        };
        
        // Cache environment detection
        this.isCanvasMode = EnvironmentDetector.isCanvas();
        
        console.log('🎛️ [ScrollEventManager] Initialized with config:', this.config);
        
        if (this.isCanvasMode) {
            console.log('🎨 [ScrollEventManager] Canvas mode detected - scroll handling disabled');
        }
    }
    
    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<ScrollEventConfig>): ScrollEventManager {
        if (!ScrollEventManager.instance) {
            ScrollEventManager.instance = new ScrollEventManager(config);
        }
        return ScrollEventManager.instance;
    }
    
    /**
     * Subscribe to scroll events
     * 
     * @param callback - Function to call on scroll events
     * @param priority - Higher priority callbacks are processed first (default: 0)
     * @param throttleMs - Optional per-callback throttling in milliseconds
     * @returns Unsubscribe function
     */
    subscribe(
        callback: ScrollCallback,
        priority: number = 0,
        throttleMs?: number
    ): () => void {
        if (this.isCanvasMode) {
            console.log('🎨 [ScrollEventManager] Scroll subscription disabled in Canvas mode');
            return () => {};
        }
        
        const id = `scroll-${++this.subscriptionCounter}`;
        const subscription: ScrollSubscription = {
            id,
            callback,
            priority,
            lastCalled: 0,
            throttleMs
        };
        
        this.subscriptions.set(id, subscription);
        this.metrics.activeSubscriptions = this.subscriptions.size;
        
        // Start listening if this is the first subscription
        if (!this.isListening) {
            this.startListening();
        }
        
        console.log(`🎛️ [ScrollEventManager] Subscription added: ${id} (${this.subscriptions.size} total)`);
        
        // Return unsubscribe function
        return () => {
            this.unsubscribe(id);
        };
    }
    
    /**
     * Unsubscribe from scroll events
     */
    private unsubscribe(id: string): void {
        const removed = this.subscriptions.delete(id);
        if (removed) {
            this.metrics.activeSubscriptions = this.subscriptions.size;
            console.log(`🎛️ [ScrollEventManager] Subscription removed: ${id} (${this.subscriptions.size} total)`);
            
            // Stop listening if no more subscriptions
            if (this.subscriptions.size === 0) {
                this.stopListening();
            }
        }
    }
    
    /**
     * Start the global scroll event listener
     */
    private startListening(): void {
        if (this.isListening || this.isCanvasMode) {
            return;
        }
        
        this.lastScrollY = window.scrollY || 0;
        this.isListening = true;
        
        // Create scroll event listener
        this.scrollListener = (event: Event) => {
            this.handleScrollEvent();
        };
        
        // Add global scroll listener
        window.addEventListener('scroll', this.scrollListener, {
            passive: this.config.usePassiveListeners
        });
        
        console.log('🎛️ [ScrollEventManager] Started global scroll listening');
    }
    
    /**
     * Stop the global scroll event listener
     */
    private stopListening(): void {
        if (!this.isListening) {
            return;
        }
        
        // Remove scroll listener
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        
        // Cancel pending RAF
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        this.isListening = false;
        this.pendingCallbacks = [];
        
        console.log('🎛️ [ScrollEventManager] Stopped global scroll listening');
    }
    
    /**
     * Handle raw scroll event
     */
    private handleScrollEvent(): void {
        const currentScrollY = window.scrollY || 0;
        const deltaY = currentScrollY - this.lastScrollY;
        
        this.lastScrollY = currentScrollY;
        this.metrics.totalEvents++;
        
        if (this.config.enableRAFThrottling) {
            // RAF-throttled processing for smooth 60fps
            if (this.rafId === null) {
                this.rafId = requestAnimationFrame(() => {
                    this.processScrollCallbacks(currentScrollY, deltaY);
                    this.rafId = null;
                });
            }
        } else {
            // Immediate processing (less smooth but lower latency)
            this.processScrollCallbacks(currentScrollY, deltaY);
        }
    }
    
    /**
     * Process all registered scroll callbacks
     */
    private processScrollCallbacks(scrollY: number, deltaY: number): void {
        const timestamp = performance.now();
        const frameStartTime = timestamp;
        
        // Check for dropped frames
        if (this.lastFrameTime > 0) {
            const frameDelta = timestamp - this.lastFrameTime;
            if (frameDelta > 20) { // More than ~50fps
                this.metrics.droppedFrames++;
            }
        }
        this.lastFrameTime = timestamp;
        
        // Sort subscriptions by priority (higher first)
        const sortedSubscriptions = Array.from(this.subscriptions.values())
            .sort((a, b) => b.priority - a.priority);
        
        let processedCallbacks = 0;
        
        for (const subscription of sortedSubscriptions) {
            // Respect max callbacks per frame limit
            if (processedCallbacks >= this.config.maxCallbacksPerFrame) {
                console.warn(`🎛️ [ScrollEventManager] Frame callback limit reached (${this.config.maxCallbacksPerFrame})`);
                break;
            }
            
            // Check per-callback throttling
            if (subscription.throttleMs) {
                const timeSinceLastCall = timestamp - subscription.lastCalled;
                if (timeSinceLastCall < subscription.throttleMs) {
                    continue; // Skip this callback due to throttling
                }
            }
            
            // Execute callback
            try {
                const callbackStartTime = performance.now();
                subscription.callback(scrollY, deltaY, timestamp);
                subscription.lastCalled = timestamp;
                
                const callbackTime = performance.now() - callbackStartTime;
                this.updateAverageCallbackTime(callbackTime);
                
                processedCallbacks++;
                this.metrics.totalCallbacks++;
                
            } catch (error) {
                console.error(`🎛️ [ScrollEventManager] Error in scroll callback ${subscription.id}:`, error);
            }
        }
        
        const totalFrameTime = performance.now() - frameStartTime;
        
        // Log performance warnings for slow frames
        if (totalFrameTime > 8) { // More than ~8ms for 60fps budget
            console.warn(`🎛️ [ScrollEventManager] Slow scroll frame: ${totalFrameTime.toFixed(2)}ms (${processedCallbacks} callbacks)`);
        }
    }
    
    /**
     * Update average callback time metric
     */
    private updateAverageCallbackTime(callbackTime: number): void {
        if (!this.config.enableTracking) return;
        
        const alpha = 0.1;
        this.metrics.averageCallbackTime = this.metrics.averageCallbackTime * (1 - alpha) + callbackTime * alpha;
    }
    
    /**
     * Force immediate processing of all callbacks (useful for testing)
     */
    forceUpdate(): void {
        if (!this.isListening) return;
        
        const currentScrollY = window.scrollY || 0;
        const deltaY = currentScrollY - this.lastScrollY;
        this.processScrollCallbacks(currentScrollY, deltaY);
    }
    
    /**
     * Get performance metrics
     */
    getMetrics(): ScrollEventMetrics {
        return { ...this.metrics };
    }
    
    /**
     * Reset performance metrics
     */
    resetMetrics(): void {
        this.metrics = {
            totalEvents: 0,
            totalCallbacks: 0,
            averageCallbackTime: 0,
            droppedFrames: 0,
            activeSubscriptions: this.subscriptions.size
        };
    }
    
    /**
     * Get current scroll position (cached for performance)
     */
    getCurrentScrollY(): number {
        return this.lastScrollY;
    }
    
    /**
     * Check if currently listening to scroll events
     */
    isCurrentlyListening(): boolean {
        return this.isListening;
    }
    
    /**
     * Clean up all subscriptions and stop listening (useful for testing)
     */
    destroy(): void {
        this.stopListening();
        this.subscriptions.clear();
        this.metrics.activeSubscriptions = 0;
        ScrollEventManager.instance = null;
        console.log('🎛️ [ScrollEventManager] Destroyed');
    }
}

/**
 * Singleton instance getter
 */
export const scrollEventManager = ScrollEventManager.getInstance(); 