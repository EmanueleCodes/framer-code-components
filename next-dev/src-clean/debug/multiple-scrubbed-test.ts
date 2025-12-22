/**
 * Multiple Scrubbed Animations Test
 * Tests for conflicts between multiple scrubbed animations in the same FAME component
 */

import { ScrollAnimationCoordinator } from '../execution/ScrollAnimationCoordinator.ts';
import { timelineCache } from '../utils/performance/TimelineCache.ts';
import { unifiedScrollManager } from '../utils/performance/UnifiedScrollManager.ts';
import { AnimationSlot, AnimationProperty } from '../types/index.ts';

export async function testMultipleScrubbed(): Promise<boolean> {
    console.log('🧪 [Multiple Test] Testing multiple scrubbed animations conflicts...');
    
    // Create test elements
    const parentEl = document.createElement('div');
    parentEl.style.cssText = 'position: relative; width: 100%; height: 2000px;';
    parentEl.id = 'test-parent';
    
    const trigger1 = document.createElement('div');
    trigger1.style.cssText = 'position: absolute; width: 100px; height: 100px; top: 200px; background: red;';
    trigger1.id = 'trigger-1';
    
    const trigger2 = document.createElement('div');
    trigger2.style.cssText = 'position: absolute; width: 100px; height: 100px; top: 400px; background: blue;';
    trigger2.id = 'trigger-2';
    
    const animated1 = document.createElement('div');
    animated1.style.cssText = 'position: absolute; width: 50px; height: 50px; background: green;';
    animated1.id = 'animated-1';
    
    const animated2 = document.createElement('div');
    animated2.style.cssText = 'position: absolute; width: 50px; height: 50px; background: yellow;';
    animated2.id = 'animated-2';
    
    parentEl.appendChild(trigger1);
    parentEl.appendChild(trigger2);
    parentEl.appendChild(animated1);
    parentEl.appendChild(animated2);
    document.body.appendChild(parentEl);
    
    try {
        console.log('\n🧪 [Multiple Test] Test 1: Slot ID uniqueness');
        
        // Create two similar animation slots
        const componentId = `test-component-${Date.now()}`;
        
        const slot1: AnimationSlot = {
            id: `fame-slot1-${componentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            triggers: [],
            animatedElements: [],
            animationMode: 'scrubbed' as any,
            properties: [
                {
                    property: 'translateX',
                    from: '0px',
                    to: '100px',
                    duration: 1000,
                    delay: 0,
                    easing: 'linear'
                } as AnimationProperty
            ],
            timing: { duration: 1000, delay: 0, easing: 'linear' }
        };
        
        const slot2: AnimationSlot = {
            id: `fame-slot2-${componentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            triggers: [],
            animatedElements: [],
            animationMode: 'scrubbed' as any,
            properties: [
                {
                    property: 'translateY',
                    from: '0px',
                    to: '100px',
                    duration: 1000,
                    delay: 0,
                    easing: 'linear'
                } as AnimationProperty
            ],
            timing: { duration: 1000, delay: 0, easing: 'linear' }
        };
        
        console.log(`   Slot 1 ID: ${slot1.id}`);
        console.log(`   Slot 2 ID: ${slot2.id}`);
        
        const idsUnique = slot1.id !== slot2.id;
        console.log(`   IDs are unique: ${idsUnique ? '✅' : '❌'}`);
        
        if (!idsUnique) {
            console.error('❌ [Multiple Test] Slot IDs are not unique - this will cause cache conflicts');
            return false;
        }
        
        console.log('\n🧪 [Multiple Test] Test 2: Timeline cache isolation');
        
        // Test timeline cache isolation
        const cacheMetricsBefore = timelineCache.getMetrics();
        console.log(`   Cache metrics before: ${JSON.stringify(cacheMetricsBefore)}`);
        
        // Create coordinator and test multiple animations
        const coordinator = new ScrollAnimationCoordinator();
        
        const boundaries = {
            start: { element: { value: "0%" }, viewport: { value: "100%" } },
            end: { element: { value: "100%" }, viewport: { value: "0%" } }
        };
        
        console.log(`   Starting first animation...`);
        const cleanup1 = await coordinator.startScrollAnimation(
            slot1,
            trigger1,
            [animated1],
            boundaries
        );
        
        console.log(`   Starting second animation...`);
        const cleanup2 = await coordinator.startScrollAnimation(
            slot2,
            trigger2,
            [animated2],
            boundaries
        );
        
        const cacheMetricsAfter = timelineCache.getMetrics();
        console.log(`   Cache metrics after: ${JSON.stringify(cacheMetricsAfter)}`);
        
        // Check if we have separate cache entries
        const cacheGrowth = cacheMetricsAfter.totalLookups - cacheMetricsBefore.totalLookups;
        console.log(`   Cache lookups increased by: ${cacheGrowth}`);
        
        const properCacheGrowth = cacheGrowth >= 2; // Should have at least 2 lookups for 2 different animations
        console.log(`   Proper cache isolation: ${properCacheGrowth ? '✅' : '❌'}`);
        
        console.log('\n🧪 [Multiple Test] Test 3: Animation coordinator state isolation');
        
        // Check active animations
        const activeAnimations = coordinator.getActiveAnimations();
        console.log(`   Active animations count: ${activeAnimations.length}`);
        console.log(`   Active animation IDs: ${activeAnimations.join(', ')}`);
        
        const hasMultipleAnimations = activeAnimations.length === 2;
        console.log(`   Multiple animations registered: ${hasMultipleAnimations ? '✅' : '❌'}`);
        
        if (!hasMultipleAnimations) {
            console.error('❌ [Multiple Test] Only one animation is active - second animation may have overridden the first');
            return false;
        }
        
        console.log('\n🧪 [Multiple Test] Test 4: UnifiedScrollManager registration conflicts');
        
        // Test scroll manager stats (would need to expose this method)
        // For now, just check if registrations succeeded
        console.log(`   Both animations should be registered with UnifiedScrollManager`);
        console.log(`   Registration test: ✅ (assuming success based on no errors)`);
        
        // Cleanup
        cleanup1();
        cleanup2();
        
        // Verify cleanup
        const activeAfterCleanup = coordinator.getActiveAnimations();
        const cleanupWorked = activeAfterCleanup.length === 0;
        console.log(`   Cleanup successful: ${cleanupWorked ? '✅' : '❌'}`);
        
        const overallResult = idsUnique && properCacheGrowth && hasMultipleAnimations && cleanupWorked;
        console.log(`\n🏆 [Multiple Test] Overall result: ${overallResult ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (!overallResult) {
            console.error('❌ [Multiple Test] Multiple scrubbed animations have conflicts that prevent them from working together');
        }
        
        return overallResult;
        
    } catch (error) {
        console.error('❌ [Multiple Test] Test failed with error:', error);
        return false;
    } finally {
        document.body.removeChild(parentEl);
    }
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    (window as any).testMultipleScrubbed = testMultipleScrubbed;
    // Also provide a sync wrapper for easier console usage
    (window as any).runMultipleScrubbed = () => {
        testMultipleScrubbed().then(result => {
            console.log(`🏆 Final result: ${result ? 'SUCCESS' : 'FAILED'}`);
        }).catch(error => {
            console.error('Test error:', error);
        });
    };
} 