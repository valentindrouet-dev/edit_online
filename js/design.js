// ---------------------------------------------------------------------------
// EDIT — le dessin d'une carte d'après son GABARIT
// ---------------------------------------------------------------------------
// Un gabarit (js/gabarits.js) dit où vont les choses ; ce module les pose. Il
// rend l'INTÉRIEUR d'une moitié de carte : un calque par élément, placé en
// millimètres. L'unité est le millimètre lui-même — la police de la carte vaut
// 1 mm, et tout se mesure en em —, si bien que la même carte se dessine à la
// taille d'une vignette, d'une table de jeu ou d'une feuille imprimée sans
// qu'un seul nombre change.
//
// Ce qui est sur la carte vient du Matériel, comme partout : minutage, icônes,
// pouvoir, illustration. Le bandeau du pouvoir est celui que le site sait déjà
// composer ; le gabarit ne lui donne que sa place.

import { tcTexte, FORMATS, objsDe, transformeCadre, TC_VIDE, TC_PREMIER, TC_DERNIER } from './data.js';
import { elIcon } from './icons.js';
import { bandeauGabarit, reglerDessinGabarit } from './cards.js';
import {
  HAUTEUR, cleMise, largeurMise, POLICES, POLICES_SYSTEME, policeLocale,
} from './gabarits.js';
import { urlVisuel } from './visuels.js';

const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const n2 = (v) => Math.round(v * 1000) / 1000;

/** Ce que le libellé « {cadrage} » écrit pour ce plan. */
export function nomCadrage(h) {
  if (!h || h.format === 'DOS') return '';
  if (h.depart || h.format === 'DEP') return 'Plan de départ';
  if (h.transition) return 'Raccord';
  return (FORMATS[h.format] || FORMATS.PM).label;
}

/**
 * L'illustration à montrer. Une impression demande la version HAUTE
 * DÉFINITION quand elle existe : les illustrations nues du Set 3.1 en ont une,
 * rangée à côté de celle de l'écran — `nu/` pour l'écran, `hd/` pour le papier.
 */
function imageDe(h, opts) {
  const u = urlVisuel(h.image);
  return u && opts.hd ? u.replace('/nu/', '/hd/') : u;
}

const ANCRAGES = {
  haut: 'center top', centre: 'center center', bas: 'center bottom',
  'haut-gauche': 'left top', 'haut-droite': 'right top',
};

/** La police d'un texte, avec un repli si elle manque. */
const familleCss = (p) => `'${String(p || 'Inter').replace(/'/g, '')}', 'Inter', 'Segoe UI', Arial, sans-serif`;

/** Ce qu'un élément écrit — police, corps, couleur, alignement. */
function styleTexte(e, couleur) {
  const al = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' }[e.alignement || 'centre'];
  return [
    `font-family:${familleCss(e.police)}`,
    `font-weight:${e.graisse || 400}`,
    `font-style:${e.italique ? 'italic' : 'normal'}`,
    `font-size:${n2(e.taille || 3)}em`,
    `color:${couleur || e.couleur || '#ffffff'}`,
    `justify-content:${al}`,
    `text-align:${{ gauche: 'left', centre: 'center', droite: 'right' }[e.alignement || 'centre']}`,
    e.majuscules ? 'text-transform:uppercase' : '',
    e.interlettre ? `letter-spacing:${n2(e.interlettre)}em` : '',
    e.ombre ? 'text-shadow:0 .06em .16em rgba(0,0,0,.6)' : '',
  ].filter(Boolean).join(';');
}

/** Le fond, le bord, l'arrondi d'une boîte. */
function styleBoite(e) {
  return [
    e.fond ? `background-color:${e.fond}` : '',
    e.bord ? `border:${n2(e.bord)}em solid ${e.bordCouleur || '#000'}` : '',
    e.rayon ? `border-radius:${n2(e.rayon)}em` : '',
    e.opacite !== undefined && e.opacite < 100 ? `opacity:${e.opacite / 100}` : '',
    e.ombreBoite ? 'box-shadow:0 .3em .8em rgba(0,0,0,.45)' : '',
  ].filter(Boolean).join(';');
}

/** Ce qu'un texte libre cite de la carte. */
function remplir(t, h, g, opts) {
  return String(t || '')
    .replace(/\{cadrage\}/g, nomCadrage(h))
    .replace(/\{num\}/g, h.num ?? '')
    .replace(/\{titre\}/g, h.titre || '')
    .replace(/\{minutage\}/g, h.format === 'DOS' ? '' : tcTexte(h.tc))
    .replace(/\{set\}/g, opts.set || '')
    .replace(/\{version\}/g, `${g.nom || ''}${opts.version ? ` ${opts.version}` : ''}`);
}

/** Le contenu d'un élément, selon son type. */
function contenu(e, h, g, opts, w, hh) {
  switch (e.type) {
    case 'illustration': {
      const url = imageDe(h, opts);
      if (!url) return '<div class="g-illus vide"></div>';
      const pos = h.cadre ? `${h.cadre.x}% ${h.cadre.y}%` : (ANCRAGES[e.ancrage] || ANCRAGES.haut);
      const tr = transformeCadre(h.cadre, h.miroir);
      return `<div class="g-illus" style="background-image:url('${url}');background-position:${pos};${
        tr ? `transform:${tr};` : ''}"></div>`;
    }
    case 'minutage': {
      if (h.format === 'DOS') return '';
      const special = [TC_VIDE, TC_PREMIER, TC_DERNIER].includes(h.tc);
      const c = special ? (e.couleurSpeciale || e.couleur) : e.couleur;
      const lueur = e.lueur ? `;text-shadow:0 0 .3em ${c}, 0 0 .08em ${c}` : '';
      // Un afficheur à segments laisse voir ses segments éteints : « 88:88 »
      // en sourdine sous les chiffres, comme sur les cartes imprimées.
      const segments = /DSEG/.test(e.police || '') && e.fantome !== false;
      return `<div class="g-texte g-tc" style="${styleTexte(e, c)}${lueur}">${
        segments ? `<span class="g-tc-fantome" style="color:${c}">88:88</span>` : ''}<span>${tcTexte(h.tc)}</span></div>`;
    }
    case 'icones': {
      const ic = [...(h.el || []), ...(h.mort ? ['MORT'] : [])];
      if (!ic.length) return '';
      const al = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' }[e.alignement || 'gauche'];
      const esp = n2(e.espacement ?? 1);
      return `<div class="g-languette-boite" style="justify-content:${al}">
        <div class="g-languette ${e.texture === 'papier' ? 'g-tex-papier' : ''} ${e.dechire ? 'g-dechire' : ''}"
          style="${styleBoite(e)};gap:${esp}em;padding:0 ${n2(esp + (e.dechire ? 0.6 : 0))}em 0 ${esp}em;${
  e.ajuste === false ? 'width:100%;' : ''}--ti:${e.tailleIcones || 76}%">${ic.map((x) => elIcon(x)).join('')}</div></div>`;
    }
    case 'bandeau': {
      // `quel` : un bandeau peut ne montrer que le premier pouvoir, ou que le
      // second — c'est ainsi qu'un Raccord pose son second pouvoir dans un
      // onglet au-dessus du bandeau, comme sur les cartes imprimées.
      const tous = opts.objs || objsDe(h);
      const objs = e.quel === 'premier' ? tous.slice(0, 1) : e.quel === 'second' ? tous.slice(1, 2) : tous;
      if (!objs.length || h.format === 'DOS') return '';
      // Le bandeau du site garde ses proportions : une bande de 2,58 em de haut
      // pour un pouvoir, 3,73 pour deux. On en tire la taille de son em — et
      // donc la place qu'il a en largeur.
      const corps = (hh / (objs.length > 1 ? 3.73 : 2.58)) * (e.echelle || 1);
      const dispo = Math.max(2, (w / corps) * 0.96);
      const f = h.format === 'DEP' ? 'PL' : h.format;
      return `<div class="g-bande" style="font-size:${n2(corps)}em">${bandeauGabarit(objs, f, opts.cfg, dispo)}</div>`;
    }
    case 'texte': {
      const t = remplir(e.texte, h, g, opts);
      if (!t.trim()) return '';
      return `<div class="g-texte g-libre" style="${styleTexte(e)}">${echapper(t).replace(/\n/g, '<br>')}</div>`;
    }
    case 'image': {
      const url = urlVisuel(e.src || '');
      return url ? `<div class="g-img" style="background-image:url('${url}');background-size:${
        e.ajustement === 'cover' ? 'cover' : 'contain'}"></div>` : '';
    }
    default:
      return '';
  }
}

/**
 * L'intérieur d'une moitié de carte, dessiné d'après le gabarit `g`.
 * Rend `{ w, h, html }` : la largeur et la hauteur en millimètres — fond perdu
 * compris —, et le HTML.
 *
 * `opts.perduCotes` : le fond perdu de chaque côté, en mm. Ce qui touche un bord
 * de la carte s'y prolonge — c'est ce que l'imprimeur coupera —, et le fond de
 * la carte l'emplit.
 * `opts.unite` : 'mm' pour une page imprimée, où 1 mm CSS est un vrai
 * millimètre ; sinon `opts.mmPx`, ou la largeur de la moitié elle-même.
 */
export function rendreMoitie(h, g, opts = {}) {
  if (!g || !g.mises) return null;
  const cle = cleMise(h);
  const mise = g.mises[cle];
  if (!mise) return null;
  const W = largeurMise(cle);
  const H = HAUTEUR;
  const pc = opts.perduCotes || { g: 0, d: 0, h: 0, b: 0 };
  const TW = W + pc.g + pc.d;
  const TH = H + pc.h + pc.b;
  const eps = 0.05;
  const els = mise.elements.filter((e) => e.visible !== false).map((e) => {
    let x = e.x + pc.g; let y = e.y + pc.h; let w = e.w; let hh = e.h;
    if (e.x <= eps) { x -= pc.g; w += pc.g; }
    if (e.x + e.w >= W - eps) w += pc.d;
    if (e.y <= eps) { y -= pc.h; hh += pc.h; }
    if (e.y + e.h >= H - eps) hh += pc.b;
    const c = contenu(e, h, g, opts, w, hh);
    if (!c && e.type !== 'forme') return '';
    const boite = e.type === 'icones' ? '' : styleBoite(e);
    const tex = (e.type !== 'icones' && e.texture === 'papier' ? ' g-tex-papier' : '')
      + (e.type !== 'icones' && e.dechire ? ' g-dechire' : '');
    return `<div class="g-el g-${e.type}${tex}" data-el="${echapper(e.id)}" style="left:${n2(x)}em;top:${n2(y)}em;width:${
      n2(w)}em;height:${n2(hh)}em;${boite}">${c}</div>`;
  }).join('');
  const unite = opts.unite === 'mm' ? 'font-size:1mm;' : opts.mmPx ? `font-size:${opts.mmPx}px;` : '';
  return {
    w: n2(TW),
    h: n2(TH),
    html: `<div class="g-carte" style="${unite}--gw:${n2(TW)};background-color:${mise.carte.fond || '#000'}">${els}</div>`,
  };
}

// --- Le gabarit en vigueur ----------------------------------------------------

let enVigueur = null;

/**
 * Branche un gabarit sur tout le dessin des cartes du site — galeries, table
 * de jeu, exports —, ou le débranche (`null`). Les polices dont il se sert
 * sont déclarées au passage.
 */
export function brancherGabarit(g, opts = {}) {
  enVigueur = g || null;
  if (!g) { reglerDessinGabarit(null); return; }
  declarerPolices(g);
  reglerDessinGabarit((h, o) => rendreMoitie(h, g, { ...opts, ...o }), g.coins ?? 3);
}

export const gabaritEnVigueur = () => enVigueur;

// --- Les polices ------------------------------------------------------------------

/** Les familles dont un gabarit se sert. */
export function famillesDe(g) {
  const s = new Set();
  for (const m of Object.values((g && g.mises) || {})) {
    for (const e of m.elements || []) if (e.police) s.add(e.police);
  }
  return [...s];
}

/** Les @font-face des polices du site — `base` préfixe les chemins. */
export function facesPolices(familles, base = '') {
  const out = [];
  for (const p of POLICES) {
    if (familles && !familles.includes(p.famille)) continue;
    for (const [w, st] of p.fichiers) {
      out.push(`@font-face{font-family:'${p.famille}';src:url('${base}assets/polices/${p.dossier}/${w}-${st}.woff2') format('woff2');`
        + `font-weight:${w};font-style:${st};font-display:swap}`);
    }
  }
  return out.join('\n');
}

const googleDemandees = new Set();

/**
 * Déclare les polices d'un gabarit dans la page. Celles du site se déclarent
 * toutes d'un coup — une @font-face ne télécharge rien tant qu'aucun texte ne
 * s'en sert. Une police qui n'est ni au site ni à l'ordinateur est demandée à
 * Google Fonts : on peut ainsi essayer n'importe laquelle, et l'auteur la fera
 * entrer au site si elle reste.
 */
export function declarerPolices(g) {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('polices-site')) {
    const st = document.createElement('style');
    st.id = 'polices-site';
    st.textContent = facesPolices(null);
    document.head.appendChild(st);
  }
  for (const f of famillesDe(g)) {
    if (policeLocale(f) || POLICES_SYSTEME.includes(f) || googleDemandees.has(f)) continue;
    googleDemandees.add(f);
    for (const w of [400, 700, 900]) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${w}&display=swap`;
      document.head.appendChild(l);
    }
  }
}

/** Une ressource en data: — seul format qu'un SVG peint accepte. */
async function enData(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} sur ${url}`);
  const b = await r.blob();
  return new Promise((ok, ko) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result);
    fr.onerror = () => ko(fr.error);
    fr.readAsDataURL(b);
  });
}

/**
 * Les polices d'un gabarit EMBARQUÉES, pour l'export : une carte peinte dans un
 * SVG ne va rien chercher sur le réseau, il faut que tout voyage avec elle.
 */
export async function cssPolicesEmbarquees(g) {
  const familles = famillesDe(g);
  const regles = [];
  for (const p of POLICES) {
    if (!familles.includes(p.famille)) continue;
    for (const [w, st] of p.fichiers) {
      try {
        // eslint-disable-next-line no-await-in-loop -- quelques fichiers, une fois par export.
        const d = await enData(`assets/polices/${p.dossier}/${w}-${st}.woff2`);
        regles.push(`@font-face{font-family:'${p.famille}';src:url('${d}') format('woff2');font-weight:${w};font-style:${st}}`);
      } catch { /* la police manque : le repli prendra le relais */ }
    }
  }
  for (const f of familles) {
    if (policeLocale(f) || POLICES_SYSTEME.includes(f)) continue;
    for (const w of [400, 700, 900]) {
      try {
        // eslint-disable-next-line no-await-in-loop -- idem.
        let css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${w}`).then((r) => (r.ok ? r.text() : ''));
        const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
        for (const u of urls) {
          // eslint-disable-next-line no-await-in-loop -- idem.
          css = css.replace(u, await enData(u));
        }
        regles.push(css);
      } catch { /* Google injoignable : repli */ }
    }
  }
  return regles.join('\n');
}
