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
  exploracion_neurologica: boolean
  pruebas_neurodinamicas: string[]
  escalas_funcionales: string[]
  preguntas_sugeridas: { pregunta: string, campo: string }[]
  estructuras_implicadas: string[]
  mecanismo_dolor: string
  nivel_alerta: 'verde' | 'amarillo' | 'rojo'
  razonamiento_clinico: string
}

export default function ValoracionRapida({ params }: { params: Promise<{ id: string, episodioId: string }> }) {
  const { id, episodioId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiloto, setCopiloto] = useState<CopiloResponse | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [paciente, setPaciente] = useState<any>(null)
  const [ultimaSesion, setUltimaSesion] = useState<any>(null)

  const [form, setForm] = useState({
    evolucion: '',
    cambios_exploracion: '',
    tecnicas_aplicadas: '',
    respuesta_tratamiento: '',
    dolor_eva: '0',
    notas: '',
    factores_agravantes: '',
    factores_calmantes: '',
    irradiacion: '',
    contexto_biopsicosocial: '',
    exploracion_fisica: '',
    tests_ortopedicos: '',
  })

  useEffect(() => {
    const cargar = async () => {
      const { data: pacienteData } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single()
      setPaciente(pacienteData)

      const { data: sesiones } = await supabase
        .from('sesiones')
        .select('*')
        .eq('episodio_id', episodioId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sesiones && sesiones.length > 0) {
        const ultima = sesiones[0]
        setUltimaSesion(ultima)
        setForm(prev => ({
          ...prev,
          factores_agravantes: ultima.factores_agravantes || '',
          factores_calmantes: ultima.factores_calmantes || '',
          irradiacion: ultima.irradiacion || '',
          contexto_biopsicosocial: ultima.contexto_biopsicosocial || '',
          exploracion_fisica: ultima.exploracion_fisica || '',
          tests_ortopedicos: ultima.tests_ortopedicos || '',
          dolor_eva: ultima.dolor_eva?.toString() || '0',
        }))
      }
    }
    cargar()
  }, [id, episodioId])

  const analizarConCopiloto = async (formActual: typeof form) => {
    if (!paciente) return
    setAnalizando(true)
    try {
      const response = await fetch('/api/generar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modo: 'copiloto',
          motivo_consulta: paciente.motivo_consulta,
          antecedentes: paciente.antecedentes,
          anamnesis: formActual.evolucion,
          factores_agravantes: formActual.factores_agravantes,
          factores_calmantes: formActual.factores_calmantes,
          irradiacion: formActual.irradiacion,
          contexto_biopsicosocial: formActual.contexto_biopsicosocial,
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
          modo: 'informe rapido',
          motivo_consulta: paciente?.motivo_consulta,
          antecedentes: paciente?.antecedentes,
          anamnesis: form.evolucion,
          factores_agravantes: form.factores_agravantes,
          factores_calmantes: form.factores_calmantes,
          irradiacion: form.irradiacion,
          contexto_biopsicosocial: form.contexto_biopsicosocial,
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
        anamnesis: form.evolucion,
        factores_agravantes: form.factores_agravantes,
        factores_calmantes: form.factores_calmantes,
        irradiacion: form.irradiacion,
        contexto_biopsicosocial: form.contexto_biopsicosocial,
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

  const campoPregunta = (campo: string) => {
    const mapa: Record<string, string> = {
      anamnesis: 'Evolución',
      irradiacion: 'Irradiación',
      medicacion: 'Medicación',
      contexto_biopsicosocial: 'Contexto biopsicosocial',
      exploracion_fisica: 'Exploración física',
      tests_ortopedicos: 'Tests ortopédicos',
    }
    return mapa[campo] || campo
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm text-blue-500 hover:underline">
            ← Volver
          </button>
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
            Valoración rápida
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

        {ultimaSesion && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">
              Continuando desde la sesión anterior · EVA anterior: {ultimaSesion.dolor_eva}/10
            </p>
            <p className="text-sm text-teal-800">
              Los campos se han precargado. Solo actualiza lo que haya cambiado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Evolución desde la última sesión</h2>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  ¿Cómo ha evolucionado el paciente? *
                </label>
                <textarea
                  name="evolucion"
                  required
                  value={form.evolucion}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe cómo ha evolucionado desde la última sesión, cambios en los síntomas, respuesta al tratamiento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Técnicas aplicadas hoy
                  </label>
                  <textarea
                    name="tecnicas_aplicadas"
                    value={form.tecnicas_aplicadas}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Terapia manual, ejercicio, electroterapia..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Respuesta al tratamiento
                  </label>
                  <textarea
                    name="respuesta_tratamiento"
                    value={form.respuesta_tratamiento}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buena, parcial, sin cambios, empeoramiento..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Actualizar si ha cambiado</h2>
              <p className="text-xs text-gray-400 mb-4">Modifica solo lo que haya variado desde la última sesión</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Factores agravantes</label>
                  <textarea
                    name="factores_agravantes"
                    value={form.factores_agravantes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Factores calmantes</label>
                  <textarea
                    name="factores_calmantes"
                    value={form.factores_calmantes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Irradiación</label>
                <textarea
                  name="irradiacion"
                  value={form.irradiacion}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Exploración física actualizada</label>
                <textarea
                  name="exploracion_fisica"
                  value={form.exploracion_fisica}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Actualiza solo si hay cambios relevantes en la exploración..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Tests realizados hoy
                  {copiloto && copiloto.tests_sugeridos.length > 0 && (
                    <span className="ml-2 text-blue-500 font-normal normal-case">
                      · IA sugiere: {copiloto.tests_sugeridos.slice(0, 3).join(', ')}
                    </span>
                  )}
                </label>
                <textarea
                  name="tests_ortopedicos"
                  value={form.tests_ortopedicos}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tests realizados en esta sesión y sus resultados..."
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Dolor EVA hoy: <span className="text-blue-600 font-bold text-sm normal-case">{form.dolor_eva}/10</span>
                {ultimaSesion && (
                  <span className={`ml-2 text-xs font-normal normal-case ${
                    parseInt(form.dolor_eva) < ultimaSesion.dolor_eva
                      ? 'text-green-500'
                      : parseInt(form.dolor_eva) > ultimaSesion.dolor_eva
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}>
                    {parseInt(form.dolor_eva) < ultimaSesion.dolor_eva && `↓ mejora de ${ultimaSesion.dolor_eva - parseInt(form.dolor_eva)} pts`}
                    {parseInt(form.dolor_eva) > ultimaSesion.dolor_eva && `↑ empeora ${parseInt(form.dolor_eva) - ultimaSesion.dolor_eva} pts`}
                    {parseInt(form.dolor_eva) === ultimaSesion.dolor_eva && '→ sin cambios'}
                  </span>
                )}
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas de la sesión</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones, ejercicios indicados para casa, próximos objetivos..."
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-600 text-sm text-center">Generando informe de evolución con IA...</p>
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
                {loading ? 'Guardando...' : 'Guardar sesión'}
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
                    <p className="text-gray-300 text-xs mt-2">Análisis clínico cada 2 segundos</p>
                  </div>
                )}

                {analizando && !copiloto && (
                  <div className="text-center py-8">
                    <p className="text-yellow-500 text-sm">Analizando evolución clínica...</p>
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

                    {copiloto.razonamiento_clinico && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Razonamiento clínico</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{copiloto.razonamiento_clinico}</p>
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
                            const campo = typeof p === 'string' ? '' : p.campo
                            return (
                              <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <p className="text-xs text-blue-800">{pregunta}</p>
                                {campo && (
                                  <p className="text-xs text-blue-400 mt-0.5">→ {campoPregunta(campo)}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {copiloto.clasificacion_dolor && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Tipo dolor</p>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                            {copiloto.clasificacion_dolor}
                          </span>
                        </div>
                      )}
                      {copiloto.fase_clinica && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Fase</p>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                            {copiloto.fase_clinica}
                          </span>
                        </div>
                      )}
                      {copiloto.irritabilidad && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Irritabilidad</p>
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                            {copiloto.irritabilidad}
                          </span>
                        </div>
                      )}
                    </div>

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

                    {copiloto.yellow_flags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🟡 Yellow flags</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.yellow_flags.map((y, i) => (
                            <span key={i} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded-full border border-yellow-100">{y}</span>
                          ))}
                        </div>
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