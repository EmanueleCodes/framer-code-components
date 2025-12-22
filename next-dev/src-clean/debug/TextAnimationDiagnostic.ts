/**
 * @file TextAnimationDiagnostic.ts
 * @description Diagnostic tool for debugging text animation issues
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * This tool helps debug the exact point where text animations break by:
 * 1. Checking if split elements exist and are accessible
 * 2. Verifying animation system can find them
 * 3. Testing if styles can be applied
 * 4. Detecting ref management conflicts
 */

export interface TextAnimationDiagnosticResult {
    elementsExist: boolean;
    elementsAccessible: boolean;
    animationSystemFinds: boolean;
    stylesCanBeApplied: boolean;
    refConflicts: boolean;
    detailedReport: string;
}

/**
 * Comprehensive diagnostic for text animation issues
 */
export class TextAnimationDiagnostic {
    
    /**
     * Run full diagnostic on text animation system
     */
    static diagnoseTextAnimation(
        containerElement?: HTMLElement
    ): TextAnimationDiagnosticResult {
        console.log(`🔍 [TextAnimationDiagnostic] Starting comprehensive text animation diagnostic`);
        
        const container = containerElement || document.body;
        const report: string[] = [];
        
        // Test 1: Check if split elements exist in any scope
        report.push("=== TEST 1: ELEMENT EXISTENCE ===");
        const elementsExist = this.checkElementExistence(container, report);
        
        // Test 2: Check if elements are accessible via different query methods
        report.push("\n=== TEST 2: ELEMENT ACCESSIBILITY ===");
        const elementsAccessible = this.checkElementAccessibility(container, report);
        
        // Test 3: Check if animation system can find elements
        report.push("\n=== TEST 3: ANIMATION SYSTEM TARGETING ===");
        const animationSystemFinds = this.checkAnimationSystemTargeting(container, report);
        
        // Test 4: Test if styles can be applied
        report.push("\n=== TEST 4: STYLE APPLICATION ===");
        const stylesCanBeApplied = this.checkStyleApplication(container, report);
        
        // Test 5: Check for ref management conflicts
        report.push("\n=== TEST 5: REF CONFLICTS ===");
        const refConflicts = this.checkRefConflicts(container, report);
        
        // Summary
        report.push("\n=== DIAGNOSTIC SUMMARY ===");
        report.push(`Elements Exist: ${elementsExist ? '✅' : '❌'}`);
        report.push(`Elements Accessible: ${elementsAccessible ? '✅' : '❌'}`);
        report.push(`Animation System Finds: ${animationSystemFinds ? '✅' : '❌'}`);
        report.push(`Styles Can Be Applied: ${stylesCanBeApplied ? '✅' : '❌'}`);
        report.push(`Ref Conflicts: ${refConflicts ? '⚠️' : '✅'}`);
        
        const result: TextAnimationDiagnosticResult = {
            elementsExist,
            elementsAccessible,
            animationSystemFinds,
            stylesCanBeApplied,
            refConflicts,
            detailedReport: report.join('\n')
        };
        
        console.log(`🔍 [TextAnimationDiagnostic] Diagnostic complete:`, result);
        return result;
    }
    
    /**
     * Test 1: Check if split elements exist anywhere in DOM
     */
    private static checkElementExistence(container: HTMLElement, report: string[]): boolean {
        const selectors = ['.fame-text-line', '.fame-text-word', '.fame-text-char'];
        let anyFound = false;
        
        for (const selector of selectors) {
            // Global search
            const globalElements = document.querySelectorAll(selector);
            // Local search
            const localElements = container.querySelectorAll(selector);
            
            report.push(`${selector}:`);
            report.push(`  Global search: ${globalElements.length} elements`);
            report.push(`  Local search: ${localElements.length} elements`);
            
            if (globalElements.length > 0 || localElements.length > 0) {
                anyFound = true;
                
                // Show first element details
                const firstElement = (localElements[0] || globalElements[0]) as HTMLElement;
                if (firstElement) {
                    report.push(`  First element: ${firstElement.tagName}`);
                    report.push(`  Text content: "${firstElement.textContent?.slice(0, 30)}..."`);
                    report.push(`  Is connected: ${firstElement.isConnected}`);
                    report.push(`  Parent: ${firstElement.parentElement?.tagName || 'none'}`);
                }
            }
        }
        
        return anyFound;
    }
    
    /**
     * Test 2: Check element accessibility via different query methods
     */
    private static checkElementAccessibility(container: HTMLElement, report: string[]): boolean {
        const testSelector = '.fame-text-line';
        
        // Method 1: Document query
        const documentQuery = document.querySelector(testSelector);
        report.push(`document.querySelector('${testSelector}'): ${documentQuery ? 'FOUND' : 'NOT FOUND'}`);
        
        // Method 2: Container query
        const containerQuery = container.querySelector(testSelector);
        report.push(`container.querySelector('${testSelector}'): ${containerQuery ? 'FOUND' : 'NOT FOUND'}`);
        
        // Method 3: Find FAME components first
        const fameComponents = document.querySelectorAll('[data-fame-animator="true"]');
        report.push(`Found ${fameComponents.length} FAME components`);
        
        let foundInFameComponent = false;
        fameComponents.forEach((fameComponent, index) => {
            const elementsInFame = fameComponent.querySelectorAll(testSelector);
            if (elementsInFame.length > 0) {
                report.push(`  FAME component ${index}: ${elementsInFame.length} elements`);
                foundInFameComponent = true;
            }
        });
        
        return documentQuery !== null || containerQuery !== null || foundInFameComponent;
    }
    
    /**
     * Test 3: Check if animation system can find elements using its logic
     */
    private static checkAnimationSystemTargeting(container: HTMLElement, report: string[]): boolean {
        // Simulate EventAnimationCoordinator element finding logic
        const fameComponents = document.querySelectorAll('[data-fame-animator="true"]');
        let animationSystemCanFind = false;
        
        fameComponents.forEach((fameComponent, index) => {
            report.push(`Testing FAME component ${index}:`);
            
            // Test the exact logic used by EventAnimationCoordinator
            const testSelectors = ['.fame-text-line', '.fame-text-word', '.fame-text-char'];
            
            for (const selector of testSelectors) {
                const elements = fameComponent.querySelectorAll(selector);
                if (elements.length > 0) {
                    report.push(`  ${selector}: ${elements.length} elements found`);
                    animationSystemCanFind = true;
                    
                    // Test if they're actually connected and valid
                    const connectedElements = Array.from(elements).filter(el => 
                        el.isConnected && document.contains(el)
                    );
                    report.push(`  Connected elements: ${connectedElements.length}/${elements.length}`);
                } else {
                    report.push(`  ${selector}: NO elements found`);
                }
            }
        });
        
        return animationSystemCanFind;
    }
    
    /**
     * Test 4: Check if styles can be applied to elements
     */
    private static checkStyleApplication(container: HTMLElement, report: string[]): boolean {
        const testElements = container.querySelectorAll('.fame-text-line, .fame-text-word, .fame-text-char');
        
        if (testElements.length === 0) {
            report.push(`No elements found for style testing`);
            return false;
        }
        
        let styleAppliedSuccessfully = false;
        
        // Test style application on first element
        const testElement = testElements[0] as HTMLElement;
        if (testElement) {
            try {
                // Save original styles
                const originalTransform = testElement.style.transform;
                const originalOpacity = testElement.style.opacity;
                
                // Try to apply test styles
                testElement.style.transform = 'translateX(5px)';
                testElement.style.opacity = '0.8';
                
                // Check if styles were applied
                const appliedTransform = testElement.style.transform;
                const appliedOpacity = testElement.style.opacity;
                
                const transformApplied = appliedTransform.includes('translateX(5px)');
                const opacityApplied = appliedOpacity === '0.8';
                
                report.push(`Test element: ${testElement.tagName}.${testElement.className}`);
                report.push(`Transform applied: ${transformApplied ? 'YES' : 'NO'} (${appliedTransform})`);
                report.push(`Opacity applied: ${opacityApplied ? 'YES' : 'NO'} (${appliedOpacity})`);
                
                // Restore original styles
                testElement.style.transform = originalTransform;
                testElement.style.opacity = originalOpacity;
                
                styleAppliedSuccessfully = transformApplied && opacityApplied;
                
            } catch (error) {
                report.push(`Style application error: ${error}`);
                styleAppliedSuccessfully = false;
            }
        }
        
        return styleAppliedSuccessfully;
    }
    
    /**
     * Test 5: Check for React ref management conflicts
     */
    private static checkRefConflicts(container: HTMLElement, report: string[]): boolean {
        // Check for React-specific attributes that might indicate ref conflicts
        const elementsWithRefs = container.querySelectorAll('[data-fame-element-id]');
        const elementsWithReactProps = container.querySelectorAll('[data-reactroot], [data-react-*]');
        
        report.push(`Elements with FAME IDs: ${elementsWithRefs.length}`);
        report.push(`Elements with React attributes: ${elementsWithReactProps.length}`);
        
        // Check for elements that exist in React refs but not in DOM
        let refConflictsDetected = false;
        
        // Look for disconnected or stale references
        elementsWithRefs.forEach((element, index) => {
            const htmlElement = element as HTMLElement;
            const isConnected = htmlElement.isConnected;
            const inDocument = document.contains(htmlElement);
            
            if (!isConnected || !inDocument) {
                report.push(`  Element ${index}: DISCONNECTED (isConnected: ${isConnected}, inDocument: ${inDocument})`);
                refConflictsDetected = true;
            }
        });
        
        // Check for multiple elements with same ID (ref collision)
        const elementIds = Array.from(elementsWithRefs).map(el => 
            el.getAttribute('data-fame-element-id')
        ).filter(id => id !== null);
        
        const duplicateIds = elementIds.filter((id, index) => 
            elementIds.indexOf(id) !== index
        );
        
        if (duplicateIds.length > 0) {
            report.push(`  Duplicate element IDs detected: ${duplicateIds.join(', ')}`);
            refConflictsDetected = true;
        }
        
        return refConflictsDetected;
    }
    
    /**
     * Quick test that can be run from browser console
     */
    static quickTest(): void {
        console.log("🔍 Running quick text animation diagnostic...");
        const result = this.diagnoseTextAnimation();
        console.log("📋 Diagnostic Report:");
        console.log(result.detailedReport);
        console.log("🎯 Quick Fix Suggestions:");
        
        if (!result.elementsExist) {
            console.log("❌ No split elements found - Text splitting may not be enabled");
        }
        if (!result.elementsAccessible) {
            console.log("❌ Elements exist but not accessible - Check DOM scoping");
        }
        if (!result.animationSystemFinds) {
            console.log("❌ Animation system can't find elements - Check EventAnimationCoordinator");
        }
        if (!result.stylesCanBeApplied) {
            console.log("❌ Can't apply styles to elements - Check CSS specificity or element state");
        }
        if (result.refConflicts) {
            console.log("⚠️ React ref conflicts detected - Check useAnimatedTextElements hook");
        }
    }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
    (window as any).TextAnimationDiagnostic = TextAnimationDiagnostic;
} 