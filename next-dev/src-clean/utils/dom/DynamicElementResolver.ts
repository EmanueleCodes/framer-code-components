/**
 * @file DynamicElementResolver.ts
 * @description Dynamic element resolution utility for solving DOM disconnection issues
 * 
 * @version 1.0.0 - DOM Disconnection Solution
 * @since 1.0.0
 * 
 * @description
 * This utility provides dynamic element resolution to solve the core DOM disconnection
 * issue in FAME's animation system. Instead of caching direct DOM element references
 * that become stale when text splitting recreates elements, this system resolves
 * element IDs to current DOM elements on-demand during animation execution.
 * 
 * 🎯 SOLVES THE CORE PROBLEM:
 * - Animation system stores element IDs (not direct references)
 * - Text splitting destroys old elements, creates new ones with same IDs
 * - This resolver finds the current DOM elements by ID when needed
 * - No more "isConnected: false" disconnected element issues
 * 
 * @example
 * ```typescript
 * // OLD WAY (Broken with text splitting):
 * const element = document.querySelector('.text-line'); // Stores direct reference
 * // ... text splitting recreates elements ...
 * gsap.to(element, { opacity: 1 }); // ❌ element.isConnected === false
 * 
 * // NEW WAY (Dynamic resolution):
 * const elementId = DynamicElementResolver.ensureElementId(element);
 * // ... text splitting recreates elements with same ID ...
 * const currentElement = DynamicElementResolver.resolveElement(elementId);
 * gsap.to(currentElement, { opacity: 1 }); // ✅ Always finds connected element
 * ```
 */

/**
 * Configuration for element resolution behavior
 */
interface ResolverConfig {
    /** Whether to enable debug logging */
    debug?: boolean;
    /** Fallback strategy when element not found */
    fallbackStrategy?: 'warn' | 'error' | 'silent';
    /** Cache resolved elements for performance (risky with DOM changes) */
    enableCache?: boolean;
    /** How long to cache resolved elements (ms) */
    cacheTimeout?: number;
}

/**
 * Cache entry for resolved elements
 */
interface ResolvedElementCache {
    element: HTMLElement;
    resolvedAt: number;
    lastAccessed: number;
}

/**
 * Dynamic Element Resolver
 * 
 * Provides on-demand resolution of element IDs to current DOM elements,
 * solving the DOM disconnection issue in FAME's animation system.
 */
export class DynamicElementResolver {
    private static instance: DynamicElementResolver | null = null;
    
    /** Configuration for resolver behavior */
    private config: Required<ResolverConfig>;
    
    /** Cache of resolved elements (optional performance optimization) */
    private elementCache: Map<string, ResolvedElementCache> = new Map();
    
    /** Track element ID assignments for debugging */
    private assignedIds: Set<string> = new Set();
    
    constructor(config: ResolverConfig = {}) {
        this.config = {
            debug: config.debug ?? false,
            fallbackStrategy: config.fallbackStrategy ?? 'warn',
            enableCache: config.enableCache ?? false, // Disabled by default for safety
            cacheTimeout: config.cacheTimeout ?? 1000 // 1 second cache timeout
        };
        
        if (this.config.debug) {
            console.log('🔍 [DynamicElementResolver] Initialized with config:', this.config);
        }
    }
    
    /**
     * Get singleton instance
     */
    public static getInstance(config?: ResolverConfig): DynamicElementResolver {
        if (!DynamicElementResolver.instance) {
            DynamicElementResolver.instance = new DynamicElementResolver(config);
        }
        return DynamicElementResolver.instance;
    }
    
    /**
     * 🎯 CORE METHOD: Resolve element ID to current DOM element
     * 
     * This is the heart of solving the DOM disconnection issue.
     * Always returns the CURRENT element with the given ID, even if
     * the original element was destroyed and recreated.
     * 
     * @param elementId - Element ID to resolve
     * @returns Current DOM element with that ID, or null if not found
     */
    public resolveElement(elementId: string): HTMLElement | null {
        if (!elementId) {
            if (this.config.debug) {
                console.warn('🔍 [DynamicElementResolver] Cannot resolve empty element ID');
            }
            return null;
        }
        
        // Check cache first (if enabled)
        if (this.config.enableCache) {
            const cached = this.getCachedElement(elementId);
            if (cached) {
                return cached;
            }
        }
        
        // Resolve element from DOM
        const element = this.resolveFromDOM(elementId);
        
        // Update cache (if enabled)
        if (this.config.enableCache && element) {
            this.cacheElement(elementId, element);
        }
        
        return element;
    }
    
    /**
     * 🔧 UTILITY: Ensure element has a stable ID for future resolution
     * 
     * If element doesn't have a stable ID, assigns one using FAME's
     * existing convention (data-fame-element-id or element.id).
     * 
     * @param element - Element to ensure has an ID
     * @returns The element ID (existing or newly assigned)
     */
    public ensureElementId(element: HTMLElement): string {
        // Check for existing FAME ID
        let elementId = element.getAttribute('data-fame-element-id');
        
        // Fallback to standard ID
        if (!elementId) {
            elementId = element.id;
        }
        
        // Generate new ID if none exists
        if (!elementId) {
            elementId = this.generateElementId();
            element.setAttribute('data-fame-element-id', elementId);
            
            if (this.config.debug) {
                console.log(`🔍 [DynamicElementResolver] Assigned new ID: ${elementId} to`, element);
            }
        }
        
        // Track assigned IDs for debugging
        this.assignedIds.add(elementId);
        
        return elementId;
    }
    
    /**
     * 🎯 BATCH RESOLUTION: Resolve multiple element IDs at once
     * 
     * Efficiently resolves multiple element IDs to current DOM elements.
     * Returns only elements that were successfully found.
     * 
     * @param elementIds - Array of element IDs to resolve
     * @returns Array of resolved elements (may be shorter than input)
     */
    public resolveElements(elementIds: string[]): HTMLElement[] {
        const resolved: HTMLElement[] = [];
        
        for (const elementId of elementIds) {
            const element = this.resolveElement(elementId);
            if (element) {
                resolved.push(element);
            }
        }
        
        if (this.config.debug && resolved.length !== elementIds.length) {
            console.warn(`🔍 [DynamicElementResolver] Resolved ${resolved.length}/${elementIds.length} elements`);
        }
        
        return resolved;
    }
    
    /**
     * 🧹 CLEANUP: Clear element cache
     * 
     * Clears the element resolution cache. Useful when you know
     * DOM structure has changed significantly.
     */
    public clearCache(): void {
        this.elementCache.clear();
        
        if (this.config.debug) {
            console.log('🔍 [DynamicElementResolver] Cache cleared');
        }
    }
    
    /**
     * 📊 DEBUG: Get resolver statistics
     * 
     * Returns debug information about the resolver state.
     */
    public getDebugInfo(): {
        assignedIds: number;
        cachedElements: number;
        config: Required<ResolverConfig>;
    } {
        return {
            assignedIds: this.assignedIds.size,
            cachedElements: this.elementCache.size,
            config: this.config
        };
    }
    
    // ========================================
    // PRIVATE IMPLEMENTATION METHODS
    // ========================================
    
    /**
     * Resolve element from DOM using multiple strategies
     */
    private resolveFromDOM(elementId: string): HTMLElement | null {
        let element: HTMLElement | null = null;
        
        // Strategy 1: Try data-fame-element-id attribute (FAME's convention)
        element = document.querySelector(`[data-fame-element-id="${elementId}"]`) as HTMLElement;
        
        if (element) {
            if (this.config.debug) {
                console.log(`🔍 [DynamicElementResolver] ✅ Found element by data-fame-element-id: ${elementId}`);
            }
            return element;
        }
        
        // Strategy 2: Try standard ID
        element = document.getElementById(elementId);
        
        if (element) {
            if (this.config.debug) {
                console.log(`🔍 [DynamicElementResolver] ✅ Found element by id: ${elementId}`);
            }
            return element;
        }
        
        // Strategy 3: Not found - handle according to fallback strategy
        this.handleElementNotFound(elementId);
        return null;
    }
    
    /**
     * Handle element not found according to configured strategy
     */
    private handleElementNotFound(elementId: string): void {
        const message = `🔍 [DynamicElementResolver] ❌ Element not found: ${elementId}`;
        
        switch (this.config.fallbackStrategy) {
            case 'error':
                throw new Error(message);
            case 'warn':
                console.warn(message);
                break;
            case 'silent':
                // Do nothing
                break;
        }
    }
    
    /**
     * Generate unique element ID
     */
    private generateElementId(): string {
        return `fame-dynamic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    /**
     * Get cached element if available and valid
     */
    private getCachedElement(elementId: string): HTMLElement | null {
        const cached = this.elementCache.get(elementId);
        
        if (!cached) {
            return null;
        }
        
        const now = performance.now();
        
        // Check if cache entry is expired
        if (now - cached.resolvedAt > this.config.cacheTimeout) {
            this.elementCache.delete(elementId);
            return null;
        }
        
        // Check if element is still connected to DOM
        if (!cached.element.isConnected) {
            this.elementCache.delete(elementId);
            return null;
        }
        
        // Update last accessed time
        cached.lastAccessed = now;
        
        if (this.config.debug) {
            console.log(`🔍 [DynamicElementResolver] 🎯 Cache hit for: ${elementId}`);
        }
        
        return cached.element;
    }
    
    /**
     * Cache resolved element
     */
    private cacheElement(elementId: string, element: HTMLElement): void {
        const now = performance.now();
        
        this.elementCache.set(elementId, {
            element,
            resolvedAt: now,
            lastAccessed: now
        });
        
        if (this.config.debug) {
            console.log(`🔍 [DynamicElementResolver] 📦 Cached element: ${elementId}`);
        }
    }
}

/**
 * 🎯 CONVENIENCE EXPORT: Global resolver instance
 * 
 * Pre-configured resolver instance for immediate use throughout FAME.
 * Uses safe defaults that work well with the existing animation system.
 */
export const dynamicElementResolver = DynamicElementResolver.getInstance({
    debug: false, // Enable for debugging
    fallbackStrategy: 'warn',
    enableCache: false // Disabled for safety with DOM changes
});

/**
 * 🚀 CONVENIENCE FUNCTIONS: Direct access to core functionality
 * 
 * These functions provide direct access to the most commonly used
 * resolver methods without needing to access the instance.
 */

/**
 * Resolve element ID to current DOM element
 * @param elementId - Element ID to resolve
 * @returns Current DOM element or null if not found
 */
export function resolveElement(elementId: string): HTMLElement | null {
    return dynamicElementResolver.resolveElement(elementId);
}

/**
 * Resolve multiple element IDs to current DOM elements
 * @param elementIds - Array of element IDs to resolve
 * @returns Array of resolved elements
 */
export function resolveElements(elementIds: string[]): HTMLElement[] {
    return dynamicElementResolver.resolveElements(elementIds);
}

/**
 * Ensure element has a stable ID for future resolution
 * @param element - Element to ensure has an ID
 * @returns The element ID
 */
export function ensureElementId(element: HTMLElement): string {
    return dynamicElementResolver.ensureElementId(element);
} 