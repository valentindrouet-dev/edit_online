// ---------------------------------------------------------------------------
// EDIT — le matériel du jeu, version 4.1
// ---------------------------------------------------------------------------
// Les icônes, les cadrages, le vocabulaire des pouvoirs, et la boîte : dix-neuf
// Plans Larges — dont les quatre plans de départ — et cinquante-quatre Gros
// Plans, assemblés deux par deux sur trente-six cartes — certains y sont
// imprimés plusieurs fois.

// --- Les six éléments ------------------------------------------------------
// Trois personnages (Héroïne, Ennemi, Allié) et trois éléments (Arme, Objet,
// Véhicule).

export const ELEMENTS = {
  HEROINE:  { id: 'HEROINE',  label: 'Héroïne',  famille: 'PERSONNAGE', color: '#1492c4', ring: '#4fc3ea' },
  ENNEMI:   { id: 'ENNEMI',   label: 'Ennemi',   famille: 'PERSONNAGE', color: '#c22a2a', ring: '#f05252' },
  ALLIE:    { id: 'ALLIE',    label: 'Allié',    famille: 'PERSONNAGE', color: '#8e4fc0', ring: '#c98df0' },
  OBJET:    { id: 'OBJET',    label: 'Objet',    famille: 'ELEMENT',    color: '#d19100', ring: '#ffd75e' },
  ARME:     { id: 'ARME',     label: 'Arme',     famille: 'ELEMENT',    color: '#63696f', ring: '#c3c9d1' },
  VEHICULE: { id: 'VEHICULE', label: 'Véhicule', famille: 'ELEMENT',    color: '#c9741a', ring: '#f5a44e' },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS);

/**
 * L'encre d'un élément : sa couleur propre, assez foncée pour rester lisible
 * sur n'importe quel fond de bandeau — le vert du Plan Large, l'orange du Plan
 * Moyen, le rouge du Gros Plan, le gris du Raccord. Elle sert aux flèches de
 * portée, qui prennent la couleur de ce qu'elles entourent.
 */
export const ENCRES = {
  HEROINE: '#0b5372', ENNEMI: '#6e1010', ALLIE: '#4f2478',
  OBJET: '#7d5400', ARME: '#31363c', VEHICULE: '#6e3d08',
  MORT: '#141418',
};

/** L'encre d'un bandeau qui ne montre aucune icône : neutre, presque noire. */
export const ENCRE_NEUTRE = '#26262e';

// Les cadrages, assombris de la même façon. Cette encre sert aussi au libellé
// du bas d'un plan, qui s'écrit désormais sur la carte et non plus sur une
// bande noire : la couleur vive du cadrage y manquerait de contraste.
export const ENCRES_FORMAT = { PL: '#2b6210', GP: '#8a330d', DEP: '#1e4b62', TR: '#31363c' };

/**
 * L'encre du libellé de cadrage. Sur une carte claire, l'encre sombre ; sur un
 * Raccord — fond presque noir —, la couleur vive du cadrage, seule lisible.
 */
export function encreLibelle(format, transition) {
  // Un Raccord a le fond presque noir : il lui faut une encre claire, pas
  // l'encre sombre des cartes claires.
  return transition ? '#b4b8c0' : (ENCRES_FORMAT[format] || FORMATS[format]?.color || '#333');
}

/**
 * La couleur des flèches d'un bandeau : celle de l'icône qu'elles entourent.
 * Un couple prend celle de sa première icône ; ce qui ne montre pas d'icône —
 * un plan, un raccord, un minutage — reste dans l'encre neutre.
 */
export function teinteObj(o) {
  if (!o) return ENCRE_NEUTRE;
  switch (o.kind) {
    case 'ELEMENT': case 'ABSENT': return ENCRES[o.el] || ENCRE_NEUTRE;
    case 'PAIRE':   return ENCRES[o.els[0]] || ENCRE_NEUTRE;
    case 'MORT':    return ENCRES.MORT;
    case 'FORMAT':  return ENCRES_FORMAT[o.format] || ENCRE_NEUTRE;
    // Les pouvoirs du vocabulaire commun prennent la teinte de leur cible :
    // une icône a la sienne, un cadrage la sienne, le reste reste neutre.
    case 'AILLEURS': case 'CENTRE': case 'LOT': case 'SEUIL':
      return ENCRES[o.cible] || ENCRES_FORMAT[o.cible] || ENCRE_NEUTRE;
    default:        return ENCRE_NEUTRE;
  }
}
export const PERSONNAGES = ELEMENT_IDS.filter((e) => ELEMENTS[e].famille === 'PERSONNAGE');

// --- Cadrages --------------------------------------------------------------

export const FORMATS = {
  PL: { id: 'PL', label: 'Plan Large',     short: 'PL',  color: '#5aa32b', tint: '#dff0c8' },
  GP: { id: 'GP', label: 'Gros Plan',      short: 'GP',  color: '#e8632a', tint: '#fbdac9' },
  DEP: { id: 'DEP', label: 'Plan de départ', short: 'DÉP', color: '#3f8fbf', tint: '#d8ecf7' },
  TR: { id: 'TR', label: 'Raccord',        short: 'TR',  color: '#7b7f86', tint: '#e4e6e9' },
};

// Un Plan de départ est un plan comme un autre pour tout ce qui compte des
// cartes — mais ce n'est pas un Plan Large : « n × Plan Large » ne le compte
// pas. Les cadrages qu'un bandeau de séquence peut viser :
export const CADRAGES_VISABLES = ['PL', 'GP'];

// Le bandeau « n × Cadrage », lui, peut viser le Plan de départ : il le
// **nomme**, il ne le confond pas avec un Plan Large. C'est ce qui permet
// d'écrire « n × Plan Large & Plan de départ » — deux cadrages désignés.
export const CADRAGES_POUVOIR = ['PL', 'GP', 'DEP'];

// --- Objectifs (bandeaux) --------------------------------------------------
// kind :
//   RACCORD   n points par Carte Raccord du montage entier
//   PLAN      n points par carte de la séquence porteuse   ( ◀ PLAN ▶ )
//   FORMAT    n points par plan du cadrage visé — deux cadrages au plus,
//             « n × Plan Large & Plan de départ »
//   ELEMENT   n points par plan portant cet élément
//   PAIRE     n points par GROUPE d'icônes réunies dans la portée — deux, ou
//             trois. Quatre icônes font deux couples, cinq en font deux aussi :
//             c'est un appariement, pas une adjacence. Un groupe qui demande
//             deux fois la même icône en demande deux exemplaires
//   MORT      n points par plan de mort
//   ABSENT    n points si l'élément visé n'apparaît nulle part
//   MINUTAGE  n points par plan du montage dont le minutage est strictement
//             avant (ou après) le seuil visé
//   CHRONO    n points si le montage se lit dans l'ordre : chaque minutage
//             est supérieur ou égal à celui de son voisin de gauche
//   SANS_TC   n points si aucun plan du montage n'a le minutage visé : égal au
//             seuil (« -- », l'absence de minutage), ou strictement
//             avant, ou strictement après
//   BOUT      n points si AUCUN PLAN ne suit ce plan-ci de son côté : à sa
//             droite (`DROITE`) ou à sa gauche (`GAUCHE`), dans sa propre
//             séquence. C'est le seul bandeau qui parle de la PLACE de sa
//             carte plutôt que de ce que le banc porte : il paie le bout de
//             ligne. Un Raccord l'arrête — c'est un plan comme un autre, et le
//             bandeau écrit bien « Plan »
//
// Quatre bandeaux comptent des SÉQUENCES plutôt que des plans — ils lisent la
// forme du banc, pas son contenu carte par carte :
//   SEQ_TAILLE   n points par séquence d'au moins `seuil` plans — ou d'au
//                plus `seuil` plans quand `sens` vaut MAX
//   SEQ_VOISINES n points par séquence placée au-dessus (`AVANT`) ou en
//                dessous (`APRES`) de celle qui porte le bandeau
//   SEQ_LONGUE   n points par plan de la plus longue séquence du banc
//   SEQ_AVEC     n points par séquence qui porte la cible visée — une icône, un
//                cadrage, un Raccord — au moins `seuil` fois (`AVEC`), ou moins
//                de `seuil` fois (`SANS`). Le seuil compte des PLANS porteurs
//                et vaut 1 quand il n'est pas écrit : on retrouve alors la
//                lecture simple, « avec » et « sans »
//   SEQ_TOUTES   n points si CHAQUE séquence du banc a au moins (`MIN`) ou au
//                plus (`MAX`) `seuil` plans — un banc sans séquence ne rapporte
//                rien : il n'y a rien à juger
//
// Neuf bandeaux enfin partagent le **vocabulaire de cibles** CIBLES_COMPTE —
// une carte, un plan, un Raccord, un cadrage, une icône, toutes les icônes,
// les icônes différentes, une séquence — et ne se distinguent que par ce
// qu'ils en font :
//   AILLEURS     n points par cible dans les AUTRES séquences : celles du
//                dessus (`DESSUS`), du dessous (`DESSOUS`), ou les deux
//                (`AUTRES`). Sa portée est écrite là : elle ne se règle pas
//   CENTRE       n points par cible d'un côté du CENTRE de sa ligne — l'ancre,
//                le plan qui a ouvert la séquence, qui n'est d'aucun côté
//   LOT          n points par LOT de `seuil` cibles : un lot incomplet ne
//                rapporte rien, sept armes font deux lots de trois
//   SEUIL        n points, une fois, si la portée compte au moins (`MIN`) ou
//                au plus (`MAX`) `seuil` cibles. « Aucun » s'écrit MAX 0
//   ABSENTES     n points par type d'icône que la portée ne montre nulle part
//   EXTREME      n points par exemplaire de l'icône la plus (`PLUS`) ou la
//                moins (`MOINS`) présente. « La moins » se lit parmi celles
//                qui apparaissent : sinon les absentes gagneraient à zéro
//   PLAN_ICONES  n points par plan portant exactement (`EXACT`), au moins
//                (`MIN`) ou au plus (`MAX`) `seuil` icônes
//   DOUBLE       la plus petite (`MOINS`) ou la plus grosse (`PLUS`) carte de
//                la portée compte n fois de plus — n = 1 la fait compter
//                double. `critere` dit ce que « grosse » veut dire : ce
//                qu'elle rapporte, ses icônes, ou la taille de son cadrage

// --- La portée d'un bandeau ------------------------------------------------
// Tout bandeau dit où il compte : parmi les cartes placées avant lui, après
// lui, dans sa séquence, ou dans le montage entier. Les flèches du bandeau le
// disent d'un coup d'œil — « ◀ Héroïne » avant, « Héroïne ▶ » après,
// « ◀ Héroïne ▶ » dans la séquence, « Héroïne » tout court dans le montage.

// Trois de ces quatre portées ne quittent pas la LIGNE du plan : « avant » et
// « après » désignent une place dans la séquence, pas dans le film. Une ligne
// posée au-dessus n'est pas « avant », elle est ailleurs.
// Deux libellés, parce qu'ils ne servent pas au même endroit. `label` est celui
// de l'AIDE : on y décrit une portée en soi, sans carte sous les yeux, et le
// possessif y sonne creux — « avant, dans la ligne ». `phrase` est celui qui
// entre dans une PHRASE de bandeau, où « sa » désigne la carte dont on parle —
// « 2 × Arme dans toute sa ligne ».
export const PORTEES = [
  { id: 'AVANT',    label: 'avant, dans la ligne', phrase: 'avant elle dans sa ligne',
    court: 'avant',    gauche: true,  droite: false },
  { id: 'APRES',    label: 'après, dans la ligne', phrase: 'après elle dans sa ligne',
    court: 'après',    gauche: false, droite: true },
  { id: 'SEQUENCE', label: 'dans toute la ligne',  phrase: 'dans toute sa ligne',
    court: 'séquence', gauche: true,  droite: true },
  { id: 'MONTAGE',  label: 'dans le montage entier', phrase: 'dans le montage entier',
    court: 'montage',  gauche: false, droite: false },
  // ▷▷ — TOUT ce qui suit cette carte dans le montage, séquences du dessous
  // comprises, elle exclue. Le montage se lit ligne après ligne, chacune de
  // gauche à droite.
  { id: 'SUITE',    label: 'tout ce qui suit cette carte dans le montage',
    phrase: 'après cette carte, dans tout le montage',
    court: 'suite',    gauche: false, droite: false, avance: true },
  // ◁◁ — son reflet : tout ce qui précède cette carte, les lignes du dessus en
  // entier, elle exclue.
  { id: 'AMONT',    label: 'tout ce qui précède cette carte dans le montage',
    phrase: 'avant cette carte, dans tout le montage',
    court: 'amont',    gauche: false, droite: false, recul: true },
];

export const PORTEE_IDS = PORTEES.map((p) => p.id);

export const OBJ = {
  raccord: (n, portee) => ({ kind: 'RACCORD', n, portee: portee || 'MONTAGE' }),
  plan:    (n, portee) => ({ kind: 'PLAN', n, portee: portee || 'SEQUENCE' }),
  // Un bandeau de cadrage peut en viser **deux** : le second est facultatif,
  // et un plan compte dès qu'il porte l'un ou l'autre.
  format:  (n, f, portee, f2) => ({ kind: 'FORMAT', n, format: f,
    ...(f2 && f2 !== f ? { format2: f2 } : {}), ...(portee ? { portee } : {}) }),
  element: (n, e, portee) => ({ kind: 'ELEMENT', n, el: e, ...(portee ? { portee } : {}) }),
  // Un GROUPE d'icônes à réunir : deux, ou trois. `c` est la troisième, et
  // elle vient après la portée pour que les huit cartes imprimées, écrites
  // avant qu'un trio soit possible, restent telles quelles.
  paire:   (n, a, b, portee, c) => ({ kind: 'PAIRE', n, els: c ? [a, b, c] : [a, b],
    ...(portee ? { portee } : {}) }),
  mort:    (n, portee) => ({ kind: 'MORT', n, ...(portee ? { portee } : {}) }),
  // « n si CIBLE est absente ». La cible n'est plus une icône seulement : une
  // Valeur de Plan, une Carte Raccord, un plan de mort peuvent manquer aussi.
  // Le champ s'appelait `el` du temps où seule une icône s'y logeait ; les
  // configurations enregistrées avant ce jour le portent encore, et les
  // lecteurs acceptent les deux — voir `cibleDe`.
  absent:  (n, c, portee) => ({ kind: 'ABSENT', n, cible: c, portee: portee || 'MONTAGE' }),
  minutage: (n, sens, seuil, portee) => ({ kind: 'MINUTAGE', n, sens, seuil, portee: portee || 'MONTAGE' }),
  chrono:  (n, portee) => ({ kind: 'CHRONO', n, portee: portee || 'MONTAGE' }),
  sansTc: (n, sens, seuil, portee) => ({ kind: 'SANS_TC', n, sens, seuil, portee: portee || 'MONTAGE' }),
  // Les bandeaux qui comptent des SÉQUENCES et non des plans. Ils lisent la
  // forme du banc — combien de séquences, de quelle taille, ce qu'elles
  // portent —, pas son contenu carte par carte. Leur portée ne se règle donc
  // pas : c'est le montage entier qu'ils regardent, toujours.
  // `sens` : MIN — au moins `seuil` plans, le défaut ; MAX — au plus.
  seqTaille:   (n, seuil, sens) => ({ kind: 'SEQ_TAILLE', n, seuil,
    ...(sens === 'MAX' ? { sens: 'MAX' } : {}) }),
  seqVoisines: (n, sens) => ({ kind: 'SEQ_VOISINES', n, sens }),
  seqLongue:   (n) => ({ kind: 'SEQ_LONGUE', n }),
  // `seuil` : combien d'EXEMPLAIRES de la cible la séquence doit montrer —
  // « au moins 3 Armes ». Trois armes sont trois armes, qu'elles soient sur
  // trois plans ou sur deux : c'est ce que le bandeau écrit, « 3+ 🗡 ». Un
  // seuil de 1 est le cas ordinaire et ne s'écrit pas, pour qu'un bandeau sans
  // seuil reste identique à ce qui est imprimé.
  seqAvec:     (n, sens, cible, seuil) => ({ kind: 'SEQ_AVEC', n, sens, cible,
    ...(seuil > 1 ? { seuil: Math.min(20, Math.floor(seuil)) } : {}) }),

  // --- Les pouvoirs du vocabulaire commun ----------------------------------
  // Tous prennent une `cible` prise dans CIBLES_COMPTE ; ce qu'ils en font
  // change d'un pouvoir à l'autre. Les deux premiers portent leur propre
  // portée dans leur définition même — les autres séquences, un côté du
  // centre —, les autres se règlent librement.

  // Combien d'AUTRES SÉQUENCES portent la cible. On compte des lignes, pas ce
  // qu'elles contiennent : trois lignes qui montrent un Véhicule font trois,
  // qu'elles en montrent six à elles trois ou trois. C'est ce que dit le
  // cartouche « SÉQUENCE » du bandeau.
  // `sens` : DESSUS — les lignes posées au-dessus de la sienne ; DESSOUS —
  // celles d'en dessous ; AUTRES — les deux à la fois, c'est-à-dire tout le
  // banc sauf sa propre ligne.
  ailleurs: (n, cible, sens) => ({ kind: 'AILLEURS', n, cible, sens: sens || 'AUTRES' }),

  // De quel côté du CENTRE de sa ligne. Le centre est l'ancre — le plan qui a
  // ouvert la séquence, celui sur lequel elle est alignée ; il n'appartient à
  // aucun des deux côtés. `sens` : GAUCHE | DROITE.
  centre: (n, cible, sens) => ({ kind: 'CENTRE', n, cible, sens: sens === 'DROITE' ? 'DROITE' : 'GAUCHE' }),

  // Le BOUT de ligne : n points si aucun plan ne suit celui-ci, de son côté.
  // Tous les autres bandeaux comptent ce que le banc porte ; celui-ci paie une
  // PLACE — être le dernier de sa séquence, ou le premier. Il récompense donc
  // les lignes courtes et les extrémités, là où tout le reste pousse à
  // allonger. `sens` : DROITE | GAUCHE.
  //
  // Un Raccord ne l'arrête pas : ce n'est pas un plan, et le bandeau écrit bien
  // « Plan ». Un Raccord posé au bout d'une ligne est de toute façon un Raccord
  // ouvert, que la variante du même nom pénalise déjà.
  bout: (n, sens) => ({ kind: 'BOUT', n, sens: sens === 'GAUCHE' ? 'GAUCHE' : 'DROITE' }),

  // Par LOT : « 2 points par 3 Armes ». `seuil` est la taille du lot ; un lot
  // incomplet ne rapporte rien — sept armes font deux lots de trois.
  lot: (n, cible, seuil, portee) => ({ kind: 'LOT', n, cible,
    seuil: Math.max(2, Math.min(20, Math.floor(seuil || 2))), portee: portee || 'SEQUENCE' }),

  // Un SEUIL à franchir, tout ou rien : « 4 si au moins 3 Armes dans sa
  // ligne », « 2 si aucune Valeur dans le montage ». `sens` : MIN — au moins
  // `seuil` ; MAX — au plus. « Aucun » s'écrit MAX 0.
  seuilCible: (n, cible, sens, seuil, portee) => ({ kind: 'SEUIL', n, cible,
    sens: sens === 'MAX' ? 'MAX' : 'MIN', seuil: Math.max(0, Math.min(99, Math.floor(seuil ?? 1))),
    portee: portee || 'SEQUENCE' }),

  // Par icône ABSENTE : n points par type d'icône que la portée ne montre
  // nulle part. Les six éléments sont les six candidats.
  absentes: (n, portee) => ({ kind: 'ABSENTES', n, portee: portee || 'MONTAGE' }),

  // Si CHAQUE séquence tient la taille demandée. `sens` : MIN — toutes ont au
  // moins `seuil` plans ; MAX — toutes en ont au plus. Un banc vide ne
  // rapporte rien : il n'y a pas de séquence à juger.
  seqToutes: (n, seuil, sens) => ({ kind: 'SEQ_TOUTES', n,
    seuil: Math.max(1, Math.min(20, Math.floor(seuil || 3))), sens: sens === 'MAX' ? 'MAX' : 'MIN' }),

  // L'icône la PLUS — ou la MOINS — présente de la portée, et l'on compte ses
  // exemplaires. « La moins présente » se lit parmi celles qui apparaissent :
  // sans cela, les cinq icônes absentes gagneraient toujours, à zéro.
  extreme: (n, sens, portee) => ({ kind: 'EXTREME', n, sens: sens === 'MOINS' ? 'MOINS' : 'PLUS',
    portee: portee || 'SEQUENCE' }),

  // Par plan selon COMBIEN d'icônes il porte : « 2 par plan à 3 icônes ».
  // `sens` : EXACT — exactement `seuil` ; MIN — au moins ; MAX — au plus.
  planIcones: (n, seuil, sens, portee) => ({ kind: 'PLAN_ICONES', n,
    seuil: Math.max(0, Math.min(12, Math.floor(seuil ?? 2))),
    sens: sens === 'MIN' || sens === 'MAX' ? sens : 'EXACT', portee: portee || 'SEQUENCE' }),

  // Une carte de la portée compte DOUBLE : la plus petite, ou la plus grosse.
  // `critere` dit ce que « petit » veut dire — ce qu'elle rapporte, combien
  // d'icônes elle porte, ou la taille de son cadrage. `n` est le nombre de
  // fois qu'on ajoute sa valeur : 1 la fait compter double, 2 triple.
  doubleCarte: (n, sens, critere, portee) => ({ kind: 'DOUBLE', n,
    sens: sens === 'PLUS' ? 'PLUS' : 'MOINS',
    critere: ['POINTS', 'ICONES', 'CADRAGE'].includes(critere) ? critere : 'POINTS',
    portee: portee || 'SEQUENCE' }),

  // « n si l'Arme est l'icône la plus présente ». On NOMME la cible, et l'on
  // gagne si elle domine — ou si elle est la plus rare, au choix. À ne pas
  // confondre avec `extreme`, qui compte les exemplaires de celle qui domine
  // sans dire laquelle : ici c'est une condition sur une cible désignée.
  // La comparaison se fait dans sa propre famille : une icône se compare aux
  // six icônes, un cadrage aux trois cadrages.
  domine: (n, cible, sens, portee) => ({ kind: 'DOMINE', n, cible,
    sens: sens === 'MOINS' ? 'MOINS' : 'PLUS', portee: portee || 'MONTAGE' }),

  // --- Les pouvoirs de RÈGLE ------------------------------------------------
  // Ceux-là ne comptent rien sur le banc : ils changent ce que leur porteuse a
  // le **droit** de faire, ou ce que son montage lui rapporte par ailleurs. Ils
  // valent tant que la carte est dans le montage, et n'ont donc ni portée ni
  // valeur en points. Aucun symbole ne les dit : ils s'écrivent en toutes
  // lettres sur la carte.
  //
  // Le droit de piocher au sommet d'une pile plutôt que dans la rivière : on
  // prend une carte que personne n'a vue, mais on la prend seul.
  // « Vous pouvez piocher vos Plans sur le Chutier » : la carte du dessus de la
  // défausse s'ajoute aux quatre de la rivière.
  piocher: () => ({ kind: 'PIOCHER', n: 0, cible: 'CHUTIER' }),
  // Une ligne de plus que les cinq de la règle, ou un plan de plus que les dix.
  // `n` n'est pas un nombre de points mais un nombre de lignes, ou de plans.
  sequencePlus: (n) => ({ kind: 'SEQ_PLUS', n: Math.max(1, Math.min(9, Math.floor(n || 1))) }),
  // « Après le dernier tour, vous pouvez jouer n Cartes supplémentaires. » Un
  // TOUR de plus, une fois la fin déclenchée — pas une limite de plans
  // repoussée : la fin tombe au dixième plan pour tout le monde, et la porteuse
  // joue ensuite sa carte, plan ou Raccord.
  planPlus: (n) => ({ kind: 'PLAN_PLUS', n: Math.max(1, Math.min(9, Math.floor(n || 1))) }),
  // « Les cartes Raccord vous rapportent +n par Raccord. » Un MODIFICATEUR, et
  // non un remplacement : le bandeau « x × Raccord » de vos Cartes Raccord
  // devient « x+n × Raccord ». Un « −2 × Raccord » à +1 se lit « −1 × Raccord » ;
  // un « 2 × Raccord » se lit « 3 × Raccord ».
  //
  // Il a longtemps REMPLACÉ le bandeau de coût — et ne s'appliquait donc qu'aux
  // Raccords dont le « n × Raccord » était négatif : sur des cartes qui
  // rapportaient déjà, il ne faisait rien du tout. Un modificateur n'a pas cette
  // condition : il vaut pour tout Raccord qui compte des Raccords, quel que soit
  // son signe.
  //
  // Ce qu'il ne touche pas : un Raccord qui porte AUTRE CHOSE — « 1 × Plan »,
  // une icône, un minutage — garde son bandeau, le pouvoir ne dit rien de lui ;
  // et l'Ouverture comme la Fin, qui encadrent le film plutôt que de relier,
  // ne sont jamais des Raccords.
  //
  // Deux cartes qui le disent s'AJOUTENT — +1 et +2 font +3 : ce sont deux
  // bonus, et deux bonus se cumulent. Du temps où le pouvoir remplaçait, il
  // fallait bien n'en garder qu'un ; un modificateur n'a plus à choisir.
  //
  // La carte qui le dit ne gagne rien elle-même : ce sont les Raccords qui
  // marquent, et qui l'affichent.
  raccordVaut: (n) => ({ kind: 'RACCORD_VAUT',
    n: Math.max(-20, Math.min(20, Math.floor(n === undefined ? 1 : n))) }),
};

/** Les bandeaux qui comptent des séquences : leur portée est le montage. */
export const KINDS_SEQUENCE = ['SEQ_TAILLE', 'SEQ_VOISINES', 'SEQ_LONGUE', 'SEQ_AVEC', 'SEQ_TOUTES'];

/**
 * Les pouvoirs de RÈGLE : ils ne rapportent pas de points par eux-mêmes, ils
 * changent une règle pour leur porteuse. Le décompte les laisse à zéro ; c'est
 * le moteur — et, pour le Raccord, le total du montage — qui les lit.
 */
export const KINDS_REGLE = ['PIOCHER', 'SEQ_PLUS', 'PLAN_PLUS', 'RACCORD_VAUT'];
export const estRegleKind = (k) => KINDS_REGLE.includes(k);

/**
 * Ces trois-là ne rapportent RIEN, jamais : ils ouvrent un droit. La carte qui
 * les porte n'a donc pas de compteur de points — un « 0 » y ferait croire à un
 * pouvoir qui a échoué, là où il n'y a rien à compter.
 *
 * `RACCORD_VAUT` en est un aussi : il ne donne rien à qui le porte, il
 * **remplace le bandeau imprimé** des Cartes Raccord du montage. Ce sont donc
 * elles qui marquent, et elles seules qui l'affichent.
 */
export const KINDS_SANS_POINTS = ['PIOCHER', 'SEQ_PLUS', 'PLAN_PLUS', 'RACCORD_VAUT'];

/** Ce bandeau-là peut-il rapporter — ou coûter — des points ? */
export const rapportePoints = (o) => !!o && !KINDS_SANS_POINTS.includes(o.kind);

/** Ce plan a-t-il de quoi marquer ? Sinon, pas de compteur au coin. */
export const planMarque = (objs) => (objs || []).some(rapportePoints);

/**
 * Les bandeaux dont la portée est **écrite dans leur définition** et ne se
 * règle donc pas : « dans l'ordre » juge le film entier, les bandeaux de
 * séquence lisent la forme du banc, et deux des pouvoirs ajoutés désignent
 * eux-mêmes où ils comptent — les autres lignes, un côté du centre.
 */
export const KINDS_PORTEE_FIXE = ['CHRONO', 'AILLEURS', 'CENTRE', 'BOUT',
  ...KINDS_SEQUENCE, ...KINDS_REGLE];

/** Ce bandeau-là laisse-t-il choisir sa portée ? */
export const porteeReglable = (o) => !!o && !KINDS_PORTEE_FIXE.includes(o.kind);

/** Pourquoi la portée de ce bandeau ne se règle pas. */
export function porteeFigee(o) {
  if (!o) return '';
  if (o.kind === 'CHRONO') return '« Dans l’ordre » se lit toujours sur le montage entier.';
  if (o.kind === 'AILLEURS') return 'Ce bandeau dit lui-même où il compte : dans les autres séquences.';
  if (o.kind === 'CENTRE') return 'Ce bandeau dit lui-même où il compte : d’un côté du centre de sa ligne.';
  if (o.kind === 'BOUT') {
    return 'Ce bandeau ne compte rien : il regarde la place de sa propre carte, à un bout de sa ligne.';
  }
  if (estRegleKind(o.kind)) {
    return 'Ce pouvoir ne compte rien : il change une règle pour vous, tant que la carte est'
      + ' dans votre montage. Il n’a donc pas de portée.';
  }
  return 'Un bandeau de séquence lit la forme du banc entier : sa portée ne se règle pas.';
}

/**
 * Un seuil, tel qu'il s'écrit sur un bandeau. Le « ≥ » et le « ≤ » ne passent
 * pas à l'impression — et se lisent mal à la taille d'un Gros Plan. On écrit
 * donc « 3+ » et « 3 max », qui se lisent sans avoir appris les symboles.
 *
 *   MIN    au moins k              « 3+ »
 *   MAX    au plus k               « 3 max »
 *   MOINS  strictement moins de k  « 2 max » — le même seuil, dit autrement
 */
export function seuilTexte(sens, k) {
  const v = Math.floor(k);
  if (sens === 'MAX') return `${v} max`;
  if (sens === 'MOINS') return `${Math.max(0, v - 1)} max`;
  return `${v}+`;
}

// --- Ce qu'un pouvoir peut compter -----------------------------------------
// Les bandeaux d'origine comptent chacun une chose et une seule : l'un des
// plans, l'autre des Raccords, un troisième une icône. Les pouvoirs ajoutés
// ensuite comptent tous « quelque chose » dans une portée — un lot, un seuil,
// un côté du centre —, et il aurait fallu neuf variantes de chacun pour couvrir
// les mêmes cibles. Ils partagent donc **un seul vocabulaire**, celui-ci, et
// une seule clé — `cible` —, qui tient dans la colonne CSV qui existe déjà.
//
// Deux cibles ne désignent pas des cartes mais ce qu'elles portent :
//   ICONE   toutes les icônes confondues — un plan à deux armes en porte deux
//   VALEUR  la **Valeur de Plan**, le mot de cinéma pour le cadrage, et l'on
//           compte celles qui sont DIFFÉRENTES : une ligne qui alterne Plan
//           Large et Gros Plan en montre deux, quel que soit le nombre de
//           cartes. Un cadrage nommé — « Gros Plan » — se vise
//           directement, sans passer par là
// et une dernière ne regarde pas la portée mais la forme du banc :
//   SEQUENCE  le nombre de séquences du montage
// `label` nomme la cible dans une liste déroulante, où il faut lever toute
// ambiguïté ; `court` la nomme dans une phrase, où la parenthèse pèserait. `f`
// marque le féminin, pour que « aucune Valeur » s'accorde.
const PLURIELS_CADRAGE = { PL: 'Plans Larges', GP: 'Gros Plans', DEP: 'Plans de départ' };

export const CIBLES_COMPTE = [
  { id: 'CARTE',    label: 'Carte (Raccords compris)', court: 'Carte',   pl: 'Cartes', f: true },
  { id: 'PLAN',     label: 'Plan (Raccord, Ouverture, Fin compris)', court: 'Plan', pl: 'Plans' },
  { id: 'RACCORD',  label: 'Carte Raccord',            court: 'Raccord', pl: 'Raccords' },
  { id: 'MORT',     label: 'Plan de mort',             court: 'Plan de mort', pl: 'Plans de mort' },
  ...CADRAGES_POUVOIR.map((f) => ({ id: f, label: FORMATS[f].label, court: FORMATS[f].label,
    pl: PLURIELS_CADRAGE[f] })),
  ...ELEMENT_IDS.map((e) => ({ id: e, label: ELEMENTS[e].label, court: ELEMENTS[e].label,
    pl: `${ELEMENTS[e].label}s`, f: e === 'HEROINE' || e === 'ARME' })),
  { id: 'ICONE',    label: 'Icône (toutes confondues)', court: 'icône',    pl: 'icônes', f: true },
  { id: 'VALEUR',   label: 'Valeur de Plan (cadrage différent)',
    court: 'Valeur de Plan', pl: 'Valeurs de Plan', f: true },
  { id: 'SEQUENCE', label: 'Séquence du banc',          court: 'séquence', pl: 'séquences', f: true },
  // Les deux cibles des cartes 4.1 : le plan SANS MINUTAGE — l'afficheur bleu
  // « -- » —, et l'ORDRE — une séquence dont les minutages se suivent.
  { id: 'TC_VIDE',  label: 'Plan sans chrono (« -- »)', court: 'plan sans chrono', pl: 'plans sans chrono' },
  { id: 'ORDRE',    label: 'Chronos dans l’ordre',      court: 'chronos dans l’ordre', pl: 'chronos dans l’ordre' },
  // « SÉQUENCE avec 6 différentes ? » (L4) : les types d'icônes DIFFÉRENTS
  // que la séquence montre, parmi les six — le crâne n'en est pas un.
  { id: 'DIFFERENTES', label: 'Icônes différentes', court: 'icône différente', pl: 'icônes différentes', f: true },
];

export const CIBLE_IDS = CIBLES_COMPTE.map((c) => c.id);

/**
 * La cible d'un bandeau. `ABSENT` la rangeait dans `el` du temps où elle ne
 * pouvait être qu'une icône : les configurations enregistrées avant qu'elle ne
 * s'ouvre au vocabulaire entier portent encore ce champ-là. On lit les deux
 * plutôt que de réécrire au chargement — une partie sauvegardée ne doit pas
 * dépendre d'une migration pour se relire.
 */
export const cibleDe = (o) => (o ? o.cible || o.el : undefined);

/** Les cibles qu'une comparaison de présence sait départager, par famille. */
export const FAMILLE_CIBLE = {
  ICONE: ELEMENT_IDS,
  CADRAGE: CADRAGES_POUVOIR,
};

/** À quelle famille cette cible se compare — ou rien, si elle ne se compare pas. */
export function familleDeCible(c) {
  if (ELEMENT_IDS.includes(c)) return 'ICONE';
  if (CADRAGES_POUVOIR.includes(c)) return 'CADRAGE';
  return null;
}

/** Les cibles qu'un bandeau de présence peut viser : les icônes et les cadrages. */
export const CIBLES_PRESENCE = [...CADRAGES_POUVOIR, ...ELEMENT_IDS];

/** Le libellé d'une cible du vocabulaire commun, tel qu'on l'écrit dans une phrase. */
export function libelleCibleCompte(cible, liste) {
  const c = CIBLES_COMPTE.find((x) => x.id === cible);
  if (!c) return libelleCible(cible);
  return liste ? c.label : c.court;
}

/** « aucun Plan », « aucune Valeur » — l'accord suit la cible. */
function aucunCible(cible) {
  const c = CIBLES_COMPTE.find((x) => x.id === cible);
  return `${c && c.f ? 'aucune' : 'aucun'} ${libelleCibleCompte(cible)}`;
}

/** Le « e » d'un participe accordé à la cible : « la Valeur est absente ». */
function accordCible(cible) {
  const c = CIBLES_COMPTE.find((x) => x.id === cible);
  return c && c.f ? 'e' : '';
}

/** « 3 Armes », « 2 séquences » — les pluriels sont écrits, pas devinés. */
export function cibleNombre(cible, k) {
  const c = CIBLES_COMPTE.find((x) => x.id === cible);
  return `${k} ${k > 1 && c && c.pl ? c.pl : libelleCibleCompte(cible)}`;
}

/**
 * Ce qu'une séquence peut porter, pour « n × séquence avec / sans … » : une
 * icône, un cadrage, ou une Carte Raccord. Une seule liste, une seule clé —
 * `cible` — pour que le CSV n'ait pas de colonne de plus.
 */
export function ciblesSequence() {
  return [
    ...ELEMENT_IDS.map((e) => ({ id: e, label: ELEMENTS[e].label })),
    ...CADRAGES_VISABLES.map((f) => ({ id: f, label: FORMATS[f].label })),
    { id: 'RACCORD', label: 'Raccord' },
    { id: 'MORT', label: 'Plan de mort' },
    // « Séquence avec 3+ Plans » : les plans de la ligne, Raccords compris.
    { id: 'PLAN', label: 'Plan (Raccords compris)' },
    // « Séquence avec 6 différentes » : les types d'icônes différents.
    { id: 'DIFFERENTES', label: 'Icônes différentes' },
    // « Valeur de Plan » ne se compte pas comme les autres : ce ne sont pas
    // les plans porteurs qu'on dénombre mais les cadrages DIFFÉRENTS de la
    // ligne. « Une séquence avec 3 Valeurs de Plan » demande donc les trois.
    { id: 'VALEUR', label: 'Valeur de Plan' },
  ];
}

/**
 * Une cible peut être un GROUPE d'icônes à réunir — « HEROINE+ENNEMI+ALLIE » :
 * une séquence avec les trois personnages. Elle s'écrit comme la colonne d'un
 * couple dans le tableur, et se compte en groupes complets.
 */
export const estGroupe = (c) => typeof c === 'string' && c.includes('+');

/** Le libellé d'une cible de séquence — icône, cadrage ou Raccord. */
export function libelleCible(cible) {
  if (estGroupe(cible)) return cible.split('+').map(libelleCible).join(' + ');
  if (cible === 'RACCORD') return 'Carte Raccord';
  if (cible === 'MORT') return 'Plan de mort';
  if (cible === 'PLAN') return 'Plan';
  if (cible === 'VALEUR') return 'Valeur de Plan';
  if (cible === 'DIFFERENTES') return 'Icônes différentes';
  if (FORMATS[cible]) return FORMATS[cible].label;
  return ELEMENTS[cible] ? ELEMENTS[cible].label : cible;
}

// Trois minutages ne se lisent pas comme les autres, et l'afficheur le dit.
//
// **« -- »** n'est pas un instant du film : c'est l'absence de minutage. Le
// Raccord relie sans rien raconter, et dix Gros Plans se placent où l'on veut.
//
// **01'** et **70'** sont, eux, des instants — l'Ouverture et la Fin du film.
// Ils gardent leur écriture et prennent leur propre couleur.
export const TC_VIDE = 0;
export const TC_PREMIER = 1;
export const TC_DERNIER = 70;

/** « 20' », comme l'afficheur des cartes — et « -- » pour l'absence de minutage. */
export function tcTexte(min) {
  if (Math.floor(min) === TC_VIDE) return '--';
  return `${String(Math.floor(min)).padStart(2, '0')}'`;
}

/**
 * La couleur d'un minutage : bleue quand il n'y en a pas, orangée pour les
 * bornes du film, rouge — la couleur par défaut — partout ailleurs.
 */
export function teinteTc(min) {
  const v = Math.floor(min);
  if (v === TC_VIDE) return 'bleu';
  if (v === TC_PREMIER || v === TC_DERNIER) return 'borne';
  return '';
}

/** Ce que le bandeau compte, sans sa portée. */
function objQuoi(o) {
  switch (o.kind) {
    case 'RACCORD': return 'Raccord';
    case 'PLAN':    return 'Plan';
    case 'FORMAT':  return o.format2
      ? `${FORMATS[o.format].label} & ${FORMATS[o.format2].label}`
      : FORMATS[o.format].label;
    case 'ELEMENT': return ELEMENTS[o.el].label;
    case 'PAIRE': {
      // « couple de Héroïne » quand c'est la même icône répétée, sinon la
      // liste — et « trio » dès qu'elles sont trois.
      const mot = o.els.length > 2 ? 'trio' : 'couple';
      const memes = o.els.every((x) => x === o.els[0]);
      return memes ? `${mot} de ${ELEMENTS[o.els[0]].label}`
        : `${mot} ${o.els.map((x) => ELEMENTS[x].label).join(' + ')}`;
    }
    case 'MORT':    return 'Mort';
    case 'DOMINE': return `${libelleCibleCompte(cibleDe(o))} ${o.sens === 'MOINS' ? 'min' : 'max'}`;
    case 'MINUTAGE': return `Plan ${o.sens === 'APRES' ? 'après' : o.sens === 'EGAL' ? 'à' : 'avant'} ${tcTexte(o.seuil)}`;
    case 'SEQ_TAILLE': return `séquence de ${o.seuil} plan${o.seuil > 1 ? 's' : ''} ou ${o.sens === 'MAX' ? 'moins' : 'plus'}`;
    case 'SEQ_VOISINES': return `séquence ${o.sens === 'APRES' ? 'en dessous' : 'au-dessus'} de celle-ci`;
    case 'SEQ_LONGUE': return 'Plan de votre plus longue séquence';
    case 'SEQ_AVEC': {
      // Sans seuil, la lecture d'origine : « avec » ou « sans ». Avec un seuil,
      // c'est un compte d'EXEMPLAIRES — et « sans » devient « moins de ». La
      // phrase les met au pluriel plutôt que d'écrire « 3 × Véhicule » : trois
      // véhicules, c'est ce que la ligne montre, sur autant de plans qu'elle veut.
      const k = Math.max(1, o.seuil || 1);
      if (k > 1) {
        return `séquence montrant ${o.sens === 'SANS' ? 'moins de' : 'au moins'} ${cibleNombre(o.cible, k)}`;
      }
      // Deux cibles ne se disent pas « avec X » : la séquence DANS L'ORDRE, et
      // celle qui ne porte aucun plan sans minutage.
      if (o.cible === 'ORDRE') return `séquence ${o.sens === 'SANS' ? 'dans le désordre' : 'dans l’ordre des chronos'}`;
      if (o.cible === 'TC_VIDE') return `séquence ${o.sens === 'SANS' ? 'sans' : 'avec'} plan sans chrono (« -- »)`;
      return `séquence ${o.sens === 'SANS' ? 'sans' : 'avec'} ${libelleCible(o.cible)}`;
    }
    // --- Les pouvoirs du vocabulaire commun --------------------------------
    // Ce bandeau compte des SÉQUENCES et non ce qu'elles portent : « 3 × séquence
    // en dessous qui porte un Véhicule » — trois lignes qui en portent font
    // trois, qu'elles en montrent six à elles trois ou trois.
    case 'AILLEURS': return `séquence ${
      o.sens === 'DESSUS' ? 'au-dessus de la sienne'
        : o.sens === 'DESSOUS' ? 'en dessous de la sienne'
          : 'autre que la sienne'} qui porte ${libelleCible(o.cible)}`;
    case 'CENTRE': return `${libelleCibleCompte(o.cible)} à ${
      o.sens === 'DROITE' ? 'droite' : 'gauche'} du centre de sa ligne`;
    case 'LOT': return `lot de ${cibleNombre(o.cible, o.seuil)}`;
    case 'ABSENTES': return 'icône absente';
    case 'EXTREME': return `${o.sens === 'MOINS' ? 'exemplaire de l’icône la moins présente'
      : 'exemplaire de l’icône la plus présente'}`;
    case 'PLAN_ICONES': return `Plan à ${
      o.sens === 'MIN' ? 'au moins ' : o.sens === 'MAX' ? 'au plus ' : ''}${o.seuil} icône${
      o.seuil > 1 ? 's' : ''}`;
    default: return '';
  }
}

/** Ce que « la plus grosse carte » veut dire, selon le critère choisi. */
export const CRITERES_DOUBLE = {
  POINTS: 'en points',
  ICONES: 'en nombre d’icônes',
  CADRAGE: 'en taille de cadrage',
};

/**
 * Un modificateur s'écrit avec son signe : « +1 », « −2 ». Le signe fait partie
 * du nombre — sans lui, « 1 par Raccord » se lirait comme une valeur et non
 * comme un bonus. Le moins est le vrai signe typographique, pas le trait
 * d'union.
 */
export const signe = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

/**
 * La phrase d'un bandeau, en toutes lettres.
 *
 * `opts.sansNombre` la met au service de l'AIDE DE JEU, où le bandeau est
 * dessiné juste à côté : le nombre y est déjà sous les yeux, et le réécrire le
 * dirait deux fois. « 2 × Raccord » devient donc « par Raccord ». En revanche
 * la portée s'y écrit TOUJOURS, « dans le montage entier » compris — on
 * l'omettait comme une évidence, mais une fiche décrit une famille de bandeaux
 * et non une carte posée : l'évidence n'y est plus lisible.
 */
export function objLabel(o, cfg, opts = {}) {
  if (!o) return '';
  const nu = !!opts.sansNombre;
  const p = PORTEES.find((x) => x.id === objPortee(o, cfg)) || PORTEES[3];
  // La portée s'écrit toujours dans l'aide — SAUF pour les bandeaux qui la
  // portent déjà dans leur propre phrase : « à droite du centre de sa ligne »
  // n'a pas besoin qu'on ajoute « dans le montage entier » derrière, et les
  // deux ensemble se contredisent.
  const ou = (nu && porteeReglable(o)) || p.id !== 'MONTAGE' ? ` ${p.phrase}` : '';
  const fois = nu ? 'par' : `${o.n} ×`;
  const si = nu ? 'si' : `${o.n} si`;
  switch (o.kind) {
    // --- Les pouvoirs de règle : une phrase, pas un compte ------------------
    case 'PIOCHER': return 'Vous pouvez piocher vos Plans sur le Chutier';
    case 'SEQ_PLUS': return `Vous pouvez poser ${o.n} séquence${
      o.n > 1 ? 's' : ''} supplémentaire${o.n > 1 ? 's' : ''}${
      cfg && cfg.sequencesMax > 0 ? ` (${cfg.sequencesMax + o.n})` : ''}`;
    case 'PLAN_PLUS': return `Après le dernier tour, vous jouez ${o.n} Plan${
      o.n > 1 ? 's' : ''} supplémentaire${o.n > 1 ? 's' : ''}`;
    case 'RACCORD_VAUT':
      return `Chaque Raccord vaut ${signe(o.n)}`;
    case 'ABSENT': {
      const c = cibleDe(o);
      return `${si} ${libelleCibleCompte(c)} est absent${accordCible(c)}${ou}`;
    }
    case 'DOMINE': {
      // Un cadrage est masculin, une icône féminine : l'article, l'adverbe et
      // le participe s'accordent ensemble ou la phrase boite.
      const masc = familleDeCible(cibleDe(o)) === 'CADRAGE';
      return `${si} ${libelleCibleCompte(cibleDe(o))} est ${masc ? 'le cadrage' : 'l’icône'} ${
        masc ? 'le' : 'la'} ${o.sens === 'MOINS' ? 'moins' : 'plus'} présent${masc ? '' : 'e'}${
        ou || ' dans le montage entier'}`;
    }
    case 'CHRONO':  return `${si} tout est dans l’ordre${ou || ' dans le montage entier'}`;
    // Le seul bandeau qui parle de la place de sa carte : « 3 si aucun Plan à
    // droite de ce plan ». La portée est écrite dans la phrase, elle ne se
    // règle pas — d'où l'absence de `ou`.
    case 'BOUT': return `${si} aucun Plan à ${
      o.sens === 'GAUCHE' ? 'gauche' : 'droite'} de ce plan, dans sa séquence`;
    case 'SEUIL': {
      // « Au plus zéro » se dit « aucun » : c'est la lecture qui vient à
      // l'esprit, et celle qu'on écrirait sur la carte.
      const ou2 = o.cible === 'SEQUENCE' ? ' dans le banc' : ou;
      // « 4 si ◀ 00' ↗ ▶ » : l'ordre se tient, ou il ne se tient pas.
      if (o.cible === 'ORDRE') return `${si} les chronos ${o.sens === 'MAX' ? 'ne sont pas' : 'sont'} dans l’ordre${ou2}`;
      if (o.sens === 'MAX' && o.seuil === 0) return `${si} ${aucunCible(o.cible)}${ou2}`;
      return `${si} ${o.sens === 'MAX' ? 'au plus' : 'au moins'} ${
        cibleNombre(o.cible, o.seuil)}${ou2}`;
    }
    case 'SEQ_TOUTES': return `${si} chaque séquence a ${
      o.sens === 'MAX' ? 'au plus' : 'au moins'} ${o.seuil} plan${o.seuil > 1 ? 's' : ''}`;
    // « Compte double » se dit ainsi, pas « 1 × sa valeur » : c'est la même
    // chose, mais une seule des deux tournures se lit sur une carte.
    case 'DOUBLE': return `${o.sens === 'PLUS' ? 'La plus grosse' : 'La plus petite'} carte${ou} — ${
      CRITERES_DOUBLE[o.critere] || CRITERES_DOUBLE.POINTS} — compte ${
      o.n === 1 ? 'double' : `${o.n + 1} fois`}`;
    case 'SANS_TC': return `${si} aucun plan ${
      o.sens === 'AVANT' ? `avant ${tcTexte(o.seuil)}`
        : o.sens === 'APRES' ? `après ${tcTexte(o.seuil)}`
          : `à ${tcTexte(o.seuil)}`}${ou || ' dans le montage entier'}`;
    default: return `${fois} ${objQuoi(o)}${ou}`;
  }
}

/**
 * Où un bandeau compte. Il le porte lui-même ; les cartes imprimées qui ne le
 * précisent pas suivent la variable de partie — c'est le point resté ouvert
 * dans les règles.
 */
export function objPortee(o, cfg) {
  if (!o) return 'MONTAGE';
  // « Dans l'ordre » ne se règle pas : c'est le film entier que l'on juge.
  // Les bandeaux de séquence non plus : ils lisent la forme du banc entier.
  // Ni ceux qui portent leur portée dans leur définition — les autres lignes,
  // un côté du centre : le décompte va la chercher là, pas ici.
  if (!porteeReglable(o)) return 'MONTAGE';
  if (PORTEE_IDS.includes(o.portee)) return o.portee;
  return cfg && cfg.porteeParDefaut === 'SEQUENCE' ? 'SEQUENCE' : 'MONTAGE';
}

// --- Les Gros Plans ---------------------------------------------------------
// En 4.1 une carte ordinaire est coupée en deux au centre, et chaque moitié est
// un GROS PLAN : son minutage, ses icônes, son pouvoir. Une « scène » est ici un
// Gros Plan, tel que la boîte le porte — voir `GP_41`, plus bas.

const S = (idx, tc, famille, num, el, obj, extra = {}) => ({ idx, tc, famille, num, el, obj, ...extra });

// Les Gros Plans en vigueur — ceux de la boîte, plus ceux que l'éditeur a
// créés, moins ceux qu'il a supprimés.
export function SCENES() {
  const ajoutees = (SURCHARGES.ajouts.scenes || []).map(hydraterScene);
  const out = [...T().scenes, ...ajoutees];
  return SURCHARGES.retires.size
    ? out.filter((s) => !SURCHARGES.retires.has(idScene(s.idx)))
    : out;
}

export const idScene = (idx) => `SC${idx}`;

/** Un Gros Plan créé : la même forme que ceux de la boîte, valeurs par défaut comprises. */
function hydraterScene(a) {
  return S(a.idx, a.tc || 0, a.famille || 'PERSONNAGE', a.num, (a.el || []).slice(),
    a.obj ? { ...a.obj } : null,
    { ...(a.titre ? { titre: a.titre } : {}), ...(a.mort ? { mort: true } : {}),
      ...(a.transition ? { transition: a.transition } : {}), ajoutee: true });
}

export function sceneDe(idx) {
  return SCENES().find((s) => s.idx === idx) || null;
}

/** La scène d'un Gros Plan, par son numéro. */
function indexScenes() {
  const out = {};
  for (const s of SCENES()) out[s.num] = s.idx;
  return out;
}

// --- Les Plans Larges ---------------------------------------------------------
// Une carte à une seule image, qui prend toute la carte.

const PL = (num, tc, el, obj, extra = {}) => ({ num, tc, el, obj, ...extra });

/** Les Plans Larges en vigueur — ceux de la boîte, plus les créés, moins les supprimés. */
export function PLANS_LARGES() {
  const ajoutes = (SURCHARGES.ajouts.larges || []).map((a) => PL(a.num, a.tc || 0,
    (a.el || []).slice(), a.obj ? { ...a.obj } : null, { ajoute: true }));
  const out = [...T().larges, ...ajoutes];
  return SURCHARGES.retires.size ? out.filter((p) => !SURCHARGES.retires.has(`L${p.num}`)) : out;
}

// --- Les Plans de départ -------------------------------------------------------
// La boîte porte QUATRE plans de départ. Une carte de départ est la seule carte
// recto verso du jeu : elle porte deux de ces plans, un par face. Quatre plans
// font six couples, donc six cartes différentes ; chaque joueuse en reçoit une
// et choisit la face qu'elle pose.

/** Les plans de départ en vigueur. */
export function DEPARTS() {
  const ajoutes = (SURCHARGES.ajouts.departs || []).map((d) => PL(d.num, d.tc || 0, (d.el || []).slice(),
    d.obj ? { ...d.obj } : null, { depart: true, ajoute: true }));
  const out = [...T().departs, ...ajoutes];
  return SURCHARGES.retires.size ? out.filter((p) => !SURCHARGES.retires.has(`P${p.num}`)) : out;
}

/** Les six couples que quatre plans permettent — ou ceux de n plans. */
function couplesDepart() {
  const plans = DEPARTS();
  const out = [];
  for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) out.push([plans[i], plans[j]]);
  return out;
}

// --- Les cartes à deux Gros Plans ----------------------------------------------
// `paires[i] = [gauche, droite]` : les numéros des deux Gros Plans de la i-ème
// carte, la moitié GAUCHE puis la moitié DROITE. On ne choisit pas seulement
// quels plans vont ensemble : la moitié gauche ne se pose qu'à gauche d'une
// séquence, la droite qu'à droite.

function PAIRES() {
  const ajoutees = (SURCHARGES.ajouts.paires || []).map((p) => [p.g, p.d, { ajoutee: true }]);
  return [...T().paires, ...ajoutees];
}

export function buildCartesDoubles() {
  const index = indexScenes();
  return PAIRES().map(([gImp, dImp, extra], i) => {
    // L'assemblage se règle : c'est une retouche comme une autre.
    const [gNum, dNum] = paireDe(i, [gImp, dImp]);
    const id = `D${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      type: 'DOUBLE',
      rang: i,
      gNum, dNum,
      gScene: gNum == null ? undefined : index[gNum],
      dScene: dNum == null ? undefined : index[dNum],
      gImprime: gImp, dImprime: dImp,
      appariementModifie: gNum !== gImp || dNum !== dImp,
      actif: carteActive(id),
      ...(extra || {}),
    };
  }).filter((c) => {
    if (SURCHARGES.retires.has(c.id)) return false;
    // Une carte CRÉÉE peut rester vide : c'est une place qu'on remplit à
    // l'Assemblage. Une carte de la boîte vidée de ses deux moitiés disparaît,
    // comme celle dont un Gros Plan a été supprimé.
    return (c.gScene !== undefined || c.gNum == null) && (c.dScene !== undefined || c.dNum == null)
      && (c.gNum != null || c.dNum != null || !!c.ajoutee);
  });
}

/** Une carte a-t-elle ses deux moitiés ? Sans cela elle se consulte, elle ne se joue pas. */
export const carteComplete = (c) => !!c && c.gScene !== undefined && c.dScene !== undefined;

export function buildPlansLarges() {
  return PLANS_LARGES().map((p) => ({ id: `L${p.num}`, type: 'PL', actif: carteActive(`L${p.num}`), ...p }));
}

/**
 * Les cartes de départ : une par couple de plans. Leur identité dit lequel —
 * « S5-7 » porte les plans 5 et 7.
 */
export function buildDeparts() {
  return couplesDepart().map(([a, b], i) => ({
    id: `S${a.num}-${b.num}`, type: 'DEPART', rang: i, faces: [a, b],
    actif: carteActive(`S${a.num}-${b.num}`),
  })).filter((c) => c.actif);
}

/**
 * Toutes les CARTES de la boîte, chacune avec les plans qu'elle porte : deux
 * Gros Plans, un Plan Large, ou les deux faces d'une carte de départ.
 */
export function cartesDeLaBoite() {
  const out = [];
  for (const c of buildCartesDoubles()) {
    if (!c.actif) continue;
    const m = moitiesDe(c);
    out.push({ id: c.id, famille: 'DOUBLE', plans: [m.G, m.D] });
  }
  for (const c of buildPlansLarges()) {
    if (!c.actif) continue;
    out.push({ id: c.id, famille: 'PL', plans: [plHalf(c)] });
  }
  for (const d of buildDeparts()) {
    out.push({ id: d.id, famille: 'DEP', plans: d.faces.map((f) => plHalf({ ...f, depart: true })) });
  }
  return out;
}

/**
 * Ce qu'un bandeau NOMME — sa cible, ou ses cibles. Deux bandeaux de familles
 * différentes peuvent viser la même chose : « 2 × Arme » et « 4 si au moins 3
 * Armes » parlent tous deux de l'Arme. C'est par là qu'on répond à « combien de
 * cartes parlent de la séquence », qui ne se lit dans aucun `kind`.
 */
export function ciblesDe(o) {
  if (!o) return [];
  switch (o.kind) {
    case 'PLAN':      return ['PLAN'];
    case 'RACCORD':   return ['RACCORD'];
    case 'MORT':      return ['MORT'];
    case 'CHRONO':    return ['ORDRE'];
    case 'BOUT':      return ['PLAN'];
    case 'DOUBLE':    return ['CARTE'];
    case 'ABSENTES': case 'EXTREME': return ['ICONE'];
    case 'PLAN_ICONES': return ['PLAN', 'ICONE'];
    case 'MINUTAGE': case 'SANS_TC': return ['MINUTAGE'];
    case 'FORMAT':    return [o.format, o.format2].filter(Boolean);
    case 'PAIRE':     return [...new Set(o.els || [])];
    case 'ELEMENT': case 'ABSENT': return [cibleDe(o)].filter(Boolean);
    default:
      // Les bandeaux de séquence parlent tous de la ligne, et la plupart
      // nomment en plus ce qu'elle doit porter.
      if (KINDS_SEQUENCE.includes(o.kind)) {
        return ['SEQUENCE', ...(o.cible ? [...new Set(String(o.cible).split('+'))] : [])];
      }
      return o.cible ? [o.cible] : [];
  }
}

/**
 * Combien de cartes de la boîte portent quoi. Une carte ne se compte qu'**une
 * fois** par entrée, même si deux de ses plans portent la même chose : la
 * question est « combien de cartes », pas « combien de plans ».
 *
 * Un Raccord n'a pas de cadrage — il occupe la place d'un Gros Plan sans en
 * être un —, et il ne se compte donc que dans `raccord`.
 */
export function recenserBoite(cfg) {
  const c = cfg || {};
  const vide = () => Object.create(null);
  const r = { cartes: 0, icones: vide(), cadrages: vide(), raccord: 0,
    kinds: vide(), cibles: vide(), portees: vide(), tc: vide() };
  const pousse = (bac, cle) => { if (cle !== undefined && cle !== null) bac[cle] = (bac[cle] || 0) + 1; };

  for (const carte of cartesDeLaBoite(!!c.sixCartesDepart)) {
    r.cartes++;
    const icones = new Set(); const cadrages = new Set(); const kinds = new Set();
    const cibles = new Set(); const portees = new Set(); const tcs = new Set();
    let raccord = false;
    for (const p of carte.plans) {
      if (!p) continue;
      for (const e of p.el || []) icones.add(e);
      if (p.mort) icones.add('MORT');
      if (p.transition === 'RACCORD') raccord = true;
      else if (!p.transition) cadrages.add(p.format);
      // Le minutage se range en quatre : l'Ouverture, la Fin, l'absence de
      // minutage, et tout le reste.
      tcs.add(p.tc === TC_VIDE ? 'VIDE' : p.tc === TC_PREMIER ? 'PREMIER'
        : p.tc === TC_DERNIER ? 'DERNIER' : 'ORDINAIRE');
      for (const o of objsDe(p)) {
        kinds.add(o.kind);
        for (const x of ciblesDe(o)) cibles.add(x);
        if (!estRegleKind(o.kind)) portees.add(objPortee(o, c));
      }
    }
    for (const e of icones) pousse(r.icones, e);
    for (const f of cadrages) pousse(r.cadrages, f);
    for (const k of kinds) pousse(r.kinds, k);
    for (const x of cibles) pousse(r.cibles, x);
    for (const p of portees) pousse(r.portees, p);
    for (const t of tcs) pousse(r.tc, t);
    if (raccord) r.raccord++;
  }
  return r;
}

// --- Matériel ajustable ----------------------------------------------------
// Les cartes du jeu sont les vraies cartes, montrées telles quelles. Ce que le
// moteur en sait — minutage, icônes, pouvoir — a été lu sur chacune, et reste
// réglable plan par plan dans l'écran Matériel : c'est ce qui permet de corriger
// une lecture, ou d'essayer un équilibrage. Un plan retouché ne correspond plus
// à son image ; le site le recompose alors lui-même, le temps de l'essai.
//
// Deux jeux coexistent — celui de la BOÎTE, intouchable, et le MODIFIÉ, qui
// porte les retouches. `appliquerMateriel` reçoit le second quand c'est lui
// qu'on joue, et rien quand on joue la boîte.
//
//   plans[clé]  = { tc, el, obj, mort }  — chaque champ absent = valeur de la boîte
//   paires[i]   = [gauche, droite]       — l'assemblage de la i-ème carte
//   desactives  = [id de carte, …]       — les cartes écartées du paquet
//
// La clé d'un plan : « GP13 » pour un Gros Plan, son seul numéro pour un Plan
// Large ou un Plan de départ — les deux séries se numérotent à part, L1 à L19
// et GP00 à GP102.

/** La clé d'un plan. */
export function cleplan(num, grosPlan) {
  return grosPlan ? `GP${num}` : String(num);
}

// --- La boîte 4.1 --------------------------------------------------------------
// Les VRAIES cartes, livrées par l'auteur et montrées telles quelles (`visuel`) :
// le site ne les redessine pas. Ce qui suit est ce que le MOTEUR a besoin d'en
// savoir pour compter — minutage en minutes, icônes, pouvoir —, lu sur chaque
// carte. La première icône est la DOMINANTE, la grande, qui donne sa couleur à
// la carte ; le L6 et le GP00 n'en ont pas, et l'Entracte (L10) n'a aucune icône.
//
// Les dix-neuf Plans Larges sont numérotés L1 à L19, par minutage croissant.
// Quatre d'entre eux sont les plans de départ : L5, L7, L12 et L16.
const PD41 = [5, 7, 12, 16];
const PLANS_41 = [
  PL(1, 10, ['OBJET', 'ARME', 'HEROINE'], OBJ.seqAvec(5, 'AVEC', 'OBJET', 3)),
  PL(2, 10, ['ALLIE', 'VEHICULE', 'ENNEMI'], OBJ.seqAvec(3, 'AVEC', 'RACCORD')),
  PL(3, 10, ['HEROINE', 'ENNEMI', 'ARME'], OBJ.seqVoisines(4, 'APRES')),
  PL(4, 20, ['ALLIE', 'HEROINE', 'OBJET'], OBJ.seqAvec(4, 'AVEC', 'DIFFERENTES', 6)),
  PL(5, 20, ['OBJET', 'HEROINE', 'ALLIE', 'VEHICULE'], OBJ.raccordVaut(1)),
  PL(6, 20, ['OBJET', 'ARME', 'VEHICULE'], OBJ.seqLongue(2)),
  PL(7, 30, ['ALLIE', 'ENNEMI', 'ARME'], OBJ.planPlus(1)),
  PL(8, 30, ['ENNEMI', 'ALLIE', 'OBJET'], OBJ.seqAvec(4, 'SANS', 'HEROINE')),
  PL(9, 30, ['VEHICULE', 'HEROINE', 'ENNEMI'], OBJ.seqAvec(4, 'SANS', 'TC_VIDE')),
  PL(10, 35, [], OBJ.seqAvec(3, 'AVEC', 'ORDRE')),
  PL(11, 40, ['HEROINE', 'ENNEMI', 'VEHICULE', 'ARME'], OBJ.seqAvec(3, 'AVEC', 'PLAN', 3)),
  PL(12, 40, ['VEHICULE', 'VEHICULE', 'HEROINE', 'ENNEMI'], OBJ.sequencePlus(1)),
  PL(13, 40, ['ENNEMI', 'ALLIE', 'OBJET'], OBJ.seqAvec(4, 'SANS', 'ARME')),
  PL(14, 50, ['HEROINE', 'ENNEMI', 'ARME'], OBJ.seqAvec(4, 'SANS', 'ALLIE')),
  PL(15, 50, ['ENNEMI', 'ALLIE', 'ARME'], OBJ.seqAvec(4, 'AVEC', 'ARME', 3)),
  PL(16, 50, ['ARME', 'ARME', 'HEROINE', 'ENNEMI'], OBJ.piocher()),
  PL(17, 60, ['ALLIE', 'HEROINE', 'VEHICULE'], OBJ.extreme(1, 'PLUS', 'MONTAGE')),
  PL(18, 60, ['ENNEMI', 'HEROINE', 'ALLIE'], OBJ.seqAvec(4, 'AVEC', 'HEROINE+ALLIE+ENNEMI'), { mort: true }),
  PL(19, 60, ['HEROINE', 'VEHICULE', 'OBJET'], OBJ.seqVoisines(4, 'AVANT'), { mort: true }),
];

// Les cinquante-quatre GROS PLANS, 60 × 80 mm chacun. Leur numéro dit leur
// minutage : GP0x « -- », GP1x 10', … GP6x 60', et GP100 à 102 le Raccord,
// l'Ouverture (01') et la Fin (70').
const X41 = (n, tc, el, obj, extra = {}) => ({ n, tc, el, obj, ...extra });
const GP_41 = [
  X41(0, 0, ['OBJET', 'ARME', 'VEHICULE'], OBJ.minutage(1, 'EGAL', 0, 'MONTAGE')),
  X41(1, 0, ['HEROINE'], OBJ.element(1, 'HEROINE', 'MONTAGE')),
  X41(2, 0, ['ENNEMI'], OBJ.element(1, 'ENNEMI', 'MONTAGE')),
  X41(3, 0, ['ALLIE'], OBJ.element(1, 'ALLIE', 'MONTAGE')),
  X41(4, 0, ['HEROINE'], OBJ.paire(2, 'HEROINE', 'ALLIE', 'SEQUENCE')),
  X41(5, 0, ['ENNEMI', 'HEROINE'], OBJ.paire(2, 'ENNEMI', 'HEROINE', 'SEQUENCE')),
  X41(6, 0, ['ALLIE'], OBJ.paire(2, 'ALLIE', 'ENNEMI', 'SEQUENCE')),
  X41(7, 0, ['OBJET'], OBJ.element(1, 'OBJET', 'MONTAGE')),
  X41(8, 0, ['ARME'], OBJ.element(1, 'ARME', 'MONTAGE')),
  X41(9, 0, ['VEHICULE'], OBJ.element(1, 'VEHICULE', 'MONTAGE')),
  X41(10, 10, ['ALLIE', 'OBJET'], OBJ.element(1, 'ALLIE', 'SUITE')),
  X41(11, 10, ['OBJET', 'ARME'], OBJ.element(2, 'OBJET', 'SEQUENCE')),
  X41(12, 10, ['ARME', 'OBJET'], OBJ.paire(2, 'ARME', 'OBJET', 'SEQUENCE')),
  X41(13, 10, ['HEROINE', 'ARME'], OBJ.seuilCible(4, 'ORDRE', 'MIN', 1, 'SEQUENCE')),
  X41(14, 10, ['HEROINE', 'VEHICULE'], OBJ.seuilCible(6, 'HEROINE', 'MIN', 6, 'MONTAGE')),
  X41(15, 10, ['ARME', 'HEROINE'], OBJ.element(1, 'ARME', 'SUITE')),
  X41(16, 10, ['ENNEMI', 'VEHICULE'], OBJ.seqTaille(2, 1)),
  X41(20, 20, ['ARME', 'HEROINE'], OBJ.bout(4, 'GAUCHE')),
  X41(21, 20, ['HEROINE', 'VEHICULE'], OBJ.element(1, 'HEROINE', 'SUITE')),
  X41(22, 20, ['ENNEMI', 'VEHICULE'], OBJ.domine(6, 'ENNEMI')),
  X41(23, 20, ['ALLIE', 'OBJET'], OBJ.absent(5, 'ENNEMI', 'SEQUENCE')),
  X41(24, 20, ['OBJET', 'ALLIE'], OBJ.domine(6, 'OBJET')),
  X41(25, 20, ['OBJET', 'ALLIE'], OBJ.seuilCible(6, 'OBJET', 'MIN', 5, 'MONTAGE')),
  X41(26, 20, ['VEHICULE', 'OBJET'], OBJ.absent(4, 'TC_VIDE', 'SEQUENCE')),
  X41(30, 30, ['ARME', 'ENNEMI'], OBJ.domine(6, 'ARME')),
  X41(31, 30, ['OBJET', 'ENNEMI'], OBJ.seuilCible(4, 'ORDRE', 'MIN', 1, 'SEQUENCE')),
  X41(32, 30, ['ENNEMI', 'OBJET'], OBJ.seuilCible(6, 'ENNEMI', 'MIN', 6, 'MONTAGE')),
  X41(33, 30, ['ALLIE', 'OBJET'], OBJ.element(1, 'ALLIE', 'SEQUENCE')),
  X41(34, 30, ['OBJET', 'ARME'], OBJ.absent(5, 'HEROINE', 'SEQUENCE')),
  X41(35, 30, ['HEROINE', 'ALLIE'], OBJ.seqTaille(2, 1)),
  X41(40, 40, ['VEHICULE', 'VEHICULE'], OBJ.element(2, 'VEHICULE', 'SEQUENCE')),
  X41(41, 40, ['HEROINE', 'VEHICULE'], OBJ.seuilCible(6, 'VEHICULE', 'MIN', 6, 'MONTAGE')),
  X41(42, 40, ['VEHICULE', 'ENNEMI'], OBJ.absent(6, 'RACCORD', 'MONTAGE')),
  X41(43, 40, ['VEHICULE', 'HEROINE'], OBJ.domine(6, 'VEHICULE')),
  X41(44, 40, ['VEHICULE', 'OBJET'], OBJ.absent(5, 'VEHICULE', 'SUITE')),
  X41(45, 40, ['ENNEMI', 'VEHICULE'], OBJ.absent(5, 'ENNEMI', 'AMONT')),
  X41(46, 40, ['ALLIE', 'VEHICULE'], OBJ.absent(4, 'TC_VIDE', 'SEQUENCE')),
  X41(50, 50, ['ARME', 'ARME'], OBJ.seuilCible(6, 'ARME', 'MIN', 6, 'MONTAGE')),
  X41(51, 50, ['HEROINE', 'ARME'], OBJ.absent(5, 'ALLIE', 'SEQUENCE')),
  X41(52, 50, ['ENNEMI', 'ARME'], OBJ.mort(3, 'SUITE')),
  X41(53, 50, ['ENNEMI', 'ARME'], OBJ.absent(5, 'ENNEMI', 'SUITE')),
  X41(54, 50, ['HEROINE', 'ARME'], OBJ.element(2, 'ARME', 'SEQUENCE')),
  X41(55, 50, ['ARME', 'ALLIE'], OBJ.seuilCible(6, 'MORT', 'MIN', 2, 'MONTAGE')),
  X41(56, 50, ['ALLIE', 'ARME'], OBJ.minutage(2, 'EGAL', 50, 'SEQUENCE')),
  X41(60, 60, ['VEHICULE'], OBJ.element(1, 'VEHICULE', 'AMONT'), { mort: true }),
  X41(61, 60, ['HEROINE', 'VEHICULE'], OBJ.element(1, 'HEROINE', 'AMONT'), { mort: true }),
  X41(62, 60, ['HEROINE', 'OBJET'], OBJ.domine(6, 'HEROINE'), { mort: true }),
  X41(63, 60, ['ENNEMI', 'HEROINE', 'ALLIE'], OBJ.absent(6, 'MORT', 'MONTAGE')),
  X41(64, 60, ['OBJET', 'ENNEMI'], OBJ.mort(3, 'SEQUENCE'), { mort: true }),
  X41(65, 60, ['ALLIE', 'OBJET'], OBJ.domine(6, 'ALLIE'), { mort: true }),
  X41(66, 60, ['ARME', 'ALLIE'], OBJ.seuilCible(4, 'ORDRE', 'MIN', 1, 'SEQUENCE'), { mort: true }),
  X41(100, 0, [], OBJ.raccord(1), { transition: 'RACCORD', titre: 'Raccord' }),
  X41(101, 1, [], OBJ.seuilCible(5, 'PLAN', 'MAX', 0, 'AMONT'), { transition: 'OUVERTURE', titre: 'BBG présente' }),
  X41(102, 70, [], OBJ.seuilCible(5, 'PLAN', 'MAX', 0, 'SUITE'), { transition: 'CREDITS', titre: 'Fin' }),
];
/** La famille d'un Gros Plan : le crâne d'abord, puis ce que montre sa grande icône. */
const famille41 = (p) => (p.transition ? 'TRANSITION' : p.mort ? 'MORT'
  : ['OBJET', 'ARME', 'VEHICULE'].includes(p.el[0]) ? p.el[0] : 'PERSONNAGE');
/** Le nom de fichier d'un Gros Plan : GP00, GP07, GP100. */
const fichierGP41 = (n) => `GP${String(n).padStart(2, '0')}`;

// L'ASSEMBLAGE des 36 cartes à deux Gros Plans — [gauche, droite] —, tel que
// les planches de l'auteur le montrent, dans leur ordre.
//
// Sa règle : les 10', 20', 30' et l'Ouverture à gauche ; les 40', 50', 60' et
// la Fin à droite ; deux icônes dominantes différentes sur une carte, jamais
// deux plans de mort. Plusieurs Gros Plans sont imprimés plus d'une fois : le
// Raccord HUIT fois (quatre à gauche, quatre à droite), l'Ouverture et la Fin
// deux fois, et les Gros Plans sans minutage GP01 à GP09 deux fois — une fois
// en moitié gauche, une fois en moitié droite. Le GP00 ne l'est qu'une fois.
const ASSEMBLAGE_41 = [
  [1, 65], [32, 1], [2, 64], [20, 2],
  [3, 43], [30, 3], [4, 55], [26, 4],
  [5, 54], [34, 5], [6, 45], [21, 6],
  [7, 63], [13, 7], [8, 61], [22, 8],
  [9, 62], [25, 9], [0, 52], [15, 42],
  [31, 60], [14, 56], [35, 46], [16, 66],
  [101, 40], [101, 51], [33, 102], [24, 102],
  [100, 50], [100, 44], [100, 41], [100, 53],
  [23, 100], [12, 100], [11, 100], [10, 100],
];

const BOITE = {
  scenes: GP_41.map((p) => S(p.n + 1, p.tc, famille41(p), p.n, p.el, p.obj, {
    ...(p.mort ? { mort: true } : {}),
    ...(p.transition ? { transition: p.transition, titre: p.titre } : {}) })),
  paires: ASSEMBLAGE_41,
  larges: PLANS_41.filter((p) => !PD41.includes(p.num)),
  departs: PLANS_41.filter((p) => PD41.includes(p.num)).map((p) => ({ ...p, depart: true })),
  // L'illustration seule de chaque carte — la case du dessin —, pour le jour où
  // un plan retouché doit être recomposé par le site.
  images: {
    ...Object.fromEntries(PLANS_41.map((p) => [`pl${p.num}`, `assets/s41/illus/L${p.num}.webp`])),
    ...Object.fromEntries(GP_41.map((p) => [`gp${p.n}`, `assets/s41/illus/${fichierGP41(p.n)}.webp`])),
  },
  // La carte elle-même, telle que l'auteur l'a livrée.
  faces: {
    ...Object.fromEntries(PLANS_41.map((p) => [cleplan(p.num), { visuel: `assets/s41/L${p.num}.webp` }])),
    ...Object.fromEntries(GP_41.map((p) => [cleplan(p.n, true), { visuel: `assets/s41/${fichierGP41(p.n)}.webp` }])),
  },
};

const T = () => BOITE;

/** Le format des cartes, en millimètres : la carte entière, et sa moitié Gros Plan. */
export const FORMAT_CARTE = { largeur: 120, hauteur: 80, gp: 60 };
/** Le dossier des icônes. */
export const dossierIcones = () => 'assets/icones';
/** Le nom imprimé d'un plan : « L5 », « GP07 ». */
export const etiquettePlan = (p) => (p.format === 'GP' ? `GP${String(p.num).padStart(2, '0')}` : `L${p.num}`);


/** Les valeurs imprimées d'un plan, face comprise. */
function imprimeDe(cle, defauts) {
  const f = T().faces && T().faces[cle];
  return f ? { ...defauts, ...f } : defauts;
}

/** Ce que porte la boîte : ses cartes et ses plans. */
export function contenuBoite() {
  const t = T();
  const d = t.departs.length;
  return {
    cartes: t.paires.length + t.larges.length + (d * (d - 1)) / 2,
    plans: t.scenes.length + t.larges.length + d,
  };
}

export const SURCHARGES = {
  plans: {}, paires: {}, desactives: new Set(),
  // `ajouts` porte les cartes que l'éditeur a créées, `retires` celles qu'il a
  // supprimées. Ce ne sont pas des retouches de carte mais la **composition du
  // matériel** : elles valent donc pour les deux jeux, imprimé compris — une
  // carte qui n'existe pas dans la boîte n'existe pas non plus dans l'origine.
  ajouts: { scenes: [], larges: [], departs: [], paires: [] },
  retires: new Set(),
};

export const AJOUTS_VIDES = () => ({ scenes: [], larges: [], departs: [], paires: [] });

/**
 * Remplace la couche de surcharge. `table` nul = on joue le matériel imprimé.
 * Les cartes écartées, elles, valent dans les deux jeux : c'est la composition
 * de la boîte, pas une retouche de carte. Il en va de même des cartes créées et
 * supprimées, qui voyagent donc avec `table` mais s'appliquent toujours.
 */
export function appliquerMateriel(table, desactives, composition) {
  for (const k of Object.keys(SURCHARGES.plans)) delete SURCHARGES.plans[k];
  for (const k of Object.keys(SURCHARGES.paires)) delete SURCHARGES.paires[k];
  Object.assign(SURCHARGES.plans, (table && table.plans) || {});
  Object.assign(SURCHARGES.paires, (table && table.paires) || {});
  SURCHARGES.desactives = new Set(desactives || []);
  // La composition survit au passage de l'un à l'autre jeu : `table` peut être
  // nulle — c'est alors l'imprimé qu'on lit — sans que les cartes créées
  // disparaissent de la boîte.
  const c = composition || table || {};
  SURCHARGES.ajouts = { ...AJOUTS_VIDES(), ...(c.ajouts || {}) };
  SURCHARGES.retires = new Set(c.retires || []);
}

const sur = (cle) => SURCHARGES.plans[cle] || null;

export function tcDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.tc === undefined || s.tc === null || s.tc === '' ? defaut : Number(s.tc);
}

export function elDe(cle, defaut) {
  const s = sur(cle);
  return (s && Array.isArray(s.el) ? s.el : defaut || []).slice();
}

export function objDe(cle, defaut) {
  const s = sur(cle);
  if (!s || s.obj === undefined) return defaut || null;
  return s.obj ? { ...s.obj } : null;
}

/**
 * Le second pouvoir d'un plan. Une carte peut en porter deux, côte à côte sur
 * le bandeau : ils comptent tous les deux, et s'affichent tous les deux. Rien
 * ne l'impose — la plupart des plans n'en ont qu'un, et beaucoup aucun.
 */
export function obj2De(cle, defaut) {
  const s = sur(cle);
  if (!s || s.obj2 === undefined) return defaut || null;
  return s.obj2 ? { ...s.obj2 } : null;
}

/**
 * Les pouvoirs d'un plan, dans l'ordre où ils se lisent sur le bandeau. Un
 * plan sans pouvoir en rend une liste vide : tout ce qui compte les bandeaux
 * passe par ici plutôt que par `plan.obj`, et n'a rien à savoir de leur nombre.
 */
export function objsDe(plan) {
  if (!plan) return [];
  return [plan.obj, plan.obj2].filter(Boolean);
}

export function mortDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.mort === undefined ? !!defaut : !!s.mort;
}

/**
 * L'illustration d'un plan. Par défaut celle que son numéro imprimé désigne —
 * `assets/gp/317.webp` —, mais n'importe quel visuel de la boîte peut la
 * remplacer : c'est une retouche comme une autre, et deux plans peuvent très
 * bien partager la même image.
 */
export function imageDe(cle, defaut) {
  const s = sur(cle);
  return !s || !s.image ? defaut : s.image;
}

/**
 * L'illustration est-elle retournée ? Un plan peut se lire dans un miroir sans
 * qu'on redessine quoi que ce soit — la silhouette regarde alors de l'autre
 * côté. Cela sert à vérifier un visuel, et à faire deux plans d'un seul dessin.
 * Le minutage, lui, ne se retourne pas : il resterait illisible.
 */
export function miroirDe(cle) {
  const s = sur(cle);
  return !!(s && s.miroir);
}

/**
 * Le recadrage d'une illustration : de combien on zoome dedans (`z`, 1 étant
 * l'image telle qu'elle vient), et de combien on la fait glisser derrière la
 * fenêtre de la carte (`x`, `y`, en pour-cent de cette fenêtre).
 *
 * Les visuels de la boîte sont taillés au format exact de leur emplacement :
 * à z = 1 ils tombent juste, et il n'y a rien à régler. Le recadrage sert à
 * **adapter un autre visuel** — loger une image qui n'a pas la bonne
 * proportion.
 */
export function cadreDe(cle) {
  const s = sur(cle);
  return normaliserCadre(s && s.cadre);
}

/**
 * Le recadrage d'une illustration, tel qu'il se range :
 *   z  le zoom, 1 étant l'image telle que la fenêtre du plan la reçoit
 *   x  la position horizontale du dessin dans sa fenêtre, de 0 à 100 %
 *   y  la position verticale, de même
 *
 * `x` et `y` ne sont pas un décalage mais un **cadrage** : 0 montre le bord
 * gauche (ou haut) du dessin, 100 le bord droit (ou bas), 50 le milieu. C'est
 * ce qui permet de faire glisser une image **sans zoomer** : posée en `cover`,
 * une illustration faite pour un autre cadrage déborde de la fenêtre — un
 * visuel de Plan Large sur un Gros Plan tient près de trois fois la largeur
 * utile —, et l'on choisit alors la part qu'on montre. Une image taillée juste
 * ne déborde pas : il n'y a rien à choisir tant qu'on n'a pas zoomé.
 *
 * 0, 0 est le cadrage d'origine — celui que la carte a toujours eu, coin haut
 * gauche —, si bien qu'un cadre neutre ne change rien et se dit `null`.
 */
export function normaliserCadre(c) {
  if (!c) return null;
  const z = Math.max(0.5, Math.min(4, Math.round((Number(c.z) || 1) * 100) / 100));
  const pos = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  // Avant la v1.80, `x` et `y` étaient un décalage en pour-cent de la fenêtre,
  // et l'on ne pouvait glisser qu'en ayant zoomé : le décalage valait alors
  // exactement (0,5 − position) × (z − 1) × 100. La conversion est donc exacte,
  // et un recadrage réglé hier retrouve le cadrage qu'on lui avait donné.
  const depuisDecalage = (v) => (z === 1 ? 0 : pos((0.5 - (Number(v) || 0) / ((z - 1) * 100)) * 100));
  const x = c.v === 2 ? pos(c.x) : depuisDecalage(c.x);
  const y = c.v === 2 ? pos(c.y) : depuisDecalage(c.y);
  return z === 1 && !x && !y ? null : { v: 2, z, x, y };
}

/**
 * De combien l'illustration peut voyager dans sa fenêtre, en pour-cent de
 * celle-ci, sur chaque axe — zéro voulant dire qu'elle n'a aucun jeu.
 *
 * L'illustration est posée en `cover` : agrandie jusqu'à remplir la fenêtre,
 * elle **déborde d'un seul côté**, celui où elle est la plus généreuse. C'est
 * ce débordement qui donne le jeu ; le zoom en ajoute sur les deux axes.
 *
 * Cela ne borne rien — le cadrage va toujours de 0 à 100 et ne découvre jamais
 * un bord. Cela sert à le **dire** : quelles flèches ont un effet, et combien
 * de marge il reste à parcourir.
 */
export function bornesCadre(boite, image, z = 1) {
  if (!boite || !image || !boite.w || !boite.h || !image.w || !image.h) return { x: 0, y: 0 };
  const cadre = boite.w / boite.h;
  const dessin = image.w / image.h;
  const jeu = (o) => Math.max(0, Math.round((((1 + o) * z - 1) / 2) * 100));
  return {
    x: jeu(dessin > cadre ? dessin / cadre - 1 : 0),
    y: jeu(dessin < cadre ? cadre / dessin - 1 : 0),
  };
}

/**
 * La transformation à poser sur la couche d'illustration : le zoom, ancré sur
 * le point de cadrage pour qu'il ne saute pas, et le miroir.
 *
 * Le zoom est pris **au centre** puis rattrapé par un déplacement, plutôt que
 * pris sur le point de cadrage : les deux reviennent au même à l'écran, mais
 * un `transform-origin` mobile se combinerait mal avec le miroir, qui a besoin
 * du centre pour retomber sur la fenêtre. Ainsi la couche recouvre **toujours**
 * la fenêtre, quel que soit le cadrage — c'est démontrable et c'est vérifié.
 */
export function transformeCadre(cadre, miroir) {
  const t = [];
  if (cadre && (cadre.z !== 1 || cadre.x || cadre.y)) {
    const { z } = cadre;
    // Le rattrapage : nul à z = 1, où seul le cadrage du fond joue.
    const dec = (p) => Math.round((p / 100 - 0.5) * (1 - z) * 10000) / 100;
    // Sur une image retournée, la droite est à gauche : le rattrapage suit.
    const tx = dec(cadre.x) * (miroir ? -1 : 1);
    const ty = dec(cadre.y);
    if (tx || ty) t.push(`translate(${tx}%, ${ty}%)`);
    if (z !== 1) t.push(`scale(${z})`);
  }
  if (miroir) t.push('scaleX(-1)');
  return t.join(' ');
}

/** Le recadrage tel qu'il s'écrit dans une colonne de tableur : « 1.5|-10|4 ». */
export function cadreTexte(c) {
  return c ? `${c.z}|${c.x}|${c.y}` : '';
}

export function cadreDepuisTexte(t) {
  const m = String(t || '').split('|');
  // Le tableur écrit toujours la forme en vigueur : pas de conversion à faire.
  return m.length === 3 ? normaliserCadre({ v: 2, z: parseFloat(m[0]), x: m[1], y: m[2] }) : null;
}

/**
 * Le numéro affiché d'un plan. Ce n'est qu'une étiquette : l'identité d'un
 * plan reste son numéro imprimé, qui sert de clé et désigne son illustration.
 * Renuméroter ne casse donc aucun appariement — et deux plans peuvent porter
 * le même numéro, l'éditeur se contentant de le signaler.
 */
export function numDe(cle, defaut) {
  const s = sur(cle);
  return !s || s.num === undefined || s.num === null || s.num === '' ? defaut : Number(s.num);
}

/** L'appariement d'une carte double : imprimé, ou celui qu'on lui a donné. */
export function paireDe(i, defaut) {
  const p = SURCHARGES.paires[i];
  return Array.isArray(p) && p.length === 2 ? p : defaut;
}

/** Un plan a-t-il été retouché ? */
export function planModifie(cle) {
  const s = sur(cle);
  return !!s && Object.keys(s).length > 0;
}

/**
 * Un plan **créé** n'a pas de visuel imprimé : son numéro ne désigne aucun
 * fichier d'assets. Sa case d'illustration part donc vide, et se remplit au
 * sélecteur d'images.
 */
export function imageImprimee(dossier, origine) {
  return T().images[`${dossier}${origine}`] || '';
}

/**
 * La VRAIE carte d'un plan de la boîte — l'image livrée par l'auteur —, que le
 * plan ait été retouché ou non. C'est elle que le Matériel met à côté de ce que
 * le moteur en lit, pour vérifier la lecture. Un plan créé n'en a pas.
 */
export function visuelImprime(cle) {
  const f = T().faces && T().faces[cle];
  return (f && f.visuel) || '';
}

/**
 * Combien de fois la boîte imprime chaque Gros Plan, par numéro : huit pour le
 * Raccord, deux pour l'Ouverture, la Fin et les « -- » GP01 à GP09, un pour les
 * autres. C'est la référence du relevé de l'Assemblage — un Gros Plan posé plus
 * souvent que la boîte ne l'imprime est en trop.
 */
export function exemplairesBoite() {
  const n = new Map();
  for (const [g, d] of T().paires) for (const x of [g, d]) if (x != null) n.set(x, (n.get(x) || 0) + 1);
  return n;
}

export function carteActive(id) {
  return !SURCHARGES.desactives.has(id);
}

// --- Accès aux plans d'une carte ----------------------------------------------

/**
 * Un Gros Plan, tel qu'il se pose : minutage, icônes, pouvoir. `moitie` dit de
 * quel côté de sa carte il est imprimé — « G » ou « D » —, et c'est ce qui
 * décide de quel côté d'une séquence il peut se poser.
 */
export function halfInfo(sceneIdx, moitie = null) {
  const s = sceneDe(sceneIdx);
  if (!s) return null;
  // Le numéro de la boîte est l'identité du plan : il fait la clé et désigne
  // son image. `num` n'est que l'étiquette, renumérotable.
  const origine = s.num;
  const cle = cleplan(origine, true);
  const d = imprimeDe(cle, { tc: s.tc, el: s.el, obj: s.obj, obj2: s.obj2, mort: s.mort,
    image: imageImprimee('gp', origine), transition: s.transition || null, titre: s.titre || null });
  return {
    scene: s.idx,
    format: 'GP',
    moitie,
    cle,
    transition: d.transition || null,
    titre: d.titre || null,
    famille: s.famille,
    tc: tcDe(cle, d.tc),
    el: elDe(cle, d.el),
    obj: objDe(cle, d.obj),
    obj2: obj2De(cle, d.obj2),
    mort: mortDe(cle, d.mort),
    num: numDe(cle, origine),
    numOrigine: origine,
    image: imageDe(cle, d.image),
    // La vraie carte ne vaut que pour le plan tel qu'il est dans la boîte : une
    // retouche la rendrait fausse, et l'on revient alors à la composition.
    visuel: d.visuel && !planModifie(cle) ? d.visuel : null,
    miroir: miroirDe(cle),
    cadre: cadreDe(cle),
  };
}

/** Les deux Gros Plans d'une carte : sa moitié gauche et sa moitié droite. */
export function moitiesDe(carte) {
  return {
    G: carte.gScene === undefined ? null : halfInfo(carte.gScene, 'G'),
    D: carte.dScene === undefined ? null : halfInfo(carte.dScene, 'D'),
  };
}

/** Un Plan Large — ou une face de carte de départ — : un seul plan, pleine carte. */
export function plHalf(carte) {
  const cle = cleplan(carte.num);
  const d = imprimeDe(cle, { tc: carte.tc, el: carte.el, obj: carte.obj, obj2: carte.obj2,
    mort: !!carte.mort, image: imageImprimee('pl', carte.num) });
  return {
    scene: null,
    format: carte.depart ? 'DEP' : 'PL',
    moitie: 'PL',
    cle,
    transition: null,
    titre: null,
    famille: carte.depart ? 'DÉPART' : 'PLAN LARGE',
    tc: tcDe(cle, d.tc),
    el: elDe(cle, d.el),
    obj: objDe(cle, d.obj),
    obj2: obj2De(cle, d.obj2),
    mort: mortDe(cle, d.mort),
    num: numDe(cle, carte.num),
    numOrigine: carte.num,
    depart: !!carte.depart,
    image: imageDe(cle, d.image),
    visuel: d.visuel && !planModifie(cle) ? d.visuel : null,
    miroir: miroirDe(cle),
    cadre: cadreDe(cle),
  };
}

// --- Catalogue des plans ---------------------------------------------------
// La liste complète de ce qui est éditable : chaque Gros Plan, chaque Plan
// Large, chaque plan de départ.

export function catalogue() {
  const out = [];
  const pousse = (origine, brut, format, famille, extra = {}) => {
    const cle = cleplan(origine, format === 'GP');
    const num = numDe(cle, origine);
    const defauts = imprimeDe(cle, { ...brut, image: imageImprimee(format === 'GP' ? 'gp' : 'pl', origine) });
    const imprimee = defauts.image;
    out.push({
      cle, num, numOrigine: origine, format, famille,
      quoi: `${FORMATS[format].label} ${num}`,
      tc: tcDe(cle, defauts.tc), el: elDe(cle, defauts.el), obj: objDe(cle, defauts.obj),
      obj2: obj2De(cle, defauts.obj2),
      mort: mortDe(cle, defauts.mort), modifie: planModifie(cle),
      imprime: {
        tc: defauts.tc, el: (defauts.el || []).slice(), obj: defauts.obj || null,
        obj2: defauts.obj2 || null, mort: !!defauts.mort, num: origine, image: imprimee,
        miroir: false, cadre: null,
      },
      image: imageDe(cle, imprimee),
      miroir: miroirDe(cle),
      cadre: cadreDe(cle),
      ...extra,
    });
  };

  for (const s of SCENES()) {
    pousse(s.num, { tc: s.tc, el: s.el, obj: s.obj, obj2: s.obj2, mort: s.mort },
      'GP', s.famille, { scene: s.idx, titre: s.titre || null, transition: s.transition || null });
  }
  for (const p of PLANS_LARGES()) {
    pousse(p.num, { tc: p.tc, el: p.el, obj: p.obj, obj2: p.obj2, mort: !!p.mort }, 'PL', 'PLAN LARGE');
  }
  for (const p of DEPARTS()) {
    pousse(p.num, { tc: p.tc, el: p.el, obj: p.obj, obj2: p.obj2, mort: !!p.mort }, 'DEP', 'DÉPART');
  }
  return out;
}

/** Le plan d'une clé donnée, tel qu'il est actuellement. */
export function planDeCle(cle) {
  return catalogue().find((p) => p.cle === cle) || null;
}

/**
 * Les Gros Plans que l'Assemblage peut poser sur une carte. La valeur reste le
 * numéro de la boîte — c'est lui qui identifie le plan —, seule l'étiquette
 * suit une éventuelle renumérotation.
 */
export function grosPlansDisponibles() {
  return SCENES().map((s) => ({
    num: s.num,
    affiche: numDe(cleplan(s.num, true), s.num),
    scene: s.idx,
    famille: s.famille,
    tc: tcDe(cleplan(s.num, true), s.tc),
    titre: s.titre || null,
  }));
}

/**
 * Les numéros portés par plus d'un plan d'un même cadrage. Les Plans Larges et
 * les Gros Plans se numérotent à part — un L5 et un GP05 ne se confondent pas.
 */
export function doublonsNumeros() {
  const par = new Map();
  for (const p of catalogue()) {
    const k = `${p.format === 'GP' ? 'G' : 'L'}${p.num}`;
    if (!par.has(k)) par.set(k, { num: p.num, plans: new Set() });
    par.get(k).plans.add(`${p.format}${p.numOrigine}`);
  }
  return [...par.values()]
    .filter((x) => x.plans.size > 1)
    .map((x) => ({ num: x.num, plans: [...x.plans].sort() }))
    .sort((a, b) => a.num - b.num);
}
