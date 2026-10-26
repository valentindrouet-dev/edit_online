// ---------------------------------------------------------------------------
// EDIT — l'EXPORT MAÎTRE des cartes, en PDF vectoriel
// ---------------------------------------------------------------------------
//   node outils/exporter-cartes.mjs <partage.json> [--cartes] [--perdu 3]
//        [--sans-traits] [--retournement colonnes|rangees|aucun] [--sortie fichier.pdf]
//
// Ce que fait le bouton « 🖨 Version vectorielle » de l'Atelier, sans
// navigateur à ouvrir : le site est chargé dans un Chromium sans fenêtre, avec
// le FICHIER DE PARTAGE de l'auteur — son matériel, son set, son gabarit —, et
// la page d'impression en sort en PDF. Le texte et les formes y restent
// vectoriels, les polices y sont embarquées, et les illustrations entrent à
// leur pleine définition (la version `hd/` des illustrations seules).
//
// Par défaut : des planches A4 recto-verso. `--cartes` : une carte par page.

import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = { mode: 'planches', perdu: 0, traits: true, retournement: 'colonnes', sortie: null, partage: null };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--cartes') opt.mode = 'cartes';
  else if (a === '--perdu') opt.perdu = Number(args[++i]) || 0;
  else if (a === '--sans-traits') opt.traits = false;
  else if (a === '--retournement') opt.retournement = args[++i];
  else if (a === '--sortie') opt.sortie = args[++i];
  else opt.partage = a;
}
if (!opt.partage) {
  console.error('Il faut un fichier de partage : node outils/exporter-cartes.mjs <partage.json>');
  process.exit(1);
}
const partage = JSON.parse(await readFile(resolve(opt.partage), 'utf8'));
const cfg = partage.cfg || partage;
cfg.design = { ...(cfg.design || {}), actif: true };

// --- Un serveur statique, le temps de l'export ---------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const corps = await readFile(join(racine, chemin));
    res.writeHead(200, { 'Content-Type': TYPES[extname(chemin)] || 'application/octet-stream' });
    res.end(corps);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${serveur.address().port}`;

async function trouverPlaywright() {
  try { return await import('playwright'); } catch { /* on cherche ailleurs */ }
  const global = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(join(global, 'playwright', 'index.mjs')).href);
}
async function lancer(chromium) {
  try { return await chromium.launch(); } catch { /* binaire d'une autre version */ }
  const dossier = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  for (const d of (await readdir(dossier)).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const exe = join(dossier, d, 'chrome-linux', 'chrome');
    if (existsSync(exe)) return chromium.launch({ executablePath: exe });
  }
  throw new Error('aucun Chromium trouvé');
}

const { chromium } = await trouverPlaywright();
const navigateur = await lancer(chromium);
const page = await (await navigateur.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
page.on('pageerror', (e) => console.error('erreur de page :', e.message));
await page.goto(`${base}/`);
await page.evaluate(({ c, imp }) => {
  localStorage.clear();
  localStorage.setItem('edit.cfg', JSON.stringify(c));
  localStorage.setItem('edit.atelier.impression', JSON.stringify(imp));
}, { c: cfg, imp: { mode: opt.mode, perdu: opt.perdu, traits: opt.traits, retournement: opt.retournement, cle: null } });
// Les images APPORTÉES voyagent dans le fichier de partage : on les remet dans
// la réserve du navigateur avant de dessiner, comme le fait le site en recevant
// un partage.
if ((partage.images || []).length) {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.evaluate(async (images) => {
    const v = await import('./js/visuels.js');
    for (const im of images) {
      const blob = await (await fetch(im.data)).blob();
      const original = im.dataHD ? await (await fetch(im.dataHD)).blob() : null;
      await v.importerVisuel(im.id, blob, im.nom, im.largeur, im.hauteur, original, im.largeurOrig, im.hauteurOrig,
        im.brut ? { brut: true, empreinte: im.empreinte } : null);
    }
  }, partage.images);
}
await page.goto(`${base}/#/impression`, { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.imp-page', { timeout: 30000 });
await page.evaluate(async () => { const m = await import('./js/atelier.js'); await m.pret(); });
const n = await page.$$eval('.imp-carte', (l) => l.length);
await page.emulateMedia({ media: 'print' });
const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
const quand = new Date().toISOString().slice(0, 10);
const sortie = opt.sortie || `edit-${cfg.set || '2'}-${opt.mode}-${quand}.pdf`;
await writeFile(sortie, pdf);
await navigateur.close();
serveur.close();
console.log(`✓ ${sortie} — ${n} faces, ${Math.round(pdf.length / 1048576 * 10) / 10} Mo`);
