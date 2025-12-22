# ScrollTrigger Component - Today's Plan

## What We're Building
A Framer component that uses GSAP ScrollTrigger. Users drop it inside any component they want to animate.

## Core Features (MVP - Today)
- **Placement**: Inside target component (not wrapper)
- **GSAP Integration**: Real ScrollTrigger plugin via custom bundle
- **Basic Controls**: start, end, scrub, pin, markers
- **Animation Types**: fade, slide, scale, custom GSAP code

## Property Controls (Simple)
```
- start: String ("top bottom", "center center", etc.)
- end: String ("bottom top", "+=100%", etc.)
- scrub: Boolean
- pin: Boolean
- markers: Boolean
- once: Boolean
- triggerType: Enum (self, id, framerName)
- triggerValue: String (ID or Framer name)
- targetType: Enum (self, id, framerName)
- targetValue: String (ID or Framer name)
- animationType: Enum (fade, slide, scale, keyframes, custom)
- keyframes: Array of keyframe objects with full GSAP controls
```

## Technical Implementation
1. **GSAP Bundle**: Custom bundle with GSAP + ScrollTrigger + useGSAP
2. **Trigger Element**: Element that triggers scroll animation (self, id, framerName)
3. **Target Element**: Element that gets animated (self, id, framerName, defaults to self)
4. **ScrollTrigger**: Create with trigger element and property control values
5. **Animation**: Handle through GSAP directly (fade, slide, scale, keyframes, custom)
6. **Keyframes**: GSAP timeline with multiple keyframes, each with full GSAP controls
7. **Cleanup**: `ScrollTrigger.kill()` on unmount

## File Structure
```
scroll-trigger/
├── component.tsx (main component)
├── roadmap.md (this file)
└── examples/ (usage examples)
```

## Today's Tasks
1. ✅ Write roadmap (DONE)
2. ✅ Build basic component with GSAP integration (DONE)
3. ✅ Add property controls (DONE)
4. ✅ Create GSAP bundle structure (DONE)
5. ✅ Add examples (DONE)
6. ✅ Create test page (DONE)
7. ✅ Add package.json (DONE)
8. ✅ Build GSAP bundle (DONE!)
9. 🔄 Test in Framer (READY!)

## Component Code Structure
```tsx
export default function ScrollTrigger(props) {
  const { start, end, scrub, pin, markers, once } = props
  const parentRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // GSAP ScrollTrigger setup
    // Output progress to CSS var
  }, [])
  
  return <div ref={parentRef} />
}
```

## Marketplace Requirements
- Single component (not bundle)
- Clean thumbnail
- Clear description
- Examples included

## Done by EOD
- Working ScrollTrigger component with GSAP bundle
- Basic property controls
- Animation types (fade, slide, scale, custom)
- Example usage
- Ready for testing in Framer
