// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js?v=1.12';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, PLANS_LARGES, DEPARTS, OBJ, objLabel,
  buildCartesDoubles, buildPlansLarges, moitiesDe, plHalf, halfInfo,
  appliquerMateriel, catalogue, moitiesDisponibles,
} from './data.js?v=1.12';
import { DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, PALETTE_JOUEURS, encreDe, cloneConfig } from './config.js?v=1.12';
import { elIcon } from './icons.js?v=1.12';
import { renderCarte, renderPlan, renderDos, enPile, tc, objHTML, objContenu, cadrageIcon } from './cards.js?v=1.12';
import {
  creerPartie, choixDepart, poserDepart, optionsDerushage, derusher,
  coupsPossibles, poser, avancer, scores, classement, construirePaquet, nouvelleGraine,
} from './engine.js?v=1.12';
import { choisirCoup, choisirDerushage, choisirDepart } from './ai.js?v=1.12';
import { compter, SOURCES_LABEL } from './scoring.js?v=1.12';
import { campagne } from './lab.js?v=1.12';
import { REGLES_VERSION, REGLES_HISTORIQUE, corpsRegles, corpsVersion } from './regles.js?v=1.12';

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
  store.cfg.materiel = m;
}
normaliserMateriel();
appliquerMateriel(store.cfg.materiel);

function sauverCfg() {
  LS.set('cfg', store.cfg);
  appliquerMateriel(store.cfg.materiel);
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
            ['tours', 'Plans à poser', 1, 30],
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
  const { doubles, larges } = construirePaquet(store.cfg);
  return `<table class="tbl">
    <tr><td>Cartes Plan Moyen / Gros Plan</td><td class="num">${doubles.length}</td></tr>
    <tr><td>Cartes Plan Large</td><td class="num">${larges.length}</td></tr>
    <tr><td>Cartes Plan de départ</td><td class="num">8 <span class="aide">(2 versions)</span></td></tr>
  </table>`;
}

// ===========================================================================
// PARTIE
// ===========================================================================

function lancerPartie() {
  store.partie = creerPartie(store.joueurs.map((j) => ({ ...j })), cloneConfig(store.cfg), store.cfg.graine || nouvelleGraine());
  store.formatChoisi = null;
  store.undo = null;
  location.hash = '#/partie';
}

const PHASES = {
  DEPART: 'Mise en place — choix du Plan de départ',
  DERUSHAGE: 'Phase A — Dérushage',
  MONTAGE: 'Phase B — Montage',
};

function vuePartie() {
  const st = store.partie;
  if (!st) { location.hash = '#/'; return; }

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

  // La zone garde toujours la même forme, quel que soit celui qui joue : seuls
  // les clics sont réservés à la joueuse humaine.
  let zone;
  if (st.phase === 'DEPART') zone = zoneDepart(st, p);
  else if (st.phase === 'DERUSHAGE') zone = zoneDerushage(st);
  else zone = zoneMontage(st, p);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    <div class="bandeau-tour">
      <span>Tour <b>${Math.min(st.tour, st.cfg.tours)} / ${st.cfg.tours}</b></span><span>·</span>
      <span><b>${PHASES[st.phase]}</b></span><span>·</span>
      <span style="color:${encreDe(j.couleur)}"><b>${j.nom}</b></span>
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
          <div class="mini-joueur ${i === p ? 'actif' : ''}">
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

        <div class="panneau"><h2>Score de ${j.nom}</h2>${tableauScore(sc[p])}</div>
        <div class="panneau"><h2>Icônes du banc</h2>${blocRecensement(sc[p])}</div>
        <div class="panneau"><h2>Bandeaux du banc</h2>${listeObjectifs(sc[p])}</div>

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
    seq.forEach((plan) => morceaux.push(renderPlan(plan)));
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
    ${['PL', 'PM', 'GP'].map((f) => compte(cadrageIcon(f), r.cadrages[f], FORMATS[f].label)).join('')}
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
    ${d.el.length ? `<div class="ap-icones">
      ${d.el.map((e) => `<span class="ap-icone">${elIcon(e, 54)}<span>${ELEMENTS[e]?.label || e}</span></span>`).join('')}
    </div>` : '<div class="ap-vide">Aucun élément</div>'}
    ${d.obj ? `<div class="ap-obj">
      <div class="ap-obj-visuel">${objHTML(d.obj, 44)}</div>
      <div class="ap-obj-texte">${objLabel(d.obj)}</div>
    </div>` : '<div class="ap-vide">Aucun bandeau</div>'}`;
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

// ---------------------------------------------------------------------------
// L'écran Matériel est aussi l'éditeur du matériel : rien de ce qui est
// imprimé sur une carte n'est figé. On garde en permanence la galerie sous les
// yeux à gauche, la carte en cours d'édition à droite. Les retouches vivent
// dans cfg.materiel, donc elles sont enregistrées et le jeu s'y conforme
// aussitôt — table de jeu, décompte et Laboratoire compris.

let materielFiltre = 'DOUBLE';
let materielSel = null;    // { famille: 'DOUBLE'|'PL'|'DEPART', rang } — carte éditée

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
  ['ABSENT',  'si l’icône est absente du montage…'],
];

// --- La couche de retouches ------------------------------------------------

function retoucher(num, champ, valeur) {
  const plans = store.cfg.materiel.plans;
  const p = plans[num] || (plans[num] = {});
  if (valeur === undefined) delete p[champ]; else p[champ] = valeur;
  if (!Object.keys(p).length) delete plans[num];
  sauverCfg();
}

function retoucheDe(num) {
  return store.cfg.materiel.plans[num] || null;
}

function nbRetouches() {
  return Object.keys(store.cfg.materiel.plans).length + Object.keys(store.cfg.materiel.paires).length;
}

// --- Les cartes, dans l'ordre des galeries ---------------------------------

function cartesDe(famille) {
  if (famille === 'PL') return buildPlansLarges();
  if (famille === 'DEPART') {
    return DEPARTS.flatMap((d, di) => d.faces.map((f, k) => ({
      type: 'DEPART_FACE', version: d.type, face: k + 1, di, k, plan: { ...f, depart: true },
    })));
  }
  return buildCartesDoubles();
}

/** Les plans qu'une carte donne à éditer — un pour un Plan Large, deux sinon. */
function plansEditables(famille, carte) {
  if (famille === 'DOUBLE') {
    const m = moitiesDe(carte);
    return [m.GP, m.PM];
  }
  if (famille === 'DEPART') return [plHalf(carte.plan)];
  return [plHalf(carte)];
}

function selectionne(famille, rang) {
  const liste = cartesDe(famille);
  return { famille, rang: Math.max(0, Math.min(rang, liste.length - 1)), carte: liste[rang] };
}

// --- La vue ----------------------------------------------------------------

function vueMateriel() {
  const galerie = materielFiltre === 'TABLE' ? tableauMateriel() : galerieMateriel();
  const n = nbRetouches();

  html(`${topbar('#/materiel')}
  <div class="wrap large">
    <div class="materiel-2col">
      <div class="panneau">
        <h2>Matériel</h2>
        <div class="barre-outils" style="margin:12px 0 4px">
          <span class="info">${n ? `${n} retouche${n > 1 ? 's' : ''}` : 'Matériel imprimé, aucune retouche'}</span>
          <button class="pill" id="mat-export">⭳ Exporter le tableau en PDF</button>
          <button class="pill" id="mat-reset" ${n ? '' : 'disabled'}>↺ Tout revenir à l’imprimé</button>
        </div>
        <div class="filtre-barre" style="margin-top:10px">
          ${[['DOUBLE', 'Plans Moyens / Gros Plans'], ['PL', 'Plans Larges'],
             ['DEPART', 'Plans de départ'], ['TABLE', 'Tableau complet']]
            .map(([k, l]) => `<button class="pill ${materielFiltre === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
        </div>
        ${galerie}
      </div>
      <div class="panneau editeur" id="editeur">${panneauEditeur()}</div>
    </div>
  </div>
  ${pied()}`);

  brancherApercu();
  brancherMateriel();
}

/** Une carte de la galerie : son visuel, son libellé et son état. */
function vignetteMateriel(famille, carte, i) {
  const marque = plansEditables(famille, carte).some((h) => retoucheDe(h.num))
    || (famille === 'DOUBLE' && carte.appariementModifie);
  const visuel = famille === 'DEPART'
    ? `<div class="carte solo small">${renderPlan(plHalf(carte.plan))}</div>`
    : renderCarte(carte, false, { small: true });
  const libelle = famille === 'DOUBLE' ? `Carte ${i + 1} · GP ${carte.gpNum} | PM ${carte.pmNum}`
    : famille === 'DEPART' ? `Version ${carte.version} — face ${carte.face}`
    : `Plan Large ${carte.num}${carte.brouillon ? ' · à compléter' : ''}`;
  return { marque, html: `${visuel}<div class="lg">${libelle}${marque ? ' · retouchée' : ''}</div>` };
}

function galerieMateriel() {
  const f = materielFiltre;
  const sel = materielSel && materielSel.famille === f ? materielSel.rang : -1;

  return `<p class="aide" style="margin-top:14px">Clique une carte pour l’éditer — son minutage, ses
  icônes et son pouvoir. Les deux faces d’une carte Plan Moyen / Gros Plan s’éditent ensemble.</p>
  <div class="galerie">${cartesDe(f).map((c, i) => {
    const v = vignetteMateriel(f, c, i);
    return `<div class="item vignette ${i === sel ? 'sel' : ''} ${v.marque ? 'retouchee' : ''}"
      data-carte-rang="${i}">${v.html}</div>`;
  }).join('')}</div>`;
}

// --- Le panneau d'édition --------------------------------------------------

function panneauEditeur() {
  if (!materielSel) {
    return `<h2>Éditeur</h2>
      <p class="aide">Choisis une carte dans la galerie pour régler son <b>minutage</b>, ses
      <b>icônes</b> et son <b>pouvoir</b>. Tout ce qui est réglé ici est enregistré et la partie se
      joue aussitôt avec les cartes retouchées.</p>`;
  }
  const { famille, rang, carte } = selectionne(materielSel.famille, materielSel.rang);
  const plans = plansEditables(famille, carte);

  // Une carte double se lit des deux côtés : on montre le recto et le verso.
  let apercu;
  if (famille === 'DOUBLE') {
    apercu = `<div class="editeur-faces">
      <div><div class="f-lg">Recto</div>${renderCarte(carte, false, { small: true })}</div>
      <div><div class="f-lg">Verso</div>${renderCarte(carte, true, { small: true })}</div>
    </div>`;
  } else if (famille === 'DEPART') {
    apercu = `<div class="editeur-faces"><div><div class="f-lg">Face ${carte.face}</div>
      <div class="carte solo small">${renderPlan(plHalf(carte.plan))}</div></div></div>`;
  } else {
    apercu = `<div class="editeur-faces"><div>${renderCarte(carte, false, { small: true })}</div></div>`;
  }

  const titre = famille === 'DOUBLE' ? `Carte ${rang + 1}`
    : famille === 'DEPART' ? `Plan de départ ${carte.version}${carte.face}`
    : `Plan Large ${carte.num}`;

  return `<h2>${titre}</h2>
    ${apercu}
    ${plans.map((h) => blocPlan(h)).join('')}
    ${famille === 'DOUBLE' ? appariement(carte) : ''}`;
}

/** Le formulaire d'un plan : minutage, icônes, pouvoir. */
function blocPlan(h) {
  const r = retoucheDe(h.num);
  const nom = h.format === 'PL' ? `Plan ${h.num}` : `${FORMATS[h.format].label} n°${h.num}`;

  return `<div class="bloc-plan ${r ? 'retouche' : ''}" data-plan="${h.num}">
    <div class="bp-tete">
      <b>${nom}</b>
      <button class="pill mini" data-plan-reset="${h.num}" ${r ? '' : 'disabled'}>↺ imprimé</button>
    </div>

    <label class="champ-ligne">
      <span>Minutage</span>
      <input type="number" min="0" max="99" step="1" value="${h.tc}" data-champ-tc="${h.num}">
      <span class="tc-apercu">${tc(h.tc)}</span>
    </label>

    <div class="champ-bloc">
      <span class="ch-lg">Icônes</span>
      <div class="choix-icones">
        ${ELEMENT_IDS.map((e) => `<button class="ic ${h.el.includes(e) ? 'on' : ''}"
          data-icone="${e}" data-plan-icone="${h.num}" title="${ELEMENTS[e].label}">
          ${elIcon(e, 26)}</button>`).join('')}
        <button class="ic sep ${h.mort ? 'on' : ''}" data-plan-mort="${h.num}" title="Plan de mort">
          ${elIcon('MORT', 26)}</button>
      </div>
    </div>

    ${blocPouvoir(h)}
  </div>`;
}

/** X points × <ce qu'on compte>. */
function blocPouvoir(h) {
  const o = h.obj;
  const kind = o ? o.kind : '';
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const elOpts = (choisi) => ELEMENT_IDS.map((e) => opt(e, ELEMENTS[e].label, choisi === e)).join('');

  let complement = '';
  if (kind === 'FORMAT') {
    complement = `<select data-champ-obj="${h.num}" data-part="format">
      ${['PL', 'PM', 'GP'].map((f) => opt(f, FORMATS[f].label, o.format === f)).join('')}</select>`;
  } else if (kind === 'ELEMENT' || kind === 'ABSENT') {
    complement = `<select data-champ-obj="${h.num}" data-part="el">${elOpts(o.el)}</select>`;
  } else if (kind === 'PAIRE') {
    complement = `<select data-champ-obj="${h.num}" data-part="el0">${elOpts(o.els[0])}</select>
      <span class="plus">+</span>
      <select data-champ-obj="${h.num}" data-part="el1">${elOpts(o.els[1])}</select>`;
  }

  return `<div class="champ-bloc">
    <span class="ch-lg">Pouvoir</span>
    <div class="editeur-obj">
      <input type="number" class="pts" min="0" max="20" value="${o ? o.n : 1}"
        data-champ-obj="${h.num}" data-part="n" ${o ? '' : 'disabled'}>
      <span class="x">${kind === 'ABSENT' ? 'si' : '×'}</span>
      <select data-champ-obj="${h.num}" data-part="kind">
        ${KINDS.map(([k, l]) => opt(k, l, kind === k)).join('')}
      </select>
      ${complement}
    </div>
    <div class="apercu-obj">${o ? `${objHTML(o, 26)}<span class="lit">${objLabel(o)}</span>` : '<span class="aide">Bandeau vide</span>'}</div>
  </div>`;
}

/** L'appariement des deux moitiés d'une carte double. */
function appariement(carte) {
  const liste = (format, choisi) => moitiesDisponibles(format).map((m) => `
    <option value="${m.num}" ${m.num === choisi ? 'selected' : ''}>
      ${m.num} — ${m.titre || m.famille.toLowerCase()}
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
    <p class="aide">La répartition imprimée est conservée tant qu’on n’y touche pas. La changer ici
    ne modifie que cette carte.</p>
  </div>`;
}

// --- Le tableau complet ----------------------------------------------------

function tableauMateriel() {
  const cat = catalogue();
  return `<p class="aide" style="margin-top:14px">L’état courant de tout le matériel, retouches
  comprises. Le bouton <b>Exporter le tableau en PDF</b> en donne la version imprimable.</p>
  <div class="tbl-defile">${tableauPlans(cat)}</div>
  <h3 style="margin-top:22px">Les 50 cartes Plan Moyen / Gros Plan</h3>
  <div class="tbl-defile">${tableauPaires()}</div>`;
}

// L'en-tête est dans un <thead> : c'est la seule façon qu'il se répète en
// haut de chaque page à l'impression.

function tableauPlans(cat) {
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>N°</th><th>Plan</th><th>Famille</th><th class="num">Minutage</th>
      <th>Icônes</th><th>Pouvoir</th><th>État</th></tr></thead>
    <tbody>${cat.map((p) => `<tr class="${p.modifie ? 'ligne-retouchee' : ''}">
      <td class="num">${p.num}</td>
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
  return `<table class="tbl tbl-materiel">
    <thead><tr><th>Carte</th><th>Gros Plan</th><th>Plan Moyen</th><th>État</th></tr></thead>
    <tbody>${buildCartesDoubles().map((c, i) => `<tr class="${c.appariementModifie ? 'ligne-retouchee' : ''}">
      <td class="num">${i + 1}</td><td class="num">${c.gpNum}</td><td class="num">${c.pmNum}</td>
      <td>${c.appariementModifie ? `réapparié (imprimé : GP ${c.gpImprime} | PM ${c.pmImprime})` : 'imprimé'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// --- Les branchements ------------------------------------------------------

function brancherMateriel() {
  const rafraichir = () => vueMateriel();
  // Le panneau seul, quand la galerie n'a pas bougé : l'édition reste sous le
  // curseur et la liste des cartes ne clignote pas.
  const rafraichirEditeur = () => {
    const e = app.querySelector('#editeur');
    if (!e) return rafraichir();
    e.innerHTML = panneauEditeur();
    brancherEditeur();
    brancherApercu(e);
    // La vignette correspondante suit l'état « retouchée ».
    majVignette();
  };

  app.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    materielFiltre = b.dataset.f;
    if (materielFiltre !== 'TABLE') materielSel = { famille: materielFiltre, rang: 0 };
    rafraichir();
  }));

  app.querySelectorAll('[data-carte-rang]').forEach((el) => el.addEventListener('click', () => {
    materielSel = { famille: materielFiltre, rang: +el.dataset.carteRang };
    app.querySelectorAll('[data-carte-rang]').forEach((v) => v.classList.remove('sel'));
    el.classList.add('sel');
    rafraichirEditeur();
  }));

  const ex = app.querySelector('#mat-export');
  if (ex) ex.addEventListener('click', exporterMateriel);

  const rz = app.querySelector('#mat-reset');
  if (rz) rz.addEventListener('click', () => {
    if (!confirm('Effacer toutes les retouches et revenir au matériel imprimé ?')) return;
    store.cfg.materiel = { plans: {}, paires: {} };
    sauverCfg(); rafraichir();
  });

  brancherEditeur(rafraichirEditeur);
}

/** Redessine la vignette de la carte éditée, sans toucher au reste. */
function majVignette() {
  if (!materielSel || materielFiltre === 'TABLE') return;
  const el = app.querySelector(`[data-carte-rang="${materielSel.rang}"]`);
  if (!el) return;
  const { famille, rang, carte } = selectionne(materielSel.famille, materielSel.rang);
  const v = vignetteMateriel(famille, carte, rang);
  el.innerHTML = v.html;
  el.classList.toggle('retouchee', v.marque);
  brancherApercu(el);
}

function brancherEditeur(apres) {
  const refaire = apres || (() => {
    const e = app.querySelector('#editeur');
    if (!e) return vueMateriel();
    e.innerHTML = panneauEditeur();
    brancherEditeur(); brancherApercu(e); majVignette();
  });

  app.querySelectorAll('[data-champ-tc]').forEach((el) => el.addEventListener('change', () => {
    const num = el.dataset.champTc;
    const v = Math.max(0, Math.min(99, parseInt(el.value, 10) || 0));
    const imprime = catalogue().find((p) => String(p.num) === String(num));
    retoucher(num, 'tc', imprime && imprime.imprime.tc === v ? undefined : v);
    refaire();
  }));

  app.querySelectorAll('[data-plan-icone]').forEach((el) => el.addEventListener('click', () => {
    const num = el.dataset.planIcone;
    const e = el.dataset.icone;
    const cat = catalogue().find((p) => String(p.num) === String(num));
    const actuels = cat ? cat.el.slice() : [];
    const i = actuels.indexOf(e);
    if (i >= 0) actuels.splice(i, 1); else actuels.push(e);
    const imprime = cat ? cat.imprime.el : [];
    const identique = actuels.length === imprime.length && actuels.every((x, k) => x === imprime[k]);
    retoucher(num, 'el', identique ? undefined : actuels);
    refaire();
  }));

  app.querySelectorAll('[data-plan-mort]').forEach((el) => el.addEventListener('click', () => {
    const num = el.dataset.planMort;
    const cat = catalogue().find((p) => String(p.num) === String(num));
    const v = !(cat && cat.mort);
    retoucher(num, 'mort', cat && cat.imprime.mort === v ? undefined : v);
    refaire();
  }));

  app.querySelectorAll('[data-champ-obj]').forEach((el) => el.addEventListener('change', () => {
    majObjectif(el.dataset.champObj, el.dataset.part, el.value);
    refaire();
  }));

  app.querySelectorAll('[data-plan-reset]').forEach((el) => el.addEventListener('click', () => {
    delete store.cfg.materiel.plans[el.dataset.planReset];
    sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-paire]').forEach((el) => el.addEventListener('change', () => {
    const rang = el.dataset.paire;
    const c = buildCartesDoubles()[+rang];
    const pm = el.dataset.part === 'pm' ? +el.value : c.pmNum;
    const gp = el.dataset.part === 'gp' ? +el.value : c.gpNum;
    if (pm === c.pmImprime && gp === c.gpImprime) delete store.cfg.materiel.paires[rang];
    else store.cfg.materiel.paires[rang] = [pm, gp];
    sauverCfg(); refaire();
  }));

  app.querySelectorAll('[data-paire-reset]').forEach((el) => el.addEventListener('click', () => {
    delete store.cfg.materiel.paires[el.dataset.paireReset];
    sauverCfg(); refaire();
  }));
}

/** Recompose le bandeau à partir de la pièce que l'on vient de changer. */
function majObjectif(num, part, valeur) {
  const cat = catalogue().find((p) => String(p.num) === String(num));
  const actuel = cat ? cat.obj : null;
  const imprime = cat ? cat.imprime.obj : null;

  if (part === 'kind') {
    if (!valeur) return retoucher(num, 'obj', imprime === null ? undefined : null);
    const n = actuel ? actuel.n : 1;
    const el0 = actuel && actuel.el ? actuel.el : (actuel && actuel.els ? actuel.els[0] : ELEMENT_IDS[0]);
    const neuf = {
      FORMAT:  () => OBJ.format(n, actuel && actuel.format ? actuel.format : 'PM'),
      ELEMENT: () => OBJ.element(n, el0),
      ABSENT:  () => OBJ.absent(n, el0),
      PAIRE:   () => OBJ.paire(n, el0, actuel && actuel.els ? actuel.els[1] : el0),
      MORT:    () => OBJ.mort(n),
      NEANT:   () => OBJ.neant(n),
      RACCORD: () => OBJ.raccord(n),
      PLAN:    () => OBJ.plan(n),
    }[valeur]();
    return retoucher(num, 'obj', memeObjectif(neuf, imprime) ? undefined : neuf);
  }

  if (!actuel) return;
  const o = JSON.parse(JSON.stringify(actuel));
  if (part === 'n') o.n = Math.max(0, Math.min(20, parseInt(valeur, 10) || 0));
  else if (part === 'format') o.format = valeur;
  else if (part === 'el') o.el = valeur;
  else if (part === 'el0') o.els = [valeur, o.els[1]];
  else if (part === 'el1') o.els = [o.els[0], valeur];
  retoucher(num, 'obj', memeObjectif(o, imprime) ? undefined : o);
}

function memeObjectif(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

// --- L'export ---------------------------------------------------------------
// Pas de bibliothèque tierce : on prépare une feuille imprimable et on ouvre
// la boîte d'impression du navigateur, où « Enregistrer au format PDF » donne
// le fichier. C'est le seul chemin qui marche partout sans dépendance.

function exporterMateriel() {
  const cat = catalogue();
  const n = nbRetouches();
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
      <p>${cat.length} plans · 50 cartes Plan Moyen / Gros Plan · ${n ? `${n} retouche${n > 1 ? 's' : ''}` : 'aucune retouche'}
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
