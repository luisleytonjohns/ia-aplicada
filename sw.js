/* Metis · sw.js · Permite instalar Metis como aplicación.
   Siempre pide primero a la red, para que nadie quede con una versión vieja;
   la copia guardada solo se usa si no hay conexión. No toca las llamadas al servicio de Apps Script. */
const CACHE = 'metis-0.10.1';
const BASE = ['./', 'index.html', 'metis.css', 'app.js', 'vista-sesion.js', 'vista-tareas.js', 'vista-estudiante.js', 'docente.js', 'config.js', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('metis-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const SIN_CONEXION = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Metis sin conexión</title></head>' +
  '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#10213D;color:#F7F5EF;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
  '<div><h1 style="font-size:1.4rem">Sin conexión</h1><p>Metis necesita internet para cargar tus sesiones y guardar tu trabajo.<br>Revisa tu conexión y vuelve a intentarlo.</p>' +
  '<button onclick="location.reload()" style="margin-top:12px;padding:10px 18px;border:0;border-radius:8px;background:#2457FF;color:#fff;font-size:1rem">Reintentar</button></div></body></html>';

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(resp => {
      if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return resp;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate'
      ? caches.match('index.html').then(i => i || new Response(SIN_CONEXION, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
      : Response.error())))
  );
});
