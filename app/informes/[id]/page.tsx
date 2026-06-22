'use client'

import { useState, use, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

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
      motivacion: inf.motivacion, metricas: inf.metricas, updated_at: new Date().toISOString(),
      ...(publicar ? { estado: 'publicado' } : {}),
    }).eq('id', id)
    await supabase.from('informe_ejercicios').delete().eq('informe_id', id)
    if (ejs.length) {
      await supabase.from('informe_ejercicios').insert(ejs.map((e, i) => ({
        informe_id: id, nombre: e.nombre, instrucciones: e.instrucciones, musculos: e.musculos, nivel: e.nivel,
        series: e.series, repeticiones: e.repeticiones, descanso: e.descanso, duracion: e.duracion,
        errores: e.errores, consejos: e.consejos, imagen_url: e.imagen_url, gif_url: e.gif_url, orden: i,
      })))
    }
    setGuardando(false)
    if (publicar) { set('estado', 'publicado'); setLink(`${window.location.origin}/r/${inf.token}`) }
  }

  const addEj = (x: any) => setEjs(p => [...p, { nombre: x.nombre, instrucciones: x.instrucciones, musculos: x.musculos, nivel: x.nivel, errores: x.errores, consejos: x.consejos, imagen_url: x.imagen_url, gif_url: x.gif_url, series: 3, repeticiones: '10', descanso: '30 s', duracion: '' }])
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-line" onClick={generar} disabled={gen}>{gen ? 'Generando…' : '✦ Generar con IA'}</button>
            <button className="btn-line" onClick={() => guardar(false)} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn-ink" onClick={() => guardar(true)} disabled={guardando}>Publicar y compartir</button>
          </div>
        </div>

        {link && (
          <div className="alert-ok" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>Publicado. Enlace para el paciente: <a href={link} target="_blank" style={{ color: '#15803d', textDecoration: 'underline' }}>{link}</a></span>
            <span style={{ display: 'flex', gap: 8 }}>
              <a className="btn-line" href={`https://wa.me/?text=${encodeURIComponent('Tu informe de fisioterapia: ' + link)}`} target="_blank">WhatsApp</a>
              <a className="btn-line" href={`mailto:?subject=Tu informe de fisioterapia&body=${encodeURIComponent(link)}`}>Email</a>
              <a className="btn-line" href={link} target="_blank">Ver / PDF</a>
            </span>
          </div>
        )}

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px' }}>
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

        {/* Textos */}
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

        {/* Ejercicios */}
        <div className="form-card">
          <div className="form-card-title">Ejercicios personalizados</div>
          {ejs.map((e, i) => (
            <div key={i} style={{ border: '1px solid var(--hair)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5 }}>{e.nombre}</strong>
                <button className="btn-line danger" onClick={() => delEj(i)}>Quitar</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <div><label className="form-label">Series</label><input className="form-input" style={{ width: 70 }} value={e.series} onChange={ev => setEj(i, 'series', ev.target.value)} /></div>
                <div><label className="form-label">Reps</label><input className="form-input" style={{ width: 80 }} value={e.repeticiones} onChange={ev => setEj(i, 'repeticiones', ev.target.value)} /></div>
                <div><label className="form-label">Descanso</label><input className="form-input" style={{ width: 90 }} value={e.descanso} onChange={ev => setEj(i, 'descanso', ev.target.value)} /></div>
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
      </div>
    </AppShell>
  )
}
