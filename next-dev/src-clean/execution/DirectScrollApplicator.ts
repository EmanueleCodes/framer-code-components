/**
 * FAME Animation System - Direct Scroll Applicator
 * 
 * @fileOverview Ultra-optimized scroll property application that eliminates DOM bottlenecks
 * @version 1.1.0-special-properties
 * @status ACTIVE - Enhanced with special property support
 * 
 * @description
 * Eliminates major DOM bottlenecks found in scroll animations by:
 * - Using immediate property application (no RAF delays)
 * - Caching transform states to avoid getComputedStyle
 * - Batching DOM writes with single cssText updates
 * - Selective GPU acceleration only where needed
 * - Special property routing for textBackgroundImage, gradients, and clip paths
 * 
 * @features
 * ✅ 60fps scroll performance with optimized DOM writes
 * ✅ Cached transform state management
 * ✅ Special property detection and routing
 * ✅ Text background image support (finds text elements, applies clipping)
 * ✅ Gradient interpolation support
 * ✅ Clip path animation support
 * ✅ GPU acceleration only where beneficial
 * 
 * @architecture
 * Properties are categorized and handled optimally:
 * - Special properties → StyleApplicator.applyProperty() for complex processing
 * - Transform properties → Cached state + single transform string
 * - Regular properties → Batched cssText application
 */

import type { PropertyBatch } from './ScrollPropertyApplicator.ts';
import { applyProperty } from './StyleApplicator.ts';

/**
 * Simple transform state cache to avoid getComputedStyle calls
 */
interface TransformState {
    translateX?: string;
    translateY?: string;
    translateZ?: string;
    scale?: string;
    scaleX?: string;
    scaleY?: string;
    rotate?: string;
    rotateX?: string;
    rotateY?: string;
    rotateZ?: string;
    skewX?: string;
    skewY?: string;
}

/**
 * DirectScrollApplicator - Eliminates DOM bottlenecks for smooth scroll performance
 * 
 * @description
 * Ultra-optimized scroll property application that eliminates the major DOM bottlenecks
 * found in the current system. Designed specifically for scroll animations where
 * immediate response is critical.
 */
export class DirectScrollApplicator {
    private transformStates = new Map<HTMLElement, TransformState>();
    private gpuElements = new Set<HTMLElement>();
    
    /**
     * Apply properties to multiple elements with maximum performance
     * 
     * @description
     * ✅ OPTIMIZED: Immediate application, batched DOM writes, cached transforms
     */
    batchApplyDirect(batches: PropertyBatch[]): void {
        if (batches.length === 0) return;
        
        const startTime = performance.now();
        
        // Process batches immediately (no RAF delays)
        batches.forEach(batch => {
            this.applyPropertiesDirect(batch.element, batch.properties, batch.enableGPU);
        });
        
        const executionTime = performance.now() - startTime;
        // console.log(`🚀 [DirectScrollApplicator] Applied ${batches.length} batches in ${executionTime.toFixed(2)}ms`);
    }
    
    /**
     * Apply properties to a single element with optimized DOM writes
     * 
     * @description
     * ✅ OPTIMIZED: Single cssText update, cached transforms, minimal GPU acceleration
     * ✅ ENHANCED: Special handling for textBackgroundImage, gradients, and clip paths
     */
    private applyPropertiesDirect(
        element: HTMLElement,
        properties: Map<string, any>,
        enableGPU?: boolean
    ): void {
        if (!element || properties.size === 0) return;
        
        // Separate properties by type for optimized handling
        const transforms: TransformState = {};
        const styles: string[] = [];
        const specialProperties: Array<{ property: string; value: any }> = [];
        let hasTransforms = false;
        
        // Process all properties efficiently
        for (const [property, value] of properties.entries()) {
            const valueStr = String(value);
            
            // 🎨 SPECIAL PROPERTIES: Route through StyleApplicator for proper handling
            if (this.isSpecialProperty(property)) {
                specialProperties.push({ property, value: valueStr });
            }
            // Handle transform properties
            else if (this.isTransformProperty(property)) {
                transforms[property as keyof TransformState] = valueStr;
                hasTransforms = true;
            } else {
                // Convert camelCase to kebab-case and add to styles
                const cssProperty = this.camelToKebab(property);
                styles.push(`${cssProperty}: ${valueStr}`);
            }
        }
        
        // Apply special properties through StyleApplicator for proper handling
        if (specialProperties.length > 0) {
            specialProperties.forEach(({ property, value }) => {
                applyProperty(element, property, value);
            });
        }
        
        // Apply transforms efficiently
        if (hasTransforms) {
            this.applyTransformsDirect(element, transforms);
        }
        
        // Apply regular styles with single DOM write
        if (styles.length > 0) {
            this.applyStylesDirect(element, styles);
        }
        
        // Selective GPU acceleration
        if (enableGPU && hasTransforms && !this.gpuElements.has(element)) {
            this.enableSelectiveGPU(element);
        }
    }
    
    /**
     * Apply transforms efficiently without getComputedStyle calls
     * 
     * @description
     * ✅ OPTIMIZED: Uses cached transform state instead of expensive getComputedStyle
     */
    private applyTransformsDirect(element: HTMLElement, newTransforms: TransformState): void {
        // Get cached transform state or initialize
        let currentTransforms = this.transformStates.get(element);
        if (!currentTransforms) {
            currentTransforms = {};
            this.transformStates.set(element, currentTransforms);
        }
        
        // Update transform state
        Object.assign(currentTransforms, newTransforms);
        
        // Build transform string efficiently
        const transformParts: string[] = [];
        
        // Order matters for transforms
        const transformOrder: (keyof TransformState)[] = [
            'translateX', 'translateY', 'translateZ',
            'scaleX', 'scaleY', 'scale',
            'rotateX', 'rotateY', 'rotateZ', 'rotate',
            'skewX', 'skewY'
        ];
        
        transformOrder.forEach(prop => {
            const value = currentTransforms![prop];
            if (value !== undefined) {
                // Add units if needed
                const finalValue = this.addTransformUnits(prop, value);
                transformParts.push(`${prop}(${finalValue})`);
            }
        });
        
        // Apply complete transform with single DOM write
        if (transformParts.length > 0) {
            const transformString = transformParts.join(' ');
            element.style.transform = transformString;
        } else {
            element.style.transform = '';
        }
    }
    
    /**
     * Apply regular styles with batched DOM write
     * 
     * @description
     * ✅ OPTIMIZED: Single cssText modification instead of multiple setProperty calls
     */
    private applyStylesDirect(element: HTMLElement, styles: string[]): void {
        // Get current cssText and append new styles
        const currentStyles = element.style.cssText;
        const newStyleText = styles.join('; ');
        
        // Combine with existing styles efficiently
        if (currentStyles) {
            element.style.cssText = `${currentStyles}; ${newStyleText}`;
        } else {
            element.style.cssText = newStyleText;
        }
    }
    
    /**
     * Enable GPU acceleration selectively
     * 
     * @description
     * ✅ OPTIMIZED: Only for elements that actually need it
     */
    private enableSelectiveGPU(element: HTMLElement): void {
        // Only add GPU acceleration if not already added
        if (!this.gpuElements.has(element)) {
            element.style.willChange = 'transform';
            this.gpuElements.add(element);
        }
    }
    
    /**
     * Add appropriate units to transform values
     */
    private addTransformUnits(property: string, value: string): string {
        // Return as-is if already has units or is a calc expression
        if (/[a-zA-Z%]$/.test(value) || value.includes('calc(')) {
            return value;
        }
        
        // Add appropriate units based on property
        if (property.includes('translate')) {
            // Check if the value should be a percentage
            if (this.shouldBePercentage(property, value)) {
                return `${value}%`;
            }
            return `${value}px`;
        } else if (property.includes('rotate') || property.includes('skew')) {
            return `${value}deg`;
        }
        
        // Scale properties don't need units
        return value;
    }
    
    /**
     * Check if a transform value should use percentage units
     */
    private shouldBePercentage(property: string, value: string): boolean {
        // If the value was originally a percentage, it will be marked
        if (value.startsWith('__percent__')) {
            return true;
        }
        
        // For translateX/Y, check if the value is relative to element size
        if ((property === 'translateX' || property === 'translateY') && 
            (value === '0' || value === '-100' || value === '100')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if property is a transform property
     */
    private isTransformProperty(property: string): boolean {
        return [
            'translateX', 'translateY', 'translateZ',
            'scaleX', 'scaleY', 'scale',
            'rotateX', 'rotateY', 'rotateZ', 'rotate',
            'skewX', 'skewY'
        ].includes(property);
    }
    
    /**
     * Convert camelCase to kebab-case
     */
    private camelToKebab(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
    
    /**
     * Cleanup cached state for element
     */
    cleanup(element: HTMLElement): void {
        this.transformStates.delete(element);
        this.gpuElements.delete(element);
        
        // Reset styles
        element.style.transform = '';
        element.style.willChange = '';
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            cachedTransforms: this.transformStates.size,
            gpuAcceleratedElements: this.gpuElements.size
        };
    }
    
    /**
     * Check if a property needs special handling through StyleApplicator
     * 
     * @description
     * Special properties require complex processing that can't be handled
     * by direct CSS string application (e.g., text element detection, 
     * gradient interpolation, clip path morphing)
     */
    private isSpecialProperty(property: string): boolean {
        return property === 'textBackgroundImage' ||
               property === 'gradientBackground' ||
               property === 'clipPath';
    }
}

/**
 * Singleton instance for performance
 */
export const directScrollApplicator = new DirectScrollApplicator(); 