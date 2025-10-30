// service-worker.js (para a Versão Simples)

const CACHE_NAME = 'nata-escolar-simples-v1'; 

// URLs para guardar em cache. O MAIS IMPORTANTE é o index.html
const urlsToCache = [
  './index.html', // <-- O app principal
  './manifest.json', 
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
  // Fontes e scripts do Firebase/Google são carregados da rede.
];

// Evento de Instalação
self.addEventListener('install', event => {
  console.log('SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cache aberto, adicionando URLs da casca:', urlsToCache);
        return cache.addAll(urlsToCache); 
      })
      .then(() => {
        console.log('SW: Casca da aplicação em cache com sucesso');
        self.skipWaiting(); 
      })
      .catch(error => {
        console.error('SW: Falha ao adicionar ao cache durante a instalação:', error);
      })
  );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
  console.log('SW: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('SW: Ativado e controlando clientes.');
        return self.clients.claim();
    })
  );
});

// Evento de Fetch: Intercepta requisições
self.addEventListener('fetch', event => {
  const reqUrl = new URL(event.request.url);

  // 1. IGNORA Firebase e Google APIs (sempre vai para a rede)
  if (reqUrl.hostname.includes('firebase') || reqUrl.hostname.includes('googleapis.com') || reqUrl.hostname.includes('gstatic.com')) {
    return;
  }

  // 2. IGNORA não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. APLICA "Cache First, fallback to Network"
  event.respondWith(
    caches.match(event.request)
      .then(responseFromCache => {
        
        // Se encontrou no cache, retorna
        if (responseFromCache) {
          return responseFromCache;
        }

        // Se não encontrou no cache, busca na rede
        return fetch(event.request).then(networkResponse => {
            return networkResponse;
        
        }).catch(error => {
            // Falha total (offline e sem cache)
            console.error('SW: Falha ao buscar na rede (offline?):', event.request.url, error);
            
            // Se for um pedido de navegação (HTML), retorna o app principal
            if (event.request.mode === 'navigate') {
                 // Retorna o index.html do cache como fallback
                 return caches.match('./index.html'); // <-- O fallback offline
            }
        });
      })
  );
});
