// components/paciente/Cabecera.tsx
// Cabecera de las pantallas interiores de la app: flecha atrás, título y una
// acción opcional a la derecha. Server Component: sin estado.

import Link from 'next/link'
import { IcoAtras } from './Iconos'

export function Cabecera({
  titulo,
  atras,
  accion,
  grande = false,
}: {
  titulo: string
  /** href de la flecha. Sin él, no hay flecha (pantallas raíz de pestaña). */
  atras?: string
  accion?: React.ReactNode
  grande?: boolean
}) {
  return (
    <header className="ap-cab">
      {atras && (
        <Link href={atras} className="ap-atras" aria-label="Volver">
          <IcoAtras />
        </Link>
      )}
      <h1 className={`ap-cab-t${grande ? ' grande' : ''}`}>{titulo}</h1>
      {accion}
    </header>
  )
}

/** Imagen de un ejercicio o programa. Las ilustraciones propias (SVG) van con
 *  `dibujo` para que se vean enteras, sin recortar. */
export function Miniatura({
  src,
  alt = '',
  className = '',
  vacio,
}: {
  src: string | null
  alt?: string
  className?: string
  vacio?: React.ReactNode
}) {
  const dibujo = !!src && src.endsWith('.svg')
  return (
    <div className={`ap-thumb${dibujo ? ' dibujo' : ''} ${className}`.trim()}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} loading="lazy" />
        : vacio ?? null}
    </div>
  )
}
