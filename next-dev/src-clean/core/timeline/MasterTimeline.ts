/**
 * @file MasterTimeline.ts
 * @description GSAP-inspired Master Timeline System for FAME Animation Engine
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Phase 2 of the Timeline-First Architecture restructure.
 * Master timeline coordinates individual property timelines (GSAP-inspired composition).
 * 
 * Key benefits:
 * - Single source of truth: Master timeline coordinates individual property timelines
 * - Natural behaviors: Forward/backward/reset operate on master timeline
 * - Professional standard: Matches CSS @keyframes, GSAP, After Effects patterns
 * - Manageable complexity: Each property timeline handles its own interpolation logic
 * - Elegant composition: Property timelines + master timeline coordination
 * 
 * @example
 * ```typescript
 * // Replace complex multi-property instances:
 * // translateX: { delay: 0s, duration: 2s, from: 0px, to: 300px, isEarliestInstance: true }
 * // translateX_1: { delay: 2s, duration: 2s, from: 300px, to: 0px, isEarliestInstance: false }
 * 
 * // With GSAP-inspired master timeline:
 * const masterTimeline = {
 *   propertyTimelines: [
 *     {
 *       property: "translateX",
 *       keyframes: [
 *         { time: 0s, value: 0px },
 *         { time: 2s, value: 300px },
 *         { time: 4s, value: 0px }
 *       ],
 *       interpolator: numberWithUnitInterpolator,
 *       totalDuration: 4s
 *     }
 *   ],
 *   totalDuration: 4s
 * }
 * ```
 */

import { AnimationProperty } from '../../types/index.ts';
import { 
    PropertyTimeline, 
    PropertyKeyframe, 
    PropertyInterpolator,
    getInterpolatorForProperty,
    sortKeyframesByTime,
    deduplicateKeyframes
} from './PropertyTimeline.ts';

//=======================================
//        MASTER TIMELINE SYSTEM
//=======================================

/**
 * Master timeline that coordinates all property timelines
 * Single source of truth for timeline-based animations
 */
export interface MasterTimeline {
    /** Array of property timelines (one per property type) */
    propertyTimelines: PropertyTimeline[];
    
    /** Total duration of the master timeline */
    totalDuration: number;
    
    /** Global settings that can be applied to all properties */
    globalSettings?: GlobalTimelineConfig;
    
    /** Metadata for debugging and analysis */
    metadata?: {
        originalInstanceCount: number;
        propertyTypes: string[];
        hasGlobalSettings: boolean;
        createdAt: number;
    };
}

/**
 * Global timeline configuration
 * Can override individual property settings when enabled
 */
export interface GlobalTimelineConfig {
    /** Whether global timeline is enabled */
    enabled: boolean;
    
    /** Global duration (overrides property durations) */
    duration?: number;
    
    /** Global delay (added to all property delays) */
    delay?: number;
    
    /** Global easing (overrides property easings) */
    easing?: string;
    
    /** Global spring configuration */
    springConfig?: {
        amplitude: number;
        period: number;
    };
}

//=======================================
//        MASTER TIMELINE BUILDER
//=======================================

/**
 * Converts multi-property instances into GSAP-inspired master timeline
 * This is the core of the Timeline-First Architecture restructure
 */
export class MasterTimelineBuilder {
    
    /**
     * Build master timeline from animation properties
     * @param properties - Array of animation properties (can have duplicates)
     * @param globalSettings - Optional global timeline configuration
     * @returns Master timeline with coordinated property timelines
     */
    buildMasterTimeline(
        properties: AnimationProperty[], 
        globalSettings?: GlobalTimelineConfig
    ): MasterTimeline {
        console.log('🎬 [MasterTimelineBuilder] Building master timeline from properties:', {
            propertyCount: properties.length,
            globalSettingsEnabled: globalSettings?.enabled || false
        });
        
        // Group properties by type (property name)
        const propertiesByType = this.groupPropertiesByType(properties);
        const propertyTimelines: PropertyTimeline[] = [];
        let maxDuration = 0;
        
        // Build property timeline for each property type
        propertiesByType.forEach((instances, propertyType) => {
            console.log(`🎬 [MasterTimelineBuilder] Building timeline for ${propertyType} (${instances.length} instances)`);
            
            const propertyTimeline = this.buildPropertyTimeline(
                propertyType, 
                instances, 
                globalSettings
            );
            
            propertyTimelines.push(propertyTimeline);
            maxDuration = Math.max(maxDuration, propertyTimeline.totalDuration);
        });
        
        const masterTimeline: MasterTimeline = {
            propertyTimelines,
            totalDuration: maxDuration,
            globalSettings,
            metadata: {
                originalInstanceCount: properties.length,
                propertyTypes: Array.from(propertiesByType.keys()),
                hasGlobalSettings: globalSettings?.enabled || false,
                createdAt: Date.now()
            }
        };
        
        console.log('🎬 [MasterTimelineBuilder] Master timeline built:', {
            propertyTimelineCount: propertyTimelines.length,
            totalDuration: maxDuration,
            propertyTypes: masterTimeline.metadata?.propertyTypes
        });
        
        return masterTimeline;
    }
    
    /**
     * Group animation properties by property type
     * @param properties - Array of animation properties
     * @returns Map of property type to array of instances
     */
    private groupPropertiesByType(properties: AnimationProperty[]): Map<string, AnimationProperty[]> {
        const groups = new Map<string, AnimationProperty[]>();
        
        properties.forEach(property => {
            // Extract base property name (remove _1, _2 suffixes)
            const propertyType = this.extractPropertyType(property.property, property.instanceId);
            
            if (!groups.has(propertyType)) {
                groups.set(propertyType, []);
            }
            
            groups.get(propertyType)!.push(property);
        });
        
        return groups;
    }
    
    /**
     * Extract base property type from property name or instance ID
     * @param property - Property name
     * @param instanceId - Instance ID (may have suffix)
     * @returns Base property type
     */
    private extractPropertyType(property: string, instanceId?: string): string {
        // Use instanceId if available, otherwise use property name
        const source = instanceId || property;
        
        // Remove suffixes like _1, _2, etc.
        const match = source.match(/^(.+?)(_\d+)?$/);
        return match ? match[1] : source;
    }
    
    /**
     * Build property timeline from property instances
     * @param propertyType - Base property type (e.g., "translateX")
     * @param instances - Array of property instances
     * @param globalSettings - Optional global timeline configuration
     * @returns Property timeline with keyframes
     */
    private buildPropertyTimeline(
        propertyType: string,
        instances: AnimationProperty[],
        globalSettings?: GlobalTimelineConfig
    ): PropertyTimeline {
        const keyframes: PropertyKeyframe[] = [];
        
        // Convert each instance to keyframes
        instances.forEach((instance, index) => {
            const { startTime, endTime, fromValue, toValue } = this.calculateInstanceTiming(
                instance, 
                globalSettings
            );
            
            // Create start keyframe
            keyframes.push({
                time: startTime,
                value: fromValue,
                easing: 'linear', // Start keyframe uses linear
                metadata: {
                    sourceInstanceId: instance.instanceId || instance.property
                    // ❌ REMOVED: originalIndex - Timeline preserves order naturally through keyframe timing
                }
            });
            
            // Create end keyframe
            keyframes.push({
                time: endTime,
                value: toValue,
                easing: instance.easing || 'ease',
                metadata: {
                    sourceInstanceId: instance.instanceId || instance.property
                    // ❌ REMOVED: originalIndex - Timeline preserves order naturally through keyframe timing
                }
            });
        });
        
        // Sort, deduplicate, and optimize keyframes
        const optimizedKeyframes = this.optimizeKeyframes(keyframes);
        
        // Calculate total duration
        const totalDuration = Math.max(...optimizedKeyframes.map(k => k.time), 0);
        
        // Get appropriate interpolator for this property type
        const interpolator = this.getInterpolatorForProperty(propertyType);
        
        // Extract unit from first instance
        const unit = instances[0]?.unit || this.inferUnit(propertyType);
        
        // Extract and preserve spring configuration from instances
        const springConfig = this.extractSpringConfig(instances, globalSettings);
        
        // Extract distributed properties from first instance (if any)
        const distributedFromValues = instances[0]?.distributedFromValues;
        const distributedToValues = instances[0]?.distributedToValues;
        
        // Log distributed property information
        // if (distributedFromValues || distributedToValues) {
        //     console.log(`📊 [MasterTimelineBuilder] Processing distributed property "${propertyType}":`, {
        //         propertyType,
        //         hasDistributedFrom: !!distributedFromValues,
        //         hasDistributedTo: !!distributedToValues,
        //         distributedFromValues,
        //         distributedToValues,
        //         instanceCount: instances.length
        //     });
        // }
        
        return {
            property: propertyType,
            keyframes: optimizedKeyframes,
            totalDuration,
            interpolator,
            unit,
            springConfig, // Preserve spring config in timeline
            distributedFromValues, // Pass distributed from values to timeline
            distributedToValues, // Pass distributed to values to timeline
            metadata: {
                instanceCount: instances.length,
                earliestTime: Math.min(...optimizedKeyframes.map(k => k.time)),
                latestTime: Math.max(...optimizedKeyframes.map(k => k.time))
            }
        };
    }
    
    /**
     * Calculate timing for a property instance
     * @param instance - Property instance
     * @param globalSettings - Optional global settings
     * @returns Timing information
     */
    private calculateInstanceTiming(
        instance: AnimationProperty,
        globalSettings?: GlobalTimelineConfig
    ): { startTime: number; endTime: number; fromValue: any; toValue: any } {
        // Apply global settings if enabled and instance uses them
        const useGlobalSettings = globalSettings?.enabled && this.shouldUseGlobalSettings(instance);
        
        let duration = instance.duration || 1.0; // Default 1 second
        let delay = instance.delay || 0.0;
        
        if (useGlobalSettings && globalSettings) {
            // Override with global settings
            if (globalSettings.duration !== undefined) {
                duration = globalSettings.duration;
            }
            if (globalSettings.delay !== undefined) {
                delay += globalSettings.delay; // Add global delay to property delay
            }
        }
        
        // Convert to seconds if needed (assuming internal format is already in seconds)
        const startTime = delay;
        const endTime = delay + duration;
        
        return {
            startTime,
            endTime,
            fromValue: instance.from,
            toValue: instance.to
        };
    }
    
    /**
     * Check if instance should use global settings
     * @param instance - Property instance
     * @returns Whether to use global settings
     */
    private shouldUseGlobalSettings(instance: AnimationProperty): boolean {
        // Check if instance has a useGlobalSettings flag (from property controls)
        // For now, assume all instances use global settings if global timeline is enabled
        // This can be enhanced based on property control implementation
        return true;
    }
    
    /**
     * Optimize keyframes by sorting, deduplicating, and removing redundant points
     * @param keyframes - Raw keyframes
     * @returns Optimized keyframes
     */
    private optimizeKeyframes(keyframes: PropertyKeyframe[]): PropertyKeyframe[] {
        // Sort by time
        sortKeyframesByTime(keyframes);
        
        // Deduplicate keyframes at the same time (last value wins)
        const deduplicated = deduplicateKeyframes(keyframes);
        
        // TODO: Add more optimizations:
        // - Remove redundant keyframes (same value as interpolated value)
        // - Merge adjacent keyframes with same value
        // - Optimize easing curves
        
        return deduplicated;
    }
    
    /**
     * Get interpolator for property type
     * @param propertyType - Property type
     * @returns Appropriate interpolator
     */
    private getInterpolatorForProperty(propertyType: string): PropertyInterpolator {
        return getInterpolatorForProperty(propertyType);
    }
    
    /**
     * Infer unit for property type
     * @param propertyType - Property type
     * @returns Inferred unit
     */
    private inferUnit(propertyType: string): string {
        if (propertyType.includes('translate') || 
            propertyType.includes('width') || 
            propertyType.includes('height')) {
            return 'px';
        }
        
        if (propertyType.includes('rotate')) {
            return 'deg';
        }
        
        if (propertyType === 'opacity' || 
            propertyType.includes('scale')) {
            return '';
        }
        
        return '';
    }
    
    /**
     * Extract spring configuration from property instances
     * @param instances - Property instances
     * @param globalSettings - Optional global settings
     * @returns Spring configuration to use for this property timeline
     */
    private extractSpringConfig(
        instances: AnimationProperty[], 
        globalSettings?: GlobalTimelineConfig
    ): any | undefined {
        // Priority order:
        // 1. First instance with spring configuration
        // 2. Global spring configuration (if global timeline enabled)
        // 3. undefined
        
        // Look for spring config in instances (first one wins since they're all the same property)
        for (const instance of instances) {
            if (instance.springConfig) {
                return instance.springConfig;
            }
        }
        
        // Fallback to global spring config if available
        if (globalSettings?.enabled && globalSettings.springConfig) {
            return globalSettings.springConfig;
        }
        
        return undefined;
    }
}

//=======================================
//        TIMELINE UTILITIES
//=======================================

/**
 * Get all property values at a specific time in the master timeline
 * @param masterTimeline - Master timeline
 * @param time - Time position in seconds
 * @returns Map of property name to interpolated value
 */
export function getMasterTimelineValuesAtTime(
    masterTimeline: MasterTimeline, 
    time: number
): Map<string, any> {
    const values = new Map<string, any>();
    
    //console.log(`🚨 [DEBUG] getMasterTimelineValuesAtTime called with time=${time}s`);
    
    masterTimeline.propertyTimelines.forEach(propertyTimeline => {
        //console.log(`🚨 [DEBUG] Processing property timeline: ${propertyTimeline.property}`);
        //console.log(`🚨 [DEBUG] Keyframes:`, propertyTimeline.keyframes);
        
        // Pass spring config to interpolator
        const value = propertyTimeline.interpolator.valueAtTime(
            propertyTimeline.keyframes, 
            time,
            propertyTimeline.springConfig // Pass spring config from timeline
        );
        
        //console.log(`🚨 [DEBUG] Interpolated value for ${propertyTimeline.property} at time ${time}s: ${value}`);
        
        values.set(propertyTimeline.property, value);
    });
    
    //console.log(`🚨 [DEBUG] Final values map:`, Object.fromEntries(values));
    return values;
}

/**
 * Get all property values at a specific time in the master timeline for a specific element
 * @param masterTimeline - Master timeline
 * @param time - Time position in seconds
 * @param elementIndex - Index of the element (for distributed properties)
 * @returns Map of property name to interpolated value with element-specific distributed values
 */
export function getMasterTimelineValuesAtTimeForElement(
    masterTimeline: MasterTimeline, 
    time: number,
    elementIndex: number
): Map<string, any> {
    const values = new Map<string, any>();
    
    //console.log(`🔍 [MasterTimeline] Getting values at time ${time}s for element ${elementIndex}`);
    
    masterTimeline.propertyTimelines.forEach(propertyTimeline => {
        // Check if this property timeline has distributed values
        const hasDistributedValues = propertyTimeline.distributedFromValues || propertyTimeline.distributedToValues;
        
        if (hasDistributedValues) {
            //console.log(`📊 [MasterTimeline] Processing distributed property "${propertyTimeline.property}" for element ${elementIndex}`);
            
            // For distributed properties, we need to create element-specific keyframes
            const elementSpecificKeyframes = propertyTimeline.keyframes.map(keyframe => {
                let elementSpecificValue = keyframe.value;
                
                // Get keyframe times for comparison
                const keyframeTimes = propertyTimeline.keyframes.map(k => k.time);
                const minTime = Math.min(...keyframeTimes);
                const maxTime = Math.max(...keyframeTimes);
                
                // If this is the earliest keyframe, use distributed "from" values
                if (Math.abs(keyframe.time - minTime) < 0.001) { // Use tolerance for floating point comparison
                    if (propertyTimeline.distributedFromValues && propertyTimeline.distributedFromValues[elementIndex] !== undefined) {
                        elementSpecificValue = propertyTimeline.distributedFromValues[elementIndex];
                        //console.log(`📊 [MasterTimeline] Using distributed FROM value for element ${elementIndex}: ${elementSpecificValue}`);
                    }
                }
                // If this is the latest keyframe, use distributed "to" values
                else if (Math.abs(keyframe.time - maxTime) < 0.001) { // Use tolerance for floating point comparison
                    if (propertyTimeline.distributedToValues && propertyTimeline.distributedToValues[elementIndex] !== undefined) {
                        elementSpecificValue = propertyTimeline.distributedToValues[elementIndex];
                        //console.log(`📊 [MasterTimeline] Using distributed TO value for element ${elementIndex}: ${elementSpecificValue}`);
                    }
                }
                
                return {
                    ...keyframe,
                    value: elementSpecificValue
                };
            });
            
            // Log element-specific keyframes for debugging
            // console.log(`📊 [MasterTimeline] Element-specific keyframes for "${propertyTimeline.property}" element ${elementIndex}:`, 
            //     elementSpecificKeyframes.map(k => ({ time: k.time, value: k.value })));
            
            // Use element-specific keyframes for interpolation
            const value = propertyTimeline.interpolator.valueAtTime(
                elementSpecificKeyframes, 
                time,
                propertyTimeline.springConfig
            );
            
            //console.log(`📊 [MasterTimeline] Interpolated value for "${propertyTimeline.property}" element ${elementIndex} at time ${time}s: ${value}`);
            
            values.set(propertyTimeline.property, value);
        } else {
            // For non-distributed properties, use normal interpolation
            const value = propertyTimeline.interpolator.valueAtTime(
                propertyTimeline.keyframes, 
                time,
                propertyTimeline.springConfig
            );
            
            values.set(propertyTimeline.property, value);
        }
    });
    
    return values;
}

/**
 * 🚨 NEW: Get initial values from master timeline (time = 0)
 * Fixes the initial value application bug for timeline architecture
 * @param masterTimeline - Master timeline
 * @returns Map of property name to initial value
 */
export function getMasterTimelineInitialValues(
    masterTimeline: MasterTimeline
): Map<string, any> {
    //console.log('🎬 [MasterTimeline] Getting initial values (time = 0)');
    return getMasterTimelineValuesAtTime(masterTimeline, 0);
}

/**
 * Validate master timeline structure
 * @param masterTimeline - Master timeline to validate
 * @returns Validation result
 */
export function validateMasterTimeline(masterTimeline: MasterTimeline): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for empty timeline
    if (masterTimeline.propertyTimelines.length === 0) {
        errors.push('Master timeline has no property timelines');
    }
    
    // Validate each property timeline
    masterTimeline.propertyTimelines.forEach((timeline, index) => {
        if (timeline.keyframes.length === 0) {
            errors.push(`Property timeline ${timeline.property} has no keyframes`);
        }
        
        if (timeline.totalDuration <= 0) {
            errors.push(`Property timeline ${timeline.property} has invalid duration: ${timeline.totalDuration}`);
        }
        
        // Check for timing consistency
        const actualMaxTime = Math.max(...timeline.keyframes.map(k => k.time), 0);
        if (Math.abs(timeline.totalDuration - actualMaxTime) > 0.001) {
            warnings.push(`Property timeline ${timeline.property} duration (${timeline.totalDuration}) doesn't match max keyframe time (${actualMaxTime})`);
        }
    });
    
    // Check master timeline duration consistency
    const maxPropertyDuration = Math.max(...masterTimeline.propertyTimelines.map(t => t.totalDuration), 0);
    if (Math.abs(masterTimeline.totalDuration - maxPropertyDuration) > 0.001) {
        warnings.push(`Master timeline duration (${masterTimeline.totalDuration}) doesn't match max property duration (${maxPropertyDuration})`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Create a simple master timeline for testing
 * @param propertyConfigs - Simple property configurations
 * @returns Master timeline
 */
export function createSimpleMasterTimeline(propertyConfigs: Array<{
    property: string;
    from: any;
    to: any;
    duration: number;
    delay?: number;
    unit?: string;
}>): MasterTimeline {
    const builder = new MasterTimelineBuilder();
    
    const properties: AnimationProperty[] = propertyConfigs.map((config, index) => ({
        property: config.property,
        from: config.from,
        to: config.to,
        duration: config.duration,
        delay: config.delay || 0,
        unit: config.unit,
        instanceId: config.property
        // ❌ REMOVED: originalIndex - Timeline preserves order naturally through timing
    }));
    
    return builder.buildMasterTimeline(properties);
} 