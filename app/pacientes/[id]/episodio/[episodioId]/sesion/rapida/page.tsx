'use client'
// Ruta antigua — redirige a la nueva página unificada de sesión.
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'

export default function RedirigeSesion({ params }: { params: Promise<{ id: string; episodioId: string }> }) {
  const { id, episodioId } = use(params)
  const router = useRouter()
  useEffect(() => {
    router.replace(`/pacientes/${id}/episodio/${episodioId}/sesion/primera`)
  }, [id, episodioId, router])
  return (
    <AppShell>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Abriendo sesión…</div>
    </AppShell>
  )
}
