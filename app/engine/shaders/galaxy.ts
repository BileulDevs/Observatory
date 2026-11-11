/**
 * Galaxy point clouds: stars (additive) and dust (subtractive). Sizes are in world units and shrink with
 * distance, so the galaxy keeps its structure when zooming; points under a pixel fade instead of popping.
 */
export const GALAXY_VERT = /* glsl */`
attribute vec3 aColor;
attribute float aSize;
uniform float uPR;
uniform float uViewH;
uniform float uI;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // World size → pixels: projected with the vertical focal length.
  float px = aSize * uViewH * projectionMatrix[1][1] * 0.5 / max(-mv.z, 0.001) * uPR;
  // Below ~1.5 px a point cannot get smaller: dim it by its area instead, so dense regions keep their brightness.
  float clampPx = max(px, 1.5);
  vColor = aColor * uI * min(1.0, (px * px) / (clampPx * clampPx));
  gl_PointSize = clampPx;
}
`

export const GALAXY_FRAG = /* glsl */`
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 16.0);
  gl_FragColor = vec4(vColor * a, 1.0);
}
`

/** Soft glow billboard for the bulge: a few huge points cannot produce a smooth core. */
export const GLOW_VERT = /* glsl */`
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const GLOW_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uI;
uniform vec2 uStretch;
varying vec2 vUv;
void main(){
  vec2 c = (vUv - 0.5) * 2.0 / uStretch;
  float r2 = dot(c, c);
  // Two scales: a tight nucleus over a broad halo, as in real bulge light profiles.
  float g = exp(-r2 * 14.0) * 1.2 + exp(-r2 * 3.0) * 0.35;
  gl_FragColor = vec4(uColor * uI * g * (1.0 - smoothstep(0.7, 1.0, sqrt(r2))), 1.0);
}
`
