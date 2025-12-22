/**
 * Simple test for cross-unit interpolation debugging
 */

import { interpolateToPixels } from '../utils/units/SimpleUnitConverter.ts';

// Create test element
const testElement = document.createElement('div');
testElement.style.width = '500px';
testElement.style.height = '300px';
document.body.appendChild(testElement);

console.log('🧪 [CrossUnitTest] Testing 100px → 40vw interpolation');

// Test at different progress points
const testPoints = [0, 0.25, 0.5, 0.75, 1];

testPoints.forEach(progress => {
    try {
        const result = interpolateToPixels('100px', '40vw', progress, testElement, 'width');
        console.log(`🧪 [CrossUnitTest] Progress ${progress}: ${result}px`);
    } catch (error) {
        console.error(`🧪 [CrossUnitTest] Error at progress ${progress}:`, error);
    }
});

// Clean up
document.body.removeChild(testElement);

console.log('🧪 [CrossUnitTest] Test completed'); 