// ---------------------------------------------------------------------------
// EDIT — rendu des cartes
// ---------------------------------------------------------------------------
// Pas d'illustration : le minutage, les pastilles des éléments et le bandeau
// d'objectif suffisent à jouer. Les proportions reprennent le matériel réel —
// un Gros Plan (1/3) et un Plan Moyen (2/3) forment un Plan Large.

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel } from './data.js?v=1.8';
import { elIcon, numIcon } from './icons.js?v=1.8';

export function tc(min) {
  return `${String(Math.floor(min)).padStart(2, '0')}:00`;
}

function bandeau(obj) {
  // Même sans objectif le bandeau est présent mais vide : c'est lui qui aligne
  // le bas des deux moitiés d'une carte.
  if (!obj) return '<div class="bandeau sans-objectif"></div>';
  const n = numIcon(obj.n, 22);
  let cible = '';
  switch (obj.kind) {
    case 'RACCORD': cible = `<span class="tag tag-gris">Raccord</span>`; break;
    case 'PLAN':    cible = `<span class="tag tag-blanc">◀ Plan ▶</span>`; break;
    case 'FORMAT':  cible = `<span class="tag tag-fmt" style="--c:${FORMATS[obj.format].color}">${FORMATS[obj.format].label}</span>`; break;
    case 'ELEMENT': cible = elIcon(obj.el, 22); break;
    case 'PAIRE':   cible = `<span class="paire">${elIcon(obj.els[0], 22)}<i></i>${elIcon(obj.els[1], 22)}</span>`; break;
    case 'MORT':    cible = elIcon('MORT', 22); break;
    case 'NEANT':   cible = elIcon('NEANT', 22); break;
    case 'ABSENT':  return `<div class="bandeau"><span class="op">${n}</span><span class="si">si</span><span class="barre">${elIcon(obj.el, 22)}<b>✕</b></span></div>`;
    default: return '<div class="bandeau sans-objectif"></div>';
  }
  return `<div class="bandeau"><span class="op">${n}</span><span class="x">×</span>${cible}</div>`;
}

/** Un plan : moitié de carte, ou Plan Large pleine largeur. */
export function renderPlan(h, opts = {}) {
  const fmt = h.transition ? 'TR' : h.format;
  const F = FORMATS[fmt] || FORMATS.PM;
  const large = h.format === 'PL';
  const pastilles = h.el.map((e) => elIcon(e)).join('');
  const cls = ['moitie', `f-${h.format}`, h.transition ? 'transition' : '', h.depart ? 'depart' : '',
    opts.clickable ? 'choisissable' : '', opts.selected ? 'choisi' : ''].join(' ');
  const flex = large ? '1 1 100%' : (h.format === 'GP' ? '0 0 33.6%' : '1 1 66.4%');
  const titre = h.titre ? `<div class="titre-transition">${h.titre}</div>` : '';
  const label = h.depart ? 'Plan de départ' : (h.transition ? h.transition.toLowerCase() : F.label);
  // L'image est posée en style inline : dans une variable CSS, url() se
  // résoudrait contre la feuille de style et non contre le document.
  const img = h.image ? `background-image:url('${h.image}');` : '';
  return `<div class="${cls}" style="--flex:${flex};${img}" data-format="${h.format}" data-num="${h.num}"
      title="${objLabel(h.obj) || label}">
    <div class="tcode ${h.tc === 0 || h.transition ? 'bleu' : ''}">${tc(h.tc)}</div>
    ${titre}
    <div class="corps"></div>
    ${pastilles ? `<div class="pastilles">${pastilles}</div>` : ''}
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
    opts.clickable ? 'clickable' : ''].join(' ');
  return `<div class="${cls}" data-carte="${carte.id}" data-verso="${verso ? 1 : 0}">
    ${plans.map((h) => renderPlan(h, opts)).join('')}
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
