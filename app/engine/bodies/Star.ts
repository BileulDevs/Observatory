import {
  AdditiveBlending, CanvasTexture, Color, Group, Mesh, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial,
} from 'three'
import { blackbodyRgb } from '../../utils/blackbody'
import { STAR_SURFACE_FRAG, STAR_SURFACE_VERT } from '../shaders/star'

/** HDR brightness of the photosphere. Above ~2 ACES clips it to flat white and the granulation disappears; bloom adds the glow. */
const PHOTOSPHERE_INTENSITY = 1.15
/** Hue saturation exponent for the star colour (1 = raw black-body). Above ~2.5 the Sun turns visibly yellow. */
const STAR_SATURATION = 1.9
/** Halo sprite size relative to the star radius. */
const HALO_SCALE = 5
/** Halo strength; the sprite is additive, above ~0.8 it washes out nearby planets. */
const HALO_OPACITY = 0.4

/** Black-body colour of a temperature, as a three.js Color (see utils/blackbody.ts). */
export function blackbodyColor(kelvin: number, out = new Color()): Color {
  const [r, g, b] = blackbodyRgb(kelvin)
  return out.setRGB(r, g, b)
}

/** A star: procedural photosphere plus a soft additive halo. Owns and disposes its GPU resources. */
export class Star {
  readonly root = new Group()
  private readonly uniforms = {
    uColor: { value: new Color() },
    uIntensity: { value: PHOTOSPHERE_INTENSITY },
    uTime: { value: 0 },
    uSeed: { value: 0 },
  }
  private readonly body: Mesh<SphereGeometry, ShaderMaterial>
  private readonly halo: Sprite
  private readonly haloTexture: CanvasTexture

  constructor(temperatureK: number, radius: number, seed = 0) {
    blackbodyColor(temperatureK, this.uniforms.uColor.value)
    // Raising the channels to a power above 1 saturates the hue: tone mapping otherwise bleaches every star towards
    // white, and red dwarves would read as beige. The Sun stays a warm white.
    const c = this.uniforms.uColor.value
    c.setRGB(Math.pow(c.r, STAR_SATURATION), Math.pow(c.g, STAR_SATURATION), Math.pow(c.b, STAR_SATURATION))
    this.uniforms.uSeed.value = seed
    this.body = new Mesh(
      new SphereGeometry(1, 96, 64),
      new ShaderMaterial({ vertexShader: STAR_SURFACE_VERT, fragmentShader: STAR_SURFACE_FRAG, uniforms: this.uniforms }),
    )
    this.haloTexture = makeHaloTexture()
    this.halo = new Sprite(new SpriteMaterial({
      map: this.haloTexture,
      color: this.uniforms.uColor.value.clone(),
      blending: AdditiveBlending,
      transparent: true,
      opacity: HALO_OPACITY,
      depthWrite: false,
    }))
    this.halo.scale.setScalar(HALO_SCALE)
    this.body.add(this.halo)
    this.root.add(this.body)
    this.setRadius(radius)
  }

  setRadius(radius: number): void {
    this.body.scale.setScalar(radius)
  }

  update(time: number): void {
    this.uniforms.uTime.value = time
  }

  dispose(): void {
    this.body.geometry.dispose()
    this.body.material.dispose()
    this.halo.material.dispose()
    this.haloTexture.dispose()
    this.root.removeFromParent()
  }
}

/** Radial falloff drawn once on a small canvas: cheaper than a shader and smooth enough at any size. */
function makeHaloTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.12, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}
