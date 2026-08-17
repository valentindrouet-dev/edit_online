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

import { ELEMENTS, ELEMENT_IDS } from './data.js?v=1.26';
import { elIcon } from './icons.js?v=1.26';

// Chaque version garde son texte complet dans `corps` : les règles
// précédentes restent donc consultables telles quelles, et pas seulement
// résumées par leur liste de changements.
export const REGLES_HISTORIQUE = [
  {
    v: '0.13.12',
    date: '15/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_12(c),
    items: [
      'Une Carte Raccord relie : posée entre deux cartes, elle raccorde forcément leurs séquences.',
      'Elle ne se pose donc nulle part ailleurs — ni au bout d’une séquence, ni pour en ouvrir une. Une séquence qui commencerait par un Raccord ne relierait rien : cette configuration n’existe pas.',
    ],
  },
  {
    v: '0.13.11',
    date: '15/08/2026',
    origine: 'Correction demandée par l’auteur',
    corps: (c) => corps_0_13_11(c),
    items: [
      'Une carte Plan Moyen / Gros Plan porte son Plan Moyen à gauche et son Gros Plan à droite sur le recto ; le verso, retourné autour de l’axe vertical, les échange.',
      'La face jouée suit : un Gros Plan accroché à gauche d’une séquence est celui du verso, et à droite celui du recto. C’est l’inverse de ce qui était écrit.',
    ],
  },
  {
    v: '0.13.10',
    date: '15/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_10(c),
    items: [
      'Le tour d’une joueuse est d’un seul tenant : elle dérushe, elle monte, puis elle passe la main. On suit ainsi son coup entier, carte prise et carte posée.',
      'Le texte imprimé décrit l’autre ordre, par phases : toutes dérushent, puis toutes montent. Il reste disponible dans Variables.',
    ],
  },
  {
    v: '0.13.9',
    date: '15/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_9(c),
    items: [
      'Les joueuses jouent l’une après l’autre, et chaque coup se voit : la carte quitte sa pioche, rejoint le banc, et la pioche recharge le chutier.',
      'La première joueuse est tirée au sort, ou désignée avant la partie.',
    ],
  },
  {
    v: '0.13.8',
    date: '13/08/2026',
    origine: 'Refonte demandée par l’auteur',
    corps: (c) => corps_0_13_8(c),
    items: [
      'Chaque bandeau porte sa propre portée : il compte parmi les cartes placées avant lui, après lui, dans sa séquence, ou dans le montage entier.',
      'Les flèches du bandeau la disent : « ◀ Héroïne » avant, « Héroïne ▶ » après, « ◀ Héroïne ▶ » dans la séquence, « Héroïne » tout court dans le montage.',
      'Le bandeau « avant / après cette carte » n’est plus un type à part : c’est la portée d’un bandeau ordinaire.',
    ],
  },
  {
    v: '0.13.7',
    date: '13/08/2026',
    origine: 'Nouveaux pouvoirs demandés par l’auteur',
    corps: (c) => corps_0_13_7(c),
    items: [
      'Nouveau bandeau « n si aucun plan à XX:00 dans le montage » : n points si aucun plan du montage ne porte ce minutage. À 00:00, il vise les Raccords et les Génériques.',
      'Le même bandeau se règle aussi en « aucun plan avant XX:00 » et « aucun plan après XX:00 ».',
    ],
  },
  {
    v: '0.13.6',
    date: '13/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_6(c),
    items: [
      'Un Plan de départ n’est pas un Plan Large. C’est un plan comme un autre pour tout ce qui compte des cartes du montage, mais aucun bandeau de cadrage ne le vise, et aucun ne le désigne.',
      'La partie s’arrête quand chaque banc compte dix plans, Plan de départ compris — il reste donc neuf plans à monter.',
    ],
  },
  {
    v: '0.13.5',
    date: '12/08/2026',
    origine: 'Précisions et nouveau pouvoir demandés par l’auteur',
    corps: (c) => corps_0_13_5(c),
    items: [
      'Un plan peut porter plusieurs fois la même icône — deux armes, deux véhicules. Chaque icône compte pour elle-même.',
      'Le bandeau de couple ne se lit plus entre deux plans voisins : il apparie les icônes réunies dans sa portée. Quatre icônes font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes en demande une de chaque.',
      'Nouveau bandeau « n × <icône ou cadrage> avant / après cette carte » : n points par plan du montage placé strictement avant — ou après — la carte porteuse et portant l’icône, ou du cadrage, visé.',
    ],
  },
  {
    v: '0.13.4',
    date: '12/08/2026',
    origine: 'Nouveaux pouvoirs demandés par l’auteur',
    corps: (c) => corps_0_13_4(c),
    items: [
      'Nouveau bandeau « n × ◀ Plan ▶ avant / après XX:00 » : n points par plan du montage dont le minutage est strictement antérieur (ou postérieur) au seuil indiqué.',
      'Nouveau bandeau « n si le montage est dans l’ordre » : n points si, lu de gauche à droite, chaque minutage du montage est supérieur ou égal à celui de son voisin de gauche.',
    ],
  },
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

// --- v0.13.4 ---------------------------------------------------------------
// Deux bandeaux qui lisent le minutage du montage.

function corps_0_13_4(c) {
  return corps_0_13_3(c).replace(
    '<tr><td><b>n si élément barré</b></td><td>n points si l’élément est absent</td><td>Le montage</td></tr>',
    `<tr><td><b>n si élément barré</b></td><td>n points si l’élément est absent</td><td>Le montage</td></tr>
    ${maj('0.13.4', `<tr><td><b>n × ◀ Plan ▶ avant / après XX:00</b></td>
      <td>n points par plan dont le minutage est <b>strictement</b> antérieur (ou postérieur) au seuil</td>
      <td>Le montage</td></tr>
    <tr><td><b>n si montage dans l’ordre</b></td>
      <td>n points si, lu de gauche à droite, chaque minutage est supérieur ou égal à celui de son
      voisin de gauche${c.chronoIgnoreZero ? ' — les plans à 00:00 sont neutres' : ''}</td>
      <td>Le montage</td></tr>`)}`);
}

// --- v0.13.5 ---------------------------------------------------------------
// Icônes en plusieurs exemplaires, couples appariés, pouvoir de position.

function corps_0_13_5(c) {
  return corps_0_13_4(c)
    .replace(
      '<tr><td><b>n × deux éléments liés</b></td><td>n points par paire de plans voisins</td><td>Séquence</td></tr>',
      `<tr><td><b>n × couple d’icônes</b></td>
        <td>${maj('0.13.5', `n points par <b>couple</b> d’icônes réunies dans la portée — quatre icônes
        font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes en demande
        une de chaque`)}</td><td>${portee(c)} ⚙</td></tr>
      ${maj('0.13.5', `<tr><td><b>n × icône ou cadrage avant / après cette carte</b></td>
        <td>n points par plan placé <b>strictement</b> avant — ou après — la carte porteuse et
        portant l’icône, ou du cadrage, visé</td><td>Le montage</td></tr>`)}`)
    .replace(
      '<h3>Les Raccords</h3>',
      `${majBloc('0.13.5', `<b>Les icônes en plusieurs exemplaires.</b> Un plan peut porter plusieurs
      fois la même icône — deux armes, deux véhicules. Chacune compte pour elle-même :
      ${c.elementParIcone === false
        ? 'ici pourtant, un bandeau d’élément compte les <i>plans</i> porteurs (réglable dans <b>Variables</b> ⚙).'
        : 'un bandeau d’élément rapporte donc deux fois sur une carte à deux armes (réglable dans <b>Variables</b> ⚙).'}`)}
      <h3>Les Raccords</h3>`);
}

// --- v0.13.6 ---------------------------------------------------------------
// Le Plan de départ n'est pas un Plan Large, et il compte dans les dix.

function corps_0_13_6(c) {
  return corps_0_13_5(c)
    .replace(
      `<p>La partie s’arrête quand toutes les joueuses ont posé leur ${c.tours}e plan. On inscrit alors les
  points rapportés par chaque <b>plan visible</b> ; le plus haut total l’emporte.</p>`,
      `<p>${maj('0.13.6', `La partie s’arrête quand chaque banc compte <b>${c.tours} plans</b>, Plan de
      départ compris — il reste donc ${c.tours - 1} plans à monter.`)} On inscrit alors les points
      rapportés par chaque <b>plan visible</b> ; le plus haut total l’emporte.</p>`)
    .replace(
      '<h3>Phase A — Le Dérushage</h3>',
      `${majBloc('0.13.6', `<b>Le Plan de départ n’est pas un Plan Large.</b> C’est un plan comme un
      autre pour tout ce qui compte des cartes du montage — les couples d’icônes, les minutages, les
      positions, les points par carte de séquence. Mais aucun bandeau de <b>cadrage</b> ne le vise :
      « n × Plan Large » ne le compte pas, et aucun bandeau ne désigne les Plans de départ.`)}
      <h3>Phase A — Le Dérushage</h3>`);
}

// --- v0.13.7 ---------------------------------------------------------------
// Le minutage absent du montage.

function corps_0_13_7(c) {
  return corps_0_13_6(c).replace(
    '<tr><td><b>n si montage dans l’ordre</b></td>',
    `${maj('0.13.7', `<tr><td><b>n si aucun plan à / avant / après XX:00</b></td>
      <td>n points si <b>aucun</b> plan du montage n’a ce minutage — à 00:00, cela vise les
      Raccords et les Génériques</td><td>Le montage</td></tr>`)}
    <tr><td><b>n si montage dans l’ordre</b></td>`);
}

// --- v0.13.8 ---------------------------------------------------------------
// La portée devient une propriété de chaque bandeau.

function corps_0_13_8(c) {
  return corps_0_13_7(c)
    .replace('<h3>Décompte des bandeaux</h3>',
      `${majBloc('0.13.8', `<b>La portée d’un bandeau.</b> Chaque bandeau dit lui-même où il compte,
      et ses flèches le donnent à lire :
      <ul>
        <li><b>◀ Héroïne</b> — parmi les cartes placées <b>avant</b> celle-ci dans le montage ;</li>
        <li><b>Héroïne ▶</b> — parmi celles placées <b>après</b> ;</li>
        <li><b>◀ Héroïne ▶</b> — dans <b>sa séquence</b> ;</li>
        <li><b>Héroïne</b> — dans le <b>montage entier</b>.</li>
      </ul>
      Un Raccord porte donc « ◀ Plan ▶ » : un point par carte de sa séquence. Un Générique porte
      « Raccord » sans flèche : deux points par Carte Raccord du montage.`)}
      <h3>Décompte des bandeaux</h3>`)
    .replace('<tr><td><b>n × Raccord</b></td><td>n points par Carte Raccord</td><td>Le montage</td></tr>',
      '<tr><td><b>n × Raccord</b></td><td>n points par Carte Raccord</td><td>Sa portée ◀ ▶</td></tr>')
    .replace('<tr><td><b>n × ◀ Plan ▶</b></td><td>n points par carte</td><td>Sa séquence</td></tr>',
      '<tr><td><b>n × Plan</b></td><td>n points par carte</td><td>Sa portée ◀ ▶</td></tr>')
    .replace(new RegExp(`<td>${portee(c)} ⚙</td>`, 'g'), '<td>Sa portée ◀ ▶</td>');
}

const portee = (c) => (c.porteeParDefaut === 'MONTAGE' ? 'Le montage' : 'Sa séquence');

// --- v0.13.9 ---------------------------------------------------------------
// L'ordre du tour, et qui commence.

function corps_0_13_9(c) {
  return corps_0_13_8(c)
    .replace('<li>La dernière joueuse à avoir vu un bon film commence — ici, tirage au sort.</li>',
      maj('0.13.9', `<li>La dernière joueuse à avoir vu un bon film commence. Ici, elle est
      <b>tirée au sort</b>, ou <b>désignée</b> avant la partie — c'est une option de partie.</li>`))
    .replace('<h3>Phase A — Le Dérushage</h3>',
      `${majBloc('0.13.9', `<b>Chacune son tour, et cela se voit.</b> Les joueuses jouent l’une après
      l’autre, dans l’ordre, à partir de la première. Chaque coup se joue à vue : la carte quitte le
      chutier — ou la pioche — pour rejoindre le banc de la joueuse, et la pioche recharge aussitôt
      la place laissée vide.`)}
      <h3>Phase A — Le Dérushage</h3>`);
}

// --- v0.13.10 --------------------------------------------------------------
// Le tour d'une joueuse d'un seul tenant.

function corps_0_13_10(c) {
  const ordre = c.tourComplet === false;
  return corps_0_13_9(c)
    .replace('<h3>Phase A — Le Dérushage</h3>',
      `${majBloc('0.13.10', `<b>Le tour d’une joueuse est d’un seul tenant.</b> Elle dérushe, elle
      monte, puis elle passe la main : les deux phases ci-dessous sont les deux temps de
      <i>son</i> tour, pas deux tours de table. On suit ainsi son coup entier — la carte qu’elle
      prend et la carte qu’elle pose.<br>
      Le texte imprimé décrit l’autre ordre : toutes dérushent, puis toutes montent. Il se rétablit
      dans <b>Variables ⚙</b> — ${ordre
        ? 'c’est d’ailleurs l’ordre en vigueur pour cette partie.'
        : 'c’est le tour d’un seul tenant qui vaut pour cette partie.'}`)}
      <h3>Phase A — Le Dérushage</h3>`);
}

// --- v0.13.11 --------------------------------------------------------------
// Le sens des moitiés sur une carte double.

function corps_0_13_11(c) {
  const texte = c.faceSelonPose === false
    ? 'Ici, une carte est toujours jouée sur son recto (réglable dans <b>Variables</b>).'
    : `La face jouée se déduit de la pose : la moitié laissée visible se retrouve au bout libre de
      la carte, donc un Gros Plan accroché à gauche d'une séquence est celui du verso, et à droite
      celui du recto. Réglable dans <b>Variables</b> ⚙.`;
  return corps_0_13_10(c)
    .replace(/<b>Le recto et le verso\.<\/b>[\s\S]*?(?=<\/div>\s*<h3>Phase A)/,
      `${maj('0.13.11', `<b>Le recto et le verso.</b> Une carte Plan Moyen / Gros Plan porte son
      <b>Plan Moyen à gauche et son Gros Plan à droite</b> sur le recto ; le verso, retourné autour
      de l'axe vertical, les échange. Les quatre plans sont distincts, chacun avec son minutage — on
      note « 301R » et « 301V ». ${texte}`)}`);
}

// --- v0.13.12 --------------------------------------------------------------
// Un Raccord relie, et ne fait que cela.

function corps_0_13_12(c) {
  return corps_0_13_11(c).replace(
    '<li><b>Raccord</b> — connecte deux séquences et démultiplie donc la valeur des cartes.\n    Il rapporte 1 point par carte de sa séquence.</li>',
    maj('0.13.12', `<li><b>Raccord</b> — <b>relie</b> deux séquences, et démultiplie donc la valeur
    des cartes. Il se pose <b>entre deux séquences, et nulle part ailleurs</b> : posé entre deux
    cartes, il raccorde forcément. Une séquence qui commencerait par un Raccord ne relierait rien —
    cette configuration n'existe pas. Il rapporte 1 point par carte de sa séquence.</li>`));
}
