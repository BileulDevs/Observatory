import {
  AdditiveBlending, BackSide, Box3, BoxGeometry, BufferGeometry, CircleGeometry, CylinderGeometry, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, ShaderMaterial, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace, Sphere,
  TextureLoader, Vector2, Vector3, type Material, type Object3D, type PerspectiveCamera, type Texture,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { acquireCraftMaterials, releaseCraftMaterials, type CraftMaterials } from './spacecraftMaterials'
import type { BodyContext, BodyView, SpaceBody } from './types'

type CraftRender = Extract<ObjectRender, { kind: 'spacecraft' }>

/** Every model is scaled so its bounding sphere has this radius: a 58 cm Sputnik and a 109 m ISS frame alike. */
const MODEL_RADIUS = 2
/**
 * Models whose thin booms inflate the bounding sphere: scaled up so the main body fills the frame and the booms
 * run off its edges (Voyager's magnetometer boom is 13 m against a 3.7 m dish).
 */
const FIT_BOOST: Partial<Record<CraftRender['model'], number>> = { 'voyager-1': 2.1, 'sputnik-1': 1.5 }
/** Earth below low-orbit craft: radius in model radii, and the gap under the model. */
const EARTH_RADIUS = 60
const EARTH_GAP = 9
/** Slow turn of the model on its stand, radians per second. */
const DRIFT = 0.05
const EARTH_TEXTURE = '/textures/solar/earth.jpg'

const ATMO_VERT = /* glsl */`
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vNW = normalize(mat3(modelMatrix) * normal);
  vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosW, 1.0);
}
`
const ATMO_FRAG = /* glsl */`
uniform vec3 uSun;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 N = normalize(vNW);
  // Seen from inside the shell (back faces): brightest just above the limb, on the day side.
  float limb = pow(1.0 - abs(dot(N, V)), 3.0);
  float day = smoothstep(-0.25, 0.4, dot(-N, uSun));
  gl_FragColor = vec4(vec3(0.32, 0.55, 1.0) * limb * day * 1.6, 1.0);
}
`

/**
 * A spacecraft model built from primitives at real proportions, with generated surface textures. Low-orbit craft
 * get the Earth's curved limb below them.
 */
export class Spacecraft implements SpaceBody {
  readonly root = new Group()
  readonly radius = MODEL_RADIUS
  readonly view: BodyView
  readonly minDistance = 0.9
  readonly animated = true

  private readonly model = new Group()
  private readonly mats: CraftMaterials
  private readonly geometries: BufferGeometry[] = []
  private readonly extraMaterials: Material[] = []
  private readonly textures: Texture[] = []
  /** Part the model is centred on, when its bounding sphere is pulled off-centre by long booms. */
  private centreOn: Object3D | null = null

  constructor(render: CraftRender, ctx: BodyContext) {
    this.mats = acquireCraftMaterials()
    const built = new Group()
    const builders: Record<CraftRender['model'], (g: Group) => void> = {
      'iss': (g) => this.buildIss(g),
      'hubble': (g) => this.buildHubble(g),
      'jwst': (g) => this.buildJwst(g),
      'voyager-1': (g) => this.buildVoyager(g),
      'tiangong': (g) => this.buildTiangong(g),
      'sputnik-1': (g) => this.buildSputnik(g),
    }
    builders[render.model](built)
    normalize(built, MODEL_RADIUS * (FIT_BOOST[render.model] ?? 1), this.centreOn)
    this.model.add(built)
    this.root.add(this.model)
    if (render.earth) this.addEarth(ctx)
    const views: Record<CraftRender['model'], BodyView> = {
      'iss': { elevationDeg: 28, azimuthDeg: 75, distance: 4.6 },
      'hubble': { elevationDeg: 16, azimuthDeg: 80, distance: 4.4 },
      'jwst': { elevationDeg: 22, azimuthDeg: 40, distance: 4.6 },
      'voyager-1': { elevationDeg: 18, azimuthDeg: 70, distance: 4.2 },
      'tiangong': { elevationDeg: 30, azimuthDeg: 70, distance: 4.4 },
      'sputnik-1': { elevationDeg: 14, azimuthDeg: 80, distance: 4.4 },
    }
    this.view = views[render.model]
  }

  update(dt: number): void {
    this.model.rotation.y += dt * DRIFT
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.extraMaterials.forEach((m) => m.dispose())
    this.textures.forEach((t) => t.dispose())
    releaseCraftMaterials()
    this.root.removeFromParent()
  }

  // --- helpers -------------------------------------------------------------------------------------------------

  private mesh(geo: BufferGeometry, mat: Material, parent: Object3D, x = 0, y = 0, z = 0): Mesh {
    this.geometries.push(geo)
    const m = new Mesh(geo, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }

  /** Cylinder along z, centred at z. */
  private tube(parent: Object3D, radius: number, length: number, z: number, mat: Material, x = 0, y = 0, segments = 48): Mesh {
    const m = this.mesh(new CylinderGeometry(radius, radius, length, segments, 1), mat, parent, x, y, z)
    m.rotation.x = Math.PI / 2
    return m
  }

  /** Pressurised module lying along x. */
  private sideModule(parent: Object3D, radius: number, length: number, x: number, y: number, z: number): Mesh {
    const mod = this.mesh(new CylinderGeometry(radius, radius, length, 48, 1), this.mats.whiteBlanket, parent, x, y, z)
    mod.rotation.z = Math.PI / 2
    return mod
  }

  /** Thin rod between two points. */
  private rod(parent: Object3D, a: Vector3, b: Vector3, radius: number, mat: Material): Mesh {
    const dir = b.clone().sub(a)
    const m = this.mesh(new CylinderGeometry(radius, radius, dir.length(), 8, 1), mat, parent)
    m.position.copy(a).addScaledVector(dir, 0.5)
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
    return m
  }

  /** Flat panel (solar array blanket, radiator), centred, in the plane given by its two axes. */
  private panel(parent: Object3D, w: number, h: number, mat: Material, x: number, y: number, z: number): Mesh {
    return this.mesh(new BoxGeometry(w, h, 0.04), mat, parent, x, y, z)
  }

  private addEarth(ctx: BodyContext): void {
    const earth = new Group()
    const tex = new TextureLoader().load(EARTH_TEXTURE, () => ctx.invalidate())
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 8
    this.textures.push(tex)
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 })
    this.extraMaterials.push(mat)
    const ground = this.mesh(new SphereGeometry(EARTH_RADIUS, 128, 96), mat, earth)
    // Show oceans and clouds under the craft rather than a pole.
    ground.rotation.set(0.35, 2.2, 0)
    const atmoMat = new ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: { uSun: { value: ctx.sunDir.clone() } },
      side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending,
    })
    this.extraMaterials.push(atmoMat)
    this.mesh(new SphereGeometry(EARTH_RADIUS * 1.025, 96, 64), atmoMat, earth)
    earth.position.set(0, -(EARTH_RADIUS + EARTH_GAP), -EARTH_RADIUS * 0.35)
    this.root.add(earth)
  }

  // --- models (metres; normalised afterwards) ------------------------------------------------------------------

  /**
   * ISS: the 94 m integrated truss along x carrying eight solar-array wings and the radiators, over a chain of
   * pressurised modules along z (Harmony, Destiny, Unity, Zarya, Zvezda) with Columbus, Kibo and Nauka.
   */
  private buildIss(g: Group): void {
    const m = this.mats
    this.mesh(new BoxGeometry(94, 2.6, 2.6), m.truss, g, 0, 4, 0)
    // Solar Alpha Rotary Joints and the photovoltaic radiators at the outboard truss segments.
    for (const sx of [-1, 1]) {
      this.mesh(new CylinderGeometry(1.8, 1.8, 2.2, 32), m.metal, g, sx * 25, 4, 0).rotation.z = Math.PI / 2
      // Eight wings: at each end, two masts (inboard, outboard), each with an upper and a lower wing.
      for (const x of [31, 44]) {
        this.rod(g, new Vector3(sx * x, 4 - 36, 0), new Vector3(sx * x, 4 + 36, 0), 0.25, m.metal)
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) this.panel(g, 4.6, 34, m.cellsCopper, sx * x, 4 + sy * 19.5, sz * 2.9).rotation.y = Math.PI / 2
        }
        this.panel(g, 3.4, 13, m.radiator, sx * x + sx * -4, 4, -6).rotation.x = Math.PI / 2
      }
      // Main heat-rejection radiators: three panels per side, hanging below the inboard truss.
      for (let k = 0; k < 3; k++) {
        const p = this.panel(g, 11.4, 3.2, m.radiator, sx * (11 + k * 0.4), -3 - k * 3.4, -1.5)
        p.rotation.x = Math.PI / 2 - 0.25
      }
    }
    // Pressurised chain along z.
    this.tube(g, 2.2, 7.2, 13, m.whiteBlanket)      // Harmony
    this.tube(g, 2.15, 8.5, 3.8, m.whiteBlanket)    // Destiny (under the truss)
    this.tube(g, 2.3, 5.5, -3.2, m.whiteBlanket)    // Unity
    this.tube(g, 2.05, 12.6, -12.3, m.whiteBlanket) // Zarya
    this.tube(g, 2.1, 13.1, -25.2, m.whiteBlanket)  // Zvezda
    // Zvezda's own wings (the Russian segment's blue arrays).
    for (const sx of [-1, 1]) this.panel(g, 12, 3.3, m.cellsBlue, sx * 9, 0, -28).rotation.x = Math.PI / 2
    // Columbus and Kibo on Harmony's sides, Kibo's exposed facility, Tranquility with the Cupola, Nauka.
    this.sideModule(g, 2.25, 7, -6.5, 0, 13)        // Columbus
    this.sideModule(g, 2.2, 11.2, 9.5, 0, 13)       // Kibo
    this.mesh(new BoxGeometry(5, 1.5, 5), m.whitePaint, g, 17.5, 0, 13)
    this.sideModule(g, 2.25, 6.7, -5.5, 0, -3.2)    // Tranquility
    this.mesh(new CylinderGeometry(1.5, 1.5, 1.5, 7), m.metal, g, -9.5, -0.8, -3.2) // Cupola
    // Nauka hangs below Zvezda (a y-axis cylinder needs no rotation).
    this.mesh(new CylinderGeometry(2.1, 2.1, 13, 48), m.whiteBlanket, g, 0, -7.5, -21)
    // Canadarm2 resting along the truss.
    this.rod(g, new Vector3(-6, 6.2, 1), new Vector3(8, 6.2, 1), 0.2, m.whitePaint)
    this.rod(g, new Vector3(8, 6.2, 1), new Vector3(14, 9, 3), 0.2, m.whitePaint)
  }

  /** Hubble: a 13.2 m tube (aft equipment section, narrower forward light shield), open aperture door, two rigid
   *  solar arrays and two high-gain antenna booms. */
  private buildHubble(g: Group): void {
    const m = this.mats
    this.tube(g, 2.1, 5, -4.1, m.silverFoil, 0, 0, 64)
    this.tube(g, 2.12, 0.15, -1.6, m.metal, 0, 0, 64)
    this.tube(g, 1.55, 8.2, 2.5, m.silverFoil, 0, 0, 64)
    this.tube(g, 2.1, 0.4, -6.75, m.darkStructure, 0, 0, 64)
    // Aperture door, swung open on its hinge.
    const door = new Group()
    door.position.set(0, 1.55, 6.6)
    g.add(door)
    this.mesh(new CircleGeometry(1.55, 48), m.silverFoil, door, 0, -1.55, 0)
    door.rotation.x = -1.9
    // Dark interior seen through the opening.
    const baffle = this.mesh(new CircleGeometry(1.5, 48), m.darkStructure, g, 0, 0, 6.55)
    baffle.rotation.y = Math.PI
    // Solar arrays: 7.1 × 2.6 m wings on masts from the forward shell.
    for (const sx of [-1, 1]) {
      this.rod(g, new Vector3(sx * 1.5, 0, -0.6), new Vector3(sx * 9, 0, -0.6), 0.05, m.metal)
      this.panel(g, 7.1, 2.6, m.cellsBlue, sx * 5.6, 0, -0.6).rotation.x = Math.PI / 2 - 0.2
    }
    // High-gain antennas on booms above and below.
    for (const sy of [-1, 1]) {
      this.rod(g, new Vector3(0, sy * 2.1, -2.5), new Vector3(0, sy * 4.6, -2.5), 0.06, m.metal)
      const dish = this.mesh(dishGeometry(0.65, 0.18), m.whitePaint, g, 0, sy * 4.7, -2.5)
      dish.rotation.x = sy > 0 ? 0 : Math.PI
    }
  }

  /**
   * JWST: 18 gold hexagonal segments (6.5 m), the secondary mirror on its tripod, the five-layer 21 × 14 m
   * sunshield, and the spacecraft bus with its solar panel and antenna under it.
   */
  private buildJwst(g: Group): void {
    const m = this.mats
    const mirror = new Group()
    mirror.position.set(0, 4.2, 0)
    mirror.rotation.x = -0.32
    g.add(mirror)
    const flat = 1.32
    const size = flat / Math.sqrt(3) // hexagon circumradius from its flat-to-flat width
    const hex = new CylinderGeometry(size * 0.985, size * 0.985, 0.08, 6)
    hex.rotateX(Math.PI / 2)
    hex.rotateZ(Math.PI / 6)
    this.geometries.push(hex)
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
      const s = -q - r
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s))
      if (ring === 0 || ring > 2) continue
      const x = flat * (q + r / 2)
      const y = flat * (r * Math.sqrt(3) / 2)
      // A paraboloid: each segment sits a little further forward and tilts towards the focus.
      const z = (x * x + y * y) / (4 * 16)
      const seg = new Mesh(hex, m.goldMirror)
      seg.position.set(x, y, z)
      seg.lookAt(new Vector3(0, 0, 16))
      mirror.add(seg)
    }
    this.mesh(new BoxGeometry(6.6, 6.2, 0.6), m.darkStructure, mirror, 0, 0, -0.45)
    // Secondary mirror 7.4 m in front, on three struts.
    const sm = this.mesh(new CylinderGeometry(0.37, 0.37, 0.1, 6), m.goldMirror, mirror, 0, 0, 7.4)
    sm.rotation.x = Math.PI / 2
    for (const [ax, ay] of [[0, -3.2], [-2.6, 1.8], [2.6, 1.8]] as const) {
      this.rod(mirror, new Vector3(ax, ay, 0.2), new Vector3(0, 0, 7.3), 0.06, m.darkStructure)
    }
    // Sunshield: five layers in a stretched hexagon, slightly separated and opening like a fan.
    const outline = new Shape()
    const pts: [number, number][] = [[10.6, 0], [5.4, 7.1], [-5.4, 7.1], [-10.6, 0], [-5.4, -7.1], [5.4, -7.1]]
    outline.moveTo(...pts[0]!)
    for (const p of pts.slice(1)) outline.lineTo(...p)
    outline.closePath()
    const shieldGeo = new ShapeGeometry(outline)
    shieldGeo.rotateX(-Math.PI / 2)
    this.geometries.push(shieldGeo)
    for (let k = 0; k < 5; k++) {
      const layer = new Mesh(shieldGeo, m.sunshield)
      layer.position.set(0, -0.4 - k * 0.28, 0)
      layer.scale.setScalar(1 - k * 0.025)
      g.add(layer)
    }
    this.mesh(new BoxGeometry(1.6, 3.8, 1.6), m.darkStructure, g, 0, 1.8, -1)
    // Bus below the shield: solar panel and high-gain antenna.
    this.mesh(new BoxGeometry(3, 1.4, 3), m.goldFoil, g, 0, -2.6, 0)
    this.panel(g, 5.9, 2.5, m.cellsDark, 0, -3.4, -3.4).rotation.x = Math.PI / 2 - 0.3
    const dish = this.mesh(dishGeometry(0.6, 0.15), m.whitePaint, g, 1.2, -3.6, 1.5)
    dish.rotation.x = Math.PI
  }

  /**
   * Voyager 1: the 3.7 m high-gain dish over the ten-sided bus, three RTGs on their boom, the science boom and
   * scan platform, the 13 m magnetometer boom, and the Golden Record on the bus.
   */
  private buildVoyager(g: Group): void {
    const m = this.mats
    this.centreOn = this.mesh(dishGeometry(1.85, 0.55), m.whitePaint, g, 0, 0.9, 0)
    this.rod(g, new Vector3(0, 0.9, 0), new Vector3(0, 2.2, 0), 0.04, m.metal)
    this.mesh(new CylinderGeometry(0.25, 0.25, 0.08, 24), m.whitePaint, g, 0, 2.25, 0)
    this.mesh(new CylinderGeometry(0.89, 0.89, 0.47, 10), m.goldFoil, g, 0, 0.2, 0)
    this.mesh(new CylinderGeometry(0.4, 0.55, 0.5, 24), m.darkStructure, g, 0, -0.3, 0)
    // Golden Record on the side of the bus.
    const rec = this.mesh(new CylinderGeometry(0.16, 0.16, 0.02, 32), m.record, g, 0.9, 0.2, 0.05)
    rec.rotation.z = Math.PI / 2
    // RTG boom: three finned generators end to end.
    const rtgStart = new Vector3(-0.85, 0, 0)
    const rtgDir = new Vector3(-1, -0.25, 0.35).normalize()
    this.rod(g, rtgStart, rtgStart.clone().addScaledVector(rtgDir, 3.2), 0.035, m.metal)
    for (let k = 0; k < 3; k++) {
      const c = rtgStart.clone().addScaledVector(rtgDir, 1.6 + k * 0.6)
      const body = this.mesh(new CylinderGeometry(0.2, 0.2, 0.5, 24), m.darkStructure, g)
      body.position.copy(c)
      body.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), rtgDir)
      for (let f = 0; f < 6; f++) {
        const fin = this.mesh(new BoxGeometry(0.02, 0.48, 0.16), m.darkStructure, body)
        const a = (f / 6) * Math.PI * 2
        fin.position.set(Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27)
        fin.rotation.y = -a
      }
    }
    // Science boom and scan platform with the cameras.
    const sciStart = new Vector3(0.85, -0.1, 0)
    const sciEnd = new Vector3(3.1, -0.5, -0.4)
    this.rod(g, sciStart, sciEnd, 0.04, m.metal)
    this.mesh(new BoxGeometry(0.5, 0.45, 0.45), m.goldFoil, g, sciEnd.x, sciEnd.y, sciEnd.z)
    this.tube(g, 0.09, 0.9, sciEnd.z - 0.4, m.darkStructure, sciEnd.x + 0.1, sciEnd.y + 0.2)
    this.tube(g, 0.06, 0.6, sciEnd.z - 0.3, m.darkStructure, sciEnd.x - 0.15, sciEnd.y + 0.22)
    // Magnetometer boom (13 m) and the two 10 m plasma-wave antennas.
    this.rod(g, new Vector3(0.6, -0.2, 0.6), new Vector3(9.5, -1.5, 9.2), 0.03, m.whitePaint)
    this.rod(g, new Vector3(-0.3, -0.4, 0.5), new Vector3(-5.5, -8.5, 3.8), 0.012, m.metal)
    this.rod(g, new Vector3(-0.3, -0.4, 0.5), new Vector3(-8.8, -3.2, 3.8), 0.012, m.metal)
  }

  /**
   * Tiangong: the Tianhe core along z, its spherical docking node, the Wentian and Mengtian labs forming the T,
   * their large flexible arrays, and a Shenzhou crew ship and Tianzhou freighter docked.
   */
  private buildTiangong(g: Group): void {
    const m = this.mats
    this.tube(g, 2.1, 10.5, -5.5, m.whiteBlanket)
    this.tube(g, 1.4, 5, 2.3, m.whiteBlanket)
    this.mesh(new SphereGeometry(1.4, 32, 24), m.whiteBlanket, g, 0, 0, 5.5)
    for (const sx of [-1, 1]) {
      const lab = this.tube(g, 2.1, 17.9, 0, m.whiteBlanket)
      lab.rotation.set(0, 0, Math.PI / 2)
      lab.position.set(sx * 10.4, 0, 5.5)
      // Each lab carries two large flexible wings at its far end, along z.
      this.rod(g, new Vector3(sx * 17, 0, 5.5 - 27), new Vector3(sx * 17, 0, 5.5 + 27), 0.2, m.metal)
      // Long axis along z, face turned towards the light (+x).
      for (const sz of [-1, 1]) this.panel(g, 25, 4.2, m.cellsDark, sx * 17, 0, 5.5 + sz * 14).rotation.y = Math.PI / 2
    }
    // Tianhe's own smaller arrays, along x.
    for (const sx of [-1, 1]) this.panel(g, 10, 2.8, m.cellsDark, sx * 7.5, 0, -6).rotation.x = Math.PI / 2
    // Tianzhou at the aft port, Shenzhou at the node's nadir port.
    this.tube(g, 1.7, 10.6, -16, m.whitePaint)
    for (const sx of [-1, 1]) this.panel(g, 6, 1.6, m.cellsDark, sx * 5, 0, -17).rotation.x = Math.PI / 2
    this.mesh(new CylinderGeometry(1.4, 1.4, 8.5, 48), m.whitePaint, g, 0, -5.6, 5.5)
    for (const sx of [-1, 1]) this.panel(g, 5, 1.2, m.cellsDark, sx * 3.6, -7.5, 5.5).rotation.x = Math.PI / 2
  }

  /** Sputnik 1: a polished 58 cm sphere with four swept-back whip antennas (2.4 and 2.9 m). */
  private buildSputnik(g: Group): void {
    const m = this.mats
    this.mesh(new SphereGeometry(0.29, 64, 48), m.polished, g)
    const seam = this.mesh(new CylinderGeometry(0.292, 0.292, 0.012, 64), m.metal, g)
    seam.rotation.x = Math.PI / 2
    const roots: [number, number, number][] = [[0.12, 0.12, 0.23], [-0.12, 0.12, 0.23], [0.12, -0.12, 0.23], [-0.12, -0.12, 0.23]]
    roots.forEach(([x, y, z], i) => {
      const length = i < 2 ? 2.4 : 2.9
      const a = new Vector3(x, y, z)
      // Swept back at ~35° from the axis, splayed outwards.
      const dir = new Vector3(Math.sign(x) * 0.42, Math.sign(y) * 0.42, -1).normalize()
      this.rod(g, a, a.clone().addScaledVector(dir, length), 0.006, m.polished)
    })
  }
}

/** Parabolic dish facing +y, from a lathe profile. */
function dishGeometry(radius: number, depth: number): LatheGeometry {
  const pts: Vector2[] = []
  for (let i = 0; i <= 24; i++) {
    const r = (i / 24) * radius
    pts.push(new Vector2(r, (r * r) / (radius * radius) * depth))
  }
  return new LatheGeometry(pts, 64)
}

/**
 * Scales a model so its bounding sphere has the given radius, and centres it on that sphere, or on one of its
 * parts when given (so long booms do not push the main body to the edge of the frame).
 */
function normalize(g: Group, radius: number, centreOn: Object3D | null): void {
  g.updateMatrixWorld(true)
  const sphere = new Box3().setFromObject(g).getBoundingSphere(new Sphere())
  const centre = centreOn ? new Box3().setFromObject(centreOn).getCenter(new Vector3()) : sphere.center
  const k = radius / sphere.radius
  g.scale.setScalar(k)
  g.position.copy(centre).multiplyScalar(-k)
}
