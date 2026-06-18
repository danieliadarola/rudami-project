'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

export default function NuevoFisio() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    numero_colegiado: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: adminData } = await supabase.auth.getUser()
    const { data: adminPerfil } = await supabase
      .from('perfiles')
      .select('clinica_id')
      .eq('id', adminData.user?.id)
      .single()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nombre: form.nombre,
          apellidos: form.apellidos,
          numero_colegiado: form.numero_colegiado,
          clinica_id: adminPerfil?.clinica_id,
          rol: 'fisio',
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('perfiles').upsert({
        id: data.user.id,
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        numero_colegiado: form.numero_colegiado,
        clinica_id: adminPerfil?.clinica_id,
        rol: 'fisio',
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AppShell>
        <div className="page-wrap-sm">
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--hair)', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Fisioterapeuta creado</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
              {form.nombre} {form.apellidos} ha recibido un email para confirmar su cuenta.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { setSuccess(false); setForm({ nombre: '', apellidos: '', email: '', password: '', numero_colegiado: '' }) }}
                className="btn-line"
              >
                Añadir otro
              </button>
              <button onClick={() => router.push('/admin')} className="btn-ink">
                Volver al panel
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="page-wrap-sm">
        <button onClick={() => router.push('/admin')} className="back-link">← Volver al panel</button>

        <div className="page-head">
          <div>
            <h1 className="page-title">Nuevo fisioterapeuta</h1>
            <p className="page-sub">Crea una cuenta para un miembro del equipo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <p className="form-card-title">Datos personales</p>
            <div className="form-grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="form-label">Nombre *</label>
                <input name="nombre" required value={form.nombre} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Apellidos *</label>
                <input name="apellidos" required value={form.apellidos} onChange={handleChange} className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">Nº de colegiado</label>
              <input name="numero_colegiado" value={form.numero_colegiado} onChange={handleChange} className="form-input" placeholder="Opcional" />
            </div>
          </div>

          <div className="form-card">
            <p className="form-card-title">Acceso</p>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Email *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} className="form-input" />
            </div>
            <div>
              <label className="form-label">Contraseña temporal *</label>
              <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {error && <div className="alert-err" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={() => router.push('/admin')} className="btn-line" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn-ink" style={{ flex: 1 }}>
              {loading ? 'Creando cuenta…' : 'Crear fisioterapeuta'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
