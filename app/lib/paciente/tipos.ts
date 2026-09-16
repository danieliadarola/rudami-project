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

/** Una sesión clínica vista por el paciente: la fecha y SIETE números.
 *  Espejo exacto de la lista blanca de mi_progreso() — si aquí apareciera
 *  un campo de texto, algo se ha roto en la migración, no aquí. */
export interface SesionProgreso {
  fecha: string
  /** dolor_eva medido por el fisio en consulta (0-10). */
  dolor: number | null
  movilidad: number | null
  fuerza: number | null
  rigidez: number | null
  fatiga: number | null
  sueno: number | null
  adherencia: number | null
}

/** Pantalla de progreso (RPC mi_progreso). */
export interface ProgresoPaciente {
  hoy: string
  /** El episodio activo (o el último, si no hay activo). */
  episodio: {
    titulo: string | null
    fecha_inicio: string | null
    fecha_fin: string | null
    estado: string | null
  } | null
  /** Métricas de sesión del episodio, en orden cronológico. */
  sesiones: SesionProgreso[]
  /** Dolor diario contado por el paciente (180 días). */
  checkins: { fecha: string; dolor: number }[]
  /** Ejercicios marcados por día (180 días). */
  checks_por_dia: { fecha: string; hechos: number }[]
  /** Ejercicios del plan vigente: denominador de la adherencia. */
  ejercicios_dia: number
}

/** Resultado de paciente_vincular(token). */
export type ResultadoVinculo =
  | { ok: true; ya_vinculado?: boolean }
  | { ok: false; motivo: 'sin_sesion' | 'sin_email' | 'no_coincide' | 'ya_reclamado' }

/* ────────────────────────────────────────────────────────────────────
   App v2 (16/09/2026): cuentas Free / Premium / Clinic, biblioteca de
   programas, citas con solicitud y chat por identidad.
   Espejo de supabase/migrations/20260916100000_app_paciente_cuentas_programas_citas.sql
   ──────────────────────────────────────────────────────────────────── */

/** 'clinica' = Premium incluido por la clínica · 'premium' · 'free' */
export type EstadoPlan = 'clinica' | 'premium' | 'free'

/** RPC mi_cuenta(): quién soy y en qué situación estoy. */
export interface CuentaPaciente {
  tipo: 'clinica' | 'independiente'
  nombre: string | null
  apellidos: string | null
  email: string | null
  hoy: string
  plan: { estado: EstadoPlan; hasta: string | null; interes: boolean }
  objetivo_semanal: number
  clinica: { nombre: string | null; telefono: string | null; direccion: string | null } | null
  /** Sesiones y caducidad. Sin precio, a propósito. */
  bono: { titulo: string | null; total: number | null; usadas: number | null; caducidad: string | null } | null
  tiene_plan_fisio: boolean
}

/** ¿Tiene acceso a lo Premium? La clínica lo incluye. */
export const esPremium = (c: Pick<CuentaPaciente, 'plan'> | null | undefined): boolean =>
  c?.plan.estado === 'clinica' || c?.plan.estado === 'premium'

/** Tarjeta de un programa de la biblioteca (programa_tarjeta_json). */
export interface TarjetaPrograma {
  id: string
  slug: string
  titulo: string
  descripcion: string | null
  zona: string | null
  nivel: string | null
  semanas: number
  frecuencia: string | null
  premium: boolean
  imagen_url: string | null
  n_ejercicios: number
  inscrito: boolean
  activo: boolean
  iniciado_en: string | null
  semana_actual: number | null
  hechos_hoy: number
}

/** Ejercicio de programa: misma forma que EjercicioGuia más tres campos de catálogo. */
export interface EjercicioPrograma extends EjercicioGuia {
  zona?: string | null
  nivel?: string | null
  equipo?: string | null
}

/** RPC mi_programa(id). */
export interface ProgramaDetalle {
  programa: TarjetaPrograma
  ejercicios: EjercicioPrograma[]
  checks: { ejercicio_id: string; fecha: string }[]
  hoy: string
}

/** RPC mi_ejercicio(id) y mi_ejercicio_plan(id). */
export interface EjercicioDetalle {
  ejercicio: EjercicioPrograma
  programa: { id: string; titulo: string }
  faq?: { como_hacerlo?: string; sensacion_normal?: string } | null
  hecho_hoy: boolean
  hoy: string
}

/** Una cita vista por el paciente (RPC mi_citas). Sin notas del fisio. */
export interface CitaPaciente {
  id: string
  fecha_hora: string
  duracion_min: number | null
  estado: 'pendiente' | 'confirmada' | 'cancelada' | string
  tipo: string | null
  color: string | null
  fisio: string | null
  solicitud: { tipo: 'cambio' | 'cancelacion'; estado: 'pendiente' | 'aceptada' | 'rechazada' } | null
}

export interface CitasPaciente {
  hoy: string
  citas: CitaPaciente[]
}

/** Aviso unidireccional de la clínica (RPC mi_avisos). */
export interface AvisoPaciente {
  id: string
  texto: string
  autor: string | null
  fecha: string
  leido: boolean
}

/** RPC mi_estadisticas(): los números del perfil. */
export interface EstadisticasPaciente {
  objetivo_semanal: number
  dias_esta_semana: number
  dias_activos_30: number
  ejercicios_30: number
  rutinas_activas: number
  mejora_dolor_pct: number | null
}
