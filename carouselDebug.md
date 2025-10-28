## Carousel Debugging Roadmap

Goal: keep current behavior but remove race conditions and lifecycle hazards that break interactivity, centering, and spacing on reloads.

Non-goals: leave the CDN import as-is for now (it’s not the root cause).

---

### High-priority fixes (do first)

1) Eliminate React vs GSAP transform conflicts
- Symptom: centering/effects flicker; styles look “off” after any render.
- Root cause: JSX sets `transform`/`scale` on `.box__inner`, while GSAP controls transforms.
- Action: remove `transform` and the invalid `scale` style from `.box__inner`; let GSAP own transforms end-to-end. Keep only layout styles in JSX. Initial visual state should be set via `gsap.set` during init.
- Verify: navigate slides; resize; reload. Transforms should never jump after state changes.

2) Make init idempotent and reliable (no early returns)
- Symptom: first visit OK; reload breaks or never becomes interactive.
- Root cause: init returns early when `boxesRef` hasn’t fully populated; the “retry” placeholder doesn’t actually re-run init.
- Action: replace the early-return branch with a short wait-then-continue flow. Options:
  - Synchronously spin a small retry loop (RAF or setTimeout) that re-reads `boxesRef` until count ≥ `finalCount`, then proceed without returning, or
  - Extract the loop-creation code into a function and call it again in the retry callback.
- Verify: add logs for “init start”, “slides found N/M”, “loop created”, “init done”. Reload several times; it should consistently initialize.

3) Expose a real `refresh` on the timeline and call it when revealing/reflowing
- Symptom: reveal happens but internal widths/times aren’t recomputed; centering off after reload/resize.
- Root cause: code calls `loop.refresh(true)` but never assigns `tl.refresh = refresh` when building the timeline.
- Action: attach `tl.refresh = refresh` in both finite and infinite builders. When reveal completes or after a significant resize, call `loop.refresh(true)` and then `loop.toIndex(0, { duration: 0, ease: 'none' })` to re-center.
- Verify: change the frame size; toggle finite/infinite; reload. Dots, arrows, and centering should remain correct.

4) Clean up all listeners and draggables on unmount/re-init
- Symptom: duplicate click/draggable handlers accumulate; navigation fires multiple times.
- Root cause: per-item `addEventListener` and finite-mode `Draggable` lack cleanup.
- Action: keep arrays/maps of added listeners; in `(tl as any).cleanup()` remove them. For Draggable, call `.kill()` in cleanup. Ensure infinite-mode’s global drag cleanup also runs.
- Verify: navigate/reload multiple times; log a counter of active listeners; it should remain stable (no growth).

5) Loosen `singleInitDoneRef` gate so a bad first measurement can recover
- Symptom: init skips on reload, locking in fallback dimensions and broken state.
- Root cause: when fallback size is used or when `containerReady` changes, `singleInitDoneRef` prevents re-init.
- Action: only set `singleInitDoneRef` after a successful loop creation with non-zero container size; allow re-init if dimensions were fallback OR if we are switching finite/infinite. Alternatively, remove the flag and rely on strict cleanup + idempotent init.
- Verify: simulate zero-size first pass (e.g., by forcing a delayed measurement); component should still recover once real size is known.

6) Unify gap handling (GSAP math vs CSS margins)
- Symptom: “gap between slides is off,” especially across reloads.
- Root cause: CSS applies `marginRight` to every slide; loop math applies gap only on certain edges.
- Action (pick one):
  - A) Remove CSS `marginRight`; encode the gap fully in GSAP position/timeline math; or
  - B) Keep CSS margins and read spacing uniformly (no extra gap at loop edges). Ensure the calculation mirrors how margins are applied between all slides.
- Verify: log computed distances/`times` and visually confirm constant spacing across wrap points.

---

### Stabilization and timing controls

7) Replace multi-timeout reveal with a single “ready” barrier
- Symptom: carousel is slow to show; sometimes reveals before ready and never re-centers.
- Action: compute `ready = loopRef.current && containerWidth>0 && boxesRef.current.length >= finalCount`. Reveal (set visible) in one place once `ready` is true. Immediately call `loop.refresh(true)` and `toIndex(0, { duration: 0 })` after reveal.
- Verify: no flicker; deterministic reveal time; consistent centering.

8) Avoid hardcoded fallback dimensions as final state
- Symptom: wrong geometry on reload when first measurement is 0; spacing/centering off.
- Action: if you must fall back (e.g., 600x400), mark a flag like `usedFallbackDimsRef.current = true`. When `ResizeObserver` delivers real non-zero size, re-run `refresh(true)` or re-init (if needed). Never “lock in” fallback values.
- Verify: log when fallback is used and when the real size arrives; confirm refresh happens exactly once.

9) Stop using ref contents in effect deps
- Symptom: effects don’t re-run when expected; linter noise.
- Action: remove `containerDimensions.current.width/height` from dependency arrays. Drive re-runs via state like `containerReady` or an explicit “version” number you already increment.
- Verify: rerenders triggered by explicit state changes, not by reading refs in deps.

10) Reduce try/catch swallowing
- Symptom: real failures degrade silently into partial state; hard to debug races.
- Action: guard the hot paths but log errors behind a `debug` prop or an environment flag. Prefer early returns with a debug message to carrying on in a bad state.
- Verify: when something goes wrong, you see a single clear error with context (counts, sizes, mode).

---

### Diagnostics to add temporarily (and then remove)

- Log points (gated by `debug` boolean prop or local const):
  - On init start: container size, `finalCount`, `actualSlideCount`, `boxesRef.length`.
  - After loop creation: mode (finite/infinite), timeline duration, `times.length`, `closestIndex()`.
  - On reveal: visible state switched, `refresh` invoked.
  - On resize: old vs new container dims; whether refresh or re-init happens.
  - On cleanup: count of removed listeners and whether draggable was killed.

- Invariants to assert (throw/log in debug):
  - `boxesRef.length >= finalCount` before loop creation.
  - Container dims non-zero at time of `refresh(true)`.
  - No duplicate listeners: track with a WeakMap or a Set keyed by element.

---

### Step-by-step execution order

1. Remove JSX transform/scale on `.box__inner` and rely solely on GSAP for transforms. Re-test quickly (should improve flicker immediately).
2. Fix init early-return: convert the placeholder retry into a working wait-and-continue flow. Re-test reload; ensure loop always initializes.
3. Attach `tl.refresh = refresh` and call it on reveal and significant resizes; immediately re-center to index 0 after refresh.
4. Implement full cleanup for per-item listeners and Draggable in both finite and infinite modes.
5. Rework `singleInitDoneRef` usage so re-init can occur when first pass was built on fallback dims (or drop the flag if cleanup+idempotent init are correct).
6. Choose and implement one gap strategy (GSAP-only or CSS-only) and keep math consistent. Validate visually and via logged distances.
7. Replace multi-timeout reveal with a single readiness barrier, then refresh+center once.
8. Remove ref reads from deps; rely on explicit state signals.
9. Add temporary diagnostics; iterate until reloads are deterministic; then remove logs.

---

### Quick verification checklist (repeat on each change)

- Reload page 5–10 times quickly: loop initializes every time; no duplicated handlers (log shows constant count).
- Resize container drastically: spacing remains uniform; centering correct; no flicker.
- Toggle finite/infinite: arrows/dots enable/disable correctly; no residual listeners carried over.
- Drag + autoplay: no “stuck” or inconsistent direction after releasing; autoplay resumes correctly when expected.

Once these pass consistently, the carousel should behave the same functionally but be resilient to reloads and reflows.


