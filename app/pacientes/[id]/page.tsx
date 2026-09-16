import Link from 'next/link'
import { AvisosPaciente } from '@/components/pacientes/AvisosPaciente'
import { createClient } from '@/app/lib/supabase-server'
import { AppShell } from '@/components/layout/AppShell'
import { DI } from '@/components/ui/DashboardIcons'
import { EpisodioHistorial } from '@/components/pacientes/EpisodioHistorial'

export const revalidate = 0

function calcEdad(f?: string | null): number | null {
  if (!f) return null
  return Math.floor((Date.now() - new Date(f).getTime()) / 31557600000)
}

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: paciente } = await supabase.from('pacientes').select('*').eq('id', id).single()
  if (!paciente) {
    return <AppShell><div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Paciente no encontrado.</div></AppShell>
  }

  const [{ data: episodios }, { data: sesiones }, { data: proximas }, { data: fisios }, { data: bono }] = await Promise.all([
    supabase.from('episodios').select('*').eq('paciente_id', id).order('created_at', { ascending: false }),
    supabase.from('sesiones').select('*').eq('paciente_id', id).order('created_at', { ascending: false }),
    supabase.from('citas').select('fecha_hora, estado, tipos_cita(nombre, color)').eq('paciente_id', id).gte('fecha_hora', new Date().toISOString()).neq('estado', 'cancelada').order('fecha_hora').limit(1),
    supabase.from('perfiles').select('id, nombre, apellidos, numero_colegiado, color').eq('clinica_id', paciente.clinica_id),
    supabase.from('bonos').select('*').eq('paciente_id', id).eq('activo', true).order('fecha_compra', { ascending: true }).limit(1).maybeSingle(),
  ])

  const eps = episodios ?? []
  const ses = sesiones ?? []
  const fis = fisios ?? []
  const edad = calcEdad(paciente.fecha_nacimiento)
  const iniciales = `${paciente.nombre?.[0] ?? ''}${paciente.apellidos?.[0] ?? ''}`.toUpperCase()
  const fisioAsig = fis.find(x => x.id === paciente.user_id)
  const fisioColor = fisioAsig?.color ?? '#3b82f6'

  const epPrincipal = eps.find(e => e.estado === 'activo') ?? eps[0] ?? null

  const proxima = (proximas ?? [])[0] as any
  let proxTexto: { hora: string; dia: string; tipo: string } | null = null
  if (proxima) {
    const d = new Date(proxima.fecha_hora)
    const hoy = new Date()
    const esHoy = d.toDateString() === hoy.toDateString()
    proxTexto = {
      hora: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dia: esHoy ? 'Hoy' : d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }),
      tipo: proxima.tipos_cita?.nombre ?? 'Cita',
    }
  }

  const datos: [string, 'user' | 'calendar' | 'phone' | 'mail' | 'stethoscope', string][] = [
    ['Nombre completo', 'user', `${paciente.nombre} ${paciente.apellidos}`],
    ['Nacimiento', 'calendar', paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
    ['Teléfono', 'phone', paciente.telefono ?? '—'],
    ['Email', 'mail', paciente.email ?? '—'],
    ['Asignado a', 'stethoscope', fisioAsig ? `${fisioAsig.nombre} ${fisioAsig.apellidos}` : '—'],
  ]

  return (
    <AppShell>
      <div className="page-wrap-xl">
        <Link href="/pacientes" className="back-link">← Volver a pacientes</Link>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: fisioColor + '1c', color: fisioColor, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
              {iniciales}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: 28, letterSpacing: '-.01em', color: 'var(--ink)' }}>
                <span style={{ fontStyle: 'italic', fontWeight: 500 }}>{paciente.nombre}</span>{' '}
                <strong style={{ fontWeight: 600 }}>{paciente.apellidos}</strong>
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {epPrincipal ? (
                  <>
                    {epPrincipal.estado === 'activo' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />}
                    {epPrincipal.titulo}
                    {epPrincipal.estado !== 'activo' && <span style={{ color: 'var(--faint)' }}>· cerrado</span>}
                  </>
                ) : (paciente.motivo_consulta || 'Sin episodio activo')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href={`/informes/nuevo?paciente=${id}`} className="btn-line">✦ Informe</Link>
            <Link href={`/citas/nueva?paciente=${id}`} className="btn-line"><DI name="calendar" size={15} strokeWidth={1.8} /> Nueva cita</Link>
            <Link href={`/pacientes/${id}/episodio/nuevo`} className="btn-ink"><DI name="plus" size={15} strokeWidth={2.2} /> Nueva consulta</Link>
          </div>
        </div>

        {/* 2 columnas */}
        <div className="pac-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div className="sect-head">
                <span className="sect-title">Episodios e historial</span>
                <span className="sect-sub">{eps.length} episodio{eps.length !== 1 ? 's' : ''} · {ses.length} sesiones</span>
              </div>
              {eps.length === 0 ? (
                <div className="pac-card" style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>No hay episodios. Crea la primera consulta.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {eps.map(ep => <EpisodioHistorial key={ep.id} episodio={ep} sesiones={ses} paciente={paciente} fisios={fis} />)}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="pac-side">
            <div>
              <div className="sect-head"><span className="sect-title">Datos del paciente</span></div>
              <div className="pac-card" style={{ padding: '4px 18px' }}>
                {datos.map(([k, ico, v]) => (
                  <div className="info-row" key={k}>
                    <span className="k"><DI name={ico} size={15} strokeWidth={1.7} />{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {proxTexto && (
              <div>
                <div className="sect-head"><span className="sect-title">Próxima cita</span></div>
                <Link href="/citas" className="next-cita">
                  <span className="next-cita-ico"><DI name="calendar" size={18} strokeWidth={1.7} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{proxTexto.hora} <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>· {proxTexto.dia}</span></div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{proxTexto.tipo}</div>
                  </div>
                  <DI name="chevronRight" size={16} strokeWidth={1.8} />
                </Link>
              </div>
            )}

            <AvisosPaciente pacienteId={id} />

            {bono && (
              <div>
                <div className="sect-head"><span className="sect-title">Bono de sesiones</span><span className="sect-sub">prepagado</span></div>
                <div className="pac-card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Sesiones restantes</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.max(bono.total_sesiones - bono.sesiones_usadas, 0)}<span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/{bono.total_sesiones}</span>
                    </span>
                  </div>
                  <div className="bono-bar">
                    {Array.from({ length: bono.total_sesiones }).map((_, i) => (
                      <span key={i} className={`bono-dot${i < bono.sesiones_usadas ? ' used' : ''}`} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 12 }}>
                    {bono.sesiones_usadas} usadas{bono.fecha_caducidad ? ` · caduca el ${new Date(bono.fecha_caducidad + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
