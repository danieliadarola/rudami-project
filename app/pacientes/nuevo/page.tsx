'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

export default function NuevoPaciente() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [fisios, setFisios] = useState<any[]>([])
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    genero: '',
    ocupacion: '',
    motivo_consulta: '',
    antecedentes: '',
    fisio_asignado: '',
  })

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, clinica_id')
        .eq('id', user.id)
        .single()

      if (perfil?.rol === 'admin') {
        setEsAdmin(true)
        setClinicaId(perfil.clinica_id)

        const { data: listafisios } = await supabase
          .from('perfiles')
          .select('id, nombre, apellidos, rol')
          .eq('clinica_id', perfil.clinica_id)
          .order('nombre', { ascending: true })

        setFisios(listafisios || [])
        setForm(prev => ({ ...prev, fisio_asignado: user.id }))
      } else {
        setClinicaId(perfil?.clinica_id || null)
      }
    }
    cargar()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const propietario = esAdmin ? form.fisio_asignado : userId

    const { data: creado, error } = await supabase.from('pacientes').insert([{
      nombre: form.nombre,
      apellidos: form.apellidos,
      fecha_nacimiento: form.fecha_nacimiento || null,
      telefono: form.telefono,
      email: form.email,
      genero: form.genero,
      ocupacion: form.ocupacion,
      motivo_consulta: form.motivo_consulta,
      antecedentes: form.antecedentes,
      user_id: propietario,
      clinica_id: clinicaId,
    }]).select('id').single()

    if (error) {
      setError('Error al guardar el paciente. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    // Tras crear, a la ficha del paciente (siguiente paso natural: abrir consulta)
    router.push(creado ? `/pacientes/${creado.id}` : '/pacientes')
  }

  return (
    <AppShell>
      <div className="page-wrap-sm">
        <button onClick={() => router.push('/pacientes')} className="back-link">← Volver a pacientes</button>

        <div className="page-head">
          <div>
            <h1 className="page-title">Nuevo paciente</h1>
            <p className="page-sub">{esAdmin ? 'Como admin puedes asignar el paciente a cualquier fisio' : 'El paciente se asignará a tu cuenta'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {esAdmin && fisios.length > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                Asignar a fisioterapeuta *
              </label>
              <select
                name="fisio_asignado"
                required
                value={form.fisio_asignado}
                onChange={handleChange}
                style={{ width: '100%', background: 'white', border: '1px solid #bfdbfe', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none' }}
              >
                {fisios.map((fisio) => (
                  <option key={fisio.id} value={fisio.id}>
                    {fisio.nombre} {fisio.apellidos} {fisio.rol === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Nombre *</label>
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Apellidos *</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Fecha de nacimiento</label>
              <input
                name="fecha_nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Género</label>
              <select
                name="genero"
                value={form.genero}
                onChange={handleChange}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Teléfono</label>
              <input
                name="telefono"
                type="tel"
                value={form.telefono}
                onChange={handleChange}
                placeholder="612 345 678"
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="paciente@email.com"
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Ocupación</label>
            <input
              name="ocupacion"
              value={form.ocupacion}
              onChange={handleChange}
              placeholder="Administrativo, Deportista, Enfermero..."
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Motivo de consulta *</label>
            <textarea
              name="motivo_consulta"
              required
              value={form.motivo_consulta}
              onChange={handleChange}
              rows={3}
              placeholder="Describe el motivo principal de la consulta..."
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Antecedentes relevantes</label>
            <textarea
              name="antecedentes"
              value={form.antecedentes}
              onChange={handleChange}
              rows={2}
              placeholder="Cirugías previas, enfermedades, medicación habitual..."
              style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '10px 12px', fontSize: '13px', color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => router.push(esAdmin ? '/admin' : '/dashboard')}
              style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, background: loading ? '#64748b' : '#0f172a', color: 'white', border: 'none', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Guardando...' : 'Guardar paciente'}
            </button>
          </div>

        </form>
      </div>
    </AppShell>
  )
}