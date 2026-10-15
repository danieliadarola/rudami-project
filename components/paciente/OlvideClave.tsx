'use client'

// components/paciente/OlvideClave.tsx
// "Olvidé mi contraseña": pide el correo y manda el enlace de reinicio.
//
// ESTO SÍ DEPENDE DEL CORREO, Y NO HAY FORMA DE EVITARLO
// Todo lo demás de la app se quitó de encima el email (registro y acceso van
// con contraseña, el enlace con la clínica va con un código). Pero recuperar
// una contraseña que nadie recuerda exige demostrar que el correo es tuyo, y
// eso solo se puede hacer enviándote algo ahí.
//
// Mientras el remitente de Supabase siga entregando únicamente a direcciones
// del equipo del proyecto, a un paciente real no le llegará. Por eso la
// pantalla dice desde el principio cuál es la salida real: avisar a su
// clínica. OJO, no vale ofrecerle "un código nuevo": el código de invitación
// enlaza una cuenta con una ficha, y quien ya está enlazado no desbloquea
// nada con él. A día de hoy la clínica tiene que cambiarle la contraseña
// desde el panel de Supabase.
//
// Se reutiliza la misma espera que el formulario de acceso: Supabase corta los
// envíos seguidos con un 429 y conviene decirlo en vez de dejar que insistan.

import { useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

const ESPERA_TRAS_ENVIO = 60

function segundosDeEspera(mensaje: string): number {
  const m = mensaje.match(/(\d+)\s*second/i)
  const n = m ? parseInt(m[1], 10) : NaN
  return Number.isFinite(n) && n > 0 ? Math.min(n, 300) : ESPERA_TRAS_ENVIO
}

export function OlvideClave({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [espera, setEspera] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Cuenta atrás contra un instante futuro, no sumando ticks: el móvil
   *  ralentiza los temporizadores en segundo plano. */
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

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const correo = email.trim().toLowerCase()
    if (!correo || enviando || espera > 0) return

    setEnviando(true)
    setError(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/mi/clave`,
    })

    if (err?.status === 429) {
      arrancarEspera(segundosDeEspera(err.message))
      setError('rate')
    } else if (err) {
      setError('otro')
    } else {
      arrancarEspera(ESPERA_TRAS_ENVIO)
      setEnviado(true)
    }
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className="mi-entrar-ok">
        <p className="mi-entrar-t">Mira tu correo</p>
        <p className="mi-nota">
          Si hay una cuenta con <strong>{email.trim().toLowerCase()}</strong>, le
          hemos mandado un enlace para poner una contraseña nueva. Ábrelo desde
          este mismo móvil.
        </p>
        <p className="mi-nota mi-nota-suave">
          <strong>¿No llega?</strong> Puede tardar un par de minutos, y conviene
          mirar en spam. Si aun así no aparece, díselo a tu clínica y te ayudarán
          a recuperar el acceso.
        </p>
        <p className="mi-nota mi-nota-suave">
          {espera > 0
            ? <>Podrás pedir otro enlace en <strong>{espera} s</strong>.</>
            : <button type="button" className="mi-link" onClick={() => setEnviado(false)}>Pedir otro enlace</button>}
        </p>
        <p className="mi-nota">
          <button type="button" className="mi-link" onClick={onVolver}>Volver a entrar</button>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="mi-entrar-form">
      <div className="ap-form-campo" style={{ marginTop: 0 }}>
        <label htmlFor="olv-email" className="mi-entrar-label">Tu correo electrónico</label>
        <input
          id="olv-email" className="mi-input" type="email" inputMode="email"
          autoComplete="email" required placeholder="tu@correo.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          disabled={enviando || espera > 0}
        />
      </div>

      <button type="submit" className="mi-btn" disabled={enviando || espera > 0 || !email.trim()}>
        {espera > 0 ? `Espera ${espera} s` : enviando ? 'Enviando…' : 'Enviarme el enlace'}
      </button>

      {error === 'rate' && (
        <p className="mi-error" role="alert">
          Has pedido varios enlaces seguidos y el correo los bloquea un rato.
          Espera <strong>{espera} segundos</strong> y vuelve a intentarlo.
        </p>
      )}
      {error === 'otro' && (
        <p className="mi-error" role="alert">
          No hemos podido enviar el correo ahora mismo. Inténtalo en un minuto.
        </p>
      )}

      <p className="ap-bienvenida-pie">
        ¿Eres paciente de una clínica y no te llega nada? Avísales y te ayudan
        a recuperar el acceso.
        <br />
        <button type="button" className="mi-link" onClick={onVolver}>Volver a entrar</button>
      </p>
    </form>
  )
}
