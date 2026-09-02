// app/lib/paciente/fechas.ts
// Fechas de la app del paciente, extraídas de GuiaPaciente.tsx para que la
// guía por enlace y la app con sesión cuenten los días exactamente igual.
//
// REGLA: el "hoy" válido lo da SIEMPRE el servidor (campo `hoy` del payload,
// calculado en Europe/Madrid). El móvil del paciente puede ir en otra zona
// horaria y la racha se rompería sola al viajar.

export const DIA_MS = 86400000

/** Fecha local → 'YYYY-MM-DD'. No usa toISOString(): eso convierte a UTC y
 *  a partir de las 22:00 en España devolvería el día siguiente. */
export const iso = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** 'YYYY-MM-DD' → Date al mediodía, para que ningún cambio de horario de
 *  verano mueva el día al anterior o al siguiente. */
export const desdeIso = (s: string): Date => new Date(s + 'T12:00:00')

export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

/** Ejercicios completados por fecha, a partir de las claves `id|fecha`. */
export function checksPorFecha(checks: Set<string>): Map<string, number> {
  const m = new Map<string, number>()
  checks.forEach((k) => {
    const f = k.split('|')[1]
    m.set(f, (m.get(f) ?? 0) + 1)
  })
  return m
}

/** Días consecutivos con al menos un ejercicio hecho.
 *  Hoy no cuenta en contra: si aún no ha hecho nada, la racha de ayer se
 *  mantiene viva hasta que acabe el día. */
export function calcularRacha(porFecha: Map<string, number>, hoy: string): number {
  let n = 0
  let d = desdeIso(hoy)
  if (!porFecha.get(hoy)) d = new Date(d.getTime() - DIA_MS)
  while (porFecha.get(iso(d))) {
    n++
    d = new Date(d.getTime() - DIA_MS)
  }
  return n
}

export interface DiaSemana {
  fecha: string
  letra: string
  hechos: number
  esHoy: boolean
  futuro: boolean
}

/** La semana natural (lunes a domingo) que contiene `hoy`. */
export function semanaDe(porFecha: Map<string, number>, hoy: string): DiaSemana[] {
  const h = desdeIso(hoy)
  // getDay(): 0 = domingo. (+6) % 7 lo convierte en "días desde el lunes".
  const lunes = new Date(h.getTime() - ((h.getDay() + 6) % 7) * DIA_MS)
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(lunes.getTime() + idx * DIA_MS)
    const fecha = iso(d)
    return {
      fecha,
      letra: DIAS_CORTOS[idx],
      hechos: porFecha.get(fecha) ?? 0,
      esHoy: fecha === hoy,
      futuro: d.getTime() > h.getTime(),
    }
  })
}

/** '12 de marzo de 2026'. Vacío si no hay fecha. */
export function fechaLarga(f?: string | null): string {
  if (!f) return ''
  return desdeIso(f).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
