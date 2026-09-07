// ---------------------------------------------------------------------------
// EDIT — intelligences artificielles
// ---------------------------------------------------------------------------
// Novice    : regarde le coup immédiat, et se trompe souvent.
// Équilibré : compare tous les placements et évite d'éparpiller ses séquences.
// Stratège  : anticipe le tour suivant à partir de ce qu'offrent les chutiers.

import { coupsPossibles, appliquer, optionsDerushage, choixDepart, limiteSequences, limitePlans, ouverturesBanc } from './engine.js?v=2.23';
import { compter, bonusRegle, piocheOuverte, plansComptes } from './scoring.js?v=2.23';
import { PROFILS_IA } from './config.js?v=2.23';

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
  return plus * 0.6 - Math.max(0, morceaux - 1) * penalite + valeurDesDroits(banc, cfg);
}

/**
 * Combien de plans il reste à monter sur ce banc-là. C'est ce qui donne son
 * prix à la place : sur un banc qui a fini de se remplir, un bout fermé ne
 * coûte rien ; à mi-partie, il coûte tous les tours qu'il fera perdre.
 */
export function plansRestants(banc, cfg) {
  const limite = limitePlans(cfg);
  if (!limite) return 0;
  return Math.max(0, limite + bonusRegle(banc, cfg, 'PLAN_PLUS') - plansComptes(banc));
}

/**
 * Ce que coûte un montage qui se referme.
 *
 * Les IA ne regardaient que ce qu'un coup rapporte. Elles fermaient donc leur
 * banc sans y penser — le Générique de fin posé au cinquième tour, les côtés
 * remplis jusqu'à leur limite — et se retrouvaient sans place alors qu'il leur
 * restait des cartes à monter : chaque tour perdu vaut ce qu'un plan rapporte,
 * bien plus que le point qui avait décidé du coup.
 *
 * On ne pénalise que le MANQUE : tant que le banc offre autant d'endroits qu'il
 * reste de cartes à poser, rien à dire — de la place en trop ne sert à rien.
 * En dessous, chaque endroit manquant coûte le prix d'un plan.
 *
 * Ceci vaut pour **tous les profils**, la Novice comprise. Se boucher n'est pas
 * une faute de stratégie qu'on laisse à la débutante pour la rendre battable :
 * c'est marcher dans un mur, et une joueuse qui apprend le jeu voit le mur.
 */
const PRIX_PLACE = 2.4;

function respiration(banc, cfg, reste) {
  if (!reste || reste <= 0) return 0;
  const manque = reste - ouverturesBanc(banc, cfg);
  return manque > 0 ? -manque * PRIX_PLACE : 0;
}

/**
 * Ce que valent les pouvoirs de RÈGLE, que le décompte laisse à zéro.
 *
 * Ils ne rapportent rien au moment où on les pose : ils ouvrent une porte. Une
 * IA qui ne lirait que le score les prendrait donc pour des bandeaux vides et
 * ne les poserait jamais — sinon par hasard. Les valeurs sont des ordres de
 * grandeur en points, mesurés sur le décompte moyen d'une partie :
 *
 *   un plan de plus         vaut à peu près ce que rapporte un plan ordinaire ;
 *   une séquence de plus    ne vaut que si le banc est près de sa limite —
 *                           ailleurs c'est un droit qu'on n'utilisera pas ;
 *   la pioche au sommet     vaut le choix qu'elle ajoute, pas une carte de plus.
 *
 * Le pouvoir sur les Raccords n'est pas ici : celui-là change le TOTAL, et le
 * décompte le voit déjà.
 */
export function valeurDesDroits(banc, cfg) {
  let v = bonusRegle(banc, cfg, 'PLAN_PLUS') * 4;
  const seqPlus = bonusRegle(banc, cfg, 'SEQ_PLUS');
  if (seqPlus) {
    // Une ligne de plus ne sert qu'à qui manque de place : on la paie au prix
    // fort quand le banc est plein, presque rien quand il lui reste des lignes.
    const limite = limiteSequences(cfg, banc);
    const reste = Number.isFinite(limite) ? limite - banc.sequences.length : 9;
    v += seqPlus * (reste <= seqPlus ? 3.5 : 0.8);
  }
  if (piocheOuverte(banc, cfg, 'PMGP') && !cfg.piocheDirectePMGP) v += 1.5;
  if (piocheOuverte(banc, cfg, 'PL') && !cfg.piocheDirectePL) v += 1.2;
  return v;
}

function noteCoup(banc, coup, cfg, base) {
  const essai = appliquer(cloneBanc(banc), coup, cfg);
  return { note: compter(essai, cfg).total - base, banc: essai };
}

/**
 * Meilleur gain atteignable avec `carte` depuis `banc`, en un coup. `reste` est
 * ce qu'il restera à monter ensuite : une carte dont le seul emplacement ferme
 * le banc ne vaut pas ce qu'elle rapporte, et c'est en la DÉRUSHANT qu'on s'en
 * aperçoit — une fois en main, il est trop tard, il faut bien la poser.
 */
function meilleurAvec(banc, carte, cfg, base, reste) {
  const faux = { cfg, bancs: [banc], mains: [[carte]], joueurs: [{}] };
  const avant = reste ? respiration(banc, cfg, reste) : 0;
  let best = 0;
  let premier = true;
  for (const c of coupsPossibles(faux, 0)) {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    const g = note + (reste ? respiration(apres, cfg, reste) - avant : 0);
    if (premier || g > best) { best = g; premier = false; }
  }
  // Aucun emplacement : la carte ne se pose pas. `optionsDerushage` les écarte
  // déjà, mais l'estimation d'une pioche aveugle passe par ici.
  return premier ? 0 : best;
}

// --- Phase A : que dérusher ? ---------------------------------------------

export function choisirDerushage(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const options = optionsDerushage(state);
  if (!options.length) return null;

  const banc = state.bancs[p];
  const base = compter(banc, state.cfg).total;
  const reste = Math.max(0, plansRestants(banc, state.cfg) - 1);

  const notes = options.map((o) => {
    let note;
    if (o.carte) {
      note = meilleurAvec(banc, o.carte, state.cfg, base, reste);
    } else {
      // Pioche aveugle : on l'estime par la moyenne de ce que vaut le chutier.
      const vus = options.filter((x) => x.carte && x.carte.type === 'DOUBLE');
      note = vus.length
        ? vus.reduce((s, x) => s + meilleurAvec(banc, x.carte, state.cfg, base, reste), 0) / vus.length
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
  // Ce qu'il restera à monter APRÈS ce coup-ci : c'est cela que la place du
  // banc devra accueillir.
  const reste = Math.max(0, plansRestants(banc, cfg) - 1);
  const potBase = potentiel(banc, cfg);
  const respBase = respiration(banc, cfg, reste);

  const notes = coups.map((c) => {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    // Le coup qui bouche son propre banc coûte les tours qu'il fera perdre —
    // à tous les niveaux, sans quoi la Novice se mure.
    let n = note + respiration(apres, cfg, reste) - respBase;
    if (profil.profondeur >= 1) n += potentiel(apres, cfg) - potBase;
    if (profil.profondeur >= 2) {
      // Ce que le chutier permettrait d'enchaîner sur ce banc-là.
      const suivant = compter(apres, cfg).total;
      let meilleur = 0;
      for (const o of optionsDerushage(state)) {
        if (!o.carte || o.carte.id === c.carte.id) continue;
        const g = meilleurAvec(apres, o.carte, cfg, suivant, Math.max(0, reste - 1));
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
