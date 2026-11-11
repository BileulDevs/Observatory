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
