// ---------------------------------------------------------------------------
// EDIT — rendu des cartes
// ---------------------------------------------------------------------------
// Une carte n'apporte que son illustration : le minutage, les pastilles, le
// bandeau d'objectif et le libellé de cadrage sont entièrement redessinés par
// l'application, à partir de ses propres données. Les images d'assets/ sont
// recadrées au-dessus de la zone d'information et leur minutage imprimé est
// effacé — voir outils/extraire-visuels.py.
//
// Les proportions reprennent la carte réelle : illustration jusqu'à 69 % de la
// hauteur, languette des pastilles jusqu'à 78,5 %, bandeau jusqu'à 93,7 %,
// puis le libellé.

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel, tcTexte, objPortee, PORTEES, objsDe, teinteObj, encreLibelle } from './data.js?v=1.58';
import { elIcon, numIcon, cadrageIcon } from './icons.js?v=1.58';

export function tc(min) {
  return `${String(Math.floor(min)).padStart(2, '0')}:00`;
}

/**
 * Le contenu d'un bandeau d'objectif, en icônes. `compact` sert au Gros Plan,
 * dont le bandeau ne fait qu'un tiers de carte : on y renonce à l'étiquette
 * « ◀ Plan ▶ », que l'aperçu au survol donne de toute façon en toutes lettres.
 */
export function objContenu(obj, taille, compact, cfg) {
  if (!obj) return '';
  const p = PORTEES.find((x) => x.id === objPortee(obj, cfg)) || PORTEES[3];
  // La flèche prend la couleur de ce qu'elle entoure : rouge sombre autour de
  // l'Ennemi, brun autour d'un Véhicule. On la voit ainsi comme une partie de
  // l'icône, et non comme une décoration posée à côté.
  const teinte = teinteObj(obj);
  const fleche = (cote) => (p[cote]
    ? `<span class="fleche-pos" style="--fl:${teinte}">${cote === 'gauche' ? '◀' : '▶'}</span>` : '');
  // Les flèches se serrent contre ce qu'elles portent : elles en font partie.
  // Les pièces du cœur, elles, sont des mots distincts — « Séquence » et sa
  // flèche, « Plan » et son seuil, deux cadrages — et respirent : dans un
  // conteneur flex, les espaces du HTML ne comptent pas, il leur faut un gap.
  return `<span class="obj-noyau">${fleche('gauche')}<span class="obj-coeur">${
    objCoeur(obj, taille, compact)}</span>${fleche('droite')}</span>`;
}

/**
 * La croix de l'interdit, sur une icône que le bandeau veut absente. Deux
 * barres plutôt qu'un caractère : un « ✕ » de fonte, agrandi jusqu'à se voir,
 * finit par recouvrir l'icône et l'on ne sait plus ce qui est interdit. Deux
 * barres laissent quatre quartiers ouverts — la croix domine, l'icône se lit
 * encore. Le liseré blanc la détache de tout ce qu'elle recouvre.
 */
function croixNon() {
  const traits = '<line x1="15" y1="15" x2="85" y2="85"/><line x1="85" y1="15" x2="15" y2="85"/>';
  return `<span class="croix-non" aria-hidden="true"><svg viewBox="0 0 100 100">
    <g stroke="#fff" stroke-width="19" stroke-linecap="round" opacity=".9">${traits}</g>
    <g stroke="#e0102f" stroke-width="10.5" stroke-linecap="round">${traits}</g>
  </svg></span>`;
}

/** Ce que le bandeau compte, sans les flèches de portée. */
function objCoeur(obj, taille, compact) {
  switch (obj.kind) {
    case 'RACCORD': return `<span class="tag tag-gris">Raccord</span>`;
    case 'PLAN':    return `<span class="tag tag-blanc">Plan</span>`;
    case 'FORMAT':  return tagCadrage(obj.format, compact)
      + (obj.format2 ? `<span class="et-cadrage">&amp;</span>${tagCadrage(obj.format2, compact)}` : '');
    case 'ELEMENT': return elIcon(obj.el, taille);
    case 'PAIRE':   return `<span class="paire">${elIcon(obj.els[0], taille)}<i></i>${elIcon(obj.els[1], taille)}</span>`;
    case 'MORT':    return elIcon('MORT', taille);
    case 'NEANT':   return elIcon('NEANT', taille);
    case 'ABSENT':  return `<span class="barre">${elIcon(obj.el, taille)}${croixNon()}</span>`;
    // Sur un bandeau, la place manque : « avant / après » se lit « < » et « > ».
    // Le libellé en toutes lettres reste dans l'aperçu au survol.
    case 'MINUTAGE': return `${compact ? '' : '<span class="tag tag-blanc">Plan</span>'}
      <span class="tc-seuil">${obj.sens === 'APRES' ? '&gt;' : '&lt;'}&nbsp;${tcTexte(obj.seuil)}</span>`;
    case 'CHRONO':  return `<span class="tag tag-chrono">↗ ordre</span>`;
    case 'SANS_TC': return `<span class="barre"><span class="tc-seuil">${
      obj.sens === 'AVANT' ? '&lt;' : obj.sens === 'APRES' ? '&gt;' : '='
    }&nbsp;${tcTexte(obj.seuil)}</span>${croixNon()}</span>`;
    // Les bandeaux de séquence : la pastille violette dit qu'on compte des
    // séquences et non des plans, et ce qui la suit dit lesquelles.
    case 'SEQ_TAILLE': return `${tagSeq(compact)}
      <span class="tc-seuil">≥&nbsp;${obj.seuil}</span>`;
    case 'SEQ_VOISINES': return `${tagSeq(compact)}
      <span class="fleche-seq">${obj.sens === 'APRES' ? '▼' : '▲'}</span>`;
    // « La plus longue » : on compte ses plans, d'où la pastille Plan.
    case 'SEQ_LONGUE': return `<span class="tag tag-blanc">Plan</span>
      <span class="tag tag-seq">${compact ? 'séq. ⌀' : 'plus longue séq.'}</span>`;
    case 'SEQ_AVEC': {
      const quoi = obj.cible === 'RACCORD' ? '<span class="tag tag-gris">Raccord</span>'
        : FORMATS[obj.cible] ? `<span class="tag tag-fmt" style="--c:${FORMATS[obj.cible].color}">${
          compact ? FORMATS[obj.cible].short : FORMATS[obj.cible].label}</span>`
          : elIcon(obj.cible, taille);
      return `${tagSeq(compact)}${obj.sens === 'SANS'
        ? `<span class="barre">${quoi}${croixNon()}</span>` : quoi}`;
    }
    default: return '';
  }
}

/** L'étiquette d'un cadrage, dans sa couleur. */
function tagCadrage(f, compact) {
  return `<span class="tag tag-fmt" style="--c:${FORMATS[f].color}">${
    compact ? FORMATS[f].short : FORMATS[f].label}</span>`;
}

/** La pastille « Séquence » des bandeaux qui comptent des séquences. */
function tagSeq(compact) {
  return `<span class="tag tag-seq">${compact ? 'Séq.' : 'Séquence'}</span>`;
}

/** L'objectif en entier — « 2 × ⛨ » — pour les cartes et les tableaux. */
export function objHTML(obj, taille, cfg) {
  if (!obj) return '';
  const n = numIcon(obj.n, taille);
  return `<span class="obj-html">${n}<span class="${estSi(obj) ? 'si' : 'x'}">${estSi(obj) ? 'si' : '×'}</span>${objContenu(obj, taille, false, cfg)}</span>`;
}

/** Les bandeaux qui se lisent « n si … » plutôt que « n × … ». */
const OBJ_SI = ['ABSENT', 'CHRONO', 'SANS_TC'];
export const estSi = (o) => !!o && OBJ_SI.includes(o.kind);

/**
 * Le bandeau d'un plan — un pouvoir, deux, ou aucun. Deux pouvoirs se posent
 * côte à côte, séparés d'un trait : ils comptent tous les deux. La place étant
 * alors deux fois plus courte, ils se lisent en version compacte, comme sur un
 * Gros Plan.
 */
function bandeau(objs, format) {
  // Même sans objectif le bandeau reste : c'est lui qui aligne le bas des
  // deux moitiés d'une carte.
  if (!objs.length) return '<div class="bandeau sans-objectif"></div>';
  const compact = format === 'GP' || objs.length > 1;
  const un = (o) => `<span class="bandeau-obj">${numIcon(o.n)}<span class="${
    estSi(o) ? 'si' : 'x'}">${estSi(o) ? 'si' : '×'}</span>${objContenu(o, undefined, compact)}</span>`;
  return `<div class="bandeau ${objs.length > 1 ? 'deux' : ''}">${
    objs.map(un).join('<i class="bandeau-sep"></i>')}</div>`;
}

/**
 * Les données que le pop-up de survol affiche en grand. `points` n'est fourni
 * que sur un banc de montage : c'est ce que cette carte-là rapporte, ici et
 * maintenant.
 */
function donneesApercu(h, label, points, detail) {
  return encodeURIComponent(JSON.stringify({
    tc: h.tc, el: h.el, objs: objsDe(h), format: h.format,
    num: h.num, label, transition: h.transition || null,
    mort: !!h.mort,
    points: points === undefined ? null : points,
    // Ce que chaque bandeau rapporte séparément : l'infobulle montre le calcul
    // plutôt qu'un total à croire sur parole.
    objsPts: detail || null,
  }));
}

/** Un plan : moitié de carte, ou Plan Large pleine largeur. */
export function renderPlan(h, opts = {}) {
  const F = FORMATS[h.transition ? 'TR' : h.format] || FORMATS.PM;
  // Un Plan Large et un Plan de départ occupent toute la carte.
  const large = h.format === 'PL' || h.format === 'DEP';
  // `neuf` marque le plan qui vient d'être posé : c'est là que la carte en vol
  // doit atterrir.
  const cls = ['moitie', `f-${h.format}`, h.transition ? 'transition' : '', h.depart ? 'depart' : '',
    opts.clickable ? 'choisissable' : '', opts.selected ? 'choisi' : '', opts.neuf ? 'neuf' : ''].join(' ');
  const flex = large ? '1 1 100%' : (h.format === 'GP' ? '0 0 33.6%' : '1 1 66.4%');
  // Le libellé du bas dit le TYPE du plan, pas son rôle : une Ouverture, un
  // Générique de fin et un Raccord sont tous trois des Raccords. Ce que la
  // carte fait — ouvrir, fermer, relier — se lit à son illustration et aux
  // emplacements qu'elle propose.
  const label = h.depart ? 'Plan de départ' : F.label;
  // L'image est posée en style inline : dans une variable CSS, url() se
  // résoudrait contre la feuille de style et non contre le document.
  const fond = h.image ? `background-image:url('${h.image}');` : '';
  // Le crâne se lit avec les autres : c'est une icône de la carte, pas un état.
  const icones = h.mort ? [...h.el, 'MORT'] : h.el;
  // Ce que ce plan-là rapporte, ici et maintenant : un jeton au coin, en face
  // du minutage. Il n'apparaît qu'au montage, où le calcul a un sens.
  // Un plan peut coûter des points autant qu'il peut en rapporter : le jeton
  // passe alors au rouge, avec son signe.
  const jeton = opts.points === undefined ? ''
    : `<div class="jeton-pts ${opts.points < 0 ? 'negatif' : (opts.points ? '' : 'nul')}"
        title="Ce que ce plan rapporte">${opts.points}</div>`;
  // `muet` : un plan qui n'est pas vraiment sur la table — un aperçu de pose —
  // n'ouvre pas d'infobulle et ne se donne pas pour une carte du banc.
  const bulle = opts.muet ? '' : ` data-apercu="${donneesApercu(h, label, opts.points, opts.detail)}"`;
  return `<div class="${cls}" style="--flex:${flex}" data-format="${h.format}" data-num="${h.num}"${bulle}>
    ${jeton}
    <div class="illus" style="${fond}">
      <div class="tcode ${h.tc === 0 || h.transition ? 'bleu' : ''}">${tc(h.tc)}</div>
    </div>
    <div class="pastilles ${icones.length ? '' : 'vide'}" style="--n:${Math.max(1, icones.length)}">${icones.map((e) => elIcon(e)).join('')}</div>
    ${bandeau(objsDe(h), h.format)}
    <div class="libelle" style="--c:${encreLibelle(h.format, !!h.transition)}">${label}</div>
  </div>`;
}

/** Une carte entière. `verso` échange la position des deux moitiés. */
export function renderCarte(carte, verso, opts = {}) {
  // Le recto porte le Plan Moyen à gauche et le Gros Plan à droite ; le verso,
  // retourné autour de l'axe vertical, les échange. Il ne se contente pas
  // d'inverser les moitiés du recto : ce sont d'autres plans, avec leur propre
  // minutage. Il faut donc les demander.
  const m = carte.type === 'DOUBLE' ? moitiesDe(carte, verso ? 'V' : 'R') : null;
  const plans = m ? (verso ? [m.GP, m.PM] : [m.PM, m.GP]) : [plHalf(carte)];
  const cls = ['carte', opts.selected ? 'sel' : '', opts.small ? 'small' : '', opts.tiny ? 'tiny' : '',
    opts.clickable ? 'clickable' : '', opts.moitiesChoisissables ? 'choix-moitie' : ''].join(' ');
  return `<div class="${cls}" data-carte="${carte.id}" data-verso="${verso ? 1 : 0}">
    ${plans.map((h) => renderPlan(h, {
      ...opts,
      // Au montage, la carte reste entière : c'est la moitié que l'on désigne.
      selected: opts.formatChoisi ? opts.formatChoisi === h.format : opts.selected,
    })).join('')}
  </div>`;
}

/**
 * Le dos d'une pioche, au format d'une carte. Seuls les Plans Larges ont un
 * vrai dos : les cartes Plan Moyen / Gros Plan étant recto-verso, leur pioche
 * montre toujours sa face du dessus.
 */
/** Enveloppe une carte d'un effet de pile : des cartes décalées dessous. */
export function enPile(html, reste) {
  const epaisseur = Math.min(3, Math.max(1, Math.ceil(reste / 12)));
  return `<div class="pile" data-epaisseur="${epaisseur}">
    ${Array.from({ length: epaisseur }, (_, i) => `<span class="pile-couche" style="--i:${i + 1}"></span>`).join('')}
    ${html}
  </div>`;
}

export function renderDos(libelle, reste, opts = {}) {
  const cls = ['carte', 'dos', opts.small ? 'small' : '', opts.clickable ? 'clickable' : ''].join(' ');
  // Le dos d'une pioche de Plans Larges est un **Plan Large vierge** : le vert
  // du cadrage, la bande des pastilles, le bandeau, le libellé — la carte telle
  // qu'elle est, sans rien dessus —, et un point d'interrogation à la place de
  // l'illustration. On ne sait pas ce qui vient, mais on sait que c'est un
  // Plan Large.
  const F = FORMATS.PL;
  return `<div class="${cls}" title="${libelle}">
    <div class="moitie f-PL dos-vierge" style="--flex:1 1 100%">
      <div class="illus"><span class="dos-question">?</span></div>
      <div class="pastilles"></div>
      <div class="bandeau"></div>
      <div class="libelle" style="--c:${F.color}">${F.label}</div>
    </div>
  </div>`;
}

/** Fiche texte d'une carte, ses quatre plans — deux par face. */
export function ficheCarte(carte) {
  const plans = carte.type === 'DOUBLE'
    ? [...Object.values(moitiesDe(carte, 'R')), ...Object.values(moitiesDe(carte, 'V'))]
    : [plHalf(carte)];
  return plans.map((h) => {
    const els = h.el.map((e) => ELEMENTS[e].label).join(', ') || '—';
    return `${h.transition || FORMATS[h.format].label} n°${h.num} · ${tc(h.tc)} · ${els}`;
  }).join(' | ');
}

export { cadrageIcon };
