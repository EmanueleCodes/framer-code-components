/**
 * @file BehaviorDecisionEngine.ts
 * @description Behavior decision logic for FAME animation system
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Handles all behavior decision logic for animations:
 * - Determines target progress based on behavior type
 * - Manages animation direction decisions
 * - Handles reset, reverse, and toggle behaviors
 * - State override and intention-based behaviors
 * 
 * @architecture
 * - Single responsibility: behavior decisions only
 * - Pure functions where possible
 * - Clean separation from state management
 * - No state storage or persistence
 * 
 * @example
 * ```typescript
 * const engine = new BehaviorDecisionEngine();
 * 
 * // Decide what to do based on current state and behavior
 * const decision = engine.decideBehavior(currentState, AnimationBehavior.TOGGLE);
 * ```
 */

import { 
    AnimationState, 
    AnimationBehavior, 
    AnimationDirection, 
    AnimationStatus 
} from '../../types/index.ts';

/**
 * Behavior decision result
 * Tells the animator what to do next
 */
export interface BehaviorDecision {
    /** Target progress to animate to (0.0 to 1.0) */
    targetProgress: number;
    
    /** Animation direction */
    direction: AnimationDirection;
    
    /** Whether to reset after completion (for play/reset behavior) */
    shouldResetAfterCompletion: boolean;
    
    /** Whether this is a loop iteration (for loop behavior) */
    isLoopIteration: boolean;
    
    /** NEW: Override State Feature - Instant position change before animation */
    overrideStartProgress?: number; // If set, instantly jump to this progress before animating
}

/**
 * Behavior Decision Engine
 * 
 * Pure decision-making logic for animation behaviors.
 * Takes current state and desired behavior, returns decision object.
 */
export class BehaviorDecisionEngine {
    
    constructor() {
        // No state to initialize - pure decision engine
    }
    
    /**
     * Decide what the animation should do based on behavior and current state
     * 
     * This is the main entry point for behavior decisions.
     * Combines state reading + behavior logic + decision making.
     * 
     * @param currentState - Current animation state (or null for initial state)
     * @param behavior - Desired behavior (toggle, forward, etc.)
     * @param overrideState - Whether to override state when at target
     * @returns Decision object with target progress and direction
     */
    decideBehavior(
        currentState: AnimationState | null, 
        behavior: AnimationBehavior, 
        overrideState: boolean = false
    ): BehaviorDecision {
        
        // If no current state, create default initial decision
        if (!currentState) {
            return this.decideForInitialState(behavior);
        }
        
        // Decide based on behavior type
        switch (behavior) {
            // 🎯 PHASE 1 - BASIC BEHAVIORS (IMPLEMENTED)
            case AnimationBehavior.PLAY_FORWARD:
                return this.decidePlayForward(currentState, overrideState);
                
            case AnimationBehavior.PLAY_BACKWARD:
                return this.decidePlayBackward(currentState, overrideState);
                
            case AnimationBehavior.TOGGLE:
                return this.decideToggle(currentState);
            
            // 🚀 PHASE 2 - RESET BEHAVIORS (PLANNED - NOT YET IMPLEMENTED)
            case AnimationBehavior.PLAY_FORWARD_AND_RESET:
                return this.decidePlayForwardAndReset(currentState, overrideState);
                
            case AnimationBehavior.PLAY_BACKWARD_AND_RESET:
                return this.decidePlayBackwardAndReset(currentState, overrideState);
            
            // 🔄 PHASE 3 - REVERSE BEHAVIORS (NEW - IMPLEMENTING NOW)
            case AnimationBehavior.PLAY_FORWARD_AND_REVERSE:
                return this.decidePlayForwardAndReverse(currentState, overrideState);
                
            case AnimationBehavior.PLAY_BACKWARD_AND_REVERSE:
                return this.decidePlayBackwardAndReverse(currentState, overrideState);
            
            // 🎯 PHASE 5 - CONDITIONAL BEHAVIORS (NEW)
            case AnimationBehavior.DELAYED_TRIGGER:
                return this.decideDelayedTrigger(currentState);
            
            // 📜 LEGACY COMPATIBILITY (DEPRECATED - mapped to new behaviors)
            case AnimationBehavior.PLAY_ONCE:
                console.warn(`🎯 [BehaviorDecisionEngine] PLAY_ONCE is deprecated, use PLAY_FORWARD`);
                return this.decidePlayForward(currentState, overrideState);
                
            case AnimationBehavior.REPEAT:
                console.warn(`🎯 [BehaviorDecisionEngine] REPEAT is deprecated, will be mapped to PLAY_FORWARD_AND_RESET when implemented`);
                return this.decidePlayForward(currentState, overrideState);
                
            case AnimationBehavior.LOOP:
                console.warn(`🎯 [BehaviorDecisionEngine] LOOP is deprecated, will be mapped to START_PING_PONG when implemented`);
                return this.decideToggle(currentState);
                
            default:
                console.warn(`🎯 [BehaviorDecisionEngine] Unknown behavior: ${behavior}, defaulting to PLAY_FORWARD`);
                return this.decidePlayForward(currentState, overrideState);
        }
    }
    
    /**
     * Compute toggle behavior - returns target progress and direction
     * @param currentState - Current animation state
     * @returns Toggle behavior result
     */
    computeToggleBehavior(currentState: AnimationState): { targetProgress: number; direction: AnimationDirection } {
        const currentProgress = currentState.progress;
        const currentTarget = currentState.targetProgress;
        
        // TOGGLE now reverses the current intention (target), not the position
        const newTarget = currentTarget >= 0.5 ? 0.0 : 1.0;
        const direction = currentProgress < newTarget ? AnimationDirection.FORWARD : AnimationDirection.BACKWARD;
        
        return {
            targetProgress: newTarget,
            direction
        };
    }
    
    // ========================================
    // PRIVATE DECISION METHODS
    // ========================================
    
    /**
     * Create initial decision for first animation trigger
     * Updated for target-based architecture
     */
    private decideForInitialState(behavior: AnimationBehavior): BehaviorDecision {
        // Determine target based on behavior
        let targetProgress: number;
        let direction: AnimationDirection;
        let shouldResetAfterCompletion: boolean = false;
        let overrideStartProgress: number | undefined;
        
        switch (behavior) {
            case AnimationBehavior.PLAY_FORWARD:
            case AnimationBehavior.TOGGLE: // First toggle always goes forward
                targetProgress = 1.0;
                direction = AnimationDirection.FORWARD;
                break;
                
            case AnimationBehavior.PLAY_BACKWARD:
                targetProgress = 0.0;
                direction = AnimationDirection.BACKWARD;
                break;
                
            // 🔧 FIX: Reset behaviors need proper initial handling
            case AnimationBehavior.PLAY_FORWARD_AND_RESET:
                targetProgress = 1.0;
                direction = AnimationDirection.FORWARD;
                shouldResetAfterCompletion = true;
                overrideStartProgress = 0.0; // Always start from 0
                break;
                
            case AnimationBehavior.PLAY_BACKWARD_AND_RESET:
                targetProgress = 0.0;
                direction = AnimationDirection.BACKWARD;
                shouldResetAfterCompletion = true;
                overrideStartProgress = 1.0; // Always start from 1
                break;
                
            default:
                // Default: go forward
                targetProgress = 1.0;
                direction = AnimationDirection.FORWARD;
                break;
        }
        
        return {
            targetProgress,
            direction,
            shouldResetAfterCompletion,
            isLoopIteration: behavior === AnimationBehavior.LOOP,
            overrideStartProgress
        };
    }
    
    /**
     * Handle PLAY_FORWARD behavior
     */
    private decidePlayForward(currentState: AnimationState, overrideState: boolean): BehaviorDecision {
        const currentProgress = currentState.progress;
        const targetProgress = 1.0;
        
        if (overrideState && currentProgress > 0) {
            // Force start from 0 if we're not at the beginning
            return {
                targetProgress,
                direction: AnimationDirection.FORWARD,
                shouldResetAfterCompletion: false,
                isLoopIteration: false,
                overrideStartProgress: 0.0
            };
        }
        
        if (currentProgress === targetProgress && !overrideState) {
            // Already at target and no override - do nothing
            return {
                targetProgress: currentProgress,
                direction: AnimationDirection.FORWARD,
                shouldResetAfterCompletion: false,
                isLoopIteration: false
            };
        }
        
        // Standard play forward
        const effectiveStartProgress = overrideState ? 0.0 : currentProgress;
        const direction = effectiveStartProgress < targetProgress ? AnimationDirection.FORWARD : AnimationDirection.BACKWARD;
        
        return {
            targetProgress,
            direction,
            shouldResetAfterCompletion: false,
            isLoopIteration: false
        };
    }
    
    /**
     * Handle PLAY_BACKWARD behavior
     */
    private decidePlayBackward(currentState: AnimationState, overrideState: boolean): BehaviorDecision {
        const currentProgress = currentState.progress;
        const targetProgress = 0.0;
        
        if (overrideState && currentProgress < 1) {
            // Force start from 1 if we're not at the end
            return {
                targetProgress,
                direction: AnimationDirection.BACKWARD,
                shouldResetAfterCompletion: false,
                isLoopIteration: false,
                overrideStartProgress: 1.0
            };
        }
        
        if (currentProgress === targetProgress && !overrideState) {
            // Already at target and no override - do nothing
            return {
                targetProgress: currentProgress,
                direction: AnimationDirection.BACKWARD,
                shouldResetAfterCompletion: false,
                isLoopIteration: false
            };
        }
        
        // Standard play backward
        const effectiveStartProgress = overrideState ? 1.0 : currentProgress;
        const direction = effectiveStartProgress > targetProgress ? AnimationDirection.BACKWARD : AnimationDirection.FORWARD;
        
        return {
            targetProgress,
            direction,
            shouldResetAfterCompletion: false,
            isLoopIteration: false
        };
    }
    
    /**
     * Handle TOGGLE behavior - intention-based reversal
     */
    private decideToggle(currentState: AnimationState): BehaviorDecision {
        const toggleResult = this.computeToggleBehavior(currentState);
        
        console.log(`🚨 [BehaviorDecisionEngine] TOGGLE behavior decision:`, {
            currentProgress: currentState.progress.toFixed(3),
            currentTarget: currentState.targetProgress.toFixed(3),
            currentStatus: currentState.status,
            newTargetProgress: toggleResult.targetProgress.toFixed(3),
            direction: toggleResult.direction,
            willAnimate: Math.abs(currentState.progress - toggleResult.targetProgress) >= 0.01
        });
        
        return {
            targetProgress: toggleResult.targetProgress,
            direction: toggleResult.direction,
            shouldResetAfterCompletion: false,
            isLoopIteration: false
        };
    }
    
    /**
     * Handle PLAY_FORWARD_AND_RESET behavior
     */
    private decidePlayForwardAndReset(currentState: AnimationState, overrideState: boolean = false): BehaviorDecision {
        const currentProgress = currentState.progress;
        const targetProgress = 1.0;
        
        // Always start from 0 for reset behaviors
        const overrideStartProgress = 0.0;
        
        // If already at target and no override, do nothing
        if (currentProgress === targetProgress && !overrideState) {
            return {
                targetProgress: currentProgress,
                direction: AnimationDirection.FORWARD,
                shouldResetAfterCompletion: true,
                isLoopIteration: false
            };
        }
        
        return {
            targetProgress,
            direction: AnimationDirection.FORWARD,
            shouldResetAfterCompletion: true,
            isLoopIteration: false,
            overrideStartProgress
        };
    }
    
    /**
     * Handle PLAY_BACKWARD_AND_RESET behavior
     */
    private decidePlayBackwardAndReset(currentState: AnimationState, overrideState: boolean = false): BehaviorDecision {
        const currentProgress = currentState.progress;
        const targetProgress = 0.0;
        
        // Always start from 1 for backward reset behaviors
        const overrideStartProgress = 1.0;
        
        // If already at target and no override, do nothing
        if (currentProgress === targetProgress && !overrideState) {
            return {
                targetProgress: currentProgress,
                direction: AnimationDirection.BACKWARD,
                shouldResetAfterCompletion: true,
                isLoopIteration: false
            };
        }
        
        return {
            targetProgress,
            direction: AnimationDirection.BACKWARD,
            shouldResetAfterCompletion: true,
            isLoopIteration: false,
            overrideStartProgress
        };
    }
    
    /**
     * Handle PLAY_FORWARD_AND_REVERSE behavior
     */
    private decidePlayForwardAndReverse(currentState: AnimationState, overrideState: boolean = false): BehaviorDecision {
        const currentProgress = currentState.progress;
        
        // This is a ping-pong behavior: 0→1→0 in one trigger
        return {
            targetProgress: 1.0, // First part: go to 1.0
            direction: AnimationDirection.FORWARD,
            shouldResetAfterCompletion: false,
            isLoopIteration: true, // Mark as loop iteration for special handling
            overrideStartProgress: overrideState ? 0.0 : undefined
        };
    }
    
    /**
     * Handle PLAY_BACKWARD_AND_REVERSE behavior
     */
    private decidePlayBackwardAndReverse(currentState: AnimationState, overrideState: boolean = false): BehaviorDecision {
        const currentProgress = currentState.progress;
        
        // This is a reverse ping-pong behavior: 1→0→1 in one trigger
        return {
            targetProgress: 0.0, // First part: go to 0.0
            direction: AnimationDirection.BACKWARD,
            shouldResetAfterCompletion: false,
            isLoopIteration: true, // Mark as loop iteration for special handling
            overrideStartProgress: overrideState ? 1.0 : undefined
        };
    }

    /**
     * Handle DELAYED_TRIGGER behavior
     * Counts triggers and executes behavior after skip count is reached
     */
    private decideDelayedTrigger(currentState: AnimationState): BehaviorDecision {
        // Delayed trigger logic is now handled elsewhere; fallback to play forward
        return this.decidePlayForward(currentState, false);
    }
} 