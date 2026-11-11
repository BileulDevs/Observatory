import { GLSL_NOISE } from './noise'

/**
 * Star photosphere: animated granulation, a few dark spots and limb darkening, in HDR so bloom adds the glow.
 */
export const STAR_SURFACE_VERT = /* glsl */`
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vPosO = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const STAR_SURFACE_FRAG = /* glsl */`
${GLSL_NOISE}
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uSeed;
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 d = normalize(vPosO);
  float mu = max(dot(normalize(vNW), normalize(cameraPosition - vPosW)), 0.0);
  // Eddington limb darkening, u = 0.6: the edge of a real star is about 40% as bright as its centre.
  float limb = 1.0 - 0.6 * (1.0 - mu);
  float gran = fbm(d * 18.0 + vec3(0.0, uTime * 0.03, uSeed), 4) * 0.5 + 0.5;
  float cells = fbm(d * 4.0 + vec3(uTime * 0.01, 0.0, uSeed), 3) * 0.5 + 0.5;
  float spots = smoothstep(0.72, 0.78, fbm(d * 2.5 + uSeed * 3.0, 4) * 0.5 + 0.5) * smoothstep(0.75, 0.2, abs(d.y));
  float b = limb * (0.82 + 0.28 * gran + 0.12 * cells) * (1.0 - 0.6 * spots);
  // Cooler (redder) towards the limb, as observed.
  vec3 col = mix(uColor * vec3(1.0, 0.82, 0.65), uColor, mu);
  gl_FragColor = vec4(col * b * uIntensity, 1.0);
}
`
