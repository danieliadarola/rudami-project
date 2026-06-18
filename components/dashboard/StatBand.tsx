'use client'
// components/dashboard/StatBand.tsx
// 4 KPIs con animación count-up, sin cards, solo hairlines

import { useEffect, useState } from 'react'

function useCountUp(target: number, decimals = 0, duration = 900): string {
  const [val, setVal] = useState(target)
  useEffect(() => {
    let raf: number
    let start: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(target * ease(p))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return decimals ? val.toFixed(decimals).replace('.', ',') : String(Math.round(val))
}

export interface StatItem {
  label: string
  valor: number
  decimals?: number
  delta?: string
  dir?: 'pos' | 'neg' | null
  nota: string
  color?: string
}

function StatCell({ s, first }: { s: StatItem; first: boolean }) {
  const num = useCountUp(s.valor, s.decimals ?? 0)
  return (
    <div className="stat-cell" style={first ? { borderLeft: 'none', paddingLeft: 4 } : undefined}>
      <div className="stat-lbl">{s.label}</div>
      <div className="stat-num" style={s.color ? { color: s.color } : undefined}>{num}</div>
      <div className="stat-delta">
        {s.dir === 'pos' && s.delta && <span style={{ color: '#10b981', fontWeight: 600 }}>{s.delta}</span>}
        {s.dir === 'neg' && s.delta && <span style={{ color: '#dc2626', fontWeight: 600 }}>{s.delta}</span>}
        {s.dir === null  && s.delta && <span style={{ color: '#d97706', fontWeight: 600 }}>{s.delta}</span>}
        {s.nota}
      </div>
    </div>
  )
}

export function StatBand({ stats }: { stats: StatItem[] }) {
  return (
    <section className="stat-band reveal">
      {stats.map((s, i) => <StatCell key={s.label} s={s} first={i === 0} />)}
    </section>
  )
}
