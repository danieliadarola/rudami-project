// proxy.ts (Next.js 16 — el antiguo "middleware")
// Comprobación optimista de auth + refresco de sesión en el borde.
// La autorización real sigue garantizada por RLS y getUser() en el servidor.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/app/lib/supabase-proxy'

// Prefijos que exigen sesión iniciada.
const RUTAS_PROTEGIDAS = [
  '/dashboard',
  '/pacientes',
  '/citas',
  '/admin',
  '/informes',
  '/bonos',
]

function requiereAuth(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // No autenticado en ruta protegida → al login.
  if (!user && requiereAuth(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Autenticado en el login → al dashboard.
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Ejecuta en todo salvo estáticos y assets. Nunca sobre /api (rompería fetch).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
