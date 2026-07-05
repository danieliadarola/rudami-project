'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

const MODO: Record<string, string> = { completa: 'Primera valoración', seguimiento: 'Seguimiento', rapida: 'Sesión rápida' }
const ESTADO: Record<string, { l: string; c: string; bg: string }> = {
  borrador:  { l: 'Borrador',  c: '#b45309', bg: '#fef3c7' },
  publicado: { l: 'Publicado', c: '#047857', bg: '#d1fae5' },
}

export default function InformesPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'borrador' | 'publicado'>('todos')
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase
      .from('informes')
      .select('id, fecha, tipo_sesion, numero_sesion, total_sesiones, estado, token, paciente_id, pacientes(nombre, apellidos)')
      .order('created_at', { ascending: false }).limit(300)
    setItems(data ?? [])
    setCargando(false)
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  const filtrados = items.filter(s => {
    if (filtro !== 'todos' && s.estado !== filtro) return false
    const q = busqueda.toLowerCase()
    const nom = `${s.pacientes?.nombre ?? ''} ${s.pacientes?.apellidos ?? ''}`.toLowerCase()
    return !q || nom.includes(q)
  })
  const cuenta = { todos: items.length, borrador: items.filter(i => i.estado === 'borrador').length, publicado: items.filter(i => i.estado === 'publicado').length }
  const FILTROS = [{ k: 'todos', l: 'Todos' }, { k: 'borrador', l: 'Borradores' }, { k: 'publicado', l: 'Publicados' }] as const

  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-head">
          <div>
            <h1 className="page-title">Informes del paciente</h1>
            <p className="page-sub">Guías de recuperación generadas y compartidas. Se crean desde la ficha de cada paciente.</p>
          </div>
          <button className="btn-line" onClick={() => router.push('/configuracion/ejercicios')}>Biblioteca de ejercicios</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="modo-tabs" style={{ marginBottom: 0 }}>
            {FILTROS.map(ff => (
              <button key={ff.k} className={`modo-tab${filtro === ff.k ? ' active' : ''}`} onClick={() => setFiltro(ff.k as any)}>
                {ff.l} <span style={{ color: 'var(--faint)', fontWeight: 500 }}>{cuenta[ff.k]}</span>
              </button>
            ))}
          </div>
          <input type="text" placeholder="Buscar por paciente…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: 220, maxWidth: 320, border: '1px solid var(--hair)', borderRadius: 10, padding: '9px 14px', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }} />
        </div>

        {cargando ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {busqueda || filtro !== 'todos' ? 'Sin resultados.' : 'Aún no hay informes. Entra en un paciente y pulsa "✦ Informe" para crear el primero.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            {filtrados.map((s, i) => {
              const est = ESTADO[s.estado] ?? ESTADO.borrador
              return (
                <div key={s.id} onClick={() => router.push(`/informes/${s.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto auto', gap: 16, alignItems: 'center', padding: '14px 20px', borderBottom: i < filtrados.length - 1 ? '1px solid var(--hair-s)' : 'none', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{new Date((s.fecha || '') + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{MODO[s.tipo_sesion] ?? s.tipo_sesion ?? 'Sesión'}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{s.pacientes?.nombre} {s.pacientes?.apellidos}</div>
                    {s.numero_sesion && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Sesión {s.numero_sesion}{s.total_sesiones ? ` de ${s.total_sesiones}` : ''}</div>}
                  </div>
                  {s.estado === 'publicado'
                    ? <a href={`/r/${s.token}`} target="_blank" onClick={e => e.stopPropagation()} className="btn-line" style={{ height: 32, fontSize: 12 }}>Ver</a>
                    : <span />}
                  <span className="cita-pill" style={{ color: est.c, background: est.bg }}>{est.l}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
