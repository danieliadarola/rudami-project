import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'

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
    <AppShell>
      <div className="page-wrap">

        <div className="page-head">
          <div>
            <h1 className="page-title">Panel de administración</h1>
            <p className="page-sub">{perfil?.clinicas?.nombre} · Vista completa de la clínica</p>
          </div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--hair)', borderRadius: 9, padding: '8px 14px', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
            {mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'var(--paper)', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--hair)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#4f5fe8' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Fisioterapeutas</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: '-1.5px', lineHeight: 1 }}>{fisios?.length ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>En la clínica</div>
          </div>
          <div style={{ background: 'var(--paper)', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--hair)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#10b981' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pacientes totales</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: '-1.5px', lineHeight: 1 }}>{pacientes?.length ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>En toda la clínica</div>
          </div>
          <div style={{ background: 'var(--paper)', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--hair)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#6366f1' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Sesiones este mes</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: '-1.5px', lineHeight: 1 }}>{sesionesmes?.length ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6, textTransform: 'capitalize' }}>{mesActual}</div>
          </div>
        </div>

        {/* Equipo */}
        <div style={{ background: 'var(--paper)', borderRadius: 14, border: '1px solid var(--hair)', padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Equipo de fisioterapeutas</h2>
            <Link href="/admin/nuevo-fisio" className="btn-ink">+ Añadir fisio</Link>
          </div>
          <div>
            {fisios?.map((fisio, index) => (
              <div key={fisio.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: index < (fisios?.length ?? 0) - 1 ? '1px solid var(--hair-s)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: fisio.rol === 'admin' ? '#eef0ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: fisio.rol === 'admin' ? '#4f5fe8' : '#16a34a', flexShrink: 0 }}>
                  {fisio.nombre?.charAt(0)}{fisio.apellidos?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{fisio.nombre} {fisio.apellidos}</div>
                  <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>
                    {fisio.numero_colegiado ? `Nº ${fisio.numero_colegiado}` : 'Sin número de colegiado'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{pacientesporFisio(fisio.id)}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>pacientes</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{sesionesporFisio(fisio.id)}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>sesiones mes</div>
                  </div>
                  <span style={{ background: fisio.rol === 'admin' ? '#eef0ff' : '#f0fdf4', color: fisio.rol === 'admin' ? '#4f5fe8' : '#16a34a', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
                    {fisio.rol === 'admin' ? 'Admin' : 'Fisio'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pacientes */}
        <div style={{ background: 'var(--paper)', borderRadius: 14, border: '1px solid var(--hair)', padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
              Todos los pacientes
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>({pacientes?.length ?? 0})</span>
            </h2>
            <Link href="/pacientes/nuevo" className="btn-ink">+ Nuevo paciente</Link>
          </div>
          <div>
            {pacientes?.map((paciente, index) => (
              <div key={paciente.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: index < (pacientes?.length ?? 0) - 1 ? '1px solid var(--hair-s)' : 'none' }}>
                <Link href={`/pacientes/${paciente.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, textDecoration: 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#eef0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4f5fe8', flexShrink: 0 }}>
                    {paciente.nombre?.charAt(0)}{paciente.apellidos?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{paciente.nombre} {paciente.apellidos}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{paciente.motivo_consulta}</div>
                  </div>
                </Link>
                <div style={{ textAlign: 'right' }}>
                  {paciente.perfiles && (
                    <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>
                      {paciente.perfiles.nombre} {paciente.perfiles.apellidos}
                    </span>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{paciente.telefono}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
