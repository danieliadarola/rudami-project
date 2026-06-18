'use client'
// components/dashboard/TimelineAgenda.tsx
// Vista de día con carriles por fisioterapeuta — CSS grid custom
// Coexiste con FullCalendar en /citas sin conflicto

import { useState, useEffect } from 'react'
import { DI } from '@/components/ui/DashboardIcons'

export interface Fisio {
  id: string
  nombre: string
  apellidos: string
  color: string
}

export interface CitaTimeline {
  id: string
  hora: string          // "09:30"
  duracion_min: number
  paciente: string
  motivo: string
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  fisio_id: string
  telefono?: string
}

interface Props {
  fisios: Fisio[]
  citas: CitaTimeline[]
  onSelect: (cita: CitaTimeline) => void
  selectedId?: string | null
}

const TL = { start: 8, end: 19, pxh: 46 }

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ini(f: Fisio) {
  return (f.nombre[0] + f.apellidos[0]).toUpperCase()
}

export function TimelineAgenda({ fisios, citas, onSelect, selectedId }: Props) {
  const [filter, setFilter] = useState<string>('todos')
  const [now, setNow] = useState(nowHHMM())

  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 60_000)
    return () => clearInterval(t)
  }, [])

  const mostrarFiltro = fisios.length > 1
  const cols = filter === 'todos' ? fisios : fisios.filter(f => f.id === filter)
  const totalH = (TL.end - TL.start) * TL.pxh
  const hours = Array.from({ length: TL.end - TL.start + 1 }, (_, i) => TL.start + i)
  const yOf = (hhmm: string) => ((toMin(hhmm) - TL.start * 60) / 60) * TL.pxh
  const nowY = yOf(now)
  const showNow = toMin(now) >= TL.start * 60 && toMin(now) <= TL.end * 60

  return (
    <section className="reveal">
      <div className="sect-head">
        <span className="sect-title">Agenda de hoy</span>
        {mostrarFiltro && (
          <div className="tl-filter">
            <button className={`tl-fbtn${filter === 'todos' ? ' active' : ''}`} onClick={() => setFilter('todos')}>
              Equipo
            </button>
            {fisios.map(f => (
              <button key={f.id} className={`tl-fbtn${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
                <span className="tl-dot" style={{ background: f.color }} />
                {f.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tl-grid" style={{ '--cols': cols.length } as React.CSSProperties}>
        {/* Cabeceras */}
        <div />
        {cols.map(f => (
          <div className="tl-head" key={f.id}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: f.color + '1c', color: f.color,
              fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center',
            }}>
              {ini(f)}
            </span>
            {f.nombre}
          </div>
        ))}

        {/* Eje horario */}
        <div className="tl-axis" style={{ height: totalH }}>
          {hours.map(h => (
            <span className="tl-hour" key={h} style={{ top: (h - TL.start) * TL.pxh }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>

        {/* Carriles */}
        {cols.map(f => (
          <div className="tl-lane" key={f.id} style={{ height: totalH }}>
            {hours.map(h => (
              <span className="tl-rule" key={h} style={{ top: (h - TL.start) * TL.pxh }} />
            ))}
            {citas.filter(c => c.fisio_id === f.id).map(c => {
              const top = yOf(c.hora)
              const h   = (c.duracion_min / 60) * TL.pxh
              const cls = [
                'tl-block',
                selectedId === c.id ? 'sel' : '',
                c.estado === 'cancelada' ? 'dead' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={c.id}
                  className={cls}
                  style={{ '--fc': f.color, top, height: Math.max(h - 3, 34) } as React.CSSProperties}
                  onClick={() => onSelect(c)}
                >
                  <span className="tlb-time">
                    {c.hora} – {c.duracion_min}′
                    {c.estado === 'pendiente' && <span className="tlb-warn"> · sin confirmar</span>}
                  </span>
                  <span className="tlb-pac">{c.paciente}</span>
                  {h >= 60 && <span className="tlb-motivo">{c.motivo}</span>}
                </button>
              )
            })}
          </div>
        ))}

        {/* Línea del ahora */}
        {showNow && (
          <div className="now-line" style={{ top: nowY + 42 }}>
            <span className="now-tag">{now}</span>
          </div>
        )}
      </div>
    </section>
  )
}
