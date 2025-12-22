'use client'

import React, { useRef, useEffect, useState } from 'react'

import { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, Mesh, ShaderMaterial, Vector2, LinearFilter, SRGBColorSpace, Clock, TextureLoader, IUniform } from 'three'

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [controls, setControls] = useState({
    radius: 0.10,
    blur: 2.0,
    circleBoost: 2.5,
    noiseFreq: 8.0,
    noiseStrength: 0.6,
    timeSpeed: 0.1,
    imageScale: 1.05,
    distortAmp: 0.02,
    distortFreq: 6.0,
  })
  const controlsRef = useRef(controls)
  useEffect(() => { controlsRef.current = controls }, [controls])
  const uniformsRef = useRef<any>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const imgEl = imgRef.current
    if (!canvas || !imgEl) return

    // Scene setup
    const scene = new Scene()
    const perspective = 800
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const computeFov = () => (180 * (2 * Math.atan(window.innerHeight / 2 / perspective))) / Math.PI
    const camera = new PerspectiveCamera(computeFov(), window.innerWidth / window.innerHeight, 1, 5000)
    camera.position.set(0, 0, perspective)

    const loader = new TextureLoader()
    const baseSrc = imgEl.getAttribute('src') || '/random-assets/profile-image.png'
    const hoverSrc = imgEl.getAttribute('data-hover') || '/random-assets/blue-profile-image.png'
    const baseTexture = loader.load(baseSrc, (tex : any) => {
        const w = (tex.image && tex.image.width) || 1
        const h = (tex.image && tex.image.height) || 1
        if (uniformsRef.current?.u_texResBase?.value) uniformsRef.current.u_texResBase.value.set(w, h)
      })
      const hoverTexture = loader.load(hoverSrc, (tex : any) => {
        const w = (tex.image && tex.image.width) || 1
        const h = (tex.image && tex.image.height) || 1
        if (uniformsRef.current?.u_texResHover?.value) uniformsRef.current.u_texResHover.value.set(w, h)
      })
    // Color space for modern three versions
    // @ts-ignore - guard older versions
    if (SRGBColorSpace) {
      // @ts-ignore
      baseTexture.colorSpace = SRGBColorSpace
      // @ts-ignore
      hoverTexture.colorSpace = SRGBColorSpace
    }
    baseTexture.minFilter = LinearFilter
    hoverTexture.minFilter = LinearFilter

    const uniforms: { [key: string]: IUniform } = {
        u_time: { value: 0 },
        u_image: { value: baseTexture },
        u_imagehover: { value: hoverTexture },
        u_mouse: { value: new Vector2(0.5, 0.5) },
        u_progress: { value: 0 },
        u_resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
        u_res: { value: new Vector2(window.innerWidth, window.innerHeight) },
        u_pr: { value: Math.min(window.devicePixelRatio || 1, 2) },
        u_planeRes: { value: new Vector2(1, 1) },
        u_radius: { value: controlsRef.current.radius },
        u_blur: { value: controlsRef.current.blur },
        u_circleBoost: { value: controlsRef.current.circleBoost },
        u_noiseFreq: { value: controlsRef.current.noiseFreq },
        u_noiseStrength: { value: controlsRef.current.noiseStrength },
        u_timeSpeed: { value: controlsRef.current.timeSpeed },
        u_scaleMax: { value: controlsRef.current.imageScale },
        u_distortAmp: { value: 0.0 },         // keep defined, neutralized
        u_distortFreq: { value: 0.0 },        // keep defined, unused
        u_texResBase: { value: new Vector2(1, 1) },
        u_texResHover: { value: new Vector2(1, 1) },
      }
    uniformsRef.current = uniforms

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Simplex noise (3D) adapted for GLSL1
    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform float u_time;
      uniform sampler2D u_image;
      uniform sampler2D u_imagehover;
      uniform vec2 u_mouse;
      uniform float u_progress;
      uniform vec2 u_res;
      uniform float u_pr;
      uniform vec2 u_planeRes;
      uniform float u_radius;
      uniform float u_blur;
      uniform float u_circleBoost;
      uniform float u_noiseFreq;
      uniform float u_noiseStrength;
      uniform float u_timeSpeed;
      uniform float u_scaleMax;
    //   uniform float u_distortAmp;
    //   uniform float u_distortFreq;
      uniform vec2 u_texResBase;
      uniform vec2 u_texResHover;

      // Simplex noise 3D from https://github.com/ashima/webgl-noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        // First corner
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //  x0 = x0 - 0.0 + 0.0 * C.xxx;
        //  x1 = x0 - i1  + 1.0 * C.xxx;
        //  x2 = x0 - i2  + 2.0 * C.xxx;
        //  x3 = x0 - 1.0 + 3.0 * C.xxx;
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0 * C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        // Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      // Tutorial circle implementation in centered coordinates
      float circle_tutorial(vec2 _st, float _radius, float blurriness){
        vec2 dist = _st;
        return 1.0 - smoothstep(
          _radius - (_radius * blurriness),
          _radius + (_radius * blurriness),
          dot(dist, dist) * 4.0
        );
      }

      void main() {
        // Texture coordinates
        // Distortion (small flow field) on UVs for both textures
        vec2 uv = vUv;
        // float d1 = snoise(vec3(uv * u_distortFreq, u_time * 0.25));
        // float d2 = snoise(vec3((uv + 10.0) * (u_distortFreq * 0.7), u_time * 0.23));
        // vec2 flow = vec2(d1, d2) * u_distortAmp * u_progress;
        vec2 uvDistorted = uv;

        // Plane-centered coordinates (match tutorial logic but in local plane space)
        // Rebuild st from the distorted UVs so the gooey mask is also affected
        vec2 st = vUv - vec2(0.5);
        st.y *= u_planeRes.y / u_planeRes.x;
        vec2 stDist = uvDistorted - vec2(0.5);
        stDist.y *= u_planeRes.y / u_planeRes.x;

        // Adjust mouse to plane-centered/aspect-corrected coords
        vec2 mouse = (u_mouse - vec2(0.5));
        mouse.y *= u_planeRes.y / u_planeRes.x;
        mouse *= -1.0;

        vec2 circlePos = stDist + mouse;

         // Animated noise with lateral (left-right) drift
        float offx = uvDistorted.x + (u_time * 0.1) + sin(uvDistorted.y + u_time * 0.1);
        float offy = uvDistorted.y - cos(u_time * 0.001) * 0.01;
        float n = snoise(vec3(offx * u_noiseFreq, offy * u_noiseFreq, u_time * (u_timeSpeed * 0.1))) - 1.0;

        // Circle and merge using the tutorial's parameters
        float c = circle_tutorial(circlePos, u_radius, u_blur) * u_circleBoost * u_progress;
        float finalMask = smoothstep(0.4, 0.5, (n * u_noiseStrength) + pow(c, 2.0));

        // Subtle scale on hover image
        vec2 center = vec2(0.5);
        float scale = mix(1.0, u_scaleMax, u_progress);
        vec2 uvScaled = (uvDistorted - center) / scale + center;

        // cover-fit UVs (center-crop to square plane)
        vec2 coverBase;
        {
          float planeRatio = u_planeRes.x / u_planeRes.y;
          float texRatio = u_texResBase.x / u_texResBase.y;
          vec2 s = vec2(1.0);
          if (texRatio > planeRatio) {
            s.x = texRatio / planeRatio;
          } else {
            s.y = planeRatio / texRatio;
          }
          coverBase = (uvDistorted - 0.5) * s + 0.5;
        }
        vec2 coverHover;
        {
          float planeRatio = u_planeRes.x / u_planeRes.y;
          float texRatio = u_texResHover.x / u_texResHover.y;
          vec2 s = vec2(1.0);
          if (texRatio > planeRatio) {
            s.x = texRatio / planeRatio;
          } else {
            s.y = planeRatio / texRatio;
          }
          coverHover = (uvScaled - 0.5) * s + 0.5;
        }

        vec4 img = texture2D(u_image, coverBase);
        vec4 hover = texture2D(u_imagehover, coverHover);
        vec4 color = mix(img, hover, finalMask);
        gl_FragColor = color;
      }
    `

    const geometry = new PlaneGeometry(1, 1, 1, 1)
    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    const mesh = new Mesh(geometry, material)
    scene.add(mesh)

    const sizes = new Vector2()
    const offset = new Vector2()

    const updateFromDOM = () => {
      const rect = imgEl.getBoundingClientRect()
      sizes.set(rect.width, rect.height)
      offset.set(
        rect.left + rect.width / 2 - window.innerWidth / 2,
        -(rect.top + rect.height / 2 - window.innerHeight / 2)
      )
      mesh.position.set(offset.x, offset.y, 0)
      mesh.scale.set(sizes.x, sizes.y, 1)
      uniforms.u_planeRes.value.set(rect.width, rect.height)
    }
    updateFromDOM()

    let targetProgress = 0
    let rafId = 0
    const clock = new Clock()

    const render = () => {
        rafId = requestAnimationFrame(render)
        uniforms.u_time.value += clock.getDelta()
        // Sync UI-controlled uniforms each frame (read from ref to avoid stale closure)
        const c = controlsRef.current
        uniforms.u_radius.value = c.radius
        uniforms.u_blur.value = c.blur
        uniforms.u_circleBoost.value = c.circleBoost
        uniforms.u_noiseFreq.value = c.noiseFreq
        uniforms.u_noiseStrength.value = c.noiseStrength
        uniforms.u_timeSpeed.value = c.timeSpeed
        uniforms.u_scaleMax.value = c.imageScale
        // uniforms.u_distortAmp.value = c.distortAmp
        // uniforms.u_distortFreq.value = c.distortFreq
        // ease progress
        uniforms.u_progress.value += (targetProgress - uniforms.u_progress.value) * 0.08
        renderer.render(scene, camera)
      }
    render()

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.fov = computeFov()
      camera.updateProjectionMatrix()
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight)
      uniforms.u_res.value.set(window.innerWidth, window.innerHeight)
      uniforms.u_pr.value = Math.min(window.devicePixelRatio || 1, 2)
      updateFromDOM()
    }
    window.addEventListener('resize', onResize)

    const onMove = (e: MouseEvent) => {
      const rect = imgEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      uniforms.u_mouse.value.set(
        Math.max(0.0, Math.min(1.0, x)),
        Math.max(0.0, Math.min(1.0, y))
      )
    }
    const onEnter = () => { targetProgress = 1 }
    const onLeave = () => { targetProgress = 0 }

    imgEl.addEventListener('mousemove', onMove)
    imgEl.addEventListener('mouseenter', onEnter)
    imgEl.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      imgEl.removeEventListener('mousemove', onMove)
      imgEl.removeEventListener('mouseenter', onEnter)
      imgEl.removeEventListener('mouseleave', onLeave)
      geometry.dispose()
      material.dispose()
      baseTexture.dispose()
      hoverTexture.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className="page">
      <section className="container">
        <article className="tile">
          <figure className="tile__figure">
            <img
              ref={imgRef}
              src="/random-assets/profile-image.png"
              data-hover="/random-assets/blue-profile-image.png"
              className="tile__image"
              alt="Profile"
            />
          </figure>
        </article>
      </section>
      <canvas ref={canvasRef} id="stage" />
      <div className="ui">
        <h4>Gooey Controls</h4>
        <label>
          Radius: {controls.radius.toFixed(3)}
          <input type="range" min={0.02} max={0.35} step={0.005}
            value={controls.radius}
            onChange={(e) => setControls(c => ({ ...c, radius: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Blur: {controls.blur.toFixed(2)}
          <input type="range" min={0.2} max={3.0} step={0.05}
            value={controls.blur}
            onChange={(e) => setControls(c => ({ ...c, blur: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Circle Boost: {controls.circleBoost.toFixed(2)}
          <input type="range" min={0.5} max={4.0} step={0.05}
            value={controls.circleBoost}
            onChange={(e) => setControls(c => ({ ...c, circleBoost: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Noise Freq: {controls.noiseFreq.toFixed(2)}
          <input type="range" min={2.0} max={16.0} step={0.25}
            value={controls.noiseFreq}
            onChange={(e) => setControls(c => ({ ...c, noiseFreq: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Noise Strength: {controls.noiseStrength.toFixed(2)}
          <input type="range" min={0.0} max={3.0} step={0.02}
            value={controls.noiseStrength}
            onChange={(e) => setControls(c => ({ ...c, noiseStrength: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Time Speed: {controls.timeSpeed.toFixed(2)}
          <input type="range" min={0.02} max={5.6} step={0.01}
            value={controls.timeSpeed}
            onChange={(e) => setControls(c => ({ ...c, timeSpeed: parseFloat(e.target.value)}))} />
        </label>
        <label>
          Image Scale: {controls.imageScale.toFixed(2)}
          <input type="range" min={1.0} max={1.5} step={0.01}
            value={controls.imageScale}
            onChange={(e) => setControls(c => ({ ...c, imageScale: parseFloat(e.target.value) }))} />
        </label>
        {/* <label>
          Distort Amp: {controls.distortAmp.toFixed(3)}
          <input type="range" min={0.0} max={0.08} step={0.002}
            value={controls.distortAmp}
            onChange={(e) => setControls(c => ({ ...c, distortAmp: parseFloat(e.target.value) }))} />
        </label>
        <label>
          Distort Freq: {controls.distortFreq.toFixed(1)}
          <input type="range" min={1.0} max={14.0} step={0.5}
            value={controls.distortFreq}
            onChange={(e) => setControls(c => ({ ...c, distortFreq: parseFloat(e.target.value) }))} />
        </label> */}
      </div>
      <style jsx>{`
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100vh;
          z-index: 10;
          position: relative;
        }
        .tile { width: 35vw; max-width: 560px; flex: 0 0 auto; }
        /* Keep the DOM image for sizing and mouse events, but make it invisible so the canvas is visible */
        .tile__image { width: 100%; aspect-ratio: 1 / 1; height: auto; object-fit: cover; object-position: center; display:block; opacity: 0; }
        #stage { position: fixed; left: 0; top: 0; width: 100%; height: 100vh; z-index: 9; pointer-events: none; }
        .ui { position: fixed; right: 16px; top: 16px; z-index: 20; background: rgba(20,20,20,0.75); color: #fff; padding: 12px 14px; border-radius: 8px; width: 260px; font-family: ui-sans-serif, system-ui, -apple-system; }
        .ui h4 { margin: 0 0 8px; font-weight: 600; font-size: 13px; letter-spacing: .02em; opacity: .9; }
        .ui label { display: block; font-size: 12px; margin: 8px 0; }
        .ui input[type="range"] { width: 100%; }
      `}</style>
    </div>
  )
}
