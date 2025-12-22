# CRT Effect - Quick Start Guide

## 🚀 Quick Setup (2 Steps!)

### 1. Drop Component Inside

In Framer:
1. Find the frame/section you want to distort
2. **Drag the CRT Effect component INSIDE it** (not next to it)
3. Position doesn't matter - it's invisible!

### 2. Adjust Settings (Optional)

In the CRT component properties:
1. **Refresh Rate**: Set to 100ms for smooth scrolling (or 0ms for static)
2. Adjust effect intensity, scanlines, etc.

**Done!** 🎉

---

## 💡 Common Use Cases

### Distorted Scroll Section

**Setup**:
```
Your Scroll Section
  ├─ Heading Text
  ├─ Body Text
  ├─ Image
  └─ [CRT Effect Component] ← Drop it anywhere inside!
```

**Settings**:
- Refresh Rate: 100ms (smooth scrolling)
- Intensity: 0.5
- Effect values: To taste

**Result**: Entire section looks like an old CRT monitor

---

### Glitchy Hero Section

**Setup**:
```
Hero Frame
  ├─ Background
  ├─ Logo
  ├─ Heading
  └─ [CRT Effect Component]
```

**Settings**:
- Refresh Rate: 0ms (static)
- Intensity: 0.7
- Chromatic Aberration: 0.8
- Distortion: 0.6

**Result**: Retro glitchy hero effect

---

### Sticky Distortion Window

**Setup**:
```
Frame (Position: Sticky, Top: 0)
  ├─ Your scrolling content
  └─ [CRT Effect Component]
```

**Settings**:
- Refresh Rate: 100ms
- Intensity: 0.6

**Result**: Sticky effect that distorts content as it scrolls through

---

## 🎛️ Effect Presets

### Subtle Retro
```
Intensity: 0.3
Scanlines: 0.2
Chromatic Aberration: 0.2
Vignette: 0.3
Distortion: 0.1
Noise: 0.2
Speed: 0.5
Refresh Rate: 100ms
```

### Strong CRT
```
Intensity: 0.8
Scanlines: 0.7
Chromatic Aberration: 0.6
Vignette: 0.7
Distortion: 0.6
Noise: 0.5
Speed: 0.7
Refresh Rate: 100ms
```

### Broken Monitor
```
Intensity: 1.0
Scanlines: 0.9
Chromatic Aberration: 0.9
Vignette: 0.8
Distortion: 0.8
Noise: 0.8
Speed: 1.0
Refresh Rate: 50ms
```

### Clean Distortion
```
Intensity: 0.6
Scanlines: 0.0
Chromatic Aberration: 0.4
Vignette: 0.4
Distortion: 0.4
Noise: 0.0
Speed: 0.5
Refresh Rate: 100ms
```

---

## ⚙️ Refresh Rate Guide

| Rate | Use Case | Performance |
|------|----------|-------------|
| 0ms | Static content (images, text) | Lightest |
| 100ms | Scrolling content | Balanced ⭐ |
| 50ms | Very smooth animation | Heavier |
| 200ms+ | Complex content, slower devices | Light |

**Recommendation**: Start with 100ms, adjust if needed

---

## 🐛 Troubleshooting

### Nothing Shows Up?

**Check:**
- ✅ Component is INSIDE the frame (not outside)
- ✅ Frame has visible content
- ✅ Wait ~500ms for first capture
- ✅ Open console (F12) for error messages

**Quick Fix:**
1. Select your frame
2. Drag CRT component directly onto it
3. Release - it should nest inside
4. Check layers panel - CRT should be child of frame

---

### Static Image (Not Updating During Scroll)?

**Check:**
- ✅ Refresh Rate is NOT 0 (try 100ms)
- ✅ Content is actually scrolling/changing
- ✅ Console shows repeated captures

**Quick Fix:**
Set Refresh Rate to 100ms in properties

---

### Performance Issues / Lag?

**Try:**
1. **Increase refresh rate**: 200ms or 300ms
2. **Simplify content**: Fewer complex elements
3. **Reduce effect intensity**: Doesn't help capture but renders faster
4. **Test on actual device**: Not just Framer preview

**Progressive Optimization:**
- Start: 200ms
- If smooth: Try 150ms
- If smooth: Try 100ms
- If laggy: Back to 200ms

---

### Distortion Looks Wrong / Weird?

**Common Causes:**

1. **Parent too small**: Make sure frame has reasonable size
2. **Transparent parent**: Effect captures what's visible
3. **Nested too deep**: Should be direct child of target frame

**Quick Fix:**
- Move component to be direct child of frame you want to distort
- Ensure frame has solid background

---

## 📐 Component Placement

### ✅ Correct Placement

```
Your Frame
  ├─ Content 1
  ├─ Content 2
  └─ [CRT Effect] ← Inside, at any level
```

### ❌ Wrong Placement

```
Your Frame
  ├─ Content 1
  └─ Content 2
  
[CRT Effect] ← Outside frame (won't work!)
```

### ✅ Also Works

```
Your Frame
  ├─ Stack
  │   ├─ Content 1
  │   ├─ Content 2
  │   └─ [CRT Effect] ← Nested inside works!
  └─ More Content
```

---

## 🎯 Pro Tips

1. **Multiple Effects**: Place CRT component in multiple frames for different intensities

2. **Animate Properties**: Use variables/motion to animate effect properties on scroll

3. **Conditional Display**: Hide/show effect based on scroll position or state

4. **Layer Order**: Component order in frame doesn't matter - effect always overlays

5. **Preview Mode**: Use preview toggle in canvas to see effect without publishing

6. **Start Simple**: Begin with default settings, then tweak

7. **Console is Your Friend**: Open DevTools (F12) to see what's happening

---

## 📱 Mobile Considerations

- CRT effect works on mobile but may impact performance
- Consider:
  - Higher refresh rate on mobile (200ms+)
  - Disable on mobile using variants
  - Test on actual devices
  - Lower intensity for better performance

### Mobile Optimization

```
Desktop Variant:
  - Refresh Rate: 100ms
  - Full effects

Mobile Variant:
  - Refresh Rate: 200ms or 0ms
  - Reduced intensity (0.3)
  - Or hide component entirely
```

---

## 🔍 Debug Checklist

Before asking for help, check:

- [ ] Component is placed INSIDE target frame
- [ ] Frame has visible content
- [ ] Refresh rate is set appropriately
- [ ] Opened browser console (F12) for messages
- [ ] Waited at least 500ms after loading
- [ ] Tested in preview mode (not just canvas)
- [ ] No JavaScript errors in console

---

## 📚 Learn More

- [README.md](./README.md) - Full technical documentation
- [DEBUGGING.md](./DEBUGGING.md) - Detailed troubleshooting
- [CRT-Reference.js](./CRT-Reference.js) - Original shader code

---

## 🎓 Video Tutorial

(Coming soon - will add link when available)

---

## Need Help?

1. Check console (F12) for error messages
2. Review [DEBUGGING.md](./DEBUGGING.md)
3. Make sure component is INSIDE frame
4. Try with simple content first

---

**Remember**: Just drop it inside the frame you want to distort. That's the secret! 🎮✨
