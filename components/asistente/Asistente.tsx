'use client'
// Asistente conversacional (texto + voz) que ejecuta acciones vía /api/asistente.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DI } from '@/components/ui/DashboardIcons'

interface Msg { role: 'user' | 'assistant'; content: string }
const SUGERENCIAS = ['¿Qué citas tengo hoy?', 'Agenda a Elena Castro mañana a las 10', 'Huecos libres del jueves', 'Busca a Hugo']

export function Asistente({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendiente, setPendiente] = useState<any>(null)
  const [escuchando, setEscuchando] = useState(false)
  const [vozOn, setVozOn] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<any>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }) }, [messages, loading, pendiente])

  const hablar = (txt: string) => {
    if (!vozOn || typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(txt.replace(/[*_#]/g, '')); u.lang = 'es-ES'
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
  }

  const enviar = async (texto?: string) => {
    const t = (texto ?? input).trim()
    if (!t || loading) return
    const nuevos: Msg[] = [...messages, { role: 'user', content: t }]
    setMessages(nuevos); setInput(''); setLoading(true); setPendiente(null)
    try {
      const r = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nuevos }) })
      const d = await r.json()
      setMessages(m => [...m, { role: 'assistant', content: d.mensaje ?? d.error ?? 'Sin respuesta.' }])
      if (d.pendiente) setPendiente(d.pendiente)
      else router.refresh()
      if (d.mensaje) hablar(d.mensaje)
    } catch { setMessages(m => [...m, { role: 'assistant', content: 'Error de conexión con el asistente.' }]) }
    setLoading(false)
  }

  const confirmar = async (ok: boolean) => {
    if (!pendiente) return
    if (!ok) { setPendiente(null); setMessages(m => [...m, { role: 'assistant', content: 'Acción cancelada.' }]); return }
    setLoading(true)
    try {
      const r = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmar: pendiente }) })
      const d = await r.json()
      setMessages(m => [...m, { role: 'assistant', content: d.mensaje ?? 'Hecho.' }]); router.refresh(); hablar(d.mensaje)
    } catch { setMessages(m => [...m, { role: 'assistant', content: 'Error al ejecutar.' }]) }
    setPendiente(null); setLoading(false)
  }

  const escuchar = () => {
    const SR = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SR) { alert('Tu navegador no soporta dictado por voz. Prueba con Chrome.'); return }
    if (escuchando) { recRef.current?.stop(); return }
    const rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onresult = (e: any) => { const txt = e.results[0][0].transcript; setInput(txt); enviar(txt) }
    rec.onerror = () => setEscuchando(false)
    rec.onend = () => setEscuchando(false)
    rec.start(); setEscuchando(true); recRef.current = rec
  }

  if (!open) return null

  return (
    <>
      <div className="asist-scrim" onClick={onClose} />
      <aside className="asist-panel">
        <div className="asist-head">
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>✦</span> Asistente
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn ghost" title={vozOn ? 'Silenciar voz' : 'Leer respuestas en voz alta'} onClick={() => setVozOn(v => !v)} style={{ color: vozOn ? 'var(--accent)' : 'var(--ink-2)' }}>
              {vozOn ? '🔊' : '🔈'}
            </button>
            <button className="icon-btn ghost" onClick={onClose} title="Cerrar"><DI name="x" size={18} strokeWidth={1.8} /></button>
          </div>
        </div>

        <div className="asist-body" ref={scrollRef}>
          {messages.length === 0 && (
            <div style={{ padding: '8px 2px' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
                Pídeme lo que necesites: agendar y cancelar citas, crear pacientes, dar de alta, consultar tu día… por texto o voz.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {SUGERENCIAS.map(s => (
                  <button key={s} className="asist-sug" onClick={() => enviar(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`asist-msg ${m.role}`}>{m.content}</div>
          ))}

          {pendiente && (
            <div className="asist-confirm">
              <p style={{ fontSize: 12.5, color: '#7f1d1d', marginBottom: 10 }}>Acción que requiere confirmación.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-line danger" onClick={() => confirmar(true)} disabled={loading}>Sí, eliminar</button>
                <button className="btn-line" onClick={() => confirmar(false)} disabled={loading}>Cancelar</button>
              </div>
            </div>
          )}

          {loading && <div className="asist-msg assistant" style={{ color: 'var(--faint)' }}>escribiendo…</div>}
        </div>

        <div className="asist-foot">
          <button className={`asist-mic${escuchando ? ' on' : ''}`} onClick={escuchar} title="Dictar por voz">🎙</button>
          <input
            className="asist-input"
            placeholder={escuchando ? 'Escuchando…' : 'Escribe o dicta…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') enviar() }}
          />
          <button className="btn-ink" style={{ height: 36, padding: '0 14px' }} onClick={() => enviar()} disabled={loading || !input.trim()}>Enviar</button>
        </div>
      </aside>
    </>
  )
}
