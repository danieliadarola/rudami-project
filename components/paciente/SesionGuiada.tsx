'use client'

// components/paciente/SesionGuiada.tsx
// La sesión guiada: el salto de "aquí tienes tu lista" a "vamos, uno a uno".
//
// IDEA DE DISEÑO — "una cosa cada vez".
// Todo lo que no sea el ejercicio de ahora desaparece. Nada de listas, nada de
// navegación, nada que recuerde a un panel. Sobre el blanco editorial de v3
// solo quedan tres cosas: cuánto llevas (una línea de pelo dorada arriba), qué
// toca (la media grande y el nombre) y una única acción a la altura del pulgar.
// El único adorno tipográfico es el contador en Newsreader itálica, que es lo
// que convierte la pantalla en un ritual en vez de en un formulario.
//
// Se usa desde la guía por enlace (/r/[token]) y desde la app (/mi): no sabe
// nada de sesiones ni de tokens, solo recibe ejercicios y un callback.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from 'motion/react'
import type { EjercicioGuia } from '@/app/lib/paciente/tipos'
import { miniaturaEjercicio, segundosDeDescanso, reloj, youtubeId } from '@/app/lib/paciente/formato'
import { useWakeLock } from '@/app/lib/paciente/useWakeLock'
import { MapaMuscular } from '@/components/guia/MapaMuscular'
import { normalizarMusculos } from '@/app/lib/musculos'

type Fase = 'ejercicio' | 'descanso' | 'fin'

interface Props {
  ejercicios: EjercicioGuia[]
  /** Ids ya marcados hoy: la sesión arranca en el primero que quede. */
  hechosHoy: Set<string>
  /** Marca en servidor. Devuelve false si falló, para poder revertir. */
  onMarcar: (ejercicio: EjercicioGuia) => Promise<boolean>
  onCerrar: () => void
  fisio?: string | null
  /** Explicación llana por nombre de ejercicio, de la FAQ pregenerada. */
  faq?: Map<string, { como_hacerlo?: string; sensacion_normal?: string }>
}

/* ──────────────────────────── piezas ──────────────────────────── */

function AnilloCuenta({ pct, texto }: { pct: number; texto: string }) {
  const R = 62
  const C = 2 * Math.PI * R
  return (
    <div className="sg-cuenta">
      <svg width="152" height="152" viewBox="0 0 152 152">
        <circle className="sg-cuenta-bg" cx="76" cy="76" r={R} />
        <circle
          className="sg-cuenta-fg"
          cx="76" cy="76" r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
        />
      </svg>
      <span className="sg-cuenta-num">{texto}</span>
    </div>
  )
}

function Dosis({ e }: { e: EjercicioGuia }) {
  const campos: [string, string | number | null | undefined][] = [
    ['Series', e.series],
    ['Reps', e.repeticiones],
    ['Tiempo', e.duracion],
    ['Descanso', e.descanso],
  ]
  const visibles = campos.filter(([, v]) => v != null && v !== '')
  if (!visibles.length) return null
  return (
    <div className="sg-dosis">
      {visibles.map(([l, v]) => (
        <div key={l}>
          <div className="l">{l}</div>
          <div className="v">{v}</div>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────── componente principal ──────────────────────── */

export function SesionGuiada({ ejercicios, hechosHoy, onMarcar, onCerrar, fisio, faq }: Props) {
  const reducido = useReducedMotion()

  const [hechos, setHechos] = useState<Set<string>>(() => new Set(hechosHoy))
  const [idx, setIdx] = useState(() => {
    const i = ejercicios.findIndex((e) => !hechosHoy.has(e.id))
    return i === -1 ? 0 : i
  })
  const [fase, setFase] = useState<Fase>(() =>
    ejercicios.length > 0 && ejercicios.every((e) => hechosHoy.has(e.id)) ? 'fin' : 'ejercicio',
  )
  const [restante, setRestante] = useState(0)
  const [totalDescanso, setTotalDescanso] = useState(0)
  const [detalle, setDetalle] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const contenedor = useRef<HTMLDivElement>(null)

  // La pantalla no se apaga mientras la sesión está viva.
  useWakeLock(fase !== 'fin')

  const ej = ejercicios[idx]
  const totalHechos = useMemo(
    () => ejercicios.filter((e) => hechos.has(e.id)).length,
    [ejercicios, hechos],
  )
  const progreso = ejercicios.length ? totalHechos / ejercicios.length : 0

  /* ── navegación ── */

  const avanzar = useCallback(() => {
    setDetalle(false)
    const siguiente = ejercicios.findIndex((e, i) => i > idx && !hechos.has(e.id))
    if (siguiente !== -1) { setIdx(siguiente); setFase('ejercicio'); return }
    // Puede quedar alguno anterior que se saltó: se vuelve a por él.
    const pendiente = ejercicios.findIndex((e) => !hechos.has(e.id))
    if (pendiente !== -1) { setIdx(pendiente); setFase('ejercicio'); return }
    setFase('fin')
  }, [ejercicios, idx, hechos])

  const marcar = useCallback(async () => {
    if (!ej || guardando) return
    setGuardando(true)
    setHechos((prev) => new Set(prev).add(ej.id)) // optimista

    const ok = await onMarcar(ej)
    if (!ok) {
      setHechos((prev) => { const s = new Set(prev); s.delete(ej.id); return s })
      setGuardando(false)
      return
    }
    setGuardando(false)

    // Descanso solo si el fisio lo prescribió y aún queda trabajo por hacer.
    const seg = segundosDeDescanso(ej.descanso)
    const quedan = ejercicios.some((x, i) => i !== idx && !hechos.has(x.id))
    if (seg && quedan) {
      setTotalDescanso(seg)
      setRestante(seg)
      setDetalle(false)
      setFase('descanso')
    } else {
      avanzar()
    }
  }, [ej, guardando, onMarcar, ejercicios, idx, hechos, avanzar])

  /* ── cuenta atrás del descanso ──
     Se cuenta contra un instante de reloj, no descontando un segundo por
     tick: el móvil ralentiza los temporizadores en segundo plano, y contando
     ticks el descanso se alargaría cada vez que el paciente mira otra cosa.
     El setState vive en el callback del intervalo (un evento externo), nunca
     en el cuerpo del efecto: hacerlo ahí encadena renders y con reactCompiler
     activado además es error de lint. */
  useEffect(() => {
    if (fase !== 'descanso' || totalDescanso <= 0) return
    const fin = Date.now() + totalDescanso * 1000
    const t = setInterval(() => {
      const quedan = Math.ceil((fin - Date.now()) / 1000)
      if (quedan <= 0) {
        clearInterval(t)
        setRestante(0)
        avanzar()
      } else {
        setRestante(quedan)
      }
    }, 250)
    return () => clearInterval(t)
  }, [fase, totalDescanso, avanzar])

  /* ── teclado y foco ── */
  useEffect(() => {
    contenedor.current?.focus()
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  // El fondo no debe poder desplazarse por detrás de la sesión.
  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [])

  /* ── render ── */

  const transicion = reducido
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 34 }

  const entra = reducido ? { opacity: 1 } : { opacity: 0, y: 18 }
  const centro = { opacity: 1, y: 0 }
  const sale = reducido ? { opacity: 1 } : { opacity: 0, y: -18 }

  const fq = ej ? faq?.get((ej.nombre ?? '').toLowerCase().trim()) : undefined
  const grupos = ej ? normalizarMusculos(ej.musculos) : []
  const media = ej ? miniaturaEjercicio(ej) : null
  const yt = ej ? youtubeId(ej.video_url) : null

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className="sg"
        role="dialog"
        aria-modal="true"
        aria-label="Sesión de ejercicios"
        ref={contenedor}
        tabIndex={-1}
      >
        {/* Cuánto llevas: una sola línea de pelo, dorada. */}
        <div className="sg-barra" aria-hidden="true">
          <span style={{ transform: `scaleX(${progreso})` }} />
        </div>

        <header className="sg-top">
          <button className="sg-cerrar" onClick={onCerrar} aria-label="Salir de la sesión">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          {fase !== 'fin' && (
            <p className="sg-contador">
              <em>{String(totalHechos + 1).padStart(2, '0')}</em>
              <span> / {String(ejercicios.length).padStart(2, '0')}</span>
            </p>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {/* ───────────── descanso ───────────── */}
          {fase === 'descanso' && (
            <m.section
              key="descanso"
              className="sg-cuerpo sg-descanso"
              initial={entra} animate={centro} exit={sale} transition={transicion}
            >
              <AnilloCuenta
                pct={totalDescanso ? restante / totalDescanso : 0}
                texto={reloj(restante)}
              />
              <p className="sg-descanso-t">Descansa</p>
              <p className="sg-descanso-d">Respira tranquilo. Seguimos en breve.</p>
              <button className="sg-secundario" onClick={avanzar}>Saltar descanso</button>
            </m.section>
          )}

          {/* ───────────── fin ───────────── */}
          {fase === 'fin' && (
            <m.section
              key="fin"
              className="sg-cuerpo sg-fin"
              initial={entra} animate={centro} exit={sale} transition={transicion}
            >
              <AnilloCuenta pct={1} texto={`${totalHechos}`} />
              <h2 className="sg-fin-t">Sesión <em>completada</em></h2>
              <p className="sg-fin-d">
                {totalHechos === ejercicios.length
                  ? 'Has hecho todo lo de hoy. Eso es exactamente lo que hace que esto funcione.'
                  : `Has hecho ${totalHechos} de ${ejercicios.length}. Todo suma.`}
              </p>
              <button className="sg-principal" onClick={onCerrar}>Volver a mi plan</button>
            </m.section>
          )}

          {/* ───────────── ejercicio ───────────── */}
          {fase === 'ejercicio' && ej && (
            <m.section
              key={ej.id}
              className="sg-cuerpo"
              initial={entra} animate={centro} exit={sale} transition={transicion}
            >
              <div className="sg-media">
                {media ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media} alt={ej.nombre ?? 'Ejercicio'} loading="eager" />
                ) : (
                  <div className="sg-media-vacia" aria-hidden="true">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h3l2-6 4 12 2-6h4" /></svg>
                  </div>
                )}
              </div>

              <h2 className="sg-nombre">{ej.nombre}</h2>
              <Dosis e={ej} />

              {ej.nota && (
                <p className="sg-nota">
                  <strong>{fisio ?? 'Tu fisio'} dice:</strong> {ej.nota}
                </p>
              )}

              <button
                className="sg-detalle-btn"
                onClick={() => setDetalle((v) => !v)}
                aria-expanded={detalle}
              >
                {detalle ? 'Ocultar indicaciones' : '¿Cómo se hace?'}
              </button>

              {detalle && (
                <div className="sg-detalle">
                  {fq?.como_hacerlo && <p className="sg-detalle-p fuerte">{fq.como_hacerlo}</p>}
                  {ej.instrucciones && <p className="sg-detalle-p">{ej.instrucciones}</p>}
                  {ej.errores && <p className="sg-aviso"><span className="mal">Evita</span>{ej.errores}</p>}
                  {ej.consejos && <p className="sg-aviso"><span className="bien">Consejo</span>{ej.consejos}</p>}
                  {fq?.sensacion_normal && <p className="sg-sensacion">{fq.sensacion_normal}</p>}
                  {grupos.length > 0 && (
                    <div className="sg-mapa">
                      <div className="sg-mapa-t">Deberías notarlo aquí</div>
                      <MapaMuscular activos={grupos} modo="completo" alto={140} leyenda />
                    </div>
                  )}
                  {yt && (
                    <a className="sg-video" href={`https://www.youtube.com/watch?v=${yt}`} target="_blank" rel="noopener noreferrer">
                      Ver el vídeo del ejercicio
                    </a>
                  )}
                </div>
              )}
            </m.section>
          )}
        </AnimatePresence>

        {fase === 'ejercicio' && ej && (
          <footer className="sg-pie">
            <button className="sg-principal" onClick={marcar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Hecho'}
            </button>
            <button className="sg-secundario" onClick={avanzar} disabled={guardando}>
              Ahora no puedo
            </button>
          </footer>
        )}
      </div>
    </LazyMotion>
  )
}
