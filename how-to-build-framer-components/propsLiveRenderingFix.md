# Props Live Rendering Fix for Framer Canvas Components

## Problem
When props change in the Framer Canvas property controls, the changes don't reflect immediately in the canvas preview. This creates a disconnect between the controls and the visual output, making it difficult to iterate and fine-tune components.

## Root Cause
Framer Canvas components often initialize expensive resources (Three.js scenes, WebGL contexts, animations) in `useEffect` with empty dependency arrays `[]`. This means prop changes don't trigger re-initialization, so the component continues using the initial prop values.

## Solutions

### 1. Ref-Based Live Updates (Recommended for Performance)

**Best for:** Animation loops, continuous updates, expensive re-initialization

**Technique:** Use refs to store current prop values and read them in animation loops or event handlers.

```typescript
export default function MyComponent(props: MyProps) {
  const speedRef = useRef<number>(props.speed ?? 1)
  const colorRef = useRef<string>(props.color ?? "#ff0000")
  
  // Update refs when props change
  useEffect(() => {
    speedRef.current = props.speed ?? 1
  }, [props.speed])
  
  useEffect(() => {
    colorRef.current = props.color ?? "#ff0000"
  }, [props.color])
  
  // Use refs in animation loop
  const animate = () => {
    requestAnimationFrame(animate)
    uniforms.speed.value = speedRef.current
    uniforms.color.value = new THREE.Color(colorRef.current)
    renderer.render(scene, camera)
  }
}
```

**Example:** `ShaderLines.tsx` - Speed control updates animation without re-initializing Three.js

### 2. Dependency Array Updates

**Best for:** Simple components, when re-initialization is cheap

**Technique:** Add prop dependencies to `useEffect` dependency arrays.

```typescript
useEffect(() => {
  // Re-initialize when critical props change
  initComponent()
}, [props.speed, props.color, props.size])
```

**Warning:** Only use when re-initialization is fast and doesn't cause performance issues.

### 3. State-Based Updates

**Best for:** Components that need to trigger re-renders, form-like components

**Technique:** Use state to store prop values and update them.

```typescript
export default function MyComponent(props: MyProps) {
  const [currentSpeed, setCurrentSpeed] = useState(props.speed ?? 1)
  
  useEffect(() => {
    setCurrentSpeed(props.speed ?? 1)
  }, [props.speed])
  
  // Use currentSpeed in render logic
}
```

### 4. Direct Prop Usage in Render Loops

**Best for:** Simple animations, when props don't change frequently

**Technique:** Read props directly in animation loops (use with caution).

```typescript
const animate = () => {
  requestAnimationFrame(animate)
  // Direct prop access - may cause stale closures
  uniforms.speed.value = props.speed ?? 1
  renderer.render(scene, camera)
}
```

**Warning:** Can cause stale closure issues if props change after component mount.

### 5. Custom Hook Pattern

**Best for:** Reusable animation logic across multiple components

**Technique:** Create custom hooks that handle prop updates.

```typescript
function useLiveProps<T>(props: T) {
  const propsRef = useRef<T>(props)
  
  useEffect(() => {
    propsRef.current = props
  }, [props])
  
  return propsRef
}

export default function MyComponent(props: MyProps) {
  const liveProps = useLiveProps(props)
  
  const animate = () => {
    requestAnimationFrame(animate)
    const currentProps = liveProps.current
    uniforms.speed.value = currentProps.speed ?? 1
    renderer.render(scene, camera)
  }
}
```

## Implementation Patterns

### Pattern 1: Single Prop Ref
```typescript
const speedRef = useRef(props.speed ?? 1)
useEffect(() => { speedRef.current = props.speed ?? 1 }, [props.speed])
```

### Pattern 2: Multiple Props Ref
```typescript
const propsRef = useRef({ speed: props.speed ?? 1, color: props.color ?? "#ff0000" })
useEffect(() => { 
  propsRef.current = { speed: props.speed ?? 1, color: props.color ?? "#ff0000" }
}, [props.speed, props.color])
```

### Pattern 3: Conditional Updates
```typescript
const speedRef = useRef(props.speed ?? 1)
useEffect(() => {
  if (typeof props.speed === "number" && props.speed > 0) {
    speedRef.current = props.speed
  }
}, [props.speed])
```

## Best Practices

### 1. Choose the Right Pattern
- **Refs:** For animation loops, WebGL uniforms, continuous updates
- **State:** For UI re-renders, form components
- **Dependencies:** For simple components with cheap re-initialization

### 2. Performance Considerations
- Avoid re-initializing expensive resources (Three.js scenes, WebGL contexts)
- Use refs for high-frequency updates
- Batch prop updates when possible

### 3. Type Safety
```typescript
const speedRef = useRef<number>(props.speed ?? 1)
// Ensures type safety and provides fallback values
```

### 4. Cleanup
```typescript
useEffect(() => {
  // Update ref
  speedRef.current = props.speed ?? 1
  
  return () => {
    // Cleanup if needed
  }
}, [props.speed])
```

## Common Issues and Solutions

### Issue 1: Stale Closures
**Problem:** Animation loop captures initial prop values
**Solution:** Use refs instead of direct prop access

### Issue 2: Performance Degradation
**Problem:** Re-initializing expensive resources on every prop change
**Solution:** Use refs for live updates, only re-initialize when necessary

### Issue 3: Inconsistent Behavior
**Problem:** Some props update live, others don't
**Solution:** Apply consistent pattern across all interactive props

### Issue 4: Canvas vs Live Preview Differences
**Problem:** Props work in live preview but not in canvas
**Solution:** Use `RenderTarget.current()` to detect canvas mode and adjust behavior

## Testing Strategies

### 1. Canvas Testing
- Test prop changes in Framer Canvas
- Verify immediate visual feedback
- Check performance with rapid prop changes

### 2. Live Preview Testing
- Ensure props work in live preview
- Test on different devices and browsers
- Verify no performance regressions

### 3. Edge Cases
- Test with extreme prop values
- Test rapid prop changes
- Test prop changes during animations

## Examples from Codebase

### ShaderLines.tsx
```typescript
// Speed prop updates animation immediately
const speedRef = useRef<number>(typeof props.speed === "number" ? props.speed : 1)
useEffect(() => {
  speedRef.current = Math.max(0, typeof props.speed === "number" ? props.speed : 1)
}, [props.speed])

const animate = () => {
  sceneRef.current.animationId = requestAnimationFrame(animate)
  uniforms.time.value += 0.05 * speedRef.current
  renderer.render(scene, camera)
}
```

### EmblaCarousel.tsx
```typescript
// Multiple props trigger re-initialization when needed
useEffect(() => {
  const cancel = queueReInit(emblaApi)
  if (emblaApi && outerWidth > 0) {
    requestAnimationFrame(() => setIsReady(true))
  }
  return cancel
}, [queueReInit, emblaApi, gap, slideBasis, outerWidth, slidesPerView])
```

## Migration Guide

### Step 1: Identify Interactive Props
List all props that should update the component visually.

### Step 2: Choose Update Pattern
- Animation/WebGL props → Use refs
- UI props → Use state or dependencies
- Simple props → Use dependencies

### Step 3: Implement Updates
Add refs and useEffect hooks for each interactive prop.

### Step 4: Test in Canvas
Verify all props update immediately in Framer Canvas.

### Step 5: Performance Check
Ensure no performance regressions in live preview.

## Additional Fixes

### Fix 6: Component Resize Detection

**Problem:** Components don't re-render when resized in Framer Canvas, causing content to appear cropped or misaligned.

**Root Cause:** Framer Canvas components only listen to window resize events, not component-level resize changes. When you resize a component in the canvas, the internal WebGL/Three.js renderer doesn't update its dimensions.

**Solution:** Implement canvas-specific resize detection that polls for size/aspect ratio changes.

```typescript
// Canvas resize detection for Framer Canvas
if (RenderTarget.current() === RenderTarget.canvas) {
  let rafId = 0
  const TICK_MS = 250
  const EPSPECT = 0.001
  const tick = (now?: number) => {
    const container = containerRef.current
    if (container) {
      const cw = container.clientWidth || container.offsetWidth || 1
      const ch = container.clientHeight || container.offsetHeight || 1
      const aspect = cw / ch

      const timeOk = !lastRef.current.ts || 
        (now || performance.now()) - lastRef.current.ts >= TICK_MS
      const aspectChanged = Math.abs(aspect - lastRef.current.aspect) > EPSPECT
      const sizeChanged = Math.abs(cw - lastRef.current.w) > 1 || 
        Math.abs(ch - lastRef.current.h) > 1

      if (timeOk && (aspectChanged || sizeChanged)) {
        lastRef.current = { w: cw, h: ch, aspect, ts: now || performance.now() }
        onWindowResize() // Updates renderer and uniforms
      }
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}
```

**Key Features:**
- **Throttled polling** (250ms intervals) for performance
- **Aspect ratio detection** (0.001 threshold) for proper scaling
- **Size change detection** (1px threshold) for dimension updates
- **Canvas-only detection** using `RenderTarget.current() === RenderTarget.canvas`
- **Proper cleanup** to prevent memory leaks

**Example:** `ShaderLines.tsx` - Shader content now properly scales when component is resized in canvas

### Fix 7: Frame-Rate Independence

**Problem:** Animation speed differs between Framer Canvas and live preview due to different frame rates.

**Root Cause:** Fixed time increments (`0.05`) multiplied by speed don't account for frame rate differences. Canvas might run at 30fps while production runs at 60fps, causing inconsistent animation speeds.

**Solution:** Use delta time for frame-rate independent animation.

```typescript
// Before: Fixed time increment (frame-rate dependent)
const animate = () => {
  requestAnimationFrame(animate)
  uniforms.time.value += 0.05 * speedRef.current
  renderer.render(scene, camera)
}

// After: Delta time (frame-rate independent)
let lastTime = 0
const animate = (currentTime: number) => {
  requestAnimationFrame(animate)
  
  // Calculate delta time for frame-rate independent animation
  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016
  lastTime = currentTime
  
  // Use delta time for consistent speed across different frame rates
  uniforms.time.value += deltaTime * speedRef.current
  renderer.render(scene, camera)
}
```

**How It Works:**
- **Delta time:** Time elapsed since last frame (in seconds)
- **Frame-rate independent:** Speed stays consistent regardless of 30fps vs 60fps
- **Canvas = Production:** Same visual speed in both environments
- **Fallback:** Defaults to 60fps timing on first frame

**Benefits:**
- ✅ **Consistent speed** across all environments
- ✅ **Smooth animation** regardless of frame rate
- ✅ **Predictable behavior** for users
- ✅ **Better performance** on lower-end devices

**Example:** `ShaderLines.tsx` - Speed control now behaves identically in canvas and production

## Implementation Checklist

When implementing these fixes:

### Component Resize Detection
- [ ] Add `RenderTarget` import from framer
- [ ] Create `lastRef` to track size/aspect changes
- [ ] Implement throttled polling (250ms intervals)
- [ ] Detect aspect ratio changes (0.001 threshold)
- [ ] Detect size changes (1px threshold)
- [ ] Only run in canvas mode
- [ ] Proper cleanup of RAF and listeners

### Frame-Rate Independence
- [ ] Track `lastTime` for delta calculation
- [ ] Calculate `deltaTime = (currentTime - lastTime) / 1000`
- [ ] Use delta time in animation loops
- [ ] Provide fallback for first frame (0.016s)
- [ ] Apply to all time-based animations

## Conclusion

The ref-based approach provides the best balance of performance and responsiveness for Framer Canvas components. It allows immediate prop updates without expensive re-initialization, creating a smooth editing experience that matches user expectations.

Key takeaways:
1. **Use refs for animation loops** - immediate updates without re-initialization
2. **Use dependencies for simple components** - when re-initialization is cheap
3. **Test in both canvas and live preview** - ensure consistent behavior
4. **Consider performance implications** - avoid unnecessary re-initialization
5. **Apply consistently** - use the same pattern across all interactive props
6. **Implement resize detection** - for proper canvas scaling
7. **Use delta time** - for frame-rate independent animations
