'use client'

// components/paciente/Rutinas.tsx
// Dos pestañas en una pantalla: "Mis rutinas" y "Biblioteca". Solo el
// segmento es estado; las filas son enlaces al detalle, que es donde se
// activa o pausa un programa.

import { useState } from 'react'
import Link from 'next/link'
import type { TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { BarraMi } from './BarraMi'
import { FilaRutina, desdePrograma, type RutinaResumen } from './TarjetaRutina'
import { IcoCandado } from './Iconos'

export function Rutinas({
  planFisio,
  mias,
  biblioteca,
  premium,
  inicial,
}: {
  planFisio: RutinaResumen | null
  mias: TarjetaPrograma[]
  biblioteca: TarjetaPrograma[]
  premium: boolean
  inicial: 'mias' | 'biblioteca'
}) {
  const [ver, setVer] = useState<'mias' | 'biblioteca'>(inicial)

  const activas = mias.filter((p) => p.activo)
  const pausadas = mias.filter((p) => !p.activo)
  const hayMias = !!planFisio || mias.length > 0

  return (
    <main className="ap-pagina">
      <header className="ap-cab">
        <h1 className="ap-cab-t grande">Rutinas de ejercicios</h1>
      </header>

      <div className="ap-seg" role="tablist">
        <button role="tab" aria-selected={ver === 'mias'} className={`ap-seg-btn${ver === 'mias' ? ' activa' : ''}`} onClick={() => setVer('mias')}>
          Mis rutinas
        </button>
        <button role="tab" aria-selected={ver === 'biblioteca'} className={`ap-seg-btn${ver === 'biblioteca' ? ' activa' : ''}`} onClick={() => setVer('biblioteca')}>
          Biblioteca
        </button>
      </div>

      {ver === 'mias' ? (
        hayMias ? (
          <div className="ap-lista">
            {planFisio && <FilaRutina r={planFisio} />}
            {activas.map((p) => <FilaRutina key={p.id} r={desdePrograma(p, premium)} />)}
            {pausadas.length > 0 && (
              <>
                <p className="mi-label" style={{ margin: '14px 0 2px' }}>En pausa</p>
                {pausadas.map((p) => <FilaRutina key={p.id} r={{ ...desdePrograma(p, premium), etiqueta: undefined }} />)}
              </>
            )}
          </div>
        ) : (
          <div className="ap-vacio">
            <p className="ap-vacio-t">Todavía no tienes rutinas</p>
            <p className="ap-vacio-d">Elige un programa de la biblioteca y empieza hoy. Puedes tener varios a la vez.</p>
            <button type="button" className="ap-btn" onClick={() => setVer('biblioteca')}>Ver la biblioteca</button>
          </div>
        )
      ) : (
        <>
          <div className="ap-lista">
            {biblioteca.map((p) => <FilaRutina key={p.id} r={desdePrograma(p, premium)} />)}
          </div>
          {!premium && biblioteca.some((p) => p.premium) && (
            <p className="ap-bienvenida-pie" style={{ marginTop: 18 }}>
              <IcoCandado size={12} /> Los programas avanzados forman parte de{' '}
              <Link href="/mi/plan">Premium</Link>.
            </p>
          )}
        </>
      )}

      <BarraMi activa="rutinas" />
    </main>
  )
}
