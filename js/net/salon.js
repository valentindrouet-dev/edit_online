// ---------------------------------------------------------------------------
// EDIT — la logique de salon
// ---------------------------------------------------------------------------
// Écrite contre l'interface d'un transport, jamais contre Supabase : c'est ce
// qui permet de tout éprouver entre deux onglets avant qu'il y ait le moindre
// réseau, et de brancher l'hébergé ensuite sans toucher une ligne d'ici.
//
// Deux règles d'autorité, et il ne faut pas en ajouter :
//
//   1. **Avant le lancement, l'hôte fait foi.** Lui seul modifie la composition
//      du salon. Les autres *demandent* — « je prends le violet » — et l'hôte
//      arbitre puis rediffuse le salon entier. Les autres écrasent leur copie
//      sans discuter. C'est ce qui évite tout conflit sur qui a pris quoi.
//   2. **Après le lancement, plus personne ne fait foi.** Chacun ajoute les
//      actions à son journal et rejoue. Le déterminisme garantit l'accord.

import { ANNONCE_MS, appliquerAction, configDuSalon, monIdentite, nomDeSalon,
  prochainNumero, rejouer, retenirNom } from './protocole.js?v=1.97';

const jeton = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Où l'on se trouvait. Dans sessionStorage, comme l'identité : par onglet, et
// conservé au rafraîchissement — c'est exactement ce qu'il faut pour reprendre
// sa place après un rechargement de page ou une coupure.
const CLE_REPRISE = 'edit.salon.v1';

const retenirSalon = (s) => {
  try {
    if (s) sessionStorage.setItem(CLE_REPRISE, JSON.stringify({ id: s.id, nom: s.nom, numero: s.numero, hote: s.hote }));
    else sessionStorage.removeItem(CLE_REPRISE);
  } catch { /* navigation privée : on ne reprendra pas, tant pis */ }
};

const salonRetenu = () => {
  try { return JSON.parse(sessionStorage.getItem(CLE_REPRISE) || 'null'); } catch { return null; }
};

export class Salon {
  /**
   * @param transport le transport (local ou hébergé)
   * @param onChange  appelé dès que quelque chose change : c'est le rendu
   */
  constructor(transport, onChange) {
    this.transport = transport;
    this.onChange = onChange;
    const { id, nom } = monIdentite();
    this.moi = { id, nom: nom || '' };
    this.salon = null;
    this.actions = [];
    this.partie = null;
    this.liste = [];
    this.liaison = transport.surEtat ? 'connexion' : 'ok';
    this.arretHall = null;
    this.arretEcoute = null;
    this.battement = null;
    this.vus = new Map();       // id du membre → dernier signe de vie
  }

  // ---------------------------------------------------------------- le cadre
  changer() { if (this.onChange) this.onChange(); }

  get suisHote() { return !!this.salon && this.salon.hote === this.moi.id; }

  get monSiege() {
    if (!this.salon) return -1;
    const m = this.salon.membres.find((x) => x.id === this.moi.id);
    return m && m.siege !== undefined ? m.siege : -1;
  }

  get aMoiDeJouer() {
    return !!this.partie && !this.partie.finie && this.partie.courant === this.monSiege;
  }

  nommer(nom) {
    this.moi.nom = nom;
    retenirNom(nom);
    if (this.salon) {
      const m = this.salon.membres.find((x) => x.id === this.moi.id);
      if (m) m.nom = nom;
      if (this.suisHote) this.diffuserSalon(); else this.transport.envoyer({ t: 'bonjour', membre: this.monMembre() });
    }
    // Pas de repeinte ici : on se nomme en tapant, et repeindre sous les doigts
    // détacherait le champ que l'on est en train de remplir. Le nom s'affiche
    // déjà tout seul ; la composition du salon, elle, revient par l'hôte.
  }

  /** Se met à l'écoute de la liste des salons ouverts. */
  ecouterHall() {
    if (this.arretHall) return;
    if (this.transport.surEtat) {
      this.arretLiaison = this.transport.surEtat((e) => { this.liaison = e; this.changer(); });
    }
    this.arretHall = this.transport.salons((liste) => { this.liste = liste; this.changer(); });
  }

  monMembre() {
    const m = this.salon && this.salon.membres.find((x) => x.id === this.moi.id);
    return m || { id: this.moi.id, nom: this.moi.nom, couleur: null, present: true, type: 'HUMAIN' };
  }

  // ------------------------------------------------------------- ouvrir/rejoindre
  async ouvrir(cfg) {
    const numero = prochainNumero(this.liste);
    this.salon = {
      id: jeton(),
      nom: nomDeSalon(numero),
      numero,
      hote: this.moi.id,
      membres: [{ id: this.moi.id, nom: this.moi.nom, couleur: null, present: true, type: 'HUMAIN' }],
      phase: 'attente',
      cfg,
      graine: jeton(),
      debut: Date.now(),
      vuA: Date.now(),
    };
    this.actions = [];
    this.partie = null;
    await this.transport.ouvrir(this.salon);
    this.brancherEcoute();
    retenirSalon(this.salon);
    this.changer();
  }

  async rejoindre(resumeSalon) {
    // Le transport se branche SEULEMENT ; c'est ici qu'on se signale, une fois
    // l'écouteur installé — sinon la réponse de l'hôte arriverait dans le vide.
    this.salon = {
      id: resumeSalon.id,
      nom: resumeSalon.nom,
      numero: resumeSalon.numero,
      hote: resumeSalon.hote,
      membres: [],
      phase: 'attente',
      cfg: null,
      graine: null,
      debut: 0,
      vuA: Date.now(),
    };
    this.actions = [];
    this.partie = null;
    await this.transport.rejoindre(resumeSalon.id);
    this.brancherEcoute();
    // On s'abonne AVANT de dire bonjour : dans l'autre ordre, la réponse de
    // l'hôte tomberait dans l'intervalle et serait perdue — le nouveau venu
    // resterait seul dans un salon qui, lui, l'a bien vu.
    this.transport.envoyer({ t: 'bonjour', membre: this.monMembre() });
    retenirSalon(this.salon);
    this.changer();
  }

  brancherEcoute() {
    if (this.arretEcoute) this.arretEcoute();
    this.arretEcoute = this.transport.ecouter((m) => this.recevoir(m));
    if (this.battement) window.clearInterval(this.battement);
    this.battement = window.setInterval(() => this.batailler(), ANNONCE_MS);
  }

  /** Le battement de cœur : chacun se signale, l'hôte fait le ménage. */
  batailler() {
    if (!this.salon) return;
    if (this.suisHote) {
      const maintenant = Date.now();
      let bouge = false;
      for (const m of this.salon.membres) {
        if (m.id === this.moi.id) continue;
        const vu = this.vus.get(m.id) || 0;
        const present = maintenant - vu < ANNONCE_MS * 3;
        if (m.present !== present) { m.present = present; bouge = true; }
      }
      this.salon.vuA = maintenant;
      if (bouge) this.diffuserSalon();
      else this.transport.publier(this.salon);
    } else {
      this.transport.envoyer({ t: 'bonjour', membre: this.monMembre() });
    }
  }

  diffuserSalon() {
    if (!this.suisHote) return;
    this.salon.vuA = Date.now();
    this.transport.envoyer({ t: 'salon', salon: this.salon });
    this.transport.publier(this.salon);
    this.changer();
  }

  // ------------------------------------------------------------- la réception
  recevoir(m) {
    if (!this.salon) return;
    switch (m.t) {
      case 'bonjour': {
        this.vus.set(m.membre.id, Date.now());
        if (!this.suisHote) break;
        const connu = this.salon.membres.find((x) => x.id === m.membre.id);
        if (connu) {
          connu.nom = m.membre.nom;
          connu.present = true;
        } else {
          this.salon.membres.push({ ...m.membre, couleur: null, present: true, type: 'HUMAIN' });
        }
        this.diffuserSalon();
        // Une partie déjà lancée : le retardataire reçoit aussi le journal.
        if (this.salon.phase !== 'attente') this.transport.envoyer({ t: 'journal', actions: this.actions });
        break;
      }
      case 'salon':
        // Seul l'hôte diffuse ; on lui fait confiance et l'on écrase.
        if (!this.suisHote) {
          const avant = this.salon.phase;
          this.salon = m.salon;
          if (avant === 'attente' && m.salon.phase !== 'attente') this.recalculer();
          this.changer();
        }
        break;
      case 'choix':
        if (!this.suisHote) break;
        this.attribuer(m.membreId, m.couleur);
        break;
      case 'options':
        if (!this.suisHote) { this.salon.cfg = m.cfg; this.changer(); }
        break;
      case 'debut':
        if (!this.suisHote) {
          this.salon = m.salon;
          this.actions = [];
          this.recalculer();
          this.changer();
        }
        break;
      case 'action': {
        // Le numéro dit où l'action se range. Un trou signale qu'on a raté
        // quelque chose : on redemande le journal plutôt que de deviner.
        const attendu = this.actions.length;
        if (m.n === attendu) {
          this.actions.push(m.action);
          if (this.partie) appliquerAction(this.partie, m.action);
          this.changer();
        } else if (m.n > attendu) {
          this.transport.envoyer({ t: 'rejoue', depuis: attendu });
        }
        break;
      }
      case 'rejoue':
        // Traité par TOUT LE MONDE : n'importe qui possédant le journal peut
        // dépanner un retardataire. C'est gratuit, et ça supprime un point de
        // défaillance unique.
        this.transport.envoyer({ t: 'journal', actions: this.actions });
        break;
      case 'journal':
        // On n'accepte que ce qui fait avancer : deux réponses simultanées à un
        // même « rejoue » ne doivent pas nous faire reculer.
        if (m.actions.length > this.actions.length) {
          this.actions = m.actions;
          this.recalculer();
          this.changer();
        }
        break;
      case 'aurevoir': {
        this.vus.delete(m.membreId);
        if (!this.suisHote) break;
        const q = this.salon.membres.find((x) => x.id === m.membreId);
        if (q) q.present = false;
        this.diffuserSalon();
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------ la composition
  /** L'hôte arbitre : deux membres ne peuvent pas prendre la même couleur. */
  attribuer(membreId, couleur) {
    if (!this.suisHote) return;
    if (couleur && this.salon.membres.some((m) => m.id !== membreId && m.couleur === couleur)) return;
    const m = this.salon.membres.find((x) => x.id === membreId);
    if (!m) return;
    m.couleur = couleur;
    this.diffuserSalon();
  }

  choisirCouleur(couleur) {
    if (this.suisHote) this.attribuer(this.moi.id, couleur);
    else this.transport.envoyer({ t: 'choix', membreId: this.moi.id, couleur });
  }

  majOptions(cfg) {
    if (!this.suisHote) return;
    this.salon.cfg = cfg;
    this.transport.envoyer({ t: 'options', cfg });
    this.diffuserSalon();
  }

  /** Les places se figent ICI, au lancement, et pas avant. */
  lancer() {
    if (!this.suisHote || !this.salon) return;
    const assis = this.salon.membres.filter((m) => m.present && m.couleur);
    if (assis.length < 2) return;
    this.salon = {
      ...this.salon,
      phase: 'en-cours',
      debut: Date.now(),
      membres: this.salon.membres.map((m) => {
        const i = assis.indexOf(m);
        return i >= 0 ? { ...m, siege: i } : { ...m, siege: undefined };
      }),
    };
    this.actions = [];
    this.recalculer();
    this.transport.envoyer({ t: 'debut', salon: this.salon });
    this.transport.publier(this.salon);
    this.changer();
  }

  // ---------------------------------------------------------------- la partie
  /** La partie n'est jamais stockée : elle se recalcule depuis le journal. */
  recalculer() {
    if (!this.salon || this.salon.phase === 'attente' || !this.salon.cfg) { this.partie = null; return; }
    const config = configDuSalon(this.salon);
    if (config.joueurs.length < 1) { this.partie = null; return; }
    this.partie = rejouer(config, this.actions, this.salon.debut);
  }

  /** Jouer : on applique chez soi — c'est instantané — puis on émet. */
  jouer(action) {
    if (!this.partie) return false;
    const n = this.actions.length;
    this.actions.push(action);
    const fini = appliquerAction(this.partie, action);
    this.transport.envoyer({ t: 'action', n, action });
    if (fini && this.suisHote) {
      this.salon.phase = 'terminee';
      this.transport.publier(this.salon);
    }
    this.changer();
    return fini;
  }

  /**
   * Reprendre sa place après un rafraîchissement. On dit bonjour au salon qu'on
   * occupait : l'hôte nous remet dans la liste et nous renvoie le journal, que
   * l'on rejoue. Rien n'est stocké nulle part — c'est le journal des autres qui
   * nous rend notre partie.
   */
  async reprendre() {
    const r = salonRetenu();
    if (!r || this.salon) return false;
    await this.rejoindre(r);
    // Si personne ne répond, c'est que le salon n'existe plus : on n'y reste
    // pas coincé.
    window.setTimeout(() => {
      if (this.salon && !this.salon.membres.length) { this.quitter(); }
    }, 5000);
    return true;
  }

  quitter() {
    retenirSalon(null);
    if (this.salon) this.transport.envoyer({ t: 'aurevoir', membreId: this.moi.id });
    if (this.battement) window.clearInterval(this.battement);
    this.battement = null;
    if (this.arretEcoute) { this.arretEcoute(); this.arretEcoute = null; }
    this.transport.quitter();
    this.salon = null;
    this.actions = [];
    this.partie = null;
    this.vus.clear();
    this.changer();
  }

  fermer() {
    this.quitter();
    if (this.arretHall) { this.arretHall(); this.arretHall = null; }
    if (this.arretLiaison) { this.arretLiaison(); this.arretLiaison = null; }
  }
}
