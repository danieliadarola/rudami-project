// components/paciente/Anillo.tsx
// Anillo de progreso del plan de hoy. SVG puro, sin librerías: esta pantalla
// se abre desde un enlace de WhatsApp con 4G y el peso importa.
// Extraído de GuiaPaciente.tsx para compartirlo con la app del paciente.

export function Anillo({
  pct,
  hechos,
  total,
  tamano = 92,
}: {
  /** 0-1 */
  pct: number
  hechos: number
  total: number
  tamano?: number
}) {
  const R = 39
  const C = 2 * Math.PI * R
  return (
    <div
      className="guia-ring"
      role="img"
      aria-label={`${hechos} de ${total} ejercicios completados hoy`}
    >
      <svg width={tamano} height={tamano} viewBox="0 0 92 92">
        <circle className="bg" cx="46" cy="46" r={R} />
        <circle
          className="fg"
          cx="46"
          cy="46"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
        />
      </svg>
      <div className="guia-ring-num">
        <div style={{ textAlign: 'center' }}>
          {hechos}
          <span style={{ color: 'var(--faint)', fontWeight: 500 }}>/{total}</span>
          <br />
          <small>hoy</small>
        </div>
      </div>
    </div>
  )
}
