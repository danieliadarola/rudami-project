// app/lib/ai/types.ts
// Contratos de la capa de razonamiento clínico (independiente del proveedor)

export type ModoIA = 'copiloto' | 'informe' | 'informe_rapido' | 'transcripcion' | 'informe_paciente'

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

export type ResultadoIA =
  | { copiloto: CopilotoOutput | null; error?: string }
  | { informe: string }
  | { extraccion: ExtraccionOutput | null; error?: string }
  | { informe_paciente: InformePacienteOutput | null; error?: string }

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
