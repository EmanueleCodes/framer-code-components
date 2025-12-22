/**
 * @file StyleCoordinator.ts
 * @description Style application coordinator with canvas-aware toggle functionality
 * 
 * @version 1.1.0
 * @since 1.0.0
 * 
 * @description
 * This coordinator handles StyleSlot application with smart canvas mode detection
 * and original value preservation for clean fallback experience.
 * 
 * ENHANCED FEATURES:
 * - Canvas mode detection (similar to InitialValueCoordinator)
 * - Original value storage and restoration
 * - Toggle-based style application (showStyleSlotsInCanvas)
 * - Clean fallback to Framer's original styling
 * 
 * RESPONSIBILITIES:
 * - Apply StyleSlots conditionally based on canvas mode and user preference
 * - Store original CSS values before applying style slots
 * - Restore original values when toggling off
 * - Element targeting using existing ElementFinder
 * - CSS validation and error reporting
 * 
 * @example
 * ```typescript
 * const coordinator = new StyleCoordinator();
 * coordinator.applyStyleSlots(styleSlots, componentElement, showStyleSlotsInCanvas);
 * ```
 */

import { StyleSlot, StyleProperty } from '../../types/index.ts';
import { applyProperty } from '../../execution/StyleApplicator.ts';
import { findAnimatedElementsWithCriteria } from '../../dom/ElementFinder.ts';
import { EnvironmentDetector } from '../../utils/environment/EnvironmentDetector.ts';

/**
 * Original style value storage for restoration
 */
interface OriginalStyleValue {
    element: HTMLElement;
    property: string;
    value: string;
    timestamp: number;
}

/**
 * StyleCoordinator - Canvas-Aware Style Application Logic
 * 
 * Enhanced coordinator that respects canvas mode and user preferences
 * for style slot application, with clean fallback to original Framer values.
 */
export class StyleCoordinator {
    private originalValues: Map<string, OriginalStyleValue[]> = new Map();

    constructor() {
        console.log(`🎨 [StyleCoordinator] Initialized with canvas detection`);
    }
    
    /**
     * Apply StyleSlots to elements with canvas-aware toggle functionality
     * 
     * @param styleSlots - Array of StyleSlots to apply
     * @param componentElement - Root component element for element finding
     * @param showStyleSlotsInCanvas - User preference for showing styles in canvas mode
     */
    applyStyleSlots(
        styleSlots: StyleSlot[],
        componentElement: HTMLElement,
        showStyleSlotsInCanvas: boolean = false
    ): void {
        console.log(`🎨 [StyleCoordinator] Processing ${styleSlots.length} style slots`);
        
        try {
            // Canvas mode detection using proper EnvironmentDetector
            const isCanvasMode = this.handleCanvasMode();
            
            // Determine if we should apply styles
            const shouldApplyStyles = this.shouldApplyStyles(isCanvasMode, showStyleSlotsInCanvas);
            
            if (shouldApplyStyles) {
                // Apply style slots
                console.log(`🎨 [StyleCoordinator] Applying style slots`);
                styleSlots.forEach((slot, index) => {
                    console.log(`🎨 [StyleCoordinator] Processing style slot ${index + 1}/${styleSlots.length}: ${slot.name}`);
                    this.applyStyleSlot(slot, componentElement);
                });
                console.log(`🎨 [StyleCoordinator] ✅ All style slots applied successfully`);
            } else {
                // First ensure we have original values stored, then restore them
                console.log(`🎨 [StyleCoordinator] Style slots disabled in Canvas mode - storing original values and restoring`);
                this.ensureOriginalValuesStored(styleSlots, componentElement);
                this.restoreOriginalStyles(componentElement);
            }
            
        } catch (error) {
            console.error(`🎨 [StyleCoordinator] Error applying style slots:`, error);
        }
    }
    
    /**
     * Handle Canvas mode detection
     * 
     * COPIED FROM: InitialValueCoordinator Canvas mode logic
     */
    private handleCanvasMode(): boolean {
        const isCanvasMode = EnvironmentDetector.isCanvas();
        console.log(`🎨 [StyleCoordinator] Canvas mode detected: ${isCanvasMode}`);
        return isCanvasMode;
    }
    
    /**
     * Determine if styles should be applied based on canvas mode and user preference
     * 
     * COPIED FROM: InitialValueCoordinator shouldApplyInitialValues logic
     * 
     * LOGIC:
     * - In preview/published mode: Always apply styles
     * - In Canvas mode: Respect user preference for design workflow flexibility
     */
    private shouldApplyStyles(isCanvasMode: boolean, showStyleSlotsInCanvas: boolean): boolean {
        if (!isCanvasMode) {
            // Always apply in preview/published mode
            console.log(`🎨 [StyleCoordinator] Non-Canvas mode: applying styles`);
            return true;
        }
        
        // In Canvas mode, respect user preference for design workflow
        const shouldApply = showStyleSlotsInCanvas;
        console.log(`🎨 [StyleCoordinator] Canvas mode: user setting = ${showStyleSlotsInCanvas}, applying = ${shouldApply}`);
        
        return shouldApply;
    }
    
    /**
     * Ensure original values are stored for all target elements in style slots
     * This is needed when toggling OFF to restore original values
     */
    private ensureOriginalValuesStored(
        styleSlots: StyleSlot[],
        componentElement: HTMLElement
    ): void {
        console.log(`🎨 [StyleCoordinator] Ensuring original values are stored for ${styleSlots.length} style slots`);
        
        styleSlots.forEach((slot) => {
            // Find target elements for this slot
            const allTargetElements: HTMLElement[] = [];
            
            slot.targetElements.forEach((targetConfig) => {
                const foundElements = findAnimatedElementsWithCriteria(
                    componentElement,
                    targetConfig.selection,
                    false // debug off for this operation
                );
                allTargetElements.push(...foundElements);
            });
            
            // Remove duplicates
            const uniqueTargetElements = Array.from(new Set(allTargetElements));
            
            // Store original values for each style property on each target element
            uniqueTargetElements.forEach((element) => {
                slot.styleProperties.forEach((styleProperty) => {
                    this.storeOriginalValue(element, styleProperty.property, slot.id);
                });
            });
        });
        
        console.log(`🎨 [StyleCoordinator] Original values storage ensured`);
    }
    
    /**
     * Store original CSS value before applying style slot value
     */
    private storeOriginalValue(
        element: HTMLElement,
        property: string,
        slotId: string
    ): void {
        const computedStyle = window.getComputedStyle(element);
        const originalValue = computedStyle.getPropertyValue(property) || '';
        
        if (!this.originalValues.has(slotId)) {
            this.originalValues.set(slotId, []);
        }
        
        const values = this.originalValues.get(slotId)!;
        
        // Check if we already stored this element-property combination
        const existing = values.find(v => 
            v.element === element && v.property === property
        );
        
        if (!existing) {
            values.push({
                element,
                property,
                value: originalValue,
                timestamp: Date.now()
            });
            
            console.log(`🎨 [StyleCoordinator] 📦 Stored original ${property}: "${originalValue}" for element ${element.tagName}`);
        }
    }
    
    /**
     * Restore original styles for all stored values
     */
    private restoreOriginalStyles(componentElement: HTMLElement): void {
        console.log(`🎨 [StyleCoordinator] 🔄 Restoring original styles`);
        
        let restoredCount = 0;
        
        this.originalValues.forEach((values, slotId) => {
            values.forEach(({ element, property, value }) => {
                try {
                    // Check if element is still in the DOM and descendant of component
                    if (componentElement.contains(element)) {
                        if (value) {
                            element.style.setProperty(property, value);
                        } else {
                            element.style.removeProperty(property);
                        }
                        
                        restoredCount++;
                        console.log(`🎨 [StyleCoordinator] ✅ Restored ${property}: "${value}" on ${element.tagName}`);
                    }
                } catch (error) {
                    console.warn(`🎨 [StyleCoordinator] Failed to restore ${property} on element:`, error);
                }
            });
        });
        
        if (restoredCount > 0) {
            console.log(`🎨 [StyleCoordinator] 🎉 Restored ${restoredCount} original styles`);
        }
    }
    
    /**
     * Apply a single StyleSlot to its target elements
     */
    private applyStyleSlot(
        styleSlot: StyleSlot,
        componentElement: HTMLElement
    ): void {
        // Log validation errors if any
        if (styleSlot.validationErrors && styleSlot.validationErrors.length > 0) {
            console.warn(`🎨 [StyleCoordinator] StyleSlot "${styleSlot.name}" has validation errors:`, styleSlot.validationErrors);
        }
        
        // Find target elements for each target configuration
        const allTargetElements: HTMLElement[] = [];
        
        styleSlot.targetElements.forEach((targetConfig, configIndex) => {
            console.log(`🎨 [StyleCoordinator] Finding elements for target config ${configIndex + 1}:`, {
                scope: targetConfig.selection.scope,
                criteria: targetConfig.selection.criteria
            });
            
            const foundElements = findAnimatedElementsWithCriteria(
                componentElement,
                targetConfig.selection,
                true // debug
            );
            
            console.log(`🎨 [StyleCoordinator] Found ${foundElements.length} elements for target config ${configIndex + 1}`);
            allTargetElements.push(...foundElements);
        });
        
        // Remove duplicates
        const uniqueTargetElements = Array.from(new Set(allTargetElements));
        console.log(`🎨 [StyleCoordinator] Total unique target elements: ${uniqueTargetElements.length}`);
        
        if (uniqueTargetElements.length === 0) {
            console.warn(`🎨 [StyleCoordinator] No target elements found for StyleSlot "${styleSlot.name}"`);
            return;
        }
        
        // Apply each style property to all target elements
        uniqueTargetElements.forEach((element, elementIndex) => {
            console.log(`🎨 [StyleCoordinator] Applying ${styleSlot.styleProperties.length} properties to element ${elementIndex + 1}`);
            
            styleSlot.styleProperties.forEach((styleProperty) => {
                // Store original value before applying new one
                this.storeOriginalValue(element, styleProperty.property, styleSlot.id);
                
                // Apply the style property
                this.applyStyleProperty(element, styleProperty, styleSlot.name);
            });
        });
    }
    
    /**
     * Apply a single style property to an element
     */
    private applyStyleProperty(
        element: HTMLElement,
        styleProperty: StyleProperty,
        slotName: string
    ): void {
        // Skip invalid properties but log the attempt
        if (styleProperty.isValid === false) {
            console.warn(`🎨 [StyleCoordinator] Skipping invalid property in "${slotName}": ${styleProperty.property}="${styleProperty.value}" - ${styleProperty.validationError}`);
            return;
        }
        
        try {
            // Use existing applyProperty function (same as InitialValueCoordinator)
            applyProperty(
                element,
                styleProperty.property,
                styleProperty.value,
                styleProperty.unit
            );
            
            console.log(`🎨 [StyleCoordinator] ✅ Applied: ${styleProperty.property}=${styleProperty.value}${styleProperty.unit || ''}`);
            
        } catch (error) {
            console.error(`🎨 [StyleCoordinator] Error applying property ${styleProperty.property}:`, error);
            
            // Report validation error for debugging
            console.error(`🎨 [StyleCoordinator] Failed CSS application: ${styleProperty.property}="${styleProperty.value}" - Please check CSS syntax`);
        }
    }
    
    /**
     * Cleanup and restore all original styles
     */
    cleanup(componentElement: HTMLElement): void {
        console.log(`🎨 [StyleCoordinator] Cleanup: restoring all original styles`);
        this.restoreOriginalStyles(componentElement);
        this.originalValues.clear();
    }
} 