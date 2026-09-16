'use client'

// components/citas/SolicitudesCitas.tsx
// Bandeja de la clínica para las solicitudes que el paciente hace desde su
// app (/mi/sesiones): "cambiar" o "cancelar" una cita. Cierra el círculo de la
// fase 4: el paciente pide, la clínica decide desde su agenda.
//
// Lee y escribe `citas_solicitudes` DIRECTAMENTE, no por RPC: aquí quien mira
// es la clínica, y la tabla tiene policy de select/update por clinica_actual().
// (El paciente, en cambio, solo puede escribir por mi_cita_solicitar.)
//
// Aceptar una CANCELACIÓN cancela la cita. Aceptar un CAMBIO abre el formulario
// de reprogramar; la cita original sigue en pie hasta que se guarde la nueva
// fecha, para no dejar al paciente sin cita por el camino.

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

interface Solicitud {
  id: string
  cita_id: string
  tipo: 'cambio' | 'cancelacion'
  nota: string | null
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  created_at: string
  citas: {
    fecha_hora: string
    estado: string | null
    pacientes: { nombre: string; apellidos: string } | null
  } | null
}

export function SolicitudesCitas({ onCambio }: { onCambio?: () => void }) {
  const [lista, setLista] = useState<Solicitud[]>([])
  const [ocupada, setOcupada] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('citas_solicitudes')
      .select('id, cita_id, tipo, nota, estado, created_at, citas(fecha_hora, estado, pacientes(nombre, apellidos))')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    setLista((data as unknown as Solicitud[] | null) ?? [])
  }, [])

  // Carga inicial desde un ref callback, no desde useEffect: con reactCompiler
  // un setState alcanzado desde un efecto es error de lint (misma técnica que
  // Revelar y Ajustes en la app del paciente).
  const raiz = useCallback((el: HTMLDivElement | null) => { if (el) cargar() }, [cargar])

  const resolver = async (s: Solicitud, estado: 'aceptada' | 'rechazada') => {
    setOcupada(s.id)
    try {
      if (estado === 'aceptada' && s.tipo === 'cancelacion') {
        const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', s.cita_id)
        if (error) throw error
      }
      const { error } = await supabase.from('citas_solicitudes').update({ estado }).eq('id', s.id)
      if (error) throw error
      setLista((prev) => prev.filter((x) => x.id !== s.id))
      onCambio?.()
    } catch {
      alert('No se ha podido guardar la respuesta.')
    } finally {
      setOcupada(null)
    }
  }

  return (
    <div ref={raiz} style={{ marginBottom: lista.length ? 22 : 0 }}>
      {lista.length > 0 && (<>
      <div className="cal-side-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Solicitudes de pacientes</span>
        <span className="cal-count" style={{ background: '#fef3c7', color: '#b45309' }}>{lista.length}</span>
      </div>
      {lista.map((s) => {
        const p = s.citas?.pacientes
        const cuando = s.citas?.fecha_hora
          ? new Date(s.citas.fecha_hora).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : ''
        const yaCancelada = s.citas?.estado === 'cancelada'
        return (
          <div key={s.id} style={{ border: '1px solid var(--hair-s)', borderRadius: 10, padding: '10px 11px', marginBottom: 8, background: 'var(--paper)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
              {p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : 'Paciente'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {s.tipo === 'cambio' ? 'Pide cambiar' : 'Pide cancelar'} · {cuando}
            </div>
            {s.nota && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.45, background: 'var(--paper-2)', borderRadius: 7, padding: '6px 8px' }}>
                «{s.nota}»
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
              {s.tipo === 'cambio' && !yaCancelada ? (
                <Link
                  href={`/citas/nueva?reprogramar=${s.cita_id}`}
                  className="btn-ink"
                  style={{ flex: 1, justifyContent: 'center', minHeight: 30, padding: '0 10px', fontSize: 12 }}
                  onClick={() => supabase.from('citas_solicitudes').update({ estado: 'aceptada' }).eq('id', s.id).then(() => undefined)}
                >
                  Reprogramar
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-ink"
                  disabled={ocupada === s.id}
                  onClick={() => resolver(s, 'aceptada')}
                  style={{ flex: 1, justifyContent: 'center', minHeight: 30, padding: '0 10px', fontSize: 12 }}
                >
                  {yaCancelada ? 'Cerrar' : 'Cancelar cita'}
                </button>
              )}
              <button
                type="button"
                className="btn-line"
                disabled={ocupada === s.id}
                onClick={() => resolver(s, 'rechazada')}
                style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
              >
                Rechazar
              </button>
            </div>
          </div>
        )
      })}
      </>)}
    </div>
  )
}
