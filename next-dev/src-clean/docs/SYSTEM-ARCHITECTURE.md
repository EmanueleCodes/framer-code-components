# FAME System Architecture

> **Technical Reference** - Complete system architecture and component design

## 🧠 Core Mental Model

**FAME's Fundamental Principle**: Separate Time, Easing, and Interpolation

```
Linear Time (0→1) → Easing Function → Property Value
   Duration          Curves/Springs    Interpolation
```

This separation enables:
- ✅ Predictable timing regardless of easing complexity
- ✅ Spring overshoot without breaking timing logic  
- ✅ Reusable components with single responsibilities

---

## 🏗️ System Architecture

### **Component Hierarchy**

```
TimedAnimator (Core Engine)
├── EasingFunctions (Math Library)
├── PropertyInterpolator (Value Calculator)
├── StyleCapture (State Reader)
├── TransformUtils (Transform Handler)
└── StyleApplicator (DOM Updater)
```

### **Data Flow**

```
User Config → Animation Slot → TimedAnimator → RAF Loop → DOM Updates
```

---

## 📋 Component Reference

### **1. TimedAnimator** (`execution/TimedAnimator.ts`)

**Purpose**: Core animation execution engine
**Lines**: ~550
**Status**: ✅ Complete with critical bug fixes

**Key Responsibilities**:
- ⏱️ Time management (RAF loops, duration, delays)
- 🎯 Per-property timing control
- 📊 60fps performance optimization
- 🧹 Resource cleanup and lifecycle management

**Critical Implementation**:
```typescript
// Per-property timing with unit conversion
const propDuration = prop.duration * 1000 || slot.timing?.duration || 1000;
const timeProgress = elapsed / propDuration;

// Separate timing and easing progress
const clampedProgress = Math.max(0, Math.min(1, timeProgress)); // For timing only
const easedProgress = applyEasing(clampedProgress, easingType, config); // Can overshoot!
```

**Major Bug Fixes**:
- ✅ Duration unit conversion (UI seconds → internal milliseconds)
- ✅ Removed progress clamping that killed spring overshoot

### **2. EasingFunctions** (`utils/easings/EasingFunctions.ts`)

**Purpose**: Mathematical animation curves and spring physics
**Lines**: ~250
**Status**: ✅ Complete with 20+ easing functions

**Available Easings**:
- Basic: `linear`, `in`, `out`, `inout`
- Cubic: `cubic.in`, `cubic.out`, `cubic.inout`
- Exponential: `expo.in`, `expo.out`, `expo.inout`
- Springs: `spring`, `spring.in`, `spring.out` (with overshoot)

**Spring Physics**:
```typescript
interface SpringConfig {
  amplitude: number; // 1-5: Bounce intensity
  period: number;    // 0.1-2: Oscillation speed
}

// Springs can return values > 1.0 for overshoot effects
const result = applyEasing(0.8, "spring.out", { amplitude: 2, period: 0.3 });
// Result: 1.15 (15% overshoot)
```

### **3. PropertyInterpolator** (`utils/properties/PropertyInterpolator.ts`)

**Purpose**: Value interpolation with type awareness
**Lines**: ~290
**Status**: ✅ Basic implementation with overshoot support

**Key Features**:
- 🔢 Numeric interpolation
- 📏 Unit-aware interpolation ("0px" → "100px")
- 🚀 Spring overshoot support (progress > 1.0)

**Critical Fix**:
```typescript
// ❌ REMOVED: Progress clamping that prevented spring overshoot
// if (progress < 0) progress = 0;
// if (progress > 1) progress = 1;

// ✅ Springs can now overshoot properly
// progress = 1.15, from = "0px", to = "300px" → result = "345px"
```

### **4. Supporting Utilities**

**StyleCapture** (`utils/properties/StyleCapture.ts`):
- Initial style capture before animation
- Current property value reading
- Transform value extraction

**TransformUtils** (`utils/properties/TransformUtils.ts`):
- Transform parsing and combination
- Prevents transform property overwrites
- Critical fix: Multiple transforms can coexist

**StyleApplicator** (`execution/StyleApplicator.ts`):
- DOM property application
- Unit duplication prevention
- Intelligent property routing

---

## 🌊 Complete Data Flow

### **1. Configuration Input**
```typescript
// User configures animation
const config = {
  properties: [{
    property: "translateX",
    from: "0px", to: "300px",
    duration: 2.5, // seconds
    easing: "spring.out",
    springConfig: { amplitude: 2, period: 0.3 }
  }]
}
```

### **2. TimedAnimator Processing**
```typescript
// Convert and initialize
const propDuration = 2.5 * 1000; // → 2500ms
const startTime = performance.now();
const initialStyles = captureInitialStyles(element, properties);
```

### **3. Animation Loop (Every Frame)**
```typescript
// Time calculation
const elapsed = currentTime - startTime;
const timeProgress = elapsed / 2500; // Linear progression

// Example at 800ms elapsed:
timeProgress = 0.32; // 32% complete

// Easing application
const clampedProgress = Math.min(1, timeProgress); // 0.32
const easedProgress = applyEasing(0.32, "spring.out", config); // 0.45 (spring curve)

// Value interpolation
const currentValue = interpolateProperty("0px", "300px", 0.45, "translateX"); // "135px"

// DOM application
applyProperty(element, "translateX", "135px");
```

### **4. Spring Overshoot Example**
```typescript
// Later in animation when timeProgress = 0.9
const clampedProgress = 0.9;
const easedProgress = applyEasing(0.9, "spring.out", config); // 1.15 (overshoot!)
const currentValue = interpolateProperty("0px", "300px", 1.15, "translateX"); // "345px"
// Result: Element moves to 345px (15% past target) then bounces back
```

---

## 🎯 Key Design Decisions

### **1. Per-Property Timing**
**Decision**: Each property can have individual duration/delay
**Rationale**: Enables complex animations and staggering
**Implementation**: Property timing overrides slot timing

### **2. Unclamped Eased Progress**
**Decision**: Easing functions can return values outside 0-1
**Rationale**: Essential for spring physics and overshoot effects
**Implementation**: Only clamp time-based progress, never eased values

### **3. Unit Conversion Strategy**
**Decision**: Convert UI seconds to milliseconds internally
**Rationale**: JavaScript timing uses milliseconds
**Implementation**: `prop.duration * 1000`

### **4. Component Separation**
**Decision**: Extract utilities from monolithic animator
**Rationale**: Testability, reusability, maintainability
**Implementation**: Single-responsibility modules

### **5. Performance-First Design**
**Decision**: 60fps optimization with frame budgeting
**Rationale**: Smooth animations are critical UX
**Implementation**: RAF queue with 8ms frame budget

---

## 🐛 Critical Bug History

### **1. Duration Bug (FIXED)**
**Symptom**: All animations same speed regardless of duration
**Cause**: Mixed units (UI seconds vs internal milliseconds)
**Fix**: Proper unit conversion `prop.duration * 1000`

### **2. Spring Overshoot Bug (FIXED)**
**Symptom**: Springs felt laggy, no bounce
**Cause**: Progress clamping prevented overshoot
**Fix**: Separate time-based (clamped) from eased (unclamped) progress

### **3. Interpolation Clamping (FIXED)**
**Symptom**: Springs still couldn't overshoot after TimedAnimator fix
**Cause**: PropertyInterpolator was clamping eased values
**Fix**: Removed progress clamping in interpolation

---

## 📊 Current Status

### **✅ Working Features**
- Time-based animations with accurate duration control
- Spring physics with proper overshoot and bounce
- Per-property timing (duration, delay, easing)
- 60fps performance optimization
- Transform property handling (no overwrites)
- Comprehensive easing library (20+ functions)
- Type-safe TypeScript implementation

### **🚧 Planned Features**
- Scroll-based animations and triggers
- Linear and grid staggering systems
- Advanced color interpolation
- Complex transform combinations
- Text splitting and character animations
- Automated testing suite

### **🎯 Architecture Goals Achieved**
1. ✅ Predictable timing system
2. ✅ Physics-accurate spring animations
3. ✅ Modular, testable components
4. ✅ High-performance execution
5. ✅ Type-safe implementation
6. ✅ Extensible design

---

## 🔧 Development Guidelines

### **Adding New Features**
1. Identify the correct layer (Time/Easing/Interpolation)
2. Maintain separation of concerns
3. Preserve spring overshoot capability
4. Add comprehensive TypeScript types
5. Follow performance best practices

### **Testing Strategy**
- Test timing accuracy with different durations
- Verify spring overshoot behavior
- Check edge cases (0%, 100%, overshoot values)
- Monitor performance under load
- Validate type safety

### **Performance Standards**
- Target 60fps for all animations
- Stay within 8ms frame budget
- Minimize DOM layout thrashing
- Provide cleanup functions for memory management
- Use RAF queue for efficient scheduling

This architecture enables FAME to deliver **predictable timing** with **expressive animation curves** while maintaining **high performance** and **code quality**. 