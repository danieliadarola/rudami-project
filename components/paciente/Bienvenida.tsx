'use client'

// components/paciente/Bienvenida.tsx
// Cuerpo de la puerta de entrada. Tres estados en una misma pantalla, para
// no encadenar rutas por algo que son dos botones:
//   · portada  → "Iniciar sesión" / "Crear cuenta" (boceto de bienvenida)
//   · entrar   → correo para el enlace mágico
//   · crear    → nombre + correo (usuario sin clínica)
// Si viene con token (desde /r/[token]) va directo al formulario de vincular.

import { useState } from 'react'
import Link from 'next/link'
import { FormularioEntrar } from './FormularioEntrar'

export function Bienvenida({ token, error, nuevo }: { token?: string; error?: string; nuevo?: boolean }) {
  const [modo, setModo] = useState<'portada' | 'entrar' | 'crear'>(
    token ? 'entrar' : nuevo ? 'crear' : 'portada',
  )

  const mensajeError =
    error === 'no_coincide'
      ? 'Ese correo no coincide con el que tu clínica tiene en tu ficha. Prueba con otro, o pídeselo a tu fisioterapeuta.'
      : error === 'ya_reclamado'
        ? 'Esta ficha ya está asociada a otra cuenta. Habla con tu clínica.'
        : error
          ? 'No hemos podido validar el enlace. Puede haber caducado: pide uno nuevo.'
          : null

  if (modo === 'portada') {
    return (
      <div className="ap-bienvenida-cuerpo">
        <button type="button" className="ap-btn" onClick={() => setModo('entrar')}>Iniciar sesión</button>
        <button type="button" className="ap-btn-linea" onClick={() => setModo('crear')}>Crear cuenta</button>
        <p className="ap-bienvenida-pie">
          ¿Vienes de parte de tu clínica? Abre el enlace que te enviaron y pulsa «Guarda tu progreso».
          <br />
          ¿Eres una clínica? <Link href="/">Accede aquí</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="ap-bienvenida-cuerpo">
      <h1>
        {token ? 'Guarda tu progreso' : modo === 'crear' ? 'Crea tu cuenta' : 'Entra en tu recuperación'}
      </h1>
      <p className="mi-nota">
        {token
          ? 'Con una cuenta no perderás tus marcas ni tu racha, y verás todo tu seguimiento aunque cambies de móvil.'
          : modo === 'crear'
            ? 'Gratis. Rutinas de la biblioteca, calendario y seguimiento. Sin contraseñas: te enviamos un enlace al correo.'
            : 'Te enviamos un enlace a tu correo. Sin contraseñas que recordar.'}
      </p>

      {mensajeError && <p className="mi-error" role="alert">{mensajeError}</p>}

      <FormularioEntrar token={token} nuevo={modo === 'crear'} />

      <p className="ap-bienvenida-pie">
        {modo === 'crear' ? (
          <>¿Ya tienes cuenta? <button type="button" className="mi-link" onClick={() => setModo('entrar')}>Inicia sesión</button></>
        ) : !token ? (
          <>¿Primera vez? <button type="button" className="mi-link" onClick={() => setModo('crear')}>Crea una cuenta</button></>
        ) : null}
      </p>
    </div>
  )
}
