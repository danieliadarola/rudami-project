'use client'

// components/paciente/Objetivo.tsx
// Selector del objetivo semanal (días con ejercicio). Es la única pieza con
// estado del perfil. Premium y clínica lo cambian; Free lo ve fijado en 3
// con la invitación a Premium.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export function Objetivo({ actual, premium }: { actual: number; premium: boolean }) {
  const router = useRouter()
  const [valor, setValor] = useState(actual)
  const [ocupado, setOcupado] = useState(false)

  const cambiar = async (n: number) => {
    if (!premium || ocupado || n === valor) return
    const antes = valor
    setValor(n)
    setOcupado(true)
    const { data, error } = await supabase.rpc('mi_objetivo', { p_dias: n })
    setOcupado(false)
    if (error || !data?.ok) { setValor(antes); return }
    router.refresh()
  }

  return (
    <>
      <div className="ap-objetivo" role="radiogroup" aria-label="Días por semana">
        {[2, 3, 4, 5, 7].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            className={valor === n ? 'on' : ''}
            disabled={!premium || ocupado}
            onClick={() => cambiar(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {!premium && (
        <p className="ap-barra-txt">Objetivos personalizados con <Link href="/mi/plan" className="mi-link">Premium</Link>.</p>
      )}
    </>
  )
}
