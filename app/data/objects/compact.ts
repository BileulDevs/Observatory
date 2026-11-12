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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'shadow',
        title: { fr: 'Ombre', en: 'Shadow' },
        text: { fr: 'Là où la lumière ne ressort plus ; imagée en 2022', en: 'Where light no longer escapes; imaged in 2022' },
        body: {
          fr: 'La région sombre d’où aucun rayon ne nous parvient : la lumière qui y passe tombe dans l’horizon. Elle paraît environ 2,6 fois plus grande que l’horizon lui-même, car la gravité courbe les rayons tout autour. L’Event Horizon Telescope l’a photographiée en 2022 avec un réseau de radiotélescopes grand comme la Terre.',
          en: 'The dark region from which no ray reaches us: light passing there falls into the horizon. It looks about 2.6 times larger than the horizon itself, because gravity bends the rays around it. The Event Horizon Telescope imaged it in 2022 with an Earth-sized array of radio telescopes.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Flot d\'accrétion', en: 'Accretion flow' },
        text: { fr: 'Très ténu : Sgr A* n\'avale presque rien', en: 'Very faint: Sgr A* swallows almost nothing' },
        body: {
          fr: 'Sgr A* reçoit très peu de gaz : il brille environ un milliard de fois moins que le maximum théorique pour sa masse. Le gaz chaud forme un flot épais et ténu plutôt qu’un disque brillant. Plusieurs fois par jour, des sursauts infrarouges et X trahissent des bulles de gaz chauffées près de l’horizon.',
          en: 'Sgr A* receives very little gas: it shines about a billion times below the theoretical maximum for its mass. The hot gas forms a thick, tenuous flow rather than a bright disk. Several times a day, infrared and X-ray flares betray blobs of gas heated close to the horizon.',
        },
      },
      {
        anchor: 'lensed-arc',
        title: { fr: 'Lentille gravitationnelle', en: 'Gravitational lensing' },
        text: { fr: 'L\'arrière du disque, courbé au-dessus du trou', en: 'The far side of the disk, bent over the hole' },
        body: {
          fr: 'La gravité courbe la lumière : la partie du disque située derrière le trou noir nous apparaît relevée au-dessus de l’ombre, et une autre image passe en dessous. D’où la silhouette en anneau surmonté d’un arc. Ici, le trajet de chaque rayon est calculé dans l’espace-temps d’un trou noir sans rotation.',
          en: 'Gravity bends light: the part of the disk behind the hole appears lifted above the shadow, and another image passes underneath. Hence the ring topped with an arc. Here every ray is traced through the spacetime of a non-rotating black hole.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'photon-ring',
        title: { fr: 'Anneau de photons', en: 'Photon ring' },
        text: { fr: 'L\'anneau de la première photo de trou noir (2019)', en: 'The ring in the first black hole photo (2019)' },
        body: {
          fr: 'Les photons qui frôlent le trou noir peuvent en faire le tour avant de s’échapper : ils dessinent un anneau fin au bord de l’ombre. L’image de 2019 montre un anneau de 42 microsecondes d’arc, la taille d’un beignet posé sur la Lune vu depuis la Terre. Sa taille a confirmé une masse d’environ 6,5 milliards de soleils.',
          en: 'Photons grazing the hole can circle it before escaping: they draw a thin ring at the edge of the shadow. The 2019 image shows a ring 42 microarcseconds across, a doughnut on the Moon seen from Earth. Its size confirmed a mass of about 6.5 billion Suns.',
        },
      },
      {
        anchor: 'jet',
        title: { fr: 'Jet relativiste', en: 'Relativistic jet' },
        text: { fr: 'Long d\'au moins 4 900 années-lumière', en: 'At least 4,900 light-years long' },
        body: {
          fr: 'Un jet de particules lancé presque à la vitesse de la lumière le long de l’axe de rotation, sans doute par le champ magnétique du disque. Heber Curtis l’a remarqué dès 1918 comme un « rayon droit ». Certains de ses nœuds semblent aller plus vite que la lumière : une illusion due à leur vitesse et à leur direction.',
          en: 'A jet of particles launched at nearly the speed of light along the spin axis, probably by the disk’s magnetic field. Heber Curtis noticed it as early as 1918 as a “straight ray”. Some of its knots seem to move faster than light: an illusion caused by their speed and direction.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Disque d\'accrétion', en: 'Accretion disk' },
        text: { fr: 'Gaz surchauffé qui spirale vers l’horizon', en: 'Superheated gas spiralling towards the horizon' },
        body: {
          fr: 'Du gaz chauffé à des milliards de degrés tourne autour du trou noir avant d’y tomber. Il émet surtout en ondes radio, que l’EHT a captées à 1,3 mm de longueur d’onde. Le côté qui vient vers nous paraît plus brillant : l’effet Doppler relativiste renforce la lumière émise dans notre direction.',
          en: 'Gas heated to billions of degrees orbits the hole before falling in. It shines mostly in radio waves, which the EHT captured at a wavelength of 1.3 mm. The side coming towards us looks brighter: relativistic Doppler boosting strengthens light emitted in our direction.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'shadow',
        title: { fr: 'Horizon géant', en: 'Giant horizon' },
        text: { fr: 'Rayon ≈ 800 fois la distance Terre–Soleil', en: 'Radius ≈ 800 times the Earth–Sun distance' },
        body: {
          fr: 'Avec environ 40 milliards de masses solaires (66 milliards selon une estimation antérieure à 2019), son horizon aurait un rayon d’environ 800 fois la distance Terre–Soleil : il engloberait le Système solaire bien au-delà de Neptune. Cette masse est déduite de la vitesse du gaz autour du trou noir, mesurée dans le spectre du quasar ; l’incertitude reste grande.',
          en: 'At about 40 billion solar masses (66 billion in an estimate predating 2019), its horizon would have a radius of about 800 times the Earth–Sun distance, enclosing the Solar System far beyond Neptune. The mass comes from the speed of the gas around the hole, measured in the quasar’s spectrum; the uncertainty is large.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Disque de quasar', en: 'Quasar disk' },
        text: { fr: '≈ 140 000 milliards de fois l’éclat du Soleil', en: '≈ 140 trillion times the Sun’s brightness' },
        body: {
          fr: 'Le gaz qui tombe s’échauffe par frottement en spiralant et devient le quasar, environ 140 000 milliards de fois plus lumineux que le Soleil. Cette lumière est partie il y a 10,8 milliards d’années. Elle éclipse complètement les étoiles de la galaxie qui l’abrite.',
          en: 'Infalling gas heats up by friction as it spirals in and becomes the quasar, about 140 trillion times brighter than the Sun. This light set out 10.8 billion years ago. It completely outshines the stars of its host galaxy.',
        },
      },
      {
        anchor: 'jet',
        title: { fr: 'Jet', en: 'Jet' },
        text: { fr: 'Matière éjectée le long de l’axe de rotation', en: 'Matter flung out along the spin axis' },
        body: {
          fr: 'Toute la matière n’est pas avalée : une partie est éjectée le long de l’axe de rotation, guidée par le champ magnétique. Les jets des quasars portent leur énergie jusqu’à des centaines de milliers d’années-lumière. Ici, leur intensité est illustrative.',
          en: 'Not all the matter is swallowed: some is flung out along the spin axis, guided by the magnetic field. Quasar jets carry their energy hundreds of thousands of light-years away. Their strength here is illustrative.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'shadow',
        title: { fr: 'Masse modélisée', en: 'Modelled mass' },
        text: { fr: 'Estimée par un modèle, pas par des orbites', en: 'Estimated from a model, not from orbits' },
        body: {
          fr: 'Phoenix A* pourrait approcher 100 milliards de masses solaires, ce qui en ferait l’un des plus massifs connus. Mais sa masse n’a pas été mesurée par des orbites d’étoiles ou de gaz : elle découle d’un modèle de croissance, à la limite de ce que la théorie permet. D’autres estimations sont bien plus basses.',
          en: 'Phoenix A* might approach 100 billion solar masses, which would make it one of the most massive known. But its mass was not measured from orbiting stars or gas: it comes from a growth model, at the limit of what theory allows. Other estimates are much lower.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Disque d\'accrétion', en: 'Accretion disk' },
        text: { fr: 'Nourri par le gaz qui refroidit dans l’amas', en: 'Fed by gas cooling in the cluster' },
        body: {
          fr: 'L’amas du Phénix est l’un des plus actifs connus : son gaz chaud refroidit vite et nourrit à la fois des centaines d’étoiles nouvelles par an et le trou noir central. En retour, les jets du trou noir réchauffent ce gaz et freinent cette croissance. Ce disque est une illustration : ni sa taille ni sa couleur ne sont mesurées.',
          en: 'The Phoenix Cluster is one of the most active known: its hot gas cools fast and feeds both hundreds of new stars a year and the central black hole. In return, the hole’s jets reheat the gas and slow that growth. This disk is an illustration: neither its size nor its colour is measured.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'companion',
        title: { fr: 'HDE 226868', en: 'HDE 226868' },
        text: { fr: 'Supergéante bleue d’environ 40 masses solaires', en: 'Blue supergiant of about 40 solar masses' },
        body: {
          fr: 'Une supergéante bleue d’environ 40 masses solaires et 31 000 K. Le trou noir, de 15 à 21 masses solaires selon les études, en fait le tour en 5,6 jours à un cinquième de la distance Terre–Soleil. C’est en mesurant le balancement de cette étoile qu’on a pesé son compagnon invisible.',
          en: 'A blue supergiant of about 40 solar masses at 31,000 K. The black hole, 15 to 21 solar masses depending on the study, circles it every 5.6 days at a fifth of the Earth–Sun distance. Measuring this star’s wobble is how its invisible companion was weighed.',
        },
      },
      {
        anchor: 'stream',
        title: { fr: 'Transfert de matière', en: 'Mass transfer' },
        text: { fr: 'Le vent de l’étoile capté par le trou noir', en: 'The star’s wind captured by the hole' },
        body: {
          fr: 'L’étoile perd sa matière par un vent stellaire intense, dont le trou noir, tout proche, capte une partie. Ce gaz ne tombe pas droit : il s’enroule et forme le disque d’accrétion. Ici, le flot est dessiné comme un courant continu : une simplification.',
          en: 'The star loses mass through a strong stellar wind, part of which the nearby hole captures. That gas does not fall straight in: it winds round and forms the accretion disk. Here the flow is drawn as a continuous stream, a simplification.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Source de rayons X', en: 'X-ray source' },
        text: { fr: 'Gaz à des millions de degrés, repéré en 1964', en: 'Gas at millions of degrees, found in 1964' },
        body: {
          fr: 'Près du trou noir, le gaz atteint des millions de degrés et brille en rayons X. La source a été découverte en 1964 par des compteurs embarqués sur une fusée-sonde. Stephen Hawking avait parié en 1974 que ce n’était pas un trou noir ; il a reconnu sa défaite en 1990.',
          en: 'Near the hole the gas reaches millions of degrees and shines in X-rays. The source was discovered in 1964 by counters flown on a sounding rocket. Stephen Hawking bet in 1974 that it was not a black hole; he conceded in 1990.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'envelope',
        title: { fr: 'Enveloppe d\'hydrogène', en: 'Hydrogen envelope' },
        text: { fr: 'Gaz très dense qui cache le trou noir', en: 'Very dense gas hiding the black hole' },
        body: {
          fr: 'Le trou noir serait enfoui dans un cocon de gaz si dense qu’il ressemble à une étoile géante : l’énergie de l’accrétion chauffe et fait briller cette enveloppe. Le gaz absorbe une partie de la lumière et laisse une signature d’hydrogène très marquée dans le spectre. C’est ce que les chercheurs appellent une « étoile trou noir ».',
          en: 'The black hole would be buried in a cocoon of gas so dense that it looks like a giant star: accretion energy heats the envelope and makes it shine. The gas absorbs part of the light and leaves a strong hydrogen signature in the spectrum. This is what researchers call a “black hole star”.',
        },
      },
      {
        anchor: 'surface',
        title: { fr: '« Petit point rouge »', en: '“Little red dot”' },
        text: { fr: 'Vu 660 millions d’années après le Big Bang', en: 'Seen 660 million years after the Big Bang' },
        body: {
          fr: 'Les « petits points rouges » sont des sources compactes et rouges découvertes par le JWST dans l’Univers jeune ; leur nature est débattue. MoM-BH*-1 est vu 660 millions d’années après le Big Bang. Son spectre est le premier à avoir été interprété comme celui d’une étoile trou noir.',
          en: '“Little red dots” are compact red sources found by JWST in the young Universe; their nature is debated. MoM-BH*-1 is seen 660 million years after the Big Bang. Its spectrum is the first to have been read as that of a black hole star.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'beam',
        title: { fr: 'Faisceau', en: 'Beam' },
        text: { fr: 'Balaie la Terre 30 fois par seconde', en: 'Sweeps past Earth 30 times a second' },
        body: {
          fr: 'Le champ magnétique concentre le rayonnement en deux faisceaux, le long de ses pôles. L’axe magnétique étant incliné sur l’axe de rotation, les faisceaux balaient l’espace comme un phare : chaque fois que l’un croise la Terre, on reçoit une impulsion, 30 fois par seconde. Le Crabe pulse des ondes radio jusqu’aux rayons gamma.',
          en: 'The magnetic field focuses the radiation into two beams along its poles. As the magnetic axis is tilted from the spin axis, the beams sweep space like a lighthouse: each time one crosses Earth we receive a pulse, 30 times a second. The Crab pulses from radio waves to gamma rays.',
        },
      },
      {
        anchor: 'wind-torus',
        title: { fr: 'Tore de vent', en: 'Wind torus' },
        text: { fr: 'Le vent de particules qui fait briller le Crabe', en: 'The particle wind that lights up the Crab' },
        body: {
          fr: 'Le pulsar perd son énergie de rotation sous forme d’un vent de particules presque aussi rapides que la lumière. Ce vent souffle surtout dans le plan de l’équateur, où il forme un anneau et un tore lumineux. C’est lui qui fait briller la nébuleuse du Crabe tout entière.',
          en: 'The pulsar sheds its spin energy as a wind of particles moving at nearly the speed of light. The wind blows mostly in the equatorial plane, where it forms a bright ring and torus. It is what makes the whole Crab Nebula shine.',
        },
      },
      {
        anchor: 'wind-jet',
        title: { fr: 'Jet polaire', en: 'Polar jet' },
        text: { fr: 'Vu par Chandra le long de l’axe de rotation', en: 'Seen by Chandra along the spin axis' },
        body: {
          fr: 'Le long de l’axe de rotation, une partie du vent s’échappe en deux jets étroits. Le télescope X Chandra les a photographiés avec les anneaux du tore dès 1999. Leur forme change en quelques semaines.',
          en: 'Along the spin axis, part of the wind escapes in two narrow jets. The Chandra X-ray telescope imaged them with the torus rings as early as 1999. Their shape changes within weeks.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'beam',
        title: { fr: 'Faisceau', en: 'Beam' },
        text: { fr: '11 passages par seconde', en: '11 sweeps a second' },
        body: {
          fr: 'Le pulsar des Voiles tourne 11 fois par seconde et ses faisceaux balaient la Terre à chaque tour. C’est l’une des sources de rayons gamma les plus brillantes du ciel. Sa rotation ralentit lentement, à mesure qu’il perd de l’énergie.',
          en: 'The Vela Pulsar turns 11 times a second and its beams sweep Earth on every turn. It is one of the brightest gamma-ray sources in the sky. Its spin slows down gradually as it loses energy.',
        },
      },
      {
        anchor: 'star',
        title: { fr: 'Glitchs', en: 'Glitches' },
        text: { fr: 'Brusques accélérations, environ tous les 3 ans', en: 'Sudden spin-ups, about every 3 years' },
        body: {
          fr: 'Environ tous les trois ans, sa rotation s’accélère brusquement de quelques millionièmes : un « glitch ». L’explication privilégiée est un superfluide de neutrons, à l’intérieur, qui tourne plus vite que la croûte et s’y couple soudain. Le glitch de 2016, suivi en direct, a montré des impulsions perturbées juste avant.',
          en: 'About every three years its spin suddenly speeds up by a few parts per million: a “glitch”. The favoured explanation is a neutron superfluid inside, spinning faster than the crust, suddenly coupling to it. The 2016 glitch, caught live, showed disturbed pulses just before it.',
        },
      },
      {
        anchor: 'wind-torus',
        title: { fr: 'Nébuleuse de vent', en: 'Wind nebula' },
        text: { fr: 'Arcs et jets photographiés par Chandra', en: 'Arcs and jets imaged by Chandra' },
        body: {
          fr: 'Comme celui du Crabe, ce pulsar souffle un vent de particules qui gonfle une petite nébuleuse. Chandra y a vu des arcs autour du pulsar et un jet qui ondule comme un tuyau d’arrosage. Elle est minuscule face aux débris de la supernova qui l’entourent.',
          en: 'Like the Crab’s, this pulsar blows a particle wind that inflates a small nebula. Chandra saw arcs around the pulsar and a jet that wiggles like a fire hose. It is tiny next to the supernova debris around it.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'star',
        title: { fr: 'Équateur à 24 % de c', en: 'Equator at 24% of c' },
        text: { fr: '716 tours par seconde, le record', en: '716 turns a second, the record' },
        body: {
          fr: '716 tours par seconde : à l’équateur, la surface file à environ un quart de la vitesse de la lumière. Pour ne pas se disloquer, l’étoile doit être très compacte, ce qui renseigne sur la matière à l’intérieur des étoiles à neutrons. Il a été découvert en 2004 dans l’amas globulaire Terzan 5.',
          en: '716 turns a second: at the equator the surface moves at about a quarter of the speed of light. To hold together, the star must be very compact, which tells us about the matter inside neutron stars. It was discovered in 2004 in the globular cluster Terzan 5.',
        },
      },
      {
        anchor: 'beam',
        title: { fr: 'Pulsar recyclé', en: 'Recycled pulsar' },
        text: { fr: 'Accéléré par la matière d’une compagne', en: 'Spun up by matter from a companion' },
        body: {
          fr: 'Les pulsars millisecondes sont de vieilles étoiles à neutrons « recyclées » : en recevant la matière d’une étoile compagne, elles ont été relancées comme une toupie. Celui-ci tourne autour d’une compagne en environ 26 heures, et elle l’éclipse une partie du temps.',
          en: 'Millisecond pulsars are old neutron stars “recycled”: matter from a companion star spun them up like a top. This one orbits a companion every 26 hours or so, and the companion eclipses it part of the time.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'field',
        title: { fr: 'Champ extrême', en: 'Extreme field' },
        text: { fr: '≈ 10¹⁵ gauss : un magnétar', en: '≈ 10¹⁵ gauss: a magnetar' },
        body: {
          fr: 'Un magnétar porte le champ magnétique le plus intense connu, de l’ordre de 10¹⁵ gauss. Un tel champ étire les atomes en aiguilles et rend le vide lui-même biréfringent. Son lent déclin fournit l’énergie des sursauts de l’étoile. Les lignes dessinées ici sont celles d’un simple dipôle.',
          en: 'A magnetar carries the strongest magnetic field known, around 10¹⁵ gauss. Such a field stretches atoms into needles and makes the vacuum itself birefringent. Its slow decay powers the star’s outbursts. The lines drawn here are those of a simple dipole.',
        },
      },
      {
        anchor: 'star',
        title: { fr: 'Croûte fracturée', en: 'Cracked crust' },
        text: { fr: 'Source probable de l’éruption géante de 2004', en: 'Likely source of the 2004 giant flare' },
        body: {
          fr: 'Le 27 décembre 2004, une éruption géante a libéré environ 10⁴⁰ joules en une fraction de seconde. Partie de 42 000 années-lumière, elle a saturé les satellites et même perturbé l’ionosphère terrestre. On pense que la croûte de l’étoile s’est brisée sous la contrainte du champ magnétique.',
          en: 'On 27 December 2004 a giant flare released about 10⁴⁰ joules in a fraction of a second. Travelling 42,000 light-years, it saturated satellites and even disturbed Earth’s ionosphere. The star’s crust is thought to have cracked under the strain of the magnetic field.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'beam',
        title: { fr: 'LGM-1', en: 'LGM-1' },
        text: { fr: 'Une impulsion toutes les 1,337 s', en: 'One pulse every 1.337 s' },
        body: {
          fr: 'Une impulsion radio toutes les 1,337 seconde, avec une régularité d’horloge. Cette précision a fait envisager un signal artificiel, d’où le surnom LGM-1, pour « petits hommes verts ». Ses impulsions tracées les unes sous les autres ont inspiré la pochette de l’album Unknown Pleasures de Joy Division (1979).',
          en: 'A radio pulse every 1.337 seconds, as regular as a clock. That precision raised the idea of an artificial signal, hence the nickname LGM-1, for “little green men”. Its pulses stacked one under another inspired the cover of Joy Division’s album Unknown Pleasures (1979).',
        },
      },
      {
        anchor: 'star',
        title: { fr: 'Premier pulsar', en: 'First pulsar' },
        text: { fr: 'Repéré par Jocelyn Bell Burnell en 1967', en: 'Found by Jocelyn Bell Burnell in 1967' },
        body: {
          fr: 'Jocelyn Bell Burnell, doctorante à Cambridge, a repéré ce signal le 28 novembre 1967 dans des kilomètres de relevés sur papier. L’explication, une étoile à neutrons en rotation, a été trouvée l’année suivante. Le prix Nobel 1974 a récompensé son directeur, Antony Hewish, mais pas elle.',
          en: 'Jocelyn Bell Burnell, a Cambridge PhD student, spotted the signal on 28 November 1967 in kilometres of paper charts. The explanation, a spinning neutron star, came the following year. The 1974 Nobel Prize went to her supervisor, Antony Hewish, but not to her.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'jet',
        title: { fr: 'Jet', en: 'Jet' },
        text: { fr: '≈ 200 000 années-lumière, visible en optique', en: '≈ 200,000 light-years, seen in visible light' },
        body: {
          fr: 'Le jet de 3C 273 s’étend sur environ 200 000 années-lumière et se voit même en lumière visible : Hubble y montre une chaîne de nœuds alignés. Il émet des ondes radio jusqu’aux rayons X. C’est l’un des jets de quasar les plus étudiés.',
          en: '3C 273’s jet stretches about 200,000 light-years and shows even in visible light: Hubble reveals a chain of aligned knots. It shines from radio waves to X-rays. It is one of the most studied quasar jets.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Premier quasar', en: 'First quasar' },
        text: { fr: 'Décalage vers le rouge mesuré en 1963', en: 'Redshift measured in 1963' },
        body: {
          fr: 'En 1963, Maarten Schmidt a reconnu dans son spectre des raies de l’hydrogène décalées de 16 % vers le rouge : l’objet était à plus de deux milliards d’années-lumière, donc incroyablement lumineux pour son allure d’étoile. C’est ainsi que les quasars ont été découverts.',
          en: 'In 1963 Maarten Schmidt recognised hydrogen lines in its spectrum shifted 16% to the red: the object was over two billion light-years away, so incredibly luminous for its star-like look. That is how quasars were discovered.',
        },
      },
      {
        anchor: 'host',
        title: { fr: 'Galaxie hôte', en: 'Host galaxy' },
        text: { fr: 'Noyée dans l’éclat du quasar', en: 'Drowned in the quasar’s glare' },
        body: {
          fr: 'Le quasar brille des dizaines de fois plus que toute sa galaxie, une elliptique géante. Pour la voir, il faut masquer le quasar, comme l’a fait Hubble avec un coronographe en 2019. On y a découvert des structures inattendues, éclairées par le quasar.',
          en: 'The quasar outshines its whole galaxy, a giant elliptical, dozens of times over. To see it the quasar must be masked, as Hubble did with a coronagraph in 2019. Unexpected structures lit by the quasar turned up.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'shadow',
        title: { fr: 'Appétit record', en: 'Record appetite' },
        text: { fr: 'Avale l’équivalent d’un Soleil par jour', en: 'Swallows about one Sun a day' },
        body: {
          fr: 'Selon l’étude de 2024, son trou noir grossirait d’à peu près une masse solaire par jour, le rythme le plus rapide connu ; sa masse, estimée alors à 17 milliards de soleils, a été revue en 2025 à environ un milliard. Il a longtemps été pris pour une étoile : si lumineux et si lointain qu’il paraissait ponctuel. Sa lumière est partie il y a plus de 12 milliards d’années.',
          en: 'According to the 2024 study, its black hole grows by roughly one solar mass a day, the fastest rate known; its mass, then put at 17 billion Suns, was revised in 2025 to about one billion. It was long mistaken for a star: so bright and so far that it looked like a point. Its light set out over 12 billion years ago.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Disque géant', en: 'Giant disk' },
        text: { fr: '≈ 7 années-lumière de diamètre', en: '≈ 7 light-years across' },
        body: {
          fr: 'D’après l’estimation de 2024, son disque d’accrétion mesurerait environ 7 années-lumière, soit environ 15 000 fois la distance du Soleil à Neptune : le plus grand connu. Il fait briller l’objet comme 500 000 milliards de soleils. Le trou noir est au cœur d’une galaxie que cet éclat rend invisible.',
          en: 'By the 2024 estimate, its accretion disk would be about 7 light-years across, some 15,000 times the Sun–Neptune distance: the largest known. It makes the object shine like 500 trillion Suns. The hole sits in a galaxy that this glare makes invisible.',
        },
      },
    ],
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'shadow',
        title: { fr: 'Croissance éclair', en: 'Fast growth' },
        text: { fr: '780 millions de soleils 690 Ma après le Big Bang', en: '780 million Suns 690 Myr after the Big Bang' },
        body: {
          fr: '780 millions de masses solaires, 690 millions d’années seulement après le Big Bang : pour peser autant si tôt, le trou noir a dû grossir presque sans arrêt au maximum théorique, ou naître déjà massif. C’est l’un des quasars les plus lointains connus.',
          en: '780 million solar masses only 690 million years after the Big Bang: to weigh that much so early, the hole must have grown almost non-stop at the theoretical maximum, or been born massive. It is one of the most distant quasars known.',
        },
      },
      {
        anchor: 'host',
        title: { fr: 'Galaxie hôte', en: 'Host galaxy' },
        text: { fr: 'Dans un univers encore en partie neutre', en: 'In a universe still partly neutral' },
        body: {
          fr: 'Sa lumière montre qu’une grande partie de l’hydrogène autour de lui était encore neutre : l’Univers n’avait pas fini sa réionisation. Sa galaxie contient pourtant déjà beaucoup de poussière et forme des étoiles à un rythme élevé.',
          en: 'Its light shows that much of the hydrogen around it was still neutral: the Universe had not finished reionising. Yet its galaxy already holds plenty of dust and forms stars at a high rate.',
        },
      },
    ],
    appearance: 'simulation',
    sources: [wikipedia('ULAS J1342+0928', 'ULAS_J1342%2B0928')],
  },
  {
    id: 'apm-08279-5255', category: 'quasars', name: 'APM 08279+5255',
    kind: { fr: 'Quasar à lentille gravitationnelle', en: 'Gravitationally lensed quasar' },
    description: {
      fr: "Une galaxie au premier plan agit comme une loupe et le dédouble en trois images. Il abrite le plus grand réservoir d'eau connu : environ 140 000 milliards de fois l'eau des océans terrestres, sous forme de vapeur.",
      en: 'A foreground galaxy acts as a magnifying glass and splits it into three images. It holds the largest reservoir of water known: about 140 trillion times the water in Earth\'s oceans, as vapour.',
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
    markers: [
      {
        anchor: 'singularity',
        title: { fr: 'Singularité', en: 'Singularity' },
        text: { fr: 'Au centre, là où la théorie s’arrête', en: 'At the centre, where theory breaks down' },
        body: {
          fr: 'Selon la relativité générale, toute la masse du trou noir finit concentrée en un point de densité infinie, ou en un anneau si le trou noir tourne. Personne ne peut l’observer : elle est cachée derrière l’horizon. Elle marque surtout la limite de la théorie, qu’une théorie quantique de la gravité devra un jour remplacer.',
          en: 'General relativity predicts that all the hole’s mass ends up in a point of infinite density, or a ring if the hole spins. No one can observe it: it is hidden behind the horizon. Above all, it marks where the theory fails, until a quantum theory of gravity replaces it.',
        },
      },
      {
        anchor: 'host',
        title: { fr: 'Réservoir d\'eau', en: 'Water reservoir' },
        text: { fr: '≈ 140 000 milliards d’océans, en vapeur', en: '≈ 140 trillion oceans, as vapour' },
        body: {
          fr: 'Autour du quasar, un nuage de vapeur d’eau contient environ 140 000 milliards de fois l’eau des océans terrestres : le plus grand réservoir d’eau connu. Chauffée par le quasar, cette vapeur a été repérée en 2011 grâce à ses raies dans le spectre. Elle s’étend sur des centaines d’années-lumière.',
          en: 'Around the quasar, a cloud of water vapour holds about 140 trillion times the water in Earth’s oceans: the largest water reservoir known. Heated by the quasar, the vapour was detected in 2011 through its spectral lines. It spreads over hundreds of light-years.',
        },
      },
      {
        anchor: 'disk',
        title: { fr: 'Image triplée', en: 'Tripled image' },
        text: { fr: 'Une galaxie au premier plan sert de loupe', en: 'A foreground galaxy acts as a lens' },
        body: {
          fr: 'Une galaxie située entre lui et nous dévie sa lumière : c’est une lentille gravitationnelle, qui en forme trois images et amplifie son éclat. Sans cette loupe, il paraîtrait bien moins brillant ; il a d’abord été pris pour l’objet le plus lumineux de l’Univers.',
          en: 'A galaxy between it and us bends its light: a gravitational lens that makes three images and magnifies it. Without that lens it would look far fainter; it was first taken for the most luminous object in the Universe.',
        },
      },
    ],
    appearance: 'simulation',
    sources: [wikipedia('APM 08279+5255', 'APM_08279%2B5255')],
  },
]
