// components/paciente/AdherenciaSemanal.tsx
// Barras: qué parte de sus ejercicios hizo el paciente cada semana.
//
// Server Component, HTML plano: seis barras no necesitan SVG. La barra es
// un carril con la parte hecha en dorado, extremo redondeado (4px) anclado
// a la base. El porcentaje va escrito encima de cada barra — con seis
// valores, etiquetarlos todos es legible y ahorra un eje.

import { desdeIso, iso } from '@/app/lib/paciente/fechas'

const SEMANAS = 6

export function AdherenciaSemanal({
  checksPorDia,
  ejerciciosDia,
  hoy,
}: {
  checksPorDia: { fecha: string; hechos: number }[]
  ejerciciosDia: number
  hoy: string
}) {
  if (ejerciciosDia <= 0) return null

  // Lunes de la semana de "hoy" (del servidor, nunca del dispositivo).
  const h = desdeIso(hoy)
  const lunesActual = new Date(h)
  lunesActual.setDate(h.getDate() - ((h.getDay() + 6) % 7))

  const porFecha = new Map(checksPorDia.map((c) => [c.fecha, c.hechos]))

  const semanas = Array.from({ length: SEMANAS }, (_, i) => {
    const lunes = new Date(lunesActual)
    lunes.setDate(lunesActual.getDate() - (SEMANAS - 1 - i) * 7)
    let hechos = 0
    for (let d = 0; d < 7; d++) {
      const dia = new Date(lunes)
      dia.setDate(lunes.getDate() + d)
      hechos += porFecha.get(iso(dia)) ?? 0
    }
    // La semana en curso solo cuenta los días ya transcurridos: pedirle a un
    // martes el 100% de la semana pintaría de flojera lo que es calendario.
    const dias = i === SEMANAS - 1 ? ((h.getDay() + 6) % 7) + 1 : 7
    const pct = Math.min(100, Math.round((hechos / (ejerciciosDia * dias)) * 100))
    return {
      etiqueta: lunes.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      pct,
      actual: i === SEMANAS - 1,
    }
  })

  if (semanas.every((s) => s.pct === 0)) return null

  return (
    <div className="pg-semanas" role="img"
      aria-label={`Ejercicios completados por semana: ${semanas.map((s) => `semana del ${s.etiqueta}, ${s.pct} por ciento`).join('; ')}`}>
      {semanas.map((s) => (
        <div key={s.etiqueta} className={`pg-sem${s.actual ? ' actual' : ''}`}>
          <span className="pg-sem-pct">{s.pct}%</span>
          <span className="pg-sem-carril" aria-hidden="true">
            <span className="pg-sem-lleno" style={{ height: `${Math.max(s.pct, 3)}%` }} />
          </span>
          <span className="pg-sem-eti">{s.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}
