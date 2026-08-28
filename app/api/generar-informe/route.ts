// app/api/generar-informe/route.ts
// Endpoint del motor de razonamiento clínico.
// Toda la lógica de IA vive en app/lib/ai/ (proveedor desacoplado).

import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { generarInforme, RateLimitError } from '@/app/lib/ai'
import type { DatosClinicos, ModoIA } from '@/app/lib/ai'

export async function POST(request: Request) {
  try {
    // Sin esto el endpoint es un proxy de IA abierto contra la cuota de Groq:
    // es el único que el Proxy de Next no cubre (el matcher excluye /api).
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const modo: ModoIA = body.modo ?? 'informe'

    const datos: DatosClinicos = {
      motivo_consulta: body.motivo_consulta,
      antecedentes: body.antecedentes,
      anamnesis: body.anamnesis,
      factores_agravantes: body.factores_agravantes,
      factores_calmantes: body.factores_calmantes,
      irradiacion: body.irradiacion,
      contexto_biopsicosocial: body.contexto_biopsicosocial,
      exploracion_fisica: body.exploracion_fisica,
      tests_ortopedicos: body.tests_ortopedicos,
      dolor_eva: body.dolor_eva,
      mecanismo_lesional: body.mecanismo_lesional,
      comportamiento_dolor: body.comportamiento_dolor,
      dolor_nocturno: body.dolor_nocturno,
      irritabilidad: body.irritabilidad,
      yellow_flags: body.yellow_flags,
      medicacion: body.medicacion,
      nivel_actividad: body.nivel_actividad,
      historial_deportivo: body.historial_deportivo,
      transcripcion: body.transcripcion,
      hipotesis_principal: body.hipotesis_principal,
      contexto_guia: body.contexto_guia,
    }

    const resultado = await generarInforme(modo, datos)
    return NextResponse.json(resultado)
  } catch (error) {
    // Cuota por minuto agotada: la UI lo trata como espera, no como fallo.
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'La IA está saturada. Espera unos segundos.', rate_limit: true },
        { status: 429 },
      )
    }
    console.error('❌ Error en motor clínico:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud clínica' },
      { status: 500 },
    )
  }
}
