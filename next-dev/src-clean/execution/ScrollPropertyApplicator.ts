/**
 * @file ScrollPropertyApplicator.ts
 * @description High-performance property application for scrubbed scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Specialized property applicator optimized for scroll-based animations.
 * Applies properties directly without tweening for smooth 60fps scroll performance.
 * Uses GPU acceleration, batching, and efficient DOM updates.
 * 
 * @architecture
 * - Direct style application (no tweening)
 * - GPU acceleration optimization
 * - Batched DOM updates for performance
 * - Efficient property grouping and application
 * - Intelligent will-change management
 * 
 * @example
 * ```typescript
 * const applicator = new ScrollPropertyApplicator();
 * 
 * // Apply properties directly at scroll position
 * applicator.applyPropertiesAtProgress(
 *   element,
 *   propertyValues,
 *   0.5, // 50% scroll progress
 *   true // Enable GPU acceleration
 * );
 * 
 * // Batch apply to multiple elements
 * applicator.batchApply([
 *   { element: el1, properties: values1 },
 *   { element: el2, properties: values2 }
 * ]);
 * ```
 */

import { applyProperty, enableGPUAcceleration, cleanupStyles } from './StyleApplicator.ts';
import { EnvironmentDetector } from '../utils/environment/EnvironmentDetector.ts';

/**
 * Property application batch for efficient DOM updates
 */
export interface PropertyBatch {
    /** Element to apply properties to */
    element: HTMLElement;
    /** Property values to apply */
    properties: Map<string, any>;
    /** Whether to enable GPU acceleration for this element */
    enableGPU?: boolean;
}

/**
 * Performance metrics for scroll property application
 */
interface PerformanceMetrics {
    /** Total number of properties applied */
    totalApplications: number;
    /** Average time per property application */
    averageApplicationTime: number;
    /** Number of batched operations */
    batchedOperations: number;
    /** Elements with GPU acceleration enabled */
    gpuAcceleratedElements: number;
    /** Last reset timestamp */
    lastResetTime: number;
}

/**
 * Optimization configuration for scroll property application
 */
export interface ScrollApplicationConfig {
    /** Enable GPU acceleration hints */
    enableGPUAcceleration: boolean;
    /** Maximum properties to apply per frame */
    maxPropertiesPerFrame: number;
    /** Enable batched DOM updates */
    enableBatching: boolean;
    /** Debounce time for will-change management (ms) */
    willChangeDebounceTime: number;
    /** Enable performance monitoring */
    enablePerformanceTracking: boolean;
}

/**
 * ScrollPropertyApplicator - High-performance property application for scroll animations
 * 
 * @description
 * Specialized for scroll-based animations where properties need to be applied
 * directly at specific scroll positions without tweening. Optimized for 60fps
 * performance with GPU acceleration and batched DOM updates.
 */
export class ScrollPropertyApplicator {
    private performanceMetrics: PerformanceMetrics;
    private config: ScrollApplicationConfig;
    private pendingApplications: PropertyBatch[] = [];
    private batchFlushId: number | null = null;
    private gpuAcceleratedElements = new Set<HTMLElement>();
    private willChangeTimeouts = new Map<HTMLElement, number>();
    private isCanvasMode: boolean;
    
    constructor(config: Partial<ScrollApplicationConfig> = {}) {
        this.config = {
            enableGPUAcceleration: true,
            maxPropertiesPerFrame: 50,
            enableBatching: true,
            willChangeDebounceTime: 100,
            enablePerformanceTracking: false,
            ...config
        };
        
        this.performanceMetrics = {
            totalApplications: 0,
            averageApplicationTime: 0,
            batchedOperations: 0,
            gpuAcceleratedElements: 0,
            lastResetTime: Date.now()
        };
        
        // Cache environment detection result to avoid repeated calls during scroll
        this.isCanvasMode = EnvironmentDetector.isCanvas();
        
        console.log('📋 [ScrollPropertyApplicator] Initialized with config:', this.config);
        
        // Skip further initialization in Canvas mode
        if (this.isCanvasMode) {
            console.log('🎨 [ScrollPropertyApplicator] Canvas mode detected - optimizations disabled');
        }
    }
    
    /**
     * Apply properties to an element at specific scroll progress
     * 
     * @param element - Element to apply properties to
     * @param propertyValues - Map of property names to values
     * @param scrollProgress - Current scroll progress (0-1)
     * @param enableGPU - Whether to enable GPU acceleration
     */
    applyPropertiesAtProgress(
        element: HTMLElement,
        propertyValues: Map<string, any>,
        scrollProgress: number,
        enableGPU: boolean = true
    ): void {
        if (!element || !propertyValues || propertyValues.size === 0) {
            return;
        }
        

        
        const startTime = this.config.enablePerformanceTracking ? performance.now() : 0;
        
        // Enable GPU acceleration if configured
        if (enableGPU && this.config.enableGPUAcceleration && !this.isCanvasMode) {
            this.enableGPUAccelerationForElement(element);
        }
        
        // Apply properties directly (no tweening)
        this.applyPropertiesDirectly(element, propertyValues);
        
        // Track performance
        if (this.config.enablePerformanceTracking) {
            this.updatePerformanceMetrics(performance.now() - startTime, propertyValues.size);
        }
    }
    
    /**
     * Apply properties directly to an element (optimized for scroll)
     */
    private applyPropertiesDirectly(element: HTMLElement, propertyValues: Map<string, any>): void {
        // Group properties by type for optimized application
        const transforms = new Map<string, any>();
        const styles = new Map<string, any>();
        
        // Separate transforms from regular styles
        for (const [property, value] of propertyValues.entries()) {
            if (this.isTransformProperty(property)) {
                transforms.set(property, value);
            } else {
                styles.set(property, value);
            }
        }
        
        // Apply transforms as a group for better performance
        if (transforms.size > 0) {
            this.applyTransformGroup(element, transforms);
        }
        
        // Apply regular styles
        if (styles.size > 0) {
            this.applyStyleGroup(element, styles);
        }
    }
    
    /**
     * Apply transform properties as a group
     */
    private applyTransformGroup(element: HTMLElement, transforms: Map<string, any>): void {
        // Apply each transform property individually
        // The existing applyProperty function will handle transform combination
        for (const [property, value] of transforms.entries()) {
            applyProperty(element, property, value);
        }
    }
    
    /**
     * Apply style properties as a group
     */
    private applyStyleGroup(element: HTMLElement, styles: Map<string, any>): void {
        // Apply each style property
        for (const [property, value] of styles.entries()) {
            applyProperty(element, property, value);
        }
    }
    
    /**
     * Batch apply properties to multiple elements
     * 
     * @param batches - Array of property batches to apply
     */
    batchApply(batches: PropertyBatch[]): void {
        if (!this.config.enableBatching || batches.length === 0) {
            // Apply immediately if batching is disabled
            batches.forEach(batch => {
                this.applyPropertiesAtProgress(
                    batch.element,
                    batch.properties,
                    0, // Progress not needed for direct application
                    batch.enableGPU ?? true
                );
            });
            return;
        }
        
        // Add to pending applications
        this.pendingApplications.push(...batches);
        
        // Schedule batch flush if not already scheduled
        if (this.batchFlushId === null) {
            this.batchFlushId = requestAnimationFrame(() => this.flushBatch());
        }
    }
    
    /**
     * Flush pending batch applications
     */
    private flushBatch(): void {
        if (this.pendingApplications.length === 0) {
            this.batchFlushId = null;
            return;
        }
        
        const startTime = this.config.enablePerformanceTracking ? performance.now() : 0;
        let appliedCount = 0;
        
        // Apply up to maxPropertiesPerFrame properties
        while (this.pendingApplications.length > 0 && appliedCount < this.config.maxPropertiesPerFrame) {
            const batch = this.pendingApplications.shift()!;
            
            this.applyPropertiesAtProgress(
                batch.element,
                batch.properties,
                0,
                batch.enableGPU ?? true
            );
            
            appliedCount += batch.properties.size;
        }
        
        // Track batch performance
        if (this.config.enablePerformanceTracking) {
            this.performanceMetrics.batchedOperations++;
            this.updatePerformanceMetrics(performance.now() - startTime, appliedCount);
        }
        
        // Schedule next batch if more applications are pending
        if (this.pendingApplications.length > 0) {
            this.batchFlushId = requestAnimationFrame(() => this.flushBatch());
        } else {
            this.batchFlushId = null;
        }
    }
    
    /**
     * Enable GPU acceleration for an element
     */
    private enableGPUAccelerationForElement(element: HTMLElement): void {
        if (this.gpuAcceleratedElements.has(element)) {
            return; // Already enabled
        }
        
        enableGPUAcceleration(element);
        this.gpuAcceleratedElements.add(element);
        
        // Schedule will-change cleanup
        this.scheduleWillChangeCleanup(element);
        
        if (this.config.enablePerformanceTracking) {
            this.performanceMetrics.gpuAcceleratedElements++;
        }
    }
    
    /**
     * Schedule will-change cleanup for an element
     */
    private scheduleWillChangeCleanup(element: HTMLElement): void {
        // Clear existing timeout
        const existingTimeout = this.willChangeTimeouts.get(element);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        
        // Schedule new cleanup
        const timeoutId = window.setTimeout(() => {
            this.cleanupWillChange(element);
        }, this.config.willChangeDebounceTime);
        
        this.willChangeTimeouts.set(element, timeoutId);
    }
    
    /**
     * Clean up will-change property for an element
     */
    private cleanupWillChange(element: HTMLElement): void {
        if (element.style.willChange) {
            element.style.willChange = '';
        }
        
        this.gpuAcceleratedElements.delete(element);
        this.willChangeTimeouts.delete(element);
    }
    
    /**
     * Check if a property is a transform property
     */
    private isTransformProperty(property: string): boolean {
        return [
            'translateX', 'translateY', 'translateZ',
            'scale', 'scaleX', 'scaleY', 'scaleZ',
            'rotate', 'rotateX', 'rotateY', 'rotateZ',
            'skewX', 'skewY'
        ].includes(property);
    }
    
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics(executionTime: number, propertyCount: number): void {
        this.performanceMetrics.totalApplications += propertyCount;
        
        // Calculate running average
        const totalTime = this.performanceMetrics.averageApplicationTime * (this.performanceMetrics.totalApplications - propertyCount);
        this.performanceMetrics.averageApplicationTime = 
            (totalTime + executionTime) / this.performanceMetrics.totalApplications;
    }
    
    /**
     * Apply properties using existing timeline values
     * 
     * @param element - Element to apply properties to
     * @param timelineValues - Values from TimelineScrollMapper
     * @param scrollProgress - Current scroll progress
     */
    applyTimelineValues(
        element: HTMLElement,
        timelineValues: Map<string, any>,
        scrollProgress: number
    ): void {
        this.applyPropertiesAtProgress(element, timelineValues, scrollProgress, true);
    }
    
    /**
     * Clean up all optimizations for an element
     * 
     * @param element - Element to clean up
     */
    cleanup(element: HTMLElement): void {
        // Clean up styles
        cleanupStyles(element);
        
        // Clean up GPU acceleration
        this.cleanupWillChange(element);
        
        // Remove from pending applications
        this.pendingApplications = this.pendingApplications.filter(batch => batch.element !== element);
        
        console.log('📋 [ScrollPropertyApplicator] Cleaned up element:', element.tagName);
    }
    
    /**
     * Clean up all resources
     */
    destroy(): void {
        // Cancel pending batch flush
        if (this.batchFlushId !== null) {
            cancelAnimationFrame(this.batchFlushId);
            this.batchFlushId = null;
        }
        
        // Clean up all will-change timeouts
        this.willChangeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.willChangeTimeouts.clear();
        
        // Clean up GPU acceleration for all elements
        this.gpuAcceleratedElements.forEach(element => {
            this.cleanupWillChange(element);
        });
        this.gpuAcceleratedElements.clear();
        
        // Clear pending applications
        this.pendingApplications = [];
        
        console.log('📋 [ScrollPropertyApplicator] Destroyed and cleaned up all resources');
    }
    
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics(): void {
        this.performanceMetrics = {
            totalApplications: 0,
            averageApplicationTime: 0,
            batchedOperations: 0,
            gpuAcceleratedElements: this.gpuAcceleratedElements.size,
            lastResetTime: Date.now()
        };
        
        console.log('📋 [ScrollPropertyApplicator] Performance metrics reset');
    }
    
    /**
     * Check if batching is enabled and has pending applications
     */
    hasPendingApplications(): boolean {
        return this.pendingApplications.length > 0;
    }
    
    /**
     * Force flush any pending applications
     */
    forceFlush(): void {
        if (this.batchFlushId !== null) {
            cancelAnimationFrame(this.batchFlushId);
            this.batchFlushId = null;
        }
        
        this.flushBatch();
    }
}

/**
 * Shared instance for performance optimization
 */
export const scrollPropertyApplicator = new ScrollPropertyApplicator(); 