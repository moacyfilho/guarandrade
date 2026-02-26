// Service Worker desativado — sem interceptação de requests
// O app funciona 100% sem cache do SW

const CACHE_NAME = 'guarandrade-v5';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    // Limpa todos os caches antigos e assume controle
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(names.map((name) => caches.delete(name))))
            .then(() => self.clients.claim())
    );
});

// Sem fetch handler — todas as requisições passam direto para a rede
