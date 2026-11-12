import type { IUniform } from 'three'

/**
 * Final screen pass: film grain (after tone mapping, also breaks banding) and vignette.
 */
export const FINISH_SHADER: { uniforms: Record<string, IUniform>; vertexShader: string; fragmentShader: string } = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.02 }, uVig: { value: 0.55 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVig; varying vec2 vUv;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // Grain is added after tone mapping so it stays uniform in shadows; it also breaks gradient banding.
      c.rgb += (h12(gl_FragCoord.xy + fract(uTime) * 917.0) - 0.5) * uGrain;
      vec2 q = vUv - 0.5;
      c.rgb *= mix(1.0, smoothstep(0.95, 0.25, length(q * vec2(1.0, 0.82))), uVig);
      gl_FragColor = c;
    }`,
}

/**
 * Guard between the scene and the bloom: replaces NaN and infinite pixels with black and caps HDR values below
 * the half-float limit. The bloom blurs through a mip chain, so one invalid pixel would otherwise turn into
 * black blocks across the frame. Shaders should never produce such values; this keeps a slip from showing.
 */
export const SANITIZE_SHADER = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse;
varying vec2 vUv;
/** Below the half-float maximum (65504), leaving room for the bloom's additions. */
#define HDR_CAP 16000.0
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  bvec4 bad = bvec4(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b), isnan(c.a) || isinf(c.a));
  gl_FragColor = any(bad) ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, 0.0, HDR_CAP);
}
`,
}
