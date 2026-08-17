// ---------------------------------------------------------------------------
// EDIT — décompte
// ---------------------------------------------------------------------------
// Le banc de montage est une suite de SÉQUENCES. Chaque séquence est une suite
// de plans visibles, de gauche à droite. Une carte posée ne laisse voir qu'un
// seul de ses plans : l'autre moitié passe sous les cartes voisines.
//
// Les bandeaux se lisent dans leur propre séquence — c'est tout l'intérêt des
// Cartes Raccord, qui soudent deux séquences et démultiplient donc les points.
// Seul le Générique compte sur le montage entier.

import { PERSONNAGES, ELEMENT_IDS, objPortee } from './data.js?v=1.32';

export function bancVide() {
  return { sequences: [], ouverture: false, fermeture: false };
}

export function tousLesPlans(banc) {
  return banc.sequences.flat();
}

export function estRaccord(p) {
  return !!p.transition;
}

/**
 * Les plans qui comptent dans le total du banc. Un Raccord, une Ouverture, un
 * Générique ne sont pas des plans : ils relient ou encadrent le film, ils ne
 * le racontent pas. Ils ne comptent donc pas dans les dix plans qui arrêtent
 * la partie.
 */
export function plansComptes(banc) {
  return tousLesPlans(banc).filter((p) => !estRaccord(p)).length;
}

/** Deux plans voisins partagent-ils assez d'éléments ? (variante hors règles) */
export function raccordeParElement(a, b, cfg) {
  if (!a || !b) return false;
  let n = 0;
  for (const e of a.el) if (b.el.includes(e)) n++;
  return n >= (cfg.raccordMin || 1);
}

/**
 * Le nombre d'icônes d'un type dans une liste de plans. Une carte peut porter
 * deux fois la même — deux armes, deux voitures : chacune compte.
 */
export function compteIcone(plans, e) {
  return plans.reduce((s, p) => s + p.el.filter((x) => x === e).length, 0);
}

/**
 * Les couples d'icônes réunis dans une portée. Quatre icônes font deux
 * couples, cinq en font deux aussi : c'est un appariement, pas une adjacence.
 * Un couple de deux icônes différentes en demande une de chaque.
 */
function couples(plans, els) {
  const [x, y] = els;
  const nx = compteIcone(plans, x);
  if (x === y) return Math.floor(nx / 2);
  return Math.min(nx, compteIcone(plans, y));
}

/**
 * Les plans qu'un bandeau regarde. Sa portée le dit : les cartes placées avant
 * lui dans le montage, celles placées après, celles de sa séquence, ou le
 * montage entier — lu de gauche à droite, séquences comprises.
 */
export function porteeDe(obj, sequence, banc, cfg, porteur) {
  const montage = tousLesPlans(banc);
  const p = objPortee(obj, cfg);
  if (p === 'SEQUENCE') return sequence;
  if (p === 'AVANT' || p === 'APRES') {
    const i = porteur ? montage.indexOf(porteur) : -1;
    if (i < 0) return [];
    return p === 'AVANT' ? montage.slice(0, i) : montage.slice(i + 1);
  }
  return montage;
}

/** Valeur d'un bandeau porté par `porteur`, dans la portée qu'il déclare. */
export function valeurObjectif(obj, sequence, banc, cfg, porteur) {
  if (!obj) return 0;
  if (cfg.objectifsActifs && cfg.objectifsActifs[obj.kind] === false) return 0;

  const portee = porteeDe(obj, sequence, banc, cfg, porteur);
  const n = obj.n;

  switch (obj.kind) {
    case 'RACCORD':
      return n * portee.filter(estRaccord).length;
    case 'PLAN':
      return n * portee.length;
    case 'FORMAT':
      return n * portee.filter((p) => p.format === obj.format).length;
    case 'ELEMENT':
      // Une carte peut porter deux fois la même icône. Par défaut chacune
      // rapporte ; `elementParIcone: false` revient à compter les plans.
      return n * (cfg.elementParIcone === false
        ? portee.filter((p) => p.el.includes(obj.el)).length
        : compteIcone(portee, obj.el));
    case 'PAIRE':
      return n * couples(portee, obj.els);
    case 'MORT':
      return n * portee.filter((p) => p.mort).length;
    case 'NEANT':
      return n * portee.filter((p) => !p.el.some((e) => PERSONNAGES.includes(e))).length;
    case 'ABSENT':
      return portee.some((p) => p.el.includes(obj.el)) ? 0 : n;
    case 'MINUTAGE':
      // Le seuil est strict : « avant 25:00 » ne compte pas un plan à 25:00.
      return n * portee.filter((p) => (obj.sens === 'APRES' ? p.tc > obj.seuil : p.tc < obj.seuil)).length;
    case 'CHRONO':
      return chronologique(portee, cfg) ? n : 0;
    case 'SANS_TC': {
      // La portée doit être vierge du minutage visé — dont le 00:00 bleu des
      // Raccords et Génériques.
      const vise = obj.sens === 'AVANT' ? (p) => p.tc < obj.seuil
        : obj.sens === 'APRES' ? (p) => p.tc > obj.seuil
          : (p) => p.tc === obj.seuil;
      return portee.some(vise) ? 0 : n;
    }
    default:
      return 0;
  }
}

/**
 * Une suite de plans se lit-elle dans l'ordre ? Chaque minutage doit être
 * supérieur ou égal à celui de son voisin de gauche. Les plans à 00:00 —
 * Raccords et Génériques — sont neutres tant que `chronoIgnoreZero` le dit.
 */
export function chronologique(plans, cfg) {
  for (let i = 0; i < plans.length - 1; i++) {
    const a = plans[i], b = plans[i + 1];
    if (cfg.chronoIgnoreZero && (a.tc === 0 || b.tc === 0)) continue;
    if (b.tc < a.tc) return false;
  }
  return true;
}

function chrono(banc, cfg) {
  if (!cfg.chronoBonus && !cfg.chronoMalus) return { pts: 0, ordre: 0, contre: 0 };
  let ordre = 0, contre = 0;
  for (const seq of banc.sequences) {
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1];
      if (cfg.chronoIgnoreZero && (a.tc === 0 || b.tc === 0)) continue;
      if (b.tc > a.tc) ordre++;
      else if (b.tc < a.tc) contre++;
    }
  }
  return { pts: ordre * cfg.chronoBonus - contre * cfg.chronoMalus, ordre, contre };
}

function jonctionsRaccordees(banc, cfg) {
  if (!cfg.raccordElement) return 0;
  let n = 0;
  for (const seq of banc.sequences) {
    for (let i = 0; i < seq.length - 1; i++) if (raccordeParElement(seq[i], seq[i + 1], cfg)) n++;
  }
  return n;
}

/** Décompte complet d'un banc, ventilé par source. */
export function compter(banc, cfg) {
  const montage = tousLesPlans(banc);
  const mult = cfg.multiplicateurObjectif ?? 1;

  const detail = {
    RACCORD: 0, PLAN: 0, FORMAT: 0, ELEMENT: 0, PAIRE: 0,
    MORT: 0, NEANT: 0, ABSENT: 0, MINUTAGE: 0, CHRONO: 0, SANS_TC: 0,
    CHRONOLOGIE: 0, POSE: 0, JONCTION: 0,
  };
  const lignes = [];

  banc.sequences.forEach((seq, si) => {
    seq.forEach((p) => {
      if (!p.obj) return;
      if (p.depart && !cfg.scorerDepart) return;
      const pts = Math.round(valeurObjectif(p.obj, seq, banc, cfg, p) * mult);
      detail[p.obj.kind] += pts;
      lignes.push({ sequence: si, obj: p.obj, pts, plan: p });
    });
  });

  detail.POSE = montage.length * (cfg.pointsParPlan || 0);
  const jr = jonctionsRaccordees(banc, cfg);
  detail.JONCTION = jr * (cfg.raccordElementPoints || 0);
  const ch = chrono(banc, cfg);
  detail.CHRONOLOGIE = ch.pts;

  const total = Object.values(detail).reduce((a, b) => a + b, 0);

  return {
    total,
    detail,
    lignes,
    recensement: recenser(banc),
    // `plans` ne compte que les vrais plans — c'est ce total qui arrête la
    // partie. `cartes` compte tout ce qui est posé, Raccords compris.
    plans: montage.filter((p) => !estRaccord(p)).length,
    cartes: montage.length,
    sequences: banc.sequences.length,
    cartesRaccord: montage.filter(estRaccord).length,
    plusLongue: banc.sequences.reduce((m, s) => Math.max(m, s.length), 0),
    jonctions: jr,
    chronoOrdre: ch.ordre,
    chronoContre: ch.contre,
  };
}

/**
 * Recensement des icônes du banc : ce que l'on compterait à la main sur la
 * table. Sert de base de lecture aux colonnes de score.
 */
export function recenser(banc) {
  const plans = tousLesPlans(banc);
  const elements = Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0]));
  const cadrages = { PL: 0, PM: 0, GP: 0, DEP: 0 };
  let morts = 0, sansPersonnage = 0, raccords = 0;

  for (const p of plans) {
    for (const e of p.el) if (elements[e] !== undefined) elements[e]++;
    if (cadrages[p.format] !== undefined) cadrages[p.format]++;
    if (p.mort) morts++;
    if (!p.el.some((e) => PERSONNAGES.includes(e))) sansPersonnage++;
    if (estRaccord(p)) raccords++;
  }

  return {
    plans: plans.length,
    elements,
    cadrages,
    morts,
    sansPersonnage,
    raccords,
    sequences: banc.sequences.length,
    plusLongue: banc.sequences.reduce((m, s) => Math.max(m, s.length), 0),
    // Les bandeaux visibles, dans l'ordre de lecture du banc.
    bandeaux: plans.filter((p) => p.obj).map((p) => p.obj),
  };
}

export const SOURCES_LABEL = {
  RACCORD: 'Génériques (par Carte Raccord)',
  PLAN: 'Raccords (par carte de la séquence)',
  FORMAT: 'Objectifs de cadrage',
  ELEMENT: 'Objectifs d’élément',
  PAIRE: 'Objectifs de couple d’icônes',
  MORT: 'Objectifs Mort',
  NEANT: 'Objectifs Plan sans personnage',
  ABSENT: 'Objectifs d’absence',
  MINUTAGE: 'Objectifs de minutage',
  SANS_TC: 'Objectifs de minutage absent',
  CHRONO: 'Objectifs de montage dans l’ordre',
  CHRONOLOGIE: 'Variante — chronologie',
  POSE: 'Points de pose',
  JONCTION: 'Jonctions raccordées',
};
