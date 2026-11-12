import { GLSL_NOISE } from './noise'

/**
 * Bake shaders: evaluate the expensive procedural fields once, into cubemaps (see CubeBaker).
 */
export const BAKE_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

/**
 * Passes: 0 surface data (RGBA16F: height, tangent gradient x/y, type extra),
 * 1 clouds (RGBA8: coverage, fine density), 2 sky (RGBA8: radiance x10).
 */
export const BAKE_FRAG = /* glsl */`
${GLSL_NOISE}
uniform int uType;
uniform int uPass;
uniform vec3 uSeed;
uniform float uTexel;
// Highest noise frequency the target resolution can hold. Octaves above it would alias into per-texel grain.
uniform float uMaxFreq;
varying vec3 vDir;

// Octave count capped so that k * 2.03^i stays under uMaxFreq.
int OC(float k, int oct){ return clamp(int(floor(log2(uMaxFreq / k) / 1.0215)) + 1, 1, oct); }

vec3 rotateAxis(vec3 p, vec3 axis, float a){
  return p * cos(a) + cross(axis, p) * sin(a) + axis * dot(axis, p) * (1.0 - cos(a));
}

float crater(vec3 p, float scale, float so, float density){
  // Craters smaller than a few texels only add noise: fade the whole layer out instead.
  float fade = 1.0 - smoothstep(0.12, 0.3, scale / uMaxFreq);
  if (fade <= 0.0) return 0.0;
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
    float dd = length(c - f) / rad;
    if (dd > 1.7) continue;
    // Bowl, raised rim, then ejecta falling off outside. Continuous at dd = 1.
    float prof = dd < 1.0 ? (dd * dd - 1.0) * 0.9 + 0.25 * pow(dd, 6.0) : 0.25 * exp(-(dd - 1.0) * 7.0);
    // Only the larger craters get a central peak, as on real bodies.
    prof += 0.32 * exp(-dd * dd * 45.0) * step(0.34, rad);
    acc += prof;
  }
  return acc * fade;
}

vec2 worley(vec3 p){
  vec3 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + hash33(i + g + uSeed) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return sqrt(vec2(d1, d2));
}

float hOcean(vec3 p, out float extra){
  vec3 q = p * 1.25 + uSeed;
  vec3 w = vec3(fbm(q + vec3(1.7, 9.2, 3.1), 4), fbm(q + vec3(8.3, 2.8, 5.4), 4), fbm(q + vec3(4.1, 6.6, 0.7), 4));
  float cont = fbm(q + w * 0.9, OC(1.25, 8));
  float landMask = smoothstep(-0.02, 0.2, cont);
  float mtnMask = smoothstep(0.04, 0.32, cont) * smoothstep(-0.25, 0.3, fbm(p * 1.8 + uSeed + 3.0, 3));
  float mtn = ridged(p * 2.7 + uSeed * 1.3 + w * 0.45, OC(2.7, 9));
  float hills = fbm(p * 7.0 + uSeed * 2.1, OC(7.0, 6)) * 0.05;
  float h = cont * 0.9 + mtn * mtnMask * 0.5 + hills * landMask + fbm(p * 46.0 + uSeed, OC(46.0, 4)) * 0.01 * step(46.0, uMaxFreq);
  extra = fbm(p * 2.1 + uSeed * 0.7 + w * 0.35, 5) * 0.5 + 0.5;
  return h;
}

float hArid(vec3 p, out float extra){
  vec3 q = p * 1.1 + uSeed;
  vec3 w = vec3(fbm(q + 1.3, 3), fbm(q + 7.7, 3), fbm(q + 4.4, 3));
  float base = fbm(q + w * 0.7, OC(1.1, 7)) * 0.32;
  float high = smoothstep(-0.1, 0.35, fbm(p * 0.8 + uSeed + 11.0, 4)) * 0.16;
  float canyon = -0.2 * pow(1.0 - abs(snoise(p * 1.6 + w * 0.8 + uSeed)), 14.0) * smoothstep(0.0, 0.3, fbm(p * 1.2 + uSeed + 5.0, 3));
  float c = crater(p, 2.2, 0.0, 0.3) * 0.15 + crater(p, 5.0, 1.0, 0.45) * 0.075 + crater(p, 11.0, 2.0, 0.55) * 0.036
          + crater(p, 24.0, 3.0, 0.65) * 0.016 + crater(p, 52.0, 4.0, 0.75) * 0.0075 + crater(p, 110.0, 5.0, 0.8) * 0.0034;
  float h = base + high + canyon + c + fbm(p * 34.0 + uSeed, OC(34.0, 4)) * 0.008 * step(34.0, uMaxFreq);
  extra = clamp(0.5 + c * 4.5, 0.0, 1.0);
  return h;
}

float hIce(vec3 p, out float extra){
  vec3 q = p + uSeed;
  vec3 w = vec3(fbm(q * 1.5 + 2.1, 4), fbm(q * 1.5 + 5.3, 4), fbm(q * 1.5 + 8.8, 4));
  float base = fbm(q * 2.0, OC(2.0, 6)) * 0.035;
  vec2 c1 = worley(p * 2.2 + w * 0.35 + uSeed);
  vec2 c2 = worley(p * 5.5 + w * 0.25 + uSeed * 1.7);
  vec2 c3 = worley(p * 13.0 + w * 0.15 + uSeed * 2.3);
  float e1 = c1.y - c1.x, e2 = c2.y - c2.x, e3 = c3.y - c3.x;
  // Double ridges flanking a central trough: the signature of Europa-like lineae.
  // Line widths never go below ~1.5 texels, otherwise the lineae break up into dotted aliasing.
  float tw = 1.5 * 1.57 / (uMaxFreq / 0.22);
  float r1 = exp(-sq((e1 - 0.035) / max(0.02, tw * 2.2))) - 0.6 * exp(-sq(e1 / max(0.012, tw * 2.2)));
  float r2 = exp(-sq((e2 - 0.03) / max(0.018, tw * 5.5))) - 0.5 * exp(-sq(e2 / max(0.01, tw * 5.5)));
  float r3 = exp(-sq(e3 / max(0.03, tw * 13.0))) * (1.0 - smoothstep(0.25, 0.6, 13.0 / uMaxFreq));
  float chaos = smoothstep(0.22, 0.55, fbm(p * 3.0 + uSeed + 9.0, 5));
  float h = base + r1 * 0.03 + r2 * 0.016 + r3 * 0.005 + chaos * fbm(p * 26.0 + uSeed, OC(26.0, 5)) * 0.028;
  extra = clamp(max(max(exp(-sq(e1 / 0.06)), exp(-sq(e2 / 0.045)) * 0.7), exp(-sq(e3 / 0.04)) * 0.35) + chaos * 0.45, 0.0, 1.0);
  return h;
}

float heightAt(vec3 p, out float extra){
  if (uType == 0) return hOcean(p, extra);
  if (uType == 1) return hArid(p, extra);
  return hIce(p, extra);
}

vec4 gasGiant(vec3 d){
  vec3 p = d;
  float storm = 0.0;
  for (int k = 0; k < 7; k++) {
    vec3 r = hash33(uSeed + float(k) * 7.13);
    float lat = (r.x - 0.5) * 1.5;
    float lon = r.y * 6.2831853;
    vec3 c = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    float rad = k == 0 ? 0.2 : mix(0.04, 0.11, r.z);
    vec3 east = tangentU(c);
    vec3 north = cross(c, east);
    vec3 off = d - c;
    // Storms are wider than tall: jets shear them along longitude.
    float dist = length(vec2(dot(off, east) * 0.55, dot(off, north))) / rad;
    if (dist < 1.0 && dot(d, c) > 0.0) {
      float a = (1.0 - dist) * (1.0 - dist) * 5.5 * (r.z > 0.5 ? 1.0 : -1.0);
      p = rotateAxis(p, c, a);
    }
    storm = max(storm, smoothstep(1.0, 0.45, dist) * step(0.0, dot(d, c)));
  }
  float turb = fbm(vec3(p.x * 3.0, p.y * 18.0, p.z * 3.0) + uSeed, OC(18.0, 7));
  float shear = fbm(vec3(p.x * 1.5, p.y * 5.0, p.z * 1.5) + uSeed * 2.0, 5);
  float band = p.y + turb * 0.025 + shear * 0.05 + 0.012 * fbm(vec3(p.x * 9.0, p.y * 70.0, p.z * 9.0) + uSeed, OC(70.0, 5));
  return vec4(band, turb * 0.5 + 0.5, storm, 0.0);
}

vec4 clouds(vec3 d){
  vec3 p = d;
  for (int k = 0; k < 6; k++) {
    vec3 r = hash33(uSeed * 1.37 + float(k) * 3.71 + 40.0);
    float lat = (r.x - 0.5) * 2.0;
    if (abs(lat) < 0.18) lat += sign(lat) * 0.25; // no cyclones on the equator (no Coriolis force there)
    float lon = r.y * 6.2831853;
    vec3 c = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    float rad = mix(0.12, 0.26, r.z);
    float dist = length(d - c) / rad;
    if (dist < 1.0) p = rotateAxis(p, c, pow(1.0 - dist, 2.5) * 9.0 * sign(lat));
  }
  vec3 q = p * 2.0 + uSeed * 1.9;
  vec3 w = vec3(fbm(q + 3.3, 4), fbm(q + 6.1, 4), fbm(q + 1.2, 4));
  float n = fbm(q * 1.2 + w * 0.8, OC(2.4, 8)) * 0.5 + 0.5;
  float lat = abs(d.y);
  float zonal = 0.25 * cos(lat * 9.0);
  float streak = fbm(vec3(p.x * 4.0, p.y * 14.0, p.z * 4.0) + w + uSeed, OC(14.0, 6)) * 0.5 + 0.5;
  float cov = smoothstep(0.54, 0.86, n * 0.72 + streak * 0.28 + zonal * 0.35);
  float fine = fbm(p * 30.0 + w * 2.0, OC(30.0, 5)) * 0.5 + 0.5;
  cov = clamp(cov * mix(0.7, 1.2, fine), 0.0, 1.0);
  return vec4(cov, fine, 0.0, 1.0);
}

vec4 sky(vec3 d){
  vec3 gN = normalize(vec3(0.3, 1.0, 0.45));
  float b = dot(d, gN);
  float band = exp(-b * b * 26.0);
  float n = fbm(d * 3.0 + 4.0, 7) * 0.5 + 0.5;
  float dust = smoothstep(0.45, 0.75, fbm(d * 6.0 + 11.0, 6) * 0.5 + 0.5);
  vec3 col = vec3(0.55, 0.6, 0.75) * band * n * n * 0.05;
  col *= 1.0 - dust * band * 0.85;
  col += vec3(0.55, 0.32, 0.48) * pow(fbm(d * 1.6 + 20.0, 5) * 0.5 + 0.5, 4.0) * 0.012;
  return vec4(col * 10.0, 1.0);
}

void main(){
  vec3 d = normalize(vDir);
  if (uPass == 1) { gl_FragColor = clouds(d); return; }
  if (uPass == 2) { gl_FragColor = sky(d); return; }
  if (uType == 2) { gl_FragColor = gasGiant(d); return; }
  vec3 t1 = tangentU(d);
  vec3 t2 = cross(d, t1);
  float e = uTexel;
  float extra, ex1, ex2;
  float h0 = heightAt(d, extra);
  float h1 = heightAt(normalize(d + t1 * e), ex1);
  float h2 = heightAt(normalize(d + t2 * e), ex2);
  gl_FragColor = vec4(h0, (h1 - h0) / e, (h2 - h0) / e, extra);
}
`
