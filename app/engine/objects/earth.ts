import { SRGBColorSpace, TextureLoader, type Texture } from 'three'

/**
 * The Earth map and atmosphere rim shared by every view that shows our planet (low-orbit spacecraft in the
 * catalogue, the exploit scenes). One download, one GPU upload, released when the last user goes.
 */

const EARTH_TEXTURE = '/textures/solar/earth.jpg'

let earthTexture: Texture | null = null
let earthUsers = 0
let earthLoaded: Promise<void> | null = null
const earthWaiting = new Set<() => void>()

/**
 * The Earth map (2048 × 1024). Redraw callbacks run once it has arrived: four catalogue thumbnails used to
 * download, decode and upload it four times before it was shared.
 */
export function acquireEarthTexture(invalidate: () => void): Texture {
  earthUsers++
  if (!earthTexture) {
    let done: () => void = () => {}
    earthLoaded = new Promise<void>((resolve) => { done = resolve })
    earthTexture = new TextureLoader().load(EARTH_TEXTURE, () => {
      earthWaiting.forEach((f) => f())
      earthWaiting.clear()
      done()
    }, undefined, () => {
      // A missing map must not block a scene that waits for it: it simply shows untextured.
      console.error('[space] Earth texture failed to load')
      done()
    })
    earthTexture.colorSpace = SRGBColorSpace
    earthTexture.anisotropy = 8
  }
  if (!earthTexture.image) earthWaiting.add(invalidate)
  return earthTexture
}

/** Resolves when the shared map has arrived (or failed). Call after acquireEarthTexture. */
export function earthTextureLoaded(): Promise<void> {
  return earthLoaded ?? Promise.resolve()
}

export function releaseEarthTexture(): void {
  earthUsers = Math.max(0, earthUsers - 1)
  if (earthUsers > 0 || !earthTexture) return
  earthTexture.dispose()
  earthTexture = null
  earthLoaded = null
  earthWaiting.clear()
}

/**
 * Atmosphere rim: a back-faced shell slightly larger than the globe, lit on the day side. `uI` sets its strength:
 * 1.6 seen from far (catalogue spacecraft), less from low orbit, where the rim fills much more of the frame.
 */
export const EARTH_ATMO_FAR = 1.6
export const EARTH_ATMO_VERT = /* glsl */`
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vNW = normalize(mat3(modelMatrix) * normal);
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosW, 1.0);
}
`
export const EARTH_ATMO_FRAG = /* glsl */`
uniform vec3 uSun;
uniform float uI;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 N = normalize(vNW);
  // Seen from inside the shell (back faces): brightest just above the limb, on the day side.
  float limb = pow(max(1.0 - abs(dot(N, V)), 0.0), 3.0);
  float day = smoothstep(-0.25, 0.4, dot(-N, uSun));
  gl_FragColor = vec4(vec3(0.32, 0.55, 1.0) * limb * day * uI, 1.0);
}
`
