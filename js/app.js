// ---------------------------------------------------------------------------
// EDIT — application
// ---------------------------------------------------------------------------

import { VERSION, BUILD_DATE, CHANGELOG } from './version.js';
import {
  ELEMENTS, ELEMENT_IDS, FORMATS, SCENES, PLANS_LARGES, objLabel,
  buildCartesDoubles, buildPlansLarges, halfInfo, plHalf,
} from './data.js';
import { DEFAULTS, SCHEMA, PROFILS_IA, COULEURS_JOUEURS, cloneConfig } from './config.js';
import { elIcon } from './icons.js';
import { renderCarte, renderMoitie, tc } from './cards.js';
import {
  creerPartie, coupsPossibles, poser, finDeTour, scores, classement,
  bancDe, nouvelleGraine, construirePaquet, halvesOf,
} from './engine.js';
import { choisirCoup } from './ai.js';
import { compter, raccorde, SOURCES_LABEL } from './scoring.js';
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
  selection: null,
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

function pied() {
  return `<div class="pied">Version ${VERSION} — compilée le ${BUILD_DATE}</div>`;
}

function html(s) {
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
      Placez vos Plans dans le banc de montage, raccordez, montez le film.
    </div>
  </div>
  <div class="wrap">
    <div class="grid2">
      <div>
        <div class="panneau">
          <h2>Joueurs</h2>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div class="segments" id="seg-n">
              ${[1, 2, 3, 4].map((i) => `<button class="${i === n ? 'on' : ''}" data-n="${i}">${i}</button>`).join('')}
            </div>
            <span class="aide">${n} joueur${n > 1 ? 's' : ''}</span>
          </div>
          <div id="liste-joueurs">
            ${store.joueurs.map((j, i) => ligneJoueur(j, i)).join('')}
          </div>
          <p class="aide" style="margin-bottom:0">
            Chaque joueur monte son propre film sur son banc de montage. Les IA jouent seules —
            la Novice prend le meilleur coup immédiat, l’Équilibrée compare tous ses placements,
            la Stratège anticipe le coup suivant et garde ses bouts de banc ouverts.
          </p>
        </div>

        <div class="panneau">
          <h2>Options de partie</h2>
          <div class="chips">
            ${chip('premierJoueurAleatoire', '1er joueur aléatoire')}
            ${chip('retournement', 'Retournement des cartes')}
            ${chip('planDepart', 'Plan de départ')}
            ${chip('planLargeEnMain', 'Plans Larges dans la pioche')}
            ${chip('bancCommun', 'Banc de montage commun')}
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
            ['mainMax', 'Cartes en main', 1, 10],
            ['tours', 'Nombre de tours', 0, 30],
            ['raccordMin', 'Éléments pour un raccord', 1, 4],
            ['chronoBonus', 'Bonus de chronologie', 0, 10],
          ].map(([k, l, min, max]) => `
            <div class="champ">
              <label>${l}</label>
              <input type="number" data-cfg="${k}" value="${store.cfg[k]}" min="${min}" max="${max}">
            </div>`).join('')}
          <div class="champ">
            <label>Sens de pose</label>
            <select data-cfg="sensPose">
              <option value="bords" ${store.cfg.sensPose === 'bords' ? 'selected' : ''}>Aux deux bouts</option>
              <option value="droite" ${store.cfg.sensPose === 'droite' ? 'selected' : ''}>À droite seulement</option>
              <option value="libre" ${store.cfg.sensPose === 'libre' ? 'selected' : ''}>N’importe où</option>
            </select>
          </div>
          <p class="aide" style="margin-top:14px">
            Toutes les autres variables — valeur de chaque objectif, composition du paquet,
            bonus de film complet — sont dans <b>Variables</b>.
          </p>
        </div>

        <div class="panneau">
          <h2>Les six éléments</h2>
          <div class="legende-el">
            ${ELEMENT_IDS.map((e) => `<div class="e">${elIcon(e, 30)}<span>${ELEMENTS[e].label}</span></div>`).join('')}
          </div>
          <p class="aide" style="margin-bottom:0">
            Deux plans voisins qui partagent au moins ${store.cfg.raccordMin} élément${store.cfg.raccordMin > 1 ? 's' : ''}
            forment un <b>raccord</b>. C’est le cœur du montage.
          </p>
        </div>

        <div class="panneau">
          <h2>Le paquet</h2>
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
      store.joueurs.push({ nom: ['Val', 'Justine', 'Claude', 'Marie-Laure'][i] || `Joueur ${i + 1}`, couleur: COULEURS_JOUEURS[i], type: 'EQUILIBRE' });
    }
    store.joueurs.length = cible;
    sauverJoueurs(); vueAccueil();
  }));

  brancherJoueurs();
  brancherChips();
  brancherChamps(vueAccueil);

  app.querySelector('#graine').addEventListener('change', (e) => {
    store.cfg.graine = e.target.value.trim(); sauverCfg();
  });
  app.querySelector('#go').addEventListener('click', lancerPartie);
}

function ligneJoueur(j, i) {
  return `<div class="ligne-joueur" data-i="${i}">
    <input type="text" value="${j.nom}" data-champ="nom" maxlength="16">
    <div class="puces">
      ${COULEURS_JOUEURS.map((c) => `<div class="puce ${c === j.couleur ? 'on' : ''}" style="background:${c}" data-couleur="${c}"></div>`).join('')}
    </div>
    <select data-champ="type">
      <option value="HUMAIN" ${j.type === 'HUMAIN' ? 'selected' : ''}>Humain</option>
      ${Object.values(PROFILS_IA).map((p) => `<option value="${p.id}" ${j.type === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
    </select>
  </div>`;
}

function brancherJoueurs() {
  app.querySelectorAll('.ligne-joueur').forEach((row) => {
    const i = +row.dataset.i;
    row.querySelectorAll('[data-champ]').forEach((el) => el.addEventListener('change', () => {
      store.joueurs[i][el.dataset.champ] = el.value;
      sauverJoueurs();
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

function resumePaquet() {
  const { doubles, larges } = construirePaquet(store.cfg);
  const departs = larges.filter((c) => c.depart).length;
  return `<table class="tbl">
    <tr><td>Cartes doubles (Gros Plan | Plan Moyen)</td><td class="num">${doubles.length}</td></tr>
    <tr><td>Plans Larges</td><td class="num">${larges.length - departs}</td></tr>
    <tr><td>Plans de départ</td><td class="num">${departs}</td></tr>
    <tr><td><b>Total en pioche</b></td><td class="num"><b>${doubles.length + (store.cfg.planLargeEnMain ? larges.length - departs : 0)}</b></td></tr>
  </table>`;
}

// ===========================================================================
// PARTIE
// ===========================================================================

function lancerPartie() {
  store.partie = creerPartie(store.joueurs.map((j) => ({ ...j })), cloneConfig(store.cfg), store.cfg.graine || nouvelleGraine());
  store.selection = null;
  store.undo = null;
  location.hash = '#/partie';
}

function vuePartie() {
  const st = store.partie;
  if (!st) { location.hash = '#/'; return; }
  if (st.finie) return vueFin();

  const p = st.courant;
  const j = st.joueurs[p];
  const humain = j.type === 'HUMAIN';
  const sc = scores(st);

  html(`${topbar('#/partie')}
  <div class="wrap large">
    <div class="bandeau-tour">
      <span>Tour <b>${st.tour}${st.cfg.tours ? ` / ${st.cfg.tours}` : ''}</b></span>
      <span>·</span>
      <span>Graine <b>${st.seed}</b></span>
      <span>·</span>
      <span>Pioche <b>${st.pioche.length}</b></span>
      <span>·</span>
      <span style="color:${j.couleur}"><b>${j.nom}</b> ${humain ? '— à toi de jouer' : '— réfléchit…'}</span>
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
              ${sc[i].longueur} plan${sc[i].longueur > 1 ? 's' : ''} · ${sc[i].nbRaccords} raccord${sc[i].nbRaccords > 1 ? 's' : ''} · ${st.mains[i].length} en main
            </div>
            ${i === p ? '<span class="badge-tour">À lui de jouer</span>' : ''}
          </div>`).join('')}

        <div class="panneau" style="padding:14px 16px">
          <h2>Journal</h2>
          <div class="journal">
            ${st.journal.slice(-14).reverse().map((l) => `<div class="l"><b>T${l.tour}</b> · ${l.texte}</div>`).join('')}
          </div>
        </div>
      </div>

      <div>
        ${st.cfg.bancCommun ? bancBloc(st, 0, 'Banc de montage commun') : st.joueurs.map((jj, i) => bancBloc(st, i, `Banc de ${jj.nom}`)).join('')}

        <div class="panneau">
          <h2>Main de ${j.nom}</h2>
          ${humain ? mainBloc(st, p) : '<div class="vide">L’IA joue…</div>'}
          ${humain ? barreActions(st) : ''}
        </div>
      </div>

      <div>
        <div class="panneau">
          <h2>Score de ${j.nom}</h2>
          ${tableauScore(sc[p])}
        </div>
        <div class="panneau">
          <h2>Objectifs sur le banc</h2>
          ${listeObjectifs(sc[p])}
        </div>
        <div class="barre-outils">
          <button class="pill" id="undo" ${store.undo ? '' : 'disabled'}>↩ Annuler</button>
          <button class="pill" id="quitter">Quitter</button>
        </div>
      </div>
    </div>
  </div>
  ${pied()}`);

  brancherPartie(st, humain);

  if (!humain) {
    setTimeout(() => jouerIA(), Math.max(120, st.cfg.vitesseIA || 400));
  }
}

/** Les plans d'un banc, avec la marque verte aux jonctions qui raccordent. */
function bancPlans(banc, cfg, iconSize = 16) {
  return banc.map((h, k) => {
    const suite = k < banc.length - 1
      ? (raccorde(h, banc[k + 1], cfg) ? '<div class="raccord-marque" title="Raccord"></div>' : '<div class="coupe-marque"></div>')
      : '';
    return renderMoitie(h, { iconSize }) + suite;
  }).join('');
}

function bancBloc(st, i, titre) {
  const banc = bancDe(st, i);
  const cfg = st.cfg;
  const monTour = st.courant === i || cfg.bancCommun;
  const sel = store.selection;
  const peutPoser = monTour && sel && st.joueurs[st.courant].type === 'HUMAIN';

  const morceaux = [];
  if (peutPoser && (cfg.sensPose === 'bords' || cfg.sensPose === 'libre') && banc.length) {
    morceaux.push(`<div class="fente" data-pos="0"></div>`);
  }
  banc.forEach((h, k) => {
    morceaux.push(renderMoitie(h, { iconSize: 18 }));
    if (k < banc.length - 1) {
      const r = raccorde(h, banc[k + 1], cfg);
      morceaux.push(r ? '<div class="raccord-marque" title="Raccord"></div>' : '<div class="coupe-marque"></div>');
      if (peutPoser && cfg.sensPose === 'libre') morceaux.push(`<div class="fente" data-pos="${k + 1}"></div>`);
    }
  });
  if (peutPoser) morceaux.push(`<div class="fente" data-pos="${banc.length}"></div>`);
  if (!banc.length && !peutPoser) morceaux.push('<div class="vide" style="color:#8a8496">Banc vide</div>');

  return `<div class="panneau">
    <h2>${titre}</h2>
    <div class="banc" data-banc="${i}">${morceaux.join('')}</div>
  </div>`;
}

function mainBloc(st, p) {
  const sel = store.selection;
  return `<div class="main-cartes">
    ${st.mains[p].map((c) => {
      const verso = sel && sel.carteId === c.id ? sel.verso : false;
      return renderCarte(c, verso, {
        small: true, clickable: true,
        selected: sel && sel.carteId === c.id,
      });
    }).join('') || '<div class="vide">Plus de cartes en main</div>'}
  </div>`;
}

function barreActions(st) {
  const sel = store.selection;
  const cfg = st.cfg;
  if (!sel) return `<p class="aide" style="text-align:center;margin:10px 0 0">Choisis une carte, puis clique sur l’emplacement voulu dans ton banc.</p>`;
  const carte = st.mains[st.courant].find((c) => c.id === sel.carteId);
  const peutRetourner = cfg.retournement && carte && carte.type !== 'PL';
  return `<div class="barre-outils" style="justify-content:center;margin-top:12px">
    ${peutRetourner ? `<button class="pill" id="flip">⟲ Retourner la carte</button>` : ''}
    ${cfg.sensPose !== 'libre' ? `
      <button class="pill" data-poser="gauche" ${cfg.sensPose === 'droite' ? 'disabled' : ''}>◀ Poser à gauche</button>
      <button class="pill" data-poser="droite">Poser à droite ▶</button>` : ''}
    <button class="pill" id="deselect">Annuler la sélection</button>
  </div>`;
}

function tableauScore(s) {
  const lignes = Object.entries(s.detail).filter(([, v]) => v !== 0);
  return `<table class="tableau-score">
    ${lignes.map(([k, v]) => `<tr><td>${SOURCES_LABEL[k]}</td><td>${v > 0 ? '+' : ''}${v}</td></tr>`).join('') || '<tr><td class="aide">Aucun point pour l’instant</td><td>0</td></tr>'}
    <tr class="total"><td>Total</td><td>${s.total}</td></tr>
  </table>`;
}

function listeObjectifs(s) {
  if (!s.lignes.length) return '<p class="aide">Aucun bandeau d’objectif posé.</p>';
  return `<table class="tableau-score">
    ${s.lignes.map((l) => `<tr><td>${objLabel(l.obj)}</td><td>${l.pts}</td></tr>`).join('')}
  </table>`;
}

function brancherPartie(st, humain) {
  const q = (s) => app.querySelector(s);

  app.querySelectorAll('.carte.clickable').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.carte;
    if (store.selection && store.selection.carteId === id) store.selection = null;
    else store.selection = { carteId: id, verso: false };
    vuePartie();
  }));

  app.querySelectorAll('.fente').forEach((el) => el.addEventListener('click', () => {
    const pos = +el.dataset.pos;
    jouerHumain({ pos, cote: 'libre' });
  }));

  app.querySelectorAll('[data-poser]').forEach((el) => el.addEventListener('click', () => {
    jouerHumain({ cote: el.dataset.poser, pos: 0 });
  }));

  if (q('#flip')) q('#flip').addEventListener('click', () => {
    store.selection.verso = !store.selection.verso; vuePartie();
  });
  if (q('#deselect')) q('#deselect').addEventListener('click', () => { store.selection = null; vuePartie(); });
  if (q('#undo')) q('#undo').addEventListener('click', () => {
    if (store.undo) { store.partie = JSON.parse(store.undo); store.undo = null; store.selection = null; vuePartie(); }
  });
  if (q('#quitter')) q('#quitter').addEventListener('click', () => {
    if (confirm('Quitter la partie en cours ?')) { store.partie = null; location.hash = '#/'; }
  });

  if (humain) {
    document.onkeydown = (e) => {
      if (e.key === 'r' || e.key === 'R') { if (store.selection) { store.selection.verso = !store.selection.verso; vuePartie(); } }
      if (e.key === 'Escape') { store.selection = null; vuePartie(); }
    };
  } else document.onkeydown = null;
}

function jouerHumain(cible) {
  const st = store.partie;
  if (!store.selection) return;
  const carte = st.mains[st.courant].find((c) => c.id === store.selection.carteId);
  if (!carte) return;
  store.undo = JSON.stringify(st);
  poser(st, st.courant, { carte, verso: store.selection.verso, cote: cible.cote, pos: cible.pos });
  store.selection = null;
  if (finDeTour(st)) return terminer();
  vuePartie();
}

function jouerIA() {
  const st = store.partie;
  if (!st || st.finie) return;
  const p = st.courant;
  if (st.joueurs[p].type === 'HUMAIN') return;
  const coups = coupsPossibles(st, p);
  if (coups.length) {
    const coup = choisirCoup(st, p) || coups[0];
    poser(st, p, coup);
  }
  if (finDeTour(st)) return terminer();
  vuePartie();
}

function terminer() {
  const st = store.partie;
  const cl = classement(st);
  store.historique.unshift({
    date: new Date().toISOString(),
    seed: st.seed,
    joueurs: st.joueurs.map((j) => ({ nom: j.nom, type: j.type, couleur: j.couleur })),
    scores: cl.map((c) => ({ nom: c.joueur.nom, total: c.total, raccords: c.nbRaccords, longueur: c.longueur })),
    tours: st.tour - 1,
    cfg: { mainMax: st.cfg.mainMax, tours: st.cfg.tours, raccordMin: st.cfg.raccordMin, sensPose: st.cfg.sensPose },
  });
  store.historique = store.historique.slice(0, 60);
  LS.set('historique', store.historique);
  vueFin();
}

function vueFin() {
  const st = store.partie;
  const cl = classement(st);
  html(`${topbar('#/partie')}
  <div class="wrap">
    <div class="hero"><h1 style="font-size:2.2rem;letter-spacing:.12em">FIN DU MONTAGE</h1>
      <div class="credits">${cl[0].joueur.nom} l’emporte avec <b>${cl[0].total} points</b>.</div>
    </div>
    <div class="panneau">
      <h2>Classement</h2>
      <table class="tbl">
        <tr><th>#</th><th>Joueur</th><th>Profil</th><th class="num">Plans</th><th class="num">Raccords</th><th class="num">Score</th></tr>
        ${cl.map((c, i) => `<tr>
          <td>${i + 1}</td>
          <td><span class="point-couleur" style="background:${c.joueur.couleur};display:inline-block;margin-right:6px"></span>${c.joueur.nom}</td>
          <td>${c.joueur.type === 'HUMAIN' ? 'Humain' : PROFILS_IA[c.joueur.type].label}</td>
          <td class="num">${c.longueur}</td><td class="num">${c.nbRaccords}</td>
          <td class="num"><b>${c.total}</b></td>
        </tr>`).join('')}
      </table>
    </div>
    <div class="grid2">
      ${cl.map((c) => `<div class="panneau"><h2>Détail — ${c.joueur.nom}</h2>${tableauScore(c)}</div>`).join('')}
    </div>
    <div class="panneau">
      <h2>Les bancs</h2>
      ${st.cfg.bancCommun
        ? `<div class="banc">${bancPlans(st.bancCommun, st.cfg)}</div>`
        : st.joueurs.map((j, i) => `<h3>${j.nom}</h3><div class="banc" style="margin-bottom:12px">${bancPlans(st.bancs[i], st.cfg)}</div>`).join('')}
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
  if (materielFiltre === 'DOUBLE') {
    contenu = `<div class="galerie">${doubles.map((c, i) => `
      <div class="item">
        ${renderCarte(c, false, { small: true })}
        <div class="lg">Carte ${i + 1} · GP ${c.gpNum} | PM ${c.pmNum}</div>
      </div>`).join('')}</div>`;
  } else if (materielFiltre === 'VERSO') {
    contenu = `<div class="galerie">${doubles.map((c, i) => `
      <div class="item">
        ${renderCarte(c, true, { small: true })}
        <div class="lg">Carte ${i + 1} — verso</div>
      </div>`).join('')}</div>`;
  } else if (materielFiltre === 'PL') {
    contenu = `<div class="galerie">${larges.map((c) => `
      <div class="item">
        ${renderCarte(c, false, { small: true })}
        <div class="lg">Plan Large ${c.num}${c.depart ? ' · départ' : ''}${c.brouillon ? ' · à compléter' : ''}</div>
      </div>`).join('')}</div>`;
  } else {
    contenu = `<table class="tbl">
      <tr><th>#</th><th>Famille</th><th class="num">Minutage</th><th>PM n°</th><th>Éléments PM</th><th>GP n°</th><th>Éléments GP</th><th>Objectif du Gros Plan</th></tr>
      ${SCENES.map((s) => `<tr>
        <td>${s.idx}</td><td>${s.famille}</td><td class="num">${tc(s.tc)}</td>
        <td>${s.pmNum}</td><td>${s.pm.el.map((e) => ELEMENTS[e].label).join(', ') || '—'}</td>
        <td>${s.gpNum}</td><td>${s.gp.el.map((e) => ELEMENTS[e].label).join(', ') || '—'}</td>
        <td>${objLabel(s.gp.obj)}</td>
      </tr>`).join('')}
    </table>`;
  }

  html(`${topbar('#/materiel')}
  <div class="wrap large">
    <div class="panneau">
      <h2>Matériel</h2>
      <p class="aide">
        50 cartes recto-verso — au recto le Gros Plan à gauche et le Plan Moyen à droite, au verso l’inverse,
        avec les mêmes deux moitiés. 18 Plans Larges, dont 4 Plans de départ. Les illustrations ne sont pas
        reproduites : seuls le minutage, les pastilles d’éléments et le bandeau d’objectif comptent pour jouer.
      </p>
      <div class="filtre-barre" style="margin-top:16px">
        ${[['DOUBLE', 'Cartes doubles — recto'], ['VERSO', 'Cartes doubles — verso'], ['PL', 'Plans Larges'], ['TABLE', 'Tableau des scènes']]
          .map(([k, l]) => `<button class="pill ${materielFiltre === k ? 'actif' : ''}" data-f="${k}" style="${materielFiltre === k ? 'background:var(--violet);color:#fff;border-color:var(--violet)' : ''}">${l}</button>`).join('')}
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
      <h2>Règles du jeu</h2>

      <div class="encart attention">
        <b>Règles reconstituées.</b> Le document de règles n’était pas joint aux fichiers partagés :
        ce qui suit est déduit du matériel (bandeaux d’objectif, minutages, formats, répartition v0.13).
        Tous les points marqués d’un ⚙ sont des variables ajustables dans l’écran <b>Variables</b> —
        il suffira de les recaler quand les règles officielles seront fournies.
      </div>

      <h3>But du jeu</h3>
      <p>Chaque joueur monte son film sur son <b>banc de montage</b>, une ligne de plans posés les uns
      à la suite des autres. On marque des points en remplissant les objectifs inscrits sur les bandeaux
      des plans posés. Le meilleur monteur gagne.</p>

      <h3>Le matériel</h3>
      <ul>
        <li><b>Plan Large</b> — une carte pleine largeur, une seule face.</li>
        <li><b>Carte double</b> — deux moitiés qui se rejoignent : un <b>Gros Plan</b> (un tiers de carte)
        et un <b>Plan Moyen</b> (deux tiers). L’ensemble fait la taille d’un Plan Large. Recto : Gros Plan
        à gauche, Plan Moyen à droite. Verso : l’inverse, mêmes deux moitiés.</li>
        <li>Chaque moitié porte son <b>minutage</b> en haut à gauche, de 00:00 à 99:00 : la place de ce plan
        dans le film.</li>
        <li>Seuls les <b>Gros Plans</b> et quelques Plans Larges portent un <b>bandeau d’objectif</b>.</li>
      </ul>

      <h3>Les six éléments</h3>
      <div class="legende-el">
        ${ELEMENT_IDS.map((e) => `<div class="e">${elIcon(e, 30)}<span>${ELEMENTS[e].label}</span></div>`).join('')}
      </div>
      <p>Les pastilles en bas à gauche de chaque plan disent quels éléments y figurent, de un à six.</p>

      <h3>Mise en place</h3>
      <ul>
        <li>Chaque joueur reçoit un <b>Plan de départ</b>, posé sur son banc. ⚙</li>
        <li>On mélange le reste du paquet et chacun prend <b>${c.mainDepart} cartes</b> en main. ⚙</li>
        <li>Le premier joueur est ${c.premierJoueurAleatoire ? 'tiré au sort' : 'le premier de la liste'}. ⚙</li>
      </ul>

      <h3>Tour de jeu</h3>
      <ol>
        <li>Le joueur choisit une carte de sa main${c.retournement ? ' et sa face (recto ou verso)' : ''}.</li>
        <li>Il la pose ${c.sensPose === 'bords' ? '<b>à gauche ou à droite</b> de son banc' : c.sensPose === 'droite' ? '<b>à droite</b> de son banc' : '<b>où il veut</b> dans son banc'}. ⚙</li>
        <li>Il complète sa main à <b>${c.mainMax} cartes</b>. ⚙</li>
      </ol>

      <div class="encart">
        <b>Le raccord.</b> Deux plans voisins qui partagent au moins
        <b>${c.raccordMin} élément${c.raccordMin > 1 ? 's' : ''}</b> forment un <b>raccord</b> ⚙ :
        la jonction s’allume en vert sur le banc. La moitié « Raccord » raccorde avec n’importe quoi
        ${c.raccordJoker ? '(actif)' : '(désactivé)'}. ⚙
      </div>

      <h3>Fin de partie</h3>
      <p>La partie s’arrête ${c.tours > 0 ? `après <b>${c.tours} tours</b>` : 'quand la pioche est épuisée'}
      ⚙, ou dès que plus personne n’a de carte en main. On décompte alors.</p>

      <h3>Décompte</h3>
      <p>Chaque bandeau posé sur le banc est évalué sur l’ensemble du film monté :</p>
      <table class="tbl">
        <tr><th>Bandeau</th><th>Ce qu’il rapporte</th></tr>
        <tr><td><b>n × Raccord</b></td><td>n points par raccord du film</td></tr>
        <tr><td><b>n × ◀ Plan ▶</b></td><td>n points par plan directement voisin de la carte porteuse</td></tr>
        <tr><td><b>n × Plan Large / Plan Moyen / Gros Plan</b></td><td>n points par plan de ce format dans le film</td></tr>
        <tr><td><b>n × élément</b></td><td>n points par plan qui porte cet élément</td></tr>
        <tr><td><b>n × deux éléments liés</b></td><td>n points par paire de plans voisins portant ces deux éléments</td></tr>
        <tr><td><b>n × 💀</b></td><td>n points par plan de mort</td></tr>
        <tr><td><b>n × ✕</b></td><td>n points par plan sans aucun personnage</td></tr>
        <tr><td><b>n si élément barré</b></td><td>n points si cet élément n’apparaît nulle part dans le film</td></tr>
      </table>
      <p style="margin-top:14px">S’y ajoutent, si elles sont activées ⚙ : les points fixes par raccord
      (${c.raccordPoints}), le bonus de chronologie (${c.chronoBonus} par paire de plans dans l’ordre du film
      et ${c.chronoMalus} de malus par paire à contresens), les points de pose (${c.pointsParPlan} par plan)
      et le bonus de film complet (${c.bonusFilmComplet} points à partir de ${c.longueurCible} plans).</p>

      <h3>À confirmer avec les règles officielles</h3>
      <ul>
        <li>Le nombre exact d’éléments partagés qui fait un raccord.</li>
        <li>Le rôle du minutage : simple décor, contrainte de pose, ou source de points.</li>
        <li>Le sens de pose autorisé et la possibilité d’insérer un plan au milieu du banc.</li>
        <li>Ce que représente exactement le symbole ✕ noir des bandeaux de la famille Mort.</li>
        <li>Le nom des six éléments — les libellés actuels sont provisoires.</li>
      </ul>
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
      <p class="aide">Tout ce qui pilote le déroulé et le décompte. Les changements sont enregistrés
      et s’appliquent à la prochaine partie comme aux campagnes du Laboratoire.</p>
      <div class="barre-outils" style="margin-top:14px">
        <button class="pill" id="reset">↺ Revenir aux valeurs par défaut</button>
        <button class="pill" id="export">Exporter en JSON</button>
        <button class="pill" id="import">Importer</button>
      </div>
    </div>

    <div class="grid2">
      ${SCHEMA.map((g) => `
        <div class="panneau">
          <h2>${g.groupe}</h2>
          ${g.champs.map((f) => champ(f)).join('')}
        </div>`).join('')}

      <div class="panneau">
        <h2>Objectifs pris en compte</h2>
        <p class="aide" style="margin-bottom:12px">Décocher un type de bandeau le neutralise :
        pratique pour mesurer sa contribution réelle au score.</p>
        <div class="chips">
          ${Object.keys(store.cfg.objectifsActifs).map((k) => {
            const on = store.cfg.objectifsActifs[k];
            return `<label class="chip ${on ? 'on' : ''}"><input type="checkbox" data-obj="${k}" ${on ? 'checked' : ''}>${SOURCES_LABEL[k] || k}</label>`;
          }).join('')}
        </div>
      </div>

      <div class="panneau">
        <h2>Familles de scènes</h2>
        <p class="aide" style="margin-bottom:12px">Retirer une famille du paquet.</p>
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
    store.cfg = cloneConfig(DEFAULTS); sauverCfg(); vueVariables();
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
  let moities = 0;
  for (const c of doubles) {
    for (const h of [halfInfo(c.gpScene, 'GP'), halfInfo(c.pmScene, 'PM')]) {
      moities++; for (const e of h.el) compte[e]++;
    }
  }
  for (const c of larges) { moities++; for (const e of c.el) compte[e]++; }
  const max = Math.max(...Object.values(compte)) || 1;
  return `<h3>Éléments dans le paquet <span class="aide">(${moities} plans)</span></h3>
  <div class="barres">
    ${ELEMENT_IDS.map((e) => `
      <div class="barre-l">
        <span style="display:flex;align-items:center;gap:8px">${elIcon(e, 22)} ${ELEMENTS[e].label}</span>
        <div class="piste"><div class="jauge" style="width:${(compte[e] / max) * 100}%"></div></div>
        <span class="val">${compte[e]}</span>
      </div>`).join('')}
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
      <p class="aide">Rejoue des centaines de parties avec les variables courantes et les profils d’IA
      choisis sur l’accueil. Aucune interface, aucun humain : uniquement des chiffres.</p>
      <div class="barre-outils" style="margin-top:16px">
        <span class="info">Table : ${store.joueurs.map((j) => `${j.nom} (${j.type === 'HUMAIN' ? 'remplacé par Équilibré' : PROFILS_IA[j.type].label.replace('IA — ', '')})`).join(' · ')}</span>
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
  const res = await campagne(joueurs, cloneConfig(store.cfg), laboNb, {
    onProgress: (fait, total) => { if (barre) barre.style.width = `${(fait / total) * 100}%`; },
  });
  store.labo = res;
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
      ${tuile('Longueur du film', t(r.longueur.moy), 'plans par banc', 'vert')}
      ${tuile('Raccords', t(r.raccords.moy), 'par banc')}
      ${tuile('Tours joués', t(r.tours.moy), 'par partie', 'orange')}
      ${tuile('Parties serrées', `${Math.round(r.tauxSerre * 100)} %`, '3 points ou moins d’écart', 'vert')}
      ${tuile('Égalités', `${Math.round(r.tauxEgalite * 100)} %`, 'en tête')}
      ${tuile('Écart 1er / dernier', t(r.ecartVainqueur.moy), `max ${r.ecartVainqueur.max}`, 'orange')}
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
      <p class="aide" style="margin-top:10px">Avec un premier joueur aléatoire, des taux de victoire
      qui s’écartent nettement de ${Math.round(100 / r.parSiege.length)} % signalent un déséquilibre de position
      ou de profil.</p>
    </div>

    <div class="panneau">
      <h2>Force des profils d’IA</h2>
      <div class="barres">
        ${r.profils.map((p) => `
          <div class="barre-l">
            <span>${PROFILS_IA[p.type] ? PROFILS_IA[p.type].label : p.type}</span>
            <div class="piste"><div class="jauge" style="width:${Math.min(100, p.taux * 100)}%"></div></div>
            <span class="val">${Math.round(p.taux * 100)} %</span>
          </div>`).join('')}
      </div>
      <p class="aide" style="margin-top:10px">Taux de victoire par profil. Si le Stratège ne bat pas
      nettement le Novice, les décisions du jeu pèsent peu — c’est le premier signal d’équilibrage à corriger.</p>
    </div>
  </div>`;
}

function tuile(k, v, s, cls = '') {
  return `<div class="tuile ${cls}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
}

// ===========================================================================
// HISTORIQUE
// ===========================================================================

function vueHistorique() {
  const h = store.historique;
  html(`${topbar('#/historique')}
  <div class="wrap">
    <div class="panneau">
      <h2>Historique des parties</h2>
      ${h.length ? `<table class="tbl">
        <tr><th>Date</th><th>Graine</th><th>Joueurs</th><th class="num">Tours</th><th>Scores</th></tr>
        ${h.map((g) => `<tr>
          <td>${new Date(g.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${g.seed}</td>
          <td>${g.joueurs.length}</td>
          <td class="num">${g.tours}</td>
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

// ===========================================================================
// VERSIONS
// ===========================================================================

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
  const h = location.hash || '#/';
  document.onkeydown = null;
  (ROUTES[h] || vueAccueil)();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
