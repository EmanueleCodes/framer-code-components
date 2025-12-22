/**
 * FAME Animation System - Units Types
 * 
 * @fileOverview Shared types for the units system
 * @version 2.1.0-cross-unit-support
 * @status ACTIVE - Shared types to avoid circular imports
 * 
 * @description
 * Shared type definitions for the cross-unit animation system.
 * Separated to avoid circular import issues in Framer environment.
 */

/**
 * Supported CSS units with categorization
 */
export enum CSSUnit {
    // Absolute units
    PX = 'px',
    PT = 'pt', 
    PC = 'pc',
    IN = 'in',
    CM = 'cm',
    MM = 'mm',
    
    // Relative units
    PERCENT = '%',
    EM = 'em', 
    REM = 'rem',
    
    // Viewport units
    VH = 'vh',
    VW = 'vw',
    VMIN = 'vmin',
    VMAX = 'vmax',
    
    // Angular units
    DEG = 'deg',
    RAD = 'rad',
    TURN = 'turn',
    
    // Time units
    S = 's',
    MS = 'ms'
}

/**
 * Unit categories for conversion logic
 */
export enum UnitCategory {
    ABSOLUTE = 'absolute',      // px, pt, in, cm, mm
    RELATIVE = 'relative',      // %, em, rem
    VIEWPORT = 'viewport',      // vh, vw, vmin, vmax
    ANGULAR = 'angular',        // deg, rad, turn
    TIME = 'time',             // s, ms
    UNKNOWN = 'unknown'
}

/**
 * Parsed CSS value with structured data
 */
export interface ParsedCSSValue {
    type: 'simple' | 'calc' | 'var' | 'complex';
    value: number | string;
    unit: CSSUnit | string;
    originalValue: string;
    
    // For calc() expressions
    expression?: {
        operator: '+' | '-' | '*' | '/';
        operands: ParsedCSSValue[];
    };
    
    // For variables
    variableName?: string;
    fallback?: ParsedCSSValue;
    
    // Conversion metadata
    category: UnitCategory;
    isValid: boolean;
}

/**
 * Context for unit conversions (element and viewport info)
 */
export interface ConversionContext {
    element: HTMLElement;
    viewportWidth: number;
    viewportHeight: number;
    elementWidth?: number;
    elementHeight?: number;
    parentWidth?: number;
    parentHeight?: number;
    rootFontSize?: number;
    elementFontSize?: number;
}

/**
 * Get unit category for conversion strategy
 * 
 * @param unit - CSS unit
 * @returns Unit category
 */
export function getUnitCategory(unit: string): UnitCategory {
    const absoluteUnits = ['px', 'pt', 'pc', 'in', 'cm', 'mm'];
    const relativeUnits = ['%', 'em', 'rem'];
    const viewportUnits = ['vh', 'vw', 'vmin', 'vmax'];
    const angularUnits = ['deg', 'rad', 'turn'];
    const timeUnits = ['s', 'ms'];
    
    if (absoluteUnits.includes(unit)) return UnitCategory.ABSOLUTE;
    if (relativeUnits.includes(unit)) return UnitCategory.RELATIVE;
    if (viewportUnits.includes(unit)) return UnitCategory.VIEWPORT;
    if (angularUnits.includes(unit)) return UnitCategory.ANGULAR;
    if (timeUnits.includes(unit)) return UnitCategory.TIME;
    
    return UnitCategory.UNKNOWN;
} 