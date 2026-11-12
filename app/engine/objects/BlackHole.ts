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
import { facingPoint } from './anchors'
import type { BodyContext, BodyView, SpaceBody } from './types'

type BlackHoleRender = Extract<ObjectRender, { kind: 'black-hole' }>

/**
 * Apparent radius of the shadow's edge (the photon ring) as seen from far away, in Schwarzschild radii:
 * √27 / 2 ≈ 2.6 for a non-rotating hole.
 */
const PHOTON_RING_APPARENT = 2.6
/** Shadow marker, as a share of the shadow's apparent radius: well inside the dark disc, clear of the centre. */
const SHADOW_MARK = 0.6
/** Height of the lensed image of the disk's far side over the hole, rs: the arc that makes the "Interstellar" look. */
const LENSED_ARC_HEIGHT = 3.4
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
/** Default camera azimuth, degrees. The companion is placed from it, so changing it moves the star with the view. */
const VIEW_AZIMUTH_DEG = -18
/** Default camera distance in body radii, without / with a companion (the companion widens the body's radius). */
const VIEW_DISTANCE = 3.4
const VIEW_DISTANCE_BINARY = 3
/**
 * Where the companion sits, as weights of the default view's screen-right, depth (away from the camera) and up
 * directions: below and to the right of the hole. It must stay clear of the lensing sphere, which hides whatever is
 * behind it (a star placed behind the hole is invisible), and inside the room the page leaves: the fact panel on
 * the left, the scene buttons at the top right. More depth tucks the star towards the lens edge; more right pushes
 * it off-screen on narrow windows; more up runs it into the buttons. Checked at 1108 × 720 with the panel open:
 * about 45 px of sky between star and lens, 60 px from the right edge.
 */
const COMPANION_RIGHT = 0.4
const COMPANION_DEPTH = 0.2
const COMPANION_UP = -0.4
/** Bulge of the gas stream's curve, in disk radii, towards the camera side. */
const STREAM_BULGE = 0.5
/** Where the stream meets the disk, as a share of the disk's outer radius. */
const STREAM_END = 0.85

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
  /** Middle of the gas stream's curve, in the body's frame: the stream marker's point. */
  private readonly streamMid = new Vector3()
  private readonly stream: Points<BufferGeometry, ShaderMaterial> | null = null
  private readonly host: Mesh<PlaneGeometry, ShaderMaterial> | null = null
  private readonly parentQ = new Quaternion()
  private readonly invLocal = new Matrix4()
  private readonly render: BlackHoleRender
  private readonly center = new Vector3()
  private readonly side = new Vector3()

  constructor(render: BlackHoleRender, ctx: BodyContext) {
    this.render = render
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
      // Beside the hole from the default view (see COMPANION_*). It used to sit almost straight behind the hole,
      // inside the lensing sphere's silhouette, which drew the lensed sky over it: star and stream were hidden.
      const az = (VIEW_AZIMUTH_DEG * Math.PI) / 180
      const toCamera = new Vector3(Math.sin(az), 0, Math.cos(az))
      const right = new Vector3(Math.cos(az), 0, -Math.sin(az))
      this.companion.root.position
        .copy(right).multiplyScalar(COMPANION_RIGHT)
        .addScaledVector(toCamera, -COMPANION_DEPTH)
        .addScaledVector(UP, COMPANION_UP)
        .setLength(c.distance)
      this.root.add(this.companion.root)
      this.stream = buildStream(this.companion.root.position, c.radius, render.diskOuter, toCamera, render.seed, this.streamMid)
      // Drawn after the lens: the stream ends on the disk's near side, in front of what the lens draws there.
      this.stream.renderOrder = 1
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
    this.view = { elevationDeg: render.tiltDeg, azimuthDeg: VIEW_AZIMUTH_DEG, distance: render.companion ? VIEW_DISTANCE_BINARY : VIEW_DISTANCE }
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

  anchor(key: string, camera: PerspectiveCamera, out: Vector3): Vector3 | null {
    const r = this.render
    this.root.getWorldPosition(this.center)
    // Horizontal direction towards the right of the screen: disk points there are clear of the fact panel.
    this.side.subVectors(camera.position, this.center).cross(UP).normalize().negate()
    const inner = r.diskInner ?? DISK_INNER
    switch (key) {
      // The centre is the singularity's; the shadow's marker sits inside the dark disc, up and to the left.
      case 'singularity': return out.copy(this.center)
      case 'shadow': return facingPoint(this.center, PHOTON_RING_APPARENT * SHADOW_MARK, camera, 90, -45, out)
      case 'photon-ring': return facingPoint(this.center, PHOTON_RING_APPARENT, camera, 90, 45, out)
      case 'disk': return out.copy(this.center).addScaledVector(this.side, (inner + r.diskOuter) * 0.55)
      case 'inner-edge': return out.copy(this.center).addScaledVector(this.side, inner)
      case 'lensed-arc': return out.copy(this.center).addScaledVector(UP, LENSED_ARC_HEIGHT)
      case 'jet': return r.jets ? out.copy(this.center).addScaledVector(UP, r.diskOuter * JET_LENGTH * 0.45) : null
      case 'companion':
        return this.companion && r.companion
          ? this.companion.root.getWorldPosition(out).addScaledVector(UP, r.companion.radius * 0.8)
          : null
      case 'stream': {
        if (!this.companion) return null
        // Middle of the curve itself: the straight star-to-rim midpoint lies off the bent stream.
        return this.root.localToWorld(out.copy(this.streamMid))
      }
      case 'host': return r.host ? out.copy(this.center).addScaledVector(this.side, r.host.radius * 0.5) : null
      default: return null
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
 * The stream joins the disk side-on (gas carries orbital motion, it does not fall straight in), on the side facing
 * `toCamera`: on the far side it would run behind the lensing sphere and vanish. Writes the curve's middle to `mid`.
 */
function buildStream(
  star: Vector3, starRadius: number, diskOuter: number, toCamera: Vector3, seed: number, mid: Vector3,
): Points<BufferGeometry, ShaderMaterial> {
  const rnd = mulberry32(seed * 91 + 7)
  const start = star.clone().multiplyScalar(1 - starRadius / star.length())
  const end = new Vector3(star.z, 0, -star.x).normalize()
  if (end.dot(toCamera) < 0) end.negate()
  end.multiplyScalar(diskOuter * STREAM_END)
  const ctrl = start.clone().lerp(end, 0.5).addScaledVector(toCamera, diskOuter * STREAM_BULGE)
  // Quadratic Bézier at t = 0.5: a quarter of each end plus half the control point.
  mid.copy(start).add(end).multiplyScalar(0.25).addScaledVector(ctrl, 0.5)
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

const UP = new Vector3(0, 1, 0)
