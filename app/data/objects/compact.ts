import type { SpaceObject } from '~/types/objects'
import { CONSTELLATION, constellation, schwarzschild, wikipedia } from './common'

/** Black holes, neutron stars and quasars: everything driven by extreme gravity. Values from the cited pages (2026). */

export const BLACK_HOLES: SpaceObject[] = [
  {
    id: 'sagittarius-a-star', category: 'black-holes', name: 'Sagittarius A*',
    kind: { fr: 'Trou noir supermassif', en: 'Supermassive black hole' },
    description: {
      fr: "Le trou noir au centre de la Voie lactée. Des étoiles qui le frôlent en quelques années ont permis de peser sa masse ; l'Event Horizon Telescope a publié sa première image en 2022. Il est aujourd'hui très calme : il n'avale presque rien.",
      en: 'The black hole at the centre of the Milky Way. Stars whipping round it in a few years gave its mass; the Event Horizon Telescope released its first image in 2022. It is very quiet today, swallowing almost nothing.',
    },
    facts: [
      { key: 'mass', value: 4.297e6, unit: 'msun', digits: 3 },
      schwarzschild(4.297e6),
      { key: 'distance', value: 26996, unit: 'ly', digits: 0 },
      constellation(CONSTELLATION.sagittarius),
      { key: 'discovery', text: '1974' },
      { key: 'firstImage', text: { fr: '12 mai 2022 (EHT)', en: '12 May 2022 (EHT)' } },
    ],
    render: { kind: 'black-hole', diskTemperatureK: 6500, diskIntensity: 0.55, diskOuter: 9, tiltDeg: 12, seed: 1 },
    appearance: 'simulation',
    sources: [wikipedia('Sagittarius A*', 'Sagittarius_A*')],
  },
  {
    id: 'm87-star', category: 'black-holes', name: 'M87*',
    kind: { fr: 'Trou noir supermassif', en: 'Supermassive black hole' },
    description: {
      fr: "Le premier trou noir jamais photographié, en avril 2019. Au cœur de la galaxie géante M87, il projette un jet de matière long d'au moins 4 900 années-lumière.",
      en: 'The first black hole ever imaged, in April 2019. At the heart of the giant galaxy M87, it drives a jet of matter at least 4,900 light-years long.',
    },
    facts: [
      { key: 'mass', value: 6.5e9, unit: 'msun', digits: 1 },
      schwarzschild(6.5e9),
      { key: 'distance', value: 53.5, unit: 'mly', digits: 1 },
      { key: 'jet', value: 4900, unit: 'ly', digits: 0, qualifier: '≥' },
      constellation(CONSTELLATION.virgo),
      { key: 'firstImage', text: { fr: '10 avril 2019 (EHT)', en: '10 April 2019 (EHT)' } },
    ],
    render: { kind: 'black-hole', diskTemperatureK: 4200, diskIntensity: 0.9, diskOuter: 11, tiltDeg: 17, jets: { intensity: 0.7, color: '#8fb4ff' }, seed: 2 },
    appearance: 'simulation',
    sources: [wikipedia('Messier 87', 'Messier_87')],
  },
  {
    id: 'ton-618', category: 'black-holes', name: 'TON 618',
    kind: { fr: 'Trou noir ultramassif · quasar', en: 'Ultramassive black hole · quasar' },
    description: {
      fr: "L'un des trous noirs les plus massifs connus, au cœur d'un quasar dont la lumière a voyagé 10,8 milliards d'années. Il brille environ 140 000 milliards de fois plus que le Soleil.",
      en: 'One of the most massive black holes known, powering a quasar whose light travelled for 10.8 billion years. It shines about 140 trillion times brighter than the Sun.',
    },
    facts: [
      { key: 'mass', value: 4.07e10, unit: 'msun', digits: 1, note: { fr: 'révisée en 2019 ; 66 milliards auparavant', en: 'revised 2019; previously 66 billion' } },
      schwarzschild(4.07e10),
      { key: 'luminosity', value: 1.4e14, unit: 'lsun', qualifier: '≈' },
      { key: 'redshift', value: 2.219, digits: 3 },
      { key: 'lightTravel', value: 10.8, unit: 'gly', digits: 1 },
      constellation({ fr: 'Chiens de chasse (limite de la Chevelure de Bérénice)', en: 'Canes Venatici (Coma Berenices border)' }),
    ],
    render: { kind: 'black-hole', diskTemperatureK: 15000, diskIntensity: 2.2, diskOuter: 14, tiltDeg: 24, jets: { intensity: 0.45, color: '#a9c4ff' }, seed: 3 },
    appearance: 'simulation',
    sources: [wikipedia('TON 618', 'TON_618')],
  },
  {
    id: 'phoenix-a', category: 'black-holes', name: 'Phoenix A*',
    kind: { fr: 'Trou noir ultramassif', en: 'Ultramassive black hole' },
    description: {
      fr: "Le trou noir central de l'amas du Phénix, candidat au titre de plus massif connu. Sa masse n'a pas été mesurée par des orbites : elle vient d'un modèle, à la limite de ce que la théorie permet.",
      en: 'The central black hole of the Phoenix Cluster, a candidate for the most massive known. Its mass was not measured from orbits: it comes from a model, near the limits of what theory allows.',
    },
    facts: [
      { key: 'mass', value: 1e11, unit: 'msun', qualifier: '~', note: { fr: 'estimation par modèle, non mesurée', en: 'model estimate, not measured' } },
      schwarzschild(1e11),
      { key: 'lightTravel', value: 5.86, unit: 'gly', digits: 2 },
      { key: 'host', text: { fr: "Amas du Phénix (formation d'étoiles : 740 M☉ par an)", en: 'Phoenix Cluster (star formation: 740 M☉ per year)' } },
      constellation(CONSTELLATION.phoenix),
    ],
    render: { kind: 'black-hole', diskTemperatureK: 9000, diskIntensity: 0.8, diskOuter: 16, tiltDeg: 8, seed: 4 },
    appearance: 'simulation',
    sources: [wikipedia('Phoenix Cluster', 'Phoenix_Cluster')],
  },
  {
    id: 'cygnus-x-1', category: 'black-holes', name: 'Cygnus X-1',
    kind: { fr: 'Trou noir stellaire · binaire X', en: 'Stellar black hole · X-ray binary' },
    description: {
      fr: "Le premier objet largement accepté comme trou noir. Il arrache la matière d'une supergéante bleue, HDE 226868, autour de laquelle il tourne en 5,6 jours ; ce gaz chauffé émet des rayons X.",
      en: 'The first object widely accepted as a black hole. It strips gas from a blue supergiant, HDE 226868, which it orbits every 5.6 days; the heated gas shines in X-rays.',
    },
    facts: [
      { key: 'mass', value: 17.5, unit: 'msun', digits: 1, qualifier: '≈', note: { fr: '13,8 à 17,5 selon la méthode', en: '13.8 to 17.5 depending on method' } },
      schwarzschild(17.5),
      { key: 'companion', text: { fr: 'HDE 226868, supergiante O9.7Iab, ≈ 29 M☉', en: 'HDE 226868, O9.7Iab supergiant, ≈ 29 M☉' } },
      { key: 'orbitalPeriod', value: 5.599829, unit: 'days', digits: 2 },
      { key: 'distance', value: 7300, unit: 'ly', digits: 0 },
      constellation(CONSTELLATION.cygnus),
      { key: 'discovery', text: '1964' },
    ],
    render: {
      kind: 'black-hole', diskTemperatureK: 20000, diskIntensity: 1.1, diskOuter: 10, tiltDeg: 20, seed: 5,
      companion: { temperatureK: 30000, radius: 4.2, distance: 21 },
    },
    appearance: 'simulation',
    sources: [wikipedia('Cygnus X-1', 'Cygnus_X-1')],
  },
  {
    id: 'mom-bh-1', category: 'black-holes', name: 'MoM-BH*-1',
    kind: { fr: 'Étoile trou noir · aube cosmique', en: 'Black hole star · cosmic dawn' },
    description: {
      fr: "Un « petit point rouge » repéré par le télescope James Webb, vu 660 millions d'années après le Big Bang. Il brille comme une étoile grande comme le Système solaire, mais émet bien plus d'énergie que la fusion nucléaire ne le permet : les astronomes y voient un trou noir en pleine croissance, enfoui dans une enveloppe d'hydrogène très dense. C'est le premier exemple d'un nouveau type d'objet, l'étoile trou noir.",
      en: 'A "little red dot" spotted by the James Webb telescope, seen 660 million years after the Big Bang. It shines like a star the size of the Solar System, yet gives off far more energy than nuclear fusion allows: astronomers read it as a fast-growing black hole buried in a very dense envelope of hydrogen. It is the first example of a new kind of object, the black hole star.',
    },
    facts: [
      { key: 'blackHoleMass', value: 1e5, unit: 'msun', qualifier: '≈', note: { fr: 'jusqu\'à ~10 millions selon les modèles', en: 'up to ~10 million depending on the model' } },
      { key: 'envelope', text: { fr: '10 à 100 UA d\'hydrogène dense (≈ 40 UA dans le modèle de référence)', en: '10 to 100 AU of dense hydrogen (≈ 40 AU in the reference model)' } },
      { key: 'redshift', value: 7.76, digits: 2, qualifier: '≈' },
      { key: 'universeAge', text: { fr: '660 millions d\'années', en: '660 million years' } },
      { key: 'luminosity', text: { fr: '~100 milliards de fois une étoile', en: '~100 billion times a star' } },
      { key: 'discovery', text: { fr: 'JWST, relevé Mirage or Miracle · Nature, 12 août 2026', en: 'JWST, Mirage or Miracle survey · Nature, 12 August 2026' } },
    ],
    render: {
      kind: 'star', temperatureK: 3800, tint: '#d8452c', granulation: 0.55, spots: 0, glow: 0.45, rotationS: 3e6,
      envelope: { lumpiness: 0.1, haze: '#ff4a2c' }, seed: 74,
    },
    appearance: 'impression',
    sources: [
      { label: 'MIT News — A black hole star (2026)', url: 'https://news.mit.edu/2026/astronomers-discover-brand-new-type-astrophysical-object-black-hole-star-0812' },
      { label: 'Sci.News — Black hole star in early universe (2026)', url: 'https://www.sci.news/astronomy/black-hole-star-early-universe-14989.html' },
    ],
  },
]

export const NEUTRON_STARS: SpaceObject[] = [
  {
    id: 'crab-pulsar', category: 'neutron-stars', name: { fr: 'Pulsar du Crabe', en: 'Crab Pulsar' },
    kind: { fr: 'Pulsar · reste de SN 1054', en: 'Pulsar · remnant of SN 1054' },
    description: {
      fr: "Le cœur effondré de l'étoile qui a explosé en 1054, observée par des astronomes chinois. Il tourne sur lui-même 30 fois par seconde et ralentit de 38 nanosecondes par jour ; son vent illumine la nébuleuse du Crabe.",
      en: 'The collapsed core of the star that exploded in 1054, recorded by Chinese astronomers. It spins 30 times a second and slows by 38 nanoseconds a day; its wind lights up the Crab Nebula.',
    },
    facts: [
      { key: 'period', value: 33.392, unit: 'ms', digits: 3 },
      { key: 'mass', text: { fr: '1,5 – 2,5 M☉', en: '1.5 – 2.5 M☉' } },
      { key: 'radius', value: 10, unit: 'km', qualifier: '~' },
      { key: 'distance', value: 6200, unit: 'ly', digits: 0, qualifier: '≈' },
      constellation(CONSTELLATION.taurus),
      { key: 'discovery', text: { fr: '1968 (supernova : 1054)', en: '1968 (supernova: 1054)' } },
    ],
    render: { kind: 'neutron-star', periodS: 0.033392, magneticTiltDeg: 48, beamColor: '#a8c8ff', windNebula: { color: '#7fa6ff' }, seed: 11 },
    appearance: 'simulation',
    sources: [wikipedia('Crab Pulsar', 'Crab_Pulsar')],
  },
  {
    id: 'vela-pulsar', category: 'neutron-stars', name: { fr: 'Pulsar des Voiles', en: 'Vela Pulsar' },
    kind: { fr: 'Pulsar', en: 'Pulsar' },
    description: {
      fr: "Né d'une supernova il y a 11 000 à 12 300 ans, il tourne 11 fois par seconde. Environ tous les trois ans, sa rotation s'accélère brusquement : un « glitch » que personne ne sait encore prévoir.",
      en: 'Born in a supernova 11,000 to 12,300 years ago, it spins 11 times a second. About every three years its rotation suddenly speeds up: a "glitch" no one can yet predict.',
    },
    facts: [
      { key: 'period', value: 89.328, unit: 'ms', digits: 3 },
      { key: 'age', text: { fr: '11 000 – 12 300 ans', en: '11,000 – 12,300 years' } },
      { key: 'distance', value: 959, unit: 'ly', digits: 0 },
      constellation(CONSTELLATION.vela),
    ],
    render: { kind: 'neutron-star', periodS: 0.089328, magneticTiltDeg: 60, beamColor: '#b8a8ff', windNebula: { color: '#9a8cff' }, seed: 12 },
    appearance: 'simulation',
    sources: [wikipedia('Vela Pulsar', 'Vela_Pulsar')],
  },
  {
    id: 'psr-j1748-2446ad', category: 'neutron-stars', name: 'PSR J1748−2446ad',
    kind: { fr: 'Pulsar milliseconde', en: 'Millisecond pulsar' },
    description: {
      fr: "Le pulsar le plus rapide connu : 716 tours par seconde. À son équateur, la surface file à environ 24 % de la vitesse de la lumière. Il se trouve dans l'amas globulaire Terzan 5.",
      en: 'The fastest-spinning pulsar known: 716 turns a second. At its equator the surface moves at about 24% of the speed of light. It lives in the globular cluster Terzan 5.',
    },
    facts: [
      { key: 'frequency', text: { fr: '716,36 Hz', en: '716.36 Hz' } },
      { key: 'period', value: 1.396, unit: 'ms', digits: 3 },
      { key: 'mass', value: 2, unit: 'msun', qualifier: '<' },
      { key: 'radius', value: 16, unit: 'km', qualifier: '<' },
      { key: 'distance', value: 18000, unit: 'ly', digits: 0 },
      { key: 'host', text: { fr: 'Amas globulaire Terzan 5', en: 'Globular cluster Terzan 5' } },
      constellation(CONSTELLATION.sagittarius),
      { key: 'discovery', text: '2004' },
    ],
    render: { kind: 'neutron-star', periodS: 0.001396, magneticTiltDeg: 35, beamColor: '#d4e2ff', seed: 13 },
    appearance: 'simulation',
    sources: [wikipedia('PSR J1748−2446ad', 'PSR_J1748%E2%88%922446ad')],
  },
  {
    id: 'sgr-1806-20', category: 'neutron-stars', name: 'SGR 1806−20',
    kind: { fr: 'Magnétar', en: 'Magnetar' },
    description: {
      fr: "Une étoile à neutrons au champ magnétique extrême, plus de mille milliards de fois celui de la Terre. Le 27 décembre 2004, une éruption géante de 10⁴⁰ joules, partie à 42 000 années-lumière, a été enregistrée par les satellites.",
      en: "A neutron star with an extreme magnetic field, over a trillion times Earth's. On 27 December 2004 a giant flare of 10⁴⁰ joules, from 42,000 light-years away, was recorded by satellites.",
    },
    facts: [
      { key: 'period', value: 7.556, unit: 's', digits: 3 },
      { key: 'magneticField', value: 1e15, unit: 'gauss', sci: true, qualifier: '>' },
      { key: 'flare', value: 1e40, unit: 'joule', sci: true, note: { fr: '27 décembre 2004', en: '27 December 2004' } },
      { key: 'distance', value: 42000, unit: 'ly', digits: 0 },
      constellation(CONSTELLATION.sagittarius),
      { key: 'discovery', text: '1979' },
    ],
    render: { kind: 'neutron-star', periodS: 7.556, magneticTiltDeg: 25, beamColor: '#ffb48a', magnetar: true, seed: 14 },
    appearance: 'simulation',
    sources: [wikipedia('SGR 1806−20', 'SGR_1806%E2%88%9220')],
  },
  {
    id: 'psr-b1919-21', category: 'neutron-stars', name: 'PSR B1919+21',
    kind: { fr: 'Premier pulsar découvert', en: 'First pulsar discovered' },
    description: {
      fr: "Le premier pulsar, repéré par Jocelyn Bell Burnell le 28 novembre 1967. Ses impulsions si régulières lui ont valu le surnom de LGM-1, pour « petits hommes verts », avant qu'on comprenne qu'il s'agissait d'une étoile.",
      en: 'The first pulsar, spotted by Jocelyn Bell Burnell on 28 November 1967. Its strictly regular pulses earned it the nickname LGM-1, for "little green men", before it was understood to be a star.',
    },
    facts: [
      { key: 'period', value: 1.3373, unit: 's', digits: 4 },
      { key: 'distance', value: 1000, unit: 'ly', digits: 0, qualifier: '~', note: { fr: 'très incertaine', en: 'highly uncertain' } },
      constellation(CONSTELLATION.vulpecula),
      { key: 'discovery', text: { fr: '28 novembre 1967 · Jocelyn Bell Burnell', en: '28 November 1967 · Jocelyn Bell Burnell' } },
    ],
    render: { kind: 'neutron-star', periodS: 1.3373, magneticTiltDeg: 55, beamColor: '#c7f0d8', seed: 15 },
    appearance: 'simulation',
    sources: [wikipedia('PSR B1919+21', 'PSR_B1919%2B21')],
  },
]

export const QUASARS: SpaceObject[] = [
  {
    id: '3c-273', category: 'quasars', name: '3C 273',
    kind: { fr: 'Quasar · premier identifié', en: 'Quasar · first identified' },
    description: {
      fr: "Le premier quasar identifié, en 1963, quand Maarten Schmidt a mesuré son décalage vers le rouge. C'est aussi le plus brillant vu de la Terre : un petit télescope suffit. Son jet s'étend sur environ 200 000 années-lumière.",
      en: 'The first quasar identified, in 1963, when Maarten Schmidt measured its redshift. It is also the brightest seen from Earth: a small telescope is enough. Its jet stretches about 200,000 light-years.',
    },
    facts: [
      { key: 'blackHoleMass', value: 8.86e8, unit: 'msun', digits: 2 },
      { key: 'redshift', value: 0.1583, digits: 4 },
      { key: 'luminosityDistance', value: 2.443, unit: 'gly', digits: 2 },
      { key: 'jet', value: 200000, unit: 'ly', qualifier: '~' },
      { key: 'magnitude', text: { fr: '12,9', en: '12.9' } },
      constellation(CONSTELLATION.virgo),
      { key: 'discovery', text: { fr: '1963 · Maarten Schmidt', en: '1963 · Maarten Schmidt' } },
    ],
    render: {
      kind: 'black-hole', diskTemperatureK: 18000, diskIntensity: 2.6, diskOuter: 12, tiltDeg: 22, seed: 21,
      jets: { intensity: 1, color: '#9cc0ff' }, host: { color: '#ffd9a8', radius: 60 },
    },
    appearance: 'simulation',
    sources: [wikipedia('3C 273', '3C_273')],
  },
  {
    id: 'j0529-4351', category: 'quasars', name: 'J0529−4351',
    kind: { fr: 'Quasar le plus lumineux connu', en: 'Most luminous quasar known' },
    description: {
      fr: "Annoncé en 2024 comme l'objet le plus lumineux connu : environ 500 000 milliards de soleils. Son trou noir engloutit l'équivalent d'environ une masse solaire par jour.",
      en: 'Announced in 2024 as the most luminous object known: about 500 trillion suns. Its black hole swallows roughly one solar mass of gas a day.',
    },
    facts: [
      { key: 'luminosity', value: 5e14, unit: 'lsun', qualifier: '≈' },
      { key: 'blackHoleMass', value: 1e9, unit: 'msun', qualifier: '≈', note: { fr: 'révisée en 2025 ; 17 milliards estimée en 2024', en: 'revised 2025; 17 billion estimated in 2024' } },
      { key: 'accretion', text: { fr: '≈ 1 M☉ par jour', en: '≈ 1 M☉ per day' } },
      { key: 'redshift', value: 3.962, digits: 3 },
      { key: 'lightTravel', value: 12, unit: 'gly', qualifier: '≈' },
      constellation(CONSTELLATION.pictor),
      { key: 'discovery', text: { fr: 'annoncé en 2024', en: 'announced 2024' } },
    ],
    render: {
      kind: 'black-hole', diskTemperatureK: 30000, diskIntensity: 4, diskOuter: 15, tiltDeg: 30, seed: 22,
      jets: { intensity: 0.5, color: '#b0c8ff' }, host: { color: '#ffcf9a', radius: 55 },
    },
    appearance: 'simulation',
    sources: [wikipedia('QSO J0529−4351', 'QSO_J0529%E2%88%924351')],
  },
  {
    id: 'ulas-j1342-0928', category: 'quasars', name: 'ULAS J1342+0928',
    kind: { fr: "Quasar de l'Univers primitif", en: 'Early-Universe quasar' },
    description: {
      fr: "Vu tel qu'il était 690 millions d'années après le Big Bang. Son trou noir de 780 millions de masses solaires pose une question : comment a-t-il pu grossir si vite ?",
      en: 'Seen as it was 690 million years after the Big Bang. Its 780-million-solar-mass black hole raises a question: how did it grow so fast?',
    },
    facts: [
      { key: 'blackHoleMass', value: 7.8e8, unit: 'msun', digits: 1 },
      { key: 'redshift', value: 7.54, digits: 2 },
      { key: 'lightTravel', value: 13.1, unit: 'gly', digits: 1 },
      { key: 'universeAge', value: 690, unit: 'myr', qualifier: '≈' },
      constellation(CONSTELLATION.bootes),
      { key: 'discovery', text: '2017' },
    ],
    render: {
      kind: 'black-hole', diskTemperatureK: 14000, diskIntensity: 2.1, diskOuter: 11, tiltDeg: 35, seed: 23,
      jets: { intensity: 0.35, color: '#c4a8ff' }, host: { color: '#ff9f8a', radius: 40 },
    },
    appearance: 'simulation',
    sources: [wikipedia('ULAS J1342+0928', 'ULAS_J1342%2B0928')],
  },
  {
    id: 'apm-08279-5255', category: 'quasars', name: 'APM 08279+5255',
    kind: { fr: 'Quasar à lentille gravitationnelle', en: 'Gravitationally lensed quasar' },
    description: {
      fr: "Une galaxie au premier plan agit comme une loupe et le dédouble en trois images. Il abrite le plus grand réservoir d'eau connu : environ 100 000 milliards de fois l'eau des océans terrestres, sous forme de vapeur.",
      en: 'A foreground galaxy acts as a magnifying glass and splits it into three images. It holds the largest reservoir of water known: about 100 trillion times the water in Earth\'s oceans, as vapour.',
    },
    facts: [
      { key: 'blackHoleMass', value: 1e10, unit: 'msun', digits: 1, note: { fr: 'réverbération ; 23 milliards par la dynamique du gaz', en: 'reverberation; 23 billion from gas dynamics' } },
      { key: 'redshift', value: 3.911, digits: 3 },
      { key: 'lightTravel', value: 12.05, unit: 'gly', digits: 2 },
      { key: 'images', text: { fr: '3 (lentille gravitationnelle)', en: '3 (gravitational lens)' } },
      constellation(CONSTELLATION.lynx),
      { key: 'discovery', text: '1998' },
    ],
    render: {
      kind: 'black-hole', diskTemperatureK: 22000, diskIntensity: 3, diskOuter: 13, tiltDeg: 15, seed: 24,
      jets: { intensity: 0.3, color: '#9cc0ff' }, host: { color: '#9fd0ff', radius: 50 },
    },
    appearance: 'simulation',
    sources: [wikipedia('APM 08279+5255', 'APM_08279%2B5255')],
  },
]
