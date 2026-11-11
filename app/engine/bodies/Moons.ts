import {
  BufferGeometry, Color, Group, LineBasicMaterial, LineLoop, Mesh, ShaderMaterial, SphereGeometry, Vector3,
  type IUniform, type Texture,
} from 'three'
import { loadColorMap } from '../core/textures'
import { MOON_FRAG, MOON_VERT } from '../shaders/moon'

/** A moon in display units, relative to its planet (radius 1). */
export interface MoonRender {
  id: string
  /** Display radius, in planet radii. */
  radius: number
  /** Display orbit radius, in planet radii. */
  orbit: number
  /** Display seconds per revolution at time scale 1. */
  period: number
  phase: number
  retrograde: boolean
  /** Equirectangular colour map URL; otherwise `color` drives a procedural surface. */
  texture?: string
  color: string
  /** Iapetus-like: one dark hemisphere. */
  twoTone?: boolean
  /** Titan-like: opaque haze, no visible surface. */
  hazy?: boolean
  seed: number
}

/** The planet's light, shared by reference so moons follow every lighting change for free. */
export interface LightUniforms {
  sunW: IUniform<Vector3>
  sunColor: IUniform<Color>
  sunI: IUniform<number>
  amb: IUniform<Vector3>
}

/**
 * Mesh resolution. A selected moon can fill half the screen, where 48 segments showed facets on the silhouette;
 * 96 × 64 is ~12k triangles per moon, ~250k for the Solar System, drawn only when on screen.
 */
const MOON_SEGMENTS: [number, number] = [96, 64]
/** Orbit hairline opacity; fainter than planet orbits so the hierarchy stays readable. */
const ORBIT_OPACITY = 0.1

interface MoonItem {
  render: MoonRender
  mesh: Mesh<SphereGeometry, ShaderMaterial>
  line: LineLoop<BufferGeometry, LineBasicMaterial>
}

/**
 * The moons of one planet. Add `root` to the planet's tilted, scaled frame: positions are then in planet radii
 * and orbits lie in the planet's equatorial plane, as for the large regular moons of the Solar System.
 */
export class Moons {
  readonly root = new Group()
  private readonly items: MoonItem[] = []
  private readonly geometry = new SphereGeometry(1, ...MOON_SEGMENTS)
  private readonly tmp = new Vector3()

  constructor(moons: MoonRender[], light: LightUniforms) {
    for (const m of moons) {
      const uniforms = {
        uMap: { value: null as Texture | null },
        uUseMap: { value: 0 },
        uColor: { value: new Color(m.color) },
        uSeed: { value: m.seed * 0.37 },
        uTwoTone: { value: m.twoTone ? 1 : 0 },
        uHazy: { value: m.hazy ? 1 : 0 },
        uSunW: light.sunW,
        uSunColor: light.sunColor,
        uSunI: light.sunI,
        uAmb: light.amb,
      }
      const mesh = new Mesh(this.geometry, new ShaderMaterial({ vertexShader: MOON_VERT, fragmentShader: MOON_FRAG, uniforms }))
      mesh.scale.setScalar(m.radius)
      if (m.texture) {
        loadColorMap(m.texture).then((tex) => {
          uniforms.uMap.value = tex
          uniforms.uUseMap.value = 1
        }).catch((err) => console.warn('[moons] colour map failed, keeping the procedural surface', m.texture, err))
      }
      const line = makeOrbit(m.orbit)
      this.root.add(mesh, line)
      this.items.push({ render: m, mesh, line })
    }
    this.update(0)
  }

  get ids(): string[] {
    return this.items.map((i) => i.render.id)
  }

  /** Outermost extent in planet radii (orbit + moon radius), for layout spacing. */
  get extent(): number {
    return this.items.reduce((m, i) => Math.max(m, i.render.orbit + i.render.radius), 1)
  }

  has(id: string): boolean {
    return this.items.some((i) => i.render.id === id)
  }

  /** Hides the moons and their orbit lines together. */
  setVisible(visible: boolean): void {
    this.root.visible = visible
  }

  get visible(): boolean {
    return this.root.visible
  }

  setOrbitsVisible(visible: boolean): void {
    for (const i of this.items) i.line.visible = visible
  }

  /** Places every moon for a simulation time (seconds). Moons are tidally locked: they always face the planet. */
  update(time: number): void {
    for (const { render: m, mesh } of this.items) {
      const sign = m.retrograde ? -1 : 1
      const a = m.phase + sign * (time / m.period) * Math.PI * 2
      mesh.position.set(Math.cos(a) * m.orbit, 0, -Math.sin(a) * m.orbit)
      mesh.rotation.y = a
    }
  }

  /** World position of a moon, valid after the parent's matrices are updated. */
  worldPosition(id: string, out: Vector3): Vector3 | null {
    const item = this.items.find((i) => i.render.id === id)
    if (!item) return null
    return item.mesh.getWorldPosition(out)
  }

  /** World radius of a moon (its mesh scale times every parent scale). */
  worldRadius(id: string): number {
    const item = this.items.find((i) => i.render.id === id)
    if (!item) return 0
    return item.mesh.getWorldScale(this.tmp).x
  }

  dispose(): void {
    for (const i of this.items) {
      i.mesh.material.dispose()
      i.line.geometry.dispose()
      i.line.material.dispose()
    }
    this.geometry.dispose()
    this.items.length = 0
    this.root.removeFromParent()
  }
}

function makeOrbit(radius: number): LineLoop<BufferGeometry, LineBasicMaterial> {
  const segments = 128
  const pts: Vector3[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return new LineLoop(
    new BufferGeometry().setFromPoints(pts),
    new LineBasicMaterial({ color: new Color('#ece7dc'), transparent: true, opacity: ORBIT_OPACITY }),
  )
}
