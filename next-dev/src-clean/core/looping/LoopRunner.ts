/**
 * @file LoopRunner.ts
 * @description Manages continuous or finite animation loops for a given slot and elements.
 * @version 2.0.0 - NON-BLOCKING EVENT-DRIVEN ARCHITECTURE
 * @since 1.0.0
 *
 * 🚨 CRITICAL FIX: Converted from blocking while loops to non-blocking event-driven architecture
 * to prevent browser freezing. The old synchronous approach was causing infinite loops that
 * blocked the main thread.
 *
 * Usage:
 * ```typescript
 * const runner = new LoopRunner({
 *   iterations: 5,
 *   delay: 500,
 *   play: async () => { ... }
 * });
 * runner.start();
 * // ...
 * runner.stop();
 * ```
 */

export interface LoopRunnerConfig {
    iterations: number; // Number of times to repeat (Infinity for infinite, but with safety limits)
    delay: number; // Delay between iterations in ms
    play: () => Promise<void>; // Function to play the animation (should return when complete)
}

export class LoopRunner {
    private iterations: number;
    private delay: number;
    private play: () => Promise<void>;
    private stopped = false;
    private currentIteration = 0;
    private timeoutId: number | null = null;
    
    // 🚨 SAFETY: Prevent runaway infinite loops
    private readonly MAX_ITERATIONS = 10000; // Safety limit even for "infinite" loops
    private readonly MIN_DELAY = 16; // Reference: 16ms = 60fps (no longer enforced as minimum)

    constructor(config: LoopRunnerConfig) {
        this.iterations = config.iterations;
        // 🎯 ALLOW 0 DELAY: Respect user's 0 delay choice for immediate cycling
        this.delay = Math.max(config.delay, 0); // Allow 0 delay, just prevent negative values
        this.play = config.play;
        
        // 🚨 SAFETY: Cap infinite iterations to prevent runaway loops
        if (this.iterations === Infinity) {
            console.warn(`🔄 [LoopRunner] Infinite iterations capped at ${this.MAX_ITERATIONS} for safety`);
            this.iterations = this.MAX_ITERATIONS;
        }
    }

    /**
     * 🚨 CRITICAL FIX: Non-blocking event-driven loop execution
     * 
     * Instead of using a blocking while loop, we now use setTimeout to schedule
     * each iteration asynchronously, allowing the browser to maintain responsiveness.
     */
    public start() {
        console.log(`🔄 [LoopRunner] Starting non-blocking loop: ${this.iterations} iterations with ${this.delay}ms delay`);
        
        this.stopped = false;
        this.currentIteration = 0;
        
        // Start the first iteration immediately
        this.scheduleNextIteration();
    }

    /**
     * 🔄 NON-BLOCKING: Schedule the next iteration using setTimeout
     * This yields control to the browser between each iteration
     */
    private scheduleNextIteration() {
        // Check stopping conditions
        if (this.stopped) {
            console.log(`🔄 [LoopRunner] Stopped by user request at iteration ${this.currentIteration}`);
            return;
        }
        
        if (this.currentIteration >= this.iterations) {
            console.log(`🔄 [LoopRunner] Completed all ${this.iterations} iterations`);
            return;
        }
        
        // 🚨 SAFETY: Additional runaway loop protection
        if (this.currentIteration >= this.MAX_ITERATIONS) {
            console.error(`🚨 [LoopRunner] SAFETY STOP: Hit maximum iteration limit (${this.MAX_ITERATIONS})`);
            this.stop();
            return;
        }
        
        // Execute current iteration asynchronously
        this.executeIteration()
            .then(() => {
                // Schedule next iteration after delay (non-blocking)
                this.timeoutId = window.setTimeout(() => {
                    this.currentIteration++;
                    this.scheduleNextIteration();
                }, this.delay);
            })
            .catch(error => {
                console.error(`🚨 [LoopRunner] Error in iteration ${this.currentIteration}:`, error);
                // Continue to next iteration even if current one failed
                this.timeoutId = window.setTimeout(() => {
                    this.currentIteration++;
                    this.scheduleNextIteration();
                }, this.delay);
            });
    }

    /**
     * Execute a single iteration
     */
    private async executeIteration(): Promise<void> {
        console.log(`🔄 [LoopRunner] Executing iteration ${this.currentIteration + 1}/${this.iterations}`);
        
        try {
            await this.play();
            console.log(`🔄 [LoopRunner] Iteration ${this.currentIteration + 1} completed successfully`);
        } catch (error) {
            console.error(`🔄 [LoopRunner] Iteration ${this.currentIteration + 1} failed:`, error);
            // Don't stop the loop on individual iteration failures
        }
    }

    /**
     * Stops the loop and cleans up any pending timeouts
     */
    public stop() {
        console.log(`🔄 [LoopRunner] Stopping loop at iteration ${this.currentIteration}`);
        
        this.stopped = true;
        
        // Clean up any pending timeout
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    /**
     * Get current loop status for debugging
     */
    public getStatus() {
        return {
            currentIteration: this.currentIteration,
            totalIterations: this.iterations,
            stopped: this.stopped,
            hasPendingTimeout: this.timeoutId !== null
        };
    }
} 