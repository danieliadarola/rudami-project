import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import ListaPacientes from '@/app/components/ListaPacientes'

export const revalidate = 0

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, clinicas(*)')
    .eq('id', user.id)
    .single()

  const esAdmin = perfil?.rol === 'admin'
  const clinicaId = perfil?.clinica_id

  const { count: totalPacientes } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq(esAdmin ? 'clinica_id' : 'user_id', esAdmin ? clinicaId : user.id)

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*')
    .eq(esAdmin ? 'clinica_id' : 'user_id', esAdmin ? clinicaId : user.id)
    .order('created_at', { ascending: false })

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

  const { data: citasHoy } = await supabase
    .from('citas')
    .select(`*, pacientes (nombre, apellidos)`)
    .eq(esAdmin ? 'clinica_id' : 'user_id', esAdmin ? clinicaId : user.id)
    .gte('fecha_hora', inicioHoy)
    .lte('fecha_hora', finHoy)
    .neq('estado', 'cancelada')
    .order('fecha_hora', { ascending: true })

  const { data: sesionesmes } = await supabase
    .from('sesiones')
    .select('id')
    .eq(esAdmin ? 'clinica_id' : 'user_id', esAdmin ? clinicaId : user.id)
    .gte('created_at', inicioMes)

  const totalSesionesmes = sesionesmes?.length ?? 0

  const formatHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fechaHoy = hoy.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const mesActual = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const proximaCita = citasHoy && citasHoy.length > 0
    ? `Próxima a las ${formatHora(citasHoy[0].fecha_hora)}`
    : 'Sin citas programadas'

  const nombreMostrar = perfil?.nombre
    ? `${perfil.nombre}`
    : user.email?.split('@')[0]

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif' }}>

      <nav style={{ background: '#0f172a', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '15px', fontWeight: '700' }}>R</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'white', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.4px' }}>
              {perfil?.clinicas?.nombre || 'RuDaMi Project'}
            </span>
            <span style={{ background: esAdmin ? '#3b82f6' : '#475569', color: 'white', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px' }}>
              {esAdmin ? 'Admin' : 'Fisioterapeuta'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {esAdmin && (
            <Link
              href="/admin"
              style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
            >
              Panel admin
            </Link>
          )}
          <Link
            href="/citas"
            style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
          >
            📅 Citas
          </Link>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <div style={{ padding: '32px 28px', maxWidth: '1000px', margin: '0 auto' }}>

        {citasHoy && citasHoy.length > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }}></div>
            <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '500' }}>
              Tienes {citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''} programada{citasHoy.length !== 1 ? 's' : ''} para hoy · {proximaCita}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.8px' }}>
              Bienvenido, {nombreMostrar}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px', textTransform: 'capitalize' }}>{fechaHoy}</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '8px 14px', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
            {mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#3b82f6' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {esAdmin ? 'Pacientes clínica' : 'Mis pacientes'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{totalPacientes ?? 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Total registrados</div>
          </div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#10b981' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {esAdmin ? 'Sesiones clínica' : 'Mis sesiones'}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{totalSesionesmes}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', textTransform: 'capitalize' }}>{mesActual}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#6366f1' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Citas hoy</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{citasHoy?.length ?? 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{proximaCita}</div>
          </div>
        </div>

        {citasHoy && citasHoy.length > 0 && (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Agenda de hoy</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''}</span>
            </div>
            {citasHoy.map((cita) => (
              <div key={cita.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '7px 10px', minWidth: '54px', textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>{formatHora(cita.fecha_hora)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    {cita.pacientes?.nombre} {cita.pacientes?.apellidos}
                  </div>
                  {cita.notas && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{cita.notas}</div>}
                </div>
                <span style={{ fontSize: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '3px 9px', borderRadius: '20px' }}>
                  {cita.duracion_min} min
                </span>
                <Link href={`/pacientes/${cita.paciente_id}`} style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px' }}>
          <ListaPacientes pacientes={pacientes || []} esAdmin={esAdmin} />
        </div>

      </div>
    </div>
  )
}