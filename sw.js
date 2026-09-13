// Service worker: permite abrir la app sin conexión, pero SIEMPRE prioriza
// la versión más reciente publicada cuando hay conexión (red primero, caché
// solo como respaldo si falla la red). Así, cada vez que se publica una
// actualización, quien la abra con conexión la ve al momento; la copia en
// caché solo entra en juego si en ese momento no hay internet.
var SHELL_CACHE = "gestor-embarcaciones-shell-v2";
var RUNTIME_CACHE = "gestor-embarcaciones-runtime-v2";
var SHELL_URLS = ["./", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_URLS).catch(function(){ /* alguna URL pudo fallar; no es crítico */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== SHELL_CACHE && k !== RUNTIME_CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;
  var cacheName = isSameOrigin ? SHELL_CACHE : RUNTIME_CACHE;

  // Red primero siempre (propia app y librerías externas): si hay
  // conexión, se usa y se refresca la caché; si falla (sin conexión), se
  // recurre a lo último que se guardó.
  event.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){
        var copy = res.clone();
        caches.open(cacheName).then(function(cache){ cache.put(req, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){ return cached || Promise.reject("sin conexión y sin caché"); });
    })
  );
});
