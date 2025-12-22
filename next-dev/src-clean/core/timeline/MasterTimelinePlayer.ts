/**
 * @file MasterTimelinePlayer.ts
 * @description GSAP-inspired Master Timeline Player for FAME Animation Engine
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Phase 3 of the Timeline-First Architecture restructure.
 * Executes master timelines with natural forward/backward/reset behaviors.
 * 
 * Key benefits:
 * - Natural behaviors: Forward/backward/reset operate on master timeline
 * - Eliminates complex coordination: No more isEarliestInstance, synchronization issues
 * - Professional standard: GSAP-style timeline controls (play, reverse, seek, reset)
 * - Unified playback: All properties animate in harmony through master timeline
 * - Elegant simplicity: Single timeline player replaces multiple instance coordinators
 * 
 * @example
 * ```typescript
 * const player = new MasterTimelinePlayer();
 * 
 * // Natural timeline operations:
 * await player.playForward(masterTimeline, element);   // 0 → 100% of timeline
 * await player.playBackward(masterTimeline, element);  // 100% → 0 of timeline
 * player.seekTo(masterTimeline, element, 2.5);         // Jump to 2.5s position
 * player.reset(masterTimeline, element);               // Jump to beginning (0s)
 * await player.toggle(masterTimeline, element);        // Smart toggle based on position
 * ```
 */

import { AnimationBehavior, ReverseMode } from '../../types/index.ts';
import { MasterTimeline, getMasterTimelineValuesAtTime } from './MasterTimeline.ts';
import { applyProperty } from '../../execution/StyleApplicator.ts';

//=======================================
//        PLAYBACK STATE MANAGEMENT
//=======================================

/**
 * Playback state for a master timeline
 */
interface PlaybackState {
    /** Current time position in seconds */
    currentTime: number;
    
    /** Playback direction */
    direction: 'forward' | 'backward';
    
    /** Whether timeline is currently playing */
    isPlaying: boolean;
    
    /** Animation request ID for cancellation */
    animationId?: number;
    
    /** Start time for timing calculations */
    startTime: number;
    
    /** Duration for this playback session */
    duration: number;
    
    /** Element being animated */
    element: HTMLElement;
    
    /** Callback for progress updates */
    progressCallback?: (progress: number) => void;
}

//=======================================
//        MASTER TIMELINE PLAYER
//=======================================

/**
 * Executes master timelines with professional animation controls
 * Replaces complex multi-property instance coordination
 */
export class MasterTimelinePlayer {
    private activeTimelines = new Map<string, PlaybackState>();
    private timelineCounter = 0;
    
    constructor() {
        console.log('🎬 [MasterTimelinePlayer] Initialized');
    }
    
    //=======================================
    //        PRIMARY PLAYBACK METHODS
    //=======================================
    
    /**
     * Play timeline forward from specified progress to end
     * @param masterTimeline - Master timeline to play
     * @param element - Element to animate
     * @param fromProgress - Starting progress (0-1), defaults to 0
     * @param progressCallback - Optional progress callback
     * @returns Promise that resolves when animation completes
     */
    async playForward(
        masterTimeline: MasterTimeline, 
        element: HTMLElement,
        fromProgress: number = 0,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        // 🔍 DEBUG: Log playForward call
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] playForward() called:`, {
        //     element: {
        //         tagName: element.tagName,
        //         textContent: element.textContent,
        //         isConnected: element.isConnected,
        //         boundingRect: element.getBoundingClientRect()
        //     },
        //     fromProgress,
        //     totalDuration: masterTimeline.totalDuration,
        //     hasProgressCallback: !!progressCallback
        // });
        
        const startTime = fromProgress * masterTimeline.totalDuration;
        const endTime = masterTimeline.totalDuration;
        
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Playing forward: ${(fromProgress * 100).toFixed(1)}% (${startTime.toFixed(2)}s) → 100% (${endTime.toFixed(2)}s)`);
        
        return this.playToPosition(
            masterTimeline, 
            element, 
            startTime, 
            endTime,
            progressCallback
        );
    }
    
    /**
     * Play timeline backward from specified progress to start
     * @param masterTimeline - Master timeline to play
     * @param element - Element to animate
     * @param fromProgress - Starting progress (0-1), defaults to 1
     * @param progressCallback - Optional progress callback
     * @returns Promise that resolves when animation completes
     */
    async playBackward(
        masterTimeline: MasterTimeline, 
        element: HTMLElement,
        fromProgress: number = 1,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        const startTime = fromProgress * masterTimeline.totalDuration;
        const endTime = 0;
        
        // console.log(`🎬 [MasterTimelinePlayer] Playing backward: ${(fromProgress * 100).toFixed(1)}% (${startTime.toFixed(2)}s) → 0% (${endTime.toFixed(2)}s)`);

        return this.playToPosition(
            masterTimeline, 
            element, 
            startTime, 
            endTime,
            progressCallback
        );
    }
    
    /**
     * Seek to specific progress position instantly
     * @param masterTimeline - Master timeline
     * @param element - Element to update
     * @param progress - Progress position (0-1)
     */
    seekToProgress(masterTimeline: MasterTimeline, element: HTMLElement, progress: number): void {
        // Clamp progress to valid range
        const clampedProgress = Math.max(0, Math.min(progress, 1));
        const time = clampedProgress * masterTimeline.totalDuration;
        
        // console.log(`🎬 [MasterTimelinePlayer] 🚨 [InitialValueFix] Seeking to: ${(clampedProgress * 100).toFixed(1)}% (${time.toFixed(2)}s)`);
        
        // Cancel any active playback for this element
        this.stopPlayback(element);
        
        // 🚨 ENHANCED: Apply all property values at this time (already immediate)
        this.applyTimelineAtTime(masterTimeline, element, time);
    }
    
    /**
     * Seek to specific time position instantly (legacy method)
     * @param masterTimeline - Master timeline
     * @param element - Element to update
     * @param time - Time position in seconds
     */
    seekTo(masterTimeline: MasterTimeline, element: HTMLElement, time: number): void {
        const progress = masterTimeline.totalDuration > 0 ? time / masterTimeline.totalDuration : 0;
        this.seekToProgress(masterTimeline, element, progress);
    }
    
    /**
     * Reset timeline to specified progress position
     * @param masterTimeline - Master timeline
     * @param element - Element to reset
     * @param resetProgress - Progress to reset to (0.0 for start, 1.0 for end)
     */
    reset(masterTimeline: MasterTimeline, element: HTMLElement, resetProgress: number = 0): void {
        // console.log(`🎬 [MasterTimelinePlayer] Resetting timeline to progress: ${resetProgress}`);
        this.seekToProgress(masterTimeline, element, resetProgress);
    }
    
    /**
     * Toggle timeline direction based on specified current progress
     * @param masterTimeline - Master timeline
     * @param element - Element to animate
     * @param currentProgress - Current progress (0-1)
     * @param progressCallback - Optional progress callback
     * @returns Promise that resolves when animation completes
     */
    async toggle(
        masterTimeline: MasterTimeline, 
        element: HTMLElement,
        currentProgress: number,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        // Smart toggle: if closer to start, go forward; if closer to end, go backward
        if (currentProgress < 0.5) {
            // console.log(`🎬 [MasterTimelinePlayer] Toggle: ${(currentProgress * 100).toFixed(1)}% < 50%, playing forward`);
            return this.playForward(masterTimeline, element, currentProgress, progressCallback);
        } else {
            // console.log(`🎬 [MasterTimelinePlayer] Toggle: ${(currentProgress * 100).toFixed(1)}% >= 50%, playing backward`);
            return this.playBackward(masterTimeline, element, currentProgress, progressCallback);
        }
    }
    
    //=======================================
    //        BEHAVIOR-BASED METHODS
    //=======================================
    
    /**
     * Execute an animation behavior with a master timeline
     * @param behavior - Animation behavior to execute
     * @param masterTimeline - Master timeline to use
     * @param element - Element to animate
     * @param currentProgress - Current progress (0-1) from external state source
     * @param progressCallback - Optional progress callback
     * @param reverseMode - Reverse mode for reverse behaviors
     * @returns Promise that resolves with the final expected progress after behavior completion
     */
    async executeBehavior(
        behavior: AnimationBehavior,
        masterTimeline: MasterTimeline, 
        element: HTMLElement,
        currentProgress: number,
        progressCallback?: (progress: number) => void,
        reverseMode: ReverseMode = ReverseMode.EASING_PRESERVATION
    ): Promise<number> {
        // 🔍 DEBUG: Log executeBehavior call
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] executeBehavior() called:`, {
        //     behavior,
        //     reverseMode,
        //     currentProgress,
        //     element: {
        //         tagName: element.tagName,
        //         textContent: element.textContent,
        //         isConnected: element.isConnected
        //     },
        //     masterTimeline: {
        //         totalDuration: masterTimeline.totalDuration,
        //         hasTimeline: !!masterTimeline
        //     },
        //     hasProgressCallback: !!progressCallback
        // });
        
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Executing behavior: ${behavior} with reverseMode: ${reverseMode}, fromProgress: ${currentProgress.toFixed(3)}`);
        
        switch (behavior) {
            case AnimationBehavior.TOGGLE:
                // Smart toggle: if closer to start, go forward; if closer to end, go backward
                // console.log(`🎬 [MasterTimelinePlayer] TOGGLE: Starting from progress=${currentProgress.toFixed(3)}`);
                if (currentProgress < 0.5) {
                    // console.log(`🎬 [MasterTimelinePlayer] TOGGLE: ${(currentProgress * 100).toFixed(1)}% < 50%, playing forward`);
                    await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                    return 1.0; // Toggle forward ends at 1.0
                } else {
                    // console.log(`🎬 [MasterTimelinePlayer] TOGGLE: ${(currentProgress * 100).toFixed(1)}% >= 50%, playing backward with ${reverseMode}`);
                    
                    // Handle easing preservation for TOGGLE backward motion
                    if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                        // console.log(`🎬 [MasterTimelinePlayer] TOGGLE: Using easing preservation - transforming timeline`);
                        const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                        
                        // 🎯 FIX: Create inverted progress callback for easing preservation
                        // The transformed timeline plays 0→1, but we need to report 1→0 progress
                        const invertedProgressCallback = progressCallback ? (progress: number) => {
                            const invertedProgress = 1.0 - progress; // Convert 0→1 to 1→0
                            // console.log(`🔄 [ProgressInversion] Transformed progress ${progress.toFixed(3)} → inverted ${invertedProgress.toFixed(3)}`);
                            progressCallback(invertedProgress);
                        } : undefined;
                        
                        await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                        return 0.0; // Toggle backward ends at 0.0
                    } else {
                        // console.log(`🎬 [MasterTimelinePlayer] TOGGLE: Using time reversal - playing backward`);
                        await this.playBackward(masterTimeline, element, currentProgress, progressCallback);
                        return 0.0; // Toggle backward ends at 0.0
                    }
                }
                
            case AnimationBehavior.PLAY_FORWARD:
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                return 1.0; // Play forward ends at 1.0
                
            case AnimationBehavior.PLAY_BACKWARD:
                // Handle easing preservation for purely reverse behaviors
                if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                    //console.log(`🎬 [MasterTimelinePlayer] PLAY_BACKWARD with easing preservation - transforming timeline`);    
                    const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                    
                    // 🎯 FIX: Create inverted progress callback for easing preservation
                    const invertedProgressCallback = progressCallback ? (progress: number) => {
                        const invertedProgress = 1.0 - progress; // Convert 0→1 to 1→0
                        progressCallback(invertedProgress);
                    } : undefined;
                    
                    await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                    return 0.0; // Play backward ends at 0.0
                } else {
                    await this.playBackward(masterTimeline, element, currentProgress, progressCallback);
                    return 0.0; // Play backward ends at 0.0
                }
                
            case AnimationBehavior.PLAY_FORWARD_AND_RESET:
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                this.reset(masterTimeline, element, 0.0); // Reset to start (0.0) after forward motion
                // console.log(`🔧 [MasterTimelinePlayer] PLAY_FORWARD_AND_RESET completed - final state should be 0.0`);
                return 0.0; // 🎯 CRITICAL FIX: Reset behaviors end at reset position!
                
            case AnimationBehavior.PLAY_BACKWARD_AND_RESET:
                if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                    const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                    
                    // 🎯 FIX: Create inverted progress callback for easing preservation
                    const invertedProgressCallback = progressCallback ? (progress: number) => {
                        const invertedProgress = 1.0 - progress;
                        progressCallback(invertedProgress);
                    } : undefined;
                    
                    await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                } else {
                    await this.playBackward(masterTimeline, element, currentProgress, progressCallback);
                }
                this.reset(masterTimeline, element, 1.0); // 🎯 CRITICAL FIX: Reset to end (1.0) after backward motion
                // console.log(`🔧 [MasterTimelinePlayer] PLAY_BACKWARD_AND_RESET completed - final state should be 1.0`);
                return 1.0; // 🎯 CRITICAL FIX: Reset behaviors end at reset position!
                
            case AnimationBehavior.PLAY_BACKWARD_AND_REVERSE:
                if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                    const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                    
                    // 🎯 FIX: Create inverted progress callback for easing preservation
                    const invertedProgressCallback = progressCallback ? (progress: number) => {
                        const invertedProgress = 1.0 - progress;
                        progressCallback(invertedProgress);
                    } : undefined;
                    
                    await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                } else {
                    await this.playBackward(masterTimeline, element, currentProgress, progressCallback);
                }
                await this.playForward(masterTimeline, element, 0, progressCallback);
                return 1.0; // Reverse behaviors end at 1.0
                
            case AnimationBehavior.PLAY_FORWARD_AND_REVERSE:
                // console.log(`🎬 [MasterTimelinePlayer] PLAY_FORWARD_AND_REVERSE: Forward → Reverse (${reverseMode})`);
                
                // Phase 1: Forward motion (current → 1.0)
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                
                // Phase 2: Reverse motion (1.0 → 0.0) with reverse mode logic
                if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                    const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                    
                    // 🎯 FIX: Create inverted progress callback for easing preservation
                    const invertedProgressCallback = progressCallback ? (progress: number) => {
                        const invertedProgress = 1.0 - progress;
                        progressCallback(invertedProgress);
                    } : undefined;
                    
                    await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                } else {
                    await this.playToPosition(masterTimeline, element, masterTimeline.totalDuration, 0, progressCallback);
                }
                return 0.0; // Forward and reverse ends at 0.0
                
            // 🔄 PHASE 4 - LOOP BEHAVIORS (NEW)
            case AnimationBehavior.START_LOOP:
                // For START_LOOP, we execute the configured loop behavior
                // The actual looping logic is handled by EventAnimationCoordinator
                console.log(`🔄 [MasterTimelinePlayer] START_LOOP: Executing first iteration`);
                // Note: The specific behavior (forward/backward/toggle) is determined by BehaviorDecisionEngine
                // based on the loop configuration, so we execute whatever behavior was decided
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                return 1.0; // Loop start ends at 1.0 (will be managed by coordinator)
                
            case AnimationBehavior.STOP_LOOP:
                // For STOP_LOOP, we don't animate - just stay at current position
                console.log(`🔄 [MasterTimelinePlayer] STOP_LOOP: Staying at current position`);
                return currentProgress; // No change for stop loop
                
            // 🔄 PHASE 3 - PING PONG BEHAVIORS (IMPLEMENTED)
            case AnimationBehavior.START_PING_PONG:
                // For START_PING_PONG, we execute forward then reverse (like PLAY_FORWARD_AND_REVERSE)
                console.log(`🔄 [MasterTimelinePlayer] START_PING_PONG: Executing forward → reverse cycle`);
                
                // Phase 1: Forward motion (current → 1.0)
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                
                // Phase 2: Reverse motion (1.0 → 0.0) with reverse mode logic
                if (reverseMode === ReverseMode.EASING_PRESERVATION) {
                    const transformedTimeline = this.transformTimelineForEasingPreservation(masterTimeline);
                    
                    const invertedProgressCallback = progressCallback ? (progress: number) => {
                        const invertedProgress = 1.0 - progress;
                        progressCallback(invertedProgress);
                    } : undefined;
                    
                    await this.playToPosition(transformedTimeline, element, 0, transformedTimeline.totalDuration, invertedProgressCallback);
                } else {
                    await this.playToPosition(masterTimeline, element, masterTimeline.totalDuration, 0, progressCallback);
                }
                return 0.0; // Ping pong cycle ends at 0.0
                
            case AnimationBehavior.STOP_PING_PONG:
                // For STOP_PING_PONG, we don't animate - just stay at current position
                console.log(`🔄 [MasterTimelinePlayer] STOP_PING_PONG: Staying at current position`);
                return currentProgress; // No change for stop ping pong
                
            // 🎯 PHASE 5 - CONDITIONAL BEHAVIORS (NEW)
            case AnimationBehavior.DELAYED_TRIGGER:
                // For DELAYED_TRIGGER, the actual behavior is determined by BehaviorDecisionEngine
                // This should not normally reach here as it's handled in the decision layer
                console.log(`🎯 [MasterTimelinePlayer] DELAYED_TRIGGER: Executing as PLAY_FORWARD (fallback)`);
                await this.playForward(masterTimeline, element, currentProgress, progressCallback);
                return 1.0; // Default to forward motion
                
            default:
                console.warn(`🎬 [MasterTimelinePlayer] Unknown behavior: ${behavior}`);
                return currentProgress; // No change for unknown behaviors
        }
    }
    

    
    //=======================================
    //        CORE ANIMATION ENGINE
    //=======================================
    
    /**
     * Play timeline from one position to another
     * @param masterTimeline - Master timeline
     * @param element - Element to animate
     * @param fromTime - Start time in seconds
     * @param toTime - End time in seconds
     * @param progressCallback - Optional progress callback
     * @returns Promise that resolves when animation completes
     */
    private async playToPosition(
        masterTimeline: MasterTimeline,
        element: HTMLElement,
        fromTime: number,
        toTime: number,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        // 🔍 DEBUG: Log MasterTimelinePlayer.playToPosition call
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] playToPosition() called:`, {
        //     element: {
        //         tagName: element.tagName,
        //         className: element.className,
        //         textContent: element.textContent,
        //         isConnected: element.isConnected,
        //         boundingRect: element.getBoundingClientRect()
        //     },
        //     fromTime,
        //     toTime,
        //     distance: Math.abs(toTime - fromTime),
        //     masterTimelineExists: !!masterTimeline,
        //     totalDuration: masterTimeline?.totalDuration
        // });
        
        // Handle no-movement case
        if (Math.abs(fromTime - toTime) < 0.001) {
            // console.log(`🔍 [MASTER-TIMELINE-DEBUG] No movement needed: ${fromTime.toFixed(3)} ≈ ${toTime.toFixed(3)}`);
            return Promise.resolve();
        }
        
        // Cancel any existing playback for this element
        this.stopPlayback(element);
        
        // Calculate playback parameters
        const distance = Math.abs(toTime - fromTime);
        const direction = toTime > fromTime ? 'forward' : 'backward';
        const duration = distance * 1000; // Convert to milliseconds for timing
        
        // Create playback state
        const playbackId = `${++this.timelineCounter}-${Date.now()}`;
        const playbackState: PlaybackState = {
            currentTime: fromTime,
            direction,
            isPlaying: true,
            startTime: performance.now(),
            duration,
            element,
            progressCallback
        };
        
        // 🚨 CRITICAL FIX: Apply initial values IMMEDIATELY before starting animation
        // This prevents the 1-frame flash where elements show their natural CSS state
        // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Applying initial timeline values at time: ${fromTime.toFixed(3)}s`);
        this.applyTimelineAtTime(masterTimeline, element, fromTime);
        
        // Store active playback
        this.activeTimelines.set(this.getElementKey(element), playbackState);
        
        return new Promise<void>((resolve) => {
            const animate = (currentTime: number) => {
                // 🔍 DEBUG: Log animation frame execution (only occasionally to avoid spam)
                if (Math.random() < 0.02) { // Sample ~2% of frames
                    // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Animation frame executing:`, {
                    //     element: element.textContent?.substring(0, 20) + '...',
                    //     elapsed: currentTime - playbackState.startTime,
                    //     duration: duration
                    // });
                }
                
                if (!playbackState.isPlaying) {
                    // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Animation stopped - playback no longer active`);
                    resolve();
                    return;
                }
                
                // Calculate progress (0 to 1)
                const elapsed = currentTime - playbackState.startTime;
                const rawProgress = elapsed / duration;
                const clampedProgress = Math.min(rawProgress, 1.0);
                
                // Calculate current timeline position
                const timelinePosition = fromTime + (toTime - fromTime) * clampedProgress;
                
                // Apply timeline values at current position
                this.applyTimelineAtTime(masterTimeline, element, timelinePosition);
                
                // Call progress callback
                if (progressCallback) {
                    const overallProgress = timelinePosition / masterTimeline.totalDuration;
                    progressCallback(overallProgress);
                }
                
                // Check for completion
                if (clampedProgress >= 1.0) {
                    // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Animation completed: ${fromTime.toFixed(2)}s → ${toTime.toFixed(2)}s`);
                    
                    // Final progress callback with exact target progress
                    if (progressCallback) {
                        const finalProgress = toTime / masterTimeline.totalDuration;
                        progressCallback(finalProgress);
                    }
                    
                    // Cleanup
                    playbackState.isPlaying = false;
                    this.activeTimelines.delete(this.getElementKey(element));
                    
                    resolve();
                    return;
                }
                
                // Continue animation
                playbackState.animationId = requestAnimationFrame(animate);
            };
            
            // Start animation
            // console.log(`🔍 [MASTER-TIMELINE-DEBUG] Starting animation: ${fromTime.toFixed(3)}s → ${toTime.toFixed(3)}s (${duration}ms)`);
            playbackState.animationId = requestAnimationFrame(animate);
        });
    }
    
    /**
     * Apply timeline values at specific time
     * @param masterTimeline - Master timeline
     * @param element - Element to animate
     * @param time - Time position in seconds
     */
    private applyTimelineAtTime(
        masterTimeline: MasterTimeline, 
        element: HTMLElement, 
        time: number
    ): void {
        // Get values for all properties at this time - returns a Map
        const propertyValues = getMasterTimelineValuesAtTime(masterTimeline, time);
        
        // 🔍 DEBUG: Log property application (sample occasionally)
        if (Math.random() < 0.1) { // Sample ~10% of property applications
            // console.log(`🔍 [PROPERTY-APPLICATION-DEBUG] Applying properties to element:`, {
            //     element: {
            //         tagName: element.tagName,
            //         textContent: element.textContent?.substring(0, 20) + '...',
            //         isConnected: element.isConnected,
            //         className: element.className
            //     },
            //     time,
            //     propertyCount: propertyValues.size,
            //     properties: Array.from(propertyValues.entries()).map(([prop, val]) => ({ prop, val }))
            // });
        }
        
        // Apply each property value to the element - iterate over Map entries
        for (const [propertyName, value] of propertyValues.entries()) {
            try {
                applyProperty(element, propertyName, value);
                
                // 🔍 DEBUG: Log successful property application (sample occasionally)
                if (Math.random() < 0.05) { // Sample ~5% of successful applications
                    // console.log(`🔍 [PROPERTY-APPLICATION-DEBUG] Applied ${propertyName}: ${value} to ${element.textContent?.substring(0, 15)}...`);
                }
            } catch (error) {
                console.error(`🔍 [PROPERTY-APPLICATION-DEBUG] ❌ Failed to apply property ${propertyName}: ${value}`, error);
            }
        }
    }
    
    //=======================================
    //        STATE MANAGEMENT
    //=======================================
    
    /**
     * Stop any active playback for element
     * @param element - Element to stop
     */
    private stopPlayback(element: HTMLElement): void {
        const key = this.getElementKey(element);
        const playbackState = this.activeTimelines.get(key);
        
        if (playbackState) {
            playbackState.isPlaying = false;
            
            if (playbackState.animationId) {
                cancelAnimationFrame(playbackState.animationId);
            }
            
            this.activeTimelines.delete(key);
            // console.log(`🎬 [MasterTimelinePlayer] Stopped playback for element`);
        }
    }
    
    /**
     * Generate unique key for element
     * @param element - HTML element
     * @returns Unique key string
     */
    private getElementKey(element: HTMLElement): string {
        // Use element's data attribute or generate one
        if (!element.dataset.fameTimelineKey) {
            element.dataset.fameTimelineKey = `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        return element.dataset.fameTimelineKey;
    }
    
    //=======================================
    //        REVERSE MODE UTILITIES
    //=======================================
    

    
    /**
     * Convert reverse behavior to equivalent forward behavior for easing preservation
     * @param behavior - Original reverse behavior
     * @returns Equivalent forward behavior
     */
    private convertReverseToForwardBehavior(behavior: AnimationBehavior): AnimationBehavior {
        // console.log(`🎬 [MasterTimelinePlayer] Converting reverse behavior ${behavior} to forward equivalent`);
        
        switch (behavior) {
            case AnimationBehavior.PLAY_BACKWARD:
                return AnimationBehavior.PLAY_FORWARD;
                
            case AnimationBehavior.PLAY_BACKWARD_AND_RESET:
                return AnimationBehavior.PLAY_FORWARD_AND_RESET;
                
            case AnimationBehavior.PLAY_BACKWARD_AND_REVERSE:
                return AnimationBehavior.PLAY_FORWARD_AND_REVERSE;
                
            default:
                // Non-reverse behaviors stay the same
                return behavior;
        }
    }
    
    /**
     * Transform master timeline for easing preservation mode
     * Swaps keyframe values while preserving easing and timing
     * @param originalTimeline - Original master timeline
     * @returns Transformed timeline with swapped values
     */
    private transformTimelineForEasingPreservation(originalTimeline: MasterTimeline): MasterTimeline {
        // console.log(`🎬 [MasterTimelinePlayer] Transforming timeline for easing preservation`);
        
        // Create a copy of the original timeline with swapped keyframe values
        const transformedTimeline: MasterTimeline = {
            ...originalTimeline,
            propertyTimelines: originalTimeline.propertyTimelines.map(propertyTimeline => ({
                ...propertyTimeline,
                keyframes: propertyTimeline.keyframes.map(keyframe => {
                    // Find the corresponding "to" value by looking at the last keyframe
                    const lastKeyframe = propertyTimeline.keyframes[propertyTimeline.keyframes.length - 1];
                    const firstKeyframe = propertyTimeline.keyframes[0];
                    
                    // Swap values: first keyframe gets last value, last keyframe gets first value
                    let newValue = keyframe.value;
                    if (keyframe === firstKeyframe) {
                        newValue = lastKeyframe.value; // Start with the end value
                    } else if (keyframe === lastKeyframe) {
                        newValue = firstKeyframe.value; // End with the start value
                    }
                    // Middle keyframes could be interpolated, but for now keep them as-is
                    
                    return {
                        ...keyframe,
                        value: newValue
                        // Preserve: time, easing, unit - only swap the value
                    };
                })
            }))
        };
        
        // console.log(`🎬 [MasterTimelinePlayer] Timeline transformation complete: ${transformedTimeline.propertyTimelines.length} properties transformed`);
        
        return transformedTimeline;
    }
    
    /**
     * Check if timeline is currently playing for element
     * @param element - Element to check
     * @returns Whether timeline is playing
     */
    isPlaying(element: HTMLElement): boolean {
        const key = this.getElementKey(element);
        const playbackState = this.activeTimelines.get(key);
        return playbackState?.isPlaying || false;
    }
    
    /**
     * Stop animation for a specific element
     * @param element - Element to stop animation for
     */
    stopElement(element: HTMLElement): void {
        this.stopPlayback(element);
    }
    
    /**
     * Stop all active playback
     */
    stopAll(): void {
        // console.log(`🎬 [MasterTimelinePlayer] Stopping all active playback (${this.activeTimelines.size} timelines)`);
        
        this.activeTimelines.forEach((playbackState) => {
            playbackState.isPlaying = false;
            if (playbackState.animationId) {
                cancelAnimationFrame(playbackState.animationId);
            }
        });
        
        this.activeTimelines.clear();
    }
    
    /**
     * Cleanup player resources
     */
    cleanup(): void {
        // console.log('🎬 [MasterTimelinePlayer] Cleaning up');
        this.stopAll();
    }
} 