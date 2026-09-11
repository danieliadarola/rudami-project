// components/paciente/GraficaDolor.tsx
// El dolor contado por el paciente (línea de tinta, un punto por check-in)
// y el medido en consulta (rombos dorados), en el MISMO eje 0-10.
//
// Server Component: SVG puro, sin estado ni hover. En un móvil no hay hover
// que valga, y los valores legibles ya los dan la leyenda, el último punto
// coloreado y las tarjetas "antes → ahora" de debajo.
//
// Identidad de las series por color Y forma (círculos de tinta frente a
// rombos dorados con borde --gold-d): nadie depende solo del color. El
// dorado puro da 2,7:1 sobre blanco — por eso el borde es --gold-d, que
// cumple contraste en ambos temas.

import { desdeIso } from '@/app/lib/paciente/fechas'
import { evaColor } from '@/app/lib/paciente/formato'

const W = 560
const H = 150
const IZQ = 26
const DER = 12
const ARR = 10
const ABA = 26

const corta = (f: string) =>
  desdeIso(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function GraficaDolor({
  checkins,
  sesiones,
}: {
  checkins: { fecha: string; dolor: number }[]
  sesiones: { fecha: string; dolor: number | null }[]
}) {
  const consulta = sesiones.filter((s): s is { fecha: string; dolor: number } => s.dolor != null)

  // Dominio temporal: la unión de las dos series.
  const fechas = [...checkins.map((c) => c.fecha), ...consulta.map((s) => s.fecha)].sort()
  const distintas = [...new Set(fechas)]
  if (distintas.length < 2) return null

  const t0 = desdeIso(distintas[0]).getTime()
  const t1 = desdeIso(distintas[distintas.length - 1]).getTime()
  const x = (f: string) => IZQ + ((desdeIso(f).getTime() - t0) / (t1 - t0)) * (W - IZQ - DER)
  const y = (v: number) => ARR + (1 - v / 10) * (H - ARR - ABA)

  const linea = (pts: { fecha: string; dolor: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha).toFixed(1)},${y(p.dolor).toFixed(1)}`).join(' ')

  const ultimo = checkins.length > 0 ? checkins[checkins.length - 1] : null

  return (
    <div className="pg-grafica">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Evolución del dolor: tu registro diario y lo medido en consulta, de 0 a 10">
        {/* rejilla recesiva: 0, 5 y 10 */}
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={W - DER} y1={y(v)} y2={y(v)} stroke="var(--hair)" strokeWidth="1" />
            <text x={IZQ - 7} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)">{v}</text>
          </g>
        ))}

        {/* serie del paciente: línea de tinta con puntos */}
        {checkins.length > 1 && (
          <path d={linea(checkins)} fill="none" stroke="var(--ink)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {checkins.map((p) => (
          <circle key={`c${p.fecha}`} cx={x(p.fecha)} cy={y(p.dolor)} r="3.2"
            fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.6" />
        ))}
        {/* el último registro lleva el semáforo: es el dato que importa */}
        {ultimo && <circle cx={x(ultimo.fecha)} cy={y(ultimo.dolor)} r="4.4" fill={evaColor(ultimo.dolor)} />}

        {/* serie de consulta: conector discreto y rombos dorados */}
        {consulta.length > 1 && (
          <path d={linea(consulta)} fill="none" stroke="var(--gold-d)" strokeWidth="1.6"
            strokeDasharray="2 6" strokeLinecap="round" />
        )}
        {consulta.map((s) => (
          <path key={`s${s.fecha}`}
            d={`M${x(s.fecha)} ${y(s.dolor) - 5.5} l5.5 5.5 l-5.5 5.5 l-5.5 -5.5 Z`}
            fill="var(--gold)" stroke="var(--gold-d)" strokeWidth="1.6" />
        ))}

        {/* extremos del tiempo */}
        <text x={IZQ} y={H - 8} fontSize="10" fill="var(--faint)">{corta(distintas[0])}</text>
        <text x={W - DER} y={H - 8} textAnchor="end" fontSize="10" fill="var(--faint)">
          {corta(distintas[distintas.length - 1])}
        </text>
      </svg>

      <div className="pg-leyenda">
        <span className="pg-ley-item">
          <svg width="18" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="18" y2="5" stroke="var(--ink)" strokeWidth="2" />
            <circle cx="9" cy="5" r="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
          </svg>
          Tu registro diario
        </span>
        <span className="pg-ley-item">
          <svg width="18" height="12" aria-hidden="true">
            <path d="M9 1 l5 5 l-5 5 l-5 -5 Z" fill="var(--gold)" stroke="var(--gold-d)" strokeWidth="1.5" />
          </svg>
          Medido en consulta
        </span>
      </div>
    </div>
  )
}
