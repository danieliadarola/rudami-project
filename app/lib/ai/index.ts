// app/lib/ai/index.ts
// Punto de entrada del motor clínico. El route handler solo llama a
// generarInforme(); no conoce el proveedor ni los prompts.

import type { AIProvider, DatosClinicos, ModoIA, ResultadoIA } from './types'
import { promptCopiloto, promptInformeRapido, promptInformeCompleto, promptTranscripcion, promptInformePaciente, promptFaqPaciente, promptGuiaChat } from './prompts'
import { groqProvider } from './groq'

/** Selección del proveedor activo. Único punto a tocar para cambiar de modelo
 *  (p. ej. a un modelo médico especializado en el futuro). */
function getProvider(): AIProvider {
  return groqProvider
}

export async function generarInforme(
  modo: ModoIA,
  datos: DatosClinicos,
): Promise<ResultadoIA> {
  const provider = getProvider()

  if (modo === 'copiloto') {
    const respuesta = await provider.razonar({
      prompt: promptCopiloto(datos),
      maxTokens: 1000,
      temperature: 0.3,
    })
    try {
      const clean = respuesta.replace(/```json|```/g, '').trim()
      return { copiloto: JSON.parse(clean) }
    } catch {
      console.error('Error parseando JSON del copiloto:', respuesta)
      return { copiloto: null, error: 'Error parseando respuesta' }
    }
  }

  if (modo === 'transcripcion') {
    const respuesta = await provider.razonar({ prompt: promptTranscripcion(datos), maxTokens: 1200, temperature: 0.2 })
    try {
      const clean = respuesta.replace(/```json|```/g, '').trim()
      return { extraccion: JSON.parse(clean) }
    } catch {
      return { extraccion: null, error: 'Error parseando la extracción' }
    }
  }

  if (modo === 'informe_paciente') {
    const respuesta = await provider.razonar({ prompt: promptInformePaciente(datos), maxTokens: 1500, temperature: 0.5 })
    try {
      const clean = respuesta.replace(/```json|```/g, '').trim()
      return { informe_paciente: JSON.parse(clean) }
    } catch {
      return { informe_paciente: null, error: 'Error parseando el informe del paciente' }
    }
  }

  if (modo === 'faq_paciente') {
    const respuesta = await provider.razonar({ prompt: promptFaqPaciente(datos), maxTokens: 1800, temperature: 0.4 })
    try {
      const clean = respuesta.replace(/```json|```/g, '').trim()
      return { faq_paciente: JSON.parse(clean) }
    } catch {
      return { faq_paciente: null, error: 'Error parseando la FAQ del paciente' }
    }
  }

  if (modo === 'guia_chat') {
    try {
      const respuesta = await provider.razonar({ prompt: promptGuiaChat(datos), maxTokens: 400, temperature: 0.4 })
      const texto = respuesta.trim()
      return texto ? { respuesta_guia: texto } : { respuesta_guia: null, error: 'Respuesta vacía' }
    } catch {
      return { respuesta_guia: null, error: 'Error generando la respuesta' }
    }
  }

  const esRapido = modo === 'informe_rapido'
  const respuesta = await provider.razonar({
    prompt: esRapido ? promptInformeRapido(datos) : promptInformeCompleto(datos),
    maxTokens: esRapido ? 1000 : 3000,
    temperature: 0.3,
  })
  return { informe: respuesta }
}

export type { DatosClinicos, ModoIA, ResultadoIA, CopilotoOutput, ExtraccionOutput, InformePacienteOutput, FaqPacienteOutput } from './types'
// RateLimitError es una clase (valor, no tipo): se reexporta aparte para que
// los route handlers puedan hacer 'instanceof' sin conocer el proveedor.
export { RateLimitError } from './types'
