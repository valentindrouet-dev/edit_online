// ---------------------------------------------------------------------------
// EDIT — le livret de règles et l'aide de jeu
// ---------------------------------------------------------------------------
// Deux pages écrites pour être LUES, là où `regles.js` tient l'historique — le
// texte exact de chaque version, avec ce qui a changé d'une à l'autre. Le
// livret, lui, ne dit que la règle en vigueur, dans l'ordre où l'on en a besoin
// à la table : le but, le matériel, la mise en place, le tour, la fin, le
// décompte. Sa mise en page reprend celle d'un livret imprimé — un bandeau par
// section, des étapes numérotées, des encarts pour les cas particuliers.
//
// Tout ce qui se compte vient du MODÈLE et non d'un chiffre recopié : le
// nombre de cartes, les portées, les libellés des bandeaux. Une carte ajoutée
// dans l'éditeur, une variable changée, et le livret suit — il ne peut pas
// mentir sur un jeu qu'il décrit à côté.

import {
  FORMATS, ELEMENTS, ELEMENT_IDS, PORTEES, OBJ, objLabel, PAIRES_DEPART, PLANS_DEPART,
  buildCartesDoubles, buildPlansLarges, buildDeparts, SCENES, recenserBoite,
} from './data.js?v=2.14';
import { elIcon } from './icons.js?v=2.14';
import { objHTML } from './cards.js?v=2.14';

// --- Les briques de mise en page -------------------------------------------

/** Le bandeau d'une section — le titre sur son ruban. */
const section = (titre, corps, cls = '') => `<section class="lv-section ${cls}">
  <h2 class="lv-titre"><span>${titre}</span></h2>
  ${corps}
</section>`;

/** Une étape numérotée : la pastille, le titre, ce qu'on fait. */
const etape = (n, titre, corps) => `<div class="lv-etape">
  <span class="lv-num">${n}</span>
  <div><h3>${titre}</h3>${corps}</div>
</div>`;

/** Un encart : un cas particulier, une précision, une variante. */
const encart = (titre, corps, cls = '') => `<aside class="lv-encart ${cls}">
  ${titre ? `<h4>${titre}</h4>` : ''}${corps}
</aside>`;

/**
 * Une ligne de glossaire : le symbole à gauche, ce qu'il veut dire à droite —
 * et, tout à droite, **combien de cartes de la boîte** le portent. Ce compte
 * est celui des CARTES et non des plans : une carte double montre quatre plans
 * et ne se compte qu'une fois.
 */
const ligne = (symbole, texte, cls = '', n) => `<div class="lv-ligne ${cls}">
  <div class="lv-sym">${symbole}</div><div class="lv-txt">${texte}</div>
  ${n === undefined ? '' : `<div class="lv-n${n ? '' : ' zero'}"
    title="${n} carte${n > 1 ? 's' : ''} de la boîte ${n > 1 ? 'portent' : 'porte'} ceci"><b>${n}</b></div>`}
</div>`;

/**
 * Les deux écritures d'un même mot, telles qu'elles paraissent sur les cartes :
 * la longue quand la place le permet, la courte sur un Gros Plan.
 *
 * **Deux cartouches, jamais un seul.** « PLAN LARGE / PL » écrit dans une même
 * étiquette n'existe sur aucune carte : ce sont deux cartouches distincts, et
 * l'aide doit montrer ce qui est imprimé. On les pose donc côte à côte.
 */
const deuxCartouches = (dessine, long, court) => (long === court ? dessine(long)
  : `<span class="lv-paire-tag">${dessine(long)}${dessine(court)}</span>`);

/**
 * Le petit dos de carte qui coiffe la colonne des comptes. Un chiffre nu ne dit
 * pas ce qu'il compte ; ce symbole-là le dit une fois par bloc, sans répéter
 * « cartes » à chaque ligne.
 */
const ENTETE_CARTES = `<div class="lv-entete">
  <div class="lv-n" title="Combien de cartes de la boîte">
    <svg viewBox="0 0 20 24" width="15" height="18" aria-label="cartes" role="img">
      <rect x="4.5" y="1.5" width="14" height="19" rx="2.5" fill="none"
        stroke="currentColor" stroke-width="1.6" opacity=".45"/>
      <rect x="1.5" y="3.5" width="14" height="19" rx="2.5" fill="#fff"
        stroke="currentColor" stroke-width="1.6"/>
    </svg>
  </div>
</div>`;

/**
 * La famille d'une icône, telle qu'on la nomme à la table. Le modèle la range
 * sous PERSONNAGE ou ELEMENT ; le plan de mort n'en est pas une, c'est un état
 * du plan — d'où « Statut ».
 */
const FAMILLES_ICONE = { PERSONNAGE: 'Personnage', ELEMENT: 'Élément' };

/** Un cartouche de cadrage, tel qu'il paraît sur un bandeau. */
const cadre = (f) => `<span class="tag tag-fmt" style="--c:${FORMATS[f].color}">${FORMATS[f].label}</span>`;

/**
 * Le bandeau d'un pouvoir, dessiné comme sur la carte, sa phrase, son compte.
 * La phrase est SANS son nombre : il est dessiné dans le bandeau, juste à
 * gauche — l'écrire une seconde fois ne l'explique pas mieux.
 */
const pouvoir = (o, cfg, n) => ligne(`<span class="lv-bandeau">${objHTML(o, 30, cfg)}</span>`,
  objLabel(o, cfg, { sansNombre: true }), '', n);

// Un pouvoir de RÈGLE est déjà écrit en toutes lettres sur la carte : le
// traduire mot pour mot ne dirait rien de plus. On explique donc ce qu'il
// CHANGE, à côté de la phrase telle qu'elle est imprimée.
const regle = (o, cfg, effet) => ligne(
  `<span class="lv-bandeau">${objHTML(o, 26, cfg)}</span>`, effet, 'lv-regle');

// --- Le livret --------------------------------------------------------------

export function livret(cfg) {
  const c = cfg || {};
  const nbPL = buildPlansLarges(false).length;
  const nbDouble = buildCartesDoubles().length;
  const nbDepart = buildDeparts(!!c.sixCartesDepart).length;
  const nbScenes = SCENES().length;
  const tours = c.tours || 10;
  const seqMax = c.sequencesMax || 0;
  const parCote = c.plansParCote || 0;
  const riviere = c.chutierPL || 3;

  return `<article class="livret">

  <header class="lv-hero">
    <div class="lv-hero-titre">EDIT</div>
    <p class="lv-accroche">« Le film n’existe pas au tournage. Il naît au montage,
      quand deux plans se touchent. »</p>
    <p class="lv-sous">Un jeu de montage, de 2 à 4 joueuses</p>
  </header>

  ${section('Résumé et but du jeu', `
    <p>Chacune monte <b>son</b> film sur son <b>banc de montage</b>. À votre tour vous
    <b>dérushez</b> — vous prenez une carte — puis vous <b>montez</b> : vous l’accrochez à votre banc,
    d’un côté ou de l’autre d’une séquence.</p>
    <p>Une carte porte un <b>plan</b> : un cadrage, un minutage, des icônes, et souvent un
    <b>bandeau</b> qui dit ce qu’il vous rapportera. Ce bandeau ne compte pas la carte où il est
    écrit : il regarde <b>autour de lui</b> — sa ligne, ou le montage entier.</p>
    <p>Quand une joueuse a posé son <b>${tours}<sup>e</sup> plan</b>, la partie s’achève après un
    dernier tour. On compte alors ce que chaque bandeau a trouvé. <b>Le plus beau montage
    l’emporte</b> — c’est-à-dire celui qui marque le plus.</p>
  `, 'lv-resume')}

  ${section('Matériel', `
    <div class="lv-materiel">
      <div class="lv-mat"><b>${nbPL}</b><span>cartes <b>Plan Large</b><i>une carte entière</i></span></div>
      <div class="lv-mat"><b>${nbDouble}</b><span>cartes <b>Plan Moyen / Gros Plan</b>
        <i>deux moitiés, deux faces</i></span></div>
      <div class="lv-mat"><b>${nbDepart}</b><span>cartes <b>Plan de départ</b>
        <i>${c.sixCartesDepart ? 'variante « 6 Cartes Départ »' : 'deux versions, quatre exemplaires'}</i></span></div>
    </div>
    <p>Les ${nbDouble} cartes doubles sont faites de <b>${nbScenes} scènes</b>. Une scène existe en deux
    moitiés — un <b>Plan Moyen</b>, qui occupe les deux tiers d’une carte, et un <b>Gros Plan</b>, qui
    en occupe le tiers. Une carte assemble <b>deux moitiés de scènes différentes</b> : c’est ce qui
    fait qu’on choisit toujours entre deux plans en la posant.</p>
    ${encart('Recto et verso', `Une carte double se joue <b>par un bout</b> : le Plan Moyen à
      gauche et le Gros Plan à droite, ou l’inverse. Ce sont deux plans différents, avec chacun son
      minutage et son bandeau. Le côté où vous l’accrochez décide donc de ce que vous jouez.`)}
  `)}

  ${section('Une carte, en détail', `
    <div class="lv-anatomie">
      <ul class="lv-callouts">
        <li><b>Le minutage</b>, en haut à gauche, sur sa boîte noire. Il dit où le plan se place dans
          le film. <span class="lv-tc-b">--:--</span> se lit « pas de minutage » : la carte se pose
          où l’on veut. <span class="lv-tc-o">01:00</span> et <span class="lv-tc-o">99:00</span> sont
          les deux bornes — le premier et le dernier plan.</li>
        <li><b>Les icônes</b>, sur la languette claire : ce que le plan montre. Une carte peut porter
          plusieurs fois la même.</li>
        <li><b>Le bandeau</b>, la bande colorée du bas : ce que le plan vous rapporte. Il se lit
          « <b>n ×</b> quelque chose » — n points par chose trouvée — ou « <b>n si</b> » — n points,
          une seule fois, si la condition est remplie.</li>
        <li><b>Le cadrage</b>, écrit tout en bas et donné par la couleur de la carte :
          ${cadre('PL')} ${cadre('PM')} ${cadre('GP')} ${cadre('DEP')}.</li>
      </ul>
    </div>
    ${encart('Les icônes du jeu', `<div class="lv-icones">${ELEMENT_IDS
    .map((e) => `<span>${elIcon(e, 34)}${ELEMENTS[e].label}</span>`).join('')}
      <span>${elIcon('MORT', 34)}Plan de mort</span></div>`)}
  `)}

  ${section('Mise en place', `
    ${etape('A', 'Les pioches', `Mélangez les <b>${nbDouble} cartes Plan Moyen / Gros Plan</b> en une
      pioche, et les <b>${nbPL} Plans Larges</b> en une autre. Posez-les au centre.`)}
    ${etape('B', 'Les rivières', `Révélez <b>${riviere} cartes</b> de chaque pioche, en ligne à côté
      d’elle. Ce sont les <b>rivières</b> : c’est là qu’on dérushe.`)}
    ${etape('C', 'Les Plans de départ', c.sixCartesDepart
    ? `<b>Variante « 6 Cartes Départ ».</b> Mélangez les <b>6 cartes de départ</b> et donnez-en
         <b>une</b> à chaque joueuse. Chacune a donc <b>deux faces</b> au choix — et jamais le même
         couple que sa voisine.`
    : `Chaque joueuse prend <b>les deux versions</b> devant elle : elle a donc <b>quatre faces</b>
         au choix pour ouvrir son film.`)}
    ${etape('D', 'La première joueuse', `La dernière à avoir vu un bon film commence. À défaut,
      tirez au sort.`)}
    ${etape('E', 'Le premier plan', `Chacune choisit une face de son Plan de départ et la pose :
      c’est le premier plan de son montage, et le centre de sa première ligne.`)}
  `, 'lv-etapes')}

  ${section('Déroulement du jeu', `
    <p class="lv-chapeau">En commençant par la première joueuse, puis dans le sens des aiguilles
    d’une montre, chacune joue son tour jusqu’à ce que l’une ait posé son ${tours}<sup>e</sup> plan.</p>
    <h3 class="lv-sous-titre">À votre tour</h3>
    ${etape(1, 'Dérusher <i>(obligatoire)</i>', `Prenez <b>une carte</b> : dans la rivière des Plans
      Larges, dans celle des Plans Moyens / Gros Plans, ou — si une carte de votre montage vous en
      donne le droit — au <b>sommet d’une pioche</b>, sans la voir.`)}
    ${etape(2, 'Monter <i>(obligatoire)</i>', `Accrochez cette carte à votre banc. Une carte double
      se pose <b>par un bout</b> : choisissez lequel, et donc lequel de ses deux plans vous jouez.`)}
    ${etape(3, 'Passer la main', `La rivière se recomplète, et c’est au tour de la suivante.`)}
  `, 'lv-etapes')}

  ${section('Où poser une carte', `
    <p>Le banc se lit <b>comme une page</b> : chaque <b>séquence</b> occupe sa propre <b>ligne</b>,
    et les lignes s’empilent de haut en bas. Le montage se lit d’un seul tenant, ligne après ligne.</p>
    <ul class="lv-liste">
      <li>Un <b>Plan Large</b> est le climax d’une séquence : il <b>ouvre toujours une ligne</b>, à
        lui seul, et en tient le centre. Le <b>Plan de départ</b> fait de même. Deux Plans Larges ne
        peuvent jamais se toucher.</li>
      <li>Les <b>Plans Moyens</b> et les <b>Gros Plans</b> s’accrochent aux <b>deux bouts</b> d’une
        ligne, de part et d’autre de son Plan Large.</li>
      ${parCote > 0 ? `<li>Le <b>centre</b> d’une ligne est le <b>premier plan</b> qu’on y a posé —
        le Plan Large, ou le Plan de départ — et il n’y en a <b>qu’un</b>. De chaque côté de lui, on
        n’accroche pas plus de <b>${parCote} cartes</b>, <b>Raccords et Génériques compris</b> : ils
        prennent une place comme les autres. Une ligne s’étoffe, elle ne s’étire pas.</li>` : ''}
      ${seqMax > 0 ? `<li>Un banc ne porte que <b>${seqMax} lignes</b>. Une nouvelle séquence se pose
        au-dessus ou en dessous des autres, <b>jamais entre deux</b>.</li>` : ''}
      <li>Une <b>Carte Raccord</b> n’est pas un plan : elle ne compte pas dans les ${tours} plans qui
        arrêtent la partie. Elle occupe en revanche une <b>place</b> sur la ligne, comme toute carte.
        Posée au bout d’une ligne, elle y fait <b>charnière</b> — un second Plan Large peut alors se
        poser de l’autre côté d’elle. Ce second Plan Large ne devient pas un second centre : il est
        du côté du premier, et prend une place${parCote > 0 ? ` parmi les ${parCote}` : ''} comme
        toute carte.</li>
      <li><b>Deux Raccords ne se touchent pas</b>, et le <b>bord libre d’un Raccord n’accepte qu’un
        Plan Large</b> — jamais un Plan Moyen ni un Gros Plan. C’est là tout l’office du Raccord :
        il ouvre un second côté, et ce côté commence par son propre climax.</li>
      ${c.bornesBloquent === false ? '' : `<li><b>Rien avant le premier plan du film, rien après le
        dernier.</b> Le plan à <span class="lv-tc-o">01:00</span> ouvre le film, celui à
        <span class="lv-tc-o">99:00</span> le termine : on ne pose ni avant l’un ni après l’autre,
        et le montage se lisant ligne après ligne, une ligne ouverte sous celle qui porte le 99:00
        commencerait après la fin. Ces deux plans-là se posent donc <b>au bout qui leur revient</b>,
        et nulle part ailleurs.</li>`}
    </ul>
    ${encart('Le Raccord, la seule façon d’étoffer', `Un <b>Raccord</b> posé au bout d’une ligne
      appelle derrière lui un nouveau <b>Plan Large</b>, qui ouvre un second côté et repart à zéro.
      C’est par là qu’une séquence gagne en ampleur sans ouvrir une ligne de plus — mais il faut
      lui <b>garder la place</b> : le Raccord et le Plan Large qui le suit occupent chacun l’une des
      cartes du côté, ils ne s’ajoutent pas par-dessus une ligne déjà pleine.
      Poser un Raccord, c’est donc <b>appeler un Plan Large</b> : rien d’autre ne s’accrochera à son
      bord libre.`)}
    ${c.raccordOuvertMalus ? encart('Un Raccord qu’on n’a pas fermé',
    `Un Raccord promet une suite. Tant que le <b>Plan Large</b> n’est pas venu à son bord libre, il
      ne raccorde rien — il pend. Son « <b>x × Raccord</b> » vaut alors
      <b>${c.raccordOuvertMalus}</b>, à plat, quel que soit le nombre imprimé dessus et quoi qu’en
      dise une carte qui bonifie les Raccords. Un Raccord est <b>fermé</b> quand ses deux bords
      portent une carte et qu’un Plan Large — ou le Plan de départ — se trouve de l’un des deux
      côtés.`, 'attention') : ''}
  `)}

  ${section('Fin de la partie', `
    <p>Dès qu’une joueuse pose son <b>${tours}<sup>e</sup> plan</b>, la fin est déclenchée : chaque
    autre joueuse joue <b>un dernier tour</b>, puis on compte.</p>
    ${encart('La carte supplémentaire', `Une carte de votre montage peut dire :
      « <b>Après le dernier tour, vous pouvez jouer 1 Carte supplémentaire</b> ». Vous jouez alors un
      tour de plus que les autres, et vous y posez ce que vous voulez — un plan, ou un Raccord.`)}
  `)}

  ${section('Le décompte', `
    <p>On lit les <b>bandeaux</b>, un par un. Chacun regarde une <b>portée</b> — la part du montage
    qu’il compte — et rapporte ce qu’il y trouve.</p>
    <div class="lv-portees">${PORTEES.map((p) => `<div class="lv-portee">
      <span class="lv-fleches">${p.gauche ? '◀' : ''}${p.droite ? '▶' : ''}${
  !p.gauche && !p.droite ? '⬚' : ''}</span>
      <b>${p.label}</b></div>`).join('')}</div>
    <ul class="lv-liste">
      <li>Un bandeau ne compte <b>pas la carte où il est écrit</b> à part : elle fait partie de sa
        portée comme les autres.</li>
      <li>Une <b>Carte Raccord</b> n’est ni un Plan, ni un Gros Plan, ni un Plan Moyen : aucun
        bandeau de cadrage ne la compte. Elle reste une <b>Carte</b>.</li>
      <li>Une <b>Valeur de Plan</b> est un cadrage <b>différent</b> : une ligne qui alterne les
        trois en montre trois, quel qu’y soit le nombre de cartes.</li>
      <li>Un bandeau qui paie pour une <b>absence</b> — « n si telle icône est absente » — est la
        seule exception : celui-là <b>ne regarde pas sa propre carte</b>. Sans quoi un plan qui
        montre une Héroïne et dit « 4 si Héroïne absente après » serait son propre démenti.</li>
      <li>Les points se lisent au <b>coin de chaque carte</b> pendant la partie : c’est ce que ce
        plan-là vous rapporte, ici et maintenant. Un coin <b>vert</b> signale une Carte Raccord
        <b>bonifiée</b> : elle rapporte autre chose que ce qui est imprimé dessus.</li>
    </ul>
  `)}

  ${section('Variantes', `
    <div class="lv-variantes">
      ${encart('6 Cartes Départ', `Les quatre plans de départ s’apparient de <b>six façons</b> —
        ${PAIRES_DEPART.map(([a, b]) => `${PLANS_DEPART.indexOf(a) + 1}-${PLANS_DEPART.indexOf(b) + 1}`).join(', ')}.
        Chaque joueuse en pioche <b>une seule</b> : deux faces au choix au lieu de quatre, et jamais
        le même couple que sa voisine.`)}
      ${encart('Pas de Plans de départ', `Les quatre faces de départ rejoignent la pioche des Plans
        Larges. Plus de choix d’ouverture : on ouvre son banc en dérushant un Plan Large.`)}
      ${encart('Pioches mêlées', `Une seule pioche, une seule rivière, où les Plans Larges sont mêlés
        aux cartes doubles. On ne choisit plus sa famille : on prend ce qui vient.`)}
      ${encart('Pas deux fois le même plan', `Un film ne montre pas deux fois le même plan. L’interdit
        se règle : sur tout le banc, sur une même ligne, ou seulement entre voisins.`)}
      ${encart('Chronologie', `Un bonus par paire de plans dans l’ordre, un malus par paire à
        contresens. Les plans <b>sans minutage</b> sont retirés de la lecture : ils ne la coupent pas.`)}
    </div>
    <p class="lv-fin">Toutes ces variantes — et chaque nombre de ce livret — se règlent dans
    l’onglet <b>Variables</b>. Le livret suit ce qui y est réglé : ce que vous lisez ici est la règle
    de <b>votre</b> partie.</p>
  `)}

  </article>`;
}

// --- L'aide de jeu ----------------------------------------------------------
// Une fiche, pas un texte : ce qu'on pose à côté du banc pour retrouver d'un
// coup d'œil ce que dit un symbole. Les bandeaux y sont DESSINÉS comme sur la
// carte, puis traduits — c'est ce qu'on cherche quand on la consulte.

export function aideDeJeu(cfg) {
  const c = cfg || {};
  // Combien de CARTES de la boîte portent quoi. Le compte se lit à droite de
  // chaque ligne : c'est ce qu'on veut savoir en préparant une partie ou en
  // équilibrant le jeu — « combien de cartes ont une Arme », pas « combien de
  // plans ».
  const B = recenserBoite(c);
  const g = (o) => pouvoir(o, c, B.kinds[o.kind] || 0);
  const tag = (cls, long, court) => deuxCartouches(
    (t) => `<span class="tag ${cls}">${t}</span>`, long, court);
  const tagFmt = (f) => deuxCartouches(
    (t) => `<span class="tag tag-fmt" style="--c:${FORMATS[f].color}">${t}</span>`,
    FORMATS[f].label, FORMATS[f].short);

  return `<article class="aide-jeu">
  <header class="aj-hero"><h2>Aide de jeu</h2>
    <p>Ce que chaque symbole veut dire, à côté du banc.</p>
    <p class="aj-note">Le chiffre de droite compte les <b>cartes de la boîte</b> — jamais les
    faces : une carte double montre quatre plans et ne compte qu’une fois. Pour une icône, un
    cadrage ou un minutage, c’est le nombre de cartes qui le <b>portent</b> ; pour un cartouche ou
    un bandeau, le nombre de cartes qui en <b>parlent</b>. Il suit votre matériel : une carte
    retouchée dans l’éditeur change le compte.</p></header>

  <div class="aj-fiche">

    <div class="aj-colonne">

    <div class="aj-bloc">
      <h3>Les icônes</h3>
      ${ENTETE_CARTES}
      ${ELEMENT_IDS.map((e) => ligne(elIcon(e, 38),
    `${FAMILLES_ICONE[ELEMENTS[e].famille]} - ${ELEMENTS[e].label}`,
    '', B.icones[e] || 0)).join('')}
      ${ligne(elIcon('MORT', 38), 'Statut - Mort', '', B.icones.MORT || 0)}
    </div>

    <div class="aj-bloc">
      <h3>Les cadrages</h3>
      ${ENTETE_CARTES}
      ${['PL', 'PM', 'GP', 'DEP'].map((f) => ligne(tagFmt(f),
    FORMATS[f].label, '', B.cadrages[f] || 0)).join('')}
      ${ligne(tag('tag-gris', 'Raccord', 'Raccord'), 'Raccord (pas un Plan)', '', B.raccord)}
      ${ligne(tag('tag-blanc', 'Valeur de Plan', 'Val.'), 'Valeur de Plan (cadrage différent)',
    '', B.cibles.VALEUR || 0)}
    </div>

    </div>

    <div class="aj-colonne">

    <div class="aj-bloc">
      <h3>Le minutage</h3>
      ${ENTETE_CARTES}
      ${ligne('<span class="lv-tc-r">30:00</span>', 'Minutage du Plan', '', B.tc.ORDINAIRE || 0)}
      ${ligne('<span class="lv-tc-b">--:--</span>',
    'Pas de minutage : le Plan ne rompt jamais l’ordre', '', B.tc.VIDE || 0)}
      ${ligne('<span class="lv-tc-o">01:00</span>', 'Minutage du premier plan', '', B.tc.PREMIER || 0)}
      ${ligne('<span class="lv-tc-o">99:00</span>', 'Minutage du dernier plan', '', B.tc.DERNIER || 0)}
    </div>

    <div class="aj-bloc">
      <h3>Les mots-clés</h3>
      ${ENTETE_CARTES}
      ${ligne(tag('tag-blanc', 'Plan', 'Plan'),
    'Un <b>plan</b> : toute carte du montage <b>sauf</b> un Raccord', '', B.cibles.PLAN || 0)}
      ${ligne(tag('tag-seq', 'Séquence', 'Séq'),
    'Une <b>ligne</b> du banc de montage, incluant toutes ses cartes', '', B.cibles.SEQUENCE || 0)}
      ${ligne(tag('tag-blanc', 'Icône', 'Ic.'),
    'N’importe quelle <b>icône</b>', '', B.cibles.ICONE || 0)}
      ${ligne('<span class="tag tag-chrono">↗ ordre</span>',
    'Le minutage est dans l’<b>ordre croissant</b> (de gauche à droite, ligne après ligne)',
    '', B.cibles.ORDRE || 0)}
      ${ligne(tag('tag-blanc', 'Carte', 'Carte'),
    'Une <b>carte</b> (Raccords compris)', '', B.cibles.CARTE || 0)}
    </div>

    <div class="aj-bloc">
      <h3>Les portées</h3>
      ${ENTETE_CARTES}
      ${PORTEES.map((p) => ligne(
    `<span class="lv-fleches">${p.gauche ? '◀' : ''}${p.droite ? '▶' : ''}${
      !p.gauche && !p.droite ? '⬚' : ''}</span>`, p.label, '', B.portees[p.id] || 0)).join('')}
    </div>

    </div>

  </div>

  <div class="aj-bandeaux">

    <div class="aj-bloc">
      <h3>Les bandeaux qui comptent</h3>
      ${ENTETE_CARTES}
      ${g(OBJ.plan(1, 'SEQUENCE'))}
      ${g(OBJ.raccord(2))}
      ${g(OBJ.format(2, 'GP'))}
      ${g(OBJ.element(1, 'ARME'))}
      ${g(OBJ.paire(2, 'ARME', 'HEROINE'))}
      ${g(OBJ.mort(3))}
      ${g(OBJ.minutage(2, 'AVANT', 30))}
      ${g(OBJ.lot(2, 'ARME', 3))}
      ${g(OBJ.planIcones(1, 3, 'EXACT'))}
      ${g(OBJ.extreme(2, 'PLUS'))}
      ${g(OBJ.absentes(2))}
      ${g(OBJ.centre(1, 'PLAN', 'DROITE'))}
      ${g(OBJ.ailleurs(1, 'ARME', 'DESSOUS'))}
      ${g(OBJ.doubleCarte(1, 'PLUS', 'POINTS'))}
    </div>

    <div class="aj-bloc">
      <h3>Les bandeaux qui se déclenchent</h3>
      ${ENTETE_CARTES}
      ${g(OBJ.chrono(6))}
      ${g(OBJ.absent(5, 'ALLIE'))}
      ${g(OBJ.domine(4, 'ARME', 'PLUS'))}
      ${g(OBJ.seuilCible(3, 'ARME', 'MIN', 4))}
      ${g(OBJ.sansTc(3, 'AVANT', 30))}
      ${g(OBJ.seqToutes(4, 3, 'MIN'))}
    </div>

    <div class="aj-bloc">
      <h3>Les bandeaux qui lisent les lignes</h3>
      ${ENTETE_CARTES}
      ${g(OBJ.seqTaille(2, 3))}
      ${g(OBJ.seqAvec(2, 'AVEC', 'ARME', 2))}
      ${g(OBJ.seqAvec(2, 'SANS', 'MORT'))}
      ${g(OBJ.seqAvec(2, 'AVEC', 'VALEUR', 3))}
      ${g(OBJ.seqVoisines(2, 'APRES'))}
      ${g(OBJ.seqLongue(2))}
    </div>

    <div class="aj-bloc">
      <h3>Les pouvoirs de règle</h3>
      <p class="aide">Ceux-là ne rapportent pas de points : ils changent une règle pour vous, tant
      que la carte est dans votre montage. Ils s’écrivent en toutes lettres, et leur carte n’a pas
      de compteur. En voici l’effet exact — la phrase, elle, est sur la carte.</p>
      ${regle(OBJ.piocher('PMGP'), c, `Au moment de dérusher, vous pouvez prendre la carte du
        <b>sommet de la pioche</b> plutôt qu’une de la rivière. Vous ne la voyez pas avant de la
        prendre, et personne d’autre ne l’a vue.`)}
      ${regle(OBJ.sequencePlus(1), c, `Votre banc porte <b>une ligne de plus</b> que les
        ${c.sequencesMax || 5} de la règle. Elle s’ouvre comme les autres : au-dessus ou en dessous
        de la pile, jamais entre deux.`)}
      ${regle(OBJ.planPlus(1), c, `La fin tombe au ${c.tours || 10}<sup>e</sup> plan <b>pour tout le
        monde</b> : ce pouvoir ne la retarde pas. Une fois le dernier tour joué, vous jouez
        <b>un tour de plus</b> — et vous y posez ce que vous voulez, un plan ou un Raccord.`)}
      ${regle(OBJ.raccordVaut(1), c, `Un <b>modificateur</b> : le « x × Raccord » imprimé sur
        <b>vos</b> Cartes Raccord devient « x+1 × Raccord ». Un « −2 » se lit « −1 », un « 2 » se
        lit « 3 ». Un Raccord qui porte <b>autre chose</b> garde son bandeau, et l’Ouverture comme
        le Générique de fin ne sont pas des Cartes Raccord. Deux cartes qui le disent
        <b>s’ajoutent</b>. La carte qui le porte ne gagne rien elle-même ; le Raccord bonifié, lui,
        montre son coin de points en <b>vert</b>.`)}
    </div>

  </div>
  </article>`;
}
