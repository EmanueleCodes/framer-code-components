# Canvas Sizing Fix for Framer Code Components

## Problem
Canvas-based components in Framer were not filling their containers properly in the editor, appearing cropped or misaligned compared to the live preview. The canvas would show gaps around the edges, particularly noticeable with colored backgrounds.

## Root Cause
The issue was caused by using `getBoundingClientRect()` for canvas sizing instead of the more reliable `clientWidth/clientHeight` approach used by working Framer components.

### Why `getBoundingClientRect()` Failed
- Affected by CSS transforms and editor zoom levels
- Returns actual rendered dimensions which can be distorted in the Framer canvas environment
- Inconsistent behavior between editor and live preview

### Why `clientWidth/clientHeight` Works
- Returns the content area dimensions regardless of transforms
- Consistent behavior across editor and live preview
- Used by all working canvas components in the Framer ecosystem

## Solution

### 1. Replace `getBoundingClientRect()` with `clientWidth/clientHeight`

**Before:**
```typescript
const rect = container.getBoundingClientRect()
const w = Math.max(rect.width, 2)
const h = Math.max(rect.height, 2)
```

**After:**
```typescript
const w = container.clientWidth || container.offsetWidth || 1
const h = container.clientHeight || container.offsetHeight || 1
```

### 2. Apply to All Sizing Operations

Update all canvas sizing operations:
- Initial canvas setup
- Resize handlers
- Aspect ratio detection
- Zoom detection

### 3. Canvas Positioning

Ensure canvas uses proper positioning:
```typescript
canvas.style.position = "absolute"
canvas.style.inset = "0"
canvas.style.width = "100%"
canvas.style.height = "100%"
canvas.style.display = "block"
```

### 4. Container Structure

Use simple container structure:
```typescript
<div style={{
    width: "100%",
    height: "100%",
    position: "relative",
    display: "block",
    margin: 0,
    padding: 0,
}}>
```

## Working Examples

The following components use this approach successfully:
- `3D-scan-final/page.tsx` - Uses `clientWidth/clientHeight` in resize handlers
- `ASCII-background-2/page.tsx` - Uses `clientWidth/clientHeight` with `inset: 0` positioning
- `reverse-fish-eye/page.tsx` - Uses `inset: 0` for canvas positioning

## Key Takeaways

1. **Always use `clientWidth/clientHeight`** for canvas sizing in Framer components
2. **Use `inset: 0`** for canvas positioning to ensure full container coverage
3. **Keep container structure simple** - avoid complex flex layouts that can interfere with canvas sizing
4. **Test in both editor and live preview** to ensure consistent behavior
5. **Use `offsetWidth/offsetHeight` as fallbacks** for edge cases

## Debugging Tips

- Add colored backgrounds to canvas to visualize bounds: `canvas.style.backgroundColor = "#ff0000"`
- Use browser dev tools to inspect actual canvas dimensions vs container dimensions
- Check for CSS transforms or zoom that might affect `getBoundingClientRect()`
- Compare with working components to identify differences in sizing approach

This fix ensures canvas components fill their containers properly in both the Framer editor and live preview, providing a consistent user experience.

## Additional Feature: Dynamic Aspect Ratio Detection

For the 3D Rug Text component, we also implemented automatic aspect ratio detection:

### Problem
The component was hardcoded to use 1:1 aspect ratio planes, causing portrait images to appear squished horizontally.

### Solution
- **Detect aspect ratio** from the main texture when it loads
- **Update plane geometry** dynamically to match the image's aspect ratio
- **Update all related planes** (main, shadow, hit) to maintain consistency

### Implementation
```typescript
// Detect aspect ratio from loaded texture
const image = texture.image
if (image && image.naturalWidth && image.naturalHeight) {
    detectedAspectRatio = image.naturalWidth / image.naturalHeight
    updatePlaneGeometry(detectedAspectRatio)
}

// Update all plane geometries
const updatePlaneGeometry = (aspectRatio: number) => {
    const planeGeometry = new PlaneGeometry(aspectRatio, 1, 100, 100)
    // Update main, shadow, and hit planes...
}
```

This ensures that images of any aspect ratio (portrait, landscape, square) display correctly without distortion.
