'use client'
// components/layout/Topbar.tsx
// Cabecera editorial del dashboard

import { useState } from 'react'
import { DI } from '@/components/ui/DashboardIcons'
import { Asistente } from '@/components/asistente/Asistente'

interface Props {
  nombre: string
  citasHoy: number
  pendientes: number
  onNuevaCita?: () => void
}

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaLarga() {
  const f = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return f.charAt(0).toUpperCase() + f.slice(1)
}

export function Topbar({ nombre, citasHoy, pendientes, onNuevaCita }: Props) {
  const [asistOpen, setAsistOpen] = useState(false)

  return (
    <header className="topbar-v3">
      <Asistente open={asistOpen} onClose={() => setAsistOpen(false)} />

      <div className="topbar-greet">
        <h1>{saludo()}, <strong>{nombre}</strong></h1>
        <p>
          {fechaLarga()} · <strong style={{ color: 'var(--ink)' }}>{citasHoy} citas</strong> hoy
          {pendientes > 0 && (
            <span style={{ color: '#d97706', fontWeight: 600 }}>
              {' '}· {pendientes} por confirmar
            </span>
          )}
        </p>
      </div>

      <div className="topbar-actions">
        <button className="search-box asist-trigger" onClick={() => setAsistOpen(true)} aria-label="Abrir asistente">
          <DI name="search" size={16} strokeWidth={1.8} />
          <span style={{ flex: 1, textAlign: 'left' }}>Pregunta o busca…</span>
          <span className="asist-badge">✦ IA</span>
        </button>

        <button
          className="btn-line"
          aria-label="Notificaciones"
          style={{ width: 38, height: 38, padding: 0, justifyContent: 'center', position: 'relative' }}
        >
          <DI name="bell" size={17} strokeWidth={1.7} />
          {pendientes > 0 && (
            <span style={{
              position: 'absolute', top: 8, right: 8,
              width: 6, height: 6, borderRadius: '50%', background: '#dc2626',
            }} />
          )}
        </button>

        <button className="btn-ink" onClick={onNuevaCita}>
          <DI name="plus" size={16} strokeWidth={2.2} /> Nueva cita
        </button>
      </div>
    </header>
  )
}
