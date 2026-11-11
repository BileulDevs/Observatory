import { GLSL_EQUIRECT } from './equirect'
import { GLSL_NOISE } from './noise'

/**
 * Moon surface: a real map when one exists, otherwise a cheap procedural regolith computed per pixel
 * (moons are small on screen, so no bake is needed). Lit by the parent planet's sun.
 */
export const MOON_VERT = /* glsl */`
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
// World directions of the object axes: modelMatrix is not available in the fragment shader, and the crater
// relief is computed in object space. Identical at every vertex, so interpolation keeps them exact.
varying vec3 vAx;
varying vec3 vAy;
varying vec3 vAz;
void main(){
  vPosO = position;
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  vAx = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vAy = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  vAz = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const MOON_FRAG = /* glsl */`
${GLSL_NOISE}
${GLSL_EQUIRECT}
uniform sampler2D uMap;
uniform float uUseMap;
uniform vec3 uColor;
uniform float uSeed;
/** 1 for Iapetus-like bodies: one hemisphere coated in dark material. */
uniform float uTwoTone;
/** 1 for Titan-like bodies: a hazy atmosphere hides the ground. */
uniform float uHazy;
uniform vec3 uSunW;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uAmb;
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
varying vec3 vAx;
varying vec3 vAy;
varying vec3 vAz;
/**
 * Crater relief strength: slope multiplier on the lighting normal. 0 = flat albedo only; above ~0.6 the rims
 * look like walls.
 */
#define CRATER_BUMP 0.35
/** Crater layers fade out once a cell is smaller than this many pixels: below that they only shimmer. */
#define CRATER_MIN_PIXELS 6.0

/**
 * One layer of craters on the unit sphere, same profile as the planet bake (bowl, raised rim, ejecta), evaluated
 * per pixel. Adds the analytic gradient of the height to grad, so the relief can light without extra samples.
 */
float craterLayer(vec3 p, float scale, float so, float density, inout vec3 grad){
  vec3 q = p * scale;
  vec3 i = floor(q);
  vec3 f = fract(q);
  float acc = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = hash33(i + g + so * 17.31 + uSeed * 3.1);
    if (r.x > density) continue;
    vec3 c = g + 0.15 + 0.7 * hash33(i + g + so * 5.7 + 11.1);
    float rad = mix(0.16, 0.46, r.y * r.y);
    vec3 v = f - c;
    float len = length(v);
    float dd = len / rad;
    if (dd > 1.7) continue;
    float prof;
    float dprof;
    if (dd < 1.0) {
      prof = (dd * dd - 1.0) * 0.9 + 0.25 * pow(dd, 6.0);
      dprof = 1.8 * dd + 1.5 * pow(dd, 5.0);
    } else {
      float e = exp(-(dd - 1.0) * 7.0);
      prof = 0.25 * e;
      dprof = -1.75 * e;
    }
    acc += prof;
    // d(dd)/dp = (v / len) * scale / rad.
    grad += dprof * v / max(len, 1e-4) * (scale / rad);
  }
  return acc;
}

/** Adds one crater layer (height and gradient), scaled so every layer has similar slopes, faded by footprint. */
void addCraters(vec3 d, float scale, float so, float density, float footprint, inout float h, inout vec3 grad){
  float fade = 1.0 - smoothstep(0.5, 1.0, footprint * scale * CRATER_MIN_PIXELS);
  if (fade <= 0.0) return;
  vec3 g = vec3(0.0);
  float amp = fade / scale;
  h += amp * craterLayer(d, scale, so, density, g);
  grad += amp * g;
}
/** Haze rim sharpness and strength. Lower power = thicker-looking atmosphere; higher gain washes out the disc. */
#define HAZE_RIM_POWER 2.5
#define HAZE_RIM_GAIN 0.55
void main(){
  vec3 d = normalize(vPosO);
  vec3 albedo;
  vec3 N = normalize(vNW);
  if (uUseMap > 0.5) {
    albedo = sampleEquirect(uMap, d);
  } else if (uHazy > 0.5) {
    // Haze: only faint latitude banding and a darker polar hood (Titan's north), never ground features.
    float band = fbm(vec3(d.y * 6.0, uSeed, 0.0), 3) * 0.5 + 0.5;
    albedo = uColor * (0.9 + 0.08 * band) * (1.0 - 0.18 * smoothstep(0.55, 0.95, d.y));
  } else {
    float n = fbm(d * 3.0 + uSeed, 5) * 0.5 + 0.5;
    // Pixel footprint on the unit sphere: small layers fade before they alias.
    float footprint = length(fwidth(d));
    float h = 0.0;
    vec3 grad = vec3(0.0);
    addCraters(d, 3.0, 0.0, 0.35, footprint, h, grad);
    addCraters(d, 7.0, 1.0, 0.5, footprint, h, grad);
    addCraters(d, 16.0, 2.0, 0.6, footprint, h, grad);
    addCraters(d, 36.0, 3.0, 0.7, footprint, h, grad);
    // Crater floors a little darker, rims and ejecta a little brighter, as on airless bodies.
    albedo = uColor * (0.72 + 0.4 * n) * clamp(1.0 + 1.6 * h, 0.75, 1.2);
    if (uTwoTone > 0.5) albedo = mix(albedo, albedo * 0.12, smoothstep(-0.25, 0.25, d.x + 0.15 * n));
    // Relief: tilt the normal against the tangential part of the height gradient, in object space, then to world.
    vec3 gt = grad - d * dot(grad, d);
    vec3 no = normalize(d - gt * CRATER_BUMP);
    N = normalize(no.x * vAx + no.y * vAy + no.z * vAz);
  }
  vec3 L = normalize(uSunW);
  float diff = max(dot(N, L), 0.0);
  vec3 col = albedo * (uSunColor * uSunI * diff + uAmb);
  if (uHazy > 0.5) {
    // Forward-scattering haze: a bright rim towards the limb, also past the terminator (light wraps round).
    vec3 V = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - max(dot(N, V), 0.0), HAZE_RIM_POWER);
    float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
    col += uColor * uSunColor * uSunI * rim * wrap * HAZE_RIM_GAIN;
  }
  gl_FragColor = vec4(col, 1.0);
}
`
