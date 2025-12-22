/**
 * Cross-Unit Interpolation Marker Test
 * Tests the complete flow from PropertyTimeline to StyleApplicator
 */

import { numberWithUnitInterpolator, PropertyKeyframe } from '../core/timeline/PropertyTimeline.ts';
import { applyProperty } from '../execution/StyleApplicator.ts';

export function testCrossUnitMarkerSystem(): boolean {
    console.log('🧪 [Marker Test] Testing cross-unit interpolation marker system...');
    
    // Create test element
    const testEl = document.createElement('div');
    testEl.style.cssText = 'position: absolute; width: 200px; height: 100px; top: 0; left: 0;';
    document.body.appendChild(testEl);
    
    try {
        // Test 1: Verify PropertyTimeline creates markers for cross-unit scenarios
        console.log('\n🧪 [Marker Test] Test 1: PropertyTimeline marker creation');
        
        const keyframes: PropertyKeyframe[] = [
            { time: 0, value: '100vw', easing: 'linear' },
            { time: 1000, value: '-100%', easing: 'linear' }
        ];
        
        // Test at 50% progress (time = 500)
        const markerResult = numberWithUnitInterpolator.valueAtTime(keyframes, 500);
        console.log(`   Marker result: ${markerResult}`);
        
        const isValidMarker = typeof markerResult === 'string' && 
                            markerResult.startsWith('__CROSS_UNIT_INTERPOLATION__:');
        console.log(`   Valid marker format: ${isValidMarker ? '✅' : '❌'}`);
        
        if (!isValidMarker) {
            console.error('❌ [Marker Test] PropertyTimeline not creating cross-unit markers');
            return false;
        }
        
        // Test 2: Verify StyleApplicator resolves markers correctly
        console.log('\n🧪 [Marker Test] Test 2: StyleApplicator marker resolution');
        
        console.log(`   Applying marker to element: ${markerResult}`);
        applyProperty(testEl, 'translateX', markerResult);
        
        // Check if transform was applied
        const appliedTransform = testEl.style.transform;
        console.log(`   Applied transform: ${appliedTransform}`);
        
        const hasTransform = appliedTransform && appliedTransform.includes('translateX');
        console.log(`   Transform applied: ${hasTransform ? '✅' : '❌'}`);
        
        if (!hasTransform) {
            console.error('❌ [Marker Test] StyleApplicator not resolving cross-unit markers');
            return false;
        }
        
        // Test 3: Verify the resolved value makes sense
        console.log('\n🧪 [Marker Test] Test 3: Resolved value validation');
        
        // Extract translateX value from transform string
        const translateXMatch = appliedTransform.match(/translateX\(([^)]+)\)/);
        if (translateXMatch) {
            const translateXValue = translateXMatch[1];
            console.log(`   Resolved translateX value: ${translateXValue}`);
            
            // Parse the pixel value
            const pixelValue = parseFloat(translateXValue);
            const viewport = window.innerWidth;
            const elementWidth = testEl.offsetWidth;
            
            console.log(`   Expected range: ${-elementWidth}px to ${viewport}px`);
            console.log(`   Actual value: ${pixelValue}px`);
            
            // Should be somewhere between viewport width and negative element width
            const isInRange = pixelValue >= -elementWidth && pixelValue <= viewport;
            console.log(`   Value in expected range: ${isInRange ? '✅' : '❌'}`);
            
            if (!isInRange) {
                console.error('❌ [Marker Test] Resolved value not in expected range');
                return false;
            }
        } else {
            console.error('❌ [Marker Test] Could not extract translateX value from transform');
            return false;
        }
        
        console.log('\n🏆 [Marker Test] All tests passed! Cross-unit marker system working correctly.');
        return true;
        
    } catch (error) {
        console.error('❌ [Marker Test] Test failed with error:', error);
        return false;
    } finally {
        document.body.removeChild(testEl);
    }
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    (window as any).testCrossUnitMarkerSystem = testCrossUnitMarkerSystem;
} 