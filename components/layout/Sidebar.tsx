'use client'
// components/layout/Sidebar.tsx
// Sidebar v3 "Quiet Precision" — fondo blanco, editorial
// Reemplaza el sidebar oscuro (#0f172a) anterior

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DI } from '@/components/ui/DashboardIcons'

interface Perfil {
  id: string
  nombre: string
  apellidos: string
  rol: 'admin' | 'fisio'
  color: string
}

interface Props {
  perfil: Perfil
  pacientesCount?: number
  citasHoyCount?: number
  onSignOut?: () => void
}

export function Sidebar({ perfil, pacientesCount, citasHoyCount, onSignOut }: Props) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard',   icon: 'dashboard'    as const },
    { href: '/pacientes', label: 'Pacientes',   icon: 'users'        as const, count: pacientesCount },
    { href: '/citas',     label: 'Agenda',      icon: 'calendar'     as const, count: citasHoyCount  },
    ...(perfil.rol === 'admin'
      ? [{ href: '/admin', label: 'Equipo',     icon: 'stethoscope'  as const }]
      : []),
    { href: '/informes',  label: 'Informes',    icon: 'file'         as const },
    { href: '/bonos',     label: 'Bonos',       icon: 'ticket'       as const },
  ]

  const ini = (perfil.nombre[0] + perfil.apellidos[0]).toUpperCase()
  const rolLabel = perfil.rol === 'admin' ? 'Administrador' : 'Fisioterapeuta'

  return (
    <aside className="sidebar-v3">
      {/* Marca */}
      <div className="sidebar-brand">
        <span className="sidebar-wordmark">RUDAMI</span>
        <span className="sidebar-dot" />
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav">
        <span className="sidebar-section">Clínica</span>

        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${active ? ' active' : ''}`}
            >
              <DI name={item.icon} size={17} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.count != null && (
                <span className="sidebar-count">{item.count}</span>
              )}
            </Link>
          )
        })}

        <span className="sidebar-section">Sistema</span>
        <Link
          href="/admin"
          className={`sidebar-item${pathname === '/admin' ? ' active' : ''}`}
        >
          <DI name="settings" size={17} strokeWidth={1.7} />
          <span>Configuración</span>
        </Link>
      </nav>

      {/* Usuario */}
      <div className="sidebar-user">
        <span style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: perfil.color + '1c', color: perfil.color,
          fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center',
          letterSpacing: '.02em',
        }}>
          {ini}
        </span>

        <div style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#16181f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {perfil.nombre} {perfil.apellidos}
          </span>
          <span style={{ fontSize: 11.5, color: '#707888' }}>{rolLabel}</span>
        </div>

        <button
          onClick={onSignOut}
          title="Cerrar sesión"
          style={{
            marginLeft: 'auto', width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            display: 'grid', placeItems: 'center', background: 'none', border: 'none',
            cursor: 'pointer', color: '#9aa1af', transition: 'color .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#16181f')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9aa1af')}
        >
          <DI name="logout" size={16} strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  )
}
