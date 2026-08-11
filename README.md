# EDIT — plateforme de jeu

Plateforme de jeu et laboratoire d'équilibrage pour **EDIT**, jeu de placement de Cartes Plan dans
un banc de montage. Édité par Big Budi Games. Moteur conforme aux règles **v0.13**.

Site statique : aucune dépendance, aucune étape de compilation. Ouvrir `index.html`, ou servir le
dossier (`python3 -m http.server`).

## Écrans

| Écran | Rôle |
|---|---|
| **Accueil** | Table de 1 à 4 joueuses, humaines ou IA, options de partie, réglages rapides |
| **Partie** | Bancs de montage, phases de dérushage et de montage, journal, score détaillé |
| **Matériel** | Les 50 cartes PM / GP recto et verso, les 14 Plans Larges, les Plans de départ, le tableau des 33 scènes |
| **Règles** | Les règles telles qu'implémentées, avec les points restés ouverts |
| **Variables** | Toutes les variables de déroulé et de décompte, export/import JSON |
| **Laboratoire** | Campagnes de simulation et statistiques d'équilibrage |
| **Historique** | Parties terminées |
| **Versions** | Journal des versions |

## Organisation du code

```
index.html
css/styles.css
js/version.js    numéro de version et journal des modifications
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

Le tour se joue en deux phases : **Dérushage** (chacune pioche une carte dans un chutier ou sur une
pioche), puis **Montage** (chacune la pose). La partie s'arrête au 10e plan posé.

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
  dans l'ordre du fichier.
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
