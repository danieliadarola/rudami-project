'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface TipoBono {
  id: string; nombre: string; servicio: string | null
  total_sesiones: number; precio: number; validez_dias: number; activo: boolean; orden: number
}

export default function TiposBonoPage() {
  const router = useRouter()
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [tipos, setTipos] = useState<TipoBono[]>([])
  const [nuevo, setNuevo] = useState({ nombre: '', servicio: 'Fisioterapia', total_sesiones: '10', precio: '360', validez_dias: '365' })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: perfil } = await supabase.from('perfiles').select('rol, clinica_id').eq('id', user.id).single()
    setEsAdmin(perfil?.rol === 'admin')
    setClinicaId(perfil?.clinica_id ?? null)
    const { data } = await supabase.from('tipos_bono').select('*').eq('clinica_id', perfil?.clinica_id).order('orden')
    setTipos(data || [])
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  const crear = async () => {
    if (!nuevo.nombre.trim() || !clinicaId) return
    setGuardando(true)
    const orden = (tipos.at(-1)?.orden ?? 0) + 1
    const { error } = await supabase.from('tipos_bono').insert([{
      clinica_id: clinicaId, nombre: nuevo.nombre.trim(), servicio: nuevo.servicio.trim() || null,
      total_sesiones: parseInt(nuevo.total_sesiones) || 1, precio: Number(nuevo.precio) || 0,
      validez_dias: parseInt(nuevo.validez_dias) || 365, orden,
    }])
    setGuardando(false)
    if (error) { alert('No se pudo crear el tipo de bono.'); return }
    setNuevo({ nombre: '', servicio: 'Fisioterapia', total_sesiones: '10', precio: '360', validez_dias: '365' })
    cargar()
  }
  const actualizar = async (id: string, patch: Partial<TipoBono>) => {
    setTipos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    await supabase.from('tipos_bono').update(patch).eq('id', id)
  }
  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de bono del catálogo? Los bonos ya vendidos no se ven afectados.')) return
    await supabase.from('tipos_bono').delete().eq('id', id)
    cargar()
  }

  if (esAdmin === false) {
    return <AppShell><div className="page-wrap-sm"><p style={{ fontSize: 14, color: 'var(--muted)', padding: '40px 0' }}>Solo el administrador de la clínica puede gestionar el catálogo de bonos.</p></div></AppShell>
  }

  return (
    <AppShell>
      <div className="page-wrap" style={{ maxWidth: 900 }}>
        <button onClick={() => router.push('/bonos')} className="back-link">← Volver a bonos</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Catálogo de bonos</h1>
            <p className="page-sub">Define los bonos que tu clínica ofrece. Los fisios solo podrán añadir estos.</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="pac-card" style={{ padding: 18, overflowX: 'auto', marginBottom: 16 }}>
          <div style={{ minWidth: 600 }}>
            <div className="cat-grid cat-head">
              <span>Nombre</span><span>Servicio</span><span>Sesiones</span><span>Precio €</span><span>Días</span><span>Estado</span><span></span>
            </div>
            {tipos.length === 0 && <p style={{ fontSize: 13, color: 'var(--faint)', padding: '16px 2px' }}>Aún no hay tipos de bono. Crea el primero abajo.</p>}
            {tipos.map(t => (
              <div key={t.id} className="cat-grid cat-row" style={{ opacity: t.activo ? 1 : 0.5 }}>
                <input value={t.nombre} onChange={e => actualizar(t.id, { nombre: e.target.value })} className="form-input" />
                <input value={t.servicio ?? ''} onChange={e => actualizar(t.id, { servicio: e.target.value })} className="form-input" placeholder="Servicio" />
                <input type="number" value={t.total_sesiones} onChange={e => actualizar(t.id, { total_sesiones: parseInt(e.target.value) || 1 })} className="form-input" />
                <input type="number" value={t.precio} onChange={e => actualizar(t.id, { precio: Number(e.target.value) })} className="form-input" />
                <input type="number" value={t.validez_dias} onChange={e => actualizar(t.id, { validez_dias: parseInt(e.target.value) || 365 })} className="form-input" />
                <button onClick={() => actualizar(t.id, { activo: !t.activo })} className="btn-line" style={{ height: 34, padding: '0 8px', fontSize: 12 }}>{t.activo ? 'Activo' : 'Oculto'}</button>
                <button onClick={() => eliminar(t.id)} title="Eliminar" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--hair)', background: '#fff', color: 'var(--danger)', cursor: 'pointer', fontSize: 15 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario debajo */}
        <div className="form-card">
          <div className="form-card-title">Nuevo tipo de bono</div>
          <div className="form-grid-2" style={{ marginBottom: 14 }}>
            <div><label className="form-label">Nombre</label><input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} className="form-input" placeholder="Ej. Bono 10 · Fisioterapia" /></div>
            <div><label className="form-label">Servicio</label><input value={nuevo.servicio} onChange={e => setNuevo({ ...nuevo, servicio: e.target.value })} className="form-input" placeholder="Fisioterapia, Diatermia, Pilates…" /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div><label className="form-label">Sesiones</label><input type="number" min={1} value={nuevo.total_sesiones} onChange={e => setNuevo({ ...nuevo, total_sesiones: e.target.value })} className="form-input" style={{ width: 100 }} /></div>
            <div><label className="form-label">Precio €</label><input type="number" min={0} value={nuevo.precio} onChange={e => setNuevo({ ...nuevo, precio: e.target.value })} className="form-input" style={{ width: 110 }} /></div>
            <div><label className="form-label">Días</label><input type="number" min={1} value={nuevo.validez_dias} onChange={e => setNuevo({ ...nuevo, validez_dias: e.target.value })} className="form-input" style={{ width: 100 }} /></div>
            <button onClick={crear} disabled={guardando || !nuevo.nombre.trim()} className="btn-ink" style={{ marginLeft: 'auto' }}>{guardando ? 'Creando…' : '+ Añadir al catálogo'}</button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
