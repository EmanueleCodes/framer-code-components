/**
 * @file PositionMappingService.ts
 * @description Character position mapping service for accurate text styling and position tracking
 * 
 * @version 1.0.0
 * @since Phase 4 Refactoring
 * 
 * This service extracts position mapping functionality from the TextSplitter god class.
 * It provides accurate character-by-character mapping between split text positions
 * and original text positions, solving cumulative offset errors in styled text splitting.
 * 
 * @example
 * ```typescript
 * const positionService = PositionMappingService.getInstance();
 * 
 * // Build position map for an element
 * const positionMap = positionService.buildCharacterPositionMap('Original text', ['Split', 'lines']);
 * positionService.storePositionMap('elementId', positionMap);
 * 
 * // Retrieve and use position map
 * const storedMap = positionService.getPositionMap('elementId');
 * const originalPosition = storedMap[splitPosition];
 * ```
 * 
 * @architecture
 * - **Singleton Pattern**: Ensures single instance for memory efficiency and consistent state
 * - **Map-Based Storage**: Efficient O(1) lookup for position maps by element ID
 * - **Algorithm Optimization**: O(n) character mapping with intelligent character matching
 * - **Memory Management**: Comprehensive cleanup methods to prevent memory leaks
 * - **Error Resilient**: Graceful degradation with fallback position mapping
 */

/**
 * Configuration interface for position mapping operations
 * 
 * @interface PositionMappingConfig
 */
export interface PositionMappingConfig {
    /** Whether to enable debug logging for position mapping operations */
    debugEnabled: boolean;
    /** Maximum number of warnings to log before suppressing (prevents spam) */
    maxWarnings: number;
    /** Whether to perform validation on position maps */
    enableValidation: boolean;
    /** Fallback strategy when character matching fails */
    fallbackStrategy: PositionFallbackStrategy;
}

/**
 * Strategies for handling position mapping fallbacks
 * 
 * @enum PositionFallbackStrategy
 */
export enum PositionFallbackStrategy {
    /** Use split position as fallback (most conservative) */
    SPLIT_POSITION = "splitPosition",
    /** Use last known good position (better for sequences) */
    LAST_KNOWN = "lastKnown",
    /** Use interpolated position based on surrounding matches */
    INTERPOLATED = "interpolated"
}

/**
 * Detailed result from position mapping operations
 * 
 * @interface PositionMappingResult
 */
export interface PositionMappingResult {
    /** The generated position map array */
    positionMap: number[];
    /** Original text that was mapped */
    originalText: string;
    /** Reconstructed split text used for mapping */
    reconstructedText: string;
    /** Whether mapping was successful */
    success: boolean;
    /** Number of characters successfully mapped */
    mappedCharacters: number;
    /** Number of warnings encountered during mapping */
    warnings: number;
    /** Total time taken for mapping operation in milliseconds */
    processingTime: number;
    /** Whether the texts matched exactly (no mapping needed) */
    exactMatch: boolean;
    /** Any error message if mapping failed */
    error?: string;
}

/**
 * Statistics about stored position maps
 * 
 * @interface PositionMappingStats
 */
export interface PositionMappingStats {
    /** Total number of stored position maps */
    totalMaps: number;
    /** Total memory used by all position maps (approximate) */
    memoryUsage: number;
    /** Largest position map by character count */
    largestMapSize: number;
    /** Average position map size */
    averageMapSize: number;
    /** Element IDs of all stored maps */
    elementIds: string[];
}

/**
 * PositionMappingService
 * 
 * Provides comprehensive character position mapping between original text and split text.
 * Essential for maintaining accurate styling when text is split into characters or words
 * while preserving the original element's styling information.
 * 
 * **Core Problem Solved:**
 * When text is split into lines and then further split into characters/words, the character
 * positions in the split text don't match the positions in the original text. This causes
 * styling information (captured from original text positions) to be applied incorrectly.
 * 
 * **Solution Algorithm:**
 * 1. **Character-by-Character Matching:** Compare each character in split text with original
 * 2. **Position Mapping:** Create array where index = split position, value = original position
 * 3. **Intelligent Fallbacks:** Handle edge cases with configurable fallback strategies
 * 4. **Performance Optimization:** O(n) algorithm with early termination and caching
 * 
 * **Memory Management:**
 * - Efficient Map-based storage with O(1) lookup
 * - Automatic cleanup methods to prevent memory leaks
 * - Memory usage tracking and reporting
 * 
 * @example
 * ```typescript
 * // Create and store position map
 * const service = PositionMappingService.getInstance();
 * const result = service.buildCharacterPositionMap(
 *     'Hello <span>World</span>!',
 *     ['Hello World!']
 * );
 * service.storePositionMap('myElement', result.positionMap);
 * 
 * // Use position map for styling
 * const map = service.getPositionMap('myElement');
 * const originalPos = map[splitCharIndex]; // Get original position for styling
 * ```
 */
export class PositionMappingService {
    private static instance: PositionMappingService | null = null;
    
    /** Storage for position maps by element ID */
    private positionMaps: Map<string, number[]> = new Map();
    
    /** Default configuration for position mapping operations */
    private readonly defaultConfig: PositionMappingConfig = {
        debugEnabled: false,
        maxWarnings: 10,
        enableValidation: true,
        fallbackStrategy: PositionFallbackStrategy.SPLIT_POSITION
    };

    /** Private constructor to enforce singleton pattern */
    private constructor() {
        this.log('PositionMappingService initialized');
    }

    /**
     * Get singleton instance of PositionMappingService
     * 
     * @returns {PositionMappingService} Singleton instance
     * 
     * @example
     * ```typescript
     * const service = PositionMappingService.getInstance();
     * ```
     */
    public static getInstance(): PositionMappingService {
        if (!PositionMappingService.instance) {
            PositionMappingService.instance = new PositionMappingService();
        }
        return PositionMappingService.instance;
    }

    /**
     * Internal logging method with configurable debug control
     * 
     * @param message - Message to log
     * @param config - Optional config to check debug status
     */
    private log(message: string, config?: Partial<PositionMappingConfig>): void {
        const debugEnabled = config?.debugEnabled ?? this.defaultConfig.debugEnabled;
        if (debugEnabled) {
            console.log(`🗺️ [PositionMappingService] ${message}`);
        }
    }

    /**
     * Build accurate character position mapping between original and split text
     * 
     * @param originalText - The original complete text content
     * @param splitLines - Array of line text content after splitting
     * @param config - Optional configuration to override defaults
     * @returns {PositionMappingResult} Detailed result with position map and metadata
     * 
     * @description
     * Creates a character-by-character mapping between split text positions and original 
     * text positions. This solves the cumulative offset error by providing exact position 
     * correspondence, essential for accurate styling preservation.
     * 
     * **Algorithm Details:**
     * 1. **Text Reconstruction:** Concatenate split lines to create reconstructed text
     * 2. **Exact Match Detection:** Check if original and reconstructed texts are identical
     * 3. **Character Matching:** For each split character, find corresponding original position
     * 4. **Intelligent Search:** Use optimized search with position advancement
     * 5. **Fallback Handling:** Apply configured fallback strategy for unmatched characters
     * 
     * **Performance Characteristics:**
     * - **Time Complexity:** O(n×m) worst case, O(n) typical case where n=split length, m=original length
     * - **Space Complexity:** O(n) for position map storage
     * - **Optimization:** Early termination on exact matches, efficient character matching
     * 
     * @example
     * ```typescript
     * const result = service.buildCharacterPositionMap(
     *     'Hello <strong>World</strong>!',
     *     ['Hello World!']
     * );
     * 
     * console.log(`Mapped ${result.mappedCharacters} characters`);
     * console.log(`Processing time: ${result.processingTime}ms`);
     * 
     * // Use position map
     * const originalPos = result.positionMap[splitIndex];
     * ```
     */
    public buildCharacterPositionMap(
        originalText: string,
        splitLines: string[],
        config?: Partial<PositionMappingConfig>
    ): PositionMappingResult {
        const startTime = performance.now();
        const finalConfig = { ...this.defaultConfig, ...config };
        
        this.log(`Building position map for ${originalText.length} original chars`, finalConfig);

        // Step 1: Reconstruct text from split lines
        const reconstructedText = splitLines.join('');
        
        this.log(`Reconstructed text: ${reconstructedText.length} chars`, finalConfig);

        // Step 2: Handle exact match case (optimization)
        if (originalText === reconstructedText) {
            const directMap = Array.from({ length: originalText.length }, (_, i) => i);
            const processingTime = performance.now() - startTime;
            
            this.log(`✅ Exact match - direct mapping (${originalText.length} chars)`, finalConfig);
            
            return {
                positionMap: directMap,
                originalText,
                reconstructedText,
                success: true,
                mappedCharacters: originalText.length,
                warnings: 0,
                processingTime,
                exactMatch: true
            };
        }

        // Step 3: Build character-by-character mapping
        const positionMap: number[] = [];
        let originalIndex = 0;
        let splitIndex = 0;
        let warnings = 0;
        const maxWarnings = finalConfig.maxWarnings;

        this.log(`Starting character-by-character mapping`, finalConfig);

        while (splitIndex < reconstructedText.length && originalIndex < originalText.length) {
            const splitChar = reconstructedText[splitIndex];

            // Find this character in original text starting from current position
            let foundIndex = -1;
            for (let searchIndex = originalIndex; searchIndex < originalText.length; searchIndex++) {
                if (originalText[searchIndex] === splitChar) {
                    foundIndex = searchIndex;
                    break;
                }
            }

            if (foundIndex !== -1) {
                // Character found - map split position to original position
                positionMap[splitIndex] = foundIndex;
                originalIndex = foundIndex + 1;
                splitIndex++;
            } else {
                // Character not found - apply fallback strategy
                const fallbackPosition = this.applyFallbackStrategy(
                    splitIndex,
                    originalIndex,
                    positionMap,
                    finalConfig.fallbackStrategy
                );
                
                positionMap[splitIndex] = fallbackPosition;
                
                if (warnings < maxWarnings) {
                    this.log(
                        `⚠️ Character "${splitChar}" not found at split position ${splitIndex}, using fallback: ${fallbackPosition}`,
                        finalConfig
                    );
                }
                warnings++;
                splitIndex++;
            }
        }

        // Step 4: Handle remaining characters with fallback strategy
        while (splitIndex < reconstructedText.length) {
            const fallbackPosition = this.applyFallbackStrategy(
                splitIndex,
                originalIndex,
                positionMap,
                finalConfig.fallbackStrategy
            );
            positionMap[splitIndex] = fallbackPosition;
            splitIndex++;
        }

        const processingTime = performance.now() - startTime;

        // Step 5: Validation (if enabled)
        if (finalConfig.enableValidation) {
            this.validatePositionMap(positionMap, originalText.length, finalConfig);
        }

        this.log(
            `✅ Position map built: ${positionMap.length} positions, ${warnings} warnings, ${processingTime.toFixed(2)}ms`,
            finalConfig
        );

        return {
            positionMap,
            originalText,
            reconstructedText,
            success: true,
            mappedCharacters: positionMap.length,
            warnings,
            processingTime,
            exactMatch: false
        };
    }

    /**
     * Apply fallback strategy for unmatched characters
     * 
     * @param splitIndex - Current position in split text
     * @param originalIndex - Current position in original text
     * @param positionMap - Current position map array
     * @param strategy - Fallback strategy to apply
     * @returns {number} Fallback position to use
     */
    private applyFallbackStrategy(
        splitIndex: number,
        originalIndex: number,
        positionMap: number[],
        strategy: PositionFallbackStrategy
    ): number {
        switch (strategy) {
            case PositionFallbackStrategy.SPLIT_POSITION:
                return splitIndex;
                
            case PositionFallbackStrategy.LAST_KNOWN:
                return splitIndex > 0 ? positionMap[splitIndex - 1] : originalIndex;
                
            case PositionFallbackStrategy.INTERPOLATED:
                // Find next known position for interpolation
                // For now, use split position as simple implementation
                return splitIndex;
                
            default:
                return splitIndex;
        }
    }

    /**
     * Validate position map for correctness
     * 
     * @param positionMap - Position map to validate
     * @param originalTextLength - Length of original text
     * @param config - Configuration for validation
     */
    private validatePositionMap(
        positionMap: number[],
        originalTextLength: number,
        config: PositionMappingConfig
    ): void {
        for (let i = 0; i < positionMap.length; i++) {
            const position = positionMap[i];
            if (position < 0 || position >= originalTextLength) {
                this.log(
                    `⚠️ Invalid position at index ${i}: ${position} (should be 0-${originalTextLength - 1})`,
                    config
                );
            }
        }
    }

    /**
     * Store position map for an element
     * 
     * @param elementId - Unique identifier for the element
     * @param positionMap - Position map array to store
     * @returns {boolean} Whether storage was successful
     * 
     * @description
     * Stores the position map for future retrieval. Overwrites any existing
     * position map for the same element ID.
     * 
     * @example
     * ```typescript
     * const success = service.storePositionMap('myElement', [0, 1, 2, 5, 6, 7]);
     * console.log(`Storage ${success ? 'successful' : 'failed'}`);
     * ```
     */
    public storePositionMap(elementId: string, positionMap: number[]): boolean {
        try {
            this.positionMaps.set(elementId, [...positionMap]); // Store copy to prevent mutation
            this.log(`Stored position map for element: ${elementId} (${positionMap.length} positions)`);
            return true;
        } catch (error) {
            this.log(`❌ Failed to store position map for element: ${elementId}`, { debugEnabled: true });
            return false;
        }
    }

    /**
     * Retrieve position map for an element
     * 
     * @param elementId - Unique identifier for the element
     * @returns {number[]} Position map array, or empty array if not found
     * 
     * @description
     * Retrieves the stored position map for the specified element.
     * Returns empty array if no position map exists for the element.
     * 
     * @example
     * ```typescript
     * const positionMap = service.getPositionMap('myElement');
     * if (positionMap.length > 0) {
     *     const originalPos = positionMap[splitCharIndex];
     * }
     * ```
     */
    public getPositionMap(elementId: string): number[] {
        const positionMap = this.positionMaps.get(elementId);
        if (!positionMap) {
            this.log(`No position map found for element: ${elementId}`, { debugEnabled: true });
            return [];
        }
        return [...positionMap]; // Return copy to prevent external mutation
    }

    /**
     * Check if position map exists for an element
     * 
     * @param elementId - Unique identifier for the element
     * @returns {boolean} Whether position map exists
     * 
     * @example
     * ```typescript
     * if (service.hasPositionMap('myElement')) {
     *     const map = service.getPositionMap('myElement');
     * }
     * ```
     */
    public hasPositionMap(elementId: string): boolean {
        return this.positionMaps.has(elementId);
    }

    /**
     * Delete position map for an element
     * 
     * @param elementId - Unique identifier for the element
     * @returns {boolean} Whether deletion was successful
     * 
     * @description
     * Removes the position map for the specified element to free memory.
     * Safe to call even if no position map exists for the element.
     * 
     * @example
     * ```typescript
     * const deleted = service.deletePositionMap('myElement');
     * console.log(`Deletion ${deleted ? 'successful' : 'failed'}`);
     * ```
     */
    public deletePositionMap(elementId: string): boolean {
        const existed = this.positionMaps.has(elementId);
        this.positionMaps.delete(elementId);
        
        if (existed) {
            this.log(`Deleted position map for element: ${elementId}`);
        }
        
        return existed;
    }

    /**
     * Clear all stored position maps
     * 
     * @description
     * Removes all stored position maps to free memory. Useful for cleanup
     * operations and preventing memory leaks.
     * 
     * @example
     * ```typescript
     * service.clearAllPositionMaps();
     * console.log('All position maps cleared');
     * ```
     */
    public clearAllPositionMaps(): void {
        const count = this.positionMaps.size;
        this.positionMaps.clear();
        this.log(`Cleared all position maps (${count} maps removed)`);
    }

    /**
     * Get statistics about stored position maps
     * 
     * @returns {PositionMappingStats} Statistics about position map storage
     * 
     * @description
     * Provides insights into memory usage and storage patterns for monitoring
     * and optimization purposes.
     * 
     * @example
     * ```typescript
     * const stats = service.getPositionMappingStats();
     * console.log(`Total maps: ${stats.totalMaps}`);
     * console.log(`Memory usage: ${stats.memoryUsage} bytes`);
     * ```
     */
    public getPositionMappingStats(): PositionMappingStats {
        const elementIds = Array.from(this.positionMaps.keys());
        const mapSizes = elementIds.map(id => this.positionMaps.get(id)?.length || 0);
        
        const totalMaps = this.positionMaps.size;
        const largestMapSize = Math.max(...mapSizes, 0);
        const averageMapSize = mapSizes.length > 0 
            ? mapSizes.reduce((sum, size) => sum + size, 0) / mapSizes.length 
            : 0;
        
        // Approximate memory usage (4 bytes per number + overhead)
        const memoryUsage = mapSizes.reduce((sum, size) => sum + size * 4, 0) + 
                           (totalMaps * 50); // Estimated overhead per map

        return {
            totalMaps,
            memoryUsage,
            largestMapSize,
            averageMapSize: Math.round(averageMapSize * 100) / 100,
            elementIds
        };
    }

    /**
     * Get debug information about the service
     * 
     * @returns Object containing debug information
     * 
     * @example
     * ```typescript
     * const debug = service.getDebugInfo();
     * console.log('Service status:', debug);
     * ```
     */
    public getDebugInfo(): {
        serviceInitialized: boolean;
        defaultConfig: PositionMappingConfig;
        stats: PositionMappingStats;
        memoryUsage: string;
    } {
        return {
            serviceInitialized: PositionMappingService.instance !== null,
            defaultConfig: { ...this.defaultConfig },
            stats: this.getPositionMappingStats(),
            memoryUsage: `${Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`
        };
    }

    /**
     * Cleanup service and reset singleton instance
     * 
     * @description
     * Clears all stored data and resets the singleton instance.
     * Useful for testing and memory cleanup.
     * 
     * @example
     * ```typescript
     * PositionMappingService.resetInstance();
     * ```
     */
    public static resetInstance(): void {
        if (PositionMappingService.instance) {
            PositionMappingService.instance.clearAllPositionMaps();
        }
        PositionMappingService.instance = null;
    }
} 