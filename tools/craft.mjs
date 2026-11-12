// Prepares NASA spacecraft models for the site: fewer draw calls (meshes joined per material), optional
// simplification and texture downsizing for thumbnails, Draco geometry, WebP textures.
// Usage: node craft.mjs <in.glb> <out.glb> [ratio] [texSize] [simplifyError] [sloppy]
// sloppy=1 clusters vertices by position instead of collapsing edges: works on triangle soups (bolts, rails),
// which the regular simplifier cannot reduce because every triangle edge is a border.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { compactPrimitive, dedup, flatten, join, weld, simplify, textureCompress, prune, draco } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const [input, output, ratioArg, texArg, errorArg, sloppyArg] = process.argv.slice(2)
const ratio = ratioArg ? Number(ratioArg) : 1
const tex = texArg ? Number(texArg) : 0
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
const doc = await io.read(input)
const steps = [dedup(), flatten(), join({ keepNamed: false }), weld()]
const error = errorArg ? Number(errorArg) : 0.002
await MeshoptSimplifier.ready
if (ratio < 1 && sloppyArg === '1') {
  steps.push((d) => {
    for (const mesh of d.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices()
      if (!idx) continue
      const pos = prim.getAttribute('POSITION')
      const positions = new Float32Array(pos.getCount() * 3)
      const el = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, el); positions.set(el, i * 3) }
      const indices = new Uint32Array(idx.getArray())
      const target = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3)
      let [out] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, error)
      // Drop specks left by the clustering (components smaller than the error).
      out = MeshoptSimplifier.simplifyPrune(out, positions, 3, error)
      idx.setArray(out.length > 65535 ? out : new Uint32Array(out))
      compactPrimitive(prim)
    }
  })
} else if (ratio < 1) {
  steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error }))
}
if (tex) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: 82 }))
steps.push(prune(), draco())
await doc.transform(...steps)
await io.write(output, doc)
let tris = 0, prims = 0
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) { prims++; tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3 }
console.log(output, 'primitives', prims, 'triangles', Math.round(tris))
