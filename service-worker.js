// service-worker.js

const CACHE_NAME = 'nata-escolar-cache-v1';
// Lista de ficheiros essenciais para a "casca" da aplicação
const urlsToCache = [
  'Sistema Escolar NATA.html',
  // Adicione aqui outros ficheiros se os separar (CSS, JS externos),
  // e os ícones principais para aparecerem offline.
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // Nota: Não é preciso colocar aqui os scripts do Firebase, eles são carregados da rede.
];

// Evento de Instalação: Guarda os ficheiros em cache
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, adicionando URLs da casca');
        // Importante: addAll falha se UM ficheiro não for encontrado.
        // Se tiver problemas, comente linhas ou use cache.add() individualmente.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Service Worker: Falha ao adicionar ao cache durante a instalação:', error);
            // Mesmo com erro, pode ser útil continuar, mas o offline pode falhar.
        });
      })
      .then(() => {
        console.log('Service Worker: Casca da aplicação em cache com sucesso');
        self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch(error => {
        console.error('Service Worker: Falha na instalação:', error);
      })
  );
});

// Evento de Ativação: Limpa caches antigos (se houver)
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Torna este SW o controlador imediatamente
  );
});

// Evento Fetch: Interceta pedidos de rede
self.addEventListener('fetch', event => {
  // Ignora pedidos que não são GET (ex: POST para o Firestore)
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache first, fallback to network
  // Para a casca da aplicação, tenta servir do cache primeiro.
  // Para outros pedidos (API do Firebase, imagens de alunos), vai à rede.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Encontrado no cache, retorna a resposta do cache
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return response;
        }
        // Não encontrado no cache, busca na rede
        // console.log('Service Worker: Buscando na rede:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Opcional: Poderia guardar em cache aqui também, mas vamos manter simples
            // Não guarda respostas de API do Firebase ou imagens dinâmicas
            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Falha ao buscar na rede:', error);
          // Opcional: Poderia retornar uma página offline genérica aqui
          // return new Response("<h1>Offline</h1><p>Não foi possível carregar o recurso.</p>", { headers: { 'Content-Type': 'text/html' }});
        });
      })
  );
});
