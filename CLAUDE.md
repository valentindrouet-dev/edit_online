# EDIT — consignes de travail

Site statique du jeu de société **EDIT** (Big Budi Games), **version 4.1** : JavaScript en modules, sans
compilation, servi par GitHub Pages depuis la branche `claude/edit-game-platform-n3789u`. Tout est en
français : interface, commentaires, commits.

## Aller vite — c'est la demande explicite du propriétaire

1. Faire la modification, **puis publier aussitôt** :
   ```bash
   node outils/publier.mjs --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" \
     "<b>Ce qui change.</b> Une ou deux phrases." ["Autre point"]
   ```
   Elle monte la version, date, écrit le journal, lance le versionneur, relit la syntaxe de tous les
   modules, commite au nom de l'auteur précédent et pousse (avec reprises réseau). Rien d'autre à faire.
2. Ajouter `--verifier` **seulement** si le moteur, l'IA, le décompte ou la mise en page générale ont
   bougé (≈ 15 s). Pas de campagne de tests, pas de script jetable par changement : un réglage visuel
   se vérifie par une capture de l'écran touché, au besoin.
3. Journal : 1 à 3 points courts, en HTML simple (`<b>`, `<code>`). Message final à l'utilisateur :
   quelques lignes — ce qui a changé, la version, rien de plus.
4. Ne jamais lire `js/version.js` en entier : `publier.mjs` l'écrit.
5. Chemins absolus dans les commandes (`/home/user/edit_online/...`), pas de `cd`.

## Le jeu — 4.1, et rien d'autre

Le site ne porte **que la 4.1** : aucune carte, règle, image ni mécanique des versions précédentes. Ne
rien réintroduire d'ancien (Plans Moyens, cartes recto verso, deux pioches, Générique, « hors film »,
Cartes Objectif, modes, sets, Atelier) sans demande de l'auteur.

- **Les cartes sont les VRAIES cartes** de l'auteur, montrées telles quelles (`faces[cle].visuel` dans
  `js/data.js`) — jamais un dessin refait. Il les livre en PNG 300 dpi ; `python3 outils/cartes.py
  <dossier> assets/s41 [--illus]` en fait les copies d'écran. Les données du moteur (minutage, icônes —
  la dominante en premier —, pouvoir) se LISENT sur l'image et se rangent dans `PLANS_41` / `GP_41`.
- **Plans Larges** : L1 à L19, une image pleine carte (120 × 80 mm). Quatre sont les **Plans de départ**
  (L5, L7, L12, L16) : leurs six couples font six **cartes de départ** recto verso — le seul recto verso
  du jeu. Chaque joueuse en reçoit une et choisit sa face.
- **Gros Plans** : 54 (`GP00`…`GP66`, `GP100` Raccord, `GP101` Ouverture 01', `GP102` Fin 70'), deux par
  carte — 36 **cartes à deux Gros Plans**, moitié GAUCHE et moitié DROITE (`ASSEMBLAGE_41`, `[gauche,
  droite]`), toutes tirées des planches de l'auteur : 10' à 30' et Ouverture à gauche, 40' à 60' et Fin à
  droite, deux dominantes différentes par carte. Exemplaires : Raccord ×8 (4 à gauche, 4 à droite),
  Ouverture ×2, Fin ×2, GP01–GP09 ×2 (une fois de chaque côté), les autres ×1 — 72 moitiés.
  `exemplairesBoite()` les compte.
- **Dos des cartes** : `assets/s41/DOS.webp`, le verso de l'auteur (le même pour toute la pioche).
- **Règles** (`js/engine.js`) : une pioche face cachée, une rivière de 4 cartes, le **Chutier** (défausse
  face visible). À son tour : défausser une carte de la rivière (facultatif, une fois), puis en prendre
  une et la monter. Un Plan Large ouvre une séquence (3 par banc, 4 avec le L12) ; une moitié gauche se
  monte à gauche d'une séquence, une droite à droite ; 3 cartes au plus de chaque côté du centre. Après
  un Raccord, un Plan Large peut entrer dans la séquence — ou un Gros Plan, jamais un second Raccord
  (variante `raccordAppellePL` : Plan Large seulement). Le L16 laisse prendre sur le Chutier, le L7
  donne une carte après le dernier tour. Fin à **12 plans**. Le **Raccord, l'Ouverture et la Fin sont des
  plans** : ils comptent partout où l'on compte des plans (fin de partie, « aucun PLAN après », plus
  longue séquence…). Pioche vide : chaque carte prise est
  remplacée par la carte du dessus du Chutier, une par une (`chutierRiviere`) ; on ne défausse plus.
  Quand une valeur par défaut des règles change, monter `editionRegles` (`js/config.js`) et la faire
  reprendre dans `migrerCfg`.
- Points encore à confirmer par l'auteur : le Plan de départ et les Raccords comptés parmi les 12 plans, pas de défausse
  quand la pioche est vide, l'Entracte (L10).
- En cas de doute sur l'assemblage ou la lecture d'une carte, les **planches et images de l'auteur**
  font foi — et pour la lecture des pouvoirs, ses **aides de jeu** (`assets/aides/` : ICONES, EFFETS,
  SCORE) : ×icône = tout le montage, ×duo = la séquence, ◁ ▷ = la séquence, ◁◁ / ▷▷ = avant / après
  dans tout le montage, la carte exclue.

## Règles du projet

- Version : `4.1.NN` — `4.1` est la version du jeu, `NN` le compteur qui monte à **chaque** livraison
  (fait par `publier.mjs`, qui garde les zéros de tête).
- Titre du site : le logo `assets/marque/edit.webp` (barre du haut, accueil).
- Statistiques d'abord, tout réglable (Variables). Habillage **BD**, dans l'esprit des cartes et des
  aides : papier crème, encre noire, traits épais, ombres franches, trames et rayures, étiquettes
  inclinées ; polices servies par le site (`assets/polices`, OFL) — **Bangers** pour les titres, **Fira
  Sans** pour le texte. Le thème est en fin de `css/styles.css`. Couleurs des joueuses : celles de la
  feuille de score (`PALETTE_JOUEURS`, `js/config.js`).
- Vocabulaire à l'écran : Plan Large, Gros Plan, Plan de départ, carte de départ, carte à deux Gros
  Plans, moitié gauche / droite, séquence, banc de montage, pioche, rivière, Chutier, Raccord,
  Ouverture, Fin, **chrono** (et non plus « minutage »), icône (dominante), **pouvoir**.
- Les imports entre modules s'écrivent **sans** `?v=` : la table d'imports d'`index.html` les versionne.
  Un nouveau module dans `js/` y entre tout seul.
- Clés localStorage préfixées `edit.` (`edit.cfg`, `edit.joueurs`, `edit.partage.recu`). `migrerCfg`
  (`js/config.js`) ne garde d'une configuration enregistrée que les variables qui existent encore.
- Matériel en trois couches : la boîte (le code) → publié (`materiel.json`) → local (`edit.cfg`). Clé
  d'un plan : `GP13` pour un Gros Plan, `5` pour un Plan Large ou un Plan de départ.
- Mode partagé : Matériel, Laboratoire et Versions restent fermés (`ECRANS_FERMES` dans `app.js`).

## Sécurité — non négociable

- L'URL du projet Supabase et la clé **anon / publishable** sont publiques par conception.
- La clé **`service_role`** et le mot de passe de la base n'entrent **JAMAIS** dans le dépôt.
- `js/net/supabase.js` n'appelle que `channel()`, `subscribe()`, `send()` — jamais `.from()`,
  `.rpc()`, `.auth` ni `presence` : le projet Supabase est partagé avec Camino.
- Préfixe des canaux : la constante unique `PREFIXE = 'edit'` de `js/net/config.js`.
- Aucun identifiant de modèle dans les commits, le code ou les commentaires.

## Pièges connus (si l'on écrit un test navigateur)

- Changer seulement le fragment (`#/…`) ne recharge pas les modules : recharger après avoir semé le
  localStorage.
- Fin de partie : attendre `#rejouer`.
- Les images des cartes sont en `loading="lazy"` : hors de la fenêtre, elles ne sont pas chargées.
- Playwright : module global (`npm root -g`), Chromium dans `/opt/pw-browsers` — `verifier.mjs` les
  trouve seul.
