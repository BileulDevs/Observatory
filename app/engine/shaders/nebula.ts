/**
 * Volumetric nebula: front-to-back ray-march through a sphere, with glowing gas (emission) and dust (absorption).
 * Noise comes from a small tileable 3D texture, sampled at several scales: far cheaper per step than computing
 * simplex noise, which is what makes 40–70 steps per pixel affordable.
 * Shapes, in the sphere's unit coordinates: emission (Orion), ring (M57), helix (NGC 7293), remnant (Crab),
 * pillars (M16), complex (Carina).
 */
export const NEBULA_VERT = /* glsl */`
varying vec3 vPosL;
void main(){
  vPosL = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const NEBULA_FRAG = /* glsl */`
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec3 uCamL;
uniform float uRadius;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uSeed;
uniform float uI;
varying vec3 vPosL;

/**
 * Rotation applied at every octave. Value noise from a texture is aligned with the texture axes; without it the
 * ridged layers line up into a visible grid.
 */
const mat3 OCT_R = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float n3(vec3 p){ return texture(uNoise, OCT_R * p).r; }
float fbmT(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * n3(p); p = OCT_R * p * 2.03 + vec3(0.171, 0.313, 0.071); a *= 0.5; }
  return s / 0.96875;
}
float ridged(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(n3(p) * 2.0 - 1.0)); p = OCT_R * p * 2.07 + vec3(0.29, 0.11, 0.53); a *= 0.5; }
  return s / 0.9375;
}

/** Pillars: distance to the three eroded columns (negative inside). */
float pillars(vec3 p, vec3 sp){
  float wob = (fbmT(sp * 2.4) - 0.5) * 0.26 + (fbmT(sp * 6.0 + 3.0) - 0.5) * 0.045;
  vec2 c1 = vec2(-0.42 + 0.06 * p.y, 0.0), c2 = vec2(0.02, -0.05), c3 = vec2(0.42, 0.02);
  float d1 = max(length(p.xz - c1) - mix(0.2, 0.08, smoothstep(-1.0, 0.6, p.y)) + wob, p.y - 0.62 + wob * 0.6);
  float d2 = max(length(p.xz - c2) - mix(0.15, 0.06, smoothstep(-1.0, 0.25, p.y)) + wob, p.y - 0.25 + wob * 0.6);
  float d3 = max(length(p.xz - c3) - mix(0.12, 0.05, smoothstep(-1.0, -0.05, p.y)) + wob, p.y + 0.05 + wob * 0.6);
  return min(d1, min(d2, d3));
}

/** Emission colour (rgb) and absorption (a) per unit length at point p (|p| ≤ 1). */
vec4 sampleNebula(vec3 p){
  vec3 sp = p * 1.15 + uSeed;
  float n = fbmT(sp);
  float r = length(p);
  vec3 em = vec3(0.0);
  float ab = 0.0;
#if SHAPE == 0
  // Orion: a gas wall behind, a hollow blown open towards us by the Trapezium stars near the centre.
  vec3 star = vec3(0.05, 0.02, 0.05);
  float detail = fbmT(sp * 3.1 + 5.0);
  float cavity = smoothstep(0.1, 0.5, length((p - vec3(0.05, 0.0, 0.32)) * vec3(1.0, 1.3, 0.8)));
  float gas = smoothstep(1.0, 0.35, r) * cavity * smoothstep(0.42, 0.78, n * 0.7 + detail * 0.45);
  float light = 0.2 / (dot(p - star, p - star) + 0.05);
  float hot = exp(-length(p - star) * 3.4);
  float ridge = pow(ridged(sp * 2.2), 5.0);
  em = (mix(uC1, uC2, hot * 1.3) * (0.5 + ridge * 2.2)) * gas * light + uC3 * hot * hot * 2.0 * smoothstep(0.35, 0.7, n);
  float lane = smoothstep(0.56, 0.74, fbmT(p * 1.6 + uSeed + 9.0)) * smoothstep(-0.1, 0.4, p.z) * smoothstep(0.95, 0.4, r);
  ab = gas * 0.5 + lane * 8.0;
#elif SHAPE == 1
  // Ring: a barrel of gas seen down its axis (z): hot oxygen inside, a hydrogen/nitrogen rim, faint outer loops.
  float rho = length(p.xy * vec2(1.0, 1.22));
  float clump = 0.45 + 0.8 * ridged(sp * 3.0);
  float barrel = exp(-pow((rho - 0.5) / 0.09, 2.0)) * smoothstep(0.7, 0.2, abs(p.z)) * clump;
  float rim = exp(-pow((rho - 0.6) / 0.05, 2.0)) * smoothstep(0.6, 0.15, abs(p.z)) * (0.4 + ridged(sp * 5.0));
  float fill = smoothstep(0.48, 0.1, rho) * smoothstep(0.5, 0.1, abs(p.z)) * (0.55 + 0.45 * n);
  float halo = exp(-pow((rho - 0.82) / 0.08, 2.0)) * pow(ridged(sp * 2.0), 3.0);
  em = mix(uC3, uC2, 0.55) * barrel * 0.9 + uC1 * rim * 1.1 + uC2 * fill * 0.22 + uC1 * halo * 0.25;
  ab = barrel * 0.6 + rim * 0.6;
#elif SHAPE == 2
  // Helix: a thick ring with an inner oxygen disk and thousands of radial cometary knots at its inner edge.
  float rho = length(p.xy);
  float ang = atan(p.y, p.x);
  float ring = exp(-pow((rho - 0.56) / 0.16, 2.0)) * smoothstep(0.55, 0.1, abs(p.z + 0.15 * p.x)) * (0.35 + ridged(sp * 2.6));
  float knotsN = n3(vec3(ang * 9.0, rho * 5.0, uSeed + 0.3)) * (0.6 + 0.6 * n3(vec3(ang * 3.0, 0.5, uSeed + 2.0)));
  float knots = smoothstep(0.62, 0.85, knotsN) * smoothstep(0.32, 0.42, rho) * smoothstep(0.62, 0.48, rho) * smoothstep(0.3, 0.0, abs(p.z));
  float inner = smoothstep(0.45, 0.0, rho) * smoothstep(0.35, 0.0, abs(p.z)) * (0.5 + 0.5 * n);
  em = mix(uC2, uC1, smoothstep(0.38, 0.62, rho)) * ring * 0.9 + uC2 * inner * 0.3 + uC3 * knots * 0.9;
  ab = ring * 0.4 + knots * 3.0;
#elif SHAPE == 3
  // Crab: a cage of orange and green filaments concentrated in the outer shell, around a smooth blue
  // synchrotron glow. Low noise frequencies: finer ridges average out along the ray into a uniform haze.
  vec3 q = p / vec3(1.0, 0.72, 0.82);
  float rq = length(q);
  float web = ridged(sp * 1.5 + 2.0);
  float shell = smoothstep(0.5, 0.78, rq) * smoothstep(1.0, 0.86, rq);
  float fil = smoothstep(0.8, 0.94, web) * shell + smoothstep(0.86, 0.97, web) * smoothstep(0.86, 0.3, rq) * 0.35;
  float sync = exp(-rq * rq * 3.2) * (0.55 + 0.45 * fbmT(sp * 0.8 + 8.0));
  em = mix(uC1, uC3, smoothstep(0.35, 0.75, fbmT(sp * 1.2 + 1.0))) * fil * 4.0 + mix(uC2, vec3(0.85, 0.9, 1.0), 0.35) * sync * 0.45;
  ab = fil * 2.5;
#elif SHAPE == 4
  // Pillars: three eroded dust columns, black inside, glowing only where their surface faces the massive stars
  // above them, in front of a blue-green emission background.
  float d = pillars(p, sp);
  float dust = smoothstep(0.015, -0.03, d);
  vec3 L = normalize(vec3(0.15, 1.0, 0.25));
  // Facing the light when the point just outside, towards the stars, is outside the column too.
  float facing = smoothstep(0.0, 0.03, pillars(p + L * 0.045, sp));
  float skin = smoothstep(0.03, 0.0, d) * smoothstep(-0.05, 0.0, d);
  float back = smoothstep(1.0, 0.2, r) * smoothstep(0.38, 0.72, n) * smoothstep(0.25, -0.6, p.z);
  em = uC2 * back * 0.55 + mix(uC1, uC3, 0.5) * skin * facing * (1.0 + 2.2 * fbmT(sp * 2.2 + 6.0)) + vec3(0.05, 0.035, 0.025) * dust * 0.15;
  ab = dust * 26.0 + back * 0.4;
#else
  // Carina: a huge clumpy complex, glowing cavities, dark dust lanes and a bright knot around Eta Carinae.
  vec3 eta = vec3(0.18, 0.08, 0.0);
  float detail = fbmT(sp * 2.9 + 4.0);
  float gas = smoothstep(1.0, 0.3, r) * smoothstep(0.36, 0.72, n * 0.65 + detail * 0.5);
  float light = 0.3 / (dot(p - eta, p - eta) + 0.1);
  float hot = exp(-length(p - eta) * 2.6);
  em = mix(uC1, uC2, smoothstep(0.4, 0.8, fbmT(sp * 1.7 + 3.0))) * gas * light * (0.6 + pow(ridged(sp * 2.4), 4.0) * 1.8)
     + uC3 * pow(hot, 3.0) * 2.4;
  float lane = smoothstep(0.55, 0.78, ridged(p * 1.1 + uSeed + 4.0)) * smoothstep(0.95, 0.3, r);
  ab = gas * 0.6 + lane * 7.0;
#endif
  return vec4(em, ab);
}

void main(){
  vec3 ro = uCamL / uRadius;
  vec3 rd = normalize(vPosL - uCamL);
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float h = b * b - c;
  if (h < 0.0) discard;
  float sq = sqrt(h);
  float t0 = max(-b - sq, 0.0);
  float t1 = -b + sq;
  float dt = (t1 - t0) / float(STEPS);
  // Per-pixel jitter of the first sample turns step banding into fine grain the eye ignores. Interleaved
  // gradient noise: the usual sin-hash loses precision at large pixel coordinates and drew faint lines.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t = t0 + dt * jitter;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  for (int i = 0; i < STEPS; i++) {
    vec4 s = sampleNebula(ro + rd * t);
    // Exact integration of emission over a step with constant absorption.
    float att = exp(-s.a * dt);
    float k = s.a > 1e-4 ? (1.0 - att) / s.a : dt;
    col += trans * s.rgb * k;
    trans *= att;
    if (trans < 0.01) break;
    t += dt;
  }
  gl_FragColor = vec4(col * uI, 1.0 - trans);
}
`
