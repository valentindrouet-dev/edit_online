// ---------------------------------------------------------------------------
// Pastilles des éléments et symboles d'objectif, dessinés en SVG inline.
// Pas d'illustration : seule l'information de jeu est représentée.
// ---------------------------------------------------------------------------

import { ELEMENTS } from './data.js?v=1.8';

const GLYPHS = {
  // La Fille — silhouette à queue de cheval
  FILLE: `<path d="M32 15c-6.2 0-11 4.6-11 11.2 0 3 .9 5.3 2.4 7-5.6 2.2-9.4 6.5-10.6 12.6-.4 2 .1 3.2 2 3.2h34.4c1.9 0 2.4-1.2 2-3.2-1.2-6.1-5-10.4-10.6-12.6 1.5-1.7 2.4-4 2.4-7C43 19.6 38.2 15 32 15Z"/>
         <path d="M42 20c4.6 1.5 7.4 5 8.2 10.2.7 4.6-.2 8.6-2.6 12.2-.7 1-.3 2 .8 2.3 1.2.3 2-.2 2.7-1.4 2.7-4.4 3.6-9.3 2.7-14.6C52.6 22 48.6 17.6 43 16.2Z"/>`,
  // Le Tueur — buste au chapeau
  TUEUR: `<path d="M13 27c0-1.6 1-2.6 2.6-3 4.2-1.1 8.6-1.7 13.2-1.9l1-5.6c.3-1.6 1.3-2.4 3-2.4h6.4c1.7 0 2.7.8 3 2.4l1 5.6c4.6.2 9 .8 13.2 1.9 1.6.4 2.6 1.4 2.6 3 0 1.5-1.1 2.4-2.8 2.4H15.8C14.1 29.4 13 28.5 13 27Z"/>
          <path d="M25.4 32h13.2l-.1 3.6 5.5 1.6c4.8 1.4 7.9 4.7 8.6 9.6l.5 3.4c.2 1.6-.6 2.4-2.2 2.4H16.1c-1.6 0-2.4-.8-2.2-2.4l.5-3.4c.7-4.9 3.8-8.2 8.6-9.6l5.5-1.6Z"/>
          <path d="M30 36.6h4l-1.2 4.6 2.6 10.4h-6.8l2.6-10.4Z" fill="#fff" fill-opacity=".85"/>`,
  // L'Homme — buste en smoking
  HOMME: `<circle cx="32" cy="23" r="9.6"/>
          <path d="M22.6 34.4 32 40.4l9.4-6c5.9 1.6 9.4 5.3 10.2 11l.4 3c.2 1.6-.6 2.4-2.2 2.4H16.2c-1.6 0-2.4-.8-2.2-2.4l.4-3c.8-5.7 4.3-9.4 10.2-11Z"/>
          <path d="M27.6 35.8 32 39l4.4-3.2 1.8 1.2L32 51.2l-6.2-14.2Z" fill="#fff" fill-opacity=".9"/>`,
  // La Clé
  CLE: `<path d="M40.6 12c-7.7 0-14 6.3-14 14 0 1.7.3 3.4.9 4.9L12.6 45.8c-.7.7-.7 1.8 0 2.5l5.1 5.1c.7.7 1.8.7 2.5 0l3.1-3.1-2.5-2.5 3-3 2.5 2.5 3.2-3.2-2.9-2.9 3-3 2.9 2.9 2.2-2.2c1.5.6 3.2.9 4.9.9 7.7 0 14-6.3 14-14s-6.3-14-14-14Zm4.4 12.6a4 4 0 1 1 0-8.1 4 4 0 0 1 0 8.1Z"/>`,
  // L'Arme
  ARME: `<path d="M11 22.4c0-1.2.9-2.1 2.1-2.1h35.6c1.2 0 2.1.9 2.1 2.1v7.3h4.4c1.2 0 2 .8 2 2v3.1c0 1.2-.9 2-2 2h-6.3l-3 8.4c-1 2.9-2.9 4.3-5.9 4.3h-5.6c-2.4 0-3.7-1.4-3.9-3.7l-.6-6.5c-.1-1.6-1-2.4-2.6-2.4H24.6l-6.8 12.2c-.6 1.1-1.5 1.6-2.7 1.6h-3c-1.6 0-2.4-1-1.9-2.5l4-11.3H13c-1.2 0-2-.9-2-2Z"/>
          <circle cx="19.6" cy="26.4" r="2.6" fill="#fff" fill-opacity=".8"/>`,
  // La Voiture — roue
  VOITURE: `<circle cx="32" cy="32" r="20" />
            <circle cx="32" cy="32" r="13.6" fill="#fff" fill-opacity=".28"/>
            <circle cx="32" cy="32" r="5.2" fill="#fff" fill-opacity=".9"/>
            <g fill="#fff" fill-opacity=".9"><rect x="30.3" y="14.4" width="3.4" height="9"/><rect x="30.3" y="40.6" width="3.4" height="9"/><rect x="14.4" y="30.3" width="9" height="3.4"/><rect x="40.6" y="30.3" width="9" height="3.4"/></g>`,
};

const SPECIALS = {
  MORT: {
    color: '#1b1b1f', ring: '#5c5c66',
    glyph: `<path d="M32 12c-9.9 0-17.4 6.9-17.4 16.4 0 5.2 2.2 9.2 5.6 11.8v4.4c0 1.7 1.1 2.8 2.8 2.8h18c1.7 0 2.8-1.1 2.8-2.8v-4.4c3.4-2.6 5.6-6.6 5.6-11.8C49.4 18.9 41.9 12 32 12Zm-8.4 17.4a4.4 4.4 0 1 1 0-8.8 4.4 4.4 0 0 1 0 8.8Zm16.8 0a4.4 4.4 0 1 1 0-8.8 4.4 4.4 0 0 1 0 8.8ZM32 40.2l-2.8-5.6h5.6Z" fill="#fff"/>
             <path d="M17 47.4h30v4.2H17z" fill="#fff" opacity=".9"/>`,
  },
  NEANT: {
    color: '#1b1b1f', ring: '#5c5c66',
    glyph: `<path d="M20.4 17.6 32 29.2l11.6-11.6 6.8 6.8L38.8 36l11.6 11.6-6.8 6.8L32 42.8 20.4 54.4l-6.8-6.8L25.2 36 13.6 24.4Z" fill="#fff"/>`,
  },
};

/** Pastille ronde d'un élément. `size` en px. */
export function elIcon(id, size = 26) {
  const e = ELEMENTS[id] || SPECIALS[id];
  if (!e) return '';
  const glyph = GLYPHS[id] || (SPECIALS[id] && SPECIALS[id].glyph) || '';
  const fill = ELEMENTS[id] ? '#0d1a0d' : 'none';
  return `<svg class="pastille" viewBox="0 0 64 64" width="${size}" height="${size}" aria-label="${e.label || id}" role="img">
    <defs><radialGradient id="g${id}" cx="35%" cy="28%"><stop offset="0" stop-color="${e.ring}"/><stop offset="1" stop-color="${e.color}"/></radialGradient></defs>
    <circle cx="32" cy="32" r="30" fill="url(#g${id})" stroke="#12131a" stroke-width="3.4"/>
    <g fill="${fill}" fill-opacity="${ELEMENTS[id] ? 0.82 : 1}">${glyph}</g>
  </svg>`;
}

/** Petite pastille numérotée du bandeau (le « 2 » de « 2 × Raccord »). */
export function numIcon(n, size = 24) {
  return `<svg class="pastille-num" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${n}">
    <circle cx="32" cy="32" r="29" fill="#f2f3f5" stroke="#15161c" stroke-width="3.6"/>
    <circle cx="32" cy="32" r="23" fill="none" stroke="#9aa0aa" stroke-width="1.6"/>
    <text x="32" y="44" text-anchor="middle" font-size="34" font-weight="800" fill="#15161c" font-family="inherit">${n}</text>
  </svg>`;
}

export const SPECIAL_IDS = Object.keys(SPECIALS);
export { SPECIALS };
