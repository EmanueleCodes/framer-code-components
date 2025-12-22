/**
 * @file PingPongRunner.ts
 * @description Manages continuous or finite ping-pong animation cycles for a given slot and elements.
 * @version 2.0.0 - NON-BLOCKING EVENT-DRIVEN ARCHITECTURE
 * @since 1.0.0
 *
 * 🚨 CRITICAL FIX: Converted from blocking while loops to non-blocking event-driven architecture
 * to prevent browser freezing. The old synchronous approach was causing infinite loops that
 * blocked the main thread.
 *
 * Usage:
 * ```typescript
 * const runner = new PingPongRunner({
 *   cycles: 5,
 *   delay: 500,
 *   playForward: async () => { ... },
 *   playBackward: async () => { ... }
 * });
 * runner.start();
 * // ...
 * runner.stop();
 * ```
 */

export interface PingPongRunnerConfig {
    cycles: number; // Number of ping-pong cycles (Infinity for infinite, but with safety limits)
    delay: number; // Delay between phases in ms
    playForward: () => Promise<void>; // Function to play forward animation
    playBackward: () => Promise<void>; // Function to play backward animation
}

export class PingPongRunner {
    private cycles: number;
    private delay: number;
    private playForward: () => Promise<void>;
    private playBackward: () => Promise<void>;
    private stopped = false;
    private currentCycle = 0;
    private currentPhase: 'forward' | 'backward' = 'forward';
    private timeoutId: number | null = null;
    
    // 🚨 SAFETY: Prevent runaway infinite loops
    private readonly MAX_CYCLES = 5000; // Safety limit even for "infinite" cycles
    private readonly MIN_DELAY = 16; // Reference: 16ms = 60fps (no longer enforced as minimum)

    constructor(config: PingPongRunnerConfig) {
        this.cycles = config.cycles;
        // 🎯 ALLOW 0 DELAY: Respect user's 0 delay choice for immediate cycling
        this.delay = Math.max(config.delay, 0); // Allow 0 delay, just prevent negative values
        this.playForward = config.playForward;
        this.playBackward = config.playBackward;
        
        // 🚨 SAFETY: Cap infinite cycles to prevent runaway loops
        if (this.cycles === Infinity) {
            console.warn(`🏓 [PingPongRunner] Infinite cycles capped at ${this.MAX_CYCLES} for safety`);
            this.cycles = this.MAX_CYCLES;
        }
    }

    /**
     * 🚨 CRITICAL FIX: Non-blocking event-driven ping-pong execution
     * 
     * Instead of using a blocking while loop, we now use setTimeout to schedule
     * each phase asynchronously, allowing the browser to maintain responsiveness.
     */
    public start() {
        console.log(`🏓 [PingPongRunner] Starting non-blocking ping-pong: ${this.cycles} cycles with ${this.delay}ms delay`);
        
        this.stopped = false;
        this.currentCycle = 0;
        this.currentPhase = 'forward';
        
        // Start the first phase immediately
        this.scheduleNextPhase();
    }

    /**
     * 🔄 NON-BLOCKING: Schedule the next phase using setTimeout
     * This yields control to the browser between each phase
     */
    private scheduleNextPhase() {
        // Check stopping conditions
        if (this.stopped) {
            console.log(`🏓 [PingPongRunner] Stopped by user request at cycle ${this.currentCycle}, phase: ${this.currentPhase}`);
            return;
        }
        
        if (this.currentCycle >= this.cycles) {
            console.log(`🏓 [PingPongRunner] Completed all ${this.cycles} cycles`);
            return;
        }
        
        // 🚨 SAFETY: Additional runaway loop protection
        if (this.currentCycle >= this.MAX_CYCLES) {
            console.error(`🚨 [PingPongRunner] SAFETY STOP: Hit maximum cycle limit (${this.MAX_CYCLES})`);
            this.stop();
            return;
        }
        
        // Execute current phase asynchronously
        this.executeCurrentPhase()
            .then(() => {
                // Schedule next phase after delay (non-blocking)
                this.timeoutId = window.setTimeout(() => {
                    this.advancePhase();
                    this.scheduleNextPhase();
                }, this.delay);
            })
            .catch(error => {
                console.error(`🚨 [PingPongRunner] Error in cycle ${this.currentCycle}, phase ${this.currentPhase}:`, error);
                // Continue to next phase even if current one failed
                this.timeoutId = window.setTimeout(() => {
                    this.advancePhase();
                    this.scheduleNextPhase();
                }, this.delay);
            });
    }

    /**
     * Execute the current phase (forward or backward)
     */
    private async executeCurrentPhase(): Promise<void> {
        const phaseLabel = this.currentPhase === 'forward' ? 'Forward' : 'Backward';
        console.log(`🏓 [PingPongRunner] Executing ${phaseLabel} phase of cycle ${this.currentCycle + 1}/${this.cycles}`);
        
        try {
            if (this.currentPhase === 'forward') {
                await this.playForward();
            } else {
                await this.playBackward();
            }
            console.log(`🏓 [PingPongRunner] ${phaseLabel} phase completed successfully`);
        } catch (error) {
            console.error(`🏓 [PingPongRunner] ${phaseLabel} phase failed:`, error);
            // Don't stop the ping-pong on individual phase failures
        }
    }

    /**
     * Advance to the next phase or cycle
     */
    private advancePhase() {
        if (this.currentPhase === 'forward') {
            // Forward completed, move to backward
            this.currentPhase = 'backward';
        } else {
            // Backward completed, move to next cycle
            this.currentPhase = 'forward';
            this.currentCycle++;
        }
    }

    /**
     * Stops the ping-pong and cleans up any pending timeouts
     */
    public stop() {
        console.log(`🏓 [PingPongRunner] Stopping ping-pong at cycle ${this.currentCycle}, phase: ${this.currentPhase}`);
        
        this.stopped = true;
        
        // Clean up any pending timeout
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    /**
     * Get current ping-pong status for debugging
     */
    public getStatus() {
        return {
            currentCycle: this.currentCycle,
            totalCycles: this.cycles,
            currentPhase: this.currentPhase,
            stopped: this.stopped,
            hasPendingTimeout: this.timeoutId !== null
        };
    }
} 