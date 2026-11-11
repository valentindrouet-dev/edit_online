// ---------------------------------------------------------------------------
// EDIT — versionneur
// ---------------------------------------------------------------------------
// Lancé par outils/publier.mjs ; à la main :   node outils/versionner.mjs
//
// Le navigateur met chaque module en cache par son URL : si une adresse ne
// change pas d'une version à l'autre, il peut resservir l'ancien fichier — un
// app.js périmé à côté d'un version.js à jour. Ce script écrit donc, à partir
// du numéro de js/version.js :
//   · version.json — la version et la liste des modules, que l'amorce
//     d'index.html relit sans cache pour charger chaque module à `?v=VERSION` ;
//   · sw.js — le nom du cache, ce qui purge celui de la version précédente.
// Il signale au passage les images de cartes trop lourdes.

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

// --- Les modules : AUCUNE version dans le code ------------------------------
// Les imports s'écrivent nus — `from './data.js'`. C'est l'amorce d'index.html
// qui leur donne leur version, par une TABLE D'IMPORTS construite à partir de
// version.json : le navigateur charge alors `./data.js?v=VERSION`, et le cache
// ne peut toujours pas resservir l'ancien code.
//
// Avant, la version était écrite dans chaque import de chaque module : une
// publication réécrivait quinze fichiers pour changer un numéro, et deux copies
// d'un même module pouvaient coexister quand un import portait une version et
// un autre pas. Une publication ne touche désormais que version.js,
// version.json et sw.js.
//
// Une estampille restée d'avant est retirée au passage.
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
const listeModules = [];
for (const chemin of modules('js')) {
  listeModules.push(chemin);
  const avant = lire(chemin);
  const apres = avant.replace(RE_IMPORT, (_, a, url, __, z) => `${a}${url}${z}`);
  if (apres !== avant) { ecrire(chemin, apres); touches++; }
}
listeModules.sort();

// --- Nom du cache du service worker ----------------------------------------
// Changer le nom purge les caches des versions précédentes à l'activation.

const sw = lire('sw.js');
const swMaj = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'edit-${VERSION}';`);
if (swMaj !== sw) ecrire('sw.js', swMaj);

// --- Version publiée, lisible sans passer par les modules ------------------

// La liste des modules voyage avec la version : c'est d'elle que l'amorce tire
// la table d'imports. Un module ajouté dans js/ y entre tout seul.
ecrire('version.json', `${JSON.stringify({ version: VERSION, date: DATE, modules: listeModules }, null, 2)}\n`);

// --- Le poids des cartes ----------------------------------------------------
// Une image hors de proportion coûte cher à CHAQUE affichage : le navigateur la
// décompresse en entier, même pour la peindre grande comme un timbre.
// `outils/cartes.py` ramène les cartes de l'auteur à 1 200 px de large ; un
// fichier déposé à la main dans `assets/s41` échapperait à cette règle. Le
// versionneur le dit plutôt que de le laisser ramer en silence.
const POIDS_ALERTE = 400 * 1024;
const lourdes = [];
let nbCartes = 0;
for (const f of readdirSync(join(racine, 'assets', 's41'))) {
  if (!/\.(webp|png|jpe?g|avif)$/i.test(f)) continue;
  nbCartes++;
  const poids = statSync(join(racine, 'assets', 's41', f)).size;
  if (poids > POIDS_ALERTE) lourdes.push(`assets/s41/${f} — ${Math.round(poids / 1024)} ko`);
}

console.log(`v${VERSION} — ${listeModules.length} modules en table d'imports`
  + `${touches ? ` (${touches} estampille(s) ancienne(s) retirée(s))` : ''}, sw.js et version.json à jour`
  + ` · ${nbCartes} cartes.`);
if (lourdes.length) {
  console.log(`\n⚠  ${lourdes.length} carte(s) au-dessus de ${
    POIDS_ALERTE / 1024} ko — elles alourdissent chaque affichage :`);
  for (const l of lourdes) console.log(`   ${l}`);
  console.log('   Repassez-les par outils/cartes.py.');
}
