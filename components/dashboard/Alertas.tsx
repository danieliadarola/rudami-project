'use client'
// components/dashboard/Alertas.tsx
// Banderas de alerta — pacientes con EVA alto reciente

import Link from 'next/link'

export interface Bandera {
  id: string
  pacienteId: string
  paciente: string
  nivel: 'alto' | 'medio' | 'bajo'
  texto: string
  detalle: string
  fisioNombre: string
  fisioColor: string
}

const nivelMeta = {
  alto:  { color: '#dc2626', label: 'Alta'  },
  medio: { color: '#d97706', label: 'Media' },
  bajo:  { color: '#9aa1af', label: 'Baja'  },
}

export function Alertas({ banderas }: { banderas: Bandera[] }) {
  return (
    <section className="reveal">
      <div className="sect-head">
        <span className="sect-title">Banderas de alerta</span>
        <span className="sect-sub">{banderas.length} pacientes</span>
      </div>

      <div className="flag-list">
        {banderas.map(b => {
          const n = nivelMeta[b.nivel]
          return (
            <Link
              key={b.id}
              href={`/pacientes/${b.pacienteId}`}
              className="flag-row"
              style={{ textDecoration: 'none' }}
            >
              <span className="flag-dot" style={{ background: n.color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flag-top">
                  <span className="flag-pac">{b.paciente}</span>
                  <span className="flag-lvl" style={{ color: n.color }}>{n.label}</span>
                </div>
                <p className="flag-text">{b.texto}</p>
                <div className="flag-foot">
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: b.fisioColor, display: 'inline-block',
                  }} />
                  {b.fisioNombre} · {b.detalle}
                </div>
              </div>
            </Link>
          )
        })}

        {banderas.length === 0 && (
          <p style={{ fontSize: 13, color: '#9aa1af', padding: '20px 0' }}>
            Sin alertas activas. Buen trabajo del equipo.
          </p>
        )}
      </div>
    </section>
  )
}
