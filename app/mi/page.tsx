// app/mi/page.tsx
// Inicio de la app del paciente.
//
// Server Component a propósito: los datos se resuelven en el servidor y
// llegan ya pintados. La interactividad (marcar, check-in, sesión guiada)
// vive en <PortadaPaciente/>, que sí es de cliente.
//
// Dos públicos, una portada:
//   · Paciente de clínica  → plan del fisio (mi_plan) + próxima cita + biblioteca.
//   · Usuario independiente → solo biblioteca (mi_rutinas); sin cita ni check-in.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { AvisoPaciente, PlanPaciente, ProgramaDetalle, ResumenPaciente, TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { PortadaPaciente } from '@/components/paciente/PortadaPaciente'

export const revalidate = 0

export default async function Inicio() {
  const { supabase, cuenta } = await cargarCuenta()
  const esClinica = cuenta.tipo === 'clinica'

  const [{ data: plan }, { data: rutinas }, { data: resumen }, { data: avisos }] = await Promise.all([
    esClinica ? supabase.rpc('mi_plan') : Promise.resolve({ data: null }),
    supabase.rpc('mi_rutinas'),
    esClinica ? supabase.rpc('mi_resumen') : Promise.resolve({ data: null }),
    esClinica ? supabase.rpc('mi_avisos') : Promise.resolve({ data: null }),
  ])

  const programas = ((rutinas as TarjetaPrograma[] | null) ?? []).filter((p) => p.activo)

  // El bloque "hoy" necesita ejercicios. Si no hay plan del fisio, se tira del
  // primer programa activo; solo entonces se pide su detalle.
  let programaHoy: ProgramaDetalle | null = null
  if (!plan && programas[0]) {
    const { data } = await supabase.rpc('mi_programa', { p_id: programas[0].id })
    programaHoy = (data as ProgramaDetalle | null) ?? null
  }

  return (
    <PortadaPaciente
      cuenta={cuenta}
      plan={(plan as PlanPaciente | null) ?? null}
      programas={programas}
      programaHoy={programaHoy}
      proximaCita={(resumen as ResumenPaciente | null)?.proxima_cita ?? null}
      avisos={((avisos as AvisoPaciente[] | null) ?? []).filter((a) => !a.leido)}
    />
  )
}
