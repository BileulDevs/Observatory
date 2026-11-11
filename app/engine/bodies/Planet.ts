import {
  AdditiveBlending, Color, CustomBlending, DoubleSide, Group, Matrix3, Matrix4, Mesh, OneFactor,
  OneMinusSrcAlphaFactor, Quaternion, RingGeometry, ShaderMaterial, SphereGeometry, Vector3,
  type Camera, type Texture, type WebGLCubeRenderTarget,
} from 'three'
import { BakePass, type BakeJob, type CubeBaker } from '../bake/CubeBaker'
import { mulberry32 } from '../core/random'
import { blendLook, createLook, type Look } from '../look'
import { loadColorMap } from '../core/textures'
import { PLANET_TYPES, TYPE_PARAMS, type ArtStyle, type PlanetRender } from '../presets'
import { ATMO_FRAG } from '../shaders/atmosphere'
import { CLOUD_FRAG } from '../shaders/clouds'
import { RING_FRAG, RING_VERT } from '../shaders/ring'
import { PLANET_FRAG, SURFACE_VERT } from '../shaders/surface'

/** Resolution of the instant preview bake shown while the full bake runs. Higher = slower first frame. */
const PREVIEW_RES = 128
/** Clouds are soft: half the surface resolution is visually lossless and saves 3/4 of their memory. */
const CLOUD_RES_RATIO = 0.5
/** Never bake clouds below this, or cyclones turn into blobs. */
const MIN_CLOUD_RES = 256
/** Ring radii in planet radii. */
const RING_INNER = 1.38
const RING_OUTER = 2.35
/** Cloud shell radius. Higher and clouds visibly float; lower and they z-fight with the surface. */
const CLOUD_RADIUS = 1.008
/** Ground spin in rad/s. Above ~0.05 the motion pulls the eye away from the text next to it. */
const SPIN_SPEED = 0.018
/** Clouds drift slightly faster than the ground, so the weather visibly moves. */
const CLOUD_SPIN_SPEED = 0.024
/** Camera distances between which close-up micro detail fades in. */
const DETAIL_FAR = 4.2
const DETAIL_NEAR = 2.2

export interface PlanetBuildOptions {
  /** Cube face size of the full bake. Change later with setResolution(). */
  bakeRes: number
  atmosphereSteps: number
  /** Keep the instant preview bake only (thumbnails): no full-resolution job is queued. */
  previewOnly?: boolean
}

/** Progress of the full-resolution bake, for loading UI. */
export interface PlanetBakeProgress {
  done: number
  total: number
}

/**
 * A procedural planet: surface, cloud shell, scattering atmosphere and optional rings.
 * Owns every GPU resource it creates and releases them in dispose(); old bakes are freed as soon as a new one lands.
 */
export class Planet {
  /** Tilted frame: everything in it shares the planet's axial tilt. Add this to the scene. */
  readonly root = new Group()

  private readonly baker: CubeBaker
  private bakeRes: number
  private readonly previewOnly: boolean
  private spec: PlanetRender = { type: 'ocean', seed: 1 }
  /** Light direction override in world space (e.g. towards the system's star); null = style azimuth. */
  private sunDirection: Vector3 | null = null
  private scale = 1
  /** Colour of the light source (star temperature); null = the style's sun colour. */
  private lightTint: Color | null = null
  /** Bumped on every setSpec, so a late texture load for a previous planet is ignored. */
  private specVersion = 0
  private styleFrom: ArtStyle = 'natural'
  private styleTo: ArtStyle = 'natural'
  private styleT = 0
  /** Sun azimuth override in degrees; null = follow the style's default. */
  private sunAzimuth: number | null = null
  private relief = 1
  private readonly look: Look = createLook()
  private onProgress?: (p: PlanetBakeProgress) => void
  private onReady?: () => void
  private job: BakeJob | null = null
  private surfaceTarget: WebGLCubeRenderTarget | null = null
  private cloudTarget: WebGLCubeRenderTarget | null = null

  /** Uniforms shared by several materials: writing one value updates every shader that uses it. */
  private readonly shared = {
    sunW: { value: new Vector3() },
    sunColor: { value: new Color() },
    sunI: { value: 3 },
    amb: { value: new Vector3() },
    ringN: { value: new Vector3(0, 1, 0) },
    ringIn: { value: RING_INNER },
    ringOut: { value: RING_OUTER },
    ringSeed: { value: 0 },
  }

  private readonly surfaceU = {
    uData: { value: null as Texture | null },
    uClouds: { value: null as Texture | null },
    uType: { value: 0 },
    uSunW: this.shared.sunW,
    uSunO: { value: new Vector3() },
    uSunColor: this.shared.sunColor,
    uSunI: this.shared.sunI,
    uAmb: this.shared.amb,
    uP0: { value: new Color() }, uP1: { value: new Color() }, uP2: { value: new Color() },
    uP3: { value: new Color() }, uP4: { value: new Color() }, uP5: { value: new Color() },
    uSkyTint: { value: new Color() },
    uSea: { value: 0 },
    uBump: { value: 0 },
    uCity: { value: 0 },
    uOverlay: { value: 0 },
    uContourF: { value: 20 },
    uInk: { value: new Color('#2a2621') },
    // Night-side overlay lines: a faint luminous version of the page text colour.
    uInkNight: { value: new Color('#ece7dc').multiplyScalar(0.05) },
    uAccent: { value: new Color('#e2a75b') },
    uDetail: { value: 0 },
    uHasClouds: { value: 0 },
    uHasRings: { value: 0 },
    uRingN: this.shared.ringN,
    uCloudRel: { value: new Matrix3() },
    uSeedR: { value: 0 },
    uRotW: { value: new Matrix3() },
    uRingIn: this.shared.ringIn,
    uRingOut: this.shared.ringOut,
    uRingSeed: this.shared.ringSeed,
    uCenter: { value: new Vector3() },
    uScale: { value: 1 },
    uMap: { value: null as Texture | null },
    uUseMap: { value: 0 },
    uMapWater: { value: 0 },
  }
  private readonly cloudU = {
    uClouds: { value: null as Texture | null },
    uSunW: this.shared.sunW,
    uSunCO: { value: new Vector3() },
    uSunColor: this.shared.sunColor,
    uSunI: this.shared.sunI,
    uAmb: this.shared.amb,
    uTint: { value: new Color(1, 1, 1) },
    uOpacity: { value: 1 },
  }
  private readonly atmoU = {
    uSunW: this.shared.sunW,
    uRp: { value: 1 },
    uRa: { value: 1.05 },
    uHR: { value: 0.012 },
    uHM: { value: 0.004 },
    uKR: { value: new Vector3() },
    uKM: { value: new Vector3() },
    uG: { value: 0.76 },
    uI: { value: 5 },
    uCenter: this.surfaceU.uCenter,
    uScale: this.surfaceU.uScale,
  }
  private readonly ringU = {
    uSunW: this.shared.sunW,
    uSunColor: this.shared.sunColor,
    uSunI: this.shared.sunI,
    uRingN: this.shared.ringN,
    uAmb: this.shared.amb,
    uR0: { value: new Color() },
    uR1: { value: new Color() },
    uRingIn: this.shared.ringIn,
    uRingOut: this.shared.ringOut,
    uRingSeed: this.shared.ringSeed,
    uCenter: this.surfaceU.uCenter,
    uScale: this.surfaceU.uScale,
  }

  private readonly surface: Mesh<SphereGeometry, ShaderMaterial>
  private readonly clouds: Mesh<SphereGeometry, ShaderMaterial>
  private readonly atmosphere: Mesh<SphereGeometry, ShaderMaterial>
  private readonly rings: Mesh<RingGeometry, ShaderMaterial>

  private readonly tmpQ = new Quaternion()
  private readonly tmpM = new Matrix4()
  private readonly tmpKR = new Vector3()
  private readonly tmpAvg = new Vector3()

  constructor(baker: CubeBaker, opts: PlanetBuildOptions) {
    this.baker = baker
    this.bakeRes = opts.bakeRes
    this.previewOnly = !!opts.previewOnly

    this.surface = new Mesh(
      new SphereGeometry(1, 192, 128),
      new ShaderMaterial({ vertexShader: SURFACE_VERT, fragmentShader: PLANET_FRAG, uniforms: this.surfaceU }),
    )
    // Premultiplied "over" blending: the shaders output colour already multiplied by alpha.
    this.clouds = new Mesh(
      new SphereGeometry(CLOUD_RADIUS, 160, 110),
      new ShaderMaterial({
        vertexShader: SURFACE_VERT, fragmentShader: CLOUD_FRAG, uniforms: this.cloudU, transparent: true, depthWrite: false,
        blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      }),
    )
    this.clouds.renderOrder = 1
    this.atmosphere = new Mesh(
      new SphereGeometry(1, 128, 96),
      new ShaderMaterial({
        vertexShader: SURFACE_VERT, fragmentShader: ATMO_FRAG, uniforms: this.atmoU, transparent: true, depthWrite: false,
        blending: AdditiveBlending, defines: { STEPS: opts.atmosphereSteps },
      }),
    )
    this.atmosphere.renderOrder = 2
    this.rings = new Mesh(
      new RingGeometry(RING_INNER, RING_OUTER, 384, 1),
      new ShaderMaterial({
        vertexShader: RING_VERT, fragmentShader: RING_FRAG, uniforms: this.ringU, transparent: true, depthWrite: false,
        side: DoubleSide, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      }),
    )
    // RingGeometry lies in XY; lay it in the equatorial plane of the tilted frame.
    this.rings.rotation.x = -Math.PI / 2
    this.rings.renderOrder = 3

    this.root.add(this.surface, this.clouds, this.atmosphere, this.rings)
  }

  /**
   * Shows a planet. A tiny preview is baked synchronously so something is on screen at once,
   * then the full-resolution bake is queued; `onProgress` reports it and `onReady` fires when it lands.
   */
  setSpec(spec: PlanetRender, onProgress?: (p: PlanetBakeProgress) => void, onReady?: () => void): void {
    this.spec = { ...spec }
    const version = ++this.specVersion
    this.surfaceU.uUseMap.value = 0
    this.surfaceU.uMap.value = null
    if (spec.texture) {
      loadColorMap(spec.texture).then((tex) => {
        if (version !== this.specVersion) return
        this.surfaceU.uMap.value = tex
        this.surfaceU.uUseMap.value = 1
        this.onReady?.()
      }).catch((err) => console.warn('[planet] colour map failed, keeping the procedural surface', spec.texture, err))
    }
    this.onProgress = onProgress
    this.onReady = onReady
    const typeIndex = PLANET_TYPES.indexOf(spec.type)
    const params = TYPE_PARAMS[spec.type]
    const seed = seedVector(spec.seed)

    const preview = this.baker.createTarget(PREVIEW_RES, BakePass.Surface)
    this.baker.bakeNow(preview, BakePass.Surface, typeIndex, seed)
    let previewClouds: WebGLCubeRenderTarget | null = null
    if (params.clouds) {
      previewClouds = this.baker.createTarget(PREVIEW_RES, BakePass.Clouds)
      this.baker.bakeNow(previewClouds, BakePass.Clouds, typeIndex, seed)
    }
    this.swapTargets(preview, previewClouds)
    this.applyLook()
    if (this.previewOnly) this.onReady?.()
    else this.queueBake()
  }

  /**
   * Re-bakes at another resolution, keeping the current textures on screen until the new ones land.
   * Raise it while a planet is inspected up close, drop it back afterwards to free GPU memory.
   */
  setResolution(res: number): void {
    const pending = this.job !== null
    if (res === this.bakeRes && (pending || this.surfaceTarget?.width === res)) return
    this.bakeRes = res
    this.queueBake()
  }

  get resolution(): number {
    return this.bakeRes
  }

  /** Current full-bake progress, or null when idle. */
  get progress(): PlanetBakeProgress | null {
    return this.job ? { done: this.job.done, total: this.job.total } : null
  }

  setStyle(style: ArtStyle): void {
    this.setStyleBlend(style, style, 0)
  }

  /** Shows a mix of two styles, t = 0 → `from`, t = 1 → `to`. Uniform writes only: safe to call every frame. */
  setStyleBlend(from: ArtStyle, to: ArtStyle, t: number): void {
    this.styleFrom = from
    this.styleTo = to
    this.styleT = t
    this.applyLook()
  }

  /** Sun azimuth in degrees (0 = behind the camera's start position); null restores the style default. */
  setSunAzimuth(deg: number | null): void {
    this.sunAzimuth = deg
    this.updateSun()
  }

  /** Relief multiplier for the baked normals and close-up detail. 1 = authored strength. */
  setRelief(relief: number): void {
    this.relief = relief
    this.applyLook()
  }

  /** The resolved style mix: the engine reads post-processing settings (bloom, grain...) from it. */
  get currentLook(): Readonly<Look> {
    return this.look
  }

  /** Exposure the engine should apply when this planet is the subject. */
  get exposure(): number {
    return this.look.exposure * TYPE_PARAMS[this.spec.type].exposure
  }

  get planetSpec(): Readonly<PlanetRender> {
    return this.spec
  }

  /** Display radius in world units. Shaders work on a unit sphere and divide by it. */
  setScale(scale: number): void {
    this.scale = scale
    this.root.scale.setScalar(scale)
    this.surfaceU.uScale.value = scale
  }

  get radius(): number {
    return this.scale
  }

  /** This planet's light, shared by reference: satellites lit with it follow every change automatically. */
  get lightUniforms(): { sunW: { value: Vector3 }; sunColor: { value: Color }; sunI: { value: number }; amb: { value: Vector3 } } {
    return { sunW: this.shared.sunW, sunColor: this.shared.sunColor, sunI: this.shared.sunI, amb: this.shared.amb }
  }

  /** Tints the incoming light, e.g. with the black-body colour of a red dwarf. null = neutral. */
  setLightTint(color: Color | null): void {
    this.lightTint = color ? color.clone() : null
    this.applyLook()
  }

  /** Lights the planet from a world-space direction (towards its star); null returns to the style's sun. */
  setSunDirection(dir: Vector3 | null): void {
    if (dir) (this.sunDirection ??= new Vector3()).copy(dir).normalize()
    else this.sunDirection = null
    this.updateSun()
  }

  /** Converts a direction in the rotating surface frame (unit vector) to a world-space point on the surface. */
  surfaceToWorld(dirInOut: Vector3): Vector3 {
    this.surface.updateWorldMatrix(true, false)
    return dirInOut.applyMatrix4(this.surface.matrixWorld)
  }

  /** World-space centre, valid after the last update(). */
  get center(): Vector3 {
    return this.surfaceU.uCenter.value
  }

  /** Advances rotation (when spinning) and refreshes the per-frame uniforms. Cheap: a few matrix ops. */
  update(dt: number, camera: Camera, spin: boolean): void {
    if (spin) {
      this.surface.rotation.y += dt * SPIN_SPEED
      this.clouds.rotation.y += dt * CLOUD_SPIN_SPEED
    }
    this.root.updateMatrixWorld()
    this.root.getWorldPosition(this.surfaceU.uCenter.value)

    this.surface.getWorldQuaternion(this.tmpQ)
    this.surfaceU.uSunO.value.copy(this.shared.sunW.value).applyQuaternion(this.tmpQ.invert())
    this.surfaceU.uRotW.value.setFromMatrix4(this.surface.matrixWorld)
    this.clouds.getWorldQuaternion(this.tmpQ)
    this.cloudU.uSunCO.value.copy(this.shared.sunW.value).applyQuaternion(this.tmpQ.invert())
    // Maps a surface direction into cloud-shell space, for cloud shadows on the ground.
    this.tmpM.makeRotationY(this.surface.rotation.y - this.clouds.rotation.y)
    this.surfaceU.uCloudRel.value.setFromMatrix4(this.tmpM)
    this.root.getWorldQuaternion(this.tmpQ)
    this.shared.ringN.value.set(0, 1, 0).applyQuaternion(this.tmpQ)

    // In planet radii, so close-up detail kicks in at the same apparent size whatever the display scale.
    const dist = camera.position.distanceTo(this.surfaceU.uCenter.value) / this.scale
    const t = Math.min(Math.max((DETAIL_FAR - dist) / (DETAIL_FAR - DETAIL_NEAR), 0), 1)
    this.surfaceU.uDetail.value = t * t * (3 - 2 * t) * this.relief
  }

  dispose(): void {
    this.job?.cancel()
    this.job = null
    this.surfaceTarget?.dispose()
    this.cloudTarget?.dispose()
    this.surfaceTarget = null
    this.cloudTarget = null
    for (const mesh of [this.surface, this.clouds, this.atmosphere, this.rings]) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    this.root.removeFromParent()
  }

  private queueBake(): void {
    this.job?.cancel()
    this.job = null
    const typeIndex = PLANET_TYPES.indexOf(this.spec.type)
    const params = TYPE_PARAMS[this.spec.type]
    const seed = seedVector(this.spec.seed)
    const surfaceT = this.baker.createTarget(this.bakeRes, BakePass.Surface)
    const items = [{ target: surfaceT, pass: BakePass.Surface as BakePass }]
    let cloudT: WebGLCubeRenderTarget | null = null
    if (params.clouds) {
      cloudT = this.baker.createTarget(Math.max(MIN_CLOUD_RES, Math.round(this.bakeRes * CLOUD_RES_RATIO)), BakePass.Clouds)
      items.push({ target: cloudT, pass: BakePass.Clouds })
    }
    const job = this.baker.enqueue(
      items, typeIndex, seed,
      () => {
        this.swapTargets(surfaceT, cloudT)
        if (this.job === job) this.job = null
        this.onReady?.()
      },
      () => {
        surfaceT.dispose()
        cloudT?.dispose()
      },
    )
    this.job = job
    this.onProgress?.({ done: 0, total: job.total })
  }

  private swapTargets(surface: WebGLCubeRenderTarget, clouds: WebGLCubeRenderTarget | null): void {
    if (this.surfaceTarget && this.surfaceTarget !== surface) this.surfaceTarget.dispose()
    if (this.cloudTarget && this.cloudTarget !== clouds) this.cloudTarget.dispose()
    this.surfaceTarget = surface
    this.cloudTarget = clouds
    this.surfaceU.uData.value = surface.texture
    this.surfaceU.uClouds.value = clouds ? clouds.texture : null
    this.cloudU.uClouds.value = clouds ? clouds.texture : null
  }

  private applyLook(): void {
    const type = TYPE_PARAMS[this.spec.type]
    const look = blendLook(this.spec.type, this.styleFrom, this.styleTo, this.styleT, this.look)
    const s = this.surfaceU
    s.uP0.value.copy(look.palette[0]); s.uP1.value.copy(look.palette[1]); s.uP2.value.copy(look.palette[2])
    s.uP3.value.copy(look.palette[3]); s.uP4.value.copy(look.palette[4]); s.uP5.value.copy(look.palette[5])
    s.uType.value = PLANET_TYPES.indexOf(this.spec.type)
    s.uSea.value = type.sea
    s.uBump.value = type.bump * this.relief
    s.uCity.value = this.spec.type === 'ocean' ? look.city : 0
    s.uOverlay.value = look.overlay
    s.uContourF.value = type.contour
    const hasClouds = this.spec.clouds ?? type.clouds
    const hasRings = this.spec.rings ?? type.rings
    s.uHasClouds.value = hasClouds ? 1 : 0
    s.uHasRings.value = hasRings ? 1 : 0
    s.uMapWater.value = this.spec.waterGlint ? 1 : 0
    if (this.spec.palette) {
      const p = this.spec.palette
      s.uP0.value.set(p[0]); s.uP1.value.set(p[1]); s.uP2.value.set(p[2])
      s.uP3.value.set(p[3]); s.uP4.value.set(p[4]); s.uP5.value.set(p[5])
    }
    s.uSeedR.value = (this.spec.seed % 1000) * 0.137
    s.uAccent.value.copy(look.accent)

    this.clouds.visible = hasClouds
    this.rings.visible = hasRings
    this.shared.ringSeed.value = (this.spec.seed % 997) * 1.7
    this.ringU.uR0.value.copy(look.ring0)
    this.ringU.uR1.value.copy(look.ring1)
    this.cloudU.uTint.value.copy(look.cloudTint)
    this.cloudU.uOpacity.value = look.cloudOpacity

    const a = this.spec.atmosphere === undefined ? type.atmo : this.spec.atmosphere
    this.atmosphere.visible = a !== null
    if (a === null) {
      s.uSkyTint.value.setRGB(0, 0, 0)
      this.finishLook(look, type.tilt)
      return
    }
    const kR = this.tmpKR.set(...a.kR)
    const avg = (kR.x + kR.y + kR.z) / 3
    kR.lerp(this.tmpAvg.set(avg, avg, avg), 1 - look.atmoSat)
    const au = this.atmoU
    au.uRa.value = 1 + a.thick
    // Scale heights as fractions of the shell: keeps the falloff shape when thickness changes.
    au.uHR.value = a.thick * 0.25
    au.uHM.value = a.thick * 0.09
    au.uKR.value.copy(kR)
    au.uKM.value.set(...a.kM)
    au.uG.value = a.g
    au.uI.value = 5 * look.atmoI
    this.atmosphere.scale.setScalar(1 + a.thick)
    // Water reflects the colour of its own sky.
    s.uSkyTint.value.setRGB(kR.x, kR.y, kR.z).multiplyScalar(0.004 * look.atmoI)

    this.finishLook(look, type.tilt)
  }

  private finishLook(look: Look, classTilt: number): void {
    this.shared.sunColor.value.copy(look.sunColor)
    if (this.lightTint) {
      // Normalised so the brightest channel stays at 1: a red dwarf reddens the light without dimming it.
      const t = this.lightTint
      const m = Math.max(t.r, t.g, t.b, 1e-3)
      this.shared.sunColor.value.multiply(new Color(t.r / m, t.g / m, t.b / m))
    }
    this.shared.sunI.value = look.sunI
    this.shared.amb.value.copy(look.amb)
    this.root.rotation.z = this.spec.tiltDeg !== undefined ? (this.spec.tiltDeg * Math.PI) / 180 : classTilt
    this.updateSun()
  }

  private updateSun(): void {
    if (this.sunDirection) {
      this.shared.sunW.value.copy(this.sunDirection)
      return
    }
    const az = ((this.sunAzimuth ?? this.look.sunAz) * Math.PI) / 180
    const el = (this.look.sunEl * Math.PI) / 180
    this.shared.sunW.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize()
  }
}

/** Maps an integer seed to the noise-space offset the bake shaders use. */
function seedVector(seed: number): Vector3 {
  const r = mulberry32(seed * 9301 + 49297)
  return new Vector3(r() * 97, r() * 53, r() * 71)
}
