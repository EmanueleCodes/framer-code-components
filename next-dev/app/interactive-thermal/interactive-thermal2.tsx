import { useEffect, useMemo, useRef } from "react"
import type { ComponentType } from "react"
import {
  ClampToEdgeWrapping,
  Color,
  MathUtils,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial, 
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/interactive-thermal.js"
import { addPropertyControls, ControlType } from "framer"

const MAX_COLORS = 8
const defaultPalette = [
  "#11206a",
  "#1f3ba2",
  "#2f63e7",
  "#6bd7ff",
  "#ffe679",
  "#ff991e",
  "#ff4c00",
]
const defaultImage =
  "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"

const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision mediump float;

#define MAX_COLORS 8

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_contour;
uniform float u_angle;
uniform float u_noise;
uniform float u_glowIn;
uniform float u_glowOut;
uniform float u_scale;
uniform vec3 u_colorBack;
uniform int u_colorsCount;
uniform vec3 u_colors[MAX_COLORS];

varying vec2 vUv;

float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 rotateUV(vec2 uv, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 rot = mat2(c, -s, s, c);
    return rot * uv;
}

vec3 samplePalette(float t) {
    if (u_colorsCount <= 0) return vec3(1.0);
    float clampedT = clamp(t, 0.0, 1.0);
    float scaled = clampedT * float(u_colorsCount - 1);
    int baseIndex = int(floor(scaled + 0.0001));
    int nextIndex = min(baseIndex + 1, u_colorsCount - 1);
    float f = fract(scaled);

    vec3 c0 = u_colors[0];
    vec3 c1 = u_colors[0];

    for (int i = 0; i < MAX_COLORS; i++) {
        if (i == baseIndex) {
            c0 = u_colors[i];
        }
        if (i == nextIndex) {
            c1 = u_colors[i];
        }
    }

    return mix(c0, c1, f);
}

float readMask(vec2 uv) {
    vec4 sample = texture2D(u_image, clamp(uv, 0.0, 1.0));
    float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
    float inverted = 1.0 - luminance;
    return clamp(max(inverted, sample.a), 0.0, 1.0);
}

void main() {
    vec2 centered = vUv - 0.5;
    centered *= u_scale;
    centered = rotateUV(centered, u_angle);
    vec2 uv = centered + 0.5;

    // Always generate animated flow, independent of mask
    float flowA = 0.5 + 0.5 * sin(u_time * u_speed + centered.y * 6.0);
    float flowB = 0.5 + 0.5 * sin(u_time * u_speed * 0.5 + centered.x * 8.0);
    float flow = mix(flowA, flowB, 0.4);

    // Read mask for shape constraint
    float maskValue = readMask(uv);
    
    // Generate energy from flow alone, then mask it
    float energy = clamp(0.3 + u_glowIn * flow, 0.0, 1.0);
    
    // Add noise
    float grain = (random(centered * 40.0 + u_time * 0.3) - 0.5) * u_noise;
    energy = clamp(energy + grain, 0.0, 1.0);

    // Apply contour power
    energy = pow(energy, mix(0.5, 2.0, clamp(u_contour, 0.0, 1.0)));
    
    // Apply mask
    energy *= clamp(maskValue + u_glowOut * 0.5, 0.0, 1.0);
    energy = clamp(energy, 0.0, 1.0);

    vec3 paletteColor = samplePalette(energy);
    vec3 finalColor = mix(u_colorBack, paletteColor, energy);

    gl_FragColor = vec4(finalColor, energy);
}
`

function parsePalette(colors?: string[]) {
  const palette = (Array.isArray(colors) && colors.length ? colors : defaultPalette).slice(0, MAX_COLORS)
  const parsed = palette.map((hex) => {
    const c = new Color(hex || "#000000")
    return new Vector3(c.r, c.g, c.b)
  })
  while (parsed.length < MAX_COLORS) {
    parsed.push(parsed[parsed.length - 1])
  }
  return { values: parsed, count: palette.length }
}

function parseBackground(color: string | undefined, fallback: string) {
  const parsed = new Color((color || fallback || "#00000000").trim())
  return new Vector3(parsed.r, parsed.g, parsed.b)
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

const ThermalHeatmap: ComponentType<any> = (props) => {
  const {
    colors,
    colorBack = "#00000000",
    speed = 1,
    contour = 0.5,
    angle = 0,
    noise = 0.05,
    glowIn = 0.5,
    glowOut = 0.5,
    scale = 0.75,
    image,
  } = props

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const meshRef = useRef<any>(null)
  const uniformsRef = useRef<any>(null)
  const textureRef = useRef<any>(null)

  const paletteSettings = useMemo(() => parsePalette(colors), [colors])
  const backgroundVec = useMemo(() => parseBackground(colorBack, "#00000000"), [colorBack])
  const imageUrl = useMemo(
    () => (typeof image === "string" && image.trim().length > 0 ? image : defaultImage),
    [image]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    rendererRef.current = renderer

    const scene = new Scene()
    sceneRef.current = scene

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geometry = new PlaneGeometry(2, 2)
    const uniforms = {
      u_image: { value: null },
      u_resolution: { value: new Vector2(canvas.width, canvas.height) },
      u_time: { value: 0 },
      u_speed: { value: speed },
      u_contour: { value: contour },
      u_angle: { value: MathUtils.degToRad(angle) },
      u_noise: { value: noise },
      u_glowIn: { value: glowIn },
      u_glowOut: { value: glowOut },
      u_scale: { value: Math.max(0.1, scale) },
      u_colorBack: { value: backgroundVec },
      u_colors: { value: paletteSettings.values },
      u_colorsCount: { value: paletteSettings.count },
    }
    uniformsRef.current = uniforms

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    const mesh = new Mesh(geometry, material)
    meshRef.current = mesh
    scene.add(mesh)

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.floor(bounds.width))
      const height = Math.max(1, Math.floor(bounds.height))
      renderer.setSize(width, height, false)
      uniforms.u_resolution.value.set(width, height)
    }

    resize()
    window.addEventListener("resize", resize)

    let animationId: number | null = null
    const render = (time: number) => {
      uniforms.u_time.value = time * 0.001

      if (!textureRef.current) {
        renderer.setClearColor(new Color(colorBack), 1)
        renderer.clear()
        animationId = requestAnimationFrame(render)
        return
      }

      renderer.render(scene, camera)
      animationId = requestAnimationFrame(render)
    }
    animationId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener("resize", resize)
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
      }
      if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      renderer.dispose()
      if (textureRef.current) {
        textureRef.current.dispose()
        textureRef.current = null
      }
      rendererRef.current = null
      sceneRef.current = null
      meshRef.current = null
      uniformsRef.current = null
    }
  }, [])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return
    uniforms.u_speed.value = speed
    uniforms.u_contour.value = clamp01(contour)
    uniforms.u_angle.value = MathUtils.degToRad(angle)
    uniforms.u_noise.value = clamp01(noise)
    uniforms.u_glowIn.value = clamp01(glowIn)
    uniforms.u_glowOut.value = clamp01(glowOut)
    uniforms.u_scale.value = Math.max(0.1, scale)
  }, [speed, contour, angle, noise, glowIn, glowOut, scale])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return
    const { values, count } = paletteSettings
    for (let i = 0; i < MAX_COLORS; i++) {
      uniforms.u_colors.value[i].copy(values[i])
    }
    uniforms.u_colorsCount.value = count
  }, [paletteSettings])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return
    uniforms.u_colorBack.value.copy(backgroundVec)
  }, [backgroundVec])

  useEffect(() => {
    const uniforms = uniformsRef.current
    if (!uniforms) return

    const loader = new TextureLoader()
    let cancelled = false

    loader.load(
      imageUrl,
      (texture: any) => {
        if (cancelled) {
          texture.dispose()
          return
        }
        texture.wrapS = ClampToEdgeWrapping
        texture.wrapT = ClampToEdgeWrapping
        texture.needsUpdate = true

        if (textureRef.current) {
          textureRef.current.dispose()
        }
        textureRef.current = texture
        uniforms.u_image.value = texture
      },
      undefined,
      () => {
        if (cancelled) return
        if (textureRef.current) {
          textureRef.current.dispose()
          textureRef.current = null
        }
        uniforms.u_image.value = null
      }
    )

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: colorBack || "#00000000",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />
    </div>
  )
}

addPropertyControls(ThermalHeatmap, {
  image: {
    type: ControlType.Image,
    title: "Image",
  },
  speed: {
    type: ControlType.Number,
    title: "Speed",
    min: 0,
    max: 3,
    step: 0.05,
    defaultValue: 1,
  },
  contour: {
    type: ControlType.Number,
    title: "Contour",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  angle: {
    type: ControlType.Number,
    title: "Angle",
    min: 0,
    max: 360,
    step: 1,
    defaultValue: 0,
    unit: "°",
  },
  noise: {
    type: ControlType.Number,
    title: "Noise",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.05,
  },
  glowIn: {
    type: ControlType.Number,
    title: "Glow In",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  glowOut: {
    type: ControlType.Number,
    title: "Glow Out",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  scale: {
    type: ControlType.Number,
    title: "Scale",
    min: 0.1,
    max: 2,
    step: 0.05,
    defaultValue: 0.75,
  },
  colorBack: {
    type: ControlType.Color,
    title: "Base Color",
    defaultValue: "#00000000",
  },
  colors: {
    type: ControlType.Array,
    title: "Palette",
    maxCount: MAX_COLORS,
    defaultValue: defaultPalette,
    control: { type: ControlType.Color },
  },
})

ThermalHeatmap.displayName = "Thermal Heatmap (Inline)"

export default ThermalHeatmap

