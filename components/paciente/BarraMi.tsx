// components/paciente/BarraMi.tsx
// Barra inferior de la app del paciente. Dos pestañas hoy; la fase 4 (citas)
// añadirá la tercera.
//
// Server Component a propósito: la pestaña activa llega por prop desde cada
// página en vez de leerse con usePathname(), que obligaría a 'use client' y
// a hidratar una barra que no tiene ni un solo estado. Cero JS.
//
// NO va en el layout de /mi porque ese layout también envuelve /mi/entrar y
// /mi/callback, donde una barra de navegación no pinta nada.

import Link from 'next/link'

const PESTANAS = [
  {
    id: 'hoy',
    href: '/mi',
    texto: 'Hoy',
    icono: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 10 9-7 9 7v10a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20Z" />
        <path d="M9 21.5v-8h6v8" />
      </svg>
    ),
  },
  {
    id: 'progreso',
    href: '/mi/progreso',
    texto: 'Progreso',
    icono: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 20h18" />
        <path d="M5 16.5 10 11l3.5 3.5L19 8" />
        <path d="M19 12V8h-4" />
      </svg>
    ),
  },
] as const

export type PestanaMi = (typeof PESTANAS)[number]['id']

export function BarraMi({ activa }: { activa: PestanaMi }) {
  return (
    <nav className="mi-nav guia-no-print" aria-label="Secciones de la app">
      {PESTANAS.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className={`mi-nav-item${p.id === activa ? ' activa' : ''}`}
          aria-current={p.id === activa ? 'page' : undefined}
        >
          {p.icono}
          <span>{p.texto}</span>
        </Link>
      ))}
    </nav>
  )
}
