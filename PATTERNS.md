## Component Patterns and Bug Fix Recipes

This document captures repeatable patterns and fixes for common issues we hit while building Framer Code Components (R3F/Canvas, SVG filters, and general React/Framer integration).

### 1) Intrinsic Sizing and “mystery blank space” in Framer

Symptoms:
- Component collapses to 40px height or 0px in Fit modes
- A large invisible area appears to the left/right, pushing visible content
- Empty-state `ComponentMessage` looks offset or clipped

What fixed it:
- Provide intrinsic dimensions explicitly and in a way that doesn’t affect layout flow or overlay content.
- Use Framer annotations to declare layout support and intrinsic size.

Checklist:
- Add these annotations near the component export:
  - `@framerSupportedLayoutWidth any-prefer-fixed`
  - `@framerSupportedLayoutHeight any-prefer-fixed`
  - `@framerIntrinsicWidth <W>` and `@framerIntrinsicHeight <H>`
- Insert a hidden “spacer” that provides intrinsic size, but place it so it does not push siblings/overlays.
- Keep R3F `Canvas` absolutely positioned to fill its container.

Spacer guidelines:
- Use a named constant for the intended intrinsic size, e.g. `INTRINSIC_WIDTH = 600`, `INTRINSIC_HEIGHT = 400`.
- Place the spacer inside the main component container that represents the visual bounds.
- Favor an absolutely positioned spacer with `zIndex: -1` and `pointerEvents: 'none'` so it contributes intrinsic size, but doesn’t sit on top of content.
- Avoid putting the spacer at the very root container if it pushes other layout content in parent flex flows.

Example spacer styling that works well:

```ts
{
  width: `${INTRINSIC_WIDTH}px`,
  height: `${INTRINSIC_HEIGHT}px`,
  minWidth: `${INTRINSIC_WIDTH}px`,
  minHeight: `${INTRINSIC_HEIGHT}px`,
  visibility: 'hidden',
  position: 'absolute',
  inset: 0,
  zIndex: -1,
  pointerEvents: 'none',
}
```

### 2) 3D Scan component: Resizing fix

Issues observed:
- The component did not respect intrinsic size in Fit modes.
- A large invisible region seemed to block/shift content, especially in empty state.

Fix applied:
- Moved the intrinsic spacer from the outer root into the `Html` component’s container so it no longer affects parent layout.
- Set the spacer to `position: absolute; inset: 0; zIndex: -1; pointerEvents: 'none'` to provide size without pushing overlays.
- For the empty state, wrapped `ComponentMessage` in an absolutely positioned container that centers it, with the spacer underneath, so the spacer no longer pushes the message.
- Added Framer annotations:
  - `@framerSupportedLayoutWidth any-prefer-fixed`
  - `@framerSupportedLayoutHeight any-prefer-fixed`
  - `@framerIntrinsicWidth 600`
  - `@framerIntrinsicHeight 400`
- Ensured `Canvas` is absolutely positioned with `inset: 0; width: 100%; height: 100%` and renders within the sized container.

Result:
- The component now keeps its intended intrinsic dimensions in Canvas/Preview and Fit sizing.
- No more “wide transparent div” pushing the content or the empty-state message.

### 3) Pixelate–Depixelate component: Resizing fix

Working approach already present:
- A hidden intrinsic sizing element is rendered as the first child of the container to enforce a 400×300 minimum box.
- The visual media (image/video) layers are absolutely positioned and do not depend on the spacer for layout.

Key points to keep it robust:
- Keep the spacer hidden and non-interactive (visibility hidden, pointer-events none). If it ever interferes with overlay content, switch to `position: absolute; zIndex: -1` inside the same container.
- Ensure media layers use absolute positioning and fill the container so the spacer’s presence only contributes intrinsic size and does not cause scroll/push.

### 4) R3F Canvas sizing pattern

- Canvas should be absolutely positioned to fill the component bounds:
  - `position: 'absolute', inset: 0, width: '100%', height: '100%'`
- The parent container must have a real size (provided by intrinsic spacer or by explicit width/height from Framer).

### 5) Empty-state pattern with `ComponentMessage`

- Keep a hidden spacer to supply intrinsic size.
- Render the message in an absolutely positioned centering container: `position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'`.
- This prevents the spacer from pushing the message while still providing the intended bounds.

### 6) Aspect ratio handling (advanced)

For media-driven components (like 3D Scan) where the content aspect ratio can vary:
- Measure image/video texture dimensions and compute `imageAspectRatio`.
- Compute cover scaling using viewport size vs. image aspect ratio to fill without letterboxing.
- Update shader uniforms or layout calculations whenever the aspect ratio or container size changes.

Pseudocode for cover scaling:

```ts
const viewportAspect = viewport.width / viewport.height
if (imageAspectRatio > viewportAspect) {
  // Image wider than viewport → match height
  scale = { width: viewport.height * imageAspectRatio, height: viewport.height }
} else {
  // Image taller than viewport → match width
  scale = { width: viewport.width, height: viewport.width / imageAspectRatio }
}
```

### 7) Debugging tips

- Always differentiate between Framer Canvas vs. Live/Preview at runtime using `RenderTarget.current() === RenderTarget.canvas`.
- In Canvas mode, avoid animations or heavy updates; use static mid-state values for a stable editing experience.
- When layout looks “blocked”, inspect any hidden/intrinsic elements for positioning and z-index. If they are statically positioned, they may still participate in layout and push content.

---

Use this document to recognize symptoms quickly and apply the right pattern:
- Need intrinsic size → add spacer + annotations
- Spacer affecting layout → move it into the correct container and/or make it `position: absolute; zIndex: -1`
- Empty-state offset → overlay the message absolutely; keep spacer underneath
- R3F canvas sizing → absolute fill and parent with real size


