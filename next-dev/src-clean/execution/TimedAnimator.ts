/**
 * FAME Animation System - Timed Animator
 * 
 * @fileOverview Time-based animation execution engine
 * @version 2.0.0-clean
 * @status ACTIVE - Basic implementation for data flow testing
 * 
 * @description
 * Clean implementation of time-based animation execution.
 * Handles requestAnimationFrame-based animations with clean state integration.
 * 
 * 
 * @extraction_targets
 * ✅ Step 1: applyEasing() → utils/easings/EasingFunctions.ts (~26 lines) - COMPLETED ✅
 * ✅ Step 2: captureInitialStyles() + getPropertyValue() → utils/properties/StyleCapture.ts (~54 lines) - COMPLETED ✅
 * ✅ Step 3: interpolateValue() → utils/properties/PropertyInterpolator.ts (~18 lines) - COMPLETED ✅
 * 🎯 Step 4: extractTransformValue() + applyTransformProperty() → utils/properties/TransformUtils.ts (~45 lines)
 * 🎯 Step 5: applyPropertyValue() → enhance execution/StyleApplicator.ts (~10 lines)
 * 
 * Progress: 143/153 lines extracted (93% complete) → Target: focused responsibilities
 * 
 * @reference
 * src-refactored/animations/animators/TimedAnimator.ts (51KB, 1388 lines)
 * - Animation execution patterns
 * - RAF management
 * - Interpolation logic
 * - Cleanup patterns
 * - Performance optimization techniques
 * 
 * @architecture
 * - Uses clean AnimationStateManager for state
 * - Clean type definitions and naming
 * - No direct state management (delegates to StateManager)
 * - Focus on animation execution only
 * - Clean integration with staggering and utilities
 */

import {
    AnimationSlot,
    AnimationProperty,
    PropertyValue,
    AnimationDirection
} from '../types/index.ts';

// Import behavior decision interface for automatic continuation
import { BehaviorDecision } from '../core/state/BehaviorDecisionEngine.ts';

// ✅ PHASE 2 - STEP 1: Import enhanced easing functions with spring support
import { applyEasing, SpringConfig } from '../utils/easings/EasingFunctions.ts';

// ✅ PHASE 2 - STEP 2: Import extracted style capture functions
import { captureInitialStyles, getCurrentPropertyValue } from '../utils/properties/StyleCapture.ts';

// ✅ PHASE 2 - STEP 3: Import extracted property interpolation functions
import { interpolateProperty } from '../utils/properties/PropertyInterpolator.ts';

// ✅ PHASE 2 - STEP 4: Import extracted transform utilities
import { extractTransformValue, applyTransform } from '../utils/properties/TransformUtils.ts';

// ✅ PHASE 2 - STEP 5: Import extracted property application utilities
import { applyProperty } from './StyleApplicator.ts';

// 🔥 DOM DISCONNECTION FIX: Import dynamic element resolution
import { resolveElement, ensureElementId } from '../utils/dom/DynamicElementResolver.ts';

// 🚀 PERFORMANCE OPTIMIZATION TYPES - Essential for 60fps springs!
interface PerformanceConfig {
    targetFPS: number;
    enableFrameBudgeting: boolean;
    maxFrameTime: number; // Maximum time per frame in ms
    debugPerformance: boolean;
}

interface PerformanceMetrics {
    frameTime: number;
    lastFrameTimestamp: number;
    averageFrameTime: number;
    droppedFrames: number;
    totalFrames: number;
    isPerformanceOptimal: boolean;
}

interface AnimationFrame {
    animationId: string;
    callback: (timestamp: number) => void;
    priority: 'high' | 'medium' | 'low';
    lastExecutionTime: number;
}

// Simple animation state interface
interface RunningAnimation {
    id: string;
    elementId: string; // 🔥 DOM DISCONNECTION FIX: Store element ID instead of direct reference
    slot: AnimationSlot;
    startTime: number;
    duration: number;
    isActive: boolean;
    rafId?: number;
    // Modern directional animation properties
    startProgress: number;
    endProgress: number;
    progressCallback?: (progress: number) => void;
    // NEW: Behavior decision for automatic completion handling
    behaviorDecision?: BehaviorDecision;
    // NEW: State manager reference for automatic continuation
    stateManager?: any; // Will be passed as reference
}

export class TimedAnimator {
    private runningAnimations: Map<string, RunningAnimation> = new Map();
    private animationCounter = 0;
    
    // 🚀 60FPS PERFORMANCE OPTIMIZATION SYSTEM - Essential for smooth springs!
    private performanceConfig: PerformanceConfig = {
        targetFPS: 60,
        enableFrameBudgeting: true,
        maxFrameTime: 8, // 8ms budget per frame for 60fps (16.67ms total - 8ms buffer)
        debugPerformance: false // Disable debug by default for production
    };
    
    private performanceMetrics: PerformanceMetrics = {
        frameTime: 0,
        lastFrameTimestamp: 0,
        averageFrameTime: 16.67, // Target ~60fps
        droppedFrames: 0,
        totalFrames: 0,
        isPerformanceOptimal: true
    };
    
    // Enhanced RAF-based animation queue with frame budgeting
    private animationQueue: AnimationFrame[] = [];
    private isProcessingQueue: boolean = false;
    private currentFrameStart: number = 0;

    constructor() {
        // Initialize with 60fps performance optimization for smooth springs
        this.performanceConfig.debugPerformance = false; // Disable debug by default for production
    }
    
    /**
     * Execute a time-based animation with directional control
     * @param slot - Animation configuration
     * @param animatedElement - Element to animate
     * @param startProgress - Starting progress (0.0 to 1.0)
     * @param endProgress - Ending progress (0.0 to 1.0)
     * @param progressCallback - Callback to update external state with progress
     * @param behaviorDecision - Behavior decision for automatic completion handling
     * @param stateManager - State manager reference for automatic continuation
     * @returns Cleanup function
     */
    animate(
        slot: AnimationSlot, 
        animatedElement: HTMLElement, 
        startProgress: number,
        endProgress: number,
        progressCallback?: (progress: number) => void,
        behaviorDecision?: BehaviorDecision,
        stateManager?: any
    ): () => void {
        // 🔥 DOM DISCONNECTION FIX: Ensure element has stable ID for resolution
        const elementId = ensureElementId(animatedElement);
        
        // 🔍 DEBUG: Log TimedAnimator.animate call
        console.log(`🔍 [TIMED-ANIMATOR-DEBUG] animate() called:`, {
            slotId: slot.id,
            elementId,
            element: {
                tagName: animatedElement.tagName,
                className: animatedElement.className,
                textContent: animatedElement.textContent,
                isConnected: animatedElement.isConnected,
                boundingRect: animatedElement.getBoundingClientRect()
            },
            startProgress,
            endProgress,
            duration: slot.timing?.duration || 1000,
            delay: slot.timing?.delay || 0,
            propertiesCount: slot.properties?.length || 0
        });
        
        // Skip animation if start and end are the same
        if (Math.abs(startProgress - endProgress) < 0.001) {
            console.log(`🔍 [TIMED-ANIMATOR-DEBUG] Skipping animation - start and end progress are the same`);
            return () => {}; // Return no-op cleanup
        }
        
        // Create unique animation ID
        const animationId = `animation_${++this.animationCounter}_${Date.now()}`;
        console.log(`🔍 [TIMED-ANIMATOR-DEBUG] Created animation with ID: ${animationId}, elementId: ${elementId}`);
        
        // Get timing configuration
        const duration = slot.timing?.duration || 1000; // Default 1 second
        const delay = slot.timing?.delay || 0;
        
        // Store current styles for reversal capability
        const initialStyles = new Map<string, PropertyValue>();
        
        // Create animation instance
        const animation: RunningAnimation = {
            id: animationId,
            elementId: elementId, // 🔥 DOM DISCONNECTION FIX: Store element ID instead of direct reference
            slot,
            startTime: performance.now(),
            duration: duration,
            isActive: true,
            startProgress,
            endProgress,
            progressCallback,
            behaviorDecision,
            stateManager
        };
        
        // Store animation for tracking
        this.runningAnimations.set(animationId, animation);
        
        // Start the animation loop with high-performance queue
        this.startAnimationLoop(animation, initialStyles);
        
        // Return cleanup function for interruption support
        return () => {
            this.stopAnimation(animationId);
        };
    }
    
    /**
     * Start the animation loop (supports start/end progress and directional animation)
     */
    private startAnimationLoop(animation: RunningAnimation, initialStyles: Map<string, PropertyValue>): void {
        // 🚀 PERFORMANCE: Use high-performance animation queue instead of direct RAF
        const animate = (currentTime: number) => {
            if (!animation.isActive) return;
            
            // 🔥 DOM DISCONNECTION FIX: Resolve element dynamically at animation time
            const currentElement = resolveElement(animation.elementId);
            if (!currentElement) {
                console.warn(`🔍 [TIMED-ANIMATOR-DEBUG] ❌ Element not found for ID: ${animation.elementId}, stopping animation`);
                this.stopAnimation(animation.id);
                return;
            }
            
            // 🚨 CRITICAL TIMING FIX: Track completion per-property instead of global
            let allPropertiesComplete = true;
            
            // Apply animation to each property with INDIVIDUAL timing control
            animation.slot.properties.forEach(prop => {
                // 🎯 CRITICAL FIX: Use property-specific duration, defaulting to slot duration or 1 second
                const propDuration = prop.duration !== undefined ? (prop.duration * 1000) : (animation.slot.timing?.duration || 1000);
                const propDelay = prop.delay !== undefined ? (prop.delay * 1000) : 0;
                
                // Adjust timestamp for property delay
                const adjustedTimestamp = currentTime - propDelay;
                
                // If we're still in the delay period, mark as incomplete and skip this property
                if (adjustedTimestamp < animation.startTime) {
                    allPropertiesComplete = false;
                    return;
                }
                
                // Calculate elapsed time and progress using PROPERTY duration
                const elapsed = adjustedTimestamp - animation.startTime;
                let timeProgress = Math.min(elapsed / propDuration, 1);
                
                // 🎯 DIRECTIONAL ANIMATION: Map time progress to start→end progress range
                const progressRange = animation.endProgress - animation.startProgress;
                const currentProgress = animation.startProgress + (progressRange * timeProgress);
                
                // Time-based progress should be clamped for duration and completion calculation
                const clampedTimeProgress = Math.max(0, Math.min(1, timeProgress));
                
                // If property is still animating (time-wise), mark as incomplete
                if (clampedTimeProgress < 1) {
                    allPropertiesComplete = false;
                }
                
                // 🎯 DIRECTIONAL VALUES: Calculate from/to based on progress direction
                const isReverse = animation.endProgress < animation.startProgress;
                const fromValue = prop.from !== undefined ? prop.from : initialStyles.get(prop.property) || 0;
                const toValue = prop.to;
                
                // Use easing on the time progress, not the directional progress
                const easingType = prop.easing || animation.slot.timing?.easing || 'cubic.inout';
                
                // Extract spring config from multiple sources with priority order
                const springConfig = this.extractSpringConfigForProperty(prop, animation.slot, easingType);
                
                // Apply easing to time progress
                const easedTimeProgress = applyEasing(clampedTimeProgress, easingType, springConfig);
                
                // Map eased time progress to start→end progress range
                const easedCurrentProgress = animation.startProgress + (progressRange * easedTimeProgress);
                
                // Interpolate between from and to values using the eased current progress
                const currentValue = interpolateProperty(fromValue, toValue, easedCurrentProgress, prop.property);
                
                // Apply the property value
                applyProperty(currentElement, prop.property, currentValue, prop.unit);
                
                // Update external state with current progress (FIXED - update during animation, not just at end)
                if (animation.progressCallback) {
                    animation.progressCallback(easedCurrentProgress);
                }
            });
            
            // Continue animation or complete based on ALL properties
            if (!allPropertiesComplete) {
                // Animation continues in queue automatically
            } else {
                this.removeFromAnimationQueue(animation.id);
                this.completeAnimation(animation.id);
            }
        };
        
        // Use high priority for directional animations (they're usually interactive)
        this.addToAnimationQueue(animation.id, animate, 'high');
    }
    
    /**
     * Stop a specific animation
     */
    private stopAnimation(animationId: string): void {
        const animation = this.runningAnimations.get(animationId);
        if (animation) {
            animation.isActive = false;
            if (animation.rafId) {
                cancelAnimationFrame(animation.rafId);
            }
            this.runningAnimations.delete(animationId);
            
            // Remove from high-performance queue
            this.removeFromAnimationQueue(animationId);
        }
    }
    
    /**
     * Complete a specific animation with automatic behavior handling
     */
    private completeAnimation(animationId: string): void {
        const animation = this.runningAnimations.get(animationId);
        if (!animation) return;
        
        // Clean up current animation first
        animation.isActive = false;
        this.runningAnimations.delete(animationId);
        
        // Check for automatic continuation behaviors (only for directional animations)
        const completedAnimation = animation as RunningAnimation;
        if (completedAnimation.behaviorDecision && completedAnimation.stateManager) {
            const decision = completedAnimation.behaviorDecision;
            const stateManager = completedAnimation.stateManager;
            
            // AUTOMATIC RESET BEHAVIORS (PLAY_FORWARD_AND_RESET, PLAY_BACKWARD_AND_RESET)
            if (decision.shouldResetAfterCompletion && !decision.isLoopIteration) {
                const resetProgress = completedAnimation.endProgress === 1.0 ? 0.0 : 1.0;
                
                // Instantly apply reset state
                const resetElement = resolveElement(completedAnimation.elementId);
                if (resetElement) {
                    completedAnimation.slot.properties.forEach(prop => {
                        const resetValue = resetProgress === 0.0 
                            ? (prop.from !== undefined ? prop.from : 0) 
                            : prop.to;
                        applyProperty(resetElement, prop.property, resetValue, prop.unit);
                    });
                } else {
                    console.warn(`🔍 [TIMED-ANIMATOR-DEBUG] ❌ Reset element not found for ID: ${completedAnimation.elementId}`);
                }
                
                // Update state manager with reset position
                stateManager.updateProgress(completedAnimation.slot.id, resetProgress);
                stateManager.updateTarget(completedAnimation.slot.id, resetProgress);
                
                return; // Reset is instant, no more animation
            }
            
            // 🔄 DISABLED: Automatic reverse behavior handling moved to EventAnimationCoordinator
            // This ensures Phase 2 goes through proper stagger coordination with correct directional orders
            else if (decision.isLoopIteration) {
                console.log(`🔄 [TimedAnimator] Reverse behavior Phase 1 completed - EventAnimationCoordinator will handle Phase 2`);
                // Phase 2 is now handled by EventAnimationCoordinator.handleReverseBehaviorPhase2()
                // This ensures proper stagger coordination with correct directional orders
                return;
            }
        }
        
        // NORMAL COMPLETION: Update final state to match where animation ended
        if (completedAnimation.stateManager && completedAnimation.endProgress !== undefined) {
            const finalProgress = completedAnimation.endProgress;
            
            // Ensure progress and target are synchronized at completion
            completedAnimation.stateManager.updateProgress(completedAnimation.slot.id, finalProgress);
            completedAnimation.stateManager.updateTarget(completedAnimation.slot.id, finalProgress);
        }
    }
    
    /**
     * Trigger an existing animation by ID
     * @param animationId - Animation to trigger
     * @param reverse - Whether to reverse
     */
    triggerAnimation(animationId: string, reverse: boolean = false): void {
        // TODO: Implement animation triggering
    }
    
    /**
     * Reset an animation to initial state
     * @param animationId - Animation to reset
     */
    resetAnimation(animationId: string): void {
        // TODO: Implement animation reset
    }
    
    /**
     * Get animation by ID
     * @param animationId - Animation ID
     * @returns Animation object or null
     */
    getAnimation(animationId: string): RunningAnimation | null {
        return this.runningAnimations.get(animationId) || null;
    }
    
    /**
     * Clean up all animations
     */
    cleanup(): void {
        console.log(`🚀 [TimedAnimator] Cleaning up ${this.runningAnimations.size} high-performance animations`);
        
        // Stop all running animations
        this.runningAnimations.forEach((animation, id) => {
            this.stopAnimation(id);
        });
        
        this.runningAnimations.clear();
        
        // 🚀 PERFORMANCE: Clean up animation queue and performance systems
        this.animationQueue.length = 0;
        this.isProcessingQueue = false;
        
        // Reset performance metrics
        this.performanceMetrics = {
            frameTime: 0,
            lastFrameTimestamp: 0,
            averageFrameTime: 16.67, // Target ~60fps
            droppedFrames: 0,
            totalFrames: 0,
            isPerformanceOptimal: true
        };
        

    }
    
    /**
     * 🌱 CRITICAL FIX: Extract spring configuration for a property from multiple sources
     * Priority order: 1. Property config, 2. Timeline config, 3. Slot timing config
     * @param prop - Animation property
     * @param slot - Animation slot
     * @param easingType - Easing type to check if spring config is needed
     * @returns Spring configuration or undefined
     */
    private extractSpringConfigForProperty(prop: any, slot: any, easingType: string): any | undefined {
        // Only extract spring config if easing type is spring-based
        if (!easingType.includes('spring')) {
            return undefined;
        }
        
        // Priority 1: Property-level spring config
        if (prop.springConfig) {
            return prop.springConfig;
        }
        
        // Priority 2: Timeline-level spring config (if using Timeline-First Architecture)
        if (slot.masterTimeline && slot.masterTimeline.propertyTimelines) {
            const propertyTimeline = slot.masterTimeline.propertyTimelines.find((timeline: any) => 
                timeline.property === prop.property
            );
            
            if (propertyTimeline && propertyTimeline.springConfig) {
                return propertyTimeline.springConfig;
            }
        }
        
        // Priority 3: Slot timing-level spring config (fallback)
        if (slot.timing?.springConfig) {
            return slot.timing.springConfig;
        }
        
        return undefined;
    }
    
    /**
     * Get performance statistics for debugging spring animations
     */
    getPerformanceStats() {
        const currentFPS = this.performanceMetrics.totalFrames > 0 
            ? Math.round(1000 / this.performanceMetrics.averageFrameTime) 
            : 0;
            
        return {
            targetFPS: this.performanceConfig.targetFPS,
            currentFPS: currentFPS,
            averageFrameTime: this.performanceMetrics.averageFrameTime,
            droppedFrames: this.performanceMetrics.droppedFrames,
            totalFrames: this.performanceMetrics.totalFrames,
            isPerformanceOptimal: this.performanceMetrics.isPerformanceOptimal,
            activeAnimations: this.runningAnimations.size,
            queueSize: this.animationQueue.length,
            frameBudget: this.performanceConfig.maxFrameTime + 'ms'
        };
    }
    
    /**
     * Update performance metrics with frame timing - Essential for 60fps monitoring
     */
    private updatePerformanceMetrics(frameTime: number) {
        const { performanceMetrics } = this;
        
        // Update frame timing
        performanceMetrics.frameTime = frameTime;
        performanceMetrics.totalFrames++;
        
        // Calculate rolling average frame time
        const alpha = 0.1; // Smoothing factor
        performanceMetrics.averageFrameTime = 
            (performanceMetrics.averageFrameTime * (1 - alpha)) + (frameTime * alpha);
        
        // Track dropped frames (>33ms = <30fps) - Critical for spring quality
        if (frameTime > 33.33) {
            performanceMetrics.droppedFrames++;
            if (this.performanceConfig.debugPerformance) {
                console.warn(`🚨 [TimedAnimator] Frame drop detected: ${frameTime.toFixed(2)}ms (>33ms = <30fps)`);
            }
        }
        
        // Update optimal performance flag
        performanceMetrics.isPerformanceOptimal = 
            performanceMetrics.averageFrameTime <= (1000 / this.performanceConfig.targetFPS * 1.2);
        
        // Log performance every 60 frames (1 second at 60fps)
        if (this.performanceConfig.debugPerformance && performanceMetrics.totalFrames % 60 === 0) {
            const currentFPS = Math.round(1000 / performanceMetrics.averageFrameTime);
            console.log(`📊 [TimedAnimator] Performance - FPS: ${currentFPS}/${this.performanceConfig.targetFPS}, Drops: ${performanceMetrics.droppedFrames}`);
        }
    }
    
    /**
     * Add animation to high-performance queue
     */
    private addToAnimationQueue(
        animationId: string, 
        callback: (timestamp: number) => void, 
        priority: 'high' | 'medium' | 'low' = 'medium'
    ) {
        // Remove existing entry if present to prevent duplicates
        this.animationQueue = this.animationQueue.filter(frame => frame.animationId !== animationId);
        
        // Add new entry
        this.animationQueue.push({
            animationId,
            callback,
            priority,
            lastExecutionTime: 0
        });
        
        // Start processing queue if not already running
        if (!this.isProcessingQueue) {
            this.startAnimationQueue();
        }
    }
    
    /**
     * Remove animation from queue
     */
    private removeFromAnimationQueue(animationId: string) {
        const initialLength = this.animationQueue.length;
        this.animationQueue = this.animationQueue.filter(frame => frame.animationId !== animationId);
        const removed = initialLength > this.animationQueue.length;
        
        if (this.animationQueue.length === 0) {
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Start high-performance animation queue processing - CRITICAL for 60fps springs!
     */
    private startAnimationQueue() {
        if (this.isProcessingQueue) return;
        
        this.isProcessingQueue = true;
        
        const processQueue = (timestamp: number) => {
            this.currentFrameStart = timestamp;
            
            // Update performance metrics
            const frameTime = timestamp - this.performanceMetrics.lastFrameTimestamp;
            this.updatePerformanceMetrics(frameTime);
            this.performanceMetrics.lastFrameTimestamp = timestamp;
            
            // Sort queue by priority (high first) - springs need high priority!
            const sortedQueue = [...this.animationQueue].sort((a, b) => {
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            
            // Process animations within frame budget (ESSENTIAL for 60fps)
            let processedCount = 0;
            const maxProcessTime = this.performanceConfig.enableFrameBudgeting 
                ? this.performanceConfig.maxFrameTime 
                : Infinity;
            
            for (let i = 0; i < sortedQueue.length && (performance.now() - this.currentFrameStart) < maxProcessTime; i++) {
                const frame = sortedQueue[i];
                
                try {
                    frame.callback(timestamp);
                    frame.lastExecutionTime = timestamp;
                    processedCount++;
                } catch (error) {
                    // Remove problematic animation from queue
                    this.removeFromAnimationQueue(frame.animationId);
                }
            }
            
            // Warn about frame budget exceeding (impacts spring smoothness)
            const frameProcessTime = performance.now() - this.currentFrameStart;
            if (this.performanceConfig.debugPerformance && frameProcessTime > this.performanceConfig.maxFrameTime) {
                console.warn(`⏱️ [TimedAnimator] Frame budget exceeded: ${frameProcessTime.toFixed(2)}ms (budget: ${this.performanceConfig.maxFrameTime}ms) - May affect spring smoothness!`);
            }
            
            // Continue queue processing if there are animations
            if (this.animationQueue.length > 0) {
                requestAnimationFrame(processQueue);
            } else {
                this.isProcessingQueue = false;
            }
        };
        
        requestAnimationFrame(processQueue);
    }
}

// TODO: Export singleton instance
// export const timedAnimator = new TimedAnimator(); 