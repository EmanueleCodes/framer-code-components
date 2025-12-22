/**
 * FAME Animation System - Debug Utilities
 * 
 * @fileOverview Debug utilities and diagnostic functions
 * @version 1.1.0
 * @since 1.0.0
 * 
 * @description
 * Collection of debug utilities for FAME Animation System.
 * Includes text splitting diagnostics and cross-unit interpolation tests.
 */

export * from './TextAnimationDiagnostic.ts';
export * from './DelayedTriggerTest.tsx';
export * from './cross-unit-marker-test.ts';
export * from './scroll-cross-unit-test.ts';
export * from './multiple-scrubbed-test.ts';
export * from './multiple-scrubbed-debug.ts';

import { interpolateToPixels } from '../utils/units/SimpleUnitConverter.ts';

/**
 * Quick test function for cross-unit interpolation (especially translateX)
 * 
 * @description
 * Tests the specific issue reported: translateX from 100vw to -100%
 * Call this function in browser console to verify the fix is working.
 * 
 * @example
 * ```typescript
 * import { testCrossUnitTranslateX } from './debug/index.ts';
 * testCrossUnitTranslateX();
 * ```
 */
export function testCrossUnitTranslateX(): void {
    console.log('🧪 [Debug] Testing cross-unit translateX interpolation...');
    
    // Create a test element
    const testEl = document.createElement('div');
    testEl.style.cssText = 'position: absolute; width: 200px; height: 100px;';
    document.body.appendChild(testEl);
    
    try {
        // Test the reported issue: translateX from 100vw to -100%
        const progress0 = interpolateToPixels('100vw', '-100%', 0.0, testEl, 'translateX');
        const progress50 = interpolateToPixels('100vw', '-100%', 0.5, testEl, 'translateX');
        const progress100 = interpolateToPixels('100vw', '-100%', 1.0, testEl, 'translateX');
        
        const viewport = window.innerWidth;
        const elementWidth = testEl.offsetWidth;
        
        console.log('🧪 [Debug] Cross-unit translateX test results:');
        console.log(`   Viewport width: ${viewport}px`);
        console.log(`   Element width: ${elementWidth}px`);
        console.log(`   Progress 0%: ${progress0}px (should be ~${viewport}px)`);
        console.log(`   Progress 50%: ${progress50}px`);
        console.log(`   Progress 100%: ${progress100}px (should be ~${-elementWidth}px)`);
        
        // Check if results make sense
        const isValidStart = Math.abs(progress0 - viewport) < 1;
        const isValidEnd = Math.abs(progress100 - (-elementWidth)) < 1;
        const isMonotonic = progress0 > progress50 && progress50 > progress100;
        
        const result = isValidStart && isValidEnd && isMonotonic ? 'PASSED ✅' : 'FAILED ❌';
        console.log(`🧪 [Debug] Cross-unit translateX test: ${result}`);
        
        if (!isValidStart) console.warn('❌ Start value incorrect');
        if (!isValidEnd) console.warn('❌ End value incorrect'); 
        if (!isMonotonic) console.warn('❌ Not smooth progression');
        
    } catch (error) {
        console.error('❌ [Debug] Cross-unit test failed:', error);
    } finally {
        document.body.removeChild(testEl);
    }
}

// Auto-export for browser console access
if (typeof window !== 'undefined') {
    (window as any).testCrossUnitTranslateX = testCrossUnitTranslateX;
} 