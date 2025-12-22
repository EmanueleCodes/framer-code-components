/**
 * FAME Animation System - Style Slot Adapter
 * 
 * @fileOverview Converts between Framer style property controls and internal StyleSlot format
 * @version 2.0.0-clean
 * @status ACTIVE - StyleSlot conversion and validation
 * 
 * @description
 * This adapter converts style property controls data from Framer UI into clean
 * internal StyleSlot format. Style slots manage static styling configurations
 * that are applied immediately on component mount using InitialValueCoordinator.
 * 
 * @data_flow
 * Framer Style Property Controls → StyleSlotAdapter → Internal StyleSlot → InitialValueCoordinator
 * 
 * @key_features
 * - Converts property controls format to StyleSlot format
 * - Validates CSS property values with error reporting
 * - Builds AnimatedElement array from targetElements
 * - Handles dynamic property values from UI controls
 * - No animation logic (pure static CSS application)
 */

import {
    StyleSlot,
    StyleSlotInput,
    StyleProperty,
    StyleValidationError,
    AnimatedElement,
    ElementSelection,
    SelectionCriteria,
    ElementScope,
    CriteriaType,
    ScopeDepth
} from "../../types/index.ts";

import { validateCSSProperty } from "../properties/PropertyRegistry.ts";

/**
 * Convert from style property controls format to internal StyleSlot format
 * 
 * @param propertyControlsSlot Style slot in property controls format
 * @returns Converted StyleSlot in internal format with validation
 */
export function toInternalFormat(propertyControlsSlot: any): StyleSlot {
    const id = `style-slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = propertyControlsSlot.name || "Unnamed Style";

    // Convert target elements
    const targetElements = convertTargetElements(propertyControlsSlot.targetElements || []);

    // Convert CSS properties with validation
    const { styleProperties, validationErrors } = convertStyleProperties(
        propertyControlsSlot.activeProperties || [],
        propertyControlsSlot
    );

    // Log validation errors to console
    if (validationErrors.length > 0) {
        console.warn(`🎨 [StyleSlot] Validation errors for "${name}":`, validationErrors);
        validationErrors.forEach(error => {
            console.warn(`🎨 [StyleSlot] Invalid CSS: ${error.property}="${error.value}" - ${error.error}`);
        });
    }

    return {
        id,
        name,
        targetElements,
        styleProperties,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
    };
}

/**
 * Convert target elements from property controls format to AnimatedElement array
 */
function convertTargetElements(targetElementsData: any[]): AnimatedElement[] {
    if (!Array.isArray(targetElementsData)) {
        // Default to SELF if no target elements specified
        return [{
            selection: {
                scope: ElementScope.SELF,
                criteria: []
            }
        }];
    }

    return targetElementsData.map(targetData => {
        const scope = targetData.scope || ElementScope.SELF;
        const depth = targetData.depth || ScopeDepth.DIRECT; // Default to DIRECT for backward compatibility
        const criteria: SelectionCriteria[] = [];

        // Build criteria array from individual criteria fields
        if (targetData.criteriaType1 && targetData.criteriaType1 !== "none" && targetData.criteriaValue1) {
            criteria.push({
                type: targetData.criteriaType1 as CriteriaType,
                value: targetData.criteriaValue1
            });
        }

        if (targetData.criteriaType2 && targetData.criteriaType2 !== "none" && targetData.criteriaValue2) {
            criteria.push({
                type: targetData.criteriaType2 as CriteriaType,
                value: targetData.criteriaValue2
            });
        }

        if (targetData.criteriaType3 && targetData.criteriaType3 !== "none" && targetData.criteriaValue3) {
            criteria.push({
                type: targetData.criteriaType3 as CriteriaType,
                value: targetData.criteriaValue3
            });
        }

        return {
            selection: {
                scope,
                criteria,
                depth
            }
        };
    });
}

/**
 * Convert CSS properties from property controls with validation
 */
function convertStyleProperties(
    activeProperties: string[],
    propertyControlsData: any
): { styleProperties: StyleProperty[]; validationErrors: StyleValidationError[] } {
    const styleProperties: StyleProperty[] = [];
    const validationErrors: StyleValidationError[] = [];

    activeProperties.forEach(propertyName => {
        const propertyData = propertyControlsData[propertyName];
        if (!propertyData) {
            console.warn(`🎨 [StyleSlot] No data found for property: ${propertyName}`);
            return;
        }

        // Extract value from property data
        let value = propertyData.value || "";
        
        // Handle different value types
        if (typeof value === "number") {
            value = value.toString();
        } else if (typeof value === "boolean") {
            value = value ? "true" : "false";
        }

        // Skip empty values
        if (!value || value.trim() === "") {
            console.warn(`🎨 [StyleSlot] Empty value for property: ${propertyName}`);
            return;
        }

        // Validate CSS property value
        const validation = validateCSSProperty(propertyName, value);
        
        const styleProperty: StyleProperty = {
            property: propertyName,
            value: value.toString(),
            unit: propertyData.unit || undefined,
            isValid: validation.isValid,
            validationError: validation.error
        };

        styleProperties.push(styleProperty);

        // Track validation errors
        if (!validation.isValid) {
            validationErrors.push({
                property: propertyName,
                value: value.toString(),
                error: validation.error || "Unknown validation error",
                timestamp: Date.now()
            });
        }
    });

    return { styleProperties, validationErrors };
}

/**
 * Convert from internal StyleSlot format back to property controls format
 * (Mainly for debugging and testing purposes)
 */
export function fromInternalFormat(internalSlot: StyleSlot): StyleSlotInput {
    return {
        name: internalSlot.name,
        targetElements: internalSlot.targetElements,
        activeProperties: internalSlot.styleProperties.map(prop => prop.property)
        // Individual property values would need to be reconstructed
    };
}

/**
 * Convert array of style property controls to internal StyleSlot array
 */
export function convertSlotArray(propertyControlsSlots: any[]): StyleSlot[] {
    if (!Array.isArray(propertyControlsSlots)) {
        console.warn('🎨 [StyleSlotAdapter] Invalid input: expected array');
        return [];
    }

    return propertyControlsSlots.map(slot => toInternalFormat(slot));
}

/*
IMPLEMENTATION STATUS:
□ Define PropertyControlsStyleSlot interface
□ Define internal StyleSlot interface (in types)
□ Implement conversion methods
□ Add validation methods
□ Add error handling
□ Add comprehensive tests

PRIORITY: LOWER
- Focus on AnimationSlotAdapter first
- Implement after animation system is working
- May not be needed if styles are handled differently

NEXT STEPS:
1. Complete AnimationSlotAdapter first
2. Define style system requirements
3. Implement StyleSlot types
4. Implement conversion logic
*/ 