// ---------------------------------------------------------------------------
// EDIT — estampillage des modules
// ---------------------------------------------------------------------------
// À lancer avant chaque publication :   node outils/versionner.mjs
//
// Le navigateur met chaque module en cache par son URL. Si une seule URL ne
// change pas d'une version à l'autre, il peut resservir l'ancien fichier — et
// l'on se retrouve avec un app.js périmé à côté d'un version.js à jour.
//
// Ce script estampille donc toutes les URL de modules avec le numéro de
// version (`./data.js?v=1.8`) : à chaque publication, toutes les adresses
// changent, et le cache ne peut physiquement plus resservir l'ancien code.
// Il écrit aussi version.json, que la page relit sans cache pour connaître la
// version publiée sans dépendre du graphe de modules.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => readFileSync(join(racine, p), 'utf8');
const ecrire = (p, s) => writeFileSync(join(racine, p), s);

// --- Version de référence --------------------------------------------------

const src = lire('js/version.js');
const VERSION = src.match(/VERSION\s*=\s*'([^']+)'/)?.[1];
const DATE = src.match(/BUILD_DATE\s*=\s*'([^']+)'/)?.[1] || '';
if (!VERSION) throw new Error('VERSION introuvable dans js/version.js');

// --- Estampillage des imports ----------------------------------------------

// `from './x.js'` et `from './x.js?v=ancienne'` deviennent `from './x.js?v=VERSION'`.
const RE_IMPORT = /(from\s+['"])(\.{1,2}\/[^'"?]+\.js)(\?v=[^'"]*)?(['"])/g;

let touches = 0;
for (const f of readdirSync(join(racine, 'js')).filter((x) => x.endsWith('.js'))) {
  const chemin = `js/${f}`;
  const avant = lire(chemin);
  const apres = avant.replace(RE_IMPORT, (_, a, url, __, z) => `${a}${url}?v=${VERSION}${z}`);
  if (apres !== avant) { ecrire(chemin, apres); touches++; }
}

// --- Nom du cache du service worker ----------------------------------------
// Changer le nom purge les caches des versions précédentes à l'activation.

const sw = lire('sw.js');
const swMaj = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'edit-${VERSION}';`);
if (swMaj !== sw) ecrire('sw.js', swMaj);

// --- Version publiée, lisible sans passer par les modules ------------------

ecrire('version.json', `${JSON.stringify({ version: VERSION, date: DATE }, null, 2)}\n`);

console.log(`v${VERSION} — ${touches} module(s) estampillé(s), sw.js et version.json à jour.`);
