// ---------------------------------------------------------------------------
// EDIT — variables de partie
// ---------------------------------------------------------------------------
// Tout ce qui pilote le déroulé et le décompte. Le Laboratoire fait varier ces
// valeurs pour comparer les équilibrages.

import { ELEMENT_IDS } from './data.js?v=2.3';

export const DEFAULTS = {
  // --- Déroulé -------------------------------------------------------------
  tours: 10,                 // plans dans le banc, Plan de départ compris
  // La rivière montre toujours trois cartes par famille, plus la pioche :
  // Plans Larges face cachée, Plans Moyens / Gros Plans face visible.
  chutierPL: 3,              // cartes visibles dans la rivière — 0 = nb de joueuses
  chutierPMGP: 3,            // idem pour les Plans Moyens / Gros Plans
  // Piocher au sommet d'une pile plutôt que dans la rivière : on prend une
  // carte que personne n'a vue, mais on la prend seul. Ce droit n'est plus
  // ouvert à tout le monde : il se gagne par le pouvoir « Vous pouvez piocher
  // sur la pioche PM / GP ». Cocher l'une de ces deux cases le rend à tous.
  piocheDirectePL: false,    // piocher au sommet de la pioche Plans Larges
  piocheDirectePMGP: false,  // piocher au sommet de la pioche PM / GP
  // Les Plans de départ ne se tirent pas : chaque joueuse a toujours les deux
  // versions A et B devant elle, donc les quatre faces au choix.
  premierJoueurAleatoire: true,
  premierJoueur: 0,          // qui commence quand le tirage au sort est écarté
  // Le tour d'une joueuse d'un seul tenant : elle dérushe, elle monte, puis
  // elle passe la main. À false, l'ordre imprimé : toutes dérushent, puis
  // toutes montent.
  tourComplet: true,

  // --- Pose ----------------------------------------------------------------
  sensPose: 'bords',         // 'bords' (les deux bouts d'une séquence) | 'droite'
  plNouvelleSequence: true,  // un Plan Large ouvre toujours une nouvelle séquence
  plContigu: false,          // autoriser deux Plans Larges côte à côte
  // Deux Raccords ne se touchent pas : un Raccord relie deux plans, et collé à
  // un autre Raccord il ne relierait qu'une jonction — c'est-à-dire rien.
  raccordContigu: false,
  // Le bord libre d'un Raccord n'accepte qu'un **Plan Large**. C'est là tout son
  // office : il ouvre un second côté à sa ligne, et ce côté commence par son
  // propre climax. Sans effet si le Raccord ne relie pas (`raccordConnecte`),
  // puisqu'il n'est alors qu'un plan ordinaire.
  raccordAppellePL: true,
  // Un banc ne porte que cinq séquences. Ce n'est pas le nombre de Plans Larges
  // qui est borné — une ligne peut en porter plusieurs, de part et d'autre d'un
  // Raccord —, c'est le nombre de lignes : un montage a plus de plans que de
  // séquences, et c'est le Raccord qui permet d'étoffer une ligne plutôt que
  // d'en ouvrir une de plus. 0 = aucune limite (variante).
  sequencesMax: 5,
  // Une ligne s'étoffe, elle ne s'étire pas indéfiniment : de part et d'autre du
  // Plan Large — ou du Plan de départ — qui la tient, on n'accroche pas plus de
  // ce nombre de plans. Les Raccords ne comptent pas : un Raccord n'est pas un
  // plan, et c'est justement lui qui permet d'étoffer sans allonger.
  // 0 = aucune limite (variante).
  plansParCote: 4,
  // Variante — un même plan ne se répète pas. Un film ne montre pas deux fois
  // le même plan : on peut l'interdire, et choisir jusqu'où porte l'interdit.
  //   AUCUNE   un plan peut se répéter — la règle officielle
  //   MONTAGE  jamais deux fois dans tout le banc
  //   SEQUENCE jamais deux fois dans une même ligne
  //   VOISIN   jamais deux fois côte à côte
  // Deux plans sont « le même » quand ils portent le même numéro imprimé — le
  // recto et le verso d'une moitié en font partie : c'est la même image. Un
  // Raccord, une Ouverture, un Générique ne sont pas des plans : ils ne
  // tombent donc pas sous cette règle, comme ils ne comptent ni dans les dix
  // plans ni dans la taille d'une séquence.
  planUnique: 'AUCUNE',
  // Variante — une seule pioche, face cachée, où les Plans Larges sont mêlés
  // aux cartes Plan Moyen / Gros Plan, et une seule rivière devant elle. On ne
  // choisit plus sa famille : on prend ce qui vient. Incompatible avec
  // `sansPlanDepart`, qui a besoin d'une rivière de Plans Larges à part pour
  // n'offrir qu'eux tant qu'un banc est vide — voir `piochesMelees`.
  piochesMelangees: false,
  // Une Carte Raccord relie. Sur une seule bande, elle se pose entre deux
  // séquences et les raccorde forcément. En lignes, elle fait **charnière** au
  // bout d'une ligne : un Plan Large peut alors s'y poser de l'autre côté
  // d'elle, si bien qu'une ligne porte deux Plans Larges, ou plus. À false,
  // elle redevient un plan ordinaire — variante hors règles.
  raccordConnecte: true,
  // Variante — un Raccord resté OUVERT coûte au lieu de rapporter. Un Raccord
  // promet une suite : il fait charnière au bout d'une ligne, et un Plan Large
  // vient de l'autre côté ouvrir un second versant. Tant qu'il n'est pas venu,
  // le Raccord ne raccorde rien — il pend. Son « x × Raccord » vaut alors ce
  // malus, à plat. Sans lui, poser des Raccords partout sans jamais les fermer
  // était la stratégie la plus payante du jeu. 0 = variante éteinte.
  raccordOuvertMalus: -2,
  generiqueBloque: true,     // rien avant l'Ouverture, rien après les Crédits
  // Le plan à 01:00 est le PREMIER plan du film, celui à 99:00 le DERNIER :
  // rien ne se joue avant l'un, rien après l'autre. La règle se lit sur le
  // minutage et non sur un drapeau — un Générique posé autrement que par son
  // chemin propre n'en levait aucun, et l'on pouvait glisser une carte après la
  // fin du film.
  bornesBloquent: true,
  // Variante — pas de Plans de départ. Les quatre faces de départ rejoignent
  // la pioche des Plans Larges, dont elles prennent la couleur : ce sont des
  // Plans Larges comme les autres. Il n'y a alors plus de choix de départ au
  // début de la partie — chaque joueuse ouvre son banc en dérushant un Plan
  // Large, seule carte qui puisse s'y poser en premier.
  sansPlanDepart: false,
  // Le mode « banc en lignes » (voir MODES, plus bas — il se choisit sur
  // l'accueil, pas ici) : chaque séquence occupe sa propre ligne, un Plan Large
  // ou un Plan de départ tient le centre de la sienne, et l'on accroche les
  // Plans Moyens / Gros Plans à ses deux côtés. Une nouvelle séquence se pose
  // au-dessus ou en dessous des autres, jamais entre deux ; un Raccord y fait
  // charnière — un second Plan Large se pose de l'autre côté de lui, dans la
  // même ligne —, et le montage se lit d'un seul tenant, ligne après ligne.
  // C'est la règle officielle depuis la v0.14 : la pose sur une seule bande
  // reste jouable, en mode Classique. Une configuration déjà enregistrée garde
  // le mode qu'on lui avait donné — ce défaut ne vaut que pour une neuve.
  bancEnLignes: true,

  // --- Décompte ------------------------------------------------------------
  objectifsActifs: {
    RACCORD: true, PLAN: true, FORMAT: true, ELEMENT: true,
    PAIRE: true, MORT: true, ABSENT: true,
    MINUTAGE: true, CHRONO: true, SANS_TC: true,
    // Les bandeaux qui comptent des séquences plutôt que des plans.
    SEQ_TAILLE: true, SEQ_VOISINES: true, SEQ_LONGUE: true, SEQ_AVEC: true, SEQ_TOUTES: true,
    // Les bandeaux du vocabulaire commun : ils comptent tous « une cible »
    // dans une portée, et ne se distinguent que par ce qu'ils en font.
    AILLEURS: true, CENTRE: true, LOT: true, SEUIL: true, ABSENTES: true, DOMINE: true,
    EXTREME: true, PLAN_ICONES: true, DOUBLE: true,
    // Les pouvoirs de RÈGLE. Ils ne rapportent pas de points là où ils sont
    // posés : les décocher n'annule pas un gain, cela retire un droit — plus de
    // pioche au sommet, plus de séquence ni de plan supplémentaire, et les
    // Cartes Raccord gardent le bandeau qui leur est imprimé.
    PIOCHER: true, SEQ_PLUS: true, PLAN_PLUS: true, RACCORD_VAUT: true,
  },
  // Une carte peut porter deux fois la même icône. Par défaut chacune rapporte
  // ses points ; à false, un objectif d'élément compte les plans porteurs.
  elementParIcone: true,
  // Chaque bandeau porte désormais sa propre portée — avant, après, sa
  // séquence, le montage. Celle-ci ne vaut plus que pour les cartes imprimées
  // qui ne la précisent pas : c'est le point resté ouvert dans les règles.
  porteeParDefaut: 'MONTAGE',   // 'SEQUENCE' | 'MONTAGE'
  multiplicateurObjectif: 1,
  scorerDepart: true,           // le Plan de départ compte dans le décompte
  pointsParPlan: 0,

  // --- Variante : raccord par élément partagé ------------------------------
  // Absente des règles officielles, proposée pour tester une autre économie.
  raccordElement: false,
  raccordMin: 1,
  raccordElementPoints: 1,

  // --- Variante : chronologie ---------------------------------------------
  chronoBonus: 0,
  chronoMalus: 0,
  chronoIgnoreZero: true,

  // --- Composition du paquet ----------------------------------------------
  exemplairesDouble: 1,
  exemplairesPL: 1,
  retirerBrouillons: false,  // les Plans Larges 101 et 102 restent dans le paquet
  filtreFamilles: {
    TRANSITION: true, MORT: true, ARME: true, VEHICULE: true, OBJET: true, PERSONNAGE: true,
  },
  poidsElements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 1])),

  // --- Matériel ------------------------------------------------------------
  // Deux jeux de matériel coexistent en permanence : l'IMPRIMÉ, intouchable,
  // et le MODIFIÉ, qui porte les retouches de l'éditeur. `materielActif` dit
  // lequel se joue — passer de l'un à l'autre ne détruit rien.
  materielActif: 'MODIFIE',   // 'IMPRIME' (le matériel d'origine) | 'MODIFIE'
  // `plans` surcharge le minutage, les icônes, l'illustration et le bandeau
  // d'un plan, indexé par sa clé (numéro + face : « 201R », « 201V », « 101 ») ;
  // `paires` refait l'appariement Plan Moyen / Gros Plan d'une carte, indexé par
  // son rang. `ajouts` porte les cartes créées de toutes pièces et `retires`
  // celles qu'on a supprimées : ces deux-là ne sont pas des retouches mais la
  // **composition du matériel**, et valent donc pour l'imprimé comme pour le
  // modifié — une carte qui n'existe pas n'existe dans aucun des deux jeux.
  materiel: {
    plans: {}, paires: {},
    ajouts: { scenes: [], larges: [], departs: [], paires: [] },
    retires: [],
  },
  // Les cartes écartées de la boîte, par identifiant. Vaut pour les deux jeux :
  // c'est la composition du paquet, pas une retouche de carte.
  cartesDesactivees: [],
  // Le recto et le verso d'une carte double ne portent pas le même minutage.
  // La face jouée se déduit du bout où la moitié visible se retrouve ; sans
  // cette lecture, une carte est toujours jouée sur son recto.
  faceSelonPose: true,

  // --- Affichage -----------------------------------------------------------
  illustrations: true,    // les visuels imprimés sur les cartes
  pointsSurCartes: true,  // le jeton de points au coin des plans du montage
  // La fiche qui s'ouvre au survol d'une carte. Décochée par défaut : elle
  // s'ouvrait sur toutes les cartes de la table, pioches comprises, où elle ne
  // disait rien que la carte ne montrait déjà.
  apercuSurvol: false,
  // Les joueuses jouent l'une après l'autre et cela se voit : chaque coup est
  // rendu, et la carte vole de sa pioche jusqu'au banc.
  animerCoups: true,
  dureeVol: 620,          // ms — le trajet d'une carte, arc compris

  // --- Divers --------------------------------------------------------------
  graine: '',
  vitesseIA: 320,         // ms — la pause avant qu'une IA ne joue son coup
};

export const PROFILS_IA = {
  NOVICE:    { id: 'NOVICE',    label: 'IA — Novice',    profondeur: 0, bruit: 0.55 },
  EQUILIBRE: { id: 'EQUILIBRE', label: 'IA — Équilibré', profondeur: 1, bruit: 0.12 },
  STRATEGE:  { id: 'STRATEGE',  label: 'IA — Stratège',  profondeur: 2, bruit: 0.0 },
};

// Palette des joueuses : violet, bleu, rose, orange, en teintes pastel.
// `clair` habille la pastille, `encre` sert au texte, où le pastel manquerait
// de contraste.
export const PALETTE_JOUEURS = [
  { nom: 'Violet', clair: '#c3b1f2', encre: '#7c5cd6' },
  { nom: 'Bleu',   clair: '#a7cdf5', encre: '#3f7fc4' },
  { nom: 'Rose',   clair: '#f5b3cd', encre: '#cf5f92' },
  { nom: 'Orange', clair: '#fbc79a', encre: '#d47b2c' },
];

export const COULEURS_JOUEURS = PALETTE_JOUEURS.map((p) => p.clair);

/** Teinte lisible sur fond blanc pour une couleur de joueuse. */
export function encreDe(couleur) {
  const p = PALETTE_JOUEURS.find((x) => x.clair === couleur);
  return p ? p.encre : couleur;
}

export function cloneConfig(src = DEFAULTS) {
  return JSON.parse(JSON.stringify(src));
}

// --- Modes de jeu ----------------------------------------------------------

/**
 * Un **mode de jeu** n'est pas un réglage de plus : c'est une manière de monter
 * le film. Il se choisit sur l'accueil, et pose d'un coup les variables qui le
 * définissent — lesquelles restent lisibles une à une dans les Variables, pour
 * qui veut sortir des sentiers battus.
 */
export const MODES = [
  {
    id: 'LIGNES',
    label: 'Banc en lignes',
    aide: 'la règle officielle (v0.14) — une séquence par ligne : le Plan Large ou le Plan de départ '
      + 'tient le centre de la sienne, les Plans Moyens et Gros Plans s’accrochent à ses deux côtés, '
      + 'et une nouvelle ligne se pose au-dessus ou en dessous de la pile — jamais entre deux. Un '
      + 'Raccord y fait charnière : un second Plan Large se pose de l’autre côté de lui, dans la '
      + 'même ligne. Le montage se lit d’un seul tenant, ligne après ligne.',
    cfg: { bancEnLignes: true },
  },
  {
    id: 'CLASSIQUE',
    label: 'Classique',
    aide: 'la pose d’avant la v0.14 : le film se monte sur une seule bande, séquence après séquence, '
      + 'et une Carte Raccord relie deux séquences voisines',
    cfg: { bancEnLignes: false },
  },
];

/** Le mode dont la configuration courante porte les marques. */
export function modeCourant(cfg) {
  return MODES.find((m) => Object.entries(m.cfg).every(([k, v]) => !!cfg[k] === !!v)) || MODES[0];
}

/**
 * Une configuration enregistrée hier, relue aujourd'hui. Elle écrase les
 * valeurs par défaut : un réglage dont la valeur par défaut a changé depuis
 * garderait donc l'ancienne, indéfiniment, sans que rien ne le dise. Les cas
 * connus se rattrapent ici, à la relecture.
 *
 * — `chutierPL` / `chutierPMGP` valaient 0, ce qui voulait dire « autant de
 *   cartes que de joueuses ». Depuis la v1.27 la rivière montre trois cartes
 *   par famille quel que soit le nombre de joueuses : le 0 enregistré retombe
 *   sur la valeur par défaut. Qui veut l'ancienne lecture la repose à la main.
 */
export function migrerCfg(lu) {
  if (!lu || typeof lu !== 'object') return {};
  const out = { ...lu };
  for (const k of ['chutierPL', 'chutierPMGP']) if (out[k] === 0) delete out[k];
  // `materiel` est écrasé en bloc par Object.assign : une table enregistrée
  // avant la v1.71 n'a ni cartes créées ni cartes supprimées, et il faut lui
  // donner les cases vides — sans quoi tout ce qui les lit trouve `undefined`.
  // Même chose pour les bandeaux : une table enregistrée avant l'arrivée d'un
  // pouvoir ne le connaît pas, et `Object.assign` écraserait la liste entière.
  // Un pouvoir inconnu de la table est actif — c'est le défaut de tous.
  if (out.objectifsActifs && typeof out.objectifsActifs === 'object') {
    out.objectifsActifs = { ...DEFAULTS.objectifsActifs, ...out.objectifsActifs };
  }
  if (out.materiel && typeof out.materiel === 'object') {
    out.materiel = {
      plans: {}, paires: {}, retires: [],
      ...out.materiel,
      ajouts: { scenes: [], larges: [], departs: [], paires: [], ...(out.materiel.ajouts || {}) },
    };
  }
  return out;
}

export const SCHEMA = [
  { groupe: 'Déroulé', champs: [
    { k: 'tours', l: 'Plans dans le banc', t: 'int', min: 2, max: 30, aide: 'Plan de départ compris' },
    { k: 'chutierPL', l: 'Chutier Plans Larges', t: 'int', min: 0, max: 8, aide: 'trois par les règles ; 0 = autant que de joueuses' },
    { k: 'chutierPMGP', l: 'Chutier Plans Moyens / Gros Plans', t: 'int', min: 0, max: 8, aide: 'trois par les règles ; 0 = autant que de joueuses' },
    { k: 'piocheDirectePMGP', l: 'Pioche PM / GP accessible au sommet', t: 'bool',
      aide: 'pour tout le monde ; décochée, seul le pouvoir « Vous pouvez piocher sur la pioche '
        + 'PM / GP » l’ouvre à qui le porte' },
    { k: 'piocheDirectePL', l: 'Pioche Plans Larges accessible au sommet', t: 'bool',
      aide: 'idem, pour la pile des Plans Larges' },
    { k: 'premierJoueurAleatoire', l: 'Première joueuse tirée au sort', t: 'bool' },
    { k: 'premierJoueur', l: 'Sinon, qui commence', t: 'int', min: 0, max: 3,
      aide: 'le rang de la joueuse, 0 pour la première de la liste' },
    { k: 'tourComplet', l: 'Le tour d’une joueuse d’un seul tenant', t: 'bool',
      aide: 'elle dérushe puis monte ; sinon, toutes dérushent, puis toutes montent' },
  ] },
  { groupe: 'Rythme', champs: [
    { k: 'animerCoups', l: 'Voir les cartes se déplacer', t: 'bool',
      aide: 'la carte quitte sa pioche et vole jusqu’au banc' },
    { k: 'vitesseIA', l: 'Pause avant le coup d’une IA', t: 'int', min: 0, max: 2000, aide: 'en millisecondes' },
    { k: 'dureeVol', l: 'Durée du vol d’une carte', t: 'int', min: 0, max: 2000, aide: 'en millisecondes' },
  ] },
  { groupe: 'Pose', champs: [
    { k: 'sensPose', l: 'Sens de pose', t: 'choix', options: [
      ['bords', 'Aux deux bouts d’une séquence'], ['droite', 'À droite seulement'],
    ] },
    { k: 'plNouvelleSequence', l: 'Un Plan Large ouvre une séquence', t: 'bool' },
    { k: 'plansParCote', l: 'Cartes de chaque côté d’un Plan Large', t: 'int', min: 0, max: 12,
      aide: 'de part et d’autre du Plan Large — ou du Plan de départ — qui tient la ligne. Ce sont '
        + 'des CARTES : les Raccords et les Génériques y comptent, ils prennent une place comme '
        + 'les autres. 0 = aucune limite' },
    { k: 'sequencesMax', l: 'Séquences maximum dans un banc', t: 'int', min: 0, max: 12,
      aide: 'cinq par les règles ; passé ce compte, un Plan Large n’entre plus que par la '
        + 'charnière d’un Raccord. 0 = aucune limite' },
    { k: 'plContigu', l: 'Deux Plans Larges peuvent se toucher', t: 'bool' },
    { k: 'raccordContigu', l: 'Deux Raccords peuvent se toucher', t: 'bool',
      aide: 'la règle l’interdit : un Raccord relie deux plans, et collé à un autre Raccord '
        + 'il ne relierait qu’une jonction' },
    { k: 'raccordAppellePL', l: 'Le bord libre d’un Raccord n’accepte qu’un Plan Large', t: 'bool',
      aide: 'c’est l’office du Raccord — il ouvre un second côté à sa ligne, et ce côté commence '
        + 'par son climax. Décoché, un Plan Moyen ou un Gros Plan peut s’y accrocher. Sans effet '
        + 'si « une Carte Raccord relie deux séquences » est décoché' },
    { k: 'planUnique', l: 'Variante — pas deux fois le même plan', t: 'choix', options: [
      ['AUCUNE', 'autorisé — un plan peut se répéter'],
      ['MONTAGE', 'jamais deux fois dans le banc'],
      ['SEQUENCE', 'jamais deux fois dans une même séquence'],
      ['VOISIN', 'jamais deux fois côte à côte'],
    ], aide: 'même numéro imprimé = même plan, recto et verso confondus ; un Raccord n’est pas un '
      + 'plan et ne tombe pas sous la règle' },
    { k: 'piochesMelangees', l: 'Variante — pioches mélangées', t: 'bool',
      aide: 'une seule pioche face cachée et une seule rivière, Plans Larges et cartes PM / GP '
        + 'confondus ; sans effet tant que « pas de Plans de départ » est coché' },
    { k: 'raccordConnecte', l: 'Une Carte Raccord relie deux séquences', t: 'bool',
      aide: 'en lignes, elle fait charnière : un Plan Large se pose de l’autre côté d’elle, '
        + 'dans la même ligne. Sur une seule bande, elle se pose entre deux séquences et les '
        + 'raccorde. Sinon, c’est un plan ordinaire' },
    { k: 'raccordOuvertMalus', l: 'Ce que vaut un Raccord resté ouvert', t: 'int', min: -20, max: 0,
      aide: 'variante — un Raccord qui n’a pas de Plan Large à côté de lui, ou dont un bord donne '
        + 'sur le vide, ne raccorde rien : son « x × Raccord » vaut ce malus, à plat. 0 = variante '
        + 'éteinte, un Raccord ouvert rapporte comme un autre' },
    { k: 'generiqueBloque', l: 'Le Générique ferme le montage', t: 'bool' },
    { k: 'bornesBloquent', l: 'Le minutage 01:00 / 99:00 ferme le montage', t: 'bool',
      aide: 'le plan à 01:00 est le premier plan du film, celui à 99:00 le dernier : on ne joue '
        + 'rien avant l’un ni après l’autre' },
    { k: 'sixCartesDepart', l: 'Variante — 6 Cartes Départ', t: 'bool',
      aide: 'les quatre plans de départ s’apparient de six façons — 1-2, 2-3, 3-4, 4-1, 2-4, 1-3 — '
        + 'et chaque joueuse pioche une seule de ces six cartes : deux faces au choix au lieu de '
        + 'quatre, et jamais le même couple que sa voisine' },
    { k: 'sansPlanDepart', l: 'Variante — pas de Plans de départ', t: 'bool',
      aide: 'ils rejoignent la pioche des Plans Larges et en prennent la couleur ; '
        + 'plus de choix de départ, on ouvre son banc en dérushant un Plan Large' },
    { k: 'faceSelonPose', l: 'La face jouée suit le sens de pose', t: 'bool',
      aide: 'sinon une carte est toujours jouée sur son recto' },
  ] },
  { groupe: 'Décompte', champs: [
    { k: 'porteeParDefaut', l: 'Portée des bandeaux', t: 'choix', options: [
      ['SEQUENCE', 'La séquence porteuse'], ['MONTAGE', 'Le montage entier'],
    ], aide: 'seulement pour les bandeaux imprimés qui ne la précisent pas' },
    { k: 'multiplicateurObjectif', l: 'Multiplicateur des bandeaux', t: 'float', min: 0, max: 5, pas: 0.25 },
    { k: 'scorerDepart', l: 'Le Plan de départ rapporte', t: 'bool' },
    { k: 'elementParIcone', l: 'Compter chaque icône, pas chaque plan', t: 'bool',
      aide: 'une carte à deux armes rapporte deux fois' },
    { k: 'pointsParPlan', l: 'Points fixes par plan visible', t: 'int', min: 0, max: 5 },
  ] },
  { groupe: 'Variante — raccord par élément', champs: [
    { k: 'raccordElement', l: 'Activer', t: 'bool', aide: 'hors règles officielles' },
    { k: 'raccordMin', l: 'Éléments partagés nécessaires', t: 'int', min: 1, max: 4 },
    { k: 'raccordElementPoints', l: 'Points par jonction raccordée', t: 'int', min: 0, max: 10 },
  ] },
  { groupe: 'Variante — chronologie', champs: [
    { k: 'chronoBonus', l: 'Bonus par paire dans l’ordre', t: 'int', min: 0, max: 10 },
    { k: 'chronoMalus', l: 'Malus par paire à contresens', t: 'int', min: 0, max: 10 },
    { k: 'chronoIgnoreZero', l: 'Les plans sans minutage (--:--) sont neutres', t: 'bool',
      aide: 'ils sont retirés de la lecture de l’ordre : Raccords, Génériques et scènes de'
        + ' personnage ne rompent donc pas la chronologie, où qu’on les pose' },
  ] },
  { groupe: 'Divers', champs: [
    { k: 'graine', l: 'Graine de partie', t: 'texte', aide: 'vide = tirage aléatoire ; une graine rejoue la même distribution' },
  ] },
  { groupe: 'Paquet', champs: [
    { k: 'exemplairesDouble', l: 'Exemplaires des cartes PM / GP', t: 'int', min: 1, max: 4 },
    { k: 'exemplairesPL', l: 'Exemplaires des Plans Larges', t: 'int', min: 0, max: 4 },
    { k: 'retirerBrouillons', l: 'Écarter les Plans Larges 101 et 102', t: 'bool' },
  ] },
];
