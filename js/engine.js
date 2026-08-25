// ---------------------------------------------------------------------------
// EDIT — moteur de jeu (règles v0.13)
// ---------------------------------------------------------------------------
// Un tour se joue en deux phases : le DÉRUSHAGE, où chaque joueuse pioche une
// carte, puis le MONTAGE, où chacune la pose dans son banc.

import {
  buildCartesDoubles, buildPlansLarges, buildDeparts, moitiesDe, plHalf, SCENE_BY_IDX, faceJouee,
} from './data.js?v=1.53';
import { compter, bancVide, plansComptes } from './scoring.js?v=1.53';

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
      const fam1 = SCENE_BY_IDX[c.pmScene]?.famille;
      const fam2 = SCENE_BY_IDX[c.gpScene]?.famille;
      if (cfg.filtreFamilles && (cfg.filtreFamilles[fam1] === false || cfg.filtreFamilles[fam2] === false)) continue;
      doubles.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  const larges = [];
  for (let k = 0; k < cfg.exemplairesPL; k++) {
    for (const c of buildPlansLarges()) {
      if (!c.actif) continue;
      if (cfg.retirerBrouillons && c.brouillon) continue;
      larges.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  return { doubles, larges, departs: buildDeparts() };
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

  const state = {
    seed,
    cfg,
    joueurs: joueurs.map((j, i) => ({ ...j, idx: i })),
    bancs: joueurs.map(() => bancVide()),
    posees: joueurs.map(() => 0),
    mains: joueurs.map(() => []),        // la carte dérushée du tour
    departsProposes: joueurs.map(() => []),
    piochePL: melanger(larges, rand),
    piochePMGP: melanger(doubles, rand),
    chutierPL: [],
    chutierPMGP: [],
    tour: 1,
    phase: 'DEPART',                     // DEPART | DERUSHAGE | MONTAGE
    courant: 0,
    finie: false,
    journal: [],
    // Le score de chaque joueuse après chacun de ses coups : la courbe de fin
    // de partie s'y lit directement.
    courbe: joueurs.map(() => []),
    debut: Date.now(),
  };

  const tPL = cfg.chutierPL || n;
  const tPM = cfg.chutierPMGP || n;
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
  joueurs.forEach((_, i) => {
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
  const plan = { ...choix.plan, carteId: `${choix.carte.id}f${choix.face}`, depart: true };
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

export function optionsDerushage(state) {
  const cfg = state.cfg;
  const out = [];
  state.chutierPL.forEach((c, i) => out.push({ source: 'CHUTIER_PL', index: i, carte: c }));
  state.chutierPMGP.forEach((c, i) => out.push({ source: 'CHUTIER_PMGP', index: i, carte: c }));
  // Les cartes Plan Moyen / Gros Plan sont recto-verso : une pioche ne peut
  // pas les cacher, on voit forcément la face du dessus. Les Plans Larges,
  // eux, ont un vrai dos — leur pioche reste aveugle.
  if (cfg.piocheDirectePMGP && state.piochePMGP.length) {
    out.push({ source: 'PIOCHE_PMGP', carte: state.piochePMGP[0], sommet: true });
  }
  if (cfg.piocheDirectePL && state.piochePL.length) {
    out.push({ source: 'PIOCHE_PL', carte: null, sommet: true });
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
  famille(larges, state.piochePL, state.chutierPL, state.cfg.chutierPL || n);
  famille(doubles, state.piochePMGP, state.chutierPMGP, state.cfg.chutierPMGP || n);
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

/** Le Plan Large ne peut pas toucher un autre Plan Large. */
function poseAutorisee(cfg, voisin, plan) {
  if (cfg.plContigu) return true;
  return !(voisin && estPL(voisin) && estPL(plan));
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
      const places = lignes && banc.sequences.length
        ? [0, banc.sequences.length]   // au-dessus, ou en dessous : jamais entre
        : Array.from({ length: banc.sequences.length + 1 }, (_, i) => i);
      for (const i of places) {
        if (i === 0 && bloqueGauche) continue;
        if (i === banc.sequences.length && bloqueDroite) continue;
        out.push({ carte, format, action: 'NOUVELLE_SEQUENCE', pos: i });
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

    // Si le banc est vide (variante sans Plan de départ), on ouvre une séquence.
    if (!banc.sequences.length) out.push({ carte, format, action: 'NOUVELLE_SEQUENCE', pos: 0 });
  }

  return out;
}

/** Applique un coup sur un banc. Renvoie le banc modifié (muté). */
export function appliquer(banc, coup, cfg) {
  // Le recto et le verso d'une carte ne portent pas le même minutage : la face
  // jouée se déduit du bout où la moitié visible se retrouve.
  const plan = planPose(coup.carte, coup.format, coup.role, faceJouee(coup.format, coup.cote, cfg));
  switch (coup.action) {
    case 'NOUVELLE_SEQUENCE':
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
