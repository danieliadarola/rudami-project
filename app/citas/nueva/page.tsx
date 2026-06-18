'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

interface TipoCita { id: string; nombre: string; color: string; duracion_min: number }

function NuevaCitaForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const reprogramarId = sp.get('reprogramar')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [tipos, setTipos] = useState<TipoCita[]>([])
  const [durTocada, setDurTocada] = useState(false)
  const [form, setForm] = useState({
    paciente_id: '',
    tipo_id: '',
    fecha: sp.get('fecha') || '',
    hora: sp.get('hora') || '',
    duracion_min: sp.get('dur') || '60',
    notas: '',
  })

  useEffect(() => {
    const cargar = async () => {
      const [{ data: pacs }, { data: tps }] = await Promise.all([
        supabase.from('pacientes').select('id, nombre, apellidos').order('apellidos'),
        supabase.from('tipos_cita').select('id, nombre, color, duracion_min').eq('activo', true).order('orden'),
      ])
      setPacientes(pacs || [])
      setTipos(tps || [])

      if (reprogramarId) {
        const { data: cita } = await supabase
          .from('citas').select('*').eq('id', reprogramarId).single()
        if (cita) {
          const d = new Date(cita.fecha_hora)
          setForm(f => ({
            ...f,
            paciente_id: cita.paciente_id ?? '',
            tipo_id: cita.tipo_id ?? '',
            fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
            duracion_min: String(cita.duracion_min ?? 60),
            notas: cita.notas ?? '',
          }))
          setDurTocada(true)
        }
      }
    }
    cargar()
  }, [reprogramarId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'duracion_min') setDurTocada(true)
    if (name === 'tipo_id') {
      const t = tipos.find(x => x.id === value)
      setForm(f => ({ ...f, tipo_id: value, duracion_min: t && !durTocada ? String(t.duracion_min) : f.duracion_min }))
      return
    }
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const fecha_hora = new Date(`${form.fecha}T${form.hora}:00`).toISOString()
    const payload = {
      paciente_id: form.paciente_id,
      tipo_id: form.tipo_id || null,
      fecha_hora,
      duracion_min: parseInt(form.duracion_min),
      notas: form.notas,
    }

    let error
    if (reprogramarId) {
      ({ error } = await supabase.from('citas').update(payload).eq('id', reprogramarId))
    } else {
      // clinica_id imprescindible: la vista de admin filtra por él.
      const { data: perfil } = await supabase.from('perfiles').select('clinica_id').eq('id', user?.id).single()
      ;({ error } = await supabase.from('citas').insert([{
        ...payload, user_id: user?.id, clinica_id: perfil?.clinica_id ?? null, estado: 'pendiente',
      }]))
    }

    if (error) { setError('Error al guardar la cita. Inténtalo de nuevo.'); setLoading(false); return }
    router.push('/citas')
  }

  return (
    <div className="page-wrap-sm">
      <button onClick={() => router.push('/citas')} className="back-link">← Volver a la agenda</button>

      <div className="page-head">
        <div>
          <h1 className="page-title">{reprogramarId ? 'Reprogramar cita' : 'Nueva cita'}</h1>
          <p className="page-sub">Elige paciente, tipo y franja horaria.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Paciente *</label>
          <select name="paciente_id" required value={form.paciente_id} onChange={handleChange} className="form-select">
            <option value="">Selecciona un paciente</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombre}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Tipo de cita</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tipos.map(t => {
              const activo = form.tipo_id === t.id
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => handleChange({ target: { name: 'tipo_id', value: t.id } } as any)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 500,
                    border: `1px solid ${activo ? t.color : 'var(--hair)'}`,
                    background: activo ? t.color + '14' : '#fff',
                    color: activo ? 'var(--ink)' : 'var(--ink-2)',
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: t.color }} />
                  {t.nombre}
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>{t.duracion_min}'</span>
                </button>
              )
            })}
            {tipos.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--faint)' }}>No hay tipos definidos. Crea alguno en Configuración → Tipos de cita.</p>}
          </div>
        </div>

        <div className="form-grid-3" style={{ marginBottom: 16 }}>
          <div>
            <label className="form-label">Fecha *</label>
            <input name="fecha" type="date" required value={form.fecha} onChange={handleChange} className="form-input" />
          </div>
          <div>
            <label className="form-label">Hora *</label>
            <input name="hora" type="time" required value={form.hora} onChange={handleChange} className="form-input" />
          </div>
          <div>
            <label className="form-label">Duración</label>
            <select name="duracion_min" value={form.duracion_min} onChange={handleChange} className="form-select">
              {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutos</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Notas</label>
          <textarea name="notas" value={form.notas} onChange={handleChange} rows={3} className="form-textarea" placeholder="Motivo de la cita, recordatorios…" />
        </div>

        {error && <div className="alert-err" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={() => router.push('/citas')} className="btn-line">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-ink">
            {loading ? 'Guardando…' : reprogramarId ? 'Guardar cambios' : 'Guardar cita'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NuevaCita() {
  return (
    <AppShell>
      <Suspense fallback={<div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Cargando…</div>}>
        <NuevaCitaForm />
      </Suspense>
    </AppShell>
  )
}
