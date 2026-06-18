'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface Paciente {
  id: string
  nombre: string
  apellidos: string
  telefono?: string
  email?: string
  motivo_consulta?: string
  created_at: string
}

type Filtro = 'activos' | 'alta' | 'todos'

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [activos, setActivos] = useState<Set<string>>(new Set())
  const [conEpisodio, setConEpisodio] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('activos')

  useEffect(() => {
    const cargar = async () => {
      const [{ data: pacs }, { data: epis }] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellidos, telefono, email, motivo_consulta, created_at').order('apellidos'),
        supabase.from('episodios').select('paciente_id, estado'),
      ])
      setPacientes(pacs ?? [])
      const act = new Set<string>(), con = new Set<string>()
      ;(epis ?? []).forEach((e: any) => {
        if (e.paciente_id) {
          con.add(e.paciente_id)
          if (e.estado === 'activo') act.add(e.paciente_id)
        }
      })
      setActivos(act); setConEpisodio(con)
      setCargando(false)
    }
    cargar()
  }, [])

  const estadoOk = (p: Paciente) =>
    filtro === 'todos' ? true
      : filtro === 'activos' ? activos.has(p.id)
      : conEpisodio.has(p.id) && !activos.has(p.id) // de alta

  const filtrados = pacientes.filter(p => {
    if (!estadoOk(p)) return false
    const q = busqueda.toLowerCase()
    return !q || (
      p.nombre.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.telefono?.includes(q)
    )
  })

  const cuenta = {
    activos: pacientes.filter(p => activos.has(p.id)).length,
    alta: pacientes.filter(p => conEpisodio.has(p.id) && !activos.has(p.id)).length,
    todos: pacientes.length,
  }
  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'activos', label: `Activos` },
    { key: 'alta', label: `De alta` },
    { key: 'todos', label: `Todos` },
  ]

  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-head">
          <div>
            <h1 className="page-title">Pacientes</h1>
            <p className="page-sub">{cuenta.activos} activos · {cuenta.todos} en total</p>
          </div>
          <button className="btn-ink" onClick={() => router.push('/pacientes/nuevo')}>+ Nuevo paciente</button>
        </div>

        {/* Filtro + buscador */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="modo-tabs" style={{ marginBottom: 0 }}>
            {FILTROS.map(ff => (
              <button key={ff.key} className={`modo-tab${filtro === ff.key ? ' active' : ''}`} onClick={() => setFiltro(ff.key)}>
                {ff.label} <span style={{ color: 'var(--faint)', fontWeight: 500 }}>{cuenta[ff.key]}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: 240, maxWidth: 360, border: '1px solid var(--hair)', borderRadius: 10, padding: '9px 14px', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }}
          />
        </div>

        {cargando ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando pacientes…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {busqueda ? 'Sin resultados para esa búsqueda.' : filtro === 'activos' ? 'No hay pacientes activos.' : filtro === 'alta' ? 'No hay pacientes de alta.' : 'Aún no hay pacientes registrados.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            {filtrados.map((p, i) => (
              <div
                key={p.id}
                onClick={() => router.push(`/pacientes/${p.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < filtrados.length - 1 ? '1px solid var(--hair-s)' : 'none', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--paper-2)', border: '1px solid var(--hair)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  {p.nombre[0]}{p.apellidos[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{p.apellidos}, {p.nombre}</div>
                  {p.motivo_consulta && (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.motivo_consulta}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {p.telefono && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.telefono}</div>}
                  {!activos.has(p.id) && conEpisodio.has(p.id) && <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>De alta</div>}
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--faint)" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
