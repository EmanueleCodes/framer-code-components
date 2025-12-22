/**
 * @file ResponsiveTextManager.ts
 * @description Dedicated service for managing responsive text re-splitting on container resize events
 * 
 * @version 1.1.0 - Enhanced Window Resize for Word Splitting
 * @since 1.0.0
 * 
 * @description
 * This service isolates all resize-related functionality that was previously embedded 
 * in the TextSplitter god class. It handles ResizeObserver setup, window resize events,
 * debounced re-splitting, and element lifecycle management.
 * 
 * **Key Responsibilities:**
 * - ResizeObserver initialization and management
 * - Window resize event handling with proper debouncing
 * - Element registration for responsive text splitting
 * - Coordinating text re-splits when container dimensions change
 * - Cleanup and memory management for observers and listeners
 * - Debug utilities for resize-related troubleshooting
 * 
 * **Performance Features:**
 * - Debounced resize handling (500ms) to prevent excessive re-splits
 * - Element ID-based tracking for efficient lookup
 * - Automatic cleanup to prevent memory leaks
 * - DOM disconnection protection for robust operation
 * 
 * **🔥 Enhanced Word Splitting Responsiveness (v1.1.0):**
 * - All resize scenarios now use forced line recalculation (_forceLineRecalculation: true)
 * - Consistent behavior between breakpoint changes and window/element resize
 * - Improved word splitting accuracy during responsive layout changes
 * - Better handling of line break recalculation for all text splitting modes
 * 
 * **Integration:**
 * - Uses callback pattern to trigger re-splits via external TextSplitter
 * - Maintains element configuration for consistent re-splitting
 * - Provides debug hooks for troubleshooting resize issues
 * 
 * @example
 * ```typescript
 * const resizeManager = ResponsiveTextManager.getInstance();
 * 
 * // Register element for responsive handling
 * resizeManager.registerElement(element, config, (el, cfg) => {
 *     return textSplitter.splitText(el, cfg);
 * });
 * 
 * // Enable debug logging
 * ResponsiveTextManager.setDebugEnabled(true);
 * 
 * // Cleanup when done
 * resizeManager.cleanup();
 * ```
 * 
 * @architecture
 * This class follows the Single Responsibility Principle by focusing solely on
 * resize management. It integrates with the broader text splitting system via
 * callback functions rather than direct dependencies, promoting loose coupling.
 * 
 * All resize scenarios (window resize, element resize, breakpoint changes) now use
 * the same enhanced configuration to ensure consistent text splitting behavior,
 * particularly improving word splitting responsiveness.
 */

import { TextProcessingConfig, TextSplitType } from "../../../types/index.ts"



//=======================================
//          TYPE DEFINITIONS
//=======================================

/**
 * Callback function signature for text re-splitting operations
 * @param element - The HTML element that needs to be re-split
 * @param config - The text processing configuration to use for re-splitting
 * @returns Promise that resolves when re-splitting is complete
 */
export type TextReSplitCallback = (
    element: HTMLElement, 
    config: TextProcessingConfig
) => Promise<void>;

/**
 * Callback function signature for split completion notifications
 * @param elements - The array of split HTML elements created
 * @param splitType - The type of splitting that was performed
 */
export type SplitCompleteCallback = (
    elements: HTMLElement[],
    splitType: TextSplitType
) => void;

/**
 * Configuration for a responsive element registration
 */
interface ResponsiveElementConfig {
    /** The HTML element to observe for resize events */
    element: HTMLElement;
    /** Text processing configuration for re-splitting */
    config: TextProcessingConfig;
    /** Callback to perform re-splitting when resize occurs */
    reSplitCallback: TextReSplitCallback;
    /** Optional callback to notify when split completes */
    onSplitComplete?: SplitCompleteCallback;
}

/**
 * Debug summary information for troubleshooting
 */
export interface ResponsiveDebugSummary {
    /** Number of elements currently being tracked for responsive behavior */
    trackedElements: number;
    /** Number of registered split completion callbacks */
    registeredCallbacks: number;
    /** Whether ResizeObserver is available and initialized */
    hasResizeObserver: boolean;
    /** Whether window resize listener is active */
    hasWindowResizeListener: boolean;
    /** Current debug mode status */
    debugEnabled: boolean;
    /** Timestamp of last resize event processed */
    lastResizeTimestamp?: number;
}

//=======================================
//          RESPONSIVE TEXT MANAGER
//=======================================

/**
 * Singleton service for managing responsive text re-splitting
 * 
 * This class handles all resize-related functionality that was previously
 * embedded in the TextSplitter god class, promoting better separation of concerns
 * and easier testing/maintenance.
 * 
 * @singleton Uses singleton pattern for global resize event coordination
 * @performance Implements debouncing to prevent excessive re-splitting operations
 * @memory Provides comprehensive cleanup to prevent memory leaks
 */
export class ResponsiveTextManager {
    /** Singleton instance */
    private static instance: ResponsiveTextManager | null = null;

    /** Map of element IDs to their responsive configurations */
    private responsiveElements: Map<string, ResponsiveElementConfig> = new Map();

    /** ResizeObserver instance for monitoring element size changes */
    private resizeObserver: ResizeObserver | null = null;

    /** Window resize event listener function */
    private windowResizeListener: (() => void) | null = null;

    /** Debounce timer for resize event handling */
    private resizeTimer: number | null = null;

    /** Map of element IDs to their split completion callbacks */
    private splitCompleteCallbacks: Map<string, SplitCompleteCallback> = new Map();

    /** Debug mode flag for detailed logging */
    private static debugEnabled = false;

    /** Timestamp of the last processed resize event */
    private lastResizeTimestamp?: number;

    /** Debounce delay for resize events in milliseconds */
    private static readonly RESIZE_DEBOUNCE_DELAY = 500;

    /**
     * Get the singleton instance of ResponsiveTextManager
     * 
     * Initializes ResizeObserver and window resize listener on first access.
     * Registers instance globally for cache management and debugging.
     * 
     * @returns The singleton ResponsiveTextManager instance
     */
    public static getInstance(): ResponsiveTextManager {
        if (!ResponsiveTextManager.instance) {
            ResponsiveTextManager.instance = new ResponsiveTextManager();
            ResponsiveTextManager.instance.initializeObservers();
            ResponsiveTextManager.instance.registerGlobalInstance();
        }
        return ResponsiveTextManager.instance;
    }

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        this.logDebug("ResponsiveTextManager instance created");
    }

    //=======================================
    //          PUBLIC API METHODS
    //=======================================

    /**
     * Register an element for responsive text re-splitting
     * 
     * When the element's container resizes, the provided callback will be
     * invoked to re-split the text with the specified configuration.
     * 
     * @param element - HTML element to monitor for resize events
     * @param config - Text processing configuration for re-splitting
     * @param reSplitCallback - Function to call when re-splitting is needed
     * @param onSplitComplete - Optional callback when split operation completes
     * 
     * @example
     * ```typescript
     * resizeManager.registerElement(
     *     textElement, 
     *     { animateBy: 'words', maskLines: true, enabled: true },
     *     async (el, cfg) => textSplitter.splitText(el, cfg),
     *     (elements, type) => console.log(`Split complete: ${elements.length} ${type}`)
     * );
     * ```
     */
    public registerElement(
        element: HTMLElement,
        config: TextProcessingConfig,
        reSplitCallback: TextReSplitCallback,
        onSplitComplete?: SplitCompleteCallback
    ): void {
        const elementId = this.getElementId(element);
        
        // Store responsive configuration
        this.responsiveElements.set(elementId, {
            element,
            config,
            reSplitCallback,
            onSplitComplete
        });

        // Register split complete callback if provided
        if (onSplitComplete) {
            this.splitCompleteCallbacks.set(elementId, onSplitComplete);
        }

        // Start observing the element for resize events
        if (this.resizeObserver) {
            this.resizeObserver.observe(element);
        }

        this.logDebug(
            `Registered element for responsive splitting: ${elementId}`,
            { configEnabled: config.enabled, animateBy: config.animateBy }
        );
    }

    /**
     * Unregister an element from responsive text re-splitting
     * 
     * Stops monitoring the element for resize events and removes all
     * associated callbacks and configurations.
     * 
     * @param element - HTML element to stop monitoring
     * @returns True if element was successfully unregistered, false if not found
     */
    public unregisterElement(element: HTMLElement): boolean {
        const elementId = this.getElementId(element);
        
        // Remove from responsive elements tracking
        const wasTracked = this.responsiveElements.delete(elementId);
        
        // Remove split complete callback
        this.splitCompleteCallbacks.delete(elementId);
        
        // Stop observing the element
        if (this.resizeObserver) {
            this.resizeObserver.unobserve(element);
        }

        if (wasTracked) {
            this.logDebug(`Unregistered element from responsive splitting: ${elementId}`);
        }

        return wasTracked;
    }

    /**
     * Register a split completion callback for an element
     * 
     * This callback will be invoked whenever the element completes
     * a text re-splitting operation due to resize events.
     * 
     * @param elementId - Unique identifier for the element
     * @param callback - Function to call when split completes
     */
    public registerSplitCompleteCallback(
        elementId: string,
        callback: SplitCompleteCallback
    ): void {
        this.splitCompleteCallbacks.set(elementId, callback);
        this.logDebug(`Registered split complete callback for element: ${elementId}`);
    }

    /**
     * Unregister a split completion callback for an element
     * 
     * @param elementId - Unique identifier for the element
     * @returns True if callback was removed, false if not found
     */
    public unregisterSplitCompleteCallback(elementId: string): boolean {
        const wasRemoved = this.splitCompleteCallbacks.delete(elementId);
        if (wasRemoved) {
            this.logDebug(`Unregistered split complete callback for element: ${elementId}`);
        }
        return wasRemoved;
    }

    /**
     * Manually trigger resize handling for all registered elements
     * 
     * This method can be used to force re-splitting of all responsive
     * elements, bypassing the normal resize event detection.
     * 
     * 🔥 ENHANCED: Forces fresh line detection for breakpoint changes
     * 
     * @returns Promise that resolves when all re-splits are complete
     */
    public async forceResizeAll(): Promise<void> {
        const elementCount = this.responsiveElements.size;
        
        this.logDebug(
            `🚨 FORCE RESIZE: Manually triggering resize for ${elementCount} responsive elements (breakpoint change detected)`
        );

        if (elementCount === 0) {
            this.logDebug("No responsive elements to force re-split");
            return;
        }

        const reSplitPromises: Promise<void>[] = [];

        for (const [elementId, { element, config, reSplitCallback }] of this.responsiveElements) {
            this.logDebug(`🔥 FORCE re-splitting element for line recalculation: ${elementId}`);
            
            // 🔥 CRITICAL: Force fresh line detection by temporarily clearing any cached data
            // This ensures lines are recalculated with new breakpoint dimensions
            const forceResplitConfig = { 
                ...config, 
                _isReSplit: true,
                _forceLineRecalculation: true  // Flag to indicate this is a forced recalculation
            };
            
            reSplitPromises.push(reSplitCallback(element, forceResplitConfig));
        }

        await Promise.all(reSplitPromises);
        this.logDebug(`✅ FORCE RESIZE COMPLETE: Processed ${elementCount} elements with fresh line detection`);
    }

    /**
     * Get comprehensive debug information about responsive text management
     * 
     * Useful for troubleshooting resize-related issues and understanding
     * the current state of the responsive system.
     * 
     * @returns Debug summary with detailed information
     */
    public getDebugSummary(): ResponsiveDebugSummary {
        return {
            trackedElements: this.responsiveElements.size,
            registeredCallbacks: this.splitCompleteCallbacks.size,
            hasResizeObserver: !!this.resizeObserver,
            hasWindowResizeListener: !!this.windowResizeListener,
            debugEnabled: ResponsiveTextManager.debugEnabled,
            lastResizeTimestamp: this.lastResizeTimestamp
        };
    }

    /**
     * Clean up all observers, listeners, and tracked elements
     * 
     * Should be called when the ResponsiveTextManager is no longer needed
     * to prevent memory leaks and remove event listeners.
     */
    public cleanup(): void {
        this.logDebug("Starting ResponsiveTextManager cleanup");

        // Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
            this.logDebug("ResizeObserver disconnected");
        }

        // Remove window resize listener
        if (this.windowResizeListener && typeof window !== "undefined") {
            window.removeEventListener("resize", this.windowResizeListener);
            this.windowResizeListener = null;
            this.logDebug("Window resize listener removed");
        }

        // Clear debounce timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }

        // Clear all tracked elements and callbacks
        const trackedCount = this.responsiveElements.size;
        const callbackCount = this.splitCompleteCallbacks.size;
        
        this.responsiveElements.clear();
        this.splitCompleteCallbacks.clear();

        this.logDebug(
            `Cleanup complete - removed ${trackedCount} tracked elements and ${callbackCount} callbacks`
        );
    }

    //=======================================
    //          STATIC UTILITY METHODS
    //=======================================

    /**
     * Enable or disable debug logging for resize operations
     * 
     * @param enabled - Whether to enable detailed debug logging
     */
    public static setDebugEnabled(enabled: boolean): void {
        ResponsiveTextManager.debugEnabled = enabled;
        console.log(
            `🔄 [ResponsiveTextManager] Debug logging ${enabled ? "enabled" : "disabled"}`
        );
    }

    /**
     * Test the resize fix functionality
     * 
     * This method helps verify that the resize system is working correctly
     * by logging comprehensive status information and simulating resize events.
     */
    public static testResizeFix(): void {
        console.log("🧪 [ResponsiveTextManager] Testing resize fix...");
        
        const instance = ResponsiveTextManager.getInstance();
        const summary = instance.getDebugSummary();
        
        console.log("🧪 ➤ Debug Summary:");
        console.log(`🧪   → Tracked elements: ${summary.trackedElements}`);
        console.log(`🧪   → Registered callbacks: ${summary.registeredCallbacks}`);
        console.log(`🧪   → Has ResizeObserver: ${summary.hasResizeObserver}`);
        console.log(`🧪   → Has window listener: ${summary.hasWindowResizeListener}`);
        console.log(`🧪   → Debug enabled: ${summary.debugEnabled}`);
        
        if (summary.trackedElements > 0) {
            console.log(`🧪 [ResponsiveTextManager] Simulating resize for ${summary.trackedElements} elements...`);
            instance.forceResizeAll().then(() => {
                console.log("🧪 ✅ Resize simulation complete");
            });
        } else {
            console.log("🧪 ⚠️ No elements to test - register some elements first");
        }
    }

    /**
     * Reset the singleton instance (primarily for testing)
     * 
     * Cleans up the current instance and allows a fresh instance to be created.
     * Use with caution in production environments.
     */
    public static resetInstance(): void {
        if (ResponsiveTextManager.instance) {
            ResponsiveTextManager.instance.cleanup();
            ResponsiveTextManager.instance = null;
            console.log("🔄 [ResponsiveTextManager] Instance reset");
        }
    }

    //=======================================
    //          PRIVATE IMPLEMENTATION
    //=======================================

    /**
     * Initialize ResizeObserver and window resize listeners
     * 
     * Sets up the core observation mechanisms for detecting resize events
     * on both individual elements and the window.
     */
    private initializeObservers(): void {
        this.initializeResizeObserver();
        this.initializeWindowResizeHandler();
    }

    /**
     * Initialize ResizeObserver for individual element monitoring
     * 
     * Creates a ResizeObserver instance that watches for size changes
     * on registered elements and triggers debounced re-splitting.
     */
    private initializeResizeObserver(): void {
        this.logDebug("ResizeObserver ENABLED with element ID preservation");

        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver((entries) => {
                this.handleElementResize(entries);
            });
            this.logDebug("ResizeObserver initialized successfully");
        } else {
            console.warn(
                "⚠️ [ResponsiveTextManager] ResizeObserver not supported in this environment"
            );
        }
    }

    /**
     * Initialize window resize event handler
     * 
     * Sets up a debounced listener for window resize events that can
     * trigger re-splitting for elements that depend on viewport dimensions.
     */
    private initializeWindowResizeHandler(): void {
        this.logDebug("Window resize handler ENABLED for responsive text reflow");

        if (typeof window !== "undefined") {
            this.windowResizeListener = () => {
                this.handleWindowResize();
            };

            window.addEventListener("resize", this.windowResizeListener);
            this.logDebug("Window resize listener added successfully");
        } else {
            this.logDebug("Window not available - skipping window resize handler");
        }
    }

    /**
     * Handle ResizeObserver entries with debouncing
     * 
     * Processes resize events from the ResizeObserver, implementing
     * debouncing to prevent excessive re-splitting operations.
     * 
     * @param entries - Array of ResizeObserver entries
     */
    private handleElementResize(entries: ResizeObserverEntry[]): void {
        // Clear existing timer to implement debouncing
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.logDebug(
            `Resize detected for ${entries.length} elements, debouncing...`,
            { timestamp: new Date().toISOString() }
        );

        // Set up debounced resize handling
        this.resizeTimer = window.setTimeout(() => {
            this.processElementResize(entries);
        }, ResponsiveTextManager.RESIZE_DEBOUNCE_DELAY);
    }

    /**
     * Process element resize events after debouncing
     * 
     * Executes the actual re-splitting logic for elements that have
     * been resized, coordinating with their registered callbacks.
     * 
     * 🔥 ENHANCED: Now uses forced line recalculation for consistent word splitting responsiveness
     * 
     * @param entries - Array of ResizeObserver entries to process
     */
    private async processElementResize(entries: ResizeObserverEntry[]): Promise<void> {
        this.lastResizeTimestamp = Date.now();
        
        this.logDebug(
            `Processing resize for ${entries.length} elements`,
            { timestamp: new Date().toISOString() }
        );

        const reSplitPromises: Promise<void>[] = [];

        for (const entry of entries) {
            const element = entry.target as HTMLElement;
            const elementId = this.getElementId(element);
            const config = this.responsiveElements.get(elementId);

            if (config) {
                this.logDebug(
                    `Re-splitting text due to element resize: ${elementId}`,
                    { timestamp: new Date().toISOString() }
                );

                // 🔥 CRITICAL FIX: Apply the same enhanced config as breakpoint and window changes
                // This ensures consistent word splitting behavior across all resize scenarios
                const enhancedConfig = { 
                    ...config.config, 
                    _isReSplit: true,
                    _forceLineRecalculation: true  // Force fresh line detection for better word splitting
                };
                
                this.logDebug(`🔥 ELEMENT RESIZE: Using enhanced config with forced line recalculation for element: ${elementId}`);

                // Execute re-split callback with enhanced config
                const reSplitPromise = config.reSplitCallback(element, enhancedConfig);
                reSplitPromises.push(reSplitPromise);

            } else {
                this.logDebug(
                    `⚠️ Resize event for untracked element: ${elementId || "no-id"}`,
                    { timestamp: new Date().toISOString() }
                );
            }
        }

        // Wait for all re-splits to complete
        await Promise.all(reSplitPromises);
        this.logDebug(`✅ ELEMENT RESIZE COMPLETE: Processed ${entries.length} elements with forced line recalculation`);
    }

    /**
     * Handle window resize events with debouncing
     * 
     * Responds to window resize events by re-splitting all registered
     * responsive elements after a debounce delay.
     */
    private handleWindowResize(): void {
        // Clear existing timer for debouncing
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        // 🚨 FRAMER BREAKPOINT FIX: Detect Framer breakpoint transitions and add longer delay
        const isFramerPreview = this.isFramerPreviewEnvironment()
        const breakpointChangeDelay = isFramerPreview ? 1000 : ResponsiveTextManager.RESIZE_DEBOUNCE_DELAY // Longer delay for Framer breakpoints
        
        if (isFramerPreview) {
            this.logDebug(`Framer preview detected - using ${breakpointChangeDelay}ms delay for breakpoint transitions`);
        }

        this.logDebug("Window resize detected - triggering text reflow");

        // Set up debounced window resize handling with Framer-aware delay
        this.resizeTimer = window.setTimeout(() => {
            this.processWindowResize();
        }, breakpointChangeDelay);
    }

    /**
     * Process window resize events after debouncing
     * 
     * Triggers re-splitting for all registered responsive elements
     * in response to window dimension changes.
     * 
     * 🔥 ENHANCED: Now uses forced line recalculation for better word splitting responsiveness
     */
    private async processWindowResize(): Promise<void> {
        const elementCount = this.responsiveElements.size;
        
        this.logDebug(
            `Handling window resize for ${elementCount} responsive elements`
        );

        if (elementCount === 0) {
            this.logDebug("No responsive elements to process for window resize");
            return;
        }

        // Clear any existing resize timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.lastResizeTimestamp = Date.now();

        // Process all responsive elements
        const reSplitPromises: Promise<void>[] = [];

        for (const [elementId, { element, config, reSplitCallback }] of this.responsiveElements) {
            this.logDebug(`Re-splitting element due to window resize: ${elementId}`);
            
            // 🔥 CRITICAL FIX: Apply the same enhanced config as breakpoint changes
            // This ensures word splitting gets proper line recalculation during window resize
            const enhancedConfig = { 
                ...config, 
                _isReSplit: true,
                _forceLineRecalculation: true  // Force fresh line detection for better word splitting
            };
            
            this.logDebug(`🔥 WINDOW RESIZE: Using enhanced config with forced line recalculation for element: ${elementId}`);
            
            reSplitPromises.push(reSplitCallback(element, enhancedConfig));
        }

        await Promise.all(reSplitPromises);
        this.logDebug(`✅ WINDOW RESIZE COMPLETE: Processed ${elementCount} elements with forced line recalculation`);
    }

    /**
     * Notify React component that splitting completed
     * 
     * Invokes registered split completion callbacks to inform
     * React components about completed re-splitting operations.
     * 
     * @param elementId - Unique identifier for the element
     * @param elements - Array of split HTML elements created
     * @param splitType - Type of splitting that was performed
     */
    public notifySplitComplete(
        elementId: string,
        elements: HTMLElement[],
        splitType: TextSplitType
    ): void {
        const callback = this.splitCompleteCallbacks.get(elementId);
        if (callback) {
            this.logDebug(
                `Notifying React component of split completion: ${elementId}`,
                { elementCount: elements.length, splitType }
            );
            callback(elements, splitType);
        }
    }

    /**
     * Register instance globally for cache management and debugging
     * 
     * Makes the instance available globally for debugging purposes
     * and cache management operations.
     */
    private registerGlobalInstance(): void {
        if (typeof window !== "undefined") {
            (window as any).__FAME_RESPONSIVE_TEXT_MANAGER__ = this;
            this.logDebug("Instance registered globally for cache management");
        }
    }

    /**
     * Get unique identifier for an HTML element
     * 
     * Creates a consistent identifier for elements, preferring existing
     * IDs and falling back to data attributes or generated identifiers.
     * 
     * @param element - HTML element to get ID for
     * @returns Unique string identifier for the element
     */
    private getElementId(element: HTMLElement): string {
        // Prefer existing ID
        if (element.id) {
            return element.id;
        }

        // Check for data-framer-name (common in Framer)
        const framerName = element.getAttribute("data-framer-name");
        if (framerName) {
            return `framer-${framerName}`;
        }

        // Generate ID based on content and position
        const textContent = (element.textContent || "").slice(0, 20);
        const timestamp = Date.now();
        return `responsive-text-${textContent.replace(/\s+/g, "-")}-${timestamp}`;
    }

    /**
     * Log debug information if debug mode is enabled
     * 
     * @param message - Debug message to log
     * @param metadata - Optional metadata object to include
     */
    private logDebug(message: string, metadata?: Record<string, any>): void {
        if (ResponsiveTextManager.debugEnabled) {
            const prefix = "🔄 [ResponsiveTextManager]";
            if (metadata) {
                console.log(`${prefix} ${message}`, metadata);
            } else {
                console.log(`${prefix} ${message}`);
            }
        }
    }

    /**
     * 🚨 FRAMER BREAKPOINT FIX: Detect if we're in Framer preview environment
     * 
     * Framer preview has specific characteristics that we can detect to apply
     * special handling for breakpoint transitions.
     */
    private isFramerPreviewEnvironment(): boolean {
        if (typeof window === 'undefined') return false
        
        // Check for Framer-specific identifiers
        const hasFramerPreview = 
            window.location.hostname.includes('framer.app') ||
            window.location.hostname.includes('framer.com') ||
            window.location.hostname.includes('framer.website') ||
            window.location.pathname.includes('/preview') ||
            document.querySelector('[data-framer-name]') !== null ||
            document.querySelector('.framer-') !== null ||
            // Check for Framer CSS classes or data attributes
            document.documentElement.classList.toString().includes('framer') ||
            // Check for Framer-specific global variables
            (window as any).__framer__ !== undefined ||
            (window as any).Framer !== undefined
        
        return hasFramerPreview
    }
} 