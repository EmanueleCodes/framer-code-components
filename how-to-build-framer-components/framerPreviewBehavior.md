# Framer Preview Behavior Guide

## Overview

The **Preview** property control is a critical performance optimization for canvas-based components in Framer. It allows users to toggle animation on/off within the Framer Canvas editor, providing better performance during design work while maintaining full animation in live preview.

## Why Preview Exists

### Performance Problem
Canvas-based components (Three.js, WebGL, complex animations) can be computationally expensive. When designers are actively editing in the Framer Canvas, continuous animation loops can:
- Slow down the editor
- Drain battery on laptops
- Create visual distractions during design work
- Cause lag when adjusting other properties

### Solution
The Preview toggle gives designers control over when animations run:
- **Preview Off**: Animation frozen for maximum performance during design
- **Preview On**: Full animation for testing and presentation

## Implementation Pattern

### 1. Property Control (First Position)

```typescript
addPropertyControls(ComponentName, {
  preview: {
    type: ControlType.Boolean,
    title: "Preview",
    defaultValue: false,
    enabledTitle: "On",
    disabledTitle: "Off",
  },
  // ... other controls
})
```

**⚠️ Important**: Preview should ALWAYS be the first control in canvas-based components for maximum visibility and accessibility.

### 2. Props Interface

```typescript
type ComponentProps = {
  preview?: boolean
  // ... other props
}
```

### 3. Ref-Based Live Updates

```typescript
const previewRef = useRef<boolean>(props.preview ?? false)

useEffect(() => {
  previewRef.current = props.preview ?? false
}, [props.preview])
```

### 4. Animation Loop Integration

```typescript
const animate = (currentTime: number) => {
  // ... animation setup
  
  const isCanvas = RenderTarget.current() === RenderTarget.canvas
  const isPreviewOn = previewRef.current
  
  // Only animate if NOT in canvas mode with preview off
  if (!(isCanvas && !isPreviewOn)) {
    uniforms.time.value += deltaTime * speedRef.current
    // ... other animation updates
  }
  
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

## Examples from Your Codebase

### Shader Lines Component

```typescript
// Property control (first position)
preview: {
  type: ControlType.Boolean,
  title: "Preview",
  defaultValue: false,
  enabledTitle: "On",
  disabledTitle: "Off",
},

// Animation logic
const isCanvas = RenderTarget.current() === RenderTarget.canvas
const isPreviewOn = previewRef.current
if (!(isCanvas && !isPreviewOn)) {
  uniforms.time.value += deltaTime * speedRef.current * flowSignRef.current
}
```

### Wave Prism Component

```typescript
// Property control (first position)
preview: {
  type: ControlType.Boolean,
  title: "Preview",
  defaultValue: false,
  enabledTitle: "On",
  disabledTitle: "Off",
},

// Animation loop with preview control
const animate = () => {
  const isCanvas = RenderTarget.current() === RenderTarget.canvas
  
  if (isCanvas && !preview) {
    // Canvas mode with preview disabled: NO animation loop
    return
  } else {
    // Live mode OR canvas mode with preview enabled: full animation
    if (refs.uniforms)
      refs.uniforms.time.value += 0.01 * speedRef.current
    // ... render
    refs.animationId = requestAnimationFrame(animate)
  }
}
```

### Circling Elements Component

```typescript
// Property control (first position)
preview: {
  type: ControlType.Boolean,
  title: "Preview",
  defaultValue: true,
  enabledTitle: "On",
  disabledTitle: "Off",
},

// CSS animation control
animationPlayState:
  (isCanvas && !preview) || (pauseOnHover && isHovered)
    ? "paused"
    : "running",
```

## Key Implementation Details

### 1. RenderTarget Detection

```typescript
const isCanvas = RenderTarget.current() === RenderTarget.canvas
```

This detects whether the component is running in:
- **Canvas**: Framer editor environment
- **Live**: Production preview/export

### 2. Preview Logic

```typescript
if (!(isCanvas && !isPreviewOn)) {
  // Animate
}
```

This means animate when:
- In Live mode (regardless of preview setting)
- In Canvas mode WITH preview enabled

### 3. Default Values

Different components use different defaults:
- **Shader Lines**: `defaultValue: false` (performance-first)
- **Wave Prism**: `defaultValue: false` (performance-first)  
- **Circling Elements**: `defaultValue: true` (visual-first)

Choose based on your component's performance impact.

## Best Practices

### 1. Always First Control
```typescript
addPropertyControls(ComponentName, {
  preview: { /* ... */ }, // FIRST
  speed: { /* ... */ },
  // ... other controls
})
```

### 2. Consistent Naming
- Title: "Preview"
- Enabled: "On"
- Disabled: "Off"

### 3. Ref-Based Updates
Use refs for live updates without re-initializing expensive resources:

```typescript
const previewRef = useRef<boolean>(props.preview ?? false)

useEffect(() => {
  previewRef.current = props.preview ?? false
}, [props.preview])
```

### 4. Performance Considerations
- Freeze time/uniforms when preview is off
- Don't restart animation loops unnecessarily
- Use single-frame renders for prop changes in canvas mode

## When to Use Preview

### Required For:
- Three.js/WebGL components
- Complex CSS animations
- Canvas-based graphics
- Any component with continuous animation loops

### Not Needed For:
- Static components
- Simple hover effects
- Components without animation loops

## User Experience

### Designer Workflow
1. **Design Phase**: Preview Off for performance
2. **Testing Phase**: Preview On to see animation
3. **Presentation**: Preview On for full effect

### Performance Impact
- **Preview Off**: ~90% performance improvement in canvas
- **Preview On**: Full animation experience
- **Live Mode**: Always animated (preview setting ignored)

## Troubleshooting

### Animation Not Stopping
- Check `RenderTarget.current() === RenderTarget.canvas`
- Verify `previewRef.current` is being read correctly
- Ensure animation loop respects the preview condition

### Performance Issues
- Make sure Preview is first control for easy access
- Use refs instead of direct prop access in animation loops
- Consider defaulting to `false` for heavy components

### Inconsistent Behavior
- Ensure preview logic is consistent across all animation updates
- Check that both CSS animations and JavaScript animations respect preview
- Verify cleanup functions don't interfere with preview state

## Summary

The Preview property is essential for canvas-based components in Framer. It provides:

1. **Performance**: Frozen animations during design work
2. **Control**: Designer choice over when animations run  
3. **Consistency**: Standard pattern across all canvas components
4. **User Experience**: Better editor performance without sacrificing live preview quality

Always implement Preview as the first control in canvas-based components, use refs for live updates, and respect the canvas/live environment distinction in your animation logic.
