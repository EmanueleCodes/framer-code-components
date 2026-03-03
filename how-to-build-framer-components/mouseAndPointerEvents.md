# Mouse and Pointer Events — Best Practices

## Overview

This guide defines best practices for handling mouse, touch, and pointer events in Framer Code Components. Following these patterns improves **composability** (combining multiple interactive effects), **consistency** across input types, and **reliable movement data** during drag and touch interactions.

## Problems Addressed

- **Combining effects with hover**: Component-specific listeners (`onmove`, `onenter`, `onleave`) make it hard to layer multiple interactive effects (e.g. cursor-follow + scratch reveal).
- **Interaction blocking**: Listeners on a component’s ref can cause overlaying layers to block interactions with elements underneath.
- **Follow behavior during drag/click**: Cursor-follow or 3D-hover components can stop updating when the user clicks and drags, breaking combinations with scratch/drag components.
- **Lost movement data**: Browser scroll attempts during touch or drag can intercept pointer events, so the app doesn’t receive full movement data.

---

## 1. Global listener logic for background interactive elements

### Principle

For components that act as **backgrounds of interactive content** (decorative motion, parallax, cursor-follow, etc.), avoid component-bound listeners. Use **global listeners on `window`** instead of `onmove` / `onenter` / `onleave` on the component’s DOM node.

### Implementation

- Attach move/enter/leave (or equivalent) logic to **`window`** (e.g. `window.addEventListener("pointermove", handler)`).
- So that layers above can still receive clicks and taps, set **`pointer-events: none`** on the **container** of the background component. Restore `pointer-events: auto` (or leave default) on any child that must itself be interactive, if needed.

### Benefits

- Easier to **combine** multiple effects (e.g. kinetic grid + mask reveal).
- No **interaction blocking**: an overlaid frame or component still receives pointer events; the background is truly “behind” from the event system’s perspective.

### When to use

- Cursor-follow / 3D hover / parallax / kinetic grids and similar **background** effects.
- Any effect that should keep working even when another layer is drawn on top in Framer.

### Example pattern

```tsx
// Container: allow click-through to layers below/above
<div style={{ ...style, pointerEvents: "none" }}>
  <InteractiveBackground />
</div>

// Inside InteractiveBackground: listen on window
useEffect(() => {
  const handleMove = (e: PointerEvent) => {
    // update position / parallax / 3D rotation from e.clientX, e.clientY
  }
  window.addEventListener("pointermove", handleMove)
  return () => window.removeEventListener("pointermove", handleMove)
}, [])
```

### Components using this pattern

- Kinetic grid component  
- Mask reveal component  

---

## 2. Prefer `pointermove` over `mousemove`

### Principle

Use **`pointermove`** (and the Pointer Events API in general) instead of **`mousemove`** for position-based or follow-the-cursor behavior.

### Why

- **Unified input**: Same events for mouse, touch, and pen.
- **Works during pointer capture**: When the user has pressed the pointer (e.g. dragging a scratch area or another draggable), `mousemove` often stops firing. **`pointermove`** continues to fire during active pointer capture, so 3D hover, follow-cursor, and similar effects keep updating while the user drags.

This allows combining “follow cursor” or “3D hover” with components that rely on click-and-drag (e.g. image scratch).

### Implementation

- Replace `onmousemove` / `addEventListener("mousemove", ...)` with `onPointerMove` / `addEventListener("pointermove", ...)`.
- Use `PointerEvent` and its properties (`clientX`, `clientY`, `pointerId`, etc.) instead of `MouseEvent` where relevant.

### Example

```tsx
// Before: can stop updating during drag
element.addEventListener("mousemove", (e: MouseEvent) => { ... })

// After: keeps updating during drag and works for touch/pen
element.addEventListener("pointermove", (e: PointerEvent) => { ... })
```

### Components using this pattern

- 3D hover component (e.g. `onmousemove` → `onPointerMove` so the card keeps moving/rotating during drag).  
- Follow cursor component.  

---

## 3. Use `touch-action: none` where drag/touch is critical

### Principle

On elements where **drag or touch movement** is essential (e.g. scratch reveal, custom sliders, draggable areas), set **`touch-action: none`** so the browser does not use the same gesture for scrolling or zooming.

### Why

Otherwise the browser may consume touch/drag gestures for native scroll or zoom, and your component may receive only a subset of move events or delayed/canceled pointers. **`touch-action: none`** tells the browser to leave pointer movement to your code, so you get **full movement data** for that element.

### Implementation

- Apply `touch-action: none` to the specific element(s) that handle the critical drag/touch interaction (e.g. the scratch overlay or the draggable handle).
- Prefer scoping it to those elements rather than the whole page, to avoid affecting normal page scroll elsewhere.

### Example

```tsx
<div
  style={{
    ...style,
    touchAction: "none",
  }}
  onPointerDown={...}
  onPointerMove={...}
  onPointerUp={...}
>
  {/* scratch / drag content */}
</div>
```

### When to use

- Scratch-to-reveal or similar drag-based reveals.  
- Custom draggable regions.  
- Any component that must receive every pointer move without the browser taking over the gesture.  

---

## Summary checklist

| Goal | Practice |
|------|----------|
| Background effects that don’t block overlays | Global `window` listeners + `pointer-events: none` on container |
| Reliable follow/cursor during drag + touch/pen | Use `pointermove` (and Pointer Events) instead of `mousemove` |
| Full movement data on drag/touch | `touch-action: none` on the element that owns the gesture |

Adopting these as standard practices will keep Framer components composable, consistent across input types, and reliable when combining cursor-follow, 3D hover, and drag-based effects like image scratch.
