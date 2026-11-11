/**
 * GLSL helpers shared by the catalogue objects.
 */

/**
 * Approximate black-body colour for a temperature in kelvin (Tanner Helland's fit), in linear RGB.
 * Good from ~1,000 K to 40,000 K; the shape matters more than exact chromaticity here.
 */
export const GLSL_BLACKBODY = /* glsl */`
vec3 blackbody(float kelvin){
  float t = clamp(kelvin, 1000.0, 40000.0) / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(t - 60.0, -0.1332048), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0) : clamp(1.1298909 * pow(t - 60.0, -0.0755148), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.5432068 * log(t - 10.0) - 1.1962541, 0.0, 1.0));
  return pow(c, vec3(2.2));
}
`

/**
 * Procedural point stars on the sky sphere, for directions the lensing bends: the backdrop's own stars are
 * sprites and cannot be bent. Two cell sizes give bright sparse stars and a fainter dense field.
 */
export const GLSL_SKY_STARS = /* glsl */`
float starCell(vec3 d, float scale, float density){
  vec3 q = d * scale;
  vec3 i = floor(q);
  vec3 h = hash33(i + 17.0);
  if (h.x > density) return 0.0;
  vec3 c = i + 0.25 + 0.5 * hash33(i + 3.1);
  float dist = length(q - c);
  // Point spread: a fixed angular size, so stars stay sharp at any zoom.
  return exp(-dist * dist * 90.0) * (0.25 + 1.6 * h.y * h.y * h.y);
}
vec3 skyStars(vec3 d){
  float s = starCell(d, 140.0, 0.03) + 0.5 * starCell(d, 320.0, 0.035);
  vec3 tint = mix(vec3(1.0, 0.86, 0.72), vec3(0.75, 0.85, 1.0), hash33(floor(d * 140.0)).z);
  return tint * s;
}
`
