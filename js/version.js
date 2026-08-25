// Compteur de version — incrémenter à chaque modification livrée.
export const VERSION = '1.46';
export const BUILD_DATE = '2026-08-25 16:00';

export const CHANGELOG = [
  {
    v: '1.46',
    date: '25/08/2026',
    items: [
      "<b>Une carte qui vole se voit.</b> Elle ne glisse plus en ligne droite mais <b>se soulève et retombe</b>, grossit à mi-parcours, et porte un liseré orange avec son ombre portée. Elle prend aussi son temps — 620 ms au lieu de 360. À l’arrivée, la place où elle se pose <b>s’illumine brièvement</b> : on voit lequel des plans du banc vient de changer.",
      "<b>Le banc qui reçoit la carte est amené sous les yeux</b> s’il est hors de l’écran. Le coup d’une IA se terminait sous la ligne de flottaison : la carte volait vers un banc qu’on ne voyait pas.",
      "<b>Les Plans Larges et les Plans de départ de toutes les lignes tombent sur la même verticale</b>, quel que soit le nombre de cartes. Le calage se fait désormais <b>dans le flux</b> — la ligne qui a le plus de plans à gauche de son ancre fixe la colonne, les autres comblent l’écart —, si bien que le banc <b>défile de gauche à droite</b> quand cela déborde au lieu de laisser le plan central dériver. Un décalage en marges cessait de tenir dès que la place manquait.",
      "<b>Chaque ligne porte son compteur de points</b>, en pastille à son bout gauche : ce que les cartes de cette ligne rapportent. La pastille colle au bord du banc pendant qu’on fait défiler — le compte reste lisible quand la ligne est partie sur la droite.",
    ],
  },
  {
    v: '1.45',
    date: '25/08/2026',
    items: [
      "<b>La composition de la boîte vaut aussi en pleine partie.</b> Écarter une carte dans l’éditeur la retire désormais des pioches <b>et des rivières</b> — où elle est aussitôt remplacée, comme si on venait de la prendre ; la réactiver l’y remet, à une place tirée de la graine de la partie. Jusqu’ici, activer ou écarter une carte ne valait que pour les parties lancées ensuite : le paquet était constitué au départ et n’en démordait plus.",
      "Trois choses ne bougent pas pour autant : <b>les plans déjà posés</b> — ils font partie du film déjà raconté, les retirer réécrirait la partie —, <b>la carte en main</b>, dont le tour est engagé, et les cartes déjà jouées, qui ne reviennent pas dans la pioche. Le journal note le mouvement.",
      "La retouche vaut dans la <b>même fenêtre</b> comme dans une autre : on peut aller régler le matériel puis revenir à la table sans relancer la partie.",
      "<b>Le compte rendu de fin de partie montre les mêmes bancs qu’en jeu</b>, rendus par la même fonction : en mode Banc en lignes il se lit donc <b>ligne sur ligne</b>, chaque séquence sur la sienne et les ancres alignées, et les points de chaque plan s’y lisent au coin des cartes. Il redessinait jusqu’ici son propre banc, à côté de celui du jeu.",
      "<b>Le décalage d’ancrage se pose en marges opposées</b> et se borne à la place que le banc offre. Deux marges positives élargissaient la ligne du décalage : une ligne à peine longue sortait du cadre avant même d’être large, et son début devenait inatteignable. L’ancre vient au centre tant qu’il y a du jeu, et s’en approche seulement quand la ligne remplit le banc.",
    ],
  },
  {
    v: '1.44',
    date: '25/08/2026',
    items: [
      "<b>Deux fenêtres, un seul matériel.</b> On règle les cartes dans une fenêtre, on joue dans l’autre — souvent sur deux écrans : la retouche se voit désormais <b>aussitôt sur la table</b>, sans rien relancer. Les cartes de la rivière, celles en main et <b>les plans déjà posés</b> reprennent le minutage, les icônes, les pouvoirs et le numéro que l’éditeur vient de leur donner ; l’appariement des cartes doubles suit lui aussi. La partie, elle, ne franchit pas la frontière : chaque fenêtre garde la sienne.",
      "Le compte de la pioche — « 12 cartes en pioche » — remonte <b>à côté du titre de sa famille</b>, sur la même ligne. Sous la pioche, il s’ouvrait une rangée à lui seul : la table y gagne une trentaine de pixels de hauteur.",
    ],
  },
  {
    v: '1.43',
    date: '24/08/2026',
    items: [
      "<b>Quatre pouvoirs qui comptent des séquences</b>, et non des plans — ils lisent la forme du banc plutôt que son contenu carte par carte. <b>n × Séquence ≥ k</b> : n points par séquence d’au moins k plans. <b>n × Séquence ▲ / ▼</b> : n points par séquence placée au-dessus, ou en dessous, de celle qui porte le bandeau. <b>n × Plan de la plus longue séquence</b> : réglé sur 1, il vaut exactement le nombre de plans de votre plus longue séquence. <b>n × Séquence avec / sans …</b> : n points par séquence qui porte — ou ne porte pas — l’icône, le cadrage ou la Carte Raccord visée.",
      "Ces bandeaux portent une <b>pastille violette « Séquence »</b> pour qu’on ne les confonde pas avec la pastille blanche « Plan » : ce n’est pas une carte qu’ils comptent, c’est un bloc du banc. Leur portée ne se règle pas — c’est le montage entier qu’ils regardent, toujours. Un Raccord n’étant pas un plan, il ne compte pas dans la taille d’une séquence.",
      "<b>La zone de dépôt a la forme du plan qui va s’y poser</b> dans le mode Banc en lignes — la largeur d’un Gros Plan, d’un Plan Moyen, d’un Plan Large, et toute la hauteur d’une carte. On vise la place que la carte prendra, plus une flèche.",
      "<b>Les emplacements collent aux flancs de leur ligne</b> et n’occupent plus aucune largeur : ils flottent hors du flux. En ouvrir un d’un seul côté ne décale donc plus ni la ligne ni son ancre — les Plans Larges et les Plans de départ de toutes les lignes restent exactement alignés, et rien ne sort du banc.",
    ],
  },
  {
    v: '1.42',
    date: '24/08/2026',
    items: [
      "<b>Le banc en lignes devient un mode de jeu</b>, choisi sur l’accueil sous les options de partie : <b>Classique</b> ou <b>Banc en lignes</b>. Ce n’était pas une variable de plus mais une autre manière de monter le film — elle a donc son menu, et quitte la liste des Variables.",
      "Dans ce mode, <b>le Plan Large — ou le Plan de départ — tient le centre de sa ligne</b>. Il est l’ancre : ce qui s’accroche à sa gauche pousse vers la gauche, ce qui s’accroche à sa droite pousse vers la droite, et lui ne bouge plus. La ligne ne se recentrait avant à chaque pose, faisant glisser tout le film de côté alors qu’on n’avait rien déplacé.",
      "Dans ce mode toujours, <b>le montage se lit d’un seul tenant</b> — du premier plan en haut à gauche de la première ligne jusqu’au dernier plan en bas à droite de la dernière —, les lignes s’enchaînant comme les lignes d’un texte. L’ordre chronologique et les raccords par élément se lisent donc d’une ligne à la suivante, et non plus ligne par ligne.",
      "<b>Le dos de la pioche des Plans Larges est un Plan Large vierge</b> : le vert du cadrage, ses bandes, son libellé — la carte telle qu’elle est avant d’être imprimée — et un point d’interrogation à la place de l’illustration. On ne sait pas ce qui vient, mais on sait que c’est un Plan Large.",
      "<b>Un bouton « Images visibles » dans l’écran Matériel</b>, à côté du jeu lancé en partie. C’est le même réglage que sur l’accueil et sur la table de jeu : le basculer là le bascule partout — il n’y a plus à repasser par l’accueil pour regarder le matériel en lecture nue.",
    ],
  },
  {
    v: '1.41',
    date: '24/08/2026',
    items: [
      "Nouvelle variante — <b>le banc en lignes</b>. Le film ne se monte plus sur une bande unique : <b>chaque séquence tient sa propre ligne</b>. Un Plan Large, comme le Plan de départ, ouvre une ligne à lui seul ; les Plans Moyens et Gros Plans s’accrochent <b>à gauche ou à droite</b> de la ligne de leur choix. Une nouvelle séquence se pose <b>au-dessus ou en dessous</b> de la pile — jamais entre deux —, et l’aperçu s’écarte du banc dans la direction où elle ira, sans recouvrir les lignes déjà montées.",
      "Dans cette variante, <b>un Raccord ne relie plus rien</b> : deux séquences ne se touchent pas, elles se succèdent. Il se pose donc comme un plan ordinaire, en attendant le pouvoir qui lui sera donné.",
      "La variante se règle dans <b>Variables › Pose</b> — « Variante — banc en lignes ». Décochée, le banc se lit comme avant, sur une bande qui passe à la ligne quand elle déborde.",
    ],
  },
  {
    v: '1.40',
    date: '18/08/2026',
    items: [
      "<b>La carte ne se déforme plus en volant vers le banc.</b> C'est la carte entière qui partait — deux moitiés, 254 pixels de large — pour se comprimer jusqu'à la largeur de la moitié posée : on la voyait rétrécir puis se réduire à la seule partie gardée. C'est désormais la <b>moitié retenue</b> qui vole, à sa taille et dans ses proportions, du chutier jusqu'à sa place. Vrai pour les tours d'IA comme pour les vôtres.",
      "L'annonce des points sur les emplacements avant la pose est retirée. Les points restent sur les cartes du banc, au coin de chaque plan.",
    ],
  },
  {
    v: '1.39',
    date: '18/08/2026',
    items: [
      "<b>Chaque emplacement annonce ce qu’il rapporterait</b> — « +5 », « −2 » — sans qu’on ait à le survoler : on compare toutes les poses d’un coup d’œil, puis on choisit. Le compte est l’écart du total du banc, bandeaux déjà posés compris : une carte qui fait marquer ses voisines le montre.",
      "Au survol, <b>l’étiquette de l’emplacement passe sous l’aperçu</b> au lieu de lui passer devant : elle disait où poser, la carte le montre mieux qu’elle.",
      "<b>Le compte de plans monte au-dessus du banc qu’il décrit</b> — « Banc de Val · Plan 4 / 10 » —, chacune ayant le sien, plutôt que dans un bandeau commun où il fallait se rappeler de qui il parlait.",
      "Les réglages d’affichage — <b>Images visibles</b>, <b>Points visibles</b>, et le rappel du jeu de matériel — descendent au pied de la colonne de droite, sous Annuler et Quitter. Le bandeau du tour ne garde que ce qui change d’un instant à l’autre.",
    ],
  },
  {
    v: '1.38',
    date: '17/08/2026',
    items: [
      "<b>L’aperçu revient à côté de l’emplacement</b>, du côté où la carte va tomber : à gauche d’une séquence pour une pose à gauche, à droite pour une pose à droite. Il recouvre la flèche de l’emplacement et occupe la place que le plan prendra — sans pousser les cartes posées, et sans se mettre devant la carte voisine.",
      "<b>La consigne disparaît de la table.</b> Elle se lit d’elle-même : les cartes s’offrent, le banc ouvre ses emplacements, l’aperçu montre la place. Il ne reste un mot que dans l’impasse — quand la moitié visée ne se pose nulle part.",
      "<b>Le bandeau du tour passe dans la colonne de jeu</b>, calé à gauche au-dessus de la table. Centré sur toute la page, il s’ouvrait une rangée à lui seul : l’interface remonte d’autant, et démarre à la même hauteur que la colonne des joueuses.",
    ],
  },
  {
    v: '1.37',
    date: '17/08/2026',
    items: [
      "<b>Le tour se joue sur un seul écran.</b> Plus de Phase A ni de Phase B : on vise une moitié dans la rivière — elle se soulève, sa moitié se cadre —, le banc ouvre aussitôt ses emplacements, et un clic pose la carte. Elle vole du chutier au banc d’un seul geste. Plus de fenêtre intermédiaire où la carte attendait seule, plus de changement d’écran, plus d’attente. Les règles ne bougent pas : on dérushe, puis on monte — c’est l’écran qui ne les sépare plus.",
      "<b>L’aperçu de pose ne recouvre plus rien.</b> Le banc réserve une bande sous les cartes dès qu’on vise — une seule fois, pas au survol —, et l’aperçu s’y range, aligné sous l’emplacement visé. Les plans déjà posés ne bougent pas, et rien ne vient les cacher.",
      "La carte de la rivière se retourne toujours sans jouer le tour, et la moitié visée <b>survit au retournement</b>.",
    ],
  },
  {
    v: '1.36',
    date: '17/08/2026',
    items: [
      "<b>L’aperçu de pose ne déplace plus le banc.</b> Survoler un emplacement écartait les plans déjà posés pour faire de la place : tout bougeait sous le curseur, et depuis que le banc passe à la ligne, cela pouvait le faire basculer d’une ligne à l’autre puis revenir — d’où les sauts et le clignotement. L’aperçu se pose désormais <b>par-dessus</b> le banc, qui ne bouge plus qu’au clic, une fois la carte vraiment posée.",
      "<b>L’infobulle d’une carte montre son calcul.</b> Chaque bandeau y dit ce qu’il a trouvé et ce que cela lui rapporte — « 5 trouvés × 2 = 10 pts » — avant le total. Sur une carte à deux pouvoirs, le total ne se croyait plus que sur parole.",
    ],
  },
  {
    v: '1.35',
    date: '17/08/2026',
    items: [
      "<b>Les bandeaux identiques d’un même banc tiennent sur une ligne</b>, avec leur nombre en pastille — « ×6 » — et la somme de ce qu’ils ont rapporté. Six fois « 3 × Mort » occupaient six lignes pour une seule information : dans la colonne de score en partie, dans le détail de fin de partie, et dans le palmarès des bandeaux qui ont le plus rapporté, où le regroupement se fait joueuse par joueuse.",
      "L’éditeur : le bouton <b>+ second pouvoir</b> manquait dès qu’on sélectionnait plusieurs plans. Il est là, avec son bloc de réglage et son bouton d’effacement — un second pouvoir se pose donc sur toute une sélection d’un coup, comme le premier.",
    ],
  },
  {
    v: '1.34',
    date: '17/08/2026',
    items: [
      "<b>Les flèches de portée prennent la couleur de l’icône qu’elles entourent</b> — rouge sombre autour de l’Ennemi, brun autour d’un Véhicule, vert sombre autour de l’Héroïne. Des encres assez foncées pour tenir sur un bandeau vert, orange, rouge ou gris, avec un halo clair qui les détache partout. Sur les cartes comme dans les colonnes de score.",
      "<b>L’icône barrée se voit enfin.</b> La croix n’est plus un caractère minuscule mais deux barres rouges dessinées, bien plus grosses et cernées de blanc — tout en laissant voir, dans leurs quartiers, de quelle icône il s’agit.",
      "<b>« Le montage dans l’ordre » se lit sur tout le film</b>, de gauche à droite, séquences confondues. Et les Raccords, à 00:00, sont retirés de la lecture au lieu de l’interrompre : un Raccord glissé entre un plan à 75:00 et un plan à 65:00 ne sauve plus le désordre. Règles v0.13.15.",
      "Statistiques : les icônes <b>sur les cartes</b> et les icônes <b>réclamées par les bandeaux</b> font désormais deux tableaux distincts — l’offre et la demande, qu’un seul nombre confondait.",
      "<b>Le banc ne se réorganise plus pendant qu’on vise.</b> Les emplacements de pose se dressent en bandes verticales : ils coûtaient près de cent pixels chacun et suffisaient à faire passer le banc à la ligne avant même la pose, pour revenir en arrière juste après. Le banc garde donc la largeur qu’il aura une fois la carte posée.",
    ],
  },
  {
    v: '1.33',
    date: '17/08/2026',
    items: [
      "<b>Un pouvoir peut valoir des points négatifs.</b> La pastille passe alors au rouge — chiffre rouge sombre sur fond rouge clair — et un gros signe moins se dessine en barre pleine devant le chiffre. Au montage, le jeton du coin suit : rouge lui aussi quand le plan coûte des points.",
      "<b>Un plan peut porter deux pouvoirs</b>, côte à côte sur son bandeau, séparés d’un trait. Ils comptent tous les deux, chacun dans sa propre portée, et s’affichent tous les deux — sur la carte, dans l’infobulle, dans la colonne de score, dans les statistiques. L’éditeur ouvre le second emplacement d’un bouton <b>+ second pouvoir</b>, et le CSV a ses colonnes suffixées en 2.",
      "<b>Le banc de montage passe à la ligne.</b> Tant que tout tient, il reste sur une seule ligne ; dès que cela déborde, les séquences basculent en dessous. Une séquence ne se coupe jamais : ses plans se touchent, ils restent ensemble. Seule une séquence à elle seule plus large que le banc fait encore défiler.",
    ],
  },
  {
    v: '1.32',
    date: '17/08/2026',
    items: [
      "Statistiques des pouvoirs — <b>un bandeau ne vaut pas sa valeur, il vaut sa valeur multipliée par ce qu’il trouve à compter</b>. « 3 × ⛨ » ne rapporte 3 points que s’il y a une arme sur la table, et 30 s’il en trouve dix. La nouvelle colonne <b>déclencheurs</b> compte, sur tout le matériel, les plans qui font marquer ce pouvoir ; le <b>total</b> est le produit des deux. Les bandeaux en « n si… » ne se déclenchent qu’une fois.",
      "La colonne du bandeau se lit désormais en deux : <b>Points</b>, la pastille de valeur, et <b>Effet</b>, ce que cette valeur compte.",
      "<b>Chaque en-tête range son tableau.</b> Un premier clic trie du plus grand au plus petit — alphabétiquement sur une colonne de texte —, un second inverse. Les trois tableaux gardent leur tri chacun de leur côté.",
    ],
  },
  {
    v: '1.31',
    date: '17/08/2026',
    items: [
      "<b>La rivière montre bien trois cartes par famille</b> — y compris pour qui jouait déjà avant la v1.27. Une configuration enregistrée alors gardait l’ancien réglage « autant de cartes que de joueuses », et l’écrasait à chaque partie : à deux joueuses, la rivière n’en montrait que deux. La configuration se met désormais à jour à la relecture.",
      "Les quatre <b>Plans de départ sont rangés par minutage</b>, du plus court au plus long : on les compare dans l’ordre du film.",
      "<b>Ouverture, Générique de fin, Raccord : tous des Raccords.</b> Le libellé du bas d’un plan dit son type, pas son rôle — il indique donc « Raccord » sur les trois. Ce que la carte fait, on le lit à son illustration et aux emplacements qu’elle propose.",
      "Deux lignes de texte retirées : l’explication sous « Options de partie » et le « Version A — face 1 » sous les Plans de départ.",
    ],
  },
  {
    v: '1.30',
    date: '17/08/2026',
    items: [
      "Nouvel onglet du Matériel : <b>Statistiques des pouvoirs</b>. Chaque bandeau du jeu y est <b>dessiné comme sur la carte</b>, avec le nombre de plans qui le portent, sa part, ses valeurs, les cadrages qui l’accueillent, les points qu’il met sur la table, et son écart avec l’autre jeu de matériel. Deux vues d’ensemble complètent la liste : par famille de pouvoir et par valeur.",
      "En fin de partie : <b>la courbe des points</b>, coup par coup, une ligne par joueuse dans sa couleur — on y lit qui a mené et où l’écart s’est creusé.",
      "En fin de partie toujours : des <b>statistiques</b> — points marqués, points par carte, écart, Raccords, séquences, durée —, d’où viennent les points, et les bandeaux qui ont le plus rapporté.",
      "Le détail par joueuse ne se lit plus en toutes lettres mais <b>en bandeaux</b>, comme la colonne de jeu : chaque pouvoir dessiné, ce qu’il rapporte, et le total.",
      "En partie, la touche <b>F</b> retourne la carte survolée — dans le chutier comme en main, sans viser le petit bouton.",
      "La légende de la zone de pioche est retirée : la table se lit sans commentaire.",
      "L’accueil est allégé : ne restent que les trois options qui changent ce qu’on voit — <b>Illustrations</b>, <b>Points visibles</b>, <b>Mouvement des cartes</b>. Tout le reste — déroulé, pose, décompte, paquet, graine — vit dans <b>Variables</b>, où rien n’a été perdu.",
    ],
  },
  {
    v: '1.29',
    date: '16/08/2026',
    items: [
      "L’accueil crédite l’illustrateur : « Un jeu de <b>Valentin Drouet</b>, illustré par <b>Anders Lazaret</b> ».",
    ],
  },
  {
    v: '1.28',
    date: '16/08/2026',
    items: [
      "<b>Un Raccord n’est pas un plan.</b> Un Raccord, une Ouverture, un Générique relient ou encadrent le film : ils ne le racontent pas. Ils ne comptent donc plus dans le total qui arrête la partie — en jouer un n’avance pas vers la fin.",
      "<b>La fin se déclenche sur la première joueuse arrivée au bout.</b> Dès qu’elle pose son dernier plan, les autres ont droit à un tour chacune, puis la partie s’arrête. Elles ne finissent donc plus forcément avec le même nombre de plans, et un jeton <b>dernier tour</b> le signale dans le bandeau. Règles v0.13.14.",
      "Le compteur du bandeau suit le banc de celle qui joue — son nombre de plans, et non plus le numéro du tour de table.",
      "Le nombre de cartes restantes n’est plus recouvert par la pile de la pioche : la place qu’occupent ses couches décalées est réservée sous elle.",
    ],
  },
  {
    v: '1.27',
    date: '16/08/2026',
    items: [
      "Nouvelle vue du matériel : <b>Tous les plans</b> — Gros Plans, Plans Moyens, Plans Larges et Plans de départ dans une seule galerie, 150 plans triés par numéro. On y règle exactement comme ailleurs ; c’est la même vitre sur le même matériel, pas un autre jeu de cartes.",
      "<b>La rivière est déjà là pendant le choix du Plan de départ</b> : les deux chutiers s’affichent sous les quatre faces proposées, avec leurs boutons de rotation. On voit ce qui attend au premier dérushage — les cartes ne se prennent pas encore.",
      "L’infobulle d’une carte ne répète plus son pouvoir en toutes lettres sous les icônes : le bandeau en grand suffisait.",
      "<b>La rivière montre toujours trois cartes par famille</b>, quel que soit le nombre de joueuses : trois Plans Larges et trois cartes Plan Moyen / Gros Plan. À côté d’elles, leur pioche — celle des Plans Larges face cachée, celle des Plans Moyens / Gros Plans face visible. Règles v0.13.13.",
      "Le <b>nombre de cartes restantes</b> s’affiche sous chaque pioche. Il ne figure plus sur le dos de la pioche, qui le répétait.",
    ],
  },
  {
    v: '1.26',
    date: '16/08/2026',
    items: [
      "<b>Une Carte Raccord relie.</b> Glissée entre deux séquences, elle les raccorde forcément — elle ne peut plus s’y poser sans relier, et l’emplacement s’appelle <b>⛓ raccorder</b> (l’ancien « souder »). Aux deux bouts du montage, en revanche, elle se pose comme un plan ordinaire : on peut donc toujours la jouer, même sans deux séquences à relier. Règles v0.13.12.",
      "<b>Les cartes Plan Moyen / Gros Plan ne se présentent plus toujours sur leur recto.</b> Une carte posée sur la table tombe d’un côté ou de l’autre : la face visible est tirée au sort, reproductible par la graine de la partie. La carte prise garde la face sur laquelle elle a été prise.",
      "Un bouton <b>⟲ rotation</b> retourne une carte double sur son autre face et dit laquelle est visible : sous chaque carte du chutier avant de la prendre, et sous la carte en main pendant qu’on choisit sa moitié. Retourner ne joue pas le tour, et la moitié déjà choisie le reste.",
      "<b>Nouveau dos de pioche</b> : une amorce de pellicule — perforations aux deux bords, la marque au centre, le compte en pastille. Une pioche à laquelle on ne peut pas puiser se retire d’un cran au lieu de se délaver.",
    ],
  },
  {
    v: '1.25',
    date: '15/08/2026',
    items: [
      "<b>Correction : les deux moitiés d’une carte double étaient inversées.</b> Le recto porte le <b>Plan Moyen à gauche et le Gros Plan à droite</b> ; le verso, retourné autour de l’axe vertical, les échange. Les cartes se dessinent désormais dans ce sens, partout.",
      "La face jouée suit cette correction : un Gros Plan accroché <b>à gauche</b> d’une séquence est celui du <b>verso</b>, et à droite celui du <b>recto</b>. C’est l’inverse de ce qui était appliqué. Règles v0.13.11.",
      "L’emplacement de pose se clique sur <b>toute la carte en pointillés</b>, pas seulement sur son étiquette — c’est là que le regard est, et c’est la cible la plus large.",
      "L’aperçu de pose est nettement moins transparent : il se lit maintenant comme une carte, pas comme une ombre.",
    ],
  },
  {
    v: '1.24',
    date: '15/08/2026',
    items: [
      "<b>L’emplacement de pose se pré-visualise.</b> Une fois la moitié choisie, survoler un emplacement écarte le banc et y montre le plan en transparence, à la place exacte qu’il prendra — le mouvement est celui qu’aura le clic, sans qu’une carte en couvre une autre.",
      "L’aperçu montre la <b>face que le côté donne</b> : un Gros Plan accroché à gauche est celui du recto, à droite celui du verso. On voit donc son vrai minutage avant de poser, pas celui de l’autre face.",
      "On ne présume plus du genre d’une joueuse à son nom : « À elle de jouer » devient <b>« À son tour »</b>, et les consignes qui parlaient d’elle sont réécrites sans pronom.",
    ],
  },
  {
    v: '1.23',
    date: '15/08/2026',
    items: [
      "<b>Le tour d’une IA tient en un seul écran</b> : sa carte quitte le chutier et se pose directement dans son banc, la pioche recharge la place laissée vide, et la main passe. L’étape où sa carte attend au centre de la table n’est plus montrée — il n’y a rien à y décider. La joueuse humaine, elle, garde ses deux temps : la carte vient en main, puis elle choisit sa moitié et son emplacement.",
      "Les cartes d’un même coup volent ensemble plutôt que l’une après l’autre : la carte prise s’en va pendant que la pioche la remplace, ce qui se lit comme un seul mouvement.",
      "<b>Le tour d’une joueuse est désormais d’un seul tenant</b> : elle dérushe, elle monte, puis elle passe la main. On voit donc son coup entier — la carte qu’elle prend, puis la carte qu’elle pose dans son banc — au lieu de la voir disparaître d’un côté et réapparaître un tour plus tard de l’autre.",
      "Le dérushage se joue lui-même en deux temps, et le premier reste dans le chutier : la carte prise en sort pendant que la pioche renvoie une carte à la place laissée vide. Sans cette étape, le chutier avait déjà disparu et l’on ne voyait jamais la pioche le recharger.",
      "Pendant le tour d’une IA, la table ne s’adresse plus à vous par erreur : la consigne dit ce que la joueuse en cours est en train de faire, et sa carte ne se donne plus comme cliquable.",
      "L’ordre imprimé — toutes dérushent, puis toutes montent — reste disponible dans <b>Variables › Déroulé</b>. Sur 500 parties à trois IA Équilibrées et première joueuse fixée, le tour d’un seul tenant <b>réduit légèrement l’avantage du premier siège</b> : 38 / 34 / 27 % de victoires, contre 41 / 31 / 28 % dans l’ordre imprimé.",
      "Règles v0.13.10.",
    ],
  },
  {
    v: '1.22',
    date: '15/08/2026',
    items: [
      "<b>Les joueuses jouent l’une après l’autre, et cela se voit.</b> Chaque coup est rendu à son tour : on suit le tour de la première, puis de la suivante, au lieu de retrouver la table déjà jouée. Les IA ne bloquent rien — le clic de la joueuse humaine lui rend la main en moins de 150 ms, y compris sur une table de quatre avec trois Stratèges.",
      "<b>Les cartes se déplacent à l’écran.</b> La carte dérushée quitte son chutier — ou sa pioche — et rejoint le banc de la joueuse ; la pioche renvoie aussitôt une carte à la place laissée vide ; au montage, la carte s’envole de la main jusqu’à son emplacement exact dans le banc.",
      "Deux réglages dans <b>Variables › Rythme</b> : la pause avant le coup d’une IA et la durée du vol d’une carte. « Voir les cartes se déplacer » se décoche sur l’accueil pour revenir à un jeu instantané.",
      "La <b>première joueuse</b> se tire au sort ou se désigne : quand le tirage est écarté, un menu dit qui commence.",
      "Pendant le coup d’une IA ou le vol d’une carte, la table reste en place mais ne se laisse pas cliquer — un clic la repeindrait sous la carte en mouvement.",
      "Correction : sur un Plan Large, cliquer la carte défaisait sa sélection et escamotait les emplacements de pose. Un Plan Large n’a pas de moitié à choisir, cliquer dessus ne fait plus rien.",
      "Règles v0.13.9.",
    ],
  },
  {
    v: '1.21',
    date: '14/08/2026',
    items: [
      "Les marques d’un pouvoir se lisent à la taille des icônes : le <b>×</b>, le <b>si</b> et les flèches de portée <b>◀ ▶</b> étaient de la taille d’une ponctuation, ils passent au corps des pastilles. Les flèches se serrent contre ce qu’elles portent.",
      "Un bandeau ne déborde plus de sa carte : les icônes du bandeau se laissent rétrécir plutôt que déborder, et un Gros Plan — un tiers de carte — prend ses marques un cran plus bas. Un bandeau de couple y tenait mal.",
      "En partie, chaque plan du banc porte au coin haut droit <b>ce qu’il rapporte</b>, en face de son minutage. La somme des jetons fait le score. Le bouton <b>Points visibles</b> du bandeau de tour les masque et les rappelle, comme <b>Images visibles</b> ; l’option est aussi sur l’accueil.",
      "La colonne de droite perd sa table par source : <b>Icônes du banc</b> remonte en tête, et la liste des bandeaux devient <b>Score de la joueuse</b> — chaque bandeau avec ce qu’il rapporte, les points hors bandeau s’il y en a, et le total.",
    ],
  },
  {
    v: '1.20',
    date: '13/08/2026',
    items: [
      "Sur l’accueil, le rappel du matériel devient un sélecteur : <b>Matériel d’origine</b> à gauche, <b>Matériel modifié</b> à droite, et l’on bascule sans quitter la page. Un lien mène à l’éditeur.",
      "C’est désormais le <b>matériel modifié</b> qui part en partie par défaut. Un choix déjà enregistré n’est pas touché.",
      "Les deux jeux se nomment pareil partout où on les désigne : « Origine » et « Modifié », dans le sélecteur de l’écran Matériel comme dans les colonnes des statistiques.",
      "Nouveau pouvoir « n si aucun plan à / avant / après XX:00 » : n points si aucun plan du montage ne porte ce minutage. Réglé sur 00:00, il vise les Raccords et les Génériques — leur minutage bleu.",
      "Règles v0.13.7.",
      "<b>La portée devient une propriété de chaque pouvoir</b> : une ligne dans l’éditeur dit s’il compte parmi les cartes placées avant lui, après lui, dans sa séquence, ou dans le montage entier. Les flèches du bandeau la donnent à lire — « ◀ Héroïne » avant, « Héroïne ▶ » après, « ◀ Héroïne ▶ » dans la séquence, « Héroïne » tout court dans le montage.",
      "Le pouvoir « avant / après cette carte » n’est plus un type à part : c’est la portée d’un pouvoir ordinaire. Les cartes déjà réglées ainsi sont converties.",
      "Le réglage « Portée des bandeaux » des Variables ne vaut plus que pour les bandeaux imprimés qui ne précisent pas la leur.",
      "Règles v0.13.8.",
    ],
  },
  {
    v: '1.19',
    date: '13/08/2026',
    items: [
      "Un Plan de départ n’est plus un Plan Large : il a son propre cadrage. C’est un plan comme un autre pour tout ce qui compte des cartes du montage, mais « n × Plan Large » ne le compte plus, et aucun bandeau ne le désigne. Les colonnes d’icônes et les statistiques le comptent à part.",
      "La partie s’arrête quand chaque banc compte dix plans, <b>Plan de départ compris</b> — il reste donc neuf plans à monter. Le bandeau de tour affiche le rang du plan plutôt que celui du tour.",
      "Règles v0.13.6.",
      "Nouvelle sauvegarde : le jeu modifié s’exporte et se réimporte en CSV. Le fichier contient tout le matériel, une ligne par plan et une par carte, se corrige dans un tableur, et l’aller-retour ne crée aucune retouche fantôme — seule la différence avec l’imprimé est retenue.",
      "Sans illustration, la carte se réorganise : les icônes prennent toute la place du visuel sur le fond du cadrage, la languette blanche disparaît, le minutage double et le bandeau du pouvoir s’étale.",
      "Le crâne des plans de mort se lit avec les autres icônes, sur la carte comme dans l’aperçu au survol.",
      "Raccourcis de sélection : ⌘ (ou Ctrl) + clic ajoute ou retire une carte isolée, maj + clic prend toute la série depuis la dernière cliquée.",
    ],
  },
  {
    v: '1.18',
    date: '13/08/2026',
    items: [
      "Une icône peut être portée plusieurs fois par un même plan — deux armes, deux véhicules. Dans l’éditeur, un clic sur une pastille en ajoute une, un clic droit en retire une, et le compte s’affiche en badge. Un bandeau d’élément rapporte donc deux fois sur une carte à deux armes ; « Compter chaque icône, pas chaque plan » dans Variables ramène à l’ancienne lecture.",
      "Le bandeau de couple ne se lit plus entre deux plans voisins : il apparie les icônes réunies dans sa portée. Quatre icônes font deux couples, cinq en font deux aussi ; un couple de deux icônes différentes en demande une de chaque.",
      "Nouveau pouvoir « n × <icône ou cadrage> avant / après cette carte » : n points par plan du montage placé strictement avant — ou après — la carte porteuse et portant l’icône, ou du cadrage, visé.",
      "Les statistiques se filtrent par cadrage, par icône et par type de pouvoir ; un bandeau rappelle combien de plans les filtres retiennent.",
      "En partie, les colonnes de lecture s’épinglent sur une autre joueuse d’un clic sur sa case, et y restent — jusqu’à ce qu’on en désigne une autre ou qu’on revienne à celle dont c’est le tour.",
      "Le survol d’une carte posée dit ce qu’elle rapporte, à elle seule, dans ce montage.",
      "Règles v0.13.5.",
    ],
  },
  {
    v: '1.17',
    date: '12/08/2026',
    items: [
      "Deux nouveaux pouvoirs. « n × ◀ Plan ▶ avant / après XX:00 » rapporte n points par plan du montage dont le minutage est strictement antérieur — ou postérieur — au seuil indiqué. « n si le montage est dans l’ordre » rapporte n points si, lu de gauche à droite, chaque minutage est supérieur ou égal à celui de son voisin de gauche.",
      "Sur un Gros Plan, dont le bandeau ne fait qu’un tiers de carte, le seuil se lit « < 25:00 » ; l’aperçu au survol donne toujours la formule en toutes lettres.",
      "Règles v0.13.4 : les deux bandeaux rejoignent le tableau de décompte.",
      "La galerie du matériel tient quatre cartes de front dès 1500 px de fenêtre, cinq à partir de 1750, six au-delà — l’écran Matériel prend toute la largeur disponible et les cartes sont un peu resserrées.",
      "Correction : une carte qui ne porte qu’un plan suit de nouveau sa taille de police, tout étant exprimé en em ; son fond noir ne dépassait plus à droite d’un Gros Plan mais était revenu avec le resserrement de la galerie.",
    ],
  },
  {
    v: '1.16',
    date: '12/08/2026',
    items: [
      "Correction : le verso d’une carte se contentait d’inverser les deux moitiés du recto au lieu d’aller chercher les plans du verso. Un Gros Plan réglé à 25:00 au recto et 20:00 au verso affichait donc 25:00 des deux côtés. Les deux faces montrent désormais chacune ses propres plans, sur les cartes reconstituées comme dans l’aperçu de l’éditeur.",
      "La sélection survit au changement de vue : on règle d’un coup des Gros Plans et des Plans Moyens pris dans deux galeries différentes. Le compteur dit combien de plans sont sélectionnés hors de la vue courante.",
      "Un clic simple remplace la sélection ; maj+clic l’étend, du dernier plan cliqué jusqu’à celui-ci, ou ajoute un plan isolé.",
    ],
  },
  {
    v: '1.15',
    date: '12/08/2026',
    items: [
      "Nouveau filtre « Afficher » : recto et verso, recto seulement ou verso seulement. Dans les vues par cadrage il ne garde que les plans de la face demandée ; dans la vue des cartes, il retourne toutes les cartes du même côté.",
      "Le numéro d’un plan se renumérote à la main. Ce n’est qu’une étiquette : l’identité d’un plan reste son numéro imprimé, qui sert de clé et désigne son illustration, donc renuméroter ne casse aucun appariement.",
      "Les numéros portés par plus d’un plan sont signalés par un bandeau rouge en tête de l’écran Matériel, et le champ fautif est marqué « déjà pris ». Le tableau complet et son export rappellent le numéro imprimé à côté du nouveau.",
      "Deux boutons de nettoyage dans l’éditeur : « Enlever toutes les icônes » et « Enlever le pouvoir ». Ils valent pour un plan comme pour toute une sélection — de quoi remettre à plat les pouvoirs de plusieurs cartes d’un coup.",
    ],
  },
  {
    v: '1.14',
    date: '12/08/2026',
    items: [
      "Une carte qui ne porte qu’un plan se règle sur lui : le fond noir de la carte ne dépasse plus à droite d’un Gros Plan ni de certains Plans Moyens. Les vignettes d’une galerie ont toutes la même largeur, le libellé passant à la ligne au lieu de l’élargir.",
      "Le réglage en lot ne demande plus rien à confirmer : minutage, icônes, marqueur de mort et pouvoir partent aussitôt sur toute la sélection, exactement comme sur un plan seul.",
      "Une icône que seule une partie de la sélection porte est marquée « partielle » — un clic la donne alors à tous, un second la retire de tous.",
    ],
  },
  {
    v: '1.13',
    date: '12/08/2026',
    items: [
      "Le recto et le verso d’une carte sont deux plans distincts : « 201R » et « 201V » se règlent séparément, minutage compris. La face jouée se déduit du bout où la moitié visible se retrouve — un Gros Plan accroché à gauche est au recto, à droite au verso ; réglable dans Variables.",
      "Deux jeux de matériel coexistent en permanence, l’Imprimé et le Modifié : un sélecteur dit lequel part en partie, et le rappel s’affiche sur l’accueil comme sur la table de jeu. Le bouton qui effaçait tout a disparu — plus rien n’est détruit.",
      "Chaque carte s’active ou s’écarte de la boîte : seules les cartes activées partent dans le paquet, dans l’un comme dans l’autre jeu.",
      "Sélection multiple : clic pour ajouter ou retirer, maj+clic pour une plage. Un minutage, des icônes ou un pouvoir s’appliquent alors d’un coup à toute la sélection.",
      "Trois vues par cadrage — les cartes Plan Moyen / Gros Plan, les Gros Plans seuls, les Plans Moyens seuls — en plus des Plans Larges et des Plans de départ.",
      "Tri par numéro, par minutage ou par famille, et filtres pour n’afficher que les plans portant une icône, un type de pouvoir, une plage de minutage, une famille, ou seulement ce qui a été retouché.",
      "Nouvel onglet « Statistiques » : la boîte, les cadrages, les icônes, les pouvoirs et les minutages comptés sur le matériel tel qu’il part en partie, l’Imprimé et le Modifié côte à côte avec leur écart.",
      "Dans l’éditeur, toute valeur qui s’écarte de l’imprimé affiche la valeur imprimée à côté d’elle.",
    ],
  },
  {
    v: '1.12',
    date: '12/08/2026',
    items: [
      "L’écran Matériel devient un éditeur : chaque carte se règle à la main — son minutage, ses icônes et son pouvoir. La galerie reste sous les yeux à gauche, la carte éditée dans une colonne à droite.",
      "Le pouvoir s’écrit comme sur la carte : X points × ce que l’on compte — un cadrage, une icône, un couple d’icônes voisines, une mort, un plan sans personnage, une Carte Raccord, une carte de la séquence, ou l’absence d’une icône du montage.",
      "Les cartes Plan Moyen / Gros Plan s’éditent recto et verso ensemble : les deux faces sont affichées, et les deux moitiés se règlent côte à côte.",
      "L’appariement des moitiés est réglable carte par carte : la répartition imprimée est conservée tant qu’on n’y touche pas.",
      "Toutes les retouches sont enregistrées et le jeu s’y conforme aussitôt — table de jeu, décompte, Laboratoire et export des variables compris. Un bouton ramène une carte, ou tout le matériel, à l’imprimé.",
      "Nouvel onglet « Tableau complet » : l’état courant des 84 plans et des 50 cartes, avec un bouton d’export en PDF.",
      "Le réglage des minutages rejoint l’éditeur ; les valeurs déjà réglées sont reprises telles quelles.",
    ],
  },
  {
    v: '1.11',
    date: '12/08/2026',
    items: [
      "Les Plans de départ ne se tirent plus : chaque joueuse a toujours les deux cartes, version A et version B, donc ses quatre faces au choix. La boîte en contient quatre exemplaires de chaque, un par joueuse — il n’y avait aucune raison d’y mettre du hasard.",
      "Les IA jouent d’un bloc : leurs coups sont résolus sans attente ni rendu intermédiaire, et la main revient directement à la joueuse humaine. Plus de temporisation ni de « l’IA joue… » entre deux clics.",
      "La zone de jeu garde la même forme d’un tour à l’autre : elle ne se vide plus pendant les tours d’IA et sa hauteur ne varie plus d’une phase à l’autre. Rien n’apparaît ni ne disparaît sous le curseur.",
      "Choisir la moitié d’une carte ne repeint plus toute la table : seuls la carte, sa consigne et les emplacements du banc sont rafraîchis, et la page ne remonte plus en haut.",
      "La moitié non retenue n’est plus grisée : la carte reste entièrement lisible, un liseré orange marque simplement le côté choisi.",
    ],
  },
  {
    v: '1.10',
    date: '11/08/2026',
    items: [
      "La table de jeu est allégée : plus de journal, plus de titre de phase ni de consigne au-dessus des cartes — le bandeau du haut suffit à dire où l’on en est.",
      "Le dérushage se lit en deux lignes : la pioche des Plans Larges puis son chutier, la pioche des Plans Moyens / Gros Plans puis le sien. Chaque pioche est dessinée en pile de cartes décalées.",
      "La pioche des Plans Larges reste face cachée — ces cartes ont un vrai dos ; celle des Plans Moyens / Gros Plans montre sa face du dessus, ces cartes étant recto-verso.",
      "Les bancs de montage remontent sous la zone de pioche, dans la colonne de gauche ; les informations restent groupées à droite.",
      "Au montage, la carte Plan Moyen / Gros Plan est présentée entière : on clique la moitié que l’on veut laisser visible, puis l’emplacement dans son banc.",
      "Les cartes sont plus grandes et la part réservée à l’information passe de 31 à 40 % de leur hauteur ; les pastilles se resserrent quand elles sont nombreuses, pour ne jamais déborder — y compris sur un Gros Plan.",
      "Le survol d’une carte ouvre un aperçu : minutage en grand, chaque pastille nommée, et le bandeau d’objectif avec ce qu’il rapporte.",
      "Les illustrations s’affichent ou se masquent en cours de partie, d’un bouton dans le bandeau de tour.",
    ],
  },
  {
    v: '1.9',
    date: '11/08/2026',
    items: [
      "Les cartes n’apportent plus que leur illustration : le minutage, les pastilles, le bandeau d’objectif et le libellé de cadrage sont entièrement redessinés par l’application. Les visuels sont recadrés au-dessus de la zone d’information et leur minutage imprimé est effacé.",
      "Les pastilles affichées sont les vraies : les huit icônes — Héroïne, Ennemi, Allié, Objet, Arme, Véhicule, Mort, Plan sans personnage — sont découpées à même les cartes des PDF d’impression.",
      "Le minutage devient une variable : il s’affiche en police d’afficheur et se règle plan par plan dans Matériel › Minutages, pour mesurer son effet sur l’équilibrage.",
      "Nouveau panneau « Icônes du banc » : l’application recense les éléments, les cadrages, les Cartes Raccord, les plans de mort et les plans sans personnage, et les affiche avec leurs icônes.",
      "Les colonnes de score montrent chaque bandeau avec ses icônes plutôt qu’en toutes lettres.",
      "Le banc de montage reste centré : le Plan de départ s’ouvre au milieu, et l’ensemble demeure centré même quand on pose à gauche.",
      "Règles v0.13.1 : le placement ne dépend pas du minutage, mais certaines cartes rapportent selon le minutage des plans du montage.",
    ],
  },
  {
    v: '1.8',
    date: '11/08/2026',
    items: [
      "Correction du vrai défaut de mise à jour : la v1.7 pouvait s’afficher avec la mise en page de la v1.6, parce que le navigateur gardait un app.js périmé à côté d’un version.js à jour — et le contrôle de version, qui comparait version.js à lui-même, n’y voyait rien.",
      "Toutes les adresses de modules portent désormais le numéro de version : à chaque publication elles changent toutes, et le cache ne peut plus resservir l’ancien code.",
      "La page d’amorçage ne cite plus aucune version : elle demande au serveur laquelle est publiée, puis charge le code correspondant. Même servie depuis le cache, elle ouvre donc toujours la dernière version.",
      "Le contrôle de version s’appuie sur un fichier version.json relu hors de tout cache, et le rechargement repart sur une adresse neuve pour que le document lui-même échappe au cache.",
      "Une mise à jour détectée en pleine partie n’interrompt plus rien : elle propose un bandeau au lieu de recharger.",
    ],
  },
  {
    v: '1.7',
    date: '11/08/2026',
    items: [
      "La table de jeu est réorganisée : les bancs de montage occupent toute la largeur de la page, les uns sous les autres, et restent visibles en permanence.",
      "La zone de draft — choix du Plan de départ, dérushage, montage — est placée au-dessus des bancs ; les chutiers et pioches s’y rangent côte à côte pour rester compacts.",
      "Les panneaux d’information (joueuses, score, bandeaux du banc, journal, annuler et quitter) sont réunis en une seule colonne, à droite.",
      "La graine n’est plus affichée pendant la partie.",
    ],
  },
  {
    v: '1.6',
    date: '11/08/2026',
    items: [
      "Fini les versions périmées au rafraîchissement : un service worker force chaque fichier à repasser par le réseau — le cache de dix minutes de l’hébergeur et celui du navigateur ne retiennent plus rien. En contrepartie, le site reste consultable hors ligne sur sa dernière version chargée.",
      "Le site surveille lui-même js/version.js : dès qu’une version plus récente est publiée, la page se recharge une fois automatiquement (jamais en pleine partie) ; si un cache tenace résiste, un bandeau propose un rechargement forcé qui vide tous les caches.",
      "Un fichier .nojekyll accélère la mise en ligne sur GitHub Pages.",
    ],
  },
  {
    v: '1.5',
    date: '11/08/2026',
    items: [
      "L’accueil repasse sur deux colonnes : les joueuses et le bouton Commencer la partie à gauche, les options de partie et les réglages rapides à droite.",
    ],
  },
  {
    v: '1.4',
    date: '11/08/2026',
    items: [
      "Les règles du jeu sont versionnées à part du site : la page Règles affiche la version en vigueur (v0.13) et garde chaque version précédente, texte intégral compris, dans un onglet « Versions des règles ».",
      "À la prochaine modification de règle, le passage changé s’affichera en violet avec le numéro de version qui l’a introduit.",
      "Nouvelle palette des joueuses, en pastel : violet, bleu, rose, orange. Les noms restent lisibles grâce à une teinte d’encre assortie.",
      "L’accueil est resserré sur une colonne : joueuses, bouton Commencer la partie, options de partie, puis réglages rapides.",
      "Le sous-titre crédite l’auteur, et les blocs Personnages et éléments, Le matériel ainsi que les textes d’explication disparaissent de l’accueil — tout est dans l’onglet Matériel.",
    ],
  },
  {
    v: '1.3',
    date: '11/08/2026',
    items: [
      "Les cartes portent leurs illustrations : les 84 visuels sont extraits des PDF d’impression et servis en WebP, 1,6 Mo pour l’ensemble du matériel.",
      "Une case « Illustrations » sur l’accueil bascule entre la carte imprimée et la lecture nue — minutage, pastilles et bandeau seuls — pour travailler l’équilibrage sans se laisser distraire par l’image.",
      "Les visuels confirment la correspondance page ↔ numéro de plan : les minutages et les personnages imprimés coïncident avec les données du tableau de répartition.",
      "Les Plans Larges 101 et 102 apparaissent pour ce qu’ils sont — des gabarits verts sans illustration ni pastilles, à compléter.",
    ],
  },
  {
    v: '1.2',
    date: '11/08/2026',
    items: [
      "Les règles officielles v0.13 sont arrivées : le moteur est refait dessus, du dérushage au décompte.",
      "Le tour se joue désormais en deux phases — Phase A le Dérushage, où chacune pioche une carte dans un chutier ou sur la pioche, puis Phase B le Montage, où chacune la pose.",
      "Deux chutiers alimentés en continu, un par type de pioche, dimensionnés au nombre de joueuses.",
      "La pose se fait par recouvrement : une carte Plan Moyen / Gros Plan se glisse sous les précédentes et ne laisse voir qu’un seul de ses deux plans — c’est lui qui compte.",
      "Le banc se lit en séquences : un Plan Large en ouvre toujours une nouvelle, deux Plans Larges ne peuvent pas se toucher, et une Carte Raccord soude deux séquences voisines.",
      "Le Générique ouvre ou ferme le film et bloque ce bord du montage ; la moitié à double lecture peut être jouée en Ouverture ou en Crédits.",
      "Décompte refait : le Raccord rapporte par carte de sa séquence, le Générique par Carte Raccord du montage. La portée des autres bandeaux, muette dans les règles, est réglable.",
      "Les six éléments prennent leurs vrais noms : Héroïne, Ennemi, Allié, Arme, Objet, Véhicule.",
      "Matériel recalé : 14 Plans Larges, 8 Plans de départ en 2 versions recto-verso, 50 cartes Plan Moyen / Gros Plan.",
      "La partie s’arrête au 10e plan posé, comme sur la fiche de score.",
    ],
  },
  {
    v: '1.1',
    date: '11/08/2026',
    items: [
      "Première mise en ligne : accueil, partie, matériel, règles, laboratoire d’équilibrage, historique et versions.",
      "Matériel modélisé depuis les PDF de cartes et la répartition v0.13, cartes dessinées à la volée — minutage, pastilles d’éléments, bandeau d’objectif.",
      "De 1 à 4 joueuses, humaines ou remplacées par une IA Novice, Équilibrée ou Stratège.",
      "Déroulé et décompte reconstitués faute de document de règles, entièrement pilotés par les variables.",
    ],
  },
];
