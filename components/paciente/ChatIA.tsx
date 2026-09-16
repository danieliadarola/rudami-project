'use client'

// components/paciente/ChatIA.tsx
// Chat a pantalla completa (boceto "Chat con IA"): saludo, sugerencias,
// burbujas y una caja de texto fija encima de la barra. Habla con
// /api/mi/chat, que autoriza por sesión: aquí no viaja ningún token.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { MensajeChat } from '@/app/lib/paciente/tipos'
import { BarraMi } from './BarraMi'
import { Cabecera } from './Cabecera'
import { IcoEnviar } from './Iconos'

const SUGERENCIAS_CLINICA = [
  '¿Qué ejercicios puedo hacer para mi dolor de espalda?',
  'Tengo molestias en la rodilla, ¿es normal?',
  '¿Cuándo puedo volver a entrenar?',
  'Hoy no me apetece nada, ¿qué hago?',
]
const SUGERENCIAS_LIBRE = [
  '¿Cómo sé si estoy haciendo bien el ejercicio?',
  'Me duele un poco al día siguiente, ¿es normal?',
  '¿Con qué frecuencia debería hacer la rutina?',
  'Necesito una rutina para fortalecer el core',
]

export function ChatIA({
  nombre,
  mensajes,
  conPlan,
  esClinica,
}: {
  nombre: string
  mensajes: MensajeChat[]
  conPlan: boolean
  esClinica: boolean
}) {
  const [msgs, setMsgs] = useState(mensajes)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [limite, setLimite] = useState(false)
  const fin = useRef<HTMLDivElement>(null)

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, pensando])

  const enviar = async (q: string) => {
    const pregunta = q.trim()
    if (!pregunta || pensando || limite) return
    setTexto('')
    setMsgs((m) => [...m, { rol: 'paciente', texto: pregunta }])
    setPensando(true)
    try {
      const r = await fetch('/api/mi/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta }),
      })
      const j = await r.json()
      if (j.limite) setLimite(true)
      if (typeof j.restantes === 'number') setRestantes(j.restantes)
      setMsgs((m) => [...m, { rol: 'ia', texto: j.respuesta ?? j.error ?? 'Ahora mismo no puedo responder. Inténtalo en un momento.' }])
    } catch {
      setMsgs((m) => [...m, { rol: 'ia', texto: 'No hay conexión ahora mismo. Inténtalo en un momento.' }])
    } finally {
      setPensando(false)
    }
  }

  const sugerencias = esClinica ? SUGERENCIAS_CLINICA : SUGERENCIAS_LIBRE

  return (
    <main className="ap-pagina chat">
      <Cabecera titulo="Chat con IA" grande accion={<span className="ap-etiqueta neutra">Beta</span>} />

      <div className="ap-chat-msgs">
        <div className="ap-chat-intro">
          <strong>Hola, {nombre} 👋</strong>
          {esClinica
            ? 'Soy tu asistente de recuperación. Cuéntame qué necesitas y te ayudaré con dudas sobre tus ejercicios, qué es normal sentir o qué hacer si un día no puedes. No sustituyo a tu fisioterapeuta: para cambios en el plan, habla con tu clínica.'
            : 'Soy tu asistente de ejercicio. Te ayudo con tus rutinas: cómo hacer cada ejercicio, qué sensaciones son normales y cómo mantener la constancia. No soy un profesional sanitario: ante un dolor fuerte o nuevo, consulta con un fisioterapeuta.'}
        </div>

        {!conPlan && (
          <p className="mi-nota" style={{ marginTop: 0 }}>
            Todavía no tienes ninguna rutina activa. <Link href="/mi/rutinas?ver=biblioteca" className="mi-link">Elige una en la biblioteca</Link> y podré ayudarte con ella.
          </p>
        )}

        {msgs.length === 0 && conPlan && (
          <>
            <p className="ap-sugerencias-t">Algunos temas en los que puedo ayudarte:</p>
            {sugerencias.map((s) => (
              <button key={s} type="button" className="ap-sugerencia" onClick={() => enviar(s)}>{s}</button>
            ))}
          </>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`ap-msg ${m.rol === 'paciente' ? 'paciente' : 'ia'}`}>{m.texto}</div>
        ))}
        {pensando && <div className="ap-msg ia pensando">Escribiendo…</div>}
        <div ref={fin} />
      </div>

      <div className="ap-chat-input">
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto) }}>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={limite ? 'Has llegado al límite de hoy' : 'Escribe tu pregunta…'}
            maxLength={500}
            disabled={pensando || limite || !conPlan}
            aria-label="Tu pregunta"
          />
          <button type="submit" aria-label="Enviar" disabled={!texto.trim() || pensando || limite || !conPlan}>
            <IcoEnviar />
          </button>
        </form>
        {restantes != null && restantes >= 0 && (
          <p className="ap-chat-restantes">{restantes} {restantes === 1 ? 'pregunta' : 'preguntas'} más hoy</p>
        )}
      </div>

      <BarraMi activa="chat" />
    </main>
  )
}
