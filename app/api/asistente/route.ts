// app/api/asistente/route.ts — Orquestador del asistente con function-calling (Groq).
// Ejecuta acciones seguras sobre Supabase con la sesión del usuario (respeta RLS).

import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/app/lib/supabase-server'
import { TOOLS, DESTRUCTIVAS, ejecutarTool, type Ctx } from '@/app/lib/ai/asistente'
import { MODELO } from '@/app/lib/ai/groq'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

/** Fecha de hoy en horario de España (evita desfase por UTC de madrugada). */
function hoyMadrid() {
  const f = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()) // YYYY-MM-DD
  return { iso, largo: f }
}

/** Etiqueta legible del paso que el asistente está dando (traza de pensamiento). */
function pasoLabel(name: string, a: any): string {
  switch (name) {
    case 'buscar_paciente': return `Buscando a «${a.query ?? ''}»`
    case 'listar_citas': return `Consultando las citas ${a.fecha ? 'del ' + a.fecha : 'de hoy'}`
    case 'huecos_libres': return `Revisando huecos libres del ${a.fecha}`
    case 'crear_cita': return `Agendando la cita de ${a.paciente ?? 'paciente'}`
    case 'cancelar_cita': return `Buscando la cita de ${a.paciente ?? 'paciente'} para cancelarla`
    case 'crear_paciente': return `Creando a ${a.nombre ?? ''} ${a.apellidos ?? ''}`.trim()
    case 'dar_de_alta': return `Dando de alta a ${a.paciente ?? 'paciente'}`
    case 'eliminar_paciente': return `Preparando la eliminación de ${a.paciente ?? 'paciente'}`
    default: return 'Pensando'
  }
}

function buildSystem() {
  const hoy = hoyMadrid()
  return `Eres el copiloto de RuDaMi, una app de gestión para fisioterapeutas, en español de España. Ayudas al fisio a gestionar su agenda y sus pacientes con lenguaje natural, ejecutando acciones mediante herramientas.

CONTEXTO
- Hoy es ${hoy.largo} (${hoy.iso}). Interpreta fechas relativas ("mañana", "el martes que viene", "en dos semanas") y conviértelas a YYYY-MM-DD antes de llamar a una herramienta.

RAZONAMIENTO
- Piensa antes de actuar: decide qué herramienta necesitas y con qué argumentos. Encadena varias si hace falta (p. ej. buscar_paciente → huecos_libres → crear_cita).
- Si falta un dato imprescindible (hora de una cita, fecha…), pregunta UNA cosa concreta en vez de inventarlo o de asumir.
- Ante ambigüedad real ("agenda a Elena"), aclara antes de actuar; no adivines.

RESOLUCIÓN DE PACIENTE
- Cuando una acción se refiera a un paciente, usa SIEMPRE buscar_paciente primero.
- Si hay un único candidato claro, sigue. Si hay varios, lístalos brevemente y pregunta cuál. Si el usuario ya lo confirmó antes en la conversación, no vuelvas a preguntar.
- Si NO aparece ningún paciente parecido, NO lo crees por tu cuenta: ofrece crearlo y espera confirmación explícita.

ACCIONES DELICADAS
- Para eliminar un paciente NO ejecutes sin que el sistema pida confirmación; describe lo que vas a hacer.

ESTILO
- Conciso, profesional y cálido. Sin emojis.
- Confirma lo hecho en una frase ("Cita creada para Elena Castro el jueves a las 10:00").
- Presenta listas de forma escaneable: una línea por cita/hueco, con la hora primero y el nombre en negrita con **asteriscos**. No vuelques JSON ni ids.
- Si no hay resultados, dilo con naturalidad y sugiere el siguiente paso.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const { data: perfil } = await supabase.from('perfiles').select('clinica_id').eq('id', user.id).single()
    const ctx: Ctx = { userId: user.id, clinicaId: perfil?.clinica_id }

    if (body.confirmar?.name) {
      const res = await ejecutarTool(body.confirmar.name, body.confirmar.args, supabase, ctx)
      return NextResponse.json({ mensaje: res.mensaje || (res.error ?? 'Hecho.') })
    }

    const messages: any[] = [{ role: 'system', content: buildSystem() }, ...(body.messages ?? [])]
    const pasos: string[] = [] // traza de pensamiento para mostrar en la UI

    for (let i = 0; i < 5; i++) {
      const completion = await client.chat.completions.create({
        model: MODELO,
        messages, tools: TOOLS as any, tool_choice: 'auto', temperature: 0.2, max_tokens: 900,
        reasoning_effort: 'low',
      })
      const msg = completion.choices[0]?.message
      if (!msg) break
      const calls = msg.tool_calls ?? []

      if (!calls.length) {
        return NextResponse.json({ mensaje: msg.content ?? 'De acuerdo.', pasos })
      }

      const destructiva = calls.find(c => DESTRUCTIVAS.has(c.function.name))
      if (destructiva) {
        const args = JSON.parse(destructiva.function.arguments || '{}')
        pasos.push(pasoLabel(destructiva.function.name, args))
        return NextResponse.json({
          pendiente: { name: destructiva.function.name, args },
          mensaje: `Vas a eliminar al paciente "${args.paciente}" y todo su historial. ¿Confirmas?`,
          pasos,
        })
      }

      messages.push(msg)
      for (const c of calls) {
        const args = (() => { try { return JSON.parse(c.function.arguments || '{}') } catch { return {} } })()
        pasos.push(pasoLabel(c.function.name, args))
        let result: any
        try { result = await ejecutarTool(c.function.name, args, supabase, ctx) }
        catch { result = { error: 'Error ejecutando la acción.' } }
        messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) })
      }
    }

    return NextResponse.json({ mensaje: 'No he podido completar la acción, ¿puedes reformular?', pasos })
  } catch (e) {
    console.error('asistente error', e)
    return NextResponse.json({ error: 'Error en el asistente.' }, { status: 500 })
  }
}
