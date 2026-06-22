'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface Ej {
  id?: string; nombre: string; zona: string; musculos: string; equipo: string
  nivel: string; instrucciones: string; errores: string; consejos: string; gif_url: string
}
const VACIO: Ej = { nombre: '', zona: '', musculos: '', equipo: '', nivel: 'principiante', instrucciones: '', errores: '', consejos: '', gif_url: '' }

export default function EjerciciosPage() {
  const router = useRouter()
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [lista, setLista] = useState<any[]>([])
  const [f, setF] = useState<Ej>(VACIO)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Ej, v: any) => setF(p => ({ ...p, [k]: v }))

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('perfiles').select('rol, clinica_id').eq('id', user.id).single()
    setEsAdmin(p?.rol === 'admin'); setClinicaId(p?.clinica_id ?? null)
    const { data } = await supabase.from('ejercicios').select('*').eq('clinica_id', p?.clinica_id).order('zona')
    setLista(data ?? [])
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!f.nombre.trim() || !clinicaId) return
    setGuardando(true)
    const payload = { nombre: f.nombre, zona: f.zona || null, musculos: f.musculos || null, equipo: f.equipo || null, nivel: f.nivel, instrucciones: f.instrucciones || null, errores: f.errores || null, consejos: f.consejos || null, gif_url: f.gif_url || null }
    if (f.id) await supabase.from('ejercicios').update(payload).eq('id', f.id)
    else await supabase.from('ejercicios').insert([{ ...payload, clinica_id: clinicaId, fuente: 'manual' }])
    setGuardando(false); setF(VACIO); cargar()
  }
  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    await supabase.from('ejercicios').delete().eq('id', id); if (f.id === id) setF(VACIO); cargar()
  }

  if (esAdmin === false) return <AppShell><div className="page-wrap-sm"><p style={{ fontSize: 14, color: 'var(--muted)', padding: '40px 0' }}>Solo el administrador puede gestionar la biblioteca de ejercicios.</p></div></AppShell>

  return (
    <AppShell>
      <div className="page-wrap">
        <button onClick={() => router.push('/pacientes')} className="back-link">← Volver</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Biblioteca de ejercicios</h1>
            <p className="page-sub">Crea ejercicios con su GIF/imagen. Los fisios los añaden a los informes del paciente.</p>
          </div>
        </div>

        <div className="cat-layout">
          {/* Lista */}
          <div className="cat-table" style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista.length === 0 && <p style={{ fontSize: 13, color: 'var(--faint)' }}>Aún no hay ejercicios.</p>}
            {lista.map(e => (
              <div key={e.id} className="pac-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, cursor: 'pointer', border: f.id === e.id ? '1px solid var(--ink)' : '1px solid var(--hair)' }}
                onClick={() => setF({ id: e.id, nombre: e.nombre, zona: e.zona ?? '', musculos: e.musculos ?? '', equipo: e.equipo ?? '', nivel: e.nivel ?? 'principiante', instrucciones: e.instrucciones ?? '', errores: e.errores ?? '', consejos: e.consejos ?? '', gif_url: e.gif_url ?? '' })}>
                <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, background: e.gif_url ? `center/cover no-repeat url(${e.gif_url})` : 'linear-gradient(135deg,#dbeafe,#ede9fe)', display: 'grid', placeItems: 'center', fontSize: 20 }}>{!e.gif_url && '🏋️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{e.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.zona || '—'} · {e.nivel}</div>
                </div>
                <button className="btn-line danger" onClick={ev => { ev.stopPropagation(); eliminar(e.id) }}>×</button>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="form-card cat-form">
            <div className="form-card-title">{f.id ? 'Editar ejercicio' : 'Nuevo ejercicio'}</div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Nombre</label><input className="form-input" value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Báscula pélvica" /></div>
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <div><label className="form-label">Zona</label><input className="form-input" value={f.zona} onChange={e => set('zona', e.target.value)} placeholder="Lumbar…" /></div>
              <div><label className="form-label">Nivel</label><select className="form-select" value={f.nivel} onChange={e => set('nivel', e.target.value)}><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select></div>
            </div>
            <div className="form-grid-2" style={{ marginBottom: 12 }}>
              <div><label className="form-label">Músculos</label><input className="form-input" value={f.musculos} onChange={e => set('musculos', e.target.value)} /></div>
              <div><label className="form-label">Material</label><input className="form-input" value={f.equipo} onChange={e => set('equipo', e.target.value)} placeholder="Sin material…" /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">URL de GIF o imagen</label>
              <input className="form-input" value={f.gif_url} onChange={e => set('gif_url', e.target.value)} placeholder="https://…" />
              {f.gif_url && <div style={{ marginTop: 8, height: 130, borderRadius: 12, background: `center/cover no-repeat url(${f.gif_url})`, border: '1px solid var(--hair)' }} />}
            </div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Instrucciones</label><textarea className="form-textarea" rows={3} value={f.instrucciones} onChange={e => set('instrucciones', e.target.value)} /></div>
            <div style={{ marginBottom: 12 }}><label className="form-label">Errores frecuentes</label><textarea className="form-textarea" rows={2} value={f.errores} onChange={e => set('errores', e.target.value)} /></div>
            <div style={{ marginBottom: 16 }}><label className="form-label">Consejos</label><textarea className="form-textarea" rows={2} value={f.consejos} onChange={e => set('consejos', e.target.value)} /></div>
            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              {f.id && <button className="btn-line" onClick={() => setF(VACIO)}>Nuevo</button>}
              <button className="btn-ink" onClick={guardar} disabled={guardando || !f.nombre.trim()}>{guardando ? 'Guardando…' : f.id ? 'Guardar cambios' : '+ Añadir'}</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
