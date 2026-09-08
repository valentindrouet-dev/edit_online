// ---------------------------------------------------------------------------
// EDIT — intelligences artificielles
// ---------------------------------------------------------------------------
// Novice    : regarde le coup immédiat, et se trompe souvent.
// Équilibré : compare tous les placements et évite d'éparpiller ses séquences.
// Stratège  : anticipe le tour suivant à partir de ce qu'offrent les chutiers.

import { coupsPossibles, appliquer, optionsDerushage, choixDepart, limiteSequences, limitePlans, ouverturesBanc } from './engine.js?v=2.25';
import {
  compter, bonusRegle, piocheOuverte, plansComptes, bonusRaccord, raccordOuvert,
  estRaccordSimple, tousLesPlans,
} from './scoring.js?v=2.25';
import { objsDe, moitiesDe } from './data.js?v=2.25';
import { PROFILS_IA } from './config.js?v=2.25';

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

/**
 * Ce qu'un montage PROMET, en plus de ce qu'il vaut déjà.
 *
 * Le décompte est un instantané : il lit le banc tel qu'il est, à la fin. Une
 * IA qui ne lirait que lui refuserait deux coups pourtant bons — parce qu'ils
 * ne paient pas TOUT DE SUITE.
 *
 * **Un Raccord posé est ouvert.** Au bout d'une ligne, tant que le Plan Large
 * qui le ferme n'est pas venu, il ne raccorde rien : le décompte lui applique
 * son malus. L'IA voyait donc une perte là où il y a une promesse, et ne posait
 * pour ainsi dire jamais de Raccord. On lui rend la part du malus qu'elle peut
 * encore effacer — à condition qu'il lui reste des tours pour le faire.
 *
 * **« Les cartes Raccord vous rapportent +n par Raccord » se paie en dernier.**
 * Le pouvoir vaut n sur CHAQUE Carte Raccord du montage, pour CHAQUE Carte
 * Raccord : trois Raccords valent trois fois plus que le premier, pas trois
 * fois le premier. Le premier, lui, ne vaut presque rien — et c'est lui qu'il
 * faut poser pour que les suivants existent. On escompte donc ce que le
 * suivant rapportera, sans quoi le pouvoir ne se déclenche jamais.
 */
/**
 * **Et la Carte Objectif commune ?** Elle aussi se paie en une fois : deux des
 * six se CONSTRUISENT — « 5 Plans Larges », « du générique au générique » — et
 * ne rapportent rien avant d'être achevées. On a donc essayé de les escompter
 * comme les Raccords, avec la même pente. **La mesure a dit non**, et le code
 * ne le fait pas :
 *
 *   poids 0     15 % de réussite, score 64,7
 *   poids 0,8   44 %              score 62,2
 *   poids 1,5   59 %              score 61,4
 *
 * — objectif porté à 16 points, quarante parties. Le taux monte, le score
 * baisse : bâtir cinq Plans Larges coûte une dizaine de points de décompte
 * ordinaire, car un montage large dilue des bandeaux qui comptent presque tous
 * dans LEUR ligne. L'IA qui s'abstient joue donc mieux, et c'est l'objectif
 * qui est sous-payé — pas elle qui est aveugle. Les quatre autres cartes sont
 * des absences : tenues dès le départ, perdues en chemin, le décompte les suit
 * tout seul et l'IA les vise sans qu'on ait rien à ajouter (89 à 100 %).
 *
 * `espoirObjectifCommun` reste : c'est lui qui dit à la joueuse où elle en est.
 */
const ESPOIR_FERMETURE = 0.55;
const ESPOIR_RACCORD = 0.7;

function promesses(banc, cfg, reste) {
  if (!reste || reste <= 0) return 0;
  let v = 0;
  const raccords = tousLesPlans(banc).filter(estRaccordSimple);
  if (!raccords.length) return v;
  if (cfg.raccordOuvertMalus) {
    const ouverts = raccords.filter((p) => raccordOuvert(p, banc, cfg)).length;
    v += ouverts * -cfg.raccordOuvertMalus * ESPOIR_FERMETURE;
  }
  // Chaque Raccord déjà là rend le suivant plus payant : c'est cette pente-là
  // qu'il faut voir pour la gravir. Encore faut-il qu'il y ait de quoi bonifier
  // — le pouvoir modifie un « n × RACCORD » imprimé, il n'en crée pas. Sans
  // bandeau à modifier il ne vaut rien, et croire le contraire ferait courir
  // l'IA après des Raccords qui ne lui rapporteront pas un point.
  const bonus = bonusRaccord(banc, cfg);
  if (bonus > 0) {
    const bonifiables = raccords.filter((p) => objsDe(p).some((o) => o && o.kind === 'RACCORD'));
    v += bonus * bonifiables.length * ESPOIR_RACCORD;
  }
  return v;
}

function noteCoup(banc, coup, cfg, base) {
  const essai = appliquer(cloneBanc(banc), coup, cfg);
  return { note: compter(essai, cfg).total - base, banc: essai };
}

/**
 * Ce qu'un banc vaut au-delà de son score, hors la place : sa forme, ce qu'il
 * promet. Les deux phases du tour doivent le lire de la même façon — c'est là
 * que l'IA péchait.
 *
 * La RESPIRATION n'est pas ici : elle se compte à plein, jamais pondérée. Se
 * boucher n'est pas un goût qu'on met en balance avec d'autres, c'est un mur.
 */
function assiette(banc, cfg, reste) {
  return potentiel(banc, cfg) + promesses(banc, cfg, reste);
}

/**
 * Le dérushage juge la STRUCTURE, comme le montage.
 *
 * Il ne lisait que le score du coup : « combien cette carte rapporte-t-elle si
 * je la pose au mieux ? ». Or c'est au dérushage que se décide la forme du
 * montage — un Plan Large ouvre TOUJOURS une ligne, on n'a plus le choix une
 * fois qu'on l'a pris. L'IA jugeait donc l'éparpillement au moment où elle ne
 * pouvait plus rien y faire, et jamais au moment où elle le décidait.
 */
const POIDS_ASSIETTE = 0.8;

/**
 * Meilleur gain atteignable avec `carte` depuis `banc`, en un coup. `reste` est
 * ce qu'il restera à monter ensuite : une carte dont le seul emplacement ferme
 * le banc ne vaut pas ce qu'elle rapporte, et c'est en la DÉRUSHANT qu'on s'en
 * aperçoit — une fois en main, il est trop tard, il faut bien la poser.
 */
function meilleurAvec(banc, carte, cfg, base, reste) {
  const faux = { cfg, bancs: [banc], mains: [[carte]], joueurs: [{}] };
  const avant = assiette(banc, cfg, reste);
  const respAvant = reste ? respiration(banc, cfg, reste) : 0;
  let best = 0;
  let premier = true;
  for (const c of coupsPossibles(faux, 0)) {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    const g = note
      + (reste ? respiration(apres, cfg, reste) - respAvant : 0)
      + POIDS_ASSIETTE * (assiette(apres, cfg, reste) - avant);
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
  const promBase = promesses(banc, cfg, reste);

  const notes = coups.map((c) => {
    const { note, banc: apres } = noteCoup(banc, c, cfg, base);
    // Le coup qui bouche son propre banc coûte les tours qu'il fera perdre, et
    // celui qui ouvre un Raccord n'est pas la perte qu'il paraît — à tous les
    // niveaux : sans quoi la Novice se mure, et personne ne joue les Raccords.
    let n = note + respiration(apres, cfg, reste) - respBase
      + promesses(apres, cfg, reste) - promBase;
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

/**
 * Une Carte Raccord de la boîte porte-t-elle un « n × RACCORD » ?
 *
 * C'est **la** condition du pouvoir « les cartes Raccord vous rapportent +n par
 * Raccord » : il ne crée pas de bandeau, il en modifie un — et s'il n'y en a
 * aucun à modifier, il ne vaut rien. Le matériel étant réglable carte par
 * carte, la question ne se tranche pas dans le code : on la pose au paquet
 * qu'on a sous la main.
 */
function boiteBonifiable(state) {
  const vues = [...(state.chutierPMGP || []), ...(state.piochePMGP || [])].slice(0, 60);
  for (const carte of vues) {
    if (!carte || carte.type !== 'DOUBLE') continue;
    const m = moitiesDe(carte);
    for (const h of [m.GP, m.PM]) {
      if (h && h.transition === 'RACCORD' && objsDe(h).some((o) => o && o.kind === 'RACCORD')) return true;
    }
  }
  return false;
}

/**
 * Ce que vaut un pouvoir de RÈGLE porté par un PLAN DE DÉPART.
 *
 * `valeurDesDroits` pèse un droit là où on le pose, en cours de partie. Un Plan
 * de départ, lui, ouvre le banc : son pouvoir vaut pour **toute** la partie, et
 * c'est à cette échelle-là qu'il faut le peser. Sans quoi l'IA choisissait son
 * départ à l'aveugle — les quatre pouvoirs marquent zéro au décompte, elle les
 * voyait donc tous les quatre comme des bandeaux vides et prenait le premier
 * venu.
 *
 * Les valeurs sont MESURÉES : cinquante parties par pouvoir, écart de score
 * final contre un départ sans pouvoir, matériel imprimé, IA Stratège.
 *
 *   +1 Carte en fin de partie   +7,9   un tour entier de plus
 *   pioche PM / GP              +3,5   un choix de plus à chaque tour
 *   +1 Séquence                  0,0   la limite de cinq lignes ne mord jamais
 *   +1 par Raccord               0,0   aucune Carte Raccord imprimée ne porte
 *                                      le « n × RACCORD » qu'il bonifie
 *
 * Les deux derniers ne sont pas chiffrés en dur : ils sont calculés à partir
 * de ce qui les rend utiles — la limite de séquences pour l'un, le matériel
 * pour l'autre. Réglés autrement, ils reprennent de la valeur d'eux-mêmes.
 */
const PRIX_TOUR = 7.5;
const PRIX_PIOCHE = 3.5;

export function valeurDepartDesDroits(plan, state) {
  const cfg = state.cfg;
  let v = 0;
  for (const o of objsDe(plan)) {
    if (!o) continue;
    if (o.kind === 'PLAN_PLUS') v += o.n * PRIX_TOUR;
    else if (o.kind === 'PIOCHER') {
      const deja = o.cible === 'PL' ? cfg.piocheDirectePL : cfg.piocheDirectePMGP;
      if (!deja) v += PRIX_PIOCHE;
    } else if (o.kind === 'SEQ_PLUS') {
      // Une ligne de plus ne vaut que si la limite mord. Un montage de `tours`
      // cartes en veut trois ou quatre : au-delà, le droit ouvre une porte que
      // personne ne franchit.
      const limite = cfg.sequencesMax;
      if (limite && limite > 0) {
        const voulues = Math.max(2, Math.round((cfg.tours || 10) / 3));
        v += o.n * (limite < voulues ? 4.5 : limite === voulues ? 1.5 : 0.2);
      }
    } else if (o.kind === 'RACCORD_VAUT') {
      // Il bonifie un bandeau existant : sans bandeau à bonifier, il ne vaut
      // rien, et l'IA a raison de ne pas le prendre pour un cadeau.
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
    const banc = { sequences: [[{ ...o.plan, carteId: 'depart', depart: true }]], ouverture: false, fermeture: false };
    // Ce que ce départ vaudrait sur un montage déjà étoffé : on l'approche en
    // mesurant ce qu'il rapporte seul, plus la richesse de ses pastilles.
    const seul = compter(banc, state.cfg).total;
    const richesse = o.plan.el.length * 0.7;
    // Et ce que son POUVOIR DE RÈGLE vaudra sur toute la partie — que le
    // décompte, lui, laisse à zéro.
    const droits = valeurDepartDesDroits(o.plan, state);
    return { o, note: seul + richesse + droits
      + (profil.bruit ? (rand() - 0.5) * profil.bruit * 4 : 0) };
  });
  notes.sort((a, b) => b.note - a.note);
  return notes[0].o;
}
