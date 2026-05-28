'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function NuevoFisio() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    numero_colegiado: '',
    rol: 'fisio',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: adminData } = await supabase.auth.getUser()
      if (!adminData.user) throw new Error('No hay sesión activa')

      const { data: adminPerfil } = await supabase
        .from('perfiles')
        .select('clinica_id')
        .eq('id', adminData.user.id)
        .single()

      if (!adminPerfil?.clinica_id) throw new Error('No se encontró la clínica')

      const { data: nuevoUsuario, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (signUpError) throw new Error(signUpError.message)
      if (!nuevoUsuario.user) throw new Error('Error al crear el usuario')

      const { error: perfilError } = await supabase
        .from('perfiles')
        .insert([{
          id: nuevoUsuario.user.id,
          clinica_id: adminPerfil.clinica_id,
          nombre: form.nombre,
          apellidos: form.apellidos,
          numero_colegiado: form.numero_colegiado,
          rol: form.rol,
        }])

      if (perfilError) throw new Error(perfilError.message)

      setExito(true)
      setLoading(false)

    } catch (err: any) {
      setError(err.message || 'Error al crear el fisioterapeuta.')
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '52px', height: '52px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
            ✅
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Fisioterapeuta creado
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Se ha enviado un email de confirmación a <strong>{form.email}</strong>. El fisio debe confirmar su email antes de poder entrar.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setExito(false); setForm({ nombre: '', apellidos: '', email: '', password: '', numero_colegiado: '', rol: 'fisio' }) }}
              style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Añadir otro
            </button>
            <button
              onClick={() => router.push('/admin')}
              style={{ flex: 1, background: '#0f172a', color: 'white', border: 'none', padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Volver al panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif' }}>

      <nav style={{ background: '#0f172a', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '15px', fontWeight: '700' }}>R</span>
          </div>
          <span style={{ color: 'white', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.4px' }}>RuDaMi Project</span>
        </div>
        <button
          onClick={() => router.push('/admin')}
          style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          ← Panel admin
        </button>
      </nav>

      <div style={{ padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.8px' }}>
            Añadir fisioterapeuta
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
            Se creará una cuenta y se asignará automáticamente a tu clínica
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Nombre *
              </label>
              <input
                name="nombre"
                required
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: María"
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Apellidos *
              </label>
              <input
                name="apellidos"
                required
                value={form.apellidos}
                onChange={handleChange}
                placeholder="Ej: García López"
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Email *
            </label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="fisio@clinica.com"
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Contraseña temporal *
            </label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Nº Colegiado
              </label>
              <input
                name="numero_colegiado"
                value={form.numero_colegiado}
                onChange={handleChange}
                placeholder="Ej: 28/12345"
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                Rol
              </label>
              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="fisio">Fisioterapeuta</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, background: loading ? '#64748b' : '#0f172a', color: 'white', border: 'none', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creando...' : 'Crear fisioterapeuta'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}