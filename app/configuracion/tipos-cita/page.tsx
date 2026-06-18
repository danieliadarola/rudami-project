'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface Tipo { id: string; nombre: string; color: string; duracion_min: number; activo: boolean; orden: number }

const SWATCHES = ['#3b82f6', '#10b981', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#eab308', '#64748b', '#dc2626', '#0ea5e9']

export default function TiposCitaPage() {
  const router = useRouter()
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [nuevo, setNuevo] = useState({ nombre: '', color: '#3b82f6', duracion_min: '60' })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: perfil } = await supabase.from('perfiles').select('rol, clinica_id').eq('id', user.id).single()
    setEsAdmin(perfil?.rol === 'admin')
    setClinicaId(perfil?.clinica_id ?? null)
    const { data } = await supabase.from('tipos_cita').select('*').eq('clinica_id', perfil?.clinica_id).order('orden')
    setTipos(data || [])
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const crear = async () => {
    if (!nuevo.nombre.trim() || !clinicaId) return
    setGuardando(true)
    const orden = (tipos.at(-1)?.orden ?? 0) + 1
    const { error } = await supabase.from('tipos_cita').insert([{
      clinica_id: clinicaId, nombre: nuevo.nombre.trim(), color: nuevo.color,
      duracion_min: parseInt(nuevo.duracion_min), orden,
    }])
    setGuardando(false)
    if (error) { alert('No se pudo crear el tipo.'); return }
    setNuevo({ nombre: '', color: '#3b82f6', duracion_min: '60' })
    cargar()
  }

  const actualizar = async (id: string, patch: Partial<Tipo>) => {
    setTipos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    await supabase.from('tipos_cita').update(patch).eq('id', id)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de cita? Las citas existentes quedarán sin tipo.')) return
    await supabase.from('tipos_cita').delete().eq('id', id)
    cargar()
  }

  if (esAdmin === false) {
    return (
      <AppShell>
        <div className="page-wrap-sm">
          <p style={{ fontSize: 14, color: 'var(--muted)', padding: '40px 0' }}>
            Solo el administrador de la clínica puede gestionar los tipos de cita.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="page-wrap-sm">
        <button onClick={() => router.push('/citas')} className="back-link">← Volver a la agenda</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Tipos de cita</h1>
            <p className="page-sub">Define los tipos de tu clínica y su color en la agenda.</p>
          </div>
        </div>

        {/* Lista */}
        <div className="form-card">
          {tipos.length === 0 && <p style={{ fontSize: 13, color: 'var(--faint)' }}>Aún no hay tipos. Crea el primero abajo.</p>}
          {tipos.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: '1px solid var(--hair-s)', opacity: t.activo ? 1 : 0.5 }}>
              <input
                type="color" value={t.color}
                onChange={e => actualizar(t.id, { color: e.target.value })}
                style={{ width: 30, height: 30, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                title="Color"
              />
              <input
                value={t.nombre}
                onChange={e => actualizar(t.id, { nombre: e.target.value })}
                className="form-input" style={{ flex: 1 }}
              />
              <select value={t.duracion_min} onChange={e => actualizar(t.id, { duracion_min: parseInt(e.target.value) })} className="form-select" style={{ width: 110 }}>
                {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
              <button onClick={() => actualizar(t.id, { activo: !t.activo })} className="btn-line" title="Activar/ocultar">
                {t.activo ? 'Activo' : 'Oculto'}
              </button>
              <button onClick={() => eliminar(t.id)} className="btn-line danger">Eliminar</button>
            </div>
          ))}
        </div>

        {/* Crear */}
        <div className="form-card">
          <div className="form-card-title">Nuevo tipo</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Nombre</label>
              <input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} className="form-input" placeholder="Ej. Punción seca" />
            </div>
            <div>
              <label className="form-label">Duración</label>
              <select value={nuevo.duracion_min} onChange={e => setNuevo({ ...nuevo, duracion_min: e.target.value })} className="form-select">
                {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <button onClick={crear} disabled={guardando || !nuevo.nombre.trim()} className="btn-ink" style={{ height: 38 }}>
              {guardando ? 'Creando…' : '+ Crear'}
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => setNuevo({ ...nuevo, color: c })}
                  style={{ width: 24, height: 24, borderRadius: 7, background: c, cursor: 'pointer',
                    border: nuevo.color === c ? '2px solid var(--ink)' : '1px solid var(--hair)' }} />
              ))}
              <input type="color" value={nuevo.color} onChange={e => setNuevo({ ...nuevo, color: e.target.value })}
                style={{ width: 28, height: 28, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} title="Color personalizado" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
