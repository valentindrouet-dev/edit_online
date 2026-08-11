// ---------------------------------------------------------------------------
// EDIT — rendu des cartes
// ---------------------------------------------------------------------------
// Pas d'illustration : le minutage, les pastilles des éléments et le bandeau
// d'objectif suffisent à jouer. Les proportions reprennent le matériel réel —
// un Gros Plan (1/3) et un Plan Moyen (2/3) forment un Plan Large.

import { FORMATS, ELEMENTS } from './data.js';
import { elIcon, numIcon } from './icons.js';
import { halvesOf } from './engine.js';

export function tc(min) {
  const m = String(Math.floor(min)).padStart(2, '0');
  return `${m}:00`;
}

function bandeau(obj) {
  // Même sur une moitié sans objectif, le bandeau est présent mais vide : c'est
  // lui qui aligne le bas des deux moitiés d'une carte.
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
    default: return '';
  }
  return `<div class="bandeau"><span class="op">${n}</span><span class="x">×</span>${cible}</div>`;
}

/** Une moitié (ou un Plan Large entier) sous forme de bloc. */
export function renderMoitie(h, opts = {}) {
  const fmt = h.transition ? 'TR' : h.format;
  const F = FORMATS[fmt] || FORMATS.PM;
  const large = h.format === 'PL';
  const pastilles = h.el.map((e) => elIcon(e, opts.iconSize || 22)).join('');
  const cls = ['moitie', `f-${h.format}`, h.transition ? 'transition' : '', h.depart ? 'depart' : ''].join(' ');
  // La proportion est passée en variable CSS : dans une carte elle pilote le
  // flex, dans le banc de montage la largeur est fixée par la feuille de style.
  const flex = large ? '1 1 100%' : (h.format === 'GP' ? '0 0 33.6%' : '1 1 66.4%');
  const titre = h.titre ? `<div class="titre-transition">${h.titre}</div>` : '';
  return `<div class="${cls}" style="--flex:${flex}" data-scene="${h.scene ?? ''}" data-num="${h.num}">
    <div class="tcode ${h.tc === 0 || h.transition ? 'bleu' : ''}">${tc(h.tc)}</div>
    ${titre}
    <div class="corps"></div>
    ${pastilles ? `<div class="pastilles">${pastilles}</div>` : ''}
    ${bandeau(h.obj)}
    <div class="libelle" style="--c:${F.color}">${h.depart ? 'Plan de départ' : F.label}</div>
  </div>`;
}

/** Une carte complète, face recto ou verso. */
export function renderCarte(carte, verso, opts = {}) {
  const halves = halvesOf(carte, verso);
  const cls = ['carte', opts.selected ? 'sel' : '', opts.small ? 'small' : '', opts.clickable ? 'clickable' : ''].join(' ');
  return `<div class="${cls}" data-carte="${carte.id}" data-verso="${verso ? 1 : 0}">
    ${halves.map((h) => renderMoitie(h, opts)).join('')}
  </div>`;
}

/** Légende détaillée d'une carte, pour l'écran Matériel. */
export function ficheCarte(carte, verso) {
  const halves = halvesOf(carte, verso);
  return halves.map((h) => {
    const els = h.el.map((e) => ELEMENTS[e].label).join(', ') || '—';
    return `${h.transition || h.format} n°${h.num} · ${tc(h.tc)} · ${els}`;
  }).join(' | ');
}
