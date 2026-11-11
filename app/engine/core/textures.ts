import { SRGBColorSpace, TextureLoader, type Texture } from 'three'

/**
 * Shared cache of colour maps: several planets (or a revisit of the same system) reuse one GPU texture.
 * Textures stay alive until disposeTextures(); they are few and small (2048×1024 JPEG).
 */
const cache = new Map<string, Promise<Texture>>()
const loader = new TextureLoader()

export function loadColorMap(url: string): Promise<Texture> {
  let p = cache.get(url)
  if (!p) {
    p = loader.loadAsync(url).then((t) => {
      // Maps are authored in sRGB; without this they render washed out after tone mapping.
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 8
      return t
    })
    // A failed load must not poison the cache: the next call retries.
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

export function disposeTextures(): void {
  for (const p of cache.values()) p.then((t) => t.dispose()).catch(() => {})
  cache.clear()
}
