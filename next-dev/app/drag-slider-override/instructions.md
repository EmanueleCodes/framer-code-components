# Framer Overrides: Lessons Learned from Hydration & SSR Issues

## Overview
This document captures the key lessons learned while fixing React hydration errors and server-side rendering issues in Framer overrides. The journey involved multiple iterations to achieve a stable, flash-free experience.

## The Problems We Encountered

### 1. **React Error #425: Text Content Mismatch**
- **Cause**: Server-rendered HTML didn't match client HTML
- **Root Issue**: Variant props being applied during render, causing different content between SSR and client
- **Lesson**: Never apply dynamic props during initial render that could differ between server and client

### 2. **React Error #418: Hydration Mismatch**
- **Cause**: Server/client branch differences, variable input, or external changing data
- **Root Issue**: Store mutations happening during render, creating different states between SSR and client
- **Lesson**: Avoid any state mutations during the render phase

### 3. **React Error #422: Hydration Recovery**
- **Cause**: React recovered by switching to client rendering from Suspense boundary
- **Root Issue**: Updates happening before hydration completed
- **Lesson**: Don't trigger updates during the hydration process

### 4. **React Error #421: Suspense Boundary Updates**
- **Cause**: Suspense boundary received updates before finishing hydration
- **Root Issue**: Layout effects firing during hydration, causing premature updates
- **Lesson**: Use passive effects (useEffect) instead of layout effects for initialization

### 5. **Content Flash**
- **Cause**: Brief display of wrong variant before correct one loads
- **Root Issue**: Components rendering with default state before store initialization
- **Lesson**: Hide content until fully mounted and initialized

## The Solutions We Implemented

### 1. **Move State Mutations to Effects**
```typescript
// ❌ WRONG: Mutating during render
if (!hasInitialized.current && !store.isInitialized) {
    setStore({ /* ... */ }) // This causes hydration issues
}

// ✅ CORRECT: Mutating in effect
useEffect(() => {
    if (!hasInitialized.current && !store.isInitialized) {
        setStore({ /* ... */ }) // Safe after mount
    }
}, [store.isInitialized])
```

### 2. **Use Passive Effects for Initialization**
```typescript
// ❌ WRONG: Layout effects can fire during hydration
useLayoutEffect(() => {
    // This can cause Suspense boundary issues
}, [])

// ✅ CORRECT: Passive effects wait for hydration
useEffect(() => {
    // Safe after hydration completes
}, [])
```

### 3. **Gate Dynamic Props Until After Mount**
```typescript
// ❌ WRONG: Applying variant immediately
return <Component variant={currentVariant} />

// ✅ CORRECT: Wait for mount
const [isMounted, setIsMounted] = useState(false)
useEffect(() => setIsMounted(true), [])

return (
    <Component
        style={{ visibility: isMounted ? "visible" : "hidden" }}
        {...(isMounted ? { variant: currentVariant } : {})}
    />
)
```

### 4. **Prevent Store Updates During Render**
```typescript
// ❌ WRONG: Direct store access during render
const currentVariant = store.contentVariants[store.currentIndex]

// ✅ CORRECT: Access store safely
const [store] = useVariantStore()
const currentVariant = store.contentVariants[store.currentIndex]
// But gate the application until mounted
```

## Key Principles for Framer Overrides

### 1. **Never Mutate State During Render**
- All store updates must happen in effects or event handlers
- Use refs to track initialization state
- Guard against multiple initializations

### 2. **Respect Hydration Boundaries**
- Don't apply dynamic props until after mount
- Use passive effects (useEffect) for initialization
- Avoid layout effects that could fire during hydration

### 3. **Handle SSR/Client Differences**
- Server and client must render identical initial HTML
- Delay any client-specific logic until after mount
- Use visibility: hidden to prevent layout shifts

### 4. **Initialize Stores Safely**
- Set initial store state in effects, not during render
- Use refs to prevent multiple initializations
- Handle Framer preview reloads gracefully

## Common Anti-Patterns to Avoid

### ❌ **Don't Do This:**
```typescript
// Mutating during render
if (condition) setStore(newState)

// Applying dynamic props immediately
<Component variant={dynamicValue} />

// Using layout effects for initialization
useLayoutEffect(() => setStore(initialState), [])

// Accessing window/document during render
const width = typeof window !== 'undefined' ? window.innerWidth : 0
```

### ✅ **Do This Instead:**
```typescript
// Mutate in effects
useEffect(() => {
    if (condition) setStore(newState)
}, [condition])

// Gate dynamic props
const [isReady, setIsReady] = useState(false)
useEffect(() => setIsReady(true), [])
<Component {...(isReady ? { variant: dynamicValue } : {})} />

// Use passive effects
useEffect(() => setStore(initialState), [])

// Access browser APIs safely
const [width, setWidth] = useState(0)
useEffect(() => setWidth(window.innerWidth), [])
```

## Testing Your Overrides

### 1. **Check for Hydration Errors**
- Look for React errors #418, #421, #422, #425
- Ensure no console warnings about hydration mismatches
- Verify server and client render identical HTML

### 2. **Test Flash Prevention**
- Page should load with correct variant immediately
- No brief display of wrong content
- Smooth transitions between variants

### 3. **Verify Functionality**
- Drag gestures work correctly
- Button navigation functions properly
- Rotation animations are smooth
- Store state persists correctly

## Debugging Tips

### 1. **Use React DevTools**
- Check component tree for hydration mismatches
- Verify props are applied correctly
- Monitor state changes

### 2. **Console Logging**
- Log store initialization
- Track variant changes
- Monitor effect execution order

### 3. **Network Tab**
- Check for hydration mismatches in HTML
- Verify SSR output matches client expectations

## Conclusion

The key to stable Framer overrides is understanding React's hydration process and respecting the boundaries between server and client rendering. By following these principles:

1. **Initialize safely** - Use effects, not render-time mutations
2. **Gate dynamic content** - Wait for mount before applying variants
3. **Respect hydration** - Don't trigger updates during SSR/client sync
4. **Test thoroughly** - Verify both functionality and stability

These lessons ensure your overrides work reliably across different environments while maintaining the smooth user experience Framer is known for.
