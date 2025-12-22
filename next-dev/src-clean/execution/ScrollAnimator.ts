/**
 * FAME Animation System - Scroll Trigger Detector
 * 
 * @fileOverview Simple scroll threshold detection for unified trigger system
 * @version 3.0.0-unified
 * @status ACTIVE - Production ready
 * 
 * @description
 * Simple scroll threshold detection that works like other event triggers (click, mouseover, etc.).
 * Detects when scroll thresholds are crossed and fires the callback once, letting the 
 * BehaviorCoordinator handle all animation logic, state management, and behaviors.
 * 
 * @architecture
 * - Threshold crossing detection only
 * - Fire callback once per crossing (like other events)
 * - No independent animation triggering
 * - Full integration with BehaviorCoordinator system
 * - ✅ OPTIMIZED: Uses UnifiedScrollManager for coordinated scroll handling
 */

import { AnimationSlot } from '../types/index.ts';
import { EnvironmentDetector } from '../utils/environment/EnvironmentDetector.ts';
import { logger } from '../utils/environment/Logger.ts';
// ✅ NEW: Import unified scroll coordination
import { unifiedScrollManager } from '../utils/performance/UnifiedScrollManager.ts';

/**
 * Interface for scroll event configuration
 */
interface ScrollConfig {
    elementStart: number;  // 0-100 percentage
    viewportThreshold: number;  // 0-100 percentage
    thresholdCrossedBackward?: boolean;
}

/**
 * Internal interface for tracking scroll trigger information
 * 🎯 NEW: Added scrollDirection to pass context to behavior coordinator
 */
interface ScrollTriggerInfo {
    triggerElement: HTMLElement;
    scrollConfig: ScrollConfig;
    hasPassedThreshold: boolean;
    triggerCallback: (scrollDirection?: 'forward' | 'backward') => void; // 🎯 NEW: Pass direction context
    cleanup: () => void;
}

/**
 * ScrollAnimator class handles scroll threshold detection for unified trigger system
 * ✅ OPTIMIZED: Now uses UnifiedScrollManager for coordinated scroll handling
 */
export class ScrollAnimator {
    private activeAnimations = new Map<string, ScrollTriggerInfo>();
    private loggerContext = 'ScrollAnimator';

    /**
     * Set up scroll threshold detection for an element
     * @param slot Animation slot configuration
     * @param animatedElement Element to animate (not used directly, kept for API compatibility)
     * @param triggerElement Element to observe for scroll triggers
     * @param scrollConfig Scroll configuration
     * @param triggerCallback Callback to fire when threshold is crossed (unified with other events)
     */
    animateOnScroll(
        slot: AnimationSlot,
        animatedElement: HTMLElement,
        triggerElement: HTMLElement,
        scrollConfig: ScrollConfig,
        triggerCallback: (scrollDirection?: 'forward' | 'backward') => void
    ): () => void {
        // Skip in Canvas mode
        if (EnvironmentDetector.isCanvas()) {
            logger.debug(this.loggerContext, 'Scroll threshold detection disabled in Canvas mode');
            return () => {};
        }

        // Create unique trigger ID for this element
        const elementId = animatedElement.dataset.frameId || animatedElement.id || Math.random().toString(36).substr(2, 9);
        const triggerId = `${slot.id}-element-${elementId}`;
        
        logger.debug(this.loggerContext, `Setting up scroll threshold detection for: ${triggerId}`);
        
        // Clean up existing trigger if it exists
        if (this.activeAnimations.has(triggerId)) {
            this.activeAnimations.get(triggerId)?.cleanup();
        }
        
        // ✅ OPTIMIZED: Register with UnifiedScrollManager instead of individual listener
        const scrollUpdateHandler = () => {
            this.handleScrollThreshold(triggerId);
        };
        
        // Register with unified manager (high priority for scroll triggers - no longer conflicts with direction detection)
        const unifiedManagerCleanup = unifiedScrollManager.registerAnimation(
            `scroll-animator-${triggerId}`,
            scrollUpdateHandler,
            'high' // High priority - scroll threshold detection (direction detection is now isolated)
        );
        
        // Create cleanup function
        const cleanup = () => {
            unifiedManagerCleanup(); // Clean up from unified manager
            this.activeAnimations.delete(triggerId);
        };
        
        // Store trigger info
        this.activeAnimations.set(triggerId, {
            triggerElement,
            scrollConfig,
            hasPassedThreshold: false,
            triggerCallback,
            cleanup
        });
        
        // ✅ PERFORMANCE: Log optimization info
        console.log(`🚀 [ScrollAnimator] Registered with UnifiedScrollManager: ${triggerId}`);
        
        return cleanup;
    }

    /**
     * Handle scroll threshold detection for specific trigger
     * 🎯 NEW: Simple threshold crossing detection (like other events)
     */
    private handleScrollThreshold(triggerId: string): void {
        const triggerInfo = this.activeAnimations.get(triggerId);
        if (!triggerInfo) return;
        
        const { triggerElement, scrollConfig, hasPassedThreshold, triggerCallback } = triggerInfo;
        
        // Calculate if threshold is currently crossed
        const isThresholdCrossed = this.isThresholdCrossed(triggerElement, scrollConfig);
        
        // 🎯 UNIFIED BEHAVIOR: Fire callback once when threshold is crossed (like click events)
        if (isThresholdCrossed && !hasPassedThreshold) {
            logger.debug(this.loggerContext, `Threshold crossed (forward) for: ${triggerId}`);
            triggerInfo.hasPassedThreshold = true;
            triggerCallback('forward'); // Fire once - let BehaviorCoordinator handle the rest
        }
        
        // 🎯 UNIFIED BEHAVIOR: Fire callback once when threshold is crossed backward (if enabled)
        if (!isThresholdCrossed && hasPassedThreshold && scrollConfig.thresholdCrossedBackward) {
            logger.debug(this.loggerContext, `Threshold crossed (backward) for: ${triggerId}`);
            triggerInfo.hasPassedThreshold = false;
            triggerCallback('backward'); // Fire once - let BehaviorCoordinator handle the rest
        }
    }

    /**
     * Check if scroll threshold is currently crossed
     * 🎯 NEW: Simple boolean check (not continuous progress)
     */
    private isThresholdCrossed(element: HTMLElement, scrollConfig: ScrollConfig): boolean {
        const rect = element.getBoundingClientRect();
        const elementHeight = rect.height;
        const viewportHeight = window.innerHeight;
        
        // Calculate element position relative to viewport
        const elementTop = rect.top;
        
        // Calculate trigger points
        const elementTriggerPoint = elementTop + (elementHeight * scrollConfig.elementStart / 100);
        const viewportTriggerPoint = viewportHeight * scrollConfig.viewportThreshold / 100;
        
        // Threshold is crossed when element trigger point is above viewport trigger point
        return elementTriggerPoint <= viewportTriggerPoint;
    }

    /**
     * Clean up all active animations
     */
    cleanup(): void {
        console.log(`🚀 [ScrollAnimator] Cleaning up ${this.activeAnimations.size} scroll animations`);
        
        this.activeAnimations.forEach((triggerInfo) => {
            triggerInfo.cleanup();
        });
        
        this.activeAnimations.clear();
    }

    /**
     * Get current performance stats
     */
    getPerformanceStats() {
        return {
            activeAnimations: this.activeAnimations.size,
            animationIds: Array.from(this.activeAnimations.keys()),
            unifiedManagerStats: unifiedScrollManager.getPerformanceStats()
        };
    }
}

// Create singleton instance
export const scrollAnimator = new ScrollAnimator(); 