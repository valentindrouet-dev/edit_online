// ---------------------------------------------------------------------------
// EDIT — matériel de jeu
// ---------------------------------------------------------------------------
// Toutes les données sont relues depuis les PDF de cartes (PLANS_LARGES,
// PLANS_MOYENS, GROS_PLANS) et du tableau de répartition EDIT_44_cartes_v29.
// Elles restent modifiables à chaud depuis l'écran Matériel.

// --- Les six éléments ------------------------------------------------------

export const ELEMENTS = {
  FILLE:   { id: 'FILLE',   label: 'La Fille',   color: '#2f8f1f', ring: '#8ede4e' },
  TUEUR:   { id: 'TUEUR',   label: 'Le Tueur',   color: '#a51f1f', ring: '#ef4444' },
  HOMME:   { id: 'HOMME',   label: "L'Homme",    color: '#1b4f80', ring: '#5aa9e6' },
  CLE:     { id: 'CLE',     label: 'La Clé',     color: '#d19100', ring: '#ffd75e' },
  ARME:    { id: 'ARME',    label: "L'Arme",     color: '#63696f', ring: '#c3c9d1' },
  VOITURE: { id: 'VOITURE', label: 'La Voiture', color: '#9c6b32', ring: '#dda45f' },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS);

// --- Formats ---------------------------------------------------------------

export const FORMATS = {
  PL: { id: 'PL', label: 'Plan Large',  short: 'PL', color: '#5aa32b', tint: '#dff0c8' },
  PM: { id: 'PM', label: 'Plan Moyen',  short: 'PM', color: '#e0a11b', tint: '#fdeec4' },
  GP: { id: 'GP', label: 'Gros Plan',   short: 'GP', color: '#e8632a', tint: '#fbdac9' },
  TR: { id: 'TR', label: 'Raccord',     short: 'TR', color: '#7b7f86', tint: '#e4e6e9' },
};

// --- Objectifs (bandeaux) --------------------------------------------------
// kind :
//   RACCORD   n points par raccord du film
//   PLAN      n points par plan voisin de la carte porteuse  ( ◀ PLAN ▶ )
//   FORMAT    n points par plan du format visé
//   ELEMENT   n points par pastille de cet élément
//   PAIRE     n points par couple d'éléments adjacents (mêmes ou différents)
//   MORT      n points par plan de mort
//   NEANT     n points par plan sans aucun personnage
//   ABSENT    n points si l'élément visé n'apparaît nulle part

export const OBJ = {
  raccord: (n) => ({ kind: 'RACCORD', n }),
  plan:    (n) => ({ kind: 'PLAN', n }),
  format:  (n, f) => ({ kind: 'FORMAT', n, format: f }),
  element: (n, e) => ({ kind: 'ELEMENT', n, el: e }),
  paire:   (n, a, b) => ({ kind: 'PAIRE', n, els: [a, b] }),
  mort:    (n) => ({ kind: 'MORT', n }),
  neant:   (n) => ({ kind: 'NEANT', n }),
  absent:  (n, e) => ({ kind: 'ABSENT', n, el: e }),
};

export function objLabel(o) {
  if (!o) return '';
  switch (o.kind) {
    case 'RACCORD': return `${o.n} × Raccord`;
    case 'PLAN':    return `${o.n} × ◀ Plan ▶`;
    case 'FORMAT':  return `${o.n} × ${FORMATS[o.format].label}`;
    case 'ELEMENT': return `${o.n} × ${ELEMENTS[o.el].label}`;
    case 'PAIRE':   return `${o.n} × ${ELEMENTS[o.els[0]].label} + ${ELEMENTS[o.els[1]].label} côte à côte`;
    case 'MORT':    return `${o.n} × Mort`;
    case 'NEANT':   return `${o.n} × Plan sans personnage`;
    case 'ABSENT':  return `${o.n} si ${ELEMENTS[o.el].label} est absent du film`;
    default: return '';
  }
}

// --- Les 33 scènes ---------------------------------------------------------
// Chaque scène existe en deux cadrages : une moitié PLAN MOYEN (large, 2/3 de
// carte) et une moitié GROS PLAN (étroite, 1/3 de carte). Seule la moitié
// Gros Plan porte un objectif.
//
// tc      minutage affiché en haut à gauche (en minutes de film)
// famille regroupement éditorial (sert au tirage et aux statistiques)
// pmNum / gpNum  numéros d'impression
// pm.el / gp.el  éléments visibles sur chaque moitié
// gp.obj  bandeau d'objectif de la moitié Gros Plan
// mort    la scène montre une mort

const S = (idx, tc, famille, pmNum, gpNum, pmEl, gpEl, obj, extra = {}) => ({
  idx, tc, famille, pmNum, gpNum,
  pm: { el: pmEl },
  gp: { el: gpEl, obj },
  ...extra,
});

export const SCENES = [
  // Transitions -------------------------------------------------------------
  S(1,  99, 'TRANSITION', 292, 392, [], [], OBJ.raccord(2), { titre: 'Fin',           transition: 'CREDITS' }),
  S(2,   1, 'TRANSITION', 291, 391, [], [], OBJ.raccord(2), { titre: 'BBG présente',  transition: 'OUVERTURE' }),
  S(3,   0, 'TRANSITION', 290, 390, [], [], OBJ.plan(1),    { titre: 'Raccord',       transition: 'RACCORD' }),

  // Famille MORT ------------------------------------------------------------
  S(4,  94, 'MORT', 207, 307, ['FILLE', 'ARME'],   ['FILLE', 'ARME'], OBJ.mort(3),  { mort: true }),
  S(5,  93, 'MORT', 208, 308, ['FILLE', 'VOITURE'],['FILLE'],         OBJ.neant(3), { mort: true }),
  S(6,  91, 'MORT', 209, 309, ['TUEUR', 'CLE'],    ['TUEUR'],         OBJ.mort(3),  { mort: true }),
  S(7,  80, 'MORT', 210, 310, ['TUEUR', 'ARME'],   ['TUEUR'],         OBJ.neant(3), { mort: true }),
  S(8,  69, 'MORT', 211, 311, ['VOITURE', 'TUEUR'],['VOITURE'],       OBJ.mort(3),  { mort: true }),
  S(9,  92, 'MORT', 212, 312, ['HOMME', 'CLE'],    ['HOMME'],         OBJ.neant(3), { mort: true }),

  // Famille ARME ------------------------------------------------------------
  S(10, 66, 'ARME', 213, 313, ['FILLE', 'ARME'], ['FILLE', 'ARME'], OBJ.absent(5, 'HOMME')),
  S(11, 79, 'ARME', 214, 314, ['HOMME', 'ARME'], ['HOMME', 'ARME'], OBJ.raccord(2)),
  S(12, 76, 'ARME', 215, 315, ['FILLE', 'ARME'], ['ARME'],          OBJ.paire(2, 'ARME', 'ARME')),
  S(13, 78, 'ARME', 216, 316, ['FILLE', 'ARME'], ['FILLE', 'ARME'], OBJ.element(1, 'ARME')),
  S(14, 77, 'ARME', 217, 317, ['TUEUR', 'ARME'], ['TUEUR', 'ARME'], OBJ.format(2, 'PM')),

  // Famille VOITURE ---------------------------------------------------------
  S(15, 65, 'VOITURE', 218, 318, ['FILLE', 'VOITURE'],   ['FILLE', 'VOITURE'],   OBJ.format(2, 'GP')),
  S(16, 67, 'VOITURE', 219, 319, ['FILLE', 'VOITURE'],   ['FILLE', 'VOITURE'],   OBJ.format(2, 'PM')),
  S(17, 68, 'VOITURE', 220, 320, ['VOITURE', 'CLE'],     ['VOITURE', 'CLE'],     OBJ.format(2, 'PL')),
  S(18, 63, 'VOITURE', 221, 321, ['HOMME', 'VOITURE'],   ['HOMME', 'VOITURE'],   OBJ.format(2, 'GP')),
  S(19, 64, 'VOITURE', 222, 322, ['TUEUR', 'VOITURE'],   ['TUEUR', 'VOITURE'],   OBJ.element(1, 'VOITURE')),
  S(20, 62, 'VOITURE', 223, 323, ['FILLE', 'VOITURE'],   ['FILLE', 'VOITURE'],   OBJ.raccord(2)),
  S(21, 61, 'VOITURE', 224, 324, ['VOITURE'],            ['VOITURE'],            OBJ.paire(2, 'VOITURE', 'VOITURE')),
  S(22, 34, 'VOITURE', 225, 325, ['TUEUR', 'VOITURE'],   ['VOITURE', 'TUEUR'],   OBJ.format(2, 'PL')),

  // Famille CLÉ -------------------------------------------------------------
  S(23, 31, 'CLE', 226, 326, ['HOMME', 'CLE'], ['HOMME', 'CLE'], OBJ.paire(2, 'CLE', 'CLE')),
  S(24, 33, 'CLE', 227, 327, ['TUEUR', 'CLE'], ['CLE', 'TUEUR'], OBJ.format(2, 'GP')),
  S(25, 32, 'CLE', 228, 328, ['FILLE', 'CLE'], ['CLE', 'FILLE'], OBJ.format(2, 'PL')),
  S(26, 16, 'CLE', 229, 329, ['CLE', 'ARME'],  ['ARME', 'CLE'],  OBJ.element(1, 'CLE')),
  S(27, 17, 'CLE', 230, 330, ['HOMME', 'CLE'], ['HOMME'],        OBJ.format(2, 'PM')),

  // Famille PERSONNAGES (imprimés en trois exemplaires) ----------------------
  S(28, 0, 'PERSONNAGE', 201, 301, ['TUEUR', 'HOMME'], ['HOMME'], OBJ.paire(2, 'TUEUR', 'HOMME')),
  S(29, 0, 'PERSONNAGE', 202, 302, ['FILLE', 'TUEUR'], ['TUEUR'], OBJ.paire(2, 'FILLE', 'TUEUR')),
  S(30, 0, 'PERSONNAGE', 203, 303, ['HOMME', 'FILLE'], ['FILLE'], OBJ.paire(2, 'HOMME', 'FILLE')),
  S(31, 0, 'PERSONNAGE', 204, 304, ['HOMME'],          ['HOMME'], OBJ.element(1, 'HOMME')),
  S(32, 0, 'PERSONNAGE', 205, 305, ['TUEUR'],          ['TUEUR'], OBJ.element(1, 'TUEUR')),
  S(33, 0, 'PERSONNAGE', 206, 306, ['FILLE'],          ['FILLE'], OBJ.element(1, 'FILLE')),
];

export const SCENE_BY_IDX = Object.fromEntries(SCENES.map((s) => [s.idx, s]));

// Numéro d'impression -> index de scène
const pmIndex = {}, gpIndex = {};
for (const s of SCENES) { pmIndex[s.pmNum] = s.idx; gpIndex[s.gpNum] = s.idx; }

// --- Les 18 Plans Larges ---------------------------------------------------
// depart : carte Plan de départ (mise en place)
// brouillon : illustration et pastilles non encore arrêtées dans le PDF source

const PL = (num, tc, el, obj, extra = {}) => ({ num, tc, el, obj, ...extra });

export const PLANS_LARGES = [
  PL(101, 15, [],                                   null, { brouillon: true }),
  PL(102, 30, [],                                   null, { brouillon: true }),
  PL(103, 45, ['TUEUR', 'HOMME', 'CLE', 'VOITURE'], OBJ.raccord(2)),
  PL(104, 90, ['FILLE', 'HOMME', 'VOITURE'],        null),
  PL(105, 90, ['FILLE', 'TUEUR', 'HOMME', 'ARME'],  null),
  PL(106, 90, ['FILLE', 'CLE', 'VOITURE'],          null),
  PL(107, 15, ['FILLE', 'TUEUR', 'ARME'],           null),
  PL(108, 30, ['HOMME', 'TUEUR', 'CLE'],            null),
  PL(109, 15, ['HOMME', 'CLE', 'ARME'],             null),
  PL(110, 60, ['FILLE', 'TUEUR', 'ARME', 'VOITURE'],null),
  PL(111, 45, ['FILLE', 'HOMME', 'CLE'],            null),
  PL(112, 75, ['TUEUR', 'HOMME', 'CLE', 'ARME'],    null),
  PL(113, 60, ['FILLE', 'TUEUR', 'VOITURE'],        null),
  PL(114, 75, ['FILLE', 'TUEUR', 'ARME'],           null),
  PL(115, 75, ['FILLE', 'TUEUR', 'ARME'],           OBJ.format(3, 'PL'), { depart: true }),
  PL(116, 60, ['FILLE', 'TUEUR', 'VOITURE'],        OBJ.format(2, 'PM'), { depart: true }),
  PL(117, 45, ['TUEUR', 'HOMME', 'CLE', 'ARME'],    OBJ.format(2, 'GP'), { depart: true }),
  PL(118, 30, ['FILLE', 'HOMME', 'VOITURE'],        OBJ.plan(1),          { depart: true }),
];

// --- Les 50 cartes recto-verso --------------------------------------------
// Répartition v0.13 : au recto le Gros Plan à gauche et le Plan Moyen à
// droite, au verso l'inverse — mêmes deux moitiés sur les deux faces.
// Chaque entrée : [numéro PM, numéro GP].

const PAIRES = [
  [201, 317], [201, 319], [201, 325], [202, 308], [202, 314], [202, 324],
  [203, 315], [203, 320], [203, 327], [204, 310], [204, 391], [204, 326],
  [205, 307], [205, 312], [205, 328], [206, 313], [206, 318], [206, 322],
  [207, 305], [208, 301], [209, 302], [210, 303], [291, 306], [211, 390],
  [212, 305], [213, 306], [214, 302], [215, 390], [216, 306], [217, 301],
  [218, 390], [219, 304], [220, 304], [221, 303], [222, 390], [223, 390],
  [224, 302], [225, 304], [226, 303], [227, 301], [228, 305], [229, 390],
  [230, 391], [290, 309], [290, 311], [290, 316], [290, 323], [290, 329],
  [290, 330], [291, 321],
];

// Génère les 50 cartes doubles. Une carte porte deux moitiés :
//   face recto  : gp à gauche, pm à droite
//   face verso  : pm à gauche, gp à droite
export function buildCartesDoubles() {
  return PAIRES.map(([pmNum, gpNum], i) => ({
    id: `D${String(i + 1).padStart(2, '0')}`,
    type: 'DOUBLE',
    pmScene: pmIndex[pmNum],
    gpScene: gpIndex[gpNum],
    pmNum, gpNum,
  }));
}

export function buildPlansLarges() {
  return PLANS_LARGES.map((p) => ({
    id: `L${p.num}`,
    type: 'PL',
    ...p,
  }));
}

// --- Accès aux moitiés -----------------------------------------------------

/** Décrit une moitié posée : format, minutage, éléments, objectif. */
export function halfInfo(sceneIdx, format) {
  const s = SCENE_BY_IDX[sceneIdx];
  if (!s) return null;
  const side = format === 'GP' ? s.gp : s.pm;
  return {
    scene: s.idx,
    format: s.transition ? (format === 'GP' ? 'GP' : 'PM') : format,
    transition: s.transition || null,
    titre: s.titre || null,
    famille: s.famille,
    tc: s.tc,
    el: side.el,
    obj: side.obj || null,
    mort: !!s.mort,
    num: format === 'GP' ? s.gpNum : s.pmNum,
  };
}

/** Les deux moitiés d'une carte double, dans l'ordre de gauche à droite. */
export function faceHalves(carte, verso) {
  if (verso) {
    return [halfInfo(carte.pmScene, 'PM'), halfInfo(carte.gpScene, 'GP')];
  }
  return [halfInfo(carte.gpScene, 'GP'), halfInfo(carte.pmScene, 'PM')];
}

/** Une carte Plan Large se comporte comme une moitié unique pleine largeur. */
export function plHalf(carte) {
  return {
    scene: null,
    format: 'PL',
    transition: null,
    titre: null,
    famille: 'PLAN LARGE',
    tc: carte.tc,
    el: carte.el,
    obj: carte.obj || null,
    mort: false,
    num: carte.num,
    depart: !!carte.depart,
  };
}
