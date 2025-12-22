# Dual Progress Types Reference

**Version 2.1.0 - Phase 6.2 Implementation**

This document provides comprehensive type definitions for the dual progress stagger system.

## Core Interfaces

### StaggerState

The main state container for dual progress stagger sequences.

```typescript
interface StaggerState {
    /** Master sequence progress (0-1) */
    masterProgress: number;
    
    /** Target progress for master sequence */
    targetMasterProgress: number;
    
    /** Per-element state tracking */
    elementStates: Map<number, StaggerElementState>;
    
    /** Total duration of entire sequence */
    totalSequenceDuration: number;
    
    /** Whether sequence is currently active */
    isSequenceActive: boolean;
    
    /** Stagger calculation result */
    staggerResult: StaggerResult;
    
    /** Master cleanup function */
    masterCleanup: (() => void) | null;
    
    /** Sequence start timestamp */
    startTimestamp: number;
}
```

**Usage:**
```typescript
const staggerState = orchestrator.initializeStaggerSequence(slotId, elements, config);
console.log('Total duration:', staggerState.totalSequenceDuration);
console.log('Element count:', staggerState.elementStates.size);
```

### StaggerElementState

Individual element state within a stagger sequence.

```typescript
interface StaggerElementState {
    /** Element's animation progress (0-1) */
    elementProgress: number;
    
    /** Target progress for this element */
    targetProgress: number;
    
    /** Whether element is currently animating */
    isActive: boolean;
    
    /** Element start time (null if not started) */
    startTime: number | null;
    
    /** Element completion time (null if not completed) */
    completionTime: number | null;
    
    /** Individual element cleanup function */
    elementCleanup: (() => void) | null;
    
    /** Element's order index in sequence */
    orderIndex: number;
    
    /** Calculated delay for this element */
    calculatedDelay: number;
}
```

**Usage:**
```typescript
const elementState = staggerState.elementStates.get(elementIndex);
if (elementState?.isActive) {
    console.log(`Element ${elementIndex} is animating: ${elementState.elementProgress * 100}%`);
}
```

### StaggerProgressUpdate

Real-time progress update event data.

```typescript
interface StaggerProgressUpdate {
    /** Slot ID for this sequence */
    slotId: string;
    
    /** Master sequence progress (0-1) */
    masterProgress: number;
    
    /** Individual element progress updates */
    elementUpdates: StaggerElementProgressUpdate[];
    
    /** Update timestamp */
    timestamp: number;
    
    /** Sequence phase information */
    phase: {
        /** Current phase: 'initializing' | 'executing' | 'completing' */
        current: StaggerPhase;
        
        /** Elements in each phase */
        waiting: number;
        active: number;
        completed: number;
    };
}
```

### StaggerElementProgressUpdate

Individual element progress within a progress update.

```typescript
interface StaggerElementProgressUpdate {
    /** Element index in original array */
    index: number;
    
    /** Element's current progress (0-1) */
    progress: number;
    
    /** Element just started this update */
    justStarted?: boolean;
    
    /** Element just completed this update */
    justCompleted?: boolean;
    
    /** Element's order position in sequence */
    orderPosition: number;
    
    /** Time since element started (ms) */
    timeActive?: number;
}
```

**Usage:**
```typescript
orchestrator.onProgressUpdate(slotId, (update: StaggerProgressUpdate) => {
    update.elementUpdates.forEach(elementUpdate => {
        if (elementUpdate.justStarted) {
            console.log(`Element ${elementUpdate.index} just started!`);
        }
        if (elementUpdate.justCompleted) {
            console.log(`Element ${elementUpdate.index} just completed!`);
        }
    });
});
```

---

## Configuration Types

### StaggerOrchestrationConfig

Configuration for the StaggerOrchestrator system.

```typescript
interface StaggerOrchestrationConfig {
    /** Enable dual progress tracking */
    enableDualProgress: boolean;
    
    /** Progress update frequency (milliseconds) */
    progressUpdateInterval: number;
    
    /** Enable master timeline scrubbing */
    enableScrubbing: boolean;
    
    /** Enable sequence pause/resume */
    enablePauseResume: boolean;
    
    /** Behavior coordination mode */
    behaviorCoordination: StaggerBehaviorCoordination;
    
    /** Progress synchronization mode */
    progressSync: StaggerProgressSync;
    
    /** Maximum concurrent element animations */
    maxConcurrentElements?: number;
    
    /** Enable performance monitoring */
    enablePerformanceMonitoring?: boolean;
}
```

**Default Values:**
```typescript
const defaultConfig: StaggerOrchestrationConfig = {
    enableDualProgress: true,
    progressUpdateInterval: 16, // 60fps
    enableScrubbing: false,
    enablePauseResume: false,
    behaviorCoordination: 'master-controlled',
    progressSync: 'realtime',
    maxConcurrentElements: undefined, // No limit
    enablePerformanceMonitoring: false
};
```

### StaggerBehaviorCoordination

```typescript
type StaggerBehaviorCoordination = 
    | 'master-controlled'   // Master timeline controls behavior decisions
    | 'element-controlled'; // Individual elements control behavior
```

### StaggerProgressSync

```typescript
type StaggerProgressSync = 
    | 'realtime'   // Immediate progress updates (default)
    | 'batched'    // Batched updates for performance
    | 'on-demand'; // Updates only when requested
```

### Enhanced StaggerConfig

Extended stagger configuration with dual progress support.

```typescript
interface StaggerConfig {
    /** Enable staggering */
    enabled: boolean;
    
    /** Delay between element animations (seconds) */
    delay: number;
    
    /** Stagger strategy */
    strategy: StaggerStrategy;
    
    /** Directional order configuration */
    order: {
        /** Order for forward animation (0→1) */
        forward: StaggerOrder;
        
        /** Order for backward animation (1→0) */
        backward: StaggerOrder;
    };
    
    /** Advanced dual progress options */
    dualProgress?: {
        /** Enable advanced progress tracking */
        enabled: boolean;
        
        /** Progress update frequency override */
        updateInterval?: number;
        
        /** Enable element grouping by distance */
        enableGrouping?: boolean;
        
        /** Maximum elements per group */
        maxGroupSize?: number;
    };
}
```

---

## Enumeration Types

### StaggerOrder

```typescript
type StaggerOrder = 
    | 'first-to-last'  // Elements 0→n
    | 'last-to-first'  // Elements n→0
    | 'center-out'     // Center elements first, then outward
    | 'edges-in'       // Edge elements first, then inward
    | 'random'         // Random order
    | 'custom';        // Custom order function
```

### StaggerStrategy

```typescript
type StaggerStrategy = 
    | 'linear'         // Linear delay progression
    | 'exponential'    // Exponential delay progression (future)
    | 'ease-in'        // Ease-in delay progression (future)
    | 'ease-out'       // Ease-out delay progression (future)
    | 'spring';        // Spring-based delays (future)
```

### StaggerPhase

```typescript
type StaggerPhase = 
    | 'initializing'   // Setting up sequence
    | 'executing'      // Running animations
    | 'completing'     // Finishing sequence
    | 'completed';     // Sequence finished
```

---

## Extended Types

### StaggerResult (Enhanced)

Enhanced stagger calculation result with dual progress support.

```typescript
interface StaggerResult {
    /** Array of calculated timings for each element */
    timings: StaggerTiming[];
    
    /** Total stagger duration */
    totalDuration: number;
    
    /** Order configuration used */
    orderUsed: StaggerOrder;
    
    /** Animation direction for this calculation */
    animationDirection: 'forward' | 'backward';
    
    /** Dual progress specific data */
    dualProgressData?: {
        /** Distance-based groupings */
        groups: StaggerGroup[];
        
        /** Master timeline checkpoints */
        checkpoints: StaggerCheckpoint[];
        
        /** Performance optimization hints */
        optimizationHints: StaggerOptimizationHint[];
    };
}
```

### StaggerTiming (Enhanced)

Enhanced timing information with dual progress metadata.

```typescript
interface StaggerTiming {
    /** Element index */
    elementIndex: number;
    
    /** Calculated delay (seconds) */
    delay: number;
    
    /** Order position in sequence */
    orderPosition: number;
    
    /** Distance from origin (for spatial orders) */
    distanceFromOrigin?: number;
    
    /** Dual progress specific timing data */
    dualProgressTiming?: {
        /** Expected start time relative to sequence start */
        expectedStartTime: number;
        
        /** Expected completion time relative to sequence start */
        expectedCompletionTime: number;
        
        /** Group membership */
        groupId?: string;
        
        /** Performance weight (higher = more expensive) */
        performanceWeight: number;
    };
}
```

### StaggerGroup

Grouping information for simultaneous elements.

```typescript
interface StaggerGroup {
    /** Unique group identifier */
    id: string;
    
    /** Elements in this group */
    elementIndices: number[];
    
    /** Group delay from sequence start */
    groupDelay: number;
    
    /** Distance from origin (for spatial groups) */
    distanceFromOrigin: number;
    
    /** Group progress (0-1) */
    progress: number;
    
    /** Whether any element in group is active */
    hasActiveElements: boolean;
    
    /** Whether all elements in group are completed */
    allElementsCompleted: boolean;
}
```

### StaggerCheckpoint

Master timeline checkpoint for progress coordination.

```typescript
interface StaggerCheckpoint {
    /** Checkpoint time (seconds from sequence start) */
    time: number;
    
    /** Master progress at this checkpoint (0-1) */
    masterProgress: number;
    
    /** Elements that should be active at this checkpoint */
    activeElements: number[];
    
    /** Elements that should be completed at this checkpoint */
    completedElements: number[];
    
    /** Checkpoint type */
    type: 'element-start' | 'element-complete' | 'group-start' | 'group-complete' | 'sequence-milestone';
}
```

### StaggerOptimizationHint

Performance optimization suggestions.

```typescript
interface StaggerOptimizationHint {
    /** Hint type */
    type: 'reduce-frequency' | 'batch-updates' | 'limit-concurrent' | 'use-simple-stagger';
    
    /** Hint description */
    description: string;
    
    /** Estimated performance impact */
    impact: 'low' | 'medium' | 'high';
    
    /** Suggested configuration changes */
    suggestedConfig?: Partial<StaggerOrchestrationConfig>;
}
```

---

## Utility Types

### StaggerMetrics

Performance and usage metrics.

```typescript
interface StaggerMetrics {
    /** Sequence identifier */
    slotId: string;
    
    /** Total sequence duration (actual) */
    actualDuration: number;
    
    /** Total progress updates sent */
    totalProgressUpdates: number;
    
    /** Average update interval (ms) */
    averageUpdateInterval: number;
    
    /** Peak concurrent elements */
    peakConcurrentElements: number;
    
    /** Performance rating */
    performance: {
        fps: number;
        rating: 'poor' | 'acceptable' | 'good' | 'excellent';
        bottlenecks: string[];
    };
    
    /** Memory usage */
    memory: {
        peakElementStates: number;
        averageElementStates: number;
        cleanupEfficiency: number; // 0-1
    };
}
```

### StaggerDebugInfo

Debug information for development.

```typescript
interface StaggerDebugInfo {
    /** Configuration used */
    config: StaggerConfig;
    
    /** Orchestration config used */
    orchestrationConfig: StaggerOrchestrationConfig;
    
    /** Sequence timeline */
    timeline: {
        events: StaggerDebugEvent[];
        phases: StaggerPhaseInfo[];
    };
    
    /** Element analysis */
    elements: {
        totalCount: number;
        spatialDistribution?: SpatialDistribution;
        performanceProfile: ElementPerformanceProfile[];
    };
}
```

### StaggerDebugEvent

Individual debug event during sequence execution.

```typescript
interface StaggerDebugEvent {
    /** Event timestamp */
    timestamp: number;
    
    /** Event type */
    type: 'sequence-start' | 'element-start' | 'element-complete' | 'progress-update' | 'sequence-complete' | 'error';
    
    /** Event data */
    data: any;
    
    /** Performance metrics at this event */
    metrics?: {
        memoryUsage: number;
        activeElements: number;
        fps: number;
    };
}
```

---

## Type Guards

Utility type guards for runtime type checking.

```typescript
// Type guard for StaggerState
function isStaggerState(value: any): value is StaggerState {
    return value && 
           typeof value.masterProgress === 'number' &&
           typeof value.totalSequenceDuration === 'number' &&
           value.elementStates instanceof Map;
}

// Type guard for StaggerProgressUpdate
function isStaggerProgressUpdate(value: any): value is StaggerProgressUpdate {
    return value &&
           typeof value.slotId === 'string' &&
           typeof value.masterProgress === 'number' &&
           Array.isArray(value.elementUpdates);
}

// Type guard for advanced stagger features
function hasAdvancedStaggerFeatures(config: StaggerConfig): boolean {
    const hasSpatialOrders = 
        config.order?.forward === 'center-out' ||
        config.order?.forward === 'edges-in' ||
        config.order?.backward === 'center-out' ||
        config.order?.backward === 'edges-in';
    
    const hasDifferentDirectionalOrders = 
        config.order?.forward !== config.order?.backward;
        
    const hasDualProgressConfig = 
        config.dualProgress?.enabled === true;
    
    return hasSpatialOrders || hasDifferentDirectionalOrders || hasDualProgressConfig;
}
```

---

## Usage Examples

### Type-Safe Configuration

```typescript
// Type-safe configuration with IntelliSense
const config: StaggerConfig = {
    enabled: true,
    delay: 0.15,
    strategy: 'linear',
    order: {
        forward: 'center-out',    // ✅ Valid StaggerOrder
        backward: 'edges-in'      // ✅ Valid StaggerOrder
    },
    dualProgress: {
        enabled: true,
        updateInterval: 16,
        enableGrouping: true,
        maxGroupSize: 5
    }
};

// Type checking prevents errors
const invalidConfig: StaggerConfig = {
    enabled: true,
    delay: 0.15,
    strategy: 'linear',
    order: {
        forward: 'invalid-order',  // ❌ TypeScript error
        backward: 'edges-in'
    }
};
```

### Type-Safe Progress Handling

```typescript
orchestrator.onProgressUpdate('my-sequence', (update: StaggerProgressUpdate) => {
    // Type-safe access to update properties
    const masterPercent = update.masterProgress * 100;  // ✅ number
    const phase = update.phase.current;                  // ✅ StaggerPhase
    
    update.elementUpdates.forEach((elementUpdate: StaggerElementProgressUpdate) => {
        const index = elementUpdate.index;              // ✅ number
        const progress = elementUpdate.progress;        // ✅ number
        const justStarted = elementUpdate.justStarted; // ✅ boolean | undefined
    });
});
```

### Type-Safe State Access

```typescript
function analyzeStaggerState(state: StaggerState) {
    // Type-safe access to state properties
    const isActive = state.isSequenceActive;                    // ✅ boolean
    const duration = state.totalSequenceDuration;              // ✅ number
    const elementCount = state.elementStates.size;             // ✅ number
    
    // Type-safe iteration over element states
    state.elementStates.forEach((elementState: StaggerElementState, index: number) => {
        const progress = elementState.elementProgress;          // ✅ number
        const isElementActive = elementState.isActive;          // ✅ boolean
        const orderIndex = elementState.orderIndex;            // ✅ number
    });
}
```

---

**These type definitions provide complete type safety and IntelliSense support for the dual progress stagger system, enabling robust development with compile-time error checking.** 