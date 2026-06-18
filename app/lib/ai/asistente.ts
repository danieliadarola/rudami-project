// app/lib/ai/asistente.ts
// Herramientas (acciones) que el asistente puede ejecutar. Respeta la RLS:
// recibe el supabase del usuario logueado, así que solo toca lo que él puede.

export interface Ctx { userId: string; clinicaId: string }

// Acciones que NO se ejecutan sin confirmación explícita del fisio.
export const DESTRUCTIVAS = new Set(['eliminar_paciente'])

export const TOOLS = [
  { type: 'function', function: {
    name: 'buscar_paciente',
    description: 'Busca pacientes por nombre, apellidos, teléfono o email. Úsalo para resolver a qué paciente se refiere el usuario.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Texto de búsqueda' } }, required: ['query'] },
  } },
  { type: 'function', function: {
    name: 'listar_citas',
    description: 'Lista las citas de un día (por defecto hoy). Útil para "¿qué citas tengo hoy?".',
    parameters: { type: 'object', properties: { fecha: { type: 'string', description: 'Fecha YYYY-MM-DD; vacío = hoy' } } },
  } },
  { type: 'function', function: {
    name: 'huecos_libres',
    description: 'Devuelve huecos libres de un día entre las 08:00 y 20:00.',
    parameters: { type: 'object', properties: { fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' } }, required: ['fecha'] },
  } },
  { type: 'function', function: {
    name: 'crear_cita',
    description: 'Crea una cita para un paciente. Resuelve el paciente por nombre. El tipo es opcional (Primera valoración, Seguimiento, Tratamiento, Punción seca, Readaptación, Diatermia).',
    parameters: { type: 'object', properties: {
      paciente: { type: 'string', description: 'Nombre o id del paciente' },
      fecha: { type: 'string', description: 'YYYY-MM-DD' },
      hora: { type: 'string', description: 'HH:MM 24h' },
      duracion_min: { type: 'number' },
      tipo: { type: 'string' },
    }, required: ['paciente', 'fecha', 'hora'] },
  } },
  { type: 'function', function: {
    name: 'cancelar_cita',
    description: 'Cancela la próxima cita (o la de una fecha) de un paciente.',
    parameters: { type: 'object', properties: { paciente: { type: 'string' }, fecha: { type: 'string', description: 'YYYY-MM-DD opcional' } }, required: ['paciente'] },
  } },
  { type: 'function', function: {
    name: 'crear_paciente',
    description: 'Crea un paciente nuevo.',
    parameters: { type: 'object', properties: {
      nombre: { type: 'string' }, apellidos: { type: 'string' },
      telefono: { type: 'string' }, email: { type: 'string' }, motivo_consulta: { type: 'string' },
    }, required: ['nombre', 'apellidos'] },
  } },
  { type: 'function', function: {
    name: 'dar_de_alta',
    description: 'Da de alta al paciente: cierra su episodio activo.',
    parameters: { type: 'object', properties: { paciente: { type: 'string' } }, required: ['paciente'] },
  } },
  { type: 'function', function: {
    name: 'eliminar_paciente',
    description: 'Elimina un paciente y todo su historial. Acción destructiva: requiere confirmación.',
    parameters: { type: 'object', properties: { paciente: { type: 'string' } }, required: ['paciente'] },
  } },
] as const

const esUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)

async function resolverPaciente(supabase: any, ctx: Ctx, query: string): Promise<{ id: string; nombre: string } | null> {
  if (esUuid(query)) {
    const { data } = await supabase.from('pacientes').select('id, nombre, apellidos').eq('id', query).maybeSingle()
    return data ? { id: data.id, nombre: `${data.nombre} ${data.apellidos}` } : null
  }
  const { data } = await supabase.from('pacientes')
    .select('id, nombre, apellidos')
    .or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%`).limit(2)
  if (!data?.length) return null
  return { id: data[0].id, nombre: `${data[0].nombre} ${data[0].apellidos}` }
}

export async function ejecutarTool(name: string, args: any, supabase: any, ctx: Ctx): Promise<any> {
  switch (name) {
    case 'buscar_paciente': {
      const { data } = await supabase.from('pacientes')
        .select('id, nombre, apellidos, telefono')
        .or(`nombre.ilike.%${args.query}%,apellidos.ilike.%${args.query}%,telefono.ilike.%${args.query}%`).limit(6)
      return { pacientes: data ?? [] }
    }
    case 'listar_citas': {
      const dia = args.fecha || new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('citas')
        .select('fecha_hora, duracion_min, estado, pacientes(nombre, apellidos), tipos_cita(nombre)')
        .eq('clinica_id', ctx.clinicaId)
        .gte('fecha_hora', `${dia}T00:00:00`).lte('fecha_hora', `${dia}T23:59:59`)
        .neq('estado', 'cancelada').order('fecha_hora')
      return { fecha: dia, citas: (data ?? []).map((c: any) => ({
        hora: new Date(c.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        paciente: `${c.pacientes?.nombre ?? ''} ${c.pacientes?.apellidos ?? ''}`.trim(),
        tipo: c.tipos_cita?.nombre, duracion: c.duracion_min, estado: c.estado,
      })) }
    }
    case 'huecos_libres': {
      const { data } = await supabase.from('citas')
        .select('fecha_hora, duracion_min').eq('clinica_id', ctx.clinicaId)
        .gte('fecha_hora', `${args.fecha}T00:00:00`).lte('fecha_hora', `${args.fecha}T23:59:59`).neq('estado', 'cancelada')
      const ocupados = new Set<string>()
      ;(data ?? []).forEach((c: any) => {
        const ini = new Date(c.fecha_hora); const fin = new Date(ini.getTime() + (c.duracion_min ?? 60) * 60000)
        for (let t = new Date(ini); t < fin; t = new Date(t.getTime() + 30 * 60000)) {
          ocupados.add(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)
        }
      })
      const libres: string[] = []
      for (let h = 8; h < 20; h++) for (const m of ['00', '30']) {
        const s = `${String(h).padStart(2, '0')}:${m}`; if (!ocupados.has(s)) libres.push(s)
      }
      return { fecha: args.fecha, huecos: libres }
    }
    case 'crear_cita': {
      const pac = await resolverPaciente(supabase, ctx, args.paciente)
      if (!pac) return { error: `No encuentro al paciente "${args.paciente}".` }
      let tipo_id = null, dur = args.duracion_min ?? 60
      if (args.tipo) {
        const { data: t } = await supabase.from('tipos_cita').select('id, duracion_min').eq('clinica_id', ctx.clinicaId).ilike('nombre', `%${args.tipo}%`).limit(1).maybeSingle()
        if (t) { tipo_id = t.id; if (!args.duracion_min) dur = t.duracion_min }
      }
      const fecha_hora = new Date(`${args.fecha}T${args.hora}:00`).toISOString()
      const { error } = await supabase.from('citas').insert([{ paciente_id: pac.id, user_id: ctx.userId, clinica_id: ctx.clinicaId, fecha_hora, duracion_min: dur, estado: 'pendiente', tipo_id }])
      return error ? { error: 'No se pudo crear la cita.' } : { ok: true, mensaje: `Cita creada para ${pac.nombre} el ${args.fecha} a las ${args.hora}.` }
    }
    case 'cancelar_cita': {
      const pac = await resolverPaciente(supabase, ctx, args.paciente)
      if (!pac) return { error: `No encuentro al paciente "${args.paciente}".` }
      let q = supabase.from('citas').select('id, fecha_hora').eq('paciente_id', pac.id).neq('estado', 'cancelada')
      q = args.fecha ? q.gte('fecha_hora', `${args.fecha}T00:00:00`).lte('fecha_hora', `${args.fecha}T23:59:59`) : q.gte('fecha_hora', new Date().toISOString())
      const { data } = await q.order('fecha_hora').limit(1)
      if (!data?.length) return { error: 'No hay cita futura para cancelar.' }
      await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', data[0].id)
      return { ok: true, mensaje: `Cita de ${pac.nombre} cancelada.` }
    }
    case 'crear_paciente': {
      const { error } = await supabase.from('pacientes').insert([{ nombre: args.nombre, apellidos: args.apellidos, telefono: args.telefono ?? null, email: args.email ?? null, motivo_consulta: args.motivo_consulta ?? null, user_id: ctx.userId, clinica_id: ctx.clinicaId }])
      return error ? { error: 'No se pudo crear el paciente.' } : { ok: true, mensaje: `Paciente ${args.nombre} ${args.apellidos} creado.` }
    }
    case 'dar_de_alta': {
      const pac = await resolverPaciente(supabase, ctx, args.paciente)
      if (!pac) return { error: `No encuentro al paciente "${args.paciente}".` }
      const { data } = await supabase.from('episodios').select('id').eq('paciente_id', pac.id).eq('estado', 'activo').limit(1)
      if (!data?.length) return { error: `${pac.nombre} no tiene episodio activo.` }
      const hoy = new Date().toISOString().split('T')[0]
      await supabase.from('episodios').update({ estado: 'cerrado', fecha_fin: hoy }).eq('id', data[0].id)
      return { ok: true, mensaje: `${pac.nombre} dado de alta (episodio cerrado).` }
    }
    case 'eliminar_paciente': {
      const pac = await resolverPaciente(supabase, ctx, args.paciente)
      if (!pac) return { error: `No encuentro al paciente "${args.paciente}".` }
      await supabase.from('pacientes').delete().eq('id', pac.id)
      return { ok: true, mensaje: `Paciente ${pac.nombre} eliminado.` }
    }
    default:
      return { error: `Herramienta desconocida: ${name}` }
  }
}
