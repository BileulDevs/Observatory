import type { SpaceObject } from '~/types/objects'
import { CONSTELLATION, constellation, wikipedia } from './common'

/** Galaxies and nebulae. Values from the cited pages (2026). */

export const GALAXIES: SpaceObject[] = [
  {
    id: 'milky-way', category: 'galaxies', name: { fr: 'Voie lactée', en: 'Milky Way' },
    kind: { fr: 'Spirale barrée · notre galaxie', en: 'Barred spiral · our galaxy' },
    description: {
      fr: "Notre galaxie, vue ici de l'extérieur, ce que personne n'a jamais pu faire : sa forme est reconstituée à partir de mesures prises de l'intérieur. Le Soleil se trouve à environ 27 000 années-lumière du centre et en fait le tour en à peu près 240 millions d'années.",
      en: 'Our galaxy, shown here from outside, which no one has ever seen: its shape is reconstructed from measurements made inside it. The Sun sits about 27,000 light-years from the centre and goes round it in roughly 240 million years.',
    },
    facts: [
      { key: 'type', text: 'SB(rs)bc' },
      { key: 'diameter', value: 87400, unit: 'ly', digits: 0 },
      { key: 'stars', text: { fr: '100 à 400 milliards', en: '100 to 400 billion' } },
      { key: 'mass', value: 1.15e12, unit: 'msun', sci: true },
      { key: 'sunDistance', value: 27000, unit: 'ly', qualifier: '≈' },
      { key: 'galacticYear', value: 240, unit: 'myr', qualifier: '≈' },
    ],
    render: { kind: 'galaxy', morphology: 'barred-spiral', arms: 4, twist: 4.2, core: '#ffe2b0', arm: '#bcd3ff', dust: 0.8, viewElevationDeg: 48, seed: 31 },
    markers: [
      {
        anchor: 'core',
        title: { fr: 'Sagittarius A*', en: 'Sagittarius A*' },
        text: { fr: '4 millions de soleils au centre', en: '4 million Suns at the centre' },
        body: {
          fr: 'Au centre, le trou noir Sagittarius A* pèse environ 4 millions de soleils. On l’a pesé en suivant pendant des décennies les étoiles qui tournent autour, comme S2, qui en fait le tour en 16 ans. Ces travaux ont valu le prix Nobel 2020 à Reinhard Genzel et Andrea Ghez.',
          en: 'At the centre, the black hole Sagittarius A* weighs about 4 million Suns. It was weighed by following for decades the stars orbiting it, such as S2, which goes round in 16 years. This work earned Reinhard Genzel and Andrea Ghez the 2020 Nobel Prize.',
        },
      },
      {
        anchor: 'bar',
        title: { fr: 'Barre', en: 'Bar' },
        text: { fr: 'Notre galaxie est une spirale barrée', en: 'Ours is a barred spiral' },
        body: {
          fr: 'Les étoiles du centre forment une barre allongée, longue de plusieurs dizaines de milliers d’années-lumière. Les relevés infrarouges, qui voient à travers la poussière, l’ont établie. Les grands bras spiraux partent de ses extrémités.',
          en: 'The central stars form an elongated bar tens of thousands of light-years long. Infrared surveys, which see through the dust, established it. The major spiral arms start from its ends.',
        },
      },
      {
        anchor: 'arm',
        title: { fr: 'Bras spiral', en: 'Spiral arm' },
        text: { fr: 'Étoiles jeunes et nébuleuses', en: 'Young stars and nebulae' },
        body: {
          fr: 'Les bras concentrent gaz, poussière et étoiles jeunes, très lumineuses, qui les rendent visibles. On les décrit souvent comme des ondes de densité : les étoiles les traversent sans y rester. Le Soleil se trouve dans un petit bras, le bras d’Orion, à environ 27 000 années-lumière du centre.',
          en: 'The arms gather gas, dust and bright young stars, which make them visible. They are often described as density waves: stars pass through them without staying. The Sun lies in a minor arm, the Orion Arm, about 27,000 light-years from the centre.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Milky Way', 'Milky_Way')],
  },
  {
    id: 'andromeda', category: 'galaxies', name: { fr: 'Galaxie d\'Andromède', en: 'Andromeda Galaxy' },
    kind: { fr: 'Spirale · M31', en: 'Spiral · M31' },
    description: {
      fr: "La grande galaxie la plus proche, visible à l'œil nu par ciel noir. Elle se rapproche de nous à environ 110 km/s ; une collision avec la Voie lactée d'ici quelques milliards d'années, longtemps tenue pour certaine, est désormais jugée bien moins probable.",
      en: 'The nearest large galaxy, visible to the naked eye under dark skies. It approaches us at about 110 km/s; a collision with the Milky Way within a few billion years, long thought certain, is now judged much less likely.',
    },
    facts: [
      { key: 'type', text: 'SAB(s)b' },
      { key: 'distance', value: 2.5, unit: 'mly', digits: 2 },
      { key: 'diameter', value: 152000, unit: 'ly', digits: 0 },
      { key: 'stars', text: { fr: '~ 1 000 milliards', en: '~ 1 trillion' } },
      { key: 'mass', value: 1.5e12, unit: 'msun', sci: true },
      { key: 'approach', value: 110, unit: 'kms', qualifier: '≈' },
      { key: 'magnitude', text: { fr: '3,44', en: '3.44' } },
      constellation(CONSTELLATION.andromeda),
    ],
    render: { kind: 'galaxy', morphology: 'spiral', arms: 2, twist: 5.5, core: '#ffdcaa', arm: '#c9d8ff', dust: 0.9, viewElevationDeg: 14, seed: 32 },
    markers: [
      {
        anchor: 'core',
        title: { fr: 'Double noyau', en: 'Double nucleus' },
        text: { fr: 'Deux concentrations d’étoiles au centre', en: 'Two star concentrations at the centre' },
        body: {
          fr: 'Hubble a montré en 1993 que son noyau présente deux pics de lumière. Il s’agirait d’un seul disque d’étoiles sur des orbites allongées autour du trou noir central, d’environ 100 millions de soleils : les étoiles ralentissent et s’accumulent au point le plus éloigné, ce qui crée le second pic.',
          en: 'Hubble showed in 1993 that its nucleus has two peaks of light. It is probably a single disk of stars on elongated orbits around the central black hole of about 100 million Suns: stars slow down and pile up at the far point, creating the second peak.',
        },
      },
      {
        anchor: 'dust-lane',
        title: { fr: 'Anneau de poussière', en: 'Dust ring' },
        text: { fr: 'Formation d’étoiles à ≈ 30 000 al du centre', en: 'Star formation ≈ 30,000 ly from the centre' },
        body: {
          fr: 'En infrarouge apparaît un grand anneau de poussière à environ 30 000 années-lumière du centre, où naissent la plupart des nouvelles étoiles. Il pourrait être né d’une collision avec la petite galaxie M32 il y a quelques centaines de millions d’années.',
          en: 'Infrared images reveal a large dust ring about 30,000 light-years from the centre, where most new stars form. It may come from a collision with the small galaxy M32 a few hundred million years ago.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Andromeda Galaxy', 'Andromeda_Galaxy')],
  },
  {
    id: 'whirlpool', category: 'galaxies', name: { fr: 'Galaxie du Tourbillon', en: 'Whirlpool Galaxy' },
    kind: { fr: 'Spirale à grand dessin · M51', en: 'Grand-design spiral · M51' },
    description: {
      fr: "La première galaxie dont on a vu la forme spirale, dessinée par Lord Rosse en 1845. Ses bras si nets sont dus à sa petite compagne, NGC 5195, qui la traverse.",
      en: 'The first galaxy whose spiral shape was seen, drawn by Lord Rosse in 1845. Its crisp arms are stirred by its small companion, NGC 5195, passing through it.',
    },
    facts: [
      { key: 'type', text: 'SA(s)bc pec' },
      { key: 'distance', text: { fr: '23 à 31 millions d\'a.l.', en: '23 to 31 million ly' } },
      { key: 'diameter', value: 76900, unit: 'ly', digits: 0 },
      { key: 'mass', value: 1.6e11, unit: 'msun', sci: true },
      { key: 'companion', text: 'NGC 5195' },
      constellation(CONSTELLATION.canesVenatici),
      { key: 'discovery', text: { fr: '13 octobre 1773 · Charles Messier', en: '13 October 1773 · Charles Messier' } },
    ],
    render: { kind: 'galaxy', morphology: 'grand-design', arms: 2, twist: 4.6, core: '#ffe0b8', arm: '#b8ccff', companion: true, dust: 1, viewElevationDeg: 70, seed: 33 },
    markers: [
      {
        anchor: 'companion',
        title: { fr: 'NGC 5195', en: 'NGC 5195' },
        text: { fr: 'La compagne qui a dessiné les bras', en: 'The companion that shaped the arms' },
        body: {
          fr: 'Plus petite, NGC 5195 est passée à travers le disque de M51 il y a quelques centaines de millions d’années. Sa gravité a provoqué les ondes qui dessinent les deux grands bras et déclenché une intense formation d’étoiles. Elle semble accrochée au bout d’un bras, mais se trouve un peu en arrière.',
          en: 'The smaller NGC 5195 passed through M51’s disk a few hundred million years ago. Its gravity raised the waves that draw the two great arms and triggered intense star formation. It seems hooked to the end of an arm but actually lies slightly behind.',
        },
      },
      {
        anchor: 'arm',
        title: { fr: 'Grand design', en: 'Grand design' },
        text: { fr: 'Deux bras nets, vus de face', en: 'Two crisp arms, seen face-on' },
        body: {
          fr: 'Une spirale « grand design » : deux bras nets et continus, loin des bras fragmentés de nombreuses galaxies. Lord Rosse l’a dessinée en 1845 avec son grand télescope : la première structure spirale jamais vue dans une « nébuleuse ».',
          en: 'A “grand-design” spiral: two crisp, continuous arms, unlike the patchy arms of many galaxies. Lord Rosse drew it in 1845 with his great telescope: the first spiral structure ever seen in a “nebula”.',
        },
      },
      {
        anchor: 'dust-lane',
        title: { fr: 'Bandes de poussière', en: 'Dust lanes' },
        text: { fr: 'Le long du bord intérieur des bras', en: 'Along the arms’ inner edges' },
        body: {
          fr: 'Sur le bord intérieur des bras, des bandes de poussière sombre marquent l’endroit où le gaz est comprimé. Juste après, de nouvelles étoiles s’allument, signalées par des nébuleuses roses d’hydrogène. Les bras se lisent ainsi : poussière, étoiles naissantes, puis étoiles plus âgées.',
          en: 'On the arms’ inner edges, dark dust lanes mark where gas is compressed. Just beyond, new stars light up, flagged by pink hydrogen nebulae. So the arms read: dust, newborn stars, then older stars.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Whirlpool Galaxy', 'Whirlpool_Galaxy')],
  },
  {
    id: 'sombrero', category: 'galaxies', name: { fr: 'Galaxie du Sombrero', en: 'Sombrero Galaxy' },
    kind: { fr: 'Spirale vue par la tranche · M104', en: 'Edge-on spiral · M104' },
    description: {
      fr: "Un bulbe lumineux énorme traversé par un anneau de poussière, que nous voyons presque par la tranche. Elle compte 1 200 à 2 000 amas globulaires, bien plus que la Voie lactée.",
      en: 'A huge bright bulge crossed by a ring of dust that we see almost edge-on. It holds 1,200 to 2,000 globular clusters, far more than the Milky Way.',
    },
    facts: [
      { key: 'type', text: { fr: 'SA(s)a (classement débattu)', en: 'SA(s)a (classification debated)' } },
      { key: 'distance', value: 31.1, unit: 'mly', digits: 1 },
      { key: 'diameter', value: 94900, unit: 'ly', digits: 0 },
      { key: 'mass', value: 8e11, unit: 'msun', sci: true },
      { key: 'blackHoleMass', value: 1e9, unit: 'msun' },
      { key: 'globularClusters', text: { fr: '1 200 à 2 000', en: '1,200 to 2,000' } },
      constellation(CONSTELLATION.virgo),
      { key: 'discovery', text: { fr: '1781 · Pierre Méchain', en: '1781 · Pierre Méchain' } },
    ],
    render: { kind: 'galaxy', morphology: 'sombrero', arms: 2, twist: 3, core: '#fff0d6', arm: '#e6d6c0', dust: 1, viewElevationDeg: 6, seed: 34 },
    markers: [
      {
        anchor: 'bulge',
        title: { fr: 'Bulbe', en: 'Bulge' },
        text: { fr: '1 200 à 2 000 amas globulaires autour', en: '1,200 to 2,000 globular clusters around it' },
        body: {
          fr: 'Son bulbe énorme et lumineux contient la plupart de ses étoiles. Autour gravitent 1 200 à 2 000 amas globulaires, de vieux essaims de centaines de milliers d’étoiles ; la Voie lactée n’en compte qu’environ 150. Des observations suggèrent qu’il s’agit d’une galaxie elliptique entourant un disque.',
          en: 'Its huge, bright bulge holds most of its stars. Around it orbit 1,200 to 2,000 globular clusters, old swarms of hundreds of thousands of stars; the Milky Way has about 150. Observations suggest an elliptical galaxy wrapped around a disk.',
        },
      },
      {
        anchor: 'dust-lane',
        title: { fr: 'Anneau de poussière', en: 'Dust ring' },
        text: { fr: 'Vu presque par la tranche', en: 'Seen almost edge-on' },
        body: {
          fr: 'Un anneau de poussière et de gaz froid entoure le bulbe ; nous le voyons à seulement 6° de la tranche, d’où cette silhouette de chapeau. C’est là que naissent les rares nouvelles étoiles de la galaxie. Le JWST l’a montré en 2024, plus grumeleux qu’attendu.',
          en: 'A ring of dust and cold gas circles the bulge; we see it only 6° from edge-on, hence the hat shape. It is where the galaxy’s few new stars form. JWST showed it in 2024, clumpier than expected.',
        },
      },
      {
        anchor: 'core',
        title: { fr: 'Trou noir central', en: 'Central black hole' },
        text: { fr: '≈ 1 milliard de masses solaires', en: '≈ 1 billion solar masses' },
        body: {
          fr: 'Le trou noir central pèse environ un milliard de masses solaires, l’un des plus massifs mesurés dans une galaxie proche. Il n’émet que faiblement : il est presque au repos.',
          en: 'The central black hole weighs about a billion solar masses, one of the most massive measured in a nearby galaxy. It shines only faintly: it is almost dormant.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Sombrero Galaxy', 'Sombrero_Galaxy')],
  },
  {
    id: 'large-magellanic-cloud', category: 'galaxies', name: { fr: 'Grand Nuage de Magellan', en: 'Large Magellanic Cloud' },
    kind: { fr: 'Galaxie naine satellite', en: 'Satellite dwarf galaxy' },
    description: {
      fr: "Une galaxie satellite de la nôtre, visible à l'œil nu depuis l'hémisphère Sud. Elle abrite la nébuleuse de la Tarentule, la région de formation d'étoiles la plus active du Groupe local, et la supernova SN 1987A.",
      en: 'A satellite of our galaxy, visible to the naked eye from the southern hemisphere. It hosts the Tarantula Nebula, the most active star-forming region in the Local Group, and supernova SN 1987A.',
    },
    facts: [
      { key: 'type', text: 'SB(s)m' },
      { key: 'distance', value: 163000, unit: 'ly', digits: 0 },
      { key: 'diameter', value: 32200, unit: 'ly', digits: 0 },
      { key: 'stars', text: { fr: '~ 20 milliards', en: '~ 20 billion' } },
      { key: 'mass', value: 1e10, unit: 'msun', sci: true, note: { fr: 'sans matière noire', en: 'without dark matter' } },
      { key: 'magnitude', text: { fr: '0,13', en: '0.13' } },
      constellation(CONSTELLATION.doradoMensa),
    ],
    render: { kind: 'galaxy', morphology: 'magellanic', arms: 1, twist: 1.2, core: '#fff1d8', arm: '#d6e2ff', dust: 0.4, viewElevationDeg: 58, seed: 35 },
    markers: [
      {
        anchor: 'tarantula',
        title: { fr: 'Nébuleuse de la Tarentule', en: 'Tarantula Nebula' },
        text: { fr: 'Formation d’étoiles la plus active du Groupe local', en: 'Most active star formation in the Local Group' },
        body: {
          fr: 'La Tarentule (30 Doradus) est la région de formation d’étoiles la plus active du Groupe local. En son centre, l’amas R136 abrite les étoiles les plus massives connues, dont R136a1, d’environ 200 masses solaires. La supernova SN 1987A a explosé non loin, visible à l’œil nu.',
          en: 'The Tarantula (30 Doradus) is the most active star-forming region in the Local Group. At its centre, the cluster R136 holds the most massive stars known, including R136a1 at about 200 solar masses. Supernova SN 1987A exploded nearby, visible to the naked eye.',
        },
      },
      {
        anchor: 'bar',
        title: { fr: 'Barre décentrée', en: 'Off-centre bar' },
        text: { fr: 'Typique des irrégulières magellaniques', en: 'Typical of Magellanic irregulars' },
        body: {
          fr: 'Une barre d’étoiles décentrée et un seul bras court : c’est le modèle des galaxies dites « magellaniques ». Sa forme a été tordue par la Voie lactée et par le Petit Nuage, auquel un pont de gaz le relie.',
          en: 'An off-centre bar of stars and a single short arm: the template of so-called “Magellanic” galaxies. Its shape has been twisted by the Milky Way and by the Small Cloud, to which a bridge of gas links it.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Large Magellanic Cloud', 'Large_Magellanic_Cloud')],
  },
  {
    id: 'ic-1101', category: 'galaxies', name: 'IC 1101',
    kind: { fr: 'Galaxie elliptique géante', en: 'Supergiant elliptical galaxy' },
    description: {
      fr: "L'une des plus grandes galaxies connues, au centre de l'amas Abell 2029. Sa lumière diffuse s'étale sur des centaines de milliers d'années-lumière, et son trou noir central serait l'un des plus massifs.",
      en: 'One of the largest galaxies known, at the centre of the Abell 2029 cluster. Its diffuse light spreads over hundreds of thousands of light-years, and its central black hole may be among the most massive.',
    },
    facts: [
      { key: 'type', text: { fr: 'cD (elliptique à lenticulaire)', en: 'cD (elliptical to lenticular)' } },
      { key: 'distance', value: 1.15, unit: 'gly', digits: 2 },
      { key: 'diameter', text: { fr: '403 000 à 553 000 a.l. (isophote)', en: '403,000 to 553,000 ly (isophotal)' } },
      { key: 'blackHoleMass', text: { fr: '40 à 100 milliards M☉ (selon la méthode)', en: '40 to 100 billion M☉ (method-dependent)' } },
      { key: 'host', text: 'Abell 2029' },
      constellation(CONSTELLATION.virgo),
      { key: 'discovery', text: { fr: '19 juin 1890 · Edward D. Swift', en: '19 June 1890 · Edward D. Swift' } },
    ],
    render: { kind: 'galaxy', morphology: 'elliptical', arms: 0, twist: 0, core: '#ffe6c4', arm: '#ffd9b0', dust: 0, viewElevationDeg: 22, seed: 36 },
    markers: [
      {
        anchor: 'halo',
        title: { fr: 'Halo diffus', en: 'Diffuse halo' },
        text: { fr: 'Lumière étalée sur des centaines de milliers d’al', en: 'Light spread over hundreds of thousands of ly' },
        body: {
          fr: 'Elliptique géante, elle n’a ni bras ni disque : ses étoiles, vieilles et rougeâtres, forment un nuage diffus. Ce halo s’étend sur des centaines de milliers d’années-lumière, jusqu’à se confondre avec la lumière de l’amas Abell 2029. Elle a sans doute grossi en avalant de nombreuses galaxies.',
          en: 'A giant elliptical with no arms and no disk: its old, reddish stars form a diffuse cloud. The halo spreads over hundreds of thousands of light-years, merging into the light of the Abell 2029 cluster. It probably grew by swallowing many galaxies.',
        },
      },
      {
        anchor: 'core',
        title: { fr: 'Trou noir central', en: 'Central black hole' },
        text: { fr: 'Supposé parmi les plus massifs', en: 'Thought to be among the most massive' },
        body: {
          fr: 'Son cœur est d’une luminosité inhabituellement plate, comme si des étoiles en avaient été chassées. Explication proposée : un trou noir central de plusieurs dizaines de milliards de soleils, qui aurait éjecté ces étoiles en fusionnant avec d’autres. Sa masse reste une estimation indirecte.',
          en: 'Its core is unusually flat in brightness, as if stars had been cleared out. A proposed explanation: a central black hole of tens of billions of Suns that ejected those stars while merging with others. Its mass remains an indirect estimate.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('IC 1101', 'IC_1101')],
  },
]

export const NEBULAE: SpaceObject[] = [
  {
    id: 'orion-nebula', category: 'nebulae', name: { fr: 'Nébuleuse d\'Orion', en: 'Orion Nebula' },
    kind: { fr: 'Pouponnière d\'étoiles · M42', en: 'Stellar nursery · M42' },
    description: {
      fr: "La région de formation d'étoiles massives la plus proche, visible à l'œil nu dans l'épée d'Orion. Le gaz est illuminé par les étoiles du Trapèze, dont les plus brillantes n'auraient que quelques centaines de milliers d'années.",
      en: 'The nearest region forming massive stars, visible to the naked eye in Orion\'s sword. Its gas is lit by the Trapezium stars, the brightest perhaps only a few hundred thousand years old.',
    },
    facts: [
      { key: 'type', text: { fr: 'Nébuleuse en émission et par réflexion', en: 'Emission and reflection nebula' } },
      { key: 'distance', value: 1267, unit: 'ly', digits: 0 },
      { key: 'size', value: 25, unit: 'ly', qualifier: '≈' },
      { key: 'mass', value: 2000, unit: 'msun', qualifier: '≈' },
      { key: 'stars', text: { fr: '≈ 2 800 (amas de la nébuleuse)', en: '≈ 2,800 (nebula cluster)' } },
      { key: 'magnitude', text: { fr: '4,0', en: '4.0' } },
      constellation(CONSTELLATION.orion),
    ],
    render: { kind: 'nebula', shape: 'emission', palette: ['#e2584a', '#4fb8c9', '#ffe0c2'], seed: 41 },
    markers: [
      {
        anchor: 'trapezium',
        title: { fr: 'Le Trapèze', en: 'The Trapezium' },
        text: { fr: 'Jeunes étoiles massives qui éclairent le gaz', en: 'Young massive stars lighting the gas' },
        body: {
          fr: 'Quatre étoiles brillantes groupées au cœur de la nébuleuse, jusqu’à une trentaine de masses solaires pour la plus grosse. Leur ultraviolet ionise le gaz, qui brille à son tour. Elles n’ont que quelques centaines de milliers d’années.',
          en: 'Four bright stars packed at the heart of the nebula, up to about thirty solar masses for the largest. Their ultraviolet light ionises the gas, which glows in turn. They are only a few hundred thousand years old.',
        },
      },
      {
        anchor: 'cavity',
        title: { fr: 'Cavité', en: 'Cavity' },
        text: { fr: 'Creusée vers nous par leur rayonnement', en: 'Blown open towards us by their light' },
        body: {
          fr: 'Le rayonnement et les vents du Trapèze ont creusé une cavité dans le nuage, ouverte de notre côté : nous regardons dans un bol de gaz éclairé de l’intérieur. Ses parois sont les parties les plus brillantes de la nébuleuse.',
          en: 'The Trapezium’s light and winds have carved a cavity in the cloud, open on our side: we look into a bowl of gas lit from within. Its walls are the brightest parts of the nebula.',
        },
      },
      {
        anchor: 'gas-wall',
        title: { fr: 'Nuage moléculaire', en: 'Molecular cloud' },
        text: { fr: 'Le mur de gaz froid, derrière', en: 'The wall of cold gas behind' },
        body: {
          fr: 'Derrière, le nuage moléculaire d’Orion, froid et sombre, contient de quoi former des milliers d’étoiles. De nouvelles étoiles et des disques protoplanétaires y naissent encore, visibles en infrarouge. La nébuleuse brillante n’en est que la surface tournée vers nous.',
          en: 'Behind it, the cold, dark Orion molecular cloud holds enough gas for thousands of stars. New stars and protoplanetary disks still form there, visible in infrared. The bright nebula is only its surface facing us.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Orion Nebula', 'Orion_Nebula')],
  },
  {
    id: 'crab-nebula', category: 'nebulae', name: { fr: 'Nébuleuse du Crabe', en: 'Crab Nebula' },
    kind: { fr: 'Rémanent de supernova · M1', en: 'Supernova remnant · M1' },
    description: {
      fr: "Les débris de la supernova de 1054, toujours en expansion à environ 1 500 km/s. Ses filaments orangés entourent une lueur bleutée, alimentée par le pulsar du Crabe en son centre.",
      en: 'The debris of the 1054 supernova, still expanding at about 1,500 km/s. Its orange filaments surround a bluish glow powered by the Crab Pulsar at its centre.',
    },
    facts: [
      { key: 'type', text: { fr: 'Rémanent de supernova, nébuleuse de vent de pulsar', en: 'Supernova remnant, pulsar wind nebula' } },
      { key: 'distance', value: 6500, unit: 'ly', digits: 0 },
      { key: 'size', value: 11, unit: 'ly' },
      { key: 'expansion', value: 1500, unit: 'kms' },
      { key: 'supernova', text: '1054' },
      constellation(CONSTELLATION.taurus),
      { key: 'discovery', text: { fr: '1731 · John Bevis', en: '1731 · John Bevis' } },
    ],
    render: { kind: 'nebula', shape: 'remnant', palette: ['#ff7a3a', '#6fa8ff', '#ffe4a8'], seed: 42 },
    markers: [
      {
        anchor: 'pulsar',
        title: { fr: 'Pulsar du Crabe', en: 'Crab Pulsar' },
        text: { fr: 'Le cœur de l’étoile, 30 tours par seconde', en: 'The star’s core, 30 turns a second' },
        body: {
          fr: 'Au centre, le pulsar du Crabe, une étoile à neutrons d’une vingtaine de kilomètres, tourne 30 fois par seconde. L’énergie qu’il perd en ralentissant alimente toute la nébuleuse. C’est l’un des rares pulsars qui clignotent même en lumière visible.',
          en: 'At the centre, the Crab Pulsar, a neutron star about twenty kilometres across, spins 30 times a second. The energy it loses as it slows powers the whole nebula. It is one of the few pulsars that blink even in visible light.',
        },
      },
      {
        anchor: 'filaments',
        title: { fr: 'Filaments', en: 'Filaments' },
        text: { fr: 'Débris de 1054, à ≈ 1 500 km/s', en: 'Debris from 1054, at ≈ 1,500 km/s' },
        body: {
          fr: 'Ces filaments orangés sont les débris de l’étoile qui a explosé en 1054, riches en hydrogène, hélium et éléments plus lourds. Ils s’éloignent à environ 1 500 km/s : la nébuleuse mesure aujourd’hui une dizaine d’années-lumière. En remontant leur mouvement, on retrouve à peu près la date de l’explosion.',
          en: 'These orange filaments are the debris of the star that exploded in 1054, rich in hydrogen, helium and heavier elements. They recede at about 1,500 km/s: the nebula is now some ten light-years across. Tracing their motion back gives roughly the date of the explosion.',
        },
      },
      {
        anchor: 'synchrotron',
        title: { fr: 'Lueur bleue', en: 'Blue glow' },
        text: { fr: 'Électrons du pulsar spiralant dans le champ', en: 'Pulsar electrons spiralling in the field' },
        body: {
          fr: 'La lueur bleutée vient d’électrons lancés par le pulsar, qui spiralent dans le champ magnétique : c’est le rayonnement synchrotron. Il couvre tout le spectre, des ondes radio aux rayons gamma. Sa forte polarisation l’a fait identifier dès les années 1950.',
          en: 'The bluish glow comes from electrons launched by the pulsar, spiralling in the magnetic field: synchrotron radiation. It spans the whole spectrum, from radio waves to gamma rays. Its strong polarisation identified it as early as the 1950s.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Crab Nebula', 'Crab_Nebula')],
  },
  {
    id: 'ring-nebula', category: 'nebulae', name: { fr: 'Nébuleuse de l\'Anneau', en: 'Ring Nebula' },
    kind: { fr: 'Nébuleuse planétaire · M57', en: 'Planetary nebula · M57' },
    description: {
      fr: "Les couches externes d'une étoile semblable au Soleil, éjectées en fin de vie il y a environ 1 600 ans. Au centre reste une naine blanche à 125 000 K, dont le rayonnement fait briller le gaz.",
      en: 'The outer layers of a Sun-like star, shed at the end of its life about 1,600 years ago. At the centre remains a 125,000 K white dwarf whose radiation makes the gas glow.',
    },
    facts: [
      { key: 'type', text: { fr: 'Nébuleuse planétaire', en: 'Planetary nebula' } },
      { key: 'distance', value: 2570, unit: 'ly', digits: 0 },
      { key: 'size', value: 1, unit: 'ly', qualifier: '≈' },
      { key: 'centralStar', text: { fr: 'Naine blanche, 125 000 K, ≈ 0,61 M☉', en: 'White dwarf, 125,000 K, ≈ 0.61 M☉' } },
      { key: 'age', value: 1610, unit: 'years', qualifier: '≈' },
      constellation(CONSTELLATION.lyra),
      { key: 'discovery', text: { fr: '1779 · Charles Messier', en: '1779 · Charles Messier' } },
    ],
    render: { kind: 'nebula', shape: 'ring', palette: ['#d9503f', '#3fc7b4', '#bfe8ff'], seed: 43 },
    markers: [
      {
        anchor: 'central-star',
        title: { fr: 'Naine blanche', en: 'White dwarf' },
        text: { fr: '≈ 125 000 K, elle fait briller le gaz', en: '≈ 125,000 K, it makes the gas glow' },
        body: {
          fr: 'Au centre, une naine blanche à environ 125 000 K, le cœur restant de l’étoile. Son ultraviolet ionise le gaz éjecté, qui émet ses couleurs : bleu-vert pour l’oxygène, rouge pour l’hydrogène et l’azote. Elle va s’éteindre lentement sur des milliards d’années.',
          en: 'At the centre, a white dwarf at about 125,000 K, the star’s remaining core. Its ultraviolet ionises the ejected gas, which emits its colours: blue-green for oxygen, red for hydrogen and nitrogen. It will slowly fade over billions of years.',
        },
      },
      {
        anchor: 'rim',
        title: { fr: 'Anneau', en: 'Ring' },
        text: { fr: 'Un tonneau de gaz vu dans son axe', en: 'A barrel of gas seen end-on' },
        body: {
          fr: 'L’anneau n’est pas un cercle plat : c’est un tonneau de gaz, plus dense sur ses flancs, que nous voyons dans l’axe. Les images du JWST de 2023 y montrent environ 20 000 globules denses. Il mesure environ une année-lumière.',
          en: 'The ring is not a flat circle: it is a barrel of gas, denser at its sides, seen end-on. JWST’s 2023 images show about 20,000 dense globules in it. It is about a light-year across.',
        },
      },
      {
        anchor: 'halo',
        title: { fr: 'Halo externe', en: 'Outer halo' },
        text: { fr: 'Des boucles plus anciennes et plus pâles', en: 'Older, fainter loops' },
        body: {
          fr: 'Autour de l’anneau, des boucles plus pâles sont les restes d’éjections plus anciennes, quand l’étoile commençait à perdre ses couches externes. Le JWST y a vu des arcs concentriques, peut-être sculptés par une étoile compagne.',
          en: 'Around the ring, fainter loops are the remains of older ejections, when the star began shedding its outer layers. JWST saw concentric arcs there, perhaps shaped by a companion star.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Ring Nebula', 'Ring_Nebula')],
  },
  {
    id: 'pillars-of-creation', category: 'nebulae', name: { fr: 'Piliers de la Création', en: 'Pillars of Creation' },
    kind: { fr: 'Colonnes de gaz · nébuleuse de l\'Aigle', en: 'Gas columns · Eagle Nebula' },
    description: {
      fr: "Des colonnes de gaz et de poussière où naissent des étoiles, rongées par le rayonnement d'étoiles massives voisines. Rendues célèbres par Hubble en 1995, puis photographiées par le JWST en 2022.",
      en: 'Columns of gas and dust where stars are forming, eroded by the light of nearby massive stars. Made famous by Hubble in 1995, then imaged by JWST in 2022.',
    },
    facts: [
      { key: 'distance', text: { fr: '6 500 à 7 000 a.l.', en: '6,500 to 7,000 ly' } },
      { key: 'size', value: 4, unit: 'ly', qualifier: '≈', note: { fr: 'pilier de gauche', en: 'leftmost pillar' } },
      { key: 'host', text: { fr: 'Nébuleuse de l\'Aigle (M16)', en: 'Eagle Nebula (M16)' } },
      constellation(CONSTELLATION.serpens),
      { key: 'images', text: { fr: 'Hubble 1995 · JWST 2022', en: 'Hubble 1995 · JWST 2022' } },
    ],
    render: { kind: 'nebula', shape: 'pillars', palette: ['#c98a52', '#5aa5b8', '#ffe9c4'], seed: 44 },
    markers: [
      {
        anchor: 'pillar',
        title: { fr: 'Pilier', en: 'Pillar' },
        text: { fr: 'Le plus grand mesure ≈ 4 années-lumière', en: 'The tallest is ≈ 4 light-years high' },
        body: {
          fr: 'Le plus grand pilier mesure environ 4 années-lumière. Ces colonnes de gaz et de poussière froids, plus denses que leur entourage, résistent à l’érosion. À leur sommet, des cocons de gaz abritent des étoiles en formation, que le JWST voit en infrarouge.',
          en: 'The tallest pillar is about 4 light-years high. These columns of cold gas and dust, denser than their surroundings, resist erosion. At their tips, gas cocoons hide forming stars that JWST sees in infrared.',
        },
      },
      {
        anchor: 'massive-stars',
        title: { fr: 'Étoiles massives', en: 'Massive stars' },
        text: { fr: 'Leur rayonnement ronge les colonnes', en: 'Their light erodes the columns' },
        body: {
          fr: 'Au-dessus, les étoiles massives de l’amas NGC 6611 illuminent et rongent les piliers par leur ultraviolet et leurs vents : le gaz s’évapore de la face éclairée. Les piliers devraient disparaître d’ici quelques centaines de milliers d’années.',
          en: 'Above, the massive stars of the cluster NGC 6611 light and erode the pillars with their ultraviolet and winds: gas boils off the lit faces. The pillars should vanish within a few hundred thousand years.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Pillars of Creation', 'Pillars_of_Creation')],
  },
  {
    id: 'helix-nebula', category: 'nebulae', name: { fr: 'Nébuleuse de l\'Hélice', en: 'Helix Nebula' },
    kind: { fr: 'Nébuleuse planétaire · NGC 7293', en: 'Planetary nebula · NGC 7293' },
    description: {
      fr: "L'une des nébuleuses planétaires les plus proches, surnommée « l'Œil de Dieu ». Son anneau est parsemé de milliers de nœuds cométaires, des globules de gaz froid à queue rayonnante.",
      en: 'One of the nearest planetary nebulae, nicknamed the "Eye of God". Its ring is scattered with thousands of cometary knots, cold gas globules with radial tails.',
    },
    facts: [
      { key: 'type', text: { fr: 'Nébuleuse planétaire', en: 'Planetary nebula' } },
      { key: 'distance', value: 655, unit: 'ly', digits: 0 },
      { key: 'size', value: 2.5, unit: 'ly', qualifier: '≈' },
      { key: 'centralStar', text: { fr: 'Naine blanche, 120 000 K', en: 'White dwarf, 120,000 K' } },
      { key: 'age', value: 10600, unit: 'years', qualifier: '≈' },
      constellation(CONSTELLATION.aquarius),
      { key: 'discovery', text: { fr: 'avant 1824 · Karl Ludwig Harding', en: 'before 1824 · Karl Ludwig Harding' } },
    ],
    render: { kind: 'nebula', shape: 'helix', palette: ['#e0563c', '#43b6c4', '#fff1d6'], seed: 45 },
    markers: [
      {
        anchor: 'central-star',
        title: { fr: 'Naine blanche', en: 'White dwarf' },
        text: { fr: 'Le cœur restant de l’étoile', en: 'What remains of the star’s core' },
        body: {
          fr: 'Une naine blanche, le cœur de l’étoile semblable au Soleil qui a éjecté ces couches. Très chaude, autour de 100 000 K, elle fait briller le gaz alentour. Le Soleil connaîtra une fin semblable dans environ 5 milliards d’années.',
          en: 'A white dwarf, the core of the Sun-like star that shed these layers. Very hot, around 100,000 K, it makes the surrounding gas glow. The Sun will meet a similar end in about 5 billion years.',
        },
      },
      {
        anchor: 'knots',
        title: { fr: 'Nœuds cométaires', en: 'Cometary knots' },
        text: { fr: 'Des milliers de globules froids à queue', en: 'Thousands of cold, tailed globules' },
        body: {
          fr: 'Le bord intérieur de l’anneau est parsemé de milliers de nœuds cométaires : des globules de gaz froid, chacun de la taille du Système solaire, avec une queue tournée à l’opposé de l’étoile. Ils naissent quand le vent rapide de l’étoile percute le gaz plus lent éjecté avant.',
          en: 'The ring’s inner edge is studded with thousands of cometary knots: globules of cold gas, each the size of the Solar System, with tails pointing away from the star. They form where the star’s fast wind hits the slower gas ejected earlier.',
        },
      },
      {
        anchor: 'rim',
        title: { fr: 'L’Œil de Dieu', en: 'The Eye of God' },
        text: { fr: 'Anneau à ≈ 650 années-lumière de nous', en: 'A ring ≈ 650 light-years away' },
        body: {
          fr: 'À environ 650 années-lumière, c’est l’une des nébuleuses planétaires les plus proches, et l’une des plus grandes dans le ciel : près de la moitié de la pleine Lune. Sa forme évoque un œil, d’où son surnom. Elle s’est formée il y a une dizaine de milliers d’années.',
          en: 'At about 650 light-years, it is one of the nearest planetary nebulae and one of the largest in the sky: almost half the full Moon. Its shape recalls an eye, hence its nickname. It formed some ten thousand years ago.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Helix Nebula', 'Helix_Nebula')],
  },
  {
    id: 'carina-nebula', category: 'nebulae', name: { fr: 'Nébuleuse de la Carène', en: 'Carina Nebula' },
    kind: { fr: 'Nébuleuse diffuse géante', en: 'Giant diffuse nebula' },
    description: {
      fr: "Une immense région de gaz et de poussière qui abrite certaines des étoiles les plus massives connues, dont Eta Carinae, une hypergéante instable. Elle s'étend sur environ 460 années-lumière et brille à l'œil nu dans le ciel austral.",
      en: 'A huge region of gas and dust hosting some of the most massive stars known, including Eta Carinae, an unstable hypergiant. It spans about 460 light-years and shines to the naked eye in the southern sky.',
    },
    facts: [
      { key: 'type', text: { fr: 'Nébuleuse diffuse', en: 'Diffuse nebula' } },
      { key: 'distance', value: 8500, unit: 'ly', qualifier: '~' },
      { key: 'size', value: 230, unit: 'ly', qualifier: '~', note: { fr: 'rayon', en: 'radius' } },
      { key: 'notableStars', text: 'Eta Carinae, HD 93129A' },
      { key: 'magnitude', text: { fr: '1,0', en: '1.0' } },
      constellation(CONSTELLATION.carina),
      { key: 'discovery', text: { fr: '1752 · Nicolas-Louis de Lacaille', en: '1752 · Nicolas-Louis de Lacaille' } },
    ],
    render: { kind: 'nebula', shape: 'complex', palette: ['#d9643c', '#3d8fb0', '#ffd7a8'], seed: 46 },
    markers: [
      {
        anchor: 'eta-carinae',
        title: { fr: 'Eta Carinae', en: 'Eta Carinae' },
        text: { fr: 'Hypergéante instable d’≈ 100 masses solaires', en: 'Unstable hypergiant of ≈ 100 solar masses' },
        body: {
          fr: 'Un couple d’étoiles dont la principale, une hypergéante d’environ 100 masses solaires, est l’une des plus massives connues. En 1843, une « grande éruption » en a fait la deuxième étoile la plus brillante du ciel et a éjecté la nébuleuse de l’Homoncule. Elle finira sans doute en supernova.',
          en: 'A pair of stars whose primary, a hypergiant of about 100 solar masses, is one of the most massive known. In 1843 a “Great Eruption” made it the second-brightest star in the sky and threw off the Homunculus Nebula. It will probably end as a supernova.',
        },
      },
      {
        anchor: 'dust-lane',
        title: { fr: 'Bandes sombres', en: 'Dark lanes' },
        text: { fr: 'De la poussière devant le gaz brillant', en: 'Dust in front of the glowing gas' },
        body: {
          fr: 'Des bandes de poussière sombre traversent le gaz brillant et cachent les étoiles placées derrière. Ces nuages denses sont aussi des berceaux d’étoiles. En infrarouge, le JWST voit à travers et y révèle des centaines d’étoiles en formation.',
          en: 'Dark dust lanes cross the glowing gas and hide the stars behind. These dense clouds are also stellar nurseries. In infrared, JWST sees through them and reveals hundreds of forming stars.',
        },
      },
    ],
    appearance: 'impression',
    sources: [wikipedia('Carina Nebula', 'Carina_Nebula')],
  },
]
