## Context

- **Component**: `next-dev/app/path-reveal-on-scroll/pathReveal.tsx`
- **Tech**: React 18, `framer-motion`, Framer Code Component property controls.
- **Behavior**: Reveals SVG paths on scroll by animating `strokeDashoffset` based on a motion value `drawProgress ∈ [0,1]`.
- **Trigger model**: When the element’s chosen anchor (top/center/bottom) crosses a viewport threshold, we “lock” a baseline scroll position and map further scroll distance to progress.

## Bug to fix

- **On reload mid-animation**: the path often renders fully visible or restarts from 0.
- **Goal**: On reload at any scroll position, the path should render at the correct partial progress immediately (or within 1 frame), without requiring a manual scroll back above the threshold.

## Acceptance criteria

- **Reload correctness**: Render at correct partial progress within one animation frame (no flash of full reveal, no snap to 0).
- **Normal scrolling**: Forward scrolling continues animation smoothly; scrolling back above the threshold resets appropriately.
- **Anchors**: Works for `startPosition` of `top`, `center`, and `bottom`.
- **Framer canvas**: When `RenderTarget.hasRestrictions()` is true, keep paths fully visible (no animation) as today.

## Constraints

- **React**: Keep React 18; do not change library versions.
- **Motion**: Use the existing `framer-motion` hooks; no GSAP.
- **API**: Preserve component props and property controls.

## Canonical math (use this exactly)

Let `s` be the current document scrollY.

- Element geometry at time of measure:
  - `rect = groupRef.current.getBoundingClientRect()`
  - `elementDocumentTop = rect.top + s`
  - `centerOffset = (startPosition === 'top' ? 0 : startPosition === 'center' ? rect.height / 2 : rect.height)`
- Viewport threshold line:
  - `thresholdY = (startPosition === 'top' ? 0 : startPosition === 'center' ? window.innerHeight / 2 : window.innerHeight)`
- Crossing scroll position (where the anchor meets the threshold):
  - `yCross = elementDocumentTop + centerOffset - thresholdY`
- Distance window (pixels of scroll to complete reveal):
  - `distancePx = Number(speed ?? scrollSpeed ?? 1000) || 1000`
- Progress mapping at any scroll `s`:
  - `progress = clamp01((s - yCross) / distancePx)`

## Likely root cause

- The browser may restore scroll position after the first layout pass. If we compute `yCross` too early (before scroll restoration/layout settle) or force progress to 0/1 pre-init, the initial render is wrong. If we derive `yCross` only on the first scroll event, the very first paint can be incorrect.

## Robust fix (high level)

1) Initialization after layout and scroll restoration
   - Use a layout effect that runs when `groupRef.current` and paths exist.
   - Schedule two rAFs: `requestAnimationFrame(() => requestAnimationFrame(init))` to allow scroll restoration and layout to settle.
   - In `init`:
     - Read `s = window.scrollY` and fresh `rect`.
     - Compute `yCross` using the canonical math above.
     - Set `triggerYRef.current = yCross` and `drawProgress.set(clamp01((s - yCross) / distancePx))`.
   - Handle bfcache: listen for `pageshow` with `event.persisted === true` and re-run `init` via rAF×2.
   - If `RenderTarget.hasRestrictions()` is true, skip and force `drawProgress = 1`.

2) Scroll handling (single-lock, no premature resets)
   - Before the threshold, do not force-reset `drawProgress` to 0; simply avoid updating until lock.
   - On the first tick where `anchorY <= thresholdY` and `triggerYRef.current === null`:
     - Compute `yCross` from current `s` and `rect`, set `triggerYRef.current = yCross`, and set `drawProgress` using the formula.
   - After lock, for each scroll tick, update `drawProgress` with the formula; do not mutate `triggerYRef.current` again.

3) Prevent initial full-reveal flash
   - Keep a `initialProgressRef = useRef<number | null>(null)`.
   - While `initialProgressRef.current === null` (and not in canvas), render using a provisional progress (0 or last cached). After `init` computes the real value, set both `triggerYRef` and `drawProgress`, assign `initialProgressRef.current`, and render from it.

4) Resilience to resize
   - Option A: Keep the original `yCross` to avoid jumps.
   - Option B: Recompute `yCross` on resize using the same rAF×2 technique (document this behavior in logs).

## Instrumentation to keep during verification

- On init: log `{ s, rect.top, rect.height, centerOffset, thresholdY, yCross, distancePx, clamped }`.
- On first lock: same metrics using current `s`.
- On each progress update: `{ s, triggerY, progressed, clamped }`.
- When before-start and not locked: log that we’re waiting and why, including `anchorY` and `thresholdY`.

## Edge cases

- `rect.height <= 0` or invalid geometry → use a default viewBox and avoid division by zero.
- Invalid `distancePx` → default to `1000`.
- `RenderTarget.hasRestrictions()` → force `progress = 1` (no animation) and skip init.

## Test matrix

- `startPosition`: top, center, bottom.
- Reload positions: before threshold, exactly at threshold, 0.25/0.5/0.75 through animation, and beyond completion.
- bfcache: navigate away and back (back/forward), verify `pageshow` path.
- Optional: resize after lock; confirm chosen behavior (stable or recompute).

## Deliverables

- Updated `pathReveal.tsx` implementing:
  - rAF×2 init that computes `yCross` and initial `drawProgress` post-restoration.
  - Single-lock scroll logic (compute on first crossing only).
  - Provisional render to avoid initial full-reveal flash.
  - `DEBUG_PATH_REVEAL` logs with the metrics listed above.

## If something still fails

- Paste the first 20 lines of logs after reload (init + first scroll tick) including:
  - `s`, `rect.top`, `rect.height`, `centerOffset`, `thresholdY`, `yCross`, `distancePx`, `clamped`.
  - Do this for each `startPosition` variant.
