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
import { elIcon, numIcon } from './icons.js';
import {
  bandeauGabarit, reglerDessinGabarit, tagSeq, tagCadrage, croixNon, avanceRapide,
} from './cards.js';
import {
  hauteurDe, formatDe, cleMise, largeurMise, POLICES, POLICES_SYSTEME, policeLocale,
  ICONES_JEU, nomIcone, signaturePouvoir,
} from './gabarits.js';
import { urlVisuel, urlVisuelHD, estVisuelApporte } from './visuels.js';

const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const n2 = (v) => Math.round(v * 1000) / 1000;

// --- Les icônes de l'auteur, et les jetons ------------------------------------------

/** L'image d'une icône importée sous ce nom, s'il y en a une. */
function urlIcone(nom, g, opts) {
  const e = ((g && g.icones) || []).find((i) => i.nom === nom);
  if (!e) return '';
  return opts.hd ? urlVisuelHD(e.src) : urlVisuel(e.src);
}

/** Une icône du jeu — ou celle que l'auteur a importée sous son nom. */
function iconeJeu(id, g, opts) {
  const u = urlIcone(id.toLowerCase(), g, opts);
  return u ? `<img class="pastille g-ic" src="${u}" alt="${id}">` : elIcon(id);
}

/**
 * Les icônes d'un bandeau composé par le site, remplacées par celles de
 * l'auteur : une icône du jeu par celle qui porte son nom, une pastille de
 * valeur par l'icône nommée de son chiffre — « 2 ».
 */
function remplacerIcones(html, g, opts) {
  if (!g || !(g.icones || []).length) return html;
  let out = html;
  for (const [nom, id] of Object.entries(ICONES_JEU)) {
    const u = urlIcone(nom, g, opts);
    if (u) out = out.split(`src="assets/icones/${id}.webp"`).join(`src="${u}"`);
  }
  return out.replace(/<svg class="pastille-num[^"]*"[^>]*aria-label="(\d+)">[\s\S]*?<\/svg>/g, (tout, n) => {
    const u = urlIcone(n, g, opts);
    return u ? `<img class="pastille-num g-ic" src="${u}" alt="${n}">` : tout;
  });
}

/**
 * Un JETON — ce qu'on écrit entre crochets dans un texte ou un pouvoir —, en
 * HTML, avec ce qu'il réclame de place, en em du bandeau.
 */
function jeton(brut, g, opts) {
  const r = brut.trim();
  // Une icône de l'auteur passe avant tout : nommée « 2 », elle EST la valeur 2.
  const perso = /^non:/i.test(r) ? '' : urlIcone(nomIcone(r), g, opts);
  if (perso) return { html: `<img class="pastille g-ic" src="${perso}" alt="${echapper(r)}">`, l: 2.11 };
  if (/^[+\-−]?\d+$/.test(r)) return { html: numIcon(parseInt(r.replace('−', '-'), 10)), l: 2.11 };
  if (r === '>' || r === '▶') return { html: '<span class="fleche-pos">▶</span>', l: 1.1 };
  if (r === '<' || r === '◀') return { html: '<span class="fleche-pos">◀</span>', l: 1.1 };
  if (r === '>>') return { html: avanceRapide(), l: 1.9 };
  if (r === '<<') return { html: avanceRapide(true), l: 1.9 };
  if (r.toLowerCase() === 'x' || r === '×') return { html: `<span class="x${opts.signe === 'x' ? ' lettre' : ''}">${opts.signe === 'x' ? 'x' : '×'}</span>`, l: 0.9 };
  if (/^non:/i.test(r)) {
    const j = jeton(r.slice(4), g, opts);
    return { html: `<span class="barre">${j.html}${croixNon()}</span>`, l: j.l };
  }
  const k = nomIcone(r);
  const tag = (cls, mot) => ({ html: `<span class="tag ${cls}">${mot}</span>`, l: 0.62 * (0.9 + 0.62 * mot.length) });
  if (k === 'seq' || k === 'sequence') return { html: tagSeq(false), l: 0.62 * (0.9 + 0.62 * 8) };
  if (['pl', 'pm', 'gp', 'dep'].includes(k)) {
    const nom = { pl: 'Plan Large', pm: 'Plan Moyen', gp: 'Gros Plan', dep: 'Plan de départ' }[k];
    return { html: tagCadrage(k.toUpperCase(), false), l: 0.62 * (0.9 + 0.62 * Math.ceil(nom.length / 2)) };
  }
  if (k === 'raccord') return tag('tag-gris', 'Raccord');
  if (k === 'plan') return tag('tag-blanc', 'Plan');
  if (k === 'carte') return tag('tag-blanc', 'Carte');
  if (k === 'icone') return tag('tag-blanc', 'Icône');
  if (k === 'timecode' || k === 'ordre') return tag('tag-chrono', 'Timecode');
  const u = urlIcone(k, g, opts);
  if (u) return { html: `<img class="pastille g-ic" src="${u}" alt="${echapper(k)}">`, l: 2.11 };
  if (ICONES_JEU[k]) return { html: elIcon(ICONES_JEU[k]), l: 2.11 };
  return { html: `<span class="g-inconnu" title="Aucune icône ne porte ce nom">[${echapper(r)}]</span>`, l: 0.6 * (r.length + 2) };
}

/**
 * Un texte à jetons, en pièces alignées sur la ligne : les mots, et entre eux
 * les icônes, les valeurs, les cartouches. Rend le HTML et la largeur qu'il
 * réclame, en em.
 */
export function phraseJetons(texte, g, opts = {}) {
  const pieces = [];
  let besoin = 0;
  for (const bout of String(texte || '').split(/(\[[^\]]+\]|\n)/)) {
    if (!bout) continue;
    if (bout === '\n') { pieces.push('<i class="g-br"></i>'); continue; }
    if (bout.startsWith('[') && bout.endsWith(']')) {
      const j = jeton(bout.slice(1, -1), g, opts);
      pieces.push(j.html); besoin += j.l + 0.24;
      continue;
    }
    for (const mot of bout.split(/\s+/).filter(Boolean)) {
      pieces.push(`<span class="mot-libre">${echapper(mot)}</span>`);
      besoin += 0.6 * mot.length + 0.24;
    }
  }
  return { html: pieces.join(''), besoin };
}

/**
 * Le CERNE — le contour noir des cartes imprimées —, d'une même épaisseur, en
 * millimètres, autour des mots comme des icônes : `--g-t` la porte, et la
 * feuille de style la déclare comme une longueur, si bien qu'elle se calcule
 * là où on la pose et ne varie plus d'un mot à l'autre.
 *   — autour des lettres, une couronne d'ombres nettes : des coins arrondis,
 *     comme le contour extérieur d'un logiciel de dessin, et du texte qui
 *     reste du texte à l'impression ;
 *   — autour d'une icône, des ombres qui suivent sa forme, transparence
 *     comprise. Le navigateur les imprime à 300 dpi.
 */
function cerne(couleur) {
  const c = couleur || '#000000';
  const t = (k) => `calc(var(--g-t) * ${n2(k)})`;
  const ring = [];
  for (const [n, k, dec] of [[16, 1, 0], [8, 0.5, 0.5]]) {
    for (let i = 0; i < n; i++) {
      const a = ((i + dec) / n) * 2 * Math.PI;
      ring.push(`${t(k * Math.cos(a))} ${t(k * Math.sin(a))} 0 ${c}`);
    }
  }
  // Huit ombres enchaînées tracent un octogone régulier autour de la forme.
  const r = 1 / (1 + Math.SQRT2); const d = r / Math.SQRT2;
  const filtre = [[r, 0], [-r, 0], [0, r], [0, -r], [d, d], [-d, -d], [d, -d], [-d, d]]
    .map(([x, y]) => `drop-shadow(${t(x)} ${t(y)} 0 ${c})`).join(' ');
  return { ring: ring.join(','), filtre };
}

/** Les variables du cerne d'un élément, où 1 em vaut `unEm` millimètres. */
function varsCerne(e, unEm) {
  if (!(e.trait > 0)) return '';
  const c = cerne(e.contourCouleur);
  return `--g-t:${n2(e.trait / unEm)}em;--g-ring:${c.ring};--g-cerne:${c.filtre}`;
}

/** La typographie d'un bandeau : sa police, sa graisse, la couleur et le cerne de ses mots. */
function typoBande(e, corps) {
  return [
    e.police ? `font-family:${familleCss(e.police)}` : '',
    e.graisse ? `--g-graisse:${e.graisse}` : '',
    e.italique ? 'font-style:italic' : '',
    e.couleur ? `--g-encre:${e.couleur}` : '',
    varsCerne(e, corps),
  ].filter(Boolean).join(';');
}

/** Le signe de multiplication du gabarit : la lettre « x » des cartes imprimées, ou « × ». */
const signeX = (html, signe) => (signe === 'x' ? html.split('<span class="x">×</span>').join('<span class="x lettre">x</span>') : html);

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
  if (opts.hd && estVisuelApporte(h.image)) return urlVisuelHD(h.image);
  const u = urlVisuel(h.image);
  return u && opts.hd ? u.replace('/nu/', '/hd/') : u;
}

const ANCRAGES = {
  haut: 'center top', centre: 'center center', bas: 'center bottom',
  'haut-gauche': 'left top', 'haut-droite': 'right top',
};

/** La police d'un texte, avec un repli si elle manque. */
// Verdana n'est pas une police libre : elle vient de l'ordinateur. Là où elle
// manque — l'export maître, sous Linux —, DejaVu Sans, de la même famille de
// dessin, prend sa place.
const familleCss = (p) => `'${String(p || 'Inter').replace(/'/g, '')}', ${
  p === 'Verdana' ? "'DejaVu Sans', " : ''}'Inter', 'Segoe UI', Arial, sans-serif`;

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
    varsCerne(e, e.taille || 3),
    e.trait > 0 || e.ombre ? `text-shadow:${[e.trait > 0 ? 'var(--g-ring)' : '',
      e.ombre ? '0 .06em .16em rgba(0,0,0,.6)' : ''].filter(Boolean).join(',')}` : '',
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
        <div class="g-languette ${e.texture === 'papier' ? 'g-tex-papier' : ''} ${e.dechire ? 'g-dechire' : ''} ${e.trait > 0 ? 'g-contour' : ''}"
          style="${styleBoite(e)};${varsCerne(e, 1)};gap:${esp}em;padding:0 ${n2(esp + (e.dechire ? 0.6 : 0))}em 0 ${esp}em;${
  e.ajuste === false ? 'width:100%;' : ''}--ti:${e.tailleIcones || 76}%">${ic.map((x) => iconeJeu(x, g, opts)).join('')}</div></div>`;
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
      // Un pouvoir peut avoir son texte ÉCRIT par l'auteur — mots, icônes,
      // valeurs, en jetons. Il vaut pour tous les plans qui portent exactement
      // ce pouvoir. Sinon, le site le compose.
      const textes = g.textes || {};
      const ecrits = objs.map((o) => textes[signaturePouvoir(o)]);
      const oj = { ...opts, signe: e.signe };
      const auto = (l) => signeX(remplacerIcones(bandeauGabarit(l, f, opts.cfg, dispo), g, opts), e.signe);
      const rang = (o, i) => {
        if (ecrits[i] == null) return auto([o]);
        const p = phraseJetons(ecrits[i], g, oj);
        const ec = Math.max(0.35, Math.min(1.2, Math.round((dispo / Math.max(1, p.besoin * 1.1)) * 100) / 100));
        return `<div class="bandeau g-phrase-bande" style="--ec:${ec}">${p.html}</div>`;
      };
      const typo = typoBande(e, corps);
      const cerne = e.trait > 0 ? 'g-contour' : '';
      if (ecrits.every((t) => t == null)) {
        return `<div class="g-bande ${cerne}" style="font-size:${n2(corps)}em;${typo}">${auto(objs)}</div>`;
      }
      return `<div class="g-bande ${objs.length > 1 ? 'g-deux' : ''} ${cerne}" style="font-size:${n2(corps)}em;${typo}">${
        objs.map((o, i) => `<div class="g-rang">${rang(o, i)}</div>`).join('')}</div>`;
    }
    case 'texte': {
      const t = remplir(e.texte, h, g, opts);
      if (!t.trim()) return '';
      // Des jetons dans le texte : les icônes s'y alignent sur la ligne.
      if (/\[[^\]]+\]/.test(t)) {
        return `<div class="g-texte g-libre g-phrase ${e.trait > 0 ? 'g-contour' : ''}" style="${styleTexte(e)};--gi:${e.tailleIcones || 1.3}em">${
          phraseJetons(t, g, { ...opts, signe: e.signe }).html}</div>`;
      }
      return `<div class="g-texte g-libre" style="${styleTexte(e)}">${echapper(t).replace(/\n/g, '<br>')}</div>`;
    }
    case 'image': {
      const url = opts.hd ? urlVisuelHD(e.src || '') : urlVisuel(e.src || '');
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
  const W = largeurMise(cle, g);
  const H = hauteurDe(g);
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
    html: `<div class="g-carte" style="${unite}--gw:${n2(TW)};background-color:${mise.carte.fond || '#000'}">${
      fondDeCarte(mise.carte, W, H, pc, opts)}${els}</div>`,
  };
}

/**
 * Le FOND DE CARTE : l'image de l'auteur, sous tous les calques. Elle couvre la
 * carte à la coupe — et, si elle a été faite avec son fond perdu, ce fond perdu
 * aussi : `perduInclus` mm de chaque côté, que l'écran ne montre pas et que
 * l'impression emploie. L'image est servie telle qu'elle est entrée, sans
 * copie d'écran : c'est le fichier même.
 */
const AJUSTEMENTS = { remplit: 'cover', entier: 'contain', etire: '100% 100%' };
const POSITIONS = {
  centre: 'center', gauche: 'left center', droite: 'right center', haut: 'center top', bas: 'center bottom',
};
function fondDeCarte(c, W, H, pc, opts) {
  if (!c || !c.image) return '';
  const url = opts.hd ? urlVisuelHD(c.image) : urlVisuel(c.image);
  if (!url) return '';
  const n = Math.max(0, Number(c.perduInclus) || 0);
  return `<div class="g-fond" style="left:${n2(pc.g - n)}em;top:${n2(pc.h - n)}em;width:${n2(W + 2 * n)}em;height:${
    n2(H + 2 * n)}em;background-image:url('${url}');background-size:${AJUSTEMENTS[c.ajuste] || 'cover'};background-position:${
    POSITIONS[c.position] || 'center'}"></div>`;
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
  reglerDessinGabarit((h, o) => rendreMoitie(h, g, { ...opts, ...o }), g.coins ?? 3, formatDe(g));
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
