/**
 * Background: baked sky sphere and point stars.
 */
export const SKY_VERT = /* glsl */`
varying vec3 vPosO;
void main(){ vPosO = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

export const SKY_FRAG = /* glsl */`
uniform samplerCube uSky;
uniform float uI;
varying vec3 vPosO;
void main(){ gl_FragColor = vec4(textureCube(uSky, normalize(vPosO)).rgb * 0.1 * uI, 1.0); }
`

export const STAR_VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
uniform float uPR;
uniform float uI;
varying vec3 vColor;
void main(){
  vColor = aColor * uI;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPR;
}
`

export const STAR_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 22.0);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`
