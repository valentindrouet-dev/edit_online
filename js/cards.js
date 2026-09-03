// ---------------------------------------------------------------------------
// EDIT — rendu des cartes
// ---------------------------------------------------------------------------
// Une carte n'apporte que son illustration : le minutage, sa boîte, les
// pastilles, le bandeau d'objectif et le libellé de cadrage sont entièrement
// redessinés par l'application, à partir de ses propres données. Les images
// d'assets/ sont recadrées au-dessus de la zone d'information et leur minutage
// imprimé est effacé — voir outils/extraire-visuels.py. La boîte noire du coin,
// elle, y est restée peinte : l'application la redessine par-dessus, pour que
// les plans habillés d'une image apportée l'aient eux aussi.
//
// Les proportions reprennent la carte réelle : illustration jusqu'à 69 % de la
// hauteur, languette des pastilles jusqu'à 78,5 %, bandeau jusqu'à 93,7 %,
// puis le libellé.

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel, tcTexte, teinteTc, seuilTexte, estRegleKind, cibleDe, objPortee, PORTEES, objsDe, teinteObj, encreLibelle, transformeCadre } from './data.js?v=2.7';
import { elIcon, numIcon, cadrageIcon } from './icons.js?v=2.7';

// Le minutage s'écrit à un seul endroit — `tcTexte`, dans le modèle. Il y avait
// ici une seconde copie de la même formule ; les deux ont divergé le jour où
// « 00:00 » est devenu « --:-- », et l'une des deux écritures serait restée en
// arrière. Le nom court reste, il sert dans tout l'écran.
export const tc = tcTexte;

/**
 * Le contenu d'un bandeau d'objectif, en icônes. `compact` sert au Gros Plan,
 * dont le bandeau ne fait qu'un tiers de carte : on y renonce à l'étiquette
 * « ◀ Plan ▶ », que l'aperçu au survol donne de toute façon en toutes lettres.
 */
export function objContenu(obj, taille, compact, cfg, large) {
  if (!obj) return '';
  const p = PORTEES.find((x) => x.id === objPortee(obj, cfg)) || PORTEES[3];
  // La flèche prend la couleur de ce qu'elle entoure : rouge sombre autour de
  // l'Ennemi, brun autour d'un Véhicule. On la voit ainsi comme une partie de
  // l'icône, et non comme une décoration posée à côté.
  const teinte = teinteObj(obj);
  const fleche = (cote) => (p[cote]
    ? `<span class="fleche-pos" style="--fl:${teinte}">${cote === 'gauche' ? '◀' : '▶'}</span>` : '');
  // Les flèches se serrent contre ce qu'elles portent : elles en font partie.
  // Les pièces du cœur, elles, sont des mots distincts — « Séquence » et sa
  // flèche, « Plan » et son seuil, deux cadrages — et respirent : dans un
  // conteneur flex, les espaces du HTML ne comptent pas, il leur faut un gap.
  return `<span class="obj-noyau">${fleche('gauche')}<span class="obj-coeur">${
    objCoeur(obj, taille, compact, large)}</span>${fleche('droite')}</span>`;
}

/**
 * La croix de l'interdit, sur une icône que le bandeau veut absente. Deux
 * barres plutôt qu'un caractère : un « ✕ » de fonte, agrandi jusqu'à se voir,
 * finit par recouvrir l'icône et l'on ne sait plus ce qui est interdit. Deux
 * barres laissent quatre quartiers ouverts — la croix domine, l'icône se lit
 * encore. Le liseré blanc la détache de tout ce qu'elle recouvre.
 */
function croixNon() {
  const traits = '<line x1="15" y1="15" x2="85" y2="85"/><line x1="85" y1="15" x2="15" y2="85"/>';
  return `<span class="croix-non" aria-hidden="true"><svg viewBox="0 0 100 100">
    <g stroke="#fff" stroke-width="19" stroke-linecap="round" opacity=".9">${traits}</g>
    <g stroke="#e0102f" stroke-width="10.5" stroke-linecap="round">${traits}</g>
  </svg></span>`;
}

/**
 * La phrase d'un pouvoir de règle. Aucun symbole ne dit « vous pouvez monter
 * une séquence de plus » : ceux-là s'écrivent. Le Gros Plan n'a qu'un tiers de
 * carte et en reçoit une forme courte ; l'aperçu au survol garde la phrase
 * entière, dans les deux cas.
 */
export function phraseRegle(obj, compact) {
  const s = (n) => (n > 1 ? 's' : '');
  // Un modificateur porte son signe : « +1 », « −2 ». Sans lui, « 1 par
  // Raccord » se lirait comme une valeur et non comme un bonus.
  const signeRegle = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
  switch (obj.kind) {
    case 'PIOCHER': return compact
      ? `Pioche ${obj.cible === 'PL' ? 'PL' : 'PM/GP'}`
      : `Vous pouvez piocher sur la pioche ${obj.cible === 'PL' ? 'Plans Larges' : 'PM / GP'}`;
    case 'SEQ_PLUS': return compact ? `+${obj.n} séquence`
      : `Vous pouvez monter ${obj.n} séquence${s(obj.n)} supplémentaire${s(obj.n)}`;
    case 'PLAN_PLUS': return compact ? `+${obj.n} Carte`
      : `Après le dernier tour, vous pouvez jouer ${obj.n} Carte${s(obj.n)} supplémentaire${s(obj.n)}`;
    // Un Gros Plan partagé à deux n'a de place que pour une douzaine de
    // caractères : la forme courte garde le sens — les Raccords deviennent
    // « n × Raccord » — en abrégeant le mot. La phrase entière reste dans
    // l'aperçu au survol, comme pour les autres pouvoirs de règle.
    case 'RACCORD_VAUT': return compact
      ? `Racc. ${signeRegle(obj.n)}`
      : `Les cartes Raccord vous rapportent ${signeRegle(obj.n)} par Raccord`;
    default: return '';
  }
}

/**
 * La même phrase, mais DESSINÉE : les mots qui désignent une carte du jeu y
 * prennent leur cartouche — « la pioche PM / GP » montre les deux étiquettes de
 * cadrage, « les cartes Raccord » l'étiquette grise du Raccord. On lit alors le
 * pouvoir avec le même vocabulaire que les bandeaux qui comptent, au lieu d'un
 * texte qui les nomme.
 *
 * `phraseRegle` reste le TEXTE : c'est lui que mesure le calcul du corps, et
 * c'est lui que reprend l'aperçu au survol.
 */
function phraseRegleHTML(obj, compact) {
  const s = (n) => (n > 1 ? 's' : '');
  const signeRegle = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
  // Un groupe que la phrase ne coupe pas : « 1 SÉQUENCE supplémentaire » se lit
  // d'un tenant, sinon le nombre reste seul en bout de ligne.
  const lie = (x) => `<span class="insec">${x}</span>`;
  const rac = `<span class="tag tag-gris">Raccord</span>`;
  switch (obj.kind) {
    case 'PIOCHER': {
      if (compact) return phraseRegle(obj, compact);
      const quoi = obj.cible === 'PL' ? tagCadrage('PL', false)
        : `${tagCadrage('PM', true)}<span class="mot-regle">/</span>${tagCadrage('GP', true)}`;
      return `Vous pouvez piocher sur la pioche ${lie(quoi)}`;
    }
    case 'SEQ_PLUS': return compact ? phraseRegle(obj, compact)
      : `Vous pouvez monter ${lie(`${obj.n} ${tagSeq(false)}`)} supplémentaire${s(obj.n)}`;
    case 'RACCORD_VAUT': return compact ? phraseRegle(obj, compact)
      : `Les cartes ${rac} vous rapportent ${lie(`${signeRegle(obj.n)} par ${rac}`)}`;
    default: return phraseRegle(obj, compact);
  }
}

/** Ce que le bandeau compte, sans les flèches de portée. */
function objCoeur(obj, taille, compact, large) {
  switch (obj.kind) {
    case 'RACCORD': return `<span class="tag tag-gris">Raccord</span>`;
    case 'PLAN':    return `<span class="tag tag-blanc">Plan</span>`;
    case 'FORMAT':  return tagCadrage(obj.format, compact)
      + (obj.format2 ? `<span class="et-cadrage">&amp;</span>${tagCadrage(obj.format2, compact)}` : '');
    case 'ELEMENT': return elIcon(obj.el, taille);
    // Les icônes d'un groupe se **chevauchent** au lieu de se suivre : le
    // bandeau d'un Gros Plan n'a qu'un tiers de carte, et des pastilles
    // séparées d'un trait n'y entraient pas. Superposées, un couple tient dans
    // une largeur et demie, un trio dans deux — et chacune se lit encore.
    case 'PAIRE':   return `<span class="paire ${obj.els.length > 2 ? 'trio' : ''}">${
      obj.els.map((e) => elIcon(e, taille)).join('')}</span>`;
    case 'MORT':    return elIcon('MORT', taille);
    case 'ABSENT':  return `<span class="barre">${
      cibleHTML(cibleDe(obj), taille, compact)}${croixNon()}</span>`;
    // « n si l'Arme domine » : la cible, puis le mot qui dit lequel des deux
    // bouts on vise. Le même cartouche que « l'icône la plus présente », dont
    // ce bandeau est la version nommée.
    case 'DOMINE': return `${cibleHTML(cibleDe(obj), taille, compact)}
      <span class="tc-seuil">${obj.sens === 'MOINS' ? 'min' : 'max'}</span>`;
    // Sur un bandeau, la place manque : « avant / après » se lit « < » et « > ».
    // Le libellé en toutes lettres reste dans l'aperçu au survol.
    case 'MINUTAGE': return `${compact ? '' : '<span class="tag tag-blanc">Plan</span>'}
      <span class="tc-seuil minutage">${obj.sens === 'APRES' ? '&gt;' : '&lt;'}&nbsp;${
        tcTexte(obj.seuil)}</span>`;
    case 'CHRONO':  return `<span class="tag tag-chrono">↗ ordre</span>`;
    // « n si aucun plan à --:-- » : le mot dit l'absence, et il la dit mieux
    // qu'une croix posée sur l'afficheur — elle en recouvrait les chiffres.
    // Le minutage garde sa couleur propre : bleue quand il n'y en a pas,
    // orangée pour les deux bornes du film, rouge partout ailleurs. Et le
    // « = » disparaît : « aucun --:-- » se lit tout seul, le signe ne servait
    // qu'à distinguer un sens qui n'a pas de flèche.
    case 'SANS_TC': return bloc2(`<span class="mot grand">aucun</span>`,
      `<span class="tc-seuil minutage grand ${teinteTc(obj.seuil)}">${
        obj.sens === 'AVANT' ? `&lt;&nbsp;${tcTexte(obj.seuil)}`
          : obj.sens === 'APRES' ? `&gt;&nbsp;${tcTexte(obj.seuil)}`
            : tcTexte(obj.seuil)}</span>`, 'centre');
    // Les bandeaux de séquence : la pastille violette dit qu'on compte des
    // séquences et non des plans, et ce qui la suit dit lesquelles.
    // Le seuil prend la couleur de ce qu'il compte : « 3+ » et « PLAN » disent
    // une seule chose — trois plans —, et deux cartouches de couleurs
    // différentes les donnaient pour deux.
    // « 3+ » et « PLANS » ne font qu'un CARTOUCHE : ils disent une seule chose —
    // trois plans —, et deux étiquettes côte à côte les donnaient pour deux.
    case 'SEQ_TAILLE': return blocSeq(compact,
      `<span class="tag tag-blanc">${seuilTexte(obj.sens === 'MAX' ? 'MAX' : 'MIN', obj.seuil)}
        Plan${obj.seuil > 1 ? 's' : ''}</span>`, large);
    case 'SEQ_VOISINES': return `${tagSeq(compact)}
      <span class="fleche-seq">${obj.sens === 'APRES' ? '▼' : '▲'}</span>`;
    // « La plus longue » : on compte ses plans, d'où la pastille Plan.
    // « de la plus longue » n'est pas une chose du jeu : c'est du texte qui
    // relie deux cartouches. Il s'écrivait dans la pastille violette de la
    // Séquence, qui désigne pourtant une seule chose — la séquence.
    case 'SEQ_LONGUE': return `<span class="tag tag-blanc">Plan</span>
      <span class="mot">${compact ? '+ longue' : 'de la plus longue'}</span>${tagSeq(compact)}`;
    case 'SEQ_AVEC': {
      // La cible se dessine comme partout ailleurs. Cette branche la redessinait
      // pour son compte, et n'avait prévu ni la Valeur de Plan ni le plan de
      // mort : « séquence avec 3+ Valeurs de Plan » s'affichait « SÉQUENCE avec
      // 3+ » — le seuil sans ce qu'il compte.
      const quoi = cibleHTML(obj.cible, taille, compact);
      // Sans seuil, la lecture d'origine : la cible seule, barrée d'une croix
      // pour « sans ». Dès qu'un seuil est demandé, c'est un compte
      // d'exemplaires qui se lit — « 3+ » ou « moins de 3 » —, et la croix
      // disparaît : elle dirait « aucun », ce qui n'est plus ce que le bandeau
      // demande.
      const k = Math.max(1, obj.seuil || 1);
      if (obj.sens === 'SANS' && k === 1) {
        return `${tagSeq(compact)}<span class="barre">${quoi}${croixNon()}</span>`;
      }
      // Un seuil sur une ICÔNE se DESSINE : autant de pastilles empilées que le
      // seuil en demande, puis un « + ». On lit alors ce qu'il faut trouver —
      // deux roues — au lieu de le déchiffrer dans un « 2+ » suivi d'une roue.
      // Les pastilles se chevauchent, comme le couple d'icônes : deux tiennent
      // dans une largeur et demie, et le Gros Plan n'a qu'un tiers de carte.
      if (k > 1 && obj.sens !== 'SANS' && cibleEstIcone(obj.cible)) {
        const pile = `<span class="paire ${k > 2 ? 'trio' : ''}">${
          Array.from({ length: Math.min(k, 4) },
            () => cibleHTML(obj.cible, taille, compact)).join('')
        }</span><span class="plus-seuil">+</span>`;
        return large ? `${tagSeq(compact)}<span class="mot">avec</span>${pile}`
          : blocSeq(compact, pile, large);
      }
      // Une icône seule tient sur la ligne : « SÉQ avec 🔫 » n'a pas besoin de
      // se replier, et une pastille dans une ligne repliée n'a plus de hauteur
      // de référence — elle reprenait sa taille naturelle et débordait.
      if (cibleEstIcone(obj.cible)) return `${tagSeq(compact)}<span class="mot">avec</span>${quoi}`;
      // Sur un mot, le seuil s'écrit — et dans la couleur de ce qu'il compte.
      const seuil = k > 1
        ? `<span class="tag tag-blanc">${seuilTexte(obj.sens === 'SANS' ? 'MOINS' : 'MIN', k)}</span>`
        : '';
      return blocSeq(compact, `${seuil}${quoi}`, large);
    }
    // --- Les pouvoirs du vocabulaire commun --------------------------------
    // Chacun montre sa cible, précédée ou suivie de ce qui le distingue : une
    // flèche de pile pour les autres lignes, un pivot pour le centre, un seuil
    // pour ceux qui en ont un.
    // En compact — un Gros Plan —, la pastille « Séquence » saute : la flèche
    // violette dit déjà qu'on regarde d'autres lignes, et la place manque.
    case 'AILLEURS': return `${compact ? '' : tagSeq(false)}<span class="fleche-seq">${
      obj.sens === 'DESSUS' ? '▲' : obj.sens === 'DESSOUS' ? '▼' : '⇅'
    }</span>${cibleHTML(obj.cible, taille, compact)}`;
    case 'CENTRE': {
      const q = cibleHTML(obj.cible, taille, compact);
      const pivot = `<span class="tag tag-blanc">${compact ? 'ctr' : 'centre'}</span>`;
      // L'ordre de lecture dit le côté : la cible avant le pivot quand on
      // compte à gauche, après quand on compte à droite.
      return obj.sens === 'DROITE'
        ? `${pivot}<span class="fleche-pos">▶</span>${q}`
        : `${q}<span class="fleche-pos">◀</span>${pivot}`;
    }
    case 'LOT': return `<span class="tag tag-lot">${compact ? `×${obj.seuil}` : `lot de ${obj.seuil}`}</span>${
      cibleHTML(obj.cible, taille, compact)}`;
    // Le seuil s'écrit comme il se dit : « au moins 5 🔑 », « au plus 1 💀 ».
    // Les mots sont ceux du bandeau — blancs, dans la police du « si » —, et
    // « MIN » / « MAX », posés en fin de formule, ne disaient rien de plus.
    // Le nombre est une QUANTITÉ : il prend la couleur de ce qu'il compte, et
    // se lit à la taille de la valeur du bandeau. Dans sa pastille noire de
    // cartouche, un chiffre seul était illisible.
    case 'SEUIL': {
      const q = cibleHTML(obj.cible, taille, compact);
      // « Au plus zéro » se dit « aucun » : le nombre s'en va avec le mot.
      // Le mot s'écrit à la taille du « si » — mais pas dans un tiers de carte,
      // où « au moins » à ce corps-là débordait de la bande. Le Gros Plan garde
      // les mêmes mots, à la taille ordinaire.
      const g2 = compact ? '' : ' grand';
      if (obj.sens === 'MAX' && obj.seuil === 0) return `<span class="mot${g2}">aucun</span>${q}`;
      return `<span class="mot${g2}">${obj.sens === 'MAX' ? 'au plus' : 'au moins'}</span>${
        nombreCible(obj.seuil, obj.cible, !compact)}${q}`;
    }
    // « n × icône absente » : la croix posée sur le cartouche ICÔNE en rognait
    // les lettres, et l'on n'y lisait ni le mot ni l'interdit. Le bandeau
    // compte des icônes ABSENTES — celles qui ne paraissent nulle part —, et
    // c'est un compte, pas une négation : il s'écrit donc, comme « avec ».
    case 'ABSENTES': return `<span class="tag tag-blanc">${compact ? 'Ic.' : 'Icône'}</span>
      <span class="mot">absente</span>`;
    // Celui-ci garde ses « MIN » / « MAX » : écrits en toutes lettres, ils ne
    // tiendraient pas dans le tiers de carte d'un Gros Plan — le bandeau porte
    // déjà deux cartouches et un nombre.
    case 'SEQ_TOUTES': return `<span class="tag tag-seq">${compact ? 'toutes' : 'chaque séq'}</span>
      ${nombreCible(obj.seuil, 'PLAN')}<span class="tag tag-blanc">Plan</span>
      <span class="tc-seuil">${obj.sens === 'MAX' ? 'MAX' : 'MIN'}</span>`;
    case 'EXTREME': return `<span class="tag tag-blanc">${compact ? 'Ic.' : 'Icône'}</span>
      <span class="tc-seuil">${obj.sens === 'MOINS' ? 'min' : 'max'}</span>`;
    case 'PLAN_ICONES': return `<span class="tag tag-blanc">Plan</span>
      <span class="tc-seuil">${obj.sens === 'EXACT' || !obj.sens
    ? `=&nbsp;${obj.seuil}` : seuilTexte(obj.sens, obj.seuil)}${
  compact ? '' : '&nbsp;icônes'}</span>`;
    // --- Les pouvoirs de règle : une phrase, dans la police du « × » -------
    case 'PIOCHER': case 'SEQ_PLUS': case 'PLAN_PLUS': case 'RACCORD_VAUT':
      return `<span class="regle-mot">${phraseRegleHTML(obj, compact)}</span>`;
    case 'DOUBLE': return `<span class="tag tag-blanc">${
      obj.sens === 'PLUS' ? (compact ? '+ grosse' : 'plus grosse carte')
        : (compact ? '+ petite' : 'plus petite carte')}</span>${
      obj.critere === 'POINTS' ? '' : `<span class="tc-seuil">${
        obj.critere === 'ICONES' ? (compact ? 'ic.' : 'icônes') : (compact ? 'cadr.' : 'cadrage')}</span>`}`;
    default: return '';
  }
}

/**
 * Une cible du vocabulaire commun, dessinée : une icône garde son rond, un
 * cadrage son étiquette de couleur, et ce qui n'a pas d'image — une carte, une
 * valeur — prend un mot. Les neuf bandeaux qui partagent ce vocabulaire
 * partagent donc aussi son dessin.
 */
function cibleHTML(cible, taille, compact) {
  switch (cible) {
    case 'CARTE':    return '<span class="tag tag-blanc">Carte</span>';
    case 'PLAN':     return '<span class="tag tag-blanc">Plan</span>';
    case 'RACCORD':  return '<span class="tag tag-gris">Raccord</span>';
    case 'MORT':     return elIcon('MORT', taille);
    case 'SEQUENCE': return tagSeq(compact);
    case 'ICONE':    return `<span class="tag tag-blanc">${compact ? 'Ic.' : 'Icône'}</span>`;
    case 'VALEUR':   return `<span class="tag tag-blanc">${compact ? 'Val.' : 'Valeur de Plan'}</span>`;
    default:         return FORMATS[cible] ? tagCadrage(cible, compact) : elIcon(cible, taille);
  }
}

/** L'étiquette d'un cadrage, dans sa couleur. */
function tagCadrage(f, compact) {
  return `<span class="tag tag-fmt" style="--c:${FORMATS[f].color}">${
    compact ? FORMATS[f].short : FORMATS[f].label}</span>`;
}

/**
 * Le nombre d'un seuil, dans la couleur de ce qu'il compte : « 5 » sur le doré
 * de l'Objet, « 1 » sur le noir du plan de mort. C'est une QUANTITÉ, pas une
 * étiquette — elle se lit à la taille de la valeur du bandeau, et sa couleur la
 * rattache à l'icône qui la suit.
 */
function nombreCible(n, cible, grand) {
  const fond = teinteObj({ kind: 'SEUIL', cible });
  const bord = ELEMENTS[cible] ? ELEMENTS[cible].ring : '#3a3b44';
  return `<span class="tc-seuil nombre${grand ? ' grand' : ''}"
    style="background:${fond};border-color:${bord}">${n}</span>`;
}

/** La pastille « Séquence » des bandeaux qui comptent des séquences. */
function tagSeq(compact) {
  return `<span class="tag tag-seq">${compact ? 'Séq' : 'Séquence'}</span>`;
}

/**
 * Ce bandeau-là se replie-t-il sur DEUX lignes ? La question se pose au serrage,
 * qui raisonne en largeur : replié, il en réclame moins mais occupe toute la
 * hauteur de la bande, et ne peut donc pas grossir comme les autres.
 */
function plieEnDeux(obj, compact, large) {
  if (obj.kind === 'SANS_TC') return true;
  if (large) return false;
  if (obj.kind === 'SEQ_TAILLE') return true;
  if (obj.kind !== 'SEQ_AVEC') return false;
  const k = Math.max(1, obj.seuil || 1);
  if (obj.sens === 'SANS' && k === 1) return false;
  return k > 1 || !cibleEstIcone(obj.cible);
}

/**
 * Ce qu'une cible dessine : une PASTILLE, ou un mot dans un cartouche. C'est ce
 * qui décide de la mise en page d'un bandeau de séquence — un seuil sur une
 * icône se montre en empilant les pastilles, un seuil sur un mot s'écrit.
 */
const CIBLES_MOT = ['CARTE', 'PLAN', 'RACCORD', 'SEQUENCE', 'ICONE', 'VALEUR'];
const cibleEstIcone = (c) => !CIBLES_MOT.includes(c) && !FORMATS[c];

/**
 * Un bandeau de séquence sur DEUX LIGNES : « SÉQ avec » au-dessus, ce qu'il
 * faut y trouver en dessous, aligné sous le cartouche. Tout tenait sur une
 * seule ligne, et le bandeau devait alors se resserrer jusqu'à l'illisible pour
 * caser « SÉQ avec 3+ PLAN » dans un tiers de carte. Replié, il reprend de la
 * hauteur — et donc du corps.
 */
function bloc2(haut, bas, cls = '') {
  return `<span class="seq-bloc ${cls}">
    <span class="seq-ligne">${haut}</span>
    <span class="seq-ligne">${bas}</span>
  </span>`;
}

function blocSeq(compact, suite, large) {
  // Un Plan Large occupe la carte entière : sa bande est deux fois plus large
  // que celle d'un Plan Moyen, et tout y tient sur une ligne. Le repli est fait
  // pour la place qui manque, pas pour elle-même.
  return large ? `${tagSeq(compact)}<span class="mot">avec</span>${suite}`
    : bloc2(`${tagSeq(compact)}<span class="mot">avec</span>`, suite);
}

/** L'objectif en entier — « 2 × ⛨ » — pour les cartes et les tableaux. */
export function objHTML(obj, taille, cfg) {
  if (!obj) return '';
  if (estRegle(obj)) return `<span class="obj-html">${objContenu(obj, taille, false, cfg)}</span>`;
  const n = numIcon(obj.n, taille);
  return `<span class="obj-html">${n}<span class="${estSi(obj) ? 'si' : 'x'}">${estSi(obj) ? 'si' : '×'}</span>${objContenu(obj, taille, false, cfg)}</span>`;
}

/** Les bandeaux qui se lisent « n si … » plutôt que « n × … ». */
const OBJ_SI = ['ABSENT', 'CHRONO', 'SANS_TC', 'SEUIL', 'SEQ_TOUTES', 'DOMINE'];
export const estSi = (o) => !!o && OBJ_SI.includes(o.kind);

/**
 * Les bandeaux qui ne se lisent ni « n × » ni « n si » : une phrase, sans
 * valeur devant. Un pouvoir de règle ne rapporte pas n points — il donne un
 * droit —, et lui coller un « 1 × » ferait lire un compte là où il n'y en a
 * pas.
 */
export const estRegle = (o) => !!o && estRegleKind(o.kind);

// --- Ce qu'un bandeau réclame comme place -----------------------------------
// Toutes les pastilles d'un bandeau — la valeur comme les icônes — font la
// MÊME taille, et ne se rétrécissent pas les unes au détriment des autres.
// Pour tenir cette promesse il faut savoir, avant de dessiner, si le contenu
// entre dans la place disponible : sinon c'est le bandeau ENTIER qui se
// resserre, d'un coup, en gardant ses proportions.
//
// Les coûts sont **mesurés**, pas devinés : un rond fait 2,11 em, une flèche
// de portée 1,10, le « × » 0,88, le « si » 1,25, et une étiquette environ
// 0,75 + 0,42 par caractère. Une vérification compare ce calcul au rendu réel
// pour chaque pouvoir et chaque cadrage — si les deux divergent, elle le dit.
// Deux profils, car la **lecture nue** — sans illustration — donne au bandeau
// près du double de hauteur et grossit tout ce qu'il porte. Les deux jeux de
// nombres sont relevés de la même façon, sur le rendu réel.
const PROFILS = {
  illustre: { rond: 2.11, fleche: 1.1, x: 0.88, si: 1.25, tag0: 0.75, tag1: 0.42 },
  nu:       { rond: 2.92, fleche: 1.52, x: 1.23, si: 1.75, tag0: 0.8, tag1: 0.56 },
};
const EM = { gap: 0.24, gapCoeur: 0.34, sep: 0.78, chevauche: 0.78 };

// La plus petite pastille qu'on accepte de dessiner, en em de la carte.
const ATOME_MIN = 1.05;
// Jusqu'où un bandeau court s'autorise à grandir. Les ronds font 82 % de la
// hauteur de la bande : au-delà de ce facteur ils la déborderaient, et la bande
// ne s'étire pas — c'est elle qui aligne le bas des deux moitiés d'une carte.
const PLAFOND_SERRAGE = 1.2;
// Un bandeau de séquence replié sur deux lignes en profite pour grossir : sa
// ligne la plus large réclame donc un peu plus que sa mesure à plat.
const BLOC_SEQ = 1.18;
// Le nombre de tête d'un seuil est écrit bien plus gros que les cartouches
// voisins — c'est une quantité, pas une étiquette.
const NOMBRE_SEUIL = 1.5;
// Deux lignes tiennent dans la hauteur d'une bande, mais tout juste : un
// bandeau replié ne s'autorise pas le grossissement des bandeaux courts.
const PLAFOND_PLIE = 0.92;
// Les mots d'un seuil — « au moins », « aucun » — s'écrivent à la taille du
// « si » qui les précède : la formule se lit d'un seul corps.
const MOT_GRAND = 1.9;

// Quel profil vaut en ce moment. L'application le dit — elle seule sait si la
// lecture nue est demandée, et elle le sait AVANT de dessiner. Interroger le
// document à la place reviendrait toujours à lire l'état d'avant : la classe
// n'est posée qu'une fois le HTML construit.
let lectureNue = false;
export function reglerLectureNue(v) { lectureNue = !!v; }

/** La place utile d'un bandeau, selon le cadrage de la moitié qui le porte. */
const LARGEUR_MOITIE = { GP: 6.72, PM: 13.28, PL: 20, DEP: 20 };

// La hauteur d'une moitié, en em de la carte, et la part qu'y prend le bandeau :
// 18 % avec l'illustration, 30 % en lecture nue. C'est cette hauteur qui décide
// du nombre de lignes dont dispose une phrase.
const HAUTEUR_MOITIE = 13.8;
const PART_BANDEAU = { illustre: 0.18, nu: 0.3 };

/**
 * Le corps d'écriture d'une phrase de pouvoir de règle, en em de la carte.
 *
 * Une phrase de C caractères écrite au corps f occupe environ 0,53 × C × f de
 * longueur totale. Repliée dans une boîte large de W, elle tient sur
 * 0,53 × C × f / W lignes, hautes de 1,05 × f chacune. Poser cette hauteur
 * égale à celle du bandeau donne f d'un coup, sans essais successifs :
 *
 *     f = √( H × W / (0,56 × C) )
 *
 * Le corps est borné des deux côtés : une phrase de trois mots ne doit pas
 * devenir un titre, et une phrase longue reste lisible plutôt que de disparaître.
 */
// Le plus petit corps qu'une phrase s'autorise, et la largeur d'un caractère
// pour un corps de 1 em — mesurées sur le rendu réel, et partagées avec le
// serrage, qui en déduit ce qu'une phrase réclame au minimum.
const CORPS_PHRASE_MIN = 0.3;
const CORPS_PHRASE_MAX = 0.86;
const LARGEUR_CAR = 0.56;

function corpsPhrase(texte, large, nu) {
  const H = HAUTEUR_MOITIE * (nu ? PART_BANDEAU.nu : PART_BANDEAU.illustre) * 0.86;
  const W = Math.max(1, large - 0.5);
  const C = Math.max(1, String(texte).length);
  return Math.max(CORPS_PHRASE_MIN,
    Math.min(CORPS_PHRASE_MAX, Math.sqrt((H * W) / (LARGEUR_CAR * C))));
}

/**
 * Ce que réclame le cœur d'un bandeau — ce qui suit le « × ». Cette fonction
 * suit `objCoeur` pas à pas : ce qui s'y dessine se compte ici. Un pouvoir
 * ajouté sans passer par là serait sous-estimé, et la vérification le
 * signalerait aussitôt.
 */
function coutCoeur(obj, compact, P, large) {
  const t = (long, court) => P.tag0 + P.tag1 * String(compact && court !== undefined ? court : long).length;
  // Un cartouche de CADRAGE se replie : il est borné en largeur et coupe aux
  // espaces — « PLAN DE DÉPART » tient sur deux lignes. Sa largeur minimale est
  // donc celle de son mot le plus long, pas celle de la phrase entière. Compté
  // d'une seule ligne, il réclamait deux fois trop de place, et le bandeau se
  // resserrait sur une bande où il restait pourtant du vide des deux côtés.
  const tw = (long, court) => {
    const txt = String(compact && court !== undefined ? court : long);
    const plusLong = txt.split(/\s+/).reduce((a, m) => (m.length > a.length ? m : a), '');
    return P.tag0 + P.tag1 * plusLong.length;
  };
  const cible = (c) => {
    if (c === 'CARTE') return t('Carte');
    if (c === 'PLAN') return t('Plan');
    if (c === 'RACCORD') return t('Raccord');
    if (c === 'MORT') return P.rond;
    if (c === 'SEQUENCE') return t('Séquence', 'Séq');
    if (c === 'ICONE') return t('Icône', 'Ic.');
    if (c === 'VALEUR') return t('Valeur de Plan', 'Val.');
    return FORMATS[c] ? t(FORMATS[c].label, FORMATS[c].short) : P.rond;
  };
  const tt = (x) => P.tag0 + P.tag1 * String(x).length;
  // Un mot nu — « avec » — n'a pas le rembourrage d'un cartouche : seules ses
  // lettres comptent.
  const mot = (x) => P.tag1 * String(x).length;
  const g = EM.gapCoeur;
  switch (obj.kind) {
    case 'RACCORD': return t('Raccord');
    case 'PLAN': return t('Plan');
    case 'FORMAT': return tw(FORMATS[obj.format].label, FORMATS[obj.format].short)
      + (obj.format2 ? g + 0.6 + g + tw(FORMATS[obj.format2].label, FORMATS[obj.format2].short) : 0);
    case 'ELEMENT': case 'MORT': return P.rond;
    case 'ABSENT': return cible(cibleDe(obj));
    case 'DOMINE': return cible(cibleDe(obj)) + g + tt('max');
    // Les icônes d'un groupe se chevauchent : chacune après la première ne
    // coûte que ce qu'elle dépasse de la précédente.
    case 'PAIRE': return P.rond + (obj.els.length - 1) * (P.rond - EM.chevauche);
    case 'MINUTAGE': return (compact ? 0 : t('Plan') + g) + tt(`< ${tcTexte(obj.seuil)}`);
    case 'CHRONO': return tt('↗ ordre');
    // Replié, il ne réclame que sa ligne la plus large — et un cran de plus,
    // puisqu'il en profite pour grossir.
    case 'SANS_TC': return BLOC_SEQ * Math.max(MOT_GRAND * mot('aucun'),
      NOMBRE_SEUIL * tt(tcTexte(obj.seuil)));
    // Replié sur deux lignes, un bandeau de séquence ne réclame que sa ligne la
    // plus large — et un cran de plus, puisqu'il en profite pour grossir.
    case 'SEQ_TAILLE': {
      const haut = t('Séquence', 'Séq') + g + mot('avec');
      const bas = t(`${seuilTexte(obj.sens === 'MAX' ? 'MAX' : 'MIN', obj.seuil)} Plans`);
      return large ? haut + g + bas : BLOC_SEQ * Math.max(haut, bas);
    }
    case 'SEQ_VOISINES': return t('Séquence', 'Séq') + g + 0.9;
    case 'SEQ_LONGUE': return t('Plan') + g + mot('de la plus longue') + g
      + t('Séquence', 'Séq');
    case 'SEQ_AVEC': {
      const k = Math.max(1, obj.seuil || 1);
      const seq = t('Séquence', 'Séq');
      // « sans » remplace le mot par la croix, qui ne coûte rien de plus que
      // l'icône qu'elle recouvre : une seule ligne, comme avant.
      if (obj.sens === 'SANS' && k === 1) return seq + g + cible(obj.cible);
      // Un seuil sur une icône empile ses pastilles, comme un couple, et ajoute
      // un « + » : tout tient sur une ligne.
      const haut = seq + g + mot('avec');
      // Un seuil sur une icône empile ses pastilles, comme un couple, et ajoute
      // un « + ».
      if (cibleEstIcone(obj.cible)) {
        const n = Math.min(Math.max(k, 1), 4);
        const pile = P.rond + (n - 1) * (P.rond - EM.chevauche) + (k > 1 ? g + 0.5 : 0);
        // Une icône seule ne se replie jamais : elle tient sur la ligne.
        if (k <= 1 || large) return haut + g + pile;
        return BLOC_SEQ * Math.max(haut, pile);
      }
      const bas = (k > 1 ? t(seuilTexte(obj.sens === 'SANS' ? 'MOINS' : 'MIN', k)) + g : 0)
        + cible(obj.cible);
      return large ? haut + g + bas : BLOC_SEQ * Math.max(haut, bas);
    }
    case 'SEQ_TOUTES': return t('chaque séq', 'toutes') + g + NOMBRE_SEUIL * tt(String(obj.seuil))
      + g + t('Plan') + g + tt('MIN');
    case 'AILLEURS': return (compact ? 0 : t('Séquence') + g) + 0.9 + g + cible(obj.cible);
    case 'CENTRE': return cible(obj.cible) + g + 0.9 + g + t('centre', 'ctr');
    case 'LOT': return tt(compact ? `×${obj.seuil}` : `lot de ${obj.seuil}`) + g + cible(obj.cible);
    case 'SEUIL': {
      const mg = compact ? 1 : MOT_GRAND;
      const ng = compact ? 1 : NOMBRE_SEUIL;
      return obj.sens === 'MAX' && obj.seuil === 0
        ? mg * mot('aucun') + g + cible(obj.cible)
        : mg * mot('au moins') + g + ng * tt(String(obj.seuil)) + g + cible(obj.cible);
    }
    case 'ABSENTES': return t('Icône', 'Ic.') + g + mot('absente');
    case 'EXTREME': return t('Icône', 'Ic.') + g + tt('max');
    case 'PLAN_ICONES': {
      const seuil = obj.sens === 'EXACT' || !obj.sens ? `= ${obj.seuil}` : seuilTexte(obj.sens, obj.seuil);
      return t('Plan') + g + tt(compact ? seuil : `${seuil} icônes`);
    }
    // Une phrase choisit son corps pour tenir dans sa boîte — voir
    // `corpsPhrase` —, mais elle ne se replie pas À L'INTÉRIEUR d'un mot : sa
    // largeur minimale est celle de son mot le plus long, au plus petit corps
    // qu'elle s'autorise. C'est ce minimum-là qu'elle réclame au serrage.
    // Elle ne réclamait rien du tout, et un bandeau qui la partageait avec un
    // second pouvoir ne se resserrait donc jamais assez : la phrase tenait
    // dans sa boîte, et c'est la boîte qui débordait de la bande.
    case 'PIOCHER': case 'SEQ_PLUS': case 'PLAN_PLUS': case 'RACCORD_VAUT': {
      const mots = phraseRegle(obj, compact).split(/\s+/);
      const plusLong = mots.reduce((a, m) => (m.length > a.length ? m : a), '');
      return CORPS_PHRASE_MIN * LARGEUR_CAR * plusLong.length;
    }
    case 'DOUBLE': return t('plus petite carte', '+ petite')
      + (obj.critere === 'POINTS' ? 0 : g + tt(compact ? 'cadr.' : 'cadrage'));
    default: return P.rond;
  }
}

/** Ce que réclame un pouvoir entier — sa valeur, son signe, son cœur, ses flèches. */
function coutObj(obj, compact, cfg, P, format, large) {
  // Un pouvoir de règle n'a ni valeur, ni « × », ni flèches de portée : sa
  // phrase occupe le reste du bandeau et choisit son corps pour y tenir. Elle
  // ne peut cependant pas se replier en deçà de son plus long mot : c'est cette
  // largeur-là qu'elle réclame, et elle suffit à faire reculer ce qui est à
  // côté d'elle.
  if (estRegle(obj)) {
    const phrase = phraseRegle(obj, compact);
    const corps = corpsPhrase(phrase, (LARGEUR_MOITIE[format] || LARGEUR_MOITIE.PM) / 2, P === PROFILS.nu);
    const longMot = phrase.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
    return longMot * corps * 0.56;
  }
  const p = PORTEES.find((x) => x.id === objPortee(obj, cfg)) || PORTEES[3];
  const fleches = (p.gauche ? P.fleche : 0) + (p.droite ? P.fleche : 0);
  return P.rond + EM.gap + (estSi(obj) ? P.si : P.x) + EM.gap + fleches
    + coutCoeur(obj, compact, P, large);
}

/**
 * De combien le bandeau doit se resserrer pour tenir dans sa moitié de carte :
 * 1 quand tout entre, moins sinon. Le facteur s'applique au bandeau entier —
 * pastilles, étiquettes, écarts — si bien que la composition garde exactement
 * ses proportions, et que la valeur reste de la taille des icônes.
 */
export function serrageBandeau(objs, format, cfg, nu) {
  if (!objs.length) return 1;
  const compact = format === 'GP' || objs.length > 1;
  const large = format === 'PL' && objs.length === 1;
  const P = PROFILS[(nu === undefined ? lectureNue : nu) ? 'nu' : 'illustre'];
  // Une marge de sûreté : tout ne rétrécit pas exactement en proportion — une
  // bordure d'un pixel, l'interlettrage, l'arrondi des glyphes aux petites
  // tailles. Mieux vaut un bandeau un cheveu trop serré qu'un mot coupé.
  const besoin = (objs.reduce((s, o) => s + coutObj(o, compact, cfg, P, format, large), 0)
    + (objs.length - 1) * EM.sep) * 1.2;
  const dispo = LARGEUR_MOITIE[format] || LARGEUR_MOITIE.PM;
  // On ne descend pas sous une taille de pastille plancher : en dessous plus
  // rien ne se lit, et mieux vaut alors rogner un mot que rendre la carte
  // illisible. Le plancher se dit en taille de rond, pas en facteur — sans
  // quoi la lecture nue, qui part de ronds plus gros, s'arrêterait trop tôt.
  const plancher = ATOME_MIN / P.rond;
  // Et l'on ne s'arrête plus à 1 : un bandeau court — « 2 × Plan Large & Plan
  // de départ » sur un Plan Moyen — laissait des deux côtés une place que rien
  // n'occupait, pendant que sa valeur et ses étiquettes restaient minuscules.
  // Le facteur peut donc dépasser 1, jusqu'à un plafond : au-delà, une pastille
  // déborderait de la hauteur de la bande, qui, elle, ne grandit pas.
  const facteur = Math.round((dispo / besoin) * 100) / 100;
  // Un bandeau REPLIÉ sur deux lignes ne profite pas de ce grossissement : il
  // gagne en largeur ce qu'il perd en hauteur, et la bande, elle, ne grandit
  // pas. Agrandi comme un bandeau d'une seule ligne, il débordait par le haut
  // et par le bas — « SÉQUENCE avec » rogné, « 3+ PLANS » coupé.
  const haut = objs.some((o) => plieEnDeux(o, compact, large)) ? PLAFOND_PLIE : PLAFOND_SERRAGE;
  return Math.max(plancher, Math.min(haut, facteur));
}

/**
 * Le bandeau d'un plan — un pouvoir, deux, ou aucun. Deux pouvoirs se posent
 * côte à côte, séparés d'un trait : ils comptent tous les deux. La place étant
 * alors deux fois plus courte, ils se lisent en version compacte, comme sur un
 * Gros Plan.
 */
function bandeau(objs, format, cfg) {
  // Même sans objectif le bandeau reste : c'est lui qui aligne le bas des
  // deux moitiés d'une carte.
  if (!objs.length) return '<div class="bandeau sans-objectif"></div>';
  const compact = format === 'GP' || objs.length > 1;
  // Un Plan Large seul a la carte entière pour bande : rien n'y a besoin de se
  // replier sur deux lignes.
  const pleineLargeur = format === 'PL' && objs.length === 1;
  // Deux pouvoirs se partagent la largeur : une phrase n'en a donc que la
  // moitié, et se met à l'échelle en conséquence.
  const large = (LARGEUR_MOITIE[format] || LARGEUR_MOITIE.PM) / objs.length;
  const un = (o) => (estRegle(o)
    ? `<span class="bandeau-obj regle" style="--cp:${
      corpsPhrase(phraseRegle(o, compact), large, lectureNue).toFixed(3)}em">${
      objContenu(o, undefined, compact, cfg, pleineLargeur)}</span>`
    : `<span class="bandeau-obj">${numIcon(o.n)}<span class="${
      estSi(o) ? 'si' : 'x'}">${estSi(o) ? 'si' : '×'}</span>${
      objContenu(o, undefined, compact, cfg, pleineLargeur)}</span>`);
  const ec = serrageBandeau(objs, format, cfg);
  return `<div class="bandeau ${objs.length > 1 ? 'deux' : ''}"${ec < 1 ? ` style="--ec:${ec}"` : ''}>${
    objs.map(un).join('<i class="bandeau-sep"></i>')}</div>`;
}

/**
 * Les données que le pop-up de survol affiche en grand. `points` n'est fourni
 * que sur un banc de montage : c'est ce que cette carte-là rapporte, ici et
 * maintenant.
 */
function donneesApercu(h, label, points, detail, objs) {
  return encodeURIComponent(JSON.stringify({
    tc: h.tc, el: h.el, objs: objs || objsDe(h), format: h.format,
    // Le bandeau imprimé, quand une carte du montage l'a remplacé : l'aperçu
    // dit ce que la carte porte ET ce qu'elle compte ici.
    objsImprimes: objs ? objsDe(h) : null,
    num: h.num, label, transition: h.transition || null,
    mort: !!h.mort,
    points: points === undefined ? null : points,
    // Ce que chaque bandeau rapporte séparément : l'infobulle montre le calcul
    // plutôt qu'un total à croire sur parole.
    objsPts: detail || null,
  }));
}

/** Un plan : moitié de carte, ou Plan Large pleine largeur. */
export function renderPlan(h, opts = {}) {
  const F = FORMATS[h.transition ? 'TR' : h.format] || FORMATS.PM;
  // Un Plan Large et un Plan de départ occupent toute la carte.
  const large = h.format === 'PL' || h.format === 'DEP';
  // `neuf` marque le plan qui vient d'être posé : c'est là que la carte en vol
  // doit atterrir.
  const cls = ['moitie', `f-${h.format}`, h.transition ? 'transition' : '', h.depart ? 'depart' : '',
    opts.clickable ? 'choisissable' : '', opts.selected ? 'choisi' : '', opts.neuf ? 'neuf' : ''].join(' ');
  const flex = large ? '1 1 100%' : (h.format === 'GP' ? '0 0 33.6%' : '1 1 66.4%');
  // Le libellé du bas dit le TYPE du plan, pas son rôle : une Ouverture, un
  // Générique de fin et un Raccord sont tous trois des Raccords. Ce que la
  // carte fait — ouvrir, fermer, relier — se lit à son illustration et aux
  // emplacements qu'elle propose.
  const label = h.depart ? 'Plan de départ' : F.label;
  // L'image est posée en style inline : dans une variable CSS, url() se
  // résoudrait contre la feuille de style et non contre le document. Elle vit
  // dans sa propre couche sous le minutage, pour qu'un retournement en miroir
  // ne retourne que le dessin — des chiffres à l'envers ne se lisent pas.
  // Le recadrage se joue en deux temps. Le **cadrage** — quelle part du dessin
  // on montre — est une position de fond : l'illustration est posée en `cover`
  // et déborde de la fenêtre dès qu'elle n'a pas sa proportion, si bien qu'on
  // la fait glisser sans rien agrandir. Le **zoom** et le **miroir**, eux, sont
  // une transformation de la couche. Déplacer la couche elle-même ne marcherait
  // pas : ce qui déborde est déjà rogné par elle, et on ne ferait que découvrir
  // un bord de carte.
  const cadre = h.cadre;
  const transforme = transformeCadre(cadre, h.miroir);
  const fond = `${h.image ? `background-image:url('${h.image}');` : ''}${
    cadre ? `background-position:${cadre.x}% ${cadre.y}%;` : ''}${
    transforme ? `transform:${transforme};` : ''}`;
  // Le crâne se lit avec les autres : c'est une icône de la carte, pas un état.
  const icones = h.mort ? [...h.el, 'MORT'] : h.el;
  // Ce que ce plan-là rapporte, ici et maintenant : un jeton au coin, en face
  // du minutage. Il n'apparaît qu'au montage, où le calcul a un sens.
  // Un plan peut coûter des points autant qu'il peut en rapporter : le jeton
  // passe alors au rouge, avec son signe.
  // `bonifie` : ce Raccord rapporte AUTRE CHOSE que ce qui est imprimé dessus,
  // parce qu'une carte du montage bonifie les Raccords. Le jeton passe au vert
  // pour que la difference se voie sans avoir a relire le bandeau.
  const teinteJeton = opts.bonifie ? 'bonifie'
    : opts.points < 0 ? 'negatif' : (opts.points ? '' : 'nul');
  const jeton = opts.points === undefined ? ''
    : `<div class="jeton-pts ${teinteJeton}" title="${opts.bonifie
      ? 'Ce que ce plan rapporte — bonifie par une carte de votre montage'
      : 'Ce que ce plan rapporte'}">${opts.points}</div>`;
  // `muet` : un plan qui n'est pas vraiment sur la table — un aperçu de pose —
  // n'ouvre pas d'infobulle et ne se donne pas pour une carte du banc.
  const bulle = opts.muet ? ''
    : ` data-apercu="${donneesApercu(h, label, opts.points, opts.detail, opts.objs)}"`;
  return `<div class="${cls}" style="--flex:${flex}" data-format="${h.format}" data-num="${h.num}"${bulle}>
    ${jeton}
    <div class="illus"${h.cle ? ` data-illus="${h.cle}"` : ''}>
      <div class="illus-image${h.miroir ? ' miroir' : ''}" style="${fond}"></div>
      <div class="boite-tc"></div>
      <div class="tcode ${teinteTc(h.tc)}">${tc(h.tc)}</div>
    </div>
    <div class="pastilles" style="--n:${Math.max(1, icones.length)}">${icones.length
      ? `<span class="pastilles-fond">${icones.map((e) => elIcon(e)).join('')}</span>` : ''}</div>
    ${bandeau(opts.objs || objsDe(h), h.format, opts.cfg)}
    <div class="libelle" style="--c:${encreLibelle(h.format, !!h.transition)}">${label}</div>
  </div>`;
}

/** Une carte entière. `verso` échange la position des deux moitiés. */
export function renderCarte(carte, verso, opts = {}) {
  // Le recto porte le Plan Moyen à gauche et le Gros Plan à droite ; le verso,
  // retourné autour de l'axe vertical, les échange. Il ne se contente pas
  // d'inverser les moitiés du recto : ce sont d'autres plans, avec leur propre
  // minutage. Il faut donc les demander.
  const m = carte.type === 'DOUBLE' ? moitiesDe(carte, verso ? 'V' : 'R') : null;
  const plans = m ? (verso ? [m.GP, m.PM] : [m.PM, m.GP]) : [plHalf(carte)];
  const cls = ['carte', opts.selected ? 'sel' : '', opts.small ? 'small' : '', opts.tiny ? 'tiny' : '',
    opts.clickable ? 'clickable' : '', opts.moitiesChoisissables ? 'choix-moitie' : ''].join(' ');
  return `<div class="${cls}" data-carte="${carte.id}" data-verso="${verso ? 1 : 0}">
    ${plans.map((h) => renderPlan(h, {
      ...opts,
      // Au montage, la carte reste entière : c'est la moitié que l'on désigne.
      selected: opts.formatChoisi ? opts.formatChoisi === h.format : opts.selected,
    })).join('')}
  </div>`;
}

/**
 * Le dos d'une pioche, au format d'une carte. Seuls les Plans Larges ont un
 * vrai dos : les cartes Plan Moyen / Gros Plan étant recto-verso, leur pioche
 * montre toujours sa face du dessus.
 */
/** Enveloppe une carte d'un effet de pile : des cartes décalées dessous. */
export function enPile(html, reste) {
  const epaisseur = Math.min(3, Math.max(1, Math.ceil(reste / 12)));
  return `<div class="pile" data-epaisseur="${epaisseur}">
    ${Array.from({ length: epaisseur }, (_, i) => `<span class="pile-couche" style="--i:${i + 1}"></span>`).join('')}
    ${html}
  </div>`;
}

export function renderDos(libelle, reste, opts = {}) {
  const cls = ['carte', 'dos', opts.small ? 'small' : '', opts.clickable ? 'clickable' : ''].join(' ');
  // Le dos d'une pioche de Plans Larges est un **Plan Large vierge** : le vert
  // du cadrage, la bande des pastilles, le bandeau, le libellé — la carte telle
  // qu'elle est, sans rien dessus —, et un point d'interrogation à la place de
  // l'illustration. On ne sait pas ce qui vient, mais on sait que c'est un
  // Plan Large.
  const F = FORMATS.PL;
  return `<div class="${cls}" title="${libelle}">
    <div class="moitie f-PL dos-vierge" style="--flex:1 1 100%">
      <div class="illus"><span class="dos-question">?</span></div>
      <div class="pastilles"></div>
      <div class="bandeau"></div>
      <div class="libelle" style="--c:${F.color}">${F.label}</div>
    </div>
  </div>`;
}

/** Fiche texte d'une carte, ses quatre plans — deux par face. */
export function ficheCarte(carte) {
  const plans = carte.type === 'DOUBLE'
    ? [...Object.values(moitiesDe(carte, 'R')), ...Object.values(moitiesDe(carte, 'V'))]
    : [plHalf(carte)];
  return plans.map((h) => {
    const els = h.el.map((e) => ELEMENTS[e].label).join(', ') || '—';
    return `${h.transition || FORMATS[h.format].label} n°${h.num} · ${tc(h.tc)} · ${els}`;
  }).join(' | ');
}

export { cadrageIcon };
