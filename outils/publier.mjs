// ---------------------------------------------------------------------------
// EDIT — publier une version, en une commande
// ---------------------------------------------------------------------------
//   node outils/publier.mjs "<b>Ce qui change.</b> En une ou deux phrases." ["Autre point"…]
//
// Dans l'ordre, et sans rien demander :
//   1. monte la version (2.28 → 2.29) et la date dans js/version.js ;
//   2. ajoute l'entrée du journal des Versions — un argument par point ;
//   3. lance le versionneur (version.json, sw.js, inventaire des illustrations) ;
//   4. relit la syntaxe de tous les modules — moins d'une seconde ;
//   5. valide et envoie sur la branche courante, en réessayant si le réseau
//      flanche (2, 4, 8 puis 16 s).
//
// Options :
//   --verifier            lance d'abord outils/verifier.mjs (≈ 15 s) et
//                         s'arrête s'il voit rouge ;
//   --titre "…"           titre du commit — sinon, le premier passage en gras ;
//   --version 3.0         impose le numéro au lieu de monter d'un cran ;
//   --trailer "Clé: val"  ajouté tel quel en pied de commit (répétable) ;
//   --sans-envoi          valide sans envoyer.
//
// L'auteur du commit est celui du commit précédent : la publication reste au
// nom du dépôt, quelle que soit la machine qui la lance.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();
const git = (args, opts = {}) => execFileSync('git', args, { cwd: racine, encoding: 'utf8', ...opts }).trim();
const etape = (t) => console.log(`· ${t}`);
const stop = (t) => { console.error(`\n✗ ${t}`); process.exit(1); };

// --- Arguments ---------------------------------------------------------------
const args = process.argv.slice(2);
const opt = { trailers: [], items: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--verifier') opt.verifier = true;
  else if (a === '--sans-envoi') opt.sansEnvoi = true;
  else if (a === '--titre') opt.titre = args[++i];
  else if (a === '--version') opt.version = args[++i];
  else if (a === '--trailer') opt.trailers.push(args[++i]);
  else opt.items.push(a);
}
if (!opt.items.length) stop('il faut au moins une entrée de journal : node outils/publier.mjs "<b>Ce qui change.</b> …"');

// --- 0. Contrôle facultatif ----------------------------------------------------
if (opt.verifier) {
  etape('contrôle rapide');
  try { execFileSync('node', [join(racine, 'outils/verifier.mjs')], { stdio: 'inherit' }); }
  catch { stop('le contrôle voit rouge — rien n’est publié.'); }
}

// --- 1 et 2. Version, date, journal -------------------------------------------
const cheminV = join(racine, 'js/version.js');
let src = readFileSync(cheminV, 'utf8');
const srcAvant = src;
const avant = src.match(/VERSION = '(\d+)\.(\d+)'/);
if (!avant) stop('VERSION introuvable dans js/version.js');
const version = opt.version || `${avant[1]}.${Number(avant[2]) + 1}`;

const maintenant = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
}).formatToParts(new Date()).map((p) => [p.type, p.value]));
const { year: a, month: m, day: j, hour: h, minute: mn } = maintenant;

src = src
  .replace(/VERSION = '[^']*'/, `VERSION = '${version}'`)
  .replace(/BUILD_DATE = '[^']*'/, `BUILD_DATE = '${a}-${m}-${j} ${h}:${mn}'`)
  .replace('export const CHANGELOG = [\n', `export const CHANGELOG = [
  {
    v: '${version}',
    date: '${j}/${m}/${a}',
    items: [
${opt.items.map((t) => `      ${JSON.stringify(t)},`).join('\n')}
    ],
  },
`);
writeFileSync(cheminV, src);
etape(`version ${avant[1]}.${avant[2]} → ${version}, journal à jour`);

// --- 3. Versionneur -------------------------------------------------------------
execFileSync('node', [join(racine, 'outils/versionner.mjs')], { stdio: 'inherit' });

// --- 4. Syntaxe de tous les modules ---------------------------------------------
function* modules(dossier) {
  for (const e of readdirSync(join(racine, dossier), { withFileTypes: true })) {
    if (e.isDirectory()) yield* modules(`${dossier}/${e.name}`);
    else if (/\.m?js$/.test(e.name)) yield `${dossier}/${e.name}`;
  }
}
const fautifs = [];
for (const f of [...modules('js'), ...modules('outils'), 'sw.js']) {
  try { execFileSync('node', ['--check', join(racine, f)], { stdio: 'pipe' }); }
  catch (e) { fautifs.push(`${f}\n${e.stderr}`); }
}
if (fautifs.length) {
  // On rend le journal tel qu'il était : relancer après correction ne doit pas
  // monter la version une deuxième fois.
  writeFileSync(cheminV, srcAvant);
  stop(`erreur de syntaxe — rien n'est publié :\n${fautifs.join('\n')}`);
}
etape('syntaxe des modules : saine');

// --- 5. Commit et envoi -----------------------------------------------------------
const sansBalises = (t) => t.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const titre = opt.titre
  || sansBalises(opt.items[0].match(/<b>(.*?)<\/b>/)?.[1] || opt.items[0].split(/(?<=[.!?])\s/)[0])
    .replace(/[.!]$/, '');
const corps = opt.items.map((t) => `- ${sansBalises(t)}`).join('\n');
const auteur = git(['log', '-1', '--format=%an%n%ae']).split('\n');

git(['add', '-A']);
const fichiers = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
git(['-c', `user.name=${auteur[0]}`, '-c', `user.email=${auteur[1]}`, 'commit', '-q', '-F', '-',
  ...opt.trailers.flatMap((t) => ['--trailer', t])],
{ input: `v${version} - ${titre}\n\n${corps}\n` });
const hash = git(['rev-parse', '--short', 'HEAD']);
etape(`commit ${hash} — ${fichiers.length} fichier(s)`);

if (!opt.sansEnvoi) {
  const branche = git(['branch', '--show-current']);
  let envoye = false;
  for (const attente of [0, 2, 4, 8, 16]) {
    if (attente) { etape(`réseau capricieux, nouvel essai dans ${attente} s`); await new Promise((r) => setTimeout(r, attente * 1000)); }
    try { git(['push', '-q', '-u', 'origin', branche], { stdio: 'pipe' }); envoye = true; break; }
    catch (e) {
      const err = String(e.stderr);
      // Quelqu'un a déposé sur la branche entre-temps — des fichiers envoyés
      // depuis GitHub, par exemple : on reprend son travail, puis on renvoie.
      if (/fetch first|non-fast-forward|rejected/i.test(err)) {
        etape('la branche a reçu un dépôt entre-temps : on le récupère');
        try { git(['pull', '-q', '--rebase', 'origin', branche], { stdio: 'pipe' }); continue; }
        catch (e2) { stop(`récupération impossible — à régler à la main :\n${e2.stderr}`); }
      }
      if (!/Could not resolve|timed out|Connection|RPC failed|unable to access|50\d/i.test(err)) stop(err);
    }
  }
  if (!envoye) stop('envoi impossible après cinq essais — le commit est fait, relancer « git push ».');
  etape(`envoyé sur ${branche}`);
}

console.log(`\n✓ v${version} publiée en ${((Date.now() - t0) / 1000).toFixed(1)} s : ${titre}`);
for (const f of fichiers) console.log(`    ${f}`);
