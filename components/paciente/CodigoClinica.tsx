'use client'

// components/paciente/CodigoClinica.tsx
// Canjear el código de la clínica desde dentro de la app.
//
// POR QUÉ HACE FALTA ADEMÁS DEL CAMPO DEL REGISTRO
// El orden real de las cosas no siempre es el del formulario: hay quien se
// baja la app por su cuenta, la usa como gratuito, y semanas después empieza
// a tratarse en una clínica. Sin esto tendría que borrarse la cuenta y
// volver a registrarse, perdiendo su historial.
//
// Al canjear, la cuenta pasa a ser de clínica y el premium entra solo: lo
// decide mi_cuenta() a partir de la ficha, no un campo que haya que tocar.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { IcoClinica } from './Iconos'

export function CodigoClinica() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canjear = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    if (!c || ocupado) return
    setOcupado(true); setError(null)
    try {
      const { data, error: err } = await supabase.rpc('mi_vincular_codigo', { p_codigo: c })
      if (err || !data?.ok) {
        setError(
          data?.motivo === 'ya_reclamado'
            ? 'Ese código ya lo ha usado otra cuenta. Pídele uno nuevo a tu clínica.'
            : 'El código no es válido o ha caducado. Pídele uno nuevo a tu clínica.',
        )
        return
      }
      router.refresh()
    } finally {
      setOcupado(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" className="ap-menu-item" onClick={() => setAbierto(true)}>
        <IcoClinica size={20} />
        <span>
          Tengo un código de mi clínica
          <span className="sub">Enlaza tu cuenta con tu fisioterapeuta</span>
        </span>
      </button>
    )
  }

  return (
    <form onSubmit={canjear} style={{ padding: '14px 16px' }}>
      <label htmlFor="cod-clinica" className="mi-entrar-label">Código de tu clínica</label>
      <input
        id="cod-clinica"
        className="mi-input"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        maxLength={6}
        autoFocus
        placeholder="Ej.: K7M2QX"
        style={{ textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 600, marginTop: 8 }}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        disabled={ocupado}
      />
      <p className="ap-barra-txt">
        Son seis letras y números que te da tu fisioterapeuta. Al ponerlo verás tu
        plan y tus sesiones, y el premium queda incluido.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="submit" className="ap-btn pequeno" disabled={ocupado || codigo.trim().length < 6}>
          {ocupado ? 'Comprobando…' : 'Enlazar'}
        </button>
        <button type="button" className="ap-btn-linea pequeno" onClick={() => { setAbierto(false); setError(null) }}>
          Cancelar
        </button>
      </div>
      {error && <p className="mi-error" role="alert">{error}</p>}
    </form>
  )
}
