'use client'
// components/sesion/EvaSlider.tsx — slider de dolor EVA con barra en degradado.

const color = (v: number) => (v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626')

export function EvaSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Dolor percibido (escala EVA)</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: color(value), fontVariantNumeric: 'tabular-nums' }}>
          {value}<span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/10</span>
        </span>
      </div>
      <input
        className="eva-range"
        type="range" min={0} max={10} step={1}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        aria-label="Dolor EVA"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
        <span>0 · Sin dolor</span>
        <span>5 · Moderado</span>
        <span>10 · Máximo</span>
      </div>
    </div>
  )
}
