// ---------------------------------------------------------------------------
// EDIT — les GABARITS : le dessin des cartes, en données
// ---------------------------------------------------------------------------
// Une carte se dessine à partir de deux choses : ce qu'elle PORTE — minutage,
// icônes, pouvoir, illustration, tout ce que le Matériel règle — et COMMENT on
// le pose sur le carton — l'affaire du gabarit. Le gabarit ne sait rien d'une
// carte en particulier : il dit où va le minutage, dans quelle police, sur
// quel fond, et le site en tire toutes les cartes du jeu d'un coup.
//
// Tout se mesure en MILLIMÈTRES, sur le carton réel. Le FORMAT est celui du
// gabarit : 88 × 63 mm pour les cartes du Set 3.1, 120 × 80 mm pour les
// nouvelles. Une carte Plan Moyen / Gros Plan est faite de deux moitiés — le
// Gros Plan a sa largeur, le Plan Moyen le reste —, et chacune a son gabarit.
// Les mesures de départ sont celles des cartes du Set 3.1 : 1 mm de noir tout
// autour, la boîte du minutage en haut à gauche, la languette des icônes, le
// bandeau du pouvoir, le type de plan écrit dans la bande noire du bas.

/** Les formats : la carte entière, et la largeur de sa moitié Gros Plan. */
export const FORMAT_31 = { largeur: 88, hauteur: 63, gp: 29.5 };
export const FORMAT_120 = { largeur: 120, hauteur: 80, gp: 40 };

/** Le format d'un gabarit — ou d'un format donné tel quel. Sans format, c'est celui du Set 3.1. */
export function formatDe(g) {
  const f = g && (g.format || (g.largeur ? g : null));
  return f && f.largeur > 0 && f.hauteur > 0 ? { gp: f.largeur / 3, ...f } : FORMAT_31;
}

export const hauteurDe = (g) => formatDe(g).hauteur;

export const MISES = [
  { id: 'PL', label: 'Plan Large' },
  { id: 'DEP', label: 'Plan de départ' },
  { id: 'PM', label: 'Plan Moyen' },
  { id: 'GP', label: 'Gros Plan' },
  { id: 'PM-TR', label: 'Raccord · Plan Moyen' },
  { id: 'GP-TR', label: 'Raccord · Gros Plan' },
  { id: 'DOS', label: 'Dos des Plans Larges' },
];

/** La largeur d'une mise en page, dans le format du gabarit `g`. */
export function largeurMise(cle, g) {
  const f = formatDe(g);
  if (cle === 'GP' || cle === 'GP-TR') return f.gp;
  if (cle === 'PM' || cle === 'PM-TR') return Math.round((f.largeur - f.gp) * 100) / 100;
  return f.largeur;
}

/**
 * La mise en page d'un plan. Un Raccord — Ouverture et Générique de fin
 * compris — a la sienne : il n'a ni la couleur ni le libellé d'un plan.
 */
export function cleMise(h) {
  if (!h) return 'PM';
  if (h.format === 'DOS') return 'DOS';
  if (h.format === 'PL') return 'PL';
  if (h.format === 'DEP' || h.depart) return 'DEP';
  return `${h.format === 'GP' ? 'GP' : 'PM'}${h.transition ? '-TR' : ''}`;
}

// --- Les polices -------------------------------------------------------------
// Toutes LIBRES (licence SIL OFL 1.1) et servies par le site lui-même, dans
// assets/polices : un export ne peut pas aller chercher une police ailleurs, et
// l'impression doit montrer exactement ce que l'écran montre. Une police n'est
// téléchargée que si un gabarit s'en sert.
export const POLICES = [
  { famille: 'DSEG7 Classic', dossier: 'dseg7', note: 'afficheur à segments — le minutage', fichiers: [[400, 'normal'], [700, 'normal'], [400, 'italic'], [700, 'italic']] },
  { famille: 'Montserrat', dossier: 'montserrat', fichiers: [[400, 'normal'], [400, 'italic'], [700, 'normal'], [700, 'italic'], [800, 'normal'], [800, 'italic'], [900, 'normal'], [900, 'italic']] },
  { famille: 'Inter', dossier: 'inter', fichiers: [[400, 'normal'], [400, 'italic'], [600, 'normal'], [600, 'italic'], [700, 'normal'], [700, 'italic'], [800, 'normal'], [800, 'italic'], [900, 'normal'], [900, 'italic']] },
  { famille: 'Oswald', dossier: 'oswald', fichiers: [[400, 'normal'], [500, 'normal'], [600, 'normal'], [700, 'normal']] },
  { famille: 'Bebas Neue', dossier: 'bebas-neue', fichiers: [[400, 'normal']] },
  { famille: 'Anton', dossier: 'anton', fichiers: [[400, 'normal']] },
  { famille: 'Archivo Black', dossier: 'archivo-black', fichiers: [[400, 'normal']] },
  { famille: 'Barlow Condensed', dossier: 'barlow-condensed', fichiers: [[400, 'normal'], [400, 'italic'], [600, 'normal'], [600, 'italic'], [700, 'normal'], [700, 'italic'], [800, 'normal'], [800, 'italic'], [900, 'normal'], [900, 'italic']] },
  { famille: 'Roboto Condensed', dossier: 'roboto-condensed', fichiers: [[400, 'normal'], [400, 'italic'], [700, 'normal'], [700, 'italic'], [900, 'normal'], [900, 'italic']] },
  { famille: 'Teko', dossier: 'teko', fichiers: [[400, 'normal'], [600, 'normal'], [700, 'normal']] },
  { famille: 'Orbitron', dossier: 'orbitron', fichiers: [[400, 'normal'], [700, 'normal'], [900, 'normal']] },
  { famille: 'Russo One', dossier: 'russo-one', fichiers: [[400, 'normal']] },
  { famille: 'Black Ops One', dossier: 'black-ops-one', fichiers: [[400, 'normal']] },
  { famille: 'Bangers', dossier: 'bangers', fichiers: [[400, 'normal']] },
  { famille: 'Courier Prime', dossier: 'courier-prime', fichiers: [[400, 'normal'], [400, 'italic'], [700, 'normal'], [700, 'italic']] },
  { famille: 'Special Elite', dossier: 'special-elite', fichiers: [[400, 'normal']] },
];

/** Les polices de l'ordinateur : elles ne voyagent pas, l'export les remplace. */
/**
 * La typographie des pouvoirs sur les cartes imprimées : Verdana gras, blanc,
 * cerné de noir. Le contour se compte en POUR CENT DU CORPS — les 4 px du
 * fichier de l'auteur, mesurés sur son extrait, en font 7 % — : il suit ainsi
 * chaque mot, qu'il soit grand comme le « × » ou petit comme « avec ».
 */
export const TYPO_POUVOIR = { police: 'Verdana', graisse: 700, couleur: '#ffffff', signe: 'x', trait: 0.3, contourCouleur: '#000000' };

/** Le cerne des icônes : le même que celui des mots. */
export const CERNE_ICONES = { trait: TYPO_POUVOIR.trait, contourCouleur: TYPO_POUVOIR.contourCouleur };

export const POLICES_SYSTEME = ['Arial', 'Arial Black', 'Impact', 'Georgia', 'Verdana', 'Courier New'];

export const policeLocale = (f) => POLICES.find((p) => p.famille === f) || null;

// --- Les icônes et logos de l'auteur ---------------------------------------------
// Une image importée porte un NOM ; « [nom] » la place dans un texte ou un
// pouvoir. Un nom d'icône du jeu la remplace partout où le jeu la dessine.
export const ICONES_JEU = {
  heroine: 'HEROINE', ennemi: 'ENNEMI', allie: 'ALLIE', objet: 'OBJET', arme: 'ARME',
  vehicule: 'VEHICULE', mort: 'MORT',
};

const sansAccents = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Le nom d'une icône : en minuscules, sans accents ni espaces — « Héroïne.png » → heroine. */
export const nomIcone = (s) => sansAccents(s).toLowerCase().trim().replace(/\.(png|jpe?g|webp|gif|svg|avif)$/, '')
  .replace(/[^a-z0-9:]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * L'empreinte d'un pouvoir : deux plans qui portent exactement le même pouvoir
 * partagent son texte écrit à la main. Les clés sont triées, pour qu'un même
 * pouvoir donne toujours la même empreinte.
 */
export function signaturePouvoir(o) {
  if (!o) return '';
  const tri = (v) => (Array.isArray(v) ? v.map(tri) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, tri(v[k])])) : v);
  return JSON.stringify(tri(o));
}

/** Les jetons qu'un texte ou un pouvoir peut citer, pour l'aide-mémoire de l'Atelier. */
export const JETONS = [
  ['[2]', 'une valeur — [1], [6], [-5]…'], ['[x]', 'le ×'],
  ['[<]', 'flèche à gauche'], ['[>]', 'flèche à droite'], ['[<<]', 'tout ce qui précède'], ['[>>]', 'toute la suite'],
  ['[seq]', 'Séquence'], ['[pl]', 'Plan Large'], ['[pm]', 'Plan Moyen'], ['[gp]', 'Gros Plan'], ['[dep]', 'Plan de départ'],
  ['[raccord]', 'Raccord'], ['[plan]', 'Plan'], ['[carte]', 'Carte'], ['[timecode]', 'Timecode'],
  ['[heroine]', 'Héroïne'], ['[ennemi]', 'Ennemi'], ['[allie]', 'Allié'], ['[objet]', 'Objet'],
  ['[arme]', 'Arme'], ['[vehicule]', 'Véhicule'], ['[mort]', 'Mort'],
  ['[non:allie]', 'barré d’une croix — « sans »'],
];

// --- Ce qu'un texte peut citer -----------------------------------------------
// Un élément texte écrit ce qu'on veut, et peut citer la carte : `{cadrage}`
// devient « Plan Moyen », `{num}` son numéro. C'est ainsi que le libellé du bas
// est un texte comme un autre — qu'on déplace, qu'on change de police, ou
// qu'on remplace par autre chose.
export const CHAMPS_TEXTE = [
  ['{cadrage}', 'le type de plan — « Plan Moyen »'],
  ['{num}', 'le numéro du plan'],
  ['{titre}', 'le titre d’un Raccord — « BBG présente », « Fin »'],
  ['{minutage}', 'le minutage, en texte'],
  ['{set}', 'le set de cartes'],
  ['{version}', 'le nom du gabarit et sa version'],
];

// --- Le gabarit de départ ----------------------------------------------------

const COULEURS = {
  PL: { bande: '#8dcd68', texte: '#8fe45c' },
  DEP: { bande: '#7fc4e8', texte: '#6cc6f2' },
  PM: { bande: '#f3b531', texte: '#f7b52b' },
  GP: { bande: '#ec7d4f', texte: '#f2793a' },
  TR: { bande: '#b9b3ae', texte: '#cfd0d6' },
};

/** Les éléments d'une face, mesurés sur les cartes du Set 3.1. */
function elementsDe(W, c) {
  return [
    { id: 'illustration', type: 'illustration', nom: 'Illustration', x: 1, y: 1, w: W - 2, h: 50.6,
      ancrage: 'haut', rayon: 0 },
    { id: 'minutage', type: 'minutage', nom: 'Minutage', x: 1.4, y: 1.5, w: 16.4, h: 5.4,
      fond: '#090909', bord: 0.3, bordCouleur: '#8b9098', rayon: 0.9,
      police: 'DSEG7 Classic', graisse: 700, italique: false, taille: 3.6, couleur: '#ff4a2a',
      couleurSpeciale: '#59b9ff', lueur: true, alignement: 'centre' },
    { id: 'icones', type: 'icones', nom: 'Icônes', x: 1, y: 42.6, w: Math.min(W - 2, 40), h: 8.7,
      fond: c.bande, texture: 'papier', dechire: true, rayon: 0.3, tailleIcones: 76, espacement: 1.2,
      alignement: 'gauche', ajuste: true, ...CERNE_ICONES },
    { id: 'bandeau', type: 'bandeau', nom: 'Pouvoir', x: 1, y: 51.3, w: W - 2, h: 7.7,
      fond: c.bande, texture: 'papier', echelle: 1, ...TYPO_POUVOIR },
    { id: 'libelle', type: 'texte', nom: 'Type de plan', texte: '{cadrage}', x: 1, y: 59.1, w: W - 2, h: 3.6,
      police: 'Montserrat', graisse: 900, italique: true, majuscules: true, taille: 3.1,
      couleur: c.texte, alignement: 'centre', ombre: true },
  ];
}

function miseDe(W, c) {
  return { carte: { fond: '#0b0b0b' }, elements: elementsDe(W, c) };
}

/**
 * Un Raccord n'a pas d'icônes ; son second pouvoir — le « −5 si ◀ Plan Large »
 * du 290 — se pose dans l'onglet, au-dessus du bandeau qui porte le premier.
 */
function miseRaccord(W, c) {
  const m = miseDe(W, c);
  const b = m.elements.find((e) => e.id === 'bandeau');
  b.quel = 'premier';
  m.elements.splice(m.elements.indexOf(b) + 1, 0, {
    id: 'bandeau2', type: 'bandeau', nom: 'Second pouvoir', quel: 'second',
    x: 1, y: 43, w: Math.min(W - 2, 26), h: 7.7, fond: c.bande, texture: 'papier', dechire: true, rayon: 0.3, echelle: 1,
    ...TYPO_POUVOIR,
  });
  return m;
}

/** Le dos d'une pioche de Plans Larges : la couleur du cadrage, le nom du jeu. */
function miseDos() {
  return {
    carte: { fond: '#0b0b0b' },
    elements: [
      { id: 'fond-dos', type: 'forme', nom: 'Fond', x: 1, y: 1, w: 86, h: 61, fond: COULEURS.PL.bande,
        texture: 'papier', rayon: 1.2 },
      { id: 'titre-dos', type: 'texte', nom: 'Nom du jeu', texte: 'EDIT', x: 4, y: 14, w: 80, h: 26,
        police: 'Anton', graisse: 400, taille: 24, couleur: '#ffffff', alignement: 'centre',
        majuscules: true, ombre: true, interlettre: 0.06 },
      { id: 'type-dos', type: 'texte', nom: 'Pioche', texte: 'Plans Larges', x: 4, y: 42, w: 80, h: 7,
        police: 'Montserrat', graisse: 900, italique: true, majuscules: true, taille: 4.6,
        couleur: '#1d3a12', alignement: 'centre' },
    ],
  };
}

/** Le gabarit de départ : les cartes du Set 3.1, refaites en données. */
export function gabaritDeBase() {
  return {
    nom: 'Cartes 3.1',
    format: { ...FORMAT_31 },
    // Le rayon des coins du carton, à l'écran seulement : l'impression les
    // laisse droits, c'est la découpe qui les arrondit.
    coins: 3,
    mises: {
      PL: miseDe(88, COULEURS.PL),
      DEP: miseDe(88, COULEURS.DEP),
      PM: miseDe(58.5, COULEURS.PM),
      GP: miseDe(29.5, COULEURS.GP),
      'PM-TR': miseRaccord(58.5, COULEURS.TR),
      'GP-TR': miseRaccord(29.5, COULEURS.TR),
      DOS: miseDos(),
    },
  };
}

/**
 * Les versions PUBLIÉES — celles que tout le monde voit. Un essai fait dans
 * l'Atelier vit dans le navigateur qui l'a fait ; « 📋 Copier le gabarit » le
 * met en texte, et c'est ainsi qu'il entre ici, comme version suivante.
 */
/**
 * Un gabarit porté à un autre format : chaque calque garde sa PLACE — en
 * proportion de la largeur de sa mise et de la hauteur de la carte —, et ce
 * qui se mesure en épaisseur — corps du texte, contour, arrondi, bordure —
 * suit la hauteur, pour que le texte grandisse avec la boîte qui le porte.
 */
export function mettreAuFormat(g, format) {
  const out = JSON.parse(JSON.stringify(g));
  const avant = formatDe(g);
  const apres = formatDe(format);
  const r = (v) => Math.round(v * 100) / 100;
  const ky = apres.hauteur / avant.hauteur;
  for (const m of MISES) {
    const mise = out.mises && out.mises[m.id];
    if (!mise) continue;
    const kx = largeurMise(m.id, apres) / largeurMise(m.id, avant);
    for (const e of mise.elements || []) {
      e.x = r(e.x * kx); e.w = r(e.w * kx); e.y = r(e.y * ky); e.h = r(e.h * ky);
      for (const k of ['taille', 'trait', 'rayon', 'bord', 'espacement']) if (typeof e[k] === 'number') e[k] = r(e[k] * ky);
    }
  }
  out.format = { largeur: apres.largeur, hauteur: apres.hauteur, gp: apres.gp };
  return out;
}

export const VERSIONS_GABARIT = [
  { id: 'v2', nom: 'Cartes 120 × 80', date: '26/10/2026',
    gabarit: { ...mettreAuFormat(gabaritDeBase(), FORMAT_120), nom: 'Cartes 120 × 80' } },
  { id: 'v1', nom: 'Cartes 3.1 — 88 × 63', date: '15/10/2026', gabarit: gabaritDeBase() },
];

export const VERSION_DEFAUT = 'v2';

export const versionPubliee = (id) => VERSIONS_GABARIT.find((v) => v.id === id) || null;

/**
 * Un gabarit tel qu'on l'a enregistré peut dater d'avant un élément ou une
 * mise : on complète ce qui manque par la version de départ, sans toucher à ce
 * qui est là.
 */
export function normaliserGabarit(g) {
  const out = g && typeof g === 'object' ? JSON.parse(JSON.stringify(g)) : gabaritDeBase();
  // Un gabarit d'avant les formats est au format du Set 3.1 ; ce qui lui
  // manque se complète à SON format.
  out.format = formatDe(out);
  const base = mettreAuFormat(gabaritDeBase(), out.format);
  if (!out.mises || typeof out.mises !== 'object') out.mises = {};
  for (const m of MISES) {
    const mise = out.mises[m.id];
    if (!mise || !Array.isArray(mise.elements)) out.mises[m.id] = base.mises[m.id];
    else if (!mise.carte) mise.carte = { ...base.mises[m.id].carte };
  }
  if (typeof out.coins !== 'number') out.coins = base.coins;
  // Un bandeau d'avant la typographie des pouvoirs la reçoit, une languette
  // d'avant le cerne le reçoit — sans toucher à ce qu'on leur aurait choisi.
  // Le contour de la 2.53 se comptait en % du corps : il devient une épaisseur.
  for (const m of Object.values(out.mises)) {
    for (const e of m.elements || []) {
      if (e.contour !== undefined) {
        if (e.trait === undefined) e.trait = e.type === 'texte' ? Math.round((e.contour / 100) * (e.taille || 3) * 100) / 100 : TYPO_POUVOIR.trait;
        delete e.contour;
      }
      const defauts = e.type === 'bandeau' ? TYPO_POUVOIR : e.type === 'icones' ? CERNE_ICONES : null;
      if (defauts) for (const [k, v] of Object.entries(defauts)) if (e[k] === undefined) e[k] = v;
    }
  }
  if (!Array.isArray(out.icones)) out.icones = [];
  if (!Array.isArray(out.fonds)) out.fonds = [];
  if (!out.textes || typeof out.textes !== 'object') out.textes = {};
  if (!out.nom) out.nom = base.nom;
  return out;
}
