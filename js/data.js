// ---------------------------------------------------------------------------
// EDIT — matériel de jeu (règles v0.13)
// ---------------------------------------------------------------------------
// Relu depuis les PDF de cartes (PLANS_LARGES, PLANS_MOYENS, GROS_PLANS) et le
// tableau de répartition EDIT_44_cartes_v29.

// --- Les six éléments ------------------------------------------------------
// Trois personnages (Héroïne, Ennemi, Allié) et trois éléments (Arme, Objet,
// Véhicule).

export const ELEMENTS = {
  HEROINE:  { id: 'HEROINE',  label: 'Héroïne',  famille: 'PERSONNAGE', color: '#2f8f1f', ring: '#8ede4e' },
  ENNEMI:   { id: 'ENNEMI',   label: 'Ennemi',   famille: 'PERSONNAGE', color: '#a51f1f', ring: '#ef4444' },
  ALLIE:    { id: 'ALLIE',    label: 'Allié',    famille: 'PERSONNAGE', color: '#1b4f80', ring: '#5aa9e6' },
  OBJET:    { id: 'OBJET',    label: 'Objet',    famille: 'ELEMENT',    color: '#d19100', ring: '#ffd75e' },
  ARME:     { id: 'ARME',     label: 'Arme',     famille: 'ELEMENT',    color: '#63696f', ring: '#c3c9d1' },
  VEHICULE: { id: 'VEHICULE', label: 'Véhicule', famille: 'ELEMENT',    color: '#9c6b32', ring: '#dda45f' },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS);
export const PERSONNAGES = ELEMENT_IDS.filter((e) => ELEMENTS[e].famille === 'PERSONNAGE');

// --- Cadrages --------------------------------------------------------------

export const FORMATS = {
  PL: { id: 'PL', label: 'Plan Large', short: 'PL', color: '#5aa32b', tint: '#dff0c8' },
  PM: { id: 'PM', label: 'Plan Moyen', short: 'PM', color: '#e0a11b', tint: '#fdeec4' },
  GP: { id: 'GP', label: 'Gros Plan',  short: 'GP', color: '#e8632a', tint: '#fbdac9' },
  TR: { id: 'TR', label: 'Raccord',    short: 'TR', color: '#7b7f86', tint: '#e4e6e9' },
};

// --- Objectifs (bandeaux) --------------------------------------------------
// kind :
//   RACCORD   n points par Carte Raccord du montage entier
//   PLAN      n points par carte de la séquence porteuse   ( ◀ PLAN ▶ )
//   FORMAT    n points par plan du cadrage visé
//   ELEMENT   n points par plan portant cet élément
//   PAIRE     n points par couple d'éléments sur deux plans voisins
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
    case 'ABSENT':  return `${o.n} si ${ELEMENTS[o.el].label} est absent`;
    default: return '';
  }
}

export function objPortee(o) {
  // Le Générique compte les Cartes Raccord du montage entier ; tous les autres
  // bandeaux se lisent dans leur propre séquence.
  return o && o.kind === 'RACCORD' ? 'MONTAGE' : 'SEQUENCE';
}

// --- Les 33 scènes ---------------------------------------------------------
// Chaque scène existe en deux cadrages : une moitié PLAN MOYEN (2/3 de carte)
// et une moitié GROS PLAN (1/3). Seule la moitié Gros Plan porte un objectif.

const S = (idx, tc, famille, pmNum, gpNum, pmEl, gpEl, obj, extra = {}) => ({
  idx, tc, famille, pmNum, gpNum,
  pm: { el: pmEl },
  gp: { el: gpEl, obj },
  ...extra,
});

export const SCENES = [
  // Raccords et génériques --------------------------------------------------
  S(1,  99, 'TRANSITION', 292, 392, [], [], OBJ.raccord(2), { titre: 'Fin',          transition: 'CREDITS' }),
  S(2,   1, 'TRANSITION', 291, 391, [], [], OBJ.raccord(2), { titre: 'BBG présente', transition: 'OUVERTURE' }),
  S(3,   0, 'TRANSITION', 290, 390, [], [], OBJ.plan(1),    { titre: 'Raccord',      transition: 'RACCORD' }),

  // Famille MORT ------------------------------------------------------------
  S(4,  94, 'MORT', 207, 307, ['HEROINE', 'ARME'],     ['HEROINE', 'ARME'], OBJ.mort(3),  { mort: true }),
  S(5,  93, 'MORT', 208, 308, ['HEROINE', 'VEHICULE'], ['HEROINE'],         OBJ.neant(3), { mort: true }),
  S(6,  91, 'MORT', 209, 309, ['ENNEMI', 'OBJET'],     ['ENNEMI'],          OBJ.mort(3),  { mort: true }),
  S(7,  80, 'MORT', 210, 310, ['ENNEMI', 'ARME'],      ['ENNEMI'],          OBJ.neant(3), { mort: true }),
  S(8,  69, 'MORT', 211, 311, ['VEHICULE', 'ENNEMI'],  ['VEHICULE'],        OBJ.mort(3),  { mort: true }),
  S(9,  92, 'MORT', 212, 312, ['ALLIE', 'OBJET'],      ['ALLIE'],           OBJ.neant(3), { mort: true }),

  // Famille ARME ------------------------------------------------------------
  S(10, 66, 'ARME', 213, 313, ['HEROINE', 'ARME'], ['HEROINE', 'ARME'], OBJ.absent(5, 'ALLIE')),
  S(11, 79, 'ARME', 214, 314, ['ALLIE', 'ARME'],   ['ALLIE', 'ARME'],   OBJ.raccord(2)),
  S(12, 76, 'ARME', 215, 315, ['HEROINE', 'ARME'], ['ARME'],            OBJ.paire(2, 'ARME', 'ARME')),
  S(13, 78, 'ARME', 216, 316, ['HEROINE', 'ARME'], ['HEROINE', 'ARME'], OBJ.element(1, 'ARME')),
  S(14, 77, 'ARME', 217, 317, ['ENNEMI', 'ARME'],  ['ENNEMI', 'ARME'],  OBJ.format(2, 'PM')),

  // Famille VÉHICULE --------------------------------------------------------
  S(15, 65, 'VEHICULE', 218, 318, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.format(2, 'GP')),
  S(16, 67, 'VEHICULE', 219, 319, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.format(2, 'PM')),
  S(17, 68, 'VEHICULE', 220, 320, ['VEHICULE', 'OBJET'],   ['VEHICULE', 'OBJET'],   OBJ.format(2, 'PL')),
  S(18, 63, 'VEHICULE', 221, 321, ['ALLIE', 'VEHICULE'],   ['ALLIE', 'VEHICULE'],   OBJ.format(2, 'GP')),
  S(19, 64, 'VEHICULE', 222, 322, ['ENNEMI', 'VEHICULE'],  ['ENNEMI', 'VEHICULE'],  OBJ.element(1, 'VEHICULE')),
  S(20, 62, 'VEHICULE', 223, 323, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.raccord(2)),
  S(21, 61, 'VEHICULE', 224, 324, ['VEHICULE'],            ['VEHICULE'],            OBJ.paire(2, 'VEHICULE', 'VEHICULE')),
  S(22, 34, 'VEHICULE', 225, 325, ['ENNEMI', 'VEHICULE'],  ['VEHICULE', 'ENNEMI'],  OBJ.format(2, 'PL')),

  // Famille OBJET -----------------------------------------------------------
  S(23, 31, 'OBJET', 226, 326, ['ALLIE', 'OBJET'],   ['ALLIE', 'OBJET'],   OBJ.paire(2, 'OBJET', 'OBJET')),
  S(24, 33, 'OBJET', 227, 327, ['ENNEMI', 'OBJET'],  ['OBJET', 'ENNEMI'],  OBJ.format(2, 'GP')),
  S(25, 32, 'OBJET', 228, 328, ['HEROINE', 'OBJET'], ['OBJET', 'HEROINE'], OBJ.format(2, 'PL')),
  S(26, 16, 'OBJET', 229, 329, ['OBJET', 'ARME'],    ['ARME', 'OBJET'],    OBJ.element(1, 'OBJET')),
  S(27, 17, 'OBJET', 230, 330, ['ALLIE', 'OBJET'],   ['ALLIE'],            OBJ.format(2, 'PM')),

  // Famille PERSONNAGE (imprimée en trois exemplaires) -----------------------
  S(28, 0, 'PERSONNAGE', 201, 301, ['ENNEMI', 'ALLIE'],   ['ALLIE'],   OBJ.paire(2, 'ENNEMI', 'ALLIE')),
  S(29, 0, 'PERSONNAGE', 202, 302, ['HEROINE', 'ENNEMI'], ['ENNEMI'],  OBJ.paire(2, 'HEROINE', 'ENNEMI')),
  S(30, 0, 'PERSONNAGE', 203, 303, ['ALLIE', 'HEROINE'],  ['HEROINE'], OBJ.paire(2, 'ALLIE', 'HEROINE')),
  S(31, 0, 'PERSONNAGE', 204, 304, ['ALLIE'],             ['ALLIE'],   OBJ.element(1, 'ALLIE')),
  S(32, 0, 'PERSONNAGE', 205, 305, ['ENNEMI'],            ['ENNEMI'],  OBJ.element(1, 'ENNEMI')),
  S(33, 0, 'PERSONNAGE', 206, 306, ['HEROINE'],           ['HEROINE'], OBJ.element(1, 'HEROINE')),
];

export const SCENE_BY_IDX = Object.fromEntries(SCENES.map((s) => [s.idx, s]));

const pmIndex = {}, gpIndex = {};
for (const s of SCENES) { pmIndex[s.pmNum] = s.idx; gpIndex[s.gpNum] = s.idx; }

// --- Les 14 Plans Larges ---------------------------------------------------
// brouillon : pastilles et bandeau absents du PDF source, à compléter.

const PL = (num, tc, el, obj, extra = {}) => ({ num, tc, el, obj, ...extra });

export const PLANS_LARGES = [
  PL(101, 15, [],                                          null, { brouillon: true }),
  PL(102, 30, [],                                          null, { brouillon: true }),
  PL(103, 45, ['ENNEMI', 'ALLIE', 'OBJET', 'VEHICULE'],    OBJ.raccord(2)),
  PL(104, 90, ['HEROINE', 'ALLIE', 'VEHICULE'],            null),
  PL(105, 90, ['HEROINE', 'ENNEMI', 'ALLIE', 'ARME'],      null),
  PL(106, 90, ['HEROINE', 'OBJET', 'VEHICULE'],            null),
  PL(107, 15, ['HEROINE', 'ENNEMI', 'ARME'],               null),
  PL(108, 30, ['ALLIE', 'ENNEMI', 'OBJET'],                null),
  PL(109, 15, ['ALLIE', 'OBJET', 'ARME'],                  null),
  PL(110, 60, ['HEROINE', 'ENNEMI', 'ARME', 'VEHICULE'],   null),
  PL(111, 45, ['HEROINE', 'ALLIE', 'OBJET'],               null),
  PL(112, 75, ['ENNEMI', 'ALLIE', 'OBJET', 'ARME'],        null),
  PL(113, 60, ['HEROINE', 'ENNEMI', 'VEHICULE'],           null),
  PL(114, 75, ['HEROINE', 'ENNEMI', 'ARME'],               null),
];

// --- Les Plans de départ ---------------------------------------------------
// 8 cartes, en 2 versions recto-verso : 4 faces distinctes dans le PDF.
// L'appariement recto/verso des deux types est une hypothèse (ordre du PDF).

export const DEPARTS = [
  { type: 'A', faces: [
    PL(115, 75, ['HEROINE', 'ENNEMI', 'ARME'],            OBJ.format(3, 'PL'), { depart: true }),
    PL(116, 60, ['HEROINE', 'ENNEMI', 'VEHICULE'],        OBJ.format(2, 'PM'), { depart: true }),
  ] },
  { type: 'B', faces: [
    PL(117, 45, ['ENNEMI', 'ALLIE', 'OBJET', 'ARME'],     OBJ.format(2, 'GP'), { depart: true }),
    PL(118, 30, ['HEROINE', 'ALLIE', 'VEHICULE'],         OBJ.plan(1),         { depart: true }),
  ] },
];

// --- Les 50 cartes Plan Moyen / Gros Plan ----------------------------------
// Répartition v0.13. Au recto le Gros Plan à gauche et le Plan Moyen à droite,
// au verso l'inverse — mêmes deux moitiés sur les deux faces.
// `dual` marque la moitié GÉNÉRIQUE à double lecture : Ouverture quand elle
// est à gauche, Crédits quand elle passe à droite.

const PAIRES = [
  [201, 317], [201, 319], [201, 325], [202, 308], [202, 314], [202, 324],
  [203, 315], [203, 320], [203, 327], [204, 310], [204, 391], [204, 326],
  [205, 307], [205, 312], [205, 328], [206, 313], [206, 318], [206, 322],
  [207, 305], [208, 301], [209, 302], [210, 303], [291, 306], [211, 390],
  [212, 305], [213, 306], [214, 302], [215, 390], [216, 306], [217, 301],
  [218, 390], [219, 304], [220, 304], [221, 303], [222, 390], [223, 390],
  [224, 302], [225, 304], [226, 303], [227, 301], [228, 305], [229, 390],
  [230, 391, { dualGP: true }], [290, 309], [290, 311], [290, 316], [290, 323],
  [290, 329], [290, 330], [291, 321, { dualPM: true }],
];

export function buildCartesDoubles() {
  return PAIRES.map(([pmNum, gpNum, extra], i) => ({
    id: `D${String(i + 1).padStart(2, '0')}`,
    type: 'DOUBLE',
    pmScene: pmIndex[pmNum],
    gpScene: gpIndex[gpNum],
    pmNum, gpNum,
    ...(extra || {}),
  }));
}

export function buildPlansLarges() {
  return PLANS_LARGES.map((p) => ({ id: `L${p.num}`, type: 'PL', ...p }));
}

export function buildDeparts() {
  // Deux exemplaires de chaque version, soit les 8 cartes de la boîte.
  const out = [];
  DEPARTS.forEach((d) => {
    for (let k = 0; k < 4; k++) {
      out.push({ id: `S${d.type}${k + 1}`, type: 'DEPART', version: d.type, faces: d.faces });
    }
  });
  return out;
}

// --- Accès aux moitiés -----------------------------------------------------

/** Une moitié posée : cadrage, minutage, éléments, objectif. */
export function halfInfo(sceneIdx, format, opts = {}) {
  const s = SCENE_BY_IDX[sceneIdx];
  if (!s) return null;
  const side = format === 'GP' ? s.gp : s.pm;
  return {
    scene: s.idx,
    format,
    transition: s.transition || null,
    dual: !!opts.dual,
    titre: s.titre || null,
    famille: s.famille,
    tc: s.tc,
    el: side.el.slice(),
    obj: side.obj || null,
    mort: !!s.mort,
    num: format === 'GP' ? s.gpNum : s.pmNum,
  };
}

/** Les deux moitiés d'une carte double, indexées par cadrage. */
export function moitiesDe(carte) {
  return {
    GP: halfInfo(carte.gpScene, 'GP', { dual: !!carte.dualGP }),
    PM: halfInfo(carte.pmScene, 'PM', { dual: !!carte.dualPM }),
  };
}

/** Un Plan Large se comporte comme un plan unique pleine largeur. */
export function plHalf(carte) {
  return {
    scene: null,
    format: 'PL',
    transition: null,
    dual: false,
    titre: null,
    famille: 'PLAN LARGE',
    tc: carte.tc,
    el: carte.el.slice(),
    obj: carte.obj || null,
    mort: false,
    num: carte.num,
    depart: !!carte.depart,
  };
}
