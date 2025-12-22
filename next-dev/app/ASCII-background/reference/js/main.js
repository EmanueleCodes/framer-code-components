import { Camera, Mesh, Plane, Program, Renderer, RenderTarget } from 'ogl';
import { resolveLygia } from 'resolve-lygia';
import { Pane } from 'tweakpane';

import vertex from '../shaders/vertex.glsl?raw';
import fragment from '../shaders/fragment.glsl?raw';
import asciiVertex from '../shaders/ascii-vertex.glsl?raw';
import asciiFragment from '../shaders/ascii-fragment.glsl?raw';

const renderer = new Renderer();
const gl = renderer.gl;
document.body.appendChild(gl.canvas);

const camera = new Camera(gl, { near: 0.1, far: 100 });
camera.position.set(0, 0, 3);

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
};
window.addEventListener('resize', resize);
resize();

// Setup Perlin noise shader
const perlinProgram = new Program(gl, {
  vertex,
  fragment: resolveLygia(fragment),
  uniforms: {
    uTime: { value: 0 },
    uFrequency: { value: 5.0 },
    uBrightness: { value: 0.5 },
    uSpeed: { value: 0.75 },
    uValue: { value: 0.4 }  // Start with a lower lightness value
  }
});

const perlinMesh = new Mesh(gl, {
  geometry: new Plane(gl, { width: 2, height: 2 }),
  program: perlinProgram,
});

const renderTarget = new RenderTarget(gl);

// Setup ASCII shader
const asciiProgram = new Program(gl, {
  vertex: asciiVertex,
  fragment: asciiFragment,
  uniforms: {
    uResolution: { value: [gl.canvas.width, gl.canvas.height] },
    uTexture: { value: renderTarget.texture },
  }
});

const asciiMesh = new Mesh(gl, {
  geometry: new Plane(gl, { width: 2, height: 2 }),
  program: asciiProgram,
});

// Setup tweakpane controls
const pane = new Pane();
pane.addBinding(perlinProgram.uniforms.uFrequency, 'value', { min: 0, max: 10, label: 'Frequency' });
pane.addBinding(perlinProgram.uniforms.uSpeed, 'value', { min: 0, max: 2, label: 'Speed' });
pane.addBinding(perlinProgram.uniforms.uValue, 'value', { min: 0, max: 1, label: 'Lightness' });

// Set up frame rate limiting
let lastTime = 0;
const frameRate = 30; // Target frame rate in frames per second
const frameInterval = 1000 / frameRate;

function update(time) {
  requestAnimationFrame(update);

  // Only update if enough time has passed since the last frame
  if (time - lastTime < frameInterval) return;
  lastTime = time;

  // Rendering code
  const elapsedTime = time * 0.001;
  perlinProgram.uniforms.uTime.value = elapsedTime;

  // Render Perlin noise to render target
  renderer.render({ scene: perlinMesh, camera, target: renderTarget });

  // Render ASCII shader to screen
  asciiProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  renderer.render({ scene: asciiMesh, camera });
}

// Start the render loop
requestAnimationFrame(update);
