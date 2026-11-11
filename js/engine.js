// ---------------------------------------------------------------------------
// EDIT — moteur de jeu (règles 4.1)
// ---------------------------------------------------------------------------
// Une pioche face cachée, une RIVIÈRE de quatre cartes visibles, et le CHUTIER,
// la défausse face visible. À son tour, une joueuse peut défausser une carte de
// la rivière, puis elle en choisit une et la monte dans son banc.
//
// Les cartes de la pioche sont de deux sortes : les Plans Larges, une image
// pleine carte, et les cartes à deux Gros Plans, dont on ne monte qu'une
// moitié — la GAUCHE à gauche d'une séquence, la DROITE à droite.

import {
  buildCartesDoubles, buildPlansLarges, buildDeparts, moitiesDe, plHalf, carteComplete, etiquettePlan,
} from './data.js';
import { compter, bancVide, plansComptes, bonusRegle, chutierOuvert } from './scoring.js';

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

// --- Le paquet -------------------------------------------------------------

/**
 * Ce qui se joue : les cartes à deux Gros Plans et les Plans Larges, mêlés dans
 * la pioche, et les cartes de départ, distribuées à part. Une carte écartée
 * dans le Matériel n'y est pas ; une carte à qui il manque une moitié se
 * consulte, elle ne se joue pas.
 */
export function construirePaquet() {
  return {
    doubles: buildCartesDoubles().filter((c) => c.actif && carteComplete(c)),
    larges: buildPlansLarges().filter((c) => c.actif),
    departs: buildDeparts(),
  };
}

/** Le nombre de cartes visibles de la rivière. */
export function tailleRiviere(cfg) {
  return Math.max(1, (cfg && cfg.riviere) | 0 || 4);
}

/**
 * Le paquet suffit-il pour `n` joueuses ? Chacune pose `tours` plans, son Plan
 * de départ compris — elle en prend donc `tours − 1` dans la rivière —, et la
 * rivière doit pouvoir rester pleine jusqu'au bout. Il faut aussi une carte de
 * départ par joueuse.
 */
export function bilanPaquet(cfg, n) {
  const { doubles, larges, departs } = construirePaquet();
  const aCompleter = buildCartesDoubles().filter((c) => c.actif && !carteComplete(c)).map((c) => c.id);
  const besoin = Math.max(0, (cfg.tours || 10) - 1) * n + tailleRiviere(cfg);
  const total = doubles.length + larges.length;
  const departsManquants = Math.max(0, n - departs.length);
  const manque = Math.max(0, besoin - total);
  return {
    n, besoin, total, doubles: doubles.length, larges: larges.length, departs: departs.length,
    incompletes: aCompleter.length, aCompleter, manque, departsManquants,
    jouable: manque <= 0 && departsManquants === 0,
  };
}

// --- Les plans d'une carte ---------------------------------------------------

/** Les plans qu'une carte porte : ses deux Gros Plans, ou son Plan Large. */
export function plansVisibles(carte) {
  if (carte.type !== 'DOUBLE') return [plHalf(carte)];
  const m = moitiesDe(carte);
  return [m.G, m.D].filter(Boolean);
}

/** Le plan tel qu'il se posera : la moitié choisie, ou le Plan Large. */
export function planPose(carte, moitie) {
  const plan = carte.type === 'DOUBLE' ? moitiesDe(carte)[moitie] : plHalf(carte);
  return { ...plan, el: plan.el.slice(), carteId: carte.id };
}

/** Comment le journal nomme une carte. */
function nomCarte(carte) {
  if (carte.type !== 'DOUBLE') return `le Plan Large ${etiquettePlan(plHalf(carte))}`;
  return `la carte ${plansVisibles(carte).map(etiquettePlan).join(' | ')}`;
}

// --- Création d'une partie -------------------------------------------------

export function creerPartie(joueurs, cfg, graine) {
  const seed = graine || nouvelleGraine();
  const rand = rng(seed);
  const { doubles, larges, departs } = construirePaquet();
  const n = joueurs.length;

  const state = {
    seed,
    cfg,
    joueurs: joueurs.map((j, i) => ({ ...j, idx: i })),
    bancs: joueurs.map(() => bancVide()),
    posees: joueurs.map(() => 0),
    mains: joueurs.map(() => []),        // la carte prise ce tour-ci
    departsProposes: joueurs.map(() => []),
    // Une seule pioche, face cachée : Plans Larges et cartes à deux Gros Plans
    // y sont mêlés, on ne sait pas ce qu'on va tirer.
    pioche: melanger([...doubles, ...larges], rand),
    riviere: [],
    // La défausse, face visible. La dernière carte défaussée est au bout.
    chutier: [],
    defausseFaite: false,     // la joueuse en cours a-t-elle déjà défaussé ?
    recyclages: 0,
    passes: 0,
    tour: 1,
    phase: 'DEPART',          // DEPART | DERUSHAGE (choisir sa carte) | MONTAGE (la poser)
    courant: 0,
    finie: false,
    journal: [],
    // Le score de chaque joueuse après chacun de ses coups : la courbe de fin
    // de partie s'y lit directement.
    courbe: joueurs.map(() => []),
    debut: Date.now(),
  };

  const taille = tailleRiviere(cfg);
  while (state.riviere.length < taille && state.pioche.length) state.riviere.push(state.pioche.shift());

  // La première joueuse : tirée au sort, ou désignée dans les options.
  state.courant = cfg.premierJoueurAleatoire
    ? Math.floor(rand() * n)
    : Math.min(n - 1, Math.max(0, cfg.premierJoueur | 0));
  state.premier = state.courant;

  // Les cartes de départ sont mélangées et chaque joueuse en reçoit UNE : elle
  // a deux plans au choix, un par face, et deux joueuses n'ont jamais le même
  // couple.
  const paquet = melanger(departs, rand);
  joueurs.forEach((_, i) => { if (paquet[i]) state.departsProposes[i].push(paquet[i]); });

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

// --- Le Plan de départ -------------------------------------------------------

/** Les deux faces de la carte de départ reçue, par minutage croissant. */
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
  // Le Plan de départ ouvre la première séquence : il en est le centre.
  const plan = { ...choix.plan, carteId: `${choix.carte.id}f${choix.face}`, depart: true, ancre: true };
  state.bancs[p] = { sequences: [[plan]] };
  state.dernierPose = { p, seq: 0, idx: 0 };
  noterCourbe(state, p);
  state.departsProposes[p] = [];
  journal(state, `${state.joueurs[p].nom} ouvre son banc avec le Plan de départ ${etiquettePlan(plan)}`, p);
  declencherFin(state, p);
}

export function departsFaits(state) {
  return state.bancs.every((b) => b.sequences.length > 0);
}

// --- Choisir sa carte : la rivière et le Chutier ----------------------------

/** La carte du dessus du Chutier — la dernière défaussée. */
export function sommetChutier(state) {
  return state.chutier.length ? state.chutier[state.chutier.length - 1] : null;
}

/**
 * Une carte de la pioche. Quand elle est vide, le Chutier — sa carte du dessus
 * exceptée, qui reste visible — est mélangé pour en refaire une. Le mélange se
 * tire de la graine : deux appareils qui rejouent la même partie obtiennent la
 * même pioche.
 */
function piocher(state) {
  if (!state.pioche.length && state.cfg.recyclerChutier !== false && state.chutier.length > 1) {
    const dessus = state.chutier.pop();
    state.recyclages = (state.recyclages || 0) + 1;
    state.pioche = melanger(state.chutier, rng(`${state.seed}|chutier|${state.recyclages}`));
    state.chutier = [dessus];
    journal(state, 'La pioche est vide — le Chutier est mélangé pour en refaire une');
  }
  return state.pioche.length ? state.pioche.shift() : null;
}

/**
 * La carte qui part **laisse sa place à celle qui la remplace** : la nouvelle
 * se pose exactement là où était l'ancienne, et les autres ne bougent pas.
 */
function sortirDeLaRiviere(state, i) {
  const neuve = piocher(state);
  return (neuve ? state.riviere.splice(i, 1, neuve) : state.riviere.splice(i, 1))[0];
}

/** La joueuse en cours peut-elle encore défausser une carte de la rivière ? */
export function peutDefausser(state, p = state.courant) {
  return !state.finie && state.phase === 'DERUSHAGE' && p === state.courant
    && state.cfg.defausse !== false && !state.defausseFaite && state.riviere.length > 0;
}

/**
 * Avant de choisir, on peut écarter une carte de la rivière : elle part au
 * Chutier, face visible, et la rivière se recomplète. Une fois par tour.
 */
export function defausser(state, p, index) {
  if (!peutDefausser(state, p)) return null;
  const carte = state.riviere[index];
  if (!carte) return null;
  // La carte rejoint le Chutier AVANT que la rivière se recomplète : si la
  // pioche est vide, c'est le reste du Chutier qui est mélangé, pas elle.
  state.chutier.push(carte);
  state.riviere.splice(index, 1);
  const neuve = piocher(state);
  if (neuve) state.riviere.splice(index, 0, neuve);
  state.defausseFaite = true;
  state.defausses = (state.defausses || 0) + 1;
  journal(state, `${state.joueurs[p].nom} défausse ${nomCarte(carte)} au Chutier`, p);
  return carte;
}

/**
 * Tout ce que la joueuse en cours VOIT et pourrait prendre : les cartes de la
 * rivière, et la carte du dessus du Chutier si son banc porte le pouvoir qui
 * l'y autorise. Chaque option dit si la carte a où se poser (`bloquee`).
 */
export function cartesOffertes(state, p = state.courant) {
  const banc = state.bancs[p];
  const out = [];
  const pousse = (o) => {
    if (coupsPossibles(state, p, o.carte).length) out.push(o);
    else out.push({ ...o, bloquee: true, raison: raisonBlocage(state, p, o.carte) });
  };
  state.riviere.forEach((c, i) => pousse({ source: 'RIVIERE', index: i, carte: c }));
  const dessus = sommetChutier(state);
  if (dessus && chutierOuvert(banc, state.cfg)) pousse({ source: 'CHUTIER', carte: dessus });
  return out;
}

function raisonBlocage(state, p, carte) {
  const n = state.bancs[p].sequences.length;
  if (carte.type !== 'DOUBLE') {
    return `votre banc porte ${n > 1 ? `ses ${n} séquences` : 'sa séquence'} — `
      + 'un Plan Large n’y entre plus qu’à la suite d’un Raccord';
  }
  return 'aucune séquence n’a de place du bon côté pour l’une de ses moitiés';
}

/**
 * Ce que la joueuse en cours peut prendre ET monter. `toutes` ajoute les cartes
 * qu'elle voit sans pouvoir les poser — la table les montre alors éteintes, avec
 * la raison. Une liste vide ne veut pas dire que la table est vide : elle veut
 * dire que rien ne peut être monté, et qu'il faut défausser ou passer.
 */
export function optionsDerushage(state, toutes = false) {
  const offertes = cartesOffertes(state);
  return toutes ? offertes : offertes.filter((o) => !o.bloquee);
}

export function derusher(state, p, choix) {
  let carte = null;
  if (choix.source === 'CHUTIER') {
    carte = state.chutier.pop() || null;
  } else if (state.riviere[choix.index]) {
    carte = sortirDeLaRiviere(state, choix.index);
  }
  if (!carte) return null;
  if (choix.source === 'CHUTIER') state.prisesChutier = (state.prisesChutier || 0) + 1;
  state.mains[p] = [carte];
  journal(state, `${state.joueurs[p].nom} prend ${nomCarte(carte)}${
    choix.source === 'CHUTIER' ? ' sur le Chutier' : ''}`, p);
  return carte;
}

/**
 * Remet la pioche, la rivière et le Chutier en accord avec **la boîte**. Écarter
 * une carte dans le Matériel doit la retirer du paquet — y compris de la
 * rivière, où elle est aussitôt remplacée ; la réactiver doit l'y remettre ; et
 * refaire un assemblage doit se voir sur les cartes qui attendent.
 *
 * Trois choses ne bougent pas : les plans déjà posés, la carte en main, et les
 * cartes déjà jouées, qui ne reviennent pas dans la pioche.
 *
 * Une carte qui revient se glisse à une place tirée de la graine de la partie
 * et de son identité : deux fenêtres qui rejouent la même retouche rangent le
 * paquet de la même façon.
 */
export function resynchroniserBoite(state) {
  const { doubles, larges } = construirePaquet();
  const dispo = [...doubles, ...larges];
  const ok = new Map(dispo.map((c) => [c.id, c]));
  let bouge = 0;

  // Ce qui a déjà quitté le paquet : posé sur un banc, ou en main.
  const sorties = new Set();
  for (const banc of state.bancs) {
    for (const seq of banc.sequences) for (const plan of seq) if (plan.carteId) sorties.add(plan.carteId);
  }
  for (const main of state.mains) for (const c of main) sorties.add(c.id);

  // Ce qui n'est plus dans la boîte s'en va ; ce qui y reste prend sa forme
  // du jour — l'assemblage a pu changer.
  for (const pile of [state.pioche, state.riviere, state.chutier]) {
    const reste = pile.filter((c) => ok.has(c.id)).map((c) => ok.get(c.id));
    bouge += pile.length - reste.length;
    pile.length = 0; pile.push(...reste);
  }

  // Ce qui y revient se glisse dans la pioche, à une place reproductible.
  const presentes = new Set([...state.pioche, ...state.riviere, ...state.chutier].map((c) => c.id));
  for (const c of dispo) {
    if (presentes.has(c.id) || sorties.has(c.id)) continue;
    const i = hashSeed(`${state.seed}|retour|${c.id}`) % (state.pioche.length + 1);
    state.pioche.splice(i, 0, c);
    bouge++;
  }

  // La rivière retrouve sa taille : elle se recharge sur la pioche, et rend le
  // trop-plein au sommet.
  const taille = tailleRiviere(state.cfg);
  while (state.riviere.length < taille && state.pioche.length) state.riviere.push(state.pioche.shift());
  while (state.riviere.length > taille) state.pioche.unshift(state.riviere.pop());

  if (bouge) {
    journal(state, `La boîte a changé — ${bouge} carte${bouge > 1 ? 's' : ''} ${
      bouge > 1 ? 'entrent ou sortent' : 'entre ou sort'} de la pioche et de la rivière`);
  }
  return bouge;
}

// --- Monter sa carte ---------------------------------------------------------

function estPL(plan) { return plan.format === 'PL' || plan.format === 'DEP'; }

/** Une Carte Raccord — celle qui relie, ni l'Ouverture ni la Fin. */
const estRaccordPur = (p) => !!p && p.transition === 'RACCORD';

/**
 * Combien de séquences un banc peut porter : **trois**, l'une au-dessus de
 * l'autre, plus ce que lui donne le pouvoir « +1 Séquence » d'un Plan de
 * départ. Ce n'est pas le nombre de Plans Larges qui est borné — une séquence
 * peut en porter plusieurs, de part et d'autre d'un Raccord —, c'est le nombre
 * de lignes.
 */
export function limiteSequences(cfg, banc) {
  const n = cfg && cfg.sequencesMax;
  if (n === undefined || n === null || n <= 0) return Infinity;
  return n + bonusRegle(banc, cfg, 'SEQ_PLUS');
}

/**
 * Combien de plans arrêtent la partie : dix, Plan de départ compris — le même
 * compte pour tout le monde. C'est la première joueuse à poser son dixième
 * plan qui déclenche la fin.
 */
export function limitePlans(cfg) {
  return cfg && cfg.tours ? cfg.tours : 0;
}

/**
 * Combien de tours cette joueuse-là a encore le droit de jouer une fois la fin
 * déclenchée, ce tour-là compris. Un pour tout le monde — le dernier —, plus un
 * par « Carte supplémentaire » que son banc lui donne.
 */
function toursDus(state, i) {
  return 1 + bonusRegle(state.bancs[i], state.cfg, 'PLAN_PLUS');
}

/**
 * Le **centre** d'une séquence : le plan qui l'a ouverte — un Plan Large, ou le
 * Plan de départ. Il n'y en a qu'un par séquence, quel que soit le nombre de
 * Plans Larges qu'elle finit par porter : un second Plan Large, venu à la suite
 * d'un Raccord, ne fonde pas un second centre, il s'ajoute d'un côté du premier.
 * Faute de marque — un banc monté à la main dans le bac à sable —, on retombe
 * sur le premier Plan Large de la ligne.
 */
function centreDe(seq) {
  const marque = seq.findIndex((p) => p.ancre);
  return marque >= 0 ? marque : seq.findIndex((p) => estPL(p) || p.depart);
}

/**
 * Combien de **cartes** une séquence porte d'un côté de son centre. Tout
 * compte : un Raccord, l'Ouverture, la Fin, et le Plan Large posé à la suite
 * d'un Raccord occupent une place comme les autres.
 */
export function plansDuCote(seq, cote) {
  const c = centreDe(seq);
  if (c < 0) return 0;
  return cote === 'gauche' ? c : seq.length - 1 - c;
}

/** La séquence accepte-t-elle une carte de plus de ce côté-ci ? */
export function placeDuCote(cfg, seq, cote) {
  const max = cfg && cfg.plansParCote;
  if (!max || max <= 0) return true;
  return plansDuCote(seq, cote) < max;
}

/**
 * La RESPIRATION d'un banc : combien d'endroits il offre encore, sans regarder
 * de carte. Un côté de séquence qui a de la place, une séquence à ouvrir, cela
 * compte pour un. Les IA s'en servent pour ne pas refermer leur montage sur
 * lui-même alors qu'il leur reste des tours à jouer.
 */
export function ouverturesBanc(banc, cfg) {
  if (!banc) return 0;
  let n = 0;
  for (const seq of banc.sequences) {
    if (placeDuCote(cfg, seq, 'gauche')) n++;
    if (placeDuCote(cfg, seq, 'droite')) n++;
  }
  if (banc.sequences.length < limiteSequences(cfg, banc)) n++;
  return n;
}

/**
 * Où cette carte peut-elle se monter sur ce banc ?
 *
 * **Un Plan Large** ouvre une séquence — au-dessus ou en dessous des autres,
 * jamais entre deux —, tant que le banc n'a pas toutes les siennes. Il n'entre
 * dans une séquence déjà commencée qu'**à la suite d'un Raccord** : le Raccord
 * posé au bout d'une ligne y fait charnière, et le Plan Large vient de l'autre
 * côté de lui, s'il reste de la place de ce côté-là.
 *
 * **Une carte à deux Gros Plans** se monte par une moitié : la moitié GAUCHE
 * s'accroche au bout gauche d'une séquence, la moitié DROITE à son bout droit.
 * Après un Raccord, un Plan Large ou un Gros Plan — jamais un second Raccord.
 * La variante `raccordAppellePL` n'y laisse passer qu'un Plan Large.
 */
export function coupsSurBanc(banc, carte, cfg) {
  const out = [];
  const seqs = banc.sequences;

  if (carte.type !== 'DOUBLE') {
    if (seqs.length < limiteSequences(cfg, banc)) {
      for (const pos of (seqs.length ? [0, seqs.length] : [0])) {
        out.push({ carte, moitie: 'PL', action: 'NOUVELLE_SEQUENCE', pos });
      }
    }
    seqs.forEach((seq, si) => {
      for (const cote of ['gauche', 'droite']) {
        const voisin = cote === 'gauche' ? seq[0] : seq[seq.length - 1];
        if (!estRaccordPur(voisin) || !placeDuCote(cfg, seq, cote)) continue;
        out.push({ carte, moitie: 'PL', action: 'ETENDRE', seq: si, cote });
      }
    });
    return out;
  }

  const m = moitiesDe(carte);
  for (const [moitie, cote] of [['G', 'gauche'], ['D', 'droite']]) {
    if (!m[moitie]) continue;
    seqs.forEach((seq, si) => {
      const voisin = cote === 'gauche' ? seq[0] : seq[seq.length - 1];
      if (estRaccordPur(voisin) && (cfg.raccordAppellePL !== false || estRaccordPur(m[moitie]))) return;
      if (!placeDuCote(cfg, seq, cote)) return;
      out.push({ carte, moitie, action: 'ETENDRE', seq: si, cote });
    });
  }
  return out;
}

/**
 * Les coups légaux avec la carte en main. `hypothese` permet de les demander
 * pour une carte que l'on n'a pas encore prise : c'est ce qui autorise à viser
 * son emplacement depuis la rivière. La partie n'est pas touchée.
 */
export function coupsPossibles(state, p, hypothese) {
  const carte = hypothese || state.mains[p][0];
  if (!carte) return [];
  return coupsSurBanc(state.bancs[p], carte, state.cfg);
}

/** Applique un coup sur un banc. Renvoie le banc modifié (muté). */
export function appliquer(banc, coup) {
  return appliquerPlan(banc, coup, planPose(coup.carte, coup.moitie));
}

/**
 * Pose un plan **déjà choisi** à l'endroit qu'un coup désigne. `appliquer` s'en
 * sert après avoir pris la bonne moitié de la carte ; le Banc de montage s'en
 * sert directement, puisqu'on y désigne le plan soi-même.
 */
export function appliquerPlan(banc, coup, plan) {
  if (coup.action === 'NOUVELLE_SEQUENCE') {
    // Le plan qui ouvre une séquence en est le centre, et le reste.
    plan.ancre = true;
    banc.sequences.splice(coup.pos, 0, [plan]);
  } else if (coup.action === 'ETENDRE') {
    if (coup.cote === 'gauche') banc.sequences[coup.seq].unshift(plan);
    else banc.sequences[coup.seq].push(plan);
  }
  return banc;
}

/** Où la carte vient-elle d'atterrir, séquence et rang ? L'animation s'y pose. */
function positionPosee(banc, coup) {
  if (coup.action === 'NOUVELLE_SEQUENCE') return { seq: coup.pos, idx: 0 };
  return { seq: coup.seq, idx: coup.cote === 'gauche' ? 0 : banc.sequences[coup.seq].length - 1 };
}

export function poser(state, p, coup) {
  const banc = state.bancs[p];
  const plan = planPose(coup.carte, coup.moitie);
  appliquerPlan(banc, coup, plan);
  state.dernierPose = { p, ...positionPosee(banc, coup) };
  state.posees[p]++;
  noterCourbe(state, p);
  declencherFin(state, p);
  state.mains[p] = [];
  const quoi = plan.transition === 'RACCORD' ? 'un Raccord'
    : plan.format === 'GP' ? `le Gros Plan ${etiquettePlan(plan)}` : `le Plan Large ${etiquettePlan(plan)}`;
  const ou = coup.action === 'NOUVELLE_SEQUENCE' ? 'en ouvrant une séquence'
    : coup.cote === 'gauche' ? 'à gauche d’une séquence' : 'à droite d’une séquence';
  journal(state, `${state.joueurs[p].nom} monte ${quoi} ${ou}`, p);
}

// --- Enchaînement ----------------------------------------------------------

/**
 * Une joueuse vient de poser son dernier plan : les autres ont droit à un tour
 * chacune, puis la partie s'arrête. On retient qui a déclenché la fin.
 */
function declencherFin(state, p) {
  if (state.finDeclenchee != null) return;
  const limite = limitePlans(state.cfg);
  if (plansComptes(state.bancs[p]) < limite) return;
  state.finDeclenchee = p;
  state.toursApresFin = 0;
  // Ce que chacune a joué de tours depuis que la fin est tombée. Le tour où
  // elle tombe compte : c'est le dernier de celle qui l'a déclenchée.
  state.apresFin = {};
  journal(state, `${state.joueurs[p].nom} pose son ${limite}e plan — un dernier tour pour les autres`, p);
}

/** Le tour de la dernière joueuse est joué : on arrête. */
function finirSiTourBoucle(state) {
  if (state.finDeclenchee == null) return;
  const apres = state.apresFin || {};
  if (state.joueurs.some((_, i) => (apres[i] || 0) < toursDus(state, i))) return;
  state.finie = true;
  state.duree = Date.now() - state.debut;
  journal(state, 'Fin du montage — décompte');
}

/**
 * La joueuse en cours a fini son tour : la main passe à la suivante.
 *
 * Une fois la fin déclenchée, seules jouent encore celles à qui il reste un
 * tour : chacune le dernier, et une de plus pour qui porte « 1 Plan
 * supplémentaire ». Les autres sont sautées — sans quoi le tour de plus de
 * l'une en donnerait un à toutes celles assises avant elle.
 */
function finDeTour(state, passe) {
  const n = state.joueurs.length;
  if (state.finDeclenchee != null) {
    if (!state.apresFin) state.apresFin = {};
    state.apresFin[state.courant] = (state.apresFin[state.courant] || 0) + 1;
    if (state.courant !== state.finDeclenchee) state.toursApresFin = (state.toursApresFin || 0) + 1;
  }
  state.passes = passe ? (state.passes || 0) + 1 : 0;
  state.phase = 'DERUSHAGE';
  state.defausseFaite = false;

  const reste = (i) => state.finDeclenchee == null
    || ((state.apresFin || {})[i] || 0) < toursDus(state, i);
  let suivant = state.courant;
  for (let k = 0; k < n; k++) {
    suivant = (suivant + 1) % n;
    if (suivant === state.premier) state.tour++;
    if (reste(suivant)) break;
  }
  state.courant = suivant;
  finirSiTourBoucle(state);
  // Tout le monde a passé, l'une après l'autre : plus personne ne peut monter.
  if (!state.finie && state.passes >= n) {
    state.finie = true;
    state.duree = Date.now() - state.debut;
    journal(state, 'Plus personne ne peut monter de carte — fin du montage');
  }
  return state.finie;
}

/**
 * Passer son tour. Ce n'est permis qu'à celle qui ne peut rien monter : aucune
 * carte offerte n'a de place dans son banc. Elle a pu défausser d'abord, pour
 * tenter d'en faire venir une autre.
 */
export function peutPasser(state, p = state.courant) {
  return !state.finie && state.phase === 'DERUSHAGE' && p === state.courant
    && !optionsDerushage(state).length;
}

export function passer(state, p) {
  if (!peutPasser(state, p)) return false;
  journal(state, `${state.joueurs[p].nom} ne peut monter aucune carte et passe son tour`, p);
  state.passesTotal = (state.passesTotal || 0) + 1;
  finDeTour(state, true);
  return true;
}

/**
 * La carte en main n'a plus où se poser — la boîte a changé entre la prise et
 * la pose, par exemple. Elle part au Chutier, et le tour s'achève à `avancer`.
 */
export function ecarterMain(state, p) {
  for (const c of state.mains[p]) state.chutier.push(c);
  state.mains[p] = [];
}

/**
 * Enchaîne après une action : après le choix du Plan de départ, la joueuse
 * suivante choisit le sien ; après la prise d'une carte, la même joueuse la
 * monte ; après la pose, la main passe.
 */
export function avancer(state) {
  const n = state.joueurs.length;
  if (state.phase === 'DEPART') {
    state.courant = (state.courant + 1) % n;
    if (state.courant === state.premier) { state.phase = 'DERUSHAGE'; state.defausseFaite = false; }
    finirSiTourBoucle(state);
    return state.finie;
  }
  if (state.phase === 'DERUSHAGE') {
    state.phase = 'MONTAGE';
    return state.finie;
  }
  return finDeTour(state, false);
}

// --- Scores ----------------------------------------------------------------

export function scores(state) {
  return state.bancs.map((b) => compter(b, state.cfg));
}

export function classement(state) {
  const sc = scores(state);
  return state.joueurs
    .map((j, i) => ({ joueur: j, idx: i, ...sc[i] }))
    .sort((a, b) => b.total - a.total);
}
