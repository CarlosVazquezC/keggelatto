// Modo sin conexión: primero la red y, si falla, la copia guardada. Vite pone hash a los archivos,
// así que no hay lista fija de precarga: se guarda lo que la app va pidiendo.
const CACHE = 'keggelatto-v1'

self.addEventListener('install', (event) => {
  // La primera visita se pide antes de que exista el service worker: se guarda aquí la página.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('./')).then(() => self.skipWaiting()))
})

// El origen github.io es compartido con otros proyectos: sólo se borran las cachés propias.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('keggelatto-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  )
})
