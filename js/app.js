// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js?v=1.19';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, PLANS_LARGES, DEPARTS, OBJ, objLabel,
  buildCartesDoubles, buildPlansLarges, moitiesDe, plHalf, halfInfo, FACES,
  appliquerMateriel, catalogue, moitiesDisponibles, cleplan, planDeCle, doublonsNumeros,
  CADRAGES_VISABLES,
} from './data.js?v=1.19';
import { DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, PALETTE_JOUEURS, encreDe, cloneConfig } from './config.js?v=1.19';
import { elIcon } from './icons.js?v=1.19';
import { renderCarte, renderPlan, renderDos, enPile, tc, objHTML, objContenu, cadrageIcon } from './cards.js?v=1.19';
import {
  creerPartie, choixDepart, poserDepart, optionsDerushage, derusher,
  coupsPossibles, poser, avancer, scores, classement, construirePaquet, nouvelleGraine,
} from './engine.js?v=1.19';
import { choisirCoup, choisirDerushage, choisirDepart } from './ai.js?v=1.19';
import { compter, SOURCES_LABEL } from './scoring.js?v=1.19';
import { campagne } from './lab.js?v=1.19';
import { REGLES_VERSION, REGLES_HISTORIQUE, corpsRegles, corpsVersion } from './regles.js?v=1.19';

const app = document.getElementById('app');

// --- Persistance -----------------------------------------------------------

const LS = {
  get(k, d) { try { const v = localStorage.getItem('edit.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('edit.' + k, JSON.stringify(v)); } catch { /* quota */ } },
};

const store = {
  cfg: Object.assign(cloneConfig(DEFAULTS), LS.get('cfg', {})),
  joueurs: LS.get('joueurs', [
    { nom: 'Val', couleur: COULEURS_JOUEURS[0], type: 'HUMAIN' },
    { nom: 'Justine', couleur: COULEURS_JOUEURS[1], type: 'EQUILIBRE' },
  ]),
  historique: LS.get('historique', []),
  partie: null,
  labo: null,
  laboEnCours: false,
  formatChoisi: null,   // 'GP' | 'PM' | 'PL' pendant la phase de montage
  joueurVu: null,       // le banc dont on lit les colonnes ; null = celui qui joue
  undo: null,
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
  // Les réglages d'avant l'éditeur ne portaient que sur le minutage.
  if (store.cfg.minutages && typeof store.cfg.minutages === 'object') {
    for (const [num, tc] of Object.entries(store.cfg.minutages)) {
      if (tc !== undefined && tc !== null && tc !== '') m.plans[num] = { ...(m.plans[num] || {}), tc: Number(tc) };
    }
    delete store.cfg.minutages;
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
  if (store.cfg.materielActif !== 'MODIFIE') store.cfg.materielActif = 'IMPRIME';
}

/**
 * Le jeu de matériel en vigueur : l'imprimé, ou celui que porte l'éditeur.
 * Une partie en cours garde celui avec lequel elle a été lancée — changer de
 * jeu dans l'éditeur ne retourne pas les cartes déjà sur la table.
 */
function appliquerJeuActif() {
  const src = store.partie && !store.partie.finie ? store.partie.cfg : store.cfg;
  const modifie = src.materielActif === 'MODIFIE';
  appliquerMateriel(modifie ? src.materiel : null, src.cartesDesactivees);
}

normaliserMateriel();
appliquerJeuActif();

function sauverCfg() {
  LS.set('cfg', store.cfg);
  appliquerJeuActif();
}

/**
 * L'éditeur travaille toujours sur le matériel modifié, même quand c'est
 * l'imprimé qui se joue : on bascule le temps du calcul, puis on remet. Les
 * appels s'imbriquent — un rendu de carte en appelle d'autres — donc seul le
 * plus extérieur bascule et remet.
 */
let profondeurModifie = 0;

function surLeModifie(fn) {
  if (profondeurModifie++ === 0) appliquerMateriel(store.cfg.materiel, store.cfg.cartesDesactivees);
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
      Un jeu de <b>Valentin Drouet</b><br>
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
      </div>

      <div>
        <div class="panneau">
          <h2>Options de partie</h2>
          <div class="chips">
            ${chip('illustrations', 'Illustrations sur les cartes')}
            ${chip('premierJoueurAleatoire', '1re joueuse aléatoire')}
            ${chip('piocheDirectePMGP', 'Pioche PM / GP au sommet')}
            ${chip('piocheDirectePL', 'Pioche Plans Larges au sommet')}
            ${chip('raccordConnecte', 'Les Raccords soudent les séquences')}
            ${chip('generiqueBloque', 'Le Générique ferme le montage')}
            ${chip('plContigu', 'Deux Plans Larges peuvent se toucher')}
          </div>
          <div class="champ" style="margin-top:14px">
            <label>Graine de partie <small>vide = tirage aléatoire</small></label>
            <input type="text" id="graine" value="${store.cfg.graine || ''}" placeholder="aléatoire"
              style="width:150px;padding:7px 9px;border-radius:9px;border:1px solid var(--gris-clair)">
          </div>
        </div>

        <div class="panneau">
          <h2>Réglages rapides</h2>
          ${[
            ['tours', 'Plans dans le banc', 2, 30],
            ['chutierPMGP', 'Chutier PM / GP', 0, 8],
            ['chutierPL', 'Chutier Plans Larges', 0, 8],
          ].map(([k, l, min, max]) => `
            <div class="champ"><label>${l}</label>
              <input type="number" data-cfg="${k}" value="${store.cfg[k]}" min="${min}" max="${max}"></div>`).join('')}
          <div class="champ">
            <label>Portée des bandeaux <small>hors Raccord et Générique</small></label>
            <select data-cfg="porteeParDefaut">
              <option value="MONTAGE" ${store.cfg.porteeParDefaut === 'MONTAGE' ? 'selected' : ''}>Le montage entier</option>
              <option value="SEQUENCE" ${store.cfg.porteeParDefaut === 'SEQUENCE' ? 'selected' : ''}>La séquence porteuse</option>
            </select>
          </div>
          <p class="aide" style="margin-top:14px">
            Le reste — valeur de chaque objectif, composition du paquet, variantes — est dans <b>Variables</b>.
          </p>
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
  brancherChips(vueAccueil);
  brancherChamps(vueAccueil);
  app.querySelector('#graine').addEventListener('change', (e) => { store.cfg.graine = e.target.value.trim(); sauverCfg(); });
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
 * destructeur : l'imprimé et le modifié coexistent, ce bandeau dit lequel
 * se lance, et l'écran Matériel permet d'en changer.
 */
function bandeauMateriel() {
  const modifie = store.cfg.materielActif === 'MODIFIE';
  const n = Object.keys(store.cfg.materiel.plans).length + Object.keys(store.cfg.materiel.paires).length;
  const off = store.cfg.cartesDesactivees.length;
  return `<div class="bandeau-materiel ${modifie ? 'modifie' : ''}" data-go="#/materiel">
    <span class="bm-etat">${modifie ? 'Matériel modifié' : 'Matériel imprimé'}</span>
    <span class="aide">${modifie
      ? `${n} retouche${n > 1 ? 's' : ''} en jeu`
      : 'les cartes des PDF, sans retouche'}${off ? ` · ${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}` : ''}</span>
    <span class="bm-lien">changer ›</span>
  </div>`;
}

// ===========================================================================
// PARTIE
// ===========================================================================

function lancerPartie() {
  appliquerJeuActif();
  store.partie = creerPartie(store.joueurs.map((j) => ({ ...j })), cloneConfig(store.cfg), store.cfg.graine || nouvelleGraine());
  // La partie fige son matériel : à partir d'ici c'est le sien qui vaut.
  appliquerJeuActif();
  store.formatChoisi = null;
  store.undo = null;
  store.joueurVu = null;
  location.hash = '#/partie';
}

const PHASES = {
  DEPART: 'Mise en place — choix du Plan de départ',
  DERUSHAGE: 'Phase A — Dérushage',
  MONTAGE: 'Phase B — Montage',
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
      <h2>Score de ${nom}${suit ? '' : ' <span class="epingle">épinglé</span>'}</h2>
      ${suit ? '' : '<button class="pill mini" id="suivre-tour">↩ suivre la joueuse en cours</button>'}
      ${tableauScore(sc[vu])}
    </div>
    <div class="panneau"><h2>Icônes du banc de ${nom}</h2>${blocRecensement(sc[vu])}</div>
    <div class="panneau"><h2>Bandeaux du banc de ${nom}</h2>${listeObjectifs(sc[vu])}</div>`;
}

function vuePartie() {
  const st = store.partie;
  if (!st) { location.hash = '#/'; return; }
  appliquerJeuActif();

  // On ne s'arrête jamais sur le tour d'une IA : ses coups sont résolus d'un
  // bloc avant le rendu, pour rendre la main sans temps mort.
  if (!st.finie && aUneHumaine(st) && !estHumaine(st)) {
    if (resoudreIA(st)) return terminer();
  }
  if (st.finie) return vueFin();

  const p = st.courant;
  const j = st.joueurs[p];
  const humaine = j.type === 'HUMAIN';
  const sc = scores(st);
  // Le banc lu dans les colonnes : celui qui joue, ou celui qu'on a épinglé.
  const vu = store.joueurVu !== null && st.joueurs[store.joueurVu] ? store.joueurVu : p;

  // La zone garde toujours la même forme, quel que soit celui qui joue : seuls
  // les clics sont réservés à la joueuse humaine.
  let zone;
  if (st.phase === 'DEPART') zone = zoneDepart(st, p);
  else if (st.phase === 'DERUSHAGE') zone = zoneDerushage(st);
  else zone = zoneMontage(st, p);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    <div class="bandeau-tour">
      <span>${st.phase === 'DEPART' ? 'Plan de départ'
        : `Plan <b>${Math.min(st.tour + 1, st.cfg.tours)} / ${st.cfg.tours}</b>`}</span><span>·</span>
      <span><b>${PHASES[st.phase]}</b></span><span>·</span>
      <span style="color:${encreDe(j.couleur)}"><b>${j.nom}</b></span>
      <span class="jeton-materiel ${st.cfg.materielActif === 'MODIFIE' ? 'modifie' : ''}"
        title="Le jeu de matériel avec lequel cette partie a été lancée">
        ${st.cfg.materielActif === 'MODIFIE' ? 'Matériel modifié' : 'Matériel imprimé'}</span>
      <button class="pill mini" id="bascule-illus" title="Afficher ou masquer les illustrations">
        ${store.cfg.illustrations ? 'Images visibles' : 'Images masquées'}
      </button>
    </div>

    <div class="table-jeu">
      <div class="zone-gauche">
        <div class="panneau zone-phase">${zone}</div>
        ${st.joueurs.map((jj, i) => bancBloc(st, i, `Banc de ${jj.nom}`, i === p && humaine && st.phase === 'MONTAGE')).join('')}
      </div>

      <div class="colonne-info">
        ${st.joueurs.map((jj, i) => `
          <div class="mini-joueur ${i === p ? 'actif' : ''} ${i === vu ? 'vu' : ''}" data-joueur="${i}"
            title="Lire les colonnes de ${jj.nom}">
            <div class="entete">
              <span class="point-couleur" style="background:${jj.couleur}"></span>
              <span>${jj.nom}</span>
              ${jj.type !== 'HUMAIN' ? `<span class="badge-bot">${PROFILS_IA[jj.type].label.replace('IA — ', '')}</span>` : ''}
              <span class="pt">${sc[i].total}</span>
            </div>
            <div class="aide" style="font-size:.78rem;margin-top:4px">
              ${sc[i].plans} plan${sc[i].plans > 1 ? 's' : ''} · ${sc[i].sequences} séquence${sc[i].sequences > 1 ? 's' : ''} · ${sc[i].cartesRaccord} raccord${sc[i].cartesRaccord > 1 ? 's' : ''}
            </div>
            ${i === p ? '<span class="badge-tour">À elle de jouer</span>' : ''}
          </div>`).join('')}

        <div id="colonnes-joueur">${colonnesJoueur(st, sc, vu)}</div>

        <div class="barre-outils">
          <button class="pill" id="undo" ${store.undo ? '' : 'disabled'}>↩ Annuler</button>
          <button class="pill" id="quitter">Quitter</button>
        </div>
      </div>
    </div>
  </div>
  ${pied()}`, true);

  brancherPartie(st, humaine);
  // Seule une table entièrement tenue par des IA se joue pas à pas : sans
  // spectateur humain à qui rendre la main, il faut bien pouvoir la regarder.
  if (!humaine) setTimeout(() => { if (coupIA(st)) terminer(); else vuePartie(); }, Math.max(60, st.cfg.vitesseIA || 300));
}

// --- Le banc ---------------------------------------------------------------

function bancBloc(st, i, titre, interactif) {
  const banc = st.bancs[i];
  // Ce que chaque carte rapporte ici et maintenant, pour l'aperçu au survol.
  const points = new Map(compter(banc, st.cfg).lignes.map((l) => [l.plan, l.pts]));
  const coups = interactif && store.formatChoisi
    ? coupsPossibles(st, i).filter((c) => c.format === store.formatChoisi)
    : [];

  const fente = (liste) => {
    if (!liste.length) return '<div class="ecart"></div>';
    return `<div class="ecart actif">${liste.map((c) => `
      <button class="fente-btn" data-coup="${encodeURIComponent(JSON.stringify(sansCarte(c)))}">${etiquetteCoup(c)}</button>`).join('')}</div>`;
  };

  const morceaux = [];
  if (!banc.sequences.length) {
    morceaux.push('<div class="vide" style="color:#8a8496">Banc vide</div>');
  }
  banc.sequences.forEach((seq, si) => {
    // Écart avant cette séquence : nouvelle séquence, soudure, générique.
    morceaux.push(fente(coups.filter((c) => (c.action === 'NOUVELLE_SEQUENCE' && c.pos === si)
      || (c.action === 'SOUDER' && c.pos === si - 1)
      || (c.action === 'GENERIQUE' && c.role === 'OUVERTURE' && si === 0))));
    morceaux.push(`<div class="sequence">`);
    morceaux.push(fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'gauche')));
    seq.forEach((plan) => morceaux.push(renderPlan(plan, { points: plan.obj ? (points.get(plan) || 0) : 0 })));
    morceaux.push(fente(coups.filter((c) => c.action === 'ETENDRE' && c.seq === si && c.cote === 'droite')));
    morceaux.push('</div>');
  });
  const n = banc.sequences.length;
  morceaux.push(fente(coups.filter((c) => (c.action === 'NOUVELLE_SEQUENCE' && c.pos === n)
    || (c.action === 'GENERIQUE' && c.role === 'CREDITS'))));

  return `<div class="panneau">
    <h2>${titre}</h2>
    <div class="banc" data-banc="${i}"><div class="banc-piste">${morceaux.join('')}</div></div>
  </div>`;
}

/**
 * Choisir la moitié à laisser visible ne touche pas à la partie : on repeint
 * la carte et le banc concernés plutôt que toute la table, pour que rien ne
 * clignote entre le clic sur la moitié et le clic sur l'emplacement.
 */
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
    brancherFentes(st, piste);
    brancherApercu(piste);
  }
}

/** (Re)branche les emplacements de pose du banc courant. */
function brancherFentes(st, racine = app) {
  racine.querySelectorAll('[data-coup]').forEach((el) => el.addEventListener('click', () => {
    const partiel = JSON.parse(decodeURIComponent(el.dataset.coup));
    const carte = st.mains[st.courant][0];
    store.undo = JSON.stringify(st);
    poser(st, st.courant, { ...partiel, carte });
    store.formatChoisi = null;
    apresCoup(st, avancer(st));
  }));
}

function sansCarte(c) {
  const { carte, ...reste } = c;
  return reste;
}

function etiquetteCoup(c) {
  switch (c.action) {
    case 'NOUVELLE_SEQUENCE': return '＋ séquence';
    case 'SOUDER': return '⛓ souder';
    case 'GENERIQUE': return c.role === 'OUVERTURE' ? '▶ ouverture' : '■ fin';
    default: return c.cote === 'gauche' ? '◀' : '▶';
  }
}

// --- Phase de mise en place -----------------------------------------------

function zoneDepart(st, p) {
  const options = choixDepart(st, p);
  return `<div class="main-cartes">
    ${options.map((o, k) => `<div class="item">
      <div class="carte solo clickable" data-depart="${k}">${renderPlan(o.plan)}</div>
      <div class="lg">Version ${o.carte.version} — face ${o.face + 1}</div>
    </div>`).join('')}
  </div>`;
}

// --- Phase A ---------------------------------------------------------------

function zoneDerushage(st) {
  const options = optionsDerushage(st);
  const carte = (o) => `<div data-derush="${enc(o)}">${renderCarte(o.carte, false, { small: true, clickable: true })}</div>`;

  // Une ligne par famille : sa pioche d'abord, puis son chutier.
  const ligne = (titre, pioche, chutier) => `
    <div class="derushage-ligne">
      <h3>${titre}</h3>
      <div class="derushage-cartes">
        ${pioche}
        ${chutier || '<div class="aide" style="align-self:center">Chutier épuisé</div>'}
      </div>
    </div>`;

  // La pioche des Plans Larges reste face cachée : ces cartes ont un vrai dos.
  const sommetPL = options.find((o) => o.source === 'PIOCHE_PL');
  const dosPL = st.piochePL.length
    ? enPile(sommetPL
      ? `<div data-derush="${enc(sommetPL)}">${renderDos('Plans Larges', st.piochePL.length, { small: true, clickable: true })}</div>`
      : `<div class="pioche-fermee" title="Cette pioche n’est pas accessible : on ne pioche que dans son chutier.">${renderDos('Plans Larges', st.piochePL.length, { small: true })}</div>`,
      st.piochePL.length)
    : '';

  // Celle des Plans Moyens / Gros Plans montre sa face du dessus : ces cartes
  // étant recto-verso, une pioche ne peut pas les cacher.
  const sommetPMGP = options.find((o) => o.source === 'PIOCHE_PMGP');
  const piochePMGP = sommetPMGP
    ? enPile(carte(sommetPMGP), st.piochePMGP.length)
    : (st.piochePMGP.length
      ? enPile(`<div class="pioche-fermee">${renderCarte(st.piochePMGP[0], false, { small: true })}</div>`, st.piochePMGP.length)
      : '');

  return `<div class="derushage-lignes">
    ${ligne('Plans Larges', dosPL, options.filter((o) => o.source === 'CHUTIER_PL').map(carte).join(''))}
    ${ligne('Plans Moyens / Gros Plans', piochePMGP, options.filter((o) => o.source === 'CHUTIER_PMGP').map(carte).join(''))}
  </div>`;
}

const enc = (o) => encodeURIComponent(JSON.stringify({ source: o.source, index: o.index }));

// --- Phase B ---------------------------------------------------------------

/** Le texte sous la carte en cours de pose, seul élément qui suit le choix. */
function aideMontage(st, choisi) {
  const carte = st.mains[st.courant][0];
  if (!carte) return '';
  if (carte.type !== 'DOUBLE') {
    return 'Un Plan Large ouvre une nouvelle séquence, détachée du reste du montage. Clique sur un emplacement de ton banc.';
  }
  if (!choisi) return 'La carte se glisse sous les précédentes : clique sur la moitié que tu veux laisser visible.';
  const plan = moitiesDe(carte)[choisi];
  const quoi = `${FORMATS[choisi].label} n°${plan.num}${plan.obj ? ` — ${objLabel(plan.obj)}` : ' — sans bandeau'}`;
  return `Tu gardes le <b>${quoi}</b>. Clique maintenant sur un emplacement de ton banc.`;
}

function zoneMontage(st, p) {
  const carte = st.mains[p][0];
  if (!carte) return '<div class="zone-montage"><p class="aide">Aucune carte dérushée.</p></div>';

  // Un Plan Large n'a pas de moitié à choisir.
  if (carte.type !== 'DOUBLE') {
    store.formatChoisi = 'PL';
    return `<div class="zone-montage">
      <div id="choix-carte">${renderCarte(carte, false, {})}</div>
      <p class="aide" id="aide-montage">${aideMontage(st, 'PL')}</p>
    </div>`;
  }

  const choisi = store.formatChoisi === 'GP' || store.formatChoisi === 'PM' ? store.formatChoisi : null;
  return `<div class="zone-montage">
    <div id="choix-carte">${renderCarte(carte, false, { moitiesChoisissables: true, formatChoisi: choisi })}</div>
    <p class="aide" id="aide-montage">${aideMontage(st, choisi)}</p>
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

/** Chaque bandeau posé, avec ses icônes et ce qu'il rapporte. */
function listeObjectifs(s) {
  if (!s.lignes.length) return '<p class="aide">Aucun bandeau visible sur le banc.</p>';
  return `<table class="tableau-score">
    ${s.lignes.map((l) => `<tr>
      <td>${objHTML(l.obj)}</td>
      <td title="${objLabel(l.obj)}">${l.pts}</td>
    </tr>`).join('')}
  </table>`;
}

/** Le recensement des icônes du banc : ce que l'on compterait à la main. */
function blocRecensement(s) {
  const r = s.recensement;
  const compte = (icone, n, titre) =>
    `<span class="compte ${n ? '' : 'zero'}" title="${titre}">${icone}${n}</span>`;
  return `<div class="recensement">
    ${ELEMENT_IDS.map((e) => compte(elIcon(e, 22), r.elements[e], ELEMENTS[e].label)).join('')}
  </div>
  <div class="recensement" style="margin-top:8px">
    ${['PL', 'PM', 'GP', 'DEP'].map((f) => compte(cadrageIcon(f), r.cadrages[f], FORMATS[f].label)).join('')}
    ${compte(cadrageIcon('TR'), r.raccords, 'Cartes Raccord')}
  </div>
  <div class="recensement" style="margin-top:8px">
    ${compte(elIcon('MORT', 22), r.morts, 'Plans de mort')}
    ${compte(elIcon('NEANT', 22), r.sansPersonnage, 'Plans sans personnage')}
  </div>`;
}

// --- Interactions ----------------------------------------------------------

function brancherPartie(st, humaine) {
  const q = (s) => app.querySelector(s);

  // La zone garde la même forme pendant les tours d'IA : les clics, eux, sont
  // réservés à la joueuse humaine.
  if (humaine) {
    app.querySelectorAll('[data-depart]').forEach((el) => el.addEventListener('click', () => {
      store.undo = JSON.stringify(st);
      poserDepart(st, st.courant, choixDepart(st, st.courant)[+el.dataset.depart]);
      apresCoup(st, avancer(st));
    }));

    app.querySelectorAll('[data-derush]').forEach((el) => el.addEventListener('click', () => {
      const choix = JSON.parse(decodeURIComponent(el.dataset.derush));
      store.undo = JSON.stringify(st);
      derusher(st, st.courant, choix);
      store.formatChoisi = null;
      apresCoup(st, avancer(st));
    }));

    // Le choix de la moitié ne touche pas à la partie : on repeint la seule
    // carte concernée plutôt que toute la table.
    app.querySelectorAll('#choix-carte .moitie[data-format]').forEach((el) => {
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

  const bi = q('#bascule-illus');
  if (bi) bi.addEventListener('click', () => {
    store.cfg.illustrations = !store.cfg.illustrations;
    sauverCfg(); vuePartie();
  });
  brancherApercu();

  if (q('#undo')) q('#undo').addEventListener('click', () => {
    if (store.undo) { store.partie = JSON.parse(store.undo); store.undo = null; store.formatChoisi = null; vuePartie(); }
  });
  if (q('#quitter')) q('#quitter').addEventListener('click', () => {
    if (confirm('Quitter la partie en cours ?')) { store.partie = null; location.hash = '#/'; }
  });

  document.onkeydown = humaine ? (e) => {
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
    ${d.obj ? `<div class="ap-obj">
      <div class="ap-obj-visuel">${objHTML(d.obj, 44)}</div>
      <div class="ap-obj-texte">${objLabel(d.obj)}</div>
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
// Une IA ne se regarde pas réfléchir : dès qu'une humaine est à la table, tous
// les coups des IA en attente sont joués d'un bloc, sans attente ni rendu
// intermédiaire. Entre deux clics, il ne se passe donc rien d'autre qu'un seul
// rendu — la table ne clignote plus.

function estHumaine(st) {
  return st.joueurs[st.courant].type === 'HUMAIN';
}

function aUneHumaine(st) {
  return st.joueurs.some((j) => j.type === 'HUMAIN');
}

/** Joue le coup de l'IA courante. Renvoie true si la partie s'achève. */
function coupIA(st) {
  if (!st || st.finie || estHumaine(st)) return false;
  const p = st.courant;

  if (st.phase === 'DEPART') {
    const d = choisirDepart(st, p); if (d) poserDepart(st, p, d);
  } else if (st.phase === 'DERUSHAGE') {
    const o = choisirDerushage(st, p) || optionsDerushage(st)[0]; if (o) derusher(st, p, o);
  } else {
    const coups = coupsPossibles(st, p);
    if (coups.length) poser(st, p, choisirCoup(st, p) || coups[0]);
    else st.mains[p] = [];
  }
  return avancer(st);
}

/** Enchaîne tous les coups d'IA en attente. Renvoie true si la partie s'achève. */
function resoudreIA(st) {
  let garde = 0;
  while (!st.finie && !estHumaine(st) && garde++ < 400) {
    if (coupIA(st)) return true;
  }
  return st.finie;
}

/** Suite d'un coup humain : les IA enchaînent, puis un unique rendu. */
function apresCoup(st, fini) {
  if (fini || resoudreIA(st)) return terminer();
  vuePartie();
}

function terminer() {
  const st = store.partie;
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

function vueFin() {
  const st = store.partie;
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
    <div class="grid2">
      ${cl.map((c) => `<div class="panneau"><h2>Détail — ${c.joueur.nom}</h2>${tableauScore(c)}</div>`).join('')}
    </div>
    <div class="panneau">
      <h2>Les bancs de montage</h2>
      ${st.joueurs.map((j, i) => `<h3>${j.nom}</h3>
        <div class="banc" style="margin-bottom:12px"><div class="banc-piste">
          ${st.bancs[i].sequences.map((seq) => `<div class="sequence">${seq.map((pl) => renderPlan(pl)).join('')}</div>`).join('<div class="ecart"></div>')}
        </div></div>`).join('')}
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
};

const VUES = [
  ['CARTES', 'Cartes PM / GP'], ['GP', 'Gros Plans'], ['PM', 'Plans Moyens'],
  ['PL', 'Plans Larges'], ['DEPART', 'Plans de départ'],
  ['TABLE', 'Tableau complet'], ['STATS', 'Statistiques'],
];

const VUES_GALERIE = ['CARTES', 'GP', 'PM', 'PL', 'DEPART'];

// Ce que compte un pouvoir. Les libellés se lisent à la suite du « n × » du
// bandeau : « 2 × par plan du cadrage — Plan Large ».
const KINDS = [
  ['',        'aucun pouvoir'],
  ['FORMAT',  'par plan du cadrage…'],
  ['ELEMENT', 'par plan portant l’icône…'],
  ['PAIRE',   'par couple d’icônes voisines…'],
  ['MORT',    'par plan de mort'],
  ['NEANT',   'par plan sans personnage'],
  ['RACCORD', 'par Carte Raccord du montage'],
  ['PLAN',    'par carte de sa séquence'],
  ['MINUTAGE', 'par plan du montage avant / après…'],
  ['POSITION', 'par plan avant / après cette carte…'],
  ['ABSENT',  'si l’icône est absente du montage…'],
  ['CHRONO',  'si le montage se lit dans l’ordre'],
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
      return DEPARTS.flatMap((d) => d.faces.map((f, k) => ({
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
    if (f.pouvoir === 'AVEC') { if (!un((h) => h.obj)) return false; }
    else if (f.pouvoir === 'SANS') { if (!un((h) => !h.obj)) return false; }
    else if (!un((h) => h.obj && h.obj.kind === f.pouvoir)) return false;
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
  else corps = surLeModifie(galerieMateriel);

  html(`${topbar('#/materiel')}
  <div class="materiel-2col wrap large">
    <div class="panneau">
      <h2>Matériel</h2>
      ${alerteDoublons()}
      ${barreJeu()}
      <div class="filtre-barre" style="margin-top:12px">
        ${VUES.map(([k, l]) => `<button class="pill ${mat.vue === k ? 'on' : ''}" data-vue="${k}">${l}</button>`).join('')}
      </div>
      ${corps}
    </div>
    <div class="panneau editeur" id="editeur">${panneauEditeur()}</div>
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
      <button class="${modifie ? '' : 'on'}" data-jeu="IMPRIME">Imprimé</button>
      <button class="${modifie ? 'on' : ''}" data-jeu="MODIFIE">Modifié</button>
    </div>
    <span class="aide">
      ${modifie
        ? `les ${n} retouche${n > 1 ? 's' : ''} de l’éditeur partent en partie`
        : `le matériel des PDF part en partie ; les ${n} retouche${n > 1 ? 's' : ''} de l’éditeur sont mises de côté, jamais perdues`}
      ${off ? ` · <b>${off} carte${off > 1 ? 's' : ''} écartée${off > 1 ? 's' : ''}</b> de la boîte, dans les deux jeux` : ''}
      · la galerie ci-dessous montre et règle toujours le jeu <b>Modifié</b>
    </span>
    <button class="pill" id="mat-export">⭳ Tableau en PDF</button>
    <button class="pill" id="csv-export">⭳ Cartes en CSV</button>
    <button class="pill" id="csv-import">⭱ Importer un CSV</button>
  </div>`;
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
    ${mat.cartes.size ? blocBoite() : ''}
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
    </div>
    <p class="aide">Une carte écartée reste éditable mais ne part pas dans le paquet — dans l’un
    comme dans l’autre jeu de matériel.</p>
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
      <button class="pill mini" data-vider="obj" data-cles="${h.cle}" ${h.obj ? '' : 'disabled'}>Enlever le pouvoir</button>
    </div>
    ${memeObjectif(h.obj, imp.obj) ? '' : `<div class="imp-rappel ligne">imprimé :
      ${imp.obj ? `${objHTML(imp.obj, 20)} ${objLabel(imp.obj)}` : 'bandeau vide'}</div>`}
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

    <div class="champ-bloc">
      <span class="ch-lg">Icônes</span>
      ${choixIcones(plans, 'data-lot-icone="1"', 'data-lot-mort="1"')}
      <div class="rangee-mini" style="margin-top:8px">
        <button class="pill mini" data-vider="el" data-cles="${cles}"
          ${plans.some((p) => p.el.length || p.mort) ? '' : 'disabled'}>Enlever toutes les icônes</button>
      </div>
    </div>

    ${blocPouvoir(objCommunDe(plans), 'lot')}
    <div class="rangee-mini">
      <button class="pill mini" data-vider="obj" data-cles="${cles}"
        ${plans.some((p) => p.obj) ? '' : 'disabled'}>Enlever le pouvoir des ${plans.length} plans</button>
    </div>

    <div class="liste-lot">
      ${plans.map((p) => `<span class="jeton ${retoucheDe(p.cle) ? 'mod' : ''}" data-oter="${p.cle}"
        title="Retirer de la sélection">${p.num}${p.face || ''} ✕</span>`).join('')}
    </div>
  </div>`;
}

/** Le pouvoir commun à une sélection, ou rien si les plans divergent. */
function objCommunDe(plans) {
  const v = JSON.stringify(plans[0].obj || null);
  return plans.every((p) => JSON.stringify(p.obj || null) === v) ? plans[0].obj : null;
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

/** Ajoute ou retire une icône, en gardant l'ordre canonique des éléments. */
function ajusterIcones(liste, e, delta) {
  const compte = Object.fromEntries(ELEMENT_IDS.map((x) => [x, liste.filter((y) => y === x).length]));
  compte[e] = Math.max(0, Math.min(MAX_ICONES, compte[e] + delta));
  return ELEMENT_IDS.flatMap((x) => Array.from({ length: compte[x] }, () => x));
}

/** X points × <ce qu'on compte>. `ou` vaut la clé du plan, ou « lot ». */
function blocPouvoir(o, ou) {
  const kind = o ? o.kind : '';
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const elOpts = (choisi) => ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, choisi === e)).join('');

  let complement = '';
  if (kind === 'FORMAT') {
    complement = `<select data-champ-obj="${ou}" data-part="format">
      ${['PL', 'PM', 'GP'].map((f) => opt(f, FORMATS[f].label, o.format === f)).join('')}</select>`;
  } else if (kind === 'ELEMENT' || kind === 'ABSENT') {
    complement = `<select data-champ-obj="${ou}" data-part="el">${elOpts(o.el)}</select>`;
  } else if (kind === 'PAIRE') {
    complement = `<select data-champ-obj="${ou}" data-part="el0">${elOpts(o.els[0])}</select>
      <span class="plus">+</span>
      <select data-champ-obj="${ou}" data-part="el1">${elOpts(o.els[1])}</select>`;
  } else if (kind === 'POSITION') {
    const cible = o.quoi === 'FORMAT'
      ? `<select data-champ-obj="${ou}" data-part="cible">
          ${['PL', 'PM', 'GP'].map((f) => opt(f, FORMATS[f].label, o.format === f)).join('')}</select>`
      : `<select data-champ-obj="${ou}" data-part="cible">${elOpts(o.el)}</select>`;
    complement = `<select data-champ-obj="${ou}" data-part="quoi">
        ${opt('ELEMENT', 'les plans portant', o.quoi !== 'FORMAT')}${opt('FORMAT', 'les plans du cadrage', o.quoi === 'FORMAT')}
      </select>
      ${cible}
      <select data-champ-obj="${ou}" data-part="sens">
        ${opt('AVANT', 'avant cette carte', o.sens !== 'APRES')}${opt('APRES', 'après cette carte', o.sens === 'APRES')}
      </select>`;
  } else if (kind === 'MINUTAGE') {
    complement = `<select data-champ-obj="${ou}" data-part="sens">
        ${opt('AVANT', 'avant', o.sens !== 'APRES')}${opt('APRES', 'après', o.sens === 'APRES')}
      </select>
      <input type="number" class="pts" min="0" max="99" value="${o.seuil}" data-champ-obj="${ou}" data-part="seuil">
      <span class="tc-apercu">${tc(o.seuil)}</span>`;
  }

  return `<div class="champ-bloc">
    <span class="ch-lg">Pouvoir</span>
    <div class="editeur-obj">
      <input type="number" class="pts" min="0" max="20" value="${o ? o.n : 1}"
        data-champ-obj="${ou}" data-part="n" ${o ? '' : 'disabled'}>
      <span class="x">${kind === 'ABSENT' || kind === 'CHRONO' ? 'si' : '×'}</span>
      <select data-champ-obj="${ou}" data-part="kind">${KINDS.map(([k, l]) => opt(k, l, kind === k)).join('')}</select>
      ${complement}
    </div>
    <div class="apercu-obj">${o ? `${objHTML(o, 26)}<span class="lit">${objLabel(o)}</span>`
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
    <p class="aide">La répartition imprimée est conservée tant qu’on n’y touche pas.</p>
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
      <td>${p.obj ? `${objHTML(p.obj, 20)} <span class="aide">${objLabel(p.obj)}</span>` : '—'}</td>
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
    if (f.pouvoir === 'AVEC') { if (!h.obj) return false; }
    else if (f.pouvoir === 'SANS') { if (h.obj) return false; }
    else if (!h.obj || h.obj.kind !== f.pouvoir) return false;
  }
  return true;
}

function statsJeu(modifie) {
  const etait = store.cfg.materielActif;
  appliquerMateriel(modifie ? store.cfg.materiel : null, store.cfg.cartesDesactivees);
  try {
    const tous = plansDuPaquet();
    const plans = tous.filter(passeStats);
    const s = {
      plans: plans.length,
      cadrages: { PL: 0, PM: 0, GP: 0 },
      elements: Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])),
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
      if (h.obj) s.pouvoirs[h.obj.kind]++; else s.sansPouvoir++;
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

  const tableau = (titre, lignes) => `<h3>${titre}</h3>
    <table class="tbl tbl-stats">
      <thead><tr><th></th><th class="num">Imprimé</th><th class="num">Modifié</th><th class="num">Écart</th></tr></thead>
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

  ${tableau('Les icônes', [
    ...ELEMENT_IDS.map((e) => ligne(ELEMENTS[e].label, imp.elements[e], mod.elements[e], elIcon(e, 20))),
    ligne('Plans de mort', imp.morts, mod.morts, elIcon('MORT', 20)),
    ligne('Plans sans aucune icône', imp.sansIcone, mod.sansIcone),
  ].join(''))}

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

  const tout = app.querySelector('#sel-tout');
  if (tout) tout.addEventListener('click', () => { tuiles.forEach(ajouterTuile); refaire(); });
  const rien = app.querySelector('#sel-rien');
  if (rien) rien.addEventListener('click', () => {
    mat.plans.clear(); mat.cartes.clear(); mat.ancre = null; refaire();
  });

  app.querySelectorAll('[data-stat]').forEach((el) => el.addEventListener('change', () => {
    mat.statsFiltres[el.dataset.stat] = el.value; refaire();
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

  app.querySelectorAll('[data-champ-tc]').forEach((el) => el.addEventListener('change', () => {
    appliquerTc([el.dataset.champTc], el.value); sauverCfg(); refaire();
  }));

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
    else poserObj(cles, null);
    sauverCfg(); refaire();
  }));

  // Le pouvoir : en solo il s'applique au fil des changements, en lot il
  // attend son bouton.
  app.querySelectorAll('[data-champ-obj]').forEach((el) => el.addEventListener('change', () => {
    const cibles = el.dataset.champObj === 'lot' ? plans.map((p) => p.cle) : [el.dataset.champObj];
    majObjectif(cibles, el.dataset.part, el.value);
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

function poserObj(cles, obj) {
  surLeModifie(() => {
    for (const c of cles) {
      const p = planDeCle(c);
      retoucher(c, 'obj', memeObjectif(obj, p ? p.imprime.obj : null) ? undefined : (obj ? JSON.parse(JSON.stringify(obj)) : null));
    }
  });
}

function construireObj(kind, actuel) {
  if (!kind) return null;
  const n = actuel ? actuel.n : 1;
  const e0 = actuel && actuel.el ? actuel.el : (actuel && actuel.els ? actuel.els[0] : ELEMENT_IDS[0]);
  return {
    FORMAT:  () => OBJ.format(n, actuel && actuel.format ? actuel.format : 'PM'),
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
    POSITION: () => OBJ.position(n, actuel && actuel.sens ? actuel.sens : 'AVANT', 'ELEMENT', e0),
  }[kind]();
}

/**
 * Recompose le bandeau à partir de la pièce que l'on vient de changer. Sur
 * une sélection, la base est le pouvoir que tous les plans ont en commun —
 * c'est celui que le formulaire montre.
 */
function majObjectif(cles, part, valeur) {
  const plans = surLeModifie(() => cles.map(planDeCle).filter(Boolean));
  if (!plans.length) return;
  const actuel = objCommunDe(plans);

  if (part === 'kind') return poserObj(cles, construireObj(valeur, actuel));
  if (!actuel) return;
  const o = JSON.parse(JSON.stringify(actuel));
  if (part === 'n') o.n = Math.max(0, Math.min(20, parseInt(valeur, 10) || 0));
  else if (part === 'format') o.format = valeur;
  else if (part === 'el') o.el = valeur;
  else if (part === 'el0') o.els = [valeur, o.els[1]];
  else if (part === 'el1') o.els = [o.els[0], valeur];
  else if (part === 'sens') o.sens = valeur;
  else if (part === 'seuil') o.seuil = Math.max(0, Math.min(99, parseInt(valeur, 10) || 0));
  else if (part === 'quoi') {
    o.quoi = valeur;
    if (valeur === 'FORMAT') { o.format = o.format || 'GP'; delete o.el; }
    else { o.el = o.el || ELEMENT_IDS[0]; delete o.format; }
  } else if (part === 'cible') {
    if (o.quoi === 'FORMAT') o.format = valeur; else o.el = valeur;
  }
  poserObj(cles, o);
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

const CSV_COLS = ['objet', 'cle', 'numero', 'minutage', 'icones', 'mort',
  'pouvoir', 'points', 'cible', 'sens', 'seuil', 'gros_plan', 'plan_moyen', 'boite'];

function csvEchappe(v) {
  const t = v === undefined || v === null ? '' : String(v);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** La cible d'un pouvoir, en un mot : un cadrage, une icône, ou un couple. */
function cibleObj(o) {
  if (!o) return '';
  if (o.kind === 'PAIRE') return o.els.join('+');
  if (o.format) return o.format;
  return o.el || '';
}

function exporterCSV() {
  const lignes = [CSV_COLS.join(';')];
  surLeModifie(() => {
    for (const p of catalogue()) {
      const o = p.obj;
      lignes.push([
        'plan', p.cle, p.num, p.tc, p.el.join('|'), p.mort ? 'oui' : 'non',
        o ? o.kind : '', o ? o.n : '', cibleObj(o), o && o.sens ? o.sens : '',
        o && o.seuil !== undefined ? o.seuil : '', '', '', '',
      ].map(csvEchappe).join(';'));
    }
    for (const c of buildCartesDoubles()) {
      lignes.push(['carte', c.id, '', '', '', '', '', '', '', '', '',
        c.gpNum, c.pmNum, estDesactivee(c.id) ? 'non' : 'oui'].map(csvEchappe).join(';'));
    }
    for (const f of ['PL', 'DEPART']) {
      for (const c of cartesDe(f)) {
        lignes.push(['carte', c.id, '', '', '', '', '', '', '', '', '',
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

/** Reconstruit un pouvoir depuis sa ligne de tableau. */
function objDepuisCSV(r) {
  const kind = (r.pouvoir || '').trim().toUpperCase();
  if (!kind) return null;
  const n = Math.max(0, Math.min(20, parseInt(r.points, 10) || 0));
  const cible = (r.cible || '').trim().toUpperCase();
  const sens = (r.sens || '').trim().toUpperCase() === 'APRES' ? 'APRES' : 'AVANT';
  const seuil = Math.max(0, Math.min(99, parseInt(r.seuil, 10) || 0));
  switch (kind) {
    case 'RACCORD': return OBJ.raccord(n);
    case 'PLAN':    return OBJ.plan(n);
    case 'MORT':    return OBJ.mort(n);
    case 'NEANT':   return OBJ.neant(n);
    case 'CHRONO':  return OBJ.chrono(n);
    case 'FORMAT':  return CADRAGES_VISABLES.includes(cible) ? OBJ.format(n, cible) : null;
    case 'ELEMENT': return ELEMENT_IDS.includes(cible) ? OBJ.element(n, cible) : null;
    case 'ABSENT':  return ELEMENT_IDS.includes(cible) ? OBJ.absent(n, cible) : null;
    case 'MINUTAGE': return OBJ.minutage(n, sens, seuil);
    case 'PAIRE': {
      const [a, b] = cible.split('+');
      return ELEMENT_IDS.includes(a) && ELEMENT_IDS.includes(b) ? OBJ.paire(n, a, b) : null;
    }
    case 'POSITION': {
      const fmt = CADRAGES_VISABLES.includes(cible);
      if (!fmt && !ELEMENT_IDS.includes(cible)) return null;
      return OBJ.position(n, sens, fmt ? 'FORMAT' : 'ELEMENT', cible);
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
  store.cfg.materiel = { plans, paires };
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
            const n = SCENES.filter((s) => s.famille === k).length;
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
          store.cfg = Object.assign(cloneConfig(DEFAULTS), lu);
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
// Routage
// ===========================================================================

const ROUTES = {
  '#/': vueAccueil,
  '#/partie': vuePartie,
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

veilleVersion();
setInterval(veilleVersion, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') veilleVersion();
});
