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

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

// Le parcours descend dans les sous-dossiers (js/net/…) : un module oublié
// garderait l'estampille de la version précédente, et le cache pourrait le
// resservir périmé à côté du reste du site — précisément ce qu'on évite ici.
function* modules(dossier) {
  for (const e of readdirSync(join(racine, dossier), { withFileTypes: true })) {
    if (e.isDirectory()) yield* modules(`${dossier}/${e.name}`);
    else if (e.name.endsWith('.js')) yield `${dossier}/${e.name}`;
  }
}

let touches = 0;
for (const chemin of modules('js')) {
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

// --- L'inventaire des illustrations ----------------------------------------
// Un site statique ne sait pas lister un dossier : pour proposer le choix d'une
// illustration, il faut lui dire ce qu'il y a. Le fichier se refait à chaque
// publication — déposer un visuel dans assets/ suffit donc à le rendre
// choisissable, sans toucher au code.

// Les dossiers ne sont pas listés en dur : déposer `assets/nuit/` et y mettre
// des visuels suffit à les rendre choisissables. Seul `icones` est écarté —
// ce ne sont pas des illustrations de plan mais les symboles du jeu. Les trois
// dossiers de la boîte viennent d'abord, dans l'ordre des cadrages ; les
// dossiers apportés suivent, par ordre alphabétique.
const IMAGES_HORS = new Set(['icones']);
const ORDRE = ['pl', 'pm', 'gp'];
const dossiersImages = readdirSync(join(racine, 'assets'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && !IMAGES_HORS.has(e.name))
  .map((e) => e.name)
  .sort((a, b) => {
    const ia = ORDRE.indexOf(a); const ib = ORDRE.indexOf(b);
    if (ia !== ib) return (ia < 0 ? ORDRE.length : ia) - (ib < 0 ? ORDRE.length : ib);
    return a.localeCompare(b, 'fr', { numeric: true });
  });

// Une illustration hors de proportion coûte cher à CHAQUE affichage : le
// navigateur la décompresse en entier — un visuel de 6001 × 6001 px occupe
// 137 Mo de mémoire vive — même pour la peindre grande comme un timbre. Une
// carte n'en montre jamais plus de 642 px de large ; l'éditeur ramène d'ailleurs
// à 900 px toute image qu'on lui apporte. Un fichier déposé à la main dans
// `assets/` échappe à cette règle, et c'est ainsi qu'un poids lourd s'y glisse.
// Le versionneur le dit plutôt que de le laisser ramer en silence.
const POIDS_ALERTE = 400 * 1024;
const lourdes = [];

const inventaire = {};
for (const d of dossiersImages) {
  const fichiers = readdirSync(join(racine, 'assets', d))
    .filter((f) => /\.(webp|png|jpe?g|avif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  for (const f of fichiers) {
    const poids = statSync(join(racine, 'assets', d, f)).size;
    if (poids > POIDS_ALERTE) lourdes.push(`assets/${d}/${f} — ${Math.round(poids / 1024)} ko`);
  }
  if (fichiers.length) inventaire[d] = fichiers;
}
ecrire('assets/images.json', `${JSON.stringify(inventaire, null, 2)}\n`);
const nbImages = Object.values(inventaire).reduce((s, l) => s + l.length, 0);

console.log(`v${VERSION} — ${touches} module(s) estampillé(s), sw.js, version.json`
  + ` et assets/images.json (${nbImages} illustrations) à jour.`);
if (lourdes.length) {
  console.log(`\n⚠  ${lourdes.length} illustration(s) au-dessus de ${
    POIDS_ALERTE / 1024} ko — elles alourdissent chaque affichage :`);
  for (const l of lourdes) console.log(`   ${l}`);
  console.log('   Ramenez-les à 900 px sur le plus grand côté, comme le fait l’éditeur.');
}
