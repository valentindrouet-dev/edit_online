// ---------------------------------------------------------------------------
// EDIT — réglages du jeu en ligne
// ---------------------------------------------------------------------------
// Ces deux valeurs sont PUBLIQUES par conception : elles partent dans le
// navigateur de chaque joueuse, et la clé « anon » n'ouvre que ce que le projet
// autorise publiquement — ici, des canaux de diffusion.
//
// Le mot de passe de la base et la clé « service_role », eux, n'entrent JAMAIS
// dans ce dépôt : ils contournent toutes les protections.
//
// Tant que ces valeurs sont vides, EDIT se rabat sur le salon local — les
// onglets d'un même navigateur, sans réseau et sans la moindre erreur.

export const SUPABASE_URL = 'https://uqvzlpgeinunhlojlbun.supabase.co';

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdnpscGdlaW51bmhsb2psYnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY2ODAsImV4cCI6MjEwMjAzMjY4MH0.LgcJgl3q6UkYs3XQ0Bp2pe4dgqU3cAmgg2ro9Dpi_As';

/**
 * Le préfixe de TOUS les noms de canaux. Il est ici, et seulement ici.
 *
 * EDIT partage son projet Supabase avec CAMINO, l'autre jeu. C'est sans risque
 * parce que le Broadcast n'utilise aucune table : un projet n'est qu'un tuyau,
 * et un message envoyé sur un canal n'est remis qu'aux abonnés de ce canal-là.
 * La seule façon de se gêner serait de porter le même nom — d'où la garde
 * ci-dessous, qui refuse de démarrer si quelqu'un touchait à ce préfixe.
 */
export const PREFIXE = 'edit';

const RESERVES = ['camino'];
if (RESERVES.includes(PREFIXE)) {
  throw new Error(`Préfixe de canal « ${PREFIXE} » réservé à un autre jeu du même projet.`);
}

/** Le canal du hall : la liste des salons ouverts. */
export const CANAL_HALL = `${PREFIXE}-salons`;

/** Le canal d'un salon : la partie elle-même. */
export const canalSalon = (id) => `${PREFIXE}-salon-${id}`;

/** Le jeu entre appareils est-il configuré ? Sinon, ce sera entre onglets. */
export function enLigneDisponible() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
