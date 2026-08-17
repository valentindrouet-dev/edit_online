// ---------------------------------------------------------------------------
// EDIT — laboratoire d'équilibrage
// ---------------------------------------------------------------------------

import {
  creerPartie, poserDepart, derusher, poser, avancer, scores, rng, nouvelleGraine,
  coupsPossibles, optionsDerushage,
} from './engine.js?v=1.28';
import { choisirCoup, choisirDerushage, choisirDepart } from './ai.js?v=1.28';
import { SOURCES_LABEL } from './scoring.js?v=1.28';

/** Joue une partie entière en mémoire et renvoie son résumé. */
export function simulerPartie(joueurs, cfg, graine) {
  const state = creerPartie(joueurs, cfg, graine);
  const rand = rng(`${graine}-ia`);
  let garde = 0;

  while (!state.finie && garde++ < 5000) {
    const p = state.courant;
    if (state.phase === 'DEPART') {
      const d = choisirDepart(state, p, rand);
      if (d) poserDepart(state, p, d);
    } else if (state.phase === 'DERUSHAGE') {
      const o = choisirDerushage(state, p, rand) || optionsDerushage(state)[0];
      if (o) derusher(state, p, o);
    } else {
      const coups = coupsPossibles(state, p);
      if (coups.length) poser(state, p, choisirCoup(state, p, rand) || coups[0]);
      else state.mains[p] = [];
    }
    avancer(state);
  }

  const sc = scores(state);
  const totaux = sc.map((s) => s.total);
  const max = Math.max(...totaux);
  const gagnants = totaux.map((t, i) => (t === max ? i : -1)).filter((i) => i >= 0);
  return {
    seed: state.seed,
    tours: Math.min(state.tour, cfg.tours),
    scores: sc,
    totaux,
    gagnants,
    egalite: gagnants.length > 1,
    plans: sc.map((s) => s.plans),
    sequences: sc.map((s) => s.sequences),
    plusLongue: sc.map((s) => s.plusLongue),
    raccords: sc.map((s) => s.cartesRaccord),
  };
}

function stats(values) {
  if (!values.length) return { n: 0, moy: 0, med: 0, min: 0, max: 0, ecart: 0 };
  const s = values.slice().sort((a, b) => a - b);
  const moy = values.reduce((a, b) => a + b, 0) / values.length;
  const varr = values.reduce((a, b) => a + (b - moy) ** 2, 0) / values.length;
  return { n: values.length, moy, med: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1], ecart: Math.sqrt(varr) };
}

export async function campagne(joueurs, cfg, nbParties, opts = {}) {
  const onProgress = opts.onProgress || (() => {});
  const graineBase = opts.graine || nouvelleGraine();

  const parties = [];
  const paquet = 20;

  for (let i = 0; i < nbParties; i += paquet) {
    for (let k = i; k < Math.min(i + paquet, nbParties); k++) {
      parties.push(simulerPartie(joueurs, cfg, `${graineBase}-${k}`));
    }
    onProgress(Math.min(i + paquet, nbParties), nbParties);
    await new Promise((r) => setTimeout(r, 0));
  }

  const tousScores = parties.flatMap((p) => p.totaux);
  const parSiege = joueurs.map((_, i) => parties.map((p) => p.totaux[i]));
  const victoiresSiege = joueurs.map(() => 0);
  const victoiresProfil = {};
  const partiesProfil = {};

  const sources = {};
  Object.keys(SOURCES_LABEL).forEach((k) => { sources[k] = 0; });

  let egalites = 0, serrees = 0;
  const ecartsVainqueur = [];

  for (const p of parties) {
    if (p.egalite) egalites++;
    for (const g of p.gagnants) victoiresSiege[g] += 1 / p.gagnants.length;
    joueurs.forEach((j, i) => {
      partiesProfil[j.type] = (partiesProfil[j.type] || 0) + 1;
      if (p.gagnants.includes(i)) victoiresProfil[j.type] = (victoiresProfil[j.type] || 0) + 1 / p.gagnants.length;
    });
    for (const s of p.scores) for (const [k, v] of Object.entries(s.detail)) sources[k] += v;
    if (joueurs.length > 1) {
      const tri = p.totaux.slice().sort((a, b) => b - a);
      ecartsVainqueur.push(tri[0] - tri[tri.length - 1]);
      if (tri[0] - tri[1] <= 3) serrees++;
    }
  }

  const totalSources = Object.values(sources).reduce((a, b) => a + Math.abs(b), 0) || 1;

  return {
    graine: graineBase,
    nbParties: parties.length,
    joueurs: joueurs.map((j) => ({ nom: j.nom, type: j.type })),
    global: stats(tousScores),
    parSiege: parSiege.map((v, i) => ({
      nom: joueurs[i].nom, type: joueurs[i].type, ...stats(v),
      victoires: victoiresSiege[i], tauxVictoire: victoiresSiege[i] / parties.length,
    })),
    profils: Object.keys(partiesProfil).map((t) => ({
      type: t,
      parties: partiesProfil[t],
      victoires: victoiresProfil[t] || 0,
      taux: partiesProfil[t] ? (victoiresProfil[t] || 0) / partiesProfil[t] : 0,
    })),
    sources: Object.entries(sources)
      .map(([k, v]) => ({ k, label: SOURCES_LABEL[k], pts: v, part: Math.abs(v) / totalSources }))
      .sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts)),
    plans: stats(parties.flatMap((p) => p.plans)),
    sequences: stats(parties.flatMap((p) => p.sequences)),
    plusLongue: stats(parties.flatMap((p) => p.plusLongue)),
    raccords: stats(parties.flatMap((p) => p.raccords)),
    egalites, tauxEgalite: egalites / parties.length,
    serrees, tauxSerre: parties.length ? serrees / parties.length : 0,
    ecartVainqueur: stats(ecartsVainqueur),
    distribution: histogramme(tousScores),
  };
}

function histogramme(values, nb = 16) {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  const pas = Math.max(1, Math.ceil((max - min + 1) / nb));
  const bins = [];
  for (let x = min; x <= max; x += pas) bins.push({ de: x, a: x + pas - 1, n: 0 });
  for (const v of values) {
    const k = Math.min(bins.length - 1, Math.floor((v - min) / pas));
    bins[k].n++;
  }
  const maxN = Math.max(...bins.map((b) => b.n)) || 1;
  return bins.map((b) => ({ ...b, part: b.n / maxN, pct: b.n / values.length }));
}
