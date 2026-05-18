import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import BotonEliminarPaciente from '@/app/components/BotonEliminarPaciente'
import SesionCard from '@/app/components/SesionCard'

export const revalidate = 0

export default async function FichaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  const { data: sesiones } = await supabase
    .from('sesiones')
    .select('*')
    .eq('paciente_id', id)
    .order('created_at', { ascending: false })

  if (!paciente) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-500">Paciente no encontrado.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
            ← Volver al panel
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {paciente.nombre} {paciente.apellidos}
              </h1>
              <p className="text-gray-500 mt-1">{paciente.motivo_consulta}</p>
            </div>
            <div className="flex gap-2">
              <BotonEliminarPaciente id={id} />
              <Link
                href={`/pacientes/${id}/editar`}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Editar
              </Link>
              <Link
                href={`/pacientes/${id}/sesion/nueva`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + Nueva sesión
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Fecha de nacimiento</p>
              <p className="text-sm text-gray-900 mt-1">{paciente.fecha_nacimiento ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Género</p>
              <p className="text-sm text-gray-900 mt-1 capitalize">{paciente.genero ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Ocupación</p>
              <p className="text-sm text-gray-900 mt-1">{paciente.ocupacion ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p>
              <p className="text-sm text-gray-900 mt-1">{paciente.telefono ?? '—'}</p>
            </div>
          </div>

          {paciente.antecedentes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Antecedentes relevantes</p>
              <p className="text-sm text-gray-700">{paciente.antecedentes}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Historial de sesiones
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({sesiones?.length ?? 0})
              </span>
            </h2>
          </div>

          {!sesiones || sesiones.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-400 text-sm text-center py-4">
                No hay sesiones registradas. Crea la primera.
              </p>
            </div>
          ) : (
            sesiones.map((sesion) => (
              <SesionCard key={sesion.id} sesion={sesion} paciente={paciente} />
            ))
          )}
        </div>

      </div>
    </main>
  )
}