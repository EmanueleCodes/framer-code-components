import React, { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Three.js subset from Framer University bundle (keeps component self-contained for Framer)
import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    Mesh,
    BufferAttribute,
    BufferGeometry,
    RawShaderMaterial,
} from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/wave-prism-1.js"

type LaserProps = {
    preview?: boolean
    color?: string
    backgroundColor?: string
    // Positioning
    beamX?: number
    beamY?: number
    // Dynamics (Flow)
    dynamics?: { speed?: number; strength?: number }
    fadeDuration?: number
    // Sizing
    verticalSize?: number
    horizontalSize?: number
    // Fog
    fog?: { intensity?: number; scale?: number; fall?: number }
    // Wisps
    wisps?: { density?: number; speed?: number; intensity?: number }
    // Falloff shaping
    decay?: number
    falloffStart?: number
    // Optional style
    style?: React.CSSProperties
}

// Value mapping helpers (see how-to-build-framer-components/mappingValues.md)
function mapLinear(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    if (inMax === inMin) return outMin
    const t = (value - inMin) / (inMax - inMin)
    return outMin + t * (outMax - outMin)
}

// UI → internal mappings (picked to expose friendly sliders while preserving reference defaults)
const mapFlowSpeed = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.1, 1.0)
const mapFlowStrength = (ui: number) => mapLinear(ui, 0, 1, 0, 1)
const mapVerticalSize = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.8, 3.0)
const mapHorizontalSize = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.2, 2.0)
const mapFogIntensity = (ui: number) => mapLinear(ui, 0, 1, 0, 1.0) // shader multiplies for browser balancing
const mapFogScale = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.1, 1.0)
const mapFogFallSpeed = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.1, 1.2)
const mapWispDensity = (ui: number) => mapLinear(ui, 0, 2, 0, 2)
const mapWispSpeed = (ui: number) => mapLinear(ui, 0.1, 1.0, 5.0, 25.0)
const mapWispIntensity = (ui: number) => mapLinear(ui, 0.1, 1.0, 1.0, 10.0)
const mapDecay = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.7, 1.8)
const mapFalloffStart = (ui: number) => mapLinear(ui, 0.1, 1.0, 0.5, 2.0)

// Color parsing utilities (support hex, rgba(), and token var())
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

    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }

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

// GLSL (ported from the reference implementation)
const VERT = `
precision highp float;
attribute vec3 position;
void main(){
  gl_Position = vec4(position, 1.0);
}`

const FRAG = `
#ifdef GL_ES
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
precision mediump int;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform float uWispDensity;
uniform float uTiltScale;
uniform float uFlowTime;
uniform float uFogTime;
uniform float uBeamXFrac;
uniform float uBeamYFrac;
uniform float uFlowSpeed;
uniform float uVLenFactor;
uniform float uHLenFactor;
uniform float uFogIntensity;
uniform float uFogScale;
uniform float uWSpeed;
uniform float uWIntensity;
uniform float uFlowStrength;
uniform float uDecay;
uniform float uFalloffStart;
uniform float uFogFallSpeed;
uniform vec3 uColor;
uniform float uFade;
uniform vec4 uBgColor; // rgba background from controls (a==0 => keep canvas transparent)

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define EPS 1e-6
#define EDGE_SOFT (DT_LOCAL*4.0)
#define DT_LOCAL 0.0038
#define TAP_RADIUS 6
#define R_H 150.0
#define R_V 150.0
#define FLARE_HEIGHT 16.0
#define FLARE_AMOUNT 8.0
#define FLARE_EXP 2.0
#define TOP_FADE_START 0.1
#define TOP_FADE_EXP 1.0
#define FLOW_PERIOD 0.5
#define FLOW_SHARPNESS 1.5

#define W_BASE_X 1.5
#define W_LAYER_GAP 0.25
#define W_LANES 10
#define W_SIDE_DECAY 0.5
#define W_HALF 0.01
#define W_AA 0.15
#define W_CELL 20.0
#define W_SEG_MIN 0.01
#define W_SEG_MAX 0.55
#define W_CURVE_AMOUNT 15.0
#define W_CURVE_RANGE (FLARE_HEIGHT - 3.0)
#define W_BOTTOM_EXP 10.0

#define FOG_ON 1
#define FOG_CONTRAST 1.2
#define FOG_SPEED_U 0.1
#define FOG_SPEED_V -0.1
#define FOG_OCTAVES 5
#define FOG_BOTTOM_BIAS 0.8
#define FOG_TILT_TO_MOUSE 0.05
#define FOG_TILT_DEADZONE 0.01
#define FOG_TILT_MAX_X 0.35
#define FOG_TILT_SHAPE 1.5
#define FOG_BEAM_MIN 0.0
#define FOG_BEAM_MAX 0.75
#define FOG_MASK_GAMMA 0.5
#define FOG_EXPAND_SHAPE 12.2
#define FOG_EDGE_MIX 0.5

#define HFOG_EDGE_START 0.20
#define HFOG_EDGE_END 0.98
#define HFOG_EDGE_GAMMA 1.4
#define HFOG_Y_RADIUS 25.0
#define HFOG_Y_SOFT 60.0

#define EDGE_X0 0.22
#define EDGE_X1 0.995
#define EDGE_X_GAMMA 1.25
#define EDGE_LUMA_T0 0.0
#define EDGE_LUMA_T1 2.0
#define DITHER_STRENGTH 1.0

float g(float x){return x<=0.00031308?12.92*x:1.055*pow(x,1.0/2.4)-0.055;}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+34.123);return fract(p.x*p.y);} 
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  float a=h21(i),b=h21(i+vec2(1,0)),c=h21(i+vec2(0,1)),d=h21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm2(vec2 p){
  float v=0.0,amp=0.6; mat2 m=mat2(0.86,0.5,-0.5,0.86);
  for(int i=0;i<FOG_OCTAVES;++i){v+=amp*vnoise(p); p=m*p*2.03+17.1; amp*=0.52;}
  return v;
}
float rGate(float x,float l){float a=smoothstep(0.0,0.01,x),b=1.0-smoothstep(l,l+0.01,x);return max(0.0,a*b);} 
float tri01(float x){float f=fract(x);return 1.0-abs(f*2.0-1.0);} 
float tauWf(float t,float tmin,float tmax){float a=smoothstep(tmin,tmin+EDGE_SOFT,t),b=1.0-smoothstep(tmax-EDGE_SOFT,tmax,t);return max(0.0,a*b);} 
float flareY(float y){float t=clamp(1.0-(clamp(y,0.0,FLARE_HEIGHT)/max(FLARE_HEIGHT,1e-6)),0.0,1.0);return pow(t,FLARE_EXP);} 

float bs(vec2 p,vec2 q,float powr){float d=distance(p,q),f=powr*uFalloffStart,r=(f*f)/(d*d+1e-6);return powr*min(1.0,r);} 
float bsa(vec2 p,vec2 q,float powr,vec2 s){vec2 d=p-q; float dd=(d.x*d.x)/(s.x*s.x)+(d.y*d.y)/(s.y*s.y),f=powr*uFalloffStart,r=(f*f)/(dd+1e-6);return powr*min(1.0,r);} 

float vWisps(vec2 uv,float topF){
  float y=uv.y,yf=(y+uFlowTime*uWSpeed)/W_CELL;
  float dRaw=clamp(uWispDensity,0.0,2.0),d=dRaw<=0.0?1.0:dRaw;
  float lanesF=floor(float(W_LANES)*min(d,1.0)+0.5);
  int lanes=int(max(1.0,lanesF));
  float sp=min(d,1.0),ep=max(d-1.0,0.0);
  float fm=flareY(max(y,0.0)),rm=clamp(1.0-(y/max(W_CURVE_RANGE,1e-6)),0.0,1.0),cm=fm*rm;
  const float G=0.05; float xS=1.0+(FLARE_AMOUNT*15.0*G)*cm;
  float sPix=clamp(y/R_V,0.0,1.0),bGain=pow(1.0-sPix,W_BOTTOM_EXP),sum=0.0;
  for(int s=0;s<2;++s){
    float sgn=s==0?-1.0:1.0;
    for(int i=0;i<W_LANES;++i){
      if(i>=lanes) break;
      float off=W_BASE_X+float(i)*W_LAYER_GAP,xc=sgn*(off*xS);
      float dx=abs(uv.x-xc),lat=1.0-smoothstep(W_HALF,W_HALF+W_AA,dx),amp=exp(-off*W_SIDE_DECAY);
      float seed=h21(vec2(off,sgn*17.0)),yf2=yf+seed*7.0,ci=floor(yf2),fy=fract(yf2);
      float seg=mix(W_SEG_MIN,W_SEG_MAX,h21(vec2(ci,off*2.3)));
      float spR=h21(vec2(ci,off+sgn*31.0)),seg1=rGate(fy,seg)*step(spR,sp);
      if(ep>0.0){float spR2=h21(vec2(ci*3.1+7.0,off*5.3+sgn*13.0)); float f2=fract(fy+0.5); seg1+=rGate(f2,seg*0.9)*step(spR2,ep);} 
      sum+=amp*lat*seg1;
    }
  }
  float span=smoothstep(-3.0,0.0,y)*(1.0-smoothstep(R_V-6.0,R_V,y));
  return uWIntensity*sum*topF*bGain*span;
}

void mainImage(out vec4 fc,in vec2 frag){
  vec2 C=iResolution.xy*.5; float invW=1.0/max(C.x,1.0);
  float sc=512.0/iResolution.x*.4;
  vec2 uv=(frag-C)*sc,off=vec2(uBeamXFrac*iResolution.x*sc,uBeamYFrac*iResolution.y*sc);
  vec2 uvc = uv - off;
  float a=0.0,b=0.0;
  float basePhase=1.5*PI+uDecay*.5; float tauMin=basePhase-uDecay; float tauMax=basePhase;
  float cx=clamp(uvc.x/(R_H*uHLenFactor),-1.0,1.0),tH=clamp(TWO_PI-acos(cx),tauMin,tauMax);
  for(int k=-TAP_RADIUS;k<=TAP_RADIUS;++k){
    float tu=tH+float(k)*DT_LOCAL,wt=tauWf(tu,tauMin,tauMax); if(wt<=0.0) continue;
    float spd=max(abs(sin(tu)),0.02),u=clamp((basePhase-tu)/max(uDecay,1e-6),0.0,1.0),env=pow(1.0-abs(u*2.0-1.0),0.8);
    vec2 p=vec2((R_H*uHLenFactor)*cos(tu),0.0);
    a+=wt*bs(uvc,p,env*spd);
  }
  float yPix=uvc.y,cy=clamp(-yPix/(R_V*uVLenFactor),-1.0,1.0),tV=clamp(TWO_PI-acos(cy),tauMin,tauMax);
  for(int k=-TAP_RADIUS;k<=TAP_RADIUS;++k){
    float tu=tV+float(k)*DT_LOCAL,wt=tauWf(tu,tauMin,tauMax); if(wt<=0.0) continue;
    float yb=(-R_V)*cos(tu),s=clamp(yb/R_V,0.0,1.0),spd=max(abs(sin(tu)),0.02);
    float env=pow(1.0-s,0.6)*spd;
    float cap=1.0-smoothstep(TOP_FADE_START,1.0,s); cap=pow(cap,TOP_FADE_EXP); env*=cap;
    float ph=s/max(FLOW_PERIOD,1e-6)+uFlowTime*uFlowSpeed;
    float fl=pow(tri01(ph),FLOW_SHARPNESS);
    env*=mix(1.0-uFlowStrength,1.0,fl);
    float yp=(-R_V*uVLenFactor)*cos(tu),m=pow(smoothstep(FLARE_HEIGHT,0.0,yp),FLARE_EXP),wx=1.0+FLARE_AMOUNT*m;
    vec2 sig=vec2(wx,1.0),p=vec2(0.0,yp);
    float mask=step(0.0,yp);
    b+=wt*bsa(uvc,p,mask*env,sig);
  }
  float sPix=clamp(yPix/R_V,0.0,1.0),topA=pow(1.0-smoothstep(TOP_FADE_START,1.0,sPix),TOP_FADE_EXP);
  float L=a+b*topA;
  float w=vWisps(vec2(uvc.x,yPix),topA);
  float fog=0.0;
#if FOG_ON
  vec2 fuv=uvc*uFogScale;
  float mAct=step(1.0,length(iMouse.xy)),nx=((iMouse.x-C.x)*invW)*mAct;
  float ax = abs(nx);
  float stMag = mix(ax, pow(ax, FOG_TILT_SHAPE), 0.35);
  float st = sign(nx) * stMag * uTiltScale;
  st = clamp(st, -FOG_TILT_MAX_X, FOG_TILT_MAX_X);
  vec2 dir=normalize(vec2(st,1.0));
  fuv+=uFogTime*uFogFallSpeed*dir;
  vec2 prp=vec2(-dir.y,dir.x);
  fuv+=prp*(0.08*sin(dot(uvc,prp)*0.08+uFogTime*0.9));
  float n=fbm2(fuv+vec2(fbm2(fuv+vec2(7.3,2.1)),fbm2(fuv+vec2(-3.7,5.9)))*0.6);
  n=pow(clamp(n,0.0,1.0),FOG_CONTRAST);
  float pixW = 1.0 / max(iResolution.y, 1.0);
#ifdef GL_OES_standard_derivatives
  float wL = max(fwidth(L), pixW);
#else
  float wL = pixW;
#endif
  float m0=pow(smoothstep(FOG_BEAM_MIN - wL, FOG_BEAM_MAX + wL, L),FOG_MASK_GAMMA);
  float bm=1.0-pow(1.0-m0,FOG_EXPAND_SHAPE); bm=mix(bm*m0,bm,FOG_EDGE_MIX);
  float yP=1.0-smoothstep(HFOG_Y_RADIUS,HFOG_Y_RADIUS+HFOG_Y_SOFT,abs(yPix));
  float nxF=abs((frag.x-C.x)*invW),hE=1.0-smoothstep(HFOG_EDGE_START,HFOG_EDGE_END,nxF); hE=pow(clamp(hE,0.0,1.0),HFOG_EDGE_GAMMA);
  float hW=mix(1.0,hE,clamp(yP,0.0,1.0));
  float bBias=mix(1.0,1.0-sPix,FOG_BOTTOM_BIAS);
  float browserFogIntensity = uFogIntensity * 1.8;
  float radialFade = 1.0 - smoothstep(0.0, 0.7, length(uvc) / 120.0);
  float safariFog = n * browserFogIntensity * bBias * bm * hW * radialFade;
  fog = safariFog;
#endif
  float LF=L+fog;
  float dith=(h21(frag)-0.5)*(DITHER_STRENGTH/255.0);
  float tone=g(LF+w);
  vec3 col=tone*uColor+dith;
  float alpha=clamp(g(L+w*0.6)+dith*0.6,0.0,1.0);
  float nxE=abs((frag.x-C.x)*invW),xF=pow(clamp(1.0-smoothstep(EDGE_X0,EDGE_X1,nxE),0.0,1.0),EDGE_X_GAMMA);
  float scene=LF+max(0.0,w)*0.5,hi=smoothstep(EDGE_LUMA_T0,EDGE_LUMA_T1,scene);
  float eM=mix(xF,1.0,hi);
  col*=eM; alpha*=eM;
  col*=uFade; alpha*=uFade;
  // Layer the beam (alpha) over a translucent background color (bgA)
  // Straight alpha compositing: out = beam over bg, bg over transparent
  float bgA = clamp(uBgColor.a, 0.0, 1.0);
  float effA = clamp(alpha, 0.0, 1.0);
  vec3 bgRGB = uBgColor.rgb;
  vec3 effRGB = col;
  float outA = effA + bgA * (1.0 - effA);
  vec3 outRGB = (effRGB * effA + bgRGB * bgA * (1.0 - effA)) / max(outA, 1e-6);
  fc = vec4(outRGB, outA);
}

void main(){
  vec4 fc;
  mainImage(fc, gl_FragCoord.xy);
  gl_FragColor = fc;
}`

type Uniform<T> = { value: T }
type LaserUniforms = {
    iTime: Uniform<number>
    iResolution: Uniform<[number, number, number]>
    iMouse: Uniform<[number, number, number, number]>
    uWispDensity: Uniform<number>
    uTiltScale: Uniform<number>
    uFlowTime: Uniform<number>
    uFogTime: Uniform<number>
    uBeamXFrac: Uniform<number>
    uBeamYFrac: Uniform<number>
    uFlowSpeed: Uniform<number>
    uVLenFactor: Uniform<number>
    uHLenFactor: Uniform<number>
    uFogIntensity: Uniform<number>
    uFogScale: Uniform<number>
    uWSpeed: Uniform<number>
    uWIntensity: Uniform<number>
    uFlowStrength: Uniform<number>
    uDecay: Uniform<number>
    uFalloffStart: Uniform<number>
    uFogFallSpeed: Uniform<number>
    uColor: Uniform<[number, number, number]>
    uFade: Uniform<number>
    uBgColor: Uniform<[number, number, number, number]>
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 500
 * @framerDisableUnlink
 */
export default function HulyLaser({
    preview = false,
    color = "#FF79C6",
    backgroundColor,
    beamX = 0.1,
    beamY = 0.0,
    dynamics = { speed: 0.35, strength: 0.25 },
    fadeDuration = 1.0,
    verticalSize = 0.9,
    horizontalSize = 0.4,
    fog = { intensity: 0.45, scale: 0.3, fall: 0.6 },
    wisps = { density: 1.0, speed: 0.6, intensity: 0.6 },
    decay = 0.6,
    falloffStart = 0.6,
    style,
}: LaserProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    type MinimalRenderer = {
        domElement: HTMLCanvasElement
        setSize: (w: number, h: number, updateStyle: boolean) => void
        render: (scene: unknown, camera: unknown) => void
        dispose: () => void
    }
    const rendererRef = useRef<MinimalRenderer | null>(null)
    const uniformsRef = useRef<LaserUniforms | null>(null)
    const rafRef = useRef<number | null>(null)
    const lastTimeRef = useRef<number>(0)
    const fadeRef = useRef<number>(0)
    const fadeElapsedRef = useRef<number>(0)
    const rectRef = useRef<DOMRect | null>(null)
    const previewRef = useRef<boolean>(preview)
    const fadeDurationRef = useRef<number>(fadeDuration)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const renderer = new WebGLRenderer({
            antialias: false,
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
        })
        rendererRef.current = renderer

        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.display = "block"
        container.appendChild(canvas)

        const scene = new Scene()
        const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

        // Fullscreen triangle (2 triangles) covering clipspace
        const geometry = new BufferGeometry()
        const positions = new Float32Array([
            -1, -1, 0,
            3, -1, 0,
            -1, 3, 0,
        ])
        geometry.setAttribute("position", new BufferAttribute(positions, 3))

        const uniforms: LaserUniforms = {
            iTime: { value: 0 },
            iResolution: { value: [1, 1, 1] },
            iMouse: { value: [0, 0, 0, 0] },
            uWispDensity: { value: mapWispDensity(wisps?.density ?? 1.0) },
            uTiltScale: { value: 0.01 }, // Fixed tilt scale
            uFlowTime: { value: 0 },
            uFogTime: { value: 0 },
            uBeamXFrac: { value: beamX },
            uBeamYFrac: { value: beamY },
            uFlowSpeed: { value: mapFlowSpeed(dynamics?.speed ?? 0.35) },
            uVLenFactor: { value: mapVerticalSize(verticalSize) },
            uHLenFactor: { value: mapHorizontalSize(horizontalSize) },
            uFogIntensity: { value: mapFogIntensity(fog?.intensity ?? 0.45) },
            uFogScale: { value: mapFogScale(fog?.scale ?? 0.3) },
            uWSpeed: { value: mapWispSpeed(wisps?.speed ?? 0.6) },
            uWIntensity: { value: mapWispIntensity(wisps?.intensity ?? 0.6) },
            uFlowStrength: { value: mapFlowStrength(dynamics?.strength ?? 0.25) },
            uDecay: { value: mapDecay(decay) },
            uFalloffStart: { value: mapFalloffStart(falloffStart) },
            uFogFallSpeed: { value: mapFogFallSpeed(fog?.fall ?? 0.6) },
            uColor: { value: [1, 1, 1] },
            uFade: { value: 0 },
            uBgColor: { value: [0, 0, 0, 0] },
        }
        uniformsRef.current = uniforms

        const material = new RawShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms: uniforms as unknown as Record<string, Uniform<unknown>>,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        const mesh = new Mesh(geometry, material)
        mesh.frustumCulled = false
        scene.add(mesh)

        // Size/Resolution
        const setSizeNow = () => {
            const w = Math.max(container.clientWidth, 1)
            const h = Math.max(container.clientHeight, 1)
            renderer.setSize(w, h, false)
            uniforms.iResolution.value = [w, h, 1]
            rectRef.current = canvas.getBoundingClientRect()
            // Render one frame so Canvas mode with preview off still shows a snapshot
            renderer.render(scene, camera)
        }
        let resizeRaf = 0
        const scheduleResize = () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf)
            resizeRaf = requestAnimationFrame(setSizeNow)
        }
        const ro = new ResizeObserver(scheduleResize)
        ro.observe(container)
        setSizeNow()

        // Mouse tracking for fog tilt effect (simplified)
        const updateMouse = (clientX: number, clientY: number) => {
            const rect = rectRef.current
            if (!rect) return
            const x = clientX - rect.left
            const y = clientY - rect.top
            uniforms.iMouse.value = [x, rect.height - y, 0, 0]
        }
        const onMove = (ev: PointerEvent | MouseEvent) => updateMouse(ev.clientX, ev.clientY)
        canvas.addEventListener("pointermove", onMove as any, { passive: true })
        canvas.addEventListener("pointerdown", onMove as any, { passive: true })
        canvas.addEventListener("pointerenter", onMove as any, { passive: true })
        canvas.addEventListener("pointerleave", () => {
            uniforms.iMouse.value = [0, 0, 0, 0]
        }, { passive: true })

        const animate = () => {
            rafRef.current = requestAnimationFrame(animate)

            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const shouldAnimate = !(isCanvas && !previewRef.current)

            const now = performance.now() * 0.001
            const dt = Math.min(0.033, Math.max(0.001, now - lastTimeRef.current))
            lastTimeRef.current = now

            // Fade-in driven by real elapsed time; paused when not animating
            if (fadeRef.current < 1) {
                const dur = Math.max(0, fadeDurationRef.current)
                if (dur === 0) {
                    fadeElapsedRef.current = 0
                    fadeRef.current = 1
                } else {
                    if (shouldAnimate) {
                        fadeElapsedRef.current = Math.min(
                            dur,
                            fadeElapsedRef.current + dt
                        )
                    }
                    fadeRef.current = Math.min(1, fadeElapsedRef.current / dur)
                }
                uniforms.uFade.value = fadeRef.current
            }

            // Time uniforms - only update when animating
            if (shouldAnimate) {
                uniforms.iTime.value = now
                uniforms.uFlowTime.value += dt
                uniforms.uFogTime.value += dt
            }

            // Always render (static frame when preview is off)
            renderer.render(scene, camera)
        }
        animate()

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            ro.disconnect()
            canvas.removeEventListener("pointermove", onMove as any)
            canvas.removeEventListener("pointerdown", onMove as any)
            canvas.removeEventListener("pointerenter", onMove as any)
            canvas.removeEventListener("pointerleave", () => {})
            geometry.dispose()
            material.dispose()
            renderer.dispose()
            if (container.contains(canvas)) container.removeChild(canvas)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Prop updates → uniforms
    useEffect(() => {
        const uniforms = uniformsRef.current
        if (!uniforms) return

        // Color: resolve tokens/rgba/hex to linear RGB and update uniform
        const resolved = resolveTokenColor(color as any)
        const rgba = parseColorToRgba(typeof resolved === "string" ? resolved : "#FFFFFF")
        uniforms.uColor.value = [rgba.r, rgba.g, rgba.b]

        // Background color: when alpha==0 keep canvas transparent, otherwise composite in-shader
        // If background is not provided, keep canvas fully transparent
        if (typeof backgroundColor === "string" && backgroundColor.trim() !== "") {
            const resolvedBg = resolveTokenColor(backgroundColor as any)
            const bg = parseColorToRgba(typeof resolvedBg === "string" ? resolvedBg : "")
            uniforms.uBgColor.value = [bg.r, bg.g, bg.b, bg.a]
        } else {
            uniforms.uBgColor.value = [0, 0, 0, 0]
        }

        // Mapped values
        uniforms.uWispDensity.value = mapWispDensity(wisps?.density ?? 1.0)
        uniforms.uBeamXFrac.value = beamX
        uniforms.uBeamYFrac.value = beamY
        uniforms.uFlowSpeed.value = mapFlowSpeed(dynamics?.speed ?? 0.35)
        uniforms.uVLenFactor.value = mapVerticalSize(verticalSize)
        uniforms.uHLenFactor.value = mapHorizontalSize(horizontalSize)
        uniforms.uFogIntensity.value = mapFogIntensity(fog?.intensity ?? 0.45)
        uniforms.uFogScale.value = mapFogScale(fog?.scale ?? 0.3)
        uniforms.uWSpeed.value = mapWispSpeed(wisps?.speed ?? 0.6)
        uniforms.uWIntensity.value = mapWispIntensity(wisps?.intensity ?? 0.6)
        uniforms.uFlowStrength.value = mapFlowStrength(dynamics?.strength ?? 0.25)
        uniforms.uDecay.value = mapDecay(decay)
        uniforms.uFalloffStart.value = mapFalloffStart(falloffStart)
        uniforms.uFogFallSpeed.value = mapFogFallSpeed(fog?.fall ?? 0.6)
    }, [
        color,
        backgroundColor,
        wisps,
        beamX,
        beamY,
        dynamics,
        verticalSize,
        horizontalSize,
        fog,
        decay,
        falloffStart,
        // no direct dep: fall is inside fog object
    ])

    // Keep a live ref of preview like ShaderLines (no re-init)
    useEffect(() => {
        previewRef.current = preview
    }, [preview])

    // Keep fade duration live without re-init
    useEffect(() => {
        fadeDurationRef.current = fadeDuration
        // If duration changes while mid-fade, remap progress to the new scale based on elapsed seconds
        const oldDur = Math.max(0.000001, fadeDurationRef.current)
        const newDur = Math.max(0.000001, fadeDuration)
        const progress = fadeRef.current
        fadeElapsedRef.current = progress * newDur
    }, [fadeDuration])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                display: "block",
                margin: 0,
                padding: 0,
                ...style,
            }}
        />
    )
}

// Property Controls
addPropertyControls(HulyLaser, {
    // Preview first
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    fadeDuration: {
        type: ControlType.Number,
        title: "Fade In",
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 1.0,
        unit:"s"
    },

    // Color
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#FFB296" as unknown as string,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        optional: true,
    },
    // Positioning
    beamX: {
        type: ControlType.Number,
        title: "Beam X",
        min: -0.5,
        max: 0.5,
        step: 0.01,
        defaultValue: 0,
    },
    beamY: {
        type: ControlType.Number,
        title: "Beam Y",
        min: -0.5,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.0,
    },

    // Sizing
    verticalSize: {
        type: ControlType.Number,
        title: "Height",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.9,
    },
    horizontalSize: {
        type: ControlType.Number,
        title: "Width",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.75,
    },

    // Dynamics (group)
    dynamics: {
        type: ControlType.Object,
        title: "Dynamics",
        controls: {
            speed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.35,
            },
            strength: {
                type: ControlType.Number,
                title: "Strength",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.25,
            },
        },
    },

    // Fog (group)
    fog: {
        type: ControlType.Object,
        title: "Fog",
        controls: {
            intensity: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0,
                max: 1,
                step: 0.05,
                defaultValue: 0.45,
            },
            scale: {
                type: ControlType.Number,
                title: "Scale",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.3,
            },
            fall: {
                type: ControlType.Number,
                title: "Fall",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.6,
            },
        },
    },

    // Wisps (group)
    wisps: {
        type: ControlType.Object,
        title: "Wisps",
        description:
                    "More components at [Framer University](https://frameruni.link/cc).",
        controls: {
            density: {
                type: ControlType.Number,
                title: "Density",
                min: 0,
                max: 2,
                step: 0.05,
                defaultValue: 1.0,
            },
            speed: {
                type: ControlType.Number,
                title: "Speed",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.6,
            },
            intensity: {
                type: ControlType.Number,
                title: "Intensity",
                min: 0.1,
                max: 1,
                step: 0.05,
                defaultValue: 0.6,
                
            },
        },
    },
    
})

HulyLaser.displayName = "Huly Laser"


