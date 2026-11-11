// ---------------------------------------------------------------------------
// EDIT — variables de partie (règles 4.1)
// ---------------------------------------------------------------------------
// Tout ce qui pilote le déroulé et le décompte. Le Laboratoire fait varier ces
// valeurs pour comparer les équilibrages.

export const DEFAULTS = {
  // --- Déroulé -------------------------------------------------------------
  tours: 12,                 // plans dans le banc, Plan de départ compris
  // Une seule pioche, face cachée, et devant elle la RIVIÈRE : quatre cartes
  // visibles, quel que soit le nombre de joueuses.
  riviere: 4,
  // Avant de choisir sa carte, on peut en défausser une de la rivière au
  // CHUTIER — la défausse face visible —, et la rivière se recomplète.
  defausse: true,
  // Quand la pioche est vide, chaque carte prise dans la rivière est remplacée
  // par la carte du DESSUS du Chutier, une par une. À false, la rivière cesse de
  // se recompléter.
  chutierRiviere: true,
  premierJoueurAleatoire: true,
  premierJoueur: 0,          // qui commence quand le tirage au sort est écarté
  // L'édition des règles par défaut de cette configuration. Quand l'auteur
  // change une règle — la fin de partie passée à douze plans —, une
  // configuration enregistrée avant reprend la nouvelle valeur.
  editionRegles: 2,

  // --- Pose ----------------------------------------------------------------
  // Un banc porte trois séquences, l'une au-dessus de l'autre ; le pouvoir d'un
  // Plan de départ en donne une quatrième.
  sequencesMax: 3,
  // De part et d'autre du CENTRE d'une séquence — le Plan Large ou le Plan de
  // départ qui l'a ouverte —, on n'accroche pas plus de trois CARTES. Un Raccord
  // et le Plan Large qui le suit y comptent : ils prennent une place comme les
  // autres.
  plansParCote: 3,
  // Après un Raccord, on monte un Plan Large — c'est ce qui ouvre la séquence à
  // un second Plan Large — ou un Gros Plan ; jamais un second Raccord. Variante :
  // à true, le bord libre d'un Raccord n'accepte qu'un Plan Large.
  raccordAppellePL: false,

  // --- Décompte ------------------------------------------------------------
  objectifsActifs: {
    RACCORD: true, PLAN: true, FORMAT: true, ELEMENT: true,
    PAIRE: true, MORT: true, ABSENT: true,
    MINUTAGE: true, CHRONO: true, SANS_TC: true, BOUT: true,
    // Les pouvoirs qui comptent des séquences plutôt que des plans.
    SEQ_TAILLE: true, SEQ_VOISINES: true, SEQ_LONGUE: true, SEQ_AVEC: true, SEQ_TOUTES: true,
    // Les pouvoirs du vocabulaire commun : ils comptent tous « une cible »
    // dans une portée, et ne se distinguent que par ce qu'ils en font.
    AILLEURS: true, CENTRE: true, LOT: true, SEUIL: true, ABSENTES: true, DOMINE: true,
    EXTREME: true, PLAN_ICONES: true, DOUBLE: true,
    // Les pouvoirs de RÈGLE. Ils ne rapportent pas de points là où ils sont
    // posés : les décocher n'annule pas un gain, cela retire un droit — plus de
    // prise sur le Chutier, plus de séquence ni de plan supplémentaire, et les
    // Raccords gardent le pouvoir qui leur est imprimé.
    PIOCHER: true, SEQ_PLUS: true, PLAN_PLUS: true, RACCORD_VAUT: true,
  },
  // Une carte peut porter deux fois la même icône. Par défaut chacune compte ;
  // à false, un pouvoir d'icône compte les plans porteurs.
  elementParIcone: true,
  // Chaque pouvoir porte sa propre portée — avant, après, sa séquence, le
  // montage. Celle-ci ne vaut que pour ceux qui ne la précisent pas.
  porteeParDefaut: 'MONTAGE',   // 'SEQUENCE' | 'MONTAGE'
  multiplicateurObjectif: 1,
  scorerDepart: true,           // le Plan de départ compte dans le décompte
  pointsParPlan: 0,

  // --- Matériel ------------------------------------------------------------
  // Deux jeux de matériel coexistent en permanence : la BOÎTE, intouchable, et
  // le MODIFIÉ, qui porte les retouches de l'éditeur. `materielActif` dit lequel
  // se joue — passer de l'un à l'autre ne détruit rien.
  materielActif: 'MODIFIE',   // 'IMPRIME' (la boîte) | 'MODIFIE'
  // `plans` surcharge le minutage, les icônes et le pouvoir d'un plan, indexé
  // par sa clé (« GP13 », « 5 ») ; `paires` refait l'assemblage d'une carte à
  // deux Gros Plans, indexé par son rang. `ajouts` porte les cartes créées et
  // `retires` celles qu'on a supprimées : ces deux-là ne sont pas des retouches
  // mais la composition du matériel, et valent pour les deux jeux.
  boite: '4.1',
  materiel: {
    plans: {}, paires: {},
    ajouts: { scenes: [], larges: [], departs: [], paires: [] },
    retires: [],
  },
  // Les cartes écartées de la boîte, par identifiant. Vaut pour les deux jeux :
  // c'est la composition du paquet, pas une retouche de carte.
  cartesDesactivees: [],

  // --- Affichage -----------------------------------------------------------
  pointsSurCartes: true,  // le jeton de points au coin des plans du montage
  // La fiche qui s'ouvre au survol d'une carte.
  apercuSurvol: false,
  // Les joueuses jouent l'une après l'autre et cela se voit : chaque coup est
  // rendu, et la carte vole de la rivière jusqu'au banc.
  animerCoups: true,
  dureeVol: 620,          // ms — le trajet d'une carte, arc compris

  // --- Divers --------------------------------------------------------------
  graine: '',
  vitesseIA: 320,         // ms — la pause avant qu'une IA ne joue son coup
};

export const PROFILS_IA = {
  NOVICE:    { id: 'NOVICE',    label: 'IA — Novice',    profondeur: 0, bruit: 0.55 },
  EQUILIBRE: { id: 'EQUILIBRE', label: 'IA — Équilibré', profondeur: 1, bruit: 0.12 },
  STRATEGE:  { id: 'STRATEGE',  label: 'IA — Stratège',  profondeur: 2, bruit: 0.0 },
};

// Palette des joueuses : violet, bleu, rose, orange, en teintes pastel.
// `clair` habille la pastille, `encre` sert au texte, où le pastel manquerait
// de contraste.
// Les quatre couleurs de la feuille de score, dans son ordre : la bande claire
// de chaque colonne, et l'onglet « TOTAL », plus soutenu, pour les textes.
export const PALETTE_JOUEURS = [
  { nom: 'Violet',    clair: '#d19ad3', encre: '#87499e' },
  { nom: 'Turquoise', clair: '#9cd3d3', encre: '#46a197' },
  { nom: 'Vert',      clair: '#b3d69a', encre: '#87a34a' },
  { nom: 'Rouge',     clair: '#d4a59c', encre: '#a24550' },
];

export const COULEURS_JOUEURS = PALETTE_JOUEURS.map((p) => p.clair);

/** Teinte lisible sur fond blanc pour une couleur de joueuse. */
export function encreDe(couleur) {
  const p = PALETTE_JOUEURS.find((x) => x.clair === couleur);
  return p ? p.encre : couleur;
}

export function cloneConfig(src = DEFAULTS) {
  return JSON.parse(JSON.stringify(src));
}

const MATERIEL_VIDE = () => ({
  plans: {}, paires: {}, retires: [],
  ajouts: { scenes: [], larges: [], departs: [], paires: [] },
});

/**
 * Une configuration enregistrée hier, relue aujourd'hui.
 *
 * — Seules les variables qui existent encore sont gardées : un réglage d'une
 *   version précédente du jeu ne pilote plus rien, et ne doit pas rester dans
 *   la sauvegarde.
 * — Les retouches de matériel sont rangées par clé de plan. Celles d'une boîte
 *   précédente désignent des cartes qui n'existent plus : elles sont écartées,
 *   avec la liste des cartes désactivées.
 */
export function migrerCfg(lu) {
  if (!lu || typeof lu !== 'object') return {};
  const out = {};
  for (const k of Object.keys(DEFAULTS)) if (lu[k] !== undefined) out[k] = lu[k];
  // `publieAdopte` n'est pas une variable de partie mais la mémoire de la
  // dernière configuration publiée qu'on a adoptée : elle se garde.
  if (lu.publieAdopte !== undefined) out.publieAdopte = lu.publieAdopte;
  // Une configuration d'une édition précédente des règles reprend les valeurs
  // que l'auteur a changées depuis.
  if ((Number(lu.editionRegles) || 1) < DEFAULTS.editionRegles) {
    delete out.tours;
    out.editionRegles = DEFAULTS.editionRegles;
  }
  if (lu.boite !== DEFAULTS.boite) {
    delete out.materiel;
    delete out.cartesDesactivees;
    delete out.sequencesMax;
    delete out.plansParCote;
    out.boite = DEFAULTS.boite;
  }
  // `objectifsActifs` est écrasé en bloc par Object.assign : une table
  // enregistrée avant l'arrivée d'un pouvoir ne le connaît pas. Un pouvoir
  // inconnu de la table est actif — c'est le défaut de tous.
  if (out.objectifsActifs && typeof out.objectifsActifs === 'object') {
    const garde = {};
    for (const k of Object.keys(DEFAULTS.objectifsActifs)) {
      garde[k] = out.objectifsActifs[k] !== undefined ? !!out.objectifsActifs[k] : true;
    }
    out.objectifsActifs = garde;
  }
  if (out.materiel && typeof out.materiel === 'object') {
    out.materiel = {
      ...MATERIEL_VIDE(),
      ...out.materiel,
      ajouts: { ...MATERIEL_VIDE().ajouts, ...(out.materiel.ajouts || {}) },
    };
  }
  return out;
}

export const SCHEMA = [
  { groupe: 'Version du jeu', champs: [
    { k: 'materielActif', l: 'Matériel en jeu', t: 'choix', options: [
      ['IMPRIME', 'Boîte 4.1 — les cartes telles que livrées'],
      ['MODIFIE', 'Boîte modifiée — avec les retouches du Matériel'],
    ], aide: 'les cartes se retouchent, s’écartent et se publient dans le Matériel' },
  ] },
  { groupe: 'Déroulé', champs: [
    { k: 'tours', l: 'Plans dans le banc', t: 'int', min: 2, max: 30,
      aide: 'douze par les règles, Plan de départ compris : le premier banc qui les a déclenche la fin' },
    { k: 'riviere', l: 'Cartes visibles dans la rivière', t: 'int', min: 1, max: 8,
      aide: 'quatre par les règles, quel que soit le nombre de joueuses' },
    { k: 'defausse', l: 'On peut défausser une carte au Chutier', t: 'bool',
      aide: 'avant de choisir sa carte, on peut en écarter une de la rivière ; elle part au Chutier, '
        + 'face visible, et la rivière se recomplète' },
    { k: 'chutierRiviere', l: 'Pioche vide : le Chutier recomplète la rivière', t: 'bool',
      aide: 'chaque carte prise est remplacée par la carte du dessus du Chutier, une par une — et l’on ne '
        + 'défausse plus ; décoché, la rivière cesse de se recompléter' },
    { k: 'premierJoueurAleatoire', l: 'Première joueuse tirée au sort', t: 'bool' },
    { k: 'premierJoueur', l: 'Sinon, qui commence', t: 'int', min: 0, max: 3,
      aide: 'le rang de la joueuse, 0 pour la première de la liste' },
  ] },
  { groupe: 'Rythme', champs: [
    { k: 'animerCoups', l: 'Voir les cartes se déplacer', t: 'bool',
      aide: 'la carte quitte la rivière et vole jusqu’au banc' },
    { k: 'vitesseIA', l: 'Pause avant le coup d’une IA', t: 'int', min: 0, max: 2000, aide: 'en millisecondes' },
    { k: 'dureeVol', l: 'Durée du vol d’une carte', t: 'int', min: 0, max: 2000, aide: 'en millisecondes' },
  ] },
  { groupe: 'Pose', champs: [
    { k: 'sequencesMax', l: 'Séquences dans un banc', t: 'int', min: 1, max: 12,
      aide: 'trois par les règles — une par ligne, chacune ouverte par un Plan Large ; le pouvoir '
        + '« +1 Séquence » en donne une de plus à qui le porte' },
    { k: 'plansParCote', l: 'Cartes de chaque côté du centre', t: 'int', min: 1, max: 12,
      aide: 'trois par les règles, à gauche comme à droite du Plan Large — ou du Plan de départ — '
        + 'qui a ouvert la séquence. Un Raccord, et le Plan Large posé après lui, y comptent' },
    { k: 'raccordAppellePL', l: 'Variante — après un Raccord, seul un Plan Large', t: 'bool',
      aide: 'par les règles, un Plan Large ou un Gros Plan peut suivre un Raccord — jamais un second '
        + 'Raccord ; cochée, le bord libre d’un Raccord n’accepte plus qu’un Plan Large' },
  ] },
  { groupe: 'Décompte', champs: [
    { k: 'porteeParDefaut', l: 'Portée des pouvoirs', t: 'choix', options: [
      ['SEQUENCE', 'La séquence porteuse'], ['MONTAGE', 'Le montage entier'],
    ], aide: 'seulement pour les pouvoirs qui ne la précisent pas' },
    { k: 'multiplicateurObjectif', l: 'Multiplicateur des pouvoirs', t: 'float', min: 0, max: 5, pas: 0.25 },
    { k: 'scorerDepart', l: 'Le Plan de départ rapporte', t: 'bool' },
    { k: 'elementParIcone', l: 'Compter chaque icône, pas chaque plan', t: 'bool',
      aide: 'une carte à deux armes compte deux fois' },
    { k: 'pointsParPlan', l: 'Points fixes par plan visible', t: 'int', min: 0, max: 5 },
  ] },
  { groupe: 'Divers', champs: [
    { k: 'graine', l: 'Graine de partie', t: 'texte', aide: 'vide = tirage aléatoire ; une graine rejoue la même distribution' },
  ] },
];
