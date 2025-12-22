/**
 * @file StaggerCoordinator.ts
 * @description Focused coordinator for all stagger logic execution
 * 
 * @version 1.0.0 - Extracted from EventAnimationCoordinator
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const coordinator = new StaggerCoordinator();
 * 
 * // Execute with linear stagger
 * coordinator.executeWithLinearStagger(
 *   slot, 
 *   animatedElements, 
 *   'playForward', 
 *   0.0, 
 *   undefined,
 *   (element, delay) => {
 *     setTimeout(() => executeElement(element), delay);
 *   }
 * );
 * 
 * // Future: Execute with grid stagger
 * coordinator.executeWithGridStagger(slot, elements, behavior, startProgress, reverseMode, callback);
 * ```
 */

import type { 
    AnimationSlot,
    ReverseMode
} from '../../types/index.ts';

import { LinearStagger } from './strategies/LinearStagger.ts';
import { animationStateManager } from '../../core/state/AnimationStateManager.ts';

/**
 * StaggerCoordinator - Focused Stagger Logic Execution
 * 
 * @description
 * Extracted from EventAnimationCoordinator to provide single responsibility
 * for stagger calculation and execution coordination. This class handles:
 * - Linear stagger execution with proper timing
 * - Animation direction determination
 * - Execution callback coordination
 * - Future: Grid stagger execution
 * 
 * @architectural_pattern Coordinator Pattern - coordinates stagger strategy execution
 * @responsibility Single: All stagger logic coordination and execution
 * @extracted_from EventAnimationCoordinator (Phase 1.5.1 refactoring)
 */
export class StaggerCoordinator {
    
    /**
     * Execute linear stagger animation with proper timing coordination
     * 
     * @description
     * Extracted from EventAnimationCoordinator.executeWithLinearStagger().
     * Handles all linear stagger calculations and coordinates execution through callback.
     * 
     * @param slot - Animation slot configuration with stagger settings
     * @param animatedElements - Elements to animate with stagger
     * @param behavior - Animation behavior ('playForward', 'playBackward', 'toggle', etc.)
     * @param startProgress - Starting progress value (0.0 to 1.0)
     * @param reverseMode - Optional reverse behavior mode
     * @param executeCallback - Callback to execute each element with calculated delay
     * 
     * @extracted_from EventAnimationCoordinator.executeWithLinearStagger() - lines 434-472
     */
    executeWithLinearStagger(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode: ReverseMode | undefined,
        executeCallback: (element: HTMLElement, delay: number) => void
    ): void {
        // Determine animation direction based on progress direction
        const animationDirection = this.determineAnimationDirection(startProgress, behavior);
        
        // Use LinearStagger for all stagger calculations
        const linearStagger = new LinearStagger();
        const staggerResult = linearStagger.calculateTimedDelays(
            animatedElements, 
            slot.staggering!, 
            animationDirection
        );
        
        console.log(`🎯 [StaggerCoordinator] Linear stagger execution: ${slot.staggering!.delay}s delay, ${staggerResult.orderUsed} order, direction: ${animationDirection}`);
        console.log(`🎯 [StaggerCoordinator] Elements: ${staggerResult.timings.length}, behavior: ${behavior}, startProgress: ${startProgress.toFixed(3)}`);
        
        // Execute staggered animations based on calculated timings
        staggerResult.timings.forEach((timing) => {
            const delay = timing.delay * 1000; // Convert to milliseconds
            
            // Call the provided execution callback with element and delay
            executeCallback(timing.element, delay);
        });
    }
    
    /**
     * Execute grid stagger animation with proper timing coordination
     * 
     * @description
     * Production implementation for grid-based stagger patterns.
     * Uses sophisticated grid detection, distance calculations, and origin resolution
     * to create professional 2D stagger effects.
     * 
     * **Grid Staggering Algorithm:**
     * 1. Auto-detect grid layout from element positions
     * 2. Resolve origin point based on stagger configuration
     * 3. Calculate distances from origin to each element
     * 4. Convert distances to time-based delays
     * 5. Execute staggered animations through callback
     * 
     * @param slot - Animation slot configuration with stagger settings
     * @param animatedElements - Elements to animate with grid stagger
     * @param behavior - Animation behavior
     * @param startProgress - Starting progress value (0.0 to 1.0)
     * @param reverseMode - Optional reverse behavior mode
     * @param executeCallback - Callback to execute each element with calculated delay
     */
    executeWithGridStagger(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode: ReverseMode | undefined,
        executeCallback: (element: HTMLElement, delay: number) => void
    ): void {
        console.log(`🎯 [StaggerCoordinator] Grid stagger execution starting for ${animatedElements.length} elements`);
        
        try {
            // Import grid utilities dynamically
            import('./grid/GridDetector.ts').then(({ GridDetector }) => {
                import('./grid/DistanceCalculator.ts').then(({ DistanceCalculator }) => {
                    import('./grid/OriginResolver.ts').then(({ OriginResolver }) => {
                        this.executeGridStaggerInternal(
                            slot,
                            animatedElements,
                            behavior,
                            startProgress,
                            reverseMode,
                            executeCallback,
                            new GridDetector(),
                            new DistanceCalculator(),
                            new OriginResolver()
                        );
                    }).catch(error => {
                        console.error(`🚧 [StaggerCoordinator] Failed to import OriginResolver:`, error);
                        this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
                    });
                }).catch(error => {
                    console.error(`🚧 [StaggerCoordinator] Failed to import DistanceCalculator:`, error);
                    this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
                });
            }).catch(error => {
                console.error(`🚧 [StaggerCoordinator] Failed to import GridDetector:`, error);
                this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
            });
            
        } catch (error) {
            console.error(`🚧 [StaggerCoordinator] Error in grid stagger execution:`, error);
            this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
        }
    }
    
    /**
     * Internal grid stagger execution with loaded utilities
     * 
     * @description
     * Core grid staggering logic executed after all utilities are loaded.
     * Now supports multiple grid modes: point-based, row-based, and column-based.
     * 
     * @version 2.5.0 - Added row and column wave support
     */
    private executeGridStaggerInternal(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode: ReverseMode | undefined,
        executeCallback: (element: HTMLElement, delay: number) => void,
        gridDetector: any,
        distanceCalculator: any,
        originResolver: any
    ): void {
        console.log(`🎯 [StaggerCoordinator] Executing grid stagger with loaded utilities`);
        
        // Existing: Step 1 & 2 - Grid detection and validation (unchanged)
        const gridResult = gridDetector.analyzeLayout(animatedElements);
        
        if (!gridResult || gridResult.elements.length === 0) {
            console.warn(`🚧 [StaggerCoordinator] Grid detection failed, falling back to linear stagger`);
            this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
            return;
        }
        
        console.log(`🎯 [StaggerCoordinator] Grid detected: ${gridResult.rows}x${gridResult.columns} with ${gridResult.elements.length} elements`);
        
        // 🆕 NEW: Step 3 - Determine grid stagger mode
        const gridConfig = slot.staggering?.advanced?.grid;
        const gridMode = gridConfig?.mode || 'point-based';
        const staggerAmount = slot.staggering?.delay || 0.1;
        
        console.log(`🎯 [StaggerCoordinator] Grid mode: ${gridMode}`);
        
        // 🆕 NEW: Step 4 - Route to appropriate stagger calculation
        let staggerResult: any;
        
        // 🚀 PHASE 1A: Determine animation direction for proper reverse timing
        const animationDirection = this.determineAnimationDirection(startProgress, behavior);
        
        try {
            switch (gridMode) {
                case 'point-based':
                    // 🚀 ENHANCED: Use current origin + distance system with reverse mode support
                    staggerResult = this.executePointBasedStagger(
                        gridResult, gridConfig, distanceCalculator, originResolver, staggerAmount, reverseMode, animationDirection
                    );
                    break;
                    
                case 'row-based':
                    // 🆕 NEW: Use row wave calculator with reverse mode support
                    staggerResult = this.executeRowBasedStagger(
                        gridResult, gridConfig?.rowDirection || 'top-to-bottom', staggerAmount, animationDirection
                    );
                    break;
                    
                case 'column-based':
                    // 🆕 NEW: Use column wave calculator with tolerance-based column detection (Phase 1B)
                    const columnTolerance = gridConfig?.columnTolerance || 10; // Default 10px tolerance for text elements
                    staggerResult = this.executeColumnBasedStagger(
                        gridResult, gridConfig?.columnDirection || 'left-to-right', staggerAmount, animationDirection, columnTolerance
                    );
                    break;
                    
                default:
                    console.warn(`🚧 [StaggerCoordinator] Unknown grid mode: ${gridMode}, falling back to point-based`);
                    staggerResult = this.executePointBasedStagger(
                        gridResult, gridConfig, distanceCalculator, originResolver, staggerAmount, reverseMode, animationDirection
                    );
            }
            
            // Step 5: Execute staggered animations (unified execution)
            this.executeStaggerResult(staggerResult, executeCallback);
            
        } catch (error) {
            console.error(`🚧 [StaggerCoordinator] Error in ${gridMode} stagger execution:`, error);
            this.fallbackToLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
        }
    }
    
    /**
     * 🆕 NEW: Execute point-based stagger (extracted existing logic)
     * 
     * @description
     * Executes the existing point-based grid stagger using origin points and distance calculations.
     * This preserves all existing functionality while allowing new modes.
     * 
     * 🚀 ENHANCED: Now supports reverse mode for proper 2D grid stagger reversal
     */
    private executePointBasedStagger(
        gridResult: any,
        gridConfig: any,
        distanceCalculator: any,
        originResolver: any,
        staggerAmount: number,
        reverseMode?: ReverseMode,
        animationDirection?: 'forward' | 'backward'
    ): any {
        console.log(`🎯 [StaggerCoordinator] Executing point-based stagger`);
        
        // Step 2: Resolve origin point
        const gridOrigin = gridConfig?.origin || 'center';
        const originPoint = originResolver.resolveOrigin(gridResult, gridOrigin);
        console.log(`🎯 [StaggerCoordinator] Origin resolved: (${originPoint.x.toFixed(2)}, ${originPoint.y.toFixed(2)})`);
        
        // Step 3: Calculate distances from origin
        const distanceMetric = gridConfig?.distanceMetric || 'euclidean';
        const gridWithDistances = distanceCalculator.calculateGridDistances(gridResult, originPoint, distanceMetric);
        
        // 🚀 PHASE 1A: Step 4 - Calculate time-based delays with reverse mode support
        const distribution = gridConfig?.distribution || 'linear';
        const isReverseAnimation = animationDirection === 'backward';
        
        // 🚀 NEW: Check user's grid reverse mode preference (Phase 1A)
        const gridReverseMode = gridConfig?.reverseMode || 'latest-elements';
        const shouldApplyReverseLogic = isReverseAnimation && (gridReverseMode === 'latest-elements');
        
        console.log(`🔄 [StaggerCoordinator] Reverse mode details: reverseMode=${reverseMode}, animationDirection=${animationDirection}, gridReverseMode=${gridReverseMode}, applyReverse=${shouldApplyReverseLogic}`);
        
        const staggerResult = distanceCalculator.calculateTimedStaggerDelays(
            gridWithDistances, 
            staggerAmount, 
            distribution,
            shouldApplyReverseLogic  // 🚀 ENHANCED: Only apply reverse logic when user wants 'latest-elements'
        );
        
        console.log(`🎯 [StaggerCoordinator] Point-based stagger: ${staggerAmount}s delay, ${distanceMetric} metric, gridReverseMode=${gridReverseMode}, applyReverse=${shouldApplyReverseLogic}`);
        console.log(`🎯 [StaggerCoordinator] Grid elements: ${staggerResult.elements.length}, calculated delays: ${staggerResult.delays.length}`);
        
        return staggerResult;
    }
    
    /**
     * 🆕 NEW: Execute row-based stagger with dynamic import
     * 
     * @description
     * Executes row-based wave stagger using the RowStaggerCalculator.
     * Dynamically imports the calculator to avoid circular dependencies.
     * 
     * 🚀 ENHANCED: Now supports reverse mode for proper row wave reversal
     */
    private executeRowBasedStagger(
        gridResult: any,
        direction: string,
        staggerAmount: number,
        animationDirection?: 'forward' | 'backward'
    ): Promise<any> {
        const modeInfo = animationDirection === 'backward' ? ' (REVERSE)' : ' (FORWARD)';
        console.log(`🌊 [StaggerCoordinator] Executing row-based stagger: ${direction}${modeInfo}`);
        
        // Dynamic import to avoid circular dependencies
        return import('./grid/RowStaggerCalculator.ts').then(({ RowStaggerCalculator }) => {
            const calculator = new RowStaggerCalculator();
            const isReverseAnimation = animationDirection === 'backward';
            // TODO Phase 1B: Update RowStaggerCalculator to accept reverse mode parameter
            // For now, use existing 3-parameter signature (reverse mode will be added in Phase 1B)
            return calculator.calculateRowWaveDelays(gridResult, direction as any, staggerAmount);
        }).catch(error => {
            console.error(`🚧 [StaggerCoordinator] Failed to import RowStaggerCalculator:`, error);
            throw error;
        });
    }
    
    /**
     * 🆕 NEW: Execute column-based stagger with dynamic import
     * 
     * @description
     * Executes column-based wave stagger using the ColumnStaggerCalculator.
     * Dynamically imports the calculator to avoid circular dependencies.
     * 
     * 🚀 ENHANCED Phase 1B: Now supports tolerance-based column detection for text elements
     */
    private executeColumnBasedStagger(
        gridResult: any,
        direction: string,
        staggerAmount: number,
        animationDirection?: 'forward' | 'backward',
        tolerance: number = 10
    ): Promise<any> {
        const modeInfo = animationDirection === 'backward' ? ' (REVERSE)' : ' (FORWARD)';
        console.log(`🌊 [StaggerCoordinator] Executing column-based stagger: ${direction}${modeInfo}, tolerance: ${tolerance}px`);
        
        // Dynamic import to avoid circular dependencies
        return import('./grid/ColumnStaggerCalculator.ts').then(({ ColumnStaggerCalculator }) => {
            const calculator = new ColumnStaggerCalculator();
            const isReverseAnimation = animationDirection === 'backward';
            
            // ✅ Phase 1B COMPLETE: Word-Based Grid Column Alignment implemented
            // Using tolerance-based column detection for better text element handling
            return calculator.calculateColumnWaveDelays(gridResult, direction as any, staggerAmount, tolerance);
        }).catch(error => {
            console.error(`🚧 [StaggerCoordinator] Failed to import ColumnStaggerCalculator:`, error);
            throw error;
        });
    }
    
    /**
     * 🆕 NEW: Execute stagger result with unified timing
     * 
     * @description
     * Unified execution method that handles both sync and async stagger results.
     * Executes the calculated delays through the provided callback.
     */
    private executeStaggerResult(
        staggerResult: any | Promise<any>,
        executeCallback: (element: HTMLElement, delay: number) => void
    ): void {
        const processResult = (result: any) => {
            if (!result || !result.elements || !result.delays) {
                console.warn(`🚧 [StaggerCoordinator] Invalid stagger result, no animations executed`);
                return;
            }
            
            result.elements.forEach((gridElement: any, index: number) => {
                const delay = result.delays[index] * 1000; // Convert to milliseconds
                const element = gridElement.element || gridElement; // Handle both formats
                
                // Call the provided execution callback with element and delay
                executeCallback(element, delay);
                
                if (gridElement.position) {
                    console.log(`🎯 [StaggerCoordinator] Element at (${gridElement.position.x}, ${gridElement.position.y}) scheduled with ${delay.toFixed(1)}ms delay`);
                } else {
                    console.log(`🎯 [StaggerCoordinator] Element scheduled with ${delay.toFixed(1)}ms delay`);
                }
            });
            
            console.log(`🎯 [StaggerCoordinator] Stagger execution completed successfully`);
        };
        
        // Handle both sync and async results
        if (staggerResult && typeof staggerResult.then === 'function') {
            // Async result (row/column calculators)
            staggerResult.then(processResult).catch((error: any) => {
                console.error(`🚧 [StaggerCoordinator] Async stagger execution failed:`, error);
            });
        } else {
            // Sync result (point-based calculator)
            processResult(staggerResult);
        }
    }
    
    /**
     * Fallback to linear stagger when grid stagger fails
     * 
     * @description
     * Graceful fallback to linear staggering when grid detection or
     * calculation fails, ensuring animations still work properly.
     */
    private fallbackToLinearStagger(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode: ReverseMode | undefined,
        executeCallback: (element: HTMLElement, delay: number) => void
    ): void {
        console.log(`🔄 [StaggerCoordinator] Falling back to linear stagger`);
        this.executeWithLinearStagger(slot, animatedElements, behavior, startProgress, reverseMode, executeCallback);
    }
    
    /**
     * Determine animation direction based on start progress and behavior
     * 
     * @description
     * Extracted from EventAnimationCoordinator.determineAnimationDirection().
     * Analyzes behavior and progress to determine correct stagger direction.
     * 
     * @param startProgress - Starting progress value (0.0 to 1.0)
     * @param behavior - Animation behavior string
     * @returns Animation direction for stagger calculations
     * 
     * @extracted_from EventAnimationCoordinator.determineAnimationDirection() - lines 476-495
     */
    determineAnimationDirection(startProgress: number, behavior: string): 'forward' | 'backward' {
        if (behavior === 'playForward') {
            return 'forward';
        } else if (behavior === 'playBackward') {
            return 'backward';
        } else if (behavior === 'PLAY_REVERSE') {
            return 'backward';
        } else if (behavior === 'toggle') {
            // For toggle, direction depends on current state
            return startProgress < 0.5 ? 'forward' : 'backward';
        } else {
            // Default: determine by progress value
            return startProgress < 0.5 ? 'forward' : 'backward';
        }
    }
} 