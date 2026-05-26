import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import BotonEliminarPaciente from '@/app/components/BotonEliminarPaciente'
import EpisodioCard from '@/app/components/EpisodioCard'

export const revalidate = 0

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  const { data: episodios } = await supabase
    .from('episodios')
    .select('*')
    .eq('paciente_id', id)
    .order('created_at', { ascending: false })

  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('paciente_id', id)
    .order('created_at', { ascending: false })

  if (!paciente) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Paciente no encontrado.</p>
      </div>
    )
  }

  const totalSesiones = sesiones?.length ?? 0
  const ultimaEva = sesiones && sesiones.length > 0 ? sesiones[0].dolor_eva : null

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif' }}>

      <nav style={{ background: '#0f172a', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '15px', fontWeight: '700' }}>R</span>
          </div>
          <span style={{ color: 'white', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.4px' }}>RuDaMi Project</span>
        </div>
        <Link
          href="/dashboard"
          style={{ border: '1.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
        >
          ← Panel
        </Link>
      </nav>

      <div style={{ padding: '32px 28px', maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#2563eb', border: '2px solid #dbeafe', flexShrink: 0 }}>
                {paciente.nombre.charAt(0)}{paciente.apellidos.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {paciente.nombre} {paciente.apellidos}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>{paciente.motivo_consulta}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <BotonEliminarPaciente id={id} />
              <Link
                href={`/pacientes/${id}/editar`}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}
              >
                Editar
              </Link>
              <Link
                href={`/pacientes/${id}/episodio/nuevo`}
                style={{ background: '#0f172a', color: 'white', padding: '8px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
              >
                + Nueva consulta
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Fecha nacimiento</p>
              <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', fontWeight: '500' }}>{paciente.fecha_nacimiento ?? '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Género</p>
              <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', fontWeight: '500', textTransform: 'capitalize' }}>{paciente.genero ?? '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Ocupación</p>
              <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', fontWeight: '500' }}>{paciente.ocupacion ?? '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Teléfono</p>
              <p style={{ fontSize: '13px', color: '#1e293b', marginTop: '4px', fontWeight: '500' }}>{paciente.telefono ?? '—'}</p>
            </div>
          </div>

          {paciente.antecedentes && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Antecedentes relevantes</p>
              <p style={{ fontSize: '13px', color: '#475569' }}>{paciente.antecedentes}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Consultas</p>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-1px', marginTop: '4px' }}>{episodios?.length ?? 0}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Sesiones totales</p>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-1px', marginTop: '4px' }}>{totalSesiones}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Último EVA</p>
              <p style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-1px', marginTop: '4px', color: ultimaEva === null ? '#94a3b8' : ultimaEva <= 3 ? '#16a34a' : ultimaEva <= 6 ? '#d97706' : '#dc2626' }}>
                {ultimaEva !== null ? `${ultimaEva}/10` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.3px' }}>
            Consultas clínicas
            <span style={{ fontSize: '13px', fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>({episodios?.length ?? 0})</span>
          </h2>
        </div>

        {!episodios || episodios.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>No hay consultas registradas. Crea la primera.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {episodios.map((episodio) => (
              <EpisodioCard
                key={episodio.id}
                episodio={episodio}
                sesiones={sesiones || []}
                paciente={paciente}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}