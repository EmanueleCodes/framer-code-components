"use client"

import { forwardRef, useMemo, useRef } from "react"
import { Effect, BlendFunction } from "postprocessing"
import { Uniform, Vector2 } from "three"

const fragmentShader = `
// Basic uniforms
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;

// PostFX uniforms
uniform float time;
uniform vec2 resolution;
uniform vec2 mousePos;
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float targetFPS;
uniform float jitterIntensity;
uniform float jitterSpeed;
uniform bool mouseGlowEnabled;
uniform float mouseGlowRadius;
uniform float mouseGlowIntensity;
uniform float vignetteIntensity;
uniform float vignetteRadius;
uniform int colorPalette;
uniform float curvature;
uniform float aberrationStrength;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
uniform float glitchIntensity;
uniform float glitchFrequency;
uniform float brightnessAdjust;
uniform float contrastAdjust;

// Helper functions
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 rgb2hsl(vec3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float delta = maxC - minC;
  float h = 0.0, s = 0.0, l = (maxC + minC) / 2.0;
  if (delta > 0.0) {
    s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);
    if (maxC == color.r) h = ((color.g - color.b) / delta) + (color.g < color.b ? 6.0 : 0.0);
    else if (maxC == color.g) h = ((color.b - color.r) / delta) + 2.0;
    else h = ((color.r - color.g) / delta) + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;
  vec3 rgb;
  if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

vec3 applyColorPalette(vec3 color, int palette) {
  if (palette == 1) { // Green
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, lum * 0.9, 0.1);
  } else if (palette == 2) { // Amber
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(lum * 1.0, lum * 0.6, lum * 0.2);
  } else if (palette == 3) { // Cyan
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.0, lum * 0.8, lum);
  } else if (palette == 4) { // Blue
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, 0.2, lum);
  }
  return color;
}

float getChar(float brightness, vec2 p, int style) {
  vec2 grid = floor(p * 4.0);
  float val = 0.0;

  // Style 0: Standard - Classic ASCII with . : - = + * # @
  if (style == 0) {
    if (brightness < 0.1) val = 0.0;
    else if (brightness < 0.2) val = (grid.x == 1.5 && grid.y == 1.0) ? 0.4 : 0.0;
    else if (brightness < 0.3) val = (grid.x >= 1.0 && grid.x <= 2.0 && grid.y == 1.5) ? 0.6 : 0.0;
    else if (brightness < 0.45) val = (grid.y == 1.5) ? 0.7 : 0.0;
    else if (brightness < 0.55) val = (grid.y == 1.5 || (grid.x == 1.5 && (grid.y == 1.0 || grid.y == 2.0))) ? 0.8 : 0.0;
    else if (brightness < 0.7) val = (mod(grid.x + grid.y, 2.0) < 1.0) ? 0.85 : 0.3;
    else if (brightness < 0.85) val = (grid.x == 0.0 || grid.x == 3.0 || grid.y == 0.0 || grid.y == 3.0) ? 1.0 : 0.5;
    else val = 1.0;
  }

  // Style 1: Dense - Tighter packed characters for detail
  else if (style == 1) {
    if (brightness < 0.15) val = 0.0;
    else if (brightness < 0.25) val = (grid.x == 1.5 && grid.y == 1.5) ? 0.5 : 0.0;
    else if (brightness < 0.4) val = ((grid.x == 1.0 || grid.x == 2.0) && (grid.y == 1.0 || grid.y == 2.0)) ? 0.7 : 0.0;
    else if (brightness < 0.55) val = (grid.y >= 1.0 && grid.y <= 2.0) ? 0.8 : 0.15;
    else if (brightness < 0.7) val = (mod(grid.x + grid.y, 2.0) < 1.0) ? 0.9 : 0.4;
    else if (brightness < 0.85) val = 0.85;
    else val = 1.0;
  }

  // Style 2: Minimal - Clean, sparse look
  else if (style == 2) {
    if (brightness < 0.25) val = 0.0;
    else if (brightness < 0.45) val = (grid.x == 1.5 && grid.y == 1.5) ? 0.6 : 0.0;
    else if (brightness < 0.65) val = (grid.y == 1.5) ? 0.8 : 0.0;
    else if (brightness < 0.85) val = ((grid.x == 0.0 || grid.x == 3.0) && grid.y == 1.5) ? 1.0 : (grid.y == 1.5 ? 0.8 : 0.0);
    else val = 1.0;
  }

  // Style 3: Blocks - Pixelated block style
  else if (style == 3) {
    float blockBrightness = step(0.1, brightness);
    if (brightness < 0.25) val = (mod(grid.x, 3.0) < 1.0 && mod(grid.y, 3.0) < 1.0) ? 0.5 * blockBrightness : 0.0;
    else if (brightness < 0.5) val = (mod(grid.x + grid.y, 2.0) < 1.0) ? 0.7 * blockBrightness : 0.2 * blockBrightness;
    else if (brightness < 0.75) val = 0.8;
    else val = 1.0;
  }

  // Style 4: Braille - Dot pattern like braille characters
  else if (style == 4) {
    vec2 dotGrid = floor(p * 8.0);
    float dotX = mod(dotGrid.x, 2.0);
    float dotY = mod(dotGrid.y, 4.0);
    bool isDotPos = (dotX < 1.0) && (dotY == 0.0 || dotY == 1.0 || dotY == 2.0 || dotY == 3.0);
    if (brightness < 0.15) val = 0.0;
    else if (brightness < 0.3) val = isDotPos && (dotY == 1.0 || dotY == 2.0) ? 0.6 : 0.0;
    else if (brightness < 0.5) val = isDotPos && (dotY >= 1.0 && dotY <= 2.0) ? 0.8 : 0.0;
    else if (brightness < 0.7) val = isDotPos ? 0.9 : 0.0;
    else if (brightness < 0.85) val = isDotPos ? 1.0 : 0.2;
    else val = isDotPos ? 1.0 : 0.4;
  }

  // Style 5: Technical - Circuit-like patterns
  else if (style == 5) {
    bool isEdge = (grid.x == 0.0 || grid.x == 3.0 || grid.y == 0.0 || grid.y == 3.0);
    bool isCorner = (grid.x == 0.0 || grid.x == 3.0) && (grid.y == 0.0 || grid.y == 3.0);
    bool isCenter = (grid.x >= 1.0 && grid.x <= 2.0) && (grid.y >= 1.0 && grid.y <= 2.0);
    if (brightness < 0.2) val = 0.0;
    else if (brightness < 0.35) val = isCorner ? 0.7 : 0.0;
    else if (brightness < 0.5) val = (isCorner || (grid.x == 1.5 && grid.y == 1.5)) ? 0.8 : 0.0;
    else if (brightness < 0.65) val = isEdge ? 0.85 : (isCenter ? 0.3 : 0.0);
    else if (brightness < 0.8) val = isEdge ? 1.0 : 0.5;
    else val = 1.0;
  }

  // Style 6: Matrix - Digital rain / cascading code look
  else if (style == 6) {
    float col = floor(p.x * 4.0);
    float row = floor(p.y * 6.0);
    float seed = fract(sin(col * 12.9898 + floor(time * 2.0)) * 43758.5453);
    float charSeed = fract(sin((col + row * 4.0) * 78.233 + seed) * 43758.5453);
    bool isOn = charSeed < brightness;
    if (brightness < 0.15) val = 0.0;
    else if (brightness < 0.4) val = isOn ? 0.5 + charSeed * 0.3 : 0.0;
    else if (brightness < 0.7) val = isOn ? 0.7 + charSeed * 0.2 : 0.1;
    else val = isOn ? 0.9 + charSeed * 0.1 : 0.3;
  }

  // Style 7: Hatching - Cross-hatch shading
  else if (style == 7) {
    vec2 hatchUV = p * 8.0;
    float diag1 = abs(mod(hatchUV.x + hatchUV.y, 2.0) - 1.0);
    float diag2 = abs(mod(hatchUV.x - hatchUV.y, 2.0) - 1.0);
    float hLine = abs(mod(hatchUV.y, 2.0) - 1.0);
    float vLine = abs(mod(hatchUV.x, 2.0) - 1.0);
    
    if (brightness < 0.15) val = 0.0;
    else if (brightness < 0.3) val = (diag1 < 0.15) ? 0.6 : 0.0;
    else if (brightness < 0.45) val = (diag1 < 0.2 || diag2 < 0.15) ? 0.7 : 0.0;
    else if (brightness < 0.6) val = (diag1 < 0.25 || diag2 < 0.2) ? 0.8 : 0.1;
    else if (brightness < 0.75) val = (diag1 < 0.3 || diag2 < 0.25 || hLine < 0.2) ? 0.9 : 0.2;
    else if (brightness < 0.9) val = (diag1 < 0.35 || diag2 < 0.3 || hLine < 0.25 || vLine < 0.2) ? 0.95 : 0.35;
    else val = 1.0;
  }

  return val;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 workUV = uv;

  // PRE-PROCESSING (Tier 2)
  // Screen curvature
  if (curvature > 0.0) {
    vec2 centered = workUV * 2.0 - 1.0;
    centered *= 1.0 + curvature * dot(centered, centered);
    workUV = centered * 0.5 + 0.5;
    if (workUV.x < 0.0 || workUV.x > 1.0 || workUV.y < 0.0 || workUV.y > 1.0) {
      outputColor = vec4(0.0);
      return;
    }
  }

  // Wave distortion
  if (waveAmplitude > 0.0) {
    workUV.x += sin(workUV.y * waveFrequency + time * waveSpeed) * waveAmplitude;
    workUV.y += cos(workUV.x * waveFrequency + time * waveSpeed) * waveAmplitude;
  }

  // CORE ASCII RENDERING
  float currentTime = targetFPS > 0.0 ? floor(time * targetFPS) / targetFPS : time;

  vec4 sampledColor;
  if (aberrationStrength > 0.0) {
    float offset = aberrationStrength;
    vec2 uvR = workUV + vec2(offset, 0.0);
    vec2 uvG = workUV;
    vec2 uvB = workUV - vec2(offset, 0.0);
    float r = texture(inputBuffer, uvR).r;
    float g = texture(inputBuffer, uvG).g;
    float b = texture(inputBuffer, uvB).b;
    sampledColor = vec4(r, g, b, 1.0);
  } else {
    sampledColor = texture(inputBuffer, workUV);
  }

  // Contrast and brightness
  sampledColor.rgb = (sampledColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;

  // Time-based noise
  if (noiseIntensity > 0.0) {
    float noiseVal = noise(workUV * noiseScale + time * noiseSpeed);
    sampledColor.rgb += (noiseVal - 0.5) * noiseIntensity;
  }

  // Jitter
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(uv * cellCount);
  if (jitterIntensity > 0.0) {
    float jitterTime = time * jitterSpeed;
    float jitterX = (random(vec2(cellCoord.y, floor(jitterTime))) - 0.5) * jitterIntensity * 2.0;
    float jitterY = (random(vec2(cellCoord.x, floor(jitterTime + 1000.0))) - 0.5) * jitterIntensity * 2.0;
    cellCoord += vec2(jitterX, jitterY);
  }

  // RGB Glitch
  if (glitchIntensity > 0.0 && glitchFrequency > 0.0) {
    float glitchTime = floor(time * glitchFrequency);
    float glitchRand = random(vec2(glitchTime, cellCoord.y));
    if (glitchRand < glitchIntensity) {
      float shift = (random(vec2(glitchTime + 1.0, cellCoord.y)) - 0.5) * 20.0;
      cellCoord.x += shift;
    }
  }

  vec2 cellUV = (cellCoord + 0.5) / cellCount;
  vec4 cellColor = texture(inputBuffer, cellUV);
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  if (invert) brightness = 1.0 - brightness;

  vec2 localUV = fract(uv * cellCount);
  float charValue = getChar(brightness, localUV, asciiStyle);

  vec3 finalColor;
  if (colorMode) {
    finalColor = cellColor.rgb * charValue;
  } else {
    finalColor = vec3(brightness * charValue);
  }

  // POST-PROCESSING (Tier 1)
  finalColor = applyColorPalette(finalColor, colorPalette);

  // Mouse glow
  if (mouseGlowEnabled) {
    vec2 pixelPos = uv * resolution;
    float dist = length(pixelPos - mousePos);
    float glow = exp(-dist / mouseGlowRadius) * mouseGlowIntensity;
    finalColor += glow;
  }

  // Scanlines
  if (scanlineIntensity > 0.0) {
    float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
    finalColor *= 1.0 - (scanline * scanlineIntensity);
  }

  // Vignette
  if (vignetteIntensity > 0.0) {
    vec2 centered = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(centered, centered) / vignetteRadius;
    finalColor *= mix(1.0, vignette, vignetteIntensity);
  }

  outputColor = vec4(finalColor, cellColor.a);
}
`

// Module-level variables for state management
let _time = 0
let _deltaAccumulator = 0
let _cellSize = 9
let _invert = false
let _colorMode = true
let _asciiStyle = 0
let _resolution = new Vector2(1920, 1080)
let _mousePos = new Vector2(0, 0)

class AsciiEffectImpl extends Effect {
  constructor(options) {
    const {
      cellSize = 9,
      invert = false,
      color = true,
      style = 0,
      resolution = new Vector2(1920, 1080),
      mousePos = new Vector2(0, 0),
      postfx = {}
    } = options

    super("AsciiEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["cellSize", new Uniform(cellSize)],
        ["invert", new Uniform(invert)],
        ["colorMode", new Uniform(color)],
        ["asciiStyle", new Uniform(style)],
        ["time", new Uniform(0)],
        ["resolution", new Uniform(resolution)],
        ["mousePos", new Uniform(mousePos)],
        ["scanlineIntensity", new Uniform(postfx.scanlineIntensity || 0)],
        ["scanlineCount", new Uniform(postfx.scanlineCount || 200)],
        ["targetFPS", new Uniform(postfx.targetFPS || 0)],
        ["jitterIntensity", new Uniform(postfx.jitterIntensity || 0)],
        ["jitterSpeed", new Uniform(postfx.jitterSpeed || 1)],
        ["mouseGlowEnabled", new Uniform(postfx.mouseGlowEnabled || false)],
        ["mouseGlowRadius", new Uniform(postfx.mouseGlowRadius || 200)],
        ["mouseGlowIntensity", new Uniform(postfx.mouseGlowIntensity || 1.5)],
        ["vignetteIntensity", new Uniform(postfx.vignetteIntensity || 0)],
        ["vignetteRadius", new Uniform(postfx.vignetteRadius || 0.8)],
        ["colorPalette", new Uniform(postfx.colorPalette || 0)],
        ["curvature", new Uniform(postfx.curvature || 0)],
        ["aberrationStrength", new Uniform(postfx.aberrationStrength || 0)],
        ["noiseIntensity", new Uniform(postfx.noiseIntensity || 0)],
        ["noiseScale", new Uniform(postfx.noiseScale || 1)],
        ["noiseSpeed", new Uniform(postfx.noiseSpeed || 1)],
        ["waveAmplitude", new Uniform(postfx.waveAmplitude || 0)],
        ["waveFrequency", new Uniform(postfx.waveFrequency || 10)],
        ["waveSpeed", new Uniform(postfx.waveSpeed || 1)],
        ["glitchIntensity", new Uniform(postfx.glitchIntensity || 0)],
        ["glitchFrequency", new Uniform(postfx.glitchFrequency || 0)],
        ["brightnessAdjust", new Uniform(postfx.brightnessAdjust || 0)],
        ["contrastAdjust", new Uniform(postfx.contrastAdjust || 1)],
      ]),
    })

    _cellSize = cellSize
    _invert = invert
    _colorMode = color
    _asciiStyle = style
    _resolution = resolution
    _mousePos = mousePos
  }

  update(renderer, inputBuffer, deltaTime) {
    const targetFPS = this.uniforms.get("targetFPS").value

    if (targetFPS > 0) {
      const frameDuration = 1 / targetFPS
      _deltaAccumulator += deltaTime
      if (_deltaAccumulator >= frameDuration) {
        _time += frameDuration
        _deltaAccumulator = _deltaAccumulator % frameDuration
      }
    } else {
      _time += deltaTime
    }

    this.uniforms.get("time").value = _time
    this.uniforms.get("cellSize").value = _cellSize
    this.uniforms.get("invert").value = _invert
    this.uniforms.get("colorMode").value = _colorMode
    this.uniforms.get("asciiStyle").value = _asciiStyle
    this.uniforms.get("resolution").value = _resolution
    this.uniforms.get("mousePos").value = _mousePos
  }
}

export const AsciiEffect = forwardRef((props, ref) => {
  const {
    style = "standard",
    cellSize = 9,
    invert = false,
    color = true,
    postfx = {},
    resolution = new Vector2(1920, 1080),
    mousePos = new Vector2(0, 0)
  } = props

  const styleMap: Record<string, number> = { standard: 0, dense: 1, minimal: 2, blocks: 3, braille: 4, technical: 5, matrix: 6, hatching: 7 }
  const styleNum = styleMap[style] || 0

  _cellSize = cellSize
  _invert = invert
  _colorMode = color
  _asciiStyle = styleNum
  _resolution = resolution
  _mousePos = mousePos

  const effect = useMemo(
    () => new AsciiEffectImpl({ cellSize, invert, color, style: styleNum, postfx, resolution, mousePos }),
    []
  )

  return <primitive ref={ref} object={effect} dispose={null} />
})

AsciiEffect.displayName = "AsciiEffect"