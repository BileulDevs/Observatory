import { GLSL_RING_DENSITY } from './ringDensity'

/**
 * Planetary ring material: procedural radial density, planet shadow and forward scattering.
 */
export const RING_VERT = /* glsl */`
varying vec3 vPosL;
varying vec3 vPosW;
void main(){
  vPosL = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const RING_FRAG = /* glsl */`
${GLSL_RING_DENSITY}
uniform vec3 uSunW;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uRingN;
uniform vec3 uR0;
uniform vec3 uR1;
uniform vec3 uAmb;
uniform vec3 uCenter;
uniform float uScale;
varying vec3 vPosL;
varying vec3 vPosW;
void main(){
  float r = length(vPosL.xy);
  float dens = ringDensity(r, fwidth(r));
  if (dens < 0.003) discard;
  vec3 L = normalize(uSunW);
  // Relative to the planet centre: the shadow test assumes a unit sphere at the origin.
  vec3 P = (vPosW - uCenter) / uScale;
  // Planet shadow on the rings: closest approach of the sun ray to the planet centre.
  float b = dot(P, L);
  float closest = sqrt(max(dot(P, P) - b * b, 0.0));
  float sh = b < 0.0 ? smoothstep(0.96, 1.04, closest) : 1.0;
  vec3 V = normalize(cameraPosition - vPosW);
  float fwd = pow(max(dot(-V, L), 0.0), 8.0);
  float lit = 0.3 + 0.7 * abs(dot(uRingN, L));
  vec3 col = mix(uR1, uR0, rNoise(r * 63.0) * 0.6 + 0.4 * rNoise(r * 211.0));
  // Thin regions forward-scatter more light than dense ones, as seen in Cassini backlit shots.
  col *= uSunColor * uSunI * sh * (lit * 0.55 + fwd * (1.0 - dens) * 2.0) + uAmb;
  float a = dens * 0.92;
  gl_FragColor = vec4(col * a, a);
}
`
