// ---------------------------------------------------------------------------
// EDIT — partager une VERSION du jeu
// ---------------------------------------------------------------------------
// « Publier » pose le matériel dans le dépôt : c'est la voie officielle, celle
// qui fait qu'un lien nu montre le bon jeu à tout le monde. Elle demande le
// dépôt sous la main et une publication.
//
// La voie courte : donner à un testeur, tout de suite, LE JEU TEL QU'IL EST —
// lecture des cartes corrigée, assemblage refait, cartes créées ou écartées,
// réglages — sans rien publier. C'est ce que fait ce fichier.
//
// Un partage emporte trois choses :
//
//   1. les RÉGLAGES — toutes les variables de partie. C'est ce qui fait qu'on
//      teste la même règle.
//   2. le MATÉRIEL   — retouches, assemblage, cartes créées, cartes écartées.
//   3. les TEXTES    — les retouches portées à même les règles.
//
// Ce qu'il n'emporte pas : les IMAGES des cartes et la VERSION DU CODE. Elles
// viennent du site — c'est le lien qui les donne, et les deux joueuses les
// partagent forcément puisqu'elles ouvrent la même adresse. Le partage retient
// tout de même le numéro de version où il a été fait, pour qu'on puisse le
// dire plutôt que de le laisser deviner.
//
// Deux formes, une seule charge :
//
//   LE LIEN    se colle dans un message.
//   LE FICHIER pour un matériel trop retouché pour tenir dans une adresse.
//
// La charge voyage dans le FRAGMENT de l'adresse — après le `#`. Un fragment
// n'est jamais envoyé au serveur : le partage reste entre celui qui l'envoie et
// celui qui le reçoit, et fonctionne sur un site qui n'a pas de serveur du tout.

import { empreinte } from './publie.js';

/**
 * La forme du partage. Un lecteur qui ne la connaît pas refuse plutôt que de
 * deviner : un partage d'une boîte précédente désigne des cartes qui n'existent
 * plus, et ne se charge pas.
 */
export const FORMAT = 2;

/** Le mot qui ouvre un fragment de partage. */
export const MARQUE = '#/partage=';

/**
 * Au-delà, on ne fabrique plus de lien. Les navigateurs acceptent des adresses
 * bien plus longues, mais les messageries, elles, les coupent — et un lien
 * coupé ne se répare pas. Trente mille caractères passent partout ; au-dessus,
 * le fichier est la bonne réponse.
 */
export const LIMITE_LIEN = 30000;

/** Ce qu'on partage. */
export function composerPartage(cfg, version, textes) {
  const quand = new Date();
  const propre = JSON.parse(JSON.stringify(cfg));
  // Ce qui ne regarde que la machine d'où vient le partage : le nom qu'on s'est
  // donné en ligne n'a rien à faire chez le testeur, et la signature du publié
  // adopté parlerait d'un dépôt qui n'est pas le sien.
  delete propre.publieAdopte;
  return {
    format: FORMAT,
    version,
    date: quand.toISOString().slice(0, 19).replace('T', ' '),
    signature: empreinte(JSON.stringify([propre.materiel, propre.cartesDesactivees])),
    cfg: propre,
    textes: textes || {},
  };
}

// --- Encoder, décoder -------------------------------------------------------
// Le JSON est comprimé avant d'être encodé : un matériel bien retouché tient
// alors dans un lien, là où le texte brut ne passerait pas. `CompressionStream`
// manque encore à quelques navigateurs — on retombe sur le texte nu, plus long
// mais lisible partout. Le premier caractère dit lequel des deux on lit.

const COMPRIME = 'Z';
const NU = 'T';

const enOctets = (s) => new TextEncoder().encode(s);
const enTexte = (o) => new TextDecoder().decode(o);

/** base64 « URL » : ni `+`, ni `/`, ni `=` — rien qu'une adresse doive échapper. */
function base64url(octets) {
  let s = '';
  for (const o of octets) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desBase64url(txt) {
  const s = txt.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function comprimer(octets) {
  if (typeof CompressionStream !== 'function') return null;
  try {
    const flux = new Blob([octets]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flux).arrayBuffer());
  } catch { return null; }
}

async function decomprimer(octets) {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** Le partage, en une chaîne bonne pour une adresse. */
export async function encoderPartage(partage) {
  const brut = enOctets(JSON.stringify(partage));
  const z = await comprimer(brut);
  return z ? COMPRIME + base64url(z) : NU + base64url(brut);
}

/**
 * L'inverse. Rend `null` sur tout ce qui n'est pas un partage lisible — un lien
 * tronqué par une messagerie, un format d'une version future : mieux vaut ne
 * rien charger que charger à moitié.
 */
export async function decoderPartage(txt) {
  if (!txt || txt.length < 2) return null;
  try {
    const octets = desBase64url(txt.slice(1));
    const brut = txt[0] === COMPRIME ? await decomprimer(octets) : octets;
    const p = JSON.parse(enTexte(brut));
    if (!p || p.format !== FORMAT || !p.cfg) return null;
    return p;
  } catch { return null; }
}

/** La charge portée par une adresse, s'il y en a une. */
export function partageDeLURL(hash) {
  const h = String(hash || '');
  return h.startsWith(MARQUE) ? h.slice(MARQUE.length) : '';
}

/** Le lien à envoyer. `base` est l'adresse du site, sans fragment. */
export const lienPartage = (base, charge) => `${base}${MARQUE}${charge}`;
