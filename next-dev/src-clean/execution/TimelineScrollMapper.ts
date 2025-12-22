/**
 * @file TimelineScrollMapper.ts
 * @description Maps MasterTimeline keyframes to scroll progress for scrubbed scroll animations
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Converts time-based MasterTimeline keyframes to scroll-based progress mapping.
 * Enables scrubbed scroll animations where animation progress is directly tied to
 * scroll position rather than time.
 * 
 * @architecture
 * - Maps time-based keyframes to scroll progress (0-1)
 * - Handles property delays and durations
 * - Supports timeline compression and expansion
 * - Maintains keyframe relationships and easing
 * 
 * @example
 * ```typescript
 * const mapper = new TimelineScrollMapper();
 * 
 * // Map 4s timeline to scroll progress
 * const scrollTimeline = mapper.mapTimelineToScroll(masterTimeline);
 * 
 * // Get property values at 50% scroll progress
 * const values = mapper.getValuesAtScrollProgress(scrollTimeline, 0.5);
 * 
 * // Example: 1s animation with 0.5s delay in 4s total = 12.5% to 37.5% scroll
 * ```
 */

import { MasterTimeline, getMasterTimelineValuesAtTime, getMasterTimelineValuesAtTimeForElement } from '../core/timeline/MasterTimeline.ts';
import { PropertyTimeline, PropertyKeyframe } from '../core/timeline/PropertyTimeline.ts';

/**
 * Scroll-based timeline where keyframes are mapped to progress (0-1)
 */
export interface ScrollTimeline {
    /** Array of property timelines with scroll-based keyframes */
    propertyTimelines: ScrollPropertyTimeline[];
    
    /** Original time-based timeline for reference */
    originalTimeline: MasterTimeline;
    
    /** Mapping configuration used */
    mappingConfig: ScrollMappingConfig;
    
    /** Metadata for debugging */
    metadata?: {
        originalDuration: number;
        compressionRatio: number;
        keyframeCount: number;
        createdAt: number;
    };
}

/**
 * Property timeline with scroll-based keyframes
 */
export interface ScrollPropertyTimeline {
    /** Property name */
    property: string;
    
    /** Keyframes mapped to scroll progress (0-1) */
    keyframes: ScrollKeyframe[];
    
    /** Property-specific interpolator */
    interpolator: any;
    
    /** Property unit */
    unit?: string;
    
    /** Spring configuration */
    springConfig?: any;
    
    /** Original property timeline for reference */
    originalTimeline: PropertyTimeline;
}

/**
 * Keyframe mapped to scroll progress
 */
export interface ScrollKeyframe {
    /** Scroll progress (0-1) */
    progress: number;
    
    /** Property value at this progress */
    value: any;
    
    /** Easing function */
    easing?: string;
    
    /** Original time this keyframe was at */
    originalTime: number;
}

/**
 * Configuration for timeline to scroll mapping
 */
export interface ScrollMappingConfig {
    /** How to handle timeline compression/expansion */
    mode: 'preserve_duration' | 'compress_to_scroll' | 'custom_range';
    
    /** Start progress (0-1) for custom range mode */
    startProgress?: number;
    
    /** End progress (0-1) for custom range mode */
    endProgress?: number;
    
    /** Whether to preserve relative timing between properties */
    preserveRelativeTiming?: boolean;
}

/**
 * TimelineScrollMapper - Maps time-based timelines to scroll progress
 * 
 * @description
 * Converts MasterTimeline keyframes from time-based to scroll-based coordinates.
 * Enables scrubbed scroll animations where animation progress is directly tied
 * to scroll position rather than playback time.
 */
export class TimelineScrollMapper {
    
    constructor() {

    }
    
    /**
     * Map a time-based timeline to scroll progress
     * 
     * @param masterTimeline - Original time-based master timeline
     * @param config - Mapping configuration
     * @returns Scroll-based timeline
     */
    mapTimelineToScroll(
        masterTimeline: MasterTimeline,
        config: ScrollMappingConfig = { mode: 'compress_to_scroll', preserveRelativeTiming: true }
    ): ScrollTimeline {

        
        // Calculate scroll range based on configuration
        const scrollRange = this.calculateScrollRange(masterTimeline, config);
        
        // Map each property timeline to scroll progress
        const scrollPropertyTimelines = masterTimeline.propertyTimelines.map(propertyTimeline => 
            this.mapPropertyTimelineToScroll(propertyTimeline, scrollRange, config)
        );
        
        // Create scroll timeline
        const scrollTimeline: ScrollTimeline = {
            propertyTimelines: scrollPropertyTimelines,
            originalTimeline: masterTimeline,
            mappingConfig: config,
            metadata: {
                originalDuration: masterTimeline.totalDuration,
                compressionRatio: scrollRange.end - scrollRange.start,
                keyframeCount: scrollPropertyTimelines.reduce((sum, pt) => sum + pt.keyframes.length, 0),
                createdAt: Date.now()
            }
        };
        

        
        return scrollTimeline;
    }
    
    /**
     * Get property values at specific scroll progress
     * 
     * @param scrollTimeline - Scroll-based timeline
     * @param progress - Scroll progress (0-1)
     * @returns Map of property names to values
     */
    getValuesAtScrollProgress(
        scrollTimeline: ScrollTimeline,
        progress: number
    ): Map<string, any> {
        // Clamp progress to valid range
        const clampedProgress = Math.max(0, Math.min(1, progress));
        
        const values = new Map<string, any>();
        
        // Get value for each property at this progress
        scrollTimeline.propertyTimelines.forEach(propertyTimeline => {
            const value = this.interpolatePropertyAtProgress(propertyTimeline, clampedProgress);
            values.set(propertyTimeline.property, value);
        });
        
        return values;
    }
    
    /**
     * Convert scroll progress back to original timeline time
     * 
     * @param scrollTimeline - Scroll timeline
     * @param progress - Scroll progress (0-1)
     * @returns Original timeline time in seconds
     */
    progressToOriginalTime(
        scrollTimeline: ScrollTimeline,
        progress: number
    ): number {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        
        const config = scrollTimeline.mappingConfig;
        const originalDuration = scrollTimeline.originalTimeline.totalDuration;
        
        switch (config.mode) {
            case 'compress_to_scroll':
                return clampedProgress * originalDuration;
                
            case 'custom_range':
                const startTime = (config.startProgress || 0) * originalDuration;
                const endTime = (config.endProgress || 1) * originalDuration;
                return startTime + clampedProgress * (endTime - startTime);
                
            case 'preserve_duration':
            default:
                return clampedProgress * originalDuration;
        }
    }
    
    /**
     * Use original timeline interpolation at converted time
     * 
     * @param scrollTimeline - Scroll timeline
     * @param progress - Scroll progress (0-1)
     * @returns Values using original timeline interpolation
     */
    getValuesUsingOriginalInterpolation(
        scrollTimeline: ScrollTimeline,
        progress: number
    ): Map<string, any> {
        const originalTime = this.progressToOriginalTime(scrollTimeline, progress);
        return getMasterTimelineValuesAtTime(scrollTimeline.originalTimeline, originalTime);
    }
    
    /**
     * Use original timeline interpolation at converted time with element-specific support
     * 
     * @param scrollTimeline - Scroll timeline
     * @param progress - Scroll progress (0-1)
     * @param elementIndex - Index of the element (for distributed properties)
     * @returns Values using original timeline interpolation with element-specific distributed values
     */
    getValuesUsingOriginalInterpolationForElement(
        scrollTimeline: ScrollTimeline,
        progress: number,
        elementIndex: number
    ): Map<string, any> {
        const originalTime = this.progressToOriginalTime(scrollTimeline, progress);
        return getMasterTimelineValuesAtTimeForElement(scrollTimeline.originalTimeline, originalTime, elementIndex);
    }
    
    /**
     * Calculate scroll range based on mapping configuration
     */
    private calculateScrollRange(
        masterTimeline: MasterTimeline,
        config: ScrollMappingConfig
    ): { start: number; end: number } {
        switch (config.mode) {
            case 'compress_to_scroll':
                return { start: 0, end: 1 };
                
            case 'custom_range':
                return {
                    start: config.startProgress || 0,
                    end: config.endProgress || 1
                };
                
            case 'preserve_duration':
            default:
                return { start: 0, end: 1 };
        }
    }
    
    /**
     * Map a single property timeline to scroll progress
     */
    private mapPropertyTimelineToScroll(
        propertyTimeline: PropertyTimeline,
        scrollRange: { start: number; end: number },
        config: ScrollMappingConfig
    ): ScrollPropertyTimeline {
        const totalDuration = propertyTimeline.totalDuration;
        const scrollSpan = scrollRange.end - scrollRange.start;
        
        // Map each keyframe to scroll progress
        const scrollKeyframes: ScrollKeyframe[] = propertyTimeline.keyframes.map(keyframe => ({
            progress: scrollRange.start + (keyframe.time / totalDuration) * scrollSpan,
            value: keyframe.value,
            easing: keyframe.easing,
            originalTime: keyframe.time
        }));
        
        return {
            property: propertyTimeline.property,
            keyframes: scrollKeyframes,
            interpolator: propertyTimeline.interpolator,
            unit: propertyTimeline.unit,
            springConfig: propertyTimeline.springConfig,
            originalTimeline: propertyTimeline
        };
    }
    
    /**
     * Interpolate property value at specific scroll progress
     */
    private interpolatePropertyAtProgress(
        propertyTimeline: ScrollPropertyTimeline,
        progress: number
    ): any {
        const keyframes = propertyTimeline.keyframes;
        
        if (keyframes.length === 0) {
            console.warn('🗺️ [TimelineScrollMapper] No keyframes for property:', propertyTimeline.property);
            return null;
        }
        
        if (keyframes.length === 1) {
            return keyframes[0].value;
        }
        
        // Find surrounding keyframes
        const { before, after } = this.findSurroundingKeyframes(keyframes, progress);
        
        if (!before) {
            return after!.value; // Before start
        }
        if (!after) {
            return before.value;  // After end
        }
        if (before === after) {
            return before.value; // Exact match
        }
        
        // Calculate interpolation progress between keyframes
        const keyframeProgress = (progress - before.progress) / (after.progress - before.progress);
        
        // Use original timeline interpolation by converting back to time
        const beforeTime = before.originalTime;
        const afterTime = after.originalTime;
        const interpolationTime = beforeTime + keyframeProgress * (afterTime - beforeTime);
        
        // Use the original property timeline's interpolator
        const result = propertyTimeline.interpolator.valueAtTime(
            propertyTimeline.originalTimeline.keyframes,
            interpolationTime,
            propertyTimeline.springConfig
        );
        
        return result;
    }
    
    /**
     * Find keyframes surrounding a progress value
     */
    private findSurroundingKeyframes(
        keyframes: ScrollKeyframe[],
        progress: number
    ): { before: ScrollKeyframe | null; after: ScrollKeyframe | null } {
        // Find the keyframes that surround the target progress
        let before: ScrollKeyframe | null = null;
        let after: ScrollKeyframe | null = null;
        
        for (let i = 0; i < keyframes.length; i++) {
            const keyframe = keyframes[i];
            
            if (keyframe.progress <= progress) {
                before = keyframe;
            }
            
            if (keyframe.progress >= progress && !after) {
                after = keyframe;
                break;
            }
        }
        
        return { before, after };
    }
    
    /**
     * Get scroll range for a specific property
     * 
     * @param scrollTimeline - Scroll timeline
     * @param propertyName - Property name
     * @returns Progress range where this property is active
     */
    getPropertyScrollRange(
        scrollTimeline: ScrollTimeline,
        propertyName: string
    ): { start: number; end: number } | null {
        const propertyTimeline = scrollTimeline.propertyTimelines.find(pt => pt.property === propertyName);
        
        if (!propertyTimeline || propertyTimeline.keyframes.length === 0) {
            return null;
        }
        
        const keyframes = propertyTimeline.keyframes;
        return {
            start: keyframes[0].progress,
            end: keyframes[keyframes.length - 1].progress
        };
    }
    
    /**
     * Check if a property is active at specific scroll progress
     * 
     * @param scrollTimeline - Scroll timeline
     * @param propertyName - Property name
     * @param progress - Scroll progress (0-1)
     * @returns True if property should be animated at this progress
     */
    isPropertyActiveAtProgress(
        scrollTimeline: ScrollTimeline,
        propertyName: string,
        progress: number
    ): boolean {
        const range = this.getPropertyScrollRange(scrollTimeline, propertyName);
        return range ? progress >= range.start && progress <= range.end : false;
    }
    
    /**
     * Get debug information about the mapping
     * 
     * @param scrollTimeline - Scroll timeline
     * @returns Debug information
     */
    getDebugInfo(scrollTimeline: ScrollTimeline): {
        originalDuration: number;
        scrollRange: { start: number; end: number };
        properties: Array<{
            name: string;
            keyframeCount: number;
            scrollRange: { start: number; end: number };
            originalRange: { start: number; end: number };
        }>;
    } {
        const originalDuration = scrollTimeline.originalTimeline.totalDuration;
        const scrollRange = this.calculateScrollRange(
            scrollTimeline.originalTimeline,
            scrollTimeline.mappingConfig
        );
        
        const properties = scrollTimeline.propertyTimelines.map(pt => {
            const scrollRange = this.getPropertyScrollRange(scrollTimeline, pt.property);
            const originalKeyframes = pt.originalTimeline.keyframes;
            
            return {
                name: pt.property,
                keyframeCount: pt.keyframes.length,
                scrollRange: scrollRange || { start: 0, end: 0 },
                originalRange: {
                    start: originalKeyframes[0]?.time || 0,
                    end: originalKeyframes[originalKeyframes.length - 1]?.time || 0
                }
            };
        });
        
        return {
            originalDuration,
            scrollRange,
            properties
        };
    }
}

/**
 * Shared instance for performance optimization
 */
export const timelineScrollMapper = new TimelineScrollMapper(); 