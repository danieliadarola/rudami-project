import Link from 'next/link'
import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import MenuPaciente from '@/app/components/MenuPaciente'

export const revalidate = 0

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { count: totalPacientes } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false })

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString()

  const { data: citasHoy } = await supabase
    .from('citas')
    .select(`
      *,
      pacientes (
        nombre,
        apellidos
      )
    `)
    .gte('fecha_hora', inicioHoy)
    .lte('fecha_hora', finHoy)
    .neq('estado', 'cancelada')
    .order('fecha_hora', { ascending: true })

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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RuDaMi Project</h1>
            <p className="text-gray-500 mt-1">Panel de gestión clínica</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/citas"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              📅 Citas
            </Link>
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-500 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Total pacientes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalPacientes ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Sesiones este mes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">Citas hoy</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{citasHoy?.length ?? 0}</p>
          </div>
        </div>

        {citasHoy && citasHoy.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Citas de hoy
              <span className="ml-2 text-sm font-normal text-gray-400">
                {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </h2>
            <div className="divide-y divide-gray-100">
              {citasHoy.map((cita) => (
                <div key={cita.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-center min-w-14">
                      <p className="text-lg font-bold text-blue-600">
                        {formatHora(cita.fecha_hora)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {cita.pacientes?.nombre} {cita.pacientes?.apellidos}
                      </p>
                      <p className="text-sm text-gray-500">{cita.duracion_min} min</p>
                    </div>
                  </div>
                  <Link
                    href={`/pacientes/${cita.paciente_id}`}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Ver ficha →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Pacientes</h2>
            <Link
              href="/pacientes/nuevo"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Nuevo paciente
            </Link>
          </div>

          {!pacientes || pacientes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              Aún no hay pacientes registrados. Crea el primero.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pacientes.map((paciente) => (
                <div key={paciente.id} className="flex items-center justify-between py-4 px-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <Link
                    href={`/pacientes/${paciente.id}`}
                    className="flex-1"
                  >
                    <p className="font-medium text-gray-900">
                      {paciente.nombre} {paciente.apellidos}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {paciente.motivo_consulta}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-400">{paciente.telefono}</p>
                    <MenuPaciente id={paciente.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}