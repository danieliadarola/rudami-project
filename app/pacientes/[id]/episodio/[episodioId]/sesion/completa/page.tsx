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

export default function ValoracionCompleta({ params }: { params: Promise<{ id: string, episodioId: string }> }) {
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
    antecedentes_personales: '',
    antecedentes_familiares: '',
    mecanismo_lesional: '',
    comportamiento_dolor: '',
    dolor_nocturno: '',
    irritabilidad: '',
    anamnesis: '',
    factores_agravantes: '',
    factores_calmantes: '',
    irradiacion: '',
    yellow_flags: '',
    medicacion: '',
    nivel_actividad: '',
    historial_deportivo: '',
    contexto_biopsicosocial: '',
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
          antecedentes: `Personales: ${formActual.antecedentes_personales || paciente.antecedentes || '—'} | Familiares: ${formActual.antecedentes_familiares || '—'}`,
          anamnesis: formActual.anamnesis,
          factores_agravantes: formActual.factores_agravantes,
          factores_calmantes: formActual.factores_calmantes,
          irradiacion: formActual.irradiacion,
          contexto_biopsicosocial: formActual.contexto_biopsicosocial,
          mecanismo_lesional: formActual.mecanismo_lesional,
          comportamiento_dolor: formActual.comportamiento_dolor,
          dolor_nocturno: formActual.dolor_nocturno,
          irritabilidad: formActual.irritabilidad,
          yellow_flags: formActual.yellow_flags,
          medicacion: formActual.medicacion,
          nivel_actividad: formActual.nivel_actividad,
          historial_deportivo: formActual.historial_deportivo,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
          modo: 'informe',
          motivo_consulta: form.motivo_consulta || paciente?.motivo_consulta,
          antecedentes: `Personales: ${form.antecedentes_personales || paciente?.antecedentes || '—'} | Familiares: ${form.antecedentes_familiares || '—'}`,
          anamnesis: form.anamnesis,
          factores_agravantes: form.factores_agravantes,
          factores_calmantes: form.factores_calmantes,
          irradiacion: form.irradiacion,
          contexto_biopsicosocial: form.contexto_biopsicosocial,
          mecanismo_lesional: form.mecanismo_lesional,
          comportamiento_dolor: form.comportamiento_dolor,
          dolor_nocturno: form.dolor_nocturno,
          irritabilidad: form.irritabilidad,
          yellow_flags: form.yellow_flags,
          medicacion: form.medicacion,
          nivel_actividad: form.nivel_actividad,
          historial_deportivo: form.historial_deportivo,
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
        antecedentes_personales: form.antecedentes_personales,
        antecedentes_familiares: form.antecedentes_familiares,
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

  const badgeColor = (texto: string) => {
    if (!texto) return 'bg-gray-100 text-gray-600'
    if (texto === 'alta' || texto === 'rojo' || texto === 'urgente') return 'bg-red-100 text-red-700'
    if (texto === 'media' || texto === 'amarillo' || texto === 'subaguda') return 'bg-yellow-100 text-yellow-700'
    if (texto === 'baja' || texto === 'verde' || texto === 'crónica') return 'bg-blue-100 text-blue-700'
    if (texto === 'aguda') return 'bg-orange-100 text-orange-700'
    return 'bg-purple-100 text-purple-700'
  }

  const campoPregunta = (campo: string) => {
    const mapa: Record<string, string> = {
      antecedentes: 'Antecedentes personales',
      antecedentes_familiares: 'Antecedentes familiares',
      anamnesis: 'Anamnesis',
      irradiacion: 'Irradiación',
      dolor_nocturno: 'Dolor nocturno',
      medicacion: 'Medicación',
      nivel_actividad: 'Nivel de actividad',
      contexto_biopsicosocial: 'Contexto biopsicosocial',
      yellow_flags: 'Yellow flags',
      historial_deportivo: 'Historial deportivo',
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
            Valoración completa
          </span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Valoración clínica completa</h1>
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
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Motivo de consulta</h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Motivo principal *</label>
                <textarea
                  name="motivo_consulta"
                  required
                  value={form.motivo_consulta}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¿Por qué viene el paciente? Describe el problema principal..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mecanismo lesional</label>
                  <select
                    name="mecanismo_lesional"
                    value={form.mecanismo_lesional}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="traumático">Traumático</option>
                    <option value="degenerativo">Degenerativo</option>
                    <option value="sobreuso">Sobreuso</option>
                    <option value="carga repetitiva">Carga repetitiva</option>
                    <option value="compresión">Compresión</option>
                    <option value="tracción">Tracción</option>
                    <option value="torsión">Torsión</option>
                    <option value="impacto">Impacto</option>
                    <option value="insidioso">Insidioso / sin causa clara</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Irritabilidad clínica</label>
                  <select
                    name="irritabilidad"
                    value={form.irritabilidad}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="alta">Alta — se agrava fácilmente</option>
                    <option value="media">Media — se agrava con actividad intensa</option>
                    <option value="baja">Baja — tolera bien la actividad</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Antecedentes</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Antecedentes personales</label>
                  <textarea
                    name="antecedentes_personales"
                    value={form.antecedentes_personales}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cirugías previas, enfermedades, lesiones anteriores relacionadas, tratamientos previos, alergias..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Antecedentes familiares</label>
                  <textarea
                    name="antecedentes_familiares"
                    value={form.antecedentes_familiares}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enfermedades hereditarias relevantes, artritis, espondilitis, osteoporosis familiar..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Comportamiento del dolor</h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descripción del comportamiento *</label>
                <textarea
                  name="comportamiento_dolor"
                  value={form.comportamiento_dolor}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¿Cuándo aparece? ¿Es constante o intermitente? ¿Cómo varía a lo largo del día?..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Factores agravantes</label>
                  <textarea
                    name="factores_agravantes"
                    value={form.factores_agravantes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Qué empeora el dolor?"
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
                    placeholder="¿Qué alivia el dolor?"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Irradiación</label>
                  <textarea
                    name="irradiacion"
                    value={form.irradiacion}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Irradia? ¿A dónde? ¿Con qué patrón?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dolor nocturno</label>
                  <select
                    name="dolor_nocturno"
                    value={form.dolor_nocturno}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="no">No hay dolor nocturno</option>
                    <option value="leve">Leve — no interrumpe el sueño</option>
                    <option value="moderado">Moderado — dificulta conciliar</option>
                    <option value="severo">Severo — despierta al paciente</option>
                    <option value="constante">Constante durante toda la noche</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Anamnesis detallada</h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descripción detallada de síntomas *</label>
                <textarea
                  name="anamnesis"
                  required
                  value={form.anamnesis}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe en detalle los síntomas, inicio, evolución, tratamientos previos, impacto en la vida diaria..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Medicación actual</label>
                  <textarea
                    name="medicacion"
                    value={form.medicacion}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AINEs, corticoides, analgésicos, otros..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nivel de actividad</label>
                  <select
                    name="nivel_actividad"
                    value={form.nivel_actividad}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="sedentario">Sedentario</option>
                    <option value="ligero">Actividad ligera</option>
                    <option value="moderado">Moderadamente activo</option>
                    <option value="activo">Activo</option>
                    <option value="deportista amateur">Deportista amateur</option>
                    <option value="deportista competición">Deportista de competición</option>
                    <option value="profesional">Deportista profesional</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Contexto biopsicosocial</h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contexto general</label>
                <textarea
                  name="contexto_biopsicosocial"
                  value={form.contexto_biopsicosocial}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Situación laboral, estrés, calidad del sueño, estado emocional, apoyo social, creencias sobre el dolor..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Yellow flags identificadas</label>
                  <textarea
                    name="yellow_flags"
                    value={form.yellow_flags}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Catastrofismo, kinesiofobia, evitación, baja expectativa de mejora..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Historial deportivo</label>
                  <textarea
                    name="historial_deportivo"
                    value={form.historial_deportivo}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Deporte practicado, frecuencia, lesiones previas relacionadas..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Exploración física</h2>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hallazgos de la exploración *</label>
                <textarea
                  name="exploracion_fisica"
                  required
                  value={form.exploracion_fisica}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Inspección, palpación, rango de movimiento activo/pasivo, fuerza, sensibilidad, reflejos, postura..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Tests ortopédicos y neurodinámicos
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
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lasègue, Slump, ULNT, Kemp, Phalen... con resultado de cada uno"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Escala EVA: <span className="text-blue-600 font-bold text-sm normal-case">{form.dolor_eva}/10</span>
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notas adicionales</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones, impresión clínica general, objetivos del tratamiento..."
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-600 text-sm text-center">Generando valoración clínica completa con IA...</p>
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
                {loading ? 'Generando informe...' : 'Guardar y generar informe clínico'}
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
                    <p className="text-yellow-500 text-sm">Analizando datos clínicos...</p>
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
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor(copiloto.clasificacion_dolor)}`}>
                            {copiloto.clasificacion_dolor}
                          </span>
                        </div>
                      )}
                      {copiloto.fase_clinica && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Fase</p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor(copiloto.fase_clinica)}`}>
                            {copiloto.fase_clinica}
                          </span>
                        </div>
                      )}
                      {copiloto.irritabilidad && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Irritabilidad</p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor(copiloto.irritabilidad)}`}>
                            {copiloto.irritabilidad}
                          </span>
                        </div>
                      )}
                    </div>

                    {copiloto.tejidos_implicados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tejidos implicados</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.tejidos_implicados.map((t, i) => (
                            <span key={i} className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-full border border-amber-100">{t}</span>
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

                    {copiloto.estructuras_implicadas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estructuras anatómicas</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.estructuras_implicadas.map((e, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full border border-blue-100">{e}</span>
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

                    {copiloto.pruebas_neurodinamicas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pruebas neurodinámicas</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.pruebas_neurodinamicas.map((p, i) => (
                            <span key={i} className="text-xs bg-indigo-50 text-indigo-800 px-2 py-1 rounded-full border border-indigo-100">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {copiloto.escalas_funcionales.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Escalas funcionales</p>
                        <div className="flex flex-wrap gap-1">
                          {copiloto.escalas_funcionales.map((e, i) => (
                            <span key={i} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded-full border border-green-100">{e}</span>
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