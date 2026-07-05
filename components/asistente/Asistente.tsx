'use client'
// Asistente conversacional (texto + voz) que ejecuta acciones vía /api/asistente.

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DI } from '@/components/ui/DashboardIcons'

interface Msg { role: 'user' | 'assistant'; content: string }
const SUGERENCIAS = ['¿Qué citas tengo hoy?', 'Agenda a Elena Castro mañana a las 10', 'Huecos libres del jueves', 'Busca a Hugo']

/** Renderiza **negritas** y saltos de línea del mensaje del asistente. */
function formatearMensaje(texto: string) {
  return texto.split('\n').map((linea, li) => (
    <span key={li} style={{ display: 'block' }}>
      {linea.split(/(\*\*[^*]+\*\*)/g).map((tramo, ti) =>
        tramo.startsWith('**') && tramo.endsWith('**')
          ? <strong key={ti}>{tramo.slice(2, -2)}</strong>
          : <span key={ti}>{tramo}</span>,
      )}
    </span>
  ))
}

export function Asistente({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendiente, setPendiente] = useState<any>(null)
  const [escuchando, setEscuchando] = useState(false)
  const [vozOn, setVozOn] = useState(false)
  const [pasos, setPasos] = useState<string[]>([])
  const [pasosVistos, setPasosVistos] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<any>(null)
  const typingRef = useRef<any>(null)
  const [typing, setTyping] = useState(false)

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }) }, [messages, loading, pendiente])

  const hablar = (txt: string) => {
    if (!vozOn || typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(txt.replace(/[*_#]/g, '')); u.lang = 'es-ES'
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
  }

  const escribirGradual = (texto: string) => {
    if (typingRef.current) clearInterval(typingRef.current)
    setMessages(m => [...m, { role: 'assistant', content: '' }])
    setTyping(true)
    let i = 0
    const paso = Math.max(1, Math.round(texto.length / 180))
    typingRef.current = setInterval(() => {
      i += paso
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: texto.slice(0, i) }
        return copy
      })
      if (i >= texto.length) { clearInterval(typingRef.current); typingRef.current = null; setTyping(false) }
    }, 30)
  }

  /** Revela la traza de pensamiento paso a paso y, al terminar, ejecuta `done`. */
  const mostrarPasos = (lista: string[], done: () => void) => {
    if (!lista.length) { done(); return }
    setPasos(lista); setPasosVistos(1)
    let n = 1
    const iv = setInterval(() => {
      n++
      if (n > lista.length) {
        clearInterval(iv)
        setTimeout(() => { setPasos([]); setPasosVistos(0); done() }, 200)
      } else setPasosVistos(n)
    }, 260)
  }

  const enviar = async (texto?: string) => {
    const t = (texto ?? input).trim()
    if (!t || loading) return
    const nuevos: Msg[] = [...messages, { role: 'user', content: t }]
    setMessages(nuevos); setInput(''); setLoading(true); setPendiente(null); setPasos([]); setPasosVistos(0)
    try {
      const r = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: nuevos }) })
      const d = await r.json()
      mostrarPasos(d.pasos ?? [], () => {
        escribirGradual(d.mensaje ?? d.error ?? 'Sin respuesta.')
        if (d.pendiente) setPendiente(d.pendiente)
        else router.refresh()
        if (d.mensaje) hablar(d.mensaje)
        setLoading(false)
      })
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error de conexión con el asistente.' }])
      setLoading(false)
    }
  }

  const confirmar = async (ok: boolean) => {
    if (!pendiente) return
    if (!ok) { setPendiente(null); setMessages(m => [...m, { role: 'assistant', content: 'Acción cancelada.' }]); return }
    setLoading(true)
    try {
      const r = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmar: pendiente }) })
      const d = await r.json()
      escribirGradual(d.mensaje ?? 'Hecho.'); router.refresh(); hablar(d.mensaje)
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
            <DI name="sparkles" size={16} strokeWidth={1.6} style={{ color: 'var(--accent)' }} /> Asistente
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn ghost" title={vozOn ? 'Silenciar voz' : 'Leer respuestas en voz alta'} onClick={() => setVozOn(v => !v)} style={{ color: vozOn ? 'var(--accent)' : 'var(--ink-2)' }}>
              <DI name={vozOn ? 'volume' : 'volumeOff'} size={17} strokeWidth={1.7} />
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
            <div key={i} className={`asist-msg ${m.role}`}>
              {formatearMensaje(m.content)}
              {typing && m.role === 'assistant' && i === messages.length - 1 && <span className="asist-caret" />}
            </div>
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

          {pasos.length > 0 && (
            <div className="asist-think" aria-live="polite">
              {pasos.slice(0, pasosVistos).map((p, i) => {
                const hecho = i < pasosVistos - 1
                return (
                  <div key={i} className={`asist-think-row${hecho ? ' done' : ''}`}>
                    <span className="asist-think-ico">{hecho ? <DI name="check" size={12} strokeWidth={2.4} /> : <span className="asist-think-dot" />}</span>
                    <span>{p}</span>
                  </div>
                )
              })}
            </div>
          )}

          {loading && pasos.length === 0 && !typing && (
            <div className="asist-think"><div className="asist-think-row"><span className="asist-think-ico"><span className="asist-think-dot" /></span><span>Pensando…</span></div></div>
          )}
        </div>

        <div className="asist-foot">
          <button className={`asist-mic${escuchando ? ' on' : ''}`} onClick={escuchar} title="Dictar por voz" aria-label="Dictar por voz"><DI name="mic" size={17} strokeWidth={1.7} /></button>
          <input
            className="asist-input"
            placeholder={escuchando ? 'Escuchando…' : 'Escribe o dicta…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') enviar() }}
          />
          <button className="btn-ink" style={{ height: 36, padding: '0 12px', gap: 6 }} onClick={() => enviar()} disabled={loading || !input.trim()} aria-label="Enviar"><DI name="send" size={15} strokeWidth={1.8} /> Enviar</button>
        </div>
      </aside>
    </>
  )
}
