// app/lib/ai/groq.ts
// Proveedor Groq (openai/gpt-oss-20b). Modelo del tramo gratuito: es el que
// sostiene las demos en clínicas sin coste. Para migrar a un modelo médico
// especializado, crear otro provider que implemente AIProvider y cambiar
// getProvider() en index.ts.
//
// Groq retiró llama-3.3-70b-versatile el 16/08/2026 (aviso del 17/06/2026).
// Los gpt-oss son modelos de razonamiento: SIN reasoning_effort:'low' el
// razonamiento consume todo el presupuesto de max_tokens y la respuesta llega
// truncada (finish_reason:'length'), lo que rompe el JSON.parse de index.ts.

import Groq from 'groq-sdk'
import { RateLimitError, type AIProvider, type RazonarParams } from './types'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

/** Modelo activo. Lo comparte el asistente (app/api/asistente/route.ts) para
 *  que cambiar de modelo siga siendo un único punto del código. */
export const MODELO = 'openai/gpt-oss-20b'

export const groqProvider: AIProvider = {
  nombre: `groq:${MODELO}`,

  async razonar({ prompt, maxTokens, temperature }: RazonarParams): Promise<string> {
    try {
      const completion = await client.chat.completions.create({
        model: MODELO,
        max_tokens: maxTokens,
        temperature,
        reasoning_effort: 'low',
        messages: [{ role: 'user', content: prompt }],
      })
      return completion.choices[0]?.message?.content ?? ''
    } catch (e: unknown) {
      // Free tier: 8.000 tokens/min. Se distingue del resto de errores para
      // que la UI pueda decir "espera un momento" en vez de "ha fallado".
      if ((e as { status?: number })?.status === 429) {
        const ra = (e as { headers?: Record<string, string> })?.headers?.['retry-after']
        throw new RateLimitError(ra ? Number(ra) : undefined)
      }
      throw e
    }
  },
}
