// Define um nome e versão para o cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'talhao-viewer-cache-v15'; // ATUALIZADO: Nova versão para refletir a refatoração

// Lista de arquivos LOCAIS para o cache
const localUrlsToCache = [
  '/',
  'index.html',
  'css/style.css',
  'js/config.js',
  'js/local-db.js',
  'js/alvo-modal.js',
  'js/anotacao-modal.js',
  'js/demarcacao-modal.js',
  'js/afericao-modal.js',
  'js/cv-modal.js',
  'js/perca-colheita-modal.js',
  'js/estimativa-produtividade-modal.js',
  'js/recomendacao-modal.js',
  'js/relatorio-modal.js',
  'js/ui-share.js', // NOVO ARQUIVO
  'js/ui-cards.js', // NOVO ARQUIVO
  'js/ui.js',
  'js/map.js',
  'js/data.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
];

// Lista de arquivos EXTERNOS
const externalUrlsToCache = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-omnivore@0.3.4/leaflet-omnivore.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto, adicionando arquivos essenciais...');
        
        // Cache de arquivos locais
        const localCachePromise = cache.addAll(localUrlsToCache);

        // Cache de arquivos externos
        const externalCachePromise = Promise.all(
          externalUrlsToCache.map(url => {
            return fetch(url, { mode: 'no-cors' })
              .then(response => cache.put(url, response))
              .catch(err => console.warn(`Falha ao buscar recurso externo: ${url}`, err));
          })
        );

        return Promise.all([localCachePromise, externalCachePromise]);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Falha ao adicionar arquivos ao cache durante a instalação:', error);
      })
  );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (requestUrl.hostname.includes('google.com')) {
        event.respondWith(
            caches.open('map-tiles-cache').then(cache => {
                return cache.match(event.request).then(response => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return response || fetchPromise;
                });
            })
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return networkResponse;
                });
            })
    );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, 'map-tiles-cache'];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});