// ---------------------------------------------------------------------------
// EDIT — les visuels apportés
// ---------------------------------------------------------------------------
// Les illustrations de la boîte vivent dans `assets/`, et l'inventaire s'en
// écrit à la publication : déposer un fichier sur le disque suffit à le rendre
// choisissable. Encore faut-il avoir le dépôt sous la main.
//
// Ce module ouvre l'autre porte : une image apportée depuis l'ÉDITEUR, sans
// rien publier. Elle ne peut pas aller dans `assets/` — un site statique n'y
// écrit pas —, elle vit donc dans le NAVIGATEUR, en IndexedDB.
//
// Trois conséquences, qu'il vaut mieux savoir que découvrir :
//
// **Elle reste sur cette machine.** Le dépôt ne la voit pas, les autres
// joueuses non plus : une partie en ligne partage le matériel, pas les
// fichiers. Chez elles, un plan qui la porte s'affiche sans illustration.
// Pour qu'une image entre vraiment dans le jeu, elle doit rejoindre `assets/`
// et une publication — l'éditeur propose de la retélécharger pour cela.
//
// **Elle est REDESSINÉE à l'entrée.** Un appareil photo produit des fichiers de
// plusieurs mégaoctets ; une carte n'en montre qu'un timbre-poste. On la
// ramène donc à la taille des visuels imprimés — un peu au-dessus, pour que
// l'export PDF reste net — et on la réencode en WebP. Trois mégaoctets
// deviennent cinquante kilo-octets, et le navigateur ne s'étrangle pas.
//
// **Elle se désigne par une CLÉ, pas par un chemin.** Un plan retouché retient
// `perso:xxxx` et non une URL : les URL d'objet changent à chaque ouverture de
// page, et une retouche enregistrée pointerait dans le vide dès le lendemain.
// `urlVisuel` fait la traduction, à un seul endroit du dessin.

const BASE = 'edit.visuels';
const MAGASIN = 'images';
const PREFIXE = 'perso:';

// La plus grande dimension d'un visuel une fois redessiné. Les illustrations
// imprimées font 642 px de large pour un Plan Large : on garde un peu de marge
// au-dessus, l'export PDF rendant les cartes plus grandes que l'écran.
export const COTE_MAX = 900;
// Ce qu'on accepte de lire. Le navigateur décode le reste au petit bonheur, et
// un fichier qui n'est pas une image ferait une carte vide sans rien dire.
export const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
// Un garde-fou à l'entrée : au-delà, c'est une photo brute ou une méprise.
export const POIDS_MAX = 25 * 1024 * 1024;

// Les URL d'objet vivent le temps de la page : on les fabrique une fois, au
// chargement, et tout le dessin y puise. `INFOS` garde de quoi les nommer dans
// l'éditeur sans relire la base.
const URLS = new Map();
const INFOS = new Map();

export const estVisuelApporte = (src) => typeof src === 'string' && src.startsWith(PREFIXE);
export const cleVisuel = (id) => `${PREFIXE}${id}`;
export const idDeCle = (src) => (estVisuelApporte(src) ? src.slice(PREFIXE.length) : '');

/**
 * L'URL à peindre. Un visuel apporté se résout par sa clé ; tout le reste — un
 * chemin sous `assets/`, une data: — passe tel quel. C'est le seul point du
 * dessin qui connaisse les deux mondes.
 *
 * Une clé inconnue rend une chaîne vide plutôt que la clé elle-même : le plan
 * s'affiche alors sans illustration, ce qui est vrai, au lieu de demander au
 * navigateur une URL qui n'existe pas.
 */
export function urlVisuel(src) {
  if (!estVisuelApporte(src)) return src || '';
  return URLS.get(idDeCle(src)) || '';
}

/** Ce que l'éditeur montre : les visuels apportés, le dernier d'abord. */
export const visuelsApportes = () => [...INFOS.values()].sort((a, b) => b.ajoutee - a.ajoutee);

export const visuelConnu = (id) => URLS.has(id);

// --- La base ---------------------------------------------------------------

let base = null;

function ouvrir() {
  if (base) return base;
  base = new Promise((resoudre, rejeter) => {
    if (!globalThis.indexedDB) { rejeter(new Error('IndexedDB indisponible')); return; }
    const d = indexedDB.open(BASE, 1);
    d.onupgradeneeded = () => {
      if (!d.result.objectStoreNames.contains(MAGASIN)) d.result.createObjectStore(MAGASIN, { keyPath: 'id' });
    };
    d.onsuccess = () => resoudre(d.result);
    d.onerror = () => rejeter(d.error || new Error('IndexedDB refusée'));
  });
  return base;
}

/** Une transaction, promise. `ecrire` dit s'il faut le droit d'écriture. */
async function transaction(ecrire, action) {
  const db = await ouvrir();
  return new Promise((resoudre, rejeter) => {
    const t = db.transaction(MAGASIN, ecrire ? 'readwrite' : 'readonly');
    let sortie;
    t.oncomplete = () => resoudre(sortie);
    t.onerror = () => rejeter(t.error);
    t.onabort = () => rejeter(t.error || new Error('transaction interrompue'));
    const demande = action(t.objectStore(MAGASIN));
    if (demande) demande.onsuccess = () => { sortie = demande.result; };
  });
}

/** Un identifiant court, lisible dans un fichier de retouches. */
const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Ouvre la réserve et fabrique les URL. À appeler AVANT le premier dessin :
 * sans elle, une carte qui porte un visuel apporté s'afficherait nue le temps
 * d'un battement, puis se rhabillerait — ce qui se voit.
 *
 * Un navigateur qui refuse IndexedDB — navigation privée verrouillée, réglage
 * strict — ne fait pas échouer le démarrage : on repart sans visuel apporté,
 * et l'éditeur le dira au moment d'en ajouter un.
 */
export async function chargerVisuels() {
  try {
    const tout = await transaction(false, (m) => m.getAll());
    for (const v of tout || []) inscrire(v);
  } catch { /* pas de réserve : le jeu tourne sans */ }
  return visuelsApportes();
}

function inscrire(v) {
  if (!v || !v.id || !v.blob) return;
  const ancienne = URLS.get(v.id);
  if (ancienne) URL.revokeObjectURL(ancienne);
  URLS.set(v.id, URL.createObjectURL(v.blob));
  INFOS.set(v.id, { id: v.id, nom: v.nom, taille: v.blob.size, ajoutee: v.ajoutee || 0,
    largeur: v.largeur || 0, hauteur: v.hauteur || 0 });
}

// --- Faire entrer une image ------------------------------------------------

/**
 * Redessine une image à la taille du jeu et la réencode. On passe par un
 * canevas plutôt que de garder le fichier tel quel : une photo de téléphone
 * pèse mille fois ce qu'une carte en montre, et la réserve du navigateur n'est
 * pas extensible.
 *
 * Le WebP est le format des visuels imprimés ; s'il n'est pas gravé — un
 * navigateur ancien —, on retombe sur le JPEG, qui l'est partout.
 */
async function redessiner(fichier) {
  const bitmap = await creerBitmap(fichier);
  const { width: w0, height: h0 } = bitmap;
  const f = Math.min(1, COTE_MAX / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * f));
  const h = Math.max(1, Math.round(h0 * f));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  const blob = await enBlob(cv, 'image/webp', 0.85) || await enBlob(cv, 'image/jpeg', 0.88);
  if (!blob) throw new Error('le navigateur n’a pas su réencoder cette image');
  return { blob, largeur: w, hauteur: h };
}

function creerBitmap(fichier) {
  if (globalThis.createImageBitmap) return createImageBitmap(fichier);
  // Repli : un <img> et une URL d'objet. Plus lent, mais universel.
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resoudre(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rejeter(new Error('image illisible')); };
    img.src = url;
  });
}

const enBlob = (cv, type, q) => new Promise((r) => {
  try { cv.toBlob((b) => r(b && b.type === type ? b : null), type, q); } catch { r(null); }
});

/**
 * Fait entrer un fichier dans la réserve et renvoie sa fiche. Le nom d'origine
 * est gardé : c'est lui qui permet de reconnaître un visuel dans la galerie,
 * une clé n'étant qu'une suite de lettres.
 */
export async function ajouterVisuel(fichier) {
  if (!fichier) throw new Error('aucun fichier');
  if (fichier.size > POIDS_MAX) {
    throw new Error(`« ${fichier.name} » pèse ${Math.round(fichier.size / 1048576)} Mo — le maximum est ${POIDS_MAX / 1048576} Mo`);
  }
  if (fichier.type && !TYPES.includes(fichier.type)) {
    throw new Error(`« ${fichier.name} » n’est pas une image que je sache lire (${fichier.type})`);
  }
  const { blob, largeur, hauteur } = await redessiner(fichier);
  const v = { id: nouvelId(), nom: fichier.name || 'image', blob, largeur, hauteur, ajoutee: Date.now() };
  await transaction(true, (m) => m.put(v));
  inscrire(v);
  return INFOS.get(v.id);
}

/** Retire un visuel de la réserve. Les plans qui le portaient perdent leur image. */
export async function retirerVisuel(id) {
  await transaction(true, (m) => m.delete(id));
  const url = URLS.get(id);
  if (url) URL.revokeObjectURL(url);
  URLS.delete(id);
  INFOS.delete(id);
}

/** Le fichier lui-même, pour le retélécharger et le poser dans `assets/`. */
export async function blobVisuel(id) {
  const v = await transaction(false, (m) => m.get(id));
  return v ? v.blob : null;
}

/** Ce que la réserve pèse en tout — l'éditeur le montre, c'est de la place. */
export const poidsVisuels = () => [...INFOS.values()].reduce((s, v) => s + v.taille, 0);
