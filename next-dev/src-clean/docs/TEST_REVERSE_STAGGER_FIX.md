# 🧪 Testing Guide: Reverse Behavior Stagger Fix

## 🎯 Purpose

Verify that the critical bug fix for reverse behaviors with directional stagger orders is working correctly.

## 🔧 Test Setup

### 1. Configure Directional Stagger Orders

Set up a stagger configuration with **different** forward and backward orders:

```typescript
// In your animation slot configuration
staggerConfig: {
    enabled: true,
    delay: 0.3,
    strategy: 'linear',
    order: {
        forward: 'edges-in',      // Elements animate from edges to center
        backward: 'first-to-last'  // Elements animate in natural DOM order
    }
}
```

### 2. Set Up Test Elements

Create 5+ elements in a container to clearly see stagger order differences:

```html
<div class="test-container">
    <div class="test-element">Element 1</div>
    <div class="test-element">Element 2</div>
    <div class="test-element">Element 3</div>
    <div class="test-element">Element 4</div>
    <div class="test-element">Element 5</div>
</div>
```

### 3. Configure Reverse Behavior

Use `PLAY_BACKWARD_AND_REVERSE` behavior:

```typescript
trigger: {
    event: 'click',
    behavior: AnimationBehavior.PLAY_BACKWARD_AND_REVERSE,
    // ... other config
}
```

## ✅ Expected Results

### Phase 1 (Backward Animation: 1 → 0)

**Animation Direction**: `'backward'`  
**Stagger Order Used**: `'first-to-last'` (from `config.order.backward`)  
**Visual Sequence**: Elements 1, 2, 3, 4, 5 (in DOM order)

### Phase 2 (Forward Animation: 0 → 1)

**Animation Direction**: `'forward'`  
**Stagger Order Used**: `'edges-in'` (from `config.order.forward`)  
**Visual Sequence**: Elements 1&5, then 2&4, then 3 (edges to center)

## 🔍 Console Verification

Look for these console logs to confirm correct behavior:

```
🔄 [EventAnimationCoordinator] Tracking reverse behavior Phase 1: PLAY_BACKWARD_AND_REVERSE

🔍 [LINEAR-STAGGER-DEBUG] Order resolved: {
  animationDirection: "backward",
  forwardOrder: "edges-in",
  backwardOrder: "first-to-last",
  orderToUse: "first-to-last"
}

🔄 [EventAnimationCoordinator] Phase 1 completed, triggering Phase 2 with stagger coordination

🔍 [LINEAR-STAGGER-DEBUG] Order resolved: {
  animationDirection: "forward", 
  forwardOrder: "edges-in",
  backwardOrder: "first-to-last",
  orderToUse: "edges-in"
}

🔄 [EventAnimationCoordinator] Reverse behavior completed: PLAY_BACKWARD_AND_REVERSE
```

## 🚨 What Would Indicate the Bug Still Exists

If you see this in Phase 2:
```
🔍 [LINEAR-STAGGER-DEBUG] Order resolved: {
  animationDirection: "forward",
  orderToUse: "first-to-last"  // ❌ WRONG - should be "edges-in"
}
```

## 🎯 Additional Test Cases

### Test Case 2: PLAY_FORWARD_AND_REVERSE

```typescript
staggerConfig: {
    order: {
        forward: 'center-out',
        backward: 'last-to-first'
    }
}

behavior: AnimationBehavior.PLAY_FORWARD_AND_REVERSE
```

**Expected:**
- Phase 1 (Forward): Uses `'center-out'`
- Phase 2 (Backward): Uses `'last-to-first'`

### Test Case 3: Same Orders (Should Still Work)

```typescript
staggerConfig: {
    order: {
        forward: 'first-to-last',
        backward: 'first-to-last'  // Same order
    }
}
```

**Expected:** Both phases use `'first-to-last'` (no visual change, but architecture should work)

## 🎉 Success Criteria

✅ **Phase 1** uses the correct directional order  
✅ **Phase 2** uses the **different** directional order  
✅ **Visual behavior** clearly shows different stagger patterns  
✅ **Console logs** confirm correct order resolution for each phase  
✅ **No errors** or unexpected behavior  
✅ **Performance** remains smooth throughout both phases

## 🐛 If Tests Fail

1. **Check console errors** for implementation issues
2. **Verify imports** - ensure `AnimationBehavior` is properly imported
3. **Check phase tracking** - ensure reverse behaviors are being tracked
4. **Validate stagger config** - ensure directional orders are different
5. **Test simpler case** - try with basic `first-to-last` vs `last-to-first`

The fix should handle all edge cases gracefully and maintain the clean architecture principles of the FAME system. 