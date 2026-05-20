'use client'

import { useState, use, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

interface CopiloResponse {
  hipotesis_principal: string
  tejidos_implicados: string[]
  clasificacion_dolor: string
  fase_clinica: string
  irritabilidad: string
  diagnostico_diferencial: string[]
  red_flags: string[]
  yellow_flags: string[]
  derivacion: boolean
  derivacion_motivo: string
  derivacion_urgencia: string
  tests_sugeridos: string[]
  pruebas_neurodinamicas: string[]
  escalas_funcionales: string[]
  preguntas_sugeridas: { pregunta: string, campo: string }[]
  estructuras_implicadas: string[]
  nivel_alerta: 'verde' | 'amarillo' | 'rojo'
  razonamiento_clinico: string
}

export default function ValoracionRapidaPrimera({ params }: { params: Promise<{ id: string, episodioId: string }> }) {
  const { id, episodioId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiloto, setCopiloto] = useState<CopiloResponse | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [paciente, setPaciente] = useState<any>(null)

  const [form, setForm] = useState({
    motivo_consulta: '',
    anamnesis: '',
    factores_agravantes: '',
    factores_calmantes: '',
    irradiacion: '',
    exploracion_fisica: '',
    tests_ortopedicos: '',
    dolor_eva: '0',
    notas: '',
  })

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single()
      setPaciente(data)
    }
    cargar()
  }, [id])

  const analizarConCopiloto = async (formActual: typeof form) => {
    if (!paciente) return
    setAnalizando(true)
    try {
      const response = await fetch('/api/generar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'copiloto',
          motivo_consulta: formActual.motivo_consulta || paciente.motivo_consulta,
          antecedentes: paciente.antecedentes,
          anamnesis: formActual.anamnesis,
          factores_agravantes: formActual.factores_agravantes,
          factores_calmantes: formActual.factores_calmantes,
          irradiacion: formActual.irradiacion,
          dolor_eva: formActual.dolor_eva,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.copiloto) setCopiloto(data.copiloto)
      }
    } catch (err) {
      console.error('Error copiloto:', err)
    } finally {
      setAnalizando(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nuevoForm = { ...form, [e.target.name]: e.target.value }
    setForm(nuevoForm)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      analizarConCopiloto(nuevoForm)
    }, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      let informe_ia = ''
      const response = await fetch('/api/generar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'informe_rapido',
          motivo_consulta: form.motivo_consulta || paciente?.motivo_consulta,
          antecedentes: paciente?.antecedentes,
          anamnesis: form.anamnesis,
          factores_agravantes: form.factores_agravantes,
          factores_calmantes: form.factores_calmantes,
          irradiacion: form.irradiacion,
          exploracion_fisica: form.exploracion_fisica,
          tests_ortopedicos: form.tests_ortopedicos,
          dolor_eva: form.dolor_eva,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        informe_ia = data.informe || ''
      }

      const { error } = await supabase.from('sesiones').insert([{
        paciente_id: id,
        episodio_id: episodioId,
        user_id: currentUser?.id,
        anamnesis: form.anamnesis,
        factores_agravantes: form.factores_agravantes,
        factores_calmantes: form.factores_calmantes,
        irradiacion: form.irradiacion,
        exploracion_fisica: form.exploracion_fisica,
        tests_ortopedicos: form.tests_ortopedicos,
        dolor_eva: parseInt(form.dolor_eva),
        notas: form.notas,
        fecha: new Date().toISOString().split('T')[0],
        diagnostico_ia: informe_ia,
        plan_tratamiento_ia: informe_ia,
        red_flags: copiloto?.red_flags?.join(', ') || '',
        hipotesis_principal: copiloto?.hipotesis_principal || '',
        derivacion: copiloto?.derivacion || false,
      }])

      if (error) {
        setError('Error al guardar la sesión.')
        setLoading(false)
        return
      }

      router.push(`/pacientes/${id}`)
    } catch (err) {
      console.error('Error:', err)
      setError('Error inesperado.')
      setLoading(false)
    }
  }

  const colorAlerta = {
    verde: 'bg-green-100 text-green-700 border-green-200',
    amarillo: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    rojo: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm text-blue-500 hover:underline">
            ← Volver
          </button>
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
            Valoración rápida · Primera sesión
          </span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Valoración rápida</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {paciente ? `${paciente.nombre} ${paciente.apellidos}` : '...'}
            </p>
          </div>
          {copiloto && (
            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${colorAlerta[copiloto.nivel_alerta]}`}>
              {copiloto.nivel_alerta === 'verde' && 'Sin alertas'}
              {copiloto.nivel_alerta === 'amarillo' && 'Requiere atención'}
              {copiloto.nivel_alerta === 'rojo' && '⚠ Alerta clínica'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Motivo y síntomas</h2>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Motivo de consulta *</label>
                <textarea
                  name="motivo_consulta"
                  required
                  value={form.motivo_consulta}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¿Por qué viene el paciente?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descripción de síntomas *</label>
                <textarea
                  name="anamnesis"
                  required
                  value={form.anamnesis}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe brevemente los síntomas principales..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Agravantes</label>
                  <textarea
                    name="factores_agravantes"
                    value={form.factores_agravantes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Qué empeora?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Calmantes</label>
                  <textarea
                    name="factores_calmantes"
                    value={form.factores_calmantes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Qué alivia?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Irradiación</label>
                <textarea
                  name="irradiacion"
                  value={form.irradiacion}
                  onChange={handleChange}
                  rows={1}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¿Irradia? ¿A dónde?"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Exploración básica</h2>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hallazgos principales *</label>
                <textarea
                  name="exploracion_fisica"
                  required
                  value={form.exploracion_fisica}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Hallazgos más relevantes de la exploración..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Tests realizados
                  {copiloto && copiloto.tests_sugeridos.length > 0 && (
                    <span className="ml-2 text-blue-500 font-normal normal-case">
                      · IA sugiere: {copiloto.tests_sugeridos.slice(0, 2).join(', ')}
                    </span>
                  )}
                </label>
                <textarea
                  name="tests_ortopedicos"
                  value={form.tests_ortopedicos}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tests y resultados..."
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                EVA: <span className="text-blue-600 font-bold text-sm normal-case">{form.dolor_eva}/10</span>
              </label>
              <input
                name="dolor_eva"
                type="range"
                min="0"
                max="10"
                step="1"
                value={form.dolor_eva}
                onChange={handleChange}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 · Sin dolor</span>
                <span>5 · Moderado</span>
                <span>10 · Insoportable</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones, plan de tratamiento inicial..."
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-600 text-sm text-center">Generando informe con IA...</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar y generar informe'}
              </button>
            </div>

          </form>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analizando ? 'bg-yellow-400' : copiloto ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-sm font-semibold text-gray-900">Copiloto clínico</span>
                </div>
                <span className="text-xs text-gray-400">
                  {analizando ? 'Analizando...' : copiloto ? 'Activo' : 'Escribe para activar'}
                </span>
              </div>

              <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                {!copiloto && !analizando && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">El copiloto se activará cuando empieces a escribir.</p>
                  </div>
                )}

                {analizando && !copiloto && (
                  <div className="text-center py-8">
                    <p className="text-yellow-500 text-sm">Analizando...</p>
                  </div>
                )}

                {copiloto && (
                  <>
                    {copiloto.red_flags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">🚩 Red flags</p>
                        {copiloto.red_flags.map((flag, i) => (
                          <p key={i} className="text-sm text-red-700 mb-1">· {flag}</p>
                        ))}
                      </div>
                    )}

                    {copiloto.derivacion && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                          Derivación {copiloto.derivacion_urgencia === 'urgente' ? '🔴 urgente' : 'recomendada'}
                        </p>
                        <p className="text-sm text-orange-700">{copiloto.derivacion_motivo}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hipótesis principal</p>
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <p className="text-sm text-purple-900">{copiloto.hipotesis_principal}</p>
                      </div>
                    </div>

                    {copiloto.preguntas_sugeridas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preguntas sugeridas</p>
                        <div className="space-y-2">
                          {copiloto.preguntas_sugeridas.map((p, i) => {
                            const pregunta = typeof p === 'string' ? p : p.pregunta
                            return (
                              <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <p className="text-xs text-blue-800">{pregunta}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {copiloto.diagnostico_diferencial.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Diagnóstico diferencial</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.diagnostico_diferencial.map((d, i) => (
                            <span key={i} className="text-xs bg-purple-50 text-purple-800 px-2 py-1 rounded-full border border-purple-100">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {copiloto.tests_sugeridos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tests sugeridos</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.tests_sugeridos.map((t, i) => (
                            <span key={i} className="text-xs bg-teal-50 text-teal-800 px-2 py-1 rounded-full border border-teal-100">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {copiloto.razonamiento_clinico && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Razonamiento clínico</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{copiloto.razonamiento_clinico}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}