import { GLSL_BLACKBODY } from './common'
import { GLSL_NOISE } from './noise'

/**
 * Catalogue and creator stars (the system views have their own, in star.ts): a photosphere shaded in object
 * space, so the pattern turns with the star.
 * - colour: black-body from the temperature, or a tint where the atmosphere's composition sets it (white dwarfs
 *   polluted by planetary debris look green or pink whatever their temperature);
 * - granulation: convection cells, slowly boiling;
 * - spots and faculae from the magnetic activity;
 * - limb darkening;
 * - optional lumpy envelope (black hole star): the surface is pushed in and out by slow turbulence.
 */
export const STAR_VERT = /* glsl */`
${GLSL_NOISE}
uniform float uTime;
uniform float uLumpy;
uniform float uSeed;
varying vec3 vPosL;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 n = normalize(position);
  // Turbulent envelope: low-frequency displacement only, so the outline wobbles without spiking.
  float bump = uLumpy > 0.0 ? fbm(n * 1.6 + vec3(uSeed, uTime * 0.04, 0.0), 4) * uLumpy : 0.0;
  vec3 p = position * (1.0 + bump);
  vPosL = n;
  vNW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vPosW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const STAR_FRAG = /* glsl */`
${GLSL_NOISE}
${GLSL_BLACKBODY}
uniform float uTime;
uniform float uTemp;
uniform vec3 uTint;
uniform float uTintMix;
uniform float uGranScale;
uniform float uSpots;
uniform float uActivity;
uniform float uLumpy;
uniform float uSeed;
uniform float uI;
varying vec3 vPosL;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 n = normalize(vPosL);
  vec3 V = normalize(cameraPosition - vPosW);
  float mu = clamp(dot(normalize(vNW), V), 0.0, 1.0);
  // Quadratic limb-darkening law with solar-like coefficients.
  float limb = 1.0 - 0.6 * (1.0 - mu) - 0.2 * (1.0 - mu) * (1.0 - mu);
  float t = uTime * 0.05;
  vec3 q = n * uGranScale + vec3(uSeed);
  // Granules: bright cell centres, dark lanes (ridged noise turned upside down), boiling with time.
  float cells = 1.0 - ridged(q + vec3(0.0, t, -t), 3) * 0.55;
  float fine = fbm(q * 3.1 + vec3(t * 2.0), 3);
  float gran = 0.82 + 0.28 * cells + 0.08 * fine;
  // Spots: dark umbra in a lighter penumbra, in latitude bands like the Sun's.
  float band = smoothstep(0.75, 0.25, abs(n.y)) * smoothstep(0.0, 0.12, abs(n.y));
  float sp = fbm(n * 2.3 + vec3(uSeed * 1.7, 0.0, t * 0.1), 4) * band;
  float th = 0.62 - uSpots * 0.45;
  float umbra = smoothstep(th + 0.08, th + 0.16, sp) * step(0.001, uSpots);
  float penumbra = smoothstep(th, th + 0.08, sp) * step(0.001, uSpots);
  float spot = 1.0 - penumbra * 0.45 - umbra * 0.4;
  // Faculae: bright patches around active regions, most visible towards the limb.
  float fac = uActivity * smoothstep(th - 0.12, th, sp) * (1.0 - penumbra) * (1.0 - mu) * 0.9;
  vec3 base = mix(blackbody(uTemp), uTint, uTintMix);
  // Envelope stars: deep turbulence in brightness too (hot upwellings, cooler sinking gas).
  float churn = uLumpy > 0.0 ? 0.65 + 0.7 * smoothstep(-0.4, 0.6, fbm(n * 3.0 + vec3(0.0, t * 0.6, uSeed), 4)) : 1.0;
  vec3 col = base * limb * gran * spot * churn + base * fac;
  gl_FragColor = vec4(col * uI, 1.0);
}
`

/** Soft corona / glow around the disc, on a camera-facing quad. */
export const STAR_GLOW_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uI;
uniform float uCore;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  // Starts at the disc edge (uCore, in quad half-widths) and fades out to the quad's edge.
  // Over the disc it stays at its edge value, a faint veil, so there is no seam at the limb.
  float x = max(r - uCore, 0.0) / max(1.0 - uCore, 1e-3);
  float g = (exp(-x * 6.0) * 0.8 + exp(-x * 18.0) * 0.6) * mix(0.35, 1.0, smoothstep(uCore * 0.7, uCore, r));
  gl_FragColor = vec4(uColor * uI * g * (1.0 - smoothstep(0.9, 1.0, r)), 1.0);
}
`
