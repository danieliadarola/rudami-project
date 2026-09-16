// app/mi/ejercicio/[id]/page.tsx
// Detalle de un ejercicio (boceto "Gato - Vaca"): media, dosis, cómo hacerlo,
// consejo y "marcar como completado".
//   ?de=plan     → ejercicio del informe del fisio (mi_ejercicio_plan)
//   ?de=programa → ejercicio de un programa de la biblioteca (mi_ejercicio)

import { notFound } from 'next/navigation'
import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { EjercicioDetalle as Detalle } from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { EjercicioDetalle } from '@/components/paciente/EjercicioDetalle'

export const revalidate = 0

export default async function PaginaEjercicio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string }>
}) {
  const [{ id }, { de }, { supabase, cuenta }] = await Promise.all([params, searchParams, cargarCuenta()])
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const fuente: 'plan' | 'programa' = de === 'plan' ? 'plan' : 'programa'
  const { data } = fuente === 'plan'
    ? await supabase.rpc('mi_ejercicio_plan', { p_id: id })
    : await supabase.rpc('mi_ejercicio', { p_pe_id: id })

  const d = data as Detalle | null
  if (!d?.ejercicio) notFound()

  return <EjercicioDetalle detalle={d} fuente={fuente} premium={esPremium(cuenta)} />
}
