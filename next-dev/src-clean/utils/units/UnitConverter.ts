/**
 * FAME Animation System - Unit Converter
 * 
 * @fileOverview Convert any CSS unit to pixels for interpolation
 * @version 2.1.0-cross-unit-support
 * @status ACTIVE - Comprehensive unit conversion
 * 
 * @description
 * Converts CSS units to pixels for numerical interpolation.
 * Supports viewport units, relative units, and absolute units.
 * Essential for cross-unit animations.
 * 
 * @features
 * ✅ Viewport units (vh, vw, vmin, vmax)
 * ✅ Relative units (%, em, rem)
 * ✅ Absolute units (px, pt, in, cm, mm)
 * ✅ Context-aware conversions
 * ✅ calc() expression evaluation
 * ✅ Performance optimized
 * 
 * @example
 * ```typescript
 * convertToPixels('20vw', context) // 384px (on 1920px viewport)
 * convertToPixels('50%', context)  // 250px (on 500px container)
 * convertToPixels('2rem', context) // 32px (16px root font)
 * ```
 */

import { ConversionContext } from './types.ts';
import { parseCSSValue } from './CSSExpressionParser.ts';

/**
 * Convert any CSS value to pixels
 * 
 * @param value - CSS value with unit
 * @param context - Conversion context (element, viewport)
 * @returns Value in pixels
 */
export function convertToPixels(value: string, context: ConversionContext): number {
    if (!value || !context) {
        return 0;
    }
    
    // Handle calc() expressions separately
    if (value.trim().startsWith('calc(')) {
        return evaluateCalcExpression(value, context);
    }
    
    // Parse the value
    const parsed = parseCSSValue(value);
    if (!parsed || parsed.type !== 'simple' || typeof parsed.value !== 'number') {
        return 0;
    }
    
    const numericValue = parsed.value;
    const unit = parsed.unit;
    
    return convertUnitToPixels(numericValue, unit, context);
}

/**
 * Convert a numeric value with unit to pixels
 * 
 * @param value - Numeric value
 * @param unit - CSS unit
 * @param context - Conversion context
 * @returns Value in pixels
 */
export function convertUnitToPixels(value: number, unit: string, context: ConversionContext): number {
    switch (unit) {
        // Absolute units
        case 'px':
            return value;
        case 'pt':
            return value * 1.333333; // 1pt = 1.333px
        case 'pc':
            return value * 16; // 1pc = 16px
        case 'in':
            return value * 96; // 1in = 96px
        case 'cm':
            return value * 37.795276; // 1cm = 37.795px
        case 'mm':
            return value * 3.779528; // 1mm = 3.779px
            
        // Viewport units
        case 'vw':
            return (value / 100) * context.viewportWidth;
        case 'vh':
            return (value / 100) * context.viewportHeight;
        case 'vmin':
            return (value / 100) * Math.min(context.viewportWidth, context.viewportHeight);
        case 'vmax':
            return (value / 100) * Math.max(context.viewportWidth, context.viewportHeight);
            
        // Relative units
        case '%':
            // Percentage is context-dependent (width, height, font-size, etc.)
            return convertPercentageToPixels(value, context);
        case 'em':
            return value * (context.elementFontSize || 16);
        case 'rem':
            return value * (context.rootFontSize || 16);
            
        // Angular units (for transform properties)
        case 'deg':
            return value; // Keep degrees as-is for transforms
        case 'rad':
            return value * (180 / Math.PI); // Convert to degrees
        case 'turn':
            return value * 360; // Convert to degrees
            
        // Unitless values
        case '':
            return value;
            
        default:
            console.warn(`Unknown unit: ${unit}, treating as pixels`);
            return value;
    }
}

/**
 * Convert percentage to pixels (context-dependent)
 * 
 * @param value - Percentage value
 * @param context - Conversion context
 * @returns Value in pixels
 */
function convertPercentageToPixels(value: number, context: ConversionContext): number {
    // For most properties, percentage refers to parent width
    // This is a simplified approach - real CSS is more complex
    if (context.parentWidth) {
        return (value / 100) * context.parentWidth;
    } else if (context.elementWidth) {
        return (value / 100) * context.elementWidth;
    } else {
        // Fallback to viewport width
        return (value / 100) * context.viewportWidth;
    }
}

/**
 * Basic calc() expression evaluator
 * 
 * @param expression - calc() expression
 * @param context - Conversion context
 * @returns Evaluated result in pixels
 */
function evaluateCalcExpression(expression: string, context: ConversionContext): number {
    // Remove 'calc(' and trailing ')'
    const innerExpression = expression.slice(5, -1).trim();
    
    try {
        return evaluateExpression(innerExpression, context);
    } catch (error) {
        console.warn('Failed to evaluate calc() expression:', expression, error);
        return 0;
    }
}

/**
 * Evaluate mathematical expression with units
 * 
 * @param expression - Mathematical expression
 * @param context - Conversion context
 * @returns Result in pixels
 */
function evaluateExpression(expression: string, context: ConversionContext): number {
    // Handle simple binary operations: "50% - 20px"
    const operators = ['+', '-', '*', '/'];
    
    for (const operator of operators) {
        const operatorIndex = findOperatorIndex(expression, operator);
        if (operatorIndex !== -1) {
            const left = expression.slice(0, operatorIndex).trim();
            const right = expression.slice(operatorIndex + 1).trim();
            
            const leftValue = parseOperand(left, context);
            const rightValue = parseOperand(right, context);
            
            switch (operator) {
                case '+':
                    return leftValue + rightValue;
                case '-':
                    return leftValue - rightValue;
                case '*':
                    return leftValue * rightValue;
                case '/':
                    return rightValue !== 0 ? leftValue / rightValue : 0;
            }
        }
    }
    
    // No operator found, parse as single operand
    return parseOperand(expression, context);
}

/**
 * Find operator index, respecting parentheses
 * 
 * @param expression - Expression to search
 * @param operator - Operator to find
 * @returns Index of operator or -1 if not found
 */
function findOperatorIndex(expression: string, operator: string): number {
    let parenthesesCount = 0;
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        if (char === '(') {
            parenthesesCount++;
        } else if (char === ')') {
            parenthesesCount--;
        } else if (char === operator && parenthesesCount === 0) {
            return i;
        }
    }
    
    return -1;
}

/**
 * Parse operand (value with unit) to pixels
 * 
 * @param operand - Operand string
 * @param context - Conversion context
 * @returns Value in pixels
 */
function parseOperand(operand: string, context: ConversionContext): number {
    // Handle nested calc() expressions
    if (operand.startsWith('calc(')) {
        return evaluateCalcExpression(operand, context);
    }
    
    // Handle parentheses
    if (operand.startsWith('(') && operand.endsWith(')')) {
        return evaluateExpression(operand.slice(1, -1), context);
    }
    
    // Parse as CSS value
    return convertToPixels(operand, context);
}

/**
 * Convert pixels back to a target unit
 * 
 * @param pixels - Value in pixels
 * @param targetUnit - Target unit
 * @param context - Conversion context
 * @returns Value in target unit
 */
export function convertPixelsToUnit(pixels: number, targetUnit: string, context: ConversionContext): number {
    switch (targetUnit) {
        case 'px':
            return pixels;
        case 'vw':
            return (pixels / context.viewportWidth) * 100;
        case 'vh':
            return (pixels / context.viewportHeight) * 100;
        case 'vmin':
            return (pixels / Math.min(context.viewportWidth, context.viewportHeight)) * 100;
        case 'vmax':
            return (pixels / Math.max(context.viewportWidth, context.viewportHeight)) * 100;
        case '%':
            const parentSize = context.parentWidth || context.viewportWidth;
            return (pixels / parentSize) * 100;
        case 'em':
            return pixels / (context.elementFontSize || 16);
        case 'rem':
            return pixels / (context.rootFontSize || 16);
        case 'pt':
            return pixels / 1.333333;
        case 'pc':
            return pixels / 16;
        case 'in':
            return pixels / 96;
        case 'cm':
            return pixels / 37.795276;
        case 'mm':
            return pixels / 3.779528;
        default:
            return pixels;
    }
}

/**
 * Check if a unit requires context for conversion
 * 
 * @param unit - CSS unit
 * @returns True if unit needs element/viewport context
 */
export function requiresContext(unit: string): boolean {
    const contextDependentUnits = ['vw', 'vh', 'vmin', 'vmax', '%', 'em', 'rem'];
    return contextDependentUnits.includes(unit);
} 