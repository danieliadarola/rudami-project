'use client'

// components/paciente/RegistroSW.tsx
// Registra el service worker (public/sw.js) al cargar la app del paciente.
// Solo en producción: en desarrollo una caché de páginas confunde más de lo
// que ayuda. No pinta nada y no tiene estado; el efecto solo habla con el
// navegador, que es exactamente para lo que existe useEffect.

import { useEffect } from 'react'

export function RegistroSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* sin SW la app funciona igual, solo sin modo offline */
    })
  }, [])
  return null
}
