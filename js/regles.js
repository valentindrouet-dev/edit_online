// ---------------------------------------------------------------------------
// EDIT — les règles du jeu, version 4.1
// ---------------------------------------------------------------------------
// Le texte des règles, dans l'ordre où l'on en a besoin à la table : le but, le
// matériel, la mise en place, le tour, la pose, la fin, le décompte.
//
// Il dit ce que le MOTEUR joue (`engine.js`, `scoring.js`) : chaque nombre vient
// de la configuration — plans à monter, taille de la rivière, séquences, cartes
// par côté — ou du matériel — combien de cartes, lesquelles. Une variable
// changée, une carte retouchée, et le texte suit : il ne peut pas décrire un
// autre jeu que celui qui se joue à côté.

import {
  ELEMENTS, ELEMENT_IDS, SCENES, DEPARTS, buildCartesDoubles, buildPlansLarges, buildDeparts,
  carteComplete, moitiesDe, TC_VIDE, TC_PREMIER, TC_DERNIER,
} from './data.js';
import { elIcon } from './icons.js';
import {
  section, etape, encart, vignette, bande, afficheur, nomCarte, porteesHTML, lexiquePouvoirs,
} from './livret.js';

/** La version des règles : celle du jeu. */
export const REGLES_VERSION = '4.1';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Une carte à deux Gros Plans, ses deux moitiés côte à côte. */
const carteDouble = (g, d) => `<span class="lv-double">${vignette(g)}${vignette(d)}</span>`;

/** Une figure : des cartes, et ce qu'il faut y voir. */
const figure = (cartes, legende, cls = '') => `<figure class="lv-figure ${cls}">
  <div class="lv-figure-cartes">${cartes}</div>
  <figcaption>${legende}</figcaption>
</figure>`;

/** Une séquence d'exemple : ce qu'on a monté à gauche du centre, le centre, ce qu'on a monté à droite. */
const rangee = (gauche, centre, droite) => `<div class="lv-rangee">
  <span class="lv-cote g">${gauche.map((n) => vignette(n)).join('')}</span>
  <span class="lv-centre">${vignette(centre)}</span>
  <span class="lv-cote d">${droite.map((n) => vignette(n)).join('')}</span>
</div>`;

/** Les règles en vigueur, pour cette configuration-là. */
export function corpsRegles(cfg) {
  const c = cfg || {};

  // --- Ce que la configuration règle ---------------------------------------
  const tours = c.tours || 12;
  const riviere = Math.max(1, (c.riviere | 0) || 4);
  const defausse = c.defausse !== false;
  const parChutier = c.chutierRiviere !== false;
  const seqMax = c.sequencesMax > 0 ? c.sequencesMax : 0;     // 0 : aucune limite
  const parCote = c.plansParCote > 0 ? c.plansParCote : 0;    // 0 : aucune limite

  // --- Ce que la boîte contient --------------------------------------------
  const larges = buildPlansLarges().filter((x) => x.actif);
  const plansDepart = DEPARTS();
  const cartesDepart = buildDeparts();
  const doubles = buildCartesDoubles().filter((x) => x.actif && carteComplete(x));
  const nbGP = SCENES().length;
  // Les moitiés imprimées, et ce que la boîte imprime plus d'une fois.
  const moities = doubles.flatMap((x) => { const m = moitiesDe(x); return [m.G, m.D]; }).filter(Boolean);
  const nbMoities = moities.length;
  const combien = (t) => moities.filter((h) => h.transition === t).length;
  const parNum = new Map();
  for (const h of moities) {
    if (!h.transition && h.tc === TC_VIDE) parNum.set(h.numOrigine, (parNum.get(h.numOrigine) || 0) + 1);
  }
  const sansMinutageDoubles = [...parNum.values()].filter((k) => k > 1).length;
  const fois = (k) => (k > 1 ? `${k} fois` : 'une fois');
  const nbPL = larges.length + plansDepart.length;
  const pioche = larges.length + doubles.length;
  const nomsDepart = plansDepart.map((p) => `L${p.num}`);
  const couples = cartesDepart.map((d) => d.faces.map((f) => `L${f.num}`).join(' / ')).join(', ');
  const enListe = (noms) => (noms.length > 1
    ? `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}` : noms.join(''));

  // Une carte à deux Gros Plans à montrer : la première dont les deux moitiés
  // ont un minutage — c'est la plus parlante.
  const exempleDouble = doubles.map((x) => moitiesDe(x))
    .find((m) => m.G && m.D && m.G.tc !== TC_VIDE && m.D.tc !== TC_VIDE && m.G.visuel && m.D.visuel);
  const [exG, exD] = exempleDouble ? [nomCarte(exempleDouble.G), nomCarte(exempleDouble.D)] : ['GP15', 'GP40'];
  const [dep1, dep2] = [nomsDepart[0] || 'L5', nomsDepart[1] || 'L7'];

  // Le plan de départ qui porte tel pouvoir de règle — pour le nommer.
  const porteur = (kind) => {
    const p = plansDepart.find((x) => x.obj && x.obj.kind === kind);
    return p ? `L${p.num}` : null;
  };
  const lChutier = porteur('PIOCHER');
  const lSequence = porteur('SEQ_PLUS');
  const lTour = porteur('PLAN_PLUS');
  const seqPlus = (plansDepart.find((x) => x.obj && x.obj.kind === 'SEQ_PLUS') || { obj: { n: 1 } }).obj.n;

  const eme = (n) => `${n}<sup>e</sup>`;

  return `<article class="livret">

  <header class="lv-hero">
    <img class="lv-logo" src="assets/marque/edit.webp" alt="EDIT" width="888" height="378">
    <p class="lv-accroche">« Le film n’existe pas au tournage. Il naît au montage,
      quand deux plans se touchent. »</p>
    <p class="lv-sous">Un jeu de montage, de 2 à 4 joueuses</p>
  </header>

  ${section('But du jeu', `
    <p>Chacune monte <b>son</b> film sur son <b>banc de montage</b>. À votre tour, vous prenez
    <b>une carte</b> dans la rivière et vous la <b>montez</b> aussitôt : un <b>Plan Large</b> ouvre
    une séquence, un <b>Gros Plan</b> s’accroche au bout d’une séquence.</p>
    <p>Chaque plan porte un <b>pouvoir</b> : il rapporte des points selon ce que montre votre
    montage — ses icônes, ses minutages, la forme de ses séquences.</p>
    <p>Quand une joueuse a monté son <b>${eme(tours)} plan</b>, on termine le tour de table, puis on
    compte. <b>Le montage qui marque le plus l’emporte.</b></p>
  `, 'lv-resume')}

  ${section('Matériel', `
    <div class="lv-materiel">
      <div class="lv-mat"><b>${nbPL}</b><span><b>Plans Larges</b>
        <i>dont ${pluriel(plansDepart.length, 'Plan')} de départ</i></span></div>
      <div class="lv-mat"><b>${doubles.length}</b><span>cartes à <b>deux Gros Plans</b>
        <i>${nbGP} Gros Plans différents</i></span></div>
      <div class="lv-mat"><b>${cartesDepart.length}</b><span><b>cartes de départ</b>
        <i>recto verso</i></span></div>
    </div>
    <div class="lv-planche">
      ${figure(vignette('L1'), `Un <b>Plan Large</b> : une seule image, qui prend toute la carte
        (120 × 80 mm).`)}
      ${figure(carteDouble(exG, exD), `Une <b>carte à deux Gros Plans</b>, coupée en deux au centre : la
        <b>moitié gauche</b> et la <b>moitié droite</b>, de 60 × 80 mm chacune.`)}
      ${figure('<img class="lv-carte pl" src="assets/s41/DOS.webp" alt="Le dos des cartes" loading="lazy" decoding="async" draggable="false">',
    `Le <b>dos</b> des cartes : le même pour toute la pioche — on ne sait pas si l’on tirera un Plan
        Large ou une carte à deux Gros Plans.`)}
      ${figure(`${vignette(dep1)}<span class="lv-verso">↻</span>${vignette(dep2)}`, `Une <b>carte de
        départ</b> : un Plan de départ sur chaque face. C’est la seule carte recto verso du jeu.`,
    'lv-depart')}
    </div>
    <p>Les <b>${pluriel(plansDepart.length, 'Plan')} de départ</b> — ${enListe(nomsDepart)} — sont des
    Plans Larges imprimés deux par deux sur les cartes de départ : ${plansDepart.length} plans font
    ${pluriel(cartesDepart.length, 'couple')}, donc ${pluriel(cartesDepart.length, 'carte')}
    ${cartesDepart.length > 1 ? 'différentes' : ''} (${couples}).</p>
    <p>Les <b>${larges.length} autres Plans Larges</b> et les <b>${doubles.length} cartes à deux Gros
    Plans</b> forment la <b>pioche</b> : ${pioche} cartes.</p>
    <p>Trois Gros Plans ne sont pas des plans : le <b>Raccord</b>, l’<b>Ouverture</b> et la
    <b>Fin</b>. Ils relient ou encadrent le film ; ils ne portent aucune icône.</p>
    ${encart('Gauche ou droite ?', `Les Gros Plans à ${afficheur(10)}, ${afficheur(20)} et
      ${afficheur(30)} sont imprimés sur une moitié <b>gauche</b>, avec l’Ouverture ; ceux à
      ${afficheur(40)}, ${afficheur(50)} et ${afficheur(60)} sur une moitié <b>droite</b>, avec la
      Fin. Les Gros Plans sans minutage (${afficheur(TC_VIDE)}) et le Raccord se trouvent des deux
      côtés.`)}
    ${encart('Plusieurs exemplaires', `Certains Gros Plans sont imprimés plus d’une fois : le
      <b>Raccord</b> ${fois(combien('RACCORD'))}, l’<b>Ouverture</b> ${fois(combien('OUVERTURE'))}, la
      <b>Fin</b> ${fois(combien('CREDITS'))}${sansMinutageDoubles ? `, et ${sansMinutageDoubles} des Gros Plans
      sans minutage deux fois — une fois en moitié gauche, une fois en moitié droite` : ''}. D’où
      ${nbMoities} moitiés pour ${nbGP} Gros Plans différents.`)}
  `)}

  ${section('Lire un plan', `
    <div class="lv-anatomie">
      <div class="lv-ana-carte">
        ${vignette('GP13')}
        <span class="lv-rep r1">1</span><span class="lv-rep r2">2</span><span class="lv-rep r3">3</span>
      </div>
      <ol class="lv-callouts">
        <li><b>Le minutage</b>, sur l’afficheur en haut à gauche : le moment du plan dans le film, de
          ${afficheur(10)} à ${afficheur(60)}. ${afficheur(TC_VIDE)} se lit « sans minutage ».
          L’Ouverture est à ${afficheur(TC_PREMIER)}, la Fin à ${afficheur(TC_DERNIER)}.</li>
        <li><b>Les icônes</b>, en colonne sous le minutage : ce que le plan montre. La première, la
          plus grande, est la <b>dominante</b> — elle donne sa couleur à la carte. Un plan peut
          porter deux fois la même icône.</li>
        <li><b>Le pouvoir</b>, sur la bande du bas : ce que ce plan vous rapporte à la fin de la
          partie, ou la règle qu’il change pour vous.</li>
      </ol>
    </div>
    ${encart('Les icônes du jeu', `<div class="lv-icones">${ELEMENT_IDS
    .map((e) => `<span>${elIcon(e, 34)}${ELEMENTS[e].label}</span>`).join('')}
      <span>${elIcon('MORT', 34)}Le crâne : un plan de mort</span></div>`)}
    ${figure('<img class="lv-aide" src="assets/aides/ICONES.webp" alt="Aide de jeu : les icônes" loading="lazy" decoding="async" draggable="false">',
    'L’aide de jeu <b>Icônes</b> de la boîte : les icônes, et les mots que les pouvoirs emploient.', 'lv-figure-aide')}
    <p>Le minutage <b>ne contraint pas la pose</b> : vous montez vos plans dans l’ordre que vous
    voulez. Certains pouvoirs, en revanche, paient un montage dont les minutages se suivent.</p>
  `)}

  ${section('Mise en place', `
    ${etape('A', 'Les cartes de départ', `Mélangez les <b>${pluriel(cartesDepart.length, 'carte')} de
      départ</b> et donnez-en <b>une</b> à chaque joueuse. Les autres retournent dans la boîte.`)}
    ${etape('B', 'La pioche', `Mélangez <b>ensemble</b> les Plans Larges et les cartes à deux Gros
      Plans : ${pioche} cartes, en une seule pioche, <b>face cachée</b>. On ne sait jamais ce qu’on
      va tirer.`)}
    ${etape('C', 'La rivière et le Chutier', `Révélez <b>${pluriel(riviere, 'carte')}</b> en ligne, à
      côté de la pioche : c’est la <b>rivière</b>. Elle compte ${pluriel(riviere, 'carte')} quel que
      soit le nombre de joueuses. Gardez une place pour le <b>Chutier</b>, la défausse.`)}
    ${etape('D', 'Le Plan de départ', `${c.premierJoueurAleatoire === false
    ? 'Convenez de la première joueuse.' : 'Tirez au sort la première joueuse.'} En commençant par
      elle, chacune <b>choisit une face</b> de sa carte de départ et la pose devant elle : ce Plan de
      départ ouvre sa première séquence.`)}
  `, 'lv-etapes')}

  ${section('Le tour de jeu', `
    <p class="lv-chapeau">On joue chacune son tour, dans le sens des aiguilles d’une montre. Un
    tour, c’est une carte prise et montée.</p>
    ${defausse ? etape(1, 'Défausser <i>(facultatif)</i>', `Avant de choisir, vous <b>pouvez</b>
      écarter <b>une</b> carte de la rivière : elle part au Chutier, face visible. La rivière se
      recomplète aussitôt avec la carte du dessus de la pioche. Une seule défausse par tour.`) : ''}
    ${etape(defausse ? 2 : 1, 'Prendre une carte', `Choisissez <b>une</b> des ${riviere} cartes de la
      rivière. La carte du dessus de la pioche vient prendre sa place. Vous ne pouvez prendre
      qu’une carte que votre banc peut accueillir.`)}
    ${etape(defausse ? 3 : 2, 'La monter', `Montez-la <b>aussitôt</b> dans votre banc de montage. On
      ne garde jamais de carte en main. Puis la main passe à la joueuse suivante.`)}
    ${encart('Le Chutier', defausse ? `C’est la défausse du jeu. Les cartes y sont empilées
      <b>face visible</b> : on ne voit que la dernière défaussée.
      ${lChutier ? `<br>Le Plan de départ <b>${lChutier}</b> donne un droit à qui l’a dans son
      montage : prendre, à la place d’une carte de la rivière, <b>la carte du dessus du Chutier</b>
      — ${riviere + 1} cartes au choix au lieu de ${riviere}.
      <div class="lv-encart-carte">${bande(lChutier)}</div>` : ''}`
    : `Vos Variables écartent la défausse : le Chutier ne reçoit aucune carte${lChutier
      ? `, et le pouvoir du Plan de départ <b>${lChutier}</b> reste sans effet` : ''}.`)}
    ${encart('Rien à monter ?', `${defausse ? `Si aucune carte offerte n’a de place dans votre banc,
      défaussez-en une pour en faire venir une autre. S’il n’y a toujours rien à monter,` : `Si aucune
      carte offerte n’a de place dans votre banc,`} vous <b>passez</b> votre tour. Si toutes les
      joueuses passent l’une après l’autre, la partie s’arrête et l’on compte.`)}
    ${encart('La pioche est vide', parChutier
    ? `Chaque carte prise dans la rivière est remplacée par la <b>carte du dessus du Chutier</b> — la
        dernière défaussée —, une par une. ${defausse ? 'On ne défausse plus : la carte écartée reviendrait aussitôt.' : ''}`
    : `La rivière ne se recomplète plus : on joue avec les cartes qui restent.`)}
  `, 'lv-etapes')}

  ${section('Monter une carte', `
    <p>Votre banc de montage porte ${seqMax ? `au plus <b>${pluriel(seqMax, 'séquence')}</b>` : 'des séquences'},
    posées <b>l’une au-dessus de l’autre</b>. Chaque séquence est une ligne de cartes. Le montage se
    lit comme une page : de gauche à droite, séquence après séquence, de haut en bas.</p>
    <figure class="lv-banc">
      ${rangee(['GP30', 'GP13'], dep1, ['GP41', 'GP100', 'L15'])}
      ${rangee(['GP21'], 'L8', ['GP52'])}
      <figcaption>Un banc à deux séquences. Les <b>centres</b> sont cerclés d’orange : le Plan de
        départ en haut, un Plan Large en dessous. À gauche des centres, des moitiés gauches ; à
        droite, des moitiés droites. En haut à droite, un <b>Raccord</b> a permis de monter un
        second Plan Large${parCote === 3 ? ' : ce côté porte ses 3 cartes, il est plein' : ''}.</figcaption>
    </figure>
    <ul class="lv-liste">
      <li><b>Le centre.</b> Une séquence est ouverte par un <b>Plan Large</b> — la première, par
        votre <b>Plan de départ</b>. Ce plan en est le <b>centre</b>, et le reste jusqu’à la fin.</li>
      ${parCote ? `<li><b>${pluriel(parCote, 'carte')} de chaque côté.</b> On ne monte pas plus de
        ${pluriel(parCote, 'carte')} à gauche du centre, ni plus de ${parCote} à sa droite. Toute
        carte prend une place : Gros Plan, Raccord, Ouverture, Fin, ou Plan Large monté à la suite
        d’un Raccord.</li>` : ''}
      <li><b>Un Plan Large ouvre une séquence</b>, au-dessus ou en dessous des autres — jamais entre
        deux.${seqMax ? ` Quand votre banc a ses ${pluriel(seqMax, 'séquence')}, un Plan Large n’y
        entre plus qu’à la suite d’un Raccord.` : ''}</li>
      <li><b>Une carte à deux Gros Plans se monte par une moitié.</b> La <b>moitié gauche</b>
        s’accroche au <b>bout gauche</b> d’une séquence ; la <b>moitié droite</b>, à son <b>bout
        droit</b>. Vous choisissez la moitié et la séquence. L’autre moitié, glissée sous la carte
        voisine, ne compte plus.</li>
      <li><b>On ne monte qu’au bout.</b> Une carte s’ajoute à l’extrémité d’une séquence, jamais
        entre deux cartes déjà posées, et une carte posée ne se déplace plus.</li>
    </ul>
    ${encart('Le Raccord', `Le Raccord est une moitié de carte : il se monte au bout d’une séquence,
      comme un Gros Plan. ${c.raccordAppellePL
    ? 'Mais son bord libre n’accepte ensuite qu’un <b>Plan Large</b> — ni Gros Plan, ni autre Raccord.'
    : 'Son bord libre accepte ensuite un <b>Plan Large</b> ou un Gros Plan — jamais un autre Raccord.'}
      C’est la <b>seule façon</b> de monter un second Plan Large dans une séquence. Ce Plan Large n’est pas un nouveau centre ; après lui, on accroche de nouveau des
      Gros Plans, s’il reste de la place.${parCote ? `<br>Le Raccord <b>ne donne pas de place</b> :
      lui et le Plan Large qui le suit comptent parmi les ${pluriel(parCote, 'carte')} de leur
      côté.` : ''}
      <div class="lv-encart-carte">${vignette('GP100')}</div>`, 'lv-avec-carte')}
    ${encart('L’Ouverture et la Fin', `Deux moitiés de carte sans icône, qui se montent comme les
      autres. L’Ouverture, à ${afficheur(TC_PREMIER)}, paie si aucun plan ne la précède dans le
      montage ; la Fin, à ${afficheur(TC_DERNIER)}, si aucun plan ne la suit.
      <div class="lv-encart-carte">${vignette('GP101')}${vignette('GP102')}</div>`, 'lv-avec-carte')}
    ${lSequence && seqMax ? encart('Une séquence de plus', `Le Plan de départ <b>${lSequence}</b>
      donne à qui l’a dans son montage le droit d’ouvrir <b>${pluriel(seqMax + seqPlus, 'séquence')}</b>
      au lieu de ${seqMax}.
      <div class="lv-encart-carte">${bande(lSequence)}</div>`) : ''}
  `)}

  ${section('Fin de la partie', `
    <p>Dès qu’une joueuse monte son <b>${eme(tours)} plan</b>, Plan de départ compris, la fin est
    déclenchée : <b>chaque autre joueuse joue encore un tour</b>, puis on compte.</p>
    <p>Le <b>Raccord</b>, l’<b>Ouverture</b> et la <b>Fin</b> ne sont pas des plans : ils prennent
    une place dans la séquence, mais ne comptent pas parmi les ${tours} plans.</p>
    ${lTour ? encart('Un tour de plus', `Le Plan de départ <b>${lTour}</b> donne un tour
      supplémentaire à qui l’a dans son montage : une fois le dernier tour joué, elle prend et monte
      encore une carte.
      <div class="lv-encart-carte">${bande(lTour)}</div>`) : ''}
  `)}

  ${section('Le décompte', `
    ${figure('<img class="lv-aide" src="assets/aides/EFFETS.webp" alt="Aide de jeu : les effets de plans" loading="lazy" decoding="async" draggable="false">',
    'L’aide de jeu <b>Effets de plans</b> : comment se lit chaque pouvoir.', 'lv-figure-aide')}
    <p>Chaque plan de votre montage rapporte ce que dit son <b>pouvoir</b>. Additionnez-les : le
    total le plus haut l’emporte. ${c.scorerDepart === false ? 'Le Plan de départ, lui, ne rapporte rien. ' : ''}En
    cas d’égalité, la victoire est partagée.</p>
    <ul class="lv-liste">
      <li>« <b>n ×</b> … » : n points <b>pour chaque</b> chose comptée.</li>
      <li>« <b>n si</b> … » : n points, <b>une seule fois</b>, si la condition est tenue.</li>
      <li>Une <b>croix rouge</b> sur un symbole se lit « aucun » ; <b>MAX</b>, « la plus présente » ;
        <b>5+</b>, « au moins 5 » ; le <b>?</b>, « n’importe quelle icône ».</li>
      <li>Les <b>flèches</b> disent où le pouvoir regarde.</li>
    </ul>
    ${c.pointsParPlan ? `<p>Vos Variables ajoutent <b>${pluriel(c.pointsParPlan, 'point')}</b> par
      carte montée.</p>` : ''}
    ${(c.multiplicateurObjectif ?? 1) !== 1 ? `<p>Vos Variables multiplient ce que rapporte chaque
      pouvoir par <b>${c.multiplicateurObjectif}</b>.</p>` : ''}
    <div class="lv-lexique">
      ${porteesHTML(c)}
      ${lexiquePouvoirs(c)}
    </div>
    <p class="lv-fin">Pendant la partie, les points se lisent au <b>coin de chaque plan</b> de votre
    montage : c’est ce que ce plan-là vous rapporte, ici et maintenant.</p>
    ${figure('<img class="lv-aide" src="assets/aides/SCORE.webp" alt="La feuille de score" loading="lazy" decoding="async" draggable="false">',
    'La <b>feuille de score</b> de la boîte : une colonne par joueuse, de 1 à 4, et son <b>total</b>.', 'lv-figure-aide')}
  `)}

  ${section('Points à confirmer avec l’auteur', `
    ${encart('', `<p>Ces règles sont celles que le site joue. Voici où il a fallu trancher :</p>
    <ul class="lv-liste">
      <li>Le <b>Plan de départ</b> compte parmi les ${tours} plans qui arrêtent la partie ; le Raccord,
        l’Ouverture et la Fin n’en sont pas.</li>
      <li>Après une défausse, la rivière est <b>recomplétée tout de suite</b> : on choisit toujours
        parmi ${pluriel(riviere, 'carte')}.</li>
      ${parChutier && defausse ? '<li>Pioche vide : on <b>ne défausse plus</b> — la carte écartée reviendrait aussitôt du Chutier dans la rivière.</li>' : ''}
      <li>L’<b>Ouverture</b> et la <b>Fin</b> se montent comme les autres moitiés ; elles ne sont
        ni des plans, ni des Raccords.</li>
      <li>L’<b>Entracte</b> (L10, ${afficheur(35)}, sans icône) est joué comme un Plan Large ordinaire.</li>
      <li>Qui ne peut rien monter <b>passe</b> ; à égalité de points, la victoire est partagée.</li>
    </ul>`, 'attention')}
    <p class="lv-fin">Chaque nombre de ces règles suit l’onglet <b>Variables</b> : ce que vous lisez
    ici est la règle de <b>votre</b> partie.</p>
  `, 'lv-a-confirmer')}

  </article>`;
}
