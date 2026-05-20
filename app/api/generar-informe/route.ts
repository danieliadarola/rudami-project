import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: Request) {
  console.log('🧠 Motor de razonamiento clínico activado')
  try {
    const {
      modo,
      motivo_consulta,
      antecedentes,
      anamnesis,
      factores_agravantes,
      factores_calmantes,
      irradiacion,
      contexto_biopsicosocial,
      exploracion_fisica,
      tests_ortopedicos,
      dolor_eva,
      mecanismo_lesional,
      comportamiento_dolor,
      dolor_nocturno,
      irritabilidad,
      yellow_flags,
      medicacion,
      nivel_actividad,
      historial_deportivo,
    } = await request.json()

    const esCopiloto = modo === 'copiloto'
    const esRapido = modo === 'informe_rapido'

    const promptCopiloto = `Eres un equipo multidisciplinar de expertos clínicos actuando como copiloto clínico en tiempo real para un fisioterapeuta. Tu equipo incluye fisioterapeutas musculoesqueléticos y deportivos expertos, especialistas en dolor, médicos rehabilitadores, expertos en biomecánica y razonamiento clínico basado en evidencia científica moderna.

DATOS CLÍNICOS ACTUALES DEL PACIENTE:
- Motivo de consulta: ${motivo_consulta || 'sin datos aún'}
- Antecedentes: ${antecedentes || 'sin datos aún'}
- Anamnesis actual: ${anamnesis || 'sin datos aún'}
- Factores agravantes: ${factores_agravantes || 'sin datos aún'}
- Factores calmantes: ${factores_calmantes || 'sin datos aún'}
- Irradiación: ${irradiacion || 'sin datos aún'}
- Contexto biopsicosocial: ${contexto_biopsicosocial || 'sin datos aún'}
- Mecanismo lesional: ${mecanismo_lesional || 'sin datos aún'}
- Comportamiento del dolor: ${comportamiento_dolor || 'sin datos aún'}
- Dolor nocturno: ${dolor_nocturno || 'sin datos aún'}
- Irritabilidad: ${irritabilidad || 'sin datos aún'}
- Yellow flags: ${yellow_flags || 'sin datos aún'}
- Medicación: ${medicacion || 'sin datos aún'}
- Nivel de actividad: ${nivel_actividad || 'sin datos aún'}
- Historial deportivo: ${historial_deportivo || 'sin datos aún'}
- EVA: ${dolor_eva || 'sin datos aún'}/10

INSTRUCCIONES DE RAZONAMIENTO CLÍNICO:
Analiza los datos disponibles usando razonamiento clínico experto basado en evidencia. Considera:
1. CLASIFICACIÓN DEL DOLOR: ¿Es nociceptivo, neuropático o nociplástico?
2. TEJIDOS IMPLICADOS: ¿Qué estructuras tienen más probabilidad de estar afectadas?
3. FASE CLÍNICA: ¿Aguda, subaguda o crónica?
4. IRRITABILIDAD: Alta, media o baja.
5. MECANISMO LESIONAL: ¿Traumático, degenerativo, sobreuso, compresión, tracción?
6. BANDERAS: Red flags, yellow flags, necesidad de derivación.

Para las preguntas sugeridas, indica exactamente a qué campo del formulario va asociada cada pregunta usando estos nombres de campo exactos:
- antecedentes, antecedentes_familiares, anamnesis, irradiacion, dolor_nocturno
- medicacion, nivel_actividad, contexto_biopsicosocial, yellow_flags
- historial_deportivo, exploracion_fisica, tests_ortopedicos

Responde ÚNICAMENTE en JSON válido sin texto adicional ni backticks:
{
  "hipotesis_principal": "hipótesis más probable con razonamiento clínico en 2-3 frases",
  "tejidos_implicados": ["tejido1", "tejido2"],
  "clasificacion_dolor": "nociceptivo/neuropático/nociplástico/mixto",
  "fase_clinica": "aguda/subaguda/crónica",
  "irritabilidad": "alta/media/baja",
  "diagnostico_diferencial": ["dx1", "dx2", "dx3"],
  "red_flags": ["flag1"],
  "yellow_flags": ["flag1"],
  "derivacion": false,
  "derivacion_motivo": "",
  "derivacion_urgencia": "no/rutina/urgente",
  "tests_sugeridos": ["test1", "test2"],
  "exploracion_neurologica": true,
  "pruebas_neurodinamicas": ["prueba1"],
  "escalas_funcionales": ["escala1"],
  "preguntas_sugeridas": [
    {"pregunta": "texto de la pregunta clínica", "campo": "nombre_del_campo"}
  ],
  "estructuras_implicadas": ["estructura1", "estructura2"],
  "mecanismo_dolor": "descripción breve del mecanismo",
  "nivel_alerta": "verde/amarillo/rojo",
  "razonamiento_clinico": "explicación breve del razonamiento experto en 2-3 frases"
}`

    const promptInformeRapido = `Eres un fisioterapeuta experto. Genera un informe clínico CONCISO Y DIRECTO basado en estos datos.

DATOS:
- Motivo: ${motivo_consulta || '—'}
- Anamnesis: ${anamnesis || '—'}
- Agravantes: ${factores_agravantes || '—'}
- Calmantes: ${factores_calmantes || '—'}
- Irradiación: ${irradiacion || '—'}
- Exploración: ${exploracion_fisica || '—'}
- Tests: ${tests_ortopedicos || '—'}
- EVA: ${dolor_eva || '—'}/10

Genera un informe BREVE con estas secciones. Máximo 2-3 líneas por sección:

**HIPÓTESIS DIAGNÓSTICA PRINCIPAL**
(1-2 frases. Diagnóstico más probable.)

**DIAGNÓSTICO DIFERENCIAL**
(Lista de 2-3 diagnósticos a descartar, sin explicaciones largas.)

**RED FLAGS**
(Solo si las hay. Si no: "No se identifican red flags.")

**YELLOW FLAGS**
(Solo si las hay. Si no: "No se identifican yellow flags.")

**DERIVACIÓN MÉDICA**
(Solo si procede. Si no: "No indicada.")

**PLAN DE TRATAMIENTO PROPUESTO**
Fase 1 — Objetivos y técnicas principales (3-4 líneas)
Fase 2 — Progresión funcional (2-3 líneas)
Fase 3 — Readaptación y criterios de alta (2 líneas)

**PRONÓSTICO**
(1-2 frases sobre evolución esperada.)

Sé directo y clínico. Sin introducciones ni relleno.`

    const promptInformeCompleto = `Eres un equipo multidisciplinar de expertos clínicos en fisioterapia musculoesquelética moderna basada en evidencia científica. Actúas como copiloto clínico avanzado para generar un informe clínico completo y profesional.

DATOS CLÍNICOS COMPLETOS:
- Motivo de consulta: ${motivo_consulta || '—'}
- Antecedentes relevantes: ${antecedentes || '—'}
- Anamnesis: ${anamnesis || '—'}
- Factores agravantes: ${factores_agravantes || '—'}
- Factores calmantes: ${factores_calmantes || '—'}
- Irradiación: ${irradiacion || '—'}
- Contexto biopsicosocial: ${contexto_biopsicosocial || '—'}
- Mecanismo lesional: ${mecanismo_lesional || '—'}
- Comportamiento del dolor: ${comportamiento_dolor || '—'}
- Dolor nocturno: ${dolor_nocturno || '—'}
- Irritabilidad clínica: ${irritabilidad || '—'}
- Yellow flags: ${yellow_flags || '—'}
- Medicación actual: ${medicacion || '—'}
- Nivel de actividad: ${nivel_actividad || '—'}
- Historial deportivo: ${historial_deportivo || '—'}
- Exploración física: ${exploracion_fisica || '—'}
- Tests ortopédicos: ${tests_ortopedicos || '—'}
- EVA: ${dolor_eva || '—'}/10

Genera un informe clínico estructurado extremadamente profesional y basado en evidencia con estas secciones:

**CLASIFICACIÓN CLÍNICA**
Tipo de dolor (nociceptivo/neuropático/nociplástico/mixto), fase clínica (aguda/subaguda/crónica), nivel de irritabilidad (alta/media/baja), mecanismo lesional.

**TEJIDOS Y ESTRUCTURAS IMPLICADAS**
Lista priorizada de tejidos y estructuras anatómicas con mayor probabilidad de estar afectadas y justificación clínica.

**HIPÓTESIS DIAGNÓSTICA PRINCIPAL**
Hipótesis más probable con razonamiento clínico detallado basado en los hallazgos.

**DIAGNÓSTICO DIFERENCIAL**
Lista de diagnósticos alternativos a descartar con criterios clínicos diferenciadores.

**RED FLAGS**
Señales de alarma identificadas. Si no hay: "No se identifican red flags en la valoración actual."

**YELLOW FLAGS**
Factores psicosociales y contextuales que pueden influir en la evolución. Si no hay: "No se identifican yellow flags significativas."

**DERIVACIÓN MÉDICA**
Si procede: especialidad, urgencia y motivo. Si no: "No se indica derivación en este momento."

**EXPLORACIÓN COMPLEMENTARIA RECOMENDADA**
Tests ortopédicos, pruebas neurodinámicas, exploración neurológica y escalas funcionales recomendadas si no se han realizado.

**PLAN DE TRATAMIENTO PROPUESTO**
Dividido en fases:
- Fase 1 (aguda/control del dolor): objetivos, técnicas y duración estimada
- Fase 2 (recuperación funcional): objetivos, técnicas y progresión
- Fase 3 (readaptación y prevención): objetivos, criterios de alta o retorno deportivo

**EDUCACIÓN AL PACIENTE**
Puntos clave que el fisioterapeuta debe explicar al paciente sobre su condición, pronóstico y participación activa en la recuperación.

**PRONÓSTICO**
Evolución esperada basada en los factores clínicos identificados, tiempo estimado de recuperación y factores pronósticos positivos y negativos.

Usa terminología fisioterapéutica profesional y razonamiento basado en evidencia científica moderna.`

    const prompt = esCopiloto
      ? promptCopiloto
      : esRapido
      ? promptInformeRapido
      : promptInformeCompleto

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: esCopiloto ? 1000 : esRapido ? 1000 : 3000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })

    const respuesta = completion.choices[0]?.message?.content || ''

    if (esCopiloto) {
      try {
        const clean = respuesta.replace(/```json|```/g, '').trim()
        const datos = JSON.parse(clean)
        return NextResponse.json({ copiloto: datos })
      } catch {
        console.error('Error parseando JSON del copiloto:', respuesta)
        return NextResponse.json({ copiloto: null, error: 'Error parseando respuesta' })
      }
    }

    return NextResponse.json({ informe: respuesta })

  } catch (error) {
    console.error('❌ Error en motor clínico:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud clínica' },
      { status: 500 }
    )
  }
}