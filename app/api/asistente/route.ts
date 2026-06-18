// app/api/asistente/route.ts — Orquestador del asistente con function-calling (Groq).
// Ejecuta acciones seguras sobre Supabase con la sesión del usuario (respeta RLS).

import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/app/lib/supabase-server'
import { TOOLS, DESTRUCTIVAS, ejecutarTool, type Ctx } from '@/app/lib/ai/asistente'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM = `Eres el asistente de RuDaMi, una app de gestión para fisioterapeutas, en español.
Ayudas al fisio a gestionar su agenda y pacientes mediante lenguaje natural y herramientas.
Reglas:
- Hoy es ${new Date().toISOString().split('T')[0]}. Interpreta fechas relativas ("mañana", "el martes") y conviértelas a YYYY-MM-DD.
- Si falta un dato imprescindible (p. ej. la hora de una cita), pregunta brevemente en vez de inventarlo.
- Sé conciso y directo. Confirma lo que has hecho en una frase.
- Para acciones destructivas (eliminar paciente) NO las ejecutes sin que el sistema confirme; describe lo que vas a hacer.
- RESOLUCIÓN DE PACIENTE: cuando una acción se refiera a un paciente (agendar cita, dar de alta, etc.), usa SIEMPRE buscar_paciente primero. Si encuentras uno o varios candidatos, confirma con el usuario de quién se trata ANTES de actuar (por ejemplo: "¿Te refieres a Verónica García?"). Si hay varios, lístalos y pregunta cuál.
- Si NO encuentras ningún paciente parecido, NO crees uno automáticamente: pregunta al usuario si quiere crear un paciente nuevo con ese nombre y espera su confirmación explícita antes de usar crear_paciente.`

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

    const messages: any[] = [{ role: 'system', content: SYSTEM }, ...(body.messages ?? [])]

    for (let i = 0; i < 5; i++) {
      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages, tools: TOOLS as any, tool_choice: 'auto', temperature: 0.2, max_tokens: 900,
      })
      const msg = completion.choices[0]?.message
      if (!msg) break
      const calls = msg.tool_calls ?? []

      if (!calls.length) {
        return NextResponse.json({ mensaje: msg.content ?? 'De acuerdo.' })
      }

      const destructiva = calls.find(c => DESTRUCTIVAS.has(c.function.name))
      if (destructiva) {
        const args = JSON.parse(destructiva.function.arguments || '{}')
        return NextResponse.json({
          pendiente: { name: destructiva.function.name, args },
          mensaje: `Vas a eliminar al paciente "${args.paciente}" y todo su historial. ¿Confirmas?`,
        })
      }

      messages.push(msg)
      for (const c of calls) {
        let result: any
        try { result = await ejecutarTool(c.function.name, JSON.parse(c.function.arguments || '{}'), supabase, ctx) }
        catch { result = { error: 'Error ejecutando la acción.' } }
        messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) })
      }
    }

    return NextResponse.json({ mensaje: 'No he podido completar la acción, ¿puedes reformular?' })
  } catch (e) {
    console.error('asistente error', e)
    return NextResponse.json({ error: 'Error en el asistente.' }, { status: 500 })
  }
}
