'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { DI } from '@/components/ui/DashboardIcons'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

interface Fisio { id: string; nombre: string; apellidos: string; color: string; rol: string }
interface TipoCita { id: string; nombre: string; color: string; duracion_min: number }
interface Cita {
  id: string; paciente_id: string; user_id: string; fecha_hora: string
  duracion_min: number; estado: string; notas: string; tipo_id: string | null
  pacientes: { nombre: string; apellidos: string }
}

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7' },
  confirmada: { label: 'Confirmada', color: '#047857', bg: '#d1fae5' },
  completada: { label: 'Completada', color: '#3f4654', bg: '#eef0f3' },
  cancelada:  { label: 'Cancelada',  color: '#b91c1c', bg: '#fee2e2' },
}

const ini = (n?: string, a?: string) => `${(n ?? '')[0] ?? ''}${(a ?? '')[0] ?? ''}`.toUpperCase()
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hm  = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export default function Calendario() {
  const router = useRouter()
  const calRef = useRef<any>(null)
  const [fisios, setFisios] = useState<Fisio[]>([])
  const [tipos, setTipos] = useState<TipoCita[]>([])
  const [fisiosFiltrados, setFisiosFiltrados] = useState<string[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Cita | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [resumen, setResumen] = useState({ total: 0, confirmadas: 0, pendientes: 0 })

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: perfil } = await supabase
      .from('perfiles').select('rol, clinica_id').eq('id', user.id).single()
    const admin = perfil?.rol === 'admin'
    setEsAdmin(admin)

    const [{ data: listafisios }, { data: tiposData }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, apellidos, color, rol')
        .eq('clinica_id', perfil?.clinica_id).order('nombre'),
      supabase.from('tipos_cita').select('id, nombre, color, duracion_min')
        .eq('clinica_id', perfil?.clinica_id).eq('activo', true).order('orden'),
    ])
    setFisios(listafisios || [])
    setTipos(tiposData || [])
    setFisiosFiltrados((listafisios || []).map(f => f.id))

    const { data: citasData } = await supabase
      .from('citas').select('*, pacientes(nombre, apellidos)')
      .eq(admin ? 'clinica_id' : 'user_id', admin ? perfil?.clinica_id : user.id)
      .order('fecha_hora')
    setCitas(citasData || [])

    const hoy = new Date()
    const ini0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const fin0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()
    const citasHoy = (citasData || []).filter(c => c.fecha_hora >= ini0 && c.fecha_hora <= fin0 && c.estado !== 'cancelada')
    setResumen({
      total: citasHoy.length,
      confirmadas: citasHoy.filter(c => c.estado === 'confirmada').length,
      pendientes: citasHoy.filter(c => c.estado === 'pendiente').length,
    })
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggleFisio = (id: string) =>
    setFisiosFiltrados(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  const toggleTodos = () =>
    setFisiosFiltrados(fisiosFiltrados.length === fisios.length ? [] : fisios.map(f => f.id))

  const eventos = citas
    .filter(c => fisiosFiltrados.includes(c.user_id))
    .map(cita => {
      const fisio = fisios.find(f => f.id === cita.user_id)
      const tipo  = tipos.find(t => t.id === cita.tipo_id)
      const color = tipo?.color || fisio?.color || '#3b82f6'
      const inicio = new Date(cita.fecha_hora)
      const fin = new Date(inicio.getTime() + cita.duracion_min * 60000)
      const cancelada = cita.estado === 'cancelada'
      return {
        id: cita.id,
        title: `${cita.pacientes?.nombre ?? ''} ${cita.pacientes?.apellidos ?? ''}`.trim(),
        start: inicio, end: fin,
        backgroundColor: color + (cancelada ? '0d' : '1a'),
        borderColor: color,
        textColor: '#16181f',
        classNames: cancelada ? ['cita-cancelada'] : [],
        extendedProps: {
          color,
          fisioNombre: fisio?.nombre ?? '', fisioColor: fisio?.color ?? '#3b82f6',
          fisioIni: ini(fisio?.nombre, fisio?.apellidos),
          tipoNombre: tipo?.nombre ?? 'Cita',
          estado: cita.estado, duracion: cita.duracion_min,
        },
      }
    })

  const findCita = (id: string) => citas.find(c => c.id === id) || null

  // Drag & resize → persistir
  const persistir = async (id: string, patch: Partial<Cita>, evt?: any) => {
    const { error } = await supabase.from('citas').update(patch).eq('id', id)
    if (error) { evt?.revert?.(); alert('No se pudo actualizar la cita.'); return }
    setCitas(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  const handleDrop = (info: any) =>
    persistir(info.event.id, { fecha_hora: info.event.start.toISOString() }, info)
  const handleResize = (info: any) => {
    const dur = Math.round((info.event.end - info.event.start) / 60000)
    persistir(info.event.id, { duracion_min: dur }, info)
  }
  const handleSelect = (info: any) => {
    const dur = Math.round((info.end - info.start) / 60000)
    router.push(`/citas/nueva?fecha=${ymd(info.start)}&hora=${hm(info.start)}&dur=${dur}`)
  }
  const handleDateClick = (info: any) => {
    const d = info.date as Date
    router.push(`/citas/nueva?fecha=${ymd(d)}&hora=${hm(d)}`)
  }

  const cambiarEstado = async (estado: string) => {
    if (!sel) return
    await persistir(sel.id, { estado })
    setSel({ ...sel, estado })
    cargar()
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Cargando calendario…
        </div>
      </AppShell>
    )
  }

  const selFisio = sel ? fisios.find(f => f.id === sel.user_id) : null
  const selTipo  = sel ? tipos.find(t => t.id === sel.tipo_id) : null

  return (
    <AppShell>
      <div className="content-calendar">
        <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: '210px 1fr', height: '100%' }}>

          {/* ── Sidebar ── */}
          <div className="cal-side" style={{ background: 'var(--paper)', borderRight: '1px solid var(--hair-s)', padding: 16, overflowY: 'auto' }}>
            <div style={{ marginBottom: 22 }}>
              <div className="cal-side-h">Fisioterapeutas</div>
              <div onClick={toggleTodos} className="cal-fisio-row">
                <span className="cal-check" style={{
                  borderColor: fisiosFiltrados.length === fisios.length ? 'var(--ink)' : 'var(--hair)',
                  background: fisiosFiltrados.length === fisios.length ? 'var(--ink)' : '#fff',
                }}>{fisiosFiltrados.length === fisios.length ? '✓' : ''}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>Todos</span>
                <span className="cal-count">{citas.length}</span>
              </div>
              {fisios.map(f => {
                const activo = fisiosFiltrados.includes(f.id)
                const n = citas.filter(c => c.user_id === f.id).length
                return (
                  <div key={f.id} onClick={() => toggleFisio(f.id)} className="cal-fisio-row">
                    <span className="cal-check" style={{ borderColor: f.color, background: activo ? f.color : '#fff', color: '#fff' }}>
                      {activo ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: activo ? 'var(--ink)' : 'var(--muted)', flex: 1 }}>
                      {f.nombre} {f.apellidos?.charAt(0)}.
                    </span>
                    <span className="cal-count">{n}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 22 }}>
              <div className="cal-side-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tipos de cita</span>
                {esAdmin && (
                  <Link href="/configuracion/tipos-cita" style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', textTransform: 'none', letterSpacing: 0 }}>
                    Gestionar
                  </Link>
                )}
              </div>
              {tipos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1 }}>{t.nombre}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>{t.duracion_min}'</span>
                </div>
              ))}
              {tipos.length === 0 && <p style={{ fontSize: 11.5, color: 'var(--faint)', padding: '4px 8px' }}>Sin tipos definidos.</p>}
            </div>

            <div style={{ marginBottom: 22 }}>
              <div className="cal-side-h">Resumen hoy</div>
              <div style={{ border: '1px solid var(--hair-s)', borderRadius: 10, padding: 12 }}>
                {[
                  ['Total citas', resumen.total, 'var(--ink)'],
                  ['Confirmadas', resumen.confirmadas, '#10b981'],
                  ['Pendientes', resumen.pendientes, '#d97706'],
                ].map(([k, v, c], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 2 ? 7 : 0 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{k}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: c as string }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/citas/nueva" className="btn-ink" style={{ width: '100%', justifyContent: 'center' }}>
              <DI name="plus" size={15} strokeWidth={2.2} /> Nueva cita
            </Link>
          </div>

          {/* ── Calendario ── */}
          <div style={{ background: 'var(--paper)', overflow: 'hidden' }}>
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="timeGridDay"
              locale={esLocale}
              events={eventos}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek' }}
              buttonText={{ today: 'Hoy', day: 'Día', week: 'Semana', month: 'Mes', list: 'Agenda' }}
              slotMinTime="08:00:00"
              slotMaxTime="21:00:00"
              allDaySlot={false}
              nowIndicator
              editable
              eventStartEditable
              eventDurationEditable
              selectable
              selectMirror
              select={handleSelect}
              dateClick={handleDateClick}
              eventDrop={handleDrop}
              eventResize={handleResize}
              eventClick={(info: any) => { info.jsEvent.preventDefault(); setSel(findCita(info.event.id)) }}
              height="100%"
              expandRows
              slotDuration="00:15:00"
              slotLabelInterval="01:00:00"
              eventContent={(arg: any) => {
                const p = arg.event.extendedProps
                const est = ESTADO[p.estado] ?? ESTADO.pendiente
                return (
                  <div className="cita-ev">
                    <div className="cita-ev-top">
                      <span className="cita-ev-name">{arg.event.title}</span>
                    </div>
                    <div className="cita-ev-meta">
                      <span style={{ color: p.color, fontWeight: 600 }}>{p.tipoNombre}</span>
                      <span className="cita-ev-dur">· {p.duracion}′</span>
                    </div>
                    <div className="cita-ev-foot">
                      <span className="cita-pill" style={{ color: est.color, background: est.bg }}>{est.label}</span>
                      <span className="cita-fisio" style={{ color: p.fisioColor, background: p.fisioColor + '1c' }}>{p.fisioIni}</span>
                    </div>
                  </div>
                )
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Panel lateral de cita ── */}
      {sel && (
        <>
          <div className="drawer-scrim" onClick={() => setSel(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div className="drawer-pac">
                <h2>{sel.pacientes?.nombre} {sel.pacientes?.apellidos}</h2>
                <p>{selTipo?.nombre ?? 'Cita'} · {sel.duracion_min} min</p>
              </div>
              <button className="icon-btn" onClick={() => setSel(null)} title="Cerrar">
                <DI name="x" size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="drawer-grid">
              <div className="dg-item">
                <span className="dg-k">Fecha y hora</span>
                <span className="dg-v">{new Date(sel.fecha_hora).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="dg-item">
                <span className="dg-k">Tipo</span>
                <span className="dg-v">
                  {selTipo && <span style={{ width: 9, height: 9, borderRadius: 3, background: selTipo.color, display: 'inline-block' }} />}
                  {selTipo?.nombre ?? '—'}
                </span>
              </div>
              <div className="dg-item">
                <span className="dg-k">Fisioterapeuta</span>
                <span className="dg-v">
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: selFisio?.color ?? '#3b82f6', display: 'inline-block' }} />
                  {selFisio?.nombre} {selFisio?.apellidos}
                </span>
              </div>
              <div className="dg-item">
                <span className="dg-k">Estado</span>
                <span className="cita-pill" style={{ color: (ESTADO[sel.estado] ?? ESTADO.pendiente).color, background: (ESTADO[sel.estado] ?? ESTADO.pendiente).bg }}>
                  {(ESTADO[sel.estado] ?? ESTADO.pendiente).label}
                </span>
              </div>
              {sel.notas && (
                <div className="dg-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <span className="dg-k">Notas</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sel.notas}</span>
                </div>
              )}
            </div>

            <div className="drawer-actions">
              <div className="da-row">
                {sel.estado !== 'confirmada' && (
                  <button className="btn-line" onClick={() => cambiarEstado('confirmada')}>Confirmar</button>
                )}
                {sel.estado !== 'completada' && (
                  <button className="btn-line" onClick={() => cambiarEstado('completada')}>Completada</button>
                )}
              </div>
              <button className="btn-line" onClick={() => router.push(`/citas/nueva?reprogramar=${sel.id}`)}>Reprogramar</button>
              <Link href={`/pacientes/${sel.paciente_id}`} className="btn-line block">Ver ficha del paciente</Link>
              {sel.estado !== 'cancelada' && (
                <button className="btn-line danger block" onClick={() => cambiarEstado('cancelada')}>Cancelar cita</button>
              )}
            </div>
          </aside>
        </>
      )}
    </AppShell>
  )
}
