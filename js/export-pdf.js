// ---------------------------------------------------------------------------
// EDIT — export des cartes en PDF
// ---------------------------------------------------------------------------
// Un PDF par face de carte, prêt à imprimer, réunis dans une archive ZIP —
// un navigateur refuse de lancer cent vingt téléchargements de suite.
//
// Aucune bibliothèque tierce, ici non plus. Trois briques suffisent :
//
//   1. `rasterCarte` — la carte est dessinée en HTML/CSS ; on l'enferme dans un
//      <foreignObject> SVG avec la feuille de style et ses images en data:,
//      puis on peint ce SVG sur un canvas. Tout est en ligne, donc le canvas
//      n'est pas souillé et `toDataURL` répond.
//   2. `pdfJpeg` — un PDF d'une page dont l'unique contenu est l'image JPEG,
//      posée à fond perdu sur la page. Le JPEG entre tel quel dans le fichier :
//      c'est le filtre DCTDecode, que tout lecteur de PDF sait relire.
//   3. `zipStore` — une archive sans compression (méthode « stored ») : des
//      JPEG et des PDF ne se compressent de toute façon pas.

// --- La carte, en pixels ---------------------------------------------------

const cacheURI = new Map();

/** Une image du site, en data: — seul format qu'un SVG peint accepte. */
async function enDataURI(url) {
  if (cacheURI.has(url)) return cacheURI.get(url);
  const p = fetch(url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status} sur ${url}`))))
    .then((b) => new Promise((ok, ko) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = () => ko(fr.error);
      fr.readAsDataURL(b);
    }));
  cacheURI.set(url, p);
  return p;
}

let cssEnLigne = null;

/**
 * La feuille de style du site, prête à être enfermée dans le SVG.
 * `:root` y désigne l'élément racine du document — dans un SVG isolé, ce n'est
 * plus le <html> du site : on double donc le sélecteur d'une classe posée sur
 * l'enveloppe, pour que les variables de couleur suivent.
 */
async function cssCartes(version) {
  if (cssEnLigne) return cssEnLigne;
  const txt = await fetch(`css/styles.css?v=${version}`).then((r) => r.text());
  cssEnLigne = txt.replace(/(^|\})\s*:root\b/g, '$1 :root, .carte-export');
  return cssEnLigne;
}

/**
 * Une carte rendue en JPEG. `html` est ce que renderCarte a produit ; `large`
 * est la largeur voulue en pixels — c'est elle qui fixe la définition, la
 * carte étant décrite en em et se mettant donc à l'échelle d'un bloc.
 */
export async function rasterCarte(html, large, css) {
  // Le gabarit d'écran fait 300 px de large pour 15 px de corps : on garde le
  // rapport, et tout — icônes, bandeaux, libellés — grandit avec.
  const haut = Math.round(large * 227 / 317);
  const hote = document.createElement('div');
  hote.className = 'carte-export';
  hote.setAttribute('style', `width:${large}px;height:${haut}px;overflow:hidden;`
    + `font-family:"Inter","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;`);
  hote.innerHTML = html;
  const carte = hote.firstElementChild;
  carte.setAttribute('style', `width:${large}px;font-size:${large * 15 / 300}px;`
    + 'box-shadow:none;border-radius:0;margin:0;');

  // Un SVG peint ne va rien chercher sur le réseau : tout ce que la carte
  // montre doit voyager avec lui. Les pastilles sont des <img> ; l'illustration
  // est un fond posé en style inline — deux chemins, deux récoltes.
  await Promise.all([
    ...[...hote.querySelectorAll('img[src]')].map(async (im) => {
      const src = im.getAttribute('src');
      if (src.startsWith('data:')) return;
      im.setAttribute('src', await enDataURI(src));
    }),
    ...[...hote.querySelectorAll('[style*="background-image"]')].map(async (el) => {
      const st = el.getAttribute('style');
      const m = st.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
      if (!m || m[1].startsWith('data:')) return;
      el.setAttribute('style', st.replace(m[1], await enDataURI(m[1])));
    }),
  ]);

  const corps = new XMLSerializer().serializeToString(hote);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${large}" height="${haut}" viewBox="0 0 ${large} ${haut}">`
    + `<foreignObject x="0" y="0" width="${large}" height="${haut}">`
    + `<div xmlns="http://www.w3.org/1999/xhtml"><style><![CDATA[${css}]]></style>${corps}</div>`
    + '</foreignObject></svg>';

  const img = new Image();
  img.width = large; img.height = haut;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const cv = document.createElement('canvas');
  cv.width = large; cv.height = haut;
  const ctx = cv.getContext('2d');
  // Le JPEG ne connaît pas la transparence : sans fond, elle noircirait.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, large, haut);
  ctx.drawImage(img, 0, 0, large, haut);
  return { jpeg: base64Bytes(cv.toDataURL('image/jpeg', 0.94).split(',')[1]), large, haut };
}

function base64Bytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- Le PDF ----------------------------------------------------------------

const octets = (s) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

function coller(morceaux) {
  const n = morceaux.reduce((s, m) => s + m.length, 0);
  const out = new Uint8Array(n);
  let k = 0;
  for (const m of morceaux) { out.set(m, k); k += m.length; }
  return out;
}

/**
 * Un PDF d'une page, à la taille physique demandée, entièrement occupée par
 * l'image. Le JPEG y entre sans être retouché : le PDF sait le relire tel quel
 * (filtre DCTDecode), il n'y a donc ni recompression ni perte.
 */
export function pdfJpeg(jpeg, largePx, hautPx, largeMm, hautMm) {
  const pt = (mm) => Math.round((mm * 72 / 25.4) * 100) / 100;
  const L = pt(largeMm), H = pt(hautMm);
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${L} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    null,  // l'image, posée à part : son flux est binaire
    null,  // le contenu de la page
  ];
  const contenu = `q ${L} 0 0 ${H} 0 0 cm /Im0 Do Q`;

  const morceaux = [];
  const offsets = [];
  let taille = 0;
  const pousser = (u8) => { morceaux.push(u8); taille += u8.length; };
  pousser(octets('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));

  const objet = (i, tete, flux) => {
    offsets[i] = taille;
    pousser(octets(`${i} 0 obj\n${tete}\n`));
    if (flux) {
      pousser(octets('stream\n'));
      pousser(flux);
      pousser(octets('\nendstream\n'));
    }
    pousser(octets('endobj\n'));
  };

  objet(1, objets[0]);
  objet(2, objets[1]);
  objet(3, objets[2]);
  objet(4, '<< /Type /XObject /Subtype /Image /Width ' + largePx + ' /Height ' + hautPx
    + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>', jpeg);
  objet(5, `<< /Length ${contenu.length} >>`, octets(contenu));

  const debutXref = taille;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;
  pousser(octets(xref));
  return coller(morceaux);
}

// --- L'archive -------------------------------------------------------------

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const u16 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
const u32 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

/**
 * Une archive ZIP sans compression. Des PDF pleins de JPEG ne se compressent
 * pas — la méthode « stored » évite d'écrire un compresseur pour rien.
 */
export function zipStore(fichiers, quand = new Date()) {
  const heure = ((quand.getHours() << 11) | (quand.getMinutes() << 5) | (quand.getSeconds() >> 1)) & 0xffff;
  const date = (((quand.getFullYear() - 1980) << 9) | ((quand.getMonth() + 1) << 5) | quand.getDate()) & 0xffff;
  const locaux = [];
  const central = [];
  let position = 0;

  for (const f of fichiers) {
    const nom = new TextEncoder().encode(f.nom);
    const crc = crc32(f.data);
    // Le drapeau 0x0800 dit que le nom est en UTF-8.
    const commun = [u16(20), u16(0x0800), u16(0), u16(heure), u16(date),
      u32(crc), u32(f.data.length), u32(f.data.length), u16(nom.length)];
    locaux.push(coller([u32(0x04034b50), ...commun, u16(0), nom, f.data]));
    // En-tête central : … longueur d'extra, longueur de commentaire, numéro de
    // disque, attributs **internes sur deux octets**, attributs externes sur
    // quatre, puis la position de l'en-tête local. Deux octets de trop sur les
    // attributs internes et tout ce qui suit se décale : le lecteur trouve bien
    // la première entrée, puis du charabia à la place de la seconde.
    central.push(coller([u32(0x02014b50), u16(20), ...commun, u16(0), u16(0), u16(0),
      u16(0), u32(0), u32(position), nom]));
    position += 30 + nom.length + f.data.length;
  }

  const corpsCentral = coller(central);
  const fin = coller([u32(0x06054b50), u16(0), u16(0), u16(fichiers.length), u16(fichiers.length),
    u32(corpsCentral.length), u32(position), u16(0)]);
  return coller([...locaux, corpsCentral, fin]);
}

// --- Le fil complet --------------------------------------------------------

/**
 * Rend chaque face, l'enveloppe dans son PDF, et rend l'archive. `faces` est
 * une liste de `{ nom, html }` ; `avance(fait, total)` suit le travail — il y
 * a plus de cent cartes, et chacune demande un aller-retour par le décodeur
 * d'images du navigateur.
 */
export async function archiveCartes(faces, { largeurMm = 88, largeurPx = 1040, version = '', avance } = {}) {
  const css = await cssCartes(version);
  const hautMm = Math.round((largeurMm * 227 / 317) * 100) / 100;
  const fichiers = [];
  for (const [i, f] of faces.entries()) {
    if (avance) avance(i, faces.length);
    // eslint-disable-next-line no-await-in-loop -- une carte à la fois : cent
    // canvas de front feraient tomber l'onglet, et l'avancement doit se voir.
    const { jpeg, large, haut } = await rasterCarte(f.html, largeurPx, css);
    fichiers.push({ nom: `${f.nom}.pdf`, data: pdfJpeg(jpeg, large, haut, largeurMm, hautMm) });
  }
  if (avance) avance(faces.length, faces.length);
  return zipStore(fichiers);
}
