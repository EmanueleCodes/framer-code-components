/**
 * @file AnimationStateManager.ts
 * @description Core animation state management for FAME animation system
 * 
 * @version 2.0.0
 * @since 2.0.0
 * 
 * @description
 * Focused state management for animation system:
 * - Animation state storage and tracking (per-slot)
 * - Progress and target progress updates
 * - State queries and basic validations
 * - Clean state coordination
 * 
 * @architecture
 * - Single responsibility: state tracking only
 * - Delegates behavior decisions to BehaviorDecisionEngine
 * - Delegates persistence to AnimationStateStore
 * - Clean separation of concerns
 * 
 * @example
 * ```typescript
 * const manager = new AnimationStateManager();
 * 
 * // Initialize state
 * manager.initializeState('slot1', 'element1');
 * 
 * // Update progress
 * manager.updateProgress('slot1', 0.5);
 * 
 * // Get current state
 * const state = manager.getState('slot1');
 * ```
 */

import { AnimationState, AnimationStatus, AnimationDirection, AnimationBehavior, LoopConfig, DelayedTriggerConfig, PingPongConfig } from '../../types/index.ts';
import { BehaviorDecisionEngine, BehaviorDecision } from './BehaviorDecisionEngine.ts';
import { AnimationStateStore } from './AnimationStateStore.ts';

/**
 * Animation State Manager
 * 
 * Focused state management that handles only state tracking and coordination.
 * Delegates behavior decisions to BehaviorDecisionEngine and persistence to AnimationStateStore.
 */
export class AnimationStateManager {
    
    /** Map of slot states - keyed by slotId for per-slot tracking */
    private slotStates: Map<string, AnimationState> = new Map();
    
    /** Behavior decision engine for all behavior logic */
    private behaviorEngine: BehaviorDecisionEngine;
    
    /** State store for persistence and cleanup operations */
    private stateStore: AnimationStateStore;
    
    /** Map of slotId to completion listeners */
    private completionListeners: Map<string, Set<() => void>> = new Map();
    
    constructor() {
        this.slotStates = new Map();
        this.behaviorEngine = new BehaviorDecisionEngine();
        this.stateStore = new AnimationStateStore();
    }
    
    // ========================================
    // CORE STATE MANAGEMENT METHODS
    // ========================================
    
    /**
     * Get current animation state for a slot
     * @param slotId - Animation slot identifier  
     * @returns Current animation state or null if not found
     */
    getState(slotId: string): AnimationState | null {
        return this.slotStates.get(slotId) || null;
    }
    
    /**
     * Get current animation state for a slot (with elementId fallback for compatibility)
     * @param elementId - Element identifier (for backward compatibility)
     * @param slotId - Animation slot identifier
     * @returns Current animation state or null if not found
     */
    getStateByElement(elementId: string, slotId?: string): AnimationState | null {
        // Primary lookup by slotId if provided
        if (slotId) {
            return this.getState(slotId);
        }
        
        // Fallback: search by elementId in all states
        for (const [, state] of this.slotStates) {
            if (state.elementId === elementId) {
                return state;
            }
        }
        
        return null;
    }
    
    /**
     * Update animation progress (triggers derived calculations)
     * @param slotId - Slot to update
     * @param progress - New progress value (0.0 to 1.0)
     * @param status - New animation status
     */
    updateProgress(slotId: string, progress: number, status: AnimationStatus = AnimationStatus.RUNNING): void {
        const currentState = this.slotStates.get(slotId);
        
        if (!currentState) {
            console.warn(`🎯 [AnimationStateManager] Cannot update progress for unknown slot: ${slotId}`);
            return;
        }
        
        // Update the state (preserve targetProgress - only update current progress)
        const updatedState: AnimationState = {
            ...currentState,
            progress: Math.max(0, progress), // Allow progress > 1 for springs, but not < 0
            status,
            lastUpdated: performance.now()
        };
        
        this.slotStates.set(slotId, updatedState);
        
        // Notify completion listeners if status is COMPLETED
        if (status === AnimationStatus.COMPLETED) {
            const listeners = this.completionListeners.get(slotId);
            if (listeners) {
                listeners.forEach(listener => listener());
                this.completionListeners.delete(slotId);
            }
        }
    }
    
    /**
     * Update target progress immediately when trigger fires (Target-based architecture)
     * This is the core of the target-based state system - update intent immediately
     * @param slotId - Slot to update  
     * @param targetProgress - New target progress (0.0 or 1.0)
     */
    updateTarget(slotId: string, targetProgress: number): void {
        const currentState = this.slotStates.get(slotId);
        if (currentState) {
            currentState.targetProgress = targetProgress;
            currentState.lastUpdated = performance.now();
        }
    }

    /**
     * Synchronize target with current progress at completion
     * This fixes state mismatches where animations complete but target remains stale
     * @param slotId - Slot to synchronize
     */
    syncTargetWithProgress(slotId: string): void {
        const currentState = this.slotStates.get(slotId);
        if (currentState) {
            currentState.targetProgress = currentState.progress;
            currentState.lastUpdated = performance.now();
            
            // Only log when values actually change
            if (Math.abs(currentState.targetProgress - currentState.progress) > 0.01) {
                console.log(`🔧 [AnimationStateManager] Synced target with progress for ${slotId}: ${currentState.progress.toFixed(3)}`);
            }
        }
    }
    
    /**
     * Initialize state for a new animation slot
     * @param slotId - Animation slot identifier
     * @param elementId - Element identifier for debugging
     * @param initialProgress - Starting progress (default: 0.0)
     * @param initialTarget - Starting target progress (default: 0.0)
     */
    initializeState(slotId: string, elementId: string, initialProgress: number = 0.0, initialTarget: number = 0.0): void {
        const newState: AnimationState = {
            progress: initialProgress,
            targetProgress: initialTarget,
            status: AnimationStatus.IDLE,
            direction: AnimationDirection.FORWARD, // Default direction
            elementId,
            slotId,
            lastUpdated: performance.now()
        };
        
        this.slotStates.set(slotId, newState);
        
        console.log(`🎯 [AnimationStateManager] Initialized slot ${slotId} for element ${elementId} (progress: ${initialProgress}, target: ${initialTarget})`);
    }
    
    // ========================================
    // BEHAVIOR DECISION DELEGATION
    // ========================================
    
    /**
     * Decide what the animation should do based on behavior and current state
     * Delegates to BehaviorDecisionEngine for clean separation of concerns
     * 
     * @param slotId - Animation slot identifier
     * @param behavior - Desired behavior (toggle, forward, etc.)
     * @param overrideState - Whether to override state when at target
     * @returns Decision object with target progress and direction
     */
    decideBehavior(slotId: string, behavior: AnimationBehavior, overrideState: boolean = false): BehaviorDecision {
        const currentState = this.getState(slotId);
        return this.behaviorEngine.decideBehavior(currentState, behavior, overrideState);
    }
    
    /**
     * Compute toggle behavior - delegation to engine
     * @param slotId - Animation slot identifier
     * @returns Toggle behavior result
     */
    computeToggleBehavior(slotId: string): { targetProgress: number; direction: AnimationDirection } {
        const currentState = this.getState(slotId);
        if (!currentState) {
            return { targetProgress: 1.0, direction: AnimationDirection.FORWARD };
        }
        return this.behaviorEngine.computeToggleBehavior(currentState);
    }
    
    // ========================================
    // STATE QUERY METHODS
    // ========================================
    
    /**
     * Check if animation is at start position
     * @param slotId - Slot to check
     * @returns True if at start (progress <= 0.01)
     */
    isAtStart(slotId: string): boolean {
        const state = this.getState(slotId);
        return state ? state.progress <= 0.01 : true;
    }
    
    /**
     * Check if animation is at end position
     * @param slotId - Slot to check
     * @returns True if at end (progress >= 0.99)
     */
    isAtEnd(slotId: string): boolean {
        const state = this.getState(slotId);
        return state ? state.progress >= 0.99 : false;
    }
    
    /**
     * Get list of slots with active animations
     * @returns Array of slot IDs with RUNNING status
     */
    getActiveSlots(): string[] {
        const activeSlots: string[] = [];
        
        for (const [slotId, state] of this.slotStates) {
            if (state.status === AnimationStatus.RUNNING) {
                activeSlots.push(slotId);
            }
        }
        
        return activeSlots;
    }
    
    /**
     * Get all slot IDs for state management operations
     * @returns Array of all slot IDs currently tracked
     */
    getAllSlotIds(): string[] {
        return Array.from(this.slotStates.keys());
    }
    
    /**
     * Get all slot states (for external queries)
     * @returns Map of all current slot states
     */
    getAllStates(): Map<string, AnimationState> {
        return new Map(this.slotStates);
    }
    
    /**
     * Reset slot state to initial values
     * @param slotId - Slot to reset
     */
    resetSlotState(slotId: string): void {
        const currentState = this.slotStates.get(slotId);
        if (currentState) {
            // Cancel any active animations for this slot
            this.stateStore.cancelActiveAnimations(slotId);
            
            // Reset to initial state (progress 0.0, target 0.0, status IDLE)
            const resetState: AnimationState = {
                ...currentState,
                progress: 0.0,
                targetProgress: 0.0,
                status: AnimationStatus.IDLE,
                direction: AnimationDirection.FORWARD,
                lastUpdated: performance.now()
            };
            
            this.slotStates.set(slotId, resetState);
            console.log(`🔄 [AnimationStateManager] Reset slot state: ${slotId} (progress: 0.0, target: 0.0)`);
        } else {
            console.warn(`🔄 [AnimationStateManager] Cannot reset unknown slot: ${slotId}`);
        }
    }
    
    /**
     * Force update all states to a specific status (emergency reset)
     * @param status - Status to set for all slots
     */
    forceAllStatuses(status: AnimationStatus): void {
        console.log(`🚨 [AnimationStateManager] Force setting all slots to status: ${status}`);
        
        for (const [slotId, state] of this.slotStates) {
            this.slotStates.set(slotId, {
                ...state,
                status,
                lastUpdated: performance.now()
            });
        }
    }
    
    // ========================================
    // CLEANUP AND LIFECYCLE METHODS
    // ========================================
    
    /**
     * Cleanup state for a specific slot
     * @param slotId - Slot to cleanup
     */
    cleanup(slotId: string): void {
        // Delegate cleanup operations to state store
        this.stateStore.cleanupSlot(slotId);
        
        // Remove state tracking
        this.slotStates.delete(slotId);
        
        console.log(`🧹 [AnimationStateManager] Cleaned up slot: ${slotId}`);
    }
    
    /**
     * Cleanup all states and reset manager
     */
    cleanupAll(): void {
        // Delegate cleanup operations to state store
        this.stateStore.cleanupAll();
        
        // Clear all state tracking
        this.slotStates.clear();
        
        console.log(`🧹 [AnimationStateManager] Cleaned up all slots`);
    }
    
    // ========================================
    // STORE DELEGATION METHODS
    // ========================================
    
    /**
     * Register animation cleanup function for interruption support
     * Delegates to state store
     */
    registerAnimationCleanup(slotId: string, cleanup: () => void): void {
        this.stateStore.registerAnimationCleanup(slotId, cleanup);
    }
    
    /**
     * Cancel all active animations for a slot (interruption support)
     * Delegates to state store
     */
    cancelActiveAnimations(slotId: string): void {
        this.stateStore.cancelActiveAnimations(slotId);
    }
    
    /**
     * Serialize all current animation states for persistence
     * Delegates to state store
     */
    serializeAllStates(): { [slotId: string]: any } {
        return this.stateStore.serializeStates(this.slotStates);
    }
    
    /**
     * Restore animation states from serialized data
     * Delegates to state store and updates internal state
     */
    restoreSerializedStates(serializedStates: { [slotId: string]: any }): void {
        const restoredStates = this.stateStore.deserializeStates(serializedStates);
        
        // Update internal state with restored data
        for (const [slotId, state] of restoredStates) {
            this.slotStates.set(slotId, state);
        }
        
        console.log(`🔄 [AnimationStateManager] Restored ${restoredStates.size} slot states`);
    }
    
    /**
     * Get debug information about current states
     * Delegates to state store
     */
    getDebugInfo(): { totalSlots: number; activeSlots: number; states: AnimationState[] } {
        return this.stateStore.getDebugInfo(this.slotStates);
    }
    
    /**
     * Check if any animations are currently running
     * Delegates to state store
     */
    hasRunningAnimations(): boolean {
        return this.stateStore.hasRunningAnimations(this.slotStates);
    }
    
    /**
     * Get count of running animations
     * Delegates to state store
     */
    getRunningAnimationCount(): number {
        return this.stateStore.getRunningAnimationCount(this.slotStates);
    }
    
    /**
     * Wait for the animation for a slot to reach COMPLETED status.
     * Resolves immediately if already completed.
     */
    public waitForCompletion(slotId: string): Promise<void> {
        const state = this.getState(slotId);
        if (state && state.status === AnimationStatus.COMPLETED) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            if (!this.completionListeners.has(slotId)) {
                this.completionListeners.set(slotId, new Set());
            }
            this.completionListeners.get(slotId)!.add(resolve);
        });
    }
}

// Export singleton instance for use across the system
export const animationStateManager = new AnimationStateManager();