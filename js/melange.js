// ---------------------------------------------------------------------------
// EDIT — l'assemblage des cartes à deux Gros Plans
// ---------------------------------------------------------------------------
// Une carte ordinaire est coupée en deux au centre : elle porte un Gros Plan à
// GAUCHE et un à DROITE. Lesquels vont ensemble, et de quel côté : c'est
// l'assemblage, et il compte — la moitié gauche ne se monte qu'à gauche d'une
// séquence, la droite qu'à droite.
//
// Ce module ne connaît ni le DOM ni la configuration : il reçoit des moitiés,
// il rend un assemblage. C'est ce qui permet de l'éprouver sans navigateur.
//
// Une moitié, telle qu'il a besoin de la connaître :
//   { ref, num, tc, el, mort, transition, objs }
// `ref` est le numéro du Gros Plan dans la boîte — son identité —, `num` celui
// qu'on lit dessus, `el` ses icônes, la DOMINANTE en premier.

/**
 * Le côté où la convention de l'auteur range un Gros Plan : les minutages de la
 * première moitié du film — 01', 10', 20', 30' — à GAUCHE de la carte, ceux de
 * la seconde — 40', 50', 60', 70' — à DROITE. Un plan sans minutage (« -- »),
 * le Raccord compris, va où il reste de la place : `null`.
 */
export function coteConvenu(m) {
  if (!m || !m.tc) return null;
  return m.tc < 40 ? 'G' : 'D';
}

/**
 * Les contraintes qu'un assemblage peut respecter. Chacune se coche : on
 * choisit celles qui comptent, et le mélange fait de son mieux avec.
 *
 * `dur` marque celles qui pèsent le plus lourd — les autres cèdent d'abord
 * quand tout ne peut pas être satisfait à la fois.
 */
export const CONTRAINTES = [
  { id: 'CONVENTION', dur: true, label: 'Chaque chrono de son côté',
    aide: 'la convention de l’auteur : 01’, 10’, 20’, 30’ à gauche de la carte ; 40’, 50’, 60’, 70’ à droite ; '
      + 'les « -- » et le Raccord où il reste de la place' },
  { id: 'RACCORD', label: 'Jamais deux Raccords sur la même carte',
    aide: 'on ne monte qu’une moitié : un Raccord à côté d’un autre, c’est un Raccord perdu' },
  { id: 'DOMINANTE', label: 'Deux icônes dominantes différentes',
    aide: 'la grande icône de chaque moitié : deux fois la même, et la carte ne sert qu’un besoin' },
  { id: 'ICONE', label: 'Aucune icône en commun entre les deux moitiés',
    aide: 'plus strict : la carte couvre alors deux besoins sans recoupement' },
  { id: 'POUVOIR', label: 'Deux pouvoirs différents',
    aide: 'même type et même cible : la carte ne propose qu’un seul choix' },
  { id: 'MORT', label: 'Jamais deux plans de mort ensemble',
    aide: 'les plans de mort se répartissent sur autant de cartes' },
  { id: 'SANS_MINUTAGE', label: 'Jamais deux « -- » ensemble',
    aide: 'un plan sans chrono se range partout : en mettre deux sur une carte en gâche un' },
  { id: 'EXEMPLAIRES', label: 'Pas plus d’exemplaires que la boîte',
    aide: 'la boîte imprime certains Gros Plans plusieurs fois — le Raccord, l’Ouverture, la Fin et '
      + 'la plupart des « -- » ; un Gros Plan posé plus souvent est en trop — le mélange ne peut pas le '
      + 'corriger, il le signale' },
];

export const CONTRAINTES_PAR_DEFAUT = ['CONVENTION', 'RACCORD', 'DOMINANTE', 'MORT'];

const POIDS = Object.fromEntries(CONTRAINTES.map((c) => [c.id, c.dur ? 10 : 1]));

const signature = (o) => (o ? `${o.kind}|${o.el || ''}${(o.els || []).join('+')}${
  o.format || ''}${o.cible || ''}` : '');

/**
 * Ce qui cloche entre les deux moitiés d'une carte, contrainte par contrainte.
 * Rend la liste des identifiants enfreints — vide quand la carte est bonne, ou
 * quand il lui manque une moitié : une carte incomplète n'a rien à comparer,
 * hormis le côté de la moitié qu'elle porte.
 */
export function fautes(g, d, actives) {
  const out = [];
  const veut = (id) => actives.includes(id);
  if (veut('CONVENTION') && (coteConvenu(g) === 'D' || coteConvenu(d) === 'G')) out.push('CONVENTION');
  if (!g || !d) return out;
  if (veut('RACCORD') && g.transition === 'RACCORD' && d.transition === 'RACCORD') out.push('RACCORD');
  if (veut('DOMINANTE') && g.el.length && g.el[0] === d.el[0]) out.push('DOMINANTE');
  if (veut('ICONE') && g.el.some((e) => d.el.includes(e))) out.push('ICONE');
  if (veut('POUVOIR')) {
    const a = g.objs.map(signature).filter(Boolean);
    const b = d.objs.map(signature).filter(Boolean);
    if (a.some((x) => b.includes(x))) out.push('POUVOIR');
  }
  if (veut('MORT') && g.mort && d.mort) out.push('MORT');
  if (veut('SANS_MINUTAGE') && !g.tc && !d.tc && !g.transition && !d.transition) out.push('SANS_MINUTAGE');
  return out;
}

/** Combien de fois chaque Gros Plan est posé, toutes cartes et tous côtés confondus. */
function comptes(cartes) {
  const n = new Map();
  for (const c of cartes) for (const m of [c.g, c.d]) if (m) n.set(m.ref, (n.get(m.ref) || 0) + 1);
  return n;
}

/**
 * Les fautes de chaque carte d'un assemblage, dans l'ordre des cartes. C'est
 * `fautes`, plus ce qui ne se lit que sur l'ensemble : un Gros Plan posé plus
 * souvent que la boîte ne l'imprime. `attendus` dit, par numéro, combien de
 * fois la boîte l'imprime — un, quand il n'y est pas.
 */
export function fautesParCarte(cartes, actives, attendus = new Map()) {
  const n = actives.includes('EXEMPLAIRES') ? comptes(cartes) : null;
  return cartes.map((c) => {
    const f = fautes(c.g, c.d, actives);
    if (n && [c.g, c.d].some((m) => m && n.get(m.ref) > (attendus.get(m.ref) || 1))) f.push('EXEMPLAIRES');
    return f;
  });
}

/** Le compte des fautes d'un assemblage entier, contrainte par contrainte. */
export function bilan(cartes, actives, attendus) {
  const par = Object.fromEntries(actives.map((id) => [id, 0]));
  let mauvaises = 0;
  for (const f of fautesParCarte(cartes, actives, attendus)) {
    for (const id of f) par[id] = (par[id] || 0) + 1;
    if (f.length) mauvaises++;
  }
  return { par, mauvaises, total: cartes.length, fautes: Object.values(par).reduce((a, b) => a + b, 0) };
}

/** Un tirage sans biais, sur une suite de nombres qu'on peut rejouer. */
function melanger(liste, rand) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Refait l'assemblage. Toutes les moitiés sont remises en jeu — n'importe
 * laquelle peut changer de carte ET de côté : c'est ce qu'il faut pour ranger
 * chaque minutage du bon côté.
 *
 * La méthode est un tirage suivi de réparations : on part d'un ordre, puis on
 * cherche, pour chaque carte fautive, un échange de deux moitiés qui fait
 * baisser le coût. On recommence tant qu'on progresse, et l'on recommence tout
 * depuis un autre tirage si l'on n'a pas trouvé mieux. Ce n'est pas une preuve
 * d'optimalité, mais un assemblage sans faute est trouvé quand il en existe un
 * raisonnablement accessible.
 *
 * `brasser` à false, le premier essai part de l'assemblage en place : on
 * CORRIGE, en déplaçant le moins possible. À true, on repart d'un tirage : on
 * MÉLANGE, et l'on obtient un autre assemblage qui tient les mêmes contraintes.
 *
 * `cartes` : [{ g, d }], toutes complètes. Rend le meilleur assemblage trouvé,
 * dans le même ordre de cartes.
 */
export function melangerMoities(cartes, actives, rand = Math.random, essais = 40, brasser = false, attendus) {
  const depart = cartes.flatMap((c) => [c.g, c.d]);
  const n = cartes.length;
  // Le nombre d'exemplaires ne dépend pas de la place des moitiés : aucun
  // échange ne le répare. On le laisse hors du coût, le bilan le signalera.
  const utiles = actives.filter((id) => id !== 'EXEMPLAIRES');
  const coutCarte = (o, k) => fautes(o[2 * k], o[2 * k + 1], utiles).reduce((s, id) => s + POIDS[id], 0);
  const coutTotal = (o) => { let s = 0; for (let k = 0; k < n; k++) s += coutCarte(o, k); return s; };

  let meilleur = null;
  for (let e = 0; e < essais; e++) {
    const ordre = e === 0 && !brasser ? depart.slice() : melanger(depart, rand);
    let cout = coutTotal(ordre);

    for (let tour = 0; tour < 8 && cout; tour++) {
      let bouge = false;
      for (let i = 0; i < ordre.length && cout; i++) {
        const ki = i >> 1;
        if (!coutCarte(ordre, ki)) continue;
        for (let j = 0; j < ordre.length; j++) {
          if (i === j) continue;
          const kj = j >> 1;
          const deux = (o) => (ki === kj ? coutCarte(o, ki) : coutCarte(o, ki) + coutCarte(o, kj));
          const avant = deux(ordre);
          [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
          const apres = deux(ordre);
          if (apres < avant) {
            cout += apres - avant; bouge = true;
            if (!coutCarte(ordre, ki)) break;
          } else {
            [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
          }
        }
      }
      if (!bouge) break;
    }

    if (!meilleur || cout < meilleur.cout) meilleur = { ordre: ordre.slice(), cout };
    if (!meilleur.cout) break;
  }

  const out = cartes.map((_, k) => ({ g: meilleur.ordre[2 * k], d: meilleur.ordre[2 * k + 1] }));
  return {
    cartes: out,
    bilan: bilan(out, actives, attendus),
    // Ce qui a effectivement changé de place, pour le dire à l'écran.
    deplaces: meilleur.ordre.filter((m, i) => m !== depart[i]).length,
  };
}

/**
 * Le relevé des Gros Plans : sur combien de cartes chacun se trouve, à côté de
 * ce que la boîte en imprime (`attendus`, par numéro — un par défaut). Zéro,
 * c'est un plan qu'aucune carte ne porte : il ne se jouera pas. Plus que la
 * boîte, il est en trop ; moins, il en manque un exemplaire.
 */
export function repartition(grosPlans, cartes, attendus = new Map()) {
  const n = comptes(cartes);
  const lignes = grosPlans.map((m) => ({ ...m, n: n.get(m.ref) || 0, attendu: attendus.get(m.ref) || 1 }));
  return {
    lignes,
    absents: lignes.filter((x) => x.n === 0).length,
    enTrop: lignes.filter((x) => x.n > x.attendu).length,
    enMoins: lignes.filter((x) => x.n > 0 && x.n < x.attendu).length,
    doubles: lignes.filter((x) => x.attendu > 1).length,
    max: lignes.reduce((m, x) => Math.max(m, x.n), 0),
  };
}
