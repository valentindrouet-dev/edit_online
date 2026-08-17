// ---------------------------------------------------------------------------
// EDIT — service worker « réseau d'abord »
// ---------------------------------------------------------------------------
// GitHub Pages sert chaque fichier avec dix minutes de cache navigateur : au
// rafraîchissement, on peut rester coincé sur une vieille version. Ce service
// worker force le passage par le réseau (cache: 'no-store') pour tout GET du
// site, et ne se rabat sur sa copie en cache qu'en cas de coupure — le site
// reste donc consultable hors ligne, mais n'est jamais périmé en ligne.

const CACHE = 'edit-1.23';

self.addEventListener('install', () => {
  // La nouvelle version du worker prend la main sans attendre.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith((async () => {
    try {
      // no-store : on ignore le cache HTTP du navigateur et on revalide
      // auprès du serveur — c'est lui qui décide de la version servie.
      const frais = await fetch(req, { cache: 'no-store' });
      if (frais && frais.ok) {
        const c = await caches.open(CACHE);
        c.put(req, frais.clone());
      }
      return frais;
    } catch {
      // Hors ligne : la dernière copie connue.
      const enCache = await caches.match(req, { ignoreSearch: false });
      if (enCache) return enCache;
      return new Response('Hors ligne', { status: 503, statusText: 'Hors ligne' });
    }
  })());
});
