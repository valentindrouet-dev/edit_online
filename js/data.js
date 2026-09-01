// ---------------------------------------------------------------------------
// EDIT — matériel de jeu (règles v0.13)
// ---------------------------------------------------------------------------
// Relu depuis les PDF de cartes (PLANS_LARGES, PLANS_MOYENS, GROS_PLANS) et le
// tableau de répartition EDIT_44_cartes_v29.

// --- Les six éléments ------------------------------------------------------
// Trois personnages (Héroïne, Ennemi, Allié) et trois éléments (Arme, Objet,
// Véhicule).

export const ELEMENTS = {
  HEROINE:  { id: 'HEROINE',  label: 'Héroïne',  famille: 'PERSONNAGE', color: '#2f8f1f', ring: '#8ede4e' },
  ENNEMI:   { id: 'ENNEMI',   label: 'Ennemi',   famille: 'PERSONNAGE', color: '#a51f1f', ring: '#ef4444' },
  ALLIE:    { id: 'ALLIE',    label: 'Allié',    famille: 'PERSONNAGE', color: '#1b4f80', ring: '#5aa9e6' },
  OBJET:    { id: 'OBJET',    label: 'Objet',    famille: 'ELEMENT',    color: '#d19100', ring: '#ffd75e' },
  ARME:     { id: 'ARME',     label: 'Arme',     famille: 'ELEMENT',    color: '#63696f', ring: '#c3c9d1' },
  VEHICULE: { id: 'VEHICULE', label: 'Véhicule', famille: 'ELEMENT',    color: '#9c6b32', ring: '#dda45f' },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS);

/**
 * L'encre d'un élément : sa couleur propre, assez foncée pour rester lisible
 * sur n'importe quel fond de bandeau — le vert du Plan Large, l'orange du Plan
 * Moyen, le rouge du Gros Plan, le gris du Raccord. Elle sert aux flèches de
 * portée, qui prennent la couleur de ce qu'elles entourent.
 */
export const ENCRES = {
  HEROINE: '#14520d', ENNEMI: '#6e1010', ALLIE: '#0e3454',
  OBJET: '#7d5400', ARME: '#31363c', VEHICULE: '#5f3c18',
  MORT: '#141418', NEANT: '#26262e',
};

// Les cadrages, assombris de la même façon. Cette encre sert aussi au libellé
// du bas d'un plan, qui s'écrit désormais sur la carte et non plus sur une
// bande noire : la couleur vive du cadrage y manquerait de contraste.
export const ENCRES_FORMAT = { PL: '#2b6210', PM: '#7d5400', GP: '#8a330d', DEP: '#1e4b62', TR: '#31363c' };

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
  if (!o) return ENCRES.NEANT;
  switch (o.kind) {
    case 'ELEMENT': case 'ABSENT': return ENCRES[o.el] || ENCRES.NEANT;
    case 'PAIRE':   return ENCRES[o.els[0]] || ENCRES.NEANT;
    case 'MORT':    return ENCRES.MORT;
    case 'NEANT':   return ENCRES.NEANT;
    case 'FORMAT':  return ENCRES_FORMAT[o.format] || ENCRES.NEANT;
    // Les pouvoirs du vocabulaire commun prennent la teinte de leur cible :
    // une icône a la sienne, un cadrage la sienne, le reste reste neutre.
    case 'AILLEURS': case 'CENTRE': case 'LOT': case 'SEUIL':
      return ENCRES[o.cible] || ENCRES_FORMAT[o.cible] || ENCRES.NEANT;
    default:        return ENCRES.NEANT;
  }
}
export const PERSONNAGES = ELEMENT_IDS.filter((e) => ELEMENTS[e].famille === 'PERSONNAGE');

// --- Cadrages --------------------------------------------------------------

export const FORMATS = {
  PL: { id: 'PL', label: 'Plan Large',     short: 'PL',  color: '#5aa32b', tint: '#dff0c8' },
  PM: { id: 'PM', label: 'Plan Moyen',     short: 'PM',  color: '#e0a11b', tint: '#fdeec4' },
  GP: { id: 'GP', label: 'Gros Plan',      short: 'GP',  color: '#e8632a', tint: '#fbdac9' },
  DEP: { id: 'DEP', label: 'Plan de départ', short: 'DÉP', color: '#3f8fbf', tint: '#d8ecf7' },
  TR: { id: 'TR', label: 'Raccord',        short: 'TR',  color: '#7b7f86', tint: '#e4e6e9' },
};

// Un Plan de départ est un plan comme un autre pour tout ce qui compte des
// cartes — mais ce n'est pas un Plan Large : « n × Plan Large » ne le compte
// pas. Les cadrages qu'un bandeau de séquence peut viser :
export const CADRAGES_VISABLES = ['PL', 'PM', 'GP'];

// Le bandeau « n × Cadrage », lui, peut viser le Plan de départ : il le
// **nomme**, il ne le confond pas avec un Plan Large. C'est ce qui permet
// d'écrire « n × Plan Large & Plan de départ » — deux cadrages désignés.
export const CADRAGES_POUVOIR = ['PL', 'PM', 'GP', 'DEP'];

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
//   NEANT     n points par plan sans aucun personnage
//   ABSENT    n points si l'élément visé n'apparaît nulle part
//   MINUTAGE  n points par plan du montage dont le minutage est strictement
//             avant (ou après) le seuil visé
//   CHRONO    n points si le montage se lit dans l'ordre : chaque minutage
//             est supérieur ou égal à celui de son voisin de gauche
//   SANS_TC   n points si aucun plan du montage n'a le minutage visé : égal au
//             seuil (00:00 pour les Raccords et Génériques), ou strictement
//             avant, ou strictement après
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
export const PORTEES = [
  { id: 'AVANT',    label: 'avant elle dans sa ligne', court: 'avant',   gauche: true,  droite: false },
  { id: 'APRES',    label: 'après elle dans sa ligne', court: 'après',   gauche: false, droite: true },
  { id: 'SEQUENCE', label: 'dans toute sa ligne',      court: 'séquence', gauche: true,  droite: true },
  { id: 'MONTAGE',  label: 'dans le montage entier',   court: 'montage', gauche: false, droite: false },
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
  neant:   (n, portee) => ({ kind: 'NEANT', n, ...(portee ? { portee } : {}) }),
  // « n si CIBLE est absente ». La cible n'est plus une icône seulement : une
  // valeur de cadre, une Carte Raccord, un plan de mort peuvent manquer aussi.
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
  // `seuil` : combien de plans porteurs la séquence doit compter — « au moins
  // 3 plans Arme ». Un seuil de 1 est le cas ordinaire et ne s'écrit pas, pour
  // qu'un bandeau sans seuil reste identique à ce qui est imprimé.
  seqAvec:     (n, sens, cible, seuil) => ({ kind: 'SEQ_AVEC', n, sens, cible,
    ...(seuil > 1 ? { seuil: Math.min(20, Math.floor(seuil)) } : {}) }),

  // --- Les pouvoirs du vocabulaire commun ----------------------------------
  // Tous prennent une `cible` prise dans CIBLES_COMPTE ; ce qu'ils en font
  // change d'un pouvoir à l'autre. Les deux premiers portent leur propre
  // portée dans leur définition même — les autres séquences, un côté du
  // centre —, les autres se règlent librement.

  // Ce que les AUTRES séquences portent. `sens` : DESSUS — celles posées
  // au-dessus de la sienne ; DESSOUS — celles d'en dessous ; AUTRES — les
  // deux à la fois, c'est-à-dire tout le banc sauf sa propre ligne.
  ailleurs: (n, cible, sens) => ({ kind: 'AILLEURS', n, cible, sens: sens || 'AUTRES' }),

  // De quel côté du CENTRE de sa ligne. Le centre est l'ancre — le plan qui a
  // ouvert la séquence, celui sur lequel elle est alignée ; il n'appartient à
  // aucun des deux côtés. `sens` : GAUCHE | DROITE.
  centre: (n, cible, sens) => ({ kind: 'CENTRE', n, cible, sens: sens === 'DROITE' ? 'DROITE' : 'GAUCHE' }),

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
  piocher: (cible) => ({ kind: 'PIOCHER', n: 0, cible: cible === 'PL' ? 'PL' : 'PMGP' }),
  // Une ligne de plus que les cinq de la règle, ou un plan de plus que les dix.
  // `n` n'est pas un nombre de points mais un nombre de lignes, ou de plans.
  sequencePlus: (n) => ({ kind: 'SEQ_PLUS', n: Math.max(1, Math.min(9, Math.floor(n || 1))) }),
  planPlus: (n) => ({ kind: 'PLAN_PLUS', n: Math.max(1, Math.min(9, Math.floor(n || 1))) }),
  // Ce que chaque Carte Raccord du montage vaut à sa porteuse, à la place de ce
  // que la variable de partie lui ferait valoir. `n` est ce montant — positif
  // ou négatif : c'est un remplacement, pas un ajout.
  raccordVaut: (n) => ({ kind: 'RACCORD_VAUT',
    n: Math.max(-20, Math.min(20, Math.floor(n === undefined ? 2 : n))) }),
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
 * `RACCORD_VAUT` n'en est pas : il dit ce que valent les Cartes Raccord du
 * montage, et ce qu'elles valent alors se compte sur lui.
 */
export const KINDS_SANS_POINTS = ['PIOCHER', 'SEQ_PLUS', 'PLAN_PLUS'];

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
export const KINDS_PORTEE_FIXE = ['CHRONO', 'AILLEURS', 'CENTRE', ...KINDS_SEQUENCE, ...KINDS_REGLE];

/** Ce bandeau-là laisse-t-il choisir sa portée ? */
export const porteeReglable = (o) => !!o && !KINDS_PORTEE_FIXE.includes(o.kind);

/** Pourquoi la portée de ce bandeau ne se règle pas. */
export function porteeFigee(o) {
  if (!o) return '';
  if (o.kind === 'CHRONO') return '« Dans l’ordre » se lit toujours sur le montage entier.';
  if (o.kind === 'AILLEURS') return 'Ce bandeau dit lui-même où il compte : dans les autres séquences.';
  if (o.kind === 'CENTRE') return 'Ce bandeau dit lui-même où il compte : d’un côté du centre de sa ligne.';
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
//   VALEUR  la **valeur de cadre**, le mot de cinéma pour le cadrage, et l'on
//           compte celles qui sont DIFFÉRENTES : une ligne qui alterne Plan
//           Large, Plan Moyen et Gros Plan en montre trois, quel que soit le
//           nombre de cartes. Un cadrage nommé — « Gros Plan » — se vise
//           directement, sans passer par là
// et une dernière ne regarde pas la portée mais la forme du banc :
//   SEQUENCE  le nombre de séquences du montage
// `label` nomme la cible dans une liste déroulante, où il faut lever toute
// ambiguïté ; `court` la nomme dans une phrase, où la parenthèse pèserait. `f`
// marque le féminin, pour que « aucune Valeur » s'accorde.
const PLURIELS_CADRAGE = { PL: 'Plans Larges', PM: 'Plans Moyens', GP: 'Gros Plans', DEP: 'Plans de départ' };

export const CIBLES_COMPTE = [
  { id: 'CARTE',    label: 'Carte (Raccords compris)', court: 'Carte',   pl: 'Cartes', f: true },
  { id: 'PLAN',     label: 'Plan (hors Raccord)',      court: 'Plan',    pl: 'Plans' },
  { id: 'RACCORD',  label: 'Carte Raccord',            court: 'Raccord', pl: 'Raccords' },
  { id: 'MORT',     label: 'Plan de mort',             court: 'Plan de mort', pl: 'Plans de mort' },
  { id: 'NEANT',    label: 'Plan sans personnage',     court: 'Plan sans personnage',
    pl: 'Plans sans personnage' },
  ...CADRAGES_POUVOIR.map((f) => ({ id: f, label: FORMATS[f].label, court: FORMATS[f].label,
    pl: PLURIELS_CADRAGE[f] })),
  ...ELEMENT_IDS.map((e) => ({ id: e, label: ELEMENTS[e].label, court: ELEMENTS[e].label,
    pl: `${ELEMENTS[e].label}s`, f: e === 'HEROINE' || e === 'ARME' })),
  { id: 'ICONE',    label: 'Icône (toutes confondues)', court: 'icône',    pl: 'icônes', f: true },
  { id: 'VALEUR',   label: 'Valeur de cadre (cadrage différent)',
    court: 'valeur de cadre', pl: 'valeurs de cadre', f: true },
  { id: 'SEQUENCE', label: 'Séquence du banc',          court: 'séquence', pl: 'séquences', f: true },
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
    { id: 'RACCORD', label: 'Carte Raccord' },
  ];
}

/** Le libellé d'une cible de séquence — icône, cadrage ou Raccord. */
export function libelleCible(cible) {
  if (cible === 'RACCORD') return 'Carte Raccord';
  if (FORMATS[cible]) return FORMATS[cible].label;
  return ELEMENTS[cible] ? ELEMENTS[cible].label : cible;
}

// Trois minutages ne se lisent pas comme les autres, et l'afficheur le dit.
//
// **00:00** n'est pas un instant du film : c'est l'absence de minutage. Les
// Raccords et les Génériques relient sans rien raconter, et les six scènes de
// PERSONNAGE se placent où l'on veut. Écrit « 00:00 », ce vide passait pour un
// instant très précoce — donc pour le tout début du film, avant l'Ouverture. Il
// s'écrit donc « --:-- » : un afficheur qui n'affiche rien.
//
// **01:00** et **99:00** sont, eux, des instants — le premier et le dernier
// plan du film. Ils gardent leur écriture et prennent leur propre couleur.
export const TC_VIDE = 0;
export const TC_PREMIER = 1;
export const TC_DERNIER = 99;

/** « 25:00 », en toutes lettres d'afficheur — et « --:-- » pour l'absence. */
export function tcTexte(min) {
  if (Math.floor(min) === TC_VIDE) return '--:--';
  return `${String(Math.floor(min)).padStart(2, '0')}:00`;
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
    case 'NEANT':   return 'Plan sans personnage';
    case 'MINUTAGE': return `Plan ${o.sens === 'APRES' ? 'après' : 'avant'} ${tcTexte(o.seuil)}`;
    case 'SEQ_TAILLE': return `séquence de ${o.seuil} plan${o.seuil > 1 ? 's' : ''} ou ${o.sens === 'MAX' ? 'moins' : 'plus'}`;
    case 'SEQ_VOISINES': return `séquence ${o.sens === 'APRES' ? 'en dessous' : 'au-dessus'} de celle-ci`;
    case 'SEQ_LONGUE': return 'Plan de votre plus longue séquence';
    case 'SEQ_AVEC': {
      // Sans seuil, la lecture d'origine : « avec » ou « sans ». Avec un seuil,
      // c'est un compte de plans porteurs — et « sans » devient « moins de ».
      const k = Math.max(1, o.seuil || 1);
      if (k > 1) {
        return `séquence avec ${o.sens === 'SANS' ? 'moins de' : 'au moins'} ${k} × ${libelleCible(o.cible)}`;
      }
      return `séquence ${o.sens === 'SANS' ? 'sans' : 'avec'} ${libelleCible(o.cible)}`;
    }
    // --- Les pouvoirs du vocabulaire commun --------------------------------
    case 'AILLEURS': return `${libelleCibleCompte(o.cible)} ${
      o.sens === 'DESSUS' ? 'dans les séquences au-dessus de la sienne'
        : o.sens === 'DESSOUS' ? 'dans les séquences en dessous de la sienne'
          : 'dans les autres séquences'}`;
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

export function objLabel(o, cfg) {
  if (!o) return '';
  const p = PORTEES.find((x) => x.id === objPortee(o, cfg)) || PORTEES[3];
  const ou = p.id === 'MONTAGE' ? '' : ` ${p.label}`;
  switch (o.kind) {
    // --- Les pouvoirs de règle : une phrase, pas un compte ------------------
    case 'PIOCHER': return `Vous pouvez piocher sur la pioche ${
      o.cible === 'PL' ? 'Plans Larges' : 'PM / GP'}`;
    case 'SEQ_PLUS': return `Vous pouvez monter ${o.n} séquence${
      o.n > 1 ? 's' : ''} supplémentaire${o.n > 1 ? 's' : ''}${
      cfg && cfg.sequencesMax > 0 ? ` (${cfg.sequencesMax + o.n})` : ''}`;
    case 'PLAN_PLUS': return `Vous pouvez monter ${o.n} Plan${
      o.n > 1 ? 's' : ''} supplémentaire${o.n > 1 ? 's' : ''}${
      cfg && cfg.tours ? ` (${cfg.tours + o.n})` : ''}`;
    case 'RACCORD_VAUT': {
      const signe = (v) => (v > 0 ? `+${v}` : `${v}`);
      const base = cfg ? cfg.pointsParRaccord : undefined;
      return `Les Raccords vous rapportent ${signe(o.n)}${
        base !== undefined && base !== o.n ? ` au lieu de ${signe(base)}` : ''}`;
    }
    case 'ABSENT': {
      const c = cibleDe(o);
      return `${o.n} si ${libelleCibleCompte(c)} est absent${accordCible(c)}${ou}`;
    }
    case 'DOMINE': {
      // Un cadrage est masculin, une icône féminine : l'article, l'adverbe et
      // le participe s'accordent ensemble ou la phrase boite.
      const masc = familleDeCible(cibleDe(o)) === 'CADRAGE';
      return `${o.n} si ${libelleCibleCompte(cibleDe(o))} est ${masc ? 'le cadrage' : 'l’icône'} ${
        masc ? 'le' : 'la'} ${o.sens === 'MOINS' ? 'moins' : 'plus'} présent${masc ? '' : 'e'}${
        ou || ' du montage'}`;
    }
    case 'CHRONO':  return `${o.n} si tout est dans l’ordre${ou || ' dans le montage'}`;
    case 'SEUIL': {
      // « Au plus zéro » se dit « aucun » : c'est la lecture qui vient à
      // l'esprit, et celle qu'on écrirait sur la carte.
      const ou2 = o.cible === 'SEQUENCE' ? ' dans le banc' : ou;
      if (o.sens === 'MAX' && o.seuil === 0) return `${o.n} si ${aucunCible(o.cible)}${ou2}`;
      return `${o.n} si ${o.sens === 'MAX' ? 'au plus' : 'au moins'} ${
        cibleNombre(o.cible, o.seuil)}${ou2}`;
    }
    case 'SEQ_TOUTES': return `${o.n} si chaque séquence a ${
      o.sens === 'MAX' ? 'au plus' : 'au moins'} ${o.seuil} plan${o.seuil > 1 ? 's' : ''}`;
    // « Compte double » se dit ainsi, pas « 1 × sa valeur » : c'est la même
    // chose, mais une seule des deux tournures se lit sur une carte.
    case 'DOUBLE': return `${o.sens === 'PLUS' ? 'La plus grosse' : 'La plus petite'} carte${ou} — ${
      CRITERES_DOUBLE[o.critere] || CRITERES_DOUBLE.POINTS} — compte ${
      o.n === 1 ? 'double' : `${o.n + 1} fois`}`;
    case 'SANS_TC': return `${o.n} si aucun plan ${
      o.sens === 'AVANT' ? `avant ${tcTexte(o.seuil)}`
        : o.sens === 'APRES' ? `après ${tcTexte(o.seuil)}`
          : `à ${tcTexte(o.seuil)}`}${ou || ' dans le montage'}`;
    default: return `${o.n} × ${objQuoi(o)}${ou}`;
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

// --- Les 33 scènes ---------------------------------------------------------
// Chaque scène existe en deux cadrages : une moitié PLAN MOYEN (2/3 de carte)
// et une moitié GROS PLAN (1/3). Seule la moitié Gros Plan porte un objectif.
//
// Sauf pour les trois scènes de TRANSITION. Un Raccord, une Ouverture, un
// Générique de fin ne racontent rien : ils n'ont ni icône ni minutage, et leur
// pouvoir est leur seule matière. Le réserver à la moitié Gros Plan revenait à
// laisser la moitié Plan Moyen entièrement vide — un Raccord joué en Plan
// Moyen ne rapportait rien, alors que les règles disent qu'un Raccord rapporte
// un point par carte de sa séquence, quel que soit le bout par lequel on le
// joue. Les deux moitiés d'une transition portent donc le même pouvoir.

const S = (idx, tc, famille, pmNum, gpNum, pmEl, gpEl, obj, extra = {}) => ({
  idx, tc, famille, pmNum, gpNum,
  // Une copie, et non la même référence : deux moitiés qui partageraient leur
  // objectif se retoucheraient l'une l'autre.
  pm: { el: pmEl, ...(famille === 'TRANSITION' && obj ? { obj: { ...obj } } : {}) },
  gp: { el: gpEl, obj },
  ...extra,
});

const SCENES_IMPRIMEES = [
  // Raccords et génériques --------------------------------------------------
  S(1,  99, 'TRANSITION', 292, 392, [], [], OBJ.raccord(2), { titre: 'Fin',          transition: 'CREDITS' }),
  S(2,   1, 'TRANSITION', 291, 391, [], [], OBJ.raccord(2), { titre: 'BBG présente', transition: 'OUVERTURE' }),
  S(3,   0, 'TRANSITION', 290, 390, [], [], OBJ.plan(1),    { titre: 'Raccord',      transition: 'RACCORD' }),

  // Famille MORT ------------------------------------------------------------
  S(4,  94, 'MORT', 207, 307, ['HEROINE', 'ARME'],     ['HEROINE', 'ARME'], OBJ.mort(3),  { mort: true }),
  S(5,  93, 'MORT', 208, 308, ['HEROINE', 'VEHICULE'], ['HEROINE'],         OBJ.neant(3), { mort: true }),
  S(6,  91, 'MORT', 209, 309, ['ENNEMI', 'OBJET'],     ['ENNEMI'],          OBJ.mort(3),  { mort: true }),
  S(7,  80, 'MORT', 210, 310, ['ENNEMI', 'ARME'],      ['ENNEMI'],          OBJ.neant(3), { mort: true }),
  S(8,  69, 'MORT', 211, 311, ['VEHICULE', 'ENNEMI'],  ['VEHICULE'],        OBJ.mort(3),  { mort: true }),
  S(9,  92, 'MORT', 212, 312, ['ALLIE', 'OBJET'],      ['ALLIE'],           OBJ.neant(3), { mort: true }),

  // Famille ARME ------------------------------------------------------------
  S(10, 66, 'ARME', 213, 313, ['HEROINE', 'ARME'], ['HEROINE', 'ARME'], OBJ.absent(5, 'ALLIE')),
  S(11, 79, 'ARME', 214, 314, ['ALLIE', 'ARME'],   ['ALLIE', 'ARME'],   OBJ.raccord(2)),
  S(12, 76, 'ARME', 215, 315, ['HEROINE', 'ARME'], ['ARME'],            OBJ.paire(2, 'ARME', 'ARME')),
  S(13, 78, 'ARME', 216, 316, ['HEROINE', 'ARME'], ['HEROINE', 'ARME'], OBJ.element(1, 'ARME')),
  S(14, 77, 'ARME', 217, 317, ['ENNEMI', 'ARME'],  ['ENNEMI', 'ARME'],  OBJ.format(2, 'PM')),

  // Famille VÉHICULE --------------------------------------------------------
  S(15, 65, 'VEHICULE', 218, 318, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.format(2, 'GP')),
  S(16, 67, 'VEHICULE', 219, 319, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.format(2, 'PM')),
  S(17, 68, 'VEHICULE', 220, 320, ['VEHICULE', 'OBJET'],   ['VEHICULE', 'OBJET'],   OBJ.format(2, 'PL')),
  S(18, 63, 'VEHICULE', 221, 321, ['ALLIE', 'VEHICULE'],   ['ALLIE', 'VEHICULE'],   OBJ.format(2, 'GP')),
  S(19, 64, 'VEHICULE', 222, 322, ['ENNEMI', 'VEHICULE'],  ['ENNEMI', 'VEHICULE'],  OBJ.element(1, 'VEHICULE')),
  S(20, 62, 'VEHICULE', 223, 323, ['HEROINE', 'VEHICULE'], ['HEROINE', 'VEHICULE'], OBJ.raccord(2)),
  S(21, 61, 'VEHICULE', 224, 324, ['VEHICULE'],            ['VEHICULE'],            OBJ.paire(2, 'VEHICULE', 'VEHICULE')),
  S(22, 34, 'VEHICULE', 225, 325, ['ENNEMI', 'VEHICULE'],  ['VEHICULE', 'ENNEMI'],  OBJ.format(2, 'PL')),

  // Famille OBJET -----------------------------------------------------------
  S(23, 31, 'OBJET', 226, 326, ['ALLIE', 'OBJET'],   ['ALLIE', 'OBJET'],   OBJ.paire(2, 'OBJET', 'OBJET')),
  S(24, 33, 'OBJET', 227, 327, ['ENNEMI', 'OBJET'],  ['OBJET', 'ENNEMI'],  OBJ.format(2, 'GP')),
  S(25, 32, 'OBJET', 228, 328, ['HEROINE', 'OBJET'], ['OBJET', 'HEROINE'], OBJ.format(2, 'PL')),
  S(26, 16, 'OBJET', 229, 329, ['OBJET', 'ARME'],    ['ARME', 'OBJET'],    OBJ.element(1, 'OBJET')),
  S(27, 17, 'OBJET', 230, 330, ['ALLIE', 'OBJET'],   ['ALLIE'],            OBJ.format(2, 'PM')),

  // Famille PERSONNAGE (imprimée en trois exemplaires) -----------------------
  S(28, 0, 'PERSONNAGE', 201, 301, ['ENNEMI', 'ALLIE'],   ['ALLIE'],   OBJ.paire(2, 'ENNEMI', 'ALLIE')),
  S(29, 0, 'PERSONNAGE', 202, 302, ['HEROINE', 'ENNEMI'], ['ENNEMI'],  OBJ.paire(2, 'HEROINE', 'ENNEMI')),
  S(30, 0, 'PERSONNAGE', 203, 303, ['ALLIE', 'HEROINE'],  ['HEROINE'], OBJ.paire(2, 'ALLIE', 'HEROINE')),
  S(31, 0, 'PERSONNAGE', 204, 304, ['ALLIE'],             ['ALLIE'],   OBJ.element(1, 'ALLIE')),
  S(32, 0, 'PERSONNAGE', 205, 305, ['ENNEMI'],            ['ENNEMI'],  OBJ.element(1, 'ENNEMI')),
  S(33, 0, 'PERSONNAGE', 206, 306, ['HEROINE'],           ['HEROINE'], OBJ.element(1, 'HEROINE')),
];

// Les scènes en vigueur — imprimées, plus celles que l'éditeur a créées, moins
// celles qu'il a supprimées. `SCENES` était une constante ; c'est désormais une
// question qu'on pose, puisque la réponse change.
export function SCENES() {
  const ajoutees = (SURCHARGES.ajouts.scenes || []).map(hydraterScene);
  const out = [...SCENES_IMPRIMEES, ...ajoutees];
  return SURCHARGES.retires.size
    ? out.filter((s) => !SURCHARGES.retires.has(idScene(s.idx)))
    : out;
}

export const idScene = (idx) => `SC${idx}`;

/** Une scène créée : la même forme que les imprimées, valeurs par défaut comprises. */
function hydraterScene(a) {
  // Une scène de TRANSITION porte son pouvoir sur ses deux moitiés — c'est `S`
  // qui s'en charge, à condition qu'on lui dise la famille et le raccord.
  return S(a.idx, a.tc || 0, a.famille || 'PERSONNAGE', a.pmNum, a.gpNum,
    (a.pmEl || []).slice(), (a.gpEl || []).slice(), a.obj ? { ...a.obj } : null,
    { ...(a.titre ? { titre: a.titre } : {}), ...(a.mort ? { mort: true } : {}),
      ...(a.transition ? { transition: a.transition } : {}), ajoutee: true });
}

export function sceneDe(idx) {
  return SCENES().find((s) => s.idx === idx) || null;
}

/** De quel côté d'une scène vient un numéro de plan. */
function indexScenes() {
  const pm = {}, gp = {};
  for (const s of SCENES()) { pm[s.pmNum] = s.idx; gp[s.gpNum] = s.idx; }
  return { pm, gp };
}

// --- Les 14 Plans Larges ---------------------------------------------------
// `brouillon` marquait les cartes dont le PDF source ne donnait ni illustration
// ni pastilles — les 101 et 102. Elles ont reçu les leurs : plus aucun Plan
// Large n'est un brouillon. Le marqueur reste dans le modèle, avec le réglage
// `retirerBrouillons`, pour la prochaine carte encore à dessiner.

const PL = (num, tc, el, obj, extra = {}) => ({ num, tc, el, obj, ...extra });

const PL_IMPRIMES = [
  PL(101, 15, ['HEROINE', 'ENNEMI', 'OBJET', 'VEHICULE'],  null),
  PL(102, 30, ['OBJET', 'ARME', 'VEHICULE'],               null),
  PL(103, 45, ['ENNEMI', 'ALLIE', 'OBJET', 'VEHICULE'],    OBJ.raccord(2)),
  PL(104, 90, ['HEROINE', 'ALLIE', 'VEHICULE'],            null),
  PL(105, 90, ['HEROINE', 'ENNEMI', 'ALLIE', 'ARME'],      null),
  PL(106, 90, ['HEROINE', 'OBJET', 'VEHICULE'],            null),
  PL(107, 15, ['HEROINE', 'ENNEMI', 'ARME'],               null),
  PL(108, 30, ['ALLIE', 'ENNEMI', 'OBJET'],                null),
  PL(109, 15, ['ALLIE', 'OBJET', 'ARME'],                  null),
  PL(110, 60, ['HEROINE', 'ENNEMI', 'ARME', 'VEHICULE'],   null),
  PL(111, 45, ['HEROINE', 'ALLIE', 'OBJET'],               null),
  PL(112, 75, ['ENNEMI', 'ALLIE', 'OBJET', 'ARME'],        null),
  PL(113, 60, ['HEROINE', 'ENNEMI', 'VEHICULE'],           null),
  PL(114, 75, ['HEROINE', 'ENNEMI', 'ARME'],               null),
];

/** Les Plans Larges en vigueur — imprimés, plus les créés, moins les supprimés. */
export function PLANS_LARGES() {
  const ajoutes = (SURCHARGES.ajouts.larges || []).map((a) => PL(a.num, a.tc || 0,
    (a.el || []).slice(), a.obj ? { ...a.obj } : null, { ajoute: true }));
  const out = [...PL_IMPRIMES, ...ajoutes];
  return SURCHARGES.retires.size ? out.filter((p) => !SURCHARGES.retires.has(`L${p.num}`)) : out;
}

// --- Les Plans de départ ---------------------------------------------------
// 8 cartes, en 2 versions recto-verso : 4 faces distinctes dans le PDF.
// L'appariement recto/verso des deux types est une hypothèse (ordre du PDF).

const DEPARTS_IMPRIMES = [
  { type: 'A', faces: [
    PL(115, 75, ['HEROINE', 'ENNEMI', 'ARME'],            OBJ.format(3, 'PL'), { depart: true }),
    PL(116, 60, ['HEROINE', 'ENNEMI', 'VEHICULE'],        OBJ.format(2, 'PM'), { depart: true }),
  ] },
  { type: 'B', faces: [
    PL(117, 45, ['ENNEMI', 'ALLIE', 'OBJET', 'ARME'],     OBJ.format(2, 'GP'), { depart: true }),
    PL(118, 30, ['HEROINE', 'ALLIE', 'VEHICULE'],         OBJ.plan(1),         { depart: true }),
  ] },
];

/** Les versions de Plan de départ en vigueur. Une version = une carte, deux faces. */
export function DEPARTS() {
  const ajoutes = (SURCHARGES.ajouts.departs || []).map((d) => ({
    type: d.type, ajoutee: true,
    faces: (d.faces || []).map((f) => PL(f.num, f.tc || 0, (f.el || []).slice(),
      f.obj ? { ...f.obj } : null, { depart: true, ajoute: true })),
  }));
  const out = [...DEPARTS_IMPRIMES, ...ajoutes];
  return SURCHARGES.retires.size ? out.filter((d) => !SURCHARGES.retires.has(`S${d.type}`)) : out;
}

// --- Les 50 cartes Plan Moyen / Gros Plan ----------------------------------
// Répartition v0.13. Au recto le Gros Plan à gauche et le Plan Moyen à droite,
// au verso l'inverse — mêmes deux moitiés sur les deux faces.
// `dual` marque la moitié GÉNÉRIQUE à double lecture : Ouverture quand elle
// est à gauche, Crédits quand elle passe à droite.

const PAIRES_IMPRIMEES = [
  [201, 317], [201, 319], [201, 325], [202, 308], [202, 314], [202, 324],
  [203, 315], [203, 320], [203, 327], [204, 310], [204, 391], [204, 326],
  [205, 307], [205, 312], [205, 328], [206, 313], [206, 318], [206, 322],
  [207, 305], [208, 301], [209, 302], [210, 303], [291, 306], [211, 390],
  [212, 305], [213, 306], [214, 302], [215, 390], [216, 306], [217, 301],
  [218, 390], [219, 304], [220, 304], [221, 303], [222, 390], [223, 390],
  [224, 302], [225, 304], [226, 303], [227, 301], [228, 305], [229, 390],
  [230, 391, { dualGP: true }], [290, 309], [290, 311], [290, 316], [290, 323],
  [290, 329], [290, 330], [291, 321, { dualPM: true }],
];

/**
 * Les appariements en vigueur. Les cinquante imprimés gardent leurs rangs 0 à
 * 49 quoi qu'il arrive : c'est par ce rang que les retouches d'appariement sont
 * rangées, et une carte créée ne doit pas les décaler. Les nouvelles se
 * mettent donc à la suite, et une carte supprimée laisse son rang vide plutôt
 * que de faire glisser les autres.
 */
function PAIRES() {
  const ajoutees = (SURCHARGES.ajouts.paires || []).map((p) => [p.pmNum, p.gpNum, { ajoutee: true }]);
  return [...PAIRES_IMPRIMEES, ...ajoutees];
}

export function buildCartesDoubles() {
  const { pm: pmIndex, gp: gpIndex } = indexScenes();
  return PAIRES().map(([pmImp, gpImp, extra], i) => {
    // L'appariement des deux moitiés est lui aussi réglable : c'est la seule
    // façon de changer la répartition des Plans Moyens et des Gros Plans.
    const [pmNum, gpNum] = paireDe(i, [pmImp, gpImp]);
    return {
      id: `D${String(i + 1).padStart(2, '0')}`,
      type: 'DOUBLE',
      rang: i,
      pmScene: pmIndex[pmNum],
      gpScene: gpIndex[gpNum],
      pmNum, gpNum,
      pmImprime: pmImp, gpImprime: gpImp,
      appariementModifie: pmNum !== pmImp || gpNum !== gpImp,
      actif: carteActive(`D${String(i + 1).padStart(2, '0')}`),
      ...(extra || {}),
    };
  }).filter((c) => {
    // Une carte supprimée s'en va ; une carte dont une moitié a disparu avec sa
    // scène s'en va aussi — elle n'a plus rien à montrer.
    if (SURCHARGES.retires.has(c.id)) return false;
    return c.pmScene !== undefined && c.gpScene !== undefined;
  });
}

/**
 * Les Plans Larges de la boîte. `avecDeparts` — la variante « pas de Plans de
 * départ » — y verse les quatre faces de départ : elles perdent leur marque
 * `depart`, et deviennent donc des Plans Larges à part entière, jusqu'à la
 * couleur de leur bandeau et de leur fond. Rien d'autre ne change : même
 * minutage, mêmes icônes, même pouvoir.
 */
export function buildPlansLarges(avecDeparts) {
  const out = PLANS_LARGES().map((p) => ({ id: `L${p.num}`, type: 'PL', actif: carteActive(`L${p.num}`), ...p }));
  if (!avecDeparts) return out;
  for (const d of DEPARTS()) {
    for (const f of d.faces) {
      const { depart, ...reste } = f;
      const id = `S${d.type}f${f.num}`;
      out.push({ id, type: 'PL', actif: carteActive(id), ...reste });
    }
  }
  return out;
}

export function buildDeparts() {
  // Deux exemplaires de chaque version, soit les 8 cartes de la boîte.
  const out = [];
  DEPARTS().forEach((d) => {
    const faces = d.faces.filter((f) => carteActive(`S${d.type}f${f.num}`));
    if (!faces.length) return;
    for (let k = 0; k < 4; k++) {
      out.push({ id: `S${d.type}${k + 1}`, type: 'DEPART', version: d.type, faces });
    }
  });
  return out;
}

// --- Matériel ajustable ----------------------------------------------------
// Rien de ce qui est imprimé sur une carte n'est figé : le minutage, les
// pastilles et le bandeau d'objectif de chaque plan sont des données que
// l'application contrôle, et que l'éditeur de l'écran Matériel remplace plan
// par plan.
//
// Deux jeux de matériel coexistent en permanence — l'IMPRIMÉ, intouchable, et
// le MODIFIÉ, qui porte les retouches. `appliquerMateriel` reçoit le second
// quand c'est lui qu'on joue, et rien quand on joue l'imprimé : les retouches
// ne sont donc jamais perdues, seulement mises de côté.
//
//   plans[clé]  = { tc, el, obj, mort }  — chaque champ absent = valeur imprimée
//   paires[i]   = [pmNum, gpNum]         — l'appariement de la i-ème carte
//   desactives  = [id de carte, …]       — les cartes écartées du paquet
//
// La clé d'un plan est son numéro, suivi de sa face pour les moitiés d'une
// carte Plan Moyen / Gros Plan : « 201R » et « 201V » sont deux plans
// distincts, réglables séparément, car le recto et le verso d'une carte ne
// portent pas le même minutage. Les Plans Larges et les Plans de départ ont un
// vrai dos, donc une seule face : leur clé est leur seul numéro.
//
// Numéros : 101-114 les Plans Larges, 115-118 les Plans de départ, 201-230 et
// 290-292 les Plans Moyens, 301-330 et 390-392 les Gros Plans.

export const FACES = [
  { id: 'R', label: 'Recto', court: 'R' },
  { id: 'V', label: 'Verso', court: 'V' },
];

/** La clé d'un plan : son numéro, plus sa face quand elle en a une. */
export function cleplan(num, face) {
  return face ? `${num}${face}` : String(num);
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
 * **adapter un autre visuel** — tailler un Gros Plan dans un Plan Moyen, ou
 * loger une image qui n'a pas la bonne proportion.
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
const NUMS_IMPRIMES = new Set([
  ...PL_IMPRIMES.map((p) => p.num),
  ...DEPARTS_IMPRIMES.flatMap((d) => d.faces.map((f) => f.num)),
  ...SCENES_IMPRIMEES.flatMap((s) => [s.pmNum, s.gpNum]),
]);

export function imageImprimee(dossier, origine) {
  return NUMS_IMPRIMES.has(origine) ? `assets/${dossier}/${origine}.webp` : '';
}

export function carteActive(id) {
  return !SURCHARGES.desactives.has(id);
}

// --- Accès aux moitiés -----------------------------------------------------

/**
 * Une moitié posée : cadrage, minutage, éléments, objectif.
 * `face` distingue le recto du verso — deux plans différents pour le même
 * numéro de scène.
 */
export function halfInfo(sceneIdx, format, opts = {}) {
  const s = sceneDe(sceneIdx);
  if (!s) return null;
  const side = format === 'GP' ? s.gp : s.pm;
  // Le numéro imprimé est l'identité du plan : il fait la clé et désigne son
  // illustration. `num` n'est que l'étiquette, renumérotable.
  const origine = format === 'GP' ? s.gpNum : s.pmNum;
  const face = opts.face || 'R';
  const cle = cleplan(origine, face);
  return {
    scene: s.idx,
    format,
    face,
    cle,
    transition: s.transition || null,
    dual: !!opts.dual,
    titre: s.titre || null,
    famille: s.famille,
    tc: tcDe(cle, s.tc),
    el: elDe(cle, side.el),
    obj: objDe(cle, side.obj),
    obj2: obj2De(cle, side.obj2),
    mort: mortDe(cle, s.mort),
    num: numDe(cle, origine),
    numOrigine: origine,
    image: imageDe(cle, imageImprimee(format === 'GP' ? 'gp' : 'pm', origine)),
    miroir: miroirDe(cle),
    cadre: cadreDe(cle),
  };
}

/**
 * Les deux moitiés d'une carte double, sur une face donnée. Au recto le Gros
 * Plan est à gauche et le Plan Moyen à droite ; au verso, l'inverse.
 */
export function moitiesDe(carte, face = 'R') {
  return {
    GP: halfInfo(carte.gpScene, 'GP', { dual: !!carte.dualGP, face }),
    PM: halfInfo(carte.pmScene, 'PM', { dual: !!carte.dualPM, face }),
  };
}

/** Un Plan Large se comporte comme un plan unique pleine largeur. */
export function plHalf(carte) {
  const cle = cleplan(carte.num, null);
  return {
    scene: null,
    format: carte.depart ? 'DEP' : 'PL',
    face: null,
    cle,
    transition: null,
    dual: false,
    titre: null,
    famille: carte.depart ? 'DÉPART' : 'PLAN LARGE',
    tc: tcDe(cle, carte.tc),
    el: elDe(cle, carte.el),
    obj: objDe(cle, carte.obj),
    obj2: obj2De(cle, carte.obj2),
    mort: mortDe(cle, false),
    num: numDe(cle, carte.num),
    numOrigine: carte.num,
    depart: !!carte.depart,
    image: imageDe(cle, imageImprimee('pl', carte.num)),
    miroir: miroirDe(cle),
    cadre: cadreDe(cle),
  };
}

// --- Catalogue des plans ---------------------------------------------------
// La liste complète de ce qui est éditable. Une moitié de carte double y
// figure deux fois, une par face.

export function catalogue() {
  const out = [];
  const pousse = (origine, face, defauts, format, famille, extra = {}) => {
    const cle = cleplan(origine, face);
    const num = numDe(cle, origine);
    const dossier = format === 'PL' || format === 'DEP' ? 'pl' : format === 'GP' ? 'gp' : 'pm';
    const imprimee = imageImprimee(dossier, origine);
    out.push({
      cle, num, numOrigine: origine, face, format, famille,
      quoi: `${FORMATS[format].label} ${num}${face ? ` — ${face === 'R' ? 'recto' : 'verso'}` : ''}`,
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
    for (const f of FACES) {
      pousse(s.pmNum, f.id, { tc: s.tc, el: s.pm.el, obj: s.pm.obj, obj2: s.pm.obj2, mort: s.mort },
        'PM', s.famille, { scene: s.idx, titre: s.titre || null });
      pousse(s.gpNum, f.id, { tc: s.tc, el: s.gp.el, obj: s.gp.obj, obj2: s.gp.obj2, mort: s.mort },
        'GP', s.famille, { scene: s.idx, titre: s.titre || null });
    }
  }
  for (const p of PLANS_LARGES()) {
    pousse(p.num, null, { tc: p.tc, el: p.el, obj: p.obj, obj2: p.obj2, mort: false },
      'PL', 'PLAN LARGE', { brouillon: !!p.brouillon });
  }
  for (const d of DEPARTS()) {
    d.faces.forEach((f, k) => pousse(f.num, null, { tc: f.tc, el: f.el, obj: f.obj, obj2: f.obj2, mort: false },
      'DEP', 'DÉPART', { version: d.type, faceDepart: k + 1 }));
  }
  return out;
}

/** Le plan d'une clé donnée, tel qu'il est actuellement. */
export function planDeCle(cle) {
  return catalogue().find((p) => p.cle === cle) || null;
}

/**
 * Les moitiés disponibles pour un appariement, par cadrage. La valeur reste le
 * numéro imprimé — c'est lui qui identifie la moitié —, seule l'étiquette suit
 * une éventuelle renumérotation.
 */
export function moitiesDisponibles(format) {
  return SCENES().map((s) => {
    const origine = format === 'GP' ? s.gpNum : s.pmNum;
    return {
      num: origine,
      affiche: numDe(cleplan(origine, 'R'), origine),
      scene: s.idx,
      famille: s.famille,
      titre: s.titre || null,
    };
  });
}

/**
 * Les numéros portés par plus d'un plan. Renuméroter est libre : c'est ici que
 * l'éditeur va chercher de quoi prévenir.
 */
export function doublonsNumeros() {
  const par = new Map();
  for (const p of catalogue()) {
    if (!par.has(p.num)) par.set(p.num, new Set());
    par.get(p.num).add(`${p.format}${p.numOrigine}`);
  }
  return [...par.entries()]
    .filter(([, s]) => s.size > 1)
    .map(([num, s]) => ({ num, plans: [...s].sort() }))
    .sort((a, b) => a.num - b.num);
}

/**
 * La face jouée d'une carte double se déduit de la pose : la moitié laissée
 * visible se retrouve au bout libre de la carte.
 *
 * Le recto porte le Plan Moyen à gauche et le Gros Plan à droite ; le verso,
 * retourné autour de l'axe vertical, les échange. Un Gros Plan accroché à
 * gauche d'une séquence est donc à gauche de sa carte — c'est le verso ; à
 * droite, c'est le recto. Réglable dans Variables : sans cette lecture, une
 * carte est toujours jouée sur son recto.
 */
export function faceJouee(format, cote, cfg) {
  if (!cfg || cfg.faceSelonPose === false) return 'R';
  if (cote !== 'gauche' && cote !== 'droite') return 'R';
  return (format === 'GP') === (cote === 'gauche') ? 'V' : 'R';
}
