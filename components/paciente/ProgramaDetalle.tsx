'use client'

// components/paciente/ProgramaDetalle.tsx
// Detalle de una rutina (boceto "Espalda sana"): imagen, título, semanas,
// lista de ejercicios con su check y un pie fijo con "Empezar sesión".
//
// Las marcas se escriben por identidad y según la fuente:
//   plan     → mi_marcar_ejercicio (informe del fisio)
//   programa → mi_programa_marcar  (biblioteca)
// Un programa Premium sin Premium se enseña, pero no se activa ni se marca.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { EjercicioGuia, ProgramaDetalle as Detalle } from '@/app/lib/paciente/tipos'
import { miniaturaEjercicio, dosisCorta } from '@/app/lib/paciente/formato'
import { Miniatura } from './Cabecera'
import { BarraMi } from './BarraMi'
import { IcoAtras, IcoCandado, IcoCheck, IcoChevron, IcoPlay, IcoRutinas } from './Iconos'

const SesionGuiada = dynamic(() => import('./SesionGuiada').then((m) => m.SesionGuiada), { ssr: false })

export function ProgramaDetalle({
  detalle,
  fuente,
  premium,
  fisio,
  faq,
}: {
  detalle: Detalle
  fuente: 'plan' | 'programa'
  premium: boolean
  fisio: string | null
  faq: { nombre?: string; como_hacerlo?: string; sensacion_normal?: string }[]
}) {
  const router = useRouter()
  const { programa: p, ejercicios, hoy } = detalle
  const bloqueado = p.premium && !premium

  const [checks, setChecks] = useState<Set<string>>(
    () => new Set(detalle.checks.map((c) => `${c.ejercicio_id}|${c.fecha}`)),
  )
  const [inscrito, setInscrito] = useState(p.inscrito)
  const [activo, setActivo] = useState(p.activo)
  const [ocupado, setOcupado] = useState(false)
  const [sesion, setSesion] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const hechos = ejercicios.filter((e) => checks.has(`${e.id}|${hoy}`))
  const completo = ejercicios.length > 0 && hechos.length === ejercicios.length

  const faqMap = useMemo(() => {
    const m = new Map<string, { como_hacerlo?: string; sensacion_normal?: string }>()
    faq.forEach((f) => m.set((f.nombre ?? '').toLowerCase().trim(), f))
    return m
  }, [faq])

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200) }

  /* ── escrituras ── */

  const marcar = async (e: EjercicioGuia, hecho: boolean): Promise<boolean> => {
    if (fuente === 'programa' && !inscrito) {
      // Marcar sin estar inscrito no tiene sentido: primero se activa.
      const ok = await activar(true)
      if (!ok) return false
    }
    const k = `${e.id}|${hoy}`
    setChecks((prev) => { const s = new Set(prev); if (hecho) s.add(k); else s.delete(k); return s })
    try {
      const { data, error } = fuente === 'plan'
        ? await supabase.rpc('mi_marcar_ejercicio', { p_ejercicio_id: e.id, p_hecho: hecho })
        : await supabase.rpc('mi_programa_marcar', { p_pe_id: e.id, p_hecho: hecho })
      if (error || !data?.ok) throw new Error()
      return true
    } catch {
      setChecks((prev) => { const s = new Set(prev); if (hecho) s.delete(k); else s.add(k); return s })
      avisar('No se ha podido guardar')
      return false
    }
  }

  const activar = async (on: boolean): Promise<boolean> => {
    setOcupado(true)
    try {
      const { data, error } = await supabase.rpc('mi_programa_activar', { p_id: p.id, p_activo: on })
      if (error || !data?.ok) {
        if (data?.premium) router.push('/mi/plan')
        else avisar('No se ha podido guardar')
        return false
      }
      setInscrito(true)
      setActivo(on)
      avisar(on ? 'Rutina añadida a las tuyas' : 'Rutina en pausa')
      router.refresh()
      return true
    } finally {
      setOcupado(false)
    }
  }

  /* ── render ── */

  const imagen = p.imagen_url ?? (ejercicios[0] ? miniaturaEjercicio(ejercicios[0]) : null)
  const semanas = p.semanas > 0 ? Array.from({ length: p.semanas }, (_, i) => i + 1) : []

  return (
    <main className="ap-pagina con-pie">
      <div className={`ap-hero${imagen?.endsWith('.svg') ? ' dibujo' : ''}`}>
        {imagen
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={imagen} alt="" />
          : <div className="ap-media-vacia"><IcoRutinas size={40} /></div>}
        <div className="ap-hero-nav">
          <Link href="/mi/rutinas" className="ap-atras" aria-label="Volver"><IcoAtras /></Link>
        </div>
      </div>

      <div className="ap-titulo-fila">
        <h1 className="ap-titulo">{p.titulo}</h1>
        {bloqueado
          ? <span className="ap-etiqueta premium"><IcoCandado size={11} /> Premium</span>
          : fuente === 'plan'
            ? <span className="ap-etiqueta">Tu fisio</span>
            : inscrito && activo ? <span className="ap-etiqueta">Activa</span> : null}
      </div>
      <div className="ap-meta">
        {p.semanas > 0 && <span>{p.semanas} semanas</span>}
        <span>{ejercicios.length} ejercicios</span>
        {p.frecuencia && <span>{p.frecuencia}</span>}
        {p.nivel && <span style={{ textTransform: 'capitalize' }}>{p.nivel}</span>}
        {fisio && <span>De {fisio}</span>}
      </div>
      {p.descripcion && <p className="ap-descripcion">{p.descripcion}</p>}

      {semanas.length > 0 && inscrito && (
        <div className="ap-semanas" aria-label="Semanas del programa">
          {semanas.map((n) => (
            <span
              key={n}
              className={`ap-semana${n === p.semana_actual ? ' actual' : n < (p.semana_actual ?? 0) ? ' hecha' : ''}`}
            >
              Semana {n}
            </span>
          ))}
        </div>
      )}

      <h2 className="ap-h2">
        {completo ? 'Todo hecho por hoy' : `Ejercicios de hoy · ${hechos.length}/${ejercicios.length}`}
      </h2>
      <div className="ap-lista">
        {ejercicios.map((e) => {
          const hecho = checks.has(`${e.id}|${hoy}`)
          return (
            <div key={e.id} className={`ap-fila${hecho ? ' hecha' : ''}`} style={{ cursor: 'default' }}>
              <button
                type="button"
                className={`ap-check${hecho ? ' on' : ''}`}
                aria-label={hecho ? `Desmarcar ${e.nombre}` : `Marcar ${e.nombre} como hecho`}
                aria-pressed={hecho}
                disabled={bloqueado}
                onClick={() => marcar(e, !hecho)}
              >
                <IcoCheck size={12} />
              </button>
              <Link
                href={bloqueado ? '/mi/plan' : `/mi/ejercicio/${e.id}?de=${fuente}`}
                style={{ display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
              >
                <Miniatura src={miniaturaEjercicio(e)} className="" vacio={<IcoRutinas size={22} />} />
                <span className="ap-fila-txt">
                  <span className="ap-fila-t" style={{ display: 'block' }}>{e.nombre}</span>
                  <span className="ap-fila-d" style={{ display: 'block' }}>
                    {[e.musculos, dosisCorta(e) || e.duracion].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <IcoChevron className="chev" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Pie fijo: la acción principal a la altura del pulgar */}
      <div className="ap-pie-fijo">
        {bloqueado ? (
          <Link href="/mi/plan" className="ap-btn"><IcoCandado size={16} /> Desbloquear con Premium</Link>
        ) : fuente === 'programa' && !inscrito ? (
          <button type="button" className="ap-btn" disabled={ocupado} onClick={() => activar(true)}>
            Añadir a mis rutinas
          </button>
        ) : completo ? (
          fuente === 'programa'
            ? <button type="button" className="ap-btn-linea" style={{ background: 'var(--paper)' }} disabled={ocupado} onClick={() => activar(!activo)}>
                {activo ? 'Pausar esta rutina' : 'Reanudar esta rutina'}
              </button>
            : <Link href="/mi/progreso" className="ap-btn-linea" style={{ background: 'var(--paper)' }}>Ver mi progreso</Link>
        ) : (
          <button type="button" className="ap-btn" onClick={() => setSesion(true)}>
            <IcoPlay size={14} /> {hechos.length === 0 ? 'Empezar sesión' : 'Continuar sesión'}
          </button>
        )}
      </div>

      {fuente === 'programa' && inscrito && !completo && !bloqueado && (
        <p style={{ textAlign: 'center', marginTop: 18 }}>
          <button type="button" className="ap-btn-texto" disabled={ocupado} onClick={() => activar(!activo)}>
            {activo ? 'Pausar esta rutina' : 'Reanudar esta rutina'}
          </button>
        </p>
      )}

      {toast && <div className="ap-toast" role="status">{toast}</div>}

      <BarraMi activa="rutinas" />

      {sesion && (
        <SesionGuiada
          ejercicios={ejercicios}
          hechosHoy={new Set(hechos.map((e) => e.id))}
          onMarcar={(e) => marcar(e, true)}
          onCerrar={() => setSesion(false)}
          fisio={fisio}
          faq={faqMap}
        />
      )}
    </main>
  )
}
