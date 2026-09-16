// app/lib/ai/types.ts
// Contratos de la capa de razonamiento clínico (independiente del proveedor)

export type ModoIA = 'copiloto' | 'informe' | 'informe_rapido' | 'transcripcion' | 'informe_paciente' | 'faq_paciente' | 'guia_chat'

/** Datos clínicos que alimentan el motor. Todos opcionales: el formulario
 *  puede estar parcialmente relleno (modo copiloto en tiempo real). */
export interface DatosClinicos {
  motivo_consulta?: string
  antecedentes?: string
  anamnesis?: string
  factores_agravantes?: string
  factores_calmantes?: string
  irradiacion?: string
  contexto_biopsicosocial?: string
  exploracion_fisica?: string
  tests_ortopedicos?: string
  dolor_eva?: number | string
  mecanismo_lesional?: string
  comportamiento_dolor?: string
  dolor_nocturno?: string
  irritabilidad?: string
  yellow_flags?: string
  medicacion?: string
  nivel_actividad?: string
  historial_deportivo?: string
  transcripcion?: string
  hipotesis_principal?: string
  /** Guía del paciente: contexto del plan publicado (JSON serializado) */
  contexto_guia?: string
  /** Guía del paciente: pregunta escrita por el paciente en el chat */
  pregunta_paciente?: string
  /** Guía del paciente: últimos turnos del chat para dar continuidad */
  historial_chat?: string
  /** App del paciente: 'clinica' (plan de un fisio) o 'independiente'
   *  (programas de la biblioteca, sin fisioterapeuta asignado). */
  modo_app?: 'clinica' | 'independiente'
}

/** Respuesta estructurada del copiloto clínico en tiempo real. */
export interface CopilotoOutput {
  hipotesis_principal?: string
  tejidos_implicados?: string[]
  clasificacion_dolor?: string
  fase_clinica?: string
  irritabilidad?: string
  diagnostico_diferencial?: string[]
  red_flags?: string[]
  yellow_flags?: string[]
  derivacion?: boolean
  derivacion_motivo?: string
  derivacion_urgencia?: 'no' | 'rutina' | 'urgente' | string
  tests_sugeridos?: string[]
  exploracion_neurologica?: boolean
  pruebas_neurodinamicas?: string[]
  escalas_funcionales?: string[]
  preguntas_sugeridas?: { pregunta: string; campo: string }[]
  estructuras_implicadas?: string[]
  mecanismo_dolor?: string
  nivel_alerta?: 'verde' | 'amarillo' | 'rojo' | string
  razonamiento_clinico?: string
}

export interface ExtraccionOutput {
  anamnesis?: string
  antecedentes_personales?: string
  antecedentes_familiares?: string
  exploracion_fisica?: string
  tests_ortopedicos?: string
  factores_agravantes?: string
  factores_calmantes?: string
  irradiacion?: string
  hipotesis_principal?: string
  dolor_eva?: number | null
  resumen?: string
}

export interface InformePacienteOutput {
  resumen?: string
  explicacion?: string
  sintomas?: string[]
  que_esperar?: { fase: number; titulo: string; descripcion: string }[]
  recomendaciones?: { icono: string; texto: string }[]
  motivacion?: string
}

/** FAQ pregenerada al publicar la guía: dudas generales + una explicación
 *  llana por ejercicio. Se guarda en informes.faq y se sirve sin coste. */
export interface FaqPacienteOutput {
  generales?: { pregunta: string; respuesta: string }[]
  ejercicios?: { nombre: string; como_hacerlo: string; sensacion_normal: string }[]
}

export type ResultadoIA =
  | { copiloto: CopilotoOutput | null; error?: string }
  | { informe: string }
  | { extraccion: ExtraccionOutput | null; error?: string }
  | { informe_paciente: InformePacienteOutput | null; error?: string }
  | { faq_paciente: FaqPacienteOutput | null; error?: string }
  | { respuesta_guia: string | null; error?: string }

/** El proveedor ha agotado su cuota por minuto (Groq free tier: 8.000
 *  tokens/min). Se distingue del resto de errores para que la UI avise de una
 *  espera en vez de mostrar un fallo genérico. Independiente del proveedor. */
export class RateLimitError extends Error {
  readonly retryAfter?: number
  constructor(retryAfter?: number) {
    super('Límite de peticiones de la IA alcanzado')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/** Parámetros de una llamada de razonamiento de bajo nivel. */
export interface RazonarParams {
  prompt: string
  maxTokens: number
  temperature: number
}

/** Interfaz que debe cumplir cualquier proveedor de IA (Groq hoy; un modelo
 *  médico especializado mañana). Cambiar de motor = implementar esto. */
export interface AIProvider {
  readonly nombre: string
  razonar(params: RazonarParams): Promise<string>
}
