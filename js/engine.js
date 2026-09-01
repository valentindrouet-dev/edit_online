// ---------------------------------------------------------------------------
// EDIT — moteur de jeu (règles v0.13)
// ---------------------------------------------------------------------------
// Un tour se joue en deux phases : le DÉRUSHAGE, où chaque joueuse pioche une
// carte, puis le MONTAGE, où chacune la pose dans son banc.

import {
  buildCartesDoubles, buildPlansLarges, buildDeparts, moitiesDe, plHalf, sceneDe, faceJouee,
} from './data.js?v=1.79';
import { compter, bancVide, plansComptes } from './scoring.js?v=1.79';

// --- Aléatoire reproductible ----------------------------------------------

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nouvelleGraine(rand = Math.random) {
  const mots = ['edit', 'coupe', 'raccord', 'champ', 'plan', 'rushes', 'banc', 'montage', 'chutier'];
  return `${mots[Math.floor(rand() * mots.length)]}-${Math.floor(rand() * 9000 + 1000)}`;
}

function melanger(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Construction du paquet ------------------------------------------------

export function construirePaquet(cfg) {
  const doubles = [];
  const base = buildCartesDoubles();
  for (let k = 0; k < cfg.exemplairesDouble; k++) {
    for (const c of base) {
      // Les cartes désactivées dans l'éditeur ne sont pas dans la boîte.
      if (!c.actif) continue;
      const fam1 = sceneDe(c.pmScene)?.famille;
      const fam2 = sceneDe(c.gpScene)?.famille;
      if (cfg.filtreFamilles && (cfg.filtreFamilles[fam1] === false || cfg.filtreFamilles[fam2] === false)) continue;
      doubles.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  const larges = [];
  for (let k = 0; k < cfg.exemplairesPL; k++) {
    for (const c of buildPlansLarges(cfg.sansPlanDepart)) {
      if (!c.actif) continue;
      if (cfg.retirerBrouillons && c.brouillon) continue;
      larges.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  // Variante « pas de Plans de départ » : les faces de départ sont déjà dans
  // la pioche des Plans Larges, il n'en reste aucune à proposer.
  return { doubles, larges, departs: cfg.sansPlanDepart ? [] : buildDeparts() };
}

/**
 * Les pioches sont-elles mêlées ? La variante ne s'applique pas quand les Plans
 * de départ sont écartés : celle-là a besoin d'une **rivière de Plans Larges à
 * part** pour n'offrir qu'eux tant qu'un banc est vide, et une pioche unique
 * n'en a plus. Les deux ne peuvent donc pas tenir ensemble — l'accueil les
 * rend exclusives, et cette lecture le garantit même sur une configuration
 * bricolée à la main.
 */
export function piochesMelees(cfg) {
  return !!cfg.piochesMelangees && !cfg.sansPlanDepart;
}

/**
 * La taille de chaque rivière. Mêlées, la rangée unique montre **autant de
 * cartes que les deux réunies** — six par les réglages ordinaires : on ne perd
 * pas la moitié de ce qu'on voyait en perdant le choix de la famille.
 */
export function taillesRiviere(cfg, n) {
  const pl = cfg.chutierPL || n;
  const pmgp = cfg.chutierPMGP || n;
  return piochesMelees(cfg) ? { pl: 0, pmgp: pl + pmgp } : { pl, pmgp };
}

// --- Plans visibles d'une carte -------------------------------------------

/** Les plans qu'une carte peut laisser visibles — deux par face. */
export function plansVisibles(carte, face) {
  if (carte.type !== 'DOUBLE') return [plHalf(carte)];
  if (face) { const m = moitiesDe(carte, face); return [m.GP, m.PM]; }
  const r = moitiesDe(carte, 'R'), v = moitiesDe(carte, 'V');
  return [r.GP, r.PM, v.GP, v.PM];
}

/** Le plan tel qu'il se posera : la bonne moitié, la bonne face, le bon rôle. */
export function planPose(carte, format, role, face) {
  const plan = carte.type === 'DOUBLE' ? moitiesDe(carte, face)[format] : plHalf(carte);
  const copie = { ...plan, el: plan.el.slice(), carteId: carte.id };
  // La moitié Générique à double lecture est une Ouverture à gauche, des
  // Crédits à droite.
  if (copie.dual && role) copie.transition = role;
  return copie;
}

// --- Création d'une partie -------------------------------------------------

export function creerPartie(joueurs, cfg, graine) {
  const seed = graine || nouvelleGraine();
  const rand = rng(seed);
  const { doubles, larges, departs } = construirePaquet(cfg);
  const n = joueurs.length;
  const melees = piochesMelees(cfg);

  const state = {
    seed,
    cfg,
    joueurs: joueurs.map((j, i) => ({ ...j, idx: i })),
    bancs: joueurs.map(() => bancVide()),
    posees: joueurs.map(() => 0),
    mains: joueurs.map(() => []),        // la carte dérushée du tour
    departsProposes: joueurs.map(() => []),
    // Pioches mêlées : une seule pile, un seul mélange, et la pile des Plans
    // Larges reste vide — tout ce qui la lisait n'y trouve donc rien, et la
    // table n'ouvre qu'une rangée.
    piochePL: melees ? [] : melanger(larges, rand),
    piochePMGP: melees ? melanger([...doubles, ...larges], rand) : melanger(doubles, rand),
    chutierPL: [],
    chutierPMGP: [],
    tour: 1,
    // Sans Plans de départ, il n'y a rien à choisir : on entre directement
    // dans le dérushage, banc vide, et l'on ouvre son banc d'un Plan Large.
    phase: cfg.sansPlanDepart ? 'DERUSHAGE' : 'DEPART',   // DEPART | DERUSHAGE | MONTAGE
    courant: 0,
    finie: false,
    journal: [],
    // Le score de chaque joueuse après chacun de ses coups : la courbe de fin
    // de partie s'y lit directement.
    courbe: joueurs.map(() => []),
    debut: Date.now(),
  };

  const tPL = taillesRiviere(cfg, n).pl;
  const tPM = taillesRiviere(cfg, n).pmgp;
  for (let i = 0; i < tPL && state.piochePL.length; i++) state.chutierPL.push(state.piochePL.shift());
  for (let i = 0; i < tPM && state.piochePMGP.length; i++) state.chutierPMGP.push(state.piochePMGP.shift());

  // La première joueuse : tirée au sort, ou désignée dans les options.
  state.courant = cfg.premierJoueurAleatoire
    ? Math.floor(rand() * n)
    : Math.min(n - 1, Math.max(0, cfg.premierJoueur | 0));
  state.premier = state.courant;

  // Les Plans de départ ne se tirent pas : la boîte contient quatre
  // exemplaires de la version A et quatre de la version B, donc chaque joueuse
  // reçoit une carte de chaque — ses quatre faces sont toujours au choix.
  const versions = [...new Set(departs.map((d) => d.version))];
  if (!cfg.sansPlanDepart) joueurs.forEach((_, i) => {
    for (const v of versions) {
      const exemplaires = departs.filter((d) => d.version === v);
      const carte = exemplaires[i] || exemplaires[0];
      if (carte) state.departsProposes[i].push(carte);
    }
  });

  journal(state, `Partie lancée — graine ${seed} · ${n} joueuse${n > 1 ? 's' : ''}`);
  return state;
}

/** Un point de plus sur la courbe de cette joueuse. */
function noterCourbe(state, p) {
  if (!state.courbe) state.courbe = state.joueurs.map(() => []);
  state.courbe[p].push(compter(state.bancs[p], state.cfg).total);
}

function journal(state, texte, joueur = null) {
  state.journal.push({ tour: state.tour, texte, joueur });
  if (state.journal.length > 400) state.journal.shift();
}

// --- Choix du Plan de départ ----------------------------------------------

/**
 * Les quatre faces proposées, rangées par minutage croissant : on les compare
 * dans l'ordre du film, pas dans celui du fichier. À minutage égal, le numéro
 * de plan tranche, pour que l'ordre ne bouge pas d'une partie à l'autre.
 */
export function choixDepart(state, p) {
  const out = [];
  state.departsProposes[p].forEach((carte, i) => {
    carte.faces.forEach((face, f) => {
      out.push({ type: 'DEPART', carte, carteIdx: i, face: f, plan: plHalf({ ...face, depart: true }) });
    });
  });
  return out.sort((a, b) => a.plan.tc - b.plan.tc || a.plan.num - b.plan.num);
}

export function poserDepart(state, p, choix) {
  // Le Plan de départ ouvre la première ligne : il en est l'ancre.
  const plan = { ...choix.plan, carteId: `${choix.carte.id}f${choix.face}`, depart: true, ancre: true };
  state.bancs[p] = { sequences: [[plan]], ouverture: false, fermeture: false };
  state.dernierPose = { p, seq: 0, idx: 0 };
  noterCourbe(state, p);
  state.departsProposes[p] = [];
  journal(state, `${state.joueurs[p].nom} ouvre son banc avec le Plan de départ ${plan.num}`, p);
  declencherFin(state, p);
}

export function departsFaits(state) {
  return state.bancs.every((b) => b.sequences.length > 0);
}

// --- Phase A : le Dérushage ------------------------------------------------

/**
 * Ce que la joueuse en cours peut dérusher. `toutes` demande en plus les cartes
 * qu'elle **voit sans pouvoir les prendre** — la table les montre alors
 * éteintes plutôt que de les escamoter : une rivière qui disparaît le temps
 * d'un tour se lit comme une rivière vide, ce qu'elle n'est pas.
 */
export function optionsDerushage(state, toutes = false) {
  const cfg = state.cfg;
  const p = state.courant;
  const banc = state.bancs[p];

  // Variante « pas de Plans de départ » : sur un banc vide, seul un Plan Large
  // peut se poser — un Plan Moyen ou un Gros Plan s'accroche à une séquence, et
  // il n'y en a aucune. On ne propose donc que des Plans Larges : sans cela on
  // pourrait prendre une carte impossible à jouer.
  const quePL = !!cfg.sansPlanDepart && !!banc && !banc.sequences.length;

  // À l'autre bout de la partie, la limite du banc : ses lignes sont toutes
  // ouvertes, et un Plan Large n'a plus de séquence à ouvrir. Il ne lui reste
  // que la charnière d'un Raccord — s'il n'y en a aucune, il n'a nulle part où
  // aller, et l'on ne propose pas de le prendre. Un Plan Large en vaut un
  // autre pour cette question : le premier venu suffit à la trancher.
  const temoinPL = state.chutierPL[0] || state.piochePL[0] || null;
  const pasDeLigne = !!banc && !!banc.sequences.length && !!temoinPL
    && !coupsPossibles(state, p, temoinPL).length;

  const nbSeq = banc ? banc.sequences.length : 0;
  const RAISON_PL = `votre banc porte ${nbSeq > 1 ? `ses ${nbSeq} séquences` : 'sa seule séquence'} — `
    + 'un Plan Large n’entre plus que par la charnière d’un Raccord';
  const RAISON_PMGP = 'à accrocher à une séquence — ouvrez d’abord votre banc d’un Plan Large';
  const RAISON_AUCUNE = 'aucun emplacement de votre banc ne l’accepte';

  /**
   * Cette carte-là a-t-elle où se poser ? La question ne se pose que sur un
   * banc déjà ouvert : sur un banc vide, tout ouvre une ligne, et c'est
   * `quePL` qui tranche. C'est ce test qui écarte au dérushage les cartes que
   * la variante des plans uniques rendrait injouables — plutôt que de les
   * laisser prendre pour les jeter ensuite.
   */
  const sansPose = (c) => !!banc && !!banc.sequences.length && !!c
    && !coupsPossibles(state, p, c).length;

  // Une carte que l'on ne pourrait pas poser reste **visible**, éteinte, avec
  // la raison à côté du titre : une rivière escamotée le temps d'un tour se
  // lirait comme une rivière vide, ce qu'elle n'est pas.
  const out = [];
  const pousse = (o, bloquee, raison) => {
    if (!bloquee) out.push(o);
    else if (toutes) out.push({ ...o, bloquee: true, raison });
  };

  state.chutierPL.forEach((c, i) => pousse({ source: 'CHUTIER_PL', index: i, carte: c },
    pasDeLigne || sansPose(c), pasDeLigne ? RAISON_PL : RAISON_AUCUNE));
  state.chutierPMGP.forEach((c, i) => pousse({ source: 'CHUTIER_PMGP', index: i, carte: c },
    quePL || sansPose(c), quePL ? RAISON_PMGP : RAISON_AUCUNE));
  // Les cartes Plan Moyen / Gros Plan sont recto-verso : une pioche ne peut
  // pas les cacher, on voit forcément la face du dessus. Les Plans Larges,
  // eux, ont un vrai dos — leur pioche reste aveugle. Pioches mêlées, la pile
  // porte les deux familles : elle redevient aveugle, et se prend au pari.
  const melees = piochesMelees(cfg);
  if (!melees && cfg.piocheDirectePMGP && state.piochePMGP.length) {
    const sommet = state.piochePMGP[0];
    pousse({ source: 'PIOCHE_PMGP', carte: sommet, sommet: true },
      quePL || sansPose(sommet), quePL ? RAISON_PMGP : RAISON_AUCUNE);
  }
  if (melees && cfg.piocheDirectePL && state.piochePMGP.length) {
    pousse({ source: 'PIOCHE_PMGP', carte: null, sommet: true, aveugle: true }, false, '');
  }
  if (!melees && cfg.piocheDirectePL && state.piochePL.length) {
    pousse({ source: 'PIOCHE_PL', carte: null, sommet: true }, pasDeLigne, RAISON_PL);
  }

  // Tout est écarté et il reste pourtant des cartes : mieux vaut une carte
  // injouable ce tour-ci qu'une joueuse bloquée sans rien à faire. C'est aussi
  // ce qui garantit que la liste ne se vide que lorsque la boîte est vide —
  // ce que `avancer` lit comme la fin de la partie.
  if (!toutes && !out.length) {
    return optionsDerushage(state, true).map(({ bloquee, raison, ...o }) => o);
  }
  return out;
}

/**
 * La face sur laquelle une carte double se présente. Une carte posée sur la
 * table tombe d'un côté ou de l'autre : ce n'est pas toujours son recto. Le
 * tirage se déduit de la graine et de l'identité de la carte — reproductible,
 * et sans rien à retenir tant que personne ne la retourne.
 */
export function faceVisible(state, carte) {
  if (!carte || carte.type !== 'DOUBLE') return 'R';
  const forcee = state.faces && state.faces[carte.id];
  if (forcee) return forcee;
  return (hashSeed(`${state.seed}|${carte.id}`) & 1) ? 'V' : 'R';
}

/** Retourner une carte du chutier, avant de la prendre ou non. */
export function retourner(state, carte) {
  if (!carte || carte.type !== 'DOUBLE') return 'R';
  state.faces = state.faces || {};
  state.faces[carte.id] = faceVisible(state, carte) === 'R' ? 'V' : 'R';
  return state.faces[carte.id];
}

/**
 * Remet les pioches et les rivières en accord avec **la boîte**. Écarter une
 * carte dans l'éditeur doit la retirer du paquet — y compris de la rivière, où
 * elle est aussitôt remplacée, comme si on venait de la prendre ; la réactiver
 * doit l'y remettre. Sans cela, la composition de la boîte ne valait que pour
 * les parties lancées après coup.
 *
 * Trois choses ne bougent pas :
 * — **les plans déjà posés**, qui font partie du film déjà raconté : les
 *   retirer réécrirait la partie ;
 * — **la carte en main**, qui a été prise : le tour est engagé ;
 * — **les cartes déjà jouées**, qui ne reviennent pas dans la pioche.
 *
 * Une carte qui revient se glisse à une place tirée de la graine de la partie
 * et de son identité : deux fenêtres qui rejouent la même retouche rangent le
 * paquet de la même façon.
 */
export function resynchroniserBoite(state) {
  const { doubles, larges } = construirePaquet(state.cfg);
  let bouge = 0;

  // Ce qui a déjà quitté le paquet : posé sur un banc, ou en main.
  const sorties = new Set();
  for (const banc of state.bancs) {
    for (const seq of banc.sequences) for (const plan of seq) if (plan.carteId) sorties.add(plan.carteId);
  }
  for (const main of state.mains) for (const c of main) sorties.add(c.id);

  const famille = (dispo, pioche, chutier, taille) => {
    const ok = new Map(dispo.map((c) => [c.id, c]));

    // Ce qui n'est plus dans la boîte s'en va — de la pioche comme de la rivière.
    const garde = (pile) => {
      const n = pile.length;
      const reste = pile.filter((c) => ok.has(c.id));
      bouge += n - reste.length;
      pile.length = 0; pile.push(...reste);
    };
    garde(pioche); garde(chutier);

    // Ce qui y revient se glisse dans la pioche, à une place reproductible.
    const presentes = new Set([...pioche, ...chutier].map((c) => c.id));
    for (const c of dispo) {
      if (presentes.has(c.id) || sorties.has(c.id)) continue;
      const i = hashSeed(`${state.seed}|retour|${c.id}`) % (pioche.length + 1);
      pioche.splice(i, 0, c);
      bouge++;
    }

    // La rivière retrouve sa taille : elle se recharge sur la pioche, et rend
    // le trop-plein au sommet — c'est le chemin ordinaire d'une carte.
    while (chutier.length < taille && pioche.length) chutier.push(pioche.shift());
    while (chutier.length > taille) pioche.unshift(chutier.pop());
  };

  const n = state.joueurs.length;
  const t = taillesRiviere(state.cfg, n);
  // Pioches mêlées : une seule pile porte tout, et celle des Plans Larges doit
  // rester vide — on lui donne donc une boîte vide et une rivière de zéro.
  const melees = piochesMelees(state.cfg);
  famille(melees ? [] : larges, state.piochePL, state.chutierPL, t.pl);
  famille(melees ? [...doubles, ...larges] : doubles, state.piochePMGP, state.chutierPMGP, t.pmgp);
  if (bouge) {
    journal(state, `La boîte a changé — ${bouge} carte${bouge > 1 ? 's' : ''} ${
      bouge > 1 ? 'entrent ou sortent' : 'entre ou sort'} des pioches et des rivières`);
  }
  return bouge;
}

/**
 * La carte prise **laisse sa place à celle qui la remplace** : la nouvelle se
 * pose exactement là où était l'ancienne, et les autres ne bougent pas d'un
 * pixel. Ajouter la remplaçante au bout décalait tout ce qui suivait la carte
 * prise — la rivière entière glissait d'un cran à chaque tour, et l'on ne
 * retrouvait plus rien.
 */
function prendreDuChutier(chutier, pioche, i) {
  const neuve = pioche.length ? pioche.shift() : null;
  return (neuve ? chutier.splice(i, 1, neuve) : chutier.splice(i, 1))[0];
}

export function derusher(state, p, choix) {
  let carte = null;
  if (choix.source === 'CHUTIER_PL') {
    carte = prendreDuChutier(state.chutierPL, state.piochePL, choix.index);
  } else if (choix.source === 'CHUTIER_PMGP') {
    carte = prendreDuChutier(state.chutierPMGP, state.piochePMGP, choix.index);
  } else if (choix.source === 'PIOCHE_PMGP') {
    carte = state.piochePMGP.shift();
  } else if (choix.source === 'PIOCHE_PL') {
    carte = state.piochePL.shift();
  }
  if (!carte) return null;
  state.mains[p] = [carte];
  const quoi = carte.type === 'PL' ? `Plan Large ${carte.num}` : `carte ${carte.gpNum} | ${carte.pmNum}`;
  journal(state, `${state.joueurs[p].nom} dérushe une ${quoi}`, p);
  return carte;
}

// --- Phase B : le Montage --------------------------------------------------

function estPL(plan) { return plan.format === 'PL'; }

/**
 * Combien de séquences un banc peut porter. La règle en fixe **cinq** : un
 * montage compte bien plus de plans que de lignes, et c'est la Carte Raccord
 * qui permet d'étoffer une ligne plutôt que d'en ouvrir une de plus. Ce n'est
 * pas le nombre de Plans Larges qui est borné — une ligne peut en porter
 * plusieurs, de part et d'autre d'un Raccord —, c'est le nombre de lignes.
 *
 * Zéro ou absent : aucune limite, pour qui veut l'ancienne partie.
 */
export function limiteSequences(cfg) {
  const n = cfg && cfg.sequencesMax;
  return n === undefined || n === null || n <= 0 ? Infinity : n;
}

/** Le Plan Large ne peut pas toucher un autre Plan Large. */
function poseAutorisee(cfg, voisin, plan) {
  if (cfg.plContigu) return true;
  return !(voisin && estPL(voisin) && estPL(plan));
}

// --- Variante : un plan ne se répète pas -----------------------------------
// Un film ne montre pas deux fois le même plan. La variante l'interdit, et sa
// portée se règle : tout le banc, une même séquence, ou seulement deux voisins.
//
// Deux plans sont « le même » quand ils portent le même **numéro imprimé** —
// c'est lui l'identité d'un plan, celle qui désigne son illustration. Le recto
// et le verso d'une même moitié en font donc partie : ce sont deux minutages
// d'une seule et même image.
//
// Un Raccord, une Ouverture, un Générique ne sont pas des plans : ils relient
// ou encadrent le film. Ils échappent à la règle, comme ils échappent déjà au
// compte des dix plans et à la taille d'une séquence — sans quoi, les sept
// cartes qui portent une moitié Raccord n'étant qu'un seul plan aux yeux du
// numéro, on n'en jouerait jamais qu'une.

const identite = (p) => (p.numOrigine === undefined ? p.num : p.numOrigine);

const memePlan = (a, b) => !!a && !!b && !a.transition && !b.transition
  && identite(a) === identite(b);

/**
 * La séquence que le coup vise, et les plans qui toucheront le posé. Un coup
 * qui ouvre une ligne n'a ni l'une ni les autres : rien ne peut s'y répéter.
 */
function voisinageDuCoup(banc, coup) {
  const seqs = banc.sequences;
  switch (coup.action) {
    case 'ETENDRE': {
      const s = seqs[coup.seq] || [];
      return { sequence: s, voisins: [coup.cote === 'gauche' ? s[0] : s[s.length - 1]] };
    }
    case 'SOUDER': {
      const g = seqs[coup.pos] || [], d = seqs[coup.pos + 1] || [];
      return { sequence: [...g, ...d], voisins: [g[g.length - 1], d[0]] };
    }
    case 'GENERIQUE': {
      const s = coup.role === 'OUVERTURE' ? seqs[0] : seqs[seqs.length - 1];
      if (!s) return { sequence: [], voisins: [] };
      return { sequence: s, voisins: [coup.role === 'OUVERTURE' ? s[0] : s[s.length - 1]] };
    }
    default:   // NOUVELLE_SEQUENCE : le plan est seul sur sa ligne neuve.
      return { sequence: [], voisins: [] };
  }
}

/** Ce coup poserait-il un plan là où le même se trouve déjà ? */
function repeteUnPlan(banc, coup, plan, cfg) {
  const ou = cfg.planUnique;
  if (!ou || ou === 'AUCUNE' || plan.transition) return false;
  if (ou === 'MONTAGE') return banc.sequences.some((s) => s.some((p) => memePlan(p, plan)));
  const { sequence, voisins } = voisinageDuCoup(banc, coup);
  if (ou === 'SEQUENCE') return sequence.some((p) => memePlan(p, plan));
  return voisins.some((p) => memePlan(p, plan));
}

/**
 * Les coups légaux avec la carte en main. `hypothese` permet de les demander
 * pour une carte que l'on n'a pas encore prise : c'est ce qui autorise à viser
 * son emplacement depuis la rivière, avant même de dérusher. La partie n'est
 * pas touchée — on ne fait que lire le banc.
 */
export function coupsPossibles(state, p, hypothese) {
  const cfg = state.cfg;
  const banc = state.bancs[p];
  const carte = hypothese || state.mains[p][0];
  if (!carte) return [];
  const out = [];

  const bloqueGauche = cfg.generiqueBloque && banc.ouverture;
  const bloqueDroite = cfg.generiqueBloque && banc.fermeture;

  // Variante « banc en lignes » : chaque séquence tient sa propre ligne, et
  // une nouvelle séquence se glisse au-dessus ou en dessous des autres, jamais
  // entre deux. Il n'y a donc plus d'ordre à négocier au milieu du banc — on
  // empile, on n'insère pas.
  const lignes = !!cfg.bancEnLignes;

  const variantes = carte.type === 'DOUBLE' ? ['GP', 'PM'] : ['PL'];

  for (const format of variantes) {
    const brut = carte.type === 'DOUBLE' ? moitiesDe(carte)[format] : plHalf(carte);

    // Un Plan Large ouvre toujours une nouvelle séquence — et occupe donc une
    // ligne à lui seul quand le banc se lit en lignes. En lignes, la variante
    // l'impose : une ligne par séquence n'aurait pas de sens si un Plan Large
    // pouvait s'accrocher au bout d'une autre.
    if (format === 'PL' && (cfg.plNouvelleSequence || lignes)) {
      // Le banc ne porte qu'un nombre limité de séquences. Une fois ses lignes
      // ouvertes, un Plan Large n'en ouvre plus : il ne peut plus entrer que
      // **par la charnière d'un Raccord**, dans une ligne déjà là — ce que la
      // boucle ETENDRE ci-dessous propose encore.
      const places = banc.sequences.length >= limiteSequences(cfg) ? []
        : lignes && banc.sequences.length
          ? [0, banc.sequences.length]   // au-dessus, ou en dessous : jamais entre
          : Array.from({ length: banc.sequences.length + 1 }, (_, i) => i);
      for (const i of places) {
        if (i === 0 && bloqueGauche) continue;
        if (i === banc.sequences.length && bloqueDroite) continue;
        out.push({ carte, format, action: 'NOUVELLE_SEQUENCE', pos: i });
      }
      // Un Raccord posé au bout d'une ligne y fait **charnière** : un Plan
      // Large peut alors se poser de l'autre côté de lui, dans cette même
      // ligne. Une ligne porte donc deux Plans Larges, ou plus — leurs points
      // et leurs icônes valent pour toute la ligne, celles qui s'y trouvaient
      // déjà comprises, puisque c'est une seule séquence. C'est la manière
      // dont un Raccord relie, une fois le banc passé en lignes : deux
      // séquences ne se touchent plus, il les réunit sur une ligne.
      if (lignes && cfg.raccordConnecte) {
        const cotes = cfg.sensPose === 'droite' ? ['droite'] : ['gauche', 'droite'];
        banc.sequences.forEach((seq, si) => {
          for (const cote of cotes) {
            if (cote === 'gauche' && si === 0 && bloqueGauche) continue;
            if (cote === 'droite' && si === banc.sequences.length - 1 && bloqueDroite) continue;
            const voisin = cote === 'gauche' ? seq[0] : seq[seq.length - 1];
            if (!voisin || voisin.transition !== 'RACCORD') continue;
            out.push({ carte, format, action: 'ETENDRE', seq: si, cote });
          }
        });
      }
      continue;
    }

    // Une moitié Générique se pose en tête ou en fin de montage.
    if (brut.transition === 'OUVERTURE' || brut.transition === 'CREDITS' || brut.dual) {
      const roles = brut.dual ? ['OUVERTURE', 'CREDITS'] : [brut.transition];
      for (const role of roles) {
        if (role === 'OUVERTURE' && !banc.ouverture && banc.sequences.length) {
          out.push({ carte, format, action: 'GENERIQUE', role, pos: 0 });
        }
        if (role === 'CREDITS' && !banc.fermeture && banc.sequences.length) {
          out.push({ carte, format, action: 'GENERIQUE', role, pos: banc.sequences.length - 1 });
        }
      }
      if (!brut.dual) continue;
    }

    // Une Carte Raccord relie : glissée entre deux séquences, elle les raccorde
    // forcément — elle ne peut pas s'y poser sans relier. Aux deux bouts du
    // montage, en revanche, elle se pose comme un plan ordinaire.
    // `raccordConnecte: false` en refait un plan ordinaire partout (variante).
    // En lignes, un Raccord ne relie plus rien : deux séquences ne se touchent
    // pas, elles se succèdent. Il se pose donc comme un plan ordinaire, en
    // attendant le pouvoir qu'il recevra.
    const raccord = cfg.raccordConnecte && !lignes && brut.transition === 'RACCORD';
    if (raccord) {
      for (let i = 0; i < banc.sequences.length - 1; i++) {
        const g = banc.sequences[i], d = banc.sequences[i + 1];
        if (!poseAutorisee(cfg, g[g.length - 1], brut) || !poseAutorisee(cfg, d[0], brut)) continue;
        out.push({ carte, format, action: 'SOUDER', pos: i });
      }
    }

    // Pose ordinaire : au bout d'une séquence existante. Un Raccord n'a droit
    // qu'aux deux bouts du montage : à l'intérieur, il serait entre deux
    // séquences sans les relier, ce qui n'existe pas — c'est « raccorder ».
    banc.sequences.forEach((seq, i) => {
      const cotes = cfg.sensPose === 'droite' ? ['droite'] : ['gauche', 'droite'];
      for (const cote of cotes) {
        if (cote === 'gauche' && i === 0 && bloqueGauche) continue;
        if (cote === 'droite' && i === banc.sequences.length - 1 && bloqueDroite) continue;
        if (raccord && !(cote === 'gauche' ? i === 0 : i === banc.sequences.length - 1)) continue;
        const voisin = cote === 'gauche' ? seq[0] : seq[seq.length - 1];
        if (!poseAutorisee(cfg, voisin, brut)) continue;
        out.push({ carte, format, action: 'ETENDRE', seq: i, cote });
      }
    });

    // Si le banc est vide, on ouvre une séquence. Dans la variante « pas de
    // Plans de départ », c'est un Plan Large qui ouvre le banc — mais la règle
    // se pose au **dérushage**, où lui seul est proposé tant qu'il n'y a pas de
    // séquence : inutile de l'imposer une seconde fois ici, et le faire
    // bloquerait la joueuse qui aurait pris autre chose faute de Plan Large.
    if (!banc.sequences.length) out.push({ carte, format, action: 'NOUVELLE_SEQUENCE', pos: 0 });
  }

  // Variante des plans uniques : on écarte à la fin les coups qui poseraient un
  // plan là où le même se trouve déjà. Un seul endroit à lire plutôt qu'un test
  // répété à chaque façon de poser — et la règle vaut alors pour toutes.
  if (cfg.planUnique && cfg.planUnique !== 'AUCUNE') {
    return out.filter((c) => {
      const plan = c.carte.type === 'DOUBLE' ? moitiesDe(c.carte)[c.format] : plHalf(c.carte);
      return !repeteUnPlan(banc, c, plan, cfg);
    });
  }

  return out;
}

/** Applique un coup sur un banc. Renvoie le banc modifié (muté). */
export function appliquer(banc, coup, cfg) {
  // Le recto et le verso d'une carte ne portent pas le même minutage : la face
  // jouée se déduit du bout où la moitié visible se retrouve.
  const plan = planPose(coup.carte, coup.format, coup.role, faceJouee(coup.format, coup.cote, cfg));
  return appliquerPlan(banc, coup, plan);
}

/**
 * Pose un plan **déjà choisi** à l'endroit qu'un coup désigne. `appliquer` s'en
 * sert après avoir déduit la moitié et la face d'une carte ; le Banc de montage
 * s'en sert directement, puisqu'on y désigne le plan soi-même — sans carte, et
 * sans que le côté de pose décide de la face.
 */
export function appliquerPlan(banc, coup, plan) {
  switch (coup.action) {
    case 'NOUVELLE_SEQUENCE':
      // Le plan qui ouvre une ligne en est l'**ancre** : c'est sur lui que la
      // ligne se centre, et il le reste. Sans cette marque, un second Plan
      // Large posé à gauche d'un Raccord deviendrait le premier de la ligne,
      // et l'ancre lui sauterait dessus — toute la ligne se déplacerait alors
      // sous les yeux, alors qu'aucune carte déjà posée n'a bougé.
      plan.ancre = true;
      banc.sequences.splice(coup.pos, 0, [plan]);
      break;
    case 'ETENDRE':
      if (coup.cote === 'gauche') banc.sequences[coup.seq].unshift(plan);
      else banc.sequences[coup.seq].push(plan);
      break;
    case 'SOUDER': {
      const g = banc.sequences[coup.pos], d = banc.sequences[coup.pos + 1];
      banc.sequences.splice(coup.pos, 2, g.concat([plan], d));
      break;
    }
    case 'GENERIQUE':
      if (coup.role === 'OUVERTURE') {
        banc.sequences[0].unshift(plan);
        banc.ouverture = true;
      } else {
        const last = banc.sequences[banc.sequences.length - 1];
        last.push(plan);
        banc.fermeture = true;
      }
      break;
    default:
      break;
  }
  return banc;
}

/**
 * Où la carte vient-elle d'atterrir, séquence et rang ? L'animation part de la
 * pioche et doit savoir sur quel plan se poser. `avantSouder` est la longueur
 * de la séquence de gauche avant la soudure, seul cas où la position ne se lit
 * pas sur le banc d'après.
 */
function positionPosee(banc, coup, avantSouder) {
  switch (coup.action) {
    case 'NOUVELLE_SEQUENCE': return { seq: coup.pos, idx: 0 };
    case 'ETENDRE': return {
      seq: coup.seq,
      idx: coup.cote === 'gauche' ? 0 : banc.sequences[coup.seq].length - 1,
    };
    case 'SOUDER': return { seq: coup.pos, idx: avantSouder };
    case 'GENERIQUE': return coup.role === 'OUVERTURE'
      ? { seq: 0, idx: 0 }
      : { seq: banc.sequences.length - 1, idx: banc.sequences[banc.sequences.length - 1].length - 1 };
    default: return { seq: 0, idx: 0 };
  }
}

export function poser(state, p, coup) {
  const banc = state.bancs[p];
  const avantSouder = coup.action === 'SOUDER' && banc.sequences[coup.pos]
    ? banc.sequences[coup.pos].length : 0;
  appliquer(banc, coup, state.cfg);
  state.dernierPose = { p, ...positionPosee(banc, coup, avantSouder) };
  state.posees[p]++;
  noterCourbe(state, p);
  declencherFin(state, p);
  state.mains[p] = [];
  const quoi = coup.format === 'PL' ? `Plan Large ${coup.carte.num}`
    : `${coup.format === 'GP' ? 'Gros Plan' : 'Plan Moyen'} ${coup.format === 'GP' ? coup.carte.gpNum : coup.carte.pmNum}`;
  const ou = {
    NOUVELLE_SEQUENCE: 'en ouvrant une séquence',
    ETENDRE: coup.cote === 'gauche' ? 'à gauche d’une séquence' : 'à droite d’une séquence',
    SOUDER: 'en soudant deux séquences',
    GENERIQUE: coup.role === 'OUVERTURE' ? 'en ouverture du film' : 'en fin de film',
  }[coup.action];
  journal(state, `${state.joueurs[p].nom} monte un ${quoi} ${ou}`, p);
}

// --- Enchaînement ----------------------------------------------------------

/**
 * Une joueuse vient de poser son dernier plan : les autres ont droit à un tour
 * chacune, puis la partie s'arrête. On retient qui a déclenché la fin, et l'on
 * compte les tours joués depuis.
 */
function declencherFin(state, p) {
  if (state.finDeclenchee != null) return;
  if (plansComptes(state.bancs[p]) < state.cfg.tours) return;
  state.finDeclenchee = p;
  state.toursApresFin = 0;
  journal(state, `${state.joueurs[p].nom} pose son ${state.cfg.tours}e plan — un dernier tour pour les autres`, p);
}

/** Le tour de la dernière joueuse est joué : on arrête. */
function finirSiTourBoucle(state) {
  if (state.finDeclenchee == null) return;
  if (state.toursApresFin < state.joueurs.length - 1) return;
  state.finie = true;
  state.duree = Date.now() - state.debut;
  journal(state, 'Fin du montage — décompte');
}

/**
 * Passe à la joueuse suivante, change de phase et détecte la fin.
 *
 * `tourComplet` — la lecture par défaut — donne à chaque joueuse un tour d'un
 * seul tenant : elle dérushe, elle monte, puis elle passe la main. On suit
 * ainsi le coup entier de celle qui joue, carte prise et carte posée. Le texte
 * imprimé décrit l'autre ordre, par phases : toutes dérushent, puis toutes
 * montent. `tourComplet: false` le rétablit.
 */
export function avancer(state) {
  const n = state.joueurs.length;
  const complet = state.cfg.tourComplet !== false && state.phase !== 'DEPART';

  // Dérusher n'est plus passer la main : la même joueuse enchaîne son montage.
  if (complet && state.phase === 'DERUSHAGE') {
    state.phase = 'MONTAGE';
    return state.finie;
  }

  // Un tour de montage s'achève : s'il appartient à une autre que celle qui a
  // déclenché la fin, c'est un des derniers tours.
  if (state.phase === 'MONTAGE' && state.finDeclenchee != null && state.courant !== state.finDeclenchee) {
    state.toursApresFin = (state.toursApresFin || 0) + 1;
  }

  state.courant = (state.courant + 1) % n;

  if (complet) {
    state.phase = 'DERUSHAGE';
    if (state.courant === state.premier) state.tour++;
    finirSiTourBoucle(state);
  } else if (state.courant === state.premier) {
    if (state.phase === 'DEPART') state.phase = 'DERUSHAGE';
    else if (state.phase === 'DERUSHAGE') state.phase = 'MONTAGE';
    else {
      state.tour++;
      state.phase = 'DERUSHAGE';
    }
    finirSiTourBoucle(state);
  } else {
    finirSiTourBoucle(state);
  }

  // Plus rien à dérusher : la partie s'arrête aussi.
  if (!state.finie && state.phase === 'DERUSHAGE' && !optionsDerushage(state).length) {
    state.finie = true;
    state.duree = Date.now() - state.debut;
    journal(state, 'Plus aucune carte disponible — fin du montage');
  }
  return state.finie;
}

// --- Scores ----------------------------------------------------------------

export function scores(state) {
  return state.bancs.map((b) => compter(b, state.cfg));
}

export function classement(state) {
  const sc = scores(state);
  return state.joueurs
    .map((j, i) => ({ joueur: j, idx: i, ...sc[i] }))
    .sort((a, b) => b.total - a.total || b.cartesRaccord - a.cartesRaccord);
}
