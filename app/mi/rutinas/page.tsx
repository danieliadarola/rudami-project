// app/mi/rutinas/page.tsx
// Pestaña "Rutinas": mis rutinas (el plan del fisio + los programas en los que
// estoy) y la biblioteca completa. Server Component; las pestañas son de cliente.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { PlanPaciente, TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { miniaturaEjercicio } from '@/app/lib/paciente/formato'
import { Rutinas } from '@/components/paciente/Rutinas'
import type { RutinaResumen } from '@/components/paciente/TarjetaRutina'

export const revalidate = 0

export default async function PaginaRutinas({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>
}) {
  const [{ ver }, { supabase, cuenta }] = await Promise.all([searchParams, cargarCuenta()])

  const [{ data: mias }, { data: todas }, { data: plan }] = await Promise.all([
    supabase.rpc('mi_rutinas'),
    supabase.rpc('mi_biblioteca'),
    cuenta.tipo === 'clinica' ? supabase.rpc('mi_plan') : Promise.resolve({ data: null }),
  ])

  const p = plan as PlanPaciente | null
  const planFisio: RutinaResumen | null = p
    ? {
        href: '/mi/rutinas/plan',
        titulo: 'Plan de tu fisioterapeuta',
        sub: `${p.ejercicios.length} ejercicios${p.fisio?.nombre ? ` · ${p.fisio.nombre}` : ''}`,
        imagen: p.ejercicios[0] ? miniaturaEjercicio(p.ejercicios[0]) : null,
        hechos: p.ejercicios.filter((e) => p.checks.some((c) => c.ejercicio_id === e.id && c.fecha === p.hoy)).length,
        total: p.ejercicios.length,
        etiqueta: 'fisio',
      }
    : null

  return (
    <Rutinas
      planFisio={planFisio}
      mias={(mias as TarjetaPrograma[] | null) ?? []}
      biblioteca={(todas as TarjetaPrograma[] | null) ?? []}
      premium={esPremium(cuenta)}
      inicial={ver === 'biblioteca' ? 'biblioteca' : 'mias'}
    />
  )
}
