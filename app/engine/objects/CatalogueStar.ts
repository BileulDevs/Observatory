import {
  AdditiveBlending, BackSide, Color, Group, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry,
  type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { GLOW_VERT } from '../shaders/galaxy'
import { STAR_FRAG, STAR_GLOW_FRAG, STAR_VERT } from '../shaders/stellar'
import type { BodyContext, BodyView, SpaceBody } from './types'

export type StarRender = Extract<ObjectRender, { kind: 'star' }>

/** Disc radius in world units: every star is drawn at the same size, its real radius is in the fact sheet. */
const STAR_RADIUS = 1
/** Glow quad half-width, in star radii. Wider shows more corona but costs more overdraw. */
const GLOW_EXTENT = 3.2
/** Sphere segments: thumbnails / full. The lumpy envelope needs the finer mesh to wobble smoothly. */
const SEGMENTS = { preview: 48, full: 160 }
/** Granulation cells across the disc when render.granulation = 1 (Sun-like). */
const GRANULATION_SCALE = 9
/** Fastest on-screen spin, radians per second, whatever the real period: faster reads as a glitch. */
const MAX_SPIN = 1.2
/** Real rotation period (seconds) mapped to the on-screen spin: log-compressed, a day turns in ~60 s. */
function spinOf(periodS: number | undefined): number {
  if (!periodS) return 0.05
  return Math.min(MAX_SPIN, 0.1 / Math.max(0.2, Math.log10(Math.max(periodS, 1.1))))
}

/**
 * A star seen up close: photosphere with granulation, spots and limb darkening, a soft corona, and for black
 * hole stars a lumpy, churning red envelope inside a haze. Shared by the catalogue and the creator, which
 * updates it live through set().
 */
export class CatalogueStar implements SpaceBody {
  readonly root = new Group()
  readonly radius = STAR_RADIUS * 1.6
  readonly view: BodyView = { elevationDeg: 10, azimuthDeg: 30, distance: 5.5 }
  readonly minDistance = 0.9
  readonly animated = true

  private readonly surface: Mesh<SphereGeometry, ShaderMaterial>
  private readonly glow: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly haze: Mesh<SphereGeometry, ShaderMaterial>
  private readonly surfaceU = {
    uTime: { value: 0 }, uTemp: { value: 5800 }, uTint: { value: new Color() }, uTintMix: { value: 0 },
    uGranScale: { value: GRANULATION_SCALE }, uSpots: { value: 0 }, uActivity: { value: 0 }, uLumpy: { value: 0 },
    // Surface brightness: above ~1 the bloom washes the granulation out into a flat disc.
    uSeed: { value: 0 }, uI: { value: 0.85 },
  }
  private readonly glowU = { uColor: { value: new Color() }, uI: { value: 0.6 }, uCore: { value: 1 / GLOW_EXTENT } }
  private readonly hazeU = { uColor: { value: new Color() }, uI: { value: 0 } }
  private readonly parentQ = new Quaternion()
  private spin = 0.05

  constructor(render: StarRender, ctx: BodyContext) {
    const seg = ctx.preview ? SEGMENTS.preview : SEGMENTS.full
    this.surface = new Mesh(new SphereGeometry(STAR_RADIUS, seg, seg / 2), new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.surfaceU,
    }))
    this.root.add(this.surface)
    this.glow = new Mesh(new PlaneGeometry(STAR_RADIUS * GLOW_EXTENT * 2, STAR_RADIUS * GLOW_EXTENT * 2), new ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: STAR_GLOW_FRAG, uniforms: this.glowU,
      // No depth test: the quad cuts through the sphere, and depth-tested it shows a dark seam along the limb.
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    }))
    this.glow.renderOrder = 2
    this.root.add(this.glow)
    // Haze around envelope stars: a back-faced shell, brightest at the rim (light scattered in the outer gas).
    this.haze = new Mesh(new SphereGeometry(STAR_RADIUS * 1.35, 64, 32), new ShaderMaterial({
      vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG, uniforms: this.hazeU,
      side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.root.add(this.haze)
    this.set(render)
  }

  /** Applies new parameters without rebuilding anything (the creator calls this on every slider move). */
  set(render: StarRender): void {
    const u = this.surfaceU
    u.uTemp.value = render.temperatureK
    u.uTintMix.value = render.tint ? 1 : 0
    if (render.tint) u.uTint.value.set(render.tint)
    u.uGranScale.value = GRANULATION_SCALE * (render.granulation ?? 1)
    u.uSpots.value = render.spots ?? 0
    u.uActivity.value = render.activity ?? 0
    u.uLumpy.value = render.envelope?.lumpiness ?? 0
    u.uSeed.value = (render.seed % 23) * 0.37
    this.spin = spinOf(render.rotationS)
    const glowColor = render.tint ? new Color(render.tint) : blackbodyColor(render.temperatureK)
    this.glowU.uColor.value.copy(glowColor)
    this.glowU.uI.value = render.glow ?? 0.6
    this.haze.visible = !!render.envelope
    if (render.envelope) {
      this.hazeU.uColor.value.set(render.envelope.haze)
      this.hazeU.uI.value = 0.45
    }
  }

  update(dt: number, time: number, camera: PerspectiveCamera): void {
    this.surfaceU.uTime.value = time
    this.surface.rotation.y += dt * this.spin
    // Glow quad faces the camera whatever the parent's orientation.
    this.root.updateWorldMatrix(true, false)
    this.root.getWorldQuaternion(this.parentQ).invert()
    this.glow.quaternion.copy(camera.quaternion).premultiply(this.parentQ)
  }

  dispose(): void {
    for (const m of [this.surface, this.glow, this.haze]) {
      m.geometry.dispose()
      m.material.dispose()
    }
    this.root.removeFromParent()
  }
}

/**
 * Black-body colour of a temperature (Tanner Helland's fit, as the GLSL one), in linear RGB, for the glow quad
 * whose colour is set from JavaScript.
 */
export function blackbodyColor(kelvin: number): Color {
  const t = Math.min(Math.max(kelvin, 1000), 40000) / 100
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const r = t <= 66 ? 1 : clamp(1.292936 * Math.pow(t - 60, -0.1332048))
  const g = t <= 66 ? clamp(0.3900816 * Math.log(t) - 0.6318414) : clamp(1.1298909 * Math.pow(t - 60, -0.0755148))
  const b = t >= 66 ? 1 : t <= 19 ? 0 : clamp(0.5432068 * Math.log(t - 10) - 1.1962541)
  return new Color(r ** 2.2, g ** 2.2, b ** 2.2)
}

const HAZE_VERT = /* glsl */`
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  vNW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const HAZE_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uI;
varying vec3 vNW;
varying vec3 vPosW;
void main(){
  // Seen from outside through back faces: |N·V| is small at the rim, where the line of sight crosses most gas.
  float rim = 1.0 - abs(dot(normalize(vNW), normalize(cameraPosition - vPosW)));
  gl_FragColor = vec4(uColor * uI * pow(max(rim, 0.0), 2.5), 1.0);
}
`
