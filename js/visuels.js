// ---------------------------------------------------------------------------
// EDIT — l'adresse d'une illustration
// ---------------------------------------------------------------------------
// En 4.1 une carte EST son image, livrée par l'auteur et servie depuis
// `assets/`. Quand le site recompose lui-même un plan — parce qu'on l'a
// retouché dans le Matériel —, il pose l'illustration que la boîte lui donne :
// un chemin, qui se sert tel quel.

/** L'adresse à donner au navigateur pour une illustration. */
export const urlVisuel = (src) => src || '';
