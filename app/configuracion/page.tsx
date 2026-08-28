import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import { AppShell } from '@/components/layout/AppShell'
import { DI } from '@/components/ui/DashboardIcons'
import { AjustesCliente } from '@/components/configuracion/AjustesCliente'

export const revalidate = 0

type IconName = 'calendar' | 'ticket' | 'zap' | 'users'

function CardEnlace({ href, icon, titulo, desc }: { href: string; icon: IconName; titulo: string; desc: string }) {
  return (
    <Link href={href} className="cfg-card">
      <span className="cfg-card-ico"><DI name={icon} size={19} strokeWidth={1.7} /></span>
      <span className="cfg-txt">
        <span className="cfg-t" style={{ display: 'block' }}>{titulo}</span>
        <span className="cfg-d" style={{ display: 'block' }}>{desc}</span>
      </span>
      <DI name="chevronRight" size={17} strokeWidth={1.8} className="cfg-card-arrow" />
    </Link>
  )
}

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: perfil } = await supabase.from('perfiles').select('rol, clinicas(nombre)').eq('id', user.id).single()
  const esAdmin = perfil?.rol === 'admin'
  const clinica = (perfil as any)?.clinicas?.nombre as string | undefined

  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-head">
          <div>
            <h1 className="page-title">Configuración</h1>
            <p className="page-sub">Preferencias de la aplicación{clinica ? ` · ${clinica}` : ''}.</p>
          </div>
        </div>

        {/* Apariencia y preferencias — disponible para todos */}
        <div className="cfg-section">
          <div className="cfg-section-title">Apariencia y preferencias</div>
          <AjustesCliente />
        </div>

        {/* Catálogos — solo admin */}
        {esAdmin && (
          <div className="cfg-section">
            <div className="cfg-section-title">Catálogos de la clínica</div>
            <div className="cfg-grid">
              <CardEnlace href="/configuracion/tipos-cita" icon="calendar" titulo="Tipos de cita" desc="Colores, duración y servicios de la agenda." />
              <CardEnlace href="/configuracion/tipos-bono" icon="ticket" titulo="Tipos de bono" desc="Bonos por servicio que venden los fisios." />
              <CardEnlace href="/configuracion/ejercicios" icon="zap" titulo="Biblioteca de ejercicios" desc="Ejercicios con imagen, GIF o vídeo para los informes." />
            </div>
          </div>
        )}

        {/* Clínica y equipo — solo admin */}
        {esAdmin && (
          <div className="cfg-section">
            <div className="cfg-section-title">Clínica y equipo</div>
            <div className="cfg-grid">
              <CardEnlace href="/admin" icon="users" titulo="Equipo y clínica" desc="Fisioterapeutas, altas y visión global de la clínica." />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
