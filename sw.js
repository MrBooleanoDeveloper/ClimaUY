const VERSION = "2.0.0";
const CACHE = `climauy-app-${VERSION}`;
const WEATHER_CACHE = "climauy-weather-v2";

const APP_FILES = [
  "/",
  "/index.html",
  "/pwa/manifest.webmanifest"
];

// Instalación
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );
});

// Activación y limpieza de versiones antiguas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key =>
          key.startsWith("climauy-") &&
          key !== CACHE &&
          key !== WEATHER_CACHE
        ).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Actualizaciones
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Estrategia de red con respaldo local
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    return new Response("Sin conexión", {
      status: 503
    });
  }
}

// Control de solicitudes
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Datos meteorológicos de Open-Meteo
  if (url.hostname === "api.open-meteo.com") {
    event.respondWith(
      networkFirst(request, WEATHER_CACHE)
    );
    return;
  }

  // Navegación principal
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          await caches.match("/index.html") ||
          new Response("Sin conexión", { status: 503 })
        );
      })
    );
    return;
  }

  // Archivos propios de ClimaUY
  if (url.origin === self.location.origin) {
    event.respondWith(
      networkFirst(request, CACHE)
    );
  }
});
