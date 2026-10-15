// ---------------------------------------------------------------------------
// EDIT — l'ATELIER : dessiner les cartes, puis les imprimer
// ---------------------------------------------------------------------------
// L'écran où l'on règle le GABARIT (js/gabarits.js) : on prend un élément sur
// la carte et on le déplace, on le redimensionne, on change sa police, sa
// couleur — et toutes les cartes du jeu suivent, puisqu'elles sont tirées du
// Matériel par le même gabarit.
//
// Ce qu'on règle est un BROUILLON, rangé avec la configuration : il voyage avec
// un partage, et le site peut s'en servir partout. Un ESSAI est une copie qu'on
// garde de côté, dans ce navigateur. « 📋 Copier le gabarit » met le brouillon
// en texte : c'est ainsi qu'un essai devient une version publiée.
//
// L'impression sort d'ici : des planches A4 recto-verso ou une carte par
// fichier, de 300 à 600 dpi, avec fond perdu et repères de coupe — et une
// version VECTORIELLE, imprimée par le navigateur lui-même, où le texte reste
// du texte et les illustrations gardent toute leur définition.

import {
  MISES, HAUTEUR, largeurMise, cleMise, POLICES, POLICES_SYSTEME, CHAMPS_TEXTE,
  VERSIONS_GABARIT, VERSION_DEFAUT, versionPubliee, normaliserGabarit,
  ICONES_JEU, nomIcone, signaturePouvoir, JETONS,
} from './gabarits.js';
import { rendreMoitie, declarerPolices, cssPolicesEmbarquees, brancherGabarit } from './design.js';
import { buildCartesDoubles, buildPlansLarges, moitiesDe, plHalf, DEPARTS, objsDe } from './data.js';
import { renderCarte, renderDos, bandeauGabarit } from './cards.js';
import { planchesCartes, archiveCartes, PLANCHE } from './export-pdf.js';
import { visuelsApportes, ajouterVisuel, cleVisuel, urlVisuel } from './visuels.js';

let C = null;   // ce que l'application prête à l'atelier — voir app.js

// Les images rangées dans le site, `assets/atelier/` : un logo, une texture,
// un cadre — tout le monde les voit, et l'export les trouve. L'inventaire est
// celui que le versionneur écrit à chaque publication.
let imagesSite = [];
fetch('assets/images.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {}))
  .then((inv) => { imagesSite = (inv && inv.atelier) || []; }).catch(() => {});

const at = {
  cle: 'PM', sel: null, ech: 0, zoom: 1, grille: true, sure: true,
  comparer: '', filtre: 'MISE', choix: '',
  annuler: [], refaire: [], instantane: null,
  exp: null, enCours: false,
};

const q = (s) => C.app.querySelector(s);
const qa = (s) => [...C.app.querySelectorAll(s)];
const echapper = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const r2 = (v) => Math.round(v * 100) / 100;

// --- Le brouillon, ses essais, ses versions ---------------------------------------

function design() { return C.store.cfg.design; }

function gabaritDeVersion(id) {
  const p = versionPubliee(id);
  if (p) return normaliserGabarit(p.gabarit);
  const e = essais().find((x) => x.id === id);
  return e ? normaliserGabarit(e.gabarit) : null;
}

function brouillon() {
  const d = design();
  if (!d.gabarit) d.gabarit = gabaritDeVersion(d.base || VERSION_DEFAUT) || normaliserGabarit(null);
  return d.gabarit;
}

const mise = () => brouillon().mises[at.cle];
const elementSel = () => (at.sel ? mise().elements.find((e) => e.id === at.sel) || null : null);
const essais = () => C.LS.get('atelier.essais', []);
const sauverEssais = (l) => C.LS.set('atelier.essais', l);

/** Le nom de ce qu'on a sous la main : la version d'origine, modifiée ou non. */
function etatBrouillon() {
  const d = design();
  const base = gabaritDeVersion(d.base || VERSION_DEFAUT);
  const nomBase = versionPubliee(d.base) ? `${d.base} — ${versionPubliee(d.base).nom}`
    : (essais().find((x) => x.id === d.base) || {}).nom || d.base;
  const modifie = !base || JSON.stringify(base) !== JSON.stringify(brouillon());
  return { nomBase, modifie };
}

// --- Annuler, refaire ----------------------------------------------------------------

function memoriser(avant) {
  at.annuler.push(avant || JSON.stringify(brouillon()));
  if (at.annuler.length > 120) at.annuler.shift();
  at.refaire = [];
}

function enregistrer() { C.sauverCfg(); }

/** Un changement : on le mémorise pour pouvoir l'annuler, on l'applique, on redessine. */
function changer(fn, { panneau = true } = {}) {
  memoriser();
  fn(brouillon());
  enregistrer();
  dessinerScene();
  if (panneau) dessinerPanneau();
  dessinerEtat();
  planifierToutes();
}

function annuler() {
  if (!at.annuler.length) return;
  at.refaire.push(JSON.stringify(brouillon()));
  design().gabarit = JSON.parse(at.annuler.pop());
  apresHistorique();
}

function refaire() {
  if (!at.refaire.length) return;
  at.annuler.push(JSON.stringify(brouillon()));
  design().gabarit = JSON.parse(at.refaire.pop());
  apresHistorique();
}

function apresHistorique() {
  if (at.sel && !elementSel()) at.sel = null;
  enregistrer();
  dessinerScene(); dessinerPanneau(); dessinerEtat(); planifierToutes();
}

// --- Les plans qu'on prend pour modèle -------------------------------------------------

/** Les plans du set qui se dessinent avec la mise en page `cle`. */
function echantillons(cle) {
  if (cle === 'DOS') return [{ h: { format: 'DOS', num: '', el: [], tc: 0 }, label: 'Dos de la pioche' }];
  return C.surLeModifie(() => {
    const out = [];
    if (cle === 'PL') {
      buildPlansLarges(false).forEach((c) => { const h = plHalf(c); out.push({ h, label: `Plan Large ${h.num}` }); });
    } else if (cle === 'DEP') {
      DEPARTS().forEach((d) => d.faces.forEach((f) => {
        const h = plHalf({ ...f, depart: true });
        out.push({ h, label: `Plan de départ ${h.num}` });
      }));
    } else {
      const vus = new Set();
      buildCartesDoubles().forEach((c) => ['R', 'V'].forEach((face) => {
        const m = moitiesDe(c, face);
        for (const h of [m.PM, m.GP]) {
          if (!h || h.absente || cleMise(h) !== cle || vus.has(h.cle)) continue;
          vus.add(h.cle);
          out.push({ h, label: `${h.format === 'GP' ? 'Gros Plan' : 'Plan Moyen'} ${h.num}${
            h.titre ? ` — ${h.titre}` : ''} · ${face === 'R' ? 'recto' : 'verso'}` });
        }
      }));
    }
    return out;
  });
}

// --- La scène : la carte en grand, et ses poignées --------------------------------------

const mmPx = () => (500 * at.zoom) / HAUTEUR;

const POIGNEES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function feuille(h, g, editable) {
  const W = largeurMise(at.cle);
  const k = mmPx();
  const px = (v) => r2(v * k);
  const r = rendreMoitie(h, g, { mmPx: k, set: C.store.cfg.set, cfg: C.store.cfg });
  let calques = '';
  if (editable) {
    const grille = at.grille ? `<svg class="at-grille" width="${px(W)}" height="${px(HAUTEUR)}">
      <defs><pattern id="mm1" width="${k}" height="${k}" patternUnits="userSpaceOnUse">
        <path d="M ${k} 0 L 0 0 0 ${k}" fill="none" stroke="rgba(124,58,237,.13)" stroke-width="1"/></pattern>
        <pattern id="mm5" width="${k * 5}" height="${k * 5}" patternUnits="userSpaceOnUse">
        <rect width="${k * 5}" height="${k * 5}" fill="url(#mm1)"/>
        <path d="M ${k * 5} 0 L 0 0 0 ${k * 5}" fill="none" stroke="rgba(124,58,237,.3)" stroke-width="1"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#mm5)"/></svg>` : '';
    const sure = at.sure ? `<div class="at-sure" style="inset:${px(3)}px"></div>` : '';
    const cadres = mise().elements.filter((e) => e.visible !== false).map((e) => {
      const sel = e.id === at.sel;
      return `<div class="at-cadre ${sel ? 'sel' : ''}" data-el="${echapper(e.id)}"
        style="left:${px(e.x)}px;top:${px(e.y)}px;width:${px(e.w)}px;height:${px(e.h)}px">
        ${sel ? POIGNEES.map((p) => `<i class="at-poignee p-${p}" data-poignee="${p}"></i>`).join('') : ''}
        <span class="at-cadre-nom">${echapper(e.nom)}</span></div>`;
    }).join('');
    calques = `${grille}${sure}<div class="at-cadres">${cadres}</div><div class="at-guides"></div>`;
  }
  return `<div class="at-feuille ${editable ? 'editable' : ''}" style="width:${px(W)}px;height:${px(HAUTEUR)}px">
    ${r ? r.html : ''}${calques}</div>`;
}

function dessinerScene() {
  const zone = q('#at-scene');
  if (!zone) return;
  const ech = echantillons(at.cle);
  const nom = q('#at-ech-nom');
  if (!ech.length) {
    zone.innerHTML = '<div class="vide">Aucun plan de ce type dans ce set — rien à prendre pour modèle.</div>';
    if (nom) nom.textContent = '—';
    return;
  }
  at.ech = ((at.ech % ech.length) + ech.length) % ech.length;
  const s = ech[at.ech];
  if (nom) nom.textContent = `${s.label} · ${at.ech + 1} / ${ech.length}`;
  let comp = '';
  if (at.comparer) {
    const g2 = gabaritDeVersion(at.comparer);
    if (g2) {
      comp = `<div class="at-comparaison"><div class="at-legende">${echapper(nomVersion(at.comparer))}</div>
        ${feuille(s.h, g2, false)}</div>`;
    }
  }
  zone.innerHTML = `<div class="at-comparaison"><div class="at-legende">${at.comparer ? 'Brouillon' : ''}</div>
    ${feuille(s.h, brouillon(), true)}</div>${comp}`;
}

/** Les guides magnétiques du dernier geste, en millimètres. */
function dessinerGuides(lignes) {
  const z = q('.at-feuille.editable .at-guides');
  if (!z) return;
  const k = mmPx();
  z.innerHTML = lignes.map((l) => (l.x !== undefined
    ? `<i class="at-guide v" style="left:${r2(l.x * k)}px"></i>`
    : `<i class="at-guide h" style="top:${r2(l.y * k)}px"></i>`)).join('');
}

/**
 * L'aimant : une position proche d'un repère — un bord, le milieu de la
 * carte, le bord ou le milieu d'un autre élément — s'y colle, et le repère
 * s'affiche. Alt maintenue, rien ne colle : on pose au dixième de millimètre.
 */
function reperes(axe, sauf) {
  const W = largeurMise(at.cle);
  const out = axe === 'x' ? [0, W / 2, W, 3, W - 3] : [0, HAUTEUR / 2, HAUTEUR, 3, HAUTEUR - 3];
  for (const e of mise().elements) {
    if (e.id === sauf || e.visible === false) continue;
    if (axe === 'x') out.push(e.x, e.x + e.w / 2, e.x + e.w);
    else out.push(e.y, e.y + e.h / 2, e.y + e.h);
  }
  return out;
}

function aimanter(valeurs, axe, sauf, libre) {
  if (libre) return { d: 0, guide: null };
  const cibles = reperes(axe, sauf);
  let mieux = null;
  for (const v of valeurs) {
    for (const c of cibles) {
      const d = c - v;
      if (Math.abs(d) <= 0.7 && (!mieux || Math.abs(d) < Math.abs(mieux.d))) mieux = { d, guide: c };
    }
  }
  return mieux || { d: 0, guide: null };
}

const arrondir = (v, libre) => (libre ? Math.round(v * 10) / 10 : Math.round(v * 2) / 2);

function brancherScene() {
  const zone = q('#at-scene');
  if (!zone) return;
  // Le double-clic se compte ici : la scène se redessine au premier clic, et
  // le navigateur ne verrait pas deux clics sur le même élément.
  let dernier = { id: null, t: 0 };
  zone.addEventListener('pointerdown', (ev) => {
    const cadre = ev.target.closest('.at-feuille.editable .at-cadre');
    if (cadre) {
      const t = Date.now();
      const double = dernier.id === cadre.dataset.el && t - dernier.t < 420;
      dernier = { id: cadre.dataset.el, t };
      if (double && (mise().elements.find((x) => x.id === cadre.dataset.el) || {}).type === 'illustration') {
        ev.preventDefault();
        changerIllustration(false);
        return;
      }
    }
    if (!cadre) {
      if (ev.target.closest('.at-feuille.editable') && at.sel) {
        at.sel = null; dessinerScene(); dessinerPanneau();
      }
      return;
    }
    ev.preventDefault();
    // Le geste reprend la main au clavier : un champ du panneau resté actif
    // garderait sinon les flèches et Ctrl+Z pour lui.
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    const id = cadre.dataset.el;
    const poignee = ev.target.dataset.poignee || null;
    if (at.sel !== id) { at.sel = id; dessinerScene(); dessinerPanneau(); }
    const e = elementSel();
    if (!e) return;
    const d0 = { x: e.x, y: e.y, w: e.w, h: e.h, px: ev.clientX, py: ev.clientY };
    const avant = JSON.stringify(brouillon());
    const k = mmPx();
    let bouge = false;
    let image = 0;
    zone.setPointerCapture(ev.pointerId);
    const deplacer = (m) => {
      const dx = (m.clientX - d0.px) / k;
      const dy = (m.clientY - d0.py) / k;
      if (!bouge && Math.hypot(m.clientX - d0.px, m.clientY - d0.py) < 3) return;
      bouge = true;
      const libre = m.altKey;
      const guides = [];
      if (!poignee) {
        let x = arrondir(d0.x + dx, libre); let y = arrondir(d0.y + dy, libre);
        const ax = aimanter([x, x + e.w / 2, x + e.w], 'x', e.id, libre);
        const ay = aimanter([y, y + e.h / 2, y + e.h], 'y', e.id, libre);
        x += ax.d; y += ay.d;
        if (ax.guide !== null) guides.push({ x: ax.guide });
        if (ay.guide !== null) guides.push({ y: ay.guide });
        e.x = r2(x); e.y = r2(y);
      } else {
        let { x, y, w, h } = d0;
        if (poignee.includes('e')) {
          let d = arrondir(d0.x + d0.w + dx, libre); const a = aimanter([d], 'x', e.id, libre); d += a.d;
          if (a.guide !== null) guides.push({ x: a.guide });
          w = d - x;
        }
        if (poignee.includes('w')) {
          let g = arrondir(d0.x + dx, libre); const a = aimanter([g], 'x', e.id, libre); g += a.d;
          if (a.guide !== null) guides.push({ x: a.guide });
          w = d0.x + d0.w - g; x = g;
        }
        if (poignee.includes('s')) {
          let b = arrondir(d0.y + d0.h + dy, libre); const a = aimanter([b], 'y', e.id, libre); b += a.d;
          if (a.guide !== null) guides.push({ y: a.guide });
          h = b - y;
        }
        if (poignee.includes('n')) {
          let t = arrondir(d0.y + dy, libre); const a = aimanter([t], 'y', e.id, libre); t += a.d;
          if (a.guide !== null) guides.push({ y: a.guide });
          h = d0.y + d0.h - t; y = t;
        }
        if (w < 1) { if (poignee.includes('w')) x -= 1 - w; w = 1; }
        if (h < 1) { if (poignee.includes('n')) y -= 1 - h; h = 1; }
        Object.assign(e, { x: r2(x), y: r2(y), w: r2(w), h: r2(h) });
      }
      if (!image) {
        image = requestAnimationFrame(() => {
          image = 0;
          dessinerScene(); dessinerGuides(guides); majChampsGeo();
        });
      }
    };
    const lacher = () => {
      zone.removeEventListener('pointermove', deplacer);
      zone.removeEventListener('pointerup', lacher);
      zone.removeEventListener('pointercancel', lacher);
      if (!bouge) return;
      memoriser(avant);
      enregistrer();
      dessinerScene(); dessinerPanneau(); dessinerEtat(); planifierToutes();
    };
    zone.addEventListener('pointermove', deplacer);
    zone.addEventListener('pointerup', lacher);
    zone.addEventListener('pointercancel', lacher);
  });
}

// --- Le panneau : les calques, et les réglages de l'élément choisi -------------------------

const TYPES = {
  illustration: 'Illustration', minutage: 'Minutage', icones: 'Icônes', bandeau: 'Pouvoir',
  texte: 'Texte', image: 'Image', forme: 'Forme',
};

const AJOUTABLES = { texte: true, image: true, forme: true };

function champ(e, cle, label, type, extra = {}) {
  const v = e[cle];
  const id = `at-f-${cle}`;
  let input;
  switch (type) {
    case 'mm': case 'nombre':
      input = `<input type="number" step="${extra.pas || 0.1}" ${extra.min !== undefined ? `min="${extra.min}"` : ''}
        ${extra.max !== undefined ? `max="${extra.max}"` : ''} value="${v ?? ''}" data-champ="${cle}" data-type="nombre" id="${id}">
        ${type === 'mm' ? '<i class="at-unite">mm</i>' : extra.unite ? `<i class="at-unite">${extra.unite}</i>` : ''}`;
      break;
    case 'couleur':
      input = `<input type="color" value="${v || '#000000'}" data-champ="${cle}" data-type="couleur" id="${id}">
        ${extra.optionnel ? `<label class="at-sans"><input type="checkbox" data-sans="${cle}" ${v ? '' : 'checked'}> aucun</label>` : ''}`;
      break;
    case 'bool':
      input = `<input type="checkbox" ${v ? 'checked' : ''} data-champ="${cle}" data-type="bool" id="${id}">`;
      break;
    case 'choix':
      input = `<select data-champ="${cle}" data-type="${extra.nombres ? 'nombre' : 'texte'}" id="${id}">${extra.options.map(([o, l]) => `<option value="${o}" ${
        String(v ?? extra.defaut ?? '') === String(o) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      break;
    case 'police': {
      const connue = POLICES.some((p) => p.famille === v) || POLICES_SYSTEME.includes(v);
      input = `<select data-champ="${cle}" data-type="police" id="${id}">
        <optgroup label="Polices du site — exportées telles quelles">${POLICES.map((p) => `<option ${p.famille === v ? 'selected' : ''}
          style="font-family:'${p.famille}'">${p.famille}</option>`).join('')}</optgroup>
        <optgroup label="Polices de l’ordinateur">${POLICES_SYSTEME.map((p) => `<option ${p === v ? 'selected' : ''}>${p}</option>`).join('')}</optgroup>
        <optgroup label="Google Fonts">${!connue && v ? `<option selected>${echapper(v)}</option>` : ''}
          <option value="__google">Autre police Google Fonts…</option></optgroup>
      </select>`;
      break;
    }
    case 'zone':
      input = `<textarea rows="2" data-champ="${cle}" data-type="texte" id="${id}">${echapper(v || '')}</textarea>`;
      break;
    case 'image': {
      const vs = visuelsApportes();
      const site = imagesSite.map((f) => `assets/atelier/${f}`);
      const connue = vs.some((x) => cleVisuel(x.id) === v) || site.includes(v);
      input = `<select data-champ="${cle}" data-type="texte" id="${id}">
        <option value="">— aucune —</option>
        ${site.length ? `<optgroup label="Images du site — pour tout le monde">${site.map((s) => `<option value="${s}" ${s === v ? 'selected' : ''}>${echapper(s.split('/').pop())}</option>`).join('')}</optgroup>` : ''}
        ${vs.length ? `<optgroup label="Apportées — dans ce navigateur">${vs.map((x) => `<option value="${cleVisuel(x.id)}" ${cleVisuel(x.id) === v ? 'selected' : ''}>${echapper(x.nom)}</option>`).join('')}</optgroup>` : ''}
        ${v && !connue ? `<option selected>${echapper(v)}</option>` : ''}
      </select>
      <button class="pill mini" id="at-image-ajouter">⭱ Apporter une image</button>
      <input type="file" id="at-image-fichier" accept="image/*" hidden>`;
      break;
    }
    default:
      input = `<input type="text" value="${echapper(v || '')}" data-champ="${cle}" data-type="texte" id="${id}">`;
  }
  return `<div class="at-champ ${type === 'zone' || type === 'image' ? 'large' : ''}"><label for="${id}">${label}</label><span class="at-saisie">${input}</span></div>`;
}

const ALIGNEMENTS = [['gauche', 'à gauche'], ['centre', 'au centre'], ['droite', 'à droite']];
const GRAISSES = [400, 500, 600, 700, 800, 900].map((w) => [w, String(w)]);

function champsDe(e) {
  const geo = `<div class="at-groupe"><h4>Place</h4>${champ(e, 'x', 'Gauche', 'mm')}${champ(e, 'y', 'Haut', 'mm')}
    ${champ(e, 'w', 'Largeur', 'mm', { min: 0.5 })}${champ(e, 'h', 'Hauteur', 'mm', { min: 0.5 })}</div>`;
  const boite = `<div class="at-groupe"><h4>Boîte</h4>${champ(e, 'fond', 'Fond', 'couleur', { optionnel: true })}
    ${champ(e, 'texture', 'Texture', 'choix', { options: [['', 'aucune'], ['papier', 'papier']] })}
    ${champ(e, 'rayon', 'Arrondi', 'mm', { min: 0 })}${champ(e, 'bord', 'Bordure', 'mm', { min: 0 })}
    ${champ(e, 'bordCouleur', 'Couleur du bord', 'couleur')}
    ${champ(e, 'opacite', 'Opacité', 'nombre', { min: 0, max: 100, pas: 5, unite: '%' })}</div>`;
  const texte = `<div class="at-groupe"><h4>Texte</h4>${champ(e, 'police', 'Police', 'police')}
    ${champ(e, 'graisse', 'Graisse', 'choix', { options: GRAISSES, nombres: true, defaut: 400 })}
    ${champ(e, 'taille', 'Corps', 'mm', { min: 0.5 })}${champ(e, 'couleur', 'Couleur', 'couleur')}
    ${champ(e, 'alignement', 'Alignement', 'choix', { options: ALIGNEMENTS, defaut: 'centre' })}
    ${champ(e, 'interlettre', 'Interlettrage', 'nombre', { pas: 0.01, unite: 'em' })}
    ${champ(e, 'italique', 'Italique', 'bool')}${champ(e, 'majuscules', 'Majuscules', 'bool')}
    ${champ(e, 'ombre', 'Ombre portée', 'bool')}</div>`;
  switch (e.type) {
    case 'illustration':
      return boutonsIllustration() + geo + `<div class="at-groupe"><h4>Image</h4>${champ(e, 'ancrage', 'Ancrage', 'choix', {
        options: [['haut', 'en haut'], ['centre', 'au centre'], ['bas', 'en bas'], ['haut-gauche', 'en haut à gauche'], ['haut-droite', 'en haut à droite']], defaut: 'haut' })}
        <p class="aide">Le cadrage plan par plan se règle dans le Matériel ; il est respecté ici.</p></div>` + boite;
    case 'minutage':
      return geo + texte + `<div class="at-groupe"><h4>Afficheur</h4>
        ${champ(e, 'couleurSpeciale', 'Couleur de --:--, 01:00, 99:00', 'couleur')}
        ${champ(e, 'lueur', 'Lueur', 'bool')}${champ(e, 'fantome', 'Segments éteints visibles', 'bool')}</div>` + boite;
    case 'icones':
      return geo + `<div class="at-groupe"><h4>Icônes</h4>
        ${champ(e, 'tailleIcones', 'Taille des icônes', 'nombre', { min: 20, max: 100, pas: 1, unite: '% de la hauteur' })}
        ${champ(e, 'espacement', 'Espacement', 'mm', { min: 0 })}
        ${champ(e, 'alignement', 'Alignement', 'choix', { options: ALIGNEMENTS, defaut: 'gauche' })}
        ${champ(e, 'ajuste', 'Languette ajustée aux icônes', 'bool')}${champ(e, 'dechire', 'Bord déchiré', 'bool')}</div>` + boite;
    case 'bandeau':
      return geo + `<div class="at-groupe"><h4>Pouvoir</h4>
        ${champ(e, 'quel', 'Montre', 'choix', { options: [['', 'tous les pouvoirs'], ['premier', 'le premier pouvoir'], ['second', 'le second pouvoir']] })}
        ${champ(e, 'dechire', 'Bord déchiré', 'bool')}
        ${champ(e, 'echelle', 'Taille du contenu', 'nombre', { min: 0.4, max: 2, pas: 0.05, unite: '×' })}</div>
        ${textesPouvoirs(e)}
        <div class="at-groupe"><h4>Typographie des pouvoirs</h4>${champ(e, 'police', 'Police', 'police')}
        ${champ(e, 'graisse', 'Graisse des mots', 'choix', { options: GRAISSES, nombres: true, defaut: 800 })}
        ${champ(e, 'couleur', 'Couleur des mots', 'couleur')}${champ(e, 'italique', 'Italique', 'bool')}
        <p class="aide">Vaut pour les mots du bandeau — « si », « × », « avec »… — écrits par le site comme par vous.</p></div>` + boite;
    case 'texte':
      return `<div class="at-groupe"><h4>Contenu</h4>${champ(e, 'texte', 'Texte', 'zone')}
        <p class="aide">Peut citer la carte : ${CHAMPS_TEXTE.map(([k, l]) => `<code title="${l}">${k}</code>`).join(' ')}</p>
        ${paletteJetons()}
        ${champ(e, 'tailleIcones', 'Taille des icônes', 'nombre', { min: 0.5, max: 4, pas: 0.05, unite: '× le corps' })}</div>`
        + geo + texte + boite;
    case 'image':
      return `<div class="at-groupe"><h4>Image</h4>${champ(e, 'src', 'Image', 'image')}
        ${champ(e, 'ajustement', 'Ajustement', 'choix', { options: [['contain', 'entière'], ['cover', 'remplit la boîte']], defaut: 'contain' })}</div>`
        + geo + boite;
    default:
      return geo + boite + `<div class="at-groupe">${champ(e, 'ombreBoite', 'Ombre portée', 'bool')}</div>`;
  }
}

// --- Les textes des pouvoirs, et les jetons -----------------------------------------------
// Un pouvoir s'écrit en mots et en JETONS : « [2] [x] [heroine] [>] ». Le texte
// est rangé dans le gabarit sous la SIGNATURE du pouvoir — sa sorte, sa valeur,
// ses cibles, sa portée — : il vaut donc pour tous les plans qui portent ce
// même pouvoir, et l'on n'écrit chaque pouvoir qu'une fois.

/** Les plans qui portent ce pouvoir, toutes mises en page confondues. */
function porteurs(sig) {
  let n = 0;
  for (const m of MISES) {
    if (m.id === 'DOS') continue;
    for (const { h } of echantillons(m.id)) if (objsDe(h).some((o) => signaturePouvoir(o) === sig)) n++;
  }
  return n;
}

/**
 * Le texte qu'écrirait le site pour ce pouvoir, en jetons : on relit son propre
 * bandeau, pièce par pièce. C'est le point de départ qu'on retouche.
 */
function formuleDe(o, h) {
  const div = document.createElement('div');
  div.innerHTML = bandeauGabarit([o], h.format === 'DEP' ? 'PL' : h.format, C.store.cfg, 30);
  const out = [];
  const CADRAGES = { 'Plan Large': 'pl', PL: 'pl', 'Plan Moyen': 'pm', PM: 'pm', 'Gros Plan': 'gp', GP: 'gp' };
  const marcher = (n) => {
    for (const x of n.childNodes) {
      if (x.nodeType === 3) { const t = x.textContent.trim(); if (t) out.push(t); continue; }
      if (x.nodeType !== 1) continue;
      const cl = x.classList;
      const src = x.getAttribute('src') || '';
      const m = /icones\/([A-Z_]+)\./.exec(src);
      if (x.tagName === 'IMG') { if (m) out.push(`[${m[1].toLowerCase()}]`); continue; }
      if (cl.contains('pastille-num')) { out.push(`[${x.getAttribute('aria-label')}]`); continue; }
      if (cl.contains('x')) { out.push('[x]'); continue; }
      if (cl.contains('avance-rapide')) { out.push(cl.contains('recul') ? '[<<]' : '[>>]'); continue; }
      if (cl.contains('fleche-pos')) { out.push(x.textContent.includes('◀') ? '[<]' : '[>]'); continue; }
      if (cl.contains('croix-non')) {
        const avant = out.pop();
        if (avant) out.push(/^\[.+\]$/.test(avant) ? `[non:${avant.slice(1, -1)}]` : avant);
        continue;
      }
      if (cl.contains('tag-seq')) { out.push('[seq]'); continue; }
      if (cl.contains('tag-fmt')) { out.push(`[${CADRAGES[x.textContent.trim()] || 'plan'}]`); continue; }
      if (cl.contains('tag-chrono')) { out.push('[timecode]'); continue; }
      if (cl.contains('tag') && /raccord/i.test(x.textContent)) { out.push('[raccord]'); continue; }
      if (x.tagName.toLowerCase() === 'svg') continue;
      marcher(x);
    }
  };
  marcher(div);
  return out.join(' ').replace(/\s+\+/g, '+');
}

/** Les jetons, en pastilles qu'un clic écrit à l'endroit du curseur. */
function paletteJetons() {
  const perso = (brouillon().icones || []).filter((i) => !ICONES_JEU[i.nom]);
  return `<div class="at-jetons" title="Cliquer pour écrire le jeton là où est le curseur">
    ${JETONS.map(([j, l]) => `<button class="at-jeton" data-jeton="${echapper(j)}" title="${echapper(l)}">${echapper(j)}</button>`).join('')}
    ${perso.map((i) => `<button class="at-jeton perso" data-jeton="[${echapper(i.nom)}]" title="Votre icône « ${echapper(i.nom)} »"><img src="${urlVisuel(i.src)}" alt="">${echapper(i.nom)}</button>`).join('')}
  </div>`;
}

function textesPouvoirs(e) {
  const h = planCourant();
  if (!h || h.format === 'DOS') return '';
  const tous = objsDe(h);
  const objs = e.quel === 'premier' ? tous.slice(0, 1) : e.quel === 'second' ? tous.slice(1, 2) : tous;
  const textes = brouillon().textes || {};
  const blocs = objs.map((o, i) => {
    const sig = signaturePouvoir(o);
    const t = textes[sig];
    const n = porteurs(sig);
    return `<div class="at-pouvoir">
      <div class="at-pouvoir-tete"><b>${objs.length > 1 ? `Pouvoir ${i + 1}` : 'Ce pouvoir'}</b>
        <span class="aide"><span class="at-qui">${t == null ? 'composé par le site' : 'écrit par vous'}</span> · ${n} plan${n > 1 ? 's' : ''} le porte${n > 1 ? 'nt' : ''}</span></div>
      <textarea rows="2" class="at-pouvoir-texte" data-pouvoir="${echapper(sig)}" data-formule="${echapper(formuleDe(o, h))}"
        placeholder="${echapper(formuleDe(o, h))}">${echapper(t ?? '')}</textarea>
      <div class="rangee-mini">
        <button class="pill mini" data-proposer="${echapper(sig)}">✎ Partir du texte du site</button>
        <button class="pill mini" data-auto="${echapper(sig)}" ${t == null ? 'disabled' : ''}>↺ Automatique</button>
      </div></div>`;
  }).join('');
  return `<div class="at-groupe"><h4>Le texte des pouvoirs</h4>
    ${objs.length ? blocs : '<p class="aide">Ce plan ne porte pas de pouvoir.</p>'}
    ${objs.length ? `${paletteJetons()}
    <p class="aide">Des mots, et des jetons entre crochets : <code>[2]</code> une valeur, <code>[x]</code> le ×, <code>[heroine]</code> une
    icône, <code>[non:allie]</code> barrée, <code>[>]</code> <code>[>>]</code> la portée, et le nom de vos propres icônes. Un retour à la
    ligne se respecte. Vide : le site compose le pouvoir. Le texte vaut pour tous les plans qui portent ce même pouvoir.</p>` : ''}
  </div>`;
}

// --- La bibliothèque d'icônes ----------------------------------------------------------------------
// Les logos et icônes de l'auteur, importés de son ordinateur et NOMMÉS : un
// nom se cite en jeton — « [monlogo] » — dans un texte ou un pouvoir. Une icône
// qui porte le nom d'une icône du jeu (heroine, ennemi, allie, objet, arme,
// vehicule, mort) la remplace partout : languettes, bandeaux, textes.

function dessinerIcones() {
  const z = q('#at-icones');
  if (!z) return;
  const l = brouillon().icones || [];
  z.innerHTML = `<div class="entete-ligne"><h3>Icônes et logos <span class="aide">— ${l.length} dans ce gabarit</span></h3>
      <span class="rangee-mini"><button class="pill mini creer" id="at-ic-importer">⭱ Importer des images…</button>
      <input type="file" id="at-ic-fichiers" accept="image/*" multiple hidden></span></div>
    <p class="aide">Le nom du fichier devient le nom de l'icône — <code>logo-bbg.png</code> se cite <code>[logo-bbg]</code>. Nommez-en une
    ${Object.keys(ICONES_JEU).map((k) => `<code>${k}</code>`).join(' ')} et elle remplace l'icône du jeu sur toutes les cartes.
    Un PNG transparent garde sa transparence ; l'original entier sert à l'impression.</p>
    <div class="at-icones">${l.length ? l.map((i, k) => `<div class="at-icone ${ICONES_JEU[i.nom] ? 'remplace' : ''}">
        <img src="${urlVisuel(i.src)}" alt="">
        <input type="text" value="${echapper(i.nom)}" data-ic-nom="${k}" spellcheck="false" title="Le nom de l'icône, cité entre crochets">
        <span class="aide">${ICONES_JEU[i.nom] ? 'remplace l’icône du jeu' : `[${echapper(i.nom)}]`}</span>
        <button class="at-mini suppr" data-ic-suppr="${k}" title="Retirer">✕</button></div>`).join('')
    : '<div class="vide">Aucune icône pour l’instant.</div>'}</div>`;
  const fic = z.querySelector('#at-ic-fichiers');
  z.querySelector('#at-ic-importer').addEventListener('click', () => fic.click());
  fic.addEventListener('change', async () => {
    const fichiers = [...(fic.files || [])];
    const entrees = [];
    for (const f of fichiers) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const v = await ajouterVisuel(f);
        entrees.push({ nom: nomIcone(f.name) || 'icone', src: cleVisuel(v.id) });
      } catch (err) { window.alert(`« ${f.name} » n’a pas pu entrer : ${err.message || err}`); }
    }
    if (!entrees.length) return;
    changer((g) => {
      for (const x of entrees) {
        let nom = x.nom; let i = 2;
        while (g.icones.some((y) => y.nom === nom)) nom = `${x.nom}-${i++}`;
        g.icones.push({ nom, src: x.src });
      }
    });
  });
  z.querySelectorAll('[data-ic-nom]').forEach((el) => el.addEventListener('change', () => {
    const k = +el.dataset.icNom;
    const ancien = brouillon().icones[k].nom;
    let nom = nomIcone(el.value);
    if (!nom || nom === ancien) { el.value = ancien; return; }
    if (brouillon().icones.some((y, j) => j !== k && y.nom === nom)) {
      window.alert(`Une autre icône s’appelle déjà « ${nom} ».`); el.value = ancien; return;
    }
    // Le nouveau nom suit partout où l'ancien était cité.
    const remplacer = (t) => String(t).split(`[${ancien}]`).join(`[${nom}]`).split(`[non:${ancien}]`).join(`[non:${nom}]`);
    changer((g) => {
      g.icones[k].nom = nom;
      for (const s of Object.keys(g.textes)) g.textes[s] = remplacer(g.textes[s]);
      for (const m of Object.values(g.mises)) for (const x of m.elements) if (x.type === 'texte' && x.texte) x.texte = remplacer(x.texte);
    });
  }));
  z.querySelectorAll('[data-ic-suppr]').forEach((b) => b.addEventListener('click', () => changer((g) => {
    g.icones.splice(+b.dataset.icSuppr, 1);
  })));
}

/** Le plan que la scène montre en ce moment. */
function planCourant() {
  const ech = echantillons(at.cle);
  return ech.length ? ech[((at.ech % ech.length) + ech.length) % ech.length].h : null;
}

/**
 * Les clés d'illustration du plan montré. Une moitié de carte a deux faces, qui
 * partagent d'ordinaire la même illustration : on les change ensemble, sauf à
 * demander la seule face visible.
 */
function clesIllustration(seuleFace) {
  const h = planCourant();
  if (!h || !h.cle || h.format === 'DOS') return [];
  if (!h.face || seuleFace) return [h.cle];
  return [`${h.numOrigine}R`, `${h.numOrigine}V`];
}

function boutonsIllustration() {
  const h = planCourant();
  if (!h || h.format === 'DOS') return '';
  return `<div class="at-groupe"><h4>L'illustration de ce plan</h4>
    <div class="rangee-mini">
      <button class="pill mini creer" data-changer-illus="">🖼 Changer l’illustration${h.face ? ' — recto et verso' : ''}</button>
      ${h.face ? '<button class="pill mini" data-changer-illus="face">cette face seulement</button>' : ''}
    </div>
    <p class="aide">Une image de la boîte, ou la vôtre. Le recadrage et le miroir se règlent dans la même fenêtre.
    C'est une retouche du Matériel : elle vaut pour ce plan partout — et pour son impression. Double-cliquer
    l'illustration sur la carte fait de même.</p></div>`;
}

function changerIllustration(seuleFace) {
  const cles = clesIllustration(seuleFace);
  if (!cles.length || !C.choisirIllustration) return;
  C.choisirIllustration(cles, () => { dessinerScene(); dessinerPanneau(); planifierToutes(); });
}

function dessinerPanneau() {
  const p = q('#at-panneau');
  if (!p) return;
  const m = mise();
  const e = elementSel();
  const calques = m.elements.map((x, i) => ({ x, i })).reverse().map(({ x, i }) => `
    <div class="at-calque ${x.id === at.sel ? 'sel' : ''} ${x.visible === false ? 'cache' : ''}" data-calque="${echapper(x.id)}">
      <button class="at-mini" data-oeil="${echapper(x.id)}" title="${x.visible === false ? 'Montrer' : 'Cacher'}">${x.visible === false ? '◌' : '●'}</button>
      <span class="at-calque-nom">${echapper(x.nom)}</span><span class="aide">${TYPES[x.type] || x.type}</span>
      <button class="at-mini" data-monter="${i}" title="Passer devant" ${i === m.elements.length - 1 ? 'disabled' : ''}>↑</button>
      <button class="at-mini" data-descendre="${i}" title="Passer derrière" ${i === 0 ? 'disabled' : ''}>↓</button>
      <button class="at-mini" data-dupliquer-el="${echapper(x.id)}" title="Dupliquer">⧉</button>
      ${AJOUTABLES[x.type] ? `<button class="at-mini suppr" data-suppr-el="${echapper(x.id)}" title="Supprimer">✕</button>` : ''}
    </div>`).join('');
  const g = brouillon();
  const reglages = e ? `<div class="at-titre-el"><input type="text" value="${echapper(e.nom)}" data-champ="nom" data-type="texte"
      title="Le nom de ce calque"><span class="aide">${TYPES[e.type]}</span></div>${champsDe(e)}`
    : `<div class="at-groupe"><h4>La carte — ${MISES.find((x) => x.id === at.cle).label}</h4>
      <div class="at-champ"><label>Fond du carton</label><span class="at-saisie">
        <input type="color" value="${m.carte.fond || '#000000'}" data-carte="fond"></span></div>
      <p class="aide">Le fond se voit partout où rien n'est posé — c'est le liseré noir des cartes 3.1 — et
      emplit le fond perdu à l'impression.</p></div>
      <div class="at-groupe"><h4>Tout le gabarit</h4>
      <div class="at-champ"><label>Nom</label><span class="at-saisie"><input type="text" value="${echapper(g.nom)}" data-global="nom"></span></div>
      <div class="at-champ"><label>Coins (écran)</label><span class="at-saisie"><input type="number" step="0.5" min="0" value="${g.coins}" data-global="coins"><i class="at-unite">mm</i></span></div>
      </div>
      <div class="at-groupe"><h4>Copier cette mise en page</h4>
      <p class="aide">Reprend tous les calques de « ${MISES.find((x) => x.id === at.cle).label} » sur une autre — les positions
      sont ramenées à sa largeur.</p>
      <div class="rangee-mini"><select id="at-copie-vers">${MISES.filter((x) => x.id !== at.cle)
    .map((x) => `<option value="${x.id}">${x.label}</option>`).join('')}</select>
      <button class="pill mini" id="at-copier-mise">Copier</button></div></div>
      ${boutonsIllustration()}
      <p class="aide">Cliquez un élément sur la carte, ou un calque ci-dessus, pour le régler.</p>`;
  p.innerHTML = `<h3>Calques <span class="aide">— le premier passe devant</span></h3>
    <div class="at-calques">${calques}</div>
    <div class="rangee-mini at-ajouts">
      <button class="pill mini" data-ajouter="texte">＋ Texte</button>
      <button class="pill mini" data-ajouter="image">＋ Image</button>
      <button class="pill mini" data-ajouter="forme">＋ Forme</button>
      ${e ? '<button class="pill mini" id="at-deselection">La carte</button>' : ''}
    </div>
    <div class="at-reglages">${reglages}</div>`;
  brancherPanneau();
  dessinerIcones();
}

/** Les champs de position suivent un glisser sans redessiner tout le panneau. */
function majChampsGeo() {
  const e = elementSel();
  if (!e) return;
  for (const k of ['x', 'y', 'w', 'h']) {
    const i = q(`#at-f-${k}`);
    if (i && document.activeElement !== i) i.value = e[k];
  }
}

function lireChamp(el) {
  const t = el.dataset.type;
  if (t === 'bool') return el.checked;
  if (t === 'nombre') { const v = parseFloat(el.value); return Number.isFinite(v) ? v : undefined; }
  return el.value;
}

function brancherPanneau() {
  const p = q('#at-panneau');
  const e = elementSel();
  p.querySelectorAll('[data-calque]').forEach((r) => r.addEventListener('click', (ev) => {
    if (ev.target.closest('button')) return;
    at.sel = r.dataset.calque; dessinerScene(); dessinerPanneau();
  }));
  p.querySelectorAll('[data-oeil]').forEach((b) => b.addEventListener('click', () => changer((g) => {
    const x = g.mises[at.cle].elements.find((y) => y.id === b.dataset.oeil);
    x.visible = x.visible === false;
  })));
  const bouger = (i, d) => changer((g) => {
    const l = g.mises[at.cle].elements;
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
  });
  p.querySelectorAll('[data-monter]').forEach((b) => b.addEventListener('click', () => bouger(+b.dataset.monter, 1)));
  p.querySelectorAll('[data-descendre]').forEach((b) => b.addEventListener('click', () => bouger(+b.dataset.descendre, -1)));
  p.querySelectorAll('[data-dupliquer-el]').forEach((b) => b.addEventListener('click', () => dupliquer(b.dataset.dupliquerEl)));
  p.querySelectorAll('[data-suppr-el]').forEach((b) => b.addEventListener('click', () => supprimer(b.dataset.supprEl)));
  p.querySelectorAll('[data-ajouter]').forEach((b) => b.addEventListener('click', () => ajouter(b.dataset.ajouter)));
  p.querySelectorAll('[data-changer-illus]').forEach((b) => b.addEventListener('click', () => changerIllustration(!!b.dataset.changerIllus)));
  const des = p.querySelector('#at-deselection');
  if (des) des.addEventListener('click', () => { at.sel = null; dessinerScene(); dessinerPanneau(); });

  // Les réglages : un instantané à l'entrée dans le champ, pour qu'annuler
  // ramène d'un coup à l'état d'avant — pas couleur par couleur.
  p.querySelectorAll('[data-champ]').forEach((el) => {
    el.addEventListener('focus', () => { at.instantane = JSON.stringify(brouillon()); });
    const appliquer = (final) => {
      const cle = el.dataset.champ;
      if (el.dataset.type === 'police' && el.value === '__google') {
        const n = window.prompt('Le nom exact d’une police de Google Fonts (fonts.google.com) — « Playfair Display », « Rubik Mono One »… :');
        if (!n) { dessinerPanneau(); return; }
        el.value = n.trim();
      }
      const v = lireChamp(el);
      if (v === undefined) return;
      const cible = elementSel();
      if (!cible) return;
      cible[cle] = v;
      if (cle === 'police') declarerPolices(brouillon());
      if (el.dataset.type === 'couleur') {
        const sans = p.querySelector(`[data-sans="${cle}"]`);
        if (sans) sans.checked = false;
      }
      if (final) {
        memoriser(at.instantane || undefined);
        at.instantane = JSON.stringify(brouillon());
        enregistrer();
        dessinerEtat(); planifierToutes();
        if (cle === 'nom' || cle === 'police' || el.dataset.type === 'bool') dessinerPanneau();
      }
      dessinerScene();
    };
    el.addEventListener('input', () => { if (el.dataset.type === 'couleur' || el.dataset.type === 'nombre') appliquer(false); });
    el.addEventListener('change', () => appliquer(true));
  });
  p.querySelectorAll('[data-sans]').forEach((c) => c.addEventListener('change', () => changer((g) => {
    const x = g.mises[at.cle].elements.find((y) => y.id === at.sel);
    if (c.checked) x[c.dataset.sans] = '';
    else x[c.dataset.sans] = p.querySelector(`[data-champ="${c.dataset.sans}"]`).value;
  })));
  p.querySelectorAll('[data-carte]').forEach((el) => el.addEventListener('change', () => changer((g) => {
    g.mises[at.cle].carte[el.dataset.carte] = el.value;
  })));
  p.querySelectorAll('[data-global]').forEach((el) => el.addEventListener('change', () => changer((g) => {
    g[el.dataset.global] = el.dataset.global === 'coins' ? Math.max(0, parseFloat(el.value) || 0) : el.value;
  })));
  const cm = p.querySelector('#at-copier-mise');
  if (cm) {
    cm.addEventListener('click', () => {
      const vers = p.querySelector('#at-copie-vers').value;
      const label = MISES.find((x) => x.id === vers).label;
      if (!window.confirm(`Remplacer la mise en page « ${label} » par celle-ci ?\n\nAnnuler (Ctrl+Z) la rendra.`)) return;
      changer((g) => {
        const k = largeurMise(vers) / largeurMise(at.cle);
        const copie = JSON.parse(JSON.stringify(g.mises[at.cle]));
        for (const x of copie.elements) {
          // Ce qui était calé sur les bords le reste ; le reste suit la largeur.
          const W = largeurMise(at.cle);
          if (x.x + x.w >= W - 0.05) { x.w = r2(largeurMise(vers) - x.x - (W - x.x - x.w)); } else { x.x = r2(x.x * k); x.w = r2(x.w * k); }
          if (x.w < 1) x.w = 1;
        }
        g.mises[vers] = copie;
      });
    });
  }
  const ia = p.querySelector('#at-image-ajouter');
  if (ia) {
    const fic = p.querySelector('#at-image-fichier');
    ia.addEventListener('click', () => fic.click());
    fic.addEventListener('change', async () => {
      const f = fic.files && fic.files[0];
      if (!f) return;
      try {
        const v = await ajouterVisuel(f);
        changer((g) => { g.mises[at.cle].elements.find((y) => y.id === at.sel).src = cleVisuel(v.id); });
      } catch (err) { window.alert(`L’image n’a pas pu entrer : ${err.message || err}`); }
    });
  }
  if (e && e.type === 'texte') {
    const z = p.querySelector('textarea[data-champ="texte"]');
    if (z) z.addEventListener('input', () => { e.texte = z.value; dessinerScene(); });
  }

  // Le texte des pouvoirs : la carte suit la frappe ; la sortie du champ
  // l'enregistre. Vide, le pouvoir repart au site.
  const ecrire = (sig, t) => {
    const g = brouillon();
    if (t == null || !String(t).trim()) delete g.textes[sig]; else g.textes[sig] = t;
  };
  let dernier = p.querySelector('textarea[data-champ="texte"], .at-pouvoir-texte');
  p.querySelectorAll('.at-pouvoir-texte').forEach((z) => {
    z.addEventListener('focus', () => { at.instantane = JSON.stringify(brouillon()); dernier = z; });
    z.addEventListener('input', () => {
      ecrire(z.dataset.pouvoir, z.value);
      const bloc = z.closest('.at-pouvoir');
      const ecrit = !!z.value.trim();
      bloc.querySelector('.at-qui').textContent = ecrit ? 'écrit par vous' : 'composé par le site';
      bloc.querySelector('[data-auto]').disabled = !ecrit;
      dessinerScene();
    });
    z.addEventListener('change', () => {
      ecrire(z.dataset.pouvoir, z.value);
      memoriser(at.instantane || undefined); at.instantane = JSON.stringify(brouillon());
      enregistrer(); dessinerEtat(); planifierToutes(); dessinerScene();
    });
  });
  p.querySelectorAll('textarea[data-champ="texte"]').forEach((z) => z.addEventListener('focus', () => { dernier = z; }));
  p.querySelectorAll('[data-proposer]').forEach((b) => b.addEventListener('click', () => {
    const z = [...p.querySelectorAll('.at-pouvoir-texte')].find((x) => x.dataset.pouvoir === b.dataset.proposer);
    changer((g) => { g.textes[b.dataset.proposer] = z.dataset.formule; });
  }));
  p.querySelectorAll('[data-auto]').forEach((b) => b.addEventListener('click', () => changer((g) => {
    delete g.textes[b.dataset.auto];
  })));
  // Un jeton s'écrit là où était le curseur, dans le dernier champ touché.
  p.querySelectorAll('[data-jeton]').forEach((b) => {
    b.addEventListener('pointerdown', (ev) => ev.preventDefault());
    b.addEventListener('click', () => {
      const z = dernier;
      if (!z) return;
      if (document.activeElement !== z) at.instantane = JSON.stringify(brouillon());
      const j = b.dataset.jeton;
      const a = z.selectionStart ?? z.value.length; const f = z.selectionEnd ?? a;
      const avant = z.value.slice(0, a);
      const ajout = (avant && !/\s$/.test(avant) ? ' ' : '') + j;
      z.value = avant + ajout + z.value.slice(f);
      z.focus();
      z.selectionStart = z.selectionEnd = a + ajout.length;
      z.dispatchEvent(new Event('input'));
      z.dispatchEvent(new Event('change'));
    });
  });
}

let compteur = 0;
const nouvelId = (type) => `${type}-${Date.now().toString(36)}${(compteur++).toString(36)}`;

function ajouter(type) {
  const W = largeurMise(at.cle);
  const base = { id: nouvelId(type), type, x: r2(W / 2 - Math.min(10, W / 3)), y: 22, w: r2(Math.min(20, W * 2 / 3)), h: type === 'texte' ? 6 : 12 };
  const el = type === 'texte'
    ? { ...base, nom: 'Texte', texte: 'Texte', police: 'Montserrat', graisse: 800, taille: 4, couleur: '#ffffff', alignement: 'centre', ombre: true }
    : type === 'image' ? { ...base, nom: 'Image', src: '', ajustement: 'contain' }
      : { ...base, nom: 'Forme', fond: '#7c3aed', rayon: 1, opacite: 100 };
  changer((g) => { g.mises[at.cle].elements.push(el); });
  at.sel = el.id;
  dessinerScene(); dessinerPanneau();
}

function dupliquer(id) {
  const src = mise().elements.find((x) => x.id === id);
  if (!src) return;
  const c = { ...JSON.parse(JSON.stringify(src)), id: nouvelId(src.type), nom: `${src.nom} (copie)`, x: r2(src.x + 2), y: r2(src.y + 2) };
  changer((g) => {
    const l = g.mises[at.cle].elements;
    l.splice(l.findIndex((x) => x.id === id) + 1, 0, c);
  });
  at.sel = c.id;
  dessinerScene(); dessinerPanneau();
}

function supprimer(id) {
  changer((g) => { g.mises[at.cle].elements = g.mises[at.cle].elements.filter((x) => x.id !== id); });
  if (at.sel === id) at.sel = null;
  dessinerScene(); dessinerPanneau();
}

// --- Les versions ------------------------------------------------------------------------

function nomVersion(id) {
  const p = versionPubliee(id);
  if (p) return `${id} — ${p.nom}`;
  const e = essais().find((x) => x.id === id);
  return e ? `${e.nom} (${e.date})` : id;
}

function optionsVersions(sel) {
  const es = essais();
  return `<optgroup label="Versions publiées">${VERSIONS_GABARIT.map((v) => `<option value="${v.id}" ${v.id === sel ? 'selected' : ''}>${v.id} — ${echapper(v.nom)}</option>`).join('')}</optgroup>
    ${es.length ? `<optgroup label="Mes essais — dans ce navigateur">${es.map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${echapper(e.nom)} · ${e.date}</option>`).join('')}</optgroup>` : ''}`;
}

function dessinerEtat() {
  const z = q('#at-etat');
  if (!z) return;
  const { nomBase, modifie } = etatBrouillon();
  z.innerHTML = `Brouillon tiré de <b>${echapper(nomBase)}</b>${modifie ? ' · <b class="at-modifie">modifié</b>' : ' · tel quel'}`;
  const a = q('#at-annuler'); const r = q('#at-refaire');
  if (a) a.disabled = !at.annuler.length;
  if (r) r.disabled = !at.refaire.length;
}

function maintenant() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function brancherVersions() {
  const sel = q('#at-version');
  sel.addEventListener('change', () => { at.choix = sel.value; majBoutonsVersion(); });
  q('#at-charger').addEventListener('click', () => {
    const id = sel.value;
    const g = gabaritDeVersion(id);
    if (!g) return;
    if (etatBrouillon().modifie && !window.confirm(`Charger « ${nomVersion(id)} » à la place du brouillon ?\n\nLe brouillon n'est pas perdu : Ctrl+Z le rend.`)) return;
    memoriser();
    design().gabarit = g;
    design().base = id;
    at.sel = null;
    apresHistorique();
  });
  q('#at-comparer').addEventListener('click', () => {
    at.comparer = at.comparer === sel.value ? '' : sel.value;
    q('#at-comparer').classList.toggle('on', !!at.comparer);
    dessinerScene();
  });
  q('#at-essai').addEventListener('click', () => {
    const n = window.prompt('Le nom de cet essai :', `${brouillon().nom} — essai ${essais().length + 1}`);
    if (!n) return;
    const id = `e${Date.now().toString(36)}`;
    sauverEssais([{ id, nom: n.trim(), date: maintenant(), gabarit: JSON.parse(JSON.stringify(brouillon())) }, ...essais()]);
    design().base = id;
    enregistrer();
    at.choix = id;
    sel.innerHTML = optionsVersions(id);
    dessinerEtat(); majBoutonsVersion();
  });
  q('#at-suppr-essai').addEventListener('click', () => {
    const id = sel.value;
    if (!essais().some((x) => x.id === id)) return;
    if (!window.confirm(`Supprimer l’essai « ${nomVersion(id)} » ?`)) return;
    sauverEssais(essais().filter((x) => x.id !== id));
    sel.innerHTML = optionsVersions(design().base);
    dessinerEtat(); majBoutonsVersion();
  });
  q('#at-copier').addEventListener('click', async (ev) => {
    const t = JSON.stringify(brouillon());
    const b = ev.currentTarget;
    try {
      await navigator.clipboard.writeText(t);
      const avant = b.textContent; b.textContent = '✓ Copié';
      setTimeout(() => { b.textContent = avant; }, 1600);
    } catch { window.prompt('Le gabarit, à copier :', t); }
  });
  q('#at-coller').addEventListener('click', () => {
    const t = window.prompt('Collez ici un gabarit copié depuis l’Atelier :');
    if (!t) return;
    try {
      const g = normaliserGabarit(JSON.parse(t));
      memoriser();
      design().gabarit = g;
      at.sel = null;
      apresHistorique();
    } catch { window.alert('Ce texte n’est pas un gabarit.'); }
  });
  q('#at-annuler').addEventListener('click', annuler);
  q('#at-refaire').addEventListener('click', refaire);
  majBoutonsVersion();
}

function majBoutonsVersion() {
  const id = (q('#at-version') || {}).value;
  const b = q('#at-suppr-essai');
  if (b) b.disabled = !essais().some((x) => x.id === id);
}

// --- Toutes les cartes, d'un coup ------------------------------------------------------------

const FILTRES = [
  ['MISE', 'Ce type'], ['TOUT', 'Tout le jeu'], ['PL', 'Plans Larges'], ['DEP', 'Départs'],
  ['RECTO', 'Cartes PM / GP — recto'], ['VERSO', '— verso'],
];

/**
 * Les cartes du set telles qu'on les imprime — chacune avec son recto et son
 * verso. Une carte à qui il manque une moitié est montrée, mais ne s'imprime
 * pas : elle ne se joue pas non plus.
 */
function cartesDuSet(opts = {}, cle = null) {
  const out = [];
  const garde = (plans) => !cle || plans.some((h) => h && cleMise(h) === cle);
  buildCartesDoubles().forEach((c) => {
    if (!c.actif) return;
    const r = moitiesDe(c, 'R'); const v = moitiesDe(c, 'V');
    const complete = !!(r.PM && r.GP);
    if (opts.completes && !complete) return;
    if (!garde([r.PM, r.GP, v.PM, v.GP])) return;
    const nom = `carte-${String(c.rang + 1).padStart(2, '0')}${r.PM ? `-pm${r.PM.num}` : ''}${r.GP ? `-gp${r.GP.num}` : ''}`;
    out.push({ famille: 'DOUBLE', nom, recto: renderCarte(c, false, opts), verso: renderCarte(c, true, opts) });
  });
  buildPlansLarges(false).forEach((c) => {
    if (!c.actif || !garde([plHalf(c)]) && cle !== 'DOS') return;
    out.push({ famille: 'PL', nom: `plan-large-${plHalf(c).num}`, recto: renderCarte(c, false, opts),
      verso: renderDos('Plans Larges', 0, opts) });
  });
  C.departsAImprimer().forEach((d) => {
    const faces = d.faces.filter((f) => !C.estDesactivee(`S${d.type}f${f.num}`));
    if (!faces.length) return;
    const carte = (f) => ({ ...f, depart: true, type: 'DEPART', id: `S${d.type}f${f.num}` });
    if (!garde(faces.map((f) => plHalf(carte(f))))) return;
    out.push({ famille: 'DEP', nom: `plan-de-depart-${d.type}`, recto: renderCarte(carte(faces[0]), false, opts),
      verso: faces[1] ? renderCarte(carte(faces[1]), false, opts) : null });
  });
  return out;
}

let minuterie = 0;
function planifierToutes() {
  clearTimeout(minuterie);
  minuterie = setTimeout(dessinerToutes, 260);
}

function dessinerToutes() {
  const z = q('#at-toutes');
  if (!z) return;
  brancherGabarit(brouillon(), { set: C.store.cfg.set });
  let html = '';
  try {
    html = C.surLeModifie(() => {
      const opts = { small: true, muet: true, cfg: C.store.cfg };
      const f = at.filtre;
      const cartes = cartesDuSet(opts, f === 'MISE' ? at.cle : null);
      const faces = [];
      for (const c of cartes) {
        if (f === 'PL' && c.famille !== 'PL') continue;
        if (f === 'DEP' && c.famille !== 'DEP') continue;
        if ((f === 'RECTO' || f === 'VERSO') && c.famille !== 'DOUBLE') continue;
        if (f !== 'VERSO') faces.push(c.recto);
        if (f !== 'RECTO' && c.verso && (c.famille !== 'PL' || f === 'TOUT' || at.cle === 'DOS')) faces.push(c.verso);
      }
      return faces.join('');
    });
  } finally { C.appliquerDesign(); }
  z.innerHTML = html || '<div class="vide">Aucune carte.</div>';
  const n = z.querySelectorAll('.carte').length;
  const c = q('#at-toutes-compte');
  if (c) c.textContent = `${n} face${n > 1 ? 's' : ''}`;
}

/** Cliquer une moitié dans « Toutes les cartes » la prend pour modèle. */
function brancherToutes() {
  q('#at-toutes').addEventListener('click', (ev) => {
    const m = ev.target.closest('.moitie');
    if (!m) return;
    const f = m.dataset.format;
    const cle = f === 'PL' ? (m.closest('.dos') ? 'DOS' : 'PL') : f === 'DEP' || m.classList.contains('depart') ? 'DEP'
      : `${f}${m.classList.contains('transition') ? '-TR' : ''}`;
    at.cle = cle;
    const ech = echantillons(cle);
    const i = ech.findIndex((x) => String(x.h.num) === m.dataset.num);
    at.ech = Math.max(0, i);
    at.sel = null;
    dessinerOnglets(); dessinerScene(); dessinerPanneau();
    q('#at-scene').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  qa('[data-filtre]').forEach((b) => b.addEventListener('click', () => {
    at.filtre = b.dataset.filtre;
    qa('[data-filtre]').forEach((x) => x.classList.toggle('on', x === b));
    dessinerToutes();
  }));
}

// --- L'export ----------------------------------------------------------------------------------

const EXPORT_DEFAUT = { quoi: 'TOUT', format: 'PLANCHES', dpi: 300, perdu: 0, traits: true };

function dessinerExport() {
  const z = q('#at-export');
  if (!z) return;
  const o = at.exp;
  const sel = (k, opts) => `<select data-exp="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(o[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const W = 88 + 2 * o.perdu; const H = 63 + 2 * o.perdu;
  const px = (mm) => Math.round((mm / 25.4) * o.dpi);
  z.innerHTML = `<h3>Imprimer</h3>
    <p class="aide">Les cartes du set <b>${C.store.cfg.set}</b>, dessinées par le <b>brouillon</b> — qu'il soit
    branché sur le site ou non —, dans le jeu <b>Modifié</b> que le Matériel montre. Les cartes à qui il manque
    une moitié ne s'impriment pas.</p>
    <div class="at-export-grille">
      <label>Quoi ${sel('quoi', [['TOUT', 'Tout le jeu'], ['MISE', `Seulement : ${MISES.find((x) => x.id === at.cle).label}`]])}</label>
      <label>Format ${sel('format', [['PLANCHES', 'Planches A4 recto-verso (PDF)'], ['CARTES_PDF', 'Une carte par fichier (PDF, en ZIP)'], ['CARTES_PNG', 'Une carte par fichier (PNG, en ZIP)']])}</label>
      <label>Définition ${sel('dpi', [[300, '300 dpi — impression courante'], [450, '450 dpi'], [600, '600 dpi — le maximum utile']])}</label>
      <label>Fond perdu ${sel('perdu', [[0, 'aucun'], [2, '2 mm'], [3, '3 mm — standard imprimeur']])}</label>
      <label class="at-case"><input type="checkbox" data-exp="traits" ${o.traits ? 'checked' : ''}> Traits de coupe</label>
      <label>Verso ${sel('retournement', C.retournements)}</label>
    </div>
    <p class="aide">Chaque carte : ${r2(W)} × ${r2(H)} mm, soit ${px(W)} × ${px(H)} pixels.${
  o.dpi > 300 && o.format === 'PLANCHES' ? ' À cette définition le PDF est lourd — compter 1 Mo par face.' : ''}
    La netteté réelle ne dépasse pas celle des illustrations elles-mêmes.</p>
    <div class="rangee-mini">
      <button class="cta" id="at-exporter">⭳ Exporter</button>
      <button class="pill" id="at-vectoriel" title="Une page à imprimer par le navigateur — « Enregistrer au format PDF » : le texte et les formes restent vectoriels, les illustrations gardent toute leur définition">🖨 Version vectorielle</button>
      <span class="aide" id="at-avance"></span>
    </div>`;
  z.querySelectorAll('[data-exp]').forEach((el) => el.addEventListener('change', () => {
    const k = el.dataset.exp;
    at.exp[k] = el.type === 'checkbox' ? el.checked : (['dpi', 'perdu'].includes(k) ? +el.value : el.value);
    if (k === 'retournement') C.LS.set('planche.retournement', el.value);
    C.LS.set('atelier.export', at.exp);
    dessinerExport();
  }));
  z.querySelector('#at-exporter').addEventListener('click', exporter);
  z.querySelector('#at-vectoriel').addEventListener('click', ouvrirImpression);
}

async function exporter() {
  if (at.enCours) return;
  const o = at.exp;
  const b = q('#at-exporter'); const av = q('#at-avance');
  const g = brouillon();
  const W = 88 + 2 * o.perdu; const H = 63 + 2 * o.perdu;
  const largeurPx = Math.round((W / 25.4) * o.dpi);
  const hautPx = Math.round((H / 25.4) * o.dpi);
  at.enCours = true; b.disabled = true;
  try {
    av.textContent = 'Préparation des polices…';
    const css = await cssPolicesEmbarquees(g);
    brancherGabarit(g, { set: C.store.cfg.set, hd: true });
    let cartes;
    try {
      cartes = C.surLeModifie(() => cartesDuSet({ perdu: o.perdu, impression: true, completes: true, cfg: C.store.cfg },
        o.quoi === 'MISE' ? at.cle : null));
    } finally { C.appliquerDesign(); }
    if (!cartes.length) { window.alert('Aucune carte à imprimer.'); return; }
    const avance = (f, t) => { av.textContent = `⏳ ${f} / ${t}`; };
    const quand = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomBase = `edit-${C.store.cfg.set}-${(g.nom || 'gabarit').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${quand}`;
    if (o.format === 'PLANCHES') {
      const pdf = await planchesCartes(cartes.map((c) => ({ recto: c.recto, verso: c.verso })), {
        largeurPx, hautPx, avance, cssEnPlus: css, version: C.VERSION,
        gabarit: { ...PLANCHE, retournement: C.LS.get('planche.retournement', 'colonnes'), perduMm: o.perdu, traits: o.traits },
      });
      C.telecharger(new Blob([pdf], { type: 'application/pdf' }), `${nomBase}-planches-${o.dpi}dpi.pdf`);
    } else {
      const faces = cartes.flatMap((c) => [{ nom: `${c.nom}-recto`, html: c.recto },
        ...(c.verso ? [{ nom: `${c.nom}-verso`, html: c.verso }] : [])]);
      const zip = await archiveCartes(faces, {
        largeurMm: W, hautMm: H, largeurPx, hautPx, avance, cssEnPlus: css, version: C.VERSION,
        png: o.format === 'CARTES_PNG', dpi: o.dpi,
      });
      C.telecharger(new Blob([zip], { type: 'application/zip' }), `${nomBase}-cartes-${o.dpi}dpi.zip`);
    }
    av.textContent = '✓ Exporté.';
  } catch (err) {
    window.alert(`L’export a échoué : ${err && err.message ? err.message : err}`);
    av.textContent = '';
  } finally {
    at.enCours = false; b.disabled = false;
  }
}

function ouvrirImpression() {
  const o = at.exp;
  C.LS.set('atelier.impression', {
    mode: o.format === 'PLANCHES' ? 'planches' : 'cartes', perdu: o.perdu, traits: o.traits,
    retournement: C.LS.get('planche.retournement', 'colonnes'), cle: o.quoi === 'MISE' ? at.cle : null,
  });
  window.open(`${location.pathname}#/impression`, '_blank');
}

// --- L'écran ------------------------------------------------------------------------------------

function dessinerOnglets() {
  qa('[data-mise]').forEach((b) => b.classList.toggle('on', b.dataset.mise === at.cle));
}

export function vueAtelier(ctx) {
  C = ctx;
  if (!at.exp) {
    at.exp = { ...EXPORT_DEFAUT, ...C.LS.get('atelier.export', {}) };
    at.exp.retournement = C.LS.get('planche.retournement', 'colonnes');
  }
  const d = design();
  d.gabarit = normaliserGabarit(brouillon());
  C.LS.set('cfg', C.store.cfg);
  declarerPolices(d.gabarit);
  if (!at.choix) at.choix = d.base || VERSION_DEFAUT;
  C.html(`${C.topbar('#/atelier')}
  <div class="wrap large atelier">
    <div class="panneau at-tete">
      <div class="entete-ligne">
        <h2>Atelier — le dessin des cartes</h2>
        <label class="chip ${d.actif ? 'on' : ''}" title="Galeries, table de jeu, exports du Matériel, lien partagé : toutes les cartes du site se dessinent alors avec ce brouillon">
          <input type="checkbox" id="at-actif" ${d.actif ? 'checked' : ''}> Les cartes du site prennent ce dessin</label>
      </div>
      <p class="aide">Prenez un élément sur la carte pour le déplacer, une poignée pour le redimensionner — il se cale
      au demi-millimètre et s'aimante aux bords et aux milieux (Alt pour poser librement). Flèches : 0,5 mm,
      Maj + flèches : 0,1 mm. Ctrl+Z annule. Toutes les cartes du jeu, en bas, suivent.</p>
      <div class="at-versions">
        <span id="at-etat" class="at-etat"></span>
        <select id="at-version">${optionsVersions(at.choix)}</select>
        <button class="pill mini" id="at-charger" title="Remplacer le brouillon par cette version">↺ Charger</button>
        <button class="pill mini ${at.comparer ? 'on' : ''}" id="at-comparer" title="Montrer cette version à côté du brouillon">⇆ Comparer</button>
        <button class="pill mini" id="at-essai" title="Garder le brouillon tel qu'il est, dans ce navigateur">💾 Enregistrer l’essai</button>
        <button class="pill mini" id="at-suppr-essai">✕ Supprimer l’essai</button>
        <button class="pill mini" id="at-copier" title="Le gabarit en texte — à m'envoyer pour qu'il devienne une version publiée">📋 Copier le gabarit</button>
        <button class="pill mini" id="at-coller">⭱ Coller un gabarit</button>
        <button class="pill mini" id="at-annuler" title="Annuler — Ctrl+Z">↶ Annuler</button>
        <button class="pill mini" id="at-refaire" title="Rétablir — Ctrl+Maj+Z">↷ Rétablir</button>
      </div>
    </div>
    <div class="at-mises">${MISES.map((m) => `<button class="pill ${m.id === at.cle ? 'on' : ''}" data-mise="${m.id}">${m.label}</button>`).join('')}</div>
    <div class="at-corps">
      <div class="panneau at-gauche">
        <div class="at-outils">
          <button class="pill mini" id="at-prec" title="Plan précédent">◀</button>
          <span id="at-ech-nom" class="at-ech-nom"></span>
          <button class="pill mini" id="at-suiv" title="Plan suivant">▶</button>
          <span class="at-espace"></span>
          <label class="at-case"><input type="checkbox" id="at-grille" ${at.grille ? 'checked' : ''}> grille mm</label>
          <label class="at-case"><input type="checkbox" id="at-sure" ${at.sure ? 'checked' : ''}> marge de 3 mm</label>
          <select id="at-zoom">${[[0.7, '70 %'], [1, '100 %'], [1.3, '130 %'], [1.7, '170 %']].map(([v, l]) => `<option value="${v}" ${v === at.zoom ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div id="at-scene" class="at-scene"></div>
      </div>
      <div class="panneau at-droite" id="at-panneau"></div>
    </div>
    <div class="panneau at-biblio" id="at-icones"></div>
    <div class="panneau">
      <div class="entete-ligne"><h3>Toutes les cartes <span class="aide" id="at-toutes-compte"></span></h3>
        <span class="at-filtres">${FILTRES.map(([k, l]) => `<button class="pill mini ${k === at.filtre ? 'on' : ''}" data-filtre="${k}">${l}</button>`).join('')}</span></div>
      <p class="aide">Tirées du Matériel par le brouillon. Cliquez une moitié pour la prendre pour modèle.</p>
      <div id="at-toutes" class="at-toutes"></div>
    </div>
    <div class="panneau at-export" id="at-export"></div>
  </div>
  ${C.pied()}`);

  q('#at-actif').addEventListener('change', (e) => {
    design().actif = e.target.checked;
    e.target.closest('.chip').classList.toggle('on', e.target.checked);
    enregistrer();
  });
  qa('[data-mise]').forEach((b) => b.addEventListener('click', () => {
    at.cle = b.dataset.mise; at.ech = 0; at.sel = null;
    dessinerOnglets(); dessinerScene(); dessinerPanneau(); dessinerExport();
    if (at.filtre === 'MISE') planifierToutes();
  }));
  q('#at-prec').addEventListener('click', () => { at.ech--; dessinerScene(); dessinerPanneau(); });
  q('#at-suiv').addEventListener('click', () => { at.ech++; dessinerScene(); dessinerPanneau(); });
  q('#at-grille').addEventListener('change', (e) => { at.grille = e.target.checked; dessinerScene(); });
  q('#at-sure').addEventListener('change', (e) => { at.sure = e.target.checked; dessinerScene(); });
  q('#at-zoom').addEventListener('change', (e) => { at.zoom = +e.target.value; dessinerScene(); });

  brancherVersions();
  brancherScene();
  brancherToutes();
  dessinerScene();
  dessinerPanneau();
  dessinerEtat();
  dessinerExport();
  dessinerToutes();

  document.onkeydown = (ev) => {
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) refaire(); else annuler(); return; }
    if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); refaire(); return; }
    const e = elementSel();
    if (!e) return;
    if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); dupliquer(e.id); return; }
    if (ev.key === 'Escape') { at.sel = null; dessinerScene(); dessinerPanneau(); return; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      if (AJOUTABLES[e.type]) supprimer(e.id);
      else changer((g) => { g.mises[at.cle].elements.find((x) => x.id === e.id).visible = false; });
      return;
    }
    const pas = ev.shiftKey ? 0.1 : ev.altKey ? 2 : 0.5;
    const dir = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key];
    if (!dir) return;
    ev.preventDefault();
    changer((g) => {
      const x = g.mises[at.cle].elements.find((y) => y.id === e.id);
      x.x = r2(x.x + dir[0]); x.y = r2(x.y + dir[1]);
    }, { panneau: false });
    majChampsGeo();
  };
}

// --- L'impression vectorielle ------------------------------------------------------------------
// Une page faite pour l'imprimante : chaque carte à sa taille réelle, en
// millimètres CSS — qui sont de vrais millimètres sur le papier. « Enregistrer
// au format PDF » en fait un PDF où le texte reste du texte et les formes des
// formes, et où les illustrations entrent avec toute leur définition.

export function vueImpression(ctx) {
  C = ctx;
  const o = { mode: 'planches', perdu: 0, traits: true, retournement: 'colonnes', cle: null, ...C.LS.get('atelier.impression', {}) };
  const g = normaliserGabarit(design().gabarit || gabaritDeVersion(design().base || VERSION_DEFAUT));
  declarerPolices(g);
  const p = +o.perdu || 0;
  const W = 88 + 2 * p; const H = 63 + 2 * p;
  brancherGabarit(g, { set: C.store.cfg.set, hd: true, unite: 'mm' });
  let cartes = [];
  try {
    cartes = C.surLeModifie(() => cartesDuSet({ perdu: p, impression: true, completes: true, cfg: C.store.cfg }, o.cle));
  } finally { C.appliquerDesign(); }
  const carte = (html) => `<div class="imp-carte" style="width:${W}mm;height:${H}mm">${html || ''}</div>`;
  let pages = '';
  let taillePage;
  if (o.mode === 'cartes') {
    taillePage = `${W}mm ${H}mm`;
    pages = cartes.flatMap((c) => [c.recto, c.verso].filter(Boolean))
      .map((h) => `<section class="imp-page" style="width:${W}mm;height:${H}mm">${carte(h)}</section>`).join('');
  } else {
    taillePage = '297mm 210mm';
    const [L, Hp] = [297, 210];
    const cols = 3; const rangs = 3;
    const mx = (L - cols * W) / 2; const my = (Hp - rangs * H) / 2;
    const reperes = () => {
      if (!o.traits) return '';
      const t = [];
      const trait = (x, y, w, h) => t.push(`<i class="imp-trait" style="left:${r2(x)}mm;top:${r2(y)}mm;width:${r2(w)}mm;height:${r2(h)}mm"></i>`);
      for (let c = 0; c < cols; c++) {
        for (const x of [mx + c * W + p, mx + c * W + p + 88]) {
          if (p === 0) trait(x - 0.1, 0, 0.2, Hp);
          else if (my > 2.5) { trait(x - 0.1, Math.max(0, my - 7), 0.2, Math.min(6, my - 1)); trait(x - 0.1, Hp - my + 1, 0.2, Math.min(6, my - 1)); }
        }
      }
      for (let r = 0; r < rangs; r++) {
        for (const y of [my + r * H + p, my + r * H + p + 63]) {
          if (p === 0) trait(0, y - 0.1, L, 0.2);
          else if (mx > 2.5) { trait(Math.max(0, mx - 7), y - 0.1, Math.min(6, mx - 1), 0.2); trait(L - mx + 1, y - 0.1, Math.min(6, mx - 1), 0.2); }
        }
      }
      return t.join('');
    };
    const place = (i, miroir) => {
      const c0 = i % cols; const r0 = Math.floor(i / cols);
      const c = miroir && o.retournement === 'colonnes' ? cols - 1 - c0 : c0;
      const r = miroir && o.retournement === 'rangees' ? rangs - 1 - r0 : r0;
      return `left:${r2(mx + c * W)}mm;top:${r2(my + r * H)}mm`;
    };
    for (let i = 0; i < cartes.length; i += 9) {
      const lot = cartes.slice(i, i + 9);
      pages += `<section class="imp-page planche" style="width:297mm;height:210mm">${reperes()}${lot.map((c, k) => `<div class="imp-place" style="${place(k, false)}">${carte(c.recto)}</div>`).join('')}</section>`;
      if (lot.some((c) => c.verso)) {
        pages += `<section class="imp-page planche" style="width:297mm;height:210mm">${reperes()}${lot.map((c, k) => (c.verso ? `<div class="imp-place" style="${place(k, true)}">${carte(c.verso)}</div>` : '')).join('')}</section>`;
      }
    }
  }
  document.body.classList.add('mode-impression');
  C.app.innerHTML = `<style>@page{size:${taillePage};margin:0}</style>
    <div class="imp-barre">
      <b>Impression vectorielle</b> — ${cartes.length} carte${cartes.length > 1 ? 's' : ''},
      ${o.mode === 'planches' ? 'planches A4 recto-verso' : 'une carte par page'}${p ? `, fond perdu ${p} mm` : ''}.
      <button class="cta" id="imp-go">🖨 Imprimer / Enregistrer en PDF</button>
      <span class="aide">Dans la fenêtre d'impression : destination <b>Enregistrer au format PDF</b>, marges <b>Aucune</b>,
      <b>Graphiques d'arrière-plan</b> cochés, échelle <b>100 %</b>.</span>
      <button class="pill mini" data-go="#/atelier">← Atelier</button>
    </div>
    <div class="imp-pages">${pages}</div>`;
  C.app.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => { location.hash = el.dataset.go; }));
  C.app.querySelector('#imp-go').addEventListener('click', async () => {
    await pret();
    window.print();
  });
}

/** Tout est-il chargé — polices et illustrations ? On n'imprime pas avant. */
export async function pret() {
  try { await document.fonts.ready; } catch { /* rien */ }
  const urls = new Set();
  document.querySelectorAll('.imp-pages [style*="background-image"]').forEach((el) => {
    const m = el.getAttribute('style').match(/url\(['"]?([^'")]+)['"]?\)/);
    if (m && !m[1].startsWith('data:')) urls.add(m[1]);
  });
  document.querySelectorAll('.imp-pages img').forEach((im) => urls.add(im.getAttribute('src')));
  await Promise.all([...urls].map((u) => new Promise((ok) => {
    const im = new Image(); im.onload = ok; im.onerror = ok; im.src = u;
  })));
  try { await document.fonts.ready; } catch { /* rien */ }
}
