# FAME Component Reference

> **Technical Reference** - Core components and their responsibilities

## 🏗️ Component Overview

FAME follows a **modular architecture** where each component has a single, well-defined responsibility. This enables **testability**, **reusability**, and **maintainability**.

```
TimedAnimator (Orchestrator)
├── EasingFunctions (Mathematical curves)
├── PropertyInterpolator (Value calculation)  
├── StyleCapture (Initial state reading)
├── TransformUtils (Transform manipulation)
└── StyleApplicator (DOM updates)
```

---

## 🎬 TimedAnimator

**Location**: `execution/TimedAnimator.ts`
**Purpose**: Core animation execution engine

### **Responsibilities**
- ⏱️ **Time Management**: RAF loops, duration tracking, frame scheduling
- 🎯 **Per-Property Timing**: Individual property durations and delays
- 🔄 **Animation Lifecycle**: Start, pause, resume, stop, cleanup
- 📊 **Performance Optimization**: 60fps targeting with frame budgeting
- 🧹 **Resource Management**: Memory cleanup and queue management

### **Key Methods**

```typescript
class TimedAnimator {
  // Main animation interface
  animate(slot: AnimationSlot, element: HTMLElement, reverse?: boolean): CleanupFunction
  
  // Lifecycle control
  stopAnimation(animationId: string): void
  completeAnimation(animationId: string): void
  cleanup(): void
  
  // Performance monitoring
  getPerformanceStats(): PerformanceStats
}
```

### **Critical Implementation Details**

```typescript
// Per-property timing calculation
const propDuration = prop.duration * 1000 || slot.timing?.duration || 1000;
const timeProgress = elapsed / propDuration;

// Separate time-based and eased progress
const clampedProgress = Math.max(0, Math.min(1, timeProgress)); // For timing
const easedProgress = applyEasing(clampedProgress, easingType, springConfig); // Can overshoot
```

### **Performance Features**
- **RAF Queue System**: Prioritized animation processing
- **Frame Budgeting**: 8ms maximum per frame (60fps target)
- **Performance Monitoring**: Frame time tracking and optimization
- **Memory Management**: Automatic cleanup of completed animations

---

## 🎪 EasingFunctions

**Location**: `utils/easings/EasingFunctions.ts`
**Purpose**: Mathematical animation curves and spring physics

### **Responsibilities**
- 🔢 **Curve Calculation**: Transform linear time into animation curves
- 🏀 **Spring Physics**: Amplitude and period-based spring simulations
- ⚡ **Performance**: Optimized mathematical calculations
- 🎯 **Overshoot Support**: Return values outside 0-1 range for springs

### **Available Easings**

```typescript
// Basic easings
linear, in, out, inout

// Cubic variations  
cubic, cubic.in, cubic.out, cubic.inout

// Exponential curves
expo, expo.in, expo.out, expo.inout

// Spring physics (with overshoot)
spring, spring.in, spring.out
```

### **Spring Configuration**

```typescript
interface SpringConfig {
  amplitude: number; // 1-5: Controls bounce intensity
  period: number;    // 0.1-2: Controls oscillation speed
}

// Usage
const easedProgress = applyEasing(0.8, "spring.out", { amplitude: 2, period: 0.3 });
// Result: Could be 1.15 (15% overshoot for bounce effect)
```

### **Critical Features**
- **No Progress Clamping**: Springs can return values > 1.0 or < 0.0
- **Physics Simulation**: Proper spring equations with damping
- **Performance Optimized**: Fast mathematical calculations

---

## 🔄 PropertyInterpolator

**Location**: `utils/properties/PropertyInterpolator.ts`
**Purpose**: Value interpolation with type and unit awareness

### **Responsibilities**
- 🔢 **Numeric Interpolation**: Basic number interpolation
- 📏 **Unit-Aware Interpolation**: CSS values with units (px, %, em, etc.)
- 🎨 **Type Detection**: Property-specific interpolation strategies
- 🚀 **Overshoot Support**: Allow eased progress outside 0-1 range

### **Key Methods**

```typescript
// Main interpolation interface
interpolateProperty(from: PropertyValue, to: PropertyValue, progress: number, property: string): PropertyValue

// Specialized interpolators
interpolateNumeric(from: PropertyValue, to: PropertyValue, progress: number): number
interpolateWithUnits(from: string, to: string, progress: number): string
interpolateColor(from: string, to: string, progress: number): string // Future
```

### **Critical Implementation**

```typescript
// ✅ NO progress clamping - allows spring overshoot
export function interpolateProperty(fromValue, toValue, progress, property) {
  // 🚨 REMOVED: progress clamping that killed springs
  // if (progress < 0) progress = 0;
  // if (progress > 1) progress = 1;
  
  // Spring overshoot example:
  // progress = 1.15, from = "0px", to = "300px"
  // Result: "345px" (15% overshoot)
}
```

### **Interpolation Strategies**
- **Numeric**: `from + (to - from) * progress`
- **Unit-Aware**: Extract numbers, interpolate, preserve units
- **Color**: RGB/HSL interpolation (planned)
- **Transform**: Complex transform combination (planned)

---

## 📸 StyleCapture

**Location**: `utils/properties/StyleCapture.ts`
**Purpose**: Initial style reading and property value extraction

### **Responsibilities**
- 🎯 **Initial State Capture**: Read current property values before animation
- 🔍 **Property Value Reading**: Extract computed styles from DOM
- 🎪 **Transform Parsing**: Handle complex transform strings
- 💾 **State Management**: Cache and manage captured styles

### **Key Methods**

```typescript
// Capture initial styles for all animated properties
captureInitialStyles(element: HTMLElement, properties: AnimationProperty[]): Map<string, PropertyValue>

// Read current property value
getCurrentPropertyValue(element: HTMLElement, property: string): PropertyValue
```

### **Transform Handling**

```typescript
// Handle complex transform properties
const currentTransform = "translateX(50px) rotate(45deg) scale(1.2)";
const extractedValue = extractTransformValue(currentTransform, "translateX");
// Result: "50px"
```

---

## 🔧 TransformUtils

**Location**: `utils/properties/TransformUtils.ts`
**Purpose**: Transform property manipulation and combination

### **Responsibilities**
- 🔍 **Transform Parsing**: Extract individual transform values
- 🔄 **Transform Combination**: Maintain existing transforms while updating specific properties
- 📏 **Unit Handling**: Preserve transform units and formats
- 🎯 **Property Isolation**: Update single transform property without affecting others

### **Key Methods**

```typescript
// Extract specific transform value
extractTransformValue(transformString: string, property: string): string

// Apply single transform property while preserving others
applyTransform(element: HTMLElement, property: string, value: string): void
```

### **Transform Combination Logic**

```typescript
// Example: Update translateX without affecting rotate
// Current: "translateX(100px) rotate(45deg)"
// Update: translateX to "200px"
// Result: "translateX(200px) rotate(45deg)"

const updated = applyTransform(element, "translateX", "200px");
// Preserves existing transforms, updates only specified property
```

### **Critical Bug Fix**
- **Problem**: Transform properties were overwriting each other
- **Solution**: Parse existing transforms, update only target property, recombine
- **Result**: Multiple transform animations can run simultaneously

---

## 🎨 StyleApplicator

**Location**: `execution/StyleApplicator.ts`
**Purpose**: DOM property application with intelligent unit handling

### **Responsibilities**
- 🎯 **DOM Updates**: Apply computed values to element styles
- 📏 **Unit Intelligence**: Prevent unit duplication (e.g., "100pxpx")
- 🚀 **Performance**: Efficient DOM manipulation
- 🔧 **Property Routing**: Route properties to correct style attributes

### **Key Methods**

```typescript
// Main property application interface
applyProperty(element: HTMLElement, property: string, value: PropertyValue, unit?: string): void
```

### **Unit Intelligence**

```typescript
// Prevent unit duplication bug
// Input: property="translateX", value="100px", unit="px" 
// Old behavior: "100pxpx" ❌
// New behavior: "100px" ✅

function applyProperty(element, property, value, unit) {
  // Intelligent unit detection
  if (hasUnits(value) && unit) {
    // Don't add duplicate units
    finalValue = value;
  } else {
    finalValue = value + (unit || '');
  }
}
```

### **Transform Routing**

```typescript
// Route transform properties correctly
if (isTransformProperty(property)) {
  applyTransform(element, property, value);
} else {
  element.style[property] = value;
}
```

---

## 🧩 Component Interactions

### **Data Flow Between Components**

```typescript
// 1. TimedAnimator initiates
const initialStyles = captureInitialStyles(element, properties); // → StyleCapture

// 2. For each frame
const easedProgress = applyEasing(timeProgress, easing, config); // → EasingFunctions
const currentValue = interpolateProperty(from, to, easedProgress, property); // → PropertyInterpolator
applyProperty(element, property, currentValue); // → StyleApplicator

// 3. Transform handling
if (isTransformProperty(property)) {
  applyTransform(element, property, currentValue); // → TransformUtils
}
```

### **Dependency Graph**

```
TimedAnimator (core)
├── depends on: EasingFunctions
├── depends on: PropertyInterpolator  
├── depends on: StyleCapture
└── depends on: StyleApplicator
    └── depends on: TransformUtils
```

### **Interface Contracts**

```typescript
// Each component has clear input/output contracts
type EasingFunction = (progress: number, config?: SpringConfig) => number;
type Interpolator = (from: PropertyValue, to: PropertyValue, progress: number, property: string) => PropertyValue;
type StyleApplicator = (element: HTMLElement, property: string, value: PropertyValue) => void;
```

---

## 🔧 Extension Points

### **Adding New Easing Functions**

```typescript
// 1. Add to EasingFunctions object
EasingFunctions["custom.bounce"] = (t: number) => {
  // Custom easing implementation
  return Math.sin(t * Math.PI * 4) * (1 - t) + t;
};

// 2. Add to options array
EASING_OPTIONS.push("custom.bounce");
```

### **Adding New Property Types**

```typescript
// 1. Extend PropertyInterpolator
if (property === 'filter') {
  return interpolateFilter(from, to, progress);
}

// 2. Add specialized interpolator
function interpolateFilter(from: string, to: string, progress: number): string {
  // Custom filter interpolation logic
}
```

### **Adding New Transform Properties**

```typescript
// 1. Extend TransformUtils
const TRANSFORM_PROPERTIES = ['translateX', 'translateY', 'rotate', 'scale', 'skew'];

// 2. Add parsing logic
function extractTransformValue(transform: string, property: string): string {
  // Handle new transform property
}
```

---

## 📊 Component Status

| Component | Status | Lines | Test Coverage | Performance |
|-----------|---------|-------|---------------|-------------|
| **TimedAnimator** | ✅ Complete | ~550 | Manual | Optimized |
| **EasingFunctions** | ✅ Complete | ~250 | Manual | Optimized |
| **PropertyInterpolator** | ✅ Basic | ~290 | Manual | Good |
| **StyleCapture** | ✅ Complete | ~150 | Manual | Good |
| **TransformUtils** | ✅ Complete | ~200 | Manual | Good |
| **StyleApplicator** | ✅ Complete | ~100 | Manual | Good |

### **Future Enhancements**
- **Color Interpolation**: RGB, HSL, hex color support
- **Complex Transforms**: Matrix transformations, 3D transforms
- **Filter Interpolation**: CSS filter property support
- **Automated Testing**: Unit tests for all components
- **Performance Profiling**: Detailed performance metrics 