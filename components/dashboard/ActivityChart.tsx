'use client'
// components/dashboard/ActivityChart.tsx
// Gráfica de actividad — SVG custom, sin librerías

import { useState } from 'react'

export interface ActividadRow {
  semana: string
  sesiones: number
  citas: number
}

export function ActivityChart({ data }: { data: ActividadRow[] }) {
  const [metric, setMetric] = useState<'sesiones' | 'citas'>('sesiones')
  const [hover, setHover] = useState<number | null>(null)

  const series = data.map(d => d[metric])
  const labels = data.map(d => d.semana)
  const total  = series.reduce((a, b) => a + b, 0)

  if (!data.length) {
    return (
      <section className="reveal">
        <div className="sect-head"><span className="sect-title">Actividad</span></div>
        <p style={{ fontSize: 13, color: '#9aa1af', padding: '32px 0' }}>
          Sin actividad registrada todavía.
        </p>
      </section>
    )
  }

  const W = 660, H = 200, padX = 8, padY = 22
  const max = Math.max(...series, 1) * 1.1
  const min = Math.min(...series) * 0.78
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(series.length - 1, 1)
  const y = (v: number) => padY + (H - padY * 2) * (1 - (v - min) / (max - min))
  const pts = series.map((v, i): [number, number] => [x(i), y(v)])

  const line = pts.reduce((acc, p, i) => {
    if (!i) return `M ${p[0]} ${p[1]}`
    const prev = pts[i - 1], cx = (prev[0] + p[0]) / 2
    return acc + ` C ${cx} ${prev[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`
  }, '')

  return (
    <section className="reveal">
      <div className="sect-head">
        <span className="sect-title">
          Actividad
          <span className="sect-sub" style={{ marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
            {total} {metric} · {data.length} semanas
          </span>
        </span>
        <div className="seg">
          {(['sesiones', 'citas'] as const).map(m => (
            <button key={m} className={`seg-btn${metric === m ? ' active' : ''}`} onClick={() => setMetric(m)}>
              {m === 'sesiones' ? 'Sesiones' : 'Citas'}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          {[0, 0.33, 0.66, 1].map(g => (
            <line key={g} x1={padX} x2={W - padX}
              y1={padY + (H - padY * 2) * g} y2={padY + (H - padY * 2) * g}
              className="grid-line" />
          ))}
          <path d={`${line} L ${x(series.length - 1)} ${H - padY} L ${padX} ${H - padY} Z`}
            fill="rgba(22,24,31,.03)" />
          <path d={line} fill="none" stroke="#16181f" strokeWidth="1.8" strokeLinecap="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <rect x={x(i) - 20} y={0} width={40} height={H} fill="transparent"
                onMouseEnter={() => setHover(i)} />
              <circle cx={p[0]} cy={p[1]} r={hover === i ? 4.5 : 0}
                fill="#fff" stroke="#16181f" strokeWidth="1.8" />
            </g>
          ))}
          {hover !== null && (
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padY - 2} y2={H - padY}
              className="hover-line" />
          )}
        </svg>

        {hover !== null && (
          <div className="chart-tip" style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(series[hover]) / H) * 100}%`,
          }}>
            <strong>{series[hover]}</strong>
            <span>{labels[hover]}</span>
          </div>
        )}

        <div className="chart-xaxis">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
    </section>
  )
}
