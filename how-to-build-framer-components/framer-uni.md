# Framer University Component Development Guide

## Overview

This guide establishes the standard patterns and conventions for building Framer University components. Following these patterns ensures consistency, maintainability, and optimal user experience across all components.

## Component Structure Template

### 1. Imports & Dependencies

```typescript
import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// External libraries (if needed)
import { SomeLibrary } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/library-name.js"
```

**Key Points:**
- Always import `ComponentMessage` for empty states
- Use CDN imports for external libraries to avoid bundling issues
- Import only necessary React hooks

### 2. TypeScript Interface

```typescript
interface ComponentNameProps {
    // Always include preview as first prop
    preview: boolean
    
    // Component-specific props
    // ... other props
    
    // Always include style as last prop
    style?: React.CSSProperties
}
```

**Key Points:**
- `preview` is always the first prop
- `style` is always the last prop (optional)
- Use descriptive prop names
- Avoid using `any` type (per user preference)

### 3. Framer Annotations

```typescript
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
```

**Key Points:**
- Use `any-prefer-fixed` for flexible sizing
- Set appropriate intrinsic dimensions
- Always include `@framerDisableUnlink`

### 4. Component Function

```typescript
export default function ComponentName({
    preview = false, // Always default to false
    // ... other props with defaults
    style,
}: ComponentNameProps) {
    // Component logic here
}
```

**Key Points:**
- Always use `export default`
- `preview` defaults to `false`
- Destructure props with defaults
- Use descriptive function names

## Property Controls Pattern

### 1. Control Order

```typescript
addPropertyControls(ComponentName, {
    // 1. Preview (always first)
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    
    // 2. Main content controls
    // ... content controls
    
    // 3. Configuration controls
    // ... configuration controls
    
    // 4. Style controls
    // ... style controls
    
    // 5. Last control with Framer University link
    lastControl: {
        type: ControlType.Number,
        title: "Last Control",
        // ... other properties
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})
```

### 2. Control Types & Patterns

#### Boolean Controls
```typescript
preview: {
    type: ControlType.Boolean,
    title: "Preview",
    defaultValue: false,
    enabledTitle: "On",
    disabledTitle: "Off",
}
```

#### Number Controls with Mapping
```typescript
speed: {
    type: ControlType.Number,
    title: "Speed",
    min: 0.1,
    max: 1,
    step: 0.1,
    defaultValue: 0.5,
}
```

#### Enum Controls
```typescript
mode: {
    type: ControlType.Enum,
    title: "Mode",
    options: ["option1", "option2"],
    optionTitles: ["Option 1", "Option 2"],
    defaultValue: "option1",
    displaySegmentedControl: true,
    segmentedControlDirection: "vertical",
}
```

#### Image Controls
```typescript
image: {
    type: ControlType.ResponsiveImage,
    title: "Image",
}
```

#### Conditional Controls
```typescript
advancedOption: {
    type: ControlType.Number,
    title: "Advanced Option",
    min: 0,
    max: 100,
    defaultValue: 50,
    hidden: (props) => props.mode !== "advanced",
}
```

### 3. Framer University Link

**Always include the Framer University link in the last property control:**

```typescript
lastControl: {
    // ... other properties
    description: "More components at [Framer University](https://frameruni.link/cc).",
}
```

## Value Mapping System

### 1. Linear Mapping Function

```typescript
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}
```

### 2. Specific Mapping Functions

```typescript
// Speed: UI [0.1..1] → internal [0.1..5]
function mapSpeedUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 0.1, 5.0)
}

// Size: UI [0.1..1] → internal [20..2] (inverted)
function mapSizeUiToInternal(ui: number): number {
    return mapLinear(ui, 0.1, 1.0, 20, 2)
}
```

### 3. Usage in Component

```typescript
const internalSpeed = mapSpeedUiToInternal(speed)
const internalSize = mapSizeUiToInternal(size)
```

## Empty State Pattern

### 1. ComponentMessage Usage

```typescript
{!hasContent ? (
    <ComponentMessage
        style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
        }}
        title="Component Title"
        subtitle="Add content to see the effect"
    />
) : (
    // Actual component content
)}
```

### 2. Content Detection

```typescript
const hasContent = !!(image && image.src) // For images
const hasContent = content.length > 0 // For arrays
const hasContent = !!someRequiredProp // For other content
```

## Canvas Mode Handling

### 1. Canvas Detection

```typescript
const isCanvas = RenderTarget.current() === RenderTarget.canvas
```

### 2. Preview Control

```typescript
// In animations/effects
animationPlayState: (isCanvas && !preview) ? "paused" : "running"

// In useEffect dependencies
useEffect(() => {
    // Effect logic
}, [preview, /* other deps */])
```

### 3. Performance Optimization

```typescript
// Disable animations in canvas mode when preview is off
if (isCanvas && !preview) {
    // No animation loop for maximum performance
    return
}
```

## Display Name Pattern

```typescript
ComponentName.displayName = "User-Friendly Name"
```

**Examples:**
- `CirclingElements.displayName = "Circle Animator"`
- `WavePrism.displayName = "Wave Prism"`
- `BulgeDistortion.displayName = "3D Image Distortion DEV"`

## Common Patterns

### 1. Responsive Container

```typescript
<div
    style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }}
>
    {/* Component content */}
</div>
```

### 2. Zoom Detection (for Canvas)

```typescript
const zoomProbeRef = useRef<HTMLDivElement>(null)

// In JSX
<div
    ref={zoomProbeRef}
    style={{
        position: "absolute",
        width: 20,
        height: 20,
        opacity: 0,
        pointerEvents: "none",
    }}
/>

// Usage
const editorZoom = zoomProbeRef.current
    ? zoomProbeRef.current.getBoundingClientRect().width / 20
    : 1
```

### 3. Mobile Detection

```typescript
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
    const checkMobile = () => {
        const coarse = window.matchMedia("(pointer: coarse)").matches
        const small = window.matchMedia("(max-width: 768px)").matches
        setIsMobile(coarse || small)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
}, [])
```

## File Naming Convention

- Component files: `componentName.tsx`
- Use camelCase for file names
- Be descriptive but concise

## Code Organization

### 1. Order of Sections

1. Imports
2. Type definitions
3. Utility functions (mapping, etc.)
4. Framer annotations
5. Component function
6. Property controls
7. Display name

### 2. Commenting

```typescript
// Section comments for major blocks
// Inline comments for complex logic
// JSDoc comments for utility functions
```

## Testing Checklist

- [ ] Preview toggle works in canvas mode
- [ ] All property controls function correctly
- [ ] Empty state displays when no content
- [ ] Mobile responsiveness (if applicable)
- [ ] Performance in canvas mode
- [ ] Value mapping produces expected results
- [ ] Framer University link is present
- [ ] Display name is set

## Common Mistakes to Avoid

❌ **Don't forget the preview prop** - Always include as first prop
❌ **Don't skip value mapping** - Use mapping functions for better UX
❌ **Don't forget empty states** - Always handle missing content gracefully
❌ **Don't skip canvas mode handling** - Optimize for Framer's canvas
❌ **Don't forget the Framer University link** - Always include in last control
❌ **Don't use `any` type** - Use proper TypeScript types
❌ **Don't skip display name** - Set a user-friendly display name

## Example Component Template

```typescript
import React, { useState, useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

interface ExampleComponentProps {
    preview: boolean
    content?: string
    speed?: number
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function ExampleComponent({
    preview = false,
    content = "",
    speed = 0.5,
    style,
}: ExampleComponentProps) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    
    // Value mapping
    const internalSpeed = mapLinear(speed, 0.1, 1.0, 0.1, 5.0)
    
    const hasContent = !!content
    
    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {!hasContent ? (
                <ComponentMessage
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        minWidth: 0,
                        minHeight: 0,
                    }}
                    title="Example Component"
                    subtitle="Add content to see the effect"
                />
            ) : (
                <div>
                    {/* Component content */}
                </div>
            )}
        </div>
    )
}

addPropertyControls(ExampleComponent, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    content: {
        type: ControlType.String,
        title: "Content",
        defaultValue: "",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})

ExampleComponent.displayName = "Example Component"
```

---

**Remember**: Consistency is key. Following these patterns ensures your components integrate seamlessly with Framer University's ecosystem and provide an excellent user experience.
