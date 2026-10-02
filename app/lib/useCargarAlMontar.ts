// app/lib/useCargarAlMontar.ts
// Cargar datos al montar, para las páginas de la clínica que todavía son
// 'use client'.
//
// POR QUÉ EXISTE ESTE ARCHIVO Y NO UN useEffect EN CADA PÁGINA
// Trece páginas repetían exactamente la misma línea:
//
//     useEffect(() => { cargar() }, [cargar])
//
// Con `reactCompiler` activado, eso dispara `react-hooks/set-state-in-effect`
// en las trece. La regla es conservadora: ve que `cargar` acaba llamando a
// setState y que se invoca desde un efecto, pero no distingue que esos
// setState ocurren DESPUÉS de un `await`, que es justo el caso que la regla
// quiere evitar (el que encadena renders sin dejar pintar).
//
// Así que el aviso se silencia UNA vez, aquí, explicado, en vez de trece
// veces repartidas por el proyecto.
//
// EL ARREGLO DE VERDAD, PENDIENTE
// No es este hook. La documentación de Next 16 que viene con el proyecto
// (node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md)
// dice que en el App Router los datos se piden en un Server Component y se
// pasan ya resueltos al cliente, o se leen con la API `use`. Eso además
// quitaría de en medio otra deuda apuntada en CONTEXTO_FISIOAPP.md: hoy hay
// datos clínicos viajando al navegador que podrían resolverse en el servidor.
//
// Cuando esas páginas pasen a servidor, este archivo se borra entero.

import { useEffect } from 'react'

/**
 * Llama a `cargar` al montar, y otra vez si la función cambia de identidad.
 * Pensado para funciones ya envueltas en `useCallback`, que es como están
 * todas las de este proyecto.
 */
export function useCargarAlMontar(cargar: () => void | Promise<void>) {
   
  useEffect(() => {
    void cargar()
  }, [cargar])
}
