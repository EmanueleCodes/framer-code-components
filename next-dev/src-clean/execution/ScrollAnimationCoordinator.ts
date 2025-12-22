/**
 * @file ScrollAnimationCoordinator.ts
 * @description Orchestrates scrubbed scroll animations with stagger support
 *
 * @version 1.0.0
 * @since 1.0.0
 *
 * @description
 * Master coordinator for scrubbed scroll animations. Integrates ScrollProgressTracker,
 * TimelineScrollMapper, and ScrollPropertyApplicator to create smooth scroll-tied
 * animations with both scrubbed and threshold stagger modes.
 *
 * @architecture
 * - Orchestrates all scroll animation components
 * - Handles stagger mode coordination (scrubbed vs threshold)
 * - Manages timeline execution and element lifecycle
 * - Provides unified API for scrubbed scroll animations
 *
 * @example
 * ```typescript
 * const coordinator = new ScrollAnimationCoordinator();
 *
 * // Start scrubbed scroll animation
 * const cleanup = coordinator.startScrollAnimation(
 *   slot,
 *   triggerElement,
 *   animatedElements,
 *   boundaries
 * );
 *
 * // Later: cleanup();
 * ```
 */

import { AnimationSlot } from "../types/index.ts"
import type { ScrollBoundary } from "../types/ScrollTypes.ts"
import {
    MasterTimeline,
    MasterTimelineBuilder,
} from "../core/timeline/MasterTimeline.ts"
import { timelineCache } from "../utils/performance/TimelineCache.ts"
import { propertyValueCache } from "../utils/performance/PropertyValueCache.ts"
import { MasterTimelinePlayer } from "../core/timeline/MasterTimelinePlayer.ts"

/**
 * Scroll boundaries configuration for progress tracking
 *
 * @description
 * Import from ScrollProgressTracker to ensure consistent typing
 */
import type { ScrollBoundaries } from "./ScrollProgressTracker.ts"
import {
    ScrollProgressTracker,
    scrollProgressTracker,
    type ProgressCallback,
} from "./ScrollProgressTracker.ts"
import {
    TimelineScrollMapper,
    timelineScrollMapper,
    type ScrollTimeline,
} from "./TimelineScrollMapper.ts"
import {
    ScrollPropertyApplicator,
    scrollPropertyApplicator,
    type PropertyBatch,
} from "./ScrollPropertyApplicator.ts"

// 🔥 DOM DISCONNECTION FIX: Import dynamic element resolution system
import { resolveElement, ensureElementId } from "../utils/dom/DynamicElementResolver.ts"

import { EnvironmentDetector } from "../utils/environment/EnvironmentDetector.ts"
import { expandDistributedProperties } from "../config/adapters/AnimationSlotAdapter.ts"
import { GridDetector } from "../utils/staggering/grid/GridDetector.ts"
import { OriginResolver } from "../utils/staggering/grid/OriginResolver.ts"
import { DistanceCalculator } from "../utils/staggering/grid/DistanceCalculator.ts"

// 🚨 NEW: Import existing coordinators for threshold stagger
import { BehaviorCoordinator } from "../core/coordinators/BehaviorCoordinator.ts"
import { animationStateManager } from "../core/state/AnimationStateManager.ts"
import { AnimationBehavior, AnimationStatus, ReverseMode } from "../types/index.ts"

// 🎨 NEW: Text Processing Integration for Scroll Animations
import { TextSplitter } from "../utils/text/TextSplitter.ts"
import { findAnimatedElementsWithCriteria } from "../dom/ElementFinder.ts"

// ✅ PERFORMANCE FIX: Import DirectScrollApplicator for immediate application (no RAF delays)
import { directScrollApplicator } from './DirectScrollApplicator.ts';

/**
 * 🚀 SCROLL PERFORMANCE ARCHITECTURE:
 * 
 * Each ScrollProgressTracker instance provides:
 * - Isolated boundary calculation and caching
 * - Sophisticated viewport and scroll container detection  
 * - Proper progress tracking with epsilon filtering
 * 
 * Performance coordination via UnifiedScrollManager:
 * - Each ScrollProgressTracker automatically registers with UnifiedScrollManager
 * - Single global scroll listener coordinates all trackers
 * - RAF batching with 8ms frame budgeting for 60fps
 * - Priority-based processing (medium priority for progress tracking)
 * 
 * This hybrid approach provides both accuracy AND performance.
 */

/**
 * Stagger mode configuration for scrubbed scroll animations
 */
export interface ScrollStaggerConfig {
    /** Stagger mode */
    mode: "scrubbed" | "threshold"
    /** Animation duration as percentage of total scroll (0-100) */
    scrubWindow?: number
    /** Delay between threshold triggers (only for threshold mode) */
    thresholdDelay?: number
    /** Stagger strategy */
    strategy?: "linear" | "grid" | "random"
    /** Element order for linear stagger */
    order?: string
    /** Grid mode for grid stagger */
    gridMode?: "point-based" | "row-based" | "column-based"
    /** Grid origin point */
    gridOrigin?: string
    /** Grid row direction */
    gridRowDirection?: string
    /** Grid column direction */
    gridColumnDirection?: string
    /** Grid distance metric */
    gridDistanceMetric?: string
    /** Grid reverse mode */
    gridReverseMode?: string
    /** Grid auto-detection */
    gridAutoDetect?: boolean
    /** Manual grid rows */
    gridRows?: number
    /** Manual grid columns */
    gridColumns?: number
}

/**
 * Threshold checkpoint state for tracking animation progress
 */
interface ThresholdCheckpointState {
    /** Checkpoint progress value (0-1) */
    checkpoint: number
    /** Whether checkpoint has been crossed forward */
    crossedForward: boolean
    /** Whether checkpoint has been crossed backward (for reverse) */
    crossedBackward: boolean
    /** Element-specific slot ID for state tracking */
    elementSlotId: string
}

/**
 * Active scroll animation instance
 * 🔥 DOM DISCONNECTION FIX: Modified to store element IDs instead of direct references
 */
interface ActiveScrollAnimation {
    /** Animation ID */
    id: string
    /** Animation slot */
    slot: AnimationSlot
    /** Trigger element ID (instead of direct reference) */
    triggerElementId: string
    /** Animated element IDs (instead of direct references) */
    animatedElementIds: string[]
    /** Scroll boundaries */
    boundaries: ScrollBoundaries
    /** Scroll timeline */
    scrollTimeline: ScrollTimeline
    /** Progress tracker cleanup */
    progressCleanup: () => void
    /** Stagger configuration */
    staggerConfig?: ScrollStaggerConfig
    /** Individual element progress for scrubbed stagger (using element IDs as keys) */
    elementProgress?: Map<string, number>
    /** Threshold checkpoints for threshold stagger (using element IDs as keys) */
    thresholdCheckpoints?: Map<string, number>
    /** Threshold checkpoint states for threshold stagger (using element IDs as keys) */
    thresholdStates?: Map<string, ThresholdCheckpointState>
    /** Behavior coordinator for threshold stagger */
    behaviorCoordinator?: BehaviorCoordinator
    /** Direct animation executor for threshold stagger */
    animationExecutor?: (
        elementSlot: AnimationSlot,
        elements: HTMLElement[],
        behavior: string,
        startProgress: number,
        reverseMode?: ReverseMode
    ) => Promise<void>

}

/**
 * ScrollAnimationCoordinator - Master coordinator for scrubbed scroll animations
 *
 * @description
 * Orchestrates the complete scrubbed scroll animation system by coordinating
 * ScrollProgressTracker, TimelineScrollMapper, and ScrollPropertyApplicator.
 * Handles both scrubbed and threshold stagger modes for multiple elements.
 */
export class ScrollAnimationCoordinator {
    private activeAnimations = new Map<string, ActiveScrollAnimation>()
    private animationCounter = 0
    private masterTimelinePlayer: MasterTimelinePlayer
    private isCanvasMode: boolean

    constructor() {
        console.log("🎪 [ScrollAnimationCoordinator] Initialized")
        this.masterTimelinePlayer = new MasterTimelinePlayer()

        // Cache environment detection result to avoid repeated calls during scroll
        this.isCanvasMode = EnvironmentDetector.isCanvas()

        // Skip initialization in Canvas mode
        if (this.isCanvasMode) {
            console.log(
                "🎨 [ScrollAnimationCoordinator] Canvas mode detected - scrubbed animations disabled"
            )
        }
    }

    /**
     * Process animated elements for text splitting
     * 
     * @description
     * Similar to EventAnimationCoordinator.findAnimatedElements, this method processes
     * the animated elements to apply text splitting when enabled. This ensures that
     * scroll animations can target individual lines, words, or characters instead of
     * the entire paragraph.
     */
    private async processAnimatedElementsForTextSplitting(
        slot: AnimationSlot,
        parentElement: HTMLElement,
        animatedElements: HTMLElement[],
        textElementCallbacks?: {
            updateElementRefs?: (elements: HTMLElement[], splitType?: any) => void,
            registerForSplitCallbacks?: (elementId: string) => void,
            retargetAnimations?: () => void,
            addRetargetCallback?: (callback: () => void) => void
        }
    ): Promise<HTMLElement[]> {
        const processedElements: HTMLElement[] = []
        
        console.log(`🎨 [ScrollAnimationCoordinator] Processing ${animatedElements.length} animated elements for text splitting`)
        
        // Process each animated element configuration
        for (const [configIndex, animatedElementConfig] of slot.animatedElements.entries()) {
            // Find the elements that match this configuration
            const matchingElements = findAnimatedElementsWithCriteria(
                parentElement,
                animatedElementConfig.selection,
                false
            )
            
            console.log(`🎨 [ScrollAnimationCoordinator] Config ${configIndex}: Found ${matchingElements.length} matching elements`)
            
            // Process each matching element
            for (const element of matchingElements) {
                try {
                    // 🎨 Check if text processing is enabled for this element config
                    if (animatedElementConfig.textProcessing?.enabled) {
                        // console.log(`🎨 [ScrollAnimationCoordinator] Text processing enabled for element:`, {
                        //     elementId: element.getAttribute('data-fame-element-id') || element.id || 'no-id',
                        //     animateBy: animatedElementConfig.textProcessing.animateBy
                        // })
                        
                        // 🔥 Use animateBy-specific selector instead of broad selector
                        const animateBy = animatedElementConfig.textProcessing.animateBy
                        let existingSplitSelector: string
                        
                        switch (animateBy) {
                            case 'lines':
                                // When animating by lines, select text lines (not mask containers)
                                existingSplitSelector = '.fame-text-line'
                                break
                            case 'characters':
                                // When animating by characters, select ONLY character elements
                                existingSplitSelector = '.fame-text-char'
                                break
                            case 'words':
                                // When animating by words, select ONLY word elements  
                                existingSplitSelector = '.fame-text-word'
                                break
                            default:
                                // Fallback to previous behavior for unknown animateBy values
                                existingSplitSelector = '.fame-text-line, .fame-text-word, .fame-text-char'
                                console.warn(`🚨 [ScrollAnimationCoordinator] Unknown animateBy value: ${animateBy}`)
                        }
                        
                        // 🔥 Check for existing split elements and decide whether to reuse or re-split
                        const existingSplitElements = Array.from(element.querySelectorAll(existingSplitSelector)) as HTMLElement[]
                        
                        if (existingSplitElements.length > 0) {
                            // Check if existing elements are potentially stale
                            const shouldForceResplit = this.shouldForceResplitForStyleChanges(element, existingSplitElements)
                            
                            if (shouldForceResplit) {
                                console.log(`🔄 [ScrollAnimationCoordinator] 🚨 FORCING RE-SPLIT: Style changes detected, existing elements may be stale`)
                                
                                // Force cleanup and re-split
                                await this.forceResplitTextElement(element, animatedElementConfig.textProcessing)
                                
                                // Get the newly created elements
                                const newSplitElements = Array.from(element.querySelectorAll(existingSplitSelector)) as HTMLElement[]
                                if (newSplitElements.length > 0) {
                                    console.log(`🔄 [ScrollAnimationCoordinator] ✅ Re-split complete: ${newSplitElements.length} fresh ${animateBy} elements`)
                                    processedElements.push(...newSplitElements)
                                    
                                    // Update React refs for the new elements
                                    if (textElementCallbacks?.updateElementRefs) {
                                        textElementCallbacks.updateElementRefs(newSplitElements, animatedElementConfig.textProcessing.splitType)
                                    }
                                } else {
                                    console.warn(`🔄 [ScrollAnimationCoordinator] Re-split failed, falling back to original element`)
                                    processedElements.push(element)
                                }
                            } else {
                                // Safe to reuse existing elements
                                console.log(`🔧 [ScrollAnimationCoordinator] ✅ Reusing ${existingSplitElements.length} existing ${animateBy} elements - no style changes detected`)
                                processedElements.push(...existingSplitElements)
                            }
                            continue // Skip to next element
                        }
                        
                        console.log(`🎨 [ScrollAnimationCoordinator] No existing split elements found, calling TextSplitter.splitText()`)
                        
                        // Split the text element
                        const result = await TextSplitter.getInstance().splitText(
                            element,
                            animatedElementConfig.textProcessing
                        )
                        
                        console.log(`🎨 [ScrollAnimationCoordinator] TextSplitter result:`, {
                            success: result.success,
                            splitElementsCount: result.splitElements?.length || 0,
                            error: result.error
                        })
                        
                        if (result.success && result.splitElements.length > 0) {
                            // 🔥 Update React refs for the new text elements
                            if (textElementCallbacks?.updateElementRefs) {
                                textElementCallbacks.updateElementRefs(result.splitElements, animatedElementConfig.textProcessing.splitType)
                            }

                            // 🔥 Register for future split callbacks (for responsive resize)
                            if (textElementCallbacks?.registerForSplitCallbacks) {
                                const elementId = element.getAttribute('data-fame-element-id') || element.id
                                if (elementId) {
                                    textElementCallbacks.registerForSplitCallbacks(elementId)
                                }
                            }
                            
                            // Filter out any disconnected elements before adding to animation pool
                            const connectedElements = result.splitElements.filter(el => el.isConnected && document.contains(el))
                            processedElements.push(...connectedElements)
                        } else {
                            // Fallback: add original element if splitting failed
                            processedElements.push(element)
                        }
                    } else {
                        // No text processing - use original element
                        processedElements.push(element)
                    }
                } catch (error) {
                    console.error(`🎨 [ScrollAnimationCoordinator] Text processing failed for element:`, error)
                    // Fallback: add original element
                    processedElements.push(element)
                }
            }
        }
        
        console.log(`🎨 [ScrollAnimationCoordinator] ✅ Processed ${processedElements.length} total elements (including split text elements)`)
        
        // 📊 Add element index tracking for distributed properties
        processedElements.forEach((element, index) => {
            element.setAttribute('data-fame-element-index', index.toString())
        })
        
        return processedElements
    }

    /**
     * 🔥 Detect if existing split elements should be re-created due to style changes
     * This addresses the core issue where existing elements become stale after breakpoint style changes
     */
    private shouldForceResplitForStyleChanges(parentElement: HTMLElement, existingSplitElements: HTMLElement[]): boolean {
        try {
            // Strategy 1: Check if parent element has recent style modifications
            const parentStyleTimestamp = parentElement.getAttribute('data-fame-style-timestamp')
            const splitTimestamp = existingSplitElements[0]?.getAttribute('data-fame-split-timestamp')
            
            if (parentStyleTimestamp && splitTimestamp) {
                const parentTime = parseInt(parentStyleTimestamp)
                const splitTime = parseInt(splitTimestamp)
                
                // If parent was styled after split creation, force re-split
                if (parentTime > splitTime) {
                    console.log(`🔄 [ScrollAnimationCoordinator] Style timestamp mismatch: parent(${parentTime}) > split(${splitTime})`)
                    return true
                }
            }
            
            // Strategy 2: Check for style attribute changes that indicate Framer breakpoint styling
            const hasFramerStyleAttrs = parentElement.hasAttribute('style') && 
                                      (parentElement.style.opacity !== '' || 
                                       parentElement.style.color !== '' ||
                                       parentElement.style.fontSize !== '' ||
                                       parentElement.style.transform !== '')
            
            // Strategy 3: Check if existing elements lack proper styling/attributes
            const firstSplitElement = existingSplitElements[0]
            if (firstSplitElement) {
                // Check if the split element is missing critical animation attributes
                const hasAnimationSetup = firstSplitElement.style.willChange || 
                                         firstSplitElement.style.transformOrigin ||
                                         firstSplitElement.hasAttribute('data-fame-element-id')
                
                if (!hasAnimationSetup) {
                    console.log(`🔄 [ScrollAnimationCoordinator] Missing animation setup on existing split elements`)
                    return true
                }
            }
            
            // Strategy 4: Detect if we're in a breakpoint transition (heuristic)
            const recentMutationIndicator = document.body.getAttribute('data-framer-mutation-timestamp')
            if (recentMutationIndicator) {
                const mutationTime = parseInt(recentMutationIndicator)
                const now = Date.now()
                
                // If DOM mutations happened within last 1 second, be more aggressive about re-splitting
                if (now - mutationTime < 1000) {
                    console.log(`🔄 [ScrollAnimationCoordinator] Recent DOM mutations detected, forcing re-split for safety`)
                    return true
                }
            }
            
            // Strategy 5: For now, always force re-split when style attributes are present
            // This is conservative but should fix the immediate issue
            if (hasFramerStyleAttrs) {
                console.log(`🔄 [ScrollAnimationCoordinator] Framer style attributes detected on parent, forcing re-split`)
                return true
            }
            
            return false // Safe to reuse existing elements
            
        } catch (error) {
            console.warn(`🔄 [ScrollAnimationCoordinator] Error checking style changes, defaulting to re-split:`, error)
            return true // When in doubt, re-split for safety
        }
    }

    /**
     * 🔥 Force re-splitting of a text element by cleaning up and re-creating split elements
     */
    private async forceResplitTextElement(element: HTMLElement, textProcessingConfig: any): Promise<void> {
        try {
            console.log(`🔄 [ScrollAnimationCoordinator] Force re-splitting text element:`, {
                elementId: element.getAttribute('data-fame-element-id') || element.id,
                currentChildren: element.children.length
            })
            
            // Clean up existing split elements using TextSplitter
            const textSplitter = TextSplitter.getInstance()
            const cleanupSuccess = textSplitter.cleanupSplitText(element)
            
            if (!cleanupSuccess) {
                console.warn(`🔄 [ScrollAnimationCoordinator] Cleanup failed, proceeding anyway`)
            }
            
            // Mark the parent element with timestamp to track this re-split
            element.setAttribute('data-fame-style-timestamp', Date.now().toString())
            
            // Force re-splitting
            const result = await textSplitter.splitText(element, textProcessingConfig)
            
            if (!result.success) {
                console.error(`🔄 [ScrollAnimationCoordinator] Force re-split failed:`, result.error)
                throw new Error(`Re-split failed: ${result.error}`)
            }
            
            // Mark new split elements with timestamp
            if (result.splitElements) {
                result.splitElements.forEach(splitEl => {
                    splitEl.setAttribute('data-fame-split-timestamp', Date.now().toString())
                })
            }
            
            console.log(`🔄 [ScrollAnimationCoordinator] ✅ Force re-split completed: ${result.splitElements?.length || 0} new elements`)
            
        } catch (error) {
            console.error(`🔄 [ScrollAnimationCoordinator] Force re-split error:`, error)
            throw error // Re-throw to let caller handle fallback
        }
    }

    /**
     * Start scrubbed scroll animation
     *
     * @param slot - Animation slot configuration
     * @param triggerElement - Element to track for scroll progress
     * @param animatedElements - Elements to animate
     * @param boundaries - Scroll boundaries
     * @param staggerConfig - Stagger configuration
     * @param parentElement - Parent element for text processing
     * @param textElementCallbacks - React ref management callbacks for text elements
     * @returns Cleanup function
     */
    async startScrollAnimation(
        slot: AnimationSlot,
        triggerElement: HTMLElement,
        animatedElements: HTMLElement[],
        boundaries: ScrollBoundaries,
        staggerConfig?: ScrollStaggerConfig,
        parentElement?: HTMLElement,
        textElementCallbacks?: {
            updateElementRefs?: (elements: HTMLElement[], splitType?: any) => void,
            registerForSplitCallbacks?: (elementId: string) => void,
            retargetAnimations?: () => void,
            addRetargetCallback?: (callback: () => void) => void
        }
    ): Promise<() => void> {
        // Skip in Canvas mode
        if (this.isCanvasMode) {
            console.log(
                "🎨 [ScrollAnimationCoordinator] Scrubbed animations disabled in Canvas mode"
            )
            return () => {}
        }

        // Generate unique animation ID
        // 🎯 ENHANCED ID GENERATION: Prevent conflicts between multiple scrubbed animations
        const microTimestamp = performance.now().toString().replace('.', '_');
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        const slotIdFragment = slot.id.slice(-12); // Last 12 chars of slot ID for traceability
        const animationId = `scroll-animation-${++this.animationCounter}-${slotIdFragment}-${microTimestamp}-${randomSuffix}`;

        // 🚨 CONFLICT DETECTION: Check for animation ID conflicts
        if (this.activeAnimations.has(animationId)) {
            throw new Error(`🚨 [ScrollAnimationCoordinator] Animation ID conflict detected: ${animationId}`);
        }

        console.log(`🎪 [ScrollAnimationCoordinator] Generated unique animation ID: ${animationId}`);

        // 🎨 NEW: Process animated elements for text splitting if parent element is provided
        let processedAnimatedElements = animatedElements
        if (parentElement) {
            console.log(`🎨 [ScrollAnimationCoordinator] Processing animated elements for text splitting`)
            processedAnimatedElements = await this.processAnimatedElementsForTextSplitting(
                slot,
                parentElement,
                animatedElements,
                textElementCallbacks
            )
            console.log(`🎨 [ScrollAnimationCoordinator] Text processing complete: ${animatedElements.length} -> ${processedAnimatedElements.length} elements`)
        }

        // Expand distributed properties for all elements (using processed elements)
        const expandedSlot = expandDistributedProperties(slot, processedAnimatedElements)

        // console.log(`🚨 [DEBUG SLOT] Slot expansion:`, {
        //     originalSlotId: slot.id,
        //     expandedSlotId: expandedSlot.id,
        //     originalPropertiesCount: slot.properties.length,
        //     expandedPropertiesCount: expandedSlot.properties.length,
        //     processedElementsCount: processedAnimatedElements.length,
        //     hasDistributedProperties: expandedSlot.properties.some(p => p.distributedFromValues || p.distributedToValues),
        //     originalProperties: slot.properties.map(p => ({
        //         property: p.property,
        //         from: p.from,
        //         to: p.to,
        //         hasDistributedFrom: !!p.distributedFromValues,
        //         hasDistributedTo: !!p.distributedToValues
        //     })),
        //     expandedProperties: expandedSlot.properties.map(p => ({
        //         property: p.property,
        //         from: p.from,
        //         to: p.to,
        //         hasDistributedFrom: !!p.distributedFromValues,
        //         hasDistributedTo: !!p.distributedToValues
        //     }))
        // });

        // 🚀 PERFORMANCE FIX: Use cached timeline instead of rebuilding
        // Check if we need to rebuild timeline for distributed properties
        if (
            expandedSlot.properties.some(
                (prop) => prop.distributedFromValues || prop.distributedToValues
            )
        ) {
            // console.log(
            //     "🔧 [ScrollAnimationCoordinator] Getting cached timeline for distributed properties"
            // )

            // Use timeline cache with slot ID for proper isolation
            const cachedTimeline = timelineCache.getOrCreateTimeline(
                expandedSlot.properties,
                () => {
                    console.log(`🔧 [ScrollAnimationCoordinator] Creating new timeline for slot ${slot.id} (cache miss)`)
                    const builder = new MasterTimelineBuilder()
                    return builder.buildMasterTimeline(expandedSlot.properties)
                },
                slot.id
            )

            // Update the slot with the cached timeline
            expandedSlot.masterTimeline = cachedTimeline

            // console.log(
            //     "🔧 [ScrollAnimationCoordinator] Using cached timeline:",
            //     {
            //         propertyCount: expandedSlot.properties.length,
            //         distributedPropertyCount: expandedSlot.properties.filter(
            //             (p) => p.distributedFromValues || p.distributedToValues
            //         ).length,
            //         totalDuration: cachedTimeline.totalDuration,
            //         cacheMetrics: timelineCache.getMetrics()
            //     }
            // )
        } else {
        //     console.log(`🚨 [DEBUG TIMELINE] No distributed properties - using slot's existing masterTimeline:`, {
        //         hasExistingTimeline: !!expandedSlot.masterTimeline,
        //         slotId: expandedSlot.id
        //     });
        }

        // Validate master timeline
        if (!expandedSlot.masterTimeline) {
            console.error(
                "🎪 [ScrollAnimationCoordinator] No master timeline found for slot:",
                slot.id
            )
            return () => {}
        }

        // console.log(`🚨 [DEBUG TIMELINE] Master timeline validation:`, {
        //     hasMasterTimeline: !!expandedSlot.masterTimeline,
        //     totalDuration: expandedSlot.masterTimeline.totalDuration,
        //     propertyTimelinesCount: expandedSlot.masterTimeline.propertyTimelines.length,
        //     slotId: slot.id,
        //     properties: slot.properties.map(p => ({
        //         property: p.property,
        //         from: p.from,
        //         to: p.to
        //     }))
        // });

        // Create scroll timeline from master timeline
        const scrollTimeline = timelineScrollMapper.mapTimelineToScroll(
            expandedSlot.masterTimeline as MasterTimeline,
            { mode: "compress_to_scroll", preserveRelativeTiming: true }
        )

        // console.log(`🚨 [DEBUG TIMELINE] Scroll timeline creation:`, {
        //     hasScrollTimeline: !!scrollTimeline,
        //     scrollPropertyTimelinesCount: scrollTimeline.propertyTimelines.length,
        //     originalDuration: scrollTimeline.originalTimeline.totalDuration,
        //     compressionRatio: scrollTimeline.metadata?.compressionRatio,
        //     keyframeCount: scrollTimeline.metadata?.keyframeCount
        // });

        // ❌ DISABLED: Pre-computation was adding overhead without real benefit
        // The property cache was pre-computing values but then recalculating anyway during scroll
        // console.log(`🚀 [ScrollAnimationCoordinator] Pre-computing property values for ${processedAnimatedElements.length} elements (slot: ${slot.id})`)
        // propertyValueCache.preComputeForElements(scrollTimeline, processedAnimatedElements.length, slot.id)

        // 🎯 NEW: Check if stagger is enabled before setting up stagger configuration
        // 🔥 DOM DISCONNECTION FIX: Updated to use element IDs for all maps
        let effectiveStaggerConfig: ScrollStaggerConfig | undefined = undefined
        let elementProgress: Map<string, number> | undefined = undefined
        let thresholdCheckpoints: Map<string, number> | undefined = undefined
        let thresholdStates: Map<string, ThresholdCheckpointState> | undefined = undefined
        let behaviorCoordinator: BehaviorCoordinator | undefined = undefined
        let animationExecutor: ((elementSlot: AnimationSlot, elements: HTMLElement[], behavior: string, startProgress: number, reverseMode?: ReverseMode) => Promise<void>) | undefined = undefined

        // Only setup stagger if stagger configuration is provided (meaning stagger is enabled)
        if (staggerConfig) {
            console.log(`🎪 [ScrollAnimationCoordinator] Stagger enabled - setting up stagger configuration`)
            effectiveStaggerConfig = staggerConfig

            // Initialize element progress tracking (using element IDs)
            elementProgress = new Map<string, number>()
            thresholdCheckpoints = new Map<string, number>()
            thresholdStates = new Map<string, ThresholdCheckpointState>()

            // Calculate stagger offsets (using processed elements)
            if (effectiveStaggerConfig.mode === "scrubbed") {
                this.calculateScrubbedStaggerOffsets(
                    processedAnimatedElements,
                    effectiveStaggerConfig,
                    elementProgress
                )
            } else {
                this.calculateThresholdStaggerStates(
                    processedAnimatedElements,
                    effectiveStaggerConfig,
                    thresholdCheckpoints,
                    thresholdStates,
                    expandedSlot
                )
            }

            // 🚨 NEW: Setup behavior coordinator for threshold stagger (using processed elements)
            if (effectiveStaggerConfig.mode === "threshold") {
                const result = this.createBehaviorCoordinatorForThresholdStagger(
                    expandedSlot,
                    processedAnimatedElements
                )
                behaviorCoordinator = result.behaviorCoordinator
                animationExecutor = result.animationExecutor
            }
        } else {
            //console.log(`🎪 [ScrollAnimationCoordinator] Stagger disabled - all elements will animate simultaneously`)
        }

        // Create progress callback
        const progressCallback = (globalProgress: number) => {
            this.handleScrollProgress(animationId, globalProgress)
        }

        // ✅ FIXED: Use individual ScrollProgressTracker for proper boundary calculation and isolation
        // Each tracker registers with UnifiedScrollManager automatically for coordinated scroll handling
        console.log(`🚀 [ScrollAnimationCoordinator] Creating isolated ScrollProgressTracker: ${animationId}`);
        
        let progressCleanup: () => void;
        
        if (this.isCanvasMode) {
            // Canvas mode - no scroll tracking needed
            progressCleanup = () => {};
        } else {
            // ✅ BEST APPROACH: Individual ScrollProgressTracker with UnifiedScrollManager coordination
            const progressTracker = new ScrollProgressTracker();
            progressCleanup = progressTracker.startTracking(
                triggerElement,
                boundaries,
                progressCallback
            );
        }

        // 🚨 DEBUG: Storage phase debugging (uncomment if needed)
        /*
        console.log(`🚨 [DEBUG STORAGE] BEFORE ID ASSIGNMENT - Raw processedAnimatedElements:`, {
            processedElementsCount: processedAnimatedElements.length,
            rawElements: processedAnimatedElements.map((el, index) => ({
                index,
                tagName: el.tagName,
                id: el.id || 'NO-ID',
                className: el.className || 'NO-CLASS',
                dataFameId: el.getAttribute('data-fame-element-id') || 'NO-DATA-FAME-ID',
                isConnected: el.isConnected,
                textContent: el.textContent?.slice(0, 50) + '...'
            }))
        });
        */

        // 🔥 FIX: Ensure all elements have proper IDs before storing
        const animatedElementIds = processedAnimatedElements.map(el => {
            let elementId = el.getAttribute('data-fame-element-id') || el.id;
            
            // If no ID exists, assign one using ensureElementId
            if (!elementId) {
                elementId = ensureElementId(el);
                // Debug log for ID assignment (uncomment if needed)
                /*
                console.log(`🚨 [DEBUG STORAGE] Assigned new ID "${elementId}" to element:`, {
                    tagName: el.tagName,
                    className: el.className,
                    textContent: el.textContent?.slice(0, 30)
                });
                */
            }
            
            return elementId;
        });
        
        // Debug log for final ID assignment state (uncomment if needed)
        /*
        console.log(`🚨 [DEBUG STORAGE] AFTER ID ASSIGNMENT - Final element IDs:`, {
            processedElementsCount: processedAnimatedElements.length,
            animatedElementIds: animatedElementIds,
            finalElements: processedAnimatedElements.map((el, index) => ({
                index,
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                dataFameId: el.getAttribute('data-fame-element-id'),
                assignedId: animatedElementIds[index],
                isConnected: el.isConnected
            }))
        });
        */

        // Store active animation (using processed elements)
        const activeAnimation: ActiveScrollAnimation = {
            id: animationId,
            slot: expandedSlot,
            triggerElementId: triggerElement.getAttribute('data-fame-element-id') || triggerElement.id,
            animatedElementIds: animatedElementIds,
            boundaries,
            scrollTimeline,
            progressCleanup,
            staggerConfig: effectiveStaggerConfig,
            elementProgress,
            thresholdCheckpoints,
            thresholdStates,
            behaviorCoordinator,
            animationExecutor,
        }

        this.activeAnimations.set(animationId, activeAnimation)

        // Apply initial values based on stagger mode
        if (!effectiveStaggerConfig) {
            // No stagger configuration means stagger is disabled - apply initial values at progress 0
            this.handleScrollProgress(animationId, 0)
        } else if (effectiveStaggerConfig.mode === "threshold") {
            // For threshold stagger, apply initial "from" values to all elements immediately
            this.applyInitialValuesForThresholdStagger(activeAnimation)

            // Check if any checkpoints should be initially triggered (in case we start mid-scroll)
            this.checkInitialThresholdStates(activeAnimation)
        } else {
            // For scrubbed stagger, apply initial values at progress 0
            this.handleScrollProgress(animationId, 0)
        }

        // Return cleanup function that cleans up both progress tracking and smoothing
        return () => this.stopScrollAnimation(animationId)
    }

    /**
     * Create behavior coordinator for threshold stagger
     * 
     * @description
     * Creates a behavior coordinator that handles individual element animations
     * using element-specific slot IDs for proper state tracking
     */
    private createBehaviorCoordinatorForThresholdStagger(
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): { behaviorCoordinator: BehaviorCoordinator; animationExecutor: (elementSlot: AnimationSlot, elements: HTMLElement[], behavior: string, startProgress: number, reverseMode?: ReverseMode) => Promise<void> } {
        // Create animation executor that handles individual element animations
        const animationExecutor = async (
            elementSlot: AnimationSlot,
            elements: HTMLElement[],
            behavior: string,
            startProgress: number,
            reverseMode?: ReverseMode
        ) => {
            // For threshold stagger, we only animate one element at a time
            const element = elements[0] // Should always be single element
            if (!element) return

            // Get element index for distributed properties
            const elementIndex = animatedElements.indexOf(element)
            if (elementIndex === -1) return

            // 🎯 CRITICAL FIX: Use the elementSlot parameter directly instead of recreating it
            // This ensures we use the unique element-specific slot that was passed in
            const elementSpecificSlot = elementSlot
            
            // Ensure we have a master timeline
            if (!elementSpecificSlot.masterTimeline) {
                console.error(
                    "🎪 [ScrollAnimationCoordinator] No master timeline found for element-specific slot:",
                    elementSpecificSlot.id
                )
                return
            }

            // Initialize state for this element if not exists
            const elementSlotId = elementSpecificSlot.id
            if (!animationStateManager.getState(elementSlotId)) {
                animationStateManager.initializeState(elementSlotId, element.id || `element-${elementIndex}`)
            }

            // Get current progress from state manager
            const currentState = animationStateManager.getState(elementSlotId)
            const currentProgress = currentState ? currentState.progress : startProgress

            // Create progress callback that updates the state
            const progressCallback = (progress: number) => {
                animationStateManager.updateProgress(elementSlotId, progress, AnimationStatus.RUNNING)
            }

            // console.log(
            //     `🎪 [ScrollAnimationCoordinator] Executing behavior for element ${elementIndex}:`,
            //     {
            //         behavior,
            //         currentProgress,
            //         elementSlotId,
            //         reverseMode: reverseMode || ReverseMode.EASING_PRESERVATION
            //     }
            // )

            try {
                // 🎯 CRITICAL FIX: Use masterTimelinePlayer.executeBehavior instead of timedAnimator.animate
                // This ensures proper handling of forward/backward behaviors and state management
                const finalProgress = await this.masterTimelinePlayer.executeBehavior(
                    behavior as AnimationBehavior,
                    elementSpecificSlot.masterTimeline as MasterTimeline,
                    element,
                    currentProgress,
                    progressCallback,
                    reverseMode || ReverseMode.EASING_PRESERVATION
                )

                // Update final state
                animationStateManager.updateProgress(elementSlotId, finalProgress, AnimationStatus.COMPLETED)
                animationStateManager.updateTarget(elementSlotId, finalProgress)

                console.log(
                    `🎪 [ScrollAnimationCoordinator] Animation completed for element ${elementIndex}:`,
                    {
                        behavior,
                        finalProgress,
                        elementSlotId
                    }
                )
            } catch (error) {
                console.error(
                    `🎪 [ScrollAnimationCoordinator] Animation error for element ${elementIndex}:`,
                    error
                )
                // Mark as completed with current state on error
                const errorState = animationStateManager.getState(elementSlotId)
                const errorProgress = errorState ? errorState.progress : startProgress
                animationStateManager.updateProgress(elementSlotId, errorProgress, AnimationStatus.COMPLETED)
                animationStateManager.updateTarget(elementSlotId, errorProgress)
            }
        }

        return {
            behaviorCoordinator: new BehaviorCoordinator(animationExecutor),
            animationExecutor
        }
    }

    /**
     * Handle scroll progress update
     * 🔥 DOM DISCONNECTION FIX: Updated to use dynamic element resolution
     */
    private handleScrollProgress(
        animationId: string,
        globalProgress: number
    ): void {
        const animation = this.activeAnimations.get(animationId)
        if (!animation) return

        const { staggerConfig, animatedElementIds, scrollTimeline } = animation

        // 🎯 NEW: Check if stagger is enabled
        if (!staggerConfig) {
            // No stagger configuration means stagger is disabled - animate all elements simultaneously
            this.handleNonStaggeredProgress(animation, globalProgress)
        } else if (staggerConfig.mode === "scrubbed") {
            // Scrubbed mode: calculate individual element progress
            this.handleScrubbedStaggerProgress(animation, globalProgress)
        } else {
            // Threshold mode: check threshold crossings
            this.handleThresholdStaggerProgress(animation, globalProgress)
        }
    }

    /**
     * Handle non-staggered progress (when stagger is disabled)
     * 🔥 DOM DISCONNECTION FIX: Updated to use dynamic element resolution
     * 
     * @description
     * When stagger is disabled, all elements animate simultaneously with the same progress.
     * ✅ FIXED: Uses the same working pattern as other methods for reliability.
     */
    private handleNonStaggeredProgress(
        animation: ActiveScrollAnimation,
        globalProgress: number
    ): void {
        console.log(`🚨 [DEBUG] handleNonStaggeredProgress called with progress: ${globalProgress}`);
        
        const { animatedElementIds, scrollTimeline } = animation

        console.log(`🚨 [DEBUG] Animation object:`, {
            animatedElementIds,
            hasScrollTimeline: !!scrollTimeline,
            scrollTimelineProps: scrollTimeline ? scrollTimeline.propertyTimelines.length : 0,
            slotId: animation.slot.id
        });

        // 🔥 DOM DISCONNECTION FIX: Dynamically resolve elements from IDs
        const animatedElements = animatedElementIds.map(id => resolveElement(id)).filter(el => el !== null) as HTMLElement[]
        
        console.log(`🚨 [DEBUG] Resolved elements:`, {
            elementIdsCount: animatedElementIds.length,
            resolvedElementsCount: animatedElements.length,
            elementIds: animatedElementIds,
            elements: animatedElements.map(el => ({
                tagName: el.tagName,
                id: el.id,
                className: el.className
            }))
        });

        // 🚨 SUPER DEBUG: Let's see what's actually in the DOM vs what we're looking for
        if (animatedElements.length === 0) {
            console.error(`🚨 [DEBUG] DETAILED RESOLUTION FAILURE ANALYSIS:`);
            
            animatedElementIds.forEach((elementId, index) => {
                console.error(`🚨 [DEBUG] Element ID ${index}: "${elementId}"`);
                
                // Try the exact same strategies as DynamicElementResolver
                const byDataAttr = document.querySelector(`[data-fame-element-id="${elementId}"]`);
                const byId = document.getElementById(elementId);
                
                console.error(`🚨 [DEBUG] - By data-fame-element-id: ${byDataAttr ? 'FOUND' : 'NOT FOUND'}`);
                console.error(`🚨 [DEBUG] - By getElementById: ${byId ? 'FOUND' : 'NOT FOUND'}`);
                
                if (byDataAttr) {
                    console.error(`🚨 [DEBUG] - Found via data attr:`, {
                        tagName: byDataAttr.tagName,
                        id: (byDataAttr as HTMLElement).id,
                        className: (byDataAttr as HTMLElement).className,
                        isConnected: (byDataAttr as HTMLElement).isConnected
                    });
                }
                
                if (byId) {
                    console.error(`🚨 [DEBUG] - Found via ID:`, {
                        tagName: byId.tagName,
                        className: byId.className,
                        isConnected: byId.isConnected
                    });
                }
            });
            
            // Also show what elements actually exist with data-fame-element-id attributes
            const allFameElements = document.querySelectorAll('[data-fame-element-id]');
            console.error(`🚨 [DEBUG] ALL ELEMENTS WITH data-fame-element-id in DOM (${allFameElements.length} total):`);
            allFameElements.forEach((el, index) => {
                const htmlEl = el as HTMLElement;
                const elementId = htmlEl.getAttribute('data-fame-element-id');
                console.error(`🚨 [DEBUG] DOM Element ${index}: ID="${elementId}", tag=${htmlEl.tagName}, class="${htmlEl.className}"`);
            });
            
            console.error(`🚨 [DEBUG] No elements found! Cannot apply animation.`);
            return;
        }

        if (!scrollTimeline) {
            console.error(`🚨 [DEBUG] No scroll timeline! Cannot apply animation.`);
            return;
        }

        // ✅ FIXED: Use the same reliable approach as working methods
        // Apply the same progress to all elements (no stagger calculations)
        animatedElements.forEach((element, elementIndex) => {
            // Use global progress directly for all elements (no stagger offset)
            const elementFinalProgress = globalProgress;

            console.log(`🚨 [DEBUG] Processing element ${elementIndex}:`, {
                elementFinalProgress,
                elementTagName: element.tagName,
                elementId: element.id
            });

            try {
                // Get property values using the working timeline approach
                console.log(`🚨 [DEBUG] Calling getValuesUsingOriginalInterpolationForElement...`);
                const propertyValues = timelineScrollMapper.getValuesUsingOriginalInterpolationForElement(
                    scrollTimeline,
                    elementFinalProgress,
                    elementIndex
                );

                console.log(`🚨 [DEBUG] Got property values:`, {
                    propertyValuesSize: propertyValues.size,
                    properties: Array.from(propertyValues.entries())
                });

                if (propertyValues.size === 0) {
                    console.warn(`🚨 [DEBUG] No property values returned for element ${elementIndex}!`);
                    return;
                }

                // Apply values using the working property applicator
                console.log(`🚨 [DEBUG] Calling applyTimelineValues...`);
                scrollPropertyApplicator.applyTimelineValues(
                    element,
                    propertyValues,
                    elementFinalProgress
                );
                
                console.log(`🚨 [DEBUG] Successfully applied values to element ${elementIndex}`);

            } catch (error) {
                console.error(`🚨 [DEBUG] Error processing element ${elementIndex}:`, error);
            }

            // 🔍 DEBUG: Log progress for troubleshooting
            if (elementIndex === 0) { // Only log for first element to avoid spam
                console.log(`🎪 [ScrollAnimationCoordinator] Non-staggered progress: ${(elementFinalProgress * 100).toFixed(1)}% for ${animatedElements.length} elements`);
            }
        });
        
        console.log(`🚨 [DEBUG] handleNonStaggeredProgress completed`);
    }

    /**
     * Handle scrubbed stagger progress
     * 🔥 DOM DISCONNECTION FIX: Updated to use dynamic element resolution
     * 
     * @description
     * ✅ FIXED: Uses the same reliable approach as working methods for consistency.
     */
    private handleScrubbedStaggerProgress(
        animation: ActiveScrollAnimation,
        globalProgress: number
    ): void {
        const { animatedElementIds, scrollTimeline, elementProgress } = animation

        // 🔥 DOM DISCONNECTION FIX: Dynamically resolve elements from IDs
        const animatedElements = animatedElementIds.map(id => resolveElement(id)).filter(el => el !== null) as HTMLElement[]

        animatedElements.forEach((element, elementIndex) => {
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key instead of element reference
            const elementId = ensureElementId(element)
            const elementScrollProgress = elementProgress?.get(elementId) || 0
            const elementFinalProgress = this.calculateElementProgress(
                globalProgress,
                elementScrollProgress,
                animation.staggerConfig?.scrubWindow || 100
            )

            // ✅ FIXED: Use the same reliable approach as working methods
            // Get property values using the working timeline approach
            const propertyValues = timelineScrollMapper.getValuesUsingOriginalInterpolationForElement(
                scrollTimeline,
                elementFinalProgress,
                elementIndex
            );

            // Apply values using the working property applicator
            scrollPropertyApplicator.applyTimelineValues(
                element,
                propertyValues,
                elementFinalProgress
            );

            // 🔍 DEBUG: Log progress for first element only to avoid spam
            if (elementIndex === 0) {
                console.log(`🎪 [ScrollAnimationCoordinator] Staggered progress: Global=${(globalProgress * 100).toFixed(1)}%, Element=${(elementFinalProgress * 100).toFixed(1)}% (offset=${(elementScrollProgress * 100).toFixed(1)}%)`);
            }
        });
    }

    /**
     * Handle threshold stagger progress
     * 🔥 DOM DISCONNECTION FIX: Updated to use dynamic element resolution
     */
    private handleThresholdStaggerProgress(
        animation: ActiveScrollAnimation,
        globalProgress: number
    ): void {
        const { 
            animatedElementIds, 
            thresholdStates, 
            thresholdCheckpoints, 
            slot, 
            animationExecutor 
        } = animation

        if (!thresholdStates || !thresholdCheckpoints || !animationExecutor) return

        // 🔥 DOM DISCONNECTION FIX: Dynamically resolve elements from IDs
        const animatedElements = animatedElementIds.map(id => resolveElement(id)).filter(el => el !== null) as HTMLElement[]

        const tolerance = 0.01 // 1% tolerance for threshold crossing

        animatedElements.forEach((element, index) => {
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key instead of element reference
            const elementId = ensureElementId(element)
            const state = thresholdStates.get(elementId)
            if (!state) return

            const { checkpoint, crossedForward, crossedBackward, elementSlotId } = state

            // Check for forward crossing (with tolerance)
            if (globalProgress >= checkpoint - tolerance && !crossedForward) {
                // 🎯 CRITICAL FIX: Call animation executor directly instead of going through BehaviorCoordinator
                // This avoids the BehaviorCoordinator's interrupt logic which was interfering with threshold stagger
                this.executeElementAnimationDirectly(
                    animationExecutor,
                    slot,
                    element,
                    elementSlotId,
                    AnimationBehavior.PLAY_FORWARD,
                    index
                )

                // Update state
                state.crossedForward = true
                state.crossedBackward = false
            }
            // Check for backward crossing (with tolerance)
            else if (
                globalProgress < checkpoint + tolerance &&
                crossedForward &&
                !crossedBackward
            ) {
                // 🎯 CRITICAL FIX: Call animation executor directly instead of going through BehaviorCoordinator
                this.executeElementAnimationDirectly(
                    animationExecutor,
                    slot,
                    element,
                    elementSlotId,
                    AnimationBehavior.PLAY_BACKWARD,
                    index
                )

                // Update state
                state.crossedForward = false
                state.crossedBackward = true
            }
        })
    }

    /**
     * Execute element animation directly using the animation executor
     * 
     * @description
     * Bypasses the BehaviorCoordinator to avoid interrupt logic interference
     * and ensures each element gets its own animation execution
     */
    private executeElementAnimationDirectly(
        animationExecutor: (
            elementSlot: AnimationSlot,
            elements: HTMLElement[],
            behavior: string,
            startProgress: number,
            reverseMode?: ReverseMode
        ) => Promise<void>,
        slot: AnimationSlot,
        element: HTMLElement,
        elementSlotId: string,
        behavior: AnimationBehavior,
        elementIndex: number
    ): void {
        // Create element-specific slot for this animation (with unique ID)
        const elementSpecificSlot = this.createElementSpecificSlot(slot, elementIndex)
        
        // 🎯 CRITICAL FIX: Use the unique element-specific slot ID from createElementSpecificSlot
        // This ensures each element has its own animation state tracking
        const uniqueElementSlotId = elementSpecificSlot.id

        console.log(
            `🎪 [ScrollAnimationCoordinator] Executing direct animation for element ${elementIndex}:`,
            {
                behavior,
                originalElementSlotId: elementSlotId,
                uniqueElementSlotId,
                elementIndex
            }
        )

        // Get current progress from state manager using the unique ID
        const currentState = animationStateManager.getState(uniqueElementSlotId)
        const startProgress = currentState ? currentState.progress : 0

        // Execute animation directly
        animationExecutor(
            elementSpecificSlot,
            [element], // Single element array
            behavior,
            startProgress,
            ReverseMode.EASING_PRESERVATION
        ).catch(error => {
            console.error(
                `🎪 [ScrollAnimationCoordinator] Direct animation execution failed for element ${elementIndex}:`,
                error
            )
        })
    }

    /**
     * Calculate scrubbed stagger offsets
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateScrubbedStaggerOffsets(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        elementProgress: Map<string, number>
    ): void {
        if (staggerConfig.strategy === "linear") {
            this.calculateLinearScrubbedStaggerOffsets(elements, staggerConfig, elementProgress)
        } else if (staggerConfig.strategy === "grid") {
            this.calculateGridScrubbedStaggerOffsets(elements, staggerConfig, elementProgress)
        } else if (staggerConfig.strategy === "random") {
            this.calculateRandomScrubbedStaggerOffsets(elements, staggerConfig, elementProgress)
        }
    }

    /**
     * Calculate linear scrubbed stagger offsets
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateLinearScrubbedStaggerOffsets(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        elementProgress: Map<string, number>
    ): void {
        const scrubWindow = staggerConfig.scrubWindow || 100
        const staggerStep = (100 - scrubWindow) / (elements.length - 1)

        elements.forEach((element, index) => {
            const startProgress = (index * staggerStep) / 100
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key
            const elementId = ensureElementId(element)
            elementProgress.set(elementId, startProgress)
        })
    }

    /**
     * Calculate grid scrubbed stagger offsets
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateGridScrubbedStaggerOffsets(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        elementProgress: Map<string, number>
    ): void {
        const scrubWindow = staggerConfig.scrubWindow || 100
        const gridMode = staggerConfig.gridMode || "point-based"
        const gridOrigin = staggerConfig.gridOrigin || "center"
        const gridAutoDetect = staggerConfig.gridAutoDetect !== false
        const distanceMetric = staggerConfig.gridDistanceMetric || "euclidean"

        try {
            // Detect grid layout using correct API
            const gridDetector = new GridDetector()
            const gridLayout = gridAutoDetect
                ? gridDetector.analyzeLayout(elements)
                : this.createManualGridLayout(
                      elements,
                      staggerConfig.gridRows || 3,
                      staggerConfig.gridColumns || 3
                  )

            // Calculate stagger distances based on grid mode
            let distances: number[] = []

            if (gridMode === "point-based") {
                // Use origin-based distance calculation
                const originResolver = new OriginResolver()
                const origin = originResolver.resolveOrigin(
                    gridLayout,
                    gridOrigin
                )

                const distanceCalculator = new DistanceCalculator()
                const updatedGrid = distanceCalculator.calculateGridDistances(
                    gridLayout,
                    origin,
                    distanceMetric as any
                )

                distances = updatedGrid.elements.map((el) => el.distance)
            } else if (gridMode === "row-based") {
                // Row-based staggering
                distances = this.calculateRowBasedDistances(
                    gridLayout,
                    staggerConfig
                )
            } else if (gridMode === "column-based") {
                // Column-based staggering
                distances = this.calculateColumnBasedDistances(
                    gridLayout,
                    staggerConfig
                )
            }

            // Normalize distances to 0-1 range
            const maxDistance = Math.max(...distances)
            const normalizedDistances =
                maxDistance > 0
                    ? distances.map((d) => d / maxDistance)
                    : distances.map(() => 0)

            // Convert to progress offsets (with scrub window consideration)
            const maxOffset = (100 - scrubWindow) / 100

            elements.forEach((element, index) => {
                const offset = normalizedDistances[index] * maxOffset
                // 🔥 DOM DISCONNECTION FIX: Use element ID as key
                const elementId = ensureElementId(element)
                elementProgress.set(elementId, offset)
            })
        } catch (error) {
            console.error(
                "🎪 [ScrollAnimationCoordinator] Grid stagger calculation failed, falling back to linear:",
                error
            )
            this.calculateLinearScrubbedStaggerOffsets(
                elements,
                staggerConfig,
                elementProgress
            )
        }
    }

    /**
     * Create manual grid layout when auto-detection is disabled
     */
    private createManualGridLayout(
        elements: HTMLElement[],
        rows: number,
        columns: number
    ): any {
        const gridElements = elements.map((element, index) => {
            const rowIndex = Math.floor(index / columns)
            const colIndex = index % columns
            const rect = element.getBoundingClientRect()

            return {
                element,
                position: { x: colIndex, y: rowIndex },
                pixelPosition: rect,
                distance: 0,
                normalizedDistance: 0,
                index,
            }
        })

        return {
            rows,
            columns,
            elements: gridElements,
            originPoint: { x: (columns - 1) / 2, y: (rows - 1) / 2 },
            maxDistance: 0,
        }
    }

    /**
     * Calculate row-based distances for staggering
     */
    private calculateRowBasedDistances(
        gridLayout: any,
        staggerConfig: ScrollStaggerConfig
    ): number[] {
        const { elements, rows } = gridLayout
        const direction = staggerConfig.gridRowDirection || "top-to-bottom"

        return elements.map((element: any) => {
            const rowIndex = element.position.y

            switch (direction) {
                case "bottom-to-top":
                    return rows - 1 - rowIndex
                case "center-out-rows":
                    const centerRow = (rows - 1) / 2
                    return Math.abs(rowIndex - centerRow)
                case "edges-in-rows":
                    const distanceFromEdge = Math.min(
                        rowIndex,
                        rows - 1 - rowIndex
                    )
                    return rows - 1 - distanceFromEdge
                default: // 'top-to-bottom'
                    return rowIndex
            }
        })
    }

    /**
     * Calculate column-based distances for staggering
     */
    private calculateColumnBasedDistances(
        gridLayout: any,
        staggerConfig: ScrollStaggerConfig
    ): number[] {
        const { elements, columns } = gridLayout
        const direction = staggerConfig.gridColumnDirection || "left-to-right"

        return elements.map((element: any) => {
            const colIndex = element.position.x

            switch (direction) {
                case "right-to-left":
                    return columns - 1 - colIndex
                case "center-out-columns":
                    const centerCol = (columns - 1) / 2
                    return Math.abs(colIndex - centerCol)
                case "edges-in-columns":
                    const distanceFromEdge = Math.min(
                        colIndex,
                        columns - 1 - colIndex
                    )
                    return columns - 1 - distanceFromEdge
                default: // 'left-to-right'
                    return colIndex
            }
        })
    }

    /**
     * Calculate threshold stagger states
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateThresholdStaggerStates(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        thresholdCheckpoints: Map<string, number>,
        thresholdStates: Map<string, ThresholdCheckpointState>,
        slot: AnimationSlot
    ): void {
        if (staggerConfig.strategy === "linear") {
            this.calculateLinearThresholdStaggerStates(elements, staggerConfig, thresholdCheckpoints, thresholdStates, slot)
        } else if (staggerConfig.strategy === "grid") {
            this.calculateGridThresholdStaggerStates(elements, staggerConfig, thresholdCheckpoints, thresholdStates, slot)
        } else if (staggerConfig.strategy === "random") {
            this.calculateRandomThresholdStaggerStates(elements, staggerConfig, thresholdCheckpoints, thresholdStates, slot)
        }
    }

    /**
     * Calculate random scrubbed stagger offsets
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateRandomScrubbedStaggerOffsets(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        elementProgress: Map<string, number>
    ): void {
        const scrubWindow = staggerConfig.scrubWindow || 100
        const maxOffset = (100 - scrubWindow) / 100

        elements.forEach((element) => {
            // Generate random offset between 0 and maxOffset
            const randomOffset = Math.random() * maxOffset
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key
            const elementId = ensureElementId(element)
            elementProgress.set(elementId, randomOffset)
        })
    }

    /**
     * Calculate linear threshold stagger states
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateLinearThresholdStaggerStates(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        thresholdCheckpoints: Map<string, number>,
        thresholdStates: Map<string, ThresholdCheckpointState>,
        slot: AnimationSlot
    ): void {
        // 🚨 CRITICAL FIX: Distribute checkpoints from 1% to 99% to avoid edge cases
        const startOffset = 0.01 // Start at 1% progress
        const endOffset = 0.99 // End at 99% progress
        const totalRange = endOffset - startOffset
        const step =
            elements.length > 1 ? totalRange / (elements.length - 1) : 0

        elements.forEach((element, index) => {
            const checkpoint = startOffset + index * step
            // 🎯 CRITICAL FIX: Generate element slot ID that matches createElementSpecificSlot pattern
            // This ensures consistent state tracking across threshold stagger system
            const elementSlotId = `${slot.id}-element-${index}`
            
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key
            const elementId = ensureElementId(element)
            thresholdCheckpoints.set(elementId, checkpoint)
            thresholdStates.set(elementId, {
                checkpoint,
                crossedForward: false,
                crossedBackward: false,
                elementSlotId,
            })
        })
    }

    /**
     * Calculate grid threshold stagger states
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateGridThresholdStaggerStates(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        thresholdCheckpoints: Map<string, number>,
        thresholdStates: Map<string, ThresholdCheckpointState>,
        slot: AnimationSlot
    ): void {
        try {
            // Use the same grid detection logic as scrubbed stagger
            const gridDetector = new GridDetector()
            const gridAutoDetect = staggerConfig.gridAutoDetect !== false
            const gridLayout = gridAutoDetect
                ? gridDetector.analyzeLayout(elements)
                : this.createManualGridLayout(
                      elements,
                      staggerConfig.gridRows || 3,
                      staggerConfig.gridColumns || 3
                  )

            const gridMode = staggerConfig.gridMode || "point-based"
            const gridOrigin = staggerConfig.gridOrigin || "center"
            const distanceMetric =
                staggerConfig.gridDistanceMetric || "euclidean"

            // Calculate stagger distances using same logic as scrubbed grid stagger
            let distances: number[] = []

            if (gridMode === "point-based") {
                const originResolver = new OriginResolver()
                const origin = originResolver.resolveOrigin(
                    gridLayout,
                    gridOrigin
                )

                const distanceCalculator = new DistanceCalculator()
                const updatedGrid = distanceCalculator.calculateGridDistances(
                    gridLayout,
                    origin,
                    distanceMetric as any
                )

                distances = updatedGrid.elements.map((el) => el.distance)
            } else if (gridMode === "row-based") {
                distances = this.calculateRowBasedDistances(
                    gridLayout,
                    staggerConfig
                )
            } else if (gridMode === "column-based") {
                distances = this.calculateColumnBasedDistances(
                    gridLayout,
                    staggerConfig
                )
            }

            // Normalize distances to checkpoint range (1% to 99%)
            const maxDistance = Math.max(...distances)
            const startOffset = 0.01
            const endOffset = 0.99
            const totalRange = endOffset - startOffset

            elements.forEach((element, index) => {
                const normalizedDistance =
                    maxDistance > 0 ? distances[index] / maxDistance : 0
                const checkpoint = startOffset + normalizedDistance * totalRange
                const elementSlotId = `${slot.id}-element-${index}`

                // 🔥 DOM DISCONNECTION FIX: Use element ID as key
                const elementId = ensureElementId(element)
                thresholdCheckpoints.set(elementId, checkpoint)
                thresholdStates.set(elementId, {
                    checkpoint,
                    crossedForward: false,
                    crossedBackward: false,
                    elementSlotId,
                })
            })
        } catch (error) {
            console.error(
                "🎪 [ScrollAnimationCoordinator] Grid threshold stagger calculation failed, falling back to linear:",
                error
            )
            this.calculateLinearThresholdStaggerStates(
                elements,
                staggerConfig,
                thresholdCheckpoints,
                thresholdStates,
                slot
            )
        }
    }

    /**
     * Calculate random threshold stagger states
     * 🔥 DOM DISCONNECTION FIX: Updated to use element IDs as map keys
     */
    private calculateRandomThresholdStaggerStates(
        elements: HTMLElement[],
        staggerConfig: ScrollStaggerConfig,
        thresholdCheckpoints: Map<string, number>,
        thresholdStates: Map<string, ThresholdCheckpointState>,
        slot: AnimationSlot
    ): void {
        elements.forEach((element, index) => {
            // Generate random checkpoint between 5% and 95% to avoid edge cases
            const checkpoint = 0.05 + Math.random() * 0.9
            const elementSlotId = `${slot.id}-element-${index}`
            
            // 🔥 DOM DISCONNECTION FIX: Use element ID as key
            const elementId = ensureElementId(element)
            thresholdCheckpoints.set(elementId, checkpoint)
            thresholdStates.set(elementId, {
                checkpoint,
                crossedForward: false,
                crossedBackward: false,
                elementSlotId,
            })
        })
    }

    /**
     * Apply initial "from" values for threshold stagger
     *
     * @description
     * For threshold stagger, all elements should start with their "from" values
     * applied immediately, before any scroll checkpoints are crossed.
     * This prevents the "jump" effect where elements only get styles when animating.
     */
    private applyInitialValuesForThresholdStagger(
        animation: ActiveScrollAnimation
    ): void {
        console.log(`🚨 [DEBUG WORKING] applyInitialValuesForThresholdStagger called`);
        
        const { animatedElementIds, scrollTimeline } = animation

        console.log(`🚨 [DEBUG WORKING] Animation object:`, {
            animatedElementIds,
            hasScrollTimeline: !!scrollTimeline,
            scrollTimelineProps: scrollTimeline ? scrollTimeline.propertyTimelines.length : 0,
            slotId: animation.slot.id
        });

        // 🔥 DOM DISCONNECTION FIX: Dynamically resolve elements from IDs
        const animatedElements = animatedElementIds.map(id => resolveElement(id)).filter(el => el !== null) as HTMLElement[]
        
        console.log(`🚨 [DEBUG WORKING] Resolved elements:`, {
            elementIdsCount: animatedElementIds.length,
            resolvedElementsCount: animatedElements.length,
            elementIds: animatedElementIds,
            elements: animatedElements.map(el => ({
                tagName: el.tagName,
                id: el.id,
                className: el.className
            }))
        });

        // Apply initial "from" values (progress 0) to all elements
        // Use element-specific values for distributed properties
        animatedElements.forEach((element, elementIndex) => {
            console.log(`🚨 [DEBUG WORKING] Processing element ${elementIndex} at progress 0.0`);
            
            try {
                const initialValues =
                    timelineScrollMapper.getValuesUsingOriginalInterpolationForElement(
                        scrollTimeline,
                        0.0, // Start at progress 0 (from values)
                        elementIndex
                    )

                console.log(`🚨 [DEBUG WORKING] Got initial values:`, {
                    propertyValuesSize: initialValues.size,
                    properties: Array.from(initialValues.entries())
                });

                scrollPropertyApplicator.applyTimelineValues(
                    element,
                    initialValues,
                    0.0 // Progress 0 for initial state
                )
                
                console.log(`🚨 [DEBUG WORKING] Successfully applied initial values to element ${elementIndex}`);
                
            } catch (error) {
                console.error(`🚨 [DEBUG WORKING] Error processing element ${elementIndex}:`, error);
            }
        })
        
        console.log(`🚨 [DEBUG WORKING] applyInitialValuesForThresholdStagger completed`);
    }

    /**
     * Check initial threshold states for elements that might already be past their checkpoint
     *
     * @description
     * When setting up threshold stagger, we need to check if the current scroll progress
     * is already past some checkpoints. This handles the case where animations are set up
     * mid-scroll and some elements should already be in their animated state.
     */
    private checkInitialThresholdStates(
        animation: ActiveScrollAnimation
    ): void {
        // Get current scroll progress from the progress tracker
        // For now, we'll trigger with progress 0 and let the normal flow handle it
        // The progress tracker will call handleScrollProgress with the actual current progress
        this.handleScrollProgress(animation.id, 0)
    }

    /**
     * Create element-specific slot for distributed properties
     *
     * @param slot - Original animation slot
     * @param elementIndex - Index of the element
     * @returns Element-specific slot with distributed values and unique ID
     */
    private createElementSpecificSlot(
        slot: AnimationSlot,
        elementIndex?: number
    ): AnimationSlot {
        if (elementIndex === undefined) {
            return slot // Return original slot if no element index
        }

        // Create element-specific properties
        const elementSpecificProperties = slot.properties.map((property) => {
            const hasDistributedFrom =
                property.distributedFromValues &&
                property.distributedFromValues.length > elementIndex
            const hasDistributedTo =
                property.distributedToValues &&
                property.distributedToValues.length > elementIndex

            if (hasDistributedFrom || hasDistributedTo) {
                return {
                    ...property,
                    from: hasDistributedFrom
                        ? property.distributedFromValues![elementIndex]
                        : property.from,
                    to: hasDistributedTo
                        ? property.distributedToValues![elementIndex]
                        : property.to,
                    // Remove distributed arrays to avoid confusion
                    distributedFromValues: undefined,
                    distributedToValues: undefined,
                }
            }

            return property
        })

        // 🎯 CRITICAL FIX: Generate unique element-specific slot ID
        // This ensures each element gets its own animation state tracking
        const elementSpecificSlotId = `${slot.id}-element-${elementIndex}`

        // 🎯 CRITICAL FIX: Rebuild master timeline with element-specific distributed values
        // This ensures each element animates with its own distributed properties
        const hasDistributedProperties = elementSpecificProperties.some(
            (prop) => slot.properties.find(
                (originalProp) => originalProp.property === prop.property && 
                (originalProp.distributedFromValues || originalProp.distributedToValues)
            )
        )

        let elementSpecificMasterTimeline = slot.masterTimeline

        if (hasDistributedProperties) {
            console.log(
                `🔧 [ScrollAnimationCoordinator] Getting cached timeline for element ${elementIndex} distributed properties`
            )
            
            // Use timeline cache for element-specific properties with slot ID for isolation
            elementSpecificMasterTimeline = timelineCache.getOrCreateTimeline(
                elementSpecificProperties,
                () => {
                    console.log(`🔧 [ScrollAnimationCoordinator] Creating new element timeline for slot ${slot.id}, element ${elementIndex} (cache miss)`)
                    const builder = new MasterTimelineBuilder()
                    return builder.buildMasterTimeline(elementSpecificProperties)
                },
                `${slot.id}-element-${elementIndex}`
            )
            
            console.log(
                `🔧 [ScrollAnimationCoordinator] Using cached element timeline for element ${elementIndex}:`,
                {
                    propertyCount: elementSpecificProperties.length,
                    totalDuration: elementSpecificMasterTimeline.totalDuration,
                    cacheMetrics: timelineCache.getMetrics()
                }
            )
        }

        return {
            ...slot,
            id: elementSpecificSlotId,
            properties: elementSpecificProperties,
            masterTimeline: elementSpecificMasterTimeline,
        }
    }

    /**
     * Calculate element progress for scrubbed stagger
     */
    private calculateElementProgress(
        globalProgress: number,
        elementStartProgress: number,
        scrubWindow: number
    ): number {
        const windowSize = scrubWindow / 100
        const elementEndProgress = elementStartProgress + windowSize

        // Clamp to element's window
        if (globalProgress < elementStartProgress) {
            return 0
        } else if (globalProgress > elementEndProgress) {
            return 1
        } else {
            // Linear interpolation within element's window
            const windowProgress =
                (globalProgress - elementStartProgress) / windowSize
            return Math.max(0, Math.min(1, windowProgress))
        }
    }

    /**
     * Stop scrubbed scroll animation
     */
    private stopScrollAnimation(animationId: string): void {
        const animation = this.activeAnimations.get(animationId)
        if (!animation) return

        // Clean up progress tracking
        animation.progressCleanup()

        // Clean up property applications for all elements
        animation.animatedElementIds.forEach((elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                scrollPropertyApplicator.cleanup(element);
            } else {
                console.warn(`🚨 [ScrollAnimationCoordinator] Element with ID ${elementId} not found for cleanup.`);
            }
        });

        // 🚨 NEW: Clean up active timed animations for threshold stagger
        if (animation.thresholdStates) {
            animation.thresholdStates.forEach((state) => {
                // Clean up element-specific state
                animationStateManager.cleanup(state.elementSlotId)
            })
        }

        // Remove from active animations
        this.activeAnimations.delete(animationId)
    }

    /**
     * Get all active scroll animations
     */
    getActiveAnimations(): string[] {
        return Array.from(this.activeAnimations.keys())
    }

    /**
     * Check if animation is active
     */
    isAnimationActive(animationId: string): boolean {
        return this.activeAnimations.has(animationId)
    }

    /**
     * Get animation info for debugging
     */
    getAnimationInfo(animationId: string): any {
        const animation = this.activeAnimations.get(animationId)
        if (!animation) return null

        return {
            id: animation.id,
            slotId: animation.slot.id,
            triggerElement: animation.triggerElementId,
            animatedElementsCount: animation.animatedElementIds.length,
            boundaries: animation.boundaries,
            staggerConfig: animation.staggerConfig,
            scrollTimeline: timelineScrollMapper.getDebugInfo(
                animation.scrollTimeline
            ),
        }
    }

    /**
     * Stop all active animations
     */
    stopAllAnimations(): void {
        const animationIds = Array.from(this.activeAnimations.keys())
        animationIds.forEach((id) => this.stopScrollAnimation(id))
    }

    /**
     * Clean up all resources
     */
    destroy(): void {
        this.stopAllAnimations()
        scrollPropertyApplicator.destroy()
    }

    /**
     * 🚀 CROSS-UNIT FIX: Extract unit from CSS value (borrowed from TimedAnimator approach)
     */
    private extractUnit(value: string): string | null {
        if (typeof value !== 'string') return null;
        
        const match = value.match(/([a-zA-Z%]+)$/);
        return match ? match[1] : null;
    }

    /**
     * Debug method to diagnose multiple animation conflicts
     * 🔍 DIAGNOSTIC: Shows all active animations and their states
     */
    debugMultipleAnimations(): void {
        console.log(`🔍 [ScrollAnimationCoordinator] DIAGNOSTIC: Total active animations: ${this.activeAnimations.size}`);
        
        if (this.activeAnimations.size === 0) {
            console.log(`🔍 [ScrollAnimationCoordinator] No active animations found`);
            return;
        }
        
        this.activeAnimations.forEach((animation, animationId) => {
            console.log(`🔍 [ScrollAnimationCoordinator] Animation: ${animationId}`);
            console.log(`  ├─ Slot ID: ${animation.slot.id}`);
            console.log(`  ├─ Trigger Element ID: ${animation.triggerElementId}`);
            console.log(`  ├─ Animated Elements: ${animation.animatedElementIds.length}`);
            console.log(`  ├─ Properties: ${animation.slot.properties.map(p => p.property).join(', ')}`);
            console.log(`  ├─ Stagger Mode: ${animation.staggerConfig?.mode || 'disabled'}`);
            console.log(`  └─ Boundaries: ${JSON.stringify(animation.boundaries)}`);
        });
        
        // Also check UnifiedScrollManager registrations
        console.log(`🔍 [ScrollAnimationCoordinator] Checking UnifiedScrollManager for conflicts...`);
        // Note: We can't directly access UnifiedScrollManager internals, but conflicts will show in logs
    }

    /**
     * Get diagnostic information about multiple animations
     * 🔍 DIAGNOSTIC: Returns diagnostic data for debugging
     */
    getDiagnosticInfo(): {
        totalAnimations: number;
        animationIds: string[];
        slotIds: string[];
        conflicts: string[];
    } {
        const animationIds = Array.from(this.activeAnimations.keys());
        const slotIds = Array.from(this.activeAnimations.values()).map(a => a.slot.id);
        
        // Check for duplicate slot IDs (potential conflicts)
        const duplicateSlots = slotIds.filter((id, index, arr) => 
            arr.indexOf(id) !== index
        );
        
        return {
            totalAnimations: this.activeAnimations.size,
            animationIds,
            slotIds,
            conflicts: duplicateSlots
        };
    }
}

/**
 * Shared instance for performance optimization
 */
export const scrollAnimationCoordinator = new ScrollAnimationCoordinator()
