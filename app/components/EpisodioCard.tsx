'use client'

import { useState } from 'react'
import Link from 'next/link'
import SesionCard from './SesionCard'
import GraficaEVA from './GraficaEVA'
import BotonCerrarEpisodio from './BotonCerrarEpisodio'

interface Props {
  episodio: any
  sesiones: any[]
  paciente: any
}

export default function EpisodioCard({ episodio, sesiones, paciente }: Props) {
  const [abierto, setAbierto] = useState(true)

  const sesionesEpisodio = sesiones
    .filter(s => s.episodio_id === episodio.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const esPrimeraSession = sesionesEpisodio.length === 0

  const fechaInicio = new Date(episodio.fecha_inicio + 'T12:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const urlNuevaSesion = esPrimeraSession
    ? `/pacientes/${paciente.id}/episodio/${episodio.id}/sesion/primera`
    : `/pacientes/${paciente.id}/episodio/${episodio.id}/sesion/nueva`

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">

      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            episodio.estado === 'activo' ? 'bg-green-400' : 'bg-gray-300'
          }`} />
          <div>
            <p className="font-semibold text-gray-900">{episodio.titulo}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Desde {fechaInicio} · {sesionesEpisodio.length} sesión{sesionesEpisodio.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {episodio.estado === 'activo' && (
            <>
              <BotonCerrarEpisodio id={episodio.id} />
              <Link
                href={urlNuevaSesion}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                {esPrimeraSession ? '+ Primera sesión' : '+ Nueva sesión'}
              </Link>
            </>
          )}
          {episodio.estado === 'cerrado' && (
            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-1 rounded-full">
              Cerrada
            </span>
          )}
          <span className="text-gray-400 text-sm ml-2">{abierto ? '▲' : '▼'}</span>
        </div>
      </button>

      {abierto && (
        <div className="border-t border-gray-100">
          {episodio.descripcion && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm text-gray-600">{episodio.descripcion}</p>
            </div>
          )}

          {sesionesEpisodio.length >= 2 && (
            <div className="p-5 border-b border-gray-100">
              <GraficaEVA sesiones={sesionesEpisodio} />
            </div>
          )}

          {sesionesEpisodio.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-gray-400 text-sm py-4">
                Aún no hay sesiones en esta consulta.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {[...sesionesEpisodio].reverse().map((sesion) => (
                <SesionCard key={sesion.id} sesion={sesion} paciente={paciente} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}