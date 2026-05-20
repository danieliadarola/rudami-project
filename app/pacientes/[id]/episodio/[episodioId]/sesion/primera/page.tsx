'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function SeleccionModo({ params }: { params: Promise<{ id: string, episodioId: string }> }) {
  const { id, episodioId } = use(params)
  const router = useRouter()
  const [esPrimera, setEsPrimera] = useState<boolean | null>(null)
  const [paciente, setPaciente] = useState<any>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('nombre, apellidos')
        .eq('id', id)
        .single()
      setPaciente(pacienteData)

      const { count } = await supabase
        .from('sesiones')
        .select('*', { count: 'exact', head: true })
        .eq('episodio_id', episodioId)

      setEsPrimera(count === 0)
    }
    cargar()
  }, [id, episodioId])

  if (esPrimera === null) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        <div className="mb-2 text-center">
          <p className="text-sm text-gray-400">
            {paciente ? `${paciente.nombre} ${paciente.apellidos}` : ''}
          </p>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {esPrimera ? '¿Cómo quieres registrar esta primera sesión?' : '¿Qué tipo de valoración necesitas?'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {esPrimera
              ? 'Elige según la complejidad del caso'
              : 'Elige según la situación clínica actual'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <button
            onClick={() => router.push(`/pacientes/${id}/episodio/${episodioId}/sesion/completa`)}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Valoración completa</h2>
            <p className="text-sm text-gray-500 mb-4">
              {esPrimera
                ? 'Para casos complejos o cuando necesitas un razonamiento clínico exhaustivo'
                : 'Para reevaluar el caso en profundidad o cuando hay cambios significativos'}
            </p>
            <ul className="space-y-1">
              <li className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                Anamnesis estructurada completa
              </li>
              <li className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                Análisis de tejidos y mecanismo lesional
              </li>
              <li className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                Banderas rojas, amarillas y azules
              </li>
              <li className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                Informe clínico completo con plan por fases
              </li>
            </ul>
          </button>

          <button
            onClick={() => router.push(
              esPrimera
                ? `/pacientes/${id}/episodio/${episodioId}/sesion/rapida`
                : `/pacientes/${id}/episodio/${episodioId}/sesion/seguimiento`
            )}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:border-teal-400 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Valoración rápida</h2>
            <p className="text-sm text-gray-500 mb-4">
              {esPrimera
                ? 'Para casos sencillos o patologías conocidas donde no necesitas un registro exhaustivo'
                : 'Para revisiones y seguimiento cuando el caso ya está valorado'}
            </p>
            <ul className="space-y-1">
              {esPrimera ? (
                <>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Formulario reducido y ágil
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Motivo, síntomas y exploración básica
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Copiloto clínico activo
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Informe clínico conciso
                  </li>
                </>
              ) : (
                <>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Datos precargados de la sesión anterior
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Solo actualiza la evolución
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Comparativa automática con sesión anterior
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></span>
                    Informe de evolución conciso
                  </li>
                </>
              )}
            </ul>
          </button>

        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← Volver
          </button>
        </div>

      </div>
    </main>
  )
}