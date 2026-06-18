'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface Bono {
  id: string; paciente_id: string; total_sesiones: number; sesiones_usadas: number
  fecha_compra: string; fecha_caducidad: string | null; activo: boolean
  precio: number | null; titulo: string | null
  pacientes?: { nombre: string; apellidos: string; user_id?: string }
}
type Estado = 'activo' | 'por_caducar' | 'agotado' | 'caducado' | 'inactivo'
const DIA = 86_400_000

const META: Record<Estado, { label: string; color: string }> = {
  activo:      { label: 'Activo',      color: '#10b981' },
  por_caducar: { label: 'Por caducar', color: '#d97706' },
  agotado:     { label: 'Agotado',     color: '#64748b' },
  caducado:    { label: 'Caducado',    color: '#dc2626' },
  inactivo:    { label: 'Inactivo',    color: '#9aa1af' },
}

function estadoDe(b: Bono): Estado {
  const restantes = b.total_sesiones - b.sesiones_usadas
  if (!b.activo) return 'inactivo'
  if (restantes <= 0) return 'agotado'
  if (b.fecha_caducidad && new Date(b.fecha_caducidad).getTime() < Date.now()) return 'caducado'
  if (b.fecha_caducidad && new Date(b.fecha_caducidad).getTime() - Date.now() < 30 * DIA) return 'por_caducar'
  return 'activo'
}

function Ring({ restantes, total, color }: { restantes: number; total: number; color: string }) {
  const r = 34, c = 2 * Math.PI * r
  const frac = total > 0 ? Math.max(0, restantes) / total : 0
  return (
    <svg width="86" height="86" viewBox="0 0 86 86">
      <circle cx="43" cy="43" r={r} fill="none" stroke="var(--hair)" strokeWidth="7" />
      <circle cx="43" cy="43" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 43 43)"
        style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)' }} />
      <text x="43" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">{Math.max(0, restantes)}</text>
      <text x="43" y="55" textAnchor="middle" fontSize="9" fill="var(--faint)" letterSpacing="1">DE {total}</text>
    </svg>
  )
}

export default function BonosPage() {
  const router = useRouter()
  const [bonos, setBonos] = useState<Bono[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<'activos' | 'por_caducar' | 'finalizados' | 'todos'>('activos')
  const [modal, setModal] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [fisios, setFisios] = useState<any[]>([])

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: perfil } = await supabase.from('perfiles').select('clinica_id, rol').eq('id', user.id).single()
    setClinicaId(perfil?.clinica_id ?? null)
    setEsAdmin(perfil?.rol === 'admin')
    const [{ data: bs }, { data: ps }, { data: fs }] = await Promise.all([
      supabase.from('bonos').select('*, pacientes(nombre, apellidos, user_id)').order('created_at', { ascending: false }),
      supabase.from('pacientes').select('id, nombre, apellidos').order('apellidos'),
      supabase.from('perfiles').select('id, nombre, apellidos').eq('clinica_id', perfil?.clinica_id),
    ])
    setBonos((bs ?? []) as Bono[])
    setPacientes(ps ?? [])
    setFisios(fs ?? [])
    setCargando(false)
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const conEstado = bonos.map(b => ({ b, e: estadoDe(b) }))
  const visibles = conEstado.filter(({ e }) =>
    filtro === 'todos' ? true
      : filtro === 'activos' ? (e === 'activo' || e === 'por_caducar')
      : filtro === 'por_caducar' ? e === 'por_caducar'
      : (e === 'agotado' || e === 'caducado' || e === 'inactivo'))

  const activos = conEstado.filter(({ e }) => e === 'activo' || e === 'por_caducar')
  const kpis = {
    activos: activos.length,
    restantes: activos.reduce((s, { b }) => s + (b.total_sesiones - b.sesiones_usadas), 0),
    usadas: bonos.reduce((s, b) => s + b.sesiones_usadas, 0),
    ingresos: bonos.reduce((s, b) => s + (b.precio ?? 0), 0),
  }
  const kpiList = [
    { l: 'Bonos activos', v: String(kpis.activos), s: 'en vigor' },
    { l: 'Sesiones restantes', v: String(kpis.restantes), s: 'por consumir' },
    { l: 'Sesiones usadas', v: String(kpis.usadas), s: 'histórico' },
    ...(esAdmin ? [{ l: 'Ingresos por bonos', v: `${kpis.ingresos.toLocaleString('es-ES')}€`, s: 'total' }] : []),
  ]
  const ingresosPorFisio = esAdmin ? (() => {
    const map = new Map<string, number>()
    for (const b of bonos) {
      const uid = b.pacientes?.user_id
      if (!uid || !b.precio) continue
      map.set(uid, (map.get(uid) ?? 0) + b.precio)
    }
    return Array.from(map.entries()).map(([uid, total]) => {
      const fi = fisios.find(x => x.id === uid)
      return { nombre: fi ? `${fi.nombre} ${fi.apellidos}` : '—', total }
    }).sort((a, b) => b.total - a.total)
  })() : []

  const FILTROS = [
    { k: 'activos', l: 'Activos' }, { k: 'por_caducar', l: 'Por caducar' },
    { k: 'finalizados', l: 'Finalizados' }, { k: 'todos', l: 'Todos' },
  ] as const

  return (
    <AppShell>
      <div className="page-wrap-xl">
        <div className="page-head">
          <div>
            <h1 className="page-title">Bonos</h1>
            <p className="page-sub">Packs de sesiones prepagadas. El uso se descuenta solo al registrar sesiones.</p>
          </div>
          <button className="btn-ink" onClick={() => setModal(true)}>+ Nuevo bono</button>
        </div>

        {/* KPIs */}
        <div className="stat-band" style={{ marginBottom: esAdmin ? 18 : 28, gridTemplateColumns: `repeat(${kpiList.length}, 1fr)` }}>
          {kpiList.map((k, i) => (
            <div className="stat-cell" key={k.l} style={i === 0 ? { borderLeft: 'none' } : undefined}>
              <div className="stat-lbl">{k.l}</div>
              <div className="stat-num" style={{ fontSize: 30 }}>{k.v}</div>
              <div className="stat-delta">{k.s}</div>
            </div>
          ))}
        </div>

        {esAdmin && ingresosPorFisio.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 26 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginRight: 4 }}>Ingresos por fisio</span>
            {ingresosPorFisio.map(x => (
              <span key={x.nombre} style={{ fontSize: 12.5, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--hair)', borderRadius: 999, padding: '5px 12px' }}>
                {x.nombre} · <strong style={{ color: 'var(--ink)' }}>{x.total.toLocaleString('es-ES')}€</strong>
              </span>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="modo-tabs" style={{ marginBottom: 22 }}>
          {FILTROS.map(f => (
            <button key={f.k} className={`modo-tab${filtro === f.k ? ' active' : ''}`} onClick={() => setFiltro(f.k as any)}>{f.l}</button>
          ))}
        </div>

        {cargando ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando bonos…</div>
        ) : visibles.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No hay bonos en este filtro. Crea el primero con "+ Nuevo bono".</div>
        ) : (
          <div className="bono-grid">
            {visibles.map(({ b, e }) => {
              const restantes = b.total_sesiones - b.sesiones_usadas
              const m = META[e]
              const dias = b.fecha_caducidad ? Math.ceil((new Date(b.fecha_caducidad).getTime() - Date.now()) / DIA) : null
              return (
                <div key={b.id} className="bono-card" onClick={() => router.push(`/pacientes/${b.paciente_id}`)} style={{ ['--ec' as any]: m.color }}>
                  <div className="bono-top">
                    <div style={{ minWidth: 0 }}>
                      <p className="bono-pac">{b.pacientes?.nombre} {b.pacientes?.apellidos}</p>
                      <p className="bono-tit">{b.titulo ?? `Bono ${b.total_sesiones} sesiones`}</p>
                    </div>
                    <span className="bono-badge" style={{ color: m.color, background: m.color + '18' }}>{m.label}</span>
                  </div>

                  <div className="bono-mid">
                    <Ring restantes={restantes} total={b.total_sesiones} color={m.color} />
                    <div className="bono-dots">
                      {Array.from({ length: b.total_sesiones }).map((_, i) => (
                        <span key={i} className="bono-dot" style={{ background: i < b.sesiones_usadas ? 'var(--hair)' : m.color }} />
                      ))}
                    </div>
                  </div>

                  <div className="bono-foot">
                    <span>
                      {e === 'caducado' ? 'Caducado'
                        : e === 'agotado' ? 'Sin sesiones'
                        : dias != null ? `Caduca en ${dias} día${dias !== 1 ? 's' : ''}` : 'Sin caducidad'}
                    </span>
                    {esAdmin && b.precio != null && <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{b.precio}€</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && <NuevoBono clinicaId={clinicaId} pacientes={pacientes} onClose={() => setModal(false)} onCreado={() => { setModal(false); cargar() }} />}
    </AppShell>
  )
}

function NuevoBono({ clinicaId, pacientes, onClose, onCreado }: { clinicaId: string | null; pacientes: any[]; onClose: () => void; onCreado: () => void }) {
  const hoy = new Date()
  const masMeses = (m: number) => { const d = new Date(hoy); d.setMonth(d.getMonth() + m); return d.toISOString().split('T')[0] }
  const [form, setForm] = useState({ paciente_id: '', total: 10, precio: '380', caducidad: masMeses(12) })
  const [guardando, setGuardando] = useState(false)

  const preset = (total: number, precio: string, meses: number) =>
    setForm(f => ({ ...f, total, precio, caducidad: masMeses(meses) }))

  const crear = async () => {
    if (!form.paciente_id || !clinicaId) return
    setGuardando(true)
    const { error } = await supabase.from('bonos').insert([{
      paciente_id: form.paciente_id, clinica_id: clinicaId,
      total_sesiones: form.total, sesiones_usadas: 0,
      precio: form.precio ? Number(form.precio) : null,
      titulo: `Bono ${form.total} sesiones`,
      fecha_caducidad: form.caducidad || null, activo: true,
    }])
    setGuardando(false)
    if (error) { alert('No se pudo crear el bono.'); return }
    onCreado()
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="bono-modal">
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Nuevo bono</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Asigna un pack de sesiones a un paciente.</p>

        <label className="form-label">Paciente</label>
        <select className="form-select" value={form.paciente_id} onChange={e => setForm({ ...form, paciente_id: e.target.value })}>
          <option value="">Selecciona…</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombre}</option>)}
        </select>

        <label className="form-label" style={{ marginTop: 16 }}>Pack</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`bono-preset${form.total === 5 ? ' on' : ''}`} onClick={() => preset(5, '190', 6)}>5 sesiones</button>
          <button type="button" className={`bono-preset${form.total === 10 ? ' on' : ''}`} onClick={() => preset(10, '380', 12)}>10 sesiones</button>
          <button type="button" className={`bono-preset${form.total === 20 ? ' on' : ''}`} onClick={() => preset(20, '720', 12)}>20 sesiones</button>
        </div>

        <div className="form-grid-3" style={{ marginTop: 16 }}>
          <div>
            <label className="form-label">Sesiones</label>
            <input className="form-input" type="number" min={1} value={form.total} onChange={e => setForm({ ...form, total: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="form-label">Precio (€)</label>
            <input className="form-input" type="number" min={0} value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Caduca</label>
            <input className="form-input" type="date" value={form.caducidad} onChange={e => setForm({ ...form, caducidad: e.target.value })} />
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="btn-line" onClick={onClose}>Cancelar</button>
          <button className="btn-ink" onClick={crear} disabled={guardando || !form.paciente_id}>{guardando ? 'Creando…' : 'Crear bono'}</button>
        </div>
      </div>
    </>
  )
}
