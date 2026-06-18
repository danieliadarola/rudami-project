'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

interface Perfil {
  id: string
  nombre: string
  apellidos: string
  rol: 'admin' | 'fisio'
  color: string
  clinica_id: string
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [citasHoy, setCitasHoy] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: p } = await supabase
      .from('perfiles')
      .select('id, clinica_id, nombre, apellidos, rol, color')
      .eq('id', user.id)
      .single()

    if (!p) { router.push('/'); return }
    setPerfil(p)

    const hoy = new Date().toISOString().split('T')[0]
    const { data: citas } = await supabase
      .from('citas')
      .select('id, estado')
      .eq('clinica_id', p.clinica_id)
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)
      .neq('estado', 'cancelada')

    setCitasHoy(citas?.length ?? 0)
    setPendientes(citas?.filter(c => c.estado === 'pendiente').length ?? 0)
    setCargando(false)
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (cargando || !perfil) {
    return (
      <div style={{
        display: 'flex', height: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: '#fff',
      }}>
        <span style={{ fontSize: 13, color: '#9aa1af' }}>Cargando…</span>
      </div>
    )
  }

  return (
    <div className="dash-shell">
      <Sidebar
        perfil={perfil}
        citasHoyCount={citasHoy}
        onSignOut={signOut}
      />
      <div className="dash-main">
        <Topbar
          nombre={perfil.nombre}
          citasHoy={citasHoy}
          pendientes={pendientes}
          onNuevaCita={() => router.push('/citas/nueva')}
        />
        <div className="dash-content">
          {children}
        </div>
      </div>
    </div>
  )
}
