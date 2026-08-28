'use client'
// Ajustes locales del usuario (persisten en localStorage, sin backend):
// modo nocturno y voz del asistente por defecto.

import { useEffect, useState } from 'react'

function Fila({ titulo, desc, on, onToggle }: { titulo: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="cfg-row">
      <div className="cfg-txt">
        <div className="cfg-t">{titulo}</div>
        <div className="cfg-d">{desc}</div>
      </div>
      <button className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={titulo} onClick={onToggle} />
    </div>
  )
}

export function AjustesCliente() {
  const [dark, setDark] = useState(false)
  const [voz, setVoz] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
    setVoz(localStorage.getItem('rudami-voz') === '1')
    setListo(true)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('rudami-tema', next ? 'dark' : 'light') } catch {}
  }

  const toggleVoz = () => {
    const next = !voz
    setVoz(next)
    try { localStorage.setItem('rudami-voz', next ? '1' : '0') } catch {}
  }

  // Evita el parpadeo del interruptor antes de leer localStorage
  if (!listo) return <div className="cfg-row" style={{ height: 58, opacity: 0 }} />

  return (
    <>
      <Fila titulo="Modo nocturno" desc="Cambia la interfaz a un tema oscuro. Se recuerda en este dispositivo." on={dark} onToggle={toggleDark} />
      <Fila titulo="Leer respuestas del asistente en voz alta" desc="Activa por defecto la lectura por voz de las respuestas del copiloto." on={voz} onToggle={toggleVoz} />
    </>
  )
}
