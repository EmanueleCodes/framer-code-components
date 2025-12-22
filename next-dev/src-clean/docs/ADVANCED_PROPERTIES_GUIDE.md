# FAME Advanced Properties Guide

## 🎨 New Animation Properties

FAME now supports three powerful new animation properties for creating sophisticated visual effects:

1. **Gradient Interpolation** - Smooth transitions between gradients
2. **Clip Path Animation** - Animated masking and clipping effects  
3. **Text Background Image** - Gradient text effects with proper clipping

---

## 🌈 Gradient Interpolation

### **Property Name**: `gradientBackground`

Animate between different CSS gradients with smooth color and position interpolation.

#### **Features**
- ✅ Linear, radial, and conic gradient support
- ✅ Color stop interpolation (RGB/RGBA/HSL/Hex)
- ✅ Position interpolation (percentages, pixels, viewport units)
- ✅ Direction/angle interpolation
- ✅ Intelligent fallback for mismatched structures

#### **Usage Example**
```typescript
// In FAME Animation Slot
{
  property: "gradientBackground",
  from: "linear-gradient(0deg, #ff0000 0%, #0000ff 100%)",
  to: "linear-gradient(90deg, #00ff00 0%, #ffff00 100%)",
  duration: 2.0,
  easing: "cubic.out"
}
```

#### **Supported Gradient Types**
```css
/* Linear gradients */
linear-gradient(45deg, #red 0%, #blue 100%)
linear-gradient(to right, #ff0000, #00ff00, #0000ff)

/* Radial gradients */
radial-gradient(circle, #red 0%, #blue 100%)
radial-gradient(ellipse at center, #ff0000, #00ff00)

/* Conic gradients */
conic-gradient(from 0deg, #red, #blue, #green)
```

#### **Best Practices**
- Keep same gradient type (linear ↔ linear, radial ↔ radial)
- Match number of color stops when possible
- Use consistent units for positions

---

## ✂️ Clip Path Animation

### **Property Name**: `clipPath`

Animate CSS clip paths for masking, revealing, and shape morphing effects.

#### **Features**
- ✅ `inset()` clipping (rectangular masks)
- ✅ `polygon()` shapes (custom polygons)
- ✅ `circle()` and `ellipse()` shapes
- ✅ Smooth interpolation of coordinates
- ✅ Unit-aware interpolation (%, px, em, etc.)

#### **Usage Example**
```typescript
// In FAME Animation Slot
{
  property: "clipPath",
  from: "inset(0% 0% 0% 0%)",
  to: "inset(20% 20% 20% 20%)",
  duration: 1.5,
  easing: "spring.out"
}
```

#### **Supported Clip Path Types**

**Inset (Rectangular)**
```css
/* Format: inset(top right bottom left) */
inset(0% 0% 0% 0%)      /* No clipping */
inset(10% 20% 10% 20%)  /* Clipped rectangle */
inset(50% 0% 0% 0%)     /* Top half hidden */
```

**Polygon (Custom Shapes)**
```css
/* Format: polygon(x1 y1, x2 y2, x3 y3, ...) */
polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)  /* Diamond */
polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)  /* Rectangle */
polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)  /* Trapezoid */
```

**Circle & Ellipse**
```css
circle(50% at 50% 50%)        /* Perfect circle */
ellipse(60% 40% at 50% 50%)   /* Oval shape */
```

#### **Animation Examples**

**Reveal Effect**
```typescript
from: "inset(0% 100% 0% 0%)",  // Hidden (right edge)
to: "inset(0% 0% 0% 0%)"       // Fully visible
```

**Shape Morphing**
```typescript
from: "polygon(50% 0%, 100% 100%, 0% 100%)",      // Triangle
to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" // Rectangle
```

---

## ✨ Text Background Image

### **Property Name**: `textBackgroundImage`

Apply animated background images (especially gradients) to text with proper clipping.

#### **Features**
- ✅ Automatic text element detection
- ✅ Proper background clipping to text
- ✅ Gradient interpolation support
- ✅ Works with Framer text components
- ✅ Fallback for complex text structures

#### **Usage Example**
```typescript
// In FAME Animation Slot
{
  property: "textBackgroundImage",
  from: "linear-gradient(45deg, #ff6b6b 0%, #4ecdc4 100%)",
  to: "linear-gradient(225deg, #45b7d1 0%, #f9ca24 100%)",
  duration: 3.0,
  easing: "sine"
}
```

#### **How It Works**
1. **Element Detection**: Automatically finds text elements within the target
2. **Style Application**: Sets `color: transparent` and `background-clip: text`
3. **Interpolation**: Uses gradient interpolation for smooth transitions
4. **Optimization**: Handles Framer text components and nested structures

#### **Text Gradient Examples**

**Rainbow Text**
```typescript
from: "linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)",
to: "linear-gradient(270deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)"
```

**Metallic Effect**
```typescript
from: "linear-gradient(45deg, #c0c0c0 0%, #ffffff 50%, #c0c0c0 100%)",
to: "linear-gradient(225deg, #ffd700 0%, #ffffff 50%, #ffd700 100%)"
```

---

## 🚀 Integration with FAME

### **Adding to Animation Slots**

These properties work exactly like existing FAME properties:

```typescript
// Example Animation Slot Configuration
{
  id: "advanced-effects",
  triggers: [{ event: "click", behavior: "toggle" }],
  animatedElements: [{ scope: "self" }],
  properties: [
    {
      property: "gradientBackground",
      from: "linear-gradient(0deg, #ff0000 0%, #0000ff 100%)",
      to: "linear-gradient(90deg, #00ff00 0%, #ffff00 100%)",
      duration: 2.0,
      easing: "cubic.out"
    },
    {
      property: "clipPath",
      from: "inset(0% 0% 0% 0%)",
      to: "inset(20% 20% 20% 20%)",
      duration: 1.5,
      delay: 0.5,
      easing: "spring.out"
    },
    {
      property: "textBackgroundImage",
      from: "linear-gradient(45deg, #ff6b6b 0%, #4ecdc4 100%)",
      to: "linear-gradient(225deg, #45b7d1 0%, #f9ca24 100%)",
      duration: 3.0,
      easing: "sine"
    }
  ]
}
```

### **Property Controls**

All three properties are available in the FAME property selector:

- **Gradient Background** - For background gradient animations
- **Clip Path** - For masking and clipping effects
- **Text Background Image** - For text gradient effects

### **Easing Support**

All advanced properties support the full range of FAME easing functions:
- Linear, cubic, exponential
- Spring physics with overshoot
- Custom timing curves

---

## 🎭 Demo Component

Use the `AdvancedPropertiesDemo` component to test and preview the new features:

1. **Add the component** to your Framer project
2. **Set demo mode** to see different property types
3. **Configure FAME animations** using the new properties
4. **Test interactivity** with click, hover, or scroll triggers

### **Demo Modes**
- `gradient` - Shows gradient background animation
- `clipPath` - Shows clip path masking animation  
- `textGradient` - Shows text gradient animation

---

## 💡 Tips & Best Practices

### **Performance**
- Gradient interpolation is optimized for smooth 60fps animation
- Clip path animations use hardware acceleration when possible
- Text background clipping works best with simple text elements

### **Compatibility**
- All features work with existing FAME triggers (click, scroll, timed)
- Staggering is fully supported for distributed elements
- Text processing integration for character/word-level effects

### **Troubleshooting**

**Gradients not interpolating smoothly?**
- Ensure same gradient type (linear/radial/conic)
- Match color stop counts when possible
- Check gradient syntax validity

**Clip path not animating?**
- Verify both values use same clip path type
- Ensure matching coordinate counts for polygons
- Check CSS syntax (commas, units, parentheses)

**Text gradients not showing?**
- Verify element contains actual text content
- Check for nested text structures in complex components
- Ensure proper gradient syntax

---

## 🔮 Future Enhancements

Planned improvements for advanced properties:

- **Mask Property Support** - Full CSS mask interpolation
- **Filter Animation** - Blur, brightness, contrast interpolation
- **SVG Path Morphing** - Animate between SVG path shapes
- **3D Transform Interpolation** - Enhanced 3D animation support

---

*Ready to create stunning animations with FAME's advanced properties!* 🚀 