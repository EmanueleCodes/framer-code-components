# FAME Architecture Documentation

> **Technical Reference** - Internal system architecture and data flow

## 🧠 Core Mental Model

FAME follows a **three-stage animation pipeline**:

```
Time Progress (Linear) → Easing Function → Property Value
     0.0 → 1.0              Y = f(X)         Interpolation
```

### **Key Insight: Separation of Concerns**
- **Time**: Linear progression (0 → 1) - handles duration, delays, completion
- **Easing**: Mathematical transformation - handles animation curves, springs, overshoot
- **Interpolation**: Value calculation - handles units, types, property-specific logic

This separation enables:
- ✅ **Predictable timing** - Duration always controls time, regardless of easing
- ✅ **Flexible curves** - Easing can overshoot (springs) without breaking timing
- ✅ **Type safety** - Each stage handles its specific responsibilities

---

## 🏗️ System Architecture

### **Component Hierarchy**

```
AnimationOrchestrator (Entry Point)
    ↓
TimedAnimator (Animation Engine)
    ↓ Uses
├── EasingFunctions (Curve Library)
├── PropertyInterpolator (Value Calculation)
├── StyleCapture (Initial Values)
├── TransformUtils (Transform Handling)
└── StyleApplicator (DOM Updates)
```

### **Core Components**

#### **1. TimedAnimator** (`execution/TimedAnimator.ts`)
**Responsibility**: Time-based animation execution and lifecycle management

```typescript
// Primary Interface
animate(slot: AnimationSlot, element: HTMLElement, reverse?: boolean): CleanupFunction

// Core Responsibilities:
- ⏱️ Time management (RAF loops, duration tracking)
- 🎯 Per-property timing (individual durations/delays)
- 🔄 Animation lifecycle (start, stop, complete)
- 📊 Performance optimization (60fps targeting)
- 🧹 Resource cleanup (memory management)
```

**Critical Implementation Details**:
- **Per-Property Duration**: `prop.duration * 1000` (converts UI seconds to milliseconds)
- **Progress Calculation**: `elapsed / propDuration` (unclamped for timing)
- **Completion Logic**: All properties must complete before animation ends

#### **2. EasingFunctions** (`utils/easings/EasingFunctions.ts`)
**Responsibility**: Mathematical animation curves and spring physics

```typescript
// Spring Physics Implementation
spring.out(progress: number, config: SpringConfig): number // Can return > 1.0!

// Key Features:
- 🎪 20+ easing functions (linear, cubic, expo, springs, etc.)
- 🏀 Spring overshoot support (amplitude, period control)
- 🔧 Type-safe configuration interfaces
- ⚡ Performance-optimized calculations
```

**Critical Implementation Details**:
- **Springs Return > 1.0**: For overshoot effects (e.g., 1.2 = 20% overshoot)
- **Amplitude/Period**: Controls bounce intensity and oscillation speed
- **No Progress Clamping**: Easing functions can output any value

#### **3. PropertyInterpolator** (`utils/properties/PropertyInterpolator.ts`)
**Responsibility**: Value interpolation with type and unit awareness

```typescript
// Main Interface
interpolateProperty(from: PropertyValue, to: PropertyValue, progress: number, property: string): PropertyValue

// Features:
- 🔢 Numeric interpolation (0 → 100)
- 📏 Unit-aware interpolation ("0px" → "100px")
- 🎨 Color interpolation (future: "#ff0000" → "#0000ff")
- 🚀 Transform interpolation (future: complex transforms)
```

**Critical Implementation Details**:
- **No Progress Clamping**: Allows spring overshoot (`progress = 1.2` → `value = 120px`)
- **Unit Preservation**: Maintains CSS units through interpolation
- **Type Detection**: Property name determines interpolation strategy

#### **4. Supporting Utilities**

**StyleCapture** (`utils/properties/StyleCapture.ts`):
- Initial style capture for "from" value calculation
- Current property value reading
- Transform value extraction

**TransformUtils** (`utils/properties/TransformUtils.ts`):
- Transform string parsing and combination
- Prevents transform property overwrites
- Maintains transform order

**StyleApplicator** (`execution/StyleApplicator.ts`):
- DOM property application
- Unit duplication prevention
- Intelligent unit detection

---

## 📊 Data Flow

### **1. Animation Configuration**
```typescript
// Input: User Configuration
AnimationSlot {
  properties: [
    {
      property: "translateX",
      from: "0px",
      to: "300px", 
      duration: 2.0,        // seconds (UI)
      easing: "spring.out",
      springConfig: { amplitude: 2, period: 0.3 }
    }
  ],
  timing: {
    duration: 1.0,          // fallback duration
    easing: "cubic.inout"   // fallback easing
  }
}
```

### **2. Animation Execution**
```typescript
// Step 1: TimedAnimator.animate()
- Convert duration: 2.0 seconds → 2000 milliseconds
- Capture initial styles
- Create RunningAnimation object
- Start RAF loop

// Step 2: Animation Loop (every frame)
for each property:
  // Time Calculation
  propDuration = prop.duration * 1000 || slot.timing.duration || 1000
  elapsed = currentTime - startTime
  timeProgress = elapsed / propDuration  // 0.0 → 1.0
  clampedProgress = Math.max(0, Math.min(1, timeProgress))
  
  // Easing Application  
  easedProgress = applyEasing(clampedProgress, "spring.out", springConfig)
  // Result: easedProgress can be 1.2 (overshoot!)
  
  // Value Interpolation
  currentValue = interpolateProperty("0px", "300px", easedProgress, "translateX")
  // Result: "360px" (20% overshoot from 1.2 eased progress)
  
  // DOM Application
  applyProperty(element, "translateX", "360px")
```

### **3. Completion Detection**
```typescript
// Animation completes when ALL properties reach clampedProgress >= 1.0
if (allPropertiesComplete) {
  removeFromAnimationQueue()
  completeAnimation()
}
```

---

## 🎯 Key Design Decisions

### **1. Per-Property Timing**
**Decision**: Each property can have individual duration and delay
**Rationale**: Enables complex staggering and independent property timelines
**Implementation**: `prop.duration` takes precedence over `slot.timing.duration`

### **2. Unclamped Eased Progress**
**Decision**: Easing functions can return values outside 0-1 range
**Rationale**: Essential for spring overshoot and bounce effects
**Implementation**: Only clamp time-based progress, never eased progress

### **3. Unit Conversion Strategy**
**Decision**: Convert UI seconds to milliseconds internally
**Rationale**: JavaScript timing functions use milliseconds
**Implementation**: `prop.duration * 1000` in TimedAnimator

### **4. Modular Utilities**
**Decision**: Extract utilities from TimedAnimator into focused modules
**Rationale**: Reusability, testability, and separation of concerns
**Implementation**: Each utility has single responsibility

### **5. Performance-First Architecture**
**Decision**: 60fps optimization with frame budgeting
**Rationale**: Smooth animations are critical for user experience
**Implementation**: RAF queue with priority system and performance monitoring

---

## 🐛 Critical Bug Fixes

### **1. Duration Bug (Fixed)**
**Problem**: All animations ran at same speed regardless of duration setting
**Root Cause**: Used slot duration (milliseconds) for property duration (seconds)
```typescript
// ❌ Broken
const progress = elapsed / animation.duration; // Wrong unit!

// ✅ Fixed  
const propDuration = prop.duration * 1000 || slot.timing.duration || 1000;
const progress = elapsed / propDuration; // Correct unit conversion
```

### **2. Spring Overshoot Bug (Fixed)**
**Problem**: Springs felt laggy and didn't bounce
**Root Cause**: Progress clamping prevented overshoot
```typescript
// ❌ Broken
progress = Math.max(0, Math.min(1, progress)); // Kills overshoot!
const easedProgress = applyEasing(progress, "spring.out");

// ✅ Fixed
const clampedProgress = Math.max(0, Math.min(1, progress)); // Only for timing
const easedProgress = applyEasing(clampedProgress, "spring.out"); // Can overshoot!
```

### **3. Property Interpolation Clamping (Fixed)**
**Problem**: Springs still couldn't overshoot after TimedAnimator fix
**Root Cause**: PropertyInterpolator was clamping eased progress
```typescript
// ❌ Broken (in PropertyInterpolator)
if (progress < 0) progress = 0;
if (progress > 1) progress = 1; // Kills spring overshoot!

// ✅ Fixed
// Removed clamping - springs need overshoot to create bounce effects
```

---

## 📈 Current Status

### **✅ Working Components**
- **TimedAnimator**: Complete with per-property timing
- **EasingFunctions**: 20+ functions including working springs
- **PropertyInterpolator**: Basic interpolation with overshoot support
- **Performance System**: 60fps optimization with frame budgeting
- **Type System**: Comprehensive TypeScript definitions

### **🚧 Future Enhancements**
- **Scroll Animations**: Scroll-based triggers and scrubbing
- **Staggering System**: Linear and grid-based staggering
- **Advanced Interpolation**: Color, complex transforms, filters
- **Text Effects**: Character and word-level animations

### **🎯 Architecture Goals Achieved**
1. ✅ **Predictable Timing**: Duration changes affect speed correctly
2. ✅ **Spring Physics**: Proper overshoot and bounce behavior  
3. ✅ **Type Safety**: Full TypeScript coverage with validation
4. ✅ **Performance**: Smooth 60fps animations
5. ✅ **Modularity**: Clean separation of concerns
6. ✅ **Extensibility**: Easy to add new properties and easings

---

## 🔧 Development Guidelines

### **Adding New Features**
1. **Identify the layer**: Time, Easing, or Interpolation?
2. **Maintain separation**: Don't mix timing logic with easing logic
3. **Preserve overshoot**: Never clamp eased progress values
4. **Add types**: Full TypeScript support required
5. **Test edge cases**: Especially timing boundaries and spring behavior

### **Performance Considerations**
- **RAF optimization**: Use animation queue system
- **Memory management**: Always provide cleanup functions
- **Frame budgeting**: Stay within 8ms per frame target
- **Batch DOM updates**: Minimize layout thrashing

### **Testing Strategy**
- **Timing accuracy**: Verify duration changes affect speed
- **Spring behavior**: Confirm overshoot and settling
- **Edge cases**: Test 0%, 100%, and overshoot values
- **Performance**: Monitor frame rates under load 