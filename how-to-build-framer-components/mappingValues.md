# Mapping UI Values to Internal Values in Framer Components

## The Problem

When building Framer components, property controls often need to map user-friendly UI values to internal component values. For example:

- **UI**: A slider from 0.1 to 1.0 (user-friendly)
- **Internal**: A percentage from 20% to 2% (component logic)

This creates a better user experience where intuitive values map to meaningful internal behavior.

## Why Mapping is Important

1. **User-Friendly Controls**: Sliders with 0.1-1.0 are more intuitive than 20%-2%
2. **Inverted Logic**: Sometimes smaller UI values should map to larger internal values
3. **Consistent Ranges**: Standardize control ranges across components
4. **Better UX**: Users think in terms of "coarse" vs "fine" rather than specific percentages

## The Solution: Linear Mapping Functions

### 1. Basic Linear Mapping

```typescript
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}
```

**How it works:**
- Takes a value in the input range (inMin to inMax)
- Maps it proportionally to the output range (outMin to outMax)
- Handles edge case where input range is zero

### 2. Inverted Mapping (Common Pattern)

```typescript
function mapBeamSizeUiToPercent(ui: number): number {
    // UI 0.1..1 → percent 20..2 (inverse mapping)
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 20, 2)
}
```

**Why inverted?**
- UI 0.1 = "coarse" = big beams (20% of container)
- UI 1.0 = "fine" = small beams (2% of container)
- This matches user mental model: lower values = bigger elements

## Real-World Examples

### Example 1: Beam Size Mapping (Warp Background)

```typescript
// Property Control
beamSize: {
    type: ControlType.Number,
    title: "Size",
    min: 0.1,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
}

// Mapping Function
function mapBeamSizeUiToPercent(ui: number): number {
    const clamped = Math.max(0.1, Math.min(1, ui))
    return mapLinear(clamped, 0.1, 1.0, 20, 2)
}

// Usage
const gridPercent = mapBeamSizeUiToPercent(beamSize)
```

**Result:**
- UI 0.1 → 20% (big beams, coarse grid)
- UI 0.5 → 11% (medium beams)
- UI 1.0 → 2% (small beams, fine grid)

### Example 2: Speed Mapping (Warp Background)

```typescript
// Property Control
speed: {
    type: ControlType.Number,
    title: "Speed",
    min: 0.1,
    max: 1,
    step: 0.1,
    defaultValue: 0.5,
}

// Mapping Function
const clampedSpeed = Math.max(0.1, Math.min(1, speed))
const normalized = (clampedSpeed - 0.1) / 0.9 // 0..1
const beamDuration = 15 - 14 * normalized // 15 -> 1

// Usage
const duration = beamDuration // seconds
```

**Result:**
- UI 0.1 → 15 seconds (slow animation)
- UI 0.5 → 8 seconds (medium speed)
- UI 1.0 → 1 second (fast animation)

### Example 3: Resolution Mapping (Interactive Wave)

```typescript
// Property Control
resolution: {
    type: ControlType.Number,
    title: "Resolution",
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.5,
}

// Mapping Function
const yGap = baseYGap + (1 - resolution) * 20

// Usage
const lineSpacing = yGap // pixels between wave points
```

**Result:**
- UI 0.0 → Large yGap (snappy, low-res lines)
- UI 0.5 → Medium yGap (balanced)
- UI 1.0 → Small yGap (smooth, high-res lines)

## Common Mapping Patterns

### 1. Direct Mapping (No Inversion)
```typescript
// UI 0-100 → Internal 0-100
const value = mapLinear(uiValue, 0, 100, 0, 100)
```

### 2. Inverted Mapping
```typescript
// UI 0.1-1.0 → Internal 20-2 (inverted)
const value = mapLinear(uiValue, 0.1, 1.0, 20, 2)
```

### 3. Exponential Mapping
```typescript
// UI 0-1 → Internal 1-100 (exponential)
const value = Math.pow(uiValue, 2) * 99 + 1
```

### 4. Clamped Mapping
```typescript
// Always clamp input values
const clamped = Math.max(min, Math.min(max, uiValue))
const mapped = mapLinear(clamped, min, max, outMin, outMax)
```

## Best Practices

### 1. Always Clamp Input Values
```typescript
const clamped = Math.max(0.1, Math.min(1, uiValue))
```

### 2. Use Descriptive Function Names
```typescript
// Good
function mapBeamSizeUiToPercent(ui: number): number

// Bad
function map(ui: number): number
```

### 3. Document the Mapping
```typescript
// UI 0.1..1 → percent 20..2 (inverse mapping)
// 0.1 = coarse (big beams), 1.0 = fine (small beams)
```

### 4. Test Edge Cases
```typescript
// Test minimum, maximum, and middle values
console.log(mapBeamSizeUiToPercent(0.1)) // Should be 20
console.log(mapBeamSizeUiToPercent(1.0)) // Should be 2
console.log(mapBeamSizeUiToPercent(0.5)) // Should be 11
```

### 5. Use Consistent Ranges
```typescript
// Standard UI ranges across components
min: 0.1, max: 1, step: 0.05  // Fine control
min: 0, max: 1, step: 0.1     // Coarse control
min: 0, max: 100, step: 1     // Percentage
```

## Implementation Checklist

- [ ] Define clear input range (min, max, step)
- [ ] Define clear output range (what the component needs)
- [ ] Decide if mapping should be inverted
- [ ] Implement mapping function with clamping
- [ ] Test edge cases (min, max, middle values)
- [ ] Document the mapping behavior
- [ ] Use descriptive function names
- [ ] Apply consistently across similar controls

## Common Mistakes to Avoid

❌ **Don't forget to clamp input values** - Users can input values outside the range
❌ **Don't use confusing ranges** - 0.1-1.0 is better than 0.01-0.99
❌ **Don't forget edge cases** - Test min, max, and middle values
❌ **Don't use unclear function names** - Be descriptive about what the mapping does
❌ **Don't forget documentation** - Comment why the mapping exists

## Testing Your Mapping

```typescript
// Test function
function testMapping() {
    const testCases = [
        { input: 0.1, expected: 20 },
        { input: 0.5, expected: 11 },
        { input: 1.0, expected: 2 },
    ]
    
    testCases.forEach(({ input, expected }) => {
        const result = mapBeamSizeUiToPercent(input)
        console.log(`Input: ${input}, Expected: ${expected}, Got: ${result}`)
    })
}
```

## Key Takeaways

1. **Map UI values to internal values** for better user experience
2. **Use linear mapping** for most cases with `mapLinear` function
3. **Always clamp input values** to prevent out-of-range errors
4. **Consider inverted mapping** when smaller UI values should mean bigger internal values
5. **Test edge cases** to ensure mapping works correctly
6. **Document the mapping** so future developers understand the logic
7. **Use consistent ranges** across similar controls in your components

This approach ensures your Framer components have intuitive, user-friendly controls that map to meaningful internal behavior.

---

**Remember**: Good mapping makes your components feel natural and intuitive to use, while bad mapping creates confusion and poor user experience.
