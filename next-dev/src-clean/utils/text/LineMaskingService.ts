/**
 * @file LineMaskingService.ts
 * @description Professional line masking service for FAME text reveal effects
 * 
 * @version 1.0.0 - Line Masking System
 * @since 2.1.0
 * 
 * @description
 * Dedicated service for creating and managing line masking containers.
 * Uses simple overflow: hidden containers to enable professional reveal animations.
 * Integrates with TextSplitter for responsive behavior and element ID preservation.
 * 
 * @architecture Clean Single Responsibility
 * - Focused solely on line masking functionality
 * - No text splitting logic (handled by TextSplitter)
 * - Clean integration with existing animation system
 * - Responsive masking with clean recreate strategy
 * 
 * @example
 * ```typescript
 * const maskingService = LineMaskingService.getInstance();
 * 
 * // Apply masking to line elements
 * const maskedElements = maskingService.applyLineMasking(lineElements);
 * 
 * // Remove masking (for cleanup)
 * maskingService.removeLineMasking(containerElement);
 * ```
 */

/**
 * Configuration for line masking behavior
 */
export interface LineMaskConfig {
    /** Enable line masking */
    enabled: boolean;
    
    /** CSS class for mask containers */
    maskClassName?: string;
    
    /** Additional CSS properties for masks */
    additionalStyles?: Record<string, string>;
    
    /** Preserve existing element IDs when masking */
    preserveElementIds?: boolean;
}

/**
 * Result of line masking operation
 */
export interface LineMaskResult {
    /** Successfully created mask containers */
    maskContainers: HTMLElement[];
    
    /** Original line elements (now inside masks) */
    lineElements: HTMLElement[];
    
    /** Whether masking was successful */
    success: boolean;
    
    /** Error message if masking failed */
    error?: string;
    
    /** Metadata about masking operation */
    metadata: {
        /** Number of lines masked */
        lineCount: number;
        
        /** Original container element */
        originalContainer: HTMLElement;
        
        /** Timestamp of masking operation */
        timestamp: number;
    };
}

/**
 * Professional line masking service for reveal animations
 * 
 * Creates simple overflow:hidden containers around line elements to enable
 * reveal effects. Uses clean recreate strategy for responsive behavior.
 */
export class LineMaskingService {
    private static instance: LineMaskingService | null = null;
    
    /** Track masked elements for cleanup */
    private maskedElements: Map<string, HTMLElement[]> = new Map();
    
    /**
     * Get singleton instance
     */
    public static getInstance(): LineMaskingService {
        if (!LineMaskingService.instance) {
            LineMaskingService.instance = new LineMaskingService();
        }
        return LineMaskingService.instance;
    }
    
    /**
     * Apply line masking to an array of line elements
     * 
     * @param lineElements - Array of line elements to mask
     * @param config - Masking configuration
     * @returns Result with masked containers and original elements
     */
    public applyLineMasking(
        lineElements: HTMLElement[], 
        config: LineMaskConfig = { enabled: true }
    ): LineMaskResult {
        if (!config.enabled || lineElements.length === 0) {
            return this.createSkippedResult(lineElements, "Masking disabled or no elements");
        }
        
        try {
            const maskContainers: HTMLElement[] = [];
            const processedElements: HTMLElement[] = [];
            
            for (const lineElement of lineElements) {
                // Skip if element is already masked
                if (this.isAlreadyMasked(lineElement)) {
                    console.log("🎭 [LineMaskingService] Element already masked, skipping");
                    continue;
                }
                
                // Create mask container for this line
                const maskContainer = this.createMaskContainer(lineElement, config);
                
                if (maskContainer) {
                    // Move line element inside mask container
                    this.moveElementToMask(lineElement, maskContainer, config);
                    
                    maskContainers.push(maskContainer);
                    processedElements.push(lineElement);
                }
            }
            
            // Track masked elements for cleanup
            if (lineElements.length > 0 && lineElements[0].parentElement) {
                const containerId = this.getContainerId(lineElements[0].parentElement);
                this.maskedElements.set(containerId, maskContainers);
            }
            
            console.log(`🎭 [LineMaskingService] Successfully masked ${maskContainers.length} lines`);
            
            return {
                maskContainers,
                lineElements: processedElements,
                success: true,
                metadata: {
                    lineCount: maskContainers.length,
                    originalContainer: lineElements[0]?.parentElement || document.body,
                    timestamp: Date.now()
                }
            };
            
        } catch (error) {
            console.error("🎭 [LineMaskingService] Error applying line masking:", error);
            return this.createFailureResult(
                lineElements, 
                error instanceof Error ? error.message : "Unknown masking error"
            );
        }
    }
    
    /**
     * Remove line masking from container and restore original structure
     * 
     * @param containerElement - Container element to remove masking from
     * @returns Whether cleanup was successful
     */
    public removeLineMasking(containerElement: HTMLElement): boolean {
        try {
            const containerId = this.getContainerId(containerElement);
            const maskContainers = this.maskedElements.get(containerId);
            
            if (!maskContainers) {
                console.log("🎭 [LineMaskingService] No masking found for container");
                return false;
            }
            
            // Extract line elements from masks and restore to container
            for (const maskContainer of maskContainers) {
                const lineElement = maskContainer.querySelector('.fame-text-line');
                if (lineElement && maskContainer.parentElement) {
                    
                    // 🚨 PRODUCTION FIX: Simplified validation for masking removal
                    const parent = maskContainer.parentElement;
                    if (!parent) {
                        console.warn("🎭 [LineMaskingService] No parent element found, skipping masking removal");
                        continue;
                    }
                    
                    // Move line element back to original container
                    maskContainer.parentElement.insertBefore(lineElement, maskContainer);
                    // Remove mask container
                    maskContainer.remove();
                }
            }
            
            // Clear tracking
            this.maskedElements.delete(containerId);
            
            console.log(`🎭 [LineMaskingService] Successfully removed masking from ${maskContainers.length} lines`);
            return true;
            
        } catch (error) {
            console.error("🎭 [LineMaskingService] Error removing line masking:", error);
            return false;
        }
    }
    
    /**
     * Check if element is already masked
     */
    private isAlreadyMasked(element: HTMLElement): boolean {
        return element.parentElement?.classList.contains('fame-line-mask') || false;
    }
    
    /**
     * Create mask container for a line element
     */
    private createMaskContainer(lineElement: HTMLElement, config: LineMaskConfig): HTMLElement | null {
        try {
            const maskContainer = document.createElement('div');
            
            // 🎭 CORE MASKING: Simple overflow hidden container
            maskContainer.className = config.maskClassName || 'fame-line-mask';
            maskContainer.style.overflow = 'hidden';
            maskContainer.style.height = 'auto';
            
            // 🔧 LAYOUT PRESERVATION: Maintain text layout properties
            maskContainer.style.display = 'block';
            maskContainer.style.width = '100%';
            maskContainer.style.margin = '0';
            maskContainer.style.padding = '0';
            
            // 🔥 ANIMATION READY: Ensure transforms work properly
            maskContainer.style.transformOrigin = 'left top';
            maskContainer.style.willChange = 'height, transform';
            
            // Apply additional styles if provided
            if (config.additionalStyles) {
                Object.assign(maskContainer.style, config.additionalStyles);
            }
            
            // 🔍 TRACKING: Add unique ID for animation targeting
            const maskId = `fame-mask-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            maskContainer.setAttribute('data-fame-element-id', maskId);
            maskContainer.setAttribute('data-fame-mask', 'true');
            
            console.log(`🎭 [LineMaskingService] Created mask container: ${maskId}`);
            return maskContainer;
            
        } catch (error) {
            console.error("🎭 [LineMaskingService] Error creating mask container:", error);
            return null;
        }
    }
    
    /**
     * Move line element inside mask container
     */
    private moveElementToMask(
        lineElement: HTMLElement, 
        maskContainer: HTMLElement, 
        config: LineMaskConfig
    ): void {
        try {
            const parent = lineElement.parentElement;
            if (!parent) {
                throw new Error("Line element has no parent");
            }
            
            // 🚨 PRODUCTION FIX: Simplified validation for masking
            if (!parent) {
                throw new Error("Parent element is null");
            }
            
            if (!lineElement) {
                throw new Error("Line element is null");
            }
            
            // Insert mask container where line element was
            parent.insertBefore(maskContainer, lineElement);
            
            // Move line element inside mask container
            maskContainer.appendChild(lineElement);
            
            // 🔍 PRESERVE: Maintain element ID for animation continuity
            if (config.preserveElementIds !== false) {
                const originalId = lineElement.getAttribute('data-fame-element-id');
                if (originalId) {
                    console.log(`🎭 [LineMaskingService] Preserved element ID: ${originalId}`);
                }
            }
            
        } catch (error) {
            console.error("🎭 [LineMaskingService] Error moving element to mask:", error);
            throw error;
        }
    }
    
    /**
     * Get unique container ID for tracking
     */
    private getContainerId(container: HTMLElement): string {
        let id = container.getAttribute('data-fame-element-id') || container.id;
        
        if (!id) {
            id = `fame-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            container.setAttribute('data-fame-element-id', id);
        }
        
        return id;
    }
    
    /**
     * Create skipped result (masking disabled)
     */
    private createSkippedResult(lineElements: HTMLElement[], reason: string): LineMaskResult {
        return {
            maskContainers: [],
            lineElements: lineElements,
            success: true, // Success because intentionally skipped
            metadata: {
                lineCount: 0,
                originalContainer: lineElements[0]?.parentElement || document.body,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * Create failure result
     */
    private createFailureResult(lineElements: HTMLElement[], error: string): LineMaskResult {
        return {
            maskContainers: [],
            lineElements: [],
            success: false,
            error,
            metadata: {
                lineCount: 0,
                originalContainer: lineElements[0]?.parentElement || document.body,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * Cleanup all masking tracking
     */
    public cleanupAllMasking(): void {
        console.log(`🎭 [LineMaskingService] Cleaning up ${this.maskedElements.size} masked containers`);
        this.maskedElements.clear();
    }
} 