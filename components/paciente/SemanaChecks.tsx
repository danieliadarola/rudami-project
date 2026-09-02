// components/paciente/SemanaChecks.tsx
// Los siete días de la semana con los ejercicios completados en cada uno.
// Extraído de GuiaPaciente.tsx para compartirlo con la app del paciente.

import type { DiaSemana } from '@/app/lib/paciente/fechas'

export function SemanaChecks({
  semana,
  totalDia,
}: {
  semana: DiaSemana[]
  /** Ejercicios que tiene el plan: define cuándo un día está "completo". */
  totalDia: number
}) {
  return (
    <div className="guia-sem" role="list" aria-label="Ejercicios completados esta semana">
      {semana.map((d) => {
        const completo = totalDia > 0 && d.hechos >= totalDia
        const clase =
          'guia-sem-dot' +
          (completo ? ' full' : d.hechos > 0 ? ' parcial' : '') +
          (d.esHoy ? ' hoy' : '')
        return (
          <div key={d.fecha} className="guia-sem-dia" role="listitem">
            <div className="d">{d.letra}</div>
            <div
              className={clase}
              aria-label={`${d.letra}: ${d.hechos} de ${totalDia} ejercicios`}
            >
              {d.hechos > 0 ? d.hechos : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
