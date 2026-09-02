'use client'

// components/guia/GuiaPaciente.tsx
// Guía de recuperación interactiva del paciente (/r/[token]).
// No es un informe: es el acompañamiento entre sesiones — plan de ejercicios
// con checklist diario, check-in de dolor, progreso semanal, FAQ y copiloto IA.
// Escrituras SOLO vía RPCs seguras por token (sin login).

import { useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/app/lib/supabase'
import { MapaMuscular } from '@/components/guia/MapaMuscular'
import { normalizarMusculos, nombresDeGrupos } from '@/app/lib/musculos'
// Piezas compartidas con la app del paciente (/mi). Un solo sitio donde se
// decide cómo se cuenta una racha o de qué color va un dolor: la guía por
// enlace y la app con sesión no pueden dar números distintos.
import { iso, checksPorFecha as agruparChecks, calcularRacha, semanaDe, fechaLarga } from '@/app/lib/paciente/fechas'
import { evaColor, youtubeId, iniciales } from '@/app/lib/paciente/formato'
import { Anillo } from '@/components/paciente/Anillo'
import { SparkDolor } from '@/components/paciente/SparkDolor'
import { SemanaChecks } from '@/components/paciente/SemanaChecks'
import type { EjercicioGuia } from '@/app/lib/paciente/tipos'

// La sesión guiada se carga aparte, bajo demanda. Es la única pantalla que usa
// `motion`, y un import normal la meteria en el bundle de la guía aunque el
// paciente no la abra nunca: esta página se abre desde un enlace de WhatsApp
// con 4G y su LCP es tan argumento comercial como la propia animación.
// ssr:false porque necesita wake lock, teclado y medidas del navegador.
const SesionGuiada = dynamic(
  () => import('@/components/paciente/SesionGuiada').then(m => m.SesionGuiada),
  { ssr: false },
)

/* ───────────────────────── piezas visuales ───────────────────────── */

function Seccion({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rep-card"><div className="rep-label">{label}</div>{children}</div>
}

function IconCheck() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
}
const IconMov = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aeb4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h3l2-6 4 12 2-6h4" />
  </svg>
)

/* ───────────────────────── componente principal ───────────────────────── */

export function GuiaPaciente({
  data,
  token,
  sesionIniciada = false,
}: {
  data: any
  token: string
  /** Lo resuelve el servidor en /r/[token]: cambia el texto del puente a la app
   *  para no ofrecer "crea tu cuenta" a quien ya la tiene. */
  sesionIniciada?: boolean
}) {
  const i = data.informe, pac = data.paciente, fis = data.fisio, cli = data.clinica
  const ejs: any[] = data.ejercicios ?? []
  const met = i.metricas ?? {}
  const faq = i.faq ?? {}
  const hoy: string = data.hoy ?? iso(new Date())

  /* estado interactivo (optimista) */
  const [checks, setChecks] = useState<Set<string>>(
    () => new Set((data.checks ?? []).map((c: any) => `${c.ejercicio_id}|${c.fecha}`)),
  )
  const [checkins, setCheckins] = useState<{ fecha: string; dolor: number }[]>(data.checkins ?? [])
  const [dolorHoy, setDolorHoy] = useState<number>(() => data.checkins?.find((c: any) => c.fecha === hoy)?.dolor ?? 5)
  const [checkinOk, setCheckinOk] = useState<boolean>(() => Boolean(data.checkins?.find((c: any) => c.fecha === hoy)))
  const [guardandoCheckin, setGuardandoCheckin] = useState(false)
  const [videoAbierto, setVideoAbierto] = useState<Record<string, boolean>>({})
  const [sesionAbierta, setSesionAbierta] = useState(false)

  /* chat */
  const [chatAbierto, setChatAbierto] = useState(false)
  const [msgs, setMsgs] = useState<{ rol: string; texto: string }[]>(data.chat ?? [])
  const [pregunta, setPregunta] = useState('')
  const [pensando, setPensando] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  /* derivados */
  const hechosHoy = useMemo(() => ejs.filter(e => checks.has(`${e.id}|${hoy}`)).length, [checks, ejs, hoy])
  const pctHoy = ejs.length ? hechosHoy / ejs.length : 0
  const completoHoy = ejs.length > 0 && hechosHoy === ejs.length

  const porFecha = useMemo(() => agruparChecks(checks), [checks])
  const racha = useMemo(() => calcularRacha(porFecha, hoy), [porFecha, hoy])
  const semana = useMemo(() => semanaDe(porFecha, hoy), [porFecha, hoy])

  const serieDolor = useMemo(() => {
    const base: { fecha: string; dolor: number }[] = []
    if (met.dolor_fin != null && i.fecha) base.push({ fecha: i.fecha, dolor: met.dolor_fin })
    const rep = [...checkins].sort((a, b) => a.fecha.localeCompare(b.fecha)).filter(c => c.dolor != null)
    const todo = [...base, ...rep.filter(c => !base.some(b => b.fecha === c.fecha))]
    return todo.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [checkins, met.dolor_fin, i.fecha])

  const faqEj = useMemo(() => {
    const m = new Map<string, any>()
    ;(faq.ejercicios ?? []).forEach((f: any) => m.set((f.nombre ?? '').toLowerCase().trim(), f))
    return m
  }, [faq])

  const fecha = fechaLarga(i.fecha)
  const di = met.dolor_ini ?? 0, df = met.dolor_fin ?? 0, mejora = di - df
  const otras: [string, number][] = ([['Movilidad', met.movilidad], ['Fuerza', met.fuerza], ['Rigidez', met.rigidez], ['Fatiga', met.fatiga], ['Sueño', met.sueno], ['Adherencia', met.adherencia]] as any).filter(([, v]: any) => v != null)

  /** Zonas trabajadas por todo el plan (union de grupos de cada ejercicio) → mapa de la cabecera. */
  const gruposTotales = useMemo(() => {
    const s = new Set<string>()
    ejs.forEach(e => normalizarMusculos(e.musculos).forEach(g => s.add(g)))
    return [...s]
  }, [ejs])

  /* ── acciones ── */

  const marcar = async (e: any) => {
    const k = `${e.id}|${hoy}`
    const hecho = !checks.has(k)
    setChecks(prev => { const s = new Set(prev); hecho ? s.add(k) : s.delete(k); return s }) // optimista
    try {
      const { data: r, error } = await supabase.rpc('guia_marcar_ejercicio', { p_token: token, p_ejercicio_id: e.id, p_hecho: hecho })
      if (error || !r?.ok) throw new Error()
    } catch {
      setChecks(prev => { const s = new Set(prev); hecho ? s.delete(k) : s.add(k); return s }) // revert
    }
  }

  /** Igual que marcar() pero solo en un sentido y diciendo si salió bien: la
   *  sesión guiada necesita saberlo para no avanzar sobre un fallo de red. */
  const marcarHecho = async (e: EjercicioGuia): Promise<boolean> => {
    const k = `${e.id}|${hoy}`
    if (checks.has(k)) return true
    setChecks(prev => new Set(prev).add(k))
    try {
      const { data: r, error } = await supabase.rpc('guia_marcar_ejercicio', { p_token: token, p_ejercicio_id: e.id, p_hecho: true })
      if (error || !r?.ok) throw new Error()
      return true
    } catch {
      setChecks(prev => { const s = new Set(prev); s.delete(k); return s })
      return false
    }
  }

  const guardarCheckin = async () => {
    setGuardandoCheckin(true)
    try {
      const { data: r, error } = await supabase.rpc('guia_checkin', { p_token: token, p_dolor: dolorHoy, p_nota: null })
      if (error || !r?.ok) throw new Error()
      setCheckins(prev => [...prev.filter(c => c.fecha !== hoy), { fecha: hoy, dolor: dolorHoy }])
      setCheckinOk(true)
    } catch {}
    setGuardandoCheckin(false)
  }

  const enviarPregunta = async (texto?: string) => {
    const q = (texto ?? pregunta).trim()
    if (!q || pensando) return
    setPregunta('')
    setMsgs(p => [...p, { rol: 'paciente', texto: q }])
    setPensando(true)
    requestAnimationFrame(() => msgsRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }))
    try {
      const r = await fetch('/api/guia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, pregunta: q }) })
      const d = await r.json()
      setMsgs(p => [...p, { rol: 'ia', texto: d.respuesta ?? 'No he podido responderte ahora mismo. Inténtalo de nuevo en un momento.' }])
    } catch {
      setMsgs(p => [...p, { rol: 'ia', texto: 'No he podido responderte ahora mismo. Inténtalo de nuevo en un momento.' }])
    }
    setPensando(false)
    requestAnimationFrame(() => msgsRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }))
  }

  const compartir = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Tu informe y plan de ejercicios', url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Enlace copiado')
      }
    } catch { /* usuario canceló */ }
  }

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <div className="rep-bg">
      <div className="rep-page">

        {/* Marca */}
        <div className="rep-top">
          <span className="rep-wordmark">RUDAMI</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{cli?.nombre ?? ''}</span>
        </div>

        {/* Cabecera: título + acciones */}
        <div className="rep-header">
          <div style={{ minWidth: 0 }}>
            <h1 className="rep-h1">Tu informe y plan de ejercicios</h1>
            <p className="rep-sub">Resumen fácil de entender para tu recuperación</p>
          </div>
          <div className="rep-actions guia-no-print">
            <button className="rep-btn" onClick={() => window.print()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
              Imprimir / PDF
            </button>
            <button className="rep-btn dark" onClick={compartir}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
              Compartir
            </button>
          </div>
        </div>

        {/* Tarjeta del paciente */}
        <div className="rep-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="rep-avatar">{iniciales(pac?.nombre, pac?.apellidos)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{pac?.nombre} {pac?.apellidos}</div>
            {fis?.nombre && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Tu fisioterapeuta: {fis.nombre} {fis.apellidos}</div>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Fecha del informe</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}>{fecha}</div>
          </div>
        </div>

        {/* Estado + plan de hoy (fusionado) */}
        {(i.resumen || ejs.length > 0) && (
          <div className="rep-card rep-status">
            {ejs.length > 0 ? (
              <Anillo pct={pctHoy} hechos={hechosHoy} total={ejs.length} />
            ) : (
              <span className="rep-status-ico">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>
              </span>
            )}
            <div className="rep-status-body">
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>¡Vas por buen camino!</div>
              {i.resumen && <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{i.resumen}</p>}
              {ejs.length > 0 && (
                <p className="guia-no-print" style={{ fontSize: 14, fontWeight: 600, color: completoHoy ? 'var(--gold-d)' : 'var(--ink)', marginTop: i.resumen ? 8 : 0 }}>
                  {completoHoy ? '✓ Plan de hoy completado' : hechosHoy === 0 ? `Tu plan de hoy: ${ejs.length} ${ejs.length === 1 ? 'ejercicio' : 'ejercicios'}` : `Te ${ejs.length - hechosHoy === 1 ? 'queda 1 ejercicio' : `quedan ${ejs.length - hechosHoy} ejercicios`} hoy`}
                </p>
              )}
              {racha > 1 && (
                <span className="guia-streak guia-no-print">
                  <svg width="11" height="13" viewBox="0 0 12 14" fill="var(--gold-d)"><path d="M6 0C6 3 2 4.5 2 8.5a4 4 0 0 0 8 0C10 6 8.5 4.8 8 3.5 7.2 5 6.8 5.5 6 6 5.6 4 6 2 6 0Z"/></svg>
                  {racha} días seguidos
                </span>
              )}
            </div>
            {gruposTotales.length > 0 && (
              <div className="rep-status-map" aria-hidden="true"><MapaMuscular activos={gruposTotales} modo="mini" alto={92} /></div>
            )}
          </div>
        )}

        {/* La acción principal de la pantalla. Va aquí arriba, justo bajo el
            anillo, porque es lo que el paciente viene a hacer: no a leer un
            informe, a hacer sus ejercicios de hoy. */}
        {ejs.length > 0 && !completoHoy && (
          <button className="guia-empezar guia-no-print" onClick={() => setSesionAbierta(true)}>
            <span className="guia-empezar-ico" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
            </span>
            {hechosHoy === 0 ? 'Empezar mi sesión de hoy' : `Continuar — ${ejs.length - hechosHoy} por hacer`}
          </button>
        )}

        {/* Puente a la app: convierte al paciente de "enlace" en "cuenta".
            Es la única conversión que pedimos, y va después de que ya haya
            visto su plan — no antes, para no poner un muro en la puerta. */}
        <a className="guia-cuenta guia-no-print" href={sesionIniciada ? '/mi' : `/mi/entrar?t=${encodeURIComponent(token)}`}>
          <span className="guia-cuenta-txt">
            <strong>{sesionIniciada ? 'Ir a mi recuperación' : 'Guarda tu progreso'}</strong>
            <span>
              {sesionIniciada
                ? 'Tu seguimiento completo, con todos tus episodios.'
                : 'Crea tu acceso y no perderás tus marcas ni tu racha aunque cambies de móvil.'}
            </span>
          </span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </a>

        {/* Check-in diario */}
        <div className="rep-card guia-no-print">
          <div className="rep-label">¿Cómo te encuentras hoy?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input className="eva-range" type="range" min={0} max={10} value={dolorHoy} aria-label="Dolor de hoy de 0 a 10"
              onChange={e => { setDolorHoy(parseInt(e.target.value)); setCheckinOk(false) }} style={{ flex: 1 }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: evaColor(dolorHoy), minWidth: 58, textAlign: 'right' }}>{dolorHoy}<span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/10</span></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)', marginTop: 4 }}><span>Sin dolor</span><span>Dolor máximo</span></div>
          <button className="guia-check-btn" style={{ marginTop: 14 }} onClick={guardarCheckin} disabled={guardandoCheckin || checkinOk}>
            {checkinOk ? <><span className="guia-check-ico"><IconCheck /></span> Registrado hoy</> : guardandoCheckin ? 'Guardando…' : 'Registrar mi dolor de hoy'}
          </button>
          {dolorHoy >= 8 && !checkinOk && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#dc2626', fontWeight: 600, lineHeight: 1.5 }}>
              Si el dolor es fuerte o distinto al habitual, para los ejercicios y contacta con tu clínica.
            </p>
          )}
        </div>

        {/* ¿Qué tienes? — explicación + consejos */}
        {(i.explicacion || (Array.isArray(i.recomendaciones) && i.recomendaciones.length > 0)) && (
          <Seccion label="¿Qué tienes?">
            <div className="rep-split">
              <div>
                {i.explicacion
                  ? <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>{i.explicacion}</p>
                  : <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>Aquí tienes tus recomendaciones para el día a día.</p>}
                <button className="rep-btn guia-no-print" style={{ marginTop: 14 }}
                  onClick={() => { setChatAbierto(true); setPregunta('¿Qué consejos me das para el día a día?') }}>
                  Consejos para tu día a día
                </button>
              </div>
              {Array.isArray(i.recomendaciones) && i.recomendaciones.length > 0 && (
                <div className="rep-tips">
                  {i.recomendaciones.map((r: any, idx: number) => (
                    <div key={idx} className="rep-tip">
                      <span className="ico" aria-hidden="true">{r.icono || '•'}</span>
                      <span>{r.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Seccion>
        )}

        {/* Tus ejercicios */}
        {ejs.length > 0 && (
          <Seccion label="Tus ejercicios">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -6, marginBottom: 6 }}>Hazlos a diario para mejorar tu recuperación.</p>
            <div className="rep-exlist">
              {ejs.map((e: any, idx: number) => {
                const ytId = youtubeId(e.video_url)
                const media = e.gif_url || e.imagen_url
                const thumb = media || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null)
                const hecho = checks.has(`${e.id}|${hoy}`)
                const fq = faqEj.get((e.nombre ?? '').toLowerCase().trim())
                const grupos = normalizarMusculos(e.musculos)
                const zona = nombresDeGrupos(grupos)[0]
                const dosis1 = [e.series && `${e.series} series`, e.repeticiones && `${e.repeticiones} repeticiones`].filter(Boolean).join(' • ')
                const dosis2 = e.duracion || e.descanso || e.frecuencia
                return (
                  <details key={e.id ?? idx} className="rep-exrow">
                    <summary>
                      <span className="rep-exthumb">
                        {thumb ? <img src={thumb} alt={e.nombre} loading="lazy" /> : <IconMov />}
                        {hecho && <span className="done" aria-label="Hecho hoy"><IconCheck /></span>}
                      </span>
                      <span className="rep-exmeta">
                        <span className="rep-exname">{e.nombre}</span>
                        {dosis1 && <span className="rep-exdose">{dosis1}</span>}
                        {dosis2 && <span className="rep-exdose">{dosis2}</span>}
                      </span>
                      <span className="rep-exzona">
                        {zona && (
                          <span className="rep-exzona-l">
                            <div className="k">Zona trabajada:</div>
                            <span className="rep-pill">{zona}</span>
                          </span>
                        )}
                        <svg className="rep-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </span>
                    </summary>

                    <div className="rep-exbody">
                      <div className="guia-ex-media" style={{ borderRadius: 12, border: '1px solid var(--hair-s)', marginBottom: 14 }}>
                        {ytId && videoAbierto[e.id ?? idx] ? (
                          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} title={e.nombre} allow="autoplay; encrypted-media" allowFullScreen />
                        ) : media ? (
                          <img src={media} alt={e.nombre} loading="lazy" />
                        ) : ytId ? (
                          <img src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`} alt={e.nombre} loading="lazy" />
                        ) : (
                          <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><IconMov /></div>
                        )}
                        {ytId && !videoAbierto[e.id ?? idx] && (
                          <button className="guia-play" onClick={() => setVideoAbierto(p => ({ ...p, [e.id ?? idx]: true }))} aria-label={`Ver vídeo de ${e.nombre}`}>
                            <span><svg width="19" height="19" viewBox="0 0 24 24" fill="var(--ink)"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg></span>
                          </button>
                        )}
                      </div>

                      {(e.series || e.repeticiones || e.frecuencia || e.descanso) && (
                        <div className="guia-dosis">
                          {e.series && <div><div className="l">Series</div><div className="v">{e.series}</div></div>}
                          {e.repeticiones && <div><div className="l">Reps</div><div className="v">{e.repeticiones}</div></div>}
                          {e.frecuencia && <div><div className="l">Frecuencia</div><div className="v">{e.frecuencia}</div></div>}
                          {e.descanso && <div><div className="l">Descanso</div><div className="v">{e.descanso}</div></div>}
                        </div>
                      )}

                      {e.nota && <p style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--gold-bg)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5, marginBottom: 12 }}><strong style={{ color: 'var(--gold-d)' }}>{fis?.nombre ?? 'Tu fisio'} dice:</strong> {e.nota}</p>}

                      {(fq?.como_hacerlo || e.instrucciones) && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', margin: '2px 0 8px', textTransform: 'uppercase', letterSpacing: '.08em' }}>¿Cómo se hace?</div>}
                      {fq?.como_hacerlo && <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8, fontWeight: 500 }}>{fq.como_hacerlo}</p>}
                      {e.instrucciones && <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{e.instrucciones}</p>}
                      {e.errores && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10, display: 'flex', gap: 8 }}><span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>Evita</span><span>{e.errores}</span></p>}
                      {e.consejos && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8 }}><span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>Consejo</span><span>{e.consejos}</span></p>}
                      {fq?.sensacion_normal && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10, background: 'var(--paper-2)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>{fq.sensacion_normal}</p>}
                      {grupos.length > 0 && (
                        <div style={{ marginTop: 14, borderTop: '1px solid var(--hair-s)', paddingTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Deberías notarlo aquí</div>
                          <MapaMuscular activos={grupos} modo="completo" alto={150} leyenda />
                        </div>
                      )}
                      <button className="guia-no-print" onClick={() => { setChatAbierto(true); setPregunta(`Tengo una duda con el ejercicio "${e.nombre}": `) }}
                        style={{ marginTop: 10, border: 0, background: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>
                        Preguntar al asistente →
                      </button>

                      <button className={`guia-check-btn${hecho ? ' done' : ''} guia-no-print`} style={{ marginTop: 14 }} onClick={() => marcar(e)} aria-pressed={hecho}>
                        <span className="guia-check-ico">{hecho && <IconCheck />}</span>
                        {hecho ? 'Hecho hoy' : 'Marcar como hecho'}
                      </button>
                    </div>
                  </details>
                )
              })}
            </div>
          </Seccion>
        )}

        {/* Tu evolución */}
        {(ejs.length > 0 || serieDolor.length > 1) && (
          <Seccion label="Tu evolución">
            {ejs.length > 0 && (
              <>
                <SemanaChecks semana={semana} totalDia={ejs.length} />
                <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}>Cada círculo muestra los ejercicios completados ese día.</p>
              </>
            )}
            {serieDolor.length > 1 && (
              <div style={{ marginTop: ejs.length > 0 ? 20 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>Tu dolor, día a día</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>último: <strong style={{ color: evaColor(serieDolor[serieDolor.length - 1].dolor) }}>{serieDolor[serieDolor.length - 1].dolor}/10</strong></span>
                </div>
                <SparkDolor puntos={serieDolor} />
              </div>
            )}
          </Seccion>
        )}

        {/* Dolor en la sesión */}
        <Seccion label="Tu dolor en la sesión">
          <div style={{ display: 'flex', gap: 22 }}>
            {[['Al empezar', di], ['Al terminar', df]].map(([l, v]: any) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{l}</div>
                <div className="rep-bar"><span style={{ width: `${v * 10}%`, background: evaColor(v) }} /></div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>{v}<span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/10</span></div>
              </div>
            ))}
          </div>
          {mejora > 0 && <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#10b981' }}>↓ Has mejorado {mejora} {mejora === 1 ? 'punto' : 'puntos'} respecto al inicio.</p>}
        </Seccion>

        {/* Indicadores del fisio */}
        {otras.length > 0 && (
          <Seccion label="Tu seguimiento">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {otras.map(([l, v]) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}><span style={{ color: 'var(--ink-2)' }}>{l}</span><strong style={{ color: 'var(--ink)' }}>{v}/10</strong></div>
                  <div className="rep-bar"><span style={{ width: `${v * 10}%`, background: 'var(--ink)' }} /></div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Qué esperar */}
        {Array.isArray(i.que_esperar) && i.que_esperar.length > 0 && (
          <Seccion label="¿Qué podemos esperar?">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {i.que_esperar.map((f: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--ink)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{f.fase ?? idx + 1}</span>
                    {idx < i.que_esperar.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--hair)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: idx < i.que_esperar.length - 1 ? 16 : 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{f.titulo}</p>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{f.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* FAQ */}
        {Array.isArray(faq.generales) && faq.generales.length > 0 && (
          <Seccion label="Dudas frecuentes">
            {faq.generales.map((f: any, idx: number) => (
              <details key={idx} className="guia-faq">
                <summary>{f.pregunta}</summary>
                <p>{f.respuesta}</p>
              </details>
            ))}
          </Seccion>
        )}

        {/* Motivación: ¡Tú puedes! */}
        <div className="rep-banner">
          <span className="rep-banner-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>
          </span>
          <div>
            <div className="rep-banner-t">¡Tú puedes!</div>
            <p className="rep-banner-p">{i.motivacion || 'La constancia es la clave. Si tienes dudas o algún ejercicio te causa dolor, contacta con tu fisioterapeuta.'}</p>
          </div>
        </div>

        <button className="btn-line rep-print guia-no-print" onClick={() => window.print()} style={{ width: '100%', marginTop: 6 }}>Descargar en PDF</button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 22 }}>Generado con RuDaMi · {cli?.nombre ?? ''}</p>
      </div>

      {/* Copiloto del paciente */}
      <button className="guia-fab" onClick={() => setChatAbierto(true)} aria-label="Abrir asistente de dudas">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
        ¿Dudas?
      </button>

      {/* Sesión guiada: se descarga al abrirla (ver el dynamic() de arriba),
          así su coste —motion incluido— no lo paga quien solo viene a leer. */}
      {sesionAbierta && (
        <SesionGuiada
          ejercicios={ejs as EjercicioGuia[]}
          hechosHoy={new Set(ejs.filter(e => checks.has(`${e.id}|${hoy}`)).map(e => e.id))}
          onMarcar={marcarHecho}
          onCerrar={() => setSesionAbierta(false)}
          fisio={fis?.nombre}
          faq={faqEj}
        />
      )}

      {chatAbierto && (
        <>
          <div className="guia-sheet-bg" onClick={() => setChatAbierto(false)} />
          <div className="guia-sheet" role="dialog" aria-label="Asistente de dudas">
            <div className="guia-sheet-head">
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>Asistente de tu plan</div>
                <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>Resuelve dudas sobre tus ejercicios. No sustituye a tu fisioterapeuta.</div>
              </div>
              <button onClick={() => setChatAbierto(false)} aria-label="Cerrar" style={{ border: 0, background: 'var(--paper-2)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', fontSize: 15 }}>×</button>
            </div>
            <div className="guia-msgs" ref={msgsRef}>
              {msgs.length === 0 && (
                <div className="guia-msg ia">Hola{pac?.nombre ? `, ${pac.nombre}` : ''}. Estoy aquí para ayudarte con tu plan: cómo hacer los ejercicios, qué es normal sentir, o qué hacer si un día no puedes. ¿En qué te ayudo?</div>
              )}
              {msgs.map((m, idx) => <div key={idx} className={`guia-msg ${m.rol === 'paciente' ? 'paciente' : 'ia'}`}>{m.texto}</div>)}
              {pensando && <div className="guia-msg ia" style={{ color: 'var(--muted)' }}>Escribiendo…</div>}
            </div>
            {msgs.length === 0 && (
              <div className="guia-sugerencias">
                {['No entiendo cómo hacer un ejercicio', '¿Es normal notar molestias?', '¿Puedo hacer más repeticiones?'].map(s => (
                  <button key={s} onClick={() => enviarPregunta(s)}>{s}</button>
                ))}
              </div>
            )}
            <div className="guia-sheet-input">
              <input value={pregunta} onChange={e => setPregunta(e.target.value)} placeholder="Escribe tu duda…" maxLength={500}
                onKeyDown={e => { if (e.key === 'Enter') enviarPregunta() }} />
              <button onClick={() => enviarPregunta()} disabled={pensando || !pregunta.trim()}>Enviar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
