import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function AdminPanel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, clinicas(*)')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/dashboard')

  const clinicaId = perfil?.clinica_id

  const { data: fisios } = await supabase
    .from('perfiles')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('nombre', { ascending: true })

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*, perfiles(nombre, apellidos)')
    .eq('clinica_id', clinicaId)
    .order('created_at', { ascending: false })

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

  const { data: sesionesmes } = await supabase
    .from('sesiones')
    .select('id, user_id')
    .eq('clinica_id', clinicaId)
    .gte('created_at', inicioMes)

  const sesionesporFisio = (userId: string) =>
    sesionesmes?.filter(s => s.user_id === userId).length ?? 0

  const pacientesporFisio = (userId: string) =>
    pacientes?.filter(p => p.user_id === userId).length ?? 0

  const mesActual = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

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
            <span style={{ background: '#3b82f6', color: 'white', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px' }}>
              Admin
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/dashboard"
            style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
          >
            Mi panel
          </Link>
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

      <div style={{ padding: '32px 28px', maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.8px' }}>
              Panel de administración
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              {perfil?.clinicas?.nombre} · Vista completa de la clínica
            </p>
          </div>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '8px 14px', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
            {mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#3b82f6' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Fisioterapeutas</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{fisios?.length ?? 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>En la clínica</div>
          </div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#10b981' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Pacientes totales</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{pacientes?.length ?? 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>En toda la clínica</div>
          </div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px 22px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#6366f1' }}></div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Sesiones este mes</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a', marginTop: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{sesionesmes?.length ?? 0}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', textTransform: 'capitalize' }}>{mesActual}</div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Equipo de fisioterapeutas
            </h2>
            <Link
              href="/admin/nuevo-fisio"
              style={{ background: '#0f172a', color: 'white', padding: '8px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
            >
              + Añadir fisio
            </Link>
          </div>
          <div>
            {fisios?.map((fisio, index) => (
              <div key={fisio.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: index < (fisios?.length ?? 0) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: fisio.rol === 'admin' ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: fisio.rol === 'admin' ? '#2563eb' : '#16a34a', flexShrink: 0, border: `2px solid ${fisio.rol === 'admin' ? '#dbeafe' : '#bbf7d0'}` }}>
                  {fisio.nombre?.charAt(0)}{fisio.apellidos?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    {fisio.nombre} {fisio.apellidos}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {fisio.numero_colegiado ? `Nº ${fisio.numero_colegiado}` : 'Sin número de colegiado'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{pacientesporFisio(fisio.id)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>pacientes</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{sesionesporFisio(fisio.id)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>sesiones mes</div>
                  </div>
                  <span style={{ background: fisio.rol === 'admin' ? '#eff6ff' : '#f0fdf4', color: fisio.rol === 'admin' ? '#2563eb' : '#16a34a', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px' }}>
                    {fisio.rol === 'admin' ? 'Admin' : 'Fisio'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Todos los pacientes
              <span style={{ fontSize: '13px', fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>({pacientes?.length ?? 0})</span>
            </h2>
            <Link
              href="/pacientes/nuevo"
              style={{ background: '#0f172a', color: 'white', padding: '8px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
            >
              + Nuevo paciente
            </Link>
          </div>
          <div>
            {pacientes?.map((paciente, index) => (
              <div key={paciente.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 0', borderBottom: index < (pacientes?.length ?? 0) - 1 ? '1px solid #f8fafc' : 'none' }}>
                <Link href={`/pacientes/${paciente.id}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, textDecoration: 'none' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#2563eb', flexShrink: 0, border: '2px solid #dbeafe' }}>
                    {paciente.nombre?.charAt(0)}{paciente.apellidos?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {paciente.nombre} {paciente.apellidos}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {paciente.motivo_consulta}
                    </div>
                  </div>
                </Link>
                <div style={{ textAlign: 'right' }}>
                  {paciente.perfiles && (
                    <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '3px 9px', borderRadius: '20px', fontWeight: '500' }}>
                      {paciente.perfiles.nombre} {paciente.perfiles.apellidos}
                    </span>
                  )}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{paciente.telefono}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}