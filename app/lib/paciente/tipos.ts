// app/lib/paciente/tipos.ts
// Contrato de lo que devuelven las RPCs del paciente.
//
// Estos tipos son el espejo EXACTO de la lista blanca de
// supabase/migrations/20260902100000_paciente_identidad.sql (guia_payload).
// Si se añade un campo allí, se añade aquí; si no está aquí, no viaja.

/** Un ejercicio prescrito, tal y como se congeló al publicar la guía. */
export interface EjercicioGuia {
  id: string
  nombre: string | null
  instrucciones: string | null
  musculos: string | null
  series: number | null
  repeticiones: string | null
  frecuencia: string | null
  descanso: string | null
  duracion: string | null
  errores: string | null
  consejos: string | null
  /** Nota manuscrita del fisio para este paciente. */
  nota: string | null
  imagen_url: string | null
  gif_url: string | null
  video_url: string | null
  orden: number | null
}

/** Fase de "qué podemos esperar" de la recuperación. */
export interface FaseGuia {
  fase?: number
  titulo?: string
  descripcion?: string
}

export interface RecomendacionGuia {
  icono?: string
  texto?: string
}

/** Métricas de la sesión que el fisio decidió compartir con el paciente. */
export interface MetricasGuia {
  dolor_ini?: number | null
  dolor_fin?: number | null
  movilidad?: number | null
  fuerza?: number | null
  rigidez?: number | null
  fatiga?: number | null
  sueno?: number | null
  adherencia?: number | null
}

export interface FaqGuia {
  generales?: { pregunta?: string; respuesta?: string }[]
  ejercicios?: { nombre?: string; como_hacerlo?: string; sensacion_normal?: string }[]
}

/** El informe, sin una sola columna interna. Nótese lo que NO está:
 *  notas_fisio, token, paciente_id, episodio_id, sesion_id, clinica_id, fisio_id. */
export interface InformeGuia {
  id: string
  fecha: string | null
  resumen: string | null
  explicacion: string | null
  que_esperar: FaseGuia[] | null
  recomendaciones: RecomendacionGuia[] | null
  motivacion: string | null
  metricas: MetricasGuia | null
  faq: FaqGuia | null
}

export interface MensajeChat {
  rol: 'paciente' | 'ia'
  texto: string
}

/** Lo que devuelven informe_publico(token) y mi_plan(). Misma forma a propósito:
 *  la UI no distingue si entraste por enlace o con tu cuenta. */
export interface PlanPaciente {
  informe: InformeGuia
  paciente: { nombre: string | null; apellidos: string | null } | null
  fisio: { nombre: string | null; apellidos: string | null } | null
  clinica: { nombre: string | null } | null
  ejercicios: EjercicioGuia[]
  /** Un registro por ejercicio y día marcado. */
  checks: { ejercicio_id: string; fecha: string }[]
  checkins: { fecha: string; dolor: number }[]
  chat: MensajeChat[]
  /** Fecha de hoy según el servidor, en Europe/Madrid. Nunca usar la del
   *  dispositivo: el móvil del paciente puede tener otra zona horaria. */
  hoy: string
}

/** Portada de la app del paciente (RPC mi_resumen). */
export interface ResumenPaciente {
  paciente: { nombre: string | null; apellidos: string | null }
  clinica: { nombre: string | null; telefono: string | null } | null
  hoy: string
  proxima_cita: {
    fecha_hora: string
    duracion_min: number | null
    tipo: string | null
    color: string | null
  } | null
  episodios_activos: number
  tiene_plan: boolean
}

/** Resultado de paciente_vincular(token). */
export type ResultadoVinculo =
  | { ok: true; ya_vinculado?: boolean }
  | { ok: false; motivo: 'sin_sesion' | 'sin_email' | 'no_coincide' | 'ya_reclamado' }
