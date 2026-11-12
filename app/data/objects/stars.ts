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
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Atmosphère polluée', en: 'Polluted atmosphere' },
        text: { fr: 'Sodium et calcium venus de débris rocheux', en: 'Sodium and calcium from rocky debris' },
        body: {
          fr: 'Une naine blanche n’a plus de fusion et sa gravité fait couler les éléments lourds vers l’intérieur en quelques jours à quelques millions d’années. S’il en reste en surface, c’est qu’il en arrive sans cesse : ici, des débris de corps rocheux qui tombent sur l’étoile. Leur sodium et leur calcium, dans une atmosphère très dense, dessinent son spectre.',
          en: 'A white dwarf has no fusion left and its gravity sinks heavy elements inwards within days to millions of years. If some remain at the surface, more keep arriving: here, debris of rocky bodies falling onto the star. Their sodium and calcium, in a very dense atmosphere, shape its spectrum.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Vert chartreuse', en: 'Chartreuse green' },
        text: { fr: 'La première étoile qui paraîtrait verte', en: 'The first star that would look green' },
        body: {
          fr: 'Le sodium absorbe l’orange et le rouge, le calcium le violet : ce qui reste paraît vert chartreuse. D’autres étoiles émettent surtout du vert, mais leur lumière mêle toutes les couleurs et paraît blanche. Celle-ci serait la première à sembler vraiment verte à l’œil.',
          en: 'Sodium absorbs orange and red, calcium absorbs violet: what is left looks chartreuse green. Other stars peak in green, but their light mixes every colour and looks white. This one would be the first to look truly green to the eye.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Carbone en surface', en: 'Surface carbon' },
        text: { fr: 'Remonté de l’intérieur, il rougit la lumière', en: 'Dredged up, it reddens the light' },
        body: {
          fr: 'Dans certaines naines blanches qui refroidissent, la convection fait remonter le carbone du cœur jusqu’en surface. Ce carbone, en partie sous forme de molécules, absorbe fortement le bleu et le vert. Ici, l’effet est si marqué que la lumière restante tire vers le rouge.',
          en: 'In some cooling white dwarfs, convection dredges carbon up from the core to the surface. That carbon, partly in molecules, strongly absorbs blue and green. Here the effect is so strong that the remaining light turns red.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Rose saumon', en: 'Salmon pink' },
        text: { fr: 'Peut-être l’étoile la plus rouge repérée', en: 'Perhaps the reddest star yet found' },
        body: {
          fr: 'Une teinte rose saumon profond : c’est peut-être l’étoile la plus rouge jamais repérée, alors que sa température seule ne la rendrait pas rouge. C’est sa composition, pas sa chaleur, qui fixe sa couleur. La teinte affichée est celle calculée par l’étude à partir du spectre.',
          en: 'A deep salmon pink: perhaps the reddest star ever found, although its temperature alone would not make it red. Its composition, not its heat, sets its colour. The tint shown is the one the study computed from the spectrum.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Hydrogène pur', en: 'Pure hydrogen' },
        text: { fr: '≈ 25 000 K, d’où son blanc bleuté', en: '≈ 25,000 K, hence its blue-white' },
        body: {
          fr: 'À environ 25 000 K, sa surface est bien plus chaude que celle du Soleil. Son atmosphère est faite d’hydrogène presque pur : les éléments plus lourds ont coulé sous une gravité quelque 400 000 fois celle de la Terre. Alvan Graham Clark l’a vue pour la première fois en 1862.',
          en: 'At about 25,000 K its surface is far hotter than the Sun’s. Its atmosphere is almost pure hydrogen: heavier elements have sunk under a gravity some 400,000 times Earth’s. Alvan Graham Clark first saw it in 1862.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Taille de la Terre', en: 'Earth-sized' },
        text: { fr: '≈ 1 masse solaire, 11 700 km de diamètre', en: '≈ 1 solar mass, 11,700 km across' },
        body: {
          fr: 'Une masse proche de celle du Soleil dans une sphère de la taille de la Terre : une cuillère à café de sa matière pèserait une dizaine de tonnes. C’est le cœur éteint d’une étoile d’environ cinq masses solaires, qui a perdu ses couches externes il y a environ 120 millions d’années.',
          en: 'About the Sun’s mass in a sphere the size of the Earth: a teaspoon of its matter would weigh around ten tonnes. It is the dead core of a star of about five solar masses, which shed its outer layers some 120 million years ago.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Sirius', 'Sirius')],
  },
]
