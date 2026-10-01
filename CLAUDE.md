# EDIT — consignes de travail

Site statique du jeu de société **EDIT** (Big Budi Games) : JavaScript en modules, sans compilation,
servi par GitHub Pages depuis la branche `claude/edit-game-platform-n3789u`. Tout est en français :
interface, commentaires, commits.

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
4. Ne jamais lire `js/version.js` en entier (≈ 175 ko de journal) : `publier.mjs` l'écrit.
5. Chemins absolus dans les commandes (`/home/user/edit_online/...`), pas de `cd`.

## Règles du projet

- Un compteur de version monte à **chaque** livraison (fait par `publier.mjs`).
- Statistiques d'abord, tout réglable (Variables), design pastel violet / orange.
- Les imports entre modules s'écrivent **sans** `?v=` : la table d'imports d'`index.html` les versionne.
  Un nouveau module dans `js/` y entre tout seul.
- Clés localStorage préfixées `edit.` (`edit.cfg`, `edit.joueurs`, `edit.regles.textes`, `edit.partage.recu`).
- Matériel en trois couches : imprimé → publié (`materiel.json`) → local (`edit.cfg`).
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
- Fin de partie : attendre `#rejouer`, pas le mot « décompte ».
- La carte Objectif tirée se lit dans `st.cfg` de la partie, pas dans la configuration du site.
- Playwright : module global (`npm root -g`), Chromium dans `/opt/pw-browsers` — `verifier.mjs` les
  trouve seul.
