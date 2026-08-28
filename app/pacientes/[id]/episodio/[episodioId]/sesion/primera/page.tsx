'use client'
// Nueva sesión unificada: 3 modos en tarjetas, formulario dinámico, EVA slider,
// informe IA al guardar y descuento automático del bono.

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { DI } from '@/components/ui/DashboardIcons'
import { EvaSlider } from '@/components/sesion/EvaSlider'
import { MetricasSesion } from '@/components/sesion/MetricasSesion'
import { Copiloto } from '@/components/sesion/Copiloto'
import { Dictado } from '@/components/sesion/Dictado'

type Modo = 'completa' | 'seguimiento' | 'rapida'

const MODOS: { key: Modo; icon: 'file' | 'history' | 'zap'; titulo: string; desc: string }[] = [
  { key: 'completa',    icon: 'file',    titulo: 'Primera valoración', desc: 'Anamnesis completa, antecedentes y exploración inicial.' },
  { key: 'seguimiento', icon: 'history', titulo: 'Seguimiento',        desc: 'Evolución, reevaluación y ajuste del plan de tratamiento.' },
  { key: 'rapida',      icon: 'zap',     titulo: 'Sesión rápida',      desc: 'Registro breve de una intervención puntual.' },
]

const TA = (props: any) => <textarea {...props} rows={props.rows ?? 3} className="form-textarea" />

export default function NuevaSesion({ params }: { params: Promise<{ id: string; episodioId: string }> }) {
  const { id, episodioId } = use(params)
  const router = useRouter()

  const [paciente, setPaciente] = useState<any>(null)
  const [episodio, setEpisodio] = useState<any>(null)
  const [fisio, setFisio] = useState<any>(null)
  const [modo, setModo] = useState<Modo>('completa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiloto, setCopiloto] = useState<any>(null)
  const [analizando, setAnalizando] = useState(false)
  const [avisoIA, setAvisoIA] = useState<string | null>(null)

  const [f, setF] = useState({
    anamnesis: '', antecedentes_personales: '', antecedentes_familiares: '',
    exploracion_fisica: '', tests_ortopedicos: '', hipotesis_principal: '',
    derivacion_texto: '', dolor_eva: 5,
    movilidad: 5, fuerza: 5, rigidez: 5, fatiga: 5, sueno: 5, adherencia: 5,
  })
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const cargar = async () => {
      const { data: pac } = await supabase.from('pacientes').select('*').eq('id', id).single()
      setPaciente(pac)
      const { data: ep } = await supabase.from('episodios').select('titulo, user_id').eq('id', episodioId).single()
      setEpisodio(ep)
      if (ep?.user_id) {
        const { data: pf } = await supabase.from('perfiles').select('nombre, apellidos, color').eq('id', ep.user_id).single()
        setFisio(pf)
      }
    }
    cargar()
  }, [id, episodioId])

  // Copiloto en vivo: analiza con debounce cuando hay contenido suficiente.
  useEffect(() => {
    if (!paciente || f.anamnesis.trim().length < 12) { setCopiloto(null); return }
    const t = setTimeout(async () => {
      setAnalizando(true)
      try {
        const resp = await fetch('/api/generar-informe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modo: 'copiloto',
            motivo_consulta: paciente?.motivo_consulta,
            anamnesis: f.anamnesis,
            antecedentes: f.antecedentes_personales,
            exploracion_fisica: f.exploracion_fisica,
            tests_ortopedicos: f.tests_ortopedicos,
            dolor_eva: f.dolor_eva,
          }),
        })
        const data = await resp.json()
        if (resp.status === 429) {
          // Free tier de Groq: 8.000 tokens/min. No es un fallo, es una espera.
          setAvisoIA('La IA está saturada por el límite gratuito. Sigue escribiendo: se reintenta en unos segundos.')
        } else if (!resp.ok) {
          setAvisoIA('El análisis en vivo no está disponible ahora mismo.')
        } else {
          setAvisoIA(null)
          setCopiloto(data.copiloto ?? null)
        }
      } catch {
        setAvisoIA('Sin conexión con el motor clínico.')
      }
      setAnalizando(false)
    }, 2500)
    return () => clearTimeout(t)
  }, [f.anamnesis, f.antecedentes_personales, f.exploracion_fisica, f.tests_ortopedicos, f.dolor_eva, modo, paciente])

  const showAntecedentes = modo === 'completa'
  const showExploracion  = modo !== 'rapida'
  const showTests        = modo === 'completa'
  const showRazonamiento = modo !== 'rapida'
  const showMetricas     = modo !== 'rapida'

  const guardar = async (conInforme: boolean) => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()

    let diagnostico_ia: string | null = null
    if (conInforme) {
      try {
        const apiMode = modo === 'completa' ? 'informe' : 'informe_rapido'
        const resp = await fetch('/api/generar-informe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modo: apiMode,
            motivo_consulta: paciente?.motivo_consulta,
            anamnesis: f.anamnesis,
            antecedentes: f.antecedentes_personales,
            exploracion_fisica: f.exploracion_fisica,
            tests_ortopedicos: f.tests_ortopedicos,
            dolor_eva: f.dolor_eva,
          }),
        })
        const data = await resp.json()
        diagnostico_ia = data.informe ?? null
      } catch {
        setError('No se pudo generar el informe IA. La sesión no se ha guardado.')
        setLoading(false); return
      }
    }

    const { error: errIns } = await supabase.from('sesiones').insert([{
      paciente_id: id, episodio_id: episodioId, user_id: user?.id, clinica_id: paciente?.clinica_id,
      fecha: new Date().toISOString().split('T')[0],
      tipo: modo,
      anamnesis: f.anamnesis || null,
      antecedentes_personales: showAntecedentes ? (f.antecedentes_personales || null) : null,
      antecedentes_familiares: showAntecedentes ? (f.antecedentes_familiares || null) : null,
      exploracion_fisica: showExploracion ? (f.exploracion_fisica || null) : null,
      tests_ortopedicos: showTests ? (f.tests_ortopedicos || null) : null,
      hipotesis_principal: showRazonamiento ? (f.hipotesis_principal || null) : null,
      derivacion: showRazonamiento ? !!f.derivacion_texto.trim() : false,
      notas: f.derivacion_texto ? `Derivación sugerida: ${f.derivacion_texto}` : null,
      dolor_eva: f.dolor_eva,
      movilidad: showMetricas ? f.movilidad : null,
      fuerza: showMetricas ? f.fuerza : null,
      rigidez: showMetricas ? f.rigidez : null,
      fatiga: showMetricas ? f.fatiga : null,
      sueno: showMetricas ? f.sueno : null,
      adherencia: showMetricas ? f.adherencia : null,
      diagnostico_ia,
    }])

    if (errIns) { setError('Error al guardar la sesión.'); setLoading(false); return }

    // Descontar bono activo (si lo hay y queda saldo)
    const { data: bono } = await supabase
      .from('bonos').select('id, sesiones_usadas, total_sesiones')
      .eq('paciente_id', id).eq('activo', true)
      .order('fecha_compra', { ascending: true }).limit(1).maybeSingle()
    if (bono && bono.sesiones_usadas < bono.total_sesiones) {
      await supabase.from('bonos').update({ sesiones_usadas: bono.sesiones_usadas + 1 }).eq('id', bono.id)
    }

    router.push(`/pacientes/${id}`)
  }

  const rellenarDesdeIA = (e: any) => {
    setF(prev => ({
      ...prev,
      anamnesis: e.anamnesis || prev.anamnesis,
      antecedentes_personales: e.antecedentes_personales || prev.antecedentes_personales,
      antecedentes_familiares: e.antecedentes_familiares || prev.antecedentes_familiares,
      exploracion_fisica: e.exploracion_fisica || prev.exploracion_fisica,
      tests_ortopedicos: e.tests_ortopedicos || prev.tests_ortopedicos,
      hipotesis_principal: e.hipotesis_principal || prev.hipotesis_principal,
      dolor_eva: (e.dolor_eva ?? null) != null ? Number(e.dolor_eva) : prev.dolor_eva,
    }))
  }

  const irACampo = (campo: string) => {
    const el = document.getElementById(`campo-${campo}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLElement).focus() }
  }

  const anamLabel = modo === 'rapida' ? 'Motivo e intervención' : 'Motivo de consulta y estado actual'
  const anamPh = modo === 'rapida'
    ? 'Describe brevemente el motivo y la intervención realizada…'
    : 'Describe el motivo de consulta, evolución desde la última sesión, síntomas actuales…'

  return (
    <AppShell>
      <div className="page-wrap-xl">
        <button onClick={() => router.push(`/pacientes/${id}`)} className="back-link">
          ← {paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Volver'}
        </button>

        <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: 'italic', fontSize: 28, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-.01em' }}>
          Nueva sesión
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 24 }}>
          {paciente && <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{paciente.nombre} {paciente.apellidos}</strong>}
          {episodio?.titulo && <> · {episodio.titulo}</>}
          {fisio && <> · <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: fisio.color, display: 'inline-block' }} />
            {fisio.nombre} {fisio.apellidos}</span></>}
        </p>

        <div className="sesion-layout">
        <div>
        {/* Tarjetas de modo */}
        <div className="modo-card-grid">
          {MODOS.map(m => (
            <button key={m.key} type="button" onClick={() => setModo(m.key)} className={`modo-card${modo === m.key ? ' active' : ''}`}>
              <span className="modo-card-ico"><DI name={m.icon} size={17} strokeWidth={1.8} /></span>
              <span className="modo-card-t">{m.titulo}</span>
              <span className="modo-card-d">{m.desc}</span>
            </button>
          ))}
        </div>

        <Dictado onRellenar={rellenarDesdeIA} />

        {/* Anamnesis / Motivo */}
        <div className="form-section-h">{modo === 'rapida' ? 'Motivo de la consulta' : 'Anamnesis'}</div>
        <label className="form-label">{anamLabel}</label>
        <TA id="campo-anamnesis" name="anamnesis" value={f.anamnesis} onChange={(e: any) => set('anamnesis', e.target.value)} rows={modo === 'rapida' ? 4 : 3} placeholder={anamPh} />

        {showAntecedentes && (
          <>
            <div className="form-section-h">Antecedentes</div>
            <label className="form-label">Antecedentes personales</label>
            <TA id="campo-antecedentes" value={f.antecedentes_personales} onChange={(e: any) => set('antecedentes_personales', e.target.value)} placeholder="Patologías previas, cirugías, medicación, hábitos…" />
            <div style={{ height: 14 }} />
            <label className="form-label">Antecedentes familiares · opcional</label>
            <TA id="campo-antecedentes_familiares" value={f.antecedentes_familiares} onChange={(e: any) => set('antecedentes_familiares', e.target.value)} rows={2} placeholder="Antecedentes familiares relevantes…" />
          </>
        )}

        {showExploracion && (
          <>
            <div className="form-section-h">Exploración física</div>
            <label className="form-label">Hallazgos de la exploración</label>
            <TA id="campo-exploracion_fisica" value={f.exploracion_fisica} onChange={(e: any) => set('exploracion_fisica', e.target.value)} placeholder="Inspección, palpación, rango de movilidad, fuerza, postura…" />
            {showTests && (
              <>
                <div style={{ height: 14 }} />
                <label className="form-label">Tests y pruebas específicas · opcional</label>
                <TA id="campo-tests_ortopedicos" value={f.tests_ortopedicos} onChange={(e: any) => set('tests_ortopedicos', e.target.value)} rows={2} placeholder="Tests ortopédicos, escalas funcionales, mediciones…" />
              </>
            )}
          </>
        )}

        {/* EVA */}
        <div className="form-section-h">Valoración del dolor</div>
        <div className="eva-card">
          <EvaSlider value={f.dolor_eva} onChange={v => set('dolor_eva', v)} />
        </div>

        {showMetricas && (
          <>
            <div className="form-section-h">Indicadores de seguimiento <span className="hint">se heredan en el informe</span></div>
            <MetricasSesion
              value={{ movilidad: f.movilidad, fuerza: f.fuerza, rigidez: f.rigidez, fatiga: f.fatiga, sueno: f.sueno, adherencia: f.adherencia }}
              onChange={(k, v) => set(k, v)}
            />
          </>
        )}

        {showRazonamiento && (
          <>
            <div className="form-section-h">Razonamiento clínico <span className="hint">se completa con el informe IA</span></div>
            <label className="form-label">Hipótesis principal</label>
            <input className="form-input" value={f.hipotesis_principal} onChange={e => set('hipotesis_principal', e.target.value)} placeholder="Diagnóstico fisioterápico de presunción…" />
            <div style={{ height: 14 }} />
            <label className="form-label">¿Requiere derivación? · opcional</label>
            <input className="form-input" value={f.derivacion_texto} onChange={e => set('derivacion_texto', e.target.value)} placeholder="Especialista o prueba complementaria si procede…" />
          </>
        )}

        {error && <div className="alert-err" style={{ marginTop: 20 }}>{error}</div>}

        <div className="sesion-actions">
          <button className="btn-ghost" onClick={() => router.push(`/pacientes/${id}`)} disabled={loading}>Cancelar</button>
          <button className="btn-line" onClick={() => guardar(false)} disabled={loading}>
            <DI name="check" size={15} strokeWidth={2} /> Guardar borrador
          </button>
          <button className="btn-ink" onClick={() => guardar(true)} disabled={loading}>
            <DI name="sparkles" size={15} strokeWidth={1.8} /> {loading ? 'Procesando…' : 'Guardar y generar informe'}
          </button>
        </div>
        </div>

        <Copiloto data={copiloto} analizando={analizando} aviso={avisoIA} onPregunta={irACampo} />
        </div>
      </div>
    </AppShell>
  )
}
