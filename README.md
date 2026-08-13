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
| **Matériel** | Galerie et **éditeur** de toutes les cartes — minutage, icônes, pouvoir, appariement — plus le tableau complet et son export PDF |
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

## L'éditeur de matériel

Rien de ce qui est imprimé sur une carte n'est figé. L'écran **Matériel** est aussi l'éditeur : la
galerie reste à gauche, la carte ou le lot en cours d'édition dans une colonne à droite.

### Deux jeux, en permanence

L'**Imprimé** — les cartes des PDF, intouchables — et le **Modifié**, qui porte les retouches.
Un sélecteur en tête d'écran dit lequel part en partie, et le rappel s'affiche sur l'accueil comme
dans le bandeau de la table de jeu. Basculer de l'un à l'autre ne détruit rien : il n'y a pas de
remise à zéro globale. La galerie, elle, montre et règle toujours le Modifié ; chaque valeur qui
s'en écarte affiche la valeur imprimée à côté d'elle. Une partie en cours garde le jeu avec lequel
elle a été lancée.

### Recto et verso

Le recto et le verso d'une carte Plan Moyen / Gros Plan ne portent pas les mêmes plans : « 201R » et
« 201V » sont deux plans distincts, avec leur propre minutage, leurs propres icônes et leur propre
pouvoir. La **face jouée se déduit de la pose** — la moitié laissée visible se retrouve au bout libre
de la carte, donc un Gros Plan accroché à gauche d'une séquence est celui du recto et à droite celui
du verso (`faceSelonPose`, réglable dans Variables).

Le matériel extrait des PDF ne donne qu'un minutage par numéro : le recto et le verso **partent donc
tous deux de cette valeur**, et c'est l'éditeur qui reçoit les vraies valeurs de verso.

### Ce qui se règle, plan par plan

- son **numéro** — renumérotable à la main. Ce n'est qu'une étiquette : l'identité d'un plan reste
  son numéro imprimé, qui sert de clé et désigne son illustration, donc renuméroter ne casse aucun
  appariement. Deux plans peuvent porter le même numéro ; un bandeau rouge en tête d'écran les
  signale, et le tableau rappelle le numéro imprimé à côté du nouveau ;
- son **minutage** — une donnée, plus une image ; il ne conditionne aucun placement et n'entre en jeu
  que dans les objectifs qui rapportent selon le minutage (**Variables › Chronologie**) ;
- ses **icônes** — les six éléments, plus le marqueur de plan de mort. Une même icône peut être
  portée **plusieurs fois** : un clic sur la pastille en ajoute une, un clic droit en retire une, et
  le compte s'affiche en badge. Chaque icône compte pour elle-même au décompte
  (`elementParIcone: false` revient à compter les plans porteurs) ;
- son **pouvoir**, écrit comme sur la carte : `X points × ce que l'on compte`, où « ce que l'on
  compte » est un cadrage, une icône, un couple d'icônes voisines, une mort, un plan sans
  personnage, une Carte Raccord du montage, une carte de la séquence, un plan du montage **avant
  ou après un seuil de minutage**, un plan placé **avant ou après la carte porteuse** et portant une
  icône ou un cadrage donné, l'absence d'une icône, ou le fait que **le montage se lise dans
  l'ordre** — chaque minutage supérieur ou égal à celui de son voisin de gauche, les plans à 00:00
  restant neutres (`chronoIgnoreZero`).

  Le **couple d'icônes** n'est pas une adjacence : il apparie les icônes réunies dans sa portée.
  Quatre icônes font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes
  en demande une de chaque.

Une carte double s'édite avec **ses deux faces affichées** et ses quatre plans côte à côte. Son
**appariement** est réglable — la répartition imprimée est conservée tant qu'on n'y touche pas.

### La boîte, les vues, la sélection

Chaque carte s'**active ou s'écarte de la boîte** : seules les cartes activées partent dans le
paquet, dans l'un comme dans l'autre jeu.

Cinq vues de galerie : les cartes Plan Moyen / Gros Plan, les **Gros Plans seuls**, les **Plans
Moyens seuls** (recto et verso y figurent séparément, moitiés orphelines comprises), les Plans
Larges et les Plans de départ. Plus **Tableau complet** et **Statistiques**.

La **sélection est multiple** : un clic simple la remplace, maj+clic l'étend — du dernier plan cliqué
jusqu'à celui-ci, ou un plan isolé de plus. Elle **survit au changement de vue**, si bien qu'on règle
d'un coup des Gros Plans et des Plans Moyens pris dans deux galeries différentes ; le compteur dit
combien de plans sont sélectionnés hors de la vue courante. Le panneau se règle alors exactement
comme celui d'un plan seul, chaque geste partant aussitôt sur toute la sélection — rien à confirmer. Une icône que seule une partie de la sélection
porte est marquée **partielle** : un clic la donne à tous, un second la retire de tous.

Un **numéro de plan désigne le même plan partout**. Le Plan Moyen 201 est porté par trois cartes ;
le régler une fois le règle sur les trois, car la retouche est indexée par sa clé et non par la
carte qui l'accueille. Seules les faces sont distinctes : `201R` et `201V`.

**Tri** par numéro, minutage ou famille. **Filtres** par face (recto et verso, recto seulement,
verso seulement — dans la vue des cartes il les retourne toutes du même côté), icône, type de
pouvoir, plage de minutage, famille, état (à l'imprimé / retouché) et composition de la boîte.

Deux boutons de nettoyage — **Enlever toutes les icônes** et **Enlever le pouvoir** — valent pour un
plan comme pour toute une sélection. Ils posent la valeur « rien », ce qui n'est pas la même chose
que revenir à l'imprimé.

### Statistiques

L'onglet **Statistiques** compte le matériel tel qu'il part en partie — cartes activées, plans
faces comprises — et met l'**Imprimé et le Modifié côte à côte avec leur écart**. Il se filtre par
cadrage, par icône et par type de pouvoir ; un bandeau rappelle alors combien de plans les filtres
retiennent. Ce qu'il compte : la boîte, les
cadrages, les icônes, les types de pouvoir, et les minutages (le plus court, le plus long, la
moyenne, la distribution par tranche de dix). La colonne surlignée est le jeu qui se lance.

### Persistance et export

Les retouches vivent dans `cfg.materiel` :

```
plans[clé]  = { tc, el, obj, mort }   chaque champ absent = la valeur imprimée
paires[i]   = [pmNum, gpNum]          l'appariement de la i-ème carte
```

La clé d'un plan est son numéro suivi de sa face pour les moitiés d'une carte double — « 201R »,
« 201V » — et son seul numéro pour un Plan Large ou un Plan de départ, qui ont un vrai dos. Numéros :
101-114 les Plans Larges, 115-118 les Plans de départ, 201-230 et 290-292 les Plans Moyens, 301-330
et 390-392 les Gros Plans. Les cartes écartées vivent à part dans `cfg.cartesDesactivees` : c'est la
composition de la boîte, pas une retouche de carte.

Comme tout vit dans `cfg`, les retouches sont enregistrées, elles voyagent avec l'export JSON des
Variables, et le jeu s'y conforme partout — table de jeu, décompte, Laboratoire. Le retour aux
valeurs par défaut des **Variables** ne touche pas au matériel.

**Exporter le tableau en PDF** bascule la page sur une feuille imprimable et ouvre la boîte
d'impression du navigateur, où « Enregistrer au format PDF » écrit le fichier. Pas de bibliothèque
tierce — c'est le seul chemin qui marche partout sans dépendance.

## La table de jeu

Colonne de gauche : la zone de pioche, puis les bancs de montage. Colonne de droite : joueuses,
score, recensement des icônes et bandeaux du banc.

Les colonnes de lecture suivent la joueuse dont c'est le tour, mais **s'épinglent** sur une autre
d'un clic sur sa case — et y restent jusqu'à ce qu'on en désigne une autre, ou qu'on revienne à
celle dont c'est le tour. Le survol d'une carte posée dit en plus ce qu'**elle seule** rapporte
dans ce montage.

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
