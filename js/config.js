// ---------------------------------------------------------------------------
// EDIT — variables de partie
// ---------------------------------------------------------------------------
// Tout ce qui pilote le déroulé et le décompte est ici. Le Laboratoire fait
// varier ces valeurs pour comparer les équilibrages.

import { ELEMENT_IDS } from './data.js';

export const DEFAULTS = {
  // --- Déroulé -------------------------------------------------------------
  mainDepart: 4,          // cartes en main au début
  mainMax: 4,             // on repioche jusqu'à cette taille
  tours: 12,              // nombre de tours de jeu (0 = jusqu'à épuisement)
  piocheFinPartie: true,  // la partie s'arrête aussi si la pioche est vide
  sensPose: 'bords',      // 'bords' (gauche ou droite) | 'droite' | 'libre'
  retournement: true,     // le joueur choisit la face recto/verso
  planDepart: true,       // chacun démarre sur un Plan de départ
  planLargeEnMain: true,  // les Plans Larges sont mélangés au paquet
  bancCommun: false,      // un seul banc de montage partagé
  premierJoueurAleatoire: true,

  // --- Raccord -------------------------------------------------------------
  raccordMin: 1,          // éléments partagés nécessaires entre deux moitiés voisines
  raccordJoker: true,     // la moitié « Raccord » raccorde avec n'importe quoi
  raccordPoints: 0,       // points fixes par raccord, en plus des objectifs

  // --- Chronologie ---------------------------------------------------------
  chronoBonus: 0,         // points par paire de plans voisins dans l'ordre du film
  chronoMalus: 0,         // points retirés par paire à contresens
  chronoIgnoreZero: true, // les plans à 00:00 (personnages, raccords) sont neutres

  // --- Décompte ------------------------------------------------------------
  objectifsActifs: {
    RACCORD: true, PLAN: true, FORMAT: true, ELEMENT: true,
    PAIRE: true, MORT: true, NEANT: true, ABSENT: true,
  },
  multiplicateurObjectif: 1,   // applique un facteur global à tous les bandeaux
  pointsParPlan: 0,            // points fixes par plan posé
  bonusFilmComplet: 0,         // bonus si le banc atteint la longueur cible
  longueurCible: 13,

  // --- Composition du paquet ----------------------------------------------
  exemplairesDouble: 1,        // multiplie les 50 cartes doubles
  exemplairesPL: 1,            // multiplie les 18 Plans Larges
  retirerBrouillons: true,     // écarte les Plans Larges non finalisés
  filtreFamilles: {            // familles de scènes autorisées
    TRANSITION: true, MORT: true, ARME: true, VOITURE: true, CLE: true, PERSONNAGE: true,
  },
  poidsElements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 1])), // pondère le tirage

  // --- Divers --------------------------------------------------------------
  graine: '',             // graine manuelle ; vide = aléatoire
  vitesseIA: 550,         // ms entre deux coups d'IA
};

export const PROFILS_IA = {
  NOVICE:    { id: 'NOVICE',    label: 'IA — Novice',    profondeur: 0, bruit: 0.55 },
  EQUILIBRE: { id: 'EQUILIBRE', label: 'IA — Équilibré',  profondeur: 1, bruit: 0.12 },
  STRATEGE:  { id: 'STRATEGE',  label: 'IA — Stratège',   profondeur: 2, bruit: 0.0 },
};

export const COULEURS_JOUEURS = ['#8b5cf6', '#f97316', '#0ea5e9', '#22c55e'];

export function cloneConfig(src = DEFAULTS) {
  return JSON.parse(JSON.stringify(src));
}

// Description lisible de chaque variable, pour l'écran Variables.
export const SCHEMA = [
  { groupe: 'Déroulé', champs: [
    { k: 'mainDepart', l: 'Cartes en main au début', t: 'int', min: 1, max: 10 },
    { k: 'mainMax', l: 'Taille de main maintenue', t: 'int', min: 1, max: 10 },
    { k: 'tours', l: 'Nombre de tours', t: 'int', min: 0, max: 30, aide: '0 = jusqu’à épuisement de la pioche' },
    { k: 'sensPose', l: 'Sens de pose', t: 'choix', options: [
      ['bords', 'Aux deux bouts'], ['droite', 'À droite seulement'], ['libre', 'N’importe où'],
    ] },
    { k: 'retournement', l: 'Choix de la face (recto/verso)', t: 'bool' },
    { k: 'planDepart', l: 'Plan de départ posé au début', t: 'bool' },
    { k: 'planLargeEnMain', l: 'Plans Larges mélangés au paquet', t: 'bool' },
    { k: 'bancCommun', l: 'Banc de montage commun', t: 'bool' },
    { k: 'premierJoueurAleatoire', l: 'Premier joueur aléatoire', t: 'bool' },
    { k: 'piocheFinPartie', l: 'Pioche vide = fin de partie', t: 'bool' },
  ] },
  { groupe: 'Raccord', champs: [
    { k: 'raccordMin', l: 'Éléments partagés pour un raccord', t: 'int', min: 1, max: 4 },
    { k: 'raccordJoker', l: 'La moitié Raccord est un joker', t: 'bool' },
    { k: 'raccordPoints', l: 'Points fixes par raccord', t: 'int', min: -5, max: 10 },
  ] },
  { groupe: 'Chronologie', champs: [
    { k: 'chronoBonus', l: 'Bonus par paire dans l’ordre', t: 'int', min: 0, max: 10 },
    { k: 'chronoMalus', l: 'Malus par paire à contresens', t: 'int', min: 0, max: 10 },
    { k: 'chronoIgnoreZero', l: 'Les plans à 00:00 sont neutres', t: 'bool' },
  ] },
  { groupe: 'Décompte', champs: [
    { k: 'multiplicateurObjectif', l: 'Multiplicateur des bandeaux', t: 'float', min: 0, max: 5, pas: 0.25 },
    { k: 'pointsParPlan', l: 'Points fixes par plan posé', t: 'int', min: 0, max: 5 },
    { k: 'bonusFilmComplet', l: 'Bonus de film complet', t: 'int', min: 0, max: 30 },
    { k: 'longueurCible', l: 'Longueur de film visée', t: 'int', min: 3, max: 40 },
  ] },
  { groupe: 'Paquet', champs: [
    { k: 'exemplairesDouble', l: 'Exemplaires des cartes doubles', t: 'int', min: 1, max: 4 },
    { k: 'exemplairesPL', l: 'Exemplaires des Plans Larges', t: 'int', min: 0, max: 4 },
    { k: 'retirerBrouillons', l: 'Écarter les Plans Larges non finalisés', t: 'bool' },
  ] },
];
