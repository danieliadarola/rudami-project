// components/paciente/BarraMi.tsx
// Barra inferior de la app del paciente: las cinco secciones del boceto
// (Inicio · Rutinas · Sesiones · Chat · Perfil).
//
// Server Component a propósito: la pestaña activa llega por prop desde cada
// página en vez de leerse con usePathname(), que obligaría a 'use client' y
// a hidratar una barra que no tiene ni un solo estado. Cero JS.
//
// NO va en el layout de /mi porque ese layout también envuelve /mi/entrar y
// /mi/callback, donde una barra de navegación no pinta nada.

import Link from 'next/link'
import { IcoCasa, IcoRutinas, IcoCalendario, IcoChat, IcoPerfil } from './Iconos'

const PESTANAS = [
  { id: 'hoy',      href: '/mi',          texto: 'Inicio',   Icono: IcoCasa },
  { id: 'rutinas',  href: '/mi/rutinas',  texto: 'Rutinas',  Icono: IcoRutinas },
  { id: 'sesiones', href: '/mi/sesiones', texto: 'Sesiones', Icono: IcoCalendario },
  { id: 'chat',     href: '/mi/chat',     texto: 'Chat',     Icono: IcoChat },
  { id: 'perfil',   href: '/mi/perfil',   texto: 'Perfil',   Icono: IcoPerfil },
] as const

export type PestanaMi = (typeof PESTANAS)[number]['id']

export function BarraMi({ activa }: { activa: PestanaMi }) {
  return (
    <nav className="mi-nav guia-no-print" aria-label="Secciones de la app">
      {PESTANAS.map(({ id, href, texto, Icono }) => (
        <Link
          key={id}
          href={href}
          className={`mi-nav-item${id === activa ? ' activa' : ''}`}
          aria-current={id === activa ? 'page' : undefined}
        >
          <Icono />
          <span>{texto}</span>
        </Link>
      ))}
    </nav>
  )
}
