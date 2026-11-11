/**
 * Equirectangular map lookup matching three's SphereGeometry UV layout, without the seam artefact:
 * atan() jumps at the antimeridian, which would make the GPU pick the smallest mip on that column.
 */
export const GLSL_EQUIRECT = /* glsl */`
vec3 sampleEquirect(sampler2D map, vec3 d){
  float u = atan(d.z, -d.x) / 6.2831853;
  float u0 = fract(u);
  float u1 = fract(u + 0.5) - 0.5;
  float v = 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265;
  vec2 dx = vec2(dFdx(u0), dFdx(v));
  vec2 dy = vec2(dFdy(u0), dFdy(v));
  vec2 dx1 = vec2(dFdx(u1), dFdx(v));
  vec2 dy1 = vec2(dFdy(u1), dFdy(v));
  bool seam = abs(dx.x) + abs(dy.x) > abs(dx1.x) + abs(dy1.x);
  return textureGrad(map, vec2(u0, v), seam ? dx1 : dx, seam ? dy1 : dy).rgb;
}
`
