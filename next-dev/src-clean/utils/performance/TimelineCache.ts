/**
 * @file TimelineCache.ts
 * @description High-performance timeline caching system for scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Prevents expensive timeline rebuilding by caching MasterTimeline instances
 * based on property signatures. Critical for scroll animation performance.
 * 
 * @performance
 * - Reduces timeline creation from O(n) per animation to O(1) cache lookup
 * - Uses property signature hashing for fast cache key generation
 * - Automatic cache invalidation when properties change
 * - Memory-efficient with configurable cache size limits
 * 
 * @example
 * ```typescript
 * const cache = TimelineCache.getInstance();
 * 
 * // Fast cache lookup instead of rebuilding
 * const timeline = cache.getOrCreateTimeline(properties, () => {
 *   return builder.buildMasterTimeline(properties);
 * });
 * ```
 */

import { MasterTimeline } from '../../core/timeline/MasterTimeline.ts';
import { AnimationProperty } from '../../types/index.ts';

/**
 * Cache entry for timeline instances
 */
interface TimelineCacheEntry {
    /** Cached timeline instance */
    timeline: MasterTimeline;
    /** Property signature hash for validation */
    signature: string;
    /** Last access timestamp for LRU eviction */
    lastAccessed: number;
    /** Creation timestamp for debugging */
    createdAt: number;
}

/**
 * Configuration for timeline cache
 */
interface TimelineCacheConfig {
    /** Maximum number of cached timelines */
    maxCacheSize: number;
    /** Cache entry TTL in milliseconds */
    ttlMs: number;
    /** Enable performance tracking */
    enableTracking: boolean;
}

/**
 * Performance metrics for cache operations
 */
interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
    totalLookups: number;
    averageLookupTime: number;
}

/**
 * High-performance timeline caching system
 * 
 * @description
 * Singleton cache that prevents expensive timeline rebuilding by caching
 * MasterTimeline instances based on property signatures.
 */
export class TimelineCache {
    private static instance: TimelineCache | null = null;
    
    private cache = new Map<string, TimelineCacheEntry>();
    private config: TimelineCacheConfig;
    private metrics: CacheMetrics;
    
    private constructor(config: Partial<TimelineCacheConfig> = {}) {
        this.config = {
            maxCacheSize: 100, // Reasonable limit for scroll animations
            ttlMs: 5 * 60 * 1000, // 5 minutes
            enableTracking: true,
            ...config
        };
        
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalLookups: 0,
            averageLookupTime: 0
        };
        
        console.log('🎬 [TimelineCache] Initialized with config:', this.config);
    }
    
    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<TimelineCacheConfig>): TimelineCache {
        if (!TimelineCache.instance) {
            TimelineCache.instance = new TimelineCache(config);
        }
        return TimelineCache.instance;
    }
    
    /**
     * Get or create timeline from cache
     * 
     * @param properties - Animation properties to build timeline from
     * @param factory - Factory function to create timeline if not cached
     * @param slotId - Animation slot ID for cache isolation
     * @returns Cached or newly created timeline
     */
    getOrCreateTimeline(
        properties: AnimationProperty[],
        factory: () => MasterTimeline,
        slotId?: string
    ): MasterTimeline {
        const startTime = performance.now();
        
        // Generate cache key from property signature and slot ID
        const signature = this.generatePropertySignature(properties, slotId);
        
        // Check cache first
        const cached = this.cache.get(signature);
        if (cached && this.isValidCacheEntry(cached)) {
            // Cache hit - update access time and return
            cached.lastAccessed = Date.now();
            this.metrics.hits++;
            this.metrics.totalLookups++;
            
            const lookupTime = performance.now() - startTime;
            this.updateAverageLookupTime(lookupTime);
            
            console.log(`🎬 [TimelineCache] ✅ Cache HIT for signature: ${signature.substring(0, 16)}...`);
            return cached.timeline;
        }
        
        // Cache miss - create new timeline
        this.metrics.misses++;
        this.metrics.totalLookups++;
        
        console.log(`🎬 [TimelineCache] ❌ Cache MISS for signature: ${signature.substring(0, 16)}... Creating new timeline`);
        
        const timeline = factory();
        
        // Store in cache
        this.storeInCache(signature, timeline);
        
        const lookupTime = performance.now() - startTime;
        this.updateAverageLookupTime(lookupTime);
        
        return timeline;
    }
    
    /**
     * Generate property signature for cache key
     * 
     * @description
     * Creates a deterministic hash from property configurations and slot ID
     * that uniquely identifies a timeline configuration per animation slot.
     */
    private generatePropertySignature(properties: AnimationProperty[], slotId?: string): string {
        // Sort properties by name for consistent hashing
        const sortedProps = [...properties].sort((a, b) => a.property.localeCompare(b.property));
        
        // Create signature from key property attributes
        const signatureData = sortedProps.map(prop => ({
            property: prop.property,
            from: prop.from,
            to: prop.to,
            duration: prop.duration,
            delay: prop.delay,
            easing: prop.easing,
            unit: prop.unit,
            // Include distributed property signatures
            distributedFrom: prop.distributedFromValues ? prop.distributedFromValues.join(',') : '',
            distributedTo: prop.distributedToValues ? prop.distributedToValues.join(',') : ''
        }));
        
        // Include slot ID in signature for proper isolation
        const signatureWithSlot = {
            slotId: slotId || 'global',
            properties: signatureData
        };
        
        // Generate hash from signature data
        const signatureString = JSON.stringify(signatureWithSlot);
        return this.simpleHash(signatureString);
    }
    
    /**
     * Simple hash function for signature generation
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    /**
     * Check if cache entry is still valid
     */
    private isValidCacheEntry(entry: TimelineCacheEntry): boolean {
        const now = Date.now();
        const age = now - entry.createdAt;
        return age < this.config.ttlMs;
    }
    
    /**
     * Store timeline in cache with LRU eviction
     */
    private storeInCache(signature: string, timeline: MasterTimeline): void {
        const now = Date.now();
        
        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxCacheSize) {
            this.evictLRUEntries();
        }
        
        // Store new entry
        this.cache.set(signature, {
            timeline,
            signature,
            lastAccessed: now,
            createdAt: now
        });
        
        console.log(`🎬 [TimelineCache] Stored timeline with signature: ${signature.substring(0, 16)}... (${this.cache.size}/${this.config.maxCacheSize})`);
    }
    
    /**
     * Evict least recently used entries
     */
    private evictLRUEntries(): void {
        const entries = Array.from(this.cache.entries());
        
        // Sort by last accessed time (oldest first)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // Remove oldest 25% of entries
        const toRemove = Math.max(1, Math.floor(entries.length * 0.25));
        
        for (let i = 0; i < toRemove; i++) {
            const [signature] = entries[i];
            this.cache.delete(signature);
            this.metrics.evictions++;
        }
        
        console.log(`🎬 [TimelineCache] Evicted ${toRemove} LRU entries`);
    }
    
    /**
     * Update average lookup time metric
     */
    private updateAverageLookupTime(lookupTime: number): void {
        if (!this.config.enableTracking) return;
        
        const alpha = 0.1; // Exponential moving average factor
        this.metrics.averageLookupTime = this.metrics.averageLookupTime * (1 - alpha) + lookupTime * alpha;
    }
    
    /**
     * Clear cache (useful for testing or memory cleanup)
     */
    clear(): void {
        this.cache.clear();
        console.log('🎬 [TimelineCache] Cache cleared');
    }
    
    /**
     * Get cache performance metrics
     */
    getMetrics(): CacheMetrics & { cacheSize: number; hitRate: number } {
        const hitRate = this.metrics.totalLookups > 0 
            ? this.metrics.hits / this.metrics.totalLookups 
            : 0;
            
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            hitRate: Math.round(hitRate * 100) / 100
        };
    }
    
    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics(): void {
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalLookups: 0,
            averageLookupTime: 0
        };
    }
}

/**
 * Singleton instance getter
 */
export const timelineCache = TimelineCache.getInstance(); 