// Define um nome e versão para o cache. Mudar a versão força a atualização do cache.
const CACHE_NAME = 'talhao-viewer-cache-v11'; // ATUALIZADO: Nova versão com estratégia de cache robusta

// Lista de arquivos LOCAIS para o cache
const localUrlsToCache = [
  '/',
  'index.html',
  'css/style.css',
  'js/config.js',
  'js/local-db.js',
  'js/alvo-modal.js',
  'js/ui.js',
  'js/map.js',
  'js/data.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
];

// Lista de arquivos EXTERNOS que podem causar problemas de CORS
const externalUrlsToCache = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-omnivore@0.3.4/leaflet-omnivore.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Evento 'install': é acionado quando o service worker é instalado pela primeira vez.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto, adicionando arquivos essenciais...');
        
        // Adiciona arquivos locais normalmente
        const localCachePromise = cache.addAll(localUrlsToCache);

        // Adiciona arquivos externos com o modo "no-cors"
        const externalCachePromise = Promise.all(
          externalUrlsToCache.map(url => {
            return fetch(url, { mode: 'no-cors' })
              .then(response => cache.put(url, response));
          })
        );

        return Promise.all([localCachePromise, externalCachePromise]);
      })
      .then(() => {
        // Força o novo service worker a se tornar ativo imediatamente.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Falha ao adicionar arquivos ao cache durante a instalação:', error);
      })
  );
});

// Evento 'fetch': é acionado para cada requisição de rede feita pela página.
self.addEventListener('fetch', event => {
    // Ignora requisições que não são GET
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    const requestUrl = new URL(event.request.url);

    // Estratégia Stale-While-Revalidate para os tiles do mapa
    if (requestUrl.hostname === 'mt1.google.com') {
        event.respondWith(
            caches.open('map-tiles-cache').then(cache => {
                return cache.match(event.request).then(response => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Retorna a resposta do cache imediatamente se existir, e então busca a atualização na rede.
                    return response || fetchPromise;
                });
            })
        );
        return;
    }
    
    // NOVA ESTRATÉGIA: Stale-While-Revalidate para todos os outros recursos (incluindo scripts externos)
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Se a requisição de rede for bem-sucedida, atualiza o cache
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    console.error("Fetch falhou; provavelmente offline.", err);
                });
                
                // Retorna a resposta do cache imediatamente se estiver disponível,
                // ou aguarda a resposta da rede se não estiver no cache.
                return response || fetchPromise;
            });
        })
    );
});


// Evento 'activate': é acionado quando o service worker é ativado.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, 'map-tiles-cache']; // Adiciona o novo cache à lista de permissões
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
    }).then(() => {
        // Diz ao service worker para assumir o controle de todas as abas abertas imediatamente.
        return self.clients.claim();
    })
  );
});