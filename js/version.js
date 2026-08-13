// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '1.18';
export const BUILD_DATE = '2026-08-13 01:40';

export const CHANGELOG = [
  {
    v: '1.18',
    date: '13/08/2026',
    items: [
      "Une icône peut être portée plusieurs fois par un même plan — deux armes, deux véhicules. Dans l’éditeur, un clic sur une pastille en ajoute une, un clic droit en retire une, et le compte s’affiche en badge. Un bandeau d’élément rapporte donc deux fois sur une carte à deux armes ; « Compter chaque icône, pas chaque plan » dans Variables ramène à l’ancienne lecture.",
      "Le bandeau de couple ne se lit plus entre deux plans voisins : il apparie les icônes réunies dans sa portée. Quatre icônes font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes en demande une de chaque.",
      "Nouveau pouvoir « n × <icône ou cadrage> avant / après cette carte » : n points par plan du montage placé strictement avant — ou après — la carte porteuse et portant l’icône, ou du cadrage, visé.",
      "Les statistiques se filtrent par cadrage, par icône et par type de pouvoir ; un bandeau rappelle combien de plans les filtres retiennent.",
      "En partie, les colonnes de lecture s’épinglent sur une autre joueuse d’un clic sur sa case, et y restent — jusqu’à ce qu’on en désigne une autre ou qu’on revienne à celle dont c’est le tour.",
      "Le survol d’une carte posée dit ce qu’elle rapporte, à elle seule, dans ce montage.",
      "Règles v0.13.5.",
    ],
  },
  {
    v: '1.17',
    date: '12/08/2026',
    items: [
      "Deux nouveaux pouvoirs. « n × ◀ Plan ▶ avant / après XX:00 » rapporte n points par plan du montage dont le minutage est strictement antérieur — ou postérieur — au seuil indiqué. « n si le montage est dans l’ordre » rapporte n points si, lu de gauche à droite, chaque minutage est supérieur ou égal à celui de son voisin de gauche.",
      "Sur un Gros Plan, dont le bandeau ne fait qu’un tiers de carte, le seuil se lit « < 25:00 » ; l’aperçu au survol donne toujours la formule en toutes lettres.",
      "Règles v0.13.4 : les deux bandeaux rejoignent le tableau de décompte.",
      "La galerie du matériel tient quatre cartes de front dès 1500 px de fenêtre, cinq à partir de 1750, six au-delà — l’écran Matériel prend toute la largeur disponible et les cartes sont un peu resserrées.",
      "Correction : une carte qui ne porte qu’un plan suit de nouveau sa taille de police, tout étant exprimé en em ; son fond noir ne dépassait plus à droite d’un Gros Plan mais était revenu avec le resserrement de la galerie.",
    ],
  },
  {
    v: '1.16',
    date: '12/08/2026',
    items: [
      "Correction : le verso d’une carte se contentait d’inverser les deux moitiés du recto au lieu d’aller chercher les plans du verso. Un Gros Plan réglé à 25:00 au recto et 20:00 au verso affichait donc 25:00 des deux côtés. Les deux faces montrent désormais chacune ses propres plans, sur les cartes reconstituées comme dans l’aperçu de l’éditeur.",
      "La sélection survit au changement de vue : on règle d’un coup des Gros Plans et des Plans Moyens pris dans deux galeries différentes. Le compteur dit combien de plans sont sélectionnés hors de la vue courante.",
      "Un clic simple remplace la sélection ; maj+clic l’étend, du dernier plan cliqué jusqu’à celui-ci, ou ajoute un plan isolé.",
    ],
  },
  {
    v: '1.15',
    date: '12/08/2026',
    items: [
      "Nouveau filtre « Afficher » : recto et verso, recto seulement ou verso seulement. Dans les vues par cadrage il ne garde que les plans de la face demandée ; dans la vue des cartes, il retourne toutes les cartes du même côté.",
      "Le numéro d’un plan se renumérote à la main. Ce n’est qu’une étiquette : l’identité d’un plan reste son numéro imprimé, qui sert de clé et désigne son illustration, donc renuméroter ne casse aucun appariement.",
      "Les numéros portés par plus d’un plan sont signalés par un bandeau rouge en tête de l’écran Matériel, et le champ fautif est marqué « déjà pris ». Le tableau complet et son export rappellent le numéro imprimé à côté du nouveau.",
      "Deux boutons de nettoyage dans l’éditeur : « Enlever toutes les icônes » et « Enlever le pouvoir ». Ils valent pour un plan comme pour toute une sélection — de quoi remettre à plat les pouvoirs de plusieurs cartes d’un coup.",
    ],
  },
  {
    v: '1.14',
    date: '12/08/2026',
    items: [
      "Une carte qui ne porte qu’un plan se règle sur lui : le fond noir de la carte ne dépasse plus à droite d’un Gros Plan ni de certains Plans Moyens. Les vignettes d’une galerie ont toutes la même largeur, le libellé passant à la ligne au lieu de l’élargir.",
      "Le réglage en lot ne demande plus rien à confirmer : minutage, icônes, marqueur de mort et pouvoir partent aussitôt sur toute la sélection, exactement comme sur un plan seul.",
      "Une icône que seule une partie de la sélection porte est marquée « partielle » — un clic la donne alors à tous, un second la retire de tous.",
    ],
  },
  {
    v: '1.13',
    date: '12/08/2026',
    items: [
      "Le recto et le verso d’une carte sont deux plans distincts : « 201R » et « 201V » se règlent séparément, minutage compris. La face jouée se déduit du bout où la moitié visible se retrouve — un Gros Plan accroché à gauche est au recto, à droite au verso ; réglable dans Variables.",
      "Deux jeux de matériel coexistent en permanence, l’Imprimé et le Modifié : un sélecteur dit lequel part en partie, et le rappel s’affiche sur l’accueil comme sur la table de jeu. Le bouton qui effaçait tout a disparu — plus rien n’est détruit.",
      "Chaque carte s’active ou s’écarte de la boîte : seules les cartes activées partent dans le paquet, dans l’un comme dans l’autre jeu.",
      "Sélection multiple : clic pour ajouter ou retirer, maj+clic pour une plage. Un minutage, des icônes ou un pouvoir s’appliquent alors d’un coup à toute la sélection.",
      "Trois vues par cadrage — les cartes Plan Moyen / Gros Plan, les Gros Plans seuls, les Plans Moyens seuls — en plus des Plans Larges et des Plans de départ.",
      "Tri par numéro, par minutage ou par famille, et filtres pour n’afficher que les plans portant une icône, un type de pouvoir, une plage de minutage, une famille, ou seulement ce qui a été retouché.",
      "Nouvel onglet « Statistiques » : la boîte, les cadrages, les icônes, les pouvoirs et les minutages comptés sur le matériel tel qu’il part en partie, l’Imprimé et le Modifié côte à côte avec leur écart.",
      "Dans l’éditeur, toute valeur qui s’écarte de l’imprimé affiche la valeur imprimée à côté d’elle.",
    ],
  },
  {
    v: '1.12',
    date: '12/08/2026',
    items: [
      "L’écran Matériel devient un éditeur : chaque carte se règle à la main — son minutage, ses icônes et son pouvoir. La galerie reste sous les yeux à gauche, la carte éditée dans une colonne à droite.",
      "Le pouvoir s’écrit comme sur la carte : X points × ce que l’on compte — un cadrage, une icône, un couple d’icônes voisines, une mort, un plan sans personnage, une Carte Raccord, une carte de la séquence, ou l’absence d’une icône du montage.",
      "Les cartes Plan Moyen / Gros Plan s’éditent recto et verso ensemble : les deux faces sont affichées, et les deux moitiés se règlent côte à côte.",
      "L’appariement des moitiés est réglable carte par carte : la répartition imprimée est conservée tant qu’on n’y touche pas.",
      "Toutes les retouches sont enregistrées et le jeu s’y conforme aussitôt — table de jeu, décompte, Laboratoire et export des variables compris. Un bouton ramène une carte, ou tout le matériel, à l’imprimé.",
      "Nouvel onglet « Tableau complet » : l’état courant des 84 plans et des 50 cartes, avec un bouton d’export en PDF.",
      "Le réglage des minutages rejoint l’éditeur ; les valeurs déjà réglées sont reprises telles quelles.",
    ],
  },
  {
    v: '1.11',
    date: '12/08/2026',
    items: [
      "Les Plans de départ ne se tirent plus : chaque joueuse a toujours les deux cartes, version A et version B, donc ses quatre faces au choix. La boîte en contient quatre exemplaires de chaque, un par joueuse — il n’y avait aucune raison d’y mettre du hasard.",
      "Les IA jouent d’un bloc : leurs coups sont résolus sans attente ni rendu intermédiaire, et la main revient directement à la joueuse humaine. Plus de temporisation ni de « l’IA joue… » entre deux clics.",
      "La zone de jeu garde la même forme d’un tour à l’autre : elle ne se vide plus pendant les tours d’IA et sa hauteur ne varie plus d’une phase à l’autre. Rien n’apparaît ni ne disparaît sous le curseur.",
      "Choisir la moitié d’une carte ne repeint plus toute la table : seuls la carte, sa consigne et les emplacements du banc sont rafraîchis, et la page ne remonte plus en haut.",
      "La moitié non retenue n’est plus grisée : la carte reste entièrement lisible, un liseré orange marque simplement le côté choisi.",
    ],
  },
  {
    v: '1.10',
    date: '11/08/2026',
    items: [
      "La table de jeu est allégée : plus de journal, plus de titre de phase ni de consigne au-dessus des cartes — le bandeau du haut suffit à dire où l’on en est.",
      "Le dérushage se lit en deux lignes : la pioche des Plans Larges puis son chutier, la pioche des Plans Moyens / Gros Plans puis le sien. Chaque pioche est dessinée en pile de cartes décalées.",
      "La pioche des Plans Larges reste face cachée — ces cartes ont un vrai dos ; celle des Plans Moyens / Gros Plans montre sa face du dessus, ces cartes étant recto-verso.",
      "Les bancs de montage remontent sous la zone de pioche, dans la colonne de gauche ; les informations restent groupées à droite.",
      "Au montage, la carte Plan Moyen / Gros Plan est présentée entière : on clique la moitié que l’on veut laisser visible, puis l’emplacement dans son banc.",
      "Les cartes sont plus grandes et la part réservée à l’information passe de 31 à 40 % de leur hauteur ; les pastilles se resserrent quand elles sont nombreuses, pour ne jamais déborder — y compris sur un Gros Plan.",
      "Le survol d’une carte ouvre un aperçu : minutage en grand, chaque pastille nommée, et le bandeau d’objectif avec ce qu’il rapporte.",
      "Les illustrations s’affichent ou se masquent en cours de partie, d’un bouton dans le bandeau de tour.",
    ],
  },
  {
    v: '1.9',
    date: '11/08/2026',
    items: [
      "Les cartes n’apportent plus que leur illustration : le minutage, les pastilles, le bandeau d’objectif et le libellé de cadrage sont entièrement redessinés par l’application. Les visuels sont recadrés au-dessus de la zone d’information et leur minutage imprimé est effacé.",
      "Les pastilles affichées sont les vraies : les huit icônes — Héroïne, Ennemi, Allié, Objet, Arme, Véhicule, Mort, Plan sans personnage — sont découpées à même les cartes des PDF d’impression.",
      "Le minutage devient une variable : il s’affiche en police d’afficheur et se règle plan par plan dans Matériel › Minutages, pour mesurer son effet sur l’équilibrage.",
      "Nouveau panneau « Icônes du banc » : l’application recense les éléments, les cadrages, les Cartes Raccord, les plans de mort et les plans sans personnage, et les affiche avec leurs icônes.",
      "Les colonnes de score montrent chaque bandeau avec ses icônes plutôt qu’en toutes lettres.",
      "Le banc de montage reste centré : le Plan de départ s’ouvre au milieu, et l’ensemble demeure centré même quand on pose à gauche.",
      "Règles v0.13.1 : le placement ne dépend pas du minutage, mais certaines cartes rapportent selon le minutage des plans du montage.",
    ],
  },
  {
    v: '1.8',
    date: '11/08/2026',
    items: [
      "Correction du vrai défaut de mise à jour : la v1.7 pouvait s’afficher avec la mise en page de la v1.6, parce que le navigateur gardait un app.js périmé à côté d’un version.js à jour — et le contrôle de version, qui comparait version.js à lui-même, n’y voyait rien.",
      "Toutes les adresses de modules portent désormais le numéro de version : à chaque publication elles changent toutes, et le cache ne peut plus resservir l’ancien code.",
      "La page d’amorçage ne cite plus aucune version : elle demande au serveur laquelle est publiée, puis charge le code correspondant. Même servie depuis le cache, elle ouvre donc toujours la dernière version.",
      "Le contrôle de version s’appuie sur un fichier version.json relu hors de tout cache, et le rechargement repart sur une adresse neuve pour que le document lui-même échappe au cache.",
      "Une mise à jour détectée en pleine partie n’interrompt plus rien : elle propose un bandeau au lieu de recharger.",
    ],
  },
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
