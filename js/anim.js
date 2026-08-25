// ---------------------------------------------------------------------------
// EDIT — les cartes en mouvement
// ---------------------------------------------------------------------------
// Une carte qui change de place ne saute pas d'un rendu à l'autre : elle vole.
// Le principe est celui du FLIP — on relève la boîte de départ avant que
// l'état ne change, celle d'arrivée après le rendu, et l'on interpole entre
// les deux un clone posé au-dessus de la page. L'élément d'arrivée reste
// invisible le temps du vol, si bien qu'on ne voit jamais deux cartes.
//
// Le clone est du HTML mort : aucun gestionnaire n'y est branché, et la couche
// qui le porte ne reçoit pas les clics.

let couche = null;

function calque() {
  if (!couche || !couche.isConnected) {
    couche = document.createElement('div');
    couche.className = 'couche-vol';
    document.body.appendChild(couche);
  }
  return couche;
}

/**
 * Ce qu'il faut d'un élément pour le rejouer ailleurs : sa boîte, son HTML et
 * son corps de police. Le clone quitte son parent : une moitié de carte perd
 * alors la hauteur et le corps que la carte lui donnait, et ses bandes en
 * pourcentage s'effondrent. On les lui rend explicitement.
 */
export function releve(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return {
    x: r.left, y: r.top, w: r.width, h: r.height,
    html: el.outerHTML, police: getComputedStyle(el).fontSize,
  };
}

/**
 * Fait voler un relevé jusqu'à un élément d'arrivée. `fondu` sert quand la
 * carte n'atterrit pas vraiment — une carte dérushée passe en main, elle ne
 * se pose pas encore : elle rejoint le banc et s'efface. `taille: false` la
 * fait alors voyager sans changer d'échelle, vers le centre de l'arrivée.
 *
 * Rend une promesse tenue quand la carte s'est posée.
 */
export function voler(depart, arrivee, duree = 380, opts = {}) {
  if (!depart || !arrivee || duree <= 0) return Promise.resolve();
  const r = arrivee.getBoundingClientRect();
  if (!r.width || !r.height) return Promise.resolve();

  const taille = opts.taille !== false;
  // Vers une boîte : coin à coin, à l'échelle. Vers un lieu : centre à centre,
  // à taille constante.
  const dx = taille ? r.left - depart.x : (r.left + r.width / 2) - (depart.x + depart.w / 2);
  const dy = taille ? r.top - depart.y : (r.top + r.height / 2) - (depart.y + depart.h / 2);
  const sx = taille ? r.width / depart.w : 1;
  const sy = taille ? r.height / depart.h : 1;

  const el = document.createElement('div');
  el.className = 'vol';
  el.style.left = `${depart.x}px`;
  el.style.top = `${depart.y}px`;
  el.style.width = `${depart.w}px`;
  el.style.height = `${depart.h}px`;
  el.innerHTML = depart.html;
  const clone = el.firstElementChild;
  if (clone) {
    clone.style.width = `${depart.w}px`;
    clone.style.height = `${depart.h}px`;
    clone.style.flex = '0 0 auto';
    if (depart.police) clone.style.fontSize = depart.police;
  }
  calque().appendChild(el);

  const cachee = taille && arrivee.style.visibility !== 'hidden';
  if (cachee) arrivee.style.visibility = 'hidden';

  // La carte ne glisse pas en ligne droite : elle **se soulève** et retombe.
  // Un trajet plat, à vitesse constante, se manque du coin de l'œil — surtout
  // celui d'une IA, qui part d'un bord de la table pour aller à l'autre. La
  // courbe et le grossissement de mi-parcours donnent au mouvement de quoi
  // attirer le regard, et disent d'où la carte vient.
  const vol = Math.hypot(dx, dy);
  const leve = Math.min(90, Math.max(18, vol * 0.16));
  const gros = 1.09;
  const trajet = [
    { transform: 'translate(0px, 0px) scale(1, 1)', offset: 0 },
    {
      transform: `translate(${dx / 2}px, ${dy / 2 - leve}px) scale(${((1 + sx) / 2) * gros}, ${((1 + sy) / 2) * gros})`,
      offset: 0.52,
    },
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, offset: 1 },
  ];
  if (opts.fondu) { trajet[1].opacity = '.85'; trajet[2].opacity = '0'; }

  return new Promise((fini) => {
    requestAnimationFrame(() => {
      el.animate(trajet, { duration: duree, easing: 'cubic-bezier(.32,.7,.3,1)', fill: 'forwards' });
      setTimeout(() => {
        el.remove();
        if (cachee) arrivee.style.visibility = '';
        // La carte se pose : un halo bref sur sa place dit qu'elle est arrivée,
        // et lequel des plans du banc vient de changer.
        if (cachee) {
          arrivee.classList.add('pose-fraiche');
          setTimeout(() => arrivee.classList.remove('pose-fraiche'), 700);
        }
        fini();
      }, duree + 30);
    });
  });
}

/** Efface tout vol en cours : on quitte la partie, on annule, on rejoue. */
export function stopperVols() {
  if (couche) couche.innerHTML = '';
  document.querySelectorAll('[style*="visibility: hidden"]').forEach((el) => {
    if (el.style.visibility === 'hidden') el.style.visibility = '';
  });
}
