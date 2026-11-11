import { GLSL_NOISE } from './noise'

/**
 * Neutron star surface: a 10 km ball at a million kelvin, drawn as a blue-white plasma with brighter magnetic
 * polar caps (where the beams are rooted) and limb darkening. Magnetars get a hotter, cracked crust.
 */
export const NEUTRON_VERT = /* glsl */`
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vPosO = position;
  vNW = normalize(mat3(modelMatrix) * normal);
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosW, 1.0);
}
`

export const NEUTRON_FRAG = /* glsl */`
${GLSL_NOISE}
uniform vec3 uColor;
uniform float uTime;
uniform float uMagnetar;
varying vec3 vPosO;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 d = normalize(vPosO);
  float n = fbm(d * 5.0 + vec3(0.0, uTime * 0.15, 0.0), 5) * 0.5 + 0.5;
  // Polar caps on the magnetic axis (object y): heated by particles falling along the field lines.
  float cap = pow(abs(d.y), 14.0);
  vec3 base = mix(uColor * 0.9, vec3(1.0), 0.55) * (0.75 + 0.5 * n);
  float cracks = uMagnetar * smoothstep(0.82, 0.97, 1.0 - abs(snoise(d * 7.0)));
  vec3 col = base + vec3(1.0, 0.95, 0.9) * cap * 3.0 + vec3(1.0, 0.6, 0.35) * cracks * 2.5;
  vec3 V = normalize(cameraPosition - vPosW);
  float mu = max(dot(normalize(vNW), V), 0.0);
  col *= 0.45 + 0.55 * pow(mu, 0.5);
  gl_FragColor = vec4(col * 2.4, 1.0);
}
`
