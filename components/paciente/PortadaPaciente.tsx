'use client'

// components/paciente/PortadaPaciente.tsx
// La cara de la app del paciente.
//
// ORDEN DE LECTURA, que es la decisión de diseño de verdad. La pantalla
// responde a cuatro preguntas, en el orden en que se las hace un paciente:
//   1. ¿Qué tengo que hacer hoy?   → el bloque grande, con el anillo y el botón
//   2. ¿Cómo voy?                  → racha y semana
//   3. ¿Qué viene?                 → próxima cita
//   4. ¿Y cómo me encuentro?       → check-in y evolución del dolor
// Nada de tarjetas de estadísticas arriba: eso es un panel de gestión, no el
// sitio donde alguien con dolor entra a ver qué le toca.
//
// Escribe por identidad (mi_marcar_ejercicio / mi_checkin), no por token: la
// app no tiene el token y no debe tenerlo.

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/app/lib/supabase'
import type { PlanPaciente, ResumenPaciente, EjercicioGuia } from '@/app/lib/paciente/tipos'
import { checksPorFecha, calcularRacha, semanaDe } from '@/app/lib/paciente/fechas'
import { evaColor } from '@/app/lib/paciente/formato'
import { Anillo } from '@/components/paciente/Anillo'
import { SemanaChecks } from '@/components/paciente/SemanaChecks'
import { SparkDolor } from '@/components/paciente/SparkDolor'
import { Revelar } from '@/components/paciente/Revelar'
import { BarraMi } from '@/components/paciente/BarraMi'

// Igual que en la guía: la sesión es la única pantalla con `motion` y no debe
// pesar en la carga de la portada.
const SesionGuiada = dynamic(
  () => import('@/components/paciente/SesionGuiada').then((m) => m.SesionGuiada),
  { ssr: false },
)

function IconCheck() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
}

export function PortadaPaciente({
  resumen,
  plan,
}: {
  resumen: ResumenPaciente
  plan: PlanPaciente | null
}) {
  const hoy = resumen.hoy
  const ejercicios = useMemo(() => plan?.ejercicios ?? [], [plan])

  const [checks, setChecks] = useState<Set<string>>(
    () => new Set((plan?.checks ?? []).map((c) => `${c.ejercicio_id}|${c.fecha}`)),
  )
  const [checkins, setCheckins] = useState(plan?.checkins ?? [])
  const [dolorHoy, setDolorHoy] = useState<number>(
    () => plan?.checkins?.find((c) => c.fecha === hoy)?.dolor ?? 5,
  )
  const [checkinOk, setCheckinOk] = useState<boolean>(
    () => Boolean(plan?.checkins?.find((c) => c.fecha === hoy)),
  )
  const [guardandoCheckin, setGuardandoCheckin] = useState(false)
  const [sesionAbierta, setSesionAbierta] = useState(false)

  const porFecha = useMemo(() => checksPorFecha(checks), [checks])
  const racha = useMemo(() => calcularRacha(porFecha, hoy), [porFecha, hoy])
  const semana = useMemo(() => semanaDe(porFecha, hoy), [porFecha, hoy])

  const hechosHoy = useMemo(
    () => ejercicios.filter((e) => checks.has(`${e.id}|${hoy}`)).length,
    [ejercicios, checks, hoy],
  )
  const completo = ejercicios.length > 0 && hechosHoy === ejercicios.length

  const serieDolor = useMemo(
    () => [...checkins].filter((c) => c.dolor != null).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [checkins],
  )

  const faqEj = useMemo(() => {
    const m = new Map<string, { como_hacerlo?: string; sensacion_normal?: string }>()
    ;(plan?.informe?.faq?.ejercicios ?? []).forEach((f) =>
      m.set((f.nombre ?? '').toLowerCase().trim(), f),
    )
    return m
  }, [plan])

  /* ── escrituras (por identidad) ── */

  const marcarHecho = async (e: EjercicioGuia): Promise<boolean> => {
    const k = `${e.id}|${hoy}`
    if (checks.has(k)) return true
    setChecks((prev) => new Set(prev).add(k))
    try {
      const { data, error } = await supabase.rpc('mi_marcar_ejercicio', {
        p_ejercicio_id: e.id,
        p_hecho: true,
      })
      if (error || !data?.ok) throw new Error()
      return true
    } catch {
      setChecks((prev) => { const s = new Set(prev); s.delete(k); return s })
      return false
    }
  }

  const guardarCheckin = async () => {
    setGuardandoCheckin(true)
    try {
      const { data, error } = await supabase.rpc('mi_checkin', { p_dolor: dolorHoy, p_nota: null })
      if (error || !data?.ok) throw new Error()
      setCheckins((prev) => [...prev.filter((c) => c.fecha !== hoy), { fecha: hoy, dolor: dolorHoy }])
      setCheckinOk(true)
    } catch { /* se queda sin marcar: el paciente puede reintentar */ }
    setGuardandoCheckin(false)
  }

  /* ── render ── */

  const fechaHoy = new Date(hoy + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const cita = resumen.proxima_cita

  return (
    <main className="mi-portada">
      <header className="mi-top">
        <span className="mi-wordmark">RUDAMI</span>
        <span className="mi-clinica">{resumen.clinica?.nombre ?? ''}</span>
      </header>

      <p className="mi-fecha">{fechaHoy}</p>
      <h1 className="mi-saludo">
        Hola, <em>{resumen.paciente.nombre}</em>
      </h1>

      {/* 1 · Qué tengo que hacer hoy */}
      {ejercicios.length > 0 ? (
        <section className="mi-hoy">
          <div className="mi-hoy-fila">
            <Anillo pct={hechosHoy / ejercicios.length} hechos={hechosHoy} total={ejercicios.length} />
            <div className="mi-hoy-txt">
              <p className="mi-hoy-t">{completo ? 'Plan completado' : 'Tu plan de hoy'}</p>
              <p className="mi-hoy-d">
                {completo
                  ? 'Has hecho todo lo de hoy. Eso es lo que hace que esto funcione.'
                  : hechosHoy === 0
                    ? `${ejercicios.length} ${ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} por delante.`
                    : `Te ${ejercicios.length - hechosHoy === 1 ? 'queda 1 ejercicio' : `quedan ${ejercicios.length - hechosHoy} ejercicios`}.`}
              </p>
              {racha > 1 && (
                <span className="mi-racha">
                  <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="M6 0C6 3 2 4.5 2 8.5a4 4 0 0 0 8 0C10 6 8.5 4.8 8 3.5 7.2 5 6.8 5.5 6 6 5.6 4 6 2 6 0Z" /></svg>
                  {racha} días seguidos
                </span>
              )}
            </div>
          </div>

          {!completo && (
            <button className="mi-cta" onClick={() => setSesionAbierta(true)}>
              <span className="mi-cta-ico" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
              </span>
              {hechosHoy === 0 ? 'Empezar mi sesión' : 'Continuar donde lo dejé'}
            </button>
          )}
        </section>
      ) : (
        <section className="mi-hoy mi-hoy-vacio">
          <p className="mi-hoy-t">Todavía no tienes plan</p>
          <p className="mi-hoy-d">
            Tu fisioterapeuta te lo publicará después de tu próxima sesión.
          </p>
        </section>
      )}

      {/* 2 · Cómo voy */}
      {ejercicios.length > 0 && (
        <Revelar className="mi-bloque" orden={0}>
          <h2 className="mi-label">Esta semana</h2>
          <SemanaChecks semana={semana} totalDia={ejercicios.length} />
        </Revelar>
      )}

      {/* 3 · Qué viene */}
      {cita && (
        <Revelar className="mi-cita" orden={1}>
          <span className="mi-cita-punto" style={{ background: cita.color ?? 'var(--accent)' }} />
          <div>
            <p className="mi-cita-t">Próxima cita</p>
            <p className="mi-cita-d">
              {new Date(cita.fecha_hora).toLocaleString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
              })}
              {cita.tipo ? ` · ${cita.tipo}` : ''}
            </p>
          </div>
        </Revelar>
      )}

      {/* 4 · Cómo me encuentro */}
      <Revelar className="mi-bloque" orden={2}>
        <h2 className="mi-label">¿Cómo te encuentras hoy?</h2>
        <div className="mi-eva">
          <input
            className="eva-range" type="range" min={0} max={10} value={dolorHoy}
            aria-label="Tu dolor de hoy, de 0 a 10"
            onChange={(e) => { setDolorHoy(parseInt(e.target.value)); setCheckinOk(false) }}
          />
          <span className="mi-eva-num" style={{ color: evaColor(dolorHoy) }}>
            {dolorHoy}<small>/10</small>
          </span>
        </div>
        <div className="mi-eva-pies"><span>Sin dolor</span><span>Dolor máximo</span></div>

        <button className="mi-secundario" onClick={guardarCheckin} disabled={guardandoCheckin || checkinOk}>
          {checkinOk
            ? <><span className="mi-ok"><IconCheck /></span> Registrado hoy</>
            : guardandoCheckin ? 'Guardando…' : 'Registrar mi dolor de hoy'}
        </button>

        {dolorHoy >= 8 && !checkinOk && (
          <p className="mi-alerta">
            Si el dolor es fuerte o distinto al habitual, para los ejercicios y contacta con tu clínica.
          </p>
        )}
      </Revelar>

      {serieDolor.length > 1 && (
        <Revelar className="mi-bloque" orden={3}>
          <div className="mi-label-fila">
            <h2 className="mi-label">Tu dolor, día a día</h2>
            <span className="mi-ultimo">
              último{' '}
              <strong style={{ color: evaColor(serieDolor[serieDolor.length - 1].dolor) }}>
                {serieDolor[serieDolor.length - 1].dolor}/10
              </strong>
            </span>
          </div>
          <SparkDolor puntos={serieDolor} />
          <a className="mi-ver-progreso" href="/mi/progreso">Ver todo mi progreso →</a>
        </Revelar>
      )}

      {/* Pie */}
      <footer className="mi-pie">
        {resumen.clinica?.telefono && (
          <a
            className="mi-secundario"
            href={`https://wa.me/${resumen.clinica.telefono.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
          >
            Escribir a {resumen.clinica.nombre ?? 'mi clínica'}
          </a>
        )}
        <a className="mi-salir" href="/api/logout?next=%2Fmi%2Fentrar">Cerrar sesión</a>
      </footer>

      <BarraMi activa="hoy" />

      {sesionAbierta && (
        <SesionGuiada
          ejercicios={ejercicios}
          hechosHoy={new Set(ejercicios.filter((e) => checks.has(`${e.id}|${hoy}`)).map((e) => e.id))}
          onMarcar={marcarHecho}
          onCerrar={() => setSesionAbierta(false)}
          fisio={plan?.fisio?.nombre}
          faq={faqEj}
        />
      )}
    </main>
  )
}
