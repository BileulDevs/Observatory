/**
 * Checks the static build (.output/public, after `npm run generate`): every prerendered page must carry what search
 * engines and link previews read without running JavaScript. Run with `npm run check:head`; exits 1 on any miss.
 * No dependency: Node's fs and regular expressions on the generated HTML.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const ROOT = resolve('.output/public')
/** Shells and error pages: rendered on the client, nothing page-specific to check. */
const SKIPPED = new Set(['200.html', '404.html'])

/** What every page must contain, as [label, test on the HTML]. */
const CHECKS = [
  ['<title>', (html) => /<title>[^<]+<\/title>/.test(html)],
  ['meta description', (html) => /<meta name="description" content="[^"]+"/.test(html)],
  ['og:title', (html) => /<meta property="og:title" content="[^"]+"/.test(html)],
  ['og:description', (html) => /<meta property="og:description" content="[^"]+"/.test(html)],
  ['og:url', (html) => /<meta property="og:url" content="https?:\/\/[^"]+"/.test(html)],
  ['canonical', (html) => /<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)],
  // The image must exist in the build too: an absolute URL to a missing file gives a preview without a picture.
  ['og:image (served by this build)', (html) => {
    const url = /<meta property="og:image" content="(https?:\/\/[^"]+)"/.exec(html)?.[1]
    return !!url && existsSync(join(ROOT, new URL(url).pathname))
  }],
  ['twitter:image', (html) => /<meta name="twitter:image" content="https?:\/\/[^"]+"/.test(html)],
  ['<h1> with text', (html) => /<h1[^>]*>\s*[^<\s][^<]*<\/h1>/.test(html)],
]

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return htmlFiles(path)
    return name.endsWith('.html') && !SKIPPED.has(name) ? [path] : []
  })
}

let files
try {
  files = htmlFiles(ROOT)
} catch {
  console.error(`No build found in ${ROOT}: run \`npm run generate\` first.`)
  process.exit(1)
}

const failures = files.flatMap((file) => {
  const html = readFileSync(file, 'utf8')
  const missing = CHECKS.filter(([, test]) => !test(html)).map(([label]) => label)
  return missing.length ? [`/${relative(ROOT, file).split(sep).join('/')}: missing ${missing.join(', ')}`] : []
})

if (failures.length) {
  console.error(failures.slice(0, 30).join('\n'))
  if (failures.length > 30) console.error(`… and ${failures.length - 30} more`)
  console.error(`\n${failures.length} of ${files.length} pages fail the head check.`)
  process.exit(1)
}
console.log(`${files.length} pages checked: title, description, Open Graph (with image), canonical and <h1> all present.`)
