import { GLSL_NOISE } from './noise'

/**
 * Comet gas and dust. Tails are open surfaces drawn additively: the ion tail a narrow straight cone streaming
 * away from the Sun, the dust tail a wide curved fan lagging behind along the orbit. uv.x runs across the tail,
 * uv.y from the head (0) to the far end (1).
 */
export const TAIL_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vUv = uv;
  vNW = normalize(mat3(modelMatrix) * normal);
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosW, 1.0);
}
`

export const ION_TAIL_FRAG = /* glsl */`
${GLSL_NOISE}
uniform vec3 uColor;
uniform float uI;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 V = normalize(cameraPosition - vPosW);
  float core = pow(abs(dot(normalize(vNW), V)), 1.6);
  float along = vUv.y;
  // Streamers: thin rays along the tail, drifting outwards as the solar wind carries the plasma away.
  float rays = fbm(vec3(vUv.x * 40.0, along * 2.0 - uTime * 0.25, 1.0), 4) * 0.5 + 0.5;
  float fade = smoothstep(0.0, 0.03, along) * pow(max(1.0 - along, 0.0), 1.3);
  gl_FragColor = vec4(uColor * uI * core * fade * (0.2 + 1.2 * rays * rays), 1.0);
}
`

export const DUST_TAIL_FRAG = /* glsl */`
${GLSL_NOISE}
uniform vec3 uColor;
uniform float uI;
varying vec2 vUv;
void main(){
  float across = abs(vUv.x * 2.0 - 1.0);
  float along = vUv.y;
  // Striae: bands of dust released in bursts, fanning out across the tail.
  float striae = 0.75 + 0.25 * sin(along * 70.0 + vUv.x * 9.0 + fbm(vec3(along * 6.0, vUv.x * 3.0, 2.0), 3) * 4.0);
  float edge = exp(-across * across * 3.2);
  float fade = smoothstep(0.0, 0.04, along) * pow(max(1.0 - along, 0.0), 1.6);
  gl_FragColor = vec4(uColor * uI * edge * fade * striae, 1.0);
}
`

/** Coma: the glowing gas cloud around the nucleus, a camera-facing billboard. */
export const COMA_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uI;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float g = exp(-r * r * 14.0) * 0.7 + exp(-r * 4.0) * 0.2 + exp(-r * r * 400.0) * 1.5;
  gl_FragColor = vec4(uColor * uI * g * (1.0 - smoothstep(0.85, 1.0, r)), 1.0);
}
`
