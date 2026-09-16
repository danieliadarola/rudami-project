'use client'

// components/paciente/PortadaPaciente.tsx
// Inicio de la app, adaptado del boceto: saludo, próxima sesión, "tu plan de
// hoy" (anillo + empezar), carrusel de rutinas, accesos rápidos, check-in de
// dolor y la invitación al asistente.
//
// ORDEN DE LECTURA: las preguntas de un paciente en el orden en que se las
// hace. ¿Qué viene? → ¿Qué me toca hoy? → ¿Qué más tengo? → ¿Cómo me encuentro?
//
// Escribe por identidad (mi_marcar_ejercicio / mi_programa_marcar /
// mi_checkin), nunca por token: la app no tiene el token y no debe tenerlo.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/app/lib/supabase'
import type {
  AvisoPaciente, CuentaPaciente, PlanPaciente, ProgramaDetalle, ResumenPaciente, TarjetaPrograma, EjercicioGuia,
} from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { checksPorFecha, calcularRacha } from '@/app/lib/paciente/fechas'
import { evaColor, miniaturaEjercicio } from '@/app/lib/paciente/formato'
import { Anillo } from './Anillo'
import { Revelar } from './Revelar'
import { BarraMi } from './BarraMi'
import { RutinaMini, desdePrograma, type RutinaResumen } from './TarjetaRutina'
import { IcoCalendario, IcoChat, IcoChevron, IcoChispa, IcoCheck, IcoGrafica, IcoLlama, IcoPerfil, IcoPlay, IcoRutinas, IcoClinica } from './Iconos'

// La sesión es la única pantalla con `motion` y no debe pesar en la portada.
const SesionGuiada = dynamic(
  () => import('./SesionGuiada').then((m) => m.SesionGuiada),
  { ssr: false },
)

export function PortadaPaciente({
  cuenta,
  plan,
  programas,
  programaHoy,
  proximaCita,
  avisos,
}: {
  cuenta: CuentaPaciente
  plan: PlanPaciente | null
  programas: TarjetaPrograma[]
  programaHoy: ProgramaDetalle | null
  proximaCita: ResumenPaciente['proxima_cita']
  /** Avisos de la clínica sin leer. */
  avisos: AvisoPaciente[]
}) {
  const [pendientes, setPendientes] = useState(avisos)
  const leerAviso = async (id: string) => {
    setPendientes((prev) => prev.filter((a) => a.id !== id))
    await supabase.rpc('mi_aviso_leer', { p_id: id })
  }

  const hoy = cuenta.hoy
  const premium = esPremium(cuenta)

  // ── El plan de hoy: el del fisio si existe; si no, el primer programa activo.
  const fuente: 'plan' | 'programa' | null = plan ? 'plan' : programaHoy ? 'programa' : null
  const ejercicios: EjercicioGuia[] = useMemo(
    () => plan?.ejercicios ?? programaHoy?.ejercicios ?? [],
    [plan, programaHoy],
  )
  const [checks, setChecks] = useState<Set<string>>(
    () => new Set(((plan ?? programaHoy)?.checks ?? []).map((c) => `${c.ejercicio_id}|${c.fecha}`)),
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
  const hechosHoy = useMemo(
    () => ejercicios.filter((e) => checks.has(`${e.id}|${hoy}`)).length,
    [ejercicios, checks, hoy],
  )
  const completo = ejercicios.length > 0 && hechosHoy === ejercicios.length

  const faqEj = useMemo(() => {
    const m = new Map<string, { como_hacerlo?: string; sensacion_normal?: string }>()
    ;(plan?.informe?.faq?.ejercicios ?? []).forEach((f) => m.set((f.nombre ?? '').toLowerCase().trim(), f))
    return m
  }, [plan])

  /* ── escrituras (por identidad) ── */

  const marcarHecho = async (e: EjercicioGuia): Promise<boolean> => {
    const k = `${e.id}|${hoy}`
    if (checks.has(k)) return true
    setChecks((prev) => new Set(prev).add(k))
    try {
      const { data, error } = fuente === 'plan'
        ? await supabase.rpc('mi_marcar_ejercicio', { p_ejercicio_id: e.id, p_hecho: true })
        : await supabase.rpc('mi_programa_marcar', { p_pe_id: e.id, p_hecho: true })
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

  /* ── rutinas para el carrusel: la del fisio primero ── */

  const rutinas: RutinaResumen[] = useMemo(() => {
    const lista: RutinaResumen[] = []
    if (plan) {
      lista.push({
        href: '/mi/rutinas/plan',
        titulo: 'Plan de tu fisioterapeuta',
        sub: `${plan.ejercicios.length} ejercicios`,
        imagen: plan.ejercicios[0] ? miniaturaEjercicio(plan.ejercicios[0]) : null,
        hechos: plan.ejercicios.filter((e) => checks.has(`${e.id}|${hoy}`)).length,
        total: plan.ejercicios.length,
        pie: plan.fisio?.nombre ? `De ${plan.fisio.nombre}` : undefined,
        etiqueta: 'fisio',
      })
    }
    programas.forEach((p) => {
      const r = desdePrograma(p, premium)
      // Si este programa es el "plan de hoy", su progreso vive en el estado local.
      if (programaHoy && p.id === programaHoy.programa.id) r.hechos = hechosHoy
      lista.push(r)
    })
    return lista
  }, [plan, programas, programaHoy, checks, hoy, premium, hechosHoy])

  /* ── render ── */

  const nombre = cuenta.nombre?.split(' ')[0] ?? (cuenta.email ?? '').split('@')[0]
  const fechaHoy = new Date(hoy + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const tituloHoy = plan ? 'Tu plan de hoy' : programaHoy ? programaHoy.programa.titulo : null

  return (
    <main className="mi-portada ap-pagina">
      <header className="mi-top" style={{ marginBottom: 18 }}>
        <span className="mi-wordmark">RUDAMI</span>
        <span className="mi-clinica">{cuenta.clinica?.nombre ?? (premium ? 'Premium' : 'Free')}</span>
      </header>

      <h1 className="ap-saludo">Hola, <em>{nombre}</em></h1>
      <p className="ap-sub" style={{ textTransform: 'none' }}>
        {ejercicios.length > 0 ? 'Aquí tienes tu plan de hoy.' : 'Tu salud también es un hábito.'}
        {' '}<span style={{ color: 'var(--faint)' }}>{fechaHoy}</span>
      </p>

      {/* 0 · Avisos de la clínica (sin leer) */}
      {pendientes.map((a) => (
        <section key={a.id} className="ap-consejo nota" style={{ marginTop: 18 }} role="status">
          <IcoClinica size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ap-consejo-t">Aviso de {cuenta.clinica?.nombre ?? 'tu clínica'}{a.autor ? ` · ${a.autor}` : ''}</div>
            <div className="ap-consejo-d">{a.texto}</div>
            <button type="button" className="ap-btn-texto" onClick={() => leerAviso(a.id)}>Entendido</button>
          </div>
        </section>
      ))}

      {/* 1 · Qué viene */}
      {proximaCita && (
        <Link href="/mi/sesiones" className="ap-prox">
          <span className="ap-prox-ico"><IcoClinica /></span>
          <span className="ap-prox-txt">
            <span className="ap-prox-l">Tu próxima sesión</span>
            <span className="ap-prox-t" style={{ display: 'block' }}>
              {new Date(proximaCita.fecha_hora).toLocaleString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
              })}
            </span>
            <span className="ap-prox-d" style={{ display: 'block' }}>
              {[cuenta.clinica?.nombre, proximaCita.tipo].filter(Boolean).join(' · ')}
            </span>
          </span>
          <IcoChevron className="chev" />
        </Link>
      )}

      {/* 2 · Qué me toca hoy */}
      {ejercicios.length > 0 ? (
        <section className="mi-hoy" style={{ marginTop: 18 }}>
          <div className="mi-hoy-fila">
            <Anillo pct={hechosHoy / ejercicios.length} hechos={hechosHoy} total={ejercicios.length} />
            <div className="mi-hoy-txt">
              <p className="mi-hoy-t">{completo ? 'Plan completado' : tituloHoy}</p>
              <p className="mi-hoy-d">
                {completo
                  ? 'Has hecho todo lo de hoy. Eso es lo que hace que esto funcione.'
                  : hechosHoy === 0
                    ? `${ejercicios.length} ${ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} por delante.`
                    : `Te ${ejercicios.length - hechosHoy === 1 ? 'queda 1 ejercicio' : `quedan ${ejercicios.length - hechosHoy} ejercicios`}.`}
              </p>
              {racha > 1 && (
                <span className="mi-racha"><IcoLlama /> {racha} días seguidos</span>
              )}
            </div>
          </div>
          {!completo && (
            <button className="mi-cta" onClick={() => setSesionAbierta(true)}>
              <span className="mi-cta-ico" aria-hidden="true"><IcoPlay size={13} /></span>
              {hechosHoy === 0 ? 'Empezar mi sesión' : 'Continuar donde lo dejé'}
            </button>
          )}
        </section>
      ) : (
        <section className="mi-hoy mi-hoy-vacio" style={{ marginTop: 18 }}>
          <p className="mi-hoy-t">{cuenta.tipo === 'clinica' ? 'Todavía no tienes plan' : 'Elige tu primera rutina'}</p>
          <p className="mi-hoy-d">
            {cuenta.tipo === 'clinica'
              ? 'Tu fisioterapeuta te lo publicará después de tu próxima sesión. Mientras, puedes empezar con una rutina de la biblioteca.'
              : 'Programas de espalda, cuello, rodilla y más, explicados paso a paso.'}
          </p>
          <Link href="/mi/rutinas?ver=biblioteca" className="ap-btn" style={{ marginTop: 16 }}>
            <IcoRutinas size={18} /> Explorar la biblioteca
          </Link>
        </section>
      )}

      {/* 3 · Tus rutinas */}
      {rutinas.length > 0 && (
        <Revelar className="ap-seccion" orden={0}>
          <div className="ap-seccion-cab">
            <h2 className="ap-seccion-t">Tus rutinas</h2>
            <Link href="/mi/rutinas" className="ap-seccion-link">Ver todas</Link>
          </div>
          <div className="ap-carrusel">
            {rutinas.map((r) => <RutinaMini key={r.href} r={r} />)}
          </div>
        </Revelar>
      )}

      {/* 4 · Accesos rápidos */}
      <Revelar className="ap-seccion" orden={1}>
        <h2 className="ap-seccion-t" style={{ marginBottom: 12 }}>Accesos rápidos</h2>
        <div className="ap-accesos">
          <Link href="/mi/sesiones" className="ap-acceso">
            <span className="ap-acceso-ico"><IcoCalendario size={19} /></span>
            <span className="ap-acceso-t">{cuenta.tipo === 'clinica' ? 'Mis sesiones' : 'Calendario'}</span>
            <span className="ap-acceso-d">{cuenta.tipo === 'clinica' ? 'Citas y calendario' : 'Tus días de ejercicio'}</span>
          </Link>
          <Link href="/mi/chat" className="ap-acceso">
            <span className="ap-acceso-ico"><IcoChat size={19} /></span>
            <span className="ap-acceso-t">Chat con IA</span>
            <span className="ap-acceso-d">Resuelve tus dudas</span>
          </Link>
          <Link href="/mi/progreso" className="ap-acceso">
            <span className="ap-acceso-ico"><IcoGrafica size={19} /></span>
            <span className="ap-acceso-t">Mi progreso</span>
            <span className="ap-acceso-d">Dolor y constancia</span>
          </Link>
          <Link href="/mi/perfil" className="ap-acceso">
            <span className="ap-acceso-ico"><IcoPerfil size={19} /></span>
            <span className="ap-acceso-t">Mi perfil</span>
            <span className="ap-acceso-d">Tus datos y tu plan</span>
          </Link>
        </div>
      </Revelar>

      {/* 5 · Cómo me encuentro (solo con plan del fisio: el check-in cuelga del informe) */}
      {plan && (
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
              ? <><span className="mi-ok"><IcoCheck size={11} /></span> Registrado hoy</>
              : guardandoCheckin ? 'Guardando…' : 'Registrar mi dolor de hoy'}
          </button>

          {dolorHoy >= 8 && !checkinOk && (
            <p className="mi-alerta">
              Si el dolor es fuerte o distinto al habitual, para los ejercicios y contacta con tu clínica.
            </p>
          )}
          {checkins.length > 1 && (
            <Link className="mi-ver-progreso" href="/mi/progreso">Ver mi evolución →</Link>
          )}
        </Revelar>
      )}

      {/* 6 · Asistente */}
      <Revelar className="ap-ia" orden={3}>
        <div className="ap-ia-txt">
          <p className="ap-ia-t">¿Dolor o molestia?</p>
          <p className="ap-ia-d">
            {premium
              ? 'El asistente te ayuda a entender qué puede estar pasando y qué hacer, siempre dentro de tu plan.'
              : 'Con Premium, un asistente te explica qué puede estar pasando y qué hacer. Es parte de tu recuperación personalizada.'}
          </p>
          <Link href={premium ? '/mi/chat' : '/mi/plan'} className="ap-btn pequeno">
            {premium ? 'Probar ahora' : 'Ver Premium'}
          </Link>
        </div>
        <span className="ap-ia-ico"><IcoChispa size={24} /></span>
      </Revelar>

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
