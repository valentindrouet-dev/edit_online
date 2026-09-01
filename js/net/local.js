// ---------------------------------------------------------------------------
// EDIT — transport « plusieurs onglets du même navigateur »
// ---------------------------------------------------------------------------
// Le premier des deux transports, et celui qu'il fallait écrire d'abord : il
// est instantané, il fonctionne hors ligne, il ne demande aucune clé, et il
// permet d'éprouver toute la mécanique — ouverture d'un salon, arrivée d'une
// joueuse, choix des couleurs, ordre des actions, reprise après un
// rafraîchissement — sans jamais dépendre du réseau. Quand le transport
// hébergé arrive, il n'y a plus aucun bug de logique à chercher : s'il y en a
// un, il est réseau.
//
// Il tient sur `BroadcastChannel`, que tout navigateur moderne fournit : un
// canal nommé, des messages entre onglets de la même origine. C'est
// exactement la forme du Broadcast de Supabase, en local — d'où deux
// transports qui se ressemblent, et une seule logique applicative au-dessus.

import { ANNONCE_MS, estPerime, resume } from './protocole.js?v=1.86';
import { CANAL_HALL, canalSalon } from './config.js?v=1.86';

export class TransportLocal {
  constructor() {
    this.nom = 'local';
    this.hall = null;
    this.canal = null;
    this.connus = new Map();
    this.monSalon = null;
    this.annonceur = null;
    this.onMessage = null;
  }

  // ------------------------------------------------------------------ le hall
  salons(onChange) {
    let vivant = true;
    // On ne repeint que si la liste a VRAIMENT changé : sans cette garde, le
    // ménage périodique rafraîchirait l'écran toutes les deux secondes, ce qui
    // détache les boutons sous le curseur et vide le champ que l'on est en
    // train de remplir.
    let signature = '';
    const pousser = () => {
      const maintenant = Date.now();
      for (const [id, s] of this.connus) {
        if (maintenant - s.vuA > ANNONCE_MS * 3 || estPerime(s, maintenant)) this.connus.delete(id);
      }
      const liste = [...this.connus.values()].sort((a, b) => a.numero - b.numero);
      const sig = liste.map((s) => `${s.id}:${s.nom}:${s.joueurs}:${s.phase}`).join('|');
      if (sig === signature) return;
      signature = sig;
      onChange(liste);
    };

    this.hall = new BroadcastChannel(CANAL_HALL);
    this.hall.onmessage = ({ data }) => {
      if (!vivant) return;
      if (data.t === 'annonce') {
        this.connus.set(data.salon.id, { ...data.salon, vuA: Date.now() });
        pousser();
      } else if (data.t === 'ferme') {
        this.connus.delete(data.id);
        pousser();
      } else if (data.t === 'qui' && this.monSalon) {
        // Quelqu'un vient d'arriver : on lui montre notre salon sans attendre
        // le prochain battement, sinon sa liste mettrait quatre secondes à se
        // peupler et paraîtrait vide.
        this.annoncer();
      }
    };
    this.hall.postMessage({ t: 'qui' });

    const menage = window.setInterval(pousser, 2000);
    return () => {
      vivant = false;
      window.clearInterval(menage);
      if (this.hall) { this.hall.close(); this.hall = null; }
    };
  }

  annoncer() {
    if (!this.monSalon || !this.hall) return;
    this.hall.postMessage({ t: 'annonce', salon: { ...resume(this.monSalon), vuA: Date.now() } });
  }

  // --------------------------------------------------------------- les salons
  brancher(salonId) {
    this.quitterCanal();
    this.canal = new BroadcastChannel(canalSalon(salonId));
    this.canal.onmessage = ({ data }) => { if (this.onMessage) this.onMessage(data); };
  }

  async ouvrir(salon) {
    this.brancher(salon.id);
    this.monSalon = salon;
    this.annoncer();
    if (this.annonceur) window.clearInterval(this.annonceur);
    this.annonceur = window.setInterval(() => this.annoncer(), ANNONCE_MS);
  }

  async rejoindre(salonId) {
    // On se branche SEULEMENT. C'est l'appelant qui se signale, une fois qu'il
    // écoute — sinon il manquerait la réponse de l'hôte.
    this.brancher(salonId);
  }

  envoyer(msg) {
    if (this.canal) this.canal.postMessage(msg);
  }

  ecouter(onMessage) {
    this.onMessage = onMessage;
    return () => { if (this.onMessage === onMessage) this.onMessage = null; };
  }

  publier(salon) {
    this.monSalon = salon;
    this.annoncer();
    // Une partie lancée ou finie sort de la liste des salons à rejoindre.
    if (salon.phase !== 'attente' && this.hall) this.hall.postMessage({ t: 'ferme', id: salon.id });
  }

  quitterCanal() {
    if (this.canal) { this.canal.close(); this.canal = null; }
  }

  quitter() {
    if (this.monSalon && this.hall) this.hall.postMessage({ t: 'ferme', id: this.monSalon.id });
    if (this.annonceur) window.clearInterval(this.annonceur);
    this.annonceur = null;
    this.monSalon = null;
    this.quitterCanal();
  }
}
