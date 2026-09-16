// app/mi/rutinas/[id]/page.tsx
// Detalle de una rutina. `id` puede ser:
//   · 'plan'  → el plan publicado por el fisio (mi_plan), solo pacientes de clínica.
//   · un uuid → un programa de la biblioteca (mi_programa).
// Las dos fuentes se reducen aquí a la misma forma y el componente de cliente
// no distingue de dónde vienen los ejercicios, salvo para saber a qué RPC marcar.

import { notFound } from 'next/navigation'
import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { PlanPaciente, ProgramaDetalle as Detalle, TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { miniaturaEjercicio } from '@/app/lib/paciente/formato'
import { ProgramaDetalle } from '@/components/paciente/ProgramaDetalle'

export const revalidate = 0

export default async function PaginaPrograma({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, cuenta }] = await Promise.all([params, cargarCuenta()])
  const premium = esPremium(cuenta)

  if (id === 'plan') {
    if (cuenta.tipo !== 'clinica') notFound()
    const { data } = await supabase.rpc('mi_plan')
    const p = data as PlanPaciente | null
    if (!p) notFound()

    const virtual: TarjetaPrograma = {
      id: 'plan', slug: 'plan', titulo: 'Plan de tu fisioterapeuta',
      descripcion: p.informe.resumen, zona: null, nivel: null, semanas: 0,
      frecuencia: p.ejercicios[0]?.frecuencia ?? null, premium: false,
      imagen_url: p.ejercicios[0] ? miniaturaEjercicio(p.ejercicios[0]) : null,
      n_ejercicios: p.ejercicios.length, inscrito: true, activo: true,
      iniciado_en: p.informe.fecha, semana_actual: null, hechos_hoy: 0,
    }
    const detalle: Detalle = { programa: virtual, ejercicios: p.ejercicios, checks: p.checks, hoy: p.hoy }
    return (
      <ProgramaDetalle
        detalle={detalle}
        fuente="plan"
        premium={premium}
        fisio={p.fisio?.nombre ?? null}
        faq={p.informe.faq?.ejercicios ?? []}
      />
    )
  }

  // Un uuid mal formado no debe llegar a Postgres como error 22P02.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data } = await supabase.rpc('mi_programa', { p_id: id })
  const d = data as Detalle | null
  if (!d) notFound()

  return <ProgramaDetalle detalle={d} fuente="programa" premium={premium} fisio={null} faq={[]} />
}
