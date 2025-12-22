/**
 * Multiple Scrubbed Animation Debug Utilities
 * Comprehensive debugging tools for diagnosing multiple scrubbed animation conflicts
 */

import { timelineCache } from '../utils/performance/TimelineCache.ts';
import { unifiedScrollManager } from '../utils/performance/UnifiedScrollManager.ts';

export interface MultipleAnimationDiagnostic {
    totalAnimations: number;
    cacheMetrics: any;
    scrollManagerStats: any;
    conflicts: string[];
    recommendations: string[];
}

/**
 * Comprehensive diagnostic for multiple scrubbed animation issues
 */
export function diagnoseMultipleScrubbed(): MultipleAnimationDiagnostic {
    console.log('🔍 [Multiple Debug] Running comprehensive diagnostic...');
    
    const conflicts: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Check Timeline Cache
    console.log('\n📊 [Multiple Debug] Timeline Cache Analysis:');
    const cacheMetrics = timelineCache.getMetrics();
    console.log('   Cache metrics:', cacheMetrics);
    
    if (cacheMetrics.hits < cacheMetrics.misses) {
        conflicts.push('Low cache hit rate - possible slot ID conflicts causing cache misses');
        recommendations.push('Check slot ID uniqueness and timeline cache isolation');
    }
    
    // 2. Check for DOM element ID conflicts
    console.log('\n🏷️ [Multiple Debug] DOM Element ID Analysis:');
    const allElements = document.querySelectorAll('[data-fame-element-id], [id^="fame-"]');
    const elementIds = Array.from(allElements).map(el => 
        el.getAttribute('data-fame-element-id') || el.id
    );
    const duplicateIds = elementIds.filter((id, index, arr) => 
        arr.indexOf(id) !== index && id !== null && id !== ''
    );
    
    console.log(`   Total FAME elements: ${allElements.length}`);
    console.log(`   Duplicate element IDs: ${duplicateIds.length}`);
    
    if (duplicateIds.length > 0) {
        conflicts.push(`Found ${duplicateIds.length} duplicate element IDs: ${duplicateIds.join(', ')}`);
        recommendations.push('Ensure all animated elements have unique IDs');
    }
    
    // 3. Check for competing scroll listeners
    console.log('\n👂 [Multiple Debug] Scroll Listener Analysis:');
    
    // Try to access scroll manager internals (if available)
    let scrollManagerStats = null;
    try {
        // Check if we can access animation count
        if ((unifiedScrollManager as any).animations) {
            const animationCount = (unifiedScrollManager as any).animations.size;
            scrollManagerStats = { registeredAnimations: animationCount };
            console.log(`   Registered animations: ${animationCount}`);
            
            if (animationCount > 10) {
                conflicts.push(`High number of scroll animations registered: ${animationCount}`);
                recommendations.push('Consider reducing the number of simultaneous scroll animations');
            }
        }
    } catch (error) {
        console.warn('   Could not access scroll manager internals');
    }
    
    // 4. Check for global state pollution
    console.log('\n🌐 [Multiple Debug] Global State Analysis:');
    
    // Check for multiple FAME components
    const fameComponents = document.querySelectorAll('[class*="fame-component"], [id*="fame-component"]');
    console.log(`   FAME components found: ${fameComponents.length}`);
    
    if (fameComponents.length > 1) {
        recommendations.push('Multiple FAME components detected - ensure proper component isolation');
    }
    
    // 5. Check for memory leaks
    console.log('\n💾 [Multiple Debug] Memory Analysis:');
    
    // Check for unreferenced elements
    const allFameElements = document.querySelectorAll('[data-fame-element-id]');
    const referencedIds = new Set<string>();
    
    // This is a simplified check - in reality, we'd need access to the coordinators
    allFameElements.forEach(el => {
        const id = el.getAttribute('data-fame-element-id');
        if (id) referencedIds.add(id);
    });
    
    console.log(`   FAME elements in DOM: ${allFameElements.length}`);
    console.log(`   Referenced element IDs: ${referencedIds.size}`);
    
    // 6. Generate overall assessment
    console.log('\n🏆 [Multiple Debug] Overall Assessment:');
    
    const totalAnimations = (scrollManagerStats?.registeredAnimations || 0);
    
    if (conflicts.length === 0) {
        console.log('   ✅ No conflicts detected');
    } else {
        console.log(`   ❌ ${conflicts.length} conflicts detected:`);
        conflicts.forEach(conflict => console.log(`     - ${conflict}`));
    }
    
    if (recommendations.length > 0) {
        console.log(`   💡 ${recommendations.length} recommendations:`);
        recommendations.forEach(rec => console.log(`     - ${rec}`));
    }
    
    return {
        totalAnimations,
        cacheMetrics,
        scrollManagerStats,
        conflicts,
        recommendations
    };
}

/**
 * Quick health check for multiple scrubbed animations
 */
export function quickMultipleScrubbed(): boolean {
    console.log('⚡ [Multiple Debug] Quick health check...');
    
    const diagnostic = diagnoseMultipleScrubbed();
    const isHealthy = diagnostic.conflicts.length === 0;
    
    console.log(`⚡ [Multiple Debug] System health: ${isHealthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
    
    return isHealthy;
}

/**
 * Monitor multiple scrubbed animations over time
 */
export function monitorMultipleScrubbed(durationMs: number = 10000): void {
    console.log(`📈 [Multiple Debug] Monitoring for ${durationMs}ms...`);
    
    const startMetrics = timelineCache.getMetrics();
    let lastAnimationCount = 0;
    
    const monitor = () => {
        const currentMetrics = timelineCache.getMetrics();
        const currentAnimationCount = (unifiedScrollManager as any).animations?.size || 0;
        
        if (currentAnimationCount !== lastAnimationCount) {
            console.log(`📈 [Multiple Debug] Animation count changed: ${lastAnimationCount} → ${currentAnimationCount}`);
            lastAnimationCount = currentAnimationCount;
        }
        
        const cacheActivity = currentMetrics.totalLookups - startMetrics.totalLookups;
        if (cacheActivity > 0) {
            console.log(`📈 [Multiple Debug] Cache activity: ${cacheActivity} lookups since start`);
        }
    };
    
    const interval = setInterval(monitor, 1000);
    
    setTimeout(() => {
        clearInterval(interval);
        console.log(`📈 [Multiple Debug] Monitoring complete`);
        diagnoseMultipleScrubbed();
    }, durationMs);
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    (window as any).diagnoseMultipleScrubbed = diagnoseMultipleScrubbed;
    (window as any).quickMultipleScrubbed = quickMultipleScrubbed;
    (window as any).monitorMultipleScrubbed = monitorMultipleScrubbed;
} 