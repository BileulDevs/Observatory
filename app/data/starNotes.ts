import type { Localized, Source } from '~/types/systems'
import { wikipedia } from './objects/common'

/**
 * Hand-written notes for well-known stars, keyed by Hipparcos number: other names, measured radius and mass
 * (from the cited Wikipedia article, which gives the original papers), a corrected spectral type where the HYG
 * catalogue's is outdated, and a short description. Every other star gets values computed from its catalogue
 * entry, marked as such on screen.
 */
export interface StarNote {
  aka?: Localized
  /** Solar radii / solar masses, as published (≈ for model-dependent values). */
  radius?: number
  mass?: number
  spect?: string
  description: Localized
  source: Source
}

const w = (title: string, path = title.replace(/ /g, '_')) => wikipedia(title, path)

export const STAR_NOTES: Record<number, StarNote> = {
  32349: {
    aka: { fr: 'α Canis Majoris, l\'Étoile du Chien', en: 'α Canis Majoris, the Dog Star' }, radius: 1.71, mass: 2.06,
    description: {
      fr: "L'étoile la plus brillante du ciel nocturne, surtout parce qu'elle est proche : 8,6 années-lumière. Elle tourne autour d'une compagne invisible à l'œil, Sirius B, la naine blanche la plus proche du Soleil.",
      en: 'The brightest star in the night sky, mostly because it is close: 8.6 light-years. It orbits with a companion invisible to the eye, Sirius B, the nearest white dwarf to the Sun.',
    },
    source: w('Sirius'),
  },
  30438: {
    aka: { fr: 'α Carinae', en: 'α Carinae' }, radius: 71, mass: 8, spect: 'A9 II',
    description: {
      fr: "Deuxième étoile la plus brillante du ciel, une géante lumineuse blanc-jaune environ 10 000 fois plus lumineuse que le Soleil. Les sondes spatiales s'en servent souvent de repère pour s'orienter.",
      en: 'The second-brightest star in the sky, a white-yellow bright giant about 10,000 times as luminous as the Sun. Spacecraft often use it as a reference to orient themselves.',
    },
    source: w('Canopus'),
  },
  69673: {
    aka: { fr: 'α Boötis', en: 'α Boötis' }, radius: 25.4, mass: 1.08, spect: 'K1.5 III',
    description: {
      fr: "Géante orange, l'étoile la plus brillante de l'hémisphère céleste nord. C'est une vieille étoile qui traverse le disque de la Galaxie à grande vitesse : sa position dans le ciel change d'un degré tous les 800 ans environ.",
      en: 'An orange giant, the brightest star of the northern celestial hemisphere. An old star crossing the Galaxy\'s disk at high speed: its position in the sky shifts by a degree about every 800 years.',
    },
    source: w('Arcturus'),
  },
  91262: {
    aka: { fr: 'α Lyrae', en: 'α Lyrae' }, radius: 2.36, mass: 2.1,
    description: {
      fr: "Étoile de référence de l'échelle des magnitudes. Elle tourne si vite sur elle-même que ses pôles sont plus chauds que son équateur, et elle est entourée d'un disque de poussières. Elle était l'étoile polaire il y a 14 000 ans et le redeviendra vers l'an 13 700.",
      en: 'The reference star of the magnitude scale. It spins so fast that its poles are hotter than its equator, and it is surrounded by a dust disk. It was the pole star 14,000 years ago and will be again around the year 13,700.',
    },
    source: w('Vega'),
  },
  24608: {
    aka: { fr: 'α Aurigae', en: 'α Aurigae' }, radius: 11.98, mass: 2.57, spect: 'K0 III + G1 III',
    description: {
      fr: "Une seule étoile à l'œil, en réalité deux géantes jaunes qui tournent l'une autour de l'autre en 104 jours, accompagnées d'une paire de naines rouges plus éloignée. Rayon et masse donnés pour la plus grosse des deux géantes.",
      en: 'A single star to the eye, in fact two yellow giants orbiting each other every 104 days, with a more distant pair of red dwarfs. Radius and mass given for the larger giant.',
    },
    source: w('Capella'),
  },
  24436: {
    aka: { fr: 'β Orionis', en: 'β Orionis' }, radius: 79, mass: 21,
    description: {
      fr: "Supergéante bleue, le pied d'Orion. Des dizaines de milliers de fois plus lumineuse que le Soleil, elle brûle son combustible très vite et finira probablement en supernova. Sa distance reste incertaine (de 700 à 900 années-lumière selon les mesures).",
      en: 'A blue supergiant, Orion\'s foot. Tens of thousands of times as luminous as the Sun, it burns through its fuel fast and will probably end as a supernova. Its distance is still uncertain (700 to 900 light-years depending on the measurement).',
    },
    source: w('Rigel'),
  },
  37279: {
    aka: { fr: 'α Canis Minoris', en: 'α Canis Minoris' }, radius: 2.05, mass: 1.5,
    description: {
      fr: "Une des étoiles les plus proches, à 11,5 années-lumière. Elle commence à quitter la séquence principale et a, comme Sirius, une naine blanche pour compagne.",
      en: 'One of the nearest stars, 11.5 light-years away. It is starting to leave the main sequence and, like Sirius, has a white dwarf companion.',
    },
    source: w('Procyon'),
  },
  27989: {
    aka: { fr: 'α Orionis', en: 'α Orionis' }, radius: 764, mass: 18, spect: 'M1–M2 Ia-ab',
    description: {
      fr: "Supergéante rouge, l'épaule d'Orion : placée au centre du Système solaire, elle engloberait l'orbite de Mars. Sa « Grande Baisse » d'éclat fin 2019 venait d'un nuage de poussière qu'elle a éjecté. Elle explosera en supernova, mais probablement pas avant des dizaines de milliers d'années.",
      en: "A red supergiant, Orion's shoulder: at the centre of the Solar System it would swallow the orbit of Mars. Its \"Great Dimming\" in late 2019 came from a dust cloud it ejected. It will explode as a supernova, but probably not for tens of thousands of years.",
    },
    source: w('Betelgeuse'),
  },
  7588: {
    aka: { fr: 'α Eridani', en: 'α Eridani' }, radius: 9.2, mass: 6.7,
    description: {
      fr: "L'étoile la moins sphérique connue : elle tourne si vite que son diamètre à l'équateur dépasse de plus de 50 % celui d'un pôle à l'autre. Le rayon donné est une moyenne.",
      en: 'The least spherical star known: it spins so fast that its equatorial diameter exceeds its polar one by more than 50%. The radius given is an average.',
    },
    source: w('Achernar'),
  },
  97649: {
    aka: { fr: 'α Aquilae', en: 'α Aquilae' }, radius: 1.79, mass: 1.86,
    description: {
      fr: "Proche voisine à 17 années-lumière, elle fait un tour sur elle-même en moins de 9 heures, ce qui l'aplatit nettement. En 2007, ce fut la première étoile de la séquence principale dont on a obtenu une image de la surface.",
      en: 'A close neighbour 17 light-years away, it turns once in under 9 hours, which visibly flattens it. In 2007 it became the first main-sequence star whose surface was imaged.',
    },
    source: w('Altair'),
  },
  21421: {
    aka: { fr: 'α Tauri, l\'Œil du Taureau', en: 'α Tauri, the Eye of the Bull' }, radius: 45.1, mass: 1.16,
    description: {
      fr: "Géante orange qui semble faire partie de l'amas des Hyades, mais se trouve en fait deux fois plus près de nous. La sonde Pioneer 10 file dans sa direction et passera à proximité dans environ deux millions d'années.",
      en: 'An orange giant that seems to belong to the Hyades cluster but is in fact twice as close to us. The Pioneer 10 probe is heading its way and will pass near it in about two million years.',
    },
    source: w('Aldebaran'),
  },
  80763: {
    aka: { fr: 'α Scorpii, le cœur du Scorpion', en: 'α Scorpii, the heart of the Scorpion' }, radius: 680, mass: 12,
    description: {
      fr: "Supergéante rouge dont le nom signifie « rival de Mars » : sa couleur rappelle celle de la planète, qui passe souvent près d'elle dans le ciel. Elle a une compagne bleue plus petite, Antarès B.",
      en: 'A red supergiant whose name means "rival of Mars": its colour recalls the planet, which often passes near it in the sky. It has a smaller blue companion, Antares B.',
    },
    source: w('Antares'),
  },
  65474: {
    aka: { fr: 'α Virginis', en: 'α Virginis' }, radius: 7.47, mass: 11.43,
    description: {
      fr: "Deux étoiles bleues massives si proches qu'elles se déforment mutuellement en ovale, et qui font le tour l'une de l'autre en quatre jours. Valeurs données pour la principale.",
      en: 'Two massive blue stars so close that they stretch each other into ovals, orbiting every four days. Values given for the primary.',
    },
    source: w('Spica'),
  },
  37826: {
    aka: { fr: 'β Geminorum', en: 'β Geminorum' }, radius: 9.06, mass: 1.91, spect: 'K0 III',
    description: {
      fr: "Géante orange, la plus proche des géantes à 34 années-lumière. Une planète géante, Thestias, tourne autour d'elle.",
      en: 'An orange giant, the nearest giant star at 34 light-years. A giant planet, Thestias, orbits it.',
    },
    source: w('Pollux (star)', 'Pollux_(star)'),
  },
  113368: {
    aka: { fr: 'α Piscis Austrini', en: 'α Piscis Austrini' }, radius: 1.84, mass: 1.92,
    description: {
      fr: "Jeune étoile blanche entourée d'un large anneau de débris, photographié par Hubble puis par le télescope James Webb.",
      en: 'A young white star surrounded by a wide debris ring, imaged by Hubble and then by the James Webb telescope.',
    },
    source: w('Fomalhaut'),
  },
  102098: {
    aka: { fr: 'α Cygni', en: 'α Cygni' }, radius: 203, mass: 19,
    description: {
      fr: "Supergéante blanche parmi les étoiles les plus lumineuses visibles à l'œil nu. Sa distance est mal connue (de 1 400 à 2 600 années-lumière selon les estimations), donc aussi sa luminosité réelle.",
      en: 'A white supergiant among the most luminous stars visible to the naked eye. Its distance is poorly known (1,400 to 2,600 light-years depending on the estimate), and so is its true luminosity.',
    },
    source: w('Deneb'),
  },
  49669: {
    aka: { fr: 'α Leonis, le cœur du Lion', en: 'α Leonis, the heart of the Lion' }, radius: 4.35, mass: 3.8, spect: 'B8 IVn',
    description: {
      fr: "Elle tourne presque à la vitesse où elle se disloquerait, ce qui la rend très aplatie. Proche de l'écliptique, elle est régulièrement cachée par la Lune.",
      en: 'It spins almost fast enough to tear itself apart, which flattens it strongly. Close to the ecliptic, it is regularly hidden by the Moon.',
    },
    source: w('Regulus'),
  },
  36850: {
    aka: { fr: 'α Geminorum', en: 'α Geminorum' }, radius: 2.4, mass: 2.76,
    description: {
      fr: "Un point lumineux qui cache six étoiles : trois couples d'étoiles serrées qui tournent ensemble. Valeurs données pour la plus brillante.",
      en: 'A point of light hiding six stars: three tight pairs orbiting together. Values given for the brightest.',
    },
    source: w('Castor (star)', 'Castor_(star)'),
  },
  11767: {
    aka: { fr: 'α Ursae Minoris, l\'étoile polaire', en: 'α Ursae Minoris, the North Star' }, radius: 37.5, mass: 5.4, spect: 'F7 Ib',
    description: {
      fr: "À moins d'un degré du pôle Nord céleste, elle semble immobile pendant que le ciel tourne. C'est aussi une céphéide, une étoile dont l'éclat varie régulièrement, ici en quatre jours.",
      en: 'Less than a degree from the north celestial pole, it seems still while the sky turns. It is also a Cepheid, a star whose brightness varies regularly, here every four days.',
    },
    source: w('Polaris'),
  },
  25336: {
    aka: { fr: 'γ Orionis', en: 'γ Orionis' }, radius: 5.75, mass: 7.7,
    description: {
      fr: "Géante bleue, l'autre épaule d'Orion. Bien plus proche que les étoiles du Baudrier : la figure d'Orion mêle des étoiles à 250 et à près de 2 000 années-lumière.",
      en: "A blue giant, Orion's other shoulder. Far closer than the Belt stars: Orion's figure mixes stars at 250 and at nearly 2,000 light-years.",
    },
    source: w('Bellatrix'),
  },
  26311: {
    aka: { fr: 'ε Orionis', en: 'ε Orionis' }, radius: 42, mass: 40,
    description: {
      fr: "L'étoile centrale du Baudrier d'Orion, une supergéante bleue parmi les plus lumineuses de la Galaxie. Sa distance est très incertaine, et avec elle sa taille et sa masse.",
      en: "The middle star of Orion's Belt, a blue supergiant among the most luminous in the Galaxy. Its distance is very uncertain, and with it its size and mass.",
    },
    source: w('Alnilam'),
  },
  62434: {
    aka: { fr: 'β Crucis', en: 'β Crucis' }, radius: 8.4, mass: 16,
    description: {
      fr: "Géante bleue de la Croix du Sud, une étoile variable qui pulse légèrement en quelques heures.",
      en: 'A blue giant of the Southern Cross, a variable star that pulses slightly over a few hours.',
    },
    source: w('Beta Crucis'),
  },
  54061: {
    aka: { fr: 'α Ursae Majoris', en: 'α Ursae Majoris' }, radius: 30, mass: 4.25, spect: 'K0 III',
    description: {
      fr: "Géante orange au bord de la « casserole » de la Grande Ourse. Avec Merak, elle pointe vers l'étoile polaire. Contrairement à la plupart des étoiles du dessin, elle ne fait pas partie du groupe qui se déplace ensemble dans l'espace.",
      en: "An orange giant at the edge of the Big Dipper's bowl. With Merak it points to the North Star. Unlike most of the figure's stars, it does not belong to the group moving together through space.",
    },
    source: w('Dubhe'),
  },
  65378: {
    aka: { fr: 'ζ Ursae Majoris', en: 'ζ Ursae Majoris' },
    description: {
      fr: "Avec sa voisine Alcor, un test de vue traditionnel. Au télescope, Mizar elle-même se dédouble : ce fut la première étoile double découverte au télescope (vers 1617), puis la première binaire spectroscopique (1889).",
      en: 'With its neighbour Alcor, a traditional eyesight test. Through a telescope Mizar itself splits in two: the first double star found with a telescope (around 1617), then the first spectroscopic binary (1889).',
    },
    source: w('Mizar'),
  },
  14576: {
    aka: { fr: 'β Persei, l\'étoile du Démon', en: 'β Persei, the Demon Star' },
    description: {
      fr: "Binaire à éclipses : toutes les 2 jours et 21 heures, l'étoile la plus pâle passe devant la plus brillante et l'éclat chute pendant une dizaine d'heures, assez pour se voir à l'œil nu.",
      en: 'An eclipsing binary: every 2 days and 21 hours the fainter star passes in front of the brighter one and the light drops for about ten hours, enough to see with the naked eye.',
    },
    source: w('Algol'),
  },
  10826: {
    aka: { fr: 'ο Ceti, la Merveilleuse', en: 'ο Ceti, the Wonderful' },
    description: {
      fr: "Géante rouge pulsante, prototype des variables à longue période : en 332 jours environ, elle passe de bien visible à invisible à l'œil nu. Elle laisse derrière elle une traînée de gaz longue de 13 années-lumière.",
      en: 'A pulsating red giant, the prototype of long-period variables: over about 332 days it goes from easily visible to invisible to the naked eye. It trails a wake of gas 13 light-years long.',
    },
    source: w('Mira'),
  },
  95947: {
    aka: { fr: 'β Cygni', en: 'β Cygni' },
    description: {
      fr: "Une des plus belles doubles du ciel au télescope : une étoile dorée et une étoile bleue. Les mesures du satellite Gaia suggèrent qu'elles ne sont peut-être pas liées, seulement alignées.",
      en: 'One of the finest doubles in the sky through a telescope: a golden star and a blue one. Gaia measurements suggest they may not be bound, only aligned.',
    },
    source: w('Albireo'),
  },
  68756: {
    aka: { fr: 'α Draconis', en: 'α Draconis' },
    description: {
      fr: "L'étoile polaire de l'époque des pyramides d'Égypte, vers 2 800 avant notre ère. La précession de l'axe terrestre a depuis déplacé le pôle vers l'étoile polaire actuelle.",
      en: "The pole star in the age of the Egyptian pyramids, around 2800 BC. The precession of Earth's axis has since moved the pole towards today's North Star.",
    },
    source: w('Thuban'),
  },
}
