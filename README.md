# EDIT — plateforme de jeu

Plateforme de jeu et laboratoire d'équilibrage pour **EDIT**, jeu de montage de cartes dans un banc de
montage. Un jeu de Valentin Drouet, illustré par Anders Lazaret, édité par Big Budi Games.
Le site porte la **version 4.1** du jeu, et elle seule.

Site statique : aucune dépendance, aucune étape de compilation. Ouvrir `index.html`, ou servir le
dossier (`python3 -m http.server`).

## Le jeu, en bref

- **19 Plans Larges** (une image pleine carte, 120 × 80 mm), dont **4 Plans de départ** : leurs six
  couples font six cartes de départ recto verso.
- **54 Gros Plans**, deux par carte : 27 cartes à deux Gros Plans, moitié gauche et moitié droite.
- Une pioche face cachée, une rivière de 4 cartes visibles, et le **Chutier**, la défausse face visible.
- À son tour : on peut défausser une carte de la rivière, puis on en prend une et on la monte. Un Plan
  Large ouvre une séquence (3 par banc) ; une moitié gauche se monte à gauche d'une séquence, une
  moitié droite à droite ; 3 cartes au plus de chaque côté du centre.

Les règles complètes sont sur l'écran **Règles** du site.

## Écrans

| Écran | Rôle |
|---|---|
| **Accueil** | Table de 1 à 4 joueuses, humaines ou IA, et le matériel qui part en partie |
| **Partie** | La pioche, la rivière, le Chutier, les bancs de montage, le score détaillé |
| **Banc de montage** | Un établi : tous les plans sous la main, les règles de pose et le décompte de la partie |
| **Matériel** | Les cartes telles que livrées, ce que le moteur en a lu, l'assemblage des cartes à deux Gros Plans |
| **Règles** | Les règles 4.1, telles que le moteur les joue |
| **Variables** | Les variables de déroulé et de décompte, export / import JSON |
| **Laboratoire** | Campagnes de simulation entre IA et statistiques d'équilibrage |
| **Historique** | Parties terminées |
| **Versions** | Journal des versions du site |

## Organisation du code

```
index.html              amorçage : demande la version publiée, puis charge le code
version.json            version publiée, relue hors cache (généré)
materiel.json           le matériel publié : retouches et assemblage que tout le monde reçoit
sw.js                   service worker réseau d'abord
outils/publier.mjs      publie une version en une commande
outils/verifier.mjs     contrôle rapide (≈ 15 s) : moteur, chargement, écrans
outils/versionner.mjs   version.json et cache du service worker
outils/cartes.py        fait entrer les cartes de l'auteur (PNG 300 dpi) dans assets/s41
css/styles.css
assets/s41/             les vraies cartes : L1…L19, GP00…GP102 (et illus/, l'illustration seule)
assets/icones/          les sept icônes, découpées sur les cartes
assets/marque/          le logo EDIT
js/version.js           version du site et journal des modifications
js/data.js              le matériel : icônes, pouvoirs, les 19 Plans Larges, les 54 Gros Plans, l'assemblage
js/config.js            variables par défaut, profils d'IA, description des réglages
js/engine.js            pioche, rivière, Chutier, coups légaux, pose, fin de partie
js/scoring.js           séquences, portée des pouvoirs, décompte
js/ai.js                Novice, Équilibré, Stratège
js/lab.js               simulation par lots et agrégats statistiques
js/cards.js             rendu d'un plan et d'une carte
js/icons.js             les icônes
js/anim.js              le vol d'une carte d'un endroit de la table à un autre
js/regles.js            le texte des règles
js/livret.js            l'aide de jeu, tirée du matériel
js/melange.js           l'assemblage des cartes à deux Gros Plans : contraintes et mélange
js/publie.js            le matériel publié (materiel.json)
js/partage.js           le partage d'un matériel et de ses réglages, par lien ou par fichier
js/visuels.js           l'adresse d'une illustration
js/net/                 le jeu en ligne : protocole par actions, salon, transports
js/app.js               routage et écrans
```

## Publier une version

Le navigateur met chaque module en cache **par son URL**. Deux mécanismes évitent qu'il resserve un
ancien fichier :

1. `index.html` ne cite **aucune** version : il demande d'abord `version.json` hors cache, y lit la
   version et la liste des modules, et pose une **table d'imports** qui fait charger chacun à
   `?v=VERSION`. Les modules s'importent entre eux sans numéro (`from './data.js'`) ;
2. `outils/versionner.mjs` écrit `version.json` et renomme le cache du service worker.

Publier tient en une commande — elle monte la version (`4.1.NN`), ajoute l'entrée du journal, lance
le versionneur, relit la syntaxe de tous les modules, commite et pousse :

```bash
node outils/publier.mjs "<b>Ce qui change.</b> En une ou deux phrases." ["Autre point"…]
node outils/publier.mjs --verifier "…"   # contrôle rapide d'abord, si le moteur ou la mise en page a bougé
```

La page relit `version.json` toutes les minutes et à chaque retour sur l'onglet : une version plus
récente déclenche un rechargement, sauf en pleine partie où un bandeau propose la mise à jour.

## Les cartes

Le jeu montre les **vraies cartes** de l'auteur, telles quelles. Il les livre en PNG 300 dpi
(120 × 80 mm pour un Plan Large, 60 × 80 mm pour un Gros Plan) :

```bash
python3 outils/cartes.py <dossier-des-png> assets/s41 --illus
```

Ce que le moteur a besoin de savoir d'une carte — minutage, icônes (la dominante en premier),
pouvoir — se **lit sur l'image** et se range dans `PLANS_41` et `GP_41` (`js/data.js`). L'écran
Matériel montre chaque carte à côté de cette lecture, pour la vérifier ; une retouche y est possible,
le site recompose alors lui-même le plan retouché.

`ASSEMBLAGE_41` dit quels Gros Plans vont ensemble sur une carte, `[gauche, droite]`. Il se refait
dans Matériel › Assemblage.

## Le jeu en ligne

Le moteur est déterministe : une partie est une **graine et une liste d'actions** (`js/net/protocole.js`)
— choix du Plan de départ, défausse, prise d'une carte, pose, passe. Chaque appareil rejoue le journal.
Le transport passe par les canaux temps réel de Supabase (`js/net/supabase.js`) ou, sans clés, entre
les onglets d'un même navigateur (`js/net/local.js`).
