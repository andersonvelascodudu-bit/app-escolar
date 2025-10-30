// service-worker.js

// v4: Robusto, mira index2.html
const CACHE_NAME = 'nata-escolar-robust-v1'; 

// Atualiza para index2.html.
const urlsToCache = [
  './index2.html', // <<< MUDANÇA CRÍTICA
  './manifest.json', 
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
  // NOTA: Os scripts do Firebase e fontes do Google são ignorados de propósito (veja fetch)
];

// Evento de Instalação: Baixa e armazena os assets da casca do app
self.addEventListener('install', event => {
  console.log('SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cache aberto, adicionando URLs da casca:', urlsToCache);
        // O addAll é atômico. Se um falhar, todos falham.
        return cache.addAll(urlsToCache); 
      })
      .then(() => {
        console.log('SW: Casca da aplicação em cache com sucesso');
        // Força o novo Service Worker a assumir o controle imediatamente
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
        // Assume o controle de todos os clientes (abas) abertos
        console.log('SW: Ativado e controlando clientes.');
        return self.clients.claim();
    })
  );
});

// Evento de Fetch: Intercepta requisições
self.addEventListener('fetch', event => {
  const reqUrl = new URL(event.request.url);

  // 1. IGNORA requisições para o Firebase e Google APIs (sempre vai para a rede)
  // Deixa o SDK do Firebase gerenciar seu próprio cache offline (IndexedDB)
  if (reqUrl.hostname.includes('firebase') || reqUrl.hostname.includes('googleapis.com') || reqUrl.hostname.includes('gstatic.com')) {
    // Não faz nada, deixa a requisição seguir para a rede
    return;
  }

  // 2. IGNORA requisições não-GET ou de extensões
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 3. APLICA "Cache First, fallback to Network" para a casca do app
  event.respondWith(
    caches.match(event.request)
      .then(responseFromCache => {
        
        // Se encontrou no cache, retorna
        if (responseFromCache) {
          // console.log('SW: Servindo do cache:', event.request.url);
          return responseFromCache;
        }

        // Se não encontrou no cache, busca na rede
        // console.log('SW: Não encontrado no cache, buscando na rede:', event.request.url);
        return fetch(event.request).then(networkResponse => {
            // (Opcional) Você poderia clonar e colocar em cache aqui,
            // mas para a casca do app, a instalação já cuida disso.
            return networkResponse;
        
        }).catch(error => {
            // Falha total (offline e sem cache)
            console.error('SW: Falha ao buscar na rede (offline?):', event.request.url, error);
            
            // Se for um pedido de navegação (HTML), retorna o app principal
            if (event.request.mode === 'navigate') {
                 // Retorna o index2.html do cache como fallback
                 return caches.match('./index2.html'); // <<< MUDANÇA CRÍTICA
            }
            // Para outros assets (ex: CSS, JS que não foram cacheados), apenas falha.
        });
      })
  );
});
