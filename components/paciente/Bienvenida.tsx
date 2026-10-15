'use client'

// components/paciente/Bienvenida.tsx
// Cuerpo de la puerta de entrada. Tres estados en una misma pantalla, para
// no encadenar rutas por algo que son dos botones:
//   · portada → "Iniciar sesión" / "Crear cuenta"
//   · entrar  → correo y contraseña
//   · crear   → nombre, correo, contraseña y, si la tiene, el código de su clínica
//
// Si llega con token (desde /r/[token]) va directo a crear cuenta, porque
// quien pulsa "Guarda tu progreso" en su guía todavía no la tiene.

import { useState } from 'react'
import Link from 'next/link'
import { FormularioEntrar } from './FormularioEntrar'
import { OlvideClave } from './OlvideClave'

export function Bienvenida({ token, error, nuevo }: { token?: string; error?: string; nuevo?: boolean }) {
  const [modo, setModo] = useState<'portada' | 'entrar' | 'crear' | 'olvide'>(
    token || nuevo ? 'crear' : 'portada',
  )

  // Errores que llegan de vuelta de /mi/callback (el enlace por correo).
  const mensajeError =
    error === 'no_coincide'
      ? 'Ese correo no coincide con el que tu clínica tiene en tu ficha. Entra con tu contraseña y usa el código que te dieron.'
      : error === 'ya_reclamado'
        ? 'Esa ficha ya está asociada a otra cuenta. Habla con tu clínica.'
        : error
          ? 'No hemos podido validar el enlace. Crea tu cuenta con contraseña, es más rápido.'
          : null

  if (modo === 'olvide') {
    return (
      <div className="ap-bienvenida-cuerpo">
        <h1>Recuperar tu contraseña</h1>
        <p className="mi-nota">
          Te mandamos un enlace al correo con el que te registraste para que
          elijas una nueva.
        </p>
        <OlvideClave onVolver={() => setModo('entrar')} />
      </div>
    )
  }

  if (modo === 'portada') {
    return (
      <div className="ap-bienvenida-cuerpo">
        {mensajeError && <p className="mi-error" role="alert">{mensajeError}</p>}
        <button type="button" className="ap-btn" onClick={() => setModo('entrar')}>Iniciar sesión</button>
        <button type="button" className="ap-btn-linea" onClick={() => setModo('crear')}>Crear cuenta</button>
        <p className="ap-bienvenida-pie">
          ¿Te ha dado un código tu fisioterapeuta?{' '}
          <button type="button" className="mi-link" onClick={() => setModo('crear')}>
            Úsalo al crear tu cuenta
          </button>
          .
          <br />
          ¿Eres una clínica? <Link href="/">Accede aquí</Link>
        </p>
      </div>
    )
  }

  const creando = modo === 'crear'

  return (
    <div className="ap-bienvenida-cuerpo">
      <h1>{creando ? 'Crea tu cuenta' : 'Entra en tu recuperación'}</h1>
      <p className="mi-nota">
        {creando
          ? 'Es gratis. Si tu clínica te ha dado un código, añádelo y tendrás tu plan y tus sesiones sin pagar nada.'
          : 'Con el correo y la contraseña que elegiste al registrarte.'}
      </p>

      {mensajeError && <p className="mi-error" role="alert">{mensajeError}</p>}

      <FormularioEntrar
        token={token}
        modo={creando ? 'crear' : 'entrar'}
        onOlvide={creando ? undefined : () => setModo('olvide')}
      />

      <p className="ap-bienvenida-pie">
        {creando ? (
          <>¿Ya tienes cuenta? <button type="button" className="mi-link" onClick={() => setModo('entrar')}>Inicia sesión</button></>
        ) : (
          <>¿Primera vez? <button type="button" className="mi-link" onClick={() => setModo('crear')}>Crea una cuenta</button></>
        )}
      </p>
    </div>
  )
}
