// app/lib/dashboard/eva.ts
// Tendencia del dolor EVA DENTRO de un episodio (no mezclar episodios distintos).
// Umbral de cambio clínicamente relevante ≈ 2 puntos (MCID del EVA).

export type DireccionEva = 'mejora' | 'estable' | 'empeora'

export interface TendenciaEva {
  direccion: DireccionEva
  inicial: number
  ultima: number
  delta: number      // ultima - inicial (negativo = mejora)
  nSesiones: number
}

const MCID = 2

/** Recibe sesiones de UN episodio (orden cronológico indistinto). */
export function tendenciaEva(
  sesiones: { dolor_eva?: number | null; created_at?: string | null; fecha?: string | null }[],
): TendenciaEva | null {
  const conEva = sesiones
    .filter(s => s.dolor_eva != null)
    .map(s => ({ eva: s.dolor_eva as number, t: s.created_at ?? s.fecha ?? '' }))
    .sort((a, b) => (a.t < b.t ? -1 : 1))

  if (conEva.length < 2) return null

  const inicial = conEva[0].eva
  const ultima  = conEva[conEva.length - 1].eva
  const delta   = ultima - inicial

  const direccion: DireccionEva =
    delta <= -MCID ? 'mejora' : delta >= MCID ? 'empeora' : 'estable'

  return { direccion, inicial, ultima, delta, nSesiones: conEva.length }
}

export const EVA_META: Record<DireccionEva, { label: string; color: string; flecha: string }> = {
  mejora:  { label: 'Mejora',  color: '#10b981', flecha: '↓' },
  estable: { label: 'Estable', color: '#3b82f6', flecha: '→' },
  empeora: { label: 'Empeora', color: '#dc2626', flecha: '↑' },
}
