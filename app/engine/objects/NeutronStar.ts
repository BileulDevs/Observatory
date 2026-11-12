import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, Group, LineBasicMaterial, LineSegments,
  Mesh, PlaneGeometry, Points, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { gaussian } from '../core/noise'
import { mulberry32 } from '../core/random'
import { JET_FRAG, JET_VERT } from '../shaders/blackhole'
import { GALAXY_FRAG, GALAXY_VERT, GLOW_FRAG, GLOW_VERT } from '../shaders/galaxy'
import { facingPoint } from './anchors'
import { NEUTRON_FRAG, NEUTRON_VERT } from '../shaders/neutron'
import { viewHeightOf, type BodyContext, type BodyView, type SpaceBody } from './types'

type NeutronRender = Extract<ObjectRender, { kind: 'neutron-star' }>

/** Star radius in world units; everything else is sized from it. */
const STAR_RADIUS = 1
/** Beam length, star radii. */
const BEAM_LENGTH = 20
/**
 * On-screen spin from the real period: f = SPIN_GAIN · (1/P)^SPIN_EXPONENT Hz. Real pulsars turn up to 716 times
 * a second; this maps 1.4 ms → ~1.2 Hz and 7.6 s → ~0.08 Hz, keeping the fastest still readable.
 */
const SPIN_GAIN = 0.15
const SPIN_EXPONENT = 0.32
/** Dipole field-line shells (L, in star radii) and lines per shell. Magnetars get more, larger shells. */
const FIELD_SHELLS = [1.8, 2.7, 4, 6, 9]
const MAGNETAR_SHELLS = [1.6, 2.3, 3.2, 4.5, 6.5, 9, 13]
const FIELD_AZIMUTHS = 10
/** Marker distances from the centre, star radii: along the beam, on the field's middle shell, the torus, the jet. */
const BEAM_MARK = 9
const FIELD_MARK = 4
const WIND_TORUS_MARK = 4.6
const WIND_JET_MARK = 5.5
/** Wind-nebula points: thumbnails / full. */
const NEBULA_POINTS = { preview: 9000, full: 45000 }

/**
 * A pulsar: a spinning neutron star whose radio/X-ray beams sweep the sky along its tilted magnetic axis, wrapped
 * in dipole field lines. Optionally the pulsar wind nebula it inflates (torus and polar jets, as in the Crab).
 */
export class NeutronStar implements SpaceBody {
  readonly root = new Group()
  readonly radius = 6
  readonly view: BodyView = { elevationDeg: 14, azimuthDeg: 30, distance: 2.6 }
  readonly minDistance = 0.4
  readonly animated = true

  private readonly spin = new Group()
  private readonly magnetic = new Group()
  private readonly spinRate: number
  private readonly star: Mesh<SphereGeometry, ShaderMaterial>
  private readonly starU
  private readonly beams: Mesh<ConeGeometry, ShaderMaterial>[] = []
  private readonly beamU
  private readonly field: LineSegments<BufferGeometry, LineBasicMaterial>
  private readonly glow: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly nebula: Points<BufferGeometry, ShaderMaterial> | null = null
  private readonly nebulaU = { uPR: { value: 1 }, uViewH: { value: 800 }, uI: { value: 0.9 } }
  private readonly parentQ = new Quaternion()
  private readonly tilt: number
  private readonly hasNebula: boolean
  private readonly center = new Vector3()
  private readonly side = new Vector3()
  private readonly front = new Vector3()

  constructor(render: NeutronRender, ctx: BodyContext) {
    this.tilt = (render.magneticTiltDeg * Math.PI) / 180
    this.hasNebula = !!render.windNebula
    const color = new Color(render.beamColor)
    this.spinRate = 2 * Math.PI * SPIN_GAIN * Math.pow(1 / render.periodS, SPIN_EXPONENT)
    this.root.add(this.spin)
    this.spin.add(this.magnetic)
    this.magnetic.rotation.z = (render.magneticTiltDeg * Math.PI) / 180

    this.starU = { uColor: { value: color.clone() }, uTime: { value: 0 }, uMagnetar: { value: render.magnetar ? 1 : 0 } }
    this.star = new Mesh(new SphereGeometry(STAR_RADIUS, 96, 64), new ShaderMaterial({
      vertexShader: NEUTRON_VERT, fragmentShader: NEUTRON_FRAG, uniforms: this.starU,
    }))
    this.magnetic.add(this.star)

    this.beamU = { uColor: { value: color.clone() }, uI: { value: render.magnetar ? 1.3 : 2.0 }, uTime: { value: 0 } }
    for (const sign of [1, -1]) {
      const length = STAR_RADIUS * BEAM_LENGTH
      const geo = new ConeGeometry(length * 0.11, length, 48, 48, true)
      geo.translate(0, -length / 2, 0)
      geo.rotateX(Math.PI)
      const beam = new Mesh(geo, new ShaderMaterial({
        vertexShader: JET_VERT, fragmentShader: JET_FRAG, uniforms: this.beamU,
        transparent: true, depthWrite: false, blending: AdditiveBlending,
      }))
      if (sign < 0) beam.rotation.x = Math.PI
      beam.renderOrder = 1
      this.beams.push(beam)
      this.magnetic.add(beam)
    }

    this.field = new LineSegments(buildDipole(render.magnetar ? MAGNETAR_SHELLS : FIELD_SHELLS), new LineBasicMaterial({
      color, transparent: true, opacity: render.magnetar ? 0.55 : 0.3, blending: AdditiveBlending, depthWrite: false,
    }))
    this.magnetic.add(this.field)

    this.glow = new Mesh(new PlaneGeometry(STAR_RADIUS * 9, STAR_RADIUS * 9), new ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      uniforms: { uColor: { value: color.clone() }, uI: { value: 1.4 }, uStretch: { value: new Vector2(1, 1) } },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.glow.renderOrder = 2
    this.root.add(this.glow)

    if (render.windNebula) {
      this.nebulaU.uPR.value = Math.min(window.devicePixelRatio, ctx.quality.maxPixelRatio)
      this.nebula = new Points(
        buildWindNebula(new Color(render.windNebula.color), ctx.preview ? NEBULA_POINTS.preview : NEBULA_POINTS.full, render.seed),
        new ShaderMaterial({
          vertexShader: GALAXY_VERT, fragmentShader: GALAXY_FRAG, uniforms: this.nebulaU,
          transparent: true, depthWrite: false, blending: AdditiveBlending,
        }),
      )
      this.root.add(this.nebula)
    }
  }

  update(dt: number, time: number, camera: PerspectiveCamera): void {
    this.spin.rotation.y += dt * this.spinRate
    this.starU.uTime.value = time
    this.beamU.uTime.value = time
    this.root.updateWorldMatrix(true, false)
    this.root.getWorldQuaternion(this.parentQ).invert()
    this.glow.quaternion.copy(camera.quaternion).premultiply(this.parentQ)
    this.nebulaU.uViewH.value = viewHeightOf(camera)
    if (this.nebula) this.nebula.rotation.y += dt * 0.03
  }

  /**
   * Marker points. The beams and field lines turn with the star (up to ~1 turn a second on screen): a marker
   * riding them would race round. Their markers sit instead where the beam passes once per turn, on the right
   * of the screen, so they stay still while the beam sweeps through them.
   */
  anchor(key: string, camera: PerspectiveCamera, out: Vector3): Vector3 | null {
    this.root.getWorldPosition(this.center)
    this.front.subVectors(camera.position, this.center).setY(0).normalize()
    this.side.crossVectors(this.front, UP).normalize().negate()
    const s = Math.sin(this.tilt), c = Math.cos(this.tilt)
    switch (key) {
      case 'star': return facingPoint(this.center, STAR_RADIUS, camera, 35, -40, out)
      case 'beam': return out.copy(this.center).addScaledVector(this.side, s * BEAM_MARK).addScaledVector(UP, c * BEAM_MARK)
      // On the magnetic equator, at the radius of the middle field-line shell.
      case 'field': return out.copy(this.center).addScaledVector(this.side, c * FIELD_MARK).addScaledVector(UP, -s * FIELD_MARK)
      case 'wind-torus': return this.hasNebula ? out.copy(this.center).addScaledVector(this.front, WIND_TORUS_MARK) : null
      case 'wind-jet': return this.hasNebula ? out.copy(this.center).addScaledVector(UP, WIND_JET_MARK) : null
      default: return null
    }
  }

  dispose(): void {
    this.star.geometry.dispose()
    this.star.material.dispose()
    for (const b of this.beams) {
      b.geometry.dispose()
      b.material.dispose()
    }
    this.field.geometry.dispose()
    this.field.material.dispose()
    this.glow.geometry.dispose()
    this.glow.material.dispose()
    this.nebula?.geometry.dispose()
    this.nebula?.material.dispose()
    this.root.removeFromParent()
  }
}

/**
 * Closed dipole field lines, r = L sin²θ around the magnetic (y) axis, from the surface out and back.
 * One polyline per (shell, azimuth), stored as line segments.
 */
function buildDipole(shells: number[]): BufferGeometry {
  const pts: number[] = []
  const steps = 72
  for (const L of shells) {
    // Footpoints where the line meets the surface: sin²θ = R/L.
    const th0 = Math.asin(Math.sqrt(STAR_RADIUS / L))
    for (let k = 0; k < FIELD_AZIMUTHS; k++) {
      const az = (k / FIELD_AZIMUTHS) * Math.PI * 2 + L * 0.37
      let prev: Vector3 | null = null
      for (let i = 0; i <= steps; i++) {
        const th = th0 + (Math.PI - 2 * th0) * (i / steps)
        const r = L * Math.sin(th) ** 2
        const p = new Vector3(r * Math.sin(th) * Math.cos(az), r * Math.cos(th), r * Math.sin(th) * Math.sin(az))
        if (prev) pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z)
        prev = p
      }
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
  return geo
}

/**
 * Pulsar wind nebula: an equatorial torus of shocked wind with bright inner wisps, and two polar jets along the
 * spin axis — the structure Chandra shows in the Crab and Vela.
 */
function buildWindNebula(color: Color, count: number, seed: number): BufferGeometry {
  const rnd = mulberry32(seed * 131 + 5)
  const pos: number[] = []
  const col: number[] = []
  const size: number[] = []
  const warm = new Color('#ffd2a8')
  const c = new Color()
  for (let i = 0; i < count; i++) {
    const u = rnd()
    let x: number, y: number, z: number
    if (u < 0.7) {
      const ring = rnd() < 0.25 ? 3.2 : 4.5 + Math.abs(gaussian(rnd)) * 2.2
      const th = rnd() * Math.PI * 2
      const r = ring + gaussian(rnd) * 0.35
      x = r * Math.cos(th); z = r * Math.sin(th); y = gaussian(rnd) * 0.45
    } else {
      // Polar jets: narrow, a little curved, fading outwards.
      const s = rnd() < 0.5 ? 1 : -1
      const t = Math.pow(rnd(), 0.7) * 7
      x = Math.sin(t * 0.25) * 0.4 + gaussian(rnd) * 0.18; z = gaussian(rnd) * 0.18; y = s * (1.2 + t)
    }
    c.copy(color).lerp(warm, rnd() * 0.35)
    const b = 0.18 + rnd() * 0.35
    pos.push(x, y, z)
    col.push(c.r * b, c.g * b, c.b * b)
    size.push(0.012 + rnd() * 0.03)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(col), 3))
  geo.setAttribute('aSize', new BufferAttribute(new Float32Array(size), 1))
  return geo
}

const UP = new Vector3(0, 1, 0)
