/**
 * @file ScrollPerformanceMonitor.ts
 * @description Performance monitoring and debugging tools for scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Comprehensive performance monitoring system for scroll animations.
 * Tracks frame rates, timing metrics, memory usage, and provides debugging tools.
 * 
 * @performance
 * - Real-time frame rate monitoring
 * - Timeline creation and property interpolation metrics
 * - Memory usage tracking
 * - Performance regression detection
 * - Export capabilities for analysis
 * 
 * @example
 * ```typescript
 * const monitor = ScrollPerformanceMonitor.getInstance();
 * 
 * // Start monitoring
 * monitor.startMonitoring();
 * 
 * // Get real-time metrics
 * const metrics = monitor.getCurrentMetrics();
 * console.log(`FPS: ${metrics.averageFPS}, Frame Time: ${metrics.averageFrameTime}ms`);
 * 
 * // Export performance data
 * const report = monitor.generateReport();
 * ```
 */

import { timelineCache } from './TimelineCache.ts';
import { propertyValueCache } from './PropertyValueCache.ts';
import { scrollEventManager } from './ScrollEventManager.ts';
import { EnvironmentDetector } from '../environment/EnvironmentDetector.ts';

/**
 * Performance metrics snapshot
 */
interface PerformanceSnapshot {
    timestamp: number;
    fps: number;
    frameTime: number;
    memoryUsage?: number;
    timelineCacheHitRate: number;
    propertyCacheHitRate: number;
    activeScrollListeners: number;
    totalScrollEvents: number;
}

/**
 * Performance monitoring configuration
 */
interface MonitorConfig {
    /** Sample rate for FPS monitoring (ms) */
    sampleRate: number;
    /** Maximum snapshots to keep in memory */
    maxSnapshots: number;
    /** Enable memory usage tracking */
    enableMemoryTracking: boolean;
    /** FPS threshold for performance warnings */
    fpsWarningThreshold: number;
    /** Frame time threshold for performance warnings (ms) */
    frameTimeWarningThreshold: number;
}

/**
 * Aggregated performance metrics
 */
interface PerformanceMetrics {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    averageFrameTime: number;
    maxFrameTime: number;
    frameDrops: number;
    timelineCacheEfficiency: number;
    propertyCacheEfficiency: number;
    scrollEventLoad: number;
    memoryTrend: 'stable' | 'increasing' | 'decreasing' | 'unknown';
}

/**
 * Performance report for export
 */
interface PerformanceReport {
    generatedAt: number;
    monitoringDuration: number;
    totalSamples: number;
    metrics: PerformanceMetrics;
    snapshots: PerformanceSnapshot[];
    warnings: string[];
    recommendations: string[];
}

/**
 * Scroll animation performance monitor
 * 
 * @description
 * Singleton monitor that tracks performance metrics for scroll animations
 * and provides debugging tools for optimization.
 */
export class ScrollPerformanceMonitor {
    private static instance: ScrollPerformanceMonitor | null = null;
    
    private config: MonitorConfig;
    private snapshots: PerformanceSnapshot[] = [];
    private isMonitoring = false;
    private monitoringStartTime = 0;
    
    // Frame tracking
    private frameCount = 0;
    private lastFrameTime = 0;
    private fpsCalculationInterval: number | null = null;
    private currentFPS = 0;
    
    // Performance tracking
    private rafId: number | null = null;
    private lastSampleTime = 0;
    private isCanvasMode: boolean;
    
    private constructor(config: Partial<MonitorConfig> = {}) {
        this.config = {
            sampleRate: 1000, // Sample every second
            maxSnapshots: 300, // 5 minutes at 1 sample/second
            enableMemoryTracking: true,
            fpsWarningThreshold: 50, // Warn if FPS drops below 50
            frameTimeWarningThreshold: 20, // Warn if frame time > 20ms
            ...config
        };
        
        this.isCanvasMode = EnvironmentDetector.isCanvas();
        
        console.log('📊 [ScrollPerformanceMonitor] Initialized with config:', this.config);
        
        if (this.isCanvasMode) {
            console.log('🎨 [ScrollPerformanceMonitor] Canvas mode detected - monitoring disabled');
        }
    }
    
    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<MonitorConfig>): ScrollPerformanceMonitor {
        if (!ScrollPerformanceMonitor.instance) {
            ScrollPerformanceMonitor.instance = new ScrollPerformanceMonitor(config);
        }
        return ScrollPerformanceMonitor.instance;
    }
    
    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        if (this.isMonitoring || this.isCanvasMode) {
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringStartTime = performance.now();
        this.snapshots = [];
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        // Start FPS tracking
        this.startFPSTracking();
        
        // Start sampling
        this.startSampling();
        
        console.log('📊 [ScrollPerformanceMonitor] Performance monitoring started');
    }
    
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        
        // Clean up tracking
        if (this.fpsCalculationInterval) {
            clearInterval(this.fpsCalculationInterval);
            this.fpsCalculationInterval = null;
        }
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        console.log('📊 [ScrollPerformanceMonitor] Performance monitoring stopped');
    }
    
    /**
     * Start FPS tracking using requestAnimationFrame
     */
    private startFPSTracking(): void {
        const trackFrame = () => {
            if (!this.isMonitoring) return;
            
            const now = performance.now();
            this.frameCount++;
            this.lastFrameTime = now;
            
            this.rafId = requestAnimationFrame(trackFrame);
        };
        
        // Calculate FPS every second
        this.fpsCalculationInterval = window.setInterval(() => {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
        }, 1000);
        
        trackFrame();
    }
    
    /**
     * Start performance sampling
     */
    private startSampling(): void {
        const sample = () => {
            if (!this.isMonitoring) return;
            
            const now = performance.now();
            
            // Check if it's time for a new sample
            if (now - this.lastSampleTime >= this.config.sampleRate) {
                this.takeSample();
                this.lastSampleTime = now;
            }
            
            // Schedule next sampling check
            setTimeout(sample, Math.min(this.config.sampleRate / 4, 250));
        };
        
        sample();
    }
    
    /**
     * Take a performance snapshot
     */
    private takeSample(): void {
        const timestamp = performance.now();
        
        // Get cache metrics
        const timelineCacheMetrics = timelineCache.getMetrics();
        const propertyCacheMetrics = propertyValueCache.getMetrics();
        const scrollEventMetrics = scrollEventManager.getMetrics();
        
        // Calculate frame time from current FPS
        const frameTime = this.currentFPS > 0 ? 1000 / this.currentFPS : 0;
        
        // Get memory usage if available
        let memoryUsage: number | undefined;
        if (this.config.enableMemoryTracking && 'memory' in performance) {
            memoryUsage = (performance as any).memory?.usedJSHeapSize || undefined;
        }
        
        const snapshot: PerformanceSnapshot = {
            timestamp,
            fps: this.currentFPS,
            frameTime,
            memoryUsage,
            timelineCacheHitRate: timelineCacheMetrics.hitRate,
            propertyCacheHitRate: propertyCacheMetrics.hitRate,
            activeScrollListeners: scrollEventMetrics.activeSubscriptions,
            totalScrollEvents: scrollEventMetrics.totalEvents
        };
        
        this.snapshots.push(snapshot);
        
        // Trim snapshots if we exceed the limit
        if (this.snapshots.length > this.config.maxSnapshots) {
            this.snapshots.shift();
        }
        
        // Check for performance warnings
        this.checkPerformanceWarnings(snapshot);
    }
    
    /**
     * Check for performance issues and log warnings
     */
    private checkPerformanceWarnings(snapshot: PerformanceSnapshot): void {
        // FPS warning
        if (snapshot.fps < this.config.fpsWarningThreshold) {
            console.warn(`📊 [ScrollPerformanceMonitor] ⚠️ Low FPS detected: ${snapshot.fps.toFixed(1)} (threshold: ${this.config.fpsWarningThreshold})`);
        }
        
        // Frame time warning
        if (snapshot.frameTime > this.config.frameTimeWarningThreshold) {
            console.warn(`📊 [ScrollPerformanceMonitor] ⚠️ High frame time: ${snapshot.frameTime.toFixed(1)}ms (threshold: ${this.config.frameTimeWarningThreshold}ms)`);
        }
        
        // Cache efficiency warnings
        if (snapshot.timelineCacheHitRate < 0.8) {
            console.warn(`📊 [ScrollPerformanceMonitor] ⚠️ Low timeline cache hit rate: ${(snapshot.timelineCacheHitRate * 100).toFixed(1)}%`);
        }
        
        if (snapshot.propertyCacheHitRate < 0.7) {
            console.warn(`📊 [ScrollPerformanceMonitor] ⚠️ Low property cache hit rate: ${(snapshot.propertyCacheHitRate * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * Get current performance metrics
     */
    getCurrentMetrics(): PerformanceMetrics {
        if (this.snapshots.length === 0) {
            return {
                averageFPS: 0,
                minFPS: 0,
                maxFPS: 0,
                averageFrameTime: 0,
                maxFrameTime: 0,
                frameDrops: 0,
                timelineCacheEfficiency: 0,
                propertyCacheEfficiency: 0,
                scrollEventLoad: 0,
                memoryTrend: 'unknown'
            };
        }
        
        const fps = this.snapshots.map(s => s.fps);
        const frameTimes = this.snapshots.map(s => s.frameTime);
        const timelineCacheRates = this.snapshots.map(s => s.timelineCacheHitRate);
        const propertyCacheRates = this.snapshots.map(s => s.propertyCacheHitRate);
        
        return {
            averageFPS: this.average(fps),
            minFPS: Math.min(...fps),
            maxFPS: Math.max(...fps),
            averageFrameTime: this.average(frameTimes),
            maxFrameTime: Math.max(...frameTimes),
            frameDrops: fps.filter(f => f < this.config.fpsWarningThreshold).length,
            timelineCacheEfficiency: this.average(timelineCacheRates),
            propertyCacheEfficiency: this.average(propertyCacheRates),
            scrollEventLoad: this.snapshots[this.snapshots.length - 1]?.activeScrollListeners || 0,
            memoryTrend: this.calculateMemoryTrend()
        };
    }
    
    /**
     * Calculate memory usage trend
     */
    private calculateMemoryTrend(): 'stable' | 'increasing' | 'decreasing' | 'unknown' {
        const memorySnapshots = this.snapshots
            .filter(s => s.memoryUsage !== undefined)
            .map(s => s.memoryUsage!);
        
        if (memorySnapshots.length < 5) {
            return 'unknown';
        }
        
        const recent = memorySnapshots.slice(-5);
        const older = memorySnapshots.slice(-10, -5);
        
        if (older.length === 0) return 'unknown';
        
        const recentAvg = this.average(recent);
        const olderAvg = this.average(older);
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (Math.abs(change) < 0.05) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }
    
    /**
     * Generate comprehensive performance report
     */
    generateReport(): PerformanceReport {
        const metrics = this.getCurrentMetrics();
        const warnings: string[] = [];
        const recommendations: string[] = [];
        
        // Generate warnings based on metrics
        if (metrics.averageFPS < this.config.fpsWarningThreshold) {
            warnings.push(`Low average FPS: ${metrics.averageFPS.toFixed(1)}`);
            recommendations.push('Consider reducing animation complexity or enabling property value caching');
        }
        
        if (metrics.timelineCacheEfficiency < 0.8) {
            warnings.push(`Timeline cache hit rate below 80%: ${(metrics.timelineCacheEfficiency * 100).toFixed(1)}%`);
            recommendations.push('Review timeline creation patterns to improve caching efficiency');
        }
        
        if (metrics.propertyCacheEfficiency < 0.7) {
            warnings.push(`Property cache hit rate below 70%: ${(metrics.propertyCacheEfficiency * 100).toFixed(1)}%`);
            recommendations.push('Increase property cache granularity or reduce cache invalidation');
        }
        
        if (metrics.scrollEventLoad > 10) {
            warnings.push(`High scroll event load: ${metrics.scrollEventLoad} active listeners`);
            recommendations.push('Consider consolidating scroll listeners using ScrollEventManager');
        }
        
        if (metrics.memoryTrend === 'increasing') {
            warnings.push('Memory usage is increasing over time');
            recommendations.push('Check for memory leaks in animation cleanup and cache management');
        }
        
        return {
            generatedAt: Date.now(),
            monitoringDuration: performance.now() - this.monitoringStartTime,
            totalSamples: this.snapshots.length,
            metrics,
            snapshots: [...this.snapshots],
            warnings,
            recommendations
        };
    }
    
    /**
     * Export performance data as JSON
     */
    exportData(): string {
        const report = this.generateReport();
        return JSON.stringify(report, null, 2);
    }
    
    /**
     * Clear all monitoring data
     */
    clearData(): void {
        this.snapshots = [];
        this.frameCount = 0;
        console.log('📊 [ScrollPerformanceMonitor] Monitoring data cleared');
    }
    
    /**
     * Check if currently monitoring
     */
    isCurrentlyMonitoring(): boolean {
        return this.isMonitoring;
    }
    
    /**
     * Calculate average of number array
     */
    private average(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }
}

/**
 * Singleton instance getter
 */
export const scrollPerformanceMonitor = ScrollPerformanceMonitor.getInstance(); 