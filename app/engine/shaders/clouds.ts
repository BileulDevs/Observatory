/**
 * Cloud shell: baked coverage with dusk tint and a one-sample self-shadow.
 */
export const CLOUD_FRAG = /* glsl */`
uniform samplerCube uClouds;
uniform vec3 uSunW;
uniform vec3 uSunCO;
uniform vec3 uSunColor;
uniform float uSunI;
uniform vec3 uAmb;
uniform vec3 uTint;
uniform float uOpacity;
varying vec3 vPosO;
varying vec3 vPosW;
varying vec3 vNW;
void main(){
  vec3 d = normalize(vPosO);
  vec4 c = textureCube(uClouds, d);
  float cov = c.r;
  if (cov < 0.004) discard;
  vec3 Ng = normalize(vNW);
  float geo = dot(Ng, normalize(uSunW));
  // Cheap volume: if the cloud is thicker one step towards the sun, this point sits in its own shadow.
  float c2 = textureCube(uClouds, normalize(d + uSunCO * 0.006)).r;
  float self = 1.0 - clamp((c2 - cov) * 1.8 + c2 * 0.15, 0.0, 0.7);
  float term = smoothstep(-0.14, 0.3, geo);
  vec3 dusk = mix(vec3(1.0, 0.48, 0.22), vec3(1.0), smoothstep(-0.02, 0.32, geo));
  vec3 col = uTint * (uSunColor * uSunI * term * self * dusk * (0.45 + 0.55 * max(geo, 0.0)) * (0.85 + 0.3 * c.g) + uAmb);
  float a = cov * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`
