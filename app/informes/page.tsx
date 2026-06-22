'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'

const MODO: Record<string, string> = { completa: 'Primera', seguimiento: 'Seguimiento', rapida: 'Rápida' }
const evaColor = (v: number | null) => v == null ? 'var(--faint)' : v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626'

export default function InformesPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('sesiones')
        .select('id, fecha, tipo, dolor_eva, hipotesis_principal, paciente_id, diagnostico_ia, pacientes(nombre, apellidos)')
        .not('diagnostico_ia', 'is', null)
        .order('fecha', { ascending: false })
        .limit(300)
      setItems(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const filtrados = items.filter(s => {
    const q = busqueda.toLowerCase()
    const nom = `${s.pacientes?.nombre ?? ''} ${s.pacientes?.apellidos ?? ''}`.toLowerCase()
    return !q || nom.includes(q) || (s.hipotesis_principal ?? '').toLowerCase().includes(q)
  })

  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-head">
          <div>
            <h1 className="page-title">Informes</h1>
            <p className="page-sub">Informes clínicos generados con IA. {items.length} en total.</p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <input type="text" placeholder="Buscar por paciente o hipótesis…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', maxWidth: 400, border: '1px solid var(--hair)', borderRadius: 10, padding: '9px 14px', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }} />
        </div>

        {cargando ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando informes…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {busqueda ? 'Sin resultados.' : 'Aún no hay informes generados. Se crean al guardar una sesión con "Generar informe".'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            {filtrados.map((s, i) => (
              <div key={s.id} onClick={() => router.push(`/pacientes/${s.paciente_id}`)}
                style={{ display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 16, alignItems: 'center', padding: '14px 20px', borderBottom: i < filtrados.length - 1 ? '1px solid var(--hair-s)' : 'none', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{MODO[s.tipo] ?? 'Sesión'}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{s.pacientes?.nombre} {s.pacientes?.apellidos}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.hipotesis_principal || 'Informe clínico'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: evaColor(s.dolor_eva), fontVariantNumeric: 'tabular-nums' }}>{s.dolor_eva ?? '—'}</span>
                  <span style={{ display: 'block', fontSize: 9, letterSpacing: '.1em', color: 'var(--faint)', textTransform: 'uppercase' }}>EVA</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
