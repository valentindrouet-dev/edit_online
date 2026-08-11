// ---------------------------------------------------------------------------
// EDIT — décompte
// ---------------------------------------------------------------------------
// Un banc de montage est une suite de « plans » (les moitiés posées, de gauche
// à droite). Chaque plan connaît son format, son minutage, ses éléments et,
// pour les Gros Plans et certains Plans Larges, son bandeau d'objectif.

const PERSONNAGES = ['FILLE', 'TUEUR', 'HOMME'];

/** Deux plans voisins raccordent-ils ? */
export function raccorde(a, b, cfg) {
  if (!a || !b) return false;
  if (cfg.raccordJoker && (a.transition === 'RACCORD' || b.transition === 'RACCORD')) return true;
  let n = 0;
  for (const e of a.el) if (b.el.includes(e)) n++;
  return n >= cfg.raccordMin;
}

/** Liste des index i tels que banc[i] et banc[i+1] raccordent. */
export function raccords(banc, cfg) {
  const out = [];
  for (let i = 0; i < banc.length - 1; i++) if (raccorde(banc[i], banc[i + 1], cfg)) out.push(i);
  return out;
}

/** Paires voisines portant les deux éléments demandés. */
function pairesAdjacentes(banc, els) {
  const [x, y] = els;
  let n = 0;
  for (let i = 0; i < banc.length - 1; i++) {
    const a = banc[i], b = banc[i + 1];
    if (x === y) {
      if (a.el.includes(x) && b.el.includes(y)) n++;
    } else if ((a.el.includes(x) && b.el.includes(y)) || (a.el.includes(y) && b.el.includes(x))) {
      n++;
    }
  }
  return n;
}

/** Valeur d'un bandeau posé en position `pos` du banc. */
export function valeurObjectif(obj, banc, pos, cfg, ctx) {
  if (!obj) return 0;
  if (cfg.objectifsActifs && cfg.objectifsActifs[obj.kind] === false) return 0;
  const n = obj.n;
  switch (obj.kind) {
    case 'RACCORD':
      return n * ctx.nbRaccords;
    case 'PLAN': {
      let v = 0;
      if (pos > 0) v++;
      if (pos < banc.length - 1) v++;
      return n * v;
    }
    case 'FORMAT':
      return n * banc.filter((p) => p.format === obj.format).length;
    case 'ELEMENT':
      return n * banc.filter((p) => p.el.includes(obj.el)).length;
    case 'PAIRE':
      return n * pairesAdjacentes(banc, obj.els);
    case 'MORT':
      return n * banc.filter((p) => p.mort).length;
    case 'NEANT':
      return n * banc.filter((p) => !p.el.some((e) => PERSONNAGES.includes(e))).length;
    case 'ABSENT':
      return banc.some((p) => p.el.includes(obj.el)) ? 0 : n;
    default:
      return 0;
  }
}

/** Bonus/malus de chronologie sur les paires voisines. */
function chrono(banc, cfg) {
  if (!cfg.chronoBonus && !cfg.chronoMalus) return { pts: 0, ordre: 0, contre: 0 };
  let ordre = 0, contre = 0;
  for (let i = 0; i < banc.length - 1; i++) {
    const a = banc[i], b = banc[i + 1];
    if (cfg.chronoIgnoreZero && (a.tc === 0 || b.tc === 0)) continue;
    if (b.tc > a.tc) ordre++;
    else if (b.tc < a.tc) contre++;
  }
  return { pts: ordre * cfg.chronoBonus - contre * cfg.chronoMalus, ordre, contre };
}

/**
 * Décompte complet d'un banc.
 * Renvoie le total et la ventilation des points par source, pour le
 * Laboratoire comme pour le panneau de score en partie.
 */
export function compter(banc, cfg) {
  const rc = raccords(banc, cfg);
  const ctx = { nbRaccords: rc.length };
  const mult = cfg.multiplicateurObjectif ?? 1;

  const detail = {
    RACCORD: 0, PLAN: 0, FORMAT: 0, ELEMENT: 0, PAIRE: 0,
    MORT: 0, NEANT: 0, ABSENT: 0, CHRONO: 0, POSE: 0, RACCORD_FIXE: 0, COMPLET: 0,
  };
  const lignes = [];

  banc.forEach((p, i) => {
    if (!p.obj) return;
    const brut = valeurObjectif(p.obj, banc, i, cfg, ctx);
    const pts = Math.round(brut * mult);
    if (pts !== 0 || brut !== 0) {
      detail[p.obj.kind] += pts;
      lignes.push({ pos: i, obj: p.obj, pts, plan: p });
    }
  });

  detail.POSE = banc.length * (cfg.pointsParPlan || 0);
  detail.RACCORD_FIXE = rc.length * (cfg.raccordPoints || 0);
  const ch = chrono(banc, cfg);
  detail.CHRONO = ch.pts;
  detail.COMPLET = banc.length >= cfg.longueurCible ? (cfg.bonusFilmComplet || 0) : 0;

  const total = Object.values(detail).reduce((a, b) => a + b, 0);

  return {
    total,
    detail,
    lignes,
    raccords: rc,
    nbRaccords: rc.length,
    chronoOrdre: ch.ordre,
    chronoContre: ch.contre,
    longueur: banc.length,
  };
}

export const SOURCES_LABEL = {
  RACCORD: 'Objectifs Raccord',
  PLAN: 'Objectifs ◀ Plan ▶',
  FORMAT: 'Objectifs de format',
  ELEMENT: 'Objectifs d’élément',
  PAIRE: 'Objectifs de paire',
  MORT: 'Objectifs Mort',
  NEANT: 'Objectifs Plan sans personnage',
  ABSENT: 'Objectifs d’absence',
  CHRONO: 'Chronologie',
  POSE: 'Points de pose',
  RACCORD_FIXE: 'Raccords (points fixes)',
  COMPLET: 'Film complet',
};
