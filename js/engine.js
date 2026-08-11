// ---------------------------------------------------------------------------
// EDIT — moteur de jeu
// ---------------------------------------------------------------------------

import {
  buildCartesDoubles, buildPlansLarges, faceHalves, plHalf, SCENE_BY_IDX,
} from './data.js';
import { compter } from './scoring.js';

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
  const mots = ['edit', 'coupe', 'raccord', 'champ', 'plan', 'rushes', 'banc', 'montage'];
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
      const fam1 = SCENE_BY_IDX[c.pmScene]?.famille;
      const fam2 = SCENE_BY_IDX[c.gpScene]?.famille;
      if (cfg.filtreFamilles && (cfg.filtreFamilles[fam1] === false || cfg.filtreFamilles[fam2] === false)) continue;
      doubles.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  const larges = [];
  const pls = buildPlansLarges();
  for (let k = 0; k < cfg.exemplairesPL; k++) {
    for (const c of pls) {
      if (cfg.retirerBrouillons && c.brouillon) continue;
      larges.push({ ...c, id: k ? `${c.id}#${k + 1}` : c.id });
    }
  }

  return { doubles, larges };
}

// --- Moitiés d'une carte ---------------------------------------------------

export function halvesOf(carte, verso) {
  if (carte.type === 'PL') return [plHalf(carte)];
  return faceHalves(carte, verso);
}

// --- Création d'une partie -------------------------------------------------

/**
 * joueurs : [{ nom, couleur, type: 'HUMAIN' | 'NOVICE' | 'EQUILIBRE' | 'STRATEGE' }]
 */
export function creerPartie(joueurs, cfg, graine) {
  const seed = graine || nouvelleGraine();
  const rand = rng(seed);
  const { doubles, larges } = construirePaquet(cfg);

  const departs = larges.filter((c) => c.depart);
  const reste = larges.filter((c) => !c.depart);

  let pioche = melanger(cfg.planLargeEnMain ? doubles.concat(reste) : doubles, rand);
  const departsMel = melanger(departs, rand);

  const state = {
    seed,
    cfg,
    joueurs: joueurs.map((j, i) => ({ ...j, idx: i })),
    mains: joueurs.map(() => []),
    bancs: joueurs.map(() => []),
    poses: joueurs.map(() => []),
    pioche,
    defausse: [],
    tour: 1,
    courant: 0,
    finie: false,
    journal: [],
    debut: Date.now(),
  };

  if (cfg.premierJoueurAleatoire) state.courant = Math.floor(rand() * joueurs.length);
  state.premier = state.courant;

  if (cfg.bancCommun) {
    state.bancCommun = [];
    state.posesCommun = [];
  }

  // Plan de départ
  if (cfg.planDepart && departsMel.length) {
    joueurs.forEach((_, i) => {
      const c = departsMel[i % departsMel.length];
      poser(state, i, { carte: c, verso: false, cote: 'droite' }, true);
    });
  }

  // Mains de départ
  joueurs.forEach((_, i) => {
    for (let k = 0; k < cfg.mainDepart; k++) piocher(state, i);
  });

  journal(state, `Partie lancée — graine ${seed} · ${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''}`);
  return state;
}

function journal(state, texte, joueur = null) {
  state.journal.push({ tour: state.tour, texte, joueur });
  if (state.journal.length > 400) state.journal.shift();
}

export function piocher(state, p) {
  if (!state.pioche.length) return null;
  const c = state.pioche.shift();
  state.mains[p].push(c);
  return c;
}

// --- Coups légaux ----------------------------------------------------------

export function bancDe(state, p) {
  return state.cfg.bancCommun ? state.bancCommun : state.bancs[p];
}

export function coupsPossibles(state, p) {
  const cfg = state.cfg;
  const banc = bancDe(state, p);
  const out = [];
  const faces = cfg.retournement ? [false, true] : [false];

  for (const carte of state.mains[p]) {
    const facesCarte = carte.type === 'PL' ? [false] : faces;
    for (const verso of facesCarte) {
      if (banc.length === 0) { out.push({ carte, verso, cote: 'droite', pos: 0 }); continue; }
      if (cfg.sensPose === 'droite') {
        out.push({ carte, verso, cote: 'droite', pos: banc.length });
      } else if (cfg.sensPose === 'bords') {
        out.push({ carte, verso, cote: 'gauche', pos: 0 });
        out.push({ carte, verso, cote: 'droite', pos: banc.length });
      } else {
        for (let i = 0; i <= banc.length; i++) out.push({ carte, verso, cote: 'libre', pos: i });
      }
    }
  }
  return out;
}

// --- Pose ------------------------------------------------------------------

export function poser(state, p, coup, silencieux = false) {
  const { carte, verso } = coup;
  const cfg = state.cfg;
  const halves = halvesOf(carte, verso).map((h) => ({ ...h, carteId: carte.id, verso }));
  const banc = bancDe(state, p);
  const poses = cfg.bancCommun ? state.posesCommun : state.poses[p];

  let pos = coup.pos;
  if (coup.cote === 'gauche') pos = 0;
  else if (coup.cote === 'droite') pos = banc.length;

  banc.splice(pos, 0, ...halves);
  poses.push({ carte, verso, pos, joueur: p, tour: state.tour });

  // Retire la carte de la main
  const k = state.mains[p].findIndex((c) => c.id === carte.id);
  if (k >= 0) state.mains[p].splice(k, 1);

  if (!silencieux) {
    const nom = state.joueurs[p].nom;
    const desc = carte.type === 'PL'
      ? `Plan Large ${carte.num}`
      : `${halves[0].format === 'GP' ? 'GP' : 'PM'} ${halves[0].num} | ${halves[1].format === 'GP' ? 'GP' : 'PM'} ${halves[1].num}`;
    journal(state, `${nom} pose ${desc} ${coup.cote === 'gauche' ? 'à gauche' : coup.cote === 'droite' ? 'à droite' : `en position ${pos}`}`, p);
  }
  return halves;
}

// --- Enchaînement des tours -----------------------------------------------

export function finDeTour(state) {
  const cfg = state.cfg;
  const p = state.courant;
  while (state.mains[p].length < cfg.mainMax && state.pioche.length) piocher(state, p);

  const dernier = (state.courant + 1) % state.joueurs.length === state.premier;
  state.courant = (state.courant + 1) % state.joueurs.length;
  if (dernier) state.tour++;

  const finTours = cfg.tours > 0 && state.tour > cfg.tours;
  const finPioche = cfg.piocheFinPartie && !state.pioche.length
    && state.joueurs.every((_, i) => state.mains[i].length === 0);
  const plusDeCoup = state.joueurs.every((_, i) => state.mains[i].length === 0);

  if (finTours || finPioche || plusDeCoup) {
    state.finie = true;
    state.duree = Date.now() - state.debut;
    journal(state, 'Fin de partie — décompte');
  }
  return state.finie;
}

// --- Scores ----------------------------------------------------------------

export function scores(state) {
  return state.joueurs.map((j, i) => {
    const banc = bancDe(state, i);
    if (state.cfg.bancCommun) {
      // Banc commun : chaque joueur ne marque que les plans qu'il a posés.
      const miens = new Set(state.posesCommun.filter((x) => x.joueur === i).map((x) => x.carte.id));
      const vue = banc.map((h) => (miens.has(h.carteId) ? h : { ...h, obj: null }));
      return compter(vue, state.cfg);
    }
    return compter(banc, state.cfg);
  });
}

export function classement(state) {
  const sc = scores(state);
  return state.joueurs
    .map((j, i) => ({ joueur: j, idx: i, ...sc[i] }))
    .sort((a, b) => b.total - a.total || b.nbRaccords - a.nbRaccords);
}
