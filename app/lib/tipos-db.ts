// app/lib/tipos-db.ts
// Forma de las filas que devuelve Supabase, escrita a mano.
//
// POR QUÉ A MANO Y NO GENERADO
// Supabase sabe generar estos tipos (`supabase gen types`), pero eso ata el
// proyecto a tener la CLI instalada y el esquema sincronizado. Aquí son nueve
// tablas que cambian poco, así que se escriben y se revisan a ojo.
//
// PARA QUÉ SIRVE DE VERDAD
// No es decoración: antes estas filas viajaban como `any` por las pantallas de
// la clínica, y con `any` un `paciente.nombres` (en plural, mal escrito) compila
// igual y aparece vacío en pantalla sin que nadie se entere. Con estos tipos,
// ese fallo lo caza el editor antes de guardar.
//
// REGLA AL AMPLIARLOS
// Si añades una columna en una migración, añádela también aquí. Si un `select`
// pide menos columnas de las que hay, usa `Pick<Paciente, 'id' | 'nombre'>` en
// vez de inventar un tipo nuevo.

/** Las columnas que Postgres permite nulas llegan como `null`, no como undefined. */

export interface Clinica {
  id: string
  nombre: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  created_at: string
  limite_chat_dia: number | null
}

export interface Perfil {
  id: string
  clinica_id: string | null
  nombre: string | null
  apellidos: string | null
  rol: string | null
  numero_colegiado: string | null
  created_at: string
  color: string | null
}

export interface Paciente {
  id: string
  nombre: string | null
  apellidos: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  email: string | null
  genero: string | null
  ocupacion: string | null
  motivo_consulta: string | null
  antecedentes: string | null
  created_at: string
  /** OJO: es el fisio propietario de la ficha, no el paciente. */
  user_id: string | null
  clinica_id: string | null
  /** Usuario de Auth del paciente en la app /mi. */
  auth_user_id: string | null
}

export interface Episodio {
  id: string
  paciente_id: string
  user_id: string | null
  titulo: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: string | null
  created_at: string
  clinica_id: string | null
}

/** Historia clínica. Casi nada de esto puede salir hacia el paciente: lo que
 *  sí puede está enumerado en las RPC `mi_*` de supabase/migrations. */
export interface Sesion {
  id: string
  paciente_id: string
  episodio_id: string | null
  clinica_id: string | null
  user_id: string | null
  fecha: string
  tipo: string | null
  anamnesis: string | null
  exploracion_fisica: string | null
  dolor_eva: number | null
  movilidad: number | null
  fuerza: number | null
  rigidez: number | null
  fatiga: number | null
  sueno: number | null
  adherencia: number | null
  diagnostico_ia: string | null
  plan_tratamiento_ia: string | null
  red_flags: string | null
  notas: string | null
  factores_agravantes: string | null
  factores_calmantes: string | null
  irradiacion: string | null
  contexto_biopsicosocial: string | null
  tests_ortopedicos: string | null
  hipotesis_principal: string | null
  derivacion: boolean | null
  antecedentes_personales: string | null
  antecedentes_familiares: string | null
  created_at: string
}

/** Las métricas que el fisio puntúa de 0 a 10 y comparte con el paciente. */
export interface MetricasInforme {
  dolor_ini?: number | null
  dolor_fin?: number | null
  movilidad?: number | null
  fuerza?: number | null
  rigidez?: number | null
  fatiga?: number | null
  sueno?: number | null
  adherencia?: number | null
}

export interface FaseEsperar {
  fase?: number
  titulo?: string
  descripcion?: string
}

export interface Recomendacion {
  icono?: string
  texto?: string
}

export interface FaqInforme {
  generales?: { pregunta?: string; respuesta?: string }[]
  ejercicios?: { nombre?: string; como_hacerlo?: string; sensacion_normal?: string }[]
}

export interface Informe {
  id: string
  paciente_id: string
  episodio_id: string | null
  sesion_id: string | null
  clinica_id: string | null
  fisio_id: string | null
  fecha: string | null
  tipo_sesion: string | null
  duracion_min: number | null
  numero_sesion: number | null
  total_sesiones: number | null
  resumen: string | null
  explicacion: string | null
  que_esperar: FaseEsperar[] | null
  recomendaciones: Recomendacion[] | null
  motivacion: string | null
  metricas: MetricasInforme | null
  faq: FaqInforme | null
  estado: string | null
  /** Credencial del enlace público. Nunca debe salir hacia el paciente. */
  token: string | null
  notas_fisio: string | null
  publicado_at: string | null
  created_at: string
  updated_at: string | null
}

/** Un ejercicio tal y como quedó congelado al publicar el informe. */
export interface InformeEjercicio {
  id: string
  informe_id: string
  nombre: string | null
  instrucciones: string | null
  musculos: string | null
  nivel: string | null
  series: number | null
  repeticiones: string | null
  frecuencia: string | null
  descanso: string | null
  duracion: string | null
  errores: string | null
  consejos: string | null
  nota: string | null
  imagen_url: string | null
  gif_url: string | null
  video_url: string | null
  orden: number | null
}

/** Catálogo de la clínica, del que se copian los ejercicios a un informe. */
export interface Ejercicio {
  id: string
  clinica_id: string | null
  nombre: string
  zona: string | null
  musculos: string | null
  equipo: string | null
  nivel: string | null
  instrucciones: string | null
  errores: string | null
  consejos: string | null
  imagen_url: string | null
  gif_url: string | null
  video_url: string | null
  fuente: string | null
  activo: boolean | null
  created_at: string
}

export interface TipoCita {
  id: string
  clinica_id: string | null
  nombre: string
  color: string | null
  duracion_min: number | null
  activo: boolean | null
  orden: number | null
  created_at: string
}

export interface Cita {
  id: string
  paciente_id: string
  clinica_id: string | null
  user_id: string | null
  tipo_id: string | null
  fecha_hora: string
  duracion_min: number | null
  estado: string | null
  notas: string | null
  created_at: string
}

export interface Bono {
  id: string
  paciente_id: string
  clinica_id: string | null
  tipo_bono_id: string | null
  titulo: string | null
  servicio: string | null
  total_sesiones: number
  sesiones_usadas: number
  precio: number | null
  fecha_compra: string | null
  fecha_caducidad: string | null
  activo: boolean | null
  created_at: string
}

/**
 * Supabase devuelve las tablas relacionadas anidadas bajo el nombre de la
 * tabla. Con `.single()` llega un objeto; sin él, un array. Este ayudante
 * evita repetir esa unión en cada consulta.
 */
export type Anidado<T> = T | T[] | null
