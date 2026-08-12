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

import { PERSONNAGES, ELEMENT_IDS, objPortee } from './data.js?v=1.10';

export function bancVide() {
  return { sequences: [], ouverture: false, fermeture: false };
}

export function tousLesPlans(banc) {
  return banc.sequences.flat();
}

export function estRaccord(p) {
  return !!p.transition;
}

/** Deux plans voisins partagent-ils assez d'éléments ? (variante hors règles) */
export function raccordeParElement(a, b, cfg) {
  if (!a || !b) return false;
  let n = 0;
  for (const e of a.el) if (b.el.includes(e)) n++;
  return n >= (cfg.raccordMin || 1);
}

function pairesAdjacentes(plans, els) {
  const [x, y] = els;
  let n = 0;
  for (let i = 0; i < plans.length - 1; i++) {
    const a = plans[i], b = plans[i + 1];
    if (x === y) {
      if (a.el.includes(x) && b.el.includes(y)) n++;
    } else if ((a.el.includes(x) && b.el.includes(y)) || (a.el.includes(y) && b.el.includes(x))) {
      n++;
    }
  }
  return n;
}

/**
 * Valeur d'un bandeau porté par `sequence`, lu dans le banc `banc`.
 * La portée est la séquence porteuse, sauf pour le Générique — ou si les
 * variables imposent la portée « montage entier ».
 */
export function valeurObjectif(obj, sequence, banc, cfg) {
  if (!obj) return 0;
  if (cfg.objectifsActifs && cfg.objectifsActifs[obj.kind] === false) return 0;

  const montage = tousLesPlans(banc);
  const large = objPortee(obj) === 'MONTAGE' || cfg.porteeParDefaut === 'MONTAGE';
  const portee = large ? montage : sequence;
  const groupes = large ? banc.sequences : [sequence];
  const n = obj.n;

  switch (obj.kind) {
    case 'RACCORD':
      // Le Générique rapporte n points par Carte Raccord du montage.
      return n * montage.filter(estRaccord).length;
    case 'PLAN':
      // Le Raccord rapporte n points par carte de sa séquence.
      return n * sequence.length;
    case 'FORMAT':
      return n * portee.filter((p) => p.format === obj.format).length;
    case 'ELEMENT':
      return n * portee.filter((p) => p.el.includes(obj.el)).length;
    case 'PAIRE':
      // Une paire ne se lit qu'entre deux plans voisins d'une même séquence.
      return n * groupes.reduce((s, g) => s + pairesAdjacentes(g, obj.els), 0);
    case 'MORT':
      return n * portee.filter((p) => p.mort).length;
    case 'NEANT':
      return n * portee.filter((p) => !p.el.some((e) => PERSONNAGES.includes(e))).length;
    case 'ABSENT':
      return montage.some((p) => p.el.includes(obj.el)) ? 0 : n;
    default:
      return 0;
  }
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
    MORT: 0, NEANT: 0, ABSENT: 0, CHRONO: 0, POSE: 0, JONCTION: 0,
  };
  const lignes = [];

  banc.sequences.forEach((seq, si) => {
    seq.forEach((p) => {
      if (!p.obj) return;
      if (p.depart && !cfg.scorerDepart) return;
      const pts = Math.round(valeurObjectif(p.obj, seq, banc, cfg) * mult);
      detail[p.obj.kind] += pts;
      lignes.push({ sequence: si, obj: p.obj, pts, plan: p });
    });
  });

  detail.POSE = montage.length * (cfg.pointsParPlan || 0);
  const jr = jonctionsRaccordees(banc, cfg);
  detail.JONCTION = jr * (cfg.raccordElementPoints || 0);
  const ch = chrono(banc, cfg);
  detail.CHRONO = ch.pts;

  const total = Object.values(detail).reduce((a, b) => a + b, 0);

  return {
    total,
    detail,
    lignes,
    recensement: recenser(banc),
    plans: montage.length,
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
  const cadrages = { PL: 0, PM: 0, GP: 0 };
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
  PAIRE: 'Objectifs de paire',
  MORT: 'Objectifs Mort',
  NEANT: 'Objectifs Plan sans personnage',
  ABSENT: 'Objectifs d’absence',
  CHRONO: 'Chronologie',
  POSE: 'Points de pose',
  JONCTION: 'Jonctions raccordées',
};
