# GSAP Carousel Bundle

A custom bundle of GSAP libraries specifically designed for creating horizontal carousel components in Framer.

## What's Included

This bundle contains all the GSAP functionality needed for the horizontal carousel component:

- **gsap**: Core GSAP library
- **Draggable**: Plugin for drag-to-scroll functionality
- **InertiaPlugin**: Plugin for momentum scrolling
- **useGSAP**: React hook for GSAP integration
- **gsapUtils**: Common GSAP utility functions
- **easing**: Pre-configured easing functions
- **animationPresets**: Ready-to-use animation presets

## Installation

### For Framer Usage

Import the bundle directly in your Framer component:

```javascript
import { 
  gsap, 
  Draggable, 
  InertiaPlugin, 
  useGSAP,
  gsapUtils,
  easing,
  animationPresets 
} from "https://raw.githubusercontent.com/your-username/gsap-carousel-bundle/main/dist/bundle.js";
```

### For Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the bundle:
   ```bash
   npm run build
   ```

## Usage Examples

### Basic GSAP Animation

```javascript
import { gsap, useGSAP } from "your-bundle-url";

function MyComponent() {
  const ref = useRef(null);
  
  useGSAP(() => {
    gsap.to(ref.current, {
      x: 100,
      duration: 1,
      ease: "power2.out"
    });
  }, { scope: ref });
  
  return <div ref={ref}>Animated Element</div>;
}
```

### Drag Functionality

```javascript
import { gsap, Draggable, useGSAP } from "your-bundle-url";

function DraggableComponent() {
  const ref = useRef(null);
  
  useGSAP(() => {
    Draggable.create(ref.current, {
      type: "x",
      bounds: "parent",
      inertia: true
    });
  }, { scope: ref });
  
  return <div ref={ref}>Draggable Element</div>;
}
```

### Using Animation Presets

```javascript
import { gsap, animationPresets, useGSAP } from "your-bundle-url";

function AnimatedCard() {
  const ref = useRef(null);
  
  useGSAP(() => {
    gsap.fromTo(ref.current, 
      animationPresets.slideOut, 
      animationPresets.slideIn
    );
  }, { scope: ref });
  
  return <div ref={ref}>Animated Card</div>;
}
```

## API Reference

### Core Exports

- **gsap**: The main GSAP object
- **Draggable**: GSAP Draggable plugin
- **InertiaPlugin**: GSAP InertiaPlugin for momentum
- **useGSAP**: React hook for GSAP integration

### Utility Functions

- **gsapUtils.toArray**: Convert elements to array
- **gsapUtils.wrap**: Wrap values within a range
- **gsapUtils.snap**: Snap values to increments
- **gsapUtils.getProperty**: Get CSS property values
- **gsapUtils.set**: Set CSS properties
- **gsapUtils.killTweensOf**: Kill animations on elements

### Easing Functions

- **easing.power1**: Power easing (1-4)
- **easing.back**: Back easing
- **easing.elastic**: Elastic easing
- **easing.bounce**: Bounce easing
- **easing.sine**: Sine easing
- **easing.circ**: Circular easing
- **easing.expo**: Exponential easing

### Animation Presets

- **animationPresets.slideIn**: Slide in from left
- **animationPresets.slideOut**: Slide out to left
- **animationPresets.fadeIn**: Fade in
- **animationPresets.fadeOut**: Fade out
- **animationPresets.scaleUp**: Scale up with back easing
- **animationPresets.scaleDown**: Scale down

## Building the Bundle

To rebuild the bundle with updated dependencies:

```bash
npm run build
```

This will create a new `dist/bundle.js` file with all the GSAP functionality bundled together.

## File Structure

```
gsap-carousel-bundle/
├── src/
│   └── index.js          # Main entry point with all imports/exports
├── dist/
│   └── bundle.js         # Generated bundle (after build)
├── package.json          # Dependencies and scripts
├── rollup.config.js      # Rollup configuration
└── README.md            # This file
```

## Dependencies

- **gsap**: ^3.13.0 - Core animation library
- **react**: ^18.2.0 - React (external dependency)
- **react-dom**: ^18.2.0 - React DOM (external dependency)

## License

MIT License - Feel free to use this bundle in your Framer projects!

## Contributing

If you need additional GSAP functionality or want to optimize the bundle, feel free to submit a pull request or create an issue.
