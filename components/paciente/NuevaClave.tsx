'use client'

// components/paciente/NuevaClave.tsx
// Donde aterriza el enlace de "olvidé mi contraseña" para poner una nueva.
//
// CÓMO LLEGA AQUÍ UNA SESIÓN SIN HABER ENTRADO
// El enlace del correo pasa por Supabase, que redirige aquí con un `code`.
// Ese código se canjea por una sesión temporal, y con ella ya se puede cambiar
// la contraseña. Por eso /mi/clave está en las rutas públicas de proxy.ts: a
// quien viene a recuperar su acceso no se le puede exigir que lo tenga.
//
// POR QUÉ SE MIRA PRIMERO SI YA HAY SESIÓN
// El cliente de navegador de Supabase trae `detectSessionInUrl` activado y
// puede haber canjeado el código él solo antes de que corra esto. Si se vuelve
// a canjear, falla por "code verifier" ya gastado y la pantalla diría que el
// enlace no vale cuando sí valía.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const MIN_CLAVE = 8

export function NuevaClave() {
  const router = useRouter()
  const [fase, setFase] = useState<'comprobando' | 'listo' | 'invalido' | 'guardado'>('comprobando')
  const [clave, setClave] = useState('')
  const [repite, setRepite] = useState('')
  const [ver, setVer] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preparar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) { setFase('listo'); return }

    // En un callback no hace falta useSearchParams, que ademas obligaria a
    // envolver la pagina en Suspense.
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { setFase('invalido'); return }

    const { error: err } = await supabase.auth.exchangeCodeForSession(code)
    setFase(err ? 'invalido' : 'listo')
  }, [])

  // Desde un ref callback y no desde un efecto: con reactCompiler un setState
  // alcanzado desde useEffect es error de lint.
  const raiz = useCallback((el: HTMLElement | null) => { if (el) preparar() }, [preparar])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (guardando) return
    if (clave.length < MIN_CLAVE) { setError(`La contraseña necesita al menos ${MIN_CLAVE} caracteres.`); return }
    if (clave !== repite) { setError('Las dos contraseñas no coinciden.'); return }

    setGuardando(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password: clave })
    setGuardando(false)

    if (err) {
      setError('No hemos podido guardar la contraseña. Prueba con otra o pide un enlace nuevo.')
      return
    }
    setFase('guardado')
    router.refresh()
  }

  return (
    <main className="mi-vacio" ref={raiz}>
      <p className="mi-wordmark">RUDAMI</p>

      {fase === 'comprobando' && (
        <>
          <h1>Un momento</h1>
          <p className="mi-nota">Estamos comprobando tu enlace.</p>
        </>
      )}

      {fase === 'invalido' && (
        <>
          <h1>Este enlace ya no vale</h1>
          <p className="mi-nota">
            Los enlaces para cambiar la contraseña caducan y solo sirven una vez.
            Pide uno nuevo desde la pantalla de acceso.
          </p>
          <p className="mi-nota mi-nota-suave">
            Si eres paciente de una clínica y el correo no te llega, avísales:
            ellos pueden devolverte el acceso.
          </p>
          <p className="mi-nota">
            <a className="mi-link" href="/mi/entrar">Volver a la pantalla de acceso</a>
          </p>
        </>
      )}

      {fase === 'guardado' && (
        <>
          <h1>Contraseña cambiada</h1>
          <p className="mi-nota">Ya puedes entrar con la nueva. No la pierdas de vista.</p>
          <button type="button" className="mi-btn" onClick={() => router.push('/mi')}>
            Ir a mi recuperación
          </button>
        </>
      )}

      {fase === 'listo' && (
        <>
          <h1>Elige una contraseña nueva</h1>
          <p className="mi-nota">Al menos {MIN_CLAVE} caracteres. Apúntala donde no se te pierda.</p>

          <form onSubmit={guardar} className="mi-entrar-form">
            <div className="ap-form-campo" style={{ marginTop: 0 }}>
              <label htmlFor="nc-clave" className="mi-entrar-label">Contraseña nueva</label>
              <input
                id="nc-clave" className="mi-input" type={ver ? 'text' : 'password'}
                autoComplete="new-password" required
                placeholder={`Al menos ${MIN_CLAVE} caracteres`}
                value={clave} onChange={(e) => setClave(e.target.value)} disabled={guardando}
              />
            </div>

            <div className="ap-form-campo">
              <label htmlFor="nc-repite" className="mi-entrar-label">Repítela</label>
              <input
                id="nc-repite" className="mi-input" type={ver ? 'text' : 'password'}
                autoComplete="new-password" required placeholder="La misma otra vez"
                value={repite} onChange={(e) => setRepite(e.target.value)} disabled={guardando}
              />
              <button type="button" className="mi-link" style={{ alignSelf: 'flex-start', marginTop: 8 }}
                onClick={() => setVer((v) => !v)}>
                {ver ? 'Ocultar contraseñas' : 'Ver contraseñas'}
              </button>
            </div>

            <button type="submit" className="mi-btn" disabled={guardando || !clave || !repite}>
              {guardando ? 'Guardando…' : 'Guardar contraseña'}
            </button>

            {error && <p className="mi-error" role="alert">{error}</p>}
          </form>
        </>
      )}
    </main>
  )
}
