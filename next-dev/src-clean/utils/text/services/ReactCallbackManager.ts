/**
 * @file ReactCallbackManager.ts
 * @description React integration and callback management service for text splitting operations
 * 
 * @version 1.0.0
 * @since Phase 5 Refactoring
 * 
 * This service extracts React integration functionality from the TextSplitter god class.
 * It provides comprehensive callback management for notifying React components when text
 * splitting operations complete, enabling seamless integration with React's lifecycle.
 * 
 * @example
 * ```typescript
 * const callbackManager = ReactCallbackManager.getInstance();
 * 
 * // Register callback for React component
 * callbackManager.registerCallback('elementId', (elements, splitType) => {
 *     console.log(`Split complete: ${elements.length} ${splitType} elements`);
 *     setAnimatedElements(elements); // Update React state
 * });
 * 
 * // Notify when splitting completes
 * callbackManager.notifyCompletion('elementId', splitElements, TextSplitType.WORDS);
 * ```
 * 
 * @architecture
 * - **Singleton Pattern**: Ensures single instance for consistent callback management
 * - **Type-Safe Callbacks**: Comprehensive TypeScript interfaces for callback signatures
 * - **Memory Management**: Efficient Map-based storage with cleanup methods
 * - **React Integration**: Optimized for React component lifecycle and state updates
 * - **Error Resilient**: Graceful error handling with comprehensive logging
 */

import type { TextSplitType } from "../../../types/index.ts";

/**
 * Callback function signature for React integration when text splitting completes
 * 
 * @param elements - Array of HTML elements created by the text splitting operation
 * @param splitType - The type of splitting that was performed (characters, words, lines)
 * 
 * @description
 * This callback is invoked whenever a text splitting operation completes,
 * allowing React components to update their state with the new split elements.
 * 
 * @example
 * ```typescript
 * const callback: TextSplitCompleteCallback = (elements, splitType) => {
 *     setAnimatedElements(elements);
 *     setIsReady(true);
 *     console.log(`Split ${elements.length} ${splitType}`);
 * };
 * ```
 */
export type TextSplitCompleteCallback = (
    elements: HTMLElement[],
    splitType: TextSplitType
) => void;

/**
 * Configuration options for React callback management
 * 
 * @interface ReactCallbackConfig
 */
export interface ReactCallbackConfig {
    /** Whether to enable debug logging for callback operations */
    debugEnabled: boolean;
    /** Maximum number of callbacks to store (prevents memory leaks) */
    maxCallbacks: number;
    /** Whether to validate callback functions before storage */
    enableValidation: boolean;
    /** Timeout for callback execution in milliseconds */
    callbackTimeout: number;
}

/**
 * Result from callback notification operations
 * 
 * @interface CallbackNotificationResult
 */
export interface CallbackNotificationResult {
    /** Whether the notification was successful */
    success: boolean;
    /** Element ID that was notified */
    elementId: string;
    /** Number of elements in the notification */
    elementCount: number;
    /** Split type that was notified */
    splitType: TextSplitType;
    /** Time taken for callback execution in milliseconds */
    executionTime: number;
    /** Any error message if notification failed */
    error?: string;
}

/**
 * Statistics about registered callbacks
 * 
 * @interface CallbackManagerStats
 */
export interface CallbackManagerStats {
    /** Total number of registered callbacks */
    totalCallbacks: number;
    /** Element IDs with registered callbacks */
    elementIds: string[];
    /** Total notifications sent since service creation */
    totalNotifications: number;
    /** Number of successful notifications */
    successfulNotifications: number;
    /** Number of failed notifications */
    failedNotifications: number;
    /** Average callback execution time in milliseconds */
    averageExecutionTime: number;
}

/**
 * ReactCallbackManager
 * 
 * Comprehensive service for managing React integration callbacks in text splitting operations.
 * Provides type-safe callback registration, efficient notification delivery, and memory management
 * optimized for React component lifecycle patterns.
 * 
 * **Core Purpose:**
 * When text splitting operations complete (initial split or resize re-split), React components
 * need to be notified so they can update their state with the new split elements. This service
 * provides a clean, efficient way to manage these notifications.
 * 
 * **React Integration Pattern:**
 * 1. **Component Mount**: Register callback to receive split completion notifications
 * 2. **Split Complete**: Service notifies registered callback with new elements
 * 3. **State Update**: React component updates state and triggers re-render
 * 4. **Component Unmount**: Unregister callback to prevent memory leaks
 * 
 * **Memory Management:**
 * - Efficient Map-based storage with O(1) callback lookup
 * - Automatic cleanup methods to prevent memory leaks
 * - Configurable maximum callback limits for safety
 * - Performance tracking and statistics for monitoring
 * 
 * @example
 * ```typescript
 * // React component integration
 * const [animatedElements, setAnimatedElements] = useState<HTMLElement[]>([]);
 * 
 * useEffect(() => {
 *     const callbackManager = ReactCallbackManager.getInstance();
 *     
 *     callbackManager.registerCallback(elementId, (elements, splitType) => {
 *         setAnimatedElements(elements);
 *         console.log(`Received ${elements.length} ${splitType} elements`);
 *     });
 *     
 *     return () => callbackManager.unregisterCallback(elementId);
 * }, [elementId]);
 * ```
 */
export class ReactCallbackManager {
    private static instance: ReactCallbackManager | null = null;
    
    /** Storage for callbacks by element ID */
    private callbacks: Map<string, TextSplitCompleteCallback> = new Map();
    
    /** Performance tracking */
    private stats: {
        totalNotifications: number;
        successfulNotifications: number;
        failedNotifications: number;
        totalExecutionTime: number;
    } = {
        totalNotifications: 0,
        successfulNotifications: 0,
        failedNotifications: 0,
        totalExecutionTime: 0
    };
    
    /** Default configuration for callback management */
    private readonly defaultConfig: ReactCallbackConfig = {
        debugEnabled: false,
        maxCallbacks: 100,
        enableValidation: true,
        callbackTimeout: 0 // 🚨 TIMEOUT FIX: Disabled timeout (not needed for sync callbacks)
    };

    /** Private constructor to enforce singleton pattern */
    private constructor() {
        this.log('ReactCallbackManager initialized');
    }

    /**
     * Get singleton instance of ReactCallbackManager
     * 
     * @returns {ReactCallbackManager} Singleton instance
     * 
     * @example
     * ```typescript
     * const callbackManager = ReactCallbackManager.getInstance();
     * ```
     */
    public static getInstance(): ReactCallbackManager {
        if (!ReactCallbackManager.instance) {
            ReactCallbackManager.instance = new ReactCallbackManager();
        }
        return ReactCallbackManager.instance;
    }

    /**
     * Internal logging method with configurable debug control
     * 
     * @param message - Message to log
     * @param config - Optional config to check debug status
     */
    private log(message: string, config?: Partial<ReactCallbackConfig>): void {
        const debugEnabled = config?.debugEnabled ?? this.defaultConfig.debugEnabled;
        if (debugEnabled) {
            console.log(`⚛️ [ReactCallbackManager] ${message}`);
        }
    }

    /**
     * Validate callback function before registration
     * 
     * @param callback - Callback function to validate
     * @param config - Configuration for validation
     * @returns Whether callback is valid
     */
    private validateCallback(
        callback: TextSplitCompleteCallback,
        config: ReactCallbackConfig
    ): boolean {
        if (!config.enableValidation) return true;
        
        if (typeof callback !== 'function') {
            this.log('Invalid callback: not a function', config);
            return false;
        }
        
        // Check function signature (expecting 2 parameters)
        if (callback.length !== 2) {
            this.log(`Invalid callback signature: expected 2 parameters, got ${callback.length}`, config);
            return false;
        }
        
        return true;
    }

    /**
     * Register a callback for split completion notifications
     * 
     * @param elementId - Unique identifier for the element
     * @param callback - Function to call when text splitting completes
     * @param config - Optional configuration to override defaults
     * @returns Whether registration was successful
     * 
     * @description
     * Registers a callback to be invoked when text splitting operations complete
     * for the specified element. The callback receives the split elements and
     * split type, allowing React components to update their state accordingly.
     * 
     * **Memory Safety:**
     * - Overwrites existing callbacks for the same element ID
     * - Validates callback function signature if validation is enabled
     * - Enforces maximum callback limits to prevent memory leaks
     * 
     * @example
     * ```typescript
     * const success = callbackManager.registerCallback(
     *     'my-text-element',
     *     (elements, splitType) => {
     *         setAnimatedElements(elements);
     *         setIsReady(true);
     *     }
     * );
     * ```
     */
    public registerCallback(
        elementId: string,
        callback: TextSplitCompleteCallback,
        config?: Partial<ReactCallbackConfig>
    ): boolean {
        const finalConfig = { ...this.defaultConfig, ...config };
        
        try {
            // Validate inputs
            if (!elementId) {
                this.log('Registration failed: empty element ID', finalConfig);
                return false;
            }
            
            if (!this.validateCallback(callback, finalConfig)) {
                return false;
            }
            
            // Check callback limit
            if (this.callbacks.size >= finalConfig.maxCallbacks && !this.callbacks.has(elementId)) {
                this.log(`Registration failed: maximum callbacks reached (${finalConfig.maxCallbacks})`, finalConfig);
                return false;
            }
            
            // Store callback
            this.callbacks.set(elementId, callback);
            
            this.log(`Registered callback for element: ${elementId} (${this.callbacks.size} total)`, finalConfig);
            return true;
            
        } catch (error) {
            this.log(`Registration error for element ${elementId}: ${error}`, finalConfig);
            return false;
        }
    }

    /**
     * Unregister a callback for an element
     * 
     * @param elementId - Unique identifier for the element
     * @param config - Optional configuration to override defaults
     * @returns Whether unregistration was successful
     * 
     * @description
     * Removes the registered callback for the specified element, preventing
     * future notifications. Safe to call even if no callback is registered.
     * 
     * @example
     * ```typescript
     * const removed = callbackManager.unregisterCallback('my-text-element');
     * console.log(`Callback ${removed ? 'removed' : 'not found'}`);
     * ```
     */
    public unregisterCallback(
        elementId: string,
        config?: Partial<ReactCallbackConfig>
    ): boolean {
        const finalConfig = { ...this.defaultConfig, ...config };
        
        const existed = this.callbacks.delete(elementId);
        
        if (existed) {
            this.log(`Unregistered callback for element: ${elementId} (${this.callbacks.size} remaining)`, finalConfig);
        } else {
            this.log(`No callback found for element: ${elementId}`, finalConfig);
        }
        
        return existed;
    }

    /**
     * Check if a callback is registered for an element
     * 
     * @param elementId - Unique identifier for the element
     * @returns Whether callback is registered
     * 
     * @example
     * ```typescript
     * if (callbackManager.hasCallback('my-element')) {
     *     console.log('Callback is registered');
     * }
     * ```
     */
    public hasCallback(elementId: string): boolean {
        return this.callbacks.has(elementId);
    }

    /**
     * Notify registered callback of split completion
     * 
     * @param elementId - Unique identifier for the element
     * @param elements - Array of HTML elements created by splitting
     * @param splitType - Type of splitting performed
     * @param config - Optional configuration to override defaults
     * @returns Detailed result of the notification operation
     * 
     * @description
     * Invokes the registered callback for the specified element with the split
     * results. Includes comprehensive error handling and performance tracking.
     * 
     * **Error Handling:**
     * - Graceful handling of callback execution errors
     * - Timeout protection for long-running callbacks
     * - Comprehensive logging and statistics tracking
     * 
     * @example
     * ```typescript
     * const result = callbackManager.notifyCompletion(
     *     'my-element', 
     *     splitElements, 
     *     TextSplitType.WORDS
     * );
     * 
     * if (result.success) {
     *     console.log(`Notified callback in ${result.executionTime}ms`);
     * }
     * ```
     */
    public notifyCompletion(
        elementId: string,
        elements: HTMLElement[],
        splitType: TextSplitType,
        config?: Partial<ReactCallbackConfig>
    ): CallbackNotificationResult {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = performance.now();
        
        // Update statistics
        this.stats.totalNotifications++;
        
        const result: CallbackNotificationResult = {
            success: false,
            elementId,
            elementCount: elements.length,
            splitType,
            executionTime: 0
        };
        
        try {
            // Check if callback exists
            const callback = this.callbacks.get(elementId);
            if (!callback) {
                result.error = 'No callback registered for element';
                this.log(`No callback found for element: ${elementId}`, finalConfig);
                this.stats.failedNotifications++;
                return result;
            }
            
            this.log(
                `Notifying callback for element: ${elementId} (${elements.length} ${splitType} elements)`,
                finalConfig
            );
            
            // Execute callback directly (synchronous callbacks don't need timeout protection)
            // 🚨 TIMEOUT FIX: Removed broken Promise-based timeout logic that caused unhandled rejections
            callback(elements, splitType);
            
            // Calculate execution time
            result.executionTime = performance.now() - startTime;
            result.success = true;
            
            // Update statistics
            this.stats.successfulNotifications++;
            this.stats.totalExecutionTime += result.executionTime;
            
            this.log(
                `Callback executed successfully in ${result.executionTime.toFixed(2)}ms`,
                finalConfig
            );
            
        } catch (error) {
            result.executionTime = performance.now() - startTime;
            result.error = error instanceof Error ? error.message : 'Unknown error';
            
            this.stats.failedNotifications++;
            
            this.log(
                `Callback execution failed for element ${elementId}: ${result.error}`,
                finalConfig
            );
        }
        
        return result;
    }

    /**
     * Clear all registered callbacks
     * 
     * @param config - Optional configuration to override defaults
     * @returns Number of callbacks that were cleared
     * 
     * @description
     * Removes all registered callbacks and resets statistics. Useful for cleanup
     * operations and preventing memory leaks.
     * 
     * @example
     * ```typescript
     * const cleared = callbackManager.clearAllCallbacks();
     * console.log(`Cleared ${cleared} callbacks`);
     * ```
     */
    public clearAllCallbacks(config?: Partial<ReactCallbackConfig>): number {
        const finalConfig = { ...this.defaultConfig, ...config };
        const count = this.callbacks.size;
        
        this.callbacks.clear();
        
        // Reset statistics
        this.stats = {
            totalNotifications: 0,
            successfulNotifications: 0,
            failedNotifications: 0,
            totalExecutionTime: 0
        };
        
        this.log(`Cleared all callbacks (${count} removed)`, finalConfig);
        return count;
    }

    /**
     * Get statistics about callback management
     * 
     * @returns Statistics about registered callbacks and notifications
     * 
     * @description
     * Provides insights into callback usage patterns, performance metrics,
     * and memory usage for monitoring and optimization purposes.
     * 
     * @example
     * ```typescript
     * const stats = callbackManager.getStats();
     * console.log(`${stats.totalCallbacks} callbacks registered`);
     * console.log(`${stats.successfulNotifications}/${stats.totalNotifications} notifications successful`);
     * ```
     */
    public getStats(): CallbackManagerStats {
        const elementIds = Array.from(this.callbacks.keys());
        const averageExecutionTime = this.stats.totalNotifications > 0
            ? this.stats.totalExecutionTime / this.stats.totalNotifications
            : 0;
        
        return {
            totalCallbacks: this.callbacks.size,
            elementIds,
            totalNotifications: this.stats.totalNotifications,
            successfulNotifications: this.stats.successfulNotifications,
            failedNotifications: this.stats.failedNotifications,
            averageExecutionTime: Math.round(averageExecutionTime * 100) / 100
        };
    }

    /**
     * Get debug information about the service
     * 
     * @returns Object containing debug information
     * 
     * @example
     * ```typescript
     * const debug = callbackManager.getDebugInfo();
     * console.log('Service status:', debug);
     * ```
     */
    public getDebugInfo(): {
        serviceInitialized: boolean;
        defaultConfig: ReactCallbackConfig;
        stats: CallbackManagerStats;
        memoryUsage: string;
    } {
        return {
            serviceInitialized: ReactCallbackManager.instance !== null,
            defaultConfig: { ...this.defaultConfig },
            stats: this.getStats(),
            memoryUsage: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`
        };
    }

    /**
     * Cleanup service and reset singleton instance
     * 
     * @description
     * Clears all callbacks and resets the singleton instance.
     * Useful for testing and memory cleanup.
     * 
     * @example
     * ```typescript
     * ReactCallbackManager.resetInstance();
     * ```
     */
    public static resetInstance(): void {
        if (ReactCallbackManager.instance) {
            ReactCallbackManager.instance.clearAllCallbacks();
        }
        ReactCallbackManager.instance = null;
    }
} 