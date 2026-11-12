import {
  AdditiveBlending, BackSide, Box3, BoxGeometry, BufferGeometry, CylinderGeometry, Group, InstancedMesh, LatheGeometry,
  Matrix4, Mesh, MeshStandardMaterial, Quaternion, ShaderMaterial, Sphere, SphereGeometry,
  TorusGeometry, Vector2, Vector3, type Material, type Object3D, type Texture,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { prepareForScene, sceneOf, serial } from './gltf'
import { disposeModel, loadNasaModel, NASA_MODELS, type LoadedModel, type NasaModel } from './nasaModels'
import { acquireEarthTexture, EARTH_ATMO_FAR, EARTH_ATMO_FRAG, EARTH_ATMO_VERT, releaseEarthTexture } from './earth'
import { acquireCraftMaterials, releaseCraftMaterials, type CraftMaterials } from './spacecraftMaterials'
import type { BodyContext, BodyView, SpaceBody } from './types'

type CraftRender = Extract<ObjectRender, { kind: 'spacecraft' }>

/** Every model is scaled so its bounding sphere has this radius: a 58 cm Sputnik and a 109 m ISS frame alike. */
const MODEL_RADIUS = 2
/**
 * Models whose thin booms or antennas inflate the bounding sphere: scaled up so the main body fills the frame and
 * the long parts run off its edges (Voyager's magnetometer boom is 13 m against a 3.7 m dish).
 */
const FIT_BOOST: Partial<Record<CraftRender['model'], number>> = { 'voyager-1': 2.2, 'sputnik-1': 1.6 }
/** Model files authored standing up: turned (Euler x, y, z) so they lie as usually pictured. */
const MODEL_ROTATION: Partial<Record<CraftRender['model'], [number, number, number]>> = { hubble: [0, 0, Math.PI / 2] }
/** Earth below low-orbit craft: radius in world units, and the gap under the model. */
const EARTH_RADIUS = 60
const EARTH_GAP = 9
/** Slow turn of the model on its stand, radians per second. */
const DRIFT = 0.05

const VIEWS: Record<CraftRender['model'], BodyView> = {
  'iss': { elevationDeg: 26, azimuthDeg: 60, distance: 4.4 },
  'hubble': { elevationDeg: 14, azimuthDeg: 75, distance: 4.4 },
  'jwst': { elevationDeg: 24, azimuthDeg: 45, distance: 4.4 },
  'voyager-1': { elevationDeg: 16, azimuthDeg: 70, distance: 4.2 },
  'tiangong': { elevationDeg: 28, azimuthDeg: 65, distance: 4.4 },
  'sputnik-1': { elevationDeg: 12, azimuthDeg: 80, distance: 4.4 },
}

/**
 * A spacecraft. The ISS, Hubble, the JWST and Voyager 1 are NASA's own public-domain 3D models (loaded on demand);
 * Tiangong and Sputnik 1, absent from NASA's library, are modelled here part by part at real dimensions, with
 * generated textures. Low-orbit craft get the Earth's curved limb below them.
 */
export class Spacecraft implements SpaceBody {
  readonly root = new Group()
  readonly radius = MODEL_RADIUS
  readonly view: BodyView
  readonly minDistance = 0.6
  readonly animated = true

  private readonly model = new Group()
  private readonly mats: CraftMaterials
  private readonly geometries: BufferGeometry[] = []
  private readonly extraMaterials: Material[] = []
  private readonly textures: Texture[] = []
  private loaded: LoadedModel | null = null
  private disposed = false
  private usesEarth = false

  constructor(render: CraftRender, ctx: BodyContext) {
    this.mats = acquireCraftMaterials()
    this.root.add(this.model)
    this.view = VIEWS[render.model]
    if (render.earth) this.addEarth(ctx)

    if (render.model in NASA_MODELS) {
      const model = render.model as NasaModel
      // One model at a time across the page, shaders compiled and textures uploaded before it is shown.
      serial(async () => {
        if (this.disposed) return
        const loaded = await loadNasaModel(model, this.mats, ctx.preview)
        const scene = loaded.root
        // The page may have been left while the file was loading.
        if (this.disposed) {
          disposeModel(scene, this.mats)
          return
        }
        const rot = MODEL_ROTATION[render.model]
        if (rot) scene.rotation.set(...rot)
        fit(scene, MODEL_RADIUS * (FIT_BOOST[render.model] ?? 1))
        await prepareForScene(ctx.renderer, scene, sceneOf(this.root), ctx.drawTarget)
        if (this.disposed) {
          disposeModel(scene, this.mats)
          return
        }
        this.loaded = loaded
        // Start from the default view whatever the drift did while the file was loading.
        this.model.rotation.y = 0
        this.model.add(scene)
        ctx.invalidate()
      }).catch((err) => console.error('[spacecraft] model failed to load', NASA_MODELS[model], err))
    } else {
      const built = new Group()
      if (render.model === 'tiangong') this.buildTiangong(built)
      else this.buildSputnik(built)
      this.mergeByMaterial(built)
      fit(built, MODEL_RADIUS * (FIT_BOOST[render.model] ?? 1))
      this.model.add(built)
    }
  }

  update(dt: number): void {
    this.model.rotation.y += dt * DRIFT
    // The detail is measured in the model's own frame, which the drift just turned.
    if (this.loaded) this.loaded.detail.track(this.loaded.root)
  }

  dispose(): void {
    this.disposed = true
    if (this.loaded) disposeModel(this.loaded.root, this.mats)
    this.geometries.forEach((g) => g.dispose())
    this.extraMaterials.forEach((m) => m.dispose())
    this.textures.forEach((t) => t.dispose())
    releaseCraftMaterials()
    if (this.usesEarth) releaseEarthTexture()
    this.root.removeFromParent()
  }

  // --- building blocks -----------------------------------------------------------------------------------------

  /**
   * Bakes the built model's plain meshes into one mesh per material (and attribute layout). Tiangong is a few
   * hundred parts; drawn one call each, its thumbnail alone cost as much CPU per frame as the rest of the page.
   * Instanced parts (handrails, bolts) are already one call and stay as they are.
   */
  private mergeByMaterial(root: Group): void {
    root.updateMatrixWorld(true)
    const buckets = new Map<string, { material: Material; geos: BufferGeometry[]; meshes: Mesh[] }>()
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || (mesh as InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)) return
      const g = mesh.geometry
      // mergeGeometries needs identical attribute sets and all-or-none indices.
      const key = `${mesh.material.uuid}|${Object.keys(g.attributes).sort().join(',')}|${g.index ? 'i' : 'n'}`
      let b = buckets.get(key)
      if (!b) buckets.set(key, (b = { material: mesh.material, geos: [], meshes: [] }))
      b.geos.push(g.clone().applyMatrix4(mesh.matrixWorld))
      b.meshes.push(mesh)
    })
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) {
        b.geos.forEach((g) => g.dispose())
        continue
      }
      const merged = mergeGeometries(b.geos, false)
      b.geos.forEach((g) => g.dispose())
      if (!merged) continue
      for (const mesh of b.meshes) {
        mesh.removeFromParent()
        mesh.geometry.dispose()
        const i = this.geometries.indexOf(mesh.geometry)
        if (i >= 0) this.geometries.splice(i, 1)
      }
      root.add(new Mesh(this.keep(merged), b.material))
    }
  }

  private keep<T extends BufferGeometry>(geo: T): T {
    this.geometries.push(geo)
    return geo
  }

  private mesh(geo: BufferGeometry, mat: Material, parent: Object3D, x = 0, y = 0, z = 0): Mesh {
    const m = new Mesh(this.keep(geo), mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }

  /** Lathe-turned body along +z from a (radius, z) profile: modules with tapers, flanges and end domes. */
  private turned(parent: Object3D, profile: [number, number][], mat: Material, segments = 64): Mesh {
    // LatheGeometry turns around y: build along y, then lay the result along z. Its faces point outwards only
    // when the profile runs towards +y, so profiles written aft-wards are reversed first.
    const ordered = profile[0]![1] > profile[profile.length - 1]![1] ? [...profile].reverse() : profile
    const geo = new LatheGeometry(ordered.map(([r, z]) => new Vector2(r, z)), segments)
    geo.rotateX(Math.PI / 2)
    return this.mesh(geo, mat, parent)
  }

  /** Raised ring (flange, docking collar) around the z axis. */
  private ring(parent: Object3D, radius: number, tube: number, z: number, mat: Material): Mesh {
    return this.mesh(new TorusGeometry(radius, tube, 12, 96), mat, parent, 0, 0, z)
  }

  /** Thin rod between two points. */
  private rod(parent: Object3D, a: Vector3, b: Vector3, radius: number, mat: Material, radiusEnd = radius): Mesh {
    const dir = b.clone().sub(a)
    const m = this.mesh(new CylinderGeometry(radiusEnd, radius, dir.length(), 10, 1), mat, parent)
    m.position.copy(a).addScaledVector(dir, 0.5)
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
    return m
  }

  /** Many identical small parts (bolts, handrail stand-offs) in one draw call. */
  private instances(parent: Object3D, geo: BufferGeometry, mat: Material, matrices: Matrix4[]): InstancedMesh {
    const im = new InstancedMesh(this.keep(geo), mat, matrices.length)
    matrices.forEach((m, i) => im.setMatrixAt(i, m))
    im.instanceMatrix.needsUpdate = true
    parent.add(im)
    return im
  }

  /**
   * EVA handrails running along a cylinder (axis z) at several azimuths: a thin rail on stand-offs every 0.6 m,
   * as on every crewed module.
   */
  private handrails(parent: Object3D, radius: number, z0: number, z1: number, azimuths: number[]): void {
    const mat = this.mats.goldFoil
    const standoffs: Matrix4[] = []
    const q = new Quaternion()
    for (const az of azimuths) {
      const r = radius + 0.09
      const x = Math.cos(az) * r, y = Math.sin(az) * r
      this.rod(parent, new Vector3(x, y, z0), new Vector3(x, y, z1), 0.018, mat)
      q.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(Math.cos(az), Math.sin(az), 0))
      for (let z = z0; z <= z1; z += 0.6) {
        standoffs.push(new Matrix4().compose(new Vector3(Math.cos(az) * (radius + 0.045), Math.sin(az) * (radius + 0.045), z), q, new Vector3(1, 1, 1)))
      }
    }
    this.instances(parent, new CylinderGeometry(0.014, 0.014, 0.09, 6), mat, standoffs)
  }

  /** Bolt heads around a ring of the given radius in the plane z = const (flange fasteners). */
  private boltCircle(parent: Object3D, radius: number, z: number, count: number, size: number, mat: Material): void {
    const ms: Matrix4[] = []
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0, 0, 1))
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      ms.push(new Matrix4().compose(new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, z), q, new Vector3(1, 1, 1)))
    }
    this.instances(parent, new CylinderGeometry(size, size, size * 1.2, 6), mat, ms)
  }

  /**
   * Androgynous docking port (as on Tiangong and Shenzhou): a collar, a guide ring and three guide petals,
   * facing +z in its own frame.
   */
  private dockingPort(parent: Object3D, frame: Group): void {
    const m = this.mats
    parent.add(frame)
    this.turned(frame, [[0, 0], [0.62, 0], [0.62, 0.35], [0.7, 0.35], [0.7, 0.45], [0.5, 0.45]], m.brushed, 48)
    this.ring(frame, 0.6, 0.04, 0.5, m.metal)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      const petal = this.mesh(new BoxGeometry(0.28, 0.06, 0.32), m.metal, frame, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.62)
      petal.rotation.z = a + Math.PI / 2
      petal.rotation.x = 0.35
    }
  }

  /**
   * Flexible solar wing: a lattice mast with a blanket on each side, folded like an accordion (panels tilt
   * alternately by a degree or two, so light catches each fold). Lies along +z from the origin, facing +x.
   */
  private flexWing(parent: Object3D, length: number, width: number, panels: number): Group {
    const m = this.mats
    const wing = new Group()
    parent.add(wing)
    this.rod(wing, new Vector3(0, 0, 0), new Vector3(0, 0, length), 0.09, m.metal)
    this.mesh(new BoxGeometry(0.3, 0.3, length), m.truss, wing, 0, 0, length / 2)
    const pl = length / panels
    const geo = this.keep(new BoxGeometry(0.02, width, pl * 0.985))
    for (const side of [-1, 1]) {
      for (let i = 0; i < panels; i++) {
        const p = new Mesh(geo, m.cellsFlex)
        p.position.set(0, side * (width / 2 + 0.25), pl * (i + 0.5))
        p.rotation.y = (i % 2 ? 1 : -1) * 0.025
        wing.add(p)
      }
      // Tension bars at the root and tip of each blanket.
      this.mesh(new BoxGeometry(0.12, width, 0.12), m.metal, wing, 0, side * (width / 2 + 0.25), length)
      this.mesh(new BoxGeometry(0.12, width, 0.12), m.metal, wing, 0, side * (width / 2 + 0.25), 0.1)
    }
    return wing
  }

  /** Rigid panel wing for visiting ships: a short yoke and a few hinged panels. */
  private rigidWing(parent: Object3D, panels: number, pw: number, ph: number): Group {
    const m = this.mats
    const wing = new Group()
    parent.add(wing)
    this.rod(wing, new Vector3(0, 0, 0), new Vector3(0, 0.5, 0), 0.04, m.metal)
    for (let i = 0; i < panels; i++) {
      const p = this.mesh(new BoxGeometry(pw, ph * 0.97, 0.03), m.cellsFlex, wing, 0, 0.5 + ph * (i + 0.5), 0)
      p.rotation.y = Math.PI / 2
    }
    return wing
  }

  private addEarth(ctx: BodyContext): void {
    const earth = new Group()
    const tex = acquireEarthTexture(ctx.invalidate)
    this.usesEarth = true
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 })
    this.extraMaterials.push(mat)
    const ground = this.mesh(new SphereGeometry(EARTH_RADIUS, 128, 96), mat, earth)
    // Show oceans and clouds under the craft rather than a pole.
    ground.rotation.set(0.35, 2.2, 0)
    const atmoMat = new ShaderMaterial({
      vertexShader: EARTH_ATMO_VERT, fragmentShader: EARTH_ATMO_FRAG, uniforms: { uSun: { value: ctx.sunDir.clone() }, uI: { value: EARTH_ATMO_FAR } },
      side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending,
    })
    this.extraMaterials.push(atmoMat)
    this.mesh(new SphereGeometry(EARTH_RADIUS * 1.025, 96, 64), atmoMat, earth)
    earth.position.set(0, -(EARTH_RADIUS + EARTH_GAP), -EARTH_RADIUS * 0.35)
    this.root.add(earth)
  }

  // --- models built here (metres; fitted afterwards) -----------------------------------------------------------

  /**
   * Tiangong as completed in November 2022: the Tianhe core along z (spherical node, 2.8 m and 4.2 m sections,
   * service section with engines), Wentian and Mengtian forming the T along x with their large flexible wings,
   * a Shenzhou crew ship at the nadir port and a Tianzhou freighter at the aft port.
   */
  private buildTiangong(g: Group): void {
    const m = this.mats
    const tianhe = new Group()
    g.add(tianhe)
    // Node (spherical docking hub), then the core module running aft along -z.
    this.mesh(new SphereGeometry(1.4, 64, 48), m.quilt, tianhe)
    this.turned(tianhe, [
      [1.25, -1.2], [1.42, -1.3], [1.42, -5.4], [1.5, -5.45], [1.5, -5.55], [2.1, -6.5], [2.12, -6.55], [2.12, -12.3],
      [2.2, -12.35], [2.2, -12.45], [2.12, -12.5], [2.12, -15.2], [1.6, -15.9], [0.75, -16.2], [0.75, -16.5],
    ].map(([r, z]) => [r, z] as [number, number]), m.quilt, 96)
    for (const z of [-1.3, -5.5, -12.4, -15.2]) this.ring(tianhe, z < -6 ? 2.14 : 1.44, 0.035, z, m.brushed)
    this.boltCircle(tianhe, 2.14, -12.32, 64, 0.025, m.metal)
    // Radiator panels wrapped on the large section, and the handrails along both sections.
    for (let k = 0; k < 4; k++) {
      const strip = this.mesh(new CylinderGeometry(2.16, 2.16, 4.6, 32, 1, true, k * Math.PI / 2 + 0.3, 0.9), m.radiator, tianhe, 0, 0, -9.6)
      strip.rotation.x = Math.PI / 2
    }
    this.handrails(tianhe, 1.42, -5.2, -1.6, [0.4, 2.0, 3.6, 5.2])
    this.handrails(tianhe, 2.12, -12.1, -6.8, [0.8, 2.4, 4.0, 5.6])
    // Main engines and attitude thrusters at the back.
    for (const [x, y] of [[0.55, 0], [-0.55, 0]] as const) {
      const bell = this.turned(tianhe, [[0.12, 0], [0.18, -0.15], [0.32, -0.6], [0.35, -0.62]], m.darkStructure, 32)
      bell.position.set(x, y + 1.3, -15.3)
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      this.mesh(new BoxGeometry(0.3, 0.3, 0.4), m.goldFoil, tianhe, Math.cos(a) * 2.0, Math.sin(a) * 2.0, -14.6)
    }
    // Tianhe's robotic arm, stowed along the large section, and a communications dish.
    const armA = new Vector3(1.0, 2.3, -6.9), armB = new Vector3(1.0, 2.3, -11.6), armC = new Vector3(-0.6, 2.4, -14.4)
    this.rod(tianhe, armA, armB, 0.13, m.whitePaint)
    this.rod(tianhe, armB, armC, 0.13, m.whitePaint)
    for (const p of [armA, armB, armC]) this.mesh(new CylinderGeometry(0.22, 0.22, 0.4, 20), m.brushed, tianhe, p.x, p.y, p.z)
    this.rod(tianhe, new Vector3(-1.6, 1.4, -8), new Vector3(-2.6, 2.6, -8), 0.04, m.metal)
    const dish = this.mesh(new LatheGeometry([0, 0.15, 0.3, 0.45, 0.6].map((r) => new Vector2(r, r * r * 0.5)), 32), m.whitePaint, tianhe, -2.65, 2.65, -8)
    dish.rotation.z = Math.PI / 4
    // Docking ports: forward and zenith on the node, aft on Tianhe.
    const fwd = new Group(); fwd.position.set(0, 0, 1.25)
    this.dockingPort(tianhe, fwd)
    const zen = new Group(); zen.position.set(0, 1.25, 0); zen.rotation.x = -Math.PI / 2
    this.dockingPort(tianhe, zen)

    // Wentian (+x) and Mengtian (−x): a 4.2 m work cabin, a narrower resource cabin carrying the big wings.
    for (const side of [1, -1]) {
      const lab = new Group()
      lab.rotation.y = side * Math.PI / 2
      g.add(lab)
      this.turned(lab, [
        [0.75, 1.3], [0.75, 1.6], [1.6, 1.9], [2.12, 2.6], [2.12, 10.6], [2.2, 10.65], [2.2, 10.75], [2.0, 10.8],
        [1.6, 11.6], [1.6, 17.4], [1.2, 17.8], [0.5, 18.0], [0, 18.05],
      ], m.quilt, 96)
      for (const z of [2.6, 10.7, 11.6, 17.4]) this.ring(lab, z > 11 ? 1.62 : 2.14, 0.035, z, m.brushed)
      this.handrails(lab, 2.12, 3.0, 10.2, [0.3, 1.9, 3.5, 5.1])
      this.handrails(lab, 1.6, 11.9, 17.0, [1.0, 4.1])
      for (let k = 0; k < 3; k++) {
        const strip = this.mesh(new CylinderGeometry(2.15, 2.15, 6.5, 32, 1, true, k * 2.1 + 0.5, 0.8), m.radiator, lab, 0, 0, 6.6)
        strip.rotation.x = Math.PI / 2
      }
      if (side < 0) {
        // Mengtian's exposed payload platform: rails and experiment boxes on the outer face.
        const plat = new Group()
        plat.position.set(0, -2.2, 6.5)
        lab.add(plat)
        this.mesh(new BoxGeometry(2.6, 0.12, 7), m.metal, plat)
        for (let k = 0; k < 6; k++) this.mesh(new BoxGeometry(0.9, 0.6 + (k % 3) * 0.2, 1), k % 2 ? m.goldFoil : m.whitePaint, plat, (k % 2 ? 0.6 : -0.6), -0.4, -2.8 + k * 1.1)
      } else {
        // Wentian's airlock hatch and its small robotic arm.
        this.ring(lab, 0.5, 0.06, 0, m.brushed).position.set(0, 2.1, 9.4)
        this.rod(lab, new Vector3(1.4, 1.7, 3.5), new Vector3(1.4, 1.7, 8.5), 0.08, m.whitePaint)
      }
      // Two large wings on a gimbal at the end of the resource cabin, along ±z of the station (x of the lab).
      const gimbal = new Group()
      gimbal.position.set(0, 0, 15.2)
      lab.add(gimbal)
      this.mesh(new CylinderGeometry(0.35, 0.35, 4.2, 24), m.brushed, gimbal).rotation.z = Math.PI / 2
      for (const dir of [1, -1]) {
        const wing = this.flexWing(gimbal, 26, 2.2, 26)
        wing.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2
        wing.position.x = dir * 2.1
        // Blanket faces turned towards the light.
        wing.rotation.z = 0.5
      }
    }

    // Shenzhou at the nadir port: orbital module, descent capsule, service module with two wings.
    const sz = new Group()
    sz.position.set(0, -1.4, 0)
    sz.rotation.x = Math.PI / 2
    g.add(sz)
    this.dockingPort(sz, new Group())
    this.turned(sz, [[0.5, 0.6], [1.05, 0.9], [1.12, 1.6], [1.12, 2.8], [0.9, 3.3], [0.7, 3.4]], m.whitePaint, 48)
    this.turned(sz, [[0.7, 3.4], [1.0, 3.6], [1.25, 4.6], [1.25, 5.4]], m.darkStructure, 48)
    this.turned(sz, [[1.25, 5.4], [1.4, 5.5], [1.4, 8.3], [1.0, 8.6], [0, 8.65]], m.whiteBlanket, 48)
    for (const s2 of [1, -1]) {
      const w = this.rigidWing(sz, 4, 2.0, 1.55)
      w.position.set(s2 * 1.45, 0, 7)
      w.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2
    }
    // Tianzhou at the aft port: pressurised cargo section and propulsion module with two wings.
    const tz = new Group()
    tz.position.set(0, 0, -16.5)
    tz.rotation.y = Math.PI
    g.add(tz)
    this.dockingPort(tz, new Group())
    this.turned(tz, [[0.7, 0.4], [1.4, 0.9], [1.68, 1.4], [1.68, 6.4], [1.45, 6.7], [1.45, 10.2], [1.0, 10.6], [0, 10.65]], m.whiteBlanket, 64)
    for (const s2 of [1, -1]) {
      const w = this.rigidWing(tz, 3, 2.4, 1.9)
      w.position.set(s2 * 1.5, 0, 8.5)
      w.rotation.z = s2 > 0 ? -Math.PI / 2 : Math.PI / 2
    }
  }

  /**
   * Sputnik 1: a 58 cm polished aluminium sphere made of two hemispheres joined by a bolted flange, four
   * spring-hinged antenna mounts and the 2.4 m and 2.9 m whips, plus the pressurisation valve.
   */
  private buildSputnik(g: Group): void {
    const m = this.mats
    const R = 0.29
    this.mesh(new SphereGeometry(R, 128, 96, 0, Math.PI * 2, 0, Math.PI / 2 - 0.01), m.brushed, g).rotation.x = Math.PI / 2
    this.mesh(new SphereGeometry(R * 0.998, 128, 96, 0, Math.PI * 2, Math.PI / 2 + 0.01, Math.PI / 2), m.brushed, g).rotation.x = Math.PI / 2
    this.ring(g, R + 0.002, 0.007, 0, m.brushed)
    this.boltCircle(g, R + 0.006, 0.006, 36, 0.0045, m.metal)
    this.boltCircle(g, R + 0.006, -0.006, 36, 0.0045, m.metal)
    // Pressurisation valve on the front pole.
    this.mesh(new CylinderGeometry(0.012, 0.016, 0.03, 16), m.brushed, g, 0, 0, R + 0.01).rotation.x = Math.PI / 2
    const roots: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    roots.forEach(([sx, sy], i) => {
      const length = i < 2 ? 2.4 : 2.9
      // Mounts on the forward hemisphere, about 40° off the axis.
      const n = new Vector3(sx * 0.45, sy * 0.45, 0.77).normalize()
      const base = n.clone().multiplyScalar(R)
      const mount = this.mesh(new CylinderGeometry(0.014, 0.018, 0.05, 16), m.brushed, g)
      mount.position.copy(base).addScaledVector(n, 0.02)
      mount.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), n)
      const hinge = this.mesh(new SphereGeometry(0.013, 16, 12), m.metal, g)
      hinge.position.copy(base).addScaledVector(n, 0.045)
      // Whips swept back at ~35° from the axis, splayed outwards.
      const dir = new Vector3(sx * 0.42, sy * 0.42, -1).normalize()
      const start = hinge.position.clone()
      this.rod(g, start, start.clone().addScaledVector(dir, length), 0.006, m.brushed, 0.0035)
      // Spring sleeve at the root of each whip.
      this.rod(g, start, start.clone().addScaledVector(dir, 0.12), 0.011, m.metal)
    })
  }
}

/**
 * Scales a model so its bounding sphere has the given radius, centred on the vertex centroid: thin booms barely
 * move the centroid, so the main body stays in the middle of the frame while the booms run off its edges.
 * Call before adding the model to a parent: positions are measured in its parent's frame.
 */
function fit(g: Object3D, radius: number): void {
  g.updateMatrixWorld(true)
  const sphere = new Box3().setFromObject(g).getBoundingSphere(new Sphere())
  const centroid = new Vector3()
  let n = 0
  const v = new Vector3()
  g.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || (mesh as InstancedMesh).isInstancedMesh) return
    const pos = mesh.geometry.getAttribute('position')
    if (!pos) return
    // Sample at most ~2k vertices per mesh: enough for a centroid, cheap on multi-million-vertex models.
    const step = Math.max(1, Math.floor(pos.count / 2000))
    for (let i = 0; i < pos.count; i += step) {
      centroid.add(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
      n++
    }
  })
  const centre = n ? centroid.divideScalar(n) : sphere.center
  const k = radius / sphere.radius
  // Scaling about the root's own origin moves every point p to origin + k (p − origin); then shift the
  // centroid to zero. Works whatever position, rotation and scale the model file gave its root.
  g.scale.multiplyScalar(k)
  g.position.sub(centre).multiplyScalar(k)
}
