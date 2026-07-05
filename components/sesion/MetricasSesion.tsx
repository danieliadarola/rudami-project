'use client'
// components/sesion/MetricasSesion.tsx — indicadores de seguimiento (0–10) capturados en la propia sesión.
// Mismos campos que se editan hoy en el informe (movilidad, fuerza, rigidez, fatiga, sueño, adherencia),
// para que nazcan ya rellenos desde la consulta y el informe solo los herede.

export interface MetricasValores {
  movilidad: number
  fuerza: number
  rigidez: number
  fatiga: number
  sueno: number
  adherencia: number
}

const CAMPOS: { k: keyof MetricasValores; l: string; hint: string }[] = [
  { k: 'movilidad', l: 'Movilidad', hint: '0 limitada · 10 completa' },
  { k: 'fuerza', l: 'Fuerza', hint: '0 muy débil · 10 plena' },
  { k: 'rigidez', l: 'Rigidez', hint: '0 ninguna · 10 máxima' },
  { k: 'fatiga', l: 'Fatiga', hint: '0 ninguna · 10 máxima' },
  { k: 'sueno', l: 'Sueño', hint: '0 muy malo · 10 excelente' },
  { k: 'adherencia', l: 'Adherencia', hint: '0 nula · 10 total' },
]

export function MetricasSesion({ value, onChange }: { value: MetricasValores; onChange: (k: keyof MetricasValores, v: number) => void }) {
  return (
    <div className="eva-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 24px' }}>
      {CAMPOS.map(c => (
        <div key={c.k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{c.l}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {value[c.k]}<span style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 500 }}>/10</span>
            </span>
          </div>
          <input
            className="eva-range"
            type="range" min={0} max={10} step={1}
            value={value[c.k]}
            onChange={e => onChange(c.k, parseInt(e.target.value))}
            aria-label={c.l}
          />
          <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 5 }}>{c.hint}</div>
        </div>
      ))}
    </div>
  )
}
