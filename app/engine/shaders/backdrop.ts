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
  // Pinned to the far plane: the star shell is only STAR_RADIUS away, so anything drawn beyond it (a backdrop
  // Earth or Moon thousands of units out) failed the depth test against nothing and the stars, drawn after the
  // opaque objects, showed through it. Just inside the far plane every surface occludes them (any object closer
  // than near × 1e6). Exactly w would let float rounding clip some stars at random: they would flicker.
  gl_Position.z = gl_Position.w * 0.999999;
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
