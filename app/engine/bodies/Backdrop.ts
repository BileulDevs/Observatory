import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, Group, Mesh, Points, ShaderMaterial,
  SphereGeometry, Vector3, type Camera, type Texture, type WebGLCubeRenderTarget,
} from 'three'
import { BakePass, type CubeBaker } from '../bake/CubeBaker'
import { mulberry32 } from '../core/random'
import { SKY_FRAG, SKY_VERT, STAR_FRAG, STAR_VERT } from '../shaders/backdrop'

/** Sky cubemap size. The sky is very soft: going higher only costs memory. */
const SKY_RES = 512
/** Star shell radius; must stay inside the camera far plane. */
const STAR_RADIUS = 150
/** Seed for star placement. Fixed so the sky is identical on every visit. */
const STAR_SEED = 1337

/**
 * Everything infinitely far away: a baked Milky-Way-like sky and point stars.
 * Re-centred on the camera every frame, so zooming never moves the stars.
 */
export class Backdrop {
  readonly root = new Group()

  private readonly skyTarget: WebGLCubeRenderTarget
  private readonly skyU = { uSky: { value: null as Texture | null }, uI: { value: 1 } }
  private readonly starU = { uPR: { value: 1 }, uI: { value: 1 } }
  private readonly sky: Mesh<SphereGeometry, ShaderMaterial>
  private readonly stars: Points<BufferGeometry, ShaderMaterial>

  constructor(baker: CubeBaker, starCount: number) {
    this.skyTarget = baker.createTarget(SKY_RES, BakePass.Sky)
    baker.bakeNow(this.skyTarget, BakePass.Sky, 0, new Vector3())
    this.skyU.uSky.value = this.skyTarget.texture

    this.sky = new Mesh(
      new SphereGeometry(200, 48, 32),
      new ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, side: BackSide, depthWrite: false }),
    )
    this.sky.renderOrder = -2
    this.stars = new Points(
      buildStars(starCount),
      new ShaderMaterial({
        vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.starU,
        transparent: true, depthWrite: false, blending: AdditiveBlending,
      }),
    )
    this.stars.renderOrder = -1
    this.root.add(this.sky, this.stars)
  }

  /** The baked sky, for effects that bend the background (black-hole lensing). Owned by the backdrop. */
  get skyTexture(): Texture {
    return this.skyTarget.texture
  }

  setIntensity(sky: number, stars: number): void {
    this.skyU.uI.value = sky
    this.starU.uI.value = stars
  }

  /** Point sprites are sized in device pixels, so they need the current pixel ratio. */
  setPixelRatio(pr: number): void {
    this.starU.uPR.value = pr
  }

  update(camera: Camera): void {
    this.root.position.copy(camera.position)
  }

  dispose(): void {
    this.skyTarget.dispose()
    this.sky.geometry.dispose()
    this.sky.material.dispose()
    this.stars.geometry.dispose()
    this.stars.material.dispose()
    this.root.removeFromParent()
  }
}

/** Star directions, sizes and colours. Bright stars are deliberately rare so the sky stays calm behind text. */
function buildStars(count: number): BufferGeometry {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const rnd = mulberry32(STAR_SEED)
  const tmp = new Color()
  for (let i = 0; i < count; i++) {
    // Uniform on the sphere: uniform height + uniform angle.
    const u = rnd() * 2 - 1
    const a = rnd() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    pos.set([s * Math.cos(a) * STAR_RADIUS, u * STAR_RADIUS, s * Math.sin(a) * STAR_RADIUS], i * 3)
    const magnitude = Math.pow(rnd(), 9)
    size[i] = 1.1 + magnitude * 3.4
    const warm = rnd() >= 0.7
    tmp.setHSL(warm ? 0.08 : 0.6, warm ? 0.45 : 0.25, 0.75)
    const b = 0.12 + magnitude * 2.2 + rnd() * 0.08
    col.set([tmp.r * b, tmp.g * b, tmp.b * b], i * 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aColor', new BufferAttribute(col, 3))
  g.setAttribute('aSize', new BufferAttribute(size, 1))
  return g
}
