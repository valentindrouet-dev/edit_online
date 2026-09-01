// ---------------------------------------------------------------------------
// EDIT — pastilles et symboles
// ---------------------------------------------------------------------------
// Les pastilles ne sont plus redessinées : elles sont découpées à même les
// cartes par outils/extraire-visuels.py, et servies depuis assets/icones/.
// L'application affiche donc exactement les icônes imprimées, partout — sur
// les cartes comme dans les colonnes de score.

import { ELEMENTS } from './data.js?v=1.84';

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
/**
 * La pastille de valeur d'un bandeau. Une valeur peut être **négative** — un
 * pouvoir qui coûte des points au lieu d'en rapporter : la pastille passe alors
 * au rouge, et le signe moins se dessine en barre pleine devant le chiffre
 * plutôt qu'en caractère typographique, pour qu'on ne puisse pas le manquer.
 */
export function numIcon(n, size) {
  const style = size ? ` style="width:${size}px;height:${size}px"` : '';
  const neg = n < 0;
  const chiffres = String(Math.abs(n));
  // Le chiffre se resserre quand il y en a plusieurs, et davantage encore
  // lorsqu'il faut loger la barre du moins à sa gauche.
  const large = chiffres.length > 1;
  const corps = [0, 36, 30, 23][Math.min(3, chiffres.length)] - (neg ? 5 : 0);
  const x = neg ? (large ? 39 : 41) : 32;
  // La barre se décale et s'affine quand le chiffre gagne en largeur : les deux
  // ne doivent jamais se toucher.
  const bx = large ? 6 : 12;
  const bw = large ? 14 : 16;
  const c = neg
    ? { fond: '#fde4e4', bord: '#8f1d1d', anneau: '#d78a8a', encre: '#8f1d1d' }
    : { fond: '#f2f3f5', bord: '#15161c', anneau: '#9aa0aa', encre: '#15161c' };
  const moins = neg
    ? `<rect x="${bx}" y="28.5" width="${bw}" height="7" rx="3.5" fill="${c.encre}"/>`
    : '';
  return `<svg class="pastille-num ${neg ? 'negatif' : ''}" viewBox="0 0 64 64"${style} role="img" aria-label="${n}">
    <circle cx="32" cy="32" r="29" fill="${c.fond}" stroke="${c.bord}" stroke-width="3.6"/>
    <circle cx="32" cy="32" r="23" fill="none" stroke="${c.anneau}" stroke-width="1.6"/>
    ${moins}
    <text x="${x}" y="44" text-anchor="middle" font-size="${corps}" font-weight="800" fill="${c.encre}" font-family="inherit">${chiffres}</text>
  </svg>`;
}

/** Vignette d'un cadrage, pour les colonnes de score. */
export function cadrageIcon(f) {
  return `<span class="jeton-cadrage j-${f}">${f === 'DEP' ? 'DÉP' : f}</span>`;
}
