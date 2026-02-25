const CACHE_NAME = 'guarandrade-v3';

// Install event - ativa imediatamente sem precache (evita falha por asset ausente)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(() => {
                console.log('[SW] v3 instalado');
                return self.skipWaiting();
            })
    );
});

// Activate event - remove caches antigos e assume controle imediato
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deletando cache antigo:', name);
                        return caches.delete(name);
                    })
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições não-GET
    if (request.method !== 'GET') return;

    // Ignora protocolos não-HTTP
    if (!url.protocol.startsWith('http')) return;

    // Ignora Next.js RSC — não podem ser cacheadas
    if (url.searchParams.has('_rsc')) return;

    // Ignora arquivos internos do Next.js
    if (url.pathname.startsWith('/_next/')) return;

    // API: sempre rede, sem cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(
                    JSON.stringify({ error: 'Você está offline. Verifique sua conexão.' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                )
            )
        );
        return;
    }

    // Navegação: rede primeiro, cache ou fallback offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) =>
                        cached ||
                        caches.match('/offline.html').then((offline) =>
                            offline ||
                            new Response('<h1>Você está offline</h1>', {
                                status: 503,
                                headers: { 'Content-Type': 'text/html' },
                            })
                        )
                    )
                )
        );
        return;
    }

    // Assets estáticos: cache primeiro, rede como fallback
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                // Atualiza em background sem bloquear
                fetch(request)
                    .then((response) => {
                        if (response && response.status === 200 && response.type !== 'opaque') {
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
                        }
                    })
                    .catch(() => {});
                return cached;
            }

            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response || new Response('', { status: 503 });
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    if (request.destination === 'image') {
                        return new Response(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#1a1a2e" width="200" height="200"/><text fill="#6366f1" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">Offline</text></svg>',
                            { headers: { 'Content-Type': 'image/svg+xml' } }
                        );
                    }
                    return new Response('', { status: 503 });
                });
        })
    );
});

// Mensagens do app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
