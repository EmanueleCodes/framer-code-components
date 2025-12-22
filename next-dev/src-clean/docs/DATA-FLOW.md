# FAME Data Flow Documentation

> **Technical Reference** - How data flows through the animation system

## 🌊 Animation Data Flow

### **Overview: From UI Configuration to DOM Updates**

```
User Configuration → Animation Slot → TimedAnimator → RAF Loop → Property Updates → DOM
```

---

## 📋 Step-by-Step Data Flow

### **1. Input: User Configuration**
**Source**: Framer property panel / programmatic API

```typescript
// Example: User configures a spring animation
const userInput = {
  eventType: "click",
  properties: [{
    property: "translateX",
    from: "0px",           // Starting position
    to: "300px",           // Target position  
    duration: 2.5,         // Duration in SECONDS (UI format)
    easing: "spring.out",  // Spring easing type
    springConfig: {
      amplitude: 2.0,      // Bounce intensity
      period: 0.3          // Oscillation speed
    }
  }],
  timing: {                // Fallback timing
    duration: 1.0,         // Fallback duration (seconds)
    easing: "cubic.inout"  // Fallback easing
  }
}
```

### **2. Processing: Animation Slot Creation**
**Component**: AnimationOrchestrator
**Purpose**: Validate and normalize configuration

```typescript
// Normalized AnimationSlot
const animationSlot: AnimationSlot = {
  id: "generated-id",
  properties: [{
    property: "translateX",
    from: "0px",
    to: "300px", 
    duration: 2.5,         // Still in seconds
    easing: "spring.out",
    springConfig: { amplitude: 2.0, period: 0.3 }
  }],
  timing: {
    duration: 1000,        // Converted to milliseconds
    easing: "cubic.inout"
  }
}
```

### **3. Execution: TimedAnimator.animate()**
**Component**: TimedAnimator
**Purpose**: Initialize animation and start RAF loop

```typescript
// Internal Animation Object
const animation: RunningAnimation = {
  id: "anim-12345",
  element: targetElement,
  slot: animationSlot,
  startTime: performance.now(), // High-resolution timestamp
  duration: 2500,               // Converted to milliseconds
  isActive: true
}

// Initial Style Capture
const initialStyles = captureInitialStyles(element, slot.properties);
// Result: Map { "translateX" → "0px" } (current element style)
```

### **4. Animation Loop: RAF Processing**
**Component**: TimedAnimator (performance queue)
**Purpose**: Calculate and apply animation frame updates

```typescript
// Every frame (60fps target):
const animate = (currentTime: number) => {
  
  // For each property:
  slot.properties.forEach(prop => {
    
    // 🔢 TIMING CALCULATION
    const propDuration = prop.duration * 1000; // 2.5s → 2500ms
    const elapsed = currentTime - animation.startTime;
    const timeProgress = elapsed / propDuration; // 0.0 → 1.0 linearly
    
    // Example values at 0.8 seconds elapsed:
    // elapsed = 800ms
    // timeProgress = 800/2500 = 0.32
    
    // ⏰ PROGRESS CLAMPING (for timing only)
    const clampedProgress = Math.max(0, Math.min(1, timeProgress));
    // clampedProgress = 0.32 (within bounds)
    
    // 🎪 EASING APPLICATION
    const easedProgress = applyEasing(clampedProgress, "spring.out", springConfig);
    // For spring: easedProgress could be 0.45 (early in animation)
    // Later in animation: easedProgress could be 1.15 (overshoot!)
    
    // 🔄 VALUE INTERPOLATION  
    const currentValue = interpolateProperty("0px", "300px", easedProgress, "translateX");
    // With easedProgress = 1.15: currentValue = "345px" (15% overshoot!)
    
    // 🎯 DOM APPLICATION
    applyProperty(element, "translateX", "345px");
    // Result: element.style.transform = "translateX(345px)"
  });
}
```

### **5. Completion: Animation End**
**Trigger**: All properties reach `clampedProgress >= 1.0`

```typescript
// Completion Logic
if (allPropertiesComplete) {
  removeFromAnimationQueue(animation.id);
  completeAnimation(animation.id);
  // Result: Element settled at final value (300px)
}
```

---

## 🎯 Detailed Component Interactions

### **TimedAnimator → EasingFunctions**

```typescript
// Input to easing function
const input = {
  progress: 0.32,           // Time-based progress (clamped 0-1)
  easingType: "spring.out", // Easing function name
  springConfig: {           // Spring parameters
    amplitude: 2.0,
    period: 0.3
  }
}

// Easing function processing
const easedProgress = EasingFunctions["spring.out"](0.32, springConfig);
// Result: Could be any value (e.g., 0.45, 1.15, etc.)
```

### **TimedAnimator → PropertyInterpolator**

```typescript
// Input to interpolation
const interpolationInput = {
  fromValue: "0px",         // Starting value
  toValue: "300px",         // Target value  
  progress: 1.15,           // Eased progress (can exceed 1.0!)
  property: "translateX"    // Property name for type detection
}

// Interpolation processing
const result = interpolateProperty("0px", "300px", 1.15, "translateX");

// Internal calculation:
// - Extract numbers: from=0, to=300, unit="px" 
// - Calculate: 0 + (300 - 0) * 1.15 = 345
// - Combine: "345px"
```

### **TimedAnimator → StyleApplicator**

```typescript
// Input to style application
const styleInput = {
  element: targetElement,   // DOM element
  property: "translateX",   // CSS property
  value: "345px",          // Computed value
  unit: undefined          // Optional unit override
}

// Style application processing
applyProperty(element, "translateX", "345px");

// Internal DOM update:
// element.style.transform = "translateX(345px)"
```

---

## ⚡ Performance Data Flow

### **RAF Queue System**

```typescript
// High-Performance Animation Queue
const animationQueue: AnimationFrame[] = [
  {
    animationId: "anim-12345",
    callback: animate,           // The animation function
    priority: "high",           // Spring animations get high priority
    lastExecutionTime: 0
  }
];

// Frame Processing (60fps target)
const processQueue = (timestamp: number) => {
  const frameStart = performance.now();
  const maxFrameTime = 8; // 8ms budget per frame
  
  // Process animations until frame budget exhausted
  while (frameTime < maxFrameTime && animationQueue.length > 0) {
    const animation = animationQueue.shift();
    animation.callback(timestamp);
  }
  
  // Continue to next frame
  if (animationQueue.length > 0) {
    requestAnimationFrame(processQueue);
  }
};
```

### **Performance Monitoring**

```typescript
// Frame Performance Tracking
const performanceMetrics = {
  frameTime: 6.2,           // Current frame time (ms)
  averageFrameTime: 7.1,    // Rolling average
  droppedFrames: 0,         // Frames > 33ms (< 30fps)
  currentFPS: 58,           // Calculated FPS
  isPerformanceOptimal: true // Within 90% of 60fps target
}
```

---

## 🔄 State Transitions

### **Animation Lifecycle**

```
[Idle] → [Starting] → [Active] → [Completing] → [Complete]
   ↑                                              ↓
   ←──────────────── [Cleanup] ←─────────────────
```

**State Details**:
- **Idle**: Animation configured but not started
- **Starting**: Initial setup, style capture, RAF queue addition
- **Active**: RAF loop running, properties updating each frame
- **Completing**: All properties reached 100% time progress
- **Complete**: Animation removed from queue, resources cleaned up
- **Cleanup**: Memory cleanup, event listeners removed

### **Property State Per Frame**

```typescript
// Each property tracks its own state
const propertyState = {
  timeProgress: 0.32,        // Linear time progression
  clampedProgress: 0.32,     // Bounded for timing logic  
  easedProgress: 0.45,       // After easing function
  currentValue: "135px",     // Interpolated result
  isComplete: false          // Has reached 100% time?
}
```

---

## 🧪 Data Flow Testing

### **Key Test Points**

1. **Unit Conversion**: `2.5 seconds → 2500 milliseconds`
2. **Progress Calculation**: `elapsed / duration = timeProgress`
3. **Easing Overshoot**: `spring(0.8) → 1.15` (overshoot allowed)
4. **Interpolation**: `from + (to - from) * 1.15 = overshoot value`
5. **DOM Application**: Correct CSS property updates

### **Edge Cases**

```typescript
// Test data for edge cases
const testCases = {
  zeroProgress: { time: 0.0, expected: fromValue },
  fullProgress: { time: 1.0, expected: toValue },
  overshoot: { time: 1.0, easing: "spring", expected: "> toValue" },
  negative: { time: 1.0, easing: "anticipate", expected: "< fromValue" }
}
```

This data flow documentation serves as the **technical reference** for understanding how FAME processes animations from user input to DOM updates. Each step maintains the core principle: **linear time → easing transformation → value interpolation**. 