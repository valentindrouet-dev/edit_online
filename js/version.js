// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '1.7';
export const BUILD_DATE = '2026-08-11 18:20';

export const CHANGELOG = [
  {
    v: '1.7',
    date: '11/08/2026',
    items: [
      "La table de jeu est réorganisée : les bancs de montage occupent toute la largeur de la page, les uns sous les autres, et restent visibles en permanence.",
      "La zone de draft — choix du Plan de départ, dérushage, montage — est placée au-dessus des bancs ; les chutiers et pioches s’y rangent côte à côte pour rester compacts.",
      "Les panneaux d’information (joueuses, score, bandeaux du banc, journal, annuler et quitter) sont réunis en une seule colonne, à droite.",
      "La graine n’est plus affichée pendant la partie.",
    ],
  },
  {
    v: '1.6',
    date: '11/08/2026',
    items: [
      "Fini les versions périmées au rafraîchissement : un service worker force chaque fichier à repasser par le réseau — le cache de dix minutes de l’hébergeur et celui du navigateur ne retiennent plus rien. En contrepartie, le site reste consultable hors ligne sur sa dernière version chargée.",
      "Le site surveille lui-même js/version.js : dès qu’une version plus récente est publiée, la page se recharge une fois automatiquement (jamais en pleine partie) ; si un cache tenace résiste, un bandeau propose un rechargement forcé qui vide tous les caches.",
      "Un fichier .nojekyll accélère la mise en ligne sur GitHub Pages.",
    ],
  },
  {
    v: '1.5',
    date: '11/08/2026',
    items: [
      "L’accueil repasse sur deux colonnes : les joueuses et le bouton Commencer la partie à gauche, les options de partie et les réglages rapides à droite.",
    ],
  },
  {
    v: '1.4',
    date: '11/08/2026',
    items: [
      "Les règles du jeu sont versionnées à part du site : la page Règles affiche la version en vigueur (v0.13) et garde chaque version précédente, texte intégral compris, dans un onglet « Versions des règles ».",
      "À la prochaine modification de règle, le passage changé s’affichera en violet avec le numéro de version qui l’a introduit.",
      "Nouvelle palette des joueuses, en pastel : violet, bleu, rose, orange. Les noms restent lisibles grâce à une teinte d’encre assortie.",
      "L’accueil est resserré sur une colonne : joueuses, bouton Commencer la partie, options de partie, puis réglages rapides.",
      "Le sous-titre crédite l’auteur, et les blocs Personnages et éléments, Le matériel ainsi que les textes d’explication disparaissent de l’accueil — tout est dans l’onglet Matériel.",
    ],
  },
  {
    v: '1.3',
    date: '11/08/2026',
    items: [
      "Les cartes portent leurs illustrations : les 84 visuels sont extraits des PDF d’impression et servis en WebP, 1,6 Mo pour l’ensemble du matériel.",
      "Une case « Illustrations » sur l’accueil bascule entre la carte imprimée et la lecture nue — minutage, pastilles et bandeau seuls — pour travailler l’équilibrage sans se laisser distraire par l’image.",
      "Les visuels confirment la correspondance page ↔ numéro de plan : les minutages et les personnages imprimés coïncident avec les données du tableau de répartition.",
      "Les Plans Larges 101 et 102 apparaissent pour ce qu’ils sont — des gabarits verts sans illustration ni pastilles, à compléter.",
    ],
  },
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
