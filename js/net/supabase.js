// ---------------------------------------------------------------------------
// EDIT — transport hébergé (Supabase Realtime)
// ---------------------------------------------------------------------------
// Le second transport : le même que `local.js`, mais entre appareils. Aucune
// logique nouvelle — uniquement la traduction de la même interface.
//
// De Supabase on n'utilise QUE le **Broadcast** : un canal nommé, des messages
// à qui écoute, rien de stocké. C'est le seul mécanisme qui ne demande aucune
// table, aucune politique RLS, aucune migration, aucune authentification — un
// projet tout neuf le fournit immédiatement. C'est aussi ce qui permet à EDIT
// de partager le projet d'un autre jeu sans rien risquer chez lui : deux jeux
// qui parlent sur des canaux différents ne s'entendent pas, et il n'y a aucune
// donnée à abîmer puisqu'il n'y en a aucune.
//
// Ce module n'appelle jamais `.from()`, `.rpc()`, `.auth` ni `presence` : il
// ouvre des canaux, il écoute, il envoie. Rien d'autre.

import { ANNONCE_MS, estPerime, resume } from './protocole.js?v=1.99';
import { CANAL_HALL, canalSalon, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js?v=1.99';

/** D'où vient le client temps réel. Pas de bundler ici : on le prend au vol. */
const CDN = 'https://esm.sh/@supabase/supabase-js@2';

let client = null;

/**
 * Charge le client une seule fois, et seulement si on en a besoin : il pèse
 * quelque 220 Ko, et qui ne joue pas en ligne ne doit jamais le télécharger.
 */
async function getClient() {
  if (client) return client;
  const { createClient } = await import(/* @vite-ignore */ CDN);
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },          // on n'authentifie personne
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

export class TransportSupabase {
  constructor() {
    this.nom = 'supabase';
    this.hall = null;
    this.canal = null;
    this.connus = new Map();
    this.monSalon = null;
    this.annonceur = null;
    this.onMessage = null;
    this.onEtat = null;
  }

  surEtat(cb) {
    this.onEtat = cb;
    return () => { if (this.onEtat === cb) this.onEtat = null; };
  }

  majEtat(e) { if (this.onEtat) this.onEtat(e); }

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

    (async () => {
      let c;
      try { c = await getClient(); } catch { this.majEtat('erreur'); return; }
      // Le chargement est asynchrone : l'écran a pu être quitté entre-temps, et
      // l'on s'abonnerait alors à un canal que personne n'écoute et que
      // personne ne fermera.
      if (!vivant) return;
      this.hall = c.channel(CANAL_HALL, { config: { broadcast: { self: false } } });
      this.hall.on('broadcast', { event: 'hall' }, ({ payload: m }) => {
        if (m.t === 'annonce') {
          this.connus.set(m.salon.id, { ...m.salon, vuA: Date.now() });
          pousser();
        } else if (m.t === 'ferme') {
          this.connus.delete(m.id);
          pousser();
        } else if (m.t === 'qui' && this.monSalon) {
          this.annoncer();
        }
      });
      this.hall.subscribe((statut) => {
        if (statut === 'SUBSCRIBED') {
          this.majEtat('ok');
          this.envoyerHall({ t: 'qui' });   // APRÈS l'abonnement, jamais avant
        } else if (statut === 'CHANNEL_ERROR' || statut === 'TIMED_OUT') {
          this.majEtat('erreur');
        }
      });
    })();

    const menage = window.setInterval(pousser, 2000);
    return () => {
      vivant = false;
      window.clearInterval(menage);
      if (this.hall) { this.hall.unsubscribe(); this.hall = null; }
    };
  }

  envoyerHall(m) {
    if (this.hall) this.hall.send({ type: 'broadcast', event: 'hall', payload: m });
  }

  annoncer() {
    if (!this.monSalon) return;
    this.envoyerHall({ t: 'annonce', salon: { ...resume(this.monSalon), vuA: Date.now() } });
  }

  // --------------------------------------------------------------- les salons
  async brancher(salonId) {
    this.quitterCanal();
    const c = await getClient();
    const canal = c.channel(canalSalon(salonId), { config: { broadcast: { self: false } } });
    canal.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (this.onMessage) this.onMessage(payload);
    });
    await new Promise((resolve) => {
      canal.subscribe((statut) => {
        if (statut === 'SUBSCRIBED') { this.majEtat('ok'); resolve(); }
        else if (statut === 'CHANNEL_ERROR' || statut === 'TIMED_OUT') this.majEtat('erreur');
      });
      // On n'attend jamais indéfiniment : une interface qui répond et une liste
      // vide valent mieux qu'un écran figé si le réseau boude.
      window.setTimeout(resolve, 4000);
    });
    this.canal = canal;
  }

  async ouvrir(salon) {
    await this.brancher(salon.id);
    this.monSalon = salon;
    this.annoncer();
    if (this.annonceur) window.clearInterval(this.annonceur);
    this.annonceur = window.setInterval(() => this.annoncer(), ANNONCE_MS);
  }

  async rejoindre(salonId) {
    await this.brancher(salonId);
  }

  envoyer(msg) {
    if (this.canal) this.canal.send({ type: 'broadcast', event: 'msg', payload: msg });
  }

  ecouter(onMessage) {
    this.onMessage = onMessage;
    return () => { if (this.onMessage === onMessage) this.onMessage = null; };
  }

  publier(salon) {
    this.monSalon = salon;
    this.annoncer();
    if (salon.phase !== 'attente') this.envoyerHall({ t: 'ferme', id: salon.id });
  }

  quitterCanal() {
    if (this.canal) { this.canal.unsubscribe(); this.canal = null; }
  }

  quitter() {
    if (this.monSalon) this.envoyerHall({ t: 'ferme', id: this.monSalon.id });
    if (this.annonceur) window.clearInterval(this.annonceur);
    this.annonceur = null;
    this.monSalon = null;
    this.quitterCanal();
  }
}
