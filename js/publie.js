// ---------------------------------------------------------------------------
// EDIT — le matériel PUBLIÉ
// ---------------------------------------------------------------------------
// Tout ce qu'on règle dans l'éditeur vit dans le navigateur : c'est ce qui
// permet de bricoler sans rien casser, et c'est aussi pourquoi personne
// d'autre ne le voit. Le site publié, lui, ne porte que ce qui est dans le
// dépôt — d'où des cartes différentes d'une machine à l'autre, et des
// illustrations qui manquent.
//
// Ce fichier ouvre le troisième lieu : `materiel.json`, à la racine du dépôt.
// Il est LU PAR TOUT LE MONDE au démarrage, et c'est lui qui fait foi pour qui
// n'a rien réglé. Le maître compose son matériel dans l'éditeur, l'exporte, le
// pose dans le dépôt, publie — et le lien qu'il partage montre alors le même
// jeu à tous.
//
// Trois couches, de la plus faible à la plus forte :
//
//   1. l'IMPRIMÉ    — ce que le code décrit, la boîte d'origine
//   2. le PUBLIÉ    — `materiel.json`, ce que le dépôt porte
//   3. le LOCAL     — ce que cette machine-ci a réglé dans l'éditeur
//
// Une machine neuve n'a pas de couche 3 : elle voit donc exactement le jeu
// publié. Une machine qui a bricolé garde son bricolage — on ne lui efface pas
// son travail au chargement d'une page —, et l'éditeur lui propose d'adopter
// le publié quand il a changé.

const FICHIER = 'materiel.json';

let publie = null;      // { version, date, materiel, cartesDesactivees, images }
let chargement = null;

/**
 * Lit le matériel publié. Absent — un dépôt qui n'en a pas encore —, on rend
 * `null` sans bruit : le jeu tourne alors sur l'imprimé, comme avant.
 */
export function chargerPublie(version) {
  if (chargement) return chargement;
  chargement = fetch(`${FICHIER}?v=${version}`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { publie = j && j.materiel ? j : null; return publie; })
    .catch(() => { publie = null; return null; });
  return chargement;
}

export const materielPublie = () => publie;

/** L'empreinte du matériel publié : de quoi savoir s'il a changé depuis. */
export const signaturePublie = () => (publie ? String(publie.signature || publie.date || '') : '');

/**
 * Ce matériel-là est-il vide — c'est-à-dire : cette machine n'a-t-elle rien
 * réglé ? Un objet peut exister sans rien porter ; c'est le cas d'une
 * configuration neuve, et c'est celui qui doit adopter le publié.
 */
export function materielVide(m) {
  if (!m) return true;
  const a = m.ajouts || {};
  return !Object.keys(m.plans || {}).length
    && !Object.keys(m.paires || {}).length
    && !(m.retires || []).length
    && !(a.scenes || []).length && !(a.larges || []).length
    && !(a.departs || []).length && !(a.paires || []).length;
}

/**
 * Le fichier à poser dans le dépôt. `images` dit, pour chaque visuel apporté,
 * le nom du fichier qui l'accompagne dans l'archive : le matériel publié ne
 * peut pas désigner une réserve de navigateur, il désigne un chemin.
 */
export function composerPublie(cfg, images, version) {
  const quand = new Date();
  return {
    version,
    date: quand.toISOString().slice(0, 19).replace('T', ' '),
    // Une empreinte courte, pour que l'éditeur sache dire « le site publie un
    // matériel plus récent que le vôtre » sans comparer deux gros objets.
    signature: empreinte(JSON.stringify([cfg.materiel, cfg.cartesDesactivees, images])),
    materiel: cfg.materiel,
    cartesDesactivees: cfg.cartesDesactivees || [],
    images: images || [],
  };
}

/** FNV-1a — une empreinte courte et stable, sans dépendance. */
export function empreinte(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
