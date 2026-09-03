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

import { ELEMENTS, ELEMENT_IDS, PLANS_DEPART, PAIRES_DEPART } from './data.js?v=2.7';
import { elIcon } from './icons.js?v=2.7';

// Chaque version garde son texte complet dans `corps` : les règles
// précédentes restent donc consultables telles quelles, et pas seulement
// résumées par leur liste de changements.
export const REGLES_HISTORIQUE = [
  {
    v: '0.23',
    date: '03/09/2026',
    origine: 'Variante proposee par l’auteur',
    corps: (c) => corps_0_23(c),
    items: [
      '<b>Variante — un Raccord resté OUVERT coûte au lieu de rapporter.</b> Un Raccord promet une suite : il fait charnière au bout d’une ligne, et un <b>Plan Large</b> vient de l’autre côté ouvrir un second versant. Tant qu’il n’est pas venu, le Raccord ne raccorde rien — il pend. Son « x × Raccord » vaut alors <b>−2</b>, à plat.',
      '<b>Ce qu’elle empêche :</b> poser des Raccords partout sans jamais les fermer. Chacun comptait tous les autres — trois Raccords à « 2 × Raccord » faisaient dix-huit points — et rien n’obligeait à leur donner la suite qu’ils annoncent.',
      'Un Raccord est <b>fermé</b> quand ses <b>deux bords portent une carte</b> et qu’un <b>Plan Large</b> — ou le Plan de départ, qui en tient lieu — se trouve de l’un des deux côtés. Un bord qui donne sur le vide, ou deux plans ordinaires de part et d’autre, et il est ouvert.',
      'Le malus est <b>à plat</b> : il ne se multiplie pas par le nombre de Raccords du montage, et une carte qui dit « les cartes Raccord vous rapportent +y par Raccord » ne le rattrape pas. Le jeton de points passe au <b>rouge</b> plutôt qu’au vert. Réglable dans <b>Variables</b> ⚙ — zéro éteint la variante.',
    ],
  },
  {
    v: '0.22',
    date: '03/09/2026',
    origine: 'Limite de ligne corrigée par l’auteur',
    corps: (c) => corps_0_22(c),
    items: [
      '<b>Quatre CARTES de chaque côté du Plan Large, et non quatre plans.</b> Un Raccord, une Ouverture, un Générique de fin occupent une place sur le banc comme les autres : ils comptent. Ils ne comptaient pas — « un Raccord n’est pas un plan » —, et une ligne s’étirait alors bien au-delà de ses quatre cartes. La limite porte sur la <b>place</b>, pas sur ce qui rapporte des points.',
      '<b>Le Raccord reste la façon d’étoffer une ligne</b> — derrière lui vient un second Plan Large, qui ouvre son propre côté et repart à zéro —, mais il faut désormais lui <b>garder la place</b> : il ne s’ajoute plus par-dessus une ligne déjà pleine.',
      '<b>Une ligne n’a qu’un centre</b> : le <b>premier plan</b> qu’on y a posé — le Plan Large ou le Plan de départ qui l’a ouverte. Un second Plan Large venu par une charnière de Raccord ne fonde pas un second centre : il vient d’un côté du premier, et prend une place comme les autres cartes de ce côté-là. C’est le même centre que lit le pouvoir « d’un côté du centre de sa ligne » — une seule notion de centre dans tout le jeu.',
    ],
  },
  {
    v: '0.21',
    date: '03/09/2026',
    origine: 'Deux corrections rapportées par l’auteur',
    corps: (c) => corps_0_21(c),
    items: [
      '<b>« n × SÉQUENCE ▼ 🚗 » compte des LIGNES, pas des icônes.</b> Trois lignes en dessous qui montrent un Véhicule font <b>3 × 3 = 9 points</b>, qu’elles en montrent six à elles trois ou trois : c’est le cartouche <b>SÉQUENCE</b> du bandeau qui a raison. Il comptait les exemplaires — une seule ligne à quatre Véhicules valait alors autant que quatre lignes. Le bandeau reçoit au passage <b>sa propre ligne dans la table du décompte</b> : il s’y confondait avec « n × SÉQUENCE ▲ / ▼ », qui compte des lignes sans rien y chercher.',
      '<b>Le minutage ferme le montage.</b> Le plan à <b>01:00</b> est le premier plan du film, celui à <b>99:00</b> le dernier : <b>rien ne se pose avant l’un ni après l’autre</b>. Et la fermeture vaut pour tout ce qui vient après dans l’ordre de lecture, pas seulement pour le bout de sa ligne — une ligne ouverte sous celle qui porte le 99:00 commencerait après la fin du film.',
      '<b>Une borne ne se pose qu’au bout qui lui revient</b> — le 01:00 tout au début du montage, le 99:00 tout à la fin. Sans quoi elle tomberait au milieu et rendrait illégal d’un coup ce qui était déjà posé.',
      '<b>Le Générique de fin marque 99:00.</b> La moitié Générique se lit des deux façons — Ouverture à gauche, Crédits à droite — et son minutage suit son rôle : 01:00 en tête de film, 99:00 en queue. Une seule moitié imprimée, deux bornes.',
    ],
  },
  {
    v: '0.20',
    date: '03/09/2026',
    origine: 'Vocabulaire fixé par l’auteur',
    corps: (c) => corps_0_20(c),
    items: [
      '<b>« Valeur de cadre » se dit désormais « Valeur de Plan ».</b> Le mot désigne toujours la même chose — un cadrage <b>différent</b> : une ligne qui alterne Plan Large, Plan Moyen et Gros Plan en montre trois, quel qu’y soit le nombre de cartes. Seul le nom change, partout : sur les cartes, dans l’éditeur, dans le décompte et dans l’aide de jeu. La forme courte reste <b>Val.</b>',
      '<b>Les portées se nomment sans possessif dans l’aide de jeu</b> — « avant, dans la ligne », « dans toute la ligne » —, parce qu’on y décrit une portée <b>en soi</b>, sans carte sous les yeux. Dans la phrase d’un bandeau, où « sa » désigne la carte dont on parle, elles gardent leur forme d’avant : « 2 × Arme dans toute sa ligne ».',
    ],
  },
  {
    v: '0.19',
    date: '02/09/2026',
    origine: 'Pouvoir retiré par l’auteur',
    corps: (c) => corps_0_19(c),
    items: [
      '<b>« n × plan sans personnage » quitte le jeu.</b> Son symbole — un rond barré — n’était pas le bon, et le pouvoir venait d’une version ancienne : il ne se lisait plus nulle part. Le vocabulaire perd donc une cible, et l’icône disparaît du matériel comme de l’aide de jeu.',
      '<b>Trois scènes le portaient</b> — les plans de mort <b>208 / 308</b>, <b>210 / 310</b> et <b>212 / 312</b>. Leur bandeau est désormais <b>vide</b> : c’est le pouvoir qui était faux, et il attend celui qui lui revient. Elles restent jouables entre-temps, sans rien rapporter par elles-mêmes.',
    ],
  },
  {
    v: '0.18',
    date: '02/09/2026',
    origine: 'Règle étendue et corrigée par l’auteur',
    corps: (c) => corps_0_18(c),
    items: [
      '<b>Deux Raccords ne se touchent pas.</b> Un Raccord relie deux plans ; collé à un autre Raccord, il ne relierait qu’une jonction — c’est-à-dire rien.',
      '<b>Le bord libre d’un Raccord n’accepte qu’un Plan Large.</b> Jamais un Plan Moyen ni un Gros Plan : c’est là tout l’office du Raccord — il ouvre un second côté à sa ligne, et ce côté commence par son propre climax. Les deux interdits se règlent dans les Variables, et une carte qui n’aurait plus où se poser n’est plus proposée au dérushage.',
      '<b>« Les cartes Raccord vous rapportent +n par Raccord » bonifie au lieu de remplacer.</b> Le « x × Raccord » imprimé sur <b>vos</b> Cartes Raccord devient « x+n × Raccord ». L’ancienne formule remplaçait le bandeau de <b>coût</b>, et ne s’appliquait donc qu’aux Raccords dont le « n × Raccord » était <b>négatif</b> : sur ceux qui rapportaient déjà, elle ne faisait rien du tout. Deux cartes qui le disent <b>s’ajoutent</b> désormais — +1 et +2 font +3 —, là où l’ancienne gardait la plus généreuse. Sur la table, le jeton de points d’un Raccord bonifié passe au <b>vert</b>.',
      '<b>Un bandeau qui paie pour une ABSENCE ne regarde pas sa propre carte.</b> C’est la seule exception à « la carte qui porte le bandeau compte pour elle-même ». Sans elle, un Gros Plan qui <b>montre</b> une Héroïne et dit « 4 si Héroïne absente après » serait son propre démenti : le pouvoir ne pourrait jamais se déclencher, quoi que fasse la joueuse. Cela vaut pour « n si CIBLE absente », « n si aucun plan avant tel minutage » et « n si aucun de la cible ». Pas pour « n × icône absente », qui <b>compte</b> les manquantes au lieu d’exiger qu’il n’y en ait aucune : sa carte le diminue, elle ne l’annule pas.',
    ],
  },
  {
    v: '0.17',
    date: '02/09/2026',
    origine: 'Règle corrigée par l’auteur',
    corps: (c) => corps_0_17(c),
    items: [
      '<b>« n × Séquence avec 3+ ICÔNE » compte des exemplaires, pas des plans porteurs.</b> Une ligne qui montrait <b>trois véhicules</b> — un sur un plan, deux sur un autre — n’était pas comptée : le décompte cherchait <b>trois plans</b> porteurs et n’en trouvait que deux. Le bandeau écrit « 3+ 🚗 » : trois véhicules sont trois véhicules, sur autant de plans que la ligne veut. Trois sur un seul plan comptent donc aussi.',
      'Rien ne change pour les autres cibles : un plan n’a qu’un <b>cadrage</b>, il est mort ou il ne l’est pas, et la <b>valeur de cadre</b> compte de toute façon les cadrages <b>différents</b> de la ligne. La phrase du pouvoir se lit désormais « séquence <b>montrant</b> au moins 3 Véhicules », au pluriel, pour ne plus laisser croire qu’on dénombre des plans.',
      '<b>Le bandeau « séquence avec 3+ valeurs de cadre » montre enfin ce qu’il compte.</b> Il s’affichait « SÉQUENCE avec 3+ » — le seuil sans sa cible : le dessin de cette famille de bandeaux ne connaissait pas la valeur de cadre. Le cartouche <b>Valeur de cadre</b> paraît maintenant derrière le seuil, comme l’icône ou le cadrage des autres.',
    ],
  },
  {
    v: '0.16',
    date: '02/09/2026',
    origine: 'Règle précisée et variante ajoutée par l’auteur',
    corps: (c) => corps_0_16(c),
    items: [
      '<b>La boîte contient quatre plans de départ, numérotés 1 à 4.</b> Le matériel parlait de « 8 cartes Plan de départ » : ce sont bien huit cartes, mais elles ne montrent que <b>quatre plans</b> — une carte en porte deux, un par face. Les deux cartes imprimées apparient <b>1-2</b> et <b>3-4</b>, en quatre exemplaires chacune, et chaque joueuse reçoit les deux : quatre faces au choix.',
      '<b>Nouvelle variante « 6 Cartes Départ ».</b> Quatre plans s’apparient de six façons — <b>1-2, 2-3, 3-4, 4-1, 2-4, 1-3</b> — et la boîte les contient toutes. On mélange les six cartes et l’on en donne <b>une</b> à chaque joueuse : elle a <b>deux faces</b> au choix au lieu de quatre, et deux joueuses n’ouvrent jamais sur le même couple. Chacun des quatre plans est sur trois cartes, donc également accessible.',
      'La variante <b>ne va pas avec « pas de Plans de départ »</b> : celle-là verse les faces de départ dans la pioche des Plans Larges, et il n’y a plus rien à distribuer. Elle se règle dans les Variables et se désactive par défaut.',
    ],
  },
  {
    v: '0.15',
    date: '02/09/2026',
    origine: 'Règle étendue par l’auteur',
    corps: (c) => corps_0_15(c),
    items: [
      '<b>Une ligne s’étoffe, elle ne s’étire pas.</b> De part et d’autre du Plan Large — ou du Plan de départ — qui tient une ligne, on n’accroche pas plus de <b>quatre plans</b>. Les <b>Raccords ne comptent pas</b> : un Raccord n’est pas un plan, et c’est justement lui qui permet d’étoffer une ligne arrivée à sa longueur. Le nombre se règle dans les Variables, et <b>zéro le désactive</b>.',
      '<b>« Après le dernier tour, vous pouvez jouer 1 Carte supplémentaire. »</b> L’ancienne formule repoussait la limite de plans de sa porteuse à onze — ce qui retardait la fin <b>pour tout le monde</b>. La fin tombe désormais au dixième plan pour tous ; la porteuse joue ensuite un <b>tour de plus</b>, et y pose ce qu’elle veut : un plan, ou un Raccord.',
      '<b>Le pouvoir de séquence vise deux cibles de plus : le plan de mort et la valeur de cadre.</b> « n × séquence avec un plan de mort », « n × séquence sans plan de mort », « n × séquence avec au moins 3 valeurs de cadre ». La valeur de cadre s’y compte comme partout : ce sont les cadrages <b>différents</b> de la ligne, pas les plans qui les portent.',
    ],
  },
  {
    v: '0.14.14',
    date: '02/09/2026',
    origine: 'Règle précisée par l’auteur',
    corps: (c) => corps_0_14_14(c),
    items: [
      '<b>Une Carte Raccord n’est jamais un Gros Plan ni un Plan Moyen.</b> Elle occupe bien leur place sur le banc — c’est par là qu’on l’accroche —, mais elle relie sans rien raconter : aucun bandeau qui compte des <b>cadrages</b> ne la trouve. « n × Gros Plan », « si au moins 2 Plans Moyens », « lot de 3 Gros Plans », « séquence avec 2 Gros Plans » : elle n’y entre pour rien.',
      'Elle compte en revanche toujours comme <b>Carte</b> et comme <b>Carte Raccord</b>, jamais comme <b>Plan</b>. Et elle n’apporte aucune <b>valeur de cadre</b> — ce qui était déjà le cas.',
    ],
  },
  {
    v: '0.14.13',
    date: '02/09/2026',
    origine: 'Règle corrigée par l’auteur',
    corps: (c) => corps_0_14_13(c),
    items: [
      '<b>Le coût d’une Carte Raccord est celui qui est imprimé dessus, et lui seul.</b> J’avais ajouté une variable de partie qui retirait deux points par Carte Raccord, en plus du « −2 × Raccord » que vos Raccords portent déjà. Deux malus pour un : une Ouverture à « 6 si dans l’ordre » n’affichait plus que <b>4</b>. La variable disparaît — <b>le décompte ne retire plus rien qui ne soit écrit sur une carte</b>.',
      '<b>« Les cartes Raccord vous rapportent n × Raccord » ne remplace qu’un bandeau de coût.</b> Un Raccord dont le bandeau est « −2 × Raccord » le voit devenir « n × Raccord ». Un Raccord qui porte <b>autre chose</b> — « 1 × Plan », une icône, un minutage, ou même un « n × Raccord » qui rapporte déjà — <b>garde le sien</b>. Le pouvoir ne peut qu’améliorer, jamais rogner.',
      'Le remplacement se fait <b>bandeau par bandeau</b> : un Raccord qui en porte deux ne voit changer que celui de coût. Et l’<b>Ouverture</b> comme le <b>Générique de fin</b> ne sont jamais touchés, quel que soit leur bandeau : ils encadrent le film plutôt que de relier.',
    ],
  },
  {
    v: '0.14.12',
    date: '02/09/2026',
    origine: 'Règle reformulée par l’auteur',
    corps: (c) => corps_0_14_12(c),
    items: [
      '<b>« Les cartes Raccord vous rapportent maintenant n × Raccord. »</b> Le pouvoir ne donne pas de points à qui le porte : il <b>remplace le bandeau imprimé</b> des Cartes Raccord de votre montage. Leur « 1 × Plan » devient « n × Raccord », et ce sont elles qui marquent — sur la carte, à l’endroit où on le lit.',
      '<b>Il ne touche que le Raccord.</b> L’Ouverture et le Générique de fin encadrent le film plutôt que de relier : ils gardent leur bandeau, quoi qu’il arrive.',
      'La carte qui porte ce pouvoir <b>n’affiche plus de points</b> : elle ne fait rien gagner par elle-même. Chaque Raccord, lui, montre son nouveau bandeau et ce qu’il rapporte. L’aperçu au survol garde le bandeau imprimé à côté du nouveau, pour qu’on voie ce qui a été remplacé. Entre deux cartes qui le disent, <b>la plus généreuse l’emporte</b> ; elles ne se cumulent pas.',
    ],
  },
  {
    v: '0.14.11',
    date: '02/09/2026',
    origine: 'Règle précisée par l’auteur',
    corps: (c) => corps_0_14_11(c),
    items: [
      '<b>Ce que coûte une Carte Raccord est la valeur de la carte, pas une ligne du montage.</b> Une Carte Raccord relie sans rien raconter : l’étoffer <b>coûte deux points</b>. Ce coût se lisait dans une ligne du décompte que rien n’annonçait, pendant que l’Ouverture et le Générique de fin portaient, eux, un « 2 × Raccord » bien visible — la même quantité comptée deux fois, une fois en moins sans le dire, une fois en plus en le disant.',
      '<b>Chaque Carte Raccord affiche donc ce qu’elle vaut</b>, à son coin, comme toute autre carte : <b>−2</b> en rouge d’ordinaire. Il n’y a plus rien de caché à retrancher au décompte.',
      '<b>Et « Les Raccords vous rapportent +2 » retourne ce signe sur toutes vos Cartes Raccord à la fois.</b> Elles passent de −2 à +2, chacune : sur trois Raccords, le montage passe de −6 à +6, soit <b>douze points</b> d’écart. La carte qui le dit n’ajoute rien elle-même — elle en montre le total à son coin, pour qu’on voie ce que son pouvoir a fait, mais les points sont comptés sur les Raccords. Entre deux cartes qui le disent, <b>la plus généreuse l’emporte</b> ; elles ne se cumulent pas.',
    ],
  },
  {
    v: '0.14.10',
    date: '02/09/2026',
    origine: 'Règle étendue par l’auteur',
    corps: (c) => corps_0_14_10(c),
    items: [
      '<b>« n si CIBLE absente » s’ouvre à tout ce qui se compte.</b> Le bandeau ne visait qu’une <b>icône</b> ; il vise désormais n’importe quelle cible du vocabulaire — une <b>valeur de cadre</b>, une <b>Carte Raccord</b>, un <b>plan de mort</b>, un cadrage, une icône. Sa portée se règle comme celle des autres : <b>avant</b> le plan, <b>après</b>, dans <b>toute sa ligne</b>, ou sur le montage entier.',
      '<b>Nouveau : « n si CIBLE est la plus présente ».</b> On <b>nomme</b> la cible, et l’on marque si elle domine sa portée — ou si elle en est la plus rare, au choix. À ne pas confondre avec « n × l’icône la plus présente », qui compte les exemplaires de celle qui domine <b>sans dire laquelle</b> : ici c’est une condition sur une cible désignée.',
      'La comparaison se fait <b>dans sa propre famille</b> : une icône se mesure aux six icônes, un cadrage aux quatre cadrages. <b>À égalité, elle domine aussi</b> — sur la table, on compare des piles, et deux piles de même hauteur sont toutes deux les plus hautes. Encore faut-il qu’elle soit là : une cible <b>absente ne domine rien</b>, et « la moins présente » se lit parmi celles qui paraissent.',
      '<b>La croix de l’interdit ne recouvre plus ce qu’elle nie : elle le marque.</b> Pleine largeur, elle cachait le dessin d’une icône — on voyait qu’une icône était interdite sans savoir laquelle — et rendait illisibles les cartouches qu’elle barrait. Elle se pose maintenant en <b>petite pastille dans le coin</b> de ce qu’elle marque.',
      '<b>« au moins » et « au plus » s’écrivent MIN et MAX.</b> « n si 4+ Armes » devient <b>« n si 4 Armes MIN »</b>, et « au plus » devient <b>MAX</b> : le nombre, la cible, puis le mot qui dit de quel côté il faut être. Même écriture pour « n si chaque séquence a k plans ».',
    ],
  },
  {
    v: '0.14.9',
    date: '01/09/2026',
    origine: 'Règle étendue par l’auteur',
    corps: (c) => corps_0_14_9(c),
    items: [
      '<b>Quatre pouvoirs qui ne comptent rien.</b> Tous les bandeaux jusqu’ici rapportaient des points. Ceux-ci changent une <b>règle</b>, pour la seule joueuse qui les a dans son montage, et tant qu’ils y sont. Aucun symbole ne les dit : ils s’écrivent <b>en toutes lettres</b> sur la carte.',
      '<b>« Vous pouvez piocher sur la pioche PM / GP. »</b> Piocher au sommet d’une pile plutôt que dans la rivière : on prend une carte que personne n’a vue, mais on la prend seul. Ce droit <b>n’est plus ouvert à tout le monde</b> — c’est le changement de règle qui va avec ce pouvoir. La variable de partie « Pioche PM / GP accessible au sommet » le rend à tous quand on la coche.',
      '<b>« Vous pouvez monter 1 séquence supplémentaire. »</b> Six lignes au lieu de cinq. <b>« Vous pouvez monter 1 Plan supplémentaire. »</b> Onze plans au lieu de dix — et la fin de partie se déclenche donc <b>banc par banc</b>, chacun à sa propre limite, plutôt qu’à un compte unique. Deux cartes s’additionnent.',
      '<b>« Les Raccords vous rapportent +2 au lieu de −2. »</b> Une Carte Raccord dans votre montage vous <b>coûte deux points</b> : elle relie sans rien raconter. Ce pouvoir retourne le compte pour qui le porte. Il <b>remplace</b> le montant, il ne s’y ajoute pas : deux cartes qui le portent ne cumulent pas, c’est la plus généreuse qui vaut. Le montant de base se règle dans les variables.',
      '<b>Les seuils s’écrivent en chiffres, plus en symboles.</b> « ≥ 3 » devient <b>« 3+ »</b> et « ≤ 3 » devient <b>« 3 max »</b> : le symbole ne passait pas à l’impression et se lisait mal à la taille d’un Gros Plan. Les deux bandeaux de séquence gagnent au passage le mot <b>« avec »</b> en toutes lettres — « SÉQUENCE avec 3+ Objet » se lit sans avoir rien appris.',
    ],
  },
  {
    v: '0.14.8',
    date: '01/09/2026',
    origine: 'Écriture précisée par l’auteur',
    corps: (c) => corps_0_14_8(c),
    items: [
      '<b>Un minutage de 00:00 s’écrit désormais « --:-- ».</b> Ce n’est pas un instant du film : c’est l’<b>absence</b> de minutage. Les Raccords et les Génériques relient sans rien raconter ; les six scènes de <b>personnage</b> se placent où l’on veut. Écrit « 00:00 », ce vide se lisait comme un instant très précoce — donc comme le tout début du film, avant l’Ouverture.',
      '<b>01:00 et 99:00 prennent une couleur orangée.</b> Ce sont les deux bornes : le <b>premier</b> et le <b>dernier</b> plan du film. Elles se repèrent ainsi d’un coup d’œil, sans se confondre avec un minutage ordinaire, en rouge, ni avec l’absence de minutage, en bleu.',
      'Rien ne change au décompte : « --:-- » vaut toujours zéro, et les plans qui le portent étaient déjà <b>retirés de la lecture</b> de l’ordre chronologique — un plan sans minutage ne rompt donc pas l’ordre, où qu’on le pose. Le bandeau « n si aucun plan à --:-- » les vise toujours.',
    ],
  },
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

// --- v0.23 -----------------------------------------------------------------
// Variante : un Raccord qu'on n'a pas ferme ne raccorde rien, et coute.

function corps_0_23(c) {
  const m = c && c.raccordOuvertMalus;
  return corps_0_22(c)
    .replace('<h3>Le minutage</h3>', `${majBloc('0.23', m
    ? `<b>Variante — un Raccord resté OUVERT coûte au lieu de rapporter.</b> Un Raccord promet
       une suite : il fait charnière au bout d'une ligne, et un <b>Plan Large</b> vient de l'autre
       côté ouvrir un second versant. Tant qu'il n'est pas venu, le Raccord ne raccorde rien — il
       pend, et son « x × Raccord » vaut <b>${m}</b>, à plat.
       <br><br>Il est <b>fermé</b> quand ses <b>deux bords portent une carte</b> et qu'un Plan Large
       — ou le Plan de départ, qui en tient lieu — se trouve de l'un des deux côtés. Le malus ne
       se multiplie pas par le nombre de Raccords, et une carte qui bonifie les Raccords ne le
       rattrape pas.`
    : `Ici, un Raccord resté <b>ouvert</b> rapporte comme un autre : la variante est éteinte
       (réglable dans <b>Variables</b> ⚙).`)}
      <h3>Le minutage</h3>`);
}

// --- v0.22 -----------------------------------------------------------------
// La limite d'une ligne se compte en CARTES : le Raccord et les Génériques y
// prennent une place, comme les autres. Ils s'en exemptaient, et une ligne
// s'étirait alors sans fin.

function corps_0_22(c) {
  const k = c && c.plansParCote;
  return corps_0_21(c)
    .replace(/De part et d'autre du <b>Plan Large<\/b>[\s\S]*?s'étoffe encore\./,
      `De part et d'autre du <b>Plan Large</b> — ou du Plan de départ — qui tient une ligne, on
       n'accroche pas plus de ${maj('0.22', `<b>${k} cartes</b>. Un <b>Raccord</b>, une
       <b>Ouverture</b>, un <b>Générique de fin</b> y comptent : ils occupent une place comme les
       autres. La limite porte sur la place, pas sur ce qui rapporte des points.`)}`)
    .replace('<h3>Les Raccords et les Génériques</h3>',
      `${majBloc('0.22', `<b>Le Raccord reste la façon d'étoffer une ligne</b> — derrière lui vient
        un second Plan Large, qui ouvre un second versant —, mais il faut lui <b>garder la
        place</b> : il ne s'ajoute plus par-dessus une ligne déjà pleine.
        <br><br>Une ligne n'a d'ailleurs <b>qu'un centre</b> : le <b>premier plan</b> qu'on y a
        posé, celui qui l'a ouverte. Un second Plan Large ne fonde pas un second centre — il vient
        d'un côté du premier, et prend une place comme les autres cartes de ce côté-là. C'est le
        même centre que lit le pouvoir « d'un côté du centre de sa ligne ».`)}
      <h3>Les Raccords et les Génériques</h3>`);
}

// --- v0.21 -----------------------------------------------------------------
// Ce que « n × SÉQUENCE ▼ 🚗 » compte — des lignes, et non ce qu'elles
// portent —, et ce que les deux bornes du minutage ferment.

function corps_0_21(c) {
  return corps_0_20(c)
    // Ce bandeau-là n'avait pas sa ligne dans la table : il se confondait avec
    // « n × SÉQUENCE ▲ / ▼ », qui compte des lignes sans rien y chercher.
    .replace('<tr><td><b>n × PLAN de la plus longue SÉQUENCE</b></td>',
      `<tr><td><b>n × SÉQUENCE ▲ / ▼ + cible</b></td>
      <td>${maj('0.21', `n points par <b>ligne</b> placée au-dessus — ou en dessous — de celle qui
      porte le bandeau <b>et qui montre la cible</b>. On compte des <b>lignes</b> et non des
      icônes : trois lignes qui montrent un Véhicule font trois, qu'elles en montrent six à elles
      trois ou trois.`)}</td><td>Le montage entier</td></tr>
      <tr><td><b>n × PLAN de la plus longue SÉQUENCE</b></td>`)
    .replace('<h3>Le minutage</h3>', `<h3>Le minutage</h3>
      ${c.bornesBloquent === false
        ? majBloc('0.21', `Ici, les deux bornes du minutage ne ferment rien : on pose avant le
          <b>01:00</b> et après le <b>99:00</b> comme ailleurs (réglable dans <b>Variables</b> ⚙).`)
        : majBloc('0.21', `<b>Les deux bornes ferment le montage.</b> Le plan à <b>01:00</b> est le
          premier plan du film, celui à <b>99:00</b> le dernier : <b>rien ne se pose avant l'un ni
          après l'autre</b>. Le montage se lisant dans l'ordre — la première ligne ouvre le film, la
          dernière le termine —, la fermeture vaut pour <b>tout ce qui vient après</b> : une ligne
          ouverte sous celle qui porte le 99:00 commencerait après la fin du film.
          <br><br>Et une borne ne se pose qu'<b>au bout qui lui revient</b> : le 01:00 tout au début
          du montage, le 99:00 tout à la fin. Sans quoi elle tomberait au milieu et rendrait
          illégal d'un coup ce qui était déjà posé.`)}`);
}

// --- v0.20 -----------------------------------------------------------------
// Deux mots changent. « Valeur de cadre » devient « Valeur de Plan » — c'est
// ainsi que l'auteur l'écrit —, et les portées perdent leur possessif dans
// l'aide, où l'on décrit une portée en soi plutôt qu'une carte posée.

function corps_0_20(c) {
  return corps_0_19(c)
    .replace(/valeurs de cadre/g, 'Valeurs de Plan')
    .replace(/valeur de cadre/g, 'Valeur de Plan')
    .replace(/Valeur de cadre/g, 'Valeur de Plan')
    .replace('<h3>Décompte des bandeaux</h3>',
      `${majBloc('0.20', `<b>« Valeur de cadre » se dit désormais « Valeur de Plan ».</b> Le mot
      désigne toujours la même chose — un cadrage <b>différent</b> : une ligne qui alterne Plan
      Large, Plan Moyen et Gros Plan en montre trois, quel qu'y soit le nombre de cartes. Seul le
      nom change, sur les cartes comme dans le décompte.`)}
      <h3>Décompte des bandeaux</h3>`);
}

// --- v0.19 -----------------------------------------------------------------
// Le pouvoir « n × plan sans personnage » quitte le jeu : son symbole n'était
// pas le bon, et il ne restait que d'une version ancienne.

function corps_0_19(c) {
  return corps_0_18(c)
    .replace(/<tr><td><b>n × PLAN SANS PERSONNAGE<\/b><\/td>[\s\S]*?<\/tr>/,
      `<tr class="regle-retiree"><td><b><s>n × PLAN SANS PERSONNAGE</s></b></td>
      <td>${maj('0.19', `<b>Retiré du jeu.</b> Le symbole qui le disait — un rond barré — n'était
      pas le bon, et le pouvoir venait d'une version ancienne. Les trois scènes qui le portaient
      attendent le bandeau qui leur revient.`)}</td><td>—</td></tr>`)
    .replace(/un <b>Plan de mort<\/b>, un <b>plan sans personnage<\/b>, /,
      'un <b>Plan de mort</b>, ');
}

// --- v0.18 -----------------------------------------------------------------
// Ce que le Raccord appelle à côté de lui, ce que le pouvoir de Raccord fait
// désormais — bonifier plutôt que remplacer —, et la seule exception à « la
// carte compte pour elle-même ».

function corps_0_18(c) {
  const bonus = c && c.raccordAppellePL !== false;
  return corps_0_17(c)
    // 1. Les deux règles de pose, à la suite de la charnière.
    .replace(/La\s+ligne reste alors <b>une seule séquence<\/b>/,
      `${maj('0.18', `<b>Deux Raccords ne se touchent pas</b>, et le <b>bord libre d'un Raccord
      n'accepte qu'un Plan Large</b> — jamais un Plan Moyen ni un Gros Plan. C'est là tout l'office
      du Raccord : il ouvre un second côté à sa ligne, et ce côté commence par son propre climax.
      ${bonus ? '' : '(Réglage en cours : le bord accepte n’importe quel plan.)'}`)}
      La ligne reste alors <b>une seule séquence</b>`)
    // 2. L'exception à « la carte compte pour elle-même ».
    .replace(/un plan compte toujours ce qu(?:’|')il porte\.<\/span>/,
      `un plan compte toujours ce qu’il porte.</span>
      ${maj('0.18', `<b>Sauf un bandeau qui paie pour une ABSENCE</b> — « n si telle icône est
      absente », « n si aucun plan avant tel minutage », « n si aucune Arme ». Celui-là ne regarde
      pas sa propre carte : sans quoi un Gros Plan qui montre une Héroïne et dit « 4 si Héroïne
      absente après » serait son propre démenti, et ne pourrait <b>jamais</b> se déclencher.
      « n × icône absente » n'en est pas un : il <b>compte</b> les manquantes au lieu d'exiger
      qu'il n'y en ait aucune, et sa carte s'y compte comme partout.`)}`)
    // 3. Le pouvoir de Raccord devient un modificateur.
    .replace(/<tr><td><b>n × SÉQUENCE avec \/ sans …<\/b><\/td>/,
      `<tr><td><b>Les Raccords vous rapportent +n</b></td>
      <td>${maj('0.18', `Un <b>modificateur</b>, écrit en toutes lettres : le « x × Raccord »
      imprimé sur <b>vos</b> Cartes Raccord devient « x+n × Raccord ». Un « −2 × Raccord » à +1 se
      lit « −1 × Raccord » ; un « 2 × Raccord » se lit « 3 × Raccord ». Il ne touche <b>que</b> le
      « n × Raccord » : un Raccord qui porte autre chose garde son bandeau, et l'Ouverture comme le
      Générique de fin ne sont pas des Cartes Raccord. Deux cartes qui le disent <b>s'ajoutent</b>.
      La carte qui le porte ne gagne rien elle-même ; le Raccord bonifié, lui, montre son jeton de
      points en <b>vert</b>.`)}</td><td>Le montage entier</td></tr>
      <tr><td><b>n × SÉQUENCE avec / sans …</b></td>`);
}

// --- v0.17 -----------------------------------------------------------------
// Ce que « 3+ » compte : des exemplaires, pas des plans porteurs. Le texte
// disait « trois plans Arme » là où le bandeau écrit « 3+ 🗡 » — et le décompte
// suivait le texte. C'est le bandeau qui a raison : c'est lui qui est imprimé.

function corps_0_17(c) {
  return corps_0_16(c)
    .replace(/<tr><td><b>n × SÉQUENCE avec \/ sans …<\/b><\/td>[\s\S]*?<\/tr>/,
      `<tr><td><b>n × SÉQUENCE avec / sans …</b></td>
      <td>n points par ligne qui porte — ou ne porte pas — l'icône, le cadrage, le plan de mort, la
      valeur de cadre ou la Carte Raccord visée. ${maj('0.17', `Le bandeau peut demander un
      <b>nombre</b> : « 3+ » compte les lignes qui en montrent <b>trois ou plus</b>, et son
      contraire celles qui en montrent <b>moins de trois</b>. Ce sont des <b>exemplaires</b> que
      l'on compte, et non des plans porteurs : trois véhicules sont trois véhicules, qu'ils soient
      sur trois plans ou sur deux — ou même sur un seul. Les cibles qui ne sont pas des icônes ne
      connaissent pas la nuance : un plan n'a qu'un cadrage, il est mort ou il ne l'est pas, et la
      valeur de cadre compte de toute façon les cadrages <b>différents</b> de la ligne.`)}</td>
      <td>Le montage entier</td></tr>`)
    .replace('<td>n points par plan portant cette icône</td>',
      `<td>${maj('0.17', `n points par <b>exemplaire</b> de cette icône : un plan qui la porte deux
      fois compte deux fois. Le texte disait « par plan portant cette icône » — ce que fait la
      variante <b>« compter chaque plan »</b>, dans les Variables, et non la règle.`)}</td>`);
}

// --- v0.16 -----------------------------------------------------------------
// La boîte contient QUATRE plans de départ, pas huit cartes distinctes : une
// carte en porte deux, un par face. La variante ouvre les six appariements que
// quatre plans permettent, et n'en donne qu'un par joueuse.

function corps_0_16(c) {
  const six = !!(c && c.sixCartesDepart);
  const couples = PAIRES_DEPART
    .map(([a, b]) => `${PLANS_DEPART.indexOf(a) + 1}-${PLANS_DEPART.indexOf(b) + 1}`).join(', ');
  return corps_0_15(c)
    .replace(/<li>8 cartes <b>Plan de départ<\/b>[\s\S]*?<\/li>/,
      `<li>${maj('0.16', `<b>4 plans de départ</b> — numérotés 1 à 4 —, portés par des cartes
      recto-verso : une carte montre deux de ces quatre plans, un par face.
      ${six
    ? `<b>Variante « 6 Cartes Départ »</b> : les <b>six</b> appariements possibles
             (${couples}) sont dans la boîte.`
    : 'Les deux cartes imprimées apparient 1-2 et 3-4, en quatre exemplaires chacune.'}`)}</li>`)
    .replace(/<li>Chaque joueuse reçoit ses <b>deux<\/b> cartes Plan de départ[\s\S]*?<\/li>/,
      `<li>${maj('0.16', six
        ? `<b>Variante « 6 Cartes Départ ».</b> On mélange les <b>six</b> cartes de départ et l'on
           en donne <b>une</b> à chaque joueuse. Chacune a donc <b>deux faces</b> au choix — et
           jamais le même couple que sa voisine. Elle en pose une : c'est la première ligne de son
           montage.`
        : `Chaque joueuse reçoit ses <b>deux</b> cartes Plan de départ — les couples 1-2 et 3-4,
           soit <b>quatre faces</b> au choix. Aucun tirage. Elle en pose une face dans son banc et
           écarte le reste : c'est la première ligne de son montage.`)}</li>`)
    .replace('<li class=""><b>Pas de Plans de départ</b>',
      `${variante('6 Cartes Départ', six, maj('0.16', `les quatre plans de départ s'apparient de
      <b>six</b> façons (${couples}), et la boîte les contient toutes. Chaque joueuse en <b>pioche
      une seule</b> : deux faces au choix au lieu de quatre, et deux joueuses n'ouvrent jamais sur
      le même couple. Sans effet si l'on joue « pas de Plans de départ ».`))}
      <li class=""><b>Pas de Plans de départ</b>`);
}

// --- v0.15 -----------------------------------------------------------------
// Une limite de pose de plus, une carte supplémentaire qui change de moment, et
// deux cibles de séquence.

function corps_0_15(c) {
  const k = c && c.plansParCote;
  return corps_0_14_14(c)
    .replace('<li>Un <b>Plan Large</b> est le climax',
      `<li>${maj('0.15', k > 0
        ? `De part et d'autre du <b>Plan Large</b> — ou du Plan de départ — qui tient une ligne, on
           n'accroche pas plus de <b>${k} plans</b>. Les <b>Raccords ne comptent pas</b> : c'est par
           eux qu'une ligne arrivée à sa longueur s'étoffe encore.`
        : `La longueur d'une ligne n'est pas bornée (variante).`)}</li>
      <li>Un <b>Plan Large</b> est le climax`)
    .replace(/<td>votre montage compte <b>n plans de plus<\/b>[\s\S]*?<\/td>/,
      `<td>${maj('0.15', `une fois la fin déclenchée et le dernier tour joué, vous jouez
      <b>n tours de plus</b> — et vous y posez ce que vous voulez, un plan ou un Raccord. La fin,
      elle, tombe au dixième plan pour tout le monde`)}</td>`);
}

// --- v0.14.14 --------------------------------------------------------------
// Une Carte Raccord occupe la place d'un Gros Plan ou d'un Plan Moyen, mais
// n'en est pas un. La note du cadrage le dit désormais.

function corps_0_14_14(c) {
  return corps_0_14_13(c)
    .replace('Chaque plan porte un <b>cadrage</b>',
      `${maj('0.14.14', `Une <b>Carte Raccord</b> occupe la place d'un Gros Plan ou d'un Plan Moyen
      sur le banc — c'est par là qu'on l'accroche —, mais elle n'en est pas un : aucun bandeau qui
      compte des <b>cadrages</b> ne la trouve. Elle compte comme <b>Carte</b> et comme <b>Carte
      Raccord</b>, jamais comme <b>Plan</b>, et n'a pas de valeur de cadre.`)}
      Chaque plan porte un <b>cadrage</b>`);
}

// --- v0.14.13 --------------------------------------------------------------
// Le coût d'un Raccord redevient ce qui est imprimé sur lui : la variable de
// partie qui doublait ce malus disparaît, et le remplacement ne vise plus que
// le bandeau de coût.

function corps_0_14_13(c) {
  return corps_0_14_12(c)
    .replace('<b>Les cartes Raccord vous rapportent maintenant n × Raccord</b>',
      '<b>Les cartes Raccord vous rapportent n × Raccord</b>')
    .replace(/<td>Le <b>bandeau imprimé<\/b> des Cartes Raccord[\s\S]*?<\/td>/,
      `<td>${maj('0.14.13', `Le <b>bandeau de coût</b> d'un Raccord — « −2 × Raccord » — devient
      « n × Raccord ». Lui seul : un Raccord qui porte <b>autre chose</b>, ou un « n × Raccord » qui
      rapporte déjà, garde le sien — le pouvoir ne peut qu'améliorer. L'<b>Ouverture</b> et le
      <b>Générique de fin</b> ne sont jamais touchés. La carte qui le dit ne gagne rien elle-même ;
      entre deux, la plus généreuse l'emporte`)}</td>`)
    .replace(/<td><b>Chaque Carte Raccord vaut[\s\S]*?<\/td>/,
      `<td>${maj('0.14.13', `Ce qu'une Carte Raccord coûte est <b>écrit sur elle</b> — « −2 ×
      Raccord » sur les Raccords du jeu. Le décompte ne retire rien de plus : il n'y a pas de malus
      caché`)}</td>`);
}

// --- v0.14.12 --------------------------------------------------------------
// Le pouvoir du Raccord change de nature : il ne fixe plus une valeur, il
// remplace un bandeau. Une ligne du tableau à réécrire.

function corps_0_14_12(c) {
  return corps_0_14_11(c)
    .replace(/<td><b>Les Raccords vous rapportent n<\/b><\/td>\s*\n?\s*<td>[\s\S]*?<\/td>/,
      `<td><b>Les cartes Raccord vous rapportent maintenant n × Raccord</b></td>
      <td>${maj('0.14.12', `Le <b>bandeau imprimé</b> des Cartes Raccord de votre montage est
      <b>remplacé</b> par « n × Raccord » — leur « 1 × Plan » disparaît. Seul le <b>Raccord</b> est
      touché : l'Ouverture et le Générique de fin gardent le leur. La carte qui le dit ne gagne rien
      elle-même ; ce sont les Raccords qui marquent. Entre deux, la plus généreuse l'emporte`)}</td>`);
}

// --- v0.14.11 --------------------------------------------------------------
// Le coût d'un Raccord quitte la ligne cachée du montage pour devenir la valeur
// de la carte. Une phrase à réécrire dans le tableau, une note à ajouter.

function corps_0_14_11(c) {
  return corps_0_14_10(c)
    .replace(/<td>n points par Carte Raccord de votre montage[^<]*<\/td>/,
      `<td>${maj('0.14.11', `<b>Chaque Carte Raccord vaut −2 à qui la pose</b> — elle relie sans
      rien raconter, et l'étoffer coûte. Cette valeur se lit <b>au coin de la carte</b>, comme celle
      de tout plan ; ce bandeau la <b>remplace</b> pour toutes vos Cartes Raccord à la fois, et
      n'ajoute rien de son côté`)}</td>`);
}

// --- v0.14.10 --------------------------------------------------------------
// « Absente » ne se disait que d'une icône ; un bandeau neuf vient à côté, et
// les seuils changent d'écriture. Trois retouches dans le tableau, une note.

function corps_0_14_10(c) {
  return corps_0_14_9(c)
    .replace(/<tr><td><b>n si ICONE absente<\/b><\/td>\s*\n?\s*<td>n points si l’icône ne paraît nulle part<\/td>/,
      `${majTr('0.14.10')}<td class="maj-pastille" data-v="v0.14.10"><b>n si CIBLE absente</b></td>
      <td>n points si la cible ne paraît <b>nulle part</b> dans la portée. Une icône, mais aussi une
      <b>valeur de cadre</b>, une <b>Carte Raccord</b>, un <b>plan de mort</b>, un cadrage</td>`)
    .replace('      <td>Sa portée ◀ ▶</td></tr>\n    <span class="regle-maj"',
      `      <td>Sa portée ◀ ▶</td></tr>
    ${majTr('0.14.10')}<td class="maj-pastille" data-v="v0.14.10"><b>n si CIBLE est la plus présente</b></td>
      <td>n points si la cible <b>domine</b> sa portée — ou si elle en est la plus rare, au choix.
      La comparaison se fait dans sa famille : une icône se mesure aux six icônes, un cadrage aux
      quatre cadrages. <b>À égalité elle domine aussi</b> ; une cible absente ne domine rien</td>
      <td>Sa portée ◀ ▶</td></tr>
    <span class="regle-maj"`);
}

/** Une ligne de tableau entièrement neuve : le liseré se pose sur la ligne. */
function majTr(v) {
  return `<tr class="maj-tr" data-v="v${v}">`;
}

// --- v0.14.9 ---------------------------------------------------------------
// Quatre bandeaux qui ne comptent rien : ils changent une règle. Ils entrent à
// la suite du tableau, sous leur propre en-tête — les mêler aux autres ferait
// croire qu'ils rapportent des points.

function corps_0_14_9(c) {
  const signe = (v) => (v > 0 ? `+${v}` : `${v}`);
  return corps_0_14_8(c)
    // Les quatre pouvoirs de règle, à la fin du tableau des bandeaux.
    .replace('      <td>Sa portée ◀ ▶</td></tr>\n  </table>',
      `      <td>Sa portée ◀ ▶</td></tr>
    ${maj('0.14.9', '<b>Les pouvoirs de RÈGLE.</b> Ceux-là ne rapportent rien : ils changent une '
      + 'règle pour la seule joueuse qui les a dans son montage, et tant qu’ils y sont. Aucun '
      + 'symbole ne les dit — ils s’écrivent en toutes lettres sur la carte.')}
    <tr class="maj-tr"><td class="maj-pastille" data-v="v0.14.9"><b>Vous pouvez piocher sur la pioche PM / GP</b></td>
      <td>vous pouvez prendre la carte du <b>sommet de la pile</b>, que personne n’a vue, au lieu
      d’une carte de la rivière. Sans ce pouvoir, la pile ne se pioche pas</td>
      <td>Tant que la carte est dans votre montage</td></tr>
    <tr class="maj-tr"><td><b>Vous pouvez monter n séquences supplémentaires</b></td>
      <td>votre banc porte <b>n lignes de plus</b> que les cinq de la règle. Deux cartes
      s’additionnent</td><td>Tant que la carte est dans votre montage</td></tr>
    <tr class="maj-tr"><td><b>Vous pouvez monter n Plans supplémentaires</b></td>
      <td>votre montage compte <b>n plans de plus</b> que les dix de la règle. La fin de partie se
      déclenche donc à <b>votre</b> limite, pas à celle des autres</td>
      <td>Tant que la carte est dans votre montage</td></tr>
    <tr class="maj-tr"><td><b>Les Raccords vous rapportent n</b></td>
      <td>chaque Carte Raccord de votre montage vaut <b>n</b> au lieu de −2. C’est un
      <b>remplacement</b> : deux cartes qui le portent ne cumulent pas, la plus généreuse vaut</td>
      <td>Tant que la carte est dans votre montage</td></tr>
  </table>`)
    // Ce que coûte une Carte Raccord, dit une fois pour toutes.
    .replace('<b>La cible d’un bandeau.</b>',
      `${maj('0.14.9', `<b>Ce que coûte un Raccord.</b> Une Carte Raccord posée dans votre montage
      vous coûte <b>2 points</b> : elle relie, elle ne raconte rien. C’est ce
      montant que le pouvoir « Les Raccords vous rapportent +2 » retourne.`)}
    <b>La cible d’un bandeau.</b>`);
}

// --- v0.14.8 ---------------------------------------------------------------
// « 00:00 » n'est pas un instant : c'est l'absence de minutage. L'afficheur le
// dit maintenant — « --:-- » —, et les deux mentions du texte suivent. Rien du
// décompte ne bouge : ces plans étaient déjà retirés de la lecture de l'ordre.

function corps_0_14_8(c) {
  return corps_0_14_7(c)
    .replace('plan n’a ce minutage — à 00:00, cela vise les Raccords et les\n      Génériques',
      `plan n’a ce minutage — à ${maj('0.14.8', '<b>--:--</b>')}, cela vise les Raccords, les
      Génériques et les scènes de personnage`)
    .replace('les Raccords et Génériques, à 00:00, sont',
      `les plans sans minutage, à ${maj('0.14.8', '<b>--:--</b>')}, sont`);
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
