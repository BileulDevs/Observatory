import type { SpaceObject } from '~/types/objects'
import { CONSTELLATION, constellation, wikipedia } from './common'

/**
 * Stars whose look is the story: white dwarfs coloured by their atmosphere rather than their temperature
 * (Hollands et al., RAS Techniques and Instruments, October 2026), and a classic hot white dwarf for contrast.
 */

const WARWICK_STUDY = {
  label: 'Sky & Telescope — A chartreuse white dwarf shows some stars really are green (2026)',
  url: 'https://skyandtelescope.org/astronomy-news/a-chartreuse-white-dwarf-shows-some-stars-really-are-green/',
}
const STUDY_FACT = {
  key: 'study',
  text: { fr: 'Hollands et al., RAS Techniques and Instruments, octobre 2026', en: 'Hollands et al., RAS Techniques and Instruments, October 2026' },
}

export const STARS: SpaceObject[] = [
  {
    id: 'wd-j1330-6435', category: 'stars', name: 'WD J1330+6435',
    kind: { fr: 'Naine blanche verte', en: 'Green white dwarf' },
    description: {
      fr: "La première étoile connue qui paraîtrait vraiment verte à l'œil. Cette naine blanche a avalé les débris rocheux de planètes qui l'entouraient : le sodium de son atmosphère très dense absorbe l'orange et le rouge, le calcium le violet, et il reste une lueur vert chartreuse.",
      en: 'The first star known that would look genuinely green to the eye. This white dwarf swallowed the rocky debris of planets that once orbited it: sodium in its very dense atmosphere absorbs orange and red, calcium the violet, and a chartreuse glow is left.',
    },
    facts: [
      { key: 'distance', value: 280, unit: 'ly', qualifier: '≈' },
      constellation(CONSTELLATION.draco),
      { key: 'surfaceTemperature', value: 4300, unit: 'k', qualifier: '≈', note: { fr: '≈ 4 000 °C', en: '≈ 4,000 °C' } },
      { key: 'atmosphere', text: { fr: 'hélium, avec calcium, sodium et lithium venus de débris planétaires', en: 'helium, with calcium, sodium and lithium from planetary debris' } },
      { key: 'colour', text: { fr: 'vert chartreuse (calculé d\'après son spectre)', en: 'chartreuse green (computed from its spectrum)' } },
      STUDY_FACT,
    ],
    render: { kind: 'star', temperatureK: 4300, tint: '#d2ef9c', granulation: 1.8, spots: 0, glow: 0.5, rotationS: 3600, seed: 71 },
    appearance: 'computedColour',
    sources: [WARWICK_STUDY],
  },
  {
    id: 'wd-j1011-2845', category: 'stars', name: 'WD J1011+2845',
    kind: { fr: 'Naine blanche rose', en: 'Pink white dwarf' },
    description: {
      fr: "Identifiée dans la même étude que l'étoile verte, c'est peut-être l'étoile la plus rouge jamais repérée. Du carbone remonté à sa surface change la lumière qu'elle émet et lui donne une teinte rose saumon profond.",
      en: 'Found in the same study as the green star, it may be the reddest star ever recorded. Carbon dredged up to its surface changes the light it gives off, turning it a deep salmon pink.',
    },
    facts: [
      { key: 'distance', value: 48, unit: 'ly', qualifier: '≈' },
      { key: 'atmosphere', text: { fr: 'riche en carbone', en: 'carbon-rich' } },
      { key: 'colour', text: { fr: 'rose saumon (calculé d\'après son spectre)', en: 'salmon pink (computed from its spectrum)' } },
      STUDY_FACT,
    ],
    render: { kind: 'star', temperatureK: 5000, tint: '#f39a8a', granulation: 1.8, spots: 0, glow: 0.5, rotationS: 7200, seed: 72 },
    appearance: 'computedColour',
    sources: [WARWICK_STUDY],
  },
  {
    id: 'sirius-b', category: 'stars', name: 'Sirius B',
    kind: { fr: 'Naine blanche', en: 'White dwarf' },
    description: {
      fr: "La naine blanche la plus proche du Soleil, compagne de Sirius, l'étoile la plus brillante du ciel nocturne. Une masse proche de celle du Soleil dans une boule de la taille de la Terre, si chaude que son atmosphère d'hydrogène pur la fait paraître bleu pâle.",
      en: 'The nearest white dwarf to the Sun, companion of Sirius, the brightest star in the night sky. About a Sun\'s mass packed into a ball the size of Earth, so hot that its pure hydrogen atmosphere makes it look pale blue.',
    },
    facts: [
      { key: 'distance', value: 8.6, unit: 'ly', digits: 1 },
      constellation(CONSTELLATION.canisMajor),
      { key: 'mass', value: 1.02, unit: 'msun', digits: 2 },
      { key: 'radius', value: 5800, unit: 'km', qualifier: '≈' },
      { key: 'surfaceTemperature', value: 25000, unit: 'k', qualifier: '≈' },
      { key: 'companion', text: { fr: 'Sirius A', en: 'Sirius A' } },
      { key: 'discovery', text: { fr: '1862 · Alvan Graham Clark', en: '1862 · Alvan Graham Clark' } },
    ],
    render: { kind: 'star', temperatureK: 25000, granulation: 1.8, spots: 0, glow: 0.5, rotationS: 86400, seed: 73 },
    appearance: 'impression',
    sources: [wikipedia('Sirius', 'Sirius')],
  },
]
