/**
 * @file InitialValueCoordinator.ts
 * @description Initial value application coordination extracted from AnimationOrchestrator
 * 
 * @version 1.0.0-refactor
 * @since 1.0.0
 * 
 * REFACTORING PHASE R2.1: Initial Value Coordination Extraction (SURGICAL NON-DESTRUCTIVE)
 * 
 * This coordinator handles all initial value application logic extracted from
 * the AnimationOrchestrator as part of the god-class refactoring strategy.
 * 
 * RESPONSIBILITIES:
 * - Canvas mode detection and handling
 * - Timeline-based initial value application
 * - Legacy initial value application
 * - Initial value reset logic
 * - Environment-specific behavior coordination
 * 
 * @example
 * ```typescript
 * const coordinator = new InitialValueCoordinator();
 * coordinator.applyInitialValues(slot, animatedElements, showInitialValuesInCanvas);
 * ```
 */

import { AnimationSlot } from '../../types/index.ts';
import { MasterTimeline, getMasterTimelineInitialValues, MasterTimelineBuilder } from '../timeline/MasterTimeline.ts';
import { applyProperty } from '../../execution/StyleApplicator.ts';
import { applyInitialValues, resetInitialValues } from '../../utils/properties/InitialValueApplicator.ts';
import { EnvironmentDetector } from '../../utils/environment/EnvironmentDetector.ts';

/**
 * InitialValueCoordinator - Focused Initial Value Logic
 * 
 * Extracted from AnimationOrchestrator to provide single responsibility
 * for initial value application and Canvas mode coordination.
 */
export class InitialValueCoordinator {
    constructor() {
        console.log(`🎨 [InitialValueCoordinator] Initialized initial value coordination`);
    }
    
    /**
     * Apply initial values to animated elements based on Canvas mode and user preference
     * 
     * COPIED FROM: AnimationOrchestrator.handleEventAnimation() initial value logic
     * 
     * This method handles the complete initial value application lifecycle:
     * 1. Detect Canvas mode using EnvironmentDetector
     * 2. Determine whether to apply or reset initial values
     * 3. Choose between timeline-based or legacy application
     * 4. Apply values to all animated elements
     * 
     * @param slot - Animation slot with properties and timeline
     * @param animatedElements - Elements to apply initial values to
     * @param showInitialValuesInCanvas - User preference for Canvas mode behavior
     */
    applyInitialValues(
        slot: AnimationSlot,
        animatedElements: HTMLElement[],
        showInitialValuesInCanvas: boolean
    ): void {
        console.log(`🎨 [InitialValueCoordinator] Applying initial values for slot: ${slot.id}`);
        
        // 🚨 CRITICAL DEBUG: Check DOM connection at START of applyInitialValues
        const disconnectedAtStart = animatedElements.filter(el => !el.isConnected).length;
        if (disconnectedAtStart > 0) {
            console.error(`🚨 [INITIAL-VALUES-DEBUG] START: ${disconnectedAtStart}/${animatedElements.length} elements disconnected at START of applyInitialValues!`);
        } else {
            console.log(`✅ [INITIAL-VALUES-DEBUG] All ${animatedElements.length} elements connected at START of applyInitialValues`);
        }
        
        try {
            // Canvas mode detection
            const isCanvasMode = this.handleCanvasMode();
            
            // Determine whether to apply initial values based on Canvas mode and user preference
            const shouldApplyInitialValues = this.shouldApplyInitialValues(isCanvasMode, showInitialValuesInCanvas);
            
            if (shouldApplyInitialValues) {
                this.applyInitialValuesToElements(slot, animatedElements);
            } else {
                this.resetInitialValuesOnElements(slot, animatedElements);
            }
            
            console.log(`🎨 [InitialValueCoordinator] Initial values applied successfully for ${animatedElements.length} elements`);
            
            // 🚨 CRITICAL DEBUG: Check DOM connection at END of applyInitialValues
            const disconnectedAtEnd = animatedElements.filter(el => !el.isConnected).length;
            if (disconnectedAtEnd > 0) {
                console.error(`🚨 [INITIAL-VALUES-DEBUG] END: ${disconnectedAtEnd}/${animatedElements.length} elements disconnected at END of applyInitialValues!`);
            } else {
                console.log(`✅ [INITIAL-VALUES-DEBUG] All ${animatedElements.length} elements connected at END of applyInitialValues`);
            }
            
        } catch (error) {
            console.error(`🎨 [InitialValueCoordinator] Error applying initial values:`, error);
        }
    }
    
    /**
     * Reset initial values to natural state
     * 
     * EXTRACTED FROM: AnimationOrchestrator reset logic
     */
    resetInitialValues(
        slot: AnimationSlot,
        animatedElements: HTMLElement[]
    ): void {
        console.log(`🎨 [InitialValueCoordinator] Resetting initial values for slot: ${slot.id}`);
        
        try {
            this.resetInitialValuesOnElements(slot, animatedElements);
            console.log(`🎨 [InitialValueCoordinator] Initial values reset successfully for ${animatedElements.length} elements`);
        } catch (error) {
            console.error(`🎨 [InitialValueCoordinator] Error resetting initial values:`, error);
        }
    }
    
    /**
     * Handle Canvas mode detection
     * 
     * COPIED FROM: AnimationOrchestrator Canvas mode logic
     */
    handleCanvasMode(): boolean {
        const isCanvasMode = EnvironmentDetector.isCanvas();
        console.log(`🎨 [InitialValueCoordinator] Canvas mode detected: ${isCanvasMode}`);
        return isCanvasMode;
    }
    
    /**
     * Determine whether to apply initial values based on Canvas mode and user preference
     * 
     * ✅ BALANCED FIX: Respect user setting while ensuring animation works properly
     * 
     * LOGIC:
     * - In preview/published mode: Always apply initial values (animations need proper starting state)
     * - In Canvas mode: Respect user preference for design workflow flexibility
     * 
     * This allows designers to toggle off initial values in Canvas to see natural element state,
     * while ensuring animations work correctly in all other contexts.
     */
    private shouldApplyInitialValues(isCanvasMode: boolean, showInitialValuesInCanvas: boolean): boolean {
        // ✅ BALANCED FIX: Respect user setting while ensuring animation works
        if (!isCanvasMode) {
            // Always apply in preview/published mode for proper animation behavior
            console.log(`🎨 [InitialValueCoordinator] Non-Canvas mode: applying initial values for proper animation`);
            return true;
        }
        
        // In Canvas mode, respect user preference for design workflow
        const shouldApply = showInitialValuesInCanvas;
        console.log(`🎨 [InitialValueCoordinator] Canvas mode: user setting = ${showInitialValuesInCanvas}, applying = ${shouldApply}`);
        
        return shouldApply;
    }
    
    /**
     * Apply initial values to elements using timeline or legacy approach
     * 
     * 📊 FEATURE 3A: Enhanced to handle distributed properties
     * 🚨 CRITICAL FIX: Only apply distributed logic to properties that actually have distributed values
     * COPIED FROM: AnimationOrchestrator timeline vs legacy application logic
     */
    private applyInitialValuesToElements(slot: AnimationSlot, animatedElements: HTMLElement[]): void {
        const ENABLE_TIMELINE_ORCHESTRATOR = true; // Feature flag from orchestrator
        
        // 🚨 CRITICAL FIX: Check which specific properties have distributed values, not just if slot has any
        const distributedProperties = slot.properties.filter(prop => 
            prop.distributedFromValues || prop.distributedToValues
        );
        const nonDistributedProperties = slot.properties.filter(prop => 
            !prop.distributedFromValues && !prop.distributedToValues
        );
        
        console.log(`🎨 [InitialValueCoordinator] Property breakdown: ${distributedProperties.length} distributed, ${nonDistributedProperties.length} non-distributed`);
        
        // 🚨 CRITICAL FIX: Apply distributed logic ONLY to properties that have distributed values
        if (distributedProperties.length > 0) {
            console.log('🎨 [InitialValueCoordinator] Applying distributed initial values to distributed properties only');
            
            // Create a slot with only distributed properties
            const distributedSlot: AnimationSlot = {
                ...slot,
                properties: distributedProperties
            };
            
            this.applyDistributedInitialValues(distributedSlot, animatedElements);
        }
        
        // 🚨 CRITICAL FIX: Apply normal logic to non-distributed properties  
        if (nonDistributedProperties.length > 0) {
            console.log('🎨 [InitialValueCoordinator] Applying normal initial values to non-distributed properties');
            
            // Create a slot with only non-distributed properties
            const nonDistributedSlot: AnimationSlot = {
                ...slot,
                properties: nonDistributedProperties
            };
            
            if (ENABLE_TIMELINE_ORCHESTRATOR && slot.masterTimeline) {
                console.log('🎨 [InitialValueCoordinator] Applying timeline-based initial values for non-distributed properties');
                this.applyTimelineBasedInitialValues(nonDistributedSlot, animatedElements);
            } else {
                console.log('🎨 [InitialValueCoordinator] Applying legacy initial values for non-distributed properties');
                this.applyLegacyInitialValues(nonDistributedSlot, animatedElements);
            }
        }
        
        console.log('🎨 [InitialValueCoordinator] ✅ Applied initial values with proper property isolation');
    }
    
    /**
     * Apply distributed initial values for properties that vary per element
     * 📊 FEATURE 3A: Apply distributed "from" values to each element based on index
     * 🚨 DEBUG: Added comprehensive logging to track distributed initial value application
     */
    private applyDistributedInitialValues(slot: AnimationSlot, animatedElements: HTMLElement[]): void {
        console.log(`📊 [InitialValueCoordinator] Applying distributed initial values for ${animatedElements.length} elements`);
        
        // 🚨 DEBUG: Log the slot structure for distributed properties
        console.log(`📊 [InitialValueCoordinator] Slot has ${slot.properties.length} properties:`, 
            slot.properties.map(p => ({
                property: p.property,
                hasDistributedFromValues: !!p.distributedFromValues,
                distributedFromValuesLength: p.distributedFromValues?.length || 0,
                regularFromValue: p.from
            }))
        );
        
        animatedElements.forEach((element, elementIndex) => {
            // Get element index for distributed value mapping
            const storedIndex = element.getAttribute('data-fame-element-index');
            const distributedIndex = storedIndex ? parseInt(storedIndex, 10) : elementIndex;
            
            console.log(`📊 [InitialValueCoordinator] Processing element ${distributedIndex} (elementIndex: ${elementIndex})`);
            
            slot.properties.forEach(property => {
                try {
                    let initialValue = property.from;
                    
                    // Use distributed "from" value if available
                    if (property.distributedFromValues && property.distributedFromValues[distributedIndex] !== undefined) {
                        initialValue = property.distributedFromValues[distributedIndex];
                        console.log(`📊 [InitialValueCoordinator] Using distributed from value for ${property.property}: ${initialValue} (element ${distributedIndex})`);
                    } else if (property.distributedFromValues) {
                        console.warn(`📊 [InitialValueCoordinator] No distributed value found for ${property.property} at index ${distributedIndex}. Available indices: ${Object.keys(property.distributedFromValues)}`);
                    }
                    
                    // Apply the initial value
                    if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
                        // Apply property with unit inference if needed
                        applyProperty(element, property.property, initialValue, property.unit);
                        
                        // 🚨 CRITICAL FIX: Mark element as having distributed value applied
                        element.setAttribute(`data-fame-distributed-${property.property}`, 'true');
                        
                        console.log(`📊 [InitialValueCoordinator] Applied ${property.property}=${initialValue} to element ${distributedIndex}`);
                    }
                } catch (error) {
                    console.error(`📊 [InitialValueCoordinator] Error applying distributed initial value for ${property.property}:`, error);
                }
            });
        });
    }
    
    /**
     * Apply timeline-based initial values
     * 
     * Enhanced to handle timeline-based initial value application
     * 🚨 CRITICAL FIX: Skip properties that have distributed values to prevent override
     */
    private applyTimelineBasedInitialValues(slot: AnimationSlot, animatedElements: HTMLElement[]): void {
        const masterTimeline = slot.masterTimeline as MasterTimeline;
        const initialValues = getMasterTimelineInitialValues(masterTimeline);
        
        console.log(`🎬 [InitialValueCoordinator] Applying timeline-based initial values for ${initialValues.size} properties`);
        
        animatedElements.forEach((animatedElement) => {
            initialValues.forEach((value, propertyName) => {
                try {
                    // 🚨 CRITICAL FIX: Check if this element already has distributed values applied for this property
                    // Don't override distributed values with timeline values
                    const hasDistributedValue = this.elementHasDistributedValueApplied(animatedElement, propertyName);
                    
                    if (hasDistributedValue) {
                        console.log(`⚠️ [InitialValueCoordinator] Skipping timeline initial value for ${propertyName} - element has distributed value applied`);
                        return;
                    }
                    
                    // Apply property using the existing utility function
                    console.log(`🎬 [InitialValueCoordinator] Applying timeline initial value: ${propertyName}=${value}`);
                    applyProperty(animatedElement, propertyName, value);
                } catch (error) {
                    console.error(`🎨 [InitialValueCoordinator] Error applying initial ${propertyName}:`, error);
                }
            });
        });
    }
    
    /**
     * Check if element has a distributed value applied for a property
     * This prevents timeline initial values from overriding distributed initial values
     */
    private elementHasDistributedValueApplied(element: HTMLElement, propertyName: string): boolean {
        // Check if element has a data attribute indicating distributed value was applied
        const distributedMarker = element.getAttribute(`data-fame-distributed-${propertyName}`);
        return distributedMarker === 'true';
    }
    
    /**
     * Apply legacy initial values
     * 
     * COPIED FROM: AnimationOrchestrator legacy initial value application
     */
    private applyLegacyInitialValues(slot: AnimationSlot, animatedElements: HTMLElement[]): void {
        animatedElements.forEach((animatedElement) => {
            applyInitialValues(animatedElement, slot.properties);
        });
    }
    
    /**
     * Reset initial values to natural state
     * 
     * COPIED FROM: AnimationOrchestrator reset logic
     */
    private resetInitialValuesOnElements(slot: AnimationSlot, animatedElements: HTMLElement[]): void {
        animatedElements.forEach((animatedElement) => {
            resetInitialValues(animatedElement, slot.properties);
        });
    }
} 