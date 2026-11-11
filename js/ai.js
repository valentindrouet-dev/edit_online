// ---------------------------------------------------------------------------
// EDIT — intelligences artificielles
// ---------------------------------------------------------------------------
// Novice    : regarde le coup immédiat, et se trompe souvent.
// Équilibré : compare tous les placements et évite d'éparpiller ses séquences.
// Stratège  : anticipe le tour suivant à partir de ce qu'offre la rivière, et
//             défausse ce qui servirait trop bien la joueuse suivante.

import {
  coupsSurBanc, coupsPossibles, appliquer, optionsDerushage, cartesOffertes, choixDepart,
  limiteSequences, limitePlans, placeDuCote, plansDuCote, peutDefausser,
} from './engine.js';
import {
  compter, bonusRegle, chutierOuvert, plansComptes, bonusRaccord, estRaccordSimple, tousLesPlans,
} from './scoring.js';
import { objsDe, moitiesDe } from './data.js';
import { PROFILS_IA } from './config.js';

function cloneBanc(b) {
  return { sequences: b.sequences.map((s) => s.slice()) };
}

/**
 * Une longue séquence vaut mieux qu'un montage éparpillé : bien des pouvoirs
 * comptent ce que porte LEUR séquence.
 */
function potentiel(banc, cfg) {
  const morceaux = banc.sequences.length;
  const plus = banc.sequences.reduce((m, s) => Math.max(m, s.length), 0);
  const penalite = cfg.porteeParDefaut === 'SEQUENCE' ? 2.2 : 0.9;
  return plus * 0.6 - Math.max(0, morceaux - 1) * penalite + valeurDesDroits(banc, cfg);
}

/**
 * Combien de plans il reste à monter sur ce banc-là. C'est ce qui donne son
 * prix à la place : sur un banc qui a fini de se remplir, un côté plein ne
 * coûte rien ; à mi-partie, il coûte tous les tours qu'il fera perdre.
 */
export function plansRestants(banc, cfg) {
  const limite = limitePlans(cfg);
  if (!limite) return 0;
  return Math.max(0, limite + bonusRegle(banc, cfg, 'PLAN_PLUS') - plansComptes(banc));
}

/**
 * La PLACE qu'il reste à un banc : les cartes que ses séquences acceptent
 * encore de chaque côté, plus tout ce que tiendraient les séquences qu'il a
 * encore le droit d'ouvrir.
 */
export function placeRestante(banc, cfg) {
  const max = cfg.plansParCote > 0 ? cfg.plansParCote : 6;
  let n = 0;
  for (const seq of banc.sequences) {
    n += Math.max(0, max - plansDuCote(seq, 'gauche')) + Math.max(0, max - plansDuCote(seq, 'droite'));
  }
  const limite = limiteSequences(cfg, banc);
  const lignes = Number.isFinite(limite) ? Math.max(0, limite - banc.sequences.length) : 2;
  return n + lignes * (1 + 2 * max);
}

/**
 * Ce que coûte un montage qui se referme : trois cartes de chaque côté d'un
 * centre, trois séquences — la place est comptée. Tant que le banc en offre
 * autant qu'il reste de cartes à poser, rien à dire ; en dessous, chaque place
 * manquante coûte le prix d'un plan. Et un banc qui n'a plus qu'un seul côté
 * ouvert ne prend plus qu'une moitié de chaque carte : on le paie un peu aussi.
 *
 * Ceci vaut pour **tous les profils**, la Novice comprise : se boucher n'est
 * pas une faute de stratégie, c'est marcher dans un mur.
 */
const PRIX_PLACE = 2.4;

function respiration(banc, cfg, reste) {
  if (!reste || reste <= 0) return 0;
  let v = 0;
  const manque = reste - placeRestante(banc, cfg);
  if (manque > 0) v -= manque * PRIX_PLACE;
  const gauche = banc.sequences.some((s) => placeDuCote(cfg, s, 'gauche') && !estRaccordSimple(s[0]));
  const droite = banc.sequences.some((s) => placeDuCote(cfg, s, 'droite') && !estRaccordSimple(s[s.length - 1]));
  if (!gauche && !droite) v -= PRIX_PLACE * Math.min(reste, 3);
  else if (!gauche || !droite) v -= 0.6 * Math.min(reste, 3);
  return v;
}

/**
 * Ce que valent les pouvoirs de RÈGLE, que le décompte laisse à zéro. Ils ne
 * rapportent rien au moment où on les pose : ils ouvrent une porte.
 *
 *   une carte de plus       vaut à peu près ce que rapporte un plan ordinaire ;
 *   une séquence de plus    ne vaut que si le banc est près de sa limite ;
 *   la prise sur le Chutier vaut le choix qu'elle ajoute, pas une carte de plus.
 *
 * Le pouvoir sur les Raccords n'est pas ici : celui-là change le TOTAL, et le
 * décompte le voit déjà.
 */
export function valeurDesDroits(banc, cfg) {
  let v = bonusRegle(banc, cfg, 'PLAN_PLUS') * 4;
  const seqPlus = bonusRegle(banc, cfg, 'SEQ_PLUS');
  if (seqPlus) {
    const limite = limiteSequences(cfg, banc);
    const reste = Number.isFinite(limite) ? limite - banc.sequences.length : 9;
    v += seqPlus * (reste <= seqPlus ? 3.5 : 0.8);
  }
  if (chutierOuvert(banc, cfg)) v += 1.5;
  return v;
}

/**
 * Ce qu'un montage PROMET, en plus de ce qu'il vaut déjà.
 *
 * « Les Raccords vous rapportent +n par Raccord » se paie en dernier : le
 * pouvoir vaut n sur CHAQUE Raccord du montage, pour CHAQUE Raccord. Le
 * premier ne vaut presque rien — et c'est lui qu'il faut poser pour que les
 * suivants existent. On escompte donc ce que le suivant rapportera.
 */
const ESPOIR_RACCORD = 0.7;

function promesses(banc, cfg, reste) {
  if (!reste || reste <= 0) return 0;
  const raccords = tousLesPlans(banc).filter(estRaccordSimple);
  if (!raccords.length) return 0;
  // Encore faut-il qu'il y ait de quoi bonifier — le pouvoir modifie un
  // « n × Raccord » imprimé, il n'en crée pas.
  const bonus = bonusRaccord(banc, cfg);
  if (bonus <= 0) return 0;
  const bonifiables = raccords.filter((p) => objsDe(p).some((o) => o && o.kind === 'RACCORD'));
  return bonus * bonifiables.length * ESPOIR_RACCORD;
}

function noteCoup(banc, coup, cfg, base) {
  const essai = appliquer(cloneBanc(banc), coup);
  return { note: compter(essai, cfg).total - base, banc: essai };
}

/** Ce qu'un banc vaut au-delà de son score, hors la place : sa forme, ce qu'il promet. */
function assiette(banc, cfg, reste) {
  return potentiel(banc, cfg) + promesses(banc, cfg, reste);
}

// Le choix de la carte juge la STRUCTURE, comme la pose : un Plan Large ouvre
// une séquence, on n'a plus le choix une fois qu'on l'a pris.
const POIDS_ASSIETTE = 0.8;

/**
 * Meilleur gain atteignable avec `carte` depuis `banc`, en un coup — ou `null`
 * si la carte n'a nulle part où se poser. `reste` est ce qu'il restera à monter
 * ensuite : une carte dont le seul emplacement ferme le banc ne vaut pas ce
 * qu'elle rapporte.
 */
function meilleurAvec(banc, carte, cfg, base, reste) {
  const avant = assiette(banc, cfg, reste);
  const respAvant = reste ? respiration(banc, cfg, reste) : 0;
  let best = null;
  for (const c of coupsSurBanc(banc, carte, cfg)) {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    const g = note
      + (reste ? respiration(apres, cfg, reste) - respAvant : 0)
      + POIDS_ASSIETTE * (assiette(apres, cfg, reste) - avant);
    if (best === null || g > best) best = g;
  }
  return best;
}

/** Ce que chaque carte offerte vaudrait pour ce banc-là — `null` si elle ne s'y pose pas. */
function valeursPour(state, p, cartes) {
  const banc = state.bancs[p];
  const base = compter(banc, state.cfg).total;
  const reste = Math.max(0, plansRestants(banc, state.cfg) - 1);
  return cartes.map((carte) => meilleurAvec(banc, carte, state.cfg, base, reste));
}

// --- Avant de choisir : défausser ? -----------------------------------------

// En dessous de ce gain, la meilleure carte de la rivière ne vaut pas le coup :
// autant en faire venir une autre.
const GAIN_MAIGRE = 1.2;
// Une carte qui rapporterait à la suivante ce nombre de points de plus qu'à
// soi vaut d'être écartée.
const ECART_REFUS = 4;

/**
 * Faut-il défausser une carte de la rivière avant de choisir ? Renvoie son rang
 * dans la rivière, ou `null`.
 *
 * — Rien ne peut être monté : on défausse pour faire venir une autre carte.
 * — La rivière est maigre : on écarte ce dont on ne veut pas.
 * — La Stratège écarte aussi la carte qui servirait trop bien la joueuse
 *   suivante — sauf si celle-ci peut la reprendre sur le Chutier.
 *
 * Qui peut prendre sur le Chutier ne perd rien à défausser : la carte écartée
 * lui reste offerte, et une cinquième arrive.
 */
export function choisirDefausse(state, p, rand = Math.random) {
  if (!peutDefausser(state, p)) return null;
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const cfg = state.cfg;
  const riviere = state.riviere;
  if (!riviere.length) return null;

  const miennes = valeursPour(state, p, riviere);
  const jouables = miennes.filter((v) => v !== null);
  const meilleure = jouables.length ? Math.max(...jouables) : null;
  const pire = () => {
    let k = 0;
    miennes.forEach((v, i) => { if ((v === null ? -99 : v) < (miennes[k] === null ? -99 : miennes[k])) k = i; });
    return k;
  };

  // Rien à monter : n'importe quelle autre carte vaut mieux.
  if (meilleure === null) return pire();

  // La Novice ne défausse guère : une fois sur dix, sans trop savoir quoi.
  if (profil.profondeur === 0) {
    return rand() < 0.1 ? Math.floor(rand() * riviere.length) : null;
  }

  const moiSurChutier = chutierOuvert(state.bancs[p], cfg);

  if (profil.profondeur >= 2 && state.joueurs.length > 1) {
    const q = (p + 1) % state.joueurs.length;
    if (!chutierOuvert(state.bancs[q], cfg)) {
      const siennes = valeursPour(state, q, riviere);
      // La carte que je prendrai, je ne la lui laisse de toute façon pas.
      const prise = miennes.indexOf(meilleure);
      let k = -1; let ecart = ECART_REFUS;
      siennes.forEach((v, i) => {
        if (i === prise || v === null) return;
        const e = v - (miennes[i] === null ? 0 : miennes[i]);
        if (e >= ecart) { ecart = e; k = i; }
      });
      if (k >= 0) return k;
    }
  }

  if (meilleure < GAIN_MAIGRE || (moiSurChutier && meilleure < GAIN_MAIGRE * 3)) {
    const k = pire();
    // On ne jette pas la seule carte qu'on voulait — sauf à pouvoir la reprendre.
    if (miennes[k] !== meilleure || moiSurChutier) return k;
  }
  return null;
}

// --- Quelle carte prendre ? --------------------------------------------------

export function choisirDerushage(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const options = optionsDerushage(state);
  if (!options.length) return null;

  const valeurs = valeursPour(state, p, options.map((o) => o.carte));
  const notes = options.map((o, i) => ({
    o,
    note: (valeurs[i] === null ? -99 : valeurs[i])
      + (profil.bruit ? (rand() - 0.5) * profil.bruit * 6 : 0) + rand() * 1e-3,
  }));

  notes.sort((a, b) => b.note - a.note);
  if (profil.bruit > 0.4 && rand() < 0.4) return notes[Math.floor(rand() * Math.min(notes.length, 3))].o;
  return notes[0].o;
}

// --- Où la monter ? ----------------------------------------------------------

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
  const promBase = promesses(banc, cfg, reste);

  const notes = coups.map((c) => {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    // Le coup qui bouche son propre banc coûte les tours qu'il fera perdre — à
    // tous les niveaux : sans quoi la Novice se mure.
    let n = note + respiration(apres, cfg, reste) - respBase
      + promesses(apres, cfg, reste) - promBase;
    if (profil.profondeur >= 1) n += potentiel(apres, cfg) - potBase;
    if (profil.profondeur >= 2) {
      // Ce que la rivière permettrait d'enchaîner sur ce banc-là.
      const suivant = compter(apres, cfg).total;
      let meilleur = 0;
      for (const o of cartesOffertes(state, p)) {
        if (o.carte.id === c.carte.id) continue;
        const g = meilleurAvec(apres, o.carte, cfg, suivant, Math.max(0, reste - 1));
        if (g !== null && g > meilleur) meilleur = g;
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

// --- Mise en place : quelle face de la carte de départ ? ---------------------

/**
 * Un Raccord de la boîte porte-t-il un « n × Raccord » ? C'est la condition du
 * pouvoir « les Raccords vous rapportent +n par Raccord » : il ne crée pas de
 * pouvoir, il en modifie un. Le matériel étant réglable carte par carte, la
 * question se pose au paquet qu'on a sous la main.
 */
function boiteBonifiable(state) {
  const vues = [...(state.riviere || []), ...(state.pioche || [])].slice(0, 60);
  for (const carte of vues) {
    if (!carte || carte.type !== 'DOUBLE') continue;
    const m = moitiesDe(carte);
    for (const h of [m.G, m.D]) {
      if (h && h.transition === 'RACCORD' && objsDe(h).some((o) => o && o.kind === 'RACCORD')) return true;
    }
  }
  return false;
}

/**
 * Ce que vaut un pouvoir de RÈGLE porté par un PLAN DE DÉPART. Il ouvre le
 * banc : son pouvoir vaut pour **toute** la partie, et c'est à cette échelle
 * qu'il faut le peser — le décompte, lui, le laisse à zéro.
 *
 *   +1 Carte en fin de partie   un tour entier de plus
 *   prise sur le Chutier        un choix de plus, quand le Chutier porte une carte
 *   +1 Séquence                 ne vaut que si la limite mord
 *   +1 par Raccord              ne vaut que s'il y a un « n × Raccord » à bonifier
 */
const PRIX_TOUR = 7.5;
const PRIX_CHUTIER = 2.5;

export function valeurDepartDesDroits(plan, state) {
  const cfg = state.cfg;
  let v = 0;
  for (const o of objsDe(plan)) {
    if (!o) continue;
    if (o.kind === 'PLAN_PLUS') v += o.n * PRIX_TOUR;
    else if (o.kind === 'PIOCHER') {
      if (cfg.defausse !== false) v += PRIX_CHUTIER;
    } else if (o.kind === 'SEQ_PLUS') {
      // Une séquence de plus ne vaut que si la limite mord : un montage de
      // `tours` plans, à trois cartes de chaque côté d'un centre, en veut
      // deux ou trois.
      const limite = cfg.sequencesMax;
      if (limite && limite > 0) {
        const voulues = Math.max(2, Math.round((cfg.tours || 10) / 3));
        v += o.n * (limite < voulues ? 4.5 : limite === voulues ? 1.5 : 0.2);
      }
    } else if (o.kind === 'RACCORD_VAUT') {
      if (boiteBonifiable(state)) v += o.n * 4;
    }
  }
  return v;
}

export function choisirDepart(state, p, rand = Math.random) {
  const profil = PROFILS_IA[state.joueurs[p].type] || PROFILS_IA.EQUILIBRE;
  const options = choixDepart(state, p);
  if (!options.length) return null;

  const notes = options.map((o) => {
    const banc = { sequences: [[{ ...o.plan, carteId: 'depart', depart: true }]] };
    // Ce que ce départ vaudrait sur un montage déjà étoffé : on l'approche en
    // mesurant ce qu'il rapporte seul, plus la richesse de ses icônes.
    const seul = compter(banc, state.cfg).total;
    const richesse = o.plan.el.length * 0.7;
    // Et ce que son POUVOIR DE RÈGLE vaudra sur toute la partie.
    const droits = valeurDepartDesDroits(o.plan, state);
    return { o, note: seul + richesse + droits
      + (profil.bruit ? (rand() - 0.5) * profil.bruit * 4 : 0) };
  });
  notes.sort((a, b) => b.note - a.note);
  return notes[0].o;
}
