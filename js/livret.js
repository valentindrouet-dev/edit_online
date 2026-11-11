// ---------------------------------------------------------------------------
// EDIT — la mise en page des règles, et l'aide de jeu
// ---------------------------------------------------------------------------
// Les règles (`regles.js`) et l'aide de jeu se lisent comme un livret : un
// ruban par section, des étapes numérotées, des encarts pour les précisions.
// Ce module porte ces briques, le LEXIQUE des pouvoirs — commun aux deux
// pages —, et l'aide de jeu elle-même : la fiche qu'on garde à côté du banc.
//
// Tout ce qui se compte vient du MODÈLE et non d'un chiffre recopié : le nombre
// de cartes, les pouvoirs, leurs valeurs. Une carte retouchée dans le Matériel,
// une variable changée, et les deux pages suivent.
//
// Les pouvoirs se montrent tels qu'ils sont IMPRIMÉS : la bande du bas de la
// vraie carte, découpée dans son image. Un plan retouché n'a plus d'image qui
// dise ce qu'il vaut ; son pouvoir est alors redessiné par le site.

import {
  ELEMENTS, ELEMENT_IDS, objsDe, objPortee, cartesDeLaBoite, recenserBoite, tcTexte, TC_VIDE, TC_PREMIER,
  TC_DERNIER,
} from './data.js';
import { elIcon } from './icons.js';
import { objHTML } from './cards.js';

// --- Les briques de mise en page -------------------------------------------

/** Une section : le titre sur son ruban, puis le corps. */
export const section = (titre, corps, cls = '') => `<section class="lv-section ${cls}">
  <h2 class="lv-titre"><span>${titre}</span></h2>
  ${corps}
</section>`;

/** Une étape numérotée : la pastille, le titre, ce qu'on fait. */
export const etape = (n, titre, corps) => `<div class="lv-etape">
  <span class="lv-num">${n}</span>
  <div><h3>${titre}</h3><p>${corps}</p></div>
</div>`;

/** Un encart : un cas particulier, une précision. */
export const encart = (titre, corps, cls = '') => `<aside class="lv-encart ${cls}">
  ${titre ? `<h4>${titre}</h4>` : ''}${corps}
</aside>`;

/**
 * Une ligne de lexique : le symbole à gauche, ce qu'il veut dire à droite — et,
 * tout à droite, **combien de cartes de la boîte** le portent.
 */
export const ligne = (symbole, texte, cls = '', n) => `<div class="lv-ligne ${cls}">
  <div class="lv-sym">${symbole}</div><div class="lv-txt">${texte}</div>
  ${n === undefined ? '' : `<div class="lv-n${n ? '' : ' zero'}"
    title="${n} carte${n > 1 ? 's' : ''} de la boîte ${n > 1 ? 'portent' : 'porte'} ceci"><b>${n}</b></div>`}
</div>`;

/** Le petit dos de carte qui coiffe la colonne des comptes. */
const ENTETE_CARTES = `<div class="lv-entete">
  <div class="lv-n" title="Combien de cartes de la boîte">
    <svg viewBox="0 0 20 24" width="15" height="18" aria-label="cartes" role="img">
      <rect x="4.5" y="1.5" width="14" height="19" rx="2.5" fill="none"
        stroke="currentColor" stroke-width="1.6" opacity=".45"/>
      <rect x="1.5" y="3.5" width="14" height="19" rx="2.5" fill="#fff"
        stroke="currentColor" stroke-width="1.6"/>
    </svg>
  </div>
</div>`;

// --- Les vraies cartes --------------------------------------------------------

/** Le fichier d'une carte de la boîte, par son nom imprimé : « L5 », « GP07 ». */
export const fichierCarte = (nom) => `assets/s41/${nom}.webp`;

/** Le nom imprimé d'un plan de la boîte — celui de son image. */
export const nomCarte = (plan) => (plan.format === 'GP'
  ? `GP${String(plan.numOrigine).padStart(2, '0')}` : `L${plan.numOrigine}`);

const estLarge = (nom) => nom.startsWith('L');

/** Une vraie carte, en vignette : un Plan Large entier, ou un Gros Plan. */
export const vignette = (nom, cls = '') => `<img class="lv-carte ${estLarge(nom) ? 'pl' : 'gp'} ${cls}"
  src="${fichierCarte(nom)}" alt="${nom}" title="${nom}" loading="lazy" decoding="async" draggable="false">`;

/** La bande du pouvoir d'une vraie carte : le bas de son image. */
export const bande = (nom) => `<span class="lv-bande ${estLarge(nom) ? 'pl' : 'gp'}" title="${nom}">
  <img src="${fichierCarte(nom)}" alt="Le pouvoir de ${nom}" loading="lazy" decoding="async" draggable="false"></span>`;

/** Un minutage, écrit comme sur l'afficheur des cartes. */
export const afficheur = (tc) => `<span class="lv-tc${tc === TC_VIDE ? ' vide' : ''}">${tcTexte(tc)}</span>`;

// --- Les mots ------------------------------------------------------------------

const pts = (n) => `${n} point${Math.abs(n) > 1 ? 's' : ''}`;
const FEMININES = ['HEROINE', 'ARME'];

/** Une icône et son nom, dans une phrase. */
const icone = (e) => (ELEMENTS[e] ? `${elIcon(e, 20)} ${ELEMENTS[e].label}` : e);

/** Ce qu'un pouvoir compte, au singulier, au pluriel, et à la négative. */
function mots(cible) {
  if (ELEMENTS[cible]) {
    const f = FEMININES.includes(cible);
    return { un: icone(cible), des: `${icone(cible)}s`, aucun: `aucun${f ? 'e' : ''} ${icone(cible)}`,
      une: `${f ? 'une' : 'un'} ${icone(cible)}` };
  }
  switch (cible) {
    case 'MORT': return { un: 'plan de mort', des: 'plans de mort', aucun: 'aucun plan de mort', une: 'un plan de mort' };
    case 'RACCORD': return { un: 'Raccord', des: 'Raccords', aucun: 'aucun Raccord', une: 'un Raccord' };
    case 'PLAN': return { un: 'plan', des: 'plans', aucun: 'aucun plan', une: 'un plan' };
    case 'CARTE': return { un: 'carte', des: 'cartes', aucun: 'aucune carte', une: 'une carte' };
    case 'TC_VIDE': return { un: 'carte sans minutage', des: 'cartes sans minutage',
      aucun: `aucune carte sans minutage (${afficheur(TC_VIDE)})`, une: 'une carte sans minutage' };
    case 'ICONE': return { un: 'icône', des: 'icônes', aucun: 'aucune icône', une: 'une icône' };
    default: return { un: String(cible), des: String(cible), aucun: `aucun ${cible}`, une: String(cible) };
  }
}

/** Où un pouvoir regarde, dit en toutes lettres. */
const OU = {
  MONTAGE: 'dans tout votre montage',
  SEQUENCE: 'dans sa séquence',
  APRES: 'de ce plan au bout droit de sa séquence',
  AVANT: 'du début de sa séquence à ce plan',
  SUITE: 'de ce plan à la fin du montage',
  AMONT: 'du début du montage à ce plan',
};
const ou = (pt) => OU[pt] || OU.MONTAGE;

const cibleDe = (o) => o.cible || o.el;
const DANS_L_ORDRE = 'de gauche à droite, ils ne reculent jamais. Les cartes sans minutage n’y changent rien';

// --- Le lexique des pouvoirs ------------------------------------------------
// Une entrée par FAÇON de compter présente sur les cartes. `si` reconnaît le
// pouvoir, `pref` désigne l'exemple le plus parlant quand plusieurs cartes le
// portent, `dit` l'explique avec les valeurs de l'exemple. Une entrée qu'aucune
// carte de la boîte ne porte ne s'affiche pas.

const COMPTENT = [
  { si: (o) => o.kind === 'ELEMENT', pref: (o, pt) => pt === 'MONTAGE',
    dit: (o, pt, c) => `<b>${pts(o.n)} par ${icone(o.el)}</b> ${ou(pt)}. ${c.elementParIcone === false
      ? 'On compte les plans qui la montrent.'
      : 'Chaque icône compte : un plan qui la montre deux fois compte deux fois.'}` },
  { si: (o) => o.kind === 'PAIRE',
    dit: (o, pt) => `<b>${pts(o.n)} par ${o.els.length > 2 ? 'groupe' : 'couple'}</b>
      ${o.els.map(icone).join(' + ')} ${ou(pt)} : une icône de chaque. Trois de l’une et deux de
      l’autre font deux couples.` },
  { si: (o) => o.kind === 'MORT',
    dit: (o, pt) => `<b>${pts(o.n)} par plan de mort</b> ${ou(pt)} — un plan qui porte le crâne
      ${elIcon('MORT', 20)}.` },
  { si: (o) => o.kind === 'MINUTAGE' && o.sens === 'EGAL' && o.seuil === TC_VIDE,
    dit: (o, pt) => `<b>${pts(o.n)} par carte sans minutage</b> (${afficheur(TC_VIDE)}) ${ou(pt)}.
      Le Raccord en est une.` },
  { si: (o) => o.kind === 'MINUTAGE' && !(o.sens === 'EGAL' && o.seuil === TC_VIDE),
    dit: (o, pt) => `<b>${pts(o.n)} par plan ${o.sens === 'EGAL' ? 'à' : o.sens === 'APRES' ? 'après' : 'avant'}
      ${afficheur(o.seuil)}</b> ${ou(pt)}.` },
  { si: (o) => o.kind === 'RACCORD',
    dit: (o, pt) => `<b>${pts(o.n)} par Raccord</b> ${ou(pt)}. L’Ouverture et la Fin ne sont pas
      des Raccords.` },
  { si: (o) => o.kind === 'PLAN',
    dit: (o, pt) => `<b>${pts(o.n)} par carte</b> ${ou(pt)}.` },
  { si: (o) => o.kind === 'SEQ_TAILLE',
    dit: (o) => ((o.seuil || 1) <= 1 && o.sens !== 'MAX'
      ? `<b>${pts(o.n)} par séquence</b> de votre banc.`
      : `<b>${pts(o.n)} par séquence d’au ${o.sens === 'MAX' ? 'plus' : 'moins'} ${o.seuil} plans</b>.`) },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens !== 'SANS' && !!ELEMENTS[o.cible],
    dit: (o) => `<b>${pts(o.n)} par séquence qui montre ${(o.seuil || 1) > 1
      ? `au moins ${o.seuil} ${mots(o.cible).des}` : `au moins ${mots(o.cible).une}`}</b>.
      Ce sont des icônes que l’on compte, pas des plans.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens !== 'SANS' && String(o.cible).includes('+'),
    dit: (o) => `<b>${pts(o.n)} par séquence qui réunit</b>
      ${String(o.cible).split('+').map(icone).join(', ')}.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens !== 'SANS' && o.cible === 'RACCORD',
    dit: (o) => `<b>${pts(o.n)} par séquence qui porte ${(o.seuil || 1) > 1
      ? `au moins ${o.seuil} Raccords` : 'un Raccord'}</b>. L’Ouverture et la Fin n’en sont pas.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens !== 'SANS' && o.cible === 'PLAN',
    dit: (o) => `<b>${pts(o.n)} par séquence d’au moins ${o.seuil || 1} plans</b>. Le Raccord,
      l’Ouverture et la Fin ne sont pas des plans.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens !== 'SANS' && o.cible === 'ORDRE',
    dit: (o) => `<b>${pts(o.n)} par séquence dont les minutages sont dans l’ordre</b> :
      ${DANS_L_ORDRE}.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens === 'SANS' && !!ELEMENTS[o.cible],
    dit: (o) => `<b>${pts(o.n)} par séquence sans ${icone(o.cible)}</b>${(o.seuil || 1) > 1
      ? ` — qui en montre moins de ${o.seuil}` : ''}.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens === 'SANS' && o.cible === 'TC_VIDE',
    dit: (o) => `<b>${pts(o.n)} par séquence sans ${afficheur(TC_VIDE)}</b> : toutes ses cartes ont
      un minutage. Un Raccord n’en a pas.` },
  { si: (o) => o.kind === 'SEQ_AVEC' && o.sens === 'SANS' && !ELEMENTS[o.cible] && o.cible !== 'TC_VIDE',
    dit: (o) => `<b>${pts(o.n)} par séquence sans ${mots(o.cible).un}</b>.` },
  { si: (o) => o.kind === 'SEQ_VOISINES' && o.sens === 'APRES',
    dit: (o) => `<b>${pts(o.n)} par séquence placée en dessous</b> de celle où ce plan est monté.` },
  { si: (o) => o.kind === 'SEQ_VOISINES' && o.sens !== 'APRES',
    dit: (o) => `<b>${pts(o.n)} par séquence placée au-dessus</b> de celle où ce plan est monté.` },
  { si: (o) => o.kind === 'SEQ_LONGUE',
    dit: (o) => `<b>${pts(o.n)} par plan de votre plus longue séquence</b>. Le Raccord, l’Ouverture
      et la Fin ne sont pas des plans.` },
  { si: (o) => o.kind === 'ABSENTES',
    dit: (o, pt) => `<b>${pts(o.n)} par icône absente</b> ${ou(pt)} : une fois pour chacune des six
      icônes que l’on n’y voit nulle part. Les icônes de ce plan comptent comme les autres.` },
  { si: (o) => o.kind === 'EXTREME',
    dit: (o, pt) => `<b>${pts(o.n)} par exemplaire de l’icône la ${o.sens === 'MOINS' ? 'moins' : 'plus'}
      présente</b> ${ou(pt)}.` },
];

const SE_DECLENCHENT = [
  { si: (o) => o.kind === 'SEUIL' && o.sens !== 'MAX' && o.cible !== 'ORDRE',
    dit: (o, pt) => `<b>${pts(o.n)} si l’on compte au moins ${o.seuil} ${mots(o.cible).des}</b>
      ${ou(pt)}.` },
  { si: (o) => o.kind === 'SEUIL' && o.cible === 'ORDRE',
    dit: (o, pt) => `<b>${pts(o.n)} si les minutages sont dans l’ordre</b> ${ou(pt)} :
      ${DANS_L_ORDRE}.` },
  { si: (o) => o.kind === 'DOMINE',
    dit: (o, pt) => `<b>${pts(o.n)} si ${icone(cibleDe(o))} est l’icône la ${o.sens === 'MOINS' ? 'moins' : 'plus'}
      présente</b> ${ou(pt)}. À égalité avec une autre, la condition est tenue ; absente, elle ne
      l’est pas.` },
  { si: (o) => o.kind === 'ABSENT' && !!ELEMENTS[cibleDe(o)], pref: (o, pt) => pt === 'SEQUENCE',
    dit: (o, pt) => `<b>${pts(o.n)} si l’on ne voit ${mots(cibleDe(o)).aucun}</b> ${ou(pt)}. Le plan
      qui porte ce pouvoir ne se regarde pas lui-même.` },
  { si: (o) => o.kind === 'ABSENT' && cibleDe(o) === 'TC_VIDE',
    dit: (o, pt) => `<b>${pts(o.n)} s’il n’y a ${mots('TC_VIDE').aucun}</b> ${ou(pt)} : toutes les
      cartes y ont un minutage. Un Raccord n’en a pas.` },
  { si: (o) => o.kind === 'ABSENT' && cibleDe(o) === 'RACCORD',
    dit: (o, pt) => `<b>${pts(o.n)} s’il n’y a aucun Raccord</b> ${ou(pt)}. L’Ouverture et la Fin
      n’en sont pas.` },
  { si: (o) => o.kind === 'ABSENT' && cibleDe(o) === 'MORT',
    dit: (o, pt) => `<b>${pts(o.n)} s’il n’y a aucun plan de mort</b> ${ou(pt)}.` },
  { si: (o) => o.kind === 'BOUT',
    dit: (o) => `<b>${pts(o.n)} si aucun plan n’est à sa ${o.sens === 'GAUCHE' ? 'gauche' : 'droite'}</b>
      dans sa séquence. Un Raccord n’est pas un plan.` },
  { si: (o, pt) => o.kind === 'SEUIL' && o.sens === 'MAX' && pt === 'AMONT',
    dit: (o) => `<b>${pts(o.n)} si ${o.seuil ? `au plus ${o.seuil} ${mots(o.cible).des} la précèdent`
      : `${mots(o.cible).aucun} ne la précède`}</b> dans tout le montage : elle ouvre le film.` },
  { si: (o, pt) => o.kind === 'SEUIL' && o.sens === 'MAX' && pt === 'SUITE',
    dit: (o) => `<b>${pts(o.n)} si ${o.seuil ? `au plus ${o.seuil} ${mots(o.cible).des} la suivent`
      : `${mots(o.cible).aucun} ne la suit`}</b> dans tout le montage : elle le termine.` },
  { si: (o, pt) => o.kind === 'SEUIL' && o.sens === 'MAX' && pt !== 'AMONT' && pt !== 'SUITE',
    dit: (o, pt) => `<b>${pts(o.n)} si l’on compte ${o.seuil ? `au plus ${o.seuil} ${mots(o.cible).des}`
      : mots(o.cible).aucun}</b> ${ou(pt)}.` },
];

const CHANGENT_UNE_REGLE = [
  { si: (o) => o.kind === 'RACCORD_VAUT',
    dit: (o) => `<b>Chaque Raccord vaut ${o.n < 0 ? '−' : '+'}${Math.abs(o.n)}.</b>
      Le « 1 × Raccord » d’un Raccord de votre montage se lit « ${1 + o.n} × Raccord ». Ce plan-ci ne
      marque rien lui-même.` },
  { si: (o) => o.kind === 'PLAN_PLUS',
    dit: (o) => `<b>${o.n > 1 ? `${o.n} tours` : 'Un tour'} de plus.</b> Quand le dernier tour est
      joué, vous prenez et montez encore ${o.n > 1 ? `${o.n} cartes` : 'une carte'}.` },
  { si: (o) => o.kind === 'SEQ_PLUS',
    dit: (o, pt, c) => `<b>${o.n > 1 ? `${o.n} séquences` : 'Une séquence'} de plus.</b> ${
      c.sequencesMax > 0 ? `Votre banc peut porter ${c.sequencesMax + o.n} séquences au lieu de
      ${c.sequencesMax}.` : 'Votre banc peut en ouvrir davantage.'}` },
  { si: (o) => o.kind === 'PIOCHER',
    dit: () => `<b>Le Chutier vous est ouvert.</b> À votre tour, la carte du dessus du Chutier
      s’ajoute à celles de la rivière : vous pouvez la prendre à leur place.` },
];

/** Les plans de la boîte, chacun une fois, et les cartes qui les portent. */
function lireBoite() {
  const cartes = cartesDeLaBoite();
  const plans = new Map();
  for (const carte of cartes) for (const p of carte.plans) if (p && !plans.has(p.cle)) plans.set(p.cle, p);
  return { cartes, plans: [...plans.values()] };
}

/** Le pouvoir d'un plan, montré : la bande de sa vraie carte, ou son dessin s'il est retouché. */
const montre = (plan, o, cfg) => (plan.visuel ? bande(nomCarte(plan))
  : `<span class="lv-bandeau">${objHTML(o, 30, cfg)}</span>`);

function blocLexique(titre, intro, entrees, boite, cfg, comptes) {
  const lignes = [];
  for (const e of entrees) {
    // L'exemple : la carte la plus parlante, et de préférence une carte qui a
    // encore son image — un plan retouché ne se montre que faute de mieux.
    let exemple = null;
    for (const plan of boite.plans) {
      for (const o of objsDe(plan)) {
        const pt = objPortee(o, cfg);
        if (!e.si(o, pt)) continue;
        const note = (e.pref && e.pref(o, pt) ? 2 : 0) + (plan.visuel ? 1 : 0);
        if (!exemple || note > exemple.note) exemple = { plan, o, pt, note };
      }
    }
    if (!exemple) continue;
    const n = comptes ? boite.cartes.filter((carte) => carte.plans.some((p) => p
      && objsDe(p).some((o) => e.si(o, objPortee(o, cfg))))).length : undefined;
    lignes.push(ligne(montre(exemple.plan, exemple.o, cfg), e.dit(exemple.o, exemple.pt, cfg), 'lv-lex', n));
  }
  if (!lignes.length) return '';
  return `<div class="aj-bloc">
    <h3>${titre}</h3>
    ${intro ? `<p class="aide">${intro}</p>` : ''}
    ${comptes ? ENTETE_CARTES : ''}
    ${lignes.join('')}
  </div>`;
}

/**
 * Où un pouvoir regarde : les flèches imprimées autour de ce qu'il compte.
 * Chaque portée est montrée sur une vraie carte quand la boîte en porte une.
 */
export function porteesHTML(cfg, boite = lireBoite()) {
  const c = cfg || {};
  const exemple = (test) => {
    let retouche = null;
    for (const plan of boite.plans) {
      for (const o of objsDe(plan)) {
        if (!test(o, objPortee(o, c))) continue;
        if (plan.visuel) return montre(plan, o, c);
        retouche = retouche || montre(plan, o, c);
      }
    }
    return retouche || '<span class="lv-sans-exemple">—</span>';
  };
  const simple = ['ELEMENT', 'MORT', 'MINUTAGE'];
  const de = (pt) => (o, p) => simple.includes(o.kind) && p === pt;
  const rangs = [
    [exemple(de('MONTAGE')), '<b>Aucune flèche</b> — tout votre montage.'],
    [exemple(de('SEQUENCE')), '<b>Une flèche de chaque côté</b> — toute la séquence où le plan est monté.'],
    [exemple(de('APRES')), '<b>Une flèche à droite</b> — de ce plan au bout droit de sa séquence.'],
    [exemple((o, p) => (simple.includes(o.kind) && p === 'AVANT') || (o.kind === 'BOUT' && o.sens === 'GAUCHE')),
      '<b>Une flèche à gauche</b> — du début de sa séquence à ce plan.'],
    [exemple(de('SUITE')), '<b>Une double flèche à droite</b> — de ce plan à la fin du montage : le reste '
      + 'de sa séquence, puis toutes les séquences du dessous.'],
    [exemple(de('AMONT')), '<b>Une double flèche à gauche</b> — du début du montage à ce plan : toutes les '
      + 'séquences du dessus, puis la sienne jusqu’à lui.'],
  ];
  return `<div class="aj-bloc">
    <h3>Où un pouvoir regarde</h3>
    ${rangs.map(([s, t]) => ligne(s, t, 'lv-lex')).join('')}
    <p class="aide lv-apres">Le plan qui porte le pouvoir fait partie de ce qu’il compte — sauf quand le
      pouvoir demande une <b>absence</b> : celui-là ne se regarde pas lui-même.</p>
  </div>`;
}

/**
 * Le lexique des pouvoirs : ce que dit chaque bande imprimée. `comptes` ajoute,
 * à droite, le nombre de cartes de la boîte qui portent chacun.
 */
export function lexiquePouvoirs(cfg, { comptes = false, boite = lireBoite() } = {}) {
  const c = cfg || {};
  return `${blocLexique('Ils comptent — « n × »',
    'Autant de fois les points qu’il y a de choses à compter.', COMPTENT, boite, c, comptes)}
  ${blocLexique('Ils se déclenchent — « n si »',
    'Les points tombent une fois, si la condition est tenue à la fin de la partie.',
    SE_DECLENCHENT, boite, c, comptes)}
  ${blocLexique('Ils changent une règle',
    'Les pouvoirs des Plans de départ ne rapportent pas de points : ils vous donnent un droit, tant '
    + 'que le plan est dans votre montage.', CHANGENT_UNE_REGLE, boite, c, comptes)}`;
}

// --- L'aide de jeu ----------------------------------------------------------
// Une fiche, pas un texte : le tour, les limites du banc, et ce que veut dire
// chaque symbole — avec, à droite, combien de cartes de la boîte le portent.

export function aideDeJeu(cfg) {
  const c = cfg || {};
  const boite = lireBoite();
  const B = recenserBoite(c);
  const tours = c.tours || 12;
  const riviere = Math.max(1, (c.riviere | 0) || 4);
  const seqMax = c.sequencesMax > 0 ? c.sequencesMax : 0;
  const parCote = c.plansParCote > 0 ? c.plansParCote : 0;
  const defausse = c.defausse !== false;
  const pas = (n, texte) => `<div class="lv-ligne lv-pas"><div class="lv-sym"><span class="lv-num">${n}</span></div>
    <div class="lv-txt">${texte}</div></div>`;
  const point = (texte) => `<div class="lv-ligne"><div class="lv-txt">${texte}</div></div>`;

  return `<article class="aide-jeu">
  <header class="aj-hero"><h2>Aide de jeu</h2>
    <p>Le tour, les limites du banc et le sens de chaque pouvoir, à garder à côté de son montage.</p>
    <p class="aj-note">Le chiffre de droite compte les <b>cartes de la boîte</b> qui portent ce qui est
    décrit — ${B.cartes} cartes en tout, cartes de départ comprises. Il suit votre matériel : une carte
    retouchée ou écartée dans le Matériel change le compte.</p></header>

  <div class="aj-fiche">

    <div class="aj-colonne">

    <div class="aj-bloc">
      <h3>Votre tour</h3>
      ${defausse ? pas(1, `<b>Défausser</b> <i>(facultatif, une fois)</i> — une carte de la rivière part au
        Chutier ; la rivière se recomplète.`) : ''}
      ${pas(defausse ? 2 : 1, `<b>Prendre</b> une des ${riviere} cartes de la rivière — elle doit avoir
        une place dans votre banc.${c.chutierRiviere !== false ? `
        Pioche vide : la carte du dessus du Chutier prend sa place.` : ''}`)}
      ${pas(defausse ? 3 : 2, `<b>La monter</b> aussitôt. Rien à monter : vous passez.`)}
    </div>

    <div class="aj-bloc">
      <h3>Votre banc</h3>
      ${point(`${seqMax ? `<b>${seqMax} séquences</b> au plus, l’une au-dessus de l’autre` : 'Des séquences, l’une au-dessus de l’autre'} ;
        chacune a pour <b>centre</b> le Plan Large qui l’a ouverte.`)}
      ${parCote ? point(`<b>${parCote} cartes</b> au plus à gauche du centre, et ${parCote} à droite.`) : ''}
      ${point('Un <b>Plan Large</b> ouvre une séquence, au-dessus ou en dessous des autres.')}
      ${point('Une <b>moitié gauche</b> se monte au bout gauche d’une séquence, une <b>moitié droite</b> à son bout droit.')}
      ${point(c.raccordAppellePL
    ? 'À la suite d’un <b>Raccord</b> : un Plan Large, et rien d’autre.'
    : 'À la suite d’un <b>Raccord</b> : un Plan Large ou un Gros Plan — jamais un autre Raccord.')}
      ${point(`Fin : au <b>${tours}<sup>e</sup> plan</b> d’une joueuse, les autres jouent un dernier tour.`)}
    </div>

    </div>

    <div class="aj-colonne">

    <div class="aj-bloc">
      <h3>Les icônes</h3>
      ${ENTETE_CARTES}
      ${ELEMENT_IDS.map((e) => ligne(elIcon(e, 34), ELEMENTS[e].label, '', B.icones[e] || 0)).join('')}
      ${ligne(elIcon('MORT', 34), 'Le crâne : un plan de mort', '', B.icones.MORT || 0)}
    </div>

    <div class="aj-bloc">
      <h3>Le minutage</h3>
      ${ENTETE_CARTES}
      ${ligne(`${afficheur(10)} … ${afficheur(60)}`, 'Le moment du plan dans le film', '', B.tc.ORDINAIRE || 0)}
      ${ligne(afficheur(TC_VIDE), 'Sans minutage : ne rompt jamais l’ordre', '', B.tc.VIDE || 0)}
      ${ligne(afficheur(TC_PREMIER), 'L’Ouverture', '', B.tc.PREMIER || 0)}
      ${ligne(afficheur(TC_DERNIER), 'La Fin', '', B.tc.DERNIER || 0)}
    </div>

    </div>

  </div>

  <div class="aj-bandeaux">
    ${porteesHTML(c, boite)}
    ${lexiquePouvoirs(c, { comptes: true, boite })}
  </div>
  </article>`;
}
