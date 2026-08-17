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
  PL: { id: 'PL', label: 'Plan Large',     short: 'PL',  color: '#5aa32b', tint: '#dff0c8' },
  PM: { id: 'PM', label: 'Plan Moyen',     short: 'PM',  color: '#e0a11b', tint: '#fdeec4' },
  GP: { id: 'GP', label: 'Gros Plan',      short: 'GP',  color: '#e8632a', tint: '#fbdac9' },
  DEP: { id: 'DEP', label: 'Plan de départ', short: 'DÉP', color: '#3f8fbf', tint: '#d8ecf7' },
  TR: { id: 'TR', label: 'Raccord',        short: 'TR',  color: '#7b7f86', tint: '#e4e6e9' },
};

// Un Plan de départ est un plan comme un autre pour tout ce qui compte des
// cartes — mais ce n'est pas un Plan Large : aucun objectif de cadrage ne le
// vise, et aucun ne le désigne. Les cadrages qu'un bandeau peut viser :
export const CADRAGES_VISABLES = ['PL', 'PM', 'GP'];

// --- Objectifs (bandeaux) --------------------------------------------------
// kind :
//   RACCORD   n points par Carte Raccord du montage entier
//   PLAN      n points par carte de la séquence porteuse   ( ◀ PLAN ▶ )
//   FORMAT    n points par plan du cadrage visé
//   ELEMENT   n points par plan portant cet élément
//   PAIRE     n points par couple d'icônes réunies dans la portée : quatre
//             icônes font deux couples, cinq en font deux aussi
//   MORT      n points par plan de mort
//   NEANT     n points par plan sans aucun personnage
//   ABSENT    n points si l'élément visé n'apparaît nulle part
//   MINUTAGE  n points par plan du montage dont le minutage est strictement
//             avant (ou après) le seuil visé
//   CHRONO    n points si le montage se lit dans l'ordre : chaque minutage
//             est supérieur ou égal à celui de son voisin de gauche
//   SANS_TC   n points si aucun plan du montage n'a le minutage visé : égal au
//             seuil (00:00 pour les Raccords et Génériques), ou strictement
//             avant, ou strictement après

// --- La portée d'un bandeau ------------------------------------------------
// Tout bandeau dit où il compte : parmi les cartes placées avant lui, après
// lui, dans sa séquence, ou dans le montage entier. Les flèches du bandeau le
// disent d'un coup d'œil — « ◀ Héroïne » avant, « Héroïne ▶ » après,
// « ◀ Héroïne ▶ » dans la séquence, « Héroïne » tout court dans le montage.

export const PORTEES = [
  { id: 'AVANT',    label: 'avant cette carte',  court: 'avant',   gauche: true,  droite: false },
  { id: 'APRES',    label: 'après cette carte',  court: 'après',   gauche: false, droite: true },
  { id: 'SEQUENCE', label: 'dans sa séquence',   court: 'séquence', gauche: true,  droite: true },
  { id: 'MONTAGE',  label: 'dans le montage',    court: 'montage', gauche: false, droite: false },
];

export const PORTEE_IDS = PORTEES.map((p) => p.id);

export const OBJ = {
  raccord: (n, portee) => ({ kind: 'RACCORD', n, portee: portee || 'MONTAGE' }),
  plan:    (n, portee) => ({ kind: 'PLAN', n, portee: portee || 'SEQUENCE' }),
  format:  (n, f, portee) => ({ kind: 'FORMAT', n, format: f, ...(portee ? { portee } : {}) }),
  element: (n, e, portee) => ({ kind: 'ELEMENT', n, el: e, ...(portee ? { portee } : {}) }),
  paire:   (n, a, b, portee) => ({ kind: 'PAIRE', n, els: [a, b], ...(portee ? { portee } : {}) }),
  mort:    (n, portee) => ({ kind: 'MORT', n, ...(portee ? { portee } : {}) }),
  neant:   (n, portee) => ({ kind: 'NEANT', n, ...(portee ? { portee } : {}) }),
  absent:  (n, e, portee) => ({ kind: 'ABSENT', n, el: e, portee: portee || 'MONTAGE' }),
  minutage: (n, sens, seuil, portee) => ({ kind: 'MINUTAGE', n, sens, seuil, portee: portee || 'MONTAGE' }),
  chrono:  (n, portee) => ({ kind: 'CHRONO', n, portee: portee || 'MONTAGE' }),
  sansTc: (n, sens, seuil, portee) => ({ kind: 'SANS_TC', n, sens, seuil, portee: portee || 'MONTAGE' }),
};

/** « 25:00 », en toutes lettres d'afficheur. */
export function tcTexte(min) {
  return `${String(Math.floor(min)).padStart(2, '0')}:00`;
}

/** Ce que le bandeau compte, sans sa portée. */
function objQuoi(o) {
  switch (o.kind) {
    case 'RACCORD': return 'Raccord';
    case 'PLAN':    return 'Plan';
    case 'FORMAT':  return FORMATS[o.format].label;
    case 'ELEMENT': return ELEMENTS[o.el].label;
    case 'PAIRE':   return o.els[0] === o.els[1]
      ? `couple de ${ELEMENTS[o.els[0]].label}`
      : `couple ${ELEMENTS[o.els[0]].label} + ${ELEMENTS[o.els[1]].label}`;
    case 'MORT':    return 'Mort';
    case 'NEANT':   return 'Plan sans personnage';
    case 'MINUTAGE': return `Plan ${o.sens === 'APRES' ? 'après' : 'avant'} ${tcTexte(o.seuil)}`;
    default: return '';
  }
}

export function objLabel(o, cfg) {
  if (!o) return '';
  const p = PORTEES.find((x) => x.id === objPortee(o, cfg)) || PORTEES[3];
  const ou = p.id === 'MONTAGE' ? '' : ` ${p.label}`;
  switch (o.kind) {
    case 'ABSENT':  return `${o.n} si ${ELEMENTS[o.el].label} est absent${ou}`;
    case 'CHRONO':  return `${o.n} si tout est dans l’ordre${ou || ' dans le montage'}`;
    case 'SANS_TC': return `${o.n} si aucun plan ${
      o.sens === 'AVANT' ? `avant ${tcTexte(o.seuil)}`
        : o.sens === 'APRES' ? `après ${tcTexte(o.seuil)}`
          : `à ${tcTexte(o.seuil)}`}${ou || ' dans le montage'}`;
    default: return `${o.n} × ${objQuoi(o)}${ou}`;
  }
}

/**
 * Où un bandeau compte. Il le porte lui-même ; les cartes imprimées qui ne le
 * précisent pas suivent la variable de partie — c'est le point resté ouvert
 * dans les règles.
 */
export function objPortee(o, cfg) {
  if (!o) return 'MONTAGE';
  if (PORTEE_IDS.includes(o.portee)) return o.portee;
  return cfg && cfg.porteeParDefaut === 'SEQUENCE' ? 'SEQUENCE' : 'MONTAGE';
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
  return PAIRES.map(([pmImp, gpImp, extra], i) => {
    // L'appariement des deux moitiés est lui aussi réglable : c'est la seule
    // façon de changer la répartition des Plans Moyens et des Gros Plans.
    const [pmNum, gpNum] = paireDe(i, [pmImp, gpImp]);
    return {
      id: `D${String(i + 1).padStart(2, '0')}`,
      type: 'DOUBLE',
      rang: i,
      pmScene: pmIndex[pmNum],
      gpScene: gpIndex[gpNum],
      pmNum, gpNum,
      pmImprime: pmImp, gpImprime: gpImp,
      appariementModifie: pmNum !== pmImp || gpNum !== gpImp,
      actif: carteActive(`D${String(i + 1).padStart(2, '0')}`),
      ...(extra || {}),
    };
  });
}

export function buildPlansLarges() {
  return PLANS_LARGES.map((p) => ({ id: `L${p.num}`, type: 'PL', actif: carteActive(`L${p.num}`), ...p }));
}

export function buildDeparts() {
  // Deux exemplaires de chaque version, soit les 8 cartes de la boîte.
  const out = [];
  DEPARTS.forEach((d) => {
    const faces = d.faces.filter((f) => carteActive(`S${d.type}f${f.num}`));
    if (!faces.length) return;
    for (let k = 0; k < 4; k++) {
      out.push({ id: `S${d.type}${k + 1}`, type: 'DEPART', version: d.type, faces });
    }
  });
  return out;
}

// --- Matériel ajustable ----------------------------------------------------
// Rien de ce qui est imprimé sur une carte n'est figé : le minutage, les
// pastilles et le bandeau d'objectif de chaque plan sont des données que
// l'application contrôle, et que l'éditeur de l'écran Matériel remplace plan
// par plan.
//
// Deux jeux de matériel coexistent en permanence — l'IMPRIMÉ, intouchable, et
// le MODIFIÉ, qui porte les retouches. `appliquerMateriel` reçoit le second
// quand c'est lui qu'on joue, et rien quand on joue l'imprimé : les retouches
// ne sont donc jamais perdues, seulement mises de côté.
//
//   plans[clé]  = { tc, el, obj, mort }  — chaque champ absent = valeur imprimée
//   paires[i]   = [pmNum, gpNum]         — l'appariement de la i-ème carte
//   desactives  = [id de carte, …]       — les cartes écartées du paquet
//
// La clé d'un plan est son numéro, suivi de sa face pour les moitiés d'une
// carte Plan Moyen / Gros Plan : « 201R » et « 201V » sont deux plans
// distincts, réglables séparément, car le recto et le verso d'une carte ne
// portent pas le même minutage. Les Plans Larges et les Plans de départ ont un
// vrai dos, donc une seule face : leur clé est leur seul numéro.
//
// Numéros : 101-114 les Plans Larges, 115-118 les Plans de départ, 201-230 et
// 290-292 les Plans Moyens, 301-330 et 390-392 les Gros Plans.

export const FACES = [
  { id: 'R', label: 'Recto', court: 'R' },
  { id: 'V', label: 'Verso', court: 'V' },
];

/** La clé d'un plan : son numéro, plus sa face quand elle en a une. */
export function cleplan(num, face) {
  return face ? `${num}${face}` : String(num);
}

export const SURCHARGES = { plans: {}, paires: {}, desactives: new Set() };

/**
 * Remplace la couche de surcharge. `table` nul = on joue le matériel imprimé.
 * Les cartes écartées, elles, valent dans les deux jeux : c'est la composition
 * de la boîte, pas une retouche de carte.
 */
export function appliquerMateriel(table, desactives) {
  for (const k of Object.keys(SURCHARGES.plans)) delete SURCHARGES.plans[k];
  for (const k of Object.keys(SURCHARGES.paires)) delete SURCHARGES.paires[k];
  Object.assign(SURCHARGES.plans, (table && table.plans) || {});
  Object.assign(SURCHARGES.paires, (table && table.paires) || {});
  SURCHARGES.desactives = new Set(desactives || []);
}

const sur = (cle) => SURCHARGES.plans[cle] || null;

export function tcDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.tc === undefined || s.tc === null || s.tc === '' ? defaut : Number(s.tc);
}

export function elDe(cle, defaut) {
  const s = sur(cle);
  return (s && Array.isArray(s.el) ? s.el : defaut || []).slice();
}

export function objDe(cle, defaut) {
  const s = sur(cle);
  if (!s || s.obj === undefined) return defaut || null;
  return s.obj ? { ...s.obj } : null;
}

/**
 * Le second pouvoir d'un plan. Une carte peut en porter deux, côte à côte sur
 * le bandeau : ils comptent tous les deux, et s'affichent tous les deux. Rien
 * ne l'impose — la plupart des plans n'en ont qu'un, et beaucoup aucun.
 */
export function obj2De(cle, defaut) {
  const s = sur(cle);
  if (!s || s.obj2 === undefined) return defaut || null;
  return s.obj2 ? { ...s.obj2 } : null;
}

/**
 * Les pouvoirs d'un plan, dans l'ordre où ils se lisent sur le bandeau. Un
 * plan sans pouvoir en rend une liste vide : tout ce qui compte les bandeaux
 * passe par ici plutôt que par `plan.obj`, et n'a rien à savoir de leur nombre.
 */
export function objsDe(plan) {
  if (!plan) return [];
  return [plan.obj, plan.obj2].filter(Boolean);
}

export function mortDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.mort === undefined ? !!defaut : !!s.mort;
}

/**
 * Le numéro affiché d'un plan. Ce n'est qu'une étiquette : l'identité d'un
 * plan reste son numéro imprimé, qui sert de clé et désigne son illustration.
 * Renuméroter ne casse donc aucun appariement — et deux plans peuvent porter
 * le même numéro, l'éditeur se contentant de le signaler.
 */
export function numDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.num === undefined || s.num === null || s.num === '' ? defaut : Number(s.num);
}

/** L'appariement d'une carte double : imprimé, ou celui qu'on lui a donné. */
export function paireDe(i, defaut) {
  const p = SURCHARGES.paires[i];
  return Array.isArray(p) && p.length === 2 ? p : defaut;
}

/** Un plan a-t-il été retouché ? */
export function planModifie(cle) {
  const s = sur(cle);
  return !!s && Object.keys(s).length > 0;
}

export function carteActive(id) {
  return !SURCHARGES.desactives.has(id);
}

// --- Accès aux moitiés -----------------------------------------------------

/**
 * Une moitié posée : cadrage, minutage, éléments, objectif.
 * `face` distingue le recto du verso — deux plans différents pour le même
 * numéro de scène.
 */
export function halfInfo(sceneIdx, format, opts = {}) {
  const s = SCENE_BY_IDX[sceneIdx];
  if (!s) return null;
  const side = format === 'GP' ? s.gp : s.pm;
  // Le numéro imprimé est l'identité du plan : il fait la clé et désigne son
  // illustration. `num` n'est que l'étiquette, renumérotable.
  const origine = format === 'GP' ? s.gpNum : s.pmNum;
  const face = opts.face || 'R';
  const cle = cleplan(origine, face);
  return {
    scene: s.idx,
    format,
    face,
    cle,
    transition: s.transition || null,
    dual: !!opts.dual,
    titre: s.titre || null,
    famille: s.famille,
    tc: tcDe(cle, s.tc),
    el: elDe(cle, side.el),
    obj: objDe(cle, side.obj),
    obj2: obj2De(cle, side.obj2),
    mort: mortDe(cle, s.mort),
    num: numDe(cle, origine),
    numOrigine: origine,
    image: `assets/${format === 'GP' ? 'gp' : 'pm'}/${origine}.webp`,
  };
}

/**
 * Les deux moitiés d'une carte double, sur une face donnée. Au recto le Gros
 * Plan est à gauche et le Plan Moyen à droite ; au verso, l'inverse.
 */
export function moitiesDe(carte, face = 'R') {
  return {
    GP: halfInfo(carte.gpScene, 'GP', { dual: !!carte.dualGP, face }),
    PM: halfInfo(carte.pmScene, 'PM', { dual: !!carte.dualPM, face }),
  };
}

/** Un Plan Large se comporte comme un plan unique pleine largeur. */
export function plHalf(carte) {
  const cle = cleplan(carte.num, null);
  return {
    scene: null,
    format: carte.depart ? 'DEP' : 'PL',
    face: null,
    cle,
    transition: null,
    dual: false,
    titre: null,
    famille: carte.depart ? 'DÉPART' : 'PLAN LARGE',
    tc: tcDe(cle, carte.tc),
    el: elDe(cle, carte.el),
    obj: objDe(cle, carte.obj),
    obj2: obj2De(cle, carte.obj2),
    mort: mortDe(cle, false),
    num: numDe(cle, carte.num),
    numOrigine: carte.num,
    depart: !!carte.depart,
    image: `assets/pl/${carte.num}.webp`,
  };
}

// --- Catalogue des plans ---------------------------------------------------
// La liste complète de ce qui est éditable. Une moitié de carte double y
// figure deux fois, une par face.

export function catalogue() {
  const out = [];
  const pousse = (origine, face, defauts, format, famille, extra = {}) => {
    const cle = cleplan(origine, face);
    const num = numDe(cle, origine);
    out.push({
      cle, num, numOrigine: origine, face, format, famille,
      quoi: `${FORMATS[format].label} ${num}${face ? ` — ${face === 'R' ? 'recto' : 'verso'}` : ''}`,
      tc: tcDe(cle, defauts.tc), el: elDe(cle, defauts.el), obj: objDe(cle, defauts.obj),
      obj2: obj2De(cle, defauts.obj2),
      mort: mortDe(cle, defauts.mort), modifie: planModifie(cle),
      imprime: {
        tc: defauts.tc, el: (defauts.el || []).slice(), obj: defauts.obj || null,
        obj2: defauts.obj2 || null, mort: !!defauts.mort, num: origine,
      },
      image: `assets/${format === 'PL' || format === 'DEP' ? 'pl' : format === 'GP' ? 'gp' : 'pm'}/${origine}.webp`,
      ...extra,
    });
  };

  for (const s of SCENES) {
    for (const f of FACES) {
      pousse(s.pmNum, f.id, { tc: s.tc, el: s.pm.el, obj: s.pm.obj, obj2: s.pm.obj2, mort: s.mort },
        'PM', s.famille, { scene: s.idx, titre: s.titre || null });
      pousse(s.gpNum, f.id, { tc: s.tc, el: s.gp.el, obj: s.gp.obj, obj2: s.gp.obj2, mort: s.mort },
        'GP', s.famille, { scene: s.idx, titre: s.titre || null });
    }
  }
  for (const p of PLANS_LARGES) {
    pousse(p.num, null, { tc: p.tc, el: p.el, obj: p.obj, obj2: p.obj2, mort: false },
      'PL', 'PLAN LARGE', { brouillon: !!p.brouillon });
  }
  for (const d of DEPARTS) {
    d.faces.forEach((f, k) => pousse(f.num, null, { tc: f.tc, el: f.el, obj: f.obj, obj2: f.obj2, mort: false },
      'DEP', 'DÉPART', { version: d.type, faceDepart: k + 1 }));
  }
  return out;
}

/** Le plan d'une clé donnée, tel qu'il est actuellement. */
export function planDeCle(cle) {
  return catalogue().find((p) => p.cle === cle) || null;
}

/**
 * Les moitiés disponibles pour un appariement, par cadrage. La valeur reste le
 * numéro imprimé — c'est lui qui identifie la moitié —, seule l'étiquette suit
 * une éventuelle renumérotation.
 */
export function moitiesDisponibles(format) {
  return SCENES.map((s) => {
    const origine = format === 'GP' ? s.gpNum : s.pmNum;
    return {
      num: origine,
      affiche: numDe(cleplan(origine, 'R'), origine),
      scene: s.idx,
      famille: s.famille,
      titre: s.titre || null,
    };
  });
}

/**
 * Les numéros portés par plus d'un plan. Renuméroter est libre : c'est ici que
 * l'éditeur va chercher de quoi prévenir.
 */
export function doublonsNumeros() {
  const par = new Map();
  for (const p of catalogue()) {
    if (!par.has(p.num)) par.set(p.num, new Set());
    par.get(p.num).add(`${p.format}${p.numOrigine}`);
  }
  return [...par.entries()]
    .filter(([, s]) => s.size > 1)
    .map(([num, s]) => ({ num, plans: [...s].sort() }))
    .sort((a, b) => a.num - b.num);
}

/**
 * La face jouée d'une carte double se déduit de la pose : la moitié laissée
 * visible se retrouve au bout libre de la carte.
 *
 * Le recto porte le Plan Moyen à gauche et le Gros Plan à droite ; le verso,
 * retourné autour de l'axe vertical, les échange. Un Gros Plan accroché à
 * gauche d'une séquence est donc à gauche de sa carte — c'est le verso ; à
 * droite, c'est le recto. Réglable dans Variables : sans cette lecture, une
 * carte est toujours jouée sur son recto.
 */
export function faceJouee(format, cote, cfg) {
  if (!cfg || cfg.faceSelonPose === false) return 'R';
  if (cote !== 'gauche' && cote !== 'droite') return 'R';
  return (format === 'GP') === (cote === 'gauche') ? 'V' : 'R';
}
