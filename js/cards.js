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

import { FORMATS, ELEMENTS, moitiesDe, plHalf, objLabel, tcTexte, teinteTc, seuilTexte, estRegleKind, cibleDe, objPortee, PORTEES, objsDe, teinteObj, encreLibelle, transformeCadre } from './data.js?v=1.93';
import { elIcon, numIcon, cadrageIcon } from './icons.js?v=1.93';

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
export function objContenu(obj, taille, compact, cfg) {
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
    objCoeur(obj, taille, compact)}</span>${fleche('droite')}</span>`;
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
  switch (obj.kind) {
    case 'PIOCHER': return compact
      ? `Pioche ${obj.cible === 'PL' ? 'PL' : 'PM/GP'}`
      : `Vous pouvez piocher sur la pioche ${obj.cible === 'PL' ? 'Plans Larges' : 'PM / GP'}`;
    case 'SEQ_PLUS': return compact ? `+${obj.n} séquence`
      : `Vous pouvez monter ${obj.n} séquence${s(obj.n)} supplémentaire${s(obj.n)}`;
    case 'PLAN_PLUS': return compact ? `+${obj.n} Plan`
      : `Vous pouvez monter ${obj.n} Plan${s(obj.n)} supplémentaire${s(obj.n)}`;
    // Un Gros Plan partagé à deux n'a de place que pour une douzaine de
    // caractères : la forme courte garde le sens — les Raccords deviennent
    // « n × Raccord » — en abrégeant le mot. La phrase entière reste dans
    // l'aperçu au survol, comme pour les autres pouvoirs de règle.
    case 'RACCORD_VAUT': return compact
      ? `Racc. = ${obj.n} × Racc.`
      : `Les cartes Raccord vous rapportent ${obj.n} × Raccord`;
    default: return '';
  }
}

/** Ce que le bandeau compte, sans les flèches de portée. */
function objCoeur(obj, taille, compact) {
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
    case 'NEANT':   return elIcon('NEANT', taille);
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
    case 'SANS_TC': return `<span class="barre"><span class="tc-seuil minutage">${
      obj.sens === 'AVANT' ? '&lt;' : obj.sens === 'APRES' ? '&gt;' : '='
    }&nbsp;${tcTexte(obj.seuil)}</span>${croixNon()}</span>`;
    // Les bandeaux de séquence : la pastille violette dit qu'on compte des
    // séquences et non des plans, et ce qui la suit dit lesquelles.
    case 'SEQ_TAILLE': return `${tagSeq(compact)}<span class="mot">avec</span>
      <span class="tc-seuil">${seuilTexte(obj.sens === 'MAX' ? 'MAX' : 'MIN', obj.seuil)}</span>
      <span class="tag tag-blanc">Plan</span>`;
    case 'SEQ_VOISINES': return `${tagSeq(compact)}
      <span class="fleche-seq">${obj.sens === 'APRES' ? '▼' : '▲'}</span>`;
    // « La plus longue » : on compte ses plans, d'où la pastille Plan.
    case 'SEQ_LONGUE': return `<span class="tag tag-blanc">Plan</span>
      <span class="tag tag-seq">${compact ? 'séq. ⌀' : 'plus longue séq.'}</span>`;
    case 'SEQ_AVEC': {
      const quoi = obj.cible === 'RACCORD' ? '<span class="tag tag-gris">Raccord</span>'
        : FORMATS[obj.cible] ? `<span class="tag tag-fmt" style="--c:${FORMATS[obj.cible].color}">${
          compact ? FORMATS[obj.cible].short : FORMATS[obj.cible].label}</span>`
          : elIcon(obj.cible, taille);
      // Sans seuil, la lecture d'origine : la cible seule, barrée d'une croix
      // pour « sans ». Dès qu'un seuil est demandé, c'est un compte de plans
      // porteurs qui se lit — « ≥ 3 » ou « < 3 » —, et la croix disparaît :
      // elle dirait « aucun », ce qui n'est plus ce que le bandeau demande.
      const k = Math.max(1, obj.seuil || 1);
      if (k > 1) {
        return `${tagSeq(compact)}<span class="mot">avec</span><span class="tc-seuil">${
          seuilTexte(obj.sens === 'SANS' ? 'MOINS' : 'MIN', k)}</span>${quoi}`;
      }
      return `${tagSeq(compact)}${obj.sens === 'SANS'
        ? `<span class="barre">${quoi}${croixNon()}</span>` : `<span class="mot">avec</span>${quoi}`}`;
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
    case 'SEUIL': return `<span class="tc-seuil">${obj.seuil}</span>${
      cibleHTML(obj.cible, taille, compact)}<span class="tc-seuil">${
      obj.sens === 'MAX' ? 'MAX' : 'MIN'}</span>`;
    case 'ABSENTES': return `<span class="barre"><span class="tag tag-blanc">${
      compact ? 'Ic.' : 'Icône'}</span>${croixNon()}</span>`;
    case 'SEQ_TOUTES': return `<span class="tag tag-seq">${compact ? 'toutes' : 'chaque séq.'}</span>
      <span class="tc-seuil">${obj.seuil}</span><span class="tag tag-blanc">Plan</span>
      <span class="tc-seuil">${obj.sens === 'MAX' ? 'MAX' : 'MIN'}</span>`;
    case 'EXTREME': return `<span class="tag tag-blanc">${compact ? 'Ic.' : 'Icône'}</span>
      <span class="tc-seuil">${obj.sens === 'MOINS' ? 'min' : 'max'}</span>`;
    case 'PLAN_ICONES': return `<span class="tag tag-blanc">Plan</span>
      <span class="tc-seuil">${obj.sens === 'EXACT' || !obj.sens
    ? `=&nbsp;${obj.seuil}` : seuilTexte(obj.sens, obj.seuil)}${
  compact ? '' : '&nbsp;icônes'}</span>`;
    // --- Les pouvoirs de règle : une phrase, dans la police du « × » -------
    case 'PIOCHER': case 'SEQ_PLUS': case 'PLAN_PLUS': case 'RACCORD_VAUT':
      return `<span class="regle-mot">${phraseRegle(obj, compact)}</span>`;
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
    case 'NEANT':    return elIcon('NEANT', taille);
    case 'SEQUENCE': return tagSeq(compact);
    case 'ICONE':    return `<span class="tag tag-blanc">${compact ? 'Ic.' : 'Icône'}</span>`;
    case 'VALEUR':   return `<span class="tag tag-blanc">${compact ? 'Val.' : 'Valeur de cadre'}</span>`;
    default:         return FORMATS[cible] ? tagCadrage(cible, compact) : elIcon(cible, taille);
  }
}

/** L'étiquette d'un cadrage, dans sa couleur. */
function tagCadrage(f, compact) {
  return `<span class="tag tag-fmt" style="--c:${FORMATS[f].color}">${
    compact ? FORMATS[f].short : FORMATS[f].label}</span>`;
}

/** La pastille « Séquence » des bandeaux qui comptent des séquences. */
function tagSeq(compact) {
  return `<span class="tag tag-seq">${compact ? 'Séq.' : 'Séquence'}</span>`;
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
function coutCoeur(obj, compact, P) {
  const t = (long, court) => P.tag0 + P.tag1 * String(compact && court !== undefined ? court : long).length;
  const cible = (c) => {
    if (c === 'CARTE') return t('Carte');
    if (c === 'PLAN') return t('Plan');
    if (c === 'RACCORD') return t('Raccord');
    if (c === 'MORT' || c === 'NEANT') return P.rond;
    if (c === 'SEQUENCE') return t('Séquence', 'Séq.');
    if (c === 'ICONE') return t('Icône', 'Ic.');
    if (c === 'VALEUR') return t('Valeur de cadre', 'Val.');
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
    case 'FORMAT': return t(FORMATS[obj.format].label, FORMATS[obj.format].short)
      + (obj.format2 ? g + 0.6 + g + t(FORMATS[obj.format2].label, FORMATS[obj.format2].short) : 0);
    case 'ELEMENT': case 'MORT': case 'NEANT': return P.rond;
    case 'ABSENT': return cible(cibleDe(obj));
    case 'DOMINE': return cible(cibleDe(obj)) + g + tt('max');
    // Les icônes d'un groupe se chevauchent : chacune après la première ne
    // coûte que ce qu'elle dépasse de la précédente.
    case 'PAIRE': return P.rond + (obj.els.length - 1) * (P.rond - EM.chevauche);
    case 'MINUTAGE': return (compact ? 0 : t('Plan') + g) + tt(`< ${tcTexte(obj.seuil)}`);
    case 'CHRONO': return tt('↗ ordre');
    case 'SANS_TC': return tt(`= ${tcTexte(obj.seuil)}`);
    case 'SEQ_TAILLE': return t('Séquence', 'Séq.') + g + mot('avec') + g
      + tt(seuilTexte(obj.sens === 'MAX' ? 'MAX' : 'MIN', obj.seuil)) + g + t('Plan');
    case 'SEQ_VOISINES': return t('Séquence', 'Séq.') + g + 0.9;
    case 'SEQ_LONGUE': return t('Plan') + g + t('plus longue séq.', 'séq. ⌀');
    case 'SEQ_AVEC': {
      const k = Math.max(1, obj.seuil || 1);
      // « avec » est écrit dans les deux cas ; seul « sans » le remplace par la
      // croix, qui ne coûte rien de plus que l'icône qu'elle recouvre.
      const avec = obj.sens === 'SANS' && k === 1 ? 0 : mot('avec') + g;
      return t('Séquence', 'Séq.') + g + avec
        + (k > 1 ? tt(seuilTexte(obj.sens === 'SANS' ? 'MOINS' : 'MIN', k)) + g : 0) + cible(obj.cible);
    }
    case 'SEQ_TOUTES': return t('chaque séq.', 'toutes') + g + tt(String(obj.seuil))
      + g + t('Plan') + g + tt('MIN');
    case 'AILLEURS': return (compact ? 0 : t('Séquence') + g) + 0.9 + g + cible(obj.cible);
    case 'CENTRE': return cible(obj.cible) + g + 0.9 + g + t('centre', 'ctr');
    case 'LOT': return tt(compact ? `×${obj.seuil}` : `lot de ${obj.seuil}`) + g + cible(obj.cible);
    case 'SEUIL': return tt(String(obj.seuil)) + g + cible(obj.cible) + g + tt('MIN');
    case 'ABSENTES': return t('Icône', 'Ic.');
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
function coutObj(obj, compact, cfg, P, format) {
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
  return P.rond + EM.gap + (estSi(obj) ? P.si : P.x) + EM.gap + fleches + coutCoeur(obj, compact, P);
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
  const P = PROFILS[(nu === undefined ? lectureNue : nu) ? 'nu' : 'illustre'];
  // Une marge de sûreté : tout ne rétrécit pas exactement en proportion — une
  // bordure d'un pixel, l'interlettrage, l'arrondi des glyphes aux petites
  // tailles. Mieux vaut un bandeau un cheveu trop serré qu'un mot coupé.
  const besoin = (objs.reduce((s, o) => s + coutObj(o, compact, cfg, P, format), 0)
    + (objs.length - 1) * EM.sep) * 1.2;
  const dispo = LARGEUR_MOITIE[format] || LARGEUR_MOITIE.PM;
  // On ne descend pas sous une taille de pastille plancher : en dessous plus
  // rien ne se lit, et mieux vaut alors rogner un mot que rendre la carte
  // illisible. Le plancher se dit en taille de rond, pas en facteur — sans
  // quoi la lecture nue, qui part de ronds plus gros, s'arrêterait trop tôt.
  const plancher = ATOME_MIN / P.rond;
  return Math.max(plancher, Math.min(1, Math.round((dispo / besoin) * 100) / 100));
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
  // Deux pouvoirs se partagent la largeur : une phrase n'en a donc que la
  // moitié, et se met à l'échelle en conséquence.
  const large = (LARGEUR_MOITIE[format] || LARGEUR_MOITIE.PM) / objs.length;
  const un = (o) => (estRegle(o)
    ? `<span class="bandeau-obj regle" style="--cp:${
      corpsPhrase(phraseRegle(o, compact), large, lectureNue).toFixed(3)}em">${
      objContenu(o, undefined, compact, cfg)}</span>`
    : `<span class="bandeau-obj">${numIcon(o.n)}<span class="${
      estSi(o) ? 'si' : 'x'}">${estSi(o) ? 'si' : '×'}</span>${objContenu(o, undefined, compact, cfg)}</span>`);
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
  const jeton = opts.points === undefined ? ''
    : `<div class="jeton-pts ${opts.points < 0 ? 'negatif' : (opts.points ? '' : 'nul')}"
        title="Ce que ce plan rapporte">${opts.points}</div>`;
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
