// app/lib/dashboard/banderas.ts
// Motor de banderas de alerta multifactor (funciones puras, sin I/O).
// Señales clínicamente accionables, no solo "EVA alto".

export type Nivel = 'alto' | 'medio' | 'bajo'

export interface SesionLite {
  episodio_id: string | null
  paciente_id: string | null
  user_id: string | null
  fecha: string | null
  dolor_eva: number | null
  red_flags: string | null
}

export interface EpisodioLite {
  id: string
  paciente_id: string | null
  user_id: string | null
  titulo: string | null
  estado: string | null
  fecha_inicio: string | null
}

export interface CitaLite {
  paciente_id: string | null
  user_id: string | null
  estado: string | null
  fecha_hora: string
}

export interface PacienteRef { id: string; nombre: string; apellidos: string }
export interface FisioRef { id: string; nombre: string; color: string }

export interface Bandera {
  id: string
  pacienteId: string
  paciente: string
  nivel: Nivel
  texto: string
  detalle: string
  fisioNombre: string
  fisioColor: string
}

const NIVEL_ORDEN: Record<Nivel, number> = { alto: 0, medio: 1, bajo: 2 }

const DIA_MS = 86_400_000

/** ¿El texto de red_flags indica realmente una bandera? Filtra los "no hay". */
function redFlagSignificativa(texto: string | null): string | null {
  if (!texto) return null
  const t = texto.trim()
  if (!t) return null
  const neg = /no se identifican|no hay|ninguna|sin red flags|^no$|^-$|^—$/i
  if (neg.test(t)) return null
  return t.replace(/\s+/g, ' ').slice(0, 90)
}

export interface ConstruirInput {
  episodios: EpisodioLite[]
  sesiones: SesionLite[]
  citas: CitaLite[]
  pacientes: PacienteRef[]
  fisios: FisioRef[]
  hoy?: Date
  limite?: number
  /** Días para considerar un episodio "crónico" sin alta. */
  diasCronicidad?: number
  /** Nº de sesiones recientes a evaluar para "EVA sin mejora". */
  ventanaSesiones?: number
}

export function construirBanderas(input: ConstruirInput): Bandera[] {
  const {
    episodios, sesiones, citas, pacientes, fisios,
    hoy = new Date(), limite = 6, diasCronicidad = 60, ventanaSesiones = 3,
  } = input

  const pacIdx = new Map(pacientes.map(p => [p.id, p]))
  const fisIdx = new Map(fisios.map(f => [f.id, f]))
  const nombrePac = (id?: string | null) => {
    const p = id ? pacIdx.get(id) : undefined
    return p ? `${p.nombre} ${p.apellidos}`.trim() : 'Paciente'
  }
  const fisio = (id?: string | null) => {
    const f = id ? fisIdx.get(id) : undefined
    return { nombre: f?.nombre ?? '', color: f?.color ?? '#3b82f6' }
  }

  const candidatas: Bandera[] = []
  const episodiosActivos = episodios.filter(e => e.estado === 'activo')

  // ── 1) Red flags de IA (máxima prioridad) ──
  const epById = new Map(episodios.map(e => [e.id, e]))
  const redVistas = new Set<string>()
  for (const s of sesiones) {
    const rf = redFlagSignificativa(s.red_flags)
    if (!rf || !s.episodio_id || redVistas.has(s.episodio_id)) continue
    redVistas.add(s.episodio_id)
    const ep = epById.get(s.episodio_id)
    if (ep && ep.estado !== 'activo') continue   // solo episodios en curso
    const f = fisio(s.user_id ?? ep?.user_id)
    candidatas.push({
      id: `rf-${s.episodio_id}`,
      pacienteId: s.paciente_id ?? '',
      paciente: nombrePac(s.paciente_id),
      nivel: 'alto',
      texto: `Red flag detectada: ${rf}`,
      detalle: ep?.titulo ?? 'Episodio',
      fisioNombre: f.nombre, fisioColor: f.color,
    })
  }

  // ── 2) EVA sin mejora dentro del episodio activo ──
  for (const ep of episodiosActivos) {
    const ses = sesiones
      .filter(s => s.episodio_id === ep.id && s.dolor_eva != null && s.fecha)
      .sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1))
    if (ses.length < ventanaSesiones) continue
    const ventana = ses.slice(-ventanaSesiones)
    const inicial = ventana[0].dolor_eva as number
    const ultima = ventana[ventana.length - 1].dolor_eva as number
    // Sin mejora = no baja al menos 1 punto, y dolor aún relevante.
    if (ultima >= 6 && ultima >= inicial - 1) {
      const f = fisio(ep.user_id)
      candidatas.push({
        id: `eva-${ep.id}`,
        pacienteId: ep.paciente_id ?? '',
        paciente: nombrePac(ep.paciente_id),
        nivel: ultima >= 8 ? 'alto' : 'medio',
        texto: `EVA ${ultima} sin mejora en ${ventana.length} sesiones`,
        detalle: ep.titulo ?? 'Episodio',
        fisioNombre: f.nombre, fisioColor: f.color,
      })
    }
  }

  // ── 3) Citas canceladas seguidas (adherencia) ──
  const porPaciente = new Map<string, CitaLite[]>()
  for (const c of citas) {
    if (!c.paciente_id) continue
    const arr = porPaciente.get(c.paciente_id) ?? []
    arr.push(c)
    porPaciente.set(c.paciente_id, arr)
  }
  for (const [pacId, arr] of porPaciente) {
    const ordenadas = arr
      .filter(c => c.estado !== 'pendiente')
      .sort((a, b) => (a.fecha_hora > b.fecha_hora ? -1 : 1)) // más reciente primero
    let racha = 0
    for (const c of ordenadas) {
      if (c.estado === 'cancelada') racha++
      else break
    }
    if (racha >= 2) {
      const f = fisio(ordenadas[0]?.user_id)
      candidatas.push({
        id: `cancel-${pacId}`,
        pacienteId: pacId,
        paciente: nombrePac(pacId),
        nivel: 'medio',
        texto: `${racha} citas canceladas seguidas`,
        detalle: 'Adherencia',
        fisioNombre: f.nombre, fisioColor: f.color,
      })
    }
  }

  // ── 4) Cronicidad: episodio activo sin alta > N días ──
  for (const ep of episodiosActivos) {
    if (!ep.fecha_inicio) continue
    const dias = Math.floor((hoy.getTime() - new Date(ep.fecha_inicio).getTime()) / DIA_MS)
    if (dias > diasCronicidad) {
      const f = fisio(ep.user_id)
      candidatas.push({
        id: `cron-${ep.id}`,
        pacienteId: ep.paciente_id ?? '',
        paciente: nombrePac(ep.paciente_id),
        nivel: 'bajo',
        texto: `Episodio activo +${dias} días`,
        detalle: ep.titulo ?? 'Episodio',
        fisioNombre: f.nombre, fisioColor: f.color,
      })
    }
  }

  // Dedup por paciente: nos quedamos con la bandera de mayor severidad.
  const mejorPorPac = new Map<string, Bandera>()
  for (const b of candidatas) {
    const prev = mejorPorPac.get(b.pacienteId)
    if (!prev || NIVEL_ORDEN[b.nivel] < NIVEL_ORDEN[prev.nivel]) {
      mejorPorPac.set(b.pacienteId, b)
    }
  }

  return Array.from(mejorPorPac.values())
    .sort((a, b) => NIVEL_ORDEN[a.nivel] - NIVEL_ORDEN[b.nivel])
    .slice(0, limite)
}
