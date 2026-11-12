/**
 * Radial ring density, shared by the ring material and the planet surface (ring shadows).
 */
export const GLSL_RING_DENSITY = /* glsl */`
#ifndef SQ_DEFINED
#define SQ_DEFINED
// x², for squares whose base can be negative: GLSL leaves pow(x, y) undefined for x < 0 and some GPUs
// (Direct3D through ANGLE) return NaN, which the bloom then spreads into black blocks.
float sq(float x){ return x * x; }
#endif
uniform float uRingIn;
uniform float uRingOut;
uniform float uRingSeed;
float rHash(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float rNoise(float x){ float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(rHash(i + uRingSeed), rHash(i + 1.0 + uRingSeed), u); }
// fw = screen footprint of one pixel in radius units. Octaves finer than a pixel fade to their mean, otherwise they shimmer.
float ringDensity(float r, float fw){
  float span = uRingOut - uRingIn;
  float t = (r - uRingIn) / span;
  if (t < 0.0 || t > 1.0) return 0.0;
  float ft = fw / span;
  float o1 = rNoise(t * 12.0);
  float o2 = mix(rNoise(t * 41.0), 0.5, smoothstep(0.25, 1.0, ft * 41.0));
  float o3 = mix(rNoise(t * 157.0), 0.5, smoothstep(0.25, 1.0, ft * 157.0));
  float o4 = mix(rNoise(t * 530.0), 0.5, smoothstep(0.25, 1.0, ft * 530.0));
  float d = 0.5 * o1 + 0.27 * o2 + 0.15 * o3 + 0.08 * o4;
  d = smoothstep(0.2, 0.8, d);
  d *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t));
  d *= 1.0 - 0.96 * exp(-sq((t - 0.63) / 0.022));
  d *= 1.0 - 0.7 * exp(-sq((t - 0.87) / 0.007));
  d *= mix(0.45, 1.0, smoothstep(0.0, 0.35, t));
  return clamp(d, 0.0, 1.0);
}
`
