# CRT Effect - Debugging Guide

## How to Debug

The component now includes comprehensive console logging. Open your browser's developer tools (F12 or Cmd+Option+I on Mac) and check the Console tab.

## What to Look For

### 1. Check Scene Initialization
You should see:
```
CRT Effect: Initializing Three.js scene
```

If you DON'T see this:
- Three.js might not be loading
- The component might not be mounted
- Check for other JavaScript errors

### 2. Check Capture Readiness
When the component tries to capture, you'll see one of:

**If successful:**
```
CRT Effect: Capturing element with ID "your-id"
CRT Effect: Capture successful { width: 800, height: 600 }
```

**If target not found:**
```
CRT Effect: Target element with ID "your-id" not found
```
→ **Fix**: Make sure you've set the ID in Framer on your scroll section

**If not ready:**
```
CRT Effect: Not ready to capture {
  container: true/false,
  html2canvas: true/false,
  THREE: true/false,
  uniforms: true/false
}
```
→ **Fix**: Wait a moment, libraries might still be loading

## Common Issues & Solutions

### Issue: "Target element not found"

**Cause**: The ID you entered doesn't match any element in the page.

**Solutions**:
1. **Check spelling**: IDs are case-sensitive! "mySection" ≠ "mysection"
2. **Set ID in Framer**:
   - Select your scroll section or frame
   - Right panel → ID field (near the top)
   - Enter a unique ID (e.g., "content-section")
3. **Use the exact ID**: Copy the ID from Framer and paste it into the CRT component's "Target ID" field

### Issue: Black screen or no distortion

**Possible causes**:

1. **Initial texture is black**
   - Wait 500ms for the first capture
   - Check console for "Capture successful" message

2. **Target element is empty**
   - Make sure your target element has visible content
   - Check that content has loaded (images, text, etc.)

3. **Target element is hidden**
   - The element must be visible to be captured
   - Check CSS visibility/display properties

4. **Size mismatch**
   - CRT component should overlap the target content
   - Check that CRT component has a size (not 0x0)

### Issue: Effect not updating during scroll

**Check**:
1. Refresh Rate is NOT 0 (try 100ms)
2. Target element is actually scrolling
3. Console shows repeated "Capture successful" messages

**If captures are happening but effect looks static**:
- The captured area might be static (not the scrolling part)
- Try targeting the scrolling container, not a fixed element

### Issue: Performance problems

**Symptoms**: Sluggish scrolling, high CPU usage

**Solutions**:
1. **Increase refresh rate**: Try 200ms or 300ms instead of 100ms
2. **Reduce area**: Make the CRT component smaller
3. **Simplify content**: Complex layouts take longer to capture
4. **Check capture logs**: If seeing "Capture successful" many times per second, refresh rate might be too low

## Manual Testing Steps

### Step 1: Verify Setup
1. Open browser DevTools (F12)
2. Go to Console tab
3. Reload Framer preview
4. You should see: "CRT Effect: Initializing Three.js scene"

### Step 2: Check Target Element
In the console, type:
```javascript
document.getElementById("your-target-id")
```
Replace `your-target-id` with your actual ID.

**Expected**: You should see an HTML element printed
**If null**: Your ID is wrong or not set

### Step 3: Verify Capture Attempts
Watch the console for capture messages every X milliseconds (based on your refresh rate).

**Expected**: 
```
CRT Effect: Capturing element with ID "..."
CRT Effect: Capture successful
```

**If not appearing**: Check that isSceneReady and isHtml2CanvasLoaded are true

### Step 4: Check Texture Update
If captures are successful but you don't see distortion:
- Check that the canvas is visible (inspect element in DevTools)
- Verify the canvas has non-zero dimensions
- Check if the shader is rendering (look for WebGL canvas in DOM)

## Advanced Debugging

### Check if html2canvas is loaded
In console:
```javascript
typeof window.html2canvas
```
**Expected**: `"function"`
**If undefined**: html2canvas didn't load

### Check if THREE is loaded
In console:
```javascript
typeof window.THREE
```
**Expected**: `"object"`
**If undefined**: Three.js didn't load

### Manually trigger capture
In console (after component is loaded):
```javascript
// This won't work from console, but you can add a button to your component for testing
```

## Still Not Working?

### Checklist:
- [ ] ID is set in Framer (not just in code)
- [ ] ID matches exactly (case-sensitive)
- [ ] Target element exists and has content
- [ ] Target element is visible (not display:none)
- [ ] CRT component is visible and has size
- [ ] Console shows "Capture successful" messages
- [ ] No JavaScript errors in console
- [ ] Refresh rate is greater than 0 (for dynamic content)

### Try This:
1. Set Target ID to empty ("") temporarily
2. Check if you see the black placeholder (means WebGL is working)
3. Add a simple test ID to any visible element
4. Set that as Target ID
5. Watch console for capture messages

### Report Issue:
If still not working, note:
1. What do you see in the console?
2. What does the component look like? (black? transparent? broken?)
3. Does `document.getElementById("your-id")` return the element?
4. Are there any errors in the console?

