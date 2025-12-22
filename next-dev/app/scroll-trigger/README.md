# ScrollTrigger Component

A Framer code component that uses GSAP ScrollTrigger to create scroll-based animations. Place this component inside any component you want to animate on scroll.

## How to Use

1. **Place the component** inside the target component you want to animate
2. **Configure the triggers** using the property controls
3. **GSAP ScrollTrigger handles everything** - no CSS variables needed
4. **Watch the magic happen** as you scroll!

## Property Controls

### Core Options
- **Start Trigger**: When to start the animation (e.g., "top bottom", "center center")
- **End Trigger**: When to end the animation (e.g., "bottom top", "+=100%")
- **Scrub**: Smooth progress following scroll
- **Pin**: Pin element during scroll
- **Markers**: Show scroll trigger markers for debugging
- **Once Only**: Trigger only once

### Trigger & Target Selection
- **Trigger Type**: Element that triggers scroll animation (self, id, framerName)
- **Trigger Value**: ID or Framer name (leave empty if using 'self')
- **Target Type**: Element that gets animated (self, id, framerName)
- **Target Value**: ID or Framer name (leave empty if using 'self')

### Animation
- **Animation Type**: Predefined animations (fade, slide, scale, keyframes, custom)
- **Keyframes**: Complex multi-step animations with GSAP timeline
- **Custom Animation**: Custom GSAP animation string or function

### Debug
- **Debug Mode**: Show debug info and console logs

## GSAP ScrollTrigger Integration

The component creates a GSAP ScrollTrigger instance that handles all scroll logic. You can:

1. **Use predefined animations** (fade, slide, scale)
2. **Write custom GSAP animations** in the custom animation field
3. **Target any element** with CSS selectors
4. **Leverage all GSAP ScrollTrigger features** directly

The component is just a bridge - GSAP does all the heavy lifting!

## Examples

### Basic Fade In
```tsx
<div style={{
  // GSAP handles all animation logic
}}>
  <h2>This will fade in and slide up</h2>
  
  <ScrollTriggerComponent
    start="top bottom"
    end="bottom top"
    scrub={true}
    triggerType="self"
    targetType="self"
    animationType="fade"
  />
</div>
```

### Sticky Pin
```tsx
<div style={{
  background: "white",
  padding: "20px",
  borderRadius: "8px"
}}>
  <h3>This will pin while scrolling</h3>
  
  <ScrollTriggerComponent
    start="top top"
    end="+=300"
    pin={true}
    markers={true}
    triggerType="self"
    targetType="self"
  />
</div>
```

### Custom Animation
```tsx
<div style={{
  textAlign: "center",
  fontSize: "48px",
  fontWeight: "bold"
}}>
  <span>This will animate with custom GSAP code</span>
  
  <ScrollTriggerComponent
    start="top center"
    end="bottom center"
    scrub={true}
    triggerType="self"
    targetType="self"
    animationType="custom"
    customAnimation="gsap.to(targetElement, {opacity: 1, y: 0, duration: 1})"
  />
</div>
```

### Keyframe Animation
```tsx
<div style={{
  textAlign: "center",
  fontSize: "48px",
  fontWeight: "bold"
}}>
  <span>This will animate with multiple keyframes</span>
  
  <ScrollTriggerComponent
    start="top center"
    end="bottom center"
    scrub={true}
    triggerType="self"
    targetType="self"
    animationType="keyframes"
    keyframes={[
      {
        targetType: "self",
        targetValue: "",
        properties: { opacity: 0, y: 50 },
        duration: 0.5,
        ease: "power2.out",
        delay: 0,
        position: 0
      },
      {
        targetType: "self",
        targetValue: "",
        properties: { opacity: 1, y: 0 },
        duration: 0.5,
        ease: "power2.out",
        delay: 0,
        position: 0.5
      },
      {
        targetType: "self",
        targetValue: "",
        properties: { scale: 1.1 },
        duration: 0.3,
        ease: "back.out",
        delay: 0,
        position: 1
      }
    ]}
  />
</div>
```

## GSAP ScrollTrigger Values

The component accepts all standard GSAP ScrollTrigger values:

### Start/End Positions
- `"top bottom"` - When top of element hits bottom of viewport
- `"center center"` - When center of element hits center of viewport
- `"bottom top"` - When bottom of element hits top of viewport
- `"+=100"` - 100px after the start
- `"-=100"` - 100px before the start

### Scrub Options
- `false` - No scrubbing
- `true` - Smooth scrubbing
- `"smooth"` - Smooth scrubbing (same as true)

## Tips

1. **Start Simple**: Begin with basic start/end values like "top bottom" and "bottom top"
2. **Use Markers**: Enable markers to see exactly when triggers fire
3. **Test Scrub**: Try different scrub settings to see the difference
4. **Trigger vs Target**: Set trigger element (what scrolls) and target element (what animates)
5. **Keyframes**: Use keyframes for complex multi-step animations with full GSAP control
6. **Debug Mode**: Enable debug mode to see console logs and visual feedback

## Performance

- The component uses GSAP's optimized ScrollTrigger engine
- Direct GSAP animations (no CSS variables needed)
- Proper cleanup prevents memory leaks
- Canvas mode disables heavy operations

## Browser Support

- Modern browsers with CSS custom properties support
- GSAP ScrollTrigger compatibility
- Mobile-friendly with momentum scroll support

## License

This component uses GSAP ScrollTrigger, which is free for commercial use. See [GSAP licensing](https://greensock.com/licensing/) for details.
