# Color Handling in Framer Canvas Components

## The Problem

When building WebGL/canvas-based Framer components, background colors often don't work as expected. You set a color in the property controls, but the canvas remains black or unchanged.

## Why This Happens

1. **Canvas Coverage**: WebGL canvas elements cover their entire container
2. **CSS Background Ignored**: Container CSS `background` is hidden behind the canvas
3. **WebGL Clear Color**: Only affects the initial clear, not the rendered content
4. **Static Color Resolution**: Colors resolved once at mount, not on prop changes

## The Solution: Shader-Based Color Handling

### 1. Add Color Parsing Utilities

```typescript
// CSS variable token and color parsing (hex/rgba/var())
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()
    
    // Handle rgba() format
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a = rgbaMatch[4] !== undefined
            ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
            : 1
        return { r, g, b, a }
    }
    
    // Handle hex formats
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}
```

### 2. Add Background Color Uniform to Shader

```glsl
// Fragment Shader
uniform vec3 bgColor; // background color from controls

void main() {
    // Your existing shader logic here...
    vec3 wave = vec3(r, g, b);
    
    // Blend wave on top of background color
    vec3 col = clamp(bgColor + wave, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
```

### 3. Initialize Background Color Uniform

```typescript
// In your component initialization
const resolvedBackgroundColor = resolveTokenColor(backgroundColor)
const backgroundColorRgba = parseColorToRgba(resolvedBackgroundColor)

refs.uniforms = {
    // ... other uniforms
    bgColor: { value: [backgroundColorRgba.r, backgroundColorRgba.g, backgroundColorRgba.b] },
}
```

### 4. Update Background Color on Prop Changes

```typescript
// Update uniforms when props change
useEffect(() => {
    const { current: refs } = sceneRef
    
    if (refs.uniforms) {
        // ... other uniform updates
        
        // Update background color uniform
        const resolvedBgColor = resolveTokenColor(backgroundColor)
        const bg = parseColorToRgba(resolvedBgColor)
        refs.uniforms.bgColor.value = [bg.r, bg.g, bg.b]
    }
    
    // Force render in canvas mode
    if (RenderTarget.current() === RenderTarget.canvas && refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
    }
}, [backgroundColor, /* other dependencies */])
```

### 5. Property Control Setup

```typescript
addPropertyControls(YourComponent, {
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        optional: true,
        description: "More components at [Framer University](https://frameruni.link/cc).",
    },
})
```

## Supported Color Formats

- **Hex**: `#000000`, `#000000ff` (with alpha)
- **RGB/RGBA**: `rgb(0,0,0)`, `rgba(0,0,0,0.5)`
- **CSS Variables**: `var(--color-primary)`, `var(--color-primary, #000000)`
- **Framer Tokens**: Any color token from your design system

## Key Principles

1. **Shader-Based**: Handle colors in the fragment shader, not CSS
2. **Dynamic Resolution**: Re-resolve colors on every prop change
3. **Uniform Updates**: Update shader uniforms immediately
4. **Force Rendering**: Render a frame when colors change in canvas mode
5. **Token Support**: Parse CSS variables and fallbacks properly

## Common Mistakes to Avoid

❌ **Don't rely on CSS background** - Canvas covers the container
❌ **Don't set clear color only** - Only affects initial clear, not content
❌ **Don't resolve colors once** - Must re-resolve on prop changes
❌ **Don't forget canvas mode** - Force render when props change

## Testing Checklist

- [ ] Color changes immediately in property controls
- [ ] Works in both canvas and live modes
- [ ] Supports CSS variables/tokens
- [ ] Supports opacity/alpha values
- [ ] Works with hex, rgb, rgba formats
- [ ] No performance issues in canvas mode

## Example Implementation

See `next-dev/app/wave-prism/wavePrism.tsx` for a complete working example of shader-based background color handling.

---

**Remember**: In WebGL/canvas components, colors must be handled in the shader pipeline, not through CSS. This approach ensures colors work consistently across all Framer contexts.
