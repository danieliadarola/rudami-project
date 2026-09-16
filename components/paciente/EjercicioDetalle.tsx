'use client'

// components/paciente/EjercicioDetalle.tsx
// Un ejercicio a pantalla completa (boceto "Gato - Vaca"): la media arriba,
// la dosis en tres chips, "Cómo hacerlo" numerado, el consejo, los errores a
// evitar, la nota del fisio si la hay, y el botón de completar a la altura
// del pulgar.

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import type { EjercicioDetalle as Detalle } from '@/app/lib/paciente/tipos'
import { miniaturaEjercicio } from '@/app/lib/paciente/formato'
import { normalizarMusculos } from '@/app/lib/musculos'
import { MapaMuscular } from '@/components/guia/MapaMuscular'
import { BarraMi } from './BarraMi'
import { IcoAtras, IcoCheck, IcoChispa, IcoPlay, IcoReloj, IcoRepes, IcoRutinas, IcoSeries } from './Iconos'

/** "Colócate a cuatro patas. Inhala y arquea. Exhala y redondea." → 3 pasos.
 *  Si el fisio ya escribió líneas o números, se respetan. */
function enPasos(texto?: string | null): string[] {
  if (!texto) return []
  const porLineas = texto.split(/\r?\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-•])\s*/, '').trim()).filter(Boolean)
  if (porLineas.length > 1) return porLineas
  const frases = texto.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).map((f) => f.trim()).filter(Boolean)
  return frases.length > 1 ? frases : [texto.trim()]
}

export function EjercicioDetalle({
  detalle,
  fuente,
  premium,
}: {
  detalle: Detalle
  fuente: 'plan' | 'programa'
  premium: boolean
}) {
  const { ejercicio: e, programa } = detalle
  const [hecho, setHecho] = useState(detalle.hecho_hoy)
  const [ocupado, setOcupado] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const imagen = miniaturaEjercicio(e)
  const pasos = enPasos(e.instrucciones)
  const grupos = normalizarMusculos(e.musculos)
  const volver = fuente === 'plan' ? '/mi/rutinas/plan' : `/mi/rutinas/${programa.id}`

  const marcar = async () => {
    const nuevo = !hecho
    setHecho(nuevo)
    setOcupado(true)
    try {
      const { data, error } = fuente === 'plan'
        ? await supabase.rpc('mi_marcar_ejercicio', { p_ejercicio_id: e.id, p_hecho: nuevo })
        : await supabase.rpc('mi_programa_marcar', { p_pe_id: e.id, p_hecho: nuevo })
      if (error || !data?.ok) throw new Error()
      if (nuevo) { setToast('¡Hecho! Registrado para hoy'); setTimeout(() => setToast(null), 2000) }
    } catch {
      setHecho(!nuevo)
      setToast(fuente === 'programa' ? 'Añade la rutina a las tuyas para marcar' : 'No se ha podido guardar')
      setTimeout(() => setToast(null), 2600)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="ap-pagina con-pie">
      <div className={`ap-media${imagen?.endsWith('.svg') ? ' dibujo' : ''}`}>
        {imagen
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={imagen} alt={e.nombre ?? ''} />
          : <div className="ap-media-vacia"><IcoRutinas size={40} /></div>}
        {e.video_url && (
          <a className="ap-media-play" href={e.video_url} target="_blank" rel="noopener noreferrer" aria-label="Ver el vídeo">
            <span><IcoPlay size={24} /></span>
          </a>
        )}
        {e.duracion && <span className="ap-media-dur">{e.duracion}</span>}
        <div className="ap-hero-nav">
          <Link href={volver} className="ap-atras" aria-label="Volver"><IcoAtras /></Link>
        </div>
      </div>

      <h1 className="ap-titulo">{e.nombre}</h1>
      <div className="ap-meta">
        {e.zona && <span>{e.zona}</span>}
        {e.musculos && <span>{e.musculos}</span>}
        {e.nivel && <span style={{ textTransform: 'capitalize' }}>{e.nivel}</span>}
        {e.equipo && <span>{e.equipo}</span>}
      </div>

      {(e.series || e.repeticiones || e.descanso || e.duracion) && (
        <div className="ap-dosis">
          {e.series != null && <div><IcoSeries /><strong>{e.series} {e.series === 1 ? 'serie' : 'series'}</strong></div>}
          {(e.repeticiones || e.duracion) && <div><IcoRepes /><strong>{e.repeticiones ?? e.duracion}</strong></div>}
          {e.descanso && <div><IcoReloj /><strong>Descanso {e.descanso}</strong></div>}
        </div>
      )}

      {e.nota && (
        <div className="ap-consejo nota">
          <IcoChispa size={18} />
          <div>
            <div className="ap-consejo-t">Nota de tu fisioterapeuta</div>
            <div className="ap-consejo-d">{e.nota}</div>
          </div>
        </div>
      )}

      {pasos.length > 0 && (
        <>
          <h2 className="ap-h2">Cómo hacerlo</h2>
          <ol className="ap-pasos">{pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
        </>
      )}

      {detalle.faq?.como_hacerlo && (
        <p className="ap-parrafo" style={{ marginTop: 14 }}>{detalle.faq.como_hacerlo}</p>
      )}

      {(e.consejos || detalle.faq?.sensacion_normal) && (
        <div className="ap-consejo">
          <IcoChispa size={18} />
          <div>
            <div className="ap-consejo-t">Consejo</div>
            <div className="ap-consejo-d">{e.consejos ?? detalle.faq?.sensacion_normal}</div>
            {e.consejos && detalle.faq?.sensacion_normal && (
              <div className="ap-consejo-d" style={{ marginTop: 6, color: 'var(--muted)' }}>{detalle.faq.sensacion_normal}</div>
            )}
          </div>
        </div>
      )}

      {e.errores && (
        <div className="ap-consejo aviso">
          <IcoChispa size={18} />
          <div>
            <div className="ap-consejo-t">Evita</div>
            <div className="ap-consejo-d">{e.errores}</div>
          </div>
        </div>
      )}

      {grupos.length > 0 && (
        <>
          <h2 className="ap-h2">Zona que trabajas</h2>
          <MapaMuscular activos={grupos} modo="completo" alto={150} leyenda />
        </>
      )}

      {e.frecuencia && <p className="pg-nota" style={{ marginTop: 18 }}>Frecuencia recomendada: {e.frecuencia}.</p>}

      {!premium && (
        <p className="ap-bienvenida-pie" style={{ marginTop: 22 }}>
          ¿Dudas sobre este ejercicio? Con <Link href="/mi/plan">Premium</Link> el asistente te las resuelve al momento.
        </p>
      )}

      <div className="ap-pie-fijo">
        <button
          type="button"
          className={hecho ? 'ap-btn-linea' : 'ap-btn'}
          style={hecho ? { background: 'var(--paper)' } : undefined}
          disabled={ocupado}
          onClick={marcar}
        >
          {hecho ? <><span className="mi-ok"><IcoCheck size={11} /></span> Completado hoy · deshacer</> : 'Marcar como completado'}
        </button>
      </div>

      {toast && <div className="ap-toast" role="status">{toast}</div>}

      <BarraMi activa="rutinas" />
    </main>
  )
}
