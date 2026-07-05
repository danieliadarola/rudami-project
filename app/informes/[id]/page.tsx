'use client'

import { useState, use, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'

/** Resumen para el fisio de lo que el paciente hace en casa con su guía:
 *  adherencia (checks), dolor reportado y últimas dudas del chat. */
function ActividadPaciente({ actividad, totalEjercicios, metricas }: { actividad: { checks: any[]; checkins: any[]; chat: any[] }; totalEjercicios: number; metricas: any }) {
  const hoy = new Date()
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy.getTime() - (6 - i) * 86400000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const checksSemana = actividad.checks.filter(c => dias7.includes(c.fecha)).length
  const posibles = Math.max(totalEjercicios, 1) * 7
  const adh = Math.min(100, Math.round((checksSemana / posibles) * 100))
  const diasActivos = new Set(actividad.checks.map(c => c.fecha)).size
  const ultimoDolor = actividad.checkins.length ? actividad.checkins[actividad.checkins.length - 1] : null
  const dolorSesion = metricas?.dolor_fin ?? null
  const delta = ultimoDolor && dolorSesion != null ? ultimoDolor.dolor - dolorSesion : null

  return (
    <div className="form-card" style={{ borderColor: 'var(--gold)', background: 'var(--gold-bg)' }}>
      <div className="form-card-title">Actividad del paciente en su guía</div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Adherencia 7 días</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: adh >= 60 ? '#10b981' : adh >= 30 ? '#d97706' : '#dc2626' }}>{adh}%</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Días activos</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{diasActivos}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Dolor reportado</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
            {ultimoDolor ? `${ultimoDolor.dolor}/10` : '—'}
            {delta != null && delta !== 0 && <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 6, color: delta < 0 ? '#10b981' : '#dc2626' }}>{delta < 0 ? '↓' : '↑'} {Math.abs(delta)} vs sesión</span>}
          </div>
        </div>
      </div>
      {actividad.chat.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--hair)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Últimas dudas del paciente</div>
          {actividad.chat.map((m, i) => (
            <p key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 3 }}>· {m.texto}</p>
          ))}
        </div>
      )}
      {actividad.checks.length === 0 && actividad.checkins.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>El paciente aún no ha registrado actividad. Puedes reenviarle el enlace por WhatsApp.</p>
      )}
    </div>
  )
}

const METRICAS: { k: string; l: string }[] = [
  { k: 'dolor_ini', l: 'Dolor inicial' }, { k: 'dolor_fin', l: 'Dolor final' },
  { k: 'movilidad', l: 'Movilidad' }, { k: 'fuerza', l: 'Fuerza' },
  { k: 'rigidez', l: 'Rigidez' }, { k: 'fatiga', l: 'Fatiga' },
  { k: 'sueno', l: 'Sueño' }, { k: 'adherencia', l: 'Adherencia' },
]

export default function EditorInforme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [inf, setInf] = useState<any>(null)
  const [pac, setPac] = useState<any>(null)
  const [ses, setSes] = useState<any>(null)
  const [lib, setLib] = useState<any[]>([])
  const [ejs, setEjs] = useState<any[]>([])
  const [gen, setGen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [link, setLink] = useState('')
  const [actividad, setActividad] = useState<{ checks: any[]; checkins: any[]; chat: any[] } | null>(null)
  const [tab, setTab] = useState<'sesion' | 'guia' | 'ejercicios' | 'notas'>('sesion')

  const set = (k: string, v: any) => setInf((p: any) => ({ ...p, [k]: v }))
  const setMet = (k: string, v: any) => setInf((p: any) => ({ ...p, metricas: { ...(p.metricas || {}), [k]: v } }))

  const cargar = useCallback(async () => {
    const { data: i } = await supabase.from('informes').select('*').eq('id', id).single()
    if (!i) { router.push('/informes'); return }
    if (!i.que_esperar) i.que_esperar = [
      { fase: 1, titulo: 'Reducción del dolor', descripcion: '' }, { fase: 2, titulo: 'Mejora de movilidad', descripcion: '' },
      { fase: 3, titulo: 'Recuperación funcional', descripcion: '' }, { fase: 4, titulo: 'Prevención y fortalecimiento', descripcion: '' },
    ]
    if (!i.recomendaciones) i.recomendaciones = []
    setInf(i)
    const [{ data: p }, { data: s }, { data: l }, { data: e }] = await Promise.all([
      supabase.from('pacientes').select('nombre, apellidos, motivo_consulta').eq('id', i.paciente_id).single(),
      i.sesion_id ? supabase.from('sesiones').select('dolor_eva, hipotesis_principal, anamnesis, exploracion_fisica').eq('id', i.sesion_id).single() : Promise.resolve({ data: null }),
      supabase.from('ejercicios').select('*').eq('activo', true).order('zona'),
      supabase.from('informe_ejercicios').select('*').eq('informe_id', id).order('orden'),
    ])
    setPac(p); setSes(s); setLib(l ?? []); setEjs(e ?? [])

    // Actividad del paciente en su guía (solo si está publicada)
    if (i.estado === 'publicado') {
      const [{ data: ck }, { data: ci }, { data: ch }] = await Promise.all([
        supabase.from('guia_checks').select('informe_ejercicio_id, fecha').eq('informe_id', id),
        supabase.from('guia_checkins').select('fecha, dolor').eq('informe_id', id).order('fecha'),
        supabase.from('guia_chat').select('rol, texto, created_at').eq('informe_id', id).eq('rol', 'paciente').order('created_at', { ascending: false }).limit(5),
      ])
      setActividad({ checks: ck ?? [], checkins: ci ?? [], chat: ch ?? [] })
    }
  }, [id, router])
  useEffect(() => { cargar() }, [cargar])

  const generar = async () => {
    setGen(true)
    try {
      const r = await fetch('/api/generar-informe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'informe_paciente', motivo_consulta: pac?.motivo_consulta, hipotesis_principal: ses?.hipotesis_principal, anamnesis: ses?.anamnesis, exploracion_fisica: ses?.exploracion_fisica, dolor_eva: inf?.metricas?.dolor_fin }) })
      const d = await r.json()
      const o = d.informe_paciente
      if (o) setInf((p: any) => ({ ...p, resumen: o.resumen ?? p.resumen, explicacion: o.explicacion ?? p.explicacion, que_esperar: o.que_esperar ?? p.que_esperar, recomendaciones: o.recomendaciones ?? p.recomendaciones, motivacion: o.motivacion ?? p.motivacion }))
    } catch {}
    setGen(false)
  }

  const guardar = async (publicar = false) => {
    setGuardando(true)
    await supabase.from('informes').update({
      tipo_sesion: inf.tipo_sesion, duracion_min: inf.duracion_min, numero_sesion: inf.numero_sesion, total_sesiones: inf.total_sesiones,
      resumen: inf.resumen, explicacion: inf.explicacion, que_esperar: inf.que_esperar, recomendaciones: inf.recomendaciones,
      motivacion: inf.motivacion, metricas: inf.metricas, notas_fisio: inf.notas_fisio, updated_at: new Date().toISOString(),
      ...(publicar ? { estado: 'publicado', publicado_at: new Date().toISOString() } : {}),
    }).eq('id', id)

    // Guardado NO destructivo de ejercicios: se actualiza por id en vez de
    // borrar y reinsertar, para conservar los checks del paciente en su guía.
    const { data: existentes } = await supabase.from('informe_ejercicios').select('id').eq('informe_id', id)
    const idsActuales = new Set(ejs.filter(e => e.id).map(e => e.id))
    const aBorrar = (existentes ?? []).map(x => x.id).filter(x => !idsActuales.has(x))
    if (aBorrar.length) await supabase.from('informe_ejercicios').delete().in('id', aBorrar)
    for (let i = 0; i < ejs.length; i++) {
      const e = ejs[i]
      const fila = {
        informe_id: id, nombre: e.nombre, instrucciones: e.instrucciones, musculos: e.musculos, nivel: e.nivel,
        series: e.series, repeticiones: e.repeticiones, frecuencia: e.frecuencia, descanso: e.descanso, duracion: e.duracion,
        errores: e.errores, consejos: e.consejos, imagen_url: e.imagen_url, gif_url: e.gif_url, video_url: e.video_url, nota: e.nota, orden: i,
      }
      if (e.id) await supabase.from('informe_ejercicios').update(fila).eq('id', e.id)
      else {
        const { data: nuevo } = await supabase.from('informe_ejercicios').insert(fila).select('id').single()
        if (nuevo) setEjs(p => p.map((x, j) => j === i ? { ...x, id: nuevo.id } : x))
      }
    }

    // Al publicar: la IA anticipa las dudas del paciente (FAQ + explicación
    // llana por ejercicio) y se guarda en el informe. Coste único, sin latencia
    // para el paciente. Si falla, la guía se publica igual.
    if (publicar) {
      try {
        const contexto = {
          resumen: inf.resumen, explicacion: inf.explicacion, que_esperar: inf.que_esperar,
          recomendaciones: inf.recomendaciones,
          ejercicios: ejs.map(e => ({ nombre: e.nombre, instrucciones: e.instrucciones, series: e.series, repeticiones: e.repeticiones, frecuencia: e.frecuencia, descanso: e.descanso, errores: e.errores, consejos: e.consejos, nota: e.nota })),
        }
        const r = await fetch('/api/generar-informe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modo: 'faq_paciente', contexto_guia: JSON.stringify(contexto) }) })
        const d = await r.json()
        if (d.faq_paciente) { await supabase.from('informes').update({ faq: d.faq_paciente }).eq('id', id); set('faq', d.faq_paciente) }
      } catch {}
    }

    setGuardando(false)
    if (publicar) { set('estado', 'publicado'); setLink(`${window.location.origin}/r/${inf.token}`) }
  }

  const addEj = (x: any) => setEjs(p => [...p, { nombre: x.nombre, instrucciones: x.instrucciones, musculos: x.musculos, nivel: x.nivel, errores: x.errores, consejos: x.consejos, imagen_url: x.imagen_url, gif_url: x.gif_url, video_url: x.video_url ?? '', nota: '', series: 3, repeticiones: '10', frecuencia: '1×/día', descanso: '30 s', duracion: '' }])
  const setEj = (i: number, k: string, v: any) => setEjs(p => p.map((e, j) => j === i ? { ...e, [k]: v } : e))
  const delEj = (i: number) => setEjs(p => p.filter((_, j) => j !== i))

  if (!inf) return <AppShell><div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div></AppShell>

  const libFiltrada = lib.filter(x => !buscar || `${x.nombre} ${x.zona} ${x.musculos}`.toLowerCase().includes(buscar.toLowerCase()))

  return (
    <AppShell>
      <div className="page-wrap" style={{ maxWidth: 820 }}>
        <button onClick={() => router.push(`/pacientes/${inf.paciente_id}`)} className="back-link">← {pac ? `${pac.nombre} ${pac.apellidos}` : 'Volver'}</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Informe inteligente</h1>
            <p className="page-sub">Genera, edita y comparte el informe del paciente.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/informes/${id}/clinico`} className="btn-line">Ver informe clínico</Link>
            <button className="btn-line" onClick={generar} disabled={gen}>{gen ? 'Generando…' : '✦ Generar con IA'}</button>
            <button className="btn-line" onClick={() => guardar(false)} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn-ink" onClick={() => guardar(true)} disabled={guardando}>{guardando ? 'Publicando…' : 'Publicar y compartir'}</button>
          </div>
        </div>

        {link && (
          <div className="alert-ok" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>Publicado. Enlace para el paciente: <a href={link} target="_blank" style={{ color: '#15803d', textDecoration: 'underline' }}>{link}</a></span>
            <span style={{ display: 'flex', gap: 8 }}>
              <a className="btn-line" href={`https://wa.me/?text=${encodeURIComponent('Tu guía de recuperación: ' + link)}`} target="_blank">WhatsApp</a>
              <a className="btn-line" href={`mailto:?subject=Tu guía de recuperación&body=${encodeURIComponent(link)}`}>Email</a>
              <a className="btn-line" href={link} target="_blank">Ver / PDF</a>
            </span>
          </div>
        )}

        {/* Actividad del paciente en su guía */}
        {actividad && <ActividadPaciente actividad={actividad} totalEjercicios={ejs.length} metricas={inf.metricas} />}

        {/* Pestañas */}
        <div className="editor-tabs" role="tablist">
          {([['sesion', 'Sesión'], ['guia', 'Guía del paciente'], ['ejercicios', `Ejercicios${ejs.length ? ` (${ejs.length})` : ''}`], ['notas', 'Notas internas']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`editor-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'sesion' && (<>
        {/* Cabecera editable */}
        <div className="form-card">
          <div className="form-card-title">Cabecera</div>
          <div className="form-grid-3">
            <div><label className="form-label">Tipo de sesión</label><input className="form-input" value={inf.tipo_sesion ?? ''} onChange={e => set('tipo_sesion', e.target.value)} /></div>
            <div><label className="form-label">Duración (min)</label><input className="form-input" type="number" value={inf.duracion_min ?? ''} onChange={e => set('duracion_min', e.target.value ? parseInt(e.target.value) : null)} /></div>
            <div><label className="form-label">Sesión nº / de</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" type="number" value={inf.numero_sesion ?? ''} onChange={e => set('numero_sesion', parseInt(e.target.value) || null)} />
                <input className="form-input" type="number" value={inf.total_sesiones ?? ''} onChange={e => set('total_sesiones', parseInt(e.target.value) || null)} />
              </div>
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="form-card">
          <div className="form-card-title">Indicadores de seguimiento (0–10)</div>
          <div className="met-grid">
            {METRICAS.map(m => {
              const val = inf.metricas?.[m.k] ?? 0
              return (
                <div key={m.k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: 'var(--ink-2)' }}>{m.l}</span><strong>{val}</strong></div>
                  <input className="eva-range" type="range" min={0} max={10} value={val} onChange={e => setMet(m.k, parseInt(e.target.value))} style={{ marginTop: 4 }} />
                </div>
              )
            })}
          </div>
        </div>
        </>)}

        {tab === 'guia' && (
        /* Textos */
        <div className="form-card">
          <div className="form-card-title">Lo importante de hoy</div>
          <textarea className="form-textarea" rows={2} value={inf.resumen ?? ''} onChange={e => set('resumen', e.target.value)} placeholder="Resumen de la sesión…" />
          <div className="form-card-title" style={{ marginTop: 18 }}>Qué te ocurre (explicación sencilla)</div>
          <textarea className="form-textarea" rows={4} value={inf.explicacion ?? ''} onChange={e => set('explicacion', e.target.value)} />
          <div className="form-card-title" style={{ marginTop: 18 }}>¿Qué podemos esperar? (4 fases)</div>
          {(inf.que_esperar ?? []).map((f: any, i: number) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <input className="form-input" style={{ marginBottom: 4, fontWeight: 600 }} value={f.titulo} onChange={e => set('que_esperar', inf.que_esperar.map((x: any, j: number) => j === i ? { ...x, titulo: e.target.value } : x))} />
              <textarea className="form-textarea" rows={2} value={f.descripcion} onChange={e => set('que_esperar', inf.que_esperar.map((x: any, j: number) => j === i ? { ...x, descripcion: e.target.value } : x))} />
            </div>
          ))}
          <div className="form-card-title" style={{ marginTop: 18 }}>Recomendaciones entre sesiones</div>
          {(inf.recomendaciones ?? []).map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input className="form-input" style={{ width: 56, textAlign: 'center' }} value={r.icono} onChange={e => set('recomendaciones', inf.recomendaciones.map((x: any, j: number) => j === i ? { ...x, icono: e.target.value } : x))} />
              <input className="form-input" value={r.texto} onChange={e => set('recomendaciones', inf.recomendaciones.map((x: any, j: number) => j === i ? { ...x, texto: e.target.value } : x))} />
              <button className="btn-line danger" onClick={() => set('recomendaciones', inf.recomendaciones.filter((_: any, j: number) => j !== i))}>×</button>
            </div>
          ))}
          <button className="btn-line" onClick={() => set('recomendaciones', [...(inf.recomendaciones ?? []), { icono: '✔', texto: '' }])} style={{ marginTop: 4 }}>+ Recomendación</button>
          <div className="form-card-title" style={{ marginTop: 18 }}>Mensaje de motivación</div>
          <textarea className="form-textarea" rows={2} value={inf.motivacion ?? ''} onChange={e => set('motivacion', e.target.value)} />
        </div>
        )}

        {tab === 'notas' && (
        /* Notas internas */
        <div className="form-card">
          <div className="form-card-title">Notas internas <span style={{ fontWeight: 400, color: 'var(--faint)', textTransform: 'none', letterSpacing: 0 }}>· solo visibles para la clínica, no se publican al paciente</span></div>
          <textarea className="form-textarea" rows={3} value={inf.notas_fisio ?? ''} onChange={e => set('notas_fisio', e.target.value)} placeholder="Observaciones para el equipo, banderas a vigilar, contexto que no debe ver el paciente…" />
        </div>
        )}

        {tab === 'ejercicios' && (
        /* Ejercicios */
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="form-card-title">Ejercicios personalizados</div>
            <Link href="/configuracion/ejercicios" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Gestionar biblioteca</Link>
          </div>
          {ejs.map((e, i) => (
            <div key={i} style={{ border: '1px solid var(--hair)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5 }}>{e.nombre}</strong>
                <button className="btn-line danger" onClick={() => delEj(i)}>Quitar</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <div><label className="form-label">Series</label><input className="form-input" style={{ width: 70 }} value={e.series} onChange={ev => setEj(i, 'series', ev.target.value)} /></div>
                <div><label className="form-label">Reps</label><input className="form-input" style={{ width: 80 }} value={e.repeticiones} onChange={ev => setEj(i, 'repeticiones', ev.target.value)} /></div>
                <div><label className="form-label">Frecuencia</label><input className="form-input" style={{ width: 100 }} value={e.frecuencia ?? ''} onChange={ev => setEj(i, 'frecuencia', ev.target.value)} placeholder="2×/día" /></div>
                <div><label className="form-label">Descanso</label><input className="form-input" style={{ width: 90 }} value={e.descanso} onChange={ev => setEj(i, 'descanso', ev.target.value)} /></div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="form-label">Vídeo (YouTube, opcional)</label>
                <input className="form-input" value={e.video_url ?? ''} onChange={ev => setEj(i, 'video_url', ev.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="form-label">Comentario para este paciente <span style={{ fontWeight: 400, textTransform: 'none' }}>· opcional, se muestra junto al ejercicio</span></label>
                <input className="form-input" value={e.nota ?? ''} onChange={ev => setEj(i, 'nota', ev.target.value)} placeholder="Ej. hazlo solo si no aparece dolor agudo…" />
              </div>
            </div>
          ))}
          <input className="form-input" placeholder="Buscar ejercicio en la biblioteca…" value={buscar} onChange={e => setBuscar(e.target.value)} style={{ marginTop: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {libFiltrada.slice(0, 12).map(x => (
              <button key={x.id} className="btn-line" onClick={() => addEj(x)}>+ {x.nombre}</button>
            ))}
          </div>
        </div>
        )}
      </div>
    </AppShell>
  )
}
