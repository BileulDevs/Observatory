import type { PlanetarySystem } from '~/types/systems'

/**
 * Real planetary systems. Numbers are copied from the sources listed with each system; when a source gives
 * no value, the field is left out rather than estimated. Moon counts move fast: check them again before release.
 *
 * Moons: mean radii and mean orbital elements from JPL Solar System Dynamics (ssd.jpl.nasa.gov/sats). Only the
 * best-known moons are drawn; `facts.moons` keeps the full known count.
 *
 * Solar System: NASA Planetary Fact Sheet (distances converted from 10⁶ km to AU with 1 AU = 149.6 × 10⁶ km,
 * masses from 10²⁴ kg to Earth masses with 5.97 × 10²⁴ kg). Moon counts: Jupiter 101 and Saturn 285 after the
 * MPEC announcements of March 2026, Uranus 29 after the August 2025 discovery.
 */

const TEX = '/textures/solar/'
const MOON_TEX = '/textures/moons/'

export const solarSystem: PlanetarySystem = {
  id: 'solar-system',
  name: { fr: 'Système solaire', en: 'Solar System' },
  kind: 'real',
  distanceLy: 0,
  summary: {
    fr: "Notre système : une étoile naine jaune, quatre planètes rocheuses, deux géantes gazeuses et deux géantes de glace.",
    en: 'Our own system: a yellow dwarf star, four rocky planets, two gas giants and two ice giants.',
  },
  star: {
    name: { fr: 'Soleil', en: 'Sun' }, spectralType: 'G2V', massSun: 1, radiusSun: 1, temperatureK: 5772, ageGyr: 4.6,
    description: {
      fr: "Une étoile naine jaune d'environ 4,6 milliards d'années. Elle concentre plus de 99,8 % de la masse du système.",
      en: 'A yellow dwarf star about 4.6 billion years old. It holds more than 99.8% of the mass of the system.',
    },
  },
  planets: [
    {
      id: 'mercury', name: { fr: 'Mercure', en: 'Mercury' },
      kind: { fr: 'Planète tellurique', en: 'Rocky planet' },
      description: {
        fr: "La plus petite planète et la plus proche du Soleil. Sans atmosphère pour retenir la chaleur, elle passe de températures brûlantes le jour à un froid extrême la nuit.",
        en: 'The smallest planet and the closest to the Sun. With no atmosphere to hold heat, it swings from scorching days to extremely cold nights.',
      },
      facts: { radiusKm: 2439.5, massEarth: 0.0553, semiMajorAxisAU: 0.387, periodDays: 88.0, eccentricity: 0.206, dayHours: 4222.6, gravity: 3.7, meanTempC: 167, moons: 0, obliquityDeg: 0.034 },
      render: { type: 'arid', seed: 11, texture: TEX + 'mercury.jpg', atmosphere: null, tiltDeg: 0.034 },
      swatch: '#8f8a85',
      appearance: 'texture',
    },
    {
      id: 'venus', name: { fr: 'Vénus', en: 'Venus' },
      kind: { fr: 'Planète tellurique', en: 'Rocky planet' },
      description: {
        fr: "Une atmosphère de dioxyde de carbone 92 fois plus dense que la nôtre produit un effet de serre extrême : c'est la planète la plus chaude. Elle tourne sur elle-même en sens rétrograde. La carte affichée est la surface vue au radar par Magellan, sous les nuages.",
        en: 'A carbon-dioxide atmosphere 92 times denser than ours drives a runaway greenhouse effect: it is the hottest planet. It spins in the retrograde direction. The map shown is the surface as seen by Magellan’s radar, below the clouds.',
      },
      facts: { radiusKm: 6052, massEarth: 0.815, semiMajorAxisAU: 0.723, periodDays: 224.7, eccentricity: 0.007, dayHours: 2802.0, gravity: 8.9, meanTempC: 464, moons: 0, obliquityDeg: 177.4 },
      render: {
        type: 'arid', seed: 12, texture: TEX + 'venus.jpg', tiltDeg: 177.4,
        atmosphere: { thick: 0.06, kR: [6.0, 5.2, 3.2], kM: [8.0, 7.0, 5.0], g: 0.7 },
      },
      appearance: 'texture',
    },
    {
      id: 'earth', name: { fr: 'Terre', en: 'Earth' },
      kind: { fr: 'Planète tellurique', en: 'Rocky planet' },
      description: {
        fr: "La seule planète connue à abriter la vie, et la seule du système à porter de l'eau liquide en surface. Les nuages affichés sont procéduraux : ils ne reproduisent pas une météo réelle.",
        en: 'The only planet known to host life, and the only one in the system with liquid water on its surface. The clouds shown are procedural: they do not depict real weather.',
      },
      facts: { radiusKm: 6378, massEarth: 1, semiMajorAxisAU: 1.0, periodDays: 365.2, eccentricity: 0.017, dayHours: 24.0, gravity: 9.8, meanTempC: 15, moons: 1, obliquityDeg: 23.4 },
      render: { type: 'ocean', seed: 13, texture: TEX + 'earth.jpg', waterGlint: true, clouds: true, tiltDeg: 23.4 },
      swatch: '#4f7fb8',
      moons: [{ id: 'moon', name: { fr: 'Lune', en: 'Moon' }, radiusKm: 1737.4, semiMajorAxisKm: 384400, periodDays: 27.322, texture: MOON_TEX + 'moon.jpg', color: '#9a9690', gmKm3s2: 4902.8, densityGcm3: 3.344,
          description: { fr: "Seul satellite naturel de la Terre. En rotation synchrone, elle nous montre toujours la même face ; ses mers sombres sont d'anciennes coulées de basalte.", en: "Earth's only natural satellite. Tidally locked, it always shows us the same face; its dark maria are ancient basalt flows." } }],
      appearance: 'texture',
    },
    {
      id: 'mars', name: 'Mars',
      kind: { fr: 'Planète tellurique', en: 'Rocky planet' },
      description: {
        fr: "Un monde froid et désertique à l'atmosphère très ténue. Il porte le plus grand volcan connu du système solaire, Olympus Mons, et les traces d'une eau liquide passée.",
        en: 'A cold desert world with a very thin atmosphere. It hosts the largest known volcano in the Solar System, Olympus Mons, and traces of past liquid water.',
      },
      facts: { radiusKm: 3396, massEarth: 0.1075, semiMajorAxisAU: 1.524, periodDays: 687.0, eccentricity: 0.094, dayHours: 24.7, gravity: 3.7, meanTempC: -65, moons: 2, obliquityDeg: 25.2 },
      render: { type: 'arid', seed: 14, texture: TEX + 'mars.jpg', tiltDeg: 25.2 },
      swatch: '#c1643f',
      moons: [
        { id: 'phobos', name: 'Phobos', radiusKm: 11.08, semiMajorAxisKm: 9375, periodDays: 0.3187, texture: MOON_TEX + 'phobos.jpg', color: '#7d746b', gmKm3s2: 0.0007087, densityGcm3: 1.872, discoveryYear: 1877, discoveredBy: 'A. Hall',
          description: { fr: 'Le plus grand des deux satellites de Mars, un corps irrégulier qui se rapproche lentement de la planète : les marées finiront par le disloquer.', en: "The larger of Mars's two moons, an irregular body slowly spiralling inwards: tides will eventually tear it apart." } },
        { id: 'deimos', name: 'Deimos', radiusKm: 6.2, semiMajorAxisKm: 23457, periodDays: 1.2625, color: '#8a8178', gmKm3s2: 9.62e-05, densityGcm3: 1.471, discoveryYear: 1877, discoveredBy: 'A. Hall',
          description: { fr: 'Le plus petit et le plus lointain des satellites de Mars, à la surface lissée par une épaisse couche de poussière.', en: "The smaller and more distant of Mars's moons, its surface smoothed by a thick layer of dust." } },
      ],
      appearance: 'texture',
    },
    {
      id: 'jupiter', name: 'Jupiter',
      kind: { fr: 'Géante gazeuse', en: 'Gas giant' },
      description: {
        fr: "La plus grande planète : plus de deux fois la masse de toutes les autres réunies. Sa Grande Tache rouge est une tempête plus large que la Terre. Ses anneaux, très ténus, ne sont pas représentés.",
        en: 'The largest planet: more than twice the mass of all the others combined. Its Great Red Spot is a storm wider than Earth. Its very faint rings are not shown.',
      },
      facts: { radiusKm: 71492, massEarth: 317.9, semiMajorAxisAU: 5.204, periodDays: 4331, eccentricity: 0.049, dayHours: 9.9, gravity: 23.1, meanTempC: -110, moons: 101, obliquityDeg: 3.1 },
      render: { type: 'gas', seed: 15, texture: TEX + 'jupiter.jpg', rings: false, tiltDeg: 3.1 },
      swatch: '#c9a77c',
      moons: [
        { id: 'io', name: 'Io', radiusKm: 1821.49, semiMajorAxisKm: 421800, periodDays: 1.762732, texture: MOON_TEX + 'io.jpg', color: '#d9c06a', gmKm3s2: 5959.91547, densityGcm3: 3.5276, discoveryYear: 1610, discoveredBy: 'Galileo',
          description: { fr: "Le corps le plus volcanique du Système solaire, chauffé de l'intérieur par les marées de Jupiter. Ses couleurs viennent du soufre.", en: "The most volcanically active body in the Solar System, heated from within by Jupiter's tides. Its colours come from sulphur." } },
        { id: 'europa', name: { fr: 'Europe', en: 'Europa' }, radiusKm: 1560.8, semiMajorAxisKm: 671100, periodDays: 3.525463, texture: MOON_TEX + 'europa.jpg', color: '#cdbfa8', gmKm3s2: 3202.7121, densityGcm3: 3.013, discoveryYear: 1610, discoveredBy: 'Galileo',
          description: { fr: "Une croûte de glace fracturée recouvre un océan d'eau liquide : l'un des endroits les plus étudiés pour la recherche de vie.", en: 'A fractured ice crust over an ocean of liquid water: one of the most studied places in the search for life.' } },
        { id: 'ganymede', name: { fr: 'Ganymède', en: 'Ganymede' }, radiusKm: 2631.2, semiMajorAxisKm: 1070400, periodDays: 7.155588, texture: MOON_TEX + 'ganymede.jpg', color: '#9c9184', gmKm3s2: 9887.83275, densityGcm3: 1.9416, discoveryYear: 1610, discoveredBy: 'Galileo',
          description: { fr: 'La plus grande lune du Système solaire, plus grande que Mercure, et la seule connue à posséder son propre champ magnétique.', en: 'The largest moon in the Solar System, bigger than Mercury, and the only one known to have its own magnetic field.' } },
        { id: 'callisto', name: 'Callisto', radiusKm: 2410.3, semiMajorAxisKm: 1882700, periodDays: 16.69044, texture: MOON_TEX + 'callisto.jpg', color: '#6e665c', gmKm3s2: 7179.2834, densityGcm3: 1.834, discoveryYear: 1610, discoveredBy: 'Galileo',
          description: { fr: "L'une des surfaces les plus cratérisées du Système solaire, presque inchangée depuis des milliards d'années.", en: 'One of the most heavily cratered surfaces in the Solar System, almost unchanged for billions of years.' } },
      ],
      appearance: 'texture',
    },
    {
      id: 'saturn', name: { fr: 'Saturne', en: 'Saturn' },
      kind: { fr: 'Géante gazeuse', en: 'Gas giant' },
      description: {
        fr: "Célèbre pour ses anneaux de glace et de roche, Saturne est la moins dense des planètes. C'est aussi celle qui compte le plus de lunes connues. Son disque est procédural : la carte Cassini du domaine public présente des bandes sans données.",
        en: 'Famous for its rings of ice and rock, Saturn is the least dense planet, and the one with the most known moons. Its disc is procedural: the public-domain Cassini map has bands with no data.',
      },
      facts: { radiusKm: 60268, massEarth: 95.1, semiMajorAxisAU: 9.572, periodDays: 10747, eccentricity: 0.052, dayHours: 10.7, gravity: 9.0, meanTempC: -140, moons: 285, obliquityDeg: 26.7 },
      render: {
        type: 'gas', seed: 16, rings: true, tiltDeg: 26.7,
        palette: ['#cdb07a', '#a9894f', '#e0cc9a', '#8c7044', '#c2a56c', '#cdb07a'],
      },
      moons: [
        { id: 'mimas', name: 'Mimas', radiusKm: 198.2, semiMajorAxisKm: 186000, periodDays: 0.942422, color: '#c9c6c0', gmKm3s2: 2.50349, densityGcm3: 1.1501, discoveryYear: 1789, discoveredBy: 'W. Herschel',
          description: { fr: "Dominée par le cratère Herschel, large d'environ un tiers de son diamètre.", en: 'Dominated by Herschel crater, about a third of its own diameter across.' } },
        { id: 'enceladus', name: { fr: 'Encelade', en: 'Enceladus' }, radiusKm: 252.1, semiMajorAxisKm: 238400, periodDays: 1.370218, color: '#f2f4f6', gmKm3s2: 7.21037, densityGcm3: 1.6097, discoveryYear: 1789, discoveredBy: 'W. Herschel',
          description: { fr: "Des geysers de glace jaillissent de son pôle Sud, au-dessus d'un océan souterrain, et alimentent l'anneau E de Saturne.", en: "Ice geysers erupt from its south pole, above a subsurface ocean, and feed Saturn's E ring." } },
        { id: 'dione', name: { fr: 'Dioné', en: 'Dione' }, radiusKm: 561.4, semiMajorAxisKm: 377700, periodDays: 2.736916, color: '#d7d5d0', gmKm3s2: 73.11607, densityGcm3: 1.4781, discoveryYear: 1684, discoveredBy: 'G.D. Cassini',
          description: { fr: 'Une lune de glace et de roche, striée de falaises de glace brillantes sur son hémisphère arrière.', en: 'A moon of ice and rock, streaked with bright ice cliffs on its trailing hemisphere.' } },
        { id: 'rhea', name: { fr: 'Rhéa', en: 'Rhea' }, radiusKm: 763.5, semiMajorAxisKm: 527200, periodDays: 4.517503, color: '#cfcac2', gmKm3s2: 153.94175, densityGcm3: 1.2372, discoveryYear: 1672, discoveredBy: 'G.D. Cassini',
          description: { fr: 'La deuxième plus grande lune de Saturne : un corps de glace et de roche criblé de cratères.', en: "Saturn's second-largest moon: a heavily cratered body of ice and rock." } },
        { id: 'titan', name: 'Titan', radiusKm: 2574.76, semiMajorAxisKm: 1221900, periodDays: 15.945448, color: '#d59a4a', hazy: true, gmKm3s2: 8978.1371, densityGcm3: 1.8814, discoveryYear: 1655, discoveredBy: 'C. Huygens',
          description: { fr: "La seule lune dotée d'une atmosphère épaisse. Des lacs et des mers de méthane et d'éthane liquides couvrent ses régions polaires.", en: 'The only moon with a thick atmosphere. Lakes and seas of liquid methane and ethane cover its polar regions.' } },
        { id: 'iapetus', name: { fr: 'Japet', en: 'Iapetus' }, radiusKm: 734.3, semiMajorAxisKm: 3561700, periodDays: 79.331002, color: '#d8d2c6', twoTone: true, gmKm3s2: 120.51511, densityGcm3: 1.0887, discoveryYear: 1671, discoveredBy: 'G.D. Cassini',
          description: { fr: "Un hémisphère sombre comme le charbon, l'autre brillant comme la neige, et une crête montagneuse le long de l'équateur.", en: 'One hemisphere dark as coal, the other bright as snow, and a mountain ridge running along its equator.' } },
      ],
      appearance: 'procedural',
    },
    {
      id: 'uranus', name: 'Uranus',
      kind: { fr: 'Géante de glace', en: 'Ice giant' },
      description: {
        fr: "Couchée sur le côté, avec un axe incliné de près de 98°, elle roule le long de son orbite. Le méthane de son atmosphère lui donne sa teinte cyan. Ses anneaux sombres et ténus ne sont pas représentés.",
        en: 'Tipped on its side, with an axis tilted by almost 98°, it rolls along its orbit. Methane in its atmosphere gives it its cyan tint. Its dark, faint rings are not shown.',
      },
      facts: { radiusKm: 25559, massEarth: 14.54, semiMajorAxisAU: 19.165, periodDays: 30589, eccentricity: 0.047, dayHours: 17.2, gravity: 8.7, meanTempC: -195, moons: 29, obliquityDeg: 97.8 },
      render: {
        type: 'gas', seed: 17, rings: false, tiltDeg: 97.8,
        palette: ['#a9dde3', '#93cfd8', '#bfe8ec', '#86c4cf', '#a2d8df', '#b2e2e7'],
        atmosphere: { thick: 0.05, kR: [3.0, 6.0, 7.0], kM: [1.5, 1.8, 2.0], g: 0.7 },
      },
      moons: [
        { id: 'miranda', name: 'Miranda', radiusKm: 235.8, semiMajorAxisKm: 129846, periodDays: 1.413479, color: '#a9a7a3', gmKm3s2: 4.3, densityGcm3: 1.178, discoveryYear: 1948, discoveredBy: 'G. Kuiper',
          description: { fr: "Une mosaïque de terrains sans équivalent, avec Verona Rupes, l'une des plus hautes falaises connues du Système solaire.", en: 'A patchwork of unlike terrains, with Verona Rupes, one of the tallest known cliffs in the Solar System.' } },
        { id: 'ariel', name: 'Ariel', radiusKm: 578.9, semiMajorAxisKm: 190929, periodDays: 2.520379, color: '#b9b6b1', gmKm3s2: 83.5, densityGcm3: 1.539, discoveryYear: 1851, discoveredBy: 'W. Lassell',
          description: { fr: "La plus brillante des grandes lunes d'Uranus, à la surface relativement jeune parcourue de vallées.", en: "The brightest of Uranus's major moons, with a relatively young surface cut by valleys." } },
        { id: 'umbriel', name: 'Umbriel', radiusKm: 584.7, semiMajorAxisKm: 265986, periodDays: 4.144177, color: '#6f6c69', gmKm3s2: 85.1, densityGcm3: 1.523, discoveryYear: 1851, discoveredBy: 'W. Lassell',
          description: { fr: "La plus sombre des grandes lunes d'Uranus, à la surface ancienne et très cratérisée.", en: "The darkest of Uranus's major moons, with an old, heavily cratered surface." } },
        { id: 'titania', name: 'Titania', radiusKm: 788.9, semiMajorAxisKm: 436298, periodDays: 8.705869, color: '#a8a19a', gmKm3s2: 226.9, densityGcm3: 1.653, discoveryYear: 1787, discoveredBy: 'W. Herschel',
          description: { fr: "La plus grande lune d'Uranus, parcourue d'immenses canyons.", en: "Uranus's largest moon, cut by enormous canyons." } },
        { id: 'oberon', name: { fr: 'Obéron', en: 'Oberon' }, radiusKm: 761.4, semiMajorAxisKm: 583511, periodDays: 13.463237, color: '#8f857c', gmKm3s2: 205.3, densityGcm3: 1.664, discoveryYear: 1787, discoveredBy: 'W. Herschel',
          description: { fr: "La plus lointaine des grandes lunes d'Uranus, ancienne et couverte de cratères.", en: "The outermost of Uranus's major moons, old and covered in craters." } },
      ],
      appearance: 'procedural',
    },
    {
      id: 'neptune', name: 'Neptune',
      kind: { fr: 'Géante de glace', en: 'Ice giant' },
      description: {
        fr: "La planète la plus lointaine, balayée par les vents les plus rapides mesurés dans le système solaire. Elle a été trouvée par le calcul avant d'être observée, en 1846.",
        en: 'The most distant planet, swept by the fastest winds measured in the Solar System. It was found by calculation before it was observed, in 1846.',
      },
      facts: { radiusKm: 24764, massEarth: 17.09, semiMajorAxisAU: 30.18, periodDays: 59800, eccentricity: 0.010, dayHours: 16.1, gravity: 11.0, meanTempC: -200, moons: 16, obliquityDeg: 28.3 },
      render: {
        type: 'gas', seed: 18, rings: false, tiltDeg: 28.3,
        palette: ['#3d5fc4', '#2f4ea8', '#5577d6', '#24408f', '#4466c0', '#1d2f6b'],
        atmosphere: { thick: 0.05, kR: [2.0, 4.5, 9.0], kM: [1.5, 1.6, 2.0], g: 0.7 },
      },
      moons: [{ id: 'triton', name: 'Triton', radiusKm: 1352.6, semiMajorAxisKm: 354800, periodDays: 5.8792, retrograde: true, color: '#d9c7bf', gmKm3s2: 1428.49546, densityGcm3: 2.0649, discoveryYear: 1846, discoveredBy: 'W. Lassell',
          description: { fr: "Son orbite rétrograde trahit un objet probablement capturé dans la ceinture de Kuiper. Voyager 2 y a observé des geysers d'azote.", en: 'Its retrograde orbit betrays a body probably captured from the Kuiper belt. Voyager 2 saw nitrogen geysers there.' } }],
      appearance: 'procedural',
    },
  ],
  sources: [
    { label: 'NASA — Planetary Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' },
    { label: 'Space.com — Jupiter (101) et Saturne (285), mars 2026', url: 'https://www.space.com/astronomy/saturn/astronomers-keep-finding-new-moons-of-jupiter-and-saturn' },
    { label: 'Sky & Telescope — satellites planétaires (Uranus 29)', url: 'https://skyandtelescope.org/observing/celestial-objects-to-watch/a-guide-to-planetary-satellites/' },
    { label: 'JPL SSD — paramètres physiques des satellites', url: 'https://ssd.jpl.nasa.gov/sats/phys_par/' },
    { label: 'JPL SSD — éléments orbitaux des satellites', url: 'https://ssd.jpl.nasa.gov/sats/elem/' },
  ],
}

/** Rocky exoplanets of unknown surface: muted palettes, so nobody mistakes them for observed colours. */
const HOT_ROCK: [string, string, string, string, string, string] = ['#3a2620', '#5c3a2c', '#7a5440', '#2e1d17', '#1c120e', '#9a8a7c']
const TEMPERATE: [string, string, string, string, string, string] = ['#0b2235', '#1c4a5c', '#3f5a3a', '#8a7a5a', '#5a5048', '#dfe6ea']
const SUB_NEPTUNE: [string, string, string, string, string, string] = ['#8fb0c4', '#6f93ab', '#a9c3d2', '#5d7f97', '#86a8bd', '#b9cfdb']
const YOUNG_GIANT: [string, string, string, string, string, string] = ['#6b2e1f', '#3d1a14', '#8a4a2c', '#2b120e', '#5a2a1c', '#c4552b']

export const trappist1: PlanetarySystem = {
  id: 'trappist-1',
  name: 'TRAPPIST-1',
  kind: 'real',
  distanceLy: 40.66,
  summary: {
    fr: "Une naine rouge ultra-froide entourée de sept planètes de taille terrestre, toutes plus proches de leur étoile que Mercure du Soleil. Plusieurs orbitent là où l'eau pourrait être liquide.",
    en: 'An ultra-cool red dwarf circled by seven Earth-sized planets, all closer to their star than Mercury is to the Sun. Several orbit where water could be liquid.',
  },
  star: {
    name: 'TRAPPIST-1', spectralType: 'M8V', massSun: 0.0898, radiusSun: 0.1191, temperatureK: 2566, ageGyr: 7.6,
    description: {
      fr: "Une naine rouge ultra-froide, à peine plus grande que Jupiter. Elle est si peu lumineuse que ses planètes doivent orbiter très près d'elle pour recevoir de la chaleur.",
      en: 'An ultra-cool red dwarf, barely larger than Jupiter. It is so dim that its planets must orbit very close to it to receive any warmth.',
    },
  },
  planets: ([
    ['b', 1.374, 1.116, 0.01154, 1.510826, 0.00622, 397.6, 2016, 'arid', HOT_ROCK],
    ['c', 1.308, 1.097, 0.01580, 2.421937, 0.00654, 339.7, 2016, 'arid', HOT_ROCK],
    ['d', 0.388, 0.770, 0.02227, 4.049219, 0.00837, 286.2, 2017, 'ocean', TEMPERATE],
    ['e', 0.692, 0.920, 0.02925, 6.101013, 0.00510, 249.7, 2017, 'ocean', TEMPERATE],
    ['f', 1.039, 1.045, 0.03849, 9.207540, 0.01007, 217.7, 2017, 'ice', undefined],
    ['g', 1.321, 1.129, 0.04683, 12.352446, 0.00208, 197.3, 2017, 'ice', undefined],
    ['h', 0.326, 0.775, 0.06189, 18.772866, 0.00567, 171.7, 2017, 'ice', undefined],
  ] as const).map(([l, m, r, a, p, e, t, y, type, palette], i) => ({
    id: l,
    name: `TRAPPIST-1 ${l}`,
    kind: { fr: 'Planète rocheuse', en: 'Rocky planet' },
    facts: { massEarth: m, radiusEarth: r, semiMajorAxisAU: a, periodDays: p, eccentricity: e, equilibriumTempK: t, discoveryYear: y },
    render: { type, seed: 100 + i, ...(palette ? { palette: [...palette] as typeof HOT_ROCK } : {}) },
    appearance: 'artistic' as const,
  })),
  sources: [{ label: 'Wikipedia — TRAPPIST-1 (Agol et al. 2021)', url: 'https://en.wikipedia.org/wiki/TRAPPIST-1' }],
}

export const kepler90: PlanetarySystem = {
  id: 'kepler-90',
  name: 'Kepler-90',
  kind: 'real',
  distanceLy: 2790,
  summary: {
    fr: "Le seul système connu qui compte huit planètes, comme le nôtre, mais toutes serrées à moins d'une unité astronomique de leur étoile. La huitième, Kepler-90i, a été repérée en 2017 par un réseau de neurones de Google dans les données de Kepler.",
    en: 'The only known system with eight planets, like ours, but all packed within one astronomical unit of their star. The eighth, Kepler-90i, was spotted in 2017 by a Google neural network in Kepler data.',
  },
  star: {
    name: 'Kepler-90', spectralType: 'F9IV/V', massSun: 1.2, radiusSun: 1.2, temperatureK: 6080,
    description: {
      fr: 'Une étoile un peu plus massive, plus grande et plus chaude que le Soleil.',
      en: 'A star slightly more massive, larger and hotter than the Sun.',
    },
  },
  planets: ([
    ['b', 4.3, 1.30, 0.074, 7.008151, undefined, 'arid', HOT_ROCK, { fr: 'Super-Terre', en: 'Super-Earth' }],
    ['c', 6.5, 1.45, 0.089, 8.719375, undefined, 'arid', HOT_ROCK, { fr: 'Super-Terre', en: 'Super-Earth' }],
    ['i', 4.5, 1.32, 0.107, 14.44912, undefined, 'arid', HOT_ROCK, { fr: 'Super-Terre', en: 'Super-Earth' }],
    ['d', 7.2, 2.87, 0.32, 59.73667, undefined, 'gas', SUB_NEPTUNE, { fr: 'Mini-Neptune', en: 'Sub-Neptune' }],
    ['e', 6.6, 2.61, 0.42, 91.93913, undefined, 'gas', SUB_NEPTUNE, { fr: 'Mini-Neptune', en: 'Sub-Neptune' }],
    ['f', 6.9, 2.77, 0.48, 124.9144, 0.01, 'gas', SUB_NEPTUNE, { fr: 'Mini-Neptune', en: 'Sub-Neptune' }],
    ['g', 15.0, 7.72, 0.71, 210.73514, 0.0292, 'gas', undefined, { fr: 'Géante gazeuse', en: 'Gas giant' }],
    ['h', 203, 11.25, 1.01, 331.60296, 0.0276, 'gas', undefined, { fr: 'Géante gazeuse', en: 'Gas giant' }],
  ] as const).map(([l, m, r, a, p, e, type, palette, kind], i) => ({
    id: l,
    name: `Kepler-90 ${l}`,
    kind: { ...kind },
    facts: {
      // Only g and h have measured masses; the others are model estimates in the source table.
      massEarth: m, massIsEstimate: i < 6, radiusEarth: r, semiMajorAxisAU: a, periodDays: p,
      ...(e !== undefined ? { eccentricity: e } : {}),
      discoveryYear: l === 'i' ? 2017 : undefined,
    },
    render: { type, seed: 200 + i, rings: false, ...(palette ? { palette: [...palette] as typeof HOT_ROCK } : {}) },
    appearance: 'artistic' as const,
  })),
  sources: [{ label: 'Wikipedia — Kepler-90', url: 'https://en.wikipedia.org/wiki/Kepler-90' }],
}

export const proximaCentauri: PlanetarySystem = {
  id: 'proxima-centauri',
  name: 'Proxima Centauri',
  kind: 'real',
  distanceLy: 4.2465,
  summary: {
    fr: "L'étoile la plus proche du Soleil, une naine rouge de l'ensemble Alpha Centauri. Deux planètes sont confirmées ; Proxima b orbite dans la zone où l'eau pourrait être liquide. Une troisième, Proxima c, reste contestée et n'est pas affichée.",
    en: 'The closest star to the Sun, a red dwarf in the Alpha Centauri system. Two planets are confirmed; Proxima b orbits where water could be liquid. A third, Proxima c, remains disputed and is not shown.',
  },
  star: {
    name: 'Proxima Centauri', spectralType: 'M5.5Ve', massSun: 0.1221, radiusSun: 0.1542, temperatureK: 2992,
    description: {
      fr: "Une naine rouge sujette à de fortes éruptions, l'étoile la plus proche du Soleil.",
      en: 'A red dwarf prone to strong flares, and the closest star to the Sun.',
    },
  },
  planets: [
    {
      id: 'd', name: 'Proxima d',
      kind: { fr: 'Planète rocheuse', en: 'Rocky planet' },
      description: {
        fr: "Annoncée comme candidate en 2022 et confirmée en 2025. Seule sa masse minimale est connue : environ un quart de celle de la Terre.",
        en: 'Announced as a candidate in 2022 and confirmed in 2025. Only its minimum mass is known: about a quarter of Earth’s.',
      },
      facts: { massEarth: 0.26, massIsMinimum: true, semiMajorAxisAU: 0.02881, periodDays: 5.12338, eccentricity: 0, discoveryYear: 2025 },
      render: { type: 'arid', seed: 301, palette: [...HOT_ROCK] as typeof HOT_ROCK, atmosphere: null },
      appearance: 'artistic',
    },
    {
      id: 'b', name: 'Proxima b',
      kind: { fr: 'Planète rocheuse', en: 'Rocky planet' },
      description: {
        fr: "L'exoplanète connue la plus proche de nous, en zone habitable. Seule sa masse minimale est connue, légèrement supérieure à celle de la Terre.",
        en: 'The closest known exoplanet, in the habitable zone. Only its minimum mass is known, slightly above Earth’s.',
      },
      facts: { massEarth: 1.055, massIsMinimum: true, semiMajorAxisAU: 0.04848, periodDays: 11.18465, eccentricity: 0, discoveryYear: 2016 },
      render: { type: 'ocean', seed: 302, palette: [...TEMPERATE] as typeof TEMPERATE },
      appearance: 'artistic',
    },
  ],
  sources: [{ label: 'Wikipedia — Proxima Centauri', url: 'https://en.wikipedia.org/wiki/Proxima_Centauri' }],
}

export const hr8799: PlanetarySystem = {
  id: 'hr-8799',
  name: 'HR 8799',
  kind: 'real',
  distanceLy: 133.3,
  summary: {
    fr: "Une jeune étoile autour de laquelle quatre géantes gazeuses ont été photographiées directement, une première en 2008. Encore chaudes de leur formation, elles brillent en infrarouge. Elles sont encadrées par deux ceintures de débris.",
    en: 'A young star around which four gas giants were imaged directly, a first in 2008. Still hot from their formation, they glow in the infrared. They sit between two debris belts.',
  },
  star: {
    name: 'HR 8799', spectralType: 'F0 V λ Boo', massSun: 1.52, radiusSun: 1.502, temperatureK: 7193, ageGyr: 0.03,
    description: {
      fr: "Une étoile jeune, plus massive et plus chaude que le Soleil. Elle appartient à la classe des étoiles λ Bootis, dont l'atmosphère est pauvre en métaux.",
      en: 'A young star, more massive and hotter than the Sun. It belongs to the λ Bootis class, whose atmospheres are poor in metals.',
    },
  },
  planets: ([
    ['e', 11.7, 1.13, 15.80, 52.37, 0.13, 2010],
    ['d', 9.2, 1.26, 25.9, 104.7, 0.10, 2008],
    ['c', 9.0, 1.10, 43.4, 209.5, 0.02, 2008],
    ['b', 4.7, 1.19, 68.8, 419, 0.04, 2008],
  ] as const).map(([l, mJ, rJ, a, pYears, e, y], i) => ({
    id: l,
    name: `HR 8799 ${l}`,
    kind: { fr: 'Géante gazeuse jeune', en: 'Young gas giant' },
    facts: {
      // Source table in Jupiter units: 1 M_J = 317.8 M⊕, 1 R_J = 11.21 R⊕; period given in years.
      massEarth: Math.round(mJ * 317.8), radiusEarth: Math.round(rJ * 11.21 * 10) / 10,
      semiMajorAxisAU: a, periodDays: Math.round(pYears * 365.25), eccentricity: e, discoveryYear: y,
    },
    render: { type: 'gas' as const, seed: 400 + i, rings: false, palette: [...YOUNG_GIANT] as typeof YOUNG_GIANT },
    appearance: 'artistic' as const,
  })),
  sources: [{ label: 'Wikipedia — HR 8799', url: 'https://en.wikipedia.org/wiki/HR_8799' }],
}

/** Real systems, in display order. */
export const realSystems: PlanetarySystem[] = [solarSystem, trappist1, kepler90, proximaCentauri, hr8799]
