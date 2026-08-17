// ---------------------------------------------------------------------------
// EDIT — pastilles et symboles
// ---------------------------------------------------------------------------
// Les pastilles ne sont plus redessinées : elles sont découpées à même les
// cartes par outils/extraire-visuels.py, et servies depuis assets/icones/.
// L'application affiche donc exactement les icônes imprimées, partout — sur
// les cartes comme dans les colonnes de score.

import { ELEMENTS } from './data.js?v=1.29';

const SPECIAUX = {
  MORT:  { label: 'Mort' },
  NEANT: { label: 'Plan sans personnage' },
};

export const SPECIAL_IDS = Object.keys(SPECIAUX);

/** Libellé d'une pastille, élément ou symbole. */
export function libelleIcone(id) {
  return ELEMENTS[id]?.label || SPECIAUX[id]?.label || id;
}

/**
 * Pastille ronde. Sans `size`, la taille est laissée à la feuille de style du
 * contexte ; avec, elle est imposée (légendes, tableaux).
 */
export function elIcon(id, size) {
  if (!ELEMENTS[id] && !SPECIAUX[id]) return '';
  const style = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<img class="pastille" src="assets/icones/${id}.webp" alt="${libelleIcone(id)}" title="${libelleIcone(id)}"${style}>`;
}

/** La pastille numérotée du bandeau — le « 2 » de « 2 × Raccord ». */
export function numIcon(n, size) {
  const style = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg class="pastille-num" viewBox="0 0 64 64"${style} role="img" aria-label="${n}">
    <circle cx="32" cy="32" r="29" fill="#f2f3f5" stroke="#15161c" stroke-width="3.6"/>
    <circle cx="32" cy="32" r="23" fill="none" stroke="#9aa0aa" stroke-width="1.6"/>
    <text x="32" y="44" text-anchor="middle" font-size="34" font-weight="800" fill="#15161c" font-family="inherit">${n}</text>
  </svg>`;
}

/** Vignette d'un cadrage, pour les colonnes de score. */
export function cadrageIcon(f) {
  return `<span class="jeton-cadrage j-${f}">${f === 'DEP' ? 'DÉP' : f}</span>`;
}
