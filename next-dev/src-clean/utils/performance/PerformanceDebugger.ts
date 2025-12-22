/**
 * @file PerformanceDebugger.ts
 * @description Debug utilities for scroll animation performance and slot isolation
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Comprehensive debugging tools for diagnosing performance issues and slot isolation
 * problems in the FAME animation system. Provides easy-to-use functions for developers.
 * 
 * @example
 * ```typescript
 * import { debugPerformance } from './utils/performance/PerformanceDebugger.ts';
 * 
 * // Debug all performance systems
 * debugPerformance.checkAll();
 * 
 * // Test slot isolation
 * debugPerformance.testSlotIsolation();
 * 
 * // Monitor scroll performance
 * debugPerformance.startMonitoring();
 * ```
 */

import { timelineCache } from './TimelineCache.ts';
import { propertyValueCache } from './PropertyValueCache.ts';
import { scrollEventManager } from './ScrollEventManager.ts';
import { scrollPerformanceMonitor } from './ScrollPerformanceMonitor.ts';
// REMOVED: ScrollCacheManager imports - was causing performance issues
// Slot isolation test functions are defined within this file

/**
 * Debug information structure
 */
interface DebugInfo {
    timestamp: number;
    timelineCache: {
        size: number;
        hitRate: number;
        totalLookups: number;
        averageLookupTime: number;
    };
    propertyCache: {
        size: number;
        hitRate: number;
        totalLookups: number;
        computations: number;
    };
    scrollEvents: {
        activeSubscriptions: number;
        totalEvents: number;
        totalCallbacks: number;
        averageCallbackTime: number;
    };
    performance: {
        isMonitoring: boolean;
        averageFPS?: number;
        averageFrameTime?: number;
        memoryTrend?: string;
    };
}

/**
 * Performance debugging utility class
 */
class PerformanceDebugger {
    private isVerbose = false;
    
    /**
     * Enable verbose logging for debugging
     */
    enableVerbose(): void {
        this.isVerbose = true;
        console.log('🔍 [PerformanceDebugger] Verbose logging enabled');
    }
    
    /**
     * Disable verbose logging
     */
    disableVerbose(): void {
        this.isVerbose = false;
        console.log('🔍 [PerformanceDebugger] Verbose logging disabled');
    }
    
    /**
     * Get comprehensive debug information
     */
    getDebugInfo(): DebugInfo {
        const timelineCacheMetrics = timelineCache.getMetrics();
        const propertyCacheMetrics = propertyValueCache.getMetrics();
        const scrollEventMetrics = scrollEventManager.getMetrics();
        
        const isMonitoring = scrollPerformanceMonitor.isCurrentlyMonitoring();
        const performanceMetrics = isMonitoring ? scrollPerformanceMonitor.getCurrentMetrics() : undefined;
        
        return {
            timestamp: Date.now(),
            timelineCache: {
                size: timelineCacheMetrics.cacheSize,
                hitRate: timelineCacheMetrics.hitRate,
                totalLookups: timelineCacheMetrics.totalLookups,
                averageLookupTime: timelineCacheMetrics.averageLookupTime
            },
            propertyCache: {
                size: propertyCacheMetrics.cacheSize,
                hitRate: propertyCacheMetrics.hitRate,
                totalLookups: propertyCacheMetrics.totalLookups,
                computations: propertyCacheMetrics.computations
            },
            scrollEvents: {
                activeSubscriptions: scrollEventMetrics.activeSubscriptions,
                totalEvents: scrollEventMetrics.totalEvents,
                totalCallbacks: scrollEventMetrics.totalCallbacks,
                averageCallbackTime: scrollEventMetrics.averageCallbackTime
            },
            performance: {
                isMonitoring,
                averageFPS: performanceMetrics?.averageFPS,
                averageFrameTime: performanceMetrics?.averageFrameTime,
                memoryTrend: performanceMetrics?.memoryTrend
            }
        };
    }
    
    /**
     * Print comprehensive debug information
     */
    printDebugInfo(): void {
        const info = this.getDebugInfo();
        
        console.log('🔍 [PerformanceDebugger] Debug Information:');
        console.log('');
        
        console.log('📦 Timeline Cache:');
        console.log(`   Cache Size: ${info.timelineCache.size}`);
        console.log(`   Hit Rate: ${(info.timelineCache.hitRate * 100).toFixed(1)}%`);
        console.log(`   Total Lookups: ${info.timelineCache.totalLookups}`);
        console.log(`   Avg Lookup Time: ${info.timelineCache.averageLookupTime.toFixed(2)}ms`);
        console.log('');
        
        console.log('📋 Property Cache:');
        console.log(`   Cache Size: ${info.propertyCache.size}`);
        console.log(`   Hit Rate: ${(info.propertyCache.hitRate * 100).toFixed(1)}%`);
        console.log(`   Total Lookups: ${info.propertyCache.totalLookups}`);
        console.log(`   Computations: ${info.propertyCache.computations}`);
        console.log('');
        
        console.log('🎛️ Scroll Events:');
        console.log(`   Active Subscriptions: ${info.scrollEvents.activeSubscriptions}`);
        console.log(`   Total Events: ${info.scrollEvents.totalEvents}`);
        console.log(`   Total Callbacks: ${info.scrollEvents.totalCallbacks}`);
        console.log(`   Avg Callback Time: ${info.scrollEvents.averageCallbackTime.toFixed(2)}ms`);
        console.log('');
        
        console.log('📊 Performance Monitoring:');
        console.log(`   Is Monitoring: ${info.performance.isMonitoring}`);
        if (info.performance.isMonitoring) {
            console.log(`   Average FPS: ${info.performance.averageFPS?.toFixed(1) || 'N/A'}`);
            console.log(`   Average Frame Time: ${info.performance.averageFrameTime?.toFixed(1) || 'N/A'}ms`);
            console.log(`   Memory Trend: ${info.performance.memoryTrend || 'unknown'}`);
        }
        console.log('');
    }
    
    /**
     * Test slot isolation to ensure different animation slots don't interfere
     */
    testSlotIsolation(): boolean {
        console.log('🧪 [PerformanceDebugger] Testing slot isolation...');
        console.log('');
        
        const result = this.runSlotIsolationTests();
        
        if (result) {
            console.log('✅ [PerformanceDebugger] Slot isolation is working correctly!');
            console.log('   Different animation slots maintain separate caches.');
        } else {
            console.log('❌ [PerformanceDebugger] Slot isolation issues detected!');
            console.log('   This may cause animations to interfere with each other.');
        }
        
        return result;
    }
    
    /**
     * Check cache efficiency and provide recommendations
     */
    checkCacheEfficiency(): void {
        console.log('📊 [PerformanceDebugger] Checking cache efficiency...');
        
        const timelineMetrics = timelineCache.getMetrics();
        const propertyMetrics = propertyValueCache.getMetrics();
        // REMOVED: ScrollCacheManager metrics - was causing performance issues
        
        console.log('');
        console.log('Timeline Cache Analysis:');
        
        if (timelineMetrics.hitRate < 0.8) {
            console.log('⚠️  Low timeline cache hit rate:', `${(timelineMetrics.hitRate * 100).toFixed(1)}%`);
            console.log('   Recommendation: Check if animation slots have frequently changing properties');
        } else {
            console.log('✅ Good timeline cache hit rate:', `${(timelineMetrics.hitRate * 100).toFixed(1)}%`);
        }
        
        console.log('');
        console.log('Property Cache Analysis:');
        
        if (propertyMetrics.hitRate < 0.7) {
            console.log('⚠️  Low property cache hit rate:', `${(propertyMetrics.hitRate * 100).toFixed(1)}%`);
            console.log('   Recommendation: Consider increasing cache granularity or check for cache invalidation');
        } else {
            console.log('✅ Good property cache hit rate:', `${(propertyMetrics.hitRate * 100).toFixed(1)}%`);
        }
        
        console.log('');
        console.log('📜 Cache System: Simplified for Performance');
        console.log('✅ Using simple time-based cache expiration (30s)');
        console.log('✅ No MutationObserver performance overhead');
        console.log('✅ Minimal logging for production speed');
        console.log('');
    }
    
    /**
     * Start performance monitoring with debug output
     */
    startMonitoring(): void {
        console.log('📊 [PerformanceDebugger] Starting performance monitoring...');
        
        if (scrollPerformanceMonitor.isCurrentlyMonitoring()) {
            console.log('⚠️  Performance monitoring already active');
            return;
        }
        
        scrollPerformanceMonitor.startMonitoring();
        
        // Set up periodic debug output
        const intervalId = setInterval(() => {
            if (!scrollPerformanceMonitor.isCurrentlyMonitoring()) {
                clearInterval(intervalId);
                return;
            }
            
            if (this.isVerbose) {
                const metrics = scrollPerformanceMonitor.getCurrentMetrics();
                console.log('📊 Performance Update:', {
                    fps: metrics.averageFPS.toFixed(1),
                    frameTime: metrics.averageFrameTime.toFixed(1) + 'ms',
                    frameDrops: metrics.frameDrops
                });
            }
        }, 5000); // Every 5 seconds
        
        console.log('✅ Performance monitoring started');
        console.log('   Use debugPerformance.enableVerbose() for real-time updates');
    }
    
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (!scrollPerformanceMonitor.isCurrentlyMonitoring()) {
            console.log('⚠️  Performance monitoring is not active');
            return;
        }
        
        scrollPerformanceMonitor.stopMonitoring();
        console.log('📊 [PerformanceDebugger] Performance monitoring stopped');
    }
    
    /**
     * Generate performance report
     */
    generateReport(): void {
        console.log('📋 [PerformanceDebugger] Generating performance report...');
        
        if (!scrollPerformanceMonitor.isCurrentlyMonitoring()) {
            console.log('⚠️  Performance monitoring is not active. Start monitoring first.');
            return;
        }
        
        const report = scrollPerformanceMonitor.generateReport();
        
        console.log('');
        console.log('📋 Performance Report Summary:');
        console.log(`   Monitoring Duration: ${(report.monitoringDuration / 1000).toFixed(1)}s`);
        console.log(`   Total Samples: ${report.totalSamples}`);
        console.log(`   Average FPS: ${report.metrics.averageFPS.toFixed(1)}`);
        console.log(`   Min FPS: ${report.metrics.minFPS.toFixed(1)}`);
        console.log(`   Frame Drops: ${report.metrics.frameDrops}`);
        console.log(`   Memory Trend: ${report.metrics.memoryTrend}`);
        
        if (report.warnings.length > 0) {
            console.log('');
            console.log('⚠️  Warnings:');
            report.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }
        
        if (report.recommendations.length > 0) {
            console.log('');
            console.log('💡 Recommendations:');
            report.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log('');
        console.log('📤 Full report available via scrollPerformanceMonitor.exportData()');
    }
    
    /**
     * Check all systems and provide comprehensive analysis
     */
    checkAll(): void {
        console.log('🔍 [PerformanceDebugger] Comprehensive System Check');
        console.log(''.padEnd(50, '='));
        console.log('');
        
        // Print debug info
        this.printDebugInfo();
        
        // Test slot isolation
        this.testSlotIsolation();
        console.log('');
        
        // Check cache efficiency
        this.checkCacheEfficiency();
        
        // Performance monitoring status
        console.log('Performance Monitoring Status:');
        if (scrollPerformanceMonitor.isCurrentlyMonitoring()) {
            console.log('✅ Performance monitoring is active');
            this.generateReport();
        } else {
            console.log('⚠️  Performance monitoring is not active');
            console.log('   Use debugPerformance.startMonitoring() to begin monitoring');
        }
        
        console.log('');
        console.log('🎯 System Check Complete');
        console.log(''.padEnd(50, '='));
    }
    
    /**
     * Clear all caches (useful for testing)
     */
    clearAllCaches(): void {
        console.log('🧹 [PerformanceDebugger] Clearing all caches...');
        
        timelineCache.clear();
        propertyValueCache.clear();
        
        console.log('✅ All caches cleared');
    }
    
    /**
     * Reset all metrics (useful for testing)
     */
    resetAllMetrics(): void {
        console.log('🔄 [PerformanceDebugger] Resetting all metrics...');
        
        timelineCache.resetMetrics();
        propertyValueCache.resetMetrics();
        scrollEventManager.resetMetrics();
        
        console.log('✅ All metrics reset');
    }

    /**
     * Run slot isolation tests
     */
    private runSlotIsolationTests(): boolean {
        const test1 = this.testTimelineCacheIsolation();
        const test2 = this.testPropertyCacheIsolation();
        const test3 = this.testCacheKeyGeneration();
        
        const allPassed = test1 && test2 && test3;
        console.log(`🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        return allPassed;
    }

    /**
     * Test timeline cache slot isolation
     */
    private testTimelineCacheIsolation(): boolean {
        console.log('🧪 Testing Timeline Cache Slot Isolation...');
        
        // Create identical properties for two different slots
        const properties = [
            {
                property: 'translateX',
                from: '0px',
                to: '100px',
                duration: 1000,
                delay: 0,
                easing: 'ease'
            }
        ] as any[];
        
        // Create timeline for slot 1
        const timeline1 = timelineCache.getOrCreateTimeline(
            properties,
            () => ({
                propertyTimelines: [],
                totalDuration: 1000,
                metadata: { createdAt: Date.now(), propertyTypes: ['translateX'] }
            } as any),
            'test-slot-1'
        );
        
        // Create timeline for slot 2 (should be different instance)
        const timeline2 = timelineCache.getOrCreateTimeline(
            properties,
            () => ({
                propertyTimelines: [],
                totalDuration: 1000,
                metadata: { createdAt: Date.now(), propertyTypes: ['translateX'] }
            } as any),
            'test-slot-2'
        );
        
        // Verify they are different instances
        const areDifferent = timeline1 !== timeline2;
        console.log(`   Timeline isolation: ${areDifferent ? 'PASSED' : 'FAILED'}`);
        
        return areDifferent;
    }

    /**
     * Test property value cache slot isolation  
     */
    private testPropertyCacheIsolation(): boolean {
        console.log('🧪 Testing Property Cache Slot Isolation...');
        
        // Mock scroll timeline
        const mockScrollTimeline = {
            propertyTimelines: [],
            originalTimeline: { propertyTimelines: [], totalDuration: 1000 },
            mappingConfig: { mode: 'compress_to_scroll' as const, preserveRelativeTiming: true }
        };
        
        const initialCacheSize = propertyValueCache.getMetrics().cacheSize;
        
        // Pre-compute for different slots
        propertyValueCache.preComputeForElements(mockScrollTimeline, 2, 'test-slot-a');
        propertyValueCache.preComputeForElements(mockScrollTimeline, 2, 'test-slot-b');
        
        // Check if cache grew appropriately
        const finalCacheSize = propertyValueCache.getMetrics().cacheSize;
        const cacheGrew = finalCacheSize > initialCacheSize;
        
        console.log(`   Property isolation: ${cacheGrew ? 'PASSED' : 'FAILED'}`);
        console.log(`   Cache size: ${initialCacheSize} → ${finalCacheSize}`);
        
        return cacheGrew;
    }

    /**
     * Test cache key generation for different slots
     */
    private testCacheKeyGeneration(): boolean {
        console.log('🧪 Testing Cache Key Generation...');
        
        const properties = [
            {
                property: 'opacity',
                from: '0',
                to: '1',
                duration: 500,
                delay: 0,
                easing: 'linear'
            }
        ] as any[];
        
        // Get timelines for same properties but different slots
        const timelineA = timelineCache.getOrCreateTimeline(properties, () => ({
            propertyTimelines: [],
            totalDuration: 500,
            metadata: { createdAt: Date.now(), propertyTypes: ['opacity'] }
        } as any), 'test-key-a');
        
        const timelineB = timelineCache.getOrCreateTimeline(properties, () => ({
            propertyTimelines: [],
            totalDuration: 500,
            metadata: { createdAt: Date.now(), propertyTypes: ['opacity'] }
        } as any), 'test-key-b');
        
        // Should create different cache entries
        const keyGenerationWorks = timelineA !== timelineB;
        
        console.log(`   Cache key generation: ${keyGenerationWorks ? 'PASSED' : 'FAILED'}`);
        
        return keyGenerationWorks;
    }
}

/**
 * Singleton debug utility instance
 */
export const debugPerformance = new PerformanceDebugger();

/**
 * Quick debug function for console access
 */
export function debugScrollPerformance(): void {
    debugPerformance.checkAll();
}

/**
 * Add debug functions to global scope for easy console access
 */
declare global {
    interface Window {
        debugFAME: {
            performance: typeof debugPerformance;
            quickCheck: typeof debugScrollPerformance;
        };
    }
}

// Add to global scope in browser environments
if (typeof window !== 'undefined') {
    window.debugFAME = {
        performance: debugPerformance,
        quickCheck: debugScrollPerformance,
        // REMOVED: Scroll cache debugging - was causing performance issues
    };
    
    console.log('🔍 [PerformanceDebugger] Debug utilities available:');
    console.log('   window.debugFAME.performance.checkAll() - Comprehensive check');
    console.log('   window.debugFAME.quickCheck() - Quick performance check');
    // REMOVED: Scroll cache debug commands
} 