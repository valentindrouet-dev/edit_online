// ---------------------------------------------------------------------------
// EDIT — partager une VERSION du jeu
// ---------------------------------------------------------------------------
// « Publier » pose le matériel dans le dépôt : c'est la voie officielle, celle
// qui fait qu'un lien nu montre le bon jeu à tout le monde. Elle demande le
// dépôt sous la main, une archive à défaire et une publication.
//
// Il manquait la voie courte : donner à un testeur, tout de suite, LE JEU TEL
// QU'IL EST — cartes retouchées, cartes créées ou écartées, variantes,
// illustrations apportées — sans rien publier. C'est ce que fait ce fichier.
//
// Un partage emporte quatre choses, et il faut savoir lesquelles :
//
//   1. les RÉGLAGES — toutes les variables de partie, du nombre de séquences
//      aux variantes en cours. C'est ce qui fait qu'on teste la même règle.
//   2. le MATÉRIEL   — retouches, cartes créées, cartes écartées.
//   3. les TEXTES    — les retouches portées à même le livret et l'aide de jeu.
//   4. les IMAGES apportées, en clair dans le fichier.
//
// Ce qu'il n'emporte pas : la VERSION DU CODE. Elle vient du site — c'est le
// lien qui la donne, et les deux joueuses la partagent forcément puisqu'elles
// ouvrent la même adresse. Le partage retient tout de même le numéro de version
// où il a été fait, pour qu'on puisse dire « ce partage vient d'une v2.19 »
// plutôt que de laisser deviner.
//
// Deux formes, une seule charge :
//
//   LE LIEN    léger, se colle dans un message. Il ne peut pas porter les
//              images apportées — une image pèse cent fois ce qu'une adresse
//              accepte — et le dit franchement plutôt que de les perdre en
//              silence.
//   LE FICHIER tout, images comprises. C'est la forme complète.
//
// La charge voyage dans le FRAGMENT de l'adresse — après le `#`. Un fragment
// n'est jamais envoyé au serveur : le partage reste entre celui qui l'envoie et
// celui qui le reçoit, et fonctionne sur un site qui n'a pas de serveur du tout.

import { empreinte } from './publie.js?v=2.23';

/** La forme du partage. Un lecteur qui ne la connaît pas refuse plutôt que de deviner. */
export const FORMAT = 1;

/** Le mot qui ouvre un fragment de partage. */
export const MARQUE = '#/partage=';

/**
 * Au-delà, on ne fabrique plus de lien. Les navigateurs acceptent des adresses
 * bien plus longues, mais les messageries, elles, les coupent — et un lien
 * coupé ne se répare pas. Trente mille caractères passent partout ; au-dessus,
 * le fichier est la bonne réponse.
 */
export const LIMITE_LIEN = 30000;

/**
 * Ce qu'on partage. `images` porte les visuels apportés en clair — le fichier
 * les emporte, le lien s'en passe.
 */
export function composerPartage(cfg, images, version, textes) {
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
    signature: empreinte(JSON.stringify([propre.materiel, propre.cartesDesactivees, images || []])),
    cfg: propre,
    textes: textes || {},
    images: images || [],
  };
}

/** Le partage sans ses images : ce qu'un lien peut porter. */
export const sansImages = (p) => ({ ...p, images: [] });

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
