'use client'
// Episodio + historial de sesiones como filas; al clicar se despliega el informe.

import { useState } from 'react'
import Link from 'next/link'
import SesionCard from '@/app/components/SesionCard'
import BotonCerrarEpisodio from '@/app/components/BotonCerrarEpisodio'

const MODO_LABEL: Record<string, string> = { completa: 'Primera', seguimiento: 'Seguimiento', rapida: 'Rápida' }
const evaColor = (v: number | null) => (v == null ? 'var(--faint)' : v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626')
const fechaCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

export function EpisodioHistorial({ episodio, sesiones, paciente, fisios }: { episodio: any; sesiones: any[]; paciente: any; fisios: any[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const ses = sesiones
    .filter(s => s.episodio_id === episodio.id)
    .sort((a, b) => new Date(b.fecha + 'T' + (b.created_at?.slice(11) ?? '00:00')).getTime() - new Date(a.fecha + 'T' + (a.created_at?.slice(11) ?? '00:00')).getTime())

  const activo = episodio.estado === 'activo'
  const inicio = episodio.fecha_inicio ? new Date(episodio.fecha_inicio + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="pac-card">
      <div className="hist-ep-head">
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{episodio.titulo}</p>
          <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 3 }}>Inicio {inicio} · {ses.length} sesion{ses.length !== 1 ? 'es' : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activo
            ? <span style={{ fontSize: 11.5, fontWeight: 600, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />Activo</span>
            : <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--faint)' }}>Cerrado</span>}
          {activo && (
            <>
              <Link href={`/pacientes/${paciente.id}/episodio/${episodio.id}/sesion/primera`} className="btn-line" style={{ height: 30, padding: '0 11px', fontSize: 12.5 }}>+ Nueva sesión</Link>
              <BotonCerrarEpisodio id={episodio.id} />
            </>
          )}
        </div>
      </div>

      {ses.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--faint)', padding: '24px 20px', textAlign: 'center' }}>Aún no hay sesiones en este episodio.</p>
      ) : ses.map(s => (
        <div key={s.id}>
          <button className="hist-row" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <div>
              <div className="hist-date">{fechaCorta(s.fecha)}</div>
              <div className="hist-modo">{MODO_LABEL[s.tipo] ?? 'Sesión'}</div>
            </div>
            <div className="hist-desc">{s.anamnesis || s.notas || 'Sin descripción'}</div>
            <div className="hist-eva">
              <b style={{ color: evaColor(s.dolor_eva) }}>{s.dolor_eva ?? '—'}</b>
              <span>EVA</span>
            </div>
          </button>
          {openId === s.id && (
            <div style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--hair-s)' }}>
              <SesionCard sesion={s} paciente={paciente} fisios={fisios} embedded />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
