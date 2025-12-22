/**
 * @file DelayedTriggerManager.ts
 * @description Manages delayed trigger behavior with support for both simple skip counts and advanced patterns
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const manager = new DelayedTriggerManager();
 * 
 * // Simple mode: Skip 3, execute on 4th
 * const shouldExecute1 = manager.shouldExecuteTrigger('slot1', { mode: 'simple', skipCount: 3, behavior: 'playForward' });
 * 
 * // Pattern mode: "0,0,1,0,1" repeating pattern
 * const shouldExecute2 = manager.shouldExecuteTrigger('slot2', { mode: 'pattern', pattern: '0,0,1,0,1', behavior: 'playForward' });
 * ```
 */

import { DelayedTriggerConfig, AnimationBehavior } from '../../types/index.ts';

interface SlotTriggerState {
    /** Current trigger count for this slot */
    triggerCount: number;
    /** For pattern mode: current position in the pattern */
    patternPosition: number;
    /** Parsed pattern array (e.g., [0,0,1,0,1]) */
    parsedPattern?: number[];
    /** Last used configuration */
    config: DelayedTriggerConfig;
}

/**
 * DelayedTriggerManager - Advanced Trigger Pattern Management
 * 
 * @description
 * Manages delayed trigger behaviors with support for:
 * - Simple skip count mode: "Skip N triggers, execute on (N+1)th"
 * - Advanced pattern mode: "0,0,1,0,1" where 0=ignore, 1=execute, pattern repeats
 * 
 * Each animation slot maintains its own trigger state for isolation.
 */
export class DelayedTriggerManager {
    private slotStates: Map<string, SlotTriggerState> = new Map();
    
    /**
     * Determine if a trigger should execute based on the delayed trigger configuration
     * 
     * @param slotId - Unique identifier for the animation slot
     * @param config - Delayed trigger configuration
     * @returns Object with execution decision and target behavior
     */
    shouldExecuteTrigger(slotId: string, config: DelayedTriggerConfig): {
        shouldExecute: boolean;
        targetBehavior: AnimationBehavior;
        debugInfo: string;
    } {
        // Get or create slot state
        let slotState = this.slotStates.get(slotId);
        
        if (!slotState) {
            slotState = {
                triggerCount: 0,
                patternPosition: 0,
                config: config
            };
            this.slotStates.set(slotId, slotState);
        }
        
        // Increment trigger count
        slotState.triggerCount++;
        
        const mode = config.mode || 'simple';
        const targetBehavior = config.behavior || AnimationBehavior.PLAY_FORWARD;
        
        if (mode === 'simple') {
            return this.handleSimpleMode(slotState, config, targetBehavior);
        } else if (mode === 'pattern') {
            return this.handlePatternMode(slotState, config, targetBehavior);
        } else {
            console.warn(`🎯 [DelayedTriggerManager] Unknown mode: ${mode}, falling back to simple`);
            return this.handleSimpleMode(slotState, config, targetBehavior);
        }
    }
    
    /**
     * Handle simple skip count mode
     */
    private handleSimpleMode(
        slotState: SlotTriggerState, 
        config: DelayedTriggerConfig,
        targetBehavior: AnimationBehavior
    ): { shouldExecute: boolean; targetBehavior: AnimationBehavior; debugInfo: string } {
        const skipCount = config.skipCount || 3;
        const shouldExecute = slotState.triggerCount > skipCount;
        
        if (shouldExecute) {
            // Reset counter after execution
            slotState.triggerCount = 0;
            console.log(`🎯 [DelayedTriggerManager] SIMPLE: Executing after ${skipCount} skips`);
        }
        
        const debugInfo = `Simple mode: trigger ${slotState.triggerCount}/${skipCount + 1}, execute: ${shouldExecute}`;
        
        return {
            shouldExecute,
            targetBehavior,
            debugInfo
        };
    }
    
    /**
     * Handle advanced pattern mode
     */
    private handlePatternMode(
        slotState: SlotTriggerState,
        config: DelayedTriggerConfig,
        targetBehavior: AnimationBehavior
    ): { shouldExecute: boolean; targetBehavior: AnimationBehavior; debugInfo: string } {
        // Parse pattern if needed
        if (!slotState.parsedPattern || slotState.config.pattern !== config.pattern) {
            slotState.parsedPattern = this.parsePattern(config.pattern || '0,0,1');
            slotState.config = config;
            slotState.patternPosition = 0;
            console.log(`🎯 [DelayedTriggerManager] PATTERN: Parsed pattern:`, slotState.parsedPattern);
        }
        
        const pattern = slotState.parsedPattern;
        const currentPatternValue = pattern[slotState.patternPosition];
        const shouldExecute = currentPatternValue === 1;
        
        console.log(`🎯 [DelayedTriggerManager] PATTERN: Position ${slotState.patternPosition}/${pattern.length - 1}, value: ${currentPatternValue}, execute: ${shouldExecute}`);
        
        // Advance pattern position
        slotState.patternPosition++;
        if (slotState.patternPosition >= pattern.length) {
            slotState.patternPosition = 0; // Restart pattern
            console.log(`🎯 [DelayedTriggerManager] PATTERN: Restarting pattern cycle`);
        }
        
        const debugInfo = `Pattern mode: ${config.pattern}, position: ${slotState.patternPosition - 1}, value: ${currentPatternValue}, execute: ${shouldExecute}`;
        
        return {
            shouldExecute,
            targetBehavior,
            debugInfo
        };
    }
    
    /**
     * Parse pattern string into number array
     * 
     * @param pattern - Pattern string like "0,0,1,0,1" or "0 0 1 0 1"
     * @returns Array of 0s and 1s
     */
    private parsePattern(pattern: string): number[] {
        try {
            // Support both comma and space separators
            const cleanPattern = pattern.replace(/\s+/g, ',').replace(/,+/g, ',');
            const parts = cleanPattern.split(',').map(part => part.trim()).filter(part => part.length > 0);
            
            const parsed = parts.map(part => {
                const num = parseInt(part, 10);
                if (num !== 0 && num !== 1) {
                    console.warn(`🎯 [DelayedTriggerManager] Invalid pattern value: ${part}, treating as 0`);
                    return 0;
                }
                return num;
            });
            
            if (parsed.length === 0) {
                console.warn(`🎯 [DelayedTriggerManager] Empty pattern, using default: [0,0,1]`);
                return [0, 0, 1];
            }
            
            console.log(`🎯 [DelayedTriggerManager] Parsed pattern "${pattern}" as:`, parsed);
            return parsed;
            
        } catch (error) {
            console.error(`🎯 [DelayedTriggerManager] Error parsing pattern "${pattern}":`, error);
            return [0, 0, 1]; // Default pattern
        }
    }
    
    /**
     * Reset trigger state for a specific slot
     */
    resetSlot(slotId: string): void {
        console.log(`🎯 [DelayedTriggerManager] Resetting state for slot: ${slotId}`);
        this.slotStates.delete(slotId);
    }
    
    /**
     * Get current state for debugging
     */
    getSlotState(slotId: string): SlotTriggerState | undefined {
        return this.slotStates.get(slotId);
    }
    
    /**
     * Clean up all slot states
     */
    cleanup(): void {
        console.log(`🎯 [DelayedTriggerManager] Cleaning up all slot states`);
        this.slotStates.clear();
    }
} 