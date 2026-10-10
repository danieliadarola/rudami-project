'use client'

// components/pacientes/AccesoApp.tsx
// Dar acceso a la app a un paciente, desde su ficha.
//
// El fisio pulsa un botón, sale un código de seis letras y se lo dicta o se
// lo manda por WhatsApp. El paciente lo escribe al crear su cuenta y queda
// enlazado con esta ficha, con premium incluido porque lo paga la clínica.
//
// Sustituye en la práctica al enlace largo de la guía para este fin: aquel
// sigue sirviendo para ver el plan sin cuenta, pero no se puede dictar.
//
// El código se crea con la RPC invitacion_crear, que comprueba que la ficha
// es de esta clínica. Leer y anular van por RLS, porque aquí quien mira es
// la clínica y la tabla tiene sus policies.

import { useCallback, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { normalizarTelefono, whatsappLink } from '@/app/lib/whatsapp'
import { DI } from '@/components/ui/DashboardIcons'

interface Invitacion { codigo: string; caduca_at: string; usado_at: string | null }

export function AccesoApp({
  pacienteId,
  nombre,
  telefono,
  yaTieneCuenta,
}: {
  pacienteId: string
  nombre: string | null
  telefono: string | null
  yaTieneCuenta: boolean
}) {
  const [inv, setInv] = useState<Invitacion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(async () => {
    if (yaTieneCuenta) return
    const { data } = await supabase
      .from('invitaciones')
      .select('codigo, caduca_at, usado_at')
      .eq('paciente_id', pacienteId)
      .is('usado_at', null)
      .gt('caduca_at', new Date().toISOString())
      .maybeSingle()
    setInv((data as Invitacion | null) ?? null)
  }, [pacienteId, yaTieneCuenta])

  // Carga inicial desde un ref callback, no desde un efecto: con reactCompiler
  // un setState alcanzado desde useEffect es error de lint. Mismo patrón que
  // SolicitudesCitas y AvisosPaciente.
  const raiz = useCallback((el: HTMLDivElement | null) => { if (el) cargar() }, [cargar])

  const generar = async () => {
    setOcupado(true); setError(null)
    try {
      const { data, error: err } = await supabase.rpc('invitacion_crear', { p_paciente: pacienteId })
      if (err || !data?.ok) {
        setError(
          data?.motivo === 'ya_tiene_cuenta'
            ? 'Este paciente ya tiene cuenta en la app.'
            : 'No se ha podido generar el código.',
        )
        return
      }
      setInv({ codigo: data.codigo, caduca_at: data.caduca_at, usado_at: null })
    } finally {
      setOcupado(false)
    }
  }

  const anular = async () => {
    if (!inv) return
    await supabase.from('invitaciones').delete().eq('codigo', inv.codigo)
    setInv(null)
  }

  const copiar = async () => {
    if (!inv) return
    try {
      await navigator.clipboard.writeText(inv.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch { /* sin portapapeles: el código está a la vista para dictarlo */ }
  }

  const tel = normalizarTelefono(telefono)
  const url = typeof window !== 'undefined' ? window.location.origin : ''
  const mensaje = inv
    ? `Hola ${nombre ?? ''}, ya puedes usar la app de la clínica para seguir tus ejercicios. `
      + `Entra en ${url}/mi, crea tu cuenta y pon este código: ${inv.codigo}`
    : ''

  return (
    <div ref={raiz}>
      <div className="sect-head">
        <span className="sect-title">Acceso a la app</span>
        {yaTieneCuenta && <span className="sect-sub">activo</span>}
      </div>

      <div className="pac-card" style={{ padding: 16 }}>
        {yaTieneCuenta ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Ya tiene cuenta y ve su plan, sus sesiones y su progreso desde el móvil.
          </p>
        ) : inv ? (
          <>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>
              Dile que entre en la app, cree su cuenta y escriba este código:
            </p>
            <div style={{
              fontSize: 27, fontWeight: 700, letterSpacing: '.22em', textAlign: 'center',
              color: 'var(--ink)', background: 'var(--paper-2)', borderRadius: 10,
              padding: '14px 8px', fontVariantNumeric: 'tabular-nums',
            }}>
              {inv.codigo}
            </div>
            <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
              Vale una sola vez y caduca el{' '}
              {new Date(inv.caduca_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn-line" onClick={copiar} style={{ minHeight: 32, fontSize: 12.5 }}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
              {tel && (
                <a className="btn-ink" href={whatsappLink(tel, mensaje)} target="_blank" rel="noopener noreferrer"
                  style={{ minHeight: 32, fontSize: 12.5, padding: '0 12px' }}>
                  Enviar por WhatsApp
                </a>
              )}
              <button type="button" className="btn-ghost" onClick={anular} style={{ fontSize: 12 }}>
                Anular
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 12 }}>
              Genera un código para que pueda entrar en la app y ver su plan, sus
              sesiones y su progreso. Para él es gratis.
            </p>
            <button type="button" className="btn-ink" onClick={generar} disabled={ocupado}
              style={{ width: '100%', justifyContent: 'center' }}>
              <DI name="plus" size={15} strokeWidth={2.2} /> {ocupado ? 'Generando…' : 'Generar código'}
            </button>
          </>
        )}

        {error && <p className="alert-err" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  )
}
