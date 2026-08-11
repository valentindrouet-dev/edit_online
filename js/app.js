// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, PLANS_LARGES, DEPARTS, objLabel,
  buildCartesDoubles, buildPlansLarges, moitiesDe, plHalf,
} from './data.js';
import { DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, cloneConfig } from './config.js';
import { elIcon } from './icons.js';
import { renderCarte, renderPlan, tc } from './cards.js';
import {
  creerPartie, choixDepart, poserDepart, optionsDerushage, derusher,
  coupsPossibles, poser, avancer, scores, classement, construirePaquet, nouvelleGraine,
} from './engine.js';
import { choisirCoup, choisirDerushage, choisirDepart } from './ai.js';
import { compter, SOURCES_LABEL } from './scoring.js';
import { campagne } from './lab.js';

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

function sauverCfg() { LS.set('cfg', store.cfg); }
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

function html(s) {
  document.body.classList.toggle('sans-illus', !store.cfg.illustrations);
  app.innerHTML = s;
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
      Un jeu édité par <b>Big Budi Games</b><br>
      Vous êtes monteuse. Assemblez vos Cartes Plan dans votre banc de montage pour composer le meilleur film.
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
          <p class="aide" style="margin-bottom:0">
            Chacune monte son film sur son propre banc. Les IA jouent seules — la Novice regarde le coup
            immédiat, l’Équilibrée compare tous ses placements, la Stratège anticipe ce que les chutiers
            lui offriront au tour suivant.
          </p>
        </div>

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

        <button class="cta" id="go">Commencer la partie</button>
      </div>

      <div>
        <div class="panneau">
          <h2>Réglages rapides</h2>
          ${[
            ['tours', 'Plans à poser', 1, 30],
            ['chutierPMGP', 'Chutier PM / GP', 0, 8],
            ['chutierPL', 'Chutier Plans Larges', 0, 8],
            ['departProposes', 'Plans de départ proposés', 1, 4],
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

        <div class="panneau">
          <h2>Personnages et éléments</h2>
          <div class="legende-el">
            ${ELEMENT_IDS.map((e) => `<div class="e">${elIcon(e, 30)}<span>${ELEMENTS[e].label}</span></div>`).join('')}
          </div>
        </div>

        <div class="panneau">
          <h2>Le matériel</h2>
          ${resumePaquet()}
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
      ${COULEURS_JOUEURS.map((c) => `<div class="puce ${c === j.couleur ? 'on' : ''}" style="background:${c}" data-couleur="${c}"></div>`).join('')}
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
  if (st.finie) return vueFin();

  const p = st.courant;
  const j = st.joueurs[p];
  const humaine = j.type === 'HUMAIN';
  const sc = scores(st);

  let zone;
  if (!humaine) zone = '<div class="vide">L’IA joue…</div>';
  else if (st.phase === 'DEPART') zone = zoneDepart(st, p);
  else if (st.phase === 'DERUSHAGE') zone = zoneDerushage(st);
  else zone = zoneMontage(st, p);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    <div class="bandeau-tour">
      <span>Tour <b>${Math.min(st.tour, st.cfg.tours)} / ${st.cfg.tours}</b></span><span>·</span>
      <span><b>${PHASES[st.phase]}</b></span><span>·</span>
      <span>Graine <b>${st.seed}</b></span><span>·</span>
      <span style="color:${j.couleur}"><b>${j.nom}</b>${humaine ? '' : ' réfléchit…'}</span>
    </div>

    <div class="plateau">
      <div>
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

        <div class="panneau" style="padding:14px 16px">
          <h2>Journal</h2>
          <div class="journal">
            ${st.journal.slice(-14).reverse().map((l) => `<div class="l"><b>T${l.tour}</b> · ${l.texte}</div>`).join('')}
          </div>
        </div>
      </div>

      <div>
        ${st.joueurs.map((jj, i) => bancBloc(st, i, `Banc de ${jj.nom}`, i === p && humaine && st.phase === 'MONTAGE')).join('')}
        <div class="panneau"><h2>${PHASES[st.phase]}</h2>${zone}</div>
      </div>

      <div>
        <div class="panneau"><h2>Score de ${j.nom}</h2>${tableauScore(sc[p])}</div>
        <div class="panneau"><h2>Bandeaux du banc</h2>${listeObjectifs(sc[p])}</div>
        <div class="barre-outils">
          <button class="pill" id="undo" ${store.undo ? '' : 'disabled'}>↩ Annuler</button>
          <button class="pill" id="quitter">Quitter</button>
        </div>
      </div>
    </div>
  </div>
  ${pied()}`);

  brancherPartie(st, humaine);
  if (!humaine) setTimeout(() => jouerIA(), Math.max(80, st.cfg.vitesseIA || 400));
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
    <div class="banc" data-banc="${i}">${morceaux.join('')}</div>
  </div>`;
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
  return `<p class="aide" style="margin-bottom:14px">Deux versions te sont proposées, recto et verso.
  Choisis le plan qui ouvrira ton banc — l’autre carte est défaussée.</p>
  <div class="main-cartes">
    ${options.map((o, k) => `<div class="item">
      <div class="carte solo clickable" data-depart="${k}">${renderPlan(o.plan)}</div>
      <div class="lg">Version ${o.carte.version} — face ${o.face + 1}</div>
    </div>`).join('')}
  </div>`;
}

// --- Phase A ---------------------------------------------------------------

function zoneDerushage(st) {
  const options = optionsDerushage(st);
  const bloc = (titre, liste, vide) => `
    <h3>${titre}</h3>
    <div class="main-cartes">${liste.length ? liste : `<div class="aide">${vide}</div>`}</div>`;

  const chutierPL = options.filter((o) => o.source === 'CHUTIER_PL')
    .map((o) => `<div class="item"><div data-derush="${enc(o)}">${renderCarte(o.carte, false, { small: true, clickable: true })}</div></div>`).join('');
  const chutierPM = options.filter((o) => o.source === 'CHUTIER_PMGP')
    .map((o) => `<div class="item"><div data-derush="${enc(o)}">${renderCarte(o.carte, false, { small: true, clickable: true })}</div></div>`).join('');
  const pioches = options.filter((o) => !o.carte)
    .map((o) => `<button class="dos-pioche" data-derush="${enc(o)}">
      <span>Pioche</span><b>${o.source === 'PIOCHE_PL' ? 'Plans Larges' : 'PM / GP'}</b>
      <span>${o.source === 'PIOCHE_PL' ? st.piochePL.length : st.piochePMGP.length} cartes</span></button>`).join('');

  return `<p class="aide">Pioche une carte : dans un des deux chutiers, ou à l’aveugle sur une pioche.</p>
    ${bloc('Chutier Plans Larges', chutierPL, 'Chutier épuisé')}
    ${bloc('Chutier Plans Moyens / Gros Plans', chutierPM, 'Chutier épuisé')}
    ${pioches ? `<h3>Pioches</h3><div class="main-cartes">${pioches}</div>` : ''}`;
}

const enc = (o) => encodeURIComponent(JSON.stringify({ source: o.source, index: o.index }));

// --- Phase B ---------------------------------------------------------------

function zoneMontage(st, p) {
  const carte = st.mains[p][0];
  if (!carte) return '<div class="vide">Aucune carte dérushée.</div>';

  const options = carte.type === 'DOUBLE'
    ? [['GP', moitiesDe(carte).GP], ['PM', moitiesDe(carte).PM]]
    : [['PL', plHalf(carte)]];

  if (!store.formatChoisi && options.length === 1) store.formatChoisi = options[0][0];

  return `<p class="aide" style="margin-bottom:14px">
    ${carte.type === 'DOUBLE'
      ? 'La carte se glisse sous les précédentes : un seul de ses deux plans restera visible. Choisis lequel, puis son emplacement dans ton banc.'
      : 'Un Plan Large ouvre toujours une nouvelle séquence, détachée du reste du montage.'}
  </p>
  <div class="main-cartes">
    ${options.map(([f, plan]) => `
      <div class="item">
        <div class="carte solo clickable ${store.formatChoisi === f ? "sel" : ""}" data-format="${f}">${renderPlan(plan)}</div>
        <div class="lg">${FORMATS[f].label} n°${plan.num}${plan.obj ? ` · ${objLabel(plan.obj)}` : ' · sans bandeau'}</div>
      </div>`).join('')}
  </div>
  ${store.formatChoisi ? '<p class="aide" style="text-align:center;margin-top:12px">Clique sur un emplacement de ton banc.</p>' : ''}`;
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

function listeObjectifs(s) {
  if (!s.lignes.length) return '<p class="aide">Aucun bandeau visible sur le banc.</p>';
  return `<table class="tableau-score">
    ${s.lignes.map((l) => `<tr><td>${objLabel(l.obj)}</td><td>${l.pts}</td></tr>`).join('')}
  </table>`;
}

// --- Interactions ----------------------------------------------------------

function brancherPartie(st, humaine) {
  const q = (s) => app.querySelector(s);

  app.querySelectorAll('[data-depart]').forEach((el) => el.addEventListener('click', () => {
    store.undo = JSON.stringify(st);
    poserDepart(st, st.courant, choixDepart(st, st.courant)[+el.dataset.depart]);
    if (avancer(st)) return terminer();
    vuePartie();
  }));

  app.querySelectorAll('[data-derush]').forEach((el) => el.addEventListener('click', () => {
    const choix = JSON.parse(decodeURIComponent(el.dataset.derush));
    store.undo = JSON.stringify(st);
    derusher(st, st.courant, choix);
    store.formatChoisi = null;
    if (avancer(st)) return terminer();
    vuePartie();
  }));

  app.querySelectorAll('[data-format]').forEach((el) => {
    if (!el.classList.contains('carte')) return;
    el.addEventListener('click', () => { store.formatChoisi = el.dataset.format; vuePartie(); });
  });

  app.querySelectorAll('[data-coup]').forEach((el) => el.addEventListener('click', () => {
    const partiel = JSON.parse(decodeURIComponent(el.dataset.coup));
    const carte = st.mains[st.courant][0];
    store.undo = JSON.stringify(st);
    poser(st, st.courant, { ...partiel, carte });
    store.formatChoisi = null;
    if (avancer(st)) return terminer();
    vuePartie();
  }));

  if (q('#undo')) q('#undo').addEventListener('click', () => {
    if (store.undo) { store.partie = JSON.parse(store.undo); store.undo = null; store.formatChoisi = null; vuePartie(); }
  });
  if (q('#quitter')) q('#quitter').addEventListener('click', () => {
    if (confirm('Quitter la partie en cours ?')) { store.partie = null; location.hash = '#/'; }
  });

  document.onkeydown = humaine ? (e) => {
    if (e.key === 'Escape') { store.formatChoisi = null; vuePartie(); }
  } : null;
}

function jouerIA() {
  const st = store.partie;
  if (!st || st.finie) return;
  const p = st.courant;
  if (st.joueurs[p].type === 'HUMAIN') return;

  if (st.phase === 'DEPART') {
    const d = choisirDepart(st, p); if (d) poserDepart(st, p, d);
  } else if (st.phase === 'DERUSHAGE') {
    const o = choisirDerushage(st, p) || optionsDerushage(st)[0]; if (o) derusher(st, p, o);
  } else {
    const coups = coupsPossibles(st, p);
    if (coups.length) poser(st, p, choisirCoup(st, p) || coups[0]);
    else st.mains[p] = [];
  }
  if (avancer(st)) return terminer();
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
        <div class="banc" style="margin-bottom:12px">
          ${st.bancs[i].sequences.map((seq) => `<div class="sequence">${seq.map((pl) => renderPlan(pl)).join('')}</div>`).join('<div class="ecart"></div>')}
        </div>`).join('')}
    </div>
    <div class="rangee-boutons">
      <button class="cta" style="max-width:320px" id="rejouer">Rejouer</button>
      <button class="pill" data-go="#/">Accueil</button>
      <button class="pill" data-go="#/historique">Historique</button>
    </div>
  </div>
  ${pied()}`);
  app.querySelector('#rejouer').addEventListener('click', lancerPartie);
}

// ===========================================================================
// MATÉRIEL
// ===========================================================================

let materielFiltre = 'DOUBLE';

function vueMateriel() {
  const doubles = buildCartesDoubles();
  const larges = buildPlansLarges();

  let contenu = '';
  if (materielFiltre === 'DOUBLE' || materielFiltre === 'VERSO') {
    const verso = materielFiltre === 'VERSO';
    contenu = `<div class="galerie">${doubles.map((c, i) => `
      <div class="item">${renderCarte(c, verso, { small: true })}
        <div class="lg">Carte ${i + 1} · GP ${c.gpNum} | PM ${c.pmNum}${verso ? ' — verso' : ''}</div>
      </div>`).join('')}</div>`;
  } else if (materielFiltre === 'PL') {
    contenu = `<div class="galerie">${larges.map((c) => `
      <div class="item">${renderCarte(c, false, { small: true })}
        <div class="lg">Plan Large ${c.num}${c.brouillon ? ' · à compléter' : ''}</div>
      </div>`).join('')}</div>`;
  } else if (materielFiltre === 'DEPART') {
    contenu = `<div class="galerie">${DEPARTS.flatMap((d) => d.faces.map((f, k) => `
      <div class="item">
        <div class="carte solo">${renderPlan(plHalf({ ...f, depart: true }))}</div>
        <div class="lg">Version ${d.type} — face ${k + 1}</div>
      </div>`)).join('')}</div>
      <p class="aide" style="margin-top:14px">8 cartes dans la boîte, en 2 versions recto-verso.
      L’appariement des faces est une hypothèse tirée de l’ordre du PDF.</p>`;
  } else {
    contenu = `<table class="tbl">
      <tr><th>#</th><th>Famille</th><th class="num">Minutage</th><th>PM n°</th><th>Éléments du Plan Moyen</th><th>GP n°</th><th>Éléments du Gros Plan</th><th>Bandeau du Gros Plan</th></tr>
      ${SCENES.map((s) => `<tr>
        <td>${s.idx}</td><td>${s.famille}</td><td class="num">${tc(s.tc)}</td>
        <td>${s.pmNum}</td><td>${s.pm.el.map((e) => ELEMENTS[e].label).join(', ') || '—'}</td>
        <td>${s.gpNum}</td><td>${s.gp.el.map((e) => ELEMENTS[e].label).join(', ') || '—'}</td>
        <td>${objLabel(s.gp.obj)}</td></tr>`).join('')}
    </table>`;
  }

  html(`${topbar('#/materiel')}
  <div class="wrap large">
    <div class="panneau">
      <h2>Matériel</h2>
      <p class="aide">50 cartes Plan Moyen / Gros Plan — au recto le Gros Plan à gauche et le Plan Moyen à
      droite, au verso l’inverse, avec les mêmes deux moitiés. 14 Plans Larges, 8 Plans de départ en
      2 versions. Les visuels sont extraits des PDF d’impression ; la case <b>Illustrations</b> de
      l’accueil les remplace au besoin par la lecture nue — minutage, pastilles et bandeau seuls.</p>
      <div class="filtre-barre" style="margin-top:16px">
        ${[['DOUBLE', 'PM / GP — recto'], ['VERSO', 'PM / GP — verso'], ['PL', 'Plans Larges'],
           ['DEPART', 'Plans de départ'], ['TABLE', 'Tableau des scènes']]
          .map(([k, l]) => `<button class="pill" data-f="${k}" style="${materielFiltre === k ? 'background:var(--violet);color:#fff;border-color:var(--violet)' : ''}">${l}</button>`).join('')}
      </div>
      ${contenu}
    </div>
  </div>
  ${pied()}`);

  app.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    materielFiltre = b.dataset.f; vueMateriel();
  }));
}

// ===========================================================================
// RÈGLES
// ===========================================================================

function vueRegles() {
  const c = store.cfg;
  html(`${topbar('#/regles')}
  <div class="wrap">
    <div class="panneau regles">
      <h2>Règles du jeu — v0.13</h2>

      <p>Vous incarnez une monteuse de cinéma. Votre objectif est d’assembler des Cartes Plan dans votre
      <b>banc de montage</b> pour créer la meilleure séquence de film. De 2 à 4 joueuses.</p>

      <h3>Matériel</h3>
      <ul>
        <li>8 cartes <b>Plan de départ</b> (2 versions, recto-verso)</li>
        <li>14 cartes <b>Plan Large</b></li>
        <li>50 cartes <b>Plan Moyen / Gros Plan</b></li>
      </ul>
      <p>Une carte sans jonction est un Plan Large. Une carte à une jonction se divise en un Plan Moyen
      (2/3 de la carte) et un Gros Plan (1/3). Chaque plan porte un <b>cadrage</b>, des <b>personnages</b>
      (Héroïne, Ennemi, Allié) et des <b>éléments</b> (Arme, Objet, Véhicule), plus son minutage.</p>
      <div class="legende-el">
        ${ELEMENT_IDS.map((e) => `<div class="e">${elIcon(e, 30)}<span>${ELEMENTS[e].label}</span></div>`).join('')}
      </div>

      <h3>Mise en place</h3>
      <ul>
        <li>Chaque joueuse reçoit ${c.departProposes} cartes Plan de départ, en pose une dans son banc et défausse l’autre.</li>
        <li>Les Plans Larges forment une pioche et un <b>chutier</b> de ${c.chutierPL || 'autant de cartes que de joueuses'}.</li>
        <li>Les Plans Moyens / Gros Plans forment une pioche et un chutier de ${c.chutierPMGP || 'autant de cartes que de joueuses'}.</li>
        <li>La dernière joueuse à avoir vu un bon film commence — ici, tirage au sort.</li>
      </ul>

      <h3>Phase A — Le Dérushage</h3>
      <p>Chacune à son tour pioche <b>une</b> Carte Plan : dans le chutier des Plans Larges, dans le chutier
      des Plans Moyens / Gros Plans, ou sur la pioche des Plans Moyens / Gros Plans.</p>

      <h3>Phase B — Le Montage</h3>
      <p>Chacune ajoute la carte dérushée à son banc.</p>
      <div class="encart">
        <b>Carte Plan Moyen / Gros Plan.</b> Elle se glisse <b>sous</b> les cartes précédentes en recouvrant
        l’une de ses deux parties : un seul de ses deux plans reste visible, c’est celui qui comptera.
        On ne peut jamais dissimuler entièrement une carte, ni écarter une carte sans la jouer.
      </div>
      <div class="encart">
        <b>Carte Plan Large.</b> Elle représente le climax d’une séquence : la poser oblige à ouvrir une
        <b>nouvelle séquence</b>, non adjacente aux cartes déjà posées. Deux Plans Larges ne peuvent jamais
        se toucher — il faut un Plan Moyen / Gros Plan ou un Raccord entre eux.
      </div>

      <h3>Les Raccords</h3>
      <ul>
        <li><b>Raccord</b> — connecte deux séquences et démultiplie donc la valeur des cartes.
        Il rapporte 1 point par carte de sa séquence.</li>
        <li><b>Générique</b> (Ouverture ou Fermeture) — ouvre ou ferme le film : aucun plan ne peut être
        posé avant ou après lui. Il rapporte 2 points par Carte Raccord du montage.</li>
      </ul>

      <h3>Fin de partie</h3>
      <p>La partie s’arrête quand toutes les joueuses ont posé leur ${c.tours}e plan. On inscrit alors les
      points rapportés par chaque <b>plan visible</b> ; le plus haut total l’emporte.</p>

      <h3>Décompte des bandeaux</h3>
      <table class="tbl">
        <tr><th>Bandeau</th><th>Ce qu’il rapporte</th><th>Portée</th></tr>
        <tr><td><b>n × Raccord</b></td><td>n points par Carte Raccord</td><td>Le montage</td></tr>
        <tr><td><b>n × ◀ Plan ▶</b></td><td>n points par carte</td><td>Sa séquence</td></tr>
        <tr><td><b>n × cadrage</b></td><td>n points par plan de ce cadrage</td><td>${c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence'} ⚙</td></tr>
        <tr><td><b>n × élément</b></td><td>n points par plan portant cet élément</td><td>${c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence'} ⚙</td></tr>
        <tr><td><b>n × deux éléments liés</b></td><td>n points par paire de plans voisins</td><td>Séquence</td></tr>
        <tr><td><b>n × 💀</b></td><td>n points par plan de mort</td><td>${c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence'} ⚙</td></tr>
        <tr><td><b>n × ✕</b></td><td>n points par plan sans personnage</td><td>${c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence'} ⚙</td></tr>
        <tr><td><b>n si élément barré</b></td><td>n points si l’élément est absent</td><td>Le montage</td></tr>
      </table>

      <div class="encart attention">
        <b>Points restés ouverts.</b> Les règles ne fixent la portée que pour le Raccord (« dans sa
        séquence ») et le Générique (« dans le montage ») ; les autres bandeaux sont lus ici sur le montage
        entier, réglable dans <b>Variables</b> ⚙. Restent aussi à confirmer : le sens de pose autorisé
        (les deux bouts d’une séquence, ou la droite seulement), ce que représente le symbole ✕ noir de la
        famille Mort, le rôle exact du minutage, et l’appariement recto-verso des Plans de départ.
      </div>
    </div>
  </div>
  ${pied()}`);
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
  app.querySelector('#reset').addEventListener('click', () => { store.cfg = cloneConfig(DEFAULTS); sauverCfg(); vueVariables(); });
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
        try { store.cfg = Object.assign(cloneConfig(DEFAULTS), JSON.parse(t)); sauverCfg(); vueVariables(); }
        catch { alert('Fichier illisible.'); }
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
