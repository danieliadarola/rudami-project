// app/lib/paciente/formato.ts
// Formateo compartido entre la guía por enlace y la app del paciente.

/** Semáforo del dolor 0-10. Los cortes (≤3 verde, ≤6 ámbar, resto rojo) son
 *  los mismos que usa la ficha del fisio, para que paciente y clínica lean
 *  el mismo color ante el mismo número. */
export const evaColor = (v: number): string =>
  v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626'

/** Extrae el id de 11 caracteres de una URL de YouTube (watch, youtu.be,
 *  embed o shorts). null si no es de YouTube. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  )
  return m ? m[1] : null
}

/** Miniatura de un ejercicio: GIF > imagen > fotograma de YouTube. */
export function miniaturaEjercicio(e: {
  gif_url?: string | null
  imagen_url?: string | null
  video_url?: string | null
}): string | null {
  if (e.gif_url) return e.gif_url
  if (e.imagen_url) return e.imagen_url
  const yt = youtubeId(e.video_url)
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null
}

/** Iniciales para el avatar. */
export const iniciales = (nombre?: string | null, apellidos?: string | null): string =>
  `${(nombre ?? '')[0] ?? ''}${(apellidos ?? '')[0] ?? ''}`.toUpperCase()

/** "3 series • 12 repeticiones" — solo con lo que el fisio rellenó. */
export function dosisCorta(e: { series?: number | null; repeticiones?: string | null }): string {
  return [e.series && `${e.series} series`, e.repeticiones && `${e.repeticiones} repeticiones`]
    .filter(Boolean)
    .join(' • ')
}
