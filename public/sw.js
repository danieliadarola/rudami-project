// public/sw.js — Service worker de la app del paciente (Fase 5: "plan de hoy offline").
//
// ESTRATEGIA, en tres frases:
//   · Estáticos (/_next/static, ilustraciones, iconos): cache-first. No cambian
//     sin cambiar de nombre, así que se sirven de caché y se guardan al vuelo.
//   · Navegaciones dentro de /mi: network-first. Siempre que hay red se pinta
//     lo fresco y se guarda una copia; sin red se sirve la última copia, y si
//     no la hay, la página /offline.
//   · Todo lo demás (API, Supabase, YouTube, fotos externas): ni se toca.
//
// PRIVACIDAD: las copias de /mi contienen datos del paciente y viven en la
// caché del navegador de SU móvil. Al navegar a /mi/entrar (cerrar sesión o
// sesión caducada) se borran todas las copias de /mi, para que en un móvil
// compartido el siguiente no vea el plan del anterior.
//
// Cambia la versión al cambiar esta estrategia: la activación borra las
// cachés antiguas.

const VERSION = 'rudami-v1'
const CACHE_ESTATICOS = `${VERSION}-estaticos`
const CACHE_PAGINAS = `${VERSION}-paginas`
const OFFLINE = '/offline'

const PRECACHE = [OFFLINE, '/icon-192.png', '/ejercicios/gato-camello.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICOS).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const esEstatico = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/ejercicios/') ||
  /^\/icon-\d+(-maskable)?\.png$/.test(url.pathname) ||
  url.pathname === '/logo.png'

const esPaginaApp = (url) => url.pathname === '/mi' || url.pathname.startsWith('/mi/')
const esPuerta = (url) => url.pathname === '/mi/entrar' || url.pathname === '/mi/callback'

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (esEstatico(url)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE_ESTATICOS).then((c) => c.put(req, res.clone()))
        return res
      })),
    )
    return
  }

  if (req.mode === 'navigate' && esPaginaApp(url)) {
    // Salir o caducar la sesión → fuera las copias del paciente anterior.
    if (esPuerta(url)) {
      event.respondWith(caches.delete(CACHE_PAGINAS).then(() => fetch(req)))
      return
    }
    event.respondWith(
      fetch(req).then((res) => {
        // Solo se guardan páginas que llegaron bien (una redirección a la
        // puerta, por ejemplo, no debe quedar cacheada como si fuera el inicio).
        if (res.ok && res.type === 'basic' && !res.redirected) {
          caches.open(CACHE_PAGINAS).then((c) => c.put(req, res.clone()))
        }
        return res
      }).catch(() =>
        caches.match(req).then((hit) => hit || caches.match(OFFLINE)),
      ),
    )
  }
})
