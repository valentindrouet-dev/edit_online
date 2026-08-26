// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js?v=1.71';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, DEPARTS, OBJ, objLabel,
  buildCartesDoubles, buildPlansLarges, moitiesDe, plHalf, halfInfo, FACES,
  appliquerMateriel, catalogue, moitiesDisponibles, cleplan, planDeCle, doublonsNumeros,
  CADRAGES_VISABLES, CADRAGES_POUVOIR, PORTEES, PORTEE_IDS, objPortee, faceJouee, PERSONNAGES, objsDe,
  KINDS_SEQUENCE, ciblesSequence,
} from './data.js?v=1.71';
import { DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, PALETTE_JOUEURS, encreDe, cloneConfig, migrerCfg, MODES, modeCourant } from './config.js?v=1.71';
import { elIcon, numIcon } from './icons.js?v=1.71';
import { renderCarte, renderPlan, renderDos, enPile, tc, objHTML, objContenu, cadrageIcon, estSi } from './cards.js?v=1.71';
import {
  creerPartie, choixDepart, poserDepart, optionsDerushage, derusher,
  coupsPossibles, poser, avancer, scores, classement, construirePaquet, nouvelleGraine, planPose,
  faceVisible, retourner, resynchroniserBoite,
} from './engine.js?v=1.71';
import { choisirCoup, choisirDerushage, choisirDepart } from './ai.js?v=1.71';
import { compter, SOURCES_LABEL, estRaccord, compteIcone } from './scoring.js?v=1.71';
import { releve, voler, stopperVols } from './anim.js?v=1.71';
import { campagne } from './lab.js?v=1.71';
import { archiveCartes, planchesCartes, PLANCHE } from './export-pdf.js?v=1.71';
import { Salon } from './net/salon.js?v=1.71';
import { TransportLocal } from './net/local.js?v=1.71';
import { TransportSupabase } from './net/supabase.js?v=1.71';
import { enLigneDisponible } from './net/config.js?v=1.71';
import { coupNu } from './net/protocole.js?v=1.71';
import { REGLES_VERSION, REGLES_HISTORIQUE, corpsRegles, corpsVersion } from './regles.js?v=1.71';

const app = document.getElementById('app');

// --- Persistance -----------------------------------------------------------

const LS = {
  get(k, d) { try { const v = localStorage.getItem('edit.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('edit.' + k, JSON.stringify(v)); } catch { /* quota */ } },
};

const store = {
  cfg: Object.assign(cloneConfig(DEFAULTS), migrerCfg(LS.get('cfg', {}))),
  joueurs: LS.get('joueurs', [
    { nom: 'Val', couleur: COULEURS_JOUEURS[0], type: 'HUMAIN' },
    { nom: 'Justine', couleur: COULEURS_JOUEURS[1], type: 'EQUILIBRE' },
  ]),
  historique: LS.get('historique', []),
  partie: null,
  labo: null,
  laboEnCours: false,
  formatChoisi: null,   // 'GP' | 'PM' | 'PL' pendant la phase de montage
  // La carte visée dans la rivière, et la moitié retenue : { o, format }. Le
  // tour se joue d'un bout à l'autre depuis le même écran — on choisit dans
  // la rivière, on pose dans le banc, sans étape intermédiaire.
  choixRiviere: null,
  joueurVu: null,       // le banc dont on lit les colonnes ; null = celui qui joue
  undo: null,
  vols: [],             // les cartes à faire voler au prochain rendu
  filIA: 0,             // jeton du fil des coups d'IA : incrémenté, il l'annule
  // Le banc affiché : un seul à la fois, les autres en onglets. null = le
  // sien. Seul un clic d'onglet en change — jamais le tour d'un adversaire.
  bancVu: null,
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
  // Les réglages d'avant l'éditeur ne portaient que sur le minutage.
  if (store.cfg.minutages && typeof store.cfg.minutages === 'object') {
    for (const [num, tc] of Object.entries(store.cfg.minutages)) {
      if (tc !== undefined && tc !== null && tc !== '') m.plans[num] = { ...(m.plans[num] || {}), tc: Number(tc) };
    }
    delete store.cfg.minutages;
  }
  // Le pouvoir « avant / après cette carte » était un type à part : c'est
  // désormais la portée d'un pouvoir ordinaire.
  for (const v of Object.values(m.plans)) {
    if (v.obj && v.obj.kind === 'POSITION') {
      const o = v.obj;
      v.obj = o.quoi === 'FORMAT'
        ? { kind: 'FORMAT', n: o.n, format: o.format, portee: o.sens === 'APRES' ? 'APRES' : 'AVANT' }
        : { kind: 'ELEMENT', n: o.n, el: o.el, portee: o.sens === 'APRES' ? 'APRES' : 'AVANT' };
    }
  }
  // Avant les faces, une moitié de carte double n'avait qu'une clé : son
  // numéro. La retouche vaut désormais pour le recto et pour le verso.
  for (const [k, v] of Object.entries(m.plans)) {
    if (/^(2|3)\d\d$/.test(k)) {
      for (const f of ['R', 'V']) if (!m.plans[k + f]) m.plans[k + f] = JSON.parse(JSON.stringify(v));
      delete m.plans[k];
    }
  }
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
  if (profondeurModifie++ === 0) appliquerMateriel(store.cfg.materiel, store.cfg.cartesDesactivees, store.cfg.materiel);
  try { return fn(); } finally { if (--profondeurModifie === 0) appliquerJeuActif(); }
}
function sauverJoueurs() { LS.set('joueurs', store.joueurs); }

// --- Chrome ----------------------------------------------------------------

const ONGLETS = [
  ['#/materiel', 'Matériel'],
  ['#/regles', 'Règles'],
  ['#/variables', 'Variables'],
  ['#/labo', 'Laboratoire'],
  ['#/historique', 'Historique'],
  ['#/versions', 'Versions'],
];

function topbar(actif) {
  const enPartie = store.partie && !store.partie.finie;
  return `<div class="topbar">
    <div class="marque" data-go="#/">
      <div class="logo-mark">
        <i style="background:#7c3aed"></i><i style="background:#f97316"></i>
        <i style="background:#f59e0b"></i><i style="background:#c026d3"></i>
      </div>
      <div class="wordmark">EDIT</div>
      <div class="version-pill">v${VERSION}</div>
    </div>
    <nav class="nav">
      ${enPartie && actif !== '#/partie' ? `<button class="chaud" data-go="#/partie">▶ Partie en cours</button>` : ''}
      ${actif !== '#/' ? `<button data-go="#/">Accueil</button>` : ''}
      ${ONGLETS.map(([h, l]) => `<button class="${actif === h ? 'actif' : ''}" data-go="${h}">${l}</button>`).join('')}
    </nav>
  </div>`;
}

const pied = () => `<div class="pied">Version ${VERSION} — compilée le ${BUILD_DATE}</div>`;

function html(s, garderDefilement = false) {
  if (apercuEl) apercuEl.classList.remove('visible');
  document.body.classList.toggle('sans-illus', !store.cfg.illustrations);
  document.body.classList.toggle('sans-points', store.cfg.pointsSurCartes === false);
  const y = window.scrollY;
  app.innerHTML = s;
  // Repeindre la table ne doit pas ramener la page en haut.
  if (garderDefilement && y) window.scrollTo({ top: y, behavior: 'instant' });
  app.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => { location.hash = el.dataset.go; });
  });
}

// ===========================================================================
// ACCUEIL
// ===========================================================================

function vueAccueil() {
  const n = store.joueurs.length;
  const titre = 'EDIT'.split('').map((c) => `<span>${c}</span>`).join('');

  html(`${topbar('#/')}
  <div class="hero">
    <h1>${titre}</h1>
    <div class="credits">
      Un jeu de <b>Valentin Drouet</b>, illustré par <b>Anders Lazaret</b><br>
      Édité par <b>Big Budi Games</b>
    </div>
  </div>
  <div class="wrap">
    <div class="grid2">
      <div>
        <div class="panneau">
          <h2>Joueuses</h2>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div class="segments" id="seg-n">
              ${[1, 2, 3, 4].map((i) => `<button class="${i === n ? 'on' : ''}" data-n="${i}">${i}</button>`).join('')}
            </div>
            <span class="aide">${n} joueuse${n > 1 ? 's' : ''}${n === 1 ? ' — solo, hors règles officielles' : ''}</span>
          </div>
          <div id="liste-joueurs">${store.joueurs.map((j, i) => ligneJoueur(j, i)).join('')}</div>
        </div>

        ${bandeauMateriel()}
        <button class="cta" id="go">Commencer la partie</button>
        <button class="pill large" data-go="#/enligne">🌐 Jouer en ligne, chacun sur son appareil</button>
      </div>

      <div>
        <div class="panneau">
          <h2>Options de partie</h2>
          <div class="chips">
            ${chip('illustrations', 'Illustrations')}
            ${chip('pointsSurCartes', 'Points visibles')}
            ${chip('animerCoups', 'Mouvement des cartes')}
            ${chip('apercuSurvol', 'Pop-up au survol')}
          </div>
        </div>

        ${panneauMode()}

        <div class="panneau">
          <h2>Variantes</h2>
          <div class="chips">
            ${chip('sansPlanDepart', 'Pas de Plans de départ')}
          </div>
          <p class="aide">Les quatre faces de départ rejoignent la pioche des Plans Larges, dont
          elles prennent la couleur : ce sont des Plans Larges comme les autres. Plus de choix de
          départ — chacune ouvre son banc en dérushant un Plan Large, seule carte qui puisse s’y
          poser en premier.</p>
        </div>
      </div>
    </div>

    <div class="rangee-boutons">
      <button class="pill" data-go="#/labo">Laboratoire d’équilibrage</button>
      <button class="pill" data-go="#/regles">Règles du jeu</button>
      <button class="pill" data-go="#/materiel">Matériel</button>
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
  brancherJeuAccueil(vueAccueil);
  brancherMode(vueAccueil);
  brancherChips(vueAccueil);
  brancherChamps(vueAccueil);
  app.querySelector('#go').addEventListener('click', lancerPartie);
}

/**
 * Le mode de jeu : une manière de monter le film, pas un réglage de plus. Il se
 * choisit ici, sur l'accueil, et pose d'un coup les variables qui le
 * définissent — celles-ci restent lisibles une à une dans Variables.
 */
function panneauMode() {
  const actuel = modeCourant(store.cfg);
  return `<div class="panneau" id="panneau-mode">
    <h2>Mode de jeu</h2>
    <div class="segments large" id="seg-mode">
      ${MODES.map((m) => `<button class="${m.id === actuel.id ? 'on' : ''}" data-mode="${m.id}">${m.label}</button>`).join('')}
    </div>
    <p class="aide" id="mode-aide">${actuel.aide}</p>
  </div>`;
}

function brancherMode(apres) {
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const m = MODES.find((x) => x.id === b.dataset.mode);
    if (!m) return;
    Object.assign(store.cfg, m.cfg);
    sauverCfg();
    if (apres) apres();
  }));
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

function brancherJeuAccueil(apres) {
  app.querySelectorAll('[data-jeu-accueil]').forEach((b) => b.addEventListener('click', () => {
    store.cfg.materielActif = b.dataset.jeuAccueil;
    sauverCfg();
    if (apres) apres();
  }));
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

/**
 * Le bouton qui montre ou masque les illustrations. Le réglage est **le même
 * partout** — accueil, table de jeu, écran Matériel : le basculer ici le
 * bascule pour tout le monde, il n'y a qu'une seule option. Il n'y a donc plus
 * à repasser par l'accueil pour regarder le matériel en lecture nue.
 */
function boutonIllus(id = '') {
  return `<button class="pill mini" ${id ? `id="${id}"` : ''} data-bascule-illus="1"
    title="Afficher ou masquer les illustrations — le même réglage partout">
    ${store.cfg.illustrations ? 'Images visibles' : 'Images masquées'}
  </button>`;
}

function brancherBasculeIllus(apres) {
  app.querySelectorAll('[data-bascule-illus]').forEach((b) => b.addEventListener('click', () => {
    store.cfg.illustrations = !store.cfg.illustrations;
    sauverCfg();
    if (apres) apres();
  }));
}

function brancherChips(apres) {
  app.querySelectorAll('[data-chip]').forEach((el) => el.addEventListener('change', () => {
    store.cfg[el.dataset.chip] = el.checked; sauverCfg();
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

function resumePaquet() {
  const { doubles, larges, departs } = construirePaquet(store.cfg);
  const faces = new Set(); departs.forEach((d) => d.faces.forEach((f) => faces.add(f.num)));
  return `<table class="tbl">
    <tr><td>Cartes Plan Moyen / Gros Plan</td><td class="num">${doubles.length}</td></tr>
    <tr><td>Cartes Plan Large</td><td class="num">${larges.length}</td></tr>
    <tr><td>Faces de Plan de départ</td><td class="num">${faces.size}</td></tr>
  </table>`;
}

/**
 * Quel jeu de matériel part en partie. Il n'y a pas de retour en arrière
 * destructeur : les deux coexistent, ce sélecteur dit lequel se lance.
 */
function bandeauMateriel() {
  const modifie = store.cfg.materielActif === 'MODIFIE';
  const n = Object.keys(store.cfg.materiel.plans).length + Object.keys(store.cfg.materiel.paires).length;
  const off = store.cfg.cartesDesactivees.length;
  return `<div class="bandeau-materiel ${modifie ? 'modifie' : ''}">
    <div class="segments large" id="seg-materiel">
      <button class="${modifie ? '' : 'on'}" data-jeu-accueil="IMPRIME">Matériel d’origine</button>
      <button class="${modifie ? 'on' : ''}" data-jeu-accueil="MODIFIE">Matériel modifié</button>
    </div>
    <span class="aide">${modifie
      ? (n ? `${n} retouche${n > 1 ? 's' : ''} en jeu` : 'aucune retouche pour l’instant')
      : 'les cartes des PDF, sans retouche'}${off ? ` · ${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}` : ''}</span>
    <span class="bm-lien" data-go="#/materiel">éditer ›</span>
  </div>`;
}

// ===========================================================================
// PARTIE
// ===========================================================================

function lancerPartie() {
  appliquerJeuActif();
  // Une partie précédente peut encore avoir un coup d'IA ou une carte en l'air.
  store.filIA++; store.vols = []; stopperVols();
  store.partie = creerPartie(store.joueurs.map((j) => ({ ...j })), cloneConfig(store.cfg), store.cfg.graine || nouvelleGraine());
  // La partie fige son matériel : à partir d'ici c'est le sien qui vaut.
  appliquerJeuActif();
  store.formatChoisi = null;
  store.choixRiviere = null;
  store.undo = null;
  store.joueurVu = null;
  location.hash = '#/partie';
}

// Les deux temps du tour restent ceux des règles — on dérushe, puis on monte —
// mais l'écran ne les sépare plus : on prend dans la rivière et l'on pose dans
// son banc sans changer de fenêtre. Le bandeau n'a donc plus de phase à nommer.
const PHASES = {
  DEPART: 'Mise en place — choix du Plan de départ',
  DERUSHAGE: 'Dérushage et montage',
  MONTAGE: 'Montage',
};

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
    <div class="panneau"><h2>Score de ${nom}</h2>${listeObjectifs(sc[vu])}</div>`;
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

  // Le banc affiché. Un clic d'onglet l'épingle. Sinon : celui de qui joue
  // quand c'est une humaine — c'est là qu'elle doit poser, et à deux humaines
  // sur le même écran chacune doit retrouver le sien à son tour —, et celui de
  // la première humaine pendant qu'une IA joue : son coup ne vient pas imposer
  // son banc à l'écran, on voit la carte partir, la vue ne bouge pas.
  const humains = st.joueurs.map((jj, i) => (jj.type === 'HUMAIN' ? i : -1)).filter((i) => i >= 0);
  const parDefaut = humaine ? p : (humains.length ? humains[0] : p);
  const vuB = store.bancVu !== null && st.bancs[store.bancVu] ? store.bancVu : parDefaut;

  // La zone garde toujours la même forme, quel que soit celui qui joue : seuls
  // les clics sont réservés à la joueuse humaine.
  let zone;
  if (st.phase === 'DEPART') zone = zoneDepart(st, p, humaine);
  else if (st.phase === 'DERUSHAGE') zone = zoneDerushage(st, humaine);
  else zone = zoneMontage(st, p, humaine);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    ${enl ? bandeauEnLigne(enl, st) : ''}
    <div class="table-jeu">
      <div class="zone-gauche">
        ${/* Le bandeau du tour a disparu : la phase et le nom de qui joue se
              lisent déjà dans la colonne de droite — « À son tour », en couleur,
              à côté du nom. Ne subsiste que ce qu'aucune autre place ne dit :
              le compte à rebours du dernier tour. */
          st.finDeclenchee == null ? '' : `<div class="bandeau-tour">
            <span class="jeton-dernier">dernier tour</span>
          </div>`}

        <div class="panneau zone-phase">${zone}</div>
        ${/* Un seul banc à l'écran, les autres en onglets. Par défaut on suit
              qui joue — le coup d'une IA se regarde sur SON banc — et l'onglet
              épingle jusqu'au tour suivant. */''}
        <div class="panneau">
          <h2 class="onglets-bancs">
            ${st.joueurs.map((jj, i) => `<button class="onglet-banc ${i === vuB ? 'on' : ''}"
              data-onglet-banc="${i}" style="--enc:${encreDe(jj.couleur)}">${jj.nom}
              <b class="onglet-pts">${sc[i].total}</b></button>`).join('')}
            <span class="banc-compte">Plan <b>${Math.min(compter(st.bancs[vuB], st.cfg).plans, st.cfg.tours)} / ${st.cfg.tours}</b></span>
          </h2>
          ${bancBloc(st, vuB, null, vuB === p && humaine && (st.phase === 'MONTAGE' || st.phase === 'DERUSHAGE'))}
        </div>
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
          ${boutonIllus('bascule-illus')}
          <button class="pill mini" id="bascule-points"
            title="Afficher ou masquer ce que chaque plan rapporte, au coin des cartes">
            ${store.cfg.pointsSurCartes === false ? 'Points masqués' : 'Points visibles'}
          </button>
          <button class="pill mini ${store.cfg.apercuSurvol ? '' : 'eteint'}" id="bascule-apercu"
            title="Ouvrir la fiche d’une carte quand on la survole">
            Pop-up au survol
          </button>
          <span class="jeton-materiel ${st.cfg.materielActif === 'MODIFIE' ? 'modifie' : ''}"
            title="Le jeu de matériel avec lequel cette partie a été lancée">
            ${st.cfg.materielActif === 'MODIFIE' ? 'Matériel modifié' : 'Matériel imprimé'}</span>
        </div>
      </div>
    </div>
  </div>
  ${pied()}`, true);

  brancherPartie(st, humaine);
  // La table dit qui joue : pendant un tour d'IA, la zone reste en place mais
  // ne se laisse pas manipuler.
  document.body.classList.toggle('ia-joue', !humaine);
  // Le verrou se pose dès le rendu, pas au premier battement du vol : sans
  // cela, la main revient à l'humaine le temps d'une image, sous une carte
  // encore en l'air.
  if (store.vols.length) document.body.classList.add('coup-en-vol');
  // Le fil des coups d'IA n'a pas cours en ligne : chaque siège est un appareil.
  if (enchainer && !enl) derouler(st).catch(() => { document.body.classList.remove('ia-joue', 'coup-en-vol'); });
}

// --- Le banc ---------------------------------------------------------------

// La largeur d'un plan dans un banc, en accord avec la feuille de style : elle
// sert à faire la place à l'aperçu de pose.
const LARGEUR_BANC = { GP: 85, PM: 169, PL: 254, DEP: 254 };
// L'écart entre deux plans d'une même séquence, lui aussi en accord avec la
// feuille de style (`.banc .sequence { gap }`).
const ECART_PLANS = 2;

/** La largeur d'une séquence dans le banc, rembourrage compris. */
function largeurSeq(seq) {
  if (!seq.length) return 8;
  const plans = seq.reduce((s, p) => s + (LARGEUR_BANC[p.format] || 169), 0);
  return 8 + plans + (seq.length - 1) * ECART_PLANS;
}

/**
 * La distance du bord gauche d'une séquence au **centre de son ancre** — le
 * plan qui a ouvert la ligne, marqué à la pose. Une ligne peut porter plusieurs
 * Plans Larges, un Raccord faisant charnière entre eux : c'est celui qui l'a
 * ouverte qui la tient, et il ne cède la place à aucun autre — sans quoi un
 * Plan Large posé à gauche ferait sauter l'ancre et glisser toute la ligne.
 * À défaut de marque — un banc d'avant la v0.14.1 —, le premier Plan Large ou
 * Plan de départ ; à défaut de l'un et de l'autre, le milieu de la ligne.
 */
function ancreDe(seq) {
  let k = seq.findIndex((p) => p.ancre);
  if (k < 0) k = seq.findIndex((p) => p.format === 'PL' || p.format === 'DEP');
  if (k < 0) return largeurSeq(seq) / 2;
  const avant = seq.slice(0, k)
    .reduce((s, p) => s + (LARGEUR_BANC[p.format] || 169) + ECART_PLANS, 0);
  return 4 + avant + (LARGEUR_BANC[seq[k].format] || 169) / 2;
}

/**
 * La **colonne d'ancrage** d'un banc en lignes : toutes les lignes alignent le
 * centre de leur Plan Large — ou de leur Plan de départ — sur la même verticale.
 * La ligne qui a le plus de plans à gauche de son ancre fixe la colonne ; les
 * autres comblent l'écart d'un retrait.
 *
 * C'est un **calage dans le flux**, pas un décalage : la piste a donc la largeur
 * de ce qu'elle contient, et le banc défile de gauche à droite dès que cela
 * déborde — sans jamais rompre l'alignement. Un décalage en marges, lui, cessait
 * de tenir dès que le banc manquait de place : le plan central se mettait à
 * dériver par rapport à ceux des autres lignes.
 */
function colonneAncrage(sequences) {
  if (!sequences.length) return { avant: 0, apres: 0 };
  const avant = Math.max(...sequences.map(ancreDe));
  const apres = Math.max(...sequences.map((s) => largeurSeq(s) - ancreDe(s)));
  return { avant, apres };
}

function bancBloc(st, i, titre, interactif) {
  const banc = st.bancs[i];
  // Ce que chaque carte rapporte ici et maintenant, pour l'aperçu au survol.
  // Un plan qui porte deux pouvoirs produit deux lignes : on garde le détail
  // — l'infobulle montre alors d'où vient chaque point — et leur somme.
  const points = new Map();
  const detail = new Map();
  // Ce que chaque séquence rapporte, à part : en lignes, c'est le compte de sa
  // ligne, affiché à son bout. Les points sont portés par la carte qui les fait
  // marquer, quelle que soit la ligne où elle est allée les chercher.
  const ptsLigne = banc.sequences.map(() => 0);
  for (const l of compter(banc, st.cfg).lignes) {
    points.set(l.plan, (points.get(l.plan) || 0) + l.pts);
    const a = detail.get(l.plan) || []; a.push(l.pts); detail.set(l.plan, a);
    if (ptsLigne[l.sequence] !== undefined) ptsLigne[l.sequence] += l.pts;
  }
  // Le plan qui vient d'être posé : c'est là que la carte en vol atterrit.
  const neuf = st.dernierPose && st.dernierPose.p === i ? st.dernierPose : null;
  // Deux façons de viser un emplacement : depuis la rivière, avant même
  // d'avoir pris la carte — c'est le tour ordinaire —, ou depuis la carte en
  // main, quand l'ordre imprimé sépare le dérushage du montage.
  const vise = interactif ? viseeCourante(st, i) : null;
  const coups = vise
    ? coupsPossibles(st, i, vise.carte).filter((c) => c.format === vise.format)
    : [];
  // Variante « banc en lignes » : une séquence par ligne, empilées de haut en
  // bas. On ne pose donc plus une séquence *entre* deux autres — on l'ajoute
  // au-dessus ou en dessous —, et les emplacements changent d'axe : ceux des
  // séquences restent à gauche et à droite de leur ligne, ceux des nouvelles
  // séquences deviennent deux bandes, l'une au-dessus du banc, l'autre en
  // dessous.
  const lignes = !!st.cfg.bancEnLignes;

  // Au survol d'un emplacement, le plan s'y montre en transparence, tel qu'il
  // s'y poserait : la bonne moitié, et la face que le côté de pose lui donne.
  const carteEnMain = vise ? vise.carte : null;
  // Un emplacement occupe une bande verticale, pas un pavé : c'est ce qui
  // permet au banc de garder la même largeur qu'il aura une fois la carte
  // posée. Les emplacements ne doivent pas décider de la mise en page — sinon
  // le banc se réorganise pendant qu'on vise, puis se réorganise encore une
  // fois la carte posée, et l'on s'y perd.
  // De quel côté de l'emplacement la carte va tomber : c'est là que l'aperçu
  // se montre, en recouvrant la flèche et en s'étendant vers la place qu'elle
  // prendra — jamais par-dessus la carte voisine.
  const versOu = (c) => {
    if (c.cote) return c.cote;
    if (c.action === 'GENERIQUE') return c.role === 'OUVERTURE' ? 'gauche' : 'droite';
    if (c.action === 'NOUVELLE_SEQUENCE') {
      if (lignes) return c.pos === 0 ? 'haut' : 'bas';
      return c.pos === 0 ? 'gauche' : 'droite';
    }
    return 'droite';
  };
  // `couche` : l'emplacement est dans une bande horizontale, où l'étiquette se
  // lit normalement. Ailleurs, une étiquette longue se met debout pour ne pas
  // élargir le banc.
  const fenteChoix = (c, couche) => {
    const coup = encodeURIComponent(JSON.stringify(sansCarte(c)));
    const lg = etiquetteCoup(c, lignes);
    const debout = !couche && lg.length > 3;
    const bouton = `<button class="fente-btn ${debout ? 'debout' : ''}" data-coup="${coup}">${lg}</button>`;
    if (!carteEnMain) return `<span class="fente-choix">${bouton}</span>`;
    const plan = planPose(carteEnMain, c.format, c.role, faceJouee(c.format, c.cote, st.cfg));
    // L'aperçu porte lui aussi le coup : c'est toute la carte en pointillés qui
    // se clique, pas seulement son étiquette.
    return `<span class="fente-choix vers-${versOu(c)}" style="--ap:${LARGEUR_BANC[plan.format] || 169}px">
      ${bouton}<span class="apercu-pose" data-coup="${coup}">${renderPlan(plan, { muet: true })}</span>
    </span>`;
  };

  const fente = (liste) => {
    if (!liste.length) return '<div class="ecart"></div>';
    return `<div class="ecart actif">${liste.map((c) => fenteChoix(c)).join('')}</div>`;
  };
  // Une bande court sur toute la largeur du banc, au-dessus ou en dessous des
  // lignes : vide, elle ne prend aucune place — le banc ne doit pas se
  // décaler selon qu'on vise ou non.
  const bande = (liste) => (liste.length
    ? `<div class="ecart actif bande">${liste.map((c) => fenteChoix(c, true)).join('')}</div>`
    : '');

  const carte = (plan, si, k) => renderPlan(plan, {
    points: objsDe(plan).length ? (points.get(plan) || 0) : 0,
    detail: detail.get(plan) || [],
    neuf: !!(neuf && neuf.seq === si && neuf.idx === k),
  });

  const morceaux = [];
  const n = banc.sequences.length;
  if (!n) morceaux.push('<div class="vide" style="color:#8a8496">Banc vide</div>');

  if (lignes) {
    // Toutes les lignes alignent leur ancre sur la même verticale : celle qui a
    // le plus de plans à sa gauche fixe la colonne, les autres comblent l'écart
    // d'un retrait. Chaque ligne ainsi complétée fait la même largeur :
    // centrées dans le banc, elles y amènent la colonne au milieu — et défilent
    // d'un bloc quand cela déborde, sans jamais rompre l'alignement.
    const col = colonneAncrage(banc.sequences);
    // Au-dessus de tout : ouvrir une séquence en tête du film.
    morceaux.push(bande(coups.filter((c) => c.action === 'NOUVELLE_SEQUENCE' && c.pos === 0)));
    banc.sequences.forEach((seq, si) => {
      const gauche = Math.round(col.avant - ancreDe(seq));
      const droite = Math.round(col.apres - (largeurSeq(seq) - ancreDe(seq)));
      // Les deux bords se posent **hors du flux**, contre les flancs de la
      // séquence : ils ne prennent donc aucune largeur, et ouvrir un
      // emplacement d'un côté ne déplace ni la ligne ni son ancre.
      // Le calage de centrage se pose AVANT la pastille : elle reste ainsi au
      // départ du contenu, et non orpheline au bout d'un vide.
      morceaux.push('<div class="ligne">');
      morceaux.push(`<span class="ligne-pts ${(ptsLigne[si] || 0) < 0 ? 'negatif' : ((ptsLigne[si] || 0) ? '' : 'nul')}"
        title="Ce que cette ligne rapporte">${ptsLigne[si] || 0}</span>`);
      morceaux.push(`<div class="ligne-fil" style="padding-left:${gauche}px;padding-right:${droite}px">`);
      morceaux.push('<div class="ligne-corps">');
      // Le générique d'ouverture est en tête du film, donc au bout gauche de
      // la première ligne ; les crédits, au bout droit de la dernière.
      morceaux.push(`<div class="bord gauche">${fente(coups.filter((c) => (c.action === 'ETENDRE' && c.seq === si && c.cote === 'gauche')
        || (c.action === 'GENERIQUE' && c.role === 'OUVERTURE' && si === 0)))}</div>`);
      morceaux.push('<div class="sequence">');
      seq.forEach((plan, k) => morceaux.push(carte(plan, si, k)));
      morceaux.push('</div>');
      morceaux.push(`<div class="bord droite">${fente(coups.filter((c) => (c.action === 'ETENDRE' && c.seq === si && c.cote === 'droite')
        || (c.action === 'GENERIQUE' && c.role === 'CREDITS' && si === n - 1)))}</div>`);
      morceaux.push('</div></div></div>');
    });
    // En dessous de tout : ouvrir une séquence en fin de film. Sur un banc
    // vide, les deux bandes désigneraient le même coup : une seule suffit.
    if (n) morceaux.push(bande(coups.filter((c) => c.action === 'NOUVELLE_SEQUENCE' && c.pos === n)));
  } else {
    banc.sequences.forEach((seq, si) => {
      // Écart avant cette séquence : nouvelle séquence, soudure, générique.
      morceaux.push(fente(coups.filter((c) => (c.action === 'NOUVELLE_SEQUENCE' && c.pos === si)
        || (c.action === 'SOUDER' && c.pos === si - 1)
        || (c.action === 'GENERIQUE' && c.role === 'OUVERTURE' && si === 0))));
      morceaux.push('<div class="sequence">');
      morceaux.push(fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'gauche')));
      seq.forEach((plan, k) => morceaux.push(carte(plan, si, k)));
      morceaux.push(fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'droite')));
      morceaux.push('</div>');
    });
    morceaux.push(fente(coups.filter((c) => (c.action === 'NOUVELLE_SEQUENCE' && c.pos === n)
      || (c.action === 'GENERIQUE' && c.role === 'CREDITS'))));
  }

  const banche = `<div class="banc ${coups.length ? 'vise' : ''}" data-banc="${i}"><div class="banc-piste ${lignes ? 'lignes' : ''}">${morceaux.join('')}</div></div>`;
  // Sans titre, on ne veut que le banc : c'est ce que demande le compte rendu
  // de fin de partie, qui donne le nom de la joueuse à sa façon.
  if (titre === null) return banche;

  // Le compte de plans se lit au-dessus du banc qu'il décrit, plutôt que dans
  // un bandeau commun où il fallait se souvenir de qui il parlait.
  const faits = Math.min(compter(banc, st.cfg).plans, st.cfg.tours);
  return `<div class="panneau">
    <h2>${titre}${titre ? `<span class="banc-compte">Plan <b>${faits} / ${st.cfg.tours}</b></span>` : ''}</h2>
    ${banche}
  </div>`;
}

/**
 * Choisir la moitié à laisser visible ne touche pas à la partie : on repeint
 * la carte et le banc concernés plutôt que toute la table, pour que rien ne
 * clignote entre le clic sur la moitié et le clic sur l'emplacement.
 */
/**
 * Viser une moitié dans la rivière. Rien n'est joué : on désigne seulement ce
 * que l'on veut poser, et le banc montre aussitôt où. Re-cliquer la même
 * moitié annule la visée.
 */
function viser(st, o, format) {
  const c = store.choixRiviere;
  store.choixRiviere = (c && memeOption(c.o, o) && c.format === format) ? null : { o, format };
  // Viser, c'est préparer une pose : si un onglet montrait un autre banc, on
  // revient sur celui de qui joue — c'est là que les emplacements vont s'ouvrir.
  if (store.bancVu !== null && store.bancVu !== st.courant) store.bancVu = st.courant;
  rafraichirVisee(st);
}

/**
 * Repeint ce que la visée change — les cartes de la rivière et le banc de qui
 * joue —, pas toute la table : une visée n'est pas un coup, et rien d'autre
 * ne doit bouger sous le curseur.
 */
function rafraichirVisee(st) {
  const p = st.courant;
  const vise = store.choixRiviere;
  app.querySelectorAll('[data-derush]').forEach((el) => {
    const o = JSON.parse(decodeURIComponent(el.dataset.derush));
    const f = vise && memeOption(vise.o, o) ? vise.format : null;
    const boite = el.closest('.carte-retournable');
    if (boite) boite.classList.toggle('visee', !!f);
    el.querySelectorAll('.moitie[data-format]').forEach((m) => {
      m.classList.toggle('choisi', m.dataset.format === f);
    });
  });

  const aide = app.querySelector('#aide-derushage');
  if (aide) aide.innerHTML = aidePose(st);

  const banc = app.querySelector(`.banc[data-banc="${p}"]`);
  const piste = banc && banc.querySelector('.banc-piste');
  if (!piste) return vuePartie();
  const bloc = document.createElement('div');
  bloc.innerHTML = bancBloc(st, p, '', true);
  piste.innerHTML = bloc.querySelector('.banc-piste').innerHTML;
  piste.classList.toggle('lignes', !!st.cfg.bancEnLignes);
  banc.classList.toggle('vise', !!bloc.querySelector('.banc').classList.contains('vise'));
  brancherFentes(st, piste);
  brancherApercu(piste);
}

function choisirMoitie(st, format) {
  store.formatChoisi = store.formatChoisi === format ? null : format;

  const zone = app.querySelector('#choix-carte');
  if (!zone) return vuePartie();
  zone.querySelectorAll('.moitie[data-format]').forEach((el) => {
    el.classList.toggle('choisi', el.dataset.format === store.formatChoisi);
  });

  const aide = app.querySelector('#aide-montage');
  if (aide) aide.innerHTML = aideMontage(st, store.formatChoisi);

  const piste = app.querySelector(`.banc[data-banc="${st.courant}"] .banc-piste`);
  if (piste) {
    const bloc = document.createElement('div');
    bloc.innerHTML = bancBloc(st, st.courant, '', true);
    piste.innerHTML = bloc.querySelector('.banc-piste').innerHTML;
    piste.classList.toggle('lignes', !!st.cfg.bancEnLignes);
    brancherFentes(st, piste);
    brancherApercu(piste);
  }
}

/**
 * L'aperçu se range dans la bande du bas, aligné sous l'emplacement visé :
 * c'est le survol qui lui donne son abscisse, en coordonnées du banc, bornée
 * pour qu'il ne sorte jamais du cadre.
 */
/**
 * Le banc retient quel emplacement est ouvert plutôt que de s'en remettre au
 * seul `:hover` : l'aperçu déborde de son emplacement, et le curseur qui le
 * longe passerait par des zones qui n'appartiennent ni à l'un ni à l'autre —
 * l'aperçu clignoterait sous la main qui le vise.
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
      store.choixRiviere = null; store.formatChoisi = null;
      store.enLigne.jouer({ k: 'poser', c: partiel });
      return;
    }
    store.undo = JSON.stringify(st);
    // Depuis la rivière, le tour se joue d'un seul geste : la carte quitte le
    // chutier et se pose dans le banc. Depuis la main — ordre imprimé —, elle
    // n'a plus qu'à se poser.
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

function etiquetteCoup(c, lignes) {
  switch (c.action) {
    case 'NOUVELLE_SEQUENCE':
      // En lignes, une nouvelle séquence ne s'insère pas : elle s'empile.
      // L'étiquette dit donc de quel côté de la pile elle ira.
      if (lignes) return c.pos === 0 ? '▲ nouvelle ligne' : '▼ nouvelle ligne';
      return '＋ séquence';
    case 'SOUDER': return '⛓ raccorder';
    case 'GENERIQUE': return c.role === 'OUVERTURE' ? '▶ ouverture' : '■ fin';
    // Un Plan Large qui s'étend sur une ligne existante passe par le Raccord
    // qui en fait charnière : l'emplacement le dit, on ne le confond pas avec
    // l'accroche ordinaire d'un Plan Moyen ou d'un Gros Plan.
    default: return c.format === 'PL'
      ? (c.cote === 'gauche' ? '⛓ ◀' : '⛓ ▶')
      : (c.cote === 'gauche' ? '◀' : '▶');
  }
}

// --- Phase de mise en place -----------------------------------------------

function zoneDepart(st, p, humaine = true) {
  const options = choixDepart(st, p);
  // La rivière est déjà là pendant qu'on choisit son Plan de départ : on voit
  // ce qui attend au premier dérushage, et l'on choisit en connaissance de
  // cause. Elle ne se prend pas encore — seule la rotation y répond.
  return `<div class="main-cartes">
    ${options.map((o, k) => `<div class="item">
      <div class="carte solo ${humaine ? 'clickable' : ''}" data-depart="${k}">${renderPlan(o.plan)}</div>
    </div>`).join('')}
  </div>
  <div class="riviere-apercu">${zoneDerushage(st, humaine, true)}</div>`;
}

/**
 * Ce que la joueuse vise en ce moment : la carte et la moitié retenue, qu'elle
 * vienne de la rivière — le tour ordinaire, où l'on prend et l'on pose du même
 * geste — ou de sa main, quand l'ordre imprimé sépare les deux temps.
 */
function viseeCourante(st, p) {
  if (st.phase === 'DERUSHAGE' && store.choixRiviere) {
    const carte = carteOption(st, store.choixRiviere.o);
    return carte ? { carte, format: store.choixRiviere.format, o: store.choixRiviere.o } : null;
  }
  if (st.phase === 'MONTAGE' && store.formatChoisi) {
    const carte = st.mains[p][0];
    return carte ? { carte, format: store.formatChoisi, o: null } : null;
  }
  return null;
}

/**
 * Le bouton qui retourne une carte double sur son autre face — dans le chutier
 * avant de la prendre, et en main pendant qu'on choisit sa moitié. Retourner ne
 * joue rien : c'est un geste de lecture.
 */
function boutonRotation(st, carte) {
  if (!carte || carte.type !== 'DOUBLE') return '';
  const verso = faceVisible(st, carte) === 'V';
  return `<button class="pill rotation" data-retourner="${carte.id}"
    title="Retourner la carte sur son autre face — touche F au survol">⟲ rotation<span class="face">${verso ? 'verso' : 'recto'}</span></button>`;
}

// La carte sous le curseur : la touche F la retourne, sans viser son bouton.
let carteSurvolee = null;

function brancherRotationClavier(racine = app) {
  racine.querySelectorAll('.carte-retournable').forEach((el) => {
    el.addEventListener('mouseenter', () => { carteSurvolee = el; });
    el.addEventListener('mouseleave', () => { if (carteSurvolee === el) carteSurvolee = null; });
  });
}

// --- Phase A ---------------------------------------------------------------

/**
 * La rivière : les deux pioches et leurs chutiers. `apercu` la montre sans
 * qu'on puisse y puiser — pendant le choix du Plan de départ, elle est déjà là
 * pour être lue, pas encore pour être prise.
 */
function zoneDerushage(st, humaine = true, apercu = false) {
  // `true` : on demande aussi ce que la joueuse voit sans pouvoir le prendre.
  // Une rivière escamotée le temps d'un tour se lirait comme une rivière vide.
  const options = optionsDerushage(st, true);
  // Chaque famille dit **sa** raison : un Plan Moyen qui n'a pas de séquence où
  // s'accrocher et un Plan Large qui n'a plus de ligne à ouvrir ne sont pas
  // écartés pour le même motif, et ne sont pas sur la même rangée.
  const raisonDe = (...sources) => (options.find(
    (o) => sources.includes(o.source) && o.raison) || {}).raison || '';
  const nom = st.joueurs[st.courant].nom;
  // Les cartes du chutier portent leur rang : c'est l'ancre de la carte que la
  // pioche y renvoie quand une place se libère.
  const ancre = (o) => (o.source.startsWith('CHUTIER')
    ? ` data-chutier="${o.source === 'CHUTIER_PL' ? 'PL' : 'PMGP'}" data-i="${o.index}"` : '');
  // Une carte double ne tombe pas toujours du côté de son recto : elle se
  // présente sur la face que le hasard lui a donnée, et un bouton la retourne
  // avant qu'on la choisisse.
  const prise = (o) => (apercu || o.bloquee ? '' : ` data-derush="${enc(o)}"`);
  // On vise depuis la rivière : cliquer une moitié la retient, et le banc
  // montre aussitôt où elle peut se poser. La carte visée se soulève, sa
  // moitié retenue s'encadre.
  const vise = (o) => (!apercu && humaine && store.choixRiviere
    && memeOption(store.choixRiviere.o, o) ? store.choixRiviere.format : null);
  const carte = (o) => {
    const f = vise(o);
    const off = !!o.bloquee;
    return `<div class="carte-retournable ${f ? 'visee' : ''} ${off ? 'bloquee' : ''}">
      <div${prise(o)}${ancre(o)}>${renderCarte(o.carte, faceVisible(st, o.carte) === 'V',
        { small: true, clickable: !apercu && !off, moitiesChoisissables: !apercu && humaine && !off, formatChoisi: f })}</div>
      ${off ? '' : boutonRotation(st, o.carte)}
    </div>`;
  };

  // Une ligne par famille : sa pioche d'abord, puis son chutier. Le compte de
  // la pioche se lit **à côté du titre**, sur la même ligne : sous la pioche il
  // s'ouvrait une rangée à lui seul, et la table y perdait une trentaine de
  // pixels de hauteur pour une donnée de six mots.
  const ligne = (titre, fam, pioche, reste, chutier, note) => `
    <div class="derushage-ligne" data-famille="${fam}">
      <h3>${titre}<span class="pioche-reste ${reste ? '' : 'pioche-vide'}">${reste
        ? `${reste} carte${reste > 1 ? 's' : ''} en pioche` : 'pioche épuisée'}</span>${
        note ? `<span class="raison">${note}</span>` : ''}</h3>
      <div class="derushage-cartes">
        <div class="pioche-colonne">
          <div class="pioche-place" id="pioche-${fam}">${pioche}</div>
        </div>
        ${chutier || '<div class="aide" style="align-self:center">Chutier épuisé</div>'}
      </div>
    </div>`;

  // La pioche des Plans Larges reste face cachée : ces cartes ont un vrai dos.
  const sommetPL = options.find((o) => o.source === 'PIOCHE_PL');
  const dosPL = st.piochePL.length
    ? enPile(sommetPL && !apercu
      ? `<div data-derush="${enc(sommetPL)}">${renderDos('Plans Larges', st.piochePL.length, { small: true, clickable: true })}</div>`
      : `<div class="pioche-fermee" title="Cette pioche n’est pas accessible : on ne pioche que dans son chutier.">${renderDos('Plans Larges', st.piochePL.length, { small: true })}</div>`,
      st.piochePL.length)
    : '';

  // Celle des Plans Moyens / Gros Plans montre sa face du dessus : ces cartes
  // étant recto-verso, une pioche ne peut pas les cacher.
  const sommetPMGP = options.find((o) => o.source === 'PIOCHE_PMGP');
  const piochePMGP = sommetPMGP && !apercu
    ? enPile(carte(sommetPMGP), st.piochePMGP.length)
    : (st.piochePMGP.length
      ? enPile(`<div class="pioche-fermee">${renderCarte(st.piochePMGP[0], faceVisible(st, st.piochePMGP[0]) === 'V', { small: true })}</div>`, st.piochePMGP.length)
      : '');

  const consigne = apercu ? '' : (humaine ? aidePose(st) : '');
  return `<div class="derushage-lignes">
    ${consigne ? `<p class="aide" id="aide-derushage">${consigne}</p>` : ''}
    ${ligne('Plans Larges', 'PL', dosPL, st.piochePL.length,
      options.filter((o) => o.source === 'CHUTIER_PL').map(carte).join(''),
      // Le banc porte déjà toutes ses lignes : ces cartes se voient, mais il
      // n'y a plus de séquence à ouvrir pour elles.
      apercu ? '' : raisonDe('CHUTIER_PL', 'PIOCHE_PL'))}
    ${ligne('Plans Moyens / Gros Plans', 'PMGP', piochePMGP, st.piochePMGP.length,
      options.filter((o) => o.source === 'CHUTIER_PMGP').map(carte).join(''),
      // Variante « pas de Plans de départ » : ces cartes se voient mais ne se
      // prennent pas tant que le banc n'a pas de séquence où les accrocher.
      apercu ? '' : raisonDe('CHUTIER_PMGP', 'PIOCHE_PMGP'))}
  </div>`;
}

const enc = (o) => encodeURIComponent(JSON.stringify({ source: o.source, index: o.index }));

/** Deux options de dérushage désignent-elles la même carte de la rivière ? */
const memeOption = (a, b) => !!a && !!b && a.source === b.source && a.index === b.index;

/** La carte de la rivière que désigne une option, telle qu'elle est. */
function carteOption(st, o) {
  if (!o) return null;
  if (o.source === 'CHUTIER_PL') return st.chutierPL[o.index];
  if (o.source === 'CHUTIER_PMGP') return st.chutierPMGP[o.index];
  if (o.source === 'PIOCHE_PL') return st.piochePL[0];
  if (o.source === 'PIOCHE_PMGP') return st.piochePMGP[0];
  return null;
}

// --- Phase B ---------------------------------------------------------------

/** Le texte sous la carte en cours de pose, seul élément qui suit le choix. */
function aideMontage(st, choisi, humaine = true, carteVisee) {
  const carte = carteVisee || st.mains[st.courant][0];
  if (!carte) return '';
  // Pendant le tour d'une IA, la consigne n'a pas de destinataire : on dit ce
  // qu'elle est en train de faire.
  if (!humaine) {
    const nom = st.joueurs[st.courant].nom;
    if (carte.type !== 'DOUBLE') return `<b>${nom}</b> a dérushé un Plan Large n°${carte.num}, et le monte dans son banc.`;
    return `<b>${nom}</b> a dérushé une carte, en choisit une moitié et la monte dans son banc.`;
  }
  if (carte.type !== 'DOUBLE') {
    return 'Un Plan Large ouvre une nouvelle séquence, détachée du reste du montage. Clique sur un emplacement de ton banc.';
  }
  if (!choisi) return 'La carte se glisse sous les précédentes : clique sur la moitié que tu veux laisser visible.';
  const plan = moitiesDe(carte)[choisi];
  // Ouverture, Générique, Raccord : tous des Raccords. On les nomme par leur
  // type, comme la carte elle-même.
  const quoi = plan.transition
    ? `${FORMATS.TR.label.toLowerCase()} n°${plan.num}`
    : `${FORMATS[choisi].label} n°${plan.num}${objsDe(plan).length
      ? ` — ${objsDe(plan).map((o) => objLabel(o)).join(' et ')}` : ' — sans bandeau'}`;
  // Une moitié peut n'avoir aucun emplacement — un Raccord entre deux
  // Génériques, par exemple. Mieux vaut le dire que de laisser un banc sans
  // bouton.
  const possibles = coupsPossibles(st, st.courant, carteVisee).filter((c) => c.format === choisi);
  if (!possibles.length) {
    return `Le <b>${quoi}</b> n’a aucun emplacement possible dans ton banc — garde plutôt l’autre moitié.`;
  }
  if (plan.transition === 'RACCORD' && possibles.some((c) => c.action === 'SOUDER')) {
    return `Tu gardes le <b>${quoi}</b>. Entre deux séquences il les <b>raccorde</b> ; aux deux bouts
    du montage, il se pose comme un plan.`;
  }
  return `Tu gardes le <b>${quoi}</b>. Clique maintenant sur un emplacement de ton banc.`;
}

/**
 * La consigne du tour, telle qu'on la lit au-dessus de la rivière. Tant qu'on
 * n'a rien visé, elle dit quoi faire ; une fois une moitié retenue, elle dit
 * ce qu'on tient et où le poser.
 */
/**
 * La table se lit d'elle-même : les cartes de la rivière s'offrent, le banc
 * ouvre ses emplacements, l'aperçu montre la place. On ne dit donc rien —
 * sauf dans l'impasse, où il faut bien avertir que cette moitié-là ne se pose
 * nulle part, et proposer de prendre la carte tout de même : dérusher n'est
 * pas facultatif.
 */
function aidePose(st) {
  const v = store.choixRiviere;
  if (!v) return '';
  const carte = carteOption(st, v.o);
  if (!carte) return '';
  const tous = coupsPossibles(st, st.courant, carte);
  if (tous.some((c) => c.format === v.format)) return '';
  const texte = aideMontage(st, v.format, true, carte);
  return tous.length ? texte
    : `${texte} <button class="pill mini" data-prendre="1">Prendre la carte quand même</button>`;
}

function zoneMontage(st, p, humaine = true) {
  const carte = st.mains[p][0];
  if (!carte) return '<div class="zone-montage"><p class="aide">Aucune carte dérushée.</p></div>';

  // La carte se regarde sur la face où elle a été prise : on ne la retourne
  // pas dans son dos.
  const verso = faceVisible(st, carte) === 'V';

  // Un Plan Large n'a pas de moitié à choisir.
  if (carte.type !== 'DOUBLE') {
    store.formatChoisi = 'PL';
    return `<div class="zone-montage">
      <div id="choix-carte">${renderCarte(carte, verso, {})}</div>
      <p class="aide" id="aide-montage">${aideMontage(st, 'PL', humaine)}</p>
    </div>`;
  }

  // La carte se retourne aussi en main : on regarde son autre face pendant
  // qu'on choisit sa moitié. L'aperçu de pose dit, lui, la face qu'elle aura
  // vraiment à l'emplacement visé.
  const choisi = store.formatChoisi === 'GP' || store.formatChoisi === 'PM' ? store.formatChoisi : null;
  return `<div class="zone-montage">
    <div class="carte-retournable">
      <div id="choix-carte">${renderCarte(carte, verso, { moitiesChoisissables: humaine, formatChoisi: choisi })}</div>
      ${humaine ? boutonRotation(st, carte) : ''}
    </div>
    <p class="aide" id="aide-montage">${aideMontage(st, choisi, humaine)}</p>
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
 * Le score du banc, bandeau par bandeau : chacun avec ses icônes et ce qu'il
 * rapporte, puis les points qui ne viennent d'aucun bandeau — pose, jonctions,
 * chronologie — et le total. La colonne dit d'où vient chaque point.
 */
/**
 * Les bandeaux identiques d'un même banc, réunis en une ligne. Un montage qui
 * porte six fois « 3 × Mort » produit six lignes strictement semblables :
 * autant les compter une fois, avec leur nombre et leur somme. Deux bandeaux
 * sont identiques quand ils ont la même forme **et** la même valeur — ce que
 * l'œil lit comme un même bandeau.
 */
function grouperBandeaux(lignes) {
  const par = new Map();
  for (const l of lignes) {
    const cle = `${signatureObj(l.obj)}|${l.obj.n}`;
    const e = par.get(cle);
    if (e) { e.n++; e.pts += l.pts; }
    else par.set(cle, { obj: l.obj, n: 1, pts: l.pts });
  }
  return [...par.values()];
}

/** « ×6 » quand un bandeau est posé plusieurs fois. */
const jetonNombre = (n) => (n > 1 ? `<span class="grp-n" title="${n} fois sur le banc">×${n}</span>` : '');

function listeObjectifs(s) {
  const hors = ['POSE', 'JONCTION', 'CHRONOLOGIE'].filter((k) => s.detail[k]);
  if (!s.lignes.length && !hors.length) {
    return `<table class="tableau-score">
      <tr><td class="aide">Aucun bandeau visible sur le banc</td><td>0</td></tr>
      <tr class="total"><td>Total</td><td>${s.total}</td></tr>
    </table>`;
  }
  // Du plus gros au plus petit : on veut voir d'abord ce qui rapporte.
  const rangs = grouperBandeaux(s.lignes).slice().sort((a, b) => b.pts - a.pts);
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
    + rangee(['PL', 'PM', 'GP', 'DEP'].map((f) => compte(cadrageIcon(f), r.cadrages[f], FORMATS[f].label)).join('')
      + compte(cadrageIcon('TR'), r.raccords, 'Cartes Raccord'))
    + rangee(compte(elIcon('MORT', 22), r.morts, 'Plans de mort')
      + compte(elIcon('NEANT', 22), r.sansPersonnage, 'Plans sans personnage'));
  return tout || '<p class="aide">Rien encore sur le banc</p>';
}

// --- Interactions ----------------------------------------------------------

function brancherPartie(st, humaine) {
  const q = (s) => app.querySelector(s);

  // Les onglets de banc : un clic épingle le banc choisi jusqu'au tour suivant.
  const partir = app.querySelector('#ligne-partir');
  if (partir) partir.addEventListener('click', () => {
    if (store.enLigne) store.enLigne.quitter();
    location.hash = '#/enligne';
  });
  app.querySelectorAll('[data-onglet-banc]').forEach((b) => b.addEventListener('click', () => {
    store.bancVu = +b.dataset.ongletBanc;
    vuePartie(false);
  }));

  // La zone garde la même forme pendant les tours d'IA : les clics, eux, sont
  // réservés à la joueuse humaine.
  if (humaine) {
    app.querySelectorAll('[data-depart]').forEach((el) => el.addEventListener('click', () => {
      const k = +el.dataset.depart;
      if (store.enLigne && store.enLigne.partie) { store.enLigne.jouer({ k: 'depart', i: k }); return; }
      store.undo = JSON.stringify(st);
      poserDepartAVue(st, st.courant, k, choixDepart(st, st.courant)[k]);
      apresCoup(st, avancer(st));
    }));

    // Viser une moitié de la rivière ne joue rien : cela désigne ce que l'on
    // veut poser, et le banc montre aussitôt où. C'est le clic sur
    // l'emplacement qui joue le tour, d'un seul geste.
    app.querySelectorAll('[data-derush] .moitie[data-format]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const hote = el.closest('[data-derush]');
        viser(st, JSON.parse(decodeURIComponent(hote.dataset.derush)), el.dataset.format);
      });
    });

    // Une pioche face cachée n'a pas de moitié à viser : on la prend, et le
    // montage se joue ensuite comme dans l'ordre imprimé.
    app.querySelectorAll('[data-derush]').forEach((el) => el.addEventListener('click', async () => {
      if (el.querySelector('.moitie[data-format]')) return;
      const choix = JSON.parse(decodeURIComponent(el.dataset.derush));
      if (store.enLigne && store.enLigne.partie) {
        store.enLigne.jouer({ k: 'derush', o: { source: choix.source, index: choix.index } });
        return;
      }
      store.undo = JSON.stringify(st);
      apresCoup(st, await jouerDerushage(st, st.courant, choix));
    }));

    // La carte qui ne se pose nulle part se prend quand même : dérusher n'est
    // pas facultatif.
    const prendre = app.querySelector('[data-prendre]');
    if (prendre) prendre.addEventListener('click', async () => {
      const v = store.choixRiviere;
      if (!v) return;
      if (store.enLigne && store.enLigne.partie) {
        store.choixRiviere = null;
        store.enLigne.jouer({ k: 'derush', o: { source: v.o.source, index: v.o.index } });
        return;
      }
      store.undo = JSON.stringify(st);
      apresCoup(st, await jouerDerushage(st, st.courant, v.o));
    });

    // Retourner une carte ne joue pas le tour : on repeint la seule carte
    // concernée — dans le chutier avant de la prendre, en main pendant qu'on
    // choisit sa moitié.
    app.querySelectorAll('[data-retourner]').forEach((el) => el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const carte = [...st.chutierPL, ...st.chutierPMGP, st.piochePMGP[0], ...st.mains[st.courant]]
        .find((c) => c && c.id === el.dataset.retourner);
      if (!carte) return;
      if (store.enLigne && store.enLigne.partie) { store.enLigne.jouer({ k: 'retourner', id: carte.id }); return; }
      retourner(st, carte);
      const boite = el.closest('.carte-retournable');
      const enveloppe = boite && boite.querySelector('[data-derush], #choix-carte');
      if (!enveloppe) return vuePartie();
      const verso = faceVisible(st, carte) === 'V';
      const enMain = enveloppe.id === 'choix-carte';
      // Dans la rivière, la carte reste visable après avoir tourné : on la
      // redessine avec ses moitiés cliquables et la visée qu'elle portait.
      const o = enMain ? null : JSON.parse(decodeURIComponent(enveloppe.dataset.derush));
      const visee = o && store.choixRiviere && memeOption(store.choixRiviere.o, o)
        ? store.choixRiviere.format : null;
      enveloppe.innerHTML = enMain
        ? renderCarte(carte, verso, { moitiesChoisissables: true, formatChoisi: store.formatChoisi })
        : renderCarte(carte, verso, { small: true, clickable: true, moitiesChoisissables: true, formatChoisi: visee });
      el.querySelector('.face').textContent = verso ? 'verso' : 'recto';
      boite.classList.add('tourne');
      setTimeout(() => boite.classList.remove('tourne'), 320);
      enveloppe.querySelectorAll('.carte.choix-moitie .moitie[data-format]').forEach((m) => {
        m.addEventListener('click', (e2) => {
          e2.stopPropagation();
          if (enMain) choisirMoitie(st, m.dataset.format);
          else viser(st, o, m.dataset.format);
        });
      });
      // La face a changé : ce que l'emplacement montrerait aussi. Le banc se
      // recalcule sur la carte telle qu'elle est maintenant.
      if (!enMain && visee) rafraichirVisee(st);
      brancherApercu(boite);
    }));

    // Le choix de la moitié ne touche pas à la partie : on repeint la seule
    // carte concernée plutôt que toute la table. Un Plan Large n'a pas de
    // moitié à choisir : cliquer dessus ne doit pas défaire sa sélection, ce
    // qui escamoterait les emplacements de pose.
    app.querySelectorAll('#choix-carte .carte.choix-moitie .moitie[data-format]').forEach((el) => {
      el.addEventListener('click', () => choisirMoitie(st, el.dataset.format));
    });

    brancherFentes(st);
  }

  // Épingler un banc ne touche pas à la partie : on repeint la seule colonne.
  const majColonnes = () => {
    const c = q('#colonnes-joueur');
    if (!c) return vuePartie();
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

  brancherBasculeIllus(vuePartie);
  const bp = q('#bascule-points');
  if (bp) bp.addEventListener('click', () => {
    store.cfg.pointsSurCartes = store.cfg.pointsSurCartes === false;
    sauverCfg(); vuePartie();
  });
  const ba = q('#bascule-apercu');
  if (ba) ba.addEventListener('click', () => {
    store.cfg.apercuSurvol = !store.cfg.apercuSurvol;
    boiteApercu().classList.remove('visible');
    sauverCfg(); vuePartie();
  });
  brancherApercu();

  // Revenir en arrière ou quitter coupe le fil des IA et rappelle les cartes
  // en vol : rien de la partie annulée ne doit se poser après coup.
  if (q('#undo')) q('#undo').addEventListener('click', () => {
    if (!store.undo) return;
    store.filIA++; store.vols = []; stopperVols();
    store.partie = JSON.parse(store.undo); store.undo = null;
    store.formatChoisi = null; store.choixRiviere = null;
    vuePartie();
  });
  if (q('#quitter')) q('#quitter').addEventListener('click', () => {
    if (!confirm('Quitter la partie en cours ?')) return;
    store.filIA++; store.vols = []; stopperVols();
    store.partie = null; location.hash = '#/';
  });

  brancherRotationClavier();

  document.onkeydown = humaine ? (e) => {
    // F retourne la carte sous le curseur : on lit son autre face sans viser
    // le petit bouton.
    if ((e.key === 'f' || e.key === 'F') && carteSurvolee && carteSurvolee.isConnected) {
      const b = carteSurvolee.querySelector('[data-retourner]');
      if (b) { e.preventDefault(); b.click(); return; }
    }
    // Échap annule le choix de la moitié — sauf sur un Plan Large, qui n'en a
    // pas et perdrait alors ses emplacements de pose.
    const carte = st.mains[st.courant] && st.mains[st.courant][0];
    if (e.key === 'Escape' && store.formatChoisi && carte && carte.type === 'DOUBLE') {
      choisirMoitie(st, store.formatChoisi);
    }
  } : null;
}

// ---------------------------------------------------------------------------
// Aperçu au survol
// ---------------------------------------------------------------------------
// Sur une carte de jeu, minutage, pastilles et bandeau restent petits. Le
// survol en donne une lecture en grand, dans un panneau flottant unique
// suivant le curseur — hors du banc, donc jamais rogné par son défilement.

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
 * Le calcul d'un bandeau, en clair : ce qu'il a trouvé, et ce que cela lui
 * rapporte. Sans cela, une carte à deux pouvoirs affiche un total que rien
 * n'explique — « pourquoi 10 et pas 12 ? ». Ce qu'un bandeau compte dépend de
 * sa portée : les flèches la disent, le libellé la dit en toutes lettres.
 */
function compteObj(o, pts) {
  if (pts === undefined || pts === null) return '';
  const lg = objLabel(o, store.cfg);
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
  return `
    <div class="ap-tete">
      <span class="ap-tc ${d.tc === 0 || d.transition ? 'bleu' : ''}">${tc(d.tc)}</span>
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
    </div>` : '<div class="ap-vide">Aucun bandeau</div>'}
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
  // L'infobulle ne s'ouvre que si on l'a demandée : elle se déclenchait sur
  // toutes les cartes de la table, pioches comprises, où elle ne disait rien
  // que la carte ne montrait déjà. Le bouton « Pop-up au survol » la rallume.
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
// la carte qui vole de sa pioche jusqu'au banc, une pause, la suivante. La
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
 * carte prise quitte le chutier pendant que la pioche l'y remplace, ce qui se
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

// --- Les trois coups, joués à vue ------------------------------------------

/** Le Plan de départ quitte la main et ouvre le banc. */
function poserDepartAVue(st, p, k, choix) {
  volDepuis(`[data-depart="${k}"] .moitie`, `[data-banc="${p}"] .moitie.neuf`);
  poserDepart(st, p, choix);
}

/** Où la carte va être prise, et où la pioche la remplacera. */
function ancresDerushage(st, o) {
  const fam = o.source.endsWith('_PL') ? 'PL' : 'PMGP';
  const pile = fam === 'PL' ? st.piochePL : st.piochePMGP;
  const chutier = fam === 'PL' ? st.chutierPL : st.chutierPMGP;
  const duChutier = o.source.startsWith('CHUTIER');
  const sel = `[data-derush="${enc(o)}"]`;
  // Chaque moitié est relevée à part : c'est celle que l'on garde qui vole
  // jusqu'au banc. Faire partir la carte entière la faisait se comprimer en
  // vol jusqu'à la largeur d'une moitié — une déformation que rien ne
  // justifie, puisque c'est bien une moitié que l'on pose.
  const moities = {};
  for (const f of ['GP', 'PM', 'PL', 'DEP']) moities[f] = preleve(`${sel} .moitie[data-format="${f}"]`);
  return {
    carte: preleve(sel),
    moities,
    pioche: duChutier && pile.length ? preleve(`#pioche-${fam}`) : null,
    // La remplaçante se pose là où était la carte prise : c'est ce trou-là que
    // la pioche vient combler, pas le bout de la rivière.
    place: `[data-chutier="${fam}"][data-i="${duChutier ? o.index : chutier.length}"]`,
  };
}

/**
 * Le dérushage d'une joueuse humaine se joue en deux temps, et le premier reste
 * dans le chutier : la carte prise en sort et gagne le centre de la table —
 * elle passe en main — pendant que la pioche renvoie une carte à la place
 * laissée vide. Ce n'est qu'ensuite que la zone passe au montage : sans cette
 * étape, le chutier aurait déjà disparu et l'on ne verrait jamais la pioche le
 * recharger.
 *
 * Rend true si la partie s'achève.
 */
async function jouerDerushage(st, p, o) {
  const a = ancresDerushage(st, o);
  programmerVol(a.carte, '.zone-phase', { taille: false });
  programmerVol(a.pioche, a.place);
  derusher(st, p, o);
  store.formatChoisi = null;
  store.choixRiviere = null;

  // Premier temps : le chutier tel qu'il est maintenant, carte en vol au-dessus.
  vuePartie(false);
  await jouerVols();
  return avancer(st);
}

/**
 * Le tour d'une joueuse humaine, d'un seul geste : la carte visée quitte la
 * rivière et se pose dans le banc, la pioche recharge la place laissée vide.
 * Les deux temps des règles — dérusher, puis monter — sont bien tous les deux
 * joués ; c'est l'écran qui ne les sépare plus.
 *
 * Dans l'ordre imprimé (`tourComplet: false`), la main passe entre les deux :
 * la carte reste alors en main et le montage se joue à son tour, comme avant.
 *
 * Rend true si la partie s'achève.
 */
async function jouerTour(st, p, o, partiel) {
  const a = ancresDerushage(st, o);
  derusher(st, p, o);
  store.choixRiviere = null;
  store.formatChoisi = null;
  let fini = avancer(st);

  let pose = false;
  if (!fini && st.phase === 'MONTAGE' && st.courant === p) {
    const carte = st.mains[p][0];
    const coups = coupsPossibles(st, p);
    // L'emplacement a été calculé sur la carte de la rivière : c'est la même,
    // mais on la retrouve dans la liste plutôt que de la supposer valide.
    const coup = coups.find((c) => c.format === partiel.format && c.action === partiel.action
      && c.pos === partiel.pos && c.seq === partiel.seq && c.cote === partiel.cote && c.role === partiel.role);
    if (coup) { poser(st, p, coup); pose = true; }
    else if (coups.length) { poser(st, p, coups[0]); pose = true; }
    else st.mains[p] = [];
    fini = avancer(st);
  }

  programmerVol(pose ? (a.moities[partiel.format] || a.carte) : a.carte,
    pose ? `[data-banc="${p}"] .moitie.neuf` : `[data-banc="${p}"]`,
    pose ? {} : { taille: false, fondu: true });
  programmerVol(a.pioche, a.place);
  vuePartie(false);
  await jouerVols();
  return fini;
}

/**
 * Le tour d'une IA tient en un seul geste : sa carte quitte le chutier et se
 * pose dans son banc, la pioche recharge la place laissée vide, et la table
 * passe à la joueuse suivante. On ne montre pas l'étape où la carte est en
 * main — il n'y a rien à y décider, et cela ferait un écran de plus.
 *
 * Rend true si la partie s'achève.
 */
function tourIA(st, p, o) {
  const a = ancresDerushage(st, o);
  derusher(st, p, o);
  store.formatChoisi = null;
  store.choixRiviere = null;
  let fini = avancer(st);

  // Le montage de la même joueuse, dans la foulée — sauf en ordre imprimé, où
  // la main est déjà passée.
  let pose = false;
  let format = null;
  if (!fini && st.phase === 'MONTAGE' && st.courant === p) {
    const coups = coupsPossibles(st, p);
    if (coups.length) {
      const coup = choisirCoup(st, p) || coups[0];
      poser(st, p, coup); pose = true; format = coup.format;
    } else st.mains[p] = [];
    store.formatChoisi = null;
    fini = avancer(st);
  }

  programmerVol(pose ? (a.moities[format] || a.carte) : a.carte,
    pose ? `[data-banc="${p}"] .moitie.neuf` : `[data-banc="${p}"]`,
    pose ? {} : { taille: false, fondu: true });
  programmerVol(a.pioche, a.place);
  return fini;
}

/** La carte en main se pose dans le banc, à l'emplacement choisi. */
function poserAVue(st, p, coup) {
  volDepuis(`#choix-carte .moitie[data-format="${coup.format}"]`, `[data-banc="${p}"] .moitie.neuf`);
  poser(st, p, coup);
  store.formatChoisi = null;
}

/** Joue le coup de l'IA courante. Renvoie true si la partie s'achève. */
async function coupIA(st) {
  if (!st || st.finie || estHumaine(st)) return false;
  const p = st.courant;

  if (st.phase === 'DEPART') {
    const options = choixDepart(st, p);
    const d = choisirDepart(st, p) || options[0];
    // L'IA rend son propre relevé des choix : on retrouve la carte affichée
    // par ce qu'elle désigne, pas par son identité d'objet.
    const k = d ? options.findIndex((o) => o.carteIdx === d.carteIdx && o.face === d.face) : -1;
    if (d) poserDepartAVue(st, p, Math.max(0, k), d);
    return avancer(st);
  }

  if (st.phase === 'DERUSHAGE') {
    const o = choisirDerushage(st, p) || optionsDerushage(st)[0];
    return o ? tourIA(st, p, o) : avancer(st);
  }

  const coups = coupsPossibles(st, p);
  if (coups.length) poserAVue(st, p, choisirCoup(st, p) || coups[0]);
  else st.mains[p] = [];
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
  // Le palmarès regroupe les bandeaux identiques d'une même joueuse : six fois
  // « 3 × Mort » chez Justine tenaient six lignes pour une seule information.
  const groupes = cl.flatMap((c) => grouperBandeaux(c.lignes).map((g) => ({ ...g, nom: c.joueur.nom })));
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
      ${cartouche(cl.reduce((s, c) => s + c.cartesRaccord, 0), 'Cartes Raccord posées')}
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
        <h3>Les bandeaux qui ont le plus rapporté</h3>
        <table class="tbl tbl-pouvoirs">
          <thead><tr><th>Bandeau</th><th>Chez</th><th class="num">Points</th></tr></thead>
          <tbody>${groupes.slice().sort((a, b) => b.pts - a.pts).slice(0, 8).map((g) => `<tr>
              <td class="pv-visuel">${objHTML(g.obj, 24, st.cfg)}${jetonNombre(g.n)}</td>
              <td>${g.nom}</td><td class="num"><b>${g.pts}</b></td>
            </tr>`).join('') || '<tr><td colspan="3" class="aide">Aucun bandeau posé.</td></tr>'}</tbody>
        </table>
        ${meilleur ? `<p class="aide">Le meilleur bandeau de la partie rapporte
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
      <div class="credits">${cl[0].joueur.nom} l’emporte avec <b>${cl[0].total} points</b>.</div>
    </div>
    <div class="panneau">
      <h2>Classement</h2>
      <table class="tbl">
        <tr><th>#</th><th>Joueuse</th><th>Profil</th><th class="num">Plans</th><th class="num">Séquences</th><th class="num">Raccords</th><th class="num">Score</th></tr>
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
      ${cl.map((c) => `<div class="panneau"><h2>Détail — ${c.joueur.nom}</h2>${listeObjectifs(c)}</div>`).join('')}
    </div>
    <div class="panneau">
      <h2>Les bancs de montage</h2>
      ${/* Le même banc qu'en jeu, rendu par la même fonction : en mode Banc en
            lignes, le compte rendu se lit donc ligne sur ligne, chaque séquence
            sur la sienne et les ancres alignées. Les points de chaque plan y
            sont aussi, au coin des cartes — c'est le moment de les lire. */
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
// permanence — l'IMPRIMÉ, intouchable, et le MODIFIÉ, qui porte les retouches ;
// un sélecteur dit lequel se joue, et rien n'est jamais détruit.
//
// Une moitié de carte double existe en deux exemplaires, un par face : « 201R »
// et « 201V » sont deux plans distincts, car le recto et le verso d'une carte
// ne portent pas le même minutage.

const mat = {
  vue: 'CARTES',        // CARTES | GP | PM | PL | DEPART | TABLE | STATS
  tri: 'num',
  filtres: { face: '', icone: '', pouvoir: '', tcMin: '', tcMax: '', etat: '', actif: '', famille: '' },
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
};

const VUES = [
  ['CARTES', 'Cartes PM / GP'], ['GP', 'Gros Plans'], ['PM', 'Plans Moyens'],
  ['PL', 'Plans Larges'], ['DEPART', 'Plans de départ'], ['TOUS', 'Tous les plans'],
  ['TABLE', 'Tableau complet'], ['STATS', 'Statistiques'], ['POUVOIRS', 'Statistiques des pouvoirs'],
];

const VUES_GALERIE = ['CARTES', 'GP', 'PM', 'PL', 'DEPART', 'TOUS'];

// Ce que compte un pouvoir. Les libellés se lisent à la suite du « n × » du
// bandeau : « 2 × par plan du cadrage — Plan Large ».
// Chaque pouvoir se nomme par **ce qu'il compte**, en capitales : on lit d'un
// coup d'œil ce que la valeur multiplie, et la liste se parcourt par ce mot-là
// plutôt que par une phrase.
const KINDS = [
  ['',        'aucun pouvoir'],
  ['FORMAT',  'par CADRAGE…'],
  ['ELEMENT', 'par ICONE…'],
  ['PAIRE',   'par 2 ICONES…'],
  ['MORT',    'par MORT'],
  ['NEANT',   'par PLAN SANS PERSONNAGE'],
  ['RACCORD', 'par RACCORD'],
  ['PLAN',    'par PLAN'],
  ['MINUTAGE', 'par MINUTAGE avant / après…'],
  ['ABSENT',  'si ICONE absente…'],
  ['CHRONO',  'si DANS L’ORDRE'],
  ['SANS_TC', 'si AUCUN MINUTAGE…'],
  // Les bandeaux qui comptent des séquences plutôt que des plans : ils lisent
  // la forme du banc, pas son contenu carte par carte.
  ['SEQ_TAILLE',   'par SÉQUENCE de n plans ou plus / ou moins…'],
  ['SEQ_VOISINES', 'par SÉQUENCE au-dessus / en dessous…'],
  ['SEQ_LONGUE',   'par PLAN de la plus longue SÉQUENCE'],
  ['SEQ_AVEC',     'par SÉQUENCE avec / sans…'],
];

const KIND_LABEL = Object.fromEntries(KINDS.map(([k, l]) => [k, l]));

// --- La couche de retouches ------------------------------------------------
// L'éditeur travaille toujours sur le jeu MODIFIÉ, même quand c'est l'imprimé
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
// Retoucher une carte est une chose ; en créer une, ou en retirer une de la
// boîte pour de bon, en est une autre. C'est la **composition** : elle ne
// dépend pas du jeu qu'on lance — une carte qui n'existe pas n'existe ni dans
// l'imprimé ni dans le modifié — et elle voyage avec la configuration, donc
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
 * Le premier numéro libre d'une famille. Les Plans Larges et les Plans de
 * départ partagent la centaine 100, les Plans Moyens la 200, les Gros Plans la
 * 300 : on reste dans sa bande pour que le numéro dise encore le cadrage.
 */
function prochainNumero(bande) {
  const pris = new Set(surLeModifie(() => catalogue().map((p) => p.numOrigine)));
  let n = bande;
  while (pris.has(n)) n++;
  return n;
}

/** La prochaine lettre de version libre pour un Plan de départ. */
function prochaineVersion() {
  const pris = new Set(surLeModifie(() => DEPARTS().map((d) => d.type)));
  for (let c = 65; c < 91; c++) if (!pris.has(String.fromCharCode(c))) return String.fromCharCode(c);
  return `V${pris.size + 1}`;
}

function prochainIdxScene() {
  return surLeModifie(() => SCENES().reduce((m, s) => Math.max(m, s.idx), 0)) + 1;
}

/**
 * Crée une carte dans la famille demandée et rend les clés de plan à
 * sélectionner ensuite — on ouvre l'éditeur sur ce qu'on vient de faire.
 *
 * Une **moitié** ne se crée pas seule : un Plan Moyen et un Gros Plan sont les
 * deux côtés d'une même scène, et c'est la scène qu'on ajoute. Elle fournit
 * donc les deux moitiés d'un coup — libre à un appariement de n'en prendre
 * qu'une, comme le Générique de fin dont la moitié Plan Moyen ne sert à aucune
 * carte.
 */
function creerCarte(famille) {
  const m = composition();
  if (famille === 'PL') {
    const num = prochainNumero(101);
    m.ajouts.larges.push({ num, tc: 0, el: [], obj: null });
    sauverCfg();
    return { cles: [String(num)], cartes: [`L${num}`], quoi: `Plan Large ${num}` };
  }
  if (famille === 'DEPART') {
    const type = prochaineVersion();
    const a = prochainNumero(101);
    const b = prochainNumero(a + 1);
    m.ajouts.departs.push({ type, faces: [{ num: a, tc: 0, el: [], obj: null }, { num: b, tc: 0, el: [], obj: null }] });
    sauverCfg();
    return { cles: [String(a), String(b)], cartes: [`S${type}f${a}`, `S${type}f${b}`],
      quoi: `Plan de départ version ${type} — faces ${a} et ${b}` };
  }
  if (famille === 'GP' || famille === 'PM' || famille === 'SCENE') {
    const idx = prochainIdxScene();
    const pmNum = prochainNumero(201);
    const gpNum = prochainNumero(301);
    m.ajouts.scenes.push({ idx, pmNum, gpNum, tc: 0, famille: 'PERSONNAGE', pmEl: [], gpEl: [], obj: null });
    sauverCfg();
    const cles = famille === 'GP' ? [`${gpNum}R`, `${gpNum}V`]
      : famille === 'PM' ? [`${pmNum}R`, `${pmNum}V`]
        : [`${pmNum}R`, `${gpNum}R`];
    return { cles, quoi: `scène ${idx} — Plan Moyen ${pmNum} et Gros Plan ${gpNum}` };
  }
  // Une carte Plan Moyen / Gros Plan : un appariement de deux moitiés qui
  // existent déjà. On part des plus récentes — celles qu'on vient de créer.
  const dispo = surLeModifie(() => ({
    pm: moitiesDisponibles('PM'), gp: moitiesDisponibles('GP'),
  }));
  if (!dispo.pm.length || !dispo.gp.length) return null;
  const pmNum = dispo.pm[dispo.pm.length - 1].num;
  const gpNum = dispo.gp[dispo.gp.length - 1].num;
  m.ajouts.paires.push({ pmNum, gpNum });
  sauverCfg();
  return { carte: true, quoi: `carte Plan Moyen ${pmNum} | Gros Plan ${gpNum}` };
}

/**
 * Ce qui partirait avec une carte supprimée. Retirer une **scène** emporte les
 * appariements qui s'en servent : une carte à qui il manque une moitié n'a plus
 * rien à montrer. On le dit avant, pas après.
 */
function consequencesSuppression(ids) {
  return surLeModifie(() => {
    const scenes = ids.filter((id) => id.startsWith('SC')).map((id) => +id.slice(2));
    if (!scenes.length) return [];
    const nums = new Set(SCENES().filter((s) => scenes.includes(s.idx)).flatMap((s) => [s.pmNum, s.gpNum]));
    return buildCartesDoubles()
      .filter((c) => nums.has(c.pmNum) || nums.has(c.gpNum))
      .map((c) => c.id);
  });
}

/**
 * Supprime des cartes du matériel. Rien n'est jamais effacé de la liste des
 * ajouts : un appariement créé tient son identifiant de **sa place** dans la
 * liste, et en retirer un ferait glisser les suivants — la carte D52 deviendrait
 * D51, et les retouches rangées par rang suivraient la mauvaise carte. On note
 * donc la carte comme retirée, et c'est tout : la suppression reste réversible,
 * ce qui est bien le moins pour un geste qui ne demande pas confirmation deux
 * fois.
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
 * L'identifiant par lequel une carte se supprime. Une carte double et un Plan
 * Large portent le leur ; les quatre exemplaires d'une version de Plan de
 * départ n'en font qu'une — c'est la **version** qu'on retire, pas une de ses
 * faces, puisqu'elles sont les deux côtés d'un même carton.
 */
function normaliserSuppression(ids) {
  return [...new Set(ids.map((id) => {
    const m = /^S([A-Z]|V\d+)f\d+$/.exec(id);
    return m ? `S${m[1]}` : id;
  }))];
}

/** Les scènes dont relèvent des moitiés sélectionnées, pour les supprimer. */
function scenesDesPlans(plans) {
  return surLeModifie(() => {
    const nums = new Set(plans.map((p) => p.numOrigine));
    return SCENES().filter((s) => nums.has(s.pmNum) || nums.has(s.gpNum));
  });
}

/**
 * Supprimer depuis les galeries Gros Plans / Plans Moyens. Là, ce ne sont pas
 * des cartes qui sont affichées mais des **moitiés** : ce qui s'en va est la
 * scène entière, ses deux moitiés d'un coup, et les cartes qui s'en servaient
 * avec elle.
 */
function blocSupprimerScenes(plans) {
  const scenes = scenesDesPlans(plans);
  if (!scenes.length) return '';
  const ids = scenes.map((s) => `SC${s.idx}`);
  const emportees = consequencesSuppression(ids);
  const n = scenes.length;
  return `<div class="bloc-plan boite">
    <div class="bp-tete"><b>${n > 1 ? `Ces ${n} scènes` : 'Cette scène'} dans le matériel</b></div>
    <div class="rangee-mini">
      <button class="pill mini danger" data-supprimer="${ids.join(' ')}"
        title="Retirer ces moitiés du matériel">🗑 Supprimer ${n > 1 ? 'ces scènes' : 'cette scène'}</button>
    </div>
    <p class="aide">Un Plan Moyen et un Gros Plan sont les deux côtés d’une même scène : ils partent
    ensemble.${emportees.length ? ` <b>${emportees.length} carte${emportees.length > 1 ? 's' : ''}
    Plan Moyen / Gros Plan</b> s’en ${emportees.length > 1 ? 'servent' : 'sert'} et partira${
  emportees.length > 1 ? 'ont' : ''} avec.` : ' Aucune carte ne s’en sert.'}</p>
  </div>`;
}

function activerCartes(ids, actif) {
  const d = new Set(store.cfg.cartesDesactivees);
  for (const id of ids) { if (actif) d.delete(id); else d.add(id); }
  store.cfg.cartesDesactivees = [...d];
  sauverCfg();
}

// --- Le matériel, tel que l'éditeur le voit --------------------------------

/** Les cartes d'une vue, avec leurs plans. Toujours lues sur le jeu modifié. */
function cartesDe(vue) {
  return surLeModifie(() => {
    if (vue === 'PL') {
      return buildPlansLarges().map((c) => ({
        id: c.id, type: 'PL', carte: c, plans: [plHalf(c)],
        libelle: `Plan Large ${c.num}${c.brouillon ? ' · à compléter' : ''}`,
      }));
    }
    if (vue === 'DEPART') {
      return DEPARTS().flatMap((d) => d.faces.map((f, k) => ({
        id: `S${d.type}f${f.num}`, type: 'DEPART', carte: { ...f, depart: true },
        plans: [plHalf({ ...f, depart: true })],
        libelle: `Plan de départ ${f.num} · version ${d.type} — face ${k + 1}`,
      })));
    }
    return buildCartesDoubles().map((c, i) => {
      const r = moitiesDe(c, 'R'), v = moitiesDe(c, 'V');
      return {
        id: c.id, type: 'DOUBLE', carte: c, rang: i,
        plans: [r.GP, r.PM, v.GP, v.PM],
        libelle: `Carte ${i + 1} · GP ${r.GP.num} | PM ${r.PM.num}`,
      };
    });
  });
}

/**
 * Les tuiles d'une vue : une carte, ou un plan isolé. Les vues par cadrage
 * partent du catalogue et non des cartes — les moitiés qu'aucune carte
 * n'apparie, comme le Générique de fin, s'éditent elles aussi.
 */
function tuilesDe(vue) {
  // Tous les plans du jeu dans une seule galerie : les moitiés Gros Plan et
  // Plan Moyen, les Plans Larges et les Plans de départ. Ce sont les mêmes
  // plans que dans les autres vues — une seule vitre, pas un autre matériel.
  if (vue === 'TOUS') {
    return [...tuilesDe('GP'), ...tuilesDe('PM'), ...tuilesDe('PL'), ...tuilesDe('DEPART')];
  }
  if (vue === 'GP' || vue === 'PM') {
    return surLeModifie(() => catalogue()
      .filter((p) => p.format === vue)
      .map((p) => ({
        genre: 'PLAN', cle: p.cle, plan: halfInfo(p.scene, p.format, { face: p.face }),
        libelle: `${FORMATS[p.format].label} ${p.num} — ${p.face === 'R' ? 'recto' : 'verso'}`,
      })));
  }
  return cartesDe(vue).map((c) => ({ genre: 'CARTE', ...c, cle: c.id }));
}

// --- Tri et filtres ---------------------------------------------------------

const TRIS = [
  ['num', 'Numéro croissant'], ['num-desc', 'Numéro décroissant'],
  ['tc', 'Minutage croissant'], ['tc-desc', 'Minutage décroissant'],
  ['famille', 'Famille'],
];

/** Les plans d'une tuile — un pour un plan isolé, tous ceux de la carte sinon. */
function plansTuile(t) {
  return t.genre === 'PLAN' ? [t.plan] : t.plans;
}

function passeFiltres(t) {
  const f = mat.filtres;
  // Le filtre de face écarte les plans de l'autre face ; sur une carte, qui
  // porte les deux, il ne choisit que la face montrée.
  const plans = f.face && t.genre === 'PLAN'
    ? plansTuile(t).filter((h) => h.face === f.face)
    : plansTuile(t);
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

  // La boîte se compose par carte : le filtre ne s'applique pas à une moitié.
  if (f.actif && t.genre === 'CARTE') {
    if (f.actif === 'ACTIVE' && estDesactivee(t.id)) return false;
    if (f.actif === 'DESACTIVE' && !estDesactivee(t.id)) return false;
  }
  return true;
}

function trier(tuiles) {
  const num = (t) => (t.genre === 'PLAN' ? t.plan.num : (t.carte.gpNum ?? t.carte.num));
  const tcm = (t) => Math.min(...plansTuile(t).map((h) => h.tc));
  const fam = (t) => plansTuile(t)[0].famille || '';
  const c = [...tuiles];
  switch (mat.tri) {
    case 'num-desc': c.sort((a, b) => num(b) - num(a)); break;
    case 'tc':       c.sort((a, b) => tcm(a) - tcm(b) || num(a) - num(b)); break;
    case 'tc-desc':  c.sort((a, b) => tcm(b) - tcm(a) || num(a) - num(b)); break;
    case 'famille':  c.sort((a, b) => fam(a).localeCompare(fam(b)) || num(a) - num(b)); break;
    default:         c.sort((a, b) => num(a) - num(b));
  }
  return c;
}

const FAMILLES = ['TRANSITION', 'MORT', 'ARME', 'VEHICULE', 'OBJET', 'PERSONNAGE', 'PLAN LARGE', 'DÉPART'];

// --- La vue -----------------------------------------------------------------

function vueMateriel() {
  let corps;
  if (mat.vue === 'TABLE') corps = tableauMateriel();
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
}

/**
 * Renuméroter est libre, mais deux plans qui portent le même numéro se
 * confondent sur la table : on le dit en clair, en tête d'écran.
 */
function alerteDoublons() {
  const d = surLeModifie(doublonsNumeros);
  if (!d.length) return '';
  const nom = (s) => `${FORMATS[s.slice(0, 2)].label} ${s.slice(2)}`;
  return `<div class="alerte-doublons">
    <b>⚠ ${d.length} numéro${d.length > 1 ? 's' : ''} en double dans le matériel modifié</b>
    <ul>${d.map((x) => `<li><b>n°${x.num}</b> — porté par ${x.plans.map(nom).join(', ')}</li>`).join('')}</ul>
    <span class="aide">Rien n’est cassé : le numéro n’est qu’une étiquette, l’identité d’un plan
    reste son numéro imprimé. Mais deux plans qui l’affichent en même temps sont indiscernables
    à la lecture.</span>
  </div>`;
}

/** Quel jeu de matériel se joue, et combien il porte de retouches. */
function barreJeu() {
  const modifie = store.cfg.materielActif === 'MODIFIE';
  const n = nbRetouches();
  const off = store.cfg.cartesDesactivees.length;
  return `<div class="barre-jeu">
    <span class="bj-lg">Jeu lancé en partie</span>
    <div class="segments large" id="seg-jeu">
      <button class="${modifie ? '' : 'on'}" data-jeu="IMPRIME">Origine</button>
      <button class="${modifie ? 'on' : ''}" data-jeu="MODIFIE">Modifié</button>
    </div>
    <span class="aide">
      ${modifie
        ? `les ${n} retouche${n > 1 ? 's' : ''} de l’éditeur partent en partie`
        : `le matériel des PDF part en partie ; les ${n} retouche${n > 1 ? 's' : ''} de l’éditeur sont mises de côté, jamais perdues`}
      ${off ? ` · <b>${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}</b> de la boîte, dans les deux jeux` : ''}
      · la galerie ci-dessous montre et règle toujours le jeu <b>Modifié</b>
    </span>
    ${compositionRetouchee()}
    ${boutonIllus()}
    <button class="pill" id="mat-export">⭳ Tableau en PDF</button>
    <button class="pill" id="cartes-pdf" title="Un PDF par face de carte activée, à 88 × 63 mm, réunis dans une archive ZIP — le jeu Modifié, celui que la galerie montre">⭳ Cartes en PDF</button>
    <button class="pill" id="planches-pdf" title="Toutes les cartes activées en planches A4 paysage — neuf cartes de 88 × 63 mm par page, traits de coupe, une page de rectos puis la page de ses versos">⭳ Cartes en Tableau PDF</button>
    <label class="retournement" title="Le sens dans lequel votre imprimante retourne la feuille en recto-verso">
      <span>verso</span>
      <select id="planche-sens">${RETOURNEMENTS.map(([v, l]) => `<option value="${v}" ${
    LS.get('planche.retournement', 'colonnes') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>
    <button class="pill" id="csv-export">⭳ Cartes en CSV</button>
    <button class="pill" id="csv-import">⭱ Importer un CSV</button>
  </div>`;
}

/**
 * Le bouton de création de l'onglet courant. Chaque galerie crée ce qu'elle
 * montre — un Plan Large dans les Plans Larges, une scène dans les Gros Plans.
 * La vue « Tous les plans » mélange les familles : elle ne crée rien, on lui
 * dit où aller.
 */
const A_CREER = {
  CARTES: ['CARTES', '+ Nouvelle carte PM / GP', 'Un nouvel appariement de deux moitiés existantes'],
  GP: ['GP', '+ Nouveau Gros Plan', 'Une nouvelle scène : elle fournit un Gros Plan et son Plan Moyen'],
  PM: ['PM', '+ Nouveau Plan Moyen', 'Une nouvelle scène : elle fournit un Plan Moyen et son Gros Plan'],
  PL: ['PL', '+ Nouveau Plan Large', 'Une carte Plan Large vierge, à régler et à illustrer'],
  DEPART: ['DEPART', '+ Nouveau Plan de départ', 'Une nouvelle version recto-verso, ses deux faces vierges'],
};

function boutonCreer() {
  const e = A_CREER[mat.vue];
  if (!e) return '';
  return `<button class="pill mini creer" data-creer="${e[0]}" title="${e[2]}">${e[1]}</button>`;
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

function galerieMateriel() {
  const toutes = tuilesDe(mat.vue);
  const vues = trier(toutes.filter(passeFiltres));
  const f = mat.filtres;
  const sel = (t) => (t.genre === 'PLAN' ? mat.plans.has(t.cle) : mat.cartes.has(t.id));
  const visibles = new Set(toutes.flatMap((t) => plansTuile(t).map((h) => h.cle)));
  const horsVue = [...mat.plans].filter((c) => !visibles.has(c)).length;

  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;

  return `<div class="barre-filtres">
    <label>Tri
      <select data-filtre="tri">${TRIS.map(([k, l]) => opt(k, l, mat.tri === k)).join('')}</select></label>
    <label>Afficher
      <select data-filtre="face">
        ${opt('', 'recto et verso', !f.face)}${opt('R', 'recto seulement', f.face === 'R')}
        ${opt('V', 'verso seulement', f.face === 'V')}
      </select></label>
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
    <label>Minutage
      <input type="number" min="0" max="99" placeholder="min" value="${f.tcMin}" data-filtre="tcMin">
      <input type="number" min="0" max="99" placeholder="max" value="${f.tcMax}" data-filtre="tcMax"></label>
    <label>Famille
      <select data-filtre="famille">${opt('', 'toutes', !f.famille)}
        ${FAMILLES.map((x) => opt(x, x, f.famille === x)).join('')}</select></label>
    <label>État
      <select data-filtre="etat">${opt('', 'tous', !f.etat)}
        ${opt('IMPRIME', 'à l’imprimé', f.etat === 'IMPRIME')}${opt('RETOUCHE', 'retouchés', f.etat === 'RETOUCHE')}
      </select></label>
    <label>Boîte
      <select data-filtre="actif">${opt('', 'toutes', !f.actif)}
        ${opt('ACTIVE', 'activées', f.actif === 'ACTIVE')}${opt('DESACTIVE', 'écartées', f.actif === 'DESACTIVE')}
      </select></label>
    <button class="pill mini" id="filtres-raz">↺ filtres</button>
  </div>

  <div class="barre-selection">
    <span class="info">${vues.length} / ${toutes.length} affichée${toutes.length > 1 ? 's' : ''}
      · <b>${mat.plans.size} plan${mat.plans.size > 1 ? 's' : ''} sélectionné${mat.plans.size > 1 ? 's' : ''}</b>${
        horsVue ? ` <span class="aide">dont ${horsVue} hors de cette vue</span>` : ''}</span>
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
    : '<p class="aide" style="margin-top:18px">Aucune carte ne passe les filtres.</p>'}`;
}

// Le rendu se fait sur le jeu modifié : c'est lui que l'éditeur montre et
// règle, même quand c'est l'imprimé qui se joue.
function htmlTuile(t) {
  return surLeModifie(() => htmlTuileBrut(t));
}

function htmlTuileBrut(t) {
  const retouche = plansTuile(t).some((h) => retoucheDe(h.cle));
  const hors = t.genre === 'CARTE' && estDesactivee(t.id);
  const visuel = t.genre === 'PLAN'
    ? `<div class="carte solo small">${renderPlan(t.plan)}</div>`
    : (t.type === 'DOUBLE' ? renderCarte(t.carte, mat.filtres.face === 'V', { small: true })
      : `<div class="carte solo small">${renderPlan(t.plans[0])}</div>`);
  const etats = [retouche ? '<b class="et-mod">retouché</b>' : '', hors ? '<b class="et-hors">écartée</b>' : '']
    .filter(Boolean).join(' · ');
  return `${visuel}<div class="lg">${t.libelle}${etats ? ` · ${etats}` : ''}</div>`;
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
      <p class="aide">Choisis une carte ou un plan dans la galerie pour régler son <b>minutage</b>,
      ses <b>icônes</b> et son <b>pouvoir</b>. Sélectionnes-en plusieurs pour les régler d’un coup.</p>
      <p class="aide">L’éditeur écrit toujours dans le jeu <b>Modifié</b>, même quand c’est l’imprimé
      qui se joue — passer de l’un à l’autre ne détruit rien.</p>`;
  }

  const carteSeule = mat.cartes.size === 1 ? cartesDe(mat.vue === 'GP' || mat.vue === 'PM' ? 'CARTES' : mat.vue)
    .find((c) => c.id === [...mat.cartes][0]) : null;

  // Une carte seule s'édite plan par plan — ses deux faces sous les yeux et
  // ses quatre plans les uns sous les autres. C'est seulement à partir de deux
  // cartes, ou d'une poignée de moitiés, qu'on passe au réglage en lot.
  const parPlan = plans.length === 1
    || (carteSeule && carteSeule.plans.length === plans.length
        && carteSeule.plans.every((h) => mat.plans.has(h.cle)));

  const titre = plans.length === 1 ? plans[0].quoi
    : carteSeule ? carteSeule.libelle
    : `${plans.length} plans sélectionnés`;

  return `<h2>${titre}</h2>
    ${mat.cartes.size ? blocBoite() : blocSupprimerScenes(plans)}
    ${carteSeule ? apercuCarte(carteSeule) : ''}
    ${parPlan ? plansOrdonnes(plans, carteSeule).map(blocPlan).join('') : blocLot(plans)}
    ${carteSeule && carteSeule.type === 'DOUBLE' ? appariement(carteSeule.carte) : ''}`;
}

/** Les plans d'une carte se lisent dans l'ordre de ses faces : recto, verso. */
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
      <button class="pill mini danger" data-supprimer="${normaliserSuppression(ids).join(' ')}"
        title="Retirer ces cartes du matériel — pas seulement de la boîte">🗑 Supprimer du matériel</button>
    </div>
  </div>`;
}

function apercuCarte(c) {
  if (c.type !== 'DOUBLE') {
    return `<div class="editeur-faces"><div>${htmlTuile({ genre: 'CARTE', ...c, cle: c.id }).split('<div class="lg">')[0]}</div></div>`;
  }
  return `<div class="editeur-faces">
    <div><div class="f-lg">Recto</div>${renderCarte(c.carte, false, { small: true })}</div>
    <div><div class="f-lg">Verso</div>${renderCarte(c.carte, true, { small: true })}</div>
  </div>`;
}

/**
 * Le formulaire d'un plan : minutage, icônes, pouvoir. Chaque valeur qui
 * s'écarte de l'imprimé le dit — les deux versions restent lisibles côte à
 * côte, sans avoir à basculer le jeu lancé.
 */
function blocPlan(h) {
  const r = retoucheDe(h.cle);
  const imp = h.imprime;
  const memeEl = h.el.length === imp.el.length && h.el.every((x, k) => x === imp.el[k]) && h.mort === imp.mort;

  const enDouble = doublonsNumeros().some((d) => d.num === h.num);

  return `<div class="bloc-plan ${r ? 'retouche' : ''}" data-plan="${h.cle}">
    <div class="bp-tete">
      <b>${h.quoi}</b>
      <button class="pill mini" data-plan-reset="${h.cle}" ${r ? '' : 'disabled'}>↺ imprimé</button>
    </div>

    <label class="champ-ligne">
      <span>Numéro</span>
      <input type="number" min="1" max="999" step="1" value="${h.num}" data-champ-num="${h.cle}"
        class="${enDouble ? 'en-double' : ''}">
      ${h.num !== imp.num ? `<span class="imp-rappel">imprimé ${imp.num}</span>` : ''}
      ${enDouble ? '<span class="alerte-mini">déjà pris</span>' : ''}
    </label>

    <label class="champ-ligne">
      <span>Minutage</span>
      <input type="number" min="0" max="99" step="1" value="${h.tc}" data-champ-tc="${h.cle}">
      <span class="tc-apercu">${tc(h.tc)}</span>
      ${h.tc !== imp.tc ? `<span class="imp-rappel">imprimé ${tc(imp.tc)}</span>` : ''}
    </label>

    ${ligneIllustration([h])}

    <div class="champ-bloc">
      <span class="ch-lg">Icônes</span>
      ${choixIcones([h], `data-plan-icone="${h.cle}"`, `data-plan-mort="${h.cle}"`)}
      <div class="rangee-mini" style="margin-top:8px">
        <button class="pill mini" data-vider="el" data-cles="${h.cle}"
          ${h.el.length || h.mort ? '' : 'disabled'}>Enlever toutes les icônes</button>
      </div>
      ${memeEl ? '' : `<div class="imp-rappel ligne">imprimé :
        ${imp.el.map((e) => elIcon(e, 20)).join('') || 'aucune icône'}${imp.mort ? elIcon('MORT', 20) : ''}</div>`}
    </div>

    ${blocPouvoir(h.obj, h.cle)}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="1" data-cles="${h.cle}" ${h.obj ? '' : 'disabled'}>Enlever le pouvoir</button>
      ${h.obj && !h.obj2 ? `<button class="pill mini" data-second="${h.cle}">+ second pouvoir</button>` : ''}
    </div>
    ${memeObjectif(h.obj, imp.obj) ? '' : `<div class="imp-rappel ligne">imprimé :
      ${imp.obj ? `${objHTML(imp.obj, 20, store.cfg)} ${objLabel(imp.obj, store.cfg)}` : 'bandeau vide'}</div>`}

    ${h.obj2 ? `${blocPouvoir(h.obj2, h.cle, 2)}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-rang="2" data-cles="${h.cle}">Enlever le second pouvoir</button>
    </div>
    ${memeObjectif(h.obj2, imp.obj2) ? '' : `<div class="imp-rappel ligne">imprimé :
      ${imp.obj2 ? `${objHTML(imp.obj2, 20, store.cfg)} ${objLabel(imp.obj2, store.cfg)}` : 'pas de second bandeau'}</div>`}` : ''}
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
      <button class="pill mini" data-lot-reset="1" ${nRetouches ? '' : 'disabled'}>↺ imprimé (${nRetouches})</button>
    </div>
    <p class="aide">Tout ce qui est réglé ici part aussitôt sur les ${plans.length} plans.</p>

    <label class="champ-ligne">
      <span>Minutage</span>
      <input type="number" min="0" max="99" step="1" value="${tcCommun}" data-lot-tc="1" placeholder="—">
      ${tcCommun === '' ? '<span class="aide">minutages différents</span>' : `<span class="tc-apercu">${tc(tcCommun)}</span>`}
    </label>

    ${ligneIllustration(plans)}

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
        title="Retirer de la sélection">${p.num}${p.face || ''} ✕</span>`).join('')}
    </div>
  </div>`;
}

/**
 * Les pouvoirs d'une sélection quand ils **diffèrent** : la valeur et la
 * portée se règlent quand même, d'un coup — ce sont des pièces que tous les
 * bandeaux partagent, chaque plan gardant son propre effet. Régler dix cartes
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
  const figes = objs.filter((o) => o.kind === 'CHRONO' || KINDS_SEQUENCE.includes(o.kind)).length;
  return `<div class="champ-bloc">
    <span class="ch-lg">${rang === 2 ? 'Second pouvoir' : 'Pouvoir'} — ${objs.length} bandeaux différents</span>
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
        ${x.gauche ? '◀' : ''} ${x.court} ${x.droite ? '▶' : ''}</button>`).join('')}
    </div>
    ${figes ? `<div class="aide portee-fixe">${figes} bandeau${figes > 1 ? 'x' : ''} de séquence ou
      « dans l'ordre » garderont leur portée : elle ne se règle pas.</div>` : ''}
  </div>`;
}

/**
 * Le pouvoir commun à une sélection, ou rien si les plans divergent. `rang`
 * dit lequel des deux emplacements du bandeau on regarde.
 */
function objCommunDe(plans, rang = 1) {
  const champ = rang === 2 ? 'obj2' : 'obj';
  const v = JSON.stringify(plans[0][champ] || null);
  return plans.every((p) => JSON.stringify(p[champ] || null) === v) ? plans[0][champ] : null;
}

/**
 * Les pastilles d'un plan ou d'une sélection. Une carte peut porter deux fois
 * la même icône — deux armes, deux voitures : le bouton compte, il ne coche
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

// --- L'illustration d'un plan ----------------------------------------------
// Rien n'oblige un plan à garder le visuel que son numéro désigne : l'image est
// une retouche comme le minutage ou le bandeau. C'est ce qui permet d'habiller
// une carte qu'on vient de créer, ou d'échanger deux illustrations.
//
// Un site statique ne sait pas lister un dossier : l'inventaire des visuels est
// écrit à la publication dans assets/images.json — déposer un fichier dans
// assets/ suffit donc à le rendre choisissable.

let inventaireImages = null;

async function chargerImages() {
  if (inventaireImages) return inventaireImages;
  try {
    const r = await fetch(`assets/images.json?v=${VERSION}`, { cache: 'no-cache' });
    inventaireImages = r.ok ? await r.json() : {};
  } catch { inventaireImages = {}; }
  return inventaireImages;
}

const DOSSIERS_IMAGES = [['pl', 'Plans Larges et Plans de départ'], ['pm', 'Plans Moyens'], ['gp', 'Gros Plans']];

/** « gp/317.webp » — de quoi nommer une image sans écrire tout son chemin. */
const nomImage = (url) => String(url || '').replace(/^assets\//, '').replace(/\.webp$/i, '');

/**
 * La ligne « Illustration » du formulaire : la vignette du visuel actuel, qui
 * s'ouvre d'un clic sur le choix de tous les autres. Sur un lot dont les plans
 * ne portent pas la même image, la vignette reste vide — on peut quand même en
 * poser une sur tous d'un coup.
 */
function ligneIllustration(plans) {
  const cles = plans.map((p) => p.cle).join(' ');
  const une = plans.every((p) => p.image === plans[0].image) ? plans[0].image : null;
  const retouchees = plans.filter((p) => p.imprime && p.image !== p.imprime.image).length;
  return `<div class="champ-ligne">
    <span>Illustration</span>
    <button class="vignette-illus ${une ? '' : 'melangee'}" data-image="${cles}"
      title="Choisir une autre illustration"
      style="${une ? `background-image:url('${une}')` : ''}">${une ? '' : '≠'}</button>
    ${retouchees ? `<span class="imp-rappel">${plans.length > 1
      ? `${retouchees} remplacée${retouchees > 1 ? 's' : ''}`
      : `imprimée ${nomImage(plans[0].imprime.image)}`}</span>` : ''}
    ${retouchees ? `<button class="pill mini" data-image-reset="${cles}">↺ imprimée</button>` : ''}
  </div>`;
}

/**
 * Pose une illustration sur des plans. Choisir exactement celle que le plan
 * porte à l'impression efface la retouche plutôt que de la réécrire : un plan
 * remis sur son visuel d'origine redevient « imprimé ».
 */
function poserImage(cles, url) {
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      retoucher(c, 'image', !url || (p && p.imprime.image === url) ? undefined : url);
    }
  });
}

/** Le choix d'une illustration : toutes celles de la boîte, en vignettes. */
async function ouvrirChoixImage(cles) {
  const inv = await chargerImages();
  const actuelles = new Set(surLeModifie(() => cles.map((c) => (planDeCle(c) || {}).image).filter(Boolean)));
  const total = Object.values(inv).reduce((s, l) => s + l.length, 0);
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML = `<div class="modale modale-images">
    <h2>Illustration${cles.length > 1 ? ` — ${cles.length} plans` : ''}</h2>
    <p class="aide">Les ${total} visuels de la boîte. Un clic pose l’image
      ${cles.length > 1 ? 'sur toute la sélection' : 'sur ce plan'} ; rien n’empêche deux plans de
      partager la même. Le numéro imprimé, lui, ne bouge pas — c’est l’identité du plan.</p>
    ${DOSSIERS_IMAGES.map(([d, titre]) => (inv[d] && inv[d].length ? `<h3>${titre}</h3>
      <div class="grille-illus">
        ${inv[d].map((f) => {
    const url = `assets/${d}/${f}`;
    return `<button class="tuile-illus ${actuelles.has(url) ? 'on' : ''}" data-choix-image="${url}"
            style="background-image:url('${url}')"><span>${f.replace(/\.webp$/i, '')}</span></button>`;
  }).join('')}
      </div>` : '')).join('')}
    ${total ? '' : `<p class="encart attention">Aucune illustration trouvée. Le fichier
      <code>assets/images.json</code> se réécrit à chaque publication ;
      lance <code>node outils/versionner.mjs</code> après avoir ajouté des visuels.</p>`}
    <div class="rangee-mini" style="margin-top:16px">
      <button class="pill" data-choix-image="">Aucune illustration</button>
      <button class="pill" data-fermer-modale="1">Fermer</button>
    </div>
  </div>`;

  const fermer = () => { fond.remove(); document.removeEventListener('keydown', touche); };
  const touche = (e) => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', touche);
  fond.addEventListener('click', (e) => {
    if (e.target === fond || e.target.closest('[data-fermer-modale]')) { fermer(); return; }
    const b = e.target.closest('[data-choix-image]');
    if (!b) return;
    poserImage(cles, b.dataset.choixImage);
    sauverCfg();
    fermer();
    vueMateriel();
  });
  document.body.appendChild(fond);
}

/** Ajoute ou retire une icône, en gardant l'ordre canonique des éléments. */
function ajusterIcones(liste, e, delta) {
  const compte = Object.fromEntries(ELEMENT_IDS.map((x) => [x, liste.filter((y) => y === x).length]));
  compte[e] = Math.max(0, Math.min(MAX_ICONES, compte[e] + delta));
  return ELEMENT_IDS.flatMap((x) => Array.from({ length: compte[x] }, () => x));
}

/** X points × <ce qu'on compte>. `ou` vaut la clé du plan, ou « lot ». */
function blocPouvoir(o, ou, rang = 1) {
  const kind = o ? o.kind : '';
  const R = ` data-rang="${rang}"`;
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const elOpts = (choisi) => ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, choisi === e)).join('');

  let complement = '';
  if (kind === 'FORMAT') {
    // Un bandeau de cadrage peut en viser deux : le second est facultatif, et
    // un plan compte dès qu'il porte l'un ou l'autre.
    complement = `<select data-champ-obj="${ou}"${R} data-part="format">
        ${CADRAGES_POUVOIR.map((f) => opt(f, FORMATS[f].label, o.format === f)).join('')}</select>
      <span class="plus">&amp;</span>
      <select data-champ-obj="${ou}"${R} data-part="format2">
        ${opt('', '— aucun', !o.format2)}
        ${CADRAGES_POUVOIR.filter((f) => f !== o.format)
          .map((f) => opt(f, FORMATS[f].label, o.format2 === f)).join('')}</select>`;
  } else if (kind === 'ELEMENT' || kind === 'ABSENT') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="el">${elOpts(o.el)}</select>`;
  } else if (kind === 'PAIRE') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="el0">${elOpts(o.els[0])}</select>
      <span class="plus">+</span>
      <select data-champ-obj="${ou}"${R} data-part="el1">${elOpts(o.els[1])}</select>`;
  } else if (kind === 'SANS_TC') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('EGAL', 'à', o.sens !== 'AVANT' && o.sens !== 'APRES')}
        ${opt('AVANT', 'avant', o.sens === 'AVANT')}${opt('APRES', 'après', o.sens === 'APRES')}
      </select>
      <input type="number" class="pts" min="0" max="99" value="${o.seuil}" data-champ-obj="${ou}"${R} data-part="seuil">
      <span class="tc-apercu">${tc(o.seuil)}</span>`;
  } else if (kind === 'MINUTAGE') {
    complement = `<select data-champ-obj="${ou}"${R} data-part="sens">
        ${opt('AVANT', 'avant', o.sens !== 'APRES')}${opt('APRES', 'après', o.sens === 'APRES')}
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
        ${ciblesSequence().map((c) => opt(c.id, c.label, o.cible === c.id)).join('')}</select>`;
  }

  return `<div class="champ-bloc">
    <span class="ch-lg">${rang === 2 ? 'Second pouvoir' : 'Pouvoir'}</span>
    <div class="editeur-obj">
      <input type="number" class="pts" min="-20" max="20" value="${o ? o.n : 1}"
        data-champ-obj="${ou}"${R} data-part="n" ${o ? '' : 'disabled'}>
      <span class="x">${estSi(o) ? 'si' : '×'}</span>
      <select data-champ-obj="${ou}"${R} data-part="kind">${KINDS.map(([k, l]) => opt(k, l, kind === k)).join('')}</select>
      ${complement}
    </div>
    ${o && o.kind !== 'CHRONO' && !KINDS_SEQUENCE.includes(o.kind) ? `<div class="portee-choix">
      ${PORTEES.map((x) => `<button class="pp ${objPortee(o, store.cfg) === x.id ? 'on' : ''}"
        data-champ-portee="${ou}"${R} data-portee="${x.id}" title="${x.label}">
        ${x.gauche ? '◀' : ''} ${x.court} ${x.droite ? '▶' : ''}</button>`).join('')}
    </div>` : (o ? `<div class="aide portee-fixe">${KINDS_SEQUENCE.includes(o.kind)
      ? 'Un bandeau de séquence lit la forme du banc entier : sa portée ne se règle pas.'
      : '« Dans l’ordre » se lit toujours sur le montage entier.'}</div>` : '')}
    <div class="apercu-obj">${o ? `${objHTML(o, 26, store.cfg)}<span class="lit">${objLabel(o, store.cfg)}</span>`
      : '<span class="aide">Bandeau vide</span>'}</div>
  </div>`;
}

/** L'appariement des deux moitiés d'une carte double. */
function appariement(carte) {
  const liste = (format, choisi) => moitiesDisponibles(format).map((m) => `
    <option value="${m.num}" ${m.num === choisi ? 'selected' : ''}>
      ${m.affiche}${m.affiche === m.num ? '' : ` (imprimé ${m.num})`} — ${m.titre || m.famille.toLowerCase()}
    </option>`).join('');

  return `<div class="bloc-plan appariement ${carte.appariementModifie ? 'retouche' : ''}">
    <div class="bp-tete">
      <b>Appariement des moitiés</b>
      <button class="pill mini" data-paire-reset="${carte.rang}" ${carte.appariementModifie ? '' : 'disabled'}>↺ imprimé</button>
    </div>
    <label class="champ-ligne"><span>Gros Plan</span>
      <select data-paire="${carte.rang}" data-part="gp">${liste('GP', carte.gpNum)}</select></label>
    <label class="champ-ligne"><span>Plan Moyen</span>
      <select data-paire="${carte.rang}" data-part="pm">${liste('PM', carte.pmNum)}</select></label>
    <p class="aide">Une carte est <b>une feuille</b> : ses deux moitiés valent pour ses deux faces.
    Changer le Plan Moyen ou le Gros Plan ici change donc le <b>recto et le verso</b> à la fois —
    chaque face garde en revanche son propre minutage, ses icônes et son pouvoir. La répartition
    imprimée est conservée tant qu’on n’y touche pas.</p>
  </div>`;
}

// --- Le tableau complet -----------------------------------------------------

function tableauMateriel() {
  const cat = surLeModifie(catalogue);
  return `<p class="aide" style="margin-top:14px">L’état courant du jeu <b>Modifié</b>, retouches
  comprises. Le bouton <b>Exporter le tableau en PDF</b> en donne la version imprimable.</p>
  <div class="tbl-defile">${tableauPlans(cat)}</div>
  <h3 style="margin-top:22px">Les 50 cartes Plan Moyen / Gros Plan</h3>
  <div class="tbl-defile">${tableauPaires()}</div>`;
}

// L'en-tête est dans un <thead> : c'est la seule façon qu'il se répète en
// haut de chaque page à l'impression.

function tableauPlans(cat) {
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>N°</th><th>Face</th><th>Plan</th><th>Famille</th><th class="num">Minutage</th>
      <th>Icônes</th><th>Pouvoir</th><th>État</th></tr></thead>
    <tbody>${cat.map((p) => `<tr class="${p.modifie ? 'ligne-retouchee' : ''}">
      <td class="num">${p.num}${p.num !== p.numOrigine ? ` <span class="aide">(imprimé ${p.numOrigine})</span>` : ''}</td>
      <td>${p.face ? (p.face === 'R' ? 'recto' : 'verso') : '—'}</td>
      <td>${FORMATS[p.format].label}${p.titre ? ` <span class="aide">${p.titre}</span>` : ''}</td>
      <td>${p.famille}</td>
      <td class="num">${tc(p.tc)}</td>
      <td>${p.el.map((e) => elIcon(e, 20)).join('') || '—'}${p.mort ? elIcon('MORT', 20) : ''}</td>
      <td>${objsDe(p).length ? objsDe(p).map((o) => `${objHTML(o, 20, store.cfg)}
        <span class="aide">${objLabel(o, store.cfg)}</span>`).join('<br>') : '—'}</td>
      <td>${p.modifie ? 'retouché' : 'imprimé'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function tableauPaires() {
  const cartes = surLeModifie(buildCartesDoubles);
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>Carte</th><th>Gros Plan</th><th>Plan Moyen</th><th>Boîte</th><th>Appariement</th></tr></thead>
    <tbody>${cartes.map((c, i) => `<tr class="${c.appariementModifie ? 'ligne-retouchee' : ''}">
      <td class="num">${i + 1}</td><td class="num">${c.gpNum}</td><td class="num">${c.pmNum}</td>
      <td>${estDesactivee(c.id) ? 'écartée' : 'activée'}</td>
      <td>${c.appariementModifie ? `réapparié (imprimé : GP ${c.gpImprime} | PM ${c.pmImprime})` : 'imprimé'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// --- Les statistiques -------------------------------------------------------
// On compte le matériel tel qu'il partira en partie : les cartes activées,
// leurs plans, face par face. Les deux jeux sont mis côte à côte, pour lire
// d'un coup d'œil ce que les retouches ont déplacé.

function plansDuPaquet() {
  const { doubles, larges, departs } = construirePaquet(store.cfg);
  const out = [];
  for (const c of doubles) for (const f of FACES) {
    const m = moitiesDe(c, f.id);
    out.push(m.GP, m.PM);
  }
  for (const c of larges) out.push(plHalf(c));
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
      cadrages: { PL: 0, PM: 0, GP: 0 },
      elements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])),
      // Ce que les bandeaux réclament, par icône : une autre grandeur que ce
      // que les cartes portent, et qu'on ne doit pas y mélanger.
      demandes: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])),
      demandeMort: 0, demandeNeant: 0,
      morts: 0, sansIcone: 0, sansPouvoir: 0,
      pouvoirs: Object.fromEntries(KINDS.filter(([k]) => k).map(([k]) => [k, 0])),
      tcMin: 99, tcMax: 0, tcSomme: 0,
      tranches: Object.fromEntries([0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((t) => [t, 0])),
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
      // creux, mais c'est bien elle que le bandeau désigne.
      for (const o of os) {
        if (o.kind === 'ELEMENT' || o.kind === 'ABSENT') { if (s.demandes[o.el] !== undefined) s.demandes[o.el]++; }
        else if (o.kind === 'PAIRE') for (const e of o.els) { if (s.demandes[e] !== undefined) s.demandes[e]++; }
        else if (o.kind === 'MORT') s.demandeMort++;
        else if (o.kind === 'NEANT') s.demandeNeant++;
      }
      s.tcMin = Math.min(s.tcMin, h.tc); s.tcMax = Math.max(s.tcMax, h.tc);
      s.tcSomme += h.tc;
      s.tranches[Math.min(90, Math.floor(h.tc / 10) * 10)]++;
    }
    s.tcMoyen = plans.length ? s.tcSomme / plans.length : 0;
    s.tous = tous.length;
    const { doubles, larges, departs } = construirePaquet(store.cfg);
    const vus = new Set(); departs.forEach((d) => d.faces.forEach((f) => vus.add(f.num)));
    s.cartes = doubles.length + larges.length + vus.size;
    s.doubles = doubles.length; s.larges = larges.length; s.departs = vus.size;
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
        ${['PL', 'PM', 'GP', 'DEP'].map((k) => opt(k, FORMATS[k].label, f.format === k)).join('')}</select></label>
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
      <thead><tr><th></th><th class="num">Origine</th><th class="num">Modifié</th><th class="num">Écart</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table>`;

  return `<p class="aide" style="margin-top:14px">Le matériel tel qu’il part en partie : les
  ${imp.cartes} cartes activées et leurs ${imp.tous} plans, recto et verso comptés séparément.
  ${off ? `<b>${off} carte${off > 1 ? 's' : ''}</b> ${off > 1 ? 'sont écartées' : 'est écartée'} de la boîte.` : ''}
  La colonne surlignée est le jeu qui se lance.</p>
  ${barreStats()}
  ${filtre ? `<p class="aide filtre-actif"><b>${imp.plans} plan${imp.plans > 1 ? 's' : ''} retenu${imp.plans > 1 ? 's' : ''}</b>
    sur ${imp.tous} par les filtres — tout ce qui suit ne compte qu’eux, sauf la composition de la boîte.</p>` : ''}

  ${tableau('La boîte', [
    ligne('Cartes Plan Moyen / Gros Plan', imp.doubles, mod.doubles),
    ligne('Cartes Plan Large', imp.larges, mod.larges),
    ligne('Faces de Plan de départ', imp.departs, mod.departs),
    ligne(filtre ? 'Plans retenus par les filtres' : 'Plans au total (faces comprises)', imp.plans, mod.plans),
  ].join(''))}

  ${tableau('Les cadrages', ['PL', 'PM', 'GP', 'DEP'].map((f) =>
    ligne(FORMATS[f].label, imp.cadrages[f], mod.cadrages[f], cadrageIcon(f))).join(''))}

  ${tableau('Les icônes sur les cartes', [
    ...ELEMENT_IDS.map((e) => ligne(ELEMENTS[e].label, imp.elements[e], mod.elements[e], elIcon(e, 20))),
    ligne('Plans de mort', imp.morts, mod.morts, elIcon('MORT', 20)),
    ligne('Plans sans aucune icône', imp.sansIcone, mod.sansIcone),
  ].join(''))}

  ${tableau('Les icônes réclamées par les bandeaux', [
    ...ELEMENT_IDS.map((e) => ligne(ELEMENTS[e].label, imp.demandes[e], mod.demandes[e], elIcon(e, 20))),
    ligne('Mort', imp.demandeMort, mod.demandeMort, elIcon('MORT', 20)),
    ligne('Plan sans personnage', imp.demandeNeant, mod.demandeNeant, elIcon('NEANT', 20)),
  ].join(''), 'Ce que les pouvoirs cherchent à compter — l’offre du tableau précédent, ici la demande. Un couple réclame ses deux icônes ; une absence réclame la sienne, en creux.')}

  ${tableau('Les pouvoirs', [
    ...KINDS.filter(([k]) => k).map(([k, l]) => ligne(l.replace('…', ''), imp.pouvoirs[k], mod.pouvoirs[k])),
    ligne('Plans sans pouvoir', imp.sansPouvoir, mod.sansPouvoir),
  ].join(''))}

  ${tableau('Les minutages', [
    ligne('Le plus court', imp.tcMin, mod.tcMin),
    ligne('Le plus long', imp.tcMax, mod.tcMax),
    ligne('Moyenne', imp.tcMoyen, mod.tcMoyen),
    ...Object.keys(imp.tranches).map((t) =>
      ligne(`de ${String(t).padStart(2, '0')}:00 à ${String(+t + 9).padStart(2, '0')}:00`, imp.tranches[t], mod.tranches[t])),
  ].join(''))}`;
}

// --- Les statistiques des pouvoirs ------------------------------------------
// Chaque bandeau du jeu, recensé tel qu'il est imprimé sur la carte : le même
// dessin qu'en partie, son compte, sa part, et ce qu'il vaut.

/** La signature d'un bandeau : son type et sa cible, sans sa valeur. */
function signatureObj(o) {
  if (!o) return '';
  const c = cibleObj(o);
  const seuil = o.seuil === undefined ? '' : `${o.sens || ''}${o.seuil}`;
  return [o.kind, c, seuil, objPortee(o, store.cfg)].filter(Boolean).join('|');
}

/**
 * Combien de plans du jeu **déclenchent** ce pouvoir. C'est la question qui
 * compte : un bandeau ne vaut pas sa valeur, il vaut sa valeur multipliée par
 * ce qu'il trouve à compter. « 3 × ⛨ » ne rapporte 3 points que s'il y a une
 * arme sur la table, et 30 s'il en trouve dix.
 *
 * Les bandeaux qui se lisent « n si … » — absence, ordre, minutage absent — ne
 * se déclenchent qu'une fois : leur compte est 1, quel que soit le matériel.
 */
function declencheurs(obj, plans) {
  if (!obj) return 0;
  switch (obj.kind) {
    case 'RACCORD': return plans.filter(estRaccord).length;
    case 'PLAN':    return plans.length;
    case 'FORMAT':  return plans.filter((p) => p.format === obj.format || p.format === obj.format2).length;
    case 'ELEMENT': return store.cfg.elementParIcone === false
      ? plans.filter((p) => p.el.includes(obj.el)).length
      : compteIcone(plans, obj.el);
    case 'PAIRE': {
      // Un couple s'apparie : quatre icônes font deux couples, cinq aussi.
      const [x, y] = obj.els;
      const nx = compteIcone(plans, x);
      return x === y ? Math.floor(nx / 2) : Math.min(nx, compteIcone(plans, y));
    }
    case 'MORT':    return plans.filter((p) => p.mort).length;
    case 'NEANT':   return plans.filter((p) => !p.el.some((e) => PERSONNAGES.includes(e))).length;
    case 'MINUTAGE': return plans.filter((p) => (obj.sens === 'APRES' ? p.tc > obj.seuil : p.tc < obj.seuil)).length;
    // Les « si » : le pouvoir se déclenche, ou pas — jamais plusieurs fois.
    case 'ABSENT': case 'CHRONO': case 'SANS_TC': return 1;
    // Les bandeaux de séquence ne se déclenchent pas sur une carte mais sur la
    // forme du banc : le matériel seul ne peut pas dire combien de fois. On les
    // compte donc une fois — leur plancher honnête.
    case 'SEQ_TAILLE': case 'SEQ_VOISINES': case 'SEQ_LONGUE': case 'SEQ_AVEC': return 1;
    default: return 0;
  }
}

/**
 * Le recensement des bandeaux d'un jeu de matériel : un par signature, avec
 * ses valeurs, ses cadrages, ce qui le déclenche et le potentiel de points
 * qu'il met sur la table.
 *
 * `brut` est la simple somme des valeurs imprimées — ce que le bandeau annonce.
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
      // `avec` compte les plans porteurs, pas les bandeaux : un plan qui en
      // porte deux reste un plan. Chaque bandeau, lui, alimente sa ligne.
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
    // Ce qu'un bandeau trouve à compter ne dépend que de sa forme, jamais de sa
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
  const nomActif = store.cfg.materielActif === 'MODIFIE' ? 'Modifié' : 'Origine';
  const nomAutre = store.cfg.materielActif === 'MODIFIE' ? 'Origine' : 'Modifié';
  const parCle = new Map(autre.liste.map((e) => [signatureObj(e.obj), e]));

  // Par famille de pouvoir, tous bandeaux confondus.
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
  // sur un bandeau que rien ne déclenche ne rapporte rien. Le total d'une
  // valeur additionne donc, bandeau par bandeau, ce qu'elle peut vraiment
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
    const cadrages = ['PL', 'PM', 'GP', 'DEP'].filter((f) => e.cadrages[f])
      .map((f) => `<span class="cadr-compte">${cadrageIcon(f)}${e.cadrages[f]}</span>`).join('');
    // Le bandeau se lit en deux temps : ce qu'il vaut, et ce qu'il compte. Le
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

  return `<p class="aide" style="margin-top:14px">Tous les bandeaux du jeu <b>${nomActif}</b> —
  celui qui part en partie —, un par forme distincte, dessinés comme sur la carte. Un bandeau ne
  vaut pas sa valeur : il vaut sa valeur <b>multipliée par ce qu’il trouve à compter</b>. La colonne
  <b>déclencheurs</b> dit combien de plans du matériel le font marquer, et <b>total</b> ce qu’il
  peut rapporter en tout. La colonne <b>écart</b> compare au jeu ${nomAutre}. Chaque en-tête range
  le tableau.</p>
  ${barreStats()}
  ${filtre ? `<p class="aide filtre-actif">Les filtres ne retiennent que <b>${actif.plans} plans</b>
    — tout ce qui suit ne compte qu’eux.</p>` : ''}

  <div class="pv-cartouches">
    <div class="pv-cartouche"><b>${actif.avec}</b><span>plans portent un bandeau</span></div>
    <div class="pv-cartouche"><b>${actif.sans}</b><span>plans sans bandeau</span></div>
    <div class="pv-cartouche"><b>${actif.liste.length}</b><span>formes distinctes</span></div>
    <div class="pv-cartouche"><b>${actif.points}</b><span>points en potentiel</span></div>
    <div class="pv-cartouche"><b>${actif.avec ? (actif.points / actif.avec).toFixed(1) : '0'}</b><span>points par bandeau</span></div>
  </div>

  <h3>Chaque bandeau</h3>
  <div class="tbl-defile">
    <table class="tbl tbl-pouvoirs">
      <thead><tr>
        ${th('points', 'Points')}${th('effet', 'Effet', 'texte')}<th>Ce qu’il compte</th>
        ${th('plans', 'Plans', 'num')}${th('part', 'Part')}${th('valeurs', 'Valeurs')}
        ${th('cadrages', 'Cadrages')}${th('decl', 'Déclencheurs', 'num')}
        ${th('total', 'Total', 'num')}${th('ecart', 'Écart', 'num')}
      </tr></thead>
      <tbody>${parBandeau.map(ligne).join('')
        || '<tr><td colspan="10" class="aide">Aucun bandeau ne passe les filtres.</td></tr>'}</tbody>
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
    <thead><tr>${thV('valeur', 'Valeur')}${thV('bandeaux', 'Bandeaux', 'num')}${thV('part', 'Part')}
      ${thV('total', 'Total', 'num')}</tr></thead>
    <tbody>${parValeur.map((c) => `<tr>
      <td>${numIcon(c.v, 24)}</td><td class="num"><b>${c.n}</b></td>
      <td>${barrePart(actif.avec ? c.n / actif.avec : 0)}<span class="pv-part">${(100 * c.n / (actif.avec || 1)).toFixed(1)} %</span></td>
      <td class="num">${c.points}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// --- Les branchements -------------------------------------------------------

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

  // La sélection survit au changement de vue : on peut régler d'un coup des
  // Gros Plans et des Plans Moyens pris dans deux galeries différentes.
  app.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => {
    mat.vue = b.dataset.vue; refaire();
  }));

  app.querySelectorAll('[data-jeu]').forEach((b) => b.addEventListener('click', () => {
    store.cfg.materielActif = b.dataset.jeu; sauverCfg(); refaire();
  }));

  brancherBasculeIllus(refaire);

  app.querySelectorAll('[data-filtre]').forEach((el) => el.addEventListener('change', () => {
    if (el.dataset.filtre === 'tri') mat.tri = el.value;
    else mat.filtres[el.dataset.filtre] = el.value;
    refaire();
  }));

  const raz = app.querySelector('#filtres-raz');
  if (raz) raz.addEventListener('click', () => {
    mat.filtres = { face: '', icone: '', pouvoir: '', tcMin: '', tcMax: '', etat: '', actif: '', famille: '' };
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
    refaire();
  }));

  // Créer une carte : elle apparaît dans la galerie, et l'éditeur s'ouvre
  // dessus — on vient de la faire, c'est là qu'on veut être.
  app.querySelectorAll('[data-creer]').forEach((b) => b.addEventListener('click', () => {
    const fait = creerCarte(b.dataset.creer);
    if (!fait) { alert('Il faut au moins une moitié Plan Moyen et une moitié Gros Plan pour apparier une carte.'); return; }
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null;
    if (fait.carte) {
      // Le nouvel appariement est le dernier de la liste.
      const cartes = surLeModifie(buildCartesDoubles);
      const c = cartes[cartes.length - 1];
      if (c) ajouterTuile(cartesDe('CARTES').find((x) => x.id === c.id));
    } else {
      fait.cles.forEach((c) => mat.plans.add(c));
      (fait.cartes || []).forEach((c) => mat.cartes.add(c));
    }
    refaire();
  }));

  const restaurer = app.querySelector('#compo-restaurer');
  if (restaurer) restaurer.addEventListener('click', () => { restaurerTout(); refaire(); });

  const tout = app.querySelector('#sel-tout');
  if (tout) tout.addEventListener('click', () => { tuiles.forEach(ajouterTuile); refaire(); });
  const rien = app.querySelector('#sel-rien');
  if (rien) rien.addEventListener('click', () => {
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null; refaire();
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
  const cp = app.querySelector('#cartes-pdf');
  if (cp) cp.addEventListener('click', () => exporterCartesPDF(cp));
  const pp = app.querySelector('#planches-pdf');
  if (pp) pp.addEventListener('click', () => exporterPlanchesPDF(pp));
  const ps = app.querySelector('#planche-sens');
  if (ps) ps.addEventListener('change', () => LS.set('planche.retournement', ps.value));
  const cx = app.querySelector('#csv-export');
  if (cx) cx.addEventListener('click', exporterCSV);
  const ci = app.querySelector('#csv-import');
  if (ci) ci.addEventListener('click', () => importerCSV(refaire));

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

/** Redessine les vignettes sélectionnées, sans refaire toute la galerie. */
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
    const quoi = ids.length > 1 ? `ces ${ids.length} cartes` : 'cette carte';
    const suite = avec.length
      ? `\n\n${avec.length} carte${avec.length > 1 ? 's' : ''} Plan Moyen / Gros Plan s’en `
        + `${avec.length > 1 ? 'servent' : 'sert'} et partira${avec.length > 1 ? 'ont' : ''} avec.`
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

  // L'illustration se change en cliquant dessus — sur la vignette du
  // formulaire comme sur l'aperçu de la carte, qui est l'endroit où le regard
  // se pose. Un plan sans clé — un aperçu de pose — n'ouvre rien.
  app.querySelectorAll('[data-image]').forEach((el) => el.addEventListener('click', (ev) => {
    ev.preventDefault();
    ouvrirChoixImage(el.dataset.image.split(' ').filter(Boolean));
  }));
  app.querySelectorAll('[data-image-reset]').forEach((el) => el.addEventListener('click', () => {
    poserImage(el.dataset.imageReset.split(' ').filter(Boolean), null);
    sauverCfg(); vueMateriel();
  }));
  app.querySelectorAll('.editeur-faces .illus[data-illus]').forEach((el) => {
    el.classList.add('illus-cliquable');
    el.title = 'Choisir une autre illustration';
    el.addEventListener('click', () => ouvrirChoixImage([el.dataset.illus]));
  });

  // Renuméroter ne touche qu'un plan : appliquer le même numéro à toute une
  // sélection ne ferait que des doublons.
  app.querySelectorAll('[data-champ-num]').forEach((el) => el.addEventListener('change', () => {
    const cle = el.dataset.champNum;
    const v = Math.max(1, Math.min(999, parseInt(el.value, 10) || 0));
    surLeModifie(() => {
      const p = planDeCle(cle);
      retoucher(cle, 'num', p && p.imprime.num === v ? undefined : v);
    });
    sauverCfg();
    // Un doublon change le bandeau d'alerte : on repeint tout l'écran.
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

  app.querySelectorAll('[data-plan-mort]').forEach((el) => el.addEventListener('click', () => {
    const cle = el.dataset.planMort;
    const p = surLeModifie(() => planDeCle(cle));
    poserMort([cle], !(p && p.mort)); sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-plan-reset]').forEach((el) => el.addEventListener('click', () => {
    delete store.cfg.materiel.plans[el.dataset.planReset]; sauverCfg(); refaire();
  }));

  // Vider les icônes ou le pouvoir : la valeur devient « rien », ce qui n'est
  // pas la même chose que revenir à l'imprimé.
  app.querySelectorAll('[data-vider]').forEach((el) => el.addEventListener('click', () => {
    const cles = el.dataset.cles.split(' ').filter(Boolean);
    if (el.dataset.vider === 'el') { poserIcones(cles, []); poserMort(cles, false); }
    else poserObj(cles, null, +(el.dataset.rang || 1));
    sauverCfg(); refaire();
  }));

  // Ouvrir le second emplacement du bandeau : on y pose un pouvoir par défaut,
  // que l'on règle ensuite comme le premier.
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
    const c = surLeModifie(buildCartesDoubles)[+rang];
    const pm = el.dataset.part === 'pm' ? +el.value : c.pmNum;
    const gp = el.dataset.part === 'gp' ? +el.value : c.gpNum;
    if (pm === c.pmImprime && gp === c.gpImprime) delete store.cfg.materiel.paires[rang];
    else store.cfg.materiel.paires[rang] = [pm, gp];
    sauverCfg(); vueMateriel();
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
// Une valeur identique à l'imprimé n'est pas une retouche : on l'efface de la
// couche, pour que le compteur de retouches dise la vérité.

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
  // Les doublons comptent : on trie sans dédoublonner.
  const ordre = ELEMENT_IDS.flatMap((e) => liste.filter((x) => x === e));
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
  const neuf = {
    FORMAT:  () => OBJ.format(n, actuel && actuel.format ? actuel.format : 'PM',
      undefined, actuel && actuel.format2),
    ELEMENT: () => OBJ.element(n, e0),
    ABSENT:  () => OBJ.absent(n, e0),
    PAIRE:   () => OBJ.paire(n, e0, actuel && actuel.els ? actuel.els[1] : e0),
    MORT:    () => OBJ.mort(n),
    NEANT:   () => OBJ.neant(n),
    RACCORD: () => OBJ.raccord(n),
    PLAN:    () => OBJ.plan(n),
    MINUTAGE: () => OBJ.minutage(n, actuel && actuel.sens ? actuel.sens : 'AVANT',
      actuel && actuel.seuil !== undefined ? actuel.seuil : 25),
    CHRONO:  () => OBJ.chrono(n),
    SANS_TC: () => OBJ.sansTc(n, actuel && actuel.sens ? actuel.sens : 'EGAL',
      actuel && actuel.seuil !== undefined ? actuel.seuil : 0),
    SEQ_TAILLE:   () => OBJ.seqTaille(n, actuel && actuel.seuil ? Math.max(1, actuel.seuil) : 3,
      actuel && actuel.sens === 'MAX' ? 'MAX' : undefined),
    SEQ_VOISINES: () => OBJ.seqVoisines(n, actuel && actuel.sens === 'APRES' ? 'APRES' : 'AVANT'),
    SEQ_LONGUE:   () => OBJ.seqLongue(n),
    SEQ_AVEC:     () => OBJ.seqAvec(n, actuel && actuel.sens === 'SANS' ? 'SANS' : 'AVEC',
      actuel && actuel.cible ? actuel.cible : e0, actuel && actuel.seuil),
  }[kind]();
  // Changer de type ne déplace pas le bandeau : il garde sa portée.
  if (actuel && PORTEE_IDS.includes(actuel.portee)) neuf.portee = actuel.portee;
  return neuf;
}

/**
 * Recompose le bandeau à partir de la pièce que l'on vient de changer. Sur
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
          // « dans l'ordre » et les bandeaux de séquence n'ont pas de portée
          // à régler : ils lisent toujours le banc entier.
          if (o.kind === 'CHRONO' || KINDS_SEQUENCE.includes(o.kind)) continue;
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
  else if (part === 'el0') o.els = [valeur, o.els[1]];
  else if (part === 'el1') o.els = [o.els[0], valeur];
  else if (part === 'sens') o.sens = valeur;
  else if (part === 'cible') o.cible = valeur;
  // Une séquence d'« au moins zéro plan » ne veut rien dire : le seuil des
  // bandeaux de séquence part de 1, celui des minutages part de 00:00.
  else if (part === 'seuil') {
    const plancher = o.kind === 'SEQ_TAILLE' || o.kind === 'SEQ_AVEC' ? 1 : 0;
    o.seuil = Math.max(plancher, Math.min(99, parseInt(valeur, 10) || 0));
    // Un « avec / sans » à un seul plan est le cas ordinaire : on n'écrit pas
    // son seuil, pour qu'il reste identique à ce qui est imprimé.
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
// avec l'imprimé est retenue, si bien qu'un aller-retour ne crée aucune
// retouche fantôme.

// Un plan peut porter deux pouvoirs : le second a ses propres colonnes,
// suffixées en 2. Une colonne vide vaut « pas de second pouvoir ».
const CSV_COLS = ['objet', 'cle', 'numero', 'minutage', 'icones', 'mort',
  'pouvoir', 'points', 'cible', 'portee', 'sens', 'seuil',
  'pouvoir2', 'points2', 'cible2', 'portee2', 'sens2', 'seuil2',
  'illustration', 'gros_plan', 'plan_moyen', 'boite'];

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
  // Un bandeau de séquence vise une icône, un cadrage ou un Raccord : tout
  // tient dans la même colonne que les autres cibles.
  if (o.cible) return o.cible;
  if (o.format) return o.format;
  return o.el || '';
}

function exporterCSV() {
  const lignes = [CSV_COLS.join(';')];
  surLeModifie(() => {
    // Les six colonnes d'un pouvoir, vides s'il n'y en a pas.
    const colsObj = (o) => [
      o ? o.kind : '', o ? o.n : '', cibleObj(o), o ? objPortee(o, store.cfg) : '',
      o && o.sens ? o.sens : '', o && o.seuil !== undefined ? o.seuil : '',
    ];
    for (const p of catalogue()) {
      lignes.push([
        'plan', p.cle, p.num, p.tc, p.el.join('|'), p.mort ? 'oui' : 'non',
        ...colsObj(p.obj), ...colsObj(p.obj2), p.image, '', '', '',
      ].map(csvEchappe).join(';'));
    }
    for (const c of buildCartesDoubles()) {
      lignes.push(['carte', c.id, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        c.gpNum, c.pmNum, estDesactivee(c.id) ? 'non' : 'oui'].map(csvEchappe).join(';'));
    }
    for (const f of ['PL', 'DEPART']) {
      for (const c of cartesDe(f)) {
        lignes.push(['carte', c.id, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          '', '', estDesactivee(c.id) ? 'non' : 'oui'].map(csvEchappe).join(';'));
      }
    }
  });

  const d = new Date();
  const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Le BOM fait ouvrir le fichier en UTF-8 par les tableurs.
  const blob = new Blob([`\uFEFF${lignes.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `edit-materiel-${jour}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
    case 'NEANT':   return OBJ.neant(n, portee);
    case 'CHRONO':  return OBJ.chrono(n, portee);
    case 'SANS_TC': return OBJ.sansTc(n, ['AVANT', 'APRES'].includes(sens0) ? sens0 : 'EGAL', seuil, portee);
    case 'FORMAT': {
      const [f1, f2] = cible.split('+');
      return CADRAGES_POUVOIR.includes(f1)
        ? OBJ.format(n, f1, portee, CADRAGES_POUVOIR.includes(f2) ? f2 : undefined) : null;
    }
    case 'ELEMENT': return ELEMENT_IDS.includes(cible) ? OBJ.element(n, cible, portee) : null;
    case 'ABSENT':  return ELEMENT_IDS.includes(cible) ? OBJ.absent(n, cible, portee) : null;
    case 'MINUTAGE': return OBJ.minutage(n, sens, seuil, portee);
    case 'SEQ_TAILLE':   return OBJ.seqTaille(n, Math.max(1, seuil || 1), sens0 === 'MAX' ? 'MAX' : undefined);
    case 'SEQ_VOISINES': return OBJ.seqVoisines(n, sens0 === 'APRES' ? 'APRES' : 'AVANT');
    case 'SEQ_LONGUE':   return OBJ.seqLongue(n);
    case 'SEQ_AVEC': return ciblesSequence().some((c) => c.id === cible)
      ? OBJ.seqAvec(n, sens0 === 'SANS' ? 'SANS' : 'AVEC', cible, seuil) : null;
    case 'PAIRE': {
      const [a, b] = cible.split('+');
      return ELEMENT_IDS.includes(a) && ELEMENT_IDS.includes(b) ? OBJ.paire(n, a, b, portee) : null;
    }
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
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lignes.length) throw new Error('fichier vide');
  const entete = csvLigne(lignes[0]).map((x) => x.trim().toLowerCase());
  if (!entete.includes('objet') || !entete.includes('cle')) {
    throw new Error('en-tête attendu : objet;cle;numero;minutage;…');
  }

  const plans = {}; const paires = {}; const hors = [];
  let lus = 0; let ignores = 0;

  surLeModifie(() => {
    const parCle = Object.fromEntries(catalogue().map((p) => [p.cle, p]));
    const rangs = Object.fromEntries(buildCartesDoubles().map((c, i) => [c.id, { i, c }]));

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
        const tc = parseInt(r.minutage, 10);
        if (Number.isFinite(tc) && tc !== p.imprime.tc) mis.tc = Math.max(0, Math.min(99, tc));
        // On garde l'ordre du fichier : celui de l'imprimé n'est pas toujours
        // l'ordre canonique, et le re-trier inventerait des retouches.
        const el = (r.icones || '').split('|').map((x) => x.trim().toUpperCase()).filter((x) => ELEMENT_IDS.includes(x));
        const imp = p.imprime.el;
        if (!(el.length === imp.length && el.every((x, k) => x === imp[k]))) mis.el = el;
        const mort = /^(oui|1|true|vrai|x)$/i.test(r.mort || '');
        if (mort !== !!p.imprime.mort) mis.mort = mort;
        const o = objDepuisCSV(r);
        if (JSON.stringify(o || null) !== JSON.stringify(p.imprime.obj || null)) mis.obj = o;
        const o2 = objDepuisCSV(r, '2');
        if (JSON.stringify(o2 || null) !== JSON.stringify(p.imprime.obj2 || null)) mis.obj2 = o2;
        // L'illustration : un chemin sous assets/, ou vide pour celle du numéro.
        const img = (r.illustration || '').trim();
        if (img && img !== p.imprime.image && /^assets\//.test(img)) mis.image = img;
        if (Object.keys(mis).length) plans[p.cle] = mis;

      } else if (objet === 'carte') {
        const e = rangs[r.cle];
        lus++;
        if (e) {
          const gp = parseInt(r.gros_plan, 10);
          const pm = parseInt(r.plan_moyen, 10);
          if (Number.isFinite(gp) && Number.isFinite(pm)
            && (gp !== e.c.gpImprime || pm !== e.c.pmImprime)) paires[e.i] = [pm, gp];
        } else if (!/^(D\d\d)$/.test(r.cle) && !r.cle) { ignores++; continue; }
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
      <p>${cat.length} plans · 50 cartes Plan Moyen / Gros Plan · jeu lancé : <b>${store.cfg.materielActif === 'MODIFIE' ? 'Modifié' : 'Imprimé'}</b>
      · ${n ? `${n} retouche${n > 1 ? 's' : ''}` : 'aucune retouche'}${off ? ` · ${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}` : ''}
      · règles v${REGLES_VERSION} · application v${VERSION} · ${quand}</p>
    </header>
    <h2>Les plans</h2>
    ${tableauPlans(cat)}
    <h2>Les 50 cartes Plan Moyen / Gros Plan</h2>
    ${tableauPaires()}`;

  document.body.classList.add('impression');
  const fin = () => { document.body.classList.remove('impression'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  window.print();
  // Certains navigateurs n'émettent pas afterprint : filet de sécurité.
  setTimeout(fin, 1500);
}

// --- L'export des cartes en PDF ---------------------------------------------
// Un fichier par face — c'est ce qu'il faut pour donner les cartes à imprimer
// une par une. Cent vingt téléchargements de suite, aucun navigateur ne les
// laisse passer : ils partent donc réunis dans une archive ZIP.

const nomFichier = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

/**
 * Les faces à exporter : les deux d'une carte Plan Moyen / Gros Plan, l'unique
 * d'un Plan Large, et les deux de chaque version de Plan de départ. Les cartes
 * écartées de la boîte n'en sont pas — on exporte ce qu'on joue.
 *
 * Les Plans de départ existent en quatre exemplaires chacun dans la boîte,
 * mais les quatre sont identiques : on n'en sort qu'un, à tirer autant de fois
 * qu'il en faut.
 */
function facesCartes() {
  return surLeModifie(() => {
    const faces = [];
    buildCartesDoubles().forEach((c, i) => {
      if (!c.actif) return;
      const rang = String(i + 1).padStart(2, '0');
      const r = moitiesDe(c, 'R'), v = moitiesDe(c, 'V');
      faces.push({ nom: nomFichier(`carte-${rang}-recto-pm${r.PM.num}-gp${r.GP.num}`),
        html: renderCarte(c, false) });
      faces.push({ nom: nomFichier(`carte-${rang}-verso-gp${v.GP.num}-pm${v.PM.num}`),
        html: renderCarte(c, true) });
    });
    buildPlansLarges().forEach((c) => {
      if (!c.actif) return;
      faces.push({ nom: nomFichier(`plan-large-${plHalf(c).num}`), html: renderCarte(c, false) });
    });
    DEPARTS().forEach((d) => d.faces.forEach((f, k) => {
      const id = `S${d.type}f${f.num}`;
      if (estDesactivee(id)) return;
      const carte = { ...f, depart: true, type: 'DEPART', id };
      faces.push({ nom: nomFichier(`plan-de-depart-${d.type}-face${k + 1}-${plHalf(carte).num}`),
        html: renderCarte(carte, false) });
    }));
    return faces;
  });
}

// --- Les planches d'impression ----------------------------------------------
// L'autre façon de sortir les cartes : non plus un fichier par face, mais des
// **planches A4** de neuf cartes prêtes à couper, une page de rectos suivie de
// la page de ses versos.

/**
 * Les cartes en **couples recto / verso**, telles qu'une imprimerie les veut.
 * Une carte Plan Moyen / Gros Plan a ses deux faces ; un Plan Large a son dos
 * de pioche ; un Plan de départ a son autre face — c'est bien une seule carte,
 * même si l'éditeur en montre les deux faces séparément.
 */
function couplesCartes() {
  return surLeModifie(() => {
    const out = [];
    buildCartesDoubles().forEach((c) => {
      if (!c.actif) return;
      out.push({ recto: renderCarte(c, false), verso: renderCarte(c, true) });
    });
    buildPlansLarges().forEach((c) => {
      if (!c.actif) return;
      // Le dos d'une pioche de Plans Larges est un Plan Large vierge : c'est
      // bien le verso imprimé de la carte.
      out.push({ recto: renderCarte(c, false), verso: renderDos('Plans Larges', 0, {}) });
    });
    DEPARTS().forEach((d) => {
      const faces = d.faces.filter((f) => !estDesactivee(`S${d.type}f${f.num}`));
      if (!faces.length) return;
      const carte = (f) => renderCarte({ ...f, depart: true, type: 'DEPART', id: `S${d.type}f${f.num}` }, false);
      out.push({ recto: carte(faces[0]), verso: faces[1] ? carte(faces[1]) : null });
    });
    return out;
  });
}

/**
 * Le sens dans lequel la feuille se retourne. Un imprimeur bascule soit autour
 * de l'axe **vertical** — les colonnes s'inversent, c'est le cas courant —,
 * soit autour de l'axe **horizontal**, et les rangées s'inversent alors. On ne
 * peut pas le deviner : cela se règle, et se retient.
 */
const RETOURNEMENTS = [
  ['colonnes', 'colonnes inversées (retournement gauche-droite)'],
  ['rangees', 'rangées inversées (retournement haut-bas)'],
  ['aucun', 'aucune inversion'],
];

function gabaritPlanche() {
  const sens = LS.get('planche.retournement', 'colonnes');
  return { ...PLANCHE, retournement: sens };
}

async function exporterPlanchesPDF(bouton) {
  const couples = couplesCartes();
  if (!couples.length) { alert('Aucune carte activée : il n’y a rien à exporter.'); return; }
  const libelle = bouton.textContent;
  bouton.disabled = true;
  try {
    const pdf = await planchesCartes(couples, {
      version: VERSION,
      gabarit: gabaritPlanche(),
      avance: (fait, total) => { bouton.textContent = `⏳ ${fait} / ${total}`; },
    });
    const d = new Date();
    const quand = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    telecharger(new Blob([pdf], { type: 'application/pdf' }), `edit-planches-${quand}.pdf`);
  } catch (e) {
    alert(`L’export a échoué : ${e && e.message ? e.message : e}`);
  } finally {
    bouton.disabled = false;
    bouton.textContent = libelle;
  }
}

async function exporterCartesPDF(bouton) {
  const faces = facesCartes();
  if (!faces.length) { alert('Aucune carte activée : il n’y a rien à exporter.'); return; }
  const libelle = bouton.textContent;
  bouton.disabled = true;
  try {
    const zip = await archiveCartes(faces, {
      version: VERSION,
      avance: (fait, total) => { bouton.textContent = `⏳ ${fait} / ${total}`; },
    });
    const d = new Date();
    const quand = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    // Le jeu exporté est celui que la galerie montre — le Modifié —, et non
    // celui qui part en partie : on imprime ce que l'on voit.
    telecharger(new Blob([zip], { type: 'application/zip' }), `edit-cartes-${quand}.zip`);
  } catch (e) {
    alert(`L’export a échoué : ${e && e.message ? e.message : e}`);
  } finally {
    bouton.disabled = false;
    bouton.textContent = libelle;
  }
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

let reglesOnglet = 'texte';
let regleDepliee = null;   // version dont on affiche le texte intégral

function vueRegles() {
  const c = store.cfg;
  const corps = reglesOnglet === 'texte'
    ? `<div class="regles">${corpsRegles(c)}</div>`
    : versionsRegles();

  html(`${topbar('#/regles')}
  <div class="wrap">
    <div class="panneau">
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <h2 style="margin:0">Règles du jeu</h2>
        <span class="version-pill">v${REGLES_VERSION}</span>
      </div>
      <div class="filtre-barre" style="margin-bottom:20px">
        ${[['texte', 'Les règles'], ['versions', `Versions des règles (${REGLES_HISTORIQUE.length})`]]
          .map(([k, l]) => `<button class="pill" data-onglet="${k}"
            style="${reglesOnglet === k ? 'background:var(--violet);color:#fff;border-color:var(--violet)' : ''}">${l}</button>`).join('')}
      </div>
      ${corps}
    </div>
  </div>
  ${pied()}`);

  app.querySelectorAll('[data-onglet]').forEach((b) => b.addEventListener('click', () => {
    reglesOnglet = b.dataset.onglet; vueRegles();
  }));
  app.querySelectorAll('[data-deplie]').forEach((b) => b.addEventListener('click', () => {
    regleDepliee = regleDepliee === b.dataset.deplie ? null : b.dataset.deplie;
    vueRegles();
  }));
}

function versionsRegles() {
  return `<p class="aide" style="margin-bottom:20px">
    La version des règles est indépendante de celle du site. Elle part de la <b>v${REGLES_HISTORIQUE[REGLES_HISTORIQUE.length - 1].v}</b>
    fournie par l’auteur ; chaque modification demandée l’incrémente. Dans l’onglet <b>Les règles</b>,
    les passages modifiés s’affichent <span class="regle-maj" data-v="ainsi">en violet</span>, avec le
    numéro de version qui les a introduits.
  </p>
  ${REGLES_HISTORIQUE.map((v, i) => `
    <div class="version-bloc regle ${i === 0 ? 'actuelle' : ''}">
      <span class="num">v${v.v}</span><span class="date">${v.date}</span>
      ${i === 0 ? '<span class="etiquette">version en vigueur</span>' : ''}
      <div class="aide" style="margin-top:6px">${v.origine}</div>
      <ul>${v.items.map((x) => `<li>${x}</li>`).join('')}</ul>
      <button class="pill" data-deplie="${v.v}">
        ${regleDepliee === v.v ? '▾ Masquer le texte' : '▸ Lire le texte de la v' + v.v}
      </button>
      ${regleDepliee === v.v
        ? `<div class="regles texte-archive">${corpsVersion(v.v, store.cfg)}</div>`
        : ''}
    </div>`).join('')}`;
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
        <h2>Bandeaux pris en compte</h2>
        <p class="aide" style="margin-bottom:12px">Décocher un type de bandeau le neutralise : pratique pour
        mesurer sa contribution réelle au score.</p>
        <div class="chips">
          ${Object.keys(store.cfg.objectifsActifs).map((k) => {
            const on = store.cfg.objectifsActifs[k];
            return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-obj="${k}" ${on ? 'checked' : ''}>${SOURCES_LABEL[k] || k}</label>`;
          }).join('')}
        </div>
      </div>

      <div class="panneau">
        <h2>Familles de scènes</h2>
        <div class="chips">
          ${Object.keys(store.cfg.filtreFamilles).map((k) => {
            const on = store.cfg.filtreFamilles[k];
            const n = surLeModifie(() => SCENES().filter((s) => s.famille === k).length);
            return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-fam="${k}" ${on ? 'checked' : ''}>${k} <b style="opacity:.6">${n}</b></label>`;
          }).join('')}
        </div>
        <h3>Répartition obtenue</h3>
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
  app.querySelectorAll('[data-fam]').forEach((el) => el.addEventListener('change', () => {
    store.cfg.filtreFamilles[el.dataset.fam] = el.checked; sauverCfg(); vueVariables();
  }));
  app.querySelector('#reset').addEventListener('click', () => {
    // Les retouches de cartes survivent : elles ne sont pas des variables de
    // partie, et elles ont leur propre bouton dans Matériel.
    const materiel = store.cfg.materiel;
    store.cfg = cloneConfig(DEFAULTS);
    store.cfg.materiel = materiel;
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
          // Un fichier antérieur à l'éditeur ne porte pas de matériel : on
          // garde alors les retouches en place plutôt que de les effacer.
          if (!lu.materiel) store.cfg.materiel = materiel;
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
  const { doubles, larges } = construirePaquet(store.cfg);
  const compte = Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0]));
  let plans = 0;
  for (const c of doubles) for (const h of Object.values(moitiesDe(c))) { plans++; for (const e of h.el) compte[e]++; }
  for (const c of larges) { plans++; for (const e of c.el) compte[e]++; }
  const max = Math.max(...Object.values(compte)) || 1;
  return `<h3>Éléments dans le paquet <span class="aide">(${plans} plans)</span></h3>
  <div class="barres">
    ${ELEMENT_IDS.map((e) => `<div class="barre-l">
      <span style="display:flex;align-items:center;gap:8px">${elIcon(e, 22)} ${ELEMENTS[e].label}</span>
      <div class="piste"><div class="jauge" style="width:${(compte[e] / max) * 100}%"></div></div>
      <span class="val">${compte[e]}</span></div>`).join('')}
  </div>`;
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
      ${tuile('Cartes Raccord', t(r.raccords.moy), 'par banc', 'orange')}
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
  const mode = sal.cfg ? modeCourant(sal.cfg) : null;

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
          <span class="chip on">${mode ? mode.label : ''}</span>
          ${sal.cfg.sansPlanDepart ? '<span class="chip on">Pas de Plans de départ</span>' : ''}
          <span class="chip on">${sal.cfg.tours} plans</span>
          <span class="chip on">Matériel ${sal.cfg.materielActif === 'MODIFIE' ? 'modifié' : 'imprimé'}</span>
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
  if (lancer) lancer.addEventListener('click', () => { s.lancer(); });
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
  '#/labo': vueLabo,
  '#/historique': vueHistorique,
  '#/versions': vueVersions,
};

function route() {
  document.onkeydown = null;
  (ROUTES[location.hash || '#/'] || vueAccueil)();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();


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
 * cadrage, son rôle de transition, sa face, sa carte d'origine.
 *
 * Les cartes encore en pioche, en rivière ou en main n'ont besoin de rien :
 * leurs moitiés se relisent à chaque rendu. Seul leur **appariement** est figé
 * à la construction du paquet — on le refait, par rang de carte.
 *
 * La **composition de la boîte**, elle, tient au paquet lui-même : activer ou
 * écarter une carte doit la faire entrer ou sortir des pioches et des rivières.
 * C'est `resynchroniserBoite()` qui s'en charge, dans le moteur.
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
  for (const pile of [st.piochePMGP, st.chutierPMGP, ...st.mains]) {
    for (const c of pile || []) {
      const n = c && c.type === 'DOUBLE' ? parRang.get(c.rang) : null;
      if (n) Object.assign(c, { pmScene: n.pmScene, gpScene: n.gpScene, pmNum: n.pmNum, gpNum: n.gpNum });
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

  // Enfin la boîte : les cartes écartées quittent les pioches et les rivières,
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
