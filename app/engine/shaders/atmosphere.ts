/**
 * Single-scattering atmosphere (Rayleigh + Mie), ray-marched per pixel on a shell around the planet.
 */
export const ATMO_FRAG = /* glsl */`
#ifndef STEPS
#define STEPS 14
#endif
#define LSTEPS 5
uniform vec3 uSunW;
uniform float uRp;
uniform float uRa;
uniform float uHR;
uniform float uHM;
uniform vec3 uKR;
uniform vec3 uKM;
uniform float uG;
uniform float uI;
// The ray-sphere maths assume a planet at the origin: everything is expressed relative to its centre.
uniform vec3 uCenter;
// World units per planet radius: the march runs in planet-radius units.
uniform float uScale;
varying vec3 vPosW;

vec2 rsi(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(1e5, -1e5);
  float s = sqrt(disc);
  return vec2(-b - s, -b + s);
}
float dens(float hgt, float H){ return exp(min(-hgt / H, 40.0)); }

void main(){
  vec3 ro = (cameraPosition - uCenter) / uScale;
  vec3 rd = normalize(vPosW - cameraPosition);
  vec3 L = normalize(uSunW);
  vec2 pa = rsi(ro, rd, uRa);
  if (pa.x > pa.y) discard;
  vec2 pp = rsi(ro, rd, uRp);
  float t1 = pa.y;
  if (pp.x < pp.y && pp.x > 0.0) t1 = min(t1, pp.x);
  float t0 = max(pa.x, 0.0);
  float ds = (t1 - t0) / float(STEPS);
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float odR = 0.0, odM = 0.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 pos = ro + rd * (t0 + ds * (float(i) + 0.5));
    float hgt = length(pos) - uRp;
    float dr = dens(hgt, uHR) * ds;
    float dm = dens(hgt, uHM) * ds;
    odR += dr; odM += dm;
    // Light path to the sun. Going through the planet hits huge densities, which gives a soft shadow for free.
    float dsl = rsi(pos, L, uRa).y / float(LSTEPS);
    float lR = 0.0, lM = 0.0;
    for (int j = 0; j < LSTEPS; j++) {
      vec3 lp = pos + L * dsl * (float(j) + 0.5);
      float lh = length(lp) - uRp;
      lR += dens(lh, uHR) * dsl;
      lM += dens(lh, uHM) * dsl;
    }
    vec3 att = exp(-(uKR * (odR + lR) + uKM * 1.1 * (odM + lM)));
    sumR += dr * att;
    sumM += dm * att;
  }
  float mu = dot(rd, L);
  float pR = 3.0 / (16.0 * 3.14159) * (1.0 + mu * mu);
  float g2 = uG * uG;
  float pM = 3.0 / (8.0 * 3.14159) * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * mu * uG, 1.5));
  vec3 col = uI * (pR * uKR * sumR + pM * uKM * sumM);
  gl_FragColor = vec4(col, 1.0);
}
`
