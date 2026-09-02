'use client'

// components/paciente/FormularioEntrar.tsx
// Petición del enlace de acceso del paciente (enlace mágico).
//
// POR QUÉ ESTE COMPONENTE ES DE CLIENTE Y NO UN SERVER ACTION:
// @supabase/ssr usa flujo PKCE (verificado: flowType 'pkce' por defecto en
// createBrowserClient y createServerClient). Al pedir el enlace, el cliente de
// navegador guarda un "code verifier" en una cookie que después necesita
// /mi/callback para canjear el código. Si la petición saliera del servidor, esa
// cookie no se crearía en el navegador del paciente y el canje fallaría.

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export function FormularioEntrar({ token }: { token?: string }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'enviado' | 'error'>('inicio')

  const pedirEnlace = async (e: React.FormEvent) => {
    e.preventDefault()
    const limpio = email.trim().toLowerCase()
    if (!limpio || estado === 'enviando') return

    setEstado('enviando')

    // El token viaja en la URL de vuelta para sobrevivir al viaje por el correo:
    // el paciente puede abrir el enlace en otro momento o en otra pestaña, y sin
    // él /mi/callback no sabría con qué ficha vincular la cuenta.
    const destino = new URL('/mi/callback', window.location.origin)
    if (token) destino.searchParams.set('t', token)

    const { error } = await supabase.auth.signInWithOtp({
      email: limpio,
      options: { emailRedirectTo: destino.toString() },
    })

    // A propósito NO se distingue entre "email correcto" y "email desconocido":
    // decirlo convertiría esta pantalla en un comprobador de qué personas son
    // pacientes de esta clínica. Si el correo no corresponde a la ficha del
    // token, el enlace llegará igual pero /mi/callback no vinculará nada.
    setEstado(error ? 'error' : 'enviado')
  }

  if (estado === 'enviado') {
    return (
      <div className="mi-entrar-ok">
        <p className="mi-entrar-t">Revisa tu correo</p>
        <p className="mi-nota">
          Te hemos enviado un enlace a <strong>{email.trim().toLowerCase()}</strong>. Ábrelo
          desde este mismo móvil y entrarás directamente.
        </p>
        <p className="mi-nota mi-nota-suave">
          ¿No lo ves? Mira en spam, o{' '}
          <button type="button" className="mi-link" onClick={() => setEstado('inicio')}>
            pruébalo con otra dirección
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={pedirEnlace} className="mi-entrar-form">
      <label htmlFor="email-paciente" className="mi-entrar-label">
        Tu correo electrónico
      </label>
      <input
        id="email-paciente"
        className="mi-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={estado === 'enviando'}
      />
      <p className="mi-nota mi-nota-suave" style={{ marginTop: 8 }}>
        Usa el mismo correo que le diste a tu clínica.
      </p>

      <button type="submit" className="mi-btn" disabled={estado === 'enviando' || !email.trim()}>
        {estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}
      </button>

      {estado === 'error' && (
        <p className="mi-error" role="alert">
          No hemos podido enviar el correo ahora mismo. Inténtalo en un minuto.
        </p>
      )}
    </form>
  )
}
