// ---------------------------------------------------------------------------
// EDIT — règles du jeu, versionnées
// ---------------------------------------------------------------------------
// La version des règles est indépendante de la version du site. Elle part de
// la v0.13 fournie par l'auteur ; chaque modification de règle demandée
// l'incrémente (0.13.1, 0.13.2, …).
//
// Marche à suivre pour une modification :
//   1. incrémenter REGLES_VERSION ;
//   2. ajouter une entrée en tête de REGLES_HISTORIQUE ;
//   3. entourer le passage modifié d'un appel à maj('0.13.x', '…') — il
//      s'affiche alors en violet, avec le numéro de version en pastille.
// Les versions précédentes du texte restent lisibles dans l'onglet
// « Versions des règles ».

import { ELEMENTS, ELEMENT_IDS } from './data.js?v=1.15';
import { elIcon } from './icons.js?v=1.15';

// Chaque version garde son texte complet dans `corps` : les règles
// précédentes restent donc consultables telles quelles, et pas seulement
// résumées par leur liste de changements.
export const REGLES_HISTORIQUE = [
  {
    v: '0.13.3',
    date: '12/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_3(c),
    items: [
      'Le recto et le verso d’une carte Plan Moyen / Gros Plan ne portent pas les mêmes plans : le Gros Plan du recto et celui du verso sont deux plans distincts, avec leur propre minutage.',
      'La face jouée se déduit de la pose : la moitié laissée visible se retrouve au bout libre de la carte.',
    ],
  },
  {
    v: '0.13.2',
    date: '12/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_2(c),
    items: [
      'Les Plans de départ ne se tirent pas : chaque joueuse reçoit les deux versions A et B, soit quatre faces au choix. La boîte contient quatre exemplaires de chaque version, un par joueuse.',
    ],
  },
  {
    v: '0.13.1',
    date: '11/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_1(c),
    items: [
      'Le placement des cartes ne dépend pas du minutage : on pose où l’on veut, dans les limites des règles de pose. Le minutage n’impose donc aucun ordre chronologique.',
      'En revanche, certaines cartes rapportent des points en fonction du minutage des plans du montage.',
    ],
  },
  {
    v: '0.13',
    date: '11/08/2026',
    origine: 'Règles fournies par l’auteur',
    corps: (c) => corps_0_13(c),
    items: [
      'Version de référence, reprise telle quelle : matériel, mise en place, phase de Dérushage, phase de Montage, Raccords et Génériques, fin de partie au 10e plan posé.',
      'Aucune modification apportée depuis. Les points laissés ouverts par le texte sont signalés comme tels dans les règles, et traités par des variables réglables — ce sont des interprétations, pas des changements de règle.',
    ],
  },
];

export const REGLES_VERSION = REGLES_HISTORIQUE[0].v;

/** Le texte en vigueur. */
export const corpsRegles = (c) => REGLES_HISTORIQUE[0].corps(c);

/** Le texte tel qu'il était à une version donnée. */
export function corpsVersion(v, c) {
  const e = REGLES_HISTORIQUE.find((x) => x.v === v);
  return e ? e.corps(c) : '';
}

/** Passage modifié : affiché en violet, avec sa version en pastille. */
export function maj(v, html) {
  return `<span class="regle-maj" data-v="v${v}">${html}</span>`;
}

/** Bloc entier modifié : liseré violet et pastille de version. */
export function majBloc(v, html) {
  return `<div class="regle-maj-bloc" data-v="v${v}">${html}</div>`;
}

// --- v0.13 -----------------------------------------------------------------
// Texte de référence. Pour une modification : dupliquer cette fonction en
// corps_0_13_1, y entourer le passage changé d'un maj('0.13.1', …), et
// ajouter l'entrée correspondante en tête de REGLES_HISTORIQUE.

function corps_0_13(c) {
  return `
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
    <li>Chaque joueuse reçoit 2 cartes Plan de départ, en pose une dans son banc et défausse l’autre.</li>
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
    <tr><td><b>n × cadrage</b></td><td>n points par plan de ce cadrage</td><td>${portee(c)} ⚙</td></tr>
    <tr><td><b>n × élément</b></td><td>n points par plan portant cet élément</td><td>${portee(c)} ⚙</td></tr>
    <tr><td><b>n × deux éléments liés</b></td><td>n points par paire de plans voisins</td><td>Séquence</td></tr>
    <tr><td><b>n × 💀</b></td><td>n points par plan de mort</td><td>${portee(c)} ⚙</td></tr>
    <tr><td><b>n × ✕</b></td><td>n points par plan sans personnage</td><td>${portee(c)} ⚙</td></tr>
    <tr><td><b>n si élément barré</b></td><td>n points si l’élément est absent</td><td>Le montage</td></tr>
  </table>

  <div class="encart attention">
    <b>Points laissés ouverts par le texte.</b> Ce ne sont pas des modifications de règle, mais des
    interprétations, chacune réglable dans <b>Variables</b> ⚙ :
    la portée des bandeaux autres que le Raccord et le Générique ; le sens de pose autorisé (les deux
    bouts d’une séquence, ou la droite seulement) ; ce que représente le symbole ✕ noir de la famille
    Mort ; le rôle exact du minutage ; l’appariement recto-verso des Plans de départ.
  </div>`;
}

// --- v0.13.1 ---------------------------------------------------------------
// Ajoute la précision sur le minutage, mise en évidence par maj().

function corps_0_13_1(c) {
  return corps_0_13(c).replace(
    '<h3>Les Raccords</h3>',
    `${majBloc('0.13.1', `<b>Le minutage.</b> Le placement des cartes ne dépend pas du minutage des
    Cartes Plan : on pose où l'on veut, dans les limites des règles de pose ci-dessus, sans avoir à
    respecter l'ordre chronologique du film. En revanche, certaines cartes font gagner des points
    en fonction du minutage des plans du montage.`)}
    <h3>Les Raccords</h3>`);
}

// --- v0.13.2 ---------------------------------------------------------------
// Précise la mise en place : les Plans de départ ne se tirent pas.

function corps_0_13_2(c) {
  return corps_0_13_1(c).replace(
    '<li>Chaque joueuse reçoit 2 cartes Plan de départ, en pose une dans son banc et défausse l’autre.</li>',
    `<li>${maj('0.13.2', `Chaque joueuse reçoit les <b>deux</b> cartes Plan de départ — version A et
    version B, soit <b>quatre faces</b> au choix. Aucun tirage : la boîte contient quatre exemplaires
    de chaque version, un par joueuse. Elle en pose une face dans son banc et défausse le reste.`)}</li>`);
}

// --- v0.13.3 ---------------------------------------------------------------
// Le recto et le verso d'une carte double sont deux plans différents.

function corps_0_13_3(c) {
  return corps_0_13_2(c).replace(
    '<h3>Phase A — Le Dérushage</h3>',
    `${majBloc('0.13.3', `<b>Le recto et le verso.</b> Une carte Plan Moyen / Gros Plan ne porte pas
    les mêmes plans sur ses deux faces : le Gros Plan du recto et celui du verso sont deux plans
    distincts, chacun avec son minutage — on les note « 301R » et « 301V ». ${c.faceSelonPose === false
      ? 'Ici, une carte est toujours jouée sur son recto (réglable dans <b>Variables</b>).'
      : `La face jouée se déduit de la pose : la moitié laissée visible se retrouve au bout libre de
      la carte, donc un Gros Plan accroché à gauche d'une séquence est celui du recto, et à droite
      celui du verso. Réglable dans <b>Variables</b> ⚙.`}`)}
    <h3>Phase A — Le Dérushage</h3>`);
}

const portee = (c) => (c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence');
