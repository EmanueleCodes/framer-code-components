/**
 * @file EventAnimationCoordinator.ts
 * @description Coordinates event-triggered animations with simplified stagger support
 * 
 * @version 3.1.0 - Simplified Stagger Architecture
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const coordinator = new EventAnimationCoordinator();
 * const cleanup = coordinator.executeEventAnimation(slot, parentElement);
 * // Later: cleanup();
 * ```
 */

import {
    AnimationSlot,
    EventType,
    ReverseMode,
    AnimationDirection,
    AnimationBehavior,
    InterruptBehavior,
    QueuedIntent,
    AnimationStatus,
    ElementScope,
    CriteriaType
} from '../../types/index.ts';

import type { TriggerElement } from '../../types/index.ts';
import type { BehaviorDecision } from '../state/BehaviorDecisionEngine.ts';

import { MasterTimeline } from '../timeline/MasterTimeline.ts';
import { MasterTimelinePlayer } from '../timeline/MasterTimelinePlayer.ts';
import { MasterTimelineBuilder } from '../timeline/MasterTimeline.ts';
import { findTriggerElementsWithCriteria, findAnimatedElementsWithCriteria } from '../../dom/ElementFinder.ts';
import { animationStateManager } from '../state/AnimationStateManager.ts';
import { InitialValueCoordinator } from './InitialValueCoordinator.ts';
import { StaggerCoordinator } from '../../utils/staggering/StaggerCoordinator.ts';
import { BehaviorCoordinator, type AnimationExecutor } from './BehaviorCoordinator.ts';

// Import animators
import { TimedAnimator } from '../../execution/TimedAnimator.ts';
import { scrollAnimator } from '../../execution/ScrollAnimator.ts';

// 🎨 FEATURE 2B: Text Processing Integration (Phase 1)
import { TextSplitter } from '../../utils/text/TextSplitter.ts';

// 📊 FEATURE 3A: Distributed Properties Integration (Phase 3)
import { expandDistributedProperties } from '../../config/adapters/AnimationSlotAdapter.ts';

// 🚀 NEW: Scroll Direction Detection (Phase 1)
import { globalScrollDirectionDetector, ScrollDirection } from '../../events/ScrollDirectionDetector.ts';

// 🌍 NEW: Environment Detection (Phase 3)
import { EnvironmentDetector } from '../../utils/environment/EnvironmentDetector.ts';

import { LoopRunner } from '../looping/LoopRunner.ts';
import { PingPongRunner } from '../looping/PingPongRunner.ts';
import { DelayedTriggerManager } from './DelayedTriggerManager.ts';

/**
 * EventAnimationCoordinator - Focused Event Handling Logic
 * 
 * Extracted from AnimationOrchestrator to provide single responsibility
 * for event-driven animation coordination.
 */
export class EventAnimationCoordinator {
    private masterTimelinePlayer: MasterTimelinePlayer;
    private initialValueCoordinator: InitialValueCoordinator;
    private staggerCoordinator: StaggerCoordinator;
    private behaviorCoordinator: BehaviorCoordinator;
    
    // 🔄 NEW: Track reverse behavior phases for proper stagger coordination
    private reverseBehaviorPhases: Map<string, {
        originalBehavior: AnimationBehavior;
        currentPhase: 1 | 2;
        slot: AnimationSlot;
        animatedElements: HTMLElement[];
        reverseMode?: ReverseMode;
        totalElements: number;
        phase1CompletedElements: Set<HTMLElement>;
        phase2CompletedElements: Set<HTMLElement>;
        phase2Started: boolean;
    }> = new Map();
    
    // Add runner maps
    private loopRunners: Map<string, LoopRunner> = new Map();
    private pingPongRunners: Map<string, PingPongRunner> = new Map();
    
    // 🎯 NEW: Delayed trigger pattern management
    private delayedTriggerManager: DelayedTriggerManager;
    
    constructor() {
        this.masterTimelinePlayer = new MasterTimelinePlayer();
        this.initialValueCoordinator = new InitialValueCoordinator();
        this.staggerCoordinator = new StaggerCoordinator();
        this.delayedTriggerManager = new DelayedTriggerManager();
        
        // Create animation executor callback for BehaviorCoordinator
        const animationExecutor: AnimationExecutor = async (
            slot: AnimationSlot,
            animatedElements: HTMLElement[],
            behavior: string,
            startProgress: number,
            reverseMode?: ReverseMode
        ) => {
            await this.executeTimelineForElements(slot, animatedElements, behavior, startProgress, reverseMode);
        };
        
        this.behaviorCoordinator = new BehaviorCoordinator(animationExecutor);
        
        // ✅ CONFLICT FIXED: Don't reset global scroll direction detector in constructor
        // This was causing conflicts when multiple components created EventAnimationCoordinators
        // Only reset when actually setting up scroll direction change (in setupTriggerListeners)
        // console.log(`🔄 [EventAnimationCoordinator] Initialized - global scroll direction detector will only be reset if used`);
    }
    
    /**
     * Execute event-driven animation with behavior support
     * 
     * COPIED FROM: AnimationOrchestrator.handleEventAnimation()
     * 
     * 🔧 REFACTOR R3.1: Now handles element finding and initial values internally
     * 🎨 FEATURE 2B: Made async to support text processing integration
     */
    async executeEventAnimation(
        slot: AnimationSlot, 
        parentElement: HTMLElement,
        showInitialValuesInCanvas: boolean = false,
        textElementCallbacks?: {
            updateElementRefs?: (elements: HTMLElement[], splitType?: any) => void,
            registerForSplitCallbacks?: (elementId: string) => void,
            retargetAnimations?: () => void,
            addRetargetCallback?: (callback: () => void) => void
        }
    ): Promise<() => void> {
        console.log(`🎛️ [EventAnimationCoordinator] Executing event animation for slot: ${slot.id}`);
        
        const cleanupFunctions: (() => void)[] = [];
        const showInitial = showInitialValuesInCanvas;
        
        try {
            // 🔧 REFACTOR R3.1: Find animated elements internally (now async for text processing)
            const animatedElements = await this.findAnimatedElements(slot, parentElement, textElementCallbacks);
            
            console.log(`🔍 [EventAnimationCoordinator] Found ${animatedElements.length} animated elements for slot: ${slot.id}`);
            
            if (animatedElements.length === 0) {
                console.warn(`🎛️ [EventAnimationCoordinator] No animated elements for slot: ${slot.id}`);
                return () => {};
            }
            
            // 🔄 NEW: Register retarget callback to keep animatedElements in sync after responsive re-splits
            if (textElementCallbacks?.addRetargetCallback) {
                const unregister = textElementCallbacks.addRetargetCallback(() => {
                    this.findAnimatedElements(slot, parentElement, textElementCallbacks)
                        .then(newElements => {
                            // Mutate array in place so existing references (in event listeners) stay valid
                            animatedElements.splice(0, animatedElements.length, ...newElements)
                            //console.log(`🔄 [EventAnimationCoordinator] Retargeted animated elements for slot ${slot.id}. New count: ${newElements.length}`)

                            // Apply current progress so visual state stays in sync after re-split
                            try {
                                const state = animationStateManager.getState(slot.id);
                                const currentProgress = state ? state.progress : 0;
                                if (slot.masterTimeline) {
                                    newElements.forEach(el => {
                                        this.masterTimelinePlayer.seekToProgress(slot.masterTimeline as any, el, currentProgress);
                                    });
                                }
                            } catch (err) {
                                console.error('Progress re-apply failed during retarget', err);
                            }
                        })
                        .catch(err => console.error('Retargeting failed', err))
                })
                // Ensure we clean up when this slot is disposed
                if (typeof unregister === 'function') {
                    cleanupFunctions.push(unregister)
                }
            }
            
            // 📊 FEATURE 3A: Expand distributed properties now that we know the elements
            const expandedSlot = expandDistributedProperties(slot, animatedElements);
            console.log(`📊 [EventAnimationCoordinator] Using ${expandedSlot === slot ? 'original' : 'expanded'} slot for execution`);
            
            // 🔧 REFACTOR R3.1: Handle initial values coordination
            this.initialValueCoordinator.applyInitialValues(expandedSlot, animatedElements, showInitial);
            
            // 🎯 SHARED MODE: All triggers animate all animated elements
            // console.log(`🎯 [EventAnimationCoordinator] Using SHARED mode - triggers animate all animated elements`);
            
            // ✅ PERFORMANCE OPTIMIZATION: Check if slot actually needs scroll direction detection
            const hasScrollDirectionTrigger = expandedSlot.triggers.some(
                trigger => trigger.event === EventType.SCROLL_DIRECTION_CHANGE
            );
            
            if (hasScrollDirectionTrigger) {
                console.log(`🚀 [EventAnimationCoordinator] PERFORMANCE: Scroll direction detection needed for slot ${expandedSlot.id}`);
                // Only reset when actually needed
                globalScrollDirectionDetector.reset();
            }
            
            expandedSlot.triggers.forEach((trigger, triggerIndex) => {
                if (trigger.event !== EventType.SCROLL) {
                    const eventCleanup = this.setupTriggerListeners(
                        trigger, 
                        parentElement,
                        expandedSlot, 
                        animatedElements
                    );
                    cleanupFunctions.push(...eventCleanup);
                } else {
                    // 🎯 NEW: Handle scroll events in shared mode
                    const scrollCleanup = this.setupScrollTriggerListeners(
                        trigger,
                        parentElement,
                        expandedSlot,
                        'shared',
                        animatedElements
                    );
                    cleanupFunctions.push(...scrollCleanup);
                }
            });
            
            return () => {
                //console.log(`🎛️ [EventAnimationCoordinator] Cleaning up event animation: ${expandedSlot.id}`);
                cleanupFunctions.forEach(cleanup => cleanup());
                
                // 🚨 SAFETY: Stop any running loops or ping-pongs for this slot
                this.stopLoopRunner(expandedSlot.id);
                this.stopPingPongRunner(expandedSlot.id);
                
                // 🎯 CLEANUP: Reset delayed trigger state for this slot
                this.delayedTriggerManager.resetSlot(expandedSlot.id);
                
                animationStateManager.cleanup(expandedSlot.id);
            };
            
        } catch (error) {
            console.error(`🎛️ [EventAnimationCoordinator] Error setting up event animation:`, error);
            return () => {};
        }
    }
    
    /**
     * Find animated elements based on slot configuration
     * 
     * 🔧 REFACTOR R3.1: Moved from AnimationOrchestrator
     * 🎨 FEATURE 2B: Added text processing integration (Phase 1)
     */
    private async findAnimatedElements(
        slot: AnimationSlot, 
        parentElement: HTMLElement,
        textElementCallbacks?: {
            updateElementRefs?: (elements: HTMLElement[], splitType?: any) => void,
            registerForSplitCallbacks?: (elementId: string) => void,
            retargetAnimations?: () => void,
            addRetargetCallback?: (callback: () => void) => void
        }
    ): Promise<HTMLElement[]> {
        const allAnimatedElements: HTMLElement[] = [];
        
        console.log(`🔍 [EventAnimationCoordinator] Looking for animated elements. Slot has ${slot.animatedElements.length} configs`);
        
        for (const animatedElementConfig of slot.animatedElements) {
            try {
                console.log(`🔍 [EventAnimationCoordinator] Processing config:`, {
                    scope: animatedElementConfig.selection.scope,
                    hasTextProcessing: !!animatedElementConfig.textProcessing?.enabled
                });
                
                const elements = findAnimatedElementsWithCriteria(
                    parentElement,
                    animatedElementConfig.selection,
                    false // Normal debug logging
                );
                
                console.log(`🔍 [EventAnimationCoordinator] Found ${elements.length} base elements for this config`);
                
                // 🎨 FEATURE 2B: Text processing integration (Phase 1)
                if (animatedElementConfig.textProcessing?.enabled) {
                    console.log(`🔍 [EventAnimationCoordinator] Text processing enabled for ${elements.length} elements`);
                    // Process each element for text splitting
                    for (const element of elements) {
                        try {
                            // 🔥 CRITICAL FIX: Use animateBy-specific selector instead of broad selector
                            // OLD PROBLEM: element.querySelectorAll('.fame-text-line, .fame-text-word, .fame-text-char')
                            // This caused lines to be included when animating by characters/words
                            const animateBy = animatedElementConfig.textProcessing.animateBy;
                            let existingSplitSelector: string;
                            
                            switch (animateBy) {
                                case 'lines':
                                    // 🔧 FIX: When animating by lines, select text lines (not mask containers)
                                    // Masks stay static, text lines get animated
                                    existingSplitSelector = '.fame-text-line';
                                    break;
                                case 'characters':
                                    // When animating by characters, select ONLY character elements
                                    existingSplitSelector = '.fame-text-char';
                                    break;
                                case 'words':
                                    // When animating by words, select ONLY word elements  
                                    existingSplitSelector = '.fame-text-word';
                                    break;
                                default:
                                    // Fallback to previous behavior for unknown animateBy values
                                    existingSplitSelector = '.fame-text-line, .fame-text-word, .fame-text-char';
                                    console.warn(`🚨 [EventAnimationCoordinator] Unknown animateBy value: ${animateBy}`);
                            }
                            
                            // 🔍 LOG: Processing text element for splitting
                            console.log(`🔍 [EventAnimationCoordinator] Processing text element for splitting:`, {
                                elementId: element.getAttribute('data-fame-element-id') || element.id || 'no-id',
                                animateBy: animateBy
                            });
                            
                            // 🔥 CRITICAL FIX: Smart element reuse with style change detection
                            // Instead of always reusing, check if elements might be stale due to style changes
                            const existingSplitElements = Array.from(element.querySelectorAll(existingSplitSelector)) as HTMLElement[];
                            
                            if (existingSplitElements.length > 0) {
                                // Check if existing elements are potentially stale
                                const shouldForceResplit = this.shouldForceResplitForStyleChanges(element, existingSplitElements);
                                
                                if (shouldForceResplit) {
                                    console.log(`🔄 [EventAnimationCoordinator] 🚨 FORCING RE-SPLIT: Style changes detected, existing elements may be stale`);
                                    
                                    // Force cleanup and re-split
                                    await this.forceResplitTextElement(element, animatedElementConfig.textProcessing);
                                    
                                    // Get the newly created elements
                                    const newSplitElements = Array.from(element.querySelectorAll(existingSplitSelector)) as HTMLElement[];
                                    if (newSplitElements.length > 0) {
                                        console.log(`🔄 [EventAnimationCoordinator] ✅ Re-split complete: ${newSplitElements.length} fresh ${animateBy} elements`);
                                        allAnimatedElements.push(...newSplitElements);
                                        
                                        // Update React refs for the new elements
                                        if (textElementCallbacks?.updateElementRefs) {
                                            textElementCallbacks.updateElementRefs(newSplitElements, animatedElementConfig.textProcessing.splitType);
                                        }
                                    } else {
                                        console.warn(`🔄 [EventAnimationCoordinator] Re-split failed, falling back to original element`);
                                        allAnimatedElements.push(element);
                                    }
                                } else {
                                    // Safe to reuse existing elements
                                    console.log(`🔧 [EventAnimationCoordinator] ✅ Reusing ${existingSplitElements.length} existing ${animateBy} elements (${existingSplitSelector}) - no style changes detected`);
                                    allAnimatedElements.push(...existingSplitElements);
                                }
                                continue; // Skip to next element
                            }
                            
                            console.log(`🔍 [EventAnimationCoordinator] No existing split elements found, calling TextSplitter.splitText()`);
                            
                            const result = await TextSplitter.getInstance().splitText(
                                element,
                                animatedElementConfig.textProcessing
                            );
                            
                            console.log(`🔍 [EventAnimationCoordinator] TextSplitter result:`, {
                                success: result.success,
                                splitElementsCount: result.splitElements?.length || 0,
                                error: result.error
                            });
                            
                            if (result.success && result.splitElements.length > 0) {
                                // 🔥 NEW: Update React refs for the new text elements
                                if (textElementCallbacks?.updateElementRefs) {
                                    textElementCallbacks.updateElementRefs(result.splitElements, animatedElementConfig.textProcessing.splitType);
                                }

                                // 🔥 NEW: Register for future split callbacks (for responsive resize)
                                if (textElementCallbacks?.registerForSplitCallbacks) {
                                    const elementId = element.getAttribute('data-fame-element-id') || element.id;
                                    if (elementId) {
                                        textElementCallbacks.registerForSplitCallbacks(elementId);
                                    }
                                }
                                
                                // Filter out any disconnected elements before adding to animation pool
                                const connectedElements = result.splitElements.filter(el => el.isConnected && document.contains(el));
                                allAnimatedElements.push(...connectedElements);
                            } else {
                                // Fallback: add original element if splitting failed
                                allAnimatedElements.push(element);
                            }
                        } catch (textError) {
                            console.error(`Text processing failed for element:`, textError);
                            // Fallback: add original element
                            allAnimatedElements.push(element);
                        }
                    }
                } else {
                    // Standard element processing (no text splitting)
                    allAnimatedElements.push(...elements);
                }
            } catch (error) {
                console.error(`Failed to find elements for config:`, error);
            }
        }
        
        console.log(`🔍 [EventAnimationCoordinator] ✅ Total animated elements found: ${allAnimatedElements.length}`);
        
        // 📊 FEATURE 3A: Add element index tracking for distributed properties
        allAnimatedElements.forEach((element, index) => {
            element.setAttribute('data-fame-element-index', index.toString());
        });
        
        return allAnimatedElements;
    }
    
    /**
     * Setup event listeners for trigger elements
     * 🔥 FIXED: Multiple animations can now share the same trigger element + event type
     */
    private setupTriggerListeners(
        trigger: TriggerElement,
        parentElement: HTMLElement,
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): (() => void)[] {
        const cleanupFunctions: (() => void)[] = [];
        
        // 🚨 SPECIAL CASE: SCROLL_DIRECTION_CHANGE is a global event that doesn't need trigger elements
        if (trigger.event === EventType.SCROLL_DIRECTION_CHANGE) {
            // console.log(`🚨 [EventAnimationCoordinator] [DEBUG] Setting up GLOBAL SCROLL_DIRECTION_CHANGE event for slot: ${slot.id}`);
            // console.log(`🚨 [EventAnimationCoordinator] [DEBUG] Global scroll direction detector available: ${!!globalScrollDirectionDetector}`);
            
            // ✅ PERFORMANCE OPTIMIZATION: Reset is now done upfront in executeEventAnimation only when needed
            // console.log(`🔄 [EventAnimationCoordinator] Reset global scroll direction detector for scroll direction change setup`);
            
            // 🔥 CRITICAL FIX: Store element resolver function instead of captured elements
            // This allows dynamic resolution of current elements, fixing the closure capture bug
            const elementResolver = () => {
                // Always resolve current elements dynamically - this fixes breakpoint change issues
                const currentElements = this.getCurrentAnimatedElements(slot.id, parentElement, slot);
                //console.log(`🔄 [EventAnimationCoordinator] Dynamic element resolution: found ${currentElements.length} current elements for slot ${slot.id}`);
                return currentElements;
            };
            
            // 🚀 Create slot-specific callback function
            const slotCallback = () => {
                const currentAnimatedElements = elementResolver();
                if (currentAnimatedElements.length === 0) {
                    console.warn(`🔄 [EventAnimationCoordinator] No current animated elements found for slot ${slot.id} - skipping animation`);
                    return;
                }

                // console.log(`🚨 [EventAnimationCoordinator] [DEBUG] SCROLL_DIRECTION_CHANGE callback executing for slot: ${slot.id}`);
                
                // 🚀 PHASE 1A: BehaviorCoordinator automatically extracts trigger.reverseMode
                this.behaviorCoordinator.handleBehaviorDecision(trigger, slot, currentAnimatedElements);
            };
            
            // Use global scroll direction detector
            const scrollDirectionCleanup = globalScrollDirectionDetector.startDetection((direction: ScrollDirection) => {
                // console.log(`🚨 [EventAnimationCoordinator] [DEBUG] SCROLL DIRECTION CALLBACK FIRED! Direction: ${direction}`);
                console.log(`🌊 [EventAnimationCoordinator] Scroll direction changed to: ${direction}`);
                slotCallback();
            });
            
            // console.log(`🚨 [EventAnimationCoordinator] [DEBUG] Scroll direction cleanup function: ${!!scrollDirectionCleanup}`);
            console.log(`🎯 [EventAnimationCoordinator] ✅ Added GLOBAL scroll direction detection for ${trigger.event} - slot: ${slot.id}`);
            
            // Return cleanup function for global scroll direction change
            cleanupFunctions.push(scrollDirectionCleanup);
            return cleanupFunctions;
        }
        
        // 🎯 ELEMENT-SPECIFIC EVENTS: Handle events that need trigger elements
        const triggerElements = findTriggerElementsWithCriteria(parentElement, trigger.selection);
        
        if (triggerElements.length === 0) {
            console.warn(`🎛️ [EventAnimationCoordinator] No trigger elements found`);
            return [];
        }

        // 🔥 CRITICAL FIX: Store element resolver function instead of captured elements
        // This allows dynamic resolution of current elements, fixing the closure capture bug
        const elementResolver = () => {
            // Always resolve current elements dynamically - this fixes breakpoint change issues
            const currentElements = this.getCurrentAnimatedElements(slot.id, parentElement, slot);
            console.log(`🔄 [EventAnimationCoordinator] Dynamic element resolution: found ${currentElements.length} current elements for slot ${slot.id}`);
            return currentElements;
        };
        
        triggerElements.forEach(triggerElement => {
            // 🚀 NEW: Use element+event based key (NOT slot-specific)
            // This allows multiple animations to share the same trigger
            const sharedElementKey = `__fame_listeners_${trigger.event}`;
            
            // 🚀 NEW: Get or create shared listener registry for this element+event combination
            if (!(triggerElement as any)[sharedElementKey]) {
                (triggerElement as any)[sharedElementKey] = {
                    listeners: new Map<string, {
                        slotId: string,
                        callback: () => void,
                        elementIds: string[],
                        timestamp: number
                    }>(),
                    domEventListener: null
                };
            }
            
            const sharedRegistry = (triggerElement as any)[sharedElementKey];
            
            // 🚀 NEW: Check if this specific slot already has a listener
            const existingSlotListener = sharedRegistry.listeners.get(slot.id);
            
            if (existingSlotListener) {
                const existingElementIds = existingSlotListener.elementIds;
                const currentElementIds = animatedElements.map(el => el.getAttribute('data-fame-element-id') || el.id || 'no-id');
                
                // Only skip if the animated elements are exactly the same
                if (existingElementIds.length === currentElementIds.length && 
                    existingElementIds.every((id: string, index: number) => id === currentElementIds[index])) {
                    console.log(`🔄 [EventAnimationCoordinator] Skipping duplicate listener - same elements for slot: ${slot.id}`);
                    return; // Skip only if elements haven't changed
                } else {
                    console.log(`🔄 [EventAnimationCoordinator] Elements changed, updating listener for slot: ${slot.id}`);
                    // Remove old slot-specific listener but keep shared DOM listener
                    sharedRegistry.listeners.delete(slot.id);
                }
            }

            // 🚀 NEW: Create slot-specific callback function
            const slotCallback = () => {
                const currentAnimatedElements = elementResolver();
                if (currentAnimatedElements.length === 0) {
                    console.warn(`🔄 [EventAnimationCoordinator] No current animated elements found for slot ${slot.id} - skipping animation`);
                    return;
                }

                // 🎯 NEW: Handle delayed trigger behaviors (skip patterns, etc.)
                if (trigger.behavior === AnimationBehavior.DELAYED_TRIGGER) {
                    const config = trigger.delayedTriggerConfig;
                    if (!config) {
                        console.warn(`🎯 [EventAnimationCoordinator] DELAYED_TRIGGER behavior requires delayedTriggerConfig`);
                        return;
                    }
                    
                    const result = this.delayedTriggerManager.shouldExecuteTrigger(slot.id, config);
                    
                    console.log(`🎯 [EventAnimationCoordinator] DELAYED_TRIGGER: ${result.debugInfo}`);
                    
                    if (!result.shouldExecute) {
                        console.log(`🎯 [EventAnimationCoordinator] DELAYED_TRIGGER: Ignoring trigger (pattern/skip logic)`);
                        return; // Don't execute animation
                    }
                    
                    // Execute with the configured behavior
                    const executionTrigger = {
                        ...trigger,
                        behavior: result.targetBehavior
                    };
                    
                    console.log(`🎯 [EventAnimationCoordinator] DELAYED_TRIGGER: Executing with behavior: ${result.targetBehavior}`);
                    this.behaviorCoordinator.handleBehaviorDecision(executionTrigger, slot, currentAnimatedElements);
                    return;
                }

                // Handle loop and ping-pong behaviors with runners
                // IMPORTANT: The runner must only trigger one-shot behaviors, never START_LOOP/START_PING_PONG
                if (trigger.behavior === AnimationBehavior.START_LOOP) {
                    this.stopLoopRunner(slot.id);
                    
                    // 🚨 SAFETY: Apply configuration limits and defaults
                    const config = trigger.loopConfig || { iterations: 3, delay: 500, behavior: AnimationBehavior.PLAY_FORWARD };
                    
                    // 🎯 USER CONFIGURATION: Respect user's 999 iterations as "infinite" but with reasonable safety limits
                    let safeIterations = config.iterations;
                    if (config.iterations >= 999) {
                        safeIterations = 1000; // Treat 999+ as 1000 (effectively infinite for user experience)
                        console.log(`🔄 [EventAnimationCoordinator] User set ${config.iterations} iterations - treating as infinite (1000 iterations)`);
                    } else {
                        safeIterations = Math.min(config.iterations, 1000); // Cap at 1000 for safety
                    }
                    
                    // 🎯 RESPECT USER'S 0 DELAY: Allow 0 delay when explicitly set, use default otherwise
                    const safeDelay = config.delay !== undefined ? Math.max(config.delay, 0) : 500; // Allow 0 when explicitly set, default to 500ms
                    
                    console.log(`🔄 [EventAnimationCoordinator] Starting LoopRunner with user config: ${safeIterations} iterations (user set: ${config.iterations}), ${safeDelay}ms delay`);
                    
                    const play = async () => {
                        this.behaviorCoordinator.handleBehaviorDecision(
                            { ...trigger, behavior: config.behavior, overrideState: true },
                            slot,
                            currentAnimatedElements
                        );
                        await animationStateManager.waitForCompletion(slot.id);
                    };
                    const runner = new LoopRunner({
                        iterations: safeIterations,
                        delay: safeDelay,
                        play
                    });
                    this.loopRunners.set(slot.id, runner);
                    runner.start();
                    console.log(`[EventAnimationCoordinator] Started LoopRunner for slot ${slot.id}`);
                    return;
                } else if (trigger.behavior === AnimationBehavior.STOP_LOOP) {
                    this.stopLoopRunner(slot.id);
                    console.log(`[EventAnimationCoordinator] Stopped LoopRunner for slot ${slot.id}`);
                    return;
                } else if (trigger.behavior === AnimationBehavior.START_PING_PONG) {
                    this.stopPingPongRunner(slot.id);
                    
                    // 🚨 SAFETY: Apply configuration limits and defaults  
                    const config = trigger.pingPongConfig || { cycles: 3, delay: 500, reverseMode: trigger.reverseMode || ReverseMode.EASING_PRESERVATION };
                    
                    // 🎯 USER CONFIGURATION: Respect user's 999 cycles as "infinite" but with reasonable safety limits
                    let safeCycles = config.cycles;
                    if (config.cycles >= 999) {
                        safeCycles = 1000; // Treat 999+ as 1000 (effectively infinite for user experience)
                        console.log(`🏓 [EventAnimationCoordinator] User set ${config.cycles} cycles - treating as infinite (1000 cycles)`);
                    } else {
                        safeCycles = Math.min(config.cycles, 1000); // Cap at 1000 for safety
                                         }
                     
                     // 🎯 RESPECT USER'S 0 DELAY: Allow 0 delay when explicitly set, use default otherwise
                     const safeDelay = config.delay !== undefined ? Math.max(config.delay, 0) : 500; // Allow 0 when explicitly set, default to 500ms
                     
                     console.log(`🏓 [EventAnimationCoordinator] Starting PingPongRunner with user config: ${safeCycles} cycles (user set: ${config.cycles}), ${safeDelay}ms delay`);
                    
                    const playForward = async () => {
                        this.behaviorCoordinator.handleBehaviorDecision(
                            { ...trigger, behavior: AnimationBehavior.PLAY_FORWARD, overrideState: true },
                            slot,
                            currentAnimatedElements
                        );
                        await animationStateManager.waitForCompletion(slot.id);
                    };
                    const playBackward = async () => {
                        this.behaviorCoordinator.handleBehaviorDecision(
                            { ...trigger, behavior: AnimationBehavior.PLAY_BACKWARD, reverseMode: config.reverseMode, overrideState: true },
                            slot,
                            currentAnimatedElements
                        );
                        await animationStateManager.waitForCompletion(slot.id);
                    };
                    const runner = new PingPongRunner({
                        cycles: safeCycles,
                        delay: safeDelay,
                        playForward,
                        playBackward
                    });
                    this.pingPongRunners.set(slot.id, runner);
                    runner.start();
                    console.log(`[EventAnimationCoordinator] Started PingPongRunner for slot ${slot.id}`);
                    return;
                } else if (trigger.behavior === AnimationBehavior.STOP_PING_PONG) {
                    this.stopPingPongRunner(slot.id);
                    console.log(`[EventAnimationCoordinator] Stopped PingPongRunner for slot ${slot.id}`);
                    return;
                }

                // 🚀 PHASE 1A: BehaviorCoordinator automatically extracts trigger.reverseMode
                this.behaviorCoordinator.handleBehaviorDecision(trigger, slot, currentAnimatedElements);
            };
            
            // 🚀 NEW: Register this slot's callback in the shared registry
            const currentElementIds = animatedElements.map(el => el.getAttribute('data-fame-element-id') || el.id || 'no-id');
            sharedRegistry.listeners.set(slot.id, {
                slotId: slot.id,
                callback: slotCallback,
                elementIds: currentElementIds,
                timestamp: Date.now()
            });
            
            // 🚀 NEW: Create or update the shared DOM event listener
            if (!sharedRegistry.domEventListener) {
                console.log(`🎯 [EventAnimationCoordinator] Creating shared DOM listener for ${trigger.event} on element`);
                
                // Create shared DOM event listener that triggers ALL registered slot callbacks
                const sharedDomListener = () => {
                    console.log(`🎯 [EventAnimationCoordinator] Shared ${trigger.event} event fired, triggering ${sharedRegistry.listeners.size} animations`);
                    
                    // Trigger all registered slot callbacks
                    sharedRegistry.listeners.forEach((listenerData, slotId) => {
                        try {
                            listenerData.callback();
                        } catch (error) {
                            console.error(`🎯 [EventAnimationCoordinator] Error triggering animation for slot ${slotId}:`, error);
                        }
                    });
                };
                
                // 🚀 LOAD event handling (SCROLL_DIRECTION_CHANGE now handled globally above)
                if (trigger.event === EventType.LOAD) {
                    // 🚀 FIXED: Simple load event handling that works in both Canvas and production
                    console.log(`🎯 [EventAnimationCoordinator] Setting up LOAD event for slot: ${slot.id}`);
                    
                    // 🚨 NEW: Skip load events in Canvas mode (like scroll events)
                    if (EnvironmentDetector.isCanvas()) {
                        console.log(`🎨 [EventAnimationCoordinator] Load animations disabled in Framer canvas environment`);
                        return;
                    }
                    
                    // 🚀 FIXED: Use a simple timeout-based approach that works everywhere
                    // This avoids window dependencies and Canvas mode issues
                    const loadTriggerDelay = 100; // Small delay to ensure DOM is ready
                    
                    // Create a simple load trigger that fires after a short delay
                    const loadTrigger = () => {
                        console.log(`🎯 [EventAnimationCoordinator] Load trigger fired for slot: ${slot.id}`);
                        sharedDomListener();
                    };
                    
                    // Fire the load trigger after a short delay
                    setTimeout(loadTrigger, loadTriggerDelay);
                    
                    // Store reference for cleanup (no DOM listener to clean up)
                    sharedRegistry.domEventListener = loadTrigger;
                    
                    console.log(`🎯 [EventAnimationCoordinator] ✅ Added load event trigger for ${trigger.event} - initial slot: ${slot.id}`);
                } else {
                    // Add the shared DOM event listener for normal events
                    triggerElement.addEventListener(trigger.event, sharedDomListener);
                    sharedRegistry.domEventListener = sharedDomListener;
                    
                    console.log(`🎯 [EventAnimationCoordinator] ✅ Added shared DOM listener for ${trigger.event} - initial slot: ${slot.id}`);
                }
            } else {
                console.log(`🎯 [EventAnimationCoordinator] ✅ Reusing shared DOM listener for ${trigger.event} - added slot: ${slot.id} (${sharedRegistry.listeners.size} total)`);
            }
            
            // 🚀 NEW: Return cleanup function that removes this slot's callback
            cleanupFunctions.push(() => {
                const registry = (triggerElement as any)[sharedElementKey];
                if (registry) {
                    // Remove this slot's callback from the shared registry
                    registry.listeners.delete(slot.id);
                    console.log(`🎯 [EventAnimationCoordinator] Removed slot ${slot.id} from shared listener (${registry.listeners.size} remaining)`);
                    
                    // If no more slots are listening, remove the DOM event listener
                    if (registry.listeners.size === 0 && registry.domEventListener) {
                        // 🚀 LOAD event and other DOM events cleanup (SCROLL_DIRECTION_CHANGE handled globally)
                        if (trigger.event === EventType.LOAD) {
                            // 🚀 FIXED: Load events use timeout-based triggers - no DOM cleanup needed
                            console.log(`🎯 [EventAnimationCoordinator] Load event cleanup - timeout-based trigger (no DOM cleanup needed)`);
                        } else {
                            // Normal DOM event listener cleanup
                            triggerElement.removeEventListener(trigger.event, registry.domEventListener);
                            console.log(`🎯 [EventAnimationCoordinator] Removed shared DOM listener for ${trigger.event} - no more slots listening`);
                        }
                        delete (triggerElement as any)[sharedElementKey];
                    }
                }
            });
        });
        
        return cleanupFunctions;
    }

    /**
     * 🚀 CLEAN: Setup scroll trigger listeners - simplified delegation to ScrollAnimator
     */
    private setupScrollTriggerListeners(
        trigger: TriggerElement,
        parentElement: HTMLElement,
        slot: AnimationSlot,
        mode: 'individual' | 'shared',
        animatedElements?: HTMLElement[]
    ): (() => void)[] {
        const cleanupFunctions: (() => void)[] = [];
        
        // Skip in Canvas mode
        if (EnvironmentDetector.isCanvas()) {
            console.log(`🎨 [EventAnimationCoordinator] Scroll animations disabled in Framer canvas environment`);
            return [];
        }
        
        // Extract scroll configuration
        const scrollThresholds = trigger.scrollThresholds;
        if (!scrollThresholds) {
            console.warn(`🌊 [EventAnimationCoordinator] No scroll thresholds found for trigger: ${trigger.event}`);
            return [];
        }
        
        const scrollConfig = {
            elementStart: scrollThresholds.elementStart,
            viewportThreshold: scrollThresholds.viewportThreshold,
            thresholdCrossedBackward: scrollThresholds.thresholdCrossedBackward !== 'none'
        };
        
        console.log(`🌊 [EventAnimationCoordinator] Delegating scroll animation to ScrollAnimator:`, {
            mode,
            scrollConfig,
            slotId: slot.id
        });
        
        // 🎯 UNIFIED BEHAVIOR: No longer needed - BehaviorCoordinator handles all behavior logic
        
        if (mode === 'individual') {
            // 🚨 CRITICAL FIX: Individual mode scroll with proper per-element handling
            console.log(`🌊 [EventAnimationCoordinator] Individual mode (SELF-SCROLL): Setting up per-element scroll triggers`);

            // Resolve all trigger elements (e.g., each paragraph)
            const triggerElements = findTriggerElementsWithCriteria(parentElement, trigger.selection);

            if (triggerElements.length === 0) {
                console.warn(`🌊 [EventAnimationCoordinator] No trigger elements found for SELF mode – falling back to raw trigger handling`);
                // Fallback: use animatedElements as both trigger and animated
                if (animatedElements && animatedElements.length > 0) {
                    animatedElements.forEach((element, index) => {
                        const elementSpecificSlotId = `${slot.id}-self-element-${index}`;
                        
                        const animationCallback = (scrollDirection?: 'forward' | 'backward') => {
                            console.log(`🌊 [EventAnimationCoordinator] Fallback individual scroll callback fired for element ${index}, direction: ${scrollDirection}`);
                            
                            // 🎯 SCROLL DIRECTION FIX: Use scroll direction to determine correct behavior
                            let effectiveBehavior = trigger.behavior;
                            
                            // If this is a scroll trigger with direction context, adjust behavior
                            if (scrollDirection) {
                                console.log(`🌊 [EventAnimationCoordinator] Fallback mode - Scroll direction: ${scrollDirection}, original behavior: ${trigger.behavior}`);
                                
                                // For certain behaviors, force the correct direction based on scroll direction
                                if (trigger.behavior === AnimationBehavior.TOGGLE || trigger.behavior === AnimationBehavior.PLAY_FORWARD) {
                                    if (scrollDirection === 'forward') {
                                        effectiveBehavior = AnimationBehavior.PLAY_FORWARD;
                                    } else if (scrollDirection === 'backward') {
                                        effectiveBehavior = AnimationBehavior.PLAY_BACKWARD;
                                    }
                                }
                                
                                console.log(`🌊 [EventAnimationCoordinator] Fallback mode - Effective behavior: ${effectiveBehavior}`);
                            }
                            
                            // 🎯 UNIFIED BEHAVIOR: Fire once like other events (click, mouseover, etc.)
                            // Let BehaviorCoordinator handle all logic with direction-adjusted behavior
                            const triggerForExecution: TriggerElement = {
                                ...trigger,
                                behavior: effectiveBehavior,
                                reverseMode: trigger.reverseMode
                            };
                            
                            // Create element-specific slot for isolated state tracking
                            const elementSpecificSlot: AnimationSlot = {
                                ...slot,
                                id: elementSpecificSlotId
                            };
                            
                            this.behaviorCoordinator.handleBehaviorDecision(
                                triggerForExecution,
                                elementSpecificSlot,
                                [element]
                            );
                        };

                        const cleanup = scrollAnimator.animateOnScroll(
                            { ...slot, id: elementSpecificSlotId },
                            element,
                            element,
                            scrollConfig,
                            animationCallback
                        );
                        cleanupFunctions.push(cleanup);
                    });
                }
            } else {
                triggerElements.forEach((triggerElement, index) => {
                    // Filter the processed elements that belong to this trigger (descendants)
                    const elementGroup = animatedElements?.filter(el => 
                        triggerElement.contains(el) || triggerElement === el
                    ) || [];

                    if (elementGroup.length === 0) {
                        console.warn(`🌊 [EventAnimationCoordinator] No animated elements found for trigger ${index}, using trigger as animated element`);
                        elementGroup.push(triggerElement);
                    }

                    const elementSpecificSlotId = `${slot.id}-trigger-${index}`;
                    
                    const animationCallback = (scrollDirection?: 'forward' | 'backward') => {
                        console.log(`🌊 [EventAnimationCoordinator] Individual scroll callback fired for trigger ${index}, elements: ${elementGroup.length}, direction: ${scrollDirection}`);
                        
                        // 🎯 SCROLL DIRECTION FIX: Use scroll direction to determine correct behavior
                        let effectiveBehavior = trigger.behavior;
                        
                        // If this is a scroll trigger with direction context, adjust behavior
                        if (scrollDirection) {
                            console.log(`🌊 [EventAnimationCoordinator] Individual mode - Scroll direction: ${scrollDirection}, original behavior: ${trigger.behavior}`);
                            
                            // For certain behaviors, force the correct direction based on scroll direction
                            if (trigger.behavior === AnimationBehavior.TOGGLE || trigger.behavior === AnimationBehavior.PLAY_FORWARD) {
                                if (scrollDirection === 'forward') {
                                    effectiveBehavior = AnimationBehavior.PLAY_FORWARD;
                                } else if (scrollDirection === 'backward') {
                                    effectiveBehavior = AnimationBehavior.PLAY_BACKWARD;
                                }
                            }
                            
                            console.log(`🌊 [EventAnimationCoordinator] Individual mode - Effective behavior: ${effectiveBehavior}`);
                        }
                        
                        // 🎯 UNIFIED BEHAVIOR: Fire once like other events (click, mouseover, etc.)
                        // Let BehaviorCoordinator handle all logic with direction-adjusted behavior
                        const triggerForExecution: TriggerElement = {
                            ...trigger,
                            behavior: effectiveBehavior,
                            reverseMode: trigger.reverseMode
                        };
                        
                        // Create element-specific slot for isolated state tracking
                        const elementSpecificSlot: AnimationSlot = {
                            ...slot,
                            id: elementSpecificSlotId
                        };
                        
                        this.behaviorCoordinator.handleBehaviorDecision(
                            triggerForExecution,
                            elementSpecificSlot,
                            elementGroup
                        );
                    };

                    const cleanup = scrollAnimator.animateOnScroll(
                        { ...slot, id: elementSpecificSlotId },
                        triggerElement,
                        triggerElement,
                        scrollConfig,
                        animationCallback
                    );
                    cleanupFunctions.push(cleanup);
                });
            }
        } else {
            // Shared mode: all animated elements are triggered together by a single scroll trigger
            const triggerElements = findTriggerElementsWithCriteria(parentElement, trigger.selection);
            const elements = animatedElements || [];

            if (triggerElements.length > 0 && elements.length > 0) {
                const triggerElement = triggerElements[0]; // Use first trigger element

                const animationCallback = (scrollDirection?: 'forward' | 'backward') => {
                    // 🎯 SCROLL DIRECTION FIX: Use scroll direction to determine correct behavior
                    let effectiveBehavior = trigger.behavior;
                    
                    // If this is a scroll trigger with direction context, adjust behavior
                    if (scrollDirection) {
                        console.log(`🌊 [EventAnimationCoordinator] Scroll direction: ${scrollDirection}, original behavior: ${trigger.behavior}`);
                        
                        // For certain behaviors, force the correct direction based on scroll direction
                        if (trigger.behavior === AnimationBehavior.TOGGLE || trigger.behavior === AnimationBehavior.PLAY_FORWARD) {
                            if (scrollDirection === 'forward') {
                                effectiveBehavior = AnimationBehavior.PLAY_FORWARD;
                            } else if (scrollDirection === 'backward') {
                                effectiveBehavior = AnimationBehavior.PLAY_BACKWARD;
                            }
                        }
                        
                        console.log(`🌊 [EventAnimationCoordinator] Effective behavior: ${effectiveBehavior}`);
                    }
                    
                    // 🎯 UNIFIED BEHAVIOR: Fire once like other events (click, mouseover, etc.)
                    // Let BehaviorCoordinator handle all logic with direction-adjusted behavior
                    const triggerForExecution: TriggerElement = {
                        ...trigger,
                        behavior: effectiveBehavior,
                        reverseMode: trigger.reverseMode
                    };
                    this.behaviorCoordinator.handleBehaviorDecision(
                        triggerForExecution,
                        slot,
                        elements
                    );
                };

                const cleanup = scrollAnimator.animateOnScroll(
                    slot,
                    triggerElement,     // Animated element (not important when using callback)
                    triggerElement,     // Trigger element to observe
                    scrollConfig,
                    animationCallback
                );
                cleanupFunctions.push(cleanup);
            }
        }
        
        return cleanupFunctions;
    }

    /**
     * 🔥 NEW: Dynamic element resolution method
     * This method always returns the current animated elements for a slot,
     * ensuring that event listeners work correctly even after DOM changes.
     */
    private getCurrentAnimatedElements(slotId: string, parentElement: HTMLElement, slot: AnimationSlot): HTMLElement[] {
        // This is a simplified version - in a full implementation, 
        // we'd cache the resolved elements and update them during retargeting
        
        // For now, we'll use a fallback approach that queries the DOM
        // This is less efficient but ensures correctness
        try {
            const allElements: HTMLElement[] = [];
            
            for (const animatedElementConfig of slot.animatedElements) {
                if (animatedElementConfig.textProcessing?.enabled) {
                    // For text processing, find the split elements
                    const elements = findAnimatedElementsWithCriteria(
                        parentElement,
                        animatedElementConfig.selection,
                        false // Disable debug logging for performance
                    );
                    
                    for (const element of elements) {
                        const animateBy = animatedElementConfig.textProcessing.animateBy;
                        let selector: string;
                        
                        switch (animateBy) {
                            case 'lines':
                                selector = '.fame-text-line';
                                break;
                            case 'characters':
                                selector = '.fame-text-char';
                                break;
                            case 'words':
                                selector = '.fame-text-word';
                                break;
                            default:
                                selector = '.fame-text-line, .fame-text-word, .fame-text-char';
                        }
                        
                        const splitElements = Array.from(element.querySelectorAll(selector)) as HTMLElement[];
                        if (splitElements.length > 0) {
                            allElements.push(...splitElements);
                        } else {
                            // Fallback to original element if no split elements found
                            allElements.push(element);
                        }
                    }
                } else {
                    // For non-text elements, use standard element finding
                    const elements = findAnimatedElementsWithCriteria(
                        parentElement,
                        animatedElementConfig.selection,
                        false
                    );
                    allElements.push(...elements);
                }
            }
            
            return allElements;
        } catch (error) {
            console.error(`🔄 [EventAnimationCoordinator] Error resolving current elements:`, error);
            return [];
        }
    }
    
    /**
     * Execute timeline animation for multiple elements
     */
    private async executeTimelineForElements(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode?: ReverseMode
    ): Promise<void> {

        if (!slot.masterTimeline) {
            console.warn('No master timeline found for slot:', slot.id);
            return;
        }

        // 🔄 NEW: Track reverse behaviors for Phase 2 coordination
        const behaviorEnum = behavior as AnimationBehavior;
        console.log(`🔍 [EventAnimationCoordinator] executeTimelineForElements - behavior: "${behavior}", slot: ${slot.id}`);
        
        let actualBehaviorForExecution = behavior;
        
        if (behaviorEnum === "playForwardAndReverse" || 
            behaviorEnum === "playBackwardAndReverse") {
            
            // Only track if this is Phase 1 (not already being tracked)
            if (!this.reverseBehaviorPhases.has(slot.id)) {
                console.log(`🔄 [EventAnimationCoordinator] Tracking reverse behavior Phase 1: ${behaviorEnum}`);
                this.reverseBehaviorPhases.set(slot.id, {
                    originalBehavior: behaviorEnum,
                    currentPhase: 1,
                    slot,
                    animatedElements,
                    reverseMode,
                    totalElements: animatedElements.length,
                    phase1CompletedElements: new Set(),
                    phase2CompletedElements: new Set(),
                    phase2Started: false
                });
                
                // 🎯 CRITICAL FIX: Convert to single-phase behavior for MasterTimelinePlayer
                // This prevents MasterTimelinePlayer from doing its own reverse coordination
                if (behaviorEnum === "playForwardAndReverse") {
                    actualBehaviorForExecution = "playForward"; // Phase 1 only
                } else if (behaviorEnum === "playBackwardAndReverse") {
                    actualBehaviorForExecution = "playBackward"; // Phase 1 only
                }
                console.log(`🔄 [EventAnimationCoordinator] Converting reverse behavior to single-phase: ${actualBehaviorForExecution}`);
            } else {
                console.log(`🔄 [EventAnimationCoordinator] Already tracking reverse behavior for slot: ${slot.id}`);
            }
        } else {
            console.log(`🔄 [EventAnimationCoordinator] Not a reverse behavior: ${behavior}`);
        }
        
        // Execute with stagger if enabled, otherwise execute all elements immediately
        if (slot.staggering?.enabled) {
            const executeCallback = (element: HTMLElement, delay: number) => {
                console.log(`🚨 [EventAnimationCoordinator] executeCallback called:`, {
                    elementTagName: element.tagName,
                    elementClasses: element.className,
                    elementTextContent: element.textContent?.slice(0, 20) + '...',
                    delay: delay,
                    behavior: actualBehaviorForExecution,
                    slotId: slot.id,
                    willExecuteIn: `${delay}ms`
                });
                
                setTimeout(() => {
                    console.log(`🚨 [EventAnimationCoordinator] setTimeout fired after ${delay}ms delay, calling executeTimelineForElement`);
                    
                    const cleanup = this.executeTimelineForElement(
                        slot,
                        element,
                        actualBehaviorForExecution, // Use converted behavior
                        startProgress,
                        reverseMode
                    );
                    
                    animationStateManager.registerAnimationCleanup(slot.id, cleanup);
                }, delay);
            };
            
            if (slot.staggering.strategy === 'grid') {
                this.staggerCoordinator.executeWithGridStagger(slot, animatedElements, actualBehaviorForExecution, startProgress, reverseMode, executeCallback);
            } else {
                this.staggerCoordinator.executeWithLinearStagger(slot, animatedElements, actualBehaviorForExecution, startProgress, reverseMode, executeCallback);
            }
        } else {
            // Normal execution (no stagger) - execute all elements immediately
            animatedElements.forEach(animatedElement => {
                const cleanup = this.executeTimelineForElement(
                    slot,
                    animatedElement,
                    actualBehaviorForExecution, // Use converted behavior
                    startProgress,
                    reverseMode
                );
                
                animationStateManager.registerAnimationCleanup(slot.id, cleanup);
            });
        }
    }

    
    /**
     * Execute timeline animation for a single element
     * 
     * COPIED FROM: AnimationOrchestrator.executeWithTimelineArchitecture()
     */
    private executeTimelineForElement(
        slot: AnimationSlot,
        animatedElement: HTMLElement,
        behavior: string,
        startProgress: number,
        reverseMode?: ReverseMode
    ): () => void {
        
        // 📊 FEATURE 3A: Handle distributed properties for this specific element
        let elementSpecificSlot = slot;
        
        // Check if any properties have distributed values
        const hasDistributedProperties = slot.properties.some(prop => 
            prop.distributedFromValues || prop.distributedToValues
        );
        
        if (hasDistributedProperties) {
            // Find the element index in the original elements array
            // We need to determine which index this element corresponds to
            const elementIndex = this.getElementIndex(animatedElement, slot);
            
            if (elementIndex !== -1) {
                console.log(`📊 [EventAnimationCoordinator] Using distributed values for element ${elementIndex}`);
                
                // Create element-specific properties with distributed values
                const elementSpecificProperties = slot.properties.map(property => {
                    if (property.distributedFromValues || property.distributedToValues) {
                        const elementFrom = property.distributedFromValues?.[elementIndex] ?? property.from;
                        const elementTo = property.distributedToValues?.[elementIndex] ?? property.to;
                        
                        console.log(`📊 [EventAnimationCoordinator] Property ${property.property} for element ${elementIndex}: from=${elementFrom}, to=${elementTo}`);
                        
                        return {
                            ...property,
                            from: elementFrom,
                            to: elementTo,
                            // Remove distributed arrays to avoid confusion
                            distributedFromValues: undefined,
                            distributedToValues: undefined
                        };
                    }
                    return property;
                });
                
                // Create element-specific slot
                elementSpecificSlot = {
                    ...slot,
                    properties: elementSpecificProperties
                };
                
                // Rebuild master timeline for this element with distributed values
                // We need to create a new master timeline with the element-specific values
                const builder = new MasterTimelineBuilder();
                const elementMasterTimeline = builder.buildMasterTimeline(elementSpecificProperties);
                elementSpecificSlot.masterTimeline = elementMasterTimeline;
                
                console.log(`📊 [EventAnimationCoordinator] Created element-specific timeline for element ${elementIndex}`);
            } else {
                console.warn(`📊 [EventAnimationCoordinator] Could not determine element index for distributed properties`);
            }
        }

        console.log(`🚨 [EventAnimationCoordinator] executeTimelineForElement called for element:`, {
            slotId: slot.id,
            elementTagName: animatedElement.tagName,
            elementClasses: animatedElement.className,
            elementTextContent: animatedElement.textContent?.slice(0, 30) + '...',
            behavior,
            startProgress,
            hasSlotMasterTimeline: !!slot.masterTimeline,
            hasElementSpecificMasterTimeline: !!elementSpecificSlot.masterTimeline,
            slotProperties: slot.properties?.length || 0
        });

        const masterTimeline = elementSpecificSlot.masterTimeline as MasterTimeline;
        
        if (!masterTimeline) {
            console.error(`🚨 [EventAnimationCoordinator] ❌ No master timeline found for slot: ${slot.id}`, {
                originalSlotHasTimeline: !!slot.masterTimeline,
                elementSpecificSlotHasTimeline: !!elementSpecificSlot.masterTimeline,
                propertiesCount: slot.properties?.length || 0,
                properties: slot.properties?.map(p => ({ property: p.property, from: p.from, to: p.to }))
            });
            return () => {};
        }
        
        // Create completion-aware progress callback
        const progressCallback = (progress: number) => {
            // Update progress with RUNNING status during animation
            animationStateManager.updateProgress(slot.id, progress, AnimationStatus.RUNNING);
        };
        
        // Execute behavior asynchronously
        const executeBehaviorAsync = async () => {
            try {
                const behaviorEnum = behavior as any;
                
                // 🚨 PRODUCTION DEBUG: Add detailed logging before MasterTimelinePlayer call
                // console.log(`🚨 [EventAnimationCoordinator] About to call MasterTimelinePlayer.executeBehavior:`, {
                //     behavior: behavior,
                //     behaviorEnum: behaviorEnum,
                //     elementTagName: animatedElement.tagName,
                //     elementTextContent: animatedElement.textContent?.slice(0, 30) + '...',
                //     startProgress: startProgress,
                //     masterTimelineExists: !!masterTimeline,
                //     masterTimelineDuration: masterTimeline?.totalDuration,
                //     reverseMode: reverseMode || ReverseMode.EASING_PRESERVATION
                // });
                
                // Mark as running when starting
                animationStateManager.updateProgress(slot.id, startProgress, AnimationStatus.RUNNING);
                
                // 🎯 CRITICAL FIX: Get the final expected progress from MasterTimelinePlayer
                console.log(`🚨 [EventAnimationCoordinator] Calling this.masterTimelinePlayer.executeBehavior now...`);
                
                let finalExpectedProgress;
                try {
                    finalExpectedProgress = await this.masterTimelinePlayer.executeBehavior(
                        behaviorEnum,
                        masterTimeline,
                        animatedElement,
                        startProgress,
                        progressCallback,
                        reverseMode || ReverseMode.EASING_PRESERVATION
                    );
                    
                    console.log(`🚨 [EventAnimationCoordinator] MasterTimelinePlayer.executeBehavior completed with finalExpectedProgress: ${finalExpectedProgress}`);
                } catch (executeBehaviorError) {
                    console.error(`🚨 [EventAnimationCoordinator] ERROR in MasterTimelinePlayer.executeBehavior:`, {
                        error: executeBehaviorError,
                        errorMessage: executeBehaviorError?.message,
                        errorStack: executeBehaviorError?.stack,
                        behavior: behavior,
                        behaviorEnum: behaviorEnum,
                        elementTagName: animatedElement.tagName,
                        masterTimelineExists: !!masterTimeline
                    });
                    throw executeBehaviorError; // Re-throw to be caught by outer try-catch
                }
                
                // 🔄 NEW: Check if this is a reverse behavior phase completing
                const phaseInfo = this.reverseBehaviorPhases.get(slot.id);
                //console.log(`🔍 [EventAnimationCoordinator] Completion check - behavior: "${behaviorEnum}", phaseInfo:`, phaseInfo);
                
                // 🎯 NEW: Group-based completion tracking for reverse behaviors
                if (phaseInfo && (phaseInfo.originalBehavior === "playForwardAndReverse" || 
                                 phaseInfo.originalBehavior === "playBackwardAndReverse")) {
                    
                    this.handleReverseBehaviorElementCompletion(slot.id, animatedElement, finalExpectedProgress);
                    
                } else {
                    // Normal completion (non-reverse behaviors)
                    // 🔧 CRITICAL FIX: Use the final expected progress from the behavior execution
                    // This ensures reset behaviors sync to the correct reset position
                    animationStateManager.updateProgress(slot.id, finalExpectedProgress, AnimationStatus.COMPLETED);
                    animationStateManager.updateTarget(slot.id, finalExpectedProgress);
                    
                    //console.log(`🔧 [EventAnimationCoordinator] Animation completed for slot ${slot.id}, status set to COMPLETED`);
                    
                    // 🎯 NEW: Check for queued intents (event-driven, no polling delays)
                    this.behaviorCoordinator.executeQueuedIntentIfExists(slot.id);
                }
                
            } catch (error) {
                console.error(`🚨 [EventAnimationCoordinator] Timeline execution error:`, error);
                // Mark as completed with current state on error
                const errorState = animationStateManager.getState(slot.id);
                const errorProgress = errorState ? errorState.progress : startProgress;
                animationStateManager.updateProgress(slot.id, errorProgress, AnimationStatus.COMPLETED);
                animationStateManager.updateTarget(slot.id, errorProgress);
                
                // Clean up reverse behavior tracking on error
                this.reverseBehaviorPhases.delete(slot.id);
            }
        };
        
        executeBehaviorAsync();
        
        return () => {
            // 🔥 CRITICAL FIX: Only stop the specific element's animation, not ALL animations
            if (this.masterTimelinePlayer.isPlaying(animatedElement)) {
                this.masterTimelinePlayer.stopElement(animatedElement);
            }
        };
    }

    // 🔄 NEW: Handle Phase 2 of reverse behaviors with proper stagger coordination
    /**
     * Handle automatic Phase 2 for reverse behaviors (PLAY_FORWARD_AND_REVERSE, PLAY_BACKWARD_AND_REVERSE)
     * This ensures Phase 2 uses the correct directional stagger order
     */
    private handleReverseBehaviorPhase2(slotId: string, currentProgress: number): void {
        const phaseInfo = this.reverseBehaviorPhases.get(slotId);
        
        if (!phaseInfo) {
            console.warn(`🔄 [EventAnimationCoordinator] No phase info found for reverse behavior Phase 2: ${slotId}`);
            return;
        }

        if (phaseInfo.currentPhase !== 1) {
            console.warn(`🔄 [EventAnimationCoordinator] Phase 2 called but current phase is: ${phaseInfo.currentPhase}`);
            return;
        }

        //console.log(`🔄 [EventAnimationCoordinator] Starting Phase 2 of reverse behavior: ${phaseInfo.originalBehavior}`);

        // Update to Phase 2
        phaseInfo.currentPhase = 2;
        this.reverseBehaviorPhases.set(slotId, phaseInfo);

        // Determine Phase 2 behavior and progress
        let phase2Behavior: string;
        let targetProgress: number;

        let phase2StartProgress: number;

        if (phaseInfo.originalBehavior === "playForwardAndReverse") {
            // Phase 1 was forward (0→1), Phase 2 is reverse (1→0)
            phase2Behavior = 'playBackward';  
            targetProgress = 0.0;
            phase2StartProgress = 1.0; // Start Phase 2 from where Phase 1 ended
        } else if (phaseInfo.originalBehavior === "playBackwardAndReverse") {
            // Phase 1 was backward (1→0), Phase 2 is forward (0→1) 
            phase2Behavior = 'playForward';   
            targetProgress = 1.0;
            phase2StartProgress = 0.0; // Start Phase 2 from where Phase 1 ended (0.0)
        } else {
            console.warn(`🔄 [EventAnimationCoordinator] Unknown reverse behavior: ${phaseInfo.originalBehavior}`);
            this.reverseBehaviorPhases.delete(slotId);
            return;
        }

        //console.log(`🔄 [EventAnimationCoordinator] Phase 2: ${phase2Behavior}, startProgress: ${phase2StartProgress}, target: ${targetProgress}`);
        //console.log(`🔄 [EventAnimationCoordinator] Phase 2 stagger config:`, phaseInfo.slot.staggering);

        // 🎯 CRITICAL FIX: Re-execute with stagger coordination for Phase 2
        // This ensures the correct directional stagger order is used
        //console.log(`🔄 [EventAnimationCoordinator] Executing Phase 2 with behavior: ${phase2Behavior}`);
        // Note: Not awaiting this call since it's event-driven and we don't want to block
        this.executeTimelineForElements(
            phaseInfo.slot,
            phaseInfo.animatedElements,
            phase2Behavior,
            phase2StartProgress, // Use correct start progress for Phase 2
            phaseInfo.reverseMode
        ).catch(error => {
            console.error(`🚨 [EventAnimationCoordinator] Phase 2 execution error:`, error);
        });
    }

    /**
     * 🎯 NEW: Handle individual element completion for reverse behaviors
     * Implements group-based phase completion tracking to prevent conflicts
     */
    private handleReverseBehaviorElementCompletion(slotId: string, element: HTMLElement, finalProgress: number): void {
        const phaseInfo = this.reverseBehaviorPhases.get(slotId);
        
        if (!phaseInfo) {
            console.warn(`🔄 [EventAnimationCoordinator] No phase info found for element completion: ${slotId}`);
            return;
        }

        if (phaseInfo.currentPhase === 1) {
            // Track Phase 1 completion
            phaseInfo.phase1CompletedElements.add(element);
            const phase1Complete = phaseInfo.phase1CompletedElements.size === phaseInfo.totalElements;
            
            //console.log(`🔄 [EventAnimationCoordinator] Phase 1 element completed: ${phaseInfo.phase1CompletedElements.size}/${phaseInfo.totalElements}`);
            
            if (phase1Complete && !phaseInfo.phase2Started) {
                //console.log(`🔄 [EventAnimationCoordinator] ALL Phase 1 elements completed - starting Phase 2`);
                
                // Mark Phase 2 as started to prevent multiple triggers
                phaseInfo.phase2Started = true;
                this.reverseBehaviorPhases.set(slotId, phaseInfo);
                
                // Don't mark as completed yet - Phase 2 will handle final completion
                animationStateManager.updateProgress(slotId, finalProgress, AnimationStatus.RUNNING);
                animationStateManager.updateTarget(slotId, finalProgress);
                
                // Trigger Phase 2 with proper stagger coordination
                // NOTE: handleReverseBehaviorPhase2 will set currentPhase to 2
                this.handleReverseBehaviorPhase2(slotId, finalProgress);
            }
            
        } else if (phaseInfo.currentPhase === 2) {
            // Track Phase 2 completion
            phaseInfo.phase2CompletedElements.add(element);
            const phase2Complete = phaseInfo.phase2CompletedElements.size === phaseInfo.totalElements;
            
            //console.log(`🔄 [EventAnimationCoordinator] Phase 2 element completed: ${phaseInfo.phase2CompletedElements.size}/${phaseInfo.totalElements}`);
            
            if (phase2Complete) {
                //console.log(`🔄 [EventAnimationCoordinator] ALL Phase 2 elements completed - reverse behavior finished!`);
                
                // Final completion of reverse behavior
                animationStateManager.updateProgress(slotId, finalProgress, AnimationStatus.COMPLETED);
                animationStateManager.updateTarget(slotId, finalProgress);
                
                // Clean up reverse behavior tracking
                this.markReverseBehaviorComplete(slotId);
                
                // 🎯 NEW: Check for queued intents (event-driven, no polling delays)
                this.behaviorCoordinator.executeQueuedIntentIfExists(slotId);
            }
        }
    }

    /**
     * Mark completion of reverse behavior phases
     */
    private markReverseBehaviorComplete(slotId: string): void {
        const phaseInfo = this.reverseBehaviorPhases.get(slotId);
        
        if (phaseInfo) {
            //console.log(`🔄 [EventAnimationCoordinator] Reverse behavior completed: ${phaseInfo.originalBehavior}`);
            this.reverseBehaviorPhases.delete(slotId);
        }
    }

    /**
     * 📊 FEATURE 3A: Helper function to determine element index for distributed properties
     * 
     * @description
     * Finds the index of the current element in the original elements array.
     * This is needed to map distributed values to the correct element.
     * 
     * @param element - The element to find the index for
     * @param slot - The animation slot (not used currently, but available for future logic)
     * @returns Element index or -1 if not found
     */
    private getElementIndex(element: HTMLElement, slot: AnimationSlot): number {
        // For now, use a simple approach based on element's data attribute or DOM position
        // This could be enhanced in the future with more sophisticated tracking
        
        // Try to get index from data attribute (if set during element finding)
        const indexAttr = element.getAttribute('data-fame-element-index');
        if (indexAttr !== null) {
            const index = parseInt(indexAttr, 10);
            if (!isNaN(index)) {
                return index;
            }
        }
        
        // Fallback: try to find element among siblings
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children) as HTMLElement[];
            const index = siblings.indexOf(element);
            if (index !== -1) {
                return index;
            }
        }
        
        // Last resort: return 0 (first element)
        console.warn(`📊 [EventAnimationCoordinator] Could not determine element index, using 0`);
        return 0;
    }

    /**
     * 🔥 NEW: Detect if existing split elements should be re-created due to style changes
     * This addresses the core issue where existing elements become stale after breakpoint style changes
     */
    private shouldForceResplitForStyleChanges(parentElement: HTMLElement, existingSplitElements: HTMLElement[]): boolean {
        try {
            // Strategy 1: Check if parent element has recent style modifications
            const parentStyleTimestamp = parentElement.getAttribute('data-fame-style-timestamp');
            const splitTimestamp = existingSplitElements[0]?.getAttribute('data-fame-split-timestamp');
            
            if (parentStyleTimestamp && splitTimestamp) {
                const parentTime = parseInt(parentStyleTimestamp);
                const splitTime = parseInt(splitTimestamp);
                
                // If parent was styled after split creation, force re-split
                if (parentTime > splitTime) {
                    console.log(`🔄 [EventAnimationCoordinator] Style timestamp mismatch: parent(${parentTime}) > split(${splitTime})`);
                    return true;
                }
            }
            
            // Strategy 2: Check for style attribute changes that indicate Framer breakpoint styling
            const hasFramerStyleAttrs = parentElement.hasAttribute('style') && 
                                      (parentElement.style.opacity !== '' || 
                                       parentElement.style.color !== '' ||
                                       parentElement.style.fontSize !== '' ||
                                       parentElement.style.transform !== '');
            
            // Strategy 3: Check if existing elements lack proper styling/attributes
            const firstSplitElement = existingSplitElements[0];
            if (firstSplitElement) {
                // Check if the split element is missing critical animation attributes
                const hasAnimationSetup = firstSplitElement.style.willChange || 
                                         firstSplitElement.style.transformOrigin ||
                                         firstSplitElement.hasAttribute('data-fame-element-id');
                
                if (!hasAnimationSetup) {
                    console.log(`🔄 [EventAnimationCoordinator] Missing animation setup on existing split elements`);
                    return true;
                }
            }
            
            // Strategy 4: Detect if we're in a breakpoint transition (heuristic)
            // Check if recent DOM mutations occurred (indicates Framer is changing things)
            const recentMutationIndicator = document.body.getAttribute('data-framer-mutation-timestamp');
            if (recentMutationIndicator) {
                const mutationTime = parseInt(recentMutationIndicator);
                const now = Date.now();
                
                // If DOM mutations happened within last 1 second, be more aggressive about re-splitting
                if (now - mutationTime < 1000) {
                    console.log(`🔄 [EventAnimationCoordinator] Recent DOM mutations detected, forcing re-split for safety`);
                    return true;
                }
            }
            
            // Strategy 5: For now, always force re-split when style attributes are present
            // This is conservative but should fix the immediate issue
            if (hasFramerStyleAttrs) {
                console.log(`🔄 [EventAnimationCoordinator] Framer style attributes detected on parent, forcing re-split`);
                return true;
            }
            
            return false; // Safe to reuse existing elements
            
        } catch (error) {
            console.warn(`🔄 [EventAnimationCoordinator] Error checking style changes, defaulting to re-split:`, error);
            return true; // When in doubt, re-split for safety
        }
    }

    /**
     * 🔥 NEW: Force re-splitting of a text element by cleaning up and re-creating split elements
     */
    private async forceResplitTextElement(element: HTMLElement, textProcessingConfig: any): Promise<void> {
        try {
            console.log(`🔄 [EventAnimationCoordinator] Force re-splitting text element:`, {
                elementId: element.getAttribute('data-fame-element-id') || element.id,
                currentChildren: element.children.length
            });
            
            // Clean up existing split elements using TextSplitter
            const textSplitter = TextSplitter.getInstance();
            const cleanupSuccess = textSplitter.cleanupSplitText(element);
            
            if (!cleanupSuccess) {
                console.warn(`🔄 [EventAnimationCoordinator] Cleanup failed, proceeding anyway`);
            }
            
            // Mark the parent element with timestamp to track this re-split
            element.setAttribute('data-fame-style-timestamp', Date.now().toString());
            
            // Force re-splitting
            const result = await textSplitter.splitText(element, textProcessingConfig);
            
            if (!result.success) {
                console.error(`🔄 [EventAnimationCoordinator] Force re-split failed:`, result.error);
                throw new Error(`Re-split failed: ${result.error}`);
            }
            
            // Mark new split elements with timestamp
            if (result.splitElements) {
                result.splitElements.forEach(splitEl => {
                    splitEl.setAttribute('data-fame-split-timestamp', Date.now().toString());
                });
            }
            
            console.log(`🔄 [EventAnimationCoordinator] ✅ Force re-split completed: ${result.splitElements?.length || 0} new elements`);
            
        } catch (error) {
            console.error(`🔄 [EventAnimationCoordinator] Force re-split error:`, error);
            throw error; // Re-throw to let caller handle fallback
        }
    }

    /**
     * 🎯 NEW: Map reverse behavior string to AnimationBehavior enum
     */
    private mapReverseBehaviorToAnimationBehavior(reverseBehavior: string): AnimationBehavior {
        switch (reverseBehavior) {
            case 'playReverse':
                return AnimationBehavior.PLAY_BACKWARD;
            case 'playForward':
                return AnimationBehavior.PLAY_FORWARD;
            case 'toggle':
                return AnimationBehavior.TOGGLE;
            case 'none':
                return AnimationBehavior.PLAY_ONCE;
            default:
                console.warn(`🚨 [EventAnimationCoordinator] Unknown reverse behavior: ${reverseBehavior}, defaulting to PLAY_ONCE`);
                return AnimationBehavior.PLAY_ONCE;
        }
    }

    // Add stop helpers
    private stopLoopRunner(slotId: string) {
        const runner = this.loopRunners.get(slotId);
        if (runner) runner.stop();
        this.loopRunners.delete(slotId);
    }
    private stopPingPongRunner(slotId: string) {
        const runner = this.pingPongRunners.get(slotId);
        if (runner) runner.stop();
        this.pingPongRunners.delete(slotId);
    }
}