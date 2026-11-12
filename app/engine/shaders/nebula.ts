/**
 * Volumetric nebula in two stages:
 * 1. bake: the smooth noise inputs of the field (up to four layers, ~20 texture fetches per point) are evaluated
 *    once into a 3D texture, one slice per draw;
 * 2. render: a front-to-back ray-march through the sphere reads them back, one fetch per step, and turns them
 *    into emission and absorption with cheap arithmetic.
 * Evaluating the noise at every step of every pixel, as before, cost ~20 texture fetches per step and stalled
 * even fast GPUs at full-screen sizes.
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

/** Noise library and the field's smooth inputs, for the bake (and n3() for the runtime knots). Needs SHAPE. */
const GLSL_NEBULA_INPUTS = /* glsl */`
#ifndef SQ_DEFINED
#define SQ_DEFINED
// x², for squares whose base can be negative: GLSL leaves pow(x, y) undefined for x < 0 and some GPUs
// (Direct3D through ANGLE) return NaN, which the bloom then spreads into black blocks.
float sq(float x){ return x * x; }
#endif
precision highp sampler3D;
uniform sampler3D uNoise;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uSeed;

/**
 * Rotation applied at every octave. Value noise from a texture is aligned with the texture axes; without it the
 * ridged layers line up into a visible grid.
 */
const mat3 OCT_R = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float n3(vec3 p){ return texture(uNoise, OCT_R * p).r; }
// Octaves lo … hi−1 only (sums are linear, so a field can be split between bake and runtime). Octaves outside
// the range cost no fetch, only the coordinate transform.
float fbmPart(vec3 p, int lo, int hi){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= lo && i < hi) s += a * n3(p);
    p = OCT_R * p * 2.03 + vec3(0.171, 0.313, 0.071); a *= 0.5;
  }
  return s / 0.96875;
}
float ridgedPart(vec3 p, int lo, int hi){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i >= lo && i < hi) s += a * (1.0 - abs(n3(p) * 2.0 - 1.0));
    p = OCT_R * p * 2.07 + vec3(0.29, 0.11, 0.53); a *= 0.5;
  }
  return s / 0.9375;
}
float fbmT(vec3 p){ return fbmPart(p, 0, 5); }
float ridged(vec3 p){ return ridgedPart(p, 0, 4); }

/**
 * Octaves finer than the baked volume resolves (cells under ~1.5 voxels at 160³), evaluated per step where
 * they shape a thin feature: the Crab's filaments, the Pillars' eroded surface. Baked, they alias into
 * axis-aligned blocks once thresholded; dropped, the features turn blobby.
 */
float crabWebFine(vec3 sp){ return ridgedPart(sp * 1.5 + 2.0, 2, 4); }
// Each part is centred on its own mean (sum of its octave weights × 0.5 / 0.96875), as the full fbm was on
// 0.5: an uncentred part would thicken or thin every column. Six fetches, on the surface band only.
float pillarWobFine(vec3 sp){
  return (fbmPart(sp * 2.4, 2, 5) - 0.1129) * 0.26 + (fbmPart(sp * 6.0 + 3.0, 0, 3) - 0.4516) * 0.045;
}

/**
 * Pillars: distance to the three eroded columns (negative inside), with only the two coarse octaves of the
 * erosion; the rest (pillarWobFine) is added at render time. The two finest octaves of the small-scale erosion
 * (under 1/10 of its amplitude) are left out altogether.
 */
float pillars(vec3 p, vec3 sp){
  float wob = (fbmPart(sp * 2.4, 0, 2) - 0.3871) * 0.26;
  vec2 c1 = vec2(-0.42 + 0.06 * p.y, 0.0), c2 = vec2(0.02, -0.05), c3 = vec2(0.42, 0.02);
  float d1 = max(length(p.xz - c1) - mix(0.2, 0.08, smoothstep(-1.0, 0.6, p.y)) + wob, p.y - 0.62 + wob * 0.6);
  float d2 = max(length(p.xz - c2) - mix(0.15, 0.06, smoothstep(-1.0, 0.25, p.y)) + wob, p.y - 0.25 + wob * 0.6);
  float d3 = max(length(p.xz - c3) - mix(0.12, 0.05, smoothstep(-1.0, -0.05, p.y)) + wob, p.y + 0.05 + wob * 0.6);
  return min(d1, min(d2, d3));
}

/**
 * Smooth inputs of the field at p: the noise layers each shape needs, before any sharp thresholding. These
 * are what gets baked. Trilinear filtering of smooth values, then thresholding at render time, keeps edges as
 * sharp as evaluating everything per step (the same idea as signed-distance-field fonts); baking the final
 * emission instead blurs every filament to the voxel size.
 */
vec4 nebulaInputs(vec3 p){
  vec3 sp = p * 1.15 + uSeed;
  float n = fbmT(sp);
#if SHAPE == 0
  return vec4(n, fbmT(sp * 3.1 + 5.0), ridged(sp * 2.2), fbmT(p * 1.6 + uSeed + 9.0));
#elif SHAPE == 1
  return vec4(n, ridged(sp * 3.0), ridged(sp * 5.0), ridged(sp * 2.0));
#elif SHAPE == 2
  return vec4(n, ridged(sp * 2.6), 0.0, 0.0);
#elif SHAPE == 3
  return vec4(ridgedPart(sp * 1.5 + 2.0, 0, 2), fbmT(sp * 0.8 + 8.0), fbmT(sp * 1.2 + 1.0), 0.0);
#elif SHAPE == 4
  return vec4(pillars(p, sp), n, fbmT(sp * 2.2 + 6.0), 0.0);
#else
  return vec4(n * 0.65 + fbmT(sp * 2.9 + 4.0) * 0.5, fbmT(sp * 1.7 + 3.0), ridged(sp * 2.4), ridged(p * 1.1 + uSeed + 4.0));
#endif
}
`

/**
 * Emission colour (rgb) and absorption (a) per unit length at p (|p| ≤ 1), from the baked inputs i. Everything
 * here is cheap arithmetic, except the Helix's cometary knots and the Pillars' lit side, which need fetches.
 * Needs SHAPE defined, GLSL_NEBULA_NOISE, and vol(p) returning the baked inputs.
 */
const GLSL_NEBULA_SHADE = /* glsl */`
vec4 shadeNebula(vec3 p, vec4 i){
  float r = length(p);
  vec3 em = vec3(0.0);
  float ab = 0.0;
#if SHAPE == 0
  // Orion: a gas wall behind, a hollow blown open towards us by the Trapezium stars near the centre.
  float n = i.x;
  vec3 star = vec3(0.05, 0.02, 0.05);
  float cavity = smoothstep(0.1, 0.5, length((p - vec3(0.05, 0.0, 0.32)) * vec3(1.0, 1.3, 0.8)));
  float gas = smoothstep(1.0, 0.35, r) * cavity * smoothstep(0.42, 0.78, n * 0.7 + i.y * 0.45);
  float light = 0.2 / (dot(p - star, p - star) + 0.05);
  float hot = exp(-length(p - star) * 3.4);
  float ridge = pow(i.z, 5.0);
  em = (mix(uC1, uC2, hot * 1.3) * (0.5 + ridge * 2.2)) * gas * light + uC3 * hot * hot * 2.0 * smoothstep(0.35, 0.7, n);
  float lane = smoothstep(0.56, 0.74, i.w) * smoothstep(-0.1, 0.4, p.z) * smoothstep(0.95, 0.4, r);
  ab = gas * 0.5 + lane * 8.0;
#elif SHAPE == 1
  // Ring: a barrel of gas seen down its axis (z): hot oxygen inside, a hydrogen/nitrogen rim, faint outer loops.
  float rho = length(p.xy * vec2(1.0, 1.22));
  float clump = 0.45 + 0.8 * i.y;
  float barrel = exp(-sq((rho - 0.5) / 0.09)) * smoothstep(0.7, 0.2, abs(p.z)) * clump;
  float rim = exp(-sq((rho - 0.6) / 0.05)) * smoothstep(0.6, 0.15, abs(p.z)) * (0.4 + i.z);
  float fill = smoothstep(0.48, 0.1, rho) * smoothstep(0.5, 0.1, abs(p.z)) * (0.55 + 0.45 * i.x);
  float halo = exp(-sq((rho - 0.82) / 0.08)) * i.w * i.w * i.w;
  em = mix(uC3, uC2, 0.55) * barrel * 0.9 + uC1 * rim * 1.1 + uC2 * fill * 0.22 + uC1 * halo * 0.25;
  ab = barrel * 0.6 + rim * 0.6;
#elif SHAPE == 2
  // Helix: a thick ring with an inner oxygen disk and thousands of radial cometary knots at its inner edge.
  float rho = length(p.xy);
  float ring = exp(-sq((rho - 0.56) / 0.16)) * smoothstep(0.55, 0.1, abs(p.z + 0.15 * p.x)) * (0.35 + i.y);
  // The knots are a fraction of a voxel wide: evaluated here, and only inside the band where they can appear.
  float knots = 0.0;
  if (rho > 0.32 && rho < 0.62 && abs(p.z) < 0.3) {
    float ang = atan(p.y, p.x);
    float knotsN = n3(vec3(ang * 9.0, rho * 5.0, uSeed + 0.3)) * (0.6 + 0.6 * n3(vec3(ang * 3.0, 0.5, uSeed + 2.0)));
    knots = smoothstep(0.62, 0.85, knotsN) * smoothstep(0.32, 0.42, rho) * smoothstep(0.62, 0.48, rho) * smoothstep(0.3, 0.0, abs(p.z));
  }
  float inner = smoothstep(0.45, 0.0, rho) * smoothstep(0.35, 0.0, abs(p.z)) * (0.5 + 0.5 * i.x);
  em = mix(uC2, uC1, smoothstep(0.38, 0.62, rho)) * ring * 0.9 + uC2 * inner * 0.3 + uC3 * knots * 0.9;
  ab = ring * 0.4 + knots * 3.0;
#elif SHAPE == 3
  // Crab: a cage of orange and green filaments concentrated in the outer shell, around a smooth blue
  // synchrotron glow. Low noise frequencies: finer ridges average out along the ray into a uniform haze.
  vec3 q = p / vec3(1.0, 0.72, 0.82);
  float rq = length(q);
  float shell = smoothstep(0.5, 0.78, rq) * smoothstep(1.0, 0.86, rq);
  // Below 0.8 − 0.2 (the most the two fine octaves add) no filament can appear: skip their fetches there.
  float web = i.x > 0.6 ? i.x + crabWebFine(p * 1.15 + uSeed) : i.x;
  float fil = smoothstep(0.8, 0.94, web) * shell + smoothstep(0.86, 0.97, web) * smoothstep(0.86, 0.3, rq) * 0.35;
  float sync = exp(-rq * rq * 3.2) * (0.55 + 0.45 * i.y);
  em = mix(uC1, uC3, smoothstep(0.35, 0.75, i.z)) * fil * 4.0 + mix(uC2, vec3(0.85, 0.9, 1.0), 0.35) * sync * 0.45;
  ab = fil * 2.5;
#elif SHAPE == 4
  // Pillars: three eroded dust columns, black inside, glowing only where their surface faces the massive stars
  // above them, in front of a blue-green emission background.
  // Fine erosion only near the surface, where it changes the outline.
  float fine = abs(i.x) < 0.08 ? pillarWobFine(p * 1.15 + uSeed) : 0.0;
  float d = i.x + fine;
  float dust = smoothstep(0.015, -0.03, d);
  float skin = smoothstep(0.03, 0.0, d) * smoothstep(-0.05, 0.0, d);
  float facing = 0.0;
  // Facing the light when the point just outside, towards the stars, is outside the column too: one more volume
  // fetch, plus the fine erosion of this point (4.5% of the volume away it barely differs). Evaluating the fine
  // erosion again at the offset point doubled the cost of every skin sample, the Pillars' worst frame times.
  if (skin > 0.0) {
    vec3 q = p + normalize(vec3(0.15, 1.0, 0.25)) * 0.045;
    facing = smoothstep(0.0, 0.03, vol(q).x + fine);
  }
  float back = smoothstep(1.0, 0.2, r) * smoothstep(0.38, 0.72, i.y) * smoothstep(0.25, -0.6, p.z);
  em = uC2 * back * 0.55 + mix(uC1, uC3, 0.5) * skin * facing * (1.0 + 2.2 * i.z) + vec3(0.05, 0.035, 0.025) * dust * 0.15;
  ab = dust * 26.0 + back * 0.4;
#else
  // Carina: a huge clumpy complex, glowing cavities, dark dust lanes and a bright knot around Eta Carinae.
  vec3 eta = vec3(0.18, 0.08, 0.0);
  float gas = smoothstep(1.0, 0.3, r) * smoothstep(0.36, 0.72, i.x);
  float light = 0.3 / (dot(p - eta, p - eta) + 0.1);
  float hot = exp(-length(p - eta) * 2.6);
  em = mix(uC1, uC2, smoothstep(0.4, 0.8, i.y)) * gas * light * (0.6 + pow(i.z, 4.0) * 1.8)
     + uC3 * pow(hot, 3.0) * 2.4;
  float lane = smoothstep(0.55, 0.78, i.w) * smoothstep(0.95, 0.3, r);
  ab = gas * 0.6 + lane * 7.0;
#endif
  return vec4(em, ab);
}
`

/** Full-screen quad for the bake: one slice of the volume per draw. */
export const NEBULA_BAKE_VERT = /* glsl */`
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }
`

/** Writes the inputs for slice uZ (−1 … 1) of the [−1, 1]³ cube, at voxel centres. */
export const NEBULA_BAKE_FRAG = /* glsl */`
${GLSL_NEBULA_INPUTS}
uniform float uZ;
uniform float uSize;
void main(){
  vec3 p = vec3(gl_FragCoord.xy / uSize * 2.0 - 1.0, uZ);
  // Evaluated outside the unit sphere too: filtering at the rim blends in those voxels, and an empty value
  // would mean something (a pillar surface at distance 0, for instance).
  // Four samples on a tetrahedron a quarter-voxel wide: pre-filters the finest octaves, which point sampling
  // would alias into noise that trilinear filtering then shows as blocks.
  float o = 0.5 / uSize;
  gl_FragColor = 0.25 * (
    nebulaInputs(p + vec3(o, o, o)) + nebulaInputs(p + vec3(o, -o, -o)) +
    nebulaInputs(p + vec3(-o, o, -o)) + nebulaInputs(p + vec3(-o, -o, o))
  );
}
`

/** Ray-march through the baked inputs. Needs SHAPE and STEPS defined. */
export const NEBULA_FRAG = /* glsl */`
${GLSL_NEBULA_INPUTS}
uniform sampler3D uVol;
uniform vec3 uCamL;
uniform float uRadius;
uniform float uI;
varying vec3 vPosL;
vec4 vol(vec3 p){ return texture(uVol, p * 0.5 + 0.5); }
${GLSL_NEBULA_SHADE}
void main(){
  vec3 ro = uCamL / uRadius;
  vec3 rd = normalize(vPosL - uCamL);
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float h = b * b - c;
  if (h < 0.0) discard;
  float sq_ = sqrt(h);
  float t0 = max(-b - sq_, 0.0);
  float t1 = -b + sq_;
  float dt = (t1 - t0) / float(STEPS);
  // Per-pixel jitter of the first sample turns step banding into fine grain the eye ignores. An integer hash
  // (PCG): the sin-hash loses precision at large pixel coordinates, and interleaved gradient noise is regular
  // enough to turn any aliasing along the ray into streaks instead of grain.
  uvec2 px = uvec2(gl_FragCoord.xy);
  uint hs = px.x * 747796405u + px.y * 2891336453u + 277803737u;
  hs = ((hs >> ((hs >> 28u) + 4u)) ^ hs) * 277803737u;
  hs = (hs >> 22u) ^ hs;
  float t = t0 + dt * (float(hs) / 4294967296.0);
  vec3 col = vec3(0.0);
  float trans = 1.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    vec4 s = shadeNebula(p, vol(p));
    // Exact integration over the step for constant emission and absorption.
    float att = exp(-s.a * dt);
    float w = s.a > 1e-4 ? (1.0 - att) / s.a : dt;
    col += trans * s.rgb * w;
    trans *= att;
    if (trans < 0.01) break;
    t += dt;
  }
  gl_FragColor = vec4(col * uI, 1.0 - trans);
}
`
