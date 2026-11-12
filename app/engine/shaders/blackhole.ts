import { GLSL_BLACKBODY, GLSL_SKY_STARS } from './common'
import { GLSL_NOISE } from './noise'

/**
 * Black hole impostor: a sphere around the hole in which every pixel traces a light ray bent by gravity.
 * Units: the Schwarzschild radius is 1. The ray follows the photon equation of a Schwarzschild metric written
 * in Cartesian form, a = -1.5 h² x / r⁵ (h = |x × v|), which reproduces the shadow, the photon ring and the
 * lensed back of the disk seen above and below the hole. The disk is thin, in the y = 0 plane.
 */
export const BLACKHOLE_VERT = /* glsl */`
varying vec3 vPosL;
void main(){
  vPosL = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const BLACKHOLE_FRAG = /* glsl */`
${GLSL_NOISE}
${GLSL_BLACKBODY}
${GLSL_SKY_STARS}
uniform samplerCube uSky;
uniform vec3 uCamL;
uniform mat3 uToWorld;
uniform float uRadius;
uniform float uTime;
uniform float uDiskIn;
uniform float uDiskOut;
uniform float uDiskT;
uniform float uDiskI;
uniform float uSeed;
varying vec3 vPosL;

/**
 * Deflection is faded out over the outer part of the sphere, so the ray leaves it straight and the sky outside
 * lines up with the backdrop. Physically wrong far from the hole, invisible in practice (the bend there is
 * a fraction of a degree), and it removes the seam a sharp cut-off would leave.
 */
#define BEND_FADE_START 0.5

vec4 disk(vec3 q, vec3 v){
  float r = length(q.xz);
  float x = r / uDiskIn;
  // Thin-disk temperature profile (Shakura–Sunyaev, zero torque at the inner edge), scaled so it peaks near uDiskT.
  float prof = pow(x, -0.75) * pow(max(1.0 - sqrt(1.0 / x), 0.0), 0.25) * 2.05;
  // Keplerian speed in units of c for M = 0.5 (rs = 1), capped below the photon orbit where it would diverge.
  float vel = min(sqrt(0.5 / max(r - 1.0, 0.05)), 0.75);
  vec3 tang = normalize(vec3(-q.z, 0.0, q.x));
  float gamma = 1.0 / sqrt(1.0 - vel * vel);
  // Light reaching the camera travels against the ray: Doppler factor for an emitter moving along tang.
  float doppler = 1.0 / (gamma * (1.0 - vel * dot(tang, -v)));
  float g = doppler * sqrt(max(1.0 - 1.0 / r, 0.0));

  // Turbulent streaks carried round at the local orbital speed. Two phases cross-faded so the differential
  // rotation never winds the pattern into a solid ring.
  float omega = vel / r * 0.9;
  float ang = atan(q.z, q.x);
  float cycle = 6.0;
  float t0 = fract(uTime / cycle);
  float t1 = fract(uTime / cycle + 0.5);
  float w = abs(t0 * 2.0 - 1.0);
  // Coarse along the orbit, fine across it: gas is sheared into long thin arcs, not clouds.
  float lr = log(r);
  vec2 pa = vec2(cos(ang - omega * t0 * cycle), sin(ang - omega * t0 * cycle)) * 1.6;
  vec2 pb = vec2(cos(ang - omega * t1 * cycle), sin(ang - omega * t1 * cycle)) * 1.6;
  float na = fbm(vec3(pa, lr * 16.0 + uSeed), 5);
  float nb = fbm(vec3(pb, lr * 16.0 + uSeed + 7.0), 5);
  float turb = mix(na, nb, w) * 0.5 + 0.5;
  float rings = 0.88 + 0.12 * sin(lr * 60.0 + turb * 5.0);

  float edge = smoothstep(uDiskIn, uDiskIn * 1.15, r) * (1.0 - smoothstep(uDiskOut * 0.6, uDiskOut, r));
  float alpha = clamp(edge * (0.45 + 0.6 * turb) * rings, 0.0, 0.96);
  vec3 col = blackbody(uDiskT * prof * g) * pow(g, 3.0) * prof * prof * uDiskI * (0.5 + turb);
  return vec4(col * 3.2, alpha);
}

void main(){
  vec3 ro = uCamL;
  vec3 rd = normalize(vPosL - uCamL);
  float b = dot(ro, rd);
  float c = dot(ro, ro) - uRadius * uRadius;
  float hh = b * b - c;
  if (hh < 0.0) discard;
  vec3 p = ro + rd * max(-b - sqrt(hh), 0.0);
  vec3 v = rd;
  vec3 hv = cross(p, v);
  float h2 = dot(hv, hv);

  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  for (int i = 0; i < STEPS; i++) {
    float r = length(p);
    if (r < 1.0) { captured = true; break; }
    if (r > uRadius * 1.001 && dot(p, v) > 0.0) break;
    // Small steps near the hole, where the path bends; long ones far out.
    float dt = clamp(r * 0.08, 0.02, 1.2);
    float bend = 1.0 - smoothstep(uRadius * BEND_FADE_START, uRadius, r);
    vec3 acc = -1.5 * h2 * p / pow(r, 5.0) * bend;
    vec3 pn = p + v * dt + 0.5 * acc * dt * dt;
    float rn = length(pn);
    float bendN = 1.0 - smoothstep(uRadius * BEND_FADE_START, uRadius, rn);
    vec3 accN = -1.5 * h2 * pn / pow(max(rn, 0.5), 5.0) * bendN;
    v = normalize(v + 0.5 * (acc + accN) * dt);
    if (p.y * pn.y < 0.0) {
      vec3 q = mix(p, pn, p.y / (p.y - pn.y));
      float rq = length(q.xz);
      if (rq > uDiskIn && rq < uDiskOut) {
        vec4 d = disk(q, v);
        col += trans * d.rgb * d.a;
        trans *= 1.0 - d.a;
        if (trans < 0.02) break;
      }
    }
    p = pn;
  }

  // Sky seen through the lens. Near the sphere edge the ray is straight: hand over to the real backdrop there,
  // so its sprite stars take over from the procedural ones without a visible seam.
  float skyAlpha = 0.0;
  if (!captured) {
    vec3 wd = normalize(uToWorld * v);
    vec3 sky = textureCube(uSky, wd).rgb * 0.1 + skyStars(wd) * 0.9;
    float deflect = 1.0 - dot(rd, v);
    skyAlpha = smoothstep(0.00002, 0.0015, deflect);
    col += trans * sky * skyAlpha;
  }
  float cover = captured ? 1.0 : skyAlpha;
  // Premultiplied output: disk light + lensed sky, over whatever the backdrop drew.
  gl_FragColor = vec4(col, 1.0 - trans * (1.0 - cover));
}
`

/** Relativistic jet: an additive cone with plasma knots streaming outwards. */
export const JET_VERT = /* glsl */`
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

export const JET_FRAG = /* glsl */`
${GLSL_NOISE}
uniform vec3 uColor;
uniform float uI;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 V = normalize(cameraPosition - vPosW);
  // Bright along the axis, fading to the cone's silhouette: reads as a glowing column, not a hollow shell.
  float core = pow(abs(dot(normalize(vNW), V)), 2.2);
  // ConeGeometry's uv.y is 1 at the apex (the hole) and 0 at the open end.
  float along = 1.0 - vUv.y;
  float knots = fbm(vec3(vUv.x * 6.0, along * 10.0 - uTime * 0.9, 3.0), 4) * 0.5 + 0.5;
  float fade = smoothstep(0.0, 0.05, along) * pow(max(1.0 - along, 0.0), 1.6);
  vec3 col = uColor * uI * core * fade * (0.35 + 1.4 * knots * knots);
  gl_FragColor = vec4(col, 1.0);
}
`

/** Gas stream from a companion star to the disk: point sprites flowing along a fixed path. */
export const STREAM_VERT = /* glsl */`
attribute float aT;
attribute float aSize;
uniform float uTime;
uniform float uPR;
varying float vFade;
void main(){
  vFade = sin(3.14159 * fract(aT + uTime * 0.04));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPR * (300.0 / max(gl_Position.w, 1.0));
}
`

export const STREAM_FRAG = /* glsl */`
uniform vec3 uColor;
varying float vFade;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 18.0) * vFade;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`
