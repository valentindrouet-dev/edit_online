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

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel, tcTexte, objPortee, PORTEES } from './data.js?v=1.23';
import { elIcon, numIcon, cadrageIcon } from './icons.js?v=1.23';

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
  const fleche = (cote) => (p[cote] ? `<span class="fleche-pos">${cote === 'gauche' ? '◀' : '▶'}</span>` : '');
  // Les flèches se serrent contre ce qu'elles portent : elles en font partie,
  // et sur un Gros Plan chaque dixième d'em compte.
  return `<span class="obj-noyau">${fleche('gauche')}${objCoeur(obj, taille, compact)}${fleche('droite')}</span>`;
}

/** Ce que le bandeau compte, sans les flèches de portée. */
function objCoeur(obj, taille, compact) {
  switch (obj.kind) {
    case 'RACCORD': return `<span class="tag tag-gris">Raccord</span>`;
    case 'PLAN':    return `<span class="tag tag-blanc">Plan</span>`;
    case 'FORMAT':  return `<span class="tag tag-fmt" style="--c:${FORMATS[obj.format].color}">${compact ? FORMATS[obj.format].short : FORMATS[obj.format].label}</span>`;
    case 'ELEMENT': return elIcon(obj.el, taille);
    case 'PAIRE':   return `<span class="paire">${elIcon(obj.els[0], taille)}<i></i>${elIcon(obj.els[1], taille)}</span>`;
    case 'MORT':    return elIcon('MORT', taille);
    case 'NEANT':   return elIcon('NEANT', taille);
    case 'ABSENT':  return `<span class="barre">${elIcon(obj.el, taille)}<b>✕</b></span>`;
    // Sur un bandeau, la place manque : « avant / après » se lit « < » et « > ».
    // Le libellé en toutes lettres reste dans l'aperçu au survol.
    case 'MINUTAGE': return `${compact ? '' : '<span class="tag tag-blanc">Plan</span>'}
      <span class="tc-seuil">${obj.sens === 'APRES' ? '&gt;' : '&lt;'}&nbsp;${tcTexte(obj.seuil)}</span>`;
    case 'CHRONO':  return `<span class="tag tag-chrono">↗ ordre</span>`;
    case 'SANS_TC': return `<span class="barre"><span class="tc-seuil">${
      obj.sens === 'AVANT' ? '&lt;' : obj.sens === 'APRES' ? '&gt;' : '='
    }&nbsp;${tcTexte(obj.seuil)}</span><b>✕</b></span>`;
    default: return '';
  }
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

function bandeau(obj, format) {
  // Même sans objectif le bandeau reste : c'est lui qui aligne le bas des
  // deux moitiés d'une carte.
  if (!obj) return '<div class="bandeau sans-objectif"></div>';
  const contenu = `${numIcon(obj.n)}<span class="${estSi(obj) ? 'si' : 'x'}">${estSi(obj) ? 'si' : '×'}</span>${objContenu(obj, undefined, format === 'GP')}`;
  return `<div class="bandeau">${contenu}</div>`;
}

/**
 * Les données que le pop-up de survol affiche en grand. `points` n'est fourni
 * que sur un banc de montage : c'est ce que cette carte-là rapporte, ici et
 * maintenant.
 */
function donneesApercu(h, label, points) {
  return encodeURIComponent(JSON.stringify({
    tc: h.tc, el: h.el, obj: h.obj || null, format: h.format,
    num: h.num, label, transition: h.transition || null,
    mort: !!h.mort,
    points: points === undefined ? null : points,
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
  const label = h.depart ? 'Plan de départ' : (h.transition ? h.transition.toLowerCase() : F.label);
  // L'image est posée en style inline : dans une variable CSS, url() se
  // résoudrait contre la feuille de style et non contre le document.
  const fond = h.image ? `background-image:url('${h.image}');` : '';
  // Le crâne se lit avec les autres : c'est une icône de la carte, pas un état.
  const icones = h.mort ? [...h.el, 'MORT'] : h.el;
  // Ce que ce plan-là rapporte, ici et maintenant : un jeton au coin, en face
  // du minutage. Il n'apparaît qu'au montage, où le calcul a un sens.
  const jeton = opts.points === undefined ? ''
    : `<div class="jeton-pts ${opts.points ? '' : 'nul'}" title="Ce que ce plan rapporte">${opts.points}</div>`;
  return `<div class="${cls}" style="--flex:${flex}" data-format="${h.format}" data-num="${h.num}"
      data-apercu="${donneesApercu(h, label, opts.points)}">
    ${jeton}
    <div class="illus" style="${fond}">
      <div class="tcode ${h.tc === 0 || h.transition ? 'bleu' : ''}">${tc(h.tc)}</div>
    </div>
    <div class="pastilles" style="--n:${Math.max(1, icones.length)}">${icones.map((e) => elIcon(e)).join('')}</div>
    ${bandeau(h.obj, h.format)}
    <div class="libelle" style="--c:${F.color}">${label}</div>
  </div>`;
}

/** Une carte entière. `verso` échange la position des deux moitiés. */
export function renderCarte(carte, verso, opts = {}) {
  // Le verso ne se contente pas d'inverser les deux moitiés du recto : ce sont
  // d'autres plans, avec leur propre minutage. Il faut donc les demander.
  const m = carte.type === 'DOUBLE' ? moitiesDe(carte, verso ? 'V' : 'R') : null;
  const plans = m ? (verso ? [m.PM, m.GP] : [m.GP, m.PM]) : [plHalf(carte)];
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
  return `<div class="${cls}">
    <div class="dos-motif">
      <span class="dos-titre">${libelle}</span>
      <span class="dos-reste">${reste} carte${reste > 1 ? 's' : ''}</span>
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
