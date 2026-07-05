// app/api/guia/route.ts
// Copiloto del paciente en su guía pública /r/[token].
// Público pero acotado: el token identifica el plan, el rate limit (12/día)
// vive en la RPC guia_chat_insertar y el prompt tiene guardarraíles clínicos.

import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { generarInforme } from '@/app/lib/ai'

export async function POST(request: Request) {
  try {
    const { token, pregunta } = await request.json()
    if (!token || typeof pregunta !== 'string' || !pregunta.trim() || pregunta.length > 500) {
      return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1) Registrar la pregunta (valida token + rate limit en la RPC)
    const { data: reg } = await supabase.rpc('guia_chat_insertar', {
      p_token: token, p_rol: 'paciente', p_texto: pregunta.trim(),
    })
    if (!reg?.ok) {
      if (reg?.limite) {
        return NextResponse.json({ limite: true, respuesta: 'Has llegado al límite de preguntas de hoy. Mañana podrás seguir preguntando — y si es algo importante, contacta con tu clínica.' })
      }
      return NextResponse.json({ error: 'Guía no disponible' }, { status: 404 })
    }

    // 2) Contexto: el plan publicado (misma RPC pública, sin datos internos)
    const { data } = await supabase.rpc('informe_publico', { p_token: token })
    if (!data?.informe) return NextResponse.json({ error: 'Guía no disponible' }, { status: 404 })

    const i = data.informe
    const contexto = {
      paciente: data.paciente?.nombre,
      resumen: i.resumen, explicacion: i.explicacion,
      que_esperar: i.que_esperar, recomendaciones: i.recomendaciones,
      ejercicios: (data.ejercicios ?? []).map((e: any) => ({
        nombre: e.nombre, instrucciones: e.instrucciones, series: e.series,
        repeticiones: e.repeticiones, frecuencia: e.frecuencia, descanso: e.descanso,
        errores: e.errores, consejos: e.consejos, nota: e.nota,
      })),
      faq: i.faq ?? null,
    }
    const historial = (data.chat ?? []).slice(-8)
      .map((m: any) => `${m.rol === 'paciente' ? 'Paciente' : 'Asistente'}: ${m.texto}`).join('\n')

    // 3) Generar respuesta con guardarraíles
    const resultado = await generarInforme('guia_chat', {
      contexto_guia: JSON.stringify(contexto),
      historial_chat: historial,
      pregunta_paciente: pregunta.trim(),
    })
    const respuesta = 'respuesta_guia' in resultado && resultado.respuesta_guia
      ? resultado.respuesta_guia
      : 'Ahora mismo no puedo responderte. Si tienes dudas sobre un ejercicio, ve con cuidado y pregunta a tu fisioterapeuta en la próxima sesión.'

    // 4) Guardar la respuesta en el historial
    await supabase.rpc('guia_chat_insertar', { p_token: token, p_rol: 'ia', p_texto: respuesta })

    return NextResponse.json({ respuesta, restantes: reg.restantes ?? null })
  } catch (error) {
    console.error('Error en /api/guia:', error)
    return NextResponse.json({ error: 'Error al procesar la pregunta' }, { status: 500 })
  }
}
