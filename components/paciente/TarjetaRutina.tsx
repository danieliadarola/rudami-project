// components/paciente/TarjetaRutina.tsx
// Cómo se presenta una rutina en listas y carruseles. Una rutina puede ser un
// programa de la biblioteca o el plan que publicó el fisio: aquí llegan ya
// reducidos a una misma forma (`RutinaResumen`) para no distinguirlos.
// Server Components: solo enlaces.

import Link from 'next/link'
import type { TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { Miniatura } from './Cabecera'
import { IcoChevron, IcoCandado, IcoRutinas } from './Iconos'

export interface RutinaResumen {
  href: string
  titulo: string
  /** "4 semanas · 6 ejercicios" */
  sub: string
  imagen: string | null
  hechos: number
  total: number
  /** Texto pequeño bajo la barra: "Semana 2 de 4" */
  pie?: string
  etiqueta?: 'fisio' | 'premium' | 'activa'
  bloqueada?: boolean
}

export function desdePrograma(p: TarjetaPrograma, premiumOk: boolean): RutinaResumen {
  const bloqueada = p.premium && !premiumOk
  return {
    href: bloqueada ? '/mi/plan' : `/mi/rutinas/${p.id}`,
    titulo: p.titulo,
    sub: `${p.semanas} ${p.semanas === 1 ? 'semana' : 'semanas'} · ${p.n_ejercicios} ejercicios`,
    imagen: p.imagen_url,
    hechos: p.hechos_hoy,
    total: p.n_ejercicios,
    pie: p.semana_actual ? `Semana ${p.semana_actual} de ${p.semanas}` : undefined,
    etiqueta: bloqueada ? 'premium' : p.activo ? 'activa' : undefined,
    bloqueada,
  }
}

function Etiqueta({ tipo }: { tipo: NonNullable<RutinaResumen['etiqueta']> }) {
  if (tipo === 'premium') return <span className="ap-etiqueta premium"><IcoCandado size={11} /> Premium</span>
  if (tipo === 'fisio') return <span className="ap-etiqueta">Tu fisio</span>
  return <span className="ap-etiqueta">Activa</span>
}

const vacio = <IcoRutinas size={26} />

/** Fila completa para la pantalla de rutinas. */
export function FilaRutina({ r }: { r: RutinaResumen }) {
  const pct = r.total ? Math.round((100 * r.hechos) / r.total) : 0
  return (
    <Link href={r.href} className={`ap-fila${r.bloqueada ? ' bloqueada' : ''}`}>
      <Miniatura src={r.imagen} vacio={vacio} />
      <div className="ap-fila-txt">
        <div className="ap-fila-t">{r.titulo}</div>
        <div className="ap-fila-d">{r.sub}</div>
        {r.bloqueada ? (
          <div style={{ marginTop: 6 }}><Etiqueta tipo="premium" /></div>
        ) : (
          <>
            <div className="ap-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
            <div className="ap-barra-txt">
              {r.hechos}/{r.total} hoy{r.pie ? ` · ${r.pie}` : ''}
            </div>
          </>
        )}
      </div>
      <IcoChevron className="chev" />
    </Link>
  )
}

/** Tarjeta compacta para el carrusel de la portada. */
export function RutinaMini({ r }: { r: RutinaResumen }) {
  const pct = r.total ? Math.round((100 * r.hechos) / r.total) : 0
  return (
    <Link href={r.href} className="ap-rutina-mini">
      <Miniatura src={r.imagen} vacio={vacio} />
      <div className="ap-rutina-mini-txt">
        <div className="ap-rutina-mini-t">{r.titulo}</div>
        <div className="ap-rutina-mini-d">{r.pie ?? r.sub}</div>
        <div className="ap-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <div className="ap-barra-txt" style={{ marginTop: 2 }}>{r.hechos}/{r.total} completados hoy</div>
      </div>
    </Link>
  )
}
