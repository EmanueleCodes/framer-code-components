/**
 * @file BehaviorCoordinator.ts
 * @description Coordinates animation behavior decisions and interrupt handling
 * 
 * @version 1.0.0 - Initial Extraction from EventAnimationCoordinator
 * @since 1.5.4
 * 
 * @example
 * ```typescript
 * const behaviorCoordinator = new BehaviorCoordinator(animationExecutor);
 * behaviorCoordinator.handleBehaviorDecision(trigger, slot, animatedElements);
 * ```
 * 
 * @description
 * Extracted from EventAnimationCoordinator as part of Phase 1.5.4 architectural refactoring.
 * Handles all behavior decision logic including interrupt behaviors (IMMEDIATE, BLOCK, QUEUE_LATEST)
 * and animation execution coordination.
 * 
 * **Separation of Concerns:**
 * - BehaviorCoordinator: Behavior decision logic and interrupt handling
 * - EventAnimationCoordinator: Event handling and coordination only
 * 
 * **Key Responsibilities:**
 * - Route to appropriate interrupt behavior based on slot configuration
 * - Manage queued intents for QUEUE_LATEST behavior
 * - Execute behavior logic (immediate, block, queue)
 * - Coordinate with animation execution through callback pattern
 */

import {
    AnimationSlot,
    InterruptBehavior,
    QueuedIntent,
    AnimationBehavior,
    ReverseMode
} from '../../types/index.ts';

import type { TriggerElement } from '../../types/index.ts';
import type { BehaviorDecision } from '../state/BehaviorDecisionEngine.ts';

import { animationStateManager } from '../state/AnimationStateManager.ts';

/**
 * Callback function type for executing animation
 * Allows BehaviorCoordinator to remain decoupled from animation execution details
 */
export type AnimationExecutor = (
    slot: AnimationSlot,
    animatedElements: HTMLElement[],
    behavior: string,
    startProgress: number,
    reverseMode?: ReverseMode
) => void;

/**
 * BehaviorCoordinator - Focused Behavior Decision Logic
 * 
 * Extracted from EventAnimationCoordinator to separate behavior logic from event handling.
 * Handles all interrupt behaviors and animation behavior decisions.
 */
export class BehaviorCoordinator {
    private queuedIntents: Map<string, QueuedIntent>;
    private animationExecutor: AnimationExecutor;
    
    constructor(animationExecutor: AnimationExecutor) {
        this.queuedIntents = new Map();
        this.animationExecutor = animationExecutor;
    }
    
    /**
     * Handle behavior decision and animation execution with interrupt behavior support
     * 
     * 🚨 NEW: Enhanced with configurable interrupt behavior
     * - IMMEDIATE: Cancel current and start new (original behavior)
     * - BLOCK: Ignore new triggers while animating
     * - QUEUE_LATEST: Queue only the most recent trigger
     */
    handleBehaviorDecision(
        trigger: TriggerElement,
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): void {
        // Intercept loop and ping-pong behaviors and do not route to the decision engine
        if (
            trigger.behavior === AnimationBehavior.START_LOOP ||
            trigger.behavior === AnimationBehavior.STOP_LOOP ||
            trigger.behavior === AnimationBehavior.START_PING_PONG ||
            trigger.behavior === AnimationBehavior.STOP_PING_PONG
        ) {
            // These are handled by EventAnimationCoordinator and runners
            console.log(`[BehaviorCoordinator] Skipping decision engine for loop/ping-pong behavior: ${trigger.behavior}`);
            return;
        }
        // Only handle one-shot and delayed triggers now
        console.log(`🚨 [BehaviorCoordinator] Handling trigger with interrupt behavior: ${slot.interruptBehavior}`);
        // Get interrupt behavior (default to IMMEDIATE for backward compatibility)
        const interruptBehavior = slot.interruptBehavior || InterruptBehavior.IMMEDIATE;
        // Route to appropriate handler based on interrupt behavior
        switch (interruptBehavior) {
            case InterruptBehavior.IMMEDIATE:
                this.executeImmediately(trigger, slot, animatedElements);
                break;
            case InterruptBehavior.BLOCK:
                this.blockIfAnimating(trigger, slot, animatedElements);
                break;
            case InterruptBehavior.QUEUE_LATEST:
                this.queueLatestIntent(trigger, slot, animatedElements);
                break;
            default:
                console.warn(`🚨 [BehaviorCoordinator] Unknown interrupt behavior: ${interruptBehavior}, falling back to IMMEDIATE`);
                this.executeImmediately(trigger, slot, animatedElements);
        }
    }
    
    /**
     * IMMEDIATE behavior: Cancel current animation and start new one immediately
     * This is the original behavior, preserved for backward compatibility
     */
    private executeImmediately(
        trigger: TriggerElement,
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): void {
        console.log(`🚨 [BehaviorCoordinator] IMMEDIATE: Starting animation immediately`);
        
        // Clear any queued intent for this slot
        this.queuedIntents.delete(slot.id);
        
        // Original behavior decision logic
        const currentState = animationStateManager.getState(slot.id);
        const currentProgress = currentState ? currentState.progress : 0.0;
        
        // Decide behavior with override support
        const overrideState = trigger.overrideState || false;
        const decision = animationStateManager.decideBehavior(slot.id, trigger.behavior, overrideState);
        
        // Cancel existing animations
        animationStateManager.cancelActiveAnimations(slot.id);
        
        // Update target immediately
        animationStateManager.updateTarget(slot.id, decision.targetProgress);
        
        // Handle override state
        const effectiveStartProgress = decision.overrideStartProgress ?? currentProgress;
        
        // Check for do-nothing decision
        const isDoNothingDecision = Math.abs(effectiveStartProgress - decision.targetProgress) < 0.01;

        console.log(`🚨 [BehaviorCoordinator] Decision analysis:`, {
            slotId: slot.id,
            behavior: trigger.behavior,
            currentProgress: currentProgress.toFixed(3),
            effectiveStartProgress: effectiveStartProgress.toFixed(3),
            targetProgress: decision.targetProgress.toFixed(3),
            difference: Math.abs(effectiveStartProgress - decision.targetProgress).toFixed(3),
            threshold: 0.01,
            isDoNothingDecision,
            overrideState: trigger.overrideState || false,
            overrideStartProgress: decision.overrideStartProgress ?? 'none'
        });

        if (isDoNothingDecision) {
            console.log(`🚨 [BehaviorCoordinator] ❌ DO-NOTHING DECISION - Animation will be skipped!`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Slot: ${slot.id}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Behavior: ${trigger.behavior}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Current Progress: ${currentProgress.toFixed(3)}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Effective Start: ${effectiveStartProgress.toFixed(3)}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Target Progress: ${decision.targetProgress.toFixed(3)}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Difference: ${Math.abs(effectiveStartProgress - decision.targetProgress).toFixed(3)}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ Override Start: ${decision.overrideStartProgress ?? 'none'}`);
            console.log(`🚨 [BehaviorCoordinator] ➤ This might be the reason toggle/reverse animations aren't working!`);
            return;
        }
        
        // Execute animation via callback
        this.animationExecutor(
            slot,
            animatedElements,
            trigger.behavior,
            effectiveStartProgress,
            trigger.reverseMode
        );
    }
    
    /**
     * BLOCK behavior: Ignore new triggers while animation is playing
     * Provides smooth, uninterruptible animations
     */
    private blockIfAnimating(
        trigger: TriggerElement,
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): void {
        const currentState = animationStateManager.getState(slot.id);
        const isAnimating = currentState && currentState.status === 'running';
        
        if (isAnimating) {
            console.log(`🚨 [BehaviorCoordinator] BLOCK: Ignoring trigger, animation already running`);
            return;
        }
        
        console.log(`🚨 [BehaviorCoordinator] BLOCK: No animation running, executing trigger`);
        
        // Clear any queued intent for this slot
        this.queuedIntents.delete(slot.id);
        
        // Execute normally (same as immediate when not blocked)
        this.executeImmediately(trigger, slot, animatedElements);
    }
    
    /**
     * QUEUE_LATEST behavior: Queue only the most recent trigger, execute when current completes
     * Provides responsive UX while maintaining smooth animations
     */
    private queueLatestIntent(
        trigger: TriggerElement,
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): void {
        const currentState = animationStateManager.getState(slot.id);
        const isAnimating = currentState && currentState.status === 'running';
        
        // 🔍 STAGGER DEBUG: Log state manager status for debugging
        console.log(`🔍 [STAGGER-DEBUG] QUEUE_LATEST state check:`, {
            slotId: slot.id,
            currentState: currentState ? {
                progress: currentState.progress.toFixed(3),
                status: currentState.status,
                targetProgress: currentState.targetProgress.toFixed(3)
            } : null,
            isAnimating,
            shouldExecuteImmediately: !isAnimating
        });
        
        if (!isAnimating) {
            // No animation running, execute immediately
            console.log(`🚨 [BehaviorCoordinator] QUEUE_LATEST: No animation running, executing immediately`);
            this.executeImmediately(trigger, slot, animatedElements);
            return;
        }
        
        // Animation is running, queue this intent (replacing any previous)
        console.log(`🚨 [BehaviorCoordinator] QUEUE_LATEST: Queueing intent, replacing any previous`);
        
        const queuedIntent: QueuedIntent = {
            trigger,
            slot,
            animatedElements,
            timestamp: Date.now()
        };
        
        // Replace any existing queued intent for this slot
        this.queuedIntents.set(slot.id, queuedIntent);
        
        // NOTE: Queued intent will be executed via event-driven completion in EventAnimationCoordinator
    }
    
    /**
     * 🎯 NEW: Event-driven queued intent execution (replaces polling-based approach)
     * Executes queued intents immediately when animations complete (no setTimeout delays)
     * 
     * Called by EventAnimationCoordinator when animations complete
     */
    executeQueuedIntentIfExists(slotId: string): void {
        const queuedIntent = this.queuedIntents.get(slotId);
        if (queuedIntent) {
            console.log(`🚨 [BehaviorCoordinator] QUEUE_LATEST: Executing queued intent after completion (event-driven)`);
            this.queuedIntents.delete(slotId);
            this.executeImmediately(queuedIntent.trigger, queuedIntent.slot, queuedIntent.animatedElements);
        }
    }
    
    /**
     * Get the current queued intent for a slot (for debugging/inspection)
     */
    getQueuedIntent(slotId: string): QueuedIntent | undefined {
        return this.queuedIntents.get(slotId);
    }
    
    /**
     * Clear all queued intents (for cleanup)
     */
    clearAllQueuedIntents(): void {
        this.queuedIntents.clear();
    }
    
    /**
     * Clear queued intent for specific slot (for cleanup)
     */
    clearQueuedIntent(slotId: string): void {
        this.queuedIntents.delete(slotId);
    }
} 