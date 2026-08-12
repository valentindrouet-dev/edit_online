// ---------------------------------------------------------------------------
// EDIT — variables de partie
// ---------------------------------------------------------------------------
// Tout ce qui pilote le déroulé et le décompte. Le Laboratoire fait varier ces
// valeurs pour comparer les équilibrages.

import { ELEMENT_IDS } from './data.js?v=1.14';

export const DEFAULTS = {
  // --- Déroulé -------------------------------------------------------------
  tours: 10,                 // la partie s'arrête au 10e plan posé
  chutierPL: 0,              // taille du Chutier Plans Larges — 0 = nb de joueuses
  chutierPMGP: 0,            // taille du Chutier Plans Moyens / Gros Plans
  piocheDirectePL: false,    // piocher au sommet de la pioche Plans Larges
  piocheDirectePMGP: true,   // piocher au sommet de la pioche PM / GP
  // Les Plans de départ ne se tirent pas : chaque joueuse a toujours les deux
  // versions A et B devant elle, donc les quatre faces au choix.
  premierJoueurAleatoire: true,

  // --- Pose ----------------------------------------------------------------
  sensPose: 'bords',         // 'bords' (les deux bouts d'une séquence) | 'droite'
  plNouvelleSequence: true,  // un Plan Large ouvre toujours une nouvelle séquence
  plContigu: false,          // autoriser deux Plans Larges côte à côte
  raccordConnecte: true,     // une Carte Raccord peut souder deux séquences
  generiqueBloque: true,     // rien avant l'Ouverture, rien après les Crédits

  // --- Décompte ------------------------------------------------------------
  objectifsActifs: {
    RACCORD: true, PLAN: true, FORMAT: true, ELEMENT: true,
    PAIRE: true, MORT: true, NEANT: true, ABSENT: true,
  },
  // Les règles ne précisent la portée que pour le Raccord (« dans sa
  // séquence ») et le Générique (« dans le montage »). Les autres bandeaux
  // sont lus par défaut sur le montage entier — basculer sur SEQUENCE pour
  // tester l'autre lecture.
  porteeParDefaut: 'MONTAGE',   // 'SEQUENCE' | 'MONTAGE'
  multiplicateurObjectif: 1,
  scorerDepart: true,           // le Plan de départ compte dans le décompte
  pointsParPlan: 0,

  // --- Variante : raccord par élément partagé ------------------------------
  // Absente des règles officielles, proposée pour tester une autre économie.
  raccordElement: false,
  raccordMin: 1,
  raccordElementPoints: 1,

  // --- Variante : chronologie ---------------------------------------------
  chronoBonus: 0,
  chronoMalus: 0,
  chronoIgnoreZero: true,

  // --- Composition du paquet ----------------------------------------------
  exemplairesDouble: 1,
  exemplairesPL: 1,
  retirerBrouillons: false,  // les Plans Larges 101 et 102 restent dans le paquet
  filtreFamilles: {
    TRANSITION: true, MORT: true, ARME: true, VEHICULE: true, OBJET: true, PERSONNAGE: true,
  },
  poidsElements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 1])),

  // --- Matériel ------------------------------------------------------------
  // Deux jeux de matériel coexistent en permanence : l'IMPRIMÉ, intouchable,
  // et le MODIFIÉ, qui porte les retouches de l'éditeur. `materielActif` dit
  // lequel se joue — passer de l'un à l'autre ne détruit rien.
  materielActif: 'IMPRIME',   // 'IMPRIME' | 'MODIFIE'
  // `plans` surcharge le minutage, les icônes et le bandeau d'un plan, indexé
  // par sa clé (numéro + face : « 201R », « 201V », « 101 ») ; `paires` refait
  // l'appariement Plan Moyen / Gros Plan d'une carte, indexé par son rang.
  materiel: { plans: {}, paires: {} },
  // Les cartes écartées de la boîte, par identifiant. Vaut pour les deux jeux :
  // c'est la composition du paquet, pas une retouche de carte.
  cartesDesactivees: [],
  // Le recto et le verso d'une carte double ne portent pas le même minutage.
  // La face jouée se déduit du bout où la moitié visible se retrouve ; sans
  // cette lecture, une carte est toujours jouée sur son recto.
  faceSelonPose: true,

  // --- Affichage -----------------------------------------------------------
  illustrations: true,    // les visuels imprimés sur les cartes

  // --- Divers --------------------------------------------------------------
  graine: '',
  vitesseIA: 500,
};

export const PROFILS_IA = {
  NOVICE:    { id: 'NOVICE',    label: 'IA — Novice',    profondeur: 0, bruit: 0.55 },
  EQUILIBRE: { id: 'EQUILIBRE', label: 'IA — Équilibré', profondeur: 1, bruit: 0.12 },
  STRATEGE:  { id: 'STRATEGE',  label: 'IA — Stratège',  profondeur: 2, bruit: 0.0 },
};

// Palette des joueuses : violet, bleu, rose, orange, en teintes pastel.
// `clair` habille la pastille, `encre` sert au texte, où le pastel manquerait
// de contraste.
export const PALETTE_JOUEURS = [
  { nom: 'Violet', clair: '#c3b1f2', encre: '#7c5cd6' },
  { nom: 'Bleu',   clair: '#a7cdf5', encre: '#3f7fc4' },
  { nom: 'Rose',   clair: '#f5b3cd', encre: '#cf5f92' },
  { nom: 'Orange', clair: '#fbc79a', encre: '#d47b2c' },
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

export const SCHEMA = [
  { groupe: 'Déroulé', champs: [
    { k: 'tours', l: 'Nombre de plans posés', t: 'int', min: 1, max: 30, aide: 'la partie s’arrête à la fin de ce tour' },
    { k: 'chutierPL', l: 'Chutier Plans Larges', t: 'int', min: 0, max: 8, aide: '0 = autant que de joueuses' },
    { k: 'chutierPMGP', l: 'Chutier Plans Moyens / Gros Plans', t: 'int', min: 0, max: 8, aide: '0 = autant que de joueuses' },
    { k: 'piocheDirectePMGP', l: 'Pioche PM / GP accessible au sommet', t: 'bool' },
    { k: 'piocheDirectePL', l: 'Pioche Plans Larges accessible au sommet', t: 'bool' },
    { k: 'premierJoueurAleatoire', l: 'Première joueuse tirée au sort', t: 'bool' },
  ] },
  { groupe: 'Pose', champs: [
    { k: 'sensPose', l: 'Sens de pose', t: 'choix', options: [
      ['bords', 'Aux deux bouts d’une séquence'], ['droite', 'À droite seulement'],
    ] },
    { k: 'plNouvelleSequence', l: 'Un Plan Large ouvre une séquence', t: 'bool' },
    { k: 'plContigu', l: 'Deux Plans Larges peuvent se toucher', t: 'bool' },
    { k: 'raccordConnecte', l: 'Une Carte Raccord soude deux séquences', t: 'bool' },
    { k: 'generiqueBloque', l: 'Le Générique ferme le montage', t: 'bool' },
    { k: 'faceSelonPose', l: 'La face jouée suit le sens de pose', t: 'bool',
      aide: 'sinon une carte est toujours jouée sur son recto' },
  ] },
  { groupe: 'Décompte', champs: [
    { k: 'porteeParDefaut', l: 'Portée des bandeaux', t: 'choix', options: [
      ['SEQUENCE', 'La séquence porteuse'], ['MONTAGE', 'Le montage entier'],
    ], aide: 'le Générique compte toujours sur le montage entier' },
    { k: 'multiplicateurObjectif', l: 'Multiplicateur des bandeaux', t: 'float', min: 0, max: 5, pas: 0.25 },
    { k: 'scorerDepart', l: 'Le Plan de départ rapporte', t: 'bool' },
    { k: 'pointsParPlan', l: 'Points fixes par plan visible', t: 'int', min: 0, max: 5 },
  ] },
  { groupe: 'Variante — raccord par élément', champs: [
    { k: 'raccordElement', l: 'Activer', t: 'bool', aide: 'hors règles officielles' },
    { k: 'raccordMin', l: 'Éléments partagés nécessaires', t: 'int', min: 1, max: 4 },
    { k: 'raccordElementPoints', l: 'Points par jonction raccordée', t: 'int', min: 0, max: 10 },
  ] },
  { groupe: 'Variante — chronologie', champs: [
    { k: 'chronoBonus', l: 'Bonus par paire dans l’ordre', t: 'int', min: 0, max: 10 },
    { k: 'chronoMalus', l: 'Malus par paire à contresens', t: 'int', min: 0, max: 10 },
    { k: 'chronoIgnoreZero', l: 'Les plans à 00:00 sont neutres', t: 'bool' },
  ] },
  { groupe: 'Paquet', champs: [
    { k: 'exemplairesDouble', l: 'Exemplaires des cartes PM / GP', t: 'int', min: 1, max: 4 },
    { k: 'exemplairesPL', l: 'Exemplaires des Plans Larges', t: 'int', min: 0, max: 4 },
    { k: 'retirerBrouillons', l: 'Écarter les Plans Larges 101 et 102', t: 'bool' },
  ] },
];
