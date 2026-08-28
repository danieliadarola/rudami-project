'use client'
// components/dashboard/Equipo.tsx
// Carga del equipo hoy — barras de ocupación por fisioterapeuta

export interface CargaFisio {
  id: string
  nombre: string
  apellidos: string
  color: string
  rol: 'admin' | 'fisio'
  citasHoy: number
  sesSemana: number
  ocupacion: number  // 0–100
}

export function Equipo({ equipo }: { equipo: CargaFisio[] }) {
  const visibles = equipo.filter(f => f.rol !== 'fisio' || f.citasHoy > 0 || f.sesSemana > 0)

  return (
    <section className="reveal">
      <div className="sect-head">
        <span className="sect-title">Carga del equipo</span>
        <span className="sect-sub">hoy</span>
      </div>

      <div className="team-list">
        {visibles.map(f => (
          <div className="team-row" key={f.id} style={{ '--fc': f.color } as React.CSSProperties}>
            <div>
              <div className="team-name">
                {f.nombre} {f.apellidos}
                {f.rol === 'admin' && <span className="team-tag">· admin</span>}
              </div>
              <div className="team-meta">
                {f.citasHoy} citas · {f.sesSemana} sesiones esta semana
              </div>
            </div>
            <div />
            <div className="team-pct" style={{ fontVariantNumeric: 'tabular-nums' }}>{f.ocupacion}%</div>
            <div className="team-bar">
              <span style={{ width: f.ocupacion + '%' }} />
            </div>
          </div>
        ))}

        {visibles.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--faint)', padding: '20px 0' }}>
            Sin actividad registrada hoy.
          </p>
        )}
      </div>
    </section>
  )
}
