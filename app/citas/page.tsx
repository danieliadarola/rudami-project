import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import BotonEliminarCita from '@/app/components/BotonEliminarCita'

export const revalidate = 0

export default async function Citas() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: citas } = await supabase
    .from('citas')
    .select(`
      *,
      pacientes (
        nombre,
        apellidos,
        telefono
      )
    `)
    .order('fecha_hora', { ascending: true })

  const ahora = new Date()

  const citasPendientes = citas?.filter(c =>
    new Date(c.fecha_hora) >= ahora && c.estado !== 'cancelada'
  ) || []

  const citasPasadas = citas?.filter(c =>
    new Date(c.fecha_hora) < ahora || c.estado === 'cancelada'
  ) || []

  const formatFecha = (fechaHora: string) => {
    const fecha = new Date(fechaHora)
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatHora = (fechaHora: string) => {
    const fecha = new Date(fechaHora)
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
            ← Volver al panel
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RuDaMi Project</h1>
            <p className="text-gray-500 mt-1">Gestión de citas</p>
          </div>
          <Link
            href="/citas/nueva"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Nueva cita
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Próximas citas
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({citasPendientes.length})
            </span>
          </h2>

          {citasPendientes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              No hay citas programadas. Crea la primera.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {citasPendientes.map((cita) => (
                <div key={cita.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center min-w-16">
                      <p className="text-xs text-blue-400 capitalize">
                        {formatFecha(cita.fecha_hora).split(',')[0]}
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatHora(cita.fecha_hora)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {cita.pacientes?.nombre} {cita.pacientes?.apellidos}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatFecha(cita.fecha_hora)} · {cita.duracion_min} min
                      </p>
                      {cita.notas && (
                        <p className="text-xs text-gray-400 mt-0.5">{cita.notas}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pacientes/${cita.paciente_id}`}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Ver ficha →
                    </Link>
                    <BotonEliminarCita id={cita.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {citasPasadas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Citas anteriores
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({citasPasadas.length})
              </span>
            </h2>
            <div className="divide-y divide-gray-100">
              {citasPasadas.map((cita) => (
                <div key={cita.id} className="py-4 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center min-w-16">
                      <p className="text-xs text-gray-400 capitalize">
                        {formatFecha(cita.fecha_hora).split(',')[0]}
                      </p>
                      <p className="text-lg font-bold text-gray-500">
                        {formatHora(cita.fecha_hora)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {cita.pacientes?.nombre} {cita.pacientes?.apellidos}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatFecha(cita.fecha_hora)} · {cita.duracion_min} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      {cita.estado}
                    </span>
                    <BotonEliminarCita id={cita.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}