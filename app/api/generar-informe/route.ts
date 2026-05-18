import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: Request) {
  console.log('🔥 Llamada a copiloto clínico recibida')
  try {
    const {
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
      modo
    } = await request.json()

    const esCopiloto = modo === 'copiloto'

    const prompt = esCopiloto
      ? `Eres un fisioterapeuta experto con 20 años de experiencia clínica actuando como copiloto clínico en tiempo real.
El fisioterapeuta está rellenando la anamnesis AHORA MISMO. Analiza lo que ha escrito hasta este momento y responde ÚNICAMENTE en JSON válido sin texto adicional.

DATOS ACTUALES:
Motivo de consulta: ${motivo_consulta || 'sin datos aún'}
Antecedentes: ${antecedentes || 'sin datos aún'}
Anamnesis actual: ${anamnesis || 'sin datos aún'}
Factores agravantes: ${factores_agravantes || 'sin datos aún'}
Factores calmantes: ${factores_calmantes || 'sin datos aún'}
Irradiación: ${irradiacion || 'sin datos aún'}
Contexto biopsicosocial: ${contexto_biopsicosocial || 'sin datos aún'}
Dolor EVA: ${dolor_eva || 'sin datos aún'}

Responde SOLO con este JSON exacto:
{
  "hipotesis_principal": "string con la hipótesis más probable en 1-2 frases",
  "diagnostico_diferencial": ["string", "string", "string"],
  "red_flags": ["string"] o [],
  "tests_sugeridos": ["Test name", "Test name"],
  "preguntas_sugeridas": ["string", "string", "string"],
  "estructuras_implicadas": ["string", "string"],
  "derivacion": false,
  "derivacion_motivo": "string o vacío",
  "nivel_alerta": "verde" o "amarillo" o "rojo"
}`
      : `Eres un fisioterapeuta experto con 20 años de experiencia clínica.
Analiza todos los datos clínicos y genera un informe completo estructurado en español.

MOTIVO DE CONSULTA: ${motivo_consulta || '—'}
ANTECEDENTES: ${antecedentes || '—'}
ANAMNESIS: ${anamnesis || '—'}
FACTORES AGRAVANTES: ${factores_agravantes || '—'}
FACTORES CALMANTES: ${factores_calmantes || '—'}
IRRADIACIÓN: ${irradiacion || '—'}
CONTEXTO BIOPSICOSOCIAL: ${contexto_biopsicosocial || '—'}
EXPLORACIÓN FÍSICA: ${exploracion_fisica || '—'}
TESTS ORTOPÉDICOS: ${tests_ortopedicos || '—'}
DOLOR EVA: ${dolor_eva || '—'}/10

Genera un informe clínico estructurado con estas secciones exactas:

**HIPÓTESIS DIAGNÓSTICA**
(La causa más probable)

**DIAGNÓSTICO DIFERENCIAL**
(Otras posibles causas en lista)

**RED FLAGS**
(Señales de alarma. Si no hay escribe: No se identifican red flags)

**PRUEBAS COMPLEMENTARIAS RECOMENDADAS**
(Si fueran necesarias)

**PLAN DE TRATAMIENTO PROPUESTO**
(Técnicas, frecuencia y objetivos por fases)

**PRONÓSTICO**
(Evolución esperada y tiempo estimado de recuperación)

Sé específico, clínico y conciso.`

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: esCopiloto ? 800 : 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const respuesta = completion.choices[0]?.message?.content || ''

    if (esCopiloto) {
      try {
        const clean = respuesta.replace(/```json|```/g, '').trim()
        const datos = JSON.parse(clean)
        return NextResponse.json({ copiloto: datos })
      } catch {
        return NextResponse.json({ copiloto: null, error: 'Error parseando respuesta' })
      }
    }

    return NextResponse.json({ informe: respuesta })

  } catch (error) {
    console.error('❌ Error en copiloto clínico:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}