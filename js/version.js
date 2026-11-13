// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '4.1.19';
export const BUILD_DATE = '2026-11-13 16:33';

export const CHANGELOG = [
  {
    v: '4.1.19',
    date: '13/11/2026',
    items: [
      "<b>Laboratoire : points par carte.</b> Après une campagne, chaque carte de la boîte montre ce qu’elle a rapporté à qui l’a montée — min, médiane, max, moyenne —, sa présence et le taux de victoire de son banc.",
      "Médianes hors norme signalées par famille, tri et filtres, <b>export CSV</b> pour l’équilibrage.",
    ],
  },
  {
    v: '4.1.18',
    date: '13/11/2026',
    items: [
      "<b>L8 revu</b> : « 2 × carte PLAN dans le CHUTIER » — 2 points par carte du Chutier de la table à la fin de la partie, une carte à deux Gros Plans comptant une fois.",
      "Le décompte voit désormais le Chutier : points au coin des cartes, score, IA et aide de jeu en tiennent compte.",
    ],
  },
  {
    v: '4.1.17',
    date: '13/11/2026',
    items: [
      "<b>Cinq cartes revues</b> (GP33, L2, L3, L4, L19) : nouvelles images et pouvoirs relus — GP33 « 1 × ◁ Allié ▷ », L3 « 4 × SÉQUENCE ▷▷ », L19 « 4 × ◁◁ SÉQUENCE ».",
      "<b>L4</b> : « 4 × SÉQUENCE avec 6 icônes différentes » — une cible nouvelle du moteur, les six types d’icônes dans la séquence.",
    ],
  },
  {
    v: '4.1.16',
    date: '11/11/2026',
    items: [
      "<b>Le Raccord, l’Ouverture et la Fin sont des plans.</b> Une Fin suivie d’une autre Fin ou d’un Raccord ne rapporte plus rien (« 5 si aucun PLAN après »).",
      "Ils comptent aussi parmi les 12 plans de la fin de partie et dans les pouvoirs qui comptent des plans ; règles et aide de jeu à jour.",
    ],
  },
  {
    v: '4.1.15',
    date: '11/11/2026',
    items: [
      "<b>Accueil épuré</b> : les joueuses, « Commencer la partie », le jeu en ligne et les options d’affichage — plus de « partie en bref », de bandeau de boîte ni de raccourcis.",
      "Le choix <b>Boîte 4.1 / Boîte modifiée</b> passe dans les Variables, rubrique « Version du jeu ».",
    ],
  },
  {
    v: '4.1.14',
    date: '11/11/2026',
    items: [
      "<b>Le site prend l’allure du jeu.</b> Papier crème tramé, traits d’encre épais, ombres franches, étiquettes inclinées, traînées de vitesse ; titres en <b>Bangers</b>, texte en <b>Fira Sans</b>, servies par le site.",
      "Les <b>couleurs des joueuses</b> sont celles de la feuille de score : violet, turquoise, vert, rouge.",
      "Les règles et l’aide de jeu reprennent les bandeaux des aides : rubans inclinés détourés, encarts tramés.",
    ],
  },
  {
    v: '4.1.13',
    date: '11/11/2026',
    items: [
      "<b>La table s’élargit.</b> Rivière, pioche et Chutier sur toute la largeur ; dessous, tous les bancs l’un au-dessus de l’autre — le vôtre en tête, ceux des autres se replient d’un clic sur leur nom — et la colonne des joueuses à côté.",
      "<b>Chrono</b> remplace « minutage » partout à l’écran.",
      "La feuille de score se décrit comme l’auteur la lit : une ligne par séquence, sept cases, les totaux.",
    ],
  },
  {
    v: '4.1.12',
    date: '11/11/2026',
    items: [
      "<b>Les aides de jeu de la boîte</b> habillent l’accueil, les règles (Icônes, Effets de plans, feuille de score) et l’aide de jeu.",
      "Lecture alignée sur l’aide : le <b>duo</b> se compte dans la séquence (GP04, GP05, GP06, GP12) ; <b>◁◁ / ▷▷</b> comptent avant / après dans tout le montage, la carte exclue.",
    ],
  },
  {
    v: '4.1.11',
    date: '11/11/2026',
    items: [
      "<b>En ligne :</b> « transport failure » se lit enfin juste — le WebSocket vers Supabase ne s’ouvre pas, avec ses trois causes possibles.",
    ],
  },
  {
    v: '4.1.10',
    date: '11/11/2026',
    items: [
      "<b>En ligne : la panne dit sa cause.</b> Sous « Liaison interrompue », l’écran affiche pourquoi : client introuvable, serveur muet ou canal refusé par Supabase, avec le message du serveur.",
      "Le client Supabase se charge sur <b>jsDelivr</b> si esm.sh ne répond pas.",
    ],
  },
  {
    v: '4.1.09',
    date: '11/11/2026',
    items: [
      "<b>Fin de partie à 12 plans.</b> Une configuration enregistrée à l’ancienne valeur reprend les douze.",
      "<b>Pioche vide :</b> chaque carte prise dans la rivière est remplacée par la carte du dessus du Chutier, une par une — et l’on ne défausse plus.",
      "Deux <b>Raccords</b> côte à côte restent interdits : la règle sort des points à confirmer.",
    ],
  },
  {
    v: '4.1.08',
    date: '11/11/2026',
    items: [
      "<b>Après un Raccord, on peut monter un Gros Plan</b> — ou un Plan Large, comme avant ; jamais un second Raccord. L'ancienne règle reste en variante dans Variables.",
      "Quand une moitié ne peut pas se monter, la table en dit la <b>vraie raison</b> : un Raccord au bout visé, ou un côté déjà plein.",
    ],
  },
  {
    v: '4.1.07',
    date: '11/11/2026',
    items: [
      "<b>Les 36 cartes de l'auteur.</b> L'assemblage suit ses planches au complet, dans leur ordre : le Raccord est imprimé huit fois, l'Ouverture et la Fin deux fois, les « -- » GP01 à GP09 une fois de chaque côté. La pioche passe à 51 cartes.",
      "<b>Le vrai dos des cartes</b> sur la pioche, et dans les règles.",
    ],
  },
  {
    v: '4.1.06',
    date: '11/11/2026',
    items: [
      "<b>L'assemblage de l'auteur : 32 cartes à deux Gros Plans.</b> Les 20 cartes de ses planches, et 12 de plus selon sa règle — 10' à 30' et l'Ouverture à gauche, 40' à 60' et la Fin à droite, deux dominantes différentes par carte.",
      "Chaque Gros Plan <b>« -- »</b> est imprimé <b>deux fois</b>, une fois en moitié gauche, une fois en moitié droite : la pioche passe à 47 cartes, de quoi jouer à quatre sans manquer de place. Le Matériel compte désormais les exemplaires d'après la boîte.",
    ],
  },
  {
    v: '4.1.05',
    date: '11/11/2026',
    items: [
      "<b>Le Matériel rouvre, en 4.1.</b> Chaque vraie carte y est montrée à côté de ce que le moteur en lit — minutage, icônes dans l'ordre, pouvoir — pour vérifier la lecture et la corriger.",
      "<b>Assemblage des cartes à deux Gros Plans.</b> Les 27 cartes en images : on glisse une moitié sur une autre, on tape un numéro, on échange gauche et droite ; les Gros Plans non placés ou placés deux fois sont signalés, et l'on revient à l'assemblage de la boîte d'un clic.",
    ],
  },
  {
    v: '4.1.04',
    date: '11/11/2026',
    items: [
      "<b>Les règles 4.1 se jouent.</b> Une seule pioche face cachée, une rivière de 4 cartes et le Chutier : à son tour on peut défausser une carte, puis on en prend une et on la monte. 3 séquences par banc, 3 cartes de chaque côté du centre, la moitié gauche à gauche et la droite à droite ; la carte de départ est recto verso.",
      "<b>Le site ne porte plus que la 4.1.</b> Les cartes, images, règles et mécaniques des versions précédentes sont retirées ; les règles sont réécrites, avec leur aide de jeu.",
      "L'écran <b>Matériel</b> rouvre à la prochaine livraison, avec l'assemblage des cartes à deux Gros Plans.",
    ],
  },
  {
    v: '4.1.03',
    date: '11/11/2026',
    items: [
      "<b>Les 54 Gros Plans.</b> Les vraies cartes, à leur proportion 60 × 80 — la carte coupée en deux au centre —, du GP00 au GP66, plus le Raccord, l'Ouverture et la Fin.",
      "Minutage, icônes et pouvoir de chacun sont relevés pour le décompte, avec deux lectures : <i>n × plans à tel minutage</i> (« 2 × 50' », « 1 × -- ») et <i>si la séquence est dans l'ordre</i>.",
    ],
  },
  {
    v: '4.1.02',
    date: '10/11/2026',
    items: [
      "<b>Le titre d'EDIT</b>, dans la barre du haut et sur l'accueil.",
      "<b>Les 19 Plans Larges.</b> Les vraies cartes, montrées telles quelles à leur proportion 120 × 80 — 15 Plans Larges et les 4 Plans de départ (L5, L7, L12, L16) —, avec leurs icônes.",
    ],
  },
  {
    v: '4.1.01',
    date: '10/11/2026',
    items: [
      "<b>Le site passe en 4.1.</b> La numérotation suit la version du jeu : <code>4.1.01</code>, puis 4.1.02… à chaque livraison. Le jeu montre les vraies cartes, telles que l'auteur les livre.",
    ],
  },
];
