// ---------------------------------------------------------------------------
// EDIT — l'assemblage des cartes Plan Moyen / Gros Plan
// ---------------------------------------------------------------------------
// Une carte double est une **feuille** qui porte deux moitiés : un Plan Moyen
// et un Gros Plan, qui ne viennent pas de la même scène. C'est cet appariement
// qui fait la richesse du paquet — et sa fragilité : deux moitiés qui se
// ressemblent trop rendent la carte terne, et deux Raccords sur la même feuille
// en gâchent un.
//
// Ce module ne connaît ni le DOM ni la configuration : il reçoit des moitiés,
// il rend un appariement. C'est ce qui permet de l'éprouver sans navigateur.

/**
 * Les contraintes qu'un assemblage peut respecter. Chacune se coche : on
 * choisit celles qui comptent, et le mélange fait de son mieux avec.
 *
 * `dur` marque celles qu'on ne relâche jamais — les autres cèdent d'abord
 * quand tout ne peut pas être satisfait à la fois.
 */
export const CONTRAINTES = [
  { id: 'SCENE', dur: true, label: 'Deux moitiés de scènes différentes',
    aide: 'une carte qui montre deux fois la même scène ne raconte rien de plus' },
  { id: 'RACCORD', label: 'Jamais deux Raccords sur la même carte',
    aide: 'un Raccord au dos d’un autre, c’est un Raccord perdu' },
  { id: 'ICONE', label: 'Aucune icône en commun entre les deux moitiés',
    aide: 'la carte couvre alors deux besoins au lieu d’un' },
  { id: 'POUVOIR', label: 'Deux pouvoirs différents',
    aide: 'même type et même cible : la carte ne propose qu’un seul choix' },
  { id: 'MORT', label: 'Jamais deux plans de mort ensemble',
    aide: 'les six plans de mort se répartissent sur six cartes' },
  { id: 'FAMILLE', label: 'Deux familles différentes',
    aide: 'Arme avec Arme, Véhicule avec Véhicule : la carte se referme sur un thème' },
  { id: 'PAIRE_UNIQUE', label: 'Jamais deux fois le même appariement',
    aide: 'deux cartes identiques valent une carte et un doublon' },
];

export const CONTRAINTES_PAR_DEFAUT = ['SCENE', 'RACCORD', 'ICONE', 'MORT'];

/**
 * Une moitié, telle que le mélange a besoin de la connaître. `num` est son
 * numéro imprimé — son identité —, `scene` la scène dont elle vient.
 */
const signature = (o) => (o ? `${o.kind}|${o.el || ''}${(o.els || []).join('+')}${
  o.format || ''}${o.cible || ''}` : '');

/**
 * Ce qui cloche entre deux moitiés, contrainte par contrainte. Rend la liste
 * des identifiants enfreints — vide quand la carte est bonne.
 */
export function fautes(pm, gp, actives) {
  const out = [];
  const veut = (id) => actives.includes(id);
  if (!pm || !gp) return out;
  if (veut('SCENE') && pm.scene === gp.scene) out.push('SCENE');
  if (veut('RACCORD') && pm.transition && gp.transition) out.push('RACCORD');
  if (veut('ICONE') && pm.el.some((e) => gp.el.includes(e))) out.push('ICONE');
  if (veut('POUVOIR')) {
    const a = pm.objs.map(signature).filter(Boolean);
    const b = gp.objs.map(signature).filter(Boolean);
    if (a.some((x) => b.includes(x))) out.push('POUVOIR');
  }
  if (veut('MORT') && pm.mort && gp.mort) out.push('MORT');
  if (veut('FAMILLE') && pm.famille === gp.famille) out.push('FAMILLE');
  return out;
}

/** Le compte des fautes d'un assemblage entier, contrainte par contrainte. */
export function bilan(cartes, actives) {
  const par = Object.fromEntries(actives.map((id) => [id, 0]));
  let mauvaises = 0;
  const vues = new Map();
  for (const c of cartes) {
    const f = fautes(c.pm, c.gp, actives);
    if (actives.includes('PAIRE_UNIQUE')) {
      const cle = `${c.pm ? c.pm.num : '?'}|${c.gp ? c.gp.num : '?'}`;
      if (vues.has(cle)) f.push('PAIRE_UNIQUE');
      vues.set(cle, true);
    }
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
 * Réapparie les cartes. Les Plans Moyens restent où ils sont : ce sont les
 * **Gros Plans** que l'on redistribue — cela suffit à explorer tous les
 * assemblages, et cela garde une lecture simple de ce qui a bougé.
 *
 * La méthode est un tirage suivi de réparations : on brasse, puis on cherche,
 * pour chaque carte fautive, un échange avec une autre carte qui améliore les
 * deux. On recommence tant qu'on progresse, et l'on recommence tout depuis un
 * autre tirage si l'on n'a pas trouvé mieux. Ce n'est pas une preuve
 * d'optimalité — le problème n'en admet pas de simple —, mais un assemblage
 * sans faute est trouvé quand il en existe un raisonnablement accessible.
 *
 * `cartes` : [{ pm, gp }] dans l'ordre des rangs. Rend le meilleur trouvé.
 */
export function melangerMoities(cartes, actives, rand = Math.random, essais = 60) {
  const pms = cartes.map((c) => c.pm);
  const gps = cartes.map((c) => c.gp);
  let meilleur = null;

  const evaluer = (ordre) => bilan(pms.map((pm, i) => ({ pm, gp: ordre[i] })), actives);

  for (let e = 0; e < essais; e++) {
    // Le premier essai part de l'assemblage en place : si tout va déjà bien,
    // le mélange ne casse rien pour le plaisir de brasser.
    let ordre = e === 0 ? gps.slice() : melanger(gps, rand);
    let b = evaluer(ordre);

    // Réparation par échanges : on ne garde un échange que s'il fait baisser
    // le compte total des fautes.
    for (let tour = 0; tour < 6 && b.fautes; tour++) {
      let bouge = false;
      for (let i = 0; i < ordre.length; i++) {
        if (!fautes(pms[i], ordre[i], actives).length
          && !(actives.includes('PAIRE_UNIQUE'))) continue;
        for (let j = 0; j < ordre.length; j++) {
          if (i === j) continue;
          const essai = ordre.slice();
          [essai[i], essai[j]] = [essai[j], essai[i]];
          const b2 = evaluer(essai);
          if (b2.fautes < b.fautes) { ordre = essai; b = b2; bouge = true; }
          if (!b.fautes) break;
        }
        if (!b.fautes) break;
      }
      if (!bouge) break;
    }

    if (!meilleur || b.fautes < meilleur.bilan.fautes) meilleur = { ordre, bilan: b };
    if (!meilleur.bilan.fautes) break;
  }

  return {
    cartes: pms.map((pm, i) => ({ pm, gp: meilleur.ordre[i] })),
    bilan: meilleur.bilan,
    // Ce qui a effectivement changé de place, pour le dire à l'écran.
    deplaces: meilleur.ordre.filter((g, i) => g !== gps[i]).length,
  };
}

/**
 * Le relevé des moitiés : combien de cartes portent chacune. Zéro, c'est une
 * moitié qu'on a dessinée mais qui ne paraît nulle part ; deux ou plus, c'est
 * une moitié qui revient — ce qui peut être voulu, les Raccords le sont.
 */
export function repartition(moities, cartes, cote) {
  const compte = new Map();
  for (const c of cartes) {
    const m = cote === 'GP' ? c.gp : c.pm;
    if (m) compte.set(m.num, (compte.get(m.num) || 0) + 1);
  }
  const lignes = moities.map((m) => ({ ...m, n: compte.get(m.num) || 0 }));
  return {
    lignes,
    absentes: lignes.filter((x) => x.n === 0).length,
    uniques: lignes.filter((x) => x.n === 1).length,
    repetees: lignes.filter((x) => x.n > 1).length,
    max: lignes.reduce((m, x) => Math.max(m, x.n), 0),
  };
}
