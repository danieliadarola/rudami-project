// app/mi/perfil/page.tsx
// Pestaña "Perfil": quién soy, cómo voy (los tres números del boceto), mi
// clínica o mi plan, y el menú. Server Component; solo el selector de
// objetivo semanal es de cliente.

import Link from 'next/link'
import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { EstadisticasPaciente } from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { iniciales } from '@/app/lib/paciente/formato'
import { fechaLarga } from '@/app/lib/paciente/fechas'
import { BarraMi } from '@/components/paciente/BarraMi'
import { Cabecera } from '@/components/paciente/Cabecera'
import { Objetivo } from '@/components/paciente/Objetivo'
import {
  IcoAjustes, IcoAyuda, IcoChevron, IcoChispa, IcoClinica, IcoEstrella, IcoGrafica, IcoPerfil, IcoSalir, IcoWhatsapp, IcoCheck,
} from '@/components/paciente/Iconos'

export const revalidate = 0

export default async function PaginaPerfil() {
  const { supabase, cuenta } = await cargarCuenta()
  const { data } = await supabase.rpc('mi_estadisticas')
  const st = (data as EstadisticasPaciente | null) ?? null
  const premium = esPremium(cuenta)

  const nombreCompleto = [cuenta.nombre, cuenta.apellidos].filter(Boolean).join(' ') || (cuenta.email ?? '')
  const ini = iniciales(cuenta.nombre, cuenta.apellidos) || (cuenta.email ?? '?')[0].toUpperCase()
  const tel = cuenta.clinica?.telefono?.replace(/\D/g, '')
  const pct = st && st.objetivo_semanal > 0 ? Math.min(1, st.dias_esta_semana / st.objetivo_semanal) : 0
  const R = 36, C = 2 * Math.PI * R

  return (
    <main className="ap-pagina">
      <Cabecera
        titulo="Mi perfil"
        grande
        accion={<Link href="/mi/perfil/ajustes" className="ap-cab-accion" aria-label="Ajustes"><IcoAjustes /></Link>}
      />

      <div className="ap-perfil-cab">
        <span className="ap-avatar" aria-hidden="true">{ini}</span>
        <div style={{ minWidth: 0 }}>
          <p className="ap-perfil-n">{nombreCompleto}</p>
          <p className="ap-perfil-e">{cuenta.email}</p>
          <span className={`ap-etiqueta${cuenta.plan.estado === 'free' ? ' neutra' : cuenta.plan.estado === 'premium' ? ' premium' : ''}`} style={{ marginTop: 6 }}>
            {cuenta.plan.estado === 'clinica' ? <><IcoCheck size={10} /> Premium incluido</>
              : cuenta.plan.estado === 'premium' ? <><IcoEstrella size={11} /> Premium</>
              : 'Free'}
          </span>
        </div>
      </div>

      {/* Mi progreso */}
      <section className="ap-seccion">
        <div className="ap-seccion-cab">
          <h2 className="ap-seccion-t">Mi progreso</h2>
          <Link href="/mi/progreso" className="ap-seccion-link">Ver todo</Link>
        </div>
        <div className="ap-stats">
          <div className="ap-stat ancha">
            <div className="ap-anillo" role="img" aria-label={`${st?.dias_esta_semana ?? 0} de ${st?.objetivo_semanal ?? 3} días esta semana`}>
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle className="bg" cx="42" cy="42" r={R} />
                <circle className="fg" cx="42" cy="42" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
              </svg>
              <span className="ap-anillo-num">{Math.round(pct * 100)}%</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="ap-stat-l">Objetivo semanal</p>
              <p className="ap-stat-v">{st?.dias_esta_semana ?? 0}<small>/ {st?.objetivo_semanal ?? 3} días con ejercicio</small></p>
              <Objetivo actual={st?.objetivo_semanal ?? 3} premium={premium} />
            </div>
          </div>
          <div className="ap-stat">
            <p className="ap-stat-l">Días activos</p>
            <p className="ap-stat-v">{st?.dias_activos_30 ?? 0}<small>últimos 30 días</small></p>
          </div>
          <div className="ap-stat">
            <p className="ap-stat-l">Ejercicios hechos</p>
            <p className="ap-stat-v">{st?.ejercicios_30 ?? 0}<small>últimos 30 días</small></p>
          </div>
          {st?.mejora_dolor_pct != null && (
            <div className="ap-stat">
              <p className="ap-stat-l">Mejora en dolor</p>
              <p className={`ap-stat-v${st.mejora_dolor_pct > 0 ? ' verde' : ''}`}>
                {st.mejora_dolor_pct > 0 ? '−' : st.mejora_dolor_pct < 0 ? '+' : ''}{Math.abs(st.mejora_dolor_pct)}%
              </p>
            </div>
          )}
          <div className="ap-stat">
            <p className="ap-stat-l">Rutinas activas</p>
            <p className="ap-stat-v">{st?.rutinas_activas ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Mi clínica / mi plan */}
      <section className="ap-seccion">
        {cuenta.tipo === 'clinica' && cuenta.clinica ? (
          <div className="ap-clinica">
            <div className="ap-clinica-cab">
              <span className="ap-clinica-ico"><IcoClinica /></span>
              <div style={{ minWidth: 0 }}>
                <p className="ap-clinica-n">{cuenta.clinica.nombre}</p>
                <p className="ap-clinica-d">{cuenta.clinica.direccion ?? 'Clínica asociada'}</p>
              </div>
            </div>
            {cuenta.bono && cuenta.bono.total != null && (
              <p className="ap-clinica-d" style={{ marginTop: 12 }}>
                {cuenta.bono.titulo ?? 'Tu bono'}: <strong>{Math.max(0, cuenta.bono.total - (cuenta.bono.usadas ?? 0))} de {cuenta.bono.total}</strong> sesiones disponibles
                {cuenta.bono.caducidad ? ` · caduca el ${fechaLarga(cuenta.bono.caducidad)}` : ''}
              </p>
            )}
            <div className="ap-clinica-pie">
              <IcoCheck size={12} /> <span>Premium incluido. <strong>Tu clínica te proporciona acceso a RuDaMi.</strong></span>
            </div>
          </div>
        ) : premium ? (
          <div className="ap-card tinte">
            <span className="ap-etiqueta premium"><IcoEstrella size={11} /> Premium</span>
            <p className="ap-premium-t" style={{ marginTop: 8 }}>Tu recuperación, personalizada</p>
            <p className="ap-premium-d" style={{ marginBottom: 0 }}>
              Asistente, biblioteca completa y seguimiento avanzado activos
              {cuenta.plan.hasta ? ` hasta el ${fechaLarga(cuenta.plan.hasta)}` : ''}.
            </p>
          </div>
        ) : (
          <div className="ap-premium-card">
            <span className="ap-etiqueta premium"><IcoChispa size={12} /> Premium</span>
            <p className="ap-premium-t">Tu recuperación, personalizada</p>
            <p className="ap-premium-d">
              Asistente IA, biblioteca completa, estadísticas y objetivos. Y si vas a una clínica que usa RuDaMi, lo tienes gratis.
            </p>
            <Link href="/mi/plan" className="ap-btn">Ver planes</Link>
          </div>
        )}
      </section>

      {/* Menú */}
      <section className="ap-seccion">
        <nav className="ap-menu" aria-label="Opciones del perfil">
          <Link href="/mi/perfil/ajustes" className="ap-menu-item"><IcoPerfil size={20} /> Mis datos personales <IcoChevron className="chev" /></Link>
          <Link href="/mi/progreso" className="ap-menu-item"><IcoGrafica size={20} /> Mi progreso <IcoChevron className="chev" /></Link>
          <Link href="/mi/plan" className="ap-menu-item">
            <IcoEstrella size={20} />
            <span>Plan y suscripción<span className="sub">{cuenta.plan.estado === 'clinica' ? 'Incluido por tu clínica' : cuenta.plan.estado === 'premium' ? 'Premium' : 'Free'}</span></span>
            <IcoChevron className="chev" />
          </Link>
          {tel ? (
            <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="ap-menu-item">
              <IcoWhatsapp size={20} /> Escribir a {cuenta.clinica?.nombre ?? 'mi clínica'} <IcoChevron className="chev" />
            </a>
          ) : (
            <a href="mailto:hola@rudami.app?subject=Ayuda%20con%20la%20app" className="ap-menu-item">
              <IcoAyuda size={20} /> Ayuda y soporte <IcoChevron className="chev" />
            </a>
          )}
          <a href="/api/logout?next=%2Fmi%2Fentrar" className="ap-menu-item peligro"><IcoSalir size={20} /> Cerrar sesión</a>
        </nav>
      </section>

      <BarraMi activa="perfil" />
    </main>
  )
}
