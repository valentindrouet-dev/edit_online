// ---------------------------------------------------------------------------
// EDIT — le protocole du jeu en ligne
// ---------------------------------------------------------------------------
// Ce module ne connaît AUCUN réseau. Il décrit ce qui circule, et rien d'autre :
// les salons, les membres, les messages, et surtout les **actions**.
//
// L'idée qui rend tout le reste simple : le moteur d'EDIT est déterministe —
// vérifié, journal rejoué deux fois donne le même état au bit près. Une partie
// n'est donc rien d'autre qu'une **graine et une liste d'actions**. On ne
// diffuse jamais l'état du jeu ; on diffuse des actions numérotées, que chaque
// appareil rejoue de son côté. Une partie complète à trois joueuses pèse 1,2 Ko.
//
// Conséquences, toutes bonnes :
//   — se reconnecter, c'est redemander le journal et rejouer. Gratuit ;
//   — un message perdu se voit à un trou dans la numérotation ;
//   — deux appareils ne peuvent pas diverger tant que le moteur est déterministe ;
//   — personne n'écrit d'état, donc il n'y a aucun conflit d'écriture.

import { creerPartie, choixDepart, poserDepart, optionsDerushage, derusher,
  coupsPossibles, poser, avancer, retourner } from '../engine.js?v=1.90';

/** Combien de temps un salon sans activité reste dans la liste. */
export const PEREMPTION_MS = 10 * 60 * 1000;

/** Les hôtes réannoncent leur salon à ce rythme ; un salon muet disparaît. */
export const ANNONCE_MS = 4000;

// --- Identité ---------------------------------------------------------------
// L'identité est **par onglet**, pas par navigateur : deux onglets du même
// navigateur sont deux joueuses distinctes. C'est ce qui permet d'essayer à
// plusieurs sur un seul poste — et un rafraîchissement garde la place, puisque
// sessionStorage survit au rechargement.
//
// Le nom d'affichage, lui, est une préférence : localStorage, pour le retrouver
// d'une fois sur l'autre.

const CLE_ID = 'edit.membre.v1';    // sessionStorage — par onglet
const CLE_NOM = 'edit.nomEnLigne.v1'; // localStorage — par navigateur

const jeton = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Mon identifiant d'appareil et le nom que j'affiche. */
export function monIdentite() {
  let id = '';
  try {
    id = sessionStorage.getItem(CLE_ID) || '';
    if (!id) { id = jeton(); sessionStorage.setItem(CLE_ID, id); }
  } catch {
    // Navigation privée : une identité le temps du chargement, sans plus.
    id = id || jeton();
  }
  let nom = '';
  try { nom = localStorage.getItem(CLE_NOM) || ''; } catch { /* sans importance */ }
  return { id, nom };
}

export function retenirNom(nom) {
  try { localStorage.setItem(CLE_NOM, nom); } catch { /* sans importance */ }
}

// --- Salons -----------------------------------------------------------------

/** Le plus petit numéro libre : le premier salon ouvert s'appelle « Salon 01 ». */
export function prochainNumero(ouverts) {
  const pris = new Set(ouverts.map((s) => s.numero));
  let n = 1;
  while (pris.has(n)) n++;
  return n;
}

export const nomDeSalon = (n) => `Salon ${String(n).padStart(2, '0')}`;

/** Ce qui part dans la liste des salons : le strict nécessaire pour choisir. */
export function resume(salon) {
  return {
    id: salon.id,
    nom: salon.nom,
    numero: salon.numero,
    hote: salon.hote,
    phase: salon.phase,
    joueurs: salon.membres.filter((m) => m.present).length,
    vuA: salon.vuA,
  };
}

export function estPerime(salon, maintenant) {
  return salon.phase === 'terminee' || maintenant - salon.vuA > PEREMPTION_MS;
}

/**
 * La configuration d'une partie, déduite **uniquement** du salon et triée par
 * siège — jamais par ordre d'arrivée des messages. C'est ce qui garantit que
 * les appareils construisent la même partie.
 *
 * Le matériel voyage avec le salon : dans EDIT, les retouches de cartes ne sont
 * pas dans la configuration mais dans une couche à part, et deux appareils
 * réglés différemment ne joueraient pas le même paquet — mesuré : le paquet,
 * le mélange et les cartes elles-mêmes changent. C'est **celui de l'hôte** qui
 * fait foi, comme la boîte de jeu appartient à qui l'apporte.
 */
export function configDuSalon(salon) {
  const assis = salon.membres
    .filter((m) => m.present && m.siege !== undefined)
    .sort((a, b) => a.siege - b.siege);
  return {
    joueurs: assis.map((m) => ({ nom: m.nom, couleur: m.couleur, type: m.type || 'HUMAIN' })),
    cfg: salon.cfg,
    graine: salon.graine,
  };
}

// --- Actions ----------------------------------------------------------------
// Une action est l'unité de synchronisation : quelques dizaines d'octets.
//
//   { k: 'depart',    i }        la i-ème face proposée — choixDepart est trié
//   { k: 'derush',    o }        { source, index } — la carte prise dans la rivière
//   { k: 'poser',     c }        le coup, sans sa carte : on le retrouve dans la liste
//   { k: 'passe' }               aucun emplacement possible : la carte est écartée
//   { k: 'retourner', id }       une carte double montrée sur son autre face
//
// `derush` et `poser` désignent leur cible par une **description**, pas par un
// rang dans une liste : un rang serait juste, mais illisible dans un journal et
// fragile au moindre changement d'ordre.

/** Le coup, débarrassé de la carte : celle-ci se retrouve dans l'état rejoué. */
export function coupNu(coup) {
  const { carte, ...reste } = coup;
  return reste;
}

const memeCoup = (a, b) => a.action === b.action && a.format === b.format
  && a.pos === b.pos && a.seq === b.seq && a.cote === b.cote && a.role === b.role;

/**
 * Applique une action à un état. C'est la seule porte : le journal se rejoue
 * par elle, et le jeu en ligne la traverse à chaque coup.
 *
 * Rend true si la partie s'achève.
 */
export function appliquerAction(st, a) {
  const p = st.courant;
  switch (a.k) {
    case 'depart': {
      const options = choixDepart(st, p);
      poserDepart(st, p, options[a.i] || options[0]);
      break;
    }
    case 'derush': {
      const options = optionsDerushage(st);
      const o = options.find((x) => x.source === a.o.source && x.index === a.o.index) || options[0];
      if (!o) return st.finie;
      derusher(st, p, o);
      break;
    }
    case 'poser': {
      const coups = coupsPossibles(st, p);
      const c = coups.find((x) => memeCoup(x, a.c)) || coups[0];
      if (c) poser(st, p, c); else st.mains[p] = [];
      break;
    }
    case 'passe':
      st.mains[p] = [];
      break;
    case 'retourner': {
      // Retourner ne joue pas le tour : on ne passe pas la main.
      const carte = [...st.chutierPL, ...st.chutierPMGP, ...st.mains.flat()].find((c) => c && c.id === a.id);
      if (carte) retourner(st, carte);
      return st.finie;
    }
    default:
      return st.finie;
  }
  return avancer(st);
}

/**
 * Rejoue un journal depuis le début. C'est ce qui rend la reconnexion gratuite :
 * on redemande les actions, on rejoue, on est à jour.
 */
export function rejouer({ joueurs, cfg, graine }, actions, debut) {
  const st = creerPartie(joueurs, cfg, graine);
  // L'horodatage de création ne sert qu'à afficher une durée, mais il ferait
  // diverger les états sérialisés d'un appareil à l'autre : il vient du salon.
  if (debut) st.debut = debut;
  for (const a of actions) appliquerAction(st, a);
  return st;
}
