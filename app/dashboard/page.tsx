'use client'
// app/dashboard/page.tsx — Dashboard v3 "Quiet Precision"
// Lógica clínica: pacientes con episodio activo, altas del mes, banderas multifactor.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { StatBand, type StatItem } from '@/components/dashboard/StatBand'
import { ActivityChart, type ActividadRow } from '@/components/dashboard/ActivityChart'
import { TimelineAgenda, type CitaTimeline, type Fisio } from '@/components/dashboard/TimelineAgenda'
import { CitaDrawer } from '@/components/dashboard/CitaDrawer'
import { Equipo, type CargaFisio } from '@/components/dashboard/Equipo'
import { Alertas } from '@/components/dashboard/Alertas'
import { construirBanderas, type Bandera } from '@/app/lib/dashboard/banderas'

interface Perfil {
  id: string
  clinica_id: string
  nombre: string
  apellidos: string
  rol: 'admin' | 'fisio'
  color: string
}

const DIA_MS = 86_400_000

function agruparPorSemana(sesiones: { fecha: string }[]): ActividadRow[] {
  const map = new Map<string, { sesiones: number; citas: number }>()
  sesiones.forEach(s => {
    const d   = new Date(s.fecha)
    const lun = new Date(d)
    lun.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = lun.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const prev = map.get(key) ?? { sesiones: 0, citas: 0 }
    map.set(key, { ...prev, sesiones: prev.sesiones + 1 })
  })
  return Array.from(map.entries()).slice(-8).map(([semana, v]) => ({ semana, ...v }))
}

export default function DashboardPage() {
  const router = useRouter()

  const [perfil,    setPerfil]    = useState<Perfil | null>(null)
  const [fisios,    setFisios]    = useState<CargaFisio[]>([])
  const [citas,     setCitas]     = useState<(CitaTimeline & { pacienteId?: string })[]>([])
  const [stats,     setStats]     = useState<StatItem[]>([])
  const [actividad, setActividad] = useState<ActividadRow[]>([])
  const [banderas,  setBanderas]  = useState<Bandera[]>([])
  const [selected,  setSelected]  = useState<(CitaTimeline & { pacienteId?: string }) | null>(null)
  const [cargando,  setCargando]  = useState(true)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase
      .from('perfiles')
      .select('id, clinica_id, nombre, apellidos, rol, color')
      .eq('id', user.id)
      .single()

    if (!p) { router.push('/'); return }
    setPerfil(p)
    const cid = p.clinica_id

    const hoy          = new Date()
    const hoyStr       = hoy.toISOString().split('T')[0]
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
    const hace8sem     = new Date(Date.now() - 56 * DIA_MS).toISOString()
    const hace30d      = new Date(Date.now() - 30 * DIA_MS).toISOString()

    const [
      { data: equipoRaw },
      { data: citasRaw  },
      { data: episodiosRaw },
      { data: sesRaw    },
      { data: citasHistRaw },
      { data: pacientesRaw },
    ] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, apellidos, rol, color').eq('clinica_id', cid).order('rol'),
      supabase.from('citas').select(`
        id, fecha_hora, duracion_min, estado, notas,
        pacientes ( id, nombre, apellidos, telefono ),
        perfiles  ( id, nombre, apellidos, color )
      `).eq('clinica_id', cid)
        .gte('fecha_hora', `${hoyStr}T00:00:00`)
        .lte('fecha_hora', `${hoyStr}T23:59:59`)
        .order('fecha_hora'),
      supabase.from('episodios').select('id, paciente_id, user_id, titulo, estado, fecha_inicio, fecha_fin').eq('clinica_id', cid),
      supabase.from('sesiones').select('fecha, dolor_eva, paciente_id, user_id, episodio_id, red_flags').eq('clinica_id', cid).gte('fecha', hace8sem).order('fecha'),
      supabase.from('citas').select('paciente_id, user_id, estado, fecha_hora').eq('clinica_id', cid).gte('fecha_hora', hace30d),
      supabase.from('pacientes').select('id, nombre, apellidos').eq('clinica_id', cid),
    ])

    const episodios = (episodiosRaw ?? []) as any[]
    const sesiones  = (sesRaw ?? []) as any[]

    // Transformar citas de hoy
    const citasT = ((citasRaw ?? []) as any[]).map(c => ({
      id:           c.id as string,
      hora:         new Date(c.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duracion_min: c.duracion_min as number,
      paciente:     `${c.pacientes?.nombre ?? ''} ${c.pacientes?.apellidos ?? ''}`.trim(),
      motivo:       (c.notas as string) || 'Sesión',
      estado:       c.estado as CitaTimeline['estado'],
      fisio_id:     c.perfiles?.id as string,
      telefono:     c.pacientes?.telefono as string | undefined,
      pacienteId:   c.pacientes?.id as string | undefined,
    }))
    setCitas(citasT)

    const pendientes = citasT.filter(c => c.estado === 'pendiente').length

    // ── KPIs ──
    const pacientesActivos = new Set(
      episodios.filter(e => e.estado === 'activo').map(e => e.paciente_id),
    ).size

    const altasMes = episodios.filter(
      e => e.estado === 'cerrado' && e.fecha_fin && e.fecha_fin >= primerDiaMes,
    ).length

    const sesSemana = sesiones.filter(
      s => new Date(s.fecha) >= new Date(Date.now() - 7 * DIA_MS),
    ).length

    setStats([
      { label: 'Pacientes activos', valor: pacientesActivos, nota: 'con episodio activo' },
      { label: 'Citas hoy',         valor: citasT.length, delta: pendientes > 0 ? String(pendientes) : undefined, dir: pendientes > 0 ? null : undefined, nota: 'por confirmar' },
      { label: 'Sesiones · semana', valor: sesSemana, nota: 'esta semana' },
      { label: 'Altas · mes',       valor: altasMes,  nota: 'episodios cerrados' },
    ])

    setActividad(agruparPorSemana(sesiones))

    // ── Carga del equipo ──
    const eqT: CargaFisio[] = ((equipoRaw ?? []) as any[]).map(f => {
      const suyas      = citasT.filter(c => c.fisio_id === f.id)
      const reservados = suyas.reduce((s, c) => s + c.duracion_min, 0)
      const sesSem     = sesiones.filter(
        s => s.user_id === f.id && new Date(s.fecha) >= new Date(Date.now() - 7 * DIA_MS),
      ).length
      return {
        id: f.id, nombre: f.nombre, apellidos: f.apellidos, color: f.color,
        rol: f.rol as 'admin' | 'fisio',
        citasHoy: suyas.length, sesSemana: sesSem,
        ocupacion: Math.min(Math.round((reservados / 480) * 100), 100),
      }
    })
    setFisios(eqT)

    // ── Banderas multifactor ──
    setBanderas(construirBanderas({
      episodios,
      sesiones,
      citas:     (citasHistRaw ?? []) as any[],
      pacientes: (pacientesRaw ?? []) as any[],
      fisios:    ((equipoRaw ?? []) as any[]).map(f => ({ id: f.id, nombre: f.nombre, color: f.color })),
      hoy,
    }))

    setCargando(false)
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  async function confirmarCita(id: string) {
    await supabase.from('citas').update({ estado: 'confirmada' }).eq('id', id)
    setSelected(null); cargar()
  }
  async function cancelarCita(id: string) {
    await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', id)
    setSelected(null); cargar()
  }
  async function signOut() {
    await supabase.auth.signOut(); router.push('/')
  }

  if (cargando || !perfil) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <span style={{ fontSize: 13, color: 'var(--faint)' }}>Cargando…</span>
      </div>
    )
  }

  const fisiosSimple: Fisio[] = fisios.map(f => ({ id: f.id, nombre: f.nombre, apellidos: f.apellidos, color: f.color }))
  const pendientes = citas.filter(c => c.estado === 'pendiente').length
  const esAdmin = perfil.rol === 'admin'
  // El fisio solo ve su propio carril en la agenda.
  const fisiosVista = esAdmin ? fisiosSimple : fisiosSimple.filter(f => f.id === perfil.id)

  return (
    <div className="dash-shell">
      <Sidebar perfil={perfil} citasHoyCount={citas.length} onSignOut={signOut} />

      <div className="dash-main">
        <Topbar
          nombre={perfil.nombre}
          citasHoy={citas.length}
          pendientes={pendientes}
          onNuevaCita={() => router.push('/citas/nueva')}
        />

        <div className="dash-content">
          <StatBand stats={stats} />

          {esAdmin ? (
            <div className="dash-bento">
              <div className="dash-col">
                <ActivityChart data={actividad} />
                <TimelineAgenda
                  fisios={fisiosVista}
                  citas={citas}
                  onSelect={setSelected}
                  selectedId={selected?.id}
                />
              </div>

              <div className="dash-col">
                <Equipo equipo={fisios} />
                <Alertas banderas={banderas} />
              </div>
            </div>
          ) : (
            <div className="dash-bento">
              <div className="dash-col">
                <TimelineAgenda
                  fisios={fisiosVista}
                  citas={citas}
                  onSelect={setSelected}
                  selectedId={selected?.id}
                />
              </div>

              <div className="dash-col">
                <Alertas banderas={banderas} />
              </div>
            </div>
          )}
        </div>
      </div>

      <CitaDrawer
        cita={selected}
        fisio={fisiosSimple.find(f => f.id === selected?.fisio_id)}
        pacienteId={selected?.pacienteId}
        onClose={() => setSelected(null)}
        onConfirmar={confirmarCita}
        onCancelar={cancelarCita}
        onReprogramar={id => router.push(`/citas/nueva?reprogramar=${id}`)}
      />
    </div>
  )
}
