'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

interface Fisio {
  id: string
  nombre: string
  apellidos: string
  color: string
  rol: string
}

interface Cita {
  id: string
  paciente_id: string
  user_id: string
  fecha_hora: string
  duracion_min: number
  estado: string
  notas: string
  pacientes: { nombre: string; apellidos: string }
}

export default function Calendario() {
  const router = useRouter()
  const [fisios, setFisios] = useState<Fisio[]>([])
  const [fisiosFiltrados, setFisiosFiltrados] = useState<string[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [resumen, setResumen] = useState({ total: 0, confirmadas: 0, pendientes: 0 })

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, clinica_id')
        .eq('id', user.id)
        .single()

      const admin = perfil?.rol === 'admin'
      setEsAdmin(admin)
      setClinicaId(perfil?.clinica_id || null)

      const { data: listafisios } = await supabase
        .from('perfiles')
        .select('id, nombre, apellidos, color, rol')
        .eq('clinica_id', perfil?.clinica_id)
        .order('nombre', { ascending: true })

      setFisios(listafisios || [])
      setFisiosFiltrados((listafisios || []).map(f => f.id))

      const query = supabase
        .from('citas')
        .select('*, pacientes(nombre, apellidos)')
        .eq(admin ? 'clinica_id' : 'user_id', admin ? perfil?.clinica_id : user.id)
        .order('fecha_hora', { ascending: true })

      const { data: citasData } = await query
      setCitas(citasData || [])

      const hoy = new Date()
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()
      const citasHoy = (citasData || []).filter(c => c.fecha_hora >= inicio && c.fecha_hora <= fin)
      setResumen({
        total: citasHoy.length,
        confirmadas: citasHoy.filter(c => c.estado === 'confirmada' || c.estado === 'pendiente').length,
        pendientes: citasHoy.filter(c => c.estado === 'pendiente').length,
      })

      setLoading(false)
    }
    cargar()
  }, [])

  const toggleFisio = (id: string) => {
    setFisiosFiltrados(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const toggleTodos = () => {
    if (fisiosFiltrados.length === fisios.length) {
      setFisiosFiltrados([])
    } else {
      setFisiosFiltrados(fisios.map(f => f.id))
    }
  }

  const eventos = citas
    .filter(c => fisiosFiltrados.includes(c.user_id))
    .map(cita => {
      const fisio = fisios.find(f => f.id === cita.user_id)
      const color = fisio?.color || '#3b82f6'
      const inicio = new Date(cita.fecha_hora)
      const fin = new Date(inicio.getTime() + cita.duracion_min * 60000)
      return {
        id: cita.id,
        title: `${cita.pacientes?.nombre} ${cita.pacientes?.apellidos}`,
        start: inicio,
        end: fin,
        backgroundColor: color + '33',
        borderColor: color,
        textColor: '#1e293b',
        extendedProps: {
          fisio: `${fisio?.nombre} ${fisio?.apellidos}`,
          duracion: cita.duracion_min,
          estado: cita.estado,
          notas: cita.notas,
          paciente_id: cita.paciente_id,
          color,
        },
      }
    })

  const handleEventClick = (info: any) => {
    const pacienteId = info.event.extendedProps.paciente_id
    if (pacienteId) router.push(`/pacientes/${pacienteId}`)
  }

  const handleDateClick = (info: any) => {
    router.push(`/citas/nueva?fecha=${info.dateStr}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Cargando calendario...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif' }}>

      <nav style={{ background: '#0f172a', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>R</span>
          </div>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>RuDaMi Project</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {esAdmin && (
            <Link href="/admin" style={{ border: '1.5px solid rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.85)', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', textDecoration: 'none' }}>
              Panel admin
            </Link>
          )}
          <Link href="/dashboard" style={{ border: '1.5px solid rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.85)', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', textDecoration: 'none' }}>
            ← Mi panel
          </Link>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100vh - 56px)' }}>

        <div style={{ background: 'white', borderRight: '1px solid #e2e8f0', padding: '16px', overflowY: 'auto' }}>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
              Fisioterapeutas
            </div>

            <div
              onClick={toggleTodos}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '2px' }}
            >
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid', borderColor: fisiosFiltrados.length === fisios.length ? '#3b82f6' : '#d1d5db', background: fisiosFiltrados.length === fisios.length ? '#3b82f6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white' }}>
                {fisiosFiltrados.length === fisios.length ? '✓' : ''}
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', flex: 1 }}>Todos</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px' }}>
                {citas.length}
              </span>
            </div>

            {fisios.map(fisio => {
              const activo = fisiosFiltrados.includes(fisio.id)
              const citasFisio = citas.filter(c => c.user_id === fisio.id).length
              return (
                <div
                  key={fisio.id}
                  onClick={() => toggleFisio(fisio.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '2px' }}
                >
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid', borderColor: activo ? fisio.color : '#d1d5db', background: activo ? fisio.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white' }}>
                    {activo ? '✓' : ''}
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: fisio.color, flexShrink: 0 }}></div>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b', flex: 1 }}>
                    {fisio.nombre} {fisio.apellidos?.charAt(0)}.
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px' }}>
                    {citasFisio}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
              Resumen hoy
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Total citas</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a' }}>{resumen.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Confirmadas</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>{resumen.confirmadas}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Pendientes</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#f59e0b' }}>{resumen.pendientes}</span>
              </div>
            </div>
          </div>

          <div>
            <Link
              href="/citas/nueva"
              style={{ display: 'block', background: '#0f172a', color: 'white', padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}
            >
              + Nueva cita
            </Link>
          </div>

        </div>

        <div style={{ background: 'white', overflow: 'hidden', padding: '0' }}>
          <style>{`
            .fc { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; }
            .fc .fc-toolbar { padding: 10px 16px !important; border-bottom: 1px solid #f1f5f9 !important; background: white !important; }
            .fc .fc-toolbar-title { font-size: 15px !important; font-weight: 700 !important; color: #0f172a !important; letter-spacing: -0.4px !important; }
            .fc .fc-button { background: white !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; font-size: 11px !important; font-weight: 500 !important; border-radius: 7px !important; padding: 4px 10px !important; box-shadow: none !important; text-transform: capitalize !important; }
            .fc .fc-button:hover { background: #f8fafc !important; color: #1e293b !important; }
            .fc .fc-button-active, .fc .fc-button-primary:not(:disabled).fc-button-active { background: #0f172a !important; color: white !important; border-color: #0f172a !important; }
            .fc .fc-today-button { background: white !important; color: #475569 !important; }
            .fc .fc-col-header { background: #f8fafc !important; }
            .fc .fc-col-header-cell { border-color: #f1f5f9 !important; padding: 6px 0 !important; }
            .fc .fc-col-header-cell-cushion { font-size: 11px !important; font-weight: 600 !important; color: #64748b !important; text-decoration: none !important; text-transform: capitalize !important; }
            .fc .fc-timegrid-slot { height: 40px !important; border-color: #f8fafc !important; }
            .fc .fc-timegrid-slot-label { font-size: 10px !important; color: #cbd5e1 !important; font-weight: 500 !important; vertical-align: top !important; padding-top: 2px !important; }
            .fc .fc-timegrid-slot-lane:hover { background: #fafafa !important; }
            .fc .fc-event { border-radius: 6px !important; border-left-width: 3px !important; border-top: none !important; border-right: none !important; border-bottom: none !important; cursor: pointer !important; box-shadow: none !important; }
            .fc .fc-event:hover { opacity: 0.85 !important; }
            .fc .fc-daygrid-event { border-radius: 5px !important; padding: 1px 5px !important; font-size: 11px !important; }
            .fc .fc-daygrid-day-number { font-size: 12px !important; color: #475569 !important; text-decoration: none !important; padding: 4px 6px !important; }
            .fc .fc-daygrid-day.fc-day-today { background: #fffbeb !important; }
            .fc .fc-day-today .fc-daygrid-day-number { background: #3b82f6 !important; color: white !important; border-radius: 50% !important; width: 22px !important; height: 22px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            .fc .fc-timegrid-now-indicator-line { border-color: #ef4444 !important; border-width: 1.5px !important; }
            .fc .fc-timegrid-now-indicator-arrow { border-top-color: #ef4444 !important; }
            .fc .fc-highlight { background: #eff6ff !important; border-radius: 4px !important; }
            .fc .fc-scrollgrid { border: none !important; }
            .fc .fc-scrollgrid td, .fc .fc-scrollgrid th { border-color: #f1f5f9 !important; }
            .fc .fc-list-event:hover td { background: #f8fafc !important; cursor: pointer !important; }
            .fc .fc-list-day-cushion { background: #f8fafc !important; font-size: 12px !important; font-weight: 600 !important; color: #475569 !important; }
            .fc .fc-list-event-title a { color: #1e293b !important; text-decoration: none !important; font-size: 13px !important; font-weight: 500 !important; }
            .fc .fc-list-event-time { color: #64748b !important; font-size: 12px !important; }
            .fc .fc-timegrid-divider { display: none !important; }
            .fc .fc-toolbar-chunk { display: flex !important; align-items: center !important; gap: 4px !important; }
          `}</style>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridDay"
            locale={esLocale}
            events={eventos}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek',
            }}
            buttonText={{
              today: 'Hoy',
              day: 'Día',
              week: 'Semana',
              month: 'Mes',
              list: 'Agenda',
            }}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            nowIndicator={true}
            selectable={true}
            selectMirror={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="100%"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            eventContent={(arg) => {
              const color = arg.event.extendedProps.color
              const fisio = arg.event.extendedProps.fisio
              const duracion = arg.event.extendedProps.duracion
              return (
                <div style={{ padding: '3px 4px', overflow: 'hidden', height: '100%' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {arg.event.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                    {duracion} min
                  </div>
                  {fisio && (
                    <div style={{ display: 'inline-block', fontSize: '9px', padding: '1px 5px', borderRadius: '10px', marginTop: '2px', background: color + '40', color: '#1e293b', fontWeight: '600' }}>
                      {fisio.split(' ')[0]}
                    </div>
                  )}
                </div>
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}