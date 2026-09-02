// components/paciente/SparkDolor.tsx
// Evolución del dolor reportado. SVG a mano, sin recharts: la guía pública
// tiene que volar y esto son 40 líneas.
// Extraído de GuiaPaciente.tsx para compartirlo con la app del paciente.

import { desdeIso } from '@/app/lib/paciente/fechas'
import { evaColor } from '@/app/lib/paciente/formato'

export function SparkDolor({
  puntos,
  alto = 56,
}: {
  puntos: { fecha: string; dolor: number }[]
  alto?: number
}) {
  // Con un solo punto no hay evolución que enseñar.
  if (puntos.length < 2) return null

  const W = 560
  const H = alto
  const PAD = 6
  const t0 = desdeIso(puntos[0].fecha).getTime()
  const t1 = desdeIso(puntos[puntos.length - 1].fecha).getTime()

  const x = (f: string) =>
    t1 === t0 ? PAD : PAD + ((desdeIso(f).getTime() - t0) / (t1 - t0)) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - v / 10) * (H - PAD * 2)

  const d = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha).toFixed(1)},${y(p.dolor).toFixed(1)}`)
    .join(' ')
  const ult = puntos[puntos.length - 1]

  return (
    <svg
      className="guia-spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {puntos.map((p) => (
        <circle
          key={p.fecha}
          cx={x(p.fecha)}
          cy={y(p.dolor)}
          r="3"
          fill="#fff"
          stroke="var(--ink)"
          strokeWidth="1.6"
        />
      ))}
      {/* El último punto lleva el color del semáforo: es el dato que importa. */}
      <circle cx={x(ult.fecha)} cy={y(ult.dolor)} r="4" fill={evaColor(ult.dolor)} />
    </svg>
  )
}
