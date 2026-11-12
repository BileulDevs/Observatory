import type { Localized } from '~/types/systems'

/** One constellation in the list: names, a mini drawing of its figure and summary figures. */
export interface ConstellationSummary {
  /** URL slug, from the Latin name ("ursa-major"). */
  id: string
  /** IAU three-letter abbreviation. */
  abbr: string
  name: Localized
  latin: string
  genitive: string
  /** SVG path of the figure in a 100 × 100 box (gnomonic projection, east to the left as on the sky). */
  path: string
  /** Figure stars in the same box: x, y, apparent magnitude. */
  dots: [number, number, number][]
  figureStars: number
  /** Nearest and farthest figure star, light-years (null when no star has a parallax). */
  nearestLy: number | null
  farthestLy: number | null
  /** Name or designation of the brightest star listed. */
  brightest: string
}

/** A star of a constellation (HYG database v4.1). */
export interface ConstellationStar {
  hip: number
  /** IAU proper name, when it has one. */
  name: string | null
  /** Bayer (α Ori), else Flamsteed (58 Ori), else Hipparcos number. */
  designation: string
  /** Right ascension and declination, degrees (J2000). */
  ra: number
  dec: number
  /** Null when the parallax is missing or not significant. */
  distLy: number | null
  mag: number
  absmag: number
  spect: string | null
  /** B−V colour index: sets the colour (and an estimate of the temperature). */
  ci: number | null
  /** Luminosity, Sun = 1 (from the absolute magnitude). */
  lum: number
  /** Part of the traditional figure (joined by lines); otherwise a bright star of the area. */
  figure: boolean
}

/** The data the 3D page loads: stars and the figure's segments (index pairs into stars). */
export interface ConstellationData {
  id: string
  abbr: string
  stars: ConstellationStar[]
  segments: [number, number][]
}
