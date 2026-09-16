// app/api/mi/chat/route.ts
// Asistente del paciente con SESIÓN (app /mi). Gemelo de /api/guia, que
// autoriza por token; aquí autoriza la RPC mi_chat_insertar por identidad:
//   · paciente de clínica  → historial en guia_chat, límite de la clínica.
//   · usuario independiente → historial en app_chat, solo Premium, 10/día.
// El contexto que ve el modelo es SOLO lo que ya ve el paciente en pantalla
// (mi_plan / mi_programa), nunca las tablas.

import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { generarInforme, RateLimitError } from '@/app/lib/ai'
import type { PlanPaciente, ProgramaDetalle, TarjetaPrograma, MensajeChat } from '@/app/lib/paciente/tipos'

type EjercicioCtx = {
  nombre: string | null; instrucciones: string | null; series: number | null; repeticiones: string | null
  frecuencia: string | null; descanso: string | null; errores: string | null; consejos: string | null; nota: string | null
}
const ctxEjercicio = (e: EjercicioCtx) => ({
  nombre: e.nombre, instrucciones: e.instrucciones, series: e.series, repeticiones: e.repeticiones,
  frecuencia: e.frecuencia, descanso: e.descanso, errores: e.errores, consejos: e.consejos, nota: e.nota,
})

export async function POST(request: Request) {
  try {
    const { pregunta } = await request.json()
    if (typeof pregunta !== 'string' || !pregunta.trim() || pregunta.length > 500) {
      return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })

    // 1) Registrar la pregunta: la RPC decide si puede (plan, límite diario).
    const { data: reg } = await supabase.rpc('mi_chat_insertar', { p_rol: 'paciente', p_texto: pregunta.trim() })
    if (!reg?.ok) {
      if (reg?.limite) {
        return NextResponse.json({ limite: true, respuesta: 'Has llegado al límite de preguntas de hoy. Mañana podrás seguir preguntando — y si es algo importante, contacta con tu clínica o con un profesional.' })
      }
      if (reg?.premium) return NextResponse.json({ error: 'El asistente es Premium' }, { status: 403 })
      if (reg?.sin_plan) return NextResponse.json({ respuesta: 'Todavía no tienes un plan publicado. En cuanto tu fisioterapeuta lo publique podré ayudarte con él.' })
      return NextResponse.json({ error: 'No disponible' }, { status: 404 })
    }

    // 2) Contexto: lo mismo que ve el paciente, y nada más.
    const { data: cuenta } = await supabase.rpc('mi_cuenta')
    const esClinica = cuenta?.tipo === 'clinica'
    let contexto: Record<string, unknown>

    if (esClinica) {
      const { data } = await supabase.rpc('mi_plan')
      const p = data as PlanPaciente | null
      const i = p?.informe
      contexto = {
        paciente: p?.paciente?.nombre,
        resumen: i?.resumen, explicacion: i?.explicacion,
        que_esperar: i?.que_esperar, recomendaciones: i?.recomendaciones,
        ejercicios: (p?.ejercicios ?? []).map(ctxEjercicio),
        faq: i?.faq ?? null,
      }
    } else {
      const { data: rutinas } = await supabase.rpc('mi_rutinas')
      const activas = ((rutinas as TarjetaPrograma[] | null) ?? []).filter((r) => r.activo).slice(0, 3)
      const detalles = await Promise.all(activas.map((r) => supabase.rpc('mi_programa', { p_id: r.id })))
      contexto = {
        usuario: cuenta?.nombre,
        programas: detalles.map(({ data }) => {
          const d = data as ProgramaDetalle | null
          return d ? {
            titulo: d.programa.titulo, descripcion: d.programa.descripcion, semanas: d.programa.semanas,
            semana_actual: d.programa.semana_actual, frecuencia: d.programa.frecuencia,
            ejercicios: d.ejercicios.map(ctxEjercicio),
          } : null
        }).filter(Boolean),
      }
    }

    const { data: hist } = await supabase.rpc('mi_chat')
    const historial = ((hist as MensajeChat[] | null) ?? []).slice(-9, -1)
      .map((m) => `${m.rol === 'paciente' ? 'Paciente' : 'Asistente'}: ${m.texto}`).join('\n')

    // 3) Generar con guardarraíles.
    let respuesta: string
    try {
      const resultado = await generarInforme('guia_chat', {
        contexto_guia: JSON.stringify(contexto),
        historial_chat: historial,
        pregunta_paciente: pregunta.trim(),
        modo_app: esClinica ? 'clinica' : 'independiente',
      })
      respuesta = 'respuesta_guia' in resultado && resultado.respuesta_guia
        ? resultado.respuesta_guia
        : 'Ahora mismo no puedo responderte. Si tienes dudas sobre un ejercicio, ve con cuidado y consúltalo con un profesional.'
    } catch (e) {
      respuesta = e instanceof RateLimitError
        ? 'El asistente está muy solicitado ahora mismo. Prueba en un minuto.'
        : 'Ahora mismo no puedo responderte. Inténtalo en un momento.'
    }

    // 4) Guardar la respuesta.
    await supabase.rpc('mi_chat_insertar', { p_rol: 'ia', p_texto: respuesta })

    return NextResponse.json({ respuesta, restantes: reg.restantes ?? null })
  } catch (error) {
    console.error('Error en /api/mi/chat:', error)
    return NextResponse.json({ error: 'Error al procesar la pregunta' }, { status: 500 })
  }
}
