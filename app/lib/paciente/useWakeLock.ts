'use client'

// app/lib/paciente/useWakeLock.ts
// Mantiene la pantalla encendida mientras dura la sesión guiada.
//
// POR QUÉ: sin esto, el móvil se bloquea entre serie y serie y el paciente
// tiene que desbloquearlo y buscar dónde iba cada dos minutos. Es la clase de
// fricción que hace que alguien abandone el plan sin saber muy bien por qué.
//
// Soporte: Chrome/Android desde hace años, Safari iOS desde 16.4. Donde no
// exista, la sesión funciona igual — solo se apaga la pantalla, como siempre.

import { useEffect, useRef } from 'react'

// La API no está en los tipos de TS de todos los targets; se declara lo mínimo.
interface CentinelaWakeLock {
  released: boolean
  release(): Promise<void>
  addEventListener(t: 'release', cb: () => void): void
}

export function useWakeLock(activo: boolean): void {
  const centinela = useRef<CentinelaWakeLock | null>(null)

  useEffect(() => {
    if (!activo) return

    const api = (navigator as Navigator & {
      wakeLock?: { request(t: 'screen'): Promise<CentinelaWakeLock> }
    }).wakeLock
    if (!api) return // navegador sin soporte: no es un error, solo no se hace

    let cancelado = false

    const pedir = async () => {
      try {
        const c = await api.request('screen')
        if (cancelado) { void c.release(); return }
        centinela.current = c
      } catch {
        // Se rechaza si la pestaña no está visible o el móvil está en ahorro
        // de batería. No hay nada que hacer ni nada que avisar al paciente.
      }
    }

    // El sistema suelta el bloqueo solo al cambiar de pestaña o apagar la
    // pantalla; al volver hay que volver a pedirlo o el resto de la sesión ya
    // no lo tendría.
    const alVolver = () => {
      if (document.visibilityState === 'visible' && !cancelado) void pedir()
    }

    void pedir()
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', alVolver)
      const c = centinela.current
      centinela.current = null
      // Liberar siempre al salir: dejarlo puesto mantendría la pantalla del
      // paciente encendida indefinidamente y le fundiría la batería.
      if (c && !c.released) void c.release().catch(() => {})
    }
  }, [activo])
}
