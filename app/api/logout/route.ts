// app/api/logout/route.ts
// Cierre de sesión, compartido por la clínica y por el paciente.
// Cada uno vuelve a SU puerta: el fisio a "/", el paciente a "/mi/entrar".

import { createClient } from '@/app/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Sanea el destino recibido por query string.
 * Solo se admiten rutas internas: sin esto, `/api/logout?next=https://malo.com`
 * convertiría la app en un trampolín de phishing con el dominio de la clínica
 * en la barra de direcciones. Se rechaza también "//host" y "/\host", que los
 * navegadores interpretan como absolutos.
 */
function destinoSeguro(valor: string | null): string {
  if (!valor) return '/'
  if (!valor.startsWith('/')) return '/'
  if (valor.startsWith('//') || valor.startsWith('/\\')) return '/'
  return valor
}

async function cerrarSesion(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = new URL(request.url)
  const destino = destinoSeguro(url.searchParams.get('next'))

  const respuesta = NextResponse.redirect(`${url.origin}${destino}`, { status: 303 })
  // La pista de rol ya no tiene sentido sin sesión, y dejarla haría que el
  // siguiente inicio de sesión de un fisio en este navegador acabara en /mi.
  respuesta.cookies.delete('rudami-rol')
  return respuesta
}

export async function POST(request: Request) {
  return cerrarSesion(request)
}

export async function GET(request: Request) {
  return cerrarSesion(request)
}
