// app/lib/ai/groq.ts
// Proveedor Groq (llama-3.3-70b). Gratuito — modelo por defecto para presentar
// a clínicas. Para migrar a un modelo médico especializado, crear otro provider
// que implemente AIProvider y cambiar getProvider() en index.ts.

import Groq from 'groq-sdk'
import type { AIProvider, RazonarParams } from './types'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODELO = 'llama-3.3-70b-versatile'

export const groqProvider: AIProvider = {
  nombre: `groq:${MODELO}`,

  async razonar({ prompt, maxTokens, temperature }: RazonarParams): Promise<string> {
    const completion = await client.chat.completions.create({
      model: MODELO,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    })
    return completion.choices[0]?.message?.content ?? ''
  },
}
