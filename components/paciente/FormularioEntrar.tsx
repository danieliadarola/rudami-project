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
//
// TRES CAMINOS, UN SOLO FORMULARIO:
//   · token   → viene de /r/[token]: vincula la cuenta a su ficha de clínica.
//   · nuevo   → "Crear cuenta" de un usuario sin clínica: pide también el nombre.
//   · nada    → login normal de quien ya tiene cuenta.
// Sin contraseñas en ningún caso: el correo es la credencial.
//
// LA ESPERA ENTRE ENVÍOS (10/10/2026)
// Supabase corta los envíos seguidos con un 429 y el mensaje "you can only
// request this after N seconds". Antes eso se pintaba como un error genérico
// ("inténtalo en un minuto") y la gente volvía a pulsar, lo que reiniciaba el
// contador y hacía creer que el correo no llegaba nunca. Ahora se lee el
// número real de segundos, se bloquea el botón y se enseña la cuenta atrás.

import { useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

/** Tras un envío correcto, Supabase tampoco deja repetir de inmediato. */
const ESPERA_TRAS_ENVIO = 60

/** Saca los segundos del mensaje de Supabase; si no los dice, asume un minuto. */
function segundosDeEspera(mensaje: string): number {
  const m = mensaje.match(/(\d+)\s*second/i)
  const n = m ? parseInt(m[1], 10) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(n, 300) : ESPERA_TRAS_ENVIO
}

export function FormularioEntrar({ token, nuevo = false }: { token?: string; nuevo?: boolean }) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'enviado' | 'error'>('inicio')
  const [espera, setEspera] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Cuenta atrás contra un instante futuro, no sumando ticks: el móvil
   * ralentiza los temporizadores en segundo plano y contando ticks la espera
   * se alargaría sola. Mismo criterio que el descanso de la sesión guiada.
   */
  const arrancarEspera = (segundos: number) => {
    if (tickRef.current) clearInterval(tickRef.current)
    setEspera(segundos)
    const fin = Date.now() + segundos * 1000
    tickRef.current = setInterval(() => {
      const quedan = Math.ceil((fin - Date.now()) / 1000)
      if (quedan > 0) { setEspera(quedan); return }
      if (tickRef.current) clearInterval(tickRef.current)
      tickRef.current = null
      setEspera(0)
    }, 500)
  }

  const pedirEnlace = async (e: React.FormEvent) => {
    e.preventDefault()
    const limpio = email.trim().toLowerCase()
    if (!limpio || estado === 'enviando' || espera > 0) return
    if (nuevo && !nombre.trim()) return

    setEstado('enviando')

    // Lo que tiene que sobrevivir al viaje por el correo va en la URL de
    // vuelta: el token (para vincular la ficha) o el nombre (para crear la
    // cuenta). El paciente puede abrir el enlace en otro momento o pestaña.
    const destino = new URL('/mi/callback', window.location.origin)
    if (token) destino.searchParams.set('t', token)
    if (nuevo && nombre.trim()) destino.searchParams.set('n', nombre.trim().slice(0, 80))

    const { error } = await supabase.auth.signInWithOtp({
      email: limpio,
      options: { emailRedirectTo: destino.toString() },
    })

    if (error?.status === 429) {
      arrancarEspera(segundosDeEspera(error.message))
      setEstado('error')
      return
    }

    // A propósito NO se distingue entre "email correcto" y "email desconocido":
    // decirlo convertiría esta pantalla en un comprobador de qué personas son
    // pacientes de esta clínica.
    if (error) { setEstado('error'); return }

    // Enviado: el siguiente tampoco saldrá de inmediato, así que la pantalla
    // lo dice desde ya en vez de dejar que lo descubran a base de pulsar.
    arrancarEspera(ESPERA_TRAS_ENVIO)
    setEstado('enviado')
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
          ¿No lo ves? Mira en spam. Puede tardar un minuto en llegar, y{' '}
          <strong>pedir otro no acelera nada</strong>: cada intento reinicia la espera.
        </p>
        <p className="mi-nota mi-nota-suave">
          {espera > 0 ? (
            <>Podrás pedir un enlace nuevo en <strong>{espera} s</strong>.</>
          ) : (
            <button type="button" className="mi-link" onClick={() => setEstado('inicio')}>
              Pedir otro enlace o probar con otra dirección
            </button>
          )}
        </p>
      </div>
    )
  }

  const bloqueado = estado === 'enviando' || espera > 0
  const faltanDatos = !email.trim() || (nuevo && !nombre.trim())

  return (
    <form onSubmit={pedirEnlace} className="mi-entrar-form">
      {nuevo && (
        <div className="ap-form-campo">
          <label htmlFor="nombre-paciente" className="mi-entrar-label">Tu nombre</label>
          <input
            id="nombre-paciente"
            className="mi-input"
            type="text"
            autoComplete="given-name"
            required
            maxLength={80}
            placeholder="¿Cómo te llamamos?"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={bloqueado}
          />
        </div>
      )}

      <div className="ap-form-campo">
        <label htmlFor="email-paciente" className="mi-entrar-label">Tu correo electrónico</label>
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
          disabled={bloqueado}
        />
      </div>
      {token && (
        <p className="mi-nota mi-nota-suave" style={{ marginTop: 8 }}>
          Usa el mismo correo que le diste a tu clínica.
        </p>
      )}

      <button type="submit" className="mi-btn" disabled={bloqueado || faltanDatos}>
        {espera > 0
          ? `Espera ${espera} s`
          : estado === 'enviando'
            ? 'Enviando…'
            : nuevo ? 'Crear mi cuenta' : 'Enviarme el enlace'}
      </button>

      {estado === 'error' && espera > 0 && (
        <p className="mi-error" role="alert">
          Has pedido varios enlaces seguidos y el sistema de correo los bloquea un
          rato. Espera <strong>{espera} segundos</strong> y vuelve a intentarlo.
          Mientras tanto, revisa tu bandeja: puede que el primero ya haya llegado.
        </p>
      )}
      {estado === 'error' && espera === 0 && (
        <p className="mi-error" role="alert">
          No hemos podido enviar el correo ahora mismo. Inténtalo en un minuto.
        </p>
      )}
    </form>
  )
}
