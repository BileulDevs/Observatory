/**
 * Serves the static build (.output/public) the way the production host does, for `npm run preview` after
 * `npm run generate`. Nuxt's own preview command expects a Node server build (`node server/index.mjs`) and
 * crashes on a static one; opening index.html from the disk cannot work either (file:// cannot resolve the
 * absolute /_nuxt/ paths). No dependency: Node's http module only.
 *
 * Mirrors public/_redirects: a path with no file falls back to the SPA shell (200.html) with status 200, and the
 * app's router then shows the right page, or the 404 page (app/error.vue) for an unknown address.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

/** Folder served, relative to the project root (where npm runs scripts). */
const ROOT = resolve('.output/public')
/** Port; override with PORT=… npm run preview. */
const PORT = Number(process.env.PORT) || 3000
/** The SPA shell nitro writes for client-rendered routes. */
const FALLBACK = '200.html'

/** Content types for what the build contains; anything else is served as bytes. */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
}

/** Resolves a URL path to a file of the build, or null. Refuses anything that would leave ROOT. */
function fileFor(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '')
  const full = resolve(ROOT, clean)
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null
  for (const candidate of [full, join(full, 'index.html'), full + '.html']) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

if (!existsSync(join(ROOT, FALLBACK))) {
  console.error(`No static build in ${ROOT}: run "npm run generate" first.`)
  process.exit(1)
}

createServer((req, res) => {
  let file = null
  try {
    file = fileFor(req.url ?? '/')
  } catch {
    // Malformed URL encoding: treat as not found.
  }
  const served = file ?? join(ROOT, FALLBACK)
  const type = TYPES[extname(served).toLowerCase()] ?? 'application/octet-stream'
  // Pre-compressed copies written by nitro (compressPublicAssets): use them when the browser accepts them.
  const accept = String(req.headers['accept-encoding'] ?? '')
  let body = served
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding' }
  if (/\bbr\b/.test(accept) && existsSync(served + '.br')) { body = served + '.br'; headers['Content-Encoding'] = 'br' }
  else if (/\bgzip\b/.test(accept) && existsSync(served + '.gz')) { body = served + '.gz'; headers['Content-Encoding'] = 'gzip' }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  createReadStream(body).pipe(res)
}).listen(PORT, () => {
  console.log(`Static build served at http://localhost:${PORT} (Ctrl+C to stop)`)
})
