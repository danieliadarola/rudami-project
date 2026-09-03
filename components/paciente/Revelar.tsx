'use client'

// components/paciente/Revelar.tsx
// Aparición al entrar en pantalla.
//
// POR QUÉ ASÍ Y NO CON UNA LIBRERÍA: esto es un IntersectionObserver del
// navegador y dos clases CSS. Cuesta 0 KB. Traer GSAP/ScrollTrigger para hacer
// aparecer una tarjeta sería pagar 50-70 KB en la primera pantalla que abre un
// paciente desde un enlace de WhatsApp con 4G.
//
// POR QUÉ SIN ESTADO DE REACT: la clase se pone y se quita sobre el nodo desde
// un ref callback. Dos ventajas sobre useState + useEffect:
//   · No hay setState dentro de un efecto, que con reactCompiler activado es
//     error de lint y además encadena renders.
//   · El HTML que manda el servidor NO lleva la clase que oculta. Si el JS no
//     llega a ejecutarse, el contenido se ve; con la clase puesta desde el
//     servidor, un fallo de hidratación dejaría la página en blanco.

import { useCallback } from 'react'

export function Revelar({
  children,
  /** Escalona hermanos: 0, 1, 2… → 0 ms, 70 ms, 140 ms. */
  orden = 0,
  className = '',
}: {
  children: React.ReactNode
  orden?: number
  className?: string
}) {
  // Siempre <section>. Se probó a hacerlo polimórfico con una prop `as`, pero
  // tipar el ref para varias etiquetas cuesta más de lo que aporta y todos los
  // usos son secciones.
  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return

      // Quien pide menos movimiento lo ve directamente: ni clase ni observador.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      el.style.transitionDelay = `${orden * 70}ms`
      el.classList.add('revelar')

      const obs = new IntersectionObserver(
        ([e]) => {
          // Una sola vez: reaparecer al volver a subir marea y distrae.
          if (e.isIntersecting) {
            el.classList.add('dentro')
            obs.disconnect()
          }
        },
        // rootMargin negativo abajo: revela cuando el bloque ha entrado de
        // verdad, no cuando asoma un píxel.
        { threshold: 0, rootMargin: '0px 0px -12% 0px' },
      )
      obs.observe(el)

      // React 19 admite limpieza devuelta desde un ref callback.
      return () => obs.disconnect()
    },
    [orden],
  )

  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  )
}
