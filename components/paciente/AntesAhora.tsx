// components/paciente/AntesAhora.tsx
// "De la primera sesión a la última": para cada métrica que el fisio haya
// puntuado al menos dos veces, el valor inicial y el actual.
//
// La dirección importa y no es la misma para todas: subir fuerza es bueno,
// subir dolor no. El tono es deliberado (decisión de fase 3): la mejora se
// celebra en verde; el empeoramiento se muestra en NEUTRO, sin rojo y sin
// juicio — "ha subido" es información, "vas mal" es un diagnóstico que no
// nos toca hacer. Si algo va mal de verdad, quien lo cuenta es el fisio.

import type { SesionProgreso } from '@/app/lib/paciente/tipos'

const METRICAS: { clave: keyof SesionProgreso; nombre: string; mejorSiBaja: boolean }[] = [
  { clave: 'dolor',      nombre: 'Dolor',      mejorSiBaja: true },
  { clave: 'movilidad',  nombre: 'Movilidad',  mejorSiBaja: false },
  { clave: 'fuerza',     nombre: 'Fuerza',     mejorSiBaja: false },
  { clave: 'rigidez',    nombre: 'Rigidez',    mejorSiBaja: true },
  { clave: 'fatiga',     nombre: 'Fatiga',     mejorSiBaja: true },
  { clave: 'sueno',      nombre: 'Sueño',      mejorSiBaja: false },
  { clave: 'adherencia', nombre: 'Constancia', mejorSiBaja: false },
]

export function AntesAhora({ sesiones }: { sesiones: SesionProgreso[] }) {
  const tarjetas = METRICAS.flatMap((m) => {
    const valores = sesiones
      .map((s) => s[m.clave])
      .filter((v): v is number => typeof v === 'number')
    if (valores.length < 2) return []
    const antes = valores[0]
    const ahora = valores[valores.length - 1]
    const mejora = m.mejorSiBaja ? ahora < antes : ahora > antes
    return [{ ...m, antes, ahora, mejora, igual: ahora === antes }]
  })

  if (tarjetas.length === 0) return null

  return (
    <div className="pg-tiles">
      {tarjetas.map((t) => (
        <div key={t.clave} className="pg-tile">
          <span className="pg-tile-n">{t.nombre}</span>
          <span className="pg-tile-v">
            <span className="pg-tile-antes">{t.antes}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            <strong>{t.ahora}</strong>
            <small>/10</small>
          </span>
          {t.mejora && (
            <span className="pg-tile-mejora">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              mejora
            </span>
          )}
          {!t.mejora && !t.igual && (
            <span className="pg-tile-cambio">ha {t.mejorSiBaja ? 'subido' : 'bajado'}</span>
          )}
        </div>
      ))}
    </div>
  )
}
