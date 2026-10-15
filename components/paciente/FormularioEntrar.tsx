'use client'

// components/paciente/FormularioEntrar.tsx
// Acceso del paciente con CONTRASEÑA (10/10/2026).
//
// POR QUÉ SE CAMBIÓ EL ENLACE POR CORREO POR UNA CONTRASEÑA
// La app nació sin contraseñas: el correo era la credencial. Sobre el papel
// es más cómodo, pero en la práctica dejó la app inservible, porque el
// remitente que trae Supabase de serie solo entrega a las direcciones del
// equipo del proyecto y con un tope de muy pocos envíos por hora. Nadie que
// no estuviera en el equipo podía entrar, ni siquiera para una demo.
//
// Con contraseña el registro no depende de nadie: nombre, correo, contraseña
// y dentro. El enlace por correo sigue existiendo en /mi/callback para cuando
// haya un remitente de verdad (Resend), pero ya no es el único camino.
//
// REQUISITO DE CONFIGURACIÓN
// Supabase debe tener DESACTIVADA la confirmación por correo
// (Authentication → Sign In / Providers → Confirm email). Si está activada,
// signUp no devuelve sesión y esta pantalla lo dice en lugar de dejar al
// paciente mirando una rueda que no acaba.
//
// LOS TRES CAMINOS QUE PEDÍA EL PRODUCTO
//   · particular        → se registra y entra como gratuito.
//   · paciente de clínica → añade el código de seis letras que le dio su
//     fisio, y queda enlazado a su ficha con premium incluido.
//   · desde /r/[token]  → si viene de su guía, el token enlaza igual que antes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const MIN_CLAVE = 8

/** Pista de enrutado para proxy.ts, nunca una credencial: solo decide si al
 *  abrir "/" se aterriza en la app o en el panel de la clínica. La pone
 *  también /mi/callback; aquí se replica porque con contraseña no se pasa
 *  por allí. */
function marcarRolPaciente() {
  const seguro = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `rudami-rol=paciente; path=/; max-age=31536000; samesite=lax${seguro}`
}

export function FormularioEntrar({
  token,
  modo,
  onOlvide,
}: {
  /** Token de la guía /r/[token], si viene de ahí. */
  token?: string
  modo: 'entrar' | 'crear'
  /** Solo al entrar: abre la pantalla de recuperar contraseña. */
  onOlvide?: () => void
}) {
  const router = useRouter()
  const crear = modo === 'crear'

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendienteConfirmar, setPendienteConfirmar] = useState(false)

  /** Enlaza con la clínica, si trae por dónde. Un código malo no debe tirar
   *  abajo un registro que por lo demás fue bien: se avisa y se sigue. */
  const enlazarConClinica = async (): Promise<string | null> => {
    const c = codigo.trim().toUpperCase()
    if (c) {
      const { data } = await supabase.rpc('mi_vincular_codigo', { p_codigo: c })
      if (!data?.ok) {
        return data?.motivo === 'ya_reclamado'
          ? 'Ese código ya lo ha usado otra cuenta. Pídele uno nuevo a tu clínica.'
          : 'El código no es válido o ha caducado. Pídele uno nuevo a tu clínica.'
      }
      return null
    }
    if (token) {
      await supabase.rpc('paciente_vincular', { p_token: token })
    }
    return null
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const correo = email.trim().toLowerCase()
    if (!correo || clave.length < (crear ? MIN_CLAVE : 1)) return
    if (crear && !nombre.trim()) return

    setEnviando(true)
    setError(null)

    if (crear) {
      const { data, error: err } = await supabase.auth.signUp({ email: correo, password: clave })
      if (err) {
        setError(
          err.message.toLowerCase().includes('already')
            ? 'Ya existe una cuenta con ese correo. Entra con tu contraseña.'
            : 'No hemos podido crear la cuenta. Revisa el correo e inténtalo de nuevo.',
        )
        setEnviando(false)
        return
      }
      // Sin sesión = la confirmación por correo sigue activada en Supabase.
      if (!data.session) {
        setPendienteConfirmar(true)
        setEnviando(false)
        return
      }
      await supabase.rpc('mi_cuenta_crear', { p_nombre: nombre.trim().slice(0, 80) })
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
      if (err) {
        setError('Correo o contraseña incorrectos.')
        setEnviando(false)
        return
      }
      await supabase.rpc('mi_cuenta_crear', { p_nombre: null })
    }

    const avisoCodigo = await enlazarConClinica()
    marcarRolPaciente()
    // refresh() antes de navegar: las pantallas de /mi son de servidor y
    // tienen que volver a pedir los datos ya con la sesión puesta.
    router.refresh()
    router.push(avisoCodigo ? '/mi/perfil' : '/mi')
    if (avisoCodigo) setError(avisoCodigo)
    setEnviando(false)
  }

  if (pendienteConfirmar) {
    return (
      <div className="mi-entrar-ok">
        <p className="mi-entrar-t">Falta confirmar tu correo</p>
        <p className="mi-nota">
          Tu cuenta se ha creado, pero este sitio tiene activada la confirmación
          por correo, así que hay que abrir el enlace que acabamos de enviarte a{' '}
          <strong>{email.trim().toLowerCase()}</strong>.
        </p>
        <p className="mi-nota mi-nota-suave">
          Si estás probando la app y el correo no llega, díselo a tu clínica: es
          un ajuste del servidor, no un fallo tuyo.
        </p>
      </div>
    )
  }

  const claveCorta = crear && clave.length > 0 && clave.length < MIN_CLAVE
  const faltan = !email.trim() || !clave || (crear && (!nombre.trim() || claveCorta))

  return (
    <form onSubmit={enviar} className="mi-entrar-form">
      {crear && (
        <div className="ap-form-campo">
          <label htmlFor="ac-nombre" className="mi-entrar-label">Tu nombre</label>
          <input
            id="ac-nombre" className="mi-input" type="text" autoComplete="given-name"
            required maxLength={80} placeholder="¿Cómo te llamamos?"
            value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={enviando}
          />
        </div>
      )}

      <div className="ap-form-campo">
        <label htmlFor="ac-email" className="mi-entrar-label">Tu correo electrónico</label>
        <input
          id="ac-email" className="mi-input" type="email" inputMode="email"
          autoComplete="email" required placeholder="tu@correo.com"
          value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando}
        />
      </div>

      <div className="ap-form-campo">
        <label htmlFor="ac-clave" className="mi-entrar-label">Contraseña</label>
        <input
          id="ac-clave" className="mi-input" type={verClave ? 'text' : 'password'}
          autoComplete={crear ? 'new-password' : 'current-password'} required
          placeholder={crear ? `Al menos ${MIN_CLAVE} caracteres` : 'Tu contraseña'}
          value={clave} onChange={(e) => setClave(e.target.value)} disabled={enviando}
        />
        <button type="button" className="mi-link" style={{ alignSelf: 'flex-start', marginTop: 8 }}
          onClick={() => setVerClave((v) => !v)}>
          {verClave ? 'Ocultar contraseña' : 'Ver contraseña'}
        </button>
        {claveCorta && (
          <p className="ap-barra-txt">La contraseña necesita al menos {MIN_CLAVE} caracteres.</p>
        )}
      </div>

      {crear && !token && (
        <div className="ap-form-campo">
          <label htmlFor="ac-codigo" className="mi-entrar-label">
            Código de tu clínica <span style={{ textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
          </label>
          <input
            id="ac-codigo" className="mi-input" type="text" inputMode="text"
            autoCapitalize="characters" maxLength={6} placeholder="Ej.: K7M2QX"
            style={{ textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 600 }}
            value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} disabled={enviando}
          />
          <p className="ap-barra-txt">
            Si tu fisioterapeuta te ha dado un código, ponlo aquí y tendrás tu plan
            y tus sesiones desde el primer día, sin pagar nada.
          </p>
        </div>
      )}

      {token && (
        <p className="mi-nota mi-nota-suave" style={{ marginTop: 8 }}>
          Al crear la cuenta quedará enlazada con el plan que te mandó tu clínica.
        </p>
      )}

      <button type="submit" className="mi-btn" disabled={enviando || faltan}>
        {enviando ? 'Un momento…' : crear ? 'Crear mi cuenta' : 'Entrar'}
      </button>

      {!crear && onOlvide && (
        <p style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" className="mi-link" onClick={onOlvide}>
            He olvidado mi contraseña
          </button>
        </p>
      )}

      {error && <p className="mi-error" role="alert">{error}</p>}
    </form>
  )
}
