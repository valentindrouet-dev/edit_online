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

import { PERSONNAGES, ELEMENT_IDS, CADRAGES_VISABLES, objPortee, objsDe } from './data.js?v=1.75';

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
 * Les plans qu'un bandeau regarde. Sa portée le dit, et **trois des quatre
 * portées ne quittent pas la ligne du plan** :
 *
 *   ◀ Héroïne    sa ligne, de son début jusqu'à cette carte comprise
 *   Héroïne ▶    sa ligne, de cette carte comprise jusqu'à son bout
 *   ◀ Héroïne ▶  sa ligne entière
 *   Héroïne      le montage entier — la seule qui en sorte
 *
 * « Avant » et « après » désignent donc une place **dans la séquence**, pas
 * dans le film : une ligne posée au-dessus n'est pas « avant », elle est
 * ailleurs. Les flèches disent de quel côté du plan on compte, et le banc en
 * lignes rend cela littéral — c'est ce qui se voit sur la table.
 */
export function porteeDe(obj, sequence, banc, cfg, porteur) {
  const montage = tousLesPlans(banc);
  // « Dans l'ordre » se lit sur le film entier, de gauche à droite : c'est le
  // montage que l'on juge, pas un morceau. Une séquence bien rangée à côté
  // d'une autre qui ne l'est pas ne fait pas un film dans l'ordre.
  if (obj.kind === 'CHRONO') return montage;
  const p = objPortee(obj, cfg);
  if (p === 'SEQUENCE') return sequence;
  if (p === 'AVANT' || p === 'APRES') {
    // La ligne du porteur. `sequence` la donne d'ordinaire ; on la retrouve
    // dans le banc si l'appelant s'est trompé de séquence.
    const ligne = sequence && sequence.includes(porteur)
      ? sequence : banc.sequences.find((s) => s.includes(porteur));
    const i = ligne ? ligne.indexOf(porteur) : -1;
    if (i < 0) return [];
    // **La carte qui porte le bandeau compte pour elle-même.** « ◀ Héroïne »
    // voit l'Héroïne de sa propre carte comme celles d'avant, « Héroïne ▶ »
    // comme celles d'après. Un plan compte toujours ce qu'il porte : les deux
    // autres portées — sa séquence, le montage — l'ont toujours fait, et une
    // carte qui annonce une icône sans la compter se lit comme une erreur.
    return p === 'AVANT' ? ligne.slice(0, i + 1) : ligne.slice(i);
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
      // Un bandeau de cadrage peut en viser deux : un plan compte dès qu'il
      // porte l'un OU l'autre — il ne compte pas deux fois pour autant.
      return n * portee.filter((p) => p.format === obj.format || p.format === obj.format2).length;
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
    // --- Les bandeaux qui comptent des séquences ---------------------------
    // Ceux-là ne regardent pas une portée de plans mais la forme du banc :
    // combien de séquences, de quelle taille, ce qu'elles portent. Ils lisent
    // donc `banc` directement, et leur portée est toujours le montage.
    case 'SEQ_TAILLE': {
      // « ou plus », ou son contraire « ou moins » — un bandeau qui récompense
      // les séquences courtes plutôt que les longues.
      const k = Math.max(1, obj.seuil || 1);
      return n * banc.sequences.filter((s) => (obj.sens === 'MAX'
        ? plansDe(s).length <= k : plansDe(s).length >= k)).length;
    }
    case 'SEQ_LONGUE':
      return n * banc.sequences.reduce((m, s) => Math.max(m, plansDe(s).length), 0);
    case 'SEQ_VOISINES': {
      // « Au-dessus » et « en dessous » se lisent dans l'ordre du banc : en
      // lignes, c'est la pile ; sur une bande unique, c'est l'ordre de gauche
      // à droite — avant et après la séquence porteuse.
      const i = banc.sequences.indexOf(sequence);
      if (i < 0) return 0;
      return n * (obj.sens === 'APRES' ? banc.sequences.length - 1 - i : i);
    }
    case 'SEQ_AVEC': {
      // « Avec » compte les séquences qui portent la cible **au moins k fois**,
      // son contraire celles qui la portent moins de k fois — à k = 1, c'est
      // bien « avec » et « sans ». Ce sont des PLANS que l'on compte, pas des
      // icônes : un plan à deux armes reste un plan.
      const k = Math.max(1, obj.seuil || 1);
      const assez = (s) => comptePorteurs(s, obj.cible) >= k;
      return n * banc.sequences.filter((s) => (obj.sens === 'SANS' ? !assez(s) : assez(s))).length;
    }
    default:
      return 0;
  }
}

/** Les plans d'une séquence — un Raccord relie, il ne raconte pas : il n'en est pas un. */
function plansDe(seq) {
  return seq.filter((p) => !estRaccord(p));
}

/**
 * Combien de plans d'une séquence portent la cible visée — une icône, un
 * cadrage, un Raccord. On compte les plans porteurs et non les icônes : un
 * plan à deux armes est un plan à armes, pas deux.
 */
function comptePorteurs(seq, cible) {
  if (cible === 'RACCORD') return seq.filter(estRaccord).length;
  if (CADRAGES_VISABLES.includes(cible)) return seq.filter((p) => p.format === cible).length;
  return seq.filter((p) => p.el.includes(cible)).length;
}

/**
 * Une suite de plans se lit-elle dans l'ordre ? Chaque minutage doit être
 * supérieur ou égal à celui de son voisin de gauche.
 *
 * Les Raccords et les Génériques sont à 00:00 : ils ne racontent rien, ils
 * relient. On les **retire de la lecture** — `chronoIgnoreZero` — au lieu de
 * sauter les comparaisons qui les touchent. La nuance décide de tout : sauter
 * la comparaison laissait un Raccord glissé entre 75:00 et 65:00 masquer le
 * désordre, et un montage à contresens marquait quand même ses points.
 */
export function chronologique(plans, cfg) {
  const suite = cfg.chronoIgnoreZero ? plans.filter((p) => p.tc !== 0) : plans;
  for (let i = 0; i < suite.length - 1; i++) if (suite[i + 1].tc < suite[i].tc) return false;
  return true;
}

/**
 * Les suites de plans que l'on lit dans l'ordre. Le film se lit d'ordinaire
 * **séquence par séquence** : deux séquences ne se touchent pas, et rien ne
 * relie la fin de l'une au début de la suivante.
 *
 * En **banc en lignes**, au contraire, le montage se lit **d'un seul tenant** —
 * du premier plan en haut à gauche de la première ligne jusqu'au dernier plan
 * en bas à droite de la dernière —, les lignes s'enchaînant comme les lignes
 * d'un texte. Il n'y a donc qu'une suite à lire : le film entier.
 */
function suitesDeLecture(banc, cfg) {
  return cfg.bancEnLignes ? [tousLesPlans(banc)] : banc.sequences;
}

function chrono(banc, cfg) {
  if (!cfg.chronoBonus && !cfg.chronoMalus) return { pts: 0, ordre: 0, contre: 0 };
  let ordre = 0, contre = 0;
  for (const seq of suitesDeLecture(banc, cfg)) {
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
  for (const seq of suitesDeLecture(banc, cfg)) {
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
    SEQ_TAILLE: 0, SEQ_VOISINES: 0, SEQ_LONGUE: 0, SEQ_AVEC: 0,
    CHRONOLOGIE: 0, POSE: 0, JONCTION: 0,
  };
  const lignes = [];

  // Un plan peut porter deux pouvoirs, côte à côte sur son bandeau. Ils
  // comptent tous les deux, chacun pour son compte, dans sa propre portée.
  banc.sequences.forEach((seq, si) => {
    seq.forEach((p) => {
      if (p.depart && !cfg.scorerDepart) return;
      for (const obj of objsDe(p)) {
        const pts = Math.round(valeurObjectif(obj, seq, banc, cfg, p) * mult);
        detail[obj.kind] += pts;
        lignes.push({ sequence: si, obj, pts, plan: p });
      }
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
    bandeaux: plans.flatMap(objsDe),
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
  SEQ_TAILLE: 'Objectifs de séquence longue',
  SEQ_VOISINES: 'Objectifs de séquences voisines',
  SEQ_LONGUE: 'Objectifs de plus longue séquence',
  SEQ_AVEC: 'Objectifs de séquence avec / sans',
  CHRONOLOGIE: 'Variante — chronologie',
  POSE: 'Points de pose',
  JONCTION: 'Jonctions raccordées',
};
