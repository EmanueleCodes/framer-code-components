# Framer Version Debug: Canvas/R3F Hooks Error Resolution

## Problem Summary

The Framer version of the 3D scanning effect was encountering a critical error:
```
Error: R3F: Hooks can only be used within the Canvas component!
```

This error was introduced when attempting to make the images fill the full container width using the `useAspect` hook.

## Root Cause Analysis

### The Error Chain
1. **Initial Problem**: Images weren't filling the full red container
2. **Attempted Solution**: Used `useAspect(WIDTH, HEIGHT)` hook to calculate proper scaling
3. **New Problem**: `useAspect` is a React Three Fiber hook that can only be called within components rendered inside a `<Canvas>` component
4. **Component Hierarchy Issue**: The hook was being called in the wrong place in the component tree

### Component Rendering Chain
```
SafeCanvas (Canvas wrapper)
└── <Canvas> (R3F Canvas component)
    └── <Suspense>
        └── SceneContent (calls useAspect ❌)
            └── ScanningScene (renders meshes)
```

**Problem**: `SceneContent` was calling `useAspect`, but `SceneContent` itself wasn't properly within the Canvas context.

## Solution Strategy

### Phase 1: Eliminate R3F Hooks (Immediate Fix)
**Approach**: Remove the problematic `useAspect` hook entirely and use manual calculations.

**Code Change**:
```typescript
// BEFORE (causing error)
const [w, h] = useAspect(WIDTH, HEIGHT)
const scale = [w, h, 1]

// AFTER (no hooks, no errors)
const scale = [2, 2, 1] // Simple fixed scaling
```

**Result**: ✅ WebGL errors eliminated, but images still not filling container properly.

### Phase 2: Implement CSS-like "Cover" Behavior
**Approach**: Calculate proper scaling manually to achieve `object-fit: cover` behavior without using R3F hooks.

**Code Implementation**:
```typescript
// Calculate proper "cover" scale to fill container without stretching
// This mimics CSS object-fit: cover behavior
const containerAspect = 1 // Canvas default viewport is square (-1 to 1)
const imageAspect = WIDTH / HEIGHT // 1600/900 = 1.78

let scaleX, scaleY
if (imageAspect > containerAspect) {
    // Image is wider than container - scale to fill height
    scaleY = 2 // Fill the full height (-1 to 1 = 2 units)
    scaleX = scaleY * imageAspect
} else {
    // Image is taller than container - scale to fill width  
    scaleX = 2 // Fill the full width (-1 to 1 = 2 units)
    scaleY = scaleX / imageAspect
}

const scale = [scaleX, scaleY, 1] as [number, number, number]
```

**How it works**:
- **Image aspect ratio**: 1600/900 = 1.78 (wider than tall)
- **Container aspect ratio**: 1 (square viewport)
- **Since 1.78 > 1**: Scale to fill height completely, then scale width proportionally
- **Result**: `scaleY = 2`, `scaleX = 3.56` (maintains aspect ratio)

## Key Lessons Learned

### 1. R3F Hook Context Requirements
- **Rule**: R3F hooks (`useAspect`, `useFrame`, `useThree`, etc.) can ONLY be called within components that are rendered inside a `<Canvas>` component
- **Common Mistake**: Calling hooks in parent components that render Canvas children
- **Solution**: Either move hooks to child components within Canvas, or use manual calculations

### 2. Component Hierarchy Matters
```
✅ CORRECT: Hook inside Canvas
<Canvas>
  <ComponentWithHook /> // useAspect here is OK
</Canvas>

❌ WRONG: Hook outside Canvas
<ComponentWithHook /> // useAspect here causes error
<Canvas>
  <ChildComponent />
</Canvas>
```

### 3. Manual Calculations vs R3F Hooks
- **R3F Hooks**: Automatic, responsive, but require proper context
- **Manual Calculations**: More control, no context requirements, but need careful implementation
- **Trade-off**: Choose based on complexity and context requirements

## Canvas Configuration

The final working Canvas configuration:
```typescript
<Canvas
    style={{
        width: "100%",
        height: "100%",
    }}
    resize={{ offsetSize: true }}
    gl={{
        antialias: true,
        powerPreference: "high-performance",
        precision: "mediump",
        depth: true,
    }}
    dpr={[1, 2]}
    flat
    camera={{ position: [0, 0, 1] }}
>
```

## Final Result

✅ **No WebGL errors**
✅ **Images fill entire container**
✅ **Proper aspect ratio maintained**
✅ **CSS-like "cover" behavior**
✅ **Works reliably in Framer environment**

## Alternative Solutions Considered

### Option 1: Move useAspect to Proper Context
- **Approach**: Restructure component hierarchy to call `useAspect` within Canvas
- **Pros**: Uses R3F's built-in responsive scaling
- **Cons**: Complex component restructuring, potential for other context issues
- **Decision**: Rejected due to complexity

### Option 2: Use useThree for Manual Calculations
- **Approach**: Use `useThree()` to get viewport size, then calculate manually
- **Pros**: Responsive to viewport changes
- **Cons**: Still requires proper Canvas context
- **Decision**: Rejected due to same context issues

### Option 3: Manual Cover Calculation (Chosen)
- **Approach**: Calculate scaling manually to achieve CSS cover behavior
- **Pros**: No R3F hooks needed, predictable behavior, simple implementation
- **Cons**: Not responsive to viewport changes (but acceptable for this use case)
- **Decision**: ✅ Chosen for simplicity and reliability

## Debugging Tips for Future R3F Issues

1. **Check Hook Context**: Always verify R3F hooks are called within Canvas components
2. **Component Hierarchy**: Map out the rendering chain to identify context issues
3. **Error Messages**: R3F errors are usually clear about context requirements
4. **Manual Alternatives**: When hooks cause issues, manual calculations often work
5. **Canvas Configuration**: Ensure proper Canvas setup for Framer environment

## Files Modified

- `next-dev/app/3D-scan/effect1/CLOSEST TO BE WORKING.tsx`
  - Removed `useAspect` hook usage
  - Implemented manual cover scaling calculation
  - Updated Canvas configuration
  - Fixed component prop passing

## Testing Checklist

- [x] No WebGL errors in console
- [x] Images fill entire red container
- [x] No image stretching/distortion
- [x] Proper aspect ratio maintained
- [x] Works in Framer preview
- [x] Works in Framer published site
- [x] Debug controls still functional
- [x] Mouse interaction still works 