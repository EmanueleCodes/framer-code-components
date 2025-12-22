# FAME Dual Progress Stagger System

**Version 2.1.0 - Phase 6.2 Implementation**  
**Status: ✅ Production Ready**

## Overview

The Dual Progress Stagger System is an advanced animation coordination system that tracks both **master sequence progress** and **individual element progress** for staggered animations. This enables sophisticated features like pause/resume sequences, scrubbing through stagger timelines, and coordinated behavior decisions.

## Key Concepts

### Traditional Staggering (Simple)
```
Element 1: ----[animate]----
Element 2:   ----[animate]----
Element 3:     ----[animate]----
Progress:   Individual element progress only
```

### Dual Progress Staggering (Advanced)
```
Master:    [====== Sequence Progress ======]
Element 1: ----[animate]----
Element 2:   ----[animate]----
Element 3:     ----[animate]----
Progress:   Master (0-1) + Individual (0-1) for each element
```

## Architecture

```typescript
interface StaggerState {
    masterProgress: number;        // 0-1: Overall sequence progress
    targetMasterProgress: number;  // Target for master sequence
    elementStates: Map<number, StaggerElementState>; // Per-element states
    totalSequenceDuration: number; // Total time for entire sequence
    isSequenceActive: boolean;     // Whether sequence is running
    // ... additional coordination data
}

interface StaggerElementState {
    elementProgress: number;       // 0-1: Individual element progress
    targetProgress: number;        // Target for this element
    isActive: boolean;            // Whether element is animating
    startTime: number | null;     // When element started
    // ... additional element data
}
```

## Core Components

### 1. StaggerOrchestrator
**Main coordination engine for dual progress system**

```typescript
const orchestrator = new StaggerOrchestrator({
    enableDualProgress: true,
    progressUpdateInterval: 16, // 60fps
    behaviorCoordination: 'master-controlled'
});
```

### 2. Enhanced StaggerConfig
**Configuration with directional order support**

```typescript
const config: StaggerConfig = {
    enabled: true,
    delay: 0.1,
    strategy: 'linear',
    order: {
        forward: 'center-out',   // Animation 0→1
        backward: 'edges-in'     // Animation 1→0
    }
};
```

### 3. Progress Synchronization
**Real-time progress updates across all elements**

```typescript
orchestrator.onProgressUpdate(slotId, (update: StaggerProgressUpdate) => {
    console.log(`Master: ${update.masterProgress * 100}%`);
    update.elementUpdates.forEach(el => {
        console.log(`Element ${el.index}: ${el.progress * 100}%`);
    });
});
```

## Features Enabled

### ✅ Dual Progress Tracking
- **Master Progress**: How far through the entire stagger sequence (0-1)
- **Element Progress**: Individual animation progress per element (0-1)
- **Real-time Synchronization**: 60fps progress updates across all states

### ✅ Advanced Order Calculations  
- **Spatial Orders**: `center-out`, `edges-in` with distance-based grouping
- **Directional Orders**: Different orders for forward vs backward animations
- **Simultaneous Groups**: Elements at same distance animate together

### ✅ Master Timeline Coordination
- **Sequence Control**: Pause, resume, scrub entire sequences
- **Behavior Coordination**: Master-level behavior decisions
- **Timeline Integration**: Works with existing MasterTimelinePlayer

### ✅ Backward Compatibility
- **Simple Staggers**: Automatically use LinearStagger (no performance impact)
- **Advanced Staggers**: Automatically use StaggerOrchestrator
- **Legacy Support**: Existing code continues working

## Usage Examples

### Basic Usage
```typescript
// Initialize stagger sequence
const staggerState = orchestrator.initializeStaggerSequence(
    'my-sequence',
    elements,
    staggerConfig,
    'forward'
);

// Execute with dual progress tracking
await orchestrator.executeStaggerSequence(
    'my-sequence',
    masterTimeline,
    'PLAY_FORWARD',
    0
);
```

### Advanced Spatial Staggering
```typescript
const spatialConfig: StaggerConfig = {
    enabled: true,
    delay: 0.2,
    strategy: 'linear',
    order: {
        forward: 'center-out',  // Center elements first
        backward: 'edges-in'    // Edge elements first when reversing
    }
};

// Elements will be grouped by distance and animate simultaneously
// Group 1 (center): Elements [2, 3] at delay 0s
// Group 2 (next):   Elements [1, 4] at delay 0.2s  
// Group 3 (edges):  Elements [0, 5] at delay 0.4s
```

### Progress Monitoring
```typescript
orchestrator.onProgressUpdate('my-sequence', (update) => {
    // Master sequence progress (0-1)
    const masterPercent = update.masterProgress * 100;
    
    // Individual element progress
    const activeElements = update.elementUpdates.filter(
        el => el.progress > 0 && el.progress < 1
    ).length;
    
    console.log(`Sequence: ${masterPercent}%, Active: ${activeElements}`);
});
```

### Directional Order Configuration
```typescript
const directionalConfig: StaggerConfig = {
    enabled: true,
    delay: 0.15,
    strategy: 'linear',
    order: {
        forward: 'first-to-last',  // Normal order going forward
        backward: 'center-out'     // Different order going backward
    }
};

// Forward animation:  [0] → [1] → [2] → [3] → [4]
// Backward animation: [2] → [1,3] → [0,4] (center-out)
```

## Integration Points

### Automatic Feature Detection
The system automatically chooses the right implementation:

```typescript
// EventAnimationCoordinator automatically detects advanced features
private needsAdvancedStaggerFeatures(staggerConfig): boolean {
    const hasSpatialOrders = 
        config.order?.forward === 'center-out' ||
        config.order?.forward === 'edges-in';
    
    const hasDifferentDirectionalOrders = 
        config.order?.forward !== config.order?.backward;
        
    return hasSpatialOrders || hasDifferentDirectionalOrders;
}
```

### State Management Integration
```typescript
// Progress updates automatically sync with AnimationStateManager
orchestrator.onProgressUpdate(slotId, (update) => {
    animationStateManager.updateProgress(slotId, update.masterProgress);
});
```

### Cleanup and Resource Management
```typescript
// Proper cleanup of dual progress resources
orchestrator.cleanupSequence(slotId);

// Automatically called in EventAnimationCoordinator cleanup
this.staggerOrchestrator.cleanupSequence(slot.id);
```

## Performance Considerations

### Smart Implementation Selection
- **Simple staggers** → LinearStagger (lightweight, existing performance)
- **Advanced staggers** → StaggerOrchestrator (feature-rich, dual progress)

### Progress Update Frequency
```typescript
const config: StaggerOrchestrationConfig = {
    progressUpdateInterval: 16, // 60fps (default)
    // progressUpdateInterval: 32, // 30fps (lighter)
    // progressUpdateInterval: 64, // 15fps (minimal)
};
```

### Memory Efficiency
- Element states stored in Maps for O(1) access
- Progress callbacks only active during sequences
- Automatic cleanup prevents memory leaks

## Migration Guide

### From Simple to Dual Progress
No code changes required! The system automatically detects when dual progress is needed:

```typescript
// This will use LinearStagger (simple)
const basicConfig: StaggerConfig = {
    enabled: true,
    delay: 0.1,
    strategy: 'linear',
    order: {
        forward: 'first-to-last',
        backward: 'last-to-first'
    }
};

// This will use StaggerOrchestrator (dual progress)
const advancedConfig: StaggerConfig = {
    enabled: true,
    delay: 0.1,
    strategy: 'linear',
    order: {
        forward: 'center-out',    // Spatial order triggers dual progress
        backward: 'edges-in'
    }
};
```

### Legacy Compatibility
Old stagger configurations continue working:

```typescript
// Legacy format (deprecated but functional)
const legacyConfig = {
    enabled: true,
    delay: 0.1,
    direction: 'reverse'  // Will be migrated automatically
};

// Automatically converted to:
const modernConfig = {
    enabled: true,
    delay: 0.1,
    order: {
        forward: 'last-to-first',
        backward: 'first-to-last'
    }
};
```

## Testing and Demos

### Built-in Demonstrations
```typescript
// Interactive dual progress demo
import { runDualProgressDemo } from './utils/staggering';
runDualProgressDemo();

// Compare different stagger orders
import { runOrderComparisonDemo } from './utils/staggering';
runOrderComparisonDemo();
```

### Order Validation Tests
```typescript
// Run comprehensive stagger order tests
import { runStaggerOrderTests } from './utils/staggering';
runStaggerOrderTests();
```

## Next Steps

The dual progress system enables future advanced features:

### Phase 6.3: Scroll Stagger Foundation
- Scroll-based dual progress coordination
- Per-element scroll trigger points
- Viewport-relative staggering

### Phase 6.4: Grid Staggering
- 2D grid distance calculations with dual progress
- Grid-aware master timeline coordination

### Phase 6.5: Performance Optimization
- Master timeline scrubbing
- Pause/resume sequence controls
- Advanced progress interpolation

---

## API Reference

For detailed API documentation, see:
- **[StaggerOrchestrator API](./api/STAGGER-ORCHESTRATOR-API.md)**
- **[Dual Progress Types](./api/DUAL-PROGRESS-TYPES.md)**
- **[Integration Guide](./guides/DUAL-PROGRESS-INTEGRATION.md)**
- **[Examples Collection](./examples/DUAL-PROGRESS-EXAMPLES.md)**

---

**The dual progress stagger system represents a significant advancement in FAME's animation coordination capabilities, providing both powerful new features and seamless backward compatibility.** 