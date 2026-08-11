// ---------------------------------------------------------------------------
// EDIT — variables de partie
// ---------------------------------------------------------------------------
// Tout ce qui pilote le déroulé et le décompte. Le Laboratoire fait varier ces
// valeurs pour comparer les équilibrages.

import { ELEMENT_IDS } from './data.js';

export const DEFAULTS = {
  // --- Déroulé -------------------------------------------------------------
  tours: 10,                 // la partie s'arrête au 10e plan posé
  chutierPL: 0,              // taille du Chutier Plans Larges — 0 = nb de joueuses
  chutierPMGP: 0,            // taille du Chutier Plans Moyens / Gros Plans
  piocheDirectePL: false,    // piocher au sommet de la pioche Plans Larges
  piocheDirectePMGP: true,   // piocher au sommet de la pioche PM / GP
  departProposes: 2,         // cartes Plan de départ distribuées, une seule est gardée
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

  // --- Divers --------------------------------------------------------------
  graine: '',
  vitesseIA: 500,
};

export const PROFILS_IA = {
  NOVICE:    { id: 'NOVICE',    label: 'IA — Novice',    profondeur: 0, bruit: 0.55 },
  EQUILIBRE: { id: 'EQUILIBRE', label: 'IA — Équilibré', profondeur: 1, bruit: 0.12 },
  STRATEGE:  { id: 'STRATEGE',  label: 'IA — Stratège',  profondeur: 2, bruit: 0.0 },
};

export const COULEURS_JOUEURS = ['#8b5cf6', '#f97316', '#0ea5e9', '#22c55e'];

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
    { k: 'departProposes', l: 'Plans de départ proposés', t: 'int', min: 1, max: 4 },
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
