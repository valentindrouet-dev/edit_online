# EDIT — plateforme de jeu

Plateforme de jeu et laboratoire d'équilibrage pour **EDIT**, jeu de placement de Cartes Plan dans
un banc de montage. Un jeu de Valentin Drouet, illustré par Anders Lazaret, édité par Big Budi
Games. Moteur conforme aux règles **v0.13**.

Site statique : aucune dépendance, aucune étape de compilation. Ouvrir `index.html`, ou servir le
dossier (`python3 -m http.server`).

## Écrans

| Écran | Rôle |
|---|---|
| **Accueil** | Table de 1 à 4 joueuses, humaines ou IA, et les trois options d'affichage — tout le reste se règle dans Variables |
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
js/anim.js       le vol d'une carte d'un endroit de la table à un autre
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
informations de jeu. Sans image, la carte se réorganise pour la lecture nue : les icônes prennent
toute la place du visuel sur le fond du cadrage, la languette blanche disparaît, le minutage double
et le bandeau du pouvoir s'étale.

## L'éditeur de matériel

Rien de ce qui est imprimé sur une carte n'est figé. L'écran **Matériel** est aussi l'éditeur : la
galerie reste à gauche, la carte ou le lot en cours d'édition dans une colonne à droite.

### Deux jeux, en permanence

L'**Origine** — les cartes des PDF, intouchables — et le **Modifié**, qui porte les retouches et qui
part en partie par défaut. Deux sélecteurs disent lequel se lance : l'un en tête de l'écran Matériel,
l'autre sur l'accueil juste au-dessus du bouton de départ. Le rappel s'affiche aussi dans le bandeau
de la table de jeu. Basculer de l'un à l'autre ne détruit rien : il n'y a pas de
remise à zéro globale. La galerie, elle, montre et règle toujours le Modifié ; chaque valeur qui
s'en écarte affiche la valeur imprimée à côté d'elle. Une partie en cours garde le jeu avec lequel
elle a été lancée.

### Recto et verso

Une carte Plan Moyen / Gros Plan porte son **Plan Moyen à gauche et son Gros Plan à droite** sur le
recto ; le verso, retourné autour de l'axe vertical, les échange.

Ses deux faces ne portent pas les mêmes plans : « 201R » et
« 201V » sont deux plans distincts, avec leur propre minutage, leurs propres icônes et leur propre
pouvoir. La **face jouée se déduit de la pose** — la moitié laissée visible se retrouve au bout libre
de la carte, donc un Gros Plan accroché à gauche d'une séquence est celui du **verso** et à droite
celui du **recto** (`faceSelonPose`, réglable dans Variables).

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
  compte » est un cadrage, une icône, un couple d'icônes, une mort, un plan sans personnage, une
  Carte Raccord, une carte, un plan **avant ou après un seuil de minutage**, l'absence d'une icône,
  ou le fait que **le montage se lise dans l'ordre** — chaque minutage supérieur ou égal à celui de
  son voisin de gauche, les plans à 00:00 restant neutres (`chronoIgnoreZero`) —, ou encore
  qu'**aucun plan n'ait un minutage donné**, égal au seuil, ou strictement avant, ou strictement
  après : réglé sur 00:00, il vise les Raccords et les Génériques, dont le minutage s'affiche en
  bleu ;
- sa **portée** — voir ci-dessous : là où le pouvoir va compter ;
- **un second pouvoir**, s'il en faut un — voir plus bas.

  Les **flèches de portée prennent la couleur de l'icône qu'elles entourent** — rouge sombre autour
  de l'Ennemi, brun autour d'un Véhicule, vert sombre autour de l'Héroïne (`ENCRES` et `teinteObj()`
  dans `js/data.js`). Les encres sont volontairement foncées, pour tenir sur un bandeau vert, orange,
  rouge ou gris, et un halo clair les détache du gris sombre d'un Raccord. Un couple prend la couleur
  de sa première icône ; ce qui ne montre pas d'icône reste dans l'encre neutre.

  Une **icône barrée** — le pouvoir qui la veut absente — porte une croix de deux barres rouges
  dessinées (`croixNon()` dans `js/cards.js`), cernées de blanc. Un « ✕ » de fonte, agrandi jusqu'à
  se voir, finissait par recouvrir l'icône et l'on ne savait plus ce qui était interdit : deux barres
  laissent quatre quartiers ouverts, la croix domine et l'icône se lit encore.

  Le **couple d'icônes** n'est pas une adjacence : il apparie les icônes réunies dans sa portée.
  Quatre icônes font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes
  en demande une de chaque.

  La **valeur d'un pouvoir peut être négative** : `-2 ×` retranche deux points par élément compté.
  La pastille passe alors au rouge — chiffre rouge sombre sur fond rouge clair — et le signe moins
  s'y dessine en **barre pleine** devant le chiffre, jamais en caractère typographique : à la taille
  d'un bandeau de Gros Plan, un tiret se confond avec le trait du cercle. Au montage, le jeton du
  coin suit la même règle. Rien d'autre ne change : le décompte additionne, et une somme peut être
  négative.

### Deux pouvoirs sur un même plan

Un plan peut porter **deux pouvoirs**, côte à côte sur son bandeau et séparés d'un trait. Ils
comptent **tous les deux**, chacun avec sa propre valeur et sa propre portée, et s'affichent tous les
deux — sur la carte, dans l'infobulle, dans la colonne de score, dans les statistiques.

Le modèle les nomme `obj` et `obj2` ; tout ce qui lit les pouvoirs passe par `objsDe(plan)`, qui rend
la liste de ceux qui existent, si bien qu'aucun calcul n'a à savoir combien il y en a. L'éditeur
ouvre le second emplacement d'un bouton **+ second pouvoir** et le règle exactement comme le premier
— sur un plan seul comme sur **toute une sélection**.
Un plan qui en porte deux produit **deux lignes de décompte** : la colonne de score les montre
séparément, et le jeton du coin en donne la somme.

Sur le bandeau, deux pouvoirs se lisent en version compacte — celle du Gros Plan — pour tenir dans la
même hauteur.

### La portée d'un pouvoir

Chaque pouvoir dit **où il compte**. C'est une ligne de l'éditeur, sous le pouvoir lui-même, et
quatre choix (`PORTEES` dans `js/data.js`, `porteeDe()` dans `js/scoring.js`) :

| Portée | Ce qu'elle prend | Sur le bandeau |
|---|---|---|
| `AVANT` | les plans du montage placés strictement avant la carte porteuse | `2 × ◀ Héroïne` |
| `APRES` | ceux placés strictement après | `2 × Héroïne ▶` |
| `SEQUENCE` | la séquence de la carte porteuse | `2 × ◀ Héroïne ▶` |
| `MONTAGE` | le montage entier | `2 × Héroïne` |

Les flèches se lisent depuis la carte : elles montrent le côté d'où viennent les points. Elles se
serrent contre ce qu'elles portent, et se lisent — comme le `×` et le `si` — au corps des icônes du
bandeau. Un bandeau sans flèche compte partout. `AVANT` et `APRES` remplacent l'ancien pouvoir de position, qui était un
type à part ; les cartes déjà réglées ainsi sont converties au chargement.

Un bandeau imprimé qui ne précise pas sa portée retombe sur `porteeParDefaut` — le réglage de
Variables, qui ne vaut plus que pour ceux-là.

### Les pouvoirs qui comptent des séquences

Quatre pouvoirs ne comptent pas des plans mais des **séquences** : ils lisent la *forme* du banc —
combien de séquences, de quelle taille, ce qu'elles portent — et non son contenu carte par carte.
Ils reçoivent donc `banc` directement plutôt qu'une portée de plans (`KINDS_SEQUENCE` dans
`js/data.js`, les cas correspondants de `valeurObjectif()` dans `js/scoring.js`).

| Pouvoir | Ce qu'il compte | Réglages |
|---|---|---|
| `SEQ_TAILLE` | les séquences d'au moins `seuil` plans | la valeur, le seuil |
| `SEQ_VOISINES` | les séquences placées **au-dessus** (`AVANT`) ou **en dessous** (`APRES`) de celle qui le porte | la valeur, le sens |
| `SEQ_LONGUE` | les **plans de la plus longue séquence** du banc — réglé sur 1, il vaut exactement ce nombre | la valeur |
| `SEQ_AVEC` | les séquences qui portent (`AVEC`) — ou ne portent pas (`SANS`) — la cible visée | la valeur, le sens, la cible |

La **cible** d'un `SEQ_AVEC` tient dans une seule clé, `cible` : une icône, un cadrage (`PL`, `PM`,
`GP`), ou `RACCORD` pour une Carte Raccord (`ciblesSequence()`). Le CSV n'a donc pas de colonne de
plus — la cible se range dans la même que celle des autres pouvoirs.

Deux règles s'appliquent à tous les quatre :

- **un Raccord n'est pas un plan** : il ne compte pas dans la taille d'une séquence, ni dans la plus
  longue. Il reste, lui, une cible possible pour `SEQ_AVEC` ;
- **leur portée ne se règle pas.** `objPortee()` la force à `MONTAGE`, comme pour `CHRONO` : c'est le
  banc entier qu'ils regardent, et l'éditeur masque la ligne de portée plutôt que d'offrir un choix
  sans effet.

Sur le bandeau, ils portent une **pastille violette « Séquence »** (`.tag-seq`) qui les distingue de
la pastille blanche « Plan » : ce n'est pas une carte qu'ils comptent, c'est un bloc du banc. Le
`SEQ_VOISINES` y ajoute une flèche `▲` ou `▼`, et le `SEQ_LONGUE` garde la pastille « Plan » puisque
ce sont bien des plans qu'il compte — ceux d'une séquence désignée.

Dans les statistiques des pouvoirs, ils comptent **un déclencheur** : le matériel seul ne peut pas
dire combien de fois la forme d'un banc les fera marquer, et un compte à un est leur plancher
honnête.

Une carte double s'édite avec **ses deux faces affichées** et ses quatre plans côte à côte. Son
**appariement** est réglable — la répartition imprimée est conservée tant qu'on n'y touche pas.

### La boîte, les vues, la sélection

Chaque carte s'**active ou s'écarte de la boîte** : seules les cartes activées partent dans le
paquet, dans l'un comme dans l'autre jeu.

Six vues de galerie : les cartes Plan Moyen / Gros Plan, les **Gros Plans seuls**, les **Plans
Moyens seuls** (recto et verso y figurent séparément, moitiés orphelines comprises), les Plans
Larges, les Plans de départ, et **Tous les plans** — les 150 plans du jeu dans une seule galerie,
triés par numéro. Toutes règlent le même matériel : ce sont des vitres différentes, pas d'autres
cartes. Plus **Tableau complet**, **Statistiques** et **Statistiques des pouvoirs**.

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

Les icônes s'y comptent **deux fois, en deux tableaux** : celles qui sont **sur les cartes** — ce que
la boîte offre — et celles que **les bandeaux réclament** — ce que les pouvoirs cherchent à compter.
Ce sont deux grandeurs différentes, qu'un seul nombre confondait. Un couple réclame ses deux icônes ;
une absence réclame la sienne, en creux.

### Statistiques des pouvoirs

Un second onglet ne regarde que les **bandeaux**, et les présente **comme sur les cartes** — le
bandeau redessiné, pas son libellé : c'est ainsi qu'on les lit en jouant.

Deux pouvoirs sont « le même » quand ils ont la même **forme** — même famille, même cible, même sens
et même seuil, même portée —, quelle que soit leur valeur : `signatureObj()` en donne la clé.
« 1 × ◀Plan▶ » et « 2 × ◀Plan▶ » sont donc une seule ligne, et la colonne **valeurs** dit comment
les points s'y répartissent (`1×13`, `2×4`).

Le bandeau se lit en **deux colonnes** : **Points**, la pastille de valeur ; **Effet**, ce que cette
valeur compte — le `×` ou le `si` restant avec l'effet, puisque c'est lui qui dit comment la valeur
se déclenche.

**Un bandeau ne vaut pas sa valeur : il vaut sa valeur multipliée par ce qu'il trouve à compter.**
« 3 × ⛨ » ne rapporte trois points que s'il y a une arme sur la table, et trente s'il en trouve dix.
La colonne **déclencheurs** compte donc, sur tout le matériel, les plans qui font marquer ce
pouvoir-là (`declencheurs()`) — les armes pour un objectif d'arme, les couples appariés pour un
objectif de couple, les plans du bon cadrage pour un objectif de cadrage. Les bandeaux qui se lisent
« n si … » — absence, ordre, minutage absent — ne se déclenchent qu'une fois : leur compte est 1. Le
**total** est le produit des deux, sommé sur les plans porteurs. C'est lui qui dit ce qu'un pouvoir
pèse vraiment dans la boîte, et non le nombre de cartes qui l'affichent.

Chaque ligne donne encore le nombre de plans porteurs, sa **part du jeu** en barre, la répartition
par cadrage, et l'**écart entre l'Imprimé et le Modifié** — un pouvoir ajouté ou retiré par retouche
s'y voit tout de suite.

**Chaque en-tête range son tableau** (`thTri()`, `trierPar()`) : un premier clic trie du plus grand
au plus petit — alphabétiquement sur une colonne de texte —, un second inverse le sens. Les trois
tableaux gardent leur tri chacun de leur côté.

En tête, cinq cartouches : plans porteurs, plans sans bandeau, formes distinctes, points en
potentiel, points par bandeau. En dessous, deux lectures plus courtes : **par famille de pouvoir**
et **par valeur** — où le total d'une valeur additionne, bandeau par bandeau, ce qu'elle peut
vraiment rapporter, un 3 posé sur un pouvoir que rien ne déclenche ne valant rien.

### Persistance et export

Les retouches vivent dans `cfg.materiel` :

```
plans[clé]  = { tc, el, obj, obj2, mort }   chaque champ absent = la valeur imprimée
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

**Tableau en PDF** bascule la page sur une feuille imprimable et ouvre la boîte d'impression du
navigateur, où « Enregistrer au format PDF » écrit le fichier. Pas de bibliothèque tierce — c'est le
seul chemin qui marche partout sans dépendance.

**Cartes en CSV** sauvegarde le jeu modifié, et **Importer un CSV** le relit. Le fichier contient
tout le matériel — une ligne par plan, une par carte —, pas seulement les retouches, si bien qu'il
se lit et se corrige dans un tableur :

```
objet;cle;numero;minutage;icones;mort;pouvoir;points;cible;portee;sens;seuil;pouvoir2;points2;…;boite
plan;201R;201;42;HEROINE|ARME|ARME;oui;PAIRE;3;ARME+ARME;MONTAGE;;;MORT;-2;…;
carte;D01;;;;;;;;;;;;;…;oui
```

À la relecture, seule la **différence avec l'imprimé** est retenue : un aller-retour ne crée donc
aucune retouche fantôme, y compris sur les plans dont l'ordre imprimé des icônes n'est pas l'ordre
canonique. Le fichier est en UTF-8 avec BOM et séparé par des points-virgules, pour s'ouvrir
directement dans un tableur français.

## La table de jeu

Colonne de gauche : le **bandeau du tour**, la zone de pioche, puis les bancs de montage. Colonne de
droite : joueuses, score, recensement des icônes et bandeaux du banc, puis les **réglages
d'affichage** au pied — Images visibles, Points visibles, et le rappel du jeu de matériel.

Le bandeau est calé à gauche en tête de la colonne de jeu : centré sur toute la page, il s'ouvrait
une rangée à lui seul et repoussait la table vers le bas ; les deux colonnes démarrent maintenant à
la même hauteur. Il ne garde que ce qui change d'un instant à l'autre — la phase et qui joue. Le
**compte de plans est passé au-dessus du banc qu'il décrit** (« Banc de Val · Plan 4 / 10 »), chaque
joueuse ayant le sien, plutôt que dans un bandeau commun où il fallait se rappeler de qui il parlait.

Les **emplacements de pose se dressent en bandes verticales** entre les cartes. Couchés, un
« ＋ séquence » ou un « ⛓ raccorder » coûtait près de cent pixels, et trois d'entre eux suffisaient à
faire passer le banc à la ligne **avant même la pose** — pour revenir en arrière aussitôt la carte
posée. Debout, un emplacement en coûte trente : le banc garde donc, pendant qu'on vise, la largeur
qu'il aura une fois la carte posée. Il ne se réorganise qu'après, jamais pendant.

Le banc **tient sur une ligne tant que tout y entre**, puis passe à la ligne. Ce qui bascule, ce sont
les **séquences entières** : une séquence est un bloc insécable — ses plans se touchent, on ne les
sépare pas d'un retour à la ligne —, tandis que deux séquences distinctes s'empilent volontiers l'une
sous l'autre. Le défilement horizontal ne sert plus que d'ultime recours, pour une séquence à elle
seule plus large que le banc.

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

Une carte double **ne se présente pas toujours sur son recto** : posée sur la table, elle tombe d'un
côté ou de l'autre. La face visible se déduit de la graine et de l'identité de la carte
(`faceVisible()`) — reproductible, et sans rien à retenir tant que personne ne la retourne. Un bouton
**⟲ rotation** la retourne — sous chaque carte du chutier avant de la prendre, et sous la carte en
main pendant qu'on choisit sa moitié. Retourner ne joue pas le tour, la moitié déjà choisie le reste,
et la carte prise garde la face sur laquelle elle a été prise (`retourner()`). La face affichée est
une lecture : c'est le côté de pose qui décide de la face jouée, et l'aperçu de l'emplacement dit
laquelle on obtiendra. Le bouton a un raccourci : **F**, la carte survolée. La touche ne fait rien
si le curseur n'est sur aucune carte retournable, et ne joue jamais le tour.

La rivière montre **trois cartes par famille**, quel que soit le nombre de joueuses (`chutierPL`,
`chutierPMGP`), et le nombre de cartes restantes s'affiche sous chaque pioche.

Une configuration enregistrée écrase les valeurs par défaut — c'est ce qu'on lui demande. Mais un
réglage dont la valeur par défaut change ensuite garderait l'ancienne indéfiniment, sans que rien ne
le dise : c'est ainsi qu'une partie à deux joueuses a pu continuer à ne montrer que deux cartes par
famille, parce que le navigateur avait retenu le `chutierPL: 0` d'avant la v1.27 — « autant de cartes
que de joueuses ». `migrerCfg()` rattrape ces cas à la relecture, à l'ouverture comme à l'import
JSON. Un réglage qu'on repose soi-même à 0 retrouve l'ancienne lecture.

Pendant le choix du **Plan de départ**, les deux chutiers s'affichent déjà sous les quatre faces
proposées : on voit ce qui attend au premier dérushage, avec les boutons de rotation, mais les
cartes ne s'y prennent pas encore.

### Le tour tient sur un écran

Les règles gardent leurs deux temps — on dérushe, puis on monte — mais **l'écran ne les sépare
plus**. On reste devant la rivière du début à la fin du tour :

1. on clique la **moitié** que l'on veut garder sur une carte du chutier — la carte se soulève, la
   moitié retenue se cadre d'orange (`store.choixRiviere`) ;
2. le **banc ouvre aussitôt ses emplacements**, calculés sur cette carte-là sans qu'elle ait quitté
   le chutier (`coupsPossibles(state, p, hypothese)` — une lecture, la partie n'est pas touchée) ;
3. un clic sur un emplacement **joue le tour entier** : la carte quitte le chutier, la pioche
   recharge la place laissée vide, et le plan se pose dans le banc — un seul vol, un seul rendu
   (`jouerTour()`).

Il n'y a donc plus de fenêtre intermédiaire où la carte attendait seule au centre de la table, ni de
changement d'écran entre les deux temps. **Aucune consigne n'accompagne le geste** : la table se lit
d'elle-même — les cartes s'offrent, le banc ouvre ses emplacements, l'aperçu montre la place. Un mot
ne s'affiche que dans l'impasse, quand la moitié visée ne se pose nulle part (`aidePose()`). La zone de jeu garde exactement la même hauteur qu'on vise
ou non, et reste affichée pendant les tours d'IA : rien n'apparaît ni ne disparaît sous le curseur.
Viser ne repeint que les cartes de la rivière et le banc de qui joue (`rafraichirVisee()`).

Deux cas gardent l'ancien chemin en deux temps, et l'écran de montage avec : la **pioche face
cachée**, dont on ne peut pas viser une moitié qu'on ne voit pas, et l'**ordre imprimé**
(`tourComplet: false`), où la main passe entre le dérushage et le montage. Une carte qui ne se pose
nulle part se prend quand même — dérusher n'est pas facultatif.

**L'emplacement se pré-visualise** : survoler un emplacement montre le plan tel qu'il s'y posera,
**à la place exacte qu'il prendra**. L'aperçu recouvre la flèche de l'emplacement et s'étend du côté
où le plan tombera — à gauche d'une séquence pour une pose à gauche, à droite pour une pose à droite
(`versOu()` donne le côté, `.vers-gauche` / `.vers-droite` le placent). Il occupe donc l'espace resté
libre, celui-là même qu'il occupera une fois posé : il ne pousse aucune carte et ne se met devant
aucune.

Écarter les plans déjà posés pour lui faire de la place les faisait tous bouger sous le curseur — et,
depuis que le banc passe à la ligne, pouvait le faire basculer d'une ligne à l'autre puis revenir : le
banc sautait et clignotait. **Le banc ne bouge donc qu'au clic**, quand la carte est vraiment posée.

Au survol, l'étiquette de l'emplacement passe **sous** l'aperçu au lieu de lui passer devant : elle
disait où poser, la carte le montre mieux qu'elle.

L'aperçu se clique aussi — c'est la cible la plus large. Sa visibilité ne tient pas au seul `:hover` :
il déborde de son emplacement, et le curseur qui le longe passe par des zones qui n'appartiennent ni
à l'un ni à l'autre ; il clignoterait sous la main qui le vise. C'est donc le banc qui retient lequel
est ouvert (`.fente-choix.ouverte`), jusqu'à ce qu'on sorte du banc.
L'aperçu passe par `planPose()` et `faceJouee()`, donc il montre la
**face que le côté donne** : un Gros Plan accroché à gauche est celui du verso, à droite celui du
recto. Sur le matériel imprimé les deux faces partagent le même minutage et l'aperçu se ressemble ;
dès qu'une face est retouchée, la différence se voit avant de poser.

Le nom d'une joueuse ne dit pas son genre : les textes qui la désignent n'emploient donc pas de
pronom — « À son tour », et non « À elle de jouer ». Le rôle, lui, reste au féminin, comme dans les
règles de l'auteur (« Vous incarnez une monteuse de cinéma »).

### Le fil de la partie

Les joueuses jouent **l'une après l'autre, et cela se voit** : un coup, un rendu, la carte qui vole,
une pause, la suivante (`derouler()` dans `js/app.js`). Le fil est un jeton — `store.filIA` est
incrémenté à chaque nouveau départ, ce qui périme silencieusement le précédent : annuler, quitter ou
relancer ne laisse jamais un coup en attente se jouer par surprise.

Le coût est pour l'IA seule : sur la table la plus lourde — quatre joueuses dont trois Stratèges —
**le clic de la joueuse humaine lui rend la main en 54 à 180 ms**, et le tour des trois IA se
déroule ensuite à vue en trois secondes. Pendant ce tour, la table garde sa forme mais ne se laisse
pas cliquer (`body.ia-joue`, `body.coup-en-vol`).

Deux réglages dans **Variables › Rythme** : `vitesseIA` (la pause avant le coup d'une IA) et
`dureeVol` (le trajet d'une carte). `animerCoups: false` rend le jeu instantané.

### Les cartes en mouvement

`js/anim.js` est un FLIP : on relève la boîte de départ **avant** que l'état ne change, celle
d'arrivée **après** le rendu, et l'on interpole entre les deux un clone posé au-dessus de la page,
l'élément d'arrivée restant invisible le temps du vol. Le clone quitte son parent — une moitié de
carte y perdrait la hauteur et le corps que la carte lui donnait — donc on les lui rend
explicitement.

Trois vols, un par coup :

| Coup | D'où | Vers |
|---|---|---|
| Plan de départ | la face choisie | le plan qui ouvre le banc |
| Dérushage | la **moitié retenue** de la carte du chutier | sa place exacte dans le banc |
| — en même temps | la pioche | la place laissée vide dans le chutier |
| Montage | la moitié retenue | l'emplacement exact dans le banc |

Les vols d'un même coup partent **ensemble** : la carte prise s'en va pendant que la pioche la
remplace, ce qui se lit comme un seul mouvement.

Ce qui vole est la **moitié**, jamais la carte entière. `ancresDerushage()` relève chaque moitié à
part et le coup dit laquelle prendre : faire partir la carte entière la faisait se comprimer en vol
jusqu'à la largeur d'une moitié — de 254 pixels et d'un rapport de 1,4 à 85 pixels et 0,47 pour un
Gros Plan —, si bien qu'on la voyait rétrécir puis se réduire à la seule partie gardée. C'est bien
une moitié que l'on pose : c'est elle qui doit voler.

Le dérushage **d'une joueuse humaine** se rend en deux temps, et le premier reste dans le chutier :
la carte prise en sort pendant que la pioche le recharge, et ce n'est qu'ensuite que la zone passe au
montage. Sans cette étape, le chutier aurait déjà disparu et l'on ne verrait jamais la pioche le
recharger (`jouerDerushage()`).

Le tour **d'une IA** tient au contraire en un seul écran (`tourIA()`) : elle dérushe et monte d'un
bloc, sa carte va du chutier à son banc sans passer par le centre de la table. L'étape « carte en
main » n'a de sens que pour qui doit y décider quelque chose.

L'emplacement d'arrivée est connu : `poser()` enregistre `state.dernierPose = { p, seq, idx }`, et le
banc marque ce plan-là d'une classe `neuf`.

Sur une carte, le survol ouvre un aperçu : minutage en grand, chaque pastille nommée, et le bandeau
d'objectif redessiné en grand. **Chaque bandeau y montre son calcul** — « 5 trouvés × 2 = 10 pts » —
avant le total de la carte (`compteObj()`). Sur une carte à deux pouvoirs, et surtout quand leur
portée diffère, le total ne se croyait sinon que sur parole ; les points de chaque bandeau sont
transportés dans l'infobulle par `objsPts`. Les pastilles se resserrent quand elles sont nombreuses, pour ne
jamais déborder du cadre de la carte — y compris sur un Gros Plan, qui n'occupe qu'une demi-largeur.

Chaque plan du banc porte au **coin haut droit ce qu'il rapporte**, en face de son minutage : la
somme des jetons fait le score. Deux boutons du bandeau de tour commandent l'affichage —
**Images visibles** et **Points visibles** (`cfg.illustrations`, `cfg.pointsSurCartes`) ; les deux
options figurent aussi sur l'accueil.

La colonne de droite lit le banc suivi : **Icônes du banc** — le recensement que l'on ferait à la
main — puis **Score de la joueuse**, chaque bandeau posé avec ce qu'il rapporte, les points hors
bandeau s'il y en a, et le total.

Les **bandeaux identiques y sont réunis en une ligne** (`grouperBandeaux()`), avec leur nombre en
pastille — « ×6 » — et la somme de ce qu'ils ont rapporté. Six fois « 3 × Mort » occupaient six
lignes pour une seule information. Deux bandeaux sont identiques quand ils ont la même forme **et**
la même valeur : ce que l'œil lit comme un même bandeau.

### L'accueil ne garde que ce qui se voit

L'accueil ne propose plus que trois cases — **Illustrations**, **Points visibles**, **Mouvement des
cartes** : les trois seules qui changent ce que l'on voit, et qu'on a envie de basculer juste avant
de lancer. Tout le reste — sens de pose, portée par défaut, rythme, graine de partie, règles
optionnelles — vit dans **Variables**, où chaque réglage est décrit et groupé. Un réglage n'est
donc **jamais à deux endroits** : les anciens « réglages rapides » doublonnaient les Variables, et
les options figées par les règles (première joueuse au sort, pioche PM/GP face visible, Raccords qui
relient, deux Plans Larges qui ne se touchent pas) n'avaient plus à être proposées du tout.

### La fin de partie

L'écran de décompte ouvre sur le **podium**, puis :

- la **courbe des points de victoire** (`courbeScores()`) — une polyligne par joueuse, dans sa
  couleur, un point par carte posée, lue depuis `state.courbe` que le moteur alimente à chaque pose.
  Un SVG écrit à la main, sans bibliothèque ;
- les **statistiques de la partie** (`statsPartie()`) : points marqués, points par carte posée,
  écart entre la première et la dernière, Raccords joués, séquences, durée ; puis **d'où viennent
  les points**, en barres de part ; puis **les bandeaux qui ont le plus rapporté**, les huit
  premiers, dessinés comme sur les cartes ;
- le **détail par joueuse**, qui n'est plus un tableau de texte mais la **colonne de score du jeu**
  (`listeObjectifs()`) : les mêmes bandeaux, au même endroit, avec les mêmes points — bandeaux
  identiques réunis, ici aussi.

Le palmarès regroupe **joueuse par joueuse** : deux joueuses qui posent le même bandeau gardent
chacune leur ligne, c'est bien ce qu'elles en ont tiré séparément que l'on compare.

## Le modèle de jeu

Un banc de montage est une suite de **séquences**, chaque séquence une suite de **plans visibles**.

- Une carte **Plan Moyen / Gros Plan** se glisse sous les précédentes : un seul de ses deux plans
  reste visible, et c'est celui qui compte. Le joueur choisit lequel, et à quel bout de quelle
  séquence il l'accroche.
- Une carte **Plan Large** ouvre toujours une nouvelle séquence, détachée du reste. Deux Plans
  Larges ne peuvent pas se toucher.
- Une **Carte Raccord** relie : glissée **entre deux séquences voisines**, elle les raccorde
  forcément — elle ne peut pas s'y poser sans relier. Aux **deux bouts du montage**, en revanche,
  elle se pose comme un plan ordinaire : elle reste donc jouable même sans deux séquences à relier.
  Un Raccord posé entre deux séquences sans les relier n'existe pas.
  `raccordConnecte: false` en refait un plan ordinaire partout, comme variante.
- Un **Générique** se pose en tête (Ouverture) ou en fin (Crédits) de montage et bloque ce bord.
  La moitié à double lecture peut être jouée dans l'un ou l'autre rôle.

Une Ouverture, un Générique de fin et un Raccord sont tous les trois des **Cartes Raccord** : c'est
leur type. Le libellé du bas d'un plan dit ce type, et non le rôle que la carte tient — il indique
donc « Raccord » sur les trois. Ce que la carte fait — ouvrir, fermer, relier — se lit à son
illustration et aux emplacements qu'elle propose. Le code garde la distinction dans `plan.transition`,
qui pilote la pose ; le décompte, lui, ne connaît que `estRaccord()`.

La partie s'ouvre sans aucun tirage : chaque joueuse a devant elle les **deux** cartes Plan de départ
— version A et version B — donc ses **quatre faces** au choix, rangées **par minutage croissant**
pour se comparer dans l'ordre du film (`choixDepart()`). La boîte contient quatre exemplaires de
chaque version, un par joueuse. La **première joueuse** est tirée au sort
(`premierJoueurAleatoire`) ou **désignée** avant la partie (`premierJoueur`, le rang dans la liste) ;
c'est elle qui ouvre chaque phase et qui la referme.

Le **tour d'une joueuse est d'un seul tenant** (`tourComplet`, la lecture par défaut) : elle dérushe,
elle monte, puis elle passe la main — on suit ainsi son coup entier, carte prise et carte posée. Le
texte imprimé décrit l'autre ordre, par phases : toutes dérushent, puis toutes montent
(`tourComplet: false`). Sur 500 parties à trois IA Équilibrées et première joueuse fixée, le tour
d'un seul tenant réduit légèrement l'avantage du premier siège — **38 / 34 / 27 %** de victoires,
contre **41 / 31 / 28 %** dans l'ordre imprimé.

Un **Raccord, une Ouverture, un Générique ne sont pas des plans** : ils relient ou encadrent le film,
ils ne le racontent pas. Ils ne comptent donc pas dans le total qui arrête la partie
(`plansComptes()`), et en jouer un n'avance pas vers la fin. La partie s'arrête **dès qu'une joueuse
pose son `tours`-ième plan** : les autres ont alors droit à un tour chacune, puis on compte. Elles ne
finissent donc pas forcément avec le même nombre de plans — `state.finDeclenchee` retient qui a
déclenché, `state.toursApresFin` compte les tours joués depuis.

Le tour se joue ensuite en deux phases : **Dérushage** (pioche d'une carte dans un chutier ou sur une
pioche), puis **Montage** (pose de cette carte). Le seuil qui déclenche la fin est de **dix plans,
Plan de départ compris** (`cfg.tours`) — il en reste donc neuf à monter.

Un **Plan de départ n'est pas un Plan Large** : il a son propre cadrage, `DEP`. C'est un plan comme
un autre pour tout ce qui compte des cartes du montage — couples d'icônes, minutages, positions,
points par carte de séquence — mais aucun bandeau de cadrage ne le vise, et aucun ne le désigne.

## Les modes de jeu

Un **mode de jeu** n'est pas un réglage de plus : c'est une manière de monter le film. Il se choisit
sur l'accueil, sous les options de partie, et pose d'un coup les variables qui le définissent
(`MODES` et `modeCourant()` dans `config.js`). Celles-ci restent lisibles une à une dans **Variables**
pour qui veut sortir des sentiers battus, mais on ne règle pas un mode à la case à cocher.

### Classique

Le film se monte sur une seule bande, séquence après séquence. C'est le mode décrit par tout ce qui
précède.

### Le banc en lignes

`bancEnLignes` change la géométrie du montage et sa lecture, pas son barème. Le film ne se lit plus
sur une bande unique mais **en pile** :

- **une séquence par ligne**. Le Plan de départ tient la sienne ; un **Plan Large** en ouvre une
  nouvelle, à lui seul, quel que soit le réglage de `plNouvelleSequence` — une ligne par séquence
  n'aurait pas de sens si un Plan Large pouvait s'accrocher au bout d'une autre ;
- le **Plan Large — ou le Plan de départ — tient le centre de sa ligne**. Il en est l'ancre : ce qui
  s'accroche à sa gauche pousse vers la gauche, ce qui s'accroche à sa droite pousse vers la droite,
  et lui ne bouge plus. `ancrageLigne()` calcule la marge qui l'y place, à partir des largeurs de
  `LARGEUR_BANC` ; sans elle, la ligne se recentrait à chaque pose et tout le film glissait de côté ;
- les **Plans Moyens et Gros Plans** s'accrochent **à gauche ou à droite** de la ligne de leur
  choix, comme ils le faisaient au bout d'une séquence ;
- une **nouvelle séquence** se pose **au-dessus ou en dessous** de la pile — jamais entre deux. Le
  moteur ne propose donc que les positions `0` et `sequences.length`, au lieu de toutes ;
- un **Raccord n'y relie rien** : deux séquences ne se touchent pas, elles se succèdent. `SOUDER`
  n'est plus proposé, et le Raccord se pose comme un plan ordinaire — en attendant le pouvoir qui
  lui sera donné ;
- **le montage se lit d'un seul tenant**, du premier plan en haut à gauche de la première ligne
  jusqu'au dernier plan en bas à droite de la dernière : les lignes s'enchaînent comme les lignes
  d'un texte. `suitesDeLecture()` (`scoring.js`) rend donc une seule suite — le film entier — au lieu
  d'une par séquence, ce qui vaut pour l'ordre chronologique (`chrono()`) comme pour les raccords par
  élément (`jonctionsRaccordees()`). Les portées `AVANT` / `APRES` / `MONTAGE` lisaient déjà le
  montage à plat : elles ne changent pas.

Côté affichage, `.banc-piste` prend la classe `lignes` et devient une colonne ; chaque séquence est
enveloppée dans une `.ligne` qui la centre, et c'est la marge de `.ligne-corps` — calculée par
`ancrageLigne()` — qui place l'ancre au centre du banc.

Les deux emplacements latéraux (`.bord`) sont **posés hors du flux**, contre les flancs de la
séquence : ils n'occupent aucune largeur, donc en ouvrir un d'un seul côté ne décale ni la ligne ni
son ancre. Chacun a la **forme du plan qui va s'y poser** — la largeur d'un Gros Plan, d'un Plan
Moyen, d'un Plan Large (`--ap`) et toute la hauteur d'une carte : on vise la place que la carte
prendra, pas une flèche. Les nouvelles séquences se rendent en **bandes** (`.ecart.bande`) au-dessus
et en dessous de la pile ; l'aperçu de pose y suit le même axe (`vers-haut`, `vers-bas`), s'écartant
du banc dans la direction où la ligne ira plutôt que de recouvrir celles déjà montées. Une bande vide
n'est pas rendue du tout — le banc ne doit pas se décaler selon qu'on vise ou non. Le centrage se
fait en `safe center` : calé à gauche dès que ça déborde, pour que le début d'une longue ligne reste
atteignable.

## Ce qui reste ouvert dans les règles

Chacun de ces points est une variable réglable dans l'écran **Variables** :

- **La portée des bandeaux imprimés.** Les règles ne la fixent que pour le Raccord (« 1 point par
  carte dans sa séquence ») et le Générique (« 2 points par Carte Raccord dans le montage »). Les
  autres bandeaux imprimés — cadrage, élément, paire, mort — ne la disent pas, et retombent sur
  `porteeParDefaut`, qui les lit sur le **montage entier** ; `'SEQUENCE'` bascule sur l'autre
  lecture. Les deux donnent des jeux très différents (voir plus bas). Un pouvoir réglé dans
  l'éditeur porte la sienne et ne dépend plus de ce réglage.
- **Le sens de pose** : aux deux bouts d'une séquence, ou à droite seulement.
- **Le symbole ✕ noir** des bandeaux de la famille Mort, interprété ici en « plan sans personnage ».
- **Le rôle du minutage** : affiché, mais il ne rapporte rien tant que le bonus de chronologie
  (variante hors règles) est à zéro. Le bandeau « n si le montage est dans l'ordre », lui, se lit
  toujours sur **tout le film**, de gauche à droite et séquences confondues — sa portée ne se règle
  donc pas. Les Raccords et Génériques, à 00:00, sont **retirés de la lecture** plutôt que de la
  couper : sans cela, un Raccord glissé entre un plan à 75:00 et un plan à 65:00 masquait le désordre
  et le montage marquait quand même ses points (`chronologique()`, `chronoIgnoreZero`).
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
