'use client'

import { useEffect, useRef } from "react"

import { Renderer, Camera, Mesh, Plane, Program, RenderTarget, Texture } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';


// LIBRARIES WE NEED TO BUNDLE
// import {
//     Renderer,
//     Camera,
//     Mesh,
//     Plane,
//     Program,
//     RenderTarget,
//     resolveLygia,
//     Pane,
//     //@ts-ignore import errors are to be expected
// } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/ascii-bundle.js"

// Inline shader sources to avoid special bundler config
const perlinVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`

const perlinFragmentShader = `#version 300 es
precision mediump float;
uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform float uSaturation;
uniform float uHueOffset;
in vec2 vUv;
out vec4 fragColor;

#include "lygia/generative/cnoise.glsl"

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
  hue = fract(hue + uHueOffset);
  vec3 rainbowColor = hsv2rgb(vec3(hue, clamp(uSaturation, 0.0, 1.0), uValue));
  fragColor = vec4(rainbowColor, 1.0);
}`

const asciiVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`

const asciiFragmentShader = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;   // cols, rows
uniform float uNumGlyphs;
uniform float uCellSize;
uniform float uInvert;
uniform float uContrast;
uniform float uThresholdBias;
uniform float uUsePalette;
uniform float uPaletteSize;
uniform vec3 uPalette0;
uniform vec3 uPalette1;
uniform vec3 uPalette2;
uniform vec3 uPalette3;
uniform vec3 uPalette4;
uniform vec3 uBgColor;
uniform float uGlyphScale;   // scale of glyph inside cell
uniform float uGamma;        // optional brightness mapping gamma
uniform float uCellAspect;   // width/height aspect
out vec4 fragColor;

vec3 getPaletteColor(int idx) {
  if (idx == 0) return uPalette0;
  if (idx == 1) return uPalette1;
  if (idx == 2) return uPalette2;
  if (idx == 3) return uPalette3;
  return uPalette4;
}

void main() {
  vec2 pix = gl_FragCoord.xy;
  float cell = max(uCellSize, 2.0);
  vec3 src = texture(uTexture, floor(pix / cell) * cell / uResolution.xy).rgb;
  float gray = 0.3 * src.r + 0.59 * src.g + 0.11 * src.b;
  gray = pow(gray, max(uGamma, 0.0001));
  gray = clamp((gray - 0.5 + uThresholdBias) * uContrast + 0.5, 0.0, 1.0);
  if (uInvert > 0.5) gray = 1.0 - gray;

  // Per-cell local UV
  float scale = clamp(uGlyphScale, 0.2, 2.0);
  vec2 origin = floor(pix / cell) * cell;
  vec2 local = (pix - origin) / cell; // 0..1
  local.x = (local.x - 0.5) / scale * uCellAspect + 0.5;
  local.y = (local.y - 0.5) / scale + 0.5;
  if (any(lessThan(local, vec2(0.0))) || any(greaterThan(local, vec2(1.0)))) {
    fragColor = vec4(uBgColor, 1.0);
    return;
  }

  // Atlas lookup
  float cols = max(uAtlasGrid.x, 1.0);
  float rows = max(uAtlasGrid.y, 1.0);
  float glyphIndex = floor(gray * max(uNumGlyphs - 1.0, 0.0));
  float gx = mod(glyphIndex, cols);
  float gy = floor(glyphIndex / cols);
  vec2 stepAtlas = vec2(1.0 / cols, 1.0 / rows);
  vec2 atlasUV = (vec2(gx, gy) + local) * stepAtlas;
  float mask = texture(uAtlas, atlasUV).r; // glyph drawn as white on black

  // Color
  vec3 baseCol = src;
  if (uUsePalette > 0.5) {
    float ps = clamp(uPaletteSize, 1.0, 5.0);
    int last = int(ps) - 1;
    int idx = int(floor(gray * float(last) + 1e-4));
    idx = clamp(idx, 0, last);
    baseCol = getPaletteColor(idx);
  }

  vec3 outCol = mix(uBgColor, baseCol, mask);
  fragColor = vec4(outCol, 1.0);
}`

export default function Page() {
    const canvasContainerRef = useRef<HTMLDivElement | null>(null)
    const paneContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
        let rafId = 0
        let resizeHandler: (() => void) | null = null

        const container = canvasContainerRef.current
        if (!container) return

        const renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio || 1, 2),
        })
        const gl = renderer.gl
        container.appendChild(gl.canvas)

        const camera = new Camera(gl, { near: 0.1, far: 100 })
        camera.position.set(0, 0, 3)

      const doResize = () => {
            const width = container.clientWidth || window.innerWidth
            const height = container.clientHeight || window.innerHeight
            renderer.setSize(width, height)
            camera.perspective({ aspect: gl.canvas.width / gl.canvas.height })
        }
        resizeHandler = doResize
        window.addEventListener("resize", doResize)
        doResize()

      // Perlin noise pass
      const perlinProgram = new Program(gl, {
        vertex: perlinVertexShader,
        fragment: resolveLygia(perlinFragmentShader),
        uniforms: {
          uTime: { value: 0 },
          uFrequency: { value: 5.0 },
          uBrightness: { value: 0.5 },
          uSpeed: { value: 0.75 },
                uValue: { value: 0.5 },
                uSaturation: { value: 1.0 },
                uHueOffset: { value: 0.0 },
        },
        })

      const perlinMesh = new Mesh(gl, {
        geometry: new Plane(gl, { width: 2, height: 2 }),
        program: perlinProgram,
        })

        const renderTarget = new RenderTarget(gl)

        // Build a simple glyph atlas on a hidden canvas using system fonts (no deps)
        const buildAtlas = (charsetStr: string, fontCSS: string) => {
            const glyphs = Array.from(charsetStr)
            const cols = Math.ceil(Math.sqrt(glyphs.length || 1))
            const rows = Math.ceil((glyphs.length || 1) / cols)
            const glyphSize = 64
            const canvas = document.createElement('canvas')
            canvas.width = cols * glyphSize
            canvas.height = rows * glyphSize
            const ctx = canvas.getContext('2d')!
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#fff'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = fontCSS
            let i = 0
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const ch = glyphs[i % glyphs.length]
                    const cx = c * glyphSize + glyphSize / 2
                    const cy = r * glyphSize + glyphSize / 2
                    ctx.fillText(ch, cx, cy)
                    i++
                }
            }
            return { canvas, cols, rows, count: glyphs.length }
        }

        const defaultCharset = '.:-=+*#%@WM'
        const defaultFont = `${Math.floor(64 * 0.8)}px ui-monospace, SFMono-Regular, Menlo, monospace`
        const atlasData = buildAtlas(defaultCharset, defaultFont)
        const atlasTex = new Texture(gl, { image: atlasData.canvas, generateMipmaps: true, flipY: false })

      // ASCII pass
      const asciiProgram = new Program(gl, {
        vertex: asciiVertexShader,
        fragment: asciiFragmentShader,
            uniforms: {
          uResolution: { value: [gl.canvas.width, gl.canvas.height] },
          uTexture: { value: renderTarget.texture },
                uAtlas: { value: atlasTex },
                uAtlasGrid: { value: [atlasData.cols, atlasData.rows] },
                uNumGlyphs: { value: Math.max(atlasData.count, 1) },
                uCellSize: { value: 16.0 },
                uInvert: { value: 0.0 },
                uContrast: { value: 1.0 },
                uThresholdBias: { value: 0.0 },
                uUsePalette: { value: 0.0 },
                uPaletteSize: { value: 2.0 },
                uPalette0: { value: [0.0, 0.0, 0.0] }, // black
                uPalette1: { value: [1.0, 1.0, 1.0] }, // white
                uPalette2: { value: [1.0, 0.0, 1.0] }, // magenta
                uPalette3: { value: [0.5, 0.0, 1.0] }, // purple
                uPalette4: { value: [0.0, 0.0, 1.0] }, // blue
                uBgColor: { value: [0.0, 0.0, 0.0] },
                uGlyphScale: { value: 1.0 },
                uGamma: { value: 1.0 },
                uCellAspect: { value: 1.0 },
            },
        })

      const asciiMesh = new Mesh(gl, {
        geometry: new Plane(gl, { width: 2, height: 2 }),
        program: asciiProgram,
        })

      // Controls
        let pane: any | null = null
      if (paneContainerRef.current) {
            pane = new Pane({ container: paneContainerRef.current } as any)
            
            // Basic motion controls
            const folderMotion = (pane as any).addFolder({ title: "Motion" })
            folderMotion.addBinding(perlinProgram.uniforms.uFrequency, "value", { min: 0, max: 12, step: 0.1, label: "Detail" })
            folderMotion.addBinding(perlinProgram.uniforms.uSpeed, "value", { min: 0, max: 3, step: 0.01, label: "Speed" })
            folderMotion.addBinding(perlinProgram.uniforms.uValue, "value", { min: 0, max: 1, step: 0.01, label: "Brightness" })

            // Font and character controls
            const folderFont = (pane as any).addFolder({ title: "Font & Characters" })
            const charParams = { set: defaultCharset, font: 'Monospace', fontSize: 0.8 }
            const fontOptions: Record<string, string> = {
                Monospace: `ui-monospace, SFMono-Regular, Menlo, monospace`,
                Monaco: 'Monaco, monospace',
                Menlo: 'Menlo, monospace',
                'Courier New': 'Courier New, monospace',
                'IBM Plex Mono': 'IBM Plex Mono, monospace',
                'JetBrains Mono': 'JetBrains Mono, monospace',
            }
            const setApi = (folderFont as any).addBinding(charParams, 'set', { label: 'Character Set' })
            const fontApi = (folderFont as any).addBinding(charParams, 'font', { options: Object.keys(fontOptions).reduce((acc: any, k) => { acc[k] = k; return acc }, {}), label: 'Font' })
            const sizeApi = (folderFont as any).addBinding(charParams, 'fontSize', { min: 0.6, max: 1.0, step: 0.01, label: 'Font Size' })

            // Color controls - simplified approach
            const folderColor = (pane as any).addFolder({ title: "Colors" })
            
            // Background color - hex input
            const bgColor = { hex: '#000000' }
            folderColor.addBinding(bgColor, 'hex', { label: "Background Color" })
            
            // Update background color when changed
            const bgBinding = folderColor.addBinding(bgColor, 'hex')
            bgBinding.on('change', (ev: any) => {
                const hex = ev.value
                const r = parseInt(hex.slice(1, 3), 16) / 255
                const g = parseInt(hex.slice(3, 5), 16) / 255
                const b = parseInt(hex.slice(5, 7), 16) / 255
                asciiProgram.uniforms.uBgColor.value = [r, g, b]
            })
            
            // Character color mode
            const colorMode = { mode: 'original' }
            const colorModeApi = folderColor.addBinding(colorMode, 'mode', { 
                options: { 
                    'original': 'Original Colors', 
                    'blackWhite': 'Black & White',
                    'custom': 'Custom Palette'
                }, 
                label: 'Character Colors' 
            })
            
            colorModeApi.on('change', (ev: any) => {
                if (ev.value === 'blackWhite') {
                    asciiProgram.uniforms.uUsePalette.value = 1.0
                    asciiProgram.uniforms.uPaletteSize.value = 2.0
                    asciiProgram.uniforms.uPalette0.value = [0.0, 0.0, 0.0]
                    asciiProgram.uniforms.uPalette1.value = [1.0, 1.0, 1.0]
                } else if (ev.value === 'custom') {
                    asciiProgram.uniforms.uUsePalette.value = 1.0
                    asciiProgram.uniforms.uPaletteSize.value = 3.0
                } else {
                    asciiProgram.uniforms.uUsePalette.value = 0.0
                }
            })

            // Custom palette colors - using hex inputs
            const customColors = folderColor.addFolder({ title: "Custom Palette" })
            
            const palette1 = { hex: '#000000' }
            const palette2 = { hex: '#ffffff' }
            const palette3 = { hex: '#ff00ff' }
            
            // Character colors with hex inputs
            customColors.addBinding(palette1, 'hex', { label: "Character Color 1" })
            customColors.addBinding(palette2, 'hex', { label: "Character Color 2" })
            customColors.addBinding(palette3, 'hex', { label: "Character Color 3" })
            
            // Update uniforms when palette colors change
            const updatePalette = () => {
                const hexToRgb = (hex: string) => {
                    const r = parseInt(hex.slice(1, 3), 16) / 255
                    const g = parseInt(hex.slice(3, 5), 16) / 255
                    const b = parseInt(hex.slice(5, 7), 16) / 255
                    return [r, g, b]
                }
                
                asciiProgram.uniforms.uPalette0.value = hexToRgb(palette1.hex)
                asciiProgram.uniforms.uPalette1.value = hexToRgb(palette2.hex)
                asciiProgram.uniforms.uPalette2.value = hexToRgb(palette3.hex)
            }
            
            // Add change listeners to all palette color bindings
            [palette1, palette2, palette3].forEach((palette) => {
                const binding = customColors.addBinding(palette, 'hex')
                binding.on('change', updatePalette)
            })

            const rebuildAtlas = () => {
                const css = `${Math.floor(64 * charParams.fontSize)}px ${fontOptions[charParams.font]}`
                const { canvas, cols, rows, count } = buildAtlas(charParams.set || ' ', css)
                atlasTex.image = canvas as any
                ;(atlasTex as any).needsUpdate = true
                asciiProgram.uniforms.uAtlasGrid.value = [cols, rows]
                asciiProgram.uniforms.uNumGlyphs.value = Math.max(count, 1)
            }
            setApi.on('change', rebuildAtlas)
            fontApi.on('change', rebuildAtlas)
            sizeApi.on('change', rebuildAtlas)
        }

        let lastTime = 0
        const frameInterval = 1000 / 30 // 30 FPS

      const update = (time: number) => {
            rafId = requestAnimationFrame(update)
            if (time - lastTime < frameInterval) return
            lastTime = time

            const elapsedTime = time * 0.001
            perlinProgram.uniforms.uTime.value = elapsedTime

        // Render to offscreen
            renderer.render({ scene: perlinMesh, camera, target: renderTarget })

        // Render ASCII to screen
            asciiProgram.uniforms.uResolution.value = [
                gl.canvas.width,
                gl.canvas.height,
            ]
            renderer.render({ scene: asciiMesh, camera })
        }
        rafId = requestAnimationFrame(update)

    return () => {
            cancelAnimationFrame(rafId)
            if (resizeHandler)
                window.removeEventListener("resize", resizeHandler)
            if (pane) pane.dispose()
            if (gl && gl.canvas && gl.canvas.parentElement === container) {
                container.removeChild(gl.canvas)
            }
        }
    }, [])

  return (
        <div
            style={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                background: "#000",
                display:"flex",
                flexDirection:"column",
                justifyContent:"center",
                alignItems:"center",
            }}
        >
           
            <div
                ref={canvasContainerRef}
                style={{ position: "absolute", inset: 0 }}
            />
            <div
                ref={paneContainerRef}
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    pointerEvents: "auto",
                    zIndex: 10,
                }}
            />
    </div>
    )
}
