/**
 * @file AnimationStateStore.ts
 * @description State persistence and serialization for FAME animation system
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Handles all persistence-related operations for animation states:
 * - State serialization for breakpoint persistence
 * - State restoration and deserialization  
 * - Animation cleanup management
 * - Debug information gathering
 * 
 * @architecture
 * - Single responsibility: persistence only
 * - Clean separation from state management
 * - No behavior decision logic
 * - Clear error handling and validation
 * 
 * @example
 * ```typescript
 * const store = new AnimationStateStore();
 * 
 * // Serialize current states
 * const serialized = store.serializeStates(stateMap);
 * 
 * // Later restore states
 * const restored = store.deserializeStates(serialized);
 * ```
 */

import { AnimationState, AnimationStatus, AnimationDirection } from '../../types/index.ts';

/**
 * Animation State Store
 * 
 * Handles all persistence and serialization operations for animation states.
 * Separated from core state management for clean architecture.
 */
export class AnimationStateStore {
    
    /** Track active animation cleanup functions for interruption support */
    private activeAnimationCleanups: Map<string, (() => void)[]> = new Map();
    
    constructor() {
        this.activeAnimationCleanups = new Map();
    }
    
    // ========================================
    // SERIALIZATION METHODS
    // ========================================
    
    /**
     * Serialize animation states for persistence
     * @param states - Map of states to serialize
     * @returns Serializable state object
     */
    serializeStates(states: Map<string, AnimationState>): { [slotId: string]: any } {
        const serialized: { [slotId: string]: any } = {};
        
        for (const [slotId, state] of states) {
            serialized[slotId] = {
                progress: state.progress,
                targetProgress: state.targetProgress,
                status: state.status,
                elementId: state.elementId,
                lastUpdated: state.lastUpdated
            };
        }
        
        console.log(`💾 [AnimationStateStore] Serialized ${Object.keys(serialized).length} slot states`);
        return serialized;
    }
    
    /**
     * Deserialize states from serialized data
     * @param serializedStates - Previously serialized state data
     * @returns Map of restored states
     */
    deserializeStates(serializedStates: { [slotId: string]: any }): Map<string, AnimationState> {
        const restoredStates = new Map<string, AnimationState>();
        
        console.log(`🔄 [AnimationStateStore] Restoring ${Object.keys(serializedStates).length} slot states`);
        
        for (const [slotId, stateData] of Object.entries(serializedStates)) {
            try {
                const restoredState: AnimationState = {
                    progress: stateData.progress || 0.0,
                    targetProgress: stateData.targetProgress || 0.0,
                    status: stateData.status || AnimationStatus.IDLE,
                    direction: stateData.direction || AnimationDirection.FORWARD, // Default direction
                    elementId: stateData.elementId || `restored-${slotId}`,
                    slotId,
                    lastUpdated: performance.now() // Update to current time
                };
                
                restoredStates.set(slotId, restoredState);
                console.log(`🔄 [AnimationStateStore] Restored slot ${slotId}:`, {
                    progress: restoredState.progress,
                    targetProgress: restoredState.targetProgress,
                    status: restoredState.status
                });
            } catch (error) {
                console.warn(`🔄 [AnimationStateStore] Failed to restore slot ${slotId}:`, error);
            }
        }
        
        return restoredStates;
    }
    
    // ========================================
    // CLEANUP MANAGEMENT METHODS
    // ========================================
    
    /**
     * Register animation cleanup function for interruption support
     * @param slotId - Slot identifier
     * @param cleanup - Cleanup function to register
     */
    registerAnimationCleanup(slotId: string, cleanup: () => void): void {
        if (!this.activeAnimationCleanups.has(slotId)) {
            this.activeAnimationCleanups.set(slotId, []);
        }
        
        this.activeAnimationCleanups.get(slotId)!.push(cleanup);
    }
    
    /**
     * Cancel all active animations for a slot (interruption support)
     * @param slotId - Slot to cancel animations for
     */
    cancelActiveAnimations(slotId: string): void {
        const cleanups = this.activeAnimationCleanups.get(slotId);
        if (cleanups && cleanups.length > 0) {
            console.log(`🎯 [AnimationStateStore] Cancelling ${cleanups.length} active animations for slot: ${slotId}`);
            cleanups.forEach(cleanup => {
                try {
                    cleanup();
                } catch (error) {
                    console.error(`🎯 [AnimationStateStore] Error cancelling animation for ${slotId}:`, error);
                }
            });
            this.activeAnimationCleanups.set(slotId, []); // Clear the array but keep the slot entry
        }
    }
    
    /**
     * Cleanup animations for a specific slot
     * @param slotId - Slot to cleanup
     */
    cleanupSlot(slotId: string): void {
        this.cancelActiveAnimations(slotId);
        this.activeAnimationCleanups.delete(slotId);
    }
    
    /**
     * Cleanup all animations and state
     */
    cleanupAll(): void {
        // Cancel all active animations
        for (const [slotId] of this.activeAnimationCleanups) {
            this.cancelActiveAnimations(slotId);
        }
        
        // Clear all cleanup references
        this.activeAnimationCleanups.clear();
    }
    
    // ========================================
    // DEBUG METHODS
    // ========================================
    
    /**
     * Get debug information about current states
     * @param states - Current state map
     * @returns Debug object with state summary
     */
    getDebugInfo(states: Map<string, AnimationState>): { totalSlots: number; activeSlots: number; states: AnimationState[] } {
        const stateArray = Array.from(states.values());
        const activeSlots = stateArray.filter(state => state.status === AnimationStatus.RUNNING).length;
        
        return {
            totalSlots: stateArray.length,
            activeSlots,
            states: stateArray
        };
    }
    
    /**
     * Check if any animations are currently running
     * @param states - Current state map
     * @returns True if any slot is in RUNNING status
     */
    hasRunningAnimations(states: Map<string, AnimationState>): boolean {
        for (const [, state] of states) {
            if (state.status === AnimationStatus.RUNNING) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get running animation count
     * @param states - Current state map
     * @returns Number of slots currently running
     */
    getRunningAnimationCount(states: Map<string, AnimationState>): number {
        let count = 0;
        for (const [, state] of states) {
            if (state.status === AnimationStatus.RUNNING) {
                count++;
            }
        }
        return count;
    }
} 