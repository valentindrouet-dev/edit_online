# EDIT — plateforme de jeu

Plateforme de jeu et laboratoire d'équilibrage pour **EDIT**, jeu de placement de cartes Plans
dans un banc de montage linéaire. Édité par Big Budi Games.

Site statique : aucune dépendance, aucune étape de compilation. Ouvrir `index.html`,
ou servir le dossier (`python3 -m http.server`).

## Écrans

| Écran | Rôle |
|---|---|
| **Accueil** | Table de 1 à 4 joueurs, humains ou IA, options de partie, réglages rapides |
| **Partie** | Bancs de montage, main, journal, score détaillé et objectifs en cours |
| **Matériel** | Les 50 cartes recto-verso, les 18 Plans Larges, le tableau des 33 scènes |
| **Règles** | Les règles telles qu'implémentées, avec la liste de ce qui reste à confirmer |
| **Variables** | Toutes les variables de déroulé et de décompte, export/import JSON |
| **Laboratoire** | Campagnes de simulation et statistiques d'équilibrage |
| **Historique** | Parties terminées |
| **Versions** | Journal des versions |

## Organisation du code

```
index.html
css/styles.css
js/version.js    numéro de version et journal des modifications
js/data.js       matériel : éléments, 33 scènes, 18 Plans Larges, 50 cartes doubles
js/config.js     variables par défaut, profils d'IA, description des réglages
js/icons.js      pastilles des éléments en SVG
js/cards.js      rendu d'une carte et d'une moitié
js/scoring.js    raccords et décompte
js/engine.js     paquet, création de partie, coups, tours
js/ai.js         Novice, Équilibré, Stratège
js/lab.js        simulation par lots et agrégats statistiques
js/app.js        routage et écrans
```

## Le matériel modélisé

- **33 scènes**, chacune déclinée en une moitié **Plan Moyen** (deux tiers de carte) et une moitié
  **Gros Plan** (un tiers). Ensemble, elles font la taille d'un Plan Large. Seule la moitié Gros Plan
  porte un bandeau d'objectif.
- **50 cartes doubles** suivant la répartition v0.13 : recto Gros Plan à gauche et Plan Moyen à
  droite, verso l'inverse avec les mêmes deux moitiés.
- **18 Plans Larges**, dont 4 Plans de départ. Deux d'entre eux (n° 101 et 102) n'ont ni pastilles
  ni bandeau dans le PDF source : ils sont marqués « à compléter » et écartés du paquet par défaut.
- **6 éléments** : la Fille, le Tueur, l'Homme, la Clé, l'Arme, la Voiture. Les libellés sont
  provisoires.

## Ce qui a été déduit, faute de document de règles

Le document de règles n'était pas joint aux fichiers de départ. Le déroulé et le décompte ci-dessous
sont reconstitués à partir du matériel (bandeaux, minutages, formats, répartition v0.13). Chacun de
ces points est une variable réglable dans l'écran **Variables** :

- pose aux deux bouts du banc, main de 4 cartes, 12 tours ;
- un **raccord** = deux plans voisins partageant au moins un élément ;
- les bandeaux sont évalués en fin de partie sur l'ensemble du film monté ;
- le minutage est affiché mais ne rapporte rien tant que le bonus de chronologie est à 0.

Points à confirmer : le nombre d'éléments partagés qui fait un raccord, le rôle exact du minutage,
le sens de pose autorisé, la signification du symbole ✕ noir des bandeaux de la famille Mort,
et le nom des six éléments.

## Laboratoire

Une campagne rejoue N parties sans interface avec les variables courantes et sort :
distribution des scores, origine des points par type d'objectif, taux de victoire par siège et par
profil d'IA, longueur des films, nombre de raccords, part de parties serrées et d'égalités.

Utile pour répondre à « ce bandeau vaut-il trop cher ? », « la partie dure-t-elle trop longtemps ? »,
« les décisions comptent-elles ? » — si le Stratège ne bat pas nettement le Novice, elles ne comptent pas.
