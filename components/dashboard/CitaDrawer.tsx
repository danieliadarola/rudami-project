'use client'
// components/dashboard/CitaDrawer.tsx
// Drawer lateral de detalle de cita

import { DI } from '@/components/ui/DashboardIcons'
import type { CitaTimeline, Fisio } from './TimelineAgenda'

interface Props {
  cita: CitaTimeline | null
  fisio?: Fisio
  pacienteId?: string
  onClose: () => void
  onConfirmar?: (id: string) => void
  onCancelar?: (id: string) => void
  onReprogramar?: (id: string) => void
}

const estadoMeta = {
  confirmada: { label: 'Confirmada', cls: 'estado-ok'   },
  pendiente:  { label: 'Pendiente',  cls: 'estado-warn'  },
  cancelada:  { label: 'Cancelada',  cls: 'estado-dead'  },
  completada: { label: 'Completada', cls: 'estado-ok'    },
}

function evaColor(v: number) {
  return v >= 7 ? '#dc2626' : v >= 4 ? '#d97706' : '#10b981'
}

export function CitaDrawer({ cita, fisio, pacienteId, onClose, onConfirmar, onCancelar, onReprogramar }: Props) {
  if (!cita) return null

  const em = estadoMeta[cita.estado]

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Detalle de cita">
        {/* Cabecera */}
        <div className="drawer-head">
          <span className={em.cls}>
            <span className="estado-dot" />
            {em.label}
          </span>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <DI name="x" size={17} strokeWidth={1.8} />
          </button>
        </div>

        {/* Paciente */}
        <div className="drawer-pac">
          <h2>{cita.paciente}</h2>
          <p>{cita.motivo}</p>
        </div>

        {/* Grid de datos */}
        <div className="drawer-grid">
          <div className="dg-item">
            <span className="dg-k"><DI name="clock" size={14} strokeWidth={1.7} /> Horario</span>
            <span className="dg-v" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {cita.hora} · {cita.duracion_min} min
            </span>
          </div>

          {fisio && (
            <div className="dg-item">
              <span className="dg-k"><DI name="stethoscope" size={14} strokeWidth={1.7} /> Fisioterapeuta</span>
              <span className="dg-v">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: fisio.color, display: 'inline-block' }} />
                {fisio.nombre} {fisio.apellidos}
              </span>
            </div>
          )}

          {cita.telefono && (
            <div className="dg-item">
              <span className="dg-k"><DI name="phone" size={14} strokeWidth={1.7} /> Teléfono</span>
              <span className="dg-v" style={{ fontVariantNumeric: 'tabular-nums' }}>{cita.telefono}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="drawer-actions">
          {cita.estado === 'pendiente' && onConfirmar && (
            <button className="btn-ink block" onClick={() => onConfirmar(cita.id)}>
              <DI name="check" size={15} strokeWidth={2.2} /> Confirmar cita
            </button>
          )}
          {pacienteId && (
            <a className="btn-line block" href={`/pacientes/${pacienteId}`}
              style={{ textDecoration: 'none', justifyContent: 'center' }}>
              <DI name="file" size={15} strokeWidth={1.7} /> Abrir ficha del paciente
            </a>
          )}
          <div className="da-row">
            {onReprogramar && (
              <button className="btn-line" onClick={() => onReprogramar(cita.id)}>
                <DI name="refresh" size={14} strokeWidth={1.7} /> Reprogramar
              </button>
            )}
            {onCancelar && cita.estado !== 'cancelada' && (
              <button className="btn-line danger" onClick={() => onCancelar(cita.id)}>
                <DI name="x" size={14} strokeWidth={1.7} /> Cancelar
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
