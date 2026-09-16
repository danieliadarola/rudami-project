'use client'

// components/pacientes/AvisosPaciente.tsx
// Avisos de la clínica al paciente, desde su ficha. Unidireccionales a
// propósito (decisión de fase 4): la clínica escribe, el paciente lo ve en el
// inicio de su app y lo marca como leído. Sin bandeja de entrada.
//
// Escribe en `avisos` directamente: quien está aquí es la clínica y la tabla
// tiene policies por clinica_actual(). El paciente solo lee por RPC.

import { useCallback, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Aviso { id: string; texto: string; leido_at: string | null; created_at: string; autor_id: string | null }

export function AvisosPaciente({ pacienteId }: { pacienteId: string }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('avisos').select('id, texto, leido_at, created_at, autor_id')
      .eq('paciente_id', pacienteId).order('created_at', { ascending: false }).limit(5)
    setLista((data as Aviso[] | null) ?? [])
  }, [pacienteId])

  // Carga inicial desde un ref callback (con reactCompiler, setState desde un
  // efecto es error de lint; misma técnica que SolicitudesCitas).
  const raiz = useCallback((el: HTMLDivElement | null) => { if (el) cargar() }, [cargar])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t || ocupado) return
    setOcupado(true); setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('clinica_id').eq('id', user?.id).single()
      if (!perfil?.clinica_id) throw new Error('sin clínica')
      const { error: err } = await supabase.from('avisos').insert({
        clinica_id: perfil.clinica_id, paciente_id: pacienteId, autor_id: user?.id ?? null, texto: t.slice(0, 500),
      })
      if (err) throw err
      setTexto('')
      await cargar()
    } catch {
      setError('No se ha podido enviar el aviso.')
    } finally {
      setOcupado(false)
    }
  }

  const borrar = async (id: string) => {
    await supabase.from('avisos').delete().eq('id', id)
    setLista((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div ref={raiz}>
      <div className="sect-head">
        <span className="sect-title">Avisos al paciente</span>
        <span className="sect-sub">los ve en su app</span>
      </div>
      <div className="pac-card" style={{ padding: 14 }}>
        <form onSubmit={enviar}>
          <textarea
            className="mi-input"
            rows={2}
            maxLength={500}
            placeholder="Ej.: Recuerda traer ropa cómoda el jueves. Si el dolor sube de 7, escríbenos."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={ocupado}
            style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>{texto.length}/500</span>
            <button type="submit" className="btn-ink" disabled={ocupado || !texto.trim()} style={{ minHeight: 32, padding: '0 14px', fontSize: 12.5 }}>
              {ocupado ? 'Enviando…' : 'Enviar aviso'}
            </button>
          </div>
          {error && <p className="alert-err" style={{ marginTop: 8 }}>{error}</p>}
        </form>

        {lista.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--hair-s)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{a.texto}</p>
                  <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                    {new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {' · '}{a.leido_at ? 'leído' : 'sin leer'}
                  </p>
                </div>
                <button type="button" className="btn-ghost" onClick={() => borrar(a.id)} style={{ fontSize: 11.5, padding: 0 }} aria-label="Borrar aviso">
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
