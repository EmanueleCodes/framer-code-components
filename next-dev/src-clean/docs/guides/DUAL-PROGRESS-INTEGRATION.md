# Dual Progress Stagger Integration Guide

**Version 2.1.0 - Phase 6.2 Implementation**

This guide covers how to integrate the dual progress stagger system into your animations and applications.

## Quick Start

### 1. Automatic Integration (Recommended)

The dual progress system integrates automatically with the existing FAME animation system:

```typescript
// Your existing stagger configuration
const staggerConfig: StaggerConfig = {
    enabled: true,
    delay: 0.1,
    strategy: 'linear',
    order: {
        forward: 'center-out',  // This triggers dual progress automatically
        backward: 'edges-in'
    }
};

// No code changes needed! The system automatically detects
// when dual progress features are required and routes accordingly.
```

### 2. Manual Integration (Advanced)

For advanced use cases, integrate the StaggerOrchestrator directly:

```typescript
import { StaggerOrchestrator } from './utils/staggering';

const orchestrator = new StaggerOrchestrator({
    enableDualProgress: true,
    progressUpdateInterval: 16
});

// Initialize sequence
const staggerState = orchestrator.initializeStaggerSequence(
    'my-sequence',
    elements,
    staggerConfig,
    'forward'
);

// Set up progress monitoring
orchestrator.onProgressUpdate('my-sequence', (update) => {
    // Your progress handling logic
    console.log(`Master: ${update.masterProgress}, Elements: ${update.elementUpdates.length}`);
});

// Execute sequence
await orchestrator.executeStaggerSequence(
    'my-sequence',
    masterTimeline,
    'PLAY_FORWARD',
    0
);
```

---

## Integration Patterns

### Pattern 1: Progress Monitoring

Track both master sequence and individual element progress:

```typescript
class StaggerMonitor {
    private orchestrator: StaggerOrchestrator;
    
    constructor() {
        this.orchestrator = new StaggerOrchestrator({
            enableDualProgress: true,
            progressUpdateInterval: 16 // 60fps updates
        });
    }
    
    async startMonitoredSequence(
        slotId: string,
        elements: HTMLElement[],
        config: StaggerConfig
    ) {
        // Initialize with progress tracking
        const staggerState = this.orchestrator.initializeStaggerSequence(
            slotId,
            elements,
            config,
            'forward'
        );
        
        // Set up dual progress monitoring
        this.orchestrator.onProgressUpdate(slotId, (update) => {
            this.handleProgressUpdate(update);
        });
        
        console.log('Starting monitored sequence:', {
            elementCount: elements.length,
            totalDuration: staggerState.totalSequenceDuration,
            order: staggerState.staggerResult.orderUsed
        });
        
        // Execute with monitoring
        await this.orchestrator.executeStaggerSequence(
            slotId,
            masterTimeline,
            'PLAY_FORWARD',
            0
        );
        
        console.log('Sequence completed with full progress tracking');
    }
    
    private handleProgressUpdate(update: StaggerProgressUpdate) {
        // Master progress (overall sequence)
        const masterPercent = (update.masterProgress * 100).toFixed(1);
        
        // Element analysis
        const elementStats = this.analyzeElementProgress(update.elementUpdates);
        
        // Update UI components
        this.updateProgressBar(update.masterProgress);
        this.updateElementStates(update.elementUpdates);
        
        // Log progress
        console.log(`🎯 Sequence: ${masterPercent}% | Elements - Active: ${elementStats.active}, Completed: ${elementStats.completed}`);
    }
    
    private analyzeElementProgress(elementUpdates: any[]) {
        return {
            waiting: elementUpdates.filter(el => el.progress === 0).length,
            active: elementUpdates.filter(el => el.progress > 0 && el.progress < 1).length,
            completed: elementUpdates.filter(el => el.progress >= 1).length
        };
    }
    
    private updateProgressBar(masterProgress: number) {
        const progressBar = document.getElementById('stagger-progress');
        if (progressBar) {
            progressBar.style.width = `${masterProgress * 100}%`;
        }
    }
    
    private updateElementStates(elementUpdates: any[]) {
        elementUpdates.forEach(elementUpdate => {
            const element = document.getElementById(`element-${elementUpdate.index}`);
            if (element) {
                // Visual state based on progress
                if (elementUpdate.progress === 0) {
                    element.className = 'waiting';
                } else if (elementUpdate.progress < 1) {
                    element.className = 'active';
                } else {
                    element.className = 'completed';
                }
            }
        });
    }
}
```

### Pattern 2: Real-time UI Updates

Integrate with React components:

```typescript
// React Hook Example
function useStaggerProgress(slotId: string) {
    const [masterProgress, setMasterProgress] = useState(0);
    const [elementStates, setElementStates] = useState<Map<number, number>>(new Map());
    
    const orchestrator = useRef(new StaggerOrchestrator({
        enableDualProgress: true,
        progressUpdateInterval: 16
    }));
    
    useEffect(() => {
        orchestrator.current.onProgressUpdate(slotId, (update) => {
            setMasterProgress(update.masterProgress);
            
            const newElementStates = new Map();
            update.elementUpdates.forEach(el => {
                newElementStates.set(el.index, el.progress);
            });
            setElementStates(newElementStates);
        });
        
        return () => {
            orchestrator.current.cleanupSequence(slotId);
        };
    }, [slotId]);
    
    return { masterProgress, elementStates };
}
```

---

## Configuration Strategies

### Performance-Optimized

```typescript
const performanceConfig: StaggerOrchestrationConfig = {
    enableDualProgress: true,
    progressUpdateInterval: 32,        // 30fps (lighter than default 60fps)
    behaviorCoordination: 'master-controlled',
    progressSync: 'batched'           // Batch updates for performance
};
```

### High-Fidelity Monitoring

```typescript
const highFidelityConfig: StaggerOrchestrationConfig = {
    enableDualProgress: true,
    progressUpdateInterval: 8,         // 120fps (very smooth)
    behaviorCoordination: 'master-controlled',
    progressSync: 'realtime'          // Immediate updates
};
```

---

## Best Practices

### 1. Resource Management
```typescript
// Always clean up sequences
try {
    await orchestrator.executeStaggerSequence(slotId, timeline, behavior);
} finally {
    orchestrator.cleanupSequence(slotId);
}
```

### 2. Progress Update Optimization
```typescript
// Batch DOM updates for better performance
orchestrator.onProgressUpdate(slotId, (update) => {
    requestAnimationFrame(() => {
        updateProgressBar(update.masterProgress);
        updateElementStates(update.elementUpdates);
    });
});
```

### 3. Error Handling
```typescript
try {
    const staggerState = orchestrator.initializeStaggerSequence(slotId, elements, config);
    await orchestrator.executeStaggerSequence(slotId, timeline, behavior);
} catch (error) {
    console.error('Stagger execution failed:', error);
    orchestrator.cleanupSequence(slotId);
}
```

---

**The dual progress integration system provides powerful coordination capabilities while maintaining backward compatibility and ease of use.** 