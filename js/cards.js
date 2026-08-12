// ---------------------------------------------------------------------------
// EDIT — rendu des cartes
// ---------------------------------------------------------------------------
// Une carte n'apporte que son illustration : le minutage, les pastilles, le
// bandeau d'objectif et le libellé de cadrage sont entièrement redessinés par
// l'application, à partir de ses propres données. Les images d'assets/ sont
// recadrées au-dessus de la zone d'information et leur minutage imprimé est
// effacé — voir outils/extraire-visuels.py.
//
// Les proportions reprennent la carte réelle : illustration jusqu'à 69 % de la
// hauteur, languette des pastilles jusqu'à 78,5 %, bandeau jusqu'à 93,7 %,
// puis le libellé.

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel } from './data.js?v=1.15';
import { elIcon, numIcon, cadrageIcon } from './icons.js?v=1.15';

export function tc(min) {
  return `${String(Math.floor(min)).padStart(2, '0')}:00`;
}

/** Le contenu d'un bandeau d'objectif, en icônes. */
export function objContenu(obj, taille) {
  if (!obj) return '';
  switch (obj.kind) {
    case 'RACCORD': return `<span class="tag tag-gris">Raccord</span>`;
    case 'PLAN':    return `<span class="tag tag-blanc">◀ Plan ▶</span>`;
    case 'FORMAT':  return `<span class="tag tag-fmt" style="--c:${FORMATS[obj.format].color}">${FORMATS[obj.format].label}</span>`;
    case 'ELEMENT': return elIcon(obj.el, taille);
    case 'PAIRE':   return `<span class="paire">${elIcon(obj.els[0], taille)}<i></i>${elIcon(obj.els[1], taille)}</span>`;
    case 'MORT':    return elIcon('MORT', taille);
    case 'NEANT':   return elIcon('NEANT', taille);
    case 'ABSENT':  return `<span class="barre">${elIcon(obj.el, taille)}<b>✕</b></span>`;
    default: return '';
  }
}

/** L'objectif en entier — « 2 × ⛨ » — pour les cartes et les tableaux. */
export function objHTML(obj, taille) {
  if (!obj) return '';
  const n = numIcon(obj.n, taille);
  if (obj.kind === 'ABSENT') {
    return `<span class="obj-html">${n}<span class="si">si</span>${objContenu(obj, taille)}</span>`;
  }
  return `<span class="obj-html">${n}<span class="x">×</span>${objContenu(obj, taille)}</span>`;
}

function bandeau(obj) {
  // Même sans objectif le bandeau reste : c'est lui qui aligne le bas des
  // deux moitiés d'une carte.
  if (!obj) return '<div class="bandeau sans-objectif"></div>';
  const contenu = obj.kind === 'ABSENT'
    ? `${numIcon(obj.n)}<span class="si">si</span>${objContenu(obj)}`
    : `${numIcon(obj.n)}<span class="x">×</span>${objContenu(obj)}`;
  return `<div class="bandeau">${contenu}</div>`;
}

/** Les données que le pop-up de survol affiche en grand. */
function donneesApercu(h, label) {
  return encodeURIComponent(JSON.stringify({
    tc: h.tc, el: h.el, obj: h.obj || null, format: h.format,
    num: h.num, label, transition: h.transition || null,
  }));
}

/** Un plan : moitié de carte, ou Plan Large pleine largeur. */
export function renderPlan(h, opts = {}) {
  const F = FORMATS[h.transition ? 'TR' : h.format] || FORMATS.PM;
  const large = h.format === 'PL';
  const cls = ['moitie', `f-${h.format}`, h.transition ? 'transition' : '', h.depart ? 'depart' : '',
    opts.clickable ? 'choisissable' : '', opts.selected ? 'choisi' : ''].join(' ');
  const flex = large ? '1 1 100%' : (h.format === 'GP' ? '0 0 33.6%' : '1 1 66.4%');
  const label = h.depart ? 'Plan de départ' : (h.transition ? h.transition.toLowerCase() : F.label);
  // L'image est posée en style inline : dans une variable CSS, url() se
  // résoudrait contre la feuille de style et non contre le document.
  const fond = h.image ? `background-image:url('${h.image}');` : '';
  return `<div class="${cls}" style="--flex:${flex}" data-format="${h.format}" data-num="${h.num}"
      data-apercu="${donneesApercu(h, label)}">
    <div class="illus" style="${fond}">
      <div class="tcode ${h.tc === 0 || h.transition ? 'bleu' : ''}">${tc(h.tc)}</div>
    </div>
    <div class="pastilles" style="--n:${Math.max(1, h.el.length)}">${h.el.map((e) => elIcon(e)).join('')}</div>
    ${bandeau(h.obj)}
    <div class="libelle" style="--c:${F.color}">${label}</div>
  </div>`;
}

/** Une carte entière. `verso` échange la position des deux moitiés. */
export function renderCarte(carte, verso, opts = {}) {
  const plans = carte.type === 'DOUBLE'
    ? (verso ? [moitiesDe(carte).PM, moitiesDe(carte).GP] : [moitiesDe(carte).GP, moitiesDe(carte).PM])
    : [plHalf(carte)];
  const cls = ['carte', opts.selected ? 'sel' : '', opts.small ? 'small' : '', opts.tiny ? 'tiny' : '',
    opts.clickable ? 'clickable' : '', opts.moitiesChoisissables ? 'choix-moitie' : ''].join(' ');
  return `<div class="${cls}" data-carte="${carte.id}" data-verso="${verso ? 1 : 0}">
    ${plans.map((h) => renderPlan(h, {
      ...opts,
      // Au montage, la carte reste entière : c'est la moitié que l'on désigne.
      selected: opts.formatChoisi ? opts.formatChoisi === h.format : opts.selected,
    })).join('')}
  </div>`;
}

/**
 * Le dos d'une pioche, au format d'une carte. Seuls les Plans Larges ont un
 * vrai dos : les cartes Plan Moyen / Gros Plan étant recto-verso, leur pioche
 * montre toujours sa face du dessus.
 */
/** Enveloppe une carte d'un effet de pile : des cartes décalées dessous. */
export function enPile(html, reste) {
  const epaisseur = Math.min(3, Math.max(1, Math.ceil(reste / 12)));
  return `<div class="pile" data-epaisseur="${epaisseur}">
    ${Array.from({ length: epaisseur }, (_, i) => `<span class="pile-couche" style="--i:${i + 1}"></span>`).join('')}
    ${html}
  </div>`;
}

export function renderDos(libelle, reste, opts = {}) {
  const cls = ['carte', 'dos', opts.small ? 'small' : '', opts.clickable ? 'clickable' : ''].join(' ');
  return `<div class="${cls}">
    <div class="dos-motif">
      <span class="dos-titre">${libelle}</span>
      <span class="dos-reste">${reste} carte${reste > 1 ? 's' : ''}</span>
    </div>
  </div>`;
}

/** Fiche texte d'une carte, pour l'écran Matériel. */
export function ficheCarte(carte) {
  const plans = carte.type === 'DOUBLE' ? Object.values(moitiesDe(carte)) : [plHalf(carte)];
  return plans.map((h) => {
    const els = h.el.map((e) => ELEMENTS[e].label).join(', ') || '—';
    return `${h.transition || FORMATS[h.format].label} n°${h.num} · ${tc(h.tc)} · ${els}`;
  }).join(' | ');
}

export { cadrageIcon };
