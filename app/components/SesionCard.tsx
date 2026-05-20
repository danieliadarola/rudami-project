'use client'

import { useState } from 'react'
import BotonPDF from './BotonPDF'
import BotonEliminarSesion from './BotonEliminarSesion'

interface Props {
  sesion: any
  paciente: any
}

function extraerSeccion(texto: string, seccion: string): string {
  if (!texto || !texto.includes(seccion)) return ''
  const partes = texto.split(seccion)
  if (partes.length < 2) return ''
  const resto = partes[1]
  const siguienteTitulo = resto.match(/\n\*\*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Za-záéíóúñ\s]+\*\*/)
  if (siguienteTitulo && siguienteTitulo.index !== undefined) {
    return resto.slice(0, siguienteTitulo.index).trim()
  }
  return resto.trim()
}

export default function SesionCard({ sesion, paciente }: Props) {
  const [abierta, setAbierta] = useState(false)

  const fechaFormateada = new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const informe = sesion.diagnostico_ia || ''

  const clasificacion = extraerSeccion(informe, '**CLASIFICACIÓN CLÍNICA**')
  const tejidos = extraerSeccion(informe, '**TEJIDOS Y ESTRUCTURAS IMPLICADAS**')
  const hipotesis = extraerSeccion(informe, '**HIPÓTESIS DIAGNÓSTICA PRINCIPAL**')
  const diferencial = extraerSeccion(informe, '**DIAGNÓSTICO DIFERENCIAL**')
  const redFlags = extraerSeccion(informe, '**RED FLAGS**')
  const yellowFlags = extraerSeccion(informe, '**YELLOW FLAGS**')
  const derivacion = extraerSeccion(informe, '**DERIVACIÓN MÉDICA**')
  const pruebas = extraerSeccion(informe, '**EXPLORACIÓN COMPLEMENTARIA RECOMENDADA**')
  const plan = extraerSeccion(informe, '**PLAN DE TRATAMIENTO PROPUESTO**')
  const educacion = extraerSeccion(informe, '**EDUCACIÓN AL PACIENTE**')
  const pronostico = extraerSeccion(informe, '**PRONÓSTICO**')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      <div
        className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setAbierta(!abierta)}
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-semibold text-gray-900">{fechaFormateada}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {sesion.anamnesis
                ? sesion.anamnesis.slice(0, 80) + (sesion.anamnesis.length > 80 ? '...' : '')
                : 'Sin anamnesis registrada'}
            </p>
          </div>
          {sesion.derivacion && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full border border-orange-200 whitespace-nowrap">
              Derivación
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
            sesion.dolor_eva <= 3
              ? 'bg-green-100 text-green-700'
              : sesion.dolor_eva <= 6
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            EVA: {sesion.dolor_eva}/10
          </span>
          <span className="text-gray-400 text-sm">
            {abierta ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {abierta && (
        <div>
          <div className="px-5 pb-5 border-t border-gray-100">

            <div className="flex justify-between items-center mt-4 mb-4">
              <BotonEliminarSesion id={sesion.id} />
              {sesion.diagnostico_ia && (
                <BotonPDF paciente={paciente} sesion={sesion} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Anamnesis</p>
                <p className="text-sm text-gray-700">{sesion.anamnesis || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Exploración física</p>
                <p className="text-sm text-gray-700">{sesion.exploracion_fisica || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {sesion.factores_agravantes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Agravantes</p>
                  <p className="text-xs text-gray-600">{sesion.factores_agravantes}</p>
                </div>
              )}
              {sesion.factores_calmantes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Calmantes</p>
                  <p className="text-xs text-gray-600">{sesion.factores_calmantes}</p>
                </div>
              )}
              {sesion.irradiacion && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Irradiación</p>
                  <p className="text-xs text-gray-600">{sesion.irradiacion}</p>
                </div>
              )}
              {sesion.contexto_biopsicosocial && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Biopsicosocial</p>
                  <p className="text-xs text-gray-600">{sesion.contexto_biopsicosocial}</p>
                </div>
              )}
            </div>

            {sesion.tests_ortopedicos && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tests ortopédicos</p>
                <p className="text-sm text-gray-700">{sesion.tests_ortopedicos}</p>
              </div>
            )}

            {sesion.hipotesis_principal && (
              <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                  Hipótesis principal (copiloto)
                </p>
                <p className="text-sm text-purple-900">{sesion.hipotesis_principal}</p>
              </div>
            )}

            {sesion.notas && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-gray-700">{sesion.notas}</p>
              </div>
            )}
          </div>

          {informe && (
            <div className="p-5 bg-blue-50 border-t border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-600">🤖</span>
                <p className="text-sm font-semibold text-blue-800">Informe generado por IA</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

                {clasificacion && (
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Clasificación clínica</p>
                    <p className="text-sm text-gray-700">{clasificacion}</p>
                  </div>
                )}

                {hipotesis && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Hipótesis diagnóstica</p>
                    <p className="text-sm text-gray-700">{hipotesis}</p>
                  </div>
                )}

                {tejidos && (
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Tejidos implicados</p>
                    <p className="text-sm text-gray-700">{tejidos}</p>
                  </div>
                )}

                {diferencial && (
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Diagnóstico diferencial</p>
                    <p className="text-sm text-gray-700">{diferencial}</p>
                  </div>
                )}

                {redFlags && (
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">🚩 Red flags</p>
                    <p className="text-sm text-gray-700">{redFlags}</p>
                  </div>
                )}

                {yellowFlags && (
                  <div className="bg-white rounded-lg p-3 border border-yellow-100">
                    <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">🟡 Yellow flags</p>
                    <p className="text-sm text-gray-700">{yellowFlags}</p>
                  </div>
                )}

                {derivacion && (
                  <div className="bg-white rounded-lg p-3 border border-orange-100">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Derivación médica</p>
                    <p className="text-sm text-gray-700">{derivacion}</p>
                  </div>
                )}

                {pruebas && (
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Exploración complementaria</p>
                    <p className="text-sm text-gray-700">{pruebas}</p>
                  </div>
                )}

              </div>

              {plan && (
                <div className="bg-white rounded-lg p-3 border border-green-100 mb-3">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Plan de tratamiento</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{plan}</p>
                </div>
              )}

              {educacion && (
                <div className="bg-white rounded-lg p-3 border border-indigo-100 mb-3">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Educación al paciente</p>
                  <p className="text-sm text-gray-700">{educacion}</p>
                </div>
              )}

              {pronostico && (
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Pronóstico</p>
                  <p className="text-sm text-gray-700">{pronostico}</p>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}