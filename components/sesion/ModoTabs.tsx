'use client'
// components/sesion/ModoTabs.tsx
// Conmutador entre los 3 modos de sesión. Siempre disponibles: el fisio elige.

import Link from 'next/link'

type Modo = 'completa' | 'rapida' | 'seguimiento'

const MODOS: { key: Modo; label: string }[] = [
  { key: 'completa',    label: 'Completa' },
  { key: 'rapida',      label: 'Rápida' },
  { key: 'seguimiento', label: 'Seguimiento' },
]

export function ModoTabs({ id, episodioId, current }: { id: string; episodioId: string; current: Modo }) {
  return (
    <div className="modo-tabs" role="tablist" aria-label="Tipo de sesión">
      {MODOS.map(m => (
        <Link
          key={m.key}
          href={`/pacientes/${id}/episodio/${episodioId}/sesion/${m.key}`}
          className={`modo-tab${m.key === current ? ' active' : ''}`}
          aria-current={m.key === current ? 'page' : undefined}
        >
          {m.label}
        </Link>
      ))}
    </div>
  )
}
