// ---------------------------------------------------------------------------
// EDIT — règles du jeu, versionnées
// ---------------------------------------------------------------------------
// La version des règles est indépendante de la version du site. Elle part de
// la v0.13 fournie par l'auteur ; chaque modification de règle demandée
// l'incrémente. La v0.14 est une réécriture complète, écrite d'un tenant.
//
// Marche à suivre pour une retouche :
//   1. incrémenter REGLES_VERSION ;
//   2. ajouter une entrée en tête de REGLES_HISTORIQUE ;
//   3. dupliquer le corps en vigueur, y entourer le passage changé d'un appel
//      à maj('0.14.x', '…') — il s'affiche alors en violet, avec le numéro de
//      version en pastille.
// Chaque version garde son propre corps : les précédentes restent lisibles
// telles qu'elles étaient, dans l'onglet « Versions des règles ».

import { ELEMENTS, ELEMENT_IDS } from './data.js?v=1.85';
import { elIcon } from './icons.js?v=1.85';

// Chaque version garde son texte complet dans `corps` : les règles
// précédentes restent donc consultables telles quelles, et pas seulement
// résumées par leur liste de changements.
export const REGLES_HISTORIQUE = [
  {
    v: '0.14.7',
    date: '01/09/2026',
    origine: 'Règle étendue par l’auteur',
    corps: (c) => corps_0_14_7(c),
    items: [
      '<b>Le groupe d’icônes peut en demander trois.</b> « n × 2 ICONES » devient « n × 2 <b>ou 3</b> ICONES » : le bandeau nomme deux ou trois icônes, et rapporte n points par groupe <b>complet</b> réuni dans sa portée.',
      'La même icône peut y figurer plusieurs fois, et compte alors pour autant d’exemplaires : « <b>Arme + Arme + Héroïne</b> » demande deux armes ET une héroïne. Quatre armes et deux héroïnes en font <b>deux</b> groupes ; trois armes et une héroïne n’en font qu’<b>un</b>. C’est toujours un appariement, pas une adjacence : les icônes n’ont pas à se toucher, ni même à être sur la même carte.',
      'Les <b>huit cartes imprimées</b> qui portent un couple le gardent tel quel : la troisième icône est facultative, et rien ne change tant qu’on ne l’ajoute pas.',
    ],
  },
  {
    v: '0.14.6',
    date: '31/08/2026',
    origine: 'Correction demandée par l’auteur',
    corps: (c) => corps_0_14_6(c),
    items: [
      '<b>Une « valeur » est une valeur de cadre</b> — le mot de cinéma pour le <b>cadrage</b> : Plan Large, Plan Moyen, Gros Plan. La cible <b>VALEUR</b> compte donc les cadrages <b>différents</b> d’une portée : une ligne qui alterne les trois en montre trois, quel qu’y soit le nombre de cartes. Un <b>Raccord n’est pas un plan</b> : il n’a pas de valeur de cadre.',
      'Elle comptait jusqu’ici les <b>icônes</b> différentes : c’était un contresens sur le mot. Pour viser un cadrage précis — « 2 points par lot de 3 Gros Plans » —, on le nomme directement ; « valeur de cadre » sert à récompenser la <b>variété</b> des cadrages, ou son absence.',
    ],
  },
  {
    v: '0.14.5',
    date: '31/08/2026',
    origine: 'Bandeaux ajoutés par l’auteur',
    corps: (c) => corps_0_14_5(c),
    items: [
      '<b>Neuf bandeaux de plus</b>, et un <b>vocabulaire commun</b> qui les relie : chacun compte une <b>cible</b> — une carte, un plan, un Raccord, un cadrage, une icône, <b>toutes les icônes</b>, les <b>valeurs</b> (les icônes différentes), une séquence — et ne se distingue des autres que par ce qu’il en fait.',
      '<b>Compter ailleurs.</b> « n × cible dans les <b>autres séquences</b> » — celles du dessus, celles du dessous, ou les deux —, et « n × cible d’un côté du <b>centre</b> de sa ligne », le centre étant l’<b>ancre</b>, le plan qui a ouvert la séquence, qui n’appartient à aucun des deux côtés. Ces deux-là portent leur portée dans leur définition : elle ne se règle pas.',
      '<b>Compter par paquets, ou d’un coup.</b> « n × <b>lot</b> de k cibles » — un lot incomplet ne rapporte rien, sept armes font deux lots de trois. « n <b>si au moins</b> — ou au plus — k cibles » : tout ou rien, et « aucune » s’écrit « au plus 0 ».',
      '<b>Lire ce qui manque, et ce qui domine.</b> « n × <b>icône absente</b> » compte les types d’icônes que la portée ne montre nulle part ; « n × icône la <b>plus</b> — ou la <b>moins</b> — présente » compte les exemplaires de celle qui domine, la moins présente se lisant parmi celles qui apparaissent.',
      '<b>Lire la forme du banc.</b> « n × <b>plan portant k icônes</b> », exactement, au moins ou au plus ; « n si <b>chaque séquence</b> a k plans » ; et « la plus petite — ou la plus grosse — <b>carte compte double</b> », « grosse » se disant en points, en icônes ou en taille de cadrage, au choix.',
    ],
  },
  {
    v: '0.14.4',
    date: '27/08/2026',
    origine: 'Variantes ajoutées par l’auteur',
    corps: (c) => corps_0_14_4(c),
    items: [
      'Deux règles optionnelles rejoignent le texte, et une <b>section Variantes</b> les rassemble enfin — celles qui existaient déjà comprises. Chacune dit si elle est en vigueur dans la partie en cours.',
      '<b>Pas deux fois le même plan.</b> Un film ne montre pas deux fois le même plan : on peut l’interdire, et choisir jusqu’où porte l’interdit — dans <b>tout le banc</b>, dans <b>une même séquence</b>, ou seulement <b>côte à côte</b>. Deux plans sont « le même » quand ils portent le même numéro imprimé, recto et verso confondus : c’est la même image. Un <b>Raccord n’est pas un plan</b> et échappe à la règle, comme il échappe déjà au compte des dix plans.',
      '<b>Pioches mélangées.</b> Une seule pioche, <b>face cachée</b>, où les Plans Larges sont mêlés aux cartes Plan Moyen / Gros Plan, et une seule rivière de six cartes devant elle. On ne choisit plus sa famille : on prend ce qui vient. Cette variante et <b>« pas de Plans de départ » ne vont pas ensemble</b> — celle-là a besoin d’une rivière de Plans Larges à part pour n’offrir qu’eux tant qu’un banc est vide.',
    ],
  },
  {
    v: '0.14.3',
    date: '27/08/2026',
    origine: 'Correction demandée par l’auteur',
    corps: (c) => corps_0_14_3(c),
    items: [
      '<b>« Avant » et « après » ne quittent pas la ligne du plan.</b> <b>◀ Héroïne</b> compte les Héroïnes de <b>sa séquence</b>, depuis le début de la ligne jusqu’à cette carte comprise ; <b>Héroïne ▶</b> celles de cette carte jusqu’au bout de sa ligne. Une séquence posée au-dessus n’est pas « avant » : elle est ailleurs.',
      'Trois des quatre portées se lisent donc <b>dans la ligne</b> — ◀, ▶ et ◀ ▶ —, et une seule en sort : <b>Héroïne</b> sans flèche, qui compte le <b>montage entier</b>. Les flèches disent de quel côté du plan on compte, et le banc en lignes le rend littéral.',
      'Le montage continue de <b>se lire d’un seul tenant</b> pour ce qui s’y lit vraiment d’un bout à l’autre : le minutage dans l’ordre, et les bandeaux qui comptent le montage entier.',
    ],
  },
  {
    v: '0.14.2',
    date: '27/08/2026',
    origine: 'Règles ajoutées par l’auteur',
    corps: (c) => corps_0_14_2(c),
    items: [
      'Un banc ne porte que <b>cinq séquences</b>. Ce n’est pas le nombre de Plans Larges qui est borné — une ligne peut en porter plusieurs, de part et d’autre d’un Raccord — mais le nombre de <b>lignes</b> : passé ce compte, un Plan Large n’entre plus que par la <b>charnière d’un Raccord</b>. Le compte se règle dans <b>Variables</b> ⚙.',
      'Le bandeau <b>« n × SÉQUENCE avec / sans … »</b> peut demander un <b>nombre de plans</b> : « n points par séquence portant <b>au moins 3</b> plans Arme ». Son contraire compte les séquences qui en portent <b>moins de 3</b> — à un seul plan, on retrouve « avec » et « sans ».',
      'Un bandeau à portée <b>◀ avant</b> ou <b>après ▶</b> compte désormais <b>la carte qui le porte</b>. Un plan compte toujours ce qu’il porte, comme le font déjà les portées « sa séquence » et « le montage » : une carte qui annonce une icône sans la compter se lisait comme une erreur.',
    ],
  },
  {
    v: '0.14.1',
    date: '26/08/2026',
    origine: 'Règle rétablie par l’auteur',
    corps: (c) => corps_0_14_1(c),
    items: [
      'Une Carte Raccord <b>relie de nouveau</b>, à la manière du banc en lignes : posée au bout d’une ligne, elle y fait <b>charnière</b>. Un Plan Large peut alors se poser <b>de l’autre côté d’elle</b>, dans cette même ligne — avant le Raccord s’il a été joué à gauche, après s’il a été joué à droite.',
      'Une ligne porte donc <b>deux Plans Larges, ou plus</b>. Deux Plans Larges ne se touchent toujours pas : c’est le Raccord qui les sépare, et qui les réunit.',
      'Les points du Plan Large ajouté <b>s’additionnent à la ligne</b>, et ses icônes comptent pour toute la ligne — les cartes qui s’y trouvaient déjà comprises, et réciproquement : la ligne reste <b>une seule séquence</b>.',
      'La ligne garde le <b>centre qu’elle avait</b> : c’est le plan qui l’a ouverte qui l’ancre, et il le reste. Un Plan Large posé à gauche ne fait donc pas glisser tout ce qui était déjà là.',
    ],
  },
  {
    v: '0.14',
    date: '26/08/2026',
    origine: 'Réécriture demandée par l’auteur',
    corps: (c) => corps_0_14(c),
    items: [
      'Le <b>banc en lignes</b> devient la règle officielle : chaque séquence tient sa propre ligne, un Plan Large — ou le Plan de départ — en ouvre une à lui seul et en tient le centre, les Plans Moyens et Gros Plans s’accrochent à ses deux bouts, et une nouvelle ligne se pose au-dessus ou en dessous de la pile, jamais entre deux.',
      'Le montage <b>se lit d’un seul tenant</b> — du premier plan en haut à gauche jusqu’au dernier en bas à droite, comme les lignes d’un texte. Tout ce qui se lit dans un ordre s’y lit de ligne en ligne.',
      'Un Raccord <b>ne relie plus rien</b> : deux séquences ne se touchent pas, elles se succèdent. Il se pose comme un plan ordinaire, au bout d’une ligne.',
      'Le texte est <b>réécrit d’un bout à l’autre</b> plutôt que rapiécé : les quinze retouches de la série 0.13 y sont fondues, et les bandeaux apparus depuis — deux pouvoirs par plan, valeurs négatives, cadrage double, bandeaux de séquence — rejoignent le tableau de décompte.',
      'La pose sur une seule bande, qui était la règle, devient le <b>mode Classique</b> — un mode de jeu à part entière, toujours jouable.',
    ],
  },
  {
    v: '0.13.15',
    date: '17/08/2026',
    origine: 'Correction demandée par l’auteur',
    corps: (c) => corps_0_13_15(c),
    items: [
      'Le bandeau « n si le montage est dans l’ordre » se lit sur <b>tout le film, de gauche à droite</b>, séquences confondues. Une séquence bien rangée à côté d’une autre qui ne l’est pas ne fait pas un montage dans l’ordre.',
      'Les Raccords et les Génériques, à 00:00, sont <b>retirés de la lecture</b> — ils ne la coupent pas. Un Raccord glissé entre un plan à 75:00 et un plan à 65:00 ne sauve donc plus le désordre.',
    ],
  },
  {
    v: '0.13.14',
    date: '16/08/2026',
    origine: 'Correction demandée par l’auteur',
    corps: (c) => corps_0_13_14(c),
    items: [
      'Un Raccord, une Ouverture, un Générique ne sont pas des plans : ils ne comptent pas dans le total qui arrête la partie. En jouer un n’avance donc pas vers la fin.',
      'Dès qu’une joueuse pose son dernier plan, les autres ont droit à un tour chacune, puis la partie s’arrête. Elles ne finissent donc plus forcément avec le même nombre de plans.',
    ],
  },
  {
    v: '0.13.13',
    date: '16/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_13(c),
    items: [
      'La rivière montre toujours trois cartes par famille, quel que soit le nombre de joueuses : trois Plans Larges et trois cartes Plan Moyen / Gros Plan.',
      'À côté d’elles, leur pioche : celle des Plans Larges face cachée, celle des Plans Moyens / Gros Plans face visible.',
    ],
  },
  {
    v: '0.13.12',
    date: '15/08/2026',
    origine: 'Précision demandée par l’auteur',
    corps: (c) => corps_0_13_12(c),
    items: [
      'Une Carte Raccord relie : glissée entre deux séquences, elle les raccorde forcément — elle ne peut pas s’y poser sans relier.',
      'Aux deux bouts du montage, en revanche, elle se pose comme un plan ordinaire. Une Carte Raccord posée entre deux séquences sans les relier : cette configuration n’existe pas.',
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

// --- v0.14.7 ---------------------------------------------------------------
// Le couple d'icônes s'ouvre à trois. La ligne du tableau est réécrite en
// entier : elle disait « couple » à chaque phrase.

function corps_0_14_7(c) {
  return corps_0_14_6(c).replace(
    /<tr><td><b>n × 2 ICONES<\/b><\/td>\s*\n?\s*<td>n points par <b>couple<\/b>[\s\S]*?chaque<\/td><td>Sa portée ◀ ▶<\/td><\/tr>/,
    maj('0.14.7', `<tr><td><b>n × 2 ou 3 ICONES</b></td>
      <td>n points par <b>groupe complet</b> d’icônes réunies dans la portée. Le bandeau en nomme
      deux, ou trois ; la même peut y figurer plusieurs fois et compte alors pour autant
      d’exemplaires — « Arme + Arme + Héroïne » demande deux armes et une héroïne. Quatre armes et
      deux héroïnes font <b>deux</b> groupes ; trois armes et une héroïne n’en font qu’un. C’est un
      appariement, pas une adjacence : les icônes n’ont ni à se toucher, ni à être sur la même
      carte</td><td>Sa portée ◀ ▶</td></tr>`));
}

// --- v0.14.6 ---------------------------------------------------------------
// « Valeur » est un mot de cinéma : la valeur de cadre, c'est-à-dire le
// cadrage. La cible le comptait comme un type d'icône — contresens.

function corps_0_14_6(c) {
  return corps_0_14_5(c).replace(
    /une <b>valeur<\/b> — c’est-à-dire le\s*\n?\s*nombre d’icônes <b>différentes<\/b> : un plan à deux armes porte deux icônes et une seule\s*\n?\s*valeur —/,
    maj('0.14.6', `une <b>valeur de cadre</b> — le mot de cinéma
    pour le cadrage, et l’on compte celles qui sont <b>différentes</b> : une ligne qui alterne
    Plan Large, Plan Moyen et Gros Plan en montre trois, quel qu’y soit le nombre de cartes ; un
    Raccord n’étant pas un plan, il n’en a pas —`));
}

// --- v0.14.5 ---------------------------------------------------------------
// Neuf bandeaux de plus, et le vocabulaire de cibles qui les relie. Ils entrent
// dans le tableau du décompte, à la suite de ceux qui y étaient, et une note
// explique la cible avant qu'on ne la lise neuf fois de suite.

function corps_0_14_5(c) {
  // Les lignes neuves se marquent sur la ligne elle-même : un <span> autour de
  // <tr> n'est pas du HTML, et le navigateur le rejette hors du tableau — la
  // pastille se retrouvait alors au-dessus, comme si tout était neuf.
  const lignes = `
    <tr class="maj-tr"><td class="maj-pastille" data-v="v0.14.5"><b>n × CIBLE dans les AUTRES SÉQUENCES</b></td>
      <td>n points par cible trouvée dans les lignes <b>au-dessus</b> de la sienne, <b>en dessous</b>,
      ou les deux à la fois. Sa propre ligne en est toujours exclue</td>
      <td>Les autres lignes</td></tr>
    <tr class="maj-tr"><td><b>n × CIBLE à gauche / à droite du CENTRE</b></td>
      <td>n points par cible d’un côté du <b>centre de sa ligne</b>. Le centre est l’<b>ancre</b> —
      le plan qui a ouvert la séquence — et il n’appartient à aucun des deux côtés</td>
      <td>Un côté de sa ligne</td></tr>
    <tr class="maj-tr"><td><b>n × LOT de k CIBLES</b></td>
      <td>n points par <b>paquet complet</b> de k cibles. Un lot incomplet ne rapporte rien : sept
      armes font <b>deux</b> lots de trois</td><td>Sa portée ◀ ▶</td></tr>
    <tr class="maj-tr"><td><b>n si au moins / au plus k CIBLES</b></td>
      <td>n points, <b>une seule fois</b>, si la portée franchit le seuil. « Aucune » s’écrit
      « au plus 0 »</td><td>Sa portée ◀ ▶</td></tr>
    <tr class="maj-tr"><td><b>n × ICONE absente</b></td>
      <td>n points par <b>type d’icône</b> que la portée ne montre nulle part — six candidats</td>
      <td>Sa portée ◀ ▶</td></tr>
    <tr class="maj-tr"><td><b>n × ICONE la plus / la moins présente</b></td>
      <td>n points par <b>exemplaire</b> de l’icône qui domine — ou de la plus rare. « La moins
      présente » se lit parmi celles qui <b>apparaissent</b> : sinon les absentes gagneraient
      toujours, à zéro</td><td>Sa portée ◀ ▶</td></tr>
    <tr class="maj-tr"><td><b>n × PLAN portant k ICONES</b></td>
      <td>n points par plan portant <b>exactement</b> — ou au moins, ou au plus — k icônes. Un
      Raccord n’est pas un plan : il n’y compte pas</td><td>Sa portée ◀ ▶</td></tr>
    <tr class="maj-tr"><td><b>n si CHAQUE SÉQUENCE a k plans</b></td>
      <td>n points si <b>toutes</b> les lignes du banc tiennent la taille demandée. Une seule trop
      courte fait tout tomber ; un banc sans ligne ne rapporte rien</td>
      <td>Le montage entier</td></tr>
    <tr class="maj-tr"><td><b>la plus petite / plus grosse CARTE compte double</b></td>
      <td>la carte extrême de la portée <b>ajoute sa valeur</b> une fois de plus — deux fois pour
      compter triple. « Grosse » se dit au choix en <b>points</b>, en <b>icônes</b>, ou en
      <b>taille de cadrage</b>. À égalité, c’est celle qui rapporte le plus</td>
      <td>Sa portée ◀ ▶</td></tr>`;

  const note = majBloc('0.14.5', `<b>La cible d’un bandeau.</b> Neuf bandeaux ne disent pas ce
    qu’ils comptent : ils comptent une <b>cible</b>, et c’est la carte qui la nomme. Une cible est
    au choix une <b>Carte</b> (Raccords compris), un <b>Plan</b> (hors Raccord), une <b>Carte
    Raccord</b>, un <b>Plan de mort</b>, un <b>plan sans personnage</b>, un <b>cadrage</b>, une
    <b>icône</b> précise, <b>toutes les icônes</b> confondues, une <b>valeur</b> — c’est-à-dire le
    nombre d’icônes <b>différentes</b> : un plan à deux armes porte deux icônes et une seule
    valeur —, ou une <b>séquence</b> du banc.`);

  return corps_0_14_4(c)
    .replace(/(<td>Le montage entier<\/td><\/tr>\s*)<\/table>/, `$1${lignes}\n  </table>\n  ${note}`);
}

// --- v0.14.4 ---------------------------------------------------------------
// Les variantes vivaient dans les Variables et se devinaient à l'usage : le
// texte n'en disait rien. Elles ont désormais leur section, et chacune y dit si
// elle est en vigueur dans la partie qu'on est en train de lire.

/** Une variante du texte : son titre, ce qu'elle fait, et si elle joue ici. */
function variante(titre, active, texte) {
  return `<li class="${active ? 'variante-on' : ''}"><b>${titre}</b>${
    active ? ' <span class="etiquette">en vigueur</span>' : ''} — ${texte}</li>`;
}

function corps_0_14_4(c) {
  const u = c.planUnique && c.planUnique !== 'AUCUNE' ? c.planUnique : '';
  const portee = { MONTAGE: 'dans <b>tout le banc</b>', SEQUENCE: 'dans <b>une même séquence</b>',
    VOISIN: '<b>côte à côte</b>' }[u] || '';
  const melees = !!c.piochesMelangees && !c.sansPlanDepart;

  const section = `
  ${majBloc('0.14.4', `<h3>Variantes</h3>
  <p>Des règles optionnelles, qui se cochent sur l’accueil ou se règlent dans <b>Variables</b> ⚙.
  Celles qui jouent dans cette partie sont marquées.</p>
  <ul class="variantes">
    ${variante('Pas deux fois le même plan', !!u, `un film ne montre pas deux fois le même plan.
      L’interdit porte au choix sur <b>tout le banc</b>, sur <b>une même séquence</b>, ou seulement
      sur deux plans <b>côte à côte</b>${u ? ` — ici, ${portee}` : ''}. Deux plans sont « le même »
      quand ils portent le <b>même numéro imprimé</b>, recto et verso confondus : c’est la même
      image. Un <b>Raccord n’est pas un plan</b> et échappe à la règle, comme il échappe déjà au
      compte des ${c.tours} plans et à la taille d’une séquence.`)}
    ${variante('Pioches mélangées', melees, `une seule pioche, <b>face cachée</b>, où les Plans
      Larges sont mêlés aux cartes Plan Moyen / Gros Plan, et une seule rivière de
      ${(c.chutierPL || 3) + (c.chutierPMGP || 3)} cartes devant elle. On ne choisit plus sa
      famille : on prend ce qui vient, et l’on ne voit plus venir la carte du dessus.`)}
    ${variante('Pas de Plans de départ', !!c.sansPlanDepart, `les quatre faces de départ rejoignent
      la pioche des Plans Larges et en prennent la couleur : ce sont des Plans Larges comme les
      autres. Plus de choix de départ — chacune ouvre son banc en dérushant un Plan Large, seule
      carte qui puisse s’y poser en premier. <b>Ne va pas avec les pioches mélangées</b> : cette
      variante-ci a besoin d’une rivière de Plans Larges à part pour n’offrir qu’eux tant qu’un banc
      est vide.`)}
    ${variante('Banc sans limite de lignes', !c.sequencesMax || c.sequencesMax <= 0,
    'le banc ne borne plus le nombre de séquences — la règle en fixe cinq.')}
    ${variante('Raccord par élément partagé', !!c.raccordElement, `deux plans voisins qui partagent
      assez d’icônes rapportent des points de jonction. Hors règles officielles.`)}
    ${variante('Chronologie', !!(c.chronoBonus || c.chronoMalus), `chaque paire de plans voisins
      rapporte ou coûte selon qu’elle est dans l’ordre ou à contresens.`)}
  </ul>`)}
`;

  return corps_0_14_3(c)
    // La section se glisse juste avant l'encart des points laissés ouverts.
    .replace(/(\s*<div class="encart attention">\s*<b>Points laissés ouverts)/, `${section}$1`)
    // Pioches mêlées, la mise en place n'a plus deux piles mais une.
    .replace(
      /<li>Les Plans Larges forment une <b>pioche face cachée<\/b>[\s\S]*?recto-verso, une pioche ne peut pas les cacher — et un chutier de [^.]*\.<\/li>/,
      melees
        ? `<li>${maj('0.14.4', `Les Plans Larges et les cartes Plan Moyen / Gros Plan sont
          <b>mélangés en une seule pioche face cachée</b>, avec une rivière de
          ${(c.chutierPL || 3) + (c.chutierPMGP || 3)} cartes devant elle — variante.`)}</li>`
        : `<li>Les Plans Larges forment une <b>pioche face cachée</b> et un <b>chutier</b> de ${
          c.chutierPL ? `${c.chutierPL} carte${c.chutierPL > 1 ? 's' : ''}` : 'autant de cartes que de joueuses'}.</li>
      <li>Les Plans Moyens / Gros Plans forment une <b>pioche face visible</b> — ces cartes sont
      recto-verso, une pioche ne peut pas les cacher — et un chutier de ${
  c.chutierPMGP ? `${c.chutierPMGP} carte${c.chutierPMGP > 1 ? 's' : ''}` : 'autant de cartes que de joueuses'}.</li>`);
}

// --- v0.14.3 ---------------------------------------------------------------
// « Avant » et « après » désignaient une place dans le film entier, lu de ligne
// en ligne. Ils désignent désormais une place **dans la séquence** : les
// flèches d'un bandeau disent de quel côté du plan on compte, et le banc en
// lignes le rend littéral. Une ligne posée au-dessus n'est pas « avant ».

function corps_0_14_3(c) {
  return corps_0_14_2(c)
    .replace(
      /<li><b>La portée<\/b>[\s\S]*?un plan compte toujours ce qu’il porte\.<\/span><\/li>/,
      `<li><b>La portée</b>, que ses flèches donnent à lire. ${maj('0.14.3', `<b>Trois des quatre ne
      quittent pas la ligne du plan</b> : <b>◀ Héroïne</b> compte parmi les cartes de <b>sa
      séquence</b> placées <b>avant</b> celle-ci — du début de la ligne jusqu’à elle —,
      <b>Héroïne ▶</b> parmi celles de sa séquence placées <b>après</b> — d’elle jusqu’au bout de la
      ligne —, et <b>◀ Héroïne ▶</b> dans <b>sa séquence entière</b>. Une séquence posée au-dessus
      n’est pas « avant » : elle est ailleurs. Seul <b>Héroïne</b> tout court en sort, et compte le
      <b>montage entier</b>.`)} ${maj('0.14.2', `Dans les quatre cas, <b>la carte qui porte le
      bandeau compte pour elle-même</b> : un plan compte toujours ce qu’il porte.`)}</li>`)
    .replace(
      /<b>Le montage se lit d’un seul tenant\.<\/b>[\s\S]*?et non ligne par ligne\./,
      `<b>Le montage se lit d’un seul tenant.</b> Du premier plan en <b>haut à gauche</b> de la
      première ligne jusqu’au dernier en <b>bas à droite</b> de la dernière, les lignes s’enchaînant
      comme les lignes d’un texte. ${maj('0.14.3', `C’est ainsi que se lit ce qui regarde le
      <b>montage entier</b> — le minutage dans l’ordre, et les bandeaux sans flèches. Les bandeaux à
      flèches, eux, ne regardent que <b>leur propre ligne</b>.`)}`);
}

// --- v0.14.2 ---------------------------------------------------------------
// Trois ajouts : le banc est borné à cinq lignes, le bandeau « séquence avec »
// sait demander plusieurs plans, et une portée « avant / après » compte la
// carte qui la porte.

function corps_0_14_2(c) {
  const max = c.sequencesMax === undefined || c.sequencesMax === null || c.sequencesMax <= 0
    ? 0 : c.sequencesMax;
  const borne = max
    ? `Un banc ne porte que <b>${max} lignes</b>. Ce n’est pas le nombre de Plans Larges qui est
      borné — une ligne peut en porter plusieurs, de part et d’autre d’un Raccord —, c’est le nombre
      de <b>séquences</b> : un montage compte bien plus de plans que de lignes. Une fois les
      ${max} ouvertes, un Plan Large n’entre plus que par la <b>charnière d’un Raccord</b>, et l’on
      cesse de vous en proposer au dérushage tant qu’il n’y en a aucune. Le compte se règle dans
      <b>Variables</b> ⚙.`
    : `Ici, le nombre de lignes n’est <b>pas borné</b> — la règle en fixe cinq (réglable dans
      <b>Variables</b> ⚙).`;
  return corps_0_14_1(c)
    .replace(
      /<li>Une <b>nouvelle ligne<\/b>[\s\S]*?On empile, on n’insère pas\.<\/li>/,
      `<li>Une <b>nouvelle ligne</b> se pose <b>au-dessus</b> ou <b>en dessous</b> de la pile —
      <b>jamais entre deux</b>. On empile, on n’insère pas.</li>
      <li>${maj('0.14.2', borne)}</li>`)
    .replace(
      /<li><b>La portée<\/b>[\s\S]*?de ligne en ligne\.<\/li>/,
      `<li><b>La portée</b>, que ses flèches donnent à lire : <b>◀ Héroïne</b> compte parmi les cartes
      placées <b>avant</b> celle-ci dans le montage, <b>Héroïne ▶</b> parmi celles placées
      <b>après</b>, <b>◀ Héroïne ▶</b> dans <b>sa séquence</b> — c’est-à-dire sa ligne —, et
      <b>Héroïne</b> tout court dans le <b>montage entier</b>. « Avant » et « après » se lisent dans
      l’ordre d’un seul tenant, de ligne en ligne. ${maj('0.14.2', `Dans les quatre cas, <b>la carte
      qui porte le bandeau compte pour elle-même</b> : un plan compte toujours ce qu’il porte.`)}</li>`)
    .replace(
      /<tr><td><b>n × SÉQUENCE avec \/ sans …<\/b><\/td>[\s\S]*?<\/tr>/,
      `<tr><td><b>n × SÉQUENCE avec / sans …</b></td>
      <td>n points par ligne qui porte — ou ne porte pas — l’icône, le cadrage ou la Carte Raccord
      visée. ${maj('0.14.2', `Le bandeau peut demander un <b>nombre de plans</b> : « au moins 3 »
      compte les lignes qui portent la cible sur <b>trois plans ou plus</b>, et son contraire celles
      qui la portent sur <b>moins de trois</b>. Ce sont des plans que l’on compte, pas des icônes :
      un plan à deux armes reste un plan.`)}</td><td>Le montage entier</td></tr>`);
}

// --- v0.14.1 ---------------------------------------------------------------
// La Carte Raccord retrouve son office, transposé au banc en lignes : elle ne
// soude plus deux séquences bout à bout sur une bande, elle fait charnière au
// bout d'une ligne et y laisse entrer un second Plan Large.

function corps_0_14_1(c) {
  const charniere = c.raccordConnecte === false
    ? `Ici, un Raccord est un plan ordinaire et ne relie rien (réglable dans <b>Variables</b> ⚙).`
    : `<b>Posé au bout d’une ligne, un Raccord y fait charnière</b> : un <b>Plan Large</b> peut
      alors se poser <b>de l’autre côté de lui</b>, dans cette même ligne — avant le Raccord s’il a
      été joué à gauche, après s’il a été joué à droite. Une ligne porte donc <b>deux Plans Larges,
      ou plus</b>, et deux Plans Larges ne se touchent toujours pas : c’est le Raccord qui les
      sépare, et qui les réunit.`;
  return corps_0_14(c)
    .replace(
      /<li>Un <b>Plan Large<\/b> est le climax d’une séquence :[\s\S]*?jamais se toucher\.<\/li>/,
      `<li>Un <b>Plan Large</b> est le climax d’une séquence : il <b>ouvre toujours une ligne</b>, à
      lui seul, et en tient le centre. Le <b>Plan de départ</b> fait de même. Deux Plans Larges ne
      peuvent jamais se toucher.</li>
      <li>${maj('0.14.1', `Une ligne peut pourtant en porter <b>plusieurs</b> : c’est ce qu’une
      <b>Carte Raccord</b> permet, en faisant charnière au bout d’une ligne — voir plus bas. La
      ligne reste alors <b>une seule séquence</b> : les points de tout ce qui s’y trouve
      s’additionnent, et les icônes de chaque plan comptent pour les cartes qui y étaient déjà comme
      pour celles qui viennent. La ligne garde le <b>centre qu’elle avait</b> — c’est le plan qui l’a
      ouverte qui l’ancre, et il le reste, si bien que rien de ce qui est posé ne bouge.`)}</li>`)
    .replace(
      /<li><b>Raccord<\/b> — deux séquences ne se touchent pas :[\s\S]*?au bout d’une ligne\.<\/li>/,
      `<li>${maj('0.14.1', `<b>Raccord</b> — il se pose comme un plan ordinaire, au bout d’une
      ligne. ${charniere}`)}</li>`);
}

// --- v0.14 -----------------------------------------------------------------
// Réécriture complète. Les quinze versions de la série 0.13 s'étaient écrites
// en retouches successives — chaque `corps_0_13_x` remplaçait un passage du
// précédent —, si bien que le texte en vigueur n'existait nulle part en un
// seul morceau. Celui-ci est écrit d'un tenant : les retouches y sont fondues,
// et le banc en lignes y est la règle, non plus une variante.
//
// Les versions précédentes gardent leur chaîne de remplacements intacte : on
// les lit toujours telles qu'elles étaient, dans l'onglet « Versions ».

function corps_0_14(c) {
  const n = (v) => (v ? `${v} carte${v > 1 ? 's' : ''}` : 'autant de cartes que de joueuses');
  const lignes = c.bancEnLignes !== false;
  const bouts = c.sensPose === 'droite' ? 'au bout <b>droit</b>' : 'à l’un ou l’autre <b>bout</b>';
  return `
  <p>Vous incarnez une monteuse de cinéma. Vous assemblez des Cartes Plan dans votre
  <b>banc de montage</b> pour raconter le meilleur film — celui qui rapporte le plus de points.
  De 2 à 4 joueuses.</p>

  <h3>Matériel</h3>
  <ul>
    <li>8 cartes <b>Plan de départ</b> — 2 versions, recto-verso, en quatre exemplaires : chaque
    joueuse a les siennes.</li>
    <li>14 cartes <b>Plan Large</b></li>
    <li>50 cartes <b>Plan Moyen / Gros Plan</b></li>
  </ul>
  <p>Une carte sans jonction est un <b>Plan Large</b>. Une carte à une jonction se partage en un
  <b>Plan Moyen</b> (2/3 de la carte) et un <b>Gros Plan</b> (1/3) : on n’en joue qu’une moitié,
  l’autre se glisse sous les cartes voisines. Chaque plan porte un <b>cadrage</b>, des
  <b>personnages</b> (Héroïne, Ennemi, Allié), des <b>éléments</b> (Arme, Objet, Véhicule), son
  <b>minutage</b>, et le plus souvent un <b>bandeau</b> qui dit ce qu’il rapporte.</p>
  <div class="legende-el">
    ${ELEMENT_IDS.map((e) => `<div class="e">${elIcon(e, 30)}<span>${ELEMENTS[e].label}</span></div>`).join('')}
  </div>

  <h3>Mise en place</h3>
  <ul>
    <li>Chaque joueuse reçoit ses <b>deux</b> cartes Plan de départ — version A et version B, soit
    <b>quatre faces</b> au choix. Aucun tirage. Elle en pose une face dans son banc et écarte le
    reste : c’est la première ligne de son montage.</li>
    <li>Les Plans Larges forment une <b>pioche face cachée</b> et un <b>chutier</b> de ${n(c.chutierPL)}.</li>
    <li>Les Plans Moyens / Gros Plans forment une <b>pioche face visible</b> — ces cartes sont
    recto-verso, une pioche ne peut pas les cacher — et un chutier de ${n(c.chutierPMGP)}.</li>
    <li>La dernière joueuse à avoir vu un bon film commence. Ici, elle est <b>tirée au sort</b>, ou
    <b>désignée</b> avant la partie — c’est une option de partie.</li>
  </ul>

  <h3>Le tour d’une joueuse</h3>
  <p>Le tour est <b>d’un seul tenant</b> : elle dérushe, elle monte, puis elle passe la main.</p>
  <ul>
    <li><b>Le Dérushage.</b> Elle prend <b>une</b> Carte Plan : dans le chutier des Plans Larges,
    dans celui des Plans Moyens / Gros Plans, ou sur la pioche des Plans Moyens / Gros Plans. La
    pioche recharge aussitôt la place laissée vide.</li>
    <li><b>Le Montage.</b> Elle ajoute la carte à son banc. On ne peut pas écarter une carte sans la
    jouer, ni dissimuler entièrement une carte déjà posée.</li>
  </ul>
  <p class="aide">${c.tourComplet === false
    ? 'Cette partie se joue dans l’ordre imprimé : toutes dérushent, puis toutes montent. Le tour d’un seul tenant se rétablit dans <b>Variables</b> ⚙.'
    : 'Le texte imprimé décrivait l’autre ordre — toutes dérushent, puis toutes montent. Il se rétablit dans <b>Variables</b> ⚙.'}</p>

  <h3>Le banc de montage</h3>
  <div class="encart">
    <b>Une séquence par ligne.</b> Le banc se lit comme une page : chaque <b>séquence</b> occupe sa
    propre <b>ligne</b>, et les lignes s’empilent de haut en bas.
    <ul>
      <li>Un <b>Plan Large</b> est le climax d’une séquence : il <b>ouvre toujours une ligne</b>, à
      lui seul, et en tient le centre. Le <b>Plan de départ</b> fait de même. Deux Plans Larges ne
      peuvent donc jamais se toucher.</li>
      <li>Les <b>Plans Moyens</b> et <b>Gros Plans</b> s’accrochent ${bouts} de la ligne de leur
      choix : ce qui se pose à gauche pousse vers la gauche, ce qui se pose à droite pousse vers la
      droite, et le centre ne bouge plus.</li>
      <li>Une <b>nouvelle ligne</b> se pose <b>au-dessus</b> ou <b>en dessous</b> de la pile —
      <b>jamais entre deux</b>. On empile, on n’insère pas.</li>
    </ul>
  </div>
  <div class="encart">
    <b>Le montage se lit d’un seul tenant.</b> Du premier plan en <b>haut à gauche</b> de la première
    ligne jusqu’au dernier en <b>bas à droite</b> de la dernière, les lignes s’enchaînant comme les
    lignes d’un texte. Tout ce qui se lit dans un ordre — le minutage dans l’ordre, « avant » et
    « après cette carte », les icônes qui se répondent d’un plan au suivant — se lit ainsi, de ligne
    en ligne, et non ligne par ligne.
  </div>
  <div class="encart">
    <b>Carte Plan Moyen / Gros Plan.</b> Elle se glisse <b>sous</b> les cartes déjà posées en
    recouvrant l’une de ses deux parties : un seul de ses deux plans reste visible, et c’est celui-là
    qui comptera.<br>
    <b>Le recto et le verso.</b> Une carte porte son <b>Plan Moyen à gauche et son Gros Plan à
    droite</b> sur le recto ; le verso, retourné autour de l’axe vertical, les échange. Les quatre
    plans sont distincts, chacun avec son minutage — on note « 301R » et « 301V ».
    ${c.faceSelonPose === false
      ? 'Ici, une carte est toujours jouée sur son recto (réglable dans <b>Variables</b> ⚙).'
      : `La face jouée se déduit de la pose : la moitié laissée visible se retrouve au bout libre de
      la carte, donc un Gros Plan accroché à gauche d’une ligne est celui du verso, et à droite celui
      du recto. Réglable dans <b>Variables</b> ⚙.`}
  </div>
  ${lignes ? '' : `<div class="encart attention"><b>Cette partie se joue en mode Classique</b> — le
  film se monte sur une seule bande, les séquences se suivant de gauche à droite, et une Carte
  Raccord y relie deux séquences voisines. Le mode se choisit sur l’accueil.</div>`}

  <h3>Les Raccords et les Génériques</h3>
  <ul>
    <li><b>Raccord</b> — deux séquences ne se touchent pas : elles se succèdent, ligne après ligne.
    Un Raccord ne relie donc rien et se pose <b>comme un plan ordinaire</b>, au bout d’une ligne.</li>
    <li><b>Générique</b> (Ouverture ou Fermeture) — ouvre ou ferme le film.
    ${c.generiqueBloque === false
      ? 'Ici, il ne bloque rien (réglable dans <b>Variables</b> ⚙).'
      : `Rien ne peut plus se poser avant l’Ouverture ni après les Crédits : le <b>tout début</b> du
      montage — le bout gauche de la première ligne — et sa <b>toute fin</b> — le bout droit de la
      dernière — sont scellés, et aucune ligne ne s’ouvre plus au-delà.`}</li>
    <li>Un Raccord, une Ouverture, un Générique <b>ne sont pas des plans</b> : ils relient ou
    encadrent le film, ils ne le racontent pas. Ils ne comptent donc ni dans le total qui arrête la
    partie, ni dans la taille d’une séquence.</li>
  </ul>

  <h3>Le minutage</h3>
  <p>Le placement des cartes <b>ne dépend pas</b> du minutage : on pose où l’on veut, dans les
  limites des règles de pose ci-dessus, sans avoir à respecter l’ordre chronologique du film. En
  revanche, certaines cartes rapportent des points <b>en fonction</b> du minutage des plans du
  montage.</p>

  <h3>Les icônes</h3>
  <p>Un plan peut porter <b>plusieurs fois la même icône</b> — deux armes, deux véhicules. Chacune
  compte pour elle-même : ${c.elementParIcone === false
    ? 'ici pourtant, un bandeau d’icône compte les <i>plans</i> porteurs (réglable dans <b>Variables</b> ⚙).'
    : 'un bandeau d’icône rapporte donc deux fois sur une carte à deux armes (réglable dans <b>Variables</b> ⚙).'}</p>

  <h3>Les bandeaux</h3>
  <p>Un bandeau se lit <b>« n × ce qu’il compte »</b>, ou <b>« n si … »</b> quand il ne se déclenche
  qu’une fois. Trois choses valent pour tous :</p>
  <ul>
    <li><b>La portée</b>, que ses flèches donnent à lire : <b>◀ Héroïne</b> compte parmi les cartes
    placées <b>avant</b> celle-ci dans le montage, <b>Héroïne ▶</b> parmi celles placées
    <b>après</b>, <b>◀ Héroïne ▶</b> dans <b>sa séquence</b> — c’est-à-dire sa ligne —, et
    <b>Héroïne</b> tout court dans le <b>montage entier</b>. « Avant » et « après » se lisent dans
    l’ordre d’un seul tenant, de ligne en ligne.</li>
    <li><b>Deux bandeaux</b> peuvent tenir sur un même plan, côte à côte, séparés d’un trait : ils
    comptent tous les deux, chacun dans sa propre portée.</li>
    <li><b>Une valeur peut être négative</b> : le bandeau coûte alors des points au lieu d’en
    rapporter. Sa pastille passe au rouge.</li>
  </ul>
  <p>Les bandeaux qui comptent des <b>séquences</b> — pastille violette — n’ont pas de portée à
  régler : c’est le banc entier qu’ils regardent, toujours.</p>

  <h3>Fin de partie</h3>
  <p><b>Dès qu’une joueuse pose son ${c.tours}<sup>e</sup> plan</b>, les autres ont droit à un tour
  chacune, puis la partie s’arrête : elles ne finissent donc pas forcément avec le même nombre de
  plans. Le Plan de départ compte dans les ${c.tours} — il reste ${c.tours - 1} plans à monter —,
  mais ni les Raccords ni les Génériques. On inscrit alors les points rapportés par chaque
  <b>plan visible</b> ; le plus haut total l’emporte.</p>

  <h3>Décompte des bandeaux</h3>
  <table class="tbl">
    <tr><th>Bandeau</th><th>Ce qu’il rapporte</th><th>Portée</th></tr>
    <tr><td><b>n × CADRAGE</b></td>
      <td>n points par plan de ce cadrage. Un bandeau peut en viser <b>deux</b> — « Plan Large &amp;
      Plan de départ » — : un plan qui porte l’un ou l’autre compte, et jamais deux fois</td>
      <td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × ICONE</b></td><td>n points par plan portant cette icône</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × 2 ICONES</b></td>
      <td>n points par <b>couple</b> d’icônes réunies dans la portée — quatre icônes font deux
      couples, cinq en font deux aussi ; un couple de deux icônes différentes en demande une de
      chaque</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × MORT</b></td><td>n points par plan de mort</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × PLAN SANS PERSONNAGE</b></td><td>n points par plan sans personnage</td>
      <td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × RACCORD</b></td><td>n points par Carte Raccord</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × PLAN</b></td><td>n points par carte</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n × MINUTAGE avant / après XX:00</b></td>
      <td>n points par plan dont le minutage est <b>strictement</b> antérieur — ou postérieur — au
      seuil</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n si ICONE absente</b></td><td>n points si l’icône ne paraît nulle part</td>
      <td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n si AUCUN MINUTAGE à / avant / après XX:00</b></td>
      <td>n points si <b>aucun</b> plan n’a ce minutage — à 00:00, cela vise les Raccords et les
      Génériques</td><td>Sa portée ◀ ▶</td></tr>
    <tr><td><b>n si DANS L’ORDRE</b></td>
      <td>n points si, lu d’un seul tenant sur <b>tout le montage</b>, ligne après ligne, chaque
      minutage est supérieur ou égal au précédent${c.chronoIgnoreZero
        ? ' — les Raccords et Génériques, à 00:00, sont <b>retirés de la lecture</b> : ils ne la coupent pas'
        : ''}</td><td>Le montage entier</td></tr>
    <tr><td><b>n × SÉQUENCE ≥ k</b></td>
      <td>n points par ligne comptant <b>au moins k plans</b> — un Raccord n’étant pas un plan, il
      n’y compte pas</td><td>Le montage entier</td></tr>
    <tr><td><b>n × SÉQUENCE ▲ / ▼</b></td>
      <td>n points par ligne placée <b>au-dessus</b> — ou <b>en dessous</b> — de celle qui porte le
      bandeau</td><td>Le montage entier</td></tr>
    <tr><td><b>n × PLAN de la plus longue SÉQUENCE</b></td>
      <td>n points par plan de la ligne la plus fournie du banc ; réglé sur 1, il vaut exactement sa
      longueur</td><td>Le montage entier</td></tr>
    <tr><td><b>n × SÉQUENCE avec / sans …</b></td>
      <td>n points par ligne qui porte — ou ne porte pas — l’icône, le cadrage ou la Carte Raccord
      visée</td><td>Le montage entier</td></tr>
  </table>

  <div class="encart attention">
    <b>Points laissés ouverts par le texte imprimé.</b> Ce ne sont pas des modifications de règle,
    mais des interprétations, chacune réglable dans <b>Variables</b> ⚙ : la portée des bandeaux
    imprimés qui ne précisent pas la leur (${portee(c)} par défaut) ; le sens de pose autorisé — les
    deux bouts d’une ligne, ou la droite seulement ; ce que représente le symbole ✕ noir de la
    famille Mort ; le rôle exact du minutage ; l’appariement recto-verso des Plans de départ.
  </div>`;
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
    des cartes. Glissé <b>entre deux séquences, il les raccorde forcément</b> : il ne peut pas s'y
    poser sans relier. Aux <b>deux bouts du montage</b>, en revanche, il se pose comme un plan
    ordinaire. Un Raccord posé entre deux séquences sans les relier n'existe pas.
    Il rapporte 1 point par carte de sa séquence.</li>`));
}

// --- v0.13.13 --------------------------------------------------------------
// La rivière montre toujours trois cartes par famille.

function corps_0_13_13(c) {
  const n = (v) => (v ? `${v} carte${v > 1 ? 's' : ''}` : 'autant de cartes que de joueuses');
  return corps_0_13_12(c)
    .replace(`<li>Les Plans Larges forment une pioche et un <b>chutier</b> de ${c.chutierPL || 'autant de cartes que de joueuses'}.</li>
    <li>Les Plans Moyens / Gros Plans forment une pioche et un chutier de ${c.chutierPMGP || 'autant de cartes que de joueuses'}.</li>`,
      maj('0.13.13', `<li>Les Plans Larges forment une <b>pioche face cachée</b> et un <b>chutier</b>
      de ${n(c.chutierPL)}.</li>
      <li>Les Plans Moyens / Gros Plans forment une <b>pioche face visible</b> — ces cartes sont
      recto-verso, une pioche ne peut pas les cacher — et un chutier de ${n(c.chutierPMGP)}.</li>`));
}

// --- v0.13.15 --------------------------------------------------------------
// « Dans l'ordre » se lit sur le film entier, Raccords retirés de la lecture.

function corps_0_13_15(c) {
  return corps_0_13_14(c).replace(
    /<tr><td><b>n si montage dans l’ordre<\/b><\/td>\s*<td>[\s\S]*?<\/td>\s*<td>Le montage<\/td><\/tr>/,
    maj('0.13.15', `<tr><td><b>n si montage dans l’ordre</b></td>
      <td>n points si, lu de gauche à droite sur <b>tout le montage</b>, séquences confondues,
      chaque minutage est supérieur ou égal au précédent${c.chronoIgnoreZero
        ? ' — les Raccords et Génériques, à 00:00, sont <b>retirés de la lecture</b> : ils ne la coupent pas'
        : ''}</td>
      <td>Le montage entier</td></tr>`));
}

// --- v0.13.14 --------------------------------------------------------------
// Un Raccord n'est pas un plan, et la fin se déclenche sur la première.

function corps_0_13_14(c) {
  // Le paragraphe de fin est réécrit en entier : on le repère par son titre,
  // car son texte a déjà changé en v0.13.6 et porte ses propres balises.
  return corps_0_13_13(c).replace(
    /(<h3>Fin de partie<\/h3>\s*)<p>[\s\S]*?<\/p>/,
    '$1' + majBloc('0.13.14', `<b>Un Raccord n'est pas un plan.</b> Un Raccord, une Ouverture, un Générique
    relient ou encadrent le film : ils ne le racontent pas. Ils ne comptent donc pas dans le total
    des ${c.tours} plans — en jouer un n'avance pas vers la fin.<br>
    <b>Dès qu'une joueuse pose son ${c.tours}<sup>e</sup> plan</b>, les autres ont droit à un tour
    chacune, puis la partie s'arrête : elles ne finissent donc pas forcément avec le même nombre de
    plans. On inscrit alors les points rapportés par chaque <b>plan visible</b> ; le plus haut total
    l'emporte.`));
}
