// app/mi/plan/page.tsx
// "Tu plan": Free · Premium · Clinic. La pantalla del modelo de negocio
// (16/09/2026): Free para empezar, Premium a 4,99 €/mes, y para el paciente
// de clínica Premium incluido porque su clínica paga RuDaMi.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import { Planes } from '@/components/paciente/Planes'

export const revalidate = 0

export default async function PaginaPlan() {
  const { cuenta } = await cargarCuenta()
  return <Planes cuenta={cuenta} />
}
