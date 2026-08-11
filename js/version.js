// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '1.1';
export const BUILD_DATE = '2026-08-11 13:20';

export const CHANGELOG = [
  {
    v: '1.1',
    date: '11/08/2026',
    items: [
      "Première mise en ligne de la plateforme EDIT : accueil, partie, matériel, règles, laboratoire d'équilibrage, historique et versions.",
      "Le matériel est intégralement modélisé : 18 Plans Larges (dont 4 Plans de départ), 33 scènes déclinées en Plan Moyen et Gros Plan, et les 50 cartes recto-verso de la répartition v0.13.",
      "Les cartes sont dessinées à la volée : minutage en haut à gauche, pastilles des 6 éléments, bandeau d'objectif et libellé de format — Gros Plan et Plan Moyen se rejoignent bien en une carte de la taille d'un Plan Large.",
      "De 1 à 4 joueurs, humains ou remplacés par une IA : Novice (coup immédiat), Équilibré (meilleur delta de score) et Stratège (anticipation sur les objectifs à venir).",
      "Tout est réglable dans Variables : taille de la main, nombre de tours, sens de pose, retournement des cartes, valeur de chaque objectif, bonus de chronologie, composition du paquet et répartition des éléments.",
      "Le Laboratoire d'équilibrage simule des centaines de parties et sort la distribution des scores, l'origine des points, la force des profils d'IA, l'avantage de position et la durée des parties.",
    ],
  },
];
