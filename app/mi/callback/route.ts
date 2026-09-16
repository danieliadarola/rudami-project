// app/mi/callback/route.ts
// Aterrizaje del enlace mágico del paciente.
//
// FLUJO COMPLETO:
//   1. /r/[token] → "Guardar mi progreso" → /mi/entrar?t=<token>
//      (o /mi/entrar → "Crear cuenta", sin token, para quien no tiene clínica)
//   2. El paciente deja su correo; el cliente de navegador pide el enlace y, por
//      ser PKCE, deja una cookie con el "code verifier".
//   3. Supabase manda el correo; el enlace pasa por su /auth/v1/verify y vuelve
//      AQUÍ con ?code=... (y el ?t=<token> que pusimos en emailRedirectTo).
//   4. Se canjea el código por sesión, se vincula la ficha y se entra.
//
// Pública en proxy.ts a propósito: quien llega aquí todavía no tiene sesión,
// precisamente porque viene a canjear el código que se la va a dar.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import type { ResultadoVinculo } from '@/app/lib/paciente/tipos'

/** Vuelta a la puerta con un motivo legible, sin filtrar detalles internos. */
function alError(request: NextRequest, motivo: string, token?: string | null) {
  const url = request.nextUrl.clone()
  url.pathname = '/mi/entrar'
  url.search = ''
  url.searchParams.set('error', motivo)
  if (token) url.searchParams.set('t', token)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const token = request.nextUrl.searchParams.get('t')
  // Nombre que dejó quien se creó la cuenta sin clínica (ver FormularioEntrar).
  const nombre = request.nextUrl.searchParams.get('n')

  if (!code) return alError(request, 'sin_codigo', token)

  const supabase = await createClient()

  // Canje PKCE: usa la cookie del verifier que dejó el navegador en el paso 2.
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return alError(request, 'codigo_invalido', token)

  // Si viene con token, es la primera vez: hay que atar la cuenta a la ficha.
  // La RPC exige token Y que el correo coincida con el de la ficha; nosotros no
  // le pasamos ningún id, así que no hay nada que se pueda manipular desde aquí.
  if (token) {
    const { data, error: eVinc } = await supabase.rpc('paciente_vincular', { p_token: token })
    const r = data as ResultadoVinculo | null

    if (eVinc || !r?.ok) {
      // Sesión iniciada pero sin ficha: se cierra para no dejar al paciente en
      // un limbo con cuenta y sin datos, y se le explica qué ha pasado.
      await supabase.auth.signOut()
      const motivo = r && !r.ok ? r.motivo : 'no_coincide'
      return alError(request, motivo, token)
    }
  }

  // Todo el que entra en /mi tiene cuenta de app (app_usuarios). Es idempotente:
  // al paciente de clínica no le cambia nada, al independiente le guarda el
  // nombre la primera vez y a partir de ahí lo respeta.
  await supabase.rpc('mi_cuenta_crear', { p_nombre: nombre?.slice(0, 80) ?? null })

  const destino = request.nextUrl.clone()
  destino.pathname = '/mi'
  destino.search = ''
  const respuesta = NextResponse.redirect(destino)

  // Pista de enrutado para proxy.ts (que no puede consultar la base): sirve
  // para que, al entrar por "/", este usuario vaya a /mi y no al panel de la
  // clínica. NO es una credencial: falsificarla solo lleva a una pantalla vacía,
  // porque los permisos los deciden las RPCs y la RLS.
  respuesta.cookies.set('rudami-rol', 'paciente', {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })

  return respuesta
}
