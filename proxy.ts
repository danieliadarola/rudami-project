// proxy.ts (Next.js 16 — el antiguo "middleware")
// Comprobación optimista de auth + refresco de sesión en el borde.
// La autorización real sigue garantizada por RLS y getUser() en el servidor.
//
// Aquí conviven DOS públicos con puertas distintas:
//   · La clínica (fisios y admin) entra por "/" y vive en /dashboard, /pacientes…
//   · El paciente entra por "/mi/entrar" y vive en /mi.
// Mandar a un paciente al login de la clínica (o al revés) sería desconcertante,
// así que cada zona rebota a SU propia puerta.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/app/lib/supabase-proxy'

/** Zona de la clínica: exige sesión, rebota a "/". */
const RUTAS_PROTEGIDAS = [
  '/dashboard',
  '/pacientes',
  '/citas',
  '/admin',
  '/informes',
  '/bonos',
  '/configuracion',
]

/** Zona del paciente: exige sesión, rebota a "/mi/entrar". */
const RAIZ_PACIENTE = '/mi'
/** Dónde se rebota al paciente sin sesión. */
const PUERTA_PACIENTE = '/mi/entrar'
/**
 * Las dos rutas de /mi que tienen que funcionar SIN sesión:
 *  · /mi/entrar   — es donde se pide el enlace de acceso.
 *  · /mi/callback — es donde aterriza el enlace del correo. Protegerla sería
 *    un bucle: el paciente aún no tiene sesión precisamente porque viene a
 *    canjear el código que se la va a dar.
 */
const RUTAS_PACIENTE_PUBLICAS = [PUERTA_PACIENTE, '/mi/callback']

/**
 * Pista de enrutado, NUNCA de autorización.
 * La pone el callback del enlace mágico al entrar un paciente. Sirve solo para
 * decidir a qué portada mandarle desde "/", porque averiguar el rol de verdad
 * exigiría consultar `perfiles` y la documentación de Next es explícita en que
 * el proxy no es sitio para leer datos. Si alguien se la falsifica a mano, lo
 * único que consigue es aterrizar en una pantalla vacía: los permisos reales
 * los siguen decidiendo la RLS y las RPCs SECURITY DEFINER.
 */
const COOKIE_ROL = 'rudami-rol'

const dentroDe = (pathname: string, raiz: string): boolean =>
  pathname === raiz || pathname.startsWith(raiz + '/')

function esZonaClinica(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some((p) => dentroDe(pathname, p))
}

function esZonaPaciente(pathname: string): boolean {
  return (
    dentroDe(pathname, RAIZ_PACIENTE) &&
    !RUTAS_PACIENTE_PUBLICAS.some((p) => dentroDe(pathname, p))
  )
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Sin sesión en zona del paciente → a la puerta del paciente.
  if (!user && esZonaPaciente(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = PUERTA_PACIENTE
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Sin sesión en zona de la clínica → al login de la clínica.
  if (!user && esZonaClinica(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Con sesión en el login: cada uno a su casa.
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname =
      request.cookies.get(COOKIE_ROL)?.value === 'paciente' ? RAIZ_PACIENTE : '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Ejecuta en todo salvo estáticos y assets. Nunca sobre /api (rompería fetch).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
