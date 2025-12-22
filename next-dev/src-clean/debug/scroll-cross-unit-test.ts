/**
 * Scroll Trigger Cross-Unit Animation Test
 * Tests the complete flow from scroll triggers to cross-unit property application
 */

import { DirectScrollApplicator } from '../execution/DirectScrollApplicator.ts';
import { ScrollAnimationCoordinator } from '../execution/ScrollAnimationCoordinator.ts';
import { AnimationSlot, AnimationProperty, TriggerElement, EventType } from '../types/index.ts';

export function testScrollCrossUnitAnimations(): boolean {
    console.log('🧪 [Scroll Test] Testing scroll trigger cross-unit animations...');
    
    // Create test elements
    const triggerEl = document.createElement('div');
    triggerEl.style.cssText = 'position: absolute; width: 100px; height: 100px; top: 500px; left: 0;';
    triggerEl.id = 'scroll-trigger-test';
    
    const animatedEl = document.createElement('div');
    animatedEl.style.cssText = 'position: absolute; width: 200px; height: 100px; top: 0; left: 0; background: red;';
    animatedEl.id = 'animated-element-test';
    
    document.body.appendChild(triggerEl);
    document.body.appendChild(animatedEl);
    
    try {
        console.log('\n🧪 [Scroll Test] Test 1: DirectScrollApplicator cross-unit marker handling');
        
        // Test 1: DirectScrollApplicator should route cross-unit markers to StyleApplicator
        const directApplicator = new DirectScrollApplicator();
        
        // Create property batch with cross-unit interpolation marker
        const crossUnitMarker = '__CROSS_UNIT_INTERPOLATION__:100vw:-100%:0.5';
        const propertyMap = new Map([
            ['translateX', crossUnitMarker],
            ['opacity', '0.5']
        ]);
        
        console.log(`   Testing marker: ${crossUnitMarker}`);
        
        // Apply properties
        directApplicator.batchApplyDirect([{
            element: animatedEl,
            properties: propertyMap,
            enableGPU: true
        }]);
        
        // Check if transform was applied correctly
        const appliedTransform = animatedEl.style.transform;
        console.log(`   Applied transform: ${appliedTransform}`);
        
        const hasCorrectTransform = appliedTransform && 
                                   appliedTransform.includes('translateX') && 
                                   appliedTransform.includes('px');
        console.log(`   Transform correctly applied: ${hasCorrectTransform ? '✅' : '❌'}`);
        
        if (!hasCorrectTransform) {
            console.error('❌ [Scroll Test] DirectScrollApplicator not handling cross-unit markers');
            return false;
        }
        
        // Test 2: Verify the resolved value makes sense
        console.log('\n🧪 [Scroll Test] Test 2: Cross-unit value resolution validation');
        
        // Extract translateX value
        const translateXMatch = appliedTransform.match(/translateX\(([^)]+)\)/);
        if (translateXMatch) {
            const translateXValue = translateXMatch[1];
            const pixelValue = parseFloat(translateXValue);
            const viewport = window.innerWidth;
            const elementWidth = animatedEl.offsetWidth;
            
            console.log(`   Viewport: ${viewport}px, Element: ${elementWidth}px`);
            console.log(`   Resolved translateX: ${pixelValue}px`);
            
            // At 50% progress, should be halfway between 100vw and -100%
            const expectedMid = (viewport + (-elementWidth)) / 2;
            const tolerance = Math.abs(expectedMid * 0.1); // 10% tolerance
            
            console.log(`   Expected ~${expectedMid}px (±${tolerance}px)`);
            
            const isInRange = Math.abs(pixelValue - expectedMid) <= tolerance;
            console.log(`   Value in expected range: ${isInRange ? '✅' : '❌'}`);
            
            if (!isInRange) {
                console.error('❌ [Scroll Test] Cross-unit interpolation value incorrect');
                return false;
            }
        } else {
            console.error('❌ [Scroll Test] Could not extract translateX value');
            return false;
        }
        
        // Test 3: Test different cross-unit scenarios
        console.log('\n🧪 [Scroll Test] Test 3: Multiple cross-unit scenarios');
        
        const scenarios = [
            { from: '100vw', to: '-100%', property: 'translateX', progress: 0.0 },
            { from: '100vw', to: '-100%', property: 'translateX', progress: 1.0 },
            { from: '0px', to: '50vh', property: 'translateY', progress: 0.5 },
            { from: '10rem', to: '50%', property: 'width', progress: 0.3 }
        ];
        
        let allScenariosPass = true;
        
        scenarios.forEach((scenario, index) => {
            const marker = `__CROSS_UNIT_INTERPOLATION__:${scenario.from}:${scenario.to}:${scenario.progress}`;
            const testMap = new Map([[scenario.property, marker]]);
            
            console.log(`   Scenario ${index + 1}: ${scenario.from} → ${scenario.to} @ ${scenario.progress}`);
            
            // Reset element styles
            animatedEl.style.transform = '';
            animatedEl.style.width = '';
            
            // Apply the scenario
            directApplicator.batchApplyDirect([{
                element: animatedEl,
                properties: testMap,
                enableGPU: false
            }]);
            
            // Check if property was applied
            let applied = false;
            if (scenario.property === 'translateX' || scenario.property === 'translateY') {
                applied = animatedEl.style.transform.includes(scenario.property);
            } else {
                applied = animatedEl.style[scenario.property as any] !== '';
            }
            
            console.log(`     Applied correctly: ${applied ? '✅' : '❌'}`);
            if (!applied) allScenariosPass = false;
        });
        
        if (!allScenariosPass) {
            console.error('❌ [Scroll Test] Some scenarios failed');
            return false;
        }
        
        console.log('\n🏆 [Scroll Test] All tests passed! Scroll cross-unit animations working correctly.');
        return true;
        
    } catch (error) {
        console.error('❌ [Scroll Test] Test failed with error:', error);
        return false;
    } finally {
        document.body.removeChild(triggerEl);
        document.body.removeChild(animatedEl);
    }
}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    (window as any).testScrollCrossUnitAnimations = testScrollCrossUnitAnimations;
} 