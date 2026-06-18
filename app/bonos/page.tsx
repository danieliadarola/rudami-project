'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface Bono {
  id: string; paciente_id: string; total_sesiones: number; sesiones_usadas: number
  fecha_compra: string; fecha_caducidad: string | null; activo: boolean
  precio: number | null; titulo: string | null; servicio: string | null
  pacientes?: { nombre: string; apellidos: string; user_id?: string }
}
interface TipoBono { id: string; nombre: string; servicio: string | null; total_sesiones: number; precio: number; validez_dias: number }
type Estado = 'activo' | 'por_caducar' | 'agotado' | 'caducado' | 'inactivo'
const DIA = 86_400_000

const META: Record<Estado, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#10b981' }, por_caducar: { label: 'Por caducar', color: '#d97706' },
  agotado: { label: 'Agotado', color: '#64748b' }, caducado: { label: 'Caducado', color: '#dc2626' },
  inactivo: { label: 'Inactivo', color: '#9aa1af' },
}
function estadoDe(b: Bono): Estado {
  const r = b.total_sesiones - b.sesiones_usadas
  if (!b.activo) return 'inactivo'
  if (r <= 0) return 'agotado'
  if (b.fecha_caducidad && new Date(b.fecha_caducidad).getTime() < Date.now()) return 'caducado'
  if (b.fecha_caducidad && new Date(b.fecha_caducidad).getTime() - Date.now() < 30 * DIA) return 'por_caducar'
  return 'activo'
}
function Ring({ restantes, total, color }: { restantes: number; total: number; color: string }) {
  const r = 34, c = 2 * Math.PI * r, frac = total > 0 ? Math.max(0, restantes) / total : 0
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
  const [tiposBono, setTiposBono] = useState<TipoBono[]>([])
  const [fisios, setFisios] = useState<any[]>([])
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<'activos' | 'por_caducar' | 'por_agotarse' | 'finalizados' | 'todos'>('activos')
  const [modal, setModal] = useState(false)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: perfil } = await supabase.from('perfiles').select('clinica_id, rol').eq('id', user.id).single()
    setClinicaId(perfil?.clinica_id ?? null)
    setEsAdmin(perfil?.rol === 'admin')
    const [{ data: bs }, { data: ps }, { data: tb }, { data: fs }] = await Promise.all([
      supabase.from('bonos').select('*, pacientes(nombre, apellidos, user_id)').order('created_at', { ascending: false }),
      supabase.from('pacientes').select('id, nombre, apellidos').order('apellidos'),
      supabase.from('tipos_bono').select('id, nombre, servicio, total_sesiones, precio, validez_dias').eq('activo', true).order('orden'),
      supabase.from('perfiles').select('id, nombre, apellidos').eq('clinica_id', perfil?.clinica_id),
    ])
    setBonos((bs ?? []) as Bono[]); setPacientes(ps ?? []); setTiposBono(tb ?? []); setFisios(fs ?? [])
    setCargando(false)
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  const conEstado = bonos.map(b => ({ b, e: estadoDe(b) }))
  const visibles = conEstado.filter(({ b, e }) =>
    filtro === 'todos' ? true
      : filtro === 'activos' ? (e === 'activo' || e === 'por_caducar')
      : filtro === 'por_caducar' ? e === 'por_caducar'
      : filtro === 'por_agotarse' ? ((e === 'activo' || e === 'por_caducar') && (b.total_sesiones - b.sesiones_usadas) > 0 && (b.total_sesiones - b.sesiones_usadas) <= 2)
      : (e === 'agotado' || e === 'caducado' || e === 'inactivo'))
  const prio: Record<Estado, number> = { por_caducar: 0, activo: 1, agotado: 2, caducado: 3, inactivo: 4 }
  visibles.sort((a, b) => {
    const ra = a.b.total_sesiones - a.b.sesiones_usadas, rb = b.b.total_sesiones - b.b.sesiones_usadas
    const pa = prio[a.e] + (a.e === 'activo' && ra <= 2 ? -0.5 : 0), pb = prio[b.e] + (b.e === 'activo' && rb <= 2 ? -0.5 : 0)
    if (pa !== pb) return pa - pb
    const da = a.b.fecha_caducidad ? new Date(a.b.fecha_caducidad).getTime() : Infinity
    const db = b.b.fecha_caducidad ? new Date(b.b.fecha_caducidad).getTime() : Infinity
    return da - db
  })

  const ingresoTotal = bonos.reduce((s, b) => s + (b.precio ?? 0), 0)
  const ingresoFisio = esAdmin ? (() => {
    const m = new Map<string, number>()
    for (const b of bonos) { const u = b.pacientes?.user_id; if (u && b.precio) m.set(u, (m.get(u) ?? 0) + b.precio) }
    return Array.from(m.entries()).map(([u, t]) => { const f = fisios.find(x => x.id === u); return { nombre: f ? `${f.nombre} ${f.apellidos}` : '—', t } }).sort((a, b) => b.t - a.t)
  })() : []

  const FILTROS = [
    { k: 'activos', l: 'Activos' }, { k: 'por_caducar', l: 'Por caducar' },
    { k: 'por_agotarse', l: 'Por agotarse' }, { k: 'finalizados', l: 'Finalizados' }, { k: 'todos', l: 'Todos' },
  ] as const

  return (
    <AppShell>
      <div className="page-wrap-xl">
        <div className="page-head">
          <div>
            <h1 className="page-title">Bonos</h1>
            <p className="page-sub">Añade packs del catálogo de la clínica. El uso se descuenta solo al registrar sesiones.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {esAdmin && <Link href="/configuracion/tipos-bono" className="btn-line">Gestionar catálogo</Link>}
            <button className="btn-ink" onClick={() => setModal(true)}>+ Añadir bono</button>
          </div>
        </div>

        {esAdmin && bonos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--hair-s)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginRight: 4 }}>Ingresos</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginRight: 8 }}>{ingresoTotal.toLocaleString('es-ES')}€</span>
            {ingresoFisio.map(x => (
              <span key={x.nombre} style={{ fontSize: 12.5, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--hair)', borderRadius: 999, padding: '5px 12px' }}>
                {x.nombre} · <strong style={{ color: 'var(--ink)' }}>{x.t.toLocaleString('es-ES')}€</strong>
              </span>
            ))}
          </div>
        )}

        <div className="modo-tabs" style={{ marginBottom: 22 }}>
          {FILTROS.map(f => <button key={f.k} className={`modo-tab${filtro === f.k ? ' active' : ''}`} onClick={() => setFiltro(f.k as any)}>{f.l}</button>)}
        </div>

        {cargando ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando bonos…</div>
        ) : visibles.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No hay bonos en este filtro.</div>
        ) : (
          <div className="bono-grid">
            {visibles.map(({ b, e }) => {
              const restantes = b.total_sesiones - b.sesiones_usadas, m = META[e]
              const dias = b.fecha_caducidad ? Math.ceil((new Date(b.fecha_caducidad).getTime() - Date.now()) / DIA) : null
              return (
                <div key={b.id} className="bono-card" onClick={() => router.push(`/pacientes/${b.paciente_id}`)} style={{ ['--ec' as any]: m.color }}>
                  <div className="bono-top">
                    <div style={{ minWidth: 0 }}>
                      <p className="bono-pac">{b.pacientes?.nombre} {b.pacientes?.apellidos}</p>
                      <p className="bono-tit">{b.servicio ?? b.titulo ?? `${b.total_sesiones} sesiones`}</p>
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
                    <span style={{ color: (e === 'por_caducar' || e === 'caducado' || e === 'agotado') ? m.color : 'var(--muted)', fontWeight: (e === 'por_caducar' || e === 'agotado') ? 600 : 400 }}>
                      {e === 'caducado' ? 'Caducado' : e === 'agotado' ? 'Sin sesiones'
                        : restantes <= 2 ? `Quedan ${restantes} sesi${restantes === 1 ? 'ón' : 'ones'}`
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

      {modal && <VenderBono clinicaId={clinicaId} pacientes={pacientes} tiposBono={tiposBono} onClose={() => setModal(false)} onCreado={() => { setModal(false); cargar() }} />}
    </AppShell>
  )
}

function VenderBono({ clinicaId, pacientes, tiposBono, onClose, onCreado }: { clinicaId: string | null; pacientes: any[]; tiposBono: TipoBono[]; onClose: () => void; onCreado: () => void }) {
  const [pacienteId, setPacienteId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const tipo = tiposBono.find(t => t.id === tipoId)

  const vender = async () => {
    if (!pacienteId || !tipo || !clinicaId) return
    setGuardando(true)
    const cad = new Date(); cad.setDate(cad.getDate() + tipo.validez_dias)
    const { error } = await supabase.from('bonos').insert([{
      paciente_id: pacienteId, clinica_id: clinicaId, tipo_bono_id: tipo.id,
      total_sesiones: tipo.total_sesiones, sesiones_usadas: 0, precio: tipo.precio,
      titulo: tipo.nombre, servicio: tipo.servicio,
      fecha_caducidad: cad.toISOString().split('T')[0], activo: true,
    }])
    setGuardando(false)
    if (error) { alert('No se pudo vender el bono.'); return }
    onCreado()
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="bono-modal">
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Añadir bono</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Asigna un bono del catálogo a un paciente.</p>

        <label className="form-label">Paciente</label>
        <select className="form-select" value={pacienteId} onChange={e => setPacienteId(e.target.value)}>
          <option value="">Selecciona…</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombre}</option>)}
        </select>

        <label className="form-label" style={{ marginTop: 16 }}>Bono del catálogo</label>
        {tiposBono.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--faint)' }}>No hay bonos en el catálogo. El administrador debe crearlos en "Gestionar catálogo".</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tiposBono.map(t => {
              const on = tipoId === t.id
              return (
                <button key={t.id} type="button" onClick={() => setTipoId(t.id)}
                  style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 11, border: `1px solid ${on ? 'var(--ink)' : 'var(--hair)'}`, background: on ? 'var(--paper-2)' : '#fff' }}>
                  <span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{t.nombre}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.total_sesiones} sesiones · válido {t.validez_dias} días</span>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{t.precio}€</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="btn-line" onClick={onClose}>Cancelar</button>
          <button className="btn-ink" onClick={vender} disabled={guardando || !pacienteId || !tipo}>{guardando ? 'Añadiendo…' : 'Añadir bono'}</button>
        </div>
      </div>
    </>
  )
}
