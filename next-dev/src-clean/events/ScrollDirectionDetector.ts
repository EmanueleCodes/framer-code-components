/**
 * @file ScrollDirectionDetector.ts
 * @description Global scroll direction detector with isolated scroll handling
 * 
 * @version 3.0.0 - Isolated scroll handling
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const detector = new ScrollDirectionDetector();
 * detector.startDetection((direction) => {
 *   console.log('Scroll direction changed to:', direction);
 * });
 * ```
 */

// ✅ PERFORMANCE FIX: Back to UnifiedScrollManager for efficient single scroll listener
import { unifiedScrollManager } from '../utils/performance/UnifiedScrollManager.ts';

export type ScrollDirection = 'up' | 'down';

export interface ScrollDirectionConfig {
    /** Minimum velocity change required to trigger direction change (default: 50) */
    threshold?: number;
    /** Debounce delay in milliseconds (default: 100) */
    debounceDelay?: number;
    /** Sample rate for velocity calculation in milliseconds (default: 16) */
    sampleRate?: number;
}

/**
 * ScrollDirectionDetector - High-performance scroll direction detection
 * 
 * @description
 * ✅ PERFORMANCE OPTIMIZED: Uses UnifiedScrollManager for efficient single scroll listener.
 * Coordinates with other scroll systems while maintaining isolated state tracking.
 * Only activated when components actually need scroll direction change detection.
 * 
 * @architecture
 * - Uses UnifiedScrollManager for coordinated single scroll listener
 * - Calculates velocity from scroll position changes over time
 * - Implements threshold-based direction change detection
 * - Provides debouncing to prevent excessive event firing
 * - Supports cleanup and proper lifecycle management
 * - Lazy activation: only runs when actually needed
 */
export class ScrollDirectionDetector {
    private config: Required<ScrollDirectionConfig>;
    private callbacks: Set<(direction: ScrollDirection) => void> = new Set();
    private currentDirection: ScrollDirection | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isActive = false;
    private hasDetectedInitialDirection = false; // Track if we've seen the first direction
    
    // 🚨 ISOLATION FIX: Direct scroll listener cleanup (isolated from UnifiedScrollManager)
    private scrollListenerCleanup: (() => void) | null = null;
    
    // Velocity calculation state
    private lastScrollY = 0;
    private lastTimestamp = 0;
    private velocityHistory: Array<{ velocity: number; timestamp: number }> = [];

    constructor(config: ScrollDirectionConfig = {}) {
        this.config = {
            threshold: 50,
            debounceDelay: 100,
            sampleRate: 16,
            ...config
        };
        
        console.log(`🌊 [ScrollDirectionDetector] Initialized with config:`, this.config);
    }

    /**
     * Start scroll direction detection
     * 
     * @param callback - Function to call when direction changes
     * @returns Cleanup function to stop detection
     */
    startDetection(callback: (direction: ScrollDirection) => void): () => void {
        // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] startDetection called, current callbacks: ${this.callbacks.size}`);
        
        this.callbacks.add(callback);
        
        if (!this.isActive) {
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Not active, setting up unified scroll listener`);
            this.setupUnifiedScrollListener();
            this.isActive = true;
        } else {
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Already active, just adding callback`);
        }

        console.log(`🌊 [ScrollDirectionDetector] Started detection for callback (${this.callbacks.size} total)`);

        // Return cleanup function
        return () => {
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Cleanup called for callback`);
            this.callbacks.delete(callback);
            console.log(`🌊 [ScrollDirectionDetector] Removed callback (${this.callbacks.size} remaining)`);
            
            if (this.callbacks.size === 0) {
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] No more callbacks, stopping detection`);
                this.stopDetection();
            }
        };
    }

    /**
     * Stop all scroll direction detection
     */
    stopDetection(): void {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.callbacks.clear();
        this.currentDirection = null;
        this.hasDetectedInitialDirection = false; // Reset initial direction tracking
        this.velocityHistory = [];
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // ✅ PERFORMANCE FIX: Clean up UnifiedScrollManager registration
        if (this.scrollListenerCleanup) {
            this.scrollListenerCleanup();
            this.scrollListenerCleanup = null;
            console.log(`🌊 [ScrollDirectionDetector] Unregistered from UnifiedScrollManager`);
        }
    }

    /**
     * Get the current scroll direction
     */
    getCurrentDirection(): ScrollDirection | null {
        return this.currentDirection;
    }

    /**
     * Check if detector is currently active
     */
    isDetectionActive(): boolean {
        return this.isActive;
    }

    /**
     * Reset all internal state for fresh detection
     * 
     * @description
     * This method resets all internal state to ensure fresh detection
     * on component re-renders. Critical for React environments where
     * singleton instances persist across re-renders.
     */
    reset(): void {
        console.log(`🔄 [ScrollDirectionDetector] Resetting state for fresh detection`);
        
        // Stop current detection if active
        if (this.isActive) {
            this.stopDetection();
        }
        
        // Reset all internal state
        this.currentDirection = null;
        this.hasDetectedInitialDirection = false;
        this.lastScrollY = 0;
        this.lastTimestamp = 0;
        this.velocityHistory = [];
        
        // Clear any remaining timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        console.log(`✅ [ScrollDirectionDetector] State reset complete`);
    }

    /**
     * Setup performant scroll event listener through UnifiedScrollManager
     */
    private setupUnifiedScrollListener(): void {
        // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] setupUnifiedScrollListener called`);
        
        // 🚨 PERFORMANCE FIX: Check if already set up
        if (this.scrollListenerCleanup) {
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Already has scroll listener cleanup, returning`);
            return; // Already set up
        }

        // Initialize tracking values
        this.lastScrollY = window.scrollY;
        this.lastTimestamp = performance.now();
        this.velocityHistory = [];
        this.currentDirection = null;
        this.hasDetectedInitialDirection = false; // Reset for fresh start
        
        // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Initialized tracking values: scrollY=${this.lastScrollY}, time=${this.lastTimestamp}`);

        // ✅ PERFORMANCE FIX: Use UnifiedScrollManager for coordination but with isolated state
        const scrollUpdateHandler = () => {
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] scrollUpdateHandler called`);
            
            // 🚨 ISOLATION FIX: Guard against interference with other scroll systems
            if (!this.isActive || this.callbacks.size === 0) {
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Not active or no callbacks, skipping processing`);
                return;
            }
            
            const currentTime = performance.now();
            const currentScrollY = window.scrollY;
            
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Current scroll: ${currentScrollY}, Last scroll: ${this.lastScrollY}, Delta: ${currentScrollY - this.lastScrollY}`);
            
            // Track velocity for smoothing
            const deltaY = currentScrollY - this.lastScrollY;
            const deltaTime = Math.max(currentTime - this.lastTimestamp, 1);
            const velocity = deltaY / deltaTime;
            
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Velocity: ${velocity}, Threshold: ${this.config.threshold / 1000}`);
            
            // Add to velocity history for smoothing
            this.velocityHistory.push({ velocity, timestamp: currentTime });
            
            // Keep only recent velocity samples (within sample rate window)
            const cutoffTime = currentTime - (this.config.sampleRate * 3);
            this.velocityHistory = this.velocityHistory.filter(sample => sample.timestamp > cutoffTime);
            
            // Calculate smoothed velocity
            const averageVelocity = this.velocityHistory.length > 0
                ? this.velocityHistory.reduce((sum, sample) => sum + sample.velocity, 0) / this.velocityHistory.length
                : velocity;
            
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Average velocity: ${averageVelocity}`);
            
            // Only process if there's significant movement
            if (Math.abs(averageVelocity) < this.config.threshold / 1000) {
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Movement too small, skipping direction detection`);
                this.lastScrollY = currentScrollY;
                this.lastTimestamp = currentTime;
                return;
            }
            
            // Determine direction based on smoothed velocity
            const newDirection: ScrollDirection = averageVelocity > 0 ? 'down' : 'up';
            
            // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] New direction: ${newDirection}, Current direction: ${this.currentDirection}, Has detected initial: ${this.hasDetectedInitialDirection}`);
            
            // ✅ FIXED: Only fire callback on actual direction CHANGE, not on initial scroll
            if (!this.hasDetectedInitialDirection) {
                // First time detecting direction - record it but don't fire callback
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] INITIAL DIRECTION DETECTED: ${newDirection} (no callback fired)`);
                this.currentDirection = newDirection;
                this.hasDetectedInitialDirection = true;
            } else if (newDirection !== this.currentDirection) {
                // Direction actually changed - fire the callback
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] DIRECTION CHANGE DETECTED! ${this.currentDirection} → ${newDirection}`);
                this.currentDirection = newDirection;
                this.fireDirectionChange(newDirection);
                
                console.log(`🌊 [ScrollDirectionDetector] Direction changed to: ${newDirection} (velocity: ${averageVelocity.toFixed(3)})`);
            } else {
                // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Same direction (${newDirection}), no callback fired`);
            }
            
            // Update tracking values
            this.lastScrollY = currentScrollY;
            this.lastTimestamp = currentTime;
        };

        // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Setting up UnifiedScrollManager integration`);
        
        // ✅ PERFORMANCE FIX: Use UnifiedScrollManager for efficient coordination
        // This eliminates duplicate scroll listeners while maintaining proper isolation
        this.scrollListenerCleanup = unifiedScrollManager.registerAnimation(
            'scroll-direction-detector', // Unique ID for this system
            scrollUpdateHandler,
            'high' // High priority for direction detection
        );

        console.log(`🌊 [ScrollDirectionDetector] Setup complete with UnifiedScrollManager coordination (eliminates duplicate scroll listeners)`);
        // console.log(`🚨 [ScrollDirectionDetector] [DEBUG] Setup complete, cleanup function: ${!!this.scrollListenerCleanup}`);
    }

    /**
     * Fire direction change callbacks with debouncing
     */
    private fireDirectionChange(direction: ScrollDirection): void {
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            console.log(`🌊 [ScrollDirectionDetector] Firing direction change: ${direction} to ${this.callbacks.size} callbacks`);
            
            this.callbacks.forEach(callback => {
                try {
                    callback(direction);
                } catch (error) {
                    console.error('🌊 [ScrollDirectionDetector] Error in callback:', error);
                }
            });
        }, this.config.debounceDelay);
    }
}

/**
 * Global scroll direction detector instance
 * 
 * @description
 * Singleton instance for managing scroll direction detection across multiple components.
 * Uses unified scroll coordination and works in any JavaScript context.
 */
export const globalScrollDirectionDetector = new ScrollDirectionDetector({
    threshold: 100, // Require 100px/s velocity to trigger direction change
    debounceDelay: 150, // Wait 150ms before firing to avoid excessive events
    sampleRate: 16 // Sample every 16ms (60fps)
}); 