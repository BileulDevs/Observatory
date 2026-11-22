# Observatoire

A showcase site about planets: one procedural planet you can art-direct, and real planetary systems
(the Solar System, TRAPPIST-1, Kepler-90, Proxima Centauri, HR 8799) plus procedurally generated ones.

Stack: **Nuxt 4 · Vue 3 · TypeScript · Three.js · GLSL · @nuxtjs/i18n (FR / EN)**.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # static site in .output/public
npm run typecheck
```

Static hosting: generated systems other than the featured ones are rendered client-side, so the host must
serve `200.html` for unknown paths. `public/_redirects` does it on Netlify; other hosts need the equivalent rule.

## Layout

```
app/
  engine/                 Framework-agnostic WebGL engine (no Vue import in here)
    Engine.ts             Renderer, render-on-demand loop, post-processing, one Stage at a time
    stages/               ObservatoryStage (home), SystemStage (orrery / carousel / inspect),
                          CatalogueStage / ObjectCatalogueStage (live thumbnails), ObjectStage (object viewer)
    objects/              Catalogue objects: BlackHole (lensing ray-march), NeutronStar, Galaxy (point clouds),
                          Nebula (volume ray-march), Comet, DwarfPlanet, Spacecraft (built models)
    bodies/               Planet (procedural or mapped), Star, Backdrop (sky, stars)
    bake/                 CubeBaker: procedural fields baked once into cubemaps, strip by strip
    core/                 Quality tiers, PRNG, tweens, colour-map cache
    shaders/              GLSL, one module per material
    presets.ts, look.ts   Planet classes, palettes, art styles and their blending
  data/
    systems.ts            Real systems, with sources  ← numbers to keep up to date (moon counts move)
    objects/              Catalogue objects by category, with sources  ← same (Voyager's distance moves)
    generate.ts           Deterministic system generator (gen-<seed>)
    scale.ts              Real → display compression (sizes, orbits, periods)
  composables/            useSpace / useStage (engine ↔ pages), useLocalized, useFacts, useObjectFacts
  pages/                  index (Observatoire), systems/index, systems/[id], objects/index, objects/[id], credits
i18n/locales/             UI wording, fr.json and en.json (same keys in both)
public/textures/solar/    Public-domain NASA / USGS maps (see the Credits page)
public/textures/moons/    Same, for the moons that have a real map
public/textures/dwarf/    Same, for Pluto and Ceres
public/models/spacecraft/ NASA 3D Resources models (ISS, Hubble, JWST, Voyager 1), Draco + WebP via gltf-transform
public/draco/             Draco decoder (from three/examples/jsm/libs/draco/gltf/), needed by those models
```

## Adding a real system

Add a `PlanetarySystem` to `app/data/systems.ts` and list it in `realSystems`. Every planet needs at least its
semi-major axis and period; any other fact is optional and only shown when present. Cite the sources in
`sources`: they appear in the panel and on the Credits page.

## 3D quality

The engine picks a tier from the device (`app/engine/core/quality.ts`). To force one while testing:

```js
localStorage.setItem('space:quality', 'low') // 'low' | 'medium' | 'high'; remove the key to go back to auto
```
