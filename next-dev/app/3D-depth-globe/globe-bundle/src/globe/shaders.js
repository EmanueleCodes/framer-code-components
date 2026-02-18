export const pointVertexShader = `
  attribute vec3 direction;
  attribute float elevation;
  attribute float land;

  uniform float uRadius;
  uniform float uScale;
  uniform float uTime;
  uniform float uAnimate;

  varying float vElevation;
  varying float vLand;
  varying float vPhase;
  varying vec3 vNormal;

  void main() {
    vElevation = elevation;
    vLand = land;
    vNormal = normalize(direction);

    float baseRadius = uRadius + elevation * uScale * 0.84;
    float targetRadius = uRadius + elevation * uScale;
    float distance = targetRadius - baseRadius;

    float hash = fract(sin(dot(direction, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float offset = fract(hash + elevation * 0.36);
    float phase = fract(uTime / 3.6 + offset);
    vPhase = phase;

    float easedT = phase * phase * (3.0 - phase * 2.1);

    float wobbleAmount = 0.006;
    float elevationWobbleScale = 1.0 + elevation * 3.0;
    vec3 wobbleAxis = normalize(
      cross(direction, vec3(0.3, 1.0, 0.3)) +
      cross(direction, vec3(1.0, 0.3, 0.3))
    );
    float wobbleSignal = sin(uTime * 3.0 + hash * 6.0);
    float wobbleEnvelope = easedT * (1.0 - easedT);
    vec3 wobble = wobbleAxis * wobbleSignal * wobbleEnvelope * wobbleAmount * elevationWobbleScale * land;

    float wobbledRadius = baseRadius + distance * easedT;
    vec3 wobbledPosition = vec3(wobbledRadius) + wobble;
    vec3 targetRadiusVec = vec3(targetRadius);
    vec3 animatedPosition = targetRadiusVec + (wobbledPosition - targetRadiusVec) * uAnimate;
    vec3 worldPosition = animatedPosition * direction;

    vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = max(0.65, 1.2 * (4.0 / -mvPosition.z));
  }
`;

export const pointFragmentShader = `
  uniform vec3 uLandColor;
  uniform vec3 uWaterColor;
  uniform float uBlendFactor;
  uniform float uTime;
  uniform float uAnimate;

  varying float vElevation;
  varying float vLand;
  varying float vPhase;
  varying vec3 vNormal;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    if (length(center) > 0.5) discard;

    float fadeThreshold = 0.69;
    float rawFade = clamp((vPhase - fadeThreshold) / (1.0 - fadeThreshold), 0.0, 1.0);
    float smoothFade = rawFade * rawFade * (3.0 - rawFade * 2.0);
    float fadeMask = vElevation >= fadeThreshold ? 1.0 : 0.0;
    float fade = 1.0 - smoothFade * fadeMask * uAnimate;

    vec3 landLow = uLandColor * (1.0 - uBlendFactor) + uWaterColor * uBlendFactor;
    vec3 landElevated = landLow + (uLandColor - landLow) * vElevation;
    vec3 color = (vLand > 0.5 ? landElevated : uWaterColor) * fade;

    gl_FragColor = vec4(color, 1.0);
  }
`;
