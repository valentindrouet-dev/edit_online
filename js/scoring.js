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

import { PERSONNAGES, ELEMENT_IDS, CADRAGES_VISABLES, CADRAGES_POUVOIR, objPortee, objsDe } from './data.js?v=1.86';

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
 * Les GROUPES d'icônes réunis dans une portée — un couple, ou un trio. Quatre
 * icônes font deux couples, cinq en font deux aussi : c'est un appariement,
 * pas une adjacence.
 *
 * Le groupe est une liste d'icônes à réunir, et la même peut y figurer
 * plusieurs fois : « Arme + Arme + Héroïne » demande deux armes ET une
 * héroïne, donc trois icônes par groupe. On compte alors, pour chaque icône
 * demandée, combien de fois la portée peut la fournir — et c'est la plus
 * chiche qui décide.
 */
export function compteGroupes(plans, els) {
  const besoin = new Map();
  for (const e of els) besoin.set(e, (besoin.get(e) || 0) + 1);
  let n = Infinity;
  for (const [e, k] of besoin) n = Math.min(n, Math.floor(compteIcone(plans, e) / k));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ce qu'un pouvoir compte dans une liste de plans, selon sa cible. Un seul
 * vocabulaire pour neuf bandeaux : c'est ce qui leur évite d'exister en neuf
 * variantes chacun.
 *
 * Deux cibles ne comptent pas des cartes mais ce qu'elles portent — `ICONE`,
 * toutes les icônes confondues, et `VALEUR`, la **valeur de cadre** : on
 * compte les cadrages DIFFÉRENTS, une ligne qui alterne Plan Large, Plan Moyen
 * et Gros Plan en montrant trois. Une dernière ne regarde pas la portée du
 * tout : `SEQUENCE` compte les séquences du banc.
 */
export function compteCible(plans, cible, banc) {
  switch (cible) {
    case 'CARTE':    return plans.length;
    case 'PLAN':     return plans.filter((p) => !estRaccord(p)).length;
    case 'RACCORD':  return plans.filter(estRaccord).length;
    case 'MORT':     return plans.filter((p) => p.mort).length;
    case 'NEANT':    return plans.filter((p) => !p.el.some((e) => PERSONNAGES.includes(e))).length;
    case 'ICONE':    return plans.reduce((s, p) => s + p.el.length, 0);
    // La **valeur de cadre** — le mot de cinéma pour le cadrage : Plan Large,
    // Plan Moyen, Gros Plan. On compte celles qui sont DIFFÉRENTES : une ligne
    // qui alterne les trois en montre trois, quel que soit le nombre de cartes.
    // Un Raccord n'est pas un plan : il n'a pas de valeur de cadre.
    case 'VALEUR':   return new Set(plans.filter((p) => !estRaccord(p)).map((p) => p.format)).size;
    case 'SEQUENCE': return banc ? banc.sequences.length : 0;
    default:
      if (CADRAGES_POUVOIR.includes(cible)) return plans.filter((p) => p.format === cible).length;
      return compteIcone(plans, cible);
  }
}

/** La ligne du banc où se trouve ce plan — sa séquence. */
function ligneDe(banc, plan) {
  return banc.sequences.find((s) => s.includes(plan)) || null;
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

  // Deux bandeaux portent leur portée dans leur définition même.
  //
  // « Ailleurs » regarde les AUTRES séquences — celles du dessus, celles du
  // dessous, ou les deux. Sa propre ligne en est exclue, sans quoi il ferait
  // double emploi avec la portée « séquence ».
  if (obj.kind === 'AILLEURS') {
    const i = banc.sequences.indexOf(sequence) >= 0
      ? banc.sequences.indexOf(sequence)
      : banc.sequences.findIndex((s) => s.includes(porteur));
    if (i < 0) return [];
    if (obj.sens === 'DESSUS') return banc.sequences.slice(0, i).flat();
    if (obj.sens === 'DESSOUS') return banc.sequences.slice(i + 1).flat();
    return banc.sequences.filter((_, k) => k !== i).flat();
  }

  // « D'un côté du centre » : le centre d'une ligne est son **ancre**, le plan
  // qui l'a ouverte et sur lequel elle est alignée. Il n'appartient à aucun
  // des deux côtés — c'est le pivot, pas un voisin. Une ligne sans ancre
  // désignée prend son milieu géométrique, faute de mieux.
  if (obj.kind === 'CENTRE') {
    const ligne = sequence && sequence.includes(porteur) ? sequence : ligneDe(banc, porteur);
    if (!ligne || !ligne.length) return [];
    const a = ligne.findIndex((p) => p.ancre);
    const c = a >= 0 ? a : Math.floor((ligne.length - 1) / 2);
    return obj.sens === 'DROITE' ? ligne.slice(c + 1) : ligne.slice(0, c);
  }

  const p = objPortee(obj, cfg);
  // Une portée vide plutôt que rien du tout : un plan qu'on interroge alors
  // qu'il n'est pas sur ce banc-là — un aperçu, un plan repris en main — ne
  // doit pas faire tomber le décompte entier.
  if (p === 'SEQUENCE') return sequence || [];
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

/**
 * Valeur d'un bandeau porté par `porteur`, dans la portée qu'il déclare.
 *
 * `profond` marque un calcul fait **pour le compte d'un autre bandeau** — le
 * pouvoir qui double une carte a besoin de savoir ce que chaque carte rapporte.
 * Un doublement ne se double pas lui-même : deux cartes qui se désigneraient
 * l'une l'autre tourneraient en rond.
 */
export function valeurObjectif(obj, sequence, banc, cfg, porteur, profond = false) {
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
      return n * compteGroupes(portee, obj.els);
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
    case 'SEQ_TOUTES': {
      // « Chaque séquence » ne veut rien dire sur un banc vide : rien à juger,
      // rien à gagner. Les Raccords ne comptent pas dans la taille d'une
      // séquence, comme partout ailleurs.
      if (!banc.sequences.length) return 0;
      const k = Math.max(1, obj.seuil || 1);
      const tient = (s) => (obj.sens === 'MAX' ? plansDe(s).length <= k : plansDe(s).length >= k);
      return banc.sequences.every(tient) ? n : 0;
    }

    // --- Les pouvoirs du vocabulaire commun --------------------------------
    // Les deux premiers ont déjà leur portée : `porteeDe` la leur a donnée —
    // les autres lignes, un côté du centre. Il ne reste qu'à compter.
    case 'AILLEURS':
    case 'CENTRE':
      return n * compteCible(portee, obj.cible, banc);
    case 'LOT': {
      // Un lot incomplet ne rapporte rien : sept armes font deux lots de trois.
      const k = Math.max(2, obj.seuil || 2);
      return n * Math.floor(compteCible(portee, obj.cible, banc) / k);
    }
    case 'SEUIL': {
      // Tout ou rien : la portée franchit le seuil, ou elle ne le franchit pas.
      const c = compteCible(portee, obj.cible, banc);
      const k = Math.max(0, obj.seuil ?? 1);
      return (obj.sens === 'MAX' ? c <= k : c >= k) ? n : 0;
    }
    case 'ABSENTES':
      // Les six éléments sont les six candidats : on compte ceux que la portée
      // ne montre nulle part.
      return n * ELEMENT_IDS.filter((e) => compteIcone(portee, e) === 0).length;
    case 'EXTREME': {
      const comptes = ELEMENT_IDS.map((e) => compteIcone(portee, e)).filter((c) => c > 0);
      if (!comptes.length) return 0;
      // « La moins présente » se lit **parmi celles qui apparaissent** : sans
      // cela, les cinq icônes absentes gagneraient toujours, à zéro, et le
      // bandeau ne rapporterait jamais rien.
      return n * (obj.sens === 'MOINS' ? Math.min(...comptes) : Math.max(...comptes));
    }
    case 'PLAN_ICONES': {
      const k = Math.max(0, obj.seuil ?? 0);
      const tient = (p) => (obj.sens === 'MIN' ? p.el.length >= k
        : obj.sens === 'MAX' ? p.el.length <= k : p.el.length === k);
      return n * portee.filter((p) => !estRaccord(p) && tient(p)).length;
    }
    case 'DOUBLE': {
      // Une carte de la portée compte une fois de plus. On a donc besoin de ce
      // que chaque carte rapporte — d'où le calcul en profondeur, qui laisse
      // de côté les doublements pour ne pas tourner en rond.
      if (profond || !portee.length) return 0;
      const valeurs = portee.map((p) => ({ p, v: valeurPlan(p, banc, cfg, true) }));
      const mesure = (x) => (obj.critere === 'ICONES' ? x.p.el.length
        : obj.critere === 'CADRAGE' ? TAILLE_CADRAGE[x.p.format] ?? 0 : x.v);
      const cibles = valeurs.map(mesure);
      const seuil = obj.sens === 'PLUS' ? Math.max(...cibles) : Math.min(...cibles);
      // À égalité sur le critère — trois cartes à deux icônes —, on prend celle
      // qui rapporte le plus : c'est la lecture la plus favorable au joueur,
      // et surtout la seule qui ne dépende pas de l'ordre de pose.
      const exaequo = valeurs.filter((x, i) => cibles[i] === seuil);
      return n * exaequo.reduce((m, x) => Math.max(m, x.v), exaequo[0].v);
    }
    default:
      return 0;
  }
}

/** La taille d'un cadrage, pour « la plus grosse carte » : le Gros Plan est le plus petit. */
const TAILLE_CADRAGE = { GP: 1, PM: 2, PL: 3, DEP: 3 };

/** Ce qu'un plan rapporte à lui seul, tous ses bandeaux réunis. */
function valeurPlan(plan, banc, cfg, profond) {
  // Un Plan de départ qui ne marque pas ne marque pas davantage en étant
  // doublé : la règle du décompte vaut aussi ici.
  if (plan.depart && !cfg.scorerDepart) return 0;
  const seq = ligneDe(banc, plan);
  let s = 0;
  for (const o of objsDe(plan)) s += valeurObjectif(o, seq, banc, cfg, plan, profond);
  return s;
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
    SEQ_TAILLE: 0, SEQ_VOISINES: 0, SEQ_LONGUE: 0, SEQ_AVEC: 0, SEQ_TOUTES: 0,
    AILLEURS: 0, CENTRE: 0, LOT: 0, SEUIL: 0, ABSENTES: 0,
    EXTREME: 0, PLAN_ICONES: 0, DOUBLE: 0,
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
  PAIRE: 'Objectifs de groupe d’icônes',
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
  SEQ_TOUTES: 'Objectifs de séquences toutes égales',
  AILLEURS: 'Objectifs des autres séquences',
  CENTRE: 'Objectifs d’un côté du centre',
  LOT: 'Objectifs par lot',
  SEUIL: 'Objectifs à seuil',
  ABSENTES: 'Objectifs d’icônes absentes',
  EXTREME: 'Objectifs d’icône la plus / la moins présente',
  PLAN_ICONES: 'Objectifs de plan chargé',
  DOUBLE: 'Objectifs de carte doublée',
  CHRONOLOGIE: 'Variante — chronologie',
  POSE: 'Points de pose',
  JONCTION: 'Jonctions raccordées',
};
