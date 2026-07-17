/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ONNX model (local only): cache first. Remote GitHub model is handled by IndexedDB in model.ts.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\.onnx(\?|$)/.test(url.href),
  new CacheFirst({
    cacheName: 'onnx-models',
    plugins: [new ExpirationPlugin({ maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 90 })],
  })
)

// Wasm files: cache first
registerRoute(
  ({ url }) => /\.wasm(\?|$)/.test(url.pathname),
  new CacheFirst({
    cacheName: 'ort-wasm',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 90 })],
  })
)

// Navigation requests: always inject COOP/COEP so crossOriginIsolated stays true
// even when the SW serves the HTML from its precache.
function withSecurityHeaders(r: Response): Response {
  const h = new Headers(r.headers)
  h.set('Cross-Origin-Opener-Policy', 'same-origin')
  h.set('Cross-Origin-Embedder-Policy', 'credentialless')
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h })
}

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request)
      .then(withSecurityHeaders)
      .catch(() =>
        caches.match(event.request)
          .then(cached => (cached ? withSecurityHeaders(cached) : Response.error()))
      )
  )
})
