/// <reference lib="webworker" />
import { clientsClaim, cacheNames } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, getCacheKeyForURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision?: string | null }[] };
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
clientsClaim();

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (event.data?.type === 'OFFLINE_STATUS') {
        const cache = await caches.open(cacheNames.precache);
        const missing: string[] = [];
        for (const entry of manifest) {
          const key = getCacheKeyForURL(new URL(entry.url, self.location.href).href);
          if (!key || !await cache.match(key)) missing.push(entry.url);
        }
        port.postMessage({ ready: missing.length === 0, missing: missing.length });
      } else if (event.data?.type === 'APPLY_SAVED_UPDATE') {
        const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
          .filter(client => client.url.startsWith(self.registration.scope));
        if (windows.length !== 1 || !event.source || !('id' in event.source) || windows[0].id !== event.source.id) {
          port.postMessage({ error: 'Close other Dungeon Mapper tabs and player displays before updating.' });
          return;
        }
        await self.skipWaiting();
        port.postMessage({ accepted: true });
      }
    } catch (error) {
      port.postMessage({ error: error instanceof Error ? error.message : 'Service worker request failed.' });
    }
  })());
});
