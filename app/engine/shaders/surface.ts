import { GLSL_EQUIRECT } from './equirect'
import { GLSL_NOISE } from './noise'
import { GLSL_RING_DENSITY } from './ringDensity'

/**
 * Planet surface: shades the baked data per art style (palettes, water, city lights, cartographic overlay).
 */
export const SURFACE_VERT = /* glsl */`
varying vec3 vPosO;
varying vec3 vPosW;
varying vec3 vNW;
void main(){
  vPosO = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const PLANET_FRAG = /* glsl */`
${GLSL_NOISE}
${GLSL_RING_DENSITY}
${GLSL_EQUIRECT}
uniform samplerCube uData;
uniform samplerCube uClouds;
uniform int uType;
uniform vec3 uSunW;
uniform vec3 uSunO;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uAmb;
uniform vec3 uP0; uniform vec3 uP1; uniform vec3 uP2; uniform vec3 uP3; uniform vec3 uP4; uniform vec3 uP5;
uniform vec3 uSkyTint;
uniform float uSea;
uniform float uBump;
uniform float uCity;
uniform float uOverlay;
uniform float uContourF;
uniform vec3 uInk;
uniform vec3 uInkNight;
uniform vec3 uAccent;
uniform float uDetail;
uniform float uHasClouds;
uniform float uHasRings;
uniform vec3 uRingN;
uniform mat3 uCloudRel;
uniform float uSeedR;
// Object-to-world rotation (modelMatrix is not available in fragment shaders).
uniform mat3 uRotW;
// Planet centre in world space: lets several planets share one scene.
uniform vec3 uCenter;
// World units per planet radius: the shadow maths below work on a unit sphere.
uniform float uScale;
// Real-world equirectangular map (NASA/USGS). When set it replaces the procedural albedo.
uniform sampler2D uMap;
uniform float uUseMap;
uniform sampler2D uNight;
uniform float uUseNight;
// 1 for maps where dark blue means open water (Earth): enables the sun glint there.
uniform float uMapWater;

vec3 sampleMap(vec3 d){ return sampleEquirect(uMap, d); }
varying vec3 vPosO;
varying vec3 vPosW;
varying vec3 vNW;

// Mikkelsen screen-space bump mapping, unnormalized form so the strength does not depend on zoom.
vec3 perturbNormal(vec3 pos, vec3 n, float hgt){
  vec3 dpx = dFdx(pos), dpy = dFdy(pos);
  float dhx = dFdx(hgt), dhy = dFdy(hgt);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - grad);
}

float gridLine(float v, float widthPx){
  float fw = fwidth(v);
  return 1.0 - smoothstep(0.0, fw * widthPx, abs(fract(v - 0.5) - 0.5));
}

void main(){
  vec3 d = normalize(vPosO);
  vec4 D = textureCube(uData, d);
  vec3 Ng = normalize(vNW);
  vec3 L = normalize(uSunW);
  vec3 V = normalize(cameraPosition - vPosW);
  mat3 M = uRotW;
  float h = D.r;
  float lat = abs(d.y);

  vec3 nO = d;
  if (uType != 2) {
    vec3 t1 = tangentU(d);
    vec3 t2 = cross(d, t1);
    nO = normalize(d - uBump * (D.g * t1 + D.b * t2));
  }

  vec3 albedo;
  float water = 0.0, land = 1.0, snow = 0.0, cityMask = 0.0, gloss = 0.0;

  if (uType == 0) {
    land = smoothstep(uSea - 0.002, uSea + 0.004, h);
    float depth = clamp((uSea - h) / 0.35, 0.0, 1.0);
    vec3 waterCol = mix(uP1, uP0, pow(depth, 0.55));
    float e = clamp((h - uSea) / 0.7, 0.0, 1.0);
    float moist = D.a;
    float temp = 1.0 - pow(lat, 1.6) * 1.15 - e * 0.65;
    vec3 veg = mix(uP3, uP2, smoothstep(0.32, 0.58, moist + (temp - 0.6) * 0.25));
    vec3 ground = mix(veg, uP4, smoothstep(0.2, 0.55, e));
    ground = mix(mix(uP3, vec3(1.0), 0.2), ground, smoothstep(0.0, 0.012, h - uSea));
    snow = smoothstep(0.14, 0.03, temp + (moist - 0.5) * 0.1);
    ground = mix(ground, uP5, snow);
    float seaIce = smoothstep(0.86, 0.93, lat + (moist - 0.5) * 0.1);
    waterCol = mix(waterCol, uP5 * 0.9, seaIce);
    albedo = mix(waterCol, ground, land);
    water = (1.0 - land) * (1.0 - seaIce);
    if (water > 0.5) nO = d;
  } else if (uType == 1) {
    float e = smoothstep(-0.35, 0.45, h);
    vec3 c = mix(uP0, uP1, smoothstep(0.12, 0.55, e));
    c = mix(c, uP2, smoothstep(0.55, 0.92, e));
    c *= mix(0.72, 1.15, D.a);
    snow = smoothstep(0.9, 0.955, lat + h * 0.06);
    albedo = mix(c, uP5, snow);
  } else if (uType == 2) {
    float b = D.r;
    float v1 = 0.5 + 0.5 * sin(b * 23.0 + 0.8 * sin(b * 7.0 + uSeedR));
    float v2 = 0.5 + 0.5 * sin(b * 61.0 + D.g * 2.5);
    vec3 c = mix(uP0, uP1, smoothstep(0.25, 0.75, v1));
    c = mix(c, uP2, smoothstep(0.65, 0.95, v2) * 0.6);
    c = mix(c, uP3, smoothstep(0.75, 1.0, 1.0 - v1) * 0.5);
    c *= 0.86 + 0.28 * D.g;
    albedo = mix(c, uP5, D.b * 0.85);
  } else {
    vec3 c = mix(uP0, uP3, smoothstep(-0.02, 0.04, h));
    c = mix(c, uP1, smoothstep(0.3, 0.8, D.a) * 0.5);
    c = mix(c, uP2, pow(D.a, 1.5) * 0.7);
    albedo = c;
    gloss = 0.35 * (1.0 - D.a);
  }

  if (uUseMap > 0.5) {
    albedo = sampleMap(d);
    nO = d;
    gloss = 0.0;
    // Real city lights from the night map (Earth only); every other mapped or procedural world stays dark.
    cityMask = uUseNight > 0.5 ? sampleEquirect(uNight, d).r : 0.0;
    water = uMapWater * smoothstep(0.03, 0.12, albedo.b - max(albedo.r, albedo.g));
    land = 1.0 - water;
  }

  vec3 N = normalize(M * nO);

  // Close-up detail the cubemap cannot hold: only fades in near the surface, where it would not alias.
  if (uDetail > 0.001 && water < 0.5 && uType != 2 && uUseMap < 0.5) {
    // Each octave fades out before its wavelength drops under ~3 pixels: past that it only produces shimmer.
    float pf = length(fwidth(vPosW));
    float md = 0.0, amp = 1.0, f = 380.0;
    vec3 q = d * f + vec3(h * 5.0);
    for (int i = 0; i < 3; i++) {
      md += snoise(q) * amp * (1.0 - smoothstep(0.12, 0.3, f * pf));
      q = OCT_ROT * q * 2.03; f *= 2.03; amp *= 0.5;
    }
    N = perturbNormal(vPosW, N, md * 0.0011 * uDetail);
    albedo *= 1.0 + md * 0.08 * uDetail;
  }

  float geo = dot(Ng, L);
  float term = smoothstep(-0.1, 0.22, geo);
  float NdL = dot(N, L);
  float diff = uType == 2 ? max((NdL + 0.12) / 1.12, 0.0) : max(NdL, 0.0);

  float shadow = 1.0;
  if (uHasClouds > 0.5) {
    vec3 cd = uCloudRel * normalize(d + uSunO * 0.014);
    shadow *= 1.0 - textureCube(uClouds, cd).r * 0.55;
  }
  if (uHasRings > 0.5) {
    float denom = dot(L, uRingN);
    if (abs(denom) > 1e-4) {
      vec3 P = (vPosW - uCenter) / uScale;
      float t = -dot(P, uRingN) / denom;
      if (t > 0.0) shadow *= 1.0 - ringDensity(length(P + L * t), 0.0) * 0.85;
    }
  }

  vec3 sun = uSunColor * uSunI;
  vec3 col = albedo * (sun * diff * term * shadow + uAmb * (0.5 + 0.5 * max(dot(Ng, V), 0.0)));

  // Water: GGX highlight for the sun glint, plus sky reflection at grazing angles.
  if (water > 0.0 || gloss > 0.0) {
    float rough = water > 0.0 ? 0.09 : 0.3;
    vec3 Hh = normalize(L + V);
    float NdH = max(dot(Ng, Hh), 0.0);
    float a2 = rough * rough * rough * rough;
    float dd = NdH * NdH * (a2 - 1.0) + 1.0;
    float Dg = a2 / (3.14159 * dd * dd);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(V, Hh), 0.0), 5.0);
    float k = max(water, gloss);
    col += sun * Dg * F * max(geo, 0.0) * 0.25 * k * shadow;
    float Fv = 0.02 + 0.98 * pow(1.0 - max(dot(Ng, V), 0.0), 5.0);
    col += uSkyTint * Fv * term * water * 0.6;
  }

  float night = 1.0 - smoothstep(-0.12, 0.06, geo);
  col += vec3(1.0, 0.6, 0.28) * cityMask * night * uCity;

  // A gas giant has no hard surface: darken the limb to read as depth.
  if (uType == 2) col *= mix(0.5, 1.0, pow(max(dot(Ng, V), 0.0), 0.35));

  if (uOverlay > 0.0) {
    float lines = 0.0;
    if (uType != 2) {
      float c = (h - uSea) * uContourF;
      float minor = gridLine(c, 1.0) * 0.4;
      float major = gridLine(c / 5.0, 1.2) * 0.85;
      float above = uType == 0 ? land : 1.0;
      lines = max(minor, major) * above;
    }
    float latDeg = degrees(asin(clamp(d.y, -1.0, 1.0)));
    float lonA = degrees(atan(d.z, d.x));
    float lonB = degrees(atan(-d.z, -d.x));
    // Two longitude parametrisations with seams on opposite sides: taking the smaller derivative removes the seam line.
    float fwLon = min(fwidth(lonA), fwidth(lonB));
    float lonLine = 1.0 - smoothstep(0.0, fwLon * 1.0, abs(fract(lonA / 15.0 - 0.5) - 0.5) * 15.0);
    float latLine = gridLine(latDeg / 15.0, 1.0);
    float grat = max(lonLine, latLine) * 0.55;
    float equator = 1.0 - smoothstep(0.0, fwidth(latDeg) * 1.5, abs(latDeg));
    vec3 ink = mix(uInkNight, uInk, term);
    col = mix(col, ink, clamp(max(lines, grat) * uOverlay, 0.0, 1.0));
    float coast = uType == 0 ? (1.0 - smoothstep(0.0, fwidth(h) * 0.9, abs(h - uSea))) * 0.75 : 0.0;
    col = mix(col, uAccent * mix(0.5, 1.6, term), clamp(max(coast, equator * 0.8) * uOverlay, 0.0, 1.0));
  }

  gl_FragColor = vec4(col, 1.0);
}
`
