# CRT Effect Component - Insert Strategy

## Strategy: Insert Inside Parent (Like Exploding Tap) ✅

The CRT component uses an **insert strategy** - you place it INSIDE the element you want to distort, and it automatically finds and distorts its parent element. This is the same pattern used by `explodingTap.tsx` and is the closest to how the original VFX-JS works.

### Why Insert Strategy?

1. **Simple UX**: Just drag component inside the element you want to distort - no IDs needed!
2. **Automatic**: Finds parent element 2 levels up (Framer's component wrapping pattern)
3. **True Distortion**: Captures content continuously, perfect for scrolling
4. **Like the Reference**: Similar to VFX-JS applying effect to a container
5. **Framer-Native**: Works with Framer's component hierarchy

### How It Works

```
┌─────────────────────────────────────┐
│   Your Frame/Section (Parent)      │
│                                     │
│   ┌──────────────────────┐          │
│   │  Your Content        │          │
│   │  (text, images, etc) │          │
│   └──────────────────────┘          │
│                                     │
│   [CRT Component] ← Place inside    │ Component looks up
│   (invisible 0x0)                   │ 2 levels to find
│                                     │ parent element
│   ┌─────────────────────────────────┤
│   │ WebGL Canvas Overlay            │
│   │ (covers entire parent)          │ ← Captures & distorts
│   └─────────────────────────────────┘    parent content
└─────────────────────────────────────┘
```

**The magic:**
1. Place CRT component anywhere inside your frame/section
2. Component finds parent element 2 levels up
3. Creates WebGL canvas overlay on parent
4. Captures parent content periodically
5. Applies CRT distortion to captured content
6. As content scrolls/changes, effect updates automatically

## How to Use in Framer

### Setup (2 Steps!)

1. **Add CRT Component**:
   - Drag the CRT Effect component INSIDE the frame/section you want to distort
   - Position doesn't matter - it's invisible (0x0px)

2. **Configure** (optional):
   - **Refresh Rate**: 100ms for smooth scrolling, 0ms for static
   - Adjust effect parameters to taste

**That's it!** No IDs, no complex setup.

### Example Use Cases

#### Distorted Scroll Section
```
Scroll Section
  ├─ Image
  ├─ Text "Feature title"
  ├─ Text "Description..."
  └─ [CRT Effect Component] ← Just drop it in!
  
Result: Entire section appears distorted
```

#### Distorted Hero Section
```
Hero Frame
  ├─ Background Image
  ├─ Heading
  ├─ Button
  └─ [CRT Effect Component]
  
Result: Hero content has CRT effect
```

#### Sticky Distortion
```
Frame (Position: Sticky)
  ├─ Content that scrolls
  └─ [CRT Effect Component]
  
Result: Content distorts as it scrolls
```

## Property Controls

### Core Settings

- **Refresh Rate** (0-1000ms)
  - How often to capture the parent content
  - `0` = capture once (static content)
  - `100ms` = smooth for scrolling content (recommended)
  - `200+ms` = lighter performance
  - Higher frequency = more CPU usage

### Preview Control

- **Preview** (boolean)
  - Toggle animation in canvas mode
  - Always animates in live preview

### Effect Controls

- **Intensity** (0-1): Overall effect strength
- **Scanlines** (0-1): Horizontal line intensity
- **Chromatic Aberration** (0-1): RGB color separation
- **Vignette** (0-1): Edge darkening
- **Distortion** (0-1): Screen curvature
- **Noise** (0-1): Static grain effect
- **Speed** (0.1-1): Animation speed

## Technical Implementation

### Parent Element Detection

```typescript
// Finds parent 2 levels up (Framer's wrapping pattern)
let parentElement = container.parentElement?.parentElement

// Creates overlay on parent
const overlay = document.createElement("div")
overlay.style.position = "absolute"
overlay.style.inset = "0"
parentElement.appendChild(overlay)
```

### Content Capture Flow

1. Component mounts inside target element
2. Finds parent 2 levels up
3. Creates WebGL canvas overlay on parent
4. Uses `html2canvas` to capture parent content
5. Converts capture to WebGL texture
6. Applies CRT shader to texture
7. Repeats based on `refreshRate`

### Shader Effects (Same as Reference)

The shader is **exactly like VFX-JS reference**:
- Screen curvature distortion
- Chromatic aberration (RGB separation)
- Animated scanlines
- Grid pattern overlay
- Vignette darkening
- Noise/dither
- All effects controllable in real-time

### Performance Considerations

**Refresh Rate Impact:**
- `0ms`: Lightest, captures once (static content)
- `100ms`: Balanced, ~10 captures/second (recommended)
- `50ms`: Smooth, ~20 captures/second (more CPU)

**Tips for Performance:**
- Use 0ms for static content (images, non-animated)
- Use 100ms for scrolling/dynamic content
- Use 200ms+ if experiencing lag
- Parent element complexity affects capture speed

## Comparison with Other Approaches

| Aspect | Insert (Current) | Overlay + ID | Container |
|--------|-----------------|--------------|-----------|
| Setup | Drop inside | Set ID + place over | Wrap content |
| User Experience | Easiest | Moderate | Complex |
| Scrolling | Perfect | Static snapshots | Not ideal |
| Positioning | Automatic | Manual alignment | Constrained |
| Content Updates | Continuous capture | Periodic by ID | On prop change |
| Like Reference | ✅ Very similar | ❌ Different | ✅ Similar |

## Advanced Usage

### Multiple Effects

You can place multiple CRT components in different frames:

```
Section 1
  └─ [CRT Effect] (Intensity: 0.3)

Section 2
  └─ [CRT Effect] (Intensity: 0.8)
```

### Conditional Effects

Use Framer's conditional rendering to show/hide effect:

```
Frame
  └─ [CRT Effect] (hidden: {showEffect === false})
```

### Animate Properties

Animate effect properties on scroll or interaction:

```
Frame
  └─ [CRT Effect] (intensity: {scrollProgress * 0.8})
```

## Troubleshooting

### Issue: No distortion visible

**Check:**
1. Component is INSIDE the frame you want to distort (not next to it)
2. Parent frame has content to capture
3. Console for "Found parent element" message
4. Wait ~500ms for initial capture

### Issue: Distortion doesn't update during scroll

**Fix:**
- Set Refresh Rate to 100ms (not 0)
- Check console for repeated captures
- Ensure parent content is actually changing

### Issue: Performance problems

**Fix:**
1. Increase refresh rate (200ms or higher)
2. Simplify parent content (fewer complex elements)
3. Make parent element smaller if possible
4. Check capture times in console

### Issue: "Could not find parent element 2 levels up"

**Fix:**
- Make sure component is placed inside a frame/section
- Don't place it at root level
- Framer wraps components - 2 levels up should work

## Browser Console Debugging

Open DevTools (F12) to see helpful logs:

```
CRT Effect: Found parent element <div>
CRT Effect: Initializing Three.js scene
CRT Effect: Capture successful
```

If something's wrong, you'll see warnings explaining what.

## Credits

Based on the CRT effect from VFX-JS library. Adapted for Framer with automatic parent detection.

## Files

- `CRT-component.tsx`: Main component (insert strategy)
- `CRT-Reference.js`: Original VFX-JS shader
- `README.md`: This file
- `USAGE-GUIDE.md`: Quick start guide
- `DEBUGGING.md`: Troubleshooting guide
