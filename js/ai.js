// ---------------------------------------------------------------------------
// EDIT — intelligences artificielles
// ---------------------------------------------------------------------------
// Novice    : regarde le coup immédiat, et se trompe souvent.
// Équilibré : compare tous les placements et évite d'éparpiller ses séquences.
// Stratège  : anticipe le tour suivant à partir de ce qu'offrent les chutiers.

import { coupsPossibles, appliquer, optionsDerushage, choixDepart } from './engine.js?v=1.26';
import { compter } from './scoring.js?v=1.26';
import { PROFILS_IA } from './config.js?v=1.26';

function cloneBanc(b) {
  return { sequences: b.sequences.map((s) => s.slice()), ouverture: b.ouverture, fermeture: b.fermeture };
}

/**
 * Une longue séquence vaut mieux qu'un montage éparpillé : les Cartes Raccord
 * comptent les cartes de leur séquence, et les paires ne se lisent qu'entre
 * deux plans voisins.
 */
function potentiel(banc, cfg) {
  const morceaux = banc.sequences.length;
  const plus = banc.sequences.reduce((m, s) => Math.max(m, s.length), 0);
  const penalite = cfg.porteeParDefaut === 'SEQUENCE' ? 2.2 : 0.9;
  return plus * 0.6 - Math.max(0, morceaux - 1) * penalite;
}

function noteCoup(banc, coup, cfg, base) {
  const essai = appliquer(cloneBanc(banc), coup, cfg);
  return { note: compter(essai, cfg).total - base, banc: essai };
}

/** Meilleur gain atteignable avec `carte` depuis `banc`, en un coup. */
function meilleurAvec(banc, carte, cfg, base) {
  const faux = { cfg, bancs: [banc], mains: [[carte]], joueurs: [{}] };
  let best = 0;
  for (const c of coupsPossibles(faux, 0)) {
    const g = noteCoup(banc, c, cfg, base).note;
    if (g > best) best = g;
  }
  return best;
}

// --- Phase A : que dérusher ? ---------------------------------------------

export function choisirDerushage(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const options = optionsDerushage(state);
  if (!options.length) return null;

  const banc = state.bancs[p];
  const base = compter(banc, state.cfg).total;

  const notes = options.map((o) => {
    let note;
    if (o.carte) {
      note = meilleurAvec(banc, o.carte, state.cfg, base);
    } else {
      // Pioche aveugle : on l'estime par la moyenne de ce que vaut le chutier.
      const vus = options.filter((x) => x.carte && x.carte.type === 'DOUBLE');
      note = vus.length
        ? vus.reduce((s, x) => s + meilleurAvec(banc, x.carte, state.cfg, base), 0) / vus.length
        : 1;
      note *= 0.92;
    }
    return { o, note: note + (profil.bruit ? (rand() - 0.5) * profil.bruit * 6 : 0) + rand() * 1e-3 };
  });

  notes.sort((a, b) => b.note - a.note);
  if (profil.bruit > 0.4 && rand() < 0.4) return notes[Math.floor(rand() * Math.min(notes.length, 3))].o;
  return notes[0].o;
}

// --- Phase B : où monter ? -------------------------------------------------

export function choisirCoup(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const cfg = state.cfg;
  const banc = state.bancs[p];
  const coups = coupsPossibles(state, p);
  if (!coups.length) return null;

  const base = compter(banc, cfg).total;
  const potBase = potentiel(banc, cfg);

  const notes = coups.map((c) => {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    let n = note;
    if (profil.profondeur >= 1) n += potentiel(apres, cfg) - potBase;
    if (profil.profondeur >= 2) {
      // Ce que le chutier permettrait d'enchaîner sur ce banc-là.
      const suivant = compter(apres, cfg).total;
      let meilleur = 0;
      for (const o of optionsDerushage(state)) {
        if (!o.carte || o.carte.id === c.carte.id) continue;
        const g = meilleurAvec(apres, o.carte, cfg, suivant);
        if (g > meilleur) meilleur = g;
      }
      n += meilleur * 0.45;
    }
    if (profil.bruit) n += (rand() - 0.5) * profil.bruit * 8;
    // Les ex æquo sont légion : les départager au hasard, sinon l'ordre de la
    // liste des coups décide à leur place.
    n += rand() * 1e-3;
    return { coup: c, note: n };
  });

  notes.sort((a, b) => b.note - a.note);
  if (profil.bruit > 0.4 && rand() < 0.35) {
    return notes[Math.floor(rand() * Math.min(notes.length, 4))].coup;
  }
  return notes[0].coup;
}

// --- Mise en place : quel Plan de départ ? ---------------------------------

export function choisirDepart(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const options = choixDepart(state, p);
  if (!options.length) return null;

  const notes = options.map((o) => {
    const banc = { sequences: [[{ ...o.plan, carteId: 'depart', depart: true }]], ouverture: false, fermeture: false };
    // Ce que ce départ vaudrait sur un montage déjà étoffé : on l'approche en
    // mesurant ce qu'il rapporte seul, plus la richesse de ses pastilles.
    const seul = compter(banc, state.cfg).total;
    const richesse = o.plan.el.length * 0.7;
    return { o, note: seul + richesse + (profil.bruit ? (rand() - 0.5) * profil.bruit * 4 : 0) };
  });
  notes.sort((a, b) => b.note - a.note);
  return notes[0].o;
}
