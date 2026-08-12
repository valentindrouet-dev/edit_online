# EDIT — plateforme de jeu

Plateforme de jeu et laboratoire d'équilibrage pour **EDIT**, jeu de placement de Cartes Plan dans
un banc de montage. Édité par Big Budi Games. Moteur conforme aux règles **v0.13**.

Site statique : aucune dépendance, aucune étape de compilation. Ouvrir `index.html`, ou servir le
dossier (`python3 -m http.server`).

## Écrans

| Écran | Rôle |
|---|---|
| **Accueil** | Table de 1 à 4 joueuses, humaines ou IA, options de partie, réglages rapides |
| **Partie** | Zone de pioche, bancs de montage, recensement des icônes et score détaillé |
| **Matériel** | Les 50 cartes PM / GP recto et verso, les 14 Plans Larges, les Plans de départ, le tableau des 33 scènes |
| **Règles** | Les règles telles qu'implémentées, avec les points restés ouverts |
| **Variables** | Toutes les variables de déroulé et de décompte, export/import JSON |
| **Laboratoire** | Campagnes de simulation et statistiques d'équilibrage |
| **Historique** | Parties terminées |
| **Versions** | Journal des versions |

## Organisation du code

```
index.html              amorçage : demande la version publiée, puis charge le code
version.json            version publiée, relue hors cache (généré)
sw.js                   service worker réseau d'abord
outils/versionner.mjs   estampille les modules avant publication
outils/extraire-visuels.py  régénère illustrations et icônes depuis les PDF
css/styles.css
assets/pm/<num>.webp   visuels des moitiés Plan Moyen  (33)
assets/gp/<num>.webp   visuels des moitiés Gros Plan   (33)
assets/pl/<num>.webp   visuels des Plans Larges et des Plans de départ (18)
assets/icones/<ID>.webp  les huit pastilles découpées dans les cartes
js/version.js    version du site et journal des modifications
js/regles.js     règles du jeu, versionnées à part du site
js/data.js       matériel : éléments, 33 scènes, 14 Plans Larges, 8 Plans de départ, 50 cartes PM/GP
js/config.js     variables par défaut, profils d'IA, description des réglages
js/icons.js      pastilles des personnages et éléments en SVG
js/cards.js      rendu d'un plan et d'une carte
js/scoring.js    séquences, portée des bandeaux, décompte
js/engine.js     paquet, chutiers, phases, coups légaux, pose
js/ai.js         Novice, Équilibré, Stratège
js/lab.js        simulation par lots et agrégats statistiques
js/app.js        routage et écrans
```

## Publier une version

Le navigateur met chaque module en cache **par son URL**. Si une seule adresse ne change pas d'une
version à l'autre, il peut resservir l'ancien fichier — c'est ainsi qu'une v1.7 a pu s'afficher avec
la mise en page de la v1.6. Deux mécanismes s'en chargent :

1. `outils/versionner.mjs` estampille toutes les URL de modules avec le numéro de version
   (`./data.js?v=1.8`), renomme le cache du service worker et écrit `version.json` ;
2. `index.html` ne cite **aucune** version : il demande d'abord `version.json` hors cache, puis
   construit l'adresse du module principal. Même servi depuis le cache, il ouvre donc la dernière
   version publiée.

La routine de publication tient en trois gestes :

```bash
# 1. mettre à jour VERSION et BUILD_DATE dans js/version.js, ajouter l'entrée au CHANGELOG
# 2. estampiller
node outils/versionner.mjs
# 3. commiter et pousser
```

En complément, la page relit `version.json` toutes les minutes et à chaque retour sur l'onglet :
une version plus récente déclenche un rechargement sur une adresse neuve, sauf en pleine partie où
un bandeau propose la mise à jour.

## Les règles, versionnées

La version des règles (**v0.13**) est indépendante de celle du site. Elle vit dans `js/regles.js`,
où chaque version garde son texte intégral — les versions passées restent donc consultables dans
l'onglet « Versions des règles » de la page Règles, et pas seulement résumées.

Pour appliquer une modification de règle :

1. dupliquer `corps_0_13` en `corps_0_13_1` ;
2. y entourer le passage changé d'un `maj('0.13.1', '…')` — il s'affiche en violet, avec le numéro
   de version en pastille (`majBloc` pour un paragraphe entier) ;
3. ajouter l'entrée correspondante **en tête** de `REGLES_HISTORIQUE`.

`REGLES_VERSION` et le texte en vigueur suivent automatiquement la première entrée.

## Les visuels

Une carte n'apporte que son **illustration**. Tout le reste — minutage, pastilles, bandeau
d'objectif, libellé de cadrage — est redessiné par l'application à partir de ses propres données,
et n'apparaît donc jamais deux fois.

`outils/extraire-visuels.py <dossier-des-pdf>` régénère l'ensemble :

- les **illustrations** sont recadrées à 69 % de la hauteur, au-dessus de la zone d'information,
  et la boîte du minutage imprimé est repeinte en noir — l'application redessine le minutage
  exactement au même endroit ;
- les **huit pastilles** (Héroïne, Ennemi, Allié, Objet, Arme, Véhicule, Mort, Plan sans
  personnage) sont découpées à même les cartes, pour que l'application affiche partout les icônes
  imprimées et non des approximations.

La géométrie relevée sur les cartes est en tête du script : illustration jusqu'à 69 %, languette
des pastilles jusqu'à 78,5 %, bandeau jusqu'à 93,7 %, puis le libellé. Le rendu des cartes reprend
ces mêmes proportions, et sa taille de police est calée sur la hauteur (hauteur = 14,33 em) pour
que les proportions tiennent à toutes les échelles.

Le nom du fichier est la seule convention à respecter — remplacer `assets/gp/317.webp` suffit à
mettre la carte à jour. La case **Illustrations** de l'accueil masque les images sans toucher aux
informations de jeu.

## Les minutages

Le minutage n'est plus une image : c'est une donnée que l'application contrôle, affichée en police
d'afficheur. Il se règle plan par plan dans **Matériel › Minutages** — la surcharge vit dans
`cfg.minutages`, indexée par numéro de plan. Il ne conditionne aucun placement ; il n'entre en jeu
que dans les objectifs qui rapportent selon le minutage (**Variables › Chronologie**).

## La table de jeu

Colonne de gauche : la zone de pioche, puis les bancs de montage. Colonne de droite : joueuses,
score, recensement des icônes et bandeaux du banc.

La zone de pioche se lit en **deux lignes**, une par famille de cartes : la pioche des Plans Larges
suivie de son chutier, puis la pioche des Plans Moyens / Gros Plans suivie du sien. Chaque pioche
est dessinée en pile de cartes décalées, pour qu'on la distingue au premier coup d'œil d'une carte
posée sur la table.

La pioche des **Plans Larges** est face cachée : ces cartes ont un vrai dos. Celle des **Plans
Moyens / Gros Plans** montre sa face du dessus — ces cartes étant recto-verso, une pioche ne peut
pas les cacher. L'IA en tient compte : elle évalue cette carte comme une carte connue.

Au montage, une carte Plan Moyen / Gros Plan est présentée **entière**, gauche et droite soudées
comme sur la table : on clique la moitié que l'on veut laisser visible, puis l'emplacement dans son
banc. La moitié écartée n'est pas éteinte — la carte reste entièrement lisible, un cadre orange
marque simplement le côté retenu.

La zone de jeu garde la même hauteur d'une phase à l'autre et reste affichée pendant les tours
d'IA : rien n'apparaît ni ne disparaît sous le curseur entre deux clics. Choisir une moitié ne
repeint que la carte, sa consigne et les emplacements du banc.

Les **IA jouent d'un bloc** : dès qu'une joueuse humaine est à la table, tous les coups d'IA en
attente sont résolus sans temporisation ni rendu intermédiaire, et la main revient directement. Sur
la table la plus lourde — quatre joueuses dont trois Stratèges — un clic rend la main en moins de
150 ms. Une table tenue à 100 % par des IA reste, elle, jouée pas à pas : sans spectateur humain à
qui rendre la main, il faut bien pouvoir la regarder (`cfg.vitesseIA`).

Sur une carte, le survol ouvre un aperçu : minutage en grand, chaque pastille nommée, et le bandeau
d'objectif avec ce qu'il rapporte. Les pastilles se resserrent quand elles sont nombreuses, pour ne
jamais déborder du cadre de la carte — y compris sur un Gros Plan, qui n'occupe qu'une demi-largeur.
Les illustrations se masquent en cours de partie depuis le bandeau de tour.

## Le modèle de jeu

Un banc de montage est une suite de **séquences**, chaque séquence une suite de **plans visibles**.

- Une carte **Plan Moyen / Gros Plan** se glisse sous les précédentes : un seul de ses deux plans
  reste visible, et c'est celui qui compte. Le joueur choisit lequel, et à quel bout de quelle
  séquence il l'accroche.
- Une carte **Plan Large** ouvre toujours une nouvelle séquence, détachée du reste. Deux Plans
  Larges ne peuvent pas se toucher.
- Une **Carte Raccord** peut se poser entre deux séquences voisines pour les souder.
- Un **Générique** se pose en tête (Ouverture) ou en fin (Crédits) de montage et bloque ce bord.
  La moitié à double lecture peut être jouée dans l'un ou l'autre rôle.

La partie s'ouvre sans aucun tirage : chaque joueuse a devant elle les **deux** cartes Plan de départ
— version A et version B — donc ses **quatre faces** au choix. La boîte en contient quatre
exemplaires de chaque version, un par joueuse.

Le tour se joue ensuite en deux phases : **Dérushage** (chacune pioche une carte dans un chutier ou
sur une pioche), puis **Montage** (chacune la pose). La partie s'arrête au 10e plan posé.

## Ce qui reste ouvert dans les règles

Chacun de ces points est une variable réglable dans l'écran **Variables** :

- **La portée des bandeaux.** Les règles ne la fixent que pour le Raccord (« 1 point par carte dans
  sa séquence ») et le Générique (« 2 points par Carte Raccord dans le montage »). Les autres
  bandeaux — cadrage, élément, paire, mort — sont lus par défaut sur le **montage entier** ;
  `porteeParDefaut: 'SEQUENCE'` bascule sur l'autre lecture. Les deux donnent des jeux très
  différents (voir plus bas).
- **Le sens de pose** : aux deux bouts d'une séquence, ou à droite seulement.
- **Le symbole ✕ noir** des bandeaux de la famille Mort, interprété ici en « plan sans personnage ».
- **Le rôle du minutage** : affiché, mais il ne rapporte rien tant que le bonus de chronologie
  (variante hors règles) est à zéro.
- **L'appariement recto-verso des Plans de départ** : les 4 faces du PDF sont groupées deux à deux
  dans l'ordre du fichier — quelles faces sont au dos l'une de l'autre reste à confirmer. Les quatre
  étant de toute façon proposées, cela ne change rien au choix, seulement au matériel imprimé.
- Les Plans Larges **101** et **102** n'ont ni pastilles ni bandeau dans le PDF source. Ils restent
  dans le paquet pour respecter le compte de 14, et sont signalés « à compléter ».

## Laboratoire

Une campagne rejoue N parties sans interface et sort : distribution des scores, origine des points
par type de bandeau, taux de victoire par siège et par profil d'IA, nombre de séquences et de
Cartes Raccord, part de parties serrées et d'égalités.

Mesures sur 300 parties à 3 joueuses (Novice / Équilibré / Stratège), variables par défaut :

| | Portée montage | Portée séquence |
|---|---|---|
| Score moyen | 58,6 | 67,6 |
| Séquences par banc | 4,4 | 1,0 |
| Part des objectifs de cadrage | 43 % | 24 % |
| Parties serrées (≤ 3 pts) | 15 % | 12 % |

Sur la lecture « montage », les Plans Larges se cumulent et les objectifs de cadrage écrasent le
reste. Sur la lecture « séquence », plus personne ne pose de Plan Large : la fragmentation coûte
trop cher. C'est le premier arbitrage à trancher.

Force des profils, moyennée sur les trois ordres de sièges : Novice 18 %, Équilibré 39 %,
Stratège 42 %. En duel, le Stratège bat le Novice 62 / 38.
