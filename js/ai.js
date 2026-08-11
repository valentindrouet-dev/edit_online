// ---------------------------------------------------------------------------
// EDIT — intelligences artificielles
// ---------------------------------------------------------------------------
// Novice    : joue vite, se trompe souvent, ne regarde que le coup immédiat.
// Équilibré : choisit le meilleur delta de score sur le coup joué.
// Stratège  : anticipe un coup de plus et garde ses options ouvertes.

import { coupsPossibles, halvesOf, bancDe } from './engine.js';
import { compter, raccorde } from './scoring.js';
import { PROFILS_IA } from './config.js';

function bancApres(banc, coup, cfg) {
  const halves = halvesOf(coup.carte, coup.verso).map((h) => ({ ...h, carteId: coup.carte.id }));
  const copie = banc.slice();
  let pos = coup.pos;
  if (coup.cote === 'gauche') pos = 0;
  else if (coup.cote === 'droite') pos = copie.length;
  copie.splice(pos, 0, ...halves);
  return copie;
}

/** Ce que le banc « promet » : des bouts ouverts et des éléments variés. */
function potentiel(banc, cfg) {
  if (!banc.length) return 0;
  const bouts = [banc[0], banc[banc.length - 1]];
  const ouverts = new Set();
  for (const b of bouts) for (const e of b.el) ouverts.add(e);
  // Un bout riche en éléments raccorde plus facilement au tour suivant.
  return ouverts.size * 0.6;
}

/** Combien de cartes de la main pourraient raccorder sur les bouts actuels. */
function synergieMain(banc, main, cfg) {
  if (!banc.length || !main.length) return 0;
  const bouts = [banc[0], banc[banc.length - 1]];
  let n = 0;
  for (const c of main) {
    for (const verso of [false, true]) {
      const hs = halvesOf(c, verso);
      const bord = [hs[0], hs[hs.length - 1]];
      if (raccorde(bouts[0], bord[1], cfg) || raccorde(bouts[1], bord[0], cfg)) { n++; break; }
    }
  }
  return n * 0.35;
}

function evaluer(state, p, coup, profondeur) {
  const cfg = state.cfg;
  const banc = bancDe(state, p);
  const avant = compter(banc, cfg).total;
  const apres = bancApres(banc, coup, cfg);
  let note = compter(apres, cfg).total - avant;

  if (profondeur >= 1) note += potentiel(apres, cfg) - potentiel(banc, cfg);

  if (profondeur >= 2) {
    const restantes = state.mains[p].filter((c) => c.id !== coup.carte.id);
    note += synergieMain(apres, restantes, cfg);
    // Un coup de plus : le meilleur enchaînement possible depuis ce banc.
    let meilleurSuite = 0;
    const base = compter(apres, cfg).total;
    for (const c of restantes) {
      const faces = c.type === 'PL' ? [false] : (cfg.retournement ? [false, true] : [false]);
      for (const verso of faces) {
        const cotes = cfg.sensPose === 'droite' ? ['droite'] : ['gauche', 'droite'];
        for (const cote of cotes) {
          const b2 = bancApres(apres, { carte: c, verso, cote, pos: 0 }, cfg);
          const g = compter(b2, cfg).total - base;
          if (g > meilleurSuite) meilleurSuite = g;
        }
      }
    }
    note += meilleurSuite * 0.5;
  }
  return note;
}

/** Choisit un coup pour le joueur `p`. `rand` rend la décision reproductible. */
export function choisirCoup(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const coups = coupsPossibles(state, p);
  if (!coups.length) return null;

  const notes = coups.map((c) => ({
    coup: c,
    note: evaluer(state, p, c, profil.profondeur) + (profil.bruit ? (rand() - 0.5) * profil.bruit * 8 : 0),
  }));
  notes.sort((a, b) => b.note - a.note);

  // Le Novice pioche parfois dans le ventre mou du classement.
  if (profil.bruit > 0.4 && rand() < 0.35) {
    const k = Math.floor(rand() * Math.min(notes.length, 4));
    return notes[k].coup;
  }
  return notes[0].coup;
}
