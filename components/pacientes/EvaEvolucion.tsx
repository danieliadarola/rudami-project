'use client'
// Gráfica de evolución del dolor EVA dentro de un episodio (SVG, sin librerías).

const colorOf = (v: number) => (v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626')

export function EvaEvolucion({ sesiones, bare = false }: { sesiones: { fecha: string; dolor_eva: number }[]; bare?: boolean }) {
  const datos = sesiones.filter(s => s.dolor_eva != null)

  if (datos.length < 2) {
    if (bare) return null
    return (
      <div className="pac-card" style={{ padding: 24 }}>
        <div className="sect-head" style={{ marginBottom: 0 }}>
          <span className="sect-title">Evolución del dolor · EVA</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--faint)', padding: '24px 0 8px', textAlign: 'center' }}>
          Necesitas al menos 2 sesiones para ver la evolución.
        </p>
      </div>
    )
  }

  const W = 660, H = 190, padX = 12, padY = 22
  const x = (i: number) => padX + (i * (W - padX * 2)) / (datos.length - 1)
  const y = (v: number) => padY + (H - padY * 2) * (1 - v / 10)
  const pts = datos.map((d, i): [number, number] => [x(i), y(d.dolor_eva)])

  const line = pts.reduce((acc, p, i) => {
    if (!i) return `M ${p[0]} ${p[1]}`
    const prev = pts[i - 1], cx = (prev[0] + p[0]) / 2
    return acc + ` C ${cx} ${prev[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`
  }, '')

  const delta = datos[datos.length - 1].dolor_eva - datos[0].dolor_eva
  const fechaCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

  const Wrapper: any = bare ? 'div' : 'div'
  return (
    <Wrapper className={bare ? '' : 'pac-card'} style={{ padding: bare ? '18px 20px 8px' : 24, borderBottom: bare ? '1px solid var(--hair-s)' : undefined }}>
      <div className="sect-head" style={{ marginBottom: 14 }}>
        <span className="sect-title">Evolución del dolor · EVA</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: delta < 0 ? '#10b981' : delta > 0 ? '#dc2626' : 'var(--muted)' }}>
          {delta < 0 ? '↘' : delta > 0 ? '↗' : '→'} {delta > 0 ? '+' : ''}{delta} puntos
          <span style={{ color: 'var(--faint)', fontWeight: 500 }}> desde el inicio</span>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none" style={{ height: 190 }}>
        {[0, 0.33, 0.66, 1].map(g => (
          <line key={g} x1={padX} x2={W - padX} y1={padY + (H - padY * 2) * g} y2={padY + (H - padY * 2) * g} className="grid-line" />
        ))}
        <path d={`${line} L ${x(datos.length - 1)} ${H - padY} L ${padX} ${H - padY} Z`} fill="rgba(22,24,31,.03)" />
        <path d={line} fill="none" stroke="#16181f" strokeWidth="1.8" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill="#fff" stroke={colorOf(datos[i].dolor_eva)} strokeWidth="2.2" />
        ))}
      </svg>
      <div className="chart-xaxis">
        {datos.map((d, i) => (
          (i === 0 || i === datos.length - 1 || datos.length <= 7 || i % Math.ceil(datos.length / 6) === 0)
            ? <span key={i}>{fechaCorta(d.fecha)}</span> : <span key={i} />
        ))}
      </div>
    </Wrapper>
  )
}
