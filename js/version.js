// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '1.2';
export const BUILD_DATE = '2026-08-11 15:10';

export const CHANGELOG = [
  {
    v: '1.2',
    date: '11/08/2026',
    items: [
      "Les règles officielles v0.13 sont arrivées : le moteur est refait dessus, du dérushage au décompte.",
      "Le tour se joue désormais en deux phases — Phase A le Dérushage, où chacune pioche une carte dans un chutier ou sur la pioche, puis Phase B le Montage, où chacune la pose.",
      "Deux chutiers alimentés en continu, un par type de pioche, dimensionnés au nombre de joueuses.",
      "La pose se fait par recouvrement : une carte Plan Moyen / Gros Plan se glisse sous les précédentes et ne laisse voir qu’un seul de ses deux plans — c’est lui qui compte.",
      "Le banc se lit en séquences : un Plan Large en ouvre toujours une nouvelle, deux Plans Larges ne peuvent pas se toucher, et une Carte Raccord soude deux séquences voisines.",
      "Le Générique ouvre ou ferme le film et bloque ce bord du montage ; la moitié à double lecture peut être jouée en Ouverture ou en Crédits.",
      "Décompte refait : le Raccord rapporte par carte de sa séquence, le Générique par Carte Raccord du montage. La portée des autres bandeaux, muette dans les règles, est réglable.",
      "Les six éléments prennent leurs vrais noms : Héroïne, Ennemi, Allié, Arme, Objet, Véhicule.",
      "Matériel recalé : 14 Plans Larges, 8 Plans de départ en 2 versions recto-verso, 50 cartes Plan Moyen / Gros Plan.",
      "La partie s’arrête au 10e plan posé, comme sur la fiche de score.",
    ],
  },
  {
    v: '1.1',
    date: '11/08/2026',
    items: [
      "Première mise en ligne : accueil, partie, matériel, règles, laboratoire d’équilibrage, historique et versions.",
      "Matériel modélisé depuis les PDF de cartes et la répartition v0.13, cartes dessinées à la volée — minutage, pastilles d’éléments, bandeau d’objectif.",
      "De 1 à 4 joueuses, humaines ou remplacées par une IA Novice, Équilibrée ou Stratège.",
      "Déroulé et décompte reconstitués faute de document de règles, entièrement pilotés par les variables.",
    ],
  },
];
