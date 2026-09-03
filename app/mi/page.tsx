// app/mi/page.tsx
// Portada de la app del paciente.
//
// Server Component a propósito: los datos clínicos se resuelven en el servidor
// y llegan ya pintados, sin que el móvil tenga que esperar a un fetch después
// de hidratar. La interactividad (marcar, check-in, sesión guiada) vive en
// <PortadaPaciente/>, que sí es de cliente.

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import type { ResumenPaciente, PlanPaciente } from '@/app/lib/paciente/tipos'
import { PortadaPaciente } from '@/components/paciente/PortadaPaciente'

export const revalidate = 0

export default async function Portada() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mi/entrar')

  // Ninguna de las dos recibe un id: resuelven la identidad por dentro con
  // paciente_actual(). No hay nada que un cliente pueda manipular.
  const [{ data: resumen }, { data: plan }] = await Promise.all([
    supabase.rpc('mi_resumen'),
    supabase.rpc('mi_plan'),
  ])

  const r = resumen as ResumenPaciente | null

  // Sesión válida pero sin ficha vinculada: le pasa a quien tiene cuenta en
  // RuDaMi por otro motivo (un fisio, por ejemplo) o a quien aún no ha
  // completado la vinculación desde su enlace.
  if (!r) {
    return (
      <main className="mi-vacio">
        <p className="mi-wordmark">RUDAMI</p>
        <h1>Esta cuenta todavía no está asociada a ninguna ficha</h1>
        <p className="mi-nota">
          Abre el enlace que te envió tu clínica y pulsa «Guarda tu progreso»
          para vincular tu cuenta.
        </p>
        <p className="mi-nota">
          <a className="mi-salir" href="/api/logout?next=%2Fmi%2Fentrar">Cerrar sesión</a>
        </p>
      </main>
    )
  }

  return <PortadaPaciente resumen={r} plan={(plan as PlanPaciente | null) ?? null} />
}
