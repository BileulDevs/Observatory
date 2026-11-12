import type { SpaceObject } from '~/types/objects'
import { wikipedia } from './common'

/** Comets, dwarf planets and spacecraft. Values from the cited pages (2026). */

const TEX = '/textures/dwarf/'

export const COMETS: SpaceObject[] = [
  {
    id: 'halley', category: 'comets', name: { fr: 'Comète de Halley', en: "Halley's Comet" },
    kind: { fr: 'Comète périodique · 1P', en: 'Periodic comet · 1P' },
    description: {
      fr: "La seule comète brillante qui revient à l'échelle d'une vie humaine, tous les 75 ans environ. La sonde Giotto a photographié son noyau sombre en 1986 ; son prochain passage au plus près du Soleil est prévu le 28 juillet 2061.",
      en: 'The only bright comet that returns within a human lifetime, about every 75 years. The Giotto probe photographed its dark nucleus in 1986; its next closest approach to the Sun is due on 28 July 2061.',
    },
    facts: [
      { key: 'orbitalPeriod', value: 74.7, unit: 'years', digits: 1 },
      { key: 'perihelion', value: 0.593, unit: 'au', digits: 3 },
      { key: 'aphelion', value: 35.14, unit: 'au', digits: 2 },
      { key: 'eccentricity', value: 0.967, digits: 3 },
      { key: 'nucleus', text: { fr: '15 × 7 × 7 km', en: '15 × 7 × 7 km' } },
      { key: 'lastPerihelion', text: { fr: '8 février 1986', en: '8 February 1986' } },
      { key: 'nextPerihelion', text: { fr: '28 juillet 2061', en: '28 July 2061' } },
    ],
    render: { kind: 'comet', nucleus: 'halley', tail: 9, ionTail: 0.9, dustTail: 0.8, comaColor: '#cfe2ff', seed: 51 },
    markers: [
      {
        anchor: 'nucleus',
        title: { fr: 'Noyau', en: 'Nucleus' },
        text: { fr: '15 × 8 km, plus sombre que du charbon', en: '15 × 8 km, darker than coal' },
        body: {
          fr: 'La sonde Giotto l’a photographié en 1986 à moins de 600 km : un bloc de 15 × 8 km, plus sombre que du charbon, d’où jaillissaient des jets de gaz. Sa croûte sombre est faite de poussière et de composés organiques. Chaque passage près du Soleil lui fait perdre quelques mètres de surface.',
          en: 'The Giotto probe imaged it in 1986 from under 600 km: a 15 × 8 km block, darker than coal, with jets of gas bursting out. Its dark crust is made of dust and organic compounds. Each pass near the Sun strips a few metres off its surface.',
        },
      },
      {
        anchor: 'ion-tail',
        title: { fr: 'Queue ionique', en: 'Ion tail' },
        text: { fr: 'Gaz soufflé par le vent solaire', en: 'Gas blown by the solar wind' },
        body: {
          fr: 'Les gaz libérés par le noyau sont ionisés par l’ultraviolet du Soleil puis entraînés par le vent solaire. Cette queue reste droite et pointe à l’opposé du Soleil, quelle que soit la direction de la comète. Sa teinte bleue vient du monoxyde de carbone ionisé.',
          en: 'Gases released by the nucleus are ionised by the Sun’s ultraviolet and swept away by the solar wind. This tail stays straight and points away from the Sun, whatever the comet’s direction. Its blue tint comes from ionised carbon monoxide.',
        },
      },
      {
        anchor: 'dust-tail',
        title: { fr: 'Queue de poussière', en: 'Dust tail' },
        text: { fr: 'Courbée le long de l’orbite', en: 'Curved along the orbit' },
        body: {
          fr: 'Les poussières, plus lourdes, sont poussées par la lumière du Soleil, pas par le vent solaire, et restent en arrière sur l’orbite : leur queue se courbe. Elle brille en réfléchissant la lumière solaire. Ce sont ces poussières qui donnent les étoiles filantes des Orionides et des Êta Aquarides.',
          en: 'Heavier dust grains are pushed by sunlight rather than the solar wind and lag behind along the orbit: their tail curves. It shines by reflecting sunlight. This dust gives the Orionid and Eta Aquariid meteor showers.',
        },
      },
    ],
    appearance: 'measuredShape',
    sources: [wikipedia("Halley's Comet", 'Halley%27s_Comet')],
  },
  {
    id: 'hale-bopp', category: 'comets', name: { fr: 'Comète Hale-Bopp', en: 'Comet Hale–Bopp' },
    kind: { fr: 'Grande comète de 1997', en: 'Great Comet of 1997' },
    description: {
      fr: "Visible à l'œil nu pendant 18 mois et demi, un record. Son noyau d'environ 60 km est l'un des plus gros connus, d'où ses deux queues spectaculaires, bleue et blanche. Elle ne reviendra que vers l'an 4385.",
      en: 'Visible to the naked eye for 18 and a half months, a record. Its nucleus of about 60 km is one of the largest known, hence its two spectacular tails, blue and white. It will not return until around 4385.',
    },
    facts: [
      { key: 'nucleus', value: 60, unit: 'km', qualifier: '≈', note: { fr: '± 20 km', en: '± 20 km' } },
      { key: 'perihelion', value: 0.914, unit: 'au', digits: 3, note: { fr: '1er avril 1997', en: '1 April 1997' } },
      { key: 'orbitalPeriod', value: 2399, unit: 'years', qualifier: '≈' },
      { key: 'eccentricity', value: 0.995, digits: 3 },
      { key: 'nakedEye', text: { fr: '18 mois et demi', en: '18½ months' } },
      { key: 'discovery', text: { fr: '23 juillet 1995 · Alan Hale et Thomas Bopp', en: '23 July 1995 · Alan Hale and Thomas Bopp' } },
    ],
    render: { kind: 'comet', nucleus: 'irregular', tail: 12, ionTail: 1, dustTail: 1, comaColor: '#e6f0ff', seed: 52 },
    markers: [
      {
        anchor: 'nucleus',
        title: { fr: 'Noyau géant', en: 'Giant nucleus' },
        text: { fr: '≈ 60 km, l’un des plus gros connus', en: '≈ 60 km, one of the largest known' },
        body: {
          fr: 'Avec environ 60 km, son noyau est l’un des plus gros observés, bien plus que celui de Halley. C’est pourquoi elle a été repérée dès 1995, très loin du Soleil, et visible à l’œil nu pendant 18 mois. Elle a été découverte le même soir par Alan Hale et Thomas Bopp.',
          en: 'At about 60 km, its nucleus is one of the largest ever seen, far bigger than Halley’s. That is why it was spotted as early as 1995, far from the Sun, and stayed visible to the naked eye for 18 months. Alan Hale and Thomas Bopp found it on the same night.',
        },
      },
      {
        anchor: 'ion-tail',
        title: { fr: 'Queue bleue', en: 'Blue tail' },
        text: { fr: 'Ions de monoxyde de carbone', en: 'Carbon monoxide ions' },
        body: {
          fr: 'Sa queue ionique bleue, très nette, se distinguait bien de la queue de poussière blanche. Sa couleur vient des ions de monoxyde de carbone excités par le Soleil. Des observations y ont aussi révélé une troisième queue, faite de sodium.',
          en: 'Its sharp blue ion tail stood clearly apart from the white dust tail. Its colour comes from carbon monoxide ions excited by the Sun. Observations also revealed a third tail, made of sodium.',
        },
      },
      {
        anchor: 'dust-tail',
        title: { fr: 'Queue blanche', en: 'White tail' },
        text: { fr: 'Poussière éclairée par le Soleil', en: 'Dust lit by the Sun' },
        body: {
          fr: 'Large et courbée, la queue de poussière réfléchit la lumière du Soleil. Très active, Hale-Bopp en produisait d’énormes quantités, d’où une queue visible même depuis les villes.',
          en: 'Broad and curved, the dust tail reflects sunlight. Very active, Hale–Bopp produced huge amounts of dust, hence a tail visible even from cities.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Comet Hale–Bopp', 'Comet_Hale%E2%80%93Bopp')],
  },
  {
    id: '67p', category: 'comets', name: '67P/Tchourioumov-Guérassimenko',
    kind: { fr: 'Comète visitée par Rosetta', en: 'Comet visited by Rosetta' },
    description: {
      fr: "Une comète en forme de canard, faite de deux lobes collés. La sonde européenne Rosetta l'a accompagnée pendant deux ans et son atterrisseur Philae s'y est posé le 12 novembre 2014. Sa densité est à peine la moitié de celle de l'eau.",
      en: 'A duck-shaped comet made of two lobes stuck together. ESA\'s Rosetta probe flew alongside it for two years and its lander Philae touched down on 12 November 2014. It is barely half as dense as water.',
    },
    facts: [
      { key: 'nucleus', text: { fr: '4,1 × 3,3 × 1,8 km + 2,6 × 2,3 × 1,8 km', en: '4.1 × 3.3 × 1.8 km + 2.6 × 2.3 × 1.8 km' } },
      { key: 'mass', value: 9.982e12, unit: 'kg', sci: true },
      { key: 'density', value: 0.533, unit: 'gcm3', digits: 3 },
      { key: 'rotation', value: 12.40, unit: 'hours', digits: 2 },
      { key: 'orbitalPeriod', value: 6.43, unit: 'years', digits: 2 },
      { key: 'perihelion', value: 1.21, unit: 'au', digits: 2 },
      { key: 'rosetta', text: { fr: 'arrivée 6 août 2014 · Philae posé le 12 novembre 2014', en: 'arrived 6 August 2014 · Philae landed 12 November 2014' } },
      { key: 'discovery', text: { fr: '1969 · Klim Tchourioumov et Svetlana Guérassimenko', en: '1969 · Klim Churyumov and Svetlana Gerasimenko' } },
    ],
    render: { kind: 'comet', nucleus: '67p', tail: 4, ionTail: 0.35, dustTail: 0.45, comaColor: '#dfe6ee', seed: 53 },
    markers: [
      {
        anchor: 'nucleus',
        title: { fr: 'Deux lobes', en: 'Two lobes' },
        text: { fr: '4,1 km de long, en forme de canard', en: '4.1 km long, shaped like a duck' },
        body: {
          fr: 'Deux lobes reliés par un col étroit, le plus grand mesurant 4,1 km : ils se sont sans doute formés séparément puis collés en douceur, il y a très longtemps. Sa densité, environ moitié de celle de l’eau, révèle un corps très poreux de glace et de poussière. L’atterrisseur Philae s’y est posé le 12 novembre 2014.',
          en: 'Two lobes joined by a narrow neck, the larger 4.1 km long: they probably formed separately and gently stuck together long ago. Its density, about half that of water, reveals a very porous body of ice and dust. The Philae lander touched down on it on 12 November 2014.',
        },
      },
      {
        anchor: 'coma',
        title: { fr: 'Coma', en: 'Coma' },
        text: { fr: 'Rosetta y a détecté de la glycine', en: 'Rosetta found glycine in it' },
        body: {
          fr: 'Le nuage de gaz et de poussière qui entoure le noyau quand il approche du Soleil. Rosetta, qui l’a traversé pendant deux ans, y a mesuré de l’eau, du dioxyde de carbone, de l’oxygène moléculaire et l’acide aminé glycine. Son eau n’a pas la même composition isotopique que celle des océans terrestres.',
          en: 'The cloud of gas and dust around the nucleus as it nears the Sun. Rosetta, flying through it for two years, measured water, carbon dioxide, molecular oxygen and the amino acid glycine. Its water does not have the same isotopic make-up as Earth’s oceans.',
        },
      },
    ],
    appearance: 'shapeModel',
    sources: [wikipedia('67P/Churyumov–Gerasimenko', '67P/Churyumov%E2%80%93Gerasimenko')],
  },
  {
    id: 'neowise', category: 'comets', name: 'C/2020 F3 (NEOWISE)',
    kind: { fr: 'Grande comète de 2020', en: 'Great Comet of 2020' },
    description: {
      fr: "Découverte par le télescope spatial NEOWISE en mars 2020, elle a été la comète la plus brillante de l'hémisphère Nord depuis Hale-Bopp, visible à l'œil nu en juillet 2020. Elle ne reviendra pas avant environ 6 800 ans.",
      en: 'Found by the NEOWISE space telescope in March 2020, it was the brightest comet in the northern sky since Hale–Bopp, visible to the naked eye in July 2020. It will not be back for about 6,800 years.',
    },
    facts: [
      { key: 'nucleus', value: 5, unit: 'km', qualifier: '≈' },
      { key: 'perihelion', value: 0.29, unit: 'au', digits: 2, note: { fr: '3 juillet 2020', en: '3 July 2020' } },
      { key: 'closestEarth', value: 0.69, unit: 'au', digits: 2, note: { fr: '23 juillet 2020', en: '23 July 2020' } },
      { key: 'orbitalPeriod', value: 6800, unit: 'years', qualifier: '≈' },
      { key: 'eccentricity', value: 0.9992, digits: 4 },
      { key: 'discovery', text: { fr: '27 mars 2020 · NEOWISE', en: '27 March 2020 · NEOWISE' } },
    ],
    render: { kind: 'comet', nucleus: 'irregular', tail: 10, ionTail: 0.75, dustTail: 1, comaColor: '#f2e8d4', seed: 54 },
    markers: [
      {
        anchor: 'dust-tail',
        title: { fr: 'Queue de poussière', en: 'Dust tail' },
        text: { fr: 'Large et jaunâtre, visible à l’œil nu', en: 'Broad and yellowish, seen by eye' },
        body: {
          fr: 'Sa large queue de poussière, jaunâtre et courbée, se voyait à l’œil nu en juillet 2020, au crépuscule. Ce fut l’une des comètes les plus photographiées de l’histoire.',
          en: 'Its broad, yellowish, curved dust tail was visible to the naked eye at dusk in July 2020. It became one of the most photographed comets in history.',
        },
      },
      {
        anchor: 'ion-tail',
        title: { fr: 'Queue ionique', en: 'Ion tail' },
        text: { fr: 'Fine et bleutée sur les photos', en: 'Thin and bluish in photographs' },
        body: {
          fr: 'Une fine queue ionique bleutée, droite, se détachait sur les photos de longue pose, dans une direction un peu différente de celle des poussières. Des observations ont aussi montré une queue de sodium, comme pour Hale-Bopp.',
          en: 'A thin, straight, bluish ion tail stood out in long exposures, pointing slightly away from the dust. Observations also showed a sodium tail, as with Hale–Bopp.',
        },
      },
      {
        anchor: 'nucleus',
        title: { fr: 'Noyau', en: 'Nucleus' },
        text: { fr: '≈ 5 km de diamètre', en: '≈ 5 km across' },
        body: {
          fr: 'Le télescope spatial NEOWISE, qui l’a découverte, a estimé son noyau à environ 5 km, couvert de matière sombre héritée des débuts du Système solaire. Elle a survécu à un passage à seulement 0,29 UA du Soleil.',
          en: 'The NEOWISE space telescope, which found it, put its nucleus at about 5 km, coated in dark material left from the early Solar System. It survived a pass only 0.29 AU from the Sun.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('C/2020 F3 (NEOWISE)', 'C/2020_F3_(NEOWISE)')],
  },
  {
    id: 'tsuchinshan-atlas', category: 'comets', name: 'C/2023 A3 (Tsuchinshan–ATLAS)',
    kind: { fr: 'Grande comète de 2024', en: 'Great Comet of 2024' },
    description: {
      fr: "Venue du nuage de Oort, elle a atteint la magnitude −4,9 en octobre 2024, l'éclat de Vénus. Elle a montré une anti-queue : une fine pointe de poussière qui semble pointer vers le Soleil quand la Terre traverse le plan de son orbite.",
      en: 'Coming from the Oort cloud, it reached magnitude −4.9 in October 2024, as bright as Venus. It showed an anti-tail: a thin spike of dust that seems to point towards the Sun when Earth crosses the plane of its orbit.',
    },
    facts: [
      { key: 'perihelion', value: 0.391, unit: 'au', digits: 3, note: { fr: '27 septembre 2024', en: '27 September 2024' } },
      { key: 'closestEarth', value: 0.47, unit: 'au', digits: 2, note: { fr: '12 octobre 2024', en: '12 October 2024' } },
      { key: 'peakMagnitude', text: { fr: '−4,9', en: '−4.9' } },
      { key: 'orbitalPeriod', text: { fr: 'non périodique (nuage de Oort)', en: 'non-periodic (Oort cloud)' } },
      { key: 'discovery', text: { fr: '9 janvier 2023 · observatoire de la Montagne Pourpre', en: '9 January 2023 · Purple Mountain Observatory' } },
    ],
    render: { kind: 'comet', nucleus: 'irregular', tail: 11, ionTail: 0.6, dustTail: 1, comaColor: '#f5ecd8', antiTail: true, seed: 55 },
    markers: [
      {
        anchor: 'anti-tail',
        title: { fr: 'Anti-queue', en: 'Anti-tail' },
        text: { fr: 'Poussière dans le plan de l’orbite', en: 'Dust in the orbital plane' },
        body: {
          fr: 'Mi-octobre 2024, une fine pointe de poussière semblait sortir de la comète vers le Soleil. Ce sont des poussières restées dans le plan de l’orbite : quand la Terre traverse ce plan, on les voit par la tranche, comme une aiguille. L’effet ne dure que quelques jours.',
          en: 'In mid-October 2024 a thin spike of dust seemed to point from the comet towards the Sun. It is dust left in the orbital plane: when Earth crosses that plane we see it edge-on, like a needle. The effect lasts only a few days.',
        },
      },
      {
        anchor: 'dust-tail',
        title: { fr: 'Queue de poussière', en: 'Dust tail' },
        text: { fr: 'Magnitude −4,9 en octobre 2024', en: 'Magnitude −4.9 in October 2024' },
        body: {
          fr: 'Au plus près du Soleil, elle a atteint la magnitude −4,9, l’éclat de Vénus, observée par la sonde SOHO. Cet éclat vient de la diffusion vers l’avant : les poussières renvoient fortement la lumière quand la comète passe presque entre le Soleil et l’observateur.',
          en: 'Near the Sun it reached magnitude −4.9, as bright as Venus, seen by the SOHO spacecraft. The brightness comes from forward scattering: dust strongly redirects light when the comet passes nearly between the Sun and the observer.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('C/2023 A3 (Tsuchinshan–ATLAS)', 'C/2023_A3_(Tsuchinshan%E2%80%93ATLAS)')],
  },
  {
    id: '3i-atlas', category: 'comets', name: '3I/ATLAS',
    kind: { fr: 'Comète interstellaire', en: 'Interstellar comet' },
    description: {
      fr: "Le troisième objet interstellaire connu, découvert le 1er juillet 2025. Il traverse le Système solaire sur une trajectoire ouverte à 58 km/s et pourrait être plus vieux que le Soleil. Sa coma rougeâtre est riche en dioxyde de carbone.",
      en: 'The third interstellar object known, found on 1 July 2025. It crosses the Solar System on an open path at 58 km/s and may be older than the Sun. Its reddish coma is rich in carbon dioxide.',
    },
    facts: [
      { key: 'eccentricity', value: 6.14, digits: 2, note: { fr: 'orbite hyperbolique', en: 'hyperbolic orbit' } },
      { key: 'excessSpeed', value: 58, unit: 'kms' },
      { key: 'perihelion', value: 1.36, unit: 'au', digits: 2, note: { fr: '29 octobre 2025', en: '29 October 2025' } },
      { key: 'closestEarth', value: 1.8, unit: 'au', digits: 2, note: { fr: '19 décembre 2025', en: '19 December 2025' } },
      { key: 'nucleus', value: 1, unit: 'km', qualifier: '<', note: { fr: 'probable', en: 'likely' } },
      { key: 'age', text: { fr: '3 à 14 milliards d\'années (estimations)', en: '3 to 14 billion years (estimates)' } },
      { key: 'discovery', text: { fr: '1er juillet 2025 · ATLAS (Chili)', en: '1 July 2025 · ATLAS (Chile)' } },
    ],
    render: { kind: 'comet', nucleus: 'irregular', tail: 3, ionTail: 0.15, dustTail: 0.5, comaColor: '#e8b89a', seed: 56 },
    markers: [
      {
        anchor: 'coma',
        title: { fr: 'Coma riche en CO₂', en: 'CO₂-rich coma' },
        text: { fr: 'Teinte rougeâtre', en: 'Reddish tint' },
        body: {
          fr: 'Le JWST a trouvé sa coma très riche en dioxyde de carbone, et sa teinte rougeâtre rappelle certains corps du Système solaire externe. Ces mesures donnent un aperçu de la chimie d’un autre système planétaire.',
          en: 'JWST found its coma very rich in carbon dioxide, and its reddish tint recalls some bodies of the outer Solar System. These measurements give a glimpse of another planetary system’s chemistry.',
        },
      },
      {
        anchor: 'nucleus',
        title: { fr: 'Visiteur interstellaire', en: 'Interstellar visitor' },
        text: { fr: '58 km/s sur une trajectoire ouverte', en: '58 km/s on an open path' },
        body: {
          fr: 'Troisième objet connu venu d’une autre étoile, après ʻOumuamua (2017) et Borisov (2019). Il file à environ 58 km/s sur une trajectoire ouverte : il ne passera qu’une fois. Sa trajectoire suggère qu’il vient du disque épais de la Galaxie et qu’il est peut-être plus vieux que le Soleil.',
          en: 'The third known object from another star, after ʻOumuamua (2017) and Borisov (2019). It travels at about 58 km/s on an open path: it will pass only once. Its trajectory suggests it comes from the Galaxy’s thick disk and may be older than the Sun.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('3I/ATLAS', '3I/ATLAS')],
  },
]

export const DWARF_PLANETS: SpaceObject[] = [
  {
    id: 'pluto', category: 'dwarf-planets', name: { fr: 'Pluton', en: 'Pluto' },
    kind: { fr: 'Planète naine · ceinture de Kuiper', en: 'Dwarf planet · Kuiper belt' },
    description: {
      fr: "Neuvième planète jusqu'en 2006. Le 14 juillet 2015, New Horizons a révélé un monde actif : glaciers d'azote, montagnes de glace d'eau et la grande plaine en forme de cœur, Spoutnik Planitia. Elle tourne sur elle-même à l'envers.",
      en: 'The ninth planet until 2006. On 14 July 2015 New Horizons revealed an active world: nitrogen glaciers, water-ice mountains and the great heart-shaped plain, Sputnik Planitia. It spins backwards.',
    },
    facts: [
      { key: 'radius', value: 1188.3, unit: 'km', digits: 1 },
      { key: 'mass', value: 1.3025e22, unit: 'kg', sci: true },
      { key: 'semiMajorAxis', value: 39.482, unit: 'au', digits: 2 },
      { key: 'orbitalPeriod', value: 247.94, unit: 'years', digits: 1 },
      { key: 'rotation', value: 6.387, unit: 'days', digits: 3, note: { fr: 'rétrograde', en: 'retrograde' } },
      { key: 'moons', text: '5' },
      { key: 'meanTemp', value: 44, unit: 'k' },
      { key: 'discovery', text: { fr: '18 février 1930 · Clyde Tombaugh', en: '18 February 1930 · Clyde Tombaugh' } },
    ],
    render: {
      kind: 'dwarf-planet',
      planet: {
        // 122.5° is retrograde: drawn as 180 − 122.5 so the north, the side New Horizons photographed in
        // 2015, faces the default view instead of the never-imaged south.
        type: 'ice', seed: 61, texture: TEX + 'pluto.jpg', tiltDeg: 57.5,
        atmosphere: { thick: 0.02, kR: [2.0, 4.6, 9.8], kM: [0.6, 0.6, 0.7], g: 0.7 },
      },
      elevationDeg: 25,
    },
    markers: [
      {
        anchor: 'uv:0.51,0.61',
        title: { fr: 'Spoutnik Planitia', en: 'Sputnik Planitia' },
        text: { fr: 'Plaine de glace d’azote du « cœur »', en: 'Nitrogen-ice plain of the “heart”' },
        body: {
          fr: 'La moitié gauche du « cœur » de Pluton est une immense plaine de glace d’azote d’environ 1 000 km, sans aucun cratère : sa surface se renouvelle. Elle est découpée en cellules de convection, où la glace chauffée par en dessous remonte lentement. New Horizons l’a révélée le 14 juillet 2015.',
          en: 'The left half of Pluto’s “heart” is a vast nitrogen-ice plain about 1,000 km wide with no craters at all: its surface renews itself. It is divided into convection cells, where ice warmed from below slowly rises. New Horizons revealed it on 14 July 2015.',
        },
      },
      {
        anchor: 'uv:0.26,0.47',
        title: { fr: 'Cthulhu Macula', en: 'Cthulhu Macula' },
        text: { fr: 'Région sombre teintée par des tholins', en: 'Dark region tinted by tholins' },
        body: {
          fr: 'Une longue région sombre le long de l’équateur, couverte de tholins : des composés organiques rougeâtres formés quand l’ultraviolet brise le méthane de l’atmosphère. Ancienne et criblée de cratères, elle contraste avec la plaine lisse du cœur.',
          en: 'A long dark region along the equator, coated in tholins: reddish organic compounds formed when ultraviolet light breaks up methane in the atmosphere. Old and heavily cratered, it contrasts with the heart’s smooth plain.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Atmosphère', en: 'Atmosphere' },
        text: { fr: 'Brumes en couches vues par New Horizons', en: 'Layered hazes seen by New Horizons' },
        body: {
          fr: 'Pluton a une atmosphère ténue d’azote, environ 100 000 fois moins dense que celle de la Terre. À contre-jour, New Horizons y a vu une vingtaine de couches de brume bleutée. Elle gèle en partie quand Pluton s’éloigne du Soleil.',
          en: 'Pluto has a thin nitrogen atmosphere, about 100,000 times less dense than Earth’s. Looking back towards the Sun, New Horizons saw some twenty layers of bluish haze. It partly freezes out as Pluto moves away from the Sun.',
        },
      },
    ],
    appearance: 'textureFilled',
    sources: [wikipedia('Pluto', 'Pluto')],
  },
  {
    id: 'ceres', category: 'dwarf-planets', name: { fr: 'Cérès', en: 'Ceres' },
    kind: { fr: 'Planète naine · ceinture d\'astéroïdes', en: 'Dwarf planet · asteroid belt' },
    description: {
      fr: "Le plus gros corps de la ceinture d'astéroïdes, découvert dès 1801. La sonde Dawn y a trouvé des taches très brillantes au fond du cratère Occator : des dépôts de sels laissés par une saumure remontée de l'intérieur.",
      en: 'The largest body in the asteroid belt, found as early as 1801. The Dawn probe found very bright spots in Occator crater: salt deposits left by brine rising from inside.',
    },
    facts: [
      { key: 'radius', value: 469.7, unit: 'km', digits: 1 },
      { key: 'mass', value: 9.384e20, unit: 'kg', sci: true },
      { key: 'semiMajorAxis', value: 2.77, unit: 'au', digits: 2 },
      { key: 'orbitalPeriod', value: 4.6, unit: 'years', digits: 2 },
      { key: 'rotation', value: 9.074, unit: 'hours', digits: 3 },
      { key: 'dawn', text: { fr: 'en orbite le 6 mars 2015', en: 'in orbit 6 March 2015' } },
      { key: 'discovery', text: { fr: '1er janvier 1801 · Giuseppe Piazzi', en: '1 January 1801 · Giuseppe Piazzi' } },
    ],
    render: {
      kind: 'dwarf-planet',
      planet: { type: 'arid', seed: 62, texture: TEX + 'ceres.jpg', tiltDeg: 4, atmosphere: null },
    },
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Plus gros corps de la ceinture', en: 'Largest body in the belt' },
        text: { fr: '≈ 940 km, un tiers de la masse de la ceinture', en: '≈ 940 km, a third of the belt’s mass' },
        body: {
          fr: 'Avec environ 940 km de diamètre, Cérès réunit à elle seule près d’un tiers de la masse de la ceinture d’astéroïdes. Assez massive pour être ronde, elle est classée planète naine depuis 2006. La sonde Dawn l’a étudiée de 2015 à 2018.',
          en: 'About 940 km across, Ceres alone holds nearly a third of the asteroid belt’s mass. Massive enough to be round, it has been a dwarf planet since 2006. The Dawn probe studied it from 2015 to 2018.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Découverte en 1801', en: 'Found in 1801' },
        text: { fr: 'Par Piazzi, d’abord prise pour une planète', en: 'By Piazzi, first taken for a planet' },
        body: {
          fr: 'Giuseppe Piazzi l’a découverte le 1er janvier 1801 et l’a d’abord prise pour la planète manquante entre Mars et Jupiter ; d’autres corps trouvés sur des orbites voisines en firent un « astéroïde ». Sous sa surface, Dawn a mis en évidence une saumure, à l’origine des taches brillantes du cratère Occator.',
          en: 'Giuseppe Piazzi found it on 1 January 1801 and first took it for the missing planet between Mars and Jupiter; other bodies on nearby orbits made it an “asteroid”. Below its surface Dawn found evidence of brine, the source of the bright spots in Occator crater.',
        },
      },
    ],
    appearance: 'texture',
    sources: [wikipedia('Ceres', 'Ceres_(dwarf_planet)')],
  },
  {
    id: 'eris', category: 'dwarf-planets', name: { fr: 'Éris', en: 'Eris' },
    kind: { fr: 'Planète naine · disque épars', en: 'Dwarf planet · scattered disc' },
    description: {
      fr: "Presque de la taille de Pluton mais un peu plus massive : sa découverte en 2005 a conduit à la définition de « planète naine ». Couverte de glace, elle réfléchit 96 % de la lumière, l'un des corps les plus blancs du Système solaire.",
      en: 'Almost the size of Pluto but slightly more massive: its discovery in 2005 led to the definition of "dwarf planet". Coated in ice, it reflects 96% of light, one of the whitest bodies in the Solar System.',
    },
    facts: [
      { key: 'radius', value: 1163, unit: 'km' },
      { key: 'mass', value: 1.638e22, unit: 'kg', sci: true },
      { key: 'semiMajorAxis', value: 67.69, unit: 'au', digits: 2 },
      { key: 'orbitalPeriod', value: 559, unit: 'years', qualifier: '≈' },
      { key: 'albedo', text: { fr: '0,96', en: '0.96' } },
      { key: 'moons', text: 'Dysnomia' },
      { key: 'meanTemp', value: 42, unit: 'k' },
      { key: 'discovery', text: { fr: '5 janvier 2005 · M. Brown, C. Trujillo, D. Rabinowitz', en: '5 January 2005 · M. Brown, C. Trujillo, D. Rabinowitz' } },
    ],
    render: {
      kind: 'dwarf-planet',
      planet: { type: 'ice', seed: 63, palette: ['#f4f2ee', '#d8d6d2', '#b9aaa0', '#ebe9e4', '#c6c2bc', '#ffffff'], atmosphere: null },
    },
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Glace très blanche', en: 'Very white ice' },
        text: { fr: 'Réfléchit 96 % de la lumière', en: 'Reflects 96% of the light' },
        body: {
          fr: 'Éris réfléchit environ 96 % de la lumière reçue, plus que la neige fraîche. Sa surface serait couverte d’une fine couche de glace de méthane et d’azote, déposée par son atmosphère gelée. Elle est aujourd’hui près de son point le plus éloigné du Soleil, à environ 96 UA.',
          en: 'Eris reflects about 96% of the light it receives, more than fresh snow. Its surface is probably coated with a thin layer of methane and nitrogen ice, laid down by its frozen atmosphere. It is now near its farthest point from the Sun, about 96 AU away.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Plus massive que Pluton', en: 'More massive than Pluto' },
        text: { fr: 'Elle a fait naître le terme « planète naine »', en: 'It led to the term “dwarf planet”' },
        body: {
          fr: 'Découverte en 2005, elle est un peu plus petite que Pluton mais environ 27 % plus massive, ce que l’on sait grâce à l’orbite de sa lune Dysnomie. Parce qu’elle rivalisait avec Pluton, l’Union astronomique internationale a défini en 2006 les « planètes naines ».',
          en: 'Found in 2005, it is slightly smaller than Pluto but about 27% more massive, as the orbit of its moon Dysnomia shows. Because it rivalled Pluto, the International Astronomical Union defined “dwarf planets” in 2006.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Eris', 'Eris_(dwarf_planet)')],
  },
  {
    id: 'haumea', category: 'dwarf-planets', name: { fr: 'Hauméa', en: 'Haumea' },
    kind: { fr: 'Planète naine · ceinture de Kuiper', en: 'Dwarf planet · Kuiper belt' },
    description: {
      fr: "Elle tourne sur elle-même en moins de 4 heures, si vite qu'elle s'est étirée en ellipsoïde, deux fois plus longue que large. Elle possède deux lunes et un anneau, découvert en 2017.",
      en: 'It spins in under 4 hours, so fast that it has stretched into an ellipsoid twice as long as it is wide. It has two moons and a ring, found in 2017.',
    },
    facts: [
      { key: 'dimensions', text: { fr: '2 122 × 1 688 × 1 036 km', en: '2,122 × 1,688 × 1,036 km' } },
      { key: 'mass', value: 3.952e21, unit: 'kg', sci: true },
      { key: 'rotation', value: 3.915, unit: 'hours', digits: 3 },
      { key: 'semiMajorAxis', value: 43.116, unit: 'au', digits: 2 },
      { key: 'orbitalPeriod', value: 283.12, unit: 'years', digits: 1 },
      { key: 'ring', value: 2287, unit: 'km', qualifier: '≈', note: { fr: 'rayon', en: 'radius' } },
      { key: 'moons', text: 'Hiʻiaka, Namaka' },
      { key: 'discovery', text: { fr: '2004–2005 · équipes de M. Brown et de J. L. Ortiz', en: '2004–2005 · teams of M. Brown and J. L. Ortiz' } },
    ],
    render: {
      kind: 'dwarf-planet',
      planet: { type: 'ice', seed: 64, palette: ['#ecebe8', '#cfd2d4', '#9a6b5a', '#e2e3e2', '#b8bcbf', '#ffffff'], atmosphere: null },
      // 2122 : 1036 : 1688, spin axis (y) along the shortest axis.
      ellipsoid: [1, 0.488, 0.795],
      ring: { radius: 2.16, width: 0.07 },
    },
    markers: [
      {
        anchor: 'long-axis',
        title: { fr: 'Ellipsoïde', en: 'Ellipsoid' },
        text: { fr: '≈ 2 100 km sur son grand axe', en: '≈ 2,100 km along its long axis' },
        body: {
          fr: 'Haumea tourne sur elle-même en 3,9 heures, l’un des corps de cette taille les plus rapides du Système solaire. Cette rotation l’a étirée en ellipsoïde d’environ 2 100 km sur son grand axe, à peu près moitié moins sur son petit. Elle doit sans doute sa rotation et ses lunes à une ancienne collision.',
          en: 'Haumea spins in 3.9 hours, one of the fastest bodies of its size in the Solar System. The spin has stretched it into an ellipsoid about 2,100 km along its long axis and roughly half that along its short one. It probably owes its spin and moons to an ancient collision.',
        },
      },
      {
        anchor: 'ring',
        title: { fr: 'Anneau', en: 'Ring' },
        text: { fr: 'Découvert en 2017 lors d’une occultation', en: 'Found in 2017 during an occultation' },
        body: {
          fr: 'En 2017, son passage devant une étoile a révélé un anneau étroit à environ 2 300 km du centre : le premier anneau découvert autour d’un objet transneptunien. Ses particules font un tour pendant que Haumea en fait trois sur elle-même.',
          en: 'In 2017 its passage in front of a star revealed a narrow ring about 2,300 km from the centre: the first ring found around a trans-Neptunian object. Its particles complete one orbit while Haumea spins three times.',
        },
      },
      {
        anchor: 'surface',
        title: { fr: 'Rotation éclair', en: 'Fast spin' },
        text: { fr: 'Un tour en 3,9 heures', en: 'One turn in 3.9 hours' },
        body: {
          fr: 'Une journée sur Haumea dure moins de quatre heures. Sa surface est couverte de glace d’eau cristalline, avec une tache rouge sombre repérée grâce aux variations de son éclat au fil de sa rotation.',
          en: 'A day on Haumea lasts under four hours. Its surface is covered in crystalline water ice, with a dark red spot detected through its changing brightness as it turns.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Haumea', 'Haumea')],
  },
  {
    id: 'makemake', category: 'dwarf-planets', name: { fr: 'Makémaké', en: 'Makemake' },
    kind: { fr: 'Planète naine · ceinture de Kuiper', en: 'Dwarf planet · Kuiper belt' },
    description: {
      fr: "Un monde de glace de méthane, teinté de brun-rouge par des tholins, des composés organiques formés par le rayonnement. Une petite lune d'environ 175 km a été repérée par Hubble en 2015.",
      en: 'A world of methane ice, tinted reddish-brown by tholins, organic compounds made by radiation. A small moon about 175 km across was spotted by Hubble in 2015.',
    },
    facts: [
      { key: 'radius', value: 715, unit: 'km' },
      { key: 'mass', value: 2.69e21, unit: 'kg', sci: true },
      { key: 'semiMajorAxis', value: 45.5, unit: 'au', digits: 1 },
      { key: 'orbitalPeriod', value: 306.7, unit: 'years', digits: 1 },
      { key: 'albedo', text: { fr: '0,82', en: '0.82' } },
      { key: 'moons', text: 'S/2015 (136472) 1' },
      { key: 'discovery', text: { fr: '31 mars 2005 · M. Brown, C. Trujillo, D. Rabinowitz', en: '31 March 2005 · M. Brown, C. Trujillo, D. Rabinowitz' } },
    ],
    render: {
      kind: 'dwarf-planet',
      planet: { type: 'ice', seed: 65, palette: ['#d9b9a0', '#b98b72', '#8a4a33', '#cfa88e', '#a8775f', '#f2e4d6'], atmosphere: null },
    },
    markers: [
      {
        anchor: 'surface',
        title: { fr: 'Tholins', en: 'Tholins' },
        text: { fr: 'Composés organiques brun-rouge', en: 'Reddish-brown organic compounds' },
        body: {
          fr: 'Ses teintes brun-rouge viennent des tholins, des molécules organiques formées quand le rayonnement brise le méthane de sa surface. Les mêmes composés colorent Pluton et Titan.',
          en: 'Its reddish-brown hues come from tholins, organic molecules formed when radiation breaks up methane on its surface. The same compounds colour Pluto and Titan.',
        },
      },
      {
        anchor: 'limb',
        title: { fr: 'Glace de méthane', en: 'Methane ice' },
        text: { fr: 'Couvre une grande partie de la surface', en: 'Covers much of the surface' },
        body: {
          fr: 'Une grande partie de sa surface est couverte de glace de méthane. Sa petite lune, d’environ 175 km, repérée par Hubble en 2015, permettra de mesurer sa masse en suivant son orbite.',
          en: 'Much of its surface is covered in methane ice. Its small moon, about 175 km across and spotted by Hubble in 2015, will let its mass be measured by tracking its orbit.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Makemake', 'Makemake')],
  },
]

export const SPACECRAFT: SpaceObject[] = [
  {
    id: 'iss', category: 'spacecraft', name: { fr: 'Station spatiale internationale', en: 'International Space Station' },
    kind: { fr: 'Station spatiale · ISS', en: 'Space station · ISS' },
    description: {
      fr: "Le plus grand objet construit par l'humanité en orbite, occupé en permanence depuis 2000. Elle fait le tour de la Terre 15,5 fois par jour ; sa désorbitation est prévue après 2030.",
      en: 'The largest structure humanity has built in orbit, continuously occupied since 2000. It circles Earth 15.5 times a day; it is due to be deorbited after 2030.',
    },
    facts: [
      { key: 'firstModule', text: { fr: '20 novembre 1998', en: '20 November 1998' } },
      { key: 'mass', value: 450000, unit: 'kg', qualifier: '≈' },
      { key: 'dimensions', text: { fr: '109 × 73 m', en: '109 × 73 m' } },
      { key: 'pressurisedVolume', value: 1005, unit: 'm3' },
      { key: 'altitude', text: { fr: '413 – 422 km', en: '413 – 422 km' } },
      { key: 'speed', value: 7.67, unit: 'kms', digits: 2 },
      { key: 'crew', text: '7' },
      { key: 'operator', text: 'NASA, Roscosmos, ESA, JAXA, CSA' },
    ],
    render: { kind: 'spacecraft', model: 'iss', earth: true },
    markers: [
      {
        anchor: 'solar-arrays',
        title: { fr: 'Panneaux solaires', en: 'Solar arrays' },
        text: { fr: 'Renforcés par des IROSA depuis 2021', en: 'Boosted by IROSA arrays since 2021' },
        body: {
          fr: 'Huit grandes ailes solaires d’environ 35 m de long fournissent l’électricité de la station. Vieillissantes, elles sont complétées depuis 2021 par des panneaux déroulables IROSA, installés par-dessus lors de sorties dans l’espace.',
          en: 'Eight large solar wings about 35 m long power the station. As they age, they have been supplemented since 2021 by roll-out IROSA arrays fitted on top during spacewalks.',
        },
      },
      {
        anchor: 'cupola',
        title: { fr: 'Cupola', en: 'Cupola' },
        text: { fr: 'Sept hublots tournés vers la Terre', en: 'Seven windows facing the Earth' },
        body: {
          fr: 'Un module d’observation à sept hublots, dont un central de 80 cm, ajouté en 2010. Les astronautes y pilotent le bras robotique et photographient la Terre. Des volets protègent les vitres des micrométéorites.',
          en: 'An observation module with seven windows, including a central one 80 cm across, added in 2010. Astronauts operate the robotic arm and photograph the Earth from it. Shutters protect the windows from micrometeoroids.',
        },
      },
      {
        anchor: 'zarya',
        title: { fr: 'Zarya', en: 'Zarya' },
        text: { fr: 'Premier module, lancé en 1998', en: 'First module, launched in 1998' },
        body: {
          fr: 'Premier module de la station, lancé le 20 novembre 1998 par une fusée russe Proton, avec un financement américain. Il fournissait au départ l’énergie et la propulsion ; il sert aujourd’hui surtout au stockage.',
          en: 'The station’s first module, launched on 20 November 1998 on a Russian Proton rocket with US funding. It first provided power and propulsion; today it serves mostly for storage.',
        },
      },
    ],
    appearance: 'nasaModel',
    sources: [wikipedia('International Space Station', 'International_Space_Station')],
  },
  {
    id: 'hubble', category: 'spacecraft', name: { fr: 'Télescope spatial Hubble', en: 'Hubble Space Telescope' },
    kind: { fr: 'Télescope spatial', en: 'Space telescope' },
    description: {
      fr: "Lancé en 1990 avec un miroir mal poli, réparé en 1993 par des astronautes, puis entretenu lors de cinq missions de la navette. Il observe toujours, plus de 36 ans après son lancement.",
      en: 'Launched in 1990 with a mis-polished mirror, fixed by astronauts in 1993, then serviced on five Shuttle missions. It is still observing more than 36 years after launch.',
    },
    facts: [
      { key: 'launch', text: { fr: '24 avril 1990', en: '24 April 1990' } },
      { key: 'mass', value: 11110, unit: 'kg' },
      { key: 'dimensions', text: { fr: '13,2 × 4,2 m', en: '13.2 × 4.2 m' } },
      { key: 'mirror', value: 2.4, unit: 'm', digits: 1 },
      { key: 'altitude', text: { fr: '470 – 475 km (2026)', en: '470 – 475 km (2026)' } },
      { key: 'orbitalPeriodMin', value: 94, unit: 'min' },
      { key: 'servicing', text: '5' },
      { key: 'operator', text: { fr: 'NASA, avec l\'ESA', en: 'NASA, with ESA' } },
    ],
    render: { kind: 'spacecraft', model: 'hubble', earth: true },
    markers: [
      {
        anchor: 'aperture',
        title: { fr: 'Porte d\'ouverture', en: 'Aperture door' },
        text: { fr: 'Se ferme si le Soleil approche de l’axe de visée', en: 'Closes if the Sun nears the line of sight' },
        body: {
          fr: 'La porte au bout du tube protège l’optique : elle se ferme d’elle-même si le Soleil approche trop de la direction visée. Derrière, le miroir de 2,4 m avait été poli avec une erreur d’environ 2 microns : les images sont restées floues jusqu’à la mission de réparation de 1993.',
          en: 'The door at the end of the tube protects the optics: it closes by itself if the Sun gets too close to where the telescope points. Behind it, the 2.4 m mirror was polished about 2 microns off: images stayed blurred until the 1993 servicing mission.',
        },
      },
      {
        anchor: 'solar-arrays',
        title: { fr: 'Panneaux solaires', en: 'Solar arrays' },
        text: { fr: 'Les troisièmes, posés en 2002', en: 'The third set, fitted in 2002' },
        body: {
          fr: 'Les panneaux actuels, posés en 2002, sont les troisièmes du télescope. Les premiers, souples, vibraient à chaque passage de l’ombre au soleil et perturbaient les images. Les nouveaux, rigides, sont plus petits et plus puissants.',
          en: 'The current arrays, fitted in 2002, are the telescope’s third set. The first, flexible ones shook at every passage from shadow to sunlight and disturbed the images. The new rigid ones are smaller and more powerful.',
        },
      },
      {
        anchor: 'instruments',
        title: { fr: 'Caméra grand champ', en: 'Wide Field Camera' },
        text: { fr: 'Baie radiale ; WFC3 depuis 2009', en: 'Radial bay; WFC3 since 2009' },
        body: {
          fr: 'La baie radiale accueille la caméra grand champ, dont le radiateur dépasse sur le flanc. L’actuelle, WFC3, a été installée en 2009 ; sa devancière WFPC2, posée en 1993, corrigeait le défaut du miroir et a pris la célèbre image des Piliers de la Création.',
          en: 'The radial bay holds the wide-field camera, whose radiator shows on the side. The current one, WFC3, was installed in 2009; its predecessor WFPC2, fitted in 1993, corrected the mirror flaw and took the famous Pillars of Creation image.',
        },
      },
    ],
    appearance: 'nasaModel',
    sources: [wikipedia('Hubble Space Telescope', 'Hubble_Space_Telescope')],
  },
  {
    id: 'jwst', category: 'spacecraft', name: { fr: 'Télescope spatial James Webb', en: 'James Webb Space Telescope' },
    kind: { fr: 'Télescope spatial infrarouge', en: 'Infrared space telescope' },
    description: {
      fr: "Le plus grand télescope spatial, lancé le jour de Noël 2021. Son miroir doré de 18 segments est protégé du Soleil par un pare-soleil de cinq couches de la taille d'un court de tennis, qui le garde sous 50 K.",
      en: 'The largest space telescope, launched on Christmas Day 2021. Its 18-segment gold mirror sits behind a five-layer sunshield the size of a tennis court, which keeps it below 50 K.',
    },
    facts: [
      { key: 'launch', text: { fr: '25 décembre 2021 · Ariane 5', en: '25 December 2021 · Ariane 5' } },
      { key: 'mass', value: 6500, unit: 'kg' },
      { key: 'mirror', value: 6.5, unit: 'm', digits: 1, note: { fr: '18 segments', en: '18 segments' } },
      { key: 'collectingArea', value: 25.4, unit: 'm2', digits: 1 },
      { key: 'sunshield', text: { fr: '21,2 × 14,2 m', en: '21.2 × 14.2 m' } },
      { key: 'location', text: { fr: 'point de Lagrange L2, ≈ 1,5 million de km', en: 'Lagrange point L2, ≈ 1.5 million km' } },
      { key: 'wavelengths', text: { fr: '0,6 – 28,5 µm', en: '0.6 – 28.5 µm' } },
      { key: 'operator', text: 'NASA, ESA, CSA' },
    ],
    render: { kind: 'spacecraft', model: 'jwst' },
    markers: [
      {
        anchor: 'mirror',
        title: { fr: 'Miroir primaire', en: 'Primary mirror' },
        text: { fr: '6,5 m, 18 segments dorés', en: '6.5 m, 18 gold-coated segments' },
        body: {
          fr: '18 segments hexagonaux en béryllium recouverts d’une fine couche d’or, qui réfléchit très bien l’infrarouge. Repliés pour le lancement, ils ont été dépliés puis alignés à quelques nanomètres près. Avec 6,5 m, c’est le plus grand miroir envoyé dans l’espace.',
          en: '18 hexagonal beryllium segments coated with a thin layer of gold, which reflects infrared very well. Folded for launch, they were unfolded and aligned to within a few nanometres. At 6.5 m, it is the largest mirror sent into space.',
        },
      },
      {
        anchor: 'secondary',
        title: { fr: 'Miroir secondaire', en: 'Secondary mirror' },
        text: { fr: 'Au bout d’un trépied de ≈ 7 m', en: 'At the end of a ≈ 7 m tripod' },
        body: {
          fr: 'Le miroir secondaire, de 74 cm, renvoie la lumière vers le centre du miroir principal, puis vers les instruments. Il est tenu à environ 7 m par un trépied déplié dans l’espace, l’une des étapes critiques de la mise en service.',
          en: 'The 74 cm secondary mirror sends the light back to the centre of the primary, then on to the instruments. A tripod unfolded in space holds it about 7 m out, one of the critical steps of commissioning.',
        },
      },
      {
        anchor: 'sunshield',
        title: { fr: 'Pare-soleil', en: 'Sunshield' },
        text: { fr: '5 couches de Kapton, ≈ 21 × 14 m', en: '5 Kapton layers, ≈ 21 × 14 m' },
        body: {
          fr: 'Cinq couches de Kapton aussi fines qu’un cheveu, de la taille d’un court de tennis, séparent le côté chaud du côté froid. Elles maintiennent le télescope sous 50 K (−223 °C), indispensable pour observer l’infrarouge, alors que la face tournée vers le Soleil dépasse 80 °C.',
          en: 'Five hair-thin layers of Kapton, the size of a tennis court, separate the hot side from the cold side. They keep the telescope below 50 K (−223 °C), essential for infrared observing, while the sunward face exceeds 80 °C.',
        },
      },
    ],
    appearance: 'nasaModel',
    sources: [wikipedia('James Webb Space Telescope', 'James_Webb_Space_Telescope')],
  },
  {
    id: 'voyager-1', category: 'spacecraft', name: 'Voyager 1',
    kind: { fr: 'Sonde interstellaire', en: 'Interstellar probe' },
    description: {
      fr: "L'objet humain le plus lointain. Lancée en 1977, elle a quitté l'héliosphère le 25 août 2012 et emporte le Disque d'or. Elle doit atteindre une journée-lumière de la Terre vers le 18 novembre 2026.",
      en: 'The most distant human-made object. Launched in 1977, it left the heliosphere on 25 August 2012 and carries the Golden Record. It is due to reach one light-day from Earth around 18 November 2026.',
    },
    facts: [
      { key: 'launch', text: { fr: '5 septembre 1977', en: '5 September 1977' } },
      { key: 'mass', value: 815, unit: 'kg' },
      { key: 'distanceEarth', value: 172.5, unit: 'au', digits: 1, note: { fr: 'octobre 2026', en: 'October 2026' } },
      { key: 'speedSun', value: 61000, unit: 'kmh', qualifier: '≈' },
      { key: 'heliopause', text: { fr: '25 août 2012, à 121 UA', en: '25 August 2012, at 121 AU' } },
      { key: 'antenna', value: 3.7, unit: 'm', digits: 1 },
      { key: 'power', text: { fr: '3 générateurs au plutonium (≈ 470 W au lancement)', en: '3 plutonium generators (≈ 470 W at launch)' } },
      { key: 'instruments', text: { fr: '2 encore actifs', en: '2 still operating' } },
    ],
    render: { kind: 'spacecraft', model: 'voyager-1' },
    markers: [
      {
        anchor: 'dish',
        title: { fr: 'Antenne grand gain', en: 'High-gain antenna' },
        text: { fr: '3,7 m, émet avec ≈ 23 W', en: '3.7 m, transmits with ≈ 23 W' },
        body: {
          fr: 'L’antenne de 3,7 m émet avec environ 23 W ; le signal met près d’une journée à atteindre la Terre, extraordinairement affaibli. Il faut les antennes de 34 et 70 m du Deep Space Network pour le capter, et le débit ne dépasse plus 160 bits par seconde.',
          en: 'The 3.7 m antenna transmits with about 23 W; the signal takes nearly a day to reach Earth, extraordinarily faint. It takes the Deep Space Network’s 34 and 70 m dishes to catch it, and the data rate is now at most 160 bits per second.',
        },
      },
      {
        anchor: 'magnetometer',
        title: { fr: 'Mât du magnétomètre', en: 'Magnetometer boom' },
        text: { fr: '13 m, loin des perturbations de la sonde', en: '13 m, away from the craft’s own field' },
        body: {
          fr: 'Les magnétomètres sont placés au bout d’un mât de 13 m pour échapper au champ magnétique de la sonde elle-même. Depuis la sortie de l’héliosphère, en 2012, ils mesurent le champ magnétique de l’espace interstellaire.',
          en: 'The magnetometers sit at the end of a 13 m boom to escape the craft’s own magnetic field. Since leaving the heliosphere in 2012 they have measured the magnetic field of interstellar space.',
        },
      },
      {
        anchor: 'rtg',
        title: { fr: 'Générateurs RTG', en: 'RTGs' },
        text: { fr: 'Plutonium 238, puissance en lent déclin', en: 'Plutonium-238, power slowly fading' },
        body: {
          fr: 'Trois générateurs à radioisotopes changent en électricité la chaleur du plutonium 238. Leur puissance baisse d’environ 4 W par an : les équipes éteignent les instruments un à un pour prolonger la mission.',
          en: 'Three radioisotope generators turn the heat of plutonium-238 into electricity. Their output drops by about 4 W a year: the team switches instruments off one by one to extend the mission.',
        },
      },
      {
        anchor: 'bus',
        title: { fr: 'Disque d’or', en: 'Golden Record' },
        text: { fr: 'Fixé sur le flanc du corps de la sonde', en: 'Mounted on the side of the bus' },
        body: {
          fr: 'Sur le flanc de la sonde est fixé le Disque d’or, un disque de cuivre doré portant des sons et des images de la Terre, des salutations en 55 langues et de la musique. Sa pochette explique comment le lire et situe le Soleil grâce à 14 pulsars.',
          en: 'Mounted on the side of the craft is the Golden Record, a gold-plated copper disc carrying sounds and images of Earth, greetings in 55 languages and music. Its cover explains how to play it and locates the Sun using 14 pulsars.',
        },
      },
    ],
    appearance: 'nasaModel',
    sources: [wikipedia('Voyager 1', 'Voyager_1')],
  },
  {
    id: 'tiangong', category: 'spacecraft', name: { fr: 'Station Tiangong', en: 'Tiangong space station' },
    kind: { fr: 'Station spatiale chinoise', en: 'Chinese space station' },
    description: {
      fr: "La station spatiale chinoise, en forme de T, achevée en novembre 2022. Elle est formée de trois modules : Tianhe, le cœur, et les laboratoires Wentian et Mengtian, pour un équipage de trois.",
      en: 'China\'s T-shaped space station, completed in November 2022. It is made of three modules: the Tianhe core and the Wentian and Mengtian labs, for a crew of three.',
    },
    facts: [
      { key: 'firstModule', text: { fr: '29 avril 2021 (Tianhe)', en: '29 April 2021 (Tianhe)' } },
      { key: 'mass', value: 100000, unit: 'kg', qualifier: '≈' },
      { key: 'dimensions', text: { fr: '≈ 55,6 × 39 m', en: '≈ 55.6 × 39 m' } },
      { key: 'pressurisedVolume', value: 340, unit: 'm3' },
      { key: 'altitude', text: { fr: '386 – 392 km', en: '386 – 392 km' } },
      { key: 'modules', text: 'Tianhe, Wentian, Mengtian' },
      { key: 'crew', text: '3' },
      { key: 'operator', text: { fr: 'CMSA (Chine)', en: 'CMSA (China)' } },
    ],
    render: { kind: 'spacecraft', model: 'tiangong', earth: true },
    markers: [
      {
        anchor: 'tianhe',
        title: { fr: 'Tianhe', en: 'Tianhe' },
        text: { fr: 'Module cœur, lancé en avril 2021', en: 'Core module, launched April 2021' },
        body: {
          fr: 'Le module cœur, long de 16,6 m, lancé le 29 avril 2021. Il abrite les quartiers de vie de l’équipage, les commandes de la station et sa propulsion. Les laboratoires et les vaisseaux s’amarrent à son nœud sphérique.',
          en: 'The 16.6 m core module, launched on 29 April 2021. It holds the crew’s living quarters, the station’s controls and its propulsion. Laboratories and spacecraft dock at its spherical node.',
        },
      },
      {
        anchor: 'wings',
        title: { fr: 'Ailes de Wentian', en: 'Wentian’s wings' },
        text: { fr: 'Panneaux souples orientables sur cardan', en: 'Flexible arrays on a steerable gimbal' },
        body: {
          fr: 'Chaque laboratoire porte deux grandes ailes solaires souples, d’environ 55 m d’envergure au total, orientables pour suivre le Soleil. Elles utilisent des cellules à arséniure de gallium, plus efficaces que celles en silicium.',
          en: 'Each laboratory carries two large flexible solar wings, about 55 m tip to tip, steered to follow the Sun. They use gallium arsenide cells, more efficient than silicon ones.',
        },
      },
      {
        anchor: 'platform',
        title: { fr: 'Plateforme de Mengtian', en: 'Mengtian platform' },
        text: { fr: 'Expériences exposées au vide', en: 'Experiments exposed to space' },
        body: {
          fr: 'Mengtian porte à l’extérieur une plateforme d’expériences exposées au vide, au rayonnement et aux écarts de température. Un sas de cargaison et un bras robotique permettent de les installer et de les récupérer.',
          en: 'Mengtian carries an outside platform for experiments exposed to vacuum, radiation and temperature swings. A cargo airlock and a robotic arm let crews install and retrieve them.',
        },
      },
    ],
    appearance: 'model',
    sources: [wikipedia('Tiangong space station', 'Tiangong_space_station')],
  },
  {
    id: 'sputnik-1', category: 'spacecraft', name: { fr: 'Spoutnik 1', en: 'Sputnik 1' },
    kind: { fr: 'Premier satellite artificiel', en: 'First artificial satellite' },
    description: {
      fr: "Une sphère de 58 cm et quatre antennes : le premier satellite, lancé par l'URSS le 4 octobre 1957. Ses « bips » radio ont été captés dans le monde entier pendant 22 jours, et il est retombé le 4 janvier 1958.",
      en: 'A 58 cm sphere with four antennas: the first satellite, launched by the USSR on 4 October 1957. Its radio "beeps" were picked up worldwide for 22 days, and it fell back on 4 January 1958.',
    },
    facts: [
      { key: 'launch', text: { fr: '4 octobre 1957', en: '4 October 1957' } },
      { key: 'mass', value: 83.6, unit: 'kg', digits: 1 },
      { key: 'diameter', value: 58, unit: 'cm' },
      { key: 'antenna', text: { fr: '4 antennes de 2,4 et 2,9 m', en: '4 antennas, 2.4 and 2.9 m' } },
      { key: 'altitude', text: { fr: '215 – 939 km', en: '215 – 939 km' } },
      { key: 'frequencies', text: { fr: '20,005 et 40,002 MHz', en: '20.005 and 40.002 MHz' } },
      { key: 'reentry', text: { fr: '4 janvier 1958', en: '4 January 1958' } },
      { key: 'operator', text: { fr: 'OKB-1 (URSS)', en: 'OKB-1 (USSR)' } },
    ],
    render: { kind: 'spacecraft', model: 'sputnik-1', earth: true },
    markers: [
      {
        anchor: 'sphere',
        title: { fr: 'Sphère de 58 cm', en: '58 cm sphere' },
        text: { fr: 'Aluminium poli, 83,6 kg', en: 'Polished aluminium, 83.6 kg' },
        body: {
          fr: 'Une sphère d’aluminium poli de 58 cm et 83,6 kg, remplie d’azote. Le poli devait réfléchir la lumière du Soleil pour limiter l’échauffement. À l’intérieur : des batteries, deux émetteurs radio et un ventilateur.',
          en: 'A polished aluminium sphere 58 cm across and 83.6 kg, filled with nitrogen. The polish was meant to reflect sunlight and limit heating. Inside: batteries, two radio transmitters and a fan.',
        },
      },
      {
        anchor: 'antennas',
        title: { fr: 'Antennes', en: 'Antennas' },
        text: { fr: 'Bips à 20 et 40 MHz pendant 22 jours', en: 'Beeps at 20 and 40 MHz for 22 days' },
        body: {
          fr: 'Quatre antennes fouets de 2,4 et 2,9 m émettaient des bips à 20 et 40 MHz, des fréquences que les radioamateurs du monde entier pouvaient capter. Les bips se sont tus au bout de 22 jours, batteries épuisées.',
          en: 'Four whip antennas, 2.4 and 2.9 m long, sent beeps at 20 and 40 MHz, frequencies that radio amateurs worldwide could pick up. The beeps fell silent after 22 days, when the batteries ran out.',
        },
      },
    ],
    appearance: 'model',
    sources: [wikipedia('Sputnik 1', 'Sputnik_1')],
  },
]
