import { DataUtils } from 'three'
import { TYPE_PARAMS, type PlanetType } from '../presets'

/**
 * Plain facts about a generated world, measured on its baked data: what share of the globe is ocean, ice, cloud,
 * craters... The home page writes its description from them, so the text says what this seed actually looks like
 * rather than repeating how the planet is made. Shares are 0–1, weighted by true area on the sphere.
 */
export interface SurfaceFacts {
  type: PlanetType
  /** Ocean worlds: open or frozen sea. */
  ocean?: number
  /** Ocean and arid worlds: snow, polar caps and sea ice. */
  ice?: number
  /** Ocean worlds: share of the globe under visible cloud. */
  cloud?: number
  /**
   * Arid worlds: ground shaped by a crater (bowl, rim or ejecta). Measured on the 128 px preview, where the bake
   * fades out craters too small for that resolution: this counts the large craters only (the text says so).
   */
  cratered?: number
  /** Gas giants: area under a storm. */
  storm?: number
  /** Ice worlds: crust crossed by ridges or chaos terrain. */
  ridged?: number
}

/*
 * The thresholds below restate the surface shader (shaders/surface.ts) at the point where a texel visibly switches
 * from one look to the other (the middle of its smoothstep). If the shader's colour rules change, these must follow,
 * or the description will disagree with the picture.
 */
/** Ocean snow: `snow = smoothstep(0.14, 0.03, temp + (moist - 0.5) * 0.1)`, half-way at 0.085. */
const SNOW_TEMP = 0.085
/** Ocean sea ice: `smoothstep(0.86, 0.93, lat + (moist - 0.5) * 0.1)`, half-way at 0.895. */
const SEA_ICE_LAT = 0.895
/** Arid frost: `smoothstep(0.9, 0.955, lat + h * 0.06)`, half-way at 0.9275. */
const ARID_FROST_LAT = 0.9275
/** Arid craters: the bake stores 0.5 + crater relief × 4.5 in `extra`; further than this from 0.5 counts. */
const CRATER_EXTRA = 0.08
/** Gas giants: the bake's storm mask (blue channel); above this the storm is drawn. */
const STORM_MASK = 0.5
/** Ice worlds: the bake's lineae + chaos mask (alpha); above this ridges dominate the colour. */
const RIDGE_MASK = 0.5
/**
 * Clouds: baked coverage (red channel, 0–255) from which a cloud counts as visible. The cloud shader's opacity is the
 * coverage itself (`a = cov`, shaders/clouds.ts), so 64 = 25 % opacity, clearly white over dark sea. Measured on
 * seed 2718: half-opaque only (128) gave 4 %, the mean coverage 7 %, this 11 %, against ~12–15 % of cloud seen on
 * the lit disc. Lower = thin haze counts too.
 */
const CLOUD_VISIBLE = 64

/**
 * Measures one world from its baked cube faces (CubeBaker.readFaces): `surface` is the RGBA16F data bake
 * (height, gradient x, gradient y, extra), `clouds` the RGBA8 cloud bake or null.
 */
export function measureSurface(
  type: PlanetType, size: number, surface: Uint16Array[], clouds: Uint8Array[] | null,
): SurfaceFacts {
  const sea = TYPE_PARAMS[type].sea
  let total = 0
  let ocean = 0
  let ice = 0
  let cratered = 0
  let storm = 0
  let ridged = 0
  for (let face = 0; face < 6; face++) {
    const data = surface[face]!
    for (let j = 0; j < size; j++) {
      const v = ((j + 0.5) / size) * 2 - 1
      for (let i = 0; i < size; i++) {
        const u = ((i + 0.5) / size) * 2 - 1
        const len2 = 1 + u * u + v * v
        const len = Math.sqrt(len2)
        // A cube texel covers less of the sphere toward the face corners: its solid angle is ∝ 1 / len³.
        const w = 1 / (len2 * len)
        // |y| of the texel's direction: 1/len on the ±Y faces, |v|/len on the four sides, whatever the faces'
        // orientation (only the latitude's magnitude is needed, so the cube layout cannot get it wrong).
        const lat = face === 2 || face === 3 ? 1 / len : Math.abs(v) / len
        const k = (j * size + i) * 4
        const h = DataUtils.fromHalfFloat(data[k]!)
        const extra = DataUtils.fromHalfFloat(data[k + 3]!)
        total += w
        if (type === 'ocean') {
          if (h < sea) {
            ocean += w
            if (lat + (extra - 0.5) * 0.1 > SEA_ICE_LAT) ice += w
          } else {
            const e = Math.min(Math.max((h - sea) / 0.7, 0), 1)
            const temp = 1 - Math.pow(lat, 1.6) * 1.15 - e * 0.65
            if (temp + (extra - 0.5) * 0.1 < SNOW_TEMP) ice += w
          }
        } else if (type === 'arid') {
          if (Math.abs(extra - 0.5) > CRATER_EXTRA) cratered += w
          if (lat + h * 0.06 > ARID_FROST_LAT) ice += w
        } else if (type === 'gas') {
          if (DataUtils.fromHalfFloat(data[k + 2]!) > STORM_MASK) storm += w
        } else if (extra > RIDGE_MASK) {
          ridged += w
        }
      }
    }
  }
  const facts: SurfaceFacts = { type }
  if (type === 'ocean') {
    facts.ocean = ocean / total
    facts.ice = ice / total
    if (clouds) facts.cloud = cloudShare(size, clouds)
  } else if (type === 'arid') {
    facts.cratered = cratered / total
    facts.ice = ice / total
  } else if (type === 'gas') {
    facts.storm = storm / total
  } else {
    facts.ridged = ridged / total
  }
  return facts
}

/** Area share of a cloud bake at or above CLOUD_VISIBLE. The cloud cube may be smaller than the surface one. */
function cloudShare(surfaceSize: number, faces: Uint8Array[]): number {
  const size = Math.round(Math.sqrt(faces[0]!.length / 4)) || surfaceSize
  let total = 0
  let covered = 0
  for (const data of faces) {
    for (let j = 0; j < size; j++) {
      const v = ((j + 0.5) / size) * 2 - 1
      for (let i = 0; i < size; i++) {
        const u = ((i + 0.5) / size) * 2 - 1
        const len2 = 1 + u * u + v * v
        const w = 1 / (len2 * Math.sqrt(len2))
        total += w
        if (data[(j * size + i) * 4]! >= CLOUD_VISIBLE) covered += w
      }
    }
  }
  return covered / total
}
