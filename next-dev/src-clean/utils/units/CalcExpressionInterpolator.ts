/**
 * @file CalcExpressionInterpolator.ts
 * @description Specialized interpolator for calc() expressions that maintains mathematical relationships during animation
 * 
 * @version 1.0.0
 * @since 1.0.0
 */

import { ConversionContext } from './types.ts';
import { parseCSSValue } from './CSSExpressionParser.ts';
import { convertToPixels } from './UnitConverter.ts';

interface CalcTerm {
    coefficient: number;
    unit: string;
    operation?: '+' | '-' | '*' | '/' | undefined;
}

/**
 * Parse a calc expression into its component terms
 */
function parseCalcTerms(expression: string): CalcTerm[] {
    console.log('[CALC_DEBUG] Parsing calc expression:', expression);
    
    // Remove 'calc(' and ')'
    const inner = expression.replace(/^calc\((.*)\)$/, '$1').trim();
    console.log('[CALC_DEBUG] Stripped inner expression:', inner);
    
    // Split on + and - while preserving the operators and handling negative numbers
    // Use a more sophisticated regex to handle negative numbers
    const parts: string[] = [];
    let currentPart = '';
    let i = 0;
    
    while (i < inner.length) {
        const char = inner[i];
        
        if ((char === '+' || char === '-') && currentPart.trim() !== '') {
            // This is an operator, not part of a negative number
            if (currentPart.trim()) {
                parts.push(currentPart.trim());
            }
            parts.push(char);
            currentPart = '';
        } else {
            currentPart += char;
        }
        i++;
    }
    
    // Add the last part
    if (currentPart.trim()) {
        parts.push(currentPart.trim());
    }
    
    console.log('[CALC_DEBUG] Split terms:', parts);
    
    const result: CalcTerm[] = [];
    let currentOperation: '+' | '-' = '+';
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part === '+' || part === '-') {
            currentOperation = part;
            console.log('[CALC_DEBUG] Found operator:', currentOperation);
            continue;
        }
        
        // Parse coefficient and unit, handling negative values
        const match = part.match(/^(-?\d*\.?\d+)(.*)$/);
        if (match) {
            let coefficient = parseFloat(match[1]);
            const unit = match[2] || 'px';
            
            // Apply the operation to the coefficient
            if (currentOperation === '-') {
                coefficient = -coefficient;
            }
            
            const parsedTerm = {
                coefficient,
                unit,
                operation: i < parts.length - 1 ? currentOperation : undefined
            };
            console.log('[CALC_DEBUG] Parsed term:', parsedTerm);
            
            result.push(parsedTerm);
            
            // Reset operation for next term
            currentOperation = '+';
        }
    }
    
    console.log('[CALC_DEBUG] Final parsed terms:', result);
    return result;
}

/**
 * Interpolate between two calc expressions while maintaining their mathematical relationships
 */
export function interpolateCalc(
    fromValue: string,
    toValue: string,
    progress: number,
    element: HTMLElement,
    property: string
): string {
    console.log('[CALC_DEBUG] Starting calc interpolation:', {
        fromValue,
        toValue,
        progress,
        property,
        elementDimensions: {
            width: element.offsetWidth,
            height: element.offsetHeight
        }
    });
    
    // Special case: If fromValue is a percentage and toValue is a calc with percentage
    if (fromValue.endsWith('%') && toValue.includes('calc(') && toValue.includes('%')) {
        // Extract the percentage value from fromValue
        const fromPercent = parseFloat(fromValue);
        
        // Parse the calc expression to get its percentage component
        const calcMatch = toValue.match(/calc\(([-\d.]+)%\s*([+-])\s*([\d.]+)px\)/);
        if (calcMatch) {
            const [, toPercent, operator, pixels] = calcMatch;
            const toPercentNum = parseFloat(toPercent);
            const pixelsNum = parseFloat(pixels);
            
            // Interpolate the percentage and pixel components separately
            const interpolatedPercent = fromPercent + (toPercentNum - fromPercent) * progress;
            const interpolatedPixels = 0 + (pixelsNum) * progress;
            
            // Reconstruct the calc expression
            if (interpolatedPixels === 0) {
                return `${interpolatedPercent}%`;
            }
            return `calc(${interpolatedPercent}% ${operator} ${interpolatedPixels}px)`;
        }
    }
    
    // Handle non-calc expressions
    if (!fromValue.includes('calc(') && !toValue.includes('calc(')) {
        console.log('[CALC_DEBUG] Both values are non-calc, using simple interpolation');
        const fromPixels = convertToPixels(fromValue, { element } as ConversionContext);
        const toPixels = convertToPixels(toValue, { element } as ConversionContext);
        const result = `${fromPixels + (toPixels - fromPixels) * progress}px`;
        console.log('[CALC_DEBUG] Simple interpolation result:', result);
        return result;
    }
    
    // Convert simple values to calc format
    const normalizeValue = (value: string) => {
        if (!value.includes('calc(')) {
            // Special handling for percentage values
            if (value.endsWith('%')) {
                return value; // Keep percentage values as is
            }
            const parsed = parseCSSValue(value);
            if (parsed && parsed.type === 'simple') {
                const normalized = `calc(${parsed.value}${parsed.unit})`;
                console.log('[CALC_DEBUG] Normalized value:', { original: value, normalized });
                return normalized;
            }
        }
        return value;
    };
    
    const fromCalc = normalizeValue(fromValue);
    const toCalc = normalizeValue(toValue);
    console.log('[CALC_DEBUG] Normalized expressions:', { fromCalc, toCalc });
    
    // Parse terms from both expressions
    const fromTerms = parseCalcTerms(fromCalc);
    const toTerms = parseCalcTerms(toCalc);
    console.log('[CALC_DEBUG] Parsed terms:', { fromTerms, toTerms });
    
    // Interpolate each corresponding term
    const interpolatedTerms: CalcTerm[] = [];
    const maxTerms = Math.max(fromTerms.length, toTerms.length);
    
    for (let i = 0; i < maxTerms; i++) {
        const fromTerm = fromTerms[i] || { coefficient: 0, unit: toTerms[i].unit };
        const toTerm = toTerms[i] || { coefficient: 0, unit: fromTerms[i].unit };
        
        console.log('[CALC_DEBUG] Interpolating terms:', {
            index: i,
            fromTerm,
            toTerm,
            progress
        });
        
        // If units match, interpolate coefficients
        if (fromTerm.unit === toTerm.unit) {
            const interpolatedTerm = {
                coefficient: fromTerm.coefficient + (toTerm.coefficient - fromTerm.coefficient) * progress,
                unit: fromTerm.unit,
                operation: (i < maxTerms - 1 ? '+' : undefined) as '+' | undefined
            };
            console.log('[CALC_DEBUG] Interpolated matching units:', interpolatedTerm);
            interpolatedTerms.push(interpolatedTerm);
        } else {
            // For mismatched units, maintain both terms with weighted coefficients
            const fromWeighted = {
                coefficient: fromTerm.coefficient * (1 - progress),
                unit: fromTerm.unit,
                operation: '+' as const
            };
            const toWeighted = {
                coefficient: toTerm.coefficient * progress,
                unit: toTerm.unit,
                operation: (i < maxTerms - 1 ? '+' : undefined) as '+' | undefined
            };
            console.log('[CALC_DEBUG] Interpolated mismatched units:', {
                fromWeighted,
                toWeighted
            });
            
            // Only add terms if their coefficients are not 0
            if (fromWeighted.coefficient !== 0) {
                interpolatedTerms.push(fromWeighted);
            }
            if (toWeighted.coefficient !== 0) {
                interpolatedTerms.push(toWeighted);
            }
        }
    }
    
    // Build the interpolated calc expression
    if (interpolatedTerms.length === 0) {
        return '0';
    } else if (interpolatedTerms.length === 1 && !interpolatedTerms[0].operation) {
        // If we have a single term with no operation, return it directly
        const term = interpolatedTerms[0];
        return `${term.coefficient}${term.unit}`;
    }
    
    const calcString = interpolatedTerms
        .map((term, i) => {
            if (i === 0) {
                // First term doesn't need a sign if positive
                return `${term.coefficient}${term.unit}`;
            } else {
                // Subsequent terms need proper spacing and signs
                const sign = term.coefficient >= 0 ? ' + ' : ' - ';
                const absCoeff = Math.abs(term.coefficient);
                return `${sign}${absCoeff}${term.unit}`;
            }
        })
        .join('');
    
    const result = interpolatedTerms.length > 1 ? `calc(${calcString})` : calcString;
    console.log('[CALC_DEBUG] Final interpolated expression:', result);
    return result;
} 