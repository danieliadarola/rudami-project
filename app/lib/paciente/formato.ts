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

/**
 * Segundos de descanso a partir del texto libre que escribe el fisio
 * ("30 s", "45 segundos", "1 min", "1-2 minutos", "entre 60 y 90 s").
 *
 * Se queda con el PRIMER número, que en un rango es el extremo corto: si el
 * fisio dice "1-2 minutos", cronometrar 2 minutos dejaría al paciente parado
 * de más y es más fácil alargar a mano que recortar.
 *
 * Devuelve null si no hay nada reconocible, y en ese caso la sesión guiada
 * simplemente no cronometra: mejor sin temporizador que con uno inventado.
 */
export function segundosDeDescanso(texto?: string | null): number | null {
  if (!texto) return null
  const t = texto.toLowerCase()
  const m = t.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return null

  const n = parseFloat(m[1].replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null

  // "min"/"minuto(s)" → minutos. Todo lo demás se asume en segundos.
  const enMinutos = /\bmin/.test(t)
  const seg = Math.round(enMinutos ? n * 60 : n)

  // Cotas de cordura: un descanso de 0 s no es descanso y uno de 10 minutos
  // dentro de una sesión guiada es casi seguro un dato mal escrito.
  if (seg < 5 || seg > 600) return null
  return seg
}

/** "1:30" a partir de segundos. */
export function reloj(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
