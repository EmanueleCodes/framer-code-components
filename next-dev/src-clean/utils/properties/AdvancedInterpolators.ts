/**
 * FAME Animation System - Advanced Property Interpolators
 * 
 * @fileOverview Specialized interpolators for complex CSS properties
 * @version 1.1.0-enhanced-gradient-support
 * @status ACTIVE - Enhanced gradient interpolation support
 * 
 * @description
 * Advanced interpolation functions for complex CSS properties including:
 * - Enhanced gradient interpolation (linear, radial, conic) with sophisticated parsing
 * - Clip path interpolation (inset, polygon, circle, ellipse)
 * - Text background image effects
 * - Mask property interpolation
 * 
 * @features
 * ✅ Enhanced gradient interpolation with complex radial gradient positioning
 * ✅ Proper color stop parsing with negative values support
 * ✅ Robust position interpolation for gradient elements
 * ✅ Clip path interpolation for inset and polygon shapes
 * ✅ Text background clipping effects
 * ✅ Comprehensive parsing and validation
 * ✅ Fallback strategies for mismatched structures
 * 
 * @example
 * ```typescript
 * // Enhanced gradient interpolation
 * interpolateGradient(
 *   'radial-gradient(circle at 50% 200vh, rgb(246, 238, 232) 0px, rgb(0, 187, 199) 40vh, rgb(8, 43, 97) 50vh)',
 *   'radial-gradient(circle at 50% -150vh, rgb(168, 255, 250) 50vh, rgb(0, 224, 255) 75vh, rgb(8, 43, 97) 120vh)',
 *   0.5
 * )
 * 
 * // Clip path interpolation
 * interpolateClipPath(
 *   'inset(0% 0% 0% 0%)',
 *   'inset(10% 10% 10% 10%)',
 *   0.3
 * )
 * ```
 */

import { PropertyValue } from '../../types/index.ts';

//=======================================
//        ENHANCED GRADIENT INTERPOLATION
//=======================================

/**
 * Parse a gradient string into its components
 * Enhanced version based on GradientInterpolationExample.tsx
 * Handles complex gradients with positioning, including negative values
 */
interface ParsedGradient {
    type: string; // 'linear-gradient', 'radial-gradient', 'conic-gradient'
    position?: string; // Direction, positioning like "circle at 50% 200vh"
    colorStops: Array<{
        color: string;
        position: string;
    }>;
    originalString: string;
}

/**
 * Enhanced gradient parsing that handles linear, radial, and conic gradients
 * Based on the sophisticated implementation from GradientInterpolationExample.tsx
 * Properly handles complex radial gradients with positioning and negative values
 */
export function parseGradient(gradientString: string): ParsedGradient {
    const trimmed = gradientString.trim();
    
    // Extract gradient type first
    const typeMatch = trimmed.match(/^(linear-gradient|radial-gradient|conic-gradient)\s*\(/);
    if (!typeMatch) {
        throw new Error(`Invalid gradient format: ${gradientString}`);
    }
    
    const gradientType = typeMatch[1];
    const content = trimmed.slice(gradientType.length + 1, -1); // Remove type( and final )
    
    let position = "";
    let colorStopsString = content;
    
    // Handle different gradient types for positioning/direction
    if (gradientType === 'radial-gradient') {
        // For radial gradients, look for positioning like "circle at 50% 200vh"
        // Enhanced regex to properly capture negative values
        const positionMatch = content.match(/(circle at\s+)?([-+]?[0-9.]+[a-z%]+\s+[-+]?[0-9.]+[a-z%]+)/i);
        
        if (positionMatch) {
            // Extract position and remaining color stops
            const positionCoords = positionMatch[2] || "50% 50%";
            const fullPositionPart = `circle at ${positionCoords}`;
            const positionEndIndex = content.indexOf(fullPositionPart) + fullPositionPart.length;
            
            // Skip comma and whitespace after position
            let colorStopsStart = positionEndIndex;
            while (colorStopsStart < content.length && 
                   (content[colorStopsStart] === ',' || content[colorStopsStart] === ' ')) {
                colorStopsStart++;
            }
            
            colorStopsString = content.substring(colorStopsStart);
            position = fullPositionPart;
        }
    } else if (gradientType === 'linear-gradient') {
        // For linear gradients, look for direction like "45deg" or "to right"
        const directionMatch = content.match(/^([-+]?[0-9.]+deg|to\s+(?:top|bottom|left|right)(?:\s+(?:left|right|top|bottom))?)?(?:,\s*)?(.*)$/i);
        if (directionMatch && directionMatch[1]) {
            position = directionMatch[1];
            colorStopsString = directionMatch[2] || content;
        }
    } else if (gradientType === 'conic-gradient') {
        // For conic gradients, look for "from 0deg at center"
        const conicMatch = content.match(/^(?:from\s+[-+]?[0-9.]+deg)?\s*(?:at\s+[-+]?[0-9.]+[a-z%]+\s+[-+]?[0-9.]+[a-z%]+)?(?:,\s*)?(.*)$/i);
        if (conicMatch) {
            // Extract the full from/at part as position
            const fromAtPart = content.substring(0, content.length - conicMatch[1].length).replace(/,\s*$/, '').trim();
            if (fromAtPart) {
                position = fromAtPart;
            }
            colorStopsString = conicMatch[1] || content;
        }
    }

    // Parse color stops from the remaining string
    const colorStops: Array<{ color: string; position: string }> = [];
    
    // Enhanced regex to match various color formats with positions including negative values
    // This pattern matches rgba(...), rgb(...), and hex colors followed by a position value (including negative)
    const colorStopRegex =
        /(rgba\([^)]+\)|rgb\([^)]+\)|#[0-9a-f]{3,8})\s+([-+]?[0-9.]+(?:vh|px|%|em|rem))/gi;

    let match;
    while ((match = colorStopRegex.exec(colorStopsString)) !== null) {
        colorStops.push({
            color: match[1],
            position: match[2],
        });
    }

    // If no positioned color stops found, try to parse simple color stops
    if (colorStops.length === 0) {
        const simpleColorRegex = /((?:rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}|\b(?:red|blue|green|yellow|black|white|transparent|orange|purple|pink|gray|grey)\b))/gi;
        const colorMatches = colorStopsString.match(simpleColorRegex);
        const colors: string[] = colorMatches ? Array.from(colorMatches) : [];
        
        // Distribute colors evenly if no positions specified
        colors.forEach((color, index) => {
            const position = colors.length === 1 ? '50%' : `${(index / (colors.length - 1)) * 100}%`;
            colorStops.push({
                color: color.trim(),
                position: position
            });
        });
    }

    return {
        type: gradientType,
        position: position || undefined,
        colorStops,
        originalString: gradientString
    };
}

/**
 * Parse RGB/RGBA color string to an object
 * Enhanced to handle both RGB and RGBA with proper alpha channel
 */
function parseRgbColor(rgb: string): { r: number; g: number; b: number; a: number } {
    // Handle rgba format
    const rgbaMatch = rgb.match(
        /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/i
    );
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1], 10),
            g: parseInt(rgbaMatch[2], 10),
            b: parseInt(rgbaMatch[3], 10),
            a: parseFloat(rgbaMatch[4]),
        };
    }

    // Handle rgb format
    const rgbMatch = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
            a: 1, // Default alpha
        };
    }

    // Fallback
    return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Enhanced hex to RGB conversion that handles 3, 6, and 8 character hex values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove the hash if it exists
    hex = hex.replace(/^#/, "");

    // Parse the hex values
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }

    return { r, g, b };
}

/**
 * Enhanced color interpolation that handles RGB, RGBA, and hex colors
 * Based on the sophisticated implementation from GradientInterpolationExample.tsx
 */
function interpolateRgbColors(color1: string, color2: string, factor: number): string {
    // Parse colors - handle rgb(), rgba() and hex
    let c1, c2;

    if (color1.startsWith("rgb")) {
        c1 = parseRgbColor(color1);
    } else {
        c1 = { ...hexToRgb(color1.replace("#", "")), a: 1 };
    }

    if (color2.startsWith("rgb")) {
        c2 = parseRgbColor(color2);
    } else {
        c2 = { ...hexToRgb(color2.replace("#", "")), a: 1 };
    }

    // Interpolate each component
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    const a = parseFloat((c1.a + (c2.a - c1.a) * factor).toFixed(2)); // Alpha component

    // Return the interpolated color with alpha if needed
    return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Enhanced position interpolation that correctly handles negative values
 * Based on the sophisticated implementation from GradientInterpolationExample.tsx
 */
function interpolatePosition(pos1: string, pos2: string, progress: number): string {
    // Split positions into components, preserving negative signs
    const components1 = pos1.match(/([-+]?[0-9.]+[a-z%]+)/g) || [];
    const components2 = pos2.match(/([-+]?[0-9.]+[a-z%]+)/g) || [];

    if (components1.length !== components2.length) {
        // If structures don't match, return pos2 for progress > 0.5, otherwise pos1
        return progress > 0.5 ? pos2 : pos1;
    }

    // Interpolate each component
    const result = components1
        .map((comp, index) => {
            // This regex properly captures negative values
            const val1Match = comp.match(/([-+]?[0-9.]+)([a-z%]+)/);
            const val2Match = components2[index].match(
                /([-+]?[0-9.]+)([a-z%]+)/
            );

            if (val1Match && val2Match && val1Match[2] === val2Match[2]) {
                // Same unit, can interpolate
                const val1 = parseFloat(val1Match[1]);
                const val2 = parseFloat(val2Match[1]);
                const unit = val1Match[2];

                const interpolatedVal = val1 + (val2 - val1) * progress;
                // Make sure we preserve the sign correctly
                return `${interpolatedVal}${unit}`;
            }

            // Different units, can't interpolate
            return progress > 0.5 ? components2[index] : comp;
        })
        .join(" ");

    return result;
}

/**
 * Enhanced position value interpolation that properly handles negative values
 * Based on the sophisticated implementation from GradientInterpolationExample.tsx
 */
function interpolatePositionValue(pos1: string, pos2: string, progress: number): string {
    // Extract numeric part and unit, preserving negative signs
    const value1Match = pos1.match(/([-+]?[0-9.]+)([a-z%]+)/);
    const value2Match = pos2.match(/([-+]?[0-9.]+)([a-z%]+)/);

    if (value1Match && value2Match && value1Match[2] === value2Match[2]) {
        // Same unit, can interpolate
        const val1 = parseFloat(value1Match[1]);
        const val2 = parseFloat(value2Match[1]);
        const unit = value1Match[2];

        const interpolatedVal = val1 + (val2 - val1) * progress;
        // No need for special handling of negative signs, JavaScript will format them correctly
        return `${interpolatedVal}${unit}`;
    }

    // Different units, can't interpolate
    return progress > 0.5 ? pos2 : pos1;
}

/**
 * Enhanced gradient interpolation function
 * Based on the sophisticated implementation from GradientInterpolationExample.tsx
 * Supports linear, radial, and conic gradients with positioning, negative values, and multiple color stops
 */
export function interpolateGradient(gradient1: string, gradient2: string, progress: number): string {
    if (progress <= 0) return gradient1;
    if (progress >= 1) return gradient2;
    
    try {
        // Parse both gradients
        const parsed1 = parseGradient(gradient1);
        const parsed2 = parseGradient(gradient2);

        // If parsing failed, fall back to simple transition
        if (parsed1.colorStops.length === 0 || parsed2.colorStops.length === 0) {
            console.warn(
                "Failed to parse gradient structure:",
                parsed1.colorStops.length,
                parsed2.colorStops.length
            );
            return progress < 0.5 ? gradient1 : gradient2;
        }

        // Check if gradient types match
        if (parsed1.type !== parsed2.type) {
            console.warn('Gradient types differ, using step interpolation');
            return progress < 0.5 ? gradient1 : gradient2;
        }

        // Interpolate position/direction based on gradient type
        let interpolatedPosition = "";
        if (parsed1.position && parsed2.position) {
            if (parsed1.type === 'linear-gradient') {
                // Handle linear gradient direction interpolation
                interpolatedPosition = interpolateLinearDirection(parsed1.position, parsed2.position, progress);
            } else if (parsed1.type === 'radial-gradient') {
                // Handle radial gradient positioning with enhanced logic
                interpolatedPosition = interpolateRadialPosition(parsed1.position, parsed2.position, progress);
            } else if (parsed1.type === 'conic-gradient') {
                // Handle conic gradient positioning
                interpolatedPosition = interpolateConicPosition(parsed1.position, parsed2.position, progress);
            }
        } else {
            interpolatedPosition = parsed1.position || parsed2.position || "";
        }

        // Build interpolated gradient
        let result = `${parsed1.type}(`;
        
        // Add position/direction if present
        if (interpolatedPosition) {
            result += interpolatedPosition + ', ';
        }

        // Get the number of color stops to use (use the max of both gradients)
        const stopCount = Math.max(
            parsed1.colorStops.length,
            parsed2.colorStops.length
        );

        // Interpolate each color stop
        const interpolatedStops: string[] = [];
        for (let i = 0; i < stopCount; i++) {
            // Get stops from each gradient, or use the last one if index is out of bounds
            const stop1 =
                i < parsed1.colorStops.length
                    ? parsed1.colorStops[i]
                    : parsed1.colorStops[parsed1.colorStops.length - 1];

            const stop2 =
                i < parsed2.colorStops.length
                    ? parsed2.colorStops[i]
                    : parsed2.colorStops[parsed2.colorStops.length - 1];

            // Interpolate color
            const interpolatedColor = interpolateRgbColors(
                stop1.color,
                stop2.color,
                progress
            );

            // Interpolate position value using the enhanced helper function
            const interpolatedPos = interpolatePositionValue(
                stop1.position,
                stop2.position,
                progress
            );

            // Add to result
            interpolatedStops.push(`${interpolatedColor} ${interpolatedPos}`);
        }

        // Add all color stops
        result += interpolatedStops.join(', ');

        // Close the gradient
        result += ")";

        return result;
        
    } catch (error) {
        console.warn('Enhanced gradient interpolation failed:', error);
        return progress < 0.5 ? gradient1 : gradient2;
    }
}

/**
 * Interpolate linear gradient direction (angles, keywords)
 */
function interpolateLinearDirection(from: string, to: string, progress: number): string {
    // Try to parse as angles first
    const fromAngle = parseAngle(from);
    const toAngle = parseAngle(to);
    
    if (fromAngle !== null && toAngle !== null) {
        const interpolatedAngle = fromAngle + (toAngle - fromAngle) * progress;
        return `${interpolatedAngle}deg`;
    }
    
    // For non-angle directions (keywords), use step interpolation
    return progress < 0.5 ? from : to;
}

/**
 * Enhanced interpolate radial gradient positioning
 * Handles complex radial gradient positioning like "circle at 50% 200vh"
 */
function interpolateRadialPosition(from: string, to: string, progress: number): string {
    // Use the enhanced position interpolation for radial gradients
    return interpolatePosition(from, to, progress);
}

/**
 * Interpolate conic gradient positioning
 */
function interpolateConicPosition(from: string, to: string, progress: number): string {
    // For conic gradients, interpolate angle and position separately
    // This is a simplified approach - could be enhanced further
    return progress < 0.5 ? from : to;
}

/**
 * Parse angle from direction string (enhanced from original)
 */
function parseAngle(direction: string): number | null {
    const angleMatch = direction.match(/([-+]?[0-9]*\.?[0-9]+)deg/);
    if (angleMatch) {
        return parseFloat(angleMatch[1]);
    }
    
    // Convert keywords to angles
    const keywordAngles: Record<string, number> = {
        'to top': 0,
        'to right': 90,
        'to bottom': 180,
        'to left': 270,
        'to top right': 45,
        'to bottom right': 135,
        'to bottom left': 225,
        'to top left': 315
    };
    
    return keywordAngles[direction.toLowerCase()] ?? null;
}

//=======================================
//        CLIP PATH INTERPOLATION
//=======================================

/**
 * Parse clip path string into structured format
 */
interface ParsedClipPath {
    type: 'inset' | 'polygon' | 'circle' | 'ellipse';
    values: string[];
    originalString: string;
}

/**
 * Parse clip path string
 */
export function parseClipPath(clipPath: string): ParsedClipPath {
    const trimmed = clipPath.trim();
    
    // Handle inset()
    const insetMatch = trimmed.match(/inset\s*\(\s*([^)]+)\s*\)/);
    if (insetMatch) {
        const values = insetMatch[1].split(/\s+/).map(v => v.trim());
        return {
            type: 'inset',
            values,
            originalString: clipPath
        };
    }
    
    // Handle polygon()
    const polygonMatch = trimmed.match(/polygon\s*\(\s*([^)]+)\s*\)/);
    if (polygonMatch) {
        const values = polygonMatch[1].split(',').map(v => v.trim());
        return {
            type: 'polygon',
            values,
            originalString: clipPath
        };
    }
    
    // Handle circle()
    const circleMatch = trimmed.match(/circle\s*\(\s*([^)]+)\s*\)/);
    if (circleMatch) {
        const values = circleMatch[1].split(/\s+/).map(v => v.trim());
        return {
            type: 'circle',
            values,
            originalString: clipPath
        };
    }
    
    // Handle ellipse()
    const ellipseMatch = trimmed.match(/ellipse\s*\(\s*([^)]+)\s*\)/);
    if (ellipseMatch) {
        const values = ellipseMatch[1].split(/\s+/).map(v => v.trim());
        return {
            type: 'ellipse',
            values,
            originalString: clipPath
        };
    }
    
    throw new Error(`Unsupported clip path format: ${clipPath}`);
}

/**
 * Interpolate between two clip paths
 */
export function interpolateClipPath(from: string, to: string, progress: number): string {
    if (progress <= 0) return from;
    if (progress >= 1) return to;
    
    try {
        const fromParsed = parseClipPath(from);
        const toParsed = parseClipPath(to);
        
        // Check if clip path types match
        if (fromParsed.type !== toParsed.type) {
            console.warn('Clip path types differ, using step interpolation');
            return progress < 0.5 ? from : to;
        }
        
        // Check if value counts match
        if (fromParsed.values.length !== toParsed.values.length) {
            console.warn('Clip path value counts differ, using step interpolation');
            return progress < 0.5 ? from : to;
        }
        
        // Interpolate values
        const interpolatedValues = fromParsed.values.map((fromValue, index) => {
            const toValue = toParsed.values[index];
            return interpolateClipPathValue(fromValue, toValue, progress);
        });
        
        // Rebuild clip path
        if (fromParsed.type === 'inset') {
            return `inset(${interpolatedValues.join(' ')})`;
        } else if (fromParsed.type === 'polygon') {
            return `polygon(${interpolatedValues.join(', ')})`;
        } else if (fromParsed.type === 'circle') {
            return `circle(${interpolatedValues.join(' ')})`;
        } else if (fromParsed.type === 'ellipse') {
            return `ellipse(${interpolatedValues.join(' ')})`;
        }
        
        return progress < 0.5 ? from : to;
        
    } catch (error) {
        console.warn('Clip path interpolation failed:', error);
        return progress < 0.5 ? from : to;
    }
}

/**
 * Interpolate individual clip path values
 */
function interpolateClipPathValue(from: string, to: string, progress: number): string {
    // Try to parse as numeric value with unit
    const fromMatch = from.match(/([-+]?[0-9]*\.?[0-9]+)([a-z%]*)/);
    const toMatch = to.match(/([-+]?[0-9]*\.?[0-9]+)([a-z%]*)/);
    
    if (fromMatch && toMatch && fromMatch[2] === toMatch[2]) {
        const fromValue = parseFloat(fromMatch[1]);
        const toValue = parseFloat(toMatch[1]);
        const unit = fromMatch[2];
        
        const interpolatedValue = fromValue + (toValue - fromValue) * progress;
        return `${interpolatedValue}${unit}`;
    }
    
    // For non-numeric values, use step interpolation
    return progress < 0.5 ? from : to;
}

//=======================================
//        TEXT BACKGROUND IMAGE UTILITIES
//=======================================

/**
 * Apply text background image styles to an element
 */
export function applyTextBackgroundImage(element: HTMLElement, backgroundImage: string): void {
    // Make text transparent
    element.style.color = 'transparent';
    
    // Apply background image
    element.style.backgroundImage = backgroundImage;
    
    // Clip background to text
    element.style.webkitBackgroundClip = 'text';
    element.style.backgroundClip = 'text';
    
    // Ensure proper display mode
    element.style.display = 'inline-block';
    
    // Set background size and position
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
}

/**
 * Find text element for background image application
 */
export function findTextElement(element: HTMLElement): HTMLElement | null {
    // Check if this is already a text element
    if (element.getAttribute('data-framer-component-type') === 'Text') {
        return element;
    }
    
    // Check if element has direct text content
    if (element.childNodes && 
        element.childNodes.length === 1 && 
        element.childNodes[0].nodeType === Node.TEXT_NODE &&
        element.childNodes[0].textContent?.trim()) {
        return element;
    }
    
    // Look for Framer text elements
    const framerTextElements = element.querySelectorAll('[data-framer-component-type="Text"]');
    if (framerTextElements.length > 0) {
        return framerTextElements[0] as HTMLElement;
    }
    
    // Look for common text tags
    const textTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
    for (const tag of textTags) {
        const elements = element.getElementsByTagName(tag);
        if (elements.length > 0) {
            return elements[0] as HTMLElement;
        }
    }
    
    // Recursive search in children
    for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i] as HTMLElement;
        const textElement = findTextElement(child);
        if (textElement) {
            return textElement;
        }
    }
    
    return null;
}

//=======================================
//        BACKGROUND PROPERTY INTERPOLATION
//=======================================

/**
 * Interpolate background position values
 * Handles both percentage and keyword values
 */
export function interpolateBackgroundPosition(from: string, to: string, progress: number): string {
    if (progress <= 0) return from;
    if (progress >= 1) return to;
    
    try {
        // Try to parse as space-separated position values
        const fromParts = parseBackgroundPosition(from);
        const toParts = parseBackgroundPosition(to);
        
        if (fromParts && toParts && fromParts.length === toParts.length) {
            const interpolatedParts = fromParts.map((fromPart, index) => {
                const toPart = toParts[index];
                return interpolatePositionComponent(fromPart, toPart, progress);
            });
            
            return interpolatedParts.join(' ');
        }
        
        // Fallback to step interpolation for incompatible formats
        return progress < 0.5 ? from : to;
        
    } catch (error) {
        console.warn('Background position interpolation failed:', error);
        return progress < 0.5 ? from : to;
    }
}

/**
 * Interpolate background size values
 * Handles numeric values and falls back to step for keywords
 */
export function interpolateBackgroundSize(from: string, to: string, progress: number): string {
    if (progress <= 0) return from;
    if (progress >= 1) return to;
    
    try {
        // Check if both values are numeric (with units)
        const fromParts = parseBackgroundSize(from);
        const toParts = parseBackgroundSize(to);
        
        if (fromParts && toParts && fromParts.isNumeric && toParts.isNumeric) {
            // Both are numeric, interpolate smoothly
            const interpolatedX = interpolatePositionValue(fromParts.x, toParts.x, progress);
            const interpolatedY = fromParts.y && toParts.y 
                ? interpolatePositionValue(fromParts.y, toParts.y, progress)
                : fromParts.y || toParts.y || interpolatedX;
            
            return fromParts.y || toParts.y ? `${interpolatedX} ${interpolatedY}` : interpolatedX;
        }
        
        // Fallback to step interpolation for keywords like "cover", "contain"
        return progress < 0.5 ? from : to;
        
    } catch (error) {
        console.warn('Background size interpolation failed:', error);
        return progress < 0.5 ? from : to;
    }
}

/**
 * Enhanced interpolation for complex CSS values
 * Attempts to interpolate numeric components while preserving structure
 */
export function interpolateComplexCSSValue(from: string, to: string, progress: number): string {
    if (progress <= 0) return from;
    if (progress >= 1) return to;
    
    try {
        // Handle box-shadow and text-shadow
        if ((from.includes('px') || from.includes('%')) && 
            (to.includes('px') || to.includes('%'))) {
            return interpolateCSSShadow(from, to, progress);
        }
        
        // Handle filter values
        if (from.includes('blur(') || from.includes('brightness(') || 
            to.includes('blur(') || to.includes('brightness(')) {
            return interpolateCSSFilter(from, to, progress);
        }
        
        // Fallback to step interpolation
        return progress < 0.5 ? from : to;
        
    } catch (error) {
        console.warn('Complex CSS value interpolation failed:', error);
        return progress < 0.5 ? from : to;
    }
}

//=======================================
//        HELPER FUNCTIONS
//=======================================

/**
 * Parse background position into components
 */
function parseBackgroundPosition(position: string): string[] | null {
    const trimmed = position.trim();
    
    // Handle keyword combinations
    const keywordMap: Record<string, string> = {
        'top': '50% 0%',
        'bottom': '50% 100%',
        'left': '0% 50%',
        'right': '100% 50%',
        'center': '50% 50%',
        'top left': '0% 0%',
        'top right': '100% 0%',
        'bottom left': '0% 100%',
        'bottom right': '100% 100%',
        'left top': '0% 0%',
        'right top': '100% 0%',
        'left bottom': '0% 100%',
        'right bottom': '100% 100%'
    };
    
    if (keywordMap[trimmed]) {
        return keywordMap[trimmed].split(' ');
    }
    
    // Handle numeric values
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1 && parts.length <= 2) {
        // Convert single value to x y format
        if (parts.length === 1) {
            parts.push('50%'); // Default y position
        }
        return parts;
    }
    
    return null;
}

/**
 * Parse background size into components
 */
function parseBackgroundSize(size: string): { x: string; y?: string; isNumeric: boolean } | null {
    const trimmed = size.trim();
    
    // Keywords
    if (trimmed === 'auto' || trimmed === 'cover' || trimmed === 'contain') {
        return { x: trimmed, isNumeric: false };
    }
    
    // Numeric values
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        const isNumeric = hasNumericValue(parts[0]);
        return { x: parts[0], isNumeric };
    } else if (parts.length === 2) {
        const isNumeric = hasNumericValue(parts[0]) && hasNumericValue(parts[1]);
        return { x: parts[0], y: parts[1], isNumeric };
    }
    
    return null;
}

/**
 * Check if a value contains numeric components
 */
function hasNumericValue(value: string): boolean {
    return /^\d+(\.\d+)?(px|%|em|rem|vw|vh)$/.test(value.trim());
}

/**
 * Interpolate individual position components
 */
function interpolatePositionComponent(from: string, to: string, progress: number): string {
    // Try to interpolate as position values
    return interpolatePositionValue(from, to, progress);
}

/**
 * Interpolate CSS shadow values (box-shadow, text-shadow)
 */
function interpolateCSSShadow(from: string, to: string, progress: number): string {
    // Simple approach: try to interpolate numeric components
    const fromNumbers = extractNumbers(from);
    const toNumbers = extractNumbers(to);
    
    if (fromNumbers.length === toNumbers.length && fromNumbers.length > 0) {
        let result = from;
        for (let i = 0; i < fromNumbers.length; i++) {
            const interpolatedValue = fromNumbers[i] + (toNumbers[i] - fromNumbers[i]) * progress;
            // Replace the first occurrence of the original number
            result = result.replace(fromNumbers[i].toString(), interpolatedValue.toString());
        }
        return result;
    }
    
    return progress < 0.5 ? from : to;
}

/**
 * Interpolate CSS filter values
 */
function interpolateCSSFilter(from: string, to: string, progress: number): string {
    // Simple approach for common filter functions
    if (from.includes('blur(') && to.includes('blur(')) {
        const fromBlur = extractFilterValue(from, 'blur');
        const toBlur = extractFilterValue(to, 'blur');
        
        if (fromBlur !== null && toBlur !== null) {
            const interpolatedBlur = fromBlur + (toBlur - fromBlur) * progress;
            return `blur(${interpolatedBlur}px)`;
        }
    }
    
    if (from.includes('brightness(') && to.includes('brightness(')) {
        const fromBrightness = extractFilterValue(from, 'brightness');
        const toBrightness = extractFilterValue(to, 'brightness');
        
        if (fromBrightness !== null && toBrightness !== null) {
            const interpolatedBrightness = fromBrightness + (toBrightness - fromBrightness) * progress;
            return `brightness(${interpolatedBrightness})`;
        }
    }
    
    return progress < 0.5 ? from : to;
}

/**
 * Extract numeric values from a string
 */
function extractNumbers(str: string): number[] {
    const matches = str.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(parseFloat) : [];
}

/**
 * Extract value from CSS filter function
 */
function extractFilterValue(str: string, functionName: string): number | null {
    const regex = new RegExp(`${functionName}\\((\\d+(?:\\.\\d+)?)(?:px)?\\)`);
    const match = str.match(regex);
    return match ? parseFloat(match[1]) : null;
}

//=======================================
//        VALIDATION FUNCTIONS
//=======================================

/**
 * Validate background position value
 */
export function isValidBackgroundPosition(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    const trimmed = value.trim();
    
    // Keywords
    const validKeywords = [
        'top', 'bottom', 'left', 'right', 'center',
        'top left', 'top right', 'bottom left', 'bottom right',
        'left top', 'right top', 'left bottom', 'right bottom'
    ];
    
    if (validKeywords.includes(trimmed)) return true;
    
    // Numeric values
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1 && parts.length <= 2) {
        return parts.every(part => 
            /^-?\d+(\.\d+)?(px|%|em|rem|vw|vh)$/.test(part) || 
            ['top', 'bottom', 'left', 'right', 'center'].includes(part)
        );
    }
    
    return false;
}

/**
 * Validate background size value
 */
export function isValidBackgroundSize(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    const trimmed = value.trim();
    
    // Keywords
    if (['auto', 'cover', 'contain'].includes(trimmed)) return true;
    
    // Numeric values
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1 && parts.length <= 2) {
        return parts.every(part => 
            /^\d+(\.\d+)?(px|%|em|rem|vw|vh)$/.test(part) || part === 'auto'
        );
    }
    
    return false;
} 