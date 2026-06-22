'use client'
// Crea un borrador de informe desde la última sesión del paciente y abre el editor.

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

function Crear() {
  const router = useRouter()
  const sp = useSearchParams()
  const pacienteId = sp.get('paciente')
  const corriendo = useRef(false)

  useEffect(() => {
    if (corriendo.current || !pacienteId) return
    corriendo.current = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: pac } = await supabase.from('pacientes').select('clinica_id, motivo_consulta').eq('id', pacienteId).single()
      const { data: ses } = await supabase.from('sesiones')
        .select('id, episodio_id, fecha, tipo, dolor_eva, movilidad, fuerza, rigidez, fatiga, sueno, adherencia')
        .eq('paciente_id', pacienteId).order('created_at', { ascending: false }).limit(2)
      const actual = ses?.[0]
      const previa = ses?.[1]
      let numero = 1, total = 1
      if (actual?.episodio_id) {
        const { count } = await supabase.from('sesiones').select('*', { count: 'exact', head: true }).eq('episodio_id', actual.episodio_id)
        numero = count ?? 1; total = count ?? 1
      }
      const metricas = {
        dolor_ini: previa?.dolor_eva ?? actual?.dolor_eva ?? 0,
        dolor_fin: actual?.dolor_eva ?? 0,
        movilidad: actual?.movilidad ?? null, fuerza: actual?.fuerza ?? null,
        rigidez: actual?.rigidez ?? null, fatiga: actual?.fatiga ?? null,
        sueno: actual?.sueno ?? null, adherencia: actual?.adherencia ?? null,
      }
      const { data: ins } = await supabase.from('informes').insert([{
        paciente_id: pacienteId, episodio_id: actual?.episodio_id ?? null, sesion_id: actual?.id ?? null,
        clinica_id: pac?.clinica_id, fisio_id: user?.id, fecha: actual?.fecha ?? new Date().toISOString().split('T')[0],
        tipo_sesion: actual?.tipo ?? 'seguimiento', numero_sesion: numero, total_sesiones: total, metricas,
      }]).select('id').single()
      if (ins) router.replace(`/informes/${ins.id}`)
      else router.replace(`/pacientes/${pacienteId}`)
    })()
  }, [pacienteId, router])

  return <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Generando informe…</div>
}

export default function NuevoInforme() {
  return <AppShell><Suspense fallback={<div style={{ padding: 48 }} />}><Crear /></Suspense></AppShell>
}
