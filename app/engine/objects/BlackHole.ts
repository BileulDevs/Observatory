import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, CustomBlending, Group, Matrix3, Matrix4,
  Mesh, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, Points, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3,
  type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { Star } from '../bodies/Star'
import { mulberry32 } from '../core/random'
import { BLACKHOLE_FRAG, BLACKHOLE_VERT, JET_FRAG, JET_VERT, STREAM_FRAG, STREAM_VERT } from '../shaders/blackhole'
import { GLOW_FRAG, GLOW_VERT } from '../shaders/galaxy'
import type { BodyContext, BodyView, SpaceBody } from './types'

type BlackHoleRender = Extract<ObjectRender, { kind: 'black-hole' }>

/** Inner disk edge: the innermost stable circular orbit of a non-rotating hole, 3 rs. */
const DISK_INNER = 3
/** Lensing sphere radius relative to the disk's outer edge. Larger = straighter rays at the edge, more pixels traced. */
const LENS_MARGIN = 1.35
/** Ray-march steps: thumbnails / low tier / desktop. Fewer steps blur the photon ring and the far side of the disk. */
const STEPS = { preview: 90, low: 140, high: 220 }
/** Jet length in disk radii. */
const JET_LENGTH = 6
/** Host-galaxy glow brightness: faint, a quasar outshines its galaxy by orders of magnitude. */
const HOST_GLOW = 0.16
/**
 * Disk brightness cap. Data intensities go up to 4 for the most luminous quasars; beyond ~1.6 the disk clips to
 * flat white under the tone mapping and loses its structure, so the extra is left to the bloom and the jets.
 */
const MAX_DISK_INTENSITY = 1.6
/** Points in the gas stream of an X-ray binary. */
const STREAM_POINTS = 1400

/**
 * A black hole with its accretion disk, seen through its own gravitational lens. Optional relativistic jets,
 * a companion star feeding it (X-ray binary) and a faint host galaxy (quasars).
 */
export class BlackHole implements SpaceBody {
  readonly root = new Group()
  readonly radius: number
  readonly view: BodyView
  readonly minDistance: number
  readonly animated = true

  private readonly lens: Mesh<SphereGeometry, ShaderMaterial>
  private readonly lensU
  private readonly jets: Mesh<ConeGeometry, ShaderMaterial>[] = []
  private readonly jetU: { uColor: { value: Color }; uI: { value: number }; uTime: { value: number } } | null = null
  private readonly companion: Star | null = null
  private readonly stream: Points<BufferGeometry, ShaderMaterial> | null = null
  private readonly host: Mesh<PlaneGeometry, ShaderMaterial> | null = null
  private readonly parentQ = new Quaternion()
  private readonly invLocal = new Matrix4()

  constructor(render: BlackHoleRender, ctx: BodyContext) {
    const lensRadius = render.diskOuter * LENS_MARGIN
    const steps = ctx.preview ? STEPS.preview : ctx.quality.tier === 'low' ? STEPS.low : STEPS.high
    this.lensU = {
      uSky: { value: ctx.sky },
      uCamL: { value: new Vector3() },
      uToWorld: { value: new Matrix3() },
      uRadius: { value: lensRadius },
      uTime: { value: 0 },
      uDiskIn: { value: render.diskInner ?? DISK_INNER },
      uDiskOut: { value: render.diskOuter },
      uDiskT: { value: render.diskTemperatureK },
      uDiskI: { value: Math.min(render.diskIntensity, MAX_DISK_INTENSITY) },
      uSeed: { value: render.seed * 3.7 },
    }
    this.lens = new Mesh(
      new SphereGeometry(lensRadius, 64, 48),
      new ShaderMaterial({
        vertexShader: BLACKHOLE_VERT,
        fragmentShader: BLACKHOLE_FRAG,
        uniforms: this.lensU,
        defines: { STEPS: steps },
        transparent: true,
        depthWrite: false,
        // Premultiplied: the shader returns disk light plus lensed sky, and how much of the backdrop it hides.
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
      }),
    )
    this.root.add(this.lens)

    if (render.jets) {
      this.jetU = { uColor: { value: new Color(render.jets.color) }, uI: { value: render.jets.intensity * 2.2 }, uTime: { value: 0 } }
      const length = render.diskOuter * JET_LENGTH
      for (const sign of [1, -1]) {
        // Open cone, apex at the hole: uv.y runs from the apex (0) to the far end (1).
        const geo = new ConeGeometry(length * 0.09, length, 48, 64, true)
        geo.translate(0, -length / 2, 0)
        geo.rotateX(Math.PI)
        const jet = new Mesh(geo, new ShaderMaterial({
          vertexShader: JET_VERT, fragmentShader: JET_FRAG, uniforms: this.jetU,
          transparent: true, depthWrite: false, blending: AdditiveBlending,
        }))
        if (sign < 0) jet.rotation.x = Math.PI
        jet.renderOrder = 1
        this.jets.push(jet)
        this.root.add(jet)
      }
    }

    if (render.companion) {
      const c = render.companion
      this.companion = new Star(c.temperatureK, c.radius, render.seed)
      // Behind and above the hole from the default view, so both share the frame without the star crossing the lens.
      this.companion.root.position.set(c.distance * 0.62, -c.distance * 0.12, -c.distance * 0.75)
      this.root.add(this.companion.root)
      this.stream = buildStream(this.companion.root.position, c.radius, render.diskOuter, render.seed)
      this.root.add(this.stream)
    }

    if (render.host) {
      // The host galaxy is drowned by the quasar: only its diffuse glow shows, so a soft billboard is enough
      // (a point cloud put the camera inside its stars and read as noise).
      this.host = new Mesh(new PlaneGeometry(render.host.radius * 2, render.host.radius * 2), new ShaderMaterial({
        vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
        uniforms: { uColor: { value: new Color(render.host.color) }, uI: { value: HOST_GLOW }, uStretch: { value: new Vector2(1, 0.7) } },
        transparent: true, depthWrite: false, blending: AdditiveBlending,
      }))
      this.host.renderOrder = -1
      this.root.add(this.host)
    }

    this.radius = render.companion ? render.companion.distance + render.companion.radius : render.diskOuter
    this.minDistance = (lensRadius / this.radius) * 1.15
    this.view = { elevationDeg: render.tiltDeg, azimuthDeg: -18, distance: render.companion ? 2.6 : 3.4 }
  }

  update(_dt: number, time: number, camera: PerspectiveCamera): void {
    this.lensU.uTime.value = time
    if (this.jetU) this.jetU.uTime.value = time
    // The lens works in its own frame: camera position in local units, and the rotation back to the world.
    this.lens.updateWorldMatrix(true, false)
    this.invLocal.copy(this.lens.matrixWorld).invert()
    this.lensU.uCamL.value.copy(camera.position).applyMatrix4(this.invLocal)
    this.lensU.uToWorld.value.setFromMatrix4(this.lens.matrixWorld)
    this.companion?.update(time)
    if (this.stream) this.stream.material.uniforms.uTime!.value = time
    if (this.host) {
      this.root.getWorldQuaternion(this.parentQ).invert()
      this.host.quaternion.copy(camera.quaternion).premultiply(this.parentQ)
    }
  }

  dispose(): void {
    this.lens.geometry.dispose()
    this.lens.material.dispose()
    for (const j of this.jets) {
      j.geometry.dispose()
      j.material.dispose()
    }
    this.companion?.dispose()
    if (this.stream) {
      this.stream.geometry.dispose()
      this.stream.material.dispose()
    }
    this.host?.geometry.dispose()
    this.host?.material.dispose()
    this.root.removeFromParent()
  }
}

/**
 * Gas pulled from the companion through its inner Lagrange point, curving into the disk's outer edge.
 * Built once as a cloud of points along a quadratic curve; the shader animates their brightness.
 */
function buildStream(star: Vector3, starRadius: number, diskOuter: number, seed: number): Points<BufferGeometry, ShaderMaterial> {
  const rnd = mulberry32(seed * 91 + 7)
  const start = star.clone().multiplyScalar(1 - starRadius / star.length())
  const end = new Vector3(star.z, 0, -star.x).normalize().multiplyScalar(diskOuter * 0.85)
  const ctrl = start.clone().lerp(end, 0.5).add(new Vector3(0, 0, diskOuter * 0.5))
  const pos = new Float32Array(STREAM_POINTS * 3)
  const ts = new Float32Array(STREAM_POINTS)
  const sizes = new Float32Array(STREAM_POINTS)
  const p = new Vector3()
  for (let i = 0; i < STREAM_POINTS; i++) {
    const t = rnd()
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t
    p.set(a * start.x + b * ctrl.x + c * end.x, a * start.y + b * ctrl.y + c * end.y, a * start.z + b * ctrl.z + c * end.z)
    // Thicker where it leaves the star, thinning as it is stretched towards the disk.
    const spread = (1 - t) * 0.9 + 0.15
    p.x += (rnd() - 0.5) * spread
    p.y += (rnd() - 0.5) * spread * 0.4
    p.z += (rnd() - 0.5) * spread
    pos.set([p.x, p.y, p.z], i * 3)
    ts[i] = t
    sizes[i] = 0.25 + rnd() * 0.5
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aT', new BufferAttribute(ts, 1))
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
  return new Points(geo, new ShaderMaterial({
    vertexShader: STREAM_VERT, fragmentShader: STREAM_FRAG,
    uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) }, uColor: { value: new Color('#9fc4ff').multiplyScalar(0.6) } },
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }))
}
