// app/mi/sesiones/page.tsx
// Pestaña "Sesiones": calendario mensual con las citas de la clínica y los
// días con ejercicio. El paciente puede SOLICITAR un cambio o una cancelación;
// la clínica decide desde su agenda (decisión de fase 4).
//
// Al usuario sin clínica el calendario le enseña sus días de ejercicio: no
// tiene citas, pero sí constancia.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { CitasPaciente } from '@/app/lib/paciente/tipos'
import { Calendario } from '@/components/paciente/Calendario'

export const revalidate = 0

export default async function PaginaSesiones() {
  const { supabase, cuenta } = await cargarCuenta()

  const [{ data: citas }, { data: dias }] = await Promise.all([
    cuenta.tipo === 'clinica' ? supabase.rpc('mi_citas') : Promise.resolve({ data: null }),
    supabase.rpc('mi_dias_ejercicio'),
  ])

  const c = (citas as CitasPaciente | null) ?? null

  return (
    <Calendario
      hoy={c?.hoy ?? cuenta.hoy}
      citas={c?.citas ?? []}
      diasEjercicio={(dias as { fecha: string; hechos: number }[] | null) ?? []}
      esClinica={cuenta.tipo === 'clinica'}
      clinica={cuenta.clinica}
    />
  )
}
