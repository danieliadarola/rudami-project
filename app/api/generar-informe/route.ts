// app/api/generar-informe/route.ts
// Endpoint del motor de razonamiento clínico.
// Toda la lógica de IA vive en app/lib/ai/ (proveedor desacoplado).

import { NextResponse } from 'next/server'
import { generarInforme } from '@/app/lib/ai'
import type { DatosClinicos, ModoIA } from '@/app/lib/ai'

export async function POST(request: Request) {
  console.log('🧠 Motor de razonamiento clínico activado')
  try {
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
    }

    const resultado = await generarInforme(modo, datos)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error('❌ Error en motor clínico:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud clínica' },
      { status: 500 },
    )
  }
}
