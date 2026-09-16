// app/offline/page.tsx
// Lo que ve el paciente si abre la app sin conexión y no hay copia guardada
// de la página que pedía. La sirve el service worker (public/sw.js).
//
// Vive FUERA de /mi a propósito: el proxy exige sesión en /mi, y el service
// worker precachea esta página sin sesión durante su instalación.

export const metadata = { title: 'Sin conexión · RuDaMi' }

export default function Offline() {
  return (
    <main className="mi-vacio">
      <p className="mi-wordmark">RUDAMI</p>
      <h1>Ahora mismo no hay conexión</h1>
      <p className="mi-nota">
        Lo último que viste sigue guardado en el móvil: vuelve a <a href="/mi">Inicio</a> para
        ver tu plan de hoy. Para marcar ejercicios hace falta conexión.
      </p>
      <p className="mi-nota mi-nota-suave">
        Si el problema sigue, comprueba los datos móviles o el wifi.
      </p>
    </main>
  )
}
