# Reverse Mode Options - Usage Examples

## Overview

Phase 5 introduces two distinct reverse animation paradigms:

1. **Easing Preservation** (NEW DEFAULT): Swaps values while preserving easing behavior
2. **Time Reversal** (LEGACY): Plays timeline backwards with easing transformation

## Basic Usage in Property Controls

```typescript
// Example 1: Default behavior (Easing Preservation)
const triggerWithDefault = {
    selection: { scope: ElementScope.SELF },
    event: EventType.CLICK,
    behavior: AnimationBehavior.PLAY_BACKWARD,
    // reverseMode not specified = defaults to EASING_PRESERVATION
};

// Example 2: Explicit Easing Preservation
const triggerWithEasingPreservation = {
    selection: { scope: ElementScope.SELF },
    event: EventType.CLICK,
    behavior: AnimationBehavior.PLAY_BACKWARD,
    reverseMode: ReverseMode.EASING_PRESERVATION
};

// Example 3: Legacy Time Reversal
const triggerWithTimeReversal = {
    selection: { scope: ElementScope.SELF },
    event: EventType.CLICK,
    behavior: AnimationBehavior.PLAY_BACKWARD,
    reverseMode: ReverseMode.TIME_REVERSAL
};
```

## Animation Behavior Comparison

### Forward Animation (Both modes identical)
```
0px ----spring.out----> 100px
- Fast start, wobble at end
- Natural spring motion
```

### Reverse with Easing Preservation (NEW DEFAULT)
```
100px ---spring.out---> 0px
- Fast start, wobble at end (same as forward!)
- Consistent easing behavior
- Modern UI standard
```

### Reverse with Time Reversal (LEGACY)
```
100px <--spring.in---- 0px
- Wobble at start, fast end
- Time-reversed motion
- Natural physics simulation
```

## When to Use Each Mode

### Use Easing Preservation (Default) When:
- Building modern UI interfaces
- Want consistent motion feel in both directions
- Creating toggle animations
- Building interactive controls (buttons, switches, etc.)

### Use Time Reversal When:
- Simulating realistic physics
- Want natural motion reversal
- Building physics-based animations
- Matching GSAP-style time reversal

## Implementation Details

### Data Flow
```
Property Controls → AnimationSlotAdapter → AnimationOrchestrator → MasterTimelinePlayer
      ↓                     ↓                        ↓                    ↓
  reverseMode         Pass through             Pass through       Apply transformation
```

### Timeline Transformation
```typescript
// Original keyframes
[
    { time: 0, value: 0, easing: 'spring.out' },
    { time: 1, value: 100, easing: 'spring.out' }
]

// Easing Preservation transformation
[
    { time: 0, value: 100, easing: 'spring.out' }, // Start with end value
    { time: 1, value: 0, easing: 'spring.out' }    // End with start value
]
```

## Benefits

1. **Modern UI Standard**: Easing preservation matches user expectations
2. **Backward Compatibility**: Time reversal still available for physics simulations
3. **Performance**: Lightweight transformation at execution level
4. **Timeline Purity**: Original timeline unchanged, transformation on execution
5. **Multi-Instance Support**: Works automatically with Timeline-First Architecture

## How to Use in Framer

### In Property Controls UI:

1. **Add an Animation Slot** in your FAME component
2. **Configure a Trigger** with any reverse behavior:
   - "Play Backward"
   - "Play Backward & Reset"  
   - "Play Backward & Reverse"
   - "Toggle" (can become reverse)
3. **Choose Reverse Mode** from the dropdown:
   - **"Easing Preservation (Default)"** - Modern UI standard
   - **"Time Reversal (Legacy)"** - Physics simulation
4. The **Reverse Mode control** appears automatically when you select a reverse behavior

### Smart UI Features:
- **Auto-hide**: Reverse Mode only shows for relevant behaviors
- **Default Selection**: Easing Preservation is pre-selected for better UX
- **Clear Labels**: "Default" and "Legacy" help users understand the choice

## Migration Guide

**For New Animations**: No changes needed - easing preservation is the default

**For Existing Animations**: 
- If you want the old behavior, select "Time Reversal (Legacy)" in the dropdown
- If you want the new behavior, select "Easing Preservation (Default)" or leave as default
- The UI makes it easy to switch between modes and see the difference 