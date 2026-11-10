// ---------------------------------------------------------------------------
// EDIT — contrôle rapide, avant une publication qui touche au fond
// ---------------------------------------------------------------------------
//   node outils/verifier.mjs
//
// Une quinzaine de secondes, et les trois choses qui cassent vraiment un site :
//   1. le MOTEUR : quelques parties entières entre IA, sans navigateur ;
//   2. le CHARGEMENT : chaque module chargé une seule fois, à la bonne version ;
//   3. les ÉCRANS : les dix écrans s'ouvrent sans erreur, sans déborder de la
//      fenêtre, au large comme en demi-fenêtre — et une partie se joue jusqu'au
//      décompte dans le vrai navigateur.
//
// Ce n'est pas une campagne de tests : c'est le filet qui attrape une page
// blanche, une erreur de module ou une mise en page qui sort de l'écran. Les
// réglages fins se vérifient à l'œil, sur la carte qu'on vient de toucher.

import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();
let ok = 0; let ko = 0;
const dit = (c, t, d = '') => {
  if (c) ok++; else ko++;
  console.log(`  ${c ? 'OK  ' : 'RATÉ'} ${t}${d ? `  — ${d}` : ''}`);
};

// --- 1. Le moteur, sans navigateur ----------------------------------------
const lab = await import(pathToFileURL(join(racine, 'js/lab.js')).href);
const { DEFAULTS, cloneConfig } = await import(pathToFileURL(join(racine, 'js/config.js')).href);
const joueurs = [{ nom: 'A', type: 'NOVICE' }, { nom: 'B', type: 'EQUILIBRE' }, { nom: 'C', type: 'STRATEGE' }];
let parties = 0; let fautes = 0;
for (const variante of [{}, { objectifCommun: true }, { sixCartesDepart: true, piochesMelangees: true }]) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = lab.simulerPartie(joueurs, { ...cloneConfig(DEFAULTS), ...variante }, `verif-${i}`);
      parties++;
      if (!r.totaux.every(Number.isFinite)) fautes++;
    } catch (e) { fautes++; console.log(`     ${e.message}`); }
  }
}
dit(fautes === 0, 'le moteur joue des parties entières entre IA', `${parties} parties, ${fautes} faute(s)`);

// --- Un serveur statique, le temps du contrôle -----------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
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

// --- Le navigateur : Playwright, local ou installé globalement -------------
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
const page = await (await navigateur.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
const modules = [];
page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/js/')) modules.push(u.pathname + u.search); });

// --- 2. Le chargement -------------------------------------------------------
const { version } = JSON.parse(await readFile(join(racine, 'version.json'), 'utf8'));
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('edit.cfg', JSON.stringify({ publieAdopte: 'origine', animerCoups: false, objectifCommun: true }));
  localStorage.setItem('edit.joueurs', JSON.stringify([
    { nom: 'A', couleur: '#fdba74', type: 'EQUILIBRE' }, { nom: 'B', couleur: '#93c5fd', type: 'STRATEGE' }]));
});
modules.length = 0;
await page.reload({ waitUntil: 'networkidle' });
const nus = modules.filter((m) => !m.endsWith(`?v=${version}`));
const chemins = modules.map((m) => m.split('?')[0]);
dit(modules.length > 10 && nus.length === 0, `chaque module se charge à la version ${version}`,
  nus.length ? `sans version : ${nus.slice(0, 3).join(', ')}` : `${modules.length} modules`);
dit(new Set(chemins).size === chemins.length, 'aucun module chargé deux fois');

// --- 3. Les écrans ----------------------------------------------------------
await page.click('#go');
const objectif = await page.waitForSelector('.carte-objectif', { timeout: 4000 }).then(() => true, () => false);
const fini = await page.waitForSelector('#rejouer', { timeout: 30000 }).then(() => true, () => false);
dit(fini, 'une partie se joue jusqu’au décompte dans le navigateur');
dit(objectif, 'la Carte Objectif commune se pose sur la table');

const ECRANS = ['#/', '#/partie', '#/materiel', '#/regles', '#/variables', '#/labo', '#/banc',
  '#/historique', '#/versions', '#/enligne'];
const debords = [];
for (const largeur of [1400, 820, 390]) {
  await page.setViewportSize({ width: largeur, height: 900 });
  for (const h of ECRANS) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(250);
    const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (d > 0) debords.push(`${h} à ${largeur}px (+${d})`);
  }
}
dit(debords.length === 0, 'les dix écrans tiennent dans la fenêtre — 1400, 820 et 390 px',
  debords.slice(0, 3).join(', '));
dit(erreurs.length === 0, 'aucune erreur de page', erreurs.slice(0, 2).join(' | '));

await navigateur.close();
serveur.close();
const s = ((Date.now() - t0) / 1000).toFixed(1);
console.log(ko ? `\n${ko} RATÉ(S) sur ${ok + ko} — ${s} s` : `\nTOUT VERT — ${ok} contrôles, ${s} s`);
process.exit(ko ? 1 : 0);
