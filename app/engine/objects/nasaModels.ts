import { Box3, Color, DoubleSide, MeshStandardMaterial, Sphere, type Material, type Mesh, type Object3D, type Texture } from 'three'
import { loadGlb } from './gltf'
import type { CraftMaterials } from './spacecraftMaterials'
import { addSurfaceDetail, DetailFrame, type DetailKind } from './surfaceDetail'

/**
 * NASA 3D Resources models (public domain), prepared with gltf-transform (scripts in tools/craft.mjs of the
 * working copy): meshes joined per material (the ISS shipped as 510 meshes, the JWST as 1,519: one draw call
 * each), Draco geometry, WebP textures. Files live in public/models/spacecraft/; preview/ holds the catalogue
 * versions, simplified to ~5–25 % of the triangles with 256–512 px textures.
 */
export const NASA_MODELS = {
  'iss': '/models/spacecraft/iss.glb',
  'hubble': '/models/spacecraft/hubble.glb',
  'jwst': '/models/spacecraft/jwst.glb',
  'voyager-1': '/models/spacecraft/voyager-1.glb',
} as const
export type NasaModel = keyof typeof NASA_MODELS

/** Catalogue thumbnail version of a model: same parts and materials, far fewer triangles and texels. */
function previewUrl(model: NasaModel): string {
  return NASA_MODELS[model].replace('/spacecraft/', '/spacecraft/preview/')
}

/** Reflections on loaded models; their own materials were authored for a lit studio, not black space. */
const ENV_INTENSITY = 0.85
/**
 * Detail tiles across the model's bounding radius. 5 gives ~1.5 m tiles on Hubble and the JWST: foil creases of
 * 5–25 cm, visible at the default framing, with the second octave taking over when zoomed in. Higher values
 * shrink the pattern below a pixel at the default framing, where the mipmaps flatten it away.
 */
const DETAIL_TILES = 5

/** A loaded model and the frame its procedural detail is measured in (track it every frame). */
export interface LoadedModel {
  root: Object3D
  detail: DetailFrame
}

/**
 * Loads a NASA model (its light preview version for thumbnails) and upgrades its materials for this renderer.
 * The caller owns and disposes the result.
 */
export async function loadNasaModel(model: NasaModel, mats: CraftMaterials, preview: boolean): Promise<LoadedModel> {
  const gltf = await loadGlb(preview ? previewUrl(model) : NASA_MODELS[model])
  const scene = gltf.scene
  scene.updateMatrixWorld(true)
  const radius = new Box3().setFromObject(scene).getBoundingSphere(new Sphere()).radius
  const detail = new DetailFrame()
  const tiles = DETAIL_TILES / Math.max(radius, 1e-6)
  // A material may be shared by many meshes (279 on the ISS): upgrade each one once.
  const done = new Map<Material, Material>()
  const up = (m: Material): Material => {
    let out = done.get(m)
    if (!out) {
      out = upgrade(m, model, mats)
      const kind = detailKind(out, model)
      if (kind) addSurfaceDetail(out as MeshStandardMaterial, { kind, scale: tiles, frame: detail })
      done.set(m, out)
    }
    return out
  }
  scene.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(up) : up(mesh.material)
  })
  return { root: scene, detail }
}

/**
 * Which procedural detail an upgraded material gets, or none. Materials with their own normal map already
 * carry relief (ISS modules, crinkled JWST foils); mirrors must stay optically smooth.
 */
function detailKind(material: Material, model: NasaModel): DetailKind | null {
  const m = material as MeshStandardMaterial
  if (!m.isMeshStandardMaterial || m.normalMap || m.bumpMap) return null
  const name = m.name.toLowerCase()
  if (name.includes('mirror')) return null
  if (model === 'jwst') {
    if (name.includes('sacells')) return null
    if (name.includes('paint')) return 'paint'
    if (name.includes('alu') || name.includes('carbon')) return 'metal'
  }
  // Hubble and Voyager name their materials after texture sheets: nothing to classify by. Hubble is wrapped in
  // foil almost everywhere; Voyager is mostly painted (white dish, black bus), where creases would look dented.
  return model === 'voyager-1' ? 'paint' : 'generic'
}

/**
 * Frees every geometry, material and texture of a loaded model, except the textures shared with the craft
 * materials (environment, crinkle, cell maps), which upgrade() put there and the shared set still uses.
 */
export function disposeModel(root: Object3D, mats: CraftMaterials): void {
  const shared = new Set<Texture>(mats.textures)
  const textures = new Set<Texture>()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const m of ([] as Material[]).concat(mesh.material)) {
      for (const v of Object.values(m)) if ((v as Texture | null)?.isTexture) textures.add(v as Texture)
      m.dispose()
    }
  })
  textures.forEach((t) => { if (!shared.has(t)) t.dispose() })
}

/**
 * Adds reflections to every material, and for the JWST (shipped with flat colours only) gives each part a
 * textured material chosen from its name: gold mirror, crinkled insulation foil, sunshield film, solar cells.
 */
function upgrade(material: Material, model: NasaModel, mats: CraftMaterials): Material {
  const m = material as MeshStandardMaterial
  if (!m.isMeshStandardMaterial) return material
  if (model === 'jwst') {
    const name = m.name.toLowerCase()
    const base = m.color.clone()
    const tuned = (p: Partial<MeshStandardMaterial>): MeshStandardMaterial => {
      const out = new MeshStandardMaterial({ envMap: mats.env, envMapIntensity: ENV_INTENSITY })
      Object.assign(out, p)
      out.name = m.name
      m.dispose()
      return out
    }
    // The mirror faces away from the Sun, in the sunshield's shadow, as in flight: a faint gold glow stands in
    // for the sky it reflects, otherwise it reads as a black hole in the picture.
    if (name.includes('mirror_blinn')) return tuned({ color: new Color('#f2b94a'), metalness: 1, roughness: 0.12, envMapIntensity: 1.6, emissive: new Color('#6b4612') })
    if (name.includes('omnimirror')) return tuned({ color: new Color('#d9dce0'), metalness: 1, roughness: 0.1 })
    if (name.includes('shld')) {
      // Kapton film coated with aluminium: silvery with a magenta tint, softly crinkled.
      return tuned({ color: new Color(name.includes('pink') ? '#d7b4cf' : '#cfd2d8'), metalness: 0.7, roughness: 0.32, normalMap: mats.crinkle, side: DoubleSide })
    }
    if (name.includes('sacells')) return tuned({ map: mats.cellsDark.map, metalness: 0.4, roughness: 0.32 })
    if (name.includes('mli')) {
      // Insulation blankets: the file's colours are a near-black rendition; lift them and add the crinkle.
      const color = base.multiplyScalar(5.5)
      return tuned({ color, metalness: 0.65, roughness: 0.36, normalMap: mats.crinkle })
    }
    if (name.includes('alu')) return tuned({ color: new Color('#a9b3bd'), metalness: 0.9, roughness: 0.35 })
    if (name.includes('gold')) return tuned({ color: new Color('#c99a3e'), metalness: 1, roughness: 0.3, normalMap: mats.crinkle })
  }
  m.envMap = mats.env
  m.envMapIntensity = ENV_INTENSITY
  m.needsUpdate = true
  return m
}
