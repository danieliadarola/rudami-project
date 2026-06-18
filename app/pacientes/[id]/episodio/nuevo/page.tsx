'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

export default function NuevoEpisodio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paciente, setPaciente] = useState<any>(null)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    supabase.from('pacientes').select('nombre, apellidos, clinica_id').eq('id', id).single()
      .then(({ data }) => setPaciente(data))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()

    const { data: ep, error: errIns } = await supabase.from('episodios').insert([{
      paciente_id: id, user_id: user?.id, clinica_id: paciente?.clinica_id,
      titulo: form.titulo, descripcion: form.descripcion,
      fecha_inicio: form.fecha_inicio, estado: 'activo',
    }]).select('id').single()

    if (errIns) { setError('Error al crear la consulta.'); setLoading(false); return }
    // Salta directo a registrar la primera sesión de la nueva consulta.
    router.push(`/pacientes/${id}/episodio/${ep.id}/sesion/primera`)
  }

  return (
    <AppShell>
      <div className="page-wrap-sm">
        <button onClick={() => router.push(`/pacientes/${id}`)} className="back-link">
          ← {paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Volver a la ficha'}
        </button>

        <div className="page-head">
          <div>
            <h1 className="page-title">Nueva consulta</h1>
            <p className="page-sub">Abre un proceso de tratamiento independiente (puede ir en paralelo a otros).</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-card">
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Motivo de la consulta *</label>
            <input name="titulo" required value={form.titulo} onChange={handleChange} className="form-input"
              placeholder="Ej: Lumbalgia crónica, Esguince tobillo derecho, Fascitis plantar…" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Descripción · opcional</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} className="form-textarea"
              placeholder="Descripción general, contexto inicial…" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Fecha de inicio</label>
            <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} className="form-input" style={{ maxWidth: 220 }} />
          </div>

          {error && <div className="alert-err" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={() => router.push(`/pacientes/${id}`)} className="btn-line">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-ink">{loading ? 'Creando…' : 'Crear y registrar primera sesión'}</button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
