// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, DEPARTS, OBJ, objLabel, buildCartesDoubles, buildPlansLarges,
  moitiesDe, plHalf, halfInfo, appliquerMateriel, catalogue, grosPlansDisponibles, cleplan, planDeCle,
  doublonsNumeros, CADRAGES_POUVOIR, PORTEES, PORTEE_IDS, objPortee, objsDe, ciblesSequence, CIBLES_COMPTE,
  CIBLE_IDS, CIBLES_PRESENCE, cibleDe, libelleCibleCompte, planMarque, porteeReglable, porteeFigee,
  CRITERES_DOUBLE, teinteTc, contenuBoite, etiquettePlan, visuelImprime, exemplairesBoite,
} from './data.js';
import {
  DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, PALETTE_JOUEURS, encreDe, cloneConfig, migrerCfg,
} from './config.js';
import { elIcon, numIcon } from './icons.js';
import {
  renderCarte, renderPlan, renderDos, enPile, tc, objHTML, objContenu, cadrageIcon, estSi, estRegle,
} from './cards.js';
import { chargerPublie, materielPublie, signaturePublie, materielVide, composerPublie } from './publie.js';
import {
  composerPartage, encoderPartage, decoderPartage, partageDeLURL, lienPartage, LIMITE_LIEN,
  FORMAT as FORMAT_PARTAGE,
} from './partage.js';
import {
  creerPartie, choixDepart, poserDepart, optionsDerushage, cartesOffertes, derusher, defausser,
  peutDefausser, passer, sommetChutier, ecarterMain, coupsPossibles, coupsSurBanc, poser, avancer, scores,
  classement, construirePaquet, nouvelleGraine, planPose, appliquerPlan, limitePlans, limiteSequences, placeDuCote, tailleRiviere,
  resynchroniserBoite, bilanPaquet,
} from './engine.js';
import { choisirCoup, choisirDerushage, choisirDefausse, choisirDepart } from './ai.js';
import { cfgDeTable,
  compter, SOURCES_LABEL, objsEffectifs, raccordBonifie, compteIcone, compteCible, compteGroupes, bancVide,
} from './scoring.js';
import { releve, voler, stopperVols } from './anim.js';
import { campagne } from './lab.js';
import {
  CONTRAINTES, CONTRAINTES_PAR_DEFAUT, fautesParCarte, bilan, melangerMoities, repartition, coteConvenu,
} from './melange.js';
import { Salon } from './net/salon.js';
import { TransportLocal } from './net/local.js';
import { TransportSupabase } from './net/supabase.js';
import { enLigneDisponible } from './net/config.js';
import { REGLES_VERSION, corpsRegles } from './regles.js';
import { aideDeJeu } from './livret.js';

const app = document.getElementById('app');

// --- Persistance -----------------------------------------------------------

const LS = {
  get(k, d) { try { const v = localStorage.getItem('edit.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('edit.' + k, JSON.stringify(v)); } catch { /* quota */ } },
};

// Le site ne porte plus que la 4.1. Ce qu'un navigateur gardait des versions
// précédentes — l'historique des parties, un partage reçu, les brouillons de
// dessin de cartes — s'efface une fois, au premier passage. La configuration,
// elle, est triée par `migrerCfg` : ne restent que les variables qui existent.
(function purgerAvant41() {
  try {
    if (localStorage.getItem('edit.boite') === '4.1') return;
    for (const k of Object.keys(localStorage)) {
      if (k === 'edit.historique' || k === 'edit.partage.recu'
        || k.startsWith('edit.atelier.') || k.startsWith('edit.planche.')) localStorage.removeItem(k);
    }
    localStorage.setItem('edit.boite', '4.1');
    // Les images apportées à la main vivaient dans une réserve du navigateur.
    if (globalThis.indexedDB) indexedDB.deleteDatabase('edit.visuels');
  } catch { /* stockage indisponible : rien à purger */ }
}());

// --- Le mode PARTAGÉ --------------------------------------------------------
// Qui reçoit un partage vient JOUER la version qu'on lui a envoyée, pas la
// refaire. Les écrans qui fabriquent le jeu — le Matériel, le Laboratoire — et
// le journal des versions lui sont donc fermés, et l'accueil ne montre ni mode
// de jeu, ni variantes, ni bascule de matériel : tout cela est réglé par celui
// qui partage, et le changer en douce ferait tester autre chose.
//
// Ce n'est pas un verrou — le code d'un site tient dans son navigateur, rien
// n'y est secret : c'est un GARDE-FOU. Un jeton bien visible dit qu'on est sur
// une version partagée, et un clic dessus en sort : celui qui fabrique le
// partage doit pouvoir ouvrir son propre lien.
const enPartage = () => LS.get('partage.recu', null) !== null;

/** Ce que le partage dit de lui-même : sa version, sa date. */
const infoPartage = () => LS.get('partage.recu', null) || {};

/** Les écrans que le mode partagé ferme. */
const ECRANS_FERMES = ['#/materiel', '#/labo', '#/versions'];

function entrerEnPartage(p) {
  LS.set('partage.recu', { version: p.version, date: p.date, signature: p.signature || '' });
}

function quitterLePartage() {
  if (!confirm('Quitter la version partagée ?\n\n'
    + 'Le matériel et les réglages reçus ne bougent pas — ce sont les écrans de '
    + 'fabrication (Matériel, Laboratoire, Versions) qui se rouvrent.')) return;
  try { localStorage.removeItem('edit.partage.recu'); } catch { /* rien à faire */ }
  allerA('#/');
  route();
}

const store = {
  cfg: Object.assign(cloneConfig(DEFAULTS), migrerCfg(LS.get('cfg', {}))),
  // L'établi : un banc que l'on monte à la main, son historique pour annuler,
  // et le plan qu'on tient. Il ne se sauvegarde pas — c'est un brouillon.
  bac: { banc: { sequences: [] },
    historique: [], refaits: [], choisi: null, famille: 'PL', filtre: '', dernierPose: null },
  joueurs: LS.get('joueurs', [
    { nom: 'Val', couleur: COULEURS_JOUEURS[0], type: 'HUMAIN' },
    { nom: 'Justine', couleur: COULEURS_JOUEURS[1], type: 'EQUILIBRE' },
  ]),
  historique: LS.get('historique', []),
  partie: null,
  labo: null,
  laboEnCours: false,
  moitieChoisie: null,  // 'G' | 'D' | 'PL' : la moitié qu'on s'apprête à monter
  // La carte visée dans la rivière, et la moitié retenue : { o, moitie }. Le
  // tour se joue d'un bout à l'autre depuis le même écran — on choisit dans
  // la rivière, on pose dans le banc, sans étape intermédiaire.
  choixRiviere: null,
  joueurVu: null,       // le banc dont on lit les colonnes ; null = celui qui joue
  undo: null,
  vols: [],             // les cartes à faire voler au prochain rendu
  filIA: 0,             // jeton du fil des coups d'IA : incrémenté, il l'annule
  // Le banc affiché : un seul à la fois, les autres en onglets. null = le
  // sien. Seul un clic d'onglet en change — jamais le tour d'un adversaire.
  // Les bancs des AUTRES joueuses que l'on a repliés ; le sien ne se replie pas.
  bancsReplies: new Set(),
  // Le salon en ligne, quand il y en a un. Sa partie remplace alors
  // `store.partie` : elle n'est pas jouée, elle est **rejouée** depuis le
  // journal des actions.
  enLigne: null,
};

// Les parties enregistrées avant la palette pastel gardaient d'anciennes
// teintes : on les réaligne sur la palette courante, siège par siège.
store.joueurs.forEach((j, i) => {
  if (!COULEURS_JOUEURS.includes(j.couleur)) j.couleur = COULEURS_JOUEURS[i % COULEURS_JOUEURS.length];
});

// Les retouches faites dans l'éditeur de Matériel surchargent le matériel
// imprimé, partout : galeries, table de jeu, décompte et Laboratoire.
function normaliserMateriel() {
  const m = store.cfg.materiel && typeof store.cfg.materiel === 'object' ? store.cfg.materiel : {};
  if (!m.plans || typeof m.plans !== 'object') m.plans = {};
  if (!m.paires || typeof m.paires !== 'object') m.paires = {};
  // La composition — les cartes créées, celles qu'on a supprimées. Absente
  // d'une configuration enregistrée avant qu'elle existe.
  if (!m.ajouts || typeof m.ajouts !== 'object') m.ajouts = {};
  for (const k of ['scenes', 'larges', 'departs', 'paires']) {
    if (!Array.isArray(m.ajouts[k])) m.ajouts[k] = [];
  }
  if (!Array.isArray(m.retires)) m.retires = [];
  store.cfg.materiel = m;
  if (!Array.isArray(store.cfg.cartesDesactivees)) store.cfg.cartesDesactivees = [];
  if (store.cfg.materielActif !== 'IMPRIME') store.cfg.materielActif = 'MODIFIE';
}

/**
 * Le jeu de matériel en vigueur : l'imprimé, ou celui que porte l'éditeur.
 * Une partie en cours garde celui avec lequel elle a été lancée — changer de
 * jeu dans l'éditeur ne retourne pas les cartes déjà sur la table.
 */
function appliquerJeuActif() {
  // En ligne, c'est le matériel de l'HÔTE qui fait foi : il voyage avec le
  // salon. Deux appareils réglés différemment ne joueraient pas le même
  // paquet — mesuré, le mélange et les cartes elles-mêmes changent.
  const enl = store.enLigne && store.enLigne.salon && store.enLigne.salon.cfg;
  const src = enl || (store.partie && !store.partie.finie ? store.partie.cfg : store.cfg);
  const modifie = src.materielActif === 'MODIFIE';
  appliquerMateriel(modifie ? src.materiel : null, src.cartesDesactivees, src.materiel);
}

/**
 * Le matériel PUBLIÉ — `materiel.json`, dans le dépôt — devient celui de cette
 * machine quand elle n'a rien réglé elle-même. C'est ce qui fait qu'un lien
 * partagé montre le même jeu à tout le monde : le site porte le matériel du
 * maître, et une machine neuve l'adopte sans rien avoir à faire.
 *
 * Une machine qui a bricolé garde son bricolage : on n'efface pas le travail de
 * quelqu'un au chargement d'une page. L'éditeur lui dira que le site publie
 * autre chose, et lui offrira de l'adopter d'un clic.
 */
function adopterPublie(force) {
  const p = materielPublie();
  if (!p) return false;
  if (!force && !materielVide(store.cfg.materiel)) return false;
  store.cfg.materiel = JSON.parse(JSON.stringify(p.materiel));
  store.cfg.cartesDesactivees = (p.cartesDesactivees || []).slice();
  store.cfg.publieAdopte = p.signature || p.date || '1';
  normaliserMateriel();
  appliquerJeuActif();
  sauverCfg();
  return true;
}

/** Le site publie-t-il un matériel que cette machine n'a pas encore adopté ? */
function publieEnAttente() {
  const p = materielPublie();
  return !!p && signaturePublie() !== (store.cfg.publieAdopte || '');
}

normaliserMateriel();
appliquerJeuActif();

function sauverCfg() {
  LS.set('cfg', store.cfg);
  appliquerJeuActif();
  // Une retouche faite dans la même fenêtre qu'une partie en cours : l'événement
  // `storage` ne se déclenche que dans les AUTRES fenêtres, il faut donc faire
  // ici ce qu'il y ferait. Une partie finie n'y touche pas — son décompte est
  // arrêté, il ne doit plus bouger.
  if (store.partie && !store.partie.finie) resynchroniserMateriel(store.partie, store.cfg);
}

/**
 * L'éditeur travaille toujours sur le matériel modifié, même quand c'est
 * l'imprimé qui se joue : on bascule le temps du calcul, puis on remet. Les
 * appels s'imbriquent — un rendu de carte en appelle d'autres — donc seul le
 * plus extérieur bascule et remet.
 */
let profondeurModifie = 0;

function surLeModifie(fn) {
  if (profondeurModifie++ === 0) {
    appliquerMateriel(store.cfg.materiel, store.cfg.cartesDesactivees, store.cfg.materiel);
  }
  try { return fn(); } finally { if (--profondeurModifie === 0) appliquerJeuActif(); }
}
function sauverJoueurs() { LS.set('joueurs', store.joueurs); }

// --- Chrome ----------------------------------------------------------------

const ONGLETS = [
  ['#/banc', 'Banc de montage'],
  ['#/materiel', 'Matériel'],
  ['#/regles', 'Règles'],
  ['#/variables', 'Variables'],
  ['#/labo', 'Laboratoire'],
  ['#/historique', 'Historique'],
  ['#/versions', 'Versions'],
];

function topbar(actif) {
  const enPartie = store.partie && !store.partie.finie;
  const partage = enPartage();
  const onglets = partage ? ONGLETS.filter(([h]) => !ECRANS_FERMES.includes(h)) : ONGLETS;
  const info = infoPartage();
  return `<div class="topbar">
    <div class="marque" data-go="#/">
      <img class="logo-edit" src="assets/marque/edit.webp" alt="EDIT" width="888" height="378">
      <div class="version-pill">v${VERSION}</div>
    </div>
    ${partage ? `<button class="jeton-partage" id="sortir-partage"
      title="Vous jouez une version partagée — matériel et réglages reçus de qui vous a envoyé le lien.&#10;Cliquer pour rouvrir les écrans de fabrication.">
      🔗 Version partagée${info.version ? ` · v${info.version}` : ''}</button>` : ''}
    <nav class="nav">
      ${enPartie && actif !== '#/partie' ? `<button class="chaud" data-go="#/partie">▶ Partie en cours</button>` : ''}
      ${actif !== '#/' ? `<button data-go="#/">Accueil</button>` : ''}
      ${onglets.map(([h, l]) => `<button class="${actif === h ? 'actif' : ''}" data-go="${h}">${l}</button>`).join('')}
    </nav>
  </div>`;
}

const pied = () => `<div class="pied">Version ${VERSION} — compilée le ${BUILD_DATE}</div>`;

function html(s, garderDefilement = false) {
  if (apercuEl) apercuEl.classList.remove('visible');
  document.body.classList.toggle('sans-points', store.cfg.pointsSurCartes === false);
  const y = window.scrollY;
  app.innerHTML = s;
  // Repeindre la table ne doit pas ramener la page en haut.
  if (garderDefilement && y) window.scrollTo({ top: y, behavior: 'instant' });
  app.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => allerA(el.dataset.go));
  });
  const sortie = app.querySelector('#sortir-partage');
  if (sortie) sortie.addEventListener('click', quitterLePartage);
}

// ===========================================================================
// ACCUEIL
// ===========================================================================

function vueAccueil() {
  const n = store.joueurs.length;
  // Sur une version partagée, le matériel en jeu est celui de qui l'a envoyée :
  // on ne propose pas d'en changer. Restent les options de confort.
  const partage = enPartage();
  const info = infoPartage();
  const c = store.cfg;

  html(`${topbar('#/')}
  <div class="hero">
    <h1><img class="logo-edit" src="assets/marque/edit.webp" alt="EDIT" width="888" height="378"></h1>
    <div class="credits">
      Un jeu de <b>Valentin Drouet</b>, illustré par <b>Anders Lazaret</b><br>
      Édité par <b>Big Budi Games</b>
    </div>
  </div>
  <div class="wrap accueil">
    <div class="panneau">
      <h2>Joueuses</h2>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div class="segments" id="seg-n">
          ${[1, 2, 3, 4].map((i) => `<button class="${i === n ? 'on' : ''}" data-n="${i}">${i}</button>`).join('')}
        </div>
        <span class="aide">${n} joueuse${n > 1 ? 's' : ''}${n === 1 ? ' — en solo' : ''}</span>
      </div>
      <div id="liste-joueurs">${store.joueurs.map((j, i) => ligneJoueur(j, i)).join('')}</div>
    </div>

    ${partage ? `<div class="bandeau-materiel partage-recu">
      <span class="bm-titre">🔗 Version partagée${info.version ? ` — v${info.version}` : ''}</span>
      <span class="aide">${info.date ? `reçue du ${info.date} · ` : ''}cartes et réglages sont ceux de qui
      vous a envoyé le lien — rien à régler, jouez.</span>
    </div>` : ''}
    ${bilanJeu().jouable ? '' : `<p class="aide set-incomplet">${messagePaquetCourt()}</p>`}
    <button class="cta" id="go" ${bilanJeu().jouable ? '' : 'disabled'}>Commencer la partie</button>
    <button class="pill large" data-go="#/enligne">🌐 Jouer en ligne, chacun sur son appareil</button>

    <div class="panneau options-accueil">
      <h2>Options d’affichage</h2>
      <div class="chips">
        ${chip('pointsSurCartes', 'Points visibles')}
        ${chip('animerCoups', 'Mouvement des cartes')}
        ${chip('apercuSurvol', 'Pop-up au survol')}
      </div>
    </div>
  </div>
  ${pied()}`);

  app.querySelectorAll('#seg-n button').forEach((b) => b.addEventListener('click', () => {
    const cible = +b.dataset.n;
    while (store.joueurs.length < cible) {
      const i = store.joueurs.length;
      store.joueurs.push({ nom: ['Val', 'Justine', 'Claude', 'Marie-Laure'][i] || `Joueuse ${i + 1}`, couleur: COULEURS_JOUEURS[i], type: 'EQUILIBRE' });
    }
    store.joueurs.length = cible;
    sauverJoueurs(); vueAccueil();
  }));

  brancherJoueurs();
  // « Jouer la boîte 4.1 », quand la boîte modifiée ne suffit pas à la partie.
  app.querySelectorAll('[data-jeu-accueil]').forEach((b) => b.addEventListener('click', () => {
    store.cfg.materielActif = b.dataset.jeuAccueil;
    sauverCfg();
    vueAccueil();
  }));
  brancherChips(vueAccueil);
  brancherChamps(vueAccueil);
  app.querySelector('#go').addEventListener('click', lancerPartie);
}

function ligneJoueur(j, i) {
  return `<div class="ligne-joueur" data-i="${i}">
    <input type="text" value="${j.nom}" data-champ="nom" maxlength="16">
    <div class="puces">
      ${PALETTE_JOUEURS.map((p) => `<div class="puce ${p.clair === j.couleur ? 'on' : ''}" style="background:${p.clair}"
        data-couleur="${p.clair}" title="${p.nom}"></div>`).join('')}
    </div>
    <select data-champ="type">
      <option value="HUMAIN" ${j.type === 'HUMAIN' ? 'selected' : ''}>Humaine</option>
      ${Object.values(PROFILS_IA).map((p) => `<option value="${p.id}" ${j.type === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
    </select>
  </div>`;
}

function brancherJoueurs() {
  app.querySelectorAll('.ligne-joueur').forEach((row) => {
    const i = +row.dataset.i;
    row.querySelectorAll('[data-champ]').forEach((el) => el.addEventListener('change', () => {
      store.joueurs[i][el.dataset.champ] = el.value; sauverJoueurs();
    }));
    row.querySelectorAll('[data-couleur]').forEach((p) => p.addEventListener('click', () => {
      const c = p.dataset.couleur;
      const autre = store.joueurs.findIndex((x, k) => k !== i && x.couleur === c);
      if (autre >= 0) store.joueurs[autre].couleur = store.joueurs[i].couleur;
      store.joueurs[i].couleur = c;
      sauverJoueurs(); vueAccueil();
    }));
  });
}

function chip(k, label) {
  const on = !!store.cfg[k];
  return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-chip="${k}" ${on ? 'checked' : ''}>${label}</label>`;
}

function brancherChips(apres) {
  app.querySelectorAll('[data-chip]').forEach((el) => el.addEventListener('change', () => {
    store.cfg[el.dataset.chip] = el.checked;
    sauverCfg();
    el.closest('.chip').classList.toggle('on', el.checked);
    if (apres) apres();
  }));
}

function brancherChamps(apres) {
  app.querySelectorAll('[data-cfg]').forEach((el) => el.addEventListener('change', () => {
    const k = el.dataset.cfg;
    if (el.type === 'checkbox') store.cfg[k] = el.checked;
    else if (el.type === 'number') store.cfg[k] = el.step && el.step !== '1' ? parseFloat(el.value) : parseInt(el.value, 10) || 0;
    else store.cfg[k] = el.value;
    sauverCfg();
    if (apres) apres();
  }));
}

/** Ce que porte le paquet qui part en partie. */
function resumePaquet() {
  const { doubles, larges, departs } = construirePaquet();
  return `<table class="tbl">
    <tr><td>Cartes à deux Gros Plans</td><td class="num">${doubles.length}</td></tr>
    <tr><td>Plans Larges</td><td class="num">${larges.length}</td></tr>
    <tr><td>Cartes de départ</td><td class="num">${departs.length}</td></tr>
  </table>`;
}

// ===========================================================================
// PARTIE
// ===========================================================================

/**
 * Aller à un écran. Poser le MÊME hash que celui où l'on se trouve ne déclenche
 * pas `hashchange` : rien ne se redessine. C'est ce qui rendait « Rejouer »
 * inopérant depuis la table des scores — elle vit sous `#/partie`, la partie
 * neuve était bel et bien créée, mais l'écran restait sur l'ancienne. On rend
 * donc explicitement quand l'adresse ne bouge pas.
 */
function allerA(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

/**
 * Le paquet suffit-il pour `n` joueuses ? On le demande au matériel de la
 * CONFIGURATION — celui qui partira en partie —, même si une partie en cours
 * joue un autre jeu.
 */
function bilanJeu(n = store.joueurs.length, jeu = store.cfg.materielActif) {
  appliquerMateriel(jeu === 'MODIFIE' ? store.cfg.materiel : null,
    store.cfg.cartesDesactivees, store.cfg.materiel);
  try { return bilanPaquet(store.cfg, n); } finally { appliquerJeuActif(); }
}

/** Ce qu'on dit quand le paquet n'a pas de quoi faire une partie — et quoi faire. */
function messagePaquetCourt(n = store.joueurs.length) {
  const s = (k) => (k > 1 ? 's' : '');
  const b = bilanJeu(n);
  const morceaux = [];
  if (b.manque > 0) {
    morceaux.push(`il faut <b>${b.besoin} cartes</b> pour ${n} joueuse${s(n)} — ${Math.max(0, store.cfg.tours - 1)}
      à prendre chacune, plus la rivière —, le paquet en compte <b>${b.total}</b> : ${b.doubles}
      carte${s(b.doubles)} à deux Gros Plans et ${b.larges} Plan${s(b.larges)} Large${s(b.larges)}`);
  }
  if (b.departsManquants) {
    morceaux.push(`il manque ${b.departsManquants} carte${s(b.departsManquants)} de départ`);
  }
  if (b.incompletes) {
    const liste = b.aCompleter.slice(0, 8).join(', ') + (b.incompletes > 8 ? '…' : '');
    morceaux.push(`<b>${b.incompletes} carte${s(b.incompletes)} n’${b.incompletes > 1 ? 'ont' : 'a'} qu’une
      moitié</b> (${liste}) et reste${b.incompletes > 1 ? 'nt' : ''} hors du paquet — à compléter dans
      Matériel › Assemblage`);
  }
  const boite = store.cfg.materielActif === 'MODIFIE' && bilanJeu(n, 'IMPRIME').jouable
    ? ' <button class="pill mini" data-jeu-accueil="IMPRIME">Jouer la boîte 4.1</button>' : '';
  return `Ce paquet ne suffit pas pour jouer : ${morceaux.join(' ; ')}.${boite}`;
}

function lancerPartie() {
  if (!bilanJeu().jouable) return;
  appliquerJeuActif();
  // Une partie précédente peut encore avoir un coup d'IA ou une carte en l'air.
  store.filIA++; store.vols = []; stopperVols();
  store.partie = creerPartie(store.joueurs.map((j) => ({ ...j })), cloneConfig(store.cfg), store.cfg.graine || nouvelleGraine());
  // La partie fige son matériel : à partir d'ici c'est le sien qui vaut.
  appliquerJeuActif();
  store.moitieChoisie = null;
  store.choixRiviere = null;
  store.undo = null;
  store.joueurVu = null;
  store.bancsReplies = new Set();
  allerA('#/partie');
}

/**
 * Les colonnes de lecture d'un banc. On peut les braquer sur une autre
 * joueuse : le choix tient jusqu'à ce qu'on en désigne une autre, ou qu'on
 * revienne à celle dont c'est le tour.
 */
function colonnesJoueur(st, sc, vu) {
  const nom = st.joueurs[vu].nom;
  const suit = store.joueurVu === null;
  return `
    <div class="panneau">
      <h2>Icônes du banc de ${nom}${suit ? '' : ' <span class="epingle">épinglé</span>'}</h2>
      ${suit ? '' : '<button class="pill mini" id="suivre-tour">↩ suivre qui joue</button>'}
      ${blocRecensement(sc[vu])}
    </div>
    <div class="panneau"><h2>Score de ${nom}</h2>${listePouvoirs(sc[vu])}</div>`;
}

/**
 * Repeint la table. `enchainer` relance le fil des coups d'IA — on le coupe
 * quand c'est le fil lui-même qui demande le rendu, pour qu'un coup n'en
 * déclenche pas deux.
 */
function vuePartie(enchainer = true) {
  // Arriver ici sans partie locale, c'est revenir d'un rafraîchissement en
  // pleine partie en ligne : on réveille le salon, qui redemandera le journal.
  if (!store.partie && !store.enLigne) salonCourant();
  const enl = store.enLigne && store.enLigne.partie ? store.enLigne : null;
  const st = enl ? enl.partie : store.partie;
  if (!st) { location.hash = enl ? '#/enligne' : '#/'; return; }
  appliquerJeuActif();
  if (st.finie) return vueFin();

  const p = st.courant;
  const j = st.joueurs[p];
  // En ligne, on ne joue que son tour : les autres sièges sont tenus par
  // d'autres appareils, et la table se regarde en attendant.
  const humaine = j.type === 'HUMAIN' && (!enl || enl.aMoiDeJouer);
  const sc = scores(st);
  // Le banc lu dans les colonnes : celui qui joue, ou celui qu'on a épinglé.
  const vu = store.joueurVu !== null && st.joueurs[store.joueurVu] ? store.joueurVu : p;

  // Le banc de qui regarde : celui de qui joue quand c'est une humaine — c'est
  // là qu'elle doit poser —, celui de la première humaine pendant qu'une IA
  // joue, et en ligne celui de son siège. Il est en tête et ne se replie pas.
  const humains = st.joueurs.map((jj, i) => (jj.type === 'HUMAIN' ? i : -1)).filter((i) => i >= 0);
  const parDefaut = humaine ? p : (humains.length ? humains[0] : p);
  const mien = enl && enl.monSiege >= 0 ? enl.monSiege : parDefaut;
  // Tous les bancs, l'un au-dessus de l'autre : le sien, puis les suivants dans
  // l'ordre du tour.
  const n = st.joueurs.length;
  const ordre = Array.from({ length: n }, (_, k) => (mien + k) % n);

  // Pendant la mise en place, on montre TOUJOURS la carte de départ de la
  // joueuse qui regarde — jamais celle de l'IA qui joue.
  let zone;
  if (st.phase === 'DEPART') zone = zoneDepart(st, parDefaut, humaine);
  else if (st.phase === 'DERUSHAGE') zone = zoneTable(st, humaine);
  else zone = zoneMontage(st, p, humaine);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    ${enl ? bandeauEnLigne(enl, st) : ''}
    <div class="table-jeu">
      <div class="zone-haut">
        ${st.finDeclenchee == null ? '' : `<div class="bandeau-tour">
            <span class="jeton-dernier">dernier tour</span>
          </div>`}
        <div class="panneau zone-phase">${zone}</div>
      </div>

      <div class="zone-bancs">
        ${ordre.map((i) => panneauBanc(st, sc, i, {
    mien: i === mien,
    actif: i === p,
    interactif: i === p && humaine && (st.phase === 'MONTAGE' || st.phase === 'DERUSHAGE'),
  })).join('')}
      </div>

      <div class="colonne-info">
        ${st.joueurs.map((jj, i) => `
          <div class="mini-joueur ${i === p ? 'actif' : ''} ${i === vu ? 'vu' : ''}" data-joueur="${i}"
            title="Lire les colonnes de ${jj.nom}">
            <div class="entete">
              <span class="point-couleur" style="background:${jj.couleur}"></span>
              <span>${jj.nom}</span>
              ${i === p ? '<span class="badge-tour">À son tour</span>' : ''}
              ${jj.type !== 'HUMAIN' ? `<span class="badge-bot">${PROFILS_IA[jj.type].label.replace('IA — ', '')}</span>` : ''}
              <span class="pt">${sc[i].total}</span>
            </div>
          </div>`).join('')}

        <div id="colonnes-joueur">${colonnesJoueur(st, sc, vu)}</div>

        <div class="barre-outils">
          <button class="pill" id="undo" ${store.undo ? '' : 'disabled'}>↩ Annuler</button>
          <button class="pill" id="quitter">Quitter</button>
        </div>

        <div class="reglages-partie">
          <button class="pill mini" id="bascule-points"
            title="Afficher ou masquer ce que chaque plan rapporte, au coin des cartes">
            ${store.cfg.pointsSurCartes === false ? 'Points masqués' : 'Points visibles'}
          </button>
          <button class="pill mini ${store.cfg.apercuSurvol ? '' : 'eteint'}" id="bascule-apercu"
            title="Voir une carte en grand quand on la survole">
            Pop-up au survol
          </button>
          <span class="jeton-materiel ${st.cfg.materielActif === 'MODIFIE' ? 'modifie' : ''}"
            title="Le jeu de matériel avec lequel cette partie a été lancée">
            Boîte 4.1${st.cfg.materielActif === 'MODIFIE' ? ' · modifiée' : ''}</span>
        </div>
      </div>
    </div>
  </div>
  ${pied()}`, true);

  brancherPartie(st, humaine);
  // La table dit qui joue : pendant un tour d'IA, la zone reste en place mais
  // ne se laisse pas manipuler.
  document.body.classList.toggle('ia-joue', !humaine);
  // Le verrou se pose dès le rendu, pas au premier battement du vol.
  if (store.vols.length) document.body.classList.add('coup-en-vol');
  // Le fil des coups d'IA n'a pas cours en ligne : chaque siège est un appareil.
  if (enchainer && !enl) derouler(st).catch(() => { document.body.classList.remove('ia-joue', 'coup-en-vol'); });
}

/**
 * Le panneau d'un banc à la table. Celui de qui regarde est toujours ouvert ;
 * ceux des autres se replient et se rouvrent d'un clic sur leur nom.
 */
function panneauBanc(st, sc, i, { mien, actif, interactif }) {
  const j = st.joueurs[i];
  const replie = !mien && !interactif && store.bancsReplies.has(i);
  const lim = limitePlans(st.cfg);
  const plans = Math.min(compter(st.bancs[i], st.cfg).plans, lim);
  const nom = `<span class="point-couleur" style="background:${j.couleur}"></span>
    <span class="nom-banc-texte">${j.nom}</span>
    ${mien ? '<span class="badge-mien">votre banc</span>' : ''}
    ${actif ? '<span class="badge-tour">À son tour</span>' : ''}`;
  return `<div class="panneau banc-joueur ${replie ? 'replie' : ''} ${actif ? 'actif' : ''}"
    data-banc-joueur="${i}" style="--enc:${encreDe(j.couleur)}">
    <h2 class="titre-banc">
      ${mien ? `<span class="nom-banc">${nom}</span>`
    : `<button class="nom-banc repliable" data-replier="${i}" aria-expanded="${!replie}"
          title="${replie ? 'Afficher' : 'Replier'} le banc de ${j.nom}">
          <span class="chevron" aria-hidden="true">${replie ? '▸' : '▾'}</span>${nom}</button>`}
      <b class="banc-pts">${sc[i].total} pts</b>
      <span class="banc-compte">Plan <b>${plans} / ${lim}</b></span>
    </h2>
    ${replie ? '' : bancBloc(st, i, null, interactif)}
  </div>`;
}

// --- Le banc ---------------------------------------------------------------

// La largeur d'un plan dans un banc, en accord avec la feuille de style : elle
// sert à aligner les séquences et à faire la place à l'aperçu de pose. Une
// carte fait 120 × 80 mm : un Plan Large la prend entière, un Gros Plan la
// moitié.
const LARGEUR_BANC = { GP: 135, PL: 270, DEP: 270 };
// L'écart entre deux plans d'une même séquence (`.banc .sequence { gap }`).
const ECART_PLANS = 2;

/** La largeur d'une séquence dans le banc, rembourrage compris. */
function largeurSeq(seq) {
  if (!seq.length) return 8;
  const plans = seq.reduce((s, p) => s + (LARGEUR_BANC[p.format] || LARGEUR_BANC.GP), 0);
  return 8 + plans + (seq.length - 1) * ECART_PLANS;
}

/**
 * La distance du bord gauche d'une séquence au **centre de son ancre** — le
 * plan qui l'a ouverte, marqué à la pose. Une séquence peut porter plusieurs
 * Plans Larges, un Raccord faisant charnière entre eux : c'est celui qui l'a
 * ouverte qui la tient. À défaut de marque, le premier Plan Large ou Plan de
 * départ ; à défaut encore, le milieu.
 */
function ancreDe(seq) {
  let k = seq.findIndex((p) => p.ancre);
  if (k < 0) k = seq.findIndex((p) => p.format === 'PL' || p.format === 'DEP');
  if (k < 0) return largeurSeq(seq) / 2;
  const avant = seq.slice(0, k)
    .reduce((s, p) => s + (LARGEUR_BANC[p.format] || LARGEUR_BANC.GP) + ECART_PLANS, 0);
  return 4 + avant + (LARGEUR_BANC[seq[k].format] || LARGEUR_BANC.GP) / 2;
}

/**
 * La **colonne d'ancrage** d'un banc : toutes les séquences alignent le centre
 * de leur Plan Large — ou de leur Plan de départ — sur la même verticale. Celle
 * qui a le plus de plans à gauche de son ancre fixe la colonne ; les autres
 * comblent l'écart d'un retrait. C'est un calage dans le flux : le banc défile
 * de gauche à droite dès que cela déborde, sans rompre l'alignement.
 */
function colonneAncrage(sequences) {
  if (!sequences.length) return { avant: 0, apres: 0 };
  const avant = Math.max(...sequences.map(ancreDe));
  const apres = Math.max(...sequences.map((s) => largeurSeq(s) - ancreDe(s)));
  return { avant, apres };
}

function bancBloc(st, i, titre, interactif) {
  const banc = st.bancs[i];
  // Ce que chaque carte rapporte ici et maintenant. Un plan qui porte deux
  // pouvoirs produit deux lignes : on garde le détail et leur somme.
  const points = new Map();
  const detail = new Map();
  // Ce que chaque séquence rapporte, affiché à son bout. Les points sont
  // portés par la carte qui les fait marquer.
  const ptsLigne = banc.sequences.map(() => 0);
  const score = compter(banc, st.chutier ? cfgDeTable(st) : st.cfg);
  for (const l of score.lignes) {
    points.set(l.plan, (points.get(l.plan) || 0) + l.pts);
    const a = detail.get(l.plan) || []; a.push(l.pts); detail.set(l.plan, a);
    if (ptsLigne[l.sequence] !== undefined) ptsLigne[l.sequence] += l.pts;
  }

  // Le plan qui vient d'être posé : c'est là que la carte en vol atterrit.
  const neuf = st.dernierPose && st.dernierPose.p === i ? st.dernierPose : null;
  // `interactif` vaut true à la table — la visée se lit alors dans le store —,
  // ou porte directement une visée : c'est ainsi que le Banc de montage pose un
  // plan qu'il a choisi lui-même, sans carte et sans tour de jeu.
  const vise = interactif === true ? viseeCourante(st, i)
    : (interactif && typeof interactif === 'object' ? interactif : null);
  const coups = !vise ? []
    : vise.coups || coupsPossibles(st, i, vise.carte).filter((c) => c.moitie === vise.moitie);

  // Au survol d'un emplacement, le plan s'y montre en transparence, tel qu'il
  // s'y poserait.
  const carteEnMain = vise ? vise.carte : null;
  // De quel côté de l'emplacement la carte va tomber : c'est là que l'aperçu
  // se montre, en s'étendant vers la place qu'elle prendra.
  const versOu = (c) => (c.cote ? c.cote : (c.pos === 0 ? 'haut' : 'bas'));
  // `couche` : l'emplacement est dans une bande horizontale, où l'étiquette se
  // lit normalement.
  const fenteChoix = (c, couche) => {
    const coup = encodeURIComponent(JSON.stringify(sansCarte(c)));
    const lg = etiquetteCoup(c);
    const debout = !couche && lg.length > 3;
    const bouton = `<button class="fente-btn ${debout ? 'debout' : ''}" data-coup="${coup}">${lg}</button>`;
    if (!carteEnMain && !(vise && vise.plan)) return `<span class="fente-choix">${bouton}</span>`;
    const plan = (vise && vise.plan) || planPose(carteEnMain, c.moitie);
    // L'aperçu porte lui aussi le coup : c'est toute la carte en pointillés qui
    // se clique, pas seulement son étiquette.
    return `<span class="fente-choix vers-${versOu(c)}" style="--ap:${LARGEUR_BANC[plan.format] || LARGEUR_BANC.GP}px">
      ${bouton}<span class="apercu-pose" data-coup="${coup}">${renderPlan(plan, { muet: true })}</span>
    </span>`;
  };

  const fente = (liste) => {
    if (!liste.length) return '<div class="ecart"></div>';
    return `<div class="ecart actif">${liste.map((c) => fenteChoix(c)).join('')}</div>`;
  };
  // Une bande court sur toute la largeur du banc, au-dessus ou en dessous des
  // séquences : vide, elle ne prend aucune place.
  const bande = (liste) => (liste.length
    ? `<div class="ecart actif bande">${liste.map((c) => fenteChoix(c, true)).join('')}</div>`
    : '');

  // Les pouvoirs effectifs, quand ils diffèrent de l'imprimé — sinon rien.
  const objsRemplaces = (plan) => {
    const eff = objsEffectifs(plan, banc, st.cfg);
    const imp = objsDe(plan);
    return eff.length === imp.length && eff.every((o, j) => o === imp[j]) ? undefined : eff;
  };

  const carte = (plan, si, k) => renderPlan(plan, {
    // Un compteur ne s'affiche que si le plan a de quoi marquer. Sans pouvoir,
    // ou avec un pouvoir qui n'ouvre qu'un droit, il n'y a rien à compter : un
    // « 0 » y ferait croire à un pouvoir qui a échoué.
    points: planMarque(objsEffectifs(plan, banc, st.cfg)) ? (points.get(plan) || 0) : undefined,
    // Un Raccord dont le pouvoir a été bonifié : le jeton de points passe au vert.
    objs: objsRemplaces(plan),
    bonifie: raccordBonifie(plan, banc, st.cfg),
    detail: detail.get(plan) || [],
    neuf: !!(neuf && neuf.seq === si && neuf.idx === k),
  });

  const morceaux = [];
  const n = banc.sequences.length;
  if (!n) morceaux.push('<div class="vide" style="color:#8a8496">Banc vide</div>');

  // Toutes les séquences alignent leur ancre sur la même verticale.
  const col = colonneAncrage(banc.sequences);
  // Au-dessus de tout : ouvrir une séquence en tête du film.
  morceaux.push(bande(coups.filter((c) => c.action === 'NOUVELLE_SEQUENCE' && c.pos === 0)));
  banc.sequences.forEach((seq, si) => {
    const gauche = Math.round(col.avant - ancreDe(seq));
    const droite = Math.round(col.apres - (largeurSeq(seq) - ancreDe(seq)));
    // Les deux bords se posent **hors du flux**, contre les flancs de la
    // séquence : ouvrir un emplacement d'un côté ne déplace ni la ligne ni
    // son ancre.
    morceaux.push('<div class="ligne">');
    morceaux.push(`<span class="ligne-pts ${(ptsLigne[si] || 0) < 0 ? 'negatif' : ((ptsLigne[si] || 0) ? '' : 'nul')}"
      title="Ce que cette séquence rapporte">${ptsLigne[si] || 0}</span>`);
    morceaux.push(`<div class="ligne-fil" style="padding-left:${gauche}px;padding-right:${droite}px">`);
    morceaux.push('<div class="ligne-corps">');
    morceaux.push(`<div class="bord gauche">${fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'gauche'))}</div>`);
    morceaux.push('<div class="sequence">');
    seq.forEach((plan, k) => morceaux.push(carte(plan, si, k)));
    morceaux.push('</div>');
    morceaux.push(`<div class="bord droite">${fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'droite'))}</div>`);
    morceaux.push('</div></div></div>');
  });
  // En dessous de tout : ouvrir une séquence en fin de film. Sur un banc vide,
  // les deux bandes désigneraient le même coup : une seule suffit.
  if (n) morceaux.push(bande(coups.filter((c) => c.action === 'NOUVELLE_SEQUENCE' && c.pos === n)));

  const banche = `<div class="banc ${coups.length ? 'vise' : ''}" data-banc="${i}"><div class="banc-piste lignes">${morceaux.join('')}</div></div>`;
  // Sans titre, on ne veut que le banc : c'est ce que demande le compte rendu
  // de fin de partie, qui donne le nom de la joueuse à sa façon.
  if (titre === null) return banche;

  const max = limitePlans(st.cfg);
  const faits = Math.min(compter(banc, st.cfg).plans, max);
  return `<div class="panneau">
    <h2>${titre}${titre ? `<span class="banc-compte">Plan <b>${faits} / ${max}</b></span>` : ''}</h2>
    ${banche}
  </div>`;
}

/**
 * Viser une moitié dans la rivière. Rien n'est joué : on désigne seulement ce
 * que l'on veut monter, et le banc montre aussitôt où. Re-cliquer la même
 * moitié annule la visée.
 */
function viser(st, o, moitie) {
  const c = store.choixRiviere;
  store.choixRiviere = (c && memeOption(c.o, o) && c.moitie === moitie) ? null : { o, moitie };
  rafraichirVisee(st);
}

/**
 * Repeint ce que la visée change — les cartes offertes et le banc de qui joue —,
 * pas toute la table : une visée n'est pas un coup, et rien d'autre ne doit
 * bouger sous le curseur.
 */
function rafraichirVisee(st) {
  const p = st.courant;
  const vise = store.choixRiviere;
  app.querySelectorAll('[data-derush]').forEach((el) => {
    const o = JSON.parse(decodeURIComponent(el.dataset.derush));
    const m = vise && memeOption(vise.o, o) ? vise.moitie : null;
    const boite = el.closest('.riviere-case');
    if (boite) boite.classList.toggle('visee', !!m);
    el.querySelectorAll('.moitie[data-moitie]').forEach((x) => {
      x.classList.toggle('choisi', x.dataset.moitie === m);
    });
  });

  const aide = app.querySelector('#aide-table');
  if (aide) aide.innerHTML = aideTable(st, true);

  const banc = app.querySelector(`.banc[data-banc="${p}"]`);
  const piste = banc && banc.querySelector('.banc-piste');
  if (!piste) return vuePartie(false);
  const bloc = document.createElement('div');
  bloc.innerHTML = bancBloc(st, p, '', true);
  piste.innerHTML = bloc.querySelector('.banc-piste').innerHTML;
  banc.classList.toggle('vise', !!bloc.querySelector('.banc').classList.contains('vise'));
  brancherFentes(st, piste);
  brancherApercu(piste);
}

/** La moitié de la carte en main que l'on garde — quand la prise et la pose sont séparées. */
function choisirMoitie(st, moitie) {
  store.moitieChoisie = store.moitieChoisie === moitie ? null : moitie;

  const zone = app.querySelector('#choix-carte');
  if (!zone) return vuePartie(false);
  zone.querySelectorAll('.moitie[data-moitie]').forEach((el) => {
    el.classList.toggle('choisi', el.dataset.moitie === store.moitieChoisie);
  });

  const aide = app.querySelector('#aide-montage');
  if (aide) aide.innerHTML = aideMontage(st, store.moitieChoisie);

  const piste = app.querySelector(`.banc[data-banc="${st.courant}"] .banc-piste`);
  if (piste) {
    const bloc = document.createElement('div');
    bloc.innerHTML = bancBloc(st, st.courant, '', true);
    piste.innerHTML = bloc.querySelector('.banc-piste').innerHTML;
    brancherFentes(st, piste);
    brancherApercu(piste);
  }
}

/**
 * Le banc retient quel emplacement est ouvert plutôt que de s'en remettre au
 * seul `:hover` : l'aperçu déborde de son emplacement, et le curseur qui le
 * longe passerait par des zones qui n'appartiennent ni à l'un ni à l'autre.
 */
function suivreFente(el) {
  const banc = el.closest('.banc');
  if (!banc) return;
  banc.querySelectorAll('.fente-choix.ouverte').forEach((f) => f.classList.remove('ouverte'));
  el.classList.add('ouverte');
}

/** (Re)branche les emplacements de pose du banc courant. */
function brancherFentes(st, racine = app) {
  racine.querySelectorAll('.fente-choix').forEach((el) => {
    el.addEventListener('mouseenter', () => suivreFente(el));
  });
  const banc = racine.closest ? racine.closest('.banc') : null;
  (banc ? [banc] : [...racine.querySelectorAll('.banc')]).forEach((b) => {
    b.addEventListener('mouseleave', () => {
      b.querySelectorAll('.fente-choix.ouverte').forEach((f) => f.classList.remove('ouverte'));
    });
  });
  racine.querySelectorAll('[data-coup]').forEach((el) => el.addEventListener('click', async () => {
    const partiel = JSON.parse(decodeURIComponent(el.dataset.coup));
    // En ligne, un coup n'est pas joué : il est **noté**. Le journal l'applique
    // chez soi et l'émet aux autres, qui le rejoueront à l'identique.
    if (store.enLigne && store.enLigne.partie) {
      const v = store.choixRiviere;
      if (st.phase === 'DERUSHAGE' && v) store.enLigne.jouer({ k: 'derush', o: { source: v.o.source, index: v.o.index } });
      store.choixRiviere = null; store.moitieChoisie = null;
      store.enLigne.jouer({ k: 'poser', c: partiel });
      return;
    }
    store.undo = JSON.stringify(st);
    // Le tour se joue d'un seul geste : la carte quitte la rivière et se pose
    // dans le banc.
    if (st.phase === 'DERUSHAGE' && store.choixRiviere) {
      apresCoup(st, await jouerTour(st, st.courant, store.choixRiviere.o, partiel));
      return;
    }
    const carte = st.mains[st.courant][0];
    poserAVue(st, st.courant, { ...partiel, carte });
    apresCoup(st, avancer(st));
  }));
}

function sansCarte(c) {
  const { carte, ...reste } = c;
  return reste;
}

function etiquetteCoup(c) {
  // Une nouvelle séquence ne s'insère pas : elle s'empile. L'étiquette dit de
  // quel côté de la pile elle ira.
  if (c.action === 'NOUVELLE_SEQUENCE') return c.pos === 0 ? '▲ nouvelle séquence' : '▼ nouvelle séquence';
  // Un Plan Large qui entre dans une séquence passe par le Raccord qui en fait
  // charnière : l'emplacement le dit.
  return c.moitie === 'PL'
    ? (c.cote === 'gauche' ? '⛓ ◀' : '⛓ ▶')
    : (c.cote === 'gauche' ? '◀' : '▶');
}

// --- Mise en place : la carte de départ --------------------------------------

function zoneDepart(st, p, humaine = true) {
  const options = choixDepart(st, p);
  // La table est déjà là pendant qu'on choisit son Plan de départ : on voit ce
  // qui attend au premier tour, et l'on choisit en connaissance de cause.
  const corps = options.length
    ? `<p class="aide depart-consigne">Votre <b>carte de départ</b> porte un plan sur chaque face :
        choisissez celui qui ouvre votre banc.</p>
      <div class="main-cartes depart-faces">
        ${options.map((o, k) => `<div class="item">
          <div class="carte solo ${humaine ? 'clickable' : ''}" data-depart="${k}">${renderPlan(o.plan)}</div>
          <div class="depart-face">${o.face === 0 ? 'une face' : 'l’autre face'}</div>
        </div>`).join('')}
      </div>`
    : `<div class="depart-attente aide">Votre Plan de départ est posé.
        On attend les autres joueuses.</div>`;
  return `${corps}
  <div class="riviere-apercu">${zoneTable(st, humaine, true)}</div>`;
}

/**
 * Ce que la joueuse vise en ce moment : la carte et la moitié retenue, qu'elle
 * vienne de la rivière — le tour ordinaire, où l'on prend et l'on monte du même
 * geste — ou de sa main.
 */
function viseeCourante(st, p) {
  if (st.phase === 'DERUSHAGE' && store.choixRiviere) {
    const carte = carteOption(st, store.choixRiviere.o);
    return carte ? { carte, moitie: store.choixRiviere.moitie, o: store.choixRiviere.o } : null;
  }
  if (st.phase === 'MONTAGE' && store.moitieChoisie) {
    const carte = st.mains[p][0];
    return carte ? { carte, moitie: store.moitieChoisie, o: null } : null;
  }
  return null;
}

// --- La table : la pioche, la rivière, le Chutier ------------------------------

const enc = (o) => encodeURIComponent(JSON.stringify(o.source === 'CHUTIER'
  ? { source: 'CHUTIER' } : { source: o.source, index: o.index }));

/** Deux options désignent-elles la même carte de la table ? */
const memeOption = (a, b) => !!a && !!b && a.source === b.source
  && (a.source === 'CHUTIER' || a.index === b.index);

/** La carte que désigne une option, telle qu'elle est. */
function carteOption(st, o) {
  if (!o) return null;
  if (o.source === 'CHUTIER') return sommetChutier(st);
  return st.riviere[o.index] || null;
}

/**
 * La pioche, la rivière et le Chutier. `apercu` les montre sans qu'on puisse y
 * toucher — pendant le choix du Plan de départ, la table est déjà là pour être
 * lue, pas encore pour être jouée.
 */
function zoneTable(st, humaine = true, apercu = false) {
  const p = st.courant;
  // Tout ce que la joueuse voit, y compris ce qu'elle ne peut pas monter : une
  // carte sans emplacement reste là, éteinte, avec sa raison.
  const offertes = apercu ? st.riviere.map((c, i) => ({ source: 'RIVIERE', index: i, carte: c }))
    : cartesOffertes(st, p);
  const actif = !apercu && humaine;
  const defausse = actif && peutDefausser(st, p);
  const viseDe = (o) => (actif && store.choixRiviere && memeOption(store.choixRiviere.o, o)
    ? store.choixRiviere.moitie : null);

  const uneCarte = (o) => {
    const m = viseDe(o);
    const off = !apercu && !!o.bloquee;
    const prise = apercu || off ? '' : ` data-derush="${enc(o)}"`;
    return `<div class="riviere-carte ${off ? 'bloquee' : ''}"${prise}${off ? ` title="${o.raison}"` : ''}>
      ${renderCarte(o.carte, { clickable: actif && !off, moitiesChoisissables: actif && !off, moitieChoisie: m })}
    </div>`;
  };

  const cases = offertes.filter((o) => o.source === 'RIVIERE').map((o) => `
    <div class="riviere-case ${viseDe(o) ? 'visee' : ''}" data-riviere="${o.index}">
      ${uneCarte(o)}
      ${defausse ? `<button class="pill mini defausser" data-defausser="${o.index}"
        title="Défausser cette carte au Chutier — une fois par tour, avant de choisir. La rivière se recomplète.">✕ au Chutier</button>` : ''}
    </div>`).join('');

  // Le Chutier montre sa carte du dessus. Elle ne se prend que si le banc de
  // la joueuse porte le pouvoir qui l'y autorise.
  const dessus = sommetChutier(st);
  const oChutier = offertes.find((o) => o.source === 'CHUTIER');
  const chutier = !dessus
    ? '<div class="carte-vide chutier-vide"><span>vide</span></div>'
    : oChutier
      ? `<div class="riviere-case ${viseDe(oChutier) ? 'visee' : ''}">${uneCarte(oChutier)}</div>`
      : `<div class="riviere-carte">${renderCarte(dessus, {})}</div>`;

  const nb = (n) => `${n} carte${n > 1 ? 's' : ''}`;
  return `<div class="table-cartes ${apercu ? 'apercu' : ''}">
    <div class="tc-colonne">
      <div class="tc-bloc">
        <h3>Pioche<span class="pioche-reste ${st.pioche.length ? '' : 'pioche-vide'}">${st.pioche.length ? nb(st.pioche.length) : 'vide'}</span></h3>
        <div class="pioche-place" id="pioche">${st.pioche.length
    ? enPile(renderDos('La pioche — face cachée'), st.pioche.length)
    : '<div class="carte-vide"><span>vide</span></div>'}</div>
      </div>
      <div class="tc-bloc ${oChutier ? 'ouvert' : ''}">
        <h3>Chutier${st.chutier.length ? `<span class="pioche-reste">${nb(st.chutier.length)}</span>` : ''}</h3>
        <div class="chutier-place" id="chutier">${chutier}</div>
        ${oChutier && !oChutier.bloquee && actif ? '<span class="chutier-droit">votre pouvoir : vous pouvez la prendre</span>' : ''}
      </div>
    </div>
    <div class="tc-riviere">
      <h3>Rivière${apercu ? '' : `<span class="raison">${
    st.cfg.defausse === false ? '' : st.defausseFaite ? 'défausse faite ce tour-ci' : 'une défausse possible avant de choisir'}</span>`}</h3>
      <div class="riviere-cartes" style="--n:${Math.max(1, st.riviere.length, tailleRiviere(st.cfg))}">
        ${cases || '<div class="aide" style="align-self:center">La rivière est vide.</div>'}
      </div>
      ${apercu ? '' : `<p class="aide" id="aide-table">${aideTable(st, humaine)}</p>`}
    </div>
  </div>`;
}

/**
 * La ligne sous la rivière. La table se lit d'elle-même : on ne dit que ce
 * qu'elle ne montre pas — ce que vient de faire la joueuse précédente, la
 * moitié visée qui n'a pas de place, l'impasse.
 */
function aideTable(st, humaine) {
  const p = st.courant;
  const nom = st.joueurs[p].nom;
  if (!humaine) return `<b>${nom}</b> joue…${dernierFait(st)}`;
  if (!optionsDerushage(st).length) {
    return `Aucune de ces cartes ne peut se monter dans votre banc.
      ${peutDefausser(st, p) ? 'Défaussez-en une pour en faire venir une autre, ou passez. ' : ''}
      <button class="pill mini" data-passer="1">Passer mon tour</button>`;
  }
  const v = store.choixRiviere;
  if (v) {
    const carte = carteOption(st, v.o);
    if (carte && !coupsPossibles(st, p, carte).some((c) => c.moitie === v.moitie)) {
      return pourquoiPasIci(st, p, carte, v.moitie);
    }
    return 'Cliquez un emplacement de votre banc.';
  }
  return `À vous — cliquez la <b>moitié</b> que vous voulez monter, puis son emplacement.${dernierFait(st)}`;
}

/**
 * Pourquoi cette moitié-là — ou ce Plan Large — n'a pas d'emplacement. Deux
 * raisons possibles, et l'on dit la bonne : le bout visé est un Raccord, qui
 * n'accepte qu'un Plan Large, ou ce côté du centre porte déjà toutes ses cartes.
 */
function pourquoiPasIci(st, p, carte, moitie) {
  const cfg = st.cfg;
  const banc = st.bancs[p];
  const seqs = banc.sequences;
  if (carte.type !== 'DOUBLE') {
    return `Ce Plan Large n’a pas d’emplacement : votre banc a déjà ses ${limiteSequences(cfg, banc)}
      séquences, et aucune ne se termine par un Raccord qui lui laisse une place.`;
  }
  const cote = moitie === 'G' ? 'gauche' : 'droite';
  const bout = (q) => (cote === 'gauche' ? q[0] : q[q.length - 1]);
  const plan = moitiesDe(carte)[moitie];
  const parRaccord = seqs.filter((q) => bout(q) && bout(q).transition === 'RACCORD'
    && (cfg.raccordAppellePL !== false || (plan && plan.transition === 'RACCORD'))).length;
  const pleines = seqs.filter((q) => !placeDuCote(cfg, q, cote)).length;
  const une = seqs.length === 1;
  const debut = `La moitié <b>${cote}</b> ne se monte qu’au bout <b>${cote === 'gauche' ? 'gauche' : 'droit'}</b>
    d’une séquence`;
  const regle = plan && plan.transition === 'RACCORD' && cfg.raccordAppellePL === false
    ? 'deux Raccords ne se suivent pas' : 'après un Raccord, seul un <b>Plan Large</b> peut se monter';
  let raison;
  if (parRaccord && !pleines) {
    raison = `${une ? 'et le vôtre est' : 'et chacun des vôtres est'} un <b>Raccord</b> : ${regle}`;
  } else if (pleines && !parRaccord) {
    raison = `${une ? 'et votre séquence a' : 'et vos séquences ont'} déjà
      ${cfg.plansParCote} cartes à ${cote} du centre`;
  } else {
    raison = `: ${parRaccord > 1 ? `${parRaccord} se terminent` : 'l’une se termine'} par un <b>Raccord</b> —
      ${regle} —, ${pleines > 1 ? `${pleines} ont` : 'l’autre a'} déjà ses ${cfg.plansParCote} cartes de ce côté`;
  }
  return `${debut} ${raison}. Gardez plutôt l’autre moitié.`;
}

/** Ce que la table vient de voir, en une ligne : le dernier fait du journal. */
function dernierFait(st) {
  const j = st.journal[st.journal.length - 1];
  return j && j.joueur !== null && j.joueur !== st.courant
    ? ` <span class="dernier-fait">${j.texte}.</span>` : '';
}

// --- La carte en main ---------------------------------------------------------

/** Le texte sous la carte en main, seul élément qui suit le choix de la moitié. */
function aideMontage(st, choisie, humaine = true) {
  const carte = st.mains[st.courant][0];
  if (!carte) return '';
  if (!humaine) return `<b>${st.joueurs[st.courant].nom}</b> monte sa carte.`;
  if (carte.type !== 'DOUBLE') return 'Cliquez un emplacement de votre banc.';
  if (!choisie) return 'Cliquez la moitié que vous voulez monter : la gauche va à gauche d’une séquence, la droite à droite.';
  if (!coupsPossibles(st, st.courant).some((c) => c.moitie === choisie)) {
    return pourquoiPasIci(st, st.courant, carte, choisie);
  }
  return 'Cliquez un emplacement de votre banc.';
}

function zoneMontage(st, p, humaine = true) {
  const carte = st.mains[p][0];
  if (!carte) return '<div class="zone-montage"><p class="aide">Aucune carte en main.</p></div>';
  // Un Plan Large n'a pas de moitié à choisir.
  if (carte.type !== 'DOUBLE') store.moitieChoisie = 'PL';
  const choisie = carte.type !== 'DOUBLE' ? 'PL'
    : (store.moitieChoisie === 'G' || store.moitieChoisie === 'D' ? store.moitieChoisie : null);
  return `<div class="zone-montage">
    <div id="choix-carte">${renderCarte(carte, { moitiesChoisissables: humaine && carte.type === 'DOUBLE', moitieChoisie: choisie })}</div>
    <p class="aide" id="aide-montage">${aideMontage(st, choisie, humaine)}</p>
  </div>`;
}

// --- Panneaux de score -----------------------------------------------------

function tableauScore(s) {
  const lignes = Object.entries(s.detail).filter(([, v]) => v !== 0);
  return `<table class="tableau-score">
    ${lignes.map(([k, v]) => `<tr><td>${SOURCES_LABEL[k]}</td><td>${v > 0 ? '+' : ''}${v}</td></tr>`).join('')
      || '<tr><td class="aide">Aucun point pour l’instant</td><td>0</td></tr>'}
    <tr class="total"><td>Total</td><td>${s.total}</td></tr>
  </table>`;
}

/**
 * Les pouvoirs identiques d'un même banc, réunis en une ligne : autant les
 * compter une fois, avec leur nombre et leur somme. Deux pouvoirs sont
 * identiques quand ils ont la même forme **et** la même valeur.
 */
function grouperPouvoirs(lignes) {
  const par = new Map();
  for (const l of lignes) {
    const cle = `${signatureObj(l.obj)}|${l.obj.n}`;
    const e = par.get(cle);
    if (e) { e.n++; e.pts += l.pts; }
    else par.set(cle, { obj: l.obj, n: 1, pts: l.pts });
  }
  return [...par.values()];
}

/** « ×6 » quand un pouvoir est posé plusieurs fois. */
const jetonNombre = (n) => (n > 1 ? `<span class="grp-n" title="${n} fois sur le banc">×${n}</span>` : '');

/**
 * Le score du banc, pouvoir par pouvoir : chacun avec ses icônes et ce qu'il
 * rapporte, puis le total. La colonne dit d'où vient chaque point.
 */
function listePouvoirs(s) {
  const hors = ['POSE'].filter((k) => s.detail[k]);
  if (!s.lignes.length && !hors.length) {
    return `<table class="tableau-score">
      <tr><td class="aide">Aucun pouvoir sur le banc</td><td>0</td></tr>
      <tr class="total"><td>Total</td><td>${s.total}</td></tr>
    </table>`;
  }
  // Du plus gros au plus petit : on veut voir d'abord ce qui rapporte.
  const rangs = grouperPouvoirs(s.lignes).slice().sort((a, b) => b.pts - a.pts);
  return `<table class="tableau-score">
    ${rangs.map((g) => `<tr>
      <td>${objHTML(g.obj)}${jetonNombre(g.n)}</td>
      <td title="${objLabel(g.obj)}${g.n > 1 ? ` — ${g.n} fois` : ''}">${g.pts}</td>
    </tr>`).join('')}
    ${hors.slice().sort((a, b) => s.detail[b] - s.detail[a])
      .map((k) => `<tr><td class="hors-bandeau">${SOURCES_LABEL[k]}</td><td>${s.detail[k]}</td></tr>`).join('')}
    <tr class="total"><td>Total</td><td>${s.total}</td></tr>
  </table>`;
}

/** Le recensement des icônes du banc : ce que l'on compterait à la main. */
function blocRecensement(s) {
  const r = s.recensement;
  // On ne montre que ce que le banc porte : une icône absente ne se grise pas,
  // elle n'est pas là. La colonne dit ce qu'il y a, pas ce qu'il n'y a pas.
  const compte = (icone, n, titre) => (n
    ? `<span class="compte" title="${titre}">${icone}${n}</span>` : '');
  const rangee = (html, premiere) => (html.replace(/\s+/g, '')
    ? `<div class="recensement"${premiere ? '' : ' style="margin-top:8px"'}>${html}</div>` : '');
  const tout = rangee(ELEMENT_IDS.map((e) => compte(elIcon(e, 22), r.elements[e], ELEMENTS[e].label)).join(''), true)
    + rangee(['PL', 'GP', 'DEP'].map((f) => compte(cadrageIcon(f), r.cadrages[f], FORMATS[f].label)).join('')
      + compte(cadrageIcon('TR'), r.raccords, 'Raccords, Ouverture et Fin'))
    + rangee(compte(elIcon('MORT', 22), r.morts, 'Plans de mort')
      // Les plans sans aucun personnage : faute de symbole, le compte s'écrit
      // en toutes lettres.
      + compte('<span class="compte-mot">sans perso.</span>', r.sansPersonnage,
        'Plans sans aucun personnage'));
  return tout || '<p class="aide">Rien encore sur le banc</p>';
}

// --- Interactions ----------------------------------------------------------

function brancherPartie(st, humaine) {
  const q = (s) => app.querySelector(s);
  const enLigne = () => !!(store.enLigne && store.enLigne.partie);

  const partir = app.querySelector('#ligne-partir');
  if (partir) partir.addEventListener('click', () => {
    if (store.enLigne) store.enLigne.quitter();
    location.hash = '#/enligne';
  });
  // Le nom d'un autre banc le replie, ou le rouvre.
  app.querySelectorAll('[data-replier]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.replier;
    if (store.bancsReplies.has(i)) store.bancsReplies.delete(i); else store.bancsReplies.add(i);
    vuePartie(false);
  }));

  // La zone garde la même forme pendant les tours d'IA : les clics, eux, sont
  // réservés à la joueuse humaine.
  if (humaine) {
    app.querySelectorAll('[data-depart]').forEach((el) => el.addEventListener('click', () => {
      const k = +el.dataset.depart;
      if (enLigne()) { store.enLigne.jouer({ k: 'depart', i: k }); return; }
      store.undo = JSON.stringify(st);
      poserDepartAVue(st, st.courant, k, choixDepart(st, st.courant)[k]);
      apresCoup(st, avancer(st));
    }));

    // Viser une moitié ne joue rien : cela désigne ce que l'on veut monter, et
    // le banc montre aussitôt où. C'est le clic sur l'emplacement qui joue le
    // tour, d'un seul geste. Un Plan Large se vise d'un clic sur la carte.
    app.querySelectorAll('[data-derush] .moitie[data-moitie]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const hote = el.closest('[data-derush]');
        viser(st, JSON.parse(decodeURIComponent(hote.dataset.derush)), el.dataset.moitie);
      });
    });

    // Défausser une carte de la rivière au Chutier : une fois, avant de choisir.
    app.querySelectorAll('[data-defausser]').forEach((el) => el.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const i = +el.dataset.defausser;
      store.choixRiviere = null;
      if (enLigne()) { store.enLigne.jouer({ k: 'defausse', i }); return; }
      store.undo = JSON.stringify(st);
      defausserAVue(st, st.courant, i);
      vuePartie(false);
      await jouerVols();
    }));

    // Rien ne peut être monté : on passe.
    const bPasser = q('[data-passer]');
    if (bPasser) bPasser.addEventListener('click', () => {
      store.choixRiviere = null;
      if (enLigne()) { store.enLigne.jouer({ k: 'passe' }); return; }
      store.undo = JSON.stringify(st);
      passer(st, st.courant);
      apresCoup(st, st.finie);
    });

    // Le choix de la moitié de la carte en main.
    app.querySelectorAll('#choix-carte .carte.choix-moitie .moitie[data-moitie]').forEach((el) => {
      el.addEventListener('click', () => choisirMoitie(st, el.dataset.moitie));
    });

    brancherFentes(st);
  }

  // Épingler un banc ne touche pas à la partie : on repeint la seule colonne.
  const majColonnes = () => {
    const c = q('#colonnes-joueur');
    if (!c) return vuePartie(false);
    const sc = scores(st);
    const vu = store.joueurVu !== null && st.joueurs[store.joueurVu] ? store.joueurVu : st.courant;
    c.innerHTML = colonnesJoueur(st, sc, vu);
    app.querySelectorAll('[data-joueur]').forEach((el) => {
      el.classList.toggle('vu', +el.dataset.joueur === vu);
    });
    const b = q('#suivre-tour');
    if (b) b.addEventListener('click', () => { store.joueurVu = null; majColonnes(); });
    brancherApercu(c);
  };
  app.querySelectorAll('[data-joueur]').forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.joueur;
    store.joueurVu = i === st.courant && store.joueurVu === null ? null : i;
    majColonnes();
  }));
  const bSuivre = q('#suivre-tour');
  if (bSuivre) bSuivre.addEventListener('click', () => { store.joueurVu = null; majColonnes(); });

  const bp = q('#bascule-points');
  if (bp) bp.addEventListener('click', () => {
    store.cfg.pointsSurCartes = store.cfg.pointsSurCartes === false;
    sauverCfg(); vuePartie(false);
  });
  const ba = q('#bascule-apercu');
  if (ba) ba.addEventListener('click', () => {
    store.cfg.apercuSurvol = !store.cfg.apercuSurvol;
    boiteApercu().classList.remove('visible');
    sauverCfg(); vuePartie(false);
  });
  brancherApercu();

  // Revenir en arrière ou quitter coupe le fil des IA et rappelle les cartes
  // en vol : rien de la partie annulée ne doit se poser après coup.
  if (q('#undo')) q('#undo').addEventListener('click', () => {
    if (!store.undo) return;
    store.filIA++; store.vols = []; stopperVols();
    store.partie = JSON.parse(store.undo); store.undo = null;
    store.moitieChoisie = null; store.choixRiviere = null;
    vuePartie();
  });
  if (q('#quitter')) q('#quitter').addEventListener('click', () => {
    if (!confirm('Quitter la partie en cours ?')) return;
    store.filIA++; store.vols = []; stopperVols();
    store.partie = null; location.hash = '#/';
  });

  // Échap annule la visée.
  document.onkeydown = humaine ? (e) => {
    if (e.key !== 'Escape') return;
    if (st.phase === 'DERUSHAGE' && store.choixRiviere) { store.choixRiviere = null; rafraichirVisee(st); }
    const carte = st.mains[st.courant] && st.mains[st.courant][0];
    if (st.phase === 'MONTAGE' && store.moitieChoisie && carte && carte.type === 'DOUBLE') {
      choisirMoitie(st, store.moitieChoisie);
    }
  } : null;
}

// ---------------------------------------------------------------------------
// Aperçu au survol
// ---------------------------------------------------------------------------
// Sur la table, une carte est petite. Le survol la montre en grand — la vraie
// carte, telle que livrée — dans un panneau flottant unique qui suit le
// curseur, et dit dessous ce qu'elle rapporte là où elle est montée.

let apercuEl = null;

function boiteApercu() {
  if (!apercuEl) {
    apercuEl = document.createElement('div');
    apercuEl.id = 'apercu-carte';
    document.body.appendChild(apercuEl);
  }
  return apercuEl;
}

/**
 * Le calcul d'un pouvoir, en clair : ce qu'il a trouvé, et ce que cela lui
 * rapporte. Ce qu'un pouvoir compte dépend de sa portée : les flèches la
 * disent, le libellé la dit en toutes lettres.
 */
function compteObj(o, pts) {
  if (pts === undefined || pts === null) return '';
  const lg = objLabel(o, store.cfg);
  // Un pouvoir de règle ne rapporte rien là où il est : il n'y a pas de compte
  // à expliquer, seulement un droit à rappeler.
  if (estRegle(o)) {
    return `<span class="ap-calc" title="${lg}">actif tant que la carte est dans votre montage</span>`;
  }
  if (estSi(o)) {
    return `<span class="ap-calc" title="${lg}">${pts ? 'obtenu' : 'non obtenu'}
      <b>${pts}</b> pt${Math.abs(pts) > 1 ? 's' : ''}</span>`;
  }
  const n = o.n;
  const trouve = n ? pts / n : 0;
  // Si le compte ne retombe pas juste — un multiplicateur de partie, par
  // exemple —, on s'en tient au résultat plutôt que d'inventer une explication.
  if (!Number.isInteger(trouve)) return `<span class="ap-calc" title="${lg}"><b>${pts}</b> pts</span>`;
  return `<span class="ap-calc" title="${lg}">${trouve} trouvé${trouve > 1 ? 's' : ''} × ${n}
    = <b>${pts}</b> pt${Math.abs(pts) > 1 ? 's' : ''}</span>`;
}

function contenuApercu(d) {
  const cadrage = d.transition ? 'Raccord' : (FORMATS[d.format]?.label || d.format);
  // La vraie carte, en grand ; dessous, ce que ses pouvoirs rapportent ici.
  if (d.visuel) {
    const montee = d.points !== null && d.points !== undefined;
    return `<img class="ap-carte ${d.format === 'GP' ? 'ap-gp' : 'ap-pl'}" src="${d.visuel}" alt="${cadrage} ${d.num}">
    ${montee && (d.objs || []).length ? `<div class="ap-obj">
      ${d.objs.map((o, i) => `<div class="ap-obj-visuel">
        ${objHTML(o, 36, store.cfg)}${compteObj(o, (d.objsPts || [])[i])}
      </div>`).join('')}
    </div>` : ''}
    ${(d.objsImprimes || []).length ? `<div class="ap-remplace">
      Son pouvoir imprimé est <b>bonifié</b> : une carte de votre montage dit ce que les Raccords rapportent.
    </div>` : ''}
    ${montee ? `<div class="ap-points">
      Cette carte rapporte <b>${d.points}</b> point${Math.abs(d.points) > 1 ? 's' : ''} dans ce montage
    </div>` : ''}`;
  }
  return `
    <div class="ap-tete">
      <span class="ap-tc ${teinteTc(d.tc)}">${tc(d.tc)}</span>
      <span class="ap-cadrage">${cadrage} <b>n°${d.num}</b></span>
    </div>
    ${(() => {
      const ic = d.mort ? [...d.el, 'MORT'] : d.el;
      return ic.length ? `<div class="ap-icones">
        ${ic.map((e) => `<span class="ap-icone">${elIcon(e, 54)}<span>${e === 'MORT' ? 'Mort' : (ELEMENTS[e]?.label || e)}</span></span>`).join('')}
      </div>` : '<div class="ap-vide">Aucune icône</div>';
    })()}
    ${(d.objs || []).length ? `<div class="ap-obj">
      ${d.objs.map((o, i) => `<div class="ap-obj-visuel">
        ${objHTML(o, 44, store.cfg)}${compteObj(o, (d.objsPts || [])[i])}
      </div>`).join('')}
    </div>` : '<div class="ap-vide">Aucun pouvoir</div>'}
    ${(d.objsImprimes || []).length ? `<div class="ap-remplace">
      Son pouvoir imprimé — ${d.objsImprimes.map((o) => objLabel(o, store.cfg)).join(' et ')} —
      est <b>bonifié</b> : une carte de votre montage dit ce que les Raccords rapportent.
    </div>` : ''}
    ${d.points === null || d.points === undefined ? '' : `<div class="ap-points">
      Cette carte rapporte <b>${d.points}</b> point${Math.abs(d.points) > 1 ? 's' : ''} dans ce montage
    </div>`}`;
}

function placerApercu(e) {
  const b = boiteApercu();
  const m = 16;
  const r = b.getBoundingClientRect();
  let x = e.clientX + m;
  let y = e.clientY + m;
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - m;
  if (y + r.height > window.innerHeight - 8) y = Math.max(8, e.clientY - r.height - m);
  b.style.left = `${Math.max(8, x)}px`;
  b.style.top = `${y}px`;
}

function brancherApercu(racine = app) {
  // L'infobulle ne s'ouvre que si on l'a demandée : le bouton « Pop-up au
  // survol » l'allume.
  if (!store.cfg.apercuSurvol) return;
  racine.querySelectorAll('[data-apercu]').forEach((el) => {
    el.addEventListener('mouseenter', (e) => {
      const b = boiteApercu();
      b.innerHTML = contenuApercu(JSON.parse(decodeURIComponent(el.dataset.apercu)));
      b.classList.add('visible');
      placerApercu(e);
    });
    el.addEventListener('mousemove', placerApercu);
    el.addEventListener('mouseleave', () => boiteApercu().classList.remove('visible'));
  });
}

// ---------------------------------------------------------------------------
// Les tours d'IA
// ---------------------------------------------------------------------------
// Le fil de la partie
// ---------------------------------------------------------------------------
// Les joueuses jouent l'une après l'autre, et cela se voit : un coup, un rendu,
// la carte qui vole de la rivière jusqu'au banc, une pause, la suivante. La
// table ne change pas de forme entre deux coups — seules les cartes bougent.
//
// Le fil est un jeton : `store.filIA` est incrémenté à chaque nouveau départ,
// ce qui périme silencieusement le fil précédent. Annuler, quitter ou relancer
// une partie ne laisse donc jamais un coup en attente se jouer par surprise.

function estHumaine(st) {
  return st.joueurs[st.courant].type === 'HUMAIN';
}

const anime = () => store.cfg.animerCoups !== false;
const dureeVol = () => (anime() ? Math.max(0, store.cfg.dureeVol ?? 360) : 0);
const pause = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms || 0)));

/** Relève une carte avant que l'état ne change. */
const preleve = (source) => (anime() ? releve(app.querySelector(source)) : null);

/** Programme le vol d'un relevé vers un élément que le rendu fera paraître. */
function programmerVol(dep, arrivee, opts) {
  if (dep) store.vols.push({ dep, arrivee, opts: opts || {} });
}

/**
 * Relève et programme d'un geste, quand la destination est connue d'avance.
 * Sans animation, rien n'est relevé : le coup se voit simplement d'un rendu à
 * l'autre.
 */
function volDepuis(source, arrivee, opts) {
  programmerVol(preleve(source), arrivee, opts);
}

/**
 * Fait voler les cartes relevées avant le rendu. Elles partent ensemble : la
 * carte prise quitte la rivière pendant que la pioche l'y remplace, ce qui se
 * lit comme un seul mouvement. Le temps du vol, la table ne se laisse pas
 * cliquer — un clic la repeindrait sous la carte.
 */
async function jouerVols() {
  const liste = store.vols;
  store.vols = [];
  if (!liste.length) return;
  document.body.classList.add('coup-en-vol');
  // La page ne bouge jamais d'elle-même : on regarde la carte se déplacer, pas
  // l'écran défiler. Un coup joué sur un banc hors de vue se lit à son résultat
  // — le vol n'a pas à venir chercher le regard en déplaçant la table sous lui.
  await Promise.all(liste.map((v) => {
    const cible = app.querySelector(v.arrivee);
    return cible ? voler(v.dep, cible, dureeVol(), v.opts) : Promise.resolve();
  }));
  document.body.classList.remove('coup-en-vol');
}

// --- Les coups, joués à vue ---------------------------------------------------

/** Le Plan de départ quitte la main et ouvre le banc. */
function poserDepartAVue(st, p, k, choix) {
  volDepuis(`[data-depart="${k}"] .moitie`, `[data-banc="${p}"] .moitie.neuf`);
  poserDepart(st, p, choix);
}

/** Une carte de la rivière part au Chutier, la pioche la remplace. */
function defausserAVue(st, p, i) {
  const carte = preleve(`[data-riviere="${i}"] .carte`);
  const pioche = st.pioche.length ? preleve('#pioche .carte') : null;
  defausser(st, p, i);
  programmerVol(carte, '#chutier');
  programmerVol(pioche, `[data-riviere="${i}"] .carte`);
}

/** Où la carte va être prise, et où la pioche la remplacera. */
function ancresPrise(st, o) {
  const sel = `[data-derush="${enc(o)}"]`;
  // Chaque moitié est relevée à part : c'est celle que l'on garde qui vole
  // jusqu'au banc.
  const moities = {};
  for (const m of ['G', 'D', 'PL']) moities[m] = preleve(`${sel} .moitie[data-moitie="${m}"]`);
  const deLaRiviere = o.source !== 'CHUTIER';
  return {
    carte: preleve(`${sel} .carte`),
    moities,
    pioche: deLaRiviere && st.pioche.length ? preleve('#pioche .carte') : null,
    // La remplaçante se pose là où était la carte prise.
    place: deLaRiviere ? `[data-riviere="${o.index}"] .carte` : null,
  };
}

/**
 * Un tour, d'un seul geste : la carte visée quitte la rivière — ou le Chutier —
 * et se pose dans le banc, la pioche recharge la place laissée vide. Rend true
 * si la partie s'achève.
 */
function jouerPrise(st, p, o, choisir) {
  const a = ancresPrise(st, o);
  derusher(st, p, o);
  store.choixRiviere = null;
  store.moitieChoisie = null;
  let fini = avancer(st);

  let moitie = null;
  if (!fini && st.phase === 'MONTAGE' && st.courant === p) {
    const coups = coupsPossibles(st, p);
    const coup = coups.length ? (choisir(coups) || coups[0]) : null;
    if (coup) { poser(st, p, coup); moitie = coup.moitie; } else ecarterMain(st, p);
    fini = avancer(st);
  }

  programmerVol(moitie ? (a.moities[moitie] || a.carte) : a.carte,
    moitie ? `[data-banc="${p}"] .moitie.neuf` : '#chutier',
    moitie ? {} : { taille: false, fondu: true });
  if (a.place) programmerVol(a.pioche, a.place);
  return fini;
}

/** Le tour d'une joueuse humaine : la carte visée, à l'emplacement cliqué. */
async function jouerTour(st, p, o, partiel) {
  const fini = jouerPrise(st, p, o, (coups) => coups.find((c) => c.moitie === partiel.moitie
    && c.action === partiel.action && c.pos === partiel.pos && c.seq === partiel.seq && c.cote === partiel.cote));
  vuePartie(false);
  await jouerVols();
  return fini;
}

/** La carte en main se pose dans le banc, à l'emplacement choisi. */
function poserAVue(st, p, coup) {
  volDepuis(`#choix-carte .moitie[data-moitie="${coup.moitie}"]`, `[data-banc="${p}"] .moitie.neuf`);
  poser(st, p, coup);
  store.moitieChoisie = null;
}

/** Joue le coup de l'IA courante. Renvoie true si la partie s'achève. */
async function coupIA(st) {
  if (!st || st.finie || estHumaine(st)) return false;
  const p = st.courant;

  if (st.phase === 'DEPART') {
    const d = choisirDepart(st, p) || choixDepart(st, p)[0];
    // Pas de vol : la carte de l'IA n'est pas à l'écran — c'est celle de la
    // joueuse qui REGARDE qu'on y montre.
    if (d) poserDepart(st, p, d);
    return avancer(st);
  }

  if (st.phase === 'DERUSHAGE') {
    // La défausse se voit : la carte part au Chutier, la rivière se
    // recomplète, puis l'IA choisit.
    const d = choisirDefausse(st, p);
    if (d !== null) {
      defausserAVue(st, p, d);
      vuePartie(false);
      await jouerVols();
      await pause(anime() ? store.cfg.vitesseIA : 0);
      if (store.partie !== st) return false;
    }
    const o = choisirDerushage(st, p);
    if (!o) { passer(st, p); return st.finie; }
    return jouerPrise(st, p, o, () => choisirCoup(st, p));
  }

  const coups = coupsPossibles(st, p);
  if (coups.length) poserAVue(st, p, choisirCoup(st, p) || coups[0]);
  else ecarterMain(st, p);
  return avancer(st);
}

/**
 * Déroule la partie jusqu'à ce qu'une humaine ait la main : d'abord les cartes
 * du coup que l'on vient de voir, puis, tant que c'est à une IA de jouer, son
 * coup, son rendu et ses cartes.
 */
async function derouler(st) {
  const jeton = ++store.filIA;
  const vivant = () => store.partie === st && jeton === store.filIA;
  await jouerVols();
  while (vivant() && !st.finie && !estHumaine(st)) {
    await pause(anime() ? store.cfg.vitesseIA : 0);
    if (!vivant()) return;
    const fini = await coupIA(st);
    if (!vivant()) return;
    if (fini) return terminer();
    vuePartie(false);
    await jouerVols();
  }
}

/** Suite d'un coup humain : la carte se pose, puis les IA enchaînent. */
function apresCoup(st, fini) {
  if (fini) return terminer();
  vuePartie();
}

function terminer() {
  const st = store.partie;
  store.vols = []; stopperVols();
  document.body.classList.remove('ia-joue', 'coup-en-vol');
  const cl = classement(st);
  store.historique.unshift({
    date: new Date().toISOString(),
    seed: st.seed,
    joueurs: st.joueurs.map((j) => ({ nom: j.nom, type: j.type, couleur: j.couleur })),
    scores: cl.map((c) => ({ nom: c.joueur.nom, total: c.total, plans: c.plans, sequences: c.sequences })),
    tours: Math.min(st.tour, st.cfg.tours),
  });
  store.historique = store.historique.slice(0, 60);
  LS.set('historique', store.historique);
  vueFin();
}

/**
 * La courbe des points, coup par coup. Chaque joueuse a sa ligne, dans sa
 * couleur : on y lit qui a mené, où l'écart s'est creusé, et ce que le dernier
 * plan a rapporté. Un SVG, sans dépendance.
 */
function courbeScores(st, cl) {
  const series = st.courbe || [];
  const long = Math.max(1, ...series.map((s) => s.length));
  const haut = Math.max(1, ...series.flat());
  if (long < 2) return '';

  const L = 900, H = 260, mg = { g: 44, d: 16, h: 16, b: 30 };
  const px = (i) => mg.g + (i / (long - 1)) * (L - mg.g - mg.d);
  const py = (v) => H - mg.b - (v / haut) * (H - mg.h - mg.b);

  // Des repères ronds plutôt que la valeur maximale exacte.
  const pas = haut <= 20 ? 5 : haut <= 60 ? 10 : haut <= 150 ? 25 : 50;
  const paliers = [];
  for (let v = 0; v <= haut; v += pas) paliers.push(v);

  const lignes = st.joueurs.map((j, i) => {
    const s = series[i] || [];
    if (s.length < 2) return '';
    const pts = s.map((v, k) => `${px(k).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    return `<polyline class="cbe-ligne" points="${pts}" stroke="${encreDe(j.couleur)}"></polyline>
      <circle class="cbe-fin" cx="${px(s.length - 1).toFixed(1)}" cy="${py(s[s.length - 1]).toFixed(1)}"
        r="4" fill="${encreDe(j.couleur)}"></circle>`;
  }).join('');

  return `<div class="panneau">
    <h2>La courbe des points</h2>
    <p class="aide">Le score de chaque joueuse après chacun de ses coups, du Plan de départ au
    dernier plan posé.</p>
    <div class="courbe-boite">
      <svg viewBox="0 0 ${L} ${H}" class="courbe" preserveAspectRatio="none" role="img"
        aria-label="Courbe des points par coup">
        ${paliers.map((v) => `<line class="cbe-grille" x1="${mg.g}" x2="${L - mg.d}"
          y1="${py(v).toFixed(1)}" y2="${py(v).toFixed(1)}"></line>
          <text class="cbe-lg" x="${mg.g - 8}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('')}
        ${Array.from({ length: long }, (_, k) => k).filter((k) => k === 0 || k === long - 1 || (k + 1) % 3 === 0)
          .map((k) => `<text class="cbe-lg" x="${px(k).toFixed(1)}" y="${H - 8}" text-anchor="middle">${k + 1}</text>`).join('')}
        ${lignes}
      </svg>
    </div>
    <div class="cbe-legende">${cl.map((c) => `<span class="cbe-item">
      <i style="background:${encreDe(c.joueur.couleur)}"></i>${c.joueur.nom} — <b>${c.total}</b>
    </span>`).join('')}</div>
  </div>`;
}

/** Ce que la partie a produit, au-delà du classement. */
function statsPartie(st, cl) {
  const tous = cl.flatMap((c) => c.lignes);
  // Le palmarès regroupe les pouvoirs identiques d'une même joueuse.
  const groupes = cl.flatMap((c) => grouperPouvoirs(c.lignes).map((g) => ({ ...g, nom: c.joueur.nom })));
  const parKind = {};
  for (const c of cl) for (const [k, v] of Object.entries(c.detail)) parKind[k] = (parKind[k] || 0) + v;
  const sources = Object.entries(parKind).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
  const totalPts = cl.reduce((s, c) => s + c.total, 0);
  const meilleur = tous.slice().sort((a, b) => b.pts - a.pts)[0];
  const cartes = cl.reduce((s, c) => s + c.cartes, 0);
  const duree = st.duree ? Math.round(st.duree / 1000) : 0;
  const ecart = cl.length > 1 ? cl[0].total - cl[cl.length - 1].total : 0;

  const cartouche = (v, l) => `<div class="pv-cartouche"><b>${v}</b><span>${l}</span></div>`;

  return `<div class="panneau">
    <h2>Statistiques de la partie</h2>
    <div class="pv-cartouches">
      ${cartouche(totalPts, 'points marqués en tout')}
      ${cartouche(cartes ? (totalPts / cartes).toFixed(2) : '0', 'points par carte posée')}
      ${cartouche(ecart, cl.length > 1 ? 'points d’écart, première à dernière' : 'points d’écart')}
      ${cartouche(cl.reduce((s, c) => s + c.cartesRaccord, 0), 'Raccords, Ouvertures et Fins montés')}
      ${cartouche(st.defausses || 0, 'cartes défaussées au Chutier')}
      ${cartouche(cl.reduce((s, c) => s + c.sequences, 0), 'séquences au total')}
      ${duree ? cartouche(`${Math.floor(duree / 60)}′${String(duree % 60).padStart(2, '0')}`, 'de partie') : ''}
    </div>

    <div class="grid2" style="margin-top:16px">
      <div>
        <h3>D’où viennent les points</h3>
        <table class="tbl tbl-pouvoirs">
          <thead><tr><th>Source</th><th class="num">Points</th><th>Part</th></tr></thead>
          <tbody>${sources.map(([k, v]) => `<tr>
            <td>${SOURCES_LABEL[k] || k}</td><td class="num"><b>${v}</b></td>
            <td>${barrePart(totalPts ? v / totalPts : 0)}<span class="pv-part">${(100 * v / (totalPts || 1)).toFixed(1)} %</span></td>
          </tr>`).join('') || '<tr><td colspan="3" class="aide">Aucun point marqué.</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <h3>Les pouvoirs qui ont le plus rapporté</h3>
        <table class="tbl tbl-pouvoirs">
          <thead><tr><th>Pouvoir</th><th>Chez</th><th class="num">Points</th></tr></thead>
          <tbody>${groupes.slice().sort((a, b) => b.pts - a.pts).slice(0, 8).map((g) => `<tr>
              <td class="pv-visuel">${objHTML(g.obj, 24, st.cfg)}${jetonNombre(g.n)}</td>
              <td>${g.nom}</td><td class="num"><b>${g.pts}</b></td>
            </tr>`).join('') || '<tr><td colspan="3" class="aide">Aucun pouvoir monté.</td></tr>'}</tbody>
        </table>
        ${meilleur ? `<p class="aide">Le meilleur pouvoir de la partie rapporte
          <b>${meilleur.pts} point${Math.abs(meilleur.pts) > 1 ? 's' : ''}</b> à lui seul.</p>` : ''}
      </div>
    </div>
  </div>`;
}

function vueFin() {
  // En ligne, la partie qui s'achève est celle du journal, pas la locale.
  const st = (store.enLigne && store.enLigne.partie) || store.partie;
  if (!st) { location.hash = store.enLigne ? '#/enligne' : '#/'; return; }
  const cl = classement(st);
  html(`${topbar('#/partie')}
  <div class="wrap large">
    <div class="hero"><h1 style="font-size:2.1rem;letter-spacing:.12em">FIN DU MONTAGE</h1>
      <div class="credits">${(() => {
    // À égalité de points, la victoire est partagée.
    const tete = cl.filter((c) => c.total === cl[0].total).map((c) => c.joueur.nom);
    return tete.length > 1
      ? `Égalité : ${tete.slice(0, -1).join(', ')} et ${tete[tete.length - 1]} partagent la victoire, à <b>${cl[0].total} points</b>.`
      : `${tete[0]} l’emporte avec <b>${cl[0].total} points</b>.`;
  })()}</div>
    </div>
    <div class="panneau">
      <h2>Classement</h2>
      <table class="tbl">
        <tr><th>#</th><th>Joueuse</th><th>Profil</th><th class="num">Plans</th><th class="num">Séquences</th><th class="num" title="Raccords, Ouvertures et Fins montés — des plans comme les autres, comptés aussi à part">Raccords…</th><th class="num">Score</th></tr>
        ${cl.map((c, i) => `<tr>
          <td>${i + 1}</td>
          <td><span class="point-couleur" style="background:${c.joueur.couleur};display:inline-block;margin-right:6px"></span>${c.joueur.nom}</td>
          <td>${c.joueur.type === 'HUMAIN' ? 'Humaine' : PROFILS_IA[c.joueur.type].label}</td>
          <td class="num">${c.plans}</td><td class="num">${c.sequences}</td><td class="num">${c.cartesRaccord}</td>
          <td class="num"><b>${c.total}</b></td>
        </tr>`).join('')}
      </table>
    </div>
    ${courbeScores(st, cl)}
    ${statsPartie(st, cl)}
    <div class="grid2">
      ${cl.map((c) => `<div class="panneau"><h2>Détail — ${c.joueur.nom}</h2>${listePouvoirs(c)}</div>`).join('')}
    </div>
    <div class="panneau">
      <h2>Les bancs de montage</h2>
      ${/* Le même banc qu'en jeu, rendu par la même fonction : les points de
            chaque plan y sont, au coin des cartes — c'est le moment de les lire. */
        st.joueurs.map((j, i) => `<h3>${j.nom}</h3>
        <div class="banc-fin">${bancBloc(st, i, null, false)}</div>`).join('')}
    </div>
    <div class="rangee-boutons">
      <button class="cta" style="max-width:320px" id="rejouer">Rejouer</button>
      <button class="pill" data-go="#/">Accueil</button>
      <button class="pill" data-go="#/historique">Historique</button>
    </div>
  </div>
  ${pied()}`);
  brancherApercu();
  app.querySelector('#rejouer').addEventListener('click', lancerPartie);
}

// ===========================================================================
// MATÉRIEL
// ===========================================================================

// L'écran Matériel est aussi l'éditeur du matériel. Deux jeux coexistent en
// permanence — la BOÎTE, intouchable : les cartes telles que l'auteur les a
// livrées et ce que le site en a lu —, et le MODIFIÉ, qui porte les retouches ;
// un sélecteur dit lequel se joue, et rien n'est jamais détruit.
//
// Un plan se désigne par sa clé : « GP13 » pour un Gros Plan, « 5 » pour un
// Plan Large ou un Plan de départ. Une carte à deux Gros Plans en porte un à
// GAUCHE et un à DROITE : c'est l'assemblage, qui se règle ici aussi.

const mat = {
  vue: 'CARTES',        // CARTES | GP | PL | DEPART | TOUS | ASSEMBLAGE | TABLE | STATS | POUVOIRS
  tri: 'num',
  filtres: { icone: '', pouvoir: '', tcMin: '', tcMax: '', etat: '', actif: '', famille: '' },
  statsFiltres: { format: '', icone: '', pouvoir: '' },
  plans: new Set(),     // clés des plans sélectionnés — survit au changement de vue
  cartes: new Set(),    // identifiants des cartes sélectionnées
  ancre: null,          // dernier clic, pour la sélection au shift
  ancreVue: null,       // et la vue où il a eu lieu
  // Le tri des trois tableaux de la vue des pouvoirs. `sens` vaut -1 pour
  // décroissant, 1 pour croissant.
  triPouvoirs: { col: 'plans', sens: -1 },
  triFamilles: { col: 'plans', sens: -1 },
  triValeurs: { col: 'valeur', sens: 1 },
  // L'assemblage : les contraintes cochées, le dernier rapport de mélange, le
  // Gros Plan qu'on tient depuis le relevé, la carte qu'on vient de créer et
  // ce qu'on peut encore défaire.
  assemblage: { contraintes: CONTRAINTES_PAR_DEFAUT.slice(), rapport: null, surligne: null,
    erreur: null, triCartes: 'CARTE', triMoities: 'NUM', neuve: null, annonce: null },
};

const VUES = [
  ['CARTES', 'Cartes à deux Gros Plans'], ['GP', 'Gros Plans'],
  ['PL', 'Plans Larges'], ['DEPART', 'Plans de départ'], ['TOUS', 'Tous les plans'],
  ['ASSEMBLAGE', 'Assemblage'],
  ['TABLE', 'Tableau complet'], ['STATS', 'Statistiques'], ['POUVOIRS', 'Statistiques des pouvoirs'],
];

const VUES_GALERIE = ['CARTES', 'GP', 'PL', 'DEPART', 'TOUS'];

/** Ce qu'un Gros Plan est quand il ne raconte rien : il relie, ou il encadre le film. */
const NOMS_TRANSITION = { RACCORD: 'Raccord', OUVERTURE: 'Ouverture', CREDITS: 'Fin' };

/** Le nom d'un plan, tel qu'on le lit sur sa carte : « Gros Plan GP13 », « Raccord GP100 », « Plan Large L5 ». */
const titrePlan = (p) => `${NOMS_TRANSITION[p.transition] || FORMATS[p.format].label} ${etiquettePlan(p)}`;

/** « GP07 » — l'étiquette d'un Gros Plan, à partir de son seul numéro. */
const etiquetteGP = (num) => etiquettePlan({ format: 'GP', num });

// Ce que compte un pouvoir. Les libellés se lisent à la suite du « n × » :
// « 2 × par plan du cadrage — Plan Large ».
// Chaque pouvoir se nomme par **ce qu'il compte**, en capitales : on lit d'un
// coup d'œil ce que la valeur multiplie, et la liste se parcourt par ce mot-là
// plutôt que par une phrase.
const KINDS = [
  ['',        'aucun pouvoir'],
  ['FORMAT',  'par CADRAGE…'],
  ['ELEMENT', 'par ICONE…'],
  ['PAIRE',   'par 2 ou 3 ICONES…'],
  ['MORT',    'par MORT'],
  ['RACCORD', 'par RACCORD'],
  ['PLAN',    'par PLAN'],
  ['MINUTAGE', 'par MINUTAGE avant / après…'],
  ['ABSENT',  'si CIBLE absente…'],
  ['CHRONO',  'si DANS L’ORDRE'],
  ['SANS_TC', 'si AUCUN MINUTAGE…'],
  ['BOUT',    'si AUCUN PLAN à gauche / à droite de ce plan…'],
  // Les pouvoirs qui comptent des séquences plutôt que des plans : ils lisent
  // la forme du banc, pas son contenu carte par carte.
  ['SEQ_TAILLE',   'par SÉQUENCE de n plans ou plus / ou moins…'],
  ['SEQ_VOISINES', 'par SÉQUENCE au-dessus / en dessous…'],
  ['SEQ_LONGUE',   'par PLAN de la plus longue SÉQUENCE'],
  ['SEQ_AVEC',     'par SÉQUENCE avec / sans…'],
  ['SEQ_TOUTES',   'si CHAQUE SÉQUENCE a n plans…'],
  ['DANS_CHUTIER', 'par carte PLAN dans le CHUTIER'],
  // Les neuf pouvoirs qui partagent le vocabulaire de cibles. Ils comptent
  // tous « quelque chose » — une carte, une icône, une valeur — et ne se
  // distinguent que par ce qu'ils en font.
  ['AILLEURS',    'par CIBLE dans les AUTRES SÉQUENCES…'],
  ['CENTRE',      'par CIBLE à gauche / à droite du CENTRE…'],
  ['LOT',         'par LOT de n CIBLES…'],
  ['SEUIL',       'si au moins / au plus n CIBLES…'],
  ['ABSENTES',    'par ICONE absente'],
  ['EXTREME',     'par ICONE la plus / la moins présente…'],
  ['DOMINE',      'si CIBLE est la plus / la moins présente…'],
  ['PLAN_ICONES', 'par PLAN portant n ICONES…'],
  ['DOUBLE',      'la plus petite / plus grosse CARTE compte double…'],
  // Les pouvoirs de RÈGLE. Ils ne comptent rien : ils donnent un droit, ou
  // changent ce que le montage rapporte par ailleurs. Ils s'écrivent en toutes
  // lettres sur la carte, faute de symbole qui les dise.
  ['PIOCHER',      'vous pouvez PIOCHER sur le Chutier'],
  ['SEQ_PLUS',     'vous pouvez monter n SÉQUENCES de plus…'],
  ['PLAN_PLUS',    'vous jouez n PLANS de plus après le dernier tour…'],
  ['RACCORD_VAUT', 'chaque RACCORD vaut +n…'],
];

const KIND_LABEL = Object.fromEntries(KINDS.map(([k, l]) => [k, l]));

// --- La couche de retouches ------------------------------------------------
// L'éditeur travaille toujours sur le jeu MODIFIÉ, même quand c'est la boîte
// qui se joue.

function retoucher(cle, champ, valeur) {
  const plans = store.cfg.materiel.plans;
  const p = plans[cle] || (plans[cle] = {});
  if (valeur === undefined) delete p[champ]; else p[champ] = valeur;
  if (!Object.keys(p).length) delete plans[cle];
}

function retoucheDe(cle) {
  return store.cfg.materiel.plans[cle] || null;
}

function nbRetouches() {
  return Object.keys(store.cfg.materiel.plans).length + Object.keys(store.cfg.materiel.paires).length;
}

function estDesactivee(id) {
  return store.cfg.cartesDesactivees.includes(id);
}

// --- La composition du matériel ---------------------------------------------
// Retoucher une carte est une chose ; en créer une, ou en retirer une du
// matériel pour de bon, en est une autre. C'est la **composition** : elle ne
// dépend pas du jeu qu'on lance — une carte qui n'existe pas n'existe ni dans
// la boîte ni dans le modifié — et elle voyage avec la configuration, donc
// avec le salon en ligne.

function composition() {
  const m = store.cfg.materiel;
  if (!m.ajouts) m.ajouts = { scenes: [], larges: [], departs: [], paires: [] };
  for (const k of ['scenes', 'larges', 'departs', 'paires']) if (!m.ajouts[k]) m.ajouts[k] = [];
  if (!m.retires) m.retires = [];
  return m;
}

function nbAjoutees() {
  const a = composition().ajouts;
  return a.scenes.length + a.larges.length + a.departs.length + a.paires.length;
}

/**
 * Le premier numéro libre d'une série. Les Gros Plans se numérotent à part des
 * Plans Larges et des Plans de départ — un GP05 et un L5 ne se confondent pas.
 * Les numéros de la boîte s'arrêtent à GP102 et à L19 : un plan créé prend la
 * suite. Un plan supprimé garde son numéro, pour retrouver sa place si on le
 * restaure.
 */
function prochainNumero(grosPlan) {
  const a = composition().ajouts;
  const pris = new Set(surLeModifie(() => catalogue()
    .filter((p) => (p.format === 'GP') === !!grosPlan).map((p) => p.numOrigine)));
  for (const x of (grosPlan ? a.scenes : [...a.larges, ...a.departs])) pris.add(x.num);
  let n = grosPlan ? 103 : 20;
  while (pris.has(n)) n++;
  return n;
}

/** Le rang interne d'un Gros Plan créé : loin de ceux de la boîte, qui s'arrêtent à 103. */
function prochainIdxScene() {
  return Math.max(999, ...composition().ajouts.scenes.map((s) => s.idx || 0)) + 1;
}

/**
 * Crée un plan ou une carte dans la famille demandée, et rend de quoi ouvrir
 * l'éditeur sur ce qu'on vient de faire.
 *
 * Un **Gros Plan** se crée seul : c'est une moitié de carte, et il n'entre dans
 * le paquet qu'une fois posé sur une carte, à gauche ou à droite — c'est
 * l'Assemblage qui le place. Une **carte** créée est une feuille vide, à
 * remplir de deux Gros Plans.
 */
function creerCarte(famille) {
  const m = composition();
  if (famille === 'PL') {
    const num = prochainNumero(false);
    m.ajouts.larges.push({ num, tc: 0, el: [], obj: null });
    sauverCfg();
    return { cles: [cleplan(num)], cartes: [`L${num}`] };
  }
  if (famille === 'DEPART') {
    const num = prochainNumero(false);
    m.ajouts.departs.push({ num, tc: 0, el: [], obj: null });
    sauverCfg();
    return { cles: [cleplan(num)] };
  }
  if (famille === 'GP' || famille === 'RACCORD') {
    const idx = prochainIdxScene();
    const num = prochainNumero(true);
    // Un Raccord est un Gros Plan qui ne raconte rien : pas d'icône, pas de
    // minutage, et le pouvoir qui compte les Raccords.
    m.ajouts.scenes.push(famille === 'RACCORD'
      ? { idx, num, tc: 0, famille: 'TRANSITION', transition: 'RACCORD', titre: 'Raccord', el: [], obj: OBJ.raccord(1) }
      : { idx, num, tc: 0, famille: 'PERSONNAGE', el: [], obj: null });
    sauverCfg();
    return { cles: [cleplan(num, true)] };
  }
  m.ajouts.paires.push({ g: null, d: null });
  sauverCfg();
  return { carte: true };
}

/**
 * Ce qui partirait avec ce qu'on supprime. Retirer un **Gros Plan** emporte les
 * cartes qui le portent : une carte à qui il manque une moitié qu'on lui avait
 * donnée n'a plus rien à montrer. On le dit avant, pas après.
 */
function consequencesSuppression(ids) {
  return surLeModifie(() => {
    const scenes = ids.filter((id) => id.startsWith('SC')).map((id) => +id.slice(2));
    if (!scenes.length) return [];
    const nums = new Set(SCENES().filter((s) => scenes.includes(s.idx)).map((s) => s.num));
    return buildCartesDoubles()
      .filter((c) => nums.has(c.gNum) || nums.has(c.dNum))
      .map((c) => c.id);
  });
}

/**
 * Supprime du matériel. Rien n'est jamais effacé de la liste des ajouts : une
 * carte créée tient son identifiant de **sa place** dans la liste, et en
 * retirer une ferait glisser les suivantes — les retouches rangées par rang
 * suivraient la mauvaise carte. On note donc la carte comme retirée, et c'est
 * tout : la suppression reste réversible.
 */
function supprimerCartes(ids) {
  const m = composition();
  const partants = new Set([...ids, ...consequencesSuppression(ids)]);
  m.retires = [...new Set([...m.retires, ...partants])];
  sauverCfg();
  return partants.size;
}

function restaurerTout() {
  composition().retires = [];
  sauverCfg();
}

/**
 * Ce par quoi des plans sélectionnés se suppriment : un Gros Plan par son rang
 * interne, un Plan de départ et un Plan Large par leur numéro.
 */
function idsDesPlans(plans) {
  return plans.map((p) => (p.format === 'GP' ? `SC${p.scene}`
    : p.format === 'DEP' ? `P${p.numOrigine}` : `L${p.numOrigine}`));
}

/**
 * Supprimer depuis les galeries Gros Plans et Plans de départ. Là, ce ne sont
 * pas des cartes qui sont affichées mais des **plans** : ce qui s'en va est le
 * plan lui-même, et les cartes qui le portaient avec lui.
 */
function blocSupprimerPlans(plans) {
  if (!plans.length) return '';
  const ids = idsDesPlans(plans);
  const emportees = consequencesSuppression(ids);
  const n = plans.length;
  const departs = plans.filter((p) => p.format === 'DEP').length;
  const s = (k) => (k > 1 ? 's' : '');
  return `<div class="bloc-plan boite">
    <div class="bp-tete"><b>${n > 1 ? `Ces ${n} plans` : 'Ce plan'} dans le matériel</b></div>
    <div class="rangee-mini">
      <button class="pill mini danger" data-supprimer="${ids.join(' ')}"
        title="Retirer ${n > 1 ? 'ces plans' : 'ce plan'} du matériel">🗑 Supprimer ${n > 1 ? 'ces plans' : 'ce plan'}</button>
    </div>
    <p class="aide">${emportees.length ? `<b>${emportees.length} carte${s(emportees.length)} à deux Gros Plans</b>
      ${emportees.length > 1 ? 'les portent et partiront' : 'le porte et partira'} avec.`
    : (n - departs ? 'Aucune carte à deux Gros Plans ne le porte.' : '')}
    ${departs ? ' Les cartes de départ sont les couples des plans de départ : en retirer un retire les cartes qui le portent.' : ''}</p>
  </div>`;
}

function activerCartes(ids, actif) {
  const d = new Set(store.cfg.cartesDesactivees);
  for (const id of ids) { if (actif) d.delete(id); else d.add(id); }
  store.cfg.cartesDesactivees = [...d];
  sauverCfg();
}

// --- Le matériel, tel que l'éditeur le voit --------------------------------

/**
 * Les cartes de la pioche, avec leurs plans : les cartes à deux Gros Plans, ou
 * les Plans Larges. Toujours lues sur le jeu modifié.
 */
function cartesDe(vue) {
  return surLeModifie(() => {
    if (vue === 'PL') {
      return buildPlansLarges().map((c) => {
        const h = plHalf(c);
        return { id: c.id, type: 'PL', carte: c, plans: [h], libelle: titrePlan(h) };
      });
    }
    return buildCartesDoubles().map((c) => {
      const m = moitiesDe(c);
      return {
        id: c.id, type: 'DOUBLE', carte: c, rang: c.rang,
        plans: [m.G, m.D].filter(Boolean),
        libelle: `Carte ${c.id} · ${[m.G, m.D].map((h) => (h ? etiquettePlan(h) : '—')).join(' | ')}`,
      };
    });
  });
}

/**
 * Les tuiles d'une vue : une carte, ou un plan isolé. Les Gros Plans et les
 * Plans de départ se montrent plan par plan — un Gros Plan qu'aucune carte ne
 * porte s'édite lui aussi, et une carte de départ n'est qu'un couple de plans.
 */
function tuilesDe(vue) {
  // Tous les plans du jeu dans une seule galerie. Ce sont les mêmes plans que
  // dans les autres vues — une seule vitre, pas un autre matériel.
  if (vue === 'TOUS') return [...tuilesDe('GP'), ...tuilesDe('PL'), ...tuilesDe('DEPART')];
  if (vue === 'GP') {
    return surLeModifie(() => catalogue().filter((p) => p.format === 'GP').map((p) => {
      const plan = halfInfo(p.scene);
      return { genre: 'PLAN', cle: p.cle, plan, libelle: titrePlan(plan) };
    }));
  }
  if (vue === 'DEPART') {
    return surLeModifie(() => DEPARTS().map((d) => {
      const plan = plHalf({ ...d, depart: true });
      return { genre: 'PLAN', cle: plan.cle, plan, libelle: titrePlan(plan) };
    }));
  }
  return cartesDe(vue).map((c) => ({ genre: 'CARTE', ...c, cle: c.id }));
}

// --- Tri et filtres ---------------------------------------------------------

/**
 * Les tris de la galerie. Une carte à deux Gros Plans se range sur celui de
 * gauche, puis sur celui de droite.
 */
const TRIS = [
  ['num', 'Numéro croissant'], ['num-desc', 'Numéro décroissant'],
  ['tc', 'Chrono croissant'], ['tc-desc', 'Chrono décroissant'],
  ['famille', 'Famille'],
];

/** Les plans d'une tuile — un pour un plan isolé, tous ceux de la carte sinon. */
function plansTuile(t) {
  return t.genre === 'PLAN' ? [t.plan] : t.plans;
}

function passeFiltres(t) {
  const f = mat.filtres;
  const plans = plansTuile(t);
  if (!plans.length) return false;
  const un = (test) => plans.some(test);

  if (f.icone) {
    if (f.icone === 'AUCUNE') { if (!un((h) => !h.el.length)) return false; }
    else if (f.icone === 'MORT') { if (!un((h) => h.mort)) return false; }
    else if (!un((h) => h.el.includes(f.icone))) return false;
  }
  if (f.pouvoir) {
    if (f.pouvoir === 'AVEC') { if (!un((h) => objsDe(h).length)) return false; }
    else if (f.pouvoir === 'SANS') { if (!un((h) => !objsDe(h).length)) return false; }
    else if (!un((h) => objsDe(h).some((o) => o.kind === f.pouvoir))) return false;
  }
  if (f.tcMin !== '' && !un((h) => h.tc >= Number(f.tcMin))) return false;
  if (f.tcMax !== '' && !un((h) => h.tc <= Number(f.tcMax))) return false;
  if (f.etat === 'RETOUCHE' && !un((h) => retoucheDe(h.cle))) return false;
  if (f.etat === 'IMPRIME' && un((h) => retoucheDe(h.cle))) return false;
  if (f.famille && !un((h) => h.famille === f.famille)) return false;

  // La boîte se compose par carte : le filtre ne s'applique pas à un plan isolé.
  if (f.actif && t.genre === 'CARTE') {
    if (f.actif === 'ACTIVE' && estDesactivee(t.id)) return false;
    if (f.actif === 'DESACTIVE' && !estDesactivee(t.id)) return false;
  }
  return true;
}

// Dans la galerie de tous les plans, les séries ne se mêlent pas : les Gros
// Plans d'abord, puis les Plans Larges, puis les Plans de départ — un GP05 et
// un L5 n'ont pas à se suivre.
const ORDRE_SERIE = { GP: 0, PL: 1, DEP: 2 };

function trier(tuiles) {
  const serie = (t) => ORDRE_SERIE[plansTuile(t)[0].format] ?? 9;
  const n1 = (t) => plansTuile(t)[0].num;
  const n2 = (t) => (plansTuile(t)[1] ? plansTuile(t)[1].num : -1);
  const num = (a, b) => serie(a) - serie(b) || n1(a) - n1(b) || n2(a) - n2(b);
  const tcm = (t) => Math.min(...plansTuile(t).map((h) => h.tc));
  const fam = (t) => plansTuile(t)[0].famille || '';
  const c = [...tuiles];
  switch (mat.tri) {
    case 'num-desc': c.sort((a, b) => serie(a) - serie(b) || n1(b) - n1(a) || n2(b) - n2(a)); break;
    case 'tc':       c.sort((a, b) => tcm(a) - tcm(b) || num(a, b)); break;
    case 'tc-desc':  c.sort((a, b) => tcm(b) - tcm(a) || num(a, b)); break;
    case 'famille':  c.sort((a, b) => fam(a).localeCompare(fam(b)) || num(a, b)); break;
    default:         c.sort(num);
  }
  return c;
}

const FAMILLES = ['TRANSITION', 'MORT', 'ARME', 'VEHICULE', 'OBJET', 'PERSONNAGE', 'PLAN LARGE', 'DÉPART'];

// --- La vue -----------------------------------------------------------------

function vueMateriel() {
  let corps;
  if (mat.vue === 'TABLE') corps = tableauMateriel();
  else if (mat.vue === 'ASSEMBLAGE') corps = surLeModifie(vueAssemblage);
  else if (mat.vue === 'STATS') corps = vueStats();
  else if (mat.vue === 'POUVOIRS') corps = vuePouvoirs();
  else corps = surLeModifie(galerieMateriel);

  html(`${topbar('#/materiel')}
  <div class="materiel-2col wrap large ${VUES_GALERIE.includes(mat.vue) ? '' : 'pleine'}">
    <div class="panneau">
      <h2>Matériel</h2>
      ${alerteDoublons()}
      ${barreJeu()}
      <div class="filtre-barre" style="margin-top:12px">
        ${VUES.map(([k, l]) => `<button class="pill ${mat.vue === k ? 'on' : ''}" data-vue="${k}">${l}</button>`).join('')}
      </div>
      ${corps}
    </div>
    ${VUES_GALERIE.includes(mat.vue) ? `<div class="panneau editeur" id="editeur">${panneauEditeur()}</div>` : ''}
  </div>
  ${pied()}`);

  brancherApercu();
  brancherMateriel();
  if (mat.vue === 'ASSEMBLAGE') brancherAssemblage();
}

/**
 * Renuméroter est libre, mais deux plans qui portent le même numéro se
 * confondent sur la table : on le dit en clair, en tête d'écran.
 */
function alerteDoublons() {
  const d = surLeModifie(doublonsNumeros);
  if (!d.length) return '';
  // « DEP5 », « GP12 », « PL7 » : le cadrage, puis le numéro de boîte.
  const nom = (s) => {
    const m = /^([A-Z]+)(.*)$/.exec(s) || [];
    return `${(FORMATS[m[1]] || { label: m[1] || '' }).label} ${etiquettePlan({ format: m[1], num: m[2] ?? s })}`;
  };
  return `<div class="alerte-doublons">
    <b>⚠ ${d.length} numéro${d.length > 1 ? 's' : ''} en double dans le matériel modifié</b>
    <ul>${d.map((x) => `<li><b>n°${x.num}</b> — porté par ${x.plans.map(nom).join(', ')}</li>`).join('')}</ul>
    <span class="aide">Rien n’est cassé : le numéro n’est qu’une étiquette, l’identité d’un plan
    reste son numéro dans la boîte. Mais deux plans qui l’affichent en même temps sont
    indiscernables à la lecture.</span>
  </div>`;
}

/**
 * Le paquet suffit-il pour la tablée ? On le demande au jeu de la
 * CONFIGURATION — celui qui partira en partie —, même si une partie en cours en
 * joue un autre.
 */
function bilanMateriel(jeu = store.cfg.materielActif) {
  appliquerMateriel(jeu === 'MODIFIE' ? store.cfg.materiel : null,
    store.cfg.cartesDesactivees, store.cfg.materiel);
  try { return bilanPaquet(store.cfg, store.joueurs.length); } finally { appliquerJeuActif(); }
}

/** Quel jeu de matériel se joue, et combien il porte de retouches. */
function barreJeu() {
  const modifie = store.cfg.materielActif === 'MODIFIE';
  const n = nbRetouches();
  const off = store.cfg.cartesDesactivees.length;
  const contenu = contenuBoite();
  const b = bilanMateriel();
  const s = (k) => (k > 1 ? 's' : '');
  const manques = [
    b.manque > 0 ? `il manque ${b.manque} carte${s(b.manque)} dans la pioche` : '',
    b.departsManquants ? `il manque ${b.departsManquants} carte${s(b.departsManquants)} de départ` : '',
    b.incompletes ? `${b.incompletes} carte${s(b.incompletes)} attend${b.incompletes > 1 ? 'ent' : ''} une moitié à l’Assemblage` : '',
  ].filter(Boolean);
  return `<div class="barre-jeu">
    <span class="bj-lg">La boîte</span>
    <span class="aide">${contenu.cartes} cartes · ${contenu.plans} plans — ${b.doubles} carte${s(b.doubles)}
      à deux Gros Plans et ${b.larges} Plan${s(b.larges)} Large${s(b.larges)} dans la pioche,
      ${b.departs} carte${s(b.departs)} de départ${b.jouable ? ''
    : ` — <b>pas jouable à ${store.joueurs.length}</b> : ${manques.join(' ; ') || 'la pioche est trop courte'}`}</span>
    <span class="bj-lg">Jeu lancé en partie</span>
    <div class="segments large" id="seg-jeu">
      <button class="${modifie ? '' : 'on'}" data-jeu="IMPRIME">Boîte</button>
      <button class="${modifie ? 'on' : ''}" data-jeu="MODIFIE">Modifié</button>
    </div>
    <span class="aide">
      ${modifie
        ? `les ${n} retouche${s(n)} de l’éditeur partent en partie`
        : `les cartes de la boîte partent en partie, telles quelles ; les ${n} retouche${s(n)} de l’éditeur sont mises de côté, jamais perdues`}
      ${off ? ` · <b>${off} carte${s(off)} écartée${s(off)}</b>, dans les deux jeux` : ''}
      · la galerie ci-dessous montre et règle toujours le jeu <b>Modifié</b>
    </span>
    ${compositionRetouchee()}
    <button class="pill" id="mat-export">⭳ Tableau en PDF</button>
    <button class="pill" id="csv-export">⭳ Cartes en CSV</button>
    <button class="pill" id="csv-import">⭱ Importer un CSV</button>
    <button class="pill publier" id="materiel-publier"
      title="Le fichier materiel.json, à déposer à la racine du dépôt : une fois publié, tout le monde joue ce matériel — y compris qui ouvre simplement le site">⭳ Publier ce matériel</button>
    <button class="pill partage" id="partage-lien"
      title="Un lien qui porte ce jeu tel qu'il est — réglages, retouches et assemblage. À coller dans un message : celui qui l'ouvre joue exactement votre version">🔗 Lien de partage</button>
    <button class="pill partage" id="partage-fichier"
      title="Le même partage, dans un fichier — pour un matériel trop retouché pour tenir dans un lien. Le testeur le charge ici même">⭳ Fichier de partage</button>
    <button class="pill" id="partage-charger"
      title="Ouvrir un fichier de partage reçu">⭱ Charger un partage</button>
    <input type="file" id="partage-fichier-entree" accept=".json,application/json" hidden>
  </div>
  ${publieEnAttente() ? `<div class="encart attention bandeau-publie">
    <b>Le site publie un matériel différent du vôtre.</b> Le vôtre est celui que vous voyez ; celui
    du site est ce que voient les autres. ${materielVide(store.cfg.materiel)
    ? '' : 'Adopter le publié <b>remplacera vos retouches locales</b>.'}
    <button class="pill mini" id="adopter-publie">Adopter le matériel du site</button>
  </div>` : ''}`;
}

// Ce qu'on peut créer, onglet par onglet. Chaque galerie crée ce qu'elle
// montre. La vue « Tous les plans » mêle les familles : elle ne crée rien.
const A_CREER = {
  CARTES: [['CARTES', '+ Nouvelle carte',
    'Une carte vide, à remplir de deux Gros Plans — elle s’ouvre dans l’Assemblage']],
  GP: [
    ['GP', '+ Nouveau Gros Plan', 'Un Gros Plan vierge, à régler ; l’Assemblage le posera sur une carte'],
    ['RACCORD', '+ Nouveau Raccord', 'Un Raccord de plus : ni icône ni chrono, et le pouvoir qui compte les Raccords'],
  ],
  PL: [['PL', '+ Nouveau Plan Large', 'Une carte Plan Large vierge, à régler']],
  DEPART: [['DEPART', '+ Nouveau Plan de départ',
    'Un plan de départ de plus : il forme une carte de départ avec chacun des autres']],
};

function boutonCreer() {
  return (A_CREER[mat.vue] || [])
    .map((e) => `<button class="pill mini creer" data-creer="${e[0]}" title="${e[2]}">${e[1]}</button>`)
    .join('');
}

/**
 * Ce que la composition du matériel a de changé — les cartes créées, celles
 * qu'on a supprimées. Cela ne se lit nulle part ailleurs : une carte supprimée
 * ne s'affiche plus, et il faut bien une porte pour la faire revenir.
 */
function compositionRetouchee() {
  const m = composition();
  const cree = nbAjoutees();
  const off = m.retires.length;
  if (!cree && !off) return '';
  const bouts = [];
  if (cree) bouts.push(`<b>${cree} carte${cree > 1 ? 's' : ''} créée${cree > 1 ? 's' : ''}</b>`);
  if (off) bouts.push(`<b>${off} supprimée${off > 1 ? 's' : ''}</b>`);
  return `<span class="compo-retouchee">${bouts.join(' · ')}
    ${off ? '<button class="pill mini" id="compo-restaurer">↺ Restaurer les supprimées</button>' : ''}</span>`;
}

/** Une tuile est-elle retenue ? Un plan par sa clé, une carte par son numéro. */
const tuileChoisie = (t) => (t.genre === 'PLAN' ? mat.plans.has(t.cle) : mat.cartes.has(t.id));

/**
 * La ligne qui compte ce qui est affiché et ce qui est pris. Elle vit à part
 * pour qu'un simple changement de sélection puisse la réécrire seule, sans
 * refaire la galerie — voir `majSelection`.
 */
function compteSelection() {
  const toutes = tuilesDe(mat.vue);
  const vues = trier(toutes.filter(passeFiltres));
  const visibles = new Set(toutes.flatMap((t) => plansTuile(t).map((h) => h.cle)));
  const horsVue = [...mat.plans].filter((c) => !visibles.has(c)).length;
  const n = mat.plans.size;
  return `${vues.length} / ${toutes.length} affichée${toutes.length > 1 ? 's' : ''}
    · <b>${n} plan${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}</b>${
  horsVue ? ` <span class="aide">dont ${horsVue} hors de cette vue</span>` : ''}`;
}

function galerieMateriel() {
  const toutes = tuilesDe(mat.vue);
  const vues = trier(toutes.filter(passeFiltres));
  const f = mat.filtres;
  const sel = tuileChoisie;

  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;

  return `<div class="barre-filtres">
    <label>Tri
      <select data-filtre="tri">${TRIS.map(([k, l]) => opt(k, l, mat.tri === k)).join('')}</select></label>
    <label>Icône
      <select data-filtre="icone">
        ${opt('', 'toutes', !f.icone)}
        ${ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, f.icone === e)).join('')}
        ${opt('MORT', 'Mort', f.icone === 'MORT')}${opt('AUCUNE', 'aucune icône', f.icone === 'AUCUNE')}
      </select></label>
    <label>Pouvoir
      <select data-filtre="pouvoir">
        ${opt('', 'tous', !f.pouvoir)}${opt('AVEC', 'avec pouvoir', f.pouvoir === 'AVEC')}
        ${opt('SANS', 'sans pouvoir', f.pouvoir === 'SANS')}
        ${KINDS.filter(([k]) => k).map(([k, l]) => opt(k, l, f.pouvoir === k)).join('')}
      </select></label>
    <label>Chrono
      <input type="number" min="0" max="99" placeholder="min" value="${f.tcMin}" data-filtre="tcMin"
        title="En minutes — 0 pour les plans sans chrono, « -- »">
      <input type="number" min="0" max="99" placeholder="max" value="${f.tcMax}" data-filtre="tcMax"></label>
    <label>Famille
      <select data-filtre="famille">${opt('', 'toutes', !f.famille)}
        ${FAMILLES.map((x) => opt(x, x, f.famille === x)).join('')}</select></label>
    <label>État
      <select data-filtre="etat">${opt('', 'tous', !f.etat)}
        ${opt('IMPRIME', 'comme dans la boîte', f.etat === 'IMPRIME')}${opt('RETOUCHE', 'retouchés', f.etat === 'RETOUCHE')}
      </select></label>
    <label>Boîte
      <select data-filtre="actif">${opt('', 'toutes', !f.actif)}
        ${opt('ACTIVE', 'activées', f.actif === 'ACTIVE')}${opt('DESACTIVE', 'écartées', f.actif === 'DESACTIVE')}
      </select></label>
    <button class="pill mini" id="filtres-raz">↺ filtres</button>
  </div>

  <div class="barre-selection">
    <span class="info" id="compte-selection">${compteSelection()}</span>
    <button class="pill mini" id="sel-tout">Tout sélectionner</button>
    <button class="pill mini" id="sel-rien" ${mat.plans.size ? '' : 'disabled'}>Ne rien sélectionner</button>
    ${boutonCreer()}
    <span class="aide">clic pour choisir · ⌘/Ctrl+clic pour en ajouter une · maj+clic pour toute une série</span>
  </div>

  ${vues.length ? `<div class="galerie">${vues.map((t, i) => {
    const hors = t.genre === 'CARTE' && estDesactivee(t.id);
    return `<div class="item vignette ${sel(t) ? 'sel' : ''} ${hors ? 'hors-boite' : ''}"
      data-tuile="${t.cle}" data-rang="${i}">${htmlTuile(t)}</div>`;
  }).join('')}</div>`
    : '<p class="aide" style="margin-top:18px">Aucune carte ne passe les filtres.</p>'}
  ${mat.vue === 'DEPART' ? cartesDeDepart() : ''}`;
}

// Le rendu se fait sur le jeu modifié : c'est lui que l'éditeur montre et
// règle, même quand c'est la boîte qui se joue.
function htmlTuile(t) {
  return surLeModifie(() => htmlTuileBrut(t));
}

function htmlTuileBrut(t) {
  const retouche = plansTuile(t).some((h) => retoucheDe(h.cle));
  const hors = t.genre === 'CARTE' && estDesactivee(t.id);
  const visuel = t.genre === 'CARTE' && t.type === 'DOUBLE'
    ? renderCarte(t.carte, { small: true })
    : `<div class="carte solo small">${renderPlan(plansTuile(t)[0])}</div>`;
  const etats = [retouche ? '<b class="et-mod">retouché</b>' : '', hors ? '<b class="et-hors">écartée</b>' : '']
    .filter(Boolean).join(' · ');
  return `${visuel}<div class="lg">${t.libelle}${etats ? ` · ${etats}` : ''}</div>`;
}

/**
 * Les cartes de départ, sous la galerie des plans de départ. La carte de départ
 * est la seule carte recto verso du jeu : elle porte deux plans de départ, un
 * par face. Elle n'a rien à régler — ce sont ses plans qui se règlent —, mais
 * elle s'écarte de la boîte comme une autre.
 */
function cartesDeDepart() {
  const plans = DEPARTS();
  const couples = [];
  for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) couples.push([plans[i], plans[j]]);
  if (!couples.length) return '';
  const face = (p) => `<div class="carte solo tiny">${renderPlan(plHalf({ ...p, depart: true }), { muet: true })}</div>`;
  return `<h3 style="margin-top:24px">Les ${couples.length} cartes de départ</h3>
  <p class="aide">La carte de départ est la <b>seule carte recto verso</b> du jeu : un plan de départ
  sur chaque face. ${plans.length} plans font ${couples.length} couples, donc ${couples.length}
  carte${couples.length > 1 ? 's' : ''} ; chaque joueuse en reçoit une et choisit la face qu’elle pose.</p>
  <div class="cartes-depart">${couples.map(([a, b]) => {
    const id = `S${a.num}-${b.num}`;
    const hors = estDesactivee(id);
    return `<div class="carte-depart ${hors ? 'hors-boite' : ''}">
      <div class="cd-faces">${face(a)}<span class="cd-verso" title="recto / verso">⇄</span>${face(b)}</div>
      <div class="lg">${etiquettePlan(plHalf({ ...a, depart: true }))} / ${etiquettePlan(plHalf({ ...b, depart: true }))}${
  hors ? ' · <b class="et-hors">écartée</b>' : ''}</div>
      <button class="pill mini" data-depart-boite="${id}">${hors ? '✓ Remettre dans la boîte' : '✕ Écarter de la boîte'}</button>
    </div>`;
  }).join('')}</div>`;
}

// --- Le panneau d'édition ---------------------------------------------------

function plansSelectionnes() {
  return surLeModifie(() => [...mat.plans].map(planDeCle).filter(Boolean));
}

function panneauEditeur() {
  return surLeModifie(() => panneauEditeurBrut());
}

function panneauEditeurBrut() {
  const plans = plansSelectionnes();
  if (!plans.length) {
    return `<h2>Éditeur</h2>
      <p class="aide">Choisis une carte ou un plan dans la galerie : sa <b>vraie carte</b> s’affiche à
      côté de ce que le moteur en a lu — <b>chrono</b>, <b>icônes</b>, <b>pouvoir</b> —, pour
      vérifier la lecture et la corriger. Sélectionnes-en plusieurs pour les régler d’un coup.</p>
      <p class="aide">L’éditeur écrit toujours dans le jeu <b>Modifié</b>, même quand c’est la boîte
      qui se joue — passer de l’un à l’autre ne détruit rien. Un plan retouché ne correspond plus à
      son image : le site le recompose alors lui-même.</p>`;
  }

  const idSeul = mat.cartes.size === 1 ? [...mat.cartes][0] : null;
  const carteSeule = idSeul
    ? [...cartesDe('CARTES'), ...cartesDe('PL')].find((c) => c.id === idSeul) || null : null;

  // Une carte seule s'édite plan par plan — ses deux moitiés l'une sous
  // l'autre. C'est seulement à partir de deux cartes, ou d'une poignée de
  // plans, qu'on passe au réglage en lot.
  const parPlan = plans.length === 1
    || (carteSeule && carteSeule.plans.length === plans.length
        && carteSeule.plans.every((h) => mat.plans.has(h.cle)));

  const titre = plans.length === 1 ? titrePlan(plans[0])
    : carteSeule ? carteSeule.libelle
    : `${plans.length} plans sélectionnés`;

  return `<h2>${titre}</h2>
    ${mat.cartes.size ? blocBoite() : blocSupprimerPlans(plans)}
    ${carteSeule && carteSeule.type === 'DOUBLE' ? apercuCarte(carteSeule) : ''}
    ${parPlan ? plansOrdonnes(plans, carteSeule).map(blocPlan).join('') : blocLot(plans)}
    ${carteSeule && carteSeule.type === 'DOUBLE' ? appariement(carteSeule.carte) : ''}`;
}

/** Les plans d'une carte se lisent dans l'ordre où elle les porte : gauche, droite. */
function plansOrdonnes(plans, carte) {
  if (!carte) return plans;
  const rang = new Map(carte.plans.map((h, i) => [h.cle, i]));
  return [...plans].sort((a, b) => (rang.get(a.cle) ?? 99) - (rang.get(b.cle) ?? 99));
}

/** Les cartes sélectionnées sont-elles dans la boîte ? */
function blocBoite() {
  const ids = [...mat.cartes];
  const dedans = ids.filter((id) => !estDesactivee(id)).length;
  const n = ids.length;
  return `<div class="bloc-plan boite">
    <div class="bp-tete"><b>${n > 1 ? `${n} cartes` : 'Cette carte'} dans la boîte</b>
      <span class="aide">${dedans} / ${n} activée${dedans > 1 ? 's' : ''}</span></div>
    <div class="rangee-mini">
      <button class="pill mini" data-boite="1" ${dedans === n ? 'disabled' : ''}>✓ Activer</button>
      <button class="pill mini" data-boite="0" ${dedans === 0 ? 'disabled' : ''}>✕ Écarter de la boîte</button>
      <button class="pill mini danger" data-supprimer="${ids.join(' ')}"
        title="Retirer ces cartes du matériel — pas seulement de la boîte">🗑 Supprimer du matériel</button>
    </div>
  </div>`;
}

/** La carte entière, telle que la table la montre : la moitié gauche à gauche, la droite à droite. */
function apercuCarte(c) {
  return `<div class="editeur-faces"><div><div class="f-lg">La carte</div>${
    renderCarte(c.carte, { small: true })}</div></div>`;
}

/**
 * La VRAIE carte d'un plan, à côté de ce que le moteur en lit : son minutage,
 * ses icônes dans l'ordre — la première est la dominante —, la phrase de son
 * pouvoir. C'est ici que l'auteur vérifie la lecture de sa carte, et la corrige
 * dans le formulaire qui suit.
 */
function lectureCarte(h) {
  const visuel = visuelImprime(h.cle);
  const os = objsDe(h);
  const icones = h.el.map((e, i) => `<span class="lc-icone ${i === 0 ? 'dominante' : ''}"
    title="${ELEMENTS[e].label}${i === 0 ? ' — icône dominante' : ''}">${elIcon(e, i === 0 ? 26 : 20)}</span>`).join('');
  return `<div class="lecture-carte">
    ${visuel
    ? `<a class="lc-image ${h.format === 'GP' ? 'gp' : 'pl'}" href="${visuel}" target="_blank" rel="noopener"
        title="La carte livrée par l’auteur — ouvrir en grand"><img src="${visuel}" alt="${titrePlan(h)}" loading="lazy"></a>`
    : '<div class="lc-image sans-carte"><span>plan créé ici :<br>pas de carte livrée</span></div>'}
    <div class="lc-lu">
      <div class="lc-titre">Ce que le moteur en lit</div>
      <dl>
        <dt>Chrono</dt>
        <dd><span class="tc-apercu ${teinteTc(h.tc)}">${tc(h.tc)}</span></dd>
        <dt>Icônes</dt>
        <dd>${icones || '<span class="aide">aucune</span>'}${h.mort ? `<span class="lc-icone" title="Plan de mort">${elIcon('MORT', 20)}</span>` : ''}</dd>
        <dt class="lc-large">Pouvoir</dt>
        <dd class="lc-large">${os.length ? os.map((o) => `<span class="lc-pouvoir">${objHTML(o, 20, store.cfg)}
          <span class="lit">${objLabel(o, store.cfg)}</span></span>`).join('') : '<span class="aide">aucun</span>'}</dd>
      </dl>
    </div>
  </div>`;
}

/**
 * Le formulaire d'un plan : minutage, icônes, pouvoir. Chaque valeur qui
 * s'écarte de la boîte le dit — les deux versions restent lisibles côte à
 * côte, sans avoir à basculer le jeu lancé.
 */
function blocPlan(h) {
  const r = retoucheDe(h.cle);
  const imp = h.imprime;
  const memeEl = h.el.length === imp.el.length && h.el.every((x, k) => x === imp.el[k]) && h.mort === imp.mort;

  const enDouble = doublonsNumeros().some((d) => d.plans.includes(`${h.format}${h.numOrigine}`));
  const serie = h.format === 'GP' ? 'GP' : 'L';

  return `<div class="bloc-plan ${r ? 'retouche' : ''}" data-plan="${h.cle}">
    <div class="bp-tete">
      <b>${titrePlan(h)}${r ? ' <span class="et-mod">· retouché</span>' : ''}</b>
      <button class="pill mini" data-plan-reset="${h.cle}" ${r ? '' : 'disabled'}>↺ boîte</button>
    </div>

    ${lectureCarte(h)}

    <label class="champ-ligne">
      <span>Numéro</span>
      <span class="aide">${serie}</span>
      <input type="number" min="0" max="999" step="1" value="${h.num}" data-champ-num="${h.cle}"
        class="${enDouble ? 'en-double' : ''}">
      ${h.num !== imp.num ? `<span class="imp-rappel">boîte : ${etiquettePlan({ format: h.format, num: imp.num })}</span>` : ''}
      ${enDouble ? '<span class="alerte-mini">déjà pris</span>' : ''}
    </label>

    <label class="champ-ligne">
      <span>Chrono</span>
      <input type="number" min="0" max="99" step="1" value="${h.tc}" data-champ-tc="${h.cle}"
        title="En minutes. 0 : pas de chrono, « -- »">
      <span class="tc-apercu ${teinteTc(h.tc)}">${tc(h.tc)}</span>
      ${h.tc !== imp.tc ? `<span class="imp-rappel">boîte : ${tc(imp.tc)}</span>` : ''}
    </label>

    <div class="champ-bloc">
      <span class="ch-lg">Icônes</span>
      ${choixIcones([h], `data-plan-icone="${h.cle}"`, `data-plan-mort="${h.cle}"`)}
      ${h.el.length > 1 ? `<div class="ordre-icones">
        <span class="aide">Dans l’ordre de la carte — la première est la <b>dominante</b> :</span>
        ${h.el.map((e, i) => `<button class="ic-ordre ${i === 0 ? 'dominante' : ''}" data-dominante="${h.cle}" data-rang="${i}"
          title="${i === 0 ? `${ELEMENTS[e].label} — icône dominante` : `${ELEMENTS[e].label} — en faire la dominante`}">${elIcon(e, 22)}</button>`).join('')}
      </div>` : ''}
      <div class="rangee-mini" style="margin-top:8px">
        <button class="pill mini" data-vider="el" data-cles="${h.cle}"
          ${h.el.length || h.mort ? '' : 'disabled'}>Enlever toutes les icônes</button>
      </div>
      ${memeEl ? '' : `<div class="imp-rappel ligne">boîte :
        ${imp.el.map((e) => elIcon(e, 20)).join('') || 'aucune icône'}${imp.mort ? elIcon('MORT', 20) : ''}</div>`}
    </div>

    ${blocPouvoir(h.obj, h.cle)}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="1" data-cles="${h.cle}" ${h.obj ? '' : 'disabled'}>Enlever le pouvoir</button>
      ${h.obj && !h.obj2 ? `<button class="pill mini" data-second="${h.cle}">+ second pouvoir</button>` : ''}
    </div>
    ${memeObjectif(h.obj, imp.obj) ? '' : `<div class="imp-rappel ligne">boîte :
      ${imp.obj ? `${objHTML(imp.obj, 20, store.cfg)} ${objLabel(imp.obj, store.cfg)}` : 'aucun pouvoir'}</div>`}

    ${h.obj2 ? `${blocPouvoir(h.obj2, h.cle, 2)}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="2" data-cles="${h.cle}">Enlever le second pouvoir</button>
    </div>
    ${memeObjectif(h.obj2, imp.obj2) ? '' : `<div class="imp-rappel ligne">boîte :
      ${imp.obj2 ? `${objHTML(imp.obj2, 20, store.cfg)} ${objLabel(imp.obj2, store.cfg)}` : 'pas de second pouvoir'}</div>`}` : ''}
  </div>`;
}

/**
 * Le formulaire d'un lot. Il se manie comme celui d'un plan seul : chaque
 * réglage part aussitôt sur toute la sélection, sans bouton à confirmer.
 * Une icône que seule une partie des plans porte est marquée « partielle » —
 * un clic la donne alors à tous.
 */
function blocLot(plans) {
  const cles = plans.map((p) => p.cle).join(' ');
  const memes = (f) => { const v = JSON.stringify(f(plans[0])); return plans.every((p) => JSON.stringify(f(p)) === v); };
  const tcCommun = memes((p) => p.tc) ? plans[0].tc : '';
  const nRetouches = plans.filter((p) => retoucheDe(p.cle)).length;

  return `<div class="bloc-plan lot">
    <div class="bp-tete">
      <b>Régler les ${plans.length} plans d’un coup</b>
      <button class="pill mini" data-lot-reset="1" ${nRetouches ? '' : 'disabled'}>↺ boîte (${nRetouches})</button>
    </div>
    <p class="aide">Tout ce qui est réglé ici part aussitôt sur les ${plans.length} plans.</p>

    <label class="champ-ligne">
      <span>Chrono</span>
      <input type="number" min="0" max="99" step="1" value="${tcCommun}" data-lot-tc="1" placeholder="—">
      ${tcCommun === '' ? '<span class="aide">chronos différents</span>' : `<span class="tc-apercu ${teinteTc(tcCommun)}">${tc(tcCommun)}</span>`}
    </label>

    <div class="champ-bloc">
      <span class="ch-lg">Icônes</span>
      ${choixIcones(plans, 'data-lot-icone="1"', 'data-lot-mort="1"')}
      <div class="rangee-mini" style="margin-top:8px">
        <button class="pill mini" data-vider="el" data-cles="${cles}"
          ${plans.some((p) => p.el.length || p.mort) ? '' : 'disabled'}>Enlever toutes les icônes</button>
      </div>
    </div>

    ${objCommunDe(plans) || !plans.some((p) => p.obj)
      ? blocPouvoir(objCommunDe(plans), 'lot')
      : blocPouvoirMixte(plans, 'lot')}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="1" data-cles="${cles}"
        ${plans.some((p) => p.obj) ? '' : 'disabled'}>Enlever le pouvoir des ${plans.length} plans</button>
      ${plans.some((p) => p.obj) && !plans.every((p) => p.obj2)
        ? `<button class="pill mini" data-second="${cles}">+ second pouvoir</button>` : ''}
    </div>

    ${plans.some((p) => p.obj2) ? `${objCommunDe(plans, 2)
      ? blocPouvoir(objCommunDe(plans, 2), 'lot', 2)
      : blocPouvoirMixte(plans, 'lot', 2)}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="2" data-cles="${cles}">Enlever le second pouvoir des ${plans.length} plans</button>
    </div>` : ''}

    <div class="liste-lot">
      ${plans.map((p) => `<span class="jeton ${retoucheDe(p.cle) ? 'mod' : ''}" data-oter="${p.cle}"
        title="Retirer de la sélection">${etiquettePlan(p)} ✕</span>`).join('')}
    </div>
  </div>`;
}

/**
 * Les pouvoirs d'une sélection quand ils **diffèrent** : la valeur et la
 * portée se règlent quand même, d'un coup — ce sont des pièces que tous les
 * pouvoirs partagent, chaque plan gardant son propre effet. Régler dix cartes
 * « 2 × quelque chose » en « 3 × quelque chose » ne demande plus dix passages.
 * Choisir un type dans la liste, en revanche, remplace tous les pouvoirs par
 * ce type-là, comme sur une sélection vierge.
 */
function blocPouvoirMixte(plans, ou, rang = 1) {
  const champ = rang === 2 ? 'obj2' : 'obj';
  const objs = plans.map((p) => p[champ]).filter(Boolean);
  const R = ` data-rang="${rang}"`;
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const memeN = objs.every((o) => o.n === objs[0].n) ? objs[0].n : '';
  const portees = [...new Set(objs.map((o) => objPortee(o, store.cfg)))];
  const figes = objs.filter((o) => !porteeReglable(o)).length;
  return `<div class="champ-bloc">
    <span class="ch-lg">${rang === 2 ? 'Second pouvoir' : 'Pouvoir'} — ${objs.length} pouvoirs différents</span>
    <p class="aide">Les pouvoirs diffèrent : la <b>valeur</b> et la <b>portée</b> se règlent quand
      même d'un coup, chaque plan gardant son propre effet.</p>
    <div class="editeur-obj">
      <input type="number" class="pts" min="-20" max="20" value="${memeN}" placeholder="—"
        data-champ-obj="${ou}"${R} data-part="n">
      <span class="x">×</span>
      <select data-champ-obj="${ou}"${R} data-part="kind">
        <option value="" disabled selected hidden>— pouvoirs différents —</option>
        ${KINDS.filter(([k]) => k).map(([k, l]) => opt(k, l, false)).join('')}
      </select>
    </div>
    <div class="portee-choix">
      ${PORTEES.map((x) => `<button class="pp ${portees.length === 1 && portees[0] === x.id ? 'on' : ''}"
        data-champ-portee="${ou}"${R} data-portee="${x.id}" title="${x.label}">
        ${x.recul ? '◁◁' : ''}${x.gauche ? '◀' : ''} ${x.court} ${x.droite ? '▶' : ''}${x.avance ? '▷▷' : ''}</button>`).join('')}
    </div>
    ${figes ? `<div class="aide portee-fixe">${figes} pouvoir${figes > 1 ? 's' : ''} de séquence ou
      « dans l'ordre » garder${figes > 1 ? 'ont' : 'a'} sa portée : elle ne se règle pas.</div>` : ''}
  </div>`;
}

/**
 * Le pouvoir commun à une sélection, ou rien si les plans divergent. `rang`
 * dit lequel des deux pouvoirs du plan on regarde.
 */
function objCommunDe(plans, rang = 1) {
  const champ = rang === 2 ? 'obj2' : 'obj';
  const v = JSON.stringify(plans[0][champ] || null);
  return plans.every((p) => JSON.stringify(p[champ] || null) === v) ? plans[0][champ] : null;
}

/**
 * Les icônes d'un plan ou d'une sélection. Un plan peut porter deux fois la
 * même icône — deux armes, deux véhicules : le bouton compte, il ne coche
 * pas. Clic pour en ajouter une, clic droit pour en retirer une. « partiel »
 * marque une icône que la sélection ne porte pas en même nombre partout.
 */
export const MAX_ICONES = 6;

function comptesIcones(plans, e) {
  return plans.map((p) => p.el.filter((x) => x === e).length);
}

function choixIcones(plans, attrIcone, attrMort) {
  const pastille = (e) => {
    const n = comptesIcones(plans, e);
    const tous = n.every((x) => x === n[0]);
    const cls = n[0] === 0 && tous ? '' : tous ? 'on' : 'partiel';
    const compte = tous ? n[0] : Math.min(...n);
    const titre = tous
      ? `${ELEMENTS[e].label}${n[0] > 1 ? ` × ${n[0]}` : ''} — clic pour en ajouter une, clic droit pour en retirer une`
      : `${ELEMENTS[e].label} — la sélection n’en porte pas le même nombre partout`;
    return `<button class="ic ${cls}" data-icone="${e}" ${attrIcone} title="${titre}">
      ${elIcon(e, 26)}${compte > 1 || (!tous && compte >= 1) ? `<span class="compte">${compte}${tous ? '' : '+'}</span>` : ''}
    </button>`;
  };
  const nMort = plans.filter((p) => p.mort).length;
  const clsMort = nMort === 0 ? '' : nMort === plans.length ? 'on' : 'partiel';
  return `<div class="choix-icones">
    ${ELEMENT_IDS.map(pastille).join('')}
    <button class="ic sep ${clsMort}" ${attrMort} title="Plan de mort">${elIcon('MORT', 26)}</button>
  </div>`;
}

/**
 * Ajoute ou retire une icône. L'ORDRE compte : c'est celui de la carte, et la
 * première icône est la dominante. Une icône ajoutée vient donc à la suite, et
 * c'est la dernière de son type qui s'en va.
 */
function ajusterIcones(liste, e, delta) {
  const out = liste.slice();
  if (delta > 0) {
    if (out.filter((x) => x === e).length < MAX_ICONES) out.push(e);
  } else {
    const i = out.lastIndexOf(e);
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}

/** X points × <ce qu'on compte>. `ou` vaut la clé du plan, ou « lot ». */
function blocPouvoir(o, ou, rang = 1) {
  const kind = o ? o.kind : '';
  const R = ` data-rang="${rang}"`;
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const elOpts = (choisi) => ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, choisi === e)).join('');
  // Le choix d'une cible du vocabulaire commun. « Séquence » n'y figure que
  // là où compter des séquences veut dire quelque chose : dans les autres
  // lignes ou d'un côté du centre, ce sont des cartes que l'on compte.
  const cibleSel = (choisi, sansSeq) => `<select data-champ-obj="${ou}"${R} data-part="cible">
    ${CIBLES_COMPTE.filter((c) => !(sansSeq && c.id === 'SEQUENCE'))
    .map((c) => opt(c.id, c.label, choisi === c.id)).join('')}</select>`;

  let complement = '';
  if (kind === 'FORMAT') {
    // Un pouvoir de cadrage peut en viser deux : le second est facultatif, et
    // un plan compte dès qu'il porte l'un ou l'autre.
    complement = `<select data-champ-obj="${ou}"${R} data-part="format">
        ${CADRAGES_POUVOIR.map((f) => opt(f, FORMATS[f].label, o.format === f)).join('')}</select>
      <span class="plus">&amp;</span>
      <select data-champ-obj="${ou}"${R} data-part="format2">
        ${opt('', '— aucun', !o.format2)}
        ${CADRAGES_POUVOIR.filter((f) => f !== o.format)
          .map((f) => opt(f, FORMATS[f].label, o.format2 === f)).join('')}</select>`;
  } else if (kind === 'ELEMENT') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="el">${elOpts(o.el)}</select>`;
  } else if (kind === 'ABSENT') {
    complement = cibleSel(cibleDe(o), true);
  } else if (kind === 'DOMINE') {
    // Une présence ne se compare qu'entre pareilles : une icône aux six icônes,
    // un cadrage aux autres cadrages. Les autres cibles n'ont pas de famille où
    // se mesurer, elles ne sont donc pas proposées.
    complement = `<select data-champ-obj="${ou}"${R} data-part="cible">
        ${CIBLES_PRESENCE.map((c) => opt(c, libelleCibleCompte(c, true), cibleDe(o) === c)).join('')}
      </select>
      <select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('PLUS', 'la plus présente', o.sens !== 'MOINS')}
        ${opt('MOINS', 'la moins présente', o.sens === 'MOINS')}
      </select>`;
  } else if (kind === 'PAIRE') {
    // Une troisième icône, facultative : le groupe passe alors du couple au
    // trio. « — aucune » le ramène à deux.
    complement = `<select data-champ-obj="${ou}"${R} data-part="el0">${elOpts(o.els[0])}</select>
      <span class="plus">+</span>
      <select data-champ-obj="${ou}"${R} data-part="el1">${elOpts(o.els[1])}</select>
      <span class="plus">+</span>
      <select data-champ-obj="${ou}"${R} data-part="el2">
        ${opt('', '— aucune', !o.els[2])}${elOpts(o.els[2])}</select>`;
  } else if (kind === 'SANS_TC') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('EGAL', 'à', o.sens !== 'AVANT' && o.sens !== 'APRES')}
        ${opt('AVANT', 'avant', o.sens === 'AVANT')}${opt('APRES', 'après', o.sens === 'APRES')}
      </select>
      <input type="number" class="pts" min="0" max="99" value="${o.seuil}" data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="tc-apercu">${tc(o.seuil)}</span>`;
  } else if (kind === 'MINUTAGE') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('AVANT', 'avant', o.sens !== 'APRES' && o.sens !== 'EGAL')}${opt('APRES', 'après', o.sens === 'APRES')}
        ${opt('EGAL', 'à', o.sens === 'EGAL')}
      </select>
      <input type="number" class="pts" min="0" max="99" value="${o.seuil}" data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="tc-apercu">${tc(o.seuil)}</span>`;
  } else if (kind === 'SEQ_TAILLE') {
    complement = `<input type="number" class="pts" min="1" max="20" value="${o.seuil}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="plus">plan${o.seuil > 1 ? 's' : ''}</span>
      <select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('MIN', 'ou plus', o.sens !== 'MAX')}${opt('MAX', 'ou moins', o.sens === 'MAX')}
      </select>`;
  } else if (kind === 'BOUT') {
    // Rien d'autre à régler : le pouvoir ne compte pas, il regarde la place de
    // sa carte. Seul le côté se choisit.
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('DROITE', 'à droite de ce plan', o.sens !== 'GAUCHE')}
        ${opt('GAUCHE', 'à gauche de ce plan', o.sens === 'GAUCHE')}
      </select>`;
  } else if (kind === 'SEQ_VOISINES') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('AVANT', 'au-dessus de celle-ci', o.sens !== 'APRES')}
        ${opt('APRES', 'en dessous de celle-ci', o.sens === 'APRES')}
      </select>`;
  } else if (kind === 'SEQ_AVEC') {
    // Le seuil compte les **plans porteurs** d'une séquence : « au moins 3
    // plans Arme ». Réglé sur 1 — le défaut —, on retrouve « avec » et « sans ».
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('AVEC', 'avec au moins', o.sens !== 'SANS')}
        ${opt('SANS', 'avec moins de', o.sens === 'SANS')}
      </select>
      <input type="number" class="pts" min="1" max="20" value="${Math.max(1, o.seuil || 1)}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="plus">plan${(o.seuil || 1) > 1 ? 's' : ''}</span>
      <select data-champ-obj="${ou}"${R} data-part="cible">
        ${ciblesSequence().map((c) => opt(c.id, c.label, o.cible === c.id)).join('')}
        ${CIBLES_COMPTE.filter((c) => !ciblesSequence().some((x) => x.id === c.id))
    .map((c) => opt(c.id, c.label, o.cible === c.id)).join('')}
        ${String(o.cible).includes('+') ? opt(o.cible, String(o.cible).split('+')
    .map((e) => (ELEMENTS[e] ? ELEMENTS[e].label : e)).join(' + '), true) : ''}</select>`;
  } else if (kind === 'SEQ_TOUTES') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('MIN', 'a au moins', o.sens !== 'MAX')}${opt('MAX', 'a au plus', o.sens === 'MAX')}
      </select>
      <input type="number" class="pts" min="1" max="20" value="${o.seuil}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="plus">plan${o.seuil > 1 ? 's' : ''}</span>`;
  } else if (kind === 'AILLEURS') {
    complement = `${cibleSel(o.cible, true)}
      <select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('AUTRES', 'dans les autres séquences', o.sens !== 'DESSUS' && o.sens !== 'DESSOUS')}
        ${opt('DESSUS', 'dans celles au-dessus', o.sens === 'DESSUS')}
        ${opt('DESSOUS', 'dans celles en dessous', o.sens === 'DESSOUS')}
      </select>`;
  } else if (kind === 'CENTRE') {
    complement = `${cibleSel(o.cible, true)}
      <select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('GAUCHE', 'à gauche du centre', o.sens !== 'DROITE')}
        ${opt('DROITE', 'à droite du centre', o.sens === 'DROITE')}
      </select>`;
  } else if (kind === 'LOT') {
    complement = `<input type="number" class="pts" min="2" max="20" value="${o.seuil}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      ${cibleSel(o.cible)}`;
  } else if (kind === 'SEUIL') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('MIN', 'au moins', o.sens !== 'MAX')}${opt('MAX', 'au plus', o.sens === 'MAX')}
      </select>
      <input type="number" class="pts" min="0" max="99" value="${o.seuil}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      ${cibleSel(o.cible)}`;
  } else if (kind === 'EXTREME') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('PLUS', 'la plus présente', o.sens !== 'MOINS')}
        ${opt('MOINS', 'la moins présente', o.sens === 'MOINS')}
      </select>`;
  } else if (kind === 'PLAN_ICONES') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('EXACT', 'portant exactement', o.sens !== 'MIN' && o.sens !== 'MAX')}
        ${opt('MIN', 'portant au moins', o.sens === 'MIN')}
        ${opt('MAX', 'portant au plus', o.sens === 'MAX')}
      </select>
      <input type="number" class="pts" min="0" max="12" value="${o.seuil}"
        data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="plus">icône${o.seuil > 1 ? 's' : ''}</span>`;
  } else if (kind === 'PIOCHER') {
    // Rien à régler : la carte du dessus du Chutier s'ajoute à celles de la rivière.
    complement = '<span class="plus">la carte du dessus du Chutier s’ajoute aux cartes de la rivière</span>';
  } else if (kind === 'SEQ_PLUS' || kind === 'PLAN_PLUS') {
    // `n` n'est pas un nombre de points mais un nombre de séquences, ou de
    // plans : le champ de valeur est masqué, et celui-ci le remplace.
    complement = `<input type="number" class="pts" min="1" max="9" value="${o.n}"
        data-champ-obj="${ou}"${R} data-part="n">
      <span class="plus">${kind === 'SEQ_PLUS' ? `séquence${o.n > 1 ? 's' : ''} de plus`
    : `Plan${o.n > 1 ? 's' : ''} de plus, après le dernier tour`}</span>`;
  } else if (kind === 'RACCORD_VAUT') {
    // `n` n'est pas une valeur mais un MODIFICATEUR : il s'ajoute à ce que vaut
    // chacun de vos Raccords. Le libellé le dit, sans quoi « 1 » se lirait comme
    // « vos Raccords valent 1 ».
    complement = `<input type="number" class="pts" min="-20" max="20" value="${o.n}"
        data-champ-obj="${ou}"${R} data-part="n">
      <span class="plus">de plus pour chacun de vos Raccords</span>`;
  } else if (kind === 'DOUBLE') {
    // `n` n'est plus un compte mais un nombre de fois : à 1 la carte compte
    // double, à 2 elle compte triple. Le libellé le rappelle.
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('MOINS', 'de la plus petite carte', o.sens !== 'PLUS')}
        ${opt('PLUS', 'de la plus grosse carte', o.sens === 'PLUS')}
      </select>
      <select data-champ-obj="${ou}"${R} data-part="critere">
        ${Object.entries(CRITERES_DOUBLE).map(([k, l]) => opt(k, l, (o.critere || 'POINTS') === k)).join('')}
      </select>`;
  }

  // Un pouvoir de règle n'a ni valeur en points ni « × » devant lui : la valeur
  // qu'il porte, quand il en a une, est un nombre de séquences ou de plans,
  // et c'est son propre complément qui la règle.
  const regle = estRegle(o);
  return `<div class="champ-bloc">
    <span class="ch-lg">${rang === 2 ? 'Second pouvoir' : 'Pouvoir'}</span>
    <div class="editeur-obj">
      ${regle ? '' : `<input type="number" class="pts" min="-20" max="20" value="${o ? o.n : 1}"
        data-champ-obj="${ou}"${R} data-part="n" ${o ? '' : 'disabled'}>
      <span class="x">${estSi(o) ? 'si' : '×'}</span>`}
      <select data-champ-obj="${ou}"${R} data-part="kind" title="${KIND_LABEL[kind] || 'aucun pouvoir'}"
        >${KINDS.map(([k, l]) => opt(k, l, kind === k)).join('')}</select>
      ${complement}
    </div>
    ${porteeReglable(o) ? `<div class="portee-choix">
      ${PORTEES.map((x) => `<button class="pp ${objPortee(o, store.cfg) === x.id ? 'on' : ''}"
        data-champ-portee="${ou}"${R} data-portee="${x.id}" title="${x.label}">
        ${x.recul ? '◁◁' : ''}${x.gauche ? '◀' : ''} ${x.court} ${x.droite ? '▶' : ''}${x.avance ? '▷▷' : ''}</button>`).join('')}
    </div>` : (o ? `<div class="aide portee-fixe">${porteeFigee(o)}</div>` : '')}
    <div class="apercu-obj">${o ? `${objHTML(o, 26, store.cfg)}<span class="lit">${objLabel(o, store.cfg)}</span>`
      : '<span class="aide">Aucun pouvoir</span>'}</div>
  </div>`;
}

/** L'assemblage d'une carte, dans le panneau : son Gros Plan de gauche, celui de droite. */
function appariement(carte) {
  const liste = (choisi) => `<option value="" ${choisi == null ? 'selected' : ''}>— vide —</option>${
    grosPlansDisponibles().map((m) => `
    <option value="${m.num}" ${m.num === choisi ? 'selected' : ''}>
      ${etiquetteGP(m.affiche)}${m.affiche === m.num ? '' : ` (boîte : ${etiquetteGP(m.num)})`} — ${m.titre || tc(m.tc)}
    </option>`).join('')}`;

  return `<div class="bloc-plan appariement ${carte.appariementModifie ? 'retouche' : ''}">
    <div class="bp-tete">
      <b>Assemblage de la carte</b>
      <button class="pill mini" data-paire-reset="${carte.rang}" ${carte.appariementModifie ? '' : 'disabled'}>↺ boîte</button>
    </div>
    <label class="champ-ligne"><span>Moitié gauche</span>
      <select data-paire="${carte.rang}" data-part="g">${liste(carte.gNum)}</select></label>
    <label class="champ-ligne"><span>Moitié droite</span>
      <select data-paire="${carte.rang}" data-part="d">${liste(carte.dNum)}</select></label>
    <p class="aide">La moitié <b>gauche</b> ne se monte qu’à gauche d’une séquence, la moitié
    <b>droite</b> qu’à droite. L’onglet <b>Assemblage</b> montre toutes les cartes d’un coup, et
    laisse échanger deux moitiés d’un glisser-déposer.</p>
  </div>`;
}

// --- L'assemblage des cartes à deux Gros Plans -------------------------------
// Une carte ordinaire est coupée en deux au centre : un Gros Plan à gauche, un
// à droite. Lesquels vont ensemble, et de quel côté : c'est l'assemblage. Cet
// écran le montre en entier — les vraies moitiés, côte à côte —, laisse en
// échanger deux d'un glisser-déposer, dit quels Gros Plans ne sont sur aucune
// carte ou sur plusieurs, et sait le refaire sous contraintes.

// Deux numéros par Gros Plan, à ne pas confondre. `num` est celui qu'on lit
// sur le plan — renuméroter un plan le change. `ref` est son numéro dans la
// boîte : c'est lui qui **désigne le plan** dans l'assemblage, et le seul que
// `paires` sache relire.

/** Ce que le mélange et le relevé ont besoin de savoir d'un Gros Plan. */
function ficheMoitie(h, ref, scene) {
  return h ? { num: h.num, ref, scene, tc: h.tc, el: h.el.slice(), famille: h.famille,
    transition: h.transition, mort: !!h.mort, objs: objsDe(h), titre: h.titre, plan: h } : null;
}

/** Les cartes, avec leurs deux moitiés. */
function cartesAssemblage() {
  return buildCartesDoubles().map((c) => {
    const m = moitiesDe(c);
    return { id: c.id, rang: c.rang, carte: c, modifie: c.appariementModifie, ajoutee: !!c.ajoutee,
      g: ficheMoitie(m.G, c.gNum, c.gScene), d: ficheMoitie(m.D, c.dNum, c.dScene) };
  });
}

/** Tous les Gros Plans du jeu, qu'une carte les porte ou non. */
function grosPlansTous() {
  return SCENES().map((sc) => ficheMoitie(halfInfo(sc.idx), sc.num, sc.idx)).filter(Boolean);
}

/** Le nom d'une moitié, pour une infobulle : « Gros Plan GP13 — 10' ». */
const nomMoitie = (m) => `${titrePlan(m.plan)}${m.transition ? '' : ` — ${tc(m.tc)}`}`;

/** Écrit l'assemblage d'une carte, ou l'efface s'il retrouve celui de la boîte. */
function poserAppariement(rang, g, d) {
  const c = buildCartesDoubles().find((x) => x.rang === rang);
  if (!c) {
    // La carte n'est plus visible — une carte de la boîte vidée de ses deux
    // moitiés : on écrit quand même, c'est ce qui permet de la faire revenir.
    store.cfg.materiel.paires[rang] = [g ?? null, d ?? null];
    return;
  }
  if ((g ?? null) === (c.gImprime ?? null) && (d ?? null) === (c.dImprime ?? null)) delete store.cfg.materiel.paires[rang];
  else store.cfg.materiel.paires[rang] = [g ?? null, d ?? null];
}

/**
 * Échange deux moitiés. C'est le geste de la table : on prend ce Gros Plan-ci,
 * on le met à la place de celui-là, et réciproquement. Les deux places peuvent
 * être de côtés différents — c'est ainsi qu'un Gros Plan change de côté —, et
 * même sur la même carte : la carte se retourne alors, gauche pour droite.
 */
function echangerMoities(a, b) {
  if (a.rang === b.rang && a.cote === b.cote) return;
  surLeModifie(() => {
    const cartes = buildCartesDoubles();
    const ca = cartes.find((x) => x.rang === a.rang);
    const cb = cartes.find((x) => x.rang === b.rang);
    if (!ca || !cb) return;
    if (ca === cb) { poserAppariement(ca.rang, ca.dNum, ca.gNum); return; }
    const va = a.cote === 'G' ? ca.gNum : ca.dNum;
    const vb = b.cote === 'G' ? cb.gNum : cb.dNum;
    poserAppariement(ca.rang, a.cote === 'G' ? vb : ca.gNum, a.cote === 'D' ? vb : ca.dNum);
    poserAppariement(cb.rang, b.cote === 'G' ? va : cb.gNum, b.cote === 'D' ? va : cb.dNum);
  });
  sauverCfg();
}

/**
 * Pose un Gros Plan précis sur une place. S'il était déjà sur une carte, les
 * deux places s'échangent : un Gros Plan ne se dédouble pas en changeant de
 * carte. S'il n'était nulle part, il prend la place, et celui qui s'y trouvait
 * redevient libre. `ref` désigne le plan par son numéro de boîte.
 */
function poserMoitie(rang, cote, ref) {
  // `ref` nul : on VIDE la place — rien à aller chercher ailleurs.
  const ailleurs = ref == null ? null : surLeModifie(() => {
    for (const x of buildCartesDoubles()) {
      for (const k of ['G', 'D']) {
        if ((k === 'G' ? x.gNum : x.dNum) === ref && !(x.rang === rang && k === cote)) return { rang: x.rang, cote: k };
      }
    }
    return null;
  });
  if (ailleurs) { echangerMoities({ rang, cote }, ailleurs); return; }
  surLeModifie(() => {
    const c = buildCartesDoubles().find((x) => x.rang === rang);
    if (c) poserAppariement(rang, cote === 'G' ? ref : c.gNum, cote === 'D' ? ref : c.dNum);
  });
  sauverCfg();
}

/**
 * Poser un Gros Plan en tapant son numéro sur la place. Ce qui est refusé est
 * dit, plutôt que corrigé en silence. Un champ vidé retire le Gros Plan de la
 * carte. Retourne un message d'erreur, ou `null` si la pose a eu lieu.
 */
function poserNumeroMoitie(rang, cote, texte) {
  const brut = String(texte).trim();
  if (brut === '') { poserMoitie(rang, cote, null); return null; }
  const num = parseInt(brut.replace(/^gp\s*/i, ''), 10);
  if (!Number.isFinite(num)) return `« ${texte} » n’est pas un numéro de Gros Plan.`;
  const m = surLeModifie(() => grosPlansTous().find((x) => x.num === num) || null);
  if (!m) return `Aucun Gros Plan ne porte le n° ${num}.`;
  poserMoitie(rang, cote, m.ref);
  return null;
}

/** Le mélange : on redistribue les Gros Plans, on rend compte, on écrit. */
function melangerAssemblage(brasser) {
  const actives = mat.assemblage.contraintes;
  // Seules les cartes complètes entrent dans le mélange : une place vide ne se brasse pas.
  const cartes = surLeModifie(cartesAssemblage).filter((c) => c.g && c.d);
  if (!cartes.length) return;
  const attendus = exemplairesBoite();
  const avant = bilan(cartes, actives, attendus);
  const r = melangerMoities(cartes, actives, Math.random, 40, brasser, attendus);
  surLeModifie(() => {
    r.cartes.forEach((c, i) => poserAppariement(cartes[i].rang, c.g.ref, c.d.ref));
  });
  sauverCfg();
  mat.assemblage.rapport = { avant, apres: r.bilan, deplaces: r.deplaces, actives: actives.slice(), brasser };
}

/**
 * L'assemblage en texte : une carte par ligne, « gauche | droite », par numéro
 * de boîte, puis les Gros Plans qui ne sont sur aucune carte. C'est ce qu'on
 * colle dans un message pour en faire l'assemblage de la boîte.
 */
function texteAssemblage() {
  return surLeModifie(() => {
    const cartes = cartesAssemblage();
    const rp = repartition(grosPlansTous(), cartes, exemplairesBoite());
    const nom = (m) => (m ? etiquetteGP(m.ref) : '—');
    return [`EDIT 4.1 — assemblage, ${cartes.length} carte${cartes.length > 1 ? 's' : ''} (gauche | droite)`,
      ...cartes.map((c) => `${c.id} : ${nom(c.g)} | ${nom(c.d)}`),
      ...(rp.absents ? [`Sur aucune carte : ${rp.lignes.filter((x) => !x.n).map(nom).join(', ')}`] : []),
      ...(rp.enTrop ? [`Plus que dans la boîte : ${rp.lignes.filter((x) => x.n > x.attendu)
        .map((x) => `${nom(x)} ×${x.n} (boîte : ${x.attendu})`).join(', ')}`] : []),
      ...(rp.enMoins ? [`Moins que dans la boîte : ${rp.lignes.filter((x) => x.n && x.n < x.attendu)
        .map((x) => `${nom(x)} ×${x.n} (boîte : ${x.attendu})`).join(', ')}`] : []),
    ].join('\n');
  });
}

async function copierAssemblage(bouton) {
  const t = texteAssemblage();
  try {
    await navigator.clipboard.writeText(t);
    const avant = bouton.textContent;
    bouton.textContent = '✓ Copié';
    setTimeout(() => { bouton.textContent = avant; }, 1600);
  } catch { window.prompt('L’assemblage, à copier :', t); }
}

/** Le rapport du dernier mélange, contrainte par contrainte. */
function rapportMelange() {
  const r = mat.assemblage.rapport;
  if (!r) return '';
  const nom = (id) => (CONTRAINTES.find((c) => c.id === id) || {}).label || id;
  const lignes = r.actives.map((id) => {
    const n = r.apres.par[id] || 0;
    const av = r.avant.par[id] || 0;
    return `<li class="${n ? 'ko' : 'okc'}"><b>${n ? `✕ ${n} carte${n > 1 ? 's' : ''}` : '✓ tenue'}</b>
      — ${nom(id)}${n || av ? ` <span class="aide">(${av} avant)</span>` : ''}</li>`;
  }).join('');
  const reste = r.apres.mauvaises;
  return `<div class="rapport-melange ${reste ? 'partiel' : 'net'}">
    <b>${reste ? `${reste} carte${reste > 1 ? 's' : ''} ne ${reste > 1 ? 'tiennent' : 'tient'} pas toutes les contraintes`
    : 'Toutes les contraintes sont tenues'}</b>
    — ${r.deplaces} Gros Plan${r.deplaces > 1 ? 's' : ''} ${r.deplaces > 1 ? 'ont' : 'a'} changé de place,
    sur ${r.apres.total * 2}.
    <ul>${lignes || '<li class="aide">Aucune contrainte cochée : le mélange a seulement brassé.</li>'}</ul>
    ${reste ? `<span class="aide">Ce qui ne passe pas est probablement <b>impossible</b> avec ces
      Gros Plans-là : le mélange essaie quarante assemblages et garde le meilleur. Décochez une
      contrainte, ou déplacez une moitié à la main.</span>` : ''}
  </div>`;
}

/** L'image d'une moitié : la vraie carte, ou — pour un plan retouché ou créé — ce que le site en sait. */
function vignetteMoitie(h) {
  if (h.visuel) return `<img class="demi-img" src="${h.visuel}" alt="" loading="lazy" decoding="async" draggable="false">`;
  return `<span class="demi-img compose"><span class="demi-icones">${
    h.el.map((e) => elIcon(e, 16)).join('') || '—'}</span><i>retouché</i></span>`;
}

/**
 * Une place de carte : la moitié qu'elle porte, son numéro, son minutage. Le
 * numéro est un **champ** : le taper est la façon la plus courte de poser un
 * Gros Plan précis — celui qui n'était sur aucune carte, notamment.
 */
function caseMoitie(c, cote) {
  const m = cote === 'G' ? c.g : c.d;
  const nomCote = cote === 'G' ? 'gauche' : 'droite';
  const champ = (valeur) => `<input class="demi-num" type="text" inputmode="numeric" value="${valeur}"
    placeholder="n°" size="3" list="nums-gp" data-numero-moitie="${c.rang}" data-cote="${cote}"
    aria-label="Gros Plan à ${nomCote} de la carte ${c.id}"
    title="Tapez le numéro d’un Gros Plan pour le poser ici">`;
  // Une place VIDE : on y dépose un Gros Plan, ou l'on y tape son numéro.
  if (!m) {
    return `<div class="demi ${cote === 'G' ? 'g' : 'd'} vide" data-demi="${c.rang}" data-cote="${cote}" data-ref=""
      title="Pas de Gros Plan à ${nomCote} : glissez-en un ici, ou tapez son numéro">
      <span class="demi-img manque">${nomCote}</span>
      <span class="demi-pied">${champ('')}</span></div>`;
  }
  const sur = mat.assemblage.surligne;
  const vise = sur && sur.ref === m.ref;
  const convenu = coteConvenu(m);
  const hors = convenu && convenu !== cote;
  return `<div class="demi ${cote === 'G' ? 'g' : 'd'} ${vise ? 'vise' : ''} ${hors ? 'hors-repere' : ''}" draggable="true"
    data-demi="${c.rang}" data-cote="${cote}" data-num="${m.num}" data-ref="${m.ref}"
    title="${nomMoitie(m)} · moitié ${nomCote}${hors
    ? ` — par convention, un ${tc(m.tc)} se range à ${convenu === 'G' ? 'gauche' : 'droite'}` : ''}
Glissez-la sur une autre moitié pour les échanger">
    ${vignetteMoitie(m.plan)}
    <span class="demi-pied">
      ${champ(m.num)}
      <span class="demi-tc ${teinteTc(m.tc)}">${m.transition ? NOMS_TRANSITION[m.transition] || '' : tc(m.tc)}</span>
      ${hors ? '<span class="demi-repere" title="Du côté opposé à la convention">⚠</span>' : ''}
      <button class="demi-vider" data-vider-moitie="${c.rang}" data-cote="${cote}"
        title="Retirer ce Gros Plan de la carte : il redevient libre">✕</button>
    </span>
  </div>`;
}

/** La liste des numéros existants, offerte en complétion aux champs. */
function listeNumeros() {
  return `<datalist id="nums-gp">${grosPlansTous()
    .map((m) => `<option value="${m.num}">${m.transition ? NOMS_TRANSITION[m.transition] : tc(m.tc)}</option>`).join('')}</datalist>`;
}

// Deux grilles, deux façons de les lire. Le tri ne touche à rien : il ne change
// que l'ordre d'affichage. L'assemblage, lui, reste rangé par le rang de la
// carte — c'est lui qui identifie une carte, pas sa place à l'écran.

const TRIS_CARTES = [
  ['CARTE', 'Ordre des cartes', 'D01, D02, D03… — l’ordre de la boîte'],
  ['GAUCHE', 'N° de gauche', 'par le Gros Plan de gauche, du plus petit au plus grand'],
  ['DROITE', 'N° de droite', 'par le Gros Plan de droite, du plus petit au plus grand'],
  ['FAUTES', 'À revoir d’abord', 'les cartes qui ne tiennent pas les contraintes cochées, en tête'],
];

const TRIS_MOITIES = [
  ['NUM', 'N° croissant', 'l’ordre des numéros'],
  ['RARE', 'Les non placés d’abord', 'les Gros Plans qui ne sont sur aucune carte en tête'],
  ['FREQ', 'Les plus présents d’abord', 'ceux qui sont sur le plus de cartes en tête'],
];

/** Le rang de barres de tri : un bouton par ordre, celui en cours allumé. */
function barreTri(cle, tris, actif) {
  return `<span class="tri-assemblage"><span class="aide">Trier</span>${tris
    .map(([id, label, aide]) => `<button class="pill mini ${id === actif ? 'on' : ''}"
      data-${cle}="${id}" title="${aide}">${label}</button>`).join('')}</span>`;
}

/** Les cartes dans l'ordre demandé. Une copie : l'ordre du modèle ne bouge pas. */
function trierCartesAssemblage(cartes, mode, parRang) {
  const l = cartes.slice();
  // Une place vide passe en dernier : elle n'a pas de numéro à comparer.
  const num = (m) => (m ? m.num : Number.MAX_SAFE_INTEGER);
  if (mode === 'GAUCHE') l.sort((a, b) => num(a.g) - num(b.g) || a.rang - b.rang);
  else if (mode === 'DROITE') l.sort((a, b) => num(a.d) - num(b.d) || a.rang - b.rang);
  else if (mode === 'FAUTES') {
    l.sort((a, b) => parRang.get(b.rang).length - parRang.get(a.rang).length || a.rang - b.rang);
  }
  return l;
}

/** Les Gros Plans du relevé dans l'ordre demandé, à égalité par leur numéro. */
function trierMoities(lignes, mode) {
  const l = lignes.slice();
  if (mode === 'RARE') l.sort((a, b) => a.n - b.n || a.num - b.num);
  else if (mode === 'FREQ') l.sort((a, b) => b.n - a.n || a.num - b.num);
  else l.sort((a, b) => a.num - b.num);
  return l;
}

/** Une carte de l'assemblage : ses deux moitiés côte à côte, et ce qui cloche entre elles. */
function carteAssemblage(c, f) {
  const nom = (id) => (CONTRAINTES.find((x) => x.id === id) || {}).label || id;
  const neuve = mat.assemblage.neuve === c.rang;
  return `<div class="carte-assemblage ${f.length ? 'fautive' : ''} ${c.modifie ? 'retouche' : ''} ${neuve ? 'neuve' : ''} ${
    estDesactivee(c.id) ? 'ecartee' : ''}" data-carte-assemblage="${c.rang}">
    <div class="ca-tete">${c.id}${c.modifie ? ' <span class="et-mod" title="Assemblage différent de celui de la boîte">●</span>' : ''}${
  c.ajoutee ? ' <span class="aide" title="Carte créée ici">＋</span>' : ''}${
  estDesactivee(c.id) ? ' <span class="et-hors" title="Écartée de la boîte">écartée</span>' : ''}
      ${f.length ? `<span class="ca-faute" title="${f.map(nom).join(' · ')}">⚠ ${f.length}</span>` : ''}
      <span class="ca-actions">
        <button class="ca-bouton" data-retourner="${c.rang}" title="Retourner : la moitié gauche passe à droite, et la droite à gauche">⇄</button>
        <button class="ca-bouton" data-dupliquer="${c.rang}" title="Dupliquer : un exemplaire de plus de cette carte">⧉</button>
        <button class="ca-bouton suppr" data-supprimer-carte="${c.id}" title="Supprimer cette carte — ses deux Gros Plans redeviennent libres">✕</button>
      </span></div>
    <div class="ca-moities">${caseMoitie(c, 'G')}${caseMoitie(c, 'D')}</div>
  </div>`;
}

/** Le relevé : chaque Gros Plan, et sur combien de cartes il se trouve. */
function tableauRepartition(rp) {
  const sur = mat.assemblage.surligne;
  const cases = trierMoities(rp.lignes, mat.assemblage.triMoities).map((m) => {
    const etat = m.n === 0 ? 'absente' : m.n !== m.attendu ? 'repetee' : '';
    const vise = sur && sur.ref === m.ref;
    const ex = (k) => `${k} exemplaire${k > 1 ? 's' : ''}`;
    return `<button class="case-moitie ${etat} ${vise ? 'vise' : ''}" data-surligne="${m.ref}"
      title="${nomMoitie(m)}${m.n === 0 ? ' — sur aucune carte' : ` — sur ${m.n} carte${m.n > 1 ? 's' : ''}`}${
  m.n !== m.attendu ? ` ; la boîte en imprime ${ex(m.attendu)}` : ''}">
      <b>${etiquetteGP(m.num)}</b><i class="${teinteTc(m.tc)}">${m.transition ? NOMS_TRANSITION[m.transition] : tc(m.tc)}</i><span>${m.n}</span></button>`;
  }).join('');
  return `<div class="repartition"><div class="grille-moities">${cases}</div></div>`;
}

function vueAssemblage() {
  const cartes = cartesAssemblage();
  const actives = mat.assemblage.contraintes;
  const attendus = exemplairesBoite();
  const b = bilan(cartes, actives, attendus);
  const f = fautesParCarte(cartes, actives, attendus);
  const parRang = new Map(cartes.map((c, i) => [c.rang, f[i]]));
  const rp = repartition(grosPlansTous(), cartes, attendus);
  const retouches = Object.keys(store.cfg.materiel.paires).length;
  const incompletes = cartes.filter((c) => !c.g || !c.d).length;
  const s = (k) => (k > 1 ? 's' : '');
  const nom = (m) => etiquetteGP(m.num);
  const sur = mat.assemblage.surligne;
  const enMain = sur ? rp.lignes.find((m) => m.ref === sur.ref) : null;

  return `<p class="aide" style="margin-top:14px">Une carte ordinaire est <b>coupée en deux au
  centre</b> : un Gros Plan à <b>gauche</b>, un à <b>droite</b>. On n’en monte qu’une moitié — la
  gauche à gauche d’une séquence, la droite à droite. Quels Gros Plans vont ensemble, et de quel
  côté : c’est l’<b>assemblage</b>, et il se règle ici.</p>
  <p class="encart repere-assemblage"><b>La convention de l’auteur</b> — un repère, pas un interdit :
  les chronos <b>01’, 10’, 20’, 30’</b> à gauche de la carte ; <b>40’, 50’, 60’, 70’</b> à droite ;
  les <b>« -- »</b> et le <b>Raccord</b> d’un côté comme de l’autre. Une moitié rangée du côté opposé
  porte un <b class="demi-repere">⚠</b>.</p>

  <div class="bilan-assemblage ${rp.absents || rp.enTrop || rp.enMoins || incompletes ? 'a-revoir' : 'net'}">
    <b>${cartes.length} carte${s(cartes.length)}</b> · ${rp.lignes.length} Gros Plans —
    ${rp.absents ? `<b class="lg-absente">${rp.absents} sur aucune carte</b> :
      ${rp.lignes.filter((m) => !m.n).map(nom).join(', ')}`
    : `tous sont sur leurs cartes, en autant d’exemplaires que dans la boîte${rp.doubles
      ? ` — ${rp.doubles} d’entre eux plusieurs fois` : ''}`}
    ${rp.enTrop ? ` · <b class="lg-repetee">${rp.enTrop} en trop</b> :
      ${rp.lignes.filter((m) => m.n > m.attendu).map((m) => `${nom(m)} ×${m.n} (boîte : ${m.attendu})`).join(', ')}` : ''}
    ${rp.enMoins ? ` · <b class="lg-repetee">${rp.enMoins} en moins</b> :
      ${rp.lignes.filter((m) => m.n && m.n < m.attendu).map((m) => `${nom(m)} ×${m.n} (boîte : ${m.attendu})`).join(', ')}` : ''}
    ${incompletes ? ` · <b class="lg-absente">${incompletes} carte${s(incompletes)} incomplète${s(incompletes)}</b>,
      qui ne se jouer${incompletes > 1 ? 'ont' : 'a'} pas tant qu’il lui manque une moitié` : ''}
  </div>

  <div class="assemblage-outils">
    <div class="contraintes">
      <b>Ce qu’un bon assemblage respecte</b>
      ${CONTRAINTES.map((c) => `<label class="chip ${actives.includes(c.id) ? 'on' : ''}"
        title="${c.aide}"><input type="checkbox" data-contrainte="${c.id}"
        ${actives.includes(c.id) ? 'checked' : ''}>${c.label}</label>`).join('')}
    </div>
    <div class="rangee-mini" style="margin-top:10px">
      <button class="pill creer" id="corriger"
        title="Déplace le moins de Gros Plans possible pour tenir les contraintes cochées">🔧 Corriger l’assemblage</button>
      <button class="pill creer" id="melanger"
        title="Redistribue tous les Gros Plans : un autre assemblage, qui tient les contraintes cochées">🎲 Tout mélanger</button>
      <button class="pill mini" id="assemblage-reset" ${retouches ? '' : 'disabled'}>↺ Assemblage de la boîte</button>
      <button class="pill mini creer" id="assemblage-nouvelle"
        title="Une carte vide, à remplir en y glissant ou en y tapant ses deux Gros Plans">＋ Nouvelle carte</button>
      <button class="pill mini" id="assemblage-copier"
        title="L’assemblage en texte — une carte par ligne, « gauche | droite » —, à coller dans un message">📋 Copier l’assemblage</button>
      <span class="aide">${b.mauvaises
    ? `<b>${b.mauvaises} carte${s(b.mauvaises)}</b> sur ${b.total} ne ${b.mauvaises > 1 ? 'tiennent' : 'tient'} pas
       les contraintes cochées.`
    : `Les ${b.total} cartes tiennent les contraintes cochées.`}
      ${retouches ? ` ${retouches} carte${s(retouches)} assemblée${s(retouches)} autrement que dans la boîte.` : ''}</span>
    </div>
    ${rapportMelange()}
  </div>

  <h3 style="margin-top:20px">Les ${cartes.length} cartes</h3>
  ${mat.assemblage.annonce ? `<p class="encart annonce-assemblage">${mat.assemblage.annonce.texte}
    <button class="pill mini" id="annuler-assemblage">↺ Annuler</button></p>` : ''}
  <p class="aide"><b>Glissez</b> une moitié sur une autre pour les <b>échanger</b> — d’une carte à
  l’autre, ou d’un côté à l’autre. Le <b>numéro</b> sous chaque moitié se tape : écrivez celui d’un
  autre Gros Plan, validez d’<b>Entrée</b>, et il vient s’y poser — s’il était sur une autre carte,
  les deux échangent leur place. <b>✕</b> sous une moitié la retire de la carte ; sur une carte,
  <b>⇄</b> la retourne, <b>⧉</b> en ajoute un exemplaire, <b>✕</b> la supprime.${
  enMain ? ` <b class="pose-en-cours">${nom(enMain)} en main</b> — cliquez la place où le poser.` : ''}</p>
  ${mat.assemblage.erreur ? `<p class="encart attention refus-numero">${mat.assemblage.erreur}</p>` : ''}
  ${listeNumeros()}
  ${barreTri('tri-cartes', TRIS_CARTES, mat.assemblage.triCartes)}
  <div class="grille-assemblage">${trierCartesAssemblage(cartes, mat.assemblage.triCartes, parRang)
    .map((c) => carteAssemblage(c, parRang.get(c.rang))).join('')}</div>

  <h3 style="margin-top:22px">Où sont les Gros Plans</h3>
  <p class="aide">Sur combien de cartes chaque Gros Plan se trouve. La boîte en imprime certains
  plusieurs fois — le Raccord, l’Ouverture, la Fin, la plupart des « -- » — et chaque case se compare
  à ce nombre.
  <b class="lg-absente">En rouge</b>, ceux qui ne sont sur <b>aucune carte</b> — ils ne se joueront
  pas. <b class="lg-repetee">En orange</b>, ceux qui n’ont pas le nombre d’exemplaires de la boîte.
  Un clic en prend un <b>en main</b> : les cartes qui le portent s’allument, et un clic sur une
  place l’y pose.</p>
  ${barreTri('tri-moities', TRIS_MOITIES, mat.assemblage.triMoities)}
  ${tableauRepartition(rp)}`;
}

// --- Le tableau complet -----------------------------------------------------

function tableauMateriel() {
  const cat = surLeModifie(catalogue);
  const n = surLeModifie(buildCartesDoubles).length;
  return `<p class="aide" style="margin-top:14px">L’état courant du jeu <b>Modifié</b>, retouches
  comprises : ce que le moteur lit de chaque carte. Le bouton <b>Tableau en PDF</b> en donne la
  version imprimable.</p>
  <div class="tbl-defile">${tableauPlans(cat)}</div>
  <h3 style="margin-top:22px">Les ${n} cartes à deux Gros Plans</h3>
  <div class="tbl-defile">${tableauPaires()}</div>`;
}

// L'en-tête est dans un <thead> : c'est la seule façon qu'il se répète en
// haut de chaque page à l'impression.

function tableauPlans(cat) {
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>Plan</th><th>Cadrage</th><th>Famille</th><th class="num">Chrono</th>
      <th>Icônes — la dominante en premier</th><th>Pouvoir</th><th>État</th></tr></thead>
    <tbody>${cat.map((p) => `<tr class="${p.modifie ? 'ligne-retouchee' : ''}">
      <td class="num"><b>${etiquettePlan(p)}</b>${p.num !== p.numOrigine
    ? ` <span class="aide">(boîte : ${etiquettePlan({ format: p.format, num: p.numOrigine })})</span>` : ''}</td>
      <td>${NOMS_TRANSITION[p.transition] || FORMATS[p.format].label}</td>
      <td>${p.famille}</td>
      <td class="num">${tc(p.tc)}</td>
      <td>${p.el.map((e) => elIcon(e, 20)).join('') || '—'}${p.mort ? elIcon('MORT', 20) : ''}</td>
      <td>${objsDe(p).length ? objsDe(p).map((o) => `${objHTML(o, 20, store.cfg)}
        <span class="aide">${objLabel(o, store.cfg)}</span>`).join('<br>') : '—'}</td>
      <td>${p.modifie ? 'retouché' : 'boîte'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function tableauPaires() {
  const cartes = surLeModifie(buildCartesDoubles);
  const nom = (n) => (n == null ? '—' : etiquetteGP(n));
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>Carte</th><th>Moitié gauche</th><th>Moitié droite</th><th>Boîte</th><th>Assemblage</th></tr></thead>
    <tbody>${cartes.map((c) => `<tr class="${c.appariementModifie ? 'ligne-retouchee' : ''}">
      <td class="num">${c.id}</td><td class="num">${nom(c.gNum)}</td><td class="num">${nom(c.dNum)}</td>
      <td>${estDesactivee(c.id) ? 'écartée' : 'activée'}</td>
      <td>${c.ajoutee ? 'carte créée' : c.appariementModifie
    ? `refait (boîte : ${nom(c.gImprime)} | ${nom(c.dImprime)})` : 'boîte'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// --- Les statistiques -------------------------------------------------------
// On compte le matériel tel qu'il partira en partie : les cartes activées et
// leurs plans. Les deux jeux sont mis côte à côte, pour lire d'un coup d'œil ce
// que les retouches ont déplacé.

function plansDuPaquet() {
  const { doubles, larges, departs } = construirePaquet();
  const out = [];
  for (const c of doubles) { const m = moitiesDe(c); out.push(...[m.G, m.D].filter(Boolean)); }
  for (const c of larges) out.push(plHalf(c));
  // Un plan de départ est sur plusieurs cartes de départ : on le compte une fois.
  const vus = new Set();
  for (const d of departs) for (const f of d.faces) {
    if (vus.has(f.num)) continue;
    vus.add(f.num); out.push(plHalf({ ...f, depart: true }));
  }
  return out;
}

/** Les filtres de l'onglet Statistiques : on ne compte que ce qui passe. */
function passeStats(h) {
  const f = mat.statsFiltres;
  if (f.format && h.format !== f.format) return false;
  if (f.icone) {
    if (f.icone === 'AUCUNE') { if (h.el.length) return false; }
    else if (f.icone === 'MORT') { if (!h.mort) return false; }
    else if (!h.el.includes(f.icone)) return false;
  }
  if (f.pouvoir) {
    if (f.pouvoir === 'AVEC') { if (!objsDe(h).length) return false; }
    else if (f.pouvoir === 'SANS') { if (objsDe(h).length) return false; }
    else if (!objsDe(h).some((o) => o.kind === f.pouvoir)) return false;
  }
  return true;
}

function statsJeu(modifie) {
  const etait = store.cfg.materielActif;
  appliquerMateriel(modifie ? store.cfg.materiel : null, store.cfg.cartesDesactivees, store.cfg.materiel);
  try {
    const tous = plansDuPaquet();
    const plans = tous.filter(passeStats);
    const s = {
      plans: plans.length,
      cadrages: { PL: 0, GP: 0, DEP: 0 },
      elements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])),
      // Ce que les pouvoirs réclament, par icône : une autre grandeur que ce
      // que les cartes portent, et qu'on ne doit pas y mélanger.
      demandes: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])),
      demandeMort: 0,
      morts: 0, sansIcone: 0, sansPouvoir: 0,
      pouvoirs: Object.fromEntries(KINDS.filter(([k]) => k).map(([k]) => [k, 0])),
      tcMin: 99, tcMax: 0, tcSomme: 0, minutes: 0,
      // Combien de plans portent chaque minutage, « -- » compris.
      minutages: {},
    };
    for (const h of plans) {
      s.cadrages[h.format]++;
      // Une carte peut porter deux fois la même icône : chacune compte.
      for (const e of h.el) if (s.elements[e] !== undefined) s.elements[e]++;
      if (h.mort) s.morts++;
      if (!h.el.length) s.sansIcone++;
      const os = objsDe(h);
      if (os.length) for (const o of os) s.pouvoirs[o.kind]++; else s.sansPouvoir++;
      // Un couple réclame ses deux icônes ; une absence réclame la sienne, en
      // creux, mais c'est bien elle que le pouvoir désigne.
      for (const o of os) {
        if (o.kind === 'ELEMENT' || o.kind === 'ABSENT') { if (s.demandes[o.el] !== undefined) s.demandes[o.el]++; }
        else if (o.kind === 'PAIRE') for (const e of o.els) { if (s.demandes[e] !== undefined) s.demandes[e]++; }
        else if (o.kind === 'MORT') s.demandeMort++;
      }
      s.minutages[h.tc] = (s.minutages[h.tc] || 0) + 1;
      // Un plan sans minutage n'a pas de place dans le film : il n'entre ni
      // dans le plus court, ni dans la moyenne.
      if (!h.tc) continue;
      s.minutes++;
      s.tcMin = Math.min(s.tcMin, h.tc); s.tcMax = Math.max(s.tcMax, h.tc);
      s.tcSomme += h.tc;
    }
    if (!s.minutes) s.tcMin = 0;
    s.tcMoyen = s.minutes ? s.tcSomme / s.minutes : 0;
    s.tous = tous.length;
    const { doubles, larges, departs } = construirePaquet();
    const vus = new Set(); departs.forEach((d) => d.faces.forEach((f) => vus.add(f.num)));
    s.cartes = doubles.length + larges.length + departs.length;
    s.doubles = doubles.length; s.larges = larges.length;
    s.departs = departs.length; s.plansDepart = vus.size;
    return s;
  } finally {
    store.cfg.materielActif = etait;
    appliquerJeuActif();
  }
}

function barreStats() {
  const f = mat.statsFiltres;
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  return `<div class="barre-filtres">
    <label>Cadrage
      <select data-stat="format">${opt('', 'tous', !f.format)}
        ${['GP', 'PL', 'DEP'].map((k) => opt(k, FORMATS[k].label, f.format === k)).join('')}</select></label>
    <label>Icône
      <select data-stat="icone">${opt('', 'toutes', !f.icone)}
        ${ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, f.icone === e)).join('')}
        ${opt('MORT', 'Mort', f.icone === 'MORT')}${opt('AUCUNE', 'aucune icône', f.icone === 'AUCUNE')}</select></label>
    <label>Pouvoir
      <select data-stat="pouvoir">${opt('', 'tous', !f.pouvoir)}
        ${opt('AVEC', 'avec pouvoir', f.pouvoir === 'AVEC')}${opt('SANS', 'sans pouvoir', f.pouvoir === 'SANS')}
        ${KINDS.filter(([k]) => k).map(([k, l]) => opt(k, l, f.pouvoir === k)).join('')}</select></label>
    <button class="pill mini" id="stats-raz">↺ filtres</button>
  </div>`;
}

function vueStats() {
  const imp = statsJeu(false);
  const mod = statsJeu(true);
  const actif = store.cfg.materielActif;
  const off = store.cfg.cartesDesactivees.length;
  const filtre = Object.values(mat.statsFiltres).some(Boolean);

  const ligne = (l, a, b, icone) => {
    const diff = b - a;
    return `<tr class="${diff ? 'ligne-retouchee' : ''}">
      <td>${icone || ''}${l}</td>
      <td class="num ${actif === 'IMPRIME' ? 'col-actif' : ''}">${typeof a === 'number' && !Number.isInteger(a) ? a.toFixed(1) : a}</td>
      <td class="num ${actif === 'MODIFIE' ? 'col-actif' : ''}">${typeof b === 'number' && !Number.isInteger(b) ? b.toFixed(1) : b}</td>
      <td class="num ecart">${diff ? (diff > 0 ? `+${Number.isInteger(diff) ? diff : diff.toFixed(1)}` : (Number.isInteger(diff) ? diff : diff.toFixed(1))) : '—'}</td>
    </tr>`;
  };

  const tableau = (titre, lignes, aide) => `<h3>${titre}</h3>
    ${aide ? `<p class="aide" style="margin:-6px 0 8px">${aide}</p>` : ''}
    <table class="tbl tbl-stats">
      <thead><tr><th></th><th class="num">Boîte</th><th class="num">Modifié</th><th class="num">Écart</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>`;

  return `<p class="aide" style="margin-top:14px">Le matériel tel qu’il part en partie : les
  ${mod.cartes} cartes activées et leurs ${mod.tous} plans — chaque plan de départ compté une fois,
  bien qu’il soit sur plusieurs cartes de départ.
  ${off ? `<b>${off} carte${off > 1 ? 's' : ''}</b> ${off > 1 ? 'sont écartées' : 'est écartée'} de la boîte.` : ''}
  La colonne surlignée est le jeu qui se lance.</p>
  ${barreStats()}
  ${filtre ? `<p class="aide filtre-actif"><b>${imp.plans} plan${imp.plans > 1 ? 's' : ''} retenu${imp.plans > 1 ? 's' : ''}</b>
    sur ${imp.tous} par les filtres — tout ce qui suit ne compte qu’eux, sauf la composition de la boîte.</p>` : ''}

  ${tableau('La boîte', [
    ligne('Cartes à deux Gros Plans', imp.doubles, mod.doubles),
    ligne('Plans Larges', imp.larges, mod.larges),
    ligne('Cartes de départ', imp.departs, mod.departs),
    ligne('Plans de départ', imp.plansDepart, mod.plansDepart),
    ligne(filtre ? 'Plans retenus par les filtres' : 'Plans au total', imp.plans, mod.plans),
  ].join(''), 'Les cartes à deux Gros Plans et les Plans Larges font la pioche ; les cartes de départ se distribuent à part.')}

  ${tableau('Les cadrages', ['GP', 'PL', 'DEP'].map((f) =>
    ligne(FORMATS[f].label, imp.cadrages[f], mod.cadrages[f], cadrageIcon(f))).join(''))}

  ${tableau('Les icônes sur les cartes', [
    ...ELEMENT_IDS.map((e) => ligne(ELEMENTS[e].label, imp.elements[e], mod.elements[e], elIcon(e, 20))),
    ligne('Plans de mort', imp.morts, mod.morts, elIcon('MORT', 20)),
    ligne('Plans sans aucune icône', imp.sansIcone, mod.sansIcone),
  ].join(''))}

  ${tableau('Les icônes réclamées par les pouvoirs', [
    ...ELEMENT_IDS.map((e) => ligne(ELEMENTS[e].label, imp.demandes[e], mod.demandes[e], elIcon(e, 20))),
    ligne('Mort', imp.demandeMort, mod.demandeMort, elIcon('MORT', 20)),
  ].join(''), 'Ce que les pouvoirs cherchent à compter — l’offre du tableau précédent, ici la demande. Un couple réclame ses deux icônes ; une absence réclame la sienne, en creux.')}

  ${tableau('Les pouvoirs', [
    ...KINDS.filter(([k]) => k).map(([k, l]) => ligne(l.replace('…', ''), imp.pouvoirs[k], mod.pouvoirs[k])),
    ligne('Plans sans pouvoir', imp.sansPouvoir, mod.sansPouvoir),
  ].join(''))}

  ${tableau('Les chronos', [
    ligne('Le plus tôt', imp.tcMin, mod.tcMin),
    ligne('Le plus tard', imp.tcMax, mod.tcMax),
    ligne('Moyenne, hors « -- »', imp.tcMoyen, mod.tcMoyen),
    ...[...new Set([...Object.keys(imp.minutages), ...Object.keys(mod.minutages)].map(Number))]
      .sort((a, b) => a - b)
      .map((t) => ligne(`Plans à <span class="tc-apercu ${teinteTc(t)}">${tc(t)}</span>`,
        imp.minutages[t] || 0, mod.minutages[t] || 0)),
  ].join(''), 'En minutes de film. « -- » : le plan n’a pas de chrono, il se range partout.')}`;
}

// --- Les statistiques des pouvoirs ------------------------------------------
// Chaque pouvoir du jeu, recensé tel que le moteur le lit : son dessin, son
// compte, sa part, et ce qu'il vaut.

/** La signature d'un pouvoir : son type et sa cible, sans sa valeur. */
function signatureObj(o) {
  if (!o) return '';
  const c = cibleObj(o);
  const seuil = o.seuil === undefined ? '' : `${o.sens || ''}${o.seuil}`;
  return [o.kind, c, seuil, objPortee(o, store.cfg)].filter(Boolean).join('|');
}

/**
 * Combien de plans du jeu **déclenchent** ce pouvoir. C'est la question qui
 * compte : un pouvoir ne vaut pas sa valeur, il vaut sa valeur multipliée par
 * ce qu'il trouve à compter. « 3 × ⛨ » ne rapporte 3 points que s'il y a une
 * arme sur la table, et 30 s'il en trouve dix.
 *
 * Les pouvoirs qui se lisent « n si … » — absence, ordre, minutage absent — ne
 * se déclenchent qu'une fois : leur compte est 1, quel que soit le matériel.
 */
function declencheurs(obj, plans) {
  if (!obj) return 0;
  switch (obj.kind) {
    case 'RACCORD': return plans.filter((p) => p.transition === 'RACCORD').length;
    case 'PLAN':    return plans.length;
    case 'FORMAT':  return plans.filter((p) => p.format === obj.format || p.format === obj.format2).length;
    case 'ELEMENT': return store.cfg.elementParIcone === false
      ? plans.filter((p) => p.el.includes(obj.el)).length
      : compteIcone(plans, obj.el);
    // Un groupe s'apparie : quatre icônes font deux couples, cinq aussi. C'est
    // le décompte qui sait le faire — il n'y a pas deux façons de compter.
    case 'PAIRE': return compteGroupes(plans, obj.els);
    case 'MORT':    return plans.filter((p) => p.mort).length;
    case 'MINUTAGE': return plans.filter((p) => (obj.sens === 'EGAL' ? p.tc === obj.seuil
      : obj.sens === 'APRES' ? p.tc > obj.seuil : p.tc < obj.seuil)).length;
    // Les « si » : le pouvoir se déclenche, ou pas — jamais plusieurs fois.
    case 'ABSENT': case 'CHRONO': case 'SANS_TC': case 'SEUIL': case 'BOUT': return 1;
    // Les pouvoirs de séquence ne se déclenchent pas sur une carte mais sur la
    // forme du banc : le matériel seul ne peut pas dire combien de fois. On les
    // compte donc une fois — leur plancher honnête. Il en va de même de ceux
    // qui désignent une carte du banc plutôt qu'un contenu.
    case 'SEQ_TAILLE': case 'SEQ_VOISINES': case 'SEQ_LONGUE': case 'SEQ_AVEC':
    case 'SEQ_TOUTES': case 'DOUBLE': case 'EXTREME': case 'ABSENTES':
    case 'DOMINE': return 1;
    // Ceux du vocabulaire commun se comptent comme les autres compteurs : ce
    // que le matériel entier met sur la table.
    case 'AILLEURS': case 'CENTRE': return compteCible(plans, obj.cible, null);
    case 'LOT': return Math.floor(compteCible(plans, obj.cible, null) / Math.max(2, obj.seuil || 2));
    case 'PLAN_ICONES': {
      const k = Math.max(0, obj.seuil ?? 0);
      return plans.filter((p) => !p.transition && (obj.sens === 'MIN' ? p.el.length >= k
        : obj.sens === 'MAX' ? p.el.length <= k : p.el.length === k)).length;
    }
    default: return 0;
  }
}

/**
 * Le recensement des pouvoirs d'un jeu de matériel : un par signature, avec
 * ses valeurs, ses cadrages, ce qui le déclenche et le potentiel de points
 * qu'il met sur la table.
 *
 * `brut` est la simple somme des valeurs — ce que le pouvoir annonce.
 * `points` est ce qu'il peut vraiment rapporter : sa valeur multipliée par le
 * nombre de plans qui le déclenchent, sur tout le matériel.
 */
function pouvoirsDuJeu(modifie) {
  const etait = store.cfg.materielActif;
  appliquerMateriel(modifie ? store.cfg.materiel : null, store.cfg.cartesDesactivees, store.cfg.materiel);
  try {
    const plans = plansDuPaquet().filter(passeStats);
    const par = new Map();
    let avec = 0;
    for (const h of plans) {
      const os = objsDe(h);
      if (!os.length) continue;
      // `avec` compte les plans porteurs, pas les pouvoirs : un plan qui en
      // porte deux reste un plan. Chaque pouvoir, lui, alimente sa ligne.
      avec++;
      for (const o of os) {
        const cle = signatureObj(o);
        const e = par.get(cle) || { obj: o, n: 0, valeurs: new Map(), cadrages: {}, brut: 0 };
        e.n++; e.brut += o.n;
        e.valeurs.set(o.n, (e.valeurs.get(o.n) || 0) + 1);
        e.cadrages[h.format] = (e.cadrages[h.format] || 0) + 1;
        // Le dessin retenu est celui de la valeur la plus fréquente.
        if (e.valeurs.get(o.n) >= (e.valeurs.get(e.obj.n) || 0)) e.obj = o;
        par.set(cle, e);
      }
    }
    // Ce qu'un pouvoir trouve à compter ne dépend que de sa forme, jamais de sa
    // valeur : une seule mesure par signature suffit.
    let points = 0;
    for (const e of par.values()) {
      e.decl = declencheurs(e.obj, plans);
      e.points = e.brut * e.decl;
      e.cadr = Object.values(e.cadrages).reduce((a, b) => a + b, 0);
      points += e.points;
    }
    const liste = [...par.values()].sort((a, b) => b.n - a.n || b.points - a.points);
    return { liste, plans: plans.length, avec, sans: plans.length - avec, points };
  } finally {
    store.cfg.materielActif = etait;
    appliquerJeuActif();
  }
}

/** Une barre de proportion, lisible d'un coup d'œil. */
function barrePart(part) {
  return `<span class="barre-part" title="${(part * 100).toFixed(1)} %">
    <i style="width:${Math.max(2, part * 100).toFixed(1)}%"></i></span>`;
}

// Ce sur quoi chaque colonne trie. Un tableau, une clé par colonne : l'en-tête
// porte son nom, le tri en tire la valeur à comparer.
const TRI_POUVOIRS = {
  points: (e) => e.obj.n,
  effet: (e) => objLabel(e.obj, store.cfg),
  plans: (e) => e.n,
  part: (e) => e.n,
  valeurs: (e) => Math.min(...e.valeurs.keys()),
  cadrages: (e) => e.cadr,
  decl: (e) => e.decl,
  total: (e) => e.points,
  ecart: (e) => e.ecart,
};

const TRI_FAMILLES = {
  famille: (f) => f.l, plans: (f) => f.n, part: (f) => f.n,
  formes: (f) => f.formes, total: (f) => f.points,
};

const TRI_VALEURS = {
  valeur: (v) => v.v, bandeaux: (v) => v.n, part: (v) => v.n, total: (v) => v.points,
};

/**
 * Range une liste selon l'état de tri donné. Les textes se comparent en
 * français — sans quoi « Élément » passerait après « Zone ».
 */
function trierPar(liste, cles, etat) {
  const cle = cles[etat.col] || Object.values(cles)[0];
  return liste.slice().sort((a, b) => {
    const x = cle(a), y = cle(b);
    const d = typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y;
    return d * etat.sens;
  });
}

/**
 * Un en-tête cliquable : le nom, et la flèche du tri en cours. `mode` dit
 * comment la colonne se lit — `num` la cale à droite, `texte` la fait partir
 * dans l'ordre alphabétique quand tout le reste part du plus grand.
 */
function thTri(groupe, col, libelle, etat, mode = '') {
  const on = etat.col === col;
  return `<th class="th-tri ${mode === 'num' ? 'num' : ''} ${on ? 'trie' : ''}"
    data-tri="${groupe}" data-col="${col}" data-sens0="${mode === 'texte' ? 1 : -1}"
    title="Trier par ${libelle.toLowerCase()}">${libelle}<i>${on ? (etat.sens < 0 ? '▾' : '▴') : '↕'}</i></th>`;
}

function vuePouvoirs() {
  const imp = pouvoirsDuJeu(false);
  const mod = pouvoirsDuJeu(true);
  const actif = store.cfg.materielActif === 'MODIFIE' ? mod : imp;
  const autre = store.cfg.materielActif === 'MODIFIE' ? imp : mod;
  const nomActif = store.cfg.materielActif === 'MODIFIE' ? 'Modifié' : 'Boîte';
  const nomAutre = store.cfg.materielActif === 'MODIFIE' ? 'Boîte' : 'Modifié';
  const parCle = new Map(autre.liste.map((e) => [signatureObj(e.obj), e]));

  // Par famille de pouvoir, toutes formes confondues.
  const familles = KINDS.filter(([k]) => k).map(([k, l]) => {
    const dans = actif.liste.filter((e) => e.obj.kind === k);
    return {
      k, l: l.replace('…', ''),
      n: dans.reduce((s, e) => s + e.n, 0),
      formes: dans.length,
      points: dans.reduce((s, e) => s + e.points, 0),
    };
  }).filter((f) => f.n).sort((a, b) => b.n - a.n);

  // Une valeur ne vaut pas la même chose selon le pouvoir qui la porte : un 3
  // sur un pouvoir que rien ne déclenche ne rapporte rien. Le total d'une
  // valeur additionne donc, pouvoir par pouvoir, ce qu'elle peut vraiment
  // rapporter.
  const valeurs = new Map();
  for (const e of actif.liste) {
    for (const [v, n] of e.valeurs) {
      const c = valeurs.get(v) || { v, n: 0, points: 0 };
      c.n += n; c.points += v * n * e.decl;
      valeurs.set(v, c);
    }
  }

  // L'écart avec l'autre jeu se calcule avant le tri : c'est une colonne comme
  // une autre, et l'on doit pouvoir trier dessus.
  for (const e of actif.liste) {
    const ref = parCle.get(signatureObj(e.obj));
    e.ecart = e.n - (ref ? ref.n : 0);
  }

  const parValeur = trierPar([...valeurs.values()], TRI_VALEURS, mat.triValeurs);
  const parFamille = trierPar(familles, TRI_FAMILLES, mat.triFamilles);
  const parBandeau = trierPar(actif.liste, TRI_POUVOIRS, mat.triPouvoirs);

  const ligne = (e) => {
    const vals = [...e.valeurs.entries()].sort((a, b) => a[0] - b[0])
      .map(([v, n]) => `<span class="val-pouvoir">${v}<i>×${n}</i></span>`).join('');
    const cadrages = ['GP', 'PL', 'DEP'].filter((f) => e.cadrages[f])
      .map((f) => `<span class="cadr-compte">${cadrageIcon(f)}${e.cadrages[f]}</span>`).join('');
    // Le pouvoir se lit en deux temps : ce qu'il vaut, et ce qu'il compte. Le
    // « × » ou le « si » reste avec l'effet — c'est lui qui dit comment la
    // valeur se déclenche.
    return `<tr>
      <td class="pv-pts">${numIcon(e.obj.n, 26)}</td>
      <td class="pv-visuel"><span class="obj-html"><span class="${estSi(e.obj) ? 'si' : 'x'}">${
        estSi(e.obj) ? 'si' : '×'}</span>${objContenu(e.obj, 26, false, store.cfg)}</span></td>
      <td class="pv-texte">${objLabel(e.obj, store.cfg)}</td>
      <td class="num"><b>${e.n}</b></td>
      <td>${barrePart(actif.avec ? e.n / actif.avec : 0)}<span class="pv-part">${(100 * e.n / (actif.avec || 1)).toFixed(1)} %</span></td>
      <td class="pv-vals">${vals}</td>
      <td class="pv-cadr">${cadrages}</td>
      <td class="num">${e.decl}</td>
      <td class="num"><b>${e.points}</b></td>
      <td class="num ecart">${e.ecart ? (e.ecart > 0 ? `+${e.ecart}` : e.ecart) : '—'}</td>
    </tr>`;
  };

  const filtre = Object.values(mat.statsFiltres).some(Boolean);
  const th = (col, l, mode) => thTri('pouvoirs', col, l, mat.triPouvoirs, mode);
  const thF = (col, l, mode) => thTri('familles', col, l, mat.triFamilles, mode);
  const thV = (col, l, mode) => thTri('valeurs', col, l, mat.triValeurs, mode);

  return `<p class="aide" style="margin-top:14px">Tous les pouvoirs du jeu <b>${nomActif}</b> —
  celui qui part en partie —, un par forme distincte. Un pouvoir ne vaut pas sa valeur : il vaut
  sa valeur <b>multipliée par ce qu’il trouve à compter</b>. La colonne
  <b>déclencheurs</b> dit combien de plans du matériel le font marquer, et <b>total</b> ce qu’il
  peut rapporter en tout. La colonne <b>écart</b> compare au jeu ${nomAutre}. Chaque en-tête range
  le tableau.</p>
  ${barreStats()}
  ${filtre ? `<p class="aide filtre-actif">Les filtres ne retiennent que <b>${actif.plans} plans</b>
    — tout ce qui suit ne compte qu’eux.</p>` : ''}

  <div class="pv-cartouches">
    <div class="pv-cartouche"><b>${actif.avec}</b><span>plans portent un pouvoir</span></div>
    <div class="pv-cartouche"><b>${actif.sans}</b><span>plans sans pouvoir</span></div>
    <div class="pv-cartouche"><b>${actif.liste.length}</b><span>formes distinctes</span></div>
    <div class="pv-cartouche"><b>${actif.points}</b><span>points en potentiel</span></div>
    <div class="pv-cartouche"><b>${actif.avec ? (actif.points / actif.avec).toFixed(1) : '0'}</b><span>points par plan porteur</span></div>
  </div>

  <h3>Chaque pouvoir</h3>
  <div class="tbl-defile">
    <table class="tbl tbl-pouvoirs">
      <thead><tr>
        ${th('points', 'Points')}${th('effet', 'Effet', 'texte')}<th>Ce qu’il compte</th>
        ${th('plans', 'Plans', 'num')}${th('part', 'Part')}${th('valeurs', 'Valeurs')}
        ${th('cadrages', 'Cadrages')}${th('decl', 'Déclencheurs', 'num')}
        ${th('total', 'Total', 'num')}${th('ecart', 'Écart', 'num')}
      </tr></thead>
      <tbody>${parBandeau.map(ligne).join('')
        || '<tr><td colspan="10" class="aide">Aucun pouvoir ne passe les filtres.</td></tr>'}</tbody>
    </table>
  </div>

  <h3>Par famille de pouvoir</h3>
  <table class="tbl tbl-pouvoirs">
    <thead><tr>${thF('famille', 'Famille', 'texte')}${thF('plans', 'Plans', 'num')}${thF('part', 'Part')}
      ${thF('formes', 'Formes', 'num')}${thF('total', 'Total', 'num')}</tr></thead>
    <tbody>${parFamille.map((f) => `<tr>
      <td>${f.l}</td><td class="num"><b>${f.n}</b></td>
      <td>${barrePart(actif.avec ? f.n / actif.avec : 0)}<span class="pv-part">${(100 * f.n / (actif.avec || 1)).toFixed(1)} %</span></td>
      <td class="num">${f.formes}</td><td class="num">${f.points}</td>
    </tr>`).join('')}</tbody>
  </table>

  <h3>Par valeur</h3>
  <table class="tbl tbl-pouvoirs">
    <thead><tr>${thV('valeur', 'Valeur')}${thV('bandeaux', 'Pouvoirs', 'num')}${thV('part', 'Part')}
      ${thV('total', 'Total', 'num')}</tr></thead>
    <tbody>${parValeur.map((c) => `<tr>
      <td>${numIcon(c.v, 24)}</td><td class="num"><b>${c.n}</b></td>
      <td>${barrePart(actif.avec ? c.n / actif.avec : 0)}<span class="pv-part">${(100 * c.n / (actif.avec || 1)).toFixed(1)} %</span></td>
      <td class="num">${c.points}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// --- Les branchements -------------------------------------------------------

/**
 * Les gestes de l'assemblage. On prend une moitié, on la lâche sur une autre :
 * les deux s'échangent, d'une carte à l'autre comme d'un côté à l'autre. Tout
 * ce qui se défait d'un clic le propose aussitôt — l'annonce garde de quoi
 * revenir en arrière.
 */
function brancherAssemblage() {
  // Un refus parle du numéro qu'on vient de taper : il n'a plus rien à dire dès
  // qu'on fait autre chose. Seule la saisie d'un numéro le garde.
  const refaire = (garderLeRefus) => {
    if (!garderLeRefus) mat.assemblage.erreur = null;
    vueMateriel();
  };
  const carteDeRang = (rang) => surLeModifie(() => buildCartesDoubles().find((x) => x.rang === rang) || null);
  /** Ce qu'on vient de faire, et de quoi le défaire. */
  const annoncer = (texte, defaire) => { mat.assemblage.annonce = { texte, defaire }; };

  app.querySelectorAll('[data-contrainte]').forEach((el) => el.addEventListener('change', () => {
    const id = el.dataset.contrainte;
    const l = mat.assemblage.contraintes;
    mat.assemblage.contraintes = el.checked ? [...new Set([...l, id])] : l.filter((x) => x !== id);
    // Les contraintes ne se rangent pas dans la configuration : elles disent
    // comment on veut assembler, pas ce que le jeu contient.
    refaire();
  }));

  app.querySelectorAll('[data-tri-cartes]').forEach((el) => el.addEventListener('click', () => {
    mat.assemblage.triCartes = el.dataset.triCartes; refaire();
  }));
  app.querySelectorAll('[data-tri-moities]').forEach((el) => el.addEventListener('click', () => {
    mat.assemblage.triMoities = el.dataset.triMoities; refaire();
  }));

  // Corriger et mélanger réécrivent tout l'assemblage : on garde celui d'avant.
  const refondre = (brasser) => {
    const avant = JSON.stringify(store.cfg.materiel.paires);
    melangerAssemblage(brasser);
    annoncer(brasser ? 'Les Gros Plans ont été redistribués.' : 'L’assemblage a été corrigé.', () => {
      store.cfg.materiel.paires = JSON.parse(avant);
      mat.assemblage.rapport = null;
    });
    mat.assemblage.neuve = null;
    refaire();
  };
  const cor = app.querySelector('#corriger');
  if (cor) cor.addEventListener('click', () => refondre(false));
  const mel = app.querySelector('#melanger');
  if (mel) mel.addEventListener('click', () => refondre(true));

  // Créer, dupliquer, retourner, supprimer : la composition du jeu, sans quitter l'écran.
  const derniereCarte = () => surLeModifie(() => Math.max(...buildCartesDoubles().map((c) => c.rang)));
  const nouv = app.querySelector('#assemblage-nouvelle');
  if (nouv) {
    nouv.addEventListener('click', () => {
      composition().ajouts.paires.push({ g: null, d: null });
      sauverCfg();
      mat.assemblage.neuve = derniereCarte(); mat.assemblage.annonce = null;
      refaire();
    });
  }
  app.querySelectorAll('[data-dupliquer]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const c = carteDeRang(+b.dataset.dupliquer);
    if (!c) return;
    composition().ajouts.paires.push({ g: c.gNum, d: c.dNum });
    sauverCfg();
    mat.assemblage.neuve = derniereCarte(); mat.assemblage.annonce = null;
    refaire();
  }));
  app.querySelectorAll('[data-retourner]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const rang = +b.dataset.retourner;
    echangerMoities({ rang, cote: 'G' }, { rang, cote: 'D' });
    mat.assemblage.annonce = null;
    refaire();
  }));
  // Supprimer sans question : c'est réversible, et l'écran l'offre aussitôt.
  app.querySelectorAll('[data-supprimer-carte]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = b.dataset.supprimerCarte;
    const m = composition();
    m.retires = [...new Set([...m.retires, id])];
    sauverCfg();
    annoncer(`Carte ${id} supprimée — ses Gros Plans sont de nouveau libres.`, () => {
      const k = composition();
      k.retires = k.retires.filter((x) => x !== id);
    });
    mat.assemblage.neuve = null;
    refaire();
  }));
  // Vider une place. Une carte de la boîte vidée de ses DEUX moitiés sort du
  // jeu : on le dit, et on offre d'y revenir.
  app.querySelectorAll('[data-vider-moitie]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const rang = +b.dataset.viderMoitie;
    const c = carteDeRang(rang);
    if (!c) return;
    const avant = [c.gNum, c.dNum];
    poserMoitie(rang, b.dataset.cote, null);
    mat.assemblage.annonce = null;
    if (!carteDeRang(rang)) {
      annoncer(`Carte ${c.id} vidée de ses deux moitiés : elle n’est plus dans le jeu.`,
        () => surLeModifie(() => poserAppariement(rang, avant[0], avant[1])));
    }
    refaire();
  }));
  const annuler = app.querySelector('#annuler-assemblage');
  if (annuler) annuler.addEventListener('click', () => {
    const a = mat.assemblage.annonce;
    if (a && a.defaire) a.defaire();
    mat.assemblage.annonce = null;
    sauverCfg();
    refaire();
  });
  const cop = app.querySelector('#assemblage-copier');
  if (cop) cop.addEventListener('click', () => copierAssemblage(cop));

  const raz = app.querySelector('#assemblage-reset');
  if (raz) raz.addEventListener('click', () => {
    const avant = JSON.stringify(store.cfg.materiel.paires);
    store.cfg.materiel.paires = {};
    mat.assemblage.rapport = null;
    annoncer('L’assemblage est revenu à celui de la boîte.', () => { store.cfg.materiel.paires = JSON.parse(avant); });
    sauverCfg(); refaire();
  });

  // Prendre un Gros Plan en main depuis le relevé ; recliquer le repose.
  app.querySelectorAll('[data-surligne]').forEach((el) => el.addEventListener('click', () => {
    const ref = +el.dataset.surligne;
    const s2 = mat.assemblage.surligne;
    mat.assemblage.surligne = s2 && s2.ref === ref ? null : { ref };
    refaire();
  }));

  // Taper un numéro sur une place y pose ce Gros Plan. Le champ vit dans une
  // case qui se glisse, et il ne doit pas l'en empêcher : il ne reçoit la
  // souris qu'une fois ouvert par un CLIC sur la case (voir plus bas).
  app.querySelectorAll('[data-numero-moitie]').forEach((inp) => {
    const demi = inp.closest('.demi');
    const glissable = demi && !demi.classList.contains('vide');
    const avant = inp.value;
    inp.addEventListener('focus', () => { if (demi) { demi.draggable = false; demi.classList.add('edition'); } inp.select(); });
    inp.addEventListener('blur', () => {
      if (demi) { demi.classList.remove('edition'); if (glissable) demi.draggable = true; }
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
      // Échap rend la main sans rien changer : on peut se raviser.
      if (e.key === 'Escape') { inp.value = avant; inp.blur(); }
    });
    inp.addEventListener('change', () => {
      if (inp.value.trim() === avant) return;
      mat.assemblage.erreur = poserNumeroMoitie(+inp.dataset.numeroMoitie, inp.dataset.cote, inp.value);
      mat.assemblage.annonce = null;
      refaire(true);
    });
  });

  let prise = null;
  app.querySelectorAll('[data-demi]').forEach((el) => {
    const ici = () => ({ rang: +el.dataset.demi, cote: el.dataset.cote });
    el.addEventListener('dragstart', (e) => {
      prise = ici();
      el.classList.add('prise');
      e.dataTransfer.effectAllowed = 'move';
      // Certains navigateurs refusent le glissé sans charge utile.
      e.dataTransfer.setData('text/plain', `${prise.cote}:${prise.rang}`);
    });
    el.addEventListener('dragend', () => { el.classList.remove('prise'); prise = null; });
    el.addEventListener('dragover', (e) => {
      const la = ici();
      if (!prise || (prise.rang === la.rang && prise.cote === la.cote)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('cible');
    });
    el.addEventListener('dragleave', () => el.classList.remove('cible'));
    // Un clic, quand un Gros Plan est en main : on le POSE ici. C'est ce qui
    // fait entrer un Gros Plan qui n'était sur aucune carte.
    el.addEventListener('click', (e) => {
      // Le champ déjà ouvert, ou le bouton qui vide : ils ont leur propre geste.
      if (e.target.closest('[data-numero-moitie]') || e.target.closest('[data-vider-moitie]')) return;
      const v = mat.assemblage.surligne;
      if (v && String(v.ref) !== el.dataset.ref) {
        const la = ici();
        poserMoitie(la.rang, la.cote, v.ref);
        mat.assemblage.surligne = null;
        mat.assemblage.annonce = null;
        refaire();
        return;
      }
      // Sinon, un clic sans glisser ouvre le numéro à la saisie.
      const inp = el.querySelector('[data-numero-moitie]');
      if (inp) inp.focus();
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('cible');
      if (!prise) return;
      echangerMoities(prise, ici());
      prise = null;
      mat.assemblage.annonce = null;
      refaire();
    });
  });
}

function brancherMateriel() {
  const refaire = () => vueMateriel();
  const refaireEditeur = () => {
    const e = app.querySelector('#editeur');
    if (!e) return refaire();
    e.innerHTML = panneauEditeur();
    brancherEditeur(refaireEditeur);
    brancherApercu(e);
    majTuiles();
  };
  // Le même, en beaucoup moins cher : une sélection ne touche à aucune carte,
  // les tuiles gardent donc leur dessin et seul leur liseré bouge.
  const refaireChoix = () => {
    const e = app.querySelector('#editeur');
    if (!e) return refaire();
    majSelection();
    e.innerHTML = panneauEditeur();
    brancherEditeur(refaireEditeur);
    brancherApercu(e);
  };

  // La sélection survit au changement de vue : on peut régler d'un coup des
  // Gros Plans et des Plans Larges pris dans deux galeries différentes.
  app.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => {
    // Le refus d'un numéro ne survit pas au changement d'écran : il parlait
    // d'une saisie qu'on ne voit plus.
    mat.assemblage.erreur = null; mat.assemblage.annonce = null; mat.assemblage.surligne = null;
    mat.vue = b.dataset.vue; refaire();
  }));

  app.querySelectorAll('[data-jeu]').forEach((b) => b.addEventListener('click', () => {
    store.cfg.materielActif = b.dataset.jeu; sauverCfg(); refaire();
  }));
  // Une carte de départ s'écarte de la boîte, ou y revient.
  app.querySelectorAll('[data-depart-boite]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.departBoite;
    activerCartes([id], estDesactivee(id));
    refaire();
  }));

  app.querySelectorAll('[data-filtre]').forEach((el) => el.addEventListener('change', () => {
    if (el.dataset.filtre === 'tri') mat.tri = el.value;
    else mat.filtres[el.dataset.filtre] = el.value;
    refaire();
  }));

  const raz = app.querySelector('#filtres-raz');
  if (raz) raz.addEventListener('click', () => {
    mat.filtres = { icone: '', pouvoir: '', tcMin: '', tcMax: '', etat: '', actif: '', famille: '' };
    mat.tri = 'num'; refaire();
  });

  // Un clic simple remplace la sélection ; ⌘ (ou Ctrl) + clic ajoute ou retire
  // une carte isolée ; maj + clic prend toute la série depuis la dernière
  // cliquée. Rien n'est perdu de ce qui était pris dans une autre vue.
  const tuiles = trier(tuilesDe(mat.vue).filter(passeFiltres));
  app.querySelectorAll('[data-tuile]').forEach((el) => el.addEventListener('click', (ev) => {
    const rang = +el.dataset.rang;
    if (ev.shiftKey && mat.ancre !== null && mat.ancreVue === mat.vue) {
      const [a, b] = [Math.min(mat.ancre, rang), Math.max(mat.ancre, rang)];
      for (let i = a; i <= b; i++) ajouterTuile(tuiles[i]);
    } else if (ev.metaKey || ev.ctrlKey || ev.shiftKey) {
      basculerTuile(tuiles[rang]);
    } else {
      mat.plans.clear(); mat.cartes.clear();
      ajouterTuile(tuiles[rang]);
    }
    mat.ancre = rang;
    mat.ancreVue = mat.vue;
    refaireChoix();
  }));

  // Créer un plan : il apparaît dans la galerie, et l'éditeur s'ouvre dessus —
  // on vient de le faire, c'est là qu'on veut être. Une carte créée est vide :
  // c'est à l'Assemblage qu'on la remplit, et c'est là qu'on la retrouve.
  app.querySelectorAll('[data-creer]').forEach((b) => b.addEventListener('click', () => {
    const fait = creerCarte(b.dataset.creer);
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null;
    if (fait.carte) {
      const cartes = surLeModifie(buildCartesDoubles);
      mat.assemblage.neuve = cartes.length ? Math.max(...cartes.map((c) => c.rang)) : null;
      mat.assemblage.annonce = null;
      mat.vue = 'ASSEMBLAGE';
    } else {
      fait.cles.forEach((c) => mat.plans.add(c));
      (fait.cartes || []).forEach((c) => mat.cartes.add(c));
    }
    refaire();
  }));

  const restaurer = app.querySelector('#compo-restaurer');
  if (restaurer) restaurer.addEventListener('click', () => { restaurerTout(); refaire(); });

  const tout = app.querySelector('#sel-tout');
  if (tout) tout.addEventListener('click', () => { tuiles.forEach(ajouterTuile); refaireChoix(); });
  const rien = app.querySelector('#sel-rien');
  if (rien) rien.addEventListener('click', () => {
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null; refaireChoix();
  });

  app.querySelectorAll('[data-stat]').forEach((el) => el.addEventListener('change', () => {
    mat.statsFiltres[el.dataset.stat] = el.value; refaire();
  }));

  // Les en-têtes rangent leur tableau. Recliquer la même colonne inverse le
  // sens ; une nouvelle colonne part du plus parlant — décroissant sur un
  // nombre, alphabétique sur un texte.
  const ETATS_TRI = { pouvoirs: 'triPouvoirs', familles: 'triFamilles', valeurs: 'triValeurs' };
  app.querySelectorAll('[data-tri][data-col]').forEach((el) => el.addEventListener('click', () => {
    const etat = mat[ETATS_TRI[el.dataset.tri]];
    if (!etat) return;
    if (etat.col === el.dataset.col) etat.sens = -etat.sens;
    else { etat.col = el.dataset.col; etat.sens = +el.dataset.sens0; }
    refaire();
  }));
  const sraz = app.querySelector('#stats-raz');
  if (sraz) sraz.addEventListener('click', () => {
    mat.statsFiltres = { format: '', icone: '', pouvoir: '' }; refaire();
  });

  const ex = app.querySelector('#mat-export');
  if (ex) ex.addEventListener('click', exporterMateriel);
  const cx = app.querySelector('#csv-export');
  if (cx) cx.addEventListener('click', exporterCSV);
  const ci = app.querySelector('#csv-import');
  if (ci) ci.addEventListener('click', () => importerCSV(refaire));
  const pl = app.querySelector('#partage-lien');
  if (pl) pl.addEventListener('click', () => partagerParLien(pl));
  const pf = app.querySelector('#partage-fichier');
  if (pf) pf.addEventListener('click', () => partagerParFichier(pf));
  const pc = app.querySelector('#partage-charger');
  const pe = app.querySelector('#partage-fichier-entree');
  if (pc && pe) {
    pc.addEventListener('click', () => pe.click());
    pe.addEventListener('change', () => {
      const f = pe.files && pe.files[0];
      pe.value = '';
      if (f) chargerFichierPartage(f);
    });
  }
  const pub = app.querySelector('#materiel-publier');
  if (pub) pub.addEventListener('click', () => publierMateriel(pub));
  const ad = app.querySelector('#adopter-publie');
  if (ad) ad.addEventListener('click', () => {
    if (!materielVide(store.cfg.materiel)
      && !confirm('Adopter le matériel du site remplacera vos retouches locales. Continuer ?')) return;
    adopterPublie(true);
    refaire();
  });

  brancherEditeur(refaireEditeur);
}

function ajouterTuile(t) {
  if (!t) return;
  plansTuile(t).forEach((h) => mat.plans.add(h.cle));
  if (t.genre === 'CARTE') mat.cartes.add(t.id);
}

function basculerTuile(t) {
  if (!t) return;
  const cles = plansTuile(t).map((h) => h.cle);
  const dedans = cles.every((c) => mat.plans.has(c));
  if (dedans) {
    cles.forEach((c) => mat.plans.delete(c));
    if (t.genre === 'CARTE') mat.cartes.delete(t.id);
  } else {
    cles.forEach((c) => mat.plans.add(c));
    if (t.genre === 'CARTE') mat.cartes.add(t.id);
  }
}

/**
 * Ce qu'une SÉLECTION change, et rien de plus : le liseré des tuiles retenues,
 * la ligne qui les compte, et le bouton qui les relâche. Les images de la
 * galerie restent en place.
 *
 * `majTuiles`, elle, refait chaque tuile — c'est ce qu'il faut après une
 * RETOUCHE, où la carte elle-même a changé.
 */
function majSelection() {
  const tuiles = trier(tuilesDe(mat.vue).filter(passeFiltres));
  app.querySelectorAll('[data-tuile]').forEach((el) => {
    const t = tuiles[+el.dataset.rang];
    if (t) el.classList.toggle('sel', tuileChoisie(t));
  });
  const compte = app.querySelector('#compte-selection');
  if (compte) compte.innerHTML = compteSelection();
  const rien = app.querySelector('#sel-rien');
  if (rien) rien.disabled = !mat.plans.size;
}

function majTuiles() {
  const tuiles = trier(tuilesDe(mat.vue).filter(passeFiltres));
  app.querySelectorAll('[data-tuile]').forEach((el) => {
    const t = tuiles[+el.dataset.rang];
    if (!t) return;
    el.innerHTML = htmlTuile(t);
    el.classList.toggle('hors-boite', t.genre === 'CARTE' && estDesactivee(t.id));
    brancherApercu(el);
  });
}

function brancherEditeur(refaire) {
  const plans = plansSelectionnes();
  const lot = plans.length > 1;

  app.querySelectorAll('[data-boite]').forEach((el) => el.addEventListener('click', () => {
    activerCartes([...mat.cartes], el.dataset.boite === '1');
    refaire();
  }));

  // Supprimer efface du matériel, pas seulement de la boîte : on prévient de ce
  // qui part avec, et l'on n'y va qu'une fois d'accord.
  app.querySelectorAll('[data-supprimer]').forEach((el) => el.addEventListener('click', () => {
    const ids = el.dataset.supprimer.split(' ').filter(Boolean);
    if (!ids.length) return;
    const avec = consequencesSuppression(ids).filter((x) => !ids.includes(x));
    const plans = ids.some((id) => /^(SC|P)\d/.test(id));
    const quoi = ids.length > 1 ? `ces ${ids.length} ${plans ? 'plans' : 'cartes'}` : (plans ? 'ce plan' : 'cette carte');
    const suite = avec.length
      ? `\n\n${avec.length} carte${avec.length > 1 ? 's' : ''} à deux Gros Plans `
        + `${avec.length > 1 ? 'les portent et partiront' : 'le porte et partira'} avec.`
      : '';
    // eslint-disable-next-line no-alert -- supprimer du matériel n'est pas un
    // réglage : mieux vaut une question de trop qu'une carte perdue sans le voir.
    if (!confirm(`Retirer ${quoi} du matériel ?${suite}\n\nCela reste réversible :`
      + ' « ↺ Restaurer les supprimées », en haut de l’écran Matériel.')) return;
    supprimerCartes(ids);
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null;
    vueMateriel();
  }));

  app.querySelectorAll('[data-champ-tc]').forEach((el) => el.addEventListener('change', () => {
    appliquerTc([el.dataset.champTc], el.value); sauverCfg(); refaire();
  }));

  // Renuméroter ne touche qu'un plan : appliquer le même numéro à toute une
  // sélection ne ferait que des doublons.
  app.querySelectorAll('[data-champ-num]').forEach((el) => el.addEventListener('change', () => {
    const cle = el.dataset.champNum;
    const v = Math.max(0, Math.min(999, parseInt(el.value, 10) || 0));
    surLeModifie(() => {
      const p = planDeCle(cle);
      retoucher(cle, 'num', p && p.imprime.num === v ? undefined : v);
    });
    sauverCfg();
    // Un doublon change l'alerte en tête d'écran : on repeint tout.
    vueMateriel();
  }));

  const bougerIcone = (cle, e, delta) => {
    const p = surLeModifie(() => planDeCle(cle));
    poserIcones([cle], ajusterIcones(p ? p.el : [], e, delta));
    sauverCfg(); refaire();
  };
  app.querySelectorAll('[data-plan-icone]').forEach((el) => {
    el.addEventListener('click', () => bougerIcone(el.dataset.planIcone, el.dataset.icone, +1));
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault(); bougerIcone(el.dataset.planIcone, el.dataset.icone, -1);
    });
  });

  // Passer une icône en tête : c'est elle, alors, la dominante.
  app.querySelectorAll('[data-dominante]').forEach((el) => el.addEventListener('click', () => {
    const cle = el.dataset.dominante;
    const p = surLeModifie(() => planDeCle(cle));
    const i = +el.dataset.rang;
    if (!p || !i || i >= p.el.length) return;
    poserIcones([cle], [p.el[i], ...p.el.slice(0, i), ...p.el.slice(i + 1)]);
    sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-plan-mort]').forEach((el) => el.addEventListener('click', () => {
    const cle = el.dataset.planMort;
    const p = surLeModifie(() => planDeCle(cle));
    poserMort([cle], !(p && p.mort)); sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-plan-reset]').forEach((el) => el.addEventListener('click', () => {
    delete store.cfg.materiel.plans[el.dataset.planReset]; sauverCfg(); refaire();
  }));

  // Vider les icônes ou le pouvoir : la valeur devient « rien », ce qui n'est
  // pas la même chose que revenir à la boîte.
  app.querySelectorAll('[data-vider]').forEach((el) => el.addEventListener('click', () => {
    const cles = el.dataset.cles.split(' ').filter(Boolean);
    if (el.dataset.vider === 'el') { poserIcones(cles, []); poserMort(cles, false); }
    else poserObj(cles, null, +(el.dataset.rang || 1));
    sauverCfg(); refaire();
  }));

  // Ouvrir le second pouvoir du plan : on y pose un pouvoir par défaut, que
  // l'on règle ensuite comme le premier.
  app.querySelectorAll('[data-second]').forEach((el) => el.addEventListener('click', () => {
    poserObj(el.dataset.second.split(' ').filter(Boolean), OBJ.plan(1), 2);
    sauverCfg(); refaire();
  }));

  // Le pouvoir : en solo il s'applique au fil des changements, en lot il
  // attend son bouton.
  app.querySelectorAll('[data-champ-obj]').forEach((el) => el.addEventListener('change', () => {
    const cibles = el.dataset.champObj === 'lot' ? plans.map((p) => p.cle) : [el.dataset.champObj];
    majObjectif(cibles, el.dataset.part, el.value, +(el.dataset.rang || 1));
    sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-champ-portee]').forEach((el) => el.addEventListener('click', () => {
    const cibles = el.dataset.champPortee === 'lot' ? plans.map((p) => p.cle) : [el.dataset.champPortee];
    majObjectif(cibles, 'portee', el.dataset.portee, +(el.dataset.rang || 1));
    sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-paire]').forEach((el) => el.addEventListener('change', () => {
    const rang = el.dataset.paire;
    // Par son RANG, pas par sa place : une carte supprimée laisse son rang
    // vide, et les suivantes ne glissent pas d'un cran.
    const c = surLeModifie(buildCartesDoubles).find((x) => x.rang === +rang);
    if (!c) return;
    // Choisir un Gros Plan qui est déjà sur une carte échange les deux places :
    // un Gros Plan ne se dédouble pas en changeant de carte.
    poserMoitie(+rang, el.dataset.part === 'g' ? 'G' : 'D', el.value === '' ? null : +el.value);
    // La carte porte d'autres plans : c'est eux que l'éditeur doit montrer.
    const neuve = cartesDe('CARTES').find((x) => x.rang === +rang);
    mat.plans.clear();
    if (neuve) neuve.plans.forEach((h) => mat.plans.add(h.cle));
    else mat.cartes.clear();
    vueMateriel();
  }));

  app.querySelectorAll('[data-paire-reset]').forEach((el) => el.addEventListener('click', () => {
    delete store.cfg.materiel.paires[el.dataset.paireReset]; sauverCfg(); vueMateriel();
  }));

  if (!lot) return;
  brancherLot(plans, refaire);
}

// --- Le lot -----------------------------------------------------------------
// Rien à confirmer : un lot se règle exactement comme un plan seul, chaque
// geste partant aussitôt sur toute la sélection.

function brancherLot(plans, refaire) {
  const cles = plans.map((p) => p.cle);

  const bTc = app.querySelector('[data-lot-tc]');
  if (bTc) bTc.addEventListener('change', () => { appliquerTc(cles, bTc.value); sauverCfg(); refaire(); });

  // En lot, chaque plan gagne — ou perd — une icône du type cliqué.
  const bougerLot = (e, delta) => {
    for (const p of plans) poserIcones([p.cle], ajusterIcones(p.el, e, delta));
    sauverCfg(); refaire();
  };
  app.querySelectorAll('[data-lot-icone]').forEach((el) => {
    el.addEventListener('click', () => bougerLot(el.dataset.icone, +1));
    el.addEventListener('contextmenu', (ev) => { ev.preventDefault(); bougerLot(el.dataset.icone, -1); });
  });

  const bMort = app.querySelector('[data-lot-mort]');
  if (bMort) bMort.addEventListener('click', () => {
    poserMort(cles, !plans.every((p) => p.mort));
    sauverCfg(); refaire();
  });

  const rz = app.querySelector('[data-lot-reset]');
  if (rz) rz.addEventListener('click', () => {
    for (const c of cles) delete store.cfg.materiel.plans[c];
    sauverCfg(); refaire();
  });

  app.querySelectorAll('[data-oter]').forEach((el) => el.addEventListener('click', () => {
    mat.plans.delete(el.dataset.oter);
    vueMateriel();
  }));
}

// --- Écrire une valeur sur un ou plusieurs plans ----------------------------
// Une valeur identique à celle de la boîte n'est pas une retouche : on
// l'efface de la couche, pour que le compteur de retouches dise la vérité.

const borne = (v) => Math.max(0, Math.min(99, parseInt(v, 10) || 0));

function appliquerTc(cles, valeur) {
  if (valeur === '' || valeur === null) return;
  const v = borne(valeur);
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      retoucher(c, 'tc', p && p.imprime.tc === v ? undefined : v);
    }
  });
}

function poserIcones(cles, liste) {
  // L'ordre est celui de la carte — la dominante en premier —, et les doublons
  // comptent : on ne trie ni ne dédoublonne.
  const ordre = liste.filter((x) => ELEMENT_IDS.includes(x));
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      const imp = p ? p.imprime.el : [];
      const pareil = ordre.length === imp.length && ordre.every((x, k) => x === imp[k]);
      retoucher(c, 'el', pareil ? undefined : ordre.slice());
    }
  });
}

function poserMort(cles, v) {
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      retoucher(c, 'mort', p && p.imprime.mort === v ? undefined : v);
    }
  });
}

function poserObj(cles, obj, rang = 1) {
  const champ = rang === 2 ? 'obj2' : 'obj';
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      const imprime = p ? p.imprime[champ] : null;
      retoucher(c, champ, memeObjectif(obj, imprime) ? undefined : (obj ? JSON.parse(JSON.stringify(obj)) : null));
    }
  });
}

function construireObj(kind, actuel) {
  if (!kind) return null;
  const n = actuel ? actuel.n : 1;
  const e0 = actuel && actuel.el ? actuel.el : (actuel && actuel.els ? actuel.els[0] : ELEMENT_IDS[0]);
  // La cible que le nouveau pouvoir reprend : celle du précédent si elle
  // appartient au vocabulaire commun, sinon son icône, sinon son cadrage.
  const cible0 = actuel && CIBLE_IDS.includes(cibleDe(actuel)) ? cibleDe(actuel)
    : actuel && CIBLE_IDS.includes(actuel.format) ? actuel.format
      : (actuel && actuel.el) || e0;
  const neuf = {
    FORMAT:  () => OBJ.format(n, actuel && actuel.format ? actuel.format : 'GP',
      undefined, actuel && actuel.format2),
    ELEMENT: () => OBJ.element(n, e0),
    ABSENT:  () => OBJ.absent(n, cible0),
    PAIRE:   () => OBJ.paire(n, e0, actuel && actuel.els ? actuel.els[1] : e0,
      undefined, actuel && actuel.els ? actuel.els[2] : undefined),
    MORT:    () => OBJ.mort(n),
    RACCORD: () => OBJ.raccord(n),
    PLAN:    () => OBJ.plan(n),
    MINUTAGE: () => OBJ.minutage(n, actuel && actuel.sens ? actuel.sens : 'AVANT',
      actuel && actuel.seuil !== undefined ? actuel.seuil : 30),
    CHRONO:  () => OBJ.chrono(n),
    BOUT:    () => OBJ.bout(n, actuel && actuel.sens === 'GAUCHE' ? 'GAUCHE' : 'DROITE'),
    SANS_TC: () => OBJ.sansTc(n, actuel && actuel.sens ? actuel.sens : 'EGAL',
      actuel && actuel.seuil !== undefined ? actuel.seuil : 0),
    SEQ_TAILLE:   () => OBJ.seqTaille(n, actuel && actuel.seuil ? Math.max(1, actuel.seuil) : 3,
      actuel && actuel.sens === 'MAX' ? 'MAX' : undefined),
    SEQ_VOISINES: () => OBJ.seqVoisines(n, actuel && actuel.sens === 'APRES' ? 'APRES' : 'AVANT'),
    SEQ_LONGUE:   () => OBJ.seqLongue(n),
    DANS_CHUTIER: () => OBJ.dansChutier(n),
    SEQ_AVEC:     () => OBJ.seqAvec(n, actuel && actuel.sens === 'SANS' ? 'SANS' : 'AVEC',
      actuel && actuel.cible ? actuel.cible : e0, actuel && actuel.seuil),
    SEQ_TOUTES:   () => OBJ.seqToutes(n, actuel && actuel.seuil ? actuel.seuil : 3,
      actuel && actuel.sens === 'MAX' ? 'MAX' : 'MIN'),
    // Les pouvoirs du vocabulaire commun. Changer de type garde la cible quand
    // elle a un sens pour le nouveau : passer de « par icône » à « par lot »
    // ne doit pas repartir de la première icône de la liste.
    AILLEURS:    () => OBJ.ailleurs(n, cible0, actuel && actuel.sens),
    CENTRE:      () => OBJ.centre(n, cible0, actuel && actuel.sens),
    LOT:         () => OBJ.lot(n, cible0, actuel && actuel.seuil > 1 ? actuel.seuil : 2),
    SEUIL:       () => OBJ.seuilCible(n, cible0, actuel && actuel.sens === 'MAX' ? 'MAX' : 'MIN',
      actuel && actuel.seuil !== undefined ? actuel.seuil : 3),
    ABSENTES:    () => OBJ.absentes(n),
    EXTREME:     () => OBJ.extreme(n, actuel && actuel.sens === 'MOINS' ? 'MOINS' : 'PLUS'),
    // Seules les cibles qui ont une famille où se comparer : on retombe sur la
    // première icône si celle d'avant n'en avait pas.
    DOMINE:      () => OBJ.domine(n, CIBLES_PRESENCE.includes(cible0) ? cible0 : e0,
      actuel && actuel.sens === 'MOINS' ? 'MOINS' : 'PLUS'),
    PLAN_ICONES: () => OBJ.planIcones(n, actuel && actuel.seuil !== undefined ? actuel.seuil : 2,
      actuel && actuel.sens),
    DOUBLE:      () => OBJ.doubleCarte(n, actuel && actuel.sens === 'PLUS' ? 'PLUS' : 'MOINS',
      actuel && actuel.critere),
    // Les pouvoirs de règle. `n` y change de sens — des séquences, des plans,
    // ou des points par Raccord —, on repart donc de leur valeur naturelle
    // plutôt que de reprendre le compte de points du pouvoir précédent.
    PIOCHER:      () => OBJ.piocher(),
    SEQ_PLUS:     () => OBJ.sequencePlus(actuel && actuel.kind === 'PLAN_PLUS' ? actuel.n : 1),
    PLAN_PLUS:    () => OBJ.planPlus(actuel && actuel.kind === 'SEQ_PLUS' ? actuel.n : 1),
    RACCORD_VAUT: () => OBJ.raccordVaut(actuel && actuel.kind === 'RACCORD_VAUT' ? actuel.n : 1),
  }[kind]();
  // Changer de type ne déplace pas le pouvoir : il garde sa portée.
  if (actuel && PORTEE_IDS.includes(actuel.portee)) neuf.portee = actuel.portee;
  return neuf;
}

/**
 * Recompose le pouvoir à partir de la pièce que l'on vient de changer. Sur
 * une sélection, la base est le pouvoir que tous les plans ont en commun —
 * c'est celui que le formulaire montre.
 */
function majObjectif(cles, part, valeur, rang = 1) {
  const plans = surLeModifie(() => cles.map(planDeCle).filter(Boolean));
  if (!plans.length) return;
  const actuel = objCommunDe(plans, rang);

  if (part === 'kind') return poserObj(cles, construireObj(valeur, actuel), rang);
  if (!actuel) {
    // Les pouvoirs de la sélection diffèrent. La **valeur** et la **portée**
    // sont des pièces que tous partagent : on les règle quand même, chaque
    // plan gardant son propre effet. Le reste — cible, seuil, sens — n'a de
    // sens que sur un pouvoir précis, et ne se règle donc qu'au commun.
    if (part !== 'n' && part !== 'portee') return;
    const champ = rang === 2 ? 'obj2' : 'obj';
    surLeModifie(() => {
      for (const c of cles) {
        const p = planDeCle(c);
        const o0 = p && p[champ];
        if (!o0) continue;
        const o = JSON.parse(JSON.stringify(o0));
        if (part === 'n') o.n = Math.max(-20, Math.min(20, parseInt(valeur, 10) || 0));
        else {
          // « dans l'ordre », les pouvoirs de séquence et ceux qui portent
          // leur portée dans leur définition n'ont rien à régler ici.
          if (!porteeReglable(o)) continue;
          o.portee = valeur;
        }
        poserObj([c], o, rang);
      }
    });
    return;
  }
  const o = JSON.parse(JSON.stringify(actuel));
  // Une valeur peut être négative : un pouvoir qui coûte des points.
  if (part === 'n') o.n = Math.max(-20, Math.min(20, parseInt(valeur, 10) || 0));
  else if (part === 'format') { o.format = valeur; if (o.format2 === valeur) delete o.format2; }
  else if (part === 'format2') { if (valeur) o.format2 = valeur; else delete o.format2; }
  else if (part === 'el') o.el = valeur;
  else if (part === 'el0') o.els = [valeur, o.els[1], ...(o.els[2] ? [o.els[2]] : [])];
  else if (part === 'el1') o.els = [o.els[0], valeur, ...(o.els[2] ? [o.els[2]] : [])];
  // La troisième icône fait du couple un trio ; vidée, elle le défait.
  else if (part === 'el2') o.els = valeur ? [o.els[0], o.els[1], valeur] : [o.els[0], o.els[1]];
  else if (part === 'sens') o.sens = valeur;
  else if (part === 'cible') o.cible = valeur;
  else if (part === 'critere') o.critere = valeur;
  // Une séquence d'« au moins zéro plan » ne veut rien dire : le seuil des
  // pouvoirs de séquence part de 1, celui des minutages part de zéro. Un lot
  // part de 2 : un « lot de 1 » n'est plus un lot, c'est l'unité.
  else if (part === 'seuil') {
    const plancher = o.kind === 'LOT' ? 2
      : ['SEQ_TAILLE', 'SEQ_AVEC', 'SEQ_TOUTES'].includes(o.kind) ? 1 : 0;
    const plafond = o.kind === 'PLAN_ICONES' ? 12
      : ['SEQ_TAILLE', 'SEQ_AVEC', 'SEQ_TOUTES', 'LOT'].includes(o.kind) ? 20 : 99;
    o.seuil = Math.max(plancher, Math.min(plafond, parseInt(valeur, 10) || 0));
    // Un « avec / sans » à un seul plan est le cas ordinaire : on n'écrit pas
    // son seuil, pour qu'il reste identique à celui de la boîte.
    if (o.kind === 'SEQ_AVEC' && o.seuil <= 1) delete o.seuil;
  }
  else if (part === 'portee') o.portee = valeur;
  poserObj(cles, o, rang);
}

function memeObjectif(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

// --- Sauvegarde CSV ---------------------------------------------------------
// Le jeu modifié tient dans un tableau à plat, une ligne par plan et une par
// carte. On exporte tout — pas seulement les retouches — pour que le fichier
// se lise et se corrige dans un tableur ; à la relecture, seule la différence
// avec la boîte est retenue, si bien qu'un aller-retour ne crée aucune
// retouche fantôme.

// Un plan peut porter deux pouvoirs : le second a ses propres colonnes,
// suffixées en 2. Une colonne vide vaut « pas de second pouvoir ».
const CSV_COLS = ['objet', 'cle', 'numero', 'minutage', 'icones', 'mort',
  'pouvoir', 'points', 'cible', 'portee', 'sens', 'seuil',
  'pouvoir2', 'points2', 'cible2', 'portee2', 'sens2', 'seuil2',
  'gauche', 'droite', 'boite'];

function csvEchappe(v) {
  const t = v === undefined || v === null ? '' : String(v);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** La cible d'un pouvoir, en un mot : un cadrage, une icône, ou un couple. */
function cibleObj(o) {
  if (!o) return '';
  if (o.kind === 'PAIRE') return o.els.join('+');
  // Deux cadrages visés tiennent dans la même colonne : « PL+DEP ».
  if (o.kind === 'FORMAT' && o.format2) return `${o.format}+${o.format2}`;
  // Le pouvoir qui double une carte n'a pas de cible mais un critère — ce que
  // « la plus grosse » veut dire. Il loge dans la même colonne : elle dit ce
  // que le pouvoir vise, et c'est bien ce dont il s'agit.
  if (o.kind === 'DOUBLE') return o.critere || 'POINTS';
  // Un pouvoir de séquence vise une icône, un cadrage ou un Raccord : tout
  // tient dans la même colonne que les autres cibles.
  if (o.cible) return o.cible;
  if (o.format) return o.format;
  return o.el || '';
}

// --- Partager, publier -------------------------------------------------------
// Ce que l'éditeur règle vit dans ce navigateur-ci. Deux portes en sortent : le
// PARTAGE, qui donne ce jeu à un testeur par un lien ou un fichier, et la
// PUBLICATION — `materiel.json`, à la racine du dépôt —, qui le donne à tout le
// monde. Ni l'un ni l'autre ne portent d'images : celles des cartes sont celles
// du site.

/** Un partage complet : les réglages, le matériel, et les retouches portées aux textes des règles. */
function composerPartageActuel() {
  return composerPartage(store.cfg, VERSION, LS.get('regles.textes', {}));
}

/** Le LIEN : il se colle dans un message, et celui qui l'ouvre joue cette version. */
async function partagerParLien(bouton) {
  const avant = bouton ? bouton.textContent : '';
  if (bouton) { bouton.disabled = true; bouton.textContent = 'Préparation…'; }
  try {
    const charge = await encoderPartage(composerPartageActuel());
    const base = `${location.origin}${location.pathname}`;
    const lien = lienPartage(base, charge);
    if (charge.length > LIMITE_LIEN) {
      alert(`Ce matériel est trop retouché pour tenir dans un lien (${Math.round(lien.length / 1024)} ko).\n\n`
        + 'Passez par « ⭳ Fichier de partage » : il porte tout, sans limite de taille.');
      return;
    }
    let copie = false;
    try { await navigator.clipboard.writeText(lien); copie = true; } catch { copie = false; }
    if (bouton) {
      bouton.textContent = copie ? '✓ Lien copié' : '🔗 Lien de partage';
      setTimeout(() => { bouton.textContent = avant; }, 2200);
    }
    if (!copie) prompt('Voici le lien à partager :', lien);
  } catch (e) {
    alert(`Le lien n'a pas pu être fabriqué : ${e.message || e}`);
  } finally {
    if (bouton) { bouton.disabled = false; if (bouton.textContent === 'Préparation…') bouton.textContent = avant; }
  }
}

/** Le FICHIER : le même partage, sans limite de taille. */
function partagerParFichier(bouton) {
  const avant = bouton ? bouton.textContent : '';
  try {
    const texte = `${JSON.stringify(composerPartageActuel(), null, 1)}\n`;
    const quand = new Date();
    const jour = `${quand.getFullYear()}${String(quand.getMonth() + 1).padStart(2, '0')}${
      String(quand.getDate()).padStart(2, '0')}`;
    telecharger(new Blob([texte], { type: 'application/json' }),
      `edit-partage-v${VERSION}-${jour}.json`);
    if (bouton) {
      bouton.textContent = `✓ ${Math.max(1, Math.round(texte.length / 1024))} ko`;
      setTimeout(() => { bouton.textContent = avant; }, 2200);
    }
  } catch (e) {
    alert(`Le fichier n'a pas pu être fabriqué : ${e.message || e}`);
  }
}

/**
 * Recevoir un partage. Il remplace les réglages ET le matériel : c'est tout
 * l'intérêt — le testeur doit voir exactement le jeu de celui qui partage. On
 * ne le fait donc pas en douce quand la machine a déjà du travail dessus.
 */
async function appliquerPartage(partage, demander) {
  if (!partage || !partage.cfg) return false;
  const aDuTravail = !materielVide(store.cfg.materiel);
  if (demander && aDuTravail
    && !confirm('Ce partage remplace vos réglages ET votre matériel par ceux qu\'il porte.\n\n'
      + 'Vos retouches actuelles seront perdues. Continuer ?')) return false;
  // Par la même porte qu'une configuration relue : seules les variables qui
  // existent encore sont gardées, et un matériel d'une autre boîte est écarté.
  store.cfg = Object.assign(cloneConfig(DEFAULTS), migrerCfg(partage.cfg));
  normaliserMateriel();
  sauverCfg();
  // Les retouches portées aux textes des règles font partie du jeu partagé.
  // Un partage sans aucune retouche n'efface pas celles du testeur : il n'a rien
  // à dire là-dessus, et effacer par le vide serait une surprise.
  if (partage.textes && Object.keys(partage.textes).length) LS.set('regles.textes', partage.textes);
  return true;
}

/**
 * Un partage ne porte pas le CODE : celui-ci vient du site. Les deux vont
 * presque toujours ensemble — on ouvre le lien, on a la version du jour. Mais
 * un partage gardé quelques jours peut arriver sur un site déjà plus loin :
 * autant le dire.
 */
function motVersion(p) {
  return p.version === VERSION ? ''
    : `\n\nÀ noter : ce partage a été fait sur la version ${p.version} du site, `
      + `qui en est aujourd'hui à la ${VERSION}. Les cartes et les réglages sont bien ceux du partage ; `
      + 'c\'est le programme qui a changé depuis.';
}

/** Charger un fichier de partage reçu. */
async function chargerFichierPartage(fichier) {
  try {
    const p = JSON.parse(await fichier.text());
    if (!p || p.format !== FORMAT_PARTAGE || !p.cfg) {
      alert('Ce fichier n\'est pas un partage EDIT lisible — ou il vient d\'une version précédente du jeu, '
        + 'dont les cartes n\'existent plus.');
      return;
    }
    if (!(await appliquerPartage(p, true))) return;
    entrerEnPartage(p);
    alert(`Partage chargé — version ${p.version}, du ${p.date}.\n\n`
      + 'Vous êtes maintenant sur la version partagée : le Matériel, le Laboratoire et les '
      + 'Versions se ferment — tout est déjà réglé. Le jeton « 🔗 Version partagée », en haut, '
      + 'en sort d’un clic.'
      + motVersion(p));
    allerA('#/');
    route();
  } catch (e) {
    alert(`Fichier illisible : ${e.message || e}`);
  }
}

/**
 * Le matériel, prêt à être publié : `materiel.json`, à poser à la racine du
 * dépôt. C'est le seul chemin qui rende un matériel VISIBLE PAR TOUS : une
 * machine qui n'a rien réglé l'adopte au chargement, celles qui ont bricolé de
 * leur côté se voient proposer de l'adopter.
 */
function publierMateriel(bouton) {
  const avant = bouton ? bouton.textContent : '';
  try {
    const doc = composerPublie({
      boite: store.cfg.boite,
      materiel: JSON.parse(JSON.stringify(store.cfg.materiel)),
      cartesDesactivees: (store.cfg.cartesDesactivees || []).slice(),
    }, VERSION);
    telecharger(new Blob([`${JSON.stringify(doc, null, 1)}\n`], { type: 'application/json' }), 'materiel.json');
    // Le maître vient de publier ce qu'il a : son propre matériel EST le publié.
    // Sans cette marque, il verrait au rechargement suivant le bandeau qui
    // annonce un site différent du sien — alors que c'est le sien.
    store.cfg.publieAdopte = doc.signature;
    sauverCfg();
    if (bouton) {
      bouton.textContent = '✓ materiel.json';
      setTimeout(() => { bouton.textContent = avant; }, 4000);
    }
    alert('Le fichier « materiel.json » est téléchargé.\n\n'
      + '1. Déposez-le à la RACINE du dépôt, à la place de celui qui s’y trouve.\n'
      + '2. Publiez — commit et push.\n\n'
      + 'Au prochain chargement, toute machine qui n’a rien réglé elle-même joue ce matériel ; '
      + 'les autres se voient proposer de l’adopter. La vôtre garde son réglage, qui est le même.');
  } catch (e) {
    alert(`Le fichier n’a pas pu être écrit : ${e.message || e}`);
    if (bouton) bouton.textContent = avant;
  }
}

function exporterCSV() {
  const lignes = [CSV_COLS.join(';')];
  const vide = (n) => Array.from({ length: n }, () => '');
  surLeModifie(() => {
    // Les six colonnes d'un pouvoir, vides s'il n'y en a pas.
    const colsObj = (o) => [
      o ? o.kind : '', o ? o.n : '', cibleObj(o), o ? objPortee(o, store.cfg) : '',
      o && o.sens ? o.sens : '', o && o.seuil !== undefined ? o.seuil : '',
    ];
    for (const p of catalogue()) {
      lignes.push([
        'plan', p.cle, p.num, p.tc, p.el.join('|'), p.mort ? 'oui' : 'non',
        ...colsObj(p.obj), ...colsObj(p.obj2), '', '', '',
      ].map(csvEchappe).join(';'));
    }
    // Les cartes : l'assemblage des cartes à deux Gros Plans — par numéro de
    // boîte, gauche puis droite —, et qui est dans la boîte.
    const carte = (id, g, d) => lignes.push(['carte', id, ...vide(16), g ?? '', d ?? '',
      estDesactivee(id) ? 'non' : 'oui'].map(csvEchappe).join(';'));
    for (const c of buildCartesDoubles()) carte(c.id, c.gNum, c.dNum);
    for (const c of buildPlansLarges()) carte(c.id);
    const departs = DEPARTS();
    for (let i = 0; i < departs.length; i++) {
      for (let j = i + 1; j < departs.length; j++) carte(`S${departs[i].num}-${departs[j].num}`);
    }
  });

  const d = new Date();
  const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Le BOM fait ouvrir le fichier en UTF-8 par les tableurs.
  telecharger(new Blob([`﻿${lignes.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }),
    `edit-materiel-${jour}.csv`);
}

/** Découpe une ligne CSV en tenant compte des guillemets. */
function csvLigne(t) {
  const out = []; let cur = ''; let dans = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dans) {
      if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') dans = false;
      else cur += c;
    } else if (c === '"') dans = true;
    else if (c === ';') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * Reconstruit un pouvoir depuis sa ligne de tableau. `suf` vaut '2' pour le
 * second pouvoir, qui a les mêmes colonnes suffixées.
 */
function objDepuisCSV(r, suf = '') {
  const kind = (r[`pouvoir${suf}`] || '').trim().toUpperCase();
  if (!kind) return null;
  // La valeur peut être négative : un pouvoir qui coûte des points.
  const n = Math.max(-20, Math.min(20, parseInt(r[`points${suf}`], 10) || 0));
  const cible = (r[`cible${suf}`] || '').trim().toUpperCase();
  const sens0 = (r[`sens${suf}`] || '').trim().toUpperCase();
  const sens = sens0 === 'APRES' ? 'APRES' : 'AVANT';
  const pt = (r[`portee${suf}`] || '').trim().toUpperCase();
  const portee = PORTEE_IDS.includes(pt) ? pt : undefined;
  const seuil = Math.max(0, Math.min(99, parseInt(r[`seuil${suf}`], 10) || 0));
  switch (kind) {
    case 'RACCORD': return OBJ.raccord(n, portee);
    case 'PLAN':    return OBJ.plan(n, portee);
    case 'MORT':    return OBJ.mort(n, portee);
    case 'CHRONO':  return OBJ.chrono(n, portee);
    case 'BOUT':    return OBJ.bout(n, sens0 === 'GAUCHE' ? 'GAUCHE' : 'DROITE');
    case 'SANS_TC': return OBJ.sansTc(n, ['AVANT', 'APRES'].includes(sens0) ? sens0 : 'EGAL', seuil, portee);
    case 'FORMAT': {
      const [f1, f2] = cible.split('+');
      return CADRAGES_POUVOIR.includes(f1)
        ? OBJ.format(n, f1, portee, CADRAGES_POUVOIR.includes(f2) ? f2 : undefined) : null;
    }
    case 'ELEMENT': return ELEMENT_IDS.includes(cible) ? OBJ.element(n, cible, portee) : null;
    case 'ABSENT':  return CIBLE_IDS.includes(cible) ? OBJ.absent(n, cible, portee) : null;
    case 'MINUTAGE': return OBJ.minutage(n, sens0 === 'EGAL' ? 'EGAL' : sens, seuil, portee);
    case 'SEQ_TAILLE':   return OBJ.seqTaille(n, Math.max(1, seuil || 1), sens0 === 'MAX' ? 'MAX' : undefined);
    case 'SEQ_VOISINES': return OBJ.seqVoisines(n, sens0 === 'APRES' ? 'APRES' : 'AVANT');
    case 'SEQ_LONGUE':   return OBJ.seqLongue(n);
    case 'SEQ_AVEC': return ciblesSequence().some((c) => c.id === cible) || CIBLE_IDS.includes(cible)
      || (String(cible).includes('+') && String(cible).split('+').every((e) => ELEMENT_IDS.includes(e)))
      ? OBJ.seqAvec(n, sens0 === 'SANS' ? 'SANS' : 'AVEC', cible, seuil) : null;
    case 'PAIRE': {
      // « ARME+ARME » ou « ARME+ARME+HEROINE » : la colonne porte le groupe
      // entier, et une icône inconnue fait tomber le pouvoir.
      const els = cible.split('+').filter(Boolean);
      if (els.length < 2 || els.length > 3 || !els.every((x) => ELEMENT_IDS.includes(x))) return null;
      return OBJ.paire(n, els[0], els[1], portee, els[2]);
    }
    // --- Les pouvoirs du vocabulaire commun --------------------------------
    // Une cible que la colonne ne reconnaît pas fait tomber le pouvoir : mieux
    // vaut pas de pouvoir qu'un pouvoir qui compte autre chose que ce qui est
    // écrit dans le fichier.
    case 'SEQ_TOUTES': return OBJ.seqToutes(n, Math.max(1, seuil || 3), sens0 === 'MAX' ? 'MAX' : 'MIN');
    case 'AILLEURS': return CIBLE_IDS.includes(cible) ? OBJ.ailleurs(n, cible, sens0) : null;
    case 'CENTRE':   return CIBLE_IDS.includes(cible) ? OBJ.centre(n, cible, sens0) : null;
    case 'LOT':      return CIBLE_IDS.includes(cible) ? OBJ.lot(n, cible, Math.max(2, seuil || 2), portee) : null;
    case 'SEUIL':    return CIBLE_IDS.includes(cible)
      ? OBJ.seuilCible(n, cible, sens0 === 'MAX' ? 'MAX' : 'MIN', seuil, portee) : null;
    case 'ABSENTES': return OBJ.absentes(n, portee);
    case 'DOMINE':   return CIBLES_PRESENCE.includes(cible)
      ? OBJ.domine(n, cible, sens0 === 'MOINS' ? 'MOINS' : 'PLUS', portee) : null;
    // Les pouvoirs de règle. `points` y porte un nombre de séquences, de plans
    // ou de points par Raccord — pas un compte de points.
    case 'PIOCHER':      return OBJ.piocher();
    case 'DANS_CHUTIER': return OBJ.dansChutier(n);
    case 'SEQ_PLUS':     return OBJ.sequencePlus(n);
    case 'PLAN_PLUS':    return OBJ.planPlus(n);
    case 'RACCORD_VAUT': return OBJ.raccordVaut(n);
    case 'EXTREME':  return OBJ.extreme(n, sens0 === 'MOINS' ? 'MOINS' : 'PLUS', portee);
    case 'PLAN_ICONES': return OBJ.planIcones(n, seuil, sens0, portee);
    case 'DOUBLE':   return OBJ.doubleCarte(n, sens0 === 'PLUS' ? 'PLUS' : 'MOINS', cible, portee);
    default: return null;
  }
}

function importerCSV(apres) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.csv,text/csv';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    f.text().then((t) => {
      try { appliquerCSV(t); apres(); }
      catch (e) { alert(`Fichier illisible : ${e.message}`); }
    });
  };
  inp.click();
}

function appliquerCSV(texte) {
  const lignes = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lignes.length) throw new Error('fichier vide');
  const entete = csvLigne(lignes[0]).map((x) => x.trim().toLowerCase());
  if (!entete.includes('objet') || !entete.includes('cle')) {
    throw new Error('en-tête attendu : objet;cle;numero;minutage;…');
  }

  const plans = {}; const paires = {}; const hors = [];
  let lus = 0; let ignores = 0;

  surLeModifie(() => {
    const parCle = Object.fromEntries(catalogue().map((p) => [p.cle, p]));
    const doubles = Object.fromEntries(buildCartesDoubles().map((c) => [c.id, c]));
    const gros = new Set(SCENES().map((s) => s.num));
    // Les autres cartes que le fichier peut écarter : Plans Larges et cartes de départ.
    const autres = new Set(buildPlansLarges().map((c) => c.id));
    const departs = DEPARTS();
    for (let i = 0; i < departs.length; i++) {
      for (let j = i + 1; j < departs.length; j++) autres.add(`S${departs[i].num}-${departs[j].num}`);
    }

    for (const l of lignes.slice(1)) {
      const cells = csvLigne(l);
      const r = Object.fromEntries(entete.map((k, i) => [k, cells[i] === undefined ? '' : cells[i].trim()]));
      const objet = (r.objet || '').toLowerCase();

      if (objet === 'plan') {
        const p = parCle[r.cle];
        if (!p) { ignores++; continue; }
        lus++;
        const mis = {};
        const num = parseInt(r.numero, 10);
        if (Number.isFinite(num) && num !== p.imprime.num) mis.num = num;
        const tcLu = parseInt(r.minutage, 10);
        if (Number.isFinite(tcLu) && tcLu !== p.imprime.tc) mis.tc = Math.max(0, Math.min(99, tcLu));
        // On garde l'ordre du fichier : c'est celui de la carte — la dominante
        // en premier —, et le re-trier inventerait des retouches.
        const el = (r.icones || '').split('|').map((x) => x.trim().toUpperCase()).filter((x) => ELEMENT_IDS.includes(x));
        const imp = p.imprime.el;
        if (!(el.length === imp.length && el.every((x, k) => x === imp[k]))) mis.el = el;
        const mort = /^(oui|1|true|vrai|x)$/i.test(r.mort || '');
        if (mort !== !!p.imprime.mort) mis.mort = mort;
        const o = objDepuisCSV(r);
        if (JSON.stringify(o || null) !== JSON.stringify(p.imprime.obj || null)) mis.obj = o;
        const o2 = objDepuisCSV(r, '2');
        if (JSON.stringify(o2 || null) !== JSON.stringify(p.imprime.obj2 || null)) mis.obj2 = o2;
        if (Object.keys(mis).length) plans[p.cle] = mis;

      } else if (objet === 'carte') {
        const c = doubles[r.cle];
        if (!c && !autres.has(r.cle)) { ignores++; continue; }
        lus++;
        if (c) {
          // Une moitié : un numéro de Gros Plan de la boîte, ou vide. Un numéro
          // qui ne désigne rien ferait disparaître la carte : on garde alors
          // celui qu'elle portait.
          const lire = (t, actuel) => {
            const brut = String(t || '').trim().replace(/^gp\s*/i, '');
            if (brut === '') return null;
            const n = parseInt(brut, 10);
            return Number.isFinite(n) && gros.has(n) ? n : actuel;
          };
          const g = lire(r.gauche, c.gNum);
          const d = lire(r.droite, c.dNum);
          if (g !== (c.gImprime ?? null) || d !== (c.dImprime ?? null)) paires[c.rang] = [g, d];
        }
        if (/^(non|0|false|faux)$/i.test(r.boite || '')) hors.push(r.cle);
      } else ignores++;
    }
  });

  if (!lus) throw new Error('aucune ligne reconnue');
  // Le tableau décrit les retouches, pas la composition : les cartes créées et
  // celles qu'on a supprimées lui survivent — un CSV ne sait pas les exprimer,
  // il ne doit donc pas les effacer.
  const { ajouts, retires } = store.cfg.materiel;
  store.cfg.materiel = { plans, paires, ajouts, retires };
  store.cfg.cartesDesactivees = hors;
  sauverCfg();
  const n = Object.keys(plans).length + Object.keys(paires).length;
  alert(`${lus} ligne${lus > 1 ? 's' : ''} relue${lus > 1 ? 's' : ''} · ${n} retouche${n > 1 ? 's' : ''}`
    + `${hors.length ? ` · ${hors.length} carte${hors.length > 1 ? 's' : ''} écartée${hors.length > 1 ? 's' : ''}` : ''}`
    + `${ignores ? ` · ${ignores} ligne${ignores > 1 ? 's' : ''} ignorée${ignores > 1 ? 's' : ''}` : ''}`);
}

// --- L'export ---------------------------------------------------------------
// Pas de bibliothèque tierce : on prépare une feuille imprimable et on ouvre
// la boîte d'impression du navigateur, où « Enregistrer au format PDF » donne
// le fichier. C'est le seul chemin qui marche partout sans dépendance.

function exporterMateriel() {
  const cat = surLeModifie(catalogue);
  const nbDoubles = surLeModifie(buildCartesDoubles).length;
  const n = nbRetouches();
  const off = store.cfg.cartesDesactivees.length;
  const d = new Date();
  const quand = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  let feuille = document.getElementById('impression');
  if (!feuille) {
    feuille = document.createElement('div');
    feuille.id = 'impression';
    document.body.appendChild(feuille);
  }
  feuille.innerHTML = `
    <header class="imp-tete">
      <h1>EDIT — état du matériel</h1>
      <p>${cat.length} plans · ${nbDoubles} cartes à deux Gros Plans · jeu lancé : <b>${store.cfg.materielActif === 'MODIFIE' ? 'Modifié' : 'Boîte'}</b>
      · ${n ? `${n} retouche${n > 1 ? 's' : ''}` : 'aucune retouche'}${off ? ` · ${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}` : ''}
      · application v${VERSION} · ${quand}</p>
    </header>
    <h2>Les plans</h2>
    ${tableauPlans(cat)}
    <h2>Les ${nbDoubles} cartes à deux Gros Plans</h2>
    ${tableauPaires()}`;

  document.body.classList.add('impression');
  const fin = () => { document.body.classList.remove('impression'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  window.print();
  // Certains navigateurs n'émettent pas afterprint : filet de sécurité.
  setTimeout(fin, 1500);
}

function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ===========================================================================
// RÈGLES
// ===========================================================================

// Deux lectures des mêmes règles : les RÈGLES, qu'on lit avant de jouer, et
// l'AIDE de jeu, qu'on garde à côté du banc. Les règles ouvrent la page.
let reglesOnglet = 'regles';

// --- Retoucher les textes des règles et de l'aide --------------------------
// Les règles et l'aide sont écrites dans le code. L'auteur, lui, les relit à
// la table et veut les corriger AU MOMENT où la formule le gêne — pas noter la
// correction pour plus tard. Un bouton ouvre donc la page à la retouche, et un
// autre recopie ce qui a changé, pour qu'on vienne le graver dans le code.
//
// Ce que l'on retient n'est PAS la page : c'est un couple **texte d'origine →
// texte retouché**, rangé sous l'empreinte de l'original. Trois conséquences,
// toutes voulues :
//   — un texte dont les chiffres viennent du modèle continue de les suivre :
//     seuls les passages effectivement retouchés sont remplacés ;
//   — une retouche survit à un déplacement de section, puisqu'elle ne dépend
//     pas de la place ;
//   — le jour où l'on GRAVE la correction dans le code, l'original change,
//     l'empreinte ne correspond plus, et la retouche s'efface d'elle-même.
//     C'est exactement ce qu'on veut : plus de doublon à nettoyer à la main.

/** Les éléments dont le texte se retouche. Les plus fins d'abord. */
const SEL_RETOUCHE = [
  '.livret .lv-accroche', '.livret .lv-sous',
  '.livret .lv-titre span', '.livret h3', '.livret h4',
  '.livret p', '.livret li', '.livret figcaption', '.livret .lv-mat span', '.livret .lv-txt',
  '.aide-jeu .aj-hero h2', '.aide-jeu .aj-note', '.aide-jeu .aj-hero p',
  '.aide-jeu h3', '.aide-jeu .aide', '.aide-jeu .lv-txt',
].join(',');

/** L'empreinte d'un texte. FNV-1a : courte, stable, et suffisante ici. */
function empreinte(texte) {
  let h = 2166136261 >>> 0;
  const t = String(texte).replace(/\s+/g, ' ').trim();
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

let retoucheOuverte = false;

// Une retouche est rangée sous l'empreinte du texte qu'elle corrige. Celles
// faites sur les règles d'une version précédente ne retrouveraient plus leur
// passage : elles resteraient comptées sans pouvoir être montrées. On repart
// donc d'une table vide à chaque nouvelle version des règles.
(function perimerRetouches() {
  if (LS.get('regles.textes.v', '') === REGLES_VERSION) return;
  LS.set('regles.textes', {});
  LS.set('regles.textes.v', REGLES_VERSION);
}());

const retouches = () => LS.get('regles.textes', {});

/**
 * Les éléments retouchables de la page, l'original de chacun sous la main. On
 * écarte ceux qui en contiennent un autre — un `li` qui enveloppe un `p` n'est
 * pas un texte, c'est un bloc : le retoucher d'un bloc écraserait le fin.
 */
function morceauxRetouchables() {
  const tous = [...app.querySelectorAll(SEL_RETOUCHE)];
  return tous.filter((el) => !tous.some((autre) => autre !== el && el.contains(autre)));
}

/**
 * Pose les empreintes sur la page et applique les retouches enregistrées.
 * À faire AVANT que l'écran ne s'affiche : on ne montre jamais le texte du code
 * là où l'auteur a écrit le sien.
 */
function appliquerRetouches() {
  const table = retouches();
  let posees = 0;
  for (const el of morceauxRetouchables()) {
    const cle = empreinte(el.innerHTML);
    el.dataset.cle = cle;
    // L'original reste attaché à l'élément : c'est lui qu'on remettra si l'on
    // annule, et lui qu'on montrera dans le rapport de copie.
    el.dataset.origine = el.innerHTML;
    if (table[cle] !== undefined && table[cle] !== el.innerHTML) {
      el.innerHTML = table[cle];
      el.classList.add('retouche');
      posees++;
    }
  }
  return posees;
}

/**
 * La barre de retouche, au-dessus des règles ou de l'aide. Son contenu dépend de
 * ce qu'on a déjà retouché : elle se redessine donc à chaque frappe — sans quoi
 * « Copier mes retouches » n'apparaîtrait qu'au rechargement suivant, ce qui est
 * précisément le moment où l'on n'y pense plus.
 */
function barreRetouche(quoi) {
  const n = Object.keys(retouches()).length;
  return `<div class="barre-retouche ${retoucheOuverte ? 'ouverte' : ''}" data-barre="${quoi}">
    <button class="pill ${retoucheOuverte ? 'on' : ''}" data-retouche="bascule">
      ${retoucheOuverte ? '✓ Terminer' : '✎ Modifier les textes'}</button>
    ${retoucheOuverte ? `<span class="aide">Cliquez dans un paragraphe et écrivez.
      Vos retouches restent sur cet appareil.</span>` : ''}
    ${n ? `<button class="pill" data-retouche="copier">⧉ Copier mes retouches (${n})</button>
      <button class="pill danger" data-retouche="vider">↺ Tout remettre</button>` : ''}
    <span class="aide" style="margin-left:auto">${quoi}</span>
  </div>`;
}

/** Le rapport à me recopier : chaque passage, avant et après. */
function rapportRetouches() {
  const table = retouches();
  const lignes = [];
  // On repasse par la page pour retrouver les ORIGINAUX : la table ne garde que
  // les empreintes, et une empreinte ne se relit pas.
  const vus = new Set();
  for (const el of morceauxRetouchables()) {
    const cle = el.dataset.cle;
    if (!cle || table[cle] === undefined || vus.has(cle)) continue;
    vus.add(cle);
    lignes.push({ avant: el.dataset.origine, apres: table[cle] });
  }
  const nu = (h) => String(h).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const entete = `EDIT v${VERSION} — retouches de texte (${lignes.length})`;
  return `${entete}\n${'='.repeat(entete.length)}\n\n${lignes.map((l, i) => `── ${i + 1} ${'─'.repeat(40)}
AVANT : ${nu(l.avant)}
APRÈS : ${nu(l.apres)}
`).join('\n')}`;
}

async function copierRetouches(bouton) {
  const texte = rapportRetouches();
  const libelle = bouton.textContent;
  try {
    await navigator.clipboard.writeText(texte);
    bouton.textContent = '✓ Copié';
  } catch {
    // Pas de presse-papier — page non sécurisée, permission refusée : le
    // fichier fait aussi bien l'affaire, et ne se perd pas.
    telecharger(new Blob([texte], { type: 'text/plain' }), 'edit-retouches.txt');
    bouton.textContent = '✓ Fichier';
  }
  setTimeout(() => { bouton.textContent = libelle; }, 1800);
}

/**
 * Redessine la seule barre, en laissant la page — et le curseur — où ils sont.
 * Repasser par `vueRegles` couperait la frappe en cours.
 */
function rafraichirBarre() {
  const barre = app.querySelector('[data-barre]');
  if (!barre) return;
  const neuve = document.createElement('div');
  neuve.innerHTML = barreRetouche(barre.dataset.barre);
  barre.replaceWith(neuve.firstElementChild);
  brancherBoutonsRetouche();
}

/** Les boutons de la barre. Séparés du reste : ils se rebranchent seuls. */
function brancherBoutonsRetouche() {
  app.querySelectorAll('[data-retouche]').forEach((b) => b.addEventListener('click', async () => {
    const quoi = b.dataset.retouche;
    if (quoi === 'bascule') { retoucheOuverte = !retoucheOuverte; vueRegles(); return; }
    if (quoi === 'copier') { await copierRetouches(b); return; }
    if (quoi === 'vider') {
      if (!confirm('Remettre tous les textes tels qu’ils sont écrits dans le code ?')) return;
      LS.set('regles.textes', {});
      vueRegles();
    }
  }));
}

/** Branche la retouche sur l'écran qui vient d'être dessiné. */
function brancherRetouche() {
  brancherBoutonsRetouche();

  if (!retoucheOuverte) return;
  for (const el of morceauxRetouchables()) {
    // `contenteditable="true"` et non `plaintext-only` : ce dernier n'est pas
    // partout, et là où il manque il ne rend pas la page moins éditable — il ne
    // la rend PAS éditable du tout, sans rien dire. On prend donc l'attribut
    // universel, et l'on nettoie le collage à la main juste en dessous.
    el.setAttribute('contenteditable', 'true');
    el.classList.add('retouchable');
    // Un texte collé arrive avec sa mise en forme — polices, couleurs, balises
    // d'un traitement de texte. On ne garde que les mots : ce qu'on enregistre
    // doit rester recopiable dans le code.
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const brut = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, brut);
    });
    // À chaque frappe : si le texte a bougé, on le garde ; s'il est revenu à
    // l'original, on retire l'entrée plutôt que d'enregistrer un doublon.
    el.addEventListener('input', () => {
      const table = retouches();
      const cle = el.dataset.cle;
      if (el.innerHTML === el.dataset.origine) delete table[cle];
      else table[cle] = el.innerHTML;
      LS.set('regles.textes', table);
      el.classList.toggle('retouche', table[cle] !== undefined);
      rafraichirBarre();
    });
  }
}

function vueRegles() {
  const c = store.cfg;
  const aide = reglesOnglet === 'aide';

  html(`${topbar('#/regles')}
  <div class="wrap">
    <div class="panneau">
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <h2 style="margin:0">Règles du jeu</h2>
        <span class="version-pill">v${REGLES_VERSION}</span>
      </div>
      <div class="filtre-barre" style="margin-bottom:20px">
        ${[['regles', 'Les règles'], ['aide', 'Aide de jeu']]
    .map(([k, l]) => `<button class="pill" data-onglet="${k}"
            style="${reglesOnglet === k ? 'background:var(--violet);color:#fff;border-color:var(--violet)' : ''}">${l}</button>`).join('')}
      </div>
      ${barreRetouche(aide ? 'Aide de jeu' : 'Règles du jeu')}
      ${aide ? aideDeJeu(c) : corpsRegles(c)}
    </div>
  </div>
  ${pied()}`);

  // Les retouches se posent AVANT toute autre lecture de la page : le reste du
  // branchement doit voir le texte tel que l'auteur l'a écrit.
  appliquerRetouches();
  brancherRetouche();

  app.querySelectorAll('[data-onglet]').forEach((b) => b.addEventListener('click', () => {
    reglesOnglet = b.dataset.onglet; vueRegles();
  }));
}

// ===========================================================================
// VARIABLES
// ===========================================================================

function vueVariables() {
  html(`${topbar('#/variables')}
  <div class="wrap">
    <div class="panneau">
      <h2>Variables de la partie</h2>
      <p class="aide">Tout ce qui pilote le déroulé et le décompte. Les changements sont enregistrés et
      s’appliquent à la prochaine partie comme aux campagnes du Laboratoire.</p>
      <div class="barre-outils" style="margin-top:14px">
        <button class="pill" id="reset">↺ Revenir aux valeurs par défaut</button>
        <button class="pill" id="export">Exporter en JSON</button>
        <button class="pill" id="import">Importer</button>
      </div>
    </div>

    <div class="grid2">
      ${SCHEMA.map((g) => `<div class="panneau"><h2>${g.groupe}</h2>${g.champs.map(champ).join('')}</div>`).join('')}

      <div class="panneau">
        <h2>Pouvoirs pris en compte</h2>
        <p class="aide" style="margin-bottom:12px">Décocher un type de pouvoir le neutralise : pratique pour
        mesurer sa contribution réelle au score.</p>
        <div class="chips">
          ${Object.keys(store.cfg.objectifsActifs).map((k) => {
            const on = store.cfg.objectifsActifs[k];
            return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-obj="${k}" ${on ? 'checked' : ''}>${SOURCES_LABEL[k] || k}</label>`;
          }).join('')}
        </div>
      </div>

      <div class="panneau">
        <h2>Le paquet</h2>
        <p class="aide" style="margin-bottom:12px">Ce qui part en partie avec le matériel choisi sur
        l’accueil. Les cartes se règlent, s’assemblent et s’écartent dans <b>Matériel</b>.</p>
        ${resumePaquet()}
        ${repartitionElements()}
      </div>
    </div>
  </div>
  ${pied()}`);

  brancherChamps(() => {});
  app.querySelectorAll('[data-obj]').forEach((el) => el.addEventListener('change', () => {
    store.cfg.objectifsActifs[el.dataset.obj] = el.checked; sauverCfg();
    el.closest('.chip').classList.toggle('on', el.checked);
  }));
  app.querySelector('#reset').addEventListener('click', () => {
    // Les retouches de cartes survivent : elles ne sont pas des variables de
    // partie, et elles ont leur propre bouton dans Matériel.
    const materiel = store.cfg.materiel;
    const ecartees = store.cfg.cartesDesactivees;
    store.cfg = cloneConfig(DEFAULTS);
    store.cfg.materiel = materiel;
    store.cfg.cartesDesactivees = ecartees;
    sauverCfg(); vueVariables();
  });
  app.querySelector('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `edit-variables-v${VERSION}.json`; a.click();
  });
  app.querySelector('#import').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      f.text().then((t) => {
        try {
          const lu = JSON.parse(t);
          const materiel = store.cfg.materiel;
          store.cfg = Object.assign(cloneConfig(DEFAULTS), migrerCfg(lu));
          // Un fichier sans matériel — ou d'une boîte précédente — ne touche
          // pas aux retouches en place.
          if (!store.cfg.materiel || !lu.materiel || lu.boite !== DEFAULTS.boite) store.cfg.materiel = materiel;
          normaliserMateriel();
          sauverCfg(); vueVariables();
        } catch { alert('Fichier illisible.'); }
      });
    };
    inp.click();
  });
}

function champ(f) {
  const v = store.cfg[f.k];
  let ctrl;
  if (f.t === 'bool') ctrl = `<input type="checkbox" data-cfg="${f.k}" ${v ? 'checked' : ''}>`;
  else if (f.t === 'choix') ctrl = `<select data-cfg="${f.k}">${f.options.map(([val, lab]) => `<option value="${val}" ${v === val ? 'selected' : ''}>${lab}</option>`).join('')}</select>`;
  else if (f.t === 'texte') ctrl = `<input type="text" data-cfg="${f.k}" value="${v || ''}" placeholder="aléatoire">`;
  else ctrl = `<input type="number" data-cfg="${f.k}" value="${v}" min="${f.min}" max="${f.max}" step="${f.pas || 1}">`;
  return `<div class="champ"><label>${f.l}${f.aide ? `<small>${f.aide}</small>` : ''}</label>${ctrl}</div>`;
}

function repartitionElements() {
  const { doubles, larges } = construirePaquet();
  const compte = Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0]));
  let plans = 0;
  for (const c of doubles) {
    for (const h of Object.values(moitiesDe(c)).filter(Boolean)) { plans++; for (const e of h.el) compte[e]++; }
  }
  for (const c of larges) { plans++; for (const e of c.el) compte[e]++; }
  const max = Math.max(...Object.values(compte)) || 1;
  return `<h3>Icônes dans le paquet <span class="aide">(${plans} plans)</span></h3>
  <div class="barres">
    ${ELEMENT_IDS.map((e) => `<div class="barre-l">
      <span style="display:flex;align-items:center;gap:8px">${elIcon(e, 22)} ${ELEMENTS[e].label}</span>
      <div class="piste"><div class="jauge" style="width:${(compte[e] / max) * 100}%"></div></div>
      <span class="val">${compte[e]}</span></div>`).join('')}
  </div>`;
}

// ===========================================================================
// BANC DE MONTAGE
// ===========================================================================
// Un établi, pas une partie. On y a **tous les plans du jeu** sous la main,
// rangés par cadrage, et l'on monte ce qu'on veut — avec exactement les mêmes
// contraintes de pose qu'en partie, et le même décompte. C'est là qu'on essaie
// une combinaison, qu'on vérifie ce que rapporte un pouvoir, qu'on cherche le
// meilleur montage possible avec un matériel donné.
//
// Trois libertés qu'une partie n'a pas : on choisit son plan au lieu de le
// tirer, on **reprend** un plan déjà posé pour le remettre ailleurs, et l'on
// **annule**. Tout le reste — ce qui peut se poser où, ce que cela rapporte —
// est le moteur de la partie, sans un chiffre de différence.

const FAMILLES_BAC = [
  ['PL', 'Plans Larges'], ['GP', 'Gros Plans'], ['DEP', 'Plans de départ'],
];

/** Tous les plans d'un cadrage, tels qu'ils se poseraient. */
function plansDuBac(famille) {
  return surLeModifie(() => {
    const liste = () => {
      if (famille === 'PL') return buildPlansLarges().map((c) => plHalf(c));
      if (famille === 'DEP') return DEPARTS().map((f) => plHalf({ ...f, depart: true }));
      // Un Gros Plan est la moitié GAUCHE ou la moitié DROITE d'une carte :
      // c'est l'assemblage qui le dit, et c'est ce qui décide du côté où il se
      // monte. La réserve le montre donc tel que sa carte le porte.
      const out = [];
      for (const c of buildCartesDoubles()) {
        const m = moitiesDe(c);
        if (m.G) out.push(m.G);
        if (m.D) out.push(m.D);
      }
      return out;
    };
    // Rangés comme la galerie du Matériel : par numéro.
    return liste().sort((a, b) => a.num - b.num);
  });
}

/** L'identité d'un plan de la réserve : son cadrage et son numéro. */
const identiteBac = (p) => (p ? `${p.format}:${p.numOrigine ?? p.num}` : '');

/** Le nom d'un plan sous sa vignette — et, pour un Gros Plan, sa moitié. */
function libelleDuBac(p) {
  const quoi = p.transition ? (p.titre || 'Raccord') : (FORMATS[p.format] || FORMATS.GP).label;
  const cote = p.moitie === 'G' ? ' · moitié gauche' : p.moitie === 'D' ? ' · moitié droite' : '';
  return `${quoi} ${etiquettePlan(p)}${cote}`;
}

/**
 * Une carte fictive, le temps de demander au moteur où ce plan peut se poser.
 * Le moteur raisonne sur des cartes ; ici on n'en a pas — on désigne un plan.
 * Un Gros Plan devient une carte qui ne porterait que cette moitié-là.
 */
function carteFictive(plan) {
  if (plan.format === 'PL' || plan.format === 'DEP') {
    return { id: 'bac', type: 'PL', num: plan.numOrigine, tc: plan.tc, el: plan.el,
      obj: plan.obj, obj2: plan.obj2, depart: plan.format === 'DEP' };
  }
  return { id: 'bac', type: 'DOUBLE',
    gScene: plan.moitie === 'G' ? plan.scene : undefined,
    dScene: plan.moitie === 'D' ? plan.scene : undefined };
}

/** Les poses légales du plan en main, dans le banc de l'établi. */
function coupsDuBac() {
  const b = store.bac;
  if (!b.choisi) return [];
  return surLeModifie(() => coupsSurBanc(b.banc, carteFictive(b.choisi.plan), store.cfg));
}

/** Une copie du banc, pour l'historique — et pour ne jamais partager un plan. */
const clonerBanc = (b) => JSON.parse(JSON.stringify(b));

function memoriserBac() {
  const b = store.bac;
  b.historique.push(clonerBanc(b.banc));
  if (b.historique.length > 120) b.historique.shift();
  b.refaits.length = 0;
}

/**
 * Retire un plan du banc et le rend. La séquence qui se vide disparaît ; celle
 * qui perd son ancre en désigne une autre — sans quoi elle n'aurait plus de
 * centre et sauterait de place.
 */
function retirerPlanDuBanc(banc, si, k) {
  const seq = banc.sequences[si];
  if (!seq || !seq[k]) return null;
  const plan = seq[k];
  seq.splice(k, 1);
  if (!seq.length) banc.sequences.splice(si, 1);
  else if (plan.ancre && !seq.some((p) => p.ancre)) {
    (seq.find((p) => p.format === 'PL' || p.format === 'DEP') || seq[0]).ancre = true;
  }
  return plan;
}

let numeroBac = 0;

function poserDansBac(coup) {
  const b = store.bac;
  if (!b.choisi) return;
  memoriserBac();
  // Chaque plan posé est une copie à lui : le décompte reconnaît les plans à
  // leur identité, et deux exemplaires du même plan doivent rester deux.
  const choisi = b.choisi.plan;
  const plan = { ...choisi, el: choisi.el.slice(), ancre: false,
    carteId: `bac-${numeroBac++}` };
  appliquerPlan(b.banc, coup, plan);
  b.dernierPose = positionDansBanc(b.banc, plan);
  b.choisi = null;
  vueBanc();
}

/** Où un plan se trouve dans le banc — pour l'éclairer après la pose. */
function positionDansBanc(banc, plan) {
  for (const [si, seq] of banc.sequences.entries()) {
    const idx = seq.indexOf(plan);
    if (idx >= 0) return { p: 0, seq: si, idx };
  }
  return null;
}

function vueBanc() {
  const b = store.bac;
  const cfg = store.cfg;
  const s = compter(b.banc, cfg);
  const coups = coupsDuBac();
  const st = { cfg, bancs: [b.banc], joueurs: [{ nom: 'Établi' }], mains: [[]],
    phase: 'MONTAGE', courant: 0, dernierPose: b.dernierPose };
  const vise = b.choisi ? { plan: b.choisi.plan, coups } : null;

  const plans = plansDuBac(b.famille);
  const filtre = b.filtre.trim().toLowerCase();
  const vus = filtre
    ? plans.filter((p) => `${p.num} ${p.famille || ''} ${p.transition || ''}`.toLowerCase().includes(filtre))
    : plans;

  html(`${topbar('#/banc')}
  <div class="wrap large">
    <div class="panneau">
      <h2>Banc de montage</h2>
      <p class="aide">Tous les plans du jeu sous la main, et les <b>règles de pose de la partie</b> —
      ${cfg.sequencesMax} séquences, ${cfg.plansParCote} cartes de chaque côté du centre. Rien n’est tiré
      au sort : on choisit, on pose, on reprend, on annule. Le décompte est celui de la partie, au point
      près. Un Gros Plan se monte du côté de la <b>moitié</b> qu’il occupe sur sa carte : la gauche à
      gauche d’une séquence, la droite à droite. Les règles se changent dans <b>Variables</b>.</p>
      <div class="barre-outils" style="margin-top:12px">
        <button class="pill" id="bac-annuler" ${b.historique.length ? '' : 'disabled'}>↶ Annuler</button>
        <button class="pill" id="bac-retablir" ${b.refaits.length ? '' : 'disabled'}>↷ Rétablir</button>
        <button class="pill" id="bac-vider" ${b.banc.sequences.length ? '' : 'disabled'}>✕ Vider le banc</button>
        <span class="aide">${b.choisi
    ? `<b>${libelleDuBac(b.choisi.plan)}</b> en main — cliquez un emplacement${coups.length ? '' : ' … mais il n’y en a aucun'}`
    : 'Cliquez une carte ci-dessous, ou un plan déjà posé pour le reprendre.'}</span>
      </div>
    </div>

    <div class="bac-2col">
      <div class="panneau">
        <h2>Le montage<span class="banc-compte">Plan <b>${s.plans} / ${limitePlans(cfg)}</b>
          · ${s.sequences} séquence${s.sequences > 1 ? 's' : ''}</span></h2>
        ${bancBloc(st, 0, null, vise)}
        ${b.banc.sequences.length ? '<p class="aide" style="margin-top:10px">Un clic sur un plan posé le reprend en main : on le remet où l’on veut.</p>' : ''}
      </div>
      <div class="panneau">
        <h2>Décompte</h2>
        ${listePouvoirs(s)}
        ${blocRecensement(s)}
      </div>
    </div>

    <div class="panneau">
      <h2>La réserve<span class="banc-compte">${vus.length} plan${vus.length > 1 ? 's' : ''}</span></h2>
      <div class="filtre-barre" style="margin-top:10px">
        ${FAMILLES_BAC.map(([k, l]) => `<button class="pill ${b.famille === k ? 'on' : ''}" data-fam-bac="${k}">${l}</button>`).join('')}
        <input type="search" id="bac-filtre" placeholder="numéro…" value="${b.filtre}" style="max-width:140px">
      </div>
      <div class="rack">${vus.map((p) => `<div class="rack-plan ${
    b.choisi && identiteBac(b.choisi.plan) === identiteBac(p) ? 'sel' : ''}"
        data-plan-bac="${p.cle}"><div class="carte solo small">${renderPlan(p)}</div>
        <div class="lg">${libelleDuBac(p)}</div></div>`).join('')}</div>
    </div>
  </div>
  ${pied()}`);

  brancherBanc();
}

function brancherBanc() {
  const b = store.bac;

  app.querySelectorAll('[data-fam-bac]').forEach((el) => el.addEventListener('click', () => {
    b.famille = el.dataset.famBac; vueBanc();
  }));
  const f = app.querySelector('#bac-filtre');
  if (f) f.addEventListener('input', () => {
    b.filtre = f.value;
    vueBanc();
    const n = app.querySelector('#bac-filtre');
    if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  });

  // Choisir un plan dans la réserve. Recliquer le même le repose.
  app.querySelectorAll('[data-plan-bac]').forEach((el) => el.addEventListener('click', () => {
    const cle = el.dataset.planBac;
    const plan = plansDuBac(b.famille).find((x) => x.cle === cle);
    // Recliquer la carte qu'on tient la repose dans la réserve.
    if (b.choisi && b.choisi.source === 'reserve'
      && identiteBac(b.choisi.plan) === identiteBac(plan)) b.choisi = null;
    else b.choisi = plan ? { plan, source: 'reserve' } : null;
    vueBanc();
  }));

  // Reprendre un plan déjà posé : il quitte le banc et passe en main.
  const sequences = [...app.querySelectorAll('.banc .sequence')];
  sequences.forEach((seq, si) => {
    [...seq.children].forEach((el, k) => el.addEventListener('click', () => {
      memoriserBac();
      const plan = retirerPlanDuBanc(b.banc, si, k);
      b.choisi = plan ? { plan, source: 'banc' } : null;
      b.dernierPose = null;
      vueBanc();
    }));
  });

  // Poser : les emplacements portent leur coup, comme à la table.
  app.querySelectorAll('[data-coup]').forEach((el) => el.addEventListener('click', () => {
    poserDansBac(JSON.parse(decodeURIComponent(el.dataset.coup)));
  }));

  const annuler = app.querySelector('#bac-annuler');
  if (annuler) annuler.addEventListener('click', () => {
    if (!b.historique.length) return;
    b.refaits.push(clonerBanc(b.banc));
    b.banc = b.historique.pop();
    b.choisi = null; b.dernierPose = null;
    vueBanc();
  });
  const retablir = app.querySelector('#bac-retablir');
  if (retablir) retablir.addEventListener('click', () => {
    if (!b.refaits.length) return;
    b.historique.push(clonerBanc(b.banc));
    b.banc = b.refaits.pop();
    b.choisi = null; b.dernierPose = null;
    vueBanc();
  });
  const vider = app.querySelector('#bac-vider');
  if (vider) vider.addEventListener('click', () => {
    memoriserBac();
    b.banc = bancVide(); b.choisi = null; b.dernierPose = null;
    vueBanc();
  });

  brancherApercu();
}

// ===========================================================================
// LABORATOIRE
// ===========================================================================

let laboNb = 200;

function vueLabo() {
  const r = store.labo;
  html(`${topbar('#/labo')}
  <div class="wrap large">
    <div class="panneau">
      <h2>Laboratoire d’équilibrage</h2>
      <p class="aide">Rejoue des centaines de parties avec les variables courantes et les profils d’IA choisis
      sur l’accueil. Aucune interface, aucune humaine : uniquement des chiffres.</p>
      <div class="barre-outils" style="margin-top:16px">
        <span class="info">Table : ${store.joueurs.map((j) => `${j.nom} (${j.type === 'HUMAIN' ? 'remplacée par Équilibré' : PROFILS_IA[j.type].label.replace('IA — ', '')})`).join(' · ')}</span>
      </div>
      <div class="barre-outils">
        <label class="info">Parties&nbsp;
          <select id="nb">${[50, 100, 200, 500, 1000].map((n) => `<option value="${n}" ${n === laboNb ? 'selected' : ''}>${n}</option>`).join('')}</select>
        </label>
        <button class="pill" id="lancer" ${store.laboEnCours ? 'disabled' : ''}>${store.laboEnCours ? 'Simulation en cours…' : '▶ Lancer la campagne'}</button>
        <button class="pill" data-go="#/variables">Régler les variables</button>
      </div>
      <div class="progres" id="prog" style="${store.laboEnCours ? '' : 'display:none'}"><i style="width:0%"></i></div>
    </div>
    ${r ? resultatsLabo(r) : '<div class="panneau"><div class="vide">Aucune campagne pour l’instant.</div></div>'}
  </div>
  ${pied()}`);

  app.querySelector('#nb').addEventListener('change', (e) => { laboNb = +e.target.value; });
  app.querySelector('#lancer').addEventListener('click', lancerLabo);
}

async function lancerLabo() {
  const joueurs = store.joueurs.map((j) => ({ ...j, type: j.type === 'HUMAIN' ? 'EQUILIBRE' : j.type }));
  if (!bilanJeu(joueurs.length).jouable) {
    alert(messagePaquetCourt(joueurs.length).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')); return;
  }
  store.laboEnCours = true;
  vueLabo();
  const barre = app.querySelector('#prog i');
  store.labo = await campagne(joueurs, cloneConfig(store.cfg), laboNb, {
    onProgress: (fait, total) => { if (barre) barre.style.width = `${(fait / total) * 100}%`; },
  });
  store.laboEnCours = false;
  vueLabo();
}

function resultatsLabo(r) {
  const t = (x) => (Math.round(x * 10) / 10).toFixed(1);
  return `
  <div class="panneau">
    <h2>Vue d’ensemble — ${r.nbParties} parties · graine ${r.graine}</h2>
    <div class="stats-grille">
      ${tuile('Score moyen', t(r.global.moy), `écart-type ${t(r.global.ecart)}`)}
      ${tuile('Score médian', r.global.med, `de ${r.global.min} à ${r.global.max}`, 'orange')}
      ${tuile('Plans visibles', t(r.plans.moy), 'par banc', 'vert')}
      ${tuile('Séquences', t(r.sequences.moy), `plus longue : ${t(r.plusLongue.moy)} plans`)}
      ${tuile('Raccords, Ouverture, Fin', t(r.raccords.moy), 'par banc', 'orange')}
      ${tuile('Défausses au Chutier', t(r.defausses.moy), `par partie · ${t(r.prisesChutier.moy)} reprise${r.prisesChutier.moy >= 2 ? 's' : ''} sur le Chutier`)}
      ${tuile('Tours passés', t(r.passes.moy), 'par partie — faute de carte à monter', 'vert')}
      ${tuile('Parties serrées', `${Math.round(r.tauxSerre * 100)} %`, '3 points ou moins d’écart', 'vert')}
      ${tuile('Égalités', `${Math.round(r.tauxEgalite * 100)} %`, 'en tête')}
      ${tuile('Écart 1re / dernière', t(r.ecartVainqueur.moy), `max ${r.ecartVainqueur.max}`, 'orange')}
    </div>
  </div>

  <div class="grid2">
    <div class="panneau">
      <h2>Distribution des scores</h2>
      <div class="histo">
        ${r.distribution.map((b) => `<div class="b" style="height:${Math.max(2, b.part * 100)}%" title="${b.de}–${b.a} pts : ${b.n} (${Math.round(b.pct * 100)} %)"></div>`).join('')}
      </div>
      <div class="histo-legende"><span>${r.global.min} pts</span><span>${r.global.max} pts</span></div>
    </div>

    <div class="panneau">
      <h2>D’où viennent les points</h2>
      <div class="barres">
        ${r.sources.filter((s) => s.pts !== 0).map((s) => `
          <div class="barre-l">
            <span>${s.label}</span>
            <div class="piste"><div class="jauge ${s.pts < 0 ? 'o' : ''}" style="width:${s.part * 100}%"></div></div>
            <span class="val">${Math.round(s.part * 100)} %</span>
          </div>`).join('') || '<p class="aide">Aucun point marqué.</p>'}
      </div>
    </div>

    <div class="panneau">
      <h2>Avantage de position</h2>
      <table class="tbl">
        <tr><th>Siège</th><th>Profil</th><th class="num">Score moyen</th><th class="num">Médiane</th><th class="num">Victoires</th></tr>
        ${r.parSiege.map((s, i) => `<tr>
          <td>${i + 1}. ${s.nom}</td>
          <td>${PROFILS_IA[s.type] ? PROFILS_IA[s.type].label.replace('IA — ', '') : s.type}</td>
          <td class="num">${t(s.moy)}</td><td class="num">${s.med}</td>
          <td class="num"><b>${Math.round(s.tauxVictoire * 100)} %</b></td>
        </tr>`).join('')}
      </table>
      <p class="aide" style="margin-top:10px">Avec une première joueuse tirée au sort, des taux qui s’écartent
      nettement de ${Math.round(100 / r.parSiege.length)} % signalent un déséquilibre de position ou de profil.</p>
    </div>

    <div class="panneau">
      <h2>Force des profils d’IA</h2>
      <div class="barres">
        ${r.profils.map((p) => `<div class="barre-l">
          <span>${PROFILS_IA[p.type] ? PROFILS_IA[p.type].label : p.type}</span>
          <div class="piste"><div class="jauge" style="width:${Math.min(100, p.taux * 100)}%"></div></div>
          <span class="val">${Math.round(p.taux * 100)} %</span></div>`).join('')}
      </div>
      <p class="aide" style="margin-top:10px">Taux de victoire par profil. Si le Stratège ne bat pas nettement
      le Novice, les décisions du jeu pèsent peu — c’est le premier signal d’équilibrage à corriger.</p>
    </div>
  </div>`;
}

function tuile(k, v, s, cls = '') {
  return `<div class="tuile ${cls}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
}

// ===========================================================================
// HISTORIQUE / VERSIONS
// ===========================================================================

function vueHistorique() {
  const h = store.historique;
  html(`${topbar('#/historique')}
  <div class="wrap">
    <div class="panneau">
      <h2>Historique des parties</h2>
      ${h.length ? `<table class="tbl">
        <tr><th>Date</th><th>Graine</th><th class="num">Joueuses</th><th class="num">Tours</th><th>Scores</th></tr>
        ${h.map((g) => `<tr>
          <td>${new Date(g.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${g.seed}</td><td class="num">${g.joueurs.length}</td><td class="num">${g.tours}</td>
          <td>${g.scores.map((s, i) => `${i === 0 ? '🏆 ' : ''}${s.nom} <b>${s.total}</b>`).join(' · ')}</td>
        </tr>`).join('')}
      </table>
      <div class="barre-outils" style="margin-top:16px"><button class="pill" id="vider">Vider l’historique</button></div>`
      : '<div class="vide">Aucune partie terminée pour l’instant.</div>'}
    </div>
  </div>
  ${pied()}`);
  const b = app.querySelector('#vider');
  if (b) b.addEventListener('click', () => {
    if (confirm('Vider l’historique ?')) { store.historique = []; LS.set('historique', []); vueHistorique(); }
  });
}

function vueVersions() {
  html(`${topbar('#/versions')}
  <div class="wrap">
    <h1 style="font-size:1.9rem;margin:10px 0 4px">Historique des versions</h1>
    <p class="aide" style="margin-bottom:22px">Version actuelle <b>${VERSION}</b> — compilée le ${BUILD_DATE}.</p>
    ${CHANGELOG.map((v, i) => `
      <div class="version-bloc ${i === 0 ? 'actuelle' : ''}">
        <span class="num">${v.v}</span><span class="date">${v.date}</span>
        ${i === 0 ? '<span class="etiquette">version actuelle</span>' : ''}
        <ul>${v.items.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>`).join('')}
  </div>
  ${pied()}`);
}

// ===========================================================================
// LE JEU EN LIGNE — le hall, le salon
// ===========================================================================
// La partie, elle, se joue dans `vuePartie` : c'est la même table, seulement
// les coups y passent par le journal au lieu d'être joués sur place.

/**
 * Le salon, créé à la demande. Le transport hébergé n'est choisi que si les
 * clés sont là ; sinon on se rabat sur les onglets du même navigateur, ce qui
 * marche parfaitement pour éprouver le jeu à deux sur un seul poste.
 */
function salonCourant() {
  if (!store.enLigne) {
    const transport = enLigneDisponible() ? new TransportSupabase() : new TransportLocal();
    store.enLigne = new Salon(transport, () => {
      // Une partie lancée quitte le hall pour la table.
      if (store.enLigne && store.enLigne.partie && location.hash !== '#/partie') {
        location.hash = '#/partie';
        return;
      }
      if (location.hash === '#/partie') vuePartie(false);
      else if (location.hash === '#/enligne') vueEnLigne();
    });
    store.enLigne.ecouterHall();
    // Lecture seule, pour l'inspection depuis la console — et pour les essais
    // à deux onglets, où l'on veut voir ce que chaque appareil croit savoir.
    window.editSalon = store.enLigne;
    // Un rafraîchissement ne doit pas faire perdre sa place : on se resignale
    // au salon qu'on occupait, et l'on rejoue le journal qu'on nous renvoie.
    store.enLigne.reprendre();
  }
  return store.enLigne;
}

/**
 * Le bandeau du jeu en ligne : à qui c'est, et où en est la liaison. Une
 * application temps réel muette *semble* en panne — mieux vaut le dire.
 */
function bandeauEnLigne(enl, st) {
  const [cls, txt] = JETON_LIAISON[enl.liaison] || JETON_LIAISON.ok;
  const j = st.joueurs[st.courant];
  const aMoi = enl.aMoiDeJouer;
  return `<div class="bandeau-ligne">
    <span class="jeton-liaison ${enLigneDisponible() ? cls : 'liaison-locale'}">${
      enLigneDisponible() ? txt : 'entre onglets'}</span>
    <b class="tour-ligne ${aMoi ? 'a-moi' : ''}" style="--enc:${encreDe(j.couleur)}">${
      aMoi ? 'À vous de jouer' : `Au tour de ${j.nom}`}</b>
    <span class="aide">${enl.salon.nom} · vous êtes ${enl.moi.nom || 'sans nom'}</span>
    <button class="pill" id="ligne-partir">Quitter la partie</button>
  </div>`;
}

const JETON_LIAISON = {
  connexion: ['liaison-attente', 'connexion…'],
  ok: ['liaison-ok', 'en ligne'],
  erreur: ['liaison-ko', 'liaison interrompue'],
};

/**
 * Pourquoi la liaison est tombée, quand on le sait — et ce que l'on peut y faire.
 * La raison vient du transport (texte du serveur compris) : on l'échappe.
 */
function raisonLiaison(s) {
  if (s.liaison !== 'erreur' || !enLigneDisponible()) return '';
  const texte = String(s.raisonLiaison || 'La connexion temps réel ne s’établit pas.')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p class="liaison-raison"><b>Liaison interrompue.</b> ${texte}
    <span class="aide">${s.salon ? 'Les autres appareils ne voient pas ce salon.'
    : 'Les salons des autres appareils n’apparaissent pas.'} Rechargez la page pour réessayer ; la console
    du navigateur donne le détail.</span></p>`;
}

function vueEnLigne() {
  const s = salonCourant();
  if (s.partie) { location.hash = '#/partie'; return; }
  const [cls, txt] = JETON_LIAISON[s.liaison] || JETON_LIAISON.ok;
  const jeton = enLigneDisponible()
    ? `<span class="jeton-liaison ${cls}">${txt}</span>`
    : '<span class="jeton-liaison liaison-locale" title="Aucune clé Supabase : les salons ne sortent pas de ce navigateur">entre onglets</span>';

  html(`${topbar('#/enligne')}
  <div class="wrap">
    <div class="entete-ligne">
      <h1>${s.salon ? s.salon.nom : 'Parties en ligne'}</h1>
      ${jeton}
      <button class="pill" id="ligne-retour">${s.salon ? '← Quitter le salon' : '← Retour'}</button>
    </div>
    ${raisonLiaison(s)}
    ${s.salon ? vueSalon(s) : vueHall(s)}
  </div>
  ${pied()}`);

  app.querySelector('#ligne-retour').addEventListener('click', () => {
    if (s.salon) { s.quitter(); vueEnLigne(); } else { location.hash = '#/'; }
  });
  if (s.salon) brancherSalon(s); else brancherHall(s);
}

// ------------------------------------------------------------------- le hall

function vueHall(s) {
  const n = s.liste.length;
  return `
  <div class="panneau">
    <label class="ch-lg" for="ligne-nom">Votre nom</label>
    <input type="text" id="ligne-nom" maxlength="20" value="${(s.moi.nom || '').replace(/"/g, '&quot;')}"
      placeholder="Comment les autres vous verront">
    <div style="margin-top:14px"><button class="cta" id="ligne-ouvrir">Démarrer une partie en ligne</button></div>
    <p class="aide">Vous ouvrez un salon ; les autres le voient apparaître dans la liste ci-dessous et
    viennent s’y asseoir.</p>
  </div>

  <div class="panneau">
    <h2>Rejoindre un salon (${n})</h2>
    ${n ? `<div class="liste-salons">${s.liste.map((x) => `
      <div class="salon-ligne">
        <b>${x.nom}</b>
        <span class="aide">${x.joueurs} joueur${x.joueurs > 1 ? 's' : ''}</span>
        <button class="pill" data-rejoindre="${x.id}">S’asseoir</button>
      </div>`).join('')}</div>`
    : `<p class="aide">Aucun salon ouvert pour l’instant. Ouvrez-en un — ou attendez qu’une joueuse s’y colle.</p>`}
  </div>

  ${enLigneDisponible() ? '' : `<div class="encart attention">
    <b>Le jeu entre appareils n’est pas encore branché.</b> En attendant, les salons circulent entre les
    <b>onglets de ce navigateur</b> : ouvrez une seconde fenêtre sur la même page pour jouer à deux et
    tout essayer. Il suffira d’une adresse et d’une clé publique dans <code>js/net/config.js</code> pour
    que les salons franchissent la porte.</div>`}`;
}

function brancherHall(s) {
  const champ = app.querySelector('#ligne-nom');
  const nom = () => (champ.value || '').trim() || 'Sans nom';
  champ.addEventListener('change', () => s.nommer(nom()));
  app.querySelector('#ligne-ouvrir').addEventListener('click', async () => {
    s.nommer(nom());
    await s.ouvrir(cloneConfig(store.cfg));
    vueEnLigne();
  });
  app.querySelectorAll('[data-rejoindre]').forEach((b) => b.addEventListener('click', async () => {
    s.nommer(nom());
    const r = s.liste.find((x) => x.id === b.dataset.rejoindre);
    if (r) { await s.rejoindre(r); vueEnLigne(); }
  }));
}

// ------------------------------------------------------------------ le salon

function vueSalon(s) {
  const sal = s.salon;
  const hote = s.suisHote;
  const moi = sal.membres.find((m) => m.id === s.moi.id);
  const prises = new Set(sal.membres.filter((m) => m.id !== s.moi.id && m.couleur).map((m) => m.couleur));
  const assis = sal.membres.filter((m) => m.present && m.couleur).length;

  return `<div class="grid2">
    <div>
      <div class="panneau">
        <h2>Joueuses (${sal.membres.filter((m) => m.present).length})</h2>
        <div class="liste-membres">${sal.membres.filter((m) => m.present).map((m) => `
          <div class="membre ${m.id === s.moi.id ? 'moi' : ''}">
            <i style="background:${m.couleur || '#e7e3f0'}"></i>
            <b>${m.nom || 'Sans nom'}</b>
            ${m.id === sal.hote ? '<span class="pill mini">hôte</span>' : ''}
            ${m.id === s.moi.id ? '<span class="pill mini">vous</span>' : ''}
            <span class="aide">${m.couleur ? nomCouleur(m.couleur) : 'sans couleur'}</span>
          </div>`).join('')}</div>

        <div class="ch-lg" style="margin-top:14px">Votre couleur</div>
        <div class="puces">${PALETTE_JOUEURS.map((c) => `
          <div class="puce ${moi && moi.couleur === c.clair ? 'on' : ''} ${prises.has(c.clair) ? 'prise' : ''}"
            style="background:${c.clair}" data-couleur-ligne="${c.clair}" title="${prises.has(c.clair) ? 'déjà prise' : c.nom}"></div>`).join('')}
        </div>

        ${hote ? `<button class="cta" id="ligne-lancer" ${assis < 2 ? 'disabled' : ''}
            style="margin-top:16px">Commencer la partie</button>
          <p class="aide">${assis < 2 ? 'Il faut au moins deux joueuses ayant choisi une couleur.'
            : `${assis} joueuses prêtes — c’est vous qui lancez.`}</p>`
        : `<p class="aide" style="margin-top:16px">${moi && moi.couleur
            ? 'Vous êtes assise. L’hôte lance la partie quand tout le monde est prêt.'
            : 'Choisissez une couleur pour prendre place.'}</p>`}
      </div>
    </div>

    <div>
      <div class="panneau">
        <h2>Réglages de la partie</h2>
        <p class="aide">${hote ? 'Ce sont vos réglages et votre matériel qui partent en partie — comme la boîte appartient à qui l’apporte. Réglez-les avant de lancer, dans Variables et Matériel.'
          : 'Les réglages et le matériel sont ceux de l’hôte.'}</p>
        ${sal.cfg ? `<div class="chips">
          <span class="chip on">${sal.cfg.tours} plans</span>
          <span class="chip on">rivière de ${sal.cfg.riviere}</span>
          <span class="chip on">Boîte 4.1${sal.cfg.materielActif === 'MODIFIE' ? ' · modifiée' : ''}</span>
        </div>` : '<p class="aide">En attente de l’hôte…</p>'}
      </div>
    </div>
  </div>`;
}

const nomCouleur = (c) => {
  const p = PALETTE_JOUEURS.find((x) => x.clair === c);
  return p ? p.nom : '';
};

function brancherSalon(s) {
  app.querySelectorAll('[data-couleur-ligne]').forEach((el) => el.addEventListener('click', () => {
    if (el.classList.contains('prise')) return;
    const moi = s.salon.membres.find((m) => m.id === s.moi.id);
    s.choisirCouleur(moi && moi.couleur === el.dataset.couleurLigne ? null : el.dataset.couleurLigne);
    vueEnLigne();
  }));
  const lancer = app.querySelector('#ligne-lancer');
  if (lancer) {
    lancer.addEventListener('click', () => {
      const n = (s.salon && s.salon.membres && s.salon.membres.length) || store.joueurs.length;
      if (!bilanJeu(n).jouable) {
        alert(messagePaquetCourt(n).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')); return;
      }
      s.lancer();
    });
  }
}

// ===========================================================================
// Routage
// ===========================================================================

const ROUTES = {
  '#/': vueAccueil,
  '#/partie': vuePartie,
  '#/enligne': vueEnLigne,
  '#/materiel': vueMateriel,
  '#/regles': vueRegles,
  '#/variables': vueVariables,
  '#/banc': vueBanc,
  '#/labo': vueLabo,
  '#/historique': vueHistorique,
  '#/versions': vueVersions,
};

function route() {
  document.onkeydown = null;
  document.body.classList.remove('mode-impression');
  const hash = location.hash || '#/';
  // Un écran fermé par le mode partagé ne s'ouvre pas non plus à la main, dans
  // la barre d'adresse : masquer l'onglet sans fermer la route ne fermerait
  // rien du tout.
  if (enPartage() && ECRANS_FERMES.includes(hash)) {
    history.replaceState(null, '', `${location.pathname}#/`);
    vueAccueil();
    window.scrollTo(0, 0);
    return;
  }
  (ROUTES[hash] || vueAccueil)();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
// Les visuels apportés vivent dans le navigateur, et leur lecture est
// asynchrone : on ouvre la réserve AVANT le premier dessin. Sans cela, une
// carte qui en porte un s'afficherait nue le temps d'un battement, puis se
// rhabillerait — ce qui se voit. Une réserve qui refuse de s'ouvrir ne retient
// pas le démarrage : le jeu tourne, sans les visuels apportés.
/**
 * Une adresse peut porter un PARTAGE — tout le jeu de celui qui l'a envoyée,
 * dans le fragment. On l'applique avant le premier dessin, sinon la page
 * montrerait l'ancien matériel le temps d'un battement.
 *
 * Une machine qui n'a rien réglé l'adopte sans rien demander : c'est un
 * testeur, il a ouvert le lien pour ça. Une machine qui a du travail dessus est
 * prévenue — on n'efface pas le matériel de quelqu'un parce qu'il a cliqué sur
 * un lien.
 *
 * Le fragment est ensuite effacé de la barre d'adresse : on ne veut pas
 * réappliquer le partage à chaque rechargement, ni traîner une adresse de trois
 * mille caractères.
 */
async function partageDeLAdresse() {
  const charge = partageDeLURL(location.hash);
  if (!charge) return;
  const p = await decoderPartage(charge);
  // Le lien mène à l'ACCUEIL : c'est là qu'un testeur commence. Le Matériel,
  // vers lequel menait ce chemin, lui est justement fermé.
  history.replaceState(null, '', `${location.pathname}#/`);
  if (!p) { alert('Ce lien de partage est illisible — il a sans doute été coupé en route.'); return; }
  if (await appliquerPartage(p, true)) {
    entrerEnPartage(p);
    alert(`Vous jouez maintenant la version partagée — ${p.version}, du ${p.date}.\n\n`
      + 'Cartes, réglages, mode et variantes sont ceux de qui vous a envoyé le lien : il n’y a '
      + 'rien à régler. Les écrans de fabrication — Matériel, Laboratoire, Versions — sont fermés, '
      + 'et le jeton « 🔗 Version partagée », en haut, en sort d’un clic.'
      + motVersion(p));
  }
}

Promise.all([chargerPublie(VERSION)])
  .then(() => { adopterPublie(false); }, () => {})
  .then(partageDeLAdresse, partageDeLAdresse)
  .then(route, route);


// ===========================================================================
// Deux fenêtres, un seul matériel
// ===========================================================================
// On règle les cartes dans une fenêtre et l'on joue dans l'autre, souvent sur
// deux écrans. Le navigateur prévient les autres onglets de la même origine dès
// qu'une clé de stockage change : on relit donc la configuration, on réapplique
// le matériel et l'on repeint — la retouche se voit sur la table sans avoir à
// relancer quoi que ce soit.
//
// `storage` ne se déclenche QUE dans les autres fenêtres : celle qui écrit ne
// s'entend pas elle-même, il n'y a donc pas de boucle. Et la partie en cours ne
// franchit pas la frontière — elle n'est pas enregistrée : chaque fenêtre garde
// la sienne.

/**
 * Ré-applique le matériel courant à une partie déjà commencée. Un plan posé est
 * une **copie** faite au moment de la pose : il ne suivrait pas une retouche.
 * On rejoue donc sur lui les seuls champs que l'éditeur règle — minutage,
 * icônes, pouvoirs, mort, numéro — en gardant ce que la pose lui a donné : son
 * cadrage, sa moitié, sa carte d'origine.
 *
 * Les cartes encore en pioche, en rivière ou en main se relisent à chaque
 * rendu. Leur **assemblage** — quels Gros Plans vont ensemble — et la
 * **composition de la boîte** tiennent au paquet lui-même : c'est
 * `resynchroniserBoite()` qui les remet d'accord, dans le moteur. Il ne touche
 * pas à la carte en main ; on refait donc ici son assemblage, par rang.
 */
function resynchroniserMateriel(st, cfg) {
  // Une partie finie ne bouge plus : son décompte est arrêté, et l'écran de fin
  // doit dire ce qui s'est joué, pas ce que le matériel est devenu depuis.
  if (!st || st.finie) return;
  // La partie joue son propre instantané de configuration : c'est lui qu'il
  // faut mettre à jour, `appliquerJeuActif()` s'en sert pendant une partie.
  st.cfg.materiel = JSON.parse(JSON.stringify(cfg.materiel));
  st.cfg.cartesDesactivees = (cfg.cartesDesactivees || []).slice();
  st.cfg.materielActif = cfg.materielActif;
  appliquerJeuActif();

  const parRang = new Map(buildCartesDoubles().map((c) => [c.rang, c]));
  for (const main of st.mains) {
    for (const c of main || []) {
      const n = c && c.type === 'DOUBLE' ? parRang.get(c.rang) : null;
      if (n) Object.assign(c, { gScene: n.gScene, dScene: n.dScene, gNum: n.gNum, dNum: n.dNum });
    }
  }

  for (const banc of st.bancs) {
    for (const seq of banc.sequences) {
      seq.forEach((plan, i) => {
        const a = plan.cle ? planDeCle(plan.cle) : null;
        if (!a) return;
        seq[i] = { ...plan, tc: a.tc, el: a.el.slice(), obj: a.obj, obj2: a.obj2, mort: a.mort, num: a.num };
      });
    }
  }

  // Enfin la boîte : les cartes écartées quittent la pioche et la rivière,
  // celles qu'on réactive y reviennent.
  resynchroniserBoite(st);
}

window.addEventListener('storage', (e) => {
  if (e.key !== 'edit.cfg') return;
  const lu = LS.get('cfg', null);
  if (!lu) return;
  store.cfg = Object.assign(cloneConfig(DEFAULTS), migrerCfg(lu));
  normaliserMateriel();
  appliquerJeuActif();
  resynchroniserMateriel(store.partie, store.cfg);
  // Les plans posés ont changé de valeur : la courbe des scores, elle, garde
  // les totaux d'alors — c'est l'histoire de la partie, pas son état. On
  // repeint l'écran affiché, sans le ramener en haut : on regardait quelque
  // chose, une retouche faite ailleurs ne doit pas le faire perdre de vue.
  (ROUTES[location.hash || '#/'] || vueAccueil)();
});

// ===========================================================================
// Veille de version
// ===========================================================================
// js/version.js est relu régulièrement en contournant tous les caches. Si une
// version plus récente que celle en cours d'exécution est publiée, la page se
// recharge une fois d'elle-même (garde anti-boucle : un seul essai par
// version) ; si le rechargement ne suffit pas — cache tenace —, un bandeau
// propose un rechargement forcé.

async function versionPubliee() {
  // version.json est écrit par outils/versionner.mjs et relu hors de tout
  // cache : il dit la version réellement publiée, indépendamment des modules
  // que le navigateur a pu garder en mémoire.
  const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return (await r.json()).version || null;
}

/** Repart sur une adresse neuve : le document lui-même échappe ainsi au cache. */
async function rechargerPropre(v) {
  if (window.caches) {
    const cles = await caches.keys();
    await Promise.all(cles.map((k) => caches.delete(k)));
  }
  location.replace(`${location.pathname}?v=${v}${location.hash}`);
}

function bandeauMiseAJour(v) {
  if (document.getElementById('maj-bandeau')) return;
  const b = document.createElement('div');
  b.id = 'maj-bandeau';
  b.innerHTML = `Version <b>${v}</b> disponible — vous êtes en v${VERSION}.
    <button id="maj-recharger">Recharger</button>`;
  document.body.appendChild(b);
  document.getElementById('maj-recharger').addEventListener('click', () => rechargerPropre(v));
}

async function veilleVersion() {
  try {
    const v = await versionPubliee();
    if (!v || v === VERSION) return;
    if (store.partie && !store.partie.finie) { bandeauMiseAJour(v); return; }
    const K = 'edit.rechargePour';
    if (localStorage.getItem(K) !== v) {
      localStorage.setItem(K, v);
      rechargerPropre(v);
    } else {
      bandeauMiseAJour(v);
    }
  } catch { /* hors ligne : on retentera */ }
}

/**
 * Centre le minutage sur son **encre**, et non sur sa ligne.
 *
 * Une ligne de texte n'est pas remplie de la même façon d'une fonte à l'autre :
 * l'une réserve beaucoup de place sous la ligne de base, l'autre monte plus
 * haut. Centrer la ligne — tout ce que le CSS sait faire — laisse donc les
 * chiffres pencher vers le haut ou vers le bas selon la fonte du système, et
 * ils sortaient de leur boîte noire par le bas là où la ligne de base tombe
 * bas. Aucune règle CSS ne mesure l'encre ; on la mesure donc soi-même.
 *
 * Deux mesures, aucune supposition sur les métriques de la fonte :
 *   — **où tombe la ligne de base**, lue dans le document lui-même. Une cale
 *     vide en display:inline-block s'aligne sur la ligne de base par son bord
 *     bas : sa position dans la boîte la donne exactement, telle que le
 *     navigateur l'a posée, centrage compris ;
 *   — **où est l'encre autour de cette ligne de base**, que le canevas donne
 *     avec `actualBoundingBox`, mesuré sur les glyphes et non sur la fonte.
 *
 * L'écart entre le centre de l'encre et le centre de la boîte devient un
 * rembourrage — qui décale la boîte de contenu, donc le texte centré dedans.
 */
export function calerMinutage() {
  try {
    const POLICE = '"SFMono-Regular", "Consolas", "Menlo", monospace';
    const T = 100;   // on mesure en grand : l'arrondi au pixel pèse cent fois moins

    const boite = document.createElement('div');
    boite.setAttribute('style', `position:absolute;left:-9999px;top:0;visibility:hidden;`
      + `display:flex;align-items:center;justify-content:center;`
      + `font:700 ${T}px/1 ${POLICE};letter-spacing:.04em;height:1.35em;width:4em;padding:0;`);
    // Le texte ET la cale dans un même enfant : dans un conteneur flex, chaque
    // élément est un item à part — une cale posée directement dans la boîte
    // serait centrée pour elle-même au lieu de suivre la ligne de base du
    // texte, et ne mesurerait plus rien.
    const ligne = document.createElement('span');
    const cale = document.createElement('i');
    cale.setAttribute('style', 'display:inline-block;width:0;height:0');
    ligne.append('60:00', cale);
    boite.appendChild(ligne);
    document.body.appendChild(boite);
    const rb = boite.getBoundingClientRect();
    const base = cale.getBoundingClientRect().bottom - rb.top;   // la ligne de base
    const H = rb.height;
    boite.remove();
    if (!(H > 0) || !Number.isFinite(base)) return;

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.font = `700 ${T}px ${POLICE}`;
    const m = ctx.measureText('60:00');
    const a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
    if (!Number.isFinite(a) || !Number.isFinite(d)) return;

    // De combien le centre de l'encre tombe sous le centre de la boîte, en em.
    // Plus un léger biais vers le haut : des chiffres exactement centrés dans
    // une boîte se lisent un cheveu trop bas, l'œil plaçant leur assise sur la
    // ligne de base et non au milieu de leur hauteur.
    const ecart = ((base + (d - a) / 2) - H / 2) / T + 0.06;
    // Un rembourrage de p décale le contenu centré de p / 2 : il en faut donc
    // le double de l'écart à rattraper.
    const r = document.documentElement.style;
    r.setProperty('--tc-haut', `${Math.max(0, -ecart * 2).toFixed(4)}em`);
    r.setProperty('--tc-bas', `${Math.max(0, ecart * 2).toFixed(4)}em`);
  } catch { /* pas de canevas : on garde le centrage par défaut */ }
}

calerMinutage();
// Les fontes du système sont là tout de suite, mais on remesure quand le
// navigateur déclare les avoir toutes : rien ne coûte à vérifier.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(calerMinutage);

veilleVersion();
setInterval(veilleVersion, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') veilleVersion();
});
