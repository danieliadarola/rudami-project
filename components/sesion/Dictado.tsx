'use client'
// Escriba clínico por voz: transcribe la conversación fisio-paciente en vivo
// y rellena el formulario con IA (modo transcripción).

import { useState, useRef } from 'react'

export function Dictado({ onRellenar }: { onRellenar: (e: any) => void }) {
  const [grabando, setGrabando] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [procesando, setProcesando] = useState(false)
  const recRef = useRef<any>(null)
  const onRef = useRef(false)

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('El dictado por voz no está disponible en este navegador. Prueba con Chrome.'); return }
    const rec = new SR()
    rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true
    rec.onresult = (e: any) => {
      let fin = '', itm = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) fin += r[0].transcript + ' '; else itm += r[0].transcript
      }
      if (fin) setTranscript(t => t + fin)
      setInterim(itm)
    }
    rec.onerror = () => {}
    rec.onend = () => { if (onRef.current) { try { rec.start() } catch {} } else setGrabando(false) }
    rec.start(); recRef.current = rec; onRef.current = true; setGrabando(true)
  }
  const stop = () => { onRef.current = false; recRef.current?.stop(); setInterim(''); setGrabando(false) }

  const procesar = async () => {
    if (!transcript.trim()) return
    if (grabando) stop()
    setProcesando(true)
    try {
      const r = await fetch('/api/generar-informe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'transcripcion', transcripcion: transcript }),
      })
      const d = await r.json()
      if (d.extraccion) onRellenar(d.extraccion)
    } catch {}
    setProcesando(false)
  }

  return (
    <div className="dictado-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <button type="button" className={`dictado-rec${grabando ? ' on' : ''}`} onClick={() => (grabando ? stop() : start())} title={grabando ? 'Detener' : 'Grabar conversación'}>
            {grabando ? '■' : '●'}
          </button>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
              {grabando ? 'Escuchando la conversación…' : 'Dictado de la sesión'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>
              Habla con el paciente con normalidad; la IA tomará nota y rellenará la ficha.
            </p>
          </div>
        </div>
        <button type="button" className="btn-ink" style={{ height: 36 }} onClick={procesar} disabled={procesando || !transcript.trim()}>
          {procesando ? 'Procesando…' : '✦ Rellenar con IA'}
        </button>
      </div>

      {(transcript || interim) && (
        <>
          <textarea
            className="form-textarea" style={{ marginTop: 14, minHeight: 90, fontSize: 13 }}
            value={transcript + interim}
            onChange={e => { setTranscript(e.target.value); setInterim('') }}
            placeholder="Aquí aparecerá la transcripción…"
          />
          <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => { setTranscript(''); setInterim('') }}>Limpiar transcripción</button>
        </>
      )}
    </div>
  )
}
